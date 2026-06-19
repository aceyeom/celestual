// CELESTUAL — still-notify edge function.
//
// Drains the `still_notifications` queue and sends each pending row as an email
// via Resend, then stamps `sent_at`. It is *idempotent by queue*: it only ever
// touches rows that are unsent, not yet dead-lettered, and due for an attempt,
// so it can be safely invoked by either a Supabase Database Webhook (on insert
// to still_notifications) or pg_cron.
//
// Retry / dead-letter (§5.1): a failing send is retried with exponential backoff
// up to MAX_ATTEMPTS, after which the row is marked `failed_at` (dead-lettered)
// so a permanently-bad address isn't retried forever. Dead-letters are surfaced
// in the response payload for alerting.
//
// NOTE on naming: the user-facing brand is CELESTUAL. The Supabase objects and
// this function keep their original `still_*` names for continuity with the live
// database — only the brand/UI/email is CELESTUAL (see still-app/README.md).
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY    — your Resend API key
//   STILL_FROM_EMAIL  — verified sender, e.g. "CELESTUAL <hello@celestual.us>"
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy still-notify
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('STILL_FROM_EMAIL') ?? 'CELESTUAL <onboarding@resend.dev>';
const SITE = Deno.env.get('STILL_SITE_URL') ?? 'https://celestual.us';

const MAX_ATTEMPTS = 5;
// Backoff per attempt index (minutes): ~1m, 5m, 30m, 2h before dead-letter.
const BACKOFF_MIN = [1, 5, 30, 120];

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function emailHtml(self: string, other: string) {
  return `
  <div style="background:#0b0708;padding:40px 24px;font-family:Georgia,serif;color:#f5e9ec;text-align:center">
    <div style="font-size:16px;letter-spacing:6px;color:#f2a7b6;font-family:'Space Grotesk',Arial,sans-serif">CELESTUAL</div>
    <p style="font-style:italic;color:#b79aa3;margin:28px 0 6px;font-size:15px">it&rsquo;s mutual.</p>
    <h1 style="font-weight:400;font-size:30px;line-height:1.2;margin:0">
      @${other}<br/>still thinks <em style="color:#f2a7b6">about you.</em>
    </h1>
    <p style="color:#b79aa3;font-size:15px;margin:22px 0 28px">
      You entered them. They entered you back. You both know now — no pressure to do anything with it.
    </p>
    <a href="${SITE}" style="display:inline-block;background:#e8546f;color:#fff;text-decoration:none;
       padding:13px 26px;border-radius:12px;font-family:Inter,Arial,sans-serif;font-size:15px">open CELESTUAL</a>
    <p style="color:#6f5860;font-size:11px;margin-top:32px;font-family:Inter,Arial,sans-serif">
      You got this because you entered an @ on CELESTUAL and it was mutual. We never reveal one-sided entries.
      To remove or block a handle, visit ${SITE} → privacy &amp; terms.
    </p>
  </div>`;
}

async function sendEmail(to: string, self: string, other: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `it's mutual — @${other} still thinks about you`,
      html: emailHtml(self, other),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const nowIso = new Date().toISOString();
  const { data: pending, error } = await supabase
    .from('still_notifications')
    .select('id, to_email, self_handle, other_handle, attempts')
    .is('sent_at', null)
    .is('failed_at', null)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  const retried: string[] = [];
  const deadLettered: string[] = [];
  for (const n of pending ?? []) {
    try {
      await sendEmail(n.to_email, n.self_handle, n.other_handle);
      await supabase.from('still_notifications').update({ sent_at: new Date().toISOString() }).eq('id', n.id);
      sent++;
    } catch (e) {
      const attempts = (n.attempts ?? 0) + 1;
      const msg = String(e);
      console.error('send failed', n.id, 'attempt', attempts, msg);
      if (attempts >= MAX_ATTEMPTS) {
        await supabase
          .from('still_notifications')
          .update({ attempts, last_error: msg, failed_at: new Date().toISOString() })
          .eq('id', n.id);
        deadLettered.push(n.id);
      } else {
        const mins = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
        const next = new Date(Date.now() + mins * 60_000).toISOString();
        await supabase
          .from('still_notifications')
          .update({ attempts, last_error: msg, next_attempt_at: next })
          .eq('id', n.id);
        retried.push(n.id);
      }
    }
  }

  // deadLettered is non-empty when a payoff email permanently failed — wire this
  // to an alert (the product silently fails its one job otherwise).
  return new Response(JSON.stringify({ sent, retried, deadLettered }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

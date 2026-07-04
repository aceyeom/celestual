// CELESTUAL — celestual-notify edge function.
//
// Drains the `celestual_notifications` queue and sends each pending mutual-match
// email via Resend, then stamps `sent_at`. It is *idempotent by queue*: it only
// ever touches rows that are unsent, not yet dead-lettered, and due for an
// attempt, so it can be safely invoked by either a Supabase Database Webhook
// (on insert to celestual_notifications) or pg_cron.
//
// The email is the reveal channel for the earlier entrant (framework Screen 8):
// subject quiet and unmistakable, body in the product's own registers (serif
// italic for the feeling, small sans for the mechanics), single warm accent on
// deep navy. Every sentence is literally true; nothing here ever implies
// activity that didn't happen (the NGL line — see ULTIMATE-PRODUCT-FRAMEWORK §6.2).
//
// Retry / dead-letter: a failing send is retried with exponential backoff up to
// MAX_ATTEMPTS, after which the row is marked `failed_at` (dead-lettered) so a
// permanently-bad address isn't retried forever.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        — your Resend API key
//   CELESTUAL_FROM_EMAIL  — verified sender, e.g. "celestual <hello@celestual.us>"
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-notify
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const MAX_ATTEMPTS = 5;
// Backoff per attempt index (minutes): ~1m, 5m, 30m, 2h before dead-letter.
const BACKOFF_MIN = [1, 5, 30, 120];

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// The palette is docs/DESIGN.md's: deep navy field, cream text, slate for the
// mechanical voice, one warm star. Georgia stands in for Instrument Serif in
// mail clients; Arial for Space Grotesk.
function emailHtml(other: string) {
  return `
  <div style="background:#070b14;padding:48px 24px;font-family:Georgia,serif;color:#f2eee5;text-align:center">
    <div style="font-size:13px;letter-spacing:6px;color:#8b94a8;font-family:Arial,sans-serif">CELESTUAL</div>
    <div style="font-size:26px;color:#ffa25c;margin:26px 0 4px">&#10022;</div>
    <h1 style="font-weight:400;font-style:italic;font-size:34px;line-height:1.15;margin:10px 0 0;color:#f2eee5">
      it&rsquo;s mutual.
    </h1>
    <p style="color:#aeb6c6;font-size:15px;line-height:1.7;margin:24px auto 0;max-width:380px;font-family:Arial,sans-serif">
      you entered @${other}. @${other} entered you.<br/>
      this only ever happens when it&rsquo;s real on both sides.
    </p>
    <a href="${SITE}" style="display:inline-block;background:#ffa25c;color:#1a0f06;text-decoration:none;
       padding:14px 30px;border-radius:14px;font-family:Arial,sans-serif;font-size:15px;margin-top:30px">go see it</a>
    <p style="color:#5b6377;font-size:11px;line-height:1.7;margin-top:36px;font-family:Arial,sans-serif;max-width:400px;margin-left:auto;margin-right:auto">
      you're reading this because you placed a ping on celestual and it resolved mutual.
      one-sided pings are never revealed to anyone. to opt out of celestual entirely,
      visit ${SITE}/optout.
    </p>
  </div>`;
}

async function sendEmail(to: string, other: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `celestual: it's mutual.`,
      html: emailHtml(other),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const nowIso = new Date().toISOString();
  const { data: pending, error } = await supabase
    .from('celestual_notifications')
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
      await sendEmail(n.to_email, n.other_handle);
      await supabase.from('celestual_notifications').update({ sent_at: new Date().toISOString() }).eq('id', n.id);
      sent++;
    } catch (e) {
      const attempts = (n.attempts ?? 0) + 1;
      const msg = String(e);
      console.error('send failed', n.id, 'attempt', attempts, msg);
      if (attempts >= MAX_ATTEMPTS) {
        await supabase
          .from('celestual_notifications')
          .update({ attempts, last_error: msg, failed_at: new Date().toISOString() })
          .eq('id', n.id);
        deadLettered.push(n.id);
      } else {
        const mins = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
        const next = new Date(Date.now() + mins * 60_000).toISOString();
        await supabase
          .from('celestual_notifications')
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

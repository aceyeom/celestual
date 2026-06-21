// CELESTUAL — celestual-remind edge function.
//
// Drains the `celestual_reminders` queue: when a person who ran out of entry slots
// opted in to "tell me when my next star is ready" (the out-of-slots screen), a row
// is written with a `due_at` = when their next slot regenerates. This function
// emails every reminder whose time has come and stamps `sent_at`.
//
// It is idempotent by queue (only unsent + due rows) so it can be driven by
// pg_cron (recommended hourly) or a manual invoke. Mirrors celestual-notify.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        — your Resend API key
//   CELESTUAL_FROM_EMAIL  — verified sender, e.g. "Celestual <hello@celestual.us>"
// Provided automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Schedule (example, hourly) with pg_cron + pg_net, or a Supabase scheduled
// function:  select cron.schedule('celestual-remind','0 * * * *', $$ ... $$);
// Deploy:  supabase functions deploy celestual-remind
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'Celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function emailHtml() {
  return `
  <div style="background:#0b0708;padding:40px 24px;font-family:Georgia,serif;color:#f5e9ec;text-align:center">
    <div style="font-size:16px;letter-spacing:6px;color:#f2a7b6;font-family:'Space Grotesk',Arial,sans-serif">CELESTUAL</div>
    <p style="font-style:italic;color:#b79aa3;margin:28px 0 6px;font-size:15px">your sky has room again.</p>
    <h1 style="font-weight:400;font-size:30px;line-height:1.2;margin:0">
      A new star <em style="color:#f2a7b6">is ready.</em>
    </h1>
    <p style="color:#b79aa3;font-size:15px;margin:22px 0 28px">
      Someone still on your mind? You can send one more into the sky.
    </p>
    <a href="${SITE}" style="display:inline-block;background:#e8546f;color:#fff;text-decoration:none;
       padding:13px 26px;border-radius:12px;font-family:Inter,Arial,sans-serif;font-size:15px">open CELESTUAL</a>
    <p style="color:#6f5860;font-size:11px;margin-top:32px;font-family:Inter,Arial,sans-serif">
      You got this because you asked us to remind you when your next star was ready. We never reveal who you've entered.
    </p>
  </div>`;
}

async function sendEmail(to: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject: 'a new star is ready on CELESTUAL', html: emailHtml() }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from('celestual_reminders')
    .select('id, to_email')
    .is('sent_at', null)
    .lte('due_at', nowIso)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  const failed: string[] = [];
  for (const r of due ?? []) {
    try {
      await sendEmail(r.to_email);
      await supabase.from('celestual_reminders').update({ sent_at: new Date().toISOString() }).eq('id', r.id);
      sent++;
    } catch (e) {
      console.error('reminder failed', r.id, String(e));
      failed.push(r.id);
    }
  }

  return new Response(JSON.stringify({ sent, failed }), { headers: { 'Content-Type': 'application/json' } });
});

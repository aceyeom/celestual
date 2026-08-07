// CELESTUAL — celestual-mutual-dm edge function (the push half of the reveal).
//
// Drains celestual_dm_outbox (migration 0023) for the people whose Instagram
// window is currently OPEN, and sends each one their line through ManyChat's
// sending API. Everyone else's news stays queued, and the celestual-manychat
// relay hands it to them the next time they message the account.
//
// WHY IT IS SHAPED LIKE THIS — the constraint is Meta's, not ours. An inbound
// message from a person opens a 24-hour window in which a business may reply
// freely; outside it, a send is refused. The tags that reach past it do not
// cover this: the standard four are account updates, purchases and confirmed
// events, and HUMAN_AGENT is explicitly for a human answering a person, which
// an automation is not. So there is no compliant way to make a match ring
// somebody's phone at the moment it happens, and this function does not try:
//
//   celestual_dm_due() returns ONLY rows whose contact messaged us inside the
//   last 23 hours. Every send from here is an ordinary reply inside a window
//   that person opened, and needs no tag at all.
//
// A refusal is not a dead end. A failed push backs off (2m, 10m, 1h, 6h) and
// then stops being retried, but the row is never dead-lettered: the reply path
// (celestual_dm_take) ignores attempts entirely, so news that could never be
// pushed still reaches them the next time they say anything to the account.
// And celestual-notify has been emailing the same news in parallel the whole
// time, to anyone who left an address.
//
// It is idempotent by queue — a row is claimed by its sent_at stamp — so it is
// safe to invoke by pg_cron, a Database Webhook on insert to
// celestual_dm_outbox, or by hand. Nothing is sent twice.
//
// Required secret (Supabase → Edge Functions → Secrets):
//   MANYCHAT_API_TOKEN    — ManyChat → Settings → API → your API key (Pro plan).
//                           This is the ONLY thing that can send a DM without
//                           being asked; treat it like the shared secret.
// Optional:
//   CELESTUAL_SITE_URL    — where the line sends people (default https://celestual.us)
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-mutual-dm --no-verify-jwt
//   Full runbook: docs/MANYCHAT-MUTUAL-DM.md
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mutualLine, sendManyChat } from '../_shared/mutual.ts';

const MANYCHAT_API_TOKEN = Deno.env.get('MANYCHAT_API_TOKEN') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return json({ ok: true, service: 'celestual-mutual-dm', configured: MANYCHAT_API_TOKEN !== '' });
  }

  // No token, no push — and that is a working configuration, not a broken one:
  // every queued row is still delivered by the relay's reply path. Say so
  // plainly instead of failing, so a half-finished setup is visible in the logs
  // rather than silent.
  if (!MANYCHAT_API_TOKEN) {
    return json({ ok: true, skipped: 'no_manychat_api_token', pushed: 0, failed: 0 });
  }

  const { data, error } = await supabase.rpc('celestual_dm_due', { p_limit: 50 });
  if (error) {
    console.error('dm_due threw', error.message);
    return json({ ok: false, error: error.message }, 500);
  }

  const items: Array<{ id: string; subscriber_id: string; handle: string; other: string; has_card: boolean }> =
    Array.isArray(data?.items) ? data.items : [];

  let pushed = 0;
  let failed = 0;
  for (const row of items) {
    const text = mutualLine({ other: row.other, has_card: row.has_card });
    try {
      const res = await sendManyChat(MANYCHAT_API_TOKEN, String(row.subscriber_id), text);
      if (res.ok) {
        await supabase.rpc('celestual_dm_sent', { p_id: row.id, p_via: 'push' });
        pushed++;
        // The handles are logged, never the card — there is nothing of the card
        // here to log.
        console.log('pushed', JSON.stringify({ handle: row.handle, other: row.other }));
      } else {
        await supabase.rpc('celestual_dm_failed', { p_id: row.id, p_error: res.error ?? 'unknown' });
        failed++;
        console.error('push failed', JSON.stringify({ handle: row.handle, error: res.error }));
      }
    } catch (e) {
      await supabase.rpc('celestual_dm_failed', { p_id: row.id, p_error: String(e) });
      failed++;
      console.error('push threw', JSON.stringify({ handle: row.handle, error: String(e) }));
    }
  }

  // Cheap, and only worth doing on a drain that actually ran.
  if (Math.random() < 0.05) await supabase.rpc('celestual_dm_prune');

  return json({ ok: true, due: items.length, pushed, failed });
});

// CELESTUAL: celestual-remind edge function (the hourly caretaker).
//
// Two quiet jobs, one cron (schedule hourly with pg_cron or the Supabase
// scheduler; a manual invoke is always safe, because every job is idempotent by
// queue):
//
//   1. LAPSE WARNINGS. A few days before a ping's sixty days run out, its
//      sender, if they left an email, gets one line: still feel it? keep it
//      standing. The email names NO handle: the server stores only a salted
//      hash of who a ping points at, so it could not name one if it wanted to.
//      It is about the sender's own action only, never about the target's
//      activity, and that line is load bearing legally (FTC v. NGL).
//
//   2. THE SIXTY DAY BROOM. Lapsed unmatched pings are purged
//      (celestual_purge_expired): unresolved longing self destructs instead of
//      accumulating into a toxic archive.
//
// ── WHAT CAME OFF IN PHASE 8, AND WHAT THAT LEAVES ──────────────────────────
// There was a third job, draining `celestual_campus_mail`: an "it is open" note
// when a campus tripped its threshold, and a week one reveal with the exact
// numbers. Communities and campuses are retired (Q15) and
// `0035_retire_the_communities.sql` drops that table, so the job had nothing
// left to read and its two mails linked at `/c/<slug>`, which no longer
// resolves.
//
// THIS FUNCTION HAS STILL NEVER BEEN DEPLOYED. It is group D in
// `docs/deletions.md`, still nobody's decision, and the case for deleting it is
// now stronger than it was: what is left is one useful mail behind a cron that
// has never run. It stays until that group is answered, and it is kept in the
// current mail design rather than left to rot in the retired one.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        — your Resend API key
//   CELESTUAL_FROM_EMAIL  — verified sender, e.g. "celestual <hello@celestual.us>"
// Provided automatically:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-remind
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as mail from '../_shared/mail.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// The one note this job sends. The frame, the rules and the plate all come from
// _shared/mail.ts, so this function owns only its words.

// ── the lapse note ───────────────────────────────────────────────────────────
// The one email in the product whose whole job is a decision, so it names both
// halves of it and prices them: renewing is free, restarts the sixty days, and
// takes no slot; letting go frees the slot on the same day. That second fact is
// the one the product used to keep to itself.
function lapseHtml(lapseDate: string) {
  return mail.frame({
    kicker: 'one of your pings',
    inner: `
      ${mail.title('Still feel it?')}
      ${mail.body(
        `it lapses on ${lapseDate}. renewing is one tap and free, as often as you feel it. ` +
        `it restarts the sixty days from the day you tap it, and it never uses a slot.`,
      )}
      ${mail.body('or let it go, and it disappears completely. nothing was ever revealed either way, and the slot opens back up the same day.')}
      ${mail.plate(SITE, 'keep it standing')}
      ${mail.tick(`the slot opens ${lapseDate}`, mail.C.accent)}
      ${mail.colophon(
        `this note is about your own ping only. we cannot and do not tell you anything about anyone else: ` +
        `celestual stores who you entered as a salted hash, and even we cannot read it. opt out entirely at ${SITE}/optout.`,
      )}`,
  });
}

async function send(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const out = { lapse_warned: 0, purged: 0, failed: [] as string[] };

  // ── 1 · lapse warnings (5 days out, once per standing ping) ────────────────
  const soon = new Date(Date.now() + 5 * 24 * 3600_000).toISOString();
  const nowIso = new Date().toISOString();
  const { data: lapsing } = await supabase
    .from('celestual_entries')
    .select('id, from_email, expires_at')
    .is('matched_at', null)
    .is('renew_notified_at', null)
    .not('from_email', 'is', null)
    .gt('expires_at', nowIso)
    .lte('expires_at', soon)
    .limit(200);

  for (const e of lapsing ?? []) {
    try {
      const date = new Date(e.expires_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric',
      });
      await send(e.from_email, 'your ping lapses soon. still feel it?', lapseHtml(date));
      await supabase.from('celestual_entries')
        .update({ renew_notified_at: new Date().toISOString() }).eq('id', e.id);
      out.lapse_warned++;
    } catch (err) {
      console.error('lapse warn failed', e.id, String(err));
      out.failed.push(e.id);
    }
  }

  // ── 2 · the sixty-day broom ─────────────────────────────────────────────────
  try {
    const { data } = await supabase.rpc('celestual_purge_expired');
    out.purged = (data as { purged?: number } | null)?.purged ?? 0;
  } catch (err) {
    console.error('purge failed', String(err));
  }

  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
});

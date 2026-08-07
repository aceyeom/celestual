// CELESTUAL — celestual-remind edge function (the hourly caretaker).
//
// Three quiet jobs, one cron (schedule hourly with pg_cron or the Supabase
// scheduler; a manual invoke is always safe — every job is idempotent by queue):
//
//   1. LAPSE WARNINGS (framework §2.4). A few days before a ping's sixty days
//      run out, its sender — if they left an email — gets one line: still feel
//      it? keep it standing. The email names NO handle: the server stores only
//      a salted hash of who a ping points at, so it couldn't name one if it
//      wanted to. It is about the sender's own action only, never about the
//      target's activity — that line is load-bearing legally (FTC v. NGL).
//
//   2. THE SIXTY-DAY BROOM. Lapsed unmatched pings are purged
//      (celestual_purge_expired) — unresolved longing self-destructs instead of
//      accumulating into a toxic archive.
//
//   3. CAMPUS MAIL. Drains celestual_campus_mail: the "it's open." note the
//      moment a campus trips its threshold, and the week-one reveal with the
//      exact snapshotted numbers. Everyone hears together.
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

// The three notes this job sends. The frame, the mark, the rules and the plate
// all come from _shared/mail.ts, so these functions own only their words.

// ── the lapse note ───────────────────────────────────────────────────────────
// The one email in the product whose whole job is a decision, so it names both
// halves of it and prices them: renewing is free, restarts the sixty days, and
// takes no slot; letting go frees the slot on the same day. That second fact is
// the one the product used to keep to itself.
function lapseHtml(lapseDate: string) {
  return mail.frame({
    kicker: 'one of your pings',
    inner: `
      ${mail.title('still feel it?')}
      ${mail.body(
        `it lapses on ${lapseDate}. renewing is one tap and free, as often as you feel it. ` +
        `it restarts the sixty days from the day you tap it, and it never uses a slot.`,
      )}
      ${mail.body('or let it go, and it disappears completely. nothing was ever revealed either way, and the slot opens back up the same day.')}
      ${mail.plate(SITE, 'keep it standing')}
      ${mail.tick(`the slot opens ${lapseDate}`, mail.C.caramel)}
      ${mail.colophon(
        `this note is about your own ping only. we cannot and do not tell you anything about anyone else: ` +
        `celestual stores who you entered as a salted hash, and even we cannot read it. opt out entirely at ${SITE}/optout.`,
      )}`,
  });
}

function openHtml(name: string, slug: string) {
  return mail.frame({
    kicker: name,
    inner: `
      ${mail.title('it&rsquo;s open.')}
      ${mail.body(
        'the threshold tripped. everyone who counted themselves in is finding out right now, together. ' +
        'the first pings land into a room that is already full.',
      )}
      ${mail.plate(`${SITE}/c/${slug}`, 'place your first ping')}
      ${mail.colophon(
        `you&rsquo;re reading this because you preregistered for this opening. one-sided pings are never ` +
        `revealed to anyone. opt out entirely at ${SITE}/optout.`,
      )}`,
  });
}

function revealHtml(name: string, slug: string, pings: number, matches: number) {
  return mail.frame({
    kicker: `${name} &middot; week one`,
    inner: `
      ${mail.title(`${pings.toLocaleString()} pings placed.<br/>${matches.toLocaleString()} mutual matches.`)}
      ${mail.body('every one of them found out something true. no names, ever. numbers only, and every number exact.')}
      ${mail.plate(`${SITE}/c/${slug}`, 'see the page')}
      ${mail.colophon(`you&rsquo;re reading this because you were part of this opening. opt out entirely at ${SITE}/optout.`)}`,
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
  const out = { lapse_warned: 0, purged: 0, campus_sent: 0, failed: [] as string[] };

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
      await send(e.from_email, 'your ping lapses soon — still feel it?', lapseHtml(date));
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

  // ── 3 · campus mail (open + reveal) ────────────────────────────────────────
  const { data: mail } = await supabase
    .from('celestual_campus_mail')
    .select('id, campus_slug, to_email, kind')
    .is('sent_at', null)
    .limit(300);

  const campuses = new Map<string, { name: string; week_pings: number | null; week_matches: number | null }>();
  for (const m of mail ?? []) {
    try {
      if (!campuses.has(m.campus_slug)) {
        const { data: c } = await supabase
          .from('celestual_campuses')
          .select('name, week_pings, week_matches')
          .eq('slug', m.campus_slug)
          .maybeSingle();
        campuses.set(m.campus_slug, c ?? { name: m.campus_slug, week_pings: null, week_matches: null });
      }
      const c = campuses.get(m.campus_slug)!;
      if (m.kind === 'reveal') {
        await send(
          m.to_email,
          `${c.name.toLowerCase()}, week one — the numbers`,
          revealHtml(c.name, m.campus_slug, c.week_pings ?? 0, c.week_matches ?? 0),
        );
      } else {
        await send(m.to_email, `${c.name.toLowerCase()} is open.`, openHtml(c.name, m.campus_slug));
      }
      await supabase.from('celestual_campus_mail')
        .update({ sent_at: new Date().toISOString() }).eq('id', m.id);
      out.campus_sent++;
    } catch (err) {
      console.error('campus mail failed', m.id, String(err));
      out.failed.push(m.id);
    }
  }

  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
});

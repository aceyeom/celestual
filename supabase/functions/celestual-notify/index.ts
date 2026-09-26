// CELESTUAL: celestual-notify, the one drain every alert mail goes out of.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Drains celestual_mail_outbox (migration 0064) through Resend.           ║
// ║                                                                          ║
// ║  Deploy:  supabase functions deploy celestual-notify --no-verify-jwt     ║
// ║  Secrets: RESEND_API_KEY, CELESTUAL_FROM_EMAIL, CELESTUAL_SITE_URL       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Two kinds of mail, both in _shared/mails.ts:
//   mutual   "it's mutual.", to a person whose ping resolved. THAT a note
//            waits, never a word of it.
//   wrote    "someone wrote you a letter.", to the claimed owner of an @ who
//            turned it on, with the one tap removal link. Nothing about who.
// Every one carries a stop link, `/alerts#off=<token>`, and the headers a
// mail client needs to offer its own unsubscribe (RFC 8058): a
// List-Unsubscribe with an https URL and a mailto, and
// List-Unsubscribe-Post: List-Unsubscribe=One-Click.
//
// ── who calls it ────────────────────────────────────────────────────────────
//   POST            the drain. pg_net calls it the moment a row lands in the
//                   outbox (celestual_mail_outbox_push), and pg_cron every
//                   five minutes when something is owed (celestual-mail-
//                   sweep). Neither can carry a JWT, so the function is
//                   deployed with verify_jwt off, as it always was: it takes
//                   only rows the database says are owed, sends each to the
//                   address that row was queued for, and answers counts. Calling
//                   it reveals nothing and sends nothing that was not owed.
//   POST ?unsub=t   the one click unsubscribe a mail client sends (RFC 8058).
//                   Stops that kind of mail for the token's person and
//                   address (celestual_alerts_off_by_token), and answers ok.
//   GET ?unsub=t    a person who opened the https unsubscribe link in a
//                   browser. Nothing changes on a GET, since link scanners
//                   fetch every link in a mail; it redirects to the site's
//                   stop page, which asks the same function and says so.
//   GET             a health answer.
//
// ── the rows ────────────────────────────────────────────────────────────────
// celestual_mail_take claims the owed rows for ten minutes under skip locked
// and mints each one's links (only their sha256 is kept); a row no longer
// owed (the letter came down, the person turned it off or pressed stop) is
// closed there and never handed out. Each send reports back through
// celestual_mail_done: sent, or a backoff of 1, 5, 30 and 120 minutes, and
// failed after the fifth. Resend's Idempotency-Key is the row's id, so a send
// that landed while its report did not is not sent twice on the retry.
//
// ── and the old queue ───────────────────────────────────────────────────────
// Since 0064 a row written to celestual_notifications is moved to the outbox
// as it is written. A row written before is still drained here the old way
// (celestual_notify_take), unless it is more than fourteen days old: news of
// a mutual that late is not news, and it is closed as stale instead.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { type Mail, mutualMail, wroteMail } from '../_shared/mails.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <hello@celestual.us>';
const SITE = (Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us').replace(/\/+$/, '');
const SELF = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')}/functions/v1/celestual-notify`;
// Where a mailto unsubscribe lands. Read by a person, since nothing parses it.
const UNSUB_TO = Deno.env.get('CELESTUAL_UNSUB_MAILTO') ?? 'hello@celestual.us';

const MAX_ATTEMPTS = 5;
const BACKOFF_MIN = [1, 5, 30, 120];
const STALE_DAYS = 14;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function send(to: string, m: Mail, opts: { unsub?: string; key?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.unsub) {
    const t = encodeURIComponent(opts.unsub);
    headers['List-Unsubscribe'] = `<${SELF}?unsub=${t}>, <mailto:${UNSUB_TO}?subject=unsubscribe%20${t}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  } else {
    headers['List-Unsubscribe'] = `<mailto:${UNSUB_TO}?subject=unsubscribe>`;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.key ? { 'Idempotency-Key': opts.key } : {}),
    },
    body: JSON.stringify({ from: FROM, to, subject: m.subject, html: m.html, text: m.text, headers }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

// ── the outbox ───────────────────────────────────────────────────────────────
type Row = {
  id: string;
  kind: 'mutual' | 'wrote';
  to_email: string;
  handle: string | null;
  other_handle: string | null;
  has_card: boolean;
  letter_id: string | null;
  attempts: number;
  off_token: string;
  remove_token: string | null;
};

function mailFor(r: Row): Mail {
  const stopUrl = `${SITE}/alerts#off=${r.off_token}`;
  if (r.kind === 'wrote') {
    return wroteMail({
      handle: String(r.handle),
      readUrl: `${SITE}/letter/${r.letter_id}`,
      removeUrl: `${SITE}/r#t=${r.remove_token}`,
      stopUrl,
    });
  }
  return mutualMail({
    other: String(r.other_handle),
    hasCard: r.has_card === true,
    openUrl: `${SITE}/reveal/${encodeURIComponent(String(r.other_handle))}`,
    stopUrl,
  });
}

async function drainOutbox() {
  const { data, error } = await supabase.rpc('celestual_mail_take', { p_limit: 50 });
  if (error) throw new Error(`celestual_mail_take: ${error.message}`);
  let sent = 0;
  const failed: string[] = [];
  for (const r of (Array.isArray(data) ? data : []) as Row[]) {
    try {
      await send(r.to_email, mailFor(r), { unsub: r.off_token, key: `celestual-mail-${r.id}` });
      const { error: e } = await supabase.rpc('celestual_mail_done', { p_id: r.id, p_ok: true, p_error: null });
      if (e) console.error('celestual_mail_done failed', r.id, e.message);
      sent++;
    } catch (e) {
      const msg = String(e).slice(0, 500);
      console.error('send failed', r.id, r.kind, msg);
      await supabase.rpc('celestual_mail_done', { p_id: r.id, p_ok: false, p_error: msg });
      failed.push(r.id);
    }
  }
  return { sent, failed };
}

// ── the old queue ────────────────────────────────────────────────────────────
async function drainLegacy() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  await supabase
    .from('celestual_notifications')
    .update({ failed_at: new Date().toISOString(), last_error: `stale: older than ${STALE_DAYS} days` })
    .is('sent_at', null)
    .is('failed_at', null)
    .lt('created_at', cutoff);

  const { data, error } = await supabase.rpc('celestual_notify_take', { p_limit: 100 });
  if (error) throw new Error(`celestual_notify_take: ${error.message}`);
  let sent = 0;
  const retried: string[] = [];
  const deadLettered: string[] = [];
  for (const n of (Array.isArray(data) ? data : [])) {
    const m = mutualMail({
      other: String(n.other_handle),
      hasCard: n.has_card === true,
      openUrl: `${SITE}/reveal/${encodeURIComponent(String(n.other_handle))}`,
      stopUrl: `${SITE}/alerts`,
    });
    try {
      await send(n.to_email, m, { key: `celestual-notification-${n.id}` });
      await supabase.from('celestual_notifications').update({ sent_at: new Date().toISOString() }).eq('id', n.id);
      sent++;
    } catch (e) {
      const attempts = (n.attempts ?? 0) + 1;
      const msg = String(e).slice(0, 500);
      console.error('legacy send failed', n.id, 'attempt', attempts, msg);
      if (attempts >= MAX_ATTEMPTS) {
        await supabase.from('celestual_notifications')
          .update({ attempts, last_error: msg, failed_at: new Date().toISOString() }).eq('id', n.id);
        deadLettered.push(n.id);
      } else {
        const mins = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
        await supabase.from('celestual_notifications')
          .update({ attempts, last_error: msg, next_attempt_at: new Date(Date.now() + mins * 60_000).toISOString() })
          .eq('id', n.id);
        retried.push(n.id);
      }
    }
  }
  return { sent, retried, deadLettered };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const unsub = url.searchParams.get('unsub');

  // ── the unsubscribe ──
  if (unsub) {
    if (req.method === 'POST') {
      const { data, error } = await supabase.rpc('celestual_alerts_off_by_token', { p_token: unsub });
      if (error) {
        console.error('unsubscribe failed', error.message);
        return json({ ok: false }, 500);
      }
      return json({ ok: data?.ok === true });
    }
    return Response.redirect(`${SITE}/alerts#off=${encodeURIComponent(unsub)}`, 303);
  }

  if (req.method === 'GET') {
    return json({ ok: true, service: 'celestual-notify', configured: RESEND_API_KEY !== '' });
  }

  // No key is a configuration, not a failure: nothing is claimed, so every
  // owed row is still owed the moment the key is set.
  if (!RESEND_API_KEY) return json({ ok: true, skipped: 'no_resend_api_key' });

  try {
    const outbox = await drainOutbox();
    const legacy = await drainLegacy();
    // failed and deadLettered are the product failing its one job to a person:
    // wire them to an alert.
    return json({ ok: true, outbox, legacy });
  } catch (e) {
    console.error('drain failed', String(e));
    return json({ ok: false, error: String(e) }, 500);
  }
});

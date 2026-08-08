// CELESTUAL — celestual-notify edge function.
//
// Drains the `celestual_notifications` queue and sends each pending mutual-match
// email via Resend, then stamps `sent_at`. It is *idempotent by queue*: it only
// ever touches rows that are unsent, not yet dead-lettered, and due for an
// attempt, so it can be safely invoked by either a Supabase Database Webhook
// (on insert to celestual_notifications) or pg_cron.
//
// The email is a reveal channel for BOTH halves of a mutual (framework Screen
// 8): subject quiet and unmistakable, body in the product's own registers (serif
// italic for the feeling, small sans for the mechanics), single warm accent on
// deep navy. Every sentence is literally true; nothing here ever implies
// activity that didn't happen (the NGL line — see ULTIMATE-PRODUCT-FRAMEWORK §6.2).
//
// Since 0023 the queue can hold a row for each side rather than only the earlier
// entrant, and each row says whether a card is waiting (`has_card`) — the same
// boolean the Instagram DM carries, and the same seal: THAT there is a card,
// never a word of it. The rule that decides who gets mail is unchanged and is in
// celestual_submit: an address is only ever used by the person who stored it.
// Nobody is emailed at an address that arrived on somebody else's request.
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
import * as mail from '../_shared/mail.ts';

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

// The design is docs/DESIGN.md's, and it is the one every mail this product
// sends now wears: _shared/mail.ts owns the case, the mark, the rules and the
// plate, and this file owns only its words. It used to own both, which is why
// there were five templates and no two agreed.
function emailHtml(other: string, hasCard: boolean) {
  // The card line says THAT there is one, never a word of what it says. Those
  // words are read once, in the product, by the person they were written to
  // (migration 0022, docs/STAR-CARDS.md) — an email is forwarded, screenshotted
  // and left open on a desk, and none of that is a thing we get to do to
  // somebody else's message.
  const card = hasCard
    ? mail.body('they left a card for you. it opens when you do.')
    : '';
  return mail.frame({
    inner: `
      ${mail.title('it&rsquo;s mutual.')}
      ${mail.body(`you entered @${other}. @${other} entered you.<br/>this only ever happens when it&rsquo;s real on both sides.`)}
      ${card}
      ${mail.plate(SITE, 'go see it')}
      ${mail.colophon(
        `you&rsquo;re reading this because you placed a ping on celestual and it resolved mutual. ` +
        `one-sided pings are never revealed to anyone. to opt out entirely, visit ${SITE}/optout.`,
      )}`,
  });
}

async function sendEmail(to: string, other: string, hasCard: boolean) {
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
      html: emailHtml(other, hasCard),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const nowIso = new Date().toISOString();
  const { data: pending, error } = await supabase
    .from('celestual_notifications')
    .select('id, to_email, self_handle, other_handle, has_card, attempts')
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
      await sendEmail(n.to_email, n.other_handle, n.has_card === true);
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

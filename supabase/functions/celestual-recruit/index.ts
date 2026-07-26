// CELESTUAL — celestual-recruit edge function.
//
// This is step 3 of the recruitment loop (migration 0016, docs/RECRUITMENT.md):
//
//   1. A recruitment reel goes up, with ad spend behind it.
//   2. Someone comments "celestual" under it.
//   3. → HERE. ManyChat's comment automation fires an External Request at this
//        endpoint carrying the commenter's real Meta-authenticated username. We
//        mint a one-time signing token, store only its hash, and answer with the
//        rules plus a link. ManyChat sends that answer back as the DM.
//   4. They open the link and sign the agreement.
//   5. Signing mints their personal tracking link, and every visit and signup
//      through it is counted against them.
//
// WHY THE USERNAME IS TRUSTABLE. ManyChat is an official Meta messaging partner
// and reads the commenter's username from Meta's own API; we authenticate that
// the request truly comes from YOUR ManyChat with a shared secret. Same trust
// chain as celestual-manychat, and the same secret is reused, so there is one
// thing to rotate rather than two.
//
// WHY THE TOKEN RIDES A FRAGMENT. The DM link is celestual.us/recruit#t=<token>.
// A fragment is never sent to a server, so the one-time token cannot land in an
// access log — the same discipline as the sign-in link (0013) and the emailed
// code (/copy#c=).
//
// ManyChat setup — full step-by-step in docs/RECRUITMENT.md:
//   • Trigger:  Instagram → Comments, on the recruitment post, keyword
//               "celestual". Set it to trigger EVERY time, not once per contact.
//   • Action:   send an opening DM (ManyChat requires the contact to be opted in
//               before an External Request's reply can be delivered), then
//   • External Request → POST this URL
//       Header: X-Celestual-Token: <MANYCHAT_SHARED_SECRET>
//       Body:   { "username": "{{instagram.username}}", "subscriber_id": "{{contact.id}}" }
//       Response Mapping: map JSONPath $.reply to a text field, and send that
//       field as the next message. Every response carries `reply`, including the
//       failure paths, so the automation is never left with nothing to say.
//
// Required secret (Supabase → Edge Functions → Secrets):
//   MANYCHAT_SHARED_SECRET — the same long random string celestual-manychat uses
// Optional:
//   CELESTUAL_SITE_URL     — default https://celestual.us
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-recruit
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHARED_SECRET = Deno.env.get('MANYCHAT_SHARED_SECRET') ?? '';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function safeEqual(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// The two DMs this function can ask ManyChat to send. Short, plain, and honest
// about what signing means — the agreement itself is on the page, this is the
// doorway to it.
const inviteDm = (url: string) =>
  [
    "You're in. Here's how it works.",
    '',
    'Read the rules and sign here, it takes a minute:',
    url,
    '',
    'The moment you sign we send you your own tracking link. Every person who joins through it is counted as yours.',
  ].join('\n');

const alreadyDm = (code: string) =>
  [
    "You've already signed, so here's your link again:",
    '',
    `${SITE}/r/${code}`,
    '',
    'Everyone who joins through it counts as yours.',
  ].join('\n');

Deno.serve(async (req) => {
  if (req.method === 'GET') return json({ ok: true, service: 'celestual-recruit' });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const raw = await req.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const presented = req.headers.get('x-celestual-token') ?? body.secret ?? '';
  if (!SHARED_SECRET || !safeEqual(String(presented), SHARED_SECRET)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const subscriberId = body.subscriber_id != null ? String(body.subscriber_id) : '';
  if (!username) {
    return json({
      ok: false,
      status: 'no_username',
      reply: "We couldn't read your account from that comment. Comment celestual again and it'll go through.",
    });
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);

  const { data, error } = await supabase.rpc('celestual_recruit_invite', {
    p_username: username,
    p_igsid: subscriberId,
    p_invite_hash: tokenHash,
  });

  if (error || !data?.ok) {
    console.error('recruit invite failed', error?.message ?? data?.error);
    return json({
      ok: false,
      status: 'error',
      reply: "Something on our side didn't answer. Comment celestual again in a minute and we'll pick it up.",
    });
  }

  // Already signed: they don't need the agreement again, they need their link.
  if (data.status === 'signed' && data.code) {
    return json({ ok: true, status: 'signed', code: data.code, reply: alreadyDm(String(data.code)) });
  }

  return json({ ok: true, status: 'invited', reply: inviteDm(`${SITE}/recruit#t=${token}`) });
});

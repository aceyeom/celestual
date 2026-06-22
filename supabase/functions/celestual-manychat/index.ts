// CELESTUAL — celestual-manychat edge function.
//
// The no-Meta-developer-portal path. ManyChat (an official Meta messaging partner)
// owns the Instagram connection; when someone DMs the verification code to your
// Instagram account, a ManyChat automation fires an "External Request" to THIS
// endpoint, passing the sender's real Instagram username and the message text.
// We trust the username because ManyChat obtained it from Meta's official API, and
// we authenticate that the request truly comes from YOUR ManyChat with a shared
// secret. The 4-digit code is only a correlation id (see
// supabase/migrations/0004_ig_verification.sql) — the username match is the gate.
//
// ManyChat External Request setup (see docs/SETUP-IG-VERIFY.md):
//   • Method: POST   URL: this function's URL
//   • Header:  X-Celestual-Token: <MANYCHAT_SHARED_SECRET>
//   • Body (JSON), inserting ManyChat fields with the "+" picker:
//       { "username": "{{instagram.username}}", "text": "{{last_text_input}}" }
//
// Required secret (Supabase → Edge Functions → Secrets):
//   MANYCHAT_SHARED_SECRET — a long random string you also set in the ManyChat
//                            request header. This is what stops anyone else from
//                            POSTing fake verifications, so keep it secret + rotate it.
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-manychat
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHARED_SECRET = Deno.env.get('MANYCHAT_SHARED_SECRET') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Constant-time-ish compare so the secret can't be guessed byte-by-byte via timing.
function safeEqual(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Every standalone 4-digit run in the text, most-specific first. (A wrong code just
// finds no pending session — parsing is never the security boundary.)
function codeCandidates(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? '').matchAll(/(?<!\d)(\d{4})(?!\d)/g)) out.push(m[1]);
  return [...new Set(out)];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'GET') return json({ ok: true, service: 'celestual-manychat' });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const raw = await req.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  // Authenticate the source (ManyChat) — header preferred, body field tolerated.
  const presented = req.headers.get('x-celestual-token') ?? body.secret ?? '';
  if (!SHARED_SECRET || !safeEqual(String(presented), SHARED_SECRET)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const text = typeof body.text === 'string' ? body.text : '';
  // ManyChat's contact id (optional) — stored as the igsid for audit if provided.
  const subscriberId = body.subscriber_id != null ? String(body.subscriber_id) : '';
  if (!username) return json({ ok: false, status: 'no_username' });

  const candidates = codeCandidates(text);
  if (candidates.length === 0) return json({ ok: false, status: 'no_code' });

  for (const token of candidates) {
    const { data, error } = await supabase.rpc('celestual_complete_ig_verification', {
      p_token: token,
      p_igsid: subscriberId || username,
      p_username: username,
    });
    if (error) {
      console.error('complete error', token, error.message);
      continue;
    }
    if (data?.ok) {
      // ManyChat can map `reply` to a field and send it back as a DM (optional).
      return json({ ok: true, status: 'verified', handle: data.handle, reply: `✦ @${data.handle} is verified on CELESTUAL — head back to the app to finish.` });
    }
    if (data?.error === 'handle_mismatch') {
      return json({ ok: false, status: 'handle_mismatch', reply: 'That code was started for a different @. Start again from the app with this account.' });
    }
  }

  // No candidate matched a live pending session (expired, already used, or random DM).
  return json({ ok: false, status: 'no_match', reply: 'That code didn’t match an active request. Get a fresh code in the app and send it here.' });
});

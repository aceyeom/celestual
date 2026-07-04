// CELESTUAL — celestual-ig-webhook edge function.
//
// Receives Instagram Direct Messages from Meta's official Messaging webhook and
// completes handle-ownership verification. This is the ToS-compliant path: the
// VISITOR never does any Facebook/Instagram OAuth — they just DM a short code to
// our Instagram account, and Meta delivers that message here, signed.
//
// WHAT MAKES IT SECURE (mirror of supabase/migrations/0004_ig_verification.sql):
//   1. We verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the
//      app secret) — a forged webhook can't fake a DM.
//   2. We do NOT trust any username in the payload. We re-fetch the sender's REAL
//      username from the Graph API using the sender's Instagram-scoped id (IGSID).
//   3. The decisive comparison (username == claimed handle) happens in the
//      SECURITY DEFINER RPC celestual_complete_ig_verification, callable only by
//      the service role. A 4-digit code guess buys nothing — it just names a
//      pending session; ownership is decided by the Meta-authenticated identity.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   IG_APP_SECRET     — Meta app secret (verifies the webhook signature)
//   IG_VERIFY_TOKEN   — your chosen verify token (the GET subscription handshake)
//   IG_ACCESS_TOKEN   — long-lived Instagram access token (reads the username; can
//                       optionally send the confirmation DM). graph.instagram.com.
// Optional:
//   IG_GRAPH_VERSION  — Graph API version (default 'v21.0')
//   IG_CONFIRM_DM     — '1' to DM "you're verified ✦" back (best-effort)
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-ig-webhook
// Then subscribe it to the `messages` field in your Meta app. See
// docs/DEBUG-IG-WEBHOOK.md.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_SECRET = Deno.env.get('IG_APP_SECRET') ?? '';
const VERIFY_TOKEN = Deno.env.get('IG_VERIFY_TOKEN') ?? '';
const ACCESS_TOKEN = Deno.env.get('IG_ACCESS_TOKEN') ?? '';
const GRAPH_VERSION = Deno.env.get('IG_GRAPH_VERSION') ?? 'v21.0';
const CONFIRM_DM = Deno.env.get('IG_CONFIRM_DM') === '1';
const GRAPH = 'https://graph.instagram.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ── signature check ────────────────────────────────────────────────────────────
// Meta signs the raw request body: X-Hub-Signature-256: sha256=<hex(hmac)>.
const enc = new TextEncoder();
function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Constant-time-ish compare so a bad signature can't be timed byte-by-byte.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET || !header) return false;
  const sig = header.startsWith('sha256=') ? header.slice(7) : header;
  const key = await crypto.subtle.importKey('raw', enc.encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
  return safeEqual(hex(mac), sig.toLowerCase());
}

// Pull every standalone 4-digit run out of the message text, most-specific first.
// (Security doesn't rest on parsing — a wrong code simply finds no pending session.)
function codeCandidates(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?<!\d)(\d{4})(?!\d)/g)) out.push(m[1]);
  return [...new Set(out)];
}

// The sender's REAL username, straight from Meta — never from the payload.
async function fetchUsername(igsid: string): Promise<string | null> {
  if (!ACCESS_TOKEN) return null;
  try {
    const url = `${GRAPH}/${GRAPH_VERSION}/${igsid}?fields=username&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('username fetch failed', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return typeof data?.username === 'string' ? data.username : null;
  } catch (e) {
    console.error('username fetch error', String(e));
    return null;
  }
}

async function sendConfirm(igsid: string, handle: string) {
  if (!CONFIRM_DM || !ACCESS_TOKEN) return;
  try {
    await fetch(`${GRAPH}/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(ACCESS_TOKEN)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text: `✦ @${handle} is verified on CELESTUAL. You can close this and finish sealing your star.` } }),
    });
  } catch (e) {
    console.error('confirm DM failed', String(e));
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── GET: the subscription handshake Meta performs once when you add the webhook.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && VERIFY_TOKEN && safeEqual(token, VERIFY_TOKEN)) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  // Read the RAW body first — the signature is computed over these exact bytes.
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) {
    return new Response('bad_signature', { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('bad_json', { status: 200 }); // 200 so Meta doesn't disable the hook
  }

  const results: Array<Record<string, unknown>> = [];
  try {
    for (const entry of body?.entry ?? []) {
      // Instagram messaging events arrive under `messaging` (a `changes`/`value`
      // shape is also tolerated for forward-compat).
      const events = entry?.messaging ?? entry?.changes?.flatMap((c: any) => c?.value?.messages ?? []) ?? [];
      for (const ev of events) {
        const msg = ev?.message;
        if (!msg || msg.is_echo) continue;               // ignore our own outbound echoes
        const igsid = ev?.sender?.id;
        const text = typeof msg.text === 'string' ? msg.text : '';
        if (!igsid || !text) continue;

        const candidates = codeCandidates(text);
        if (candidates.length === 0) continue;

        const username = await fetchUsername(igsid);
        if (!username) {
          results.push({ igsid, error: 'no_username' });
          continue;
        }

        // Try each candidate code against a pending session; the RPC enforces the
        // username == claimed-handle rule and flips the row to 'verified'.
        let done = false;
        for (const token of candidates) {
          const { data, error } = await supabase.rpc('celestual_complete_ig_verification', {
            p_token: token,
            p_igsid: String(igsid),
            p_username: username,
          });
          if (error) {
            results.push({ token, error: error.message });
            continue;
          }
          if (data?.ok) {
            await sendConfirm(String(igsid), data.handle);
            results.push({ token, ok: true, handle: data.handle });
            done = true;
            break;
          }
        }
        if (!done) results.push({ igsid, username, matched: false });
      }
    }
  } catch (e) {
    console.error('webhook processing error', String(e));
  }

  // Always 200 so Meta keeps the subscription healthy; detail is for our logs.
  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

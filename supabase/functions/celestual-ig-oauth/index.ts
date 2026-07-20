// CELESTUAL — celestual-ig-oauth edge function.
//
// The SCALE path for handle-ownership verification: "Instagram API with Instagram
// Login" (OAuth 2.0). Instead of DMing a code (fragile at scale — message-requests
// folder, Development-mode delivery, ManyChat quirks; see docs/OAUTH-SCALING-
// STRATEGY.md), the visitor authorizes CELESTUAL directly with Instagram and Meta
// tells us their real user id + username. That IS proof of ownership, it needs NO
// Facebook Page and NO ManyChat, and it scales to unlimited users.
//
// THE ROUND TRIP (this function is the OAuth redirect_uri):
//   1. Browser: mints the same 256-bit `proof`, calls celestual_start_ig_oauth →
//      gets a high-entropy `state`, then sends the person to Instagram's consent
//      screen with ?state=<state> (see app/src/api/igverify.js).
//   2. Instagram redirects the person back HERE with ?code=…&state=…
//   3. We exchange `code` → a short-lived access token (+ user_id) at
//      api.instagram.com, then read the authoritative username from
//      graph.instagram.com/me.
//   4. We call the EXISTING service-role RPC celestual_complete_ig_verification
//      with p_token = state. Its decisive check is byte-identical to the DM path:
//      the real username must equal the claimed handle, or nothing verifies.
//   5. We hand control back to the app. In a POPUP we postMessage the outcome to
//      the opener (so the in-progress entry the person was composing is NEVER lost
//      — the main tab never navigated away). With no opener (full redirect, e.g.
//      mobile) we redirect to SITE_URL?ig_oauth=<outcome> and the app resumes the
//      saved pending record and polls celestual_poll_ig_verification to finish.
//
// The browser holds the raw `proof`; this function never sees or needs it. It only
// flips the pending row to 'verified' — exactly what the DM webhook does.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   IG_OAUTH_CLIENT_ID     — your Instagram app's client id (Instagram → API setup
//                            with Instagram login → "Instagram app ID").
//   IG_OAUTH_CLIENT_SECRET — the matching Instagram app secret.
//   IG_OAUTH_REDIRECT_URI  — this function's public URL, EXACTLY as registered in
//                            the app's "Valid OAuth Redirect URIs" (trailing slash,
//                            scheme and all — Meta compares it verbatim).
//   CELESTUAL_SITE_URL     — where the app lives (e.g. https://celestual.us). Both
//                            the redirect target and the postMessage origin.
// Optional:
//   IG_GRAPH_VERSION       — Graph API version (default 'v21.0').
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-ig-oauth --no-verify-jwt
// Full operator setup: docs/IG-OAUTH-SETUP.md.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID = Deno.env.get('IG_OAUTH_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('IG_OAUTH_CLIENT_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('IG_OAUTH_REDIRECT_URI') ?? '';
const SITE_URL = (Deno.env.get('CELESTUAL_SITE_URL') ?? '').replace(/\/+$/, '');
const GRAPH_VERSION = Deno.env.get('IG_GRAPH_VERSION') ?? 'v21.0';
const GRAPH = 'https://graph.instagram.com';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// The origin we're willing to postMessage to / redirect back to. Falls back to the
// redirect_uri's origin if SITE_URL isn't set, so a misconfig can't leak to '*'.
function siteOrigin(): string {
  try {
    return new URL(SITE_URL || REDIRECT_URI).origin;
  } catch {
    return '';
  }
}

// A tiny HTML page that finishes the flow in BOTH shapes with one response:
//   • popup: postMessage the outcome to window.opener, then close.
//   • full redirect: no opener → navigate the tab to SITE_URL?ig_oauth=<outcome>.
// outcome ∈ 'ok' | 'mismatch' | 'denied' | 'error'.
function finishPage(outcome: string): Response {
  const origin = siteOrigin();
  const back = `${SITE_URL || origin}/?ig_oauth=${encodeURIComponent(outcome)}`;
  // outcome and origin are server-controlled tokens; JSON.stringify keeps them safe
  // to embed as JS string literals.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CELESTUAL</title><style>html,body{margin:0;height:100%;background:#0b0b12;color:#e9e4d8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:grid;place-items:center}p{opacity:.8;font-size:14px}</style></head><body><p>Finishing…</p><script>
(function(){
  var outcome=${JSON.stringify(outcome)};
  var origin=${JSON.stringify(origin)};
  var back=${JSON.stringify(back)};
  try{
    if(window.opener&&!window.opener.closed&&origin){
      window.opener.postMessage({source:'celestual-ig-oauth',outcome:outcome},origin);
      window.close();
      return;
    }
  }catch(e){}
  window.location.replace(back);
})();
</script></body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Exchange the authorization code for a short-lived token (+ user_id). Meta has
// returned this both flat and wrapped in a `data` array across versions, so read both.
async function exchangeCode(code: string): Promise<{ token: string; userId: string } | null> {
  const form = new URLSearchParams();
  form.set('client_id', CLIENT_ID);
  form.set('client_secret', CLIENT_SECRET);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', REDIRECT_URI);
  form.set('code', code);
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      console.error('token exchange failed', res.status, JSON.stringify(data));
      return null;
    }
    const row = Array.isArray(data?.data) ? data.data[0] : data;
    const token = typeof row?.access_token === 'string' ? row.access_token : '';
    const userId = row?.user_id != null ? String(row.user_id) : '';
    if (!token) return null;
    return { token, userId };
  } catch (e) {
    console.error('token exchange error', String(e));
    return null;
  }
}

// The authoritative username, straight from Meta — never trusted from the client.
// We request only `username` (universally supported on the /me node); the igsid comes
// from the token exchange, so an unsupported extra field can never break verification.
async function fetchUsername(token: string): Promise<{ username: string; userId: string } | null> {
  try {
    const url = `${GRAPH}/${GRAPH_VERSION}/me?fields=username&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      console.error('username fetch failed', res.status, JSON.stringify(data));
      return null;
    }
    const username = typeof data?.username === 'string' ? data.username : '';
    const userId = data?.user_id != null ? String(data.user_id) : (data?.id != null ? String(data.id) : '');
    if (!username) return null;
    return { username, userId };
  } catch (e) {
    console.error('username fetch error', String(e));
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Health check / accidental direct hit with no OAuth params.
  if (req.method === 'GET' && !url.searchParams.has('code') && !url.searchParams.has('error') && !url.searchParams.has('state')) {
    return new Response(JSON.stringify({ ok: true, service: 'celestual-ig-oauth' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (req.method !== 'GET') {
    return new Response('method_not_allowed', { status: 405 });
  }

  // The person declined on Instagram's consent screen (or Meta returned an error).
  if (url.searchParams.has('error')) {
    console.warn('oauth denied/error', url.searchParams.get('error'), url.searchParams.get('error_description'));
    return finishPage('denied');
  }

  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (!code || !state) return finishPage('error');
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('celestual-ig-oauth missing config (client id/secret/redirect uri)');
    return finishPage('error');
  }

  // 1. code → short-lived token (+ user id).
  const tok = await exchangeCode(code);
  if (!tok) return finishPage('error');

  // 2. token → authoritative username.
  const who = await fetchUsername(tok.token);
  if (!who) return finishPage('error');

  // 3. Complete via the SAME service-role RPC the DM webhook uses. p_token = state.
  try {
    const { data, error } = await supabase.rpc('celestual_complete_ig_verification', {
      p_token: state,
      p_igsid: who.userId || tok.userId || '',
      p_username: who.username,
    });
    if (error) {
      console.error('complete rpc error', error.message);
      return finishPage('error');
    }
    if (data?.ok) return finishPage('ok');
    if (data?.error === 'handle_mismatch') return finishPage('mismatch');
    // no_pending (state expired / already used / already verified). The browser's
    // own poll will read the true state; a generic 'error' keeps the page honest.
    if (data?.already_verified) return finishPage('ok');
    return finishPage('error');
  } catch (e) {
    console.error('complete threw', String(e));
    return finishPage('error');
  }
});

// /api/resolve: the front door to the handle resolver, on our own origin.
//
// The browser posts a handle here and this forwards it to the celestual-resolve
// edge function (supabase/functions/celestual-resolve). It exists for two
// reasons, and both are about what the edge function is allowed to know.
//
// ── THE COOKIE ───────────────────────────────────────────────────────────────
// The per-device cap counts against a UUID the edge function issues in an
// httpOnly cookie (spec section 5). A cookie set by *.supabase.co on a page
// served from celestual.us is a third party cookie, and Safari and Chrome both
// drop it. Answered here means the cookie is ours: same origin, first party,
// kept. Open question Q8, answered B. This used to be a bare rewrite in
// vercel.json, and for the cookie a rewrite was enough.
//
// ── THE ADDRESS ──────────────────────────────────────────────────────────────
// It was not enough for the address. Through a rewrite the edge function saw
// Vercel's egress as the connecting IP, so its 200 a day backstop was shared by
// every visitor on the same Vercel edge and nobody's real address was counted
// at all. The 4 September audit read it straight off the ledger: one device's
// ten handles spread across four AWS addresses, none of them the visitor's.
//
// A function can say who is asking. Vercel writes x-forwarded-for itself and
// does not let a client forge it, so the first hop is the visitor. It goes on
// as x-forwarded-for, and the request proves it came from here with a shared
// secret in x-resolve-proxy. The edge function counts the forwarded address
// only when the secret matches; without it, it counts the connecting address,
// which is safe and merely shared. So this file can never make the caps
// weaker than a rewrite did, only truer.
//
// Env (Vercel, all environments):
//   RESOLVE_PROXY_SECRET   the same value as the Supabase secret of that name
//   VITE_SUPABASE_URL      already set for the app; names the project
//
// Nothing here reads the body beyond passing it on, and nothing here is cached:
// every answer is about one handle for one person.

const FALLBACK_PROJECT = 'https://vwbsjwaqnycyghvwlxhd.supabase.co';
const FUNCTION_PATH = '/functions/v1/celestual-resolve';

// The edge function gives an Apify run thirty seconds and the face eight, so
// the longest honest answer is a little over forty. Past that we stop waiting
// and say so; the client draws a provider failure as nothing at all.
const UPSTREAM_TIMEOUT_MS = 50_000;
const MAX_BODY_BYTES = 4_096;

function upstreamUrl() {
  const base = String(process.env.VITE_SUPABASE_URL || FALLBACK_PROJECT).replace(/\/+$/, '');
  return `${base}${FUNCTION_PATH}`;
}

function firstHop(v) {
  return String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim();
}

// Vercel parses a JSON body before we see it. Whatever shape it arrives in, the
// upstream gets one small JSON document or nothing.
function bodyText(req) {
  const b = req.body;
  let text;
  if (b === undefined || b === null) text = '';
  else if (typeof b === 'string') text = b;
  else if (Buffer.isBuffer(b)) text = b.toString('utf8');
  else text = JSON.stringify(b);
  return text.length > MAX_BODY_BYTES ? null : text;
}

function send(res, status, body, extra = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });

  const text = bodyText(req);
  if (text === null) return send(res, 400, { ok: false, error: 'bad_input' });

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const cookie = req.headers.cookie;
  if (cookie) headers.Cookie = String(cookie).slice(0, 4_096);
  const ip = firstHop(req.headers['x-forwarded-for']) || firstHop(req.headers['x-real-ip']);
  if (ip) headers['X-Forwarded-For'] = ip;
  const secret = process.env.RESOLVE_PROXY_SECRET || '';
  if (secret) headers['X-Resolve-Proxy'] = secret;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const up = await fetch(upstreamUrl(), {
      method: 'POST',
      headers,
      body: text,
      signal: ac.signal,
      redirect: 'manual',
    });
    const out = await up.text();

    // The device cookie, and the wait on a rate limit, are the two headers the
    // browser needs to see. Everything else about the upstream stays upstream.
    const extra = {};
    const cookies = typeof up.headers.getSetCookie === 'function' ? up.headers.getSetCookie() : [];
    if (cookies.length) extra['Set-Cookie'] = cookies;
    const retry = up.headers.get('retry-after');
    if (retry) extra['Retry-After'] = retry;

    send(res, up.status, out || '{}', extra);
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    console.error(aborted ? 'resolve upstream timed out' : 'resolve upstream failed', String(e));
    // A proxy failure is a provider failure to the client: it draws nothing,
    // never "no account by that name".
    send(res, 502, { ok: false, error: 'provider' });
  } finally {
    clearTimeout(timer);
  }
};

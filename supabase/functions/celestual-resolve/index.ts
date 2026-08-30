// CELESTUAL — celestual-resolve edge function (the Instagram handle resolver).
//
// A person types an @ from memory and presses send. If they mistyped it, the
// ping stands for sixty days against an account that does not exist and nothing
// in the product can ever tell them. This function is the fix: it turns a typed
// handle into a display name, a badge and a face, server-side, so the confirm
// step confirms against a PERSON instead of against their own spelling.
//
// ── TWO ENDPOINTS, ONE FUNCTION ──────────────────────────────────────────────
//
//   POST { handle, device? }        → resolve
//     { ok:true, found:true,  handle, display_name, is_verified, is_private,
//       avatar, cached }
//     { ok:true, found:false, handle }                  nobody by that name
//     { ok:false, error:'rate' | 'bad_input' | 'off' }  say so, never guess
//
//   GET  ?avatar=<handle>           → the picture, proxied live
//     image bytes, or 302 to nothing. See THE PICTURE below.
//
// A `found:false` is NOT a refusal and the client must not treat it as one. The
// product's rule is that a lookup never blocks the act: if we cannot find the
// account, the app says so once and lets the ping go anyway. We are not
// Instagram's registry, our providers are imperfect, and a person who knows
// their friend's handle is right is right.
//
// ── THE PROVIDERS ────────────────────────────────────────────────────────────
// Tried in order, first answer wins:
//
//   1. Instagram's own public web-profile endpoint. Free, no key, and the most
//      accurate thing there is about Instagram. It is also the first thing to
//      refuse a datacenter IP, which is why there is a second one.
//   2. HikerAPI, authenticated with the `x-access-key` header. The paid
//      fallback for everything the first one will not answer.
//
// Both are read-only lookups of a public profile by exact username. Neither is
// ever reached from the browser: the keys are server-side secrets here and the
// client never learns which provider answered.
//
// ── THE PICTURE ──────────────────────────────────────────────────────────────
// We never store the image. Instagram's CDN URLs are signed and expire within
// hours, so a copied URL is a broken image by tomorrow and a copied FILE is us
// hosting a stranger's face on our own disk, with everything that implies about
// consent, takedowns and storage cost. What the cache holds is the URL; what
// the browser gets is `?avatar=<handle>` on this function, which fetches the
// live CDN URL at request time, streams the bytes through, and keeps none. If
// the signed URL has expired, the proxy re-resolves once and tries again.
//
// The proxy is also what keeps the browser from talking to Instagram: an <img>
// pointed straight at the CDN would put every viewer's IP in front of Meta on
// behalf of somebody they typed.
//
// ── THE CAPS ─────────────────────────────────────────────────────────────────
// Per device: 30 DISTINCT handles per rolling day. Re-asking about a handle
// this device already asked about is free, so backspacing and retyping never
// costs anything. A person placing a ping looks up one or two accounts; thirty
// is far past normal use and far short of a scrape.
//
// Per IP: much more lenient, on purpose. One Berkeley address is a residence
// hall behind one NAT, and a cap tight enough to stop a script there would lock
// out a floor because somebody typed a lot. Two windows (hour and day) at a
// height a building never reaches.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   HIKER_API_KEY     — HikerAPI access key, sent as `x-access-key`
//   HIKER_API_BASE    — optional, defaults to https://api.hikerapi.com
//   IG_PUBLIC_LOOKUP  — optional '0' to skip provider 1 (if it is being refused)
// Provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-resolve --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const HIKER_KEY = Deno.env.get('HIKER_API_KEY') ?? '';
const HIKER_BASE = (Deno.env.get('HIKER_API_BASE') ?? 'https://api.hikerapi.com').replace(/\/+$/, '');
const IG_PUBLIC = Deno.env.get('IG_PUBLIC_LOOKUP') !== '0';

// The public web-profile endpoint wants the web app's id and a browser-shaped
// UA. Neither is a secret (both ride on every instagram.com page load); they
// are here because the endpoint answers 400 without them.
const IG_APP_ID = '936619743392459';
const IG_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const HIT_TTL_MS = 24 * 3600_000; //  a found account is good for a day
const MISS_TTL_MS = 3600_000; //      a missing one for an hour: that fact changes

const PER_DEVICE_DAY = 30; //         distinct handles per device per rolling day
const PER_IP_HOUR = 300; //           lookups per address per hour
const PER_IP_DAY = 1500; //           and per rolling day

const MAX_IMAGE_BYTES = 3_000_000;
const PROVIDER_TIMEOUT_MS = 6000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

// Mirror of celestual_norm() and the client's normHandle(): lowercase, drop a
// leading @, keep only IG-legal characters. One shape of key everywhere.
function norm(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30);
}

// Prefer the proxy-set headers a client cannot forge (cf-connecting-ip is
// written by Cloudflare itself); the first x-forwarded-for hop, which a client
// CAN prepend, is the last resort only. Same posture as celestual-edu-verify.
function clientIp(req: Request): string | null {
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null
  );
}

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(id) };
}

type Account = {
  handle: string;
  display_name: string;
  is_verified: boolean;
  is_private: boolean;
  pic_url: string;
  source: string;
};

// ── provider 1 · Instagram's public web profile ──────────────────────────────
async function fromInstagram(handle: string): Promise<Account | null> {
  if (!IG_PUBLIC) return null;
  const { signal, done } = withTimeout(PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      {
        signal,
        headers: {
          'x-ig-app-id': IG_APP_ID,
          'User-Agent': IG_UA,
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );
    // Every non-200 falls through to the paid provider, 404 included. A 404
    // here USUALLY means no such account, but Instagram also answers 404 to a
    // request it has decided it does not like, and the two are indistinguishable
    // from this side. Telling somebody their friend does not exist because a
    // scraper-shy endpoint shrugged is the one failure worth paying to avoid;
    // the one-hour miss cache keeps the bill for real typos small.
    if (!res.ok) return null;
    const body = await res.json();
    const u = body?.data?.user ?? body?.user ?? null;
    if (!u || !u.username) return null;
    return {
      handle: norm(u.username),
      display_name: String(u.full_name ?? '').slice(0, 120),
      is_verified: !!u.is_verified,
      is_private: !!u.is_private,
      pic_url: String(u.profile_pic_url_hd ?? u.profile_pic_url ?? '').slice(0, 2048),
      source: 'instagram',
    };
  } catch {
    return null;
  } finally {
    done();
  }
}

// ── provider 2 · HikerAPI (the fallback for everything else) ─────────────────
// One header, `x-access-key`. The v1 endpoint answers with the user object;
// some versions wrap it in `user` or `data`, so read all three.
async function fromHiker(handle: string): Promise<Account | null> {
  if (!HIKER_KEY) return null;
  const { signal, done } = withTimeout(PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${HIKER_BASE}/v1/user/by/username?username=${encodeURIComponent(handle)}`,
      { signal, headers: { 'x-access-key': HIKER_KEY, Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const u = body?.user ?? body?.data?.user ?? body?.data ?? body ?? null;
    if (!u || !(u.username ?? u.handle)) return null;
    return {
      handle: norm(u.username ?? u.handle),
      display_name: String(u.full_name ?? u.fullName ?? '').slice(0, 120),
      is_verified: !!(u.is_verified ?? u.verified),
      is_private: !!(u.is_private ?? u.private),
      pic_url: String(u.profile_pic_url_hd ?? u.profile_pic_url ?? u.profilePicUrl ?? '').slice(0, 2048),
      source: 'hiker',
    };
  } catch {
    return null;
  } finally {
    done();
  }
}

// The chain. A provider that returns null did not answer; the next one is
// asked. If none of them answered, the handle is recorded as not found, which
// is a soft fact the client is free to place a ping against anyway.
async function resolveLive(handle: string): Promise<Account | null> {
  return (await fromInstagram(handle)) ?? (await fromHiker(handle));
}

type CacheRow = {
  handle: string;
  found: boolean;
  display_name: string | null;
  is_verified: boolean;
  is_private: boolean;
  pic_url: string | null;
  fetched_at: string;
};

async function readCache(handle: string): Promise<CacheRow | null> {
  const { data } = await supabase
    .from('celestual_handle_cache')
    .select('handle, found, display_name, is_verified, is_private, pic_url, fetched_at')
    .eq('handle', handle)
    .maybeSingle();
  return (data as CacheRow) ?? null;
}

function fresh(row: CacheRow | null): boolean {
  if (!row) return false;
  const age = Date.now() - new Date(row.fetched_at).getTime();
  return age < (row.found ? HIT_TTL_MS : MISS_TTL_MS);
}

async function writeCache(handle: string, acct: Account | null, source: string) {
  await supabase.from('celestual_handle_cache').upsert(
    {
      handle,
      found: !!acct,
      display_name: acct?.display_name || null,
      is_verified: !!acct?.is_verified,
      is_private: !!acct?.is_private,
      pic_url: acct?.pic_url || null,
      source,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'handle' },
  );
}

// Rows past every window are dead weight. Swept here rather than by a cron, on
// a small fraction of requests, the way celestual-edu-verify sweeps its codes.
async function sweep() {
  if (Math.random() > 0.04) return;
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  await supabase.from('celestual_handle_lookups').delete().lt('created_at', dayAgo);
  await supabase
    .from('celestual_handle_cache')
    .delete()
    .lt('fetched_at', new Date(Date.now() - 7 * 86_400_000).toISOString());
}

// ── the caps ─────────────────────────────────────────────────────────────────
// Returns null when the request may proceed, or the error slug when it may not.
// The device cap counts DISTINCT handles, so a handle this device has already
// asked about in the window is always free: retyping never costs anything.
async function overCap(device: string | null, ip: string | null, handle: string): Promise<string | null> {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  if (device) {
    // Only BILLED rows count: a handle answered out of the cache cost nobody
    // anything, and charging a person's thirty for our own cache hit would
    // lock them out for looking the same friend up twice on two screens.
    const { data } = await supabase
      .from('celestual_handle_lookups')
      .select('handle')
      .eq('device', device)
      .eq('billed', true)
      .gte('created_at', dayAgo)
      .limit(400);
    const seen = new Set((data ?? []).map((r: { handle: string }) => r.handle));
    if (!seen.has(handle) && seen.size >= PER_DEVICE_DAY) return 'rate';
  }

  if (ip) {
    const { count: hour } = await supabase
      .from('celestual_handle_lookups')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', hourAgo);
    if ((hour ?? 0) >= PER_IP_HOUR) return 'rate';
    const { count: day } = await supabase
      .from('celestual_handle_lookups')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', dayAgo);
    if ((day ?? 0) >= PER_IP_DAY) return 'rate';
  }

  return null;
}

async function record(device: string | null, ip: string | null, handle: string, billed: boolean) {
  await supabase.from('celestual_handle_lookups').insert({ device, ip, handle, billed });
}

// The URL the browser puts in an <img>. Same function, GET, one query param.
// Never the CDN URL itself: it is signed, it expires, and pointing a browser at
// it hands Meta the viewer's IP.
function avatarHref(req: Request, handle: string): string {
  const here = new URL(req.url);
  return `${here.origin}${here.pathname}?avatar=${encodeURIComponent(handle)}`;
}

function shapeOut(req: Request, handle: string, row: CacheRow, cached: boolean) {
  if (!row.found) return { ok: true, found: false, handle };
  return {
    ok: true,
    found: true,
    handle,
    display_name: row.display_name || '',
    is_verified: !!row.is_verified,
    is_private: !!row.is_private,
    // present only when the account actually has a picture to serve
    avatar: row.pic_url ? avatarHref(req, handle) : '',
    cached,
  };
}

// ── GET ?avatar=<handle> · the picture, proxied and never kept ───────────────
async function serveAvatar(req: Request, handle: string): Promise<Response> {
  const imgHeaders = (extra: Record<string, string> = {}) => ({
    ...CORS,
    'Cache-Control': 'public, max-age=3600',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...extra,
  });
  // A picture that cannot be served is not an error the UI should draw. The
  // readout falls back to the drawn initial, so 204 with nothing in it says
  // "no picture" without an alt-text-and-broken-glyph in the middle of a field.
  const none = () => new Response(null, { status: 204, headers: imgHeaders() });

  if (!handle) return none();

  // The proxy carries the IP net but not the device cap: it is called by an
  // <img>, which cannot send a body, and it can only ever fetch a picture for a
  // handle the resolve endpoint already put in the cache.
  const ip = clientIp(req);
  if (ip && (await overCap(null, ip, handle))) return none();

  let row = await readCache(handle);
  // Only staleness sends us back to a provider. A FRESH row with no picture is
  // a real answer (the account has none, or there is no account), and asking
  // again would put a provider call behind every request for a picture that is
  // not going to exist this hour either.
  if (!fresh(row)) {
    const acct = await resolveLive(handle);
    await writeCache(handle, acct, acct?.source ?? 'none');
    // A provider call is a provider call whichever door it came through. If
    // this one did not land in the ledger, the IP window would never see the
    // avatar endpoint at all and it would be the way around every cap here.
    await record(null, ip, handle, true);
    row = await readCache(handle);
  }
  if (!row?.found || !row.pic_url) return none();

  const pull = async (url: string) => {
    const { signal, done } = withTimeout(PROVIDER_TIMEOUT_MS);
    try {
      return await fetch(url, { signal, headers: { 'User-Agent': IG_UA, Accept: 'image/*' } });
    } finally {
      done();
    }
  };

  try {
    let res = await pull(row.pic_url);
    // A signed CDN URL that has expired answers 403. That is not a missing
    // picture, it is a stale key: resolve once more for a fresh one and retry.
    if (!res.ok) {
      const acct = await resolveLive(handle);
      await record(null, ip, handle, true);
      if (!acct?.pic_url) return none();
      await writeCache(handle, acct, acct.source);
      res = await pull(acct.pic_url);
      if (!res.ok) return none();
    }
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return none();
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_IMAGE_BYTES) return none();
    // Read it rather than streaming it so the size guard is real even when the
    // upstream declines to declare a length. A profile picture is tens of KB.
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return none();
    return new Response(buf, { status: 200, headers: imgHeaders({ 'Content-Type': type }) });
  } catch {
    return none();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const handle = norm(url.searchParams.get('avatar'));
    return await serveAvatar(req, handle);
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad_input' }, 400);
  }

  const handle = norm(body.handle);
  // Instagram's own floor is one character, but a one-character query is a
  // person mid-word rather than a person naming somebody. Two is where a
  // lookup starts being about an account.
  if (handle.length < 2) return json({ ok: false, error: 'bad_input' }, 400);

  const device = String(body.device ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || null;
  const ip = clientIp(req);

  await sweep();

  const cached = await readCache(handle);
  if (fresh(cached)) {
    // Free, and recorded as such: a cache hit costs no provider call and does
    // not eat into anybody's thirty.
    await record(device, ip, handle, false);
    return json(shapeOut(req, handle, cached!, true));
  }

  const capped = await overCap(device, ip, handle);
  if (capped) return json({ ok: false, error: capped });

  const acct = await resolveLive(handle);
  await writeCache(handle, acct, acct?.source ?? 'none');
  await record(device, ip, handle, true);

  const row = await readCache(handle);
  if (!row) return json({ ok: true, found: false, handle });
  return json(shapeOut(req, handle, row, false));
});

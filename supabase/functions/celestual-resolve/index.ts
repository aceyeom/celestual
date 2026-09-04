// CELESTUAL: celestual-resolve edge function (the Instagram handle resolver).
//
// A person types an @ from memory and presses send. If they mistyped it, the
// ping stands for sixty days against an account that does not exist and nothing
// in the product can ever tell them. This function is the fix: it turns a typed
// handle into a display name, a badge and a face, server-side, so the confirm
// step confirms against a PERSON instead of against their own spelling.
//
// ── ONE ENDPOINT ─────────────────────────────────────────────────────────────
//
//   POST { handle, peek? }
//     { ok:true, found:true,  handle, display_name, is_verified, avatar,
//                             cached, provider }
//     { ok:true, found:false, handle, provider }        nobody by that name
//     { ok:true, found:null,  handle, provider:false }  a peek, and the cache
//                                                       had nothing. Not a miss.
//     { ok:false, error:'rate', retry_after }           429, with the seconds
//     { ok:false, error:'provider' }                    Apify timed out or
//                                                       failed. NOT a miss.
//     { ok:false, error:'bad_input' | 'off' }           say so, never guess
//
// `cached` says where the ANSWER came from. `provider` says whether this
// request reached Apify at all, which is the only thing that costs money, and
// the two are different on one path: a refresh that failed serves yesterday's
// row (cached:true) after a billed call (provider:true). The billing pilot
// counts `provider`, not `cached`, and until this field existed it could not
// tell the two apart.
//
// There is no avatar proxy any more. `avatar` is a public Supabase Storage URL
// the browser fetches directly, and it does not expire. See THE FACE below.
//
// `peek:true` asks only what the cache already holds. It never reaches Apify,
// never counts against a cap, and answers found:null when there is nothing,
// which the client draws as nothing. The field sends it while a person is
// still typing; the real lookup is sent when they commit. That is the rule
// that stops `dav`, `davi` and `david_j` each running the actor on the way to
// one typed name (see app/src/api/handles.js).
//
// A `found:false` is NOT a refusal and the client must not treat it as one. The
// product's rule is that a lookup never blocks the act: if we cannot find the
// account, the app says so once and lets the ping go anyway. We are not
// Instagram's registry, our provider is imperfect, and a person who knows their
// friend's handle is right is right.
//
// ── THE PROVIDER ─────────────────────────────────────────────────────────────
// Apify, actor shu8hvrXbJbY3Eb9W, and nothing else. Spec section 5. One
// synchronous run per cache miss, asking for profile details with the post
// limit at zero: no posts, no comments, no reels, nothing that would turn a
// name lookup into a scrape of somebody's account.
//
// ── THE FACE ─────────────────────────────────────────────────────────────────
// Instagram's CDN URLs are signed and expire within days. Storing one would
// break every cached card by the weekend, which is why the previous version of
// this function proxied the image live on every single view and kept nothing.
//
// Now: on a cache miss the image is downloaded here, once, put in our own
// `avatars` bucket at `ig/<handle>.jpg`, and the browser is handed our own
// public URL. No Instagram URL ever reaches a browser, no viewer's IP is ever
// handed to Meta on behalf of somebody they typed, and a card drawn from cache
// draws its face from cache too.
//
// A refresh happens only when the stored picture is older than thirty days and
// that handle is resolved again. If the download fails, nothing is stored and
// the client gets no avatar: the UI draws a monogram from the display name and
// the card renders regardless. A missing face never blocks a card.
//
// ── THE CAPS ─────────────────────────────────────────────────────────────────
// Server side, three rolling 24 hour windows, enforced in the database by
// handle_search_allow (migration 0031):
//
//   user_id    20    signed in, counted on the person and not on the device
//   device_id  20    anonymous, and anonymous is the majority case
//   ip        200    the backstop, deliberately loose because one Berkeley
//                    address is a residence hall behind one NAT
//   global   1000    the ceiling on the day, counted on every call. The other
//                    three keep one actor honest; this one is what the worst
//                    day can cost (migration 0037).
//
// A CACHE HIT COSTS NOTHING. Only a call that actually reached Apify writes a
// row, found or not, so re-asking about a handle somebody already looked up is
// always free and the bill is bounded by the number of distinct handles, not
// by traffic. A row with no face is still a hit: the face is retried weekly at
// most, and never at the price of a fresh profile (0037, the leak).
//
// On a limit this answers 429 with the seconds until the oldest counted call
// ages out, so the UI can say when rather than say no.
//
// ── THE DEVICE ID ────────────────────────────────────────────────────────────
// A UUID this function issues in an httpOnly, SameSite=Lax cookie on first
// request, per spec section 5. Not a fingerprint: not derived from anything
// about the person, not joined to a handle or an account, and resettable by
// clearing cookies.
//
// It is only first party if the browser reaches this function through
// celestual.us rather than through *.supabase.co, which is what `/api/resolve`
// is for (open question Q8, answered B). Called cross-origin the cookie is
// third party, Safari and Chrome will drop it, and the IP counter carries
// those requests instead. That degradation is designed for rather than assumed
// away.
//
// ── THE PROXY, AND WHOSE ADDRESS THIS IS ─────────────────────────────────────
// `/api/resolve` is a small Vercel function (api/resolve.js) that forwards the
// browser's request here. It used to be a bare rewrite, and the audit found
// what that cost: the address this function saw was Vercel's egress, so the
// 200 a day backstop was shared by everybody on the same Vercel edge and a
// visitor's real address was never counted at all. Every anonymous user in a
// region was one "IP".
//
// The proxy sends the visitor's address in x-forwarded-for, which Vercel
// itself overwrites and does not let a client forge, and proves it is the
// proxy with x-resolve-proxy, a shared secret. When the secret matches, that
// address is the one counted. When it does not, or is not configured, the
// connecting address is used, exactly as before: a request that comes straight
// to *.supabase.co is counted on the address it came from and cannot name a
// different one.
//
// Secrets (Supabase, Edge Functions, Secrets):
//   APIFY_TOKEN           Apify API token, scoped to the actor below
//   APIFY_ACTOR_ID        optional, defaults to the actor in spec section 5
//   RESOLVE_PROXY_SECRET  the same value as the Vercel env var of that name.
//                         Without it the backstop counts Vercel, not visitors.
// Provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-resolve --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN') ?? '';
const APIFY_ACTOR = Deno.env.get('APIFY_ACTOR_ID') ?? 'shu8hvrXbJbY3Eb9W';
const PROXY_SECRET = Deno.env.get('RESOLVE_PROXY_SECRET') ?? '';
const PROXY_HEADER = 'x-resolve-proxy';

const AVATAR_BUCKET = 'avatars';

// Apify runs are slower than a plain HTTP lookup because an actor has to start.
// The pilot measured 6 to 21 seconds on a cache miss, and at a 20 second
// ceiling one of ten blew it. The run is given thirty seconds ON APIFY'S SIDE
// (`timeout=` on the run): a run this function hangs up on would otherwise
// keep going, finish, and bill for a result nobody received, which is exactly
// what happened to `vercel` in the pilot. Our own abort sits just past it so
// Apify's answer, not our silence, is what ends the wait.
const APIFY_RUN_TIMEOUT_S = 30;
const APIFY_TIMEOUT_MS = APIFY_RUN_TIMEOUT_S * 1000 + 3_000;
const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 3_000_000;

const DEVICE_COOKIE = 'cel_dev';
const DEVICE_MAX_AGE = 400 * 86_400; // the longest a browser will keep one anyway

// A handle nobody has is not cached in the database, because the cache is
// permanent now and an account registered tomorrow would read as missing
// forever. It is held here instead, for the life of this isolate, so somebody
// backspacing over a typo does not pay for every keystroke and the fact expires
// on its own.
const MISS_TTL_MS = 10 * 60_000;
const MISS_MAX = 2_000;
const misses = new Map<string, number>();

function rememberMiss(handle: string) {
  if (misses.size >= MISS_MAX) {
    const cutoff = Date.now() - MISS_TTL_MS;
    for (const [k, at] of misses) if (at < cutoff) misses.delete(k);
    // Still full means two thousand distinct misses inside ten minutes, which
    // is nobody typing. Forgetting the oldest is the cheap, bounded answer.
    if (misses.size >= MISS_MAX) misses.delete(misses.keys().next().value!);
  }
  misses.set(handle, Date.now());
}

const CORS_HEADERS = 'authorization, x-client-info, apikey, content-type';

// Credentialed requests cannot use a wildcard origin, and the device cookie is
// a credential. The origin is echoed back only for the sites this product is
// actually served from; anything else gets the wildcard and no cookie, which is
// exactly the degradation described above.
const ALLOWED_ORIGINS = [
  'https://celestual.us',
  'https://www.celestual.us',
  'http://localhost:5173',
  'http://localhost:4173',
];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '*',
    'Access-Control-Allow-Headers': CORS_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...(allowed ? { 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : { Vary: 'Origin' }),
  };
}

function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(req), ...extra },
  });
}

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

// Constant time, so the proxy secret cannot be guessed a byte at a time off
// the response clock. Lengths differing is itself a mismatch.
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

function firstHop(v: string | null): string | null {
  return (v || '').split(',')[0].trim() || null;
}

// Whose address to count. See THE PROXY above.
//
// Through our proxy, proven by the secret: the address the proxy forwards,
// which Vercel wrote and a client cannot forge. Any other way in: the address
// that actually connected, which Cloudflare writes and a client cannot forge
// either. The one thing never done is to believe a client-supplied
// x-forwarded-for on a request that did not prove where it came from.
function clientIp(req: Request): string | null {
  const viaProxy = PROXY_SECRET && sameSecret(req.headers.get(PROXY_HEADER) ?? '', PROXY_SECRET);
  if (viaProxy) {
    const fwd = firstHop(req.headers.get('x-forwarded-for'));
    if (fwd) return fwd;
  }
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    firstHop(req.headers.get('x-forwarded-for'))
  );
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k !== name) continue;
    // A bare `%` in a cookie throws from decodeURIComponent, and an uncaught
    // throw here is a 500 for a request that only needed a new cookie.
    try {
      return decodeURIComponent(v.join('=')).slice(0, 64) || null;
    } catch {
      return null;
    }
  }
  return null;
}

// httpOnly so no script can read it, SameSite=Lax so it rides an ordinary
// navigation but not a cross-site form post, Secure because everything here is
// https. Path is / rather than the function's own path, because the rewrite in
// vercel.json means the browser knows this as /api/resolve.
function deviceCookie(id: string): string {
  return [
    `${DEVICE_COOKIE}=${id}`,
    'Path=/',
    `Max-Age=${DEVICE_MAX_AGE}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
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
};

// Apify's field names have varied across versions of this actor and across the
// several Instagram actors that share its output shape, so every field is read
// from each spelling it has been known by. This is the same defensive read the
// previous provider used and it costs nothing.
function pick(u: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = u[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// ── the provider ─────────────────────────────────────────────────────────────
// One synchronous actor run, returning the dataset items directly.
//
// `resultsLimit: 0` is spec section 5's "set the post limit to zero". With
// `resultsType: 'details'` the actor returns the profile and no media at all,
// which is both what the product needs and the cheapest thing to ask for.
//
// On the URL, two guards that live on Apify's side rather than ours:
//   timeout   the run is killed at thirty seconds. A run we stopped waiting for
//             used to finish anyway and bill for a result nobody received.
//   maxItems  one billed result per run, whatever the actor decides to return.
//
// The answer is one of four things, and the caller treats each differently:
//   found     an account. Cached, recorded, answered.
//   missing   the actor ran and there is no such account. Recorded, held in the
//             isolate for ten minutes, answered as found:false.
//   timeout   the run was killed. Recorded (it ran), NOT held as a miss, and
//             answered as a provider failure: the account may well exist.
//   error     Apify refused the request (ran:false, nothing recorded), or
//             the actor ran and returned an item with nothing in it
//             (ran:true, recorded). Neither is held as a miss, and both are
//             answered as a provider failure. Before this distinction
//             existed, all three of the last cases read to a person as "no
//             account by that name".
type Lookup =
  | { kind: 'found'; acct: Account }
  | { kind: 'missing' }
  | { kind: 'timeout' }
  | { kind: 'error'; ran: boolean };

async function fromApify(handle: string): Promise<Lookup> {
  if (!APIFY_TOKEN) return { kind: 'error', ran: false };
  const { signal, done } = withTimeout(APIFY_TIMEOUT_MS);
  try {
    const url = new URL(
      `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR)}/run-sync-get-dataset-items`,
    );
    url.searchParams.set('timeout', String(APIFY_RUN_TIMEOUT_S));
    url.searchParams.set('maxItems', '1');
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${APIFY_TOKEN}`,
      },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${handle}/`],
        resultsType: 'details',
        resultsLimit: 0,
        addParentData: false,
        searchLimit: 1,
      }),
    });
    if (!res.ok) {
      // The body names the reason, and the log used to carry only the status:
      // four days of "apify run failed 400" said nothing about why. A run that
      // ran and was killed at the timeout above comes back as a 408, or as a
      // run-failed error naming TIMED-OUT, and either is a timeout, not a
      // refusal: it ran, it is recorded, and it is not a miss.
      const text = (await res.text().catch(() => '')).slice(0, 300);
      console.error('apify run failed', res.status, text);
      const timedOut = res.status === 408 || /TIMED.?OUT/i.test(text);
      return timedOut ? { kind: 'timeout' } : { kind: 'error', ran: false };
    }
    const items = await res.json();
    const u = Array.isArray(items) ? items[0] : items;
    if (!u || typeof u !== 'object') return { kind: 'missing' };

    const rec = u as Record<string, unknown>;
    // An actor that could not reach the account still returns an item, with an
    // error field and no username. That is a miss, not an answer.
    if (rec.error && !rec.username) return { kind: 'missing' };

    const username = norm(pick(rec, ['username', 'handle', 'ownerUsername']));
    if (!username) return { kind: 'missing' };

    const display_name = String(pick(rec, ['fullName', 'full_name', 'name']) ?? '').slice(0, 120);
    const pic_url = String(
      pick(rec, ['profilePicUrlHD', 'profilePicUrl', 'profile_pic_url_hd', 'profile_pic_url']) ?? '',
    ).slice(0, 2048);

    // A username with no name and no picture at all is not what a profile
    // looks like: every Instagram account has a picture URL, even the default
    // grey one. It is what the actor returns when Instagram turned it away
    // mid-run. The pilot's `supabase` was one of these, and caching it wrote a
    // faceless, nameless row that every later lookup then paid to refresh.
    if (!display_name && !pic_url) {
      console.error('apify item was empty', username);
      return { kind: 'error', ran: true };
    }

    return {
      kind: 'found',
      acct: {
        handle: username,
        display_name,
        is_verified: !!pick(rec, ['verified', 'isVerified', 'is_verified']),
        is_private: !!pick(rec, ['private', 'isPrivate', 'is_private']),
        pic_url,
      },
    };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    console.error(aborted ? 'apify call timed out' : 'apify call threw', String(e));
    return aborted ? { kind: 'timeout' } : { kind: 'error', ran: false };
  } finally {
    done();
  }
}

// ── the face, downloaded once ────────────────────────────────────────────────
// Pull the bytes, check they are an image and small enough to be a profile
// picture, and upsert them into the bucket. Returns whether it worked, and
// nothing else: spec section 5 says a failure stores nothing and lets the card
// fall back to a monogram, so there is no error for the caller to handle.
async function storeAvatar(handle: string, url: string): Promise<boolean> {
  if (!url) return false;
  const { signal, done } = withTimeout(IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'image/*' } });
    // Each refusal is logged with its reason. The audit found thirty faceless
    // rows and not one line saying why, because every branch here was silent.
    if (!res.ok) {
      console.warn('avatar fetch refused', handle, res.status);
      return false;
    }

    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) {
      console.warn('avatar not an image', handle, type);
      return false;
    }
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_IMAGE_BYTES) {
      console.warn('avatar too large', handle, declared);
      return false;
    }

    // Read rather than stream, so the size guard is real even when the upstream
    // declines to declare a length. A profile picture is tens of KB.
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) {
      console.warn('avatar wrong size', handle, buf.byteLength);
      return false;
    }

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(`ig/${handle}.jpg`, buf, { contentType: type, upsert: true, cacheControl: '2592000' });
    if (error) {
      console.error('avatar upload failed', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('avatar fetch threw', handle, String(e));
    return false;
  } finally {
    done();
  }
}

// Our own public URL, built rather than round-tripped. The bucket is public
// read, so this is a plain object URL and the browser fetches it directly from
// Supabase with no function in the path.
function avatarUrl(path: string | null): string {
  if (!path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

type Profile = {
  handle: string;
  display_name: string;
  is_verified: boolean;
  is_private: boolean;
  avatar_path: string | null;
  avatar_stale: boolean;
};

// The shape the browser gets. `is_private` is deliberately not in it: it is
// kept (Q9) because a letter to a private account may never arrive, but it is
// not the card's business and the card is the only reader here.
function shapeOut(p: Profile, cached: boolean, provider: boolean) {
  return {
    ok: true,
    found: true,
    handle: p.handle,
    display_name: p.display_name || '',
    is_verified: !!p.is_verified,
    avatar: avatarUrl(p.avatar_path),
    cached,
    provider,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { ok: false, error: 'method' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { ok: false, error: 'bad_input' }, 400);
  }

  const handle = norm(body.handle);
  // Instagram's own floor is one character, but a one-character query is a
  // person mid-word rather than a person naming somebody. Two is where a
  // lookup starts being about an account.
  if (handle.length < 2) return json(req, { ok: false, error: 'bad_input' }, 400);

  if (!APIFY_TOKEN) return json(req, { ok: false, error: 'off' });

  // ── who is asking ──────────────────────────────────────────────────────────
  // The session token, if the browser sent one, resolves to a user through the
  // same function every other surface uses (migration 0030). A signed-in person
  // is counted on their id and not on their device.
  const ip = clientIp(req);
  let userId: string | null = null;
  const token = String(body.session ?? '');
  if (token.length >= 16 && token.length <= 256) {
    const { data } = await supabase.rpc('celestual_whoami', { p_token: token });
    if (data?.signed_in && data.user?.id) userId = String(data.user.id);
  }

  // The device id is ours, not the client's. A cookie we set, or a new one.
  let device = readCookie(req, DEVICE_COOKIE);
  let setCookie: string | null = null;
  if (!device || !/^[0-9a-f-]{36}$/.test(device)) {
    device = crypto.randomUUID();
    setCookie = deviceCookie(device);
  }
  const cookieHeader = setCookie ? { 'Set-Cookie': setCookie } : {};

  // ── the cache ──────────────────────────────────────────────────────────────
  const { data: cachedRaw } = await supabase.rpc('ig_profile_get', { p_handle: handle });
  const cached = cachedRaw as Profile | null;

  // A hit is the whole answer, and it is free: nothing is recorded, because
  // nothing was spent. `avatar_stale` is the database's word for "this lookup
  // may spend a call trying for a better face": thirty days for a face we
  // have, seven for one we never got (0037). A face-less row inside that week
  // is a hit like any other.
  if (cached && !cached.avatar_stale) {
    return json(req, shapeOut(cached, true, false), 200, cookieHeader);
  }

  // A peek ends here whatever happened above: a row wanting a fresher face is
  // still a row, and no row is "nothing yet", never "nobody".
  if (body.peek === true) {
    if (cached) return json(req, shapeOut(cached, true, false), 200, cookieHeader);
    return json(req, { ok: true, found: null, handle, provider: false }, 200, cookieHeader);
  }

  // A handle we failed to find a few minutes ago, held in this isolate only.
  const missAt = misses.get(handle);
  if (!cached && missAt && Date.now() - missAt < MISS_TTL_MS) {
    return json(req, { ok: true, found: false, handle, provider: false }, 200, cookieHeader);
  }

  // ── the caps ───────────────────────────────────────────────────────────────
  // Checked only now, because everything above this line was free.
  const { data: allow } = await supabase.rpc('handle_search_allow', {
    p_user: userId,
    p_device: device,
    p_ip: ip,
  });
  if (allow && allow.ok === false) {
    // Spec section 5: the seconds remaining, so the UI can say when. A cached
    // row that only wanted a fresher face is still worth serving here rather
    // than refusing outright; the face is thirty days old, not wrong.
    if (cached) return json(req, shapeOut(cached, true, false), 200, cookieHeader);
    return json(
      req,
      { ok: false, error: 'rate', retry_after: Number(allow.retry_after ?? 0) },
      429,
      { ...cookieHeader, 'Retry-After': String(allow.retry_after ?? 0) },
    );
  }

  // ── the call ───────────────────────────────────────────────────────────────
  const got = await fromApify(handle);

  // Recorded against the caps for every call that reached the actor, found or
  // not, which is what the ledger's own comment says a row is. It used to be
  // recorded only on a found account, so a handle nobody has ran the actor
  // and cost nothing here: free, and therefore unlimited. A request Apify
  // refused outright never ran and is not recorded.
  const ran = got.kind !== 'error' || got.ran;
  if (ran) {
    await supabase.rpc('handle_search_record', {
      p_user: userId,
      p_device: device,
      p_ip: ip,
      p_handle: handle,
    });
  }

  if (got.kind !== 'found') {
    // Only a true miss is remembered as one. A timeout or a refusal says
    // nothing about the account, and remembering it as a miss would tell the
    // next ten minutes of people that their friend does not exist.
    if (got.kind === 'missing') rememberMiss(handle);
    // A refresh that failed still has yesterday's row, and yesterday's row is a
    // better answer than none. It is cached, and it did cost a call: both true.
    if (cached) return json(req, shapeOut(cached, true, ran), 200, cookieHeader);
    if (got.kind === 'missing') {
      return json(req, { ok: true, found: false, handle, provider: true }, 200, cookieHeader);
    }
    // Not a miss. The client draws nothing, exactly as for a rate limit.
    return json(req, { ok: false, error: 'provider' }, 200, cookieHeader);
  }

  const acct = got.acct;
  misses.delete(handle);

  // The account may answer under a different casing or a redirect; the row is
  // keyed on what Apify actually returned.
  const key = acct.handle || handle;
  const stored = await storeAvatar(key, acct.pic_url);

  const { data: rowRaw } = await supabase.rpc('ig_profile_put', {
    p_handle: key,
    p_display_name: acct.display_name,
    p_is_verified: acct.is_verified,
    p_is_private: acct.is_private,
    p_avatar_ok: stored,
  });
  const row = rowRaw as Profile | null;
  if (!row) return json(req, { ok: false, error: 'provider' }, 200, cookieHeader);

  return json(req, shapeOut(row, false, true), 200, cookieHeader);
});

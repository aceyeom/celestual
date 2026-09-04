// handles.js: the Instagram handle resolver, client side.
//
// Every place in this product where somebody types an @ is a place where a typo
// is silent and permanent. A ping placed at a misspelled handle stands for sixty
// days against nobody, and the product's own anonymity guarantees mean nothing
// can ever tell the person who placed it. So: before they press the button, show
// them the account. A display name, a face, and the badge if the account has one.
//
// ── WHAT THIS IS ALLOWED TO BE ───────────────────────────────────────────────
// A confirmation, and only that. Four rules hold everywhere it is used:
//
//   IT NEVER BLOCKS. Not found is not a refusal. Our provider is imperfect, and
//   a person who knows their friend's handle is right is right. The UI says so
//   once and lets the act through.
//
//   IT NEVER BROWSES. There is no search here, no suggestions, no list. It
//   answers about a handle already typed in full, which is the difference
//   between confirming a name and shopping for one.
//
//   IT SHOWS NO NUMBERS. A display name, a badge, a face. No followers, no
//   posts, no counts. This product does not tell anybody how popular anybody is.
//
//   IT PROVES NOTHING. Spec section 4. Looking a handle up and picking it out is
//   not owning it. Nothing here touches a session, and the only thing that ever
//   sets handle_verified_at is the Instagram DM code flow (api/identity.js).
//
// ── WHERE THE WORK HAPPENS ───────────────────────────────────────────────────
// Nowhere near here. supabase/functions/celestual-resolve holds the Apify token,
// the cache and the caps; this module posts a handle to it and shapes the
// answer. The browser never sees a provider, a key, or an Instagram URL of any
// kind.
//
// ── WHY /api/resolve AND NOT functions.invoke ────────────────────────────────
// The per-device cap counts against a UUID the edge function issues in an
// httpOnly cookie (spec section 5). A cookie set by *.supabase.co on a page
// served from celestual.us is a third party cookie, and Safari's ITP and
// Chrome's phase-out both drop it, which would put the majority of anonymous
// users on the IP counter alone.
//
// So the call goes to /api/resolve on our own origin, which vercel.json rewrites
// onto the function. Same function, same request, first party cookie. Open
// question Q8, answered B. `credentials: 'include'` is what actually carries it.
import { hasSupabase } from './supabase';
import { normHandle } from './celestual';
import { sessionToken } from './identity.js';

// Off by default, like every other integration in .env.example: without the
// edge function deployed the app behaves exactly as it did before this existed.
const RESOLVE_ENABLED = import.meta.env.VITE_HANDLE_RESOLVE === '1';

export const resolveEnabled = RESOLVE_ENABLED && hasSupabase;

// The first party path. Overridable for a preview deployment that is not behind
// the rewrite, at the cost of the cookie going third party there.
const ENDPOINT = import.meta.env.VITE_RESOLVE_ENDPOINT || '/api/resolve';

// ── the four answers ─────────────────────────────────────────────────────────
// Everything downstream branches on `state`, and there are exactly four:
//
//   idle     nothing to say yet (too short, or the resolver is off)
//   found    an account, with a name and maybe a face
//   missing  no account by that name. STILL PLACEABLE.
//   unknown  we could not tell. Off, offline, capped, provider down. Reads the
//            same as idle to the user: silence, never a false negative.
export const IDLE = { state: 'idle', handle: '' };

// How long a field waits after the last keystroke before asking. Every ask
// that misses the cache is an Apify run, and at 300ms the ledger showed five
// runs on the way to one typed name, because `david`, `david_` and `david_j`
// are all somebody. A second is a thumb that has stopped, not one that is
// thinking, and a cache hit still lands inside two.
export const RESOLVE_DEBOUNCE_MS = 1000;

// One entry per handle, for the life of the tab. A handle already answered is
// never asked about twice: it makes backspacing free, and it keeps a person
// walking between screens with the same @ in the field down to one request.
const memo = new Map();
const inflight = new Map();

// When the server says we are over a cap it also says for how long. Held here
// so every field in the app goes quiet together rather than each one
// discovering the limit on its own.
let mutedUntil = 0;

// Seconds until lookups work again, or 0. The UI shows a plain message built
// from this, never a raw error. Spec section 5.
export function rateLimitedFor() {
  const left = Math.ceil((mutedUntil - Date.now()) / 1000);
  return left > 0 ? left : 0;
}

function shape(handle, data) {
  // ok:false covers 'off', 'rate' and 'provider' alike: the resolver could not
  // tell us, which is never the same as "no account by that name".
  if (!data || data.ok === false) return { state: 'unknown', handle };
  if (!data.found) return { state: 'missing', handle };
  return {
    state: 'found',
    handle: data.handle || handle,
    name: data.display_name || '',
    verified: !!data.is_verified,
    // A Supabase Storage URL, ours, and it does not expire. Empty when the
    // account has no picture or the download failed, and the card draws a
    // monogram from the name instead. A missing face never blocks a card.
    avatar: data.avatar || '',
  };
}

// Resolve one handle. Never throws, never blocks: every failure path answers
// 'unknown', which the UI draws as nothing at all.
export async function resolveHandle(raw) {
  const handle = normHandle(raw);
  if (handle.length < 2) return { state: 'idle', handle };
  if (!resolveEnabled) return { state: 'unknown', handle };
  if (memo.has(handle)) return memo.get(handle);
  if (rateLimitedFor() > 0) return { state: 'unknown', handle };
  if (inflight.has(handle)) return inflight.get(handle);

  const call = (async () => {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The cookie the device cap counts against. Without this the request is
        // anonymous to the server every single time.
        credentials: 'include',
        // The session token, so a signed-in person is counted against their own
        // allowance rather than their browser's. Absent for a first visit,
        // which is the ordinary case and costs nothing.
        body: JSON.stringify({ handle, session: sessionToken() }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        const wait = Number(data?.retry_after) || 60;
        mutedUntil = Date.now() + wait * 1000;
        return { state: 'unknown', handle };
      }
      if (!res.ok) return { state: 'unknown', handle };

      const data = await res.json();
      const out = shape(handle, data);
      // An 'unknown' is a transient fact about us, not a fact about the handle,
      // so it is never memoized: the next keystroke gets to try again.
      if (out.state !== 'unknown') memo.set(handle, out);
      return out;
    } catch {
      return { state: 'unknown', handle };
    } finally {
      inflight.delete(handle);
    }
  })();

  inflight.set(handle, call);
  return call;
}

// What we already know, without asking anything. A handle answered earlier in
// this tab is answered instantly, and the caller uses this to skip straight to
// the answer rather than flashing a spinner over a fact it already has.
export function peekHandle(raw) {
  const handle = normHandle(raw);
  return memo.get(handle) || null;
}

// What a person is about to act on, read back to them. Used by the confirm
// steps: 'missing' is the one that changes the copy on the button.
export function isMissing(r) {
  return !!r && r.state === 'missing';
}

// The monogram a card draws when there is no face. One or two letters from the
// display name, or the handle if there is no name. Here rather than in a
// component so every place that draws a card draws the same one.
export function monogram(r) {
  const from = String(r?.name || r?.handle || '').trim();
  if (!from) return '';
  const words = from.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return from.slice(0, 2).toUpperCase();
}

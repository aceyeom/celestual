// handles.js — the Instagram handle resolver, client side.
//
// Every place in this product where somebody types an @ is a place where a typo
// is silent and permanent. A ping placed at a misspelled handle stands for sixty
// days against nobody, and the product's own anonymity guarantees mean nothing
// can ever tell the person who placed it. So: before they press the button, show
// them the account. A display name, a face, and the badge if the account has one.
//
// ── WHAT THIS IS ALLOWED TO BE ───────────────────────────────────────────────
// A confirmation, and only that. Three rules hold everywhere it is used:
//
//   IT NEVER BLOCKS. Not found is not a refusal. The providers are imperfect,
//   Instagram refuses datacenter IPs, and a person who knows their friend's
//   handle is right is right. The UI says so once and lets the act through.
//
//   IT NEVER BROWSES. There is no search here, no suggestions, no list. It
//   answers about a handle already typed in full, which is the difference
//   between confirming a name and shopping for one. (The separate typeahead in
//   celestual.js is its own opt-in flag and is untouched by this.)
//
//   IT SHOWS NO NUMBERS. A display name, a badge, a face, whether the account
//   is private. No followers, no posts, no counts. This product does not tell
//   anybody how popular anybody is.
//
// ── WHERE THE WORK HAPPENS ───────────────────────────────────────────────────
// Nowhere near here. supabase/functions/celestual-resolve holds the provider
// keys, the cache and the caps; this module posts a handle to it and shapes the
// answer. The browser never sees a provider, a key, or an Instagram CDN URL.
import { supabase, hasSupabase } from './supabase';
import { normHandle } from './celestual';

// Off by default, like every other integration in .env.example: without the
// edge function deployed the app behaves exactly as it did before this existed.
const RESOLVE_ENABLED = import.meta.env.VITE_HANDLE_RESOLVE === '1';

export const resolveEnabled = RESOLVE_ENABLED && hasSupabase;

const FN = 'celestual-resolve';

// ── the device id ────────────────────────────────────────────────────────────
// A random opaque string this browser mints for itself, so the per-device cap
// has something to count. It is NOT identity: not derived from anything about
// the person, never sent anywhere but the resolver, not joined to a handle, an
// account or a ping, and gone the moment somebody clears their storage. It
// exists so thirty lookups a day is a number that means something.
const DEVICE = 'celestual:device';

export function deviceId() {
  try {
    const saved = localStorage.getItem(DEVICE);
    if (saved) return saved;
    const made = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 64);
    localStorage.setItem(DEVICE, made);
    return made;
  } catch {
    return null; // private mode: the IP net still holds, and the cap just misses
  }
}

// ── the four answers ─────────────────────────────────────────────────────────
// Everything downstream branches on `state`, and there are exactly four:
//
//   idle     nothing to say yet (too short, or the resolver is off)
//   looking  asked, waiting
//   found    an account, with a name and maybe a face
//   missing  no account by that name. STILL PLACEABLE.
//   unknown  we could not tell. Off, offline, capped, provider down. Reads the
//            same as idle to the user: silence, never a false negative.
export const IDLE = { state: 'idle', handle: '' };

// One entry per handle, for the life of the tab. A handle already answered is
// never asked about twice: it makes backspacing free, and it keeps a person
// walking between screens with the same @ in the field down to one request.
const memo = new Map();
const inflight = new Map();

function shape(handle, data) {
  if (!data || data.ok === false) return { state: 'unknown', handle };
  if (!data.found) return { state: 'missing', handle };
  return {
    state: 'found',
    handle: data.handle || handle,
    name: data.display_name || '',
    verified: !!data.is_verified,
    private: !!data.is_private,
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
  if (inflight.has(handle)) return inflight.get(handle);

  const call = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke(FN, {
        body: { handle, device: deviceId() },
      });
      const out = error ? { state: 'unknown', handle } : shape(handle, data);
      // A 'unknown' is a transient fact about us, not a fact about the handle,
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

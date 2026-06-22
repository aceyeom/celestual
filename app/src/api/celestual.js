// CELESTUAL — the calls the whole product makes.
//
// submitEntry records a one-way "I still think about @them". Per the deferred-
// reveal safety model (docs/SECURITY.md §2.3) the server NEVER tells the
// caller whether it's mutual — it returns only { recorded: true }. The "yes" is
// delivered solely through the owner-controlled channel (the match email to the
// earlier entrant). This closes the live prober oracle. All matching/anonymity
// logic lives in the `celestual_submit` SECURITY DEFINER RPC (see
// supabase/migrations/0001_celestual.sql).
import { supabase, hasSupabase } from './supabase';

// Mirror of the server-side celestual_norm(): lowercase, drop a leading @, keep only
// IG-legal characters. Used purely for client-side validation + display.
export function normHandle(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '');
}

export function isValidHandle(h) {
  const n = normHandle(h);
  return n.length >= 1 && n.length <= 30;
}

// A "full budget" snapshot, used as the safe fallback when there's no backend.
export const FULL_SLOTS = { remaining: 3, cap: 3, next_at: null };
// Demo is sandboxed — it never touches the real backend — so it runs on a roomy
// local budget and treats @demo as the one guaranteed mutual.
const DEMO_SLOTS = { remaining: 3, cap: 3, next_at: null };

// Record a one-way entry. Returns:
//   { recorded:true, mutual:boolean, match:handle|null, slots:{remaining,cap,next_at} }
//   { recorded:false, error:'rate_limited'|'suppressed'|'no_slots'|'unverified', slots? }
// `proof` is the Instagram-DM ownership secret (api/igverify.js); the server only
// requires it once verification enforcement is turned on. `demo` short-circuits to
// a local simulation so /demo never writes real entries.
export async function submitEntry({ me, ex, email, proof, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 600));
    const mutual = normHandle(ex) === 'demo';
    return { recorded: true, mutual, match: mutual ? normHandle(ex) : null, slots: DEMO_SLOTS, demo: true };
  }

  const { data, error } = await supabase.rpc('celestual_submit', {
    p_from: me,
    p_to: ex,
    p_email: email ? email.trim() : null,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data;
}

// Which of `handles` (the @s I've entered) are now mutual — powers the in-app
// constellations view (group-aware on the server). Read-only; never reveals more
// than the instant reveal already does.
export async function checkMutuals({ me, handles, demo }) {
  const list = (handles || []).map(normHandle).filter(Boolean);
  if (demo || !hasSupabase) return list.filter((h) => h === 'demo');
  if (!list.length || !normHandle(me)) return [];
  try {
    const { data, error } = await supabase.rpc('celestual_check_many', { p_from: me, p_to: list });
    if (error) return [];
    return Array.isArray(data?.mutual) ? data.mutual : [];
  } catch {
    return [];
  }
}

// Link up to 3 of your own @s into one identity group, so being entered on ANY of
// them counts as you. No-op for a single handle (nothing to group). Best-effort:
// failures degrade to "just my handles" without throwing into the UI.
export async function linkHandles(handles, { demo } = {}) {
  const list = [...new Set((handles || []).map(normHandle).filter(Boolean))].slice(0, 3);
  if (demo || !hasSupabase || list.length < 2) return { group: list };
  try {
    const { data, error } = await supabase.rpc('celestual_link', { p_handles: list });
    if (error || !data) return { group: list };
    return data; // { group: [handle, ...] }
  } catch {
    return { group: list };
  }
}

// Opt in to an email nudge when this handle's next slot regenerates. Timing is
// computed server-side; the client only supplies where to send it.
export async function requestReminder({ me, email, demo }) {
  if (demo || !hasSupabase || !normHandle(me) || !email) return { ok: false };
  try {
    const { data, error } = await supabase.rpc('celestual_request_reminder', { p_handle: me, p_email: email.trim() });
    if (error) return { ok: false };
    return data || { ok: true };
  } catch {
    return { ok: false };
  }
}

// The live slot snapshot for a handle (for display). The server is the authority
// at seal time; this just feeds the meter + the out-of-slots countdown.
export async function fetchSlots(me, { demo } = {}) {
  if (demo || !hasSupabase || !normHandle(me)) return FULL_SLOTS;
  try {
    const { data, error } = await supabase.rpc('celestual_slots_for', { p_handle: me });
    if (error || !data) return FULL_SLOTS;
    return data; // { remaining, cap, next_at }
  } catch {
    return FULL_SLOTS;
  }
}

// Un-send a one-way entry you made (§4.6). Withdrawing removes the star and tears
// down any pending match, but NEVER refunds the slot it cost (anti-fishing).
export async function withdrawEntry({ me, ex, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { withdrawn: true };
  }
  const { data, error } = await supabase.rpc('celestual_withdraw', { p_from: me, p_to: ex });
  if (error) throw error;
  return data; // { withdrawn: boolean }
}

// ── @ SEARCH (Instagram-style typeahead) ──────────────────────────────────
// Pluggable adapter. The client can NEVER hold a scraper key, and suggesting
// from our own entered handles would leak who's been entered (privacy model) —
// so by default this returns nothing and manual entry + validation carries the
// flow. When a server-side provider is wired up (a Supabase Edge Function that
// proxies a vetted Instagram search source), set VITE_HANDLE_SEARCH=1 and this
// calls it. Swapping providers later is a change to that one edge function, not
// to the app. See supabase/functions/celestual-search/.
const SEARCH_ENABLED = import.meta.env.VITE_HANDLE_SEARCH === '1'

export async function searchHandles(query) {
  const q = normHandle(query)
  if (q.length < 2) return []
  if (!SEARCH_ENABLED || !hasSupabase) return [] // manual entry only until a provider is live
  try {
    const { data, error } = await supabase.functions.invoke('celestual-search', { body: { q } })
    if (error) return []
    // Expected shape: [{ handle, full_name, avatar, verified }]
    return Array.isArray(data?.results) ? data.results.slice(0, 8) : []
  } catch {
    return []
  }
}

// Public erasure / "never let me be entered" for a handle (§2.5).
export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle), erased: 0 };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string, erased: number }
}

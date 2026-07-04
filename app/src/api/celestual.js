// CELESTUAL — the calls the whole product makes.
//
// The mechanism (docs/ULTIMATE-PRODUCT-FRAMEWORK.md §2): placePing records a
// one-way ping at @them. It resolves ONLY if they independently ping you back —
// then both of you learn at the same instant. Three standing pings max; each
// stands sixty days unless renewed; retiring one frees the slot. The server
// stores WHO a ping points at only as a salted hash (privacy: even a database
// dump can't read the map of longing) — which is why the status page sends the
// device-held plaintext list up per read instead of ever asking the server to
// remember it.
//
// All matching/anonymity logic lives in SECURITY DEFINER RPCs (RLS on, zero
// client read policies; see supabase/migrations/0006_ping_model.sql).
import { supabase, hasSupabase } from './supabase';

// Mirror of the server-side celestual_norm(): lowercase, drop a leading @, keep
// only IG-legal characters. Client-side validation + display only.
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

export const SLOT_CAP = 3;
export const PING_DAYS = 60;

// A "full slots" snapshot — the safe fallback when there's no backend.
export const FULL_SLOTS = { standing: 0, cap: SLOT_CAP };

const iso = (ms) => new Date(ms).toISOString();

// Place a ping. Returns:
//   { recorded:true, mutual, match, match_intent, reachable, expires_at,
//     slots:{standing,cap} }
//   { recorded:false, error:'rate_limited'|'suppressed'|'no_slots'|'unverified' }
// `proof` is the Instagram-DM ownership secret (api/igverify.js); `intent` is an
// optional intent-line id, sealed until mutual. `demo` short-circuits to a local
// simulation so /demo never writes real data — @demo is the guaranteed mutual.
export async function placePing({ me, them, email, proof, intent, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 600));
    const mutual = normHandle(them) === 'demo';
    return {
      recorded: true,
      mutual,
      match: mutual ? normHandle(them) : null,
      match_intent: mutual ? 'unsaid' : null,
      // in the sandbox, roughly half the world is "already here"
      reachable: mutual || normHandle(them).length % 2 === 0,
      expires_at: iso(Date.now() + PING_DAYS * 864e5),
      slots: FULL_SLOTS,
      demo: true,
    };
  }
  const { data, error } = await supabase.rpc('celestual_submit', {
    p_from: me,
    p_to: them,
    p_email: email ? email.trim() : null,
    p_proof: proof || null,
    p_intent: intent || null,
  });
  if (error) throw error;
  return data;
}

// The status page read (Screen 4). Sends the device-held plaintext list up and
// gets each ping's live state back — the server can't produce the list itself
// (it only stores hashes). Owner-gated by the same DM proof as placing.
// Returns: [{ handle, placed, time, expires_at, mutual, intent, reachable }]
export async function pingStatus({ me, handles, proof, demo }) {
  const list = (handles || []).map(normHandle).filter(Boolean).slice(0, 10);
  if (demo || !hasSupabase || !list.length || !normHandle(me)) return [];
  try {
    const { data, error } = await supabase.rpc('celestual_ping_status', {
      p_from: me,
      p_to: list,
      p_proof: proof || null,
    });
    if (error || !data?.ok || !Array.isArray(data.pings)) return [];
    return data.pings;
  } catch {
    return [];
  }
}

// Cross-device restore for the proven owner. Only MUTUAL pings come back with a
// name — unmatched targets exist server-side only as hashes, so they return as
// anonymous standing rows. The placing device keeps the plaintext locally.
// Returns: [{ handle|null, time, expires_at, mutual, intent }]
export async function fetchMyPings({ handle, proof, demo } = {}) {
  if (demo || !hasSupabase || !normHandle(handle) || !proof) return [];
  try {
    const { data, error } = await supabase.rpc('celestual_my_pings', { p_handle: handle, p_proof: proof });
    if (error || !data?.ok || !Array.isArray(data.pings)) return [];
    return data.pings.map((p) => ({
      handle: p.handle ? normHandle(p.handle) : null,
      time: Number(p.time) || Date.now(),
      expires_at: p.expires_at || null,
      mutual: !!p.mutual,
      intent: p.intent || null,
    }));
  } catch {
    return [];
  }
}

// One tap keeps a ping standing another sixty days. Free, unlimited.
export async function renewPing({ me, them, proof, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, expires_at: iso(Date.now() + PING_DAYS * 864e5) };
  }
  const { data, error } = await supabase.rpc('celestual_renew', {
    p_from: me,
    p_to: them,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data;
}

// "Let it go" — retire a ping. This frees the slot; nothing was ever revealed.
export async function retirePing({ me, them, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { withdrawn: true };
  }
  const { data, error } = await supabase.rpc('celestual_withdraw', { p_from: me, p_to: them });
  if (error) throw error;
  return data;
}

// The live slot snapshot for the owner's meter (server is the authority at
// placement; this just feeds the display).
export async function fetchSlots(me, { proof, demo } = {}) {
  if (demo || !hasSupabase || !normHandle(me)) return FULL_SLOTS;
  try {
    const { data, error } = await supabase.rpc('celestual_slots_for', { p_handle: me, p_proof: proof || null });
    if (error || !data) return FULL_SLOTS;
    return data; // { standing, cap }
  } catch {
    return FULL_SLOTS;
  }
}

// Link up to 3 of your own @s into one identity group, so being pinged on ANY
// of them counts as you. Best-effort; failures degrade to single-handle.
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

// ── worlds (community counters — framework §2.5) ──────────────────────────
// Tag the real communities you belong to (school + scenes, three total).
// Counters are floored at 100 SERVER-side: below it they come back null.
export async function setWorlds({ me, names, proof, demo }) {
  const list = (names || []).map((n) => String(n || '').trim()).filter(Boolean).slice(0, 3);
  if (demo || !hasSupabase || !normHandle(me)) return { ok: true, worlds: list.map((n) => ({ slug: n, name: n, count: null })) };
  try {
    const { data, error } = await supabase.rpc('celestual_set_worlds', {
      p_handle: me,
      p_names: list,
      p_proof: proof || null,
    });
    if (error || !data?.ok) return { ok: false, worlds: [] };
    return data;
  } catch {
    return { ok: false, worlds: [] };
  }
}

export async function worldCounts(slugs) {
  const list = (slugs || []).filter(Boolean).slice(0, 6);
  if (!hasSupabase || !list.length) return [];
  try {
    const { data, error } = await supabase.rpc('celestual_world_counts', { p_slugs: list });
    if (error || !Array.isArray(data?.worlds)) return [];
    return data.worlds; // [{ slug, name, count|null }]
  } catch {
    return [];
  }
}

// ── campus windows (assurance contracts — framework §2.3) ─────────────────
export async function fetchCampus(slug) {
  if (!hasSupabase || !slug) return null;
  try {
    const { data, error } = await supabase.rpc('celestual_campus', { p_slug: slug });
    if (error || !data?.ok) return null;
    return data; // { slug, name, threshold, count, status, opened_at, week_pings, week_matches }
  } catch {
    return null;
  }
}

// "Count me in" — preregistration IS the full signup (verified handle).
export async function preregisterCampus({ slug, me, email, proof, demo }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, demo: true };
  }
  const { data, error } = await supabase.rpc('celestual_campus_preregister', {
    p_slug: slug,
    p_handle: me,
    p_email: email ? email.trim() : null,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data; // { ok, count, threshold, status } | { ok:false, error }
}

// ── @ SEARCH (typeahead adapter — server-side provider optional) ──────────
const SEARCH_ENABLED = import.meta.env.VITE_HANDLE_SEARCH === '1'

export async function searchHandles(query) {
  const q = normHandle(query)
  if (q.length < 2) return []
  if (!SEARCH_ENABLED || !hasSupabase) return [] // manual entry only until a provider is live
  try {
    const { data, error } = await supabase.functions.invoke('celestual-search', { body: { q } })
    if (error) return []
    return Array.isArray(data?.results) ? data.results.slice(0, 8) : []
  } catch {
    return []
  }
}

// Public opt-out: verify-and-vanish for any handle owner, user or not (§2.5).
// Blocks the handle from ever being pinged and erases everything referencing it.
export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle), erased: 0 };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string, erased: number }
}

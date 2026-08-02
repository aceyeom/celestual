// CELESTUAL — the calls the whole product makes.
//
// The mechanism (docs/ULTIMATE-PRODUCT-FRAMEWORK.md §2): placePing records a
// one-way ping at @them. It resolves ONLY if they independently ping you back —
// then both of you learn at the same instant. Two standing pings max free;
// each stands sixty days unless renewed; retiring one frees the slot. A third
// (and each one after) is a one-time sandbox-only add, and a sandbox-only
// subscription raises the cap to ten and stands each of those pings six months
// instead of sixty days (screens.jsx's SlotPaywall previews the checkout;
// production has no gate but the free two). Matching and suppression still run
// on salted hashes, but since migration 0010 the server also keeps the
// normalised target so the owner's pings restore BY NAME on any device they
// verify on (the old device-locked restore read as a bug and was retired).
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

export const SLOT_CAP = 2;
export const PING_DAYS = 60;

// The sandbox-only $12.99/mo subscription tier (App.jsx's demoSubscribed):
// ten standing pings, each held six months instead of sixty days.
export const SUB_SLOT_CAP = 10;
export const SUB_PING_DAYS = 180;

// A "full slots" snapshot — the safe fallback when there's no backend.
export const FULL_SLOTS = { standing: 0, cap: SLOT_CAP };

const iso = (ms) => new Date(ms).toISOString();

// Place a ping. Returns:
//   { recorded:true, mutual, match, match_card, reachable, expires_at,
//     slots:{standing,cap} }
//   { recorded:false, error:'rate_limited'|'suppressed'|'no_slots'|'unverified' }
// `proof` is the Instagram-DM ownership secret (api/igverify.js); `card` is the
// poster this ping carries (card/model.js toWire — the words, the ground, the
// face, where the block sits, the tone), sealed server-side until both sides
// exist. `demo` short-circuits to a local simulation so /demo never writes real
// data — @demo is the guaranteed mutual. `days` overrides the standing period
// (demo-only — App.jsx passes SUB_PING_DAYS while the sandbox subscription is
// active; production duration is server-set).
//
// `match_card` is the ONLY way another person's words ever reach this browser,
// and it is only ever populated when the pair is already mutual (migration
// 0022's celestual_counterpart_card). There is no read that returns a card
// belonging to a ping that has not been answered.
export async function placePing({ me, them, email, proof, card, demo, days }) {
  if (demo || !hasSupabase) {
    await new Promise((r) => setTimeout(r, 600));
    const mutual = normHandle(them) === 'demo';
    return {
      recorded: true,
      mutual,
      match: mutual ? normHandle(them) : null,
      match_card: mutual ? DEMO_CARD : null,
      // in the sandbox, roughly half the world is "already here"
      reachable: mutual || normHandle(them).length % 2 === 0,
      expires_at: iso(Date.now() + (days || PING_DAYS) * 864e5),
      slots: FULL_SLOTS,
      demo: true,
    };
  }
  const { data, error } = await supabase.rpc('celestual_submit', {
    p_from: me,
    p_to: them,
    p_email: email ? email.trim() : null,
    p_proof: proof || null,
    p_card: card || null,
  });
  if (error) throw error;
  return data;
}

// The other half, in the sandbox. One card, in the register the composer's own
// seeds teach: plain, specific, about a detail nobody would invent.
export const DEMO_CARD = {
  words: 'i thought about messaging you a hundred times',
  bg: 'rose',
  face: 'serif',
  x: 0.2,
  y: 0.4,
  tone: 0,
};

// The status page read (Screen 4). Sends the device-held plaintext list up and
// gets each ping's live state back — the server can't produce the list itself
// (it only stores hashes). Owner-gated by the same DM proof as placing.
// Returns: [{ handle, placed, time, expires_at, mutual, card, reachable }]
// `card` is THEIRS, and it is null on every row that is not already mutual.
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

// Cross-device restore for the proven owner. Every live ping comes back NAMED
// (migration 0010 stores the normalised target alongside its hash for exactly
// this read) — matched or standing, any device, gated by the DM proof. Only
// rows placed before 0010 can still arrive as anonymous standing rows (their
// plaintext cannot be recovered from a hash).
// Returns: [{ handle|null, time, expires_at, mutual, card, theirCard }]
// `card` is the poster this device placed (restored so a card survives a lost
// browser, minus its photograph, which never left the phone that took it);
// `theirCard` is the other half, and only ever arrives on a matched row.
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
      card: p.card || null,
      theirCard: p.their_card || null,
    }));
  } catch {
    return [];
  }
}

// One tap keeps a ping standing another sixty days. Free, unlimited — this
// function never changes. Production calls it straight from the status page;
// the sandbox previews a $2.99 checkout in front of it first (screens.jsx's
// SlotPaywall, extend mode), then calls this exact same thing on success.
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

// ── CAMPUS: the client half of a server feature nothing currently calls ───────
// These two mirror live RPCs (celestual_campus, celestual_campus_preregister)
// and the server side is fully built and still RUNNING: the celestual_campuses /
// celestual_campus_prereg / celestual_campus_mail tables exist, and the
// celestual-remind cron drains that mail queue every hour. But no screen imports
// either function, so the feature has no way in.
//
// They are kept deliberately, and labelled, rather than deleted: cutting them
// would leave an hourly cron draining a queue nothing can fill, with no trace in
// the client of why those tables exist. Either finish the campus entry point or
// retire the whole feature (tables, RPCs and the remind job together) — that is
// a product decision, not a cleanup.

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

// ── the two different doors (migration 0020) ─────────────────────────────────
// These used to be one call, and conflating them locked people out of their own
// accounts for tidying up. Keep them apart:
//
//   eraseAccount  — "take my data off your servers." Erases everything, closes
//                   nothing. You can verify again tomorrow. This is what the
//                   account screen's "delete everything" calls.
//   suppressHandle — "nobody may ever enter my @." The real opt-out, for any
//                   handle owner whether or not they use celestual. Permanent
//                   by intent (we lift it by hand on request), and it does NOT
//                   stop the owner signing up — being un-pingable and being
//                   unwelcome are different facts.

// Erase everything about a handle and leave every door open.
export async function eraseAccount(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { erased: 0, handle: normHandle(handle) }
  }
  const { data, error } = await supabase.rpc('celestual_erase_account', { p_handle: handle });
  if (error) throw error;
  return data; // { erased: number, handle: string }
}

// Public opt-out: verify-and-vanish for any handle owner, user or not (§2.5).
// Blocks the handle from ever being PINGED and erases everything referencing it.
export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle), erased: 0 };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string, erased: number }
}

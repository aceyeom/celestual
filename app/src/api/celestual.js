// CELESTUAL — the ping calls Main makes.
//
// The mechanism: placePing records a one-way ping at @them. It resolves ONLY
// if they independently ping you back, and then both of you learn at the same
// instant. Two standing pings; each stands sixty days unless renewed; letting
// one go frees the slot. Matching and suppression run on salted hashes, and
// since migration 0010 the server also keeps the normalised target so the
// owner's pings restore BY NAME on any device they verify on.
//
// All matching and anonymity logic lives in SECURITY DEFINER RPCs (RLS on,
// zero client read policies; see supabase/migrations). This file used to carry
// the retired design's calls as well (the status page read, the card
// photograph, the slot meter, the handle group, the typeahead); they went with
// it on 4 September. `eraseAccount` stays because the RPC is live and the
// product owes a person a way to use it, even though no screen offers it yet.
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

export const SLOT_CAP = 2;
export const PING_DAYS = 60;

const iso = (ms) => new Date(ms).toISOString();

// Place a ping. Returns the RPC's own shape:
//   { recorded:true, mutual, match, match_card, reachable, expires_at, slots }
//   { recorded:false, error:'rate_limited'|'suppressed'|'no_slots'|'unverified' }
// `proof` is the Instagram DM ownership secret (api/igverify.js); `card` is the
// line the ping carries, sealed server-side until both sides exist.
//
// With no backend configured it answers locally so the flow stays walkable.
export async function placePing({ me, them, email, proof, card }) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      recorded: true,
      mutual: false,
      match: null,
      match_card: null,
      reachable: normHandle(them).length % 2 === 0,
      expires_at: iso(Date.now() + PING_DAYS * 864e5),
      slots: { standing: 0, cap: SLOT_CAP },
      local: true,
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

// Cross-device restore for the proven owner. Every live ping comes back NAMED
// (migration 0010), matched or standing, gated by the DM proof.
//
// Returns { ok:true, pings:[{ handle, time, expires_at, mutual, card, theirCard }] },
// or { ok:false, error } where error is 'unverified' (the RPC refused the
// proof: it has lapsed, or it is not this handle's) or 'network'. It used to
// answer a bare [] for all of those, which left every caller drawing an empty
// sky over a full one. `theirCard` only ever arrives on a matched row.
export async function fetchMyPings({ handle, proof } = {}) {
  if (!hasSupabase) return { ok: true, pings: [] };
  if (!normHandle(handle) || !proof) return { ok: false, error: 'unverified', pings: [] };
  try {
    const { data, error } = await supabase.rpc('celestual_my_pings', { p_handle: handle, p_proof: proof });
    if (error) return { ok: false, error: 'network', pings: [] };
    if (!data?.ok || !Array.isArray(data.pings)) return { ok: false, error: 'unverified', pings: [] };
    return {
      ok: true,
      pings: data.pings.map((p) => ({
        handle: p.handle ? normHandle(p.handle) : null,
        time: Number(p.time) || Date.now(),
        expires_at: p.expires_at || null,
        mutual: !!p.mutual,
        card: p.card || null,
        theirCard: p.their_card || null,
      })),
    };
  } catch {
    return { ok: false, error: 'network', pings: [] };
  }
}

// One tap keeps a ping standing another sixty days. Free, unlimited. Answers
// { ok, expires_at }; `ok` is the row count, and a ping that just went mutual
// or was let go elsewhere answers ok:false.
export async function renewPing({ me, them, proof }) {
  if (!hasSupabase) {
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
// Owner-gated by the DM proof since 0036, and since 0038 the other side of a
// mutual goes back to standing rather than staying matched to nobody.
export async function retirePing({ me, them, proof }) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { withdrawn: true };
  }
  const { data, error } = await supabase.rpc('celestual_withdraw', {
    p_from: me,
    p_to: them,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data;
}

// ── the two different doors (migration 0020) ─────────────────────────────────
//   eraseAccount   "take my data off your servers." Erases everything, closes
//                  nothing. You can verify again tomorrow. Owner-gated by the
//                  DM proof (0036); since 0038 it takes the identity row, its
//                  sessions and its letters with it.
//   suppressHandle "nobody may ever enter my @." The real opt-out, for any
//                  handle owner whether or not they use celestual. Permanent
//                  by intent, lifted by hand on request, and it needs no proof.
export async function eraseAccount(handle, proof) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { erased: 0, handle: normHandle(handle) };
  }
  const { data, error } = await supabase.rpc('celestual_erase_account', {
    p_handle: handle,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data; // { erased: number, handle: string } or { erased:0, error }
}

export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle) };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string } or { suppressed:null, error:'rate_limited' }
}

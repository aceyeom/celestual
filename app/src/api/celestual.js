// CELESTUAL — the ping calls Main makes.
//
// The mechanism: placePing records a one-way ping at @them. It resolves ONLY
// if they independently ping you back, and then both of you learn at the same
// moment: the weekly reveal, Saturday at nine at night in California (0069).
// One free ping for every reveal, and more bought (0071); each runs to its
// week's reveal and can be kept for the next, which spends that week's;
// letting one go gives its ping back. Matching and suppression run on salted hashes, and
// since migration 0010 the server also keeps the normalised target so the
// owner's pings restore BY NAME on any device they verify on. Since 0072 a
// mutual is kept on both lists as it was told, so a person can write to
// somebody they are mutual with again (placePingAgain) and take a mutual off
// their own list (forgetMutualPing), and the other person is told nothing
// either way.
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
// A week: a note runs to its week's reveal (0069). What stands in for the
// server's end when there is no backend is a week out, near enough.
export const PING_DAYS = 7;

const iso = (ms) => new Date(ms).toISOString();

// Place a ping. Returns the RPC's own shape:
//   { recorded:true, mutual, match, match_card, reachable, expires_at, slots }
//   { recorded:false, error:'rate_limited'|'suppressed'|'no_pings'|'week_full'|'unverified', allowance }
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
      reachable: false,
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
// sky over a full one. `theirCard` only ever arrives on a matched row. Since
// 0072 one handle can come back twice, a mutual and a new note to the same
// person, and never two mutuals from one @ to one person.
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
        // since 0069: a note that lapsed at a reveal, listed for a week after
        // it, and the night a mutual was told
        lapsed: !!p.lapsed,
        revealed_at: p.revealed_at || null,
        card: p.card || null,
        theirCard: p.their_card || null,
        // The resolver's answer for the handle, when it has one (0042), so
        // the row draws its face with no second request. The path, not a
        // URL: main/data.js turns it into one and teaches the memo.
        profile: p.known
          ? { name: String(p.display_name || ''), verified: !!p.is_verified, avatarPath: String(p.avatar_path || '') }
          : null,
      })),
      // since 0071: this week's pings, the free one and the ones bought
      // (docs/PINGS-BY-THE-WEEK.md), for the list's foot to say
      allowance: data.allowance || null,
    };
  } catch {
    return { ok: false, error: 'network', pings: [] };
  }
}

// This week's pings (0071, docs/PINGS-BY-THE-WEEK.md): the free one, the
// ones bought, and how many are spent on the reveal a note sent now would run
// to, and on the one after it. Proof gated, like the list. Answers
// { ok, allowance } or { ok:false, allowance } with nobody's numbers in it.
export async function fetchAllowance({ handle, proof } = {}) {
  if (!hasSupabase) return { ok: false, allowance: null };
  if (!normHandle(handle) || !proof) return { ok: false, allowance: null };
  try {
    const { data, error } = await supabase.rpc('celestual_ping_allowance', { p_handle: handle, p_proof: proof });
    if (error || !data) return { ok: false, error: 'network', allowance: null };
    return { ok: !!data.ok, allowance: data.allowance || null };
  } catch {
    return { ok: false, error: 'network', allowance: null };
  }
}

// One tap keeps a note for the week after its own, once ahead (0069). It
// spends a ping for that week (0071), and answers 'no_pings' with this
// week's allowance when there is none to spend.
// Answers { ok, expires_at }, or { ok:false, error } where 'lapsed' is a
// note whose reveal has passed (it is sent again instead, placePing) and
// 'none' is one that went mutual or was let go elsewhere.
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
// Owner-gated by the DM proof since 0036. Since 0069 a mutual is not let go
// at all: it has been told to both at its reveal, and the answer is
// { withdrawn:false, error:'mutual' }, with nothing changed. A new note to
// somebody this person is already mutual with (0072) is let go like any
// other, and the mutual stays.
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

// Write again to somebody this person is mutual with (0072). The mutual they
// have is kept, on both lists, exactly as it was told, and a new note goes
// out: sealed, on a ping of its own, and told at a Saturday reveal only if
// they write a new one too. Nothing about it reaches them before that. It
// answers exactly what placePing answers, and a refusal (no pings, the words,
// the hourly limits) keeps nothing, so the pair is as it was. Always proof
// gated. `card` null is a new note with no words.
//
// With no backend configured it answers as placePing does, locally.
export async function placePingAgain({ me, them, email, proof, card }) {
  if (!hasSupabase) return placePing({ me, them, email, proof, card });
  const { data, error } = await supabase.rpc('celestual_mutual_again', {
    p_from: me,
    p_to: them,
    p_proof: proof || null,
    p_card: card || null,
    p_email: email ? email.trim() : null,
  });
  if (error) throw error;
  return data;
}

// Take a mutual off this person's own list, for good (0072). The other
// person keeps theirs, exactly as it was, and is told nothing; the news of it
// still on its way to this person does not go; and a note to them afterwards
// is a new note. Answers { ok:true }, or { ok:false, error } where
// 'unverified' is a proof the server refused and 'none' is no mutual there to
// take off.
export async function forgetMutualPing({ me, them, proof }) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true };
  }
  const { data, error } = await supabase.rpc('celestual_mutual_forget', {
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
//                  by intent, lifted by hand on request, and since 0039 it
//                  needs the same one DM proof placing a ping needs.
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

// Since 0039 it asks for the DM proof too: one DM proves the handle to
// anybody who holds the account, user or not, and without it nothing is read.
export async function suppressHandle(handle, proof) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle) };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', {
    p_handle: handle,
    p_proof: proof || null,
  });
  if (error) throw error;
  return data; // { suppressed: string } or { suppressed:null, error:'rate_limited'|'unverified' }
}

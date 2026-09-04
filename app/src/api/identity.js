// identity.js: one person, one session, both surfaces.
//
// Spec section 3. The wall and Main are not two products with two sign-ins;
// they are one person who may arrive through either door. Whichever door it is,
// the browser ends up holding one token, and that token resolves to one row.
//
// ── what the token is ───────────────────────────────────────────────────────
// A random 32-byte value the browser mints for itself. Only its SHA-256 ever
// reaches the server, which is the same trust model the DM flow's `proof`
// already uses: a reader of the database cannot become anybody, and the server
// never has to be trusted with the secret it checks.
//
// It lives in localStorage because it has to outlive the tab. Clearing site
// data signs you out, which is correct and is the only way to sign out from a
// device you no longer have.
//
// ── what proves what ────────────────────────────────────────────────────────
// The token is not a credential on its own. It is a name for a row. What put
// the row there is either:
//
//   the DM code flow   proves the @. bindHandle() carries the proof.
//   the .edu code      proves the campus. The edge function binds it, because
//                      that address is taken on trust and only the server side
//                      of the gate is entitled to hand one over.
//
// Searching for a handle and picking it out of a list proves nothing and
// reaches nothing here. Spec section 4.
import { supabase, hasSupabase } from './supabase.js'

const KEY = 'celestual.session.v1'

// The null identity. Every consumer can render against this shape without
// checking for undefined first, which is why it is a constant and not a null.
export const ANON = Object.freeze({
  signedIn: false,
  id: null,
  handle: null,
  handleVerified: false,
  email: null,
  eduVerified: false,
  campus: null,
})

// 32 bytes of crypto randomness as hex. Not a UUID: a UUID is 122 bits with a
// documented layout, and this wants to be an opaque secret rather than an
// identifier anybody parses.
function mint() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

// Read the token, minting one the first time. Storage can throw in a locked
// down browser, so a failure degrades to a token that lives as long as the tab
// rather than to no session at all.
let memory = null
export function sessionToken() {
  if (memory) return memory
  try {
    const held = localStorage.getItem(KEY)
    if (held && held.length >= 32) {
      memory = held
      return memory
    }
  } catch {
    // Private mode, or site data blocked. Fall through and keep it in memory.
  }
  memory = mint()
  try {
    localStorage.setItem(KEY, memory)
  } catch {
    // The session is now tab-lifetime. Nothing else changes.
  }
  return memory
}

// Forget this device's session. The row and everything in it stays; what goes
// is this browser's claim on it.
export function forgetSession() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing held it in the first place.
  }
}

// The server's shape, flattened into the one this app reads. Kept in one place
// so a change to celestual_user_public is a change to one function.
function shape(user) {
  if (!user) return ANON
  return {
    signedIn: true,
    id: user.id ?? null,
    handle: user.handle ?? null,
    handleVerified: !!user.handle_verified,
    email: user.email ?? null,
    eduVerified: !!user.edu_verified,
    campus: user.campus ?? null,
  }
}

// PostgREST answers a call to a function it does not have with PGRST202 and a
// message naming it. Nothing else reads as "the schema is behind the client".
function missingRpc(error) {
  return error?.code === 'PGRST202' || /could not find the function/i.test(String(error?.message || ''))
}

// Who is this browser. Never throws: not being signed in is the ordinary state
// of a first visit, and a network failure reads the same as not being signed in
// because there is nothing else the caller could usefully do about it.
export async function whoami() {
  const u = await whoamiStrict()
  return u || ANON
}

// The same question, keeping two answers apart that whoami folds together: the
// server said "nobody" (ANON) and nothing answered at all (null). The wall's
// gate wants the difference, because a session that has actually ended should
// stop being drawn as signed in, and a flaky connection should not.
export async function whoamiStrict() {
  if (!hasSupabase) return ANON
  try {
    const { data, error } = await supabase.rpc('celestual_whoami', { p_token: sessionToken() })
    if (error || !data?.ok) return null
    if (!data.signed_in) return ANON
    return shape(data.user)
  } catch {
    return null
  }
}

// The DM code flow just finished. Turn its proof into an identity.
//
// Returns { ok, user } or { ok: false, error }. The errors that matter to a
// screen are 'unverified' (the proof is not live for that @) and the two
// conflict codes the merge rule raises, which mean the person has to be told
// rather than retried at.
//
// One failure is named apart from the rest: the RPC not existing. That is what
// a database without 0030 applied looks like, and it is what production looks
// like until the runbook's section 2b is done. The DM proof is real either way
// (it lives in the 0004 layer), so a caller that hears 'no_identity_layer' can
// keep the proof and carry on without the row.
export async function bindHandle({ handle, proof }) {
  if (!hasSupabase) return { ok: false, error: 'offline' }
  try {
    const { data, error } = await supabase.rpc('celestual_user_bind_handle', {
      p_token: sessionToken(),
      p_handle: handle,
      p_proof: proof,
    })
    if (error) return { ok: false, error: missingRpc(error) ? 'no_identity_layer' : 'network' }
    if (!data?.ok) return { ok: false, error: data?.error || 'failed' }
    return { ok: true, user: shape(data.user) }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// Attach a plain address to this row, or clear it by passing null.
//
// Q5: this never merges anything and never looks anybody up by address. An
// email nobody checked is a way to reach a person, not a way to become one.
export async function setEmail(email) {
  if (!hasSupabase) return { ok: false, error: 'offline' }
  try {
    const { data, error } = await supabase.rpc('celestual_user_set_email', {
      p_token: sessionToken(),
      p_email: email == null ? null : String(email).trim().toLowerCase(),
    })
    if (error) return { ok: false, error: 'network' }
    if (!data?.ok) return { ok: false, error: data?.error || 'failed' }
    return { ok: true, user: shape(data.user) }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// The two surface rules, said once. Spec section 3.
//
// The wall wants a campus and does not care about the @. Main wants the @ and
// does not care about the campus. A screen that reimplements either of these is
// a screen that will disagree with the other one eventually.
export const canReadWall = (u) => !!u?.eduVerified
export const canPlacePing = (u) => !!u?.handleVerified

// ── the gate ────────────────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INDEX IS PUBLIC. THE LETTERS ARE NOT.                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall carries two different things and they cannot have the same rule.
//
//   the index    sixty-six handles, the count against each one, and nothing
//                else. Public, because it is what a person who has just
//                scanned a code off a card has to be able to see in four
//                seconds without answering anything, and because a name has
//                to be findable by the person it belongs to before they can
//                ask for it to come off.
//   the letters  what was actually written, who may write one, and who may
//                take one down. Behind this gate.
//
// So the letter arrives redacted to a stranger and whole to somebody with a
// berkeley.edu address, and the index is untouched.
//
// ── the three things the address opens ──────────────────────────────────────
// READING, WRITING and REPORTING. It is one door and it is opened once:
//
//   reading    a wall of things students wrote about each other, readable by
//              the open internet, is a different object from one readable by
//              the campus it is about.
//   writing    an anonymous letter about a named person, publishable by anybody
//              on earth with a browser, is not anonymity — it is an open relay
//              pointed at a student. The address does not sign the letter and
//              is never stored beside it. What it does is make the wall a room
//              with a door on it, which is the only reason the letters in it
//              can be worth reading.
//   reporting  a control that takes a public letter down on one tap has to cost
//              something to reach, or the wall's contents are decided by
//              whoever is bored. A campus address is the cheapest thing that is
//              not nothing.
//
// ── what this is not ────────────────────────────────────────────────────────
// It is not an identity, and being signed in is still not being known. The
// address is held in this tab, it is never attached to a letter, and the
// composer never reads it — there is no author field for it to land in
// (data.js). Reading is gated. Authorship stays absent. Those two facts are
// independent on purpose, and the second one is the product.
//
// ── where it actually happens ───────────────────────────────────────────────
// Phase 6a made this real. The code is minted, hashed and mailed by
// celestual-edu-verify, checked there, and the verified address is bound to an
// identity row by celestual_user_bind_edu (migration 0030). Nothing in this
// module decides whether anybody is a member: it asks, and the server answers.
//
// The gate that matters is not here either. Every read of a letter body goes
// through wall_letters_for, which checks the campus itself and returns a null
// body to anybody outside it, so a person who edits `member` in devtools gets a
// wall with no words on it. What this module holds is the copy of that answer
// the interface draws from, not the answer.

import { getState, patch, push } from './store.js'
import { normHandle, forgetLetters } from './data.js'
import { whoamiStrict, bindHandle, forgetSession } from '../api/identity.js'
import { getSession, markVerified, signOut as dropProof } from '../api/auth.js'
import { clearPending } from '../api/igverify.js'

export const DOMAIN = 'berkeley.edu'

export function normEmail(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '')
}

// The local part is deliberately loose. Berkeley issues addresses with dots,
// hyphens, underscores and digits in them, and a regex tight enough to be
// clever is a regex that turns somebody's real address away at the door.
export function validEmail(raw) {
  const e = normEmail(raw)
  return /^[a-z0-9][a-z0-9._%+-]{0,63}@berkeley\.edu$/.test(e)
}

// Said once, in one place, so the two screens that need it cannot word it
// differently. The address is only ever wrong in one way here.
export function emailFault(raw) {
  const e = normEmail(raw)
  if (!e) return ''
  if (!e.includes('@')) return ''
  return validEmail(e) ? '' : `letters open for ${DOMAIN} addresses`
}

// The shape only. The code itself is checked by celestual-edu-verify against
// a hash, and it is never returned to the browser, so there is nothing here
// that could check it and nothing here that should try. This is the fail-fast
// that keeps an obviously wrong entry from costing a round trip.
//
// SIX digits since the audit of 4 September, because this code is a secret in
// a way the DM code is not: guessing it binds a stranger's browser to the
// victim's identity row. Four digits under six tries was a real hole, and the
// function now spends a try before it looks at the code, so a burst of guesses
// cannot all read the same counter. The client and the function have disagreed
// about this length before and locked everybody out of the wall, so BOTH
// accept four or six while the two halves deploy in either order: the function
// mints six and checks a hash, the field takes up to six and lights at four.
export function validCode(raw) {
  return /^\d{4,6}$/.test(String(raw || '').replace(/\s+/g, ''))
}

// The server's last answer about this browser, kept so a screen can draw
// without waiting for a round trip. `refresh()` is what puts it there and
// `celestual_whoami` is where it comes from. Never trusted for access: it is
// what the interface draws, and wall_letters_for is what decides.
export function member() { return getState().member || null }
export function isMember() { return !!getState().member }

// Called after celestual-edu-verify confirms a code. The address it takes is
// the one the server just verified, not one the browser typed.
//
// Every letter read before this moment was read from outside the gate and is
// cached with its body withheld. The cache is dropped here, or "read it" lands
// on the same redacted card it left and the gate says "signed in".
export function signIn(email) {
  const e = normEmail(email)
  if (!validEmail(e)) return null
  patch({ member: e })
  forgetLetters()
  return e
}

// The whole session, not the wall's half of it. It used to clear the identity
// token and the wall's store and leave the DM proof in api/auth.js, so a
// person who signed out here on a shared laptop was still signed in to their
// sky on Main, one tap away. One session, one sign out.
export function signOut() {
  patch({ member: null, verified: [] })
  forgetSession()
  dropProof()
  clearPending()
  forgetLetters()
}

// A handle this device believed was proven and the server has just refused.
export function forgetVerified(handle) {
  const h = normHandle(handle)
  patch({ verified: (getState().verified || []).filter((x) => x !== h) })
}

// Ask the server who this browser is and cache the answer. Called on mount, so
// a person who verified on their phone yesterday comes back signed in, and a
// person whose session expired stops being drawn as a member.
//
// It never signs anybody OUT on a network failure. A flaky connection is not a
// reason to tell somebody they are no longer at their own university. A server
// that answered and said "nobody" is a different thing, and that is the one
// case a device stops drawing itself as through the gate.
export async function refresh() {
  const me = await whoamiStrict()
  if (me === null) return member()
  const verified = me.handleVerified && me.handle ? [me.handle] : (getState().verified || [])
  if (!me.signedIn || !me.eduVerified) {
    if (member()) forgetLetters()
    patch({ member: null, verified })
    return null
  }
  // The row does not carry the address (0030 keeps it server side on
  // purpose), so a device that lost its own copy is signed in as the campus
  // rather than as an invented someone@ at it.
  patch({ member: member() || (me.campus || DOMAIN), verified })
  return member()
}

// What the account sheet shows for `member()`: the address when this device
// still holds it, and the campus when it does not.
export function memberLabel(m) {
  const s = String(m || '')
  if (!s) return ''
  return s.includes('@') ? s : `a ${s} address`
}

// The part before the @. What the account sheet shows, because the domain is
// the same for everybody who can be here and repeating it says nothing.
export function shortName(email) {
  return String(email || '').split('@')[0] || ''
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HANDOFF — the only place the wall asks who somebody IS              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A berkeley.edu address says you are from the campus this wall is about. It
// says nothing at all about whether @sofiaaa.reyes is you, and one action on
// this surface turns entirely on that question: taking a whole name off the
// wall is permanent, it takes every letter written to that name with it, and
// nobody can put it back.
//
// So that one action goes through Instagram, because that is where the handle
// actually lives. Not a second account, not a password, not a form: the
// provider is asked whether the person at this browser owns the handle in play,
// it answers yes or no, and the answer is thrown away the moment it is used.
// Nothing about the account is read, nothing is stored beside the handle, and
// no token outlives the tab.
//
// ── why not on the report, and why not on the letters ───────────────────────
// Because proof is a cost, and a cost belongs on the irreversible action rather
// than on the frequent one. Reporting is undoable by a person at a desk in a
// minute and is used constantly; putting the handoff in front of it would price
// out the one person most likely to reach for it — the subject, on a phone, in
// the thirty seconds after they found their own name.
//
// ── where it actually happens ───────────────────────────────────────────────
// The Instagram DM code flow, which spec section 4 says is the only thing in
// the product that proves a handle and which this rebuild did not touch. The
// screen runs it (api/igverify.js), and what lands here is its result: the
// proof goes to celestual_user_bind_handle, which is the only writer of
// handle_verified_at anywhere.
//
// Resolving a handle through Apify is a different thing and proves nothing.
// Nothing on that path reaches this function.
export const HANDOFF_MS = 1500

export function verified() { return getState().verified || [] }

export function isVerified(handle) {
  const h = normHandle(handle)
  return !!h && verified().includes(h)
}

// Turn a completed DM verification into an identity. `proof` is the browser
// held secret the DM flow produced; the server checks it against a live
// verification for that handle and will not write anything without one.
export async function verifyHandle(handle, proof) {
  const h = normHandle(handle)
  if (!h || !proof) return { ok: false, error: 'invalid' }
  const out = await bindHandle({ handle: h, proof })
  // The identity row is 0030's, and 0030 is not applied everywhere this runs.
  // The proof is 0004's and it is what celestual_submit and celestual_my_pings
  // actually check, so a database with no identity layer still verified this
  // person: keep the proof, say so, and let the row catch up when it exists.
  if (out.error === 'no_identity_layer') {
    push('verified', h)
    markVerified(h, proof)
    return { ok: true, legacy: true }
  }
  if (out.ok) {
    push('verified', h)
    // ── AND THE PROOF IS KEPT ──
    // This line is the difference between a verification that finishes and one
    // that finishes and then cannot do anything. `proof` is not a receipt: it
    // is the capability celestual_submit consumes at seal time (0023 —
    // celestual_consume_ig_proof, which answers no to a null and returns
    // 'unverified'), and celestual_my_pings demands it to say a word about a
    // person's own sky. It was minted in the browser, spent once against
    // celestual_user_bind_handle, and then dropped on the floor here — while
    // three screens went on reading it out of `store.proof`, a key nothing has
    // ever written. So the DM landed, the handle bound, the site said verified,
    // and the ping that the whole flow existed to place came back unverified.
    //
    // api/auth.js is where this secret already lived (the /signin redemption
    // writes it there, and App.jsx has always read it there), so it is written
    // there and nowhere new: one secret, one key, one place to clear it.
    markVerified(h, proof)
  }
  return out
}

// The proof this device is holding, for the surfaces that have to spend it.
// Scoped to the handle it was minted for: a stale proof under somebody else's
// @ is not a proof, and sending it anyway spends a round trip to be told so.
export function heldProof(handle) {
  const s = getSession()
  if (!s?.proof) return null
  const want = normHandle(handle)
  if (want && normHandle(s.handle) !== want) return null
  return s.proof
}

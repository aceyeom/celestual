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
// ── the beta ────────────────────────────────────────────────────────────────
// Nothing is sent and no code is checked. There is no server in this build to
// send one and no inbox to receive it, so the step is drawn honestly and says
// so on the screen rather than pretending to have mailed something.

import { getState, patch, push } from './store.js'
import { normHandle } from './data.js'

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

// Any number passes, and the screen says so. What is checked is the SHAPE —
// six digits — because the field has to behave like the field it will be, and
// a step that accepts an empty box teaches nothing about the real one.
export function validCode(raw) {
  return /^\d{6}$/.test(String(raw || '').replace(/\s+/g, ''))
}

export function member() { return getState().member || null }
export function isMember() { return !!getState().member }

export function signIn(email) {
  const e = normEmail(email)
  if (!validEmail(e)) return null
  patch({ member: e })
  return e
}

export function signOut() { patch({ member: null }) }

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
// ── this build ──────────────────────────────────────────────────────────────
// There is no client id, no redirect and no provider to answer. The screen that
// calls this draws the handoff honestly, says on the glass that nothing is
// being asked of Instagram, and resolves after the time a real round trip
// takes. The SHAPE is the part being judged: one question, about one handle,
// answered once.
export const HANDOFF_MS = 1500

export function verified() { return getState().verified || [] }

export function isVerified(handle) {
  const h = normHandle(handle)
  return !!h && verified().includes(h)
}

export function verifyHandle(handle) {
  const h = normHandle(handle)
  if (!h) return Promise.resolve(false)
  return new Promise((resolve) => {
    setTimeout(() => { push('verified', h); resolve(true) }, HANDOFF_MS)
  })
}

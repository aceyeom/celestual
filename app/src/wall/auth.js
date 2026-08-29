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
//   the letters  what was actually written. Behind this gate, because a wall
//                of things students wrote about each other, readable by the
//                open internet, is a different object from a wall readable by
//                the campus it is about.
//
// So the letter arrives redacted to a stranger and whole to somebody with a
// berkeley.edu address, and everything else on the surface is untouched.
//
// ── what this is not ────────────────────────────────────────────────────────
// It is not an identity. It is a domain check and nothing more: the address is
// held in this tab, it is never attached to a letter, and the composer still
// does not ask who is writing. Reading is gated. Writing stays anonymous, and
// those two facts are independent on purpose.
//
// ── the beta ────────────────────────────────────────────────────────────────
// Nothing is sent and no code is checked. There is no server in this build to
// send one and no inbox to receive it, so the step is drawn honestly and says
// so on the screen rather than pretending to have mailed something.

import { getState, patch } from './store.js'

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

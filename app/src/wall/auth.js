// ── the gate ────────────────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  EVERY LETTER IS OPEN. WHAT YOU DO TO ONE ASKS WHO YOU ARE.              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall carries two kinds of thing, and since 26 September only one of
// them has a door (the owner: "never hide or limit how many letters a user
// can view. only nudge them", migration 0066).
//
//   the index    the names, the count against each one, and nothing else.
//                Public, because it is what a person who has just scanned a
//                code off a card has to be able to see in four seconds
//                without answering anything.
//   the letters  what was actually written. Public too, whole, as many as
//                anybody reads. They used to be eight to anybody and then a
//                proof (0045, 0049), with the ninth arriving blurred; the
//                seal is gone, and a reader who has read a few is NUDGED,
//                under the letter and never over it (Nudge.jsx).
//
// ── what still asks ─────────────────────────────────────────────────────────
//   THE HEART AND THE REPORT
//              a proof, any of the product's four: a campus address, a
//              verified handle, a google account or a mailed code (0044,
//              0057). They are things you DO to a letter rather than things
//              you read, and each is counted against a person. `reader`
//              below is this browser's copy of that answer; the name is what
//              it has always been called, and it no longer decides reading.
//   WRITING    not a door at all until the letter is written (docs/ONE-WALL.md
//              and 0066). Anybody writes to an @ or to a name, and the note
//              is read before it goes up. A verified Berkeley address posts
//              to an @ as a Berkeley student, with the sticker, at once. The
//              @ the writer proves is theirs sends it privately, as a ping.
//              The address does not sign the letter and is never stored
//              beside it (screens/Write.jsx).
//
// ── what this is not ────────────────────────────────────────────────────────
// It is not an identity, and being signed in is still not being known. The
// address is held in this tab, it is never attached to a letter, and the
// composer never reads it: there is no author field for it to land in
// (data.js). Authorship stays absent, and that is the product.
//
// ── where it actually happens ───────────────────────────────────────────────
// The proofs are minted and checked by the edge functions and bound to an
// identity row by the celestual_user_bind_* functions (migration 0030 on).
// Nothing in this module decides whether anybody is proved: it asks, and the
// server answers, and the heart and the report ask wall_read_gate themselves,
// so a person who edits `reader` in devtools gets a key that does nothing.

import { getState, patch, push } from './store.js'
import { cardStep } from './seed.js'
import { normHandle, targetKey, forgetLetters } from './data.js'
import { whoamiStrict, bindHandle, forgetSession, isProved } from '../api/identity.js'
import { getSession, markVerified, signOut as dropProof } from '../api/auth.js'
import { clearPending } from '../api/igverify.js'
import { atBerkeley } from './schools.js'

// The one school whose addresses post to an @ on the wall (docs/ONE-WALL.md),
// painted beside the field that asks for one (screens/Write.jsx).
export const DOMAIN = 'berkeley.edu'

export function normEmail(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '')
}

// The local part is deliberately loose. Berkeley issues addresses with dots,
// hyphens, underscores and digits in them, and a regex tight enough to be
// clever is a regex that turns somebody's real address away at the door.
// The domain is the school's or any department's under it (`eecs.berkeley.edu`),
// and with no domain named, any `.edu`. The function checks again, and it is
// the one that decides.
export function validEmail(raw, domain = DOMAIN) {
  const e = normEmail(raw)
  const d = domain ? `(?:[a-z0-9-]+\\.)*${String(domain).replace(/\./g, '\\.')}` : '(?:[a-z0-9-]+\\.)+edu'
  return new RegExp(`^[a-z0-9][a-z0-9._%+-]{0,63}@${d}$`).test(e)
}

// Any well formed address. The gate takes one typed whole, with its @, and
// the server decides whether it passes: the campus, or the desk's pass list
// (migration 0043). Nothing in this browser knows the list, and nothing
// should; a copy of it here could only agree with the server or be wrong.
export function anyEmail(raw) {
  const e = normEmail(raw)
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 200
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
//
// `member` is who the bar and the account sheet call this person: whichever
// proof they gave, the handle, the google account or the address (migration
// 0057). `reader` is any proof and answers the other question: may this
// person heart and report. Every letter is read by anybody (0066).
export function member() { return getState().member || null }
export function isMember() { return !!getState().member }
export function isReader() { return !!getState().reader }

// The school address this device has verified, as the server last said it:
// its domain (`berkeley.edu`), or null. It is what the composer reads to know
// whether a post to the Berkeley wall can go up without asking (`eduBerkeley`),
// and what a name note's school starts on. Never trusted for access: the
// function checks the address on every post.
export function eduDomain() { return getState().edu || null }
export function eduBerkeley() { return atBerkeley(eduDomain() || '') }

// ── the composer ────────────────────────────────────────────────────────────
// Every way into the composer comes through here: the pill on the wall, the
// nib in the bar, "write to @them" on a letter. Everybody lands on the
// composer (docs/ONE-WALL.md): the letter is written first, and what it asks
// for is asked when it is sent, by how it is sent (screens/Write.jsx).
export function toWrite(go, handle = '') {
  // a handle, or a first name's tilde key, which opens the composer in name mode
  const h = targetKey(handle)
  go('write', h || undefined)
}

// Called after celestual-edu-verify confirms a code. The address it takes is
// the one the server just verified, not one the browser typed.
//
// Every letter read before this moment was read as nobody: its heart drawn
// for nobody and its menu missing what an owner sees. The cache is dropped
// here, so the next read is this person's (data.js `forgetLetters`).
export function signIn(email) {
  const e = normEmail(email)
  if (!anyEmail(e)) return null
  patch({ member: e, reader: true, edu: e.split('@')[1] || null })
  forgetLetters()
  // Which piece of paper this person came in off has an answer now, and this is
  // the moment it is worth writing down: a proof landed. Nothing about the
  // address goes up with it (seed.js `cardStep`, migration 0047), and a person who
  // arrived here without scanning anything reports nothing at all.
  cardStep('joined')
  return e
}

// The login landed (api/login.js): a google account or a mailed code. The
// server's row is read again, because what it proved is the server's to say:
// on the campus wall a google address at the campus opens writing and any
// other opens reading; on the wall at the root either opens both.
export async function signedIn() {
  const m = await refresh()
  forgetLetters()
  cardStep('joined')
  return m
}

// The whole session, not the wall's half of it. It used to clear the identity
// token and the wall's store and leave the DM proof in api/auth.js, so a
// person who signed out here on a shared laptop was still signed in to their
// sky on Main, one tap away. One session, one sign out. The slots this
// person was last told they hold go with them (pings.js `slotCap`), so the
// next person on the same laptop is not shown a count that was somebody
// else's.
export function signOut() {
  patch({ member: null, reader: false, verified: [], pingCap: 0, edu: null })
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

  // Any of the four proofs opens the letters, and the heart and the report
  // with them: the handle, the campus address, google, or a mailed code
  // (migrations 0044, 0057). This used to count the first two only, so a
  // person signed in by google or by a mailed code read the wall and could
  // never heart it: every press was sent to a gate they had already been
  // through, and the server that would have taken it was never asked.
  //
  // The cache is dropped when this ANSWER changes rather than when the
  // address does: a person who proved their handle on Main and walked over
  // here has a cache read as nobody and no address, and a cache keyed on the
  // address would never drop it.
  const was = isReader()
  const now = isProved(me)
  if (was !== now) forgetLetters()

  // ── the school address ──
  // Whether this device is verified at a school, and which (its domain), so
  // the composer knows before it asks whether a post to the Berkeley wall
  // needs a link (`eduBerkeley`). The server's answer, every time.
  const edu = me.signedIn && me.eduVerified ? String(me.campus || 'edu') : null

  // ── who this is ──
  // Anybody the product has proved, by any proof, is signed in: `member` is
  // what the bar and the account sheet call them. Writing asks nothing of it
  // any more (the composer asks, at the send, for what that send needs).
  const writes = isProved(me)
  if (!me.signedIn || !writes) {
    patch({ member: null, reader: now, verified, edu })
    return null
  }
  // What to call them on the account sheet. The row does not carry the
  // campus address (0030 keeps it server side on purpose), so a device that
  // lost its own copy is signed in as the login's address, or the handle, or
  // the school rather than as an invented someone@ at it.
  const held = member()
  const label = held || me.loginEmail || (me.handle ? `@${me.handle}` : me.campus || 'you')
  patch({ member: label, reader: now, verified, edu })
  return member()
}

// What the account sheet shows for `member()`: the address when this device
// still holds it, and the campus when it does not.
export function memberLabel(m) {
  const s = String(m || '')
  if (!s) return ''
  if (s === 'you') return 'signed in'
  return s.includes('@') ? s : `a ${s} address`
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
//
// HANDOFF_MS, a 1500ms beat this file exported for the screen to poll on, went
// with the dead exports: Remove.jsx has kept its own clock since the handoff
// moved onto the DM code, and nothing has read this one in a long time.

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
    // ── AND THE HEART COUNTS ──
    // A proved handle is one of the proofs wall_read_gate takes (0044), so
    // the heart and the report are this person's now. Every letter in the
    // cache was read as nobody, so the cache goes, exactly as it does when a
    // campus address lands, and the letters under this @ are read again as
    // its owner's. The handle is who the bar and the account sheet call them.
    if (!isReader()) { patch({ reader: true }); forgetLetters() }
    if (!isMember()) patch({ member: `@${h}` })
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
    // The other proof this product takes, and the same step. A card is judged
    // on people who got through a door, and it does not matter which one.
    cardStep('joined')
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

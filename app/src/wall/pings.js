// ── the pings, on the wall ──────────────────────────────────────────────────
//
// A ping is placed from the wall now (screens/Ping.jsx) and kept an eye on
// from the wall (screens/You.jsx), so what a ping IS lives here rather than
// in Main's data layer, which used to own it when placing was a page of its
// own at /place. main/data.js hands these on unchanged, so anything that still
// reads them there reads the same functions.
//
// It is thin on purpose, as it always was. `celestual_submit`,
// `celestual_my_pings`, `celestual_renew` and `celestual_withdraw` are where
// the cap, the window, the suppression list and the matching live, and this
// shapes what they answer into what the two sheets draw. It does not
// reimplement any of it.
//
// Since 0072 a handle is no longer one ping. A mutual is kept on both lists
// as it was told, so the person can write to the same somebody again
// (`celestual_mutual_again`, `placeAgain`), and the list can carry, for one
// handle, the mutual and a new note beside it; and a mutual can be taken off
// one's own list (`celestual_mutual_forget`, `forgetMutual`). So a ping has
// a `key` of its own, and the two questions a screen asks of a handle have
// two answers: what is my note on them doing (`liveOf`), and are we mutual
// (`mutualOf`).
import {
  placePing, placePingAgain, forgetMutualPing, fetchMyPings, fetchAllowance, renewPing, retirePing, normHandle,
  PING_DAYS, SLOT_CAP,
} from '../api/celestual.js'
import { PING_CENTS, MAX_BUY } from '../api/billing.js'
import { getSession } from '../api/auth.js'
import { learnHandle, avatarUrl } from '../api/handles.js'
import { heldProof, verified, proofFor, renewProof } from './auth.js'
import { isNameKey, validHandle, mine } from './data.js'
import { getState, patch } from './store.js'

export { PING_DAYS, SLOT_CAP }

// ── whose pings these are ───────────────────────────────────────────────────
// The handle this browser has proved, which is the one a ping is placed
// under and the one its list is read with. The server's row first (auth.js
// `refresh` keeps it in `verified`), and the device's own DM session when
// the row has not caught up, as it does not on a database with no identity
// layer: the proof is what every ping read checks, and it is here either way.
export function myHandle() {
  const v = verified()[0]
  if (v) return normHandle(v)
  const s = getSession()
  return s && s.verified && s.handle ? normHandle(s.handle) : ''
}

// Whether this browser can place a ping without asking for anything first:
// a handle, and the proof that spends it, both held here. The second half is
// the one that used to drift: the row remembers a verification from another
// phone, or from before thirty idle days, and the secret it needs was not on
// this one. Since 0065 the proof comes back with the person (auth.js
// `restoreProof`, started the moment the row is read), so this turns true a
// beat after a sign in, and `readyToPlace` is the same question for a screen
// that can wait that beat.
export function canPlace() {
  const me = myHandle()
  return !!me && !!heldProof(me)
}

export async function readyToPlace() {
  const me = myHandle()
  return me ? proofFor(me) : null
}

// ── the standing pings ──────────────────────────────────────────────────────
// What this person has out, and which of them came back. The proof is the DM
// flow's, held in this browser, and it is what `celestual_my_pings` checks.
//
// Three answers, and the sheets have to tell them apart: the list, "there is
// no proof for this @ to be had" (celestual_my_pings answers ok:false to a
// dead proof), and "could not read it". The sky used to draw all three as
// "nothing out yet.", which for the second is a lie told to somebody with a
// mutual on their row.
//
// The second is rarer than it was. A device with no proof, or with one the
// server has let lapse, asks for the @'s proof back from the person it is
// signed in as (auth.js `restoreProof`, 0065) before it answers 'unverified',
// so a person who has claimed their @ once, anywhere, and signed in here by
// any proof, reads their list with no DM. 'unverified' is left for a device
// whose person holds no @ at all, which is the one time the DM is owed.
export async function myPings({ handle, proof }) {
  const h = normHandle(handle)
  if (!h) return { ok: false, error: 'unverified', pings: [], mutuals: [] }
  try {
    const key = proof || await proofFor(h)
    if (!key) return { ok: false, error: 'unverified', pings: [], mutuals: [] }
    // api/celestual.js already normalises what celestual_my_pings returns, and
    // this follows ITS shape rather than the RPC's: one place in the product
    // reads that RPC and this is not it. The fields are
    // { handle, time, expires_at, mutual, card, theirCard }.
    let out = await fetchMyPings({ handle: h, proof: key })
    if (out && out.ok === false && out.error === 'unverified') {
      const fresh = await renewProof(h, key)
      if (fresh) out = await fetchMyPings({ handle: h, proof: fresh })
    }
    if (!out || out.ok === false) {
      return { ok: false, error: out?.error || 'network', pings: [], mutuals: [] }
    }
    // `pings` can carry one handle twice since 0072, a mutual and a new note
    // to the same person; `mutuals` carries each handle once, the mutual
    // `mutualOf` answers, however many of a person's @s were told on it
    const pings = keyed((Array.isArray(out.pings) ? out.pings : []).map(shapePing))
    const allowance = learnAllowance(h, out.allowance)
    const answer = { ok: true, pings, mutuals: mutualsOf(pings), allowance }
    HELD.set(h, { at: Date.now(), answer })
    keepSpans(pings)
    return answer
  } catch {
    return { ok: false, error: 'network', pings: [], mutuals: [] }
  }
}

// ── the last answer, held ───────────────────────────────────────────────────
// The list is read on one sheet and a mutual is opened one tap later on
// another, and the second used to read the list again from the server before
// it would draw anything: the tap answered with a bare screen for as long as
// the round trip took, which on a phone is most of a second. The answer is
// held here for a short while, the next sheet draws from it on its first
// frame, and it still asks the server, so a ping that was let go elsewhere in
// the meantime corrects itself on the glass rather than standing on a stale
// copy.
//
// Nothing about anybody else is in it: it is this person's own list, read
// with this person's own proof, and it goes when they sign out.
const HELD = new Map()
const HOLD_MS = 120_000

export function heldPings(handle) {
  const h = normHandle(handle)
  const held = h && HELD.get(h)
  if (!held || Date.now() - held.at > HOLD_MS) return null
  return held.answer
}

export function forgetPings() {
  HELD.clear()
}

// What this device's own two acts on a mutual do to the held answer, so the
// next sheet's first frame is already true. Writing again puts a note on the
// list the held answer does not have, so this person's answer goes and the
// next sheet asks; taking a mutual off takes it out of the held answer at
// once, since a list that drew it again for the length of a round trip would
// be drawing somebody the person has just let go of.
function dropHeld(handle) {
  HELD.delete(normHandle(handle))
}
function dropHeldMutual(handle, them) {
  const h = normHandle(handle)
  const t = normHandle(them)
  const held = h && HELD.get(h)
  if (!held || !t) return
  const pings = held.answer.pings.filter((p) => !(p.state === 'mutual' && normHandle(p.to) === t))
  HELD.set(h, { at: held.at, answer: { ...held.answer, pings, mutuals: mutualsOf(pings) } })
}

// ── this week's pings ───────────────────────────────────────────────────────
// One free ping for every reveal, and any bought on top (0071,
// docs/PINGS-BY-THE-WEEK.md). The server says it on every answer about the
// notes (the list, a placement, a keep, and its own read), in one shape, and
// this is that shape made plain:
//
//   revealAt   the reveal a note sent now runs to
//   freeLeft   how many of its free pings are unspent: 1 or 0, and up to ten
//              on a plan from before
//   credits    pings bought and not spent, which never lapse
//   sent       pings spent on that reveal
//   left       what can still be sent to it: the free one and the bought
//              ones, up to the ceiling of ten a reveal
//   next       the reveal after it, where a note kept for next week goes
//
// Kept on this device between answers (store.js `allowance`), so a sheet
// draws the week on its first frame, and nobody else's: it goes with the
// person on sign out, like the list.
export function shapeAllowance(a) {
  if (!a || typeof a !== 'object') return null
  const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
  const ceiling = n(a.ceiling, MAX_BUY)
  const sent = n(a.sent)
  // one, or none; ten while a plan from before (0021's steady) is paid through
  const freeLeft = Math.max(0, n(a.free_left, 1))
  const credits = Math.max(0, n(a.credits))
  const next = a.next && typeof a.next === 'object' ? {
    revealAt: Date.parse(a.next.reveal_at || 0) || 0,
    freeLeft: Math.max(0, n(a.next.free_left, 1)),
    sent: n(a.next.sent),
  } : null
  return {
    revealAt: Date.parse(a.reveal_at || 0) || 0,
    free: n(a.free, 1),
    freeLeft,
    credits,
    sent,
    ceiling,
    left: Math.max(0, Math.min(freeLeft + credits, ceiling - sent)),
    priceCents: n(a.price_cents, PING_CENTS) || PING_CENTS,
    next,
  }
}
function learnAllowance(handle, raw) {
  const h = normHandle(handle)
  const a = shapeAllowance(raw)
  if (a && h) patch({ allowance: { h, at: Date.now(), a } })
  return a
}
// the last one this device was told, for this person, while it can still be
// the week's: one said before the reveal it was about is last week's
export function heldAllowance(handle = myHandle()) {
  const h = normHandle(handle)
  const got = getState().allowance
  if (!h || !got || got.h !== h || !got.a) return null
  if (got.a.revealAt && got.a.revealAt < Date.now()) return null
  return got.a
}
export async function loadAllowance(handle = myHandle()) {
  const h = normHandle(handle)
  if (!h) return null
  const key = await proofFor(h)
  if (!key) return null
  const out = await fetchAllowance({ handle: h, proof: key })
  return out.ok ? learnAllowance(h, out.allowance) : heldAllowance(h)
}

// Which ping a note sent now would be, in the words the composer says it:
// the week's free one, or one of those bought, or none left.
export function pingWords(a) {
  if (!a) return ''
  if (a.left <= 0) return a.sent >= a.ceiling ? 'ten this week, which is the most' : 'no pings left this week'
  if (a.freeLeft) return 'your free ping this week'
  return a.credits === 1 ? 'your last ping' : `1 of your ${a.credits} pings`
}

// ── a note waiting on pings ─────────────────────────────────────────────────
// A note that could not be paid for is kept while its person buys pings: the
// paywall is a trip to Stripe's page and back, and the page may be reloaded
// or evicted on the way, so it is kept on this device (store.js `waiting`)
// rather than in memory, for two hours, and sent the moment the pings land
// (screens/Pings.jsx). What it is: a note to send, with its words and the
// face they were written on (the line across the top, `greet`, and, for a
// note from before 30 September, the battery it kept, `bat`, 0073), a lapsed one to send again, or a running one to keep
// for next week. The face waits with the words, since the send that finally
// goes replaces the card whole and a face left behind here would be gone.
const WAIT_MS = 2 * 3600000
export function waitForPings(action) {
  if (!action || !action.to) return
  patch({
    waiting: {
      kind: action.kind || 'send', to: normHandle(action.to), line: action.line ?? null,
      greet: typeof action.greet === 'string' && action.greet ? action.greet : null,
      bat: Number.isInteger(action.bat) ? action.bat : null,
      at: Date.now(),
    },
  })
}
export function waitingNote() {
  const w = getState().waiting
  if (!w || !w.to || Date.now() - (w.at || 0) > WAIT_MS) return null
  return w
}
export function dropWaiting() {
  patch({ waiting: null })
}
// and both, with the person, on sign out: they are theirs and nobody's after
export function forgetWeek() {
  patch({ allowance: null, waiting: null })
}

// a card's face, read as the server cleans it (celestual_card_clean, 0073):
// a line of at most forty characters, and a charge of 0 to 4
const greetOf = (c) => (c && typeof c.greet === 'string' ? c.greet.slice(0, 40) : '')
const batOf = (c) => (c && Number.isInteger(c.bat) && c.bat >= 0 && c.bat <= 4 ? c.bat : null)

function shapePing(p) {
  const to = p.handle || ''
  // The face rides on the row (0042), and the memo learns it here so every
  // Face and Who on the two sheets and the reveal draws without a peek.
  if (p.profile) {
    learnHandle({
      handle: to, known: true, name: p.profile.name, verified: p.profile.verified,
      avatar: avatarUrl(p.profile.avatarPath),
    })
  }
  return {
    // The handle, as it always was, for anything that took it for one. It is
    // not the ping's identity any more: since 0072 one handle can carry a
    // mutual and a new note to the same person, so React keys on `key`.
    id: to,
    // Unique, and the same on every read: which kind of row it is, the handle,
    // and when its note went out, which neither a keep nor a reveal moves. A
    // note that turns mutual at its reveal becomes a mutual, and a different
    // thing on the screen, so its key changes with it. `keyed` makes the rare
    // two alike (two linked @s, one note each in one instant) unique, and
    // the server lists those two in one order on every read (0072), so the
    // one numbered is the same one each time.
    key: `${p.mutual ? 'mutual' : 'note'}:${to}:${Number(p.time) || 0}`,
    to,
    // standing until its reveal; then mutual, or lapsed: not this time, and
    // listed for a week so it can be sent again (0069)
    state: p.mutual ? 'mutual' : p.lapsed ? 'lapsed' : 'standing',
    at: Number(p.time) || 0,
    expires: Date.parse(p.expires_at || 0) || 0,
    // the night a mutual was told, which is a reveal for every pair found
    // since 0069, and whenever it happened for the ones before
    revealedAt: Date.parse(p.revealed_at || 0) || 0,
    line: p.card?.words || '',
    theirLine: p.theirCard?.words || '',
    // The note's face, which its writer set on its screen (0073): the line
    // across its top, and the battery it was left on. Empty and null for a
    // note from before, or one whose writer left them as they came, so a
    // screen draws its own default (`dear` and the name, and a full battery).
    greet: greetOf(p.card),
    bat: batOf(p.card),
    theirGreet: greetOf(p.theirCard),
    theirBat: batOf(p.theirCard),
    // The moment it opened is not on the wire either. A mutual opens when the
    // second of the two is placed, and the only timestamp either side holds is
    // its own, so a screen says how long each has been standing rather than
    // pretending to know when the pair closed.
    openedAt: 0,
  }
}
function keyed(pings) {
  const seen = new Map()
  return pings.map((p) => {
    const n = seen.get(p.key) || 0
    seen.set(p.key, n + 1)
    return n ? { ...p, key: `${p.key}~${n}` } : p
  })
}

// ── one handle, two questions ───────────────────────────────────────────────
// A handle can carry a mutual and a new note to the same person at once
// (0072), and a screen that asks `.find((p) => p.to === them)` gets whichever
// the list happened to put first. So each question has its own answer. Both
// take the list, or an answer with the list on it, and a handle as typed.
//
// liveOf: what is my note on them doing. The one that is not a mutual, a note
// still running before one that was not this time, and the latest of those.
// mutualOf: are we mutual. The mutual, the most recently told, which the
// server already answers one of for each @ a person has.
const listOf = (pings) => (Array.isArray(pings) ? pings : Array.isArray(pings?.pings) ? pings.pings : [])
export function liveOf(pings, handle) {
  const h = normHandle(handle)
  if (!h) return null
  const rank = (p) => (p.state === 'standing' ? 1 : 0)
  let best = null
  for (const p of listOf(pings)) {
    if (!p || p.state === 'mutual' || normHandle(p.to) !== h) continue
    if (!best || rank(p) > rank(best) || (rank(p) === rank(best) && (p.at || 0) > (best.at || 0))) best = p
  }
  return best
}
export function mutualOf(pings, handle) {
  const h = normHandle(handle)
  if (!h) return null
  let best = null
  for (const p of listOf(pings)) {
    if (!p || p.state !== 'mutual' || normHandle(p.to) !== h) continue
    if (!best || (p.revealedAt || 0) > (best.revealedAt || 0)
        || ((p.revealedAt || 0) === (best.revealedAt || 0) && (p.at || 0) > (best.at || 0))) best = p
  }
  return best
}
// `answer.mutuals`, and the account's mutual slots (screens/You.jsx): the
// pings that are mutual, one for each handle, the one mutualOf answers, in
// the list's own order
export function mutualsOf(pings) {
  return pings.filter((p) => p.state === 'mutual' && mutualOf(pings, p.to) === p)
}

// ── the slots ───────────────────────────────────────────────────────────────
// How many a person may have standing is the server's (celestual_cap_for:
// the free two, and whatever was bought), and it is said on exactly one
// answer, the one to a placement. So the last number the server said is kept
// on this device, and the free two stand in for it until it has said one.
// A count drawn against a cap the server does not hold is a count that lies.
export function slotCap() {
  const n = Number(getState().pingCap)
  return n > 0 ? n : SLOT_CAP
}

// ── placing one ─────────────────────────────────────────────────────────────
// Straight through to `celestual_submit`, which is where the cap, the window,
// the suppression list and the billing chain all already live. Nothing here
// inlines a cap of its own.
//
// celestual_submit answers a refusal as { recorded:false, error } and never
// carries an `ok` key at all. This used to test `out.ok === false`, which was
// never true, so a person at the cap, or whose proof had lapsed, or who typed
// an @ that had opted out, was told "it's out." over a ping that was never
// written. The two exceptions the RPC raises ('same handle', 'invalid handle')
// arrive as thrown errors and are named here rather than read as the network.
//
// A proof the server refuses ('unverified': it lapsed, or it was never on this
// device) is renewed from the person once (auth.js `renewProof`, 0065) and the
// ping sent again with the fresh one, so the DM is asked for only when this
// person holds no @ the server can vouch for.
//
// Words sent empty are words taken off, and the server clears them until the
// reveal (0069); no words at all, which is how a note is sent again, keeps
// what it had.
export async function place(note) {
  return placing(placePing, note)
}

// ── writing again, to a mutual ──────────────────────────────────────────────
// A new private note to somebody this person is already mutual with
// (`celestual_mutual_again`, 0072). The mutual they have is kept, on both
// lists, exactly as it was told, both notes and its night; the new note goes
// out as any new note does, on a ping of its own, sealed, and is told at a
// Saturday reveal only if they write a new one too. Nothing about it reaches
// them before that: to them the mutual is what it was. `place` cannot do it,
// and is not meant to: the ordinary placement on a mutual answers as the
// mutual (it's mutual, their words, nothing spent), whether or not the pair
// was kept, which is what keeps a keep from being seen.
//
// It answers exactly what `place` answers, with the same refusals, and a
// refusal keeps nothing on the server. `words` left out is a note with no
// words. The held list goes on a yes, since it has no new note in it.
export async function placeAgain(note) {
  const out = await placing(placePingAgain, note)
  if (out.ok) dropHeld(note?.me)
  return out
}

// The placement both of them go through: the proof, sent again once renewed
// when the server refuses it, the week learned from whatever came back, and
// the answer's own refusals named rather than read as the network.
//
// The card is the words and the face they were written on (0073): the line
// across the top, and the battery only for a note from before 30 September,
// when the battery left the private notes for the wall letters (0076): no
// screen sets one now, so a new note carries none, and one a note already
// had is handed back by its screen with its words and sent again as it was.
// The server still takes one (0073 is left as it stands). It replaces a card
// whole, so every send that carries words carries the face too, or the face
// is gone; a send with no words (`null`) keeps the card as it was, face and
// all, and words taken off (`''`) take the face with them.
async function placing(rpc, { me: mineNow, them, email, proof, words, greet, bat } = {}) {
  const face = {}
  const g = typeof greet === 'string' ? greet.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
  if (g) face.greet = g
  if (Number.isInteger(bat) && bat >= 0 && bat <= 4) face.bat = bat
  try {
    const send = (spend) => rpc({
      me: mineNow,
      them,
      email: email || null,
      proof: spend,
      card: words == null ? null : words ? { words, ...face } : { words },
    })
    const key = proof || await proofFor(mineNow)
    let out = await send(key)
    if (out && out.recorded === false && out.error === 'unverified') {
      const fresh = await renewProof(mineNow, key)
      if (fresh) out = await send(fresh)
    }
    const cap = Number(out?.slots?.cap)
    if (cap > 0) patch({ pingCap: cap })
    const allowance = learnAllowance(mineNow, out?.allowance)
    if (!out || out.recorded === false || out.ok === false) {
      return { ok: false, error: out?.error || 'failed', slots: out?.slots || null, allowance }
    }
    noteSpan(Date.parse(out.expires_at || 0))
    return { ok: true, ...out, allowance }
  } catch (e) {
    const msg = String(e?.message || '')
    if (/same handle/i.test(msg)) return { ok: false, error: 'self' }
    if (/invalid handle/i.test(msg)) return { ok: false, error: 'invalid' }
    return { ok: false, error: 'network' }
  }
}

// ── taking a mutual off ─────────────────────────────────────────────────────
// This person's mutual with somebody, off their own list for good
// (`celestual_mutual_forget`, 0072). The other person keeps theirs, unchanged,
// and is told nothing; a note to them afterwards is simply a new note. A new
// note already out to them is not touched: it is let go the way any note is
// (`release`). Answers { ok: true }, or { ok: false, error } where
// 'unverified' is a proof the server refused even renewed, 'none' is no
// mutual there to take off (taken off already, on another phone), and
// 'network' is the rest. The held list loses the mutual on a yes and on a
// 'none', since either way it is not on the server's.
//
// What goes is the mutual this device has drawn: the night the held list
// carries for it rides along, and a mutual told after it (on the night the
// call itself lands, or one this list was read too early to have) stays on
// the server, its news still on the way, and turns up on the next read
// rather than going before it was ever seen.
export async function forgetMutual({ me: mineNow, them } = {}) {
  try {
    const shown = mutualOf(HELD.get(normHandle(mineNow))?.answer, them)
    const told = shown?.revealedAt ? new Date(shown.revealedAt).toISOString() : null
    const send = (spend) => forgetMutualPing({ me: mineNow, them, proof: spend, told })
    const key = await proofFor(mineNow)
    let out = await send(key)
    if (out && out.ok === false && out.error === 'unverified') {
      const fresh = await renewProof(mineNow, key)
      if (fresh) out = await send(fresh)
    }
    if (!out) return { ok: false, error: 'network' }
    if (out.ok === true || out.error === 'none') dropHeldMutual(mineNow, them)
    return out.ok === true ? { ok: true } : { ok: false, error: out.error || 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ── keeping one, and letting one go ─────────────────────────────────────────
// The two things a person can do to a ping they have out, off the same RPCs
// the old design called (celestual_renew, celestual_withdraw), gated by the
// same proof. Both answer yes or no and, on a no, why, and the list is read
// again after either. celestual_renew says `ok` from its row count, and
// (before 0038) sent an expires_at beside ok:false; reading either as a yes
// reported a renewal that did not happen, on a ping that had just gone mutual
// or been let go elsewhere. A no for a reason is not "try again": a note whose
// reveal came while its screen was open answers 'lapsed' (not this time) or
// 'none' (it went mutual, or was let go elsewhere), and letting go of one
// that went mutual answers 'mutual' (0069).
export async function renew({ me: mineNow, them }) {
  try {
    const out = await renewPing({ me: mineNow, them, proof: await proofFor(mineNow) })
    const allowance = learnAllowance(mineNow, out?.allowance)
    if (out?.ok !== true) return { ok: false, error: out?.error || 'network', allowance }
    return { ok: true, expires: Date.parse(out.expires_at || 0) || 0, allowance }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// A note that lapsed at a reveal, sent again for this week with the words it
// had (the server keeps them when none are sent), through the placement, so
// the slot rule and the matching run as for any note going out (0069).
export async function sendAgain({ me: mineNow, them }) {
  return place({ me: mineNow, them })
}

// Nothing to let go (it went elsewhere already) is a yes: the note is gone,
// which is what was asked.
export async function release({ me: mineNow, them }) {
  try {
    const out = await retirePing({ me: mineNow, them, proof: await proofFor(mineNow) })
    if (!out) return { ok: false, error: 'network' }
    return out.withdrawn || out.ok || !out.error ? { ok: true } : { ok: false, error: out.error }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ── who this person has written to ──────────────────────────────────────────
// The names a ping can be placed on in one press: everybody this person has
// put a letter up to, by handle. The server's list first (wall_mine, this
// identity's own letters of the last thirty days), then the names this
// browser remembers writing to, newest first, each once.
//
// Handles only. A letter to a first name was a choice not to name the @, and
// the wall never asks for it or keeps one beside a name (WALL-FEATURES.md),
// so a `~sofia` key is not a person a ping can find and is left out rather
// than guessed at. And never this person's own @. It knows nothing of the
// pings, and need not: somebody this person is mutual with stays on it,
// since a note to them is written again now (`placeAgain`, 0072) rather than
// answered with the mutual they already have.
export function writtenTo(self = myHandle()) {
  const me = normHandle(self)
  const seen = new Set()
  const out = []
  const add = (raw) => {
    const k = String(raw || '')
    if (!k || isNameKey(k)) return
    const h = normHandle(k)
    if (!validHandle(h) || h === me || seen.has(h)) return
    seen.add(h)
    out.push(h)
  }
  for (const l of mine() || []) if (l.kind !== 'name') add(l.to)
  for (const k of getState().wroteTo || []) add(k)
  return out
}

// ── the reveal ──────────────────────────────────────────────────────────────
// Every note runs to a reveal, and every reveal is the same moment for
// everybody: Saturday, nine at night, in California (migration 0069,
// `celestual_next_reveal`). Worked out here in California's own wall time, so
// a phone in New York or Seoul counts down to the same instant the server
// opens the pairs at, and a change of the clocks moves nothing.
export const REVEAL_TZ = 'America/Los_Angeles'
const REVEAL_DAY = 6
const REVEAL_HOUR = 21
const DAY_MS = 86400000
const HOUR_MS = 3600000
let WALL = null
function wallOf(ms) {
  if (!WALL) {
    WALL = new Intl.DateTimeFormat('en-US', {
      timeZone: REVEAL_TZ, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short',
    })
  }
  const o = {}
  for (const x of WALL.formatToParts(new Date(ms))) o[x.type] = x.value
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday)
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, min: +o.minute, dow }
}
// the instant a California wall clock reads `h` o'clock on that day: a guess
// in winter time, corrected by however far the clock there disagrees
function atWall(y, m, d, h) {
  let t = Date.UTC(y, m - 1, d, h + 8)
  for (let i = 0; i < 2; i++) {
    const w = wallOf(t)
    const off = (Date.UTC(w.y, w.m - 1, w.d, w.h) - Date.UTC(y, m - 1, d, h)) / HOUR_MS
    if (!off) break
    t -= off * HOUR_MS
  }
  return t
}
// the first reveal strictly after a moment
export function nextReveal(at = Date.now()) {
  const w = wallOf(at)
  const k = (REVEAL_DAY - w.dow + 7) % 7
  let t = atWall(w.y, w.m, w.d + k, REVEAL_HOUR)
  if (t <= at) t = atWall(w.y, w.m, w.d + k + 7, REVEAL_HOUR)
  return t
}
// the day of a reveal as the phone stamps a letter's day (looks.js
// `stampOf`), in California, where it happens: a reveal is a Saturday there
// and already a Sunday in most of the world
export function revealStamp(ms) {
  const w = wallOf(ms)
  const two = (n) => String(n).padStart(2, '0')
  return `${two(w.m)}/${two(w.d)}/${two(w.y % 100)}`
}
// the last reveal at or before it
export function lastReveal(at = Date.now()) {
  const n = wallOf(nextReveal(at))
  return atWall(n.y, n.m, n.d - 7, REVEAL_HOUR)
}

// ── a reveal nobody here has opened yet ─────────────────────────────────────
// The account's key in the bar carries a light after a reveal this person had
// a note in, until they open their private notes (parts.jsx `TopBar`,
// screens/You.jsx). What it knows is what the last read of the list said: when
// each note went out and when it ended or was told (`noteSpans`), kept on this
// device, so the light is there on the first frame of any visit and needs no
// request. A person who has never been here is given the last reveal as seen,
// so nobody's first visit after this lands carries a light for a night they
// were not part of.
//
// Only the spans that can still meet a reveal are kept: one that ended before
// the last reveal never will, and the list is oldest first and keeps every
// mutual, so keeping its first dozen dropped the very notes that were out
// this week. And a note placed is a span at once (`place`), since a person
// who sends one from the wall may not open the list again before its night.
const SPANS = 24
function keepSpans(pings) {
  const floor = lastReveal() - HOUR_MS
  const spans = pings
    .map((p) => [p.at || 0, p.state === 'mutual' ? p.revealedAt : p.expires])
    .filter((x) => x[1] && x[1] >= floor)
    .sort((a, b) => a[1] - b[1])
  patch({ noteSpans: spans.slice(-SPANS) })
}
function noteSpan(end, at = Date.now()) {
  if (!end) return
  const spans = getState().noteSpans || []
  if (spans.some(([from, to]) => from <= at && to >= end)) return
  patch({ noteSpans: [...spans, [at, end]].slice(-SPANS) })
}
function seenReveal() {
  const s = getState()
  if (typeof s.revealSeen === 'number') return s.revealSeen
  const last = lastReveal()
  patch({ revealSeen: last })
  return last
}
// and nobody with no @ here has notes to have a light for
export function revealWaiting(at = Date.now()) {
  if (!myHandle()) return false
  const last = lastReveal(at)
  if (seenReveal() >= last) return false
  return (getState().noteSpans || []).some(([from, to]) => from < last && to >= last)
}
export function sawReveal(at = Date.now()) {
  patch({ revealSeen: lastReveal(at) })
}

// ── time, in words ──────────────────────────────────────────────────────────
// The same voice the wall uses. A note is a week long now, and its clock
// reads in nights, not days.
export function daysLeft(expires) {
  if (!expires) return PING_DAYS
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000))
}

// When a note ends, said the way a person would: this saturday, next
// saturday, or the date when it is further than that. Only a reveal is a
// saturday: an end that is not one (a note from before 0069, or a backend
// that does not keep the week) is said on the day it really falls.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const NEAR_MS = HOUR_MS * 2
const isReveal = (t) => NEAR_MS > Math.abs(t - nextReveal(t - NEAR_MS))
export function endsWords(end, at = Date.now()) {
  if (!end) return ''
  const n = nextReveal(at)
  const on = isReveal(end)
  if (on && Math.abs(end - n) < NEAR_MS) return 'this saturday'
  if (on && Math.abs(end - nextReveal(n)) < NEAR_MS) return 'next saturday'
  const w = wallOf(end)
  return `${on ? 'saturday' : DAYS[w.dow]} ${MONTHS[w.m - 1]} ${w.d}`
}

// When a note that was not this time ended, by the clock of whoever is
// reading: tonight, or today, while it is still that day where they are,
// last night or yesterday the day after, and past that the day it was.
export function endedWords(end, at = Date.now()) {
  if (!end) return ''
  const day = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
  const ago = Math.round((day(at) - day(end)) / DAY_MS)
  const late = new Date(end).getHours() >= 17
  if (ago <= 0) return late ? 'tonight' : 'today'
  if (ago === 1) return late ? 'last night' : 'yesterday'
  return `last ${isReveal(end) ? 'saturday' : DAYS[wallOf(end).dow]}`
}

// Whether a standing note is kept as far ahead as it goes: to the reveal
// after the one a note sent now would end at (`celestual_note_ends`), which
// is where `celestual_renew` stops. Measured from this moment's reveal it
// called a note sent on Friday night or Saturday kept, since those run to
// the Saturday after anyway, and hid the keeping the server would still do.
export function keptAhead(p, at = Date.now()) {
  return !!p && p.state === 'standing' && p.expires >= nextReveal(nextReveal(at + DAY_MS)) - NEAR_MS
}

// The count, as the sheets say it, to the note's own reveal.
export function daysLeftWords(expires) {
  return expires ? `ends ${endsWords(expires)}` : ''
}

// What a note is doing, in the words a row carries under the name: that it
// is mutual, that it was not this time, or when its reveal is. Asked of one
// ping, never of a handle: since 0072 a handle can carry a mutual and a new
// note, so a screen that starts from a handle picks the ping first, `liveOf`
// for what the note is doing and `mutualOf` for whether they are mutual.
export function stateWords(p) {
  if (!p) return ''
  if (p.state === 'mutual') return mutualWords(p)
  if (p.state === 'lapsed') return 'not this time'
  return keptAhead(p) ? `kept to ${endsWords(p.expires)}` : `reveals ${endsWords(p.expires)}`
}

// A mutual never lapses and never spends a ping again: the week it was told
// on is the last thing that happens to it here, and the rest is theirs. So
// its row says when that was, the night itself while it is recent, and the
// day after that: it's mutual · last night, mutual since sep 19. A pair from
// before the weekly reveal has no night, and says only that it is.
export function mutualWords(p, at = Date.now()) {
  const t = p && p.revealedAt
  if (!t) return 'it’s mutual'
  if (at - t < 6 * DAY_MS) return `it’s mutual · ${endedWords(t, at)}`
  const w = wallOf(t)
  return `mutual since ${MONTHS[w.m - 1]} ${w.d}`
}

// The night a mutual was told, in the few words its slot carries beside the
// @ (Slot.jsx): the night itself while it is recent, `last night`, and the
// day after that, `since sep 19`. A pair from before the weekly reveal has
// no night, and the slot says nothing there.
export function mutualWhen(p, at = Date.now()) {
  const t = p && p.revealedAt
  if (!t) return ''
  if (at - t < 6 * DAY_MS) return endedWords(t, at)
  const w = wallOf(t)
  return `since ${MONTHS[w.m - 1]} ${w.d}`
}

// ── a mutual, seen told ─────────────────────────────────────────────────────
// A mutual's slot in the private notes is suspense until its telling has been
// watched once on this device, and calm after (Slot.jsx), and the reveal
// plays the whole film only the first time (screens/Reveal.jsx). What is kept
// is a hash of whose list it is on and the mutual's own key, never the handle
// it is with: the store is this device's, and a shared laptop should not
// carry a list of who anybody is mutual with, and it goes at sign out with
// the rest of the person (auth.js `signOut`), so the next person on it does
// not inherit a count of the mutuals the last one watched. The last sixty
// four, which is more mutuals than anybody has. Storage switched off reads
// every mutual as not yet opened, which is the right way to be wrong.
const OPENED = 64
function openedMark(me, p) {
  const s = `${normHandle(me)}>${p && p.key ? p.key : ''}`
  // FNV-1a, 32 bits: short, the same on every device, and not a handle
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}
export function wasOpened(me, p) {
  if (!p || !p.key) return false
  return (getState().toldSeen || []).includes(openedMark(me, p))
}
export function markOpened(me, p) {
  if (!p || !p.key || wasOpened(me, p)) return
  patch({ toldSeen: [...(getState().toldSeen || []), openedMark(me, p)].slice(-OPENED) })
}

// The time left to a moment, as the phone's clock counted it: days and hours
// while it is days away, then hours, minutes and seconds.
export function countdown(to, at = Date.now()) {
  const s = Math.max(0, Math.floor((to - at) / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n) => String(n).padStart(2, '0')
  return { d, h, m, s: sec, text: d ? `${d}d ${two(h)}:${two(m)}:${two(sec)}` : `${two(h)}:${two(m)}:${two(sec)}` }
}

export function since(ts) {
  if (!ts) return ''
  const days = Math.max(0, Math.round((Date.now() - ts) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}

// The same fact, as a phrase that stands on its own. `since` returns a
// DURATION for the callers that put it beside a label, and two of its answers
// are not durations: "today" and "yesterday" are already whole. A caller that
// appends "ago" to every one of them prints "today ago", which is what the
// hero's gate did until somebody looked at it.
export function sinceAgo(ts) {
  const s = since(ts)
  if (!s) return ''
  return s === 'today' || s === 'yesterday' ? s : `${s} ago`
}

// The distance between two moments. Not currently called anywhere and that is
// on purpose rather than an oversight: celestual_my_pings hands each person
// their own timestamp and not the other's, so nothing in the product can
// honestly say how far apart a pair was placed. It stays because the day the
// RPC returns both, the reveal's eyebrow has a true sentence to say and this is
// what says it.
export function apart(a, b) {
  if (!a || !b) return ''
  const days = Math.abs(Math.round((a - b) / 86400000))
  if (days === 0) return 'hours'
  if (days === 1) return 'a day'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}

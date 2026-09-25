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
import { placePing, fetchMyPings, renewPing, retirePing, normHandle, PING_DAYS, SLOT_CAP } from '../api/celestual.js'
import { getSession } from '../api/auth.js'
import { learnHandle, avatarUrl } from '../api/handles.js'
import { heldProof, verified } from './auth.js'
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
// the one that drifts: the row remembers a verification from another phone,
// or from before thirty idle days, and the secret it needs is not on this one.
export function canPlace() {
  const me = myHandle()
  return !!me && !!heldProof(me)
}

// ── the standing pings ──────────────────────────────────────────────────────
// What this person has out, and which of them came back. The proof is the DM
// flow's, held in this browser, and it is what `celestual_my_pings` checks.
//
// Three answers, and the sheets have to tell them apart: the list, "the proof
// this browser holds has lapsed" (celestual_my_pings answers ok:false to a dead
// proof, and the server's row still says handle_verified, so nothing else in
// the product would ever ask again), and "could not read it". The sky used to
// draw all three as "nothing out yet.", which for the second is a lie told to
// somebody with a mutual on their row.
export async function myPings({ handle, proof }) {
  if (!handle || !proof) return { ok: false, error: 'unverified', pings: [], mutuals: [] }
  try {
    // api/celestual.js already normalises what celestual_my_pings returns, and
    // this follows ITS shape rather than the RPC's: one place in the product
    // reads that RPC and this is not it. The fields are
    // { handle, time, expires_at, mutual, card, theirCard }.
    const out = await fetchMyPings({ handle, proof })
    if (!out || out.ok === false) {
      return { ok: false, error: out?.error || 'network', pings: [], mutuals: [] }
    }
    const pings = (Array.isArray(out.pings) ? out.pings : []).map(shapePing)
    const answer = { ok: true, pings, mutuals: pings.filter((p) => p.state === 'mutual') }
    HELD.set(normHandle(handle), { at: Date.now(), answer })
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
    // A ping is one per pair, so the handle is its identity. There is no id on
    // the wire and inventing one would only be inventing a key for React.
    id: to,
    to,
    state: p.mutual ? 'mutual' : 'standing',
    at: Number(p.time) || 0,
    expires: Date.parse(p.expires_at || 0) || 0,
    line: p.card?.words || '',
    theirLine: p.theirCard?.words || '',
    // The moment it opened is not on the wire either. A mutual opens when the
    // second of the two is placed, and the only timestamp either side holds is
    // its own, so a screen says how long each has been standing rather than
    // pretending to know when the pair closed.
    openedAt: 0,
  }
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
export async function place({ me: mineNow, them, email, proof, words }) {
  try {
    const out = await placePing({
      me: mineNow,
      them,
      email: email || null,
      proof,
      card: words ? { words } : null,
    })
    const cap = Number(out?.slots?.cap)
    if (cap > 0) patch({ pingCap: cap })
    if (!out || out.recorded === false || out.ok === false) {
      return { ok: false, error: out?.error || 'failed', slots: out?.slots || null }
    }
    return { ok: true, ...out }
  } catch (e) {
    const msg = String(e?.message || '')
    if (/same handle/i.test(msg)) return { ok: false, error: 'self' }
    if (/invalid handle/i.test(msg)) return { ok: false, error: 'invalid' }
    return { ok: false, error: 'network' }
  }
}

// ── keeping one, and letting one go ─────────────────────────────────────────
// The two things a person can do to a ping they have out, off the same RPCs
// the old design called (celestual_renew, celestual_withdraw), gated by the
// same proof. Both answer a plain yes or no, and the list is read again on a
// yes. celestual_renew says `ok` from its row count, and (before 0038) sent
// an expires_at beside ok:false; reading either as a yes reported a renewal
// that did not happen, on a ping that had just gone mutual or been let go
// elsewhere.
export async function renew({ me: mineNow, them }) {
  try {
    const out = await renewPing({ me: mineNow, them, proof: heldProof(mineNow) })
    return out?.ok === true
  } catch {
    return false
  }
}

export async function release({ me: mineNow, them }) {
  try {
    const out = await retirePing({ me: mineNow, them, proof: heldProof(mineNow) })
    return !!(out && (out.withdrawn || out.ok))
  } catch {
    return false
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
// than guessed at. And never this person's own @.
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

// ── time, in words ──────────────────────────────────────────────────────────
// The same voice the wall uses. A ping is a sixty day object and its clock
// should read like one.
export function daysLeft(expires) {
  if (!expires) return PING_DAYS
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000))
}

// The count, as the sheets say it. Zero is "lapses today", not "0 days left".
export function daysLeftWords(expires) {
  const n = daysLeft(expires)
  return n === 0 ? 'lapses today' : n === 1 ? 'one day left' : `${n} days left`
}

// What a ping is doing, in the words a row carries under the name: that it
// is mutual, or how long it has left, which says it is standing.
export function stateWords(p) {
  if (!p) return ''
  return p.state === 'mutual' ? 'it’s mutual' : daysLeftWords(p.expires)
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

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
    const pings = (Array.isArray(out.pings) ? out.pings : []).map(shapePing)
    const answer = { ok: true, pings, mutuals: pings.filter((p) => p.state === 'mutual') }
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
//
// A proof the server refuses ('unverified': it lapsed, or it was never on this
// device) is renewed from the person once (auth.js `renewProof`, 0065) and the
// ping sent again with the fresh one, so the DM is asked for only when this
// person holds no @ the server can vouch for.
export async function place({ me: mineNow, them, email, proof, words }) {
  try {
    const send = (spend) => placePing({
      me: mineNow,
      them,
      email: email || null,
      proof: spend,
      card: words ? { words } : null,
    })
    const key = proof || await proofFor(mineNow)
    let out = await send(key)
    if (out && out.recorded === false && out.error === 'unverified') {
      const fresh = await renewProof(mineNow, key)
      if (fresh) out = await send(fresh)
    }
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
    const out = await renewPing({ me: mineNow, them, proof: await proofFor(mineNow) })
    return out?.ok === true
  } catch {
    return false
  }
}

// A note that lapsed at a reveal, sent again for this week with the words it
// had (the server keeps them when none are sent), through the placement, so
// the slot rule and the matching run as for any note going out (0069).
export async function sendAgain({ me: mineNow, them }) {
  return place({ me: mineNow, them, words: '' })
}

export async function release({ me: mineNow, them }) {
  try {
    const out = await retirePing({ me: mineNow, them, proof: await proofFor(mineNow) })
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
function keepSpans(pings) {
  const spans = pings.map((p) => [p.at || 0, p.state === 'mutual' ? p.revealedAt : p.expires]).filter((x) => x[1])
  patch({ noteSpans: spans.slice(0, 12) })
}
function seenReveal() {
  const s = getState()
  if (typeof s.revealSeen === 'number') return s.revealSeen
  const last = lastReveal()
  patch({ revealSeen: last })
  return last
}
export function revealWaiting(at = Date.now()) {
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
// saturday, or the date when it is further than that.
export function endsWords(end, at = Date.now()) {
  if (!end) return ''
  const n = nextReveal(at)
  if (Math.abs(end - n) < HOUR_MS * 2) return 'this saturday'
  if (Math.abs(end - nextReveal(n)) < HOUR_MS * 2) return 'next saturday'
  const w = wallOf(end)
  return `saturday ${['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][w.m - 1]} ${w.d}`
}

// Whether a standing note is already kept for the week after this one.
export function keptAhead(p, at = Date.now()) {
  return !!p && p.state === 'standing' && p.expires - nextReveal(at) > DAY_MS
}

// The count, as the sheets say it, to the note's own reveal.
export function daysLeftWords(expires) {
  return expires ? `ends ${endsWords(expires)}` : ''
}

// What a note is doing, in the words a row carries under the name: that it
// is mutual, that it was not this time, or when its reveal is.
export function stateWords(p) {
  if (!p) return ''
  if (p.state === 'mutual') return 'it’s mutual'
  if (p.state === 'lapsed') return 'not this time'
  return keptAhead(p) ? `kept to ${endsWords(p.expires)}` : `reveals ${endsWords(p.expires)}`
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

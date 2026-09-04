// ── the wall's data layer ───────────────────────────────────────────────────
//
// Phase 6b. This module used to open by saying "everything here is in memory,
// this build is a visual prototype, it reaches no server". That is no longer
// true of anything below the pure functions: the corpus comes from
// `wall_letters` through `api.js`, and the seeded one is gone.
//
// ── why the screens still call synchronous functions ────────────────────────
// Ten screens read the wall during render. Making each of them await would have
// meant ten loading states, ten error states and ten chances to disagree about
// what an empty wall looks like. So this module is a CACHE with the shape it
// always had: the getters answer instantly out of what has been fetched, the
// loaders fill it, and `revision()` goes up when something lands.
//
// `subscribe()` is what turns that into a re-render. The shell holds one
// subscription; nothing else needs to know a network exists.
//
// ── the wall is anonymous, and that is structural ───────────────────────────
// There is no author field on a letter here. Not hidden, not hashed, not
// withheld pending something: absent. The server has one, because somebody has
// to be able to answer a reveal request, but it is on a column with no grant
// and it is in no shape any function returns. Nothing in this module records,
// derives or could later reconstruct who wrote anything, because nothing it can
// ask returns it.
//
// That is the guarantee the printed card makes.
//
// ── body can be null, and null is not empty ─────────────────────────────────
// A letter read from outside the campus gate comes back with `body: null`. That
// is the redaction, it is performed by the database rather than here, and it is
// deliberately distinct from `''`: the screen has to be able to tell "there are
// words and you may not read them" from "somebody wrote nothing".

import * as api from './api.js'

const DAY = 86400000

// ── handles ─────────────────────────────────────────────────────────────────
// Stored bare, displayed with an @, and normalised in exactly one place.
export function normHandle(raw) {
  return String(raw || '')
    .trim().toLowerCase()
    .replace(/^@+/, '')
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//, '')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 30)
}

export function atHandle(raw) {
  const h = normHandle(raw)
  return h ? `@${h}` : ''
}

export function validHandle(raw) {
  const h = normHandle(raw)
  return h.length >= 3 && h.length <= 30 && !h.startsWith('.') && !h.endsWith('.')
}

// ── determinism ─────────────────────────────────────────────────────────────
// Every derived quantity in this build — a letter's id, its age, where its
// handle sits on the wall, how big it is set, which constellation it draws —
// comes out of this hash. Nothing is Math.random(), because a wall that
// reshuffles on every refresh is a wall nobody can point at and say "that one".
export function hash(str) {
  let a = 0x9e3779b9, b = 0x85ebca6b
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 0x27d4eb2d) >>> 0
    b = Math.imul(b ^ (a >>> 13), 0x165667b1) >>> 0
  }
  return ((a ^ (b >>> 15)) >>> 0)
}

// A stable float in [0,1) from a key and a channel, so one letter can have a
// dozen independent-looking properties out of one hash.
export function rand(key, channel = 0) {
  return (hash(`${key}#${channel}`) % 100000) / 100000
}

// ── the corpus, fetched ─────────────────────────────────────────────────────
// Three caches, filled independently, because the three reads the wall does are
// three different questions with three different costs:
//
//   TILES     the public index. One request, no session, and it is what the
//             wall of names is drawn from.
//   BY_HANDLE the letters for one handle, redacted or whole depending on the
//             gate. Filled when somebody opens a name.
//   BY_ID     one letter. Filled when somebody opens a letter directly, which
//             is what a link off a card does.
//
// Nothing is ever evicted. A wall session is minutes long and the corpus is
// small; a cache that forgot things would only mean a second spinner on a
// screen somebody just walked back from.
let TILES = []
let TILES_AT = 0
// Set when the last read of the index failed and nothing has been drawn from
// it yet. The masthead used to print "0 letters" over a wall that had not
// loaded, which is the one number on the surface and was a lie.
let TILES_ERROR = null
export function wallError() { return TILES.length ? null : TILES_ERROR }
const BY_HANDLE = new Map()
const BY_ID = new Map()

// The gate's last answer, as the server gave it. `null` before anything has
// been asked, which the screens read as "not yet" rather than as "no".
let OPEN = null
export function gateOpen() { return OPEN }

// Everything read about the letters, dropped. Called when the gate opens or
// closes, because every cached letter was read with the gate the way it was:
// signing in over a cache of redacted bodies is a wall that stays shut, and
// signing out over a cache of open ones is a wall that stays open.
export function forgetLetters() {
  BY_HANDLE.clear()
  BY_ID.clear()
  OPEN = null
  bump()
}

// ── the revision, and who is listening ──────────────────────────────────────
// The corpus changes when a fetch lands, when a letter goes up, and when
// something comes down. All three used to happen on a sheet raised over a wall
// that never unmounts, so a counter read at route changes was enough. A fetch
// lands whenever it lands, so there is a subscription now.
let REV = 0
const LISTENERS = new Set()

export function revision() { return REV }

export function subscribe(fn) {
  LISTENERS.add(fn)
  return () => LISTENERS.delete(fn)
}

function bump() {
  REV += 1
  for (const fn of LISTENERS) {
    try { fn(REV) } catch { /* a listener that throws is not the corpus's problem */ }
  }
}

// ── the loaders ─────────────────────────────────────────────────────────────
// Each one is idempotent and each one de-duplicates itself, so ten components
// mounting at once produce one request. They resolve to nothing: what they do
// is fill the cache and bump, and the caller re-renders off that.
const inflight = new Map()

function once(key, run) {
  if (inflight.has(key)) return inflight.get(key)
  const p = run().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

const FRESH_MS = 30_000

export function loadWall(force = false) {
  if (!force && TILES_AT && Date.now() - TILES_AT < FRESH_MS) return Promise.resolve()
  return once('wall', async () => {
    const out = await api.wallIndex()
    if (out.ok) {
      TILES = out.tiles
      TILES_AT = Date.now()
      TILES_ERROR = null
    } else {
      TILES_ERROR = out.error || 'network'
    }
    bump()
  })
}

export function loadHandle(raw, force = false) {
  const h = normHandle(raw)
  if (!h) return Promise.resolve()
  if (!force && BY_HANDLE.has(h)) return Promise.resolve()
  return once(`h:${h}`, async () => {
    const out = await api.lettersFor(h)
    if (!out.ok) return
    OPEN = out.open
    BY_HANDLE.set(h, out.letters)
    for (const l of out.letters) BY_ID.set(l.id, l)
    bump()
  })
}

export function loadLetter(id, force = false) {
  if (!id) return Promise.resolve()
  if (!force && BY_ID.has(id)) return Promise.resolve()
  return once(`l:${id}`, async () => {
    const out = await api.letter(id)
    if (!out.ok) {
      // A letter that is gone is a fact worth caching, so a screen that keeps
      // asking about a removed id does not keep asking. A network that did not
      // answer is not that fact, and caching it drew "That letter has come
      // down." over a letter that was up, for the rest of the session.
      if (out.error === 'gone') { BY_ID.set(id, null); bump() }
      return
    }
    OPEN = out.open
    BY_ID.set(id, out.letter)
    bump()
  })
}

// ── coming off the wall ─────────────────────────────────────────────────────
//
// Listing somebody's handle on a public wall says, in public, that they are
// being written about. They did not ask for that and they never agreed to it,
// so the way back off has to cost them less than being on it does.
//
// Two doors, and they cost different things because they are not the same act:
//
//   ONE LETTER   any reader through the campus gate can report it, and it is
//                off the wall on the tap. `report` below. Nothing is proven,
//                nothing is destroyed, and a person at the admin desk can put
//                it back, because a wrong report costs one letter a day in a
//                queue and a slow one costs the subject the day it was up.
//   THE LETTER   `removeLetter`, by the person it is about, and it needs the
//                verified handle. Instagram is where a handle lives, so the
//                proof is the DM code flow and nothing else.
//
// The asymmetry is the reason, not the effort. Holding one letter is reversible
// by a person at a desk in a minute. What is irreversible belongs behind proof.
//
// ── what changed in Phase 6b ────────────────────────────────────────────────
// Both of these used to be a list in localStorage that this module filtered
// against. They are `wall_report` and `wall_remove_letter` now, which means a
// removal survives the tab it happened in, applies to everybody rather than to
// one browser, and cannot be undone by clearing site data.
//
// `removeHandle` is gone. It took every letter written to a handle off the wall
// at once, and the server has no such operation: 0032 removes letters one at a
// time and refuses a write to a handle any of whose letters were removed, which
// gets the same outcome without a single statement that can empty a name.

// Both return { ok } and both refresh what they touched, so the screen that
// called one is looking at the truth immediately afterwards rather than at its
// own optimistic guess.
export async function report(id, reason) {
  const out = await api.report(id, reason)
  if (out?.ok) {
    BY_ID.set(id, null)
    for (const [h, list] of BY_HANDLE) BY_HANDLE.set(h, list.filter((l) => l.id !== id))
    TILES_AT = 0
    await loadWall(true)
    bump()
  }
  return out || { ok: false, error: 'network' }
}

export async function removeLetter(id) {
  const out = await api.removeLetter(id)
  if (out?.ok) {
    BY_ID.set(id, null)
    for (const [h, list] of BY_HANDLE) BY_HANDLE.set(h, list.filter((l) => l.id !== id))
    TILES_AT = 0
    await loadWall(true)
    bump()
  }
  return out || { ok: false, error: 'network' }
}

// ── the wall ────────────────────────────────────────────────────────────────
// A wall of HANDLES, not of letters: one tile per recipient, carrying however
// many letters that recipient has. A handle written to three times reads as
// heavier than one written to once, and it does, because the tile's weight and
// scale come off the count.
//
// The weight and the seed are still derived from the handle rather than sent by
// the server. They are a drawing decision, they have to be identical on every
// device so two people looking at the same wall see the same wall, and a hash
// of the handle gives that for free.
export function wall() {
  return TILES.map((t) => ({
    ...t,
    weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
    seed: hash(t.handle),
  }))
}

// The masthead's number. The sum off the index rather than a second count, so
// it cannot disagree with the tiles under it.
export function liveCount() {
  return TILES.reduce((n, t) => n + t.count, 0)
}

export function handleCount() { return TILES.length }

// ── reading ─────────────────────────────────────────────────────────────────
// Both of these answer out of the cache. A caller that wants them filled calls
// the matching loader first, or renders the empty state and lets the
// subscription bring it back.
export function lettersFor(handle) {
  return BY_HANDLE.get(normHandle(handle)) || []
}

// Three states, and screens need all three:
//
//   undefined  nobody has asked about this id yet
//   null       asked, and there is no live letter under it
//   an object  here it is
//
// Collapsing the first two is how a screen ends up telling somebody their
// letter has been taken down while the request for it is still open.
export function letter(id) {
  return BY_ID.get(id)
}

// Whether we have actually asked about a handle yet, which is not the same
// question as whether it has letters. A screen that cannot tell those apart
// draws "nobody wrote to you" while the request is still open.
export function knowsHandle(handle) {
  return BY_HANDLE.has(normHandle(handle))
}

// The search. The server orders it: exact handle first, then anything
// containing what was typed, so a person who half-remembers a handle still
// lands somewhere and a person who types their own exact handle lands on
// themselves rather than on a list of near-misses.
export async function search(query) {
  const rows = await api.wallSearch(query)
  return rows.map((t) => ({
    ...t,
    weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
    seed: hash(t.handle),
  }))
}

// ── writing ─────────────────────────────────────────────────────────────────
// Not an insert. The letter goes to celestual-wall-moderate, which screens it
// and writes it in one request, and comes back with one of three answers:
//
//   live      it is on the wall
//   pending   a person will look at it, and this reads as 'live' to the writer
//   rejected  it is not going up, and `reasons` says why
//
// Held and published read the same on purpose. A screen that distinguished
// them would be a way to find out what gets through by writing until something
// does.
export async function write({ to, body, sealedLine, source }) {
  const out = await api.write({ to, body, sealedLine, source })
  if (out?.ok && out.status === 'live') {
    const h = normHandle(to)
    BY_HANDLE.delete(h)
    TILES_AT = 0
    await Promise.all([loadWall(true), loadHandle(h, true)])
    bump()
  }
  return out || { ok: false, error: 'network' }
}

// ── the nineteen ────────────────────────────────────────────────────────────
// Nineteen of twenty look and find nothing, which is the point of the surface
// and the moment the product is actually sold. Nothing reads this back.
export async function joinWaitlist(handle, source) {
  return (await api.joinWaitlist(handle, source)) || { ok: false, error: 'network' }
}

// ── time, in words ──────────────────────────────────────────────────────────
// No library, and no "2h ago". The wall is a slow object and its clock should
// read like one.
export function ago(ts) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (mins < 60) return mins === 1 ? 'a minute ago' : `${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs === 1 ? 'an hour ago' : `${hrs} hours ago`
  const days = Math.round(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  const wks = Math.round(days / 7)
  return wks === 1 ? 'a week ago' : `${wks} weeks ago`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── the dateline ────────────────────────────────────────────────────────────
// The paper card's top rule carries two cells, and every caller fills them with
// the two facts that are actually load-bearing for the card it is on. Both are
// named `lead` and `trail` rather than `date` and `day` because on half the
// cards in this build neither of them is a date.
//
// A ping's card is dated absolutely — "14. March 2026 / Thursday" — because
// that product is a sixty-day clock and the day it was placed is the number the
// whole mechanism turns on.
export function dateline(ts) {
  const d = new Date(ts)
  return { lead: `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, trail: DAYS[d.getDay()] }
}

// A LETTER's card is dated relatively, and this is the one that goes on the
// wall. "7. August 2026 / Friday" is two facts nobody asked for: an unsent
// letter has no anniversary and its weekday means nothing to the person
// reading it. The only thing anybody wants off that line is how long it has
// been sitting there unsaid — which the card was already printing, twice, in
// two different voices, in two different places.
//
// The right-hand cell here is a STAMP rather than a second cell of type: it
// carries the card's state — sealed, or nothing at all — and a state is a mark
// somebody put on a document, not the other half of a date. Keeping the two
// under different names is what stops a weekday from being set as a stamp on
// the composer's card, which is exactly what happened when they shared one.
export function sinceline(ts, stamp = '') {
  return { lead: ago(ts), stamp }
}

export { DAY }

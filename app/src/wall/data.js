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
// A letter this browser may not read comes back with `body: null`. That is the
// redaction, it is performed by the database rather than here, and it is
// deliberately distinct from `''`: the screen has to be able to tell "there are
// words and you may not read them" from "somebody wrote nothing".
//
// Which letters those are is the server's arithmetic too. Every browser is
// handed five whole ones before it is asked for anything (0045) and the rest
// go through the read gate (0044), so openness is per LETTER and `body` is the
// only thing a screen should branch on. `gated()` and `freeReads()` below are
// what the meter draws, and neither of them decides anything.

import * as api from './api.js'
import { learnHandle, warmFaces, isNameKey } from '../api/handles.js'
import { learnLook, lookKey } from './looks.js'
import { getState, patch } from './store.js'

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

// ── names ───────────────────────────────────────────────────────────────────
// A letter can be addressed to anything a writer calls a person instead of
// a handle: a first name, a nickname, one letter, a number (migrations 0053
// and 0055). On the wall it is keyed by a tilde and the folded name,
// `~sofia`, `~j`, `~51b`, a string that can never be a handle, so everybody
// written to under one spelling shares one disc and no handle proof can ever
// claim or empty it. These mirror the server's wall_fold, wall_name_key and
// wall_name_clean, so the key this browser lights is the key the server
// filed the letter under.
export { isNameKey }

// the server's own accent table, so `ø` and `ß` fold here the way they fold
// there; anything the table does not name is decomposed and its marks dropped
const ACCENTS_FROM = 'àáâãäåāăąçćčďđèéêëēėęěìíîïīįıñńňòóôõöøōőùúûüūůűýÿžźżšśğłřťţÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ'
const ACCENTS_TO = 'aaaaaaaaacccddeeeeeeeeiiiiiiinnnoooooooouuuuuuuyyzzzssglrttaaaaaaceeeeiiiinoooooouuuuy'
const ACCENTS = new Map([...ACCENTS_FROM].map((c, i) => [c, ACCENTS_TO[i]]))

export function foldName(raw) {
  return [...String(raw || '')].map((c) => ACCENTS.get(c) || c).join('')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim().replace(/\s+/g, ' ')
}

export function nameKey(raw) {
  const k = foldName(raw).replace(/[^\p{L}\p{N}]/gu, '')
  return k.length >= 1 ? `~${k.slice(0, 40)}` : ''
}

// A tilde string is a name key; anything else is a handle. Every reader in
// this module normalises a target through this and not through normHandle,
// which would strip the tilde and turn a letter to Sofia into @sofia.
export function targetKey(raw) {
  const s = String(raw || '').trim()
  return s.startsWith('~') ? nameKey(s.slice(1)) : normHandle(s)
}

// The name as it will stand on the wall, or ''. One to thirty characters, at
// most five words, any letter or digit, and none of the characters that make
// a string a handle, a link or a command. The server's wall_name_clean is
// the authority; this is the fail fast that keeps an obviously wrong entry
// from costing a round trip.
export function cleanName(raw) {
  const n = String(raw || '').replace(/\s+/g, ' ').trim()
  if (n.length < 1 || n.length > 30) return ''
  if (n.split(' ').length > 5) return ''
  if (/[@#$%^&*_=+<>{}[\]|\\/:;"`~]/.test(n)) return ''
  if (/\p{Cc}/u.test(n)) return ''
  if (!nameKey(n)) return ''
  return n
}

// What a key is called, for anything that prints one: the name as written
// for a first name, the handle with its @ otherwise. The spelling comes from
// wherever this browser last saw the key (the index, a search, a letter, or
// what it wrote itself), because a key alone cannot be printed as a name.
const NAMES = new Map()
export function learnName(key, name) {
  if (isNameKey(key) && name) NAMES.set(key, String(name))
}
export function nameFor(key) {
  if (!isNameKey(key)) return ''
  return NAMES.get(key) || (getState().names || {})[key] || ''
}
export function labelFor(key) {
  return isNameKey(key) ? (nameFor(key) || String(key).slice(1)) : atHandle(key)
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
// Whether the index has answered at all. A wall that has not loaded is not an
// empty wall, and a screen that cannot tell the two apart says "nobody has
// been written to yet" over a request that is still open.
export function wallLoaded() { return TILES_AT > 0 || !!TILES_ERROR }
const BY_HANDLE = new Map()
const BY_ID = new Map()

// ── the five ────────────────────────────────────────────────────────────────
// Every browser reads five whole letters before it is asked for anything
// (migration 0045). These two are the server's last word on that, updated by
// every read: `GATED` is whether the reader is through the gate, in which case
// the five stop applying, and `FREE` is { limit, used, left } counted after
// that read. `null` before anything has been asked.
//
// Nothing here decides anything. The body is withheld by the database and the
// count is kept by the database; this is what the meter draws.
let GATED = null
let FREE = null
export function gated() { return GATED }
export function freeReads() { return FREE }

// ── the allowance ───────────────────────────────────────────────────────────
// Three letters in any five days (migrations 0044 and 0051), unless the desk
// has the cap switched off (0052), in which case `left` is `Infinity` and
// nothing about it is ever drawn. Cached the way everything else here is, so
// the composer can read it during render and the server stays the one that
// decides. `null` before it has been asked, which the composer reads as "say
// nothing yet" rather than as zero. No number in it is ever drawn; what the
// composer says, once they are spent, is how many days until `resets`
// (parts.jsx `Allowance`).
let QUOTA = null
export function allowance() { return QUOTA }

// ── this device's own letters ───────────────────────────────────────────────
// Where each letter this person put up stands now (api.js `mine`). `null`
// before it has been asked. It is what the notice at the foot of the wall
// draws from when one of them has come down, and it is read again whenever
// the wall is landed on, since a person at a desk can take a letter down at
// any hour.
let MINE = null
export function mine() { return MINE }

// Everything read about the letters, dropped. Called when the gate opens or
// closes, because every cached letter was read with the gate the way it was:
// signing in over a cache of redacted bodies is a wall that stays shut, and
// signing out over a cache of open ones is a wall that stays open.
//
// The allowance goes with them, for the same reason: it is a fact about a
// person, and the person at this browser has just changed. So do the person's
// own letters.
export function forgetLetters() {
  BY_HANDLE.clear()
  BY_ID.clear()
  ORDERED.clear()
  PRESSED.clear()
  GATED = null
  FREE = null
  QUOTA = null
  MINE = null
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
      // Every name the resolver knew is learned by the resolver's own memo
      // on the way through (api/handles.js learnHandle), the way the search
      // rows are, so every disc on the field draws its picture off this one
      // read and no face costs a request of its own.
      out.tiles.forEach(learnHandle)
      out.tiles.forEach((t) => { if (t.kind === 'name') learnName(t.handle, t.name) })
      // and the paper of the newest letter under each key, so every disc
      // on the field draws it off this one read (looks.js learnLook)
      out.tiles.forEach((t) => learnLook(t.handle, t.look))
      TILES = out.tiles
      TILES_AT = Date.now()
      TILES_ERROR = null
    } else {
      TILES_ERROR = out.error || 'network'
    }
    bump()
  })
}

// ── the first screen's faces, before the first screen ───────────────────────
// The index, and then the pictures of the names that will stand in the light
// when the field is first drawn, fetched and decoded before anything is on
// the screen (api/handles.js warmFaces). The hive seats the index's order
// from the middle of the tile outward, newest first, so the first names in it
// are the ones nearest the light; a phone shows a few dozen at full size and
// the rest are at the rim or off it. The shell holds the intro on this, with
// a ceiling, so the wall is drawn with its faces on it and never with sixty
// grey discs filling in a second later.
const WARM_FIRST = 32

export function warmWall() {
  return loadWall().then(() => warmFaces(TILES.slice(0, WARM_FIRST).map((t) => t.handle)))
}

// ── and the rest of them, in the idle time after ────────────────────────────
// The field can draw the first two hundred and forty names (Hive.jsx CAP),
// and a pull, a pinch or an hour's drift brings any of them onto the glass.
// A face that is not yet in the browser's memory arrives as a monogram and
// fades to a picture, which on a pinch is forty faces fading at once at the
// rim. So once the wall is up the rest are fetched and decoded a couple of
// dozen at a time, in idle time, spaced out, and a face already warm costs
// nothing. Once per reading of the index.
const WARM_ALL = 240
const WARM_BATCH = 24
const WARM_GAP_MS = 400
let WARMED = null
export function warmRest() {
  if (typeof window === 'undefined' || WARMED === TILES) return
  WARMED = TILES
  const rest = TILES.slice(WARM_FIRST, WARM_ALL).map((t) => t.handle)
  let i = 0
  const step = () => {
    if (WARMED !== TILES) return
    const part = rest.slice(i, i + WARM_BATCH)
    i += WARM_BATCH
    if (!part.length) return
    warmFaces(part).then(() => window.setTimeout(step, WARM_GAP_MS))
  }
  const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 900))
  idle(() => step())
}

// ── the wall, watched ───────────────────────────────────────────────────────
// A letter going up on another phone should be seen going up on this one.
// Two clocks, and the slower one is the floor: the index is read again every
// three quarters of a minute while the tab is on the screen, and again the
// moment the tab comes back to it; and a nudge over Realtime, sent by the
// edge function after a letter goes up (api.js subscribeWall), reads it at
// once, at most once every few seconds. The nudge carries nothing: it says
// the index moved, and the read is the same public read as on landing. A
// project with Realtime off loses the nudge and keeps the clock. The hive
// seats a name that has arrived in a free cell and lets it rise there, and
// moves nobody else (Hive.jsx tileUp).
const LIVE_MS = 45_000
const NUDGE_MIN_MS = 4_000
export function watchWall() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  let last = 0
  const again = (force) => {
    if (document.visibilityState !== 'visible') return
    const now = Date.now()
    if (force && now - last < NUDGE_MIN_MS) return
    last = now
    loadWall(force)
  }
  const tick = window.setInterval(() => again(false), LIVE_MS)
  const onVis = () => { if (document.visibilityState === 'visible') again(false) }
  document.addEventListener('visibilitychange', onVis)
  const off = api.subscribeWall(() => again(true))
  return () => {
    window.clearInterval(tick)
    document.removeEventListener('visibilitychange', onVis)
    off()
  }
}

// How many letters are left, and when one comes back. Asked by the composer
// on mount and again after one goes up, because the wait the writer is told
// has to be the wait the server would refuse them on.
export function loadQuota(force = false) {
  if (!force && QUOTA) return Promise.resolve()
  return once('quota', async () => {
    const out = await api.quota()
    if (!out.ok) return
    QUOTA = out
    bump()
  })
}

// This person's own letters, and where each one stands. Asked when the wall
// is landed on by a device that has put something up, and again after a
// letter goes up. Held for a short while like the index, so walking back and
// forth between the wall and a sheet is not a request each time.
let MINE_AT = 0
export function loadMine(force = false) {
  if (!force && MINE && Date.now() - MINE_AT < FRESH_MS) return Promise.resolve()
  return once('mine', async () => {
    const out = await api.mine()
    if (!out.ok) return
    MINE = out.letters
    MINE_AT = Date.now()
    bump()
  })
}

export function loadHandle(raw, force = false) {
  const h = targetKey(raw)
  if (!h) return Promise.resolve()
  if (!force && BY_HANDLE.has(h)) return Promise.resolve()
  return once(`h:${h}`, async () => {
    const asked = Date.now()
    const out = await api.lettersFor(h)
    if (!out.ok) return
    GATED = out.gated
    if (out.free) FREE = out.free
    if (out.kind === 'name') learnName(h, out.name)
    if (out.letters.length) learnLook(h, out.letters[0].look)
    const letters = out.letters.map((l) => held(l, asked))
    BY_HANDLE.set(h, letters)
    for (const l of letters) BY_ID.set(l.id, l)
    bump()
  })
}

export function loadLetter(id, force = false) {
  if (!id) return Promise.resolve()
  if (!force && BY_ID.has(id)) return Promise.resolve()
  return once(`l:${id}`, async () => {
    const asked = Date.now()
    const out = await api.letter(id)
    if (!out.ok) {
      // A letter that is gone is a fact worth caching, so a screen that keeps
      // asking about a removed id does not keep asking. A network that did not
      // answer is not that fact, and caching it drew "That letter has come
      // down." over a letter that was up, for the rest of the session.
      if (out.error === 'gone') { BY_ID.set(id, null); bump() }
      return
    }
    GATED = out.gated
    if (out.free) FREE = out.free
    if (out.letter?.kind === 'name') learnName(out.letter.to, out.letter.name)
    BY_ID.set(id, held(out.letter, asked))
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
//   ONE LETTER   any reader through the read gate can report it, and it is
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
//
// ── and it is answered from a memo ──────────────────────────────────────────
// The shape is built once per reading of the index, and a name that has not
// changed between two readings is the same object it was. The hive hands each
// disc its name and its count and re-renders a disc only when those move, and
// the wall's screen keys its whole layout off this array's identity; so a
// revision that did not touch the index (a letter's words landing, a heart,
// this person's own letters being read again) costs the field nothing. It used
// to build sixty new objects on every call, the screen called it on every
// revision, and every disc on the field was re-rendered for each of them: a
// press on a name, which asks for its letters, was answered with a hitch on
// the frame the card was opening.
function shapeTile(t, was) {
  if (was && was.count === t.count && was.at === t.at && was.known === t.known
    && was.name === t.name && was.verified === t.verified && was.avatar === t.avatar
    && was.campus === t.campus && was.edu === t.edu
    && was.hearts === t.hearts && was.berkeley === t.berkeley && was.berkeleyAt === t.berkeleyAt
    && lookKey(was.look) === lookKey(t.look)) return { ...was, look: was.look }
  return {
    ...t,
    weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
    seed: hash(t.handle),
  }
}
//
// ── and it is the field the filter shows ──
// `wall()` is what the field draws and what the deck turns through: the
// names the filter lets through, in its order (the filter, below), memoised
// on the reading AND the filter, so it is the same array until one of the
// two moves. `wall(true)` is every name in the index's own order, for what
// is about the whole wall whatever the field shows (the find sheet's six
// names most recently written to).
let SHAPED = { of: null, all: [], filter: null, tiles: [] }
let SHAPES = new Map()
export function wall(every = false) {
  if (SHAPED.of !== TILES) {
    const all = TILES.map((t) => shapeTile(t, SHAPES.get(t.handle)))
    SHAPES = new Map(all.map((t) => [t.handle, t]))
    SHAPED = { of: TILES, all, filter: null, tiles: [] }
  }
  if (every) return SHAPED.all
  if (SHAPED.filter !== FILTER) SHAPED = { ...SHAPED, filter: FILTER, tiles: sieve(SHAPED.all, FILTER) }
  return SHAPED.tiles
}

// The masthead's number. The sum off the index rather than a second count, so
// it cannot disagree with the tiles under it.
export function liveCount() {
  return TILES.reduce((n, t) => n + t.count, 0)
}

// ── the filter ──────────────────────────────────────────────────────────────
// The owner, 26 September: "Add a filtering mechanism, to see only Berkeley,
// newest, most liked, these kind of things. Make it clean." So the field can
// be looked at four ways, one at a time, and the choice is kept for as long
// as the tab is (sessionStorage), because a filter is where somebody is
// looking this visit and not a setting they made:
//
//   all        every name, as the wall has always been seated: the newest
//              written to nearest the light, and nobody moving after that
//   newest     the names written to this week, newest first; and never
//              fewer than the dozen newest, so a quiet week still shows what
//              came in last rather than a field of three
//   most liked the names whose letters carry a heart, the most hearted
//              first, which is every heart on every letter under the name
//              added up, the count each letter shows (migration 0067)
//   Berkeley   the names with a letter from a verified Berkeley address, the
//              one that carries the Cal sticker, newest of those first
//
// What it changes is what the field shows and in what order: the hive seats
// a filtered field afresh, its first name in the light and the rest outward
// in the filter's order (Hive.jsx, the tile), and the deck turns through the
// names in the same order, so a person reading the most liked turns from
// one to the next most liked. Under a name the letters follow the filter
// where the filter says something about letters (`ordered`, below): the
// most hearted first, or the Berkeley ones first. It filters nothing out of
// a name, since a filter is a way of looking at the wall and never a way of
// hiding a letter from somebody who opened one.
//
// The numbers are the server's, on the index (0067). On a database from
// before them the Berkeley cut falls back to the newest letter's sticker,
// and most liked is not offered (`filtersOpen`), rather than drawn empty.
export const FILTERS = [
  { key: 'all', word: 'all' },
  { key: 'new', word: 'newest' },
  { key: 'liked', word: 'most liked' },
  { key: 'berkeley', word: 'Berkeley' },
]
const FILTER_STORE = 'celestual.wall.filter'
const NEW_DAYS = 7
const NEW_FLOOR = 12
function readFilter() {
  try {
    const k = typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem(FILTER_STORE)
    return FILTERS.some((f) => f.key === k) ? k : 'all'
  } catch {
    return 'all'
  }
}
let FILTER = readFilter()
export function wallFilter() { return FILTER }

// One choice at a time. A new one drops the order the last one gave each
// name's letters, and moves the field: every screen reading `wall()` is
// told by the revision.
export function setWallFilter(key) {
  if (!FILTERS.some((f) => f.key === key) || key === FILTER) return
  FILTER = key
  ORDERED.clear()
  try { sessionStorage.setItem(FILTER_STORE, key) } catch { /* a private tab keeps it in memory */ }
  bump()
}

// Which of the four this index can answer: all four once the index carries
// the hearts (0067); without them, most liked stays off the menu. A filter
// that is on and stops being answerable reads as all.
export function filtersOpen() {
  const all = wall(true)
  const hearts = !all.length || all.some((t) => t.hearts !== null)
  return FILTERS.filter((f) => f.key !== 'liked' || hearts).map((f) => f.key)
}

// the Berkeley cut: the server's count, or on an older index the newest
// letter's sticker
const berkeleyOf = (t) => (t.berkeley !== null && t.berkeley !== undefined
  ? t.berkeley > 0
  : !!t.edu && t.campus === 'berkeley')

function sieve(all, key) {
  if (key === 'new') {
    const byAt = [...all].sort((a, b) => b.at - a.at)
    const since = Date.now() - NEW_DAYS * DAY
    const week = byAt.filter((t) => t.at >= since)
    return week.length >= NEW_FLOOR ? week : byAt.slice(0, NEW_FLOOR)
  }
  if (key === 'liked') {
    if (!all.some((t) => t.hearts !== null)) return all
    return all.filter((t) => t.hearts > 0).sort((a, b) => b.hearts - a.hearts || b.at - a.at)
  }
  if (key === 'berkeley') {
    return all.filter(berkeleyOf).sort((a, b) => (b.berkeleyAt || b.at) - (a.berkeleyAt || a.at))
  }
  return all
}

// ── and the letters under a name, in the filter's order ──
// Most liked: the most hearted first. Berkeley: the letters from a verified
// Berkeley address first, newest first, and then the rest as they were.
//
// Worked out once per name and filter and then held: a heart pressed while
// the name is being read moves the count on the card and not the card, so
// the letter before and the letter after do not swap places under the
// reader's thumb. A letter that arrives while it is held goes after the
// ones already there. A new filter works every name out afresh.
const ORDERED = new Map() // key -> { of, ids, list }
const calOf = (l) => (l.verified && l.campus === 'berkeley' ? 1 : 0)
function orderOf(list) {
  if (FILTER === 'liked') return [...list].sort((a, b) => (b.hearts || 0) - (a.hearts || 0) || b.at - a.at)
  if (FILTER === 'berkeley') return [...list].sort((a, b) => calOf(b) - calOf(a) || b.at - a.at)
  return list
}
function ordered(k, list) {
  const was = ORDERED.get(k)
  if (was && was.of === list) return was.list
  let out
  if (was) {
    const rank = new Map(was.ids.map((id, i) => [id, i]))
    const kept = list.filter((l) => rank.has(l.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id))
    out = [...kept, ...orderOf(list.filter((l) => !rank.has(l.id)))]
  } else {
    out = orderOf(list)
  }
  ORDERED.set(k, { of: list, ids: out.map((l) => l.id), list: out })
  return out
}

// ── reading ─────────────────────────────────────────────────────────────────
// Both of these answer out of the cache. A caller that wants them filled calls
// the matching loader first, or renders the empty state and lets the
// subscription bring it back.
export function lettersFor(handle) {
  const k = targetKey(handle)
  const list = BY_HANDLE.get(k)
  if (!list) return []
  return FILTER === 'liked' || FILTER === 'berkeley' ? ordered(k, list) : list
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
  return BY_HANDLE.has(targetKey(handle))
}

// The search. The server orders it: exact handle first, then anything
// containing what was typed, so a person who half-remembers a handle still
// lands somewhere and a person who types their own exact handle lands on
// themselves rather than on a list of near-misses.
//
// Every row the resolver already knew is learned by the resolver's own memo
// on the way through (api/handles.js learnHandle), so the faces and names in
// the list draw at once and cost no request of their own.
//
// The query goes as typed (0054): the server hears a name, a space, an accent
// and a misspelling, and this module no longer strips them on the way out.
export async function search(query) {
  const rows = await api.wallSearch(query)
  rows.forEach(learnHandle)
  rows.forEach((t) => { if (t.kind === 'name') learnName(t.handle, t.name) })
  rows.forEach((t) => learnLook(t.handle, t.look))
  return rows.map((t) => ({
    ...t,
    weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
    seed: hash(t.handle),
  }))
}

// ── writing ─────────────────────────────────────────────────────────────────
// Not an insert. The letter goes to celestual-wall-moderate, which screens it
// and writes it in one request, and comes back with one of two answers:
//
//   live      it is on the wall, whether the screen passed it or flagged it
//             for a person to read while it stands (migration 0050)
//   rejected  it is not going up, and `reasons` says what it was read as
//
// Flagged and published read the same on purpose. A screen that distinguished
// them would be a way to find out what gets through by writing until something
// does.
//
// `kind` is 'handle' or 'name' (0053). The key the letter was filed under
// comes back on the answer; it is derived here only when an older function
// did not say. `look` is the paper (0055), and the key learns it at once so
// the disc the wall lights is already on that paper.
//
// Version 2 (the one wall, docs/ONE-WALL.md) adds the salutation, a name
// note's school, and the draft's nonce, and a third answer: `pending`, a name
// note read by the classifier and waiting on the desk. It is not on the wall
// yet, so nothing on the wall moves for it; this device's own letters are
// read again, where it is listed as waiting.
export async function write({ to, body, source, kind = 'handle', name = '', look = null, salutation = null, campus = null, nonce = '' }) {
  const out = await api.write({ to, body, source, kind, name, look, salutation, campus, nonce })
  if (out?.ok && out.status === 'live') {
    const h = out.handle || (kind === 'name' ? nameKey(name) : normHandle(to))
    if (kind === 'name') learnName(h, out.name || cleanName(name))
    learnLook(h, out.look === undefined ? look : out.look)
    BY_HANDLE.delete(h)
    TILES_AT = 0
    await Promise.all([loadWall(true), loadHandle(h, true), loadQuota(true), loadMine(true)])
    bump()
  }
  if (out?.ok && out.status === 'pending') {
    if (kind === 'name') learnName(out.handle || nameKey(name), out.name || cleanName(name))
    await loadMine(true)
  }
  // A refusal moves the count too. 'cap' means the server disagreed with the
  // number this browser was drawing, and the meter has to end up saying what
  // the server just said rather than what it thought a second ago.
  if (out && !out.ok && out.error === 'cap') await loadQuota(true)
  return out || { ok: false, error: 'network' }
}

// ── the draft, and what it posts as ─────────────────────────────────────────
// The composer keeps its draft in the store (store.js `draft`), so a reload,
// a second tab, or a walk to the inbox and back never costs anybody what they
// wrote. What the draft holds is what the writer chose:
//
//   kind    'handle' (an @) or 'name' (anything else)
//   to      the @, in @ mode
//   name    the name, in name mode, and `at`, the @ the name nudge asks for
//           under it: with one, the letter goes to the @ and the name is its
//           greeting ("dear sofia"), and it is an @-note like any other
//   body, look
//   greet   the "dear" line as the writer edited it, or null while it
//           follows the name
//   school  a name note's school, a campus slug, or '' for none
//   nonce   made once per draft (`newNonce`), so the same draft posted twice
//           is one letter (docs/ONE-WALL.md)
//   held    the Berkeley link it is waiting on, once one is out:
//           { email, request, match, at }
//
// `draftPost` turns that into what goes up, and `postDraft` sends it and, if
// it went, lands it: the composer calls it on the press, and the verify page
// (screens/Verify.jsx) calls it for a draft that was waiting on the link.
export function newNonce() {
  const b = new Uint8Array(16)
  try { crypto.getRandomValues(b) } catch { for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256) }
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function draftPost(d) {
  if (!d) return null
  const body = String(d.body || '').trim()
  const nm = cleanName(d.name)
  const at = normHandle(d.at)
  const viaAt = d.kind === 'name' && validHandle(at)
  const kind = d.kind === 'handle' || viaAt ? 'handle' : 'name'
  const handle = d.kind === 'handle' ? normHandle(d.to) : viaAt ? at : ''
  if (!body || (kind === 'handle' ? !validHandle(handle) : !nm)) return null
  const greet = d.greet == null ? '' : String(d.greet).replace(/\s+/g, ' ').trim().slice(0, 40)
  return {
    kind,
    handle,
    name: kind === 'name' ? nm : '',
    key: kind === 'name' ? nameKey(nm) : handle,
    body,
    look: d.look || null,
    // the writer's own line; or, for a name with its @, "dear" and the name,
    // which is not the line the letter would say by itself
    salutation: greet || (viaAt && nm ? `dear ${nm}` : null),
    campus: kind === 'name' && d.school ? String(d.school) : null,
  }
}

// What went up, written down on this device: the letter, the key it is
// filed under, the name for a name key, and the pulse the wall sends out
// from the name once the sheet has gone. A letter waiting on the desk is
// written down too, and sends no pulse, since it is not on the wall.
export function landLetter(out, p) {
  const was = getState()
  const filed = out.handle || p.key
  patch({
    draft: null,
    written: [out.id, ...(was.written || [])].slice(0, 12),
    wroteTo: [filed, ...(was.wroteTo || []).filter((x) => x !== filed)].slice(0, 12),
    names: p.kind === 'name' ? { ...(was.names || {}), [filed]: out.name || p.name } : (was.names || {}),
    justPosted: out.status === 'live' ? filed : '',
  })
}

export async function postDraft(d) {
  const p = draftPost(d)
  if (!p) return { ok: false, error: 'empty' }
  if (p.kind === 'name') learnName(p.key, p.name)
  const out = await write({
    to: p.handle, body: p.body, source: getState().source || null, kind: p.kind, name: p.name,
    look: p.look, salutation: p.salutation, campus: p.campus, nonce: d.nonce || '',
  })
  if (out?.ok && (out.status === 'live' || out.status === 'pending')) landLetter(out, p)
  return out || { ok: false, error: 'network' }
}

// ── the schools a name note can carry ───────────────────────────────────────
// Asked once, when the composer first needs them (api.js `campuses`).
let CAMPUS_LIST = null
export function openCampuses() { return CAMPUS_LIST }
export function loadCampuses() {
  if (CAMPUS_LIST) return Promise.resolve()
  return once('campuses', async () => {
    const out = await api.campuses()
    CAMPUS_LIST = out.campuses || []
    bump()
  })
}

// ── the heart ───────────────────────────────────────────────────────────────
// Drawn at once and corrected by the answer: the card's count moves under
// the finger, and the server's number replaces it when it lands. A refusal
// puts back what was there. Every copy of the letter in the cache moves
// together, so the pager and the wall behind it agree, and so does the
// writer's own list, when it is their letter (the account sheet's count).
//
// ── and nothing read before it lands can take it back ──
// Opening a letter asks for it and then for the rest of its name's letters,
// and a heart pressed while the second read is still out used to be undone
// by it: the answer to a question asked before the press came back after
// it, wrote the letter over as it was, and the key went dark again under a
// heart the server had counted. The heart the gate presses on the way back
// in (Gate.jsx `finish`) is in the same race from the start: it goes out
// over a cache the sign in has just emptied, beside the letter's own read.
// So a press is held here, by the letter's id, until a read that was ASKED
// after the server answered it: while it is out, a read carries the press on
// top of whatever it says, and once it has landed, a read that set out before
// then carries the server's own number.
const PRESSED = new Map()   // id -> { on, hearts, at }; `at` is 0 while the press is out

function toward(l, on) {
  return {
    ...l,
    hearted: !!on,
    hearts: Math.max(0, (l.hearts || 0) + (on ? (l.hearted ? 0 : 1) : (l.hearted ? -1 : 0))),
  }
}

function held(l, asked) {
  const p = l && PRESSED.get(l.id)
  if (!p) return l
  if (!p.at) return toward(l, p.on)
  return p.at >= asked ? { ...l, hearts: p.hearts, hearted: p.on } : l
}

export async function heart(id, on) {
  const was = BY_ID.get(id) || null
  const set = (fn) => {
    const cur = BY_ID.get(id)
    if (cur) BY_ID.set(id, fn(cur))
    for (const [h, list] of BY_HANDLE) BY_HANDLE.set(h, list.map((l) => (l.id === id ? fn(l) : l)))
    bump()
  }
  PRESSED.set(id, { on: !!on, at: 0 })
  set((l) => toward(l, on))
  const out = await api.heart(id, on)
  if (out?.ok) {
    const n = Number(out.hearts) || 0
    PRESSED.set(id, { on: !!out.hearted, hearts: n, at: Date.now() })
    if (MINE) MINE = MINE.map((l) => (l.id === id ? { ...l, hearts: n } : l))
    set((l) => ({ ...l, hearts: n, hearted: !!out.hearted }))
  } else {
    PRESSED.delete(id)
    // put back what was there; and where nothing was, as on the press the
    // gate makes on the way back in, the read that landed while the press
    // was out carried it (`held`), so it is taken back off that read
    if (was) set((l) => ({ ...l, hearts: was.hearts, hearted: was.hearted }))
    else set((l) => toward(l, !on))
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

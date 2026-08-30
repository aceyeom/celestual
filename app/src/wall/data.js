// ── the wall's data layer ───────────────────────────────────────────────────
//
// Everything here is in memory. This build is a visual prototype: it reaches
// no server, it stores nothing anybody typed anywhere but this tab, and it is
// meant to be walked through on a phone with no project provisioned behind it.
//
// ── the wall is anonymous, and that is structural ───────────────────────────
// There is no author field on a letter. Not hidden, not hashed, not withheld
// pending something — absent. Nothing in this module records, derives or could
// later reconstruct who wrote anything, because the wall has no accounts, no
// sign-in, no handle of its own for the reader, and nothing to attach a writer
// to even if it wanted one.
//
// That is the guarantee the printed card makes, and it is cheap to keep as
// long as the shape is right from the start: a letter is a handle it is about,
// a body, and a time. Three fields. There is no fourth one to leak.
//
// The core service is where identity lives, and it is somewhere else entirely
// — reached only from the tab that appears once you have put a letter up, and
// never wired to anything here.

import { SEED } from './seed.js'
import { getState, patch, push } from './store.js'

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

function idFor(str) {
  const h = hash(str)
  const g = hash(str + ':g')
  return `l${h.toString(36)}${g.toString(36)}`.slice(0, 12)
}

// ── the corpus, built once ──────────────────────────────────────────────────
// Ages spread across a thirty-day window so the wall reads as something that
// has been accumulating rather than something that was installed this morning,
// and they are derived from the id so a letter is the same age on every reload.
// A timestamp that moves when you refresh is a timestamp nobody believes.

const NOW = Date.now()

const LETTERS = SEED.map((row, i) => {
  const id = idFor(`${row.h}:${i}`)
  const ageH = 2 + Math.floor(rand(id, 1) * 30 * 24)
  return { id, to: row.h, body: row.b, at: NOW - ageH * 3600000 }
}).sort((x, y) => y.at - x.at)

// Anything written during a session is prepended here, so the wall a person
// walks away from is the wall their own letter is on.
const WRITTEN = []

// ── coming off the wall ─────────────────────────────────────────────────────
//
// Listing somebody's handle on a public wall says, in public, that they are
// being written about. They did not ask for that and they never agreed to it,
// so the way back off has to cost them less than being on it does.
//
// There are two doors back off, and they cost different things because they
// are not the same act:
//
//   ONE LETTER   any signed-in reader can report it, and it is off the wall on
//                the tap. See `report` below. Nothing is proven, nothing is
//                asked, and nothing is destroyed — because a wrong report costs
//                one letter a day in a queue, and a slow one costs the subject
//                the day it was up.
//   A WHOLE NAME `removeHandle`, and it is the one action on this surface that
//                cannot be undone. Every letter anybody ever wrote to that
//                handle goes with it, and the name can never be put back up —
//                so it is the one place the wall asks who is asking, through
//                the Instagram handoff (auth.js `verifyHandle`) and nothing
//                else. Not an account, not an address, not a form: one
//                question, asked once, about the one handle in play.
//
// The proof is here and not on the report for the reason that decides every
// other rule on this surface: it is the asymmetry, not the effort. Holding one
// letter is reversible by a person at a desk in a minute. Emptying a name is
// reversible by nobody, ever, and it takes with it forty letters written by
// people who are not in the room.
//
// It lives in the store rather than in this module so that it survives a
// reload the way a real removal would, and so the reset clears it with
// everything else.
export function removed() { return getState().removed || [] }

export function isRemoved(handle) {
  return removed().includes(normHandle(handle))
}

// Returns how many letters went with the name, which is the one fact the
// screen has to be able to state plainly before it happens and after.
export function removeHandle(handle) {
  const h = normHandle(handle)
  if (!h || isRemoved(h)) return 0
  const n = lettersFor(h).length
  push('removed', h)
  REV += 1
  return n
}

// ── a report ────────────────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  IT COMES DOWN FIRST. IT IS REASONED ABOUT SECOND. IT IS NEVER DELETED.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The order is the whole design. A queue that leaves the letter up while
// somebody decides whether the report was fair has protected the wrong person:
// the screenshot exists before the decision does, and the subject has already
// had the day it gave them. So the tap takes it off the wall, out of the
// search, out of the count, before a single word of reasoning happens.
//
// And it is HELD, not deleted. `reported` is a list of ids the wall filters
// out — the row is still there, the words are still there, and a person at a
// desk can read it and put it back up. A takedown that destroys the evidence
// is a takedown nobody can be wrong about in the direction of the writer, and
// on a wall where anybody signed in can report anything, being wrong in that
// direction is the common case.
export function reported() { return getState().reported || [] }

export function isReported(id) { return reported().includes(id) }

// The reasons live in memory for this session only. There is no server here to
// send one to, and a reason kept in localStorage would be a private accusation
// sitting in the tab of whoever borrows the phone next.
const REASONS = new Map()

export function report(id, reason) {
  const one = all().find((l) => l.id === id)
  if (!one) return null
  push('reported', id)
  if (reason) REASONS.set(id, String(reason).trim().slice(0, 240))
  REV += 1
  return one
}

// The way back up, which is the reason the row was kept. It is not reachable
// from this surface and it should not be: restoring is a desk's decision made
// against the letter and the report side by side, and the desk is the admin
// dashboard in the production app, not a button on the wall.
export function restore(id) {
  const s = getState()
  patch({ reported: (s.reported || []).filter((r) => r !== id) })
  REASONS.delete(id)
  REV += 1
}

// What a desk would be looking at. Exported so the review queue has something
// real to read the day it is wired up, rather than a shape invented later.
export function heldForReview() {
  const off = reported()
  return WRITTEN.concat(LETTERS)
    .filter((l) => off.includes(l.id))
    .map((l) => ({ ...l, reason: REASONS.get(l.id) || '' }))
}

// ── the revision ────────────────────────────────────────────────────────────
// The corpus changes in exactly two places — a letter goes up, a name comes
// off — and both of them happen on a SHEET raised over a wall that never
// unmounts. A wall that memoises its tiles on an empty dependency list is a
// wall that is still showing the name somebody just took down, on the screen
// they took it down from.
//
// A counter rather than a subscription: the shell already re-renders on every
// route change, which is the only moment the wall can come back into view, so
// reading a number at that moment is enough and there is nothing to unsubscribe.
let REV = 0
export function revision() { return REV }

// The live corpus: everything that has not had its name taken off the wall and
// has not been reported down. Both filters are here, in one function, so there
// is no path through this module that can produce a letter the wall has
// already decided is not on it.
function all() {
  const off = removed()
  const down = reported()
  let live = WRITTEN.concat(LETTERS)
  if (off.length) live = live.filter((l) => !off.includes(l.to))
  if (down.length) live = live.filter((l) => !down.includes(l.id))
  return live
}

// ── the wall ────────────────────────────────────────────────────────────────
// The wall is a wall of HANDLES, not of letters: one tile per recipient,
// carrying however many letters that recipient has. A handle written to three
// times should read as heavier than one written to once, and it does — the
// tile's weight and scale come off the count.

export function wall() {
  const byHandle = new Map()
  for (const l of all()) {
    const cur = byHandle.get(l.to)
    if (cur) { cur.count += 1; cur.mine = cur.mine || !!l.mine; if (l.at > cur.at) cur.at = l.at }
    else byHandle.set(l.to, { handle: l.to, count: 1, at: l.at, mine: !!l.mine })
  }
  return [...byHandle.values()]
    .map((t) => ({
      ...t,
      // Three weights, and the split is by count first and by luck second, so
      // the field has texture without a run of equal-looking rows.
      weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
      seed: hash(t.handle),
    }))
    .sort((a, b) => b.at - a.at)
}

export function liveCount() { return all().length }
export function handleCount() { return new Set(all().map((l) => l.to)).size }

// ── reading ─────────────────────────────────────────────────────────────────

export function lettersFor(handle) {
  const h = normHandle(handle)
  return all().filter((l) => l.to === h)
}

export function letter(id) {
  return all().find((l) => l.id === id) || null
}

// The search. Exact handle first, then anything containing what was typed —
// so a person who half-remembers a handle still lands somewhere, and a person
// who types their own exact handle lands on their own letter and not on a list
// of near-misses.
export function search(query) {
  const q = normHandle(query)
  if (q.length < 2) return []
  const tiles = wall()
  const exact = tiles.filter((t) => t.handle === q)
  const near = tiles
    .filter((t) => t.handle !== q && t.handle.includes(q))
    .sort((a, b) => a.handle.indexOf(q) - b.handle.indexOf(q) || a.handle.length - b.handle.length)
  return exact.concat(near).slice(0, 24)
}

// ── writing ─────────────────────────────────────────────────────────────────
// Nothing leaves the tab. The letter is prepended to the corpus so the wall it
// goes back to is visibly one letter heavier, which is the entire payoff of
// the posting screen and the reason the prototype bothers to keep a corpus in
// memory rather than rendering a static list.

export function write({ to, body }) {
  const h = normHandle(to)
  // A name that has come off the wall stays off it. Otherwise the removal is a
  // delete button rather than a decision, and the next person to type the
  // handle undoes it without ever knowing it happened.
  if (isRemoved(h)) return null
  const id = idFor(`${h}:${body}:${Date.now()}`)
  // `mine` is a flag for this tab and this session only. It is what lets the
  // wall light the name you just put up; it is not an author record, it never
  // leaves the browser, and clearing the tab clears it.
  const row = { id, to: h, body: String(body || '').trim(), at: Date.now(), mine: true }
  WRITTEN.unshift(row)
  REV += 1
  return row
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

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE CORE SERVICE'S OWN DATA — THE LEDGER, AND THE CLOCK UNDER IT        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall has no accounts, no pings and no idea who anybody is (data.js says
// so at length, and means it). Everything in this file is the other side of
// that line: it exists only once somebody has registered, it is reached from
// exactly one control, and nothing here is ever read by the wall.
//
// ── one clock, and it is not the wall's ─────────────────────────────────────
// The wall reads `Date.now()` because its letters are a stream and their ages
// are the only thing anybody wants off them. This surface cannot: it is a
// sixty-day countdown, it opens on a printed date (seed.js TODAY), and it
// raises sheets carrying dated cards over the top of that date.
//
// The old screen did both at once. It printed 17.03.2026 on the ledger and
// then dated the card in the sheet off the real system clock, so the pair of
// letters somebody opened at a demo table was stamped five months after the
// date on the screen behind it. A prototype that contradicts itself between
// two layers of the same screen is a prototype the room stops believing.
//
// So: ONE epoch, derived from the printed date, and every day, dateline and
// countdown on this surface comes off it.
//
// ── what is real inside the tab ─────────────────────────────────────────────
// Placing, renewing and letting go all write through store.js, the same one
// key everything else uses, so they survive a reload the way the real actions
// would and are cleared by the same reset. They reach no server, because there
// is no server here — and a build that mimed one would be lying about the one
// mechanism it exists to demonstrate.

import { LEDGER, TODAY } from './seed.js'
import { normHandle } from './data.js'
import { getState, patch } from './store.js'

const DAY = 86400000

// Noon, so nothing here lands on a boundary a timezone can push across a day.
export const NOW = new Date(TODAY.y, TODAY.m - 1, TODAY.d, 12, 0, 0).getTime()

// A ping stands sixty days. Renewing restarts them, free, as often as somebody
// feels it, and it never costs a slot.
export const SPAN = 60

// The last week of the sixty. Inside it a ping is LAPSING, which is a state
// and not a warning: nothing is lost at the moment it lapses except the ping
// itself, and the slot comes back.
export const NEAR = 7

// Two standing pings, and this is the whole of the product's scarcity. A
// mutual does NOT hold one: the slot rations pings nobody has answered yet,
// which is what makes placing one mean something, and a pair that has already
// closed is not waiting on anybody.
export const CAP = 2

// ── the session's own edits ─────────────────────────────────────────────────
// Held as a delta against the seed rather than as a copy of it, so the seeded
// ledger stays the single description of what this screen opens on and a
// reload cannot end up with two of them disagreeing.
function delta() {
  const s = getState().orbit
  return {
    placed: (s && s.placed) || [],
    renewed: (s && s.renewed) || {},
    released: (s && s.released) || [],
  }
}

function saveDelta(next) {
  patch({ orbit: { ...delta(), ...next } })
}

// ── the ledger ──────────────────────────────────────────────────────────────
// `days` is derived, never stored. A stored countdown is a number that is
// right once and wrong every time anybody comes back to it.
function shape(row) {
  const { renewed } = delta()
  const from = renewed[row.id] || row.placedAt
  const spent = Math.floor((NOW - from) / DAY)
  const days = Math.max(0, SPAN - spent)
  const state = row.theirs ? 'mutual' : days <= NEAR ? 'lapsing' : 'standing'
  return { ...row, placedAt: from, days, spent: SPAN - days, state, run: (SPAN - days) / SPAN }
}

// The seed, dated backwards off the one clock. seed.js carries `days` because
// that is the number the screen is about; the date it implies is worked out
// here so both halves can never drift.
const SEEDED = LEDGER.map((p) => ({
  id: p.id,
  handle: p.handle,
  yours: p.yours,
  theirs: p.theirs || '',
  // Theirs landed somewhere in the middle of the wait. Both cards carrying the
  // same date would say the pair was written in one morning, which is the one
  // thing a sixty-day mechanism must never imply.
  answeredAt: p.theirs ? NOW - Math.round((SPAN - p.days) / 2) * DAY : 0,
  placedAt: NOW - (SPAN - p.days) * DAY,
  seeded: true,
}))

export function pings() {
  const { placed, released } = delta()
  return [...SEEDED, ...placed]
    .filter((p) => !released.includes(p.id))
    .map(shape)
    .sort((a, b) => {
      // Mutual first, because it is the only row anybody opens this screen to
      // find. Then whatever is closest to running out, because that is the
      // only row anybody has to DO something about.
      if ((a.state === 'mutual') !== (b.state === 'mutual')) return a.state === 'mutual' ? -1 : 1
      return a.days - b.days
    })
}

export function ping(id) {
  return pings().find((p) => p.id === id) || null
}

// ── the slots ───────────────────────────────────────────────────────────────
export function slots() {
  const held = pings().filter((p) => p.state !== 'mutual')
  return { held: held.length, cap: CAP, open: Math.max(0, CAP - held.length), full: held.length >= CAP }
}

// When the next slot opens on its own: the soonest a standing ping lapses.
// A locked door with no date on it is not scarcity, it is just a locked door.
export function nextOpen() {
  const held = pings().filter((p) => p.state !== 'mutual')
  if (!held.length) return 0
  return Math.min(...held.map((p) => p.days))
}

// ── placing ─────────────────────────────────────────────────────────────────
export function place({ handle, body }) {
  const h = normHandle(handle)
  if (!h || slots().full) return null
  const row = {
    id: `p-${h}-${Date.now().toString(36)}`,
    handle: h,
    yours: String(body || '').trim(),
    theirs: '',
    answeredAt: 0,
    placedAt: NOW,
  }
  saveDelta({ placed: [...delta().placed, row] })
  return shape(row)
}

// Sixty more days, and it costs nothing. The renewal is stamped against the
// clock this surface runs on, not against the wall's, so a ping renewed at a
// demo table reads 60 rather than a number nobody can explain.
export function renew(id) {
  saveDelta({ renewed: { ...delta().renewed, [id]: NOW } })
  return ping(id)
}

// Letting one go is the only irreversible thing on this surface, and it is
// deliberately cheap to reach: the whole reason the slot exists is that a ping
// you are no longer carrying should be somebody else's turn. Nothing is held
// for review the way a reported letter is, because there is nobody to review
// it for. It was one line, addressed to one person, and it was yours.
export function release(id) {
  const d = delta()
  saveDelta({
    released: d.released.includes(id) ? d.released : [...d.released, id],
    placed: d.placed.filter((p) => p.id !== id),
  })
}

// ── time, in words, off THIS clock ──────────────────────────────────────────
// data.js `ago` reads the system clock, which is right for the wall and wrong
// here for the reason at the top of this file.
export function since(ts) {
  const days = Math.max(0, Math.round((NOW - ts) / DAY))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  const wks = Math.round(days / 7)
  return wks === 1 ? 'a week ago' : `${wks} weeks ago`
}

// The countdown, said the way a person would say it rather than as a number
// with a noun after it. "60 days left" on the day you place one is a clock
// somebody has to read; "sixty days" is the offer they just took.
export function left(days) {
  if (days <= 0) return 'lapsed'
  if (days === 1) return 'one day'
  return `${days} days`
}

export { DAY }

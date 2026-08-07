// pings.js — display helpers for the sixty-day ping clock and the two-slot
// rule. Enforcement lives entirely server-side (migration 0006); this module
// only shapes those facts for the status rows and the slot pips.

import { SLOT_CAP } from './celestual.js'

export const cap = () => SLOT_CAP

// Whole days until a ping lapses (0 = lapsing today; null = unknown/mutual).
export function daysLeft(expiresAt) {
  if (!expiresAt) return null
  const t = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.ceil((t - Date.now()) / 864e5))
}

// A ping is "near lapse" inside its final five days — the row gains the
// one-tap renewal line.
export function nearLapse(expiresAt) {
  const d = daysLeft(expiresAt)
  return d != null && d <= 5
}

// The day a ping lapses, written out. Lowercase, never relative, and never
// abbreviated to a number: "43 days left" is a countdown, "14 oct" is a date
// somebody can put next to the rest of their week.
//
// This is the single most load-bearing string in the slot rule and it was not
// printed anywhere. The day a ping lapses IS the day its slot comes back, so
// hiding it turned a sixty-day clock everyone can plan around into a wall that
// opens whenever it feels like it.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function lapseDate(expiresAt) {
  if (!expiresAt) return ''
  const t = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt)
  if (!Number.isFinite(t)) return ''
  const d = new Date(t)
  const now = new Date()
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`
}

// How many of the caller's pings are standing (unresolved, unlapsed) — the
// local mirror of the server's slot count.
export function standingCount(pings) {
  return (pings || []).filter((p) => !p.mutual && daysLeft(p.expires_at) !== 0).length
}

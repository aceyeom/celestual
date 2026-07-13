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

// How many of the caller's pings are standing (unresolved, unlapsed) — the
// local mirror of the server's slot count.
export function standingCount(pings) {
  return (pings || []).filter((p) => !p.mutual && daysLeft(p.expires_at) !== 0).length
}

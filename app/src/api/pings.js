// pings.js — display helpers for the sixty-day ping clock and the two-slot
// rule. Enforcement lives entirely server-side (migration 0006); this module
// only shapes those facts for the ledger's entries and its slot meter.

import { SLOT_CAP } from './celestual.js'

export const cap = () => SLOT_CAP

// Whole days until a ping runs out (0 = its last day; null = unknown/mutual).
export function daysLeft(expiresAt) {
  if (!expiresAt) return null
  const t = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.ceil((t - Date.now()) / 864e5))
}

// Inside the final five days — the entry's clock takes the one light, and the
// renew action takes it with it.
export function nearLapse(expiresAt) {
  const d = daysLeft(expiresAt)
  return d != null && d <= 5
}

// The day a ping runs out, written out. Nothing displays this any more — the
// ledger shows days left and only days left, because a countdown IS a date and
// printing both is saying one number twice — but the helper stays: it is four
// lines, it is the only correct way to render one of these, and the next thing
// that needs a date (an email, an export) should not have to write it again.
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

// How many of the caller's pings are live (unresolved, unexpired) — the local
// mirror of the server's slot count.
export function standingCount(pings) {
  return (pings || []).filter((p) => !p.mutual && daysLeft(p.expires_at) !== 0).length
}

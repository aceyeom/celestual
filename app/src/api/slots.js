// slots.js — display helpers for the entry-slot budget.
//
// Enforcement lives entirely server-side (supabase/migrations/0003: celestual_submit
// spends a slot per new person and regenerates 1 per week, capped at 3, with no
// refund on withdrawal). This module only shapes that snapshot for the meter and
// the out-of-slots countdown — it never decides whether a seal is allowed.

export function slotsRemaining(slots) {
  const n = slots && Number.isFinite(slots.remaining) ? slots.remaining : 3
  return Math.max(0, n)
}

export function slotsCap(slots) {
  const n = slots && Number.isFinite(slots.cap) ? slots.cap : 3
  return Math.max(1, n)
}

// Milliseconds until the next slot regenerates (0 if full / unknown).
export function msUntilNext(slots) {
  if (!slots || !slots.next_at) return 0
  const t = Date.parse(slots.next_at)
  if (Number.isNaN(t)) return 0
  return Math.max(0, t - Date.now())
}

// A coarse { value, unit } for "a new star in N …", where unit ∈ days|hours|mins
// is an i18n key suffix the component localizes. null when full / unknown.
export function nextSlotIn(slots) {
  const ms = msUntilNext(slots)
  if (ms <= 0) return null
  const mins = Math.ceil(ms / 60000)
  if (mins >= 1440) return { value: Math.max(1, Math.round(mins / 1440)), unit: 'days' }
  if (mins >= 60) return { value: Math.max(1, Math.round(mins / 60)), unit: 'hours' }
  return { value: mins, unit: 'mins' }
}

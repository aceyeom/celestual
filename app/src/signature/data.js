// The shapes, with nothing behind them.
//
// docs/rebuild-spec.md Phase 3 is "static, with real data shapes but no backend
// wiring". So every field name here is the one the schema will actually carry,
// and the values are the only invented part:
//
//   a profile    matches `ig_profiles` in spec section 5, minus `resolved_at`
//                and `avatar_fetched_at`, which are cache bookkeeping and never
//                reach a screen
//   a ping       matches the standing/mutual model the core service already has
//   a letter     matches `beta_letters` in 0027_beta_wall.sql
//
// `avatar` is deliberately null on both profiles. Spec section 5 says a failed
// avatar download stores nothing and the UI falls back to a monogram built from
// the display name, and that a missing avatar must never block a card from
// rendering. The reveal is the surface where that promise is most expensive to
// break, so it is the state drawn here.

export const WALL = {
  campus: 'berkeley',
  // What the masthead counts. Both are real columns on the wall's tables.
  letters: 214,
  standing: 72,
}

export const ME = {
  handle: 'ace03d',
  display_name: 'Ace Yeom',
  is_verified: false,
  avatar: null,
}

export const THEM = {
  handle: 'jules.k',
  display_name: 'Jules Kwarteng',
  is_verified: true,
  avatar: null,
}

// The two halves of one mutual. Each side placed a ping without knowing about
// the other, which is the entire product, and the timestamps are the only
// evidence of it that either person ever sees.
export const MUTUAL = {
  id: 'p_7Q2xk',
  state: 'mutual',
  opened_at: '2026-08-30T21:14:00Z',
  mine: {
    placed_at: '2026-08-19T23:41:00Z',
    line: 'i have wanted to say this since the second week of term.',
  },
  theirs: {
    placed_at: '2026-08-30T21:14:00Z',
    line: 'i kept nearly saying something after class and then not saying it.',
  },
}

// A letter off the wall, for the hero's one piece of real content. Sealed, so
// only `to_handle` and the dateline are readable, which is what the public view
// actually exposes.
export const LETTER = {
  id: 'l_31fA',
  to_handle: 'pilar.echevarria',
  sealed: true,
  standing_days: 11,
  written_at: '2026-08-21T18:02:00Z',
}

// The monogram, when there is no avatar. Initials off the display name, and the
// handle's first letter when a display name is missing too, because a card with
// an empty disc on it is a card that looks broken rather than private.
export function monogram(profile) {
  const name = (profile.display_name || '').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  }
  return (profile.handle || '?').slice(0, 1).toUpperCase()
}

// The distance between two moments, which is not the same number as the age of
// either of them. The reveal's eyebrow was saying one and calling it the other.
export function apart(a, b) {
  const days = Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / 86400000))
  if (days === 0) return 'hours'
  if (days === 1) return 'a day'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}

// How long a thing has been standing, said the way a person says it.
export function since(iso, now = Date.parse('2026-09-02T09:00:00Z')) {
  const days = Math.max(0, Math.round((now - Date.parse(iso)) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}

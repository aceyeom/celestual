// communities.js — the official, curated launch spaces.
//
// Communities are NOT user-created. The Celestual team owns this list; a user
// only ever JOINS or LEAVES one. Each has a team-set `threshold` (the number of
// people that opens it); progress toward it is shown as a ring, and at 100% the
// community "opens" and its live weekly readout lights up. `threshold` values
// here are launch placeholders — the team tunes them per school.
//
// The mark: each community renders a small monochrome seal (see `SchoolMark` in
// components/ui.jsx) — a cosmos ring around a serif monogram, tinted to the two
// stars so no third hue ever enters. To swap in a real logo later, drop a
// black-on-transparent asset in app/public/schools/ and set `asset` below to its
// path; `SchoolMark` will render (and palette-tint) it in place of the seal.

export const CURATED = [
  { slug: 'uc-berkeley', name: 'UC Berkeley', short: 'Berkeley', mono: 'Cal', threshold: 2500, asset: '/schools/uc-berkeley.png' },
  { slug: 'wesleyan', name: 'Wesleyan', short: 'Wesleyan', mono: 'Wes', threshold: 900, asset: '/schools/wesleyan.png' },
  { slug: 'cmu', name: 'Carnegie Mellon', short: 'CMU', mono: 'CMU', threshold: 1800, asset: '/schools/cmu.png' },
]

export const CURATED_SLUGS = CURATED.map((c) => c.slug)

// The fixed-100 model (masterguide §2.5): a community is globally open — anyone
// can ping from day one. What 100 MEMBERS gates is not access but a reward: at
// 100 the community "opens" and its weekly stats + its match-constellations
// light up. Below 100 it's "gathering" — its exact counts stay hidden (small
// counts de-anonymize), so its galaxy shows uncountable forming gas, not stars.
export const OPEN_FLOOR = 100
// A match count only PUBLISHES at ten and up (§2.7), so a small week can't be
// reverse-guessed. Below the floor we show "matches open at ten," not a number.
export const MATCH_FLOOR = 10

// Is this community open (past the member floor)? Reads `members`, falling back
// to the legacy `current` field so older seeds still resolve.
export function communityOpen(c) {
  const m = Number((c && (c.members != null ? c.members : c.current)) || 0)
  return m >= OPEN_FLOOR
}

// The ring's center label. Intentionally literal (gamified) rather than voice-
// compliant, and kept OUT of i18n/strings.js so it never trips the voice linter
// — the ring is a demo-forward growth surface, not part of the product's copy.
export const RING_LABELS = { climbing: 'unlocked', open: 'open' }

// Progress toward the fixed-100 open floor, as a fraction and a flag. Reads
// `members` (falling back to the legacy `current`). Used by the recruiter/placed
// surfaces and the finder; the community page itself no longer shows a fraction.
export function communityProgress(c) {
  const members = Number((c && (c.members != null ? c.members : c.current)) || 0)
  const frac = members / OPEN_FLOOR
  return { frac: Math.max(0, Math.min(1, frac)), open: members >= OPEN_FLOOR, members }
}

export function bySlug(slug) {
  if (!slug) return null
  const s = String(slug).toLowerCase()
  return CURATED.find((c) => c.slug === s) || null
}

export function isCurated(slug) {
  return !!bySlug(slug)
}

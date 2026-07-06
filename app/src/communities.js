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

// The ring's center label. Intentionally literal (gamified) rather than voice-
// compliant, and kept OUT of i18n/strings.js so it never trips the voice linter
// — the ring is a demo-forward growth surface, not part of the product's copy.
export const RING_LABELS = { climbing: 'unlocked', open: 'open' }

// Progress toward a community's threshold, as a fraction and a flag.
export function communityProgress(c) {
  const cur = Number((c && c.current) || 0)
  const thr = Number((c && c.threshold) || 0)
  const frac = thr > 0 ? cur / thr : 0
  return { frac: Math.max(0, Math.min(1, frac)), open: thr > 0 && cur >= thr }
}

export function bySlug(slug) {
  if (!slug) return null
  const s = String(slug).toLowerCase()
  return CURATED.find((c) => c.slug === s) || null
}

export function isCurated(slug) {
  return !!bySlug(slug)
}

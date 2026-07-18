// communities.js — the official, curated launch spaces.
//
// Communities are NOT user-created. The Celestual team owns this list; a user
// only ever JOINS or LEAVES one.
//
// The mark: each community renders a small monochrome seal (see `SchoolMark` in
// components/ui.jsx) — a cosmos ring around a serif monogram, tinted to the two
// stars so no third hue ever enters. To swap in a real logo later, drop a
// black-on-transparent asset in app/public/schools/ and set `asset` below to its
// path; `SchoolMark` will render (and palette-tint) it in place of the seal.

// `domain` is the school's email domain — membership is proven by a code sent to
// an address there (see api/eduverify.js). A subdomain (andrew.cmu.edu) counts as
// the school too, so the matcher accepts the domain itself or anything ending in
// `.<domain>`.
export const CURATED = [
  { slug: 'uc-berkeley', name: 'UC Berkeley', short: 'Berkeley', mono: 'Cal', domain: 'berkeley.edu', asset: '/schools/uc-berkeley.png' },
  { slug: 'wesleyan', name: 'Wesleyan', short: 'Wesleyan', mono: 'Wes', domain: 'wesleyan.edu', asset: '/schools/wesleyan.png' },
  { slug: 'cmu', name: 'Carnegie Mellon', short: 'CMU', mono: 'CMU', domain: 'cmu.edu', asset: '/schools/cmu.png' },
]

export const CURATED_SLUGS = CURATED.map((c) => c.slug)

// THE LAUNCH CLOCK — the one thing that opens a community's sky. There is no
// member threshold and no unlock ladder anymore: every community's sky opens
// together, at one shared moment, when this countdown ends. Anyone can ping
// from day one; what the clock gates is the REVEAL surface (weekly stats + the
// match constellations lighting up).
//
// PLACEHOLDER: the real date is the end of O-Week — the team sets it before
// launch. `VITE_LAUNCH_AT` (any Date-parseable string) overrides it without a
// code change.
export const LAUNCH_AT = new Date(import.meta.env.VITE_LAUNCH_AT || '2026-08-30T20:00:00')

// A match count only PUBLISHES at ten and up (§2.7) — a privacy floor, not an
// unlock: below it a small week could be reverse-guessed, so we show "matches
// show at ten," never a number.
export const MATCH_FLOOR = 10

// Is this community's sky open? Time decides, the same instant for everyone.
// The sandbox can force a state per community (`open: true|false` in its live
// overlay) so all three sky states stay previewable before the real launch.
export function communityOpen(c) {
  if (c && c.open != null) return !!c.open
  return Date.now() >= LAUNCH_AT.getTime()
}

export function bySlug(slug) {
  if (!slug) return null
  const s = String(slug).toLowerCase()
  return CURATED.find((c) => c.slug === s) || null
}

export function isCurated(slug) {
  return !!bySlug(slug)
}

// Does `email` belong to the school that owns `slug`? True when its domain is the
// school's domain, or a subdomain of it (andrew.cmu.edu ⊂ cmu.edu). Used to gate
// membership: your ping only reaches people from your own community, so we confirm
// you're really there before you can ping into it.
export function emailMatchesSchool(email, slug) {
  const c = bySlug(slug)
  if (!c || !c.domain) return false
  const at = String(email || '').trim().toLowerCase()
  const m = at.match(/^[^\s@]+@([^\s@]+)$/)
  if (!m) return false
  const host = m[1]
  return host === c.domain || host.endsWith('.' + c.domain)
}

// A plausible .edu address at all (used before we know the school). Kept loose —
// the school-specific check above is the real gate.
export function isEduEmail(email) {
  const at = String(email || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.edu$/.test(at)
}

// Is `email` a @gmail.com address? The one exception the sandbox carves into the
// .edu gate: a tester can prove the REAL send-a-code-verify-a-code pipeline
// end to end with an inbox they actually hold, without needing a real school
// address. Every other domain still has to be the real, matching .edu.
export function isGmailAddress(email) {
  const at = String(email || '').trim().toLowerCase()
  const m = at.match(/^[^\s@]+@([^\s@]+)$/)
  return !!m && m[1] === 'gmail.com'
}

// The next weekly reveal — Sunday 20:00 in the viewer's own timezone. Deterministic
// and always in the future, so the community countdown actually ticks down and
// resets each week. The reveal is the shared moment the sky lights its matches.
export function nextRevealAt(now = new Date()) {
  const d = new Date(now)
  d.setHours(20, 0, 0, 0) // 8pm local
  // days until Sunday (0)
  let add = (7 - d.getDay()) % 7
  if (add === 0 && d.getTime() <= now.getTime()) add = 7
  d.setDate(d.getDate() + add)
  return d
}

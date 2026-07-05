// demoData.js — the sandbox's hardcoded world (/demo only).
//
// The demo runs the full product workflow, exactly like production — placing,
// verifying, matching, communities, the fourth slot — except NOTHING reaches a
// server: every value here is temporary and obviously sample. It exists to show
// what a live launch looks like before one exists: pings in every state, the
// communities feature with real weekly stats, and a one-tap way to visualize a
// match. The numbers are sample numbers and the UI says "sandbox" wherever they
// appear.

const day = 864e5

// Sample pings — one per state a row can be in, so the status page shows the
// mutual section, live slots, and an open slot all at once.
export const DEMO_PINGS = [
  {
    handle: 'sofia.reyes',
    time: Date.now() - 20 * day,
    expires_at: new Date(Date.now() + 40 * day).toISOString(),
    mutual: true, // resolved — sits in the mutual section, off the slots
    reachable: true,
    intent: 'again',
  },
  {
    handle: 'aria.chen',
    time: Date.now() - 12 * day,
    expires_at: new Date(Date.now() + 48 * day).toISOString(),
    mutual: false,
    reachable: true, // "standing" — she's on celestual
    intent: 'unsaid',
  },
  {
    handle: 'jw.park',
    time: Date.now() - 56 * day,
    expires_at: new Date(Date.now() + 4 * day).toISOString(),
    mutual: false,
    reachable: false, // "waiting" — not on celestual yet; also near lapse,
    intent: null, //     so the renewal line shows
  },
]

// Communities ("your worlds") — the fixed 100-member model. A community's
// weekly stats OPEN at 100 members; below that they're still gathering (and the
// count itself stays hidden — the 100-floor, framework §2.5). Placing pings
// NEVER depends on this: everyone can ping from day one, anywhere. The threshold
// only gates the weekly stats reward, which is what pulls more members in.
//
// `count >= 100`  → stats open; `week` carries the weekly readout.
// `count < 100`   → gathering; count hidden; a locked preview of what opens.
// The match number in `week` respects the ten-match floor (framework §2.7): a
// week with fewer than ten matches shows the floor line instead of the number.
export const DEMO_WORLDS = [
  {
    slug: 'nyu-2028',
    name: 'NYU Class of 2028',
    count: 1204,
    // the flagship — well past 100, stats live and fresh this week
    week: { matches: 18, pings: 412, joined: 96, topReason: 'miss' },
  },
  {
    slug: 'korean-intl-students',
    name: 'korean intl students',
    count: 2341,
    // stats open, but this week's matches sit under the ten-floor — so the
    // match number is withheld and the floor line stands in (the truth-margin)
    week: { matches: 7, pings: 233, joined: 61, topReason: 'unsaid' },
  },
  {
    slug: 'reed-27',
    name: 'reed ’27',
    count: 72, // under 100 — gathering; the count is never shown
  },
]

// A campus window (framework §2.3) — kept as an OPTIONAL launch tool, no longer
// the access gate. Still cyclable in the sandbox to preview its three states,
// but the demo's headline is communities, not a campus that must "open".
export const DEMO_CAMPUS = {
  slug: 'reed',
  name: 'Reed',
  threshold: 300,
  count: 214,
  status: 'window', // → 'open' → 'revealed' via the sandbox cycle control
  opened_at: null,
  week_pings: 1940,
  week_matches: 63,
}

export const DEMO_ME = 'you.tonight'

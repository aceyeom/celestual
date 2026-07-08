// demoData.js — the sandbox's hardcoded world (/demo only).
//
// The demo runs the full product workflow, exactly like production — placing,
// verifying, matching, communities, the fourth slot — except NOTHING reaches a
// server: every value here is temporary and obviously sample, and it all resets
// when the tab closes. It exists to show what a live launch looks like before one
// exists: pings in every state, the curated communities lit up and climbing, a
// live activity feed, and a one-tap way to visualize a match.
//
// This copy is intentionally punchy and literal (the progress ring's label, the
// live-feed beats) and lives HERE, not in i18n/strings.js, so it stays out of the
// voice linter — the demo's job is to feel alive, not to pass §5.

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
    intent: 'exAgain',
  },
  {
    handle: 'aria.chen',
    time: Date.now() - 12 * day,
    expires_at: new Date(Date.now() + 48 * day).toISOString(),
    mutual: false,
    reachable: true, // "standing" — she's on celestual
    intent: 'exUnsaid',
  },
  {
    handle: 'jw.park',
    time: Date.now() - 56 * day,
    expires_at: new Date(Date.now() + 4 * day).toISOString(),
    mutual: false, // "waiting" — not on celestual yet; also near lapse
    intent: null,
  },
]

// The curated communities' live sample state (the fixed-100 model — see
// communities.js). `members` gates the OPEN reward at 100; `pings` is the count
// of pings placed (the galaxy's stars); `matches` is mutual matches this week
// (the anonymous constellations). A gathering community (<100 members) hides its
// exact counts, so `pings`/`matches` are absent and its galaxy shows forming gas.
//
// The set spans all three galaxy states on purpose: Berkeley is the hero — a
// dense, open galaxy with a sky full of constellations; Wesleyan is a smaller
// open galaxy; CMU is still gathering (a forming nebula, counts withheld).
export const DEMO_COMMUNITIES = {
  'uc-berkeley': { members: 214, pings: 386, matches: 18, week: { joined: 71, topReason: 'crushThink' } },
  wesleyan: { members: 128, pings: 154, matches: 11, week: { joined: 33, topReason: 'exUnsaid' } },
  cmu: { members: 74 }, // gathering — under 100, all counts withheld
}

export const DEMO_ME = 'you.tonight'

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

// The curated communities' live sample state (the official set + thresholds live
// in communities.js; this is only the sandbox overlay). `current` is people in,
// measured against that community's threshold — the ring shows current/threshold.
// A community is OPEN once current ≥ threshold, and only then carries a `week`
// readout (matches, the most common reason, pings placed, joined). Berkeley is
// the hero: mid-climb at ~72%, with the live feed nudging it up. Wesleyan is
// already open; CMU is early.
export const DEMO_COMMUNITIES = {
  'uc-berkeley': { current: 1806 }, // 1806 / 2500 ≈ 72%
  wesleyan: { current: 941, week: { matches: 14, pings: 262, joined: 71, topReason: 'crushThink' } }, // open
  cmu: { current: 742 }, // 742 / 1800 ≈ 41%
}

// The live activity feed — a rolling pool of anonymized beats that pop up over
// the communities surfaces so the demo reads as actively used. `kind` decides how
// the beat nudges the world it names: a placed ping / a new member / a match all
// inch that community's ring upward, so watching it feels live. `reason` beats
// quote the product's own five lines. All in-memory; gone when the tab closes.
export const DEMO_FEED = [
  // berkeley — the mid-climb hero; the most traffic
  { slug: 'uc-berkeley', kind: 'reason', text: 'someone in the berkeley class of ’27 placed a ping — “i miss you”' },
  { slug: 'uc-berkeley', kind: 'join', text: '+1 from unit 3 just joined berkeley' },
  { slug: 'uc-berkeley', kind: 'match', text: 'it just became mutual for two bears' },
  { slug: 'uc-berkeley', kind: 'reason', text: 'a ping near sproul — “i never got to say something”' },
  { slug: 'uc-berkeley', kind: 'ping', text: 'a ping was just placed at berkeley' },
  { slug: 'uc-berkeley', kind: 'reason', text: 'someone in a moffitt all-nighter — “i think about you”' },
  { slug: 'uc-berkeley', kind: 'join', text: '+3 joined berkeley in the last hour' },
  // wesleyan — small and already open
  { slug: 'wesleyan', kind: 'reason', text: 'a wesleyan ping just went out — “i think about you”' },
  { slug: 'wesleyan', kind: 'match', text: 'two cardinals just matched' },
  { slug: 'wesleyan', kind: 'join', text: '+1 from foss hill just joined wesleyan' },
  { slug: 'wesleyan', kind: 'reason', text: 'someone at wes — “i want to clear the air”' },
  { slug: 'wesleyan', kind: 'ping', text: 'a ping was just placed at wesleyan' },
  // cmu — early, engineering-heavy
  { slug: 'cmu', kind: 'reason', text: 'a tartan just placed a ping — “i want to try again”' },
  { slug: 'cmu', kind: 'join', text: '+2 joined cmu from the cut' },
  { slug: 'cmu', kind: 'ping', text: 'a ping was just placed at carnegie mellon' },
  { slug: 'cmu', kind: 'reason', text: 'someone in a gates all-nighter — “i miss you”' },
  { slug: 'cmu', kind: 'match', text: 'it just became mutual for two tartans' },
]

export const DEMO_ME = 'you.tonight'

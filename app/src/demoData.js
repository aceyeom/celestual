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

// The live shoutout pool — anonymous, moderated shoutouts that scroll through a
// community's live chat so the demo reads as a place with people in it. Every
// line is a real shoutout a member might post: a feeling, a place, a moment —
// and NAMES NO ONE. No @handles, no first names, nothing that could out a person
// or a match. That's the same wall the composer's moderation enforces on real
// input (see moderation.js). Punchy and literal by design, so it lives here, out
// of the linted strings file. All in-memory; gone when the tab closes.
export const DEMO_SHOUTOUTS = [
  // berkeley
  { slug: 'uc-berkeley', text: 'to whoever i shared a table with at moffitt at 2am — i think about it' },
  { slug: 'uc-berkeley', text: 'the person from my 8am at dwinelle. you know the one.' },
  { slug: 'uc-berkeley', text: 'i should have said something on the walk down from the campanile' },
  { slug: 'uc-berkeley', text: 'someone from unit 3, spring of freshman year. still.' },
  { slug: 'uc-berkeley', text: 'we made eye contact at the free speech steps like six times' },
  { slug: 'uc-berkeley', text: 'to the one who quoted my favorite film first. i folded instantly.' },
  { slug: 'uc-berkeley', text: 'i hope you placed one too' },
  // wesleyan
  { slug: 'wesleyan', text: 'foss hill, that one warm october afternoon. you were there.' },
  { slug: 'wesleyan', text: 'we closed down usdan talking and i never followed up' },
  { slug: 'wesleyan', text: 'to the person i always found in the same corner of olin' },
  { slug: 'wesleyan', text: 'i still have the setlist you wrote out for me' },
  { slug: 'wesleyan', text: 'if it was mutual i think we both already know' },
  // cmu
  { slug: 'cmu', text: 'the cluster at 3am hits different when you were there too' },
  { slug: 'cmu', text: 'to the person who fixed my build and my whole night' },
  { slug: 'cmu', text: 'we walked the cut in the snow and i said nothing. classic.' },
  { slug: 'cmu', text: 'i think about the study room more than the exam' },
]

export const DEMO_ME = 'you.tonight'

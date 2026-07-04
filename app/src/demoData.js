// demoData.js — the sandbox's hardcoded world (/demo only).
//
// The demo exists to show what a campus launch looks like before one exists:
// sample pings in every state, a campus window mid-fill, live-looking world
// counters, and a one-tap way to visualize a match. Nothing here ever reaches
// a server; the numbers are obviously sample numbers and the UI says
// "sandbox" wherever they appear.

const day = 864e5

// Three sample pings — one per state a row can be in.
export const DEMO_PINGS = [
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

// The campus window (framework Screen 6) — mid-fill, the meter doing the
// persuading. The demo can also cycle this to 'open' and 'revealed' to preview
// Screens 7a/7b; those states reuse the same object with the fields below.
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

// Community counters ("your worlds") — one over the 100-floor, one under it
// (shows as "still gathering", never a small number).
export const DEMO_WORLDS = [
  { slug: 'korean-intl-students', name: 'korean intl students', count: 2341 },
  { slug: 'reed-27', name: 'reed ’27', count: null },
]

export const DEMO_ME = 'you.tonight'

// growth.js — the community-growth copy for the placed screen (the recruiter
// surface).
//
// This is the one screen that turns a placed ping into a reason to bring your
// world in: the person you entered is (or isn't) here, but the answer stays
// held until your community fills. The copy is deliberately gamified — it names
// the count, the threshold, and says "unlocks" — a product-owner voice decision
// for a growth surface, exactly like the progress-ring label and the demo feed
// (see docs/VOICE.md §8). It lives HERE, out of i18n/strings.js, so the voice
// linter's canonical scope (and its "unlock" ban for the quiet product copy) is
// unchanged. If a locale ever needs it, translate this file alongside strings.js.
//
// Every function takes the placed handle plus the user's own community
// (its short + full name, live count, and threshold) and returns fully
// interpolated, ready-to-render lines. No dashes — they kill the mood.

const n = (v) => Number(v || 0).toLocaleString()

// State A — the person is already reachable, and in your (still-gathering)
// community. The tension: they might have entered you too, but you can't know
// until the community trips its threshold.
export function placedReachable({ handle, short, threshold }) {
  return {
    live: 'your ping is live.',
    here: `@${handle} is already on celestual, and in your ${short} community.`,
    question: `so here’s the question you can’t answer yet: did they ping you too?`,
    until: `you won’t know until ${short} unlocks.`,
    fill: `the faster ${short} fills, the faster you find out. this is the part you control.`,
    foot: `every person from ${short} who joins pushes you closer to ${n(threshold)}. then everything unlocks at once.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

// State B — the person isn't on celestual yet, and your community isn't full.
// The move is the same: bring your world in, and it opens for everyone, the
// people you're waiting on included.
export function placedWaiting({ handle, short }) {
  return {
    notHere: `@${handle} isn’t on celestual yet.`,
    only: `celestual only works when your world is here. right now, ${short} isn’t full, and the people you’re looking for aren’t in yet.`,
    bring: `bring ${short} in. when it fills, it opens for everyone, including the people you’re waiting on.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

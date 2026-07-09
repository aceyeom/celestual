// growth.js — the community-growth copy for the placed screen (the recruiter
// surface).
//
// This is the one screen that turns a placed ping into a reason to bring your
// world in. The copy is deliberately gamified — it names the count and the
// threshold — a product-owner voice decision for a growth surface, exactly like
// the progress-ring label and the demo feed (see docs/VOICE.md §8). It lives
// HERE, out of i18n/strings.js, so the voice linter's canonical scope is
// unchanged. If a locale ever needs it, translate this file alongside strings.js.
//
// TRUTH CONSTRAINT (framework §6.2, MASTER-GUIDE §2.6): a mutual ping resolves
// the instant it becomes mutual — a community NEVER holds the answer. What
// filling a community actually opens is its SKY: the weekly matches, the
// numbers, the constellations, for everyone in it. Every line below says
// exactly that; none may ever claim the reveal itself is gated.
//
// Every function takes the placed handle plus the user's own community
// (its short + full name, live count, and threshold) and returns fully
// interpolated, ready-to-render lines. No dashes — they kill the mood.

const n = (v) => Number(v || 0).toLocaleString()

// State A — the person is already reachable, and in your (still-gathering)
// community. The tension: they might ping you back any moment, and the world
// you share is still filling — the part you control.
export function placedReachable({ handle, short, threshold }) {
  return {
    live: 'your ping is live.',
    here: `@${handle} is already on celestual, and your ping just became a star in your ${short} sky.`,
    question: `so here’s the question: did they ping you too?`,
    until: `the second they do, you both find out. until then, nothing shows, to anyone.`,
    fill: `and as ${short} fills, its whole sky opens: the weekly matches, the numbers, the constellations. this is the part you control.`,
    foot: `every person from ${short} who joins pushes it closer to ${n(threshold)}. at ${n(threshold)}, the sky lights up for everyone.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

// State B — the person isn't on celestual yet, and your community isn't full.
// The move is the same: bring your world in, and the people you're waiting on
// arrive with it.
export function placedWaiting({ handle, short }) {
  return {
    notHere: `@${handle} isn’t on celestual yet.`,
    only: `celestual only works when your world is here. right now, ${short} isn’t full, and the people you’re looking for aren’t in yet.`,
    bring: `bring ${short} in. when it fills, its sky opens for everyone, and the people you’re waiting on arrive with it.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

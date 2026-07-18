// growth.js — the community-growth copy for the placed screen (the recruiter
// surface).
//
// This is the one screen that turns a placed ping into a reason to bring your
// world in. The copy is deliberately gamified — it names the countdown and the
// shared moment it ends — a product-owner voice decision for a growth surface,
// exactly like the launch clock and the demo feed (see docs/VOICE.md §8). It
// lives HERE, out of i18n/strings.js, so the voice linter's canonical scope is
// unchanged. If a locale ever needs it, translate this file alongside strings.js.
//
// TRUTH CONSTRAINT (framework §6.2, MASTER-GUIDE §2.6): a mutual ping resolves
// the instant it becomes mutual — a community NEVER holds the answer. What the
// countdown actually opens is the SKY: the weekly matches, the numbers, the
// constellations, for everyone in it. Every line below says exactly that; none
// may ever claim the reveal itself is gated. There is no member threshold —
// the sky opens for everyone at one shared moment, when the countdown ends.
//
// Every function takes the placed handle plus the user's own community (its
// short + full name) and returns fully interpolated, ready-to-render lines.
// No dashes — they kill the mood.

// State A — the person is already reachable, and in your (still-gathering)
// community. The tension: they might ping you back any moment, and one shared
// night is coming when the whole sky lights up.
export function placedReachable({ handle, short }) {
  return {
    live: 'your ping is live.',
    here: `@${handle} is already on celestual, and your ping just became a star in your ${short} sky.`,
    question: `so here’s the question: did they ping you too?`,
    until: `the second they do, you both find out. until then, nothing shows, to anyone.`,
    fill: `and when the countdown ends, the whole ${short} sky opens at once: the weekly matches, the numbers, the constellations.`,
    foot: `the sky opens on one shared night, the same moment for everyone. every person from ${short} who joins before then is standing under it when it does.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

// State B — the person isn't on celestual yet, and the sky hasn't opened. The
// move is the same: bring your world in before the countdown ends, and the
// people you're waiting on arrive with it.
export function placedWaiting({ handle, short }) {
  return {
    notHere: `@${handle} isn’t on celestual yet.`,
    only: `celestual only works when your world is here. right now, the people you’re looking for aren’t in yet.`,
    bring: `bring ${short} in before the countdown ends. when the sky opens, the people you’ve been waiting on are standing under it with you.`,
    spreading: `it names no one, and it’s already spreading. share it and you’re just part of ${short} getting in, same as everyone.`,
  }
}

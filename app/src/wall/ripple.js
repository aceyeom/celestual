// ── ripple.js — the pulse that opens the wall ───────────────────────────────
//
// A tap on the veil sends one wave out through the crowd from under the
// finger, and the wave is two things drawn by two files off one clock:
//
//   THE LIGHT   the veil's scrim thins ahead of the crest and is gone behind
//               it (screens/Wall.jsx, wall.css `.wl-veil-mask`). No edge on
//               it: the light arrives over a shoulder a third of the screen
//               wide, so there is never a line to look at.
//   THE CROWD   every disc the crest reaches heaves outward ahead of it,
//               swells as it passes, drops back a little behind it and
//               settles (Hive.jsx, THE PULSE). That is the ripple: the faces
//               are the water, and the movement is in them and not drawn
//               over them.
//
// The numbers for both are here, and only here, so the light and the
// movement cannot drift apart: one crest, one curve, one width.
//
// ── the shape of the wave ───────────────────────────────────────────────────
// Everything is a function of `phi`, how far a disc is behind the crest in
// units of the crest's own width: negative ahead of it, nought on it,
// positive behind. Three curves come off that one number.
//
//   SWELL   a Ricker wavelet, (1 - phi^2) e^(-phi^2 / 2): one at the crest,
//           a trough of minus 0.45 a little either side, nothing far away,
//           and a mean of exactly nought. The mean is the point. A disc
//           swells, dips and returns; nothing is left larger.
//   HEAVE   the wavelet's own integral, -phi e^(-phi^2 / 2), which is the
//           displacement whose gradient IS the swell: where a disc grows, the
//           lattice opens by exactly as much along the wave, and where it
//           dips the lattice closes by as much. So two discs a pitch apart
//           along the wave can never be pushed into each other, however
//           hard the wave is driven. Out ahead of the crest, back behind
//           it, and nowhere by the end.
//   LIT     the light on a disc: dim under the veil, full behind the crest,
//           and it leads the crest a little, so a face brightens as it
//           begins to rise.
//   BLOOM   the lens's depth, which the veil holds at half strength so the
//           poster has a field under it and not wallpaper. It arrives
//           BEHIND the crest, after the dip, so the far discs recede into
//           the room once the wave has been through them and not while it
//           is lifting them.

// How long the crest takes to reach the far corner of the glass from the
// tap. The old circle crossed a phone in a second; a wave that is felt in
// the crowd wants nearly two, because the eye has to see each face go up
// and come down and a wave that crosses the faces faster than they can
// answer it is a wipe with a bulge on it.
export const RIPPLE_MS = 1900

// The crest's distance from the tap, as a fraction of the distance to the far
// corner, from the ripple's own progress: one at one. It leaves at half again
// its mean speed and slows to a third of that by the corner, and then it
// keeps that speed, because a wave loses a little pace as it spreads and one
// that stops dead at the corner has hit something. The tail of the wave is
// still crossing the last faces after the crest has left the glass, at the
// same steady pace, so nothing at the edge is left half risen.
export function front(p) {
  if (p <= 0) return 0
  if (p >= 1) return 1 + (p - 1) * 0.5
  return 1.5 * p - 0.5 * p * p
}

// The crest's width, in pitches of the lattice: `phi` is one at this many
// pitches behind the crest. Wider and the wave is a heave of the whole
// screen; narrower and it is a line again, drawn in faces.
export const SIGMA = 1.25

// The swell at the crest, as a fraction of a disc's size. It is a ceiling: a
// disc in the packed middle of the lens has less room than this and spends
// only what it has (Hive.jsx).
export const SWELL = 0.22

// The heave, as a fraction of the crest's width. At 0.3 a disc a pitch ahead
// of the crest stands about a fifth of a pitch further from the finger than
// it will when the wave has gone, which is enough to be seen to move and
// not enough to read as thrown.
export const HEAVE = 0.3

// The wavelet: one at the crest, minus 0.45 at phi = root three either side,
// nothing past three, and a mean of nought.
export function swell(phi) {
  const g = Math.exp(-phi * phi / 2)
  return (1 - phi * phi) * g
}

// Its integral, which is the heave: plus 0.61 a width ahead of the crest,
// nought on it, minus 0.61 a width behind, and nothing past three.
export function heave(phi) {
  return -phi * Math.exp(-phi * phi / 2)
}

// A smooth step, for the two reveals.
function step(x, a, b) {
  const t = (x - a) / (b - a)
  const u = t < 0 ? 0 : t > 1 ? 1 : t
  return u * u * (3 - 2 * u)
}

// The light: nought two widths ahead of the crest, one a third of a width
// behind it. It leads a little, so a face is already brightening as it
// begins to rise.
export function lit(phi) {
  return step(phi, -1.6, 0.35)
}

// The depth: nought until the crest and its dip have passed, one two and a
// half widths behind. The room arrives after the wave, not with it.
export function bloom(phi) {
  return step(phi, 0.8, 2.6)
}

// How far past the far corner the crest has to travel before every disc on
// the glass has settled, in widths. Past three the wavelet is nothing.
export const TAIL = 3.2

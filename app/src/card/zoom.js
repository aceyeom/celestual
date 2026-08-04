// card/zoom.js — the point-of-light → surface crossing, as pure arithmetic.
//
// Lifted out of Resolve.jsx so that everything in the product which flies into
// a star reads the SAME curve from the same place: the status page's zoom
// (card/Resolve.jsx), the reveal (card/Spread.jsx), and the Bindery rebrand's
// zoom on /beta (beta/Resolve.jsx). Two copies of these four numbers are two
// zooms that agree until somebody tunes one.
//
// Nothing in here knows what a card looks like, which is the point: it is the
// physics of resolving a body, and what arrives at the end of the dive is the
// caller's business. There is no React in this file and no design system in it,
// so importing it costs a consumer nothing but the arithmetic.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Where a fully resolved card comes to rest, as a fraction of the viewport. A
// shade high, because the eye reads a centred circle as low.
export const REST_Y = 0.46

// The diameter a card holds at full resolve. One number, so every card in the
// product resolves to the same size and the sky never implies that one ping
// matters more than another.
export const fullSize = () =>
  Math.min(400, Math.round(Math.min(window.innerWidth * 0.84, window.innerHeight * 0.56)))

// The curve.
//
//   focus 0.00 → 0.52   a point of light. Nothing of the card exists.
//   focus 0.52 → 0.99   the disc opens out of the point, blurred at first the
//                       way an unresolved body is, sharpening as it grows,
//                       travelling from wherever the star hangs in the field
//                       toward the frame it will hold.
//   focus 1.00          resolved.
//
// `star` is where the point of light actually is on screen, or null when
// nothing published one — the 2D fallback, a community sky, a star behind the
// camera — in which case the disc simply opens where it was travelling anyway.
export function resolveOf(focus, star, rest, full) {
  const resolve = smoothstep(0.52, 0.995, focus)
  // Both ends are real positions; the resolve is what walks between them.
  const sx = star && star.vis ? star.x : rest.x
  const sy = star && star.vis ? star.y : rest.y
  const e = smoothstep(0.15, 1, resolve)
  return {
    x: sx + (rest.x - sx) * e,
    y: sy + (rest.y - sy) * e,
    size: full * resolve,
    // An unresolved body is not a small sharp body. It is a smear the
    // instrument cannot separate yet, which is why this is a blur and not just
    // a scale.
    blur: (1 - resolve) * 9,
    opacity: clamp(resolve * 1.7, 0, 1),
    resolve,
  }
}

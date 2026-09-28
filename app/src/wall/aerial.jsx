// ── the aerial ──────────────────────────────────────────────────────────────
// The Y from the phone's status row (looks.js `PIX.ant`), alone, with the two
// waves a phone drew off it when it was sending, on one grid of twenty one
// cells by ten. Four states, all in profile.css: `seek` (the waves going out,
// inner then outer, on the phone's half beat), `kept` (the same, the waves
// held a step dimmer), `full` (lit in rose, both waves out and still) and
// `none` (dark, the waves gone, the phone's small cross at its foot). On the
// night itself a row `lands`: it searches once more and then shows what it
// is, a beat after the one above it.
//
// It was drawn only at the end of a row in the private notes, two of the
// page's pixels to each of its cells, and lived in screens/You.jsx. A mutual
// is a small phone of its own now (Slot.jsx), and its status band carries the
// same aerial at one pixel a cell, as the phone's own row did, so it is here,
// where both can draw it, and `scale` says how large.
const Y = ['XXXXXXXXX', 'XX..X..XX', '.X..X..X.', '.XX.X.XX.', '..XXXXX..', '...XXX...', '...XXX...', '...XXX...', '...XXX...', '...XXX...']
const cells = (pts) => pts.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')
const Y_D = cells(Y.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? [x + 6, y] : null)).filter(Boolean)))
const IN = [[16, 1], [17, 2], [17, 3], [16, 4]]
const OUT = [[18, 0], [19, 1], [20, 2], [20, 3], [19, 4], [18, 5]]
const mirror = (pts) => pts.map(([x, y]) => [20 - x, y])
const IN_D = cells([...IN, ...mirror(IN)])
const OUT_D = cells([...OUT, ...mirror(OUT)])
const X_D = cells([[16, 7], [18, 7], [17, 8], [16, 9], [18, 9]])
export function Aerial({ state = 'seek', land = false, scale = 2 }) {
  return (
    <svg
      className={`wl-aerial is-${state}${land ? ' is-landing' : ''}`} viewBox="0 0 21 10" width={21 * scale} height={10 * scale}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"
    >
      <path className="wl-aerial-y" d={Y_D} />
      <path className="wl-aerial-in" d={IN_D} />
      <path className="wl-aerial-out" d={OUT_D} />
      <path className="wl-aerial-x" d={X_D} />
    </svg>
  )
}

// ── two notes ───────────────────────────────────────────────────────────────
// What a ping is, without the people: two notes, folded into paper planes,
// sent from either side of the glass without either knowing about the
// other. His comes in low from the left and turns a loop; hers comes in high
// from the right, a seal of rose on its wing, and loops the other way. Each
// finds the orbit and flies half of it, his over the top and hers under the
// bottom, and the line each leaves behind it stays: between them they draw
// the ring. At the far ends they turn in, dive for the middle, and meet
// there, and where they meet is the star, opening out. The pink goes out
// from the middle on the frame they touch.
//
//      0   his plane over the left edge, hers over the right
//    700   a loop each
//   2300   on the orbit, each at one end of it
//   3300   off it, diving for the middle
//   3650   they meet: the pink, and the star opening; whole by 4300

import { Pad, mark, tale, INK, ROSE, clamp, lerp, smooth, inOut, span, outCubic } from './kit.js'

const ORBIT = [2300, 3300]
const DIVE = [3300, 3650]
const MEET = 3650
const OPEN = [3650, 4300]

// a path through keys [t, x, y], smooth through each (Catmull-Rom in time)
function pathOf(keys) {
  return (t) => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]]
    const n = keys.length
    if (t >= keys[n - 1][0]) return [keys[n - 1][1], keys[n - 1][2]]
    let i = 0
    while (i < n - 2 && t >= keys[i + 1][0]) i++
    const k1 = keys[i]
    const k2 = keys[i + 1]
    const k0 = keys[i - 1] || [k1[0] - (k2[0] - k1[0]), 2 * k1[1] - k2[1], 2 * k1[2] - k2[2]]
    const k3 = keys[i + 2] || [k2[0] + (k2[0] - k1[0]), 2 * k2[1] - k1[1], 2 * k2[2] - k1[2]]
    const u = (t - k1[0]) / (k2[0] - k1[0])
    const dt = k2[0] - k1[0]
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
    const h10 = u ** 3 - 2 * u ** 2 + u
    const h01 = -2 * u ** 3 + 3 * u ** 2
    const h11 = u ** 3 - u ** 2
    const out = []
    for (const c of [1, 2]) {
      const m1 = ((k2[c] - k0[c]) / (k2[0] - k0[0])) * dt
      const m2 = ((k3[c] - k1[c]) / (k3[0] - k1[0])) * dt
      out.push(h00 * k1[c] + h10 * m1 + h01 * k2[c] + h11 * m2)
    }
    return out
  }
}

// a loop: keys round a circle from its foot, `dir` 1 the way a plane going
// right would pull up and over, -1 the way one going left would
function loop(t0, ms, cx, cy, r, dir) {
  const out = []
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI / 2 - dir * (k / 8) * Math.PI * 2
    out.push([t0 + (k / 8) * ms, cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return out
}

// the plane, side on, pointing along `ang`: a dart, its fold, and the wing
// nearer us a little lighter; `seal` a cell of rose on the wing
function plane(pad, x, y, ang, a = 1, seal = false, k = 2.1) {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const P = ([u, v]) => [x + (u * c - v * s) * k, y + (u * s + v * c) * k]
  pad.poly([[4.2, 0], [-3.2, -2.3], [-1.6, -0.1], [-3.2, 1.2]].map(P), INK, 0.95 * a)
  pad.poly([[4.2, 0], [-1.6, -0.1], [-3.2, 1.2]].map(P), INK, 0.55 * a)
  if (seal) { const [sx, sy] = P([-1.3, -1]); pad.set(sx, sy, ROSE, a); pad.set(sx + 1, sy, ROSE, a) }
}

export function planesStory() {
  const pad = new Pad()
  let paths = null
  const setup = () => {
    const M = mark()
    const L = M.at(Math.PI)
    const R = M.at(0)
    // his: in low from the left, a loop, and up to the left end of the orbit
    const his = pathOf([
      [0, -12, 58], [350, 4, 55], [700, 18, 50],
      ...loop(850, 700, 24, 41, 9, 1),
      [1800, 26, 56], [2050, 16, 50], [ORBIT[0], L[0], L[1]],
    ])
    // hers: in high from the right, a loop the other way, down to the right end
    const hers = pathOf([
      [0, 107, 16], [350, 92, 18], [700, 78, 23],
      ...loop(850, 700, 70, 32, 9, -1),
      [1800, 68, 20], [2050, 80, 22], [ORBIT[0], R[0], R[1]],
    ])
    paths = { his, hers, M }
  }
  // where each is: on its path, then round its half of the orbit, then in
  const at = (who, t) => {
    const { M } = paths
    if (t < ORBIT[0]) return paths[who](t)
    const e = inOut(span(t, ...ORBIT))
    // his over the top (from the left end), hers under the bottom (from the right)
    const th = who === 'his' ? Math.PI + Math.PI * e : Math.PI * e
    const onOrbit = M.at(th)
    if (t < DIVE[0]) return onOrbit
    const k = inOut(span(t, ...DIVE))
    const end = M.at(who === 'his' ? 0 : Math.PI)
    // a curve in, pulled a little past the middle's height as it turns
    const bend = (who === 'his' ? -1 : 1) * 7 * Math.sin(Math.PI * k)
    return [lerp(end[0], M.cx, k), lerp(end[1], M.cy, k) + bend]
  }
  const heading = (who, t) => {
    const a = at(who, t - 10)
    const b = at(who, t + 10)
    return Math.atan2(b[1] - a[1], b[0] - a[0])
  }
  const end = OPEN[1] + 900
  const draw = (t) => {
    if (!paths) setup()
    const { M } = paths
    pad.clear()
    // the ring each has drawn so far: the upper half behind his, the lower
    // behind hers; the freshest of it a little lighter, as a line still drying
    const e = inOut(span(t, ...ORBIT))
    if (t >= ORBIT[0]) {
      for (const p of M.ring) {
        let done
        if (p.th < 0) done = p.th <= -Math.PI + Math.PI * e + 1e-6
        else done = p.th <= Math.PI * e + 1e-6
        if (!done) continue
        const from = p.th < 0 ? p.th + Math.PI : p.th
        const age = (Math.PI * e - from) / Math.PI
        pad.set(p.x, p.y, INK, lerp(0.55, 1, clamp(age * 5)))
      }
    }
    // the trails: where each has just been, dotted, fading
    if (t < MEET) {
      for (const who of ['his', 'hers']) {
        for (let j = 3; j < 30; j += 2) {
          const tt = t - j * 22
          if (tt < 0 || (tt >= ORBIT[0] && tt < DIVE[0])) continue
          const [x, y] = at(who, tt)
          pad.set(x, y, INK, 0.65 * (1 - j / 30))
        }
        const [x, y] = at(who, t)
        plane(pad, x, y, heading(who, t), 1, who === 'hers')
      }
    }
    const cells = pad.cells()
    // the star, opening out of where they met, its long arms last
    let glow = null
    if (t >= MEET) {
      const g = outCubic(span(t, ...OPEN)) * 1.02
      for (const p of M.star) {
        if (p.k > g) continue
        cells.push([p.x, p.y, INK, 0, lerp(0.4, 1, clamp((g - p.k) / 0.1))])
      }
      const f = 1 - smooth(span(t, MEET, MEET + 700))
      if (f > 0.01) glow = { x: M.cx, y: M.cy, r: lerp(4, 16, 1 - f), a: 0.8 * f, inner: 0.6, light: true }
    }
    return { cells, glow }
  }
  return tale({ end, draw, wash: { at: MEET, x: 47, y: 37, ms: 1300 } })
}

// ── binary ──────────────────────────────────────────────────────────────────
// Two stars, and the sky. They are circling each other, far apart, on an
// orbit tilted exactly as the ring is, so the one on the near side of it is
// the larger and the one on the far side the smaller, and each leaves a
// fading arc behind it. The orbit is closing: every turn tighter and
// quicker than the last, the way two stars that have found each other fall
// together. They touch in the middle, and there is a flash, and the light
// of it goes out across the orbit as a wave that sweeps the sky's stars
// before it, and settles, with a little give, into the ring; where they met
// the star opens out. The pink goes out on the frame they touch.
//
// For a screen that waits (a loading screen), the circling can go on for
// as long as it has to (`circling` below is a function of the clock alone),
// and the fall begins when there is something to show.
//
//      0   the two of them circling, wide; the sky twinkling
//   3000   they touch: the flash, the pink, the wave going out
//   3750   the wave settled into the ring; the star whole by 3900

import { Pad, sky, sparkle, mark, tale, INK, FAR, clamp, lerp, smooth, span, outCubic, outBack } from './kit.js'

const T = 3000
const WAVE = [3000, 3750]
const STAR = [3080, 3900]

// where the pair is on the orbit, `k` through the fall: how wide (as a
// share of the ring) and how far round
function orbitAt(k) {
  const q = clamp(k, 0, 0.9999)
  return { r: 1.22 * (1 - q) ** 0.55, th: -0.6 + 15 * (1 - (1 - q) ** 0.42) }
}

export function binaryStory() {
  const pad = new Pad()
  const end = STAR[1] + 900
  const draw = (t) => {
    const M = mark()
    const C = [M.cx, M.cy]
    pad.clear()
    const wave = span(t, ...WAVE)
    const s = wave > 0 ? outBack(wave, 1.9) : 0
    // the sky: swept away where the wave has passed
    sky(pad, t, {
      n: 56, seed: 21, box: [0, 0, 95, 75], ink: INK, a: 0.9,
      mask: (x, y) => {
        if (wave <= 0) return 1
        const dx = x - C[0]
        const dy = y - C[1]
        const c = Math.cos(M.tilt * Math.PI / 180)
        const sn = Math.sin(M.tilt * Math.PI / 180)
        const u = (dx * c + dy * sn) / M.RX
        const v = (-dx * sn + dy * c) / M.RY
        const d = Math.hypot(u, v)
        return d < s * 1.35 ? 0.25 : 1
      },
    })
    // the two of them, and the arcs behind them
    if (t < T) {
      for (const off of [0, Math.PI]) {
        for (let j = 30; j >= 1; j--) {
          const tt = t - j * 18
          if (tt < -2000) continue
          const o = orbitAt(tt / T)
          const [x, y] = M.at(o.th + off, o.r)
          pad.set(x, y, INK, 0.75 * (1 - j / 30) ** 1.2)
        }
        const o = orbitAt(t / T)
        const th = o.th + off
        const [x, y] = M.at(th, o.r)
        // the near side of the orbit is the lower half: nearer is larger
        const near = Math.sin(th) > 0
        const size = near ? 4 : 3
        sparkle(pad, x, y, size, INK, 1, near ? 2 : 1)
        pad.disc(x, y, near ? 1.6 : 1.1, INK, 1)
      }
    }
    const cells = pad.cells()
    let glow = null
    if (t >= T) {
      // the wave: the ring, from nothing to a little past itself and back,
      // and a fainter one running on ahead of it and gone
      for (const p of M.ring) {
        const x = C[0] + (p.x - C[0]) * s
        const y = C[1] + (p.y - C[1]) * s
        cells.push([wave >= 1 ? p.x : x, wave >= 1 ? p.y : y, INK, 0, lerp(0.6, 1, wave)])
      }
      const echo = outCubic(wave) * 1.45
      if (wave < 1) {
        for (let i = 0; i < M.ring.length; i += 3) {
          const p = M.ring[i]
          cells.push([C[0] + (p.x - C[0]) * echo, C[1] + (p.y - C[1]) * echo, FAR, 0, 0.6 * (1 - wave)])
        }
      }
      // the star, out of where they touched, its long arms last
      const g = outCubic(span(t, ...STAR)) * 1.02
      for (const p of M.star) {
        if (p.k > g) continue
        cells.push([p.x, p.y, INK, 0, lerp(0.45, 1, clamp((g - p.k) / 0.1))])
      }
      const f = 1 - smooth(span(t, T, T + 650))
      if (f > 0.01) glow = { x: C[0], y: C[1], r: lerp(3, 22, 1 - f), a: 0.9 * f, inner: 0.7, light: true }
    }
    return { cells, glow }
  }
  return tale({ end, draw, live: true, wash: { at: T, x: 47, y: 37, ms: 1250 } })
}

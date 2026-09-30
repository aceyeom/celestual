// ── binary ──────────────────────────────────────────────────────────────────
// Two stars, and the sky. They are circling each other, far apart, on an
// orbit tilted exactly as the ring is, so the one on the near side of it is
// the larger and the brighter and the one on the far side the smaller, and
// each draws a thinning arc of light behind it. The orbit is closing: every
// turn tighter and quicker than the last, the way two stars that have found
// each other fall together, and their light quickens with it. They touch in
// the middle: a flash; the light of it goes out across the orbit as a wave
// that pushes the sky's stars aside as it passes and lets them back, and
// settles, with a little give, into the ring, a fainter wave running on
// ahead of it and gone; where they touched the star opens, four long rays
// flaring out of it first and drawing back into its arms. The pink goes out
// on the frame they touch.
//
// Everything is laid between the cells, soft-edged, wherever the moment
// puts it: nothing steps.
//
// For a screen that waits (a loading screen), the circling can go on for
// as long as it has to (`orbitAt` is a function of the clock alone), and the
// fall begins when there is something to show.
//
//      0   the two of them circling, wide; the sky twinkling
//   3000   they touch: the flash, the pink, the wave going out
//   3800   the wave settled into the ring; the star whole by 3950

import { Pad, mark, tale, INK, FAR, clamp, lerp, span, sm5, outCubic, hash } from './kit.js'

const T = 3000
const WAVE = [3000, 3800]
const STAR = [3060, 3950]
const END = STAR[1] + 900

// where the pair is on the orbit, `k` through the fall: how wide (as a
// share of the ring) and how far round
function orbitAt(k) {
  const q = clamp(k, 0, 0.9999)
  return { r: 1.2 * (1 - q) ** 0.55, th: -0.6 + 15 * (1 - (1 - q) ** 0.42) }
}
// the wave's reach, as a share of the ring: out past it a little and back
const reach = (w) => {
  if (w <= 0) return 0
  const x = clamp(w)
  return 1 + 0.16 * Math.exp(-4.2 * x) * Math.sin(x * Math.PI * 1.35) * 3 - Math.exp(-7 * x)
}

// a star that is a light: a soft core and four tapering rays, two fainter
// between them; `r` its size
function light(pad, x, y, r, a = 1) {
  pad.disc(x, y, 0.55 + 0.35 * r, INK, a)
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2
    pad.cap(x, y, x + Math.cos(ang) * r * 2.4, y + Math.sin(ang) * r * 2.4, 0.42 * r, 0.05, INK, a)
  }
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2
    pad.cap(x, y, x + Math.cos(ang) * r * 1.2, y + Math.sin(ang) * r * 1.2, 0.26 * r, 0.04, INK, a * 0.6)
  }
}

export function binaryStory() {
  const pad = new Pad()
  const draw = (t) => {
    const M = mark()
    const C = [M.cx, M.cy]
    pad.clear()
    pad.zoom = { k: 1 + 0.05 * sm5(span(t, 0, T)), cx: C[0], cy: C[1] }
    const w = span(t, ...WAVE)
    const s = reach(w)
    const tc = Math.cos((M.tilt * Math.PI) / 180)
    const ts = Math.sin((M.tilt * Math.PI) / 180)
    // the sky: each star twinkling, and pushed aside by the wave as it goes
    // over it, and let back
    for (let i = 0; i < 58; i++) {
      const x0 = hash(i, 21) * 99 - 2
      const y0 = hash(i, 24) * 79 - 2
      const dx = x0 - C[0]
      const dy = y0 - C[1]
      const u = (dx * tc + dy * ts) / M.RX
      const v = (-dx * ts + dy * tc) / M.RY
      const d = Math.hypot(u, v) || 1
      const front = w > 0 ? Math.exp(-(((d - s * 1.25) / 0.22) ** 2)) : 0
      const push = 2.6 * front
      const x = x0 + (dx / (Math.hypot(dx, dy) || 1)) * push
      const y = y0 + (dy / (Math.hypot(dx, dy) || 1)) * push
      const tw = 0.5 + 0.5 * Math.sin(t * 0.0035 * (0.5 + hash(i, 27)) + hash(i, 29) * 6.28)
      const size = 0.45 + 0.4 * hash(i, 31)
      const a = (0.35 + 0.55 * tw) * (0.6 + 0.4 * hash(i, 33)) * (1 - 0.5 * front)
      if (hash(i, 35) > 0.85) light(pad, x, y, size * 0.9, a * 0.8)
      else pad.disc(x, y, size, INK, a)
    }
    const glows = []
    if (t < T) {
      for (const off of [0, Math.PI]) {
        // the arc behind it: short lines from where it was, thinning out
        let prev = null
        for (let j = 0; j <= 34; j++) {
          const tt = t - j * 16
          const o = orbitAt(tt / T)
          const p = M.at(o.th + off, o.r)
          if (prev) {
            const f = 1 - j / 34
            pad.line(prev[0], prev[1], p[0], p[1], INK, 0.75 * f ** 1.4, 0.18 + 0.4 * f)
          }
          prev = p
        }
        const o = orbitAt(t / T)
        const th = o.th + off
        const [x, y] = M.at(th, o.r)
        // nearer (the lower half of the orbit) is larger and brighter, and
        // their light quickens as they fall together
        const near = (Math.sin(th) + 1) / 2
        const quick = 1 + 0.18 * Math.sin(o.th * 2.2) * (t / T)
        const r = lerp(1.4, 2.3, near) * quick
        light(pad, x, y, r, lerp(0.78, 1, near))
        glows.push({ x: C[0] + (x - C[0]) * pad.zoom.k, y: C[1] + (y - C[1]) * pad.zoom.k, r: 2.2 + 2.4 * r, a: 0.35 + 0.3 * near, inner: 0.95, light: true })
      }
    }
    pad.zoom = null
    const cells = pad.cells()
    if (t >= T) {
      // the wave: the ring from nothing, a little past itself and back, and
      // a fainter one running on ahead of it and gone
      for (const p of M.ring) {
        cells.push([w >= 1 ? p.x : C[0] + (p.x - C[0]) * s, w >= 1 ? p.y : C[1] + (p.y - C[1]) * s, INK, 0, lerp(0.55, 1, sm5(w * 1.4))])
      }
      if (w < 1) {
        const e = outCubic(w) * 1.55
        for (let i = 0; i < M.ring.length; i += 2) {
          const p = M.ring[i]
          cells.push([C[0] + (p.x - C[0]) * e, C[1] + (p.y - C[1]) * e, FAR, 0, 0.55 * (1 - w) ** 1.5])
        }
      }
      // the star, out of where they touched, its long arms last, and four
      // long rays flaring out of it and drawing back
      const g = outCubic(span(t, ...STAR)) * 1.02
      for (const p of M.star) {
        if (p.k > g) continue
        cells.push([p.x, p.y, INK, 0, lerp(0.45, 1, clamp((g - p.k) / 0.1))])
      }
      const fl = span(t, T, T + 700)
      if (fl < 1) {
        pad.clear()
        const len = 44 * Math.sin(Math.PI * fl) ** 0.7
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2
          pad.cap(C[0], C[1], C[0] + Math.cos(ang) * len, C[1] + Math.sin(ang) * len, 0.9, 0.05, INK, 0.9 * (1 - fl))
        }
        pad.cells(cells)
      }
      const f = 1 - sm5(span(t, T, T + 700))
      if (f > 0.01) glows.push({ x: C[0], y: C[1], r: lerp(4, 24, 1 - f), a: 0.95 * f, inner: 0.75, light: true })
    }
    return { cells, glow: glows }
  }
  return tale({ end: END, draw, live: true, wash: { at: T, x: 47, y: 37, ms: 1250 } })
}

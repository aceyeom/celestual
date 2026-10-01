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

// a star that is a light: a soft core and four tapering rays, and four
// fainter between them; `r` its size, in cells
function light(x, y, r) {
  const core = [{ k: 0, cx: x, cy: y, r: 0.55 + 0.35 * r }]
  const rays = []
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    core.push({ k: 1, ax: x, ay: y, bx: x + Math.cos(a) * r * 2.4, by: y + Math.sin(a) * r * 2.4, ra: 0.42 * r, rb: 0.05 })
    const b = Math.PI / 4 + a
    rays.push({ k: 1, ax: x, ay: y, bx: x + Math.cos(b) * r * 1.2, by: y + Math.sin(b) * r * 1.2, ra: 0.26 * r, rb: 0.04 })
  }
  return { core, rays }
}

export function binaryStory(f = 1) {
  const pad = new Pad(f)
  const draw = (t) => {
    const M = mark(f)
    const C = [M.cx, M.cy]
    pad.clear()
    // the camera eases in a little on the two of them as they fall together
    const zk = 1 + 0.05 * sm5(span(t, 0, T))
    const Z = ([x, y]) => [C[0] + (x - C[0]) * zk, C[1] + (y - C[1]) * zk]
    const w = span(t, ...WAVE)
    const s = reach(w)
    const tc = Math.cos((M.tilt * Math.PI) / 180)
    const ts = Math.sin((M.tilt * Math.PI) / 180)
    // the sky: each star twinkling, and pushed aside by the wave as it goes
    // over it, and let back; in three brightnesses
    const sky = [[], [], []]
    const skyRays = []
    for (let i = 0; i < 58; i++) {
      const x0 = (hash(i, 21) * 99 - 2) * f
      const y0 = (hash(i, 24) * 79 - 2) * f
      const dx = x0 - C[0]
      const dy = y0 - C[1]
      const u = (dx * tc + dy * ts) / M.RX
      const v = (-dx * ts + dy * tc) / M.RY
      const d = Math.hypot(u, v) || 1
      const front = w > 0 ? Math.exp(-(((d - s * 1.25) / 0.22) ** 2)) : 0
      const push = 2.6 * f * front
      const l = Math.hypot(dx, dy) || 1
      const [x, y] = Z([x0 + (dx / l) * push, y0 + (dy / l) * push])
      const tw = 0.5 + 0.5 * Math.sin(t * 0.0035 * (0.5 + hash(i, 27)) + hash(i, 29) * 6.28)
      const a = (0.35 + 0.55 * tw) * (0.6 + 0.4 * hash(i, 33)) * (1 - 0.5 * front)
      const size = (0.45 + 0.4 * hash(i, 31)) * f
      const b = Math.min(2, Math.floor(a * 3.2))
      if (hash(i, 35) > 0.85) {
        const L = light(x, y, size * 0.9)
        sky[b].push(...L.core)
        skyRays.push(...L.rays)
      } else sky[b].push({ k: 0, cx: x, cy: y, r: size })
    }
    const layers = [[sky[0], INK, 0.35], [sky[1], INK, 0.6], [sky[2], INK, 0.85], [skyRays, INK, 0.35]]
    const glows = []
    if (t < T) {
      const trail = [[], [], []]
      const bodies = []
      const halos = []
      for (const off of [0, Math.PI]) {
        // the arc behind it: short pieces from where it was, thinning out
        let prev = null
        for (let j = 0; j <= 34; j++) {
          const o = orbitAt((t - j * 16) / T)
          const p = Z(M.at(o.th + off, o.r))
          if (prev) {
            const k = 1 - j / 34
            trail[Math.min(2, Math.floor((1 - k) * 3))].push({ k: 1, ax: prev[0], ay: prev[1], bx: p[0], by: p[1], ra: (0.18 + 0.4 * k) * f, rb: (0.18 + 0.4 * k) * f })
          }
          prev = p
        }
        const o = orbitAt(t / T)
        const th = o.th + off
        const [x, y] = Z(M.at(th, o.r))
        // nearer (the lower half of the orbit) is larger and brighter, and
        // their light quickens as they fall together
        const near = (Math.sin(th) + 1) / 2
        const quick = 1 + 0.18 * Math.sin(o.th * 2.2) * (t / T)
        const r = lerp(1.4, 2.3, near) * quick * f
        const L = light(x, y, r)
        bodies.push(...L.core)
        halos.push(...L.rays)
        glows.push({ x, y, r: (2.2 + 2.4 * r / f) * f, a: 0.35 + 0.3 * near, inner: 0.95, light: true })
      }
      layers.push([trail[0], INK, 0.75], [trail[1], INK, 0.42], [trail[2], INK, 0.18], [bodies, INK, 1], [halos, INK, 0.6])
    }
    pad.layers(layers)
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
        const len = 44 * f * Math.sin(Math.PI * fl) ** 0.7
        const rays = []
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2
          rays.push({ k: 1, ax: C[0], ay: C[1], bx: C[0] + Math.cos(a) * len, by: C[1] + Math.sin(a) * len, ra: 0.9 * f, rb: 0.05 })
        }
        pad.union(rays, INK, 0.9 * (1 - fl))
        pad.cells(cells)
      }
      const fk = 1 - sm5(span(t, T, T + 700))
      if (fk > 0.01) glows.push({ x: C[0], y: C[1], r: lerp(4, 24, 1 - fk) * f, a: 0.95 * fk, inner: 0.75, light: true })
    }
    return { cells, glow: glows }
  }
  const M = mark(f)
  return tale({ f, end: END, draw, live: true, wash: { at: T, x: Math.round(M.cx), y: Math.round(M.cy), ms: 1250 } })
}

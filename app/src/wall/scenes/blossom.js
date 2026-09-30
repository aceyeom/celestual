// ── blossom ─────────────────────────────────────────────────────────────────
// A cherry tree, and two birds. The tree comes into flower along its
// branches, a blossom at a time, out from the trunk, each opening with a
// little give. A bird flies in from either side and lands on the same
// branch, a little apart; they shuffle together and lean their heads in.
// Then a gust: every blossom lets its petals go, and they blow out across
// the glass, round in a slow wheel, and settle into the ring, while the two
// birds, where they sit touching, gather into the star. The pink goes out
// from the two of them, and the petals left over go on falling.
//
//      0   the bare tree
//    150   the blossom opening, out from the trunk
//   1500   the birds fly in, one from either side
//   2450   they land; 2900 they lean in together
//   3300   the gust: the petals let go
//   3650   the pink, from the birds
//   3800   the petals into the ring, the birds into the star

import {
  Pad, petals, mark, glideOf, tale, INK, ROSE, clamp, lerp, smooth, inOut, span, outBack, hash,
} from './kit.js'

const BLOOM = [150, 1500]
const FLY = [1500, 2450]
const LEAN = [2900, 3250]
const GUST = 3300
const WASH_AT = 3650
const MORPH = 3800
const PERCH = [[47.5, 15.1], [57.5, 12.6]]
const BK = 1.9

// the tree: a trunk from the foot of the glass, and its branches
const LIMBS = [
  [[6, 80], [12, 52], 3.4, 2.6], [[12, 52], [16, 36], 2.6, 2],
  [[16, 36], [34, 22], 1.9, 1.3], [[34, 22], [58, 15.5], 1.3, 0.8], [[58, 15.5], [80, 13], 0.8, 0.5],
  [[16, 36], [6, 22], 1.4, 0.8], [[6, 22], [2, 10], 0.8, 0.5],
  [[34, 22], [38, 8], 0.9, 0.5], [[58, 15.5], [66, 6], 0.6, 0.4], [[70, 14.2], [84, 22], 0.6, 0.4],
  [[24, 29], [30, 36], 0.8, 0.45], [[12, 52], [2, 44], 1.2, 0.6],
]
function tree(pad, a = 1) {
  for (const [[x0, y0], [x1, y1], r0, r1] of LIMBS) pad.cap(x0, y0, x1, y1, r0, r1, INK, 0.9 * a)
}
// the blossoms, along the branches (not the trunk), each with the moment it
// opens: further out along the tree, later
const FLOWERS = (() => {
  const out = []
  LIMBS.slice(2).forEach(([[x0, y0], [x1, y1]], li) => {
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 3.6)
    for (let i = 0; i <= n; i++) {
      const k = (i + 0.5 * hash(i, li)) / (n + 0.5)
      const x = lerp(x0, x1, k) + (hash(i, li + 40) - 0.5) * 3.5
      const y = lerp(y0, y1, k) + (hash(i, li + 80) - 0.5) * 3 - 0.8
      const far = Math.hypot(x - 16, y - 36) / 70
      out.push({ x, y, r: 1.5 + 1.1 * hash(i, li + 120), at: lerp(BLOOM[0], BLOOM[1], clamp(far + 0.15 * hash(i, li + 7))), seed: out.length })
    }
  })
  return out
})()
function blossom(pad, t, a = 1) {
  for (const f of FLOWERS) {
    const k = span(t, f.at, f.at + 380)
    if (k <= 0) continue
    const r = f.r * outBack(k, 2.2)
    if (r <= 0.2) continue
    pad.disc(f.x, f.y, r, ROSE, 0.85 * a)
    pad.set(f.x, f.y, ROSE, a)
  }
}

// a bird: a round body, a head, a tail, a wing that beats while it flies
function bird(pad, x, y, dir, flap, tilt = 0, a = 1, k = BK) {
  const P = (u, v) => [x + dir * u * k, y + v * k]
  pad.ell(x, y, 2.3 * k, 1.55 * k, dir * -8, INK, a)
  const [hx, hy] = P(2.1, -1.4 + tilt)
  pad.disc(hx, hy, 1.15 * k, INK, a)
  const [bx, by] = P(3.4, -1.3 + tilt)
  pad.set(bx, by, INK, 0.85 * a)
  pad.poly([P(-1.8, -0.4), P(-4.2, -1.6), P(-4, 0.3)], INK, 0.9 * a)
  // the wing: up, level or down with the beat
  const w = Math.sin(flap)
  pad.poly([P(-0.6, -0.6), P(1.2, -0.7), P(-1.4, -0.6 - 3.2 * w)], INK, 0.75 * a)
  const [ex, ey] = P(2.45, -1.6 + tilt)
  pad.set(ex, ey, INK, 0.25 * a)
  // (a little of the rose at the breast, the one colour on them)
  const [rx, ry] = P(1.4, 0.2)
  pad.set(rx, ry, ROSE, a)
}
function birds(pad, t, a = 1) {
  const out = []
  const lean = smooth(span(t, ...LEAN))
  for (const [i, from, dir] of [[0, [-8, 30], 1], [1, [104, 8], -1]]) {
    const k = span(t, FLY[0] + i * 120, FLY[1] - (1 - i) * 60)
    if (k <= 0) continue
    const e = inOut(k)
    const [px, py] = PERCH[i]
    // flying in on a dip and a rise, landing with the wings up
    const x = lerp(from[0], px, e) + dir * lean * 1.1
    const y = lerp(from[1], py - 1.4, e) + Math.sin(Math.PI * e) * (i ? 6 : -5)
    const flying = k < 1
    const flap = flying ? t * 0.045 : Math.PI * 1.5
    bird(pad, x, y, dir, flap, lean * 0.9, a)
    out.push([x, y])
  }
  return out
}

// the petals, let go by the gust: three off each blossom, blown right and
// round in a wheel about the middle of the glass
function gusted(t, M) {
  const out = []
  const u = t - GUST
  if (u <= 0) return out
  for (const f of FLOWERS) {
    for (let j = 0; j < 3; j++) {
      const h = hash(f.seed, j + 3)
      const d = u - h * 180
      if (d <= 0) { out.push([f.x, f.y, ROSE, 0, 0.9]); continue }
      // blown across, then round the middle, drawn in toward the orbit
      const wind = d * 0.03 * (0.7 + 0.6 * h)
      const x0 = f.x + wind
      const y0 = f.y + d * 0.006 + Math.sin(d * 0.008 + h * 6) * 2
      const k = clamp(d / 700)
      const a0 = Math.atan2(y0 - M.cy, x0 - M.cx)
      const r0 = Math.hypot(x0 - M.cx, y0 - M.cy)
      const a1 = a0 + k * 1.3
      out.push([M.cx + Math.cos(a1) * r0, M.cy + Math.sin(a1) * r0, ROSE, 0, 0.9])
    }
  }
  return out
}

export function blossomStory() {
  const pad = new Pad()
  const src = new Pad()
  let glide = null
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = mark()
      const ringFrom = gusted(MORPH, M)
      src.clear()
      const b = birds(src, MORPH)
      const starFrom = src.cells().filter((c) => c[4] >= 0.2)
      const mid = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
      glide = {
        ring: glideOf(ringFrom, M.ring.map((p) => [p.x, p.y]), { delay: (p) => hash(Math.round(p[0] * 7), Math.round(p[1] * 7)) * 220, flight: 800, bend: 7 }),
        star: glideOf(starFrom, M.star.map((p) => [p.x, p.y]), { delay: (p) => 80 + Math.hypot(p[0] - mid[0], p[1] - mid[1]) * 12, flight: 700, bend: 2 }),
      }
    }
    if (glide.ring.step(ms)) glide.star.step(ms)
  }
  const end = MORPH + 1350
  const draw = (t) => {
    const M = mark()
    pad.clear()
    const bare = 1 - smooth(span(t, GUST + 200, MORPH + 400))
    // a few petals falling all through, and on round the mark after
    petals(pad, t, { n: 12, seed: 41, v: 0.011, drift: 0.005, sway: 2.4, from: 700, box: [-6, -4, 104, 80], a: 0.85 * clamp((t - 700) / 800) })
    if (bare > 0.01) tree(pad, bare)
    if (t < GUST + 200) blossom(pad, t, 1 - smooth(span(t, GUST, GUST + 200)))
    if (t < MORPH) birds(pad, t)
    const cells = pad.cells()
    if (t >= GUST && t < MORPH) for (const c of gusted(t, M)) cells.push(c)
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    return { cells }
  }
  return tale({ end, draw, prep, live: true, wash: { at: WASH_AT, x: 52, y: 12, ms: 1400 } })
}

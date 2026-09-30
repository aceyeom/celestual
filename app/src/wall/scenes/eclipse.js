// ── the eclipse ─────────────────────────────────────────────────────────────
// Two lights, over the sea. The sun low on the left, its rays turning; the
// moon high on the right, a thin crescent. They come across the sky toward
// each other, each laying its own path of light on the water, and as they
// meet the moon goes dark and bites into the sun, the sun a thinner and
// thinner crescent, until the moon covers it exactly: totality. The corona
// stands out round the black disc, and the stars come out. Then, at the
// edge of the disc, one point of the sun comes back all at once, the way it
// does at the end of a real eclipse: the diamond ring. The pink goes out
// from that point. The diamond slides into the middle and opens into the
// star, and the rim of the moon tilts and widens, like a hoop turned toward
// you, into the ring.
//
//      0   the sun low left, the moon high right, the sea
//   1500   the moon goes dark as it reaches the sun, and bites into it
//   2800   totality: the corona, the stars coming out
//   3350   the diamond ring
//   3450   the pink, from the diamond
//   3600   the diamond into the star, the rim into the ring; whole by 4750

import {
  Pad, sky, sparkle, mark, tale, INK, FAR, ROSE, clamp, lerp, smooth, inOut, span, outCubic, D, hash,
} from './kit.js'

const HORIZON = 60
const R = 11
const MEET = [0, 2800]
const DARK = [1200, 1900]
const TOTAL = 2800
const DIAMOND = [3350, 3700]
const WASH_AT = 3560
const OPEN = [3600, 4750]

// where each of them is: across on gentle arcs to the middle of the mark
function sunAt(t, C) {
  const k = inOut(span(t, ...MEET))
  return [lerp(13, C[0], k), lerp(45, C[1], k) - 7 * Math.sin(Math.PI * k) * 0.6]
}
function moonAt(t, C) {
  const k = inOut(span(t, ...MEET))
  return [lerp(81, C[0], k), lerp(13, C[1], k) + 5 * Math.sin(Math.PI * k) * 0.6]
}

function sea(pad, t, lights, a = 1) {
  if (a <= 0.01) return
  for (let x = -4; x < 99; x++) pad.set(x, HORIZON, INK, 0.55 * a)
  // the swell: short dashes, drifting, fainter further out
  for (let row = HORIZON + 3; row < 80; row += 3) {
    const depth = (row - HORIZON) / 16
    for (let i = 0; i < 7; i++) {
      const x = Math.round(((hash(i, row) * 110 + t * 0.004 * (1 + depth)) % 110) - 8)
      const len = 2 + Math.round(depth * 2)
      for (let k = 0; k < len; k++) pad.set(x + k, row, FAR, 0.35 * a)
    }
  }
  // each light's path on the water: a column of broken dashes under it,
  // shimmering
  for (const [lx, width, strength] of lights) {
    for (let row = HORIZON + 2; row < 80; row++) {
      const w = width * (0.55 + 0.45 * Math.sin(row * 1.7 + t * 0.006)) * (1 + (row - HORIZON) * 0.03)
      const off = Math.sin(row * 2.3 + t * 0.004) * 1.4
      const x0 = Math.round(lx + off - w / 2)
      const x1 = Math.round(lx + off + w / 2)
      const al = strength * a * (0.9 - (row - HORIZON) * 0.025)
      if (al <= 0.04) continue
      for (let x = x0; x <= x1; x++) if ((x + row) % 3 !== 0) pad.set(x, row, INK, al)
    }
  }
}

function sun(pad, t, [x, y], a = 1, rays = 1) {
  // the rays, turning slowly, long and short by turns
  for (let i = 0; i < 12; i++) {
    const ang = i * 30 * D + t * 0.00035
    const long = i % 2 ? 3.6 : 6
    const r0 = R + 2
    const r1 = R + 2 + long * rays
    pad.cap(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, 0.65, 0.4, INK, 0.8 * a)
  }
  pad.disc(x, y, R + 0.3, INK, 0.85 * a)
  pad.disc(x, y, R - 1.2, INK, 0.16 * a)
}

// the moon: a crescent, lit on the side away from the sun, going dark as it
// comes to it (the new moon), a black disc over it
function moon(pad, t, [x, y], dark, a = 1) {
  if (dark < 1) {
    pad.disc(x, y, R, INK, (0.14 + 0.86 * dark) * a)
    // the crescent: the disc less a disc set off toward the sun
    const off = lerp(2.6, 0.2, dark)
    const cx = x - off * 1.2
    const cy = y + off * 0.9
    pad.fill((px, py) => (px - x) ** 2 + (py - y) ** 2 <= R * R && (px - cx) ** 2 + (py - cy) ** 2 > (R - 0.2) ** 2, x - R, y - R, x + R, y + R, INK, (0.9 - 0.4 * dark) * a)
  } else pad.disc(x, y, R, INK, a)
}

// the corona: streamers round the black disc, long and flickering
function corona(pad, t, [x, y], k) {
  if (k <= 0.01) return
  for (let i = 0; i < 20; i++) {
    const ang = i * 18 * D + 0.2 * Math.sin(i * 1.3)
    const len = (4 + 7 * hash(i, 3) + 2 * Math.sin(t * 0.008 + i)) * k
    const r0 = R + 0.8
    for (let r = 0; r < len; r += 1) {
      const al = 0.7 * k * (1 - r / len) ** 1.4
      pad.set(Math.round(x + Math.cos(ang) * (r0 + r)), Math.round(y + Math.sin(ang) * (r0 + r)), INK, al)
    }
  }
}

export function eclipseStory() {
  const pad = new Pad()
  const end = OPEN[1] + 950
  // the diamond, on the rim of the disc up and to the left
  const DA = -128 * D
  const draw = (t) => {
    pad.clear()
    const M = mark()
    const C = [M.cx, M.cy]
    const s = sunAt(t, C)
    const m = moonAt(t, C)
    const dark = smooth(span(t, ...DARK))
    const total = smooth(span(t, TOTAL - 250, TOTAL + 150))
    const open = span(t, ...OPEN)
    const go = smooth(span(t, OPEN[0], OPEN[0] + 500))
    // the stars come out at totality, and stay, faint, on the pink
    const starsK = Math.max(total * (1 - 0.6 * smooth(span(t, OPEN[0], OPEN[1]))), 0)
    sky(pad, t, { n: 40, seed: 11, ink: INK, box: [0, 0, 95, HORIZON - 4], a: starsK, mask: (x, y) => (Math.hypot(x - C[0], y - C[1]) < R + 9 ? 0 : 1) })
    // the paths of light on the water, one each, and one when they are one
    const lit = 1 - total * 0.8
    const merged = span(t, 2000, TOTAL)
    const lights = merged < 1
      ? [[s[0], 9 * (1 - dark * 0.5), 0.8 * lit], [m[0], 6 * (1 - dark), 0.5 * (1 - dark)]]
      : [[s[0], 5 + 6 * smooth(span(t, ...DIAMOND)), 0.35 + 0.5 * smooth(span(t, ...DIAMOND))]]
    sea(pad, t, lights, 1 - go)
    if (t < OPEN[0] + 600) {
      const fadeSun = 1 - smooth(span(t, OPEN[0], OPEN[0] + 500))
      sun(pad, t, s, fadeSun, 1 - total * 0.9)
      corona(pad, t, m, total * fadeSun)
    }
    // the moon: its disc until it opens, and then only its rim, going to the ring
    if (open <= 0) moon(pad, t, m, dark)
    else if (open < 1) pad.disc(m[0], m[1], R, INK, 1 - smooth(open * 2.2))
    const cells = pad.cells()
    let glow = null
    // the diamond: a point of the sun back at the rim, then into the middle
    const d = span(t, ...DIAMOND)
    if (d > 0 && t < OPEN[0] + 700) {
      const into = inOut(span(t, OPEN[0], OPEN[0] + 650))
      const x = lerp(m[0] + Math.cos(DA) * (R + 0.2), C[0], into)
      const y = lerp(m[1] + Math.sin(DA) * (R + 0.2), C[1], into)
      const size = Math.round(lerp(1, 7, outCubic(d)) * (1 - into * 0.3))
      pad.clear()
      sparkle(pad, x, y, size + 1, INK, 1, Math.round(size * 0.6))
      pad.set(x, y, ROSE, 1)
      pad.cells(cells)
      glow = { x, y, r: lerp(3, 9, outCubic(d)) * (1 - into * 0.5), a: 0.7 * (1 - into), inner: 0.9, light: true }
    }
    if (total > 0.05 && d <= 0) glow = { x: m[0], y: m[1], r: R * 1.9, a: 0.55 * total, inner: 0.05, light: true }
    // the ring: the moon's rim, a hoop tilting toward you as it widens, each
    // cell from where its direction meets the rim to where it is in the mark
    if (open > 0) {
      const e = inOut(open)
      const spin = (1 - e) * 55 * D
      for (const p of M.ring) {
        const dx = p.x - C[0]
        const dy = p.y - C[1]
        const [ex, ey] = M.at(p.th)
        const rc = Math.hypot(ex - C[0], ey - C[1]) || 1
        const k = R / rc
        // on the rim, turned a little back from where it will be
        const c = Math.cos(spin)
        const sn = Math.sin(spin)
        const sx = C[0] + (dx * c - dy * sn) * k
        const sy = C[1] + (dx * sn + dy * c) * k
        const x = lerp(sx, p.x, e)
        const y = lerp(sy, p.y, e)
        cells.push([e >= 1 ? p.x : x, e >= 1 ? p.y : y, INK, 0, lerp(0.75, 1, e)])
              }
      // the star, opening out of the diamond from the middle, its long arms last
      const g = outCubic(span(t, OPEN[0] + 350, OPEN[1])) * 1.02
      for (const p of M.star) {
        const reach = p.k
        if (reach > g) continue
        const edge = clamp((g - reach) / 0.08)
        cells.push([p.x, p.y, INK, 0, lerp(0.35, 1, edge)])
      }
    }
    return { cells, glow }
  }
  return tale({ end, draw, live: true, wash: { at: WASH_AT, x: 40, y: 28, ms: 1300 } })
}

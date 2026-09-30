// ── the umbrella ────────────────────────────────────────────────────────────
// Rain, at night, on a street; the two of them in the wet pavement upside
// down. He is standing under an umbrella, waiting. She runs in from the
// right with no umbrella, and he tilts his toward her as she comes, and she
// is under it, the rain drumming on it and not on her, and she takes his
// arm. The rain slows; the last of it turns, drop by drop, into petals,
// falling slower and turning as they fall. The pink goes out from under the
// umbrella. The canopy lifts off the shaft and opens into the ring, and the
// two of them and the shaft gather into the star; the petals go on falling
// round the mark.
//
//      0   the rain, him under the umbrella
//    500   she runs in over the right edge
//   1700   under it; he has tilted it to her
//   2150   she takes his arm
//   2500   the rain slows, and turns to petals
//   3500   the pink, from under the umbrella
//   3650   the canopy into the ring, the two of them into the star

import {
  Pad, figure, petals, mark, glideOf, tale, INK, FAR, ROSE, clamp, lerp, smooth, span, outCubic, hash, D,
} from './kit.js'

const G = 59
const HIM_X = 37
const HER_STOP = 52
const RUN = [500, 1800]
const TILT = [900, 1700]
const ARM = [2150, 2600]
const EASE = [2500, 3400]
const PETALS_IN = 2600
const WASH_AT = 3500
const MORPH = 3650
const S = 1.36
const SHAFT = 31
const RX = 17.5
const RY = 8.2

// the umbrella: a dome with a scalloped hem on eight ribs, a shaft to the
// hand and a hooked handle. `tilt` turns it about the hand, toward her.
function canopyAt(t) {
  const tilt = smooth(span(t, ...TILT)) * 11
  return { hx: HIM_X + 6.6, hy: G - 21.5, tilt }
}
function umbrella(pad, t, a = 1, shaftOnly = false, canopyOnly = false) {
  const { hx, hy, tilt } = canopyAt(t)
  const r = tilt * D
  const c = Math.cos(r)
  const s = Math.sin(r)
  // a point in the umbrella's own frame (x across, y down from the hand),
  // turned about the hand
  const P = (x, y) => [hx + x * c - y * s, hy + x * s + y * c]
  const apex = P(0, -SHAFT)
  if (!canopyOnly) {
    pad.cap(hx, hy, apex[0], apex[1], 0.45, 0.45, INK, 0.9 * a)
    // the handle, hooked back under the hand
    const h1 = P(0, 1.5)
    const h2 = P(-1.6, 2.6)
    pad.cap(hx, hy, h1[0], h1[1], 0.55, 0.55, INK, a)
    pad.cap(h1[0], h1[1], h2[0], h2[1], 0.55, 0.55, INK, a)
  }
  if (shaftOnly) return
  // the dome: half an ellipse, its hem in eight scallops between the ribs
  const top = -SHAFT
  const base = top + RY
  const ic = Math.cos(-r)
  const is = Math.sin(-r)
  const inside = (px, py) => {
    const dx = px - hx
    const dy = py - hy
    const x = dx * ic - dy * is
    const y = dx * is + dy * ic
    if (x < -RX || x > RX) return false
    const dome = base - RY * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2))
    const seg = ((x + RX) / (2 * RX)) * 8
    const scallop = base - 1.3 * Math.sin(Math.PI * (seg - Math.floor(seg)))
    return y >= dome && y <= scallop + 0.2
  }
  pad.fill(inside, hx - RX - 4, hy + top - 4, hx + RX + 4, hy + base + 4, INK, 0.94 * a)
  // a line of light along the top of the dome, where the lamp catches it
  for (let k = -0.8; k <= 0.8; k += 0.04) {
    const x = RX * k
    const y = base - RY * Math.sqrt(1 - k * k) + 1.1
    const [px, py] = P(x, y)
    if (Math.abs(k) < 0.7) pad.set(px, py, INK, 0.55 * a)
  }
  // the rib tips
  for (let i = 0; i <= 8; i++) {
    const x = -RX + (i * 2 * RX) / 8
    const [px, py] = P(x, base + 0.6)
    pad.set(px, py, INK, a)
  }
}
// how high the canopy is at a column, for the rain to stop on (and none
// under it): the dome's top, turned, near enough
function roofAt(t, x) {
  const { hx, hy, tilt } = canopyAt(t)
  const dx = x - hx + (SHAFT - RY) * Math.tan(tilt * D) * 0.9
  if (Math.abs(dx) > RX + 0.5) return null
  return hy - SHAFT + RY * (1 - Math.sqrt(Math.max(0, 1 - (dx / RX) ** 2))) + (x - hx) * Math.tan(tilt * D)
}

// the rain: drops three cells long, slanting, stopped by the umbrella and
// the pavement, where each lands in a small splash. `k` how hard.
function rain(pad, t, k) {
  if (k <= 0.01) return
  const n = 110
  for (let i = 0; i < n; i++) {
    if (hash(i, 51) > k) continue
    const v = 0.1 + 0.05 * hash(i, 52)
    const H = G + 22
    const y = ((t * v + hash(i, 53) * 400) % H) - 6
    const x = hash(i, 54) * 110 - 8 + y * 0.28
    const roof = roofAt(t, x)
    const under = roof !== null && y > roof - 1
    if (under && y < roof + 1.5) {
      // on the canopy: a spray either side
      pad.set(Math.round(x) - 1, Math.round(roof) - 1, FAR, 0.7)
      pad.set(Math.round(x) + 1, Math.round(roof) - 1, FAR, 0.7)
      continue
    }
    if (under) continue
    if (y >= G - 1 && y < G + 1.5) {
      pad.set(Math.round(x) - 1, G - 1, FAR, 0.75); pad.set(Math.round(x) + 1, G - 1, FAR, 0.75)
      continue
    }
    // and on the wet pavement, a ring that opens where a drop has landed
    if (y >= G + 1.5) {
      const land = ((y - G) / v) | 0
      if (land < 160 && hash(i, 55) < 0.5) {
        const rr = 1 + land / 70
        const py = G + 2 + Math.round(hash(i, 56) * 12)
        pad.set(Math.round(x - rr), py, INK, 0.35 * (1 - land / 160))
        pad.set(Math.round(x + rr), py, INK, 0.35 * (1 - land / 160))
      }
      continue
    }
    for (let j = 0; j < 3; j++) pad.set(Math.round(x - j * 0.28), Math.round(y - j), INK, 0.5 * (1 - j * 0.25))
  }
}

function him(pad, t) {
  const tilt = smooth(span(t, ...TILT))
  const { hx, hy } = canopyAt(t)
  return figure(pad, {
    x: HIM_X, g: G, s: S, dir: 1, reach: [[hx, hy], null], armF: [-6, 18],
    tilt: -6 * tilt, hx: 0.2 * tilt, lean: 2 + 3 * tilt,
  })
}
function her(pad, t) {
  const k = span(t, ...RUN)
  const e = k < 0.75 ? (k / 0.75) * 0.8 : 0.8 + 0.2 * outCubic((k - 0.75) / 0.25)
  const x = lerp(108, HER_STOP, e)
  const pace = k < 1 ? clamp((1 - k) * 4) : 0
  const arm = smooth(span(t, ...ARM))
  const breath = t > RUN[1] ? 0.12 * Math.sin((t - RUN[1]) / 380) : 0
  const him0 = figure(new Pad(), { x: HIM_X, g: G, s: S, dir: 1, reach: [[canopyAt(t).hx, canopyAt(t).hy], null] })
  const elbow = [lerp(him0.shoulder[0] + 3, HIM_X + 5, 0.5), him0.shoulder[1] + 6]
  return figure(pad, {
    her: true, ribbon: true, x, g: G, s: S * 0.93, dir: -1,
    walk: (t - RUN[0]) / 640, stride: pace, lean: 10 * pace + 2,
    reach: arm > 0.02 ? [[lerp(x - 4, elbow[0], arm), lerp(him0.shoulder[1] + 11, elbow[1], arm)], null] : null,
    tilt: 6 * smooth(span(t, 1900, 2400)), hy: breath, hair: 1.5 * pace + 0.3,
  })
}

// the pair and the umbrella upside down in the wet pavement, broken by the
// rain and moving
function reflect(pad, t, k = 1) {
  const cells = pad.cells()
  for (const c of cells) {
    const [x, y, ink, , a] = c
    if (y >= G || y < G - 60) continue
    const ry = 2 * G - y + 1
    if (ry > 84) continue
    const wob = Math.round(Math.sin(ry * 1.3 + t * 0.012) * 0.9)
    if (((ry + x) & 1) && ry > G + 8) continue
    pad.set(x + wob, ry, ink === ROSE ? ROSE : INK, a * 0.6 * k * (1 - (ry - G) / 26))
  }
}

export function umbrellaStory() {
  const pad = new Pad()
  const src = new Pad()
  let glide = null
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = mark()
      src.clear(); umbrella(src, MORPH, 1, false, true)
      const ringFrom = src.cells()
      src.clear(); him(src, MORPH); her(src, MORPH); umbrella(src, MORPH, 1, true)
      const starFrom = src.cells().filter((c) => c[4] >= 0.2)
      const { hx, hy } = canopyAt(MORPH)
      glide = {
        ring: glideOf(ringFrom, M.ring.map((p) => [p.x, p.y]), { delay: (p) => 40 + Math.abs(p[0] - hx) * 6, flight: 700, bend: 3.5 }),
        star: glideOf(starFrom, M.star.map((p) => [p.x, p.y]), { delay: (p) => 150 + Math.hypot(p[0] - hx, p[1] - hy + 12) * 5, flight: 640, bend: 2.2 }),
      }
    }
    if (glide.ring.step(ms)) glide.star.step(ms)
  }
  const end = MORPH + 1250
  const draw = (t) => {
    pad.clear()
    const hard = 1 - smooth(span(t, ...EASE))
    const street = 1 - smooth(span(t, MORPH - 100, MORPH + 500))
    // the street: the pavement's edge, and a lamp at the left
    for (let x = -6; x < 101; x++) pad.set(x, G, INK, 0.6 * street)
    pad.cap(8, 10, 8, G, 0.65, 0.8, INK, 0.9 * street)
    pad.cap(8, 10, 12.5, 8.5, 0.55, 0.55, INK, 0.9 * street)
    pad.poly([[11, 8.5], [15.5, 8.5], [14.8, 11], [11.7, 11]], INK, 0.9 * street)
    if (t < MORPH) {
      her(pad, t)
      him(pad, t)
      umbrella(pad, t)
      reflect(pad, t, 1)
    }
    rain(pad, t, hard)
    // the rain turning to petals: in from above as the rain goes
    const pk = smooth(span(t, PETALS_IN, PETALS_IN + 900))
    petals(pad, t, {
      n: 44, seed: 29, v: 0.013, drift: -0.004, sway: 2.6, from: PETALS_IN - 2200, box: [-6, -6, 104, G + 16],
      a: 0.9 * pk, alpha: (x, y) => (t >= MORPH ? 1 : roofAt(t, x) !== null && y > roofAt(t, x) - 1 ? 0 : 1),
    })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    return { cells, glow: street > 0.01 ? { x: 13, y: 10, r: 9, a: 0.45 * street, inner: 0.9 } : null }
  }
  return tale({ end, draw, prep, live: true, wash: { at: WASH_AT, x: 45, y: 26, ms: 1300 } })
}

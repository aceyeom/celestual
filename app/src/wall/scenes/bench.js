// ── the bench ───────────────────────────────────────────────────────────────
// Behind them, at night. A bench in a park, seen from its back, a lamp at
// the edge of the path and a branch of blossom hanging into the top of the
// glass; the moon, a few stars, petals coming down. He is sitting on the
// right of the bench, looking up. She comes along the path on the far side
// of it, from the left, stops at the other end, turns and sits. A beat. He
// turns his head to her. She leans her head on his shoulder and his arm goes
// round her. A star falls across the sky over them. The backlight turns
// pink out from their two heads; the bench and the ground bend into the
// ring, the two of them gather into the star, and the petals go on falling
// round the mark for as long as it is on the glass.
//
//      0   the park, him alone, the petals already falling
//    300   she comes in over the left edge, walking
//   2350   she stops at the end of the bench, and turns
//   2600   she sits
//   3350   he turns his head to her
//   3900   she leans her head on his shoulder; his arm goes round her
//   4450   the star falls
//   5000   the pink, from their heads
//   5150   the gathering: the bench into the ring, the two of them into
//          the star; whole by about 6000, and held

import {
  Pad, figure, petals, sky, sparkle, mark, glideOf, tale,
  INK, FAR, ROSE, lerp, smooth, inOut, span, outCubic,
} from './kit.js'

const G = 71
const HER_G = 67
const HIM_X = 60
const HER_X = 36
const WALK = [300, 2350]
const TURN = [2300, 2650]
const SIT = [2550, 3150]
const LOOK = [3350, 3700]
const LEAN = [3900, 4400]
const STAR = [4450, 5000]
const WASH_AT = 5000
const MORPH = 5150
const FADE = [4950, 5600]

function bench(pad, a = 1) {
  // the front legs, further off, and the rear legs, which carry the back up
  pad.cap(17, 60, 17.4, 67, 0.9, 0.9, INK, 0.5 * a)
  pad.cap(79, 60, 78.6, 67, 0.9, 0.9, INK, 0.5 * a)
  pad.cap(14.5, 43, 14.5, G, 1.3, 1.3, INK, 0.95 * a)
  pad.cap(81.5, 43, 81.5, G, 1.3, 1.3, INK, 0.95 * a)
  // the back: a top rail and a second, and the seat's back edge below; a
  // line of light along the top of each, where the lamp catches the wood
  pad.rect(10.5, 44.5, 75, 3, INK, 0.95 * a)
  pad.rect(10.8, 45, 74.4, 0.6, INK, 0.6 * a)
  pad.rect(11, 51.2, 74, 2.3, INK, 0.9 * a)
  pad.rect(11.5, 58.4, 73, 1.8, INK, 0.8 * a)
  // the arms, curling at the ends
  pad.cap(9, 55.6, 14.5, 54.4, 1.1, 1.1, INK, 0.9 * a)
  pad.cap(87, 55.6, 81.5, 54.4, 1.1, 1.1, INK, 0.9 * a)
  pad.disc(9, 55.4, 1.5, INK, 0.9 * a)
  pad.disc(87, 55.4, 1.5, INK, 0.9 * a)
}

function ground(pad, a = 1) {
  for (let x = -6; x < 101; x++) if (((x % 4) + 4) % 4 !== 3) pad.set(x, G, FAR, a)
}

const MOON = [79, 13, 6.5]
function scenery(pad, t, a) {
  if (a <= 0.01) return
  // the moon, full, with its seas
  const [mx, my, mr] = MOON
  pad.disc(mx, my, mr, INK, 0.3 * a)
  pad.disc(mx - 1.8, my - 1.2, 2.1, INK, 0.5 * a)
  pad.disc(mx + 2, my + 1.8, 1.6, INK, 0.48 * a)
  pad.disc(mx + 1.4, my - 2.6, 1, INK, 0.45 * a)
  // the branch, from off the top left, and its blossom
  pad.cap(-5, 2, 13, 8, 1.6, 1.1, INK, 0.85 * a)
  pad.cap(13, 8, 30, 9.5, 1.1, 0.55, INK, 0.8 * a)
  pad.cap(10, 7, 17, 1, 0.7, 0.45, INK, 0.75 * a)
  pad.cap(21, 9, 25, 15, 0.6, 0.45, INK, 0.75 * a)
  const bloom = [[3, 5, 2], [8, 9.5, 1.7], [15, 2.5, 1.6], [17, 8, 1.8], [23, 11, 1.5], [25.5, 15, 1.4], [29, 8.6, 1.4], [5, 1.5, 1.4], [20, 5.5, 1.2], [11.5, 11.5, 1.2]]
  for (const [x, y, r] of bloom) pad.disc(x, y, r, ROSE, 0.8 * a)
}

function him(pad, t, s = 1) {
  const look = smooth(span(t, ...LOOK))
  const hold = smooth(span(t, LEAN[0] + 150, LEAN[1] + 200))
  // looking up at the moon, and then at her
  return figure(pad, {
    x: HIM_X, g: HER_G, s: 1.75 * s, dir: 1, turn: 1, sit: 1, seat: 9.5, noLegs: true,
    hx: lerp(0.15, -0.6, look) - 0.3 * hold, hy: lerp(-0.45, 0.15, look) + 0.25 * hold, tilt: lerp(3, -8, look) - 4 * hold,
    reach: hold > 0.01 ? [null, [lerp(HIM_X - 9, HER_X - 3, hold), lerp(52, 41, hold)]] : null,
  })
}

function her(pad, t) {
  const w = span(t, ...WALK)
  // she eases in and slows to a stop at the end of the bench
  const e = w < 0.8 ? (w / 0.8) * 0.86 : 0.86 + 0.14 * outCubic((w - 0.8) / 0.2)
  const x = lerp(-12, HER_X, e)
  const walking = t < WALK[1] + 60
  const pace = walking ? Math.min(1, (1 - w) * 6) : 0
  const turn = smooth(span(t, ...TURN))
  const sit = inOut(span(t, ...SIT))
  const lean = smooth(span(t, ...LEAN))
  const breath = t > LEAN[1] ? 0.15 * Math.sin((t - LEAN[1]) / 420) : 0
  return figure(pad, {
    her: true, ribbon: true, x: x + 1.2 * sit, g: HER_G, s: 1.62, dir: 1,
    walk: (t - WALK[0]) / 1050, stride: 0.95 * pace, turn, sit, seat: 8.8, noLegs: sit > 0.5,
    hx: 1.9 * lean, hy: 1.5 * lean + breath, tilt: 20 * lean, hairTilt: 1.3 * lean, hair: 1.3 * pace,
  })
}

// the falling star: a head and a long tail, across the top of the sky
function falling(pad, t) {
  const k = span(t, ...STAR)
  if (k <= 0 || k >= 1) return
  const e = outCubic(k)
  const [x0, y0, x1, y1] = [90, 2, 46, 18]
  const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
  for (let i = 0; i < 16; i++) {
    const kk = Math.max(0, e - i * 0.022)
    pad.set(Math.round(lerp(x0, x1, kk)), Math.round(lerp(y0, y1, kk)), INK, fade * (1 - i / 16) ** 1.3)
  }
  sparkle(pad, lerp(x0, x1, e), lerp(y0, y1, e), 2, INK, fade, 1)
}

export function benchStory() {
  const pad = new Pad()
  const src = new Pad()
  let glide = null
  const m = () => mark()
  // what gathers into the mark: the bench and the ground into the ring, the
  // two of them into the star, as they are on the frame it begins
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = m()
      src.clear(); bench(src); ground(src)
      const ringFrom = src.cells()
      src.clear(); her(src, MORPH); him(src, MORPH)
      const starFrom = src.cells().filter((c) => c[4] >= 0.2)
      const hx = 50
      const hy = 34
      const far = 40
      const ring = glideOf(ringFrom, M.ring.map((p) => [p.x, p.y]), { delay: (p) => ((p[0] + 4) / 100) * 260, flight: 720, bend: 3 })
      const star = glideOf(starFrom, M.star.map((p) => [p.x, p.y]), { delay: (p) => 120 + (Math.hypot(p[0] - hx, p[1] - hy) / far) * 220, flight: 680, bend: 2.4 })
      glide = { ring, star }
    }
    if (glide.ring.step(ms)) glide.star.step(ms)
  }
  const end = MORPH + 1150
  const draw = (t) => {
    pad.clear()
    const fade = 1 - smooth(span(t, ...FADE))
    sky(pad, t, { n: 26, seed: 3, box: [34, 1, 95, 34], a: fade })
    scenery(pad, t, fade)
    falling(pad, t)
    // petals behind them
    petals(pad, t, { n: 14, seed: 7, v: 0.0105, drift: 0.0035, sway: 2.4, from: -9000, box: [-6, -4, 104, 74], a: 0.75 })
    if (t < MORPH) {
      ground(pad)
      her(pad, t)
      him(pad, t)
      bench(pad)
    }
    // and petals in front of them, a few, larger and nearer
    petals(pad, t, { n: 9, seed: 19, v: 0.016, drift: 0.005, sway: 3, from: -9000, box: [-6, -4, 104, 80], a: 0.95 })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    const moon = fade > 0.01 ? { x: MOON[0], y: MOON[1], r: 10, a: 0.5 * fade, inner: 0.9 } : null
    return { cells, glow: moon }
  }
  return tale({ end, draw, prep, live: true, wash: { at: WASH_AT, x: 48, y: 36, ms: 1400 } })
}

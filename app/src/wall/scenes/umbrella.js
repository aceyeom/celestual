// ── the umbrella ────────────────────────────────────────────────────────────
// Rain, at night, on a wet street under a lamp, in silhouette, the two of
// them upside down in the pavement. He is standing under an umbrella,
// waiting, his head a little down. She comes running in from the right
// with nothing over her, the intro's girl and the intro's run (folk.js),
// her hair and her hem streaming, and she brakes: a long step, a short one,
// the feet together, her hair and her skirt going on past her and swinging
// back. He has turned his head to her and tilted the umbrella her way as
// she came. She looks up at him. She slips her hand into the crook of his
// arm and leans into him a little. The rain eases, and the last of it comes
// down as petals, slow and turning. The pink goes out from under the
// umbrella; the canopy lifts off the shaft and opens into the ring, and
// the two of them and the shaft gather into the star.
//
// The bodies are the intro's, posed from their skeletons, their feet planted
// where they land and rolling heel to toe (folk.js `walker`), laid at a
// smaller size and in one ink; nothing is a cross-fade of drawings.
//
//      0   the rain; him under the umbrella
//    250   she runs in over the right edge
//   1650   she brakes; stopped by 2070
//   1700   he turns his head to her and tilts the umbrella over her
//   2350   she looks up at him
//   2800   her hand into the crook of his arm; she leans in
//   3100   the rain eases into petals
//   4050   the pink, from under the umbrella
//   4200   the canopy into the ring, the two of them into the star

import {
  Pad, softPetals, mark, glideOf, tale, folkLay, folkSheet, folkInto, folkCut,
  INK, ROSE, clamp, lerp, span, sm5, settle, moves, hash, D,
} from './kit.js'
import { standing, walker, lifted, runTop, follow, keyed, mixPose, slowing, stance } from '../folk.js'

const G = 64
const K = 0.88
const HIM_X = 34.5
const HER_X = 55
const TB = 1650
const DB = 420
const EASE = [3100, 3900]
const WASH_AT = 4050
const MORPH = 4200
const END = MORPH + 1300
const SHAFT = 26
const RX = 17
const RY = 7.4

// ── her: the intro's run, braking to a stand ──
const RUN = { T: 720, S: 0.38, A: 6.2, H: 23.05, bob: 0.55 }
RUN.v = (RUN.A * 2.3) / (RUN.S * RUN.T)
const phi = (t) => (t - TB) / RUN.T
const bob = (t) => RUN.H - RUN.bob * Math.cos(4 * Math.PI * (phi(t) - RUN.S / 2))
const REST_Y = stance('her', standing('her')).hipY
const GO = (RUN.v * DB) / 2
function hipAt(t) {
  if (t <= TB) return { x: -GO - RUN.v * (TB - t), y: bob(t) }
  const u = (t - TB) / DB
  return { x: -GO + RUN.v * DB * slowing(u), y: lerp(bob(t), REST_Y, sm5(clamp(u * 1.1))) }
}
const steps = []
for (let k = -12; k <= 0; k++) {
  const t = TB + (k * RUN.T) / 2
  steps.push({ leg: k & 1, t, fx: hipAt(t).x + RUN.A, off: t + RUN.S * RUN.T })
}
steps[steps.length - 1].off = TB + 250
steps.push({ leg: 1, t: TB + 175, fx: hipAt(TB + 175).x + 2.4, off: Infinity })
steps.push({ leg: 0, t: TB + 370, fx: 1.4, off: Infinity })
const herLegs = walker('her', steps, hipAt, RUN.v * RUN.T)
// her top: the run's arms, then arriving, a hand up to the rain in her hair,
// looking up at him, her near hand into his arm
const REST = standing('her')
const HER_KEYS = [
  [TB - 60, runTop('her', phi(TB - 60))],
  [TB, runTop('her', 0)],
  [TB + 150, { ...mixPose(runTop('her', 0.2), REST, 0.45), lean: 7, neck: -3 }],
  [TB + 420, { ...REST, lean: 2.5, neck: 1, nod: 3, sN: 20, eN: 70, sF: -6, eF: 26 }],
  [2350, { ...REST, lean: 1.5, neck: -2, nod: 1, sN: 14, eN: 55, sF: -5, eF: 22 }],
  [2700, { ...REST, lean: 0.5, neck: -7, nod: -9, sN: 16, eN: 48, sF: -5, eF: 20 }],
  [3050, { ...REST, lean: 3, neck: -6, nod: -8, sN: 44, eN: 62, handN: 'flat', sF: -4, eF: 20 }],
  [3500, { ...REST, lean: 4.5, neck: -3, nod: -4, sN: 42, eN: 66, handN: 'flat', sF: -4, eF: 20 }],
]
const tail = follow((t) => (hipAt(t + 1).x - hipAt(t - 1).x) / 2, 0, END)
function herPose(t) {
  const top = t < TB - 60 ? runTop('her', phi(t)) : keyed(HER_KEYS, t)
  const p = lifted('her', { ...top, ...herLegs(t) }, hipAt(t).y)
  const f = tail(t)
  // running, her hair and her hem lift and drop with each step, a beat behind
  const run = t < TB ? 1 : Math.max(0, 1 - (t - TB) / 300)
  const ph = 4 * Math.PI * (phi(t) - RUN.S / 2)
  return {
    ...p,
    hair: f.hair.map((a, i) => a + run * [1, 2.2, 3.6, 5, 6][i] * Math.sin(ph - 0.5 - 0.4 * i)),
    skirt: f.skirt + run * 3.5 * Math.sin(ph - 1.1),
  }
}
const herX = (t) => HER_X - K * hipAt(t).x

// ── him: still, the umbrella up in his near hand ──
function himPose(t) {
  const look = settle(span(t, 1700, 2300), 0.05)
  const breath = Math.sin((t / 3400) * Math.PI * 2)
  return standing('him', {
    lean: 1 + 0.3 * breath + moves(t, 0, [[2800, 3300, 1.5]]),
    neck: lerp(2, 9, look) - moves(t, 0, [[2700, 3200, 2]]),
    nod: lerp(1, 7, look),
    sN: lerp(22, 30, look), eN: lerp(96, 90, look), handN: 'fist',
    sF: -4, eF: 16,
  })
}
const tiltAt = (t) => moves(t, 0, [[1650, 2350, 13, (k) => settle(k, 0.08)]])

// the umbrella: a shaft from his hand, a dome with a scalloped hem on eight
// ribs, a tip, a hooked handle; tilted about the hand
function umbrella(pad, t, hand, parts = 'all') {
  const tilt = tiltAt(t) * D
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  const [hx, hy] = hand
  const P = (x, y) => [hx + x * c - y * s, hy + x * s + y * c]
  if (parts !== 'canopy') {
    const top = P(0, -SHAFT)
    pad.cap(hx, hy + 1.2, top[0], top[1], 0.42, 0.42, INK, 1)
    const h1 = P(0, 2.4)
    const h2 = P(-1.5, 3.4)
    pad.cap(hx, hy, h1[0], h1[1], 0.5, 0.5, INK, 1)
    pad.cap(h1[0], h1[1], h2[0], h2[1], 0.5, 0.45, INK, 1)
  }
  if (parts === 'shaft') return
  const base = -SHAFT + RY
  const ic = Math.cos(-tilt)
  const is = Math.sin(-tilt)
  pad.fill((px, py) => {
    const dx = px - hx
    const dy = py - hy
    const x = dx * ic - dy * is
    const y = dx * is + dy * ic
    if (x < -RX || x > RX) return false
    const dome = base - RY * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2)) ** 0.9
    const seg = ((x + RX) / (2 * RX)) * 8
    const scallop = base - 1.15 * Math.sin(Math.PI * (seg - Math.floor(seg)))
    return y >= dome && y <= scallop + 0.25
  }, hx - RX - 5, hy - SHAFT - 5, hx + RX + 5, hy + base + 5, INK, 1)
  const tip = P(0, -SHAFT - 1.8)
  const tip0 = P(0, -SHAFT + 0.5)
  pad.cap(tip0[0], tip0[1], tip[0], tip[1], 0.4, 0.25, INK, 1)
}
// where the canopy's top is over a column, for the rain to stop on
function roofAt(t, hand, x) {
  const tilt = tiltAt(t) * D
  const [hx, hy] = hand
  const cx = hx + Math.sin(tilt) * (SHAFT - RY)
  const dx = (x - cx) / Math.cos(tilt)
  if (Math.abs(dx) > RX) return null
  return hy - Math.cos(tilt) * (SHAFT - RY) - RY * Math.sqrt(1 - (dx / RX) ** 2) + (x - cx) * Math.tan(tilt)
}

// the rain: fine slanting lines, laid between the cells, each stopped by the
// canopy (a spray) or the pavement (a ring opening in the wet)
function rain(pad, t, k, hand) {
  if (k <= 0.01) return
  for (let i = 0; i < 90; i++) {
    if (hash(i, 51) > k) continue
    const v = 0.085 + 0.04 * hash(i, 52)
    const H = G + 26
    const y = ((t * v + hash(i, 53) * 900) % H) - 8
    const x = hash(i, 54) * 118 - 12 + y * 0.22
    const roof = roofAt(t, hand, x)
    if (roof !== null && y > roof - 0.5) {
      if (y < roof + 2.2) {
        pad.set(x - 1.2, roof - 0.8, INK, 0.45)
        pad.set(x + 1.2, roof - 1.1, INK, 0.45)
      }
      continue
    }
    if (y >= G - 0.5) {
      const age = (y - G) / v
      if (age < 220 && hash(i, 55) < 0.6) {
        const r = 0.6 + age / 60
        const py = G + 2 + hash(i, 56) * 11
        pad.ell(x, py, r, r * 0.3, 0, INK, 0.4 * (1 - age / 220))
      }
      continue
    }
    pad.line(x, y, x - 0.66, y - 3, INK, 0.42, 0.3)
  }
}

export function umbrellaStory() {
  const pad = new Pad()
  const src = new Pad()
  const SH = folkSheet()
  const SS = folkSheet()
  let glide = null
  const camera = (t) => ({ k: 1 + 0.06 * sm5(span(t, 0, MORPH)), cx: 47, cy: 44 })
  // the two of them and the umbrella, on a pad, through the camera
  const scene = (p, t, parts = 'all') => {
    const zoom = camera(t)
    p.zoom = zoom
    const h = folkLay('him', himPose(t), HIM_X, G, false, K, SH, zoom)
    const wrist = h.joints.AN.wrist
    const hand = h.at([wrist[0] + 0.6, wrist[1] + 0.4])
    // (the hand in the pad's own frame, before its camera)
    const handW = [zoom.cx + (hand[0] - zoom.cx) / zoom.k, zoom.cy + (hand[1] - zoom.cy) / zoom.k]
    if (parts === 'canopy') { umbrella(p, t, handW, 'canopy'); return handW }
    folkInto(p, SH)
    if (t > 150) {
      folkLay('her', herPose(t), herX(t), G, true, K, SS, zoom)
      folkCut(p, SS)
      folkInto(p, SS)
    }
    umbrella(p, t, handW, parts === 'people' ? 'shaft' : 'all')
    return handW
  }
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = mark()
      src.clear(); scene(src, MORPH, 'canopy')
      const ringFrom = src.cells()
      src.clear()
      const hand = scene(src, MORPH, 'people')
      const starFrom = src.cells().filter((c) => c[4] >= 0.25)
      const hx = hand[0]
      glide = {
        ring: glideOf(ringFrom, M.ring.map((p) => [p.x, p.y]), { delay: (p) => 40 + Math.abs(p[0] - hx) * 7, flight: 760, bend: 3.5 }),
        star: glideOf(starFrom, M.star.map((p) => [p.x, p.y]), { delay: (p) => 140 + Math.hypot(p[0] - hx - 6, p[1] - 30) * 5.5, flight: 700, bend: 2.2 }),
      }
    }
    if (glide.ring.step(ms)) glide.star.step(ms)
  }
  // the pair and the umbrella upside down in the wet, broken into bands by
  // the ripples and moving
  const reflect = (t, k) => {
    const cells = pad.cells()
    for (const [x, y, ink, , a] of cells) {
      if (y >= G || y < G - 60) continue
      const ry = 2 * G - y + 1
      if (ry > 86) continue
      const band = Math.sin(ry * 1.7 + t * 0.006)
      if (band < -0.55) continue
      const wob = Math.round(Math.sin(ry * 0.9 + t * 0.009) * 0.8)
      pad.put(x + wob, ry, ink === ROSE ? ROSE : INK, a * 0.42 * k * (1 - (ry - G) / 28))
    }
  }
  const draw = (t) => {
    pad.clear()
    const zoom = camera(t)
    pad.zoom = zoom
    const hard = 1 - sm5(span(t, ...EASE))
    const street = 1 - sm5(span(t, MORPH - 100, MORPH + 500))
    // the pavement's edge, and the lamp at the left
    for (let x = -12; x < 108; x += 0.5) pad.set(x, G, INK, 0.55 * street)
    pad.cap(7, 8, 7, G, 0.65, 0.85, INK, street)
    pad.cap(7, 8, 11.5, 6.4, 0.55, 0.5, INK, street)
    pad.poly([[9.8, 6.4], [14.4, 6.4], [13.6, 9.2], [10.6, 9.2]], INK, street)
    let hand = null
    if (t < MORPH) {
      hand = scene(pad, t)
      reflect(t, 1)
    } else hand = scene(new Pad(), MORPH, 'canopy')
    rain(pad, t, hard, hand)
    const pk = sm5(span(t, EASE[0] - 100, EASE[0] + 900))
    softPetals(pad, t, {
      n: 40, seed: 29, v: 0.009, drift: -0.003, sway: 2.6, from: EASE[0] - 3000, box: [-8, -8, 106, G + 14], size: 1.45,
      a: 0.95 * pk, alpha: (x, y) => (t >= MORPH || roofAt(t, hand, x) === null || y < roofAt(t, hand, x) - 1 ? 1 : 0),
    })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    const lx = zoom.cx + (12.1 - zoom.cx) * zoom.k
    const ly = zoom.cy + (8.4 - zoom.cy) * zoom.k
    return { cells, glow: street > 0.01 ? { x: lx, y: ly, r: 11, a: 0.5 * street, inner: 0.9 } : null }
  }
  return tale({ end: END, draw, prep, live: true, wash: { at: WASH_AT, x: 45, y: 24, ms: 1350 } })
}

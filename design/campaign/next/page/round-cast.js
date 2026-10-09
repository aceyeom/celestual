// ── the six, and the woman on the bus ──────────────────────────────────────
// The product's own bodies (`app/src/wall/scenes/rig.js`: HIM at 180 cm, HER
// at 165, sculpted in sections), posed for each world from its own clock, on
// twos, and drawn as silhouettes into a mask over that world's half. Seen
// from behind and a little above, over the shoulder, as the product's
// tellings see people. A small perspective is added to the rig's own long
// lens so the near shoulder reads nearer than the hands.
//
// Every pose is a function of the world's clock in frames: below zero the
// person is somebody above, doing what they do; from zero they are writing.

import { HIM, HER, withHair, solve, solid, camera, hull, at, V, breath } from '../../../../app/src/wall/scenes/rig.js'
import { WORLDS, LINKS, PLAN } from './round-time.js'

const D = Math.PI / 180
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const span = (x, a, b) => clamp((x - a) / (b - a))
const sm = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }
const lerp = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
// the clock in milliseconds, on twos
const ms = (w) => (w - (((w % 2) + 2) % 2)) * (1000 / 30)

// ── the builds, and their hair ─────────────────────────────────────────────
const SOL = withHair(HIM, { from: 11.6, nape: 5.4, back: 1.3, side: 0.9, top: 2.2, temple: 0.4, front: 1.4, behind: -2.2 })
const WREN = withHair(HER, { from: 5.2, nape: 4.0, back: 1.4, side: 1.5, top: 1.3, temple: -0.8, front: 1.0, behind: -2.4 })
const HUGO = withHair(HIM, { from: 12.8, nape: 6.6, back: 0.5, side: 0.3, top: 1.0, temple: 0.6, front: 0.7, behind: -2.0 })
const PIA = withHair(HER, { from: 11.2, nape: 8.0, back: 0.55, side: 0.4, top: 0.8, temple: 0.8, front: 0.5, behind: -2.3 })
// omar's hood: thick over the crown, down past the nape onto the shoulders
const OMAR = withHair(HIM, { from: 1.0, nape: -2.0, back: 3.4, side: 3.0, top: 2.6, temple: -4.0, front: 2.2, behind: -4.4 })
const YUNA = withHair(HER, { from: 11.0, nape: 8.4, back: 0.6, side: 0.4, top: 0.9, temple: 0.8, front: 0.5, behind: -2.2 })

// a bun at the back of a head, a clip, a hood's lip: shapes on the head's frame
const onHeadAt = (F, B, x, y, z) => at(F.head, [x, y - B.face.pivot[0], z - B.face.pivot[1]])
const bun = (F, B, r = 4.6) => ({ k: 's', c: onHeadAt(F, B, 0, 15.5, -11.5), r })

// ── a camera with a little perspective ─────────────────────────────────────
// the rig's own camera, and each point drawn nearer the more it stands
// toward the lens (`focal` cm away)
function lens(spec, focal) {
  const cam = camera(spec)
  const k = (p) => focal / Math.max(20, focal - cam.depth(p))
  const P = (p) => {
    const d = V.sub(p, cam.at)
    const s = cam.s * k(p)
    return [cam.x0 + s * V.dot(d, cam.right), cam.y0 - s * V.dot(d, cam.up)]
  }
  return { ...cam, P, k }
}
// the rig's `flat`, through the lens: discs, capsules, ellipses and hulls
function flatLens(list, cam) {
  const out = []
  for (const p of list) {
    if (p.k === 'rings') {
      let prev = null
      for (const ring of p.rings) {
        const cur = ring.map(cam.P)
        if (prev) out.push({ k: 3, pts: hull([...prev, ...cur]) })
        prev = cur
      }
    } else if (p.k === 's') {
      const [x, y] = cam.P(p.c)
      out.push({ k: 0, cx: x, cy: y, r: p.r * cam.s * cam.k(p.c) })
    } else if (p.k === 'c') {
      const [ax, ay] = cam.P(p.a)
      const [bx, by] = cam.P(p.b)
      out.push({ k: 1, ax, ay, bx, by, ra: p.ra * cam.s * cam.k(p.a), rb: p.rb * cam.s * cam.k(p.b) })
    } else {
      // an ellipsoid: drawn as the hull of its outline's points
      const pts = []
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2
        for (const [u, v] of [[Math.cos(a), Math.sin(a)]]) {
          for (const axis of [[u, v, 0], [u, 0, v], [0, u, v]]) {
            const local = [axis[0] * p.r[0], axis[1] * p.r[1], axis[2] * p.r[2]]
            const R = p.R
            const w = [R[0] * local[0] + R[1] * local[1] + R[2] * local[2], R[3] * local[0] + R[4] * local[1] + R[5] * local[2], R[6] * local[0] + R[7] * local[1] + R[8] * local[2]]
            pts.push(cam.P(V.add(p.c, w)))
          }
        }
      }
      out.push({ k: 3, pts: hull(pts) })
    }
  }
  return out
}
// a flat prop: a box in the world, as a hull of its corners
function box(c, h, R = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
  const pts = []
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const l = [sx * h[0], sy * h[1], sz * h[2]]
    pts.push(V.add(c, [R[0] * l[0] + R[1] * l[1] + R[2] * l[2], R[3] * l[0] + R[4] * l[1] + R[5] * l[2], R[6] * l[0] + R[7] * l[1] + R[8] * l[2]]))
  }
  return { k: 'pts', pts }
}

// ── drawing ────────────────────────────────────────────────────────────────
export const MASK_W = 540
export const MASK_H = 480
function drawShapes(ctx, shapes) {
  for (const s of shapes) {
    ctx.beginPath()
    if (s.k === 0) ctx.arc(s.cx, s.cy, Math.max(0.5, s.r), 0, Math.PI * 2)
    else if (s.k === 1) {
      const dx = s.bx - s.ax
      const dy = s.by - s.ay
      const L = Math.hypot(dx, dy) || 1
      const nx = -dy / L
      const ny = dx / L
      ctx.moveTo(s.ax + nx * s.ra, s.ay + ny * s.ra)
      ctx.lineTo(s.bx + nx * s.rb, s.by + ny * s.rb)
      ctx.lineTo(s.bx - nx * s.rb, s.by - ny * s.rb)
      ctx.lineTo(s.ax - nx * s.ra, s.ay - ny * s.ra)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(s.ax, s.ay, s.ra, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(s.bx, s.by, s.rb, 0, Math.PI * 2)
    } else if (s.pts) {
      ctx.moveTo(s.pts[0][0], s.pts[0][1])
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1])
      ctx.closePath()
    }
    ctx.fill()
  }
}
// a body and its props, through a camera, as shapes
function figure(B, F, extra, cam) {
  const list = [...solid(B, F), ...extra.filter((e) => e.k !== 'pts')]
  const shapes = flatLens(list, cam)
  for (const e of extra) if (e.k === 'pts') shapes.push({ k: 3, pts: hull(e.pts.map(cam.P)) })
  return shapes
}

// ── the phone's place in each writer's frame, in px of the half ────────────
// (the screen's rectangle, x0 y0 x1 y1; the page lays the product's letter
// screen on it). Held up at the left; yuna's is propped on the flour bin.
export const PHONE = [
  [72, 56, 412, 740],
  [72, 56, 412, 740],
  [72, 56, 412, 740],
  [72, 56, 412, 740],
  [72, 56, 412, 740],
  [84, 170, 424, 860],
]

// ── each world's camera ────────────────────────────────────────────────────
// Locked, a little above and behind, over the writer's right shoulder: the
// neck lands at (285, 352) of the mask (half the half's px), the head about
// 170 px of the half across, between the phone and the spine.
const FOCAL = 230
const S = 5.3
const NECK = { him: 53, her: 48 }
const cameraOn = (neck, yaw = -8, pitch = -10) => lens({ at: neck, s: S, yaw, pitch, x0: 285, y0: 352 }, FOCAL)
const CAMS = [
  cameraOn([0, 149, -80]),
  cameraOn([0, 100, -80], -8, -16),
  cameraOn([0, 149, -80]),
  cameraOn([0, 136.5, -80], -10, -4),
  cameraOn([0, 149, -80]),
  cameraOn([0, 136.5, -80], -8, -12),
]
// a point in the world from a place on the mask and a depth (cm toward the
// camera from where it looks; beyond that is negative)
function scr(cam, mx, my, dz = 0) {
  const k = FOCAL / Math.max(20, FOCAL - dz)
  const a = (mx - cam.x0) / (cam.s * k)
  const b = (cam.y0 - my) / (cam.s * k)
  return V.add(cam.at, V.add(V.add(V.mul(cam.right, a), V.mul(cam.up, b)), V.mul(cam.back, dz)))
}
// where a body's pelvis goes for its neck to be at a point
const rootUnder = (B, neck) => [neck[0], neck[1] - NECK[B.who], neck[2]]
// an arm reaching for a point, its elbow pointed out and back
// (seen from behind, a body's left arm is on the picture's left, at world -x)
const L = (p, pole = [-0.6, -0.3, 0.7]) => ({ ik: p, pole })
const R = (p, pole = [0.6, -0.3, 0.7], curl = 0) => ({ ik: p, pole, curl })
// a hand round the pole: the forearm level, the fingers closed
const GRIP = [1, 0.05, 0.25]
// the phone in the hand: how far it has come up, from the writer's own link
function raised(k, w) {
  const x = w + WORLDS[k].origin - LINKS[k].start
  const P = PLAN[k]
  if (x > P.land + 24) return 0
  return P.rise ? sm(span(x, P.rise[0], P.rise[1])) : x >= -6 ? 1 : 0
}
// the wrist under the phone's foot that holds it, and the one that types
function holdWrist(k, cam, dz = -40) {
  const p = PHONE[k]
  return scr(cam, p[2] / 2 - 46, p[3] / 2 - 40, dz)
}
function typeWrist(k, cam, w, dz = -38) {
  const p = PHONE[k]
  // a small press for each word, on the sixteenth grid
  const tap = 0.5 + 0.5 * Math.cos((w % 6) * (Math.PI / 3))
  return scr(cam, p[2] / 2 - 18, p[3] / 2 - 34 - 3 * tap, dz)
}
const g2 = (w) => w - (((w % 2) + 2) % 2)

// 1. the 51B: the woman standing in the aisle with a hand on the pole,
// asleep on her feet; sol in the window seat beyond it; sol rises and gives
// her the seat; she sits and is asleep against the glass; sol takes the pole
// she held and writes
function bus(w0, look) {
  const w = g2(w0)
  const cam = CAMS[0]
  const t = ms(w)
  const up = raised(0, w)
  const seat = scr(cam, 452, 300, -100)
  // sol: up out of the seat, out past her into the aisle
  const rise = sm(span(w, 8, 26))
  const out = sm(span(w, 24, 50))
  const settle = sm(span(w, 46, 64))
  const sN = V.lerp(V.lerp(V.add(seat, [0, 40 * rise, 0]), scr(cam, 318, 344, -14), out), cam.at, settle)
  const sit = 1 - rise
  const b = breath(t, 4200, 300)
  const toPole = sm(span(w, 50, 66))
  const sol = solve(SOL, {
    root: rootUnder(SOL, sN), yaw: lerp(-80, -178, out), pitch: lerp(4, -1, rise),
    s1: [lerp(10, 4, rise) + 1.2 * b, 0, 0], s2: [lerp(8, 3, rise), 0, 0],
    // seated, sol looks up at her (the canon, above yuna); standing, down
    // at the phone, and up when the colour comes
    neck: [lerp(10, 16, out) - 24 * look, 18 * look * (1 - out), 0],
    head: [lerp(6, 12, out) - 18 * look, 14 * look * (1 - out), 0],
    shrug: [0.4 * b, 0.4 * b],
    arms: [
      L(V.lerp(V.lerp(scr(cam, 410, 404, -116), scr(cam, 232, 520, -8), out), holdWrist(0, cam), up)),
      R(V.lerp(V.lerp(scr(cam, 440, 410, -112), scr(cam, 380, 520, -8), out), scr(cam, 378, 238, -32), toPole), GRIP, toPole),
    ],
    legs: [{ fk: [86 * sit, 4, 0, 88 * sit, 0] }, { fk: [86 * sit, 4, 0, 88 * sit, 0] }],
  })
  // the woman: aside to let him out, then into the seat, and asleep
  const aside = sm(span(w, 14, 32))
  const go = sm(span(w, 36, 58))
  const down = sm(span(w, 50, 64))
  const asleep = sm(span(w, 58, 116))
  const wN = V.lerp(V.lerp(cam.at, scr(cam, 222, 352, 6), aside), V.add(seat, [0, 40 * (1 - down), 0]), go)
  const sway = Math.sin(t / 900) * (1 - go)
  const nod = Math.max(0, Math.sin(t / 700)) * 8 * (1 - go)
  const her = solve(YUNA, {
    root: rootUnder(YUNA, wN), yaw: lerp(178, 278, go) + 5 * sway, roll: 2 * sway, pitch: 0,
    s1: [lerp(4, 8, down), 0, 2 * sway], s2: [lerp(4, 6, down), 0, 10 * asleep],
    neck: [lerp(20, 8, go) + nod, 0, 12 * asleep], head: [lerp(16, 4, go) + nod, 0, 18 * asleep],
    arms: [
      L(V.lerp(scr(cam, 232, 520, -8), scr(cam, 430, 404, -112), go)),
      R(V.lerp(scr(cam, 378, 238, -32), scr(cam, 470, 410, -104), sm(span(w, 28, 44))), GRIP, 1 - sm(span(w, 28, 44))),
    ],
    legs: [{ fk: [86 * down, 4, 0, 88 * down, 0] }, { fk: [86 * down, 4, 0, 88 * down, 0] }],
  })
  const hers = { shapes: figure(YUNA, her, [bun(her, YUNA, 5.2)], cam) }
  const sols = { shapes: figure(SOL, sol, [], cam) }
  // the seat's back hides whoever sits in it
  const seatBack = { shapes: [{ k: 3, pts: [[386, 376], [540, 376], [540, 480], [386, 480]] }], ink: 0 }
  return out < 0.5 ? [sols, seatBack, hers] : [hers, seatBack, sols]
}

// 2. the café: wren on the riser's edge, packing the guitar away, latching
// the case, then writing
function cafe(w0, look) {
  const w = g2(w0)
  const cam = CAMS[1]
  const t = ms(w)
  const up = raised(1, w)
  const root = rootUnder(WREN, cam.at)
  const b = breath(t, 3800, 0)
  // into the case until the lid comes down; the two latches at -60 and -54
  const packing = 1 - sm(span(w, -84, -70))
  const latch = 1 - sm(span(w, -50, -40))
  const reach = packing * (0.5 + 0.5 * Math.sin(t / 650))
  const lean = Math.max(packing, 0.6 * latch)
  const F = solve(WREN, {
    root, yaw: 186 - 10 * lean, pitch: -2,
    s1: [8 + 10 * lean, 0, 10 * lean], s2: [8 + 8 * reach + b, -6 * lean, 8 * lean],
    neck: [lerp(14, 22, up) - 24 * look, -10 * lean, 0], head: [lerp(10, 14, up) - 18 * look, 6 * lean - 4, 0],
    arms: [
      L(V.lerp(V.lerp(scr(cam, 300, 470, -10), scr(cam, 398, 452, -26), lean), holdWrist(1, cam), up)),
      R(V.lerp(V.lerp(scr(cam, 330, 470, -8), scr(cam, 470 + 20 * reach, 446 - 10 * reach, -30), lean), scr(cam, 376, 470, -22), up)),
    ],
    legs: [{ fk: [86, 6, 0, 88, 0] }, { fk: [84, 4, 0, 86, 0] }],
  })
  // the guitar case, open on the riser beside her, its lid up while she packs
  const caseAt = V.add(root, [36, -6, -10])
  const extra = [box(caseAt, [12, 5, 44])]
  if (packing > 0.02) extra.push(box(V.add(caseAt, [12, 4 + 18 * packing, 0]), [1.5, 18 * packing + 1, 44]))
  return [{ shapes: figure(WREN, F, extra, cam) }]
}

// 3. the reading room: hugo at the end of a row in his coat, as the
// building's timer puts the lamps out; he looks up at the dark row; the
// phone out of his pocket; writing in the dark
function library(w0, look) {
  const w = g2(w0)
  const cam = CAMS[2]
  const t = ms(w)
  const up = raised(2, w)
  const root = rootUnder(HUGO, cam.at)
  const b = breath(t, 4400, 900)
  // one hand on the chair back beside him, the other in his pocket
  const F = solve(HUGO, {
    root, yaw: 184, pitch: 0,
    s1: [4 + b, 0, 0], s2: [3, 0, 0],
    neck: [lerp(8, 18, up) - 24 * look, lerp(10, 0, up), 0], head: [lerp(4, 12, up) - 16 * look, lerp(8, -4, up), 0],
    arms: [
      L(V.lerp(scr(cam, 214, 456, -18), holdWrist(2, cam), up)),
      R(V.lerp(scr(cam, 412, 448, -30), scr(cam, 372, 524, -6), up)),
    ],
  })
  return [{ shapes: figure(HUGO, F, [], cam) }]
}

// 4. the roof: pia at the parapet with her tea, the cup in both hands; then
// the cup in her right and the phone in her left
function roof(w0, look) {
  const w = g2(w0)
  const cam = CAMS[3]
  const t = ms(w)
  const up = raised(3, w)
  const root = rootUnder(PIA, cam.at)
  const b = breath(t, 4600, 200)
  // a sip now and then while she is above
  const sip = (1 - up) * sm(Math.sin(Math.PI * span(((w % 150) + 150) % 150, 40, 76)))
  const F = solve(PIA, {
    root, yaw: 184, pitch: lerp(6, 2, up),
    s1: [lerp(8, 4, up) + b, 0, 0], s2: [lerp(8, 6, up), 0, 0],
    neck: [lerp(4, 16, up) - 24 * look - 12 * sip, 0, 0], head: [lerp(0, 10, up) - 16 * look - 8 * sip, -4, 0],
    arms: [
      L(V.lerp(scr(cam, 262, 408 - 40 * sip, -30), holdWrist(3, cam), up)),
      R(V.lerp(scr(cam, 300, 404 - 40 * sip, -30), scr(cam, 392, 440, -20), up), [0.6, -0.5, 0.6]),
    ],
  })
  const cupAt = at(F.hand[1], [0, -6, 0])
  return [{ shapes: figure(PIA, F, [box(V.add(cupAt, [0, 4, -2]), [4.2, 6, 4.2])], cam) }]
}

// 5. the corner: omar, hood up, hands in his pockets against the cold, a
// shiver now and then; then the phone
function corner(w0, look) {
  const w = g2(w0)
  const cam = CAMS[4]
  const t = ms(w)
  const up = raised(4, w)
  const root = rootUnder(OMAR, cam.at)
  const b = breath(t, 3600, 500)
  const shiver = 0.7 * Math.sin(t / 140) * (1 - up) * (Math.sin(t / 2100) > 0.6 ? 1 : 0)
  const F = solve(OMAR, {
    root, yaw: 182, pitch: 0,
    s1: [6 + b + shiver, 0, 0], s2: [6, 0, shiver],
    neck: [lerp(6, 18, up) - 24 * look, 0, 0], head: [lerp(4, 12, up) - 16 * look, -2, 0],
    shrug: [2.5 * (1 - up), 2.5 * (1 - up)],
    arms: [
      L(V.lerp(scr(cam, 196, 520, -6), holdWrist(4, cam), up)),
      R(scr(cam, 380, 520, -6)),
    ],
  })
  return [{ shapes: figure(OMAR, F, [], cam) }]
}

// 6. the bakery: yuna at the oven with the peel, sliding loaves in; then at
// the steel bench, her phone propped on the flour bin, one finger to it
function bakery(w0, look) {
  const w = g2(w0)
  const cam = CAMS[5]
  const t = ms(w)
  const b = breath(t, 4000, 100)
  const atBench = sm(span(w, -30, -6))
  const push = (1 - atBench) * (0.5 + 0.5 * Math.sin(t / 520))
  const neck = V.lerp(scr(cam, 176, 330, -40), cam.at, atBench)
  const root = rootUnder(YUNA, neck)
  const writing = sm(span(w, -4, 6)) * (1 - sm(span(w, PLAN[5].send + 6, PLAN[5].send + 14)))
  const F = solve(YUNA, {
    root, yaw: lerp(150, 184, atBench), pitch: 0,
    s1: [6 + 6 * push + lerp(0, 10, atBench) + b, 0, 0], s2: [lerp(4, 10, atBench), 0, 0],
    // at the bench she looks down at the phone; at the flood up into the light at her right
    neck: [lerp(6, 24, atBench) - 28 * look, 0, 0], head: [lerp(4, 16, atBench) - 12 * look, lerp(10, -4, atBench) + 24 * look, 0],
    arms: [
      L(V.lerp(scr(cam, 120 - 24 * push, 300, -64), scr(cam, 214, 470, -36), atBench)),
      R(V.lerp(scr(cam, 160 - 24 * push, 296, -58), V.lerp(scr(cam, 380, 470, -36), typeWrist(5, cam, w, -46), writing), atBench)),
    ],
  })
  const extra = [bun(F, YUNA, 5.0)]
  if (atBench < 0.5) {
    // the peel: its long handle and blade, out to the oven at her left
    const a = at(F.hand[0], [0, 0, 0])
    const tip = scr(cam, 60 - 30 * push, 230, -150)
    extra.push({ k: 'c', a, b: tip, ra: 1.3, rb: 1.3 }, box(tip, [14, 0.8, 12]))
  }
  return [{ shapes: figure(YUNA, F, extra, cam) }]
}

const POSES = [bus, cafe, library, roof, corner, bakery]

// ── the mask of a world at a moment ────────────────────────────────────────
// layers far to near; an ink of 0 is something in front that hides them
export function drawCast(ctx, world, w, look = 0) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, MASK_W, MASK_H)
  for (const layer of POSES[world](w, look)) {
    ctx.fillStyle = layer.ink === 0 ? '#000' : '#fff'
    drawShapes(ctx, layer.shapes)
  }
}

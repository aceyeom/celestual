// ── the umbrella ────────────────────────────────────────────────────────────
// Rain, at night, on a wet street under a lamp, in silhouette; the two of
// them upside down in the pavement. He is standing under an umbrella,
// waiting, his weight on one leg. She comes running from the right with
// nothing over her, her hair wet and streaming back, her skirt swinging,
// and brakes: a long step that she sinks into, leaning back against it, a
// short one, and her feet together, her hair and her skirt going on past
// her and swinging back. He has seen her coming, tilted the umbrella her
// way, and he steps in to her. She catches her breath, and pushes her wet
// hair back off her face, and looks up at him. He puts his hand under her
// chin. She steps in and lays her forehead against his chest, and his hand
// goes round her back and he bows his head over hers. The rain thins, and
// the last of it comes down as petals. The camera has come in to the two
// of them. The pink goes out from under the umbrella; the canopy lifts off
// and opens into the ring, and the two of them gather into the star.
//
// ── her run ─────────────────────────────────────────────────────────────────
// Written down as a gait is measured: the hip, the knee and the ankle
// through a stride of an easy run (flexed at the hip as the foot lands,
// the knee giving under her to forty degrees, the push off the toe, the
// heel coming up high behind her and the knee driving through), so the
// legs move as legs do; and she is put on the ground by her feet, not the
// other way round (`gaitOf`): while a foot is down it does not move, it
// turns about the heel as it lands and about the ball of the foot as it
// leaves, and the body is wherever that puts it; while neither is down she
// is in the air, and falls as anything thrown falls. The bounce of her
// running is not written anywhere; it is what that comes to.
//
//      0   the rain; him under the umbrella, waiting
//    450   she runs in over the right edge
//   1500   her braking step; stopped by 2400
//   1300   he tilts the umbrella over her; steps in at 1900
//   2550   she pushes her wet hair back
//   3200   she looks up at him
//   3550   his hand under her chin
//   4250   she steps in and leans against his chest
//   4400   the rain eases into petals
//   5600   the pink, from under the umbrella
//   5750   the canopy into the ring, the two of them into the star

import { Pad, softPetals, mark, glideOf, tale, INK, ROSE, clamp, lerp, span, sm5, moves, hash } from './kit.js'
import {
  HIM, HER, solve, solid, flat, camera, chains, sheet, cloth, breath, wander, V, mv, at, onHead, cyc, turn,
} from './rig.js'

const TB = 1500
const RUN_T = 680
const HIM_X = -34
const HER_END = 21
const EASE = [4400, 5200]
const WASH_AT = 5600
const MORPH = 5750
const END = MORPH + 1300
const D = Math.PI / 180

// ── the run, as a gait is written down ──────────────────────────────────────
// For one leg, a stride from the moment its foot lands (0) to the next time
// it lands (1): the hip's flexion, the knee's and the ankle's (toe up), in
// degrees; the foot is down until 0.4.
const HIP = [[0, 30], [0.1, 24], [0.2, 12], [0.3, 0], [0.4, -9], [0.5, -2], [0.6, 15], [0.7, 30], [0.8, 39], [0.9, 35]]
const KNEE = [[0, 18], [0.08, 32], [0.16, 40], [0.26, 34], [0.4, 21], [0.5, 52], [0.6, 84], [0.7, 97], [0.8, 74], [0.9, 36]]
const ANKLE = [[0, 3], [0.08, 10], [0.2, 18], [0.32, 8], [0.4, -21], [0.5, -12], [0.6, -2], [0.7, 4], [0.8, 4], [0.9, 3]]
const DOWN = 0.4
// when each foot is down in the run, up to her braking step: the near
// foot's comes down at TB, and the stop is written below
function runDowns(i) {
  const out = []
  const first = i === 0 ? 0 : 0.5
  for (let k = -6; k < 0; k++) {
    const on = TB + (k + first) * RUN_T
    if (on + DOWN * RUN_T <= TB) out.push([on, on + DOWN * RUN_T])
  }
  if (i === 0) out.push([TB, Infinity])
  return out
}
const DOWNS = [runDowns(0), runDowns(1)]
const isDown = (i, t) => DOWNS[i].some(([a, b]) => t >= a && t < b)
const runLegs = (t) => [0, 1].map((i) => {
  const ph = (t - TB) / RUN_T + (i ? 0.5 : 0)
  return { fk: [cyc(HIP, ph), 3, 0, cyc(KNEE, ph), cyc(ANKLE, ph)] }
})
// how much she is running (1) and how much standing (0)
const running = (t) => 1 - sm5(span(t, TB - 40, TB + 520))
// her pelvis tipped forward, and her body leaning into the run, back
// against the stop, and upright
const pelvisPitch = (t) => lerp(4, 11, running(t)) + 1.5 * Math.sin(((t - TB) / RUN_T) * 4 * Math.PI) * running(t)
const trunkLean = (t) => 8 * running(t) + moves(t, 0, [[TB - 30, TB + 150, -9], [TB + 150, TB + 520, 5], [TB + 520, TB + 900, -1]])

// ── the stop, and after ─────────────────────────────────────────────────────
// From her braking step her feet are written down where they go, and her
// body is carried over them: the near foot has come down at TB, heel first,
// and rolls flat; the far foot swings through and comes down a short step
// ahead of it (`FAR_ON`), heel first; the near foot rolls up onto its ball,
// leaves (`NEAR_OFF`) and is set down beside the other (`NEAR_ON`). Later,
// to come in to him, she takes one small step with it (`IN`). Her pelvis
// slows from the run's pace to a stand over her feet on a smooth curve, and
// is never higher than her legs can reach with the knees a little bent, so
// it sinks into the braking step and rises out of it as the legs let it.
const FAR_ON = TB + 290
const NEAR_OFF = TB + 470
const NEAR_ON = TB + 700
const IN = [4250, 4620]
const STRIDE = 30 // how far ahead of the near heel the far heel lands
const BESIDE = 6 // how far behind the far heel the near heel is set
const STEP = 2
const LEG = HER.thigh + HER.shin
// the ankle of a foot rolled about a point on the ground: about its heel
// when the toe is up (`pitch` > 0), about its ball when it is down; `g` is
// that point's x (she faces -x) and the answer the ankle's [x, y]
function rolled(g, kind, pitch) {
  const p = pitch * D
  const c = Math.cos(p)
  const s = Math.sin(p)
  const [u, v] = kind === 'heel'
    ? [HER.heel * c - HER.ankle * s, HER.heel * s + HER.ankle * c]
    : [-HER.ball * c - HER.ankle * s, -HER.ball * s + HER.ankle * c]
  return [g - u, v]
}
// a foot's pitch (toe up positive) from its turn, facing -x
const pitchOf = (R) => Math.atan2(R[5], -R[2]) / D
// a smooth curve from p0 (going at v0 a ms) to p1 (at v1) over `ms`
function hermite(p0, v0, p1, v1, ms, u) {
  const x = clamp(u)
  const h00 = 2 * x ** 3 - 3 * x ** 2 + 1
  const h10 = x ** 3 - 2 * x ** 2 + x
  const h01 = -2 * x ** 3 + 3 * x ** 2
  const h11 = x ** 3 - x ** 2
  return h00 * p0 + h10 * v0 * ms + h01 * p1 + h11 * v1 * ms
}

// ── her on the ground ───────────────────────────────────────────────────────
// Worked out once, every 2ms. Up to her braking step she is put on the
// ground by her feet: a foot that is down stays where it came down, turning
// about its heel and then the ball of it, and the body is wherever that
// puts it; in the air she goes on as she left the ground, falling, to land
// where her next foot comes down. From the braking step, the stop as above.
function feetRel(t) {
  const F = solve(HER, { root: [0, 0, 0], yaw: -90, pitch: pelvisPitch(t), legs: runLegs(t) })
  return [0, 1].map((i) => {
    const f = F.foot[i]
    return { heel: at(f, [0, -HER.ankle, -HER.heel]), ball: at(f, [0, -HER.ankle, HER.ball]), ankle: f.p, toeUp: f.R[5] > 0 }
  })
}
function gaitOf() {
  const t0 = DOWNS[1][0][0]
  const n = Math.ceil((END - t0) / STEP) + 1
  const kTB = Math.round((TB - t0) / STEP)
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const pivots = [null, null]
  let x = 0
  let y = 0
  let vx = -0.16
  let flight = null
  // the run, to the braking step
  for (let k = 0; k <= kTB; k++) {
    const t = t0 + k * STEP
    const rel = feetRel(t)
    for (let i = 0; i < 2; i++) {
      const down = isDown(i, t)
      if (down && !pivots[i]) {
        const kind = rel[i].toeUp ? 'heel' : 'ball'
        pivots[i] = { kind, w: [x + rel[i][kind][0], 0, rel[i][kind][2]] }
      } else if (!down) pivots[i] = null
    }
    const s = pivots[0] ? 0 : pivots[1] ? 1 : -1
    if (s >= 0) {
      flight = null
      const P = pivots[s]
      if (P.kind === 'heel' && !rel[s].toeUp) {
        P.w = [P.w[0] - rel[s].heel[0] + rel[s].ball[0], P.w[1] - rel[s].heel[1] + rel[s].ball[1], P.w[2]]
        P.kind = 'ball'
      }
      const nx = P.w[0] - rel[s][P.kind][0]
      if (k) vx = (nx - x) / STEP
      x = nx
      y = P.w[1] - rel[s][P.kind][1]
    } else {
      if (!flight) {
        let next = Infinity
        let who = 0
        for (let i = 0; i < 2; i++) for (const [a] of DOWNS[i]) if (a > t && a < next) { next = a; who = i }
        const land = feetRel(next)[who]
        flight = { t0: t - STEP, y0: y, t1: next, y1: -land[land.toeUp ? 'heel' : 'ball'][1] }
      }
      x += vx * STEP
      const u = (t - flight.t0) / (flight.t1 - flight.t0)
      const tf = flight.t1 - flight.t0
      y = flight.y0 + (flight.y1 - flight.y0) * u + 0.5 * 0.00098 * tf * tf * u * (1 - u)
    }
    px[k] = x
    py[k] = y
  }
  // ── the stop: where everything is at the braking step
  const xTB = px[kTB]
  const yTB = py[kTB]
  const vxTB = (px[kTB] - px[kTB - 3]) / (3 * STEP)
  const vyTB = (py[kTB] - py[kTB - 3]) / (3 * STEP)
  const at0 = solve(HER, { root: [xTB, yTB, 0], yaw: -90, pitch: pelvisPitch(TB), legs: runLegs(TB) })
  const atB = solve(HER, { root: [px[kTB - 1], py[kTB - 1], 0], yaw: -90, pitch: pelvisPitch(TB - STEP), legs: runLegs(TB - STEP) })
  // the near heel on the ground, and its pitch as it came down
  const nearHeel = at(at0.foot[0], [0, -HER.ankle, -HER.heel])[0]
  const nearPitch0 = pitchOf(at0.foot[0].R)
  const lane = [at0.foot[0].p[2], at0.foot[1].p[2]]
  // the far foot in the air, and how it is moving
  const farA0 = at0.foot[1].p
  const farV0 = V.mul(V.sub(at0.foot[1].p, atB.foot[1].p), 1 / STEP)
  const farPitch0 = pitchOf(at0.foot[1].R)
  // where the knees point as she lands, for the legs to go on from
  const poleOf = (F, i) => V.norm(V.sub(F.shin[i].p, V.lerp(F.thigh[i].p, F.foot[i].p, 0.5)))
  const pole0 = [poleOf(at0, 0), poleOf(at0, 1)]
  // the footfalls
  const farHeel = nearHeel - STRIDE
  const farLand = rolled(farHeel, 'heel', 8)
  const besideHeel = farHeel + BESIDE
  const inHeel = besideHeel - 11
  // each foot at a moment: its ankle and its pitch
  const foot = (i, t) => {
    if (i === 1) {
      if (t < FAR_ON) {
        const u = span(t, TB, FAR_ON)
        const ms = FAR_ON - TB
        const ax = hermite(farA0[0], farV0[0], farLand[0], -0.02, ms, u)
        let ay = hermite(farA0[1], farV0[1], farLand[1], -0.015, ms, u)
        // it clears the ground on the way through
        ay = Math.max(ay, farLand[1] + 4 * Math.sin(Math.PI * u) ** 2 * (1 - u) + 0.01)
        return { a: [ax, ay, lerp(farA0[2], lane[1], sm5(u))], pitch: lerp(farPitch0, 8, sm5(u)) }
      }
      const p = 8 * (1 - sm5(span(t, FAR_ON, FAR_ON + 100)))
      const [ax, ay] = rolled(farHeel, 'heel', p)
      return { a: [ax, ay, lane[1]], pitch: p }
    }
    if (t < NEAR_OFF) {
      // flat, then up onto the ball of it as it is about to leave
      const down = nearPitch0 * (1 - sm5(span(t, TB, TB + 90)))
      const up = -32 * sm5(span(t, NEAR_OFF - 120, NEAR_OFF))
      if (up < 0) {
        const [ax, ay] = rolled(nearHeel - HER.heel - HER.ball, 'ball', up)
        return { a: [ax, ay, lane[0]], pitch: up }
      }
      const [ax, ay] = rolled(nearHeel, 'heel', down)
      return { a: [ax, ay, lane[0]], pitch: down }
    }
    const swing = (from, fromPitch, heel, t0s, t1s, lift) => {
      const u = span(t, t0s, t1s)
      const to = rolled(heel, 'heel', 0)
      const ax = hermite(from[0], 0, to[0], 0, t1s - t0s, u)
      const ay = hermite(from[1], 0, to[1], 0, t1s - t0s, u) + lift * Math.sin(Math.PI * u)
      return { a: [ax, ay, lane[0]], pitch: lerp(fromPitch, 0, sm5(u)) + 10 * Math.sin(Math.PI * u) * (1 - u) }
    }
    if (t < NEAR_ON) return swing(rolled(nearHeel - HER.heel - HER.ball, 'ball', -32), -32, besideHeel, NEAR_OFF, NEAR_ON, 5)
    if (t < IN[0]) { const [ax, ay] = rolled(besideHeel, 'heel', 0); return { a: [ax, ay, lane[0]], pitch: 0 } }
    if (t < IN[1]) return swing(rolled(besideHeel, 'heel', 0), 0, inHeel, IN[0], IN[1], 3.5)
    const [ax, ay] = rolled(inHeel, 'heel', 0)
    return { a: [ax, ay, lane[0]], pitch: 0 }
  }
  // her pelvis: slowing from the run's pace to a stand over her feet, a
  // little forward as she looks up at him, and in to him at the last
  const standX = (rolled(farHeel, 'heel', 0)[0] + rolled(besideHeel, 'heel', 0)[0]) / 2 - 2
  const Dx = clamp((1.8 * Math.abs(standX - xTB)) / Math.max(0.02, Math.abs(vxTB)), 450, 1100)
  const STAND = HER.root - 1.2
  const Dy = 750
  const nearer = (t) => sm5(span(t, 3250, 3800))
  const into = (t) => sm5(span(t, 4250, 4900))
  const hipsAt = (t, rx, ry) => {
    const R = turn(pelvisPitch(t), -90, 0)
    return [1, -1].map((side) => V.add([rx, ry, 0], mv(R, [side * HER.hip[0], HER.hip[1], HER.hip[2]])))
  }
  const raw = new Float64Array(n)
  const feet = [[], []]
  for (let k = kTB; k < n; k++) {
    const t = t0 + k * STEP
    const u = span(t, TB, TB + Dx)
    px[k] = hermite(xTB, vxTB, standX, 0, Dx, u) - 6 * nearer(t) - 7 * into(t)
    let yNom = hermite(yTB, vyTB, STAND, 0, Dy, span(t, TB, TB + Dy)) - 2.2 * Math.sin(Math.PI * span(t, TB + 40, TB + 560)) - 1.2 * into(t)
    // no higher than both legs reach with the knees a little bent
    const f0 = foot(0, t)
    const f1 = foot(1, t)
    feet[0].push(f0)
    feet[1].push(f1)
    for (let it = 0; it < 2; it++) {
      const hips = hipsAt(t, px[k], yNom)
      for (let i = 0; i < 2; i++) {
        const a = i ? f1.a : f0.a
        const dx = hips[i][0] - a[0]
        const dz = hips[i][2] - a[2]
        const room = Math.sqrt(Math.max(0, (0.992 * LEG) ** 2 - dx * dx - dz * dz))
        const over = hips[i][1] - (a[1] + room)
        if (over > 0) yNom -= over
      }
    }
    raw[k] = yNom
  }
  // smoothed, and held under the legs' reach again
  for (let k = kTB; k < n; k++) {
    let sum = 0
    let wsum = 0
    for (let j = -15; j <= 15; j++) {
      const q = Math.min(n - 1, Math.max(kTB, k + j))
      const w = Math.exp(-(j * j) / 60)
      sum += raw[q] * w
      wsum += w
    }
    // (the first few steps keep the run's own height, so she lands on it)
    const blend = sm5(span(k, kTB, kTB + 12))
    py[k] = Math.min(raw[k] + 0.4, lerp(raw[k], sum / wsum, blend))
  }
  // everything along so that she comes to stand where the scene has her
  const shift = HER_END - (standX)
  for (let k = 0; k < n; k++) px[k] += shift
  const read = (arr, t) => {
    const f = clamp((t - t0) / STEP, 0, n - 1)
    const i = Math.min(n - 2, Math.floor(f))
    return lerp(arr[i], arr[i + 1], f - i)
  }
  const v0 = (px[1] - px[0]) / STEP
  const POLE = [-1, 0.05, 0]
  return {
    root: (t) => (t < t0 ? [px[0] + v0 * (t - t0), py[0], 0] : [read(px, t), read(py, t), 0]),
    legs: (t) => {
      if (t < TB) return runLegs(t)
      const k = Math.min(n - 1, Math.max(kTB, Math.round((t - t0) / STEP)))
      const b = sm5(span(t, TB, TB + 220))
      return [0, 1].map((i) => {
        const f = feet[i][k - kTB] || foot(i, t)
        return { ik: [f.a[0] + shift, f.a[1], f.a[2]], pole: V.norm(V.lerp(pole0[i], POLE, b)), foot: [-90, f.pitch] }
      })
    },
    speed: (t) => (t < t0 ? -v0 : (read(px, t - 20) - read(px, t + 20)) / 40),
  }
}

// ── her ─────────────────────────────────────────────────────────────────────
// She faces -x; her left side is toward us (the near side), so her near
// arm and leg are her left, [0].
function herPose(t, G, him) {
  const run = running(t)
  const ph = (t - TB) / RUN_T
  const b = breath(t, lerp(1300, 3200, sm5(span(t, TB + 400, TB + 4000))), TB)
  const deep = lerp(1.4, 0.5, sm5(span(t, TB + 600, TB + 3500)))
  const lean = trunkLean(t)
  const up = moves(t, 0, [[3200, 3650, 1]]) - moves(t, 0, [[4300, 4800, 0.8]])
  const into = sm5(span(t, 4250, 4900))
  const pose = {
    root: G.root(t), yaw: -90 + 4 * run * Math.sin(ph * 2 * Math.PI),
    pitch: pelvisPitch(t),
    s1: [lean * 0.4 + 4 * into, -3 * run * Math.sin(ph * 2 * Math.PI), 0],
    s2: [lean * 0.6 - deep * b + 5 * into, -5 * run * Math.sin(ph * 2 * Math.PI), 0],
    // her head held level through the run and the stop, looking ahead,
    // then up at him, then down against him
    neck: [-lean * 0.35 - 7 * up + 10 * into, 0, 0],
    head: [-lean * 0.55 - pelvisPitch(t) * 0.4 - 12 * up + 14 * into + wander(t, 4, 0.3) * 0.8, 0, wander(t, 5, 0.25) * 0.8],
    shrug: [deep * b * 1.1, deep * b * 1.1],
    legs: G.legs(t),
  }
  pose.arms = herArms(t, run, ph, him, pose)
  return pose
}
// Her arms: pumping as she runs, forward and out for balance as she stops,
// down; then her near hand up to her forehead and back over her head
// through her wet hair; and at the last, on his chest. The near arm always
// reaches for where its hand is going (so a gesture never begins with a
// jump), and between gestures that is where the swing would put it, its
// elbow where the swing would put it too.
function herArms(t, run, ph, him, base) {
  const swing = (i) => {
    const c = Math.cos(2 * Math.PI * (ph + (i ? 0.5 : 0) - 0.3))
    const r = [4 + 26 * c, 8, 0, 88 + 10 * c]
    const brake = [14, 12, 0, 42]
    const rest = [4, 7, 0, 14]
    const k = sm5(span(t, TB, TB + 220)) * (1 - sm5(span(t, TB + 300, TB + 800)))
    return r.map((v, j) => lerp(lerp(rest[j], v, run), brake[j], k))
  }
  const arms = [{ fk: swing(0) }, { fk: swing(1) }]
  const body = solve(HER, { ...base, arms })
  const sh = body.upper[0].p
  const rest = body.hand[0].p
  const poleSwing = V.norm(V.sub(body.fore[0].p, V.lerp(sh, rest, 0.5)))
  let p = rest
  let pole = poleSwing
  // Her wet hair pushed back: the hand up in front of her chest to her
  // forehead, back over the crown, down behind her head, out and down behind
  // her shoulder, and back to her side, on one smooth path through those
  // places, still at either end and never through her; the elbow keyed
  // along with it
  if (t > HAIR[0][0] && t < HAIR[HAIR.length - 1][0]) {
    const where = {
      rest, front: at(body.s2, [14, 2, 24]), brow: at(body.head, onHead(HER, 1.5, 17, 11)),
      crown: at(body.head, onHead(HER, 2.5, 23, -2)), nape: at(body.head, onHead(HER, 3, 12, -11)),
      out: at(body.s2, [28, 5, -8]),
    }
    const keys = HAIR.map(([tk, name, pl]) => [tk, where[name], pl === 'swing' ? poleSwing : pl])
    p = path(keys.map(([tk, q]) => [tk, q]), t)
    let i = 0
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++
    const u = sm5(span(t, keys[i][0], keys[i + 1][0]))
    pole = turnRound(keys[i][2], keys[i + 1][2], V.sub(p, sh), u)
  }
  const chest = sm5(span(t, 4300, 4900))
  if (chest > 0 && him) {
    p = V.lerp(p, at(him.s2, [-6, 15, 12]), chest)
    pole = turnRound(pole, [0, -0.8, 0.55], V.sub(p, sh), chest)
  }
  arms[0] = { ik: p, pole }
  return arms
}

// the hair pushed back: when the hand is where, and where its elbow points
const HAIR = [
  [2500, 'rest', 'swing'], [2740, 'front', [-0.5, -0.6, 0.6]], [2920, 'brow', [-0.6, -0.2, 0.75]],
  [3170, 'crown', [-0.4, 0.55, 0.7]], [3400, 'nape', [-0.15, 0.45, 0.85]], [3700, 'out', [0.15, -0.25, 0.9]],
  [3980, 'rest', 'swing'],
]
// A smooth path through points at moments, [[t, [x, y, z]], ...]: still at
// the first and the last, and through each between at the pace its
// neighbours set (Catmull-Rom tangents, by time), so it never stops or
// jerks at one.
function path(keys, t) {
  const n = keys.length
  if (t <= keys[0][0]) return keys[0][1]
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  let i = 0
  while (i < n - 2 && t >= keys[i + 1][0]) i++
  const [t1, p1] = keys[i]
  const [t2, p2] = keys[i + 1]
  const tan = (j) => (j <= 0 || j >= n - 1 ? [0, 0, 0] : V.mul(V.sub(keys[j + 1][1], keys[j - 1][1]), 1 / (keys[j + 1][0] - keys[j - 1][0])))
  const m1 = tan(i)
  const m2 = tan(i + 1)
  const dt = t2 - t1
  const u = (t - t1) / dt
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return [0, 1, 2].map((k) => h00 * p1[k] + h10 * m1[k] * dt + h01 * p2[k] + h11 * m2[k] * dt)
}
// a direction turned `k` of the way from `a` to `b` round the axis `ax`,
// both first laid square to it
function turnRound(a, b, ax, k) {
  const n = V.norm(ax)
  const sq = (v) => { const q = V.sub(v, V.mul(n, V.dot(v, n))); return V.len(q) < 1e-6 ? null : V.norm(q) }
  const pa = sq(a)
  const pb = sq(b)
  if (!pa || !pb || k <= 0) return pa || a
  if (k >= 1) return pb
  const ang = Math.atan2(V.dot(V.cross(pa, pb), n), V.dot(pa, pb)) * k
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  // Rodrigues, round n, of pa (which is square to n)
  return V.add(V.mul(pa, c), V.mul(V.cross(n, pa), s))
}

// ── him ─────────────────────────────────────────────────────────────────────
// Facing +x (toward her); his right side is toward us, so his near arm and
// leg are his right, [1]; the umbrella is in his far hand, his left.
const tiltAt = (t) => moves(t, 3, [[1300, 2200, 12], [4300, 4900, -5]])
function himPose(t, her) {
  const b = breath(t, 4300, 900)
  const step = moves(t, 0, [[1900, 2350, 1]])
  const look = sm5(span(t, 450, 900))
  const down = moves(t, 0, [[3200, 3650, 0.6]]) + moves(t, 0, [[4350, 4950, 1]])
  const sway = Math.sin(t / 1500) * (1 - look)
  const x = HIM_X + 5 * step + 0.8 * sway
  // weight on his far leg, the near knee soft; then the near foot a step in
  const nearFoot = [HIM_X + 7 + 12 * step, HIM.ankle + 5 * Math.sin(Math.PI * span(t, 1900, 2350)), 10]
  const farFoot = [HIM_X - 4, HIM.ankle, -10]
  return {
    root: [x, HIM.root - 1.4 - 1.2 * Math.sin(Math.PI * span(t, 1900, 2350)), 0], yaw: 90, pitch: 2 + 3 * down,
    roll: 2 * (1 - step),
    s1: [1 + 2 * down, 0, -1.2 * (1 - step)],
    s2: [2 + 3 * down - 0.7 * b, 0, -0.6],
    neck: [4 - 4 * look + 8 * down + wander(t, 11, 0.25) * 0.5, 0, 0],
    head: [2 - 6 * look + 12 * down + wander(t, 12, 0.3) * 0.7, 0, 0],
    shrug: [0.4 * b, 0.4 * b],
    arms: himArms(t, x, her),
    legs: [
      { ik: farFoot, pole: [1, 0.1, 0], foot: [90, 0] },
      { ik: nearFoot, pole: [1, 0.1, 0], foot: [90, 0] },
    ],
  }
}
function himArms(t, x, her) {
  const body = solve(HIM, { root: [x, HIM.root - 1.4, 0], yaw: 90 })
  // the umbrella's hand, in front of his chest, and out toward her as he
  // tilts it over her
  const out = sm5(span(t, 1300, 2200))
  const hold = at(body.s2, [3, 5 + 3 * out, 22 + 10 * out])
  // his free hand: at his side; then under her chin; then round her back
  let free = at(body.s1, [-17, -16, 3])
  const chin = sm5(span(t, 3550, 4050))
  const back = sm5(span(t, 4350, 4950))
  if (her) {
    const jaw = at(her.head, onHead(HER, 0, 0.5, 5))
    const spine = at(her.s2, [4.5, 14, -6.5])
    free = V.lerp(V.lerp(free, V.add(jaw, [3, -1.5, 3]), chin), spine, back)
  }
  return [
    { ik: hold, pole: [0, -0.6, -0.8] },
    { ik: free, pole: V.lerp([-0.3, -0.8, 0.6], [-0.4, -0.6, 0.8], chin) },
  ]
}

// ── the umbrella ────────────────────────────────────────────────────────────
// A shaft from his hand and a hooked handle below it, a dome on eight ribs
// with a scalloped hem, a tip; tilted toward her about his hand. Side on,
// all of it lies in the one plane.
const SHAFT = 86
const RAD = 57
const RISE = 23
function umbrella(hand, t, cam, part = 'all') {
  const th = tiltAt(t) * D
  const c = Math.cos(th)
  const s = Math.sin(th)
  const W = (u, v) => cam.P([hand[0] + u * c + v * s, hand[1] - u * s + v * c, hand[2]])
  const out = []
  if (part !== 'canopy') {
    const [ax, ay] = W(0, -7)
    const [bx, by] = W(0, SHAFT)
    out.push({ k: 1, ax, ay, bx, by, ra: 0.75 * cam.s, rb: 0.6 * cam.s })
    const [hx, hy] = W(-3.2, -10.5)
    const [mx, my] = W(-1.2, -11)
    out.push({ k: 1, ax, ay, bx: mx, by: my, ra: 0.9 * cam.s, rb: 0.9 * cam.s })
    out.push({ k: 1, ax: mx, ay: my, bx: hx, by: hy, ra: 0.9 * cam.s, rb: 0.85 * cam.s })
  }
  if (part !== 'shaft') {
    const pts = []
    const base = SHAFT - RISE
    for (let i = 0; i <= 40; i++) {
      const u = -RAD + (2 * RAD * i) / 40
      pts.push(W(u, base + RISE * Math.sqrt(Math.max(0, 1 - (u / RAD) ** 2)) ** 0.85))
    }
    for (let i = 40; i >= 0; i--) {
      const u = -RAD + (2 * RAD * i) / 40
      const seg = ((u + RAD) / (2 * RAD)) * 8
      pts.push(W(u, base + 2.6 * Math.sin(Math.PI * (seg - Math.floor(seg)))))
    }
    out.push({ k: 3, pts })
    const [tx, ty] = W(0, SHAFT + 5)
    const [t0x, t0y] = W(0, SHAFT - 1)
    out.push({ k: 1, ax: t0x, ay: t0y, bx: tx, by: ty, ra: 0.8 * cam.s, rb: 0.45 * cam.s })
  }
  return out
}
// the top of the canopy over a column of the glass, for the rain
function roofOf(hand, t, cam) {
  const th = tiltAt(t) * D
  const c = Math.cos(th)
  const s = Math.sin(th)
  const base = SHAFT - RISE
  const top = []
  for (let i = 0; i <= 40; i++) {
    const u = -RAD + (2 * RAD * i) / 40
    const v = base + RISE * Math.sqrt(Math.max(0, 1 - (u / RAD) ** 2)) ** 0.85
    top.push(cam.P([hand[0] + u * c + v * s, hand[1] - u * s + v * c, hand[2]]))
  }
  return (x) => {
    if (x < top[0][0] || x > top[top.length - 1][0]) return null
    for (let i = 1; i < top.length; i++) if (top[i][0] >= x) return lerp(top[i - 1][1], top[i][1], (x - top[i - 1][0]) / (top[i][0] - top[i - 1][0] || 1))
    return null
  }
}

// her hair: roots round the back of her head, behind her ears and across
// the nape, each falling down and a little out
const ROOTS = [-112, -84, -56, -28, 0, 28, 56, 84, 112].map((a) => {
  const r = a * D
  return { p: onHead(HER, 7.2 * Math.sin(r), 10.4 + 1.2 * Math.cos(r), -1.8 - 8.2 * Math.cos(r)), d: [0.3 * Math.sin(r), -1, -0.35 * Math.cos(r)] }
})

export function umbrellaStory(f = 2) {
  const pad = new Pad(f)
  const src = new Pad(f)
  let G = null
  const gait = () => { if (!G) G = gaitOf(); return G }
  const camAt = (t) => {
    const k = sm5(span(t, 2300, 5000))
    return camera({ at: [lerp(2, -10, k), lerp(98, 128, k), 0], s: lerp(0.36, 0.6, k) * f, x0: 47 * f, y0: 38 * f })
  }
  // poses, each once for a moment
  const memo = new Map()
  const posed = (t) => {
    const key = Math.round(t * 2) / 2
    if (memo.has(key)) return memo.get(key)
    const g = gait()
    let herF = solve(HER, herPose(t, g, null))
    const himF = solve(HIM, himPose(t, herF))
    herF = solve(HER, herPose(t, g, himF))
    const out = { himF, herF }
    if (memo.size > 800) memo.delete(memo.keys().next().value)
    memo.set(key, out)
    return out
  }
  // her hair and her skirt, worked out once
  let hair = null
  let skirt = null
  const hang = () => {
    if (hair) return
    const g = gait()
    const herF = (t) => posed(t).herF
    hair = chains({
      // (begun a while before the telling, so they are already moving as a
      // runner's do when she comes on)
      t0: -1500, t1: END, n: 7, len: 34, drag: 0.0018, stiff: 0.32,
      roots: (t) => { const F = herF(t); return ROOTS.map((r) => ({ p: at(F.head, r.p), d: mv(F.head.R, r.d) })) },
      colliders: (t) => {
        const F = herF(t)
        return [
          { c: at(F.head, onHead(HER, 0, 11.5, -1.2)), r: 9.6 },
          { c: at(F.neck, [0, 4, 1.2]), r: 5.4 },
          { c: at(F.s2, [8.5, 18, -2.5]), r: 7.6 }, { c: at(F.s2, [-8.5, 18, -2.5]), r: 7.6 },
          { c: at(F.s2, [0, 9, -2.5]), r: 11.6 },
        ]
      },
      wind: (t) => [0.0019 * g.speed(t), 0, 0],
    })
    skirt = cloth({
      t0: -1500, t1: END, dt: 2, rows: 6, cols: 18, len: 44, flare: 1.5, drag: 0.0024,
      radii: [14.2, 10.6],
      waist: (t) => { const F = herF(t); return { p: at(F.root, [0, 4.5, -0.6]), R: F.root.R } },
      colliders: (t) => {
        const F = herF(t)
        const out = []
        // her legs as they are: the thigh from a little below the hip, as
        // thick as it is at the middle, and the shin; and her seat
        for (let i = 0; i < 2; i++) {
          out.push({ a: V.lerp(F.thigh[i].p, F.shin[i].p, 0.3), b: F.shin[i].p, r: 6.8 })
          out.push({ a: F.shin[i].p, b: F.foot[i].p, r: 4.6 })
        }
        out.push({ c: at(F.root, [0, -5, -2.5]), r: 13.5 })
        return out
      },
      wind: (t) => [0.0012 * g.speed(t), 0, 0],
    })
  }
  const herShapes = (t, F, cam) => flat([
    ...solid(HER, F, { skip: ['armL'] }),
    sheet(hair(t), [1.3, 0.45]),
    { k: 'rings', rings: skirt(t) },
  ], cam)
  // the two of them and the umbrella, on a pad
  const scene = (p, t, cam, part = 'all') => {
    hang()
    const { himF, herF } = posed(t)
    const hand = at(himF.hand[0], [0, -6.5, 1])
    if (part === 'canopy') { p.union(umbrella(hand, t, cam, 'canopy'), INK); return hand }
    const reaching = t > 3560
    const him = [...flat(solid(HIM, himF, reaching ? { skip: ['armR'] } : {}), cam), ...umbrella(hand, t, cam, 'shaft')]
    const layers = [[him, INK]]
    if (t > 250) layers.push([herShapes(t, herF, cam), INK, 1, 0, 0.35 * f], [flat(solid(HER, herF, { only: ['armL'] }), cam), INK, 1, 0, 0.3 * f])
    if (reaching) layers.push([flat(solid(HIM, himF, { only: ['armR'] }), cam), INK, 1, 0, 0.32 * f])
    if (part === 'all') layers.push([umbrella(hand, t, cam, 'canopy'), INK])
    p.layers(layers)
    return hand
  }
  let glide = null
  const prep = (ms) => {
    if (typeof document === 'undefined') return true
    hang()
    const a = performance.now()
    const left = () => Math.max(0, ms - (performance.now() - a))
    if (!hair.step(left() / 2) || !skirt.step(left())) return false
    if (!glide) {
      const M = mark(f)
      const cam = camAt(MORPH)
      src.clear()
      const hand = scene(src, MORPH, cam, 'canopy')
      const ringFrom = src.cells()
      src.clear(); scene(src, MORPH, cam, 'people')
      const starFrom = src.cells().filter((q) => q[4] >= 0.3)
      const [hx] = cam.P(hand)
      const [, hy] = cam.P([0, 150, 0])
      glide = {
        ring: glideOf(ringFrom, M.ring.map((q) => [q.x, q.y]), { delay: (q) => 40 + (Math.abs(q[0] - hx) / f) * 6, flight: 780, bend: 3.5 * f }),
        star: glideOf(starFrom, M.star.map((q) => [q.x, q.y]), { delay: (q) => 140 + (Math.hypot(q[0] - hx, q[1] - hy) / f) * 5, flight: 720, bend: 2.2 * f }),
      }
    }
    return glide.ring.step(left()) && glide.star.step(left())
  }
  // the rain: fine slanting lines at three depths, the nearer longer and
  // quicker, each stopped by the canopy (a spray) or the pavement (a ring
  // opening in the wet), and thinning as the rain eases
  const rain = (t, k, roof, ground) => {
    if (k <= 0.01) return
    const lines = [[], [], []]
    const rings = [[], []]
    for (let i = 0; i < 130; i++) {
      if (hash(i, 51) > k) continue
      const depth = hash(i, 57)
      const v = (0.07 + 0.06 * depth) * f
      const len = (2.2 + 2.8 * depth) * f
      const H = 110 * f
      const y = ((t * v + hash(i, 53) * 5000) % H) - 10 * f
      const x = (hash(i, 54) * 118 - 12) * f + y * 0.2
      const r = roof(x)
      if (r !== null && y > r - 0.5 * f) {
        if (y < r + 2.2 * f) lines[1].push({ k: 0, cx: x - 1.3 * f, cy: r - f, r: 0.35 * f }, { k: 0, cx: x + 1.3 * f, cy: r - 1.2 * f, r: 0.35 * f })
        continue
      }
      if (y > ground) {
        const age = (y - ground) / v
        if (age < 200 && hash(i, 55) < 0.6) {
          const rr = (0.6 + age / 60) * f
          rings[age < 100 ? 0 : 1].push({ k: 2, cx: x, cy: ground + (2 + hash(i, 56) * 12) * f, rx: rr, ry: rr * 0.3, ang: 0 })
        }
        continue
      }
      lines[Math.min(2, Math.floor(depth * 3))].push({ k: 1, ax: x, ay: y, bx: x - len * 0.2, by: y - len, ra: (0.2 + 0.15 * depth) * f, rb: (0.2 + 0.15 * depth) * f })
    }
    pad.layers([[lines[0], INK, 0.3], [lines[1], INK, 0.42], [lines[2], INK, 0.55], [rings[0], INK, 0.35], [rings[1], INK, 0.18]])
  }
  // the two of them and the umbrella upside down in the wet, broken into
  // bands by the ripples and moving
  const reflect = (t, ground) => {
    const cells = pad.cells()
    for (const [x, y, ink, , a] of cells) {
      if (y >= ground || y < ground - 130 * f) continue
      const ry = Math.round(2 * ground - y + 1)
      const band = Math.sin(ry * (1.7 / f) + t * 0.006)
      if (band < -0.55) continue
      const wob = Math.round(Math.sin(ry * (0.9 / f) + t * 0.009) * 0.8 * f)
      pad.put(x + wob, ry, ink === ROSE ? ROSE : INK, a * 0.38 * (1 - (ry - ground) / (30 * f)))
    }
  }
  const draw = (t) => {
    pad.clear()
    const cam = camAt(t)
    const street = 1 - sm5(span(t, MORPH - 100, MORPH + 500))
    const [, ground] = cam.P([0, 0, 0])
    // the pavement's edge, and the lamp behind them
    if (street > 0.01) {
      const [gx0] = cam.P([-600, 0, 0])
      const [gx1] = cam.P([600, 0, 0])
      const [lx, ly0] = cam.P([-128, 0, -30])
      const [, ly1] = cam.P([-128, 212, -30])
      const [hx1, hy1] = cam.P([-112, 214, -30])
      pad.layers([
        [[{ k: 1, ax: gx0, ay: ground, bx: gx1, by: ground, ra: 0.35 * f, rb: 0.35 * f }], INK, 0.6 * street],
        [[
          { k: 1, ax: lx, ay: ly0, bx: lx, by: ly1, ra: 2.4 * cam.s, rb: 1.8 * cam.s },
          { k: 1, ax: lx, ay: ly1, bx: hx1, by: hy1, ra: 1.5 * cam.s, rb: 1.3 * cam.s },
          { k: 2, cx: hx1, cy: hy1 + 3 * cam.s, rx: 7 * cam.s, ry: 3.2 * cam.s, ang: 0 },
        ], INK, street],
      ])
    }
    let hand
    if (t < MORPH) {
      hand = scene(pad, t, cam)
      reflect(t, ground)
    } else hand = at(posed(MORPH).himF.hand[0], [0, -6.5, 1])
    const roof = roofOf(hand, Math.min(t, MORPH), cam)
    rain(t, 1 - sm5(span(t, ...EASE)), roof, ground)
    const pk = sm5(span(t, EASE[0] - 100, EASE[0] + 900))
    softPetals(pad, t, {
      n: 40, seed: 29, v: 0.009, drift: -0.003, sway: 2.6, from: EASE[0] - 3000, box: [-8, -8, 106, 90], size: 1.35,
      a: 0.95 * pk, alpha: (x, y) => { if (t >= MORPH) return 1; const r = roof(x * f); return r === null || y * f < r - f ? 1 : 0 },
    })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    const [lgx, lgy] = cam.P([-112, 211, -30])
    return { cells, glow: street > 0.01 ? { x: lgx, y: lgy, r: 22 * cam.s, a: 0.5 * street, inner: 0.9 } : null }
  }
  const [wx, wy] = camAt(WASH_AT).P([-12, 150, 0])
  // (for the lab's own checks: the poses and what hangs from them)
  const story = tale({ f, end: END, draw, prep, live: true, wash: { at: WASH_AT, x: Math.round(wx), y: Math.round(wy), ms: 1350 } })
  story.debug = { posed, hair: () => hair, skirt: () => skirt }
  return story
}

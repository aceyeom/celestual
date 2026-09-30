// ── the run ─────────────────────────────────────────────────────────────────
// A body running in and stopping, for any build (rig.js), written down as a
// gait is measured: the hip, the knee and the ankle through a stride of a
// run (flexed at the hip as the foot lands, the knee giving under it to
// forty degrees, the push off the toe, the heel coming up high behind and
// the knee driving through), so the legs move as legs do; and the body is
// put on the ground by its feet, not the other way round (`runner`): while
// a foot is down it does not move, it turns about the heel as it lands and
// about the ball of the foot as it leaves, and the body is wherever that
// puts it; while neither is down the body is in the air, and falls as
// anything thrown falls. The bounce of a run is not written anywhere; it is
// what that comes to.
//
// The stop is written footfall by footfall: the braking step, heel first,
// that the body sinks into and leans back against; the other foot through
// and down a short step ahead of it; the first foot up onto its ball and
// set down beside the other. The pelvis slows from the run's pace to a
// stand over the feet on a smooth curve, and is never higher than the legs
// can reach with the knees a little bent, so it sinks into the braking step
// and rises out of it as the legs let it.
//
// The runner runs toward -x, its left side (legs[0], the near one) toward
// the camera.

import { clamp, lerp, span, sm5, moves } from './kit.js'
import { V, mv, at, turn, solve, cyc } from './rig.js'

const D = Math.PI / 180
// For one leg, a stride from the moment its foot lands (0) to the next time
// it lands (1): the hip's flexion, the knee's and the ankle's (toe up), in
// degrees; the foot is down until 0.4.
const HIP = [[0, 30], [0.1, 24], [0.2, 12], [0.3, 0], [0.4, -9], [0.5, -2], [0.6, 15], [0.7, 30], [0.8, 39], [0.9, 35]]
const KNEE = [[0, 18], [0.08, 32], [0.16, 40], [0.26, 34], [0.4, 21], [0.5, 52], [0.6, 84], [0.7, 97], [0.8, 74], [0.9, 36]]
const ANKLE = [[0, 3], [0.08, 10], [0.2, 18], [0.32, 8], [0.4, -21], [0.5, -12], [0.6, -2], [0.7, 4], [0.8, 4], [0.9, 3]]
const DOWN = 0.4
const STEP = 2

// The ankle of a foot of build `B` rolled about a point on the ground: about
// its heel when the toe is up (`pitch` > 0), about its ball when it is down;
// `g` is that point's x, `dir` the way the foot faces (-1 toward -x) and the
// answer the ankle's [x, y].
export function rolled(B, g, kind, pitch, dir = -1) {
  const p = pitch * D
  const c = Math.cos(p)
  const s = Math.sin(p)
  const [u, v] = kind === 'heel'
    ? [B.heel * c - B.ankle * s, B.heel * s + B.ankle * c]
    : [-B.ball * c - B.ankle * s, -B.ball * s + B.ankle * c]
  return [g + dir * u, v]
}
// a foot's pitch (toe up positive) from its turn, facing -x
const pitchOf = (R) => Math.atan2(R[5], -R[2]) / D
// a smooth curve from p0 (going at v0 a ms) to p1 (at v1) over `ms`
export function hermite(p0, v0, p1, v1, ms, u) {
  const x = clamp(u)
  const h00 = 2 * x ** 3 - 3 * x ** 2 + 1
  const h10 = x ** 3 - 2 * x ** 2 + x
  const h01 = -2 * x ** 3 + 3 * x ** 2
  const h11 = x ** 3 - x ** 2
  return h00 * p0 + h10 * v0 * ms + h01 * p1 + h11 * v1 * ms
}

// A run for build `B` that brakes with its near foot at `TB` and stops:
//   T        how long a stride is (both feet), ms
//   end      how far on to work it out
//   x        where the pelvis comes to stand
//   stride   how far ahead of the near heel the far heel lands braking
//   beside   how far behind the far heel the near heel is then set
//   falls    when, after TB, the far foot lands, the near foot leaves and
//            the near foot is set down again
//   lean     (t) => [x, y], the pelvis moved from its stand (to lean in to
//            somebody, say), after the stop
//   forward  how far the body leans into the run, degrees
// Answers where the pelvis is (`root`), the legs (`legs`, for `solve`), how
// fast it is going (`speed`, cm a ms), how much it is running (`running`,
// 1 to 0 through the stop), the pelvis's tip (`pelvisPitch`) and the lean
// of the body (`trunkLean`), and where in its stride it is (`phase`).
export function runner(B, o) {
  const { TB, T, end: END, stride: STRIDE, beside: BESIDE, forward = 8 } = o
  const [FAR_ON, NEAR_OFF, NEAR_ON] = o.falls.map((d) => TB + d)
  const lean = o.lean || (() => [0, 0])
  const LEG = B.thigh + B.shin
  // when each foot is down in the run, up to the braking step: the near
  // foot's comes down at TB, and the stop is written below
  const downs = [0, 1].map((i) => {
    const out = []
    const first = i === 0 ? 0 : 0.5
    for (let k = -6; k < 0; k++) {
      const on = TB + (k + first) * T
      if (on + DOWN * T <= TB) out.push([on, on + DOWN * T])
    }
    if (i === 0) out.push([TB, Infinity])
    return out
  })
  const isDown = (i, t) => downs[i].some(([a, b]) => t >= a && t < b)
  const phase = (t) => (t - TB) / T
  const runLegs = (t) => [0, 1].map((i) => {
    const ph = phase(t) + (i ? 0.5 : 0)
    return { fk: [cyc(HIP, ph), 3, 0, cyc(KNEE, ph), cyc(ANKLE, ph)] }
  })
  const running = (t) => 1 - sm5(span(t, TB - 40, TB + 520))
  // the pelvis tipped forward, and the body leaning into the run, back
  // against the stop, and upright
  const pelvisPitch = (t) => lerp(4, 11, running(t)) + 1.5 * Math.sin(phase(t) * 4 * Math.PI) * running(t)
  const trunkLean = (t) => forward * running(t) + moves(t, 0, [[TB - 30, TB + 150, -9], [TB + 150, TB + 520, 5], [TB + 520, TB + 900, -1]])

  // where the feet are, from the pelvis, in the run
  const feetRel = (t) => {
    const F = solve(B, { root: [0, 0, 0], yaw: -90, pitch: pelvisPitch(t), legs: runLegs(t) })
    return [0, 1].map((i) => {
      const f = F.foot[i]
      return { heel: at(f, [0, -B.ankle, -B.heel]), ball: at(f, [0, -B.ankle, B.ball]), ankle: f.p, toeUp: f.R[5] > 0 }
    })
  }
  const t0 = downs[1][0][0]
  const n = Math.ceil((END - t0) / STEP) + 1
  const kTB = Math.round((TB - t0) / STEP)
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  // ── the run, to the braking step: a foot that is down stays where it came
  // down, turning about its heel and then the ball of it, and the body is
  // wherever that puts it; in the air it goes on as it left the ground,
  // falling, to land where its next foot comes down
  {
    const pivots = [null, null]
    let x = 0
    let y = 0
    let vx = -0.16
    let flight = null
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
          for (let i = 0; i < 2; i++) for (const [a] of downs[i]) if (a > t && a < next) { next = a; who = i }
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
  }
  // ── the stop: where everything is at the braking step
  const xTB = px[kTB]
  const yTB = py[kTB]
  const vxTB = (px[kTB] - px[kTB - 3]) / (3 * STEP)
  const vyTB = (py[kTB] - py[kTB - 3]) / (3 * STEP)
  const at0 = solve(B, { root: [xTB, yTB, 0], yaw: -90, pitch: pelvisPitch(TB), legs: runLegs(TB) })
  const atB = solve(B, { root: [px[kTB - 1], py[kTB - 1], 0], yaw: -90, pitch: pelvisPitch(TB - STEP), legs: runLegs(TB - STEP) })
  // the near heel on the ground, and its pitch as it came down
  const nearHeel = at(at0.foot[0], [0, -B.ankle, -B.heel])[0]
  const nearPitch0 = pitchOf(at0.foot[0].R)
  const lane = [at0.foot[0].p[2], at0.foot[1].p[2]]
  // the far foot in the air, and how it is moving
  const farA0 = at0.foot[1].p
  const farV0 = V.mul(V.sub(at0.foot[1].p, atB.foot[1].p), 1 / STEP)
  const farPitch0 = pitchOf(at0.foot[1].R)
  // where the knees point as it lands, for the legs to go on from
  const poleOf = (F, i) => V.norm(V.sub(F.shin[i].p, V.lerp(F.thigh[i].p, F.foot[i].p, 0.5)))
  const pole0 = [poleOf(at0, 0), poleOf(at0, 1)]
  // the footfalls
  const farHeel = nearHeel - STRIDE
  const farLand = rolled(B, farHeel, 'heel', 8)
  const besideHeel = farHeel + BESIDE
  const R = (g, kind, p) => rolled(B, g, kind, p)
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
      const [ax, ay] = R(farHeel, 'heel', p)
      return { a: [ax, ay, lane[1]], pitch: p }
    }
    if (t < NEAR_OFF) {
      // flat, then up onto the ball of it as it is about to leave
      const down = nearPitch0 * (1 - sm5(span(t, TB, TB + 90)))
      const up = -32 * sm5(span(t, NEAR_OFF - 120, NEAR_OFF))
      if (up < 0) {
        const [ax, ay] = R(nearHeel - B.heel - B.ball, 'ball', up)
        return { a: [ax, ay, lane[0]], pitch: up }
      }
      const [ax, ay] = R(nearHeel, 'heel', down)
      return { a: [ax, ay, lane[0]], pitch: down }
    }
    if (t < NEAR_ON) {
      // swung through and set down beside the other, a little behind it
      const u = span(t, NEAR_OFF, NEAR_ON)
      const from = R(nearHeel - B.heel - B.ball, 'ball', -32)
      const to = R(besideHeel, 'heel', 0)
      const ax = hermite(from[0], 0, to[0], 0, NEAR_ON - NEAR_OFF, u)
      const ay = hermite(from[1], 0, to[1], 0, NEAR_ON - NEAR_OFF, u) + 5 * Math.sin(Math.PI * u)
      return { a: [ax, ay, lane[0]], pitch: lerp(-32, 0, sm5(u)) + 10 * Math.sin(Math.PI * u) * (1 - u) }
    }
    const [ax, ay] = R(besideHeel, 'heel', 0)
    return { a: [ax, ay, lane[0]], pitch: 0 }
  }
  // the pelvis: slowing from the run's pace to a stand over the feet
  const standX = (R(farHeel, 'heel', 0)[0] + R(besideHeel, 'heel', 0)[0]) / 2 - 2
  const Dx = clamp((1.8 * Math.abs(standX - xTB)) / Math.max(0.02, Math.abs(vxTB)), 450, 1100)
  const STAND = B.root - 1.2
  const Dy = 750
  const hipsAt = (t, rx, ry) => {
    const Rp = turn(pelvisPitch(t), -90, 0)
    return [1, -1].map((side) => V.add([rx, ry, 0], mv(Rp, [side * B.hip[0], B.hip[1], B.hip[2]])))
  }
  const raw = new Float64Array(n)
  const feet = [[], []]
  for (let k = kTB; k < n; k++) {
    const t = t0 + k * STEP
    const u = span(t, TB, TB + Dx)
    const [lx, ly] = lean(t)
    px[k] = hermite(xTB, vxTB, standX, 0, Dx, u) + lx
    let yNom = hermite(yTB, vyTB, STAND, 0, Dy, span(t, TB, TB + Dy)) - 2.2 * Math.sin(Math.PI * span(t, TB + 40, TB + 560)) + ly
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
    // (the first few steps keep the run's own height, so it lands on it)
    const blend = sm5(span(k, kTB, kTB + 12))
    py[k] = Math.min(raw[k] + 0.4, lerp(raw[k], sum / wsum, blend))
  }
  // everything along so that it comes to stand where it is wanted
  const shift = o.x - standX
  for (let k = 0; k < n; k++) px[k] += shift
  const read = (arr, t) => {
    const f = clamp((t - t0) / STEP, 0, n - 1)
    const i = Math.min(n - 2, Math.floor(f))
    return lerp(arr[i], arr[i + 1], f - i)
  }
  const v0 = (px[1] - px[0]) / STEP
  const POLE = [-1, 0.05, 0]
  return {
    TB, T, phase, running, pelvisPitch, trunkLean,
    root: (t) => (t < t0 ? [px[0] + v0 * (t - t0), py[0], 0] : [read(px, t), read(py, t), 0]),
    legs: (t) => {
      if (t < TB) return runLegs(t)
      // (between the worked-out moments, a straight line)
      const q = clamp((t - t0) / STEP, kTB, n - 1)
      const k = Math.min(n - 2, Math.floor(q))
      const u = q - k
      const b = sm5(span(t, TB, TB + 220))
      return [0, 1].map((i) => {
        const f = feet[i][k - kTB]
        const g = feet[i][k + 1 - kTB] || f
        const a = V.lerp(f.a, g.a, u)
        return { ik: [a[0] + shift, a[1], a[2]], pole: V.norm(V.lerp(pole0[i], POLE, b)), foot: [-90, lerp(f.pitch, g.pitch, u)] }
      })
    },
    speed: (t) => (t < t0 ? -v0 : (read(px, t - 20) - read(px, t + 20)) / 40),
  }
}

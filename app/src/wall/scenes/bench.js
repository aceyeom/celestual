// ── the bench ───────────────────────────────────────────────────────────────
// Behind them, at night, close. A park bench seen from its back, the two of
// them sitting on it a little apart, in silhouette against the lit glass:
// the moon between them and above, a treeline far off, a branch of blossom
// hanging in at the top, petals coming down. The camera eases in the whole
// time. The bodies are rig.js's, sculpted and in the round; she has her
// hair up in a ponytail, tied with a ribbon, the one colour on either of
// them.
//
// She turns to look at him: her head first, her neck a beat after it and
// her shoulders last, as anybody turns, and her profile comes round out of
// the back of her head as it goes. She holds the look. Then she moves along
// the bench to him, once, the way anybody does: her hands to the seat
// beside her, the weight onto them, the shoulders coming up, the hips
// lifting and sliding, her body a beat behind them and then a little past,
// her ponytail swinging after her, and her eyes on him all the while, her
// head holding its aim as the rest of her moves under it (`aim`). And as
// she settles, her hands going back to her lap, she leans on into him and
// lays her head on his shoulder, the one movement: her head goes to his
// shoulder and not to where his shoulder was, it comes to rest there, it
// sinks a little, and it rides his breathing from then on (`restOn`). A
// moment; he turns his head to her and lays his cheek on her hair. A star
// falls. The backlight turns pink out from their heads; the bench bends
// into the ring and the two of them gather into the star, and the petals
// go on falling round the mark.
//
//      0   the two of them sitting apart; he looks at the moon
//    900   she turns her head to him
//   1700   she holds the look
//   2450   her hands to the seat; she moves along the bench to him, once
//   3620   her hands back in her lap
//   3900   she leans, and rests her head on his shoulder
//   5000   he turns his head into her, and lays his cheek on her hair
//   5850   the star falls
//   6250   the pink, from their heads
//   6400   the bench into the ring, the two of them into the star

import { Pad, softPetals, mark, glideOf, tale, INK, FAR, ROSE, lerp, span, sm5, settle, moves, hash, clamp } from './kit.js'
import { HIM, HER, withHair, solve, solid, flat, camera, chains, strands, breath, wander, V, mv, at, onHead, aim } from './rig.js'

const SEAT = 45
// her hair up, the sides drawn back over the tops of her ears
const HER_UP = withHair(HER, { from: 11.8, nape: 7.2, back: 0.55, side: 0.45, top: 0.85, temple: 0.9, front: 0.55, behind: -2.3 })
const Z0 = -9
// the one move along the bench: her hands to the seat, her weight onto
// them, the slide, and the settle
const SC = [{ hands: [2450, 2780], push: [2720, 2900], slide: [2870, 3480], land: [3480, 3760], by: 18 }]
const LAP = [3620, 4060]
const LEAN = [3900, 4850]
const HIS = [5000, 5750]
const STAR = [5850, 6400]
const WASH_AT = 6250
const MORPH = 6400
const END = MORPH + 1300
const HIM_X = 22

const bump = (t, a, b) => Math.sin(Math.PI * span(t, a, b))

// ── her ─────────────────────────────────────────────────────────────────────
// She faces away from us, into the park (-z): her right is our right, toward
// him, so turning to him is a turn to her right (a negative yaw), and
// leaning to him a roll to her right (a positive roll).
const herX = (t) => moves(t, -33, SC.map((c) => [c.slide[0], c.slide[1], c.by, sm5]))
function herBase(t) {
  const x = herX(t)
  const b = breath(t, 4200, 700)
  let lift = 0
  let press = 0
  let lag = 0
  for (const c of SC) {
    lift += 1.3 * bump(t, c.slide[0] - 30, c.land[0] + 40)
    press += moves(t, 0, [[c.push[0], c.push[1], 1], [c.land[0], c.land[1], -1]])
    // the body a beat behind the hips as they slide, then a little past
    const k = Math.min(1.25, c.by / 11)
    lag += k * moves(t, 0, [[c.slide[0], c.slide[0] + 150, -3.0], [c.slide[0] + 150, c.land[0] + 30, 5.0], [c.land[0] + 30, c.land[1] + 80, -2.0]])
  }
  return {
    root: [x, SEAT + 9 + lift, Z0], yaw: 180, pitch: -6 + 5 * press,
    s1: [6 + 5 * press, 0, lag * 0.55],
    s2: [3 + 4 * press - 0.8 * b, 0, lag * 0.45],
    neck: [5, 0, -lag * 0.5],
    head: [-3, 0, -lag * 0.45],
    shrug: [0.45 * b + 1.6 * press, 0.45 * b + 1.6 * press],
    arms: herArms(t, x),
    legs: [1, -1].map((side) => ({ ik: [x - side * 10, HER.ankle, Z0 - 47], pole: [0, 0.3, -1], foot: [180, 0] })),
  }
}
// her hands: in her lap, then down on the seat either side of her to push
// from, planted there while her hips slide past them, set again, and back
function herArms(t, x) {
  // (the wrists: over the middle of her thighs, the elbows soft; and beside
  // her on the seat, a palm's height over it, as she leans into them)
  const lap = (side) => [x - side * 8, SEAT + 14.5, Z0 - 16]
  const seat = (side, x0) => [x0 - side * 19, SEAT + 4, Z0 - 8]
  const x1 = herX(SC[0].hands[0])
  const down = sm5(span(t, ...SC[0].hands))
  const back = sm5(span(t, ...LAP))
  return [1, -1].map((side) => {
    // the hand lifts a little on its way down to the seat, and back
    let p = V.lerp(lap(side), seat(side, x1), down)
    p = V.add(p, [0, 2.5 * bump(t, ...SC[0].hands), 0])
    p = V.lerp(p, lap(side), back)
    p = V.add(p, [0, 2 * bump(t, ...LAP), 0])
    return { ik: p, pole: [-side * 0.7, -0.3, -0.6] }
  })
}
// the look: the head first, the neck a beat after, the shoulders last, each
// taking its share of the turn to him; and as she rests her head on him,
// her face coming most of the way back round
const HER_LOOK = [[900, 1450, 0.48], [960, 1560, 0.4], [1040, 1700, 0.12]]
function herLook(t, pose, him) {
  const F = solve(HER_UP, pose)
  const a = aim(F, at(him.head, onHead(HIM, 0, 11, 2)))
  const rest = 1 - 0.58 * sm5(span(t, LEAN[0] + 100, LEAN[1]))
  const w = HER_LOOK.map(([t0, t1]) => sm5(span(t, t0, t1)) * rest)
  // (holding the look, her head softens: a small tilt, a small nod)
  const soft = sm5(span(t, 1650, 2250)) * (1 - sm5(span(t, 2350, 2700)))
  return {
    ...pose,
    s2: [pose.s2[0], a.yaw * HER_LOOK[2][2] * w[2], pose.s2[2]],
    neck: [pose.neck[0] + 0.3 * a.pitch * w[1], a.yaw * HER_LOOK[1][2] * w[1], pose.neck[2]],
    head: [
      pose.head[0] + 0.7 * a.pitch * w[0] + 3 * soft + wander(t, 2, 0.4) * 0.7,
      a.yaw * HER_LOOK[0][2] * w[0] + wander(t, 3, 0.3) * 1.1,
      pose.head[2] - 5 * soft + wander(t, 4, 0.25) * 0.6,
    ],
  }
}
// Resting her head on him: where her head touches (the side of it, over her
// right ear) is brought to a point on the top of his shoulder, along an arc
// that comes over and down onto it, by leaning her body (`a`) and tilting
// her head (`b`), found by Newton's method on the two of them.
const TEMPLE = onHead(HER_UP, -7.3, 12.4, -1.0)
function withLean(pose, a, b) {
  return {
    ...pose,
    s1: [pose.s1[0] + 0.05 * a, pose.s1[1], pose.s1[2] + 0.42 * a],
    s2: [pose.s2[0] + 0.08 * a, pose.s2[1], pose.s2[2] + 0.58 * a],
    neck: [pose.neck[0], pose.neck[1], pose.neck[2] + 0.38 * b],
    head: [pose.head[0], pose.head[1], pose.head[2] + 0.62 * b],
  }
}
const templeOf = (pose) => at(solve(HER_UP, pose).head, TEMPLE)
function restOn(pose, target) {
  let a = 8
  let b = 16
  for (let it = 0; it < 5; it++) {
    const p = templeOf(withLean(pose, a, b))
    const ex = p[0] - target[0]
    const ey = p[1] - target[1]
    if (Math.abs(ex) + Math.abs(ey) < 0.05) break
    const pa = templeOf(withLean(pose, a + 0.5, b))
    const pb = templeOf(withLean(pose, a, b + 0.5))
    const j11 = (pa[0] - p[0]) / 0.5
    const j21 = (pa[1] - p[1]) / 0.5
    const j12 = (pb[0] - p[0]) / 0.5
    const j22 = (pb[1] - p[1]) / 0.5
    const det = j11 * j22 - j12 * j21 || 1e-6
    a = clamp(a - (j22 * ex - j12 * ey) / det, -5, 26)
    b = clamp(b - (-j21 * ex + j11 * ey) / det, -5, 40)
  }
  return withLean(pose, a, b)
}
// where her head comes to rest: the top of his shoulder, between his neck
// and the point of it, on his jacket
const shoulderOf = (him) => V.add(at(him.s2, [13.5, 27.8, -2.6]), mv(him.s2.R, [0, 1.0, 0]))
function herPose(t, him) {
  let pose = herLook(t, herBase(t), him)
  if (t > LEAN[0]) {
    const e = settle(span(t, ...LEAN), 0.03)
    const from = templeOf(pose)
    const q = shoulderOf(him)
    const target = V.add(V.lerp(from, q, e), [0, 3 * Math.sin(Math.PI * Math.min(1, e)), 0])
    pose = restOn(pose, target)
    // and the weight of it: she bows into him a little as it settles
    const w = sm5(span(t, LEAN[1] - 200, LEAN[1] + 400))
    pose = { ...pose, head: [pose.head[0] + 3 * w, pose.head[1], pose.head[2]] }
  }
  return pose
}

// ── him ─────────────────────────────────────────────────────────────────────
// His left (our left) is toward her: turning to her is a positive yaw, and
// leaning to her a negative roll.
function himBase(t) {
  const b = breath(t, 4600, 1900)
  // after a while, their breath the same
  const bb = lerp(b, breath(t, 4200, 700), sm5(span(t, 5200, 6600)))
  const notice = sm5(span(t, 3100, 3800))
  return {
    root: [HIM_X, SEAT + 9.5, Z0], yaw: 180, pitch: -8,
    s1: [7, 0, 0],
    s2: [5 - 0.8 * bb, 3 * notice, 0],
    neck: [3 + wander(t, 7, 0.25) * 0.5, -6 + 8 * notice, 0],
    // looking at the moon, up and to his right, and then aware of her
    head: [-9 + 5 * notice + wander(t, 8, 0.3) * 0.7, -8 + 12 * notice + wander(t, 9, 0.2) * 0.9, 0],
    shrug: [0.45 * bb, 0.45 * bb],
    arms: [1, -1].map((side) => ({ ik: [HIM_X + side * 8, SEAT + 17, Z0 - 30], pole: [side * 0.7, -0.3, -0.6] })),
    legs: [1, -1].map((side) => ({ ik: [HIM_X + side * 11, HIM.ankle, Z0 - 50], pole: [0, 0.3, -1], foot: [180, 0] })),
  }
}
// his cheek onto her hair: the side of his face brought down to the top of
// her head by bowing his neck and tilting his head to her
const CHEEK = onHead(HIM, 7.1, 9.8, 2.2)
function withTilt(pose, c, d) {
  return {
    ...pose,
    s2: [pose.s2[0], pose.s2[1], pose.s2[2] - 0.2 * c],
    neck: [pose.neck[0] + 0.25 * d, pose.neck[1], pose.neck[2] - 0.8 * c],
    head: [pose.head[0] + 0.6 * d, pose.head[1], pose.head[2] - 1.2 * c],
  }
}
const cheekOf = (pose) => at(solve(HIM, pose).head, CHEEK)
function tiltOnto(pose, target) {
  let c = 10
  let d = 8
  for (let it = 0; it < 5; it++) {
    const p = cheekOf(withTilt(pose, c, d))
    const ex = p[0] - target[0]
    const ey = p[1] - target[1]
    if (Math.abs(ex) + Math.abs(ey) < 0.05) break
    const pc = cheekOf(withTilt(pose, c + 0.5, d))
    const pd = cheekOf(withTilt(pose, c, d + 0.5))
    const j11 = (pc[0] - p[0]) / 0.5
    const j21 = (pc[1] - p[1]) / 0.5
    const j12 = (pd[0] - p[0]) / 0.5
    const j22 = (pd[1] - p[1]) / 0.5
    const det = j11 * j22 - j12 * j21 || 1e-6
    c = clamp(c - (j22 * ex - j12 * ey) / det, -4, 24)
    d = clamp(d - (-j21 * ex + j11 * ey) / det, -6, 24)
  }
  return withTilt(pose, c, d)
}
function himPose(t, her) {
  let pose = himBase(t)
  if (her && t > HIS[0]) {
    const e = sm5(span(t, ...HIS))
    pose = { ...pose, head: [pose.head[0], pose.head[1] + 20 * e, pose.head[2]] }
    const from = cheekOf(pose)
    const top = V.add(at(her.head, onHead(HER_UP, 0, 22.2, -2.0)), mv(her.head.R, [0, 0.85, 0]))
    pose = tiltOnto(pose, V.add(V.lerp(from, top, e), [0, 1.5 * Math.sin(Math.PI * e), 0]))
  }
  return pose
}

// ── the bench, the park ─────────────────────────────────────────────────────
// the boards, in the world: the posts, three slats across the back, the
// seat's back edge, and the arms, as flat shapes on the glass
function bench(cam) {
  const shapes = []
  const R = (x0, y0, x1, y1, z) => {
    const [a, b] = cam.P([x0, y1, z])
    const [c, d] = cam.P([x1, y0, z])
    shapes.push({ k: 3, convex: true, pts: [[a, b], [c, b], [c, d], [a, d]] })
  }
  for (const x of [-82, 82]) R(x - 2.6, 0, x + 2.6, 93, 5)
  R(-88, 84, 88, 89.5, 6)
  R(-88, 73, 88, 78, 5)
  R(-88, 62, 88, 67, 4.5)
  R(-86, SEAT - 3.5, 86, SEAT + 0.8, 1)
  for (const x of [-82, 82]) {
    const [a, b] = cam.P([x - Math.sign(x) * 3, 64, 4])
    const [c2, d] = cam.P([x + Math.sign(x) * 5, 64, 4])
    shapes.push({ k: 1, ax: a, ay: b, bx: c2, by: d, ra: 1.9 * cam.s, rb: 1.9 * cam.s })
  }
  return shapes
}

const MOON = [55, 11.5, 6]
function scenery(pad, t, f, a) {
  if (a <= 0.01) return
  const S = (v) => v * f
  // the moon, full, with its seas
  const [mx, my, mr] = MOON
  const moon = [{ k: 0, cx: S(mx), cy: S(my), r: S(mr) }]
  const seas = [{ k: 0, cx: S(mx - 1.8), cy: S(my - 1.1), r: S(2.1) }, { k: 0, cx: S(mx + 2.1), cy: S(my + 1.9), r: S(1.5) }, { k: 0, cx: S(mx + 1.3), cy: S(my - 2.7), r: S(0.9) }]
  // the stars, each on its own clock, in three brightnesses
  const stars = [[], [], []]
  for (let i = 0; i < 26; i++) {
    const x = 26 + hash(i, 3) * 68
    const y = 1 + hash(i, 5) * 26
    if (Math.hypot(x - mx, y - my) < mr + 3) continue
    const tw = 0.5 + 0.5 * Math.sin(t * 0.0032 * (0.5 + hash(i, 7)) + hash(i, 9) * 6.28)
    stars[Math.min(2, Math.floor(tw * 3))].push({ k: 0, cx: S(x), cy: S(y), r: S(0.28 + 0.22 * hash(i, 11)) })
  }
  // the treeline, far off and soft, low behind the bench
  const trees = []
  for (let i = 0; i < 22; i++) {
    const x = -6 + i * 5.2 + hash(i, 4) * 3.5
    const r = 2.6 + hash(i, 5) * 4.2
    trees.push({ k: 0, cx: S(x), cy: S(56 - r * 0.6 - hash(i, 6) * 2), r: S(r) })
  }
  trees.push({ k: 3, convex: true, pts: [[S(-6), S(55)], [S(101), S(55)], [S(101), S(80)], [S(-6), S(80)]] })
  // the branch, from off the top left, and its blossom, moving a little
  const sw = Math.sin(t / 1400) * 0.4
  const branch = [
    { k: 1, ax: S(-5), ay: S(1.5), bx: S(12.5), by: S(7.8 + sw * 0.3), ra: S(1.5), rb: S(1.05) },
    { k: 1, ax: S(12.5), ay: S(7.8 + sw * 0.3), bx: S(30), by: S(9.2 + sw), ra: S(1.05), rb: S(0.45) },
    { k: 1, ax: S(10), ay: S(6.8), bx: S(17), by: S(0.6), ra: S(0.6), rb: S(0.35) },
    { k: 1, ax: S(21), ay: S(8.7 + sw * 0.5), bx: S(25.5), by: S(14.8 + sw), ra: S(0.5), rb: S(0.32) },
  ]
  const bloom = [[3, 4.6, 1.9], [8, 9.3, 1.6], [15, 2.4, 1.5], [17.2, 7.8, 1.8], [23, 10.8, 1.45], [25.6, 14.9, 1.35], [29.2, 8.4, 1.35], [5.2, 1.4, 1.35], [20, 5.4, 1.15], [11.6, 11.2, 1.15]]
    .map(([x, y, r]) => ({ k: 0, cx: S(x), cy: S(y + sw * (x / 30)), r: S(r) }))
  pad.layers([
    [moon, INK, 0.24 * a], [seas, INK, 0.38 * a], [trees, FAR, 0.3 * a],
    [stars[0], INK, 0.42 * a], [stars[1], INK, 0.6 * a], [stars[2], INK, 0.8 * a],
    [branch, INK, 0.9 * a], [bloom, ROSE, 0.85 * a],
  ])
}

// the falling star: a bright head and a long tail thinning out behind it
function falling(pad, t, f) {
  const k = span(t, ...STAR)
  if (k <= 0 || k >= 1) return
  const e = 1 - (1 - k) ** 2.2
  const [x0, y0, x1, y1] = [92 * f, 1 * f, 62 * f, 15 * f]
  const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
  const hx = lerp(x0, x1, e)
  const hy = lerp(y0, y1, e)
  const tail = Math.min(0.32, e * 0.9)
  const ex = lerp(x0, x1, e - tail)
  const ey = lerp(y0, y1, e - tail)
  const seg = [[], [], []]
  for (let i = 0; i < 12; i++) {
    const a = i / 12
    const b = (i + 1) / 12
    seg[Math.min(2, Math.floor(a * 3))].push({ k: 1, ax: lerp(hx, ex, a), ay: lerp(hy, ey, a), bx: lerp(hx, ex, b), by: lerp(hy, ey, b), ra: 0.45 * f * (1 - a * 0.7), rb: 0.45 * f * (1 - b * 0.7) })
  }
  seg[0].push({ k: 0, cx: hx, cy: hy, r: 0.9 * f })
  pad.layers([[seg[0], INK, fade], [seg[1], INK, fade * 0.45], [seg[2], INK, fade * 0.15]])
}

export function benchStory(f = 1) {
  const pad = new Pad(f)
  const src = new Pad(f)
  const camAt = (t) => camera({
    at: [lerp(-6, -2, sm5(span(t, 2500, 6000))), lerp(106, 110, sm5(span(t, 0, MORPH))), 0],
    s: lerp(0.95, 1.07, sm5(span(t, 0, MORPH))) * f, x0: 47 * f, y0: 37 * f,
  })
  // the two of them at a moment, posed once for it
  const memo = new Map()
  const posed = (t) => {
    const key = Math.round(t)
    if (memo.has(key)) return memo.get(key)
    const him0 = solve(HIM, himBase(t))
    const herF = solve(HER_UP, herPose(t, him0))
    const himF = solve(HIM, himPose(t, herF))
    const out = { himF, herF }
    if (memo.size > 600) memo.delete(memo.keys().next().value)
    memo.set(key, out)
    return out
  }
  // her ponytail and the ribbon in it, worked out once over the story
  let tail = null
  let ties = null
  const TIE = onHead(HER_UP, 0, 7.6, -8.1)
  const hang = () => {
    if (tail) return
    const herF = (t) => posed(t).herF
    const colliders = (t) => {
      const F = herF(t)
      return [
        { c: at(F.head, onHead(HER_UP, 0, 11.5, -1.2)), r: 9.2 },
        { c: at(F.neck, [0, 4, 1.2]), r: 5.0 },
        { c: at(F.s2, [8.5, 18, -2.5]), r: 7.4 }, { c: at(F.s2, [-8.5, 18, -2.5]), r: 7.4 },
        { c: at(F.s2, [0, 9, -2.5]), r: 11.2 },
      ]
    }
    const wind = (t) => [0.00003 * (1 + Math.sin(t / 900)), 0, 0]
    tail = chains({
      t0: 0, t1: END, n: 7, len: 27, stiff: 0.5, drag: 0.0026,
      roots: (t) => { const F = herF(t); return [{ p: at(F.head, TIE), d: mv(F.head.R, [0, -0.72, -0.7]) }] },
      colliders, wind,
    })
    ties = chains({
      t0: 0, t1: END, n: 5, len: 10, stiff: 0.25, drag: 0.0028,
      roots: (t) => { const F = herF(t); return [-0.7, 0.7].map((x) => ({ p: at(F.head, V.add(TIE, [x, 0.2, -1.2])), d: mv(F.head.R, [x * 0.25, -1, -0.3]) })) },
      colliders, wind,
    })
  }
  const bow = (F) => {
    const loop = (x, deg) => {
      const a = (deg * Math.PI) / 180
      const R = F.head.R
      const Z = [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]
      const RR = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => R[i * 3] * Z[j] + R[i * 3 + 1] * Z[3 + j] + R[i * 3 + 2] * Z[6 + j]))
      return { k: 'e', c: at(F.head, V.add(TIE, [x, 0.6, -1.4])), R: RR, r: [2.3, 1.3, 0.9] }
    }
    return [loop(-2.2, 20), loop(2.2, -20), { k: 's', c: at(F.head, V.add(TIE, [0, 0.4, -1.5])), r: 0.95 }]
  }
  // the two of them, the bench over them, on a pad
  const people = (p, t, cam) => {
    hang()
    const { himF, herF } = posed(t)
    const hers = flat([
      ...solid(HER_UP, herF),
      { k: 'e', c: at(herF.head, TIE), R: herF.head.R, r: [2.2, 1.8, 2.0] },
      ...strands(tail(t), [[2.3, 0.45]]),
    ], cam)
    const boards = bench(cam)
    p.layers([
      [flat(solid(HIM, himF), cam), INK], [hers, INK, 1, 0, 0.42 * f],
      [flat([...bow(herF), ...strands(ties(t), [[0.45, 0.3]])], cam), ROSE], [boards, INK, 1, 0, 0.7 * f],
    ])
  }
  let glide = null
  const prep = (ms) => {
    if (typeof document === 'undefined') return true
    hang()
    const a = performance.now()
    const left = () => Math.max(0, ms - (performance.now() - a))
    if (!tail.step(left() / 2) || !ties.step(left())) return false
    if (!glide) {
      const M = mark(f)
      const cam = camAt(MORPH)
      src.clear(); src.union(bench(cam), INK)
      const ringFrom = src.cells()
      src.clear(); people(src, MORPH, cam)
      const top = cam.P([0, 89.5, 6])[1]
      const starFrom = src.cells().filter((q) => q[4] >= 0.3 && q[1] < top)
      const [hx, hy] = cam.P(at(posed(MORPH).herF.head, [0, 6, 0]))
      glide = {
        ring: glideOf(ringFrom, M.ring.map((q) => [q.x, q.y]), { delay: (q) => ((q[0] / f + 4) / 100) * 280, flight: 800, bend: 3 * f }),
        star: glideOf(starFrom, M.star.map((q) => [q.x, q.y]), { delay: (q) => 130 + (Math.hypot(q[0] - hx, q[1] - hy) / (40 * f)) * 260, flight: 740, bend: 2.4 * f }),
      }
    }
    return glide.ring.step(left()) && glide.star.step(left())
  }
  // the park behind them moves slowly, and is laid again thirty times a
  // second rather than every frame
  const bg = new Pad(f)
  let bgAt = null
  const draw = (t) => {
    pad.clear()
    const cam = camAt(t)
    const fade = 1 - sm5(span(t, MORPH - 150, MORPH + 500))
    const slot = Math.floor(t / 33)
    if (slot !== bgAt) {
      bgAt = slot
      bg.clear()
      scenery(bg, slot * 33, f, fade)
    }
    pad.lay(bg)
    falling(pad, t, f)
    softPetals(pad, t, { n: 12, seed: 7, v: 0.0085, drift: 0.003, sway: 2.6, from: -9000, box: [-6, -4, 104, 76], a: 0.8, size: 0.95 })
    if (t < MORPH) people(pad, t, cam)
    softPetals(pad, t, { n: 7, seed: 19, v: 0.013, drift: 0.0045, sway: 3.2, from: -9000, box: [-6, -4, 104, 80], a: 0.95, size: 1.35 })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    return { cells, glow: fade > 0.01 ? { x: MOON[0] * f, y: MOON[1] * f, r: 10 * f, a: 0.45 * fade, inner: 0.9 } : null }
  }
  const [wx, wy] = camAt(WASH_AT).P([-2, 124, Z0])
  // (for the lab's own checks: the poses and what hangs from them)
  const story = tale({ f, end: END, draw, prep, live: true, wash: { at: WASH_AT, x: Math.round(wx), y: Math.round(wy), ms: 1450 } })
  story.debug = { posed, hair: () => tail, ties: () => ties }
  return story
}

// ── the umbrella ────────────────────────────────────────────────────────────
// Rain, at night, on a wet street under a lamp, in silhouette; the two of
// them upside down in the pavement. She is waiting in the rain with nothing
// over her, her arms wrapped round herself against the cold and her head
// down, her hair wet. She hears him before she sees him, and looks up. He
// comes running in from the right, an umbrella in his hand, furled, and
// brakes in front of her: a long step that he sinks into, leaning back
// against it, a short one, his feet together; and they reach for each
// other. In the one movement he swings the umbrella up past his shoulder,
// and it springs open behind him, the canopy blooming out and a little past
// itself and back, and he brings it over the two of them as she steps in
// and puts her arms up round his neck. His other arm goes round her waist.
// He bows his head and kisses her forehead, and her foot comes up behind
// her. The rain thins, and the last of it comes down as petals. The camera
// has come in to the two of them. The pink goes out from under the
// umbrella; the canopy opens into the ring, and the two of them gather into
// the star.
//
// His run is gait.js's: the legs as a run is measured, and the body put on
// the ground by its feet.
//
//      0   the rain; her, waiting, cold
//    560   she looks up
//    750   he runs in over the right edge, the umbrella furled
//   1250   his braking step; stopped by 1970
//   1480   the umbrella swung up; open at 1760, and over the two of them by
//          2400
//   1700   she steps in to him; her arms round his neck by 2400
//   1950   his arm round her waist
//   2600   he kisses her forehead; her foot comes up behind her at 2700
//   3000   the rain eases into petals
//   4300   the pink, from under the umbrella
//   4450   the canopy into the ring, the two of them into the star

import { Pad, softPetals, mark, glideOf, tale, INK, ROSE, clamp, lerp, span, sm5, settle, hash } from './kit.js'
import {
  HIM, HER, solve, solid, flat, camera, chains, sheet, cloth, breath, wander, V, mv, at, onHead, track, path, turnRound, aim, reach2,
} from './rig.js'
import { runner, rolled } from './gait.js'

const TB = 1250
const RUN_T = 660
const HIM_X = 20
const HER_X = -27
const SWING = 1480
const POP = 1760
const STEP_IN = [1700, 2080]
const ARMS = [1800, 2400]
const HOLD = [1950, 2600]
const KISS = [2600, 3150]
const LIFT = [2700, 3250]
const EASE = [3000, 4000]
const WASH_AT = 4300
const MORPH = 4450
const END = MORPH + 1300
const D = Math.PI / 180

// ── him ─────────────────────────────────────────────────────────────────────
// Facing -x, toward her; his left side is toward us, so his near arm and leg
// are his left, [0]; the umbrella is in his far hand, his right.
let GAIT = null
const gaitOf = () => GAIT || (GAIT = runner(HIM, {
  TB, T: RUN_T, end: END, x: HIM_X, stride: 34, beside: 7, falls: [290, 470, 720], forward: 10,
  // (as he holds her, his weight a little forward, into her)
  lean: (t) => [-4 * sm5(span(t, ...HOLD)), -0.6 * sm5(span(t, ...HOLD))],
}))
// his body: running, braking, stood; out of breath, and easing; bowing a
// little into her as he holds her
function himBody(t) {
  const G = gaitOf()
  const run = G.running(t)
  const tw = Math.sin(G.phase(t) * 2 * Math.PI)
  const lean = G.trunkLean(t)
  const b = breath(t, lerp(900, 3200, sm5(span(t, TB, TB + 2600))), TB)
  const deep = lerp(1.6, 0.5, sm5(span(t, TB + 300, TB + 2800)))
  const hold = sm5(span(t, ...HOLD))
  // looking at her: ahead as he runs, and down to her as he comes to her
  const down = sm5(span(t, TB, TB + 700))
  return {
    root: G.root(t), yaw: -90 + 4 * run * tw, pitch: G.pelvisPitch(t),
    s1: [lean * 0.4 + 2 * hold, -3 * run * tw, 0],
    s2: [lean * 0.6 - deep * b + 3 * hold, -5 * run * tw, 0],
    neck: [-lean * 0.35 + 5 * down + wander(t, 11, 0.25) * 0.4, 0, 0],
    head: [-lean * 0.55 - G.pelvisPitch(t) * 0.4 + 6 * down + wander(t, 12, 0.3) * 0.6, 0, 0],
    shrug: [deep * b * 1.1, deep * b * 1.1],
    legs: G.legs(t),
  }
}
// His arms, both always reaching for where their hands are going, so that
// a gesture never begins with a jump: between gestures that is where the
// run's swing would put them, the elbow where the swing would put it too.
// The near one pumping as he runs, forward as he brakes, then a little out
// to her and round her waist. The far one with the umbrella: the swing held
// in, the umbrella low and trailing; then up, in one sweep, beside his
// shoulder, where it springs open behind him, and over the two of them.
function swingOf(t, i) {
  const G = gaitOf()
  const run = G.running(t)
  const c = Math.cos(2 * Math.PI * (G.phase(t) + (i ? 0.5 : 0) - 0.3))
  const r = i ? [8 + 14 * c, 12, 0, 74 + 6 * c] : [4 + 30 * c, 8, 0, 92 + 12 * c]
  const brake = i ? [16, 14, 0, 58] : [12, 14, 0, 62]
  const rest = i ? [10, 10, 0, 45] : [4, 7, 0, 16]
  const k = sm5(span(t, TB, TB + 220)) * (1 - sm5(span(t, TB + 300, TB + 800)))
  return r.map((v, j) => lerp(lerp(rest[j], v, run), brake[j], k))
}
// where the far hand is through the sweep and after, in his chest's frame:
// down by his hip, up beside his shoulder (where the umbrella opens, tilted
// back behind him, in the clear), and forward over her
const SWEEP = [[1610, [-17, -15, -2]], [POP, [-20, 17, 2]], [2050, [-18, 12, 12]], [2400, [-18, 8, 16]]]
function himArms(t, base, her) {
  const arms = [{ fk: swingOf(t, 0) }, { fk: swingOf(t, 1) }]
  const body = solve(HIM, { ...base, arms })
  const out = [0, 1].map((i) => {
    const sh = body.upper[i].p
    const p = body.hand[i].p
    return { sh, p, pole: V.norm(V.sub(body.fore[i].p, V.lerp(sh, p, 0.5))) }
  })
  // the umbrella's hand: the swing, and the sweep up and over from it
  if (t > SWING) {
    const o = out[1]
    const p = path([[SWING, o.p], ...SWEEP.map(([tk, q]) => [tk, at(body.s2, q)])], t)
    o.pole = turnRound(o.pole, [0.25, -0.8, -0.55], V.sub(p, o.sh), sm5(span(t, SWING, POP)))
    o.p = p
  }
  // the free hand: a little out from his side as she comes, and round her
  // waist to the small of her back
  if (t > 1600) {
    const o = out[0]
    const open = at(body.s2, [17, -8, 10])
    const u = sm5(span(t, 1600, 1950))
    let p = V.lerp(o.p, open, u)
    let pole = turnRound(o.pole, [0.2, -0.75, 0.65], V.sub(p, o.sh), u)
    if (her) {
      const side = at(her.s2, [-17, 0, 3])
      const back = at(her.s2, [-4, 3, -8.5])
      const w = sm5(span(t, 1950, 2550))
      const q = path([[0, open], [0.55, side], [1, back]], w)
      p = V.lerp(p, q, sm5(span(t, 1950, 2150)))
      pole = turnRound(pole, [0.15, -0.75, 0.65], V.sub(p, o.sh), w)
    }
    o.p = p
    o.pole = pole
    o.curl = her ? sm5(span(t, 2150, 2550)) : 0
  }
  return out.map((o) => ({ ik: o.p, pole: o.pole, curl: o.curl || 0 }))
}
// His lips to her forehead: he leans in over her and bows his head, as
// much of each as brings them there (Newton's method, from where he is,
// so it is always the nearest way).
const LIPS = onHead(HIM, 0, 4.2, 9.2)
const BROW = onHead(HER, 0, 16.4, 9.0)
function himPose(t, her) {
  const base = himBody(t)
  let pose = { ...base, arms: himArms(t, base, her) }
  if (her && t > KISS[0]) {
    const e = settle(span(t, ...KISS), 0.03)
    const bowed = (a, b) => ({
      ...pose,
      s1: [pose.s1[0] + 0.4 * a, pose.s1[1], pose.s1[2]], s2: [pose.s2[0] + 0.6 * a, pose.s2[1], pose.s2[2]],
      neck: [pose.neck[0] + 0.35 * b, pose.neck[1], pose.neck[2]], head: [pose.head[0] + 0.65 * b, pose.head[1], pose.head[2]],
    })
    const lips = (F) => at(F.head, LIPS)
    const from = lips(solve(HIM, { ...pose, arms: null, legs: null }))
    const to = V.add(at(her.head, BROW), mv(her.head.R, [0, 0.4, 0.6]))
    const target = V.add(V.lerp(from, to, e), [0, 1.2 * Math.sin(Math.PI * Math.min(1, e)), 0])
    pose = reach2(HIM, bowed, lips, target, [0, 0], [-8, 16], [-16, 40])
  }
  return pose
}

// ── the umbrella ────────────────────────────────────────────────────────────
// A shaft from his hand to the top notch, a hooked handle below the hand, a
// tip over the notch, and the canopy on its ribs: furled round the shaft,
// or open, a dome with a scalloped hem, or anywhere between as it springs
// open (each point of its side swung out from the notch toward the dome's,
// so it blooms). Side on, the canopy's outline is its side and the same
// side mirrored, and the hem between.
const SHAFT = 82
const RAD = 54
const RISE = 21
const TIP = 4.5
const NR = 12
// its side, open and furled, at `NR` points along a rib: how far from the
// notch, and how far round from straight down the shaft
const OPEN = []
const SHUT = []
{
  const pts = []
  for (let i = 0; i <= 240; i++) {
    const u = (RAD * i) / 240
    pts.push([u, RISE * ((1 - (u / RAD) ** 2) ** 0.425 - 1)])
  }
  const L = [0]
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const rib = L[L.length - 1]
  for (let k = 1; k <= NR; k++) {
    const want = (rib * k) / NR
    const j = Math.max(1, L.findIndex((l) => l >= want - 1e-9))
    const f = (want - L[j - 1]) / (L[j] - L[j - 1] || 1)
    const u = lerp(pts[j - 1][0], pts[j][0], f)
    const v = lerp(pts[j - 1][1], pts[j][1], f)
    OPEN.push([Math.hypot(u, v), Math.atan2(u, -v)])
    // furled: the cloth round the shaft, fullest a little below the top
    const a = k / NR
    const r = 0.7 + 3.6 * Math.sin(Math.PI * a ** 0.75) ** 0.8
    SHUT.push([Math.hypot(r, a * rib), Math.atan2(r, a * rib)])
  }
}
// the outline, in the umbrella's own frame ([across, along the shaft from
// the notch]), `o` open (0 furled, 1 open, a little more as it overshoots)
function canopyOf(o) {
  const side = []
  for (let k = 0; k < NR; k++) {
    const r = lerp(SHUT[k][0], OPEN[k][0], o)
    const a = lerp(SHUT[k][1], OPEN[k][1], o)
    side.push([r * Math.sin(a), -r * Math.cos(a)])
  }
  const [tu, tv] = side[NR - 1]
  const hem = []
  const sc = 2.4 * clamp(o)
  for (let j = 1; j < 24; j++) {
    const seg = (j / 24) * 8
    hem.push([tu * (1 - (2 * j) / 24), tv + sc * Math.sin(Math.PI * (seg - Math.floor(seg)))])
  }
  return [[0, 0.4], ...side, ...hem, ...side.map(([u, v]) => [-u, v]).reverse()]
}
// the handle's hook, below the hand
const HOOK = [[0, -2], [0, -9.5], [-1.9, -12.9], [-4.8, -13.6], [-6.9, -11.6], [-7.1, -9.4]]
// How the umbrella is, at a moment: where his hand holds it, the way it
// points (from straight up toward +x, radians) and how open it is. Trailing
// low behind him as he runs, swinging with his arm; swept up, tip first
// behind him, to upright and a little past it toward her as it opens; the
// spring of it opening kicking in his hand; then tilted over her.
function umbrellaOf(t, himF) {
  const G = gaitOf()
  const c = Math.cos(2 * Math.PI * (G.phase(t) + 0.5 - 0.3))
  const trail = 128 + 9 * c * G.running(t) + 10 * sm5(span(t, TB, TB + 200)) * (1 - sm5(span(t, TB + 250, SWING + 100)))
  const sweep = track([[SWING, trail], [1610, 100], [1710, 60], [POP, 47], [1880, 24], [2040, 5], [2250, -6], [2500, -8]], t)
  let th = lerp(trail, sweep, sm5(span(t, SWING, SWING + 120)))
  if (t > POP) th += 3.2 * Math.sin(((t - POP) / 150) * 2 * Math.PI) * Math.exp(-(t - POP) / 130)
  const o = t > POP ? settle(span(t, POP, POP + 480), 0.09) : 0
  return { grip: at(himF.hand[1], [0, -6.5, 1]), th: th * D, o }
}
// the umbrella as shapes, in the world: its shaft and handle, and its
// canopy, as one or the other or both
function umbrellaShapes(u, cam, part = 'all') {
  const d = [Math.sin(u.th), Math.cos(u.th), 0]
  const p = [Math.cos(u.th), -Math.sin(u.th), 0]
  const W = (a, v) => cam.P(V.add(u.grip, V.add(V.mul(p, a), V.mul(d, v))))
  const out = []
  if (part !== 'canopy') {
    const [ax, ay] = W(0, -3)
    const [bx, by] = W(0, SHAFT + TIP)
    out.push({ k: 1, ax, ay, bx, by, ra: 0.65 * cam.s, rb: 0.45 * cam.s })
    for (let i = 1; i < HOOK.length; i++) {
      const [x0, y0] = W(...HOOK[i - 1])
      const [x1, y1] = W(...HOOK[i])
      out.push({ k: 1, ax: x0, ay: y0, bx: x1, by: y1, ra: 1.0 * cam.s, rb: 1.0 * cam.s })
    }
  }
  if (part !== 'shaft') out.push({ k: 3, pts: canopyOf(u.o).map(([a, v]) => W(a, SHAFT + v)) })
  return out
}
// the top of the canopy over a column of the glass, for the rain (none
// until it is open enough to keep any off)
function roofOf(u, cam) {
  if (u.o < 0.35) return () => null
  const d = [Math.sin(u.th), Math.cos(u.th), 0]
  const p = [Math.cos(u.th), -Math.sin(u.th), 0]
  const out = canopyOf(u.o)
  const top = out.slice(0, NR + 1).map(([a, v]) => cam.P(V.add(u.grip, V.add(V.mul(p, a), V.mul(d, SHAFT + v)))))
  const left = top.map(([x, y], i) => (i ? cam.P(V.add(u.grip, V.add(V.mul(p, -out[i][0]), V.mul(d, SHAFT + out[i][1])))) : [x, y]))
  const line = [...left.slice(1).reverse(), ...top].sort((a, b) => a[0] - b[0])
  return (x) => {
    if (x < line[0][0] || x > line[line.length - 1][0]) return null
    for (let i = 1; i < line.length; i++) if (line[i][0] >= x) return lerp(line[i - 1][1], line[i][1], (x - line[i - 1][0]) / (line[i][0] - line[i - 1][0] || 1))
    return null
  }
}

// ── her ─────────────────────────────────────────────────────────────────────
// She faces +x, toward him; her right side is toward us, so her near arm
// and leg are her right, [1].
const STAND = HER.root - 1.4
// her pelvis: over her far foot as she waits; a step in to him
const herX = (t) => HER_X + 15 * sm5(span(t, STEP_IN[0] + 60, STEP_IN[1] + 250))
// Her feet: the far one planted, the near one easy and a little ahead as
// she waits; the near one a step in to him, heel first; and at the last the
// far one rolled up onto its ball and lifted up behind her, pointed.
function herLegs(t, x) {
  const near = (() => {
    // the heel carried forward and set down, the toe up as it comes down
    // and then flat
    const u = span(t, ...STEP_IN)
    const heel = lerp(HER_X + 7, HER_X + 26, sm5(u)) - HER.heel
    const pitch = 13 * Math.sin(Math.PI * span(u, 0.25, 1)) ** 0.8 * (1 - sm5(span(u, 0.82, 1)))
    const [ax, ay] = rolled(HER, heel, 'heel', pitch, 1)
    return { ik: [ax, ay + 4.2 * Math.sin(Math.PI * u) ** 1.6, 6.2], pole: [1, 0.1, 0.1], foot: [90, pitch] }
  })()
  const far = (() => {
    const g = HER_X + 1 + HER.ball
    const roll = sm5(span(t, LIFT[0], LIFT[0] + 180))
    const [rx, ry] = rolled(HER, g, 'ball', -38 * roll, 1)
    const up = sm5(span(t, LIFT[0] + 120, LIFT[1]))
    if (up <= 0) return { ik: [rx, ry, -6.2], pole: [1, 0.05, -0.1], foot: [90, -38 * roll] }
    const top = [x - 27, 39, -5.4]
    const q = path([[0, [rx, ry, -6.2]], [0.45, [x - 21, 24, -5.8]], [1, top]], up)
    return { ik: q, pole: [1, -0.1, -0.1], foot: [90, lerp(-38, -104, up)] }
  })()
  return [far, near]
}
// her pelvis's height: a little lower through the step, and up a little as
// she reaches to him
const herY = (t) => STAND - 1.1 * Math.sin(Math.PI * span(t, STEP_IN[0], STEP_IN[1] + 200)) + 0.8 * sm5(span(t, ...ARMS))
function herBody(t, him) {
  const x = herX(t)
  // cold, hunched, her head down; then up at the sound of him
  const cold = 1 - sm5(span(t, 560, 1500))
  const up = sm5(span(t, 560, 980))
  const b = breath(t, lerp(3400, 2400, sm5(span(t, 600, 1800))), 300)
  const into = sm5(span(t, STEP_IN[0], ARMS[1]))
  const pose = {
    root: [x, herY(t), 0], yaw: 90, pitch: 3 - 2 * into,
    s1: [2 + 3 * cold, 0, 0],
    s2: [3 + 5 * cold - 0.7 * b, 0, 0],
    neck: [6 * cold * (1 - up) + 2, 0, 0],
    head: [12 * (1 - up) + wander(t, 4, 0.3) * 0.8, 0, wander(t, 5, 0.25) * 0.8],
    shrug: [1.8 * cold + 0.4 * b, 1.8 * cold + 0.4 * b],
    legs: herLegs(t, x),
  }
  // leaning in to him as she comes
  pose.s1 = [pose.s1[0] + 2 * into, 0, 0]
  pose.s2 = [pose.s2[0] + 3 * into, 0, 0]
  if (!him) return pose
  // her eyes on him as he comes, and up to his face as he is close; then
  // her head bowed a little to him, for him to kiss her forehead
  const kiss = sm5(span(t, KISS[0] - 300, KISS[0] + 50))
  const F = solve(HER, { ...pose, arms: null, legs: null })
  const a = aim(F, at(him.head, onHead(HIM, 0, 11, 2)))
  const w = up * (1 - 0.3 * into) * (1 - kiss)
  pose.neck = [pose.neck[0] + 0.3 * a.pitch * w + 3 * kiss, 0.3 * a.yaw * w, pose.neck[2]]
  pose.head = [pose.head[0] + 0.55 * a.pitch * w + 9 * kiss, 0.5 * a.yaw * w, pose.head[2] + 2.5 * kiss]
  return pose
}
// Her arms: wrapped round herself, a hand on each arm, as she waits; her
// near hand to her chest as she sees him; then both up round his neck, her
// near one over his shoulder and the other round the far side of him, her
// hands meeting behind it. Always reaching, the elbows turned from one way
// to the next about the arm.
function herArms(t, pose, him) {
  const F = solve(HER, { ...pose, arms: null })
  const sh = [F.upper[0].p, F.upper[1].p]
  // arms round herself
  const hug = [at(F.s2, [-12.5, 9, 5.5]), at(F.s2, [12, 7.5, 6.5])]
  const hugPole = [[0.45, -0.8, -0.4], [0.45, -0.8, 0.4]]
  // the near hand to her chest, the far one easing down
  const see = sm5(span(t, 800, 1350))
  const heart = [at(F.s2, [-10, 3, 7]), at(F.s2, [3, 13, 10.5])]
  const out = [0, 1].map((i) => ({ p: V.lerp(hug[i], heart[i], see), pole: hugPole[i] }))
  if (him && t > ARMS[0] - 100) {
    const w = sm5(span(t, ARMS[0], ARMS[1]))
    // (her right, the near one, round his left side; her left round his right)
    const ways = [
      { by: at(him.s2, [-21, 20, 8]), to: at(him.neck, [1.5, 3.5, -7]), pole: [0.1, -0.35, -0.93] },
      { by: at(him.s2, [21, 20, 8]), to: at(him.neck, [-1.5, 2.5, -7]), pole: [0.1, -0.35, 0.93] },
    ]
    ways.forEach((wy, i) => {
      const from = out[i].p
      const q = path([[0, from], [0.55, wy.by], [1, wy.to]], w)
      const p = V.lerp(from, q, sm5(span(t, ARMS[0] - 100, ARMS[0] + 150)))
      out[i].pole = turnRound(out[i].pole, wy.pole, V.sub(p, sh[i]), w)
      out[i].p = p
    })
  }
  const curl = him ? sm5(span(t, ARMS[0] + 200, ARMS[1])) : 0
  return out.map((o) => ({ ik: o.p, pole: o.pole, curl }))
}
function herPose(t, him) {
  const pose = herBody(t, him)
  pose.arms = herArms(t, pose, him)
  return pose
}

// her hair: roots round the back of her head, behind her ears and across
// the nape, each falling down and a little out
const ROOTS = [-112, -84, -56, -28, 0, 28, 56, 84, 112].map((a) => {
  const r = a * D
  return { p: onHead(HER, 7.2 * Math.sin(r), 10.4 + 1.2 * Math.cos(r), -1.8 - 8.2 * Math.cos(r)), d: [0.3 * Math.sin(r), -1, -0.35 * Math.cos(r)] }
})

export function umbrellaStory(f = 1) {
  const pad = new Pad(f)
  const src = new Pad(f)
  // wide, for his run; up a little with the umbrella as it goes up; and in
  // to the two of them
  const camAt = (t) => {
    const up = sm5(span(t, 1400, 2200))
    const k = sm5(span(t, 1900, 4300))
    return camera({ at: [lerp(22, -3, sm5(span(t, 1300, 3800))), 102 + 12 * up + 24 * k, 0], s: lerp(0.335, 0.45, k) * f, x0: 47 * f, y0: 37 * f })
  }
  // the two of them at a moment, posed once for it: his body, her against
  // it (which is all her hair and her skirt need), and his arms and his
  // head to her
  const once = (fn) => {
    const memo = new Map()
    return (t) => {
      const key = Math.round(t * 2) / 2
      if (memo.has(key)) return memo.get(key)
      const out = fn(key)
      if (memo.size > 1600) memo.delete(memo.keys().next().value)
      memo.set(key, out)
      return out
    }
  }
  const herAt = once((t) => solve(HER, herPose(t, solve(HIM, { ...himBody(t), arms: null }))))
  const posed = once((t) => {
    const herF = herAt(t)
    const himF = solve(HIM, himPose(t, herF))
    return { himF, herF, um: umbrellaOf(t, himF) }
  })
  // her hair and her skirt, worked out once
  let hair = null
  let skirt = null
  const hang = () => {
    if (hair) return
    const herF = herAt
    // the wind in the rain, gusting
    const gust = (t) => 0.00005 * (1 + 0.6 * Math.sin(t / 700) + 0.4 * Math.sin(t / 310 + 1))
    hair = chains({
      t0: -1500, t1: END, n: 7, len: 32, drag: 0.0024, stiff: 0.34,
      roots: (t) => { const F = herF(t); return ROOTS.map((r) => ({ p: at(F.head, r.p), d: mv(F.head.R, r.d) })) },
      colliders: (t) => {
        const F = herF(t)
        return [
          { c: at(F.head, onHead(HER, 0, 11.5, -1.2)), r: 9.6 },
          { c: at(F.neck, [0, 4, 1.2]), r: 5.2 },
          { c: at(F.s2, [8.5, 18, -2.5]), r: 7.2 }, { c: at(F.s2, [-8.5, 18, -2.5]), r: 7.2 },
          { c: at(F.s2, [0, 9, -2.5]), r: 10.8 },
        ]
      },
      wind: (t) => [-gust(t), 0, 0],
    })
    skirt = cloth({
      t0: -1500, t1: END, dt: 2, rows: 6, cols: 18, len: 40, flare: 1.45, drag: 0.0026,
      radii: [13.6, 10.2],
      waist: (t) => { const F = herF(t); return { p: at(F.root, [0, 4.5, -0.6]), R: F.root.R } },
      colliders: (t) => {
        const F = herF(t)
        const out = []
        // her legs as they are: the thigh from a little below the hip, as
        // thick as it is at the middle and narrowing to the knee, and the
        // shin; and her seat
        for (let i = 0; i < 2; i++) {
          const knee = F.shin[i].p
          out.push({ a: V.lerp(F.thigh[i].p, knee, 0.3), b: V.lerp(F.thigh[i].p, knee, 0.7), r: 6.4 })
          out.push({ a: V.lerp(F.thigh[i].p, knee, 0.7), b: knee, r: 5.2 })
          out.push({ a: knee, b: F.foot[i].p, r: 4.2 })
        }
        out.push({ c: at(F.root, [0, -5, -2.5]), r: 13 })
        return out
      },
      wind: (t) => [-0.7 * gust(t), 0, 0],
    })
  }
  const herShapes = (t, F, cam) => flat([
    ...solid(HER, F, { skip: ['armR'] }),
    sheet(hair(t), [1.25, 0.45]),
    { k: 'rings', rings: skirt(t) },
  ], cam)
  // the two of them and the umbrella, on a pad: him, and the umbrella's
  // shaft; her, drawn apart from him by a hair of air; her near arm round
  // him and his round her, each over the other's body; and the canopy
  const scene = (p, t, cam, part = 'all') => {
    hang()
    const { himF, herF, um } = posed(t)
    if (part === 'canopy') { p.union(umbrellaShapes(um, cam, 'canopy'), INK); return um }
    const shut = um.o < 0.02
    const him = [...flat(solid(HIM, himF, { skip: ['armL'] }), cam), ...umbrellaShapes(um, cam, shut && part === 'all' ? 'all' : 'shaft')]
    // (swung up fast, the umbrella leaves a trace of where it just was, as
    // the eye keeps it)
    const trace = []
    if (part === 'all' && t > SWING && t < POP + 200) {
      for (const [ago, a] of [[5, 0.5], [10, 0.3], [15, 0.15]]) {
        const u0 = posed(t - ago).um
        const fast = clamp((Math.abs(um.th - u0.th) / D / ago - 0.1) / 0.25)
        if (fast > 0.02) trace.push([umbrellaShapes(u0, cam, u0.o < 0.02 ? 'all' : 'shaft'), INK, a * fast])
      }
    }
    p.layers([
      ...trace,
      [him, INK],
      [herShapes(t, herF, cam), INK, 1, 0, 0.35 * f],
      [flat(solid(HER, herF, { only: ['armR'] }), cam), INK, 1, 0, 0.3 * f],
      [flat(solid(HIM, himF, { only: ['armL'] }), cam), INK, 1, 0, 0.32 * f],
    ])
    if (part === 'all' && !shut) p.union(umbrellaShapes(um, cam, 'canopy'), INK)
    return um
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
      const um = scene(src, MORPH, cam, 'canopy')
      const ringFrom = src.cells()
      src.clear(); scene(src, MORPH, cam, 'people')
      const starFrom = src.cells().filter((q) => q[4] >= 0.3)
      const [hx, hy] = cam.P(V.add(um.grip, [0, SHAFT - RISE, 0]))
      const [cx, cy] = cam.P([0, 150, 0])
      glide = {
        ring: glideOf(ringFrom, M.ring.map((q) => [q.x, q.y]), { delay: (q) => 40 + (Math.hypot(q[0] - hx, q[1] - hy) / f) * 5, flight: 780, bend: 3.5 * f }),
        star: glideOf(starFrom, M.star.map((q) => [q.x, q.y]), { delay: (q) => 140 + (Math.hypot(q[0] - cx, q[1] - cy) / f) * 5, flight: 720, bend: 2.2 * f }),
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
  const LAMP = [-84, -40]
  const draw = (t) => {
    pad.clear()
    const cam = camAt(t)
    const street = 1 - sm5(span(t, MORPH - 100, MORPH + 500))
    const [, ground] = cam.P([0, 0, 0])
    // the pavement's edge, and the lamp behind her
    if (street > 0.01) {
      const [gx0] = cam.P([-600, 0, 0])
      const [gx1] = cam.P([600, 0, 0])
      const [lx, ly0] = cam.P([LAMP[0], 0, LAMP[1]])
      const [, ly1] = cam.P([LAMP[0], 204, LAMP[1]])
      const [hx1, hy1] = cam.P([LAMP[0] + 15, 206, LAMP[1]])
      pad.layers([
        [[{ k: 1, ax: gx0, ay: ground, bx: gx1, by: ground, ra: 0.35 * f, rb: 0.35 * f }], INK, 0.6 * street],
        [[
          { k: 1, ax: lx, ay: ly0, bx: lx, by: ly1, ra: 2.4 * cam.s, rb: 1.8 * cam.s },
          { k: 1, ax: lx, ay: ly1, bx: hx1, by: hy1, ra: 1.5 * cam.s, rb: 1.3 * cam.s },
          { k: 2, cx: hx1, cy: hy1 + 3 * cam.s, rx: 7 * cam.s, ry: 3.2 * cam.s, ang: 0 },
        ], INK, street],
      ])
    }
    let um
    if (t < MORPH) {
      um = scene(pad, t, cam)
      reflect(t, ground)
    } else um = posed(MORPH).um
    const roof = roofOf(um, cam)
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
    const [lgx, lgy] = cam.P([LAMP[0] + 15, 203, LAMP[1]])
    return { cells, glow: street > 0.01 ? { x: lgx, y: lgy, r: 22 * cam.s, a: 0.5 * street, inner: 0.9 } : null }
  }
  const [wx, wy] = camAt(WASH_AT).P([-4, 176, 0])
  // (for the lab's own checks: the poses and what hangs from them)
  const story = tale({ f, end: END, draw, prep, live: true, wash: { at: WASH_AT, x: Math.round(wx), y: Math.round(wy), ms: 1350 } })
  story.debug = { posed, hair: () => hair, skirt: () => skirt }
  return story
}

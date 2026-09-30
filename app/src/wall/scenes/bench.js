// ── the bench ───────────────────────────────────────────────────────────────
// Behind them, at night, close. A park bench seen from its back, the two of
// them sitting on it a little apart, in silhouette against the lit glass: a
// treeline far off between the rails, the moon with its light round it, a
// branch of blossom hanging in at the top and petals coming down. The
// camera eases in, very slowly, the whole time.
//
// She turns her head to look at him, and her profile comes out of the back
// of her head as it turns, the brow, the nose, the lips, a lash. She holds
// the look. She glances down, and up again. Then she shifts along the
// bench toward him, twice, the way anybody does, the weight onto her hands,
// the shoulders coming up, the slide, the settle, her hair swinging after
// her. She tilts her head and rests it on his shoulder. He turns his head a
// little to hers and lays his cheek on her hair, and his arm comes up round
// her. A star falls. The backlight turns pink out from their two heads; the
// bench bends into the ring and the two of them gather into the star, and
// the petals go on falling round the mark.
//
// Everything moves on the clock, not in frames: every shape is laid between
// the cells, anti-aliased, wherever the moment puts it, and every move is
// eased at both ends and overlaps the next, as a body's does (kit.js
// `moves`). Her hair hangs on a spring and swings after her (`springOf`).
//
//      0   the park; the two of them sitting apart
//    800   she turns her head to him
//   1750   a glance down, and back up to him
//   2400   she shifts along toward him; again at 3050
//   3700   she tilts her head onto his shoulder
//   4400   he turns his head to hers; 4700 his arm round her
//   5300   the star falls
//   5800   the pink, from their heads
//   5950   the bench into the ring, the two of them into the star

import {
  Pad, softPetals, sky, mark, glideOf, tale, INK, FAR, ROSE,
  clamp, lerp, span, sm5, settle, moves, springOf, round, D, hash,
} from './kit.js'

const HIP = 64
const HIM = { x: 60, sh: 41.2, w: 9.4, waist: 6.4, neck: 2.25, neckLen: 3.7, head: 1.34 }
const HER = { sh: 43.8, w: 7.0, waist: 4.6, neck: 1.25, neckLen: 5.2, head: 1.26 }
const STAR = [5300, 5850]
const WASH_AT = 5800
const MORPH = 5950
const END = MORPH + 1300
const CAMERA = [0, MORPH]

// ── the heads, in profile ──
// The intro's (folk.js): the skull, the brow, the nose, the lips, the chin
// and the jaw, and the hair over the crown, which in silhouette are one
// outline; x forward, y up from the top of the neck, in the bodies' units.
const HIM_HEAD = [
  [0.2, 8.4], [2.0, 8.0], [3.3, 6.8], [3.7, 5.2], [3.45, 4.6], [3.75, 4.1], [4.9, 2.8], [3.95, 2.35], [4.0, 1.8], [3.7, 1.45],
  [3.85, 1.05], [3.65, 0.2], [3.0, -0.45], [1.8, -0.5], [0.6, 0.2], [-1.3, 0.1], [-2.9, 1.7], [-3.7, 3.9], [-3.4, 6.2], [-2.1, 7.8],
]
const HIM_HAIR = [
  [3.45, 6.4], [3.1, 7.6], [1.9, 8.6], [0.0, 8.95], [-2.2, 8.4], [-3.6, 6.7], [-4.1, 4.3], [-3.6, 2.2], [-2.6, 1.4],
  [-1.9, 2.7], [-0.6, 5.1], [1.2, 5.9], [2.7, 6.0],
]
const HER_HEAD = [
  [0.0, 7.8], [1.9, 7.4], [3.1, 6.3], [3.45, 4.85], [3.25, 4.35], [3.5, 3.9], [4.25, 2.8], [3.7, 2.45], [3.75, 2.0], [3.5, 1.65],
  [3.62, 1.3], [3.35, 0.55], [2.7, 0.0], [1.6, -0.1], [0.55, 0.45], [-1.2, 0.35], [-2.7, 1.8], [-3.45, 3.8], [-3.15, 5.8], [-2.0, 7.1],
]
const HER_HAIR = [
  [3.65, 5.0], [3.75, 6.2], [3.2, 7.5], [1.9, 8.5], [0.0, 8.9], [-2.2, 8.5], [-3.8, 7.1], [-4.5, 4.8], [-4.5, 2.7],
  [-3.8, 1.1], [-2.6, 1.0], [-1.6, 2.9], [-0.3, 4.8], [1.5, 5.7], [2.7, 5.35],
]

// a point in a head's frame (u across, v down, from the top of the neck),
// turned `tilt` degrees about the neck and set on it at (nx, ny)
const onNeck = (nx, ny, tilt) => {
  const c = Math.cos(tilt * D)
  const s = Math.sin(tilt * D)
  return ([u, v]) => [nx + u * c - v * s, ny + u * s + v * c]
}
// pushed out from a middle by `g`, for the air round a shape
const grown = (pts, g) => {
  if (!g) return pts
  let cx = 0
  let cy = 0
  for (const [x, y] of pts) { cx += x; cy += y }
  cx /= pts.length
  cy /= pts.length
  return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g] })
}

// A head from behind, turning. `turn` 0 is the back of it and 1 the profile
// facing right (-1 left): the skull is round from every side, so it stays
// an ellipse; the face is laid out from its middle by how far round it has
// come (a profile point `x` forward is seen `x sin` across), so the nose,
// the lips and the chin come out past the skull's edge only as the head
// comes round, as they do. Her lashes, past her eye, the last of it.
function head(pad, P, ink, g = 0) {
  const s = P.scale
  const sn = Math.sin((P.turn * Math.PI) / 2)
  const at = onNeck(P.nx, P.ny, P.tilt)
  const face = (P.her ? [HER_HEAD, HER_HAIR] : [HIM_HEAD, HIM_HAIR])
  for (const pts of face) {
    const ring = round(pts.map(([x, y]) => [x * s * sn, -y * s]), 1)
    pad.poly(grown(ring.map(at), g), ink, 1)
  }
  // the skull: round from behind, and as the head comes round, the back
  // of it only, the face's own outline taking over in front
  const k = Math.abs(sn)
  const [cx, cy] = at([-0.9 * s * sn, -4.4 * s])
  pad.ell(cx, cy, lerp(P.her ? 3.35 : 3.6, 2.9, k) * s + g, (P.her ? 4.3 : 4.5) * s + g, P.tilt, ink, 1)
  // his ears, either side from behind, going in behind the head as it turns
  if (!P.her) {
    for (const side of [-1, 1]) {
      const [ex, ey] = at([(side * 3.55 * Math.cos((P.turn * Math.PI) / 2) - 0.3 * sn) * s, -3.5 * s])
      pad.ell(ex, ey, 0.55 * s + g, 0.95 * s + g, P.tilt + side * 12, ink, 1)
    }
  }
  // her hair up: a bun at the back of her head, high, which comes out
  // behind her as she turns
  if (P.her) {
    const [bx, by] = at([-3.3 * s * sn, -6.3 * s])
    pad.disc(bx, by, 1.75 * s + g, ink, 1)
  }
  // the nape, down into the neck
  const [ax, ay] = at([0, -1.2 * s])
  pad.ell(ax, ay, (P.her ? 1.6 : 2.35) * s * 0.75 + g, 1.8 * s + g, P.tilt, ink, 1)
  if (P.her && ink && Math.abs(sn) > 0.8) {
    const [l0x, l0y] = at([3.15 * s * sn, -4.55 * s])
    const [l1x, l1y] = at([4.0 * s * sn, -4.85 * s])
    pad.line(l0x, l0y, l1x, l1y, ink, 0.75 * (Math.abs(sn) - 0.8) / 0.2, 0.24)
  }
  return { at, sn }
}

// The body from behind: shoulders, the slope of them to the neck, the back
// down to the waist (most of it behind the bench), the arms at the sides;
// `lean` from the hips, degrees toward him, and `rise` the shoulders lifted.
function body(pad, B, ink, g = 0) {
  const c = Math.cos(B.lean * D)
  const s = Math.sin(B.lean * D)
  const at = ([u, v]) => [B.x + u * c - v * s, HIP + u * s + v * c]
  const sh = -(HIP - B.sh) - B.rise
  const w = B.w
  // the slope from the shoulder to the neck: hers falls more
  const sl = B.her ? 0.9 : 0.25
  const half = [
    [B.waist, 1], [B.waist * 1.04, sh * 0.5], [w * 0.9, sh * 0.78], [w, sh + 3.4], [w * 0.985, sh + 1.6],
    [w * 0.92, sh + 0.45], [w * 0.76, sh - 0.25], [w * 0.5, sh - 0.85 - sl], [B.neck + 0.9, sh - 1.6 - sl],
    [B.neck, sh - B.neckLen * 0.55 - sl * 0.5], [B.neck * 0.95, sh - B.neckLen],
  ]
  const outline = [...half, ...half.slice().reverse().map(([u, v]) => [-u, v])]
  pad.poly(grown(round(outline, 2).map(at), g), ink, 1)
  // the arms, hanging, the hands down on the seat either side
  for (const side of [-1, 1]) {
    const push = B.push || 0
    const a = at([side * (w - 1.5), sh + 2.4])
    const e = at([side * (w + 0.6 - push * 0.6), sh + 11])
    const h = at([side * (w + 1.2 - push * 0.4), sh + 19.5 - push * 1.2])
    pad.cap(a[0], a[1], e[0], e[1], (B.her ? 1.55 : 2.0) + g, (B.her ? 1.25 : 1.6) + g, ink, 1)
    pad.cap(e[0], e[1], h[0], h[1], (B.her ? 1.25 : 1.6) + g, (B.her ? 0.95 : 1.2) + g, ink, 1)
  }
  return { neckTop: at([0, sh - B.neckLen]), shoulder: (side) => at([side * w * 0.92, sh + 0.8]) }
}

// ── the two of them, on the clock ──
function herAt(t) {
  const x = moves(t, 31, [[2400, 2880, 6.3], [3080, 3500, 5]])
  const breath = 0.13 * Math.sin((t / 3300) * Math.PI * 2)
  return {
    x,
    // onto her hands, the shoulders up, and down again as she settles
    rise: breath + moves(t, 0, [[2250, 2440, 0.95], [2760, 3020, -0.95], [2980, 3130, 0.8], [3380, 3620, -0.8], [3750, 4400, -0.9]]),
    push: moves(t, 0, [[2250, 2440, 1], [2760, 3020, -1], [2980, 3130, 1], [3380, 3620, -1]]),
    lean: moves(t, 0, [[2250, 2440, 4.5], [2780, 3050, -4.5], [2980, 3140, 3.8], [3400, 3640, -2.8], [3720, 4420, 7.5]]),
    // the look: round to him, a glance down and back, and the head coming
    // a little forward again as she lays it on him
    turn: moves(t, 0.02, [[760, 1380, 0.9, (k) => settle(k, 0.07)], [3760, 4380, -0.12]]),
    nod: moves(t, 0, [[1720, 1980, 4], [2080, 2400, -4], [3760, 4400, 2]]),
    tilt: moves(t, 0, [[760, 1380, -3], [3700, 4450, 33, (k) => settle(k, 0.04)]]),
    drop: moves(t, 0, [[3700, 4450, 0.9]]),
  }
}
function himAt(t) {
  const breath = 0.12 * Math.sin((t / 3700) * Math.PI * 2 + 1.3)
  return {
    rise: breath + moves(t, 0, [[4200, 4700, -0.35]]),
    lean: moves(t, 0, [[4300, 4900, -2]]),
    turn: moves(t, 0.03, [[1100, 1600, 0.05], [4380, 4950, -0.78, (k) => settle(k, 0.05)]]),
    tilt: moves(t, -1.5, [[1100, 1600, 1.5], [4400, 5000, -9]]),
    arm: sm5(span(t, 4700, 5350)),
  }
}

// her hair hangs from her head and swings after her: it follows her tilt
// and her lean, and trails behind her as she moves along
const hairSwing = springOf((t) => {
  const h = herAt(t)
  const v = (herAt(t + 8).x - herAt(t - 8).x) / 16
  return h.lean * 0.9 - h.tilt * 0.35 - v * 900
}, 0, END, { hz: 1.6, damp: 0.32 })

function her(pad, t, ink, g = 0) {
  const P = herAt(t)
  const B = { ...HER, x: P.x, lean: P.lean, rise: P.rise, push: P.push, her: true }
  const b = body(pad, B, ink, g)
  const [nx, ny] = b.neckTop
  const H = { nx, ny: ny + P.drop, scale: HER.head, turn: P.turn, tilt: P.tilt + P.lean * 0.3 + P.nod * 0.2, her: true }
  const hd = head(pad, H, ink, g)
  // the bow on her bun, the one colour on either of them, its two tails
  // hanging and swinging after her
  if (ink) {
    const s = H.scale
    const at = onNeck(H.nx, H.ny, H.tilt)
    const [bx, by] = at([-3.3 * s * hd.sn, -6.3 * s])
    const r = onNeck(bx, by, H.tilt)
    pad.poly([[0, 0], [-2.2, -1.5], [-2.3, 0.9]].map(r), ROSE, 1)
    pad.poly([[0, 0], [2.2, -1.5], [2.3, 0.9]].map(r), ROSE, 1)
    pad.disc(bx, by, 0.75, ROSE, 1)
    const a = hairSwing(t) * D
    for (const side of [-1, 1]) {
      const a1 = a + side * 0.12
      const x1 = bx + side * 0.5 + Math.sin(a1) * 4.6
      const y1 = by + Math.cos(a1) * 4.6
      pad.cap(bx + side * 0.4, by + 0.4, x1, y1, 0.42, 0.3, ROSE, 1)
    }
  }
  return b
}
function him(pad, t, ink, g = 0) {
  const P = himAt(t)
  const b = body(pad, { ...HIM, lean: P.lean, rise: P.rise }, ink, g)
  const [nx, ny] = b.neckTop
  head(pad, { nx, ny, scale: HIM.head, turn: P.turn, tilt: P.tilt + P.lean * 0.4 }, ink, g)
  return b
}
// his arm, coming up round her: from his shoulder, over her back, to her
// far shoulder, on an arc, the elbow leading
function arm(pad, t, ink, g = 0) {
  const k = himAt(t).arm
  if (k <= 0) return
  const hb = body(new Pad(), { ...HIM, lean: himAt(t).lean, rise: himAt(t).rise }, 0)
  const S = hb.shoulder(-1)
  const hbHer = body(new Pad(), { ...HER, x: herAt(t).x, lean: herAt(t).lean, rise: herAt(t).rise, her: true }, 0)
  const T = hbHer.shoulder(-1)
  const lift = Math.sin(Math.PI * k) * 3
  const E = [lerp(S[0] + 0.8, lerp(S[0], T[0], 0.5), k), lerp(S[1] + 9, lerp(S[1], T[1], 0.5) + 3.2, k) - lift * 0.4]
  const Hd = [lerp(S[0] + 1.2, T[0] + 0.6, k), lerp(S[1] + 16, T[1] + 0.8, k) - lift]
  pad.cap(S[0], S[1] + 1.2, E[0], E[1], 1.9 + g, 1.55 + g, ink, 1)
  pad.cap(E[0], E[1], Hd[0], Hd[1], 1.55 + g, 1.2 + g, ink, 1)
  pad.disc(Hd[0], Hd[1], 1.35 + g, ink, 1)
}

function bench(pad, ink, g = 0) {
  // the posts, which carry the back up, and the rails across
  pad.cap(8.5, 47.5, 8.5, 80, 1.25 + g, 1.25 + g, ink, 1)
  pad.cap(86.5, 47.5, 86.5, 80, 1.25 + g, 1.25 + g, ink, 1)
  pad.rect(4.5 - g, 50.6 - g, 86 + 2 * g, 2.7 + 2 * g, ink, 1)
  pad.rect(5 - g, 57 - g, 85 + 2 * g, 2.1 + 2 * g, ink, 1)
  pad.rect(5.5 - g, 63.4 - g, 84 + 2 * g, 1.6 + 2 * g, ink, 1)
  // the arms, rolled at the ends
  pad.cap(3.2, 60.2, 8.5, 59.2, 1.1 + g, 1.1 + g, ink, 1)
  pad.cap(91.8, 60.2, 86.5, 59.2, 1.1 + g, 1.1 + g, ink, 1)
  pad.disc(3.2, 60.2, 1.6 + g, ink, 1)
  pad.disc(91.8, 60.2, 1.6 + g, ink, 1)
  // the front legs, further off, lighter
  if (ink && !g) {
    pad.cap(11.5, 65, 11.8, 74, 0.8, 0.8, INK, 0.45)
    pad.cap(83.5, 65, 83.2, 74, 0.8, 0.8, INK, 0.45)
  }
}

const MOON = [79, 12.5, 6.2]
function scenery(pad, t, a) {
  if (a <= 0.01) return
  const [mx, my, mr] = MOON
  pad.disc(mx, my, mr, INK, 0.26 * a)
  pad.disc(mx - 1.8, my - 1.1, 2.1, INK, 0.42 * a)
  pad.disc(mx + 2.1, my + 1.9, 1.5, INK, 0.4 * a)
  pad.disc(mx + 1.3, my - 2.7, 0.9, INK, 0.38 * a)
  // the treeline, far off, soft, seen between the rails and over them
  for (let i = 0; i < 16; i++) {
    const x = -4 + i * 6.8 + hash(i, 4) * 3
    const r = 3.4 + hash(i, 5) * 3.2
    pad.disc(x, 58 - r * 0.55, r, FAR, 0.34 * a)
  }
  pad.rect(-4, 56, 103, 12, FAR, 0.34 * a)
  // the branch, from off the top left, and its blossom
  pad.cap(-5, 1.5, 12.5, 7.8, 1.5, 1.05, INK, 0.9 * a)
  pad.cap(12.5, 7.8, 30, 9.2, 1.05, 0.45, INK, 0.85 * a)
  pad.cap(10, 6.8, 17, 0.6, 0.6, 0.35, INK, 0.8 * a)
  pad.cap(21, 8.7, 25.5, 14.8, 0.5, 0.32, INK, 0.8 * a)
  const bloom = [[3, 4.6, 1.9], [8, 9.3, 1.6], [15, 2.4, 1.5], [17.2, 7.8, 1.8], [23, 10.8, 1.45], [25.6, 14.9, 1.35], [29.2, 8.4, 1.35], [5.2, 1.4, 1.35], [20, 5.4, 1.15], [11.6, 11.2, 1.15]]
  for (const [x, y, r] of bloom) {
    pad.disc(x, y, r * (1 + 0.04 * Math.sin(t / 900 + x)), ROSE, 0.85 * a)
  }
}

// the falling star: a bright head and a long tail thinning out behind it
function falling(pad, t) {
  const k = span(t, ...STAR)
  if (k <= 0 || k >= 1) return
  const e = 1 - (1 - k) ** 2.2
  const [x0, y0, x1, y1] = [92, 1, 48, 17]
  const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
  const hx = lerp(x0, x1, e)
  const hy = lerp(y0, y1, e)
  const tail = Math.min(0.32, e * 0.9)
  const ex = lerp(x0, x1, e - tail)
  const ey = lerp(y0, y1, e - tail)
  const n = 14
  for (let i = 0; i < n; i++) {
    const a = i / n
    const b = (i + 1) / n
    pad.line(lerp(hx, ex, a), lerp(hy, ey, a), lerp(hx, ex, b), lerp(hy, ey, b), INK, fade * (1 - a) ** 1.6, 0.45 * (1 - a * 0.7))
  }
  pad.disc(hx, hy, 0.9, INK, fade)
}

export function benchStory() {
  const pad = new Pad()
  const src = new Pad()
  let glide = null
  const camera = (t) => ({ k: 1.24 + 0.08 * sm5(span(t, ...CAMERA)), cx: 47, cy: 46 })
  const people = (p, t) => {
    him(p, t, INK)
    her(p, t, 0, 0.75)
    her(p, t, INK)
    arm(p, t, 0, 0.7)
    arm(p, t, INK)
    bench(p, 0, 0.75)
    bench(p, INK)
  }
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = mark()
      src.zoom = camera(MORPH)
      src.clear(); bench(src, INK)
      const ringFrom = src.cells()
      src.clear(); people(src, MORPH)
      const starFrom = src.cells().filter((c) => c[4] >= 0.25 && c[1] < 51)
      const hx = 47
      const hy = 34
      glide = {
        ring: glideOf(ringFrom, M.ring.map((p) => [p.x, p.y]), { delay: (p) => ((p[0] + 4) / 100) * 280, flight: 780, bend: 3 }),
        star: glideOf(starFrom, M.star.map((p) => [p.x, p.y]), { delay: (p) => 130 + (Math.hypot(p[0] - hx, p[1] - hy) / 36) * 240, flight: 720, bend: 2.4 }),
      }
    }
    if (glide.ring.step(ms)) glide.star.step(ms)
  }
  const draw = (t) => {
    pad.clear()
    pad.zoom = camera(t)
    const fade = 1 - sm5(span(t, MORPH - 150, MORPH + 500))
    sky(pad, t, { n: 26, seed: 3, box: [34, 1, 95, 40], a: fade })
    scenery(pad, t, fade)
    falling(pad, t)
    softPetals(pad, t, { n: 12, seed: 7, v: 0.0085, drift: 0.003, sway: 2.6, from: -9000, box: [-6, -4, 104, 76], a: 0.8, size: 0.95 })
    if (t < MORPH) people(pad, t)
    softPetals(pad, t, { n: 7, seed: 19, v: 0.013, drift: 0.0045, sway: 3.2, from: -9000, box: [-6, -4, 104, 80], a: 0.95, size: 1.35 })
    const cells = pad.cells()
    if (t >= MORPH) {
      prep(Infinity)
      glide.ring.at(t - MORPH, cells)
      glide.star.at(t - MORPH, cells)
    }
    const moon = fade > 0.01 ? { x: 47 + (MOON[0] - 47) * pad.zoom.k, y: 46 + (MOON[1] - 46) * pad.zoom.k, r: 10, a: 0.45 * fade, inner: 0.9 } : null
    return { cells, glow: moon }
  }
  return tale({ end: END, draw, prep, live: true, wash: { at: WASH_AT, x: 47, y: 34, ms: 1450 } })
}
void clamp

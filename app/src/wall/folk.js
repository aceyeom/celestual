// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE TWO OF THEM, AS BODIES                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The intro's boy and girl (pixmark.js `introStory`). They were rows of
// pixels typed by hand, a cell or two wide at every limb, and at the size a
// phone's screen gives them they read as stick figures running. So they are
// bodies now, drawn the way a flip book is drawn: a figure posed for every
// frame, and the pose laid on the phone's own grid, at the pitch every
// letter on the wall is lit at.
//
// ── a body ──────────────────────────────────────────────────────────────────
// A head in profile, a brow, a nose and a chin, an eye; a neck; a torso with
// a chest and a back, a waist and a seat, drawn as an outline and not as a
// stick; arms that are round at the shoulder and slight at the wrist, and
// hands; legs with a thigh, a knee, a calf and a shoe with a heel. On her,
// hair with volume that falls to the middle of her back, and a dress, a
// bodice and a skirt that flares from the waist and swings. Every piece is a
// solid shape (a tapered capsule, an ellipse, an outline), placed by a
// skeleton, and a pose is the skeleton's angles, so an in-between is the
// angles half way, drawn again: nothing is a cross-fade of cells.
//
// ── on the grid ─────────────────────────────────────────────────────────────
// The shapes are laid on the grid row by row, four rows to a cell, each row
// cut exactly where the shapes cross it; what a cell is lit at is how much of
// it is covered. So an edge that is half way through a cell is half lit, and
// a body that moves a fifth of a cell is seen to move a fifth of a cell: the
// panel's dots stay where they are, the light in them moves. That is what
// makes the run fluid rather than stepped.
//
// ── the inks ────────────────────────────────────────────────────────────────
// One ink, the screen's, at a handful of strengths, the way a greyscale LCD
// drew. What makes a silhouette a body at this size is what is in front of
// what, so the nearer a thing is the darker it is drawn: his near arm is
// darker than the shirt it swings across, the shirt darker than the arm on
// the far side of him, and the legs on the far side are a little over half
// the ink, so the legs are never mistaken for each other. Faces and hands
// are lighter than hair, so a face is a face under its hair and not a ball.
// Her dress is lighter than his clothes, so that in his arms she is the paler
// of the two, the one further away, and where he stands in front of her there
// is a line of light between them: the air that makes them two people.
//
// Nothing here touches the page: a frame is a function of the clock, worked
// out in plain arithmetic, and the same frame every time it is asked for.

const D = Math.PI / 180
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, k) => a + (b - a) * k
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k]
// the way an angle points, from straight down, forward positive, y up
const down = (a) => [Math.sin(a * D), -Math.cos(a * D)]
// a frame leaning `a` forward: its up and its forward
const upOf = (a) => [Math.sin(a * D), Math.cos(a * D)]
const fwdOf = (a) => [Math.cos(a * D), -Math.sin(a * D)]
// a point given in a leaning frame (x forward, y up), in the body's frame
const inFrame = (o, a, x, y) => {
  const u = upOf(a)
  const f = fwdOf(a)
  return [o[0] + f[0] * x + u[0] * y, o[1] + f[1] * x + u[1] * y]
}
const smooth = (k) => k * k * (3 - 2 * k)

// ── the shapes ──────────────────────────────────────────────────────────────
// A tapered capsule (a limb: two circles and everything between them), an
// ellipse (a hand, a calf, a shoulder) and an outline (a torso, a head, the
// hair, the skirt). Each answers the stretch of a row of the grid it covers,
// which is all the rasteriser asks of it.
const cap = (a, b, ra, rb, tone, z, part) => ({ k: 'cap', a, b, ra, rb, tone, z, part })
const ell = (c, rx, ry, rot, tone, z, part) => ({ k: 'ell', c, rx, ry, rot, tone, z, part })
const poly = (pts, tone, z, part) => ({ k: 'poly', pts, tone, z, part })

// A closed outline through the points given, rounded (Catmull-Rom), `n`
// points between each two.
function round(pts, n = 3) {
  const out = []
  const m = pts.length
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % m]
    const p3 = pts[(i + 2) % m]
    for (let s = 0; s < n; s++) {
      const t = s / n
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  return out
}

// Every shape, moved into the grid's own frame: x across, y DOWN, so a row
// is a row. `X` and `G` are where the body's origin (the ground under its
// pelvis) is, and `sx` is -1 for a body turned round. The bodies are built
// in their own units and drawn `SCALE` of a cell to the unit: everything
// that moves them along the ground is scaled the same, so a foot that is
// still in their units is still on the glass.
export const SCALE = 1.1
function place(s, X, G, sx) {
  const K = SCALE
  const P = (p) => [X + sx * K * p[0], G - K * p[1]]
  if (s.k === 'cap') return { ...s, a: P(s.a), b: P(s.b), ra: s.ra * K, rb: s.rb * K }
  if (s.k === 'ell') {
    // the ellipse's own axis, carried across: (cos, sin) goes to
    // (sx cos, -sin)
    return { ...s, c: P(s.c), rx: s.rx * K, ry: s.ry * K, ex: [sx * Math.cos(s.rot * D), -Math.sin(s.rot * D)] }
  }
  return { ...s, pts: s.pts.map(P) }
}

// The stretch of row `y` a shape covers, pushed onto `out` as pairs.
function spans(s, y, out) {
  if (s.k === 'cap') return capSpan(s, y, out)
  if (s.k === 'ell') return ellSpan(s, y, out)
  return polySpan(s.pts, y, out)
}
function circleSpan(cx, cy, r, y, lo) {
  const d = y - cy
  if (d * d >= r * r) return
  const w = Math.sqrt(r * r - d * d)
  lo.push(cx - w, cx + w)
}
// The capsule is convex: the two circles and the four sided piece between
// their outer tangents. The row meets each in one stretch, and the stretches
// overlap, so the capsule's is from the least of them to the most.
const LO = []
function capSpan(s, y, out) {
  const [ax, ay] = s.a
  const [bx, by] = s.b
  LO.length = 0
  circleSpan(ax, ay, s.ra, y, LO)
  circleSpan(bx, by, s.rb, y, LO)
  const dx = bx - ax
  const dy = by - ay
  const d = Math.hypot(dx, dy)
  if (d > Math.abs(s.ra - s.rb) + 1e-6) {
    const ux = dx / d
    const uy = dy / d
    const c = (s.ra - s.rb) / d
    const q = Math.sqrt(Math.max(0, 1 - c * c))
    // the two outer tangents' normals
    const n1x = c * ux - q * uy
    const n1y = c * uy + q * ux
    const n2x = c * ux + q * uy
    const n2y = c * uy - q * ux
    polySpan([
      [ax + s.ra * n1x, ay + s.ra * n1y], [bx + s.rb * n1x, by + s.rb * n1y],
      [bx + s.rb * n2x, by + s.rb * n2y], [ax + s.ra * n2x, ay + s.ra * n2y],
    ], y, LO)
  }
  if (!LO.length) return
  let a = Infinity
  let b = -Infinity
  for (let i = 0; i < LO.length; i += 2) { if (LO[i] < a) a = LO[i]; if (LO[i + 1] > b) b = LO[i + 1] }
  out.push(a, b)
}
function ellSpan(s, y, out) {
  const [c, n] = s.ex
  const Y = y - s.c[1]
  const irx = 1 / (s.rx * s.rx)
  const iry = 1 / (s.ry * s.ry)
  // (u, v) = (x c + Y n, -x n + Y c), u^2/rx^2 + v^2/ry^2 <= 1, in x
  const A = c * c * irx + n * n * iry
  const B = 2 * Y * c * n * (irx - iry)
  const C = Y * Y * (n * n * irx + c * c * iry) - 1
  const disc = B * B - 4 * A * C
  if (disc <= 0) return
  const r = Math.sqrt(disc)
  out.push(s.c[0] + (-B - r) / (2 * A), s.c[0] + (-B + r) / (2 * A))
}
const XS = []
function polySpan(p, y, out) {
  XS.length = 0
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const yi = p[i][1]
    const yj = p[j][1]
    if ((yi > y) !== (yj > y)) XS.push(p[i][0] + ((y - yi) * (p[j][0] - p[i][0])) / (yj - yi))
  }
  if (XS.length < 2) return
  XS.sort((a, b) => a - b)
  for (let i = 0; i + 1 < XS.length; i += 2) out.push(XS[i], XS[i + 1])
}
function boxOf(s) {
  if (s.k === 'cap') {
    const r = Math.max(s.ra, s.rb)
    return [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r]
  }
  if (s.k === 'ell') {
    const r = Math.max(s.rx, s.ry)
    return [s.c[0] - r, s.c[1] - r, s.c[0] + r, s.c[1] + r]
  }
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of s.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return [x0, y0, x1, y1]
}

// ── on the grid ─────────────────────────────────────────────────────────────
// A sheet of the grid to lay a body on: the story's own grid and a margin
// round it, since a runner starts off the glass. Its arrays are made once
// and used again frame after frame, so laying a body allocates nothing, and
// only the cells the last body touched are cleared for the next.
const SLOTS = 3
export function sheet(x0, y0, w, h) {
  const n = w * h
  return {
    x0, y0, w, h,
    cov: new Float32Array(n),
    sid: new Int16Array(n * SLOTS).fill(-1),
    len: new Float32Array(n * SLOTS),
    tone: new Float32Array(n),
    part: new Array(n),
    gap: new Uint8Array(n),
    touched: new Int32Array(n),
    count: 0,
  }
}
function wipe(S) {
  for (let k = 0; k < S.count; k++) {
    const i = S.touched[k]
    S.cov[i] = 0
    S.gap[i] = 0
    for (let q = 0; q < SLOTS; q++) { S.sid[i * SLOTS + q] = -1; S.len[i * SLOTS + q] = 0 }
  }
  S.count = 0
}

// The shapes, frontmost first, laid on the grid four rows to a cell. On each
// row every shape's stretch is cut where a nearer shape already covers it,
// and what is left is added to the cells it crosses, to the shape's own
// account. A cell is then as lit as it is covered, in the ink of whatever
// covers most of it.
const SUB = 4
const TMP = []
const COVERED = []
export function lay(shapes, S) {
  wipe(S)
  const list = shapes.map((s) => ({ ...s, box: boxOf(s) })).sort((a, b) => b.z - a.z)
  let y0 = Infinity
  let y1 = -Infinity
  for (const s of list) { if (s.box[1] < y0) y0 = s.box[1]; if (s.box[3] > y1) y1 = s.box[3] }
  const jFrom = Math.max(Math.floor(y0), S.y0)
  const jTo = Math.min(Math.ceil(y1), S.y0 + S.h - 1)
  for (let j = jFrom; j <= jTo; j++) {
    for (let r = 0; r < SUB; r++) {
      const y = j + (r + 0.5) / SUB
      COVERED.length = 0
      for (let si = 0; si < list.length; si++) {
        const s = list[si]
        if (y < s.box[1] || y > s.box[3]) continue
        TMP.length = 0
        spans(s, y, TMP)
        for (let q = 0; q < TMP.length; q += 2) {
          let a = TMP[q]
          const b = TMP[q + 1]
          if (b <= a) continue
          // what of [a, b] no nearer shape has covered, piece by piece
          for (let c = 0; c <= COVERED.length; c += 2) {
            if (a >= b) break
            const ca = c < COVERED.length ? COVERED[c] : Infinity
            const cb = c < COVERED.length ? COVERED[c + 1] : Infinity
            if (cb <= a) continue
            const e = Math.min(b, ca)
            if (e > a) credit(S, j, a, e, si)
            a = Math.max(a, cb)
          }
          insert(COVERED, TMP[q], b)
        }
      }
    }
  }
  // each cell in the ink of what covers most of it, the nearer of two that
  // tie
  for (let k = 0; k < S.count; k++) {
    const i = S.touched[k]
    let best = -1
    let bv = 0
    for (let q = 0; q < SLOTS; q++) {
      const si = S.sid[i * SLOTS + q]
      if (si < 0) continue
      const v = S.len[i * SLOTS + q]
      if (best < 0 || v > bv + 1e-9 || (Math.abs(v - bv) < 1e-9 && list[si].z > list[best].z)) { best = si; bv = v }
    }
    const s = list[best]
    S.cov[i] = Math.min(1, S.cov[i] / SUB)
    S.tone[i] = s.tone
    S.part[i] = s.part
  }
  return S
}
// a stretch of a row credited to the cells it crosses, each cell keeping
// the three shapes that cover most of it
function credit(S, j, a, b, si) {
  const row = (j - S.y0) * S.w
  const i0 = Math.max(Math.floor(a), S.x0)
  const i1 = Math.min(b, S.x0 + S.w)
  for (let i = i0; i < i1; i++) {
    const len = Math.min(b, i + 1) - Math.max(a, i)
    if (len <= 0) continue
    const idx = row + i - S.x0
    if (S.cov[idx] === 0 && S.sid[idx * SLOTS] < 0) S.touched[S.count++] = idx
    S.cov[idx] += len
    let q = 0
    const o = idx * SLOTS
    while (q < SLOTS && S.sid[o + q] >= 0 && S.sid[o + q] !== si) q++
    if (q < SLOTS) {
      S.sid[o + q] = si
      S.len[o + q] += len
    } else {
      // a fourth shape in one cell: it takes the place of the least
      let m = 0
      for (let r = 1; r < SLOTS; r++) if (S.len[o + r] < S.len[o + m]) m = r
      if (len > S.len[o + m]) { S.sid[o + m] = si; S.len[o + m] = len }
    }
  }
}
// a stretch merged into a row's sorted list of covered stretches
function insert(c, a, b) {
  let i = 0
  while (i < c.length && c[i + 1] < a) i += 2
  let na = a
  let nb = b
  let k = i
  while (k < c.length && c[k] <= nb) { na = Math.min(na, c[k]); nb = Math.max(nb, c[k + 1]); k += 2 }
  c.splice(i, k - i, na, nb)
}

// ── the builds ──────────────────────────────────────────────────────────────
// In cells. He is fifty five tall and she is fifty. Every length is from
// joint to joint; `r` is a limb's half width at either end. They are fuller
// than a body is in profile, the way a figure drawn small is: a real torso
// seen from the side is a slip, and at this size a slip is a stick.
const HIM = {
  who: 'him',
  thigh: 12.6, shin: 12.4, rThigh: [2.9, 2.0], rShin: [2.1, 1.75],
  torso: 18, neck: 1.9, rNeck: [1.85, 1.75],
  shoulder: [-0.5, 16.0],
  upper: 9.0, fore: 8.0, rUpper: [1.9, 1.45], rFore: [1.45, 1.05], hand: 1.5,
  deltoid: [2.3, 2.1],
  // the inks: his hair, his face and hands, his shirt, his sleeve on the
  // near side (in front of the shirt), his trousers, his shoes
  tone: { hair: 1, skin: 0.55, top: 0.8, sleeve: 1, seat: 0.95, legs: 1, shoe: 1 },
}
const HER = {
  who: 'her',
  thigh: 11.6, shin: 11.4, rThigh: [2.5, 1.6], rShin: [1.6, 0.92],
  torso: 16, neck: 1.9, rNeck: [1.4, 1.3],
  shoulder: [-0.35, 14.3],
  upper: 8.0, fore: 7.0, rUpper: [1.45, 1.15], rFore: [1.15, 0.85], hand: 1.25,
  deltoid: [1.75, 1.55],
  tone: { hair: 1, skin: 0.55, top: 0.74, sleeve: 0.55, seat: 0.74, legs: 0.55, shoe: 0.95 },
}
// how much of its own ink a limb on the far side is drawn at
const FAR = 0.58

// The torsos, as outlines in the torso's own frame: x forward, y up the
// spine from the hip joints. His is cut at the belt, his shirt above it and
// his trousers below; hers is her bodice, and her skirt is its own shape.
const HIM_TOP = round([
  [1.6, 18.0], [3.0, 17.0], [4.0, 15.3], [4.5, 13.3], [4.35, 11.2], [3.85, 9.2], [3.6, 7.2], [3.7, 5.2], [3.8, 4.0],
  [-3.7, 4.0], [-3.55, 5.4], [-3.5, 7.2], [-3.85, 9.6], [-4.45, 12.4], [-4.55, 14.6], [-4.1, 16.4], [-3.0, 17.6], [-1.7, 18.0],
], 2)
const HIM_SEAT = round([
  [3.85, 4.6], [3.85, 2.3], [3.35, 0.5], [2.0, -1.0], [0, -1.8], [-2.2, -1.3], [-3.8, 0.1], [-4.5, 1.9], [-4.3, 3.6], [-3.75, 4.6],
], 2)
const HER_TOP = round([
  [1.3, 16.0], [2.6, 15.0], [3.4, 13.6], [3.95, 11.9], [3.75, 10.5], [2.95, 9.4], [2.6, 7.9], [2.5, 6.6], [2.85, 5.0], [3.35, 3.3],
  [3.25, 1.6], [2.65, 0.2], [1.6, -1.1], [0, -1.6], [-2.0, -1.1], [-3.6, 0.4], [-4.4, 2.1], [-4.2, 3.9], [-3.2, 5.6], [-2.8, 7.1],
  [-3.1, 9.1], [-3.5, 11.4], [-3.4, 13.4], [-2.8, 15.0], [-1.5, 16.0],
], 2)

// The heads, in profile, in the head's own frame: x forward, y up from the
// top of the neck. A brow, the nose, the lips, a chin and the jaw; the back
// of the skull round to the nape. The nose is a cell proud of the face, so
// at this size it is there.
const HIM_HEAD = round([
  [0.2, 8.4], [2.0, 8.0], [3.3, 6.8], [3.7, 5.2], [3.45, 4.6], [3.75, 4.1], [4.9, 2.8], [3.95, 2.35], [4.0, 1.8], [3.7, 1.45],
  [3.85, 1.05], [3.65, 0.2], [3.0, -0.45], [1.8, -0.5], [0.6, 0.2], [-1.3, 0.1], [-2.9, 1.7], [-3.7, 3.9], [-3.4, 6.2], [-2.1, 7.8],
], 2)
// his hair: the crown and the back of the head, down to the nape behind
// and to a fringe over the brow in front, with the temple left as skin
const HIM_HAIR = round([
  [3.45, 6.4], [3.1, 7.6], [1.9, 8.6], [0.0, 8.95], [-2.2, 8.4], [-3.6, 6.7], [-4.1, 4.3], [-3.6, 2.2], [-2.6, 1.4],
  [-1.9, 2.7], [-0.6, 5.1], [1.2, 5.9], [2.7, 6.0],
], 2)
const HER_HEAD = round([
  [0.0, 7.8], [1.9, 7.4], [3.1, 6.3], [3.45, 4.85], [3.25, 4.35], [3.5, 3.9], [4.25, 2.8], [3.7, 2.45], [3.75, 2.0], [3.5, 1.65],
  [3.62, 1.3], [3.35, 0.55], [2.7, 0.0], [1.6, -0.1], [0.55, 0.45], [-1.2, 0.35], [-2.7, 1.8], [-3.45, 3.8], [-3.15, 5.8], [-2.0, 7.1],
], 2)
// her hair's crown: fuller than the head, a fringe swept down to the brow
// in front, and at the back full down to where the fall leaves it
const HER_HAIR = round([
  [3.65, 5.0], [3.75, 6.2], [3.2, 7.5], [1.9, 8.5], [0.0, 8.9], [-2.2, 8.5], [-3.8, 7.1], [-4.5, 4.8], [-4.5, 2.7],
  [-3.8, 1.1], [-2.6, 1.0], [-1.6, 2.9], [-0.3, 4.8], [1.5, 5.7], [2.7, 5.35],
], 2)
// the eye, a dark cell in the face, under the brow and behind the nose
const EYE = { him: [2.6, 4.25], her: [2.4, 4.15] }

// The shoes, in the foot's own frame: x along the foot from the ankle, y up.
const HIM_SHOE = round([
  [-1.0, 1.0], [-2.0, 0.2], [-2.1, -1.0], [-1.75, -1.6], [4.8, -1.6], [5.9, -1.25], [6.0, -0.5], [5.1, -0.05], [2.9, 0.6], [1.1, 1.2],
], 2)
const HER_SHOE = round([
  [-0.6, 0.7], [-1.5, 0.0], [-1.6, -0.85], [-1.25, -1.4], [4.2, -1.4], [5.1, -1.0], [4.95, -0.5], [3.2, -0.05], [1.3, 0.5],
], 2)

const mapPts = (pts, o, a) => pts.map(([x, y]) => inFrame(o, a, x, y))

// ── a limb ──
// A leg from the hip joint: the thigh at `h` from straight down (forward
// positive), the knee bent back by `k`, the foot pitched `f` from level
// (toe up positive), wherever the shin leaves it.
function legOf(B, hip, h, k, f) {
  const knee = add(hip, down(h), B.thigh)
  const ankle = add(knee, down(h - k), B.shin)
  const shoe = mapPts(B.who === 'her' ? HER_SHOE : HIM_SHOE, ankle, -f)
  return { hip, knee, ankle, shoe, h, k, f }
}
// An arm from the shoulder: the upper arm at `s` from straight down, the
// elbow bent forward by `e`.
function armOf(B, sh, s, e) {
  const elbow = add(sh, down(s), B.upper)
  const wrist = add(elbow, down(s + e), B.fore)
  return { sh, elbow, wrist, s, e }
}
const lowest = (leg) => {
  let m = Infinity
  for (const p of leg.shoe) if (p[1] < m) m = p[1]
  return m
}

// ── a body in a pose ────────────────────────────────────────────────────────
// A pose: `lean` the torso from upright (forward positive), `neck` and `nod`
// the neck and the head on it; for each leg (`N` near, `F` far) the thigh,
// the knee and the foot; for each arm the shoulder and the elbow, and its
// hand (`fist`, `open`, `flat`, or none); `lift` the pelvis off the lower
// foot, in a stride that is off the ground. On her, `hair` is the fall's
// angles and `skirt` how far the hem is swung. Answers the shapes in the
// body's own frame (x forward, y up, the ground at 0 under the pelvis) and
// the joints, for placing things on it.
// The legs of a pose, with the pelvis lifted until the lower foot is on the
// ground (or `lift` over it): what the run needs to know where the feet are.
export function stance(who, p) {
  const B = who === 'her' ? HER : HIM
  const legs = (hy) => [
    legOf(B, [0.3, hy], p.hN, p.kN, p.fN || 0),
    legOf(B, [-0.3, hy], p.hF, p.kF, p.fF || 0),
  ]
  const t0 = legs(0)
  const floor = Math.min(lowest(t0[0]), lowest(t0[1]))
  const hipY = -floor + (p.lift || 0)
  const [LN, LF] = legs(hipY)
  return { LN, LF, hipY }
}

export function body(who, p) {
  const her = who === 'her'
  const B = her ? HER : HIM
  const T = B.tone
  const out = []
  const put = (s) => { out.push(s); return s }
  const { LN, LF, hipY } = stance(who, p)
  const hip = [0, hipY]
  const lean = p.lean || 0
  // ── legs
  const legShapes = (L, far, zb) => {
    const k = far ? FAR : 1
    const tl = T.legs * k
    const part = far ? 'legF' : 'legN'
    put(cap(L.hip, L.knee, B.rThigh[0], B.rThigh[1], tl, zb, part))
    put(cap(L.knee, L.ankle, B.rShin[0], B.rShin[1], tl, zb + 0.1, part))
    if (her) {
      // the calf, round at the back of the shin's upper third
      const sd = down(L.h - L.k)
      const back = [sd[1], -sd[0]]
      const c = add(add(L.knee, sd, B.shin * 0.32), back, 0.5)
      put(ell(c, 3.3, 1.6, Math.atan2(sd[1], sd[0]) / D, tl, zb + 0.15, part))
    }
    put(poly(L.shoe, T.shoe * k, zb + 0.2, part))
  }
  legShapes(LF, true, 4)
  legShapes(LN, false, 14)
  // ── the torso
  if (her) {
    put(poly(mapPts(HER_TOP, hip, lean), T.top, 18, 'torso'))
  } else {
    put(poly(mapPts(HIM_TOP, hip, lean), T.top, 18, 'torso'))
    put(poly(mapPts(HIM_SEAT, hip, lean), T.seat, 17.5, 'seat'))
  }
  // ── the neck and the head
  const nb = inFrame(hip, lean, her ? 0.05 : 0.1, B.torso - 0.6)
  const na = lean + (p.neck || 0)
  const nt = add(nb, upOf(na), B.neck + 0.6)
  put(cap(nb, nt, B.rNeck[0], B.rNeck[1], T.skin, 21, 'neck'))
  const ha = na + (p.nod || 0)
  put(poly(mapPts(her ? HER_HEAD : HIM_HEAD, nt, ha), T.skin, 22, 'head'))
  put(poly(mapPts(her ? HER_HAIR : HIM_HAIR, nt, ha), T.hair, 23, 'hair'))
  if (p.eye !== false) put(ell(inFrame(nt, ha, ...EYE[who]), 0.5, 0.62, -ha, T.hair, 22.5, 'eye'))
  // ── the arms
  const sh = inFrame(hip, lean, B.shoulder[0], B.shoulder[1])
  const armShapes = (s, e, hand, far, zb, wrist) => {
    const A = armOf(B, add(sh, fwdOf(lean), far ? -0.35 : 0.15), s, e)
    const k = far ? FAR : 1
    const part = far ? 'armF' : 'armN'
    // his sleeves are his shirt's, to the wrist, the near one in front of
    // it; her arms are bare
    const sleeve = far ? T.top * k : T.sleeve
    put(ell(add(A.sh, down(s), B.deltoid[0] * 0.45), B.deltoid[0], B.deltoid[1], s - 90, sleeve, zb, part))
    put(cap(A.sh, A.elbow, B.rUpper[0], B.rUpper[1], sleeve, zb + 0.05, part))
    put(cap(A.elbow, A.wrist, B.rFore[0], B.rFore[1], her ? T.skin * k : sleeve, zb + 0.1, part))
    if (hand) handOf(B, A, hand, T.skin * k, zb + 0.2, part, wrist).forEach(put)
    return A
  }
  const AF = p.armF === false ? null : armShapes(p.sF, p.eF, p.handF ?? 'fist', true, 2, p.wF || 0)
  const AN = p.armN === false ? null : armShapes(p.sN, p.eN, p.handN ?? 'fist', false, 30, p.wN || 0)
  // ── hers: the hair's fall and the skirt
  const joints = { hip, LN, LF, AN, AF, sh, nt, ha, lean, nb }
  if (her) {
    hairOf(p, joints, T).forEach(put)
    skirtOf(p, joints, T).forEach(put)
  }
  return { shapes: out, joints }
}

// A hand: a loose fist, a hand open (the fingers together, the thumb
// apart), or a hand laid flat on somebody's back; `w` turns it at the wrist
// (forward positive, so a hand laid on a back is turned down, negative).
function handOf(B, A, kind, tone, z, part, w = 0) {
  const a = A.s + A.e + w
  const r = B.hand
  if (kind === 'fist') return [ell(add(A.wrist, down(a), r * 0.8), r * 1.15, r, a - 90, tone, z, part)]
  const d = down(a + (kind === 'flat' ? 6 : 12))
  const tip = add(A.wrist, d, r * 2.7)
  const out = [cap(add(A.wrist, d, 0.3), tip, r * 0.78, r * 0.55, tone, z, part)]
  if (kind === 'open') out.push(cap(add(A.wrist, d, 0.5), add(A.wrist, down(a + 58), r * 1.8), r * 0.45, r * 0.36, tone, z, part))
  return out
}

// Her hair's fall: from the back of her head along a chain of five pieces,
// each at its own angle (from straight down, forward positive, so hair
// streaming behind her runs at about -35), drawn as one outline round the
// chain: full a little below the nape, where hair has its volume, and
// tapering from there to its ends, which part a little, the outer lock
// lifting from the inner as it streams. One shape, the way a fall of hair
// is one shape in a silhouette.
const HAIR_LEN = [3.4, 3.4, 3.1, 2.9, 2.6]
// the half widths at each joint of the chain, the outer side and the inner
const HAIR_OUT = [2.9, 2.6, 2.15, 1.6, 1.0, 0.35]
const HAIR_IN = [2.5, 2.3, 1.9, 1.4, 0.85, 0.3]
function hairOf(p, j, T) {
  const { nt, ha } = j
  const hair = p.hair || [-10, -8, -6, -4, -2]
  // the fall's top, full over the nape and the back of the shoulders
  const out = [ell(inFrame(nt, ha, -2.9, 2.2), 2.4, 3.4, -ha, T.hair, 21.5, 'hair')]
  const chain = [inFrame(nt, ha, -2.9, 3.3)]
  hair.forEach((a, i) => chain.push(add(chain[i], down(a), HAIR_LEN[i])))
  // each joint's normal: the outer side is the side away from her back
  const norm = chain.map((q, i) => {
    const a = chain[Math.max(0, i - 1)]
    const b = chain[Math.min(chain.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [dy / l, -dx / l]
  })
  const outer = chain.map((q, i) => add(q, norm[i], -HAIR_OUT[i]))
  const inner = chain.map((q, i) => add(q, norm[i], HAIR_IN[i]))
  // the ends part: the last joint of the outer side reaches on past the
  // inner by a little, and between them the tip is notched
  const n = chain.length - 1
  const d = down(hair[n - 1])
  const tipOut = add(add(chain[n], d, 1.2), norm[n], -0.9)
  const notch = add(chain[n], d, -0.6)
  const tipIn = add(add(chain[n], d, 0.4), norm[n], 0.7)
  out.push(poly(round([...outer.slice(0, n), tipOut, notch, tipIn, ...inner.slice(0, n).reverse()], 2), T.hair, 21.5, 'hair'))
  return out
}

// Her skirt: from the waist, over the seat, out to a hem just over the
// knee, fuller at the back. `p.skirt` swings the hem about the waist
// (negative: blown back), and a knee that comes forward carries the front
// of the hem with it, as a knee in a skirt does.
function skirtOf(p, j, T) {
  const { hip, lean, LN, LF } = j
  const waist = inFrame(hip, lean, 0, 5.2)
  const sw = (p.skirt || 0) + lean * 0.45
  const dn = down(sw)
  const fw = [-dn[1], dn[0]]
  const L = 13.4
  const flare = 6.1 + (p.flare || 0)
  const wF = inFrame(hip, lean, 2.85, 5.2)
  const wB = inFrame(hip, lean, -3.1, 5.4)
  const hipF = inFrame(hip, lean, 3.4, 2.6)
  const hipB = inFrame(hip, lean, -4.5, 2.2)
  const base = add(waist, dn, L)
  let hemF = add(base, fw, flare)
  let hemB = add(add(base, fw, -flare - 0.5), dn, -0.3)
  // a knee forward of the hem takes the hem with it
  for (const l of [LN, LF]) {
    const k = l.knee
    const kx = k[0] + 2.1
    if (kx > hemF[0] && k[1] > hemF[1] - 2.5) hemF = [kx, Math.min(hemF[1] + (kx - hemF[0]) * 0.35, k[1] - 0.2)]
    const bx = k[0] - 2.1
    if (bx < hemB[0] && k[1] > hemB[1] - 2.5) hemB = [bx, Math.min(hemB[1] + (hemB[0] - bx) * 0.35, k[1] - 0.2)]
  }
  const mid = add(base, dn, 0.45)
  const q = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
  const outline = round([
    wF, hipF, q(hipF, hemF, 0.55), hemF, q(hemF, mid, 0.5), mid, q(mid, hemB, 0.5), hemB, q(hipB, hemB, 0.5), hipB, wB,
  ], 2)
  return [poly(outline, T.top, 20, 'skirt')]
}

// ── the finished drawing ────────────────────────────────────────────────────
// A body laid on the grid at (`X`, `G`): its pelvis over column X, which may
// be between two columns, and its feet on row G, on sheet `S` (or on one of
// its own).
export function drawBody(who, pose, X, G, flip = false, S = null) {
  const { shapes } = body(who, pose)
  return lay(shapes.map((s) => place(s, X, G, flip ? -1 : 1)), S || sheet(Math.floor(X) - 45, G - 70, 90, 80))
}

// A laid cell's light: its ink, by how much of it is covered. An edge half
// through a cell is lit a little under half, so an outline is soft by a
// cell and no more, and a cell a shape only grazes is not lit at all.
const GAP = 0.2
export function lit(cov, tone, gap) {
  const k = clamp((cov - 0.12) / 0.7, 0, 1)
  return (gap ? Math.min(tone, GAP) : tone) * smooth(k)
}
function push(out, S, i, gap) {
  const a = lit(S.cov[i], S.tone[i], gap)
  if (a < 0.03) return
  out.push([S.x0 + (i % S.w), S.y0 + Math.floor(i / S.w), 1, 0, Math.round(a * 16) / 16])
}
export function cellsOf(S) {
  const out = []
  for (let k = 0; k < S.count; k++) push(out, S, S.touched[k], S.gap[S.touched[k]])
  return out
}

// Him in front of her, on two sheets of the same grid: where he is, she is
// not seen, and round his outline where it lies over her there is a line of
// light, so the two of them are two and not one shape. His far arm and far
// leg are on the far side of him, and she is too: where they cross her,
// they are behind her.
const SOLID = 0.35
const BEHIND = new Set(['armF', 'legF'])
export function together(H, S) {
  const out = []
  const { w, h } = H
  // his far limbs, where she is, are hers
  for (let k = 0; k < H.count; k++) {
    const i = H.touched[k]
    if (BEHIND.has(H.part[i]) && S.cov[i] >= SOLID) H.cov[i] = 0
  }
  for (let k = 0; k < H.count; k++) {
    const i = H.touched[k]
    if (H.cov[i] < SOLID) continue
    const x = i % w
    const y = Math.floor(i / w)
    for (let dy = -1; dy <= 1; dy++) {
      if (y + dy < 0 || y + dy >= h) continue
      for (let dx = -1; dx <= 1; dx++) {
        if (x + dx < 0 || x + dx >= w) continue
        const n = i + dy * w + dx
        if (S.cov[n] > 0 && H.cov[n] < SOLID) S.gap[n] = 1
      }
    }
  }
  for (let k = 0; k < S.count; k++) {
    const i = S.touched[k]
    if (H.cov[i] >= SOLID) continue
    push(out, S, i, S.gap[i] || H.cov[i] > 0)
  }
  for (let k = 0; k < H.count; k++) {
    const i = H.touched[k]
    if (H.cov[i] < SOLID && S.cov[i] > 0) continue
    push(out, H, i, 0)
  }
  return out
}

// ── poses between poses ─────────────────────────────────────────────────────
// Two poses mixed, `k` of the way: every angle part way, so an in-between is
// the two poses' in-between and not a cross-fade of their cells.
export function mixPose(a, b, k) {
  const out = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key]
    const y = b[key]
    if (Array.isArray(x) || Array.isArray(y)) {
      const xa = x || y
      const ya = y || x
      out[key] = xa.map((v, i) => lerp(v, ya[i], k))
    } else if (typeof x === 'number' || typeof y === 'number') {
      out[key] = lerp(x ?? y ?? 0, y ?? x ?? 0, k)
    } else out[key] = k < 0.5 ? x : y
  }
  return out
}

// Keyed poses, `[t, pose]` in order, and the pose at any moment between
// them: every angle on a curve through the keys (Catmull-Rom in time), so a
// movement that passes through a key does not stop at it, and the last key,
// said twice, is arrived at and settled into.
export function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1]
  const n = keys.length
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  let i = 0
  while (i < n - 2 && t >= keys[i + 1][0]) i++
  const [t1, p1] = keys[i]
  const [t2, p2] = keys[i + 1]
  const [t0, p0] = i > 0 ? keys[i - 1] : [t1 - (t2 - t1), p1]
  const [t3, p3] = i + 2 < n ? keys[i + 2] : [t2 + (t2 - t1), p2]
  const u = (t - t1) / (t2 - t1)
  const h00 = 2 * u * u * u - 3 * u * u + 1
  const h10 = u * u * u - 2 * u * u + u
  const h01 = -2 * u * u * u + 3 * u * u
  const h11 = u * u * u - u * u
  const dt = t2 - t1
  const out = {}
  for (const key of new Set([...Object.keys(p1), ...Object.keys(p2)])) {
    const a = p1[key]
    const b = p2[key]
    if (typeof a !== 'number' && typeof b !== 'number') {
      out[key] = u < 0.5 ? (a ?? b) : (b ?? a)
      continue
    }
    const v1 = a ?? b
    const v2 = b ?? a
    const v0 = typeof p0[key] === 'number' ? p0[key] : v1
    const v3 = typeof p3[key] === 'number' ? p3[key] : v2
    // the tangents, by how far each neighbour is in time
    const m1 = ((v2 - v0) / (t2 - t0)) * dt
    const m2 = ((v3 - v1) / (t3 - t1)) * dt
    out[key] = h00 * v1 + h10 * m1 + h01 * v2 + h11 * m2
  }
  return out
}

// ── the run, drawn from the feet ────────────────────────────────────────────
// The pelvis travels on a smooth curve of pace, and each foot is set down on
// the ground at a place and a moment and stays there until it leaves. A leg
// on the ground is where its foot is: the knee bends as far as the distance
// from the hip to the foot says (`reach`), so a foot never skates and the
// body never lurches. A foot comes down heel first and rolls about its heel
// onto its sole, and leaves rolling about its toe. A leg in the air swings
// through drawn poses (the heel up behind, the knee through, the reach),
// from the one it left the ground in to the one it will land in, so the
// run is as fluid as the clock it is drawn on: every frame of the display
// is a drawing.

// the soles: the ankle's height over the ground, and the heel and the ball
// of the foot a foot rolls about, from the ankle
const SOLE = { him: { ah: 1.6, heel: -1.75, toe: 5.5 }, her: { ah: 1.4, heel: -1.25, toe: 4.7 } }

// the thigh and the knee that put the ankle at (dx, dy) from the hip joint,
// the knee forward, as the triangle of thigh, shin and the line between
// them says
function reach(B, dx, dy) {
  const L1 = B.thigh
  const L2 = B.shin
  const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.05, L1 + L2 - 0.01)
  const th = Math.atan2(dx, -dy) / D
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)) / D
  const b = Math.acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1)) / D
  return { h: th + a, k: a + b }
}
// A leg whose foot is on the ground at `fx` (where its ankle is when the foot
// lies flat), pitched `f` (a heel coming down positive, a toe leaving
// negative), the pelvis at `px`, `hy` over the ground, the hip joint `side`
// forward of it. Everything along the way the body faces.
function onGround(who, B, fx, f, px, hy, side) {
  const s = SOLE[who]
  let ax = fx - px - side
  let ay = -(hy - s.ah)
  if (f) {
    // rolled about the heel or the toe, which stays where it is
    const qx = ax + (f > 0 ? s.heel : s.toe)
    const qy = ay - s.ah
    const vx = ax - qx
    const vy = ay - qy
    const c = Math.cos(f * D)
    const n = Math.sin(f * D)
    ax = qx + vx * c - vy * n
    ay = qy + vx * n + vy * c
  }
  return { ...reach(B, ax, ay), f }
}

// a foot's pitch through its time on the ground: down on the heel, rolled
// flat, and up onto the toe as it leaves
const ROLL = [[0, 8], [0.2, 0], [0.62, 0], [1, -32]]
// and a leg through the air, as a share of the swing: the heel up behind,
// the knee through, the reach for the ground
const SWING = [[0.25, { h: 2, k: 80, f: -44 }], [0.5, { h: 20, k: 90, f: -28 }], [0.75, { h: 30, k: 50, f: -8 }]]
const pitchAt = (keys, u) => keyed(keys.map(([a, b]) => [a, { f: b }]), u).f

// One walker: its steps (`leg` 0 near, 1 far; `t` the moment the foot comes
// down, `fx` where, `off` when it leaves, Infinity for a foot that stays)
// and its pelvis (`at(t)`: `x` along the ground and `y` over it). Answers
// the legs at any moment. `amp` shrinks a swing that is shorter than a
// full stride's, so a short step is a short step.
function walker(who, steps, pelvis, stride) {
  const B = who === 'her' ? HER : HIM
  const legs = [steps.filter((s) => s.leg === 0), steps.filter((s) => s.leg === 1)]
  const side = [0.3, -0.3]
  const leg = (l, t) => {
    const L = legs[l]
    let i = -1
    for (let j = 0; j < L.length; j++) if (L[j].t <= t) i = j
    const s = L[Math.max(0, i)]
    const P = pelvis(t)
    if (i < 0 || t < s.off) {
      const u = s.off === Infinity ? Math.min(1, (t - s.t) / 300) * 0.2 : (t - s.t) / (s.off - s.t)
      return onGround(who, B, s.fx, pitchAt(ROLL, clamp(u, 0, 1)), P.x, P.y, side[l])
    }
    const n = L[i + 1]
    if (!n) return null
    const A = pelvis(s.off)
    const Z = pelvis(n.t)
    const from = onGround(who, B, s.fx, -32, A.x, A.y, side[l])
    const to = onGround(who, B, n.fx, 8, Z.x, Z.y, side[l])
    // a short step is not a stride: its leg goes the short way from where it
    // left to where it lands, the knee lifting it clear, and only a full
    // stride's leg goes up behind and through
    const amp = clamp(((n.fx - s.fx) / stride - 0.2) / 0.8, 0, 1)
    const mid = SWING.map(([u, k]) => {
      const line = (key) => lerp(from[key], to[key], u)
      return [u, { h: lerp(line('h'), k.h, amp), k: lerp(line('k') + 26 * Math.sin(Math.PI * u), k.k, amp), f: lerp(line('f'), k.f, amp) }]
    })
    const u = (t - s.off) / (n.t - s.off)
    const r = keyed([[0, from], ...mid, [1, to]], u)
    // a foot in the air clears the ground: where the drawn swing would
    // scuff it, the ankle is lifted and the knee bends to suit
    const air = legOf(B, [side[l], P.y], r.h, r.k, r.f)
    const clear = 0.5 * Math.sin(Math.PI * clamp(u, 0, 1))
    const low = lowest(air)
    if (low >= clear) return r
    return { ...reach(B, air.ankle[0] - side[l], air.ankle[1] - P.y + (clear - low)), f: r.f }
  }
  return (t) => {
    const n = leg(0, t)
    const f = leg(1, t)
    const out = {}
    if (n) Object.assign(out, { hN: n.h, kN: n.k, fN: n.f })
    if (f) Object.assign(out, { hF: f.h, kF: f.k, fF: f.f })
    return out
  }
}

// The pelvis's height set exactly: the pose's `lift` is what raises it from
// where its lower foot would put it to `y`.
function lifted(who, pose, y) {
  const { hipY } = stance(who, { ...pose, lift: 0 })
  return { ...pose, lift: y - hipY }
}

// a pace that falls from `v` to nothing over `d` ms, smoothly at both ends:
// the distance gone by `u` of the way (g(0) = 0, g'(0) = 1, g'(1) = 0 and
// g''(1) = 0, and g(1) = 1/2, so the whole of it is v d / 2)
const slowing = (u) => {
  const x = clamp(u, 0, 1)
  return x - x * x * x + (x * x * x * x) / 2
}

// the arms and the body through a run, by the phase of the near leg
// (the arms swing close, the elbows bent, the hands coming up to the chest
// in front and back past the hip behind; hers a little less)
function runTop(who, phi) {
  const c = Math.cos(2 * Math.PI * phi)
  const her = who === 'her'
  const [s0, sa, e0, ea] = her ? [-9, 22, 86, 14] : [-11, 26, 88, 16]
  return {
    lean: (her ? 10 : 12) + 1.2 * Math.cos(4 * Math.PI * phi),
    neck: her ? -6 : -8,
    nod: -2,
    sN: s0 - sa * c, eN: e0 - ea * c, sF: s0 + sa * c, eF: e0 + ea * c,
    handN: 'fist', handF: 'fist',
  }
}

// ── her hair and her hem ──
// What follows her: the hair and the skirt are springs, each piece pulled
// toward where her pace would stream it and swung by how that pace changes.
// Running, the hair streams back and the hem trails; when she stops in his
// arms they go on without her, past straight down, and come back and
// settle. Worked out once, a millisecond at a time, for the whole story.
const HAIR_REST = [-12, -8, -5, -2, 1]
const HAIR_RUN = [-18, -30, -42, -50, -54]
// gravity, in cells a millisecond a millisecond (a cell is about 3cm of him)
const G = 0.000306
function follow(v, t0, t1) {
  const n = Math.ceil(t1 - t0) + 1
  const hair = HAIR_REST.map(() => new Float32Array(n))
  const hem = new Float32Array(n)
  const th = HAIR_RUN.map(() => 0)
  const w = HAIR_RUN.map(() => 0)
  const aim = HAIR_RUN.map(() => 0)
  let sk = 0
  let sw = 0
  // her pace, and how it changes, over a tenth of a second
  const M = 60
  const raw = new Float32Array(n + 2 * M)
  for (let i = 0; i < raw.length; i++) raw[i] = v(t0 + i - M)
  const sum = new Float64Array(raw.length + 1)
  for (let i = 0; i < raw.length; i++) sum[i + 1] = sum[i] + raw[i]
  const pace = (i) => {
    const a = clamp(i + M - 40, 0, raw.length - 1)
    const b = clamp(i + M + 40, 0, raw.length - 1)
    return (sum[b + 1] - sum[a]) / (b + 1 - a)
  }
  for (let i = 0; i < n; i++) {
    const s = pace(i)
    const acc = (pace(Math.min(n - 1, i + 50)) - pace(Math.max(0, i - 50))) / 100
    const k = clamp(s / 0.06, 0, 1.25)
    for (let j = 0; j < aim.length; j++) aim[j] = HAIR_REST[j] + (HAIR_RUN[j] - HAIR_REST[j]) * k
    if (!i) {
      aim.forEach((a, j) => { th[j] = a })
      sk = -16 * k
    }
    // slowing, what hangs from her swings on forward: a pendulum hung from
    // something slowing leans on by as much as the slowing is to gravity
    const lean = (-acc / G) * (180 / Math.PI)
    for (let j = 0; j < th.length; j++) {
      const om = (2 * Math.PI * (3.0 - 0.25 * j)) / 1000
      // the piece above pulls this one after it
      const target = aim[j] + (j ? 0.55 * (th[j - 1] - aim[j - 1]) : 0) + lean * (0.22 + 0.07 * j)
      w[j] += om * om * (target - th[j]) - 2 * 0.3 * om * w[j]
      th[j] += w[j]
      hair[j][i] = th[j]
    }
    const om = (2 * Math.PI * 2.6) / 1000
    sw += om * om * (-16 * k + lean * 0.3 - sk) - 2 * 0.38 * om * sw
    sk += sw
    hem[i] = sk
  }
  return (t) => {
    const i = clamp(Math.round(t - t0), 0, n - 1)
    return { hair: hair.map((h) => h[i]), skirt: hem[i] }
  }
}

// ── the intro, from the run to the hold ─────────────────────────────────────
// `ground` is the row under their feet and `mid` the column the two of them
// are centred on. From 0, in ms:
//
//      0   they are running when the screen wakes: he in from the left edge,
//          and she, lighter and a step slower, in from the right
//    480   his near foot comes down and he slows over two strides, the
//          second a short one, the body coming up out of the lean and his
//          arms opening; by 860 he stands, and waits for her with them open
//   1060   her last stride lands, and she does not stop: her run carries
//          her on over the foot she landed on, into him and behind him,
//          leaning the way she ran, gently; her other heel comes up behind
//          her, her hair and her hem go on past her and swing back. His
//          arms close round her and he takes her weight, rocking back.
//   1560   she is still, tucked behind him, his arm round her; and they
//          hold on, breathing
//
// Answers `at(t)` (a key and the cells), `times`, the hold's cells (`pair`)
// and where they hold each other (`heart`), where the pink leaves from.
const RUN = {
  // a stride (two steps) in ms, the share of it a foot is down, how far in
  // front of the pelvis a foot comes down, the pelvis's height and its rise
  // and fall, and the pace that comes of them, in cells a ms
  him: { T: 640, S: 0.38, A: 8.5, H: 25.2, bob: 0.7 },
  her: { T: 720, S: 0.38, A: 6.2, H: 23.05, bob: 0.55 },
}
for (const r of Object.values(RUN)) r.v = (r.A * 2.3) / (r.S * r.T)
export function introFolk({ ground = 64, mid = 47, cols = 95 } = {}) {
  const T_BRAKE = 480
  const T_PLANT = T_BRAKE + 380
  const T_LAND = 1060
  const T_HOLD = T_LAND + 500
  // past this the two of them are the mark, and nothing of them moves
  const T_END = 3200
  // where each of them holds the other: she comes to rest close in, so
  // that he is in front of her and she is half behind him, her hair at his
  // neck and her dress and her raised heel past his back
  const HX = mid - 4
  const SX = mid + 4

  // ── him ──
  // The pelvis: running, then slowing to a stand over D ms; x is along the
  // way he runs, 0 where he stands.
  const RH = RUN.him
  const DH = 320
  const brakeGo = (RH.v * DH) / 2
  const hStand = 26.4
  const phiH = (t) => (t - T_BRAKE) / RH.T
  const hBob = (t) => RH.H - RH.bob * Math.cos(4 * Math.PI * (phiH(t) - RH.S / 2))
  const himHip = (t) => {
    if (t <= T_BRAKE) return { x: -brakeGo - RH.v * (T_BRAKE - t), y: hBob(t) }
    const u = (t - T_BRAKE) / DH
    const x = -brakeGo + RH.v * DH * slowing(u)
    return { x, y: lerp(hBob(t), hStand, smooth(clamp(u * 1.1, 0, 1))) }
  }
  // his steps: a run's, a stride every T, and from T_BRAKE his near foot down
  // in front, then his far foot down a little in front of him to stop, and
  // his near foot brought up and set down just ahead of it
  const hSteps = []
  for (let k = -8; k <= 0; k++) {
    const t = T_BRAKE + (k * RH.T) / 2
    hSteps.push({ leg: k & 1, t, fx: himHip(t).x + RH.A, off: t + RH.S * RH.T })
  }
  hSteps[hSteps.length - 1].off = T_BRAKE + 250
  hSteps.push({ leg: 1, t: T_BRAKE + 170, fx: himHip(T_BRAKE + 170).x + 2.6, off: Infinity })
  hSteps.push({ leg: 0, t: T_BRAKE + 360, fx: 2.2, off: Infinity })
  // taking her weight, his pelvis gives a little, back and down, and comes
  // up again; his feet stay where they are
  const himAt = (t) => {
    const P = himHip(t)
    const g = t > T_LAND + 60 ? Math.sin(Math.PI * clamp((t - T_LAND - 60) / 520, 0, 1)) : 0
    return { x: P.x - 0.7 * g, y: P.y - 0.35 * g }
  }
  const himLegs = walker('him', hSteps, himAt, RH.v * RH.T)
  // Open: a V to run into, the far arm high and the near one low, the
  // hands open, the chest up and back a little and the head up.
  const OPEN = { lean: -1.5, neck: -4, nod: -3, sN: 52, eN: 26, sF: 112, eF: 12, handN: 'open', handF: 'open' }
  const WAIT = { ...OPEN, lean: 1, neck: -3, nod: -2, sN: 56, eN: 24, sF: 116, eF: 10 }
  // held: both his arms round her, the near one across her back and the far
  // one behind her, and of each only the hand is seen past her, on her back
  const HOLD_HIM = { ...WAIT, lean: -2, neck: 13, nod: 9, sN: 30, eN: 76, wN: -92, handN: 'flat', sF: 44, eF: 58, wF: -70, handF: 'flat' }
  const TOP_KEYS = [
    [T_BRAKE - 60, runTop('him', phiH(T_BRAKE - 60))],
    [T_BRAKE, runTop('him', 0)],
    [T_BRAKE + 120, { ...mixPose(runTop('him', 120 / RH.T), OPEN, 0.1), lean: 8, neck: -6 }],
    [T_BRAKE + 240, { ...mixPose(runTop('him', 0.4), OPEN, 0.55), lean: 3, neck: -5 }],
    [T_PLANT, OPEN],
    [T_LAND - 30, WAIT],
    // she is in his arms: they close round her, the near one across her
    // back and the far one behind her, and he bows his head to hers
    [T_LAND + 70, { ...WAIT, lean: -1.5, neck: 2, nod: 2, sN: 50, eN: 46, sF: 70, eF: 36, wN: -10 }],
    [T_LAND + 160, { ...HOLD_HIM, lean: -3.5, neck: 7, nod: 5, sN: 36, eN: 68, wN: -50, wF: -40 }],
    [T_LAND + 320, { ...HOLD_HIM, lean: -3, neck: 11, nod: 8 }],
    [T_HOLD, HOLD_HIM],
  ]
  const himTop = (t) => (t < T_BRAKE - 60 ? runTop('him', phiH(t)) : keyed(TOP_KEYS, t))
  const himPose = (t) => lifted('him', { ...himTop(t), ...himLegs(t) }, himAt(t).y)

  // ── her ──
  // The pelvis: running, and from the moment her last stride lands, slowing
  // over DS ms as she goes on over the foot she landed on; x is along the
  // way she runs, 0 where she lands.
  const RS = RUN.her
  const DS = 400
  const phiS = (t) => (t - T_LAND) / RS.T + 0.5
  const sBob = (t) => RS.H - RS.bob * Math.cos(4 * Math.PI * (phiS(t) - RS.S / 2))
  const sRest = 23.1
  const herHip = (t) => {
    if (t <= T_LAND) return { x: -RS.v * (T_LAND - t), y: sBob(t) }
    const u = (t - T_LAND) / DS
    // as she comes over the foot she landed on she rises a little, and
    // settles as she comes to rest against him
    return { x: RS.v * DS * slowing(u), y: lerp(sBob(t), sRest, smooth(clamp(u * 1.2, 0, 1))) + 0.35 * Math.sin(Math.PI * clamp(u, 0, 1)) }
  }
  const sSteps = []
  for (let k = -8; k <= 0; k++) {
    const t = T_LAND + (k * RS.T) / 2
    sSteps.push({ leg: k & 1 ? 0 : 1, t, fx: herHip(t).x + RS.A, off: t + RS.S * RS.T })
  }
  // the foot she lands on stays: she goes on over it
  sSteps[sSteps.length - 1].off = Infinity
  const herLegs = walker('her', sSteps, herHip, RS.v * RS.T)
  // her near leg, once it has left the ground for the last time: the heel
  // comes up behind her, a little, and stays
  const nearOff = sSteps.filter((s) => s.leg === 0).pop().off
  // held: her near arm round his back, bent close so that the hand is on
  // his shoulder blade and no more of it is seen past him; the far arm
  // round his neck, behind him
  const HOLD_HER = { lean: 10.5, neck: 5, nod: 9, sN: 58, eN: 92, wN: 10, sF: 92, eF: 40, handN: 'flat', handF: 'flat', armF: false }
  const L0 = runTop('her', 0.5)
  const HER_KEYS = [
    [T_LAND - 60, runTop('her', phiS(T_LAND - 60))],
    [T_LAND, L0],
    // her arms go out to him at the height of his chest, and round him: the
    // near one round his back, the far one round his neck, behind him
    [T_LAND + 90, { ...L0, lean: 13, neck: -1, nod: 3, sN: 58, eN: 48, sF: 76, eF: 44, handN: 'open', handF: 'open' }],
    [T_LAND + 150, { ...HOLD_HER, lean: 13.8, neck: 2, nod: 5, sN: 55, eN: 75, wN: 6, sF: 92, eF: 62, armF: true }],
    [T_LAND + 210, { ...HOLD_HER, lean: 14, neck: 3, nod: 6, sN: 57, eN: 85, wN: 6 }],
    [T_LAND + 330, { ...HOLD_HER, lean: 11.5, neck: 4, nod: 8 }],
    [T_HOLD, HOLD_HER],
  ]
  // and as she settles it comes down, to rest on its toes behind her
  const R0 = herHip(T_HOLD)
  const tiptoe = onGround('her', HER, R0.x - 7.5, -52, R0.x, sRest, 0.3)
  const HEEL = (from) => [
    [nearOff, from],
    [T_LAND + 80, { hN: -12, kN: 52, fN: -42 }],
    [T_LAND + 240, { hN: -10, kN: 50, fN: -46 }],
    [T_LAND + 400, { hN: -9, kN: 44, fN: -48 }],
    [T_HOLD + 120, { hN: tiptoe.h, kN: tiptoe.k, fN: tiptoe.f }],
  ]
  let heel = null
  const herPoseBase = (t) => {
    const P = herHip(t)
    const top = t < T_LAND - 60 ? runTop('her', phiS(t)) : keyed(HER_KEYS, t)
    let legs = herLegs(t)
    if (t >= nearOff) {
      if (!heel) {
        const s = herLegs(nearOff - 0.01)
        heel = HEEL({ hN: s.hN, kN: s.kN, fN: s.fN })
      }
      legs = { ...legs, ...keyed(heel, t) }
    }
    return lifted('her', { ...top, ...legs }, P.y)
  }

  // ── where they are: placed so that they hold each other where they
  // should, he facing right and she left
  const himX = (t) => HX + SCALE * himAt(t).x
  const sEnd = herHip(T_HOLD).x
  const herX = (t) => SX - SCALE * (herHip(t).x - sEnd)
  // her pace, for her hair and her hem
  const tail = follow((t) => (herHip(t + 1).x - herHip(t - 1).x) / 2, 0, T_END)

  // held, they breathe: in and out every 1400ms
  const breath = (t) => (1 - Math.cos((2 * Math.PI * Math.max(0, t - T_HOLD)) / 1400)) / 2
  // and running, the fall and the hem lift and drop with every step, a
  // beat behind her: the hair falls as she rises and flies up as she comes
  // down, the ends later than the roots
  const bounce = (t, p) => {
    const run = t < T_LAND ? 1 : Math.max(0, 1 - (t - T_LAND) / 260)
    if (run <= 0) return p
    const ph = 4 * Math.PI * (phiS(t) - RS.S / 2)
    return {
      ...p,
      hair: p.hair.map((a, i) => a + run * [1, 2.2, 3.6, 5, 6][i] * Math.sin(ph - 0.5 - 0.4 * i)),
      skirt: p.skirt + run * 3.5 * Math.sin(ph - 1.1),
    }
  }
  const poseAt = (t) => {
    let him = himPose(t)
    let her = bounce(t, { ...herPoseBase(t), ...tail(t) })
    if (t > T_HOLD) {
      const b = breath(t)
      // breathing in: his chest comes up and his head goes down to hers,
      // and she settles further into him
      him = { ...him, lean: him.lean - 0.8 * b, neck: him.neck + 2.4 * b, nod: him.nod + 1 * b }
      her = { ...her, lean: her.lean + 1.2 * b, nod: her.nod + 2 * b, neck: her.neck + 0.8 * b }
    }
    return { him, her }
  }
  // the two sheets they are laid on, the grid and a margin either side
  const SH = sheet(-70, ground - 66, cols + 140, 72)
  const SS = sheet(-70, ground - 66, cols + 140, 72)
  // A drawing is laid once for a pose: held, they breathe, and a breath
  // passes through the same few drawings again and again, so a pose seen
  // before (to a tenth of a degree and a hundredth of a cell) is drawn from
  // what was laid for it.
  const seen = new Map()
  const print = (p, x) => {
    let k = x.toFixed(2)
    for (const key of Object.keys(p).sort()) {
      const v = p[key]
      k += `|${Array.isArray(v) ? v.map((a) => a.toFixed(1)).join(',') : typeof v === 'number' ? v.toFixed(1) : v}`
    }
    return k
  }
  const frameAt = (t) => {
    const { him, her } = poseAt(t)
    const hx = himX(t)
    const sx = herX(t)
    const key = print(him, hx) + print(her, sx)
    const hit = seen.get(key)
    if (hit) return hit
    drawBody('him', him, hx, ground, false, SH)
    drawBody('her', her, sx, ground, true, SS)
    const cells = together(SH, SS)
    if (seen.size > 96) seen.delete(seen.keys().next().value)
    seen.set(key, cells)
    return cells
  }
  let last = null
  const at = (t) => {
    const q = Math.round(t * 4) / 4
    if (last && last.t === q) return last.f
    const f = { key: `f${q}`, cells: frameAt(q) }
    last = { t: q, f }
    return f
  }
  const times = { run: 0, slow: T_BRAKE, stop: T_PLANT, meet: T_LAND, hold: T_HOLD }
  // the hold's cells, which the mark is made of, drawn when first asked for
  let pair = null
  return {
    at, times, poseAt, himX, herX,
    heart: { x: Math.round((HX + SX) / 2), y: Math.round(ground - 36 * SCALE) },
    get pair() { if (!pair) pair = frameAt(T_HOLD); return pair },
  }
}

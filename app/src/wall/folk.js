// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE TWO OF THEM, AS BODIES                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The intro's boy and girl (pixmark.js `introStory`). They were rows of
// pixels typed by hand, a cell or two wide at every limb, and at the size a
// phone's screen gives them they read as stick figures running. So they are
// drawn the way a flip-book is drawn now: a body posed for every drawing, and
// the pose filled in, cell by cell, on the phone's own grid.
//
// A body is a handful of solid shapes: a head, a torso with a chest and a
// back, arms and legs that are thick at the shoulder and the thigh and thin
// at the wrist and the ankle, and on her a dress that flares from the waist
// and long hair that streams from the nape. Each shape is laid on the grid at
// eight samples a side, and a cell is lit when enough of it is covered, in
// the ink of whatever covers most of it. So a pose is a set of angles, and
// the in-betweens are the angles half way, drawn again: nothing snaps.
//
// ── three inks ──────────────────────────────────────────────────────────────
// What makes a silhouette a body at this size is what is in front of what.
// Their clothes and hair are the near ink. Their faces, necks and arms are a
// mid ink, so an arm swung across a shirt is seen across it, and a face is a
// face under hair and not a ball. The limbs on the far side are the far ink,
// half the near, as the old sprites' were: the legs are never mistaken for
// each other. (PixelStory.jsx draws ink 4, the mid, at seven tenths.)
//
// ── the frame of a body ─────────────────────────────────────────────────────
// Every body is drawn facing right, in cells, x forward and y up, from the
// ground under the pelvis; she is the drawing turned round. An angle is from
// straight down, forward positive: a leg at 30 has its foot ahead of it. A
// knee bends back (the shin is the thigh's angle less the knee's), an elbow
// forward. The pelvis is lifted until the lower foot is on the ground, or
// `lift` cells above it for a drawing in the air.

export const NEAR = 1
export const FAR = 2
export const MID = 4

const D = Math.PI / 180
// the way an angle points, from straight down, forward positive, y up
const way = (a) => [Math.sin(a * D), -Math.cos(a * D)]
const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k]
const lerp = (a, b, k) => a + (b - a) * k

// ── the two builds ──────────────────────────────────────────────────────────
// In cells. He is 28 tall and she is 26; her head is smaller, her limbs
// slighter, her waist narrow and her hair and hem have volume.
const HIM = {
  thigh: 7.3, shin: 7.0, heel: 0.55, toe: 2.4, foot: 0.8,
  rThigh: [1.85, 1.3], rShin: [1.25, 0.86],
  torso: 9.0, rHip: 2.2, rWaist: 2.05, rChest: 2.65, chestAt: 0.66, chestFwd: 0.45,
  neck: 1.3, rNeck: 1.0,
  head: [2.6, 2.9], headUp: 2.4,
  upper: 4.6, fore: 4.2, rUpper: [1.2, 1.0], rFore: [1.0, 0.86], hand: 1.05,
  shoulderDown: 1.15, shoulderBack: -0.25,
}
const HER = {
  thigh: 5.4, shin: 5.3, heel: 0.45, toe: 2.0, foot: 0.64,
  rThigh: [1.5, 1.1], rShin: [1.08, 0.76],
  torso: 7.1, rHip: 2.2, rWaist: 1.6, rChest: 2.15, chestAt: 0.66, chestFwd: 0.4,
  neck: 1.15, rNeck: 0.82,
  head: [2.45, 2.7], headUp: 2.25,
  upper: 4.1, fore: 3.8, rUpper: [1.02, 0.88], rFore: [0.88, 0.76], hand: 0.92,
  shoulderDown: 1.0, shoulderBack: -0.2,
}

// ── the shapes ──────────────────────────────────────────────────────────────
// A tapered capsule (a limb), an ellipse (a head, a hand), a polygon (the
// dress, the hair's crown). `clip` is a second shape a point must also be in.
// Each shape's constants are worked out once (`prep`), and a point is
// tested against a shape only inside its box: a body is laid on the grid in
// a millisecond or two, so a drawing can be made on the frame it is needed.
function prep(s) {
  if (s.box) return s
  if (s.k === 'cap') {
    s.dx = s.b[0] - s.a[0]
    s.dy = s.b[1] - s.a[1]
    s.il2 = 1 / (s.dx * s.dx + s.dy * s.dy || 1e-9)
    s.dr = s.rb - s.ra
    const r = Math.max(s.ra, s.rb)
    s.box = [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r]
  } else if (s.k === 'ell') {
    s.cs = Math.cos(s.rot * D)
    s.sn = Math.sin(s.rot * D)
    s.irx = 1 / (s.rx * s.rx)
    s.iry = 1 / (s.ry * s.ry)
    const r = Math.max(s.rx, s.ry)
    s.box = [s.c[0] - r, s.c[1] - r, s.c[0] + r, s.c[1] + r]
  } else {
    const xs = s.pts.map((q) => q[0])
    const ys = s.pts.map((q) => q[1])
    s.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }
  if (s.clip) prep(s.clip)
  return s
}
function inCap(s, x, y) {
  let t = ((x - s.a[0]) * s.dx + (y - s.a[1]) * s.dy) * s.il2
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const px = s.a[0] + s.dx * t - x
  const py = s.a[1] + s.dy * t - y
  const r = s.ra + s.dr * t
  return px * px + py * py <= r * r
}
function inEll(s, x, y) {
  const X = x - s.c[0]
  const Y = y - s.c[1]
  const u = X * s.cs + Y * s.sn
  const v = -X * s.sn + Y * s.cs
  return u * u * s.irx + v * v * s.iry <= 1
}
function inPoly(s, x, y) {
  let inside = false
  const p = s.pts
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside
  }
  return inside
}
function inside(s, x, y) {
  const b = s.box
  if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false
  const hit = s.k === 'cap' ? inCap(s, x, y) : s.k === 'ell' ? inEll(s, x, y) : inPoly(s, x, y)
  return hit && (!s.clip || inside(s.clip, x, y))
}
const cap = (a, b, ra, rb, ink, z) => ({ k: 'cap', a, b, ra, rb, ink, z })
const ell = (c, rx, ry, rot, ink, z) => ({ k: 'ell', c, rx, ry, rot, ink, z })
const poly = (pts, ink, z) => ({ k: 'poly', pts, ink, z })

// ── a limb ──
function leg(B, hip, a, knee, foot, inks, z, shoe = true) {
  const k = add(hip, way(a), B.thigh)
  const shinA = a - knee
  const ank = add(k, way(shinA), B.shin)
  // the foot points forward from the shin, flexed by `foot`
  const fa = shinA + 90 + foot
  const heel = add(ank, way(fa), -B.heel)
  const toe = add(ank, way(fa), B.toe)
  return {
    knee: k, ankle: ank, heel, toe,
    parts: [
      cap(hip, k, B.rThigh[0], B.rThigh[1], inks[0], z),
      cap(k, ank, B.rShin[0], B.rShin[1], inks[1], z),
      cap(heel, toe, B.foot, B.foot * 0.85, shoe ? inks[2] : inks[1], z + 0.01),
    ],
  }
}
function arm(B, sh, a, elbow, inks, z, hand = true) {
  const e = add(sh, way(a), B.upper)
  const w = add(e, way(a + elbow), B.fore)
  const h = add(e, way(a + elbow), B.fore + B.hand * 0.35)
  const parts = [
    cap(sh, e, B.rUpper[0], B.rUpper[1], inks[0], z),
    cap(e, w, B.rFore[0], B.rFore[1], inks[1], z),
  ]
  if (hand) parts.push(ell(h, B.hand, B.hand * 0.92, a + elbow, inks[2] ?? inks[1], z + 0.01))
  return { elbow: e, wrist: w, hand: h, parts }
}

// ── a body in a pose ────────────────────────────────────────────────────────
// Answers its parts, and where its joints ended up, in the body's own frame.
// `who` is 'him' or 'her'.
export function body(who, p) {
  const B = who === 'her' ? HER : HIM
  const parts = []
  const put = (g, ...list) => { for (const q of list) { q.g = g; parts.push(q) } }
  const leanV = [Math.sin((p.lean || 0) * D), Math.cos((p.lean || 0) * D)]
  // the legs first, from a pelvis at 0, to find the ground
  const trial = (hy) => {
    const hip = [p.dx || 0, hy]
    return [
      leg(B, hip, p.hN, p.kN, p.fN || 0, [0, 0, 0], 0),
      leg(B, hip, p.hF, p.kF, p.fF || 0, [0, 0, 0], 0),
    ]
  }
  const low = (l) => Math.min(l.heel[1], l.toe[1], l.ankle[1]) - B.foot
  const t0 = trial(0)
  const floor = Math.min(low(t0[0]), low(t0[1]))
  const hipY = -floor + (p.lift || 0)
  const hip = [p.dx || 0, hipY]
  const him = who !== 'her'
  // ── legs: near ink on the near side, far ink on the far
  const LN = leg(B, [hip[0] + 0.25, hip[1]], p.hN, p.kN, p.fN || 0, [NEAR, NEAR, NEAR], 6)
  const LF = leg(B, [hip[0] - 0.25, hip[1]], p.hF, p.kF, p.fF || 0, [FAR, FAR, FAR], 2)
  put('legN', ...LN.parts)
  put('legF', ...LF.parts)
  // ── the torso: hips, a waist, a chest that comes forward, the shoulders
  const waist = add(hip, leanV, B.torso * 0.36)
  const chest = add(add(hip, leanV, B.torso * B.chestAt), [leanV[1], -leanV[0]], B.chestFwd)
  const top = add(hip, leanV, B.torso)
  // his shirt is the near ink; her dress, bodice and skirt, is the mid, so
  // her dark hair and her arms are seen against it, and in his arms she is
  // the lighter of the two, which is the one further away
  const cloth = him ? NEAR : MID
  put('torso',
    cap(hip, waist, B.rHip, B.rWaist, cloth, 5),
    cap(waist, chest, B.rWaist, B.rChest, cloth, 5),
    cap(chest, top, B.rChest, B.rChest * 0.72, cloth, 5))
  // ── the neck and the head
  const nA = (p.lean || 0) + (p.neck || 0)
  const nV = [Math.sin(nA * D), Math.cos(nA * D)]
  const neckTop = add(top, nV, B.neck)
  put('neck', cap(add(top, nV, -0.6), neckTop, B.rNeck, B.rNeck * 0.9, NEAR, 7))
  const hA = nA + (p.nod || 0)
  const hV = [Math.sin(hA * D), Math.cos(hA * D)]
  const hc = add(add(neckTop, hV, B.headUp - 0.2), [hV[1], -hV[0]], 0.25)
  put('head', ell(hc, B.head[0], B.head[1], -hA, NEAR, 8))
  // the face: the front and lower part of the head, under the hair
  const fc = add(add(hc, [hV[1], -hV[0]], him ? 1.1 : 1.15), hV, him ? -0.45 : -0.45)
  const face = ell(fc, 2.1, him ? 2.3 : 2.25, -hA, MID, 9)
  face.clip = ell(hc, B.head[0] - 0.05, B.head[1] - 0.05, -hA, MID, 0)
  put('face', face)
  // his hair, a cap over the crown and the back of the head
  if (him) {
    const hr = ell(add(add(hc, hV, 0.55), [hV[1], -hV[0]], -0.35), B.head[0] + 0.1, B.head[1] * 0.78, -hA, NEAR, 10)
    hr.clip = { k: 'poly', pts: halfPlane(hc, hA, 0.2, -0.25) }
    put('hair', hr)
  }
  // ── the shoulders and the arms: near ink, with the hand in the mid
  const back = [-leanV[1], leanV[0]]
  const sh = add(add(top, leanV, -B.shoulderDown), back, -B.shoulderBack)
  const AF = arm(B, add(sh, back, 0.2), p.sF, p.eF, [FAR, FAR, FAR], 1, p.handF !== false)
  const AN = arm(B, add(sh, back, -0.1), p.sN, p.eN, [NEAR, NEAR, MID], 12, p.handN !== false)
  if (p.armF !== false) put('armF', ...AF.parts)
  if (p.armN !== false) put('armN', ...AN.parts)
  // ── hers: the hair and the dress
  const joints = { hip, waist, chest, top, sh, hc, neckTop, LN, LF, AN, AF, hV, leanV }
  if (!him) {
    put('tail', ...hairOf(p, joints))
    for (const q of parts) if (q.g === 'tail' && q.z >= 10) q.g = 'hair'
    put('dress', ...dressOf(B, p, joints))
  }
  return { parts, joints }
}

// the half of the plane behind and above a line through the head, for the
// hair: `up` and `back` move the line, in cells, along the head's own axes
function halfPlane(hc, hA, up, back) {
  const v = [Math.sin(hA * D), Math.cos(hA * D)]
  const f = [v[1], -v[0]]
  // a line running from low at the back to high at the front, so the hair
  // comes down to the nape behind and stops at the brow in front
  const o = add(add(hc, v, up), f, back)
  const d = add(f, v, 0.55)
  const L = 40
  const a = add(o, d, -L)
  const b = add(o, d, L)
  // the side the crown is on
  const n = [-d[1], d[0]]
  return [a, b, add(b, n, L), add(a, n, L)]
}

// Her hair: a crown fuller than the head, and a tail from the nape in
// four pieces, each at its own angle (`p.hair`, from straight down, forward
// positive, so a tail streaming behind her runs at about -70).
function hairOf(p, j) {
  const { hc, hV } = j
  const f = [hV[1], -hV[0]]
  const hA = Math.atan2(hV[0], hV[1]) / D
  const out = []
  // the crown, fuller than the head, down to the brow in front
  const crown = ell(add(add(hc, hV, 0.3), f, -0.4), 2.75, 2.75, -hA, NEAR, 10)
  crown.clip = { k: 'poly', pts: halfPlane(hc, hA, 0.75, -0.2) }
  out.push(crown)
  // the back of the head, full to the nape, where the tail leaves from
  out.push(ell(add(add(hc, hV, 0.05), f, -1.2), 1.7, 2.45, -hA, NEAR, 10))
  const hair = p.hair || [-4, -2, 0, 3]
  const len = [2.4, 2.9, 2.9, 2.5]
  const rad = [1.35, 1.6, 1.45, 1.05, 0.45]
  let at = add(add(hc, hV, -0.2), f, -2.0)
  hair.forEach((a, i) => {
    const nx = add(at, way(a), len[i])
    out.push(cap(at, nx, rad[i], rad[i + 1], NEAR, 3))
    at = nx
  })
  return out
}

// Her dress: a bodice (the torso, already near ink) and a skirt from the
// waist, a bell that flares to the hem. `p.skirt` swings the whole of it
// about the waist (negative: blown back), `p.flare` opens the hem wider, and
// the knee that comes forward carries the front of the hem with it.
function dressOf(B, p, j) {
  const { hip, waist, leanV, LN, LF } = j
  const sw = (p.skirt || 0) + (p.lean || 0) * 0.35
  const down = way(sw)
  const fwd = [-down[1], down[0]]
  const L = 7.0
  const flare = 4.0 + (p.flare || 0)
  const w = B.rWaist + 0.15
  const back = [-leanV[1], leanV[0]]
  const wb = add(waist, back, w)
  const wf = add(waist, back, -w)
  const hipB = add(add(hip, back, B.rHip + 0.45), down, 0.3)
  const hipF = add(add(hip, back, -(B.rHip + 0.35)), down, 0.3)
  const base = add(waist, down, L)
  let hemB = add(add(base, fwd, -flare), down, -(p.lift_b || 0))
  let hemF = add(add(base, fwd, flare), down, -(p.lift_f || 0))
  // a knee lifted forward pushes the hem out in front of it
  for (const l of [LN, LF]) {
    const k = l.knee
    if (k[1] > hemF[1] - 1.2 && k[0] + 1.3 > hemF[0]) hemF = [k[0] + 1.3, Math.min(hemF[1], k[1] - 1.1)]
    if (k[1] > hemB[1] - 1.2 && k[0] - 1.3 < hemB[0]) hemB = [k[0] - 1.3, Math.min(hemB[1], k[1] - 1.1)]
  }
  const mid = add(base, down, 0.35)
  return [poly([wb, hipB, hemB, add(lerpP(hemB, mid, 0.5), down, 0.25), mid, add(lerpP(mid, hemF, 0.5), down, 0.25), hemF, hipF, wf], MID, 7)]
}
const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]

// ── on the grid ─────────────────────────────────────────────────────────────
// The body's frame laid on the grid with its ground under row `gy` - 1 and
// its pelvis over column `gx`, turned round when it faces left. Answers a
// map of cell index (y * 1000 + x) to ink. Eight samples a side; a cell is
// lit when `T` of it is covered, and takes the ink of the frontmost shape at
// most of its covered samples.
const S = 6
export function raster(parts, gx, gy, flip = false, T = 0.4) {
  return inks(cellsOf(parts, gx, gy, flip, T))
}
// the same, keeping which part each cell is (`g`) and how near it is (`z`),
// for laying one body over another
export function cellsOf(parts, gx, gy, flip = false, T = 0.4) {
  const list = [...parts].sort((a, b) => b.z - a.z)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of list) {
    const b = prep(s).box
    x0 = Math.min(x0, b[0])
    y0 = Math.min(y0, b[1])
    x1 = Math.max(x1, b[2])
    y1 = Math.max(y1, b[3])
  }
  const out = new Map()
  const count = new Int32Array(list.length)
  const need = T * S * S
  const row = []
  const cand = []
  // the body's cells, in its own frame: column i covers x in [i, i + 1) and
  // row j covers y in [j, j + 1) (y up)
  for (let j = Math.floor(y0); j < Math.ceil(y1); j++) {
    row.length = 0
    for (let q = 0; q < list.length; q++) { const b = list[q].box; if (b[1] < j + 1 && b[3] > j) row.push(q) }
    if (!row.length) continue
    for (let i = Math.floor(x0); i < Math.ceil(x1); i++) {
      cand.length = 0
      for (const q of row) { const b = list[q].box; if (b[0] < i + 1 && b[2] > i) cand.push(q) }
      if (!cand.length) continue
      for (const q of cand) count[q] = 0
      let hit = 0
      for (let sy = 0; sy < S; sy++) {
        const y = j + (sy + 0.5) / S
        for (let sx = 0; sx < S; sx++) {
          const x = i + (sx + 0.5) / S
          for (const q of cand) {
            if (inside(list[q], x, y)) { count[q]++; hit++; break }
          }
        }
      }
      if (hit < need) continue
      // the ink of what covers most of it; the nearer of two that tie
      let best = -1
      for (const q of cand) if (best < 0 || count[q] > count[best]) best = q
      const s = list[best]
      // grid: x forward from the pelvis column, turned round for her; the
      // body's row j (y from j to j + 1 above the ground) is grid row gy - 1 - j
      const X = flip ? gx - 1 - i : gx + i
      const Y = gy - 1 - j
      out.set(Y * 1000 + X, { ink: s.ink, g: s.g, z: s.z })
    }
  }
  return tidy(out)
}
export const inks = (m) => new Map([...m].map(([k, c]) => [k, c.ink]))

// The near arm is the same ink as the body it swings across, so where it
// crosses the body the body is drawn a cell lighter all round it: the arm is
// cut out of the shirt by its own outline, as a hand would ink it.
const CARVE = new Set(['armN'])
export function carve(m, front = CARVE) {
  const light = []
  for (const [key, c] of m) {
    if (!front.has(c.g)) continue
    const x = key % 1000
    const y = Math.floor(key / 1000)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const n = m.get((y + dy) * 1000 + x + dx)
        if (n && n.ink === NEAR && !front.has(n.g) && n.z < c.z) light.push(n)
      }
    }
  }
  for (const n of light) n.ink = MID
  return m
}

// A lone lit cell with nothing lit round it is noise the sampling left, and
// an unlit cell with lit cells on all four sides is a hole it left: both
// are put right.
function tidy(m) {
  const at = (x, y) => m.get(y * 1000 + x)
  const adds = []
  const dels = []
  for (const [key] of m) {
    const x = key % 1000
    const y = Math.floor(key / 1000)
    let n = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy)) n++
    if (n === 0) dels.push(key)
    // and the four round it, for a hole
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const hx = x + dx
      const hy = y + dy
      if (at(hx, hy)) continue
      const ring = [at(hx + 1, hy), at(hx - 1, hy), at(hx, hy + 1), at(hx, hy - 1)]
      if (ring.every(Boolean)) adds.push([hy * 1000 + hx, ring.reduce((a, b) => (b.z > a.z ? b : a))])
    }
  }
  for (const k of dels) m.delete(k)
  for (const [k, c] of adds) m.set(k, { ...c })
  return m
}

// ── poses ───────────────────────────────────────────────────────────────────
// A pose between two, `k` of the way: every angle half way, so an in-between
// is the two poses' in-between and not a cross-fade of their cells.
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

// ── the run ──
// Eight drawings a stride pair, four for each foot: CONTACT, the front heel
// reaching the ground; DOWN, the weight on it and the knee giving; PASS, the
// stance leg driving back as the other knee comes through high; and FLIGHT,
// both feet off the floor. The second four are the first with the legs and
// arms traded. Her hair is a drawing late, the way hair is: it is still
// lifting when she comes down and still falling as she rises.
const RUN_HIM = [
  { lean: 14, neck: -6, lift: 0, hN: 34, kN: 14, fN: -8, hF: -22, kF: 62, fF: 10, sN: -62, eN: 64, sF: 44, eF: 96 },
  { lean: 12, neck: -6, lift: 0, hN: 10, kN: 34, fN: 0, hF: -20, kF: 104, fF: 16, sN: -34, eN: 76, sF: 22, eF: 94 },
  { lean: 15, neck: -7, lift: 0.4, hN: -26, kN: 14, fN: 14, hF: 36, kF: 88, fF: 0, sN: 20, eN: 92, sF: -30, eF: 72 },
  { lean: 15, neck: -6, lift: 1.3, hN: -30, kN: 50, fN: 18, hF: 50, kF: 36, fF: -4, sN: 44, eN: 98, sF: -58, eF: 66 },
]
const RUN_HER = [
  { lean: 11, neck: -4, lift: 0, hN: 30, kN: 14, fN: -6, hF: -20, kF: 70, fF: 12, sN: -56, eN: 66, sF: 40, eF: 92, hair: [-30, -48, -62, -72], skirt: -12, flare: 0.5 },
  { lean: 9, neck: -4, lift: 0, hN: 8, kN: 32, fN: 0, hF: -18, kF: 110, fF: 18, sN: -30, eN: 76, sF: 20, eF: 90, hair: [-24, -40, -58, -74], skirt: -8, flare: 0.3 },
  { lean: 12, neck: -5, lift: 0.4, hN: -24, kN: 16, fN: 14, hF: 34, kF: 92, fF: 0, sN: 20, eN: 90, sF: -28, eF: 70, hair: [-34, -50, -60, -66], skirt: -14, flare: 0.6 },
  { lean: 12, neck: -4, lift: 1.2, hN: -28, kN: 56, fN: 18, hF: 46, kF: 40, fF: -4, sN: 40, eN: 94, sF: -54, eF: 64, hair: [-40, -56, -64, -66], skirt: -16, flare: 0.8 },
]
// the same drawing with the near and far sides traded
function trade(p) {
  return { ...p, hN: p.hF, kN: p.kF, fN: p.fF, hF: p.hN, kF: p.kN, fF: p.fN, sN: p.sF, eN: p.eF, sF: p.sN, eF: p.eN }
}
export function runPose(who, i) {
  const set = who === 'her' ? RUN_HER : RUN_HIM
  const f = ((i % 8) + 8) % 8
  return f < 4 ? set[f] : trade(set[f - 4])
}

// ── the meeting ─────────────────────────────────────────────────────────────
// He slows over his last strides, the stride shortening and the body coming
// up out of the lean, and stops with his arms open. She does not slow: she
// comes down on her last step, and what carries her on is her own run. Her
// body goes on over the foot she landed on, leaning the way she was running,
// into him, gently: a lean and not a dip. Her other foot comes up behind
// her, her hair, which was streaming back, swings on past her and falls,
// and her hem swings forward and settles. She ends up on the far side of
// him, her face in his neck and her arm round his back, so she is drawn
// behind him and only what is past him is seen of her: the back of her
// head, her hair down her back, her dress, the foot. His near arm is round
// her, across her back, in front. He takes her weight by rocking back a
// little, and comes forward again as she settles, his head bowed to hers.
//
// In her frame forward is toward him, so her lean, like her run, is forward.
const OPEN = { lean: 1, neck: -6, hN: 10, kN: 6, fN: 0, hF: -10, kF: 8, fF: 4, sN: 92, eN: 16, sF: 116, eF: 10 }
const HIM_MEET = [
  { lean: 3, neck: -2, dx: 0, hN: 12, kN: 8, hF: -11, kF: 8, fF: 4, sN: 80, eN: -6, sF: 96, eF: -10, armF: false },
  { lean: -4, neck: 4, dx: -0.35, hN: 13, kN: 12, hF: -10, kF: 10, fF: 4, sN: 52, eN: 40, armF: false },
  { lean: -5, neck: 8, nod: 3, dx: -0.4, hN: 12, kN: 10, hF: -10, kF: 9, fF: 4, sN: 36, eN: 50, armF: false },
  { lean: -3, neck: 10, nod: 5, dx: -0.25, hN: 10, kN: 8, hF: -9, kF: 7, fF: 3, sN: 28, eN: 54, armF: false },
  { lean: -1, neck: 12, nod: 7, dx: -0.1, hN: 9, kN: 6, hF: -9, kF: 6, fF: 3, sN: 24, eN: 56, armF: false },
]
const HOLD_HIM = { lean: -2, neck: 13, nod: 8, dx: 0, hN: 9, kN: 6, fN: 0, hF: -9, kF: 6, fF: 3, sN: 22, eN: 56, sF: 60, eF: -40, armF: false }
const BREATH_HIM = { ...HOLD_HIM, lean: -0.6, neck: 15, nod: 9, lift: 0.3 }
const HER_MEET = [
  // she lands on her far foot, the near one trailing, arms going round him
  { lean: 15, neck: -2, dx: -3.4, hF: 18, kF: 10, fF: -4, hN: -30, kN: 62, fN: 14, sN: 96, eN: 24, sF: 100, eF: 20, hair: [-36, -52, -62, -68], skirt: -14, flare: 0.6 },
  // her body goes on over it, the near heel coming up
  { lean: 16, neck: 0, dx: -2.1, hF: 4, kF: 6, fF: 0, hN: -26, kN: 84, fN: 18, sN: 112, eN: 24, sF: 116, eF: 20, hair: [-22, -34, -44, -50], skirt: -6, flare: 0.5 },
  // the most of it: past the foot, the heel up behind her, the hair falling
  // through and the hem swung forward
  { lean: 14, neck: 3, dx: -1.3, hF: -6, kF: 4, fF: 2, hN: -22, kN: 100, fN: 22, sN: 120, eN: 24, sF: 122, eF: 20, armN: false, armF: false, hair: [-8, -4, 2, 8], skirt: 9, flare: 0.5 },
  // and back a little, the hair swinging back past straight down
  { lean: 12.5, neck: 5, dx: -0.8, hF: -8, kF: 5, fF: 2, hN: -20, kN: 104, fN: 22, sN: 122, eN: 22, sF: 124, eF: 20, armN: false, armF: false, hair: [-6, -2, 2, 6], skirt: 4, flare: 0.4 },
  { lean: 11.5, neck: 6, dx: -0.55, hF: -9, kF: 5, fF: 2, hN: -20, kN: 106, fN: 22, sN: 122, eN: 22, sF: 124, eF: 20, armN: false, armF: false, hair: [-16, -15, -12, -8], skirt: -2, flare: 0.35 },
]
const HOLD_HER = { lean: 11, neck: 6, dx: -0.5, hF: -9, kF: 5, fF: 2, hN: -20, kN: 106, fN: 22, sN: 122, eN: 22, sF: 124, eF: 20, armN: false, armF: false, hair: [-17, -16, -13, -9], skirt: 0, flare: 0.3 }
const BREATH_HER = { ...HOLD_HER, lean: 11.8, neck: 7, hN: -22, kN: 110, hair: [-16, -15, -11, -6], lift: 0.25 }

// the drawing rate: sixteen a second
export const STEP = 62.5

// A body's cells in the story's frame: turned round for her, and placed
// with its pelvis over column `x`, which may be between two columns while it
// travels. The drawing is made on the whole column and moved the rest of the
// way whole, so it slides between the panel's cells and does not shimmer.
const HOME = 500
function drawn(who, pose, ground, flip) {
  return cellsOf(body(who, pose).parts, HOME, ground, flip)
}
function placed(who, pose, x, ground, flip) {
  return { m: shift(drawn(who, pose, ground, flip), Math.round(x) - HOME) }
}
// a drawing moved along its row by whole cells
function shift(m, dx) {
  const out = new Map()
  for (const [k, c] of m) out.set(k + dx, c)
  return out
}

// Him in front of her: where he is, she is not seen, and where her dark
// is against his dark (her hair at his head, her hand at his back) she is
// kept a cell clear of him, the air that makes them two people.
function together(him, her) {
  const out = new Map(her)
  for (const [k] of him) {
    const x = k % 1000
    const y = Math.floor(k / 1000)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (y + dy) * 1000 + x + dx
      if (him.has(n)) continue
      const c = out.get(n)
      if (c && c.ink === NEAR && him.get(k).ink === NEAR) out.set(n, { ...c, ink: MID })
    }
  }
  for (const [k, c] of him) out.set(k, c)
  // and his near arm across her back is cut out of her hair by its own
  // outline, in her dress's light, so the arm round her is seen round her
  for (const [k, c] of him) {
    if (c.g !== 'armN') continue
    const x = k % 1000
    const y = Math.floor(k / 1000)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const n = (y + dy) * 1000 + x + dx
        if (him.has(n)) continue
        const o = out.get(n)
        if (o && o.ink === NEAR) out.set(n, { ...o, ink: MID })
      }
    }
  }
  return out
}

const list = (m, frac = 0) => [...m].map(([k, c]) => [(k % 1000) + frac, Math.floor(k / 1000), c.ink])

// ── the intro, from the run to the hold ─────────────────────────────────────
// `start` is when they set off, `ground` the row under their feet and `mid`
// the column the two of them are centred on. Drawing n is the (n+1)th of
// the story: from 0 they run, from 11 he slows, at 14 he stands with his
// arms open, at 16 she lands in them, and from 21 they hold each other.
// Answers `at(t)` (a key and the cells), `times`, the hold's cells (`pair`)
// and where they hold each other (`heart`), where the pink leaves from.
export function introFolk({ start = 180, ground = 38, mid = 28 } = {}) {
  const HX = mid - 4
  const SX = HX + 7
  const SLOW = 11
  const STOP = 14
  const MEET = 16
  const HOLD = MEET + HER_MEET.length
  const tOf = (n) => start + n * STEP
  // she runs at an even pace, two and three quarter cells a drawing, and
  // lands a drawing's run from where her lean takes her
  const V = 2.75 / STEP
  const herX = (t) => SX - HER_MEET[0].dx + V * (tOf(MEET) - t)
  // he runs a little faster, then brakes evenly from SLOW to STOP
  const brake = tOf(STOP) - tOf(SLOW)
  const VH = 3.0 / STEP
  const himX = (t) => {
    if (t >= tOf(STOP)) return HX
    if (t >= tOf(SLOW)) {
      const r = tOf(STOP) - t
      return HX - (VH * r * r) / (2 * brake)
    }
    return HX - (VH * brake) / 2 - VH * (tOf(SLOW) - t)
  }
  const cache = new Map()
  const memo = (key, make) => {
    let v = cache.get(key)
    if (!v) { v = make(); cache.set(key, v) }
    return v
  }
  // the phase each runs on: her last stride before she lands is a flight
  // onto her far foot (runPose 3, then the traded contact)
  const HP = 0
  const SP = 4
  const himPose = (n) => {
    if (n >= MEET) return HIM_MEET[n - MEET]
    if (n >= STOP) return n === STOP ? OPEN : { ...OPEN, sN: 66, eN: 32, sF: 90, eF: 22, neck: -6 }
    const run = runPose('him', n + HP)
    if (n < SLOW) return run
    const k = (n - SLOW + 1) / (STOP - SLOW + 1)
    return mixPose(run, OPEN, k * k * (3 - 2 * k))
  }
  const herPose = (n) => (n >= MEET ? HER_MEET[n - MEET] : runPose('her', n + SP))
  // held, they breathe: once every 1100ms, in and out, drawn at the same
  // sixteen a second; most drawings of it are a cell's difference or none
  const breath = (t) => (1 - Math.cos((2 * Math.PI * Math.max(0, t - tOf(HOLD))) / 1100)) / 2
  const holdOf = (k) => {
    const q = Math.round(k * 6) / 6
    return memo(`hold${q}`, () => {
      const him = placed('him', mixPose(HOLD_HIM, BREATH_HIM, q), HX, ground, false).m
      const her = placed('her', mixPose(HOLD_HER, BREATH_HER, q), SX, ground, true).m
      return { key: `H${q}`, cells: list(together(him, her)) }
    })
  }
  const at = (t) => {
    if (t < start) return { key: '-', cells: [] }
    const n = Math.floor((t - start) / STEP)
    if (n >= HOLD) return holdOf(breath(t))
    if (n >= MEET) {
      return memo(`M${n}`, () => {
        const him = placed('him', himPose(n), HX, ground, false).m
        const her = placed('her', herPose(n), SX, ground, true).m
        return { key: `M${n}`, cells: list(together(him, her)) }
      })
    }
    // running: each drawing made once, and slid to where the clock has
    // them, a hundredth of a cell at a time
    const hx = Math.round(himX(t) * 100) / 100
    const sx = Math.round(herX(t) * 100) / 100
    const a = memo(`h${n}`, () => drawn('him', himPose(n), ground, false))
    const b = memo(`s${n}`, () => drawn('her', herPose(n), ground, true))
    return { key: `r${n}|${hx}|${sx}`, cells: [...list(b, sx - HOME), ...list(a, hx - HOME)] }
  }
  const layers = (k = 0) => ({
    him: list(placed('him', mixPose(HOLD_HIM, BREATH_HIM, k), HX, ground, false).m),
    her: list(placed('her', mixPose(HOLD_HER, BREATH_HER, k), SX, ground, true).m),
  })
  const times = { run: start, slow: tOf(SLOW), stop: tOf(STOP), meet: tOf(MEET), hold: tOf(HOLD) }
  // the hold's cells, which the mark is made of, drawn when first asked for
  // and not when the module is read
  return { at, times, layers, heart: { x: HX + 3, y: ground - 21 }, get pair() { return holdOf(0).cells } }
}

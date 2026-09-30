// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE RIG: the two of them as bodies in the round                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The owner saw the tellings' people as cut-outs, and then as mannequins.
// So they are sculpted: bodies in three dimensions and in centimetres, the
// proportions of real people (he is 180, she is 165), and what is on the
// glass is their silhouette from wherever the camera is. A head that turns
// shows its profile because the brow, the nose, the lips and the chin are
// there, at the heights a face has them; a shoulder rolling toward the
// camera widens because it is nearer.
//
// ── a body ──────────────────────────────────────────────────────────────────
// A skeleton (the pelvis, two joints of the spine, the neck, the head, the
// arms from the shoulders and the legs from the hips), posed by angles; a
// limb either reaches for a point (`ik`, the elbow or the knee found as a
// real one is) or is set joint by joint (`fk`, which is how a gait is
// written down). On the skeleton, the surface, as a sculptor's sections:
//   the torso      cross-sections from the seat to the base of the neck,
//                  each riding the bone it is on, so the back bends
//   the limbs      sections along each bone: the thigh full at the top, the
//                  knee, the calf, the ankle; the deltoid, the biceps, the
//                  forearm, the wrist; the hand, and a thumb
//   the neck       sections from the shoulders to under the skull, the top
//                  ones turning with the head
//   the head       horizontal sections, chin to crown, each built from the
//                  profile at that height (how far forward the face is, and
//                  how far the midline stands proud of the cheeks, which is
//                  the nose, the lips, the chin), the back of the skull and
//                  the width; and the hair over it
// Between each two sections the surface is the hull of the two, which is
// exactly its shadow; the whole silhouette is those, laid as one (kit.js
// `Pad.union`).
//
// ── what hangs from it ──────────────────────────────────────────────────────
// Hair is strands, chains of points that fall and swing and are pushed off
// the head, the neck and the back (`chains`); a skirt is a ring of them,
// held at the waist and kept apart, which the legs push (`cloth`). Both are
// worked out once, a few milliseconds a step, and read back at any moment.

import { clamp, lerp, sm5 } from './kit.js'

const D = Math.PI / 180

// ── vectors and turns ───────────────────────────────────────────────────────
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
}
// 3 by 3, by rows
export function mm(A, B) {
  const o = new Array(9)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]
  }
  return o
}
export const mv = (A, v) => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
  A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
]
const rx = (a) => { const c = Math.cos(a); const s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c] }
const ry = (a) => { const c = Math.cos(a); const s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c] }
const rz = (a) => { const c = Math.cos(a); const s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1] }
// A joint's turn, in degrees, in the body's own frame (x to its left, y up,
// z the way it faces): `yaw` round to its left, then `pitch` bowing
// forward, then `roll` leaning to its right.
export const turn = (pitch = 0, yaw = 0, roll = 0) => mm(mm(ry(yaw * D), rx(pitch * D)), rz(roll * D))
// the turn whose columns are x, y, z
const axes = (x, y, z) => [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]
const col = (R, i) => [R[i], R[3 + i], R[6 + i]]
const child = (f, off, R) => ({ p: V.add(f.p, mv(f.R, off)), R: R ? mm(f.R, R) : f.R })
// a point in a frame
export const at = (F, p) => V.add(F.p, mv(F.R, p))

// a bone's frame, running from `a` down to `b` (its -y), its front (z) as
// near `front` as is square to it
function along(a, b, front, fallback) {
  const y = V.norm(V.sub(a, b))
  let z = V.sub(front, V.mul(y, V.dot(front, y)))
  if (V.len(z) < 0.2) z = V.sub(fallback, V.mul(y, V.dot(fallback, y)))
  z = V.norm(z)
  return axes(V.cross(y, z), y, z)
}

// Two bones, `l1` then `l2`, from `a` reaching for `t`, the joint between
// them bending toward `pole`: where the joint is, and where the end got to
// (short of `t` if `t` is out of reach). Near the end of its reach a limb is
// let straighten softly, as a real one does, rather than snapping straight
// (the reach eases toward its length over the last 1.5% of it): a hand or a
// foot at the end of its reach then falls a little short, and an elbow or a
// knee never jumps.
export function ik(a, t, l1, l2, pole) {
  const d = V.sub(t, a)
  const u = V.norm(d)
  const L = l1 + l2
  const soft = 0.015 * L
  let dist = V.len(d)
  if (dist > L - soft) dist = L - soft * Math.exp(-(dist - (L - soft)) / soft)
  dist = clamp(dist, Math.abs(l1 - l2) + 0.05, L - 0.001)
  const ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
  const sa = Math.sqrt(Math.max(0, 1 - ca * ca))
  let p = V.sub(pole, V.mul(u, V.dot(pole, u)))
  if (V.len(p) < 1e-4) p = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1]
  p = V.norm(p)
  return { mid: V.add(a, V.add(V.mul(u, ca * l1), V.mul(p, sa * l1))), end: V.add(a, V.mul(u, dist)) }
}

// ── the heads ───────────────────────────────────────────────────────────────
// Each head is written down as it is measured: at each height over the
// chin (`y`, cm), how far forward the face is on the midline (`zf`, from
// the ear), how far the midline stands proud of the cheeks there (`pr`:
// the nose, the lips, the chin), where the back of the head is (`zb`), its
// half-width (`w`), and how much the front of the section narrows (`tp`:
// the chin to a point, the forehead hardly). The thirds are a face's: chin
// to the base of the nose, the nose to the bridge, the bridge to the
// hairline; the mouth a third of the way down the lowest; the nose's tip a
// little over a centimetre above its base and two in front of it; the eyes
// just under the bridge; his brow standing out over it, hers softer.
const HER_FACE = {
  y: [0.0, 0.7, 1.3, 2.0, 2.7, 3.2, 3.7, 4.15, 4.7, 5.2, 5.7, 6.2, 6.8, 7.4, 8.1, 9.0, 10.0, 11.2, 12.2, 13.4, 14.8, 16.2, 17.6, 18.9, 20.0, 21.0, 21.6, 22.0],
  zf: [6.1, 7.5, 8.3, 8.25, 8.05, 8.4, 9.05, 8.85, 9.35, 9.4, 9.15, 8.85, 9.9, 10.8, 10.35, 9.95, 9.5, 9.1, 9.55, 9.45, 9.2, 8.75, 7.9, 6.7, 5.2, 3.3, 1.8, 0.4],
  pr: [0.2, 0.5, 0.8, 0.8, 0.8, 0.9, 1.3, 1.1, 1.4, 1.4, 1.2, 1.0, 2.0, 2.8, 2.3, 1.8, 1.2, 0.7, 0.8, 0.4, 0.2, 0.1, 0, 0, 0, 0, 0, 0],
  zb: [4.8, 4, 3.2, 2.2, 1.2, 0.4, -0.5, -1.4, -2.6, -3.8, -4.9, -5.75, -6.31, -6.67, -7.01, -7.4, -7.9, -8.35, -8.65, -8.85, -8.9, -8.7, -8.1, -7.1, -5.7, -3.8, -2.7, -0.7],
  w: [1.36, 2.33, 3.01, 3.69, 4.17, 4.46, 4.75, 4.95, 5.19, 5.43, 5.63, 5.77, 5.92, 6.06, 6.21, 6.35, 6.45, 6.6, 6.79, 6.94, 7.03, 6.98, 6.69, 6.01, 5.04, 3.69, 2.33, 0.87],
  tp: [0.5, 0.5, 0.48, 0.45, 0.42, 0.38, 0.34, 0.3, 0.27, 0.24, 0.21, 0.19, 0.17, 0.15, 0.13, 0.12, 0.11, 0.1, 0.1, 0.11, 0.13, 0.15, 0.17, 0.2, 0.2, 0.2, 0.2, 0.2],
  pivot: [5.2, -1.2],
  hairline: 16.2,
}
const HIM_FACE = {
  y: [0.0, 0.8, 1.5, 2.2, 3.0, 3.5, 4.0, 4.5, 5.1, 5.7, 6.2, 6.7, 7.3, 7.9, 8.7, 9.7, 10.8, 12.0, 13.1, 14.4, 15.9, 17.4, 18.9, 20.3, 21.5, 22.5, 23.2, 23.6],
  zf: [6.4, 8.0, 9.0, 9.0, 8.55, 8.85, 9.5, 9.25, 9.8, 9.75, 9.45, 9.1, 10.3, 11.6, 11.05, 10.5, 9.95, 9.35, 10.25, 10.0, 9.5, 8.7, 7.6, 6.2, 4.6, 2.9, 1.4, 0.3],
  pr: [0.2, 0.6, 1.0, 1.0, 0.8, 0.9, 1.3, 1.1, 1.3, 1.3, 1.1, 0.9, 2.2, 3.2, 2.7, 2.1, 1.4, 0.8, 1.2, 0.5, 0.2, 0.1, 0, 0, 0, 0, 0, 0],
  zb: [5.2, 4.3, 3.4, 2.3, 1.1, 0.3, -0.6, -1.6, -2.9, -4.2, -5.3, -6.2, -6.9, -7.5, -8.1, -8.7, -9.2, -9.65, -9.95, -10.15, -10.15, -9.9, -9.3, -8.2, -6.7, -4.8, -2.8, -0.7],
  w: [1.6, 2.8, 3.6, 4.4, 5.0, 5.3, 5.6, 5.8, 6.0, 6.15, 6.3, 6.45, 6.6, 6.75, 6.9, 7.0, 7.1, 7.25, 7.4, 7.55, 7.65, 7.6, 7.3, 6.6, 5.6, 4.1, 2.6, 0.9],
  tp: [0.45, 0.45, 0.42, 0.38, 0.33, 0.3, 0.27, 0.24, 0.22, 0.2, 0.18, 0.16, 0.15, 0.14, 0.13, 0.12, 0.11, 0.1, 0.1, 0.11, 0.12, 0.14, 0.16, 0.18, 0.2, 0.2, 0.2, 0.2],
  pivot: [5.6, -1.3],
  hairline: 18.9,
}
const RING = 18
// one section of a head, in the head's frame (the pivot its origin)
function section(y, zf, pr, zb, w, tp, pivot) {
  const Y = y - pivot[0]
  const zF = zf - pivot[1]
  const zB = zb - pivot[1]
  const zFace = zF - pr
  const zc = zB + (zFace - zB) * 0.45
  const pts = []
  for (let k = 0; k < RING; k++) {
    const a = (k / RING) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const z = c >= 0 ? zc + (zFace - zc) * c : zc + (zc - zB) * c
    pts.push([w * s * (c > 0 ? 1 - tp * c * c : 1), Y, z])
  }
  if (pr > 0.05) {
    const n = Math.min(1.1, w * 0.28)
    pts.push([0, Y, zF], [n, Y, zF - pr * 0.55], [-n, Y, zF - pr * 0.55])
  }
  return pts
}
function faceRings(F) {
  return F.y.map((y, i) => section(y, F.zf[i], F.pr[i], F.zb[i], F.w[i], F.tp[i], F.pivot))
}
// Hair over a head: over the crown `top` thick, over the back of the skull
// `back`, at the sides `side`; at the sides down to `from` cm over the chin
// (above the ears, or over them), and at the back on down to `nape`, behind
// the ears only; in front, down to the hairline, and below it back to
// `temple` (how far in front of the ear the hair comes at `from`), so the
// face is left bare.
function hairRings(F, { from, nape = from, back, side, top, temple, front = 0.7, behind = -2.5 }) {
  const out = []
  const fz = (y) => {
    const i = F.y.findIndex((v) => v >= y)
    if (i <= 0) return F.zf[0]
    const k = (y - F.y[i - 1]) / (F.y[i] - F.y[i - 1])
    return lerp(F.zf[i - 1], F.zf[i], k)
  }
  const atLine = fz(F.hairline) + front
  const yTop = F.y[F.y.length - 1]
  F.y.forEach((y, i) => {
    if (y < nape) return
    const up = sm5((y - (yTop - 6)) / 6)
    const Y = y + up * top * 0.5
    const b = F.zb[i] - back * (0.6 + 0.4 * up)
    if (y < from) {
      const k = sm5((y - nape) / Math.max(0.01, from - nape))
      out.push(section(Y, lerp(behind - 2.5, behind, k), 0, b, F.w[i] * lerp(0.62, 0.9, k) + side * k, 0.12, F.pivot))
      return
    }
    const zfH = y >= F.hairline ? F.zf[i] + front : lerp(temple, atLine, sm5((y - from) / (F.hairline - from)))
    out.push(section(Y, zfH, 0, b, F.w[i] + side * (0.5 + 0.5 * up), 0.12, F.pivot))
  })
  out.push(section(yTop + top, 0.2, 0, -2.2, 1.6, 0.1, F.pivot))
  return out
}

// ── the builds ──────────────────────────────────────────────────────────────
// In centimetres, standing. Each joint is placed from the one it hangs off;
// the shoulders and the hips either side. The torso's sections are [bone
// (0 the pelvis, 1 the waist, 2 the chest), height on it, half-width,
// half-depth, how far forward]; a limb's are [how far down the bone, half
// its width across, half its depth front to back, how far forward], the
// front being the way the knee or the chest faces. `parts` are shapes on a
// bone besides (`e` an ellipsoid: its middle, its radii, a turn of its own).
const e = (c, r, rot) => ({ k: 'e', c, r, rot: rot ? turn(...rot) : null })
const s = (c, r) => ({ k: 's', c, r })

export const HIM = {
  who: 'him',
  root: 96, hip: [9, -2, 0.5], thigh: 42.5, shin: 43.5, ankle: 8, heel: 5, ball: 14,
  spine1: [0, 11, -1.5], spine2: [0, 14, -1], neck: [0, 28, -4.5], head: [0, 10, 2.8],
  shoulder: [18.5, 23.5, -3.2], upper: 30.5, fore: 26, handLen: 19,
  // in a jacket
  torso: [
    [0, -13, 15.6, 11.8, -2.2], [0, -7, 16.8, 12.4, -1.8], [0, 0, 16.2, 11.6, -0.8], [0, 7, 15.3, 10.7, 0.2],
    [1, 6, 15.1, 10.5, 0.8], [2, 2, 15.7, 11.1, 1.4], [2, 10, 16.9, 12.0, 1.8], [2, 17, 17.9, 12.2, 1.2],
    [2, 23.2, 18.8, 11.0, -0.6], [2, 25.4, 17.8, 9.8, -1.8], [2, 27.2, 14.8, 8.9, -2.8], [2, 28.8, 10.8, 7.8, -3.4],
    [2, 30.0, 7.8, 7.0, -3.6],
  ],
  neckRings: [['neck', -1.5, 6.4, 6.4, 1.8], ['neck', 3.5, 6.0, 6.1, 2.4], ['neck', 7.5, 5.8, 5.9, 2.9], ['head', -4.0, 5.6, 6.0, 1.3], ['head', -1.2, 5.4, 5.8, 0.6]],
  limbs: {
    thigh: [[0, 8.6, 8.8, -0.4], [0.12, 8.4, 8.6, 0.3], [0.35, 7.7, 7.9, 0.8], [0.6, 6.8, 7.0, 0.6], [0.82, 5.9, 6.0, 0.3], [0.95, 5.5, 5.7, 0.8], [1, 5.4, 5.6, 1.0]],
    shin: [[0, 5.5, 5.8, 0.7], [0.1, 5.4, 5.9, -0.2], [0.28, 5.6, 6.3, -1.0], [0.45, 5.3, 5.8, -0.8], [0.7, 4.7, 4.9, -0.3], [0.9, 4.4, 4.5, 0], [1, 4.4, 4.5, 0]],
    upper: [[0.14, 5.4, 5.9, 0], [0.35, 5.0, 5.3, 0.3], [0.65, 4.5, 4.7, 0.3], [0.9, 4.2, 4.3, 0], [1, 4.1, 4.2, -0.2]],
    fore: [[0, 4.1, 4.1, -0.3], [0.2, 4.2, 4.0, 0], [0.5, 3.8, 3.5, 0], [0.8, 3.4, 3.1, 0], [0.94, 3.4, 3.2, 0], [1, 2.6, 2.1, 0]],
    hand: [[0, 1.9, 2.8, 0.3], [0.25, 1.6, 4.1, 0.5], [0.52, 1.35, 4.2, 0.4], [0.62, 1.15, 3.9, 0.2], [0.85, 0.95, 3.4, -0.2], [1, 0.7, 2.4, -0.6]],
  },
  thumb: [[0, -3.5, 3.0], [0.9, -9.5, 5.4], 1.15, 0.85],
  face: HIM_FACE,
  hair: { from: 12.6, nape: 6.4, back: 0.6, side: 0.35, top: 1.25, temple: 0.6, front: 0.85, behind: -2.0 },
  parts: {
    pelvis: [],
    // the collar of his jacket, stood round the neck
    spine2: [e([0, 29.8, -4.4], [8.3, 3.2, 6.9])],
    head: [
      // his ears
      e([7.25, 4.6, 0.9], [1.0, 3.1, 1.9], [-12, 0, 0]), e([-7.25, 4.6, 0.9], [1.0, 3.1, 1.9], [-12, 0, 0]),
    ],
    foot: [e([0, -4.6, 6.6], [4.6, 3.4, 12.4]), s([0, -4.9, -2.6], 3.8), e([0, -6.2, 14.5], [4.0, 2.2, 4.6])],
    // the deltoid, round over the top of the arm
    upper: [e([0.4, -5.0, 0.2], [5.3, 6.4, 6.0])],
  },
}

export const HER = {
  who: 'her',
  root: 88.5, hip: [9.4, -2, 0.5], thigh: 39.5, shin: 40, ankle: 7.5, heel: 4.5, ball: 12.5,
  spine1: [0, 10.5, -1.6], spine2: [0, 12.5, -1.1], neck: [0, 25, -4.6], head: [0, 9.6, 2.9],
  shoulder: [16.3, 21, -3.4], upper: 28, fore: 23.5, handLen: 17,
  torso: [
    [0, -13, 16.8, 12.6, -2.6], [0, -7, 17.8, 12.9, -2.3], [0, 0, 16.4, 11.4, -1.0], [0, 6, 13.8, 9.9, 0],
    [1, 4.5, 12.5, 9.2, 0.4], [2, 0, 12.9, 9.6, 0.9], [2, 7, 13.9, 10.4, 1.2], [2, 12, 14.5, 10.6, 1.0],
    [2, 17.5, 15.0, 9.6, -0.4], [2, 21.2, 15.4, 8.6, -1.6], [2, 23.0, 13.4, 7.6, -2.8], [2, 24.4, 9.8, 6.4, -3.4],
    [2, 25.4, 6.3, 5.6, -3.6],
  ],
  neckRings: [['neck', -1.5, 5.1, 4.9, 1.8], ['neck', 3.5, 4.5, 4.4, 2.4], ['neck', 7.5, 4.3, 4.3, 2.9], ['head', -3.8, 4.3, 4.5, 1.2], ['head', -1.0, 4.2, 4.4, 0.6]],
  limbs: {
    thigh: [[0, 8.8, 8.8, -0.8], [0.15, 8.2, 8.3, 0], [0.4, 7.0, 7.2, 0.4], [0.65, 5.9, 6.0, 0.3], [0.85, 4.8, 4.9, 0.2], [1, 4.4, 4.7, 0.9]],
    shin: [[0, 4.4, 4.6, 0.6], [0.12, 4.3, 4.8, -0.3], [0.3, 4.6, 5.4, -1.2], [0.5, 4.0, 4.6, -0.8], [0.75, 3.0, 3.2, -0.2], [0.92, 2.5, 2.7, 0], [1, 2.5, 2.8, 0.2]],
    upper: [[0.14, 4.2, 4.6, 0], [0.4, 3.8, 4.1, 0.2], [0.7, 3.3, 3.5, 0.2], [0.92, 3.0, 3.1, 0], [1, 2.9, 3.0, -0.2]],
    fore: [[0, 2.9, 2.9, -0.2], [0.2, 3.2, 3.0, 0], [0.55, 2.6, 2.3, 0], [0.85, 2.1, 1.7, 0], [1, 2.0, 1.5, 0]],
    hand: [[0, 1.6, 2.4, 0.3], [0.25, 1.35, 3.6, 0.4], [0.52, 1.15, 3.7, 0.3], [0.62, 1.0, 3.4, 0.1], [0.85, 0.8, 2.9, -0.2], [1, 0.6, 2.0, -0.5]],
  },
  thumb: [[0, -3.2, 2.6], [0.8, -8.6, 4.8], 0.95, 0.7],
  face: HER_FACE,
  hair: { from: 9.0, nape: 5.5, back: 0.75, side: 0.6, top: 0.9, temple: -0.6, front: 0.7, behind: -2.2 },
  parts: {
    pelvis: [],
    spine2: [e([4.9, 11.6, 7.0], [5.1, 5.5, 4.5]), e([-4.9, 11.6, 7.0], [5.1, 5.5, 4.5])],
    head: [],
    foot: [e([0, -4.0, 6.0], [3.8, 2.8, 10.9]), s([0, -4.4, -2.2], 3.1), e([0, -5.4, 12.6], [3.2, 1.8, 4.0])],
    upper: [e([0.3, -4.6, 0.2], [4.2, 5.8, 4.8])],
  },
}
// the heads' sections and their hair, made once
for (const B of [HIM, HER]) {
  B.headRings = faceRings(B.face)
  B.hairRings = hairRings(B.face, B.hair)
}
// A build with other hair (hers up in a ponytail, say): the same body, its
// hair over the skull made again to `spec` (as `hairRings` takes it).
export const withHair = (B, spec) => ({ ...B, hair: spec, hairRings: hairRings(B.face, spec) })
// a point on a head, from the chin's measure (cm over the chin, cm in front
// of the ear) into the head's frame
export const onHead = (B, x, y, z) => [x, y - B.face.pivot[0], z - B.face.pivot[1]]

// ── a pose ──────────────────────────────────────────────────────────────────
// `root` where the pelvis is (and `yaw`, `pitch`, `roll` its turn), then
// the turn of each joint of the spine, the neck and the head, [pitch, yaw,
// roll]; `shrug` how far each shoulder is lifted, left and right; and each
// arm and leg, left then right. An arm is `{ ik, pole, hand }` (a point for
// the wrist and the way the elbow points, and a turn of the hand) or `{ fk:
// [forward, out, twist, elbow] }`. A leg is `{ ik, pole, foot: [yaw,
// pitch] }` (a point for the ankle and the foot's heading and toe up, in
// the world) or `{ fk: [flex, out, twist, knee, ankle] }`, in degrees.
export function solve(B, P) {
  const root = { p: P.root, R: turn(P.pitch || 0, P.yaw || 0, P.roll || 0) }
  const s1 = child(root, B.spine1, turn(...(P.s1 || [0, 0, 0])))
  const s2 = child(s1, B.spine2, turn(...(P.s2 || [0, 0, 0])))
  const neck = child(s2, B.neck, turn(...(P.neck || [0, 0, 0])))
  const head = child(neck, B.head, turn(...(P.head || [0, 0, 0])))
  const F = { root, s1, s2, neck, head, upper: [], fore: [], hand: [], thigh: [], shin: [], foot: [] }
  const front = col(s2.R, 2)
  const up = col(s2.R, 1)
  ;[1, -1].forEach((side, i) => {
    const sh = child(s2, [side * B.shoulder[0], B.shoulder[1] + ((P.shrug && P.shrug[i]) || 0), B.shoulder[2]])
    const A = (P.arms && P.arms[i]) || { fk: [4, 6, 0, 12] }
    let E
    let W
    if (A.ik) {
      const r = ik(sh.p, A.ik, B.upper, B.fore, A.pole || V.add(V.mul(front, -1), V.mul(up, -0.3)))
      E = r.mid
      W = r.end
    } else {
      const [fw, out, tw, el] = A.fk
      const Ru = mm(mm(rx(-fw * D), rz(side * out * D)), ry(side * (tw || 0) * D))
      const u = child(sh, [0, 0, 0], Ru)
      const f = child(u, [0, -B.upper, 0], rx(-el * D))
      E = f.p
      W = V.add(f.p, mv(f.R, [0, -B.fore, 0]))
    }
    const Ru = along(sh.p, E, front, up)
    const Rf = along(E, W, front, V.sub(sh.p, E))
    F.upper.push({ p: sh.p, R: Ru })
    F.fore.push({ p: E, R: Rf })
    F.hand.push({ p: W, R: A.hand ? mm(Rf, turn(...A.hand)) : Rf })
    const hip = child(root, [side * B.hip[0], B.hip[1], B.hip[2]])
    const L = (P.legs && P.legs[i]) || { fk: [2, 2, 0, 4, 0] }
    if (L.fk) {
      const [fl, out, tw, kn, an] = L.fk
      const Rt = mm(mm(mm(root.R, ry(side * (tw || 0) * D)), rz(side * out * D)), rx(-fl * D))
      const knee = V.add(hip.p, mv(Rt, [0, -B.thigh, 0]))
      const Rs = mm(Rt, rx(kn * D))
      const ankle = V.add(knee, mv(Rs, [0, -B.shin, 0]))
      F.thigh.push({ p: hip.p, R: Rt })
      F.shin.push({ p: knee, R: Rs })
      F.foot.push({ p: ankle, R: mm(Rs, rx(-an * D)) })
    } else {
      const pole = L.pole || col(root.R, 2)
      const r = ik(hip.p, L.ik, B.thigh, B.shin, pole)
      F.thigh.push({ p: hip.p, R: along(hip.p, r.mid, pole, front) })
      F.shin.push({ p: r.mid, R: along(r.mid, r.end, pole, front) })
      const [fy, fp] = L.foot || [P.yaw || 0, 0]
      F.foot.push({ p: r.end, R: turn(-fp, fy, 0) })
    }
  })
  return F
}
// where a foot meets the ground: its heel and the ball of it, in the world
export function soles(B, F, i) {
  const f = F.foot[i]
  return { heel: at(f, [0, -B.ankle, -B.heel]), ball: at(f, [0, -B.ankle, B.ball]) }
}

// ── the solid, in the world ─────────────────────────────────────────────────
// Every shape of a posed body, in the world. `skip` names parts to leave
// out and `only` the parts to keep: 'torso', 'neck', 'head', 'hair', 'armL',
// 'armR', 'legL', 'legR'.
function place(f, p) {
  if (p.k === 's') return { k: 's', c: at(f, p.c), r: p.r }
  if (p.k === 'c') return { k: 'c', a: at(f, p.a), b: at(f, p.b), ra: p.ra, rb: p.rb }
  return { k: 'e', c: at(f, p.c), R: p.rot ? mm(f.R, p.rot) : f.R, r: p.r }
}
const CIRC = Array.from({ length: 14 }, (_, k) => [Math.cos((k / 14) * Math.PI * 2), Math.sin((k / 14) * Math.PI * 2)])
function limbRings(f, L, secs) {
  return secs.map(([u, hw, hd, z]) => CIRC.map(([cc, ss]) => at(f, [hw * cc, -u * L, z + hd * ss])))
}
export function solid(B, F, { skip = null, only = null } = {}) {
  const out = []
  const want = (name) => (!only || only.includes(name)) && !(skip && skip.includes(name))
  const bones = [F.root, F.s1, F.s2]
  if (want('torso')) {
    out.push({ k: 'rings', rings: B.torso.map(([b, y, hw, hd, z]) => CIRC.map(([cc, ss]) => at(bones[b], [hw * cc, y, z + hd * ss]))) })
    for (const p of B.parts.pelvis) out.push(place(F.root, p))
    for (const p of B.parts.spine2) out.push(place(F.s2, p))
  }
  if (want('neck')) {
    out.push({ k: 'rings', rings: B.neckRings.map(([b, y, hw, hd, z]) => CIRC.map(([cc, ss]) => at(F[b], [hw * cc, y, z + hd * ss]))) })
  }
  if (want('head')) {
    out.push({ k: 'rings', rings: B.headRings.map((ring) => ring.map((p) => at(F.head, p))) })
    for (const p of B.parts.head) out.push(place(F.head, p))
  }
  if (want('hair')) out.push({ k: 'rings', rings: B.hairRings.map((ring) => ring.map((p) => at(F.head, p))) })
  for (let i = 0; i < 2; i++) {
    const side = i ? 'R' : 'L'
    if (want('arm' + side)) {
      for (const p of B.parts.upper) out.push(place(F.upper[i], i ? { ...p, c: [-p.c[0], p.c[1], p.c[2]] } : p))
      out.push({ k: 'rings', rings: limbRings(F.upper[i], B.upper, B.limbs.upper) })
      out.push({ k: 'rings', rings: limbRings(F.fore[i], B.fore, B.limbs.fore) })
      out.push({ k: 'rings', rings: limbRings(F.hand[i], B.handLen, B.limbs.hand) })
      const [a, b, ra, rb] = B.thumb
      out.push({ k: 'c', a: at(F.hand[i], [0, a[1], a[2]]), b: at(F.hand[i], [b[0] * (i ? -1 : 1), b[1], b[2]]), ra, rb })
    }
    if (want('leg' + side)) {
      out.push({ k: 'rings', rings: limbRings(F.thigh[i], B.thigh, B.limbs.thigh) })
      out.push({ k: 'rings', rings: limbRings(F.shin[i], B.shin, B.limbs.shin) })
      for (const p of B.parts.foot) out.push(place(F.foot[i], p))
    }
  }
  return out
}

// ── the camera ──────────────────────────────────────────────────────────────
// Straight on (no perspective: a long lens, far off), looking at `at` from
// `yaw` round and `pitch` up or down, `s` cells of the glass to the
// centimetre, `at` landing on the glass at (`x0`, `y0`).
export function camera({ at: target = [0, 0, 0], s = 0.5, yaw = 0, pitch = 0, x0 = 47, y0 = 37 }) {
  const R = turn(pitch, yaw, 0)
  const right = col(R, 0)
  const up = col(R, 1)
  const back = col(R, 2)
  const P = (p) => { const d = V.sub(p, target); return [x0 + s * V.dot(d, right), y0 - s * V.dot(d, up)] }
  return { at: target, s, right, up, back, x0, y0, P, depth: (p) => V.dot(V.sub(p, target), back) }
}

// A body's silhouette on the glass, as the pad's flat shapes (kit.js
// `Pad.union`): discs, capsules, ellipses, and the hulls between sections.
export function flat(list, cam) {
  const out = []
  const { s, P } = cam
  const C = [cam.right, cam.up, cam.back]
  for (const p of list) {
    if (p.k === 'rings') {
      let prev = null
      for (const ring of p.rings) {
        const cur = ring.map(P)
        if (prev) out.push({ k: 3, pts: hull([...prev, ...cur]), convex: true })
        prev = cur
      }
      continue
    }
    if (p.k === 's') {
      const [x, y] = P(p.c)
      out.push({ k: 0, cx: x, cy: y, r: p.r * s })
    } else if (p.k === 'c') {
      const [ax, ay] = P(p.a)
      const [bx, by] = P(p.b)
      out.push({ k: 1, ax, ay, bx, by, ra: p.ra * s, rb: p.rb * s })
    } else {
      // the ellipsoid in the camera's axes, and the ellipse it throws: what
      // is left of its form when the depth is taken out of it
      const N = [0, 1, 2].map((i) => [0, 1, 2].map((k) => C[i][0] * p.R[k] + C[i][1] * p.R[3 + k] + C[i][2] * p.R[6 + k]))
      const w = p.r.map((r) => 1 / (r * r))
      const A = (i, j) => N[i][0] * N[j][0] * w[0] + N[i][1] * N[j][1] * w[1] + N[i][2] * N[j][2] * w[2]
      const a22 = A(2, 2)
      const q00 = A(0, 0) - (A(0, 2) * A(0, 2)) / a22
      const q01 = A(0, 1) - (A(0, 2) * A(1, 2)) / a22
      const q11 = A(1, 1) - (A(1, 2) * A(1, 2)) / a22
      // on the glass, y down, in cells
      const a = q00 / (s * s)
      const b = -q01 / (s * s)
      const cc = q11 / (s * s)
      const m = (a + cc) / 2
      const d = Math.sqrt(((a - cc) / 2) ** 2 + b * b)
      const [x, y] = P(p.c)
      out.push({ k: 2, cx: x, cy: y, rx: 1 / Math.sqrt(m + d), ry: 1 / Math.sqrt(Math.max(1e-9, m - d)), ang: 0.5 * Math.atan2(2 * b, a - cc) })
    }
  }
  return out
}
export function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = []
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  const hi = []
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q) }
  return lo.slice(0, -1).concat(hi.slice(0, -1))
}

// ── what hangs ──────────────────────────────────────────────────────────────
// Strands: each a chain of `n` points `len` long in all, its first held at
// a root that moves with the head (`roots(t)`: for each strand the root and
// the way the strand leaves it), the rest falling under gravity, slowed by
// the air they move through (`drag`, a share of their speed lost each
// millisecond), pushed by `wind(t)`, kept their length apart, stiff near
// the root, and pushed out of the spheres `colliders(t)`. Worked out from
// `t0` to `t1`, `dt` ms a step, after a second and a half of settling where
// they start, a little at a time: reading a moment works out what is still
// to be worked out up to it, and `.step(ms)` works ahead for that long.
// Answers the strands at any moment.
export function chains({ roots, colliders = () => [], wind = () => [0, 0, 0], t0 = 0, t1, dt = 4, n = 7, len = 36, drag = 0.0016, stiff = 0.3, settle = 1500 }) {
  const seg = len / (n - 1)
  const g = 980e-6
  const keep = (1 - drag) ** dt
  const steps = Math.ceil((t1 - t0) / dt) + 1
  let count = 0
  let P = null
  let Q = null
  let store = null
  let done = 0
  let begun = false
  const one = (t, settling) => {
    const R = roots(t)
    const cs = colliders(t)
    const w = wind(t)
    const k = settling ? keep * 0.9 : keep
    const ax = w[0] * dt * dt
    const ay = (w[1] - g) * dt * dt
    const az = w[2] * dt * dt
    for (let c = 0; c < count; c++) {
      const o = c * n * 3
      const [rx, ry, rz] = R[c].p
      P[o] = rx; P[o + 1] = ry; P[o + 2] = rz
      Q[o] = rx; Q[o + 1] = ry; Q[o + 2] = rz
      for (let i = 1; i < n; i++) {
        const j = o + i * 3
        const x = P[j]; const y = P[j + 1]; const z = P[j + 2]
        P[j] = x + (x - Q[j]) * k + ax
        P[j + 1] = y + (y - Q[j + 1]) * k + ay
        P[j + 2] = z + (z - Q[j + 2]) * k + az
        Q[j] = x; Q[j + 1] = y; Q[j + 2] = z
      }
      let [dx, dy, dz] = R[c].d
      const dl = Math.hypot(dx, dy, dz) || 1
      dx /= dl; dy /= dl; dz /= dl
      for (let it = 0; it < 5; it++) {
        // stiff at the root: the first two points held toward the way the
        // strand leaves the head
        let j = o + 3
        P[j] += (P[o] + dx * seg - P[j]) * stiff
        P[j + 1] += (P[o + 1] + dy * seg - P[j + 1]) * stiff
        P[j + 2] += (P[o + 2] + dz * seg - P[j + 2]) * stiff
        if (n > 2) {
          j = o + 6
          const s2 = stiff * 0.35
          P[j] += (P[o + 3] + dx * seg * 0.8 - P[j]) * s2
          P[j + 1] += (P[o + 4] + dy * seg * 0.8 - P[j + 1]) * s2
          P[j + 2] += (P[o + 5] + dz * seg * 0.8 - P[j + 2]) * s2
        }
        for (let i = 1; i < n; i++) {
          const a = o + (i - 1) * 3
          const b = a + 3
          const ex = P[b] - P[a]; const ey = P[b + 1] - P[a + 1]; const ez = P[b + 2] - P[a + 2]
          const l = Math.hypot(ex, ey, ez) || 1e-6
          const kk = (l - seg) / l
          if (i === 1) { P[b] -= ex * kk; P[b + 1] -= ey * kk; P[b + 2] -= ez * kk } else {
            const h = kk * 0.5
            P[a] += ex * h; P[a + 1] += ey * h; P[a + 2] += ez * h
            P[b] -= ex * h; P[b + 1] -= ey * h; P[b + 2] -= ez * h
          }
        }
        for (let i = 1; i < n; i++) {
          const j2 = o + i * 3
          for (const q of cs) {
            const ex = P[j2] - q.c[0]; const ey = P[j2 + 1] - q.c[1]; const ez = P[j2 + 2] - q.c[2]
            const l2 = ex * ex + ey * ey + ez * ez
            if (l2 >= q.r * q.r) continue
            const l = Math.sqrt(l2) || 1e-6
            const kk = q.r / l
            P[j2] = q.c[0] + ex * kk; P[j2 + 1] = q.c[1] + ey * kk; P[j2 + 2] = q.c[2] + ez * kk
          }
        }
      }
    }
  }
  const begin = () => {
    begun = true
    const r0 = roots(t0)
    count = r0.length
    P = new Float64Array(count * n * 3)
    Q = new Float64Array(count * n * 3)
    store = new Float32Array(steps * count * n * 3)
    for (let c = 0; c < count; c++) {
      const d = V.norm(r0[c].d)
      for (let i = 0; i < n; i++) {
        const p = V.add(r0[c].p, V.add(V.mul(d, Math.min(i, 1) * seg), [0, -Math.max(0, i - 1) * seg, 0]))
        const j = (c * n + i) * 3
        P[j] = Q[j] = p[0]; P[j + 1] = Q[j + 1] = p[1]; P[j + 2] = Q[j + 2] = p[2]
      }
    }
    for (let t = t0 - settle; t < t0; t += dt) one(t0, true)
  }
  const next = () => {
    if (!begun) begin()
    one(t0 + done * dt, false)
    store.set(P, done * count * n * 3)
    done++
  }
  const upTo = (t) => { const k = Math.min(steps, Math.ceil((t - t0) / dt) + 2); while (done < k) next() }
  const read = (t) => {
    upTo(t)
    const f = (clamp(t, t0, t1) - t0) / dt
    const k = Math.min(done - 2, Math.floor(f))
    const u = clamp(f - k)
    const out = []
    for (let c = 0; c < count; c++) {
      const s2 = []
      for (let i = 0; i < n; i++) {
        const o = ((k * count + c) * n + i) * 3
        const o2 = o + count * n * 3
        s2.push([lerp(store[o], store[o2], u), lerp(store[o + 1], store[o2 + 1], u), lerp(store[o + 2], store[o2 + 2], u)])
      }
      out.push(s2)
    }
    return out
  }
  read.step = (ms) => { const a = performance.now(); while (done < steps && performance.now() - a < ms) next(); return done >= steps }
  return read
}
// strands as the capsules along them, `r` [at the root, at the end]
export function strands(list, radii) {
  const out = []
  list.forEach((pts, i) => {
    const [r0, r1] = radii[i] || radii[0]
    for (let k = 1; k < pts.length; k++) {
      const a = lerp(r0, r1, (k - 1) / (pts.length - 1))
      const b = lerp(r0, r1, k / (pts.length - 1))
      out.push({ k: 'c', a: pts[k - 1], b: pts[k], ra: a, rb: b })
    }
  })
  return out
}
// strands side by side as one sheet of hair: at each point down them, the
// strands across, thickened `th` [root, tip], and the hull between each
// level and the next; the tips drawn in toward each other
export function sheet(list, th = [1.6, 0.6]) {
  const n = list[0].length
  const rings = []
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1)
    const row = list.map((s2) => s2[i])
    let cx = 0; let cy = 0; let cz = 0
    for (const p of row) { cx += p[0]; cy += p[1]; cz += p[2] }
    const m = [cx / row.length, cy / row.length, cz / row.length]
    const pull = 0.35 * k * k
    const t = lerp(th[0], th[1], k)
    const ring = []
    for (const p of row) {
      const q = V.lerp(p, m, pull)
      ring.push(V.add(q, [t, 0, 0]), V.add(q, [-t, 0, 0]), V.add(q, [0, 0, t]), V.add(q, [0, 0, -t]), V.add(q, [0, t, 0]))
    }
    rings.push(ring)
  }
  return { k: 'rings', rings }
}

// A skirt: a ring of `cols` strands hung from the waist ring (`waist(t)`:
// its middle and its turn), `len` long, flaring to `flare` times the waist
// at the hem, kept their places round the ring and down it, stiff enough
// to hold the flare, pushed out of the legs (`colliders(t)`, capsules {a,
// b, r}) and the hips (spheres {c, r}), under gravity and the air. Worked
// out a little at a time, as `chains` is. Answers the rings, waist to hem,
// at any moment.
export function cloth({ waist, radii, colliders, t0 = 0, t1, dt = 4, cols = 18, rows = 6, len = 48, flare = 1.55, drag = 0.0022, wind = () => [0, 0, 0], settle = 1200 }) {
  const g = 980e-6
  const keep = (1 - drag) ** dt
  const seg = len / (rows - 1)
  const N = rows * cols
  const rest = []
  for (let r = 0; r < rows; r++) {
    const k = lerp(1, flare, (r / (rows - 1)) ** 0.85)
    rest.push([radii[0] * k, radii[1] * k])
  }
  const circ = rest.map(([a, b]) => (2 * Math.PI * Math.sqrt((a * a + b * b) / 2)) / cols)
  const cosA = Float64Array.from({ length: cols }, (_, j) => Math.cos((j / cols) * Math.PI * 2))
  const sinA = Float64Array.from({ length: cols }, (_, j) => Math.sin((j / cols) * Math.PI * 2))
  const P = new Float64Array(N * 3)
  const Q = new Float64Array(N * 3)
  const steps = Math.ceil((t1 - t0) / dt) + 1
  const store = new Float32Array(steps * N * 3)
  let done = 0
  let begun = false
  // the waist ring, where the top row is held
  const top = (W) => {
    const R = W.R
    for (let j = 0; j < cols; j++) {
      const lx = rest[0][0] * cosA[j]
      const lz = rest[0][1] * sinA[j]
      const o = j * 3
      P[o] = Q[o] = W.p[0] + R[0] * lx + R[2] * lz
      P[o + 1] = Q[o + 1] = W.p[1] + R[3] * lx + R[5] * lz
      P[o + 2] = Q[o + 2] = W.p[2] + R[6] * lx + R[8] * lz
    }
  }
  // two points kept `L` apart; `wa` of the correction to the first (none if
  // it is held)
  const pin = (a, b, L, wa) => {
    const ex = P[b] - P[a]; const ey = P[b + 1] - P[a + 1]; const ez = P[b + 2] - P[a + 2]
    const l = Math.hypot(ex, ey, ez) || 1e-6
    const kk = (l - L) / l
    const wb = 1 - wa
    P[a] += ex * kk * wa; P[a + 1] += ey * kk * wa; P[a + 2] += ez * kk * wa
    P[b] -= ex * kk * wb; P[b + 1] -= ey * kk * wb; P[b + 2] -= ez * kk * wb
  }
  const one = (t, settling) => {
    const W = waist(t)
    top(W)
    const k = settling ? keep * 0.85 : keep
    const w = wind(t)
    const ax = w[0] * dt * dt
    const ay = -g * dt * dt
    const az = w[2] * dt * dt
    for (let i = cols * 3; i < N * 3; i += 3) {
      const x = P[i]; const y = P[i + 1]; const z = P[i + 2]
      P[i] = x + (x - Q[i]) * k + ax
      P[i + 1] = y + (y - Q[i + 1]) * k + ay
      P[i + 2] = z + (z - Q[i + 2]) * k + az
      Q[i] = x; Q[i + 1] = y; Q[i + 2] = z
    }
    const cs = colliders(t)
    for (let it = 0; it < 4; it++) {
      for (let r = 1; r < rows; r++) {
        for (let j = 0; j < cols; j++) {
          const o = (r * cols + j) * 3
          pin((r - 1) * cols * 3 + j * 3, o, seg, r === 1 ? 0 : 0.5)
          pin(o, (r * cols + ((j + 1) % cols)) * 3, circ[r], 0.5)
          if (r >= 2) pin((r - 2) * cols * 3 + j * 3, o, seg * 2 * 0.985, r === 2 ? 0 : 0.35)
        }
      }
      // the flare held: no point falling in toward the middle of the waist
      // further than its ring's rest
      for (let r = 1; r < rows; r++) {
        const min = Math.min(rest[r][0], rest[r][1]) * 0.9
        for (let j = 0; j < cols; j++) {
          const o = (r * cols + j) * 3
          const ex = P[o] - W.p[0]; const ez = P[o + 2] - W.p[2]
          const l = Math.hypot(ex, ez) || 1e-6
          if (l < min) { P[o] = W.p[0] + (ex / l) * min; P[o + 2] = W.p[2] + (ez / l) * min }
        }
      }
      for (const q of cs) {
        if (q.c) {
          const r2 = q.r * q.r
          for (let i = cols * 3; i < N * 3; i += 3) {
            const ex = P[i] - q.c[0]; const ey = P[i + 1] - q.c[1]; const ez = P[i + 2] - q.c[2]
            const l2 = ex * ex + ey * ey + ez * ez
            if (l2 >= r2) continue
            const l = Math.sqrt(l2) || 1e-6
            const kk = q.r / l
            P[i] = q.c[0] + ex * kk; P[i + 1] = q.c[1] + ey * kk; P[i + 2] = q.c[2] + ez * kk
          }
          continue
        }
        const [ax0, ay0, az0] = q.a
        const bx = q.b[0] - ax0; const by = q.b[1] - ay0; const bz = q.b[2] - az0
        const bb = bx * bx + by * by + bz * bz || 1e-6
        const r2 = q.r * q.r
        for (let i = cols * 3; i < N * 3; i += 3) {
          const px = P[i] - ax0; const py = P[i + 1] - ay0; const pz = P[i + 2] - az0
          let u = (px * bx + py * by + pz * bz) / bb
          u = u < 0 ? 0 : u > 1 ? 1 : u
          const ex = px - bx * u; const ey = py - by * u; const ez = pz - bz * u
          const l2 = ex * ex + ey * ey + ez * ez
          if (l2 >= r2) continue
          const l = Math.sqrt(l2) || 1e-6
          const kk = q.r / l - 1
          P[i] += ex * kk; P[i + 1] += ey * kk; P[i + 2] += ez * kk
        }
      }
    }
  }
  const begin = () => {
    begun = true
    const W = waist(t0)
    for (let r = 0; r < rows; r++) {
      for (let j = 0; j < cols; j++) {
        const lx = rest[r][0] * cosA[j]
        const lz = rest[r][1] * sinA[j]
        const ly = -r * seg * 0.97
        const o = (r * cols + j) * 3
        const R = W.R
        P[o] = Q[o] = W.p[0] + R[0] * lx + R[1] * ly + R[2] * lz
        P[o + 1] = Q[o + 1] = W.p[1] + R[3] * lx + R[4] * ly + R[5] * lz
        P[o + 2] = Q[o + 2] = W.p[2] + R[6] * lx + R[7] * ly + R[8] * lz
      }
    }
    for (let t = t0 - settle; t < t0; t += dt) one(t0, true)
  }
  const next = () => {
    if (!begun) begin()
    one(t0 + done * dt, false)
    store.set(P, done * N * 3)
    done++
  }
  const upTo = (t) => { const k = Math.min(steps, Math.ceil((t - t0) / dt) + 2); while (done < k) next() }
  const read = (t) => {
    upTo(t)
    const f = (clamp(t, t0, t1) - t0) / dt
    const kk = Math.min(done - 2, Math.floor(f))
    const u = clamp(f - kk)
    const rings = []
    for (let r = 0; r < rows; r++) {
      const ring = []
      for (let j = 0; j < cols; j++) {
        const o = ((kk * rows + r) * cols + j) * 3
        const o2 = o + N * 3
        ring.push([lerp(store[o], store[o2], u), lerp(store[o + 1], store[o2 + 1], u), lerp(store[o + 2], store[o2 + 2], u)])
      }
      rings.push(ring)
    }
    return rings
  }
  read.step = (ms) => { const a = performance.now(); while (done < steps && performance.now() - a < ms) next(); return done >= steps }
  return read
}
// A point on a spring, following `target(t)` (a point in the world) from
// `t0` to `t1`.
export function springV(target, t0, t1, { hz = 1.6, damp = 0.35, dt = 4 } = {}) {
  const n = Math.ceil((t1 - t0) / dt) + 1
  const out = new Float32Array(n * 3)
  let x = target(t0)
  let v = [0, 0, 0]
  const w = (2 * Math.PI * hz) / 1000
  for (let i = 0; i < n; i++) {
    const T = target(t0 + i * dt)
    v = V.add(v, V.mul(V.sub(V.mul(V.sub(T, x), w * w), V.mul(v, 2 * damp * w)), dt))
    x = V.add(x, V.mul(v, dt))
    out[i * 3] = x[0]; out[i * 3 + 1] = x[1]; out[i * 3 + 2] = x[2]
  }
  return (t) => {
    const f = (clamp(t, t0, t1) - t0) / dt
    const i = Math.min(n - 2, Math.floor(f))
    const u = f - i
    return [0, 1, 2].map((k) => lerp(out[i * 3 + k], out[(i + 1) * 3 + k], u))
  }
}

// ── small things a body does ────────────────────────────────────────────────
// A slow, smooth wander about nought (-1 to 1), for the small movements of
// a body that is still: nobody alive holds a pose.
export function wander(t, seed = 0, hz = 0.35) {
  const w = (2 * Math.PI * hz) / 1000
  return (Math.sin(t * w + seed * 1.7) * 0.5 + Math.sin(t * w * 2.13 + seed * 3.1) * 0.3 + Math.sin(t * w * 3.71 + seed * 5.3) * 0.2)
}
// A breath, 0 to 1 and back, `ms` long, from `t0`: in, a little quicker than
// out, and a pause at the bottom, as a breath is at rest.
export function breath(t, ms = 3800, t0 = 0) {
  const u = (((t - t0) / ms) % 1 + 1) % 1
  if (u < 0.4) return sm5(u / 0.4)
  if (u < 0.85) return 1 - sm5((u - 0.4) / 0.45)
  return 0
}
// Keyed numbers, periodic: [[u, v], ...] over one cycle (u in [0, 1)),
// smooth through every key (Catmull-Rom), the last joining the first.
export function cyc(keys, u) {
  const n = keys.length
  const x = ((u % 1) + 1) % 1
  let i = n - 1
  for (let k = 0; k < n; k++) if (keys[k][0] <= x) i = k
  const k0 = keys[(i - 1 + n) % n]
  const k1 = keys[i]
  const k2 = keys[(i + 1) % n]
  const k3 = keys[(i + 2) % n]
  const u1 = k1[0]
  let u2 = k2[0]
  if (u2 <= u1) u2 += 1
  let xx = x
  if (xx < u1) xx += 1
  const s2 = (xx - u1) / (u2 - u1)
  const m1 = (k2[1] - k0[1]) / 2
  const m2 = (k3[1] - k1[1]) / 2
  const h00 = 2 * s2 ** 3 - 3 * s2 ** 2 + 1
  const h10 = s2 ** 3 - 2 * s2 ** 2 + s2
  const h01 = -2 * s2 ** 3 + 3 * s2 ** 2
  const h11 = s2 ** 3 - s2 ** 2
  return h00 * k1[1] + h10 * m1 + h01 * k2[1] + h11 * m2
}
// Keyed numbers once through: [[t, v], ...] at `t`, smooth through every
// key (Catmull-Rom in time), held before the first and after the last.
export function track(keys, t) {
  const n = keys.length
  if (t <= keys[0][0]) return keys[0][1]
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  let i = 0
  while (i < n - 2 && t >= keys[i + 1][0]) i++
  const [t1, v1] = keys[i]
  const [t2, v2] = keys[i + 1]
  const [t0, v0] = i > 0 ? keys[i - 1] : [t1 - (t2 - t1), v1]
  const [t3, v3] = i + 2 < n ? keys[i + 2] : [t2 + (t2 - t1), v2]
  const u = (t - t1) / (t2 - t1)
  const dt = t2 - t1
  const m1 = ((v2 - v0) / (t2 - t0)) * dt
  const m2 = ((v3 - v1) / (t3 - t1)) * dt
  return (2 * u ** 3 - 3 * u ** 2 + 1) * v1 + (u ** 3 - 2 * u ** 2 + u) * m1 + (-2 * u ** 3 + 3 * u ** 2) * v2 + (u ** 3 - u ** 2) * m2
}

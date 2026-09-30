// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KIT, for the other ways of telling it                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The intro, the door and the mutual tell one story (pixmark.js): the run,
// the catch, the glide into the mark. The owner asked for other tellings,
// more romantic and more considered, so each screen can have its own. This
// is what they are drawn with, on the same glass and the same grid as the
// intro (95 by 75, PixelStory.jsx draws them), so any of them can stand in
// for it: a story is still a function of the clock that answers lit cells.
//
//   `Pad`      a sheet of the grid with a margin round it, and shapes laid on
//              it anti-aliased, four samples to a cell's side, each shape
//              over the ones laid before it (so the nearer is laid last)
//   `figure`   a small person in profile, or from behind, walking, standing
//              or sitting, posed by a handful of numbers
//   `petals`   blossom falling, on the grid, a petal turning as it falls
//   `sky`      the stars, each twinkling on its own clock
//   `mark()`   the mark on this grid, its ring and its star, with each ring
//              cell's angle round the ellipse and each star cell's reach
//   `glideOf`  the gathering the intro does (pixels finding the mark along
//              the shortest ways, pixmark.js `transport`), for any drawing
//   `tale`     the story object PixelStory wants, from a frame function

import { markOn, transport, washFrom, MARK_CUT } from '../pixmark.js'
import { ECL, rad } from '../mark.js'

export const COLS = 95
export const ROWS = 75
export const MARK_N = 77
export const MX = (COLS - MARK_N) >> 1
export const MY = (ROWS - MARK_N) >> 1
// the inks a cell can carry (PixelStory.jsx `fillOf`): the screen's near
// ink, its far ink at half, the rose, and the mid ink
export const INK = 1
export const FAR = 2
export const ROSE = 3
export const MID = 4

// ── numbers ─────────────────────────────────────────────────────────────────
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, k) => a + (b - a) * k
export const smooth = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }
export const inOut = (k) => { const x = clamp(k); return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2 }
export const outCubic = (k) => 1 - (1 - clamp(k)) ** 3
export const inCubic = (k) => clamp(k) ** 3
export const outBack = (k, s = 1.7) => { const x = clamp(k) - 1; return 1 + x * x * ((s + 1) * x + s) }
// a spring settling onto 1, for a thing that arrives and gives a little
export const spring = (k, bounce = 0.35) => {
  const x = clamp(k)
  return 1 - Math.exp(-6 * x) * Math.cos(x * Math.PI * (2.5 + bounce * 4)) * (1 - x)
}
// how far through [a, b] the clock is, 0 to 1
export const span = (t, a, b) => clamp((t - a) / (b - a))
export const D = Math.PI / 180
// a number from two others, the same every time it is asked
export const hash = (a, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
const wrap = (v, n) => ((v % n) + n) % n

// ── the pad ─────────────────────────────────────────────────────────────────
// The grid and a margin of sixteen cells round it, which is more than any
// glass runs past the story's grid (pixmark.js `ENTER`). A cell holds one
// ink and how lit it is. A shape covering most of a cell takes it, whatever
// was there (it is in front); a shape only grazing a cell lights it only if
// it is empty or lit less, so edges are soft and nothing behind shows
// through a body. Laying ink 0 cuts: the air between two things.
const M = 16
const PW = COLS + 2 * M
const PH = ROWS + 2 * M
const SS = 4
export class Pad {
  constructor() {
    this.ink = new Uint8Array(PW * PH)
    this.a = new Float32Array(PW * PH)
    this.touched = new Int32Array(PW * PH)
    this.count = 0
  }
  clear() {
    for (let k = 0; k < this.count; k++) { const i = this.touched[k]; this.ink[i] = 0; this.a[i] = 0 }
    this.count = 0
    return this
  }
  at(x, y) {
    const i = x + M
    const j = y + M
    return i < 0 || j < 0 || i >= PW || j >= PH ? -1 : j * PW + i
  }
  // a cell, lit outright (or cut, with ink 0)
  set(x, y, ink, a = 1) {
    const i = this.at(Math.round(x), Math.round(y))
    if (i < 0) return
    if (!this.ink[i] && !this.a[i]) this.touched[this.count++] = i
    this.ink[i] = ink
    this.a[i] = ink ? a : 0
  }
  // a cell a shape covers `cov` of, in `ink` at `a`
  paint(x, y, ink, a, cov) {
    const i = this.at(x, y)
    if (i < 0) return
    if (!ink) {
      if (cov >= 0.45 && this.a[i]) this.a[i] = 0
      return
    }
    const lit = a * smooth((cov - 0.1) / 0.7)
    if (lit < 0.02) return
    const cur = this.a[i]
    if (cov >= 0.5 || !cur || lit > cur) {
      if (!this.ink[i] && !cur) this.touched[this.count++] = i
      this.ink[i] = ink
      this.a[i] = lit
    }
  }
  // any shape, by whether a point is in it, over the box it is in
  fill(inside, x0, y0, x1, y1, ink, a = 1) {
    const X0 = Math.max(-M, Math.floor(x0))
    const Y0 = Math.max(-M, Math.floor(y0))
    const X1 = Math.min(COLS + M - 1, Math.ceil(x1))
    const Y1 = Math.min(ROWS + M - 1, Math.ceil(y1))
    for (let y = Y0; y <= Y1; y++) {
      for (let x = X0; x <= X1; x++) {
        let n = 0
        for (let sy = 0; sy < SS; sy++) {
          const py = y + (sy + 0.5) / SS
          for (let sx = 0; sx < SS; sx++) if (inside(x + (sx + 0.5) / SS, py)) n++
        }
        if (n) this.paint(x, y, ink, a, n / (SS * SS))
      }
    }
    return this
  }
  disc(cx, cy, r, ink, a = 1) {
    const r2 = r * r
    return this.fill((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r2, cx - r, cy - r, cx + r, cy + r, ink, a)
  }
  ell(cx, cy, rx, ry, deg, ink, a = 1) {
    const c = Math.cos(deg * D)
    const s = Math.sin(deg * D)
    const R = Math.max(rx, ry)
    return this.fill((x, y) => {
      const dx = x - cx
      const dy = y - cy
      const u = (dx * c + dy * s) / rx
      const v = (-dx * s + dy * c) / ry
      return u * u + v * v <= 1
    }, cx - R, cy - R, cx + R, cy + R, ink, a)
  }
  // a limb: round at both ends, `ra` at the one and `rb` at the other
  cap(ax, ay, bx, by, ra, rb, ink, a = 1) {
    const dx = bx - ax
    const dy = by - ay
    const L2 = dx * dx + dy * dy || 1e-6
    const R = Math.max(ra, rb)
    return this.fill((x, y) => {
      const k = clamp(((x - ax) * dx + (y - ay) * dy) / L2)
      const r = ra + (rb - ra) * k
      return (x - ax - dx * k) ** 2 + (y - ay - dy * k) ** 2 <= r * r
    }, Math.min(ax, bx) - R, Math.min(ay, by) - R, Math.max(ax, bx) + R, Math.max(ay, by) + R, ink, a)
  }
  line(ax, ay, bx, by, ink, a = 1, w = 0.5) { return this.cap(ax, ay, bx, by, w, w, ink, a) }
  poly(pts, ink, a = 1) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    const n = pts.length
    return this.fill((x, y) => {
      let c = false
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i]
        const [xj, yj] = pts[j]
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
      }
      return c
    }, x0, y0, x1, y1, ink, a)
  }
  rect(x, y, w, h, ink, a = 1) {
    return this.fill((px, py) => px >= x && px <= x + w && py >= y && py <= y + h, x, y, x + w, y + h, ink, a)
  }
  // lit cells, in the story's form: [x, y, ink, heat, alpha]
  cells(out = []) {
    for (let k = 0; k < this.count; k++) {
      const i = this.touched[k]
      const a = this.a[i]
      if (a < 0.03 || !this.ink[i]) continue
      out.push([(i % PW) - M, Math.floor(i / PW) - M, this.ink[i], 0, Math.round(Math.min(1, a) * 16) / 16])
    }
    return out
  }
}

// ── a person ────────────────────────────────────────────────────────────────
// Small, about thirty cells tall at `s` 1: a head, a neck, a torso, two arms
// and two legs, each a tapered limb, laid far side first. Her hair falls
// past her shoulders and she wears a dress that swings; he is in a coat.
// `x` is over the hips and `g` the row the feet are on; `dir` 1 faces right.
//
//   walk     where in a stride, 0 to 1 (two steps), and `stride` how much
//   turn     0 in profile, 1 from behind (the bench): the face goes under
//            the hair, the shoulders square to us, the arms come to the sides
//   sit      0 standing, 1 sat on a seat `seat` rows over the feet
//   lean     the torso forward, degrees; `tilt` the head, degrees; `nod` it
//            down; `hx`, `hy` the head moved on the neck (a head on a shoulder)
//   armN,    each arm, its shoulder and its elbow, degrees from hanging
//   armF     (forward positive); `reach` sets both toward a point instead
//   hair     how far her hair swings back, cells; `hem` her skirt
//   a        how lit, all of it (arriving, going)
//
// The tones are the intro's (folk.js): hair darkest, his coat nearly as
// dark, her dress and her face lighter, the far limbs a little over half.
const TONE = {
  him: { hair: 1, skin: 0.5, top: 0.88, legs: 0.95, shoe: 1 },
  her: { hair: 1, skin: 0.5, top: 0.62, legs: 0.55, shoe: 0.95 },
}
const FAR_K = 0.58
export function figure(pad, o) {
  const her = !!o.her
  const T = TONE[her ? 'her' : 'him']
  const s = o.s ?? 1
  const dir = o.dir ?? 1
  const A = o.a ?? 1
  const turn = clamp(o.turn ?? 0)
  const sit = clamp(o.sit ?? 0)
  const walk = o.walk ?? 0
  const stride = o.stride ?? 0
  const ph = walk * Math.PI * 2
  // the build, in cells at s 1
  const thigh = (her ? 7.2 : 7.8) * s
  const shin = (her ? 7.0 : 7.6) * s
  const torso = (her ? 9.6 : 10.8) * s
  const headR = (her ? 2.55 : 2.75) * s
  const neck = 1.1 * s
  const upper = (her ? 5.0 : 5.6) * s
  const fore = (her ? 4.6 : 5.0) * s
  const wide = lerp(her ? 2.1 : 2.6, her ? 3.1 : 3.9, turn) * s
  const bob = stride * Math.abs(Math.cos(ph)) * 0.6 * s
  const seat = o.seat ?? 8 * s
  // the hips: over the feet standing, down on the seat sitting
  const hipStand = o.g - thigh - shin - 0.6 * s + bob
  const hipY = lerp(hipStand, o.g - seat, sit)
  const hx = o.x
  const lean = (o.lean ?? (stride * 6)) * D * (1 - turn)
  const P = (fx, fy) => [hx + dir * fx, fy]
  const up = [Math.sin(lean) * dir, -Math.cos(lean)]
  const shoulder = [hx + up[0] * torso, hipY + up[1] * torso]
  const neckTop = [shoulder[0] + up[0] * neck, shoulder[1] + up[1] * neck]
  const head = [neckTop[0] + dir * (o.hx ?? 0) * s + up[0] * headR * 0.9, neckTop[1] + (o.hy ?? 0) * s + up[1] * headR * 0.9]
  const down = (deg) => [Math.sin(deg * D) * dir, Math.cos(deg * D)]
  // the legs: a thigh, a knee, a shin, a foot
  const legs = []
  for (const side of [1, -1]) {
    const swing = side * Math.sin(ph) * 28 * stride
    let h = swing
    let k = Math.max(0, side * Math.sin(ph + 1.2)) * 38 * stride + 4 * (1 - stride)
    // sat: the thigh forward along the seat, the shin down from the knee
    h = lerp(h, 84, sit)
    k = lerp(k, 84, sit)
    const offX = lerp(0, side * 1.25 * s, turn)
    const hip = [hx + offX * dir, hipY]
    const d1 = down(h)
    const knee = [hip[0] + d1[0] * thigh, hip[1] + d1[1] * thigh]
    const d2 = down(h - k)
    const ankle = [knee[0] + d2[0] * shin, knee[1] + d2[1] * shin]
    legs.push({ side, hip, knee, ankle })
  }
  // the arms: `armN` near and `armF` far, or swinging with the stride
  const armOf = (side, spec) => {
    const [sa, ea] = spec || [-side * Math.sin(ph) * 26 * stride + 4, 14 + 10 * stride]
    const off = lerp(0, side * wide * 0.95, turn)
    const sh = [shoulder[0] + dir * off - dir * 0.3 * s * (1 - turn), shoulder[1] + 0.9 * s]
    const d1 = down(sa)
    let el = [sh[0] + d1[0] * upper, sh[1] + d1[1] * upper]
    const d2 = down(sa + ea)
    let wr = [el[0] + d2[0] * fore, el[1] + d2[1] * fore]
    if (o.reach && o.reach[side === 1 ? 0 : 1]) {
      // a hand to a point: the arm straightens toward it, the elbow soft
      const [tx, ty] = o.reach[side === 1 ? 0 : 1]
      const L = upper + fore
      const dx = tx - sh[0]
      const dy = ty - sh[1]
      const dist = Math.min(L * 0.98, Math.hypot(dx, dy))
      const ang = Math.atan2(dy, dx)
      const bend = Math.acos(clamp((upper * upper + dist * dist - fore * fore) / (2 * upper * dist), -1, 1))
      const a1 = ang - bend * dir
      el = [sh[0] + Math.cos(a1) * upper, sh[1] + Math.sin(a1) * upper]
      wr = [sh[0] + Math.cos(ang) * dist, sh[1] + Math.sin(ang) * dist]
    }
    return { sh, el, wr }
  }
  const armN = armOf(1, o.armN)
  const armF = armOf(-1, o.armF)
  const near = legs[0]
  const far = legs[1]
  const limb = (L, tone, r0, r1, r2) => {
    pad.cap(L.hip[0], L.hip[1], L.knee[0], L.knee[1], r0, r1, INK, tone * A)
    pad.cap(L.knee[0], L.knee[1], L.ankle[0], L.ankle[1], r1, r2, INK, tone * A)
    // the shoe, forward of the ankle
    if (sit < 0.9 || turn < 0.5) {
      const toe = [L.ankle[0] + dir * 1.7 * s * (1 - turn), L.ankle[1] + 0.25 * s]
      pad.cap(L.ankle[0] - dir * 0.3 * s, L.ankle[1] + 0.1 * s, toe[0], toe[1], 0.75 * s, 0.6 * s, INK, T.shoe * A * (L === far ? FAR_K + 0.25 : 1))
    }
  }
  const arm = (R, tone, far2 = false) => {
    const k = far2 ? FAR_K : 1
    pad.cap(R.sh[0], R.sh[1], R.el[0], R.el[1], (her ? 0.95 : 1.15) * s, (her ? 0.8 : 0.95) * s, INK, tone * k * A)
    pad.cap(R.el[0], R.el[1], R.wr[0], R.wr[1], (her ? 0.8 : 0.95) * s, (her ? 0.6 : 0.7) * s, INK, tone * k * A)
    pad.disc(R.wr[0], R.wr[1], (her ? 0.75 : 0.85) * s, INK, T.skin * k * A * 1.2)
  }
  const legR = her ? [1.25 * s, 0.85 * s, 0.6 * s] : [1.6 * s, 1.15 * s, 0.9 * s]
  // far side first
  if (!o.noLegs) limb(far, T.legs * (turn > 0.5 ? 1 : FAR_K + 0.1), ...legR)
  if (turn < 0.5) arm(armF, her ? T.skin + 0.1 : T.top, true)
  // her hair, behind her: a fall from the crown down past the shoulders,
  // swung back by her going
  if (her) {
    const sw = (o.hair ?? stride * 1.6) * s
    const back = -dir * (1 - turn)
    const len = (o.hairLen ?? 8.5) * s
    const hairTop = [head[0] + back * 0.6 * s, head[1] - 0.4 * s]
    const hairEnd = [head[0] + back * (1.6 * s + sw) + dir * turn * 0, head[1] + len]
    pad.cap(hairTop[0], hairTop[1], hairEnd[0], hairEnd[1], headR * 1.0, lerp(1.2, 2.4, turn) * s, INK, T.hair * A)
  }
  // the torso: a tapered body from hips to shoulders, broad at the chest
  const chest = [lerp(hx, shoulder[0], 0.72), lerp(hipY, shoulder[1], 0.72)]
  pad.cap(hx, hipY - 0.3 * s, chest[0], chest[1], (her ? 1.9 : 2.3) * s + turn * 0.4 * s, wide, INK, T.top * A)
  pad.cap(chest[0], chest[1], shoulder[0], shoulder[1] + 0.8 * s, wide, wide * 0.85, INK, T.top * A)
  // her skirt, flared from the waist to the knee
  if (her && sit < 0.6) {
    const w0 = 2.2 * s
    const hem = (o.hem ?? Math.sin(ph) * 0.8 * stride) * s
    const wH = lerp(3.6, 4.6, turn) * s
    const L = 7.4 * s
    const top = hipY - 2.4 * s
    const bot = hipY + L - 2.4 * s
    pad.poly([
      P(-w0, top), P(w0 * 0.9, top), P(wH + hem + 0.4 * s, bot), P(-wH + hem, bot + 0.3 * s),
    ], INK, T.top * A * 1.05)
  }
  if (!o.noLegs && turn < 0.5) limb(near, T.legs, ...legR)
  if (!o.noLegs && turn >= 0.5) limb(near, T.legs, ...legR)
  // the near arm, in front of the body; from behind, both are at the sides
  if (turn >= 0.5) arm(armF, T.top * 0.95)
  arm(armN, turn >= 0.5 ? T.top * 0.95 : (her ? T.skin + 0.12 : 1))
  // the neck and the head
  pad.cap(shoulder[0], shoulder[1] + 0.5 * s, neckTop[0], neckTop[1], 0.95 * s, 0.85 * s, INK, T.skin * A)
  const tilt = (o.tilt ?? 0) + (o.nod ?? 0) * 0.3
  if (turn < 0.5) {
    // in profile: the face, a nose, the hair over the crown and the back
    pad.disc(head[0], head[1], headR, INK, T.skin * A)
    pad.disc(head[0] + dir * headR * 0.95, head[1] + 0.35 * s, 0.55 * s, INK, T.skin * A)
    const hcx = head[0] - dir * 0.55 * s
    const hcy = head[1] - 0.55 * s
    pad.ell(hcx, hcy, headR * 1.02, headR * 0.86, dir * (-12 + tilt), INK, T.hair * A)
    if (her) pad.disc(head[0] - dir * 0.9 * s, head[1] - 0.2 * s, headR * 0.92, INK, T.hair * A)
    // the eye
    pad.set(Math.round(head[0] + dir * headR * 0.45), Math.round(head[1] + 0.1 * s), INK, 0.95 * A)
  } else {
    // from behind: all hair, the ears either side
    pad.disc(head[0] - headR * 1.02, head[1] + 0.3 * s, 0.7 * s, INK, T.skin * A)
    pad.disc(head[0] + headR * 1.02, head[1] + 0.3 * s, 0.7 * s, INK, T.skin * A)
    pad.ell(head[0], head[1], headR * 1.03, headR * 1.08, tilt, INK, T.hair * A)
    if (her) {
      const len = (o.hairLen ?? 8.5) * s
      const tip = (o.hairTilt ?? 0) * s
      pad.poly([
        [head[0] - headR * 1.05, head[1]], [head[0] + headR * 1.05, head[1]],
        [head[0] + headR * 1.2 + tip, head[1] + len], [head[0] - headR * 1.2 + tip, head[1] + len + 0.4 * s],
      ], INK, T.hair * A)
    }
  }
  // a ribbon in her hair, the one thing on her in the rose
  if (her && o.ribbon) {
    const rx = turn >= 0.5 ? head[0] + headR * 0.55 : head[0] - dir * headR * 0.75
    const ry = head[1] - headR * 0.35
    pad.set(Math.round(rx), Math.round(ry), ROSE, A)
    pad.set(Math.round(rx) + 1, Math.round(ry) - 1, ROSE, A)
    pad.set(Math.round(rx) - 1, Math.round(ry) - 1, ROSE, A)
  }
  return { head, shoulder, hip: [hx, hipY], hand: [armN.wr, armF.wr], neckTop }
}

// ── blossom, falling ────────────────────────────────────────────────────────
// Each petal has its own column, pace, sway and turn, all from its number,
// so a frame is a function of the clock and the fall never repeats in a way
// anyone sees. A petal is two cells lit when it lies flat to the glass, one
// when it is edge on, a diagonal pair between, and it turns as it falls. It
// is on the grid: the panel's own pixels, stepping as an LCD steps.
//   n        how many are falling at once
//   box      where they fall: [x0, y0, x1, y1]
//   v        how fast, cells a ms, and `drift` across; `sway` how far side
//            to side
//   from     the moment they begin; before it none, and they come in from
//            above rather than appearing mid-air
//   gust     a function of t answering an extra push across (the wind)
//   swirl    a point they are drawn round and into, and how much (0..1)
export function petals(pad, t, o) {
  const { n = 24, seed = 1, v = 0.012, drift = 0.004, sway = 2.2, from = -Infinity, a = 0.9, ink = ROSE } = o
  const [x0, y0, x1, y1] = o.box || [-4, -6, COLS + 4, ROWS + 2]
  const W = x1 - x0
  const H = y1 - y0
  const list = []
  for (let i = 0; i < n; i++) {
    const r1 = hash(i, seed)
    const r2 = hash(i, seed + 11)
    const r3 = hash(i, seed + 23)
    const r4 = hash(i, seed + 37)
    const pace = v * (0.65 + 0.7 * r3)
    const start = from + r1 * (H / pace) * 0.9
    const age = t - start
    if (age < 0) continue
    let y = y0 + wrap(age * pace, H)
    let x = x0 + wrap(r2 * W + age * drift * (0.6 + r4) + sway * Math.sin(age * 0.0021 * (0.7 + r4) + r1 * 6.28) + (o.gust ? o.gust(t) * (0.5 + r3) : 0), W)
    if (o.swirl) {
      const { cx, cy, k } = o.swirl
      const kk = clamp(k * (0.75 + 0.5 * r4))
      const ang = kk * 5 * (r2 > 0.5 ? 1 : -1)
      const dx = x - cx
      const dy = y - cy
      const c = Math.cos(ang)
      const sn = Math.sin(ang)
      x = cx + (dx * c - dy * sn) * (1 - kk * 0.55)
      y = cy + (dx * sn + dy * c) * (1 - kk * 0.55)
    }
    const spin = age * 0.006 * (0.6 + r4) + r1 * 10
    const c = Math.cos(spin)
    const X = Math.round(x)
    const Y = Math.round(y)
    const al = a * (o.alpha ? o.alpha(x, y, i) : 1) * (0.7 + 0.3 * r3)
    if (al <= 0.02) continue
    const k = ink === 'mix' ? (r4 > 0.3 ? ROSE : FAR) : ink
    pad.set(X, Y, k, al)
    if (Math.abs(c) > 0.72) pad.set(X + 1, Y, k, al * 0.85)
    else if (Math.abs(c) > 0.32) pad.set(X + (c > 0 ? 1 : -1), Y + 1, k, al * 0.7)
    list.push([X, Y])
  }
  return list
}

// ── the stars ───────────────────────────────────────────────────────────────
// A sky of `n` stars inside `box`, each a cell, some a small cross, each
// twinkling on its own clock. `mask(x, y)` can take any of them down (a light
// coming up, a front going over them).
export function sky(pad, t, o = {}) {
  const { n = 40, seed = 5, box = [0, 0, COLS, 50], ink = FAR, a = 1 } = o
  const [x0, y0, x1, y1] = box
  for (let i = 0; i < n; i++) {
    const x = Math.floor(x0 + hash(i, seed) * (x1 - x0))
    const y = Math.floor(y0 + hash(i, seed + 3) * (y1 - y0))
    const tw = 0.55 + 0.45 * Math.sin(t * 0.004 * (0.5 + hash(i, seed + 7)) + hash(i, seed + 9) * 6.28)
    const k = (o.mask ? o.mask(x, y, i) : 1) * a
    const al = tw * k * (0.5 + 0.5 * hash(i, seed + 13))
    if (al < 0.05) continue
    pad.set(x, y, ink, al)
    if (hash(i, seed + 17) > 0.86) {
      pad.set(x + 1, y, ink, al * 0.5); pad.set(x - 1, y, ink, al * 0.5)
      pad.set(x, y + 1, ink, al * 0.5); pad.set(x, y - 1, ink, al * 0.5)
    }
  }
}

// a sparkle: a point with four arms, `r` long, for a star that is a light
export function sparkle(pad, x, y, r, ink = INK, a = 1, diag = 0) {
  const X = Math.round(x)
  const Y = Math.round(y)
  pad.set(X, Y, ink, a)
  for (let k = 1; k <= r; k++) {
    const f = a * (1 - ((k - 1) / (r + 0.5)) ** 1.6)
    pad.set(X + k, Y, ink, f); pad.set(X - k, Y, ink, f); pad.set(X, Y + k, ink, f); pad.set(X, Y - k, ink, f)
  }
  for (let k = 1; k <= diag; k++) {
    const f = a * 0.55 * (1 - (k - 1) / (diag + 0.5))
    pad.set(X + k, Y + k, ink, f); pad.set(X - k, Y - k, ink, f); pad.set(X + k, Y - k, ink, f); pad.set(X - k, Y + k, ink, f)
  }
}

// ── the mark, on this grid ──────────────────────────────────────────────────
// The intro's mark (pixmark.js `markOn`, cut as `I_CUT`), and what the other
// tellings need to know of it: the middle, the ring's ellipse (its tilt and
// its two radii, through the middle of the band), every ring cell's angle
// round that ellipse and whether it is on the near half, every star cell's
// reach from the middle, and the whole of it as cells.
let MARK = null
export function mark() {
  if (MARK) return MARK
  const m = markOn(MARK_N, MX, MY, { ...MARK_CUT, ss: 6 })
  const tilt = ECL.tilt
  const t = rad(tilt)
  const c = Math.cos(t)
  const s = Math.sin(t)
  let ru = 0
  let rv = 0
  const ring = m.ring.map((p) => {
    const dx = p.x - m.cx
    const dy = p.y - m.cy
    const u = dx * c + dy * s
    const v = -dx * s + dy * c
    ru = Math.max(ru, Math.abs(u))
    rv = Math.max(rv, Math.abs(v))
    return { x: p.x, y: p.y, u, v, near: p.near }
  })
  // through the middle of the band: the outermost cell less about half of
  // the band's width
  const RX = ru - 1.6
  const RY = rv - 1.4
  for (const p of ring) p.th = Math.atan2(p.v / RY, p.u / RX)
  const rMax = Math.max(...m.star.map((p) => p.r))
  const star = m.star.map((p) => ({ x: p.x, y: p.y, r: p.r, k: p.r / rMax, ang: Math.atan2(p.y - m.cy, p.x - m.cx) }))
  const at = (th, k = 1, kx = k, ky = k) => {
    const u = RX * kx * Math.cos(th)
    const v = RY * ky * Math.sin(th)
    return [m.cx + u * c - v * s, m.cy + u * s + v * c]
  }
  MARK = { cx: m.cx, cy: m.cy, tilt, RX, RY, ring, star, all: m.all, at }
  return MARK
}
// the mark's cells, all of it lit, the ring in `ringInk`
export function markCellsLit(ringInk = INK, a = 1) {
  const m = mark()
  const out = []
  for (const p of m.star) out.push([p.x, p.y, INK, 0, a])
  for (const p of m.ring) out.push([p.x, p.y, ringInk, 0, a])
  return out
}

// ── the gathering ───────────────────────────────────────────────────────────
// Any drawing, into a set of cells (the ring, the star, the mark): each lit
// cell of `from` is sent to a cell of `to` so that together they travel as
// little as they can and no two ways cross (pixmark.js `transport`), and
// leaves on its own moment (`delay`, a function of the cell), taking
// `flight`, bending `bend` cells off its line, all the same way round. The
// smaller list is spread over the larger. Worked out in steps: `step(ms)`
// works on it for that long, and the answer is there once it is done.
export function glideOf(from, to, { delay = () => 0, flight = 520, bend = 2.6, ink = INK } = {}) {
  let gen = null
  let bits = null
  const make = function* () {
    const order = (a, b) => (a[1] - b[1]) || (a[0] - b[0])
    const src = [...from].sort(order)
    const dst = to.map((p) => [p[0], p[1]]).sort(order)
    const n = Math.max(src.length, dst.length)
    const both = []
    for (let k = 0; k < n; k++) both.push([src[Math.floor((k * src.length) / n)], dst[Math.floor((k * dst.length) / n)]])
    yield
    const assign = yield* transport(both.map(([p]) => p), both.map(([, q]) => q))
    const out = []
    both.forEach(([p], i) => {
      const q = both[assign[i]][1]
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
      const b = Math.min(bend, len * 0.16)
      out.push({
        sx: p[0], sy: p[1], dx: q[0], dy: q[1], ink0: p[2] || INK, a0: p[4] ?? 1,
        delay: delay(p), flight, nx: (-(q[1] - p[1]) / len) * b, ny: ((q[0] - p[0]) / len) * b,
      })
    })
    return out
  }
  const step = (ms) => {
    if (bits) return true
    if (!gen) gen = make()
    const t0 = performance.now()
    do {
      const r = gen.next()
      if (r.done) { bits = r.value; return true }
    } while (performance.now() - t0 < ms)
    return false
  }
  // where every pixel is `t` ms into the gathering
  const at = (t, out = []) => {
    step(Infinity)
    for (const b of bits) {
      const k = (t - b.delay) / b.flight
      if (k <= 0) { out.push([b.sx, b.sy, b.ink0, 0, b.a0]); continue }
      if (k >= 1) { out.push([b.dx, b.dy, ink, 0, 1]); continue }
      const e = inOut(k)
      const arc = Math.sin(Math.PI * e)
      out.push([b.sx + (b.dx - b.sx) * e + b.nx * arc, b.sy + (b.dy - b.sy) * e + b.ny * arc, e > 0.5 ? ink : b.ink0, 0, lerp(b.a0, 1, e)])
    }
    return out
  }
  const ms = () => { step(Infinity); return Math.max(...bits.map((b) => b.delay + b.flight)) }
  return { step, at, ms }
}

// ── the story ───────────────────────────────────────────────────────────────
// What PixelStory wants of a story, from a frame function `draw(t)` that
// answers `{ cells, wash, glow, key }`. The pink is the intro's (pixmark.js
// `washFrom`), leaving from `wash.x, wash.y` at `wash.at`, `wash.ms` to the
// corners. `live` keeps it asked for past its end (the petals still falling
// round the mark). `prep(ms)` is the heavy start, worked a little at a time
// on the early frames. A frame past the end, unless it is live, is the last.
export function tale({ end, draw, wash = null, live = false, prep = null, panel, front }) {
  let lastKey = null
  let last = null
  const frame = (t) => {
    if (prep) prep(3)
    const u = Math.max(0, live ? t : Math.min(t, end))
    const f = draw(u)
    const w = wash ? washFrom(u - wash.at, wash.x, wash.y, wash.ms ?? 1300) : null
    const key = f.key ?? `t${Math.round(u)}`
    if (key === lastKey && last) return last
    lastKey = key
    last = { key, cells: f.cells, wash: f.wash !== undefined ? f.wash : w, glow: f.glow || null, ink: null }
    return last
  }
  return {
    cols: COLS, rows: ROWS, end, fine: true, frame, panel, front,
    live: live ? [end, Infinity] : null,
    prime: (b = 0) => { if (prep) prep(b) },
  }
}
// the pink's front from a point, for a story that lays the pink itself
export { washFrom }

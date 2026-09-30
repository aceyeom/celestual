// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KIT, for the other ways of telling it                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The intro, the door and the mutual tell one story (pixmark.js): the run,
// the catch, the glide into the mark. The owner asked for other tellings,
// more romantic and more real, so each screen can have its own. This is
// what they are drawn with, on the intro's glass (PixelStory.jsx draws
// them): a story is still a function of the clock that answers lit cells.
//
// ── the pitch ───────────────────────────────────────────────────────────────
// The intro is drawn on 95 cells by 75, the pitch every letter on the wall
// is lit at. The tellings can be drawn at that pitch or finer (`grid`, `f`
// cells to each of the intro's), since nothing in them is drawn cell by
// cell: they are shapes, laid between the cells wherever the moment puts
// them. At `f` 2 the glass is 189 by 149 and a face in profile has a nose.
// The mark lands in the same place at any pitch: its middle is the glass's.
//
//   `Pad`      a sheet of the grid with a margin round it, shapes laid on it
//              anti-aliased, and `union`, many shapes laid as one silhouette
//   `softPetals`  blossom falling, each petal turning as it falls
//   `mark(f)`  the mark on the grid, its ring and its star, with each ring
//              cell's angle round the ellipse and each star cell's reach
//   `glideOf`  the gathering the intro does (pixels finding the mark along
//              the shortest ways, pixmark.js `transport`), for any drawing
//   `tale`     the story object PixelStory wants, from a frame function

import { markOn, transport, washFrom, washTimes, mixHex, MARK_CUT } from '../pixmark.js'
import { ECL, rad } from '../mark.js'

// the inks a cell can carry (PixelStory.jsx `fillOf`): the screen's near
// ink, its far ink at half, the rose, and the mid ink
export const INK = 1
export const FAR = 2
export const ROSE = 3
export const MID = 4

// The glass at `f` cells to each of the intro's: 95 by 75 at 1, 189 by 149
// at 2, and the mark 77 cells (153) with its middle on the glass's.
export function grid(f = 1) {
  const cols = 94 * f + 1
  const rows = 74 * f + 1
  const markN = 76 * f + 1
  return { f, cols, rows, markN, ox: (cols - markN) / 2, oy: (rows - markN) / 2 }
}

// ── numbers ─────────────────────────────────────────────────────────────────
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, k) => a + (b - a) * k
export const smooth = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }
export const inOut = (k) => { const x = clamp(k); return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2 }
export const outCubic = (k) => 1 - (1 - clamp(k)) ** 3
export const outBack = (k, s = 1.7) => { const x = clamp(k) - 1; return 1 + x * x * ((s + 1) * x + s) }
// how far through [a, b] the clock is, 0 to 1
export const span = (t, a, b) => clamp((t - a) / (b - a))
export const D = Math.PI / 180
// The least jerk there is between two stillnesses, which is how a hand
// reaches and a head turns (it is the path a voluntary movement takes):
// still at both ends, and still in its acceleration at both ends.
export const sm5 = (k) => { const x = clamp(k); return x * x * x * (x * (6 * x - 15) + 10) }
// Arriving and settling: a little past, and back, the way a head turns and
// a weight comes to rest. The step response of a spring a little under
// damping (still at the start, as the least-jerk curve is), its overshoot
// `over` of the way, its last wobble drawn in so that it is still, and
// exactly there, at 1.
export const settle = (k, over = 0.06) => {
  const x = clamp(k)
  const lo = Math.log(Math.max(1e-4, over))
  const z = -lo / Math.sqrt(Math.PI * Math.PI + lo * lo)
  const wd = Math.PI / 0.62
  const w = wd / Math.sqrt(1 - z * z)
  const dev = Math.exp(-z * w * x) * (Math.cos(wd * x) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * x))
  return 1 - dev * (1 - sm5(x))
}
// A value made of moves: `v0`, and each [from, to, by, ease] adds `by` over
// the clock from `from` to `to` on its ease (sm5 unless given). Moves may
// overlap, and do, the way one part of a gesture starts before the last
// has finished; none of them overshoots unless its ease does.
export function moves(t, v0, list) {
  let v = v0
  for (const [a, b, by, ease] of list) {
    if (t <= a) continue
    v += by * (t >= b ? 1 : (ease || sm5)((t - a) / (b - a)))
  }
  return v
}
// a number from two others, the same every time it is asked
export const hash = (a, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
const wrap = (v, n) => ((v % n) + n) % n

// ── flat shapes ─────────────────────────────────────────────────────────────
// What `Pad.union` lays: a disc (k 0), a capsule tapering from `ra` to `rb`
// (k 1), an ellipse turned `ang` radians (k 2), a polygon (k 3, `convex` if
// it is). `g` grows any of them, for the air round a body.
function hit(s, x, y, g) {
  if (s.k === 0) { const dx = x - s.cx; const dy = y - s.cy; const r = s.r + g; return dx * dx + dy * dy <= r * r }
  if (s.k === 1) {
    const dx = s.bx - s.ax
    const dy = s.by - s.ay
    const L2 = dx * dx + dy * dy || 1e-9
    const k = clamp(((x - s.ax) * dx + (y - s.ay) * dy) / L2)
    const r = s.ra + (s.rb - s.ra) * k + g
    const ex = x - s.ax - dx * k
    const ey = y - s.ay - dy * k
    return ex * ex + ey * ey <= r * r
  }
  if (s.k === 2) {
    const c = s.c ?? (s.c = Math.cos(s.ang))
    const sn = s.s ?? (s.s = Math.sin(s.ang))
    const dx = x - s.cx
    const dy = y - s.cy
    const u = (dx * c + dy * sn) / (s.rx + g)
    const v = (-dx * sn + dy * c) / (s.ry + g)
    return u * u + v * v <= 1
  }
  const p = s.pts
  let inside = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]
    const [xj, yj] = p[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function boxOf(s, g) {
  if (s.k === 0) return [s.cx - s.r - g, s.cy - s.r - g, s.cx + s.r + g, s.cy + s.r + g]
  if (s.k === 1) {
    const r = Math.max(s.ra, s.rb) + g
    return [Math.min(s.ax, s.bx) - r, Math.min(s.ay, s.by) - r, Math.max(s.ax, s.bx) + r, Math.max(s.ay, s.by) + r]
  }
  if (s.k === 2) {
    const c = Math.cos(s.ang)
    const sn = Math.sin(s.ang)
    const a = s.rx + g
    const b = s.ry + g
    const hw = Math.sqrt(a * a * c * c + b * b * sn * sn)
    const hh = Math.sqrt(a * a * sn * sn + b * b * c * c)
    return [s.cx - hw, s.cy - hh, s.cx + hw, s.cy + hh]
  }
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity
  for (const [x, y] of s.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return [x0 - g, y0 - g, x1 + g, y1 + g]
}
const CHANNEL = ['#ff0000', '#00ff00', '#0000ff']
// A flat shape onto a canvas path, clockwise on the glass (y down), so
// that every piece of a silhouette winds the same way and the path's
// non-zero fill is their union.
function trace(x, s) {
  if (s.k === 0) {
    x.moveTo(s.cx + s.r, s.cy)
    x.arc(s.cx, s.cy, s.r, 0, Math.PI * 2, false)
    return
  }
  if (s.k === 2) {
    const c = Math.cos(s.ang)
    const sn = Math.sin(s.ang)
    x.moveTo(s.cx + s.rx * c, s.cy + s.rx * sn)
    x.ellipse(s.cx, s.cy, Math.max(0.01, s.rx), Math.max(0.01, s.ry), s.ang, 0, Math.PI * 2, false)
    return
  }
  if (s.k === 1) {
    // a tapered capsule: its two round ends, and the band between them
    // along the lines that touch both
    x.moveTo(s.ax + s.ra, s.ay)
    x.arc(s.ax, s.ay, s.ra, 0, Math.PI * 2, false)
    x.moveTo(s.bx + s.rb, s.by)
    x.arc(s.bx, s.by, s.rb, 0, Math.PI * 2, false)
    const dx = s.bx - s.ax
    const dy = s.by - s.ay
    const d = Math.hypot(dx, dy)
    if (d <= Math.abs(s.ra - s.rb) + 1e-6) return
    const ux = dx / d
    const uy = dy / d
    const k = (s.ra - s.rb) / d
    const q = Math.sqrt(Math.max(0, 1 - k * k))
    const e1x = -uy * q + ux * k
    const e1y = ux * q + uy * k
    const e2x = uy * q + ux * k
    const e2y = -ux * q + uy * k
    poly(x, [[s.ax + s.ra * e1x, s.ay + s.ra * e1y], [s.bx + s.rb * e1x, s.by + s.rb * e1y], [s.bx + s.rb * e2x, s.by + s.rb * e2y], [s.ax + s.ra * e2x, s.ay + s.ra * e2y]])
    return
  }
  poly(x, s.pts)
}
function poly(x, p) {
  if (p.length < 3) return
  let area = 0
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) area += p[j][0] * p[i][1] - p[i][0] * p[j][1]
  if (area >= 0) {
    x.moveTo(p[0][0], p[0][1])
    for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1])
  } else {
    x.moveTo(p[p.length - 1][0], p[p.length - 1][1])
    for (let i = p.length - 2; i >= 0; i--) x.lineTo(p[i][0], p[i][1])
  }
  x.closePath()
}

// ── the pad ─────────────────────────────────────────────────────────────────
// The grid at pitch `f` and a margin round it. A cell holds one ink and how
// lit it is. A shape covering most of a cell takes it, whatever was there
// (it is in front); a shape only grazing a cell lights it only if it is
// empty or lit less, so edges are soft and nothing behind shows through a
// body. Laying ink 0 cuts: the air between two things. Coordinates are the
// pad's own cells.
const SS = 4
export class Pad {
  constructor(f = 1) {
    const g = grid(f)
    this.f = f
    this.cols = g.cols
    this.rows = g.rows
    this.m = 16 * f
    this.w = g.cols + 2 * this.m
    this.h = g.rows + 2 * this.m
    this.ink = new Uint8Array(this.w * this.h)
    this.a = new Float32Array(this.w * this.h)
    this.touched = new Int32Array(this.w * this.h)
    this.count = 0
    // a camera for the loose shapes: everything laid with `fill` and `set`
    // is scaled `k` about (cx, cy); null is none
    this.zoom = null
  }
  clear() {
    for (let k = 0; k < this.count; k++) { const i = this.touched[k]; this.ink[i] = 0; this.a[i] = 0 }
    this.count = 0
    return this
  }
  at(x, y) {
    const i = x + this.m
    const j = y + this.m
    return i < 0 || j < 0 || i >= this.w || j >= this.h ? -1 : j * this.w + i
  }
  // a cell, lit outright (or cut, with ink 0), through the camera
  set(x, y, ink, a = 1) {
    const z = this.zoom
    if (z) { x = z.cx + (x - z.cx) * z.k; y = z.cy + (y - z.cy) * z.k }
    this.put(Math.round(x), Math.round(y), ink, a)
  }
  // a cell as it is
  put(x, y, ink, a = 1) {
    const i = this.at(x, y)
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
      if (this.a[i]) this.a[i] *= 1 - smooth((cov - 0.2) / 0.55)
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
  // any shape, by whether a point is in it, over the box it is in, through
  // the camera
  fill(inside, x0, y0, x1, y1, ink, a = 1) {
    const z = this.zoom
    if (z) {
      const f = inside
      inside = (x, y) => f(z.cx + (x - z.cx) / z.k, z.cy + (y - z.cy) / z.k)
      x0 = z.cx + (x0 - z.cx) * z.k; x1 = z.cx + (x1 - z.cx) * z.k
      y0 = z.cy + (y0 - z.cy) * z.k; y1 = z.cy + (y1 - z.cy) * z.k
    }
    const X0 = Math.max(-this.m, Math.floor(x0))
    const Y0 = Math.max(-this.m, Math.floor(y0))
    const X1 = Math.min(this.cols + this.m - 1, Math.ceil(x1))
    const Y1 = Math.min(this.rows + this.m - 1, Math.ceil(y1))
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
    const s = { k: 2, cx, cy, rx, ry, ang: deg * D }
    const [x0, y0, x1, y1] = boxOf(s, 0)
    return this.fill((x, y) => hit(s, x, y, 0), x0, y0, x1, y1, ink, a)
  }
  cap(ax, ay, bx, by, ra, rb, ink, a = 1) {
    const s = { k: 1, ax, ay, bx, by, ra, rb }
    const [x0, y0, x1, y1] = boxOf(s, 0)
    return this.fill((x, y) => hit(s, x, y, 0), x0, y0, x1, y1, ink, a)
  }
  line(ax, ay, bx, by, ink, a = 1, w = 0.5) { return this.cap(ax, ay, bx, by, w, w, ink, a) }
  poly(pts, ink, a = 1) {
    const s = { k: 3, pts }
    const [x0, y0, x1, y1] = boxOf(s, 0)
    return this.fill((x, y) => hit(s, x, y, 0), x0, y0, x1, y1, ink, a)
  }
  rect(x, y, w, h, ink, a = 1) {
    return this.fill((px, py) => px >= x && px <= x + w && py >= y && py <= y + h, x, y, x + w, y + h, ink, a)
  }
  // Many flat shapes laid as one silhouette. They are drawn as one path on
  // a canvas the size of the pad, a pixel to a cell, every piece of it
  // wound the same way round so that where two pieces overlap there is no
  // seam and no hole, and the canvas's own anti-aliasing is what a cell is
  // lit by: how much of it the silhouette covers. With `g`, the silhouette
  // is grown by `g` all round (its outline stroked as well as filled), and
  // with ink 0 that is cut out of what is already laid: the line of light
  // round a body in front of another.
  union(list, ink, a = 1, g = 0) {
    return this.layers([[list, ink, a, g]])
  }
  // Several silhouettes, laid one after another as `union` lays each, [list,
  // ink, alpha, grow, air] apiece. Reading the canvas back is the dear part
  // (it is when the canvas draws), so they are drawn three at a time into
  // one canvas, each in a colour of its own on black, added (a red, a
  // green, a blue), and read back once: each channel is one silhouette's
  // coverage. `air`, in cells, cuts the silhouette grown by that much out
  // of what is already laid before the silhouette is laid itself (the line
  // of light round a body in front of another), grown here from its own
  // coverage rather than drawn a second time.
  layers(specs) {
    if (typeof document === 'undefined') return this
    const live = specs.filter((q) => q[0] && q[0].length)
    for (let i = 0; i < live.length; i += 3) this.pass(live.slice(i, i + 3))
    return this
  }
  pass(group) {
    const x = this.canvas().ctx
    x.setTransform(1, 0, 0, 1, 0, 0)
    x.globalCompositeOperation = 'source-over'
    x.fillStyle = '#000'
    x.fillRect(0, 0, this.w, this.h)
    x.globalCompositeOperation = 'lighter'
    x.setTransform(1, 0, 0, 1, this.m, this.m)
    x.lineJoin = 'round'
    const boxes = group.map(([list, , , g = 0, air = 0], j) => {
      let X0 = Infinity; let Y0 = Infinity; let X1 = -Infinity; let Y1 = -Infinity
      x.beginPath()
      for (const s of list) {
        const b = boxOf(s, g)
        if (b[0] < X0) X0 = b[0]; if (b[1] < Y0) Y0 = b[1]; if (b[2] > X1) X1 = b[2]; if (b[3] > Y1) Y1 = b[3]
        trace(x, s)
      }
      const c = CHANNEL[j]
      x.fillStyle = c
      x.fill('nonzero')
      if (g > 0) {
        x.lineWidth = 2 * g
        x.strokeStyle = c
        x.stroke()
      }
      const pad = Math.ceil(air) + 2
      const bx = Math.max(0, Math.floor(X0) + this.m - pad)
      const by = Math.max(0, Math.floor(Y0) + this.m - pad)
      return [bx, by, Math.min(this.w, Math.ceil(X1) + this.m + pad) - bx, Math.min(this.h, Math.ceil(Y1) + this.m + pad) - by]
    })
    let bx = Infinity; let by = Infinity; let ex = -Infinity; let ey = -Infinity
    for (const [a, b, w, h] of boxes) { bx = Math.min(bx, a); by = Math.min(by, b); ex = Math.max(ex, a + w); ey = Math.max(ey, b + h) }
    const bw = ex - bx
    const bh = ey - by
    if (bw <= 0 || bh <= 0) return
    const d = x.getImageData(bx, by, bw, bh).data
    group.forEach(([, ink, a = 1, , air = 0], j) => {
      const [lx, ly, lw, lh] = boxes[j]
      if (lw <= 0 || lh <= 0) return
      const ox = lx - bx
      const oy = ly - by
      const n = lw * lh
      const cv = this.cov && this.cov.length >= n ? this.cov : (this.cov = new Float32Array(n * 2))
      for (let jj = 0; jj < lh; jj++) {
        const row = ((oy + jj) * bw + ox) * 4 + j
        for (let i = 0; i < lw; i++) cv[jj * lw + i] = d[row + i * 4] / 255
      }
      const m = this.m
      if (air > 0) {
        // the silhouette grown by `air`: each cell as covered as the most
        // covered cell within reach, less the distance to it; only where
        // something is already laid, and not where the silhouette itself
        // will be laid over it
        const R = air > 1 ? 2 : 1
        const ker = []
        for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) { const w = clamp(air - Math.hypot(u, v) + 1); if ((u || v) && w > 0) ker.push(u, v, w) }
        for (let jj = 0; jj < lh; jj++) {
          const gy = ly + jj
          for (let i = 0; i < lw; i++) {
            const gi = gy * this.w + lx + i
            if (!this.a[gi]) continue
            let c = cv[jj * lw + i]
            if (c >= 0.5) continue
            for (let q = 0; q < ker.length; q += 3) {
              const w = ker[q + 2]
              if (w <= c) continue
              const ii = i + ker[q]
              const vv = jj + ker[q + 1]
              if (ii < 0 || vv < 0 || ii >= lw || vv >= lh) continue
              const k = cv[vv * lw + ii] * w
              if (k > c) c = k
            }
            if (c > 0.01) this.paint(lx + i - m, gy - m, 0, 1, c)
          }
        }
      }
      // (Pad.paint, inlined: this is every lit cell of every silhouette)
      const A = this.a
      const K = this.ink
      for (let jj = 0; jj < lh; jj++) {
        const base = (ly + jj) * this.w + lx
        for (let i = 0; i < lw; i++) {
          const c = cv[jj * lw + i]
          if (c <= 0.1) continue
          const u = (c - 0.1) / 0.7
          const lit = a * (u >= 1 ? 1 : u * u * (3 - 2 * u))
          if (lit < 0.02) continue
          const gi = base + i
          const cur = A[gi]
          if (c >= 0.5 || !cur || lit > cur) {
            if (!K[gi] && !cur) this.touched[this.count++] = gi
            K[gi] = ink
            A[gi] = lit
          }
        }
      }
    })
  }
  // another pad's cells laid on this one as they are (a background worked
  // out less often than every frame)
  lay(other) {
    for (let k = 0; k < other.count; k++) {
      const i = other.touched[k]
      if (!other.a[i] || !other.ink[i]) continue
      if (!this.ink[i] && !this.a[i]) this.touched[this.count++] = i
      this.ink[i] = other.ink[i]
      this.a[i] = other.a[i]
    }
    return this
  }
  canvas() {
    if (this.cv) return this.cv
    const el = document.createElement('canvas')
    el.width = this.w
    el.height = this.h
    this.cv = { el, ctx: el.getContext('2d', { willReadFrequently: true }) }
    return this.cv
  }
  // lit cells, in the story's form: [x, y, ink, heat, alpha]
  cells(out = []) {
    for (let k = 0; k < this.count; k++) {
      const i = this.touched[k]
      const a = this.a[i]
      if (a < 0.03 || !this.ink[i]) continue
      out.push([(i % this.w) - this.m, Math.floor(i / this.w) - this.m, this.ink[i], 0, Math.round(Math.min(1, a) * 16) / 16])
    }
    return out
  }
}

// ── blossom, falling ────────────────────────────────────────────────────────
// Each petal has its own column, pace, sway and turn, all from its number,
// so a frame is a function of the clock and the fall never repeats in a way
// anyone sees. Each is a small ellipse turning as it falls, broad when it
// lies flat to the glass and a sliver edge on, laid between the cells so it
// drifts rather than steps. In the intro's cells (`box`, `size`, the pace),
// laid at the pad's pitch.
//   n        how many are falling at once
//   box      where they fall: [x0, y0, x1, y1]
//   v        how fast, cells a ms, and `drift` across; `sway` how far side
//            to side
//   from     the moment they begin; before it none, and they come in from
//            above rather than appearing mid-air
//   gust     a function of t answering an extra push across (the wind)
export function softPetals(pad, t, o) {
  const { n = 24, seed = 1, v = 0.012, drift = 0.004, sway = 2.2, from = -Infinity, a = 0.95, ink = ROSE, size = 1 } = o
  const f = pad.f
  const [x0, y0, x1, y1] = o.box || [-4, -6, 99, 77]
  const W = x1 - x0
  const H = y1 - y0
  const list = []
  for (let i = 0; i < n; i++) {
    const r1 = hash(i, seed)
    const r2 = hash(i, seed + 11)
    const r3 = hash(i, seed + 23)
    const r4 = hash(i, seed + 37)
    const pace = v * (0.65 + 0.7 * r3)
    const age = t - (from + r1 * (H / pace) * 0.9)
    if (age < 0) continue
    const y = y0 + wrap(age * pace, H)
    const x = x0 + wrap(r2 * W + age * drift * (0.6 + r4) + sway * Math.sin(age * 0.0019 * (0.7 + r4) + r1 * 6.28) + (o.gust ? o.gust(t) * (0.5 + r3) : 0), W)
    const spin = age * 0.004 * (0.6 + r4) + r1 * 10
    const k = size * (0.8 + 0.5 * r3) * f
    if (o.alpha && o.alpha(x, y, i) <= 0.02) continue
    list.push({ k: 2, cx: x * f, cy: y * f, rx: (0.55 + 0.75 * Math.abs(Math.cos(spin))) * k, ry: 0.62 * k, ang: spin * 0.7 })
  }
  pad.union(list, ink, a)
}

// ── the mark, on the grid ───────────────────────────────────────────────────
// The intro's mark (pixmark.js `markOn`), rasterised for the pitch, and what
// the tellings need to know of it: the middle, the ring's ellipse (its tilt
// and its two radii, through the middle of the band), every ring cell's
// angle round that ellipse, every star cell's reach from the middle, and
// the whole of it as cells.
const MARKS = new Map()
export function mark(f = 1) {
  if (MARKS.has(f)) return MARKS.get(f)
  const g = grid(f)
  const m = markOn(g.markN, g.ox, g.oy, { ...MARK_CUT, ss: f > 1 ? 4 : 6 })
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
  const RX = ru - 1.6 * f
  const RY = rv - 1.4 * f
  for (const p of ring) p.th = Math.atan2(p.v / RY, p.u / RX)
  const rMax = Math.max(...m.star.map((p) => p.r))
  const star = m.star.map((p) => ({ x: p.x, y: p.y, r: p.r, k: p.r / rMax, ang: Math.atan2(p.y - m.cy, p.x - m.cx) }))
  const at = (th, k = 1, kx = k, ky = k) => {
    const u = RX * kx * Math.cos(th)
    const v = RY * ky * Math.sin(th)
    return [m.cx + u * c - v * s, m.cy + u * s + v * c]
  }
  const out = { f, cx: m.cx, cy: m.cy, tilt, RX, RY, ring, star, all: m.all, at }
  MARKS.set(f, out)
  return out
}

// ── the gathering ───────────────────────────────────────────────────────────
// Any drawing, into a set of cells (the ring, the star, the mark): each lit
// cell of `from` is sent to a cell of `to` so that together they travel as
// little as they can and no two ways cross (pixmark.js `transport`), and
// leaves on its own moment (`delay`, a function of the cell), taking
// `flight`, bending `bend` cells off its line, all the same way round. The
// smaller list is spread over the larger. `transport` counts in twelve bits,
// so a drawing of more cells than that (a body at the fine pitch) sends an
// even share of them and lets the rest go out where they are. Worked out in
// steps: `step(ms)` works on it for that long, and the answer is there once
// it is done.
const MOST = 4000
export function glideOf(from, to, { delay = () => 0, flight = 520, bend = 2.6, ink = INK } = {}) {
  let gen = null
  let bits = null
  let left = []
  const thin = (list) => {
    if (list.length <= MOST) return [list, []]
    const keep = []
    const drop = []
    list.forEach((p, i) => (Math.floor(((i + 1) * MOST) / list.length) > Math.floor((i * MOST) / list.length) ? keep : drop).push(p))
    return [keep, drop]
  }
  const make = function* () {
    const order = (a, b) => (a[1] - b[1]) || (a[0] - b[0])
    const [src, drop] = thin([...from].sort(order))
    left = drop
    const [dst] = thin(to.map((p) => [p[0], p[1]]).sort(order))
    const n = Math.min(MOST, Math.max(src.length, dst.length))
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
    // (the share of a large drawing that is not sent goes out where it is)
    const fade = 1 - clamp(t / 220)
    if (fade > 0) for (const p of left) out.push([p[0], p[1], p[2] || INK, 0, (p[4] ?? 1) * fade])
    return out
  }
  const ms = () => { step(Infinity); return Math.max(...bits.map((b) => b.delay + b.flight)) }
  return { step, at, ms }
}

// ── the story ───────────────────────────────────────────────────────────────
// What PixelStory wants of a story, from a frame function `draw(t)` that
// answers `{ cells, wash, glow, key }`, at pitch `f`. The pink is the
// intro's (pixmark.js `washFrom`), leaving from `wash.x, wash.y` (the pad's
// cells) at `wash.at`, `wash.ms` to the corners. `live` keeps it asked for
// past its end (the petals still falling round the mark). `prep(ms)` is the
// heavy start, worked a little at a time on the early frames. A frame past
// the end, unless it is live, is the last.
//
// Told as the intro (Intro.jsx), a telling is lit in the look the intro
// drew, as its own story is (pixmark.js `introStory`): `look` is the panel
// it turns to (`panel`, or a `spectrum` of them laid `axis` or `even`), the
// lighter step at its front (`front`), and the ink going from the night's to
// the look's as the colour goes out (`ink`). And it answers the moments the
// phone turns on (`times`): the colour leaving, at the top band, at the
// bottom band and covering the glass, the two of them holding each other
// (`hold`) and the mark whole (`done`).
export function tale({ f = 1, end, draw, wash = null, live = false, prep = null, panel, front, look = null, hold = null, done = null }) {
  const g = grid(f)
  const L = look || {}
  const ink = L.ink || null
  const inkAt = (u) => {
    if (!ink || !wash) return null
    const k = clamp((u - wash.at) / ((wash.ms ?? 1300) * 0.6))
    return k <= 0 ? ink[0] : k >= 1 ? ink[1] : mixHex(ink[0], ink[1], Math.round(k * 8) / 8)
  }
  let lastKey = null
  let last = null
  const frame = (t) => {
    if (prep) prep(3)
    const u = Math.max(0, live ? t : Math.min(t, end))
    const fr = draw(u)
    const w = wash ? washFrom(u - wash.at, wash.x, wash.y, wash.ms ?? 1300) : null
    const key = fr.key ?? `t${Math.round(u)}`
    if (key === lastKey && last) return last
    lastKey = key
    last = { key, cells: fr.cells, wash: fr.wash !== undefined ? fr.wash : w, glow: fr.glow || null, ink: inkAt(u) }
    return last
  }
  const times = wash ? { glow: wash.at, ...washTimes(wash.at, wash.ms ?? 1300), catch: hold ?? wash.at, done: done ?? end, end } : null
  // The heavy start, worked ahead of the clock whenever the page is idle
  // between frames, once asked for (`prime`), so that a telling told at once
  // (the intro's) draws its frames and does not work out on them what its
  // hair and its cloth will be doing.
  let ahead = null
  const workAhead = () => {
    if (ahead || !prep || typeof window === 'undefined') return
    const idle = window.requestIdleCallback
    const later = idle ? (fn) => idle(fn, { timeout: 60 }) : (fn) => setTimeout(fn, 8)
    ahead = true
    const go = (d) => {
      const ms = d && d.timeRemaining ? Math.max(2, Math.min(12, d.timeRemaining() - 1)) : 4
      if (prep(ms) === false) later(go)
    }
    later(go)
  }
  return {
    cols: g.cols, rows: g.rows, end, fine: true, frame, times,
    // the pink alone at a moment, without drawing it (PixelStory.jsx)
    washAt: (t) => (wash ? washFrom(t - wash.at, wash.x, wash.y, wash.ms ?? 1300) : null),
    panel: L.panel || panel, front: L.front !== undefined ? L.front : front,
    spectrum: L.spectrum || null, axis: L.axis ?? null, even: !!L.even,
    live: live ? [end, Infinity] : null,
    // the heavy start, and `b` ms more of it; answers whether all of it is
    // done (a story with none is always done)
    prime: (b = 0) => {
      if (!prep) return true
      workAhead()
      return prep(b) !== false
    },
  }
}
// the pink's front from a point, for a story that lays the pink itself
export { washFrom }

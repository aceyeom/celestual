// ── the colour, leaving the phone ──────────────────────────────────────────
// When a letter goes up its colour runs out of the phone through the writer's
// world. The shape is the product's own wash: `hash3`, `noise` and the
// thresholds of `spreadMap` are copied from `app/src/wall/PixelStory.jsx`
// with their constants, in blocks of two cells, lobes from two octaves of a
// slow noise and a jitter of their own. Three changes, each declared:
//   1. the distance is measured along each world's paths (fast where the
//      light is: the aisle and the windows, the beam, the lamp rows, the
//      city, the cone, the bench and the window), by Dijkstra over the blocks;
//   2. the noise's lattices and amplitudes are scaled to the frame;
//   3. the seam is the last thing reached, so the colour arriving there is
//      what lets the flap go.
// Each world's map is worked out once: an arrival in [0, 1] for every block.

import { CELL, W, SEAM } from './round-time.js'

export const SPREAD = 2
export const COLS = W / CELL // 180
export const ROWS = SEAM / CELL // 160
export const BW = COLS / SPREAD // 90
export const BH = ROWS / SPREAD // 80

// PixelStory.jsx, verbatim
const smoothstep = (k) => k * k * (3 - 2 * k)
function hash3(a, b, c) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
function noise(x, y, w, salt) {
  const fx = x / w
  const fy = y / w
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  const u = smoothstep(fx - i)
  const v = smoothstep(fy - j)
  const a = hash3(i, j, salt)
  const b = hash3(i + 1, j, salt)
  const c = hash3(i, j + 1, salt)
  const d = hash3(i + 1, j + 1, salt)
  return 2 * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) - 1
}

// the product's panel is about 94 cells across; a half of the film is 180
const K = COLS / 94

// Where each world's colour leaves from (the phone's screen, in cells of the
// writer's half, row 0 at the seam), and its fast paths: rectangles in cells
// with a speed (1 is the room's own pace).
export const PATHS = [
  // the 51B: the aisle, the window band, the street beyond
  { from: [50, 70], fast: [[0, 10, 180, 70, 2.6], [70, 70, 130, 160, 1.8]] },
  // the café: the beam first, then the stage
  { from: [50, 70], fast: [[104, 4, 132, 40, 3.2], [96, 40, 170, 96, 2.8], [0, 96, 180, 120, 1.6]] },
  // the reading room: along the two rows of lamps
  { from: [50, 74], fast: [[0, 58, 180, 70, 3.0], [0, 84, 180, 98, 3.0], [20, 20, 160, 58, 1.4]] },
  // the roof: over the parapet and out across the city
  { from: [50, 70], fast: [[0, 60, 180, 112, 3.4], [0, 30, 180, 60, 2.0]] },
  // the corner: through the cone and the puddle
  { from: [50, 74], fast: [[112, 8, 160, 120, 3.0], [70, 120, 180, 160, 2.2]] },
  // the bakery: across the bench, out of the window
  { from: [50, 72], fast: [[0, 92, 180, 112, 2.4], [96, 6, 176, 80, 3.2]] },
]

function speedAt(world, bx, by) {
  const cx = bx * SPREAD + 1
  const cy = by * SPREAD + 1
  let s = 1
  for (const [x0, y0, x1, y1, v] of PATHS[world].fast) if (cx >= x0 && cx < x1 && cy >= y0 && cy < y1) s = Math.max(s, v)
  return s
}

// Dijkstra over the blocks, eight ways, cost the step's length over the speed
function distances(world) {
  const n = BW * BH
  const d = new Float64Array(n).fill(Infinity)
  const done = new Uint8Array(n)
  const [fx, fy] = PATHS[world].from
  const start = Math.floor(fy / SPREAD) * BW + Math.floor(fx / SPREAD)
  d[start] = 0
  // a small binary heap
  const heap = [[0, start]]
  const push = (item) => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]
  while (heap.length) {
    const [dist, i] = pop()
    if (done[i]) continue
    done[i] = 1
    const x = i % BW
    const y = (i / BW) | 0
    const si = speedAt(world, x, y)
    for (const [dx, dy, len] of steps) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= BW || ny >= BH) continue
      const j = ny * BW + nx
      if (done[j]) continue
      const sj = speedAt(world, nx, ny)
      const nd = dist + (len * SPREAD * 2) / (si + sj)
      if (nd < d[j]) { d[j] = nd; push([nd, j]) }
    }
  }
  return d
}

// The arrival of the colour at every block of a world, 0 at the phone to 1 at
// the last block of the seam. Returned as bytes, a block a byte, row 0 at the
// seam, for a texture.
export function arrivalMap(world) {
  const d = distances(world)
  const v = new Float64Array(BW * BH)
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j < BH; j++) {
    for (let i = 0; i < BW; i++) {
      const x = (i + 0.5) * SPREAD
      const y = (j + 0.5) * SPREAD
      const k = j * BW + i
      // the product's lobes and jitter, scaled; the seam pushed to the end
      const smooth = d[k] + 7 * K * noise(x, y, 19 * K, 1) + 2.6 * K * noise(x, y, 7 * K, 2)
      const seam = 60 * Math.pow(1 - j / BH, 6)
      v[k] = smooth + seam + 3.4 * K * (hash3(i, j, 3) - 0.5)
      if (v[k] < lo) lo = v[k]
      if (v[k] > hi) hi = v[k]
    }
  }
  const out = new Uint8Array(BW * BH)
  for (let k = 0; k < v.length; k++) out[k] = Math.round(((v[k] - lo) / (hi - lo || 1)) * 255)
  return out
}

// the share of a world's cells that turn between two moments of its flood,
// for the score's ticks, and where they are across the frame (0 left, 1 right)
export function turning(map, p0, p1) {
  let n = 0
  let x = 0
  const a = Math.round(p0 * 255)
  const b = Math.round(p1 * 255)
  for (let k = 0; k < map.length; k++) if (map[k] > a && map[k] <= b) { n++; x += (k % BW) / BW }
  return { cells: n * SPREAD * SPREAD, pan: n ? x / n : 0.5 }
}

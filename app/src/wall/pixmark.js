// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MARK IN PIXELS, AND THE TWO WHO RUN INTO IT                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three screens in the product tell the same small story on a phone: the
// intro, the door to the core service (screens/Join.jsx) and the mutual
// (screens/Reveal.jsx). A boy and a girl run toward each other across a lit
// panel; he slows and opens his arms, and her run carries her on into them,
// leaning the way she ran, until she is still, half behind him, his arms
// round her, and they breathe. The phone's backlight turns pink, from where
// they hold each other out to the edges of the glass and no further, a
// cell at a time, the whole phone becomes a letter lit in rose, and the two
// of them glide together into the mark. This file is how that story is
// told, and none of it is a picture: the mark is rasterised from mark.js,
// the two people are bodies posed and laid on the grid cell by cell
// (folk.js), and the door's notes are drawn a pixel at a time, the way
// looks.js draws the aerial and the pen. PixelStory.jsx puts it on the
// glass.
//
// Nothing here touches the page. A story is a function of the clock that
// answers with a list of lit cells, so it can be held on any frame, drawn
// last frame first under reduced motion, and read in node.

import { ECL, NEAR, CHALK, ringPath, starPath, rad } from './mark.js'
import { introFolk, standing, sheet, drawBody, together, mixPose, body, SCALE } from './folk.js'

// ── the mark, on a canvas ───────────────────────────────────────────────────
// Moved here out of share.js, which signs the shared picture with it, so the
// signature and the pixel mark are one drawing: the ring, then the star with
// the gutter cut out of it where the ring passes in front, then the ring's
// near half again on top, which is the order `eclipticSVG` layers them in.
// Paths and not an SVG image, because a canvas that has drawn an image can be
// tainted and a tainted canvas cannot be read back or made into a file.

// the half plane the ring is in front of the star in (mark.js `NEAR`)
export function clipNear(g) {
  g.save()
  g.translate(50, 50)
  g.rotate(rad(ECL.tilt))
  g.translate(-50, -50)
  g.beginPath()
  g.rect(NEAR.x, NEAR.y, NEAR.width, NEAR.height)
  g.restore()
  g.clip()
}

// `gutter` is the void cut out of the star where the ring crosses it, and
// `thick` the body the star's arms carry. The picture keeps the mark's own;
// a grid of forty cells wants both corrected (`markCells`).
export function markCanvas(size, { gutter = ECL.gutter, thick = ECL.thick } = {}) {
  const k = size / 100
  const ring = new Path2D(ringPath())
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const g = cv.getContext('2d')
  // the ring, whole
  g.fillStyle = CHALK
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fill(ring, 'evenodd')
  // the star, with the gutter cut out of it on the near side
  const sc = document.createElement('canvas')
  sc.width = size
  sc.height = size
  const s = sc.getContext('2d')
  s.fillStyle = CHALK
  s.setTransform(k, 0, 0, k, 50 * k, 50 * k)
  s.fill(new Path2D(starPath({ ...ECL, thick })))
  s.setTransform(k, 0, 0, k, 0, 0)
  s.save()
  clipNear(s)
  s.globalCompositeOperation = 'destination-out'
  s.fill(new Path2D(ringPath(gutter)), 'evenodd')
  s.restore()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(sc, 0, 0)
  // and the ring's near half in front of it
  g.setTransform(k, 0, 0, k, 0, 0)
  g.save()
  clipNear(g)
  g.fill(ring, 'evenodd')
  g.restore()
  return cv
}

// ── the mark, on a grid ─────────────────────────────────────────────────────
// The drawing above at eight times the grid, each cell lit when enough of it
// is covered. The grid is ODD: the star's axis then runs down the middle of
// a column and each arm ends in one cell, where an even grid splits the axis
// between two and every arm comes out two cells wide and blunt. Forty seven
// is the size the three stories draw it at; thirty three still reads.
//
// The ring is cut at a third and the star at a half (`MARK_CUT`). The ring's
// far side is under a cell wide and at a half it broke into dashes; the star
// at a third filled its own curves in and stood as a lozenge with two
// needles, and at a half its sides draw in again the way the mark's do. But
// at a half the long arms stopped five cells short of their points, which
// are the mark's whole reach past the ring, so down the star's own axes a
// cell is lit at an eighth: an arm thinner than a cell is still drawn, one
// cell wide, to its end. The gutter is widened to a cell, or the ring and the
// star it passes in front of fuse into one blot. Nothing else is changed:
// the geometry is mark.js's.
//
// Each lit cell also knows whether it is the ring's or the star's, so a story
// can close the circuit before it opens the star, which is the order the mark
// has always assembled in (mark.js `ECL_SPINE`).
export const MARK_CUT = { thr: 0.35, star: 0.5, tip: 0.12 }
const CELLS = new Map()
export function markCells(n = 47, { thr = 0.35, star = thr, tip = star, ss = 8, thick = ECL.thick } = {}) {
  const key = `${n}|${thr}|${star}|${tip}|${ss}|${thick}`
  if (CELLS.has(key)) return CELLS.get(key)
  const size = n * ss
  const cover = (cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, size, size).data
    const out = new Float32Array(n * n)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) out[Math.floor(y / ss) * n + Math.floor(x / ss)] += d[(y * size + x) * 4 + 3]
    }
    for (let i = 0; i < out.length; i++) out[i] /= 255 * ss * ss
    return out
  }
  const gutter = Math.max(ECL.gutter, 100 / n)
  const all = cover(markCanvas(size, { gutter, thick }))
  // the ring alone and the star alone, to tell whose each cell is
  const alone = (draw) => {
    const cv = document.createElement('canvas')
    cv.width = size
    cv.height = size
    const g = cv.getContext('2d')
    g.setTransform(size / 100, 0, 0, size / 100, 0, 0)
    draw(g)
    return cover(cv)
  }
  const ring = alone((g) => g.fill(new Path2D(ringPath()), 'evenodd'))
  const body = alone((g) => { g.translate(50, 50); g.fill(new Path2D(starPath({ ...ECL, thick }))) })
  // and the gutter's reach, on the near side, where no arm may be drawn in
  const cut = alone((g) => { g.save(); clipNear(g); g.fill(new Path2D(ringPath(gutter)), 'evenodd'); g.restore() })
  const list = []
  const mid = (n - 1) / 2
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x
      const isRing = ring[i] > body[i]
      // the star's own axes, where its arms run out to a point, and not
      // across the gutter the near ring cuts through them
      const axis = !isRing && (x === mid || y === mid) && cut[i] < 0.05
      if (all[i] >= (isRing ? thr : axis ? tip : star)) list.push({ x, y, ring: isRing })
    }
  }
  const out = { n, list }
  CELLS.set(key, out)
  return out
}

// ── the colours the story keeps for itself ──────────────────────────────────
// Everything on the glass is the screen's own ink but these, and they are
// the story's and nobody else's. `PANEL` is the pink the backlight turns:
// the panel's own three stops, its hot spot, its body and its edge, in the
// place the night screen has its greys, so the pink panel is the same
// photograph of the same phone lit another colour (PixelStory reads the hot
// spot off the screen, looks.js `quirks`). `BLUSH` is a pastel pink for the
// light round a phone (story.css, intro.css). `ROSE` is a lit cell in the
// pink, deep enough to stay a pixel on a panel that is already pink: the
// glint on the mutual's ring and its twinkle. The two of them, and the mark,
// are in the screen's own ink throughout, and stay dark and crisp on the
// pink.
export const PANEL = ['#FFE3EE', '#F5BCD1', '#D992AF']
export const BLUSH = '#F7C6D9'
export const ROSE = '#C93F76'

// ── the small thing ──
// A note, sealed: the one thing drawn on the glass that is not them or the
// mark. There used to be hearts as well, the one two notes became on the
// door and the small ones that floated up off the mutual's mark; the owner
// took them out (26 September), and nothing in the stories is a heart now.
const NOTE = [
  'XXXXXXX',
  'XX...XX',
  'X.X.X.X',
  'X..X..X',
  'XXXXXXX',
]

// A drawing as cells: [x, y, ink], ink 1 near, 2 far and 3 the rose. `near`
// says which limb pair is in front; `flip` turns the drawing round for the
// one coming from the right, which keeps its near side near. `ink` draws
// every lit cell of it in one ink, for a note that has been sealed.
function cellsOf(rows, { near = 'a', flip = false, x = 0, y = 0, ink = 0 } = {}) {
  const out = []
  const w = rows[0].length
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i]
      if (ch === '.') continue
      const k = ink || (ch === 'p' ? 3 : ch === 'X' || ch === near ? 1 : 2)
      out.push([x + (flip ? w - 1 - i : i), y + j, k])
    }
  })
  return out
}
// The same drawing at twice its size, each of its cells four of the story's
// grid, at (x, y): the note was drawn for a grid half as fine, and at twice
// the size it is the size it always was on the glass.
function twice(cells, x, y) {
  const out = []
  for (const [cx, cy, ink, h, a] of cells) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) out.push([x + 2 * cx + dx, y + 2 * cy + dy, ink, h || 0, a ?? 1])
  }
  return out
}

// ── the morph ──
// What they stood on becomes the orbit, and the two of them become the star.
// The dashed ground lifts off its row and bends into the ring: every dash is
// laid out along the ring's near half and again along its far half, left to
// right, so the line opens into the ellipse rather than scattering into it.
// Then the pair gathers into the star, each pixel paired with the part of
// the star on its own side of them (both laid round their own centres by
// angle), so the heads go up the long arm and the feet down the other. There
// are more pixels in the ring than dashes in the ground, and fewer in the
// star than in the pair, so some split on the way and some meet.
//
// It used to hop: every pixel rounded to a whole cell on every frame, thirty
// times a second, on a hard start. It glides now. A pixel waits in its cell,
// leaves on its own moment, travels between the cells at the display's own
// rate on an ease that is slow to start and slow to arrive, bending a little
// off the straight line as it goes, all of them the same way round, so the
// whole of it turns as it gathers, the way the ring turns; and it is put
// back on the grid only when it lands. The ground leaves from the left to
// the right, the ring's near half first; the star opens from its middle out,
// each pixel a little early or late by its own number, so they do not
// arrive as a wall. The ring closes first, the order the mark has always
// assembled in.
const glide = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
// how far a pixel bends off its line, at most, in cells
const BEND = 3.2

function pairs(src, dst) {
  const n = Math.max(src.length, dst.length)
  const out = []
  for (let k = 0; k < n; k++) out.push([src[Math.floor((k * src.length) / n)], dst[Math.floor((k * dst.length) / n)]])
  return out
}
function byAngle(list, get) {
  let cx = 0
  let cy = 0
  list.forEach((p) => { const [x, y] = get(p); cx += x; cy += y })
  cx /= list.length
  cy /= list.length
  const a = (p) => { const [x, y] = get(p); return Math.atan2(y - cy, x - cx) }
  return [...list].sort((p, q) => a(p) - a(q))
}
// a number from two others, the same every time it is asked
const hash = (a, b) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

// the mark on the grid at `n` cells, its ring and its star, placed at
// (`ox`, `oy`), each ring cell with its place along the ring's long axis
// (`u`), which half it is on, and its angle round the middle
function markOn(n, ox, oy, cut = MARK_CUT) {
  const m = markCells(n, cut)
  const t = rad(ECL.tilt)
  const c = (n - 1) / 2
  const ring = m.list.filter((p) => p.ring).map((p) => {
    const dx = p.x - c
    const dy = p.y - c
    const u = dx * Math.cos(t) + dy * Math.sin(t)
    const v = -dx * Math.sin(t) + dy * Math.cos(t)
    return { x: p.x + ox, y: p.y + oy, u, near: v > 0, ang: Math.atan2(v * 2, u) }
  })
  const star = m.list.filter((p) => !p.ring).map((p) => ({ x: p.x + ox, y: p.y + oy, r: Math.hypot(p.x - c, p.y - c) }))
  return { ring, star, cx: ox + c, cy: oy + c, all: m.list.map((p) => [p.x + ox, p.y + oy, 1]) }
}

// one pixel's way from (sx, sy) to (dx, dy), leaving at `delay` and taking
// `flight`: where it is at `t`, off the grid while it travels
function bitOf(sx, sy, dx, dy, ink, delay, flight) {
  const len = Math.hypot(dx - sx, dy - sy) || 1
  const bend = Math.min(BEND, len * 0.16)
  // the bend is to the left of the way it goes, for every pixel, so the
  // whole of it turns one way
  return { sx, sy, dx, dy, ink, delay, flight, nx: -(dy - sy) / len * bend, ny: (dx - sx) / len * bend }
}
function bitAt(b, t) {
  const k = (t - b.delay) / b.flight
  if (k <= 0) return [b.sx, b.sy, b.ink]
  if (k >= 1) return [b.dx, b.dy, 1]
  const e = glide(k)
  const arc = Math.sin(Math.PI * e)
  return [b.sx + (b.dx - b.sx) * e + b.nx * arc, b.sy + (b.dy - b.sy) * e + b.ny * arc, 1]
}

// ── the intro's glide ──
// The same gathering on the intro's finer grid, into the mark rasterised
// for it (`I_MARK`), and with the light each pixel leaves with: the two of
// them are drawn in the ink at many strengths, their outlines half lit, and
// a pixel travels at the strength it left with and is lit whole as it lands.
// The ground goes to the ring and the two of them to the star, as before;
// the star gathers out from where they hold each other and the ring from
// the left, and every pixel is between the cells while it travels and on
// one when it lands.
const I_RING_SPREAD = 240
const I_RING_FLIGHT = 560
const I_STAR_AT = 90
const I_STAR_SPREAD = 170
const I_STAR_FLIGHT = 560
const I_BEND = 3
export const I_MORPH_MS = Math.max(I_RING_SPREAD + 60 + I_RING_FLIGHT, I_STAR_AT + I_STAR_SPREAD + I_STAR_FLIGHT)
// the intro's mark is cut as the seal is, sampled six to a cell's side and
// not eight: on seventy seven cells that is the same drawing, in half the time
const I_CUT = { ...MARK_CUT, ss: 6 }

// Which of `to` each of `from` goes to, the two lists the same length and
// each of `to` taken once: so that together they travel about as little as
// they can, which is also what keeps any two ways from crossing (an optimal
// transport, near enough). It is found the sliced way. Every pixel has a
// stand-in, starting where it is; in each of a few dozen directions in
// turn, the stand-ins and `to` are both put in order along it, and every
// stand-in moves along it to where the one of `to` of its rank stands.
// Direction after direction the stand-ins take on the shape of `to`, each
// staying among its neighbours. Then every pixel takes the free cell of
// `to` nearest its stand-in, the surest first, and last any two pixels
// near each other swap where they go if that is less travelling for the
// two of them, until none would. It is worked out in steps (it yields
// between them), so that it can be done a few milliseconds a frame.
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
// a cell as one number (the grid is never 4096 wide)
const cellKey = (x, y) => y * 4096 + x
function* transport(from, to, rounds = 24) {
  const n = from.length
  const px = Float64Array.from(from, (p) => p[0])
  const py = Float64Array.from(from, (p) => p[1])
  const tx = Float64Array.from(to, (p) => p[0])
  const ty = Float64Array.from(to, (p) => p[1])
  const kp = new Float64Array(n)
  const kt = new Float64Array(n)
  yield
  // the order along a direction: where each stands along it, to a 256th of
  // a cell, with its index in the low digits, sorted as plain numbers
  const along = (k, xs, ys, c, s) => {
    for (let i = 0; i < n; i++) k[i] = Math.round((xs[i] * c + ys[i] * s + 1024) * 256) * 4096 + i
    k.sort()
  }
  for (let r = 0; r < rounds; r++) {
    const c = Math.cos(r * GOLDEN)
    const s = Math.sin(r * GOLDEN)
    along(kp, px, py, c, s)
    along(kt, tx, ty, c, s)
    for (let j = 0; j < n; j++) {
      const i = kp[j] % 4096
      const o = kt[j] % 4096
      const d = (tx[o] - px[i]) * c + (ty[o] - py[i]) * s
      px[i] += d * c
      py[i] += d * s
    }
    yield
  }
  // the cells of `to`, and which of each are still free
  const free = new Map()
  for (let i = 0; i < n; i++) {
    const k = cellKey(Math.round(tx[i]), Math.round(ty[i]))
    const at = free.get(k)
    if (at) at.push(i)
    else free.set(k, [i])
  }
  // the free cell nearest (x, y): out ring by ring from its own cell, until
  // no nearer one could be further out
  const nearest = (x, y) => {
    const cx = Math.round(x)
    const cy = Math.round(y)
    let best = -1
    let bd = Infinity
    for (let r = 0; r < 256 && (best < 0 || r - 1 <= Math.sqrt(bd)); r++) {
      for (let v = cy - r; v <= cy + r; v++) {
        const edge = v === cy - r || v === cy + r
        for (let u = cx - r; u <= cx + r; u += edge ? 1 : 2 * r) {
          const at = free.get(cellKey(u, v))
          if (!at || !at.length) continue
          const d = (u - x) ** 2 + (v - y) ** 2
          if (d < bd) { bd = d; best = cellKey(u, v) }
        }
      }
    }
    return [best, bd]
  }
  const sure = []
  for (let i = 0; i < n; i++) {
    sure.push([nearest(px[i], py[i])[1], i])
    if (i % 64 === 63) yield
  }
  sure.sort((a, b) => a[0] - b[0])
  const out = new Int32Array(n)
  for (let q = 0; q < n; q++) {
    const i = sure[q][1]
    const [k] = nearest(px[i], py[i])
    // (a stand-in lost off the grid takes any that is left)
    out[i] = (k >= 0 ? free.get(k) : [...free.values()].find((at) => at.length)).pop()
    if (q % 64 === 63) yield
  }
  // and neighbours swap, while it shortens the two ways
  const fx = Float64Array.from(from, (p) => p[0])
  const fy = Float64Array.from(from, (p) => p[1])
  const near = new Map()
  for (let i = 0; i < n; i++) {
    const k = cellKey(Math.round(fx[i]), Math.round(fy[i]))
    const at = near.get(k)
    if (at) at.push(i)
    else near.set(k, [i])
  }
  const two = []
  for (let i = 0; i < n; i++) {
    const cx = Math.round(fx[i])
    const cy = Math.round(fy[i])
    for (let v = cy - 2; v <= cy + 2; v++) {
      for (let u = cx - 2; u <= cx + 2; u++) {
        const at = near.get(cellKey(u, v))
        if (at) for (const j of at) if (j > i) two.push(i, j)
      }
    }
    if (i % 128 === 127) yield
  }
  const cost = (i, o) => (tx[o] - fx[i]) ** 2 + (ty[o] - fy[i]) ** 2
  for (let pass = 0; pass < 16; pass++) {
    let swaps = 0
    for (let q = 0; q < two.length; q += 2) {
      const i = two[q]
      const j = two[q + 1]
      const a = out[i]
      const b = out[j]
      if (cost(i, b) + cost(j, a) < cost(i, a) + cost(j, b) - 1e-6) {
        out[i] = b
        out[j] = a
        swaps++
      }
    }
    if (!swaps) break
    yield
  }
  return out
}
// the whole glide, worked out in steps as `transport` is: the mark
// rasterised in the first
function* glideOf(pair, dashes, n, ox, oy, cols, hug) {
  const m = markOn(n, ox, oy, I_CUT)
  yield
  const bits = []
  const bit = (s, dx, dy, delay, flight) => {
    const b = bitOf(s[0], s[1], dx, dy, 1, delay, flight)
    const len = Math.hypot(dx - s[0], dy - s[1]) || 1
    const bend = Math.min(I_BEND, len * 0.16) / Math.min(BEND, len * 0.16)
    b.nx *= bend
    b.ny *= bend
    b.a = s[4] ?? (s[2] === 2 ? 0.5 : 1)
    return b
  }
  const line = [...dashes].sort((p, q) => p[0] - q[0])
  for (const near of [true, false]) {
    const arc = m.ring.filter((p) => p.near === near).sort((p, q) => p.u - q.u)
    for (const [s, d] of pairs(line, arc)) bits.push(bit(s, d.x, d.y, (s[0] / cols) * I_RING_SPREAD + (near ? 0 : 60), I_RING_FLIGHT))
  }
  yield
  // the faintest of their outline cells are let go of first: they are the
  // soft edge of a drawing and not pixels of it
  const body = pair.filter((c) => (c[4] ?? 1) >= 0.2)
  // The two of them become the star as one shape and not as a spray: each
  // of their cells goes to a cell of the star so that all of them together
  // travel as little as they can and no two of their ways cross
  // (`transport`), so their heads rise into the star's upper arm and their
  // feet run down into the lower, what already stands where the star does
  // barely moves, and the cells beside each other stay beside each other
  // all the way: the drawing changes shape, the two of them still to be
  // seen in it half way. The smaller of the two is spread over the larger,
  // evenly in the reading order, so a cell of the star may take two of
  // theirs. It starts where they hold each other and runs out to their
  // heads and their feet, each pixel leaving as long after the first as it
  // stands far from there, and all of them on the one clock (no pixel's
  // own jitter), so neighbours go together.
  const order = (a, b) => (a[1] - b[1]) || (a[0] - b[0])
  const src = [...body].sort(order)
  const dst = [...m.star].map((p) => [p.x, p.y]).sort(order)
  const both = pairs(src, dst)
  yield
  const to = yield* transport(both.map(([s]) => s), both.map(([, d]) => d))
  const from = (s) => Math.hypot(s[0] - hug.x, s[1] - hug.y)
  const far = Math.max(...src.map(from))
  both.forEach(([s], i) => {
    const d = both[to[i]][1]
    bits.push(bit(s, d[0], d[1], I_STAR_AT + (from(s) / far) * I_STAR_SPREAD, I_STAR_FLIGHT))
  })
  const faint = pair.filter((c) => (c[4] ?? 1) < 0.2)
  return { bits, faint, done: m.all }
}
function glideAt(m, t) {
  if (t >= I_MORPH_MS) return m.done
  const out = []
  for (const b of m.bits) {
    const k = (t - b.delay) / b.flight
    const [x, y] = bitAt(b, t)
    // lit whole by the time it lands, on the glide's own curve
    const a = k <= 0 ? b.a : k >= 1 ? 1 : b.a + (1 - b.a) * glide(k)
    out.push([x, y, 1, 0, a])
  }
  // the soft edge goes out as the drawing leaves
  const f = 1 - Math.min(1, t / 160)
  if (f > 0) for (const c of m.faint) out.push([c[0], c[1], 1, 0, (c[4] ?? 1) * f])
  return out
}

// ── the intro ───────────────────────────────────────────────────────────────
// The story, and the ending the door and the mutual tell too: the two of
// them are bodies drawn from poses (folk.js), on a grid of the pitch every
// letter on the wall is lit at, so that they are people and not sticks; she
// runs on into his arms and half behind him, and does not dip; and there is
// no heart. From 0, in ms (folk.js has the run and the catch):
//
//      0   they come onto the glass together, he from the left edge and she
//          from the right, on the same frame, drawn afresh at the display's
//          own rate, their feet planted where they land
//    480   he slows and stands, and opens his arms to her
//    940   she lands in them, her run carrying her on into him and behind
//          him; from 1440 they hold each other, and breathe
//   1360   THE PINK, from where they hold each other: the backlight turning,
//          a few of the panel's cells at a time, out through the glass to
//          its edges and no further, over a second and a half; the phone's
//          own bands and the light it throws turning with it as it reaches
//          them (Intro.jsx, intro.css), until the whole phone is a letter
//          lit in rose
//   2310   THE MARK: the two of them into the star and the ground into the
//          ring, gliding, while the last of the glass turns; whole at 3170
//
// `panel` is the rose letter's three panel colours and `ink` the night's
// ink and the rose's, which the pink carries the one to the other.
export const I_COLS = 95
export const I_ROWS = 75
const I_GROUND = 67
// the mark, rasterised for this grid from the same geometry as the page's
// 47 cell seal: odd, and the tips of the star's long arms a cell past the
// grid's first and last rows
const I_MARK = 77
const I_WASH_AT = -80
const I_WASH_MS = 1500
const I_GLIDE_AT = 950
// how long a frame of the run may spend working out the glide ahead
const I_PREP_MS = 3
// the ground, dashed, three lit and one dark, in the far ink
function groundAt(row, cols) {
  const out = []
  for (let x = 0; x < cols; x++) if (x % 4 !== 3) out.push([x, row, 2])
  return out
}

// ── the pink, a few cells at a time ──
// It was a light: a soft disc of pink out from the two of them, smooth at
// its front, across the glass in three quarters of a second. The owner saw
// a gradient laid on the phone, and asked for the phone's own pixels. So the
// pink is the panel's cells turning, in small blocks of them, on the
// panel's own grid: each block turns when a front reaches it, and the front
// is how far the block is from where they hold each other, pushed on or
// held back by a slow noise of its own and a little jitter per block
// (PixelStory.jsx `spreadMap`), so it grows the way a stain grows, in
// lobes, with blocks going over ahead of it and islands left behind for a
// moment, and never as a circle. It steps, twenty five times a second, the
// way a phone's panel redrew, and it takes its time: a second and a half to
// the last corner, quick where it starts and slowing as it fills.
//
// A frame's `wash` is where it leaves from and `p`, how far the front is
// through the glass, 0 to 1, with the fronts of the two steps before
// (`p1`, `p2`), so the blocks that have just turned are drawn a step
// lighter and settle. `p: null` is the whole panel.
const WASH_STEP = 40
const WASH_EASE = 1.6
const washP = (k) => 1 - (1 - Math.max(0, Math.min(1, k))) ** WASH_EASE
// the moment the front is `f` through the glass, on the wash's own clock
const washAtP = (f) => I_WASH_MS * (1 - (1 - f) ** (1 / WASH_EASE))
function washFrom(u, x, y) {
  if (u < 0) return null
  if (u >= I_WASH_MS) return { x, y, p: null }
  const i = Math.floor(u / WASH_STEP)
  const at = (n) => washP((n * WASH_STEP) / I_WASH_MS)
  return { x, y, p: at(i + 1), p1: at(i), p2: at(i - 1), step: i }
}
// How far through the glass the front is when it reaches the top band and
// the bottom band, for the phone's glass to turn with it (Intro.jsx,
// Join.jsx, Reveal.jsx). From where they hold each other, a little over a
// third of the way down the glass, the top edge is about two fifths of the
// way to the farthest corner and the bottom band about two thirds.
const REACH = { top: 0.4, bottom: 0.68 }
// two hex colours mixed, `k` of the way
function mixHex(a, b, k) {
  const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
export function introStory(start = 0, { panel = PANEL, ink = null, folk: given = null } = {}) {
  // the two of them: the intro's run, or a story's own way to the same hold
  // (the door's, `joinStory`), which answers the same `at`, `times`, `pair`
  // and `hug`
  const folk = given || introFolk({ ground: I_GROUND, mid: (I_COLS - 1) >> 1 })
  const floor = groundAt(I_GROUND, I_COLS)
  const washAt = start + folk.times.hold + I_WASH_AT
  const morphs = washAt + I_GLIDE_AT
  const done = morphs + I_MORPH_MS
  const end = Math.max(done, washAt + I_WASH_MS)
  const MX = (I_COLS - I_MARK) >> 1
  const MY = (I_ROWS - I_MARK) >> 1
  let morph = null
  // the ink, from the night's to the rose's as the pink goes out
  const inkAt = (u) => {
    if (!ink) return null
    const k = Math.max(0, Math.min(1, u / (I_WASH_MS * 0.6)))
    return k <= 0 ? ink[0] : k >= 1 ? ink[1] : mixHex(ink[0], ink[1], Math.round(k * 8) / 8)
  }
  // The glide is worked out ahead, and a little at a time: on the first
  // frame asked for the mark is rasterised and the hold drawn, while the
  // screen is still dark, and then which of the star's cells each of their
  // pixels goes to a few milliseconds a frame while they run, so that no
  // frame pays for all of it and the frame the glide starts on pays for
  // none. A frame that needs it sooner (a held clock, a skip) works out
  // the rest there and then.
  let prep = null
  const warm = (budget) => {
    if (morph) return
    if (!prep) prep = glideOf(folk.pair, floor, I_MARK, MX, MY, I_COLS, folk.hug)
    const t0 = performance.now()
    do {
      const r = prep.next()
      if (r.done) {
        morph = r.value
        return
      }
    } while (performance.now() - t0 < budget)
  }
  const frame = (t) => {
    warm(t >= morphs ? Infinity : I_PREP_MS)
    const u = t - washAt
    const wash = washFrom(u, folk.hug.x, folk.hug.y)
    const wk = !wash ? '' : wash.p == null ? 'W' : `w${wash.step}`
    if (t >= morphs) {
      const mt = t - morphs
      return { key: `m${mt >= I_MORPH_MS ? 'done' : Math.round(mt)}|${wk}`, cells: glideAt(morph, mt), wash, ink: inkAt(u) }
    }
    const f = folk.at(t - start)
    return { key: `${f.key}|${wk}`, cells: [...floor, ...f.cells], wash, ink: inkAt(u) }
  }
  const T = folk.times
  return {
    cols: I_COLS, rows: I_ROWS, end, panel, fine: true,
    times: {
      run: start + T.run, slow: start + T.slow, stop: start + T.stop, meet: start + T.meet, hold: start + T.hold,
      catch: start + T.meet, glow: washAt, morphs, done, end,
      // the front at the top band and at the bottom band, and the panel
      // all pink, for the phone's glass to turn with it
      top: Math.round(washAt + washAtP(REACH.top)),
      bottom: Math.round(washAt + washAtP(REACH.bottom)),
      covered: washAt + I_WASH_MS,
    },
    frame,
  }
}

const smooth01 = (k) => { const x = Math.max(0, Math.min(1, k)); return x * x * (3 - 2 * x) }

// ── the door ────────────────────────────────────────────────────────────────
// The mechanic, told in the order it happens (screens/Join.jsx), with the
// intro's two on the intro's grid. They stand apart, one at either side of
// the glass and each as far in from their edge as the other, both there
// from the first frame, and each sends the other a note that never arrives:
// it leaves the hand held up, goes over to the middle of the glass, above
// and ahead of the one who sent it and never across them, and stops there,
// sealed and dimmed. He sends his (`you`); she sends hers (`them`), neither
// seeing the other's. Only when both are there (`both`) do the two notes
// wake and slide into each other, and on the frame they meet they are one
// note, lit: that is the moment they both find out, on the same frame, and
// not before. It goes out a pixel at a time as the two of them set off
// toward each other, on the same beat, and the ending is the intro's: her
// run carries her on into his arms and half behind him, the pink, the rose,
// the mark. The mark holds, the screen goes to sleep, and it is told again
// from the beginning (`loop`), for as long as the page is open.
//
// The notes used to leave from the chest, rise over his head and seal on
// it, and slide across his face on their way to becoming a heart; the owner
// saw the note cut into him. Now each note leaves from beside the raised
// hand, on the far side of it from the one who sent it, and everything it
// does after is further from them than that. There is no heart.
//
// Where they stand is where the intro's run has each of them `J_APART`
// cells from the middle, and that is not the same moment on its clock for
// the two of them: he runs faster, and is there later. So each sets off
// from their own moment on it, on the same beat, and is brought up to speed
// over their own ramp, hers the longer, the way a lighter runner gets going,
// so that by the time either of them has to slow the two are on the one
// clock and the catch is the intro's. From the first stride on it is the
// intro's run.
const J_APART = 38
const J_RAMP = 240
// A hand going up with a note: up over `J_UP`, and held there until the
// note has gone most of the way, then down. It used to come down as soon as
// it was up, and an arm coming down swings forward through where the note
// had just been.
const J_UP = 190
const J_HELD = 640
const J_SEND = 920
// when on the way up the hand lets the note go, and how long the note takes
// to get from there to where it seals
const J_LET_GO = 200
const NOTE_FLIGHT = 640
const SLIDE_MS = 200
// the notes' top row: when both are sealed they stand side by side over the
// middle of the glass, a cell between them
const J_NOTE_Y = 7
// the one note, lit, a beat before they set off, and how long it takes to go
// out once they have
const J_FOUND_MS = 260
const J_OUT = 360
// the mark, whole, before the screen sleeps and the story starts again; and
// how long it is asleep, dark, between one telling and the next
const J_MARK_HOLD = 1800
export const REST_MS = 820
// a note from beside a hand to where it seals: across on a curve that is
// quick to leave and settles, and up or down to its row on a gentler one
function noteAt(u, from, to) {
  const k = Math.max(0, Math.min(1, u / NOTE_FLIGHT))
  const ex = 1 - (1 - k) ** 3
  const ey = smooth01(k)
  return { x: from.x + (to.x - from.x) * ex, y: from.y + (to.y - from.y) * ey, sealed: k >= 1 }
}
// the moment on a clock, going one way, that `fn` reaches `v`
function solve(fn, v, lo, hi) {
  const up = fn(hi) > fn(lo)
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if ((fn(m) < v) === up) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}
// a runner's clock from standing: still at `from` until they go, then
// brought up to its own speed over `ramp`
const rampOf = (u, from, ramp) => (u <= 0 ? from : from + (u < ramp ? (u * u) / (2 * ramp) : u - ramp / 2))

export function joinStory({ you = 900, them = 2300, both = 3600, panel = PANEL, ink = null } = {}) {
  const mid = (I_COLS - 1) >> 1
  const folk = introFolk({ ground: I_GROUND, mid })
  const found = both + SLIDE_MS
  const runAt = found + J_FOUND_MS
  const T = folk.times
  // each of them `J_APART` from the middle, and the moment on the intro's
  // clock that has them there; his ramp, and hers, as much longer as makes
  // the two clocks one once both are up to speed
  const tHim = solve(folk.himX, mid - J_APART, -600, T.slow)
  const tHer = solve(folk.herX, mid + J_APART, -600, T.meet)
  const rHer = J_RAMP + 2 * (tHer - tHim)
  const HX = folk.himX(tHim)
  const SX = folk.herX(tHer)
  const G = I_GROUND
  const SH = sheet(-70, G - 66, I_COLS + 140, 72)
  const SS = sheet(-70, G - 66, I_COLS + 140, 72)
  // a hand going up with a note, and down again
  const lift = (u) => {
    if (u < 0 || u > J_SEND) return 0
    return u < J_UP ? smooth01(u / J_UP) : u < J_HELD ? 1 : 1 - smooth01((u - J_HELD) / (J_SEND - J_HELD))
  }
  const SEND = { sN: 142, eN: 16, handN: 'open', lean: 0, neck: -9, nod: -6 }
  const stand = (who, k) => (k > 0 ? mixPose(standing(who), standing(who, SEND), k) : standing(who))
  // Where each note leaves from: beside the hand at the top of its lift, on
  // the side of it away from the one who sent it, and centred on it; and
  // where each seals, the two side by side over the middle of the glass,
  // then where they meet.
  const NW = 2 * NOTE[0].length
  const NH = 2 * NOTE.length
  const handOf = (who, X, sx) => {
    const w = body(who, standing(who, SEND)).joints.AN.wrist
    return { x: X + sx * SCALE * w[0], y: G - SCALE * w[1] }
  }
  const hA = handOf('him', HX, 1)
  const hB = handOf('her', SX, -1)
  const fromA = { x: hA.x + 3, y: hA.y - NH / 2 }
  const fromB = { x: hB.x - 3 - NW, y: hB.y - NH / 2 }
  const sealA = { x: mid - NW, y: J_NOTE_Y }
  const sealB = { x: mid + 1, y: J_NOTE_Y }
  const meetAt = { x: mid - (NW >> 1) + 1, y: J_NOTE_Y }
  // the one note's cells, and the order they go out in
  const one = twice(cellsOf(NOTE, { ink: 1 }), meetAt.x, meetAt.y)
  const outOf = one.map((c, i) => hash(i, 11) * (J_OUT - 80))
  const notes = (t) => {
    const cells = []
    let key = ''
    if (t < found) {
      for (const [at, from, to, name] of [[you + J_LET_GO, fromA, sealA, 'a'], [them + J_LET_GO, fromB, sealB, 'b']]) {
        if (t < at) continue
        let n = noteAt(t - at, from, to)
        // on its way it is lit; sealed, it is dimmed; and when both are
        // there the two wake together and slide into each other
        let k = n.sealed ? 2 : 1
        if (t >= both) {
          const e = smooth01(Math.min(1, (t - both) / SLIDE_MS))
          n = { x: to.x + (meetAt.x - to.x) * e, y: to.y }
          k = 1
        }
        const x = Math.round(n.x)
        const y = Math.round(n.y)
        // the first frame out of the hand is half lit, as a cell of the
        // panel comes on
        const a = t - at < 40 ? 0.5 : 1
        cells.push(...twice(cellsOf(NOTE, { ink: k }), x, y).map((c) => [c[0], c[1], c[2], 0, a]))
        key += `|${name}${x}.${y}.${k}${a}`
      }
      return { cells, key }
    }
    // the one note: for the frame it arrives, a ring of light a cell out
    // round it; then lit and still; and from when they go, out a pixel at a
    // time, each cell a step dimmer on its way
    if (t < found + 80) {
      const ring = []
      for (let y = meetAt.y - 1; y <= meetAt.y + NH; y++) {
        for (let x = meetAt.x - 1; x <= meetAt.x + NW; x++) {
          if (y === meetAt.y - 1 || y === meetAt.y + NH || x === meetAt.x - 1 || x === meetAt.x + NW) ring.push([x, y, 1, 0, 0.3])
        }
      }
      return { cells: [...one, ...ring], key: '|N+' }
    }
    if (t < runAt) return { cells: one, key: '|N' }
    const u = t - runAt
    if (u >= J_OUT) return { cells: [], key: '' }
    const q = Math.floor(u / 40)
    const left = []
    one.forEach((c, i) => {
      const o = outOf[i]
      if (q * 40 >= o + 80) return
      left.push(q * 40 >= o ? [c[0], c[1], 1, 0, 0.45] : c)
    })
    return { cells: left, key: `|n${q}` }
  }
  let last = null
  // the two of them, without the notes
  const bodies = (t) => {
    if (t >= runAt + Math.max(J_RAMP, rHer)) return folk.at(rampOf(t - runAt, tHim, J_RAMP))
    // standing, a hand going up; and setting off, each into the run on
    // their own ramp. Standing still is one drawing, drawn once.
    const a = lift(t - you)
    const b = lift(t - them)
    const key = t > runAt ? `j${Math.round(t / 16)}` : `j${a.toFixed(2)}|${b.toFixed(2)}`
    if (last && last.key === key) return last
    let him = stand('him', a)
    let her = stand('her', b)
    let hx = HX
    let sx = SX
    if (t > runAt) {
      const u = t - runAt
      const th = rampOf(u, tHim, J_RAMP)
      const ts = rampOf(u, tHer, rHer)
      him = mixPose(him, folk.poseAt(th).him, smooth01(u / J_RAMP))
      her = mixPose(her, folk.poseAt(ts).her, smooth01(u / rHer))
      hx = folk.himX(th)
      sx = folk.herX(ts)
    }
    drawBody('him', him, hx, G, false, SH)
    drawBody('her', her, sx, G, true, SS)
    last = { key, cells: together(SH, SS) }
    return last
  }
  const at = (t) => {
    const f = bodies(t)
    const n = notes(t)
    return { key: f.key + n.key, cells: [...f.cells, ...n.cells] }
  }
  // a moment on the intro's clock, once the two are on it, on this story's
  const back = (tau) => runAt + (tau - tHim) + J_RAMP / 2
  const door = {
    at,
    times: { run: runAt, slow: back(T.slow), stop: back(T.stop), meet: back(T.meet), hold: back(T.hold) },
    hug: folk.hug,
    get pair() { return folk.pair },
  }
  const s = introStory(0, { panel, ink, folk: door })
  const rest = s.times.done + J_MARK_HOLD
  Object.assign(s.times, { you, them, both, found, run: runAt, rest })
  s.loop = rest + REST_MS
  // the two layers apart, for the frame checks (scripts/check-stories.mjs)
  s.layers = { bodies, notes }
  return s
}

// ── the mutual ──────────────────────────────────────────────────────────────
// The intro's story, the same two on the same grid with the same ending, a
// little nearer, so the screen comes to its point sooner; and then the
// screen does not stop.
//
// When the mark is whole it stands a moment, and then gathers up into the
// top of the glass at two thirds of its size (`R_SMALL`), gliding like
// everything else, to leave the bottom of the panel to the words
// (screens/Reveal.jsx types them there, in the phone's face). As it goes,
// the pink the story lit on the glass goes out onto the phone's own panel
// under it, which the rose has reached by then (mutual.css `--mu-turn`),
// and which from there on drifts slowly through its colours (Reveal.jsx
// `drift`). Then the mark is alive, ten times a second, on a loop that is
// only ever a function of the clock:
//
//   the breath   the backlight behind the mark brighter and back, slowly,
//                once every 2800ms, the star warming a little with it
//   the glint    a light going round the ring, once every 2400ms
//   twinkle      a cell or two of the star lit each frame
//
// There was a heartbeat, the backlight going lub and dub, and a small heart
// floating up off the star every four seconds. The owner took the heart out
// of the stories, and the beat is a breath now.
//
// And then it is told again. After a while alive the screen goes to sleep,
// and wakes on the two of them running in, as it first did (`loop`,
// Reveal.jsx), for as long as the sheet is open. None of it is random: each
// frame is chosen by its own number, so a frame held for a screenshot is the
// same frame every time. `still` is a frame of it at rest, for reduced
// motion.
const R_NEAR = 250
const R_SMALL = 51
// the mark stands whole this long before it gathers up
const R_MARK_HOLD = 900
const R_GATHER_MS = 620
const R_FADE_MS = 480
const LIVE_MS = 100
// how long it is alive, before the screen sleeps and it is told again
const R_LIVE = 5600
const BREATH = 28
const GLINT = 24

export function revealStory(start = 200, { panel = PANEL, ink = null } = {}) {
  const told = introStory(start - R_NEAR, { panel, ink })
  const inkEnd = ink ? ink[1] : null
  const gatherAt = told.times.done + R_MARK_HOLD
  const liveAt = gatherAt + R_GATHER_MS
  const rest = liveAt + R_LIVE
  const MX = (I_COLS - I_MARK) >> 1
  const MY = (I_ROWS - I_MARK) >> 1
  let gather = null
  let small = null
  const smallMark = () => {
    if (!small) small = markOn(R_SMALL, (I_COLS - R_SMALL) >> 1, 2, I_CUT)
    return small
  }
  // the story's pink, going out onto the panel's own light under it
  const fade = (t) => {
    const k = (t - gatherAt) / R_FADE_MS
    if (k >= 1) return null
    return { p: null, level: 1 - Math.max(0, k) * Math.max(0, k) * (3 - 2 * Math.max(0, k)) }
  }
  const gatherOf = () => {
    const big = markOn(I_MARK, MX, MY, I_CUT)
    const to = smallMark()
    const bits = []
    const ring = pairs(byAngle(big.ring, (p) => [p.x, p.y]), byAngle(to.ring, (p) => [p.x, p.y]))
    const star = pairs(byAngle(big.star, (p) => [p.x, p.y]), byAngle(to.star, (p) => [p.x, p.y]))
    ring.forEach(([a, b], i) => bits.push(bitOf(a.x, a.y, b.x, b.y, 1, hash(i, 3) * 90, R_GATHER_MS - 110)))
    star.forEach(([a, b], i) => bits.push(bitOf(a.x, a.y, b.x, b.y, 1, 20 + hash(i, 5) * 90, R_GATHER_MS - 110)))
    return bits
  }
  const live = (t) => {
    const i = Math.floor((t - liveAt) / LIVE_MS)
    const m = smallMark()
    const breath = (1 - Math.cos((2 * Math.PI * (i % BREATH)) / BREATH)) / 2
    const cells = []
    // the glint, going round the ring by its own angle
    const g = ((i % GLINT) / GLINT) * Math.PI * 2 - Math.PI
    for (const p of m.ring) {
      let d = Math.abs(p.ang - g)
      if (d > Math.PI) d = Math.PI * 2 - d
      cells.push([p.x, p.y, 1, d < 0.5 ? 0.9 * (1 - d / 0.5) : 0])
    }
    // the star, warming as the light comes up, and a cell or two of it lit
    m.star.forEach((p, j) => {
      const tw = hash(i, j) < 3.4 / m.star.length ? 1 : 0
      cells.push([p.x, p.y, 1, Math.max(tw, 0.24 * breath)])
    })
    return {
      key: `L${i}`,
      cells,
      ink: inkEnd,
      // the breath: the backlight behind the mark going brighter, and back
      glow: { x: m.cx, y: m.cy, r: 22 + 6 * breath, a: 0.14 + 0.46 * breath, inner: 0.9, light: true },
    }
  }
  const frame = (t) => {
    if (t < gatherAt) return told.frame(t)
    const w = fade(t)
    if (t < liveAt) {
      if (!gather) gather = gatherOf()
      const u = t - gatherAt
      return { key: `G${Math.round(u)}`, cells: gather.map((b) => bitAt(b, u)), wash: w, ink: inkEnd }
    }
    return live(t)
  }
  return {
    cols: I_COLS, rows: I_ROWS, panel, fine: true, frame,
    // the told part is over when the words start; the rest goes on until
    // the screen sleeps, and then it is told again
    end: liveAt, live: true, still: liveAt + 6 * LIVE_MS, loop: rest + REST_MS,
    times: { ...told.times, gather: gatherAt, live: liveAt, rest },
  }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MARK IN PIXELS, AND THE TWO WHO RUN INTO IT                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three screens in the product tell the same small story on a phone: the
// intro, the door to the core service (screens/Join.jsx) and the mutual
// (screens/Reveal.jsx). A boy and a girl run toward each other across a lit
// panel, in from out past its edges on the same frame; he slows and opens
// his arms, and her run carries her on into them, leaning the way she ran,
// until she is still, half behind him, his arms round her, and they
// breathe. The phone's backlight turns pink, from where they hold each
// other out to the edges of the glass and no further, a cell at a time,
// the whole phone becomes a letter lit in rose, and the two of them glide
// together into the mark. The mutual's is a film now (28 September, the
// owner asked for the animation over the whole screen, with both names):
// told once over the whole glass, the two names credited on it before the
// two of them run in (`filmStory`), and the mark it ends on stays alive in
// the keepsake the film pulls back into (`keepStory`). The loop that took
// the telling back and told it again (`revealStory`) is the mail's now,
// which still photographs it. This file is how the stories are told, and
// none of it is a picture: the mark is rasterised from mark.js, the two
// people are bodies posed and laid on the grid cell by cell (folk.js), the
// notes are drawn a pixel at a time, the way looks.js draws the aerial and
// the pen, and the words are the phone's own face in cells (pixtype.js).
// PixelStory.jsx puts them on the glass.
//
// Nothing here touches the page. A story is a function of the clock that
// answers with a list of lit cells, so it can be held on any frame, drawn
// last frame first under reduced motion, and read in node.

import { ECL, NEAR, CHALK, ringPath, starPath, rad } from './mark.js'
import { introFolk, standing, sheet, drawBody, together, mixPose, body, SCALE } from './folk.js'

// ── the mark, on a canvas ───────────────────────────────────────────────────
// Moved here out of share.js, which signed the shared picture with it until
// the brand was drawn on the phone's grid (brand.js, whose mark starts from
// this raster at 29). It is what `markCells` rasterises: the ring, then the
// star with the gutter cut out of it where the ring passes in front, then the ring's
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
export const NOTE = [
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
// and at `k` times, for a note or a name drawn larger on a taller glass
// (the film's): `twice` is this at two
export function scaled(cells, k, x, y) {
  const out = []
  for (const [cx, cy, ink, h, a] of cells) {
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) out.push([x + k * cx + dx, y + k * cy + dy, ink, h || 0, a ?? 1])
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
export function markOn(n, ox, oy, cut = MARK_CUT) {
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
//
// ── the pace ──
// How long the pink takes to reach the last corner (`wash`), how far into
// it the two of them start to glide (`glide`), and the glide's own moments:
// the ground leaving over `ring` from left to right, its far half `lag`
// after its near half, and the star opening from `starAt`, over `star`, out
// from where they hold each other; each pixel `flight` on its way. `TOLD`
// is the door's and the mutual's, where the pink goes most of the way out
// before the mark begins to gather. The intro has its own (`I_QUICK`).
const TOLD = { wash: 1500, glide: 950, ring: 240, lag: 60, starAt: 90, star: 170, flight: 560 }
const morphMs = (p) => Math.max(p.ring + p.lag + p.flight, p.starAt + p.star + p.flight)
export const I_MORPH_MS = morphMs(TOLD)
// The intro's: the glide starts on the frame they hold each other, while the
// pink is still leaving them, and is two thirds of the time, so the two of
// them going into the star and the pink going out from them are one
// movement. The owner saw the pink reach the edges, then a pause, then the
// mark begin to form, and asked for the two at once and the morph faster.
// The pink is a little quicker as well, so it reaches the last corner while
// the mark is still settling, and not a second after it.
export const I_QUICK = { wash: 1100, glide: 80, ring: 150, lag: 40, starAt: 40, star: 110, flight: 400 }
const I_BEND = 3
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
export function* transport(from, to, rounds = 24) {
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
// rasterised in the first. `pace` is the glide's moments (`TOLD`, `I_QUICK`)
function* glideOf(pair, dashes, n, ox, oy, cols, hug, pace = TOLD) {
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
    for (const [s, d] of pairs(line, arc)) bits.push(bit(s, d.x, d.y, (s[0] / cols) * pace.ring + (near ? 0 : pace.lag), pace.flight))
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
    const b = bit(s, d[0], d[1], pace.starAt + (from(s) / far) * pace.star, pace.flight)
    // (theirs, and not the ground's: set along with them, `shiftFor`)
    b.pair = true
    bits.push(b)
  })
  const faint = pair.filter((c) => (c[4] ?? 1) < 0.2)
  return { bits, faint, done: m.all, ms: morphMs(pace) }
}
// the glide at `t`, the two of them leaving from `dx` cells along (and
// landing where the mark is, wherever they left from)
function glideAt(m, t, dx = 0) {
  if (t >= m.ms) return m.done
  const out = []
  for (const b of m.bits) {
    const k = (t - b.delay) / b.flight
    const [x, y] = bitAt(b, t)
    // lit whole by the time it lands, on the glide's own curve
    const e = k <= 0 ? 0 : k >= 1 ? 1 : glide(k)
    const a = b.a + (1 - b.a) * e
    out.push([b.pair && dx ? x + dx * (1 - e) : x, y, 1, 0, a])
  }
  // the soft edge goes out as the drawing leaves
  const f = 1 - Math.min(1, t / 160)
  if (f > 0) for (const c of m.faint) out.push([c[0] + dx, c[1], 1, 0, (c[4] ?? 1) * f])
  return out
}

// ── the intro ───────────────────────────────────────────────────────────────
// The story, and the ending the door and the mutual tell too: the two of
// them are bodies drawn from poses (folk.js), on a grid of the pitch every
// letter on the wall is lit at, so that they are people and not sticks; she
// runs on into his arms and half behind him, and does not dip; and there is
// no heart. From `start`, in ms (folk.js has the run and the catch):
//
//     -    the glass, lit and empty: the dashed ground on the night's grey,
//          and nobody on it. The two of them are running already, out past
//          either edge of the glass, and are not drawn or even worked out
//          until they are nearly at it (`I_OFF`)
//     30   they come over the edges of the glass together, he from the left
//          and she from the right, on the same frame (`I_ENTER`), drawn
//          afresh at the display's own rate, their feet planted where they
//          land
//    480   he slows and stands, and opens his arms to her
//    940   she lands in them, her run carrying her on into him and behind
//          him; from 1440 they hold each other, and breathe
//   1360   THE PINK, from where they hold each other: the backlight turning,
//          a few of the panel's cells at a time, out through the glass to
//          its edges and no further, over a second and a half; the phone's
//          own bands and the light it throws turning with it as it reaches
//          them (Intro.jsx, intro.css), until the whole phone is a letter
//          lit in rose (the intro's in whichever look it drew for the load)
//   2310   THE MARK: the two of them into the star and the ground into the
//          ring, gliding, while the last of the glass turns; whole at 3170
//
// That is the door's and the mutual's pace (`TOLD`). The intro's is quicker
// (`I_QUICK`): the glide starts at 1440, on the frame they hold each other,
// as the pink leaves them, and is whole at 2030, with the pink at the last
// corner at 2460.
//
// They used to be on the glass from the story's first frame, and a screen
// that was still coming on had them on it before it was lit: nobody saw
// them come in. The owner asked for both of them to start out of the frame
// and come in at the same moment, so every telling now opens on the empty
// glass, and the screen round it says when (`I_RUN_AT`, Intro.jsx; the
// mutual's `R_EMPTY`).
//
// `panel` is the rose letter's three panel colours and `ink` the night's
// ink and the rose's, which the pink carries the one to the other; the
// intro hands in another letter's for the pink, the one it drew for this
// load (Intro.jsx `LOOKS`). `front` is the lighter colour a block of the
// panel flashes as it turns, as the three numbers of an rgb, and
// `spectrum` is a list of panels for a pink that is two colours or more
// (PixelStory.jsx `pinkOf`): from where they hold each other out to the
// farthest corner, or, with an `axis`, across the glass at that angle, read
// as CSS reads a `linear-gradient`'s (0 to the top, 90 to the right), the
// first panel on the side it leaves and the last on the side it points to,
// whichever of them the front reaches first. `even` gives each panel of a
// spectrum laid out from them an equal share of the glass: laid by distance
// alone, the middle ones take most of it and the first and the last a
// sliver each. `pace` is the pink's and the glide's (`TOLD`, `I_QUICK`).
// `stillPrep` is how long a frame of the empty glass may spend working out
// the glide ahead: the intro's glass has nothing on it then, and the film's
// has the notes and the names moving on it, so it takes a little less
// (`F_PREP_MS`).
//
// ── the intro's own clock ──
// Nought is the first frame the page can paint (Intro.jsx): the screen
// wakes at `I_WAKE_AT`, the flicker and the focus `I_WAKE_MS` long, and then
// stands lit and empty for `I_EMPTY`, a beat to be seen as a screen that is
// on and waiting; and then the two of them come over its edges, together,
// at `I_RUN_AT`.
export const I_WAKE_AT = 40
export const I_WAKE_MS = 500
export const I_EMPTY = 240
export const I_RUN_AT = I_WAKE_AT + I_WAKE_MS + I_EMPTY
// How far into their run the first cell of either of them is on a phone's
// glass, whose panel runs three cells past the story's grid either side; on
// a desk's, which is the grid, it is a frame later (scripts/check-stories.mjs
// measures both, and fails if the two are ever a frame apart).
export const I_ENTER = 30
// Before this, in their run, neither of them is within reach of any glass
// whose panel runs up to sixteen cells past the grid, which is further than
// any the story is drawn on (`ENTER`, below).
const I_OFF = -240
//
// ── and together on any glass ──
// The glass runs past the story's grid by a few cells either side, as many
// as the screen's width leaves once every cell is a whole number of device
// pixels (PixelStory.jsx): none on a desk, three on most phones, and up to
// ten on some. He runs half as fast again as she does, and her arms and
// her hem reach out ahead of her and back as she runs, so the moment each
// of them first lights a cell of the glass moves differently with how far
// it runs past the grid: set for three cells, they came on together, and
// on a glass six cells past she was on it four frames before him. So on a
// glass that would part them, the pair is set a whole number of cells
// along (`shiftFor`), the same for both, which brings one onto the glass
// sooner and the other later, as far as puts them on it within a frame or
// so of each other, and where they hold each other goes with them, and the
// pink leaves from there; the ground and the mark do not move. A whole
// number of cells, so every drawing of them is the one it would have been,
// a cell along.
//
// It goes by the cells of them that are seen. The very first cell either
// of them lights is a sliver of an outline at a sixteenth of the ink, which
// nobody sees on the glass, and hers run further ahead of her than his do
// of him; what is seen is a cell at a quarter of the ink and more, and a
// cell at a half is a hand. `ENTER` is the moment in their run (folk.js)
// each first lights a cell of a glass `o` cells past the grid on their own
// side, at a quarter (`seen`) and at a half (`solid`), and the pair is set
// where the wider of the two gaps is narrowest; scripts/check-stories.mjs
// works them out again from the bodies, and fails if they are ever not
// these.
export const ENTER = {
  him: {
    seen: [54, 46, 38, 31, 23, 16, 9, 2, -5, -30, -51, -68, -84, -98, -112, -124, -137],
    solid: [56, 48, 40, 33, 25, 18, 11, 4, -3, -9, -16, -22, -29, -35, -42, -48, -57],
  },
  her: {
    seen: [68, 57, 47, 36, 4, -29, -56, -79, -101, -120, -139, -156, -172, -186, -202, -216, -230],
    solid: [70, 59, 49, 38, 26, 18, 8, -1, -12, -22, -31, -52, -145, -158, -170, -182, -192],
  },
}
// a frame
const FRAME_MS = 16
// how many cells along, right, to set the two of them on a glass whose
// panel runs from column `l` to column `r` of the story's grid: none when
// they already come on within a frame of each other, and otherwise the
// fewest that bring them nearest
export function shiftFor(l, r) {
  const n = ENTER.him.seen.length - 1
  const oL = Math.max(0, Math.min(n, -l))
  const oR = Math.max(0, Math.min(n, r - (I_COLS - 1)))
  // how far apart they come on, set `dx` along: the wider of the two gaps
  const apart = (dx) => {
    let g = 0
    for (const k of ['seen', 'solid']) {
      const a = ENTER.him[k][oL + dx]
      const b = ENTER.her[k][oR - dx]
      if (a === undefined || b === undefined) return Infinity
      g = Math.max(g, Math.abs(a - b))
    }
    return g
  }
  let best = 0
  let gap = apart(0)
  if (gap <= FRAME_MS) return 0
  for (const dx of [1, -1, 2, -2, 3, -3]) {
    const g = apart(dx)
    if (g < gap) {
      gap = g
      best = dx
    }
  }
  return best
}
export const I_COLS = 95
export const I_ROWS = 75
const I_GROUND = 67
// the mark, rasterised for this grid from the same geometry as the page's
// 47 cell seal: odd, and the tips of the star's long arms a cell past the
// grid's first and last rows
const I_MARK = 77
const I_WASH_AT = -80
// how long a frame of the run may spend working out the glide ahead, and a
// frame of the empty glass, where nothing on it moves
const I_PREP_MS = 3
const I_STILL_PREP_MS = 8
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
// the last corner on the door and the mutual, a little over one on the
// intro (`pace.wash`), quick where it starts and slowing as it fills.
//
// A frame's `wash` is where it leaves from and `p`, how far the front is
// through the glass, 0 to 1, with the fronts of the two steps before
// (`p1`, `p2`), so the blocks that have just turned are drawn a step
// lighter and settle. `p: null` is the whole panel.
const WASH_STEP = 40
const WASH_EASE = 1.6
const washP = (k) => 1 - (1 - Math.max(0, Math.min(1, k))) ** WASH_EASE
// the moment the front is `f` through the glass, on the wash's own clock,
// for a wash `ms` long
const washAtP = (f, ms = TOLD.wash) => ms * (1 - (1 - f) ** (1 / WASH_EASE))
export function washFrom(u, x, y, ms = TOLD.wash) {
  if (u < 0) return null
  if (u >= ms) return { x, y, p: null }
  const i = Math.floor(u / WASH_STEP)
  const at = (n) => washP((n * WASH_STEP) / ms)
  return { x, y, p: at(i + 1), p1: at(i), p2: at(i - 1), step: i }
}
// How far through the glass the front is when it reaches the top band and
// the bottom band, for the phone's glass to turn with it (Intro.jsx,
// Join.jsx, Reveal.jsx). From where they hold each other, a little over a
// third of the way down the glass, the top edge is about two fifths of the
// way to the farthest corner and the bottom band about two thirds.
const REACH = { top: 0.4, bottom: 0.68 }
// When a wash leaving at `at`, `ms` to the corners, reaches the top band and
// the bottom band, and covers the glass: the moments a phone's glass turns
// on (the tellings, scenes/kit.js `tale`, as `introStory` has them)
export const washTimes = (at, ms = TOLD.wash) => ({
  top: Math.round(at + washAtP(REACH.top, ms)), bottom: Math.round(at + washAtP(REACH.bottom, ms)), covered: at + ms,
})
// two hex colours mixed, `k` of the way
export function mixHex(a, b, k) {
  const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
export function introStory(start = 0, { panel = PANEL, ink = null, folk: given = null, pace = TOLD, front = null, spectrum = null, axis = null, even = false, stillPrep = I_STILL_PREP_MS } = {}) {
  // the two of them: the intro's run, or a story's own way to the same hold
  // (the door's, `joinStory`), which answers the same `at`, `times`, `pair`
  // and `hug`
  const folk = given || introFolk({ ground: I_GROUND, mid: (I_COLS - 1) >> 1 })
  const floor = groundAt(I_GROUND, I_COLS)
  const washAt = start + folk.times.hold + I_WASH_AT
  const morphs = washAt + pace.glide
  const done = morphs + morphMs(pace)
  const end = Math.max(done, washAt + pace.wash)
  const MX = (I_COLS - I_MARK) >> 1
  const MY = (I_ROWS - I_MARK) >> 1
  let morph = null
  // the ink, from the night's to the rose's as the pink goes out
  const inkAt = (u) => {
    if (!ink) return null
    const k = Math.max(0, Math.min(1, u / (pace.wash * 0.6)))
    return k <= 0 ? ink[0] : k >= 1 ? ink[1] : mixHex(ink[0], ink[1], Math.round(k * 8) / 8)
  }
  // The glide is worked out ahead, and a little at a time. The heavy start
  // of it, the hold drawn and the mark rasterised, is done before the clock
  // starts (`prime`, Intro.jsx and Reveal.jsx call it on the black before
  // the screen wakes), and the rest a few milliseconds a frame, most of it
  // on the frames of the empty glass, where nothing on it moves, and the
  // last of it while they run: so that no frame pays for all of it and the
  // frame the glide starts on pays for none. A frame that needs it sooner (a
  // held clock, a skip) works out the rest there and then.
  let prep = null
  const warm = (budget) => {
    // (read in node, by the frame checks, there is no canvas to rasterise
    // the mark on, and nothing they ask for before the glide needs it)
    if (morph || typeof document === 'undefined') return
    if (!prep) prep = glideOf(folk.pair, floor, I_MARK, MX, MY, I_COLS, folk.hug, pace)
    const t0 = performance.now()
    do {
      const r = prep.next()
      if (r.done) {
        morph = r.value
        return
      }
    } while (performance.now() - t0 < budget)
  }
  // The empty glass: the ground, in the night's ink, and nobody on it. One
  // frame, the same object every time it is asked, so the canvas is not
  // drawn again while it stands (PixelStory.jsx), and the one the mutual
  // comes back to at the end of each telling.
  const empty = { key: 'e', cells: floor, ink: ink ? ink[0] : null }
  // `edge` is the glass the frame is for, the first and last column of its
  // panel on the story's grid (PixelStory.jsx), and the two of them are set
  // along for it (`shiftFor`); the door's two stand where they stand
  const shifts = new Map()
  const shiftOf = (edge) => {
    if (given || !edge) return 0
    const k = edge.l * 1000 + edge.r
    if (!shifts.has(k)) shifts.set(k, shiftFor(edge.l, edge.r))
    return shifts.get(k)
  }
  const frame = (t, edge = null) => {
    if (!given && t - start < I_OFF) {
      warm(stillPrep)
      return empty
    }
    warm(t >= morphs ? Infinity : I_PREP_MS)
    const dx = shiftOf(edge)
    const u = t - washAt
    const wash = washFrom(u, folk.hug.x + dx, folk.hug.y, pace.wash)
    const wk = !wash ? '' : wash.p == null ? 'W' : `w${wash.step}`
    if (t >= morphs) {
      const mt = t - morphs
      return { key: `m${mt >= morph.ms ? 'done' : `${Math.round(mt)}|${dx}`}|${wk}`, cells: glideAt(morph, mt, dx), wash, ink: inkAt(u) }
    }
    const f = folk.at(t - start)
    const them = dx ? f.cells.map((c) => [c[0] + dx, c[1], c[2], c[3], c[4]]) : f.cells
    return { key: `${f.key}|${dx}|${wk}`, cells: [...floor, ...them], wash, ink: inkAt(u) }
  }
  const T = folk.times
  return {
    cols: I_COLS, rows: I_ROWS, end, panel, front, spectrum, axis, even, fine: true,
    times: {
      run: start + T.run, slow: start + T.slow, stop: start + T.stop, meet: start + T.meet, hold: start + T.hold,
      // the frame they come over the edges of a phone's glass
      enter: start + (given ? 0 : I_ENTER),
      catch: start + T.meet, glow: washAt, morphs, done, end,
      // the front at the top band and at the bottom band, and the panel
      // all pink, for the phone's glass to turn with it
      top: Math.round(washAt + washAtP(REACH.top, pace.wash)),
      bottom: Math.round(washAt + washAtP(REACH.bottom, pace.wash)),
      covered: washAt + pace.wash,
    },
    frame,
    empty,
    // the heavy start of the glide, and `budget` ms more of it, before the
    // clock starts; answers whether all of it is done
    prime: (budget = 0) => { warm(budget); return !!morph },
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

// ── the mutual, told on a loop ──────────────────────────────────────────────
// The mutual's screen as it was until 28 September, and as the mail still
// photographs it (scripts/darkroom.mjs, scripts/export-mail.mjs): the page
// tells it once now, as a film (`filmStory`, below), and this is kept for
// the picture in the mail, whose GIF loops. The intro's story, the same two
// on the same grid with the same ending; and then the screen does not stop,
// and it is told again, and the end of one telling is the beginning of the
// next, with no seam between them.
//
// Each telling opens on the lit, empty glass, the dashed ground on the
// night's grey, and holds it a beat (`R_EMPTY`); then the two of them come
// in over its edges on the same frame, and it is the intro's story to the
// mark. The first telling's screen comes on before that, over `R_WAKE`,
// with the empty glass on it (Reveal.jsx starts the clock that much after
// the screen's first frame).
//
// When the mark is whole it stands a moment, and then gathers up into the
// top of the glass at two thirds of its size (`R_SMALL`), gliding like
// everything else, to leave the bottom of the panel to the words
// (screens/Reveal.jsx types them there, in the phone's face). As it goes,
// the pink the story lit on the glass goes out onto the phone's own panel
// under it, which the rose has reached by then (mutual.css `--mu-turn`),
// and which from there on drifts slowly through its colours and home again
// (Reveal.jsx `drift`). Then the mark is alive, ten times a second, on a
// loop that is only ever a function of the clock:
//
//   the breath   the backlight behind the mark brighter and back, slowly,
//                once every 2800ms, the star warming a little with it
//   the glint    a light going round the ring, once every 2400ms
//   twinkle      a cell or two of the star lit each frame
//
// all three coming up out of nothing as it comes alive and going back into
// it before the telling is taken back, so the mark is never stopped on a
// lit frame.
//
// There was a heartbeat, the backlight going lub and dub, and a small heart
// floating up off the star every four seconds. The owner took the heart out
// of the stories, and the beat is a breath now.
//
// ── and it is taken back ──
// It used to go to sleep: the screen went dark for most of a second, the
// light that had drifted was put back behind it, and it woke on a new
// telling with the two of them already on the glass. It read as a restart,
// and the owner asked for it to loop perfectly. So the telling now takes
// itself back, in the phone's own way, until the glass is what it opened
// on, and the next telling starts from there (`untell`, from `quiet`):
//
//      0   the light has drifted home to the rose and the mark is still;
//          the words are deleted the way the phone deleted, a character,
//          the key held, and the rest going quickly, its cursor stepping
//          back (Reveal.jsx). Under it, unseen, the story's own pink comes
//          back over the panel's rose, which is the same pink, and the
//          panel under that goes back to the night's (Reveal.jsx `going`)
//    620   the ring drops out of the mark and lies down again as the dashed
//          ground, left to right, each pixel between the cells until it
//          lands; the star goes out a few cells at a time, from its tips in
//    700   the pink leaves the glass, a few cells at a time, from its corners
//          in toward the star, a block that has just gone over keeping a
//          little of its pink for a step, as an LCD's cell does; the bands
//          and the light round the phone turn back to the night's as it
//          leaves the top of the glass (`back`)
//   1780   the last of the pink and the last cell of the star go out
//          together, at the middle of the star, and the glass is the empty
//          glass the telling opened on, the same frame
//
// None of it is random: each frame is chosen by its own number, so a frame
// held for a screenshot is the same frame every time. `still` is a frame of
// it alive, for reduced motion.
export const R_EMPTY = 320
// the first telling's screen coming on (screen.css `wl-wake`) before its
// nought, with the empty glass on it
export const R_WAKE = 900
const R_SMALL = 51
// the mark stands whole this long before it gathers up
const R_MARK_HOLD = 900
const R_GATHER_MS = 620
const R_FADE_MS = 480
const LIVE_MS = 100
// how long it is alive, two breaths, and how long it takes to come alive
// and to go quiet again
const R_LIVE = 5600
const R_LIVE_IN = 700
const R_LIVE_OUT = 900
const BREATH = 28
const GLINT = 24
// the telling taken back, in ms from `quiet`: the story's pink back over the
// panel's own, and the panel under it back to the night's once it is
const R_BACK_MS = 360
const R_GOING = 400
// the ring down into the ground, as the ground rose into it
const R_UNMAKE_AT = 620
const R_RING_SPREAD = 240
const R_RING_FLIGHT = 560
// the pink off the glass, quick at its corners and slowing as it closes on
// the star, a step every 40ms
const R_RECEDE_AT = 700
const R_RECEDE_MS = 1120
const RECEDE_EASE = 1.4
// and a beat of the empty glass before the next telling's own
const R_TAIL = 100
// the phone round the glass (`phone`, below): its light turning, the light
// it throws in the room coming up and breathing, and the phone rising and
// settling while the mark is alive
const TURN_MS = 460
const PAN_MS = 160
const HALO_UP = 1100
const HALO_OUT = 600
const BREATHE_MS = 4200
const FLOAT_MS = 4200
const FLOAT_PX = 6

// The pink leaving the glass: `p` from 1 down to 0 over `R_RECEDE_MS`, in
// steps, with where it stood the step before and the step before that, so
// the blocks that have just gone keep a little of it (PixelStory.jsx
// `spreadOn`, `back`). Null once the last block has settled.
const recedeP = (k) => (1 - Math.max(0, Math.min(1, k))) ** RECEDE_EASE
const recedeAtP = (f) => R_RECEDE_MS * (1 - f ** (1 / RECEDE_EASE))
function recedeFrom(v, x, y) {
  const n = R_RECEDE_MS / WASH_STEP
  const i = Math.floor(v / WASH_STEP)
  if (i >= n + 2) return null
  const at = (s) => (s < 0 ? 1 : recedeP(s / n))
  return { x, y, p: at(i + 1), p1: at(i), p2: at(i - 1), step: i, back: true }
}

// a list of [t, value] keys, and the value between them, in a straight line
function along(keys, t) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [b, vb] = keys[i]
    if (t <= b) {
      const [a, va] = keys[i - 1]
      return b > a ? va + ((vb - va) * (t - a)) / (b - a) : vb
    }
  }
  return keys[keys.length - 1][1]
}

// ── the mark, alive ─────────────────────────────────────────────────────────
// What the mark does once it has stood whole, the same on every glass it is
// on: it gathers up into the top of the glass at two thirds of its size
// (`small`, `gatherOf`), the story's pink going out onto the phone's own
// rose under it (`fadeAt`), and then it is alive (`live`). Factored out of
// the mutual's loop (`revealStory`, the mail's) for the film and the
// keepsake, which draw the same mark on the same clock, so the mark the
// film pulls back from and the one the keepsake holds are one mark, frame
// for frame. `live(i, e)` is its `i`th tenth of a second, `e` of the way
// alive (the loop comes up out of nothing and goes back into it; the
// keepsake only comes up).
export function markLife({ ink = null } = {}) {
  const inkEnd = ink ? ink[1] : null
  const MX = (I_COLS - I_MARK) >> 1
  const MY = (I_ROWS - I_MARK) >> 1
  let small = null
  const smallMark = () => {
    if (!small) {
      small = markOn(R_SMALL, (I_COLS - R_SMALL) >> 1, 2, I_CUT)
      small.still = [...small.ring.map((p) => [p.x, p.y, 1, 0]), ...small.star.map((p) => [p.x, p.y, 1, 0])]
    }
    return small
  }
  // the story's pink, going out onto the panel's own light under it, `u`
  // after the mark starts to gather
  const fadeAt = (u) => {
    const k = u / R_FADE_MS
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
  const live = (i, e) => {
    const m = smallMark()
    const breath = (1 - Math.cos((2 * Math.PI * (i % BREATH)) / BREATH)) / 2
    const cells = []
    // the glint, going round the ring by its own angle
    const g = ((i % GLINT) / GLINT) * Math.PI * 2 - Math.PI
    for (const p of m.ring) {
      let d = Math.abs(p.ang - g)
      if (d > Math.PI) d = Math.PI * 2 - d
      cells.push([p.x, p.y, 1, d < 0.5 ? 0.9 * (1 - d / 0.5) * e : 0])
    }
    // the star, warming as the light comes up, and a cell or two of it lit
    m.star.forEach((p, j) => {
      const tw = hash(i, j) < (3.4 * e) / m.star.length ? 1 : 0
      cells.push([p.x, p.y, 1, Math.max(tw, 0.24 * breath * e)])
    })
    return {
      cells,
      // the breath: the backlight behind the mark going brighter, and back
      glow: { x: m.cx, y: m.cy, r: 22 + 6 * breath, a: (0.14 + 0.46 * breath) * e, inner: 0.9, light: true },
    }
  }
  return { small: smallMark, gatherOf, fadeAt, live, ink: inkEnd }
}

export function revealStory({ panel = PANEL, ink = null } = {}) {
  // they come over the edges of the glass `R_EMPTY` into each telling
  const told = introStory(R_EMPTY - I_ENTER, { panel, ink })
  const T = told.times
  const inkEnd = ink ? ink[1] : null
  const gatherAt = T.done + R_MARK_HOLD
  const liveAt = gatherAt + R_GATHER_MS
  const quietAt = liveAt + R_LIVE
  const nightAt = quietAt + R_RECEDE_AT + R_RECEDE_MS + 2 * WASH_STEP
  const loop = nightAt + R_TAIL
  const life = markLife({ ink })
  let gather = null
  let unmake = null
  const smallMark = life.small
  const fade = (t) => life.fadeAt(t - gatherAt)
  const live = (t) => {
    const i = Math.floor((t - liveAt) / LIVE_MS)
    // how alive it is, on the frame's own moment: up out of nothing, and
    // back into it before the telling is taken back
    const tq = liveAt + i * LIVE_MS
    const e = smooth01(Math.min((tq - liveAt) / R_LIVE_IN, (quietAt - tq) / R_LIVE_OUT))
    const l = life.live(i, e)
    return { key: `L${i}`, cells: l.cells, ink: inkEnd, glow: l.glow }
  }
  // The telling taken back: the ring's way down into the ground, each of
  // its pixels to a dash, as the ground rose into it, left to right and the
  // near half first; and the moment each cell of the star goes out, from its
  // tips in, the middle last, on the frame the last of the pink goes.
  const floor = told.empty.cells
  const unmakeOf = () => {
    if (unmake) return unmake
    const m = smallMark()
    const line = [...floor].sort((p, q) => p[0] - q[0])
    const ring = []
    for (const near of [true, false]) {
      const arc = m.ring.filter((p) => p.near === near).sort((p, q) => p.u - q.u)
      for (const [s, d] of pairs(line, arc)) {
        ring.push(bitOf(d.x, d.y, s[0], s[1], 1, (s[0] / I_COLS) * R_RING_SPREAD + (near ? 0 : 60), R_RING_FLIGHT))
      }
    }
    const last = R_RECEDE_AT + R_RECEDE_MS - WASH_STEP - R_UNMAKE_AT - 2 * WASH_STEP
    const far = Math.max(...m.star.map((p) => p.r))
    const star = m.star.map((p, j) => {
      const k = p.r / far
      return { x: p.x, y: p.y, o: (1 - k) ** 0.8 * last + hash(j, 17) * 60 * k }
    })
    unmake = { ring, star, moving: R_RING_SPREAD + 60 + R_RING_FLIGHT }
    return unmake
  }
  // a ring pixel on its way down: the near ink, going to the far ink's
  // strength as it goes, and a dash of the ground where it lands
  const downAt = (b, v) => {
    const k = (v - b.delay) / b.flight
    if (k <= 0) return [b.sx, b.sy, 1]
    if (k >= 1) return [b.dx, b.dy, 2]
    const e = glide(k)
    const arc = Math.sin(Math.PI * e)
    return [b.sx + (b.dx - b.sx) * e + b.nx * arc, b.sy + (b.dy - b.sy) * e + b.ny * arc, 1, 0, 1 - 0.5 * e]
  }
  const untell = (t) => {
    const u = t - quietAt
    const m = smallMark()
    // the pink: back over the panel's own, whole, and then leaving it for
    // the star, a few cells at a time
    let wash
    let wk
    if (u < R_RECEDE_AT) {
      const level = smooth01(u / R_BACK_MS)
      wash = { p: null, level }
      wk = `b${Math.round(level * 32)}`
    } else {
      wash = recedeFrom(u - R_RECEDE_AT, m.cx, m.cy)
      wk = wash ? `r${wash.step}` : ''
    }
    // the ink, back to the night's as the pink goes
    const k = Math.max(0, Math.min(1, (u - R_RECEDE_AT) / (R_RECEDE_MS * 0.6)))
    const inkNow = !ink ? null : k <= 0 ? inkEnd : k >= 1 ? ink[0] : mixHex(inkEnd, ink[0], Math.round(k * 8) / 8)
    const v = u - R_UNMAKE_AT
    if (v < 0) return { key: `U${wk}`, cells: m.still, wash, ink: inkNow }
    const d = unmakeOf()
    const cells = d.ring.map((b) => downAt(b, v))
    const q = Math.floor(v / WASH_STEP) * WASH_STEP
    for (const s of d.star) {
      if (q >= s.o + 2 * WASH_STEP) continue
      cells.push([s.x, s.y, 1, 0, q >= s.o ? 0.45 : 1])
    }
    return { key: `U${v < d.moving ? Math.round(v) : `q${q}`}|${wk}|${inkNow}`, cells, wash, ink: inkNow }
  }
  const frame = (t, edge = null) => {
    if (t < gatherAt) return told.frame(t, edge)
    if (t < liveAt) {
      if (!gather) gather = life.gatherOf()
      const u = t - gatherAt
      return { key: `G${Math.round(u)}`, cells: gather.map((b) => bitAt(b, u)), wash: fade(t), ink: inkEnd }
    }
    if (t < quietAt) return live(t)
    if (t < nightAt) return untell(t)
    // the empty glass it opened on: the same frame
    return told.empty
  }

  // ── the phone round the glass ──
  // What the page does round the canvas on the same clock (Reveal.jsx,
  // mutual.css), set down here, as keys along one telling, so that the
  // page is drawn from them and a telling's last frame and the next one's
  // first can be checked to be one (scripts/check-stories.mjs):
  //
  //   turn    the bands, their status and the light round the phone, from
  //           the night's (0) to the rose's (1): up as the pink reaches the
  //           top of the glass, and back as it leaves it
  //   pan     the panel under the pink: up once the pink has covered it,
  //           and back under the pink once the pink is whole over it again
  //   halo    the light the phone throws in the room, its strength and its
  //           size: up with the rose, breathing while the rose is on the
  //           phone, and out as the rose goes, every breath a whole one
  //   float   the phone rising a few pixels and settling, while the mark
  //           is whole, and still while the two of them run
  //   drift   the window the phone's light drifts in, from the rose and
  //           home to it (Reveal.jsx `drift`)
  //
  // Each key is [ms, value, easing of the way to the next]. Nothing on the
  // page moves on a clock of its own: the float and the halo are laid on the
  // story's clock, a telling long, and taken round with it.
  const back = Math.round(quietAt + R_RECEDE_AT + recedeAtP(REACH.top))
  const going = quietAt + R_GOING
  const haloUp = T.top + HALO_UP
  const breaths = Math.max(1, Math.round((back - haloUp) / BREATHE_MS))
  const breathe = (back - haloUp) / breaths
  const halo = [[0, [0, 0.96]], [T.top, [0, 0.96], 'ease-out'], [haloUp, [0.75, 0.96], 'ease-in-out']]
  for (let b = 0; b < breaths; b++) {
    halo.push([haloUp + breathe * (b + 0.5), [1, 1.04], 'ease-in-out'], [haloUp + breathe * (b + 1), [0.75, 0.96], 'ease-in-out'])
  }
  halo.push([back + HALO_OUT, [0, 0.96]], [loop, [0, 0.96]])
  const floats = Math.max(1, Math.round((nightAt - T.done) / FLOAT_MS))
  const rise = (nightAt - T.done) / floats
  const float = [[0, 0], [T.done, 0, 'ease-in-out']]
  for (let f = 0; f < floats; f++) float.push([T.done + rise * (f + 0.5), -FLOAT_PX, 'ease-in-out'], [T.done + rise * (f + 1), 0, 'ease-in-out'])
  float.push([loop, 0])
  const phone = {
    turn: [[0, 0], [T.top, 0], [T.top + TURN_MS, 1], [back, 1], [back + TURN_MS, 0], [loop, 0]],
    pan: [[0, 0], [T.covered, 0], [T.covered + PAN_MS, 1], [going, 1], [going + PAN_MS, 0], [loop, 0]],
    halo, float, drift: [liveAt, quietAt],
  }
  // the phone at `u` into a telling, for a held frame and for the check
  const lightAt = (u) => {
    const at = (keys, j) => along(keys.map((k) => [k[0], j == null ? k[1] : k[1][j]]), u)
    return {
      turn: at(phone.turn), pan: at(phone.pan), halo: at(phone.halo, 0), size: at(phone.halo, 1),
      float: at(phone.float), drifting: u > liveAt && u < quietAt,
    }
  }

  return {
    cols: I_COLS, rows: I_ROWS, panel, fine: true, frame, loop,
    // the told part is over when the words start; from there it is alive,
    // ten frames a second, until it goes quiet and is taken back, and then
    // it is told again
    end: liveAt, live: [liveAt, quietAt], still: liveAt + 8 * LIVE_MS,
    times: { ...T, gather: gatherAt, live: liveAt, quiet: quietAt, going, back, night: nightAt, loop },
    phone, lightAt,
    // the heavy start of the story, before the clock starts
    prime: (budget = 0) => { told.prime(budget); smallMark() },
  }
}

// ── the mutual, as a film ───────────────────────────────────────────────────
// The telling the page plays now (screens/Reveal.jsx, Film.jsx), once, over
// the whole screen, when a mutual is opened for the first time. The owner
// asked for the animation to take the entire screen and to carry both of
// their names, and for the thing it ends on to be worth keeping; the loop
// above read as the intro laid over the message. So it is the story with a
// beginning of its own and an end that stays:
//
//      0   the glass, lit (the screen has just come on round it): the
//          ground, and over the middle two sealed notes, dim, two cells apart,
//          which is where the slot in the private notes left them, stepping
//          toward each other and never meeting (Slot.jsx)
//    300   they wake on one frame and slide into one note, lit
//    500   the ring of light a cell out round it, a frame long, as on the door
//    760   the note goes out a cell at a time, and the two names come on
//          round it in blocks of the panel's cells, from the middle out:
//          theirs over yours, in the phone's face (pixtype.js), as large as
//          the glass will take them, all of them on by 1080
//   2280   the names go out, from the outside in, and the glass is the
//          ground and nobody on it, a beat
//   2890   the two of them come over its edges on one frame, and it is the
//          intro's story from there, at a pace of its own (`FILM_PACE`): the
//          catch, the hold, the pink, the rose, the mark, whole at 5370
//   5870   the mark gathers up into the top of the story's grid
//          (`markLife`), which is the top of the glass on a desk and a
//          little under half way down an upright phone's, the pink going
//          out onto the rose under it, and from 6030 `it's mutual.` is typed
//          under it in cells, a character every 70ms, with the phone's
//          cursor after it
//   6490   the mark is alive, ten frames a second, and never taken back
//
// Then the page pulls the camera back (Film.jsx), and the glass is the
// middle of the keepsake, where the same mark goes on (`keepStory`).
//
// The names are the story's and not the page's: `credit` is the two as
// typeCells answers them, and `say` the sentence. Both are set against the
// glass the frame is for (`edge`, all four sides of the panel on the story's
// grid, PixelStory.jsx): the notes three times the door's on a glass taller
// than 110 cells and twice on any other, and the names the largest of three
// sizes that keeps each line to four fifths of the glass's width and the
// two to half its height. A name too long even at one is cut, a character
// at a time, and three dots put after it.
export const FILM_PACE = { wash: 1300, glide: 420, ring: 200, lag: 50, starAt: 60, star: 140, flight: 480 }
// They come over the edges of a phone's glass at 2890 (introStory's `enter`
// is its start and `I_ENTER`), 370ms after the last of the names has gone,
// the intro's beat of the empty glass before they come. It was 1900, on the
// heels of the names; but a desk's glass runs sixteen cells past the grid,
// and on it the two of them are seen a quarter of a second sooner than on a
// phone's (`ENTER`), which put them on the glass while the names were still
// going out (scripts/check-stories.mjs, 6). The names stand whole for 1200ms
// (`F_OUT_AT`), long enough to read two of them; they stood 540, and were
// gone before the eye had got from the first to the second (the review of
// 28 September), and every beat after moved on the 660ms that added.
const F_RUN = 2860
const F_WAKE = 300
const F_SLIDE = 200
const F_RING = 80
const F_OPEN = 760
const F_STEP = 40
const F_IN_STEPS = 8
const F_OUT_AT = F_OPEN + F_IN_STEPS * F_STEP + 1200
const F_OUT_STEPS = 7
const F_MARK_HOLD = 500
const F_SAY_LAG = 160
const F_TYPE_MS = 70
const F_SAID_HOLD = 300
const F_PULL_MS = 900
// how long a frame before they come in may spend working out the glide
// ahead (introStory `stillPrep`): the notes and the names draw only the
// part of the glass they are on (PixelStory.jsx `paintCrisp`), which leaves
// a frame room for it, and the glide has to be done by 3980 on a slow phone
const F_PREP_MS = 6
// the cursor's beat, half of the phone's 1060ms (screen.css `wl-blink`)
const BLINK = 530
// the sentence's baseline on the story's grid, under the gathered mark
const SAY_Y = 68
// the cursor: two cells wide, a stem of the face, from a capital's top to
// the foot of a descender
const CUR_W = 2
const CUR_TOP = SAY_Y - 10
const CUR_ROWS = 12
// the story's grid, for a frame asked of it with no glass (the checks)
const GRID = { l: 0, r: I_COLS - 1, t: 0, b: I_ROWS - 1 }
const edgeOf = (edge) => (edge ? { l: edge.l, r: edge.r, t: edge.t ?? GRID.t, b: edge.b ?? GRID.b } : GRID)

// The sentence and its cursor, as the frames of both the film and the
// keepsake draw them: the characters in (`typed` of them) and the cursor
// after the last, lit or not. Each cell knows which character it is of.
function sayingOf(say) {
  const x0 = ((I_COLS - 1) >> 1) - Math.floor(say.w / 2)
  const ends = say.ends || []
  const cells = say.cells.map(([x, y]) => {
    let j = 0
    while (j < ends.length - 1 && x >= ends[j]) j++
    return [x0 + x, SAY_Y + y, 1, 0, 1, j]
  })
  const n = ends.length
  const at = (typed, lit) => {
    const out = typed >= n ? cells : cells.filter((c) => c[5] < typed)
    if (!lit) return out
    const cx = x0 + (typed > 0 ? ends[Math.min(n, typed) - 1] : 0) + 1
    const cur = []
    for (let y = CUR_TOP; y < CUR_TOP + CUR_ROWS; y++) for (let x = cx; x < cx + CUR_W; x++) cur.push([x, y, 1])
    return [...out, ...cur]
  }
  return { n, at }
}

export function filmStory({ credit = null, say = { cells: [], w: 0, ends: [] }, panel = PANEL, ink = null } = {}) {
  const told = introStory(F_RUN, { panel, ink, pace: FILM_PACE, stillPrep: F_PREP_MS })
  const T = told.times
  const life = markLife({ ink })
  const inkEnd = life.ink
  const gatherAt = T.done + F_MARK_HOLD
  const liveAt = gatherAt + R_GATHER_MS
  const sayAt = gatherAt + F_SAY_LAG
  const saying = sayingOf(say)
  const saidAt = sayAt + saying.n * F_TYPE_MS
  const pullAt = saidAt + F_SAID_HOLD
  const mid = (I_COLS - 1) >> 1
  let gather = null

  // ── the two notes ──
  const notes = (t, e) => {
    if (t >= F_OPEN + J_OUT) return { cells: [], key: '' }
    const kn = e.b - e.t + 1 >= 110 ? 3 : 2
    const NW = NOTE[0].length * kn
    const top = 30 - Math.floor((NOTE.length * kn) / 2)
    const a = mid - 1 - NW
    const b = mid + 1
    const one = mid - Math.floor(NW / 2)
    const at = (x, k) => scaled(cellsOf(NOTE, { ink: k }), kn, x, top)
    if (t < F_WAKE) return { cells: [...at(a, 2), ...at(b, 2)], key: `|s${kn}` }
    if (t < F_WAKE + F_SLIDE) {
      const k = smooth01((t - F_WAKE) / F_SLIDE)
      const xa = Math.round(a + (one - a) * k)
      const xb = Math.round(b + (one - b) * k)
      return { cells: [...at(xa, 1), ...at(xb, 1)], key: `|w${kn}.${xa}.${xb}` }
    }
    const lit = at(one, 1)
    const found = F_WAKE + F_SLIDE
    if (t < found + F_RING) {
      const ring = []
      const h = NOTE.length * kn
      for (let y = top - 1; y <= top + h; y++) {
        for (let x = one - 1; x <= one + NW; x++) {
          if (y === top - 1 || y === top + h || x === one - 1 || x === one + NW) ring.push([x, y, 1, 0, 0.3])
        }
      }
      return { cells: [...lit, ...ring], key: `|N+${kn}` }
    }
    if (t < F_OPEN) return { cells: lit, key: `|N${kn}` }
    // out a cell at a time, each a step dimmer on its way, as the door's
    const q = Math.floor((t - F_OPEN) / F_STEP)
    const left = []
    lit.forEach((c, i) => {
      const o = hash(i, 11) * (J_OUT - 80)
      if (q * F_STEP >= o + 80) return
      left.push(q * F_STEP >= o ? [c[0], c[1], 1, 0, 0.45] : c)
    })
    return { cells: left, key: `|n${kn}.${q}` }
  }

  // ── the names ──
  // Laid out once for each glass: the size, the two lines centred on the
  // middle column round the row the notes stood on, and the blocks of two by
  // two cells they come on and go out in, each with its place in the order,
  // from where the note was out to the far ends of the names, a little early
  // or late by its own number so the edge of it is ragged and never a circle.
  const layouts = new Map()
  const layoutOf = (e) => {
    const key = `${e.l}|${e.r}|${e.t}|${e.b}`
    if (layouts.has(key)) return layouts.get(key)
    const wide = e.r - e.l + 1
    const tall = e.b - e.t + 1
    const lines = credit ? [credit.a, credit.b] : []
    const most = Math.max(0, ...lines.map((l) => l.w))
    let k = 1
    for (const c of [3, 2]) if (most * c <= 0.8 * wide && 30 * c <= 0.5 * tall) { k = c; break }
    const cells = []
    lines.forEach((l, n) => {
      const base = n === 0 ? 30 - 5 * k : 30 + 12 * k
      let lit = l.cells
      let w = l.w
      let dots = false
      if (w * k > 0.8 * wide && l.ends.length) {
        let c = l.ends.length
        while (c > 1 && l.ends[c - 1] + 7 > 0.8 * wide) c--
        w = l.ends[c - 1]
        lit = l.cells.filter(([x]) => x < w)
        dots = true
      }
      const span = dots ? w + 6 : w
      const x0 = mid - Math.floor((span * k) / 2)
      cells.push(...scaled(lit.map(([x, y]) => [x, y, 1]), k, x0, base))
      if (dots) for (const d of [1, 3, 5]) cells.push([x0 + w + d, base - 1, 1, 0, 1])
    })
    // the blocks, and each one's place in the order
    const blocks = new Map()
    for (const c of cells) {
      const bx = Math.floor(c[0] / 2)
      const by = Math.floor(c[1] / 2)
      const bk = bx * 4096 + by
      if (!blocks.has(bk)) {
        const d = Math.hypot(2 * bx + 1 - mid, 2 * by + 1 - 30) + 4 * (hash(bx * 97 + by, 23) - 0.5)
        blocks.set(bk, { d, cells: [] })
      }
      blocks.get(bk).cells.push(c)
    }
    let lo = Infinity
    let hi = -Infinity
    for (const b of blocks.values()) { lo = Math.min(lo, b.d); hi = Math.max(hi, b.d) }
    for (const b of blocks.values()) b.d = (b.d - lo) / (hi - lo || 1)
    const out = { k, blocks: [...blocks.values()] }
    layouts.set(key, out)
    return out
  }
  const names = (t, e) => {
    if (!credit || t < F_OPEN || t >= F_OUT_AT + F_OUT_STEPS * F_STEP) return { cells: [], key: '' }
    const { blocks } = layoutOf(e)
    const cells = []
    const lay = (b, a) => { for (const c of b.cells) cells.push(a < 1 ? [c[0], c[1], 1, 0, 0.45] : c) }
    if (t < F_OUT_AT) {
      // on, from the middle out, a block lit dim on the step it comes on
      const n = Math.floor((t - F_OPEN) / F_STEP)
      for (const b of blocks) {
        if (n < F_IN_STEPS - 1 && b.d > (n + 1) / F_IN_STEPS) continue
        lay(b, n < F_IN_STEPS && b.d > n / F_IN_STEPS ? 0.45 : 1)
      }
      return { cells, key: `|c${Math.min(n, F_IN_STEPS)}` }
    }
    // and off, from the outside in, a block dim on the step before it goes
    const m = Math.floor((t - F_OUT_AT) / F_STEP)
    for (const b of blocks) {
      if (1 - b.d <= (m + 1) / F_OUT_STEPS) continue
      lay(b, 1 - b.d <= (m + 2) / F_OUT_STEPS ? 0.45 : 1)
    }
    return { cells, key: `|o${m}` }
  }

  // ── the sentence ──
  const sentence = (t) => {
    if (t < sayAt) return { cells: [], key: '' }
    const typed = Math.min(saying.n, Math.floor((t - sayAt) / F_TYPE_MS))
    // standing still while the characters come, and on the phone's beat
    // once they have stopped
    const lit = t < saidAt || Math.floor((t - liveAt) / BLINK) % 2 === 0
    return { cells: saying.at(typed, lit), key: `|t${typed}${lit ? 1 : 0}` }
  }

  const frame = (t, edge = null) => {
    if (t < T.enter) {
      const e = edgeOf(edge)
      const base = told.frame(t, edge)
      const n = notes(t, e)
      const c = names(t, e)
      return { key: `${base.key}${n.key}${c.key}`, cells: [...base.cells, ...n.cells, ...c.cells], ink: base.ink }
    }
    if (t < gatherAt) return told.frame(t, edge)
    const s = sentence(t)
    if (t < liveAt) {
      if (!gather) gather = life.gatherOf()
      const u = t - gatherAt
      return { key: `G${Math.round(u)}${s.key}`, cells: [...gather.map((b) => bitAt(b, u)), ...s.cells], wash: life.fadeAt(u), ink: inkEnd }
    }
    const i = Math.floor((t - liveAt) / LIVE_MS)
    const l = life.live(i, smooth01(Math.min(1, (t - liveAt) / R_LIVE_IN)))
    return { key: `L${i}${s.key}`, cells: [...l.cells, ...s.cells], ink: inkEnd, glow: l.glow }
  }

  return {
    cols: I_COLS, rows: I_ROWS, panel, fine: true, frame,
    // drawn at the display's rate until the mark is alive, and ten times a
    // second from then on, for as long as it is on the glass
    end: liveAt, live: [liveAt, Infinity], still: pullAt + 120,
    times: {
      wake: F_WAKE, one: F_WAKE + F_SLIDE, found: F_WAKE + F_SLIDE + F_RING, open: F_OPEN,
      credit: F_OPEN + F_IN_STEPS * F_STEP, creditOut: F_OUT_AT,
      enter: T.enter, catch: T.catch, glow: T.glow, hold: T.hold, top: T.top, morphs: T.morphs,
      bottom: T.bottom, done: T.done, covered: T.covered,
      gather: gatherAt, say: sayAt, live: liveAt, said: saidAt, pull: pullAt, land: pullAt + F_PULL_MS,
    },
    // the layers apart, for the frame checks (scripts/check-stories.mjs):
    // the intro's story, the notes, the names, the sentence, and which
    // tenth of a second of the mark's life a frame is and how alive
    layers: {
      base: (t, edge) => told.frame(t, edge),
      notes: (t, edge) => notes(t, edgeOf(edge)),
      names: (t, edge) => names(t, edgeOf(edge)),
      sentence,
      life: (t) => (t < liveAt ? null : { i: Math.floor((t - liveAt) / LIVE_MS), e: smooth01(Math.min(1, (t - liveAt) / R_LIVE_IN)) }),
    },
    // the heavy start, and `budget` ms more of it, before the clock starts;
    // answers whether all of it is done
    prime: (budget = 0) => { life.small(); return told.prime(budget) },
  }
}

// ── the keepsake's mark ─────────────────────────────────────────────────────
// The mark the film ends on, alive for as long as the keepsake is open
// (Keepsake.jsx): gathered at the top of the glass, `it's mutual.` under it
// whole, and the cursor after it on the phone's beat. Nought is the moment
// the film's mark came alive (its `times.live`), so a keepsake handed the
// film's clock that far on draws the frame the film would
// (scripts/check-stories.mjs);
// one opened with no film comes alive over its first 700ms, as the film's
// did. Never taken back and never told again: what stays is what was told.
export function keepStory({ ink = null, say = { cells: [], w: 0, ends: [] } } = {}) {
  const life = markLife({ ink })
  const saying = sayingOf(say)
  const lifeAt = (u) => ({ i: Math.floor(u / LIVE_MS), e: smooth01(Math.min(1, u / R_LIVE_IN)) })
  const sentence = (u) => {
    const lit = Math.floor(u / BLINK) % 2 === 0
    return { cells: saying.at(saying.n, lit), key: `|${lit ? 1 : 0}` }
  }
  const frame = (t) => {
    const u = Math.max(0, t)
    const { i, e } = lifeAt(u)
    const s = sentence(u)
    const l = life.live(i, e)
    return { key: `K${i}${s.key}`, cells: [...l.cells, ...s.cells], ink: life.ink, glow: l.glow }
  }
  return {
    cols: I_COLS, rows: I_ROWS, fine: true, frame,
    end: 0, live: [0, Infinity],
    // (the frame checks, as the film's)
    layers: { sentence: (t) => sentence(Math.max(0, t)), life: (t) => lifeAt(Math.max(0, t)) },
    // a frame of it alive, the cursor lit, for reduced motion and the picture
    still: 11 * LIVE_MS,
    prime: () => { life.small() },
  }
}

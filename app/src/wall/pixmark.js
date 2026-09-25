// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MARK IN PIXELS, AND THE TWO WHO RUN INTO IT                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three screens in the product tell the same small story on a phone: the
// intro, the door to the core service (screens/Join.jsx) and the mutual
// (screens/Reveal.jsx). Two shadows run in from either side of a lit panel,
// catch each other, hold on, and what they were holding on to becomes the
// mark. This file is everything that story is made of, and none of it is a
// picture: the mark is rasterised from mark.js, and the two people are rows
// of pixels drawn by hand, the way looks.js draws the aerial and the pen.
// PixelStory.jsx puts it on the glass.
//
// Nothing here touches the page. A story is a function of the clock that
// answers with a list of lit cells, so it can be held on any frame, drawn
// last frame first under reduced motion, and read in node.

import { ECL, NEAR, CHALK, ringPath, starPath, rad } from './mark.js'

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

// ── the two of them ─────────────────────────────────────────────────────────
// Drawn by hand, a pixel at a time, facing right; the one who comes in from
// the right is the same drawing turned round. Each is 16 by 22, the ground
// under the last row, and a running body leaning into it.
//
// A silhouette of a runner is the same shape on either foot, so a run drawn
// in one ink is three frames that repeat, and it reads as a shuffle. So the
// limbs on the far side are a second, paler ink, and one drawing gives both
// steps: `a` is one arm and leg and `b` the other, and the stride that
// carries the `a` leg in front draws `a` near and `b` far, and the next
// trades them. Three drawings, six frames, and the legs are never mistaken
// for each other. `X` is the body, which is always near.
const RUN = [
  // the stride: the front leg reaching for the ground, the back one leaving it
  [
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX...bb.',
    '.....XXXXX..bb..',
    '....aXXXXXbbb...',
    '...aa.XXXX......',
    '...a..XXX.......',
    '..aa..XXX.......',
    '.....XXXX.......',
    '.....bXXXX......',
    '....bb..aa......',
    '....bb...aa.....',
    '...bb.....aa....',
    '..bb......aa....',
    '.bb........aa...',
    'bb.........aa...',
    'b..........aa...',
    '...........aa...',
    '...........aaa..',
  ],
  // down: the weight on the front leg, the other heel kicked up behind
  [
    '................',
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX......',
    '.....bXXXX......',
    '....bbXXXXa.....',
    '....b.XXX.aa....',
    '......XXX..aa...',
    '......XXX.......',
    '.....XXXX.......',
    '.....bbXaa......',
    '.....bb..aa.....',
    '....bbb..aa.....',
    '.bbbbb...aa.....',
    '.b.......aa.....',
    '.........aa.....',
    '........aa......',
    '........aa......',
    '........aaaa....',
  ],
  // the push: the leg that carried it driving back, the other knee up
  [
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX..aa..',
    '.....bXXXX.aa...',
    '....bbXXXXaa....',
    '...bb.XXXX......',
    '...b..XXX.......',
    '..bb..XXX.......',
    '......XXXbbb....',
    '......XXXbbbbb..',
    '.....aa.....bb..',
    '.....aa.....bb..',
    '....aa.....bb...',
    '....aa.....bb...',
    '...aa......bbb..',
    '..aa............',
    '.aa.............',
    'aa..............',
    'a...............',
  ],
]

// the last stride, both arms out
const REACH = [
  '........XX......',
  '.......XXXX.....',
  '.......XXXX.....',
  '........XX......',
  '.......XX...bbb.',
  '......XXXXbbb...',
  '.....XXXXXaaaaa.',
  '.....XXXXX......',
  '......XXXX......',
  '......XXX.......',
  '......XXX.......',
  '.....XXXX.......',
  '.....bXXXX......',
  '....bb..aa......',
  '....bb...aa.....',
  '...bb.....aa....',
  '..bb......aa....',
  '.bb........aa...',
  'bb.........aa...',
  'b..........aa...',
  '...........aa...',
  '...........aaa..',
]

// and standing, waiting, the near arm down the body and the hand at the hip
const STAND = [
  '................',
  '........XX......',
  '.......XXXX.....',
  '.......XXXX.....',
  '........XX......',
  '........X.......',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXaX.....',
  '.......XXaX.....',
  '.......XXaX.....',
  '.......XXXa.....',
  '.......XXX......',
  '.......bXaa.....',
  '.......bXaa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '......bb.aaa....',
]

// ── the hug ──
// 26 by 22, the one from the left on the left. They lean into each other
// from the feet up, so the two of them make one arch with the heads
// together at the top of it, and the hands show on each other's backs. It
// was two bodies standing straight side by side with their arms across,
// which read as two people facing the camera. The first frame is the catch,
// and in the second one foot has come off the ground, which is the whole of
// what happened in one pixel.
const HUG = [
  [
    '...............XX.........',
    '...........XX.XXXX........',
    '..........XXXXXXXX........',
    '..........XXXX.XX.........',
    '...........XX.XXX.........',
    '..........XXXXXXX.........',
    '.........XXXXXXXXXX.......',
    '........XXXXXXXXXXXX......',
    '.......XX.XXXXXXXX.XX.....',
    '..........XXXXXXX.........',
    '.........XXXX.XXXX........',
    '........XXXX...XXXX.......',
    '........XXX.....XXXX......',
    '.......XXX.......XXXx.....',
    '......xXX.........XXx.....',
    '.....xxXX.........XX.x....',
    '....xx..XX.........XXx....',
    '...xx...XX.........XX.x...',
    '..xx.....XX.........XXx...',
    '.xx......XX.........XX.x..',
    'xx........XX.........XXx..',
    'xxx.......XXX........XXXx.',
  ],
  [
    '...............XX.........',
    '...........XX.XXXX........',
    '..........XXXXXXXX........',
    '..........XXXX.XX.........',
    '...........XX.XXX.........',
    '..........XXXXXXX.........',
    '.........XXXXXXXXXX.......',
    '........XXXXXXXXXXXX......',
    '.......XX.XXXXXXXX.XX.....',
    '..........XXXXXXX.........',
    '.........XXXX.XXXX........',
    '........XXXX...XXXX.......',
    '........XXX.....XXXX...xx.',
    '.......XXX.......XXX.xx...',
    '......xXX.........XXxx....',
    '.....xxXX.........XX......',
    '....xx..XX.........XX.....',
    '...xx...XX.........XX.....',
    '..xx.....XX.........XX....',
    '.xx......XX.........XX....',
    'xx........XX.........XX...',
    'xxx.......XXX........XXX..',
  ],
]

// A drawing as cells: [x, y, ink], ink 1 near and 2 far. `near` says which
// limb pair is in front; `flip` turns the drawing round for the one coming
// from the right, which keeps its near side near.
function cellsOf(rows, { near = 'a', flip = false, x = 0, y = 0 } = {}) {
  const out = []
  const w = rows[0].length
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i]
      if (ch === '.') continue
      const ink = ch === 'X' || ch === near ? 1 : 2
      out.push([x + (flip ? w - 1 - i : i), y + j, ink])
    }
  })
  return out
}

// The six frames of the run, in order: the stride, down and push on one foot,
// then the same three on the other.
function runFrame(k, o) {
  const f = ((k % 6) + 6) % 6
  return cellsOf(RUN[f % 3], { ...o, near: f < 3 ? 'a' : 'b' })
}

// ── the story ───────────────────────────────────────────────────────────────
// Every story is drawn on the same grid, 57 by 45: odd both ways, so the mark
// has a middle column and a middle row, and in the proportion of the body of
// a letter's screen. The feet are on row 34, with the ground under them, and
// the mark stands in the middle. It is 47 cells square, and the tips of the
// star's long arms fall a cell inside that square at either end, so what is
// lit of it is the grid's own 45 rows.
export const COLS = 57
export const ROWS = 45
const GROUND = 34
const FIG_Y = GROUND - 22
const MARK_N = 47
// where each runner's drawing stands for the two of them to meet in the hug,
// and the mirror of any position on the left
const MEET = 15
const mirror = (x) => COLS - 16 - x
const HUG_X = (COLS - 26) / 2 | 0

// the run is stepped: a frame of the cycle every 80ms, three cells a frame,
// which is the stride the drawings take, so no foot slides
export const STEP = 80
const PACE = 3

// the ground, dashed, in the far ink
function ground() {
  const out = []
  for (let x = 0; x < COLS; x++) if (x % 3 !== 2) out.push([x, GROUND, 2])
  return out
}

// ── the morph ──
// What they stood on becomes the orbit, and the two of them become the star.
// The dashed ground lifts off its row and bends into the ring: every dash is
// laid out along the ring's near half and again along its far half, left to
// right, so the line opens into the ellipse rather than scattering into it.
// Then the hug gathers into the star, each pixel paired with the part of the
// star on its own side of the pair (both laid round their own centres by
// angle), so the heads go up the long arm and the feet down the other. There
// are more pixels in the ring than dashes in the ground, and fewer in the
// star than in the hug, so some split on the way and some meet.
//
// The ring closes first, the order the mark has always assembled in, and the
// star opens from its middle out. Each pixel travels on a hard start and a
// long settle, and is rounded to a whole cell on every frame, so the pixels
// hop across the glass rather than glide.
const ease = (t) => 1 - (1 - t) ** 4
const RING_FLIGHT = 380
const STAR_AT = 220
const STAR_SPREAD = 140
const STAR_FLIGHT = 300
export const MORPH_MS = STAR_AT + STAR_SPREAD + STAR_FLIGHT

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

function morphOf(hug, dashes) {
  const m = markCells(MARK_N, MARK_CUT)
  const ox = (COLS - MARK_N) >> 1
  const oy = (ROWS - MARK_N) >> 1
  const t = rad(ECL.tilt)
  const c = (MARK_N - 1) / 2
  // each ring cell's place along the ring's own long axis, and which half
  const ring = m.list.filter((p) => p.ring).map((p) => {
    const dx = p.x - c
    const dy = p.y - c
    return { x: p.x + ox, y: p.y + oy, u: dx * Math.cos(t) + dy * Math.sin(t), near: -dx * Math.sin(t) + dy * Math.cos(t) > 0 }
  })
  const star = m.list.filter((p) => !p.ring).map((p) => ({ x: p.x + ox, y: p.y + oy, r: Math.hypot(p.x - c, p.y - c) }))
  const maxR = Math.max(...star.map((p) => p.r))
  const bits = []
  const line = [...dashes].sort((p, q) => p[0] - q[0])
  for (const near of [true, false]) {
    const arc = ring.filter((p) => p.near === near).sort((p, q) => p.u - q.u)
    for (const [s, d] of pairs(line, arc)) {
      bits.push({ sx: s[0], sy: s[1], ink: s[2], dx: d.x, dy: d.y, delay: near ? 0 : 40, flight: RING_FLIGHT })
    }
  }
  const src = byAngle(hug, (p) => [p[0], p[1]])
  const dst = byAngle(star, (p) => [p.x, p.y])
  for (const [s, d] of pairs(src, dst)) {
    bits.push({ sx: s[0], sy: s[1], ink: s[2], dx: d.x, dy: d.y, delay: STAR_AT + (d.r / maxR) * STAR_SPREAD, flight: STAR_FLIGHT })
  }
  const done = m.list.map((p) => [p.x + ox, p.y + oy, 1])
  return { bits, done }
}

function morphAt(m, t) {
  if (t >= MORPH_MS) return m.done
  return m.bits.map((b) => {
    const k = Math.max(0, Math.min(1, (t - b.delay) / b.flight))
    const e = ease(k)
    return [Math.round(b.sx + (b.dx - b.sx) * e), Math.round(b.sy + (b.dy - b.sy) * e), k >= 1 ? 1 : b.ink]
  })
}

// ── one story, from a timeline ──────────────────────────────────────────────
// `a` and `b` place the two of them: when each starts to run and from where,
// where each stops to wait if they wait, and when they set off again. What
// follows the meeting is the same in every story: the reach, the moment they
// touch (one frame of the whole panel inverted, the way a phone's screen
// flashed when something came in), the catch, the hold, and the mark.
//
// `frame(t)` answers { key, cells, invert }. The key changes only when the
// drawing does, so the canvas is drawn a dozen times a second while the two
// run, thirty while the mark forms, and not at all while nothing moves.
// `times` are the story's own beats, for whoever holds the screen round it.
const TOUCH_MS = 70
const CATCH_MS = 200
const HOLD_MS = 280
function makeStory({ a, b, meet }) {
  const touch = meet + STEP
  const caught = touch + TOUCH_MS
  const held = caught + CATCH_MS
  const morphs = held + HOLD_MS
  let morph = null
  const two = (i) => cellsOf(HUG[i], { x: HUG_X, y: FIG_Y })
  const hug = (i) => [...two(i), ...ground()]
  // One runner at time t: running in from `from` at `start`, standing at
  // `stop` while it waits, and running again at `again` to the meeting.
  // The one from the right is the same runner, turned round.
  const who = (r, t, flip) => {
    const at = (x) => (flip ? mirror(x) : x)
    const o = { flip, y: FIG_Y }
    if (t < r.start) return { cells: [], key: '-' }
    const running = (k, x) => ({ cells: runFrame(k + r.phase, { ...o, x: at(x) }), key: `r${x}.${(k + r.phase) % 6}` })
    if (r.again != null && t >= r.again) {
      const k = Math.floor((t - r.again) / STEP)
      return running(k, Math.min(MEET, r.stop + k * PACE))
    }
    const k = Math.floor((t - r.start) / STEP)
    const x = r.from + k * PACE
    if (r.stop != null && x >= r.stop) {
      return { cells: cellsOf(STAND, { ...o, x: at(r.stop) }), key: `s${r.stop}` }
    }
    return running(k, Math.min(MEET, x))
  }
  const frame = (t) => {
    if (t >= morphs) {
      if (!morph) morph = morphOf(two(1), ground())
      const mt = t - morphs
      return { key: `m${mt >= MORPH_MS ? 'done' : Math.floor(mt / 33)}`, cells: morphAt(morph, mt) }
    }
    if (t >= held) return { key: 'held', cells: hug(1) }
    if (t >= caught) return { key: 'caught', cells: hug(0) }
    if (t >= touch) return { key: 'touch', cells: hug(0), invert: true }
    if (t >= meet) {
      return {
        key: 'reach',
        cells: [
          ...cellsOf(REACH, { x: MEET, y: FIG_Y, near: a.reach }),
          ...cellsOf(REACH, { x: mirror(MEET), y: FIG_Y, flip: true, near: b.reach }),
          ...ground(),
        ],
      }
    }
    const l = who(a, t, false)
    const r = who(b, t, true)
    return { key: `${l.key}|${r.key}`, cells: [...l.cells, ...r.cells, ...ground()] }
  }
  const done = morphs + MORPH_MS
  return { cols: COLS, rows: ROWS, end: done, times: { meet, touch, morphs, done }, frame }
}

// Each runner's last frame before the reach is a push, a knee coming
// through, and that knee's leg is the one the reach lands on: `phase` is the
// frame of the cycle the run starts on, so the last one is a push, and
// `reach` which pair of limbs is near when it lands.
const RUN_FRAMES = 11
const RUN_FROM = MEET - RUN_FRAMES * PACE

// The intro: both at once, from off either edge, and the mark.
export function introStory(start = 300) {
  const meet = start + RUN_FRAMES * STEP
  return makeStory({
    a: { start, from: RUN_FROM, phase: 1, reach: 'a' },
    b: { start, from: RUN_FROM, phase: 4, reach: 'b' },
    meet,
  })
}

// The door (screens/Join.jsx): the mechanic, told in the order it happens.
// You come in and stand there, which is a name put up; they come in from the
// other side and stand there too; and only then do both set off at once,
// because neither of them knows until both have. They wait a screen apart,
// and the last four frames of the run close it.
const WAIT_AT = 3
export function joinStory({ you = 500, them = 1400, both = 2300 } = {}) {
  const meet = both + Math.ceil((MEET - WAIT_AT) / PACE) * STEP
  return makeStory({
    a: { start: you, from: RUN_FROM, stop: WAIT_AT, again: both, phase: 2, reach: 'a' },
    b: { start: them, from: RUN_FROM, stop: WAIT_AT, again: both, phase: 5, reach: 'b' },
    meet,
  })
}

// The mutual (screens/Reveal.jsx): both at once again, a little nearer, so
// the screen comes to its point sooner than the intro does.
export function revealStory(start = 250) {
  const frames = 9
  const meet = start + frames * STEP
  return makeStory({
    a: { start, from: MEET - frames * PACE, phase: 3, reach: 'a' },
    b: { start, from: MEET - frames * PACE, phase: 0, reach: 'b' },
    meet,
  })
}

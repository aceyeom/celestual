// ── round, as posters ──────────────────────────────────────────────────────
// Three posters for Instagram, 1080 by 1350 (4:5). Each is one thing from
// the film's night filling the frame, in the night's greys, with one small
// accent in yuna's rose for the letter that closes the round. No headline is
// laid over a picture: words are only where the film would put them, on lit
// or mechanical things.
//
//   board   the night as a station board, every character on its own split
//           flap module: the line, and under it the four departures, the
//           last one's lamp lit
//   bus     the 51B at 5:14 pm, sol at the pole and the woman asleep in the
//           seat he gave her; the line on the bus's sign, one window across
//           the street lit
//   hinge   the film's seam at 7:14 am: yuna, her letter up on the retro grey
//           screen, looks up at the bus hanging above her, where she stood
//           the night before
//
// The board's edges and the face's pixels sit on a grid of 3 px, and the
// worlds are in the film's 6 px cells, so both stay whole at 1080, 1440 and
// 2160 wide. Each poster is a function that fills a 1080 by 1350 element at
// the device's pixel ratio.

import * as T from './round-time.js'
import { createRenderer } from './round-gl.js'
import { PALETTES } from './round-product.js'
import { blueBytes } from './round-blue.js'
import { drawCast, MASK_W, MASK_H, PHONE } from './round-cast.js'
import { drawPhone, drawLockup, LOCKUP_SIZE } from './round-screen.js'

const PW = 1080
const PH = 1350
const NIGHT = PALETTES.night // ink, low, mid, lit
const ROOM = '#0A0A0A'
const CHALK = '#F4F1EA'
const ROSE = '#DF93AF'
const PLATE_TOP = '#1E1D22'
const PLATE_BOT = '#151418'
const SPLIT = '#08070B'
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

// ── the pieces ──
function el(parent, tag, cls, css) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (css) e.style.cssText = css
  parent.appendChild(e)
  return e
}
// a canvas of w by h at (x, y), its pixels the device's
function pane(parent, x, y, w, h, k) {
  const cv = el(parent, 'canvas', 'px', `left:${x}px;top:${y}px;width:${w}px;height:${h}px`)
  cv.width = Math.round(w * k)
  cv.height = Math.round(h * k)
  const g = cv.getContext('2d')
  g.imageSmoothingEnabled = false
  return { cv, g }
}
// the lockup in chalk at whole pixels a cell, its box's top left at (x, y)
const [LKW, LKH] = LOCKUP_SIZE
function lockup(g, k, x, y, cell = 2) {
  drawLockup(g, x * k, y * k, cell * k, CHALK)
}

// ── the face's own pixels ──
// Jersey 10 draws on a grid of its own pixels, 3 px each at 56 px (measured:
// every edge of every glyph falls on it, the ink starting at the origin and
// every advance whole). Each glyph is drawn there once and read back a pixel
// at a time: twelve rows, from its ascender (ten above the baseline) to its
// descender (two below).
const FP = 3
const ASC = 10
const ROWS = 12
const glyphs = new Map()
function glyph(ch) {
  if (glyphs.has(ch)) return glyphs.get(ch)
  const span = 16
  const c = document.createElement('canvas')
  c.width = span * FP
  c.height = (ROWS + 2) * FP
  const g = c.getContext('2d', { willReadFrequently: true })
  g.font = '56px "Jersey 10"'
  g.fillStyle = '#fff'
  g.textBaseline = 'alphabetic'
  g.fillText(ch, FP, (ASC + 1) * FP)
  const d = g.getImageData(0, 0, c.width, c.height).data
  const rows = []
  for (let j = 0; j < ROWS; j++) {
    const r = []
    for (let i = 0; i < span - 1; i++) r.push(d[(((j + 1) * FP + 1) * c.width + (i + 1) * FP + 1) * 4 + 3] > 127 ? 1 : 0)
    rows.push(r)
  }
  let w = 0
  rows.forEach((r) => r.forEach((v, i) => { if (v) w = Math.max(w, i + 1) }))
  const out = { rows: rows.map((r) => r.slice(0, w)), w, adv: Math.round(g.measureText(ch).width / FP) }
  glyphs.set(ch, out)
  return out
}
// a run of text in those pixels, each glyph at its own advance
function pixels(text) {
  const gs = [...text].map(glyph)
  const w = gs.reduce((s, q) => s + q.adv, 0) - 1
  const rows = Array.from({ length: ROWS }, () => new Array(Math.max(0, w)).fill(0))
  let x = 0
  for (const q of gs) {
    q.rows.forEach((r, j) => r.forEach((v, i) => { if (v) rows[j][x + i] = 1 }))
    x += q.adv
  }
  return { rows, w }
}
// pixels drawn as blocks of `s` px from (x, y), a row's runs one rect each
function blocks(g, k, x, y, px, s, colour) {
  g.fillStyle = colour
  px.rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      if (!r[i]) continue
      let e = i
      while (e + 1 < r.length && r[e + 1]) e++
      g.fillRect((x + i * s) * k, (y + j * s) * k, (e - i + 1) * s * k, s * k)
      i = e
    }
  })
}

// ── split flap modules ──
// One character on its module: the upper flap over the lower and a split
// between them, the character's x height centred on the split, drawn in the
// face's pixels at `s` px each. Mid turn (`fold` 0 to 1, from `prev` to
// `ch`) the old upper flap falls toward the split, then the new lower one
// opens from it, as the film's clock does.
function flap(g, k, x, y, w, h, ch, s, { prev = null, fold = 0, mid = 6, pins = true } = {}) {
  const sy = y + h / 2
  const r = Math.round(0.1 * w)
  const face = (c, top) => {
    if (!c || c === ' ') return
    const q = pixels(c)
    const gx = x + FP * Math.floor((w - q.w * s) / 2 / FP)
    g.save()
    g.beginPath()
    g.rect(x * k, (top ? y : sy) * k, w * k, (h / 2) * k)
    g.clip()
    blocks(g, k, gx, sy - mid * s, q, s, CHALK)
    g.restore()
  }
  // a half folded toward the split by `f` (1 flat, 0 edge on), and shaded
  const half = (top, c, f = 1, dark = 0) => {
    g.save()
    g.translate(0, sy * k)
    g.scale(1, Math.max(0.001, f))
    g.translate(0, -sy * k)
    g.fillStyle = top ? PLATE_TOP : PLATE_BOT
    g.beginPath()
    if (top) g.roundRect(x * k, y * k, w * k, (h / 2) * k, [r * k, r * k, 0, 0])
    else g.roundRect(x * k, sy * k, w * k, (h / 2) * k, [0, 0, r * k, r * k])
    g.fill()
    face(c, top)
    if (dark > 0) {
      g.fillStyle = `rgba(0, 0, 0, ${dark})`
      g.fillRect(x * k, (top ? y : sy) * k, w * k, (h / 2) * k)
    }
    g.restore()
  }
  const turning = prev != null && fold > 0 && fold < 1
  half(true, ch)
  half(false, turning ? prev : ch)
  if (turning) {
    const a = fold * 2
    if (a < 1) half(true, prev, Math.cos((a * Math.PI) / 2), 0.45 * a)
    else half(false, ch, Math.sin(((a - 1) * Math.PI) / 2), 0.35 * (2 - a))
  }
  // the split, and the pins it turns on
  g.fillStyle = SPLIT
  g.fillRect(x * k, (sy - 1) * k, w * k, 2 * k)
  if (!pins) return
  g.fillRect((x - 2) * k, (sy - 3) * k, 3 * k, 6 * k)
  g.fillRect((x + w - 1) * k, (sy - 3) * k, 3 * k, 6 * k)
}
// a lamp `n` steps of 3 px wide, its corners cut, as a pixel lamp is round
function lamp(g, k, x, y, n, colour) {
  g.fillStyle = colour
  g.fillRect((x + FP) * k, y * k, (n - 2) * FP * k, n * FP * k)
  g.fillRect(x * k, (y + FP) * k, n * FP * k, (n - 2) * FP * k)
}

// ── a sign of lamps ──
// The face's pixels as lamps `dot` px apart, one lamp a pixel, the unlit
// ones showing as a real sign's do; lines centred, in a housing with a rim.
function sign(g, k, x, y, lines, { dot = 6, pad = 3, lead = 2, rim = 1, lit = NIGHT[3], off = '#1D1D1D', face = ROOM, edge = NIGHT[1] } = {}) {
  const runs = lines.map(pixels)
  const cols = Math.max(...runs.map((r) => r.w)) + 2 * pad
  const rows = runs.length * ROWS + (runs.length - 1) * lead + 2 * pad
  g.fillStyle = edge
  g.fillRect((x - rim * dot) * k, (y - rim * dot) * k, (cols + 2 * rim) * dot * k, (rows + 2 * rim) * dot * k)
  g.fillStyle = face
  g.fillRect(x * k, y * k, cols * dot * k, rows * dot * k)
  const on = new Set()
  runs.forEach((r, li) => {
    const x0 = pad + Math.floor((cols - 2 * pad - r.w) / 2)
    const y0 = pad + li * (ROWS + lead)
    r.rows.forEach((row, j) => row.forEach((v, i) => { if (v) on.add((y0 + j) * cols + x0 + i) }))
  })
  const ins = Math.max(1, Math.round(k * dot / 6))
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      g.fillStyle = on.has(j * cols + i) ? lit : off
      g.fillRect(Math.round((x + i * dot) * k) + ins, Math.round((y + j * dot) * k) + ins, dot * k - 2 * ins, dot * k - 2 * ins)
    }
  }
  return { cols, rows, w: cols * dot, h: rows * dot }
}

// ── worlds, at any framing ──
// A world lit and dithered by its own program into a panel of cells over any
// window of its half (above the seam too), its tones laid in the night's
// greys: one canvas pixel a cell.
let shop = null
function renderer() {
  if (shop) return shop
  const cv = document.createElement('canvas')
  cv.width = T.W
  cv.height = T.H
  shop = createRenderer(cv, { blue: blueBytes(), palettes: PALETTES })
  return shop
}
function maskFor(R, slot, world, clock, look) {
  const mask = document.createElement('canvas')
  mask.width = MASK_W
  mask.height = MASK_H
  drawCast(mask.getContext('2d'), world, clock, look)
  R.setMask(slot, mask)
}
function worldCells(world, clock, { cols, rows, crop, look = 0, phone = null, lit = 0, sun = 0 }) {
  const R = renderer()
  const target = R.panel(cols, rows)
  target.crop = crop
  maskFor(R, 0, world, clock, look)
  R.drawWorld(target, 0, { world, clock, flood: 0, palette: 'night', look, phoneRect: phone, phoneLit: lit, sent: -1, sun, lampsOff: T.LAMPS_OFF })
  const px = R.readPanel(target)
  const out = document.createElement('canvas')
  out.width = cols
  out.height = rows
  const g = out.getContext('2d')
  const img = g.createImageData(cols, rows)
  const tones = NIGHT.map(rgb)
  for (let i = 0; i < cols * rows; i++) img.data.set([...tones[Math.min(3, Math.round(px[i * 4] / 85))], 255], i * 4)
  g.putImageData(img, 0, 0)
  return out
}

// ── the posters ──
export const POSTERS = {
  // the board: the line on modules twice the size, and under it the night's
  // departures, each letter to the next writer, the last to the first. The
  // last one's lamp is lit, and in the empty row under it the next 5:14 pm
  // is turning in: the round begins again
  async board(p, { dpr: k }) {
    const { g } = pane(p, 0, 0, PW, PH, k)
    g.fillStyle = ROOM
    g.fillRect(0, 0, PW * k, PH * k)
    // 24 columns of small modules 39 apart and rows 60 apart, from (72, 102);
    // a large module is two columns by two rows
    const X = 72
    const Y = 102
    const PITCH = 39
    const ROW = 60
    const MW = 36
    const MH = 54
    const small = (c, r, ch = '', o) => flap(g, k, X + c * PITCH, Y + r * ROW, MW, MH, ch, 3, o)
    const big = (c, r, ch = '') => flap(g, k, X + c * PITCH, Y + r * ROW, MW + PITCH, MH + ROW, ch, 6)
    ;['every letter', 'on the wall', 'is to', 'somebody.'].forEach((t, i) => {
      for (let c = 0; c < 12; c++) big(2 * c, 2 * i, t[c] || '')
    })
    // the departures, an empty row before each: the time, whom the letter
    // was to, and in the last column a lamp
    const row = (r, text, n, from) => { for (let c = 0; c < n; c++) small(from + c, r, text[c] || '') }
    const empty = (r) => row(r, '', 23, 0)
    const deps = [['5:14 pm', 'dear wren'], ['9:14 pm', 'dear pia'], ['1:14 am', 'dear yuna'], ['7:14 am', 'to the one who', 'always stands']]
    let r = 8
    deps.forEach(([time, to, more], i) => {
      empty(r++)
      for (const [t, d] of [[time, to], ['', more]]) {
        if (d == null) continue
        row(r, t, 8, 0)
        row(r, d, 15, 8)
        if (t) lamp(g, k, X + 23 * PITCH + 6, Y + r * ROW + 15, 8, i === deps.length - 1 ? ROSE : '#26252B')
        r++
      }
    })
    // the next, turning in
    small(0, r, '5', { prev: '', fold: 0.8 })
    row(r, '', 22, 1)
    lockup(g, k, X, PH - 72 - 2 * LKH)
  },

  // the bus: the 51B at 5:14 pm, from behind sol at the pole, the woman asleep
  // against the glass in the seat he gave her; the line on the sign hung
  // from the ceiling. One window across the street, above her, is lit rose
  async bus(p, { dpr: k }) {
    // the half from x 240 and 189 px above the seam, 768 px wide: cells of
    // 4.27 px of it, 6 px of the poster
    const crop = [240, -189, 768, 960]
    const W = worldCells(0, 340, { cols: 180, rows: 225, crop })
    // the window: the lit cells joined to one of its cells, within a few
    const wg = W.getContext('2d')
    const img = wg.getImageData(0, 0, W.width, W.height)
    const ink = rgb(NIGHT[0])
    const lit = (x, y) => { const i = (y * W.width + x) * 4; return img.data[i] !== ink[0] || img.data[i + 1] !== ink[1] || img.data[i + 2] !== ink[2] }
    const seed = [151, 115]
    const seen = new Set()
    const todo = [seed]
    while (todo.length) {
      const [x, y] = todo.pop()
      const key = y * W.width + x
      if (seen.has(key) || Math.abs(x - seed[0]) > 8 || Math.abs(y - seed[1]) > 8 || !lit(x, y)) continue
      seen.add(key)
      img.data.set(rgb(ROSE), key * 4)
      todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    wg.putImageData(img, 0, 0)
    const { g } = pane(p, 0, 0, PW, PH, k)
    g.drawImage(W, 0, 0, PW * k, PH * k)
    // the sign, and its hangers up into the dark: one of them on the pole's
    // own line (x 740 of the half), the other as far the other side
    const sy = 60
    const s = sign(g, k, 60, sy, ['every letter on the wall', 'is to somebody.'])
    const pole = Math.round(((740 - crop[0]) / crop[2]) * PW / 6) * 6
    g.fillStyle = NIGHT[1]
    for (const hx of [2 * (60 + s.w / 2) - pole - 6, pole]) g.fillRect(hx * k, 0, 6 * k, (sy - 6) * k)
    lockup(g, k, 72, PH - 72 - 2 * LKH)
  },

  // the hinge: the film at 7:14 am with the colour held back. yuna's letter
  // is up on her phone, in the retro grey, its heart in rose, and she looks
  // up from it at the bus hanging above her in the seconds before it all
  // begins, where she stood the night before. The seam on the golden section
  async hinge(p, { dpr: k }) {
    const f = 640
    const fr = T.frameAt(f)
    const cv = document.createElement('canvas')
    cv.width = T.W * k
    cv.height = T.H * k
    const R = createRenderer(cv, { blue: blueBytes(), palettes: PALETTES })
    const i = fr.link - 1
    const P = T.PLAN[i]
    const x = f - T.LINKS[i].start
    // the sun, as the film brings it with the colour
    const sun = Math.min(1, Math.max(0, (x - P.flood + 4) / 48))
    const r = PHONE[fr.bottom.world]
    maskFor(R, 0, fr.bottom.world, fr.bottom.clock, fr.bottom.look)
    R.drawWorld(R.halves[0], 0, { world: fr.bottom.world, clock: fr.bottom.clock, flood: 0, palette: 'night', look: fr.bottom.look, phoneRect: r, phoneLit: fr.phone.lit, sent: x >= P.send ? x - P.send : -1, sun })
    maskFor(R, 1, fr.top.world, fr.top.clock, fr.top.look)
    R.drawWorld(R.halves[1], 1, { world: fr.top.world, clock: fr.top.clock, flood: 0, palette: 'night', look: fr.top.look, sent: -1 })
    const pcv = document.createElement('canvas')
    pcv.width = (r[2] - r[0]) * 2
    pcv.height = (r[3] - r[1]) * 2
    drawPhone(pcv.getContext('2d'), pcv.width, pcv.height, { ...fr.phone, colour: 'night', heart: ROSE }, f)
    R.setPhone(pcv)
    R.composite({ f, top: 1, bot: 0, pane: false, phone: [r[0], 960 + r[1], r[2], 960 + r[3]] })
    R.gl.finish()
    // the frame from 420 px down: the seam 540 px from the top, 0.4 of it
    const top = 420
    const { g } = pane(p, 0, 0, PW, PH, k)
    g.drawImage(cv, 0, top * k, PW * k, PH * k, 0, 0, PW * k, PH * k)
    // the clock on the seam, as the film has it: the hour, its colon, 1, 4,
    // and the meridiem, each plate split on the seam
    const c = T.clockAt(f)
    const sy = 960 - top
    const plate = (px, w, ch) => flap(g, k, px, sy - 42, w, 84, ch, 3, { mid: 5, pins: false })
    plate(72, 84, String(c.hour))
    g.fillStyle = CHALK
    g.fillRect(165 * k, (sy - 15) * k, 9 * k, 9 * k)
    g.fillRect(165 * k, (sy + 6) * k, 9 * k, 9 * k)
    plate(180, 57, '1')
    plate(243, 57, '4')
    plate(312, 84, c.merid)
    // the lockup on the phone, under the letter
    lockup(g, k, Math.round((r[0] + r[2]) / 2 - LKW), PH - 72 - 2 * LKH)
  },
}

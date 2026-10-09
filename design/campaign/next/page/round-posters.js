// ── round, as posters ──────────────────────────────────────────────────────
// Three posters for Instagram, 1080 by 1350 (4:5), drawn the way the films
// draw a world: lit, then brought down to four tones of one palette by blue
// noise. They run warm to cool:
//
//   bus      the 51B at 5:14 pm in the film's ambers, sol at the pole and the
//            woman asleep in the seat he gave her; the line on the bus's
//            sign, and one window across the street lit in ice
//   pacific  the minute before nine: Seoul on Sunday afternoon in amber,
//            turned over above Berkeley on Saturday night in ice, as the
//            PACIFIC treatment drew them; on the seam, when every mutual is
//            revealed
//   sea      two people on a sea wall at dusk, from a photograph, in ice; its
//            horizon is the seam: nothing happens unless it's mutual
//   seapair  the sea with the second photograph above the seam, one who
//            passed by as a blur beside one who stood still: the alternate
//
// The bus is in round's 6 px cells, the two cities and the sea in pacific's
// 3 px ones, so every cell stays whole at 1080, 1440 and 2160 wide. Each
// poster is a function that fills a 1080 by 1350 element at the device's
// pixel ratio.

import * as T from './round-time.js'
import { createRenderer } from './round-gl.js'
import { PALETTES } from './round-product.js'
import { blueBytes } from './round-blue.js'
import { drawCast, MASK_W, MASK_H } from './round-cast.js'
import { drawLockup, LOCKUP_SIZE } from './round-screen.js'
import { citiesCells, blueNoise } from './pacific.js'

const PW = 1080
const PH = 1350
const CHALK = '#F4F1EA'
const INK = '#0A0A0C'
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src })
const here = (file) => new URL(file, import.meta.url).href

// ── the pieces ──
function el(parent, tag, css, html) {
  const e = document.createElement(tag)
  if (css) e.style.cssText = css
  if (html != null) e.innerHTML = html
  parent.appendChild(e)
  return e
}
// a canvas of w by h at (x, y), its pixels the device's
function pane(parent, x, y, w, h, k) {
  const cv = el(parent, 'canvas', `left:${x}px;top:${y}px;width:${w}px;height:${h}px;image-rendering:pixelated`)
  cv.width = Math.round(w * k)
  cv.height = Math.round(h * k)
  const g = cv.getContext('2d')
  g.imageSmoothingEnabled = false
  return { cv, g }
}
// the lockup in chalk at whole pixels a cell, its box's top left at (x, y)
const [, LKH] = LOCKUP_SIZE
function lockup(g, k, x, y, cell = 2) {
  drawLockup(g, x * k, y * k, cell * k, CHALK)
}
// two lines of the caption on a seam, as pacific set them: Newsreader 500 at
// 80 px, the first standing on the seam and the second hanging from it
function seamCaption(p, seam, [a, b], [ca, cb]) {
  const css = 'left:80px;right:30px;font-family:Newsreader,serif;font-weight:500;font-size:80px;line-height:0.94;letter-spacing:-0.022em;white-space:nowrap;font-optical-sizing:auto'
  el(p, 'div', `${css};bottom:${PH - seam + 18}px;color:${ca}`, a)
  el(p, 'div', `${css};top:${seam + 14}px;color:${cb}`, b)
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
// a clock in a corner, as pacific's: the place and the time, then its
// seconds a little dimmer, in the face's pixels at 2 px each; `y` is the top
// of its ascenders, and `right` sets it from the right edge instead
function clock(g, k, x, y, place, time, sec, colour, { right = false } = {}) {
  const a = pixels(`${place} · ${time} `)
  const b = pixels(`:${sec}`)
  const w = (a.w + glyph(' ').adv + b.w) * 2
  const x0 = right ? x - w : x
  blocks(g, k, x0, y, a, 2, colour)
  g.globalAlpha = 0.75
  blocks(g, k, x0 + (a.w + glyph(' ').adv) * 2, y, b, 2, colour)
  g.globalAlpha = 1
}

// ── a sign of lamps ──
// The face's pixels as lamps `dot` px apart, one lamp a pixel, the unlit
// ones showing as a real sign's do; lines centred, in a housing with a rim.
function sign(g, k, x, y, lines, { dot = 6, pad = 3, lead = 2, rim = 1, lit, off, face, edge }) {
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

// ── round's worlds, at any framing ──
// A world lit and dithered by its own program into a panel of cells over any
// window of its half (above the seam too), its tones laid in a palette: one
// canvas pixel a cell. A world flooded with a letter's colour is the same
// tones in that letter's palette, so this is the film's own colouring.
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
function worldCells(world, clock, { cols, rows, crop, palette = 'night', look = 0 }) {
  const R = renderer()
  const target = R.panel(cols, rows)
  target.crop = crop
  maskFor(R, 0, world, clock, look)
  R.drawWorld(target, 0, { world, clock, flood: 0, palette: 'night', look, phoneRect: null, phoneLit: 0, sent: -1, sun: 0, lampsOff: T.LAMPS_OFF })
  const px = R.readPanel(target)
  const out = document.createElement('canvas')
  out.width = cols
  out.height = rows
  const g = out.getContext('2d')
  const img = g.createImageData(cols, rows)
  const tones = PALETTES[palette].map(rgb)
  for (let i = 0; i < cols * rows; i++) img.data.set([...tones[Math.min(3, Math.round(px[i * 4] / 85))], 255], i * 4)
  g.putImageData(img, 0, 0)
  return out
}

// ── photographs, brought down the same way ──
// A part of a photograph over cells, its lightness levelled (`lo` to `hi`,
// then a gamma), darkened toward the top by `dusk` down to the row `sky`,
// and laid in four tones of a palette by pacific's blue noise, so it has the
// two cities' grain. `soften` blurs the photograph's own grain away first,
// in cells.
const NOISE = blueNoise()
async function photoCells(src, [sx, sy, sw, sh], cols, rows, palette, { lo = 0, hi = 1, gamma = 1, dusk = 0, sky = rows, soften = 0 } = {}) {
  const im = await load(src)
  const c = document.createElement('canvas')
  c.width = cols
  c.height = rows
  const g = c.getContext('2d', { willReadFrequently: true })
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  // (the film's own grain softened first, so the cells carry the light and
  // the blue noise is the only grain)
  g.filter = `blur(${soften}px)`
  g.drawImage(im, sx, sy, sw, sh, 0, 0, cols, rows)
  g.filter = 'none'
  const img = g.getImageData(0, 0, cols, rows)
  const d = img.data
  const tones = palette.map(rgb)
  for (let y = 0; y < rows; y++) {
    const shade = 1 - dusk * clamp(1 - y / sky)
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      let L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
      L = Math.pow(clamp((L - lo) / (hi - lo)), gamma) * shade
      const v = L * 3
      let lv = Math.floor(v)
      if (NOISE[(y % 64) * 64 + (x % 64)] / 255 <= v - lv) lv++
      d.set([...tones[Math.min(3, lv)], 255], i)
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

// ── the posters ──
export const POSTERS = {
  // the bus: the 51B at 5:14 pm in the film's ambers, from behind sol at the
  // pole, the woman asleep against the glass in the seat he gave her; the
  // line on the sign hung from the ceiling. One window across the street,
  // above her, is lit in another colour
  async bus(p, { dpr: k }) {
    // the half from x 240 and 189 px above the seam, 768 px wide: cells of
    // 4.27 px of it, 6 px of the poster
    const crop = [240, -189, 768, 960]
    const AMBER = PALETTES.amber
    const W = worldCells(0, 340, { cols: 180, rows: 225, crop, palette: 'amber' })
    // the window: the lit cells joined to one of its cells, within a few
    const wg = W.getContext('2d')
    const img = wg.getImageData(0, 0, W.width, W.height)
    const ink = rgb(AMBER[0])
    const lit = (x, y) => { const i = (y * W.width + x) * 4; return img.data[i] !== ink[0] || img.data[i + 1] !== ink[1] || img.data[i + 2] !== ink[2] }
    const seed = [151, 115]
    const seen = new Set()
    const todo = [seed]
    const accent = rgb(PALETTES.ice[2])
    while (todo.length) {
      const [x, y] = todo.pop()
      const key = y * W.width + x
      if (seen.has(key) || Math.abs(x - seed[0]) > 8 || Math.abs(y - seed[1]) > 8 || !lit(x, y)) continue
      seen.add(key)
      img.data.set(accent, key * 4)
      todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    wg.putImageData(img, 0, 0)
    const { g } = pane(p, 0, 0, PW, PH, k)
    g.drawImage(W, 0, 0, PW * k, PH * k)
    // the sign, its lamps amber, and its hangers up into the dark: one of
    // them on the pole's own line (x 740 of the half), the other as far the
    // other side
    const sy = 60
    const s = sign(g, k, 60, sy, ['every letter on the wall', 'is to somebody.'], { lit: AMBER[2], off: '#2A1F11', face: '#120D07', edge: AMBER[1] })
    const pole = Math.round(((740 - crop[0]) / crop[2]) * PW / 6) * 6
    g.fillStyle = AMBER[1]
    for (const hx of [2 * (60 + s.w / 2) - pole - 6, pole]) g.fillRect(hx * k, 0, 6 * k, (sy - 6) * k)
    lockup(g, k, 72, PH - 72 - 2 * LKH)
  },

  // the minute: Seoul on Sunday at 12:59 pm turned over above Berkeley on
  // Saturday at 8:59 pm, each one asleep by a dark phone, a minute before
  // their two phones turn rose. The 9:16 frame placed again for 4:5: each
  // half shows 675 px of its world, Seoul's skyline a little nearer its
  // steps and Berkeley's moon in a gap in the fog, so that both people, both
  // phones, the tower and the moon stay in it
  async pacific(p, { dpr: k }) {
    const SEAM = 675
    const win = [250, 325]
    const cells = await citiesCells({ W: PW, H: PH, seam: SEAM, win, t: 41, moon: [250, 470], stars: 520, skyline: 60, moonOver: true })
    const { g } = pane(p, 0, 0, PW, PH, k)
    g.drawImage(cells, 0, 0, PW * k, PH * k)
    // the phones, asleep: dark, with a thin rim, as the treatment drew them
    const phones = [[1080 - 220, SEAM - (870 - win[0])], [540, SEAM + (848 - win[1])]]
    for (const [x, y] of phones) {
      g.fillStyle = 'rgba(41, 41, 46, 0.85)'
      g.fillRect((x - 31.6) * k, (y - 14.6) * k, 63.2 * k, 29.2 * k)
      g.fillStyle = '#0B0B0E'
      g.fillRect((x - 30) * k, (y - 13) * k, 60 * k, 26 * k)
    }
    // the clocks in the outer corners, and the lockup in the last
    clock(g, k, 64, 60, 'seoul', 'sun 12:59 pm', '58', PALETTES.amber[0])
    clock(g, k, PW - 64, PH - 84, 'berkeley', 'sat 8:59 pm', '58', CHALK, { right: true })
    // (its words on the clock's baseline, 20 cells down its box)
    lockup(g, k, 64, PH - 64 - 40)
    seamCaption(p, SEAM, ['every mutual is revealed', 'on saturday at 9pm pacific.'], [INK, CHALK])
  },

  // the sea: two people on a sea wall at dusk, from behind, a little apart,
  // looking out; the photograph's horizon is the seam, and on it the line
  async sea(p, { dpr: k }) {
    const { g } = pane(p, 0, 0, PW, PH, k)
    // the sea wall alone: 992 by 1240 of it, its horizon (row 616) at 672
    const SEAM = 672
    const cells = await photoCells(here('./photo-sea-wall.jpg'), [107, 0, 992, 1240], PW / 3, PH / 3, PALETTES.ice, { lo: 0.12, hi: 0.85, gamma: 1.3, dusk: 0.4, sky: SEAM / 3, soften: 1.2 })
    g.drawImage(cells, 0, 0, PW * k, PH * k)
    // on the wall, which is the last 98 px
    lockup(g, k, 72, PH - 16 - 2 * LKH)
    seamCaption(p, SEAM, ['nothing happens', 'unless it\u2019s mutual.'], [INK, CHALK])
  },

  // the sea, with both photographs: above the seam, one who passed by as a
  // blur beside one who stood still; below it, the two on the wall. Tried
  // for the third poster, and kept as the alternate
  async seapair(p, { dpr: k }) {
    const ICE = PALETTES.ice
    const { g } = pane(p, 0, 0, PW, PH, k)
    const SEAM = 600
    const top = await photoCells(here('./photo-passing.jpg'), [0, 330, 1160, Math.round((SEAM * 1160) / PW)], PW / 3, SEAM / 3, ICE, { lo: 0.08, hi: 0.95, gamma: 1.3, dusk: 0.3, soften: 1.2 })
    const bh = PH - SEAM
    const sh = Math.round((bh * 1206) / PW)
    const bot = await photoCells(here('./photo-sea-wall.jpg'), [0, 1240 - sh, 1206, sh], PW / 3, bh / 3, ICE, { lo: 0.12, hi: 0.85, gamma: 1.3, dusk: 0.35, sky: Math.round(((616 - (1240 - sh)) * PW) / 1206 / 3), soften: 1.2 })
    g.drawImage(top, 0, 0, PW * k, SEAM * k)
    g.drawImage(bot, 0, SEAM * k, PW * k, bh * k)
    lockup(g, k, 72, PH - 16 - 2 * LKH)
    seamCaption(p, SEAM, ['nothing happens', 'unless it\u2019s mutual.'], [CHALK, INK])
  },
}

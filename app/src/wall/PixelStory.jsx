// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PIXEL STORY, on the glass                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A story out of pixmark.js, drawn on a letter's screen: the body of a
// `Screen` holds one canvas, and the canvas holds the panel's own pixels, a
// cell of it for every cell of the story, with the gap between them that an
// LCD has. The unlit cells are there too, a breath of ink, the way the dots
// of a phone's panel were always faintly there when nothing was on them.
//
// ── what it costs ───────────────────────────────────────────────────────────
// One loop, on the clock, and no state per frame: the story is asked for its
// frame on every animation frame, and the canvas is drawn only when the
// answer is a different frame. The run and the dance change twelve times a
// second; the pink wave and the mark gathering are drawn at the display's
// own rate, because they glide, for the second and a half they move; a
// screen standing still is not drawn at all, and the loop stops at the last
// frame. A screen's glass is blurred a third of a pixel and tilted
// (screen.css `.wl-scr`), so every drawing is a composite through a filter,
// and a canvas drawn sixty times a second under one for longer than it has
// to be is what this is built not to be.
//
// A story that is `live` (the mutual's, pixmark.js `revealStory`) does not
// stop: past its end it is a loop that changes ten times a second, and it is
// asked twenty times a second on a timer rather than sixty on the display's
// clock. It stops when the tab is hidden and starts again, on the right
// frame, when it is shown: the loop is a function of the clock, so nothing
// is lost by not drawing it.
//
// ── what a cell carries ─────────────────────────────────────────────────────
// A cell is [x, y, ink, heat, alpha]. The ink is the screen's near ink, the
// same ink at half for the far side, or the story's rose (pixmark.js `ROSE`).
// `heat` is how much of the rose a cell of ink is carrying, for the glint on
// the mutual's ring. `alpha` is how much of it is lit, for the heart that
// fades as it rises. A cell whose x or y is not a whole number is one on its
// way somewhere (the mark gathering), and it is drawn where it is, to the
// device pixel, between the panel's own cells, until it lands on one.
//
// ── the pink ────────────────────────────────────────────────────────────────
// A frame may carry a `wash`: the backlight turned pink (pixmark.js `PANEL`),
// out to a radius round a point, its front a little brighter than what is
// behind it, or the whole panel once the front has passed its corners. It is
// the panel's own gradient, round the same hot spot the screen's greys are
// round (screen.css `.wl-scr-bg`, looks.js `quirks`), painted once for each
// size and uncovered frame by frame, so the pink screen is the same phone,
// photographed the same way, lit another colour; the dust and the glare lie
// over it as they lie over the grey. It is drawn first, under the dots.
//
// A frame may carry a `glow` as well: a soft ring of light round a point,
// brighter at its edge, for the mutual's heartbeat behind the mark.
//
// ── the two ways of drawing it ──────────────────────────────────────────────
// `pixel` is the product: square cells in the screen's ink. `ascii` sets each
// lit cell as a character of the phone's face instead, heavier where a cell
// is deep inside a shape and lighter at its edge, so the owner can see the
// same story typed. It is reached in development only (Intro.jsx `?intro=`).
//
// `at` holds the clock on one moment (the last frame under reduced motion, or
// any frame for the screenshot loop). `from` is when the clock started, so a
// story can be started by whoever owns the beats around it, and started
// again from another moment by moving it.

import { useEffect, useRef } from 'react'
import { markCells, MARK_CUT, BLUSH, ROSE, PANEL } from './pixmark.js'
import { CHALK } from './mark.js'
import './story.css'

// ── the mark, standing still ────────────────────────────────────────────────
// The last frame of every story with no screen round it: the same cells the
// intro assembles (pixmark.js `markCells`), each a square of chalk with the
// gap an LCD has between its dots, drawn once. It is the seal on the root
// wall's poster, where the liquid metal stood, so the first screen after the
// intro is the mark the intro ended on. `cell` is CSS pixels per cell; the
// canvas is the grid's size to the device pixel.
export function PixelMark({ cell = 2, ink = CHALK, className = '' }) {
  const ref = useRef(null)
  const n = markCells(47, MARK_CUT).n
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const { list } = markCells(47, MARK_CUT)
    const dpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)))
    const px = cell * dpr
    const gap = Math.max(1, Math.round(px * 0.18))
    cv.width = n * px
    cv.height = n * px
    const g = cv.getContext('2d')
    g.clearRect(0, 0, cv.width, cv.height)
    g.fillStyle = ink
    for (const c of list) g.fillRect(c.x * px, c.y * px, px - gap, px - gap)
  }, [cell, ink, n])
  return (
    <canvas
      ref={ref} className={`wl-pixmark ${className}`} aria-hidden="true"
      style={{ width: n * cell, height: n * cell, imageRendering: 'pixelated' }}
    />
  )
}

// ── and the phone is held square ──
// Every letter's screen is photographed a degree or two off true (looks.js
// `quirks`), and a canvas of square cells under that turn is resampled
// across its whole face: the gaps between the cells beat against the
// device's own pixels and a grid twice the pitch swims over the runners. A
// screen with a story on it is held square to the camera, its other quirks
// kept. Handed to `Screen` as its `style`, which is laid over its quirks.
export const SQUARE = { '--q-rx': '0deg', '--q-ry': '0deg', '--q-rz': '0deg' }

// the characters, lightest to heaviest, all plain ASCII
const RAMP = ['.', ':', '+', '*', '#', '@']

// a hex as its three channels; anything else is the screen's black
function rgbOf(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [19, 19, 19]
}
const ROSE_RGB = rgbOf(ROSE)
const BLUSH_RGB = rgbOf(BLUSH).join(', ')
// the heartbeat on a pink panel is the pink going nearly white, and the
// wave's front a pink a step lighter than the panel behind it
const LIGHT_RGB = '255, 246, 250'
const FRONT_RGB = '255, 214, 230'

// The unlit dots: the screen's ink at a few per cent.
function faint(rgb, a = 0.07) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`
}

// which ink wins a cell two drawings light at once: the near ink, then the
// rose, then the mid, then the far ink
const RANK = [0, 4, 1, 3, 2]
// how much of the ink each is lit at: the near whole, the far at half, and
// the mid (ink 4, the intro's faces, hands and her dress) between them
const LIT = [1, 1, 0.5, 1, 0.72]

// The fill of a lit cell: its ink, carried toward the rose by its heat, and
// lit by its alpha. Heat and alpha are counted in sixteenths, so a frame has
// a few dozen fills to set and not a few hundred, and each is made once.
function fillOf(s, ink, heat, alpha) {
  const h = Math.round(heat * 16)
  const a = Math.round(alpha * 16)
  const key = ink * 1000 + h * 20 + a
  let f = s.fills.get(key)
  if (f) return f
  const base = ink === 3 ? ROSE_RGB : s.rgb
  const k = ink === 3 ? 0 : h / 16
  const c = base.map((v, i) => Math.round(v + (ROSE_RGB[i] - v) * k))
  const lit = LIT[ink] ?? 1
  f = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${((lit + (1 - lit) * k) * (a / 16)).toFixed(3)})`
  s.fills.set(key, f)
  return f
}

// The light: a ring round a point, its edge the brightest, the inside
// `inner` of that, and a long soft tail outside it so it never reads as a
// disc with an edge.
function glowOn(g, gl, s) {
  const { ox, oy, cell, mx, my } = s
  const x = mx + (gl.x + ox + 0.5) * cell
  const y = my + (gl.y + oy + 0.5) * cell
  const r = Math.max(cell, gl.r * cell * 1.3)
  const a = Math.max(0, Math.min(1, gl.a))
  if (a <= 0.004) return
  const inner = gl.inner ?? 0.5
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  const tone = gl.light ? LIGHT_RGB : BLUSH_RGB
  const at = (k) => `rgba(${tone}, ${(a * k).toFixed(3)})`
  gr.addColorStop(0, at(inner))
  gr.addColorStop(0.45, at(inner + (1 - inner) * 0.55))
  gr.addColorStop(0.64, at(1))
  gr.addColorStop(0.76, at(0.62))
  gr.addColorStop(0.87, at(0.26))
  gr.addColorStop(1, at(0))
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = gr
  g.fillRect(0, 0, s.W, s.H)
}

// The pink panel for this size: the screen's own backlight gradient, an
// ellipse 120% by 95% of the screen round its hot spot (screen.css
// `.wl-scr-bg`), in the three pinks, on a canvas the size of this one. The
// screen is the canvas's nearest `.wl-scr`, and where the canvas sits in it
// is measured, not assumed, so the pink lines up with the grey it replaces.
function pinkPanel(s, host, el, dpr) {
  const scr = el.closest('.wl-scr')
  const cs = getComputedStyle(el)
  const pct = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n / 100 : d }
  const hx = pct(cs.getPropertyValue('--q-hx'), 0.8)
  const hy = pct(cs.getPropertyValue('--q-hy'), 0.66)
  const hr = host.getBoundingClientRect()
  const sr = scr ? scr.getBoundingClientRect() : hr
  // a scale on some ancestor (a sheet arriving) scales both rects alike
  const k = hr.width ? host.clientWidth / hr.width : 1
  const cx = ((sr.left - hr.left) + hx * sr.width) * k * dpr
  const cy = ((sr.top - hr.top) + hy * sr.height) * k * dpr
  const rx = Math.max(1, 1.2 * sr.width * k * dpr)
  const ry = Math.max(1, 0.95 * sr.height * k * dpr)
  const cv = document.createElement('canvas')
  cv.width = s.W
  cv.height = s.H
  const p = cv.getContext('2d')
  p.setTransform(1, 0, 0, ry / rx, cx, cy)
  const gr = p.createRadialGradient(0, 0, 0, 0, 0, rx)
  const pan = s.panel || PANEL
  gr.addColorStop(0, pan[0])
  gr.addColorStop(0.52, pan[1])
  gr.addColorStop(1, pan[2])
  p.fillStyle = gr
  p.fillRect(-cx, (-cy * rx) / ry, s.W, (s.H * rx) / ry)
  s.pink = cv
  const tmp = document.createElement('canvas')
  tmp.width = s.W
  tmp.height = s.H
  s.tmp = tmp
}

// The pink, out to the wave's front, or whole. The front is soft over five
// cells, so it is a light arriving and not a line, and a little brighter
// than what is behind it for as long as it is moving (`rim`).
function washOn(g, w, s) {
  if (!s.pink) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = Math.max(0, Math.min(1, w.level ?? 1))
  if (w.r == null) {
    g.drawImage(s.pink, 0, 0)
    g.globalAlpha = 1
    return
  }
  const { ox, oy, cell, mx, my } = s
  const x = mx + (w.x + ox + 0.5) * cell
  const y = my + (w.y + oy + 0.5) * cell
  const R = Math.max(0.5, w.r) * cell
  // how soft its front is, in cells (the intro's finer grid asks for more)
  const E = (w.soft || 5) * cell
  const out = R + E
  const t = s.tmp.getContext('2d')
  t.globalCompositeOperation = 'source-over'
  t.clearRect(0, 0, s.W, s.H)
  t.drawImage(s.pink, 0, 0)
  t.globalCompositeOperation = 'destination-in'
  const m = t.createRadialGradient(x, y, 0, x, y, out)
  m.addColorStop(0, 'rgba(0, 0, 0, 1)')
  m.addColorStop(Math.max(0, (R - E) / out), 'rgba(0, 0, 0, 1)')
  m.addColorStop(1, 'rgba(0, 0, 0, 0)')
  t.fillStyle = m
  t.fillRect(0, 0, s.W, s.H)
  t.globalCompositeOperation = 'source-over'
  g.drawImage(s.tmp, 0, 0)
  g.globalAlpha = 1
  const rim = Math.max(0, Math.min(1, w.rim ?? 0))
  if (rim > 0.01) {
    const r = g.createRadialGradient(x, y, 0, x, y, out)
    r.addColorStop(0, `rgba(${FRONT_RGB}, 0)`)
    r.addColorStop(Math.max(0, (R - 1.6 * E) / out), `rgba(${FRONT_RGB}, 0)`)
    r.addColorStop(Math.max(0, (R - 0.4 * E) / out), `rgba(${FRONT_RGB}, ${(0.42 * rim).toFixed(3)})`)
    r.addColorStop(1, `rgba(${FRONT_RGB}, 0)`)
    g.fillStyle = r
    g.fillRect(0, 0, s.W, s.H)
  }
}

// The fine story's pink is worked out at a quarter of the canvas's size and
// laid on it smoothly. It is a light, all gradient, with a front soft over a
// dozen cells, and a gradient a quarter the size is the same gradient; the
// sixteenth of the pixels is what lets a phone spread it sixty times a
// second.
const QW = 4
function washFine(g, w, s) {
  if (!s.pink) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = Math.max(0, Math.min(1, w.level ?? 1))
  if (w.r == null) {
    g.drawImage(s.pink, 0, 0)
    g.globalAlpha = 1
    return
  }
  if (!s.pinkS) {
    const sw = Math.ceil(s.W / QW)
    const sh = Math.ceil(s.H / QW)
    const a = document.createElement('canvas')
    a.width = sw
    a.height = sh
    a.getContext('2d').drawImage(s.pink, 0, 0, sw * QW, sh * QW, 0, 0, sw, sh)
    const b = document.createElement('canvas')
    b.width = sw
    b.height = sh
    s.pinkS = a
    s.tmpS = b
  }
  const { ox, oy, cell, mx, my } = s
  const x = (mx + (w.x + ox + 0.5) * cell) / QW
  const y = (my + (w.y + oy + 0.5) * cell) / QW
  const R = (Math.max(0.5, w.r) * cell) / QW
  const E = ((w.soft || 5) * cell) / QW
  const out = R + E
  const sw = s.tmpS.width
  const sh = s.tmpS.height
  const t = s.tmpS.getContext('2d')
  t.globalCompositeOperation = 'source-over'
  t.clearRect(0, 0, sw, sh)
  t.drawImage(s.pinkS, 0, 0)
  t.globalCompositeOperation = 'destination-in'
  const m = t.createRadialGradient(x, y, 0, x, y, out)
  m.addColorStop(0, 'rgba(0, 0, 0, 1)')
  m.addColorStop(Math.max(0, (R - E) / out), 'rgba(0, 0, 0, 1)')
  m.addColorStop(1, 'rgba(0, 0, 0, 0)')
  t.fillStyle = m
  t.fillRect(0, 0, sw, sh)
  t.globalCompositeOperation = 'source-over'
  const rim = Math.max(0, Math.min(1, w.rim ?? 0))
  if (rim > 0.01) {
    const r = t.createRadialGradient(x, y, 0, x, y, out)
    r.addColorStop(0, `rgba(${FRONT_RGB}, 0)`)
    r.addColorStop(Math.max(0, (R - 1.6 * E) / out), `rgba(${FRONT_RGB}, 0)`)
    r.addColorStop(Math.max(0, (R - 0.4 * E) / out), `rgba(${FRONT_RGB}, ${(0.42 * rim).toFixed(3)})`)
    r.addColorStop(1, `rgba(${FRONT_RGB}, 0)`)
    t.fillStyle = r
    t.fillRect(0, 0, sw, sh)
  }
  g.imageSmoothingEnabled = true
  g.drawImage(s.tmpS, 0, 0, sw, sh, 0, 0, sw * QW, sh * QW)
  g.globalAlpha = 1
}

// The whole body of the screen is the panel: `pc` by `pr` cells, the story's
// own grid centred in it at (`ox`, `oy`), so the unlit dots run edge to edge
// and there is no second rectangle standing inside the glass. The canvas is
// the body's size to the device pixel, and the cells are laid in it `mx`,
// `my` in, which is the part of a cell that is left over at its edges.
function paint(g, f, s) {
  const { pc, pr, ox, oy, cell, gap, W, H, mx, my } = s
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, W, H)
  // a story may carry its own ink from frame to frame (the intro's goes from
  // the night's to the rose's with the pink)
  if (f.ink && f.ink !== s.inkNow) {
    s.inkNow = f.ink
    s.rgb = rgbOf(f.ink)
    s.ghost = faint(s.rgb)
    s.fills.clear()
  }
  // one ink per cell, by rank, so a cell two pixels pass through on the
  // same frame is drawn once; the warmer of two of the same ink
  const n = pc * pr
  const ink = new Uint8Array(n)
  const heat = new Float32Array(n)
  const alpha = new Float32Array(n)
  // the cells on their way somewhere, drawn where they are
  const free = []
  for (const c of f.cells) {
    if (!Number.isInteger(c[0]) || !Number.isInteger(c[1])) { free.push(c); continue }
    const px = c[0] + ox
    const py = c[1] + oy
    if (px < 0 || py < 0 || px >= pc || py >= pr) continue
    const i = py * pc + px
    const k = c[2]
    const h = c[3] || 0
    const was = ink[i]
    if (!was || RANK[k] > RANK[was] || (k === was && h > heat[i])) {
      ink[i] = k
      heat[i] = h
      alpha[i] = c[4] ?? 1
    }
  }
  const d = cell - gap
  const at = (i) => [(i % pc) * cell, Math.floor(i / pc) * cell]
  // the unlit dot under a cell on its way somewhere is not drawn: a body
  // sliding between the panel's cells covers the dots it is mostly over, so
  // the faint grid does not show through it at another pitch (and only
  // those, or a ring of missing dots goes round it as a light)
  const under = free.length ? new Uint8Array(n) : null
  for (const c of free) {
    const x = Math.round(c[0] + ox)
    const y = Math.round(c[1] + oy)
    if (x >= 0 && y >= 0 && x < pc && y < pr) under[y * pc + x] = 1
  }
  // The frame they touched used to be the whole panel in ink with the cells
  // cut out of it, the way a phone's screen flashed when something came in.
  // It read as a collision, and it went with the collision (pixmark.js
  // `THE PINK`): what the panel does now is turn pink.
  // the pink and the light, under the dots
  if (f.wash) washOn(g, f.wash, s)
  if (f.glow) for (const gl of [].concat(f.glow)) glowOn(g, gl, s)
  g.setTransform(1, 0, 0, 1, mx, my)
  if (s.mode === 'ascii') {
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `400 ${Math.round(cell * 1.7)}px ${s.face}`
    const lit = (x, y) => x >= 0 && y >= 0 && x < pc && y < pr && ink[y * pc + x]
    for (let i = 0; i < n; i++) {
      if (!ink[i]) continue
      const x = i % pc
      const y = Math.floor(i / pc)
      let m = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && lit(x + dx, y + dy)) m++
      const k = ink[i] === 2 ? (m >= 4 ? 2 : 1) : m >= 8 ? 5 : m >= 6 ? 4 : m >= 4 ? 3 : 2
      g.fillStyle = fillOf(s, ink[i], heat[i], alpha[i])
      g.fillText(RAMP[k], x * cell + cell / 2, y * cell + cell / 2)
    }
    for (const c of free) {
      g.fillStyle = fillOf(s, c[2], c[3] || 0, c[4] ?? 1)
      g.fillText(RAMP[3], (c[0] + ox) * cell + cell / 2, (c[1] + oy) * cell + cell / 2)
    }
    return
  }
  // the panel's own dots, unlit
  g.fillStyle = s.ghost
  for (let i = 0; i < n; i++) {
    if (ink[i] || (under && under[i])) continue
    const [x, y] = at(i)
    g.fillRect(x, y, d, d)
  }
  // and the lit ones
  let last = ''
  for (let i = 0; i < n; i++) {
    if (!ink[i]) continue
    const fs = fillOf(s, ink[i], heat[i], alpha[i])
    if (fs !== last) { g.fillStyle = fs; last = fs }
    const [x, y] = at(i)
    g.fillRect(x, y, d, d)
  }
  // and the ones between cells, to the device pixel
  for (const c of free) {
    const fs = fillOf(s, c[2], c[3] || 0, c[4] ?? 1)
    if (fs !== last) { g.fillStyle = fs; last = fs }
    g.fillRect(Math.round((c[0] + ox) * cell), Math.round((c[1] + oy) * cell), d, d)
  }
}

// ── the fine grid ──
// The intro is drawn on a grid nearly twice as fine as the door's, at the
// pitch every letter is lit at, and afresh on every frame of the display
// while the two of them run: nine thousand dots a frame, laid one by one, is
// more than a phone can paint sixty times a second. So on a story that asks
// for it (`fine`) the panel's unlit dots are drawn once, for this size and
// this ink, onto a canvas of their own, and laid down whole; and the lit
// cells are drawn by their light, every cell of one strength in one path,
// so a frame sets a few dozen fills and not a few thousand. The one thing
// given up is the dot left out under a pixel between cells: on this grid a
// pixel on its way somewhere is small enough that the dot under it is lost
// in it.
function ghostGrid(s) {
  const cv = document.createElement('canvas')
  cv.width = s.W
  cv.height = s.H
  const g = cv.getContext('2d')
  const d = s.cell - s.gap
  g.fillStyle = s.ghost
  g.beginPath()
  for (let y = 0; y < s.pr; y++) for (let x = 0; x < s.pc; x++) g.rect(s.mx + x * s.cell, s.my + y * s.cell, d, d)
  g.fill()
  s.grid = cv
}
function paintFine(g, f, s) {
  const { pc, pr, ox, oy, cell, gap, W, H, mx, my } = s
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, W, H)
  if (f.ink && f.ink !== s.inkNow) {
    s.inkNow = f.ink
    s.rgb = rgbOf(f.ink)
    s.ghost = faint(s.rgb)
    s.fills.clear()
  }
  // (the unlit dots are a few per cent of the ink, and are not drawn again
  // for each step of the ink toward the rose's: at that strength the two
  // inks are one grey)
  if (!s.grid) ghostGrid(s)
  if (f.wash) washFine(g, f.wash, s)
  if (f.glow) for (const gl of [].concat(f.glow)) glowOn(g, gl, s)
  g.drawImage(s.grid, 0, 0)
  // the lit cells, by their fill; a cell lit twice keeps the stronger
  const d = cell - gap
  const seen = s.seen && s.seen.length === pc * pr ? s.seen : (s.seen = new Float32Array(pc * pr))
  seen.fill(0)
  const by = s.by || (s.by = new Map())
  for (const list of by.values()) list.length = 0
  const add = (fs, x, y) => {
    let list = by.get(fs)
    if (!list) { list = []; by.set(fs, list) }
    list.push(x, y)
  }
  const on = []
  for (const c of f.cells) {
    const x = c[0] + ox
    const y = c[1] + oy
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      add(fillOf(s, c[2], c[3] || 0, c[4] ?? 1), mx + Math.round(x * cell), my + Math.round(y * cell))
      continue
    }
    if (x < 0 || y < 0 || x >= pc || y >= pr) continue
    const i = y * pc + x
    const a = (LIT[c[2]] ?? 1) * (c[4] ?? 1)
    if (a <= seen[i]) continue
    if (!seen[i]) on.push(i)
    seen[i] = a
    s.cellOf = s.cellOf || new Array(pc * pr)
    s.cellOf[i] = c
  }
  for (const i of on) {
    const c = s.cellOf[i]
    add(fillOf(s, c[2], c[3] || 0, c[4] ?? 1), mx + (i % pc) * cell, my + Math.floor(i / pc) * cell)
  }
  for (const [fs, list] of by) {
    if (!list.length) continue
    g.fillStyle = fs
    g.beginPath()
    for (let k = 0; k < list.length; k += 2) g.rect(list[k], list[k + 1], d, d)
    g.fill()
  }
}

// how often a live story is asked for its frame, once it is past its end
const LIVE_TICK = 50

export default function PixelStory({ story, at = null, from = null, mode = 'pixel', className = '' }) {
  const box = useRef(null)
  const cv = useRef(null)
  // when the clock started: the owner's, or this mount's
  const mounted = useRef(typeof performance !== 'undefined' ? performance.now() : 0)

  useEffect(() => {
    const host = box.current
    const el = cv.current
    if (!host || !el || !story) return undefined
    const g = el.getContext('2d')
    if (!g) return undefined
    const t0 = from ?? mounted.current
    let raf = 0
    let timer = 0
    let key = null
    let last = null
    let s = null
    const size = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return false
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const cell = Math.max(1, Math.floor(Math.min((w * dpr) / story.cols, (h * dpr) / story.rows)))
      const cs = getComputedStyle(el)
      const pc = Math.max(story.cols, Math.floor((w * dpr) / cell))
      const pr = Math.max(story.rows, Math.floor((h * dpr) / cell))
      const inkHex = cs.getPropertyValue('--s-ink').trim() || '#131313'
      s = {
        pc, pr, ox: (pc - story.cols) >> 1, oy: (pr - story.rows) >> 1, cell, mode,
        gap: cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : cell >= 3 ? 1 : 0,
        ink: inkHex, rgb: rgbOf(inkHex), fills: new Map(), panel: story.panel,
        face: cs.fontFamily || 'monospace', fine: !!story.fine && mode !== 'ascii',
      }
      s.ghost = faint(s.rgb)
      s.W = Math.round(w * dpr)
      s.H = Math.round(h * dpr)
      s.mx = (s.W - pc * cell) >> 1
      s.my = (s.H - pr * cell) >> 1
      el.width = s.W
      el.height = s.H
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      pinkPanel(s, host, el, dpr)
      key = null
      return true
    }
    const draw = (t) => {
      const f = story.frame(Math.max(0, story.live ? t : Math.min(t, story.end)))
      last = f
      if (!s || f.key === key) return
      key = f.key
      if (s.fine) paintFine(g, f, s)
      else paint(g, f, s)
    }
    const now = () => (at != null ? at : performance.now() - t0)
    const stop = () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      raf = 0
      timer = 0
    }
    const tick = () => {
      raf = 0
      timer = 0
      const t = now()
      draw(t)
      if (at != null || document.hidden) return
      if (t < story.end) raf = requestAnimationFrame(tick)
      else if (story.live) timer = setTimeout(tick, LIVE_TICK)
    }
    size()
    tick()
    // a hidden tab draws nothing, and a live screen shown again picks up
    // on the frame the clock has reached
    const onVis = () => {
      if (document.hidden) stop()
      else if (!raf && !timer) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    // a new size is a new grid of device pixels: drawn again at once, from
    // the frame already on it
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { if (size() && last) { key = null; draw(now()) } })
      : null
    if (ro) ro.observe(host)
    // the typed version waits for its face, and is drawn again in it
    let off = false
    if (mode === 'ascii' && document.fonts && document.fonts.load) {
      document.fonts.load(`400 16px ${s ? s.face : 'monospace'}`).then(() => { if (!off && last) { key = null; draw(now()) } }).catch(() => {})
    }
    return () => {
      off = true
      stop()
      document.removeEventListener('visibilitychange', onVis)
      if (ro) ro.disconnect()
    }
  }, [story, at, from, mode])

  return (
    <div className={`wl-story ${className}`} ref={box} aria-hidden="true">
      <canvas ref={cv} className="wl-story-cv" />
    </div>
  )
}

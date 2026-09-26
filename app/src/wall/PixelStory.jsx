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
// answer is a different frame. The two of them running and the mark
// gathering are drawn at the display's own rate, because they glide; the
// pink steps twenty five times a second, because it does not; a screen
// standing still is not drawn at all, and the loop stops at the last
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
// A story with a `loop` (the door's and the mutual's) is told again from
// its first frame every `loop` ms, the clock taken round: at the display's
// rate while it is being told, and past its end a still mark waits on one
// timer for the next telling, and a live one ticks as above. The screen is
// asleep across the turn (Join.jsx, Reveal.jsx), so the first frame of the
// next telling is not seen to replace the last of this one.
//
// ── what a cell carries ─────────────────────────────────────────────────────
// A cell is [x, y, ink, heat, alpha]. The ink is the screen's near ink, the
// same ink at half for the far side, or the story's rose (pixmark.js `ROSE`).
// `heat` is how much of the rose a cell of ink is carrying, for the glint on
// the mutual's ring. `alpha` is how much of it is lit, for the edges of the
// two of them and a note going out. A cell whose x or y is not a whole
// number is one on its way somewhere (the mark gathering), and it is drawn
// where it is, to the device pixel, between the panel's own cells, until it
// lands on one.
//
// ── the pink ────────────────────────────────────────────────────────────────
// A frame may carry a `wash`: the backlight turned pink (pixmark.js `PANEL`),
// a few of the panel's cells at a time, or the whole panel once the last
// corner has turned. The pink itself is the panel's own gradient, round the
// same hot spot the screen's greys are round (screen.css `.wl-scr-bg`,
// looks.js `quirks`), painted once for each size, so the pink screen is the
// same phone, photographed the same way, lit another colour; the dust, the
// glare and the pixels up close lie over it as they lie over the grey. What
// moves is which of the panel's cells it shows through: blocks of them,
// each turning on its own step (`spreadMap`, `spreadOn`), and never a soft
// front. It is drawn first, under the dots.
//
// A frame may carry a `glow` as well: a soft ring of light round a point,
// brighter at its edge, for the mutual's breath behind the mark.
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

import { useEffect, useRef, useState } from 'react'
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

// ── and the panel under the pink ──
// A phone turned from one light to another as the pink spreads over it
// (turn.js) turns everything it paints by one number, `--mu-turn`. The
// panel itself, its three greys under the pink, turns by a number of its
// own, `--mu-pan`, which comes up only once the pink has covered all of it
// (mutual.css): the grey the pink has not reached yet is never seen to go
// pink, only a block of cells at a time.
const PANEL_VARS = ['--s-hi', '--s-mid', '--s-lo']
export function underPink(style) {
  const out = { ...style }
  for (const k of PANEL_VARS) if (typeof out[k] === 'string') out[k] = out[k].replace('var(--mu-turn)', 'var(--mu-pan)')
  return out
}

// ── the story's clock, for the page round the screen ──
// The steps under the door's phone and the words typed on the mutual's are
// lit on the story's own clock, taken round with it when it is told again.
// This answers how many of `marks` (ms into a telling, in order) the clock
// has passed on this telling (`i`), and which telling it is (`n`), and
// wakes only when the next mark or the next telling comes, not on every
// frame. `marks` is a list made once, outside the render. Held with the
// tab, and not run at all when `off` (reduced motion, a held frame).
function passed(marks, u) {
  let i = 0
  while (i < marks.length && u >= marks[i]) i++
  return i
}
export function useStoryClock(story, from, marks, off = false) {
  const loop = story.loop || 0
  const read = () => {
    const t = performance.now() - from
    const u = loop ? ((t % loop) + loop) % loop : t
    return { i: passed(marks, u), n: loop ? Math.floor(t / loop) : 0, u }
  }
  const [got, setGot] = useState(read)
  useEffect(() => {
    if (off) return undefined
    let id = 0
    const step = () => {
      const r = read()
      setGot((g) => (g.i === r.i && g.n === r.n ? g : r))
      if (document.hidden) return
      const next = r.i < marks.length ? marks[r.i] : loop
      if (next) id = setTimeout(step, Math.max(8, next - r.u + 2))
    }
    step()
    const onVis = () => { clearTimeout(id); if (!document.hidden) step() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', onVis)
    }
    // `read` is this render's, over the same three things
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, from, marks, off])
  return got
}
// the marks a held moment of a telling has passed, for a frame held still
export function heldAt(marks, u) {
  return { i: passed(marks, u), n: 0, u }
}

// the characters, lightest to heaviest, all plain ASCII
const RAMP = ['.', ':', '+', '*', '#', '@']

// a hex as its three channels; anything else is the screen's black
function rgbOf(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [19, 19, 19]
}
const ROSE_RGB = rgbOf(ROSE)
const BLUSH_RGB = rgbOf(BLUSH).join(', ')
// the breath on a pink panel is the pink going nearly white, and a block of
// the panel that has just turned a pink a step lighter than the panel
// behind it
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

// ── the pink, a few cells at a time ──
// The panel in square blocks of `SPREAD` cells a side, and for each the
// moment it turns: how far it is from where the pink leaves, in cells,
// pushed on or held back by two octaves of a slow noise (lobes a score of
// cells across, and ripples in their edges) and by a jitter of its own, so
// the front is ragged at the block and grows in lobes, never as a circle;
// then laid between 0 and 1, the nearest block to the farthest, so a front
// that has gone all the way has turned every block on the panel, whatever
// its size. Worked out once for a size and a place it leaves from. The
// noise is in the story's own cells, so the lobes are the same shape on a
// phone's panel and a desk's.
const SPREAD = 2
const smoothstep = (k) => k * k * (3 - 2 * k)
// a number from three others, the same every time it is asked
function hash3(a, b, c) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
// a smooth noise, -1 to 1, on a lattice `w` cells apart
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
function spreadMap(s, w) {
  const key = `${w.x}|${w.y}`
  if (s.spread && s.spread.key === key) return s.spread
  const bw = Math.ceil(s.pc / SPREAD)
  const bh = Math.ceil(s.pr / SPREAD)
  const th = new Float32Array(bw * bh)
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      // the block's middle, in the story's cells
      const x = (i + 0.5) * SPREAD - s.ox
      const y = (j + 0.5) * SPREAD - s.oy
      const v = Math.hypot(x - w.x - 0.5, y - w.y - 0.5)
        + 7 * noise(x, y, 19, 1) + 2.6 * noise(x, y, 7, 2) + 3.4 * (hash3(i, j, 3) - 0.5)
      th[j * bw + i] = v
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  for (let k = 0; k < th.length; k++) th[k] = (th[k] - lo) / (hi - lo || 1)
  s.spread = { key, th, bw, bh }
  return s.spread
}

// The pink through the blocks that have turned; and over the ones that
// turned on this step, and the step before, a lighter pink, less on the
// second, so a block is seen to come on and settle the way a cell of an LCD
// does, and the front is a ragged line of blocks just lit rather than an
// edge. `level` takes the whole of it down (the mutual's pink going out
// onto the panel's own).
function spreadOn(g, w, s) {
  if (!s.pink) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  const level = Math.max(0, Math.min(1, w.level ?? 1))
  if (w.p == null) {
    g.globalAlpha = level
    g.drawImage(s.pink, 0, 0)
    g.globalAlpha = 1
    return
  }
  const m = spreadMap(s, w)
  // The pink changes twenty five times a second and the two of them under
  // it sixty, breathing: what a step of the pink is, is worked out on its
  // step and laid again as it is on the frames between.
  const at = `${m.key}|${w.p}`
  if (s.spreadAt !== at) {
    const { bw, bh, th } = m
    const px = SPREAD * s.cell
    // a block's edges; the blocks along the panel's own edges run on to the
    // canvas's, over the part of a cell left over there
    const X = (i) => (i <= 0 ? 0 : i >= bw ? s.W : s.mx + i * px)
    const Y = (j) => (j <= 0 ? 0 : j >= bh ? s.H : s.my + j * px)
    const p1 = w.p1 ?? w.p
    const p2 = w.p2 ?? p1
    const now = []
    const then = []
    const t = s.tmp.getContext('2d')
    t.globalCompositeOperation = 'source-over'
    t.clearRect(0, 0, s.W, s.H)
    t.fillStyle = '#000'
    t.beginPath()
    for (let j = 0; j < bh; j++) {
      const y = Y(j)
      const h = Y(j + 1) - y
      for (let i = 0; i < bw; i++) {
        const v = th[j * bw + i]
        if (v > w.p) continue
        const x = X(i)
        const wd = X(i + 1) - x
        t.rect(x, y, wd, h)
        if (v > p1) now.push(x, y, wd, h)
        else if (v > p2) then.push(x, y, wd, h)
      }
    }
    t.fill()
    t.globalCompositeOperation = 'source-in'
    t.drawImage(s.pink, 0, 0)
    t.globalCompositeOperation = 'source-over'
    s.spreadAt = at
    s.fresh = [[now, 0.55], [then, 0.22]]
  }
  g.globalAlpha = level
  g.drawImage(s.tmp, 0, 0)
  for (const [list, a] of s.fresh) {
    if (!list.length) continue
    g.fillStyle = `rgba(${FRONT_RGB}, ${a})`
    g.beginPath()
    for (let k = 0; k < list.length; k += 4) g.rect(list[k], list[k + 1], list[k + 2], list[k + 3])
    g.fill()
  }
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
  if (f.wash) spreadOn(g, f.wash, s)
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
  if (f.wash) spreadOn(g, f.wash, s)
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

// ── the photograph, on the story's own cells ──
// A letter's glass carries what a camera catches of an LCD in the dark: the
// grid between its pixels, the moire of that grid against the sensor, and
// every pixel's three stripes, each pixel lit a little off in soft patches
// of colour (screen.css `.wl-scr-fx`, looks.js `rgbTile`). They were off on
// a screen with a story on it: they were laid at the letter's own pitch and
// the story draws its cells at another, and the two grids beat into a moire
// across the runners. Without them the story's glass was a clean drawing on
// a photograph, and the owner saw that the logo was not on the same phone as
// the letters. So the story tells its screen where its cells are, the
// pitch in CSS pixels and where the first cell's corner is in the glass,
// and the grid and the pixels up close are laid on exactly those cells
// (story.css `[data-cells]`): a stripe triple to a cell, the grid's line in
// the gap between two, each of the story's cells one pixel of the
// photograph. Measured, not assumed, as the pink is, and again at every
// size.
function onCells(el, host, s, dpr) {
  const scr = el.closest('.wl-scr')
  if (!scr) return
  const hr = host.getBoundingClientRect()
  const sr = scr.getBoundingClientRect()
  // a scale on some ancestor (a sheet arriving) scales both rects alike
  const k = hr.width ? host.clientWidth / hr.width : 1
  const px = (v) => `${Math.round(v * 1000) / 1000}px`
  scr.style.setProperty('--q-pitch', px(s.cell / dpr))
  scr.style.setProperty('--story-x', px((hr.left - sr.left) * k + s.mx / dpr))
  scr.style.setProperty('--story-y', px((hr.top - sr.top) * k + s.my / dpr))
  scr.style.setProperty('--story-lit', px((s.cell - s.gap) / dpr))
  scr.setAttribute('data-cells', '')
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
      onCells(el, host, s, dpr)
      key = null
      return true
    }
    // the story's own clock, taken round if it is told again
    const loop = story.loop || 0
    const round = (t) => (loop ? ((t % loop) + loop) % loop : t)
    const draw = (t) => {
      const u = round(t)
      const f = story.frame(Math.max(0, story.live ? u : Math.min(u, story.end)))
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
      const u = round(t)
      if (u < story.end) raf = requestAnimationFrame(tick)
      else if (story.live) timer = setTimeout(tick, LIVE_TICK)
      // a still mark waits for the next telling
      else if (loop) timer = setTimeout(tick, loop - u)
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

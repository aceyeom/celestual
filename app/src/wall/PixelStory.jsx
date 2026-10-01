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
// A story that is `live` (the mutual's mark: the film's from the moment it
// comes alive and the keepsake's all through, pixmark.js `filmStory` and
// `keepStory`) does not stop: for its `live` window, which for those two
// has no end, it is alive, a loop that changes ten times a second, and it
// is asked twenty times a second on a timer rather than sixty on the
// display's clock. It stops when the tab is hidden and starts again, on the
// right frame, when it is shown: the loop is a function of the clock, so
// nothing is lost by not drawing it.
//
// A story with a `loop` (the door's, and `revealStory`, which the mails'
// pictures are still made from) is told again from its first frame every
// `loop` ms, the clock taken round: at the display's rate while it is being
// told, and past its end a still mark waits on one timer for the next
// telling, and a live one ticks as above until it is taken back, at the
// display's rate again. The door's screen is asleep across the turn
// (Join.jsx), so the first frame of its next telling is not seen to replace
// the last of this one; `revealStory`'s last frame is its first (pixmark.js,
// `untell`). The mutual on the page is told once, and never taken round.
//
// Before the clock's nought (the film's, while its glass grows or wakes) a
// story is held on its first frame, and until the owner has a nought at all
// it is held there by `at` (Intro.jsx, `useFirstFrame` below); Film.jsx
// lays its story in only once it has one. The clock is read afresh on
// every frame, so starting it, or moving it, does not lay the canvas out
// again.
//
// ── what a cell carries ─────────────────────────────────────────────────────
// A cell is [x, y, ink, heat, alpha]. The ink is the screen's near ink, the
// same ink at half for the far side, or the story's rose (pixmark.js `ROSE`).
// `heat` is how much of the rose a cell of ink is carrying, for the glint on
// the mutual's ring; a story may name its own colour for it (`heat`, a hex),
// and the keepsake's does, so a keepsake the two of them lit in ice has a
// glint of deep ice going round its ring and not a rose one (Film.jsx
// `keepFor`, keepface.js `heatOf`, 29 September). `alpha` is how much of it is lit, for the edges of the
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
// The intro's pink is seldom pink: it is whichever of its looks the intro
// drew for this load (Intro.jsx `LOOKS`), one letter's light, or two or
// three of them melting into each other, or all five, a rainbow: out from
// where they hold each other to the corners, each colour an equal share of
// the glass or not, or laid across it at an angle (a story's `spectrum`,
// `axis` and `even`, `pinkOf`).
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
//
// ── the whole screen ────────────────────────────────────────────────────────
// Since 28 September the mutual is told over the whole screen (Film.jsx,
// pixmark.js `filmStory`), and then kept, its mark alive, in the middle of a
// phone (Keepsake.jsx, `keepStory`). Three things came with it, and none of
// them changes a story told before it: `crisp` backs the canvas at a whole
// number of device pixels to a point (`crispDpr`), which at full bleed is
// the difference between a cell and a smear; `onLayout` tells the page where
// the cells are each time the glass is laid out, so the film can pull back
// onto exactly the keepsake's cells; and a frame's `edge` carries the
// panel's first and last row as well as its columns, which the film sets
// the names by. And `paintStill` draws one frame onto a canvas with no
// screen round it, for the mutual's picture (keepshare.js).
//
// A glass the size of the screen is also the most a slow phone is asked to
// draw anywhere in the product, and a crisp story is drawn for it: at no
// more than two million device pixels (`CRISP_MAX`, so a phone at three to
// the point is drawn at two), over only the part of the glass that changed
// (`paintCrisp`), its pink a pixel to a block of four cells and painted
// when the page is idle (`spreadBlocks`), and the unlit dots laid as one
// tile (`ghostGrid`, which every story now does, to the same pixels).
//
// `dots` off leaves those unlit dots to the page: the keepsake's glass runs
// on past the mark's panel, round the two notes, and lays the dots over all
// of it itself (mutual.css `.wl-keep-body`), on the cells `onLayout` names,
// so the panel the film lands on is no rectangle of dots on a plain glass.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
// has passed on this telling (`i`), which telling it is (`n`), and how far
// into it the clock was when it last woke (`u`), and wakes only when the
// next mark or the next telling comes, not on every frame. `marks` is a
// list made once, outside the render. Held with the tab, and not run at
// all when `off` (reduced motion, a held frame). A clock with no nought yet
// (`from` null: the mutual's screen not yet on, Reveal.jsx), or before its
// nought, has passed no mark; and a clock just started or moved is read on
// the render that starts or moves it, not a render later.
function passed(marks, u) {
  let i = 0
  while (i < marks.length && u >= marks[i]) i++
  return i
}
export function useStoryClock(story, from, marks, off = false) {
  const loop = story.loop || 0
  const read = () => {
    if (from === null) return { i: 0, n: 0, u: 0, from }
    const t = performance.now() - from
    if (t < 0) return { i: 0, n: 0, u: t, from }
    const u = loop ? t % loop : t
    return { i: passed(marks, u), n: loop ? Math.floor(t / loop) : 0, u, from }
  }
  const [got, setGot] = useState(read)
  useEffect(() => {
    if (off || from === null) return undefined
    let id = 0
    const step = () => {
      const r = read()
      setGot((g) => (g.i === r.i && g.n === r.n && g.from === r.from ? g : r))
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
  return got.from === from ? got : read()
}
// the marks a held moment of a telling has passed, for a frame held still
export function heldAt(marks, u) {
  return { i: passed(marks, u), n: 0, u }
}

// ── the first frame ──
// A story's clock starts on the first frame the page can paint, and not on
// the render that made it. It used to start on the render, and everything
// that happens between the two (the page mounting round it, the story's own
// heavy start, the canvas laid out) was time the clock had already spent:
// on a slow phone the first frame anybody saw of the intro was a third of a
// second into the run. So `prime`, the story's heavy start, is done first,
// on the black; then the frame that carries all of that is let go to the
// display, and the clock's nought is the frame after it, the first one
// that starts with nothing left to do. The screen's wake (screen.css
// `wl-wake`, `wl-wake-light`, whatever each screen's own delay and length)
// is set on that same nought, so the glass comes on and the story is drawn
// on one clock. Answers the nought, null until that frame; `off` (reduced
// motion, a held frame) primes nothing and moves no animation, and still
// answers the frame. `ref` is the element the waking screen is in.
const WAKES = new Set(['wl-wake', 'wl-wake-light'])
export function useFirstFrame(ref, prime = null, off = false) {
  const [t0, setT0] = useState(null)
  useEffect(() => {
    if (!off && prime) prime()
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame((ts) => {
        raf = 0
        flushSync(() => setT0(ts))
      })
    })
    return () => { if (raf) cancelAnimationFrame(raf) }
    // once, on mount: the nought is the nought
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (t0 === null || off || !el || !el.getAnimations) return
    for (const a of el.getAnimations({ subtree: true })) {
      if (WAKES.has(a.animationName)) a.startTime = t0
    }
  }, [t0, off, ref])
  return t0
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
// behind it (or the story's own lighter step, `front`, for a panel that is
// not pink)
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

// The fill of a lit cell: its ink, carried toward the rose (or the story's
// own heat) by its heat, and lit by its alpha. Heat and alpha are counted in
// sixteenths, so a frame has a few dozen fills to set and not a few
// hundred, and each is made once.
function fillOf(s, ink, heat, alpha) {
  const h = Math.round(heat * 16)
  const a = Math.round(alpha * 16)
  const key = ink * 1000 + h * 20 + a
  let f = s.fills.get(key)
  if (f) return f
  const hot = s.heat || ROSE_RGB
  const base = ink === 3 ? hot : s.rgb
  const k = ink === 3 ? 0 : h / 16
  const c = base.map((v, i) => Math.round(v + (hot[i] - v) * k))
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

// How much an ancestor's transform has scaled the host, across and down,
// read off its box against its own size. The two are one number, the
// width's, unless they differ by more than a box's rounding does: only a
// glass pushed in out of a slot (Film.jsx) is scaled one way more than the
// other, and every other screen is measured as it always was.
function scaleOf(host, hr) {
  const kx = hr.width ? host.clientWidth / hr.width : 1
  const ky = hr.height ? host.clientHeight / hr.height : kx
  return Math.abs(ky - kx) > 0.02 * kx ? [kx, ky] : [kx, kx]
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
  // a scale on some ancestor (a sheet arriving) scales both rects alike, and
  // one that is not the same both ways (the film pushed in out of the slot,
  // Film.jsx) is undone each way on its own
  const [kx, ky] = scaleOf(host, hr)
  const cx = ((sr.left - hr.left) + hx * sr.width) * kx * dpr
  const cy = ((sr.top - hr.top) + hy * sr.height) * ky * dpr
  const rx = Math.max(1, 1.2 * sr.width * kx * dpr)
  const ry = Math.max(1, 0.95 * sr.height * ky * dpr)
  // (the backlight's ellipse, kept for a spectrum, which is lit round the
  // same hot spot block by block)
  s.lamp = { cx, cy, rx, ry }
  if (s.blocks) { blockPink(s); return }
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

// ── the pink, a block to a pixel ──
// On a glass the size of the screen (a `crisp` story) the pink is not two
// more canvases as large as the glass, laid three times a step: it is a
// canvas with one pixel for each block of the panel, the pink the panel's
// gradient has at the middle of that block, and it is laid on the glass
// scaled up whole, a block to a square of cells, with no smoothing. A block
// that has just turned is its lighter step in the same pixel. So each block
// is one pink, where the smaller glasses' blocks each hold a sliver of the
// gradient; at the film's size a block is two of its cells, and the steps
// between them are the phone's own.
function blockPink(s) {
  const bw = Math.ceil(s.pc / SPREAD)
  const bh = Math.ceil(s.pr / SPREAD)
  const px = SPREAD * s.cell
  const stops = (s.panel || PANEL).map(rgbOf)
  const { cx, cy, rx, ry } = s.lamp
  const base = new Uint8ClampedArray(bw * bh * 4)
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      const r = Math.min(1, Math.hypot((s.mx + (i + 0.5) * px - cx) / rx, (s.my + (j + 0.5) * px - cy) / ry))
      const [a, b, e] = r < 0.52 ? [0, 1, r / 0.52] : [1, 2, (r - 0.52) / 0.48]
      const k = (j * bw + i) * 4
      for (let c = 0; c < 3; c++) base[k + c] = Math.round(stops[a][c] + (stops[b][c] - stops[a][c]) * e)
      base[k + 3] = 255
    }
  }
  const cv = document.createElement('canvas')
  cv.width = bw
  cv.height = bh
  s.pink = cv
  s.pinkBase = base
  s.pinkImg = cv.getContext('2d').createImageData(bw, bh)
  s.pinkAt = ''
}
function spreadBlocks(g, w, s) {
  if (!s.pink) return
  const bw = s.pink.width
  const bh = s.pink.height
  const level = Math.max(0, Math.min(1, w.level ?? 1))
  const m = w.p == null ? null : spreadMap(s, w)
  const at = m ? `${m.key}|${w.p}|${w.p1}|${w.p2}|${w.back ? 'b' : 's'}` : 'all'
  if (s.pinkAt !== at) {
    const d = s.pinkImg.data
    const src = s.pinkBase
    const front = String(s.front || FRONT_RGB).split(',').map(Number)
    const p1 = w.p1 ?? w.p
    const p2 = w.p2 ?? p1
    for (let k = 0; k < bw * bh; k++) {
      const o = k * 4
      let lit = 1
      let a = 0
      if (m) {
        const v = m.th[k]
        if (w.back) lit = v < w.p ? 1 : 0
        else if (v > w.p) lit = 0
        else a = v > p1 ? 0.55 : v > p2 ? 0.22 : 0
      }
      for (let c = 0; c < 3; c++) d[o + c] = src[o + c] + (front[c] - src[o + c]) * a
      d[o + 3] = lit ? 255 : 0
    }
    s.pink.getContext('2d').putImageData(s.pinkImg, 0, 0)
    s.pinkAt = at
  }
  // a block to a square of cells, and the blocks at the panel's edges run on
  // to the canvas's, as `spreadOn`'s do
  const px = SPREAD * s.cell
  const x1 = s.mx + bw * px
  const y1 = s.my + bh * px
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = level
  g.imageSmoothingEnabled = false
  g.drawImage(s.pink, 0, 0, bw, bh, s.mx, s.my, bw * px, bh * px)
  if (s.mx > 0) g.drawImage(s.pink, 0, 0, 1, bh, 0, s.my, s.mx, bh * px)
  if (x1 < s.W) g.drawImage(s.pink, bw - 1, 0, 1, bh, x1, s.my, s.W - x1, bh * px)
  if (s.my > 0) g.drawImage(s.pink, 0, 0, bw, 1, s.mx, 0, bw * px, s.my)
  if (y1 < s.H) g.drawImage(s.pink, 0, bh - 1, bw, 1, s.mx, y1, bw * px, s.H - y1)
  g.restore()
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
  // one for each place a pink leaves from or goes back to, kept for the size
  const had = s.spreads && s.spreads.get(key)
  if (had) return had
  const bw = Math.ceil(s.pc / SPREAD)
  const bh = Math.ceil(s.pr / SPREAD)
  const th = new Float32Array(bw * bh)
  // and for a spectrum, the same lobes without the jitter, so the colours
  // lie in bands that follow the front and have no speckle between them
  const field = s.spectrum ? new Float32Array(bw * bh) : null
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      // the block's middle, in the story's cells
      const x = (i + 0.5) * SPREAD - s.ox
      const y = (j + 0.5) * SPREAD - s.oy
      const smooth = Math.hypot(x - w.x - 0.5, y - w.y - 0.5) + 7 * noise(x, y, 19, 1) + 2.6 * noise(x, y, 7, 2)
      const v = smooth + 3.4 * (hash3(i, j, 3) - 0.5)
      th[j * bw + i] = v
      if (field) field[j * bw + i] = smooth
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  for (let k = 0; k < th.length; k++) th[k] = (th[k] - lo) / (hi - lo || 1)
  if (field) {
    let a = Infinity
    let b = -Infinity
    for (const v of field) { a = Math.min(a, v); b = Math.max(b, v) }
    for (let k = 0; k < field.length; k++) field[k] = (field[k] - a) / (b - a || 1)
  }
  const out = { key, th, bw, bh, field }
  s.spreads = s.spreads || new Map()
  s.spreads.set(key, out)
  return out
}

// ── a look laid across the glass ──
// A spectrum with an `axis` is laid by where a block is along it and not by
// how far it is from them: the angle read as CSS reads a `linear-gradient`'s
// (0 to the top, 90 to the right), on the story's own cells, with a slow
// noise in it so the edge between two colours has the stain's lobes in it
// and is never a ruled line. Worked out once for a size, beside the map it
// goes with.
function axisField(s, m) {
  if (m.axisField) return m.axisField
  const r = (s.axis * Math.PI) / 180
  const dx = Math.sin(r)
  const dy = -Math.cos(r)
  const out = new Float32Array(m.bw * m.bh)
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j < m.bh; j++) {
    for (let i = 0; i < m.bw; i++) {
      const x = (i + 0.5) * SPREAD - s.ox
      const y = (j + 0.5) * SPREAD - s.oy
      out[j * m.bw + i] = x * dx + y * dy + 4 * noise(x, y, 19, 5)
    }
  }
  // (the ends read back as they were kept, so nothing is a hair under the
  // first colour or over the last)
  for (const v of out) { if (v < lo) lo = v; if (v > hi) hi = v }
  for (let k = 0; k < out.length; k++) out[k] = Math.min(1, Math.max(0, (out[k] - lo) / (hi - lo || 1)))
  m.axisField = out
  return out
}
// ── every colour a fair share ──
// Laid out from them by distance, a spectrum's first colour is a sliver
// round them and its last a sliver in the corners, and the middle ones take
// the glass. `even` lays it by rank instead: the blocks in the order the
// front meets them, each colour the next fifth of them (or third, or half),
// so the lead is still where they hold each other and the last still in the
// corners, and every colour between has as much of the glass as they do.
function evenField(m) {
  if (m.evenField) return m.evenField
  const f = m.field
  const idx = Array.from(f.keys()).sort((a, b) => f[a] - f[b])
  const out = new Float32Array(f.length)
  const n = idx.length - 1 || 1
  for (let r = 0; r < idx.length; r++) out[idx[r]] = r / n
  m.evenField = out
  return out
}

// ── two colours or more ──
// A story whose pink is a `spectrum` is lit in each of its panels in turn,
// the first where the pink leaves from and the last in the far corners,
// each melting into the next along the lobes the front grows in (`field`),
// so the colour a block turns is the one the front has reached, and the
// pink goes round the wheel as it goes out; or, with an `axis`, the first on
// one side of the glass and the last on the other (`axisField`), and, when
// `even`, each of them an equal share (`evenField`). Each block is lit as a
// panel is, its hi, mid and lo round the backlight's hot spot, and the
// blocks are laid down smoothed, so the colours are a light and not a
// mosaic. Made once for a size and a place it leaves from, with its lighter
// step beside it (`lightOf`); any other story's pink is the one panel
// (`pinkPanel`).
function pinkOf(s, w) {
  if (!s.spectrum) return s.pink
  const m = spreadMap(s, w)
  if (m.pink) return m.pink
  const { bw, bh } = m
  const field = s.axis != null ? axisField(s, m) : s.even ? evenField(m) : m.field
  const stops = s.spectrum.map((pan) => pan.map(rgbOf))
  const n = stops.length - 1
  const small = document.createElement('canvas')
  small.width = bw
  small.height = bh
  const img = small.getContext('2d').createImageData(bw, bh)
  const px = SPREAD * s.cell
  const { cx, cy, rx, ry } = s.lamp
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      const k = j * bw + i
      const u = Math.max(0, Math.min(1, field[k])) * n
      const a = Math.min(n, Math.floor(u))
      const b = Math.min(n, a + 1)
      const f = u - a
      // how far out from the hot spot, as the panel's gradient measures it:
      // its hi there, its mid at 0.52 and its lo at the edge
      const r = Math.min(1, Math.hypot((s.mx + (i + 0.5) * px - cx) / rx, (s.my + (j + 0.5) * px - cy) / ry))
      const [c0, c1, e] = r < 0.52 ? [0, 1, r / 0.52] : [1, 2, (r - 0.52) / 0.48]
      for (let ch = 0; ch < 3; ch++) {
        const A = stops[a][c0][ch] + (stops[a][c1][ch] - stops[a][c0][ch]) * e
        const B = stops[b][c0][ch] + (stops[b][c1][ch] - stops[b][c0][ch]) * e
        img.data[k * 4 + ch] = Math.round(A + (B - A) * f)
      }
      img.data[k * 4 + 3] = 255
    }
  }
  small.getContext('2d').putImageData(img, 0, 0)
  const cv = document.createElement('canvas')
  cv.width = s.W
  cv.height = s.H
  const g = cv.getContext('2d')
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(small, 0, 0, s.W, s.H)
  m.pink = cv
  m.light = lightOf(cv, s)
  return cv
}
// A block of a spectrum that has just turned is its own colour a step
// lighter: the colour screened on itself, at half, since a pale colour
// screened on itself is nearly white. Made here, once, beside the pink, so a
// frame lays it through the fresh blocks as a plain picture at their
// strength (`spreadOn`) and does not screen the whole glass onto itself
// twice on every frame the front is moving, which a slow phone felt.
function lightOf(pink, s) {
  const cv = document.createElement('canvas')
  cv.width = s.W
  cv.height = s.H
  const g = cv.getContext('2d')
  g.drawImage(pink, 0, 0)
  g.globalCompositeOperation = 'screen'
  g.globalAlpha = 0.5
  g.drawImage(pink, 0, 0)
  return cv
}

// The pink through the blocks that have turned; and over the ones that
// turned on this step, and the step before, a lighter pink, less on the
// second, so a block is seen to come on and settle the way a cell of an LCD
// does, and the front is a ragged line of blocks just lit rather than an
// edge. `level` takes the whole of it down (the mutual's pink going out
// onto the panel's own, and coming back over it).
//
// A wash that is going `back` (the mutual's telling taken back, pixmark.js
// `recedeFrom`) is the same blocks the other way: the pink through the ones
// the front has not yet left, farthest first, and over the ones it left on
// this step and the step before a little of the pink still, less on the
// second, the way an LCD's cell is slow to let its light go.
function spreadOn(g, w, s) {
  if (!s.pink) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  const level = Math.max(0, Math.min(1, w.level ?? 1))
  const pink = pinkOf(s, w)
  if (w.p == null) {
    g.globalAlpha = level
    g.drawImage(pink, 0, 0)
    g.globalAlpha = 1
    return
  }
  const m = spreadMap(s, w)
  // The pink changes twenty five times a second and the two of them under
  // it sixty, breathing: what a step of the pink is, is worked out on its
  // step and laid again as it is on the frames between.
  const back = !!w.back
  const at = `${m.key}|${w.p}|${back ? 'b' : 's'}`
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
        const x = X(i)
        const wd = X(i + 1) - x
        if (back) {
          // going: pink short of the front, and a little of it left on the
          // blocks the front has just passed
          if (v < w.p) t.rect(x, y, wd, h)
          else if (v < p1) now.push(x, y, wd, h)
          else if (v < p2) then.push(x, y, wd, h)
          continue
        }
        if (v > w.p) continue
        t.rect(x, y, wd, h)
        if (v > p1) now.push(x, y, wd, h)
        else if (v > p2) then.push(x, y, wd, h)
      }
    }
    t.fill()
    t.globalCompositeOperation = 'source-in'
    t.drawImage(pink, 0, 0)
    t.globalCompositeOperation = 'source-over'
    s.spreadAt = at
    s.fresh = back ? [] : [[now, 0.55], [then, 0.22]]
    s.ghosts = back ? [[now, 0.4], [then, 0.15]] : []
  }
  g.globalAlpha = level
  g.drawImage(s.tmp, 0, 0)
  for (const [list, a] of s.fresh) {
    if (!list.length) continue
    g.beginPath()
    for (let k = 0; k < list.length; k += 4) g.rect(list[k], list[k + 1], list[k + 2], list[k + 3])
    if (s.front) {
      g.fillStyle = `rgba(${s.front}, ${a})`
      g.fill()
      continue
    }
    // a spectrum has no one lighter step: each block is its own colour a
    // step lighter, made once beside the pink (`lightOf`), laid over it at
    // the step's strength
    g.save()
    g.clip()
    g.globalAlpha = a * level
    g.drawImage(m.light || pink, 0, 0)
    g.restore()
  }
  // the pink still in the blocks just left, the panel's own pink through them
  for (const [list, a] of s.ghosts) {
    if (!list.length) continue
    g.save()
    g.beginPath()
    for (let k = 0; k < list.length; k += 4) g.rect(list[k], list[k + 1], list[k + 2], list[k + 3])
    g.clip()
    g.globalAlpha = a * level
    g.drawImage(pink, 0, 0)
    g.restore()
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
// The dots are one dot, a cell apart, so they are laid as a tile of one cell
// repeated over the panel: a path of every dot was twenty thousand of them
// at the size of the screen, a tenth of a second on a slow phone before the
// mutual's film could show its first frame, for the same pixels.
function ghostGrid(s) {
  const cv = document.createElement('canvas')
  cv.width = s.W
  cv.height = s.H
  const g = cv.getContext('2d')
  const d = s.cell - s.gap
  const tile = document.createElement('canvas')
  tile.width = s.cell
  tile.height = s.cell
  const tg = tile.getContext('2d')
  if (tg) {
    tg.fillStyle = s.ghost
    tg.fillRect(0, 0, d, d)
  }
  const pat = tg && g.createPattern(tile, 'repeat')
  if (pat) {
    g.translate(s.mx, s.my)
    g.fillStyle = pat
    g.fillRect(0, 0, s.pc * s.cell, s.pr * s.cell)
    g.setTransform(1, 0, 0, 1, 0, 0)
  } else {
    g.fillStyle = s.ghost
    g.beginPath()
    for (let y = 0; y < s.pr; y++) for (let x = 0; x < s.pc; x++) g.rect(s.mx + x * s.cell, s.my + y * s.cell, d, d)
    g.fill()
  }
  s.grid = cv
}
function paintFine(g, f, s, region = null) {
  const { pc, pr, ox, oy, cell, gap, W, H, mx, my } = s
  g.setTransform(1, 0, 0, 1, 0, 0)
  // (only the part of the glass that changed, for a crisp story: `paintCrisp`)
  if (region) {
    g.save()
    g.beginPath()
    g.rect(region[0], region[1], region[2], region[3])
    g.clip()
    g.clearRect(region[0], region[1], region[2], region[3])
  } else g.clearRect(0, 0, W, H)
  if (f.ink && f.ink !== s.inkNow) {
    s.inkNow = f.ink
    s.rgb = rgbOf(f.ink)
    s.ghost = faint(s.rgb)
    s.fills.clear()
  }
  // (the unlit dots are a few per cent of the ink, and are not drawn again
  // for each step of the ink toward the rose's: at that strength the two
  // inks are one grey)
  // (and none at all where the page lays them itself, `dots`)
  const dots = s.dots !== false
  if (dots && !s.grid) ghostGrid(s)
  if (f.wash && s.blocks) spreadBlocks(g, f.wash, s)
  else if (f.wash) spreadOn(g, f.wash, s)
  if (f.glow) for (const gl of [].concat(f.glow)) glowOn(g, gl, s)
  if (dots) g.drawImage(s.grid, 0, 0)
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
  if (region) g.restore()
}

// ── only what changed ──
// A glass the size of the screen (a `crisp` story, the mutual's film) is
// most of it the panel's unlit dots and, once it has turned, its pink, and
// nothing there changes from one frame to the next while the two of them
// run in the middle of it: clearing and laying the whole of it sixty times
// a second was most of what a slow phone spent on each frame. So a frame
// is drawn over the part of the glass its lit cells and its light cover,
// and the part the last frame's covered, a cell round both, and the rest
// is left as it is; unless the pink or the ink has changed since the last,
// which is the whole glass again. What is drawn is what `paintFine` would
// draw there, so the glass is the same glass, frame for frame.
function washKeyOf(w) {
  if (!w) return ''
  if (w.p == null) return `P${w.level ?? 1}`
  return `${w.x}|${w.y}|${w.p}|${w.p1}|${w.p2}|${w.back ? 'b' : 's'}`
}
function regionOf(f, s) {
  const { ox, oy, cell, mx, my, W, H } = s
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const c of f.cells) {
    if (c[0] < x0) x0 = c[0]
    if (c[0] > x1) x1 = c[0]
    if (c[1] < y0) y0 = c[1]
    if (c[1] > y1) y1 = c[1]
  }
  let r = x0 <= x1
    ? [mx + Math.floor((x0 + ox - 1) * cell), my + Math.floor((y0 + oy - 1) * cell), mx + Math.ceil((x1 + ox + 2) * cell), my + Math.ceil((y1 + oy + 2) * cell)]
    : null
  for (const gl of [].concat(f.glow || [])) {
    const x = mx + (gl.x + ox + 0.5) * cell
    const y = my + (gl.y + oy + 0.5) * cell
    const q = Math.max(cell, gl.r * cell * 1.3) + cell
    const b = [Math.floor(x - q), Math.floor(y - q), Math.ceil(x + q), Math.ceil(y + q)]
    r = r ? [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])] : b
  }
  if (!r) return null
  return [Math.max(0, r[0]), Math.max(0, r[1]), Math.min(W, r[2]), Math.min(H, r[3])]
}
function paintCrisp(g, f, s) {
  if (f.wash && !s.pink && s.later) s.later()
  const r = regionOf(f, s)
  const wash = washKeyOf(f.wash)
  const last = s.last
  const whole = !last || wash !== last.wash || (f.ink && f.ink !== s.inkNow)
  s.last = { r, wash }
  let region = null
  if (!whole) {
    const a = r || last.r
    const b = last.r || r
    if (!a) return
    const u = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
    region = [u[0], u[1], u[2] - u[0], u[3] - u[1]]
  }
  paintFine(g, f, s, region)
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
  // a scale on some ancestor (a sheet arriving) scales both rects alike, and
  // one that is not the same both ways is undone each way (`pinkPanel`)
  const [kx, ky] = scaleOf(host, hr)
  const px = (v) => `${Math.round(v * 1000) / 1000}px`
  scr.style.setProperty('--q-pitch', px(s.cell / dpr))
  scr.style.setProperty('--story-x', px((hr.left - sr.left) * kx + s.mx / dpr))
  scr.style.setProperty('--story-y', px((hr.top - sr.top) * ky + s.my / dpr))
  scr.style.setProperty('--story-lit', px((s.cell - s.gap) / dpr))
  scr.setAttribute('data-cells', '')
}

// how often a live story is asked for its frame, while it is alive
const LIVE_TICK = 50

// ── a whole number of device pixels to a cell, on any screen ──
// A story's canvas is backed at the device's own pixels up to two to a
// point, whatever the device's are, and a cell is a whole number of those.
// A `crisp` story (the mutual's film, Film.jsx, a glass the size of the
// screen) is backed at a whole number of device pixels to a point, the most
// the device has up to three, while the canvas stays under two million of
// them, and what is left of the device's own is an upscale the canvas makes
// without smoothing (story.css `image-rendering`). It was to be four and a
// half million, which on a phone at three to the point is the film at its
// own pixels; measured (scripts/perf-reveal.mjs), that glass was a third of
// a slow phone's frames dropped while the two of them ran and the pink
// spread, and backed at two to the point, as every story on the wall is,
// a seventh (and with the rest of the header's `the whole screen`, about a
// tenth). A desk and a phone at two keep every pixel whole.
const CRISP_MAX = 2e6
export function crispDpr(w, h) {
  let d = Math.min(3, Math.max(1, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1)))
  while (d > 1 && w * d * h * d > CRISP_MAX) d--
  return d
}

// ── the story's glass, laid out ──
// Everything `size` works out, for a page that has to put something where a
// cell of the story is (the film pulling back onto the keepsake's mark,
// Film.jsx): the cell and its gap in device pixels, the device pixels to a
// point, the panel's cells, where the story's grid is in it, and the part of
// a cell left over at its edges.
const layoutOf = (s, dpr) => ({ cell: s.cell, gap: s.gap, dpr, pc: s.pc, pr: s.pr, ox: s.ox, oy: s.oy, mx: s.mx, my: s.my })

// ── a frame, still, on a canvas of its own ──
// One frame of a story drawn once onto a canvas the caller has sized, with
// no screen round it, no pink and nothing to measure: the mark on the
// mutual's picture (keepshare.js). The cell is the largest whole number of
// the canvas's pixels that fits the story's grid, the panel's unlit dots run
// edge to edge round it, and it is drawn the fine way (`paintFine`), its
// light behind the mark included. `dots` off leaves the dots to the caller,
// as the keepsake's glass does (the picture lays them over the whole of its
// glass, on these cells).
export function paintStill(canvas, frame, { cols, rows, ink = '#131313', dots = true, heat = null } = {}) {
  const g = canvas && canvas.getContext('2d')
  if (!g) return null
  const W = canvas.width
  const H = canvas.height
  const cell = Math.max(1, Math.floor(Math.min(W / cols, H / rows)))
  const pc = Math.max(cols, Math.floor(W / cell))
  const pr = Math.max(rows, Math.floor(H / cell))
  const rgb = rgbOf(ink)
  const s = {
    pc, pr, ox: (pc - cols) >> 1, oy: (pr - rows) >> 1, cell,
    gap: cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : cell >= 3 ? 1 : 0,
    ink, rgb, fills: new Map(), W, H, mx: (W - pc * cell) >> 1, my: (H - pr * cell) >> 1, dots,
    heat: heat ? rgbOf(heat) : null,
  }
  s.ghost = faint(rgb)
  paintFine(g, frame, s)
  return layoutOf(s, 1)
}

export default function PixelStory({ story, at = null, from = null, mode = 'pixel', className = '', crisp = false, dots = true, onLayout = null }) {
  const box = useRef(null)
  const cv = useRef(null)
  // told where the glass is laid out, whenever it is laid out again
  const laidOut = useRef(onLayout)
  laidOut.current = onLayout
  // when the clock started: the owner's, or this mount's
  const mounted = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  // The clock, read afresh on every frame: a clock that starts (Intro.jsx
  // holds the empty glass until the screen can paint) or is moved (a tap
  // that lands a telling) goes on drawing on the same canvas, and does not
  // lay it out again.
  const clock = useRef({ at, from })
  const kick = useRef(null)
  useEffect(() => {
    clock.current = { at, from }
    if (kick.current) kick.current()
  }, [at, from])

  useEffect(() => {
    const host = box.current
    const el = cv.current
    if (!host || !el || !story) return undefined
    const g = el.getContext('2d')
    if (!g) return undefined
    let raf = 0
    let timer = 0
    let key = null
    let last = null
    let s = null
    let laid = ''
    const size = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return false
      laid = `${w}x${h}x${window.devicePixelRatio}`
      const dpr = crisp ? crispDpr(w, h) : Math.min(2, window.devicePixelRatio || 1)
      const cell = Math.max(1, Math.floor(Math.min((w * dpr) / story.cols, (h * dpr) / story.rows)))
      const cs = getComputedStyle(el)
      const pc = Math.max(story.cols, Math.floor((w * dpr) / cell))
      const pr = Math.max(story.rows, Math.floor((h * dpr) / cell))
      const inkHex = cs.getPropertyValue('--s-ink').trim() || '#131313'
      s = {
        pc, pr, ox: (pc - story.cols) >> 1, oy: (pr - story.rows) >> 1, cell, mode,
        gap: cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : cell >= 3 ? 1 : 0,
        ink: inkHex, rgb: rgbOf(inkHex), fills: new Map(), panel: story.panel,
        heat: story.heat ? rgbOf(story.heat) : null,
        spectrum: story.spectrum || null, front: story.spectrum ? null : story.front || FRONT_RGB,
        // (a spectrum laid across the glass, or each colour an equal share)
        axis: story.axis ?? null, even: !!story.even,
        face: cs.fontFamily || 'monospace', fine: !!story.fine && mode !== 'ascii', dots,
        // a crisp story's pink a block to a pixel (`spreadBlocks`), unless it is
        // two colours or more, which only the intro's is, and it is never crisp
        blocks: crisp && !story.spectrum,
      }
      s.ghost = faint(s.rgb)
      // the first and last column of the panel, on the story's own grid, for
      // a story that sets its runners by the glass (pixmark.js `shiftFor`),
      // and its first and last row, for one that sets its names by it
      // (`filmStory`)
      s.edge = { l: -s.ox, r: pc - s.ox - 1, t: -s.oy, b: pr - s.oy - 1 }
      s.W = Math.round(w * dpr)
      s.H = Math.round(h * dpr)
      s.mx = (s.W - pc * cell) >> 1
      s.my = (s.H - pr * cell) >> 1
      el.width = s.W
      el.height = s.H
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      // A crisp story's pink is painted when the page is next idle and not
      // with the glass: at the size of the screen it is two canvases as
      // large as the glass, the heaviest thing its first frame would carry,
      // and the pink is seconds away. A frame that wants it sooner paints it
      // there and then (`paintCrisp`).
      if (crisp) {
        const mine = s
        mine.later = () => { if (!mine.pink) pinkPanel(mine, host, el, dpr) }
        if (typeof requestIdleCallback === 'function') requestIdleCallback(() => mine.later(), { timeout: 1500 })
        else setTimeout(() => mine.later(), 600)
      } else pinkPanel(s, host, el, dpr)
      // a spectrum is painted now, from where the pink will leave, while the
      // glass is still dark, and not on the frame the pink starts: its
      // field, its colours and its lighter step, all of it
      // (asked of the story's wash alone where it answers it, so a story
      // that works its frames out as it goes is not asked to work out all
      // of them up to the pink before its first, scenes/kit.js `tale`)
      if (s.spectrum && story.times) {
        const w = story.washAt ? story.washAt(story.times.glow) : story.frame(story.times.glow, s.edge).wash
        if (w) pinkOf(s, w)
      }
      onCells(el, host, s, dpr)
      key = null
      if (laidOut.current) laidOut.current(layoutOf(s, dpr))
      return true
    }
    // The story's own clock, taken round if it is told again. Before its
    // nought (the mutual's first telling, while its screen comes on) it is
    // held on its first frame.
    const loop = story.loop || 0
    const round = (t) => (t < 0 ? 0 : loop ? t % loop : t)
    const draw = (t) => {
      const u = round(t)
      const f = story.frame(story.live ? u : Math.min(u, story.end), s ? s.edge : null)
      last = f
      if (!s || f.key === key) return
      key = f.key
      if (s.fine && crisp) paintCrisp(g, f, s)
      else if (s.fine) paintFine(g, f, s)
      else paint(g, f, s)
    }
    const now = () => {
      const c = clock.current
      return c.at != null ? c.at : performance.now() - (c.from ?? mounted.current)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      raf = 0
      timer = 0
    }
    // At the display's rate while it is told, and taken back; ten times a
    // second while it is alive (`live`, the mutual's window of it); and a
    // still mark past its end waits on one timer for its next telling.
    const tick = () => {
      raf = 0
      timer = 0
      const t = now()
      draw(t)
      if (clock.current.at != null || document.hidden) return
      const u = round(t)
      const alive = story.live && u >= story.live[0] && u < story.live[1]
      if (alive) timer = setTimeout(tick, LIVE_TICK)
      else if (u < story.end || story.live) raf = requestAnimationFrame(tick)
      else if (loop) timer = setTimeout(tick, loop - u)
    }
    kick.current = () => {
      stop()
      tick()
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
    // the frame already on it (and the size it was laid out at, which an
    // observer reports on its first frame, is not a new one)
    const resized = () => `${host.clientWidth}x${host.clientHeight}x${window.devicePixelRatio}` !== laid
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { if (resized() && size() && last) { key = null; draw(now()) } })
      : null
    if (ro) ro.observe(host)
    // the typed version waits for its face, and is drawn again in it
    let off = false
    if (mode === 'ascii' && document.fonts && document.fonts.load) {
      document.fonts.load(`400 16px ${s ? s.face : 'monospace'}`).then(() => { if (!off && last) { key = null; draw(now()) } }).catch(() => {})
    }
    return () => {
      off = true
      kick.current = null
      stop()
      document.removeEventListener('visibilitychange', onVis)
      if (ro) ro.disconnect()
    }
  }, [story, mode, crisp, dots])

  return (
    <div className={`wl-story ${className}`} ref={box} aria-hidden="true">
      <canvas ref={cv} className="wl-story-cv" />
    </div>
  )
}

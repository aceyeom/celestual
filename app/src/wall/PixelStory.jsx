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
// answer is a different frame. The run changes twelve times a second and the
// mark thirty times while it forms; a screen standing still is not drawn at
// all, and the loop stops at the last frame. A screen's glass is blurred a
// third of a pixel and tilted (screen.css `.wl-scr`), so every drawing is a
// composite through a filter, and a canvas drawn sixty times a second under
// one is what this is built not to be.
//
// ── the two ways of drawing it ──────────────────────────────────────────────
// `pixel` is the product: square cells in the screen's ink. `ascii` sets each
// lit cell as a character of the phone's face instead, heavier where a cell
// is deep inside a shape and lighter at its edge, so the owner can see the
// same story typed. It is reached in development only (Intro.jsx `?intro=`).
//
// `at` holds the clock on one moment (the last frame under reduced motion, or
// any frame for the screenshot loop). `from` is when the clock started, so a
// story can be started by whoever owns the beats around it.

import { useEffect, useRef } from 'react'
import { markCells, MARK_CUT } from './pixmark.js'
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

// The unlit dots: the screen's ink at a few per cent. A hex the skin wrote
// (looks.js `skinOf`), and anything else is left as a faint black.
function faint(ink, a = 0.07) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(ink)
  if (!m) return `rgba(0, 0, 0, ${a})`
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`
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
  // one ink per cell, the near ink winning, so a cell two pixels pass
  // through on the same frame is drawn once
  const grid = new Uint8Array(pc * pr)
  for (const [x, y, ink] of f.cells) {
    const px = x + ox
    const py = y + oy
    if (px < 0 || py < 0 || px >= pc || py >= pr) continue
    const i = py * pc + px
    if (!grid[i] || ink < grid[i]) grid[i] = ink
  }
  const d = cell - gap
  const at = (i) => [(i % pc) * cell, Math.floor(i / pc) * cell]
  if (f.invert) {
    // the frame they touch: the whole panel in ink, to its edges, and the two
    // of them cut out of it, so the light behind the glass is what draws them
    g.fillStyle = s.ink
    g.fillRect(0, 0, W, H)
    g.setTransform(1, 0, 0, 1, mx, my)
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) continue
      const [x, y] = at(i)
      g.fillRect(x, y, cell, cell)
    }
    g.globalCompositeOperation = 'source-over'
    return
  }
  g.setTransform(1, 0, 0, 1, mx, my)
  if (s.mode === 'ascii') {
    g.fillStyle = s.ink
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `400 ${Math.round(cell * 1.7)}px ${s.face}`
    const lit = (x, y) => x >= 0 && y >= 0 && x < pc && y < pr && grid[y * pc + x]
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) continue
      const x = i % pc
      const y = Math.floor(i / pc)
      let n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && lit(x + dx, y + dy)) n++
      const k = grid[i] === 2 ? (n >= 4 ? 2 : 1) : n >= 8 ? 5 : n >= 6 ? 4 : n >= 4 ? 3 : 2
      g.globalAlpha = grid[i] === 2 ? 0.55 : 1
      g.fillText(RAMP[k], x * cell + cell / 2, y * cell + cell / 2)
    }
    g.globalAlpha = 1
    return
  }
  // the panel's own dots, unlit
  g.fillStyle = s.ghost
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) continue
    const [x, y] = at(i)
    g.fillRect(x, y, d, d)
  }
  // and the lit ones: the far ink is the same ink, thinner
  g.fillStyle = s.ink
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue
    const [x, y] = at(i)
    g.globalAlpha = grid[i] === 2 ? 0.5 : 1
    g.fillRect(x, y, d, d)
  }
  g.globalAlpha = 1
}

export default function PixelStory({ story, at = null, from = null, mode = 'pixel', className = '' }) {
  const box = useRef(null)
  const cv = useRef(null)
  // when the clock started: the owner's, or this mount's
  const t0 = useRef(from ?? (typeof performance !== 'undefined' ? performance.now() : 0))

  useEffect(() => {
    const host = box.current
    const el = cv.current
    if (!host || !el || !story) return undefined
    const g = el.getContext('2d')
    if (!g) return undefined
    let raf = 0
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
      s = {
        pc, pr, ox: (pc - story.cols) >> 1, oy: (pr - story.rows) >> 1, cell, mode,
        gap: cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : cell >= 3 ? 1 : 0,
        ink: cs.getPropertyValue('--s-ink').trim() || '#131313',
        face: cs.fontFamily || 'monospace',
      }
      s.ghost = faint(s.ink)
      s.W = Math.round(w * dpr)
      s.H = Math.round(h * dpr)
      s.mx = (s.W - pc * cell) >> 1
      s.my = (s.H - pr * cell) >> 1
      el.width = s.W
      el.height = s.H
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      key = null
      return true
    }
    const draw = (t) => {
      const f = story.frame(Math.max(0, Math.min(t, story.end)))
      last = f
      if (!s || f.key === key) return
      key = f.key
      paint(g, f, s)
    }
    const now = () => (at != null ? at : performance.now() - t0.current)
    const tick = () => {
      const t = now()
      draw(t)
      if (at == null && t < story.end) raf = requestAnimationFrame(tick)
      else raf = 0
    }
    size()
    tick()
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
    return () => { off = true; cancelAnimationFrame(raf); if (ro) ro.disconnect() }
  }, [story, at, mode])

  return (
    <div className={`wl-story ${className}`} ref={box} aria-hidden="true">
      <canvas ref={cv} className="wl-story-cv" />
    </div>
  )
}

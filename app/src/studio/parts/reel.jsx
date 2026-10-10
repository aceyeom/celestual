// ── the reel ────────────────────────────────────────────────────────────────
//
// Thirty five seconds at 96 beats a minute (reel-time.js), drawn from `t` and
// nothing else, so scripts/studio-film.mjs can photograph it a frame at a
// time, cut to its own song (scripts/studio-score.mjs). One story, and one
// world for it: the phone's own screen. Every word is set in the phone's
// face, cut into its cells, as the glass's own words are; once the note is
// sent the frame is a screen too, a dark panel of cells, and a note on it is
// the envelope the phone draws.
//
//   0      lin's note on the glass: `i love`, a hesitation, `d`
//   3.75   one shot: back from the glass along the wall, a letter read in
//          passing, up the hall's height to a stop. `a wall of the ones /
//          you never told.` lin's letter comes away to the camera
//  10      `or send it / privately.` the letter's own pixels go into its
//          envelope; sealed, it lights; the phone goes out behind it to a
//          line and a point; the envelope comes at the lens
//  12.5    through the lens into the dark, a screen's panel, its light
//          opening out in it; the envelope goes away from us to wait.
//          `they only read it if / they send you one.`
//  15      `every mutual is / revealed on / sat 9:00 pm`, the last line a
//          clock that runs through the week; on the thursday a note comes in
//          from somewhere; at nine the camera leans in, and the two find
//          each other, wait, and touch
//  20      on the touch the two lights go out together from where the
//          envelopes touched, lin's ice and kai's amber winding into each
//          other over the whole panel; out of them, warped by them, comes
//          lin's letter, at us; it turns over, and on its other side is
//          kai's, to lin, read for the first time. `it's mutual. / you both
//          find out.` kai's melts back into the light, and its light goes
//          out with the rest
//  25      the ones that never meet go out, each as a screen does, their
//          light going in. `if it isn't, / nobody / ever knows.`
//  27.5    `do they still / think about / you?`, a low light rising under
//          it, and left there
//  31.25   all of the light drawn in to the name's star, the name lit a
//          cell at a time from it, and the address
//
// Each scene sets its words its own way (`WORDS`), all on one grid, the
// words' cells, that the panel, the notes on it and the name are on too,
// and everything clear of the platform's own buttons and captions; a phone
// is one size in one place. The wall is a sheet of the product's own
// screens drawn in WebGL (wall-gl.js); the letter is the product's own
// composer (note-screen.jsx), and in the reveal its two sides as they were
// photographed, drawn in WebGL so the light can move it (reel-card.js); the
// name is drawn a cell at a time (brand.js); the words are the phone's face
// (pixtype.js); and from the lens on, the dark is a screen's panel with
// light spreading in it as ink does in water (reel-aura.js), drawn in the
// panel's own cells over a fluid solved on the graphics card whose drift is
// its stars (panel-fluid.js, PanelGL below).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Board, useHold, skinVars, hexRgb, mix, Lockup, LOCKUP, MARK } from '../kit.jsx'
import { glyphPath, skinOf } from '../../wall/looks.js'
import { cellsOf, wordCells } from '../../wall/brand.js'
import { typeCells } from '../../wall/pixtype.js'
import { MS, A, B, S, typedA, typedUrl, URL, wakeOf } from './reel-time.js'
import { WallGL, wallOf, cameraOf, boxOnto, v3, UNIT } from './wall-gl.js'
import { cellTint, cellOf } from './wall-letters.js'
import { NoteScreen, PW } from './note-screen.jsx'
import { PanelFluid, linear } from './panel-fluid.js'
import { makeAura } from './reel-aura.js'
import { LetterGL, W as CARD_W } from './reel-card.js'
import atlasUrl from '../assets/wall-atlas.jpg'
import faceLinUrl from '../assets/reel-face-lin.jpg'
import faceKaiUrl from '../assets/reel-face-kai.jpg'
import seaUrl from '../assets/reel-photo-sea.jpg'
import shoreUrl from '../assets/reel-photo-shore.jpg'
import './reel.css'

export { MS }

gsap.registerPlugin(CustomEase)

// ── the curves ──────────────────────────────────────────────────────────────
CustomEase.create('rl.glide', 'M0,0 C0.45,0 0.2,1 1,1')

const EASES = new Map()
export const easeOf = (name) => {
  if (!EASES.has(name)) EASES.set(name, gsap.parseEase(name || 'power2.inOut'))
  return EASES.get(name)
}
// [[ms, value], [ms, value, ease], ...], held outside its ends
export function at(track, t) {
  if (t <= track[0][0]) return track[0][1]
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, e] = track[i]
    if (t <= t1) {
      const [t0, v0] = track[i - 1]
      return v0 + (v1 - v0) * easeOf(e)((t - t0) / Math.max(1, t1 - t0))
    }
  }
  return track[track.length - 1][1]
}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const u = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const smooth01 = (k) => k * k * (3 - 2 * k)
const rnd = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
// a hand's unsteadiness: a few slow waves that never quite repeat
const shake = (t, seed) => Math.sin(t / 1310 + seed) * 0.55 + Math.sin(t / 731 + seed * 2.3) * 0.3 + Math.sin(t / 377 + seed * 4.1) * 0.15
// the camera on a phone held to it, as the hall's is: a slow drift of a
// pixel or two and a breath of roll. The words are laid over the picture,
// as a film's titles are, and keep still
const Held = ({ t, children }) => (
  <div className="rl-cam rl-held" style={{ transform: `translate(${(shake(t, 21) * 1.6).toFixed(2)}px, ${(shake(t, 27) * 1.9).toFixed(2)}px) rotate(${(shake(t, 33) * 0.1).toFixed(3)}deg)` }}>
    {children}
  </div>
)

// A screen coming on: its backlight up in a few frames, the way an LCD's
// does, never a strobe
export function on(t, from, ms = 70) {
  const k = clamp((t - from) / ms)
  return k * k * (3 - 2 * k)
}
// a colour at another strength, whatever it is written as
const tone = (col, a) => {
  const m = /rgba?\(([^)]+)\)/.exec(col)
  if (m) { const [r, g, b] = m[1].split(',').map((x) => parseFloat(x)); return `rgba(${r},${g},${b},${a})` }
  const [r, g, b] = hexRgb(col)
  return `rgba(${r},${g},${b},${a})`
}

// ── the layout ──────────────────────────────────────────────────────────────
// The words: the phone's face, lowercase, each scene's set its own way
// (`WORDS`, below), all of them on one grid and clear of the platform's
// buttons on the right and its captions at the foot. The objects: a phone,
// always this wide and always here.
export const X0 = 80
export const Y0 = 236
// a cell of the words, one pixel of the phone's face seven of ours: the
// longest line, `if they send you one.`, a hand short of the margin
export const C = 7
const LINE = 16 * C
export const lineAt = (n) => Y0 + n * LINE
const OBJ = { x: 540, y: 1090, w: 640 }
const OBJ_S = OBJ.w / PW
const CHALK = '#F4F1EA'
// the panel's grid is the words' grid: a cell's corner is (GX, GY) and
// whole cells from it, so the margin and the band's top are on it
const GX = X0 % C
const GY = Y0 % C
const onGrid = (i, j) => [GX + i * C, GY + j * C]

// ── the words, in cells ─────────────────────────────────────────────────────
// A line in the phone's own face (Jersey 10 at its own pitch, a pixel of its
// grid a cell; pixtype.js), each cell knowing the word, or with `unit:
// 'char'` the letter, it is in
const PITCH = 1400 / 75
const LINES = new Map()
function lineOf(text, unit = 'word') {
  const key = `${unit}|${text}`
  const hit = LINES.get(key)
  if (hit) return hit
  const tc = typeCells(text)
  const units = []
  let open = false
  ;[...text].forEach((ch, i) => {
    const x0 = i ? tc.ends[i - 1] : 0
    if (ch === ' ') { open = false; return }
    if (!open || unit === 'char') { units.push({ x0, x1: tc.ends[i] }); open = true } else units[units.length - 1].x1 = tc.ends[i]
  })
  const cells = tc.cells.map(([x, y], n) => {
    let k = units.findIndex((w) => x < w.x1)
    if (k < 0) k = units.length - 1
    return { x, y, k, j: rnd(n * 7 + 3) }
  })
  const out = { cells, units, w: tc.w }
  if (tc.sure) LINES.set(key, out)
  return out
}
// A line, a word coming on at each of `times` (or one after another from
// `from`): its cells lit as a screen's pixels are, swept from its first
// column to its last in a few frames, a cell a little before or after its
// neighbour; and at `to` the line goes the same way, its first column first.
// No two words alike: each has its own little lateness and its own pace, as
// a hand's are, the same on every frame. `x` is its left edge, or with
// `align` its middle or its right edge; wherever that puts it, its left
// edge is on the grid's nearest cell
const PAD = 14
const leftOf = (L, x, align, c) => {
  const w = L.w * c
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  return GX + Math.round((left - GX) / C) * C
}
function CellLine({ t, text, from = 0, times = null, step = 95, to = Infinity, x: x0 = X0, y = Y0, c = C, color = CHALK, unit = 'word', align = 'left' }) {
  const ref = useRef(null)
  const L = lineOf(text, unit)
  const x = leftOf(L, x0, align, c)
  const first = times ? times[0] : from
  const live = t >= first - 40 && t <= to + 400
  useLayoutEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    g.clearRect(0, 0, cv.width, cv.height)
    g.fillStyle = color
    const seed = text.length * 13
    const when = (k) => (times ? times[Math.min(k, times.length - 1)] : from + k * step) + (rnd(seed + k * 7) - 0.5) * 36
    const pace = (k) => 50 + rnd(seed + k * 11 + 3) * 70
    const out = 120 + rnd(seed + 5) * 70
    for (const p of L.cells) {
      const w = L.units[p.k]
      const sweep = ((p.x - w.x0) / Math.max(1, w.x1 - w.x0)) * pace(p.k)
      let a = on(t, when(p.k) + sweep + (p.j - 0.5) * 24, 34 + p.j * 26)
      if (to < Infinity) a *= 1 - on(t, to + (p.x / Math.max(1, L.w)) * out + (p.j - 0.5) * 30, 45)
      if (a <= 0.004) continue
      g.globalAlpha = a
      g.fillRect(PAD + p.x * c, PAD + (p.y + 10) * c, c, c)
    }
    g.globalAlpha = 1
  })
  if (!live) return null
  return <canvas ref={ref} className="rl-line" width={Math.ceil(L.w * c + PAD * 2)} height={13 * c + PAD * 2} style={{ left: x - PAD, top: y - PAD }} />
}

// ── where the words go ──────────────────────────────────────────────────────
// Each scene its own: the hall's two lines staggered, the first flush left
// and the second flush right under it; `privately.` twice the size of the
// line before it; the night's centred in the sky over the envelope as it
// waits on the horizon, the two by the sea under it; the
// date's clock large, set in from the sentence it ends; `it's mutual.`
// large over the letter, centred; the ones that never meet flush right; the
// question centred in the middle of the frame, its last word large; and
// the name in the middle. A large line's cells are two of the grid's.
const Y1 = Y0 + LINE
const RIGHT = 1000
const QW = S.qWords
const WORDS = {
  wall: [
    { text: 'a wall of the ones', from: S.lines[0], to: S.linesOut },
    { text: 'you never told.', from: S.lines[1], to: S.linesOut + 40, x: X0 + 116 * C, y: Y1, align: 'right' },
  ],
  send: [
    { text: 'or send it', from: S.sendIt, to: S.sendOut },
    { text: 'privately.', from: S.privately, to: S.sendOut + 40, y: Y1, c: 2 * C },
  ],
  night: [
    { text: 'they only read it if', from: S.nLines[0], to: S.nOut, x: 540, y: GY + 79 * C, align: 'center' },
    { text: 'they send you one.', from: S.nLines[1], to: S.nOut + 40, x: 540, y: GY + 95 * C, align: 'center' },
  ],
  date: [
    { text: 'every mutual is', from: S.dLines[0], to: S.dOut },
    { text: 'revealed on', from: S.dLines[1], to: S.dOut + 40, y: Y1 },
  ],
  mutual: [
    { text: 'it’s', from: S.said, to: S.rOut, x: 540, c: 2 * C, align: 'center' },
    { text: 'mutual.', from: S.said + 95, to: S.rOut + 40, x: 540, y: GY + 55 * C, c: 2 * C, align: 'center' },
    { text: 'you both find out.', from: S.both, to: S.rOut + 80, x: 540, y: GY + 83 * C, align: 'center' },
  ],
  ifnot: [
    { text: 'if it isn’t,', from: S.fLines[0], to: S.fOut, x: RIGHT, align: 'right' },
    { text: 'nobody', from: S.fLines[1], to: S.fOut + 40, x: RIGHT, y: Y1, align: 'right' },
    { text: 'ever knows.', from: S.fLines[1] + 95, to: S.fOut + 80, x: RIGHT, y: Y1 + LINE, align: 'right' },
  ],
  ask: [
    { text: 'do they still', times: QW.slice(0, 3), to: S.qOut, x: 540, y: GY + 61 * C, align: 'center' },
    { text: 'think about', times: [QW[3], QW[4]], to: S.qOut + 40, x: 540, y: GY + 77 * C, align: 'center' },
    { text: 'you?', times: [QW[5]], to: S.qOut + 80, x: 540, y: GY + 93 * C, c: 2 * C, align: 'center' },
  ],
}
// the date's clock: the day over the time, the time large, and once it has
// come to nine and stopped, where; set in from the sentence
const CLOCK = { x: X0 + 14 * C, day: GY + 63 * C, time: GY + 75 * C, where: GY + 101 * C }
const Words = ({ t, of }) => of.map((l) => <CellLine key={l.text} t={t} {...l} />)
// a group of lines: how much of it is up at `t`, and the box it covers on
// the frame, for the panel kept darker under it
const firstOf = (l) => (l.times ? l.times[0] : l.from || 0)
const upOf = (of, t) => Math.max(...of.map((l) => u(t, firstOf(l) - 150, firstOf(l) + 200) * (1 - u(t, l.to + 150, l.to + 500))))
function boxOf(of) {
  const b = [Infinity, Infinity, -Infinity, -Infinity]
  for (const l of of) {
    const c = l.c || C
    const L = lineOf(l.text)
    const x = leftOf(L, l.x == null ? X0 : l.x, l.align, c)
    const y = l.y == null ? Y0 : l.y
    b[0] = Math.min(b[0], x)
    b[1] = Math.min(b[1], y)
    b[2] = Math.max(b[2], x + L.w * c)
    b[3] = Math.max(b[3], y + 12 * c)
  }
  return b
}
const shadeOf = (of, t, k = 0.62) => { const up = upOf(of, t); return up > 0 ? [...boxOf(of), k * up] : null }

// the shade under the band of words, where the hall behind them is busy
const Shade = ({ o }) => (o > 0.003 ? <div className="rl-shade" style={{ opacity: o.toFixed(3) }} /> : null)

// the light a lit screen throws on the room round it, in its colour
const Glow = ({ x, y, r, colour, o = 1, z = 0 }) => (o > 0.005 && r > 1 ? (
  <span className="rl-glow" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: Math.min(1, o).toFixed(3), zIndex: z, '--c': colour }} aria-hidden="true" />
) : null)
const halo = (tint) => skinVars(tint)['--s-halo']
// a print or a copy on the wall is paper, lit from outside: it throws less
const PAPER = new Set(['teal', 'acid', 'violet-yellow', 'xerox'])

// ── a note, as the phone draws it ───────────────────────────────────────────
// The envelope, in cells: the phone's own glyph (looks.js).
const glyphOf = (rows, lift = 0) => ({ cells: rows.flatMap((r, y) => [...r].flatMap((ch, x) => (ch === 'X' ? [[x, y]] : []))), w: rows[0].length, h: rows.length, lift })
const ENV = glyphPath('env')
const ENV_ROWS = (() => {
  const rows = Array.from({ length: ENV.h }, () => Array(ENV.w).fill('.'))
  for (const m of ENV.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) rows[+m[2]][+m[1]] = 'X'
  return rows.map((r) => r.join(''))
})()
const ENVS = { closed: glyphOf(ENV_ROWS) }

// A note drawn at `x`, `y` (its body's middle), `cell` a cell. On a lit
// glass it is in the glass's `ink`; in the dark it is lit, its outline
// bright and its paper faint, and a little of its light on the dark round
// it. `sx`, `sy` and `white` are a screen coming on or going out; `shine`
// is a band of light going over it, from its corner, as it is sealed.
function drawEnvelope(g, { x, y, cell, tint = 'ice', a = 1, glyph = ENVS.closed, rot = 0, sx = 1, sy = 1, white = 0, body = 0.24, glow = 1, ink = null, shine = null }) {
  if (a <= 0.003 || cell <= 0.05) return
  const sk = skinOf(tint)
  const bw = 11 * cell
  const bh = 7 * cell
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  if (!ink && glow > 0) {
    const r = bw * 1.2
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, r)
    grad.addColorStop(0, tone(sk.glow, 0.34 * a * glow))
    grad.addColorStop(0.4, tone(sk.glow, 0.09 * a * glow))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(-r, -r, r * 2, r * 2)
  }
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  if (!ink && body > 0) {
    g.globalAlpha = a * body
    g.fillStyle = sk.mid
    g.fillRect(-bw / 2, -bh / 2, bw, bh)
  }
  g.globalAlpha = a
  const lit = ink || (white > 0 ? mix(sk.lit, '#FFFFFF', Math.min(1, white)) : sk.lit)
  const ox = -bw / 2
  const oy = -bh / 2 - glyph.lift * cell
  for (const [cx, cy] of glyph.cells) {
    const s = shine == null ? 0 : Math.max(0, 1 - Math.abs(cx + cy - shine) / 2.4)
    g.fillStyle = s > 0.02 ? mix(lit, '#FFFFFF', s * 0.9) : lit
    g.fillRect(ox + cx * cell, oy + cy * cell, cell + 0.35, cell + 0.35)
  }
  g.restore()
}
// the point a screen goes out to, or comes on from
function drawDot(g, x, y, size, a, tint = 'white') {
  if (a <= 0.003) return
  const r = size * 3.4
  const grad = g.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, tone(skinOf(tint).glow, 0.6 * a))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(x - r, y - r, r * 2, r * 2)
  g.globalAlpha = a
  g.fillStyle = '#FFFFFF'
  g.fillRect(x - size / 2, y - size / 2, size, size)
  g.globalAlpha = 1
}
// a screen going out, as an old one does: down to a bright line, the line
// to a point, the point gone; and coming on the other way. `k` stretches it
function crtOff(t, t0, k = 1) {
  const sy = at([[t0, 1], [t0 + 120 * k, 0.07, 'power3.in']], t)
  const sx = at([[t0 + 120 * k, 1], [t0 + 200 * k, 0.07, 'power2.in']], t)
  const white = at([[t0, 0], [t0 + 120 * k, 0.85], [t0 + 200 * k, 1]], t)
  const gone = t >= t0 + 200 * k
  const dot = gone ? 1 - u(t, t0 + 200 * k, t0 + 380 * k) : 0
  return { sx, sy, white, gone, dot }
}
function crtOn(t, t0, k = 1) {
  const lit = t >= t0 + 50 * k
  const dot = t >= t0 && !lit ? on(t, t0, 50 * k) : 0
  const sx = at([[t0 + 50 * k, 0.07], [t0 + 140 * k, 1, 'power2.out']], t)
  const sy = at([[t0 + 140 * k, 0.07], [t0 + 250 * k, 1, 'power3.out']], t)
  const white = at([[t0 + 50 * k, 1], [t0 + 160 * k, 0.7], [t0 + 340 * k, 0]], t)
  return { sx, sy, white, dot, lit }
}

// ── the notes' letters, where their glass sets them ─────────────────────────
// A note's phone laid out once, unseen, before the first frame: every
// letter's place on the glass, the size and ascent of the face there, and
// so every letter's own cells (pixtype.js), from its pen on its baseline, in
// the phone's own pixels: the letters the send gathers, and the ones a
// note that opens lays down.
function textCells(text, m, box) {
  const k = box.size / PITCH
  const cells = []
  ;[...text].forEach((ch, i) => {
    if (ch === ' ' || !m[i]) return
    const bx = m[i].x
    const by = m[i].y + box.asc
    for (const [cx, cy] of typeCells(ch).cells) cells.push({ x: bx + (cx + 0.5) * k, y: by + (cy + 0.5) * k })
  })
  return { cells, k }
}
function Measure({ who, props, onMeasure }) {
  const [done, setDone] = useState(false)
  const times = useMemo(() => new Array([...who.text].length).fill(0), [who])
  if (done) return null
  return (
    <div className="rl-measure" aria-hidden="true">
      <NoteScreen
        who={who} t={1e6} times={times} sendAt={1e9} quiet={false} {...props}
        onMeasure={(m, box) => {
          const ys = m.map((g) => g.y)
          const area = { y0: Math.min(...ys), y1: Math.max(...m.map((g) => g.y + g.h)) }
          onMeasure({ m, box, area, text: textCells(who.text, m, box) })
          setDone(true)
        }}
      />
    </div>
  )
}
// the envelope on a glass: its body's middle, and a cell of it, in the
// phone's own pixels
const ENV_CELL = 32
const envOn = (mA) => ({ x: mA.box.w / 2, y: (mA.area.y0 + mA.area.y1) / 2 })

// the projective map of the phone's own pixels onto the frame, from where
// its four corners are on the frame (top left, top right, bottom right,
// bottom left)
function quadMap(q, w, h) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  let g = 0
  let hh = 0
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const dx1 = x1 - x2
    const dx2 = x3 - x2
    const dy1 = y1 - y2
    const dy2 = y3 - y2
    const den = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - dx2 * sy) / den
    hh = (dx1 * sy - sx * dy1) / den
  }
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + hh * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + hh * y3
  return (px, py) => {
    const s = px / w
    const v = py / h
    const z = g * s + hh * v + 1
    return [(a * s + b * v + x0) / z, (d * s + e * v + y0) / z]
  }
}

// A smooth curve through keys in time: [ms, ...values], each key's tangent
// the slope between its neighbours (Hermite), or still where a key is
// marked so, and at the ends
function hermite(keys, t, k) {
  const val = (j) => [].concat(keys[j][k])
  if (t <= keys[0][0]) return val(0)
  const n = keys.length - 1
  if (t >= keys[n][0]) return val(n)
  let i = 0
  while (keys[i + 1][0] < t) i++
  const t0 = keys[i][0]
  const h = keys[i + 1][0] - t0
  const s = (t - t0) / h
  const slope = (j) => {
    const v = val(j)
    if (j <= 0 || j >= n || keys[j][4]) return v.map(() => 0)
    const a = val(j - 1)
    const b = val(j + 1)
    return a.map((x, c) => (b[c] - x) / (keys[j + 1][0] - keys[j - 1][0]))
  }
  const m0 = slope(i)
  const m1 = slope(i + 1)
  const s2 = s * s
  const s3 = s2 * s
  const p0 = val(i)
  const p1 = val(i + 1)
  return p0.map((x, c) => (2 * s3 - 3 * s2 + 1) * x + (s3 - 2 * s2 + s) * h * m0[c] + (-2 * s3 + 3 * s2) * p1[c] + (s3 - s2) * h * m1[c])
}
const bez = (P, k) => {
  const a = 1 - k
  return [0, 1, 2].map((c) => a * a * a * P[0][c] + 3 * a * a * k * P[1][c] + 3 * a * k * k * P[2][c] + k * k * k * P[3][c])
}

// ── 0 to 12.5: the letter, the hall, the send. one shot ─────────────────────
// The camera, as an operator would hold it: [ms, eye, target, lens in
// degrees, still]. The letter, the whole glass in the frame and its words
// in the middle (`T`), a slow push as the last of them comes; and the
// moment the last is typed, straight back from it, quickly and then slower,
// the lens widening, until the wall of letters is the whole frame and lin's
// one among them, the backlights coming on outward from it as it goes; then
// one move, up the hall's height and round, that lands and stops; then down
// to lin's letter as it comes away from the wall, and held.
const LETTER_FROM = [-0.2, -0.3, 3.55]
const LETTER_TO = [0, -0.02, 3.05]
// the pull back: from the last letter typed to the move up the hall
// (reel-time.js, `back`, so the sound swells on it), and where it ends,
// from the words' middle
const ZOOM = S.back
const ZOOM_TO = { eye: [0.3, 0.6, 16], target: [0, 0.9, 0], fov: 44 }
CustomEase.create('rl.back', 'M0,0 C0.06,0.02 0.16,1 1,1')
// the letters the camera rests on: under lin's, and over it
const PINS = { '0,-1': cellOf('maya'), '0,1': cellOf('mei') }
const hallOf = (T) => [
  [ZOOM[1], v3.add(T, ZOOM_TO.eye), v3.add(T, ZOOM_TO.target), ZOOM_TO.fov, true],
  [8000, [-7, 6.5, 14.5], [3.5, 10.5, 0], 54, true],
  [10000, [0.3, 1.6, 12.6], [0, 0.9, 0], 38, true],
  [12500, [0.3, 1.62, 12.55], [0, 0.92, 0], 38, true],
]
function camAt(t, T, hall) {
  if (t < ZOOM[0]) {
    const k = easeOf('sine.inOut')(u(t, 0, ZOOM[0]))
    return { eye: v3.add(T, v3.lerp(LETTER_FROM, LETTER_TO, k)), target: T, fov: 34 }
  }
  if (t < ZOOM[1]) {
    // its distance from the glass goes up evenly as a ratio, as a zoom is
    // seen to, and the rest of the move with it
    const k = easeOf('rl.back')(u(t, ZOOM[0], ZOOM[1]))
    const d = LETTER_TO[2] * (ZOOM_TO.eye[2] / LETTER_TO[2]) ** k
    const f = (d - LETTER_TO[2]) / (ZOOM_TO.eye[2] - LETTER_TO[2])
    return {
      eye: v3.add(T, [lerp(LETTER_TO[0], ZOOM_TO.eye[0], f), lerp(LETTER_TO[1], ZOOM_TO.eye[1], f), d]),
      target: v3.add(T, v3.scale(ZOOM_TO.target, f)),
      fov: lerp(34, ZOOM_TO.fov, k),
    }
  }
  return { eye: hermite(hall, t, 1), target: hermite(hall, t, 2), fov: hermite(hall, t, 3)[0] }
}

// lin's letter: on the wall, until it comes away from it, out from the
// wall first and then across to the camera, turning to it, to be held in
// the objects' place at the objects' size
const HOME = { c: [0, 0, 0], r: [UNIT.w / 2, 0, 0], u: [0, UNIT.h / 2, 0] }
const focalOf = (fov) => 960 / Math.tan((fov * Math.PI) / 360)
function heldAt(T, hall) {
  const end = camAt(S.lift[1], T, hall)
  const cam = cameraOf(end)
  const f = focalOf(end.fov)
  const d = f / OBJ.w
  // a phone `OBJ.w` wide, its middle `OBJ.y` down the frame
  return { cam, c: v3.sub(v3.add(end.eye, v3.scale(cam.fwd, d)), v3.scale(cam.up, ((OBJ.y - 960) / f) * d)), d }
}
// how far along its way it is when its size on the frame is `ease` of the
// way from its size on the wall to its size held: far off it covers ground
// quickly, near it slows, so it is seen to grow evenly and arrive softly
function linPose(t, T, hall) {
  const turn = easeOf('sine.inOut')(u(t, S.lift[0], S.lift[1]))
  if (turn <= 0) return HOME
  const held = heldAt(T, hall)
  const near = [16, held.d]
  const k = clamp((near[0] - 1 / lerp(1 / near[0], 1 / near[1], turn)) / (near[0] - near[1]))
  const c = bez([HOME.c, [0, 0.1, 2.6], v3.add(held.c, v3.scale(held.cam.fwd, 2.4)), held.c], k)
  // a little turn on the way, as a thing carried turns
  const sway = Math.sin(turn * Math.PI) * 0.2
  const r = v3.norm(v3.lerp([Math.cos(sway), 0, -Math.sin(sway)], held.cam.side, turn))
  const up = v3.norm(v3.lerp([0, 1, 0], held.cam.up, turn))
  return { c, r: v3.scale(r, UNIT.w / 2), u: v3.scale(up, UNIT.h / 2), k: turn }
}

// The send, in the letter's own pixels. Every lit pixel of its words leaves
// its place, the first words first, along a curve of its own, to a place in
// the envelope, the top line to its top edge and the last to its foot, so
// the envelope is made of the letter; then it is sealed, and lit.
function gatherOf(text, env) {
  const glyph = ENVS.closed
  const N = text.cells.length
  const T = glyph.cells.length
  const s = Math.max(2, Math.round(Math.sqrt(N / T)))
  const counts = new Array(T).fill(0)
  const E = ENV_CELL
  return text.cells.map((c, i) => {
    const ti = Math.min(T - 1, Math.floor((i * T) / N))
    const q = counts[ti]++
    const [gx, gy] = glyph.cells[ti]
    const ex = env.x - 5.5 * E + gx * E + ((q % s) + 0.5) * (E / s)
    const ey = env.y - 3.5 * E + gy * E + ((Math.floor(q / s) % s) + 0.5) * (E / s)
    const d = Math.hypot(ex - c.x, ey - c.y) || 1
    // one arc, every pixel the same way round, so the letter flows into the
    // envelope as one thing and does not scatter
    const curl = (0.1 + rnd(i * 3 + 1) * 0.12) * d
    const t0 = S.gather[0] + (i / N) * 340 + (rnd(i * 5 + 2) - 0.5) * 36
    const t1 = Math.min(S.gather[1], t0 + 320 + rnd(i * 7 + 3) * 80)
    return { sx: c.x, sy: c.y, ex, ey, mx: (c.x + ex) / 2 - ((ey - c.y) / d) * curl, my: (c.y + ey) / 2 + ((ex - c.x) / d) * curl, t0: Math.max(S.gather[0], t0), t1 }
  })
}
const LENS = { x: 540, y: 1000, cell: 255, rot: -0.14 }
// where the envelope is at `t` once it is off the glass, from where the
// glass had it (`F`, its middle on the frame; `cell`; `rot`): lifted a
// little, then at the lens
function envelopeAt(t, F, cell, rot) {
  const f = easeOf('sine.out')(u(t, S.seal[1], S.lens[0]))
  const e = easeOf('power3.in')(u(t, S.lens[0], S.lens[1]))
  const c0 = cell * lerp(1, 1.12, f)
  return {
    x: lerp(F[0], LENS.x, e),
    y: lerp(F[1] - 14 * f, LENS.y, e),
    cell: c0 * (LENS.cell / c0) ** e,
    rot: lerp(rot, LENS.rot, e),
  }
}

function WallScene({ t, m, times, image }) {
  const canvas = useRef(null)
  const fx = useRef(null)
  const gl = useRef(null)
  const letters = useMemo(() => wallOf((cell) => hexRgb(skinOf(cellTint(cell)).glow).map((x) => (x / 255) * (PAPER.has(cellTint(cell)) ? 0.45 : 1)), PINS), [])
  const home = useMemo(() => letters.findIndex((l) => l.home), [letters])
  const lit = useMemo(() => new Float32Array(letters.length), [letters])
  const glow = useMemo(() => new Float32Array(letters.length), [letters])
  const env = useMemo(() => envOn(m), [m])
  const parts = useMemo(() => gatherOf(m.text, env), [m, env])
  // the middle of lin's words on the glass, in the wall's units
  const W = (px, py) => [px / m.box.w - 0.5, (0.5 - py / m.box.h) * UNIT.h, 0]
  const T = useMemo(() => {
    const xs = m.m.map((g) => g.x)
    const ys = m.m.map((g) => g.y)
    const x1 = Math.max(...m.m.map((g) => g.x + g.w))
    const y1 = Math.max(...m.m.map((g) => g.y + g.h))
    return W((Math.min(...xs) + x1) / 2, (Math.min(...ys) + y1) / 2)
  }, [m]) // eslint-disable-line react-hooks/exhaustive-deps
  const hall = useMemo(() => hallOf(T), [T])
  // ── the camera ──
  let { eye, target, fov } = camAt(t, T, hall)
  const pose = linPose(t, T, hall)
  const at3 = (px, py) => {
    const [x, y] = [(px / m.box.w) * 2 - 1, 1 - (py / m.box.h) * 2]
    return v3.add(pose.c, v3.add(v3.scale(pose.r, x), v3.scale(pose.u, y)))
  }
  // the move up the hall lands as a hand lands it: a little past, and back
  if (t > 8000 && t < 9200) {
    const k = (t - 8000) / 1000
    const dir = v3.norm(v3.sub(hall[1][2], hall[0][2]))
    target = v3.add(target, v3.scale(dir, 0.22 * Math.exp(-k * 3.2) * Math.sin(k * 8.5)))
  }
  // and from just before lin's letter comes away, the camera finds it, and
  // keeps it where the objects go: aimed a little over it, so it sits low
  const track = easeOf('sine.inOut')(u(t, S.lift[0] - 300, S.lift[0] + 1300))
  if (track > 0) {
    const up = cameraOf({ eye, target, fov }).up
    const off = ((OBJ.y - 960) / focalOf(fov)) * Math.hypot(...v3.sub(pose.c, eye))
    target = v3.lerp(target, v3.add(pose.c, v3.scale(up, off)), track)
  }
  // a hand's unsteadiness, more as the lens is longer, and less when held
  const dz = v3.sub(eye, target)
  const far = Math.hypot(dz[0], dz[1], dz[2])
  const hand = 0.0032 * far
  eye = v3.add(eye, [shake(t, 1) * hand, shake(t, 7) * hand, shake(t, 3) * hand * 0.5])
  const cam = cameraOf({ eye, target, roll: shake(t, 11) * 0.006, fov })
  // ── the light on the wall ──
  // dark but for lin's; then the backlights come on outward from lin's,
  // each in a few frames, steadily, and stay on; a few screens are dead;
  // the hall goes down to the dark as the note is sent
  const leave = 1 - 0.94 * easeOf('sine.inOut')(u(t, S.press, S.crt[0]))
  for (let n = 0; n < letters.length; n++) {
    const l = letters[n]
    if (n === home || l.dead) { lit[n] = 0; glow[n] = n === home ? 0.4 * (1 - (pose.k || 0)) * leave : 0; continue }
    const k = on(t, wakeOf(l.dist, l.seed))
    lit[n] = k * (0.5 + 0.5 * l.seed) * leave
    glow[n] = lit[n] * 0.32
  }
  const linD = Math.hypot(...v3.sub(pose.c, eye))
  const tgtD = Math.hypot(...v3.sub(target, eye))
  const toHall = easeOf('sine.inOut')(u(t, 5700, 7400))
  const toLin = easeOf('sine.inOut')(u(t, S.lift[0] + 200, S.lift[1] - 150))
  const focus = lerp(lerp(linD, tgtD, toHall), linD, toLin)
  const aperture = lerp(lerp(1.4, 1.1, toHall), 2.8, toLin)
  const dust = 0.5 * u(t, S.wake + 300, S.wake + 2600) * leave
  useLayoutEffect(() => {
    if (!canvas.current || !image) return
    if (!gl.current) gl.current = new WallGL(canvas.current, image, letters)
    gl.current.draw(cam, lit, glow, { focus, aperture, fogStart: 20, fog: 0.04, spread: 2.1, time: t / 1000, dust, bokeh: 0.016 })
  })
  // ── lin's phone, the real one, where the wall has its place ──
  const corners = [
    at3(0, 0), at3(m.box.w, 0), at3(m.box.w, m.box.h), at3(0, m.box.h),
  ].map(cam.project)
  const ok = corners.every(Boolean)
  const wpx = ok ? Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) : 0
  const mid = ok ? [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2] : [540, 960]
  const H = ok ? quadMap(corners, m.box.w, m.box.h) : null
  // ── the send ──
  // sealed, the glass dims under the envelope so its light reads; then the
  // phone goes out behind it, as an old screen goes: down to a bright line,
  // the line to a point
  const sealDim = 1 - 0.5 * easeOf('sine.inOut')(u(t, S.seal[0], S.seal[1]))
  const off = crtOff(t, S.crt[0], 1.45)
  const crt = corners.map(([x, y, z]) => [mid[0] + (x - mid[0]) * off.sx, mid[1] + (y - mid[1]) * off.sy, z])
  const bright = sealDim * (1 + off.white * 2.2)
  useLayoutEffect(() => {
    const cv = fx.current
    if (!cv) return
    const g = cv.getContext('2d')
    g.clearRect(0, 0, 1080, 1920)
    if (!H || t < S.gather[0]) return
    const scale = Math.hypot(...[0, 1].map((i) => H(env.x + 100, env.y)[i] - H(env.x, env.y)[i])) / 100
    const ink = skinOf(A.tint).ink
    // the letter's pixels, on their way
    if (t < S.seal[0] + 90) {
      const fade = 1 - u(t, S.seal[0] + 20, S.seal[0] + 90)
      const s = m.text.k * scale * 1.04
      g.fillStyle = ink
      g.globalAlpha = fade
      for (const p of parts) {
        const k = easeOf('power2.inOut')(u(t, p.t0, p.t1))
        const a = 1 - k
        const px = a * a * p.sx + 2 * a * k * p.mx + k * k * p.ex
        const py = a * a * p.sy + 2 * a * k * p.my + k * k * p.ey
        const [X, Y] = H(px, py)
        g.fillRect(X - s / 2, Y - s / 2, s, s)
      }
      g.globalAlpha = 1
    }
    if (t < S.seal[0]) return
    // the envelope: solid in the glass's ink, then lit, a light going over
    // it; then off the glass, lifted, and at the lens, the frames it was in
    // a moment ago after it, fainter
    const F = H(env.x, env.y)
    const R = H(env.x + 100, env.y)
    const rot = Math.atan2(R[1] - F[1], R[0] - F[0])
    const cell = ENV_CELL * scale
    const solid = on(t, S.seal[0], 60)
    const litK = on(t, S.seal[0] + 40, 120)
    const shine = lerp(-4, 19, u(t, S.seal[0] + 70, S.seal[1] + 30))
    if (t < S.seal[1]) {
      drawEnvelope(g, { x: F[0], y: F[1], cell, rot, ink, a: solid * (1 - litK) })
      drawEnvelope(g, { x: F[0], y: F[1], cell, rot, tint: A.tint, a: litK, white: 0.15, shine, glow: litK })
      return
    }
    const e = envelopeAt(t, F, cell, rot)
    if (t >= S.lens[0]) {
      for (let k = 4; k >= 1; k--) {
        const o = envelopeAt(t - k * 18, F, cell, rot)
        drawEnvelope(g, { ...o, tint: A.tint, a: 0.16, white: 0.1, glow: 0 })
      }
    }
    drawEnvelope(g, { ...e, tint: A.tint, white: 0.12, glow: 1.2 })
  })
  const shade = Math.max(
    u(t, S.lines[0] - 100, S.lines[0] + 200) * (1 - u(t, S.linesOut + 100, S.linesOut + 400)),
    u(t, S.sendIt - 100, S.sendIt + 200) * (1 - u(t, S.sendOut + 100, S.sendOut + 400)),
  )
  return (
    <div className="rl-cam">
      <canvas ref={canvas} className="rl-wall" width="1080" height="1920" />
      <Glow x={mid[0]} y={mid[1]} r={Math.max(80, wpx * 1.1)} colour={halo('ice')} o={0.55 * (1 - 0.8 * u(t, 4000, 5600)) * (1 - u(t, S.crt[0], S.crt[0] + 200))} z={2} />
      {ok && wpx > 2 && !off.gone ? (
        <div className="rl-lin" style={{ transform: boxOnto(m.box.w, m.box.h, t >= S.crt[0] ? crt : corners), filter: bright !== 1 ? `brightness(${bright.toFixed(3)})` : undefined }}>
          <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} quiet={false} fx hide={t >= S.gather[0]} />
        </div>
      ) : null}
      {off.dot > 0 ? <span className="rl-dot" style={{ left: mid[0] - 7, top: mid[1] - 7, opacity: off.dot.toFixed(3) }} /> : null}
      <canvas ref={fx} className="rl-fx" width="1080" height="1920" />
      <Shade o={shade} />
      <Words t={t} of={WORDS.wall} />
      <Words t={t} of={WORDS.send} />
    </div>
  )
}

// ── 12.5 to 20: the dark, a panel of cells ──────────────────────────────────
// Through the lens into the dark: the frame a screen's panel, its cells
// lit only by the light moving in it (PanelGL, below), and the note on it,
// away from us to its place to wait. Then every
// mutual is revealed on saturday at nine: the sentence ends on a clock that
// runs through the week, while the week's notes come in round it, each as a
// screen comes on, and on the thursday one that is somebody's to lin. At
// nine the others go down, and the camera leans in on the two, in and down
// to where the phone's screen will be, and they find each other, wait a
// moment apart, and touch.
// a view of the panel: its point `a` at the frame's point `f`, `z` times
const frameOf = (v, p) => [v.f[0] + (p[0] - v.a[0]) * v.z, v.f[1] + (p[1] - v.a[1]) * v.z]
const REST = { a: [540, 960], f: [540, 960], z: 1 }
// the camera on the panel held, as the hall's is: a drift of a pixel or
// so, slow, that `k` takes down to nothing
const held = (v, t, k = 1) => ({ ...v, f: [v.f[0] + shake(t, 41) * 1.4 * k, v.f[1] + shake(t, 47) * 1.6 * k] })
// lin's place, and kai's, their corners on the grid; where they meet; and
// the reveal's screen on the frame, where the meeting comes to
const envAt = (tl) => [tl[0] + 5.5 * C, tl[1] + 3.5 * C]
const L_AT = envAt(onGrid(71, 139))
const K_AT = envAt(onGrid(108, 176))
const MEET = [640, 1130]
const SCREEN_AT = [540, 1050]
function leanView(t) {
  const k = easeOf('sine.inOut')(u(t, S.lean[0], S.lean[1]))
  return { a: MEET, f: [lerp(MEET[0], SCREEN_AT[0], k), lerp(MEET[1], SCREEN_AT[1], k)], z: 2.6 ** k }
}
// the two of them in the panel's own pixels: they find each other, not in
// straight lines, kai's moving first; a little apart they wait, lin's
// drawing back a hair before it comes on; and touch. The space between them
// is kept on the frame, whatever the zoom
function pairAt(t, z) {
  const nearK = easeOf('sine.inOut')(u(t, S.lean[0] - 160, S.touch[0] - 60))
  const nearL = easeOf('power2.inOut')(u(t, S.lean[0] + 60, S.touch[0]))
  const w = easeOf('sine.inOut')(u(t, S.touch[0], S.touch[1]))
  const wait = lerp(15, 10, w) + 2.4 * Math.sin(Math.PI * w)
  const space = lerp(wait, -1, easeOf('power2.in')(u(t, S.touch[1], S.touch[2])))
  const d = (11 * C * z + space) / (2 * z)
  return {
    lin: [lerp(L_AT[0], MEET[0] - d, nearL), lerp(L_AT[1], MEET[1], nearL) - Math.sin(Math.PI * nearL) * 22],
    kai: [lerp(K_AT[0], MEET[0] + d, nearK) + Math.sin(Math.PI * nearK) * 16, lerp(K_AT[1], MEET[1], nearK)],
  }
}
// the week's other notes, as they come in, each a screen coming on
const OTHERS = [
  [14, 108, 'teal'], [124, 100, 'lilac'], [30, 196, 'white'], [118, 214, 'green'],
  [54, 228, 'rose'], [12, 160, 'teal'], [126, 150, 'lilac'], [84, 206, 'white'],
].map(([i, j, tint], k) => ({ at: envAt(onGrid(i, j)), tint, ms: S.others[k], k: 0.6 + rnd(k * 5 + 1) * 0.5, a: 0.28 + rnd(k * 7 + 2) * 0.14 }))
// the clock at the end of the sentence, through the week from monday
// morning to saturday at nine at night, quickly in the middle of the week
// and slowly into nine
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function clockAt(t) {
  const k = easeOf('power3.inOut')(u(t, S.lapse[0], S.lapse[1]))
  const m = Math.round(lerp(9 * 60 + 12, 5 * 1440 + 21 * 60, k))
  const hm = m % 1440
  const h = Math.floor(hm / 60)
  return [DAYS[Math.min(5, Math.floor(m / 1440))], `${((h + 11) % 12) + 1}:${String(hm % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`]
}

// the two envelopes coming apart at the touch (reel-aura.js): the cells
// still on them, white, as the phone draws them, and the ones carried out
// on the spread as pixels, smaller and fainter as they go, their light
// passing into the panel's cells
function drawLeaving(g, t, v) {
  const { remaining, flying } = AURA.leavingAt(t)
  const half = (C * v.z) / 2
  for (const p of remaining || []) {
    const [x, y] = frameOf(v, [p.x, p.y])
    g.globalAlpha = p.lit ? 0.97 : 0.22
    g.fillStyle = p.lit ? '#FFFFFF' : skinOf(p.who ? B.tint : A.tint).mid
    g.fillRect(x - half / 2, y - half / 2, half + 0.35, half + 0.35)
  }
  for (const q of flying) {
    const [x, y] = frameOf(v, [q.x, q.y])
    const a = (1 - q.e) ** 1.5
    if (a <= 0.01) continue
    const w = Math.max(1, half * (1 - 0.8 * q.e))
    g.globalAlpha = a
    g.fillStyle = q.p.lit ? '#FFFFFF' : skinOf(q.p.who ? B.tint : A.tint).glow
    g.fillRect(x - w / 2, y - w / 2, w, w)
  }
  g.globalAlpha = 1
}

function PanelScene({ t }) {
  const ref = useRef(null)
  const v = panelView(t)
  useLayoutEffect(() => {
    const g = ref.current.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, 1080, 1920)
    // the week's notes, and at nine, down
    const down = 1 - u(t, S.lapse[1], S.lapse[1] + 350)
    for (const o of OTHERS) {
      if (t < o.ms) continue
      const c = crtOn(t, o.ms, o.k)
      const [x, y] = frameOf(v, o.at)
      if (!c.lit) { drawDot(g, x, y, 5, c.dot * 0.5 * down, o.tint); continue }
      drawEnvelope(g, { x, y, cell: C * v.z, tint: o.tint, a: o.a * down, sx: c.sx, sy: c.sy, white: c.white, glow: 0.55 })
    }
    // the two, and their touch
    const p = t >= S.lean[0] ? pairAt(t, v.z) : { lin: L_AT, kai: K_AT }
    const touch = t >= S.touch[2] - 12 ? 0.75 * (1 - u(t, S.touch[2] - 12, S.meet)) : 0
    // from the touch, coming apart into the light
    if (t >= S.touch[2] + 6) { drawLeaving(g, t, v); return }
    if (t >= S.kaiIn) {
      const c = crtOn(t, S.kaiIn, 1.3)
      const [x, y] = frameOf(v, p.kai)
      if (!c.lit) drawDot(g, x, y, 7, c.dot, B.tint)
      else drawEnvelope(g, { x, y, cell: C * v.z, tint: B.tint, sx: c.sx, sy: c.sy, white: Math.max(c.white, touch) })
    }
    // lin's: from the lens, away from us to its place, the frames it was in
    // a moment ago after it, fainter; then waiting there
    const away = (tt) => {
      const e = easeOf('expo.out')(u(tt, S.away[0], S.away[1]))
      return { x: lerp(LENS.x, L_AT[0], e), y: lerp(LENS.y, L_AT[1], e), cell: LENS.cell * (C / LENS.cell) ** e, rot: lerp(LENS.rot, 0, e) }
    }
    if (t < S.away[1]) {
      for (let k = 4; k >= 1; k--) drawEnvelope(g, { ...away(t - k * 22), tint: A.tint, a: 0.15, white: 0.1, glow: 0 })
      drawEnvelope(g, { ...away(t), tint: A.tint, white: 0.12 })
    } else {
      // waiting, it breathes, as a phone's light does with something on it
      const b = Math.sin(((t - S.away[1]) / 1700) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5
      const [x, y] = frameOf(v, p.lin)
      drawEnvelope(g, { x, y, cell: C * v.z, tint: A.tint, white: Math.max(touch, 0.12 * b), glow: 0.85 + 0.45 * b })
    }
  })
  // the clock: the day, the time, and once it has come to nine, where
  const [day, time] = clockAt(t)
  const D = S.dLines[2]
  return (
    <div className="rl-cam">
      <canvas ref={ref} className="rl-panel" width="1080" height="1920" />
      <Words t={t} of={WORDS.night} />
      <Words t={t} of={WORDS.date} />
      <CellLine t={t} text={day} times={[D]} to={S.dOut + 80} x={CLOCK.x} y={CLOCK.day} />
      <CellLine t={t} text={time} times={[D + 95, D + 190]} to={S.dOut + 80} x={CLOCK.x} y={CLOCK.time} c={2 * C} />
      <CellLine t={t} text="pacific" times={[S.lapse[1] + 150]} to={S.dOut + 120} x={CLOCK.x} y={CLOCK.where} />
    </div>
  )
}

// ── 20 to 25: the letter turned over ────────────────────────────────────────
// On the touch the two are one light. Out of it comes lin's letter, the one
// that was sent, at us, as a thing tossed comes: quickly out of the light,
// white as a screen coming on, up and away on a curve and round, slowing,
// into the hand; banking into its curve and leaning into its own speed, and
// leaving its light behind it as an old screen's phosphor does. Before it
// has quite come to rest it turns over, leaning back a little first, as a
// hand turns a thing, and going a little past; on its edge on the bar the
// song comes in on, its glass catching the light as it goes over; and on
// its other side is kai's, to lin, read for the first time, and brought a
// little nearer to be read. Its glass keeps its light, its dust and its
// glare, and not its finest pixels (reel.css): they would crawl as it turns
// and comes nearer.
const READ_KEYS = { l: { label: 'options' }, r: [{ glyph: 'heartO', label: '0', cls: 'is-heart' }] }
const LIN_PROPS = { fs: 12.6, fx: true }
export const FACE_A = { fs: 12.6, fx: true, cursor: false, keys: READ_KEYS, top: { name: A.to, dear: true, icon: 'pen', stamp: '10/06/26', bat: 4 } }
export const FACE_B = { fs: 13.4, fx: true, cursor: false, keys: READ_KEYS, top: { name: B.to, dear: true, icon: 'pen', stamp: '10/08/26', bat: 4 } }
// where the two were when they touched, at the lean's end, on the panel
const TOUCHED = (() => {
  const v = leanView(S.meet)
  return { v, ...pairAt(S.touch[2] + 30, v.z) }
})()
// the turn over: a little back first, over its edge at the middle, a
// little past and back
CustomEase.create('rl.flip', 'M0,0 C0.2,-0.12 0.4,0.2 0.5,0.5 0.6,0.8 0.8,1.12 1,1')
// its way out of the light: its middle on the frame and the log of its
// size, along one curve
const SWOOSH = [[SCREEN_AT[0], SCREEN_AT[1], Math.log(0.12)], [290, 880, Math.log(0.4)], [360, 1230, Math.log(0.6)], [OBJ.x, OBJ.y, Math.log(OBJ_S)]]
const wayAt = (t) => bez(SWOOSH, easeOf('power3.out')(u(t, S.swoosh[0], S.swoosh[1])))
const CARD_H = 1160
// the letter at `t`: its middle, its size, how it is turned, and how white
function cardAt(t) {
  const [x, y, ls] = wayAt(t)
  // its speed a moment ago, in pixels a millisecond: it leans into it, and
  // comes level as it slows
  const [x0, y0] = wayAt(t - 50)
  const [x1, y1] = wayAt(t - 20)
  const vx = (x1 - x0) / 30
  const vy = (y1 - y0) / 30
  const p = u(t, S.flip[0], S.flip[1])
  const flip = 180 * easeOf('rl.flip')(p)
  const turning = Math.sin(Math.PI * p)
  const near = 1 + 0.035 * easeOf('sine.inOut')(u(t, S.flip[1] - 150, S.ifnot[0] + 400))
  return {
    x, y,
    s: Math.exp(ls) * (1 + 0.05 * turning) * near,
    rz: clamp(vx * 6, -14, 14) - 2.5 * turning,
    rx: clamp(-vy * 8, -20, 20) + 6 * turning,
    ry: clamp(-vx * 11, -26, 26) + flip,
    flip,
    o: on(t, S.swoosh[0], 90),
    white: at([[S.swoosh[0], 1], [S.swoosh[0] + 120, 0.75], [S.swoosh[0] + 420, 0, 'power2.out']], t),
  }
}
// its four corners on the frame, as its transform (below) puts them
function cardQuad(c) {
  const d = 2600
  const rad = (deg) => (deg * Math.PI) / 180
  const [sz, cz] = [Math.sin(rad(c.rz)), Math.cos(rad(c.rz))]
  const [sy, cy] = [Math.sin(rad(c.ry)), Math.cos(rad(c.ry))]
  const [sx, cx] = [Math.sin(rad(c.rx)), Math.cos(rad(c.rx))]
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => {
    let x = i * (PW / 2) * c.s
    let y = j * (CARD_H / 2) * c.s
    let z = 0
    ;[x, y] = [x * cz - y * sz, x * sz + y * cz]
    ;[x, z] = [x * cy + z * sy, -x * sy + z * cy]
    ;[y, z] = [y * cx - z * sx, y * sx + z * cx]
    const w = 1 - z / d
    return [c.x + x / w, c.y + y / w]
  })
}
const quadPath = (g, q) => {
  g.beginPath()
  q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
}
// the light the glass catches as it turns: a band across it from the
// side nearer us to the far one, brightest as it goes over its edge. The
// band is cut to the card by its own corners, never by a clip: a clipped
// canvas here kept a shard of an old band through its clears
function drawGleam(g, c) {
  const r = (c.flip * Math.PI) / 180
  const a = Math.sin(r) ** 2 * 0.42
  if (a < 0.01) return
  const q = cardQuad(c)
  // the quad's left and right on the frame, whichever side is showing
  const [l0, l1, r0, r1] = c.flip > 90 ? [q[1], q[2], q[0], q[3]] : [q[0], q[3], q[1], q[2]]
  const at = lerp(-0.35, 1.35, clamp(c.flip / 180))
  const w = 0.24
  const k0 = clamp(at - w)
  const k1 = clamp(at + w)
  if (k1 - k0 < 0.002) return
  const along = (k, A, B) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]
  const p0 = along(at - w, l0, r0)
  const p1 = along(at + w, l0, r0)
  const grad = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1])
  grad.addColorStop(0, 'rgba(255,250,244,0)')
  grad.addColorStop(0.5, `rgba(255,250,244,${a.toFixed(3)})`)
  grad.addColorStop(1, 'rgba(255,250,244,0)')
  g.fillStyle = grad
  g.beginPath()
  ;[along(k0, l0, r0), along(k1, l0, r0), along(k1, l1, r1), along(k0, l1, r1)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.fill()
}
// the moment it is on its edge, and kai's side coming on from that line,
// white first, as a screen does
const EDGE = (S.flip[0] + S.flip[1]) / 2
// the spreading light on the letter's edges, as a thing set in light takes
// it on its edges (a light wrap): along each edge, the light's colour
// just outside it, laid a little way in and fading
const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
function drawWrap(o, t, c, k) {
  if (k <= 0.003) return
  const q = cardQuad(c)
  const v = panelView(t)
  const mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4
  const my = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4
  const along = (P, Q, f) => [P[0] + (Q[0] - P[0]) * f, P[1] + (Q[1] - P[1]) * f]
  o.globalCompositeOperation = 'lighter'
  for (let e = 0; e < 4; e++) {
    const P = q[e]
    const Q = q[(e + 1) % 4]
    let nx = Q[1] - P[1]
    let ny = -(Q[0] - P[0])
    const nl = Math.hypot(nx, ny)
    if (nl < 1) continue
    nx /= nl
    ny /= nl
    if (((P[0] + Q[0]) / 2 - mx) * nx + ((P[1] + Q[1]) / 2 - my) * ny < 0) { nx = -nx; ny = -ny }
    const N = 18
    for (let i = 0; i < N; i++) {
      const P0 = along(P, Q, i / N)
      const P1 = along(P, Q, (i + 1) / N)
      const M = along(P, Q, (i + 0.5) / N)
      const L = AURA.lightNear(t, ...toPanel(v, [M[0] + nx * 12, M[1] + ny * 12]))
      const rgb = L.map((x) => Math.round(255 * srgb(Math.min(1, x * 1.6 * k))))
      if (rgb[0] + rgb[1] + rgb[2] < 4) continue
      const grad = o.createLinearGradient(M[0], M[1], M[0] - nx * 16, M[1] - ny * 16)
      grad.addColorStop(0, `rgba(${rgb.join(',')},1)`)
      grad.addColorStop(1, `rgba(${rgb.join(',')},0)`)
      o.fillStyle = grad
      o.beginPath()
      o.moveTo(P0[0], P0[1])
      o.lineTo(P1[0], P1[1])
      o.lineTo(P1[0] - nx * 16, P1[1] - ny * 16)
      o.lineTo(P0[0] - nx * 16, P0[1] - ny * 16)
      o.closePath()
      o.fill()
    }
  }
  o.globalCompositeOperation = 'source-over'
}
// the letter's light, sRGB: the light it throws round it, and the light
// kai's melts into
const srgbOf = (hex) => hexRgb(hex).map((x) => x / 255)
const HALO_OF = { lin: srgbOf(skinOf(A.tint).glow), kai: srgbOf(skinOf(B.tint).glow) }
const INTO = mix(skinOf(B.tint).glow, skinOf(B.tint).lit, 0.55)
// how the light moves the letter at `t`: out of it, its glass and its
// words swimming into place; a ripple through it as kai's side comes on;
// still to be read; and as it is given back, drawn out along the flow,
// outward, and melted into the light, its edges first
function moveOf(t) {
  const emerge = 1 - smooth01(u(t, S.swoosh[0], S.swoosh[0] + 700))
  const ripple = Math.sin(Math.PI * u(t, EDGE + 60, EDGE + 760)) ** 2
  const give = easeOf('sine.inOut')(u(t, S.give[0], S.give[1]))
  return {
    warp: 52 * emerge + 9 * ripple + 140 * give ** 1.3,
    swirl: 80 * emerge + 6 * ripple + 420 * give ** 1.4,
    pull: 300 * give ** 1.5,
    melt: u(t, S.give[0] + 80, S.give[1] - 30),
    give,
  }
}
function LetterScene({ t, faces }) {
  const under = useRef(null)
  const over = useRef(null)
  const glass = useRef(null)
  const letter = useRef(null)
  const c = cardAt(t)
  useEffect(() => () => { if (letter.current) letter.current.dispose() }, [])
  useLayoutEffect(() => {
    // the letter itself, one side at a time, the side turned towards us:
    // kai's drawn as a card's other side is, turned by the angle less a half
    // turn and its roll the other way, so there is only ever one glass
    if (!letter.current) letter.current = new LetterGL(glass.current, faces)
    const turned = c.flip > 90
    const mv = moveOf(t)
    // the spread's heart on the letter, in the letter's own px
    const sp = AURA.spreadAt(t)
    const [hx, hy] = frameOf(panelView(t), sp.c)
    const ang = ((turned ? -c.rz : c.rz) * Math.PI) / 180
    const dx = (hx - c.x) / c.s
    const dy = (hy - c.y) / c.s
    letter.current.draw({
      face: turned ? 'kai' : 'lin',
      pose: [c.x, c.y, c.s],
      turn: [c.rx, turned ? c.ry - 180 : c.ry, turned ? -c.rz : c.rz],
      alpha: c.o,
      white: turned ? (t >= EDGE ? at([[EDGE, 0.85], [EDGE + 320, 0, 'power2.out']], t) : 0) : c.white,
      warp: mv.warp, swirl: mv.swirl, pull: mv.pull, melt: mv.melt, flow: sp.flow,
      out: [CARD_W / 2 + dx * Math.cos(ang) + dy * Math.sin(ang), CARD_H / 2 - dx * Math.sin(ang) + dy * Math.cos(ang)],
      into: srgbOf(INTO), halo: HALO_OF[turned ? 'kai' : 'lin'], haloA: 1 - mv.give,
    })
    const g = under.current.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, 1080, 1920)
    // the two, coming apart into the light
    const v = panelView(t)
    drawLeaving(g, t, v)
    // the light it throws on the dark round it, in its colour, least as it
    // goes over its edge, and less as it is given back
    const go = 0.5 * c.o * Math.abs(Math.cos((c.flip * Math.PI) / 180)) * (1 - smooth01(u(t, S.give[0], S.give[1])))
    if (go > 0.005) {
      const r = 760 * (c.s / OBJ_S)
      const col = skinOf(c.flip > 90 ? B.tint : A.tint).glow
      const grad = g.createRadialGradient(c.x, c.y - 40, 0, c.x, c.y - 40, r)
      grad.addColorStop(0, tone(col, 0.3 * go))
      grad.addColorStop(0.4, tone(col, 0.3 * 0.38 * go))
      grad.addColorStop(1, tone(col, 0))
      g.fillStyle = grad
      g.fillRect(c.x - r, c.y - 40 - r, r * 2, r * 2)
    }
    // the light it leaves on its way, where it was a moment ago, fainter
    // the longer ago, and gone as it slows
    const trail = t > S.swoosh[0] ? 1 - u(t, S.swoosh[0] + 300, S.swoosh[0] + 560) : 0
    if (trail > 0.003) {
      g.fillStyle = skinOf(c.flip > 90 ? B.tint : A.tint).lit
      for (let k = 6; k >= 1; k--) {
        g.globalAlpha = 0.2 * (1 - k / 7) * trail
        quadPath(g, cardQuad(cardAt(t - k * 20)))
        g.fill()
      }
      g.globalAlpha = 1
    }
    // over it, the light on its glass as it turns, and as it goes over its
    // edge, the edge catching the light: a line, as a screen going out is
    const o = over.current.getContext('2d')
    o.setTransform(1, 0, 0, 1, 0, 0)
    o.globalAlpha = 1
    o.globalCompositeOperation = 'source-over'
    o.clearRect(0, 0, 1080, 1920)
    drawGleam(o, c)
    const edge = Math.abs(Math.cos((c.flip * Math.PI) / 180))
    if (edge < 0.12) {
      const q = cardQuad(c)
      const top = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2]
      const foot = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2]
      const a = 1 - edge / 0.12
      const grad = o.createLinearGradient(top[0], top[1], foot[0], foot[1])
      grad.addColorStop(0, 'rgba(255,250,244,0)')
      grad.addColorStop(0.5, `rgba(255,250,244,${a.toFixed(3)})`)
      grad.addColorStop(1, 'rgba(255,250,244,0)')
      o.strokeStyle = grad
      o.lineWidth = 4
      o.lineCap = 'round'
      o.beginPath()
      o.moveTo(...top)
      o.lineTo(...foot)
      o.stroke()
    }
    // the light on its edges, once it is near enough to be held,
    // least on its edge, and gone as it is given back
    drawWrap(o, t, c, smooth01(u(t, S.swoosh[0] + 300, S.swoosh[0] + 700)) * Math.min(1, edge * 3) * (1 - u(t, S.give[0], S.give[0] + 200)))
  })
  return (
    <div className="rl-cam">
      <canvas ref={under} className="rl-panel" width="1080" height="1920" />
      <Held t={t}>
        <canvas ref={glass} className="rl-glass" width="1080" height="1920" />
        <canvas ref={over} className="rl-fx" width="1080" height="1920" />
      </Held>
      <Words t={t} of={WORDS.mutual} />
    </div>
  )
}

// ── 25 to 35: the ones that never meet, the question, the name ──────────────
// The panel again, and three notes alone on it, each going out as a screen
// does, to a line and a point, each in its own time; then the question, a
// word on each note of the song's hook, and left there; then the name, lit
// a cell at a time from its star, on the words' margin, and the address
// typed under it. The camera is held, as it always is, and comes to rest
// for the name, which is never drawn off its grid.
const LONE = [[27, 101, 'teal', 1], [111, 93, 'lilac', 1.3], [71, 115, 'white', 0.85]].map(([i, j, tint, k], n) => ({ at: envAt(onGrid(i, j)), tint, in: S.ifnot[0] + 60 + n * 90 + rnd(n + 31) * 40, out: S.lone[n], k }))
const LOCK = { x: GX + Math.round((540 - (LOCKUP.w * C) / 2 - GX) / C) * C, y: GY + 120 * C }
// the middle of the mark's star, on the frame
const STAR = { x: LOCK.x + Math.round((LOCKUP.mark.w * C) / 2), y: LOCK.y + Math.round((LOCKUP.mark.h * C) / 2) }
// the middle of the question's last word, on the frame
const YOU = [540, GY + 93 * C + 5 * 2 * C]
// every cell of the lockup, and the moment it comes on: by its distance
// from the star, a little unevenly
let LIT = null
function lockCells() {
  if (LIT) return LIT
  const word = wordCells()
  const cells = [...cellsOf(MARK), ...word.cells.map(([x, y]) => [x + LOCKUP.word.x, y])]
    .map(([x, y]) => [LOCK.x + x * C, LOCK.y + y * C])
  const span = Math.max(...cells.map(([x, y]) => Math.hypot(x - STAR.x, y - STAR.y)))
  LIT = cells.map(([x, y], i) => ({ x, y, on: S.lock[0] + (Math.hypot(x + C / 2 - STAR.x, y + C / 2 - STAR.y) / span) * (S.lock[1] - S.lock[0] - 320) + rnd(i * 7 + 3) * 80 }))
  return LIT
}
const URL_TIMES = typedUrl()

function EndScene({ t }) {
  const ref = useRef(null)
  const cells = useMemo(lockCells, [])
  const v = panelView(t)
  useLayoutEffect(() => {
    const g = ref.current.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, 1080, 1920)
    for (const l of LONE) {
      const [x, y] = frameOf(v, l.at)
      if (t < l.out) {
        const c = crtOn(t, l.in, 0.7 * l.k)
        if (!c.lit) drawDot(g, x, y, 5, c.dot * 0.6, l.tint)
        else drawEnvelope(g, { x, y, cell: C, tint: l.tint, a: 0.8, sx: c.sx, sy: c.sy, white: c.white, glow: 0.8 })
      } else {
        const o = crtOff(t, l.out, 1.1 * l.k)
        if (!o.gone) drawEnvelope(g, { x, y, cell: C, tint: l.tint, a: 0.8, sx: o.sx, sy: o.sy, white: o.white, glow: 0.8 * o.sy })
        else drawDot(g, x, y, 5, o.dot * 0.8, l.tint)
      }
    }
    // the name, a cell at a time from the star
    if (t >= S.lock[0] - 50 && t < S.lock[1] + 60) {
      g.fillStyle = CHALK
      for (const p of cells) {
        const k = on(t, p.on, 110)
        if (k <= 0) continue
        g.globalAlpha = k
        g.fillRect(p.x, p.y, C, C)
      }
      g.globalAlpha = 1
    }
  })
  return (
    <div className="rl-cam">
      <canvas ref={ref} className="rl-panel" width="1080" height="1920" />
      <Words t={t} of={WORDS.ifnot} />
      <Words t={t} of={WORDS.ask} />
      {t >= S.lock[1] ? <Lockup cell={C} className="rl-lock" style={{ left: LOCK.x, top: LOCK.y }} /> : null}
      <CellLine t={t} text={URL} times={URL_TIMES} unit="char" c={4} x={540} y={LOCK.y + LOCKUP.h * C + 56} align="center" />
    </div>
  )
}

// ── the light in the panel ──────────────────────────────────────────────────
// The panel is a screen, and light moves in it (panel-fluid.js). What the
// story places in it is colour, spreading (reel-aura.js): every note's light
// goes out round it into the dark, the two at nine go out together over the
// whole panel, and the letter comes out of it and goes back into it. Under
// it the flow is quiet: the notes give off a little of their light, three
// slow currents carry it, and it is the panel's stars, drifting from where
// they came. Nothing in it rises, and it curls only a little, so nothing in
// it reads as smoke or flame.
const TAU = Math.PI * 2
// a note's light in the flow: its tint's glow, in linear light, as full
// as `sat` makes it, `k` times
const lightOf = (tint, k = 1, sat = 1.5) => {
  const c = linear(hexRgb(skinOf(tint).glow))
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return c.map((x) => Math.max(0, y + (x - y) * sat) * k)
}
const times = (rgb, k) => rgb.map((x) => x * k)
const ICE = lightOf(A.tint, 1, 1.2)
const AMBER = lightOf(B.tint, 1, 1.2)
// the flow's steps, each a sixtieth of a second of its own time, and the
// film's moment each is taken at: a step a frame, and up to RUSH a frame
// while the clock runs through the week, so the week is seen to rush
const RUSH = 3.2
const rushAt = (t) => 1 + (RUSH - 1) * Math.sin(Math.PI * u(t, S.lapse[0], S.lapse[1])) ** 2
const FLOW_STEPS = (() => {
  const out = []
  let sim = 0
  for (let t = S.night[0]; t <= MS; t += 1) {
    sim += rushAt(t) / 1000
    while (out.length < sim * 60) out.push(t)
  }
  return out
})()
// the panel's cells, as the flow has them: the words' grid, and a margin
// of cells past the frame's edges
const PANEL = { x: GX, y: GY, c: C, margin: 6, cw: Math.ceil((1080 - GX) / C) + 12, ch: Math.ceil((1920 - GY) / C) + 12 }
// the camera on the panel at `t`, the same for the cells and for everything
// drawn on them: held, leaning in at nine, drawn back from the touch as
// the letter comes at us, and at rest for the name
function panelView(t) {
  if (t < S.lean[0]) return held(REST, t, 1)
  if (t < S.meet) return held(leanView(t), t, 1 - u(t, S.lean[0], S.lean[1]) * 0.6)
  if (t < S.ifnot[0]) {
    const v0 = leanView(S.meet)
    const k = easeOf('power2.inOut')(u(t, S.meet + 80, S.flip[0] + 200))
    return held({ a: [lerp(v0.a[0], 540, k), lerp(v0.a[1], 960, k)], f: [lerp(v0.f[0], 540, k), lerp(v0.f[1], 960, k)], z: v0.z ** (1 - k) }, t, 0.4 + 0.6 * k)
  }
  return held(REST, t, 1 - easeOf('sine.inOut')(u(t, S.qOut - 1100, S.lock[0])))
}
// a point on the frame, back on the panel
const toPanel = (v, [x, y]) => [v.a[0] + (x - v.f[0]) / v.z, v.a[1] + (y - v.f[1]) / v.z]
// where lin's and kai's are on the panel
const linAt = (t) => (t < S.lean[0] ? L_AT : t < S.meet ? pairAt(t, leanView(t).z).lin : TOUCHED.lin)
const kaiAt = (t) => (t < S.lean[0] ? K_AT : t < S.meet ? pairAt(t, leanView(t).z).kai : TOUCHED.kai)
const breath = (t) => Math.sin(((t - S.away[1]) / 1700) * TAU - Math.PI / 2) * 0.5 + 0.5
// the colours, spreading (reel-aura.js)
const AURA = makeAura({
  C, ENV_ROWS, MEET, L_AT, K_AT, LENS, OTHERS, LONE, STAR, TOUCHED, EDGE, YOU,
  REST_AT: [OBJ.x, OBJ.y], cardAt, panelView, toPanel, linAt, kaiAt, breath,
  flipEase: easeOf('rl.flip'),
  light: (tint) => ({ glow: linear(hexRgb(skinOf(tint).glow)), lit: linear(hexRgb(skinOf(tint).lit)) }),
})
// what the story does to the flow at the film's moment `t`
function flow(fl, t) {
  // how long light lasts in it, how long a push does, and how little it
  // curls: its edges stay smooth
  fl.dyeFade = t < S.ifnot[0] ? 0.42 : 0.55
  fl.velFade = 0.3
  fl.curl = 5
  // the panel is never quite still: three slow currents wander in it, each
  // drawing the flow along after it
  for (let i = 0; i < 3; i++) {
    const px = 3100 + i * 700
    const py = 2300 + i * 500
    const ph = i * 2.1
    const x = 540 + Math.sin(t / px + ph) * 380
    const y = 960 + Math.sin(t / py + ph * 1.7) * 700
    const vx = (Math.cos(t / px + ph) * 380 * 1000) / px
    const vy = (Math.cos(t / py + ph * 1.7) * 700 * 1000) / py
    fl.push(x, y, vx * 0.06, vy * 0.06, 110)
  }
  // the light the notes give off, a little at a time, for the currents to
  // carry: lin's from when it is in its place, kai's from the thursday, the
  // week's others while they are on
  if (t >= S.away[1] && t < S.touch[2]) fl.ink(...linAt(t), times(ICE, 0.0016), 14)
  if (t >= S.kaiIn + 300 && t < S.touch[2]) fl.ink(...kaiAt(t), times(AMBER, 0.0016), 14)
  for (const o of OTHERS) if (t >= o.ms + 200 && t < S.lapse[1]) fl.ink(...o.at, lightOf(o.tint, 0.0007, 1.2), 12)
  // and the spreading colours', where they are, a little
  if (t >= S.touch[2] && t < S.ifnot[0]) for (const q of AURA.inkAt(t)) fl.ink(q.x, q.y, times(q.col, 0.0008 * q.a), 30)
  // the letter going past stirs the light after it, gently
  if (t >= S.swoosh[0] && t < S.swoosh[0] + 700) {
    const v = panelView(t)
    const c = cardAt(t)
    const c0 = cardAt(t - 16)
    const [x, y] = toPanel(v, [c.x, c.y])
    const [x0, y0] = toPanel(panelView(t - 16), [c0.x, c0.y])
    fl.push(x, y, ((x - x0) / 16) * 300, ((y - y0) / 16) * 300, (c.s * 300) / v.z)
  }
  // the cut to the ones that never meet: the panel's light most of the way
  // down at once
  if (t >= S.ifnot[0] && t < S.ifnot[0] + 17) fl.fade(0, 0, 0, 0.6)
  // their light, a little, while they are on
  for (const l of LONE) if (t >= l.in + 200 && t < l.out) fl.ink(...l.at, lightOf(l.tint, 0.0007, 1.2), 12)
  // and under the question, where the star will be
  if (t >= S.ask[0] + 600 && t < S.lock[0]) fl.ink(STAR.x, STAR.y, times(ICE.map((c, i) => (c + AMBER[i]) / 2), 0.0008), 14)
}
// ── the two of them ─────────────────────────────────────────────────────────
// Two photographs over the panel (assets/reel-photo-sea.jpg and
// reel-photo-shore.jpg): two sitting side by side on a wall by the sea,
// seen from behind, as lin's note waits on the horizon in front of them and
// again where kai's letter melts; and two standing apart on a shore in the
// mist, one blurred and scribbled over, for the ones that never meet, the
// camera going in on the one left for the question. Each smooth, as a
// photograph is, graded to its scene, and faded in from the dark above it
// so the words over it are on the dark (panel-fluid.js `photo`).
let PHOTO_IMGS = null
const SEA_PHOTO = { w: 1206, h: 1236, horizon: 0.498 }
const SHORE_PHOTO = { w: 1206, h: 1205 }
// a photograph `s` times its size, its point (px, py), as fractions of it,
// at the frame's (fx, fy)
const rectOf = (P, s, px, py, fx, fy) => {
  const w = P.w * s
  const h = P.h * s
  return [fx - px * w, fy - py * h, fx - px * w + w, fy - py * h + h]
}
function photoAt(t) {
  if (!PHOTO_IMGS) return null
  // the night: in as the envelope goes away to its place on the horizon in
  // front of them, out as the week begins; a slow push in as it waits
  if (t >= S.wash[1] && t < S.dLines[1] + 300) {
    const k = smooth01(u(t, S.wash[1], S.away[1] + 300)) * (1 - smooth01(u(t, S.dLines[0] - 200, S.dLines[1] + 300)))
    const z = 1.62 * (1 + 0.04 * u(t, S.wash[1], S.dLines[1] + 300))
    return { img: PHOTO_IMGS.sea, k, rect: rectOf(SEA_PHOTO, z, 0.49, SEA_PHOTO.horizon, 540, L_AT[1]), feather: [150, 560], grade: [0.2, 1.15, 0.85], tint: [0.8, 0.92, 1.1] }
  }
  // the reveal: settling in behind kai's letter as it is read, and there
  // where it was as it melts, to the cut
  if (t >= S.flip[1] && t < S.ifnot[0]) {
    const z = 1.62 * (1.04 + 0.04 * u(t, S.flip[1], S.ifnot[0]))
    return { img: PHOTO_IMGS.sea, k: smooth01(u(t, S.flip[1], S.said)), rect: rectOf(SEA_PHOTO, z, 0.49, SEA_PHOTO.horizon, 540, L_AT[1]), feather: [100, 480], grade: [0.42, 1, 1], tint: [1.05, 0.97, 0.86] }
  }
  // the others, both in the frame; and for the question the camera going in
  // on the one left, its head kept under the words, until the light is drawn
  // in to the star
  if (t >= S.ifnot[0] && t < S.lock[0] + 50) {
    const k = smooth01(u(t, S.ifnot[0], S.ifnot[0] + 260)) * (1 - smooth01(u(t, S.qOut - 650, S.lock[0])))
    const go = easeOf('sine.inOut')(u(t, S.fLines[1], S.qWords[5] + 600))
    const z = lerp(1.3, 1.55, go)
    return {
      img: PHOTO_IMGS.shore, k, rect: rectOf(SHORE_PHOTO, z, lerp(0.555, 0.73, go), 0.26, lerp(540, 760, go), 890),
      feather: [lerp(500, 430, go), lerp(880, 860, go)], grade: [0.26, 1.1, 0.9], tint: [0.9, 0.95, 1.05],
    }
  }
  return null
}
// the panel kept darker under each scene's words, as they are up
const CLOCK_BOX = [CLOCK.x, CLOCK.day, CLOCK.x + 56 * 2 * C, CLOCK.where + 12 * C]
function shadeAt(t) {
  const out = []
  const push = (b) => { if (b) out.push(b) }
  if (t < S.date[0]) push(shadeOf(WORDS.night, t))
  else if (t < S.meet) {
    push(shadeOf(WORDS.date, t))
    const up = upOf([{ from: S.dLines[2], to: S.dOut + 120 }], t)
    if (up > 0) out.push([...CLOCK_BOX, 0.62 * up])
  } else if (t < S.ifnot[0]) push(shadeOf(WORDS.mutual, t))
  else if (t < S.ask[0]) push(shadeOf(WORDS.ifnot, t))
  else push(shadeOf(WORDS.ask, t))
  return out
}
// how the panel is shown: its unlit cells coming up after the lens, the
// light's strength, and kept darker under the words
const looksAt = (t) => ({
  grid: at([[S.away[0] + 200, 0], [S.away[1] + 100, 1, 'sine.inOut']], t),
  gain: t < S.name[0] ? 1 : lerp(1, 0.82, u(t, S.name[0], S.lock[1])),
  top: 1,
  shade: shadeAt(t),
  photo: photoAt(t),
  star: 0.85,
  lightGain: 1.25,
  lightHaze: 0.1,
  time: t / 1000,
})
// the panel itself, under every scene from the lens on: one flow for the
// whole of it, stepped to the frame and drawn through the frame's camera
function PanelGL({ t }) {
  const ref = useRef(null)
  const fluid = useRef(null)
  const live = t >= S.night[0]
  useLayoutEffect(() => {
    if (!ref.current) return
    if (!fluid.current) fluid.current = new PanelFluid(ref.current, { cells: PANEL, script: flow, steps: FLOW_STEPS })
    if (!live) return
    fluid.current.stepTo(t)
    fluid.current.render(panelView(t), looksAt(t), AURA.lightAt(t))
  })
  useEffect(() => () => { if (fluid.current) fluid.current.dispose() }, [])
  return <canvas ref={ref} className="rl-gl" width="1080" height="1920" style={live ? undefined : { visibility: 'hidden' }} />
}

// the envelope's light, over everything, as it passes the lens
function Wash({ t }) {
  const o = at([[S.wash[0], 0], [S.wash[0] + 90, 0.62, 'power2.in'], [S.wash[0] + 150, 0.55], [S.wash[1], 0, 'power2.out']], t)
  return o > 0.003 ? <span className="rl-wash" style={{ opacity: o.toFixed(3) }} /> : null
}

// ── the reel ────────────────────────────────────────────────────────────────
// the face every word is cut from, loaded before the first frame, so
// nothing is ever set in a stand in while a face is late
const FACES = ['400 40px "Jersey 10"']
let ATLAS_IMG = null
function useAtlas() {
  const [img, setImg] = useState(ATLAS_IMG)
  useEffect(() => {
    if (ATLAS_IMG) return
    const i = new Image()
    i.src = atlasUrl
    i.decode().then(() => { ATLAS_IMG = i; setImg(i) })
  }, [])
  return img
}

// the letter's two faces, photographed (films/reel-faces.jsx), loaded
// before the first frame like the atlas
let FACE_IMGS = null
function useFaces() {
  const [faces, setFaces] = useState(FACE_IMGS)
  useEffect(() => {
    if (FACE_IMGS) return
    const load = (src) => { const i = new Image(); i.src = src; return i.decode().then(() => i) }
    Promise.all([load(faceLinUrl), load(faceKaiUrl)]).then(([lin, kai]) => { FACE_IMGS = { lin, kai }; setFaces(FACE_IMGS) })
  }, [])
  return faces
}

// the two photographs, loaded before the first frame
function usePhotos() {
  const [ok, setOk] = useState(!!PHOTO_IMGS)
  useEffect(() => {
    if (PHOTO_IMGS) return
    const load = (src) => { const i = new Image(); i.src = src; return i.decode().then(() => i) }
    Promise.all([load(seaUrl), load(shoreUrl)]).then(([sea, shore]) => { PHOTO_IMGS = { sea, shore }; setOk(true) })
  }, [])
  return ok
}

export function Reel({ t }) {
  const [ok, setOk] = useState(false)
  const [mA, setMA] = useState(null)
  const atlas = useAtlas()
  const faces = useFaces()
  const photos = usePhotos()
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => setOk(true))
  }, [])
  useHold(ok && !!mA && !!atlas && !!faces && photos)
  const tA = useMemo(typedA, [])
  const ready = ok && mA
  return (
    <Board w={1080} h={1920} grain={0} className="rl-board">
      {ok ? <Measure who={A} props={LIN_PROPS} onMeasure={setMA} /> : null}
      <div className="rl-stage">
        {ready ? <PanelGL t={t} /> : null}
        {/* each scene owns exactly its own frames, and they cut */}
        {ready && atlas && t < S.night[0] ? <WallScene t={t} m={mA} times={tA} image={atlas} /> : null}
        {ready && t >= S.night[0] && t < S.meet ? <PanelScene t={t} /> : null}
        {ready && faces && t >= S.meet && t < S.ifnot[0] ? <LetterScene t={t} faces={faces} /> : null}
        {ready && t >= S.ifnot[0] ? <EndScene t={t} /> : null}
        <Wash t={t} />
      </div>
      {/* the grain, the halation and the print's grade are the finish's
          (scripts/studio-finish.mjs) */}
      <span className="st-vignette" style={{ opacity: 0.55 }} aria-hidden="true" />
    </Board>
  )
}

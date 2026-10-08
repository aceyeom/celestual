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
//  12.5    through the lens into the dark, where it goes away from us to
//          wait. `they only read it if / they send you one.`
//  15      `every mutual is / revealed on / sat 9:00 pm`, the last line a
//          clock that runs through the week; on the thursday a note comes in
//          from somewhere; at nine the camera leans in, and the two find
//          each other, wait, and touch
//  20      cut, on the touch and in its place, to lin's phone: the product's
//          own reveal. it's mutual
//  23.75   the note that came opens on lin's glass, its pixels going to
//          their places: kai's, read for the first time. `you both find out.`
//  26.25   the ones that never meet go out, each as a screen does. `if it
//          isn't, / nobody ever knows.`
//  28.75   `do they still / think about you?`
//  31.25   the name, lit a cell at a time from its star, and the address
//
// One layout throughout: the words flush left on one margin in one band at
// the top, a phone one size in one place under them, everything clear of
// the platform's own buttons and captions; and one grid, the words' cells,
// that the panel, the notes on it and the name are all on. The wall is a
// sheet of the product's own screens drawn in WebGL (wall-gl.js); the
// mutual's film is the product's (pixmark.js); the name is drawn a cell at a
// time (brand.js); the words are the phone's face (pixtype.js).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Board, Phone, PixelStory, filmOf, readyFilm, useHold, turnStyle, skinVars, hexRgb, mix, Lockup, LOCKUP, MARK } from '../kit.jsx'
import { glyphPath, skinOf } from '../../wall/looks.js'
import { cellsOf, wordCells } from '../../wall/brand.js'
import { typeCells } from '../../wall/pixtype.js'
import { MS, A, B, S, typedA, storyAt, wakeOf } from './reel-time.js'
import { WallGL, wallOf, cameraOf, boxOnto, v3, UNIT } from './wall-gl.js'
import { cellTint, cellOf } from './wall-letters.js'
import { NoteScreen, PW } from './note-screen.jsx'
import atlasUrl from '../assets/wall-atlas.jpg'
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
// The words: the phone's face, lowercase, flush left on one margin, in a
// band at the top of the frame. The objects: a phone, always this wide and
// always here, under the words and clear of the platform's buttons on the
// right and its captions at the foot.
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
// neighbour; and at `to` the line goes the same way, its first column first
const PAD = 14
function CellLine({ t, text, from = 0, times = null, step = 95, to = Infinity, x = X0, y = Y0, c = C, color = CHALK, unit = 'word' }) {
  const ref = useRef(null)
  const L = lineOf(text, unit)
  const first = times ? times[0] : from
  const live = t >= first - 40 && t <= to + 400
  useLayoutEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    g.clearRect(0, 0, cv.width, cv.height)
    g.fillStyle = color
    const when = (k) => (times ? times[Math.min(k, times.length - 1)] : from + k * step)
    for (const p of L.cells) {
      const w = L.units[p.k]
      const sweep = ((p.x - w.x0) / Math.max(1, w.x1 - w.x0)) * 70
      let a = on(t, when(p.k) + sweep + (p.j - 0.5) * 24, 45)
      if (to < Infinity) a *= 1 - on(t, to + (p.x / Math.max(1, L.w)) * 150 + (p.j - 0.5) * 30, 45)
      if (a <= 0.004) continue
      g.globalAlpha = a
      g.fillRect(PAD + p.x * c, PAD + (p.y + 10) * c, c, c)
    }
    g.globalAlpha = 1
  })
  if (!live) return null
  return <canvas ref={ref} className="rl-line" width={Math.ceil(L.w * c + PAD * 2)} height={13 * c + PAD * 2} style={{ left: x - PAD, top: y - PAD }} />
}

// the shade under the band of words, where the hall behind them is busy
const Shade = ({ o }) => (o > 0.003 ? <div className="rl-shade" style={{ opacity: o.toFixed(3) }} /> : null)

// an object placed on the frame: its middle at `x`, `y`, `s` times its size
function Place({ x, y, s, w = PW, h = 1160, z = 0, filter, opacity, children, className = '' }) {
  return (
    <div
      className={`rl-obj ${className}`}
      style={{
        width: w, zIndex: z, opacity, filter,
        transform: `translate(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px) scale(${s.toFixed(4)})`,
        transformOrigin: `${w / 2}px ${h / 2}px`,
      }}
    >
      {children}
    </div>
  )
}

// the light a lit screen throws on the room round it, in its colour
const Glow = ({ x, y, r, colour, o = 1, z = 0 }) => (o > 0.005 && r > 1 ? (
  <span className="rl-glow" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: Math.min(1, o).toFixed(3), zIndex: z, '--c': colour }} aria-hidden="true" />
) : null)
const halo = (tint) => skinVars(tint)['--s-halo']
// a print or a copy on the wall is paper, lit from outside: it throws less
const PAPER = new Set(['teal', 'acid', 'violet-yellow', 'xerox'])

// ── a note, as the phone draws it ───────────────────────────────────────────
// The envelope, in cells: the phone's own glyph (looks.js), and the same
// with its flap level and with its flap up, for a note that opens.
const glyphOf = (rows, lift = 0) => ({ cells: rows.flatMap((r, y) => [...r].flatMap((ch, x) => (ch === 'X' ? [[x, y]] : []))), w: rows[0].length, h: rows.length, lift })
const ENV = glyphPath('env')
const ENV_ROWS = (() => {
  const rows = Array.from({ length: ENV.h }, () => Array(ENV.w).fill('.'))
  for (const m of ENV.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) rows[+m[2]][+m[1]] = 'X'
  return rows.map((r) => r.join(''))
})()
const MID_ROWS = ['XXXXXXXXXXX', 'X.........X', 'X.........X', 'X.........X', 'X.........X', 'X.........X', 'XXXXXXXXXXX']
const OPEN_ROWS = ['.....X.....', '....X.X....', '...X...X...', '..X.....X..', '.X.......X.', ...MID_ROWS]
const ENVS = { closed: glyphOf(ENV_ROWS), mid: glyphOf(MID_ROWS), open: glyphOf(OPEN_ROWS, 5) }

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
// in the middle (`T`), a slow push as the last of them comes; back from it,
// and held on it and the letter under it, long enough to read that one
// too; then one move, up the hall's height and round, that lands and stops;
// then down to lin's letter as it comes away from the wall, and held.
const LETTER_FROM = [-0.2, -0.3, 3.55]
const LETTER_TO = [0, -0.02, 3.05]
// the letters the camera rests on: under lin's, and over it
const PINS = { '0,-1': cellOf('maya'), '0,1': cellOf('mei') }
const hallOf = (T) => [
  [3300, v3.add(T, LETTER_TO), T, 34, true],
  [4800, [0.02, -0.5, 4.45], [0, -0.58, 0], 36, true],
  [5650, [0.06, -0.62, 4.3], [0.01, -0.78, 0], 36, true],
  [8000, [-7, 6.5, 14.5], [3.5, 10.5, 0], 54, true],
  [10000, [0.3, 1.6, 12.6], [0, 0.9, 0], 38, true],
  [12500, [0.3, 1.62, 12.55], [0, 0.92, 0], 38, true],
]
function camAt(t, T, hall) {
  if (t < hall[0][0]) {
    const k = easeOf('sine.inOut')(u(t, 0, hall[0][0]))
    return { eye: v3.add(T, v3.lerp(LETTER_FROM, LETTER_TO, k)), target: T, fov: 34 }
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
    const dir = v3.norm(v3.sub(hall[3][2], hall[2][2]))
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
      <CellLine t={t} text="a wall of the ones" from={S.lines[0]} to={S.linesOut} />
      <CellLine t={t} text="you never told." from={S.lines[1]} to={S.linesOut + 40} y={lineAt(1)} />
      <CellLine t={t} text="or send it" from={S.sendIt} to={S.sendOut} />
      <CellLine t={t} text="privately." from={S.privately} to={S.sendOut + 40} y={lineAt(1)} />
    </div>
  )
}

// ── 12.5 to 20: the dark, a panel of cells ──────────────────────────────────
// Through the lens into the dark: the frame a screen's panel, its cells
// unlit, and the note on it, away from us to its place to wait. Then every
// mutual is revealed on saturday at nine: the sentence ends on a clock that
// runs through the week, while the week's notes come in round it, each as a
// screen comes on, and on the thursday one that is somebody's to lin. At
// nine the others go down, and the camera leans in on the two, in and down
// to where the phone's screen will be, and they find each other, wait a
// moment apart, and touch.
let TILE = null
const GRID_INK = '#15171B'
function drawGrid(g, v, alpha) {
  if (alpha <= 0.003) return
  if (!TILE) {
    TILE = document.createElement('canvas')
    TILE.width = C
    TILE.height = C
    const tg = TILE.getContext('2d')
    tg.fillStyle = GRID_INK
    tg.fillRect(0, 0, C - 1, C - 1)
  }
  g.save()
  g.globalAlpha = alpha
  g.imageSmoothingEnabled = false
  const tx = v.f[0] - v.a[0] * v.z
  const ty = v.f[1] - v.a[1] * v.z
  g.setTransform(v.z, 0, 0, v.z, tx + GX * v.z, ty + GY * v.z)
  g.fillStyle = g.createPattern(TILE, 'repeat')
  const x0 = Math.floor((-tx / v.z - GX) / C) * C - C
  const y0 = Math.floor((-ty / v.z - GY) / C) * C - C
  g.fillRect(x0, y0, 1080 / v.z + 3 * C, 1920 / v.z + 3 * C)
  g.restore()
}
// a view of the panel: its point `a` at the frame's point `f`, `z` times
const frameOf = (v, p) => [v.f[0] + (p[0] - v.a[0]) * v.z, v.f[1] + (p[1] - v.a[1]) * v.z]
const REST = { a: [540, 960], f: [540, 960], z: 1 }
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
// the two of them in the panel's own pixels: they find each other; a
// little apart they wait, coming a breath closer; and touch. The space
// between them is kept on the frame, whatever the zoom
function pairAt(t, z) {
  const near = easeOf('sine.inOut')(u(t, S.lean[0], S.touch[0]))
  const wait = lerp(16, 11, easeOf('sine.inOut')(u(t, S.touch[0], S.touch[1])))
  const space = lerp(wait, -1, easeOf('power2.in')(u(t, S.touch[1], S.touch[2])))
  const d = (11 * C * z + space) / (2 * z)
  return {
    lin: [lerp(L_AT[0], MEET[0] - d, near), lerp(L_AT[1], MEET[1], near)],
    kai: [lerp(K_AT[0], MEET[0] + d, near), lerp(K_AT[1], MEET[1], near)],
  }
}
// the week's other notes, as they come in, each a screen coming on
const OTHERS = [
  [14, 108, 'teal'], [124, 100, 'lilac'], [30, 196, 'white'], [118, 214, 'green'],
  [54, 228, 'rose'], [12, 160, 'teal'], [126, 150, 'lilac'], [84, 206, 'white'],
].map(([i, j, tint], k) => ({ at: envAt(onGrid(i, j)), tint, ms: S.others[k] }))
// the clock at the end of the sentence, through the week from monday
// morning to saturday at nine at night, quickly in the middle of the week
// and slowly into nine
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function clockAt(t) {
  const k = easeOf('power3.inOut')(u(t, S.lapse[0], S.lapse[1]))
  const m = Math.round(lerp(9 * 60 + 12, 5 * 1440 + 21 * 60, k))
  const hm = m % 1440
  const h = Math.floor(hm / 60)
  return `${DAYS[Math.min(5, Math.floor(m / 1440))]} ${((h + 11) % 12) + 1}:${String(hm % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

function PanelScene({ t }) {
  const ref = useRef(null)
  const v = t >= S.lean[0] ? leanView(t) : REST
  useLayoutEffect(() => {
    const g = ref.current.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, 1080, 1920)
    drawGrid(g, v, at([[S.away[0] + 200, 0], [S.away[1] + 100, 1, 'sine.inOut']], t))
    // the week's notes, and at nine, down
    const down = 1 - u(t, S.lapse[1], S.lapse[1] + 350)
    for (const o of OTHERS) {
      if (t < o.ms) continue
      const c = crtOn(t, o.ms, 0.8)
      const [x, y] = frameOf(v, o.at)
      if (!c.lit) { drawDot(g, x, y, 5, c.dot * 0.5 * down, o.tint); continue }
      drawEnvelope(g, { x, y, cell: C * v.z, tint: o.tint, a: 0.36 * down, sx: c.sx, sy: c.sy, white: c.white, glow: 0.55 })
    }
    // the two, and their touch
    const p = t >= S.lean[0] ? pairAt(t, v.z) : { lin: L_AT, kai: K_AT }
    const touch = t >= S.touch[2] - 12 ? 0.75 * (1 - u(t, S.touch[2] - 12, S.meet)) : 0
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
  // the clock, and once it has come to nine and stopped, where
  const clock = t >= S.lapse[1] + 150 ? `${clockAt(t)} pacific` : clockAt(t)
  const D = S.dLines[2]
  return (
    <div className="rl-cam">
      <canvas ref={ref} className="rl-panel" width="1080" height="1920" />
      <CellLine t={t} text="they only read it if" from={S.nLines[0]} to={S.nOut} />
      <CellLine t={t} text="they send you one." from={S.nLines[1]} to={S.nOut + 40} y={lineAt(1)} />
      <CellLine t={t} text="every mutual is" from={S.dLines[0]} to={S.dOut} />
      <CellLine t={t} text="revealed on" from={S.dLines[1]} to={S.dOut + 40} y={lineAt(1)} />
      <CellLine t={t} text={clock} times={[D, D + 95, D + 190, S.lapse[1] + 150]} to={S.dOut + 80} y={lineAt(2)} />
    </div>
  )
}

// ── 20 to 26.25: lin's phone ────────────────────────────────────────────────
// Cut, on the touch and where it was, to lin's phone and the product's own
// reveal, as the phone plays it, a picture every tenth of a second: they
// run in, are held on the bar the song comes in on, the glass turns rose,
// and it says it. Then the note that came: its envelope on the glass, the
// flap up, and its pixels out of it to their places, the glass turning the
// colour it was written in, and it is kai's, to lin.
const READ_KEYS = { l: { label: 'options' }, r: [{ glyph: 'heartO', label: '0', cls: 'is-heart' }] }
const KAI_TOP = { name: B.to, dear: true, icon: 'pen', stamp: '10/08/26', bat: 4 }
const KAI_PROPS = { fs: 13.4, fx: true, cursor: false, seed: A.seed, top: KAI_TOP, keys: READ_KEYS }
const LIN_PROPS = { fs: 12.6, fx: true }
// kai's letters, out of the envelope's mouth to their places on the glass,
// the first words first, each along an arc
function unfoldOf(text, env) {
  const N = text.cells.length
  const E = ENV_CELL
  return text.cells.map((c, i) => {
    const sx = env.x + (rnd(i * 11 + 5) - 0.5) * 8 * E
    const sy = env.y - 3.5 * E + rnd(i * 13 + 7) * E * 0.8
    const lift = Math.hypot(c.x - sx, c.y - sy) * (0.25 + rnd(i * 17 + 1) * 0.2)
    const t0 = S.unfold[0] + (i / N) * 380 + (rnd(i * 19 + 3) - 0.5) * 50
    return { sx, sy, ex: c.x, ey: c.y, mx: (sx + c.x) / 2, my: Math.min(sy, c.y) - lift, t0: Math.max(S.unfold[0], t0), t1: Math.min(S.unfold[1], t0 + 240 + rnd(i * 23 + 9) * 120) }
  })
}
function OpenFX({ t, mK, env }) {
  const ref = useRef(null)
  const parts = useMemo(() => unfoldOf(mK.text, env), [mK, env])
  useLayoutEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')
    g.clearRect(0, 0, cv.width, cv.height)
    if (t < S.env || t >= S.unfold[1]) return
    const turn = easeOf('sine.inOut')(u(t, S.unfold[0], S.unfold[1] + 200))
    const ink = mix(skinOf('rose').ink, skinOf(B.tint).ink, turn)
    // the envelope: on as a screen comes on, its flap up, empty as its
    // pixels leave it
    const c = crtOn(t, S.env, 1.1)
    const glyph = t < S.flap[0] ? ENVS.closed : t < S.flap[0] + 50 ? ENVS.mid : ENVS.open
    const left = 1 - u(t, S.unfold[0] + 120, S.unfold[1] - 80)
    if (!c.lit) drawDot(g, env.x, env.y, ENV_CELL * 0.8, c.dot, B.tint)
    else drawEnvelope(g, { x: env.x, y: env.y, cell: ENV_CELL, ink, a: left, glyph, sx: c.sx, sy: c.sy })
    // its letters, on their way
    const s = mK.text.k * 1.04
    g.fillStyle = ink
    for (const p of parts) {
      if (t < p.t0) continue
      const k = easeOf('power3.out')(u(t, p.t0, p.t1))
      const a = 1 - k
      g.fillRect(a * a * p.sx + 2 * a * k * p.mx + k * k * p.ex - s / 2, a * a * p.sy + 2 * a * k * p.my + k * k * p.ey - s / 2, s, s)
    }
  })
  return <canvas ref={ref} className="rl-open" width={PW} height={Math.ceil(mK.box.h)} />
}
function RevealScene({ t, film, mA, mK }) {
  const opening = t >= S.open[0]
  const st = storyAt(Math.floor(t / 100) * 100)
  const turn = clamp((st - film.times.glow) / 700)
  const unf = easeOf('sine.inOut')(u(t, S.unfold[0], S.unfold[1] + 200))
  const env = useMemo(() => envOn(mA), [mA])
  return (
    <div className="rl-cam">
      <Held t={t}>
        <Glow x={OBJ.x} y={OBJ.y - 40} r={760} colour={opening ? halo(B.tint) : halo('rose')} o={(opening ? 0.45 : 0.55 * turn) * on(t, S.meet, 120)} />
        <Place x={OBJ.x} y={OBJ.y} s={OBJ_S}>
          {opening ? (
            <>
              <NoteScreen who={B} t={1e6} times={ALL_B} sendAt={1e9} quiet={false} {...KAI_PROPS} tint={B.tint} hide={t < S.unfold[1]} screenStyle={{ '--mu-turn': unf, ...turnStyle('rose', B.tint) }} />
              <OpenFX t={t} mK={mK} env={env} />
            </>
          ) : (
            <Phone w={PW} mode="bare" square seed={A.seed} tint="rose" quiet={false} top={{ bat: 4 }} keys={READ_KEYS} className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle(A.tint, 'rose') }}>
              <PixelStory story={film} at={st} />
            </Phone>
          )}
        </Place>
      </Held>
      <CellLine t={t} text="you both find out." from={S.both} to={S.oOut} />
    </div>
  )
}
const ALL_B = new Array([...B.text].length).fill(0)

// ── 26.25 to 35: the ones that never meet, the question, the name ───────────
// The panel again, and three notes alone on it, each going out as a screen
// does, to a line and a point; then the question, a word on each note of
// the song's hook; then the name, lit a cell at a time from its star, on
// the words' margin, and the address typed under it.
const LONE = [[27, 111, 'teal'], [111, 137, 'lilac'], [57, 180, 'white']].map(([i, j, tint], k) => ({ at: envAt(onGrid(i, j)), tint, in: S.ifnot[0] + 60 + k * 80, out: S.lone[k] }))
const LOCK = { x: X0, y: GY + 120 * C }
// the middle of the mark's star, on the frame
const STAR = { x: LOCK.x + Math.round((LOCKUP.mark.w * C) / 2), y: LOCK.y + Math.round((LOCKUP.mark.h * C) / 2) }
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
const URL_TIMES = [...'celestual.us'].map((_, k) => S.url + 20 + k * 38)

function EndScene({ t }) {
  const ref = useRef(null)
  const cells = useMemo(lockCells, [])
  useLayoutEffect(() => {
    const g = ref.current.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, 1080, 1920)
    drawGrid(g, REST, 1)
    for (const l of LONE) {
      const [x, y] = l.at
      if (t < l.out) {
        const c = crtOn(t, l.in, 0.7)
        if (!c.lit) drawDot(g, x, y, 5, c.dot * 0.6, l.tint)
        else drawEnvelope(g, { x, y, cell: C, tint: l.tint, a: 0.8, sx: c.sx, sy: c.sy, white: c.white, glow: 0.8 })
      } else {
        const o = crtOff(t, l.out, 1.1)
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
  const Q = S.qWords
  return (
    <div className="rl-cam">
      <canvas ref={ref} className="rl-panel" width="1080" height="1920" />
      <CellLine t={t} text="if it isn’t," from={S.fLines[0]} to={S.fOut} />
      <CellLine t={t} text="nobody ever knows." from={S.fLines[1]} to={S.fOut + 40} y={lineAt(1)} />
      <CellLine t={t} text="do they still" times={Q.slice(0, 3)} to={S.qOut} />
      <CellLine t={t} text="think about you?" times={[Q[3], Q[4], Q[5]]} to={S.qOut + 40} y={lineAt(1)} />
      {t >= S.lock[1] ? <Lockup cell={C} className="rl-lock" style={{ left: LOCK.x, top: LOCK.y }} /> : null}
      <CellLine t={t} text="celestual.us" times={URL_TIMES} unit="char" c={4} y={LOCK.y + LOCKUP.h * C + 56} />
    </div>
  )
}

// the envelope's light, over everything, as it passes the lens
function Wash({ t }) {
  const o = at([[S.wash[0], 0], [S.wash[0] + 90, 0.62, 'power2.in'], [S.wash[0] + 150, 0.55], [S.wash[1], 0, 'power2.out']], t)
  return o > 0.003 ? <span className="rl-wash" style={{ opacity: o.toFixed(3) }} /> : null
}

// ── the reel ────────────────────────────────────────────────────────────────
// the face every word is cut from, and the stories' own, loaded before the
// first frame, so nothing is ever set in a stand in while a face is late
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

export function Reel({ t }) {
  const [ok, setOk] = useState(false)
  const [mA, setMA] = useState(null)
  const [mK, setMK] = useState(null)
  const atlas = useAtlas()
  useEffect(() => {
    Promise.all([readyFilm(A.name, B.name), ...FACES.map((f) => document.fonts.load(f))]).then(() => setOk(true))
  }, [])
  useHold(ok && !!mA && !!mK && !!atlas)
  const film = ok ? filmOf(A.name, B.name, 'rose') : null
  const tA = useMemo(typedA, [])
  const ready = ok && mA && mK
  return (
    <Board w={1080} h={1920} grain={0} className="rl-board">
      {ok ? <Measure who={A} props={LIN_PROPS} onMeasure={setMA} /> : null}
      {ok ? <Measure who={B} props={KAI_PROPS} onMeasure={setMK} /> : null}
      <div className="rl-stage">
        {/* each scene owns exactly its own frames, and they cut */}
        {ready && atlas && t < S.night[0] ? <WallScene t={t} m={mA} times={tA} image={atlas} /> : null}
        {ready && t >= S.night[0] && t < S.meet ? <PanelScene t={t} /> : null}
        {ready && film && t >= S.meet && t < S.ifnot[0] ? <RevealScene t={t} film={film} mA={mA} mK={mK} /> : null}
        {ready && t >= S.ifnot[0] ? <EndScene t={t} /> : null}
        <Wash t={t} />
      </div>
      {/* the grain, the halation and the print's grade are the finish's
          (scripts/studio-finish.mjs) */}
      <span className="st-vignette" style={{ opacity: 0.55 }} aria-hidden="true" />
    </Board>
  )
}

// ── the reel ────────────────────────────────────────────────────────────────
//
// Thirty five seconds at 96 beats a minute (reel-time.js), drawn from `t` and
// nothing else, so scripts/studio-film.mjs can photograph it a frame at a
// time, cut to its own song (scripts/studio-score.mjs). One story and one
// image for it: a feeling is a light. A letter is a lit screen; a note sent
// privately goes up as a small lit screen of its own, sealed; two that meet
// are a mutual; the ones that never meet go out, and nobody knows; and the
// last thing on the frame is an empty letter, the viewer's own.
//
//   0      lin's note on the glass: `i love`, a hesitation, `d`
//   3.75   one shot: back from the glass along the wall, a letter read in
//          passing, up the hall's height to a stop. `a wall of / the ones
//          you / never told.` lin's letter comes away to the camera
//  10      `or send it / privately.` sent; the screen goes dark; it goes up
//  12.5    somewhere else, kai, who has not read it, writes one too.
//          `they only read it / if they send you / one too.`
//  16.25   the two among everyone's, and a board. `every mutual is /
//          revealed on` sat, 9:00 pm, pacific. the two come close, wait,
//          touch
//  20      cut: the product's own reveal on the phone; it's mutual
//  23.75   cut: both notes. `you both / find out.`
//  26.25   theirs goes; the ones alone go out. `if it isn't, / nobody ever /
//          knows.`
//  28.75   `do they still / think about / you?` over an empty letter of the
//          viewer's own, `dear`, its cursor waiting; then the name under it
//
// One layout throughout: the words flush left on one margin in one band at
// the top, the phones one size in one place under them, everything clear of
// the platform's own buttons and captions. The wall is a sheet of the
// product's own screens drawn in WebGL (wall-gl.js); the mutual's film is
// the product's (pixmark.js); the lockup is drawn a cell at a time
// (brand.js). GSAP sets the words (SplitText) and draws the curves.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { Board, Phone, PixelStory, filmOf, readyFilm, useHold, turnStyle, skinVars, hexRgb, Lockup, LOCKUP, MARK } from '../kit.jsx'
import { glyphPath, skinOf } from '../../wall/looks.js'
import { cellsOf, wordCells } from '../../wall/brand.js'
import { MS, A, B, S, typedA, typedB, storyAt, wakeOf } from './reel-time.js'
import { WallGL, wallOf, cameraOf, boxOnto, v3, UNIT } from './wall-gl.js'
import { cellTint, cellOf } from './wall-letters.js'
import { NoteScreen, PW } from './note-screen.jsx'
import atlasUrl from '../assets/wall-atlas.jpg'
import './reel.css'

export { MS }

gsap.registerPlugin(SplitText, CustomEase)

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
// the camera on the flat scenes, held as the hall's is: a slow drift of a
// pixel or two and a breath of roll, one drift through all of them, so a
// cut from one to the next keeps its place. The words are laid over the
// picture, as a film's titles are, and keep still
const Held = ({ t, children }) => (
  <div className="rl-cam rl-held" style={{ transform: `translate(${(shake(t, 21) * 1.6).toFixed(2)}px, ${(shake(t, 27) * 1.9).toFixed(2)}px) rotate(${(shake(t, 33) * 0.1).toFixed(3)}deg)` }}>
    {children}
  </div>
)

// A screen coming on: its backlight up in a few frames, the way an LCD's
// does, with a breath of unevenness, never a strobe
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

// ── a scene's timeline ──────────────────────────────────────────────────────
// Built once on the scene's own nodes, paused, and put at the reel's moment
// on every frame, before the frame is drawn. The context takes everything
// GSAP did (SplitText's words included) back when the scene goes.
function useScene(t, build) {
  const root = useRef(null)
  const tl = useRef(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => { tl.current = build(root.current) }, root)
    return () => { ctx.revert(); tl.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (tl.current) tl.current.seek(t / 1000, false) })
  return root
}

// ── the layout ──────────────────────────────────────────────────────────────
// The words: the display face, lowercase, flush left on one margin, in a
// band at the top of the frame. The objects: a phone, always this wide and
// always here, under the words and clear of the platform's buttons on the
// right and its captions at the foot.
export const X0 = 80
export const Y0 = 236
export const M = 132
export const XL = 210
const LH = 0.9
export const lineAt = (n) => Y0 + Math.round(n * M * LH)
const OBJ = { x: 540, y: 1090, w: 640 }
const OBJ_S = OBJ.w / PW

// ── the words ───────────────────────────────────────────────────────────────
// A line comes on its beat, as a word is said: its words up out of nothing
// in a few frames, one after another so quickly they are one gesture, and
// go the same way before their scene does. Nothing blurs. The italic is
// kept for the two lines that carry the film: `never told.` and `you?`.
// `times` puts each word on its own moment (the question, on its notes).
const Words = memo(function Words({ text, italic }) {
  return <span className={`rl-set${italic ? ' is-it' : ''}`}>{text}</span>
})
export function Type({ t, from, to = Infinity, times = null, ...rest }) {
  const first = times ? times[0] : from
  if (t < first - 60 || t > to + 300) return null
  return <TypeLive t={t} from={first} to={to} times={times} {...rest} />
}
function TypeLive({ t, text, from, to, times, size = M, italic = false, x = X0, y = Y0, w = 1080 - x }) {
  const root = useScene(t, (el) => {
    const split = new SplitText(el.querySelector('.rl-set'), { type: 'words', wordsClass: 'rl-w', tag: 'span' })
    const tl = gsap.timeline({ paused: true })
    const show = { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }
    if (times) split.words.forEach((wd, k) => tl.fromTo(wd, { opacity: 0, y: 7 }, show, times[Math.min(k, times.length - 1)] / 1000))
    else tl.fromTo(split.words, { opacity: 0, y: 7 }, { ...show, stagger: 0.035 }, from / 1000)
    if (to < Infinity) tl.to(split.words, { opacity: 0, y: -4, duration: 0.13, ease: 'power1.in', stagger: 0.02 }, to / 1000)
    return tl
  })
  return (
    <div ref={root} className="rl-type" style={{ left: x, top: y, width: w, fontSize: size }}>
      <Words text={text} italic={italic} />
    </div>
  )
}
// the shade under the band of words, where what is behind them is busy
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

// ── a sealed note, as a light ───────────────────────────────────────────────
// Not an orb: a small lit screen, the phone's own, in its writer's colour,
// the envelope on it in its ink, and the little light such a screen throws.
const ENV = glyphPath('env')
function NoteLight({ x, y, s = 1, o = 1, tint = 'ice', z = 12 }) {
  if (o <= 0.003 || s <= 0.01) return null
  const sk = skinOf(tint)
  const w = 40 * s
  const h = w * 1.16
  const g = Math.max(6, w * 0.7)
  return (
    <span
      className="rl-lcd"
      style={{
        left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: Math.min(1, o).toFixed(3), zIndex: z,
        background: `linear-gradient(${sk.hi}, ${sk.mid})`, boxShadow: `0 0 ${g.toFixed(1)}px ${tone(sk.glow, 0.55)}, 0 0 ${(g * 2.4).toFixed(1)}px ${tone(sk.glow, 0.18)}`,
      }}
      aria-hidden="true"
    >
      {w > 16 ? (
        <svg viewBox={`0 0 ${ENV.w} ${ENV.h}`} shapeRendering="crispEdges" style={{ width: w * 0.46, height: (w * 0.46 * ENV.h) / ENV.w }}>
          <path d={ENV.d} fill={sk.ink} />
        </svg>
      ) : null}
    </span>
  )
}

// ── 0 to 12.5: the letter, the hall, the send. one shot ─────────────────────
// lin's phone at the reel's size, laid out once and unseen, so every letter's
// place is known before the first frame, and the envelope's place on the
// glass once it has gone
function Measure({ who, times, onMeasure }) {
  const ref = useRef(null)
  const chars = useRef(null)
  const [done, setDone] = useState(false)
  useLayoutEffect(() => {
    if (done || !chars.current || !ref.current) return
    const root = ref.current.querySelector('.rl-sent .st-phone')
    const env = root && root.querySelector('.wl-scr-note .wl-px')
    if (!env) return
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const r = env.getBoundingClientRect()
    onMeasure({ ...chars.current, env: { x: (r.left - r0.left + r.width / 2) / k, y: (r.top - r0.top + r.height / 2) / k, w: r.width / k } })
    setDone(true)
  }, [done, onMeasure])
  if (done) return null
  return (
    <div className="rl-measure" ref={ref} aria-hidden="true">
      <NoteScreen who={who} t={99999} times={times} sendAt={1e9} fs={12.6} quiet={false} onMeasure={(m, box) => { chars.current = { m, box } }} />
      <div className="rl-sent"><NoteScreen who={who} t={1e6} times={times} sendAt={0} fs={12.6} quiet={false} /></div>
    </div>
  )
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

function WallScene({ t, m, times, image }) {
  const canvas = useRef(null)
  const gl = useRef(null)
  const letters = useMemo(() => wallOf((cell) => hexRgb(skinOf(cellTint(cell)).glow).map((x) => (x / 255) * (PAPER.has(cellTint(cell)) ? 0.45 : 1)), PINS), [])
  const home = useMemo(() => letters.findIndex((l) => l.home), [letters])
  const lit = useMemo(() => new Float32Array(letters.length), [letters])
  const glow = useMemo(() => new Float32Array(letters.length), [letters])
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
  const at = (px, py) => {
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
  // the hall goes down to the dark once the note has gone
  const leave = 1 - 0.9 * easeOf('sine.inOut')(u(t, S.rise - 200, S.send[1] - 300))
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
    at(0, 0), at(m.box.w, 0), at(m.box.w, m.box.h), at(0, m.box.h),
  ].map(cam.project)
  const ok = corners.every(Boolean)
  const wpx = ok ? Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) : 0
  const mid = ok ? [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2] : [540, 960]
  // the screen goes dark once its note has gone, as a phone's does
  const dark = u(t, S.rise, S.rise + 180)
  // the note going up, as a small lit screen, from the envelope on the glass
  const E0 = at(m.env.x, m.env.y)
  const riseK = easeOf('sine.inOut')(u(t, S.rise, S.send[1] + 300))
  const E = v3.add(E0, v3.add(v3.scale(cam.up, 0.62 * riseK), v3.scale(cam.fwd, 0.5 * riseK)))
  const pe = t >= S.rise ? cam.project(E) : null
  const es = pe ? Math.min(1.25, ((m.env.w / m.box.w) * wpx * 1.15) / 40) * ((cam.project(E0) || pe)[2] / pe[2]) : 0
  const shade = Math.max(
    u(t, S.lines[0] - 100, S.lines[0] + 200) * (1 - u(t, S.linesOut + 100, S.linesOut + 400)),
    u(t, S.sendIt - 100, S.sendIt + 200) * (1 - u(t, S.sendOut + 100, S.sendOut + 400)),
  )
  return (
    <div className="rl-cam">
      <canvas ref={canvas} className="rl-wall" width="1080" height="1920" />
      <Glow x={mid[0]} y={mid[1]} r={Math.max(80, wpx * 1.1)} colour={halo('ice')} o={0.55 * (1 - 0.8 * u(t, 4000, 5600)) * (1 - dark)} z={2} />
      {ok && wpx > 2 ? (
        <div className={`rl-lin${t >= S.rise ? ' is-gone' : ''}`} style={{ transform: boxOnto(m.box.w, m.box.h, corners), filter: dark > 0 ? `brightness(${(1 - 0.94 * dark).toFixed(3)})` : undefined }}>
          <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} quiet={false} />
        </div>
      ) : null}
      {pe ? <NoteLight x={pe[0]} y={pe[1]} s={es} o={u(t, S.rise, S.rise + 90)} tint="ice" /> : null}
      <Shade o={shade} />
      <Type t={t} text="a wall of" from={S.lines[0]} to={S.linesOut} />
      <Type t={t} text="the ones you" from={S.lines[1]} to={S.linesOut + 40} y={lineAt(1)} />
      <Type t={t} text="never told." from={S.lines[2]} to={S.linesOut + 80} y={lineAt(2)} size={XL} italic />
      <Type t={t} text="or send it" from={S.sendIt} to={S.sendOut} />
      <Type t={t} text="privately." from={S.privately} to={S.sendOut + 40} y={lineAt(1)} />
    </div>
  )
}

// ── 12.5 to 16.25: kai ──────────────────────────────────────────────────────
// Somewhere else, in the dark, kai's screen comes on. Kai has not read lin's
// and cannot: kai writes one of one's own, to lin, sends it privately; the
// screen goes dark and its envelope goes up as kai's light. Then the line.
function KaiScene({ t, times, env }) {
  const w = on(t, S.kWake + 40, 160) * (t < S.kWake + 140 ? 1 : 0.85 + 0.15 * on(t, S.kWake + 230, 120))
  const dark = u(t, S.kRise, S.kRise + 180)
  // the envelope's place on the frame, and the light from there, up
  const ex = OBJ.x + (env.x - PW / 2) * OBJ_S
  const ey = OBJ.y + (env.y - 580) * OBJ_S
  const riseK = easeOf('sine.inOut')(u(t, S.kRise, S.kai[1] + 300))
  const ky = lerp(ey, KAI_END.y, riseK)
  const kx = lerp(ex, KAI_END.x, riseK)
  return (
    <div className="rl-cam">
      <Held t={t}>
        <Glow x={OBJ.x} y={OBJ.y} r={720} colour={halo('amber')} o={0.75 * w * (1 - dark)} />
        <Place x={OBJ.x} y={OBJ.y} s={OBJ_S} className={t >= S.kRise ? 'is-gone' : ''} filter={`brightness(${(w * (1 - 0.94 * dark)).toFixed(3)})`}>
          <NoteScreen who={B} t={t} times={times} sendAt={S.kSend} fs={13.4} quiet={false} />
        </Place>
        {t >= S.kRise ? <NoteLight x={kx} y={ky} s={lerp(1.2, 1, riseK)} o={u(t, S.kRise, S.kRise + 90)} tint="amber" /> : null}
      </Held>
      <Type t={t} text="they only read it" from={S.kRead} to={S.kOut} />
      <Type t={t} text="if they send you" from={S.kIf} to={S.kOut + 40} y={lineAt(1)} />
      <Type t={t} text="one too." from={S.kOne} to={S.kOut + 80} y={lineAt(2)} />
    </div>
  )
}
// where kai's light is when the scene ends, and the night's begins
const KAI_END = { x: 540, y: 820 }

// ── 16.25 to 20: everyone's, and the board ──────────────────────────────────
// Every note this week is a small lit screen in the dark. The camera comes
// back from kai's until there are hundreds; lin's is one of them. A board
// under them turns through the week to the one moment every mutual is
// revealed: the sentence the words begin, the board ends. Then the two find
// each other, wait a moment a little apart, and touch, and the camera leans
// in and down on them as they do, so where they touch is where the phone's
// screen is when the film cuts to it.
const NIGHT = { x: 540, y: 820 }
// lin's and kai's on the plane (frame pixels at zoom one, from `NIGHT`), and
// where they meet
const LIN_AT = [-250, -170]
const KAI_AT = [190, -80]
const MEET = [0, -40]
// the reveal's screen on the frame, its middle, where they touch
const SCREEN_AT = [540, 1050]
// how far a point is from a stretch of road
function off(p, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const k = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))
  return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy)
}
// Where people are: a few towns, close lit in their middles and thinning
// out, and the country between them lit here and there, as a night looks
// from the air. Placed, not scattered: fewer and fewer up under the words,
// none in the two's way, the dark round them kept dark.
const TOWNS = [
  { x: 480, y: 420, r: 190, n: 5 },
  { x: -560, y: -170, r: 120, n: 3 },
  { x: 300, y: 1250, r: 210, n: 5 },
  { x: -380, y: 1460, r: 150, n: 3 },
  { x: 650, y: -430, r: 110, n: 2 },
  { x: 210, y: 660, r: 80, n: 1 },
  { x: -820, y: 520, r: 110, n: 2 },
]
const FIELD = (() => {
  const tints = ['night', 'ice', 'negative', 'amber', 'white', 'teal', 'rose', 'lilac', 'green', 'xerox']
  const weight = TOWNS.reduce((n, tw) => n + tw.n, 0)
  const clear = (p, i) => off(p, LIN_AT, MEET) > 70 && off(p, [0, 0], KAI_AT) > 70 && off(p, KAI_AT, MEET) > 70 && rnd(i * 43 + 17) < Math.exp((p[1] + 520) / 140)
  const out = []
  for (let i = 0; out.length < 320 && i < 2000; i++) {
    let p
    if (rnd(i * 19 + 7) < 0.72) {
      // a town, by its size, and a place in it, close in the middle
      let pick = rnd(i * 41 + 11) * weight
      const tw = TOWNS.find((x) => (pick -= x.n) < 0) || TOWNS[0]
      const a = Math.sqrt(-2 * Math.log(1 - 0.995 * rnd(i * 31 + 1)))
      const b = 6.2832 * rnd(i * 37 + 2)
      p = [tw.x + a * Math.cos(b) * tw.r, tw.y + a * Math.sin(b) * tw.r]
    } else {
      p = [(rnd(i * 3 + 1) - 0.5) * 2000, -1400 + rnd(i * 7 + 2) * 3250]
    }
    if (!clear(p, i)) continue
    out.push({ x: p[0], y: p[1], w: 4 + rnd(i * 5 + 3) ** 2.2 * 10, tint: tints[i % tints.length], lum: 0.3 + rnd(i * 11 + 4) * 0.6, ph: rnd(i * 13 + 6) * 6.28 })
  }
  return out
})()
// The night's camera: a point of the plane (`c`) held at a point of the
// frame (`f`), and a zoom. Back from kai's light; then in and down on the
// two as they find each other, so the point they meet at comes to the
// screen's place, evenly in its size
const LEAN = [18900, S.meet]
function nightCam(t) {
  const back = at([[S.wait[0], 1], [S.wait[0] + 1600, 0.62, 'rl.glide']], t)
  const k = easeOf('sine.inOut')(u(t, LEAN[0], LEAN[1]))
  return {
    z: back * (2.2 / 0.62) ** k,
    c: [MEET[0] * k, MEET[1] * k],
    f: [lerp(NIGHT.x, SCREEN_AT[0], k), lerp(NIGHT.y, SCREEN_AT[1], k)],
  }
}
const onFrame = (p, cam) => [cam.f[0] + (p[0] - cam.c[0]) * cam.z, cam.f[1] + (p[1] - cam.c[1]) * cam.z]
// a light's size on the frame at a zoom: it grows as the camera comes in,
// though less than the night round it does
const nightS = (z) => 0.5 + 0.5 * z
// The two of them: kai's from where the last scene left it, lin's in its
// place. They find each other; a little apart they wait, a breath, coming
// a little closer; and touch. The space between them is kept on the frame,
// in pixels, whatever the zoom
function pairAt(t, z) {
  const settle = easeOf('rl.glide')(u(t, S.wait[0], S.wait[0] + 1600))
  const kai = [lerp(KAI_END.x - NIGHT.x, KAI_AT[0], settle), lerp(KAI_END.y - NIGHT.y, KAI_AT[1], settle)]
  const near = easeOf('sine.inOut')(u(t, LEAN[0], S.touch[0]))
  const wait = lerp(16, 11, easeOf('sine.inOut')(u(t, S.touch[0], S.touch[1])))
  const space = lerp(wait, -1, easeOf('power2.in')(u(t, S.touch[1], S.touch[2])))
  const gap = (40 * nightS(z) + space) / (2 * z)
  return {
    lin: [lerp(LIN_AT[0], MEET[0] - gap, near), lerp(LIN_AT[1], MEET[1], near)],
    kai: [lerp(kai[0], MEET[0] + gap, near), lerp(kai[1], MEET[1], near)],
  }
}
function Field({ t, cam, o }) {
  const canvas = useRef(null)
  useLayoutEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, 1080, 1920)
    if (o <= 0.002) return
    for (const f of FIELD) {
      const [fx, fy] = onFrame([f.x, f.y], cam)
      const w = Math.max(2, f.w * (0.45 + 0.55 * cam.z))
      if (fx < -w * 2 || fx > 1080 + w * 2 || fy < -w * 2 || fy > 1920 + w * 2) continue
      const sk = skinOf(f.tint)
      const a = o * f.lum * (0.9 + 0.1 * Math.sin(t / 1700 + f.ph))
      const r = w * 1.8
      const grad = g.createRadialGradient(fx, fy, 0, fx, fy, r)
      grad.addColorStop(0, tone(sk.glow, 0.32 * a))
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(fx - r, fy - r, r * 2, r * 2)
      // where it is, not the nearest pixel to it, so it moves smoothly
      g.globalAlpha = a
      g.fillStyle = sk.mid
      g.fillRect(fx - w / 2, fy - w * 0.58, w, w * 1.16)
      g.globalAlpha = 1
    }
  })
  return <canvas ref={canvas} className="rl-field" width="1080" height="1920" />
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const TIME = '9:00 pm'
const FL = { top: 1060, cw: 120, ch: 168, gap: 10 }
const TR = { top: FL.top + FL.ch + 16, h: 120, w: 80, colon: 46, space: 22, gap: 7 }
const timeW = (c) => (c === ':' ? TR.colon : c === ' ' ? TR.space : TR.w)

// One flap of a board: the card turning down from the last character to
// the next, its upper half falling over the hinge and the lower half of the
// next landing after it
function Flap({ seq, times, t, w, h, size }) {
  let k = -1
  while (k + 1 < times.length && times[k + 1] <= t) k++
  const cur = k >= 0 ? seq[k] : ' '
  const prev = k >= 1 ? seq[k - 1] : ' '
  const p = k >= 0 ? clamp((t - times[k]) / 130) : 1
  const ch = (c) => <span className="rl-flap-ch" style={{ height: h, lineHeight: `${h}px`, fontSize: size }}>{c}</span>
  const upper = (c) => <div className="rl-flap-half is-top" style={{ height: h / 2 }}>{ch(c)}</div>
  const lower = (c) => <div className="rl-flap-half is-bot" style={{ height: h / 2, top: h / 2 }}><div style={{ marginTop: -h / 2 }}>{ch(c)}</div></div>
  return (
    <div className="rl-flap" style={{ width: w, height: h }}>
      {upper(cur)}
      {lower(p < 1 ? prev : cur)}
      {p < 0.5 ? (
        <div className="rl-flap-half is-top is-fold" style={{ height: h / 2, transform: `perspective(${h * 4}px) rotateX(${(-180 * p).toFixed(1)}deg)`, filter: `brightness(${(1 - p * 0.9).toFixed(3)})` }}>{ch(prev)}</div>
      ) : null}
      {p >= 0.5 && p < 1 ? (
        <div className="rl-flap-half is-bot is-fold" style={{ height: h / 2, top: h / 2, transform: `perspective(${h * 4}px) rotateX(${(180 * (1 - p)).toFixed(1)}deg)`, filter: `brightness(${(0.5 + p * 0.5).toFixed(3)})` }}><div style={{ marginTop: -h / 2 }}>{ch(cur)}</div></div>
      ) : null}
      <span className="rl-flap-hinge" style={{ top: h / 2 - 1 }} />
    </div>
  )
}

function WaitScene({ t }) {
  const cam = nightCam(t)
  const { lin, kai } = pairAt(t, cam.z)
  const lp = onFrame(lin, cam)
  const kp = onFrame(kai, cam)
  const s = nightS(cam.z)
  const board = u(t, S.days[0] - 250, S.days[0] + 50) * (1 - u(t, S.wOut + 60, S.wOut + 260))
  return (
    <div className="rl-cam">
      <Held t={t}>
        <Field t={t} cam={cam} o={u(t, S.wait[0] + 250, S.wait[0] + 1300)} />
        <NoteLight x={lp[0]} y={lp[1]} s={s} o={u(t, S.wait[0] + 400, S.wait[0] + 1100)} tint="ice" />
        <NoteLight x={kp[0]} y={kp[1]} s={s} tint="amber" />
      </Held>
      <div className="rl-cam" style={{ opacity: board.toFixed(3) }}>
        <div className="rl-flaps" style={{ top: FL.top, gap: FL.gap, left: X0 }}>
          {[0, 1, 2].map((c) => (
            <Flap key={c} seq={DAYS.map((x) => x[c])} times={S.days.map((x) => x + c * 24)} t={t} w={FL.cw} h={FL.ch} size={150} />
          ))}
        </div>
        <div className="rl-flaps" style={{ top: TR.top, gap: TR.gap, left: X0 }}>
          {[...TIME].map((c, i) => (c !== ' ' && t >= S.time + i * 40 ? (
            <Flap key={i} seq={[c]} times={[S.time + i * 40]} t={t} w={timeW(c)} h={TR.h} size={108} />
          ) : <span key={i} style={{ width: timeW(c), flex: 'none' }} />))}
        </div>
        <p className="rl-label" style={{ top: TR.top + TR.h + 26, left: X0, opacity: on(t, S.place, 120) }}>pacific.</p>
      </div>
      <Type t={t} text="every mutual is" from={S.wLine[0]} to={S.wOut} />
      <Type t={t} text="revealed on" from={S.wLine[1]} to={S.wOut + 40} y={lineAt(1)} />
    </div>
  )
}

// ── 20 to 23.75: nine o'clock ───────────────────────────────────────────────
// Cut, on the touch, to the phone: the product's own reveal, as the phone
// plays it, a picture every tenth of a second; they run in, are held on the
// bar the song comes in on, the glass turns rose, and it says it.
function RevealScene({ t, film }) {
  const st = storyAt(Math.floor(t / 100) * 100)
  const turn = clamp((st - film.times.glow) / 700)
  return (
    <Held t={t}>
      <Place x={OBJ.x} y={OBJ.y} s={OBJ_S}>
        <Phone w={PW} mode="bare" square seed="intro" tint="rose" className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}>
          <PixelStory story={film} at={st} />
        </Phone>
      </Place>
    </Held>
  )
}

// ── 23.75 to 26.25: you both find out ───────────────────────────────────────
// Cut, on the bar, to the two notes side by side, each read at last by the
// other: lin's to kai and kai's to lin, as they were sent
const NOTE_KEYS = {}
const LIN_TOP = { name: A.to, dear: true, icon: 'pen', stamp: '10/10/26', bat: 4 }
const KAI_TOP = { name: B.to, dear: true, icon: 'pen', stamp: '10/10/26', bat: 4 }
const LinNote = memo(function LinNote() {
  return <Phone w={PW} tint={A.tint} seed="note-lin" mode="letter" square quiet={false} top={LIN_TOP} keys={NOTE_KEYS} text={A.text} cursor={false} />
})
const KaiNote = memo(function KaiNote() {
  return <Phone w={PW} tint={B.tint} seed="note-kai" mode="letter" square quiet={false} top={KAI_TOP} keys={NOTE_KEYS} text={B.text} cursor={false} />
})
const PAIR = { s: 0.36, y: 1090, x: [300, 740] }
function NotesScene({ t }) {
  // each comes on as a screen does, kai's a breath after lin's
  const a = on(t, S.notes[0], 90)
  const b = on(t, S.notes[0] + 140, 90)
  return (
    <div className="rl-cam">
      <Held t={t}>
        <Glow x={PAIR.x[0]} y={PAIR.y} r={330} colour={halo('ice')} o={0.4 * a} />
        <Glow x={PAIR.x[1]} y={PAIR.y} r={330} colour={halo('amber')} o={0.4 * b} />
        <Place x={PAIR.x[0]} y={PAIR.y} s={PAIR.s} opacity={a.toFixed(3)}><LinNote /></Place>
        <Place x={PAIR.x[1]} y={PAIR.y} s={PAIR.s} opacity={b.toFixed(3)}><KaiNote /></Place>
      </Held>
      <Type t={t} text="you both" from={S.both} to={S.nOut} />
      <Type t={t} text="find out." from={S.both + 312} to={S.nOut + 40} y={lineAt(1)} />
    </div>
  )
}

// ── 26.25 to 28.75: the ones that never meet ────────────────────────────────
// The two of them, one light now, go away from us; three that were alone
// are left, and go out one at a time, and then nothing.
const LONE = [
  { x: 250, y: 830, tint: 'teal', out: S.lone[0] },
  { x: 770, y: 980, tint: 'lilac', out: S.lone[1] },
  { x: 470, y: 1270, tint: 'white', out: S.lone[2] },
]
function IfNotScene({ t }) {
  // theirs goes away from us, smaller and fainter, in its place
  const away = easeOf('power2.in')(u(t, S.ifnot[0] + 100, S.ifnot[0] + 1000))
  const ps = lerp(0.9, 0.2, away)
  const po = on(t, S.ifnot[0], 90) * (1 - away)
  return (
    <div className="rl-cam">
      <Held t={t}>
        <NoteLight x={540 - 12 * ps} y={lerp(1010, 960, away)} s={ps} tint="rose" o={po} />
        <NoteLight x={540 + 12 * ps} y={lerp(1010, 960, away)} s={ps} tint="rose" o={po} />
        {LONE.map((l, i) => {
          // a long dead screen's last frames: it dims, catches, and goes
          const k = u(t, l.out, l.out + 170)
          const o = on(t, S.ifnot[0] + 60 + i * 50, 90) * (k < 0.5 ? 1 - k * 0.9 : k < 0.6 ? 0.7 : 1 - k) * (k >= 1 ? 0 : 1)
          return <NoteLight key={l.tint} x={l.x} y={l.y} s={0.9} tint={l.tint} o={o} />
        })}
      </Held>
      <Type t={t} text="if it isn’t," from={S.nLine[0]} to={S.fOut} />
      <Type t={t} text="nobody ever" from={S.nLine[1]} to={S.fOut + 40} y={lineAt(1)} />
      <Type t={t} text="knows." from={S.knows} to={S.fOut + 80} y={lineAt(2)} />
    </div>
  )
}

// ── 28.75 to 35: the question, and the name ─────────────────────────────────
// The question, a word on each note of the song's hook, over an empty
// letter: the viewer's own composer, `dear`, its cursor waiting at a second
// a blink. Then its screen goes dark, and the name is lit under the
// question, a cell at a time from the star outwards, on the words' margin;
// the address under it. The question stays: it is what the name answers,
// and the last thing read.
const COMPOSER_KEYS = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send' } }
const COMPOSER_TOP = { salutation: 'dear', counter: '260/1', icon: 'pen', bat: 4 }
const Composer = memo(function Composer({ onName }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const root = ref.current && ref.current.querySelector('.st-phone')
    const nm = root && root.querySelector('.wl-scr-nm')
    if (!root || !nm) return
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const r = nm.getBoundingClientRect()
    onName({ x: (r.right - r0.left) / k, y: (r.top - r0.top) / k, h: r.height / k })
  }, [onName])
  return (
    <div ref={ref}>
      <Phone w={PW} tint="night" seed="yours" mode="bare" square quiet={false} top={COMPOSER_TOP} keys={COMPOSER_KEYS}>
        <div className="wl-scr-msg" />
      </Phone>
    </div>
  )
})
const CELL = 7
// on the words' margin, its ink on the roman's (the italic leans out past
// it, as italics do), its middle the frame's
const LOCK = { x: X0 + 4, y: 960 - Math.round((LOCKUP.h * CELL) / 2) }
// the middle of the mark's star, on the frame
const STAR = { x: LOCK.x + Math.round((LOCKUP.mark.w * CELL) / 2), y: LOCK.y + Math.round((LOCKUP.mark.h * CELL) / 2) }
// every cell of the lockup, and the moment it comes on: by its distance
// from the star, a little unevenly
let LIT = null
function lockCells() {
  if (LIT) return LIT
  const word = wordCells()
  const cells = [...cellsOf(MARK), ...word.cells.map(([x, y]) => [x + LOCKUP.word.x, y])]
    .map(([x, y]) => [LOCK.x + x * CELL, LOCK.y + y * CELL])
  const span = Math.max(...cells.map(([x, y]) => Math.hypot(x - STAR.x, y - STAR.y)))
  LIT = cells.map(([x, y], i) => ({ x, y, on: S.lock[0] + (Math.hypot(x + CELL / 2 - STAR.x, y + CELL / 2 - STAR.y) / span) * (S.lock[1] - S.lock[0] - 320) + rnd(i * 7 + 3) * 80 }))
  return LIT
}
// the canvas the cells are lit on: the lockup and a little room round it
const PAD = 40
const LIT_BOX = { x: LOCK.x - PAD, y: LOCK.y - PAD, w: LOCKUP.w * CELL + PAD * 2, h: LOCKUP.h * CELL + PAD * 2 }
const NIGHT_LIT = skinOf('night').lit

function AskScene({ t }) {
  const canvas = useRef(null)
  const cells = useMemo(lockCells, [])
  const [name, setName] = useState(null)
  const lighting = t >= S.lock[0] - 50 && t < S.lock[1] + 60
  useLayoutEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, LIT_BOX.w, LIT_BOX.h)
    if (!lighting) return
    g.fillStyle = '#F4F1EA'
    for (const p of cells) {
      const k = on(t, p.on, 110)
      if (k <= 0) continue
      g.globalAlpha = k
      g.fillRect(p.x - LIT_BOX.x, p.y - LIT_BOX.y, CELL, CELL)
    }
    g.globalAlpha = 1
  })
  const root = useScene(t, (el) => {
    const tl = gsap.timeline({ paused: true })
    const addr = el.querySelector('.rl-addr')
    tl.fromTo(addr, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, S.url / 1000)
    return tl
  })
  // the composer: on with the question's first word, dark on the bar the
  // name comes in on, gone a moment after
  const wakeK = on(t, S.ask[0], 120)
  const dark = u(t, S.lock[0] - 250, S.lock[0] - 70)
  const gone = 1 - u(t, S.lock[0] - 60, S.lock[0] + 200)
  const Q = S.qWords
  return (
    <div className="rl-cam" ref={root}>
      {gone > 0.002 ? (
        <Held t={t}>
          <Place x={OBJ.x} y={OBJ.y} s={OBJ_S} opacity={gone.toFixed(3)} filter={`brightness(${(wakeK * (1 - 0.94 * dark)).toFixed(3)})`}>
            <Composer onName={setName} />
            {name && dark < 0.5 && (t - S.ask[0]) % 1000 < 500 ? (
              <span className="rl-compose-cur" style={{ left: name.x + 14, top: name.y + name.h * 0.12, height: name.h * 0.76, background: NIGHT_LIT }} />
            ) : null}
          </Place>
        </Held>
      ) : null}
      <Type t={t} text="do they still" times={Q.slice(0, 3)} />
      <Type t={t} text="think about" times={Q.slice(3, 5)} y={lineAt(1)} />
      <Type t={t} text="you?" times={Q.slice(5)} y={lineAt(2)} size={XL} italic />
      <canvas ref={canvas} className="rl-pix" width={LIT_BOX.w} height={LIT_BOX.h} style={{ left: LIT_BOX.x, top: LIT_BOX.y, visibility: lighting ? 'visible' : 'hidden' }} />
      {t >= S.lock[1] ? <Lockup cell={CELL} className="rl-lock" style={{ left: LOCK.x, top: LOCK.y }} /> : null}
      <p className="rl-addr" style={{ top: LOCK.y + LOCKUP.h * CELL + 88, left: LOCK.x - 2 }}>celestual.us</p>
    </div>
  )
}

// ── the reel ────────────────────────────────────────────────────────────────
// every face on the frames, the pixel face the glass's words are cut from
// among them, so nothing is ever set in a stand in while a face is late
const FACES = ['500 132px Newsreader', 'italic 440 210px Newsreader', '400 44px "Geist Mono"', '400 40px "Jersey 10"']
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
  const atlas = useAtlas()
  useEffect(() => {
    Promise.all([readyFilm(A.name, B.name), ...FACES.map((f) => document.fonts.load(f))]).then(() => setOk(true))
  }, [])
  useHold(ok && !!mA && !!atlas)
  const film = ok ? filmOf(A.name, B.name, 'rose') : null
  const tA = useMemo(typedA, [])
  const tB = useMemo(typedB, [])
  const env = mA ? mA.env : null
  return (
    <Board w={1080} h={1920} grain={0} className="rl-board">
      {ok ? <Measure who={A} times={tA} onMeasure={setMA} /> : null}
      <div className="rl-stage">
        {/* each scene owns exactly its own frames, and they cut */}
        {t < S.kai[0] && mA && atlas ? <WallScene t={t} m={mA} times={tA} image={atlas} /> : null}
        {env && t >= S.kai[0] && t < S.wait[0] ? <KaiScene t={t} times={tB} env={env} /> : null}
        {t >= S.wait[0] && t < S.meet ? <WaitScene t={t} /> : null}
        {film && t >= S.meet && t < S.notes[0] ? <RevealScene t={t} film={film} /> : null}
        {t >= S.notes[0] && t < S.ifnot[0] ? <NotesScene t={t} /> : null}
        {t >= S.ifnot[0] && t < S.ask[0] ? <IfNotScene t={t} /> : null}
        {ok && t >= S.ask[0] ? <AskScene t={t} /> : null}
      </div>
      {/* the grain, the halation and the print's grade are the finish's
          (scripts/studio-finish.mjs) */}
      <span className="st-vignette" style={{ opacity: 0.55 }} aria-hidden="true" />
    </Board>
  )
}

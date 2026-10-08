// ── the reel ────────────────────────────────────────────────────────────────
//
// Thirty seconds at 96 beats a minute (reel-time.js), drawn from `t` and
// nothing else, so scripts/studio-film.mjs can photograph it a frame at a
// time. One story and one metaphor: a feeling is a light. A letter is a lit
// screen; a note sent privately goes up as a sealed light; two lights that
// meet are a mutual; the lights that never meet go out, and nobody knows;
// and the name is drawn out of the last of them.
//
//   0.0   the glass up close: lin's note, the hardest words slowest
//   3.75  one shot: back from the glass into the wall of everybody's letters,
//         the light going out across it from lin's, along it, and back.
//         `a wall of / the ones you / never told.`
//  10.0   send, and the note goes up as a light. `or send it / privately.`
//  12.5   somewhere else, kai writes one too. `they only read it / if they
//         send you / one too.`
//  15.0   the two lights among everyone's, and the board turning to nine.
//         `every note waits / for saturday.`
//  17.5   at nine the two lights meet, and the product's own reveal
//  21.25  `you both / find out.`: the two notes, side by side
//  23.75  the lights that never met go out. `if it isn't, / nobody ever /
//         knows.`
//  26.25  `do they still / think about / you?`, and the name drawn out of it
//
// Everything on it is the product's own: the wall's `Screen` in its twelve
// colours (the wall itself is a sheet of them, drawn in WebGL, wall-gl.js),
// the mutual's pixel film (pixmark.js), the lockup a cell at a time
// (brand.js), the faces. GSAP sets the words (SplitText) and draws the
// curves (CustomEase).

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { Board, Phone, PixelStory, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars, hexRgb, Lockup, LOCKUP, MARK } from '../kit.jsx'
import { glyphPath } from '../../wall/looks.js'
import { cellsOf, wordCells } from '../../wall/brand.js'
import { MS, A, B, S, typedA, typedB, storyAt, wakeOf } from './reel-time.js'
import { WallGL, wallOf, cameraOf, boxOnto, v3, UNIT } from './wall-gl.js'
import { TINTS, cellTint } from './wall-letters.js'
import { skinOf } from '../../wall/looks.js'
import { NoteScreen, PW } from './note-screen.jsx'
import atlasUrl from '../assets/wall-atlas.jpg'
import './reel.css'

export { MS }

gsap.registerPlugin(SplitText, CustomEase)

// ── the curves ──────────────────────────────────────────────────────────────
// a breath in (quick to start, a long settle), and a camera's glide
CustomEase.create('rl.breath', 'M0,0 C0.22,0.61 0.36,1 1,1')
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

// The way an old backlight came on: dark, a stutter, then lit
export function wake(t, from, ms = 420) {
  const k = (t - from) / ms
  if (k <= 0) return 0
  if (k >= 1) return 1
  if (k < 0.14) return 0.55 * (k / 0.14)
  if (k < 0.24) return 0.12
  if (k < 0.36) return 0.78
  if (k < 0.44) return 0.4
  return 0.4 + 0.6 * easeOf('power2.out')((k - 0.44) / 0.56)
}
// a colour of the screens' halos at another strength, whatever it is written as
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

// ── the words ───────────────────────────────────────────────────────────────
// One type system for the whole film: the display face, lowercase, at two
// sizes, a line (M) and the line that carries it (XL, in italic, always the
// last), every line on one margin in one band at the top of the frame and
// never wider than 920, and the question at the end in the middle of it.
// A line's words come one after another on its beat, each out of a little
// blur and from a little below, as a breath comes in, and go the same way
// sooner. SplitText cuts the line into its words; the words are React's
// only until they are cut (`Words` is kept as it is).
export const X0 = 80
export const Y0 = 300
export const M = 132
export const XL = 210
const LH = 0.9
export const lineAt = (n) => Y0 + Math.round(n * M * LH)

const Words = memo(function Words({ text, italic }) {
  return <span className={`rl-set${italic ? ' is-it' : ''}`}>{text}</span>
})
export function Type({ t, from, to = Infinity, ...rest }) {
  if (t < from - 60 || t > to + 1100) return null
  return <TypeLive t={t} from={from} to={to} {...rest} />
}
function TypeLive({ t, text, from, to, size = M, italic = false, x = X0, y = Y0, w = 1080 - x, align = 'left', fade = null }) {
  const root = useScene(t, (el) => {
    const split = new SplitText(el.querySelector('.rl-set'), { type: 'words', wordsClass: 'rl-w', tag: 'span' })
    const tl = gsap.timeline({ paused: true })
    tl.fromTo(split.words, { opacity: 0, filter: 'blur(16px)', y: size * 0.14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.95, ease: 'rl.breath', stagger: 0.17 }, from / 1000)
    if (to < Infinity) tl.to(split.words, { opacity: 0, filter: 'blur(12px)', y: -size * 0.05, duration: 0.6, ease: 'power2.in', stagger: 0.07 }, to / 1000)
    return tl
  })
  return (
    <div ref={root} className="rl-type" style={{ left: x, top: y, width: w, fontSize: size, textAlign: align, opacity: fade == null ? undefined : fade }}>
      <Words text={text} italic={italic} />
    </div>
  )
}
// the shade under a band of words, so what is behind them goes quiet
const Shade = ({ o }) => (o > 0.003 ? <div className="rl-shade" style={{ opacity: o.toFixed(3) }} /> : null)

// an object placed on the frame: its middle at `x`, `y`, `s` times its size,
// turned a little in depth
function Place({ x, y, s, rx = 0, ry = 0, rz = 0, w = PW, h = 1160, z = 0, filter, opacity, children, className = '' }) {
  return (
    <div
      className={`rl-obj ${className}`}
      style={{
        width: w, zIndex: z, opacity,
        transform: `translate(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px) perspective(${(2600 / Math.max(0.05, s)).toFixed(0)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`,
        transformOrigin: `${w / 2}px ${h / 2}px`, filter,
      }}
    >
      {children}
    </div>
  )
}

// the light a lit thing throws on the room, in its colour
const Glow = ({ x, y, r, colour, o = 1, z = 0 }) => (o > 0.005 && r > 1 ? (
  <span className="rl-glow" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: Math.min(1, o).toFixed(3), zIndex: z, '--c': colour }} aria-hidden="true" />
) : null)
const halo = (tint) => skinVars(tint)['--s-halo']
// a print or a copy on the wall is paper, lit from outside: it throws less
const PAPER = new Set(['teal', 'acid', 'violet-yellow', 'xerox'])

// ── a sealed note, as a light ───────────────────────────────────────────────
// The phone's own envelope, in whole cells, lit in its writer's colour with
// the light it throws round it: a note once it has gone, waiting
const ENV = glyphPath('env')
const ICE = { core: '#EAF6FF', glow: 'rgba(150,205,255,0.85)' }
const AMBER = { core: '#FFF0D6', glow: 'rgba(255,190,110,0.85)' }
const WARM = { core: '#FFF4EC', glow: 'rgba(255,170,190,0.9)' }
function NoteLight({ x, y, s = 1, o = 1, tone: c, z = 12 }) {
  if (o <= 0.003 || s <= 0.01) return null
  const w = 46 * s
  const h = (w * ENV.h) / ENV.w
  return (
    <>
      <Glow x={x} y={y} r={150 * s} colour={c.glow} o={0.85 * o} z={z - 1} />
      <svg
        className="rl-note" viewBox={`0 0 ${ENV.w} ${ENV.h}`} shapeRendering="crispEdges"
        style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o.toFixed(3), zIndex: z, filter: `drop-shadow(0 0 ${(6 * s).toFixed(1)}px ${c.glow})` }}
        aria-hidden="true"
      >
        <path d={ENV.d} fill={c.core} />
      </svg>
    </>
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

// The camera, a key a moment: [ms, eye, target, lens in degrees, still]. The
// letter first, the whole glass in the frame and the words in the middle of
// it (`T`, where they are), a slow push as the last of them comes; then back
// and back into the hall as the light goes out over it, up its height and
// round, and down again, still, as lin's letter comes away from the wall to
// the camera, kept in the middle of the frame all the way; held while it
// says it has gone; then up after the light.
const LETTER_FROM = [-0.2, -0.3, 3.55]
const LETTER_TO = [0, -0.02, 3.05]
const hallOf = (T) => [
  [3300, v3.add(T, LETTER_TO), T, 34, true],
  [6250, [0, 1.2, 22], [0, 2.6, 0], 52],
  [8300, [-5.5, 7.5, 17], [2.5, 11, 0], 56],
  [10000, [0.3, 1.6, 12.6], [0, 0.9, 0], 38, true],
  [11400, [0.3, 1.7, 12.5], [0, 0.95, 0], 38, true],
  [12500, [0.3, 2.5, 12.3], [0, 0.95, 0], 40],
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
// front of it at the size it was written at
const HOME = { c: [0, 0, 0], r: [UNIT.w / 2, 0, 0], u: [0, UNIT.h / 2, 0] }
function linPose(t, T, hall) {
  const k = easeOf('power2.inOut')(u(t, S.lift[0], S.lift[1]))
  if (k <= 0) return HOME
  const end = camAt(S.lift[1], T, hall)
  const cam = cameraOf(end)
  const c1 = v3.add(end.eye, v3.scale(cam.fwd, 3.05))
  const c = bez([HOME.c, [0, 0.1, 2.6], v3.add(c1, v3.scale(cam.fwd, 2.4)), c1], k)
  // a little turn on the way, as a thing carried turns
  const sway = Math.sin(k * Math.PI) * 0.22
  const r = v3.norm(v3.lerp([Math.cos(sway), 0, -Math.sin(sway)], cam.side, k))
  const up = v3.norm(v3.lerp([0, 1, 0], cam.up, k))
  return { c, r: v3.scale(r, UNIT.w / 2), u: v3.scale(up, UNIT.h / 2), k }
}

function WallScene({ t, m, times, image }) {
  const canvas = useRef(null)
  const gl = useRef(null)
  const letters = useMemo(() => wallOf((cell) => hexRgb(skinOf(cellTint(cell)).glow).map((x) => (x / 255) * (PAPER.has(cellTint(cell)) ? 0.45 : 1))), [])
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
  // ── the camera, and the note it follows up once it has gone ──
  let { eye, target, fov } = camAt(t, T, hall)
  const pose = linPose(t, T, hall)
  const at = (px, py) => {
    const [x, y] = [(px / m.box.w) * 2 - 1, 1 - (py / m.box.h) * 2]
    return v3.add(pose.c, v3.add(v3.scale(pose.r, x), v3.scale(pose.u, y)))
  }
  // the letter, from the moment it comes away from the wall
  const track = easeOf('sine.inOut')(u(t, S.lift[0], S.lift[0] + 900))
  if (track > 0) target = v3.lerp(target, pose.c, track)
  const E0 = at(m.env.x, m.env.y)
  const rise = easeOf('sine.inOut')(u(t, S.rise, S.send[1] + 500))
  const E = bez([E0, v3.add(E0, [0, 0.3, 0.05]), v3.add(E0, [0.1, 1.9, -0.6]), v3.add(E0, [0.25, 3.8, -1.6])], rise)
  const follow = easeOf('sine.inOut')(u(t, S.rise + 50, S.send[1] - 100))
  if (follow > 0) target = v3.lerp(target, E, follow)
  // a hand's breath of drift
  const dz = v3.sub(eye, target)
  const far = Math.hypot(dz[0], dz[1], dz[2])
  eye = v3.add(eye, [Math.sin(t / 1300) * 0.004 * far, Math.cos(t / 1700) * 0.0035 * far, 0])
  const cam = cameraOf({ eye, target, roll: Math.sin(t / 2100) * 0.01, fov })
  // ── the light on the wall ──
  // dark but for lin's; then the light goes out from lin's over the hall,
  // each letter waking as an old backlight does when it reaches it and
  // throwing a flush of its colour on the wall as it comes on; and the hall
  // going down to the dark once the note has gone
  const leave = 1 - 0.9 * easeOf('sine.inOut')(u(t, S.rise - 300, S.send[1] - 200))
  for (let n = 0; n < letters.length; n++) {
    const l = letters[n]
    if (n === home) { lit[n] = 0; glow[n] = 0.5 * (1 - (pose.k || 0)) * leave; continue }
    const tw = wakeOf(l.dist, l.seed)
    const w = wake(t, tw, 380)
    const flick = 1 - 0.14 * Math.max(0, Math.sin(t * 0.0021 * (1 + l.seed) + l.seed * 40)) ** 12
    lit[n] = w * (0.45 + 0.55 * l.seed) * flick * leave
    const flush = t > tw ? Math.exp(-Math.max(0, t - tw - 260) / 520) * Math.min(1, (t - tw) / 260) : 0
    glow[n] = lit[n] * 0.36 + flush * 0.85 * leave
  }
  const linD = Math.hypot(...v3.sub(pose.c, eye))
  const tgtD = Math.hypot(...v3.sub(target, eye))
  const toHall = easeOf('sine.inOut')(u(t, 5000, 6800))
  const toLin = easeOf('sine.inOut')(u(t, S.lift[0] + 200, S.lift[1] - 150))
  const focus = lerp(lerp(linD, tgtD, toHall), linD, toLin)
  const aperture = lerp(lerp(1.4, 1.1, toHall), 2.8, toLin)
  const dust = 0.6 * u(t, S.wake + 300, S.wake + 2600) * leave
  useLayoutEffect(() => {
    if (!canvas.current || !image) return
    if (!gl.current) gl.current = new WallGL(canvas.current, image, letters)
    gl.current.draw(cam, lit, glow, { focus, aperture, fogStart: 20, fog: 0.04, spread: 2.3, time: t / 1000, dust, bokeh: 0.016 })
  })
  // ── lin's phone, the real one, where the wall has its place ──
  const corners = [
    at(0, 0), at(m.box.w, 0), at(m.box.w, m.box.h), at(0, m.box.h),
  ].map(cam.project)
  const ok = corners.every(Boolean)
  const wpx = ok ? Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) : 0
  const mid = ok ? [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2] : [540, 960]
  // the phone asleep once its note has gone
  const sleep = easeOf('power2.inOut')(u(t, S.rise + 200, S.send[1]))
  // the note going up, as a light, from the envelope on the glass
  const pe = t >= S.rise ? cam.project(E) : null
  const pe0 = cam.project(E0)
  const es = pe0 && pe ? ((m.env.w / m.box.w) * wpx / 46) * (pe0[2] / pe[2]) : 0
  const shade = Math.max(
    u(t, S.lines[0] - 100, S.lines[0] + 300) * (1 - u(t, S.linesOut + 300, S.linesOut + 800)),
    u(t, S.sendIt - 100, S.sendIt + 300) * (1 - u(t, S.sendOut + 200, S.send[1])),
  )
  return (
    <div className="rl-cam">
      <canvas ref={canvas} className="rl-wall" width="1080" height="1920" />
      <Glow x={mid[0]} y={mid[1]} r={Math.max(80, wpx * 1.2)} colour={halo('ice')} o={0.7 * (1 - 0.7 * u(t, 4200, 6200)) * (1 - sleep)} z={2} />
      {ok && wpx > 2 ? (
        <div className={`rl-lin${t >= S.rise ? ' is-gone' : ''}`} style={{ transform: boxOnto(m.box.w, m.box.h, corners), filter: sleep > 0 ? `brightness(${(1 - 0.88 * sleep).toFixed(3)})` : undefined }}>
          <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} quiet={false} />
        </div>
      ) : null}
      {pe ? <NoteLight x={pe[0]} y={pe[1]} s={es} o={1} tone={ICE} /> : null}
      <Shade o={shade} />
      <Type t={t} text="a wall of" from={S.lines[0]} to={S.linesOut} />
      <Type t={t} text="the ones you" from={S.lines[1]} to={S.linesOut + 60} y={lineAt(1)} />
      <Type t={t} text="never told." from={S.lines[2]} to={S.linesOut + 120} y={lineAt(2)} size={XL} italic />
      <Type t={t} text="or send it" from={S.sendIt} to={S.sendOut} />
      <Type t={t} text="privately." from={S.privately} to={S.sendOut + 80} y={lineAt(1)} size={XL} italic />
    </div>
  )
}

// ── the night: the sealed notes as lights ───────────────────────────────────
// After the send the film is in the dark, where every note this week is a
// light, an envelope lit in its writer's colour: lin's and kai's, and
// everyone else's round them. One plane of them, each at its own depth,
// seen through a camera that only comes and goes (`zoom` about the middle
// of the frame), so the near ones move more: at kai's, near; for the week,
// far, among all the others; for nine o'clock, near again; for the rest,
// far.
const C = { x: 540, y: 960 }
const FIELD = (() => {
  const out = []
  for (let i = 0; i < 560; i++) {
    const r = Math.sqrt(rnd(i * 3 + 1)) * 2500 + 330
    const a = rnd(i * 7 + 2) * Math.PI * 2
    // some are pairs, a little apart, that meet at nine; the rest are alone
    const pair = i % 11 === 0
    out.push({
      x: Math.cos(a) * r * 0.62, y: Math.sin(a) * r, depth: 0.62 + rnd(i * 17 + 9) * 0.76,
      s: 0.32 + rnd(i * 5 + 3) ** 2 * 0.95, tint: TINTS[i % TINTS.length], pair, seed: rnd(i * 11 + 4),
      out: S.ifnot[0] + 250 + rnd(i * 13 + 6) * 2000,
    })
  }
  return out
})()
// lin's light and kai's on the plane, in the frame's pixels at zoom one
const LIN_AT = [290, -250]
const KAI_AT = [-270, -170]
function nightZoom(t) {
  return at([
    [S.kai[0], 1], [S.wait[0], 1], [S.wait[0] + 1800, 0.55, 'rl.glide'], [S.reveal[0], 0.55], [S.meet, 0.9, 'sine.inOut'],
    [S.reveal[1], 0.9], [S.ifnot[0] + 300, 0.9], [S.ifnot[0] + 2300, 0.5, 'rl.glide'], [S.ask[0] + 500, 0.5], [S.ask[0] + 1600, 0.85, 'sine.inOut'],
  ], t)
}
const onFrame = (p, z) => [C.x + p[0] * z, C.y + p[1] * z]
// where lin's light and kai's are, on the plane
function linLight(t) {
  // in from the top as the camera comes to kai, then still, then to the
  // middle for nine
  const k = easeOf('rl.glide')(u(t, S.kai[0], S.kai[0] + 1000))
  let p = [LIN_AT[0] + (1 - k) * 40, LIN_AT[1] - (1 - k) * 560]
  p = [p[0] + Math.sin(t / 900) * 8, p[1] + Math.cos(t / 1100) * 10]
  const meet = easeOf('sine.inOut')(u(t, S.reveal[0], S.meet))
  return [lerp(p[0], -6, meet), lerp(p[1], 0, meet)]
}
// kai's from the envelope on kai's glass (`from`, on the frame at zoom one)
// up to its place among the others
function kaiLight(t, from) {
  const k = easeOf('sine.inOut')(u(t, S.kRise, S.wait[0] + 900))
  const P = [[from[0] - C.x, from[1] - C.y], [from[0] - C.x, from[1] - C.y - 260], [KAI_AT[0] + 60, KAI_AT[1] + 240], KAI_AT]
  const a = 1 - k
  let p = [0, 1].map((c) => a * a * a * P[0][c] + 3 * a * a * k * P[1][c] + 3 * a * k * k * P[2][c] + k * k * k * P[3][c])
  p = [p[0] + Math.sin(t / 1000 + 2) * 8 * k, p[1] + Math.cos(t / 1200 + 1) * 10 * k]
  const meet = easeOf('sine.inOut')(u(t, S.reveal[0], S.meet))
  return [lerp(p[0], 6, meet), lerp(p[1], 0, meet)]
}
// the way an old backlight goes off: a stutter, then dark
const sleepOf = (t, from, ms = 520) => 1 - wake(t, from, ms)

const ENV_PATH = typeof Path2D !== 'undefined' ? new Path2D(ENV.d) : null
function Field({ t, z }) {
  const canvas = useRef(null)
  useLayoutEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, 1080, 1920)
    const come = u(t, S.wait[0] + 200, S.wait[0] + 1500)
    const gone = 1 - u(t, S.ask[0] + 200, S.ask[0] + 1200)
    // between the reveal's light and the notes the field is not seen
    const shown = t < S.meet + 300 || t >= S.ifnot[0]
    if (!shown || come * gone <= 0.002) return
    g.globalCompositeOperation = 'lighter'
    for (const f of FIELD) {
      let x = f.x
      let a = come * gone * (0.55 + 0.45 * Math.sin(t * 0.0016 * (1 + f.seed) + f.seed * 30) ** 2)
      let col = skinOf(f.tint).glow
      let core = '#FFFFFF'
      if (f.pair) {
        // the pairs meet at nine, and stay as one warm light
        const mk = easeOf('sine.inOut')(u(t, S.reveal[0] + f.seed * 300, S.meet + f.seed * 300))
        x -= 38 * (1 - mk)
        if (mk > 0.98) { col = '#FF9EB8'; core = '#FFF4EC' }
      } else if (t >= S.ifnot[0]) {
        // and the ones alone go out, one by one
        a *= sleepOf(t, f.out)
      }
      if (a <= 0.003) continue
      const zz = z * f.depth
      const [fx, fy] = onFrame([x, f.y], zz)
      const sz = f.s * (0.45 + zz)
      const r = 40 * sz
      if (fx < -r || fx > 1080 + r || fy < -r || fy > 1920 + r) continue
      const grad = g.createRadialGradient(fx, fy, 0, fx, fy, r)
      grad.addColorStop(0, tone(col, 0.85))
      grad.addColorStop(0.3, tone(col, 0.26))
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.globalAlpha = Math.min(1, a)
      g.fillStyle = grad
      g.fillRect(fx - r, fy - r, r * 2, r * 2)
      // the envelope itself, where it is near enough to be one
      g.fillStyle = core
      const w = 15 * sz
      if (w > 7 && ENV_PATH) {
        g.globalAlpha = Math.min(1, a) * 0.92
        g.save()
        g.translate(Math.round(fx - w / 2), Math.round(fy - (w * ENV.h) / ENV.w / 2))
        g.scale(w / ENV.w, w / ENV.w)
        g.fill(ENV_PATH)
        g.restore()
      } else {
        const cs = Math.max(2, Math.round(w * 0.42))
        g.globalAlpha = Math.min(1, a) * 0.9
        g.fillRect(Math.round(fx - cs / 2), Math.round(fy - cs / 2), cs, cs)
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  })
  return <canvas ref={canvas} className="rl-field" width="1080" height="1920" />
}

// ── 12.5 to 15: kai ─────────────────────────────────────────────────────────
// Somewhere else, in the dark, kai's screen comes on: a note to lin, typed,
// sent privately, its envelope going up as kai's light. lin's is already
// out there, up in the dark.
const KAI_PLACE = { x: 540, y0: 1480, y1: 1400 }
function kaiEnv(t, env) {
  const k = easeOf('rl.glide')(u(t, S.kWake, S.kWake + 1100))
  const s = lerp(0.6, 0.68, k) + u(t, 13400, S.kai[1]) * 0.02
  const y = lerp(KAI_PLACE.y0, KAI_PLACE.y1, k)
  return { k, s, y, at: [KAI_PLACE.x + (env.x - PW / 2) * s, y + (env.y - 580) * s] }
}
function KaiScene({ t, times, env }) {
  const w = wake(t, S.kWake, 460)
  const { k, s, y, at: from } = kaiEnv(t, env)
  // the phone sleeps once its note has gone up
  const sleep = easeOf('power2.inOut')(u(t, S.kRise + 100, S.kai[1] + 200))
  const z = nightZoom(t)
  const lp = onFrame(linLight(t), z)
  const kp = onFrame(kaiLight(t, from), z)
  const shade = u(t, S.kRead - 100, S.kRead + 300) * (1 - u(t, S.kOut + 300, S.kai[1]))
  return (
    <div className="rl-cam">
      <Glow x={540} y={1330} r={760} colour={halo('amber')} o={w * (1 - sleep) * 0.9} />
      <Place x={KAI_PLACE.x} y={y} s={s} rx={lerp(-6, 3, k)} ry={lerp(10, -4, k)} filter={`brightness(${(w * (1 - sleep * 0.92)).toFixed(3)})`} className={t >= S.kRise ? 'is-gone' : ''}>
        <NoteScreen who={B} t={t} times={times} sendAt={S.kSend} fs={13.4} quiet={false} />
      </Place>
      <NoteLight x={lp[0]} y={lp[1]} s={0.95} tone={ICE} />
      {t >= S.kRise ? <NoteLight x={kp[0]} y={kp[1]} s={lerp((env.w * s) / 46, 0.95, u(t, S.kRise, S.kRise + 700))} tone={AMBER} /> : null}
      <Shade o={shade} />
      <Type t={t} text="they only read it" from={S.kRead} to={S.kOut} />
      <Type t={t} text="if they send you" from={S.kIf} to={S.kOut + 60} y={lineAt(1)} />
      <Type t={t} text="one too." from={S.kIf + 312} to={S.kOut + 120} y={lineAt(2)} size={XL} italic />
    </div>
  )
}

// ── 15 to 18.1: every mutual is revealed on saturday at nine ────────────────
// The two lights among everyone's, waiting, and a board under them turning
// through the week to the one moment every mutual is revealed: the
// sentence the words begin, the board ends.
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const TIME = '9:00 pm'
const FL = { top: 1250, cw: 150, ch: 200, gap: 12 }
const TR = { top: FL.top + FL.ch + 18, h: 140, w: 96, colon: 56, space: 26, gap: 8 }
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

function WaitScene({ t, env }) {
  const z = nightZoom(t)
  const lp = onFrame(linLight(t), z)
  const kp = onFrame(kaiLight(t, kaiEnv(t, env).at), z)
  const board = u(t, S.days[0] - 300, S.days[0] + 100) * (1 - u(t, S.reveal[0] - 200, S.reveal[0] + 300))
  const ls = lerp(0.95, 0.78, u(t, S.wait[0], S.wait[0] + 1800))
  const shade = u(t, S.wLine[0] - 100, S.wLine[0] + 300) * (1 - u(t, S.wOut + 300, S.reveal[0] + 200))
  return (
    <div className="rl-cam">
      <NoteLight x={lp[0]} y={lp[1]} s={ls} tone={ICE} />
      <NoteLight x={kp[0]} y={kp[1]} s={ls} tone={AMBER} />
      <div className="rl-cam" style={{ opacity: board.toFixed(3) }}>
        <div className="rl-flaps" style={{ top: FL.top, gap: FL.gap }}>
          {[0, 1, 2].map((c) => (
            <Flap key={c} seq={DAYS.map((x) => x[c])} times={S.days.map((x) => x + c * 24)} t={t} w={FL.cw} h={FL.ch} size={170} />
          ))}
        </div>
        <div className="rl-flaps" style={{ top: TR.top, gap: TR.gap }}>
          {[...TIME].map((c, i) => (c !== ' ' && t >= S.time + i * 40 ? (
            <Flap key={i} seq={[c]} times={[S.time + i * 40]} t={t} w={timeW(c)} h={TR.h} size={120} />
          ) : <span key={i} style={{ width: timeW(c) }} />))}
        </div>
        <p className="rl-label" style={{ top: TR.top + TR.h + 30, opacity: easeOf('power2.out')(u(t, S.place, S.place + 400)) }}>pacific.</p>
      </div>
      <Shade o={shade} />
      <Type t={t} text="every mutual is" from={S.wLine[0]} to={S.wOut} />
      <Type t={t} text="revealed on" from={S.wLine[1]} to={S.wOut + 80} y={lineAt(1)} size={XL} italic />
    </div>
  )
}

// ── 18.1 to 22.5: nine o'clock ──────────────────────────────────────────────
// The two lights glide in and touch; the light they make goes over the
// frame, and out of it the product's own reveal at the size of the room:
// the two of them run in, are held, the glass turns rose, the phone steps
// back to say it.
function Meeting({ t, env }) {
  const z = nightZoom(t)
  const lp = onFrame(linLight(t), z)
  const kp = onFrame(kaiLight(t, kaiEnv(t, env).at), z)
  const before = t < S.meet + 120
  const bloom = easeOf('sine.out')(u(t, S.meet - 80, S.meet + 420)) * (1 - easeOf('sine.inOut')(u(t, S.glass + 250, S.run + 700)))
  return (
    <div className="rl-cam">
      {before ? <NoteLight x={lp[0]} y={lp[1]} s={0.95} o={1 - u(t, S.meet, S.meet + 120)} tone={ICE} /> : null}
      {before ? <NoteLight x={kp[0]} y={kp[1]} s={0.95} o={1 - u(t, S.meet, S.meet + 120)} tone={AMBER} /> : null}
      <Glow x={540} y={960} r={lerp(120, 1500, bloom)} colour="rgba(255,226,232,0.95)" o={bloom * 1.2} z={30} />
    </div>
  )
}

function GlassScene({ t, film }) {
  const ref = useRef(null)
  const [g, setG] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const glass = el.querySelector('.wl-story')
    const root = el.querySelector('.st-phone')
    if (!glass || !root) return
    const r0 = root.getBoundingClientRect()
    const r = glass.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    setG({ x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k, H: root.offsetHeight })
  }, [])
  const st = storyAt(t)
  const turn = clamp((st - film.times.glow) / 700)
  // the glass the height of the frame, then back to the phone as it says it
  const back = easeOf('expo.inOut')(u(t, S.drop + 400, S.drop + 1500))
  let s = 1
  let y = 960
  if (g) {
    const s0 = (1920 / g.h) * 0.96
    const s1 = 840 / g.w
    s = Math.exp(lerp(Math.log(s0), Math.log(s1), back)) * (1 + u(t, S.run, S.drop) * 0.04 * (1 - back))
    y = lerp(960, 900, back)
  }
  const cx = g ? 540 - (g.x + g.w / 2) * s : 0
  const cy = g ? y - (g.y + g.h / 2) * s : 0
  const o = u(t, S.glass, S.glass + 300) * (1 - easeOf('sine.inOut')(u(t, S.notes[0] - 100, S.both + 250)))
  return (
    <div className="rl-cam" style={{ opacity: o.toFixed(3), zIndex: 6 }}>
      <Glow x={540} y={y} r={1100} colour={turn > 0.5 ? halo('rose') : halo('night')} o={(0.5 + 0.5 * turn) * back} />
      <div ref={ref} className="rl-glass" style={{ transform: `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${s.toFixed(4)})` }}>
        <Phone w={PW} mode="bare" square seed="intro" tint="rose" className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}>
          <PixelStory story={film} at={st} />
        </Phone>
      </div>
    </div>
  )
}

// ── 22.5 to 25: you both find out ───────────────────────────────────────────
// The two notes, side by side, each at last read by the other: lin's to
// kai and kai's to lin, as they were sent, on the saturday they were told
const NOTE_KEYS = {}
const LIN_TOP = { name: A.to, dear: true, icon: 'pen', stamp: '10/10/26', bat: 4 }
const KAI_TOP = { name: B.to, dear: true, icon: 'pen', stamp: '10/10/26', bat: 4 }
const LinNote = memo(function LinNote() {
  return <Phone w={PW} tint={A.tint} seed="note-lin" mode="letter" square quiet={false} top={LIN_TOP} keys={NOTE_KEYS} text={A.text} cursor={false} />
})
const KaiNote = memo(function KaiNote() {
  return <Phone w={PW} tint={B.tint} seed="note-kai" mode="letter" square quiet={false} top={KAI_TOP} keys={NOTE_KEYS} text={B.text} cursor={false} />
})
// the light the two of them make, from the moment the notes are one
const warmAt = (t) => {
  // at the middle of the frame, then over the question, then into the star
  const up = easeOf('sine.inOut')(u(t, S.ask[0] - 200, S.q[0] + 400))
  const down = easeOf('power2.inOut')(u(t, S.qOut, S.lock[0] + 250))
  return [lerp(540, STAR.x, down), lerp(lerp(960, 560, up), STAR.y, down)]
}
function NotesScene({ t }) {
  const a = easeOf('rl.breath')(u(t, S.notes[0] + 100, S.notes[0] + 900))
  const b = easeOf('rl.breath')(u(t, S.notes[0] + 260, S.notes[0] + 1060))
  // and then they come together into one light
  const join = easeOf('power2.inOut')(u(t, S.nOut, S.ifnot[0] + 350))
  const s = 0.47 * (1 - 0.92 * join)
  const o = 1 - u(t, S.ifnot[0] + 150, S.ifnot[0] + 400)
  const y = lerp(1300, 960, join)
  const shade = u(t, S.both - 100, S.both + 300) * (1 - u(t, S.nOut + 200, S.ifnot[0]))
  const [wx, wy] = warmAt(t)
  return (
    <div className="rl-cam">
      <Glow x={540} y={1180} r={980} colour={halo('rose')} o={0.75 * Math.min(a, 1 - join)} />
      {o > 0.002 ? (
        <>
          <Place x={lerp(282, 540, join)} y={y + (1 - a) * 90} s={s} ry={lerp(8, 0, a)} opacity={(a * o).toFixed(3)} filter={`blur(${((1 - a) * 8).toFixed(1)}px)`}>
            <LinNote />
          </Place>
          <Place x={lerp(798, 540, join)} y={y + (1 - b) * 90} s={s} ry={lerp(-8, 0, b)} opacity={(b * o).toFixed(3)} filter={`blur(${((1 - b) * 8).toFixed(1)}px)`}>
            <KaiNote />
          </Place>
        </>
      ) : null}
      <NoteLight x={wx} y={wy} s={lerp(1.1, 0.62, easeOf('power2.inOut')(u(t, S.qOut, S.lock[0] + 250)))} o={u(t, S.ifnot[0] - 100, S.ifnot[0] + 300) * (1 - u(t, S.lock[0] + 150, S.lock[0] + 650))} tone={WARM} z={14} />
      <Shade o={shade} />
      <Type t={t} text="you both" from={S.both} to={S.nOut} />
      <Type t={t} text="find out." from={S.both + 312} to={S.nOut + 80} y={lineAt(1)} size={XL} italic />
    </div>
  )
}

// ── 25 to 27.5: the ones that never meet ────────────────────────────────────
function IfNotScene({ t }) {
  const shade = u(t, S.nLine[0] - 100, S.nLine[0] + 300) * (1 - u(t, S.fOut + 300, S.ask[0] + 200))
  return (
    <div className="rl-cam">
      <Shade o={shade} />
      <Type t={t} text="if it isn’t," from={S.nLine[0]} to={S.fOut} />
      <Type t={t} text="nobody ever" from={S.nLine[1]} to={S.fOut + 60} y={lineAt(1)} />
      <Type t={t} text="knows." from={S.nLine[1] + 312} to={S.fOut + 120} y={lineAt(2)} size={XL} italic />
    </div>
  )
}

// ── 27.5 to 33.75: the question, and the name ────────────────────────────────
// The question in the middle of the frame, a line a beat, under the warm
// light the two of them made. Then it goes, as the words always go, and the
// light comes down to be the mark's star, and the name is lit out of it:
// every cell of the lockup coming on in turn from the star outwards, softly,
// as the light went out over the wall. Then the address, under it.
const ASK_LH = [Math.round(M * LH), Math.round(M * LH), Math.round(XL * LH)]
const ASK_TOP = 900 - Math.round(ASK_LH.reduce((x, y) => x + y, 0) / 2)
const ASK = [
  { text: 'do they still', at: S.q[0], y: ASK_TOP, size: M },
  { text: 'think about', at: S.q[1], y: ASK_TOP + ASK_LH[0], size: M },
  { text: 'you?', at: S.q[2], y: ASK_TOP + ASK_LH[0] + ASK_LH[1], size: XL, italic: true },
]
const CELL = 7
const LOCK = { x: 540 - Math.round((LOCKUP.w * CELL) / 2), y: 900 - Math.round((LOCKUP.h * CELL) / 2) }
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
  LIT = cells.map(([x, y], i) => ({ x, y, on: S.lock[0] + (Math.hypot(x + CELL / 2 - STAR.x, y + CELL / 2 - STAR.y) / span) * (S.lock[1] - S.lock[0] - 380) + rnd(i * 7 + 3) * 90 }))
  return LIT
}

function AskScene({ t }) {
  const canvas = useRef(null)
  const cells = useMemo(lockCells, [])
  const lighting = t >= S.lock[0] - 50 && t < S.lock[1] + 60
  useLayoutEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, 1080, 1920)
    if (!lighting) return
    g.fillStyle = '#F4F1EA'
    for (const p of cells) {
      const k = clamp((t - p.on) / 300)
      if (k <= 0) continue
      g.globalAlpha = easeOf('power2.out')(k)
      g.fillRect(p.x, p.y, CELL, CELL)
    }
    g.globalAlpha = 1
  })
  const root = useScene(t, (el) => {
    const tl = gsap.timeline({ paused: true })
    const addr = el.querySelector('.rl-addr')
    tl.fromTo(addr, { opacity: 0, filter: 'blur(10px)', y: 14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9, ease: 'rl.breath' }, S.url / 1000)
    return tl
  })
  const whole = t >= S.lock[1]
  return (
    <div className="rl-cam" ref={root}>
      {t < S.qOut + 1200 ? ASK.map((l, i) => (
        <Type key={l.text} t={t} text={l.text} from={l.at} to={S.qOut + i * 90} size={l.size} italic={!!l.italic} x={0} w={1080} y={l.y} align="center" />
      )) : null}
      <canvas ref={canvas} className="rl-pix" width="1080" height="1920" style={{ visibility: lighting ? 'visible' : 'hidden' }} />
      {whole ? <Lockup cell={CELL} className="rl-lock" style={{ left: LOCK.x, top: LOCK.y }} /> : null}
      <Glow x={STAR.x} y={STAR.y} r={460} colour="rgba(255,236,226,0.6)" o={u(t, S.lock[0], S.lock[1]) * (0.55 + 0.08 * Math.sin(t / 500))} z={4} />
      <p className="rl-addr" style={{ top: LOCK.y + LOCKUP.h * CELL + 88 }}>celestual.us</p>
    </div>
  )
}

// ── the reel ────────────────────────────────────────────────────────────────
// every face on the frames, the pixel face the glass's words are cut from
// among them, so nothing is ever set in a stand in while a face is late
const FACES = ['500 132px Newsreader', '500 210px Newsreader', 'italic 440 210px Newsreader', '400 44px "Geist Mono"', '400 40px "Jersey 10"']
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
        {/* each scene owns exactly its own frames */}
        {t < S.kai[0] && mA && atlas ? <WallScene t={t} m={mA} times={tA} image={atlas} /> : null}
        {t >= S.kai[0] && t < S.ask[1] ? <Field t={t} z={nightZoom(t)} /> : null}
        {env && t >= S.kai[0] && t < S.wait[0] ? <KaiScene t={t} times={tB} env={env} /> : null}
        {env && t >= S.wait[0] && t < S.reveal[0] ? <WaitScene t={t} env={env} /> : null}
        {env && t >= S.reveal[0] && t < S.run + 900 ? <Meeting t={t} env={env} /> : null}
        {film && t >= S.glass - 200 && t < S.both + 400 ? <GlassScene t={t} film={film} /> : null}
        {t >= S.notes[0] && t < S.ask[1] ? <NotesScene t={t} /> : null}
        {t >= S.ifnot[0] && t < S.ask[0] + 400 ? <IfNotScene t={t} /> : null}
        {ok && t >= S.ask[0] ? <AskScene t={t} /> : null}
      </div>
      <Grain opacity={0.07} seed={Math.floor(t / 83) % 12} />
      <span className="st-vignette" style={{ opacity: 0.62 }} aria-hidden="true" />
    </Board>
  )
}

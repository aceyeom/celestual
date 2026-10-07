// ── unsent, the reel ────────────────────────────────────────────────────────
//
// Fifteen seconds, cut to a score at 120 beats a minute (reel-time.js), drawn
// from `t` and nothing else, so scripts/studio-film.mjs can photograph it a
// frame at a time. Everything on it is the product's own: the wall's
// `Screen` in its colours, the mutual's pixel film (pixmark.js), the mark
// poured in liquid metal with LiquidMark's own settings, the pixel lockup,
// the faces, and the campaign's photographs dithered in the screens' inks.
// GSAP's curves ease every move.
//
//   0.0  the glass up close: a note typed a hand high, the camera after the
//        cursor across the phone's own pixels
//   1.75 the camera falls back through the phone into a wall of letters
//        waking in the dark, and `unsent.` lands on the beat
//   3.5  cut on the bar: send is pressed, the words go up the glass, the
//        envelope comes at the lens, `send it` `privately.`, and the screen
//        goes out to a line and a point
//   5.5  out of the black, the other phone, amber, writing one of its own.
//        `they only read it` `if they send` `you one.`
//   7.5  the week on the flaps, a day an eighth note, the city under them in
//        the screens' inks, and the reveal: sat, 9:00 pm
//   9.0  the glass the size of the room: the two of them run in
//  10.0  the drop. they are held, the light goes over everything, the phone
//        steps back, the mark, and `it's mutual.` in its cells
//  12.6  the mark poured, the line set large, and the name

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { GodRays, ShaderMount } from '@paper-design/shaders-react'
import { liquidMetalFragmentShader, LiquidMetalShapes, ShaderFitOptions } from '@paper-design/shaders'
import { Board, Phone, PixelStory, Lockup, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import { glyphPath } from '../../wall/looks.js'
import { MS, A, B, S, typedA, typedB, storyAt, A_LAND } from './reel-time.js'
import './reel.css'

export { MS }

const DITHER = import.meta.glob('../assets/dither/*.png', { eager: true, import: 'default' })
const dither = (name) => DITHER[`../assets/dither/${name}.png`]

// ── the curves ──────────────────────────────────────────────────────────────
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
// a small generator off a number, for anything that should look random and
// be the same on every frame
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
const typedAt = (times, t) => { let n = 0; while (n < times.length && times[n] <= t) n++; return n }
const blink = (t, last) => t - last < 530 || Math.floor((t - last) / 530) % 2 === 1
// a hit: 1 on the moment, falling away
const hit = (t, at0, ms = 260) => (t < at0 ? 0 : Math.exp(-(t - at0) / ms))

// ── type, set large ─────────────────────────────────────────────────────────
// A line in the display face that comes in a letter at a time on its beat:
// each letter rises out of its own line, sharpening as it comes, and goes
// out the same way, faster. `size` in px; `italic` for the words that carry
// the feeling; `tail` stands after the last letter (the phone's cursor).
export function Line({ text, t, from, to = Infinity, cut = Infinity, size, italic = false, x = 0, y = 0, align = 'left', w = 1080, stagger = 24, rise = 0.42, tail = null, className = '', style }) {
  if (t < from - 10 || t > to + 700 || t >= cut) return null
  const chars = [...text]
  return (
    <div className={`rl-line${italic ? ' is-it' : ''} ${className}`} style={{ left: x, top: y, width: w, fontSize: size, textAlign: align, ...style }}>
      {chars.map((c, i) => {
        const a = u(t, from + i * stagger, from + i * stagger + 560)
        const o = u(t, to + i * (stagger / 2), to + i * (stagger / 2) + 280)
        const k = easeOf('expo.out')(a)
        const q = easeOf('power2.in')(o)
        const ty = (1 - k) * rise - q * 0.32
        const blur = (1 - k) * 0.07 + q * 0.06
        return (
          <span
            key={i} className="rl-ch"
            style={{ transform: `translateY(${ty.toFixed(3)}em)`, opacity: (Math.min(1, k * 1.7) * (1 - q)).toFixed(3), filter: blur > 0.003 ? `blur(${(blur * size).toFixed(1)}px)` : undefined }}
          >{c === ' ' ? ' ' : c}</span>
        )
      })}
      {tail}
    </div>
  )
}

// the phone's cursor, at the size of the line it stands after
const TailCursor = ({ on }) => <span className="rl-tailcur" style={{ opacity: on ? 1 : 0 }} />

// ── the note, typed, measured ───────────────────────────────────────────────
// The words laid out whole, a span a letter, what is not typed yet there and
// unseen, so no word jumps a line as it is typed and the cursor's place is
// the place of the next letter. `onMeasure` is handed every letter's place
// in the phone's own pixels, once, for the camera that follows the cursor.
function Typed({ text, n, cursor, fs, lift = 0, onMeasure = null }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!onMeasure || !ref.current) return
    const root = ref.current.closest('.st-phone')
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const spans = [...ref.current.querySelectorAll('[data-i]')]
    onMeasure(spans.map((s) => {
      const r = s.getBoundingClientRect()
      return { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k }
    }), { w: root.offsetWidth, h: root.offsetHeight })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const chars = [...text]
  // the cursor takes no room on the line, as a caret takes none, so the
  // words wrap the same with it anywhere in them or after them
  const cur = cursor ? <span className="wl-scr-cur rl-cur" aria-hidden="true" /> : null
  return (
    <div className="wl-scr-msg rl-typed" ref={ref} style={{ '--fs': `${fs}cqw` }}>
      <span className="rl-lift" style={lift ? { transform: `translateY(${-lift * 1.02}em)` } : undefined}>
        {chars.map((c, i) => (
          <span key={i} data-i={i} className={i < n ? undefined : 'rl-rest'}>{i === n ? cur : null}{c}</span>
        ))}
        <span data-i={chars.length}>{n >= chars.length ? cur : null}</span>
      </span>
    </div>
  )
}

// a note's phone: the composer, mid letter, then sent
function NoteScreen({ who, t, times, sendAt, fs, w, onMeasure, quiet = true }) {
  const n = typedAt(times, t)
  const last = n ? times[n - 1] : times[0]
  const since = t - sendAt
  const pressed = since >= 0 && since < 170
  const lifting = since >= 170 && since < 410
  const sent = since >= 410
  const lift = lifting ? 1 + Math.floor(((since - 170) / 240) * 3) : 0
  const keys = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send', open: pressed } }
  return (
    <Phone
      w={w} tint={who.tint} seed={who.seed} mode="bare" square quiet={quiet}
      top={{ counter: `${260 - n}/1`, icon: 'pen', name: who.to, dear: true, bat: 4 }} keys={sent ? {} : keys}
    >
      {sent
        ? <ScreenNote glyph="env" title="sent privately." />
        : <Typed text={who.text} n={n} cursor={!lifting && blink(t, last)} fs={fs} lift={lift} onMeasure={onMeasure} />}
    </Phone>
  )
}

// an object placed by the camera: the point `ax`, `ay` of it (its centre
// unless said) at `x`, `y` on the frame, `s` times its own size, turned in
// depth by `ry`, `rx` and in the plane by `rz`, all of it about that point
const PW = 1000
const PH = 1160
function Place({ x, y, s, rx = 0, ry = 0, rz = 0, w = PW, h = PH, ax = w / 2, ay = h / 2, z = 0, filter, opacity, children, className = '' }) {
  return (
    <div
      className={`rl-obj ${className}`}
      style={{
        width: w, zIndex: z, opacity,
        transform: `translate(${(x - ax).toFixed(2)}px, ${(y - ay).toFixed(2)}px) perspective(${(2600 / Math.max(0.05, s)).toFixed(0)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`,
        transformOrigin: `${ax.toFixed(1)}px ${ay.toFixed(1)}px`, filter,
      }}
    >
      {children}
    </div>
  )
}

// the light a lit thing throws on the room, in its colour
const Glow = ({ x, y, r, colour, o = 1, z = 0 }) => (o > 0.005 ? (
  <span className="rl-glow" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: o, zIndex: z, '--c': colour }} aria-hidden="true" />
) : null)
const halo = (tint) => skinVars(tint)['--s-halo']

// the envelope, the phone's own glyph, drawn at any size in whole cells
const ENV = glyphPath('env')
function Envelope({ x, y, w, o = 1, colour = '#F4F1EA', glow = 'rgba(255,244,228,0.6)', rz = 0 }) {
  const h = (w * ENV.h) / ENV.w
  return (
    <svg
      className="rl-env" viewBox={`0 0 ${ENV.w} ${ENV.h}`} shapeRendering="crispEdges"
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: `rotate(${rz}deg)`, filter: `drop-shadow(0 0 ${Math.max(4, w * 0.06)}px ${glow})` }}
      aria-hidden="true"
    >
      <path d={ENV.d} fill={colour} />
    </svg>
  )
}

// ── the wall of letters ─────────────────────────────────────────────────────
// The street's letters and the campaign's, each on its own phone in its own
// colour, round lin's. Every place is [across, down, near, turned]: across
// and down in phone widths where the camera comes to rest, and how near the
// phone stands, so a move of the camera carries a near phone further and a
// far one less, and a phone off the plane the camera is focused on is soft.
const WALL = [
  // the plane lin's phone is on
  ['charlie', 'amber', 'i made so many cupcakes. i can’t quite make them like you do.', -1.13, -0.05, 1, -2.2],
  ['amy', 'ice', 'the alleyway behind the dumpling shop where u kissed me.', 1.13, 0.06, 1, 1.6],
  ['jessica', 'rose', 'i wonder if you still wear our ring. i do.', -0.02, -1.33, 1, 1.2],
  ['sasha', 'xerox', 'the pretzel guy asked why i came alone. i said he won’t see you anymore.', 0.04, 1.34, 1, -1.4],
  ['david', 'green', 'my little alcoholic. the bartender at fifth ave asked about you.', -1.12, -1.36, 1, 2.4],
  ['ryan', 'white', 'i still can’t forgive you for what you have done. or maybe i can’t forgive myself for forgiving you.', 1.14, 1.38, 1, -2],
  ['maya', 'lilac', 'the coffee guy still makes two. i drink both.', 1.12, -1.3, 1, -1],
  ['noah', 'teal', 'you said we’d see the cherry blossoms next year. it’s next year.', -1.14, 1.36, 1, 1.8],
  // behind it, small and soft
  ['june', 'violet-yellow', 'your song came on at the laundromat and i let my clothes go round again.', -0.56, -0.68, 0.6, 3],
  ['theo', 'night', 'i walk the long way home now. it passes your building.', 0.58, 0.7, 0.6, -2.6],
  ['mina', 'acid', 'we never finished the show. i’m on episode six. i’m waiting.', 0.6, -2.0, 0.62, 2],
  ['eli', 'negative', 'i kept the receipt from our first dinner. $41.80. best money i ever spent.', -0.6, 2.02, 0.62, -3],
  ['ren', 'amber', 'the library seat by the window is free on tuesdays. i check.', -1.7, 0.66, 0.58, 1],
  ['jules', 'rose', 'do you still sleep on the left side?', 1.72, -0.64, 0.58, -1.5],
  // in front of it, close to the lens and passing it
  ['sam', 'green', 'you still have my hoodie. keep it. i just wanted you to know i know.', -1.55, -2.35, 2.1, -6],
  ['ana', 'ice', 'i saw your dog at the park today. he remembered me.', 1.65, 2.15, 2.25, 5],
]

// ── the reel ────────────────────────────────────────────────────────────────
export function Reel({ t }) {
  const [ok, setOk] = useState(false)
  const [mA, setMA] = useState(null)
  useEffect(() => { readyFilm(A.name, B.name).then(() => setOk(true)) }, [])
  useHold(ok && !!mA)
  const film = ok ? filmOf(A.name, B.name, 'rose') : null
  const tA = useMemo(typedA, [])
  const tB = useMemo(typedB, [])
  // the shake on the drop and on the envelope at the lens, the whole frame
  const sh = hit(t, S.drop, 170) * 16 + hit(t, 4120, 120) * 7 + hit(t, S.title, 110) * 6
  const shake = sh > 0.3 ? `translate(${(Math.sin(t * 0.37) * sh).toFixed(1)}px, ${(Math.cos(t * 0.29) * sh).toFixed(1)}px)` : undefined

  return (
    <Board w={1080} h={1920} grain={0} className="rl-board">
      {/* measured only once the phone's face is on the page (readyFilm waits
          for it), or the letters would be measured in the fallback face */}
      {ok ? <Measure who={A} times={tA} onMeasure={setMA} /> : null}
      <div className="rl-stage" style={{ transform: shake }}>
        {/* each scene owns exactly its own frames: a cut is a cut */}
        {t < S.send[0] && mA ? <MacroWall t={t} m={mA} times={tA} /> : null}
        {t >= S.send[0] && t < S.other[0] ? <SendScene t={t} times={tA} /> : null}
        {t >= S.other[0] && t < S.wait[0] ? <OtherScene t={t} times={tB} /> : null}
        <WaitScene t={t} />
        <Rays t={t} />
        {film && t >= 8950 && t < 13300 ? <GlassScene t={t} film={film} /> : null}
        <EndScene t={t} />
      </div>
      <Title t={t} />
      <Words t={t} />
      <Flash t={t} />
      <Grain opacity={0.075} seed={Math.floor(t / 83) % 12} />
      <span className="st-vignette" style={{ opacity: 0.62 }} aria-hidden="true" />
    </Board>
  )
}

// lin's phone at the size the camera starts at, laid out once and unseen, so
// every letter's place is known before the first frame
function Measure({ who, times, onMeasure }) {
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div className="rl-measure" aria-hidden="true">
      <NoteScreen
        who={who} t={99999} times={times} sendAt={1e9} fs={12.6} w={PW}
        onMeasure={(m, box) => { onMeasure({ m, box }); setDone(true) }}
      />
    </div>
  )
}

// ── 0.0 to 3.5: up close, and back into the wall ────────────────────────────
function MacroWall({ t, m, times }) {
  const C = { x: 540, y: 930 }
  // The camera up close does not chase the keys: it holds on the first
  // words as they are typed, crosses the glass in one move while the middle
  // of the note runs on out of the frame, and lands on its last word as the
  // question mark comes, the way a lens on a slider would
  const lineH = m.m[0].h
  const line = (i) => m.m[Math.min(i, m.m.length - 1)]
  const at1 = line(4)
  const at2 = line(A_LAND + 1)
  const cross = easeOf('expo.inOut')(u(t, 820, 1180))
  const px = lerp(at1.x + at1.w * 0.5 + u(t, -400, 820) * at1.w * 1.4, at2.x + at2.w * 0.5 + u(t, 1180, 1750) * at2.w * 0.8, cross)
  const py = lerp(at1.y + at1.h * 0.5, at2.y + at2.h * 0.5, cross)
  // the camera: a letter a hand high, then falling back to the wall
  const zMacro = 330 / lineH
  const zWall = 0.3
  const fall = easeOf('expo.inOut')(u(t, S.wall[0], S.wall[0] + 1100))
  const z = Math.exp(lerp(Math.log(zMacro), Math.log(zWall) - 0.06 * u(t, 2850, 3500), fall))
  // the point the camera holds, eased over to the middle of the phone as it
  // falls back, with a drift so the wall is never still
  const mid = { x: m.box.w / 2, y: m.box.h / 2 }
  const P = { x: lerp(px, mid.x, fall) + Math.sin(t / 700) * 22 * fall, y: lerp(py, mid.y, fall) + Math.cos(t / 830) * 18 * fall }
  // up close the glass is turned away from the lens and the plane of focus
  // is a band through the line; it comes square as the camera falls back
  const rx = lerp(17, 0, fall)
  const ry = lerp(-9, 0, fall)
  const rz = at([[0, -6], [1700, -2.5, 'sine.inOut'], [2900, 0, 'power3.inOut'], [3500, 1.5, 'sine.inOut']], t)
  // the wall goes quiet under the title
  const hush = at([[S.title - 120, 1], [S.title + 260, 0.32, 'power2.out'], [3250, 0.32], [3480, 0.9]], t)
  return (
    <div className="rl-cam" style={{ filter: hush < 0.999 ? `brightness(${hush.toFixed(3)})` : undefined }}>
      <div className="rl-tilt" style={{ transform: `rotate(${rz.toFixed(3)}deg)`, transformOrigin: `${C.x}px ${C.y}px` }}>
        {fall > 0.01 ? WALL.map(([name, tint, text, gx, gy, d, rot], i) => {
          // at rest, a phone stands at its place whatever its nearness; as
          // the camera moves, the nearness carries it
          const restX = C.x + gx * PW * 1.12 * zWall
          const restY = C.y + gy * PH * 1.12 * zWall
          const sx = restX + (mid.x - P.x) * z * d
          const sy = restY + (mid.y - P.y) * z * d
          // a phone near the lens is only seen as the camera comes to rest,
          // sweeping past an edge, and is never let grow over the shot
          const near = d > 1.5
          const s = (near ? Math.min(z, zWall * 1.5) : z) * d * (0.94 + 0.06 * fall)
          const off = Math.abs(1 - d)
          const blur = near ? 26 : off * 16
          const lit = wake(t, S.wall[0] + 180 + rnd(i + 3) * 760, 360) * (near ? u(fall, 0.6, 0.9) : 1)
          if (lit <= 0.001) return null
          return (
            <Place
              key={name} x={sx} y={sy} s={s} rz={rot} z={near ? 20 : d < 0.9 ? 1 : 3}
              filter={`blur(${blur.toFixed(1)}px) brightness(${(lit * (d < 0.9 ? 0.55 : near ? 0.7 : 0.95)).toFixed(3)})`}
            >
              <Phone w={PW} tint={tint} seed={`wall-${name}`} mode="draft" name={name} text={text} cursor={false} />
            </Place>
          )
        }) : null}
        <Place x={C.x} y={C.y} ax={P.x} ay={P.y} s={z} rx={rx} ry={ry} z={5}>
          <NoteScreen who={A} t={t} times={times} sendAt={1e9} fs={12.6} w={PW} quiet={false} />
        </Place>
        <Glow x={C.x + (mid.x - P.x) * z} y={C.y + (mid.y - P.y) * z} r={Math.min(1400, PW * z * 1.2)} colour={halo('ice')} o={0.75} z={2} />
      </div>
      {fall < 0.06 ? <span className="rl-dof" style={{ opacity: 1 - fall / 0.06 }} aria-hidden="true" /> : null}
    </div>
  )
}

// `unsent.` on the second beat of the second bar, with the phone's cursor
function Title({ t }) {
  if (t < S.title - 50 || t >= S.send[0]) return null
  const on = blink(t, S.title + 520)
  return (
    <Line
      text="unsent." t={t} from={S.title} to={3150} size={390} x={0} y={700} w={1080} align="center" stagger={36}
      className="rl-title" tail={<TailCursor on={on && t > S.title + 260 && t < 3150} />}
    />
  )
}

// ── 3.5 to 5.5: send ────────────────────────────────────────────────────────
function SendScene({ t, times }) {
  const k = u(t, S.send[0], S.send[1])
  // the phone, turned in depth and coming round as the camera pushes in
  const s = at([[3500, 0.7], [4900, 0.77, 'sine.out']], t) * (1 + hit(t, S.press, 90) * 0.012)
  const ry = lerp(-22, -6, easeOf('power2.out')(k))
  const rx = lerp(9, 3, k)
  const x = 540
  const y = 700
  // the screen going out: down to a line, then to a point, then nothing
  const sy = at([[S.off, 1], [S.off + 170, 0.008, 'power3.in']], t)
  const sx = at([[S.off + 170, 1], [S.off + 330, 0.015, 'power2.in']], t)
  const white = at([[S.off, 1], [S.off + 170, 2.6, 'power2.in'], [S.off + 330, 3.2], [S.off + 480, 0, 'power2.out']], t)
  const dot = u(t, S.off + 300, S.off + 330) * (1 - u(t, S.off + 330, S.off + 520))
  // the envelope, out of the glass and at the lens
  const e = u(t, 3690, 4180)
  const ek = easeOf('expo.in')(e)
  const ew = lerp(70, 2300, ek)
  const eo = (t < 3690 ? 0 : 1) * (1 - u(t, 4060, 4200))
  return (
    <div className="rl-cam">
      <Glow x={x} y={y} r={720} colour={halo('ice')} o={sy * sx * 0.95} />
      <div className="rl-off" style={{ transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: `${x}px ${y}px`, filter: `brightness(${white.toFixed(3)})` }}>
        <Place x={x} y={y} s={s} rx={rx} ry={ry}>
          <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} w={PW} quiet={false} />
        </Place>
      </div>
      {dot > 0 ? <span className="rl-dot" style={{ left: x - 9, top: y - 9, opacity: dot }} /> : null}
      {eo > 0 ? [4, 3, 2, 1, 0].map((g) => {
        const eg = easeOf('expo.in')(u(t - g * 18, 3690, 4180))
        return <Envelope key={g} x={x + Math.sin(eg * 2.4) * 40} y={y - 40 + eg * 260} w={lerp(70, 2300, eg)} o={eo * (g ? 0.16 : 1)} rz={eg * -8} glow="rgba(143,184,220,0.7)" />
      }) : null}
      <span className="rl-ewash" style={{ opacity: ew > 900 ? hit(t, 4110, 160) * 0.5 : 0 }} />
    </div>
  )
}

// ── 5.5 to 7.5: the other ───────────────────────────────────────────────────
function OtherScene({ t, times }) {
  const w = wake(t, S.bWake, 420)
  const k = easeOf('expo.out')(u(t, S.bWake, S.bWake + 800))
  const s = lerp(0.22, 0.62, k) + u(t, 6300, 7500) * 0.03
  const ry = lerp(30, -7, k)
  const rx = lerp(-6, 4, k)
  const x = 540
  const y = lerp(760, 610, k)
  // after the send, the phone goes to sleep and steps back
  const sleep = at([[7150, 0], [7500, 0.85, 'power2.inOut']], t)
  const back = at([[7150, 1], [7500, 0.9, 'power2.inOut']], t)
  // the envelope, away into the dark
  const e = easeOf('power3.in')(u(t, 7080, 7480))
  return (
    <div className="rl-cam">
      <Glow x={x} y={y} r={700} colour={halo('amber')} o={w * (1 - sleep) * 0.95} />
      <Place x={x} y={y} s={s * back} rx={rx} ry={ry} filter={`brightness(${(w * (1 - sleep * 0.9)).toFixed(3)})`}>
        <NoteScreen who={B} t={t} times={times} sendAt={S.bSend} fs={13.4} w={PW} quiet={false} />
      </Place>
      {t > 7080 && t < 7500 ? [3, 2, 1, 0].map((g) => {
        const eg = easeOf('power3.in')(u(t - g * 22, 7080, 7480))
        return <Envelope key={g} x={x + eg * 120} y={y - 60 - eg * 520} w={lerp(150, 6, eg)} o={(1 - eg * 0.4) * (g ? 0.2 : 1)} colour="#F7D9A8" glow="rgba(224,169,90,0.8)" />
      }) : null}
      {e > 0 && e < 1 ? null : null}
    </div>
  )
}

// the words set large over scenes C and D, each on its beat
function Words({ t }) {
  return (
    <>
      <Line text="send it" t={t} from={S.sendIt} to={4930} size={250} x={74} y={1180} cut={S.send[1]} />
      <Line text="privately." t={t} from={S.privately} to={4960} size={250} italic x={74} y={1400} stagger={22} cut={S.send[1]} />
      <Line text="they only read it" t={t} from={S.read} to={7060} size={128} x={78} y={1020} stagger={16} cut={7500} />
      <Line text="if they send" t={t} from={S.ifThey} to={7080} size={204} italic x={70} y={1170} stagger={20} cut={7500} />
      <Line text="you one." t={t} from={S.ifThey + 250} to={7100} size={204} italic x={70} y={1360} stagger={22} cut={7500} />
    </>
  )
}

// ── 7.5 to 9.0: the week, on the flaps ──────────────────────────────────────
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const CITY = ['street-four', 'street-spiders', 'wall-david', 'shutter-lin', 'fridge-sasha', 'shutter-ryan']
const TIME = '9:00 pm'

// One flap of a board: the card turning down from the last character to
// the next, its upper half falling over the hinge and the lower half of the
// next landing after it
function Flap({ seq, times, t, w, h, size }) {
  let k = -1
  while (k + 1 < times.length && times[k + 1] <= t) k++
  const cur = k >= 0 ? seq[k] : ' '
  const prev = k >= 1 ? seq[k - 1] : ' '
  const p = k >= 0 ? clamp((t - times[k]) / 190) : 1
  const ch = (c) => <span className="rl-flap-ch" style={{ height: h, lineHeight: `${h}px`, fontSize: size }}>{c}</span>
  const upper = (c) => <div className="rl-flap-half is-top" style={{ height: h / 2 }}>{ch(c)}</div>
  const lower = (c) => <div className="rl-flap-half is-bot" style={{ height: h / 2, top: h / 2 }}><div style={{ marginTop: -h / 2 }}>{ch(c)}</div></div>
  return (
    <div className="rl-flap" style={{ width: w, height: h }}>
      {upper(p < 0.5 ? cur : cur)}
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
  const on = t >= S.wait[0] && t < S.wait[1]
  // the day it is, and the city under it
  let d = -1
  while (d + 1 < S.days.length && S.days[d + 1] <= t) d++
  d = Math.max(0, d)
  const since = t - S.days[d]
  const zoom = 1.12 - easeOf('power2.out')(clamp(since / 250)) * 0.07 - (d === 5 ? u(t, 8750, 9000) * 0.03 : 0)
  const fl = d === 5 ? 1 : 0.7 + 0.3 * (1 - hit(t, S.days[d], 50))
  const cw = 284
  const chh = 384
  const gap = 20
  const timeT = S.days[5] + 60
  return (
    <div className="rl-cam" style={{ visibility: on ? 'visible' : 'hidden' }}>
      {CITY.map((name, i) => (
        <img
          key={name} className="rl-city" src={dither(name)} alt=""
          style={{ opacity: i === d ? 1 : 0, transform: `scale(${zoom.toFixed(4)})`, filter: `brightness(${(0.86 * fl).toFixed(3)})` }}
        />
      ))}
      <div className="rl-board-shade" />
      <p className="rl-label" style={{ top: 548 }}>the reveal</p>
      <div className="rl-flaps" style={{ top: 604, gap }}>
        {[0, 1, 2].map((c) => (
          <Flap key={c} seq={DAYS.map((x) => x[c])} times={S.days.map((x) => x + c * 28)} t={t} w={cw} h={chh} size={360} />
        ))}
      </div>
      <div className="rl-flaps" style={{ top: 604 + chh + 30, gap: 10 }}>
        {[...TIME].map((c, i) => (t >= timeT + i * 36 ? (
          <Flap key={i} seq={[c]} times={[timeT + i * 36]} t={t} w={c === ' ' ? 40 : c === ':' ? 70 : 118} h={170} size={160} />
        ) : <span key={i} style={{ width: c === ' ' ? 40 : c === ':' ? 70 : 118 }} />))}
      </div>
      <p className="rl-label" style={{ top: 604 + chh + 30 + 170 + 36, opacity: u(t, timeT + 200, timeT + 400) }}>pacific.</p>
    </div>
  )
}

// ── 9.0 to 12.6: the glass ──────────────────────────────────────────────────
// The mutual's own film on the phone's own glass, at the size of the room
// to start: the glass fills the frame and the two of them run in from past
// its edges. On the drop they are held, the glass turns rose, and the phone
// steps back to say it.
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
  // the camera: the glass the height of the frame, then back to the phone
  const back = easeOf('expo.inOut')(u(t, 10650, 11650))
  const end = easeOf('power2.inOut')(u(t, S.end[0], S.end[0] + 500))
  let s = 1
  let x = 540
  let y = 960
  if (g) {
    const s0 = (1920 / g.h) * 1.04
    const s1 = 880 / g.w
    s = Math.exp(lerp(Math.log(s0), Math.log(s1), back)) * (1 + u(t, S.run[0], S.drop) * 0.05 * (1 - back))
    y = lerp(960, 830, back)
    x = 540
  }
  const cx = g ? x - (g.x + g.w / 2) * s : 0
  const cy = g ? y - (g.y + g.h / 2) * s : 0
  // the drop: the colours pulled apart for a moment, and let go
  const ca = hit(t, S.drop, 140) * 9
  const fade = t < S.run[0] ? 0 : 1 - end
  return (
    <div className="rl-cam" style={{ opacity: fade.toFixed(3) }}>
      <Glow x={540} y={y} r={lerp(1300, 900, back)} colour={turn > 0.5 ? halo('rose') : halo('night')} o={(0.35 + 0.65 * turn) * back} />
      <div
        ref={ref} className="rl-glass"
        style={{
          transform: `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${s.toFixed(4)})`,
          filter: ca > 0.3 ? `drop-shadow(${ca.toFixed(1)}px 0 0 rgba(255, 40, 110, 0.55)) drop-shadow(${(-ca).toFixed(1)}px 0 0 rgba(40, 190, 255, 0.55))` : undefined,
        }}
      >
        <Phone w={PW} mode="bare" square seed="intro" tint="rose" className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}>
          <PixelStory story={film} at={st} />
        </Phone>
      </div>
    </div>
  )
}

// the light behind the glass once it turns: rays, in the rose
function Rays({ t }) {
  const o = at([[10150, 0], [10900, 0.85, 'power2.out'], [12400, 0.7], [13100, 0, 'power2.inOut']], t)
  return (
    <div className="rl-rays" style={{ opacity: o.toFixed(3), visibility: o > 0.002 ? 'visible' : 'hidden' }}>
      <GodRays
        style={{ width: '100%', height: '100%' }} speed={0} frame={t * 0.6} minPixelRatio={0.2} maxPixelCount={150000}
        colorBack="#00000000" colorBloom="#DF93AF" colors={['#F7C6D9', '#DF93AF', '#A28CE0', '#FFE3EE']}
        offsetX={0} offsetY={-0.14} density={0.32} spotty={0.3} midSize={0.2} midIntensity={0.5} intensity={0.55} bloom={0.4}
      />
    </div>
  )
}

// ── the mark, poured ────────────────────────────────────────────────────────
// LiquidMark's own settings (DESIGN.md 3.5), on the mask scripts/export-
// liquid.mjs solved once from the mark's geometry: its red an edge distance
// field and its green the opacity, so the shader is handed it as it is and
// never asked to solve it again. Chalk on nothing: the metal is the light.
const METAL = {
  u_colorBack: [0, 0, 0, 0], u_colorTint: [0.957, 0.945, 0.918, 1], u_image: '/liquid-mark.png', u_isImage: true,
  u_shape: LiquidMetalShapes.none, u_softness: 0.3, u_repetition: 1.7, u_shiftRed: 0.06, u_shiftBlue: 0.06,
  u_distortion: 0.12, u_contour: 0.65, u_angle: 70,
  u_fit: ShaderFitOptions.contain, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
  u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
}

// ── 12.6 to 15.0: the end ───────────────────────────────────────────────────
function EndScene({ t }) {
  const k = easeOf('power3.inOut')(u(t, S.end[0], S.end[0] + 750))
  const o = u(t, S.end[0], S.end[0] + 420)
  // from where the mark stood on the glass to where it is kept
  const size = lerp(470, 640, k)
  const cy = lerp(724, 520, k)
  const on = blink(t, 14000)
  return (
    <div className="rl-cam rl-end" style={{ visibility: o > 0.002 ? 'visible' : 'hidden' }}>
      <Glow x={540} y={cy} r={760} colour="rgba(223, 147, 175, 0.42)" o={o * 0.9} />
      <div className="rl-metal" style={{ left: 540 - size / 2, top: cy - size / 2, width: size, height: size, opacity: o }}>
        <ShaderMount
          fragmentShader={liquidMetalFragmentShader} uniforms={METAL} mipmaps={['u_image']}
          speed={0} frame={2000 + t * 1.1} minPixelRatio={1} maxPixelCount={700 * 700}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <Line text="nothing happens" t={t} from={12950} size={124} x={92} y={960} stagger={18} />
      <Line text="unless it’s" t={t} from={13200} size={124} x={92} y={1080} stagger={20} />
      <Line text="mutual." t={t} from={13450} size={250} italic x={80} y={1170} stagger={30} tail={<TailCursor on={on && t > 13900} />} />
      <div className="rl-sign" style={{ opacity: easeOf('power2.out')(u(t, 13800, 14250)) }}>
        <Lockup cell={3} />
        <span className="rl-url">celestual.us</span>
      </div>
    </div>
  )
}

// the flashes: on the cut to send, on the envelope at the lens, on the drop
function Flash({ t }) {
  const a = hit(t, S.press - 10, 70) * 0.18 + hit(t, S.drop, 200) * 0.75 + hit(t, S.bWake, 60) * 0.12
  if (a < 0.004) return null
  const rose = t >= S.drop - 20
  return <span className="rl-flash" style={{ opacity: a.toFixed(3), background: rose ? 'radial-gradient(70% 55% at 50% 48%, #FFF4F8, #DF93AF 70%)' : '#EAF4FF' }} />
}

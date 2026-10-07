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
import { ShaderMount } from '@paper-design/shaders-react'
import { liquidMetalFragmentShader, LiquidMetalShapes, ShaderFitOptions } from '@paper-design/shaders'
import { Board, Phone, PixelStory, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import { glyphPath } from '../../wall/looks.js'
import { MS, A, B, S, typedA, typedB, storyAt, A_HOLD } from './reel-time.js'
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
function Envelope({ x, y, w, o = 1, colour = '#F4F1EA', glow = 'rgba(255,244,228,0.6)', rz = 0, solid = '' }) {
  const h = (w * ENV.h) / ENV.w
  return (
    <svg
      className="rl-env" viewBox={`0 0 ${ENV.w} ${ENV.h}`} shapeRendering="crispEdges"
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: `rotate(${rz}deg)`, filter: `drop-shadow(0 0 ${Math.max(4, w * 0.06)}px ${glow})` }}
      aria-hidden="true"
    >
      {solid ? <rect x="0" y="0" width={ENV.w} height={ENV.h} fill={solid} /> : null}
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
  const sh = hit(t, S.drop, 150) * 5 + hit(t, 4120, 120) * 7 + hit(t, S.title, 110) * 5
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
  const lineH = m.m[0].h
  const ch = (i) => m.m[Math.min(i, m.m.length - 1)]
  // The first frame is the cover: the first line of the note whole across
  // the frame, the cursor after it. Then the camera pushes in on the note
  // as it is typed, after the cursor, and arrives a letter a hand high as
  // the question mark comes. Then it falls back, holds the whole phone for
  // an eighth note (the campaign's own picture: a draft, the cursor after
  // its last word), and falls back again into the wall
  const first = { x0: ch(0).x, x1: ch(A_HOLD - 2).x + ch(A_HOLD - 2).w, y: ch(0).y + ch(0).h * 0.5 }
  const z0 = (0.9 * 1080) / (first.x1 - first.x0)
  const zMacro = 330 / lineH
  const push = easeOf('sine.inOut')(u(t, 0, 1650))
  const cur = (tt) => {
    const n = typedAt(times, tt)
    const g = ch(n)
    return { x: g.x, y: g.y + g.h * 0.5 }
  }
  let cx = 0
  let cy = 0
  for (let j = 0; j < 12; j++) { const p = cur(t - j * 25); cx += p.x; cy += p.y }
  cx /= 12; cy /= 12
  const mx = lerp((first.x0 + first.x1) / 2, cx, push)
  const my = lerp(first.y, cy, push)
  const zm = Math.exp(lerp(Math.log(z0), Math.log(zMacro), push))
  const zHold = 0.86
  const zWall = 0.3
  const fallA = easeOf('expo.inOut')(u(t, S.wall[0], 2050))
  const fallB = easeOf('expo.inOut')(u(t, 2300, 2950))
  const z = Math.exp(lerp(lerp(Math.log(zm), Math.log(zHold), fallA), Math.log(zWall) - 0.06 * u(t, 2950, 3500), fallB))
  const mid = { x: m.box.w / 2, y: m.box.h / 2 }
  const P = {
    x: lerp(mx, mid.x, fallA) + Math.sin(t / 700) * 22 * fallB,
    y: lerp(my, mid.y, fallA) + Math.cos(t / 830) * 18 * fallB,
  }
  // up close the glass is turned away from the lens and the plane of focus
  // is a band through the line; it comes square as the camera falls back
  const rx = lerp(lerp(6, 15, push), 0, fallA)
  const ry = lerp(lerp(-4, -9, push), 0, fallA)
  const rz = at([[0, -3], [1700, -2, 'sine.inOut'], [2300, 0, 'power3.inOut'], [3500, 1.5, 'sine.inOut']], t)
  // the wall goes quiet under the title
  const hush = at([[S.title - 120, 1], [S.title + 260, 0.32, 'power2.out'], [3250, 0.32], [3480, 0.9]], t)
  const dof = push * (1 - fallA)
  return (
    <div className="rl-cam" style={{ filter: hush < 0.999 ? `brightness(${hush.toFixed(3)})` : undefined }}>
      <div className="rl-tilt" style={{ transform: `rotate(${rz.toFixed(3)}deg)`, transformOrigin: `${C.x}px ${C.y}px` }}>
        {fallB > 0.001 ? WALL.map(([name, tint, text, gx, gy, d, rot], i) => {
          // where a phone stands in the plane of lin's, pushed out by its
          // nearness so that at rest it stands at its place; as the camera
          // moves, its nearness carries it further or less
          const sx = C.x + (mid.x - P.x) * z * d + gx * PW * 1.12 * z
          const sy = C.y + (mid.y - P.y) * z * d + gy * PH * 1.12 * z
          // a phone near the lens is only seen as the camera comes to rest,
          // sweeping past an edge, and is never let grow over the shot
          const near = d > 1.5
          const s = (near ? Math.min(z, zWall * 1.5) : z) * d
          const off = Math.abs(1 - d)
          const blur = near ? 26 : off * 16
          const lit = wake(t, 2320 + rnd(i + 3) * 620, 360) * (near ? u(fallB, 0.6, 0.9) : 1)
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
      {dof > 0.05 ? <span className="rl-dof" style={{ opacity: dof.toFixed(3) }} aria-hidden="true" /> : null}
    </div>
  )
}

// `unsent.` on the second beat of the second bar, with the phone's cursor
function Title({ t }) {
  if (t < S.title - 50 || t >= S.send[0]) return null
  const on = blink(t, S.title + 520)
  return (
    <Line
      text="unsent." t={t} from={S.title} to={3150} size={296} x={0} y={790} w={1080} align="center" stagger={36}
      className="rl-title" tail={<TailCursor on={on && t > S.title + 260 && t < 3150} />}
    />
  )
}

// ── 3.5 to 5.5: send ────────────────────────────────────────────────────────
function SendScene({ t, times }) {
  const k = u(t, S.send[0], S.send[1])
  // the phone too near to be whole, past the edges of the frame, coming
  // round as the camera pushes in; the words stand over the black above it
  const s = at([[3500, 1.15], [5500, 1.45, 'none']], t) * (1 + hit(t, S.press, 90) * 0.012)
  const ry = lerp(-26, 14, easeOf('sine.inOut')(k))
  const rx = lerp(7, 2, k)
  const x = 540
  const y = 1250
  // the screen going out, as the phone puts it out: its light down to
  // nothing in a fifth of a second, the light on the room a little after
  const dim = at([[S.off, 1], [S.off + 200, 0.05, 'power2.in'], [S.off + 400, 0, 'power1.out']], t)
  const glow = at([[S.off + 90, 1], [S.off + 290, 0, 'power2.in']], t)
  // the envelope, out of the glass and at the lens, a solid thing that
  // wipes the frame on the beat, and then is gone
  const e = easeOf('expo.in')(u(t, 3690, 4120))
  const eon = t >= 3690 && t <= 4140
  return (
    <div className="rl-cam">
      <Glow x={x} y={y - 80} r={900} colour={halo('ice')} o={glow * 0.95} />
      <Place x={x} y={y} s={s} rx={rx} ry={ry} filter={dim < 0.999 ? `brightness(${dim.toFixed(3)})` : undefined}>
        <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} w={PW} quiet={false} />
      </Place>
      {eon ? <Envelope x={x + Math.sin(e * 2.4) * 40} y={lerp(1180, 980, e)} w={lerp(90, 2600, e)} rz={e * -8} glow="rgba(143,184,220,0.7)" solid="#0E1822" /> : null}
    </div>
  )
}

// ── 5.5 to 7.5: the other ───────────────────────────────────────────────────
function OtherScene({ t, times }) {
  const w = wake(t, S.bWake, 420)
  const k = easeOf('expo.out')(u(t, S.bWake, S.bWake + 800))
  const s = lerp(0.5, 1.25, k) + u(t, 6300, 7500) * 0.15
  const ry = lerp(30, -8, k)
  const rx = lerp(-6, 4, k)
  const x = 540
  const y = lerp(1500, 1250, k)
  // after the send, the phone goes to sleep and steps back
  const sleep = at([[7150, 0], [7500, 0.85, 'power2.inOut']], t)
  const back = at([[7150, 1], [7500, 0.92, 'power2.inOut']], t)
  // the envelope, off the glass after the send and away into the dark
  const e = easeOf('power3.in')(u(t, S.bSend + 170, 7500))
  return (
    <div className="rl-cam">
      <Glow x={x} y={y - 80} r={900} colour={halo('amber')} o={w * (1 - sleep) * 0.95} />
      <Place x={x} y={y} s={s * back} rx={rx} ry={ry} filter={`brightness(${(w * (1 - sleep * 0.9)).toFixed(3)})`}>
        <NoteScreen who={B} t={t} times={times} sendAt={S.bSend} fs={13.4} w={PW} quiet={false} />
      </Place>
      {t > S.bSend + 170 && t < 7500 ? (
        <Envelope x={x + e * 90} y={lerp(1120, 260, e)} w={lerp(170, 8, e)} o={1 - e * 0.5} colour="#F7D9A8" glow="rgba(224,169,90,0.8)" solid="#24170A" />
      ) : null}
    </div>
  )
}

// the words set large over scenes C and D, each on its beat, and a shade
// down from the top of the frame while they stand, so the phone's own
// letters behind them go quiet
function Words({ t }) {
  const shade = t < S.send[1]
    ? u(t, S.sendIt - 80, S.sendIt + 160)
    : t < S.wait[0] ? u(t, S.read - 80, S.read + 160) : 0
  return (
    <>
      {shade > 0 ? <div className="rl-shade" style={{ opacity: shade.toFixed(3) }} /> : null}
      <Line text="send it" t={t} from={S.sendIt} to={4930} size={230} x={70} y={300} cut={S.send[1]} />
      <Line text="privately." t={t} from={S.privately} to={4960} size={230} italic x={70} y={507} stagger={22} cut={S.send[1]} />
      <Line text="they only read it" t={t} from={S.read} to={7060} size={124} x={74} y={300} stagger={16} cut={S.wait[0]} />
      <Line text="if they send" t={t} from={S.ifThey} to={7080} size={176} x={66} y={432} stagger={20} cut={S.wait[0]} />
      <Line text="you one." t={t} from={S.ifThey + 250} to={7100} size={176} x={66} y={590} stagger={22} cut={S.wait[0]} />
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
  const p = k >= 0 ? clamp((t - times[k]) / 110) : 1
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
  const timeT = S.time
  return (
    <div className="rl-cam" style={{ visibility: on ? 'visible' : 'hidden' }}>
      {CITY.map((name, i) => (
        <img
          key={name} className="rl-city" src={dither(name)} alt=""
          style={{ opacity: i === d ? 1 : 0, transform: `scale(${zoom.toFixed(4)})`, filter: `brightness(${(0.45 * fl).toFixed(3)})` }}
        />
      ))}
      <div className="rl-board-shade" />
      <div className="rl-housing" />
      <p className="rl-label" style={{ top: 548 }}>the reveal</p>
      <div className="rl-flaps" style={{ top: 604, gap }}>
        {[0, 1, 2].map((c) => (
          <Flap key={c} seq={DAYS.map((x) => x[c])} times={S.days.map((x) => x + c * 28)} t={t} w={cw} h={chh} size={360} />
        ))}
      </div>
      <div className="rl-flaps" style={{ top: 604 + chh + 30, gap: 10 }}>
        {[...TIME].map((c, i) => (c !== ' ' && t >= timeT + i * 24 ? (
          <Flap key={i} seq={[c]} times={[timeT + i * 24]} t={t} w={c === ':' ? 70 : 118} h={170} size={160} />
        ) : <span key={i} style={{ width: c === ' ' ? 34 : c === ':' ? 70 : 118 }} />))}
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
  const back = easeOf('expo.inOut')(u(t, 10450, 11450))
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
  const fade = t < S.run[0] ? 0 : 1 - end
  return (
    <div className="rl-cam" style={{ opacity: fade.toFixed(3) }}>
      <Glow x={540} y={y} r={1100} colour={turn > 0.5 ? halo('rose') : halo('night')} o={(0.5 + 0.5 * turn) * back} />
      <div
        ref={ref} className="rl-glass"
        style={{
          transform: `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${s.toFixed(4)})`,
        }}
      >
        <Phone w={PW} mode="bare" square seed="intro" tint="rose" className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}>
          <PixelStory story={film} at={st} />
        </Phone>
      </div>
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
// The mark leaves the glass and is poured, and is hung on the axis the line
// is set on, with nothing behind it: the metal is the light (DESIGN.md 3.5).
// Its metal runs while it comes and slows to a stand as the last word lands,
// so it is held at its brightest.
function EndScene({ t }) {
  const k = easeOf('power3.inOut')(u(t, S.end[0], S.end[0] + 750))
  const o = u(t, S.end[0], S.end[0] + 420)
  const size = lerp(470, 560, k)
  const cx = lerp(540, 92 + 560 / 2, k)
  const cy = lerp(724, 520, k)
  const settle = 13450
  const frame = 2000 + 1.1 * (t < settle ? t : settle + (t - settle) * 0.12)
  const on = blink(t, 14000)
  return (
    <div className="rl-cam rl-end" style={{ visibility: o > 0.002 ? 'visible' : 'hidden' }}>
      <div className="rl-metal" style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size, opacity: o }}>
        <ShaderMount
          fragmentShader={liquidMetalFragmentShader} uniforms={METAL} mipmaps={['u_image']}
          speed={0} frame={frame} minPixelRatio={1} maxPixelCount={700 * 700}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <Line text="nothing happens" t={t} from={12950} size={116} x={92} y={880} stagger={18} />
      <Line text="unless it’s" t={t} from={13200} size={116} x={92} y={985} stagger={20} />
      <Line text="mutual." t={t} from={13450} size={250} italic x={80} y={1070} stagger={30} tail={<TailCursor on={on && t > 13900} />} />
      <p className="rl-url" style={{ opacity: easeOf('power2.out')(u(t, 13500, 13850)), transform: `translateY(${((1 - easeOf('power2.out')(u(t, 13500, 13850))) * 10).toFixed(1)}px)` }}>celestual.us</p>
    </div>
  )
}

// the flashes: on the cut to send, on the envelope at the lens, on the drop
function Flash({ t }) {
  const a = hit(t, S.press - 10, 70) * 0.18 + hit(t, S.drop, 35) * 0.25
  if (a < 0.004) return null
  return <span className="rl-flash" style={{ opacity: a.toFixed(3), background: t >= S.drop - 20 ? '#FFFFFF' : '#EAF4FF' }} />
}

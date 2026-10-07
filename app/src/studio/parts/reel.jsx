// ── the reel ────────────────────────────────────────────────────────────────
//
// Twenty two seconds, cut to a score at 120 beats a minute (reel-time.js),
// drawn from `t` and nothing else, so scripts/studio-film.mjs can photograph
// it a frame at a time. Everything on it is the product's own: the wall's
// `Screen` in its twelve colours and on Berkeley's network, the Campanile
// the wall's masthead carries (art.jsx), the mutual's pixel film
// (pixmark.js), the lockup drawn a cell at a time (brand.js), the faces,
// and the campaign's photographs dithered in the screens' inks.
//
// GSAP moves it. Each scene builds one paused timeline on its own nodes and
// is put at the reel's moment on every frame (`useScene`), so a frame is the
// same however it is come to: DrawSVG plots the tower and its construction
// lines, MorphSVG grows the lantern's light into the star, SplitText sets
// every line a letter at a time out of its own mask, Physics2D throws the
// hearts, MotionPath carries kai's note off, TextPlugin types the address,
// and CustomEase and CustomWiggle draw every curve.
//
//   0.0  the glass up close: a note typed a hand high, the camera after the
//        cursor across the phone's own pixels
//   1.75 the camera falls back through the phone into a wall of letters, the
//        wall's own line over it, and every letter goes round the twelve
//        colours, out from lin's
//   4.0  the whip into the dark, the berkeley wall: the campanile plotted as
//        its elevation is, from the ground up, its lantern lit on the beat,
//        the campus's letters turning round it as the mark's ring turns
//        round its star. a finger stops them, opens one, and hearts it
//   7.5  send is pressed: the envelope comes at the lens, `or send it`
//        `privately.`, and the screen goes out
//   9.5  the other phone, amber, writing one of its own: `they only read it`
//        `if they send` `you one.`
//  11.5  the week on the flaps, and a finger on the time opens the glass
//  13.0  the glass the size of the room: the two of them run in
//  14.0  the drop. they are held, the light goes over everything, the mark,
//        and `it's mutual.` in its cells
//  16.5  `do they still` `think about` `you?`; its letters go to the phone's
//        pixels, two lights of them circling, and on the last bar they meet
//        and are the name, drawn, with the address under it

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { TextPlugin } from 'gsap/TextPlugin'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { Board, Phone, PixelStory, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars, Lockup, LOCKUP, MARK } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import { glyphPath } from '../../wall/looks.js'
import { Campanile } from '../../wall/art.jsx'
import { schoolOf } from '../../wall/schools.js'
import { cellsOf, wordCells } from '../../wall/brand.js'
import { MS, A, B, S, typedA, typedB, storyAt, A_HOLD, ORBIT, orbitOf } from './reel-time.js'
import './reel.css'

export { MS }

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, SplitText, MotionPathPlugin, Physics2DPlugin, TextPlugin, CustomEase, CustomWiggle)

// ── the curves ──────────────────────────────────────────────────────────────
// drawn for this film: a letter's rise (quick off the mark, a long settle),
// a camera's move, the whip, a carousel spun by a hand and let run down,
// and the two wiggles, a lantern's and a phone's
CustomEase.create('rl.type', 'M0,0 C0.18,0.84 0.26,1 1,1')
CustomEase.create('rl.out', 'M0,0 C0.12,0.72 0.18,1 1,1')
CustomEase.create('rl.inOut', 'M0,0 C0.62,0 0.16,1 1,1')
CustomEase.create('rl.whip', 'M0,0 C0.55,0 0.85,0.35 1,1')
CustomEase.create('rl.spin', 'M0,0 C0.22,0.62 0.42,1 1,1')
CustomWiggle.create('rl.twinkle', { wiggles: 5, type: 'easeOut' })
CustomWiggle.create('rl.buzz', { wiggles: 7, type: 'easeOut' })

const DITHER = import.meta.glob('../assets/dither/*.png', { eager: true, import: 'default' })
const dither = (name) => DITHER[`../assets/dither/${name}.png`]

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

// ── a scene's timeline ──────────────────────────────────────────────────────
// Built once on the scene's own nodes, paused, and put at the reel's moment
// on every frame, before the frame is drawn; `after` reads what it moved.
// The context takes everything GSAP did (SplitText's letters included) back
// when the scene goes.
function useScene(t, build, after = null) {
  const root = useRef(null)
  const tl = useRef(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => { tl.current = build(root.current) }, root)
    return () => { ctx.revert(); tl.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!tl.current) return
    tl.current.seek(t / 1000, false)
    if (after) after(tl.current)
  })
  return root
}

// ── type ────────────────────────────────────────────────────────────────────
// One type system for the whole film: the display face, lowercase, at two
// sizes, a line (M) and the line that carries it (XL, in italic, always the
// last), every line on one margin in one band at the top of the frame and
// never wider than 920, and the question at the end in the middle of it.
//
// A line is set the way the phone's own pixels would set it. SplitText cuts
// it into its letters; on the line's beat each letter comes, one after the
// other, as coarse cells of the phone's grid, then finer, then finer again,
// and then is the face itself, a twenty-fourth of a second a step; and goes
// back the same way into the cells and out. The cells are cut once, off a
// canvas with every letter drawn in the same face where the page set it, on
// grids of 16, 8 and 4 pixels laid over the whole line, so the cells of one
// letter line up with its neighbour's. So the end, where the question goes
// to the phone's pixels, is the rule every line before it was set by.
export const X0 = 80
export const Y0 = 300
export const M = 132
export const XL = 210
const LH = 0.9
export const lineAt = (n, size = M) => Y0 + Math.round(n * size * LH)
const STEPS = [16, 8, 4]
const STEP_MS = 42

const Set = memo(function Set({ text, italic }) {
  return <span className={`rl-set${italic ? ' is-it' : ''}`}>{text}</span>
})
export function Type({ t, from, to = Infinity, cut = Infinity, ...rest }) {
  if (t < from - 60 || t >= cut || t > to + 1200) return null
  return <TypeLive t={t} from={from} to={to} {...rest} />
}
function TypeLive({ t, text, from, to, size = M, italic = false, x = X0, y = Y0, w = 1080 - x, align = 'left', stagger = 26, fade = null, className = '' }) {
  const root = useRef(null)
  const canvas = useRef(null)
  const cut = useRef(null)
  useLayoutEffect(() => {
    const el = root.current
    const set = el.querySelector('.rl-set')
    const split = new SplitText(set, { type: 'chars', charsClass: 'rl-c' })
    const chars = split.chars
    const cs = getComputedStyle(set)
    const px = parseFloat(cs.fontSize)
    const pad = Math.ceil(px * 0.4)
    const W = Math.ceil(el.offsetWidth + pad * 2)
    const H = Math.ceil(el.offsetHeight + pad * 2)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d', { willReadFrequently: true })
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`
    g.fillStyle = '#fff'
    g.textBaseline = 'alphabetic'
    const mt = g.measureText('Hg')
    const asc = mt.fontBoundingBoxAscent
    const desc = mt.fontBoundingBoxDescent
    // every letter drawn where the page set it, from its own box (the
    // letters' boxes are the page's layout, so a camera's transform on the
    // scene never moves them)
    const boxes = chars.map((ch) => ({ x: ch.offsetLeft + pad, y: ch.offsetTop + pad, w: ch.offsetWidth, h: ch.offsetHeight }))
    chars.forEach((ch, i) => {
      const b = boxes[i]
      g.fillText(ch.textContent, b.x, b.y + (b.h - (asc + desc)) / 2 + asc)
    })
    const img = g.getImageData(0, 0, W, H).data
    const owner = (cx) => {
      let k = boxes.findIndex((b) => cx >= b.x && cx < b.x + b.w)
      if (k < 0) {
        let best = Infinity
        boxes.forEach((b, i) => { const d = Math.abs(b.x + b.w / 2 - cx); if (d < best) { best = d; k = i } })
      }
      return k
    }
    const cells = STEPS.map((p) => {
      const per = chars.map(() => [])
      for (let yy = 0; yy + p <= H; yy += p) {
        for (let xx = 0; xx + p <= W; xx += p) {
          let a = 0
          for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) a += img[((yy + j) * W + xx + i) * 4 + 3]
          if (a / (p * p * 255) > 0.36) per[owner(xx + p / 2)].push([xx, yy])
        }
      }
      return per
    })
    const cv = canvas.current
    cv.width = W
    cv.height = H
    cv.style.left = `${-pad}px`
    cv.style.top = `${-pad}px`
    cut.current = { chars, cells }
    return () => { split.revert(); cut.current = null }
  }, [])
  // each letter at its step: none yet, cells at 16, 8 or 4, or the face;
  // and back out
  useLayoutEffect(() => {
    const d = cut.current
    const cv = canvas.current
    if (!d || !cv) return
    const g = cv.getContext('2d')
    g.clearRect(0, 0, cv.width, cv.height)
    g.fillStyle = '#F4F1EA'
    d.chars.forEach((ch, i) => {
      const a0 = from + i * stagger
      let step = t < a0 ? -1 : Math.min(3, Math.floor((t - a0) / STEP_MS))
      const e0 = to + i * stagger * 0.5
      if (t >= e0) { const k = Math.floor((t - e0) / STEP_MS); step = k < 3 ? 2 - k : -1 }
      ch.style.opacity = step === 3 ? '1' : '0'
      if (step >= 0 && step < 3) {
        const p = STEPS[step]
        for (const [cx, cy] of d.cells[step][i]) g.fillRect(cx, cy, p, p)
      }
    })
  })
  return (
    <div
      ref={root} className={`rl-type ${className}`}
      style={{ left: x, top: y, width: w, fontSize: size, textAlign: align, opacity: fade == null ? undefined : fade }}
    >
      <Set text={text} italic={italic} />
      <canvas ref={canvas} className="rl-type-px" aria-hidden="true" />
    </div>
  )
}

// ── a finger on the glass ───────────────────────────────────────────────────
// Where a person touches: it comes down a little larger than it lands, is
// pressed, and leaves a ring going out from where it was
function Touch({ t, at: t0, x, y, size = 96 }) {
  const k = t - t0
  if (k < -170 || k > 560) return null
  const come = easeOf('power2.out')(clamp((k + 170) / 170))
  const press = k >= 0 ? hit(t, t0, 110) : 0
  const leave = clamp((k - 230) / 260)
  const ring = clamp(k / 440)
  const s = lerp(1.32, 1, come) * (1 - press * 0.14)
  return (
    <span className="rl-touch" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: (come * (1 - leave)).toFixed(3), transform: `scale(${s.toFixed(3)})` }} aria-hidden="true">
      {k >= 0 ? <i className="rl-touch-ring" style={{ transform: `scale(${(1 + easeOf('expo.out')(ring) * 0.5).toFixed(3)})`, opacity: ((1 - ring) * 0.8).toFixed(3) }} /> : null}
    </span>
  )
}

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
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k } }
    const send = root.querySelector('.wl-sk.is-r')
    onMeasure(spans.map(box), { w: root.offsetWidth, h: root.offsetHeight, send: send ? box(send) : null })
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
function NoteScreen({ who, t, times, sendAt, fs, w, onMeasure, quiet = true, tint = null }) {
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
      w={w} tint={tint || who.tint} seed={who.seed} mode="bare" square quiet={quiet}
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
const GOLD = '#FDB515'

// the envelope, the phone's own glyph, drawn at any size in whole cells
const ENV = glyphPath('env')
function Envelope({ x, y, w, o = 1, colour = '#F4F1EA', glow = 'rgba(255,244,228,0.6)', rz = 0, solid = '', className = '' }) {
  const h = (w * ENV.h) / ENV.w
  return (
    <svg
      className={`rl-env ${className}`} viewBox={`0 0 ${ENV.w} ${ENV.h}`} shapeRendering="crispEdges"
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: rz ? `rotate(${rz}deg)` : undefined, filter: `drop-shadow(0 0 ${Math.max(4, w * 0.06)}px ${glow})` }}
      aria-hidden="true"
    >
      {solid ? <rect x="0" y="0" width={ENV.w} height={ENV.h} fill={solid} /> : null}
      <path d={ENV.d} fill={colour} />
    </svg>
  )
}
const HEART = glyphPath('heart')

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

// the twelve colours a letter can be lit in, in the order the colours'
// lab shows them (proto/looks.jsx), and the wave that goes round them: a
// phone shows the colours after its own as it passes, a 32nd each, and
// comes back to its own
const TINTS = ['night', 'white', 'ice', 'teal', 'green', 'acid', 'violet-yellow', 'amber', 'rose', 'lilac', 'negative', 'xerox']
const STEP = 62.5
function waveTint(tint, tw, t) {
  const k = t - tw
  if (k < 0 || k >= STEP * 4) return tint
  const i = TINTS.indexOf(tint)
  return TINTS[(i + 1 + Math.floor(k / STEP) * 3) % TINTS.length]
}

// the whip out of the wall and into the dark: the frame cut to the phone's
// cells, and the cells drawn out along the move (`#rl-mb`, in the reel)
function whipOf(t) {
  if (t < S.whip[0] || t > S.whip[1]) return { x: 0, blur: 0 }
  if (t < 4000) {
    const k = easeOf('rl.whip')(u(t, S.whip[0], 4000))
    return { x: -k * 1250, blur: k * 80 }
  }
  const k = easeOf('expo.out')(u(t, 4000, S.whip[1]))
  return { x: (1 - k) * 1250, blur: (1 - k) * 80 }
}
const whipStyle = (w) => (Math.abs(w.x) > 0.5 ? { transform: `translateX(${w.x.toFixed(1)}px)`, filter: w.blur > 12 ? 'url(#rl-mb)' : undefined } : undefined)

// lin's phone at the size the camera starts at, and a letter of the
// berkeley wall, laid out once and unseen, so every letter's place, the
// send key and the heart are known before the first frame
function Measure({ who, times, onMeasure }) {
  const [note, setNote] = useState(null)
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!note || !ref.current) return
    const root = ref.current.querySelector('.st-phone')
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const heart = root.querySelector('.is-heart .wl-lit-g') || root.querySelector('.is-heart')
    const r = heart.getBoundingClientRect()
    onMeasure({ ...note, heart: { x: (r.left - r0.left) / k + r.width / k / 2, y: (r.top - r0.top) / k + r.height / k / 2, w: r.width / k }, letter: { w: root.offsetWidth, h: root.offsetHeight } })
    setDone(true)
  }, [note]) // eslint-disable-line react-hooks/exhaustive-deps
  if (done) return null
  return (
    <div className="rl-measure" aria-hidden="true" ref={ref}>
      {note ? <LetterPhone row={BERK[0]} heart={0} /> : (
        <NoteScreen
          who={who} t={99999} times={times} sendAt={1e9} fs={12.6} w={PW}
          onMeasure={(m, box) => setNote({ m, box })}
        />
      )}
    </div>
  )
}

// ── 0.0 to 4.0: up close, and back into the wall ────────────────────────────
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
  const z = Math.exp(lerp(lerp(Math.log(zm), Math.log(zHold), fallA), Math.log(zWall) - 0.07 * u(t, 2950, 4000), fallB))
  const mid = { x: m.box.w / 2, y: m.box.h / 2 }
  const P = {
    x: lerp(mx, mid.x, fallA) + Math.sin(t / 700) * 22 * fallB,
    y: lerp(my, mid.y, fallA) + Math.cos(t / 830) * 18 * fallB,
  }
  // up close the glass is turned away from the lens and the plane of focus
  // is a band through the line; it comes square as the camera falls back
  const rx = lerp(lerp(6, 15, push), 0, fallA)
  const ry = lerp(lerp(-4, -9, push), 0, fallA)
  const rz = at([[0, -3], [1700, -2, 'sine.inOut'], [2300, 0, 'power3.inOut'], [4000, 1.8, 'sine.inOut']], t)
  // the wall goes quiet under its line, and lights again for the colours
  const hush = at([[S.lines[0] - 120, 1], [S.lines[0] + 220, 0.42, 'power2.out'], [S.wave - 20, 0.42], [S.wave + 240, 0.9, 'power2.out']], t)
  const dof = push * (1 - fallA)
  const lin = { x: C.x + (mid.x - P.x) * z, y: C.y + (mid.y - P.y) * z }
  // the wave goes out from lin's phone across the wall
  const waveAt = (x, y) => S.wave + (Math.hypot(x - lin.x, y - lin.y) / 1500) * 520
  const w = whipOf(t)
  return (
    <div className="rl-cam" style={whipStyle(w)}>
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
            const tw = waveAt(sx, sy)
            const flash = hit(t, tw, 150) * 0.55
            return (
              <Place
                key={name} x={sx} y={sy} s={s} rz={rot} z={near ? 20 : d < 0.9 ? 1 : 3}
                filter={`blur(${blur.toFixed(1)}px) brightness(${(lit * (d < 0.9 ? 0.55 : near ? 0.7 : 0.95) + flash).toFixed(3)})`}
              >
                <Phone w={PW} tint={waveTint(tint, tw, t)} seed={`wall-${name}`} mode="draft" name={name} text={text} cursor={false} />
              </Place>
            )
          }) : null}
          <Place x={C.x} y={C.y} ax={P.x} ay={P.y} s={z} rx={rx} ry={ry} z={5} filter={t >= S.wave ? `brightness(${(1 + hit(t, S.wave, 150) * 0.5).toFixed(3)})` : undefined}>
            <NoteScreen who={A} t={t} times={times} sendAt={1e9} fs={12.6} w={PW} quiet={false} tint={waveTint(A.tint, S.wave, t)} />
          </Place>
          <Glow x={lin.x} y={lin.y} r={Math.min(1400, PW * z * 1.2)} colour={halo('ice')} o={0.75} z={2} />
        </div>
        {dof > 0.05 ? <span className="rl-dof" style={{ opacity: dof.toFixed(3) }} aria-hidden="true" /> : null}
      </div>
      {/* the wall's own line, its masthead's, a line an eighth */}
      <Type t={t} text="a wall of" from={S.lines[0]} cut={4000} />
      <Type t={t} text="the ones you" from={S.lines[1]} y={lineAt(1)} cut={4000} />
      <Type t={t} text="never told." from={S.lines[2]} y={lineAt(2)} size={XL} italic stagger={30} cut={4000} />
    </div>
  )
}

// ── 4.0 to 7.5: the berkeley wall ───────────────────────────────────────────
// The campus's letters: each posted from a berkeley.edu address, so each
// phone is on the school's network (schools.js), CAL and its star in the
// school's gold in the status row. Written for this film, in the voice of
// the campaign's letters, about the places on the campus.
const CAL = schoolOf('berkeley')
const BERK = [
  ['sofia', 'rose', 'you gave me your umbrella outside wheeler and walked home in it. i still have it.', 3],
  ['priya', 'ice', 'you read on the fourth floor of doe every tuesday. i started reading there too.', 5],
  ['owen', 'amber', 'you were the one in the red scarf handing out flyers on sproul. i took three.', 2],
  ['lena', 'green', 'the campanile played at noon and you looked up the same moment i did.', 7],
  ['marco', 'lilac', 'we both ran for the 51b and missed it. i’m still glad we did.', 4],
  ['tess', 'teal', 'you lent me your notes before the midterm. i never gave them back.', 1],
  ['ruby', 'white', 'you sat in front of me in lecture all semester. i never once said hi.', 6],
  ['hana', 'violet-yellow', 'i still walk past the glade at four because that’s when you used to.', 3],
  ['jonah', 'xerox', 'you left your pen at the free speech cafe. i kept it.', 2],
]
const LETTER_TOP = new Map()
const LETTER_KEYS = new Map()
const topOf = (name) => {
  if (!LETTER_TOP.has(name)) LETTER_TOP.set(name, { name, dear: true, icon: 'pen', stamp: '10/06/26', bat: 4 })
  return LETTER_TOP.get(name)
}
// the heart, before and after a finger: outlined and its count, then lit
// and one more, the key struck while it is pressed
const keysOf = (hearts, state) => {
  const k = `${hearts}|${state}`
  if (!LETTER_KEYS.has(k)) {
    const on = state > 0
    LETTER_KEYS.set(k, { l: { label: 'options' }, r: [{ glyph: on ? 'heart' : 'heartO', label: String(hearts + (on ? 1 : 0)), cls: 'is-heart', open: state === 1 }] })
  }
  return LETTER_KEYS.get(k)
}
const LetterPhone = memo(function LetterPhone({ row, heart }) {
  const [name, tint, text, hearts] = row
  return <Phone w={PW} tint={tint} seed={`cal-${name}`} mode="letter" text={text} cursor={false} square sticker={CAL} top={topOf(name)} keys={keysOf(hearts, heart)} />
})

// the tower, kept as React drew it, so the plotter has it to itself, its
// lantern's star a little under the middle of the frame
const TW = 420
const TOWER = { x: 540 - TW / 2, y: 836 }
const STAR = { x: 540, y: TOWER.y + 16 * (TW / 100) }

// The ring: the campus's letters on an ellipse round the lantern's star, on
// the tilt of the mark's own ring, the near side passing in front of the
// tower and the far side behind it, so the frame is the mark drawn in the
// campus's letters. A letter at `a` degrees (nought nearest the lens, at the
// foot of the ring) is drawn at its place, its size by its nearness, turned
// a little toward where it faces.
const RING = { rx: 470, ry: 200, tilt: (-16 * Math.PI) / 180, near: 0.2, far: 0.12 }
function ringPose(a, grow = 1) {
  const rad = (a * Math.PI) / 180
  const ex = Math.sin(rad) * RING.rx * grow
  const ey = Math.cos(rad) * RING.ry * grow
  const near = Math.cos(rad)
  return {
    x: STAR.x + ex * Math.cos(RING.tilt) - ey * Math.sin(RING.tilt),
    y: STAR.y + ex * Math.sin(RING.tilt) + ey * Math.cos(RING.tilt),
    s: lerp(RING.far, RING.near, (near + 1) / 2) * (1 + (grow - 1) * 0.35),
    near, ry: -Math.sin(rad) * 34,
  }
}
// where the opened letter rests: its keys clear of the buttons a reel lays
// down the right of the frame and of the caption under it
const REST = { x: 520, y: 800, s: 0.8 }
const Tower = memo(function Tower() {
  return <Campanile width={TW} lit stands={false} className="rl-camp-svg" />
})
// the elevation's construction: the centre line and the levels the tower is
// set out on (art.jsx's own heights: the apex, the cornice, the deck, the
// clock and the plinth), in the frame's pixels
const LEVELS = [282, 134, 110, 60, 16].map((v) => TOWER.y + v * (TW / 100))

function BerkeleyScene({ t, letter }) {
  // the tower plotted as its elevation is drawn: the construction first, then
  // every line of it from the ground up, each from its own end, the pen's
  // gold point riding the line that is being drawn, the roof and its ridge
  // arriving at the apex on the beat; and the lantern there lit
  const pieces = useRef([])
  const root = useScene(t, (el) => {
    const tl = gsap.timeline({ paused: true })
    const svg = el.querySelector('.wl-campanile')
    const g = svg.querySelector('.wl-campanile-line')
    // a drawing of several lines in one path is drawn a line at a time
    for (const p of [...g.querySelectorAll('path')]) {
      const parts = (p.getAttribute('d') || '').split(/(?=M)/).filter(Boolean)
      if (parts.length < 2) continue
      for (const part of parts) { const q = p.cloneNode(); q.setAttribute('d', part); p.before(q) }
      p.remove()
    }
    const ns = 'http://www.w3.org/2000/svg'
    const list = [...g.querySelectorAll('path, circle')].map((node) => {
      const b = node.getBBox()
      const d = (node.getAttribute('d') || '').trim()
      const down = /^M[\d.]+ [\d.]+V[\d.]+$/.test(d)
      const flat = /^M[\d.]+ [\d.]+H[\d.]+$/.test(d)
      const bottom = b.y + b.height
      const roof = bottom <= 61 && b.height > 20
      const start = roof ? 4.62 : 4.1 + (1 - bottom / 300) * 0.62 + rnd(b.x * 3 + b.y) * 0.05
      const dur = roof ? 0.36 : clamp(0.16 + (b.height / 300) * 0.6, 0.16, 0.46)
      const from = down ? '100% 100%' : flat ? '50% 50%' : '0% 0%'
      tl.fromTo(node, { drawSVG: from }, { drawSVG: '0% 100%', duration: dur, ease: down || roof ? 'power2.inOut' : 'power1.inOut' }, start)
      const tip = document.createElementNS(ns, 'circle')
      tip.setAttribute('r', '1.5')
      tip.setAttribute('class', 'rl-tip')
      svg.appendChild(tip)
      return { node, tip, len: node.getTotalLength(), down, flat, tween: tl.getChildren(false, true, false).pop() }
    })
    pieces.current = list
    // the clock: its hands round the hours while the tower is drawn, and
    // stopped at nine, the hour of the reveal
    const hands = list.filter((p) => /^M50 134[VH]/.test((p.node.getAttribute('d') || '').trim()))
    for (const p of hands) {
      const minute = /V/.test(p.node.getAttribute('d'))
      tl.fromTo(p.node, { rotate: minute ? -1080 : 90, svgOrigin: '50 134' }, { rotate: minute ? 0 : 180, svgOrigin: '50 134', duration: 0.5, ease: 'power3.out' }, 4.45)
    }
    // the lantern's light down the tower's lines once it is lit
    const warm = el.querySelector('#rl-warm stop.is-gold')
    if (warm) tl.fromTo(warm, { attr: { 'stop-color': '#F4F1EA' } }, { attr: { 'stop-color': '#FFD580' }, duration: 0.6, ease: 'power2.out' }, S.lamp / 1000)
    // the construction lines, set out before the tower and taken away once
    // it stands
    const guides = el.querySelectorAll('.rl-guides .is-axis, .rl-guides .is-level, .rl-guides .is-mark')
    guides.forEach((node, i) => {
      const axis = node.classList.contains('is-axis')
      tl.fromTo(node, { drawSVG: axis ? '100% 100%' : '0% 0%' }, { drawSVG: '0% 100%', duration: axis ? 0.62 : 0.24, ease: axis ? 'sine.inOut' : 'rl.out' }, S.guides / 1000 + (axis ? 0.04 : 0.06 + i * 0.11))
    })
    tl.to(el.querySelector('.rl-guides'), { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, 5.15)
    // the lantern: a point of light that becomes the star, on the beat
    const lamp = svg.querySelector('.wl-campanile-lamp')
    const bloom = svg.querySelector('.wl-campanile-bloom')
    if (lamp) {
      tl.fromTo(lamp, { morphSVG: 'M50,44 C53.3,44 56,46.7 56,50 C56,53.3 53.3,56 50,56 C46.7,56 44,53.3 44,50 C44,46.7 46.7,44 50,44 Z', scale: 0.2, transformOrigin: '50% 50%', opacity: 0 }, { morphSVG: lamp.getAttribute('d'), scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, S.lamp / 1000)
      tl.fromTo(lamp, { rotate: 0 }, { rotate: 16, duration: 1.1, ease: 'rl.twinkle' }, S.lamp / 1000 + 0.2)
    }
    if (bloom) {
      tl.fromTo(bloom, { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1.7, duration: 0.24, ease: 'power2.out' }, S.lamp / 1000)
      tl.to(bloom, { scale: 1, duration: 0.9, ease: 'power2.inOut' }, S.lamp / 1000 + 0.24)
    }
    // the hearts: thrown up off the key the finger lit, a little gravity on
    // them, and gone
    el.querySelectorAll('.rl-heart').forEach((h, i) => {
      const at0 = S.tap2 / 1000 + i * 0.012
      tl.set(h, { opacity: 1 }, at0)
      tl.fromTo(h, { x: 0, y: 0, rotate: 0 }, { physics2D: { velocity: 1100 + rnd(i * 7) * 1100, angle: -90 + (rnd(i * 3 + 1) - 0.5) * 150, gravity: 2200 }, rotate: (rnd(i + 9) - 0.5) * 70, duration: 0.9, ease: 'none' }, at0)
      tl.fromTo(h, { scale: 0.5 }, { scale: i % 5 === 0 ? 2.2 : 1, duration: i % 5 === 0 ? 0.8 : 0.16, ease: i % 5 === 0 ? 'power1.in' : 'power2.out' }, at0)
      tl.to(h, { opacity: 0, duration: 0.3, ease: 'power1.in' }, at0 + 0.6)
    })
    const pop = el.querySelector('.rl-heart-pop')
    if (pop) {
      tl.set(pop, { opacity: 1 }, S.tap2 / 1000)
      tl.fromTo(pop, { scale: 1 }, { scale: 2.6, duration: 0.46, ease: 'rl.buzz' }, S.tap2 / 1000)
      tl.to(pop, { opacity: 0, duration: 0.2 }, S.tap2 / 1000 + 0.36)
    }
    return tl
  }, () => {
    // the pen's point at the end of every line that is being drawn
    for (const p of pieces.current) {
      const k = p.tween ? p.tween.progress() : 1
      if (k <= 0.001 || k >= 0.999) { p.tip.style.opacity = '0'; continue }
      const along = p.down ? p.len * (1 - k) : p.flat ? p.len * (0.5 + k * 0.5) : p.len * k
      const pt = p.node.getPointAtLength(along)
      p.tip.setAttribute('cx', pt.x.toFixed(2))
      p.tip.setAttribute('cy', pt.y.toFixed(2))
      p.tip.style.opacity = '1'
    }
  })
  const w = whipOf(t)
  // the ring: spun up as the scene comes, let run down by a hand so it comes
  // to rest with sofia's letter to the lens; the letters come in to it from
  // further out
  const spin = at([[S.ring, -300], [S.stop[1], 0, 'rl.spin']], t)
  const grow = lerp(2.2, 1, easeOf('expo.out')(u(t, S.ring, S.ring + 650)))
  const open = easeOf('rl.inOut')(u(t, S.open[0], S.open[1]))
  const sleep = at([[7280, 1], [7480, 0.2, 'power2.in']], t)
  // the camera rides up the tower with the pen: on its foot as the plot
  // starts, at the drawing's front all the way up (the plot's own schedule,
  // the ground drawn first and the apex last), and back to the whole of it
  // as the lantern is lit
  const zc = at([[4000, 2.1], [4700, 1.75, 'sine.inOut'], [5100, 1, 'rl.inOut'], [7500, 1.04, 'sine.inOut']], t)
  const kc = easeOf('rl.inOut')(u(t, 4720, 5100))
  const front = TOWER.y + (TW / 100) * 300 * (1 - easeOf('sine.inOut')(u(t, 4060, 4720)))
  const F = { x: 540, y: lerp(Math.min(front + 120, 1960), 960, kc) }
  const P = { x: 540, y: lerp(1150, 960, kc) }
  const cam = `translate(${(P.x - F.x * zc).toFixed(2)}px, ${(P.y - F.y * zc).toFixed(2)}px) scale(${zc.toFixed(4)})`
  const lampO = u(t, S.lamp - 20, S.lamp + 260) * (1 - 0.6 * open)
  const tower = 1 - 0.68 * open
  const heartState = t < S.tap2 ? 0 : t < S.tap2 + 150 ? 1 : 2
  const tapAt = ringPose(0)
  // the heart's place on the frame, once the letter is at rest
  const hx = REST.x + (letter.heart.x - letter.letter.w / 2) * REST.s
  const hy = REST.y + (letter.heart.y - letter.letter.h / 2) * REST.s
  return (
    <div className="rl-cam" style={whipStyle(w)}>
      <div ref={root} className="rl-cam" style={{ transform: cam, transformOrigin: '0 0', filter: sleep < 0.999 ? `brightness(${sleep.toFixed(3)})` : undefined }}>
        <Glow x={STAR.x} y={STAR.y} r={760} colour="rgba(253,181,21,0.55)" o={lampO * 0.85} z={3} />
        <svg className="rl-guides" width="1080" height="1920" viewBox="0 0 1080 1920" aria-hidden="true">
          <path className="is-axis" d={`M540 ${TOWER.y - 90}V1910`} />
          {LEVELS.map((y, i) => (
            <g key={y}>
              <path className="is-level" d={`M540 ${y.toFixed(1)}H${150 - i * 6}`} />
              <path className="is-level" d={`M540 ${y.toFixed(1)}H${930 + i * 6}`} />
              <path className="is-mark" d={`M${944 + i * 6} ${(y - 13).toFixed(1)}l7 11l7 -11z`} />
            </g>
          ))}
        </svg>
        <svg className="rl-defs" width="0" height="0" aria-hidden="true">
          <linearGradient id="rl-warm" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="300">
            <stop offset="0" stopColor="#FFD580" className="is-gold" />
            <stop offset="0.42" stopColor="#F4F1EA" />
            <stop offset="1" stopColor="#F4F1EA" />
          </linearGradient>
        </svg>
        <div className="rl-camp" style={{ left: TOWER.x, top: TOWER.y, opacity: tower.toFixed(3) }}>
          <Tower />
        </div>
        {BERK.map((row, i) => {
          const a = spin + i * (360 / BERK.length)
          const p = ringPose(a, grow + i * 0.03 * (1 - u(t, S.ring, S.ring + 650)))
          const come = u(t, S.ring + i * 30, S.ring + 260 + i * 30)
          const isOpen = i === 0 && open > 0
          const x = isOpen ? lerp(p.x, REST.x, open) : p.x
          const y = isOpen ? lerp(p.y, REST.y, open) : p.y
          const s = isOpen ? Math.exp(lerp(Math.log(p.s), Math.log(REST.s), open)) : p.s
          const ry = isOpen ? lerp(p.ry, 0, open) : p.ry
          const deep = (1 - p.near) / 2
          // the lantern's light goes round the ring, from the back to the front
          const tw = S.lamp + (1 - deep) * 340
          const lit = isOpen ? 1 : (0.42 + 0.58 * (1 - deep)) * (1 - 0.72 * open)
          const blur = isOpen ? 0 : deep * 6 + open * 9
          const z = isOpen ? 30 : p.near > 0 ? 8 + Math.round(p.near * 6) : 1 + Math.round((p.near + 1) * 2)
          if (come <= 0.001) return null
          return (
            <Place
              key={row[0]} x={x} y={y} s={s} ry={ry} z={z} opacity={come.toFixed(3)}
              filter={`${blur > 0.2 ? `blur(${blur.toFixed(1)}px) ` : ''}brightness(${(lit + hit(t, tw, 220) * 0.5).toFixed(3)})`}
            >
              <LetterPhone row={row} heart={i === 0 ? heartState : 0} />
              {i === 0 ? <Touch t={t} at={S.tap2} x={letter.heart.x - letter.heart.w * 0.2} y={letter.heart.y} size={130} /> : null}
            </Place>
          )
        })}
        {BERK.map((row, i) => {
          const a = spin + i * (360 / BERK.length)
          const p = ringPose(a, grow)
          const tw = S.lamp + (1 - (1 - p.near) / 2) * 340
          return <Glow key={row[0]} x={p.x} y={p.y} r={1100 * p.s} colour="rgba(253,181,21,0.5)" o={hit(t, tw, 260) * 0.7 * (1 - open) * u(t, S.ring, S.ring + 300)} z={2} />
        })}
        <Touch t={t} at={S.tap1} x={tapAt.x} y={tapAt.y - 20} size={100} />
        {/* the heart lit, and the hearts it throws */}
        <svg className="rl-heart-pop" viewBox={`0 0 ${HEART.w} ${HEART.h}`} shapeRendering="crispEdges" style={{ left: hx - 30, top: hy - 26, width: 60, height: 52 }} aria-hidden="true">
          <path d={HEART.d} fill="#F4F1EA" />
        </svg>
        {Array.from({ length: 34 }, (_, i) => {
          const c = [4, 6, 5, 8, 7][i % 5]
          const fill = ['#FF5C93', GOLD, '#FFFFFF', '#FF8DB4'][i % 4]
          return (
            <svg key={i} className="rl-heart" viewBox={`0 0 ${HEART.w} ${HEART.h}`} shapeRendering="crispEdges" style={{ left: hx - (HEART.w * c) / 2, top: hy - (HEART.h * c) / 2, width: HEART.w * c, height: HEART.h * c }} aria-hidden="true">
              <path d={HEART.d} fill={fill} />
            </svg>
          )
        })}
      </div>
      <Type t={t} text="the berkeley" from={S.title} to={5700} />
      <Type t={t} text="wall." from={S.title + 250} to={5720} size={XL} italic y={lineAt(1)} stagger={34} />
    </div>
  )
}

// ── 7.5 to 9.5: send ────────────────────────────────────────────────────────
function SendScene({ t, times, send }) {
  const k = u(t, S.send[0], S.send[1])
  // the phone too near to be whole, past the edges of the frame, coming
  // round as the camera pushes in; the words stand over the black above it
  const s = at([[S.send[0], 1.15], [S.send[1], 1.45, 'none']], t) * (1 + hit(t, S.press, 90) * 0.012)
  const ry = lerp(-26, 14, easeOf('sine.inOut')(k))
  const rx = lerp(7, 2, k)
  // high in the frame for the finger on send, the keys clear of a reel's
  // own buttons; and, from the frame the envelope covers, low, its top
  // under the band the words stand in
  const wiped = t >= S.press + 625
  const x = wiped ? 540 : at([[S.press, 470], [S.press + 620, 520, 'power2.inOut']], t)
  const y = wiped ? 1560 : 640
  // the screen going out, as the phone puts it out: its light down to
  // nothing in a fifth of a second, the light on the room a little after
  const dim = at([[S.off, 1], [S.off + 200, 0.05, 'power2.in'], [S.off + 400, 0, 'power1.out']], t)
  const glow = at([[S.off + 90, 1], [S.off + 290, 0, 'power2.in']], t)
  // the envelope, out of the glass and at the lens, a solid thing that
  // wipes the frame on the beat, and then is gone
  const e0 = S.press + 190
  const e = easeOf('expo.in')(u(t, e0, e0 + 430))
  const eon = t >= e0 && t <= e0 + 450
  return (
    <div className="rl-cam">
      <Glow x={x} y={y - 80} r={900} colour={halo('ice')} o={glow * 0.95} />
      <Place x={x} y={y} s={s} rx={rx} ry={ry} filter={dim < 0.999 ? `brightness(${dim.toFixed(3)})` : undefined}>
        <NoteScreen who={A} t={t} times={times} sendAt={S.press} fs={12.6} w={PW} quiet={false} />
        {send ? <Touch t={t} at={S.press} x={send.x + send.w / 2} y={send.y + send.h / 2} size={130} /> : null}
      </Place>
      {eon ? <Envelope x={x + Math.sin(e * 2.4) * 40} y={lerp(570, 980, e)} w={lerp(90, 2600, e)} rz={e * -8} glow="rgba(143,184,220,0.7)" solid="#0E1822" /> : null}
      <Type t={t} text="or send it" from={S.sendIt} to={9330} cut={S.send[1]} />
      <Type t={t} text="privately." from={S.privately} to={9360} size={XL} italic y={lineAt(1)} stagger={30} cut={S.send[1]} />
    </div>
  )
}

// ── 9.5 to 11.5: the other ──────────────────────────────────────────────────
function OtherScene({ t, times }) {
  const w = wake(t, S.bWake, 420)
  const k = easeOf('expo.out')(u(t, S.bWake, S.bWake + 800))
  const s = lerp(0.5, 1.25, k) + u(t, 10300, S.other[1]) * 0.15
  const ry = lerp(30, -8, k)
  const rx = lerp(-6, 4, k)
  const x = 540
  const y = lerp(1820, 1560, k)
  // after the send, the phone goes to sleep and steps back
  const sleep = at([[S.bSend + 50, 0], [S.other[1], 0.85, 'power2.inOut']], t)
  const back = at([[S.bSend + 50, 1], [S.other[1], 0.92, 'power2.inOut']], t)
  // the note, off the glass after the send and away into the dark along a
  // curve, smaller as it goes
  const root = useScene(t, (el) => {
    const env = el.querySelector('.rl-fly')
    const tl = gsap.timeline({ paused: true })
    tl.set(env, { opacity: 0 }, 0)
    tl.set(env, { opacity: 1 }, (S.bSend + 170) / 1000)
    tl.fromTo(env, { x: 0, y: 0, scale: 1, rotate: 0 }, {
      motionPath: { path: [{ x: 0, y: 0 }, { x: 150, y: -330 }, { x: 40, y: -640 }, { x: 230, y: -900 }], curviness: 1.3 },
      scale: 0.06, rotate: 14, duration: (S.other[1] - S.bSend - 170) / 1000, ease: 'power3.in',
    }, (S.bSend + 170) / 1000)
    return tl
  })
  return (
    <div className="rl-cam" ref={root}>
      <Glow x={x} y={y - 80} r={900} colour={halo('amber')} o={w * (1 - sleep) * 0.95} />
      <Place x={x} y={y} s={s * back} rx={rx} ry={ry} filter={`brightness(${(w * (1 - sleep * 0.9)).toFixed(3)})`}>
        <NoteScreen who={B} t={t} times={times} sendAt={S.bSend} fs={13.4} w={PW} quiet={false} />
      </Place>
      <Envelope className="rl-fly" x={x} y={1480} w={170} colour="#F7D9A8" glow="rgba(224,169,90,0.8)" solid="#24170A" />
      <Type t={t} text="they only read it" from={S.read} to={11280} cut={S.other[1]} stagger={20} />
      <Type t={t} text="if they send" from={S.ifThey} to={11300} y={lineAt(1)} cut={S.other[1]} />
      <Type t={t} text="you one." from={S.ifThey + 250} to={11320} y={lineAt(2)} size={XL} italic stagger={30} cut={S.other[1]} />
    </div>
  )
}

// ── 11.5 to 13.0: the week, on the flaps ────────────────────────────────────
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const CITY = [['street-spiders', 0], ['wall-david', 0], ['street-four', 140], ['shutter-lin', 0], ['street-spiders', -170], ['street-four', 0]]
const TIME = '9:00 pm'
const FLAPS = { top: 590, cw: 284, ch: 384, gap: 20 }
// the time on cards nearly the days' height, so it is read as one board;
// a card a figure, the colon and the space narrower
const TIME_ROW = { top: FLAPS.top + FLAPS.ch + 26, h: 260, w: 150, colon: 90, space: 40, gap: 12 }
const timeW = (c) => (c === ':' ? TIME_ROW.colon : c === ' ' ? TIME_ROW.space : TIME_ROW.w)
const TIME_LEFT = 540 - ([...TIME].reduce((a, c) => a + timeW(c), 0) + (TIME.length - 1) * TIME_ROW.gap) / 2
// the finger goes to the colon, between the hour and the minutes
const TAP3 = { x: TIME_LEFT + TIME_ROW.w + TIME_ROW.gap + TIME_ROW.colon / 2, y: TIME_ROW.top + TIME_ROW.h / 2 }

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
  // on the page from the first frame and unseen, so its pictures are decoded
  // before the frame they are first seen in
  const on = t >= S.wait[0] && t < S.wait[1]
  // the day it is, and the city under it
  let d = -1
  while (d + 1 < S.days.length && S.days[d + 1] <= t) d++
  d = Math.max(0, d)
  const since = t - S.days[d]
  const zoom = 1.12 - easeOf('power2.out')(clamp(since / 250)) * 0.07 - (d === 5 ? u(t, 12400, S.wait[1]) * 0.03 : 0)
  const fl = d === 5 ? 1 : 0.7 + 0.3 * (1 - hit(t, S.days[d], 50))
  const timeT = S.time
  // the board pressed under the finger
  const press = hit(t, S.tap3, 120) * 0.012
  return (
    <div className="rl-cam" style={{ visibility: on ? 'visible' : 'hidden' }}>
      {CITY.map(([name, dx], i) => (
        <img
          key={`${name}${i}`} className="rl-city" src={dither(name)} alt=""
          style={{ opacity: i === d ? 1 : 0, transform: `translateX(${dx}px) scale(${(zoom + (dx ? 0.15 : 0)).toFixed(4)})`, filter: `blur(2px) brightness(${(0.36 * fl).toFixed(3)})` }}
        />
      ))}
      <div className="rl-board-shade" />
      <div className="rl-cam" style={{ transform: press ? `scale(${(1 - press).toFixed(4)})` : undefined, transformOrigin: `${TAP3.x}px ${TAP3.y}px` }}>
        <p className="rl-label" style={{ top: FLAPS.top - 58 }}>the reveal</p>
        <div className="rl-flaps" style={{ top: FLAPS.top, gap: FLAPS.gap }}>
          {[0, 1, 2].map((c) => (
            <Flap key={c} seq={DAYS.map((x) => x[c])} times={S.days.map((x) => x + c * 28)} t={t} w={FLAPS.cw} h={FLAPS.ch} size={360} />
          ))}
        </div>
        <div className="rl-flaps" style={{ top: TIME_ROW.top, gap: TIME_ROW.gap }}>
          {[...TIME].map((c, i) => (c !== ' ' && t >= timeT + i * 24 ? (
            <Flap key={i} seq={[c]} times={[timeT + i * 24]} t={t} w={timeW(c)} h={TIME_ROW.h} size={230} />
          ) : <span key={i} style={{ width: timeW(c) }} />))}
        </div>
        <p className="rl-label" style={{ top: TIME_ROW.top + TIME_ROW.h + 36, opacity: u(t, timeT + 200, timeT + 400) }}>pacific.</p>
      </div>
      {on ? <Touch t={t} at={S.tap3} x={TAP3.x} y={TAP3.y} size={110} /> : null}
    </div>
  )
}

// ── 12.8 to 16.5: the glass ─────────────────────────────────────────────────
// The mutual's own film on the phone's own glass, at the size of the room
// to start, opened out of the point the finger touched: the glass fills the
// frame and the two of them run in from past its edges. On the drop they
// are held, the glass turns rose, and the phone steps back to say it.
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
  const back = easeOf('expo.inOut')(u(t, S.drop + 450, S.drop + 1450))
  let s = 1
  let x = 540
  let y = 960
  if (g) {
    const s0 = (1920 / g.h) * 0.96
    const s1 = 880 / g.w
    s = Math.exp(lerp(Math.log(s0), Math.log(s1), back)) * (1 + u(t, S.run[0], S.drop) * 0.05 * (1 - back))
    y = lerp(960, 830, back)
    x = 540
  }
  const cx = g ? x - (g.x + g.w / 2) * s : 0
  const cy = g ? y - (g.y + g.h / 2) * s : 0
  // opened out of the touch: a circle from under the finger to the frame
  const iris = easeOf('expo.in')(u(t, S.tap3 + 30, S.run[0]))
  const clip = t < S.run[0] ? `circle(${(iris * 2300).toFixed(1)}px at ${TAP3.x}px ${TAP3.y}px)` : undefined
  return (
    <div className="rl-cam" style={{ clipPath: clip, zIndex: 6, visibility: t < S.tap3 + 30 ? 'hidden' : undefined }}>
      <Glow x={540} y={y} r={1100} colour={turn > 0.5 ? halo('rose') : halo('night')} o={(0.5 + 0.5 * turn) * back} />
      <div ref={ref} className="rl-glass" style={{ transform: `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${s.toFixed(4)})` }}>
        <GlassPhone film={film} st={st} turn={turn} />
      </div>
    </div>
  )
}
const GlassPhone = ({ film, st, turn }) => (
  <Phone w={PW} mode="bare" square seed="intro" tint="rose" className="is-story" screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}>
    <PixelStory story={film} at={st} />
  </Phone>
)

// ── 16.5 to 22: the question, and the name ──────────────────────────────────
// The question set in the middle of the frame, a line a beat. Then its
// letters go to the phone's pixels where they stand (the same cells the
// lockup is drawn in, seven pixels each), lift off the lines from the
// outside in and become two lights, one of each half, circling each other
// on the tilt of the mark's own ring, quicker each turn and closer, in the
// screens' colours. They meet on the last bar; the flash goes out as a ring,
// and every pixel comes back in to its cell of the name: the left light the
// mark, the right one the word. Then the address, typed.
const ASK_LH = [Math.round(M * LH), Math.round(M * LH), Math.round(XL * LH)]
const ASK_TOP = 900 - Math.round(ASK_LH.reduce((x, y) => x + y, 0) / 2)
const ASK = [
  { text: 'do they still', at: S.q[0], y: ASK_TOP, size: M },
  { text: 'think about', at: S.q[1], y: ASK_TOP + ASK_LH[0], size: M },
  { text: 'you?', at: S.q[2], y: ASK_TOP + ASK_LH[0] + ASK_LH[1], size: XL, italic: true },
]
const CELL = 7
const LOCK = { x: 540 - Math.round((LOCKUP.w * CELL) / 2), y: 900 - Math.round((LOCKUP.h * CELL) / 2) }
// the two lights: the left of the question in lin's ice, the right in
// kai's amber, each a little different pixel to pixel, as a screen's own
// cells are
const LIGHTS = [
  ['#BFE3FF', '#9FCBF2', '#E2F2FF', '#8FC0EC'],
  ['#FFD59A', '#F7BE73', '#FFE7C2', '#F0AE5C'],
]
const LIGHT = ['#CFEAFF', '#FFDDA8']
// the head of each light: the mark's four pointed star in the phone's cells,
// and the same with its points drawn in, for the twinkle
const SPARK7 = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...']
const SPARK5 = ['.......', '...#...', '..###..', '.#####.', '..###..', '...#...', '.......']

// the question's letters as cells, off a canvas the size of the frame, each
// cell lit where its letter covers more than two fifths of it
let ASKED = null
function askCells() {
  if (ASKED) return ASKED
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  for (const l of ASK) {
    g.font = `${l.italic ? 'italic 440' : '500'} ${l.size}px Newsreader`
    g.letterSpacing = `${(-0.04 * l.size).toFixed(1)}px`
    const mt = g.measureText(l.text)
    const asc = mt.fontBoundingBoxAscent
    const desc = mt.fontBoundingBoxDescent
    g.fillText(l.text, 540, l.y + (l.size * LH - (asc + desc)) / 2 + asc)
  }
  const img = g.getImageData(0, 0, W, H).data
  const cells = []
  for (let y = ASK_TOP - 70; y < ASK_TOP + 520; y += CELL) {
    for (let x = 0; x < W; x += CELL) {
      let a = 0
      for (let yy = 0; yy < CELL; yy++) for (let xx = 0; xx < CELL; xx++) a += img[((y + yy) * W + x + xx) * 4 + 3]
      if (a / (CELL * CELL * 255) > 0.4) cells.push([x, y])
    }
  }
  // the name's cells, on the frame
  const word = wordCells()
  const targets = [...cellsOf(MARK), ...word.cells.map(([x, y]) => [x + LOCKUP.word.x, y])]
    .map(([x, y]) => [LOCK.x + x * CELL, LOCK.y + y * CELL])
    .sort((p, q) => p[0] - q[0] || p[1] - q[1])
  // every pixel to a cell: across the question in order, across the name
  // in order, so the left of it makes the mark and the right the word
  const order = cells.map((p, i) => i).sort((i, j) => cells[i][0] - cells[j][0] || cells[i][1] - cells[j][1])
  const n = cells.length
  const parts = new Array(n)
  const side = (x) => (x < 540 ? 0 : 1)
  const xs = cells.map(([x]) => x)
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  order.forEach((i, r) => {
    const [sx, sy] = cells[i]
    const s = side(sx)
    const [tx, ty] = targets[Math.min(targets.length - 1, Math.floor((r / n) * targets.length))]
    // lifted off from the outside in, a third of a second across each half
    const lift = S.burst + 120 + (s ? (hi - sx) / Math.max(1, hi - 540) : (sx - lo) / Math.max(1, 540 - lo)) * 340 + rnd(i) * 40
    parts[i] = { sx, sy, tx, ty, s, lift, col: LIGHTS[s][(i * 7) % LIGHTS[s].length], seed: rnd(i * 13 + 5) }
  })
  // each light's tail: its pixels in the order they lifted, the first
  // nearest the head, the last a little under half a second behind it on
  // the orbit and faint
  for (const sd of [0, 1]) {
    const mine = parts.filter((q) => q.s === sd).sort((q, w) => q.lift - w.lift)
    mine.forEach((q, k) => {
      const r = k / Math.max(1, mine.length - 1)
      q.lag = 16 + r * 440
      q.fade = lerp(1, 0.16, r ** 0.8)
      q.wide = (q.seed - 0.5) * (6 + r * 34)
    })
  }
  ASKED = { parts }
  return ASKED
}

// where a pixel is at `t`, and in what light: lifting off its letter, then
// one of a light's tail, a step behind the head on the orbit and a little
// off its line, the tail widening as it goes back
function pixAt(p, t) {
  if (t < p.lift) return { x: p.sx, y: p.sy, c: '#F4F1EA', a: 1 }
  if (t < S.meet) {
    const tt = t - p.lag
    const o = orbitOf(p.s, tt)
    const o2 = orbitOf(p.s, tt - 12)
    const dx = o.x - o2.x
    const dy = o.y - o2.y
    const len = Math.hypot(dx, dy) || 1
    const x = o.x - (dy / len) * p.wide
    const y = o.y + (dx / len) * p.wide
    const l = easeOf('power3.inOut')(u(t, p.lift, p.lift + 440))
    return { x: lerp(p.sx, x, l), y: lerp(p.sy, y, l), c: l > 0.35 ? p.col : '#F4F1EA', a: lerp(1, p.fade, l) }
  }
  // the meeting: from the middle, out past its cell along its own line, and
  // back in to it, the cells nearest the middle first
  const dx = p.tx - ORBIT.cx
  const dy = p.ty - ORBIT.cy
  const dist = Math.hypot(dx, dy)
  const s0 = S.meet + 40 + (dist / 520) * 110
  const k = easeOf('expo.out')(u(t, s0, s0 + 460))
  const ang = Math.atan2(dy, dx) + (p.s ? 0.55 : -0.55)
  const far = dist * 1.45 + 90
  const m = { x: ORBIT.cx + (p.seed - 0.5) * 30, y: ORBIT.cy + (rnd(p.seed * 99) - 0.5) * 30 }
  const p1x = ORBIT.cx + Math.cos(ang) * far
  const p1y = ORBIT.cy + Math.sin(ang) * far
  const x = (1 - k) ** 2 * m.x + 2 * (1 - k) * k * p1x + k * k * p.tx
  const y = (1 - k) ** 2 * m.y + 2 * (1 - k) * k * p1y + k * k * p.ty
  return { x, y, c: k > 0.92 ? '#F4F1EA' : p.col, a: t < s0 ? 0 : 1 }
}

// a drawing of cells, centred at x, y
function cellsAt(g, rows, x, y, cell) {
  const w = rows[0].length
  const h = rows.length
  const x0 = Math.round(x - (w * cell) / 2)
  const y0 = Math.round(y - (h * cell) / 2)
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') g.fillRect(x0 + i * cell, y0 + j * cell, cell, cell) })
}
// the orbit, or the ring the meeting sends out: the mark's ellipse in
// dotted cells
function ringAt(g, r, cell, a) {
  if (r < 2 || a <= 0.003) return
  const n = Math.max(24, Math.round(r / 6))
  g.globalAlpha = a
  for (let j = 0; j < n; j++) {
    const th = (j / n) * Math.PI * 2
    const ex = Math.cos(th) * r
    const ey = Math.sin(th) * r * ORBIT.ratio
    const x = ORBIT.cx + ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt)
    const y = ORBIT.cy + ex * Math.sin(ORBIT.tilt) + ey * Math.cos(ORBIT.tilt)
    g.fillRect(Math.round(x - cell / 2), Math.round(y - cell / 2), cell, cell)
  }
}

function AskScene({ t }) {
  const canvas = useRef(null)
  const data = useMemo(askCells, [])
  const flying = t >= S.burst && t < S.lock[1]
  useLayoutEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, 1080, 1920)
    if (!flying) return
    const show = u(t, S.burst, S.burst + 70)
    // the orbit the two lights are on, in dotted cells, closing with them;
    // then the same ring sent out by their meeting
    g.fillStyle = '#F4F1EA'
    const ok = orbitOf(0, t)
    ringAt(g, ORBIT.a0 * (1 - ok.k ** 3), 5, u(t, ORBIT.from, ORBIT.from + 300) * (1 - u(t, S.meet - 200, S.meet)) * 0.24)
    if (t >= S.meet) {
      const w = u(t, S.meet, S.meet + 650)
      ringAt(g, easeOf('expo.out')(w) * 1150, CELL, (1 - w) * 0.75)
    }
    // pixels in flight are light, added where they cross; once home they
    // are the name's chalk, laid down
    g.globalCompositeOperation = t > S.burst + 160 && t < S.lock[1] - 60 ? 'lighter' : 'source-over'
    for (const p of data.parts) {
      const q = pixAt(p, t)
      if (q.a <= 0.003) continue
      g.globalAlpha = q.a * show
      g.fillStyle = q.c
      g.fillRect(Math.round(q.x), Math.round(q.y), CELL, CELL)
    }
    // the heads: a star of cells in each light's colour, a white cell at its
    // heart, twinkling a frame in five
    if (t >= ORBIT.from && t < S.meet) {
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = u(t, ORBIT.from, ORBIT.from + 160)
      for (const sd of [0, 1]) {
        const o = orbitOf(sd, t)
        const small = Math.floor(t / 83 + sd * 2) % 5 === 0
        g.fillStyle = LIGHT[sd]
        cellsAt(g, small ? SPARK5 : SPARK7, o.x, o.y, CELL)
        g.fillStyle = '#FFFFFF'
        cellsAt(g, ['#'], o.x, o.y, CELL)
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  })
  // the address, typed after the name is whole, the phone's cursor after it
  const root = useScene(t, (el) => {
    const tl = gsap.timeline({ paused: true })
    tl.set(el.querySelector('.rl-addr-t'), { text: '' }, 0)
    tl.to(el.querySelector('.rl-addr-t'), { text: 'celestual.us', duration: 0.46, ease: 'none' }, S.url / 1000)
    return tl
  })
  const textOut = 1 - u(t, S.burst, S.burst + 70)
  const whole = t >= S.lock[1]
  const lastTyped = S.url + 460
  return (
    <div className="rl-cam" ref={root}>
      {ASK.map((l) => (
        <Type key={l.text} t={t} text={l.text} from={l.at} size={l.size} italic={!!l.italic} x={0} w={1080} y={l.y} align="center" stagger={30} cut={S.burst + 80} fade={textOut < 1 ? textOut.toFixed(3) : null} />
      ))}
      <Glow x={ORBIT.cx} y={ORBIT.cy} r={900} colour="rgba(255,244,228,0.5)" o={hit(t, S.meet, 300) * 0.7} z={1} />
      <canvas ref={canvas} className="rl-pix" width="1080" height="1920" style={{ visibility: flying ? 'visible' : 'hidden' }} />
      {whole ? <Lockup cell={CELL} className="rl-lock" style={{ left: LOCK.x, top: LOCK.y }} /> : null}
      <p className="rl-addr" style={{ top: LOCK.y + LOCKUP.h * CELL + 88 }}>
        <span className="rl-addr-t" />
        <span className="rl-addr-cur" style={{ opacity: t >= S.url && blink(t, lastTyped) ? 1 : 0 }} />
      </p>
    </div>
  )
}

// the shade down from the top of the frame while a line stands over a
// scene, so the scene's own letters behind it go quiet
function Shade({ t }) {
  const o = Math.max(
    u(t, S.lines[0] - 100, S.lines[0] + 200) * (1 - u(t, S.whip[0], S.whip[0] + 120)),
    t < S.send[1] ? u(t, S.sendIt - 80, S.sendIt + 160) * (t >= S.send[0] ? 1 : 0) : 0,
    t >= S.other[0] && t < S.other[1] ? u(t, S.read - 80, S.read + 160) : 0,
  )
  return o > 0.002 ? <div className="rl-shade" style={{ opacity: o.toFixed(3) }} /> : null
}

// ── the reel ────────────────────────────────────────────────────────────────
const FACES = ['500 132px Newsreader', '500 210px Newsreader', 'italic 440 210px Newsreader', '400 40px "Geist Mono"']
export function Reel({ t }) {
  const [ok, setOk] = useState(false)
  const [mA, setMA] = useState(null)
  useEffect(() => {
    Promise.all([readyFilm(A.name, B.name), ...FACES.map((f) => document.fonts.load(f))]).then(() => setOk(true))
  }, [])
  useHold(ok && !!mA)
  const film = ok ? filmOf(A.name, B.name, 'rose') : null
  const tA = useMemo(typedA, [])
  const tB = useMemo(typedB, [])
  // the frame shaken: on the lantern, the envelope at the lens, the drop and
  // the meeting
  const sh = hit(t, S.drop, 150) * 5 + hit(t, S.press + 620, 120) * 7 + hit(t, S.lamp, 120) * 3 + hit(t, S.meet, 160) * 6
  const shake = sh > 0.3 ? `translate(${(Math.sin(t * 0.37) * sh).toFixed(1)}px, ${(Math.cos(t * 0.29) * sh).toFixed(1)}px)` : undefined
  const mb = whipOf(t).blur
  const send = mA ? mA.box.send : null
  return (
    <Board w={1080} h={1920} grain={0} className="rl-board">
      {/* measured only once the faces are on the page, or the letters would
          be measured in a fallback face */}
      {ok ? <Measure who={A} times={tA} onMeasure={setMA} /> : null}
      <svg className="rl-defs" width="0" height="0" aria-hidden="true">
        <filter id="rl-mb" x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood x="5" y="5" width="2" height="2" floodColor="#fff" />
          <feComposite width="12" height="12" />
          <feTile result="grid" />
          <feComposite in="SourceGraphic" in2="grid" operator="in" />
          <feMorphology operator="dilate" radius="6" />
          <feGaussianBlur stdDeviation={`${(mb * 0.7).toFixed(1)} 0`} />
        </filter>
      </svg>
      <div className="rl-stage" style={{ transform: shake }}>
        {/* each scene owns exactly its own frames: a cut is a cut */}
        {t < 4000 && mA ? <MacroWall t={t} m={mA} times={tA} /> : null}
        {t >= 4000 && t < S.send[0] && mA ? <BerkeleyScene t={t} letter={mA} /> : null}
        {t >= S.send[0] && t < S.other[0] ? <SendScene t={t} times={tA} send={send} /> : null}
        {t >= S.other[0] && t < S.wait[0] ? <OtherScene t={t} times={tB} /> : null}
        <WaitScene t={t} />
        {film && t >= S.tap3 - 120 && t < S.ask[0] ? <GlassScene t={t} film={film} /> : null}
        {ok && t >= S.ask[0] ? <AskScene t={t} /> : null}
        {/* in the stage, so a shake carries it with the words it is under */}
        <Shade t={t} />
      </div>
      <Flash t={t} />
      <Grain opacity={0.075} seed={Math.floor(t / 83) % 12} />
      <span className="st-vignette" style={{ opacity: 0.62 }} aria-hidden="true" />
    </Board>
  )
}

// the flashes: on send, on the drop, on the meeting
function Flash({ t }) {
  const white = t >= S.meet && t < S.meet + 34
  const a = white ? 1 : hit(t, S.press - 10, 70) * 0.18 + hit(t, S.drop, 35) * 0.25 + hit(t, S.meet + 34, 90) * 0.5
  if (a < 0.004) return null
  return <span className="rl-flash" style={{ opacity: a.toFixed(3), background: t >= S.drop - 20 ? '#FFFFFF' : '#EAF4FF' }} />
}

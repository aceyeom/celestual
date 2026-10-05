// ── the carousel ────────────────────────────────────────────────────────────
//
// How it works, as five slides of one strip. The strip is drawn once, five
// boards wide, and each slide is a window onto it (`Slide`), so whatever
// crosses a seam is the same thing on both sides of it. The intro's ground,
// dashed, three cells lit and one dark, runs along it at one height as the
// floor of the room, and goes through every story's glass as that story's
// own ground. It starts at your phone and ends at the rose, where on the
// glass it goes in and is drawn up into the ring. Along it the mechanic
// happens in the order it does: a draft, a note let go, the backlight asleep
// with the note sealed and waiting, a second phone lit, and the mark.
//
// Each thing on the strip says how far it reaches (`x0`, `x1`), and a slide
// draws only what reaches into it.

import { useEffect, useMemo, useState } from 'react'
import { Board, Phone, PixelStory, Light, Lockup, skinOf, mix, useHold, storyOf } from '../kit.jsx'
import { joinStory } from '../../wall/pixmark.js'
import './carousel.css'

export const SW = 1080
export const SH = 1350
// the grid: the board's width over twelve
export const U = SW / 12
const CHALK = '#F4F1EA'

// ── a story, told again with a change to its cells ──
// The same clock and the same frames (and the glass each is for, which
// the intro sets the two of them along by), each passed through `f`, and
// keyed apart from the story as the product tells it
function retold(story, tag, f) {
  return { ...story, frame: (...at) => { const fr = story.frame(...at); return { ...fr, key: `${fr.key}|${tag}`, cells: f(fr.cells) } } }
}

// ── the floor, edge to edge ──
// A story's ground is its 95 columns (pixmark.js `groundAt`), and a glass
// this wide has a few more either side of them, so where the room's ground
// meets the glass it would skip a cell or two. These carry it on, three
// lit and one dark, to the glass's edges (a cell past them is not drawn)
const FLOOR = 67
const COLS = 95
const lit = (x) => ((x % 4) + 4) % 4 !== 3
function floorFrom(a, b) {
  const out = []
  for (let x = a; x < b; x++) if (lit(x)) out.push([x, FLOOR, 2])
  return out
}
const SIDES = [...floorFrom(-6, 0), ...floorFrom(COLS, COLS + 6)]
const onFloor = (cells) => cells.some((c) => c[1] === FLOOR && c[0] === 0 && c[2] === 2)

// ── the door's story, on the night's glass ──
// The mechanic in the order it happens (screens/Join.jsx), held at a moment
// of its clock: he lets his note go at 900, it seals over the middle at
// 1740 and dims, she lets hers go at 2300, and they wake together at 3600
const NIGHT = skinOf('night')
let DOOR = null
export function door() {
  if (!DOOR) {
    const s = joinStory({ you: 900, them: 2300, both: 3600, panel: [NIGHT.hi, NIGHT.mid, NIGHT.lo], ink: [NIGHT.ink, NIGHT.ink] })
    DOOR = retold(s, 'edge', (cells) => (onFloor(cells) ? [...SIDES, ...cells] : cells))
  }
  return DOOR
}
// and with his sealed note drawn in a stronger ink than the dimmed one, so
// on a screen let down to its last light it is still the thing the eye finds
let WAITING = null
function waiting() {
  if (!WAITING) WAITING = retold(door(), 'kept', (cells) => cells.map((c) => (c.length === 5 && c[2] === 2 ? [c[0], c[1], 4, c[3], c[4]] : c)))
  return WAITING
}

// A phone with a moment of the door on its glass. `asleep` is how much of
// the backlight is left, the screen let down towards the black it goes to,
// and the light it throws on the room put out
export function DoorPhone({ w, x, y, t, seed = 'door', asleep = 0, story = null, top = null, keys = null, className = '' }) {
  return (
    <Phone
      w={w} x={x} y={y} tint="night" seed={seed} mode="bare" square top={top} keys={keys}
      className={`is-story cr-door${asleep ? ' is-asleep' : ' cr-soft'} ${className}`}
      style={asleep ? { '--cr-dim': asleep } : undefined}
    >
      <PixelStory story={story || door()} at={t} />
    </Phone>
  )
}

// ── the rose, with the ground going into it ──
// The intro's last frame, the mark on the rose, and the floor it was drawn
// up out of come in at the left edge of the glass on its own row and run to
// the needle, which stands where the next dark cell would be
let ROSE_IN = null
function roseIn() {
  if (ROSE_IN) return ROSE_IN
  const s = storyOf('intro', 'rose')
  ROSE_IN = retold(s, 'in', (cells) => {
    const on = cells.filter((c) => c[1] === FLOOR).map((c) => c[0])
    return [...floorFrom(-6, on.length ? Math.min(...on) : 0), ...cells]
  })
  return ROSE_IN
}
function RosePhone({ w, x, y, seed }) {
  const s = roseIn()
  return (
    <Phone
      w={w} x={x} y={y} tint="rose" seed={seed} mode="bare" square className="is-story cr-soft"
      keys={{ l: { label: 'options' }, r: { label: 'share' } }}
    >
      <PixelStory story={s} at={s.end} />
    </Phone>
  )
}

// ── the ground ──
// The intro's floor (pixmark.js `groundAt`): a cell every `cell` pixels,
// three lit and one dark, each a pixel short of the cell as the glass draws
// them, the first lit cell on `phase`. It is lit by the screens standing on
// it and by nothing else: each light is `{ x, reach, tint, k }`, and where
// no screen is lit the dashes are all but gone into the black.
export function Ground({ x0, x1, y, cell = 6, phase = 0, lights = [], base = 0.07 }) {
  const id = useMemo(() => `cr-gd-${Math.random().toString(36).slice(2, 8)}`, [])
  const gap = cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : 1
  const dot = cell - gap
  const w = x1 - x0
  // the light along it, sampled every 24 pixels: how much falls there, and
  // whose colour, the chalk warmed or cooled toward each screen's own
  const stops = useMemo(() => {
    const out = []
    for (let x = x0; x <= x1 + 23; x += 24) {
      let a = base
      let col = CHALK
      let best = 0
      for (const l of lights) {
        const d = Math.abs(x - l.x) / l.reach
        const f = l.k * Math.max(0, 1 - d * d) ** 2
        a += f
        if (f > best) { best = f; col = mix(skinOf(l.tint).glow, CHALK, l.tint === 'night' ? 0.4 : 0.55) }
      }
      out.push({ o: Math.min(1, (x - x0) / w), a: Math.min(0.78, a), col })
    }
    return out
  }, [x0, x1, w, base, lights])
  return (
    <svg className="cr-ground" width={w} height={cell} style={{ left: x0, top: y }} aria-hidden="true">
      <defs>
        <pattern id={`${id}-p`} width={cell * 4} height={cell} patternUnits="userSpaceOnUse" x={(((phase - x0) % (cell * 4)) + cell * 4) % (cell * 4)}>
          {[0, 1, 2].map((i) => <rect key={i} x={i * cell} y="0" width={dot} height={dot} fill="#fff" />)}
        </pattern>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={cell}>
          <rect width={w} height={cell} fill={`url(#${id}-p)`} shapeRendering="crispEdges" />
        </mask>
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
          {stops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.col} stopOpacity={s.a} />)}
        </linearGradient>
      </defs>
      <rect width={w} height={cell} fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />
    </svg>
  )
}

// ── the type ──
// The slide's number and the strip's name in the identifier face, on one
// baseline; the line in the display face; and under the floor what it
// means, quieter, its baseline a grid unit off the foot of the slide
export function Head({ n, x, label = 'how it works' }) {
  return (
    <>
      <p className="cr-num" style={{ left: x + U, top: U }}><b>{String(n).padStart(2, '0')}</b><span>/05</span></p>
      <p className="cr-label" style={{ left: x + SW - U, top: U + 2 }}>{label}</p>
    </>
  )
}
export function Line({ x, y = 146, size = 150, children, style }) {
  // Newsreader's side bearing, seven pixels at 150 and in step with the
  // size, taken back so the serifs hang just past the margin
  return <h2 className="cr-line" style={{ left: x + U - Math.round((size * 7) / 150), top: y, fontSize: size, ...style }}>{children}</h2>
}
// the sub's box top for a baseline at SH - U
const SUB_TOP = 1231
export function Sub({ x, y = SUB_TOP, children, style }) {
  return <p className="cr-sub" style={{ left: x + U, top: y, ...style }}>{children}</p>
}

// ── the faces, before anything is laid out ──
// A screen fits its words to its glass once, when it is first laid out,
// and again only if a face was still on its way then (screen.jsx `useFit`).
// So nothing with words on it is put down until the phone's face and the
// poster's are in, and the camera is held until then.
const FACES = ['400 40px "Jersey 10"', '500 120px Newsreader', '400 34px Newsreader', '400 20px "Geist Mono"']
export function useFaces() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let on = true
    const f = document.fonts
    Promise.all(FACES.map((x) => f.load(x).catch(() => null))).then(() => f.ready).then(() => { if (on) setOk(true) })
    return () => { on = false }
  }, [])
  useHold(ok)
  return ok
}

// ── a slide ──
// The board, and the strip under it moved along so that slide `i` is in
// the window. `items` is the strip: each `{ x0, x1, el }` in the strip's
// own pixels, and only those that reach this window are drawn.
export function Slide({ i, items, grain = 0.075 }) {
  const ok = useFaces()
  const lo = i * SW
  const hi = lo + SW
  return (
    <Board w={SW} h={SH} grain={grain}>
      <div className="cr-strip" style={{ transform: `translateX(${-lo}px)` }}>
        {ok ? items.filter((it) => it.x1 > lo && it.x0 < hi).map((it, k) => <Frag key={k}>{it.el}</Frag>) : null}
      </div>
    </Board>
  )
}
const Frag = ({ children }) => children

// ── the strip ───────────────────────────────────────────────────────────────
// Five boards wide. The ground's cells are the door's glass's own: six
// pixels, a glass's first cell twelve in from the phone's left, and the
// first lit cell of each four on `PHASE`, so a door phone stands with its
// middle twelve past a multiple of 24 (540, the middle of a slide), and
// with its feet on the ground's row (`GY`, the top of the cells), which is
// `foot` under the middle of that phone (its seed sets its panel's
// proportion, and these three are cut alike). The two composers stand with
// the foot of their glass on the same row, the keys hanging under the floor.
export const GY = 1002
const CELL = 6
const PHASE = 12
const DOORW = 600
const standAt = (foot) => GY - foot
// a composer 540 wide, held nearly square to the camera
const DRAFTW = 540
const HELD = [1.1, 0.9, 0]

// the two letters, yours and theirs, whole, the cursor after the last word
// (the second sentence of yours kept on one line with its first word)
const A = { name: 'theo', text: 'i walk the long way home now. it\u00a0passes your building.' }
const B = { name: 'ren', text: 'the library seat by the window is free on tuesdays. i check.' }

// where each thing stands, in the strip's pixels
const AX = U + DRAFTW / 2
const SEND = SW + 540
const WAIT = 2 * SW + 924
const BX = 4 * SW - U - DRAFTW / 2
const ROSE = 4 * SW + 540

const LIGHTS = [
  { x: AX + 60, reach: 780, tint: 'night', k: 0.55 },
  { x: SEND, reach: 700, tint: 'night', k: 0.4 },
  { x: WAIT, reach: 560, tint: 'night', k: 0.1 },
  { x: BX, reach: 680, tint: 'ice', k: 0.5 },
  { x: ROSE, reach: 760, tint: 'rose', k: 0.6 },
]

export function strip() {
  const at = (i) => i * SW
  const whole = (i, el) => ({ x0: at(i), x1: at(i) + SW, el })
  return [
    // the ground, from your phone to the rose
    { x0: AX, x1: ROSE, el: <Ground x0={AX} x1={ROSE} y={GY} cell={CELL} phase={PHASE} lights={LIGHTS} base={0.09} /> },

    // 01 write it: your phone, the letter whole, the cursor after the last
    // word, its light thrown out into the dark of the room to its right
    { x0: -400, x1: 1300, el: <Light x={520} y={740} size={1200} tint="night" strength={0.6} /> },
    { x0: AX - 300, x1: AX + 300, el: <Phone w={DRAFTW} x={AX} y={standAt(228)} tint="night" seed="cr-theo-906" tilt={HELD} name={A.name} text={A.text} className="cr-soft" /> },
    whole(0, <Head n={1} x={at(0)} />),
    whole(0, <Line x={at(0)} size={228}>write it.</Line>),
    whole(0, <Sub x={at(0)}>the cursor is still blinking.</Sub>),

    // 02 send it privately: the door, his note let go, the key that does it
    { x0: SEND - 800, x1: SEND + 800, el: <Light x={SEND} y={800} size={1600} tint="night" strength={0.35} /> },
    { x0: SEND - 300, x1: SEND + 300, el: <DoorPhone w={DOORW} x={SEND} y={standAt(177.31)} t={1350} seed="cr-send-214" keys={{ r: { label: 'send' } }} /> },
    whole(1, <Head n={2} x={at(1)} />),
    whole(1, <Line x={at(1)}>send it<br />privately.</Line>),
    whole(1, <Sub x={at(1)}>to one person, and nobody else.</Sub>),

    // 03 they never know: the backlight asleep, his note sealed over the
    // middle, the phone across the seam into 04 with her on the far side
    // of it. Asleep, its status row draws nothing but the aerial, and the
    // room keeps a trace of the light it had, so it is a dark room and not
    // an empty board
    { x0: WAIT - 700, x1: WAIT + 700, el: <Light x={WAIT} y={800} size={1400} tint="night" strength={0.18} /> },
    { x0: WAIT - 300, x1: WAIT + 300, el: <DoorPhone w={DOORW} x={WAIT} y={standAt(176.23)} t={2100} seed="cr-wait-127" asleep={0.26} story={waiting()} top={{ bat: null }} /> },
    whole(2, <Head n={3} x={at(2)} />),
    whole(2, <Line x={at(2)} style={{ color: 'var(--ash)' }}>they never<br />know.</Line>),
    whole(2, <Sub x={at(2)}>it waits, sealed. it says nothing.</Sub>),

    // 04 unless they send you one: a second phone lit, theirs
    { x0: BX - 800, x1: BX + 800, el: <Light x={BX} y={790} size={1400} tint="ice" strength={0.5} /> },
    { x0: BX - 300, x1: BX + 300, el: <Phone w={DRAFTW} x={BX} y={standAt(229)} tint="ice" seed="cr-ren-257" tilt={HELD} name={B.name} text={B.text} className="cr-soft" /> },
    whole(3, <Head n={4} x={at(3)} />),
    whole(3, <Line x={at(3)}>unless they<br />send you one.</Line>),
    whole(3, <Sub x={at(3)}>if it’s ever mutual, you’ll both know.</Sub>),

    // 05 it's mutual: the rose, the mark, signed. The phone stands where
    // the door's did on 02, and the ground goes into its glass on the row
    // the ring was drawn up out of, and runs to the needle
    { x0: ROSE - 800, x1: ROSE + 800, el: <Light x={ROSE} y={800} size={1500} tint="rose" strength={0.8} /> },
    { x0: ROSE - 300, x1: ROSE + 300, el: <RosePhone w={DOORW} x={ROSE} y={standAt(178.46)} seed="cr-rose-292" /> },
    whole(4, <Head n={5} x={at(4)} label="celestual.us" />),
    whole(4, <Line x={at(4)} size={188}>it’s <i>mutual.</i></Line>),
    whole(4, <Sub x={at(4)}>you’ve both sent each other a message.</Sub>),
    whole(4, <div className="cr-sign" style={{ left: at(4) + SW - U - 224, top: 1218 }}><Lockup cell={2} /></div>),
  ]
}

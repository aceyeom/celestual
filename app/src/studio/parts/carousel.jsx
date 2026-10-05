// ── the carousel ────────────────────────────────────────────────────────────
//
// How it works, as five slides of one strip. The strip is drawn once, five
// boards wide, and each slide is a window onto it (`Slide`), so whatever
// crosses a seam is the same thing on both sides of it. The intro's ground,
// dashed, three cells lit and one dark, runs along it at one height as the
// floor of the room, and goes through every story's glass as that story's
// own ground. It starts at your phone and ends at the rose, where on the
// glass it has become the ring. Along it the mechanic happens in the order
// it does: a draft, a note let go, the backlight asleep with the note sealed
// and waiting, a second phone lit, and the mark.
//
// Each thing on the strip says how far it reaches (`x0`, `x1`), and a slide
// draws only what reaches into it.

import { useEffect, useMemo, useState } from 'react'
import { Board, Phone, StoryPhone, PixelStory, Light, Lockup, skinOf, mix, useHold } from '../kit.jsx'
import { joinStory } from '../../wall/pixmark.js'
import './carousel.css'

export const SW = 1080
export const SH = 1350
// the grid: the board's width over twelve
export const U = SW / 12
const CHALK = '#F4F1EA'

// ── the door's story, on the night's glass ──
// The mechanic in the order it happens (screens/Join.jsx), held at a moment
// of its clock: he lets his note go at 900, it seals over the middle at
// 1740 and dims, she lets hers go at 2300, and they wake together at 3600
const NIGHT = skinOf('night')
let DOOR = null
export function door() {
  if (!DOOR) DOOR = joinStory({ you: 900, them: 2300, both: 3600, panel: [NIGHT.hi, NIGHT.mid, NIGHT.lo], ink: [NIGHT.ink, NIGHT.ink] })
  return DOOR
}

// A phone with a moment of the door on its glass. `asleep` is how much of
// the backlight is left, the screen let down towards the black it goes to,
// and the light it throws on the room put out
export function DoorPhone({ w, x, y, t, seed = 'door', asleep = 0, className = '' }) {
  return (
    <Phone
      w={w} x={x} y={y} tint="night" seed={seed} mode="bare" square
      className={`is-story cr-door${asleep ? ' is-asleep' : ''} ${className}`}
      style={asleep ? { '--cr-dim': asleep } : undefined}
    >
      <PixelStory story={door()} at={t} />
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
  }, [x0, x1, base, lights])
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
// The slide's number and the strip's name in the identifier face, the line
// in the display face, and under the floor what it means, quieter
export function Head({ n, x, label = 'how it works' }) {
  return (
    <>
      <p className="cr-num" style={{ left: x + U, top: U }}><b>{String(n).padStart(2, '0')}</b><span>/05</span></p>
      <p className="cr-label" style={{ left: x + SW - U, top: U }}>{label}</p>
    </>
  )
}
export function Line({ x, y = 146, size = 154, children, style }) {
  // Newsreader's side bearing at this size, taken back so the stems sit
  // on the margin
  return <h2 className="cr-line" style={{ left: x + U - 7, top: y, fontSize: size, ...style }}>{children}</h2>
}
export function Sub({ x, y = 1224, children, style }) {
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
// pixels, a glass's first cell twelve in from the phone's left, so a door
// phone stands with its middle on a multiple of 24, and with its feet on
// the ground's row (`GY`, the top of the cells), which is `foot` under the
// middle of that phone (its seed sets its panel's proportion).
export const GY = 1002
const CELL = 6
const DOORW = 600
const doorAt = (foot) => GY - foot

// the two letters: yours, the first sentence of it, and theirs, finished
const A = { name: 'theo', text: 'i walk the long way home now.' }
const B = { name: 'ren', text: 'the library seat by the window is free on tuesdays. i check.' }

// where each thing stands, in the strip's pixels
const AX = U + 320
const SEND = SW + 552
const WAIT = 2 * SW + 960
const BX = 3 * SW + SW - U - 240
const ROSE = 4 * SW + 552

const LIGHTS = [
  { x: AX, reach: 760, tint: 'night', k: 0.5 },
  { x: SEND, reach: 700, tint: 'night', k: 0.46 },
  { x: BX, reach: 680, tint: 'ice', k: 0.5 },
  { x: ROSE, reach: 760, tint: 'rose', k: 0.6 },
]

export function strip() {
  const at = (i) => i * SW
  const whole = (i, el) => ({ x0: at(i), x1: at(i) + SW, el })
  return [
    // the ground, from your phone to the rose
    { x0: AX, x1: ROSE, el: <Ground x0={AX} x1={ROSE} y={GY} cell={CELL} phase={0} lights={LIGHTS} base={0.09} /> },

    // 01 write it: your phone, mid letter, the cursor after the last word
    { x0: -400, x1: AX + 900, el: <Light x={AX} y={720} size={1400} tint="night" strength={0.5} /> },
    { x0: AX - 330, x1: AX + 330, el: <Phone w={640} x={AX} y={724} tint="night" seed="cr-theo" name={A.name} text={A.text} /> },
    whole(0, <Head n={1} x={at(0)} />),
    whole(0, <Line x={at(0)}>write it.</Line>),
    whole(0, <Sub x={at(0)}>the cursor is still blinking.</Sub>),

    // 02 send it privately: the door, his note let go
    { x0: SEND - 700, x1: SEND + 700, el: <Light x={SEND} y={790} size={1300} tint="night" strength={0.46} /> },
    { x0: SEND - 300, x1: SEND + 300, el: <DoorPhone w={DOORW} x={SEND} y={doorAt(178)} t={1350} seed="cr-send" /> },
    whole(1, <Head n={2} x={at(1)} />),
    whole(1, <Line x={at(1)}>send it<br />privately.</Line>),
    whole(1, <Sub x={at(1)}>to one person, and nobody else.</Sub>),

    // 03 they never know: the backlight asleep, his note sealed over the
    // middle and dimmed, the phone across the seam into 04
    { x0: WAIT - 300, x1: WAIT + 300, el: <DoorPhone w={DOORW} x={WAIT} y={doorAt(179)} t={2100} seed="cr-wait" asleep={0.24} /> },
    whole(2, <Head n={3} x={at(2)} />),
    whole(2, <Line x={at(2)} style={{ color: 'var(--ash)' }}>they never<br />know.</Line>),
    whole(2, <Sub x={at(2)}>if it isn’t mutual, nobody is told anything. ever.</Sub>),

    // 04 unless they send you one: a second phone lit, theirs
    { x0: BX - 700, x1: BX + 700, el: <Light x={BX} y={790} size={1300} tint="ice" strength={0.5} /> },
    { x0: BX - 250, x1: BX + 250, el: <Phone w={480} x={BX} y={784} tint="ice" seed="cr-ren" name={B.name} text={B.text} /> },
    whole(3, <Head n={4} x={at(3)} />),
    whole(3, <Line x={at(3)}>unless they<br />send you one.</Line>),
    whole(3, <Sub x={at(3)}>if it’s ever mutual, you’ll both know.</Sub>),

    // 05 it's mutual: the rose, the mark, signed. The phone stands where
    // the door's did on 02, so the ground stops at the glass on the row the
    // ring was drawn up out of
    { x0: ROSE - 760, x1: ROSE + 760, el: <Light x={ROSE} y={790} size={1500} tint="rose" strength={0.85} /> },
    { x0: ROSE - 300, x1: ROSE + 300, el: <StoryPhone w={DOORW} x={ROSE} y={doorAt(176.6)} tint="rose" story="intro" seed="cr-rose" /> },
    whole(4, <Head n={5} x={at(4)} label="celestual.us" />),
    whole(4, <Line x={at(4)}>it’s <i>mutual.</i></Line>),
    whole(4, <Sub x={at(4)}>you’ve both sent each other a message.</Sub>),
    whole(4, <div className="cr-sign" style={{ left: at(4) + SW - U - 224, top: 1228 }}><Lockup cell={2} /></div>),
  ]
}

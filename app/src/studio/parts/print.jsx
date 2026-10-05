// ── the street, printed ─────────────────────────────────────────────────────
//
// What the print set shares (posters/print-*.jsx): the street sheet, the
// campaign's own A4 carried forward, drawn at any width so the same sheet is
// the file that goes to the printer and the sheet pasted on the wall in the
// mockup. A sheet is the black the printer laid, a thin edge of the paper it
// could not reach, the composer's screen big in the middle, and the address
// small at the foot.
//
// Nothing here is drawn that would print as mud: no grain on the black, no
// plaster on the file (the plasters are real), and no light on the black
// but a lit screen's, kept low. A print is paper: it is lit, it does not
// light, so the riso, the square and the copy throw none at all.

import { useEffect, useMemo, useState } from 'react'
import { Phone, useHold, skinOf } from '../kit.jsx'
import { quirks } from '../../wall/looks.js'
import './print.css'

// A4 at 300 dpi: 827 by 1169 CSS pixels at three device pixels to each
export const A4 = { w: 827, h: 1169, scale: 3 }

// The four new letters, one to each kind of screen: a lit LCD, the riso's
// two drums, the square, and a photocopy. The name is who wrote it, on the
// draft's status row. Every sheet sets its words at one size (`FS`, in the
// screen's own cqw), and each letter is broken where the writer would
// breathe so that its longest line fills about nine tenths of the glass,
// the way the street's did. A copy's measure is the white the copier left
// it, inside the burn. `seed` is the phone: the copy is a hot one, and the
// drums slipped as far as they do. `vars` go on the screen: june's has no
// dust on its glass and no column the driver left on, either of which
// prints as dirt on paper; ren's words are struck out of the yellow and
// laid in the violet alone, so the drums' slip shows on them (`Drums`).
export const FS = 13.6
export const STREET = [
  { name: 'june', tint: 'ice', seed: 'street-june-0', vars: { '--q-dust': 'none', '--q-streak-a': '0' }, text: 'your song came on\nat the laundromat\nand i let my\nclothes go round\nagain.' },
  { name: 'ren', tint: 'violet-yellow', seed: 'street-ren-95', fs: 12.8, vars: { '--s-ink': '#606060', '--s-cur': '#606060', '--s-soft': 'transparent' }, text: 'the library seat\nby the window\nis free on tuesdays.\ni check.' },
  { name: 'sam', tint: 'acid', seed: 'street-sam-0', text: 'you still have\nmy hoodie. keep it.\ni just wanted you\nto know i know.' },
  { name: 'eli', tint: 'xerox', seed: 'street-eli-228', fs: 12.8, vars: { '--q-dust': 'none' }, text: 'i kept the receipt\nfrom our first\ndinner. $41.80.\nbest money\ni ever spent.' },
]

// The sheet's proportions, in fractions of its width so one drawing is the
// print and the thumbnail, on a grid of thirty units across. The paper's
// edge is what the printer could not reach (about four millimetres). The
// screen is twenty five units wide, two and a half in from either edge of
// the paper and four down, so it hangs a little above the middle as a
// picture is hung, and the deeper foot carries the address, two and a half
// units up from the paper's edge.
const R = 1169 / 827
const U = 1 / 30
const EDGE = 14 / 827
const SCREEN = 25 * U
const TOP = 4 * U
const FOOT = 2.5 * U
const AR = 1.2

export function StreetSheet({ w = A4.w, letter, paper = '#FFFFFF', ink = '#000000', className = '', style }) {
  const h = Math.round(w * R)
  const k = w / A4.w
  const sw = Math.round(w * SCREEN)
  const sh = Math.round(sw * AR)
  const { name, tint, text, seed, fs = FS, vars } = letter
  const kind = skinOf(tint).kind
  const at = { left: (w - sw) / 2, top: Math.round(w * TOP) }
  const pid = useMemo(() => `pr-x-${Math.random().toString(36).slice(2, 8)}`, [])
  const press = kind === 'riso' ? <Drums id={pid} k={k} seed={seed} /> : kind === 'xerox' ? <Toner id={pid} /> : null
  useFilm(kind === 'brat')
  return (
    <div className={`pr-sheet ${className}`} style={{ width: w, height: h, background: paper, '--k': k, ...style }}>
      <div className="pr-black" style={{ inset: Math.round(w * EDGE), background: ink }} />
      <div className="pr-glass" data-kind={kind} style={{ ...at, width: sw, height: sh, filter: press ? `url(#${pid})` : undefined }}>
        <Phone
          w={sw} tint={tint} seed={seed} name={name} text={text} square
          screenStyle={{ '--q-ar': String(AR), '--pr-fs': `${fs}cqw`, ...vars }}
        />
      </div>
      {press}
      <Ink kind={tint} w={sw} h={sh} seed={seed} style={at} />
      <span className="pr-url" style={{ bottom: Math.round(w * FOOT) }}>celestual.us</span>
    </div>
  )
}

// The square's grain is struck while the page is idle (looks.js
// `filmGrain`), so the camera waits until it is on the square
function useFilm(on) {
  const [done, setDone] = useState(!on)
  useEffect(() => {
    if (!on) return undefined
    let raf = 0
    const look = () => {
      if (document.querySelector('style[data-film]')) setDone(true)
      else raf = requestAnimationFrame(look)
    }
    look()
    return () => cancelAnimationFrame(raf)
  }, [on])
  useHold(done)
}

// ── the drums ───────────────────────────────────────────────────────────────
// A riso is two drums, and the screen's own press lays them in one pass. On
// the sheet they are laid again, one at a time. The press's four inks are
// taken apart into what each drum laid: the violet's share is read off the
// red, and the yellow's off all three, both solved from the four inks
// looks.js prints with (the cream paper, the yellow, the violet and their
// overprint), so the paper reads as neither, the overprint as both. Each
// drum's ink then goes down unevenly, a little thin in a slow mottle and
// missing in a scatter of specks where the paper shows, and the violet is
// laid two pixels off the yellow on one axis, the way this phone's drum
// slipped (looks.js `slipX`). The words are in the violet alone, struck out
// of the yellow, so the slip shows on every letter: a hair of the paper on
// one side and of the overprint on the other. The inks are laid on the
// paper as inks are, each one multiplying what is under it, and nothing is
// drawn outside the screen.
const YELLOW = '0 0 0 0 1  0 0 0 0 0.808  0 0 0 0 0  -2.621 2.834 -1.725 0 1.384'
const VIOLET = '0 0 0 0 0.369  0 0 0 0 0.254  0 0 0 0 0.737  -1.624 0 0 0 1.573'
export function Drums({ id, k = 1, seed = 'riso' }) {
  const q = quirks(seed)
  const n = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7)
  const dx = (q.slipX < 0 ? -2 : 2) * k
  // how thin a drum's ink goes in its mottle, and how often it misses
  const lay = (m, speck, s) => (
    <>
      <feTurbulence type="fractalNoise" baseFrequency={(0.1 / k).toFixed(4)} numOctaves="2" seed={s} result={`m${s}`} />
      <feColorMatrix in={`m${s}`} type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${-m} 0 0 0 ${1 + m * 0.5}`} result={`mt${s}`} />
      <feTurbulence type="fractalNoise" baseFrequency={(1.3 / k).toFixed(4)} numOctaves="1" seed={s + 1} result={`s${s}`} />
      <feColorMatrix in={`s${s}`} type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -16 0 0 0 ${1 + 16 * speck}`} result={`sp${s}`} />
      <feComposite in={`mt${s}`} in2={`sp${s}`} operator="arithmetic" k1="1" result={`d${s}`} />
    </>
  )
  return (
    <svg className="pr-press" width="0" height="0" aria-hidden="true">
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values={YELLOW} result="y0" />
        <feComposite in="y0" in2="SourceAlpha" operator="in" result="y1" />
        <feColorMatrix in="SourceGraphic" type="matrix" values={VIOLET} result="v0" />
        <feComposite in="v0" in2="SourceAlpha" operator="in" result="v1" />
        {lay(0.3, 0.72, n)}
        {lay(0.26, 0.74, n + 40)}
        <feComposite in="y1" in2={`d${n}`} operator="in" result="y" />
        <feComposite in="v1" in2={`d${n + 40}`} operator="in" result="v" />
        <feOffset in="v" dx={dx.toFixed(2)} dy="0" result="vs" />
        <feFlood floodColor="#F4F0E4" result="paper" />
        <feBlend in="y" in2="paper" mode="multiply" result="py" />
        <feBlend in="vs" in2="py" mode="multiply" result="pv" />
        <feComposite in="pv" in2="SourceAlpha" operator="in" />
      </filter>
    </svg>
  )
}

// ── the toner ───────────────────────────────────────────────────────────────
// A copy's black is the toner's, and the sheet's black is the same toner:
// the press leaves its bands a hair off black, which on the sheet showed as
// a lighter panel behind the status and the keys. Taken down to the
// sheet's black, and the paper with it by as little.
export function Toner({ id }) {
  return (
    <svg className="pr-press" width="0" height="0" aria-hidden="true">
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.055" intercept="-0.054" />
          <feFuncG type="linear" slope="1.055" intercept="-0.054" />
          <feFuncB type="linear" slope="1.055" intercept="-0.054" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

// ── the ink ─────────────────────────────────────────────────────────────────
// What a copier leaves on paper that the screen's own press does not, laid
// over the glass and nowhere else, so the black round it stays one clean
// black: a few specks of toner where the page was white. The riso's ink is
// the drums' (above), and a lit screen is a photograph and takes none.
const INKS = {
  xerox: { tone: '#000000', freq: 1.1, cut: 5.2, gain: 7.4 },
}
export function Ink({ kind, w, h, seed = 'ink', style }) {
  const id = useMemo(() => `pr-i-${Math.random().toString(36).slice(2, 8)}`, [])
  const n = useMemo(() => [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7), [seed])
  const ink = INKS[kind]
  if (!ink) return null
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.tone.slice(i, i + 2), 16) / 255)
  return (
    <svg className="pr-ink" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={style}>
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={ink.freq} numOctaves="2" seed={n} />
        <feColorMatrix type="matrix" values={`0 0 0 0 ${r.toFixed(3)}  0 0 0 0 ${g.toFixed(3)}  0 0 0 0 ${b.toFixed(3)}  ${ink.gain} 0 0 0 ${-ink.cut}`} />
      </filter>
      <rect width={w} height={h} filter={`url(#${id})`} />
    </svg>
  )
}

// ── the tabs ────────────────────────────────────────────────────────────────
// A row of tabs to tear off along a poster's foot, as a lost cat is looked
// for: the phone's twelve keys in their order, each with its letters, and
// the address set down every one, so a tab torn off is a key of the pad
// with somewhere to go on it. The cut lines are drawn, dashed, between the
// tabs and along the top, where the tearing starts, and run on into the
// `bleed` past the trim, so the cut lands on a line wherever it falls.
const KEYS = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', ''], ['0', ''], ['#', '']]
export function Tabs({ w, top, h, bleed = 0, line = 'rgba(244, 241, 234, 0.5)', className = '' }) {
  const tw = w / KEYS.length
  const b = bleed
  return (
    <div className={`pr-tabs ${className}`} style={{ top, width: w, height: h, '--tw': `${tw}px` }}>
      <svg className="pr-cuts" width={w + 2 * b} height={h + b} viewBox={`${-b} 0 ${w + 2 * b} ${h + b}`} style={{ left: -b }} aria-hidden="true">
        <line x1={-b} y1="0.5" x2={w + b} y2="0.5" stroke={line} strokeWidth="1" strokeDasharray="6 5" />
        {KEYS.slice(1).map((_, i) => (
          <line key={i} x1={(i + 1) * tw} y1="0" x2={(i + 1) * tw} y2={h + b} stroke={line} strokeWidth="1" strokeDasharray="6 5" />
        ))}
      </svg>
      {KEYS.map(([k, abc]) => (
        <div className="pr-tab" key={k}>
          <span className="pr-key">{k === '*' ? <Star /> : <b>{k}</b>}{abc ? <i>{abc}</i> : null}</span>
          <span className="pr-tab-url">celestual.us</span>
        </div>
      ))}
    </div>
  )
}

// The face draws its star small and high, where a keypad's is the size of
// its figures. So the key's star is drawn on whole pixels, five by five,
// the star a phone's own LCD drew (a character LCD's asterisk), as tall as
// the figures beside it and standing on their baseline
const STAR = ['..#..', '#.#.#', '.###.', '#.#.#', '..#..']
function Star({ cell = 4 }) {
  const s = STAR.length * cell
  return (
    <svg className="pr-star" width={s} height={s} viewBox={`0 0 ${STAR.length} ${STAR.length}`} shapeRendering="crispEdges" aria-label="star">
      {STAR.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)))}
    </svg>
  )
}

// ── a wall at night ─────────────────────────────────────────────────────────
// What the sheets are pasted on in the mockup, `w` by `h`, drawn and never
// photographed: smooth render, its relief the trowel's broad strokes with a
// little sand in them and only a few pits, lit by a lamp at a low angle off
// to one side (`lamp`, where it stands in the wall's own pixels, `at`, how
// far out from the wall, and `to`, where it points), so the strokes catch
// the light where it falls and are lost where it does not. Over it what the
// weather left, stains and the rain's streaks.
export function Wall({ w, h, lamp = [180, -120], at = 260, to = null, tone = '#B9B2A6', seed = 11 }) {
  const id = useMemo(() => `pr-w-${Math.random().toString(36).slice(2, 8)}`, [])
  const [px, py] = to || [w * 0.55, h * 0.62]
  return (
    <svg className="pr-wall" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <filter id={`${id}-c`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0042" numOctaves="4" seed={seed} result="trowel" />
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed={seed + 4} result="grit" />
          <feTurbulence type="turbulence" baseFrequency="0.3" numOctaves="1" seed={seed + 9} result="pit0" />
          <feColorMatrix in="pit0" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -20 0 0 0 0.56" result="pits" />
          <feComposite in="trowel" in2="grit" operator="arithmetic" k2="1" k3="0.04" result="r0" />
          <feComposite in="r0" in2="pits" operator="arithmetic" k2="1" k3="-0.15" result="relief" />
          <feDiffuseLighting in="relief" surfaceScale="5" diffuseConstant="1" lightingColor={tone} result="lit">
            <feSpotLight x={lamp[0]} y={lamp[1]} z={at} pointsAtX={px} pointsAtY={py} pointsAtZ="0" specularExponent="4" limitingConeAngle="70" />
          </feDiffuseLighting>
          <feComposite in="lit" in2="SourceGraphic" operator="in" />
        </filter>
        {/* what the weather left: broad stains, and the rain's streaks
            running down from the ledge above */}
        <filter id={`${id}-s`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="3" seed={seed + 21} result="st" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.0016" numOctaves="2" seed={seed + 30} result="rn" />
          <feComposite in="st" in2="rn" operator="arithmetic" k2="0.55" k3="0.45" result="mix" />
          <feColorMatrix in="mix" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.4 0 0 0 1.75" />
        </filter>
      </defs>
      <rect width={w} height={h} fill="#000" />
      <rect width={w} height={h} fill="#fff" filter={`url(#${id}-c)`} />
      <rect width={w} height={h} fill="#000" filter={`url(#${id}-s)`} opacity="0.7" />
    </svg>
  )
}

// A street sheet as pasted: turned a little, the paper cockled where the
// paste let go in a fine relief lit from the lamp's side, and its shadow
// tight to the wall.
export function Pasted({ x, y, w, rot = 0, letter, seed = 5, children }) {
  const id = useMemo(() => `pr-p-${Math.random().toString(36).slice(2, 8)}`, [])
  const h = Math.round(w * R)
  return (
    <div className="pr-pasted" style={{ left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)` }}>
      <StreetSheet w={w} letter={letter} />
      <svg className="pr-pasted-paper" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="2" seed={seed} result="n" />
          <feDiffuseLighting in="n" surfaceScale="3" diffuseConstant="1" lightingColor="#FFFFFF">
            <feDistantLight azimuth="235" elevation="44" />
          </feDiffuseLighting>
        </filter>
        <rect width={w} height={h} filter={`url(#${id})`} />
      </svg>
      {children}
    </div>
  )
}

// What is left of a sheet somebody tore down: the strip that was under the
// plaster, the paper's white edge along its top where the printer did not
// reach and the black under it, torn ragged below, with the paper's white
// fibres showing along the tear where the print came away from it. `w`
// across, its top at `x`, `y`, turned `rot`.
export function Scrap({ x, y, w = 140, rot = 0, seed = 3 }) {
  const id = useMemo(() => `pr-s-${Math.random().toString(36).slice(2, 8)}`, [])
  const h = Math.round(w * 0.42)
  const e = Math.max(3, Math.round(w * EDGE * 2.4))
  // the tear, from the right end of the strip back to the left, deepest
  // under where the plaster held
  const tear = [[1, 0.2], [0.93, 0.34], [0.86, 0.3], [0.78, 0.5], [0.69, 0.46], [0.6, 0.72], [0.52, 1], [0.44, 0.86], [0.37, 0.92], [0.3, 0.64], [0.22, 0.58], [0.13, 0.4], [0.05, 0.36], [0, 0.18]]
  const d = `M0 0 L${w} 0 ${tear.map(([a, b]) => `L${(a * w).toFixed(1)} ${(b * h).toFixed(1)}`).join(' ')} Z`
  return (
    <svg className="pr-scrap" width={w + 20} height={h + 20} viewBox={`-10 -10 ${w + 20} ${h + 20}`} style={{ left: x - w / 2 - 10, top: y - 10, transform: `rotate(${rot}deg)` }} aria-hidden="true">
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <clipPath id={`${id}-c`}><rect x="-10" y={e} width={w + 20} height={h + 20} /></clipPath>
      </defs>
      <g filter={`url(#${id})`}>
        <path d={d} fill="#E9E5DD" />
        <path d={d} fill="#060606" clipPath={`url(#${id}-c)`} transform={`translate(${w * 0.012} ${-h * 0.05}) scale(0.976 0.96)`} />
      </g>
    </svg>
  )
}

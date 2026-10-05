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
// plaster on the file (the plasters are real), and the screen's light kept
// to the screen's own halo.

import { useMemo } from 'react'
import { Phone } from '../kit.jsx'
import './print.css'

// A4 at 300 dpi: 827 by 1169 CSS pixels at three device pixels to each
export const A4 = { w: 827, h: 1169, scale: 3 }

// The four new letters, one to each kind of screen: a lit LCD, the riso's
// two drums, the square, and a photocopy. The name is who wrote it, on the
// draft's status row. The lines are broken where the writer would breathe,
// and `fs` is the words' size in the screen's own cqw, set by eye for each
// so the words fill the glass the way the street's did. `seed` is the
// phone: the copy is a hot one, and the drums slipped as far as they do.
export const STREET = [
  { id: '01', name: 'june', tint: 'ice', seed: 'street-june-0', fs: 13.6, text: 'your song came on\nat the laundromat\nand i let my\nclothes go round\nagain.' },
  { id: '02', name: 'ren', tint: 'violet-yellow', seed: 'street-ren-95', fs: 15, text: 'the library\nseat by the\nwindow is free\non tuesdays.\ni check.' },
  { id: '03', name: 'sam', tint: 'acid', seed: 'street-sam-0', fs: 14.8, text: 'you still have\nmy hoodie.\nkeep it. i just\nwanted you to\nknow i know.' },
  { id: '04', name: 'eli', tint: 'xerox', seed: 'street-eli-228', fs: 13.2, vars: { '--q-dust': 'none' }, text: 'i kept the receipt\nfrom our first\ndinner. $41.80.\nbest money i\never spent.' },
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
  const { name, tint, text, seed, fs, vars } = letter
  return (
    <div className={`pr-sheet ${className}`} style={{ width: w, height: h, background: paper, '--k': k, ...style }}>
      <div className="pr-black" style={{ inset: Math.round(w * EDGE), background: ink }} />
      <Phone
        w={sw} tint={tint} seed={seed} name={name} text={text} square
        screenStyle={{ '--q-ar': String(AR), '--pr-fs': `${fs}cqw`, ...vars }}
        style={{ position: 'absolute', left: (w - sw) / 2, top: Math.round(w * TOP) }}
      />
      <Ink kind={tint} w={sw} h={Math.round(sw * AR)} seed={seed} style={{ left: (w - sw) / 2, top: Math.round(w * TOP) }} />
      <span className="pr-url" style={{ bottom: Math.round(w * FOOT) }}>celestual.us</span>
    </div>
  )
}

// ── the ink ─────────────────────────────────────────────────────────────────
// What a press leaves on paper that the screen's own press does not, laid
// over the glass and nowhere else, so the black round it stays one clean
// black: the riso's drum lays its ink unevenly, in a mottle and a scatter of
// the paper showing through, and a copier drops a few specks of toner where
// the page was white. A lit screen is a photograph and takes none.
const INKS = {
  'violet-yellow': { tone: '#F4F0E4', freq: 1.5, cut: 3.6, gain: 5.6, mottle: 0.05, blend: 'normal' },
  xerox: { tone: '#0D0D0C', freq: 1.1, cut: 5.2, gain: 7.4, mottle: 0, blend: 'multiply' },
}
export function Ink({ kind, w, h, seed = 'ink', style }) {
  const id = useMemo(() => `pr-i-${Math.random().toString(36).slice(2, 8)}`, [])
  const n = useMemo(() => [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7), [seed])
  const ink = INKS[kind]
  if (!ink) return null
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.tone.slice(i, i + 2), 16) / 255)
  return (
    <svg className="pr-ink" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ mixBlendMode: ink.blend, ...style }} aria-hidden="true">
      <filter id={`${id}-s`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={ink.freq} numOctaves="2" seed={n} />
        <feColorMatrix type="matrix" values={`0 0 0 0 ${r.toFixed(3)}  0 0 0 0 ${g.toFixed(3)}  0 0 0 0 ${b.toFixed(3)}  ${ink.gain} 0 0 0 ${-ink.cut}`} />
      </filter>
      <rect width={w} height={h} filter={`url(#${id}-s)`} />
      {ink.mottle ? (
        <>
          <filter id={`${id}-m`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="3" seed={n + 3} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${r.toFixed(3)}  0 0 0 0 ${g.toFixed(3)}  0 0 0 0 ${b.toFixed(3)}  ${ink.mottle * 6} 0 0 0 ${-ink.mottle * 2.6}`} />
          </filter>
          <rect width={w} height={h} filter={`url(#${id}-m)`} />
        </>
      ) : null}
    </svg>
  )
}

// ── the tabs ────────────────────────────────────────────────────────────────
// A row of tabs to tear off along a poster's foot, as a lost cat is looked
// for: the phone's twelve keys in their order, each with its letters, and
// the address set down every one, so a tab torn off is a key of the pad
// with somewhere to go on it. The cut lines are drawn, dashed, between the
// tabs and along the top, where the tearing starts.
const KEYS = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', ''], ['0', ''], ['#', '']]
export function Tabs({ w, top, h, line = 'rgba(244, 241, 234, 0.5)', className = '' }) {
  const tw = w / KEYS.length
  return (
    <div className={`pr-tabs ${className}`} style={{ top, width: w, height: h, '--tw': `${tw}px` }}>
      <svg className="pr-cuts" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <line x1="0" y1="0.5" x2={w} y2="0.5" stroke={line} strokeWidth="1" strokeDasharray="6 5" />
        {KEYS.slice(1).map((_, i) => (
          <line key={i} x1={(i + 1) * tw} y1="0" x2={(i + 1) * tw} y2={h} stroke={line} strokeWidth="1" strokeDasharray="6 5" />
        ))}
      </svg>
      {KEYS.map(([k, abc]) => (
        <div className="pr-tab" key={k}>
          <span className="pr-key"><b>{k}</b>{abc ? <i>{abc}</i> : null}</span>
          <span className="pr-tab-url">celestual.us</span>
        </div>
      ))}
    </div>
  )
}

// ── a wall at night ─────────────────────────────────────────────────────────
// What the sheets are pasted on in the mockup, `w` by `h`, drawn and never
// photographed: rendered concrete, its relief out of feTurbulence (broad
// trowel strokes, a little grit, a scatter of pits) and lit by a lamp at a
// low angle off to one side (`lamp`, where it stands in the wall's own
// pixels, `at`, how far out from the wall, and `to`, where it points), so
// the ridges catch the light where it falls and are lost where it does not.
// Over it what the weather left, stains and the rain's streaks.
export function Wall({ w, h, lamp = [180, -120], at = 260, to = null, tone = '#B9B2A6', seed = 11 }) {
  const id = useMemo(() => `pr-w-${Math.random().toString(36).slice(2, 8)}`, [])
  const [px, py] = to || [w * 0.55, h * 0.62]
  return (
    <svg className="pr-wall" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <filter id={`${id}-c`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0042" numOctaves="4" seed={seed} result="trowel" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed={seed + 4} result="grit" />
          <feTurbulence type="turbulence" baseFrequency="0.3" numOctaves="1" seed={seed + 9} result="pit0" />
          <feColorMatrix in="pit0" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -24 0 0 0 0.5" result="pits" />
          <feComposite in="trowel" in2="grit" operator="arithmetic" k2="0.95" k3="0.12" result="r0" />
          <feComposite in="r0" in2="pits" operator="arithmetic" k2="1" k3="-0.5" result="relief" />
          <feDiffuseLighting in="relief" surfaceScale="4.5" diffuseConstant="1" lightingColor={tone} result="lit">
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

// A street sheet as pasted: turned a little, the paper bowing over the
// wall's grain where the paste let go, its shadow tight to the wall.
export function Pasted({ x, y, w, rot = 0, letter, seed = 5, children }) {
  const id = useMemo(() => `pr-p-${Math.random().toString(36).slice(2, 8)}`, [])
  const h = Math.round(w * R)
  return (
    <div className="pr-pasted" style={{ left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)` }}>
      <StreetSheet w={w} letter={letter} />
      <svg className="pr-pasted-paper" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed={seed} result="n" />
          <feDiffuseLighting in="n" surfaceScale="9" diffuseConstant="1.1" lightingColor="#FFFFFF">
            <feDistantLight azimuth="235" elevation="38" />
          </feDiffuseLighting>
        </filter>
        <rect width={w} height={h} filter={`url(#${id})`} />
      </svg>
      {children}
    </div>
  )
}

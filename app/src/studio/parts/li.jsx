// ── the founder's register ──────────────────────────────────────────────────
//
// What the LinkedIn and X pictures share (posters/li-*.jsx, x-header.jsx):
// the page they are set on, the running head across the top and the
// signature across the foot, so the three posts read as pages of one book
// while each lays its own plate between them. And the few drawn things
// they need that the kit does not draw: the mark on its grid, large enough
// to count the cells.
//
// The grid is the board's width over 15, 80 pixels on a post: the margins
// are one unit and a half, the running head stands one unit in from the
// top, and the signature's foot one unit in from the bottom.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Board, Lockup, Grain, useHold, lockupSize, skinOf, MARK } from '../kit.jsx'
import { alpha } from '../../wall/looks.js'
import './li.css'

export const W = 1200
export const H = 1500
export const U = 80
export const M = 120
export const SIGN_CELL = 2
export const SIGN = lockupSize(SIGN_CELL)

// ── the faces, before anything is laid out ──
// A screen fits its words to its glass once, when it is first laid out, so
// nothing with words on it is put down until the faces are in, and the
// camera is held until then
const FACES = ['400 40px "Jersey 10"', '500 120px Newsreader', 'italic 500 120px Newsreader', '400 34px Newsreader', '400 20px "Geist Mono"', '500 20px "Inter Tight"']
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

// ── the page ──
// The room's black, or the chalk paper (`paper`), which is used rarely and
// on purpose: ink type, no bloom, and the paper's own tooth over it rather
// than a sensor's grain. Nothing is put down until the faces are in.
export function Page({ w = W, h = H, paper = false, head = null, sign = true, url = 'celestual.us', grain, children, className = '' }) {
  const ok = useFaces()
  return (
    <Board w={w} h={h} bg={paper ? '#F4F1EA' : '#000'} grain={paper ? 0 : grain ?? 0.07} className={`li ${paper ? 'is-paper' : 'is-room'} ${className}`}>
      {paper ? <Tooth /> : null}
      {ok ? children : null}
      {head ? <Head {...head} /> : null}
      {sign ? <Sign ink={paper} url={url} h={h} /> : null}
    </Board>
  )
}

// the paper's tooth: the fibres and the press's unevenness, generated, laid
// in multiply so it darkens the chalk and never lightens the ink
export function Tooth({ opacity = 0.5 }) {
  return (
    <>
      <span className="li-tooth" aria-hidden="true" />
      <Grain opacity={opacity * 0.22} blend="multiply" freq={0.9} seed={11} />
    </>
  )
}

// two identifiers across the top, at the margins
export function Head({ l = '', r = '' }) {
  return (
    <div className="li-head" style={{ left: M, right: M, top: U }}>
      <span>{l}</span>
      <span>{r}</span>
    </div>
  )
}

// the lockup at the left margin and the address at the right (or what
// stands in for it), on one line, its foot one unit in from the bottom
export function Sign({ ink = false, url = 'celestual.us', h = H, l = M, r = M, foot = U }) {
  return (
    <div className="li-sign" style={{ left: l, right: r, top: h - foot - SIGN.h, height: SIGN.h }}>
      <Lockup cell={SIGN_CELL} color={ink ? '#0A0A0C' : '#F4F1EA'} bloom={!ink} />
      {url ? <span className="li-url">{url}</span> : null}
    </div>
  )
}

// the lockup with the address under it, on the lockup's own left edge, the
// pair centred on `y`: the signature where a wide picture has no foot row.
// Without the address the lockup alone is centred on `y`
export function Stack({ x, y, cell = SIGN_CELL, url = 'celestual.us' }) {
  const h = lockupSize(cell).h
  return (
    <div className="li-stack" style={{ left: x, top: y - (url ? h + 34 : h) / 2 }}>
      <Lockup cell={cell} />
      {url ? <span className="li-url">{url}</span> : null}
    </div>
  )
}

// a line set to a measure: its tracking opened or closed until it runs
// exactly `w` wide, so both its ends can stand on lines of the picture. The
// tracking after its last letter is taken back, so the ink ends on the edge
export function Fit({ w, children, className = '', style }) {
  const ref = useRef(null)
  const [ls, setLs] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.letterSpacing = '0px'
    const n = [...el.textContent].length
    const w0 = el.getBoundingClientRect().width
    setLs(n > 1 ? (w - w0) / n : 0)
  }, [w, children])
  const fit = ls == null ? null : { letterSpacing: `${ls}px`, marginRight: `${-ls}px` }
  return <span ref={ref} className={`li-fit ${className}`} style={{ display: 'inline-block', whiteSpace: 'nowrap', ...style, ...fit }}>{children}</span>
}

// ── the mark, on its grid ───────────────────────────────────────────────────
// brand.js's 33 by 33 drawn large enough to count: every cell of the grid a
// hairline square, the lit ones filled. `cell` is whole pixels a cell, so the
// drawing is the brand's own at that size and never a scaled picture of it.
export function MarkGrid({ cell = 12, ink = '#F4F1EA', line = 'rgba(244, 241, 234, 0.14)', className = '', style }) {
  const n = MARK.length
  const s = n * cell
  const lit = []
  MARK.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') lit.push([x, y]) }))
  const grid = []
  for (let i = 0; i <= n; i++) {
    grid.push(`M${i * cell + 0.5} 0.5V${s + 0.5}`)
    grid.push(`M0.5 ${i * cell + 0.5}H${s + 0.5}`)
  }
  return (
    <svg className={`li-markgrid ${className}`} width={s + 1} height={s + 1} viewBox={`0 0 ${s + 1} ${s + 1}`} shapeRendering="crispEdges" style={style} aria-hidden="true">
      <path d={grid.join('')} stroke={line} strokeWidth="1" fill="none" />
      <path d={lit.map(([x, y]) => `M${x * cell + 1} ${y * cell + 1}h${cell - 1}v${cell - 1}h${-(cell - 1)}z`).join('')} fill={ink} />
    </svg>
  )
}

// ── the light on a table ────────────────────────────────────────────────────
// A screen lying face up throws its light on the surface it lies on, and
// seen from across the room that light is an ellipse: the kit's `Light`,
// pressed flat, `w` by `h`, centred at `x`, `y`
export function Pool({ x, y, w, h, tint = 'night', strength = 1, colour = '' }) {
  const halo = colour || alpha(skinOf(tint).glow, 0.42)
  return (
    <span
      className="li-pool" aria-hidden="true"
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: strength, '--halo': halo }}
    />
  )
}

// ── the table it lies on ────────────────────────────────────────────────────
// A matte surface, seen only where a screen's light falls on it: a fine
// tooth from feTurbulence, pressed flat by the angle it is seen at (`squash`)
// and lit from the glass, cut to the light's own ellipse (`x`, `y`, `w`, `h`
// within the box `bw` by `bh`)
export function Table({ bw, bh, x, y, w, h, squash = 2.6, tone = '#E8E6E0', opacity = 0.32, seed = 4 }) {
  const id = `li-t-${seed}`
  const pool = `radial-gradient(${w / 2}px ${h / 2}px at ${x}px ${y}px, #000 0%, rgba(0, 0, 0, 0.55) 45%, transparent 100%)`
  return (
    <div className="li-table" aria-hidden="true" style={{ width: bw, height: bh, opacity, WebkitMaskImage: pool, maskImage: pool }}>
      <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={`0.012 ${(0.012 * squash).toFixed(4)}`} numOctaves="3" seed={seed} result="slow" />
          <feTurbulence type="fractalNoise" baseFrequency={`0.55 ${(0.55 * squash).toFixed(3)}`} numOctaves="2" seed={seed + 3} result="fine" />
          <feComposite in="slow" in2="fine" operator="arithmetic" k1="0" k2="0.5" k3="0.7" k4="0" result="relief" />
          <feDiffuseLighting in="relief" surfaceScale="1.6" diffuseConstant="1" lightingColor={tone}>
            <feDistantLight azimuth="90" elevation="38" />
          </feDiffuseLighting>
        </filter>
        <rect width={bw} height={bh} filter={`url(#${id})`} />
      </svg>
    </div>
  )
}

// ── the twelve, evened ──────────────────────────────────────────────────────
// The twelve panels are not one brightness: measured off a render, the copy
// is nearly twice the rose and the negative a third of it, and the square
// and the riso are three times as saturated as anything lit. A screen left
// off in a row is dimmed by how far it stands, times its own `b`, and its
// colour held by its own `s`, so the loud ones sink as far as the quiet
// ones and the one that is on stays the one bright thing.
export const EVEN = {
  night: { b: 1.05, s: 1 },
  white: { b: 0.76, s: 1 },
  ice: { b: 0.95, s: 0.9 },
  teal: { b: 1.2, s: 0.9 },
  green: { b: 0.9, s: 0.85 },
  acid: { b: 0.55, s: 0.5 },
  'violet-yellow': { b: 0.5, s: 0.45 },
  amber: { b: 1, s: 0.9 },
  rose: { b: 1, s: 1 },
  lilac: { b: 1.15, s: 1 },
  negative: { b: 1.4, s: 1 },
  xerox: { b: 0.55, s: 1 },
}
export const evenOf = (tint) => {
  const e = EVEN[tint] || { b: 1, s: 1 }
  return { '--li-b': e.b, '--li-s': e.s }
}

// ── the twelve, each with its letter ────────────────────────────────────────
// One letter for each colour, from the street campaign where it was printed
// in that colour and from the campaign's new ones where none was. The name
// is who wrote it, on the draft's status row. Nearest first: the row the
// banner and the header lay out goes round the wheel from the amber.
export const ROW_LETTERS = [
  { tint: 'amber', name: 'charlie', text: 'i made so many cupcakes. i can’t quite make them like you do.' },
  { tint: 'rose', name: 'jessica', text: 'i wonder if you still wear our ring. i do.' },
  { tint: 'lilac', name: 'june', text: 'your song came on at the laundromat and i let my clothes go round again.' },
  { tint: 'negative', name: 'ren', text: 'the library seat by the window is free on tuesdays. i check.' },
  { tint: 'xerox', name: 'sasha', text: 'the pretzel guy asked why i came alone. i said he won’t see you anymore.' },
  { tint: 'night', name: 'theo', text: 'i walk the long way home now. it passes your building.' },
  { tint: 'white', name: 'ryan', text: 'i still can’t forgive you for what you have done. or maybe i can’t forgive myself for forgiving you.' },
  { tint: 'ice', name: 'amy', text: 'the alleyway behind the dumpling shop where u kissed me.' },
  { tint: 'teal', name: 'noah', text: 'you said we’d see the cherry blossoms next year. it’s next year.' },
  { tint: 'green', name: 'david', text: 'my little alcoholic. the bartender at fifth ave asked about you.' },
  { tint: 'acid', name: 'mina', text: 'we never finished the show. i’m on episode six. i’m waiting.' },
  { tint: 'violet-yellow', name: 'ana', text: 'i saw your dog at the park today. he remembered me.' },
]

// ── the lesson deck ─────────────────────────────────────────────────────────
//
// What the eight pages of the LinkedIn document share (posters/li-doc-*.jsx):
// the page, the running head across the top, the folio across the foot, and
// the type a lesson is set in. Each page lays one real part of the product
// between them as its figure: a screen in one of the twelve colours, a frame
// of a story, or the mark's own cells.
//
// The grid is square: the board's width over twelve, 90 pixels, and its
// height over fifteen, the same 90. The margins are one unit, the running
// head stands on the first row line and the folio on the fourteenth, and
// every line of words stands on a half unit, 45 pixels, so a title, the
// lesson under it and a figure's caption all keep one baseline.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Board, Lockup, Grain, useHold, lockupSize, MARK } from '../kit.jsx'
import { joinStory } from '../../wall/pixmark.js'
import { skinOf } from '../../wall/looks.js'
import './doc.css'

export const W = 1080
export const H = 1350
export const U = 90
export const M = U
export const HALF = U / 2
export const PAGES = 8
export const TITLE = 'how to build a product where nothing happens'

// a column's left edge and a row's line, in pixels
export const col = (n) => n * U
export const row = (n) => n * U

// ── the faces, before anything is laid out ──
// A screen fits its words to its glass once, when it is first laid out, so
// nothing is put down until the faces are in, and the camera waits for them
const FACES = [
  '400 40px "Jersey 10"', '500 100px Newsreader', 'italic 500 100px Newsreader',
  '400 36px Newsreader', 'italic 400 36px Newsreader', '400 20px "Geist Mono"', '500 20px "Geist Mono"',
]
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
// The room's black with the sensor's grain, the running head and the folio.
// `n` is the page's number; `head` false leaves the running head off, for
// a page that signs itself larger
export function Page({ n, head = true, foot = true, label = TITLE, grain = 0.075, vignette = 0, children, className = '' }) {
  const ok = useFaces()
  return (
    <Board w={W} h={H} grain={grain} vignette={vignette} className={`dc ${className}`}>
      {ok ? children : null}
      {head ? <Head n={n} label={label} /> : null}
      {foot ? <Folio n={n} /> : null}
    </Board>
  )
}

// The running head: the deck's title at the left margin and the page's
// number at the right, their caps hanging from the first row line (Geist
// Mono's cap is 0.71 of its em, and a line of 1 puts the baseline 0.855 of
// it under the box's top)
export const HEAD = { size: 20 }
export function Head({ n, label = TITLE }) {
  const top = row(1) + HEAD.size * 0.71 - HEAD.size * 0.855
  return (
    <div className="dc-head" style={{ left: M, right: M, top, fontSize: HEAD.size }}>
      <span>{label}</span>
      <span className="dc-num"><b>{String(n).padStart(2, '0')}</b>/{String(PAGES).padStart(2, '0')}</span>
    </div>
  )
}

// The folio: the lockup at the left margin at two pixels a cell, standing
// on the fourteenth row line, and at the right the eight pages as eight of
// the phone's cells on the word's baseline, the ones read in ash and this
// one lit, the way the signal bars count on the glass
export const SIGN_CELL = 2
export const SIGN = lockupSize(SIGN_CELL)
export function Folio({ n, sign = true }) {
  const top = row(14) - SIGN.h
  return (
    <div className="dc-folio" style={{ left: M, right: M, top, height: SIGN.h }}>
      {sign ? <Lockup cell={SIGN_CELL} /> : <span />}
      <span className="dc-cells" aria-hidden="true">
        {Array.from({ length: PAGES }, (_, i) => (
          <i key={i} className={i + 1 === n ? 'is-on' : i + 1 < n ? 'is-read' : ''} />
        ))}
      </span>
    </div>
  )
}

// ── the skeleton ──
// Where a lesson's parts stand, the same on every page so that nothing jumps
// as the pages are swiped: the kicker on the second row line, the title's
// first baseline a unit and a half under it, every line of a title and of
// the lesson on the half unit, and the figure's caption on the half unit
// clear of the lockup's own clear space
export const KICK_BASE = row(2)
export const TITLE_BASE = row(3) + HALF
export const TITLE_SIZE = 100
export const TITLE_LH = 0.9
export const CAP_BASE = row(12) + HALF
// the baseline a lesson starts on, under a title of `lines` lines
export const lessonBase = (lines) => TITLE_BASE + (lines - 1) * TITLE_SIZE * TITLE_LH + 2 * HALF

// ── the type ──
// Every block is placed by its first baseline, `base`, so the grid holds the
// words rather than their boxes. Newsreader's ascent is 0.735 of its em and
// its descent 0.265, so with a line of `lh` the first baseline stands
// size * (lh / 2 + 0.235) under the top of the box.
const serifTop = (base, size, lh) => base - size * (lh / 2 + 0.235)

// A title: the display cut, large, lowercase, balanced so no line is left
// with one word on it
export function Title({ x = M, base = TITLE_BASE, size = TITLE_SIZE, lh = TITLE_LH, width = W - 2 * M, children, className = '', style }) {
  return (
    <h1 className={`dc-title ${className}`} style={{ left: x, top: serifTop(base, size, lh), width, fontSize: size, lineHeight: lh, ...style }}>
      {children}
    </h1>
  )
}

// A lesson's words: the text cut, sized to be read on a phone held at arm's
// length (36 on 45, a half unit a line)
export const LESSON = { size: 36, lh: 45 / 36 }
export function Lesson({ x = M, base, width = 8 * U, size = LESSON.size, lh = LESSON.lh, children, className = '', style }) {
  return (
    <div className={`dc-lesson ${className}`} style={{ left: x, top: serifTop(base, size, lh), width, fontSize: size, lineHeight: lh, ...style }}>
      {children}
    </div>
  )
}

// A lesson's kicker: its number and its name in the identifier face, chalk,
// its baseline on `base`
export const KICK = { size: 22 }
export function Kicker({ x = M, base = KICK_BASE, n, children }) {
  const top = base - KICK.size * (0.5 + 0.355)
  return (
    <p className="dc-kick" style={{ left: x, top, fontSize: KICK.size }}>
      <span>lesson {n}</span>
      <span>{children}</span>
    </p>
  )
}

// A figure's caption, in the identifier face: its number in the margin's
// column and the words from the next. Geist Mono's ascent is 1.005 of its em
// and its descent 0.295, so its first baseline stands size * (lh / 2 + 0.355)
// under the box's top.
export const CAP = { size: 21, lh: 1.5 }
export function Caption({ x = M, base = CAP_BASE, width = W - 2 * M, n, children, style }) {
  const top = base - CAP.size * (CAP.lh / 2 + 0.355)
  return (
    <p className="dc-cap" style={{ left: x, top, width, fontSize: CAP.size, lineHeight: CAP.lh, ...style }}>
      <span>fig. {n}</span>
      <span>{children}</span>
    </p>
  )
}

// ── the door, on the night's glass ──
// The mechanic as the door tells it (screens/Join.jsx): he lets his note go
// at 900, it seals over the middle and dims, she lets hers go at 2300, and
// they wake together at 3600, then run to each other and become the mark
const NIGHT = skinOf('night')
let DOOR = null
export function door() {
  if (!DOOR) DOOR = joinStory({ you: 900, them: 2300, both: 3600, panel: [NIGHT.hi, NIGHT.mid, NIGHT.lo], ink: [NIGHT.ink, NIGHT.ink] })
  return DOOR
}

// ── the mark, on its grid ──
// brand.js's 33 by 33 drawn large enough to count, every cell of the grid a
// hairline square and the lit ones filled, at whole pixels a cell. `ticks`
// numbers every eighth line along the top and the left, as a sheet of
// squared paper is numbered.
export function MarkCells({ cell = 24, ink = '#F4F1EA', line = 'rgba(244, 241, 234, 0.12)', ticks = true, className = '', style }) {
  const n = MARK.length
  const s = n * cell
  const lit = []
  MARK.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') lit.push([x, y]) }))
  const grid = []
  for (let i = 0; i <= n; i++) {
    grid.push(`M${i * cell + 0.5} 0.5V${s + 0.5}`)
    grid.push(`M0.5 ${i * cell + 0.5}H${s + 0.5}`)
  }
  const gap = 2
  return (
    <div className={`dc-markcells ${className}`} style={{ width: s + 1, height: s + 1, ...style }}>
      <svg width={s + 1} height={s + 1} viewBox={`0 0 ${s + 1} ${s + 1}`} shapeRendering="crispEdges" aria-hidden="true">
        <path d={grid.join('')} stroke={line} strokeWidth="1" fill="none" />
        <path d={lit.map(([x, y]) => `M${x * cell + gap} ${y * cell + gap}h${cell - 2 * gap + 1}v${cell - 2 * gap + 1}h${-(cell - 2 * gap + 1)}z`).join('')} fill={ink} />
      </svg>
      {ticks ? [0, 8, 16, 24, 32].map((i) => (
        <span key={`x${i}`} className="dc-tick is-x" style={{ left: i * cell + cell / 2 }}>{String(i).padStart(2, '0')}</span>
      )) : null}
      {ticks ? [0, 8, 16, 24, 32].map((i) => (
        <span key={`y${i}`} className="dc-tick is-y" style={{ top: i * cell + cell / 2 }}>{String(i).padStart(2, '0')}</span>
      )) : null}
    </div>
  )
}

// ── callouts ──
// Hairlines from a part of a screen to the words about it. The parts are
// found on the page once the screen has laid itself out (`sel` is a CSS
// selector inside `within`), so a line always lands on the glyph it names,
// wherever the screen's own quirks put it. Each callout stands in the
// column from `x`, its first line level with its part.
export function Callouts({ within, items, x, width, gap = 22 }) {
  const [at, setAt] = useState(null)
  const ref = useRef(null)
  useLayoutEffect(() => {
    let on = true
    const look = () => {
      const board = ref.current && ref.current.closest('.st-board')
      const box = board && board.querySelector(within)
      if (!box) return
      const b = board.getBoundingClientRect()
      const k = b.width / board.offsetWidth
      const out = items.map((it) => {
        const el = box.querySelector(it.sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: (r.right - b.left) / k, y: (r.top + r.height / 2 - b.top) / k }
      })
      if (on) setAt(out)
    }
    // two frames for the screen to fit its words, then a third for luck
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(look)))
    return () => { on = false }
  }, [within, items])
  useHold(at != null)
  return (
    <div ref={ref} className="dc-callouts" aria-hidden={at ? undefined : 'true'}>
      {at ? items.map((it, i) => {
        const p = at[i]
        if (!p) return null
        const from = p.x + gap
        return (
          <div key={it.sel}>
            <span className="dc-lead" style={{ left: from, top: p.y, width: x - gap - from }} />
            <span className="dc-dot" style={{ left: from - 3, top: p.y - 3 }} />
            <div className="dc-call" style={{ left: x, top: p.y - 13, width }}>
              <span className="dc-call-k">{it.label}</span>
              <p>{it.text}</p>
            </div>
          </div>
        )
      }) : null}
    </div>
  )
}

export { Grain }

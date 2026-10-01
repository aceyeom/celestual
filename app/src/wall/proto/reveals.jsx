// ── the mutual, told other ways ─────────────────────────────────────────────
//
// The mutual is told by a film over the whole screen (Film.jsx) that lands
// on the keepsake (Keepsake.jsx): a phone lit rose, the mark at its head,
// `it's mutual.`, the two names and the two notes. The owner liked it and
// asked (1 October) for something more creative with a human touch: made
// the way a person would make a thing by hand for two people, and for
// nobody else. These are two other tellings, each on the keepsake's own
// phone (its frame, its band, its soft keys, its lit key), each told where
// the phone stands and landing on the keepsake it leaves behind:
//
//   a   your constellation. Everybody on celestual already has a figure of
//       stars drawn from their name (art.jsx `Mark`, the same handle the
//       same figure everywhere). On the night it is mutual both figures are
//       drawn on the glass, each reaches a line toward the other from its
//       nearest star, and only where the two lines meet does the star of
//       celestual come out, the glass turning rose from that point. What is
//       kept is that figure, at the head of the glass where the mark was: a
//       shape that has never been drawn for anybody else, the same on both
//       phones. Each note is signed with its writer's own figure, theirs on
//       the left and yours on the right, the sides the sky gave them.
//
//   b   two letters, stamped. The two sealed notes the private notes' slot
//       keeps stepping toward each other and never meeting (Slot.jsx) come
//       in from the edges and meet; their flaps open, the glass turns rose,
//       and two letters lie on it the way a person lays paper on a desk, a
//       little askew, the second over the first. A postmark is struck
//       across them with the pair's initials and the night. Each letter is
//       written in at a person's pace, quicker in a word and slower at a
//       comma, and signed with a hand of its own, a flourish drawn from the
//       name, so no two pairs' look alike.
//
// Development only: served by the dev server at /reveals.html, which the
// build never takes (app/reveals.html).
//
//   /reveals.html             both, each told once
//   /reveals.html?only=a      one of them
//   /reveals.html?t=3600      both held at 3600ms (for pictures)
//   /reveals.html?end         both landed on their keepsakes
//
// A tap on a phone lands it; its replay tells it again.

import { StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import '../wall.css'
import '../phone.css'
import '../mutual.css'
import './reveals.css'
import { Screen } from '../screen.jsx'
import { PhoneChrome, SheetFoot, Pill } from '../parts.jsx'
import { SQUARE } from '../PixelStory.jsx'
import { hash, rand } from '../data.js'
import { ensureFaces } from '../type.js'

const ask = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const HELD = ask.get('t') === null ? null : Math.max(0, Number(ask.get('t')) || 0)
const LANDED = ask.has('end')
const ONLY = ask.get('only') || ''

// the pair, as the screenshot loop's fixtures have them (scripts/preview.mjs)
const PAIR = {
  them: { name: 'Jules', handle: 'jules.k', greet: 'to the girl in row four', words: 'i kept nearly saying something after class and then not saying it.' },
  you: { name: 'Ace', handle: 'ace03d', greet: 'to the one with my pen', words: 'i have wanted to say this since the second week of term.' },
  stamp: '09/26/26',
}
const SAID = 'it’s mutual.'

// ── time ────────────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const prog = (t, a, b) => clamp01((t - a) / (b - a))
const outCubic = (x) => 1 - (1 - x) ** 3
// an LCD comes on in two steps, never a fade
const twoStep = (p) => (p <= 0 ? 0 : p < 0.5 ? 0.45 : 1)

// The telling's clock, from its start, to `ms` and no further; a run held
// at `HELD` for pictures, or landed (`at` of the run, a tap or `?end`)
function useTelling(ms, run) {
  const [t, setT] = useState(HELD ?? run.at)
  useEffect(() => {
    if (HELD != null) return undefined
    let id = 0
    const t0 = performance.now() - run.at
    const tick = (now) => {
      const e = Math.min(ms, now - t0)
      setT(e)
      if (e < ms) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [ms, run])
  return HELD ?? t
}
// once landed, the keepsake's slow beat, for what on it is alive
function useBeat(on, ms) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!on || HELD != null) return undefined
    const id = setInterval(() => setN((k) => k + 1), ms)
    return () => clearInterval(id)
  }, [on, ms])
  return n
}

// ── a person's pace ─────────────────────────────────────────────────────────
// When each character of a note is down, from its start: quicker inside a
// word, a breath at a space now and then, longer after a comma and longest
// after a full stop, all of it the same every time for the same words (the
// note's own hash), so a picture held at a moment is that moment.
function paceOf(text, seed, base = 30) {
  const at = []
  let t = 0
  for (let i = 0; i < text.length; i++) {
    const prev = text[i - 1] || ''
    let d = base + rand(seed, i) * 26
    if (prev === ',') d += 190
    if (prev === '.' || prev === '?') d += 320
    if (text[i] === ' ') d += rand(seed, i + 500) < 0.24 ? 110 : 6
    t += d
    at.push(t)
  }
  return at
}
const downBy = (pace, since) => {
  if (since < 0) return 0
  let n = 0
  while (n < pace.length && pace[n] <= since) n++
  return n
}

// ── the glass's cells ───────────────────────────────────────────────────────
// A canvas laid on the glass at a whole number of device pixels to a cell,
// `cols` across, with the gap an LCD has between its cells, and the glass's
// own dot grid laid to the same pitch under everything on it, so what is
// drawn and what is set in type stand on one grid (as the keepsake's do,
// Keepsake.jsx `gridOf`).
function useGrid(cols, onGrid) {
  const box = useRef(null)
  const cvs = useRef(null)
  const [g, setG] = useState(null)
  useLayoutEffect(() => {
    const el = box.current
    const c = cvs.current
    if (!el || !c) return undefined
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      const cell = Math.max(2, Math.floor((w * dpr) / cols))
      const rows = Math.max(1, Math.floor((h * dpr) / cell))
      c.width = cols * cell
      c.height = rows * cell
      const cssW = c.width / dpr
      const cssH = c.height / dpr
      const ox = (w - cssW) / 2
      const oy = (h - cssH) / 2
      Object.assign(c.style, { width: `${cssW}px`, height: `${cssH}px`, left: `${ox}px`, top: `${oy}px` })
      const next = { cols, rows, cell, gap: Math.max(1, Math.round(cell * 0.24)), css: cell / dpr, ox, oy }
      setG(next)
      if (onGrid) onGrid(next, el)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols]) // eslint-disable-line react-hooks/exhaustive-deps
  return [box, cvs, g]
}
// The cells to light, each at the strongest it is asked for, then drawn
// once in the glass's ink
function cellsOn() {
  const m = new Map()
  return {
    put(x, y, a = 1) {
      const k = `${Math.round(x)},${Math.round(y)}`
      if ((m.get(k) || 0) < a) m.set(k, a)
    },
    draw(c, g) {
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.fillStyle = getComputedStyle(c).getPropertyValue('--s-ink').trim() || '#1B1215'
      const d = g.cell - g.gap
      for (const [k, a] of m) {
        const [x, y] = k.split(',').map(Number)
        if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue
        ctx.globalAlpha = a
        ctx.fillRect(x * g.cell, y * g.cell, d, d)
      }
      ctx.globalAlpha = 1
    },
  }
}
function lineCells(x0, y0, x1, y1) {
  const out = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const sx = x0 < x1 ? 1 : -1
  const dy = -Math.abs(y1 - y0)
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (let i = 0; i < 400; i++) {
    out.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
  return out
}
// the glass's dot grid, to the canvas's pitch, on the element given
function laysDots(g, el) {
  const body = el.closest('.rv-body')
  if (!body) return
  const r = el.getBoundingClientRect()
  const b = body.getBoundingClientRect()
  body.style.setProperty('--dot-p', `${g.css}px`)
  body.style.setProperty('--dot-d', `${g.css - g.gap / (g.cell / g.css)}px`)
  body.style.setProperty('--dot-x', `${r.left - b.left + g.ox}px`)
  body.style.setProperty('--dot-y', `${r.top - b.top + g.oy}px`)
}

// ── a figure of stars, from a name ──────────────────────────────────────────
// art.jsx `Mark`, read for its points and laid on the glass's cells: the same
// handle draws the same figure here as everywhere else it is drawn
function figureOf(handle, cx, cy, w, h) {
  const seed = hash(handle || 'celestual')
  const n = 4 + (seed % 3)
  const raw = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(handle, i) * 1.1
    const r = 20 + rand(handle, i + 40) * 16
    raw.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  // fitted to the box it is given, whole and centred in it, so every
  // figure stands as large as its half of the sky allows
  const xs = raw.map((p) => p[0])
  const ys = raw.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const k = Math.min(w / Math.max(1, x1 - x0), h / Math.max(1, y1 - y0))
  return raw.map(([x, y]) => [Math.round(cx + (x - (x0 + x1) / 2) * k), Math.round(cy + (y - (y0 + y1) / 2) * k)])
}
// a star: a dot, or a cross of light with its arms falling off
function star(put, x, y, k, a = 1) {
  put(x, y, a)
  for (let i = 1; i <= k; i++) {
    const f = a * (i === k && k > 1 ? 0.42 : 0.78)
    put(x + i, y, f); put(x - i, y, f); put(x, y + i, f); put(x, y - i, f)
  }
  if (k >= 2) for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) put(x + dx, y + dy, a * 0.28)
}
// the star of celestual: four points, a core once it is grown
function spark(put, x, y, k, a = 1) {
  put(x, y, a)
  for (let i = 1; i <= k; i++) {
    const f = a * (1 - ((i - 1) / k) * 0.62)
    put(x + i, y, f); put(x - i, y, f); put(x, y + i, f); put(x, y - i, f)
  }
  if (k >= 3) for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) put(x + dx, y + dy, a)
}

// ── the phone ───────────────────────────────────────────────────────────────
// The keepsake's own, from Keepsake.jsx: its strip and lens for its size,
// the Screen with the pair's night on its band and the battery, the two soft
// keys, the veil the glass is black under before its light comes up, and
// the one lit key under it all.
const KEYS = { l: { label: 'options' }, r: { label: 'share' } }
const TOP = { stamp: PAIR.stamp, bat: 4 }
function Phone({ t, rose, onTap, jolt = 0, children }) {
  // the power on (DESIGN.md 6.3): black for 45ms, the light up in 380ms
  const veil = 1 - prog(t, 45, 425)
  return (
    <div className="wl-keep rv-keep">
      <div className="wl-keep-strip" style={jolt ? { transform: `translate3d(0, ${jolt}px, 0)` } : undefined}>
        <div className="wl-keep-lens">
          <div
            className="rv-tap" role="button" tabIndex={0} aria-label="land it"
            onClick={onTap} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}
          >
            <Screen look={{ tint: rose ? 'rose' : 'night' }} seed={`mutual:${PAIR.them.handle}`} top={TOP} keys={KEYS} live={false} className="wl-keep-scr" style={SQUARE}>
              {children}
            </Screen>
          </div>
          <span className="wl-keep-veil" style={{ opacity: veil }} aria-hidden="true" />
        </div>
      </div>
      <SheetFoot className="wl-keep-foot">
        <Pill tone="light" wide>message @{PAIR.them.handle} on Instagram</Pill>
      </SheetFoot>
    </div>
  )
}

// The glass turning rose from one point, as the story's backlight does:
// the night's panel over the glass, opened from where the two met
function NightWash({ t, from, to, at }) {
  if (t >= to || !at) return null
  const r = t < from ? 0 : outCubic(prog(t, from, to)) * 150
  return <span className="rv-wash" style={{ '--wx': `${at[0]}px`, '--wy': `${at[1]}px`, '--wr': `${r}%` }} aria-hidden="true" />
}

// typed, with the phone's cursor while it is being typed and for a beat after
function Typed({ text, n, caret = false, className = '', lang }) {
  return (
    <span className={className} lang={lang}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {caret ? <i className="rv-caret" aria-hidden="true" /> : null}
      <span className="rv-unwritten" aria-hidden="true">{text.slice(n)}</span>
      <span className="wl-sr">{text}</span>
    </span>
  )
}

// ═══ A · YOUR CONSTELLATION ════════════════════════════════════════════════
const SKY_COLS = 66
// the beats, in ms from the telling's start
const A = (() => {
  const them0 = 420
  const you0 = 900
  const lines0 = 1850
  const lines1 = 2500
  const reach0 = 2600
  const meet = 3520
  const wash0 = meet + 60
  const wash1 = wash0 + 760
  const said0 = wash1 - 120
  const pair0 = said0 + SAID.length * 72 + 160
  const note1 = pair0 + 320
  const theirs = paceOf(PAIR.them.words, PAIR.them.handle)
  const yours = paceOf(PAIR.you.words, PAIR.you.handle)
  const write1 = note1 + 260
  const sign1 = write1 + theirs[theirs.length - 1] + 120
  const note2 = sign1 + 360
  const write2 = note2 + 260
  const sign2 = write2 + yours[yours.length - 1] + 120
  return { them0, you0, lines0, lines1, reach0, meet, wash0, wash1, said0, pair0, note1, write1, sign1, note2, write2, sign2, theirs, yours, end: sign2 + 500 }
})()

// the sky's geometry, in cells: each figure on its half, its nearest star
// to the middle the one that reaches, and where the two reaches meet
function skyOf(rows) {
  const h = rows - 12
  const cy = Math.round(4 + h / 2)
  const them = figureOf(PAIR.them.handle, Math.round(SKY_COLS * 0.25), cy, SKY_COLS * 0.34, h)
  const you = figureOf(PAIR.you.handle, Math.round(SKY_COLS * 0.75), cy, SKY_COLS * 0.34, h)
  const hand = (pts, right) => pts.reduce((b, p) => ((right ? p[0] < b[0] : p[0] > b[0]) ? p : b))
  const h1 = hand(them, false)
  const h2 = hand(you, true)
  const meet = [Math.round((h1[0] + h2[0]) / 2), Math.round((h1[1] + h2[1]) / 2)]
  const own = (pts) => pts.slice(1).flatMap((p, i) => lineCells(pts[i][0], pts[i][1], p[0], p[1]).slice(1))
  return {
    them, you, meet, cy, foot: Math.max(...them.map((p) => p[1]), ...you.map((p) => p[1])) + 3,
    themLines: own(them), youLines: own(you),
    reach1: lineCells(h1[0], h1[1], meet[0], meet[1]),
    reach2: lineCells(h2[0], h2[1], meet[0], meet[1]),
  }
}

// a figure, small, as a writer's seal beside their name: its stars and the
// line through them on a grid of its own
function Seal({ handle }) {
  const d = useMemo(() => {
    const pts = figureOf(handle, 7, 7, 12, 12)
    const lit = new Map()
    pts.slice(1).forEach((p, i) => lineCells(pts[i][0], pts[i][1], p[0], p[1]).forEach(([x, y]) => { if (!lit.has(`${x},${y}`)) lit.set(`${x},${y}`, 0.42) }))
    pts.forEach(([x, y], i) => {
      lit.set(`${x},${y}`, 1)
      if (i === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) lit.set(`${x + dx},${y + dy}`, 0.8)
    })
    return [...lit].map(([k, a]) => { const [x, y] = k.split(','); return { x: Number(x), y: Number(y), a } })
  }, [handle])
  return (
    <svg className="rv-seal" viewBox="0 0 15 15" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {d.map((c) => <rect key={`${c.x},${c.y}`} x={c.x + 0.1} y={c.y + 0.1} width="0.8" height="0.8" fill="currentColor" opacity={c.a} />)}
    </svg>
  )
}

function Constellation({ run, onTap }) {
  const t = useTelling(A.end, run)
  const landed = t >= A.end
  const beat = useBeat(landed, 900)
  const [box, cvs, g] = useGrid(SKY_COLS, laysDots)
  const sky = useMemo(() => (g ? skyOf(g.rows) : null), [g])

  useLayoutEffect(() => {
    if (!g || !sky || !cvs.current) return
    const on = cellsOn()
    const put = on.put
    // the two figures' stars, one by one, theirs then yours
    const stars = (pts, from, twin) => pts.forEach(([x, y], i) => {
      const a = twoStep(prog(t, from + i * 140, from + i * 140 + 140))
      if (!a) return
      const k = i === 0 ? 2 : 1
      star(put, x, y, landed && twin === i ? k + 1 : k, a)
    })
    const twin = landed ? Math.floor(rand('twinkle', beat) * 12) : -1
    stars(sky.them, A.them0, twin)
    stars(sky.you, A.you0, twin - 6)
    // each figure's own line, dotted, drawn along
    const along = (cells, p) => cells.slice(0, Math.floor(cells.length * p)).forEach(([x, y], k) => { if (k % 2 === 0) put(x, y, 0.62) })
    const lp = prog(t, A.lines0, A.lines1)
    along(sky.themLines, lp)
    along(sky.youLines, lp)
    // the two reaching, together, slowing as they near each other
    const rp = outCubic(prog(t, A.reach0, A.meet))
    const reach = (cells) => {
      const n = Math.max(0, Math.round(cells.length * rp))
      cells.slice(0, n).forEach(([x, y]) => put(x, y, 0.92))
      if (n && rp < 1) star(put, cells[n - 1][0], cells[n - 1][1], 1, 1)
    }
    reach(sky.reach1)
    reach(sky.reach2)
    // and where they meet, the star of celestual, grown in steps, then
    // breathing on the keepsake's beat
    if (t >= A.meet) {
      const k = landed ? (beat % 3 === 0 ? 4 : 3) : Math.min(4, 1 + Math.floor((t - A.meet) / 90)) - (t > A.meet + 600 ? 1 : 0)
      spark(put, sky.meet[0], sky.meet[1], Math.max(1, k))
    }
    on.draw(cvs.current, g)
  }, [t, g, sky, beat, landed, cvs])

  // where the glass turns rose from, in the body's pixels
  const meetPx = g && sky && box.current ? (() => {
    const body = box.current.closest('.rv-body')
    const r = box.current.getBoundingClientRect()
    const b = body.getBoundingClientRect()
    return [r.left - b.left + g.ox + (sky.meet[0] + 0.5) * g.css, r.top - b.top + g.oy + (sky.meet[1] + 0.5) * g.css]
  })() : null
  const label = (pts, who, from) => {
    if (!g || !pts) return null
    const x = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const n = Math.max(0, Math.min(who.length, Math.floor((t - from) / 70)))
    return (
      <span className="rv-star-name" style={{ left: `${g.ox + (x + 0.5) * g.css}px`, top: `${g.oy + sky.foot * g.css}px` }}>
        {who.slice(0, n)}
      </span>
    )
  }
  const saidN = Math.max(0, Math.min(SAID.length, Math.floor((t - A.said0) / 72)))
  const pairOn = twoStep(prog(t, A.pair0, A.pair0 + 200))
  const noteIn = (from) => outCubic(prog(t, from, from + 280))
  const n1 = downBy(A.theirs, t - A.write1)
  const n2 = downBy(A.yours, t - A.write2)
  const writing1 = t >= A.write1 && t < A.sign1 + 400
  const writing2 = t >= A.write2 && t < A.sign2 + 400
  return (
    <Phone t={t} rose={t >= A.wash0} onTap={onTap}>
      <div className="wl-keep-body rv-body is-a">
        <NightWash t={t} from={A.wash0} to={A.wash1} at={meetPx} />
        {meetPx && t >= A.meet ? (
          <span className="rv-glow" style={{ left: `${meetPx[0]}px`, top: `${meetPx[1]}px`, opacity: outCubic(prog(t, A.meet, A.meet + 900)) * (landed && beat % 3 === 0 ? 1 : 0.82) }} aria-hidden="true" />
        ) : null}
        <div className="rv-sky" ref={box}>
          <canvas ref={cvs} className="rv-cells" aria-hidden="true" />
          {sky ? label(sky.them, PAIR.them.name, A.them0 + 200) : null}
          {sky ? label(sky.you, PAIR.you.name, A.you0 + 200) : null}
        </div>
        <p className="rv-said"><Typed text={SAID} n={saidN} caret={t >= A.said0 && (t < A.pair0 + 600 || Math.floor(t / 530) % 2 === 0)} /></p>
        <p className="rv-pair" style={{ opacity: pairOn }}>{PAIR.them.name} <span>&amp;</span> {PAIR.you.name}</p>
        <div className="rv-notes">
          <article className="rv-note is-theirs" style={{ opacity: noteIn(A.note1), transform: `translate3d(0, ${(1 - noteIn(A.note1)) * 3}cqw, 0)` }}>
            <p className="rv-note-to">{PAIR.them.greet}</p>
            <p className="rv-note-words"><Typed text={PAIR.them.words} n={n1} caret={writing1} /></p>
            <p className="rv-note-from" style={{ opacity: twoStep(prog(t, A.sign1, A.sign1 + 160)) }}>
              <Seal handle={PAIR.them.handle} /><span>from {PAIR.them.name}</span>
            </p>
          </article>
          <article className="rv-note is-yours" style={{ opacity: noteIn(A.note2), transform: `translate3d(0, ${(1 - noteIn(A.note2)) * 3}cqw, 0)` }}>
            <p className="rv-note-to">{PAIR.you.greet}</p>
            <p className="rv-note-words"><Typed text={PAIR.you.words} n={n2} caret={writing2} /></p>
            <p className="rv-note-from" style={{ opacity: twoStep(prog(t, A.sign2, A.sign2 + 160)) }}>
              <span>from {PAIR.you.name} · delivered</span><Seal handle={PAIR.you.handle} />
            </p>
          </article>
        </div>
      </div>
    </Phone>
  )
}

// ═══ B · TWO LETTERS, STAMPED ══════════════════════════════════════════════
const DESK_COLS = 60
// the envelope as the slot's note, drawn larger: shut, and with its flap up
const SHUT = [
  'XXXXXXXXXXXXXXX',
  'XX...........XX',
  'X.XX.......XX.X',
  'X...XX...XX...X',
  'X.....XXX.....X',
  'X.............X',
  'X.............X',
  'X.............X',
  'XXXXXXXXXXXXXXX',
]
const OPEN = [
  '.......X.......',
  '.....XX.XX.....',
  '...XX.....XX...',
  '.XX.........XX.',
  'XXXXXXXXXXXXXXX',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'XXXXXXXXXXXXXXX',
]
const ENV_W = SHUT[0].length
// a name signed is quicker than words written
const SIGN = [40, 90, 140, 190, 240, 290, 340, 390, 440, 490]
const B = (() => {
  const step0 = 450
  const hop = 56
  const meet = step0 + (Math.round(DESK_COLS / 2) - 1) * hop
  const flap = meet + 260
  const wash0 = meet + 140
  const wash1 = wash0 + 760
  const rise0 = flap + 120
  const rise1 = rise0 + 520
  const lay1 = rise1 + 120
  const lay2 = lay1 + 170
  const stamp = lay2 + 420
  const said0 = stamp + 340
  const pair0 = said0 + SAID.length * 72 + 140
  const theirs = paceOf(PAIR.them.words, `${PAIR.them.handle}:b`)
  const yours = paceOf(PAIR.you.words, `${PAIR.you.handle}:b`)
  const write1 = pair0 + 260
  const sign1 = write1 + theirs[theirs.length - 1] + 140
  const write2 = sign1 + 900
  const sign2 = write2 + yours[yours.length - 1] + 140
  return { step0, hop, meet, flap, wash0, wash1, rise0, rise1, lay1, lay2, stamp, said0, pair0, write1, sign1, write2, sign2, theirs, yours, end: sign2 + 1100 }
})()

// A hand, from a name: a loop or two out of the last letter that runs on
// into a line and thins, as a signature does, its cells on a grid of its
// own and drawn along as the pen goes
function handOf(name) {
  const loops = 1 + (hash(name) % 2)
  const lift = 0.6 + rand(name, 7) * 0.9
  const w = 30 + Math.round(rand(name, 3) * 8)
  const seen = new Set()
  const out = []
  for (let i = 0; i <= 420; i++) {
    const u = i / 420
    const x = u * w + 2.4 * Math.cos(u * Math.PI * 2 * loops + 1.2) * (1 - u)
    const y = 5 + 3.4 * Math.sin(u * Math.PI * 2 * loops + 1.2) * (1 - u) * lift - u * 1.8
    const k = `${Math.round(x)},${Math.round(y)}`
    if (!seen.has(k)) { seen.add(k); out.push([Math.round(x) + 2, Math.round(y), 1 - u * 0.45]) }
  }
  return { cells: out, w: w + 6 }
}
function Hand({ name, p }) {
  const h = useMemo(() => handOf(name), [name])
  const n = Math.round(h.cells.length * p)
  return (
    <svg className="rv-hand" viewBox={`0 0 ${h.w} 10`} aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {h.cells.slice(0, n).map(([x, y, a]) => <rect key={`${x},${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" fill="currentColor" opacity={a} />)}
    </svg>
  )
}

// The postmark: two rings, what it is and the night round them, the pair's
// initials in it, the cancel running off to its right, struck in the
// glass's ink a little unevenly, the way a stamp takes
function Postmark({ on }) {
  const ring = 'celestual · saturday 26 september · 9pm pacific · '
  const waves = [0, 1, 2, 3].map((i) => {
    const y = 34 + i * 17
    let d = `M118 ${y}`
    for (let x = 118; x <= 230; x += 4) d += ` L${x} ${(y + Math.sin((x + i * 9) / 9) * 3.2).toFixed(1)}`
    return d
  })
  return (
    <svg className={`rv-post${on ? ' is-on' : ''}`} viewBox="0 0 232 124" aria-hidden="true" focusable="false">
      <defs>
        <path id="rv-ring" d="M62,62 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0" />
        <filter id="rv-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="3" result="w" />
          <feDisplacementMap in="inked" in2="w" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#rv-ink)" fill="none" stroke="currentColor">
        <circle cx="62" cy="62" r="56" strokeWidth="3.4" />
        <circle cx="62" cy="62" r="31" strokeWidth="1.8" />
        {waves.map((d) => <path key={d} d={d} strokeWidth="2.6" strokeLinecap="round" />)}
        <g fill="currentColor" stroke="none" fontFamily="'Jersey 10', monospace">
          <text fontSize="13.4"><textPath href="#rv-ring" textLength="262" lengthAdjust="spacing">{ring}</textPath></text>
          <text x="62" y="71" fontSize="27" textAnchor="middle">{PAIR.them.name[0]}&amp;{PAIR.you.name[0]}</text>
        </g>
      </g>
    </svg>
  )
}

function Letters({ run, onTap }) {
  const t = useTelling(B.end, run)
  const [box, cvs, g] = useGrid(DESK_COLS, laysDots)
  const geo = useMemo(() => {
    if (!g) return null
    const mid = Math.round(DESK_COLS / 2)
    return { mid, y: Math.round(g.rows * 0.17) }
  }, [g])

  useLayoutEffect(() => {
    if (!g || !geo || !cvs.current) return
    const on = cellsOn()
    const put = on.put
    if (t < B.rise1 + 200) {
      // the two notes, a cell and another every hop, each trailing what it
      // has just left (Slot.jsx), until they stand side by side
      const far = geo.mid - 1
      const hops = Math.min(far, Math.max(0, Math.floor((t - B.step0) / B.hop)))
      const gone = 1 - prog(t, B.rise0, B.rise1 + 200)
      const env = (x0, dir) => {
        const rows = t >= B.flap ? OPEN : SHUT
        const at = (h) => x0 + dir * h
        const drawAt = (x, a) => rows.forEach((row, y) => [...row].forEach((c, i) => { if (c === 'X') put(x + i, geo.y + y - (rows === OPEN ? 4 : 0), a) }))
        if (t < B.meet) [3, 2, 1].forEach((k, j) => { if (hops - k >= 0) drawAt(at(hops - k), [0.07, 0.15, 0.3][j] * gone) })
        drawAt(at(hops), gone)
      }
      env(-ENV_W, 1)
      env(DESK_COLS, -1)
      // a cell of light where they touch
      if (t >= B.meet && t < B.rise1) spark(put, geo.mid, geo.y - 3, Math.min(3, 1 + Math.floor((t - B.meet) / 90)), gone)
      // the letters lifting out of them, as two leaves of light rising
      const lift = outCubic(prog(t, B.rise0, B.rise1))
      if (lift > 0) {
        for (const x0 of [geo.mid - 1 - ENV_W + 2, geo.mid + 3]) {
          const top = geo.y - 1 - Math.round(lift * 10)
          for (let y = top; y < top + 7; y++) for (let x = x0; x < x0 + ENV_W - 4; x++) {
            const edge = y === top || x === x0 || x === x0 + ENV_W - 5
            put(x, y, (edge ? 0.7 : 0.12) * gone)
          }
        }
      }
    }
    on.draw(cvs.current, g)
  }, [t, g, geo, cvs])

  const touchPx = g && geo && box.current ? [g.ox + (geo.mid + 0.5) * g.css, g.oy + (geo.y + 4) * g.css] : null
  const lay = (from) => outCubic(prog(t, from, from + 300))
  const struck = t >= B.stamp
  const sp = prog(t, B.stamp, B.stamp + 150)
  const stampScale = !struck ? 1.4 : sp < 1 ? 1.4 - sp * 0.46 : 0.94 + Math.min(1, (t - B.stamp - 150) / 120) * 0.06
  const jolt = t >= B.stamp + 120 && t < B.stamp + 230 ? 1.5 : 0
  const saidN = Math.max(0, Math.min(SAID.length, Math.floor((t - B.said0) / 72)))
  const pairOn = twoStep(prog(t, B.pair0, B.pair0 + 200))
  const n1 = downBy(B.theirs, t - B.write1)
  const n2 = downBy(B.yours, t - B.write2)
  return (
    <Phone t={t} rose={t >= B.wash0} onTap={onTap} jolt={jolt}>
      <div className="wl-keep-body rv-body is-b" ref={box}>
        <NightWash t={t} from={B.wash0} to={B.wash1} at={touchPx} />
        <canvas ref={cvs} className="rv-cells is-desk" aria-hidden="true" />
        <div className="rv-head">
          <div className="rv-post-at" style={{ opacity: struck ? 0.86 : 0, transform: `rotate(-9deg) scale(${stampScale.toFixed(3)})` }}>
            <Postmark on={struck} />
          </div>
          <div className="rv-head-words">
            <p className="rv-said"><Typed text={SAID} n={saidN} caret={t >= B.said0 && (t < B.pair0 + 600 || Math.floor(t / 530) % 2 === 0)} /></p>
            <p className="rv-pair" style={{ opacity: pairOn }}>{PAIR.them.name} <span>&amp;</span> {PAIR.you.name}</p>
          </div>
        </div>
        <div className="rv-papers">
          <article className="rv-paper is-theirs" style={{ opacity: lay(B.lay1), '--lay': 1 - lay(B.lay1) }}>
            <p className="rv-paper-to">{PAIR.them.greet}</p>
            <p className="rv-paper-words"><Typed text={PAIR.them.words} n={n1} caret={t >= B.write1 && t < B.sign1} /></p>
            <p className="rv-paper-from">
              <Typed text={PAIR.them.name} n={downBy(SIGN, t - B.sign1)} />
              <Hand name={PAIR.them.name} p={prog(t, B.sign1 + 240, B.sign1 + 760)} />
            </p>
          </article>
          <article className="rv-paper is-yours" style={{ opacity: lay(B.lay2), '--lay': 1 - lay(B.lay2) }}>
            <p className="rv-paper-to">{PAIR.you.greet}</p>
            <p className="rv-paper-words"><Typed text={PAIR.you.words} n={n2} caret={t >= B.write2 && t < B.sign2} /></p>
            <p className="rv-paper-from">
              <Typed text={PAIR.you.name} n={downBy(SIGN, t - B.sign2)} />
              <Hand name={PAIR.you.name} p={prog(t, B.sign2 + 240, B.sign2 + 760)} />
              <small style={{ opacity: twoStep(prog(t, B.sign2 + 800, B.sign2 + 960)) }}>delivered</small>
            </p>
          </article>
        </div>
      </div>
    </Phone>
  )
}

// ── the page ────────────────────────────────────────────────────────────────
const TELLINGS = [
  {
    id: 'a', name: 'your constellation', C: Constellation, ms: A.end,
    line: 'each of you has a figure of stars drawn from your name. they reach for each other, and the star of celestual comes out only where they meet. what you keep is a shape nobody else has.',
  },
  {
    id: 'b', name: 'two letters, stamped', C: Letters, ms: B.end,
    line: 'the two sealed notes from your slot finally meet and open. the letters are laid on the glass by hand, written in at a person’s pace, signed, and postmarked with your initials and the night.',
  },
]

function Card({ tell, all }) {
  const [run, setRun] = useState(() => ({ n: 0, at: LANDED ? tell.ms : 0 }))
  useEffect(() => { if (all) setRun((r) => ({ n: r.n + 1, at: 0 })) }, [all])
  const C = tell.C
  return (
    <article className="rv-card" data-telling={tell.id}>
      <C key={run.n} run={run} onTap={() => setRun((r) => ({ n: r.n + 1, at: tell.ms }))} />
      <div className="rv-meta">
        <p className="rv-name"><b>{tell.id} · {tell.name}</b><span>{(tell.ms / 1000).toFixed(1)}s</span></p>
        <p className="rv-line">{tell.line}</p>
        <div className="rv-row">
          <button type="button" className="rv-btn is-main" onClick={() => setRun((r) => ({ n: r.n + 1, at: 0 }))}>replay</button>
          <button type="button" className="rv-btn" onClick={() => setRun((r) => ({ n: r.n + 1, at: tell.ms }))}>the keepsake</button>
        </div>
      </div>
    </article>
  )
}

function Reveals() {
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('wl-bleed', 'wl-dark')
    return () => html.classList.remove('wl-bleed', 'wl-dark')
  }, [])
  const [all, setAll] = useState(0)
  const shown = TELLINGS.filter((x) => !ONLY || x.id === ONLY)
  return (
    <PhoneChrome.Provider value>
      <div className={`wl-root is-room rv-root${ONLY ? ' is-one' : ''}`}>
        {ONLY ? null : (
          <header className="rv-top">
            <h1>the mutual, told other ways</h1>
            <button type="button" className="rv-btn is-main" onClick={() => setAll((k) => k + 1)}>play both</button>
            <p>each is told on the keepsake&rsquo;s own phone and lands on what the two of them keep. tap a phone to land it.</p>
          </header>
        )}
        <main className="rv-grid">
          {shown.map((x) => <Card key={x.id} tell={x} all={all} />)}
        </main>
      </div>
    </PhoneChrome.Provider>
  )
}

if (import.meta.env.DEV) {
  ensureFaces()
  createRoot(document.getElementById('root')).render(<StrictMode><Reveals /></StrictMode>)
}

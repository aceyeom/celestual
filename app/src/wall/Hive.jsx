// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE: the names on the wall, as a field seen through a lens         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall's index is a list of people, and this is how the wall shows it:
// one disc per person, the face the resolver has or a monogram until then, set
// on a hexagonal lattice that never ends in any direction. The whole field is
// seen through a lens. Whatever is nearest the middle of the screen is drawn
// largest and carries the most: the name, the handle, how many letters and how
// long since the last one. The ring around it is smaller and carries the
// handle. Past that the discs shrink toward the edges and the handles fade,
// until at the rim they are points. It is a field of stars with one in focus,
// which is the shape the rest of this product is drawn in.
//
// ── it moves by itself, one person at a time ────────────────────────────────
// The lanes it replaced crawled at the speed of a departures board. This walks:
// the field glides so that the next person lands in the lens, holds there for
// a couple of seconds, and glides on. Six steps make a stitch, east, east,
// south east, east, east, north east, so the walk snakes across rows rather
// than running along one. A glide is the product's own curve (`--ease`), the
// hold is long enough to read a name and a count, and a person at the centre
// is a person at rest, which a crawl never gives you.
//
// ── and it is a thing you can pull ──────────────────────────────────────────
// Any direction. A throw coasts on the same friction the lanes had and, when
// it stops, the field settles so the nearest person is exactly in the lens,
// holds, and the walk resumes from there. A wheel or a trackpad pans it. A
// name under the pointer holds the whole field still, and a keyboard walking
// the names brings each one into the lens as it lands on it. A press that
// travelled swallows the tap it would have ended in, because every disc is a
// target and nothing is worse than a surface that opens a letter because you
// tried to look past it.
//
// ── it has to work at five names and at five hundred ────────────────────────
// The lattice is a torus: a tile of C by R cells that repeats in both axes, so
// there is no first name and no last one and no edge to reach. The tile is
// the smallest with room for every name, the names are laid into it from its
// middle outward in the order the index carries them (newest first), so the
// most recently written to sit together at the centre of the tile and the
// stalest at its rim. Cells left over are filled from the heaviest names, so a
// wall of five is a field of the same five, which is the truth, and a wall of
// three hundred repeats only at a distance nobody sees twice.
//
// ── what is drawn, and what is not ──────────────────────────────────────────
// The DOM holds a pool of slots the size of the screen and no more, however
// many names the wall carries: each slot owns one cell of the visible window
// and is handed a new name when the field scrolls a cell across. Positions,
// scales and the labels' opacities are written straight to the elements from
// one requestAnimationFrame; React is told only when a slot changes hands or
// the lens moves to another person. The disc is scaled and the words under it
// are not, so type stays sharp whatever the lens is doing to the picture.
//
// Under `prefers-reduced-motion` nothing walks and nothing coasts: the field
// is still, the lens still applies, a pull moves it and it lands at once.

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Face, Label, useProfile } from './parts.jsx'
import { Sparkle } from './art.jsx'
import { atHandle, ago } from './data.js'

// ── the numbers ─────────────────────────────────────────────────────────────
// At most this many names in the field. Past it the rest are a search away,
// and a torus of three hundred already repeats only at the far side of a wall
// nobody scrolls to.
const CAP = 240
// The disc, by weight (data.js `wall`: how many letters the name carries).
const DISC = [46, 52, 58]
// Row pitch as a fraction of the column pitch. A true hexagonal packing is
// 0.866; a little more here, so the caption under the person in the lens
// clears the row below it. Nobody can see the difference in the packing.
const ROW = 0.98
// The lens. `in` is the person at the centre, `out` the rim, `pow` how fast
// the fall is between them, and `flat` is every disc while the veil is down
// and the lens is off. A spread has the room for a deeper and steeper lens
// than a phone, and it needs one: with a gentle fall the heaviest name beside
// the lens drew as large as the person in it, and the weights fought the lens.
const ZOOM = { in: 1.3, pow: 1.6, wide: 1.6, widePow: 2.2, out: 0.34, flat: 0.86 }
// How much the lens pushes the field outward at the centre. It is what makes
// room around the person in focus; a magnifier that scaled without spreading
// would be a bulge with its neighbours crowding in.
const BULGE = 0.2
// The walk: a glide, the hold at its end, and the settle after a throw.
const GLIDE = 900
const DWELL = 2600
const SETTLE = 620
const STEPS = ['e', 'e', 'se', 'e', 'e', 'ne']
// Under the veil the field drifts, slowly, the way the lanes did.
const DRIFT = { x: -5, y: -1.6 }
// The throw. Same numbers as the lanes had: below STOP a throw has stopped,
// and FRICTION is how much of its speed it keeps per 60Hz frame.
const STOP = 12
const FRICTION = 0.94
const SLOP = 6
const WHEEL_REST = 160

const mod = (v, m) => ((v % m) + m) % m
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// `--ease`, cubic-bezier(0.16, 1, 0.30, 1), solved for a time so a glide in
// JavaScript is the same curve as an entrance in CSS.
function bezier(x1, y1, x2, y2) {
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1
  const B = (a1, a2) => 3 * a2 - 6 * a1
  const C = (a1) => 3 * a1
  const at = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t
  const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1)
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const s = slope(t, x1, x2)
      if (s < 1e-6) break
      t -= (at(t, x1, x2) - x) / s
    }
    return at(t, y1, y2)
  }
}
const EASE = bezier(0.16, 1, 0.30, 1)

// ── the tile ────────────────────────────────────────────────────────────────
// C by R cells, R even so the offset rows line up across the seam. Cells are
// ranked by their distance from the tile's middle cell and the names are laid
// in by rank, so the index's order (newest first) reads outward from the
// centre. Leftover cells take the heaviest names, in turn.
function tileUp(tiles) {
  const n = tiles.length
  const C = Math.max(2, Math.ceil(Math.sqrt(n * 1.15)))
  let R = Math.max(2, Math.ceil(n / C))
  if (R % 2) R += 1
  const ic = Math.floor(C / 2)
  const jc = Math.floor(R / 2)
  const cells = []
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const dx = (i + (j & 1) * 0.5) - (ic + (jc & 1) * 0.5)
      const dy = (j - jc) * ROW
      cells.push({ i, j, d: dx * dx + dy * dy, a: Math.atan2(dy, dx) })
    }
  }
  cells.sort((p, q) => p.d - q.d || p.a - q.a)
  const pool = tiles.map((_, k) => k)
    .sort((a, b) => tiles[b].count - tiles[a].count || tiles[b].at - tiles[a].at)
  const at = new Int32Array(C * R)
  cells.forEach((c, rank) => { at[c.j * C + c.i] = rank < n ? rank : pool[(rank - n) % n] })
  return { C, R, at, ic, jc }
}

// ── the words under a disc ──────────────────────────────────────────────────
// Every disc but the one in the lens: the handle, and a small count when
// there is more than one letter, the way the lanes carried it.
function Tag({ tile }) {
  return (
    <span className="wl-cell-h">
      {atHandle(tile.handle)}
      {tile.count > 1 ? <sup className="wl-cell-n">{tile.count}</sup> : null}
    </span>
  )
}

// The one in the lens: the name the resolver has, with the badge, and under
// it the handle, the count and how long since the last letter. When there is
// no name the handle stands as the name, in its own face, and the line under
// it carries the rest. The same two lines `Who` draws beside a face on a row.
function Caption({ tile }) {
  const p = useProfile(tile.handle)
  const name = p?.name || ''
  const n = tile.count === 1 ? 'one letter' : `${tile.count} letters`
  const when = tile.at ? ago(tile.at) : ''
  return (
    <span className="wl-cell-cap">
      <span className={`wl-cell-name${name ? '' : ' is-h'}`}>
        {name || atHandle(tile.handle)}
        {p?.verified ? <Sparkle size={9} className="wl-cell-badge" /> : null}
      </span>
      <span className="wl-cell-meta">
        {[name ? atHandle(tile.handle) : '', n, when].filter(Boolean).join(' · ')}
      </span>
    </span>
  )
}

// One slot. A button, because every name is a target; the disc and the words
// are its two children and each is placed by the loop, the disc scaled and
// the words not. Memoised so a slot re-renders only when its name changes or
// the lens arrives on it or leaves it.
const Cell = memo(function Cell({ s, tile, focus, cap, mine, delay, bind, onOpen, onHover }) {
  if (!tile) return <button type="button" className="wl-cell" ref={(el) => bind(s, el)} tabIndex={-1} aria-hidden="true" />
  const w = tile.weight || 0
  const d = DISC[w]
  return (
    <button
      type="button"
      className={`wl-cell is-w${w}${focus ? ' is-focus' : ''}${mine ? ' is-mine' : ''}`}
      style={{ '--d': `${d}px`, '--in': `${delay}ms` }}
      data-slot={s}
      ref={(el) => bind(s, el)}
      onClick={() => onOpen(tile.handle)}
      onPointerEnter={(e) => onHover(true, e)}
      onPointerLeave={(e) => onHover(false, e)}
      aria-label={`${atHandle(tile.handle)}, ${tile.count === 1 ? 'one letter' : `${tile.count} letters`}`}
      draggable={false}
    >
      <span className="wl-cell-disc" aria-hidden="true">
        <Face handle={tile.handle} size={d} lit={mine} />
      </span>
      <span className="wl-cell-tag" aria-hidden="true">
        {focus && cap ? <Caption tile={tile} /> : <Tag tile={tile} />}
      </span>
    </button>
  )
})

export default function Hive({ tiles, reduce = false, veiled = false, paused = false, opening = false, mine = [], none = '', onOpen }) {
  const names = useMemo(() => tiles.slice(0, CAP), [tiles])
  const lay = useMemo(() => tileUp(names), [names])
  const wrote = useMemo(() => new Set(mine), [mine])

  const stage = useRef(null)
  const size = useRef({ w: 0, h: 0 })
  // The slot grid: how many columns and rows of slots the window is worth.
  const [grid, setGrid] = useState(null)
  // Which name each slot holds, as React sees it. The loop keeps its own copy
  // in `motion.slots` and tells React only when a slot changes hands.
  const [assign, setAssign] = useState([])
  // The person in the lens, by cell.
  const [focusKey, setFocusKey] = useState('')

  const motion = useRef({
    o: { x: 0, y: 0 },        // where the field's origin is on the screen
    c: { x: 0, y: 0 },        // the centre of the window, the lens's own point
    S: 92, rowH: 92 * ROW,    // the lattice pitch, set from the window's width
    lens: 0,                  // 0 flat under the veil, 1 the full lens
    phase: 'drift',
    from: null, to: null, t0: 0, dur: 0, dwell: DWELL,
    until: 0,
    v: { x: 0, y: 0 },
    drag: null, moved: 0,
    hover: false, kbd: false, wheelAt: 0,
    step: 0,
    focus: null,              // { I, J, nd }
    slots: [], used: null, Mx: 0, My: 0,
    veiled, reduce,
    ready: false,
  })
  motion.current.veiled = veiled
  motion.current.reduce = reduce

  // ── the lattice, in world units ──
  const worldX = useCallback((I, J, S) => (I + (J & 1) * 0.5) * S, [])
  const tileAt = useCallback((I, J) => lay.at[mod(J, lay.R) * lay.C + mod(I, lay.C)], [lay])

  // ── the nearest cell to the lens ──
  const nearest = useCallback((m) => {
    const { S, rowH } = m
    const cx = m.c.x - m.o.x
    const cy = m.c.y - m.o.y
    const J0 = Math.round(cy / rowH)
    let best = null
    for (let J = J0 - 1; J <= J0 + 1; J++) {
      const I0 = Math.round(cx / S - (J & 1) * 0.5)
      for (let I = I0 - 1; I <= I0 + 1; I++) {
        const dx = worldX(I, J, S) - cx
        const dy = J * rowH - cy
        const d = dx * dx + dy * dy
        if (!best || d < best.d) best = { I, J, d }
      }
    }
    return best
  }, [worldX])

  // Glide so that a cell lands exactly in the lens, then hold.
  const glideTo = useCallback((m, I, J, dur, now, dwell = DWELL) => {
    const to = { x: m.c.x - worldX(I, J, m.S), y: m.c.y - J * m.rowH }
    if (m.reduce || dur <= 0) {
      m.o = to
      m.phase = 'dwell'
      m.until = now + dwell
      return
    }
    m.from = { x: m.o.x, y: m.o.y }
    m.to = to
    m.t0 = now
    m.dur = dur
    m.dwell = dwell
    m.phase = 'glide'
  }, [worldX])

  const settle = useCallback((m, now) => {
    const n = nearest(m)
    if (n) glideTo(m, n.I, n.J, SETTLE, now)
  }, [nearest, glideTo])

  // The next person on the walk: a lattice neighbour of the one in the lens,
  // in the stitch's own order.
  const tourStep = useCallback((m, now) => {
    const f = m.focus || nearest(m)
    if (!f) return
    const dir = STEPS[m.step++ % STEPS.length]
    let I = f.I, J = f.J
    if (dir === 'e') I += 1
    else if (dir === 'se') { I += (J & 1); J += 1 }
    else { I += (J & 1); J -= 1 }
    glideTo(m, I, J, GLIDE, now)
  }, [nearest, glideTo])

  // ── the window ──
  // Measured, and re-measured on resize, because everything here turns on it:
  // the pitch, how many slots there are, and where the lens is.
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return undefined
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      const m = motion.current
      const S = w >= 900 ? 104 : 92
      const rowH = S * ROW
      const pad = S * 0.7
      // one more than the window's span can round up to, either way, so a
      // cell at the far edge never lands on a slot the near edge is using
      const Mx = Math.ceil((w + 2 * pad) / S) + 3
      const My = Math.ceil((h + 2 * pad) / rowH) + 3
      const was = { ...m.c }
      size.current = { w, h }
      m.c = { x: w / 2, y: h / 2 }
      if (!m.ready) {
        // the tile's middle cell starts in the lens
        m.S = S; m.rowH = rowH
        m.o = { x: m.c.x - worldX(lay.ic, lay.jc, S), y: m.c.y - lay.jc * rowH }
        m.ready = true
      } else if (m.S !== S) {
        // a new pitch: keep the same cell in the lens
        const f = m.focus || nearest(m)
        m.S = S; m.rowH = rowH
        if (f) m.o = { x: m.c.x - worldX(f.I, f.J, S), y: m.c.y - f.J * rowH }
      } else {
        // the same field, a different window: the lens stays on what it had
        m.o.x += m.c.x - was.x
        m.o.y += m.c.y - was.y
      }
      if (m.Mx !== Mx || m.My !== My) {
        m.Mx = Mx; m.My = My
        m.slots = Array.from({ length: Mx * My }, () => ({
          I: NaN, J: NaN, k: -1, el: null, disc: null, tag: null, shown: true, lab: -1,
        }))
        m.used = new Uint8Array(Mx * My)
        m.focus = null
        setGrid({ Mx, My })
        setAssign(new Array(Mx * My).fill(null))
      }
    }
    measure()
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null
    if (ro) ro.observe(el)
    return () => { if (ro) ro.disconnect() }
  }, [lay, worldX, nearest])

  // The veil lifting: settle onto the nearest person, then walk.
  useEffect(() => {
    const m = motion.current
    if (veiled) { m.phase = 'drift'; return }
    if (m.phase === 'drift' && m.ready) settle(m, performance.now())
  }, [veiled, settle])

  // ── the loop ──
  const bind = useCallback((s, el) => {
    const slot = motion.current.slots[s]
    if (!slot) return
    slot.el = el
    slot.disc = el ? el.querySelector('.wl-cell-disc') : null
    slot.tag = el ? el.querySelector('.wl-cell-tag') : null
    slot.lab = -1
  }, [])

  useEffect(() => {
    if (paused || !grid) return undefined
    let raf = 0
    let last = 0
    const holding = (m) => m.hover || m.kbd || m.veiled || m.reduce

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const m = motion.current
      const { w, h } = size.current
      if (!w || !h || !m.ready) return
      const dt = last ? Math.min(64, now - last) : 16
      last = now

      // the lens comes up over about a second as the veil lifts
      const want = m.veiled ? 0 : 1
      if (m.reduce) m.lens = want
      else {
        m.lens += (want - m.lens) * (1 - Math.exp(-dt / 300))
        if (Math.abs(want - m.lens) < 0.002) m.lens = want
      }

      // ── the phase ──
      switch (m.phase) {
        case 'drag': break
        case 'fling': {
          m.o.x += m.v.x * dt / 1000
          m.o.y += m.v.y * dt / 1000
          const k = Math.pow(FRICTION, dt / 16.667)
          m.v.x *= k; m.v.y *= k
          if (Math.hypot(m.v.x, m.v.y) < STOP) settle(m, now)
          break
        }
        case 'glide': {
          const t = Math.min(1, (now - m.t0) / m.dur)
          const e = EASE(t)
          m.o.x = m.from.x + (m.to.x - m.from.x) * e
          m.o.y = m.from.y + (m.to.y - m.from.y) * e
          if (t >= 1) { m.phase = 'dwell'; m.until = now + m.dwell }
          break
        }
        case 'dwell': {
          if (holding(m)) { m.until = Math.max(m.until, now + 500); break }
          if (now >= m.until) tourStep(m, now)
          break
        }
        case 'drift': {
          if (!m.reduce) {
            m.o.x += DRIFT.x * dt / 1000
            m.o.y += DRIFT.y * dt / 1000
          }
          break
        }
        case 'rest': {
          if (m.wheelAt && now - m.wheelAt > WHEEL_REST) { m.wheelAt = 0; settle(m, now) }
          break
        }
        default: break
      }

      // ── the draw ──
      const { S, rowH, Mx, My, slots, used } = m
      const pad = S * 0.7
      const cx = m.c.x, cy = m.c.y
      // The lens reaches the edge of a phone and stops short of the edge of a
      // wide screen: it is never wider than four and a half cells, so on a
      // spread the bulge is about nine hundred pixels across and the field
      // runs on small past it, which is a lens on a field and not a field
      // that is all lens.
      const Rx = Math.min(w / 2 + S * 0.5, S * 4.4)
      const Ry = Math.min(h / 2 + S * 0.2, S * 4.4)
      const L = m.lens
      const wide = S >= 100
      const zoomIn = wide ? ZOOM.wide : ZOOM.in
      const pow = wide ? ZOOM.widePow : ZOOM.pow
      const I0 = Math.floor((-pad - m.o.x) / S - 0.5)
      const I1 = Math.ceil((w + pad - m.o.x) / S)
      const J0 = Math.floor((-pad - m.o.y) / rowH)
      const J1 = Math.ceil((h + pad - m.o.y) / rowH)
      used.fill(0)
      let changed = null
      let best = null
      let curNd = 2
      const f = m.focus
      for (let J = J0; J <= J1; J++) {
        for (let I = I0; I <= I1; I++) {
          const s = mod(J, My) * Mx + mod(I, Mx)
          if (used[s]) continue
          used[s] = 1
          const slot = slots[s]
          const wx = worldX(I, J, S) + m.o.x
          const wy = J * rowH + m.o.y
          const dx = wx - cx
          const dy = wy - cy
          const nd = Math.sqrt((dx * dx) / (Rx * Rx) + (dy * dy) / (Ry * Ry))
          const q = 1 - (nd > 1 ? 1 : nd)
          const zoomL = ZOOM.out + (zoomIn - ZOOM.out) * Math.pow(q, pow)
          const zoom = ZOOM.flat + (zoomL - ZOOM.flat) * L
          const g = 1 + BULGE * q * q * L
          const px = cx + dx * g
          const py = cy + dy * g
          const k = tileAt(I, J)
          if (slot.I !== I || slot.J !== J || slot.k !== k) {
            slot.I = I; slot.J = J; slot.k = k
            // the opening's ripple: each disc arrives by its distance from
            // the lens, so the field fills from the middle outward
            slot.delay = Math.round(600 + Math.min(1.2, nd) * 560)
            ;(changed || (changed = [])).push(s)
          }
          if (!slot.shown) { slot.shown = true; if (slot.el) slot.el.style.visibility = '' }
          const isFocus = f && f.I === I && f.J === J
          if (isFocus) curNd = nd
          if (slot.disc) {
            const d = DISC[names[k].weight || 0]
            slot.disc.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${zoom.toFixed(3)})`
            if (slot.tag) {
              // The two beside the person in the lens carry their handles
              // ABOVE the disc: below, they ran into the caption. Everything
              // else carries it below, where a name goes.
              const above = f && !isFocus && J === f.J && Math.abs(I - f.I) === 1
              slot.tag.style.transform = above
                ? `translate3d(${px.toFixed(1)}px, ${(py - d * zoom / 2 - 5).toFixed(1)}px, 0) translate(-50%, -100%)`
                : `translate3d(${px.toFixed(1)}px, ${(py + d * zoom / 2 + 5).toFixed(1)}px, 0) translateX(-50%)`
              const lab = isFocus ? L : clamp01((zoom - 0.74) / 0.26) * L
              if (Math.abs(lab - slot.lab) > 0.015) { slot.lab = lab; slot.tag.style.opacity = lab.toFixed(2) }
            }
          }
          if (!best || nd < best.nd) best = { I, J, nd }
        }
      }
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s]
        if (!used[s] && slot.shown) { slot.shown = false; if (slot.el) slot.el.style.visibility = 'hidden' }
      }

      // ── the lens's person ──
      // The nearest disc, with a little hysteresis so two at the same distance
      // do not hand the caption back and forth.
      if (best && (!f || curNd > 1.5 || best.nd < curNd - 0.05)) {
        if (!f || f.I !== best.I || f.J !== best.J) {
          m.focus = best
          setFocusKey(`${best.I},${best.J}`)
        } else {
          m.focus = best
        }
      } else if (f) {
        f.nd = curNd
      }

      if (changed) {
        setAssign((prev) => {
          const next = prev.slice()
          for (const s of changed) {
            const slot = slots[s]
            next[s] = { I: slot.I, J: slot.J, k: slot.k, key: `${slot.I},${slot.J}`, delay: slot.delay }
          }
          return next
        })
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf) }
  }, [paused, grid, names, tileAt, worldX, settle, tourStep])

  // ── the pull ──
  // Listeners go on the window rather than through pointer capture. Capture
  // would redirect the click to the element that captured it, and every disc
  // in here is a button whose whole job is to be tapped.
  const onDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const m = motion.current
    if (!m.ready) return
    m.phase = 'drag'
    m.drag = { x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now(), vx: 0, vy: 0 }
    m.moved = 0
    m.wheelAt = 0
    if (stage.current) stage.current.classList.add('is-held')

    const move = (ev) => {
      const d = m.drag
      if (!d) return
      const dx = ev.clientX - d.x
      const dy = ev.clientY - d.y
      const t = ev.timeStamp || performance.now()
      const dt = Math.max(1, t - d.t)
      m.moved += Math.abs(dx) + Math.abs(dy)
      m.o.x += dx
      m.o.y += dy
      // a smoothed velocity, so the throw is the shape of the whole gesture
      d.vx = d.vx * 0.7 + (dx / dt) * 1000 * 0.3
      d.vy = d.vy * 0.7 + (dy / dt) * 1000 * 0.3
      d.x = ev.clientX; d.y = ev.clientY; d.t = t
    }
    const up = () => {
      const d = m.drag
      m.drag = null
      if (stage.current) stage.current.classList.remove('is-held')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const now = performance.now()
      const speed = d ? Math.hypot(d.vx, d.vy) : 0
      if (!m.reduce && d && speed > STOP * 2) {
        const cap = 2600
        m.v = { x: Math.max(-cap, Math.min(cap, d.vx)), y: Math.max(-cap, Math.min(cap, d.vy)) }
        m.phase = 'fling'
      } else {
        settle(m, now)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [settle])

  // A wheel or a trackpad pans the field, in both axes, the way a map pans.
  // Once the wheel rests the field settles on the nearest person. Attached
  // again when the names arrive, because the empty wall is a different element.
  const has = names.length > 0
  useEffect(() => {
    const el = stage.current
    if (!el || !has) return undefined
    const onWheel = (e) => {
      const m = motion.current
      if (m.veiled || !m.ready) return
      e.preventDefault()
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.current.h : 1
      m.o.x -= e.deltaX * k
      m.o.y -= e.deltaY * k
      m.phase = 'rest'
      m.wheelAt = performance.now()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [has])

  // A name under the pointer holds the field still, so it can be pressed.
  const onHover = useCallback((on, e) => {
    if (e && e.pointerType && e.pointerType !== 'mouse') return
    motion.current.hover = on
  }, [])

  // A keyboard walking the names brings each into the lens as it lands.
  const onFocusIn = useCallback((e) => {
    const m = motion.current
    const btn = e.target.closest ? e.target.closest('.wl-cell') : null
    if (!btn) return
    m.kbd = true
    let visible
    try { visible = btn.matches(':focus-visible') } catch { visible = false }
    if (!visible) return
    const s = Number(btn.dataset.slot)
    const slot = m.slots[s]
    if (!slot || Number.isNaN(slot.I)) return
    if (m.focus && m.focus.I === slot.I && m.focus.J === slot.J) return
    glideTo(m, slot.I, slot.J, GLIDE, performance.now())
  }, [glideTo])
  const onFocusOut = useCallback((e) => {
    const m = motion.current
    if (e.relatedTarget && stage.current && stage.current.contains(e.relatedTarget)) return
    m.kbd = false
  }, [])

  const open = useCallback((handle) => {
    if (motion.current.moved > SLOP) return
    if (onOpen) onOpen(handle)
  }, [onOpen])

  // Nothing to draw: the line the caller gives, which is empty while the
  // index is still loading or did not load, since either of those said so
  // already in the count's place and neither is an empty wall.
  if (!names.length) {
    return (
      <div className="wl-hive is-empty" ref={stage}>
        {none ? <Label tone="dim" className="wl-hive-none">{none}</Label> : null}
      </div>
    )
  }

  return (
    <div
      className={`wl-hive${veiled ? ' is-veiled' : ''}`}
      ref={stage}
      onPointerDown={veiled ? undefined : onDown}
      onFocusCapture={onFocusIn}
      onBlurCapture={onFocusOut}
      inert={veiled || undefined}
      role="group"
      aria-label="the names on the wall, drag to move through them"
    >
      {assign.map((a, s) => {
        // a slot can be a frame behind the names it draws from, so the name
        // is looked up rather than trusted
        const t = a ? names[a.k] || null : null
        return (
          <Cell
            key={s}
            s={s}
            tile={t}
            focus={!!t && a.key === focusKey}
            cap={!veiled}
            mine={!!t && wrote.has(t.handle)}
            delay={opening && t ? a.delay : 0}
            bind={bind}
            onOpen={open}
            onHover={onHover}
          />
        )
      })}
    </div>
  )
}

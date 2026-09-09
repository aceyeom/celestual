// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE: the names on the wall, as a field seen through a lens         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall's index is a list of people, and this is how the wall shows it:
// one disc per person, the face the resolver has or a monogram until then,
// packed on a hexagonal lattice that never ends in any direction. The whole
// field is seen through a lens: the discs nearest the middle of the screen
// are full size and nearly touching, and they shrink toward the edges until
// at the rim they are points. Nothing is written on the field but one name:
// the person in the lens carries a small tag with their handle, and so does
// a disc under the pointer. Everything else about a person is behind the tap.
//
// ── what a disc carries, and why only that ──────────────────────────────────
// The face, and on the one in the lens the handle. Not the name, which the
// resolver knows for a few people and not for most; not the count, which is
// the disc's own size; not the time since the last letter. A field with a
// caption under every third face is a directory, and the wall is a place
// where people are, not a list about them. The handle is the wall's own
// identifier: letters are addressed to it and a person finds their own by it.
//
// ── it moves by itself, and it is a thing you can pull ──────────────────────
// One slow drift, always, whose heading wanders so the field never runs one
// way for long. A pull takes the field with the finger in any direction, a
// throw coasts on friction and eases back into the drift rather than stopping,
// and a wheel or a trackpad pans it. Under a mouse the drift slows over the
// field and rests over a disc, so a name can be pressed; a keyboard walking
// the names brings each into the lens as it lands on it. A press that
// travelled swallows the tap it would have ended in, because every disc is a
// target and nothing is worse than a surface that opens a letter because you
// tried to look past it. Nothing here steps, settles or snaps: the lens is a
// continuous function of where a disc is, so as the field moves every disc
// grows and shrinks smoothly through it.
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
// scales and the tags' opacities are written straight to the elements from
// one requestAnimationFrame; React is told only when a slot changes hands or
// the lens moves to another person. The disc is scaled and the tag under it
// is not, so the type stays sharp whatever the lens is doing to the picture.
//
// Under `prefers-reduced-motion` nothing drifts and nothing coasts: the field
// is still, the lens still applies, and a pull moves it and leaves it.

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Face, Label } from './parts.jsx'
import { atHandle } from './data.js'

// ── the numbers ─────────────────────────────────────────────────────────────
// At most this many names in the field. Past it the rest are a search away,
// and a torus of three hundred already repeats only at the far side of a wall
// nobody scrolls to.
const CAP = 240
// The disc, as a fraction of the pitch, by weight (data.js `wall`: how many
// letters the name carries). Nine tenths at the heaviest, so a full size disc
// nearly touches its neighbours and the centre of the field is a cluster.
const DISC = [0.84, 0.88, 0.92]
// The row pitch as a fraction of the column pitch: a true hexagonal packing.
const ROW = 0.866
// The lens. `top` is the disc dead centre, `plateau` how far out (of the
// window's half size) the discs stay full, `out` the rim, `pow` how fast the
// fall is between them, and `flat` is every disc while the veil is down and
// the lens is off.
const ZOOM = { top: 1.06, plateau: 0.28, out: 0.26, pow: 1.5, flat: 0.9 }
// The drift: its speed, and how fast its heading wanders (radians a second,
// so a full turn takes a couple of minutes).
const DRIFT = 9
const TURN = 0.05
// How much of a velocity survives each 60Hz frame as it relaxes toward the
// drift. 0.94 coasts about a second and a half, which is long enough to feel
// like weight and short enough that the field is visibly its own again before
// anybody wonders.
const RELAX = 0.94
const FLING = 2400
const SLOP = 6

const mod = (v, m) => ((v % m) + m) % m
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

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

// One slot. A button, because every name is a target; the disc and the tag
// are its two children and each is placed by the loop, the disc scaled and
// the tag not. Memoised so a slot re-renders only when its name changes or
// the lens arrives on it or leaves it.
const Cell = memo(function Cell({ s, tile, d, focus, mine, delay, bind, onOpen, onHover }) {
  if (!tile) return <button type="button" className="wl-cell" ref={(el) => bind(s, el)} tabIndex={-1} aria-hidden="true" />
  return (
    <button
      type="button"
      className={`wl-cell${focus ? ' is-focus' : ''}${mine ? ' is-mine' : ''}`}
      style={{ '--d': `${d}px`, '--in': `${delay}ms` }}
      data-slot={s}
      ref={(el) => bind(s, el)}
      onClick={() => onOpen(tile.handle)}
      onPointerEnter={(e) => onHover(s, e)}
      onPointerLeave={(e) => onHover(-1, e)}
      aria-label={`${atHandle(tile.handle)}, ${tile.count === 1 ? 'one letter' : `${tile.count} letters`}`}
      draggable={false}
    >
      <span className="wl-cell-disc" aria-hidden="true">
        <Face handle={tile.handle} size={d} lit={mine} />
      </span>
      <span className="wl-cell-tag" aria-hidden="true">{atHandle(tile.handle)}</span>
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
    S: 70, rowH: 70 * ROW,    // the lattice pitch, set from the window's width
    lens: 0,                  // 0 flat under the veil, 1 the full lens
    v: { x: 0, y: 0 },        // the field's velocity, px/s
    heading: 0.6,             // where the drift is going
    drag: null, moved: 0,
    over: false, on: -1, kbd: false,
    goal: null,               // where a keyboard asked the field to go
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
  const discOf = useCallback((k, S) => Math.round(S * DISC[names[k]?.weight || 0]), [names])

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
      const S = w >= 900 ? 96 : 70
      const rowH = S * ROW
      const pad = S * 0.6
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
        const f = m.focus
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
  }, [lay, worldX])

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

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const m = motion.current
      const { w, h } = size.current
      if (!w || !h || !m.ready) return
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      const sec = dt / 1000

      // the lens comes up over about a second as the veil lifts
      const want = m.veiled ? 0 : 1
      if (m.reduce) m.lens = want
      else {
        m.lens += (want - m.lens) * (1 - Math.exp(-dt / 300))
        if (Math.abs(want - m.lens) < 0.002) m.lens = want
      }

      // ── the motion ──
      // Not while a finger is on it. Otherwise the velocity relaxes toward the
      // drift, which is slow, wanders, and rests under a mouse; a throw is the
      // same velocity started high, so it coasts and eases back into the drift
      // rather than stopping. A keyboard's goal overrides all of it.
      if (!m.drag) {
        if (m.goal) {
          const k = 1 - Math.exp(-dt / 170)
          m.o.x += (m.goal.x - m.o.x) * k
          m.o.y += (m.goal.y - m.o.y) * k
          m.v.x = 0; m.v.y = 0
          if (Math.abs(m.goal.x - m.o.x) < 0.4 && Math.abs(m.goal.y - m.o.y) < 0.4) { m.o = { ...m.goal }; m.goal = null }
        } else if (m.reduce) {
          m.v.x = 0; m.v.y = 0
        } else {
          const hold = m.kbd || m.on >= 0 ? 0 : m.over ? 0.25 : 1
          if (hold === 1) m.heading += TURN * sec
          const ax = Math.cos(m.heading) * DRIFT * hold
          const ay = Math.sin(m.heading) * DRIFT * hold
          const k = 1 - Math.pow(RELAX, dt / 16.667)
          m.v.x += (ax - m.v.x) * k
          m.v.y += (ay - m.v.y) * k
          m.o.x += m.v.x * sec
          m.o.y += m.v.y * sec
        }
      }

      // ── the draw ──
      const { S, rowH, Mx, My, slots, used } = m
      const pad = S * 0.6
      const cx = m.c.x, cy = m.c.y
      // The lens reaches the edge of the window, and no further: the rim of
      // the screen is the rim of the lens on a phone and on a spread alike.
      const Rx = w / 2 + S * 0.3
      const Ry = h / 2 + S * 0.3
      const L = m.lens
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
          const px = worldX(I, J, S) + m.o.x
          const py = J * rowH + m.o.y
          const dx = px - cx
          const dy = py - cy
          const nd = Math.sqrt((dx * dx) / (Rx * Rx) + (dy * dy) / (Ry * Ry))
          // full inside the plateau, then a smooth fall to the rim, and a
          // hair over full dead centre so the lens has a point
          const t = clamp01((nd - ZOOM.plateau) / (1 - ZOOM.plateau))
          const q = 1 - clamp01(nd / ZOOM.plateau)
          const zoomL = ZOOM.out + (1 - ZOOM.out) * Math.pow(1 - t, ZOOM.pow) + (ZOOM.top - 1) * q * q
          const zoom = ZOOM.flat + (zoomL - ZOOM.flat) * L
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
            const d = discOf(k, S)
            slot.disc.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${zoom.toFixed(3)})`
            if (slot.tag) {
              // on the disc's own lower edge, like a badge, and not across
              // the row below it
              slot.tag.style.transform = `translate3d(${px.toFixed(1)}px, ${(py + d * zoom / 2 - 9).toFixed(1)}px, 0) translateX(-50%)`
              // the tag shows on the person in the lens and on a disc under
              // the pointer, and nowhere else
              const lab = (isFocus && L > 0.5) || m.on === s ? 1 : 0
              if (lab !== slot.lab) { slot.lab = lab; slot.tag.style.opacity = String(lab) }
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
      // do not hand the tag back and forth.
      if (best && (!f || curNd > 1.5 || best.nd < curNd - 0.06)) {
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
  }, [paused, grid, names, tileAt, worldX, discOf])

  // ── the pull ──
  // Listeners go on the window rather than through pointer capture. Capture
  // would redirect the click to the element that captured it, and every disc
  // in here is a button whose whole job is to be tapped.
  const onDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const m = motion.current
    if (!m.ready) return
    m.drag = { x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now(), vx: 0, vy: 0 }
    m.moved = 0
    m.goal = null
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
      if (m.reduce || !d) { m.v = { x: 0, y: 0 }; return }
      // the throw: the gesture's own velocity, and the loop eases it back
      // into the drift
      m.v = { x: Math.max(-FLING, Math.min(FLING, d.vx)), y: Math.max(-FLING, Math.min(FLING, d.vy)) }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])

  // A wheel or a trackpad pans the field, in both axes, the way a map pans.
  // Attached again when the names arrive, because the empty wall is a
  // different element.
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
      m.goal = null
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [has])

  // Under a mouse the field slows, and over a disc it rests, so a name can
  // be pressed. A finger gets neither: it has the pull.
  const onHover = useCallback((s, e) => {
    if (e && e.pointerType && e.pointerType !== 'mouse') return
    motion.current.on = s
  }, [])
  const onOver = useCallback((on) => (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    motion.current.over = on
    if (!on) motion.current.on = -1
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
    m.goal = { x: m.c.x - worldX(slot.I, slot.J, m.S), y: m.c.y - slot.J * m.rowH }
    if (m.reduce) { m.o = { ...m.goal }; m.goal = null }
  }, [worldX])
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
  // already in the ear and neither is an empty wall.
  if (!names.length) {
    return (
      <div className="wl-hive is-empty" ref={stage}>
        {none ? <Label tone="dim" className="wl-hive-none">{none}</Label> : null}
      </div>
    )
  }

  const S = motion.current.S
  return (
    <div
      className={`wl-hive${veiled ? ' is-veiled' : ''}`}
      ref={stage}
      onPointerDown={veiled ? undefined : onDown}
      onPointerEnter={onOver(true)}
      onPointerLeave={onOver(false)}
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
            d={t ? Math.round(S * DISC[t.weight || 0]) : 0}
            focus={!!t && a.key === focusKey}
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

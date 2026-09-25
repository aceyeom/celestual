// ── the colour panel ────────────────────────────────────────────────────────
//
// Under the composer's screen while its `colour` key is on, and beside it
// on a spread (screens/Write.jsx): the one thing a writer chooses about how
// their letter looks, which is the colour it is lit in. The screen is the
// preview, and it is the real screen (screen.jsx `Screen`), so what is
// picked here is on the letter before the finger has lifted.
//
// It was a rail of three (texture, color, type) over a gallery of
// forty-two papers, twenty-nine grounds and twenty-four faces, and then
// eighteen colours in three short groups, lit, printed and copied. The
// groups are gone. How a colour is drawn is the colour's own business
// (looks.js): a person choosing one is choosing a colour, and a heading
// that sorted them by how they are made was a word about the machinery
// between a person and the thing they came to pick. So this is one pool of
// twelve, in the order of a spectrum (looks.js `COLOURS`), each drawn as
// the small screen it makes, its own light on it where it is a print, and
// the chosen one named under the lot. Two even rows of six on every width, and nothing
// scrolls sideways.
//
// Nothing here takes a colour a person typed, a picture or a word
// (docs/WALL-FEATURES.md, G3, G4 and G7): every choice is one every writer
// can make, which is what keeps a colour a mask rather than a signature.
//
// It is one radio group to a screen reader and to a keyboard: the arrows
// walk the pool in its order, home and end go to its two ends, and the tab
// key leaves it. `reveal` brings the panel into view when it was opened by
// the key, since under a tall screen it opens below the fold.

import { useCallback, useEffect, useRef } from 'react'
import { COLOURS, colourOf } from './looks.js'
import { Mini } from './screen.jsx'

export function LookPanel({ look, onChange, seed = '', reveal = false }) {
  const cur = colourOf(look, seed)
  const box = useRef(null)
  useEffect(() => {
    if (!reveal || !box.current) return undefined
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = requestAnimationFrame(() => box.current && box.current.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' }))
    return () => cancelAnimationFrame(id)
  }, [reveal])
  const pick = (c) => onChange({ tint: c.slug })
  const keys = (e) => {
    const i = COLOURS.findIndex((c) => c.slug === cur.slug)
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    const to = e.key === 'Home' ? 0
      : e.key === 'End' ? COLOURS.length - 1
      : step ? (i + step + COLOURS.length) % COLOURS.length
      : -1
    if (to < 0) return
    e.preventDefault()
    const next = COLOURS[to]
    pick(next)
    const el = box.current && box.current.querySelector(`[data-value="${next.slug}"]`)
    if (el) el.focus()
  }
  return (
    <div className="wl-look" ref={box}>
      <div className="wl-look-opts" role="radiogroup" aria-label="the colour it is lit in" onKeyDown={keys}>
        {COLOURS.map((c) => {
          const on = c.slug === cur.slug
          return (
            <button
              key={c.slug} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
              className={`wl-look-opt${on ? ' is-on' : ''}`} data-value={c.slug}
              onClick={() => pick(c)} aria-label={c.name} title={c.name}
            >
              <Mini colour={c} />
            </button>
          )
        })}
      </div>
      <p className="wl-look-now" aria-live="polite">{cur.name}</p>
    </div>
  )
}

// ── and the screen itself, swiped ───────────────────────────────────────────
// On a phone the composer's screen is also the way through the pool: a
// finger swiped left across it lights the next colour, and right the one
// before, the way the arrows walk it, with the panel shut or open. The
// screen follows the finger a little and comes home as the colour changes.
// A finger only: a mouse dragged over the words is selecting them. The axis
// is decided on the first few pixels and a vertical drag is left to the
// sheet, so the words can still be scrolled and a tap still puts the caret
// down.
const SWIPE_SLOP = 10
const SWIPE_STEP = 48
const SWIPE_FLICK = 0.35 // px per ms

export function stepLook(look, seed, dir) {
  const i = COLOURS.findIndex((c) => c.slug === colourOf(look, seed).slug)
  return { tint: COLOURS[(i + dir + COLOURS.length) % COLOURS.length].slug }
}

export function useColourSwipe(look, seed, onChange) {
  const box = useRef(null)
  const drag = useRef(null)
  const swiped = useRef(false)
  const now = useRef({ look, seed, onChange })
  now.current = { look, seed, onChange }
  const put = (x) => { if (box.current) box.current.style.setProperty('--swipe', `${x}px`) }
  const end = () => {
    drag.current = null
    if (box.current) delete box.current.dataset.swiping
    put(0)
  }
  // iOS takes a sideways drag it has not been told is ours as the start of
  // a scroll and cancels the pointer; once the drag is sideways, it is ours
  const onTouch = useRef((e) => { if (drag.current && drag.current.axis === 'x' && e.cancelable) e.preventDefault() })
  const ref = useCallback((el) => {
    if (box.current) box.current.removeEventListener('touchmove', onTouch.current)
    box.current = el
    if (el) el.addEventListener('touchmove', onTouch.current, { passive: false })
  }, [])
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || drag.current) return
    swiped.current = false
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, axis: '', t: e.timeStamp, x: e.clientX }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const mx = e.clientX - d.sx
    if (!d.axis) {
      const my = e.clientY - d.sy
      if (Math.abs(mx) < SWIPE_SLOP && Math.abs(my) < SWIPE_SLOP) return
      d.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (d.axis === 'y') { drag.current = null; return }
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a pointer the browser is not tracking */ }
      if (box.current) box.current.dataset.swiping = ''
    }
    // the speed at the moment of letting go, from the last stretch of it
    if (e.timeStamp - d.t > 80) { d.t = e.timeStamp; d.x = e.clientX }
    d.v = (e.clientX - d.x) / Math.max(1, e.timeStamp - d.t)
    put(mx * 0.35)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const mx = e.clientX - d.sx
    const x = d.axis === 'x'
    end()
    if (!x) return
    swiped.current = true
    const thrown = Math.abs(d.v || 0) > SWIPE_FLICK && Math.sign(d.v) === Math.sign(mx) && Math.abs(mx) > SWIPE_SLOP * 2
    if (Math.abs(mx) > SWIPE_STEP || thrown) {
      const { look: l, seed: s, onChange: go } = now.current
      go(stepLook(l, s, mx < 0 ? 1 : -1))
    }
  }
  const onPointerCancel = (e) => {
    const d = drag.current
    if (d && e.pointerId === d.id) end()
  }
  // Safari tells the element the finger landed on that it lost the pointer
  // when the card takes it, and that bubbles here: only the card's own
  // counts
  const onLostPointerCapture = (e) => { if (e.target === e.currentTarget) onPointerCancel(e) }
  // and the click a swipe ends in presses nothing
  const onClickCapture = (e) => {
    if (!swiped.current) return
    swiped.current = false
    e.preventDefault()
    e.stopPropagation()
  }
  return { ref, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onClickCapture }
}

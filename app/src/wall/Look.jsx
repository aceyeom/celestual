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
// thirteen, in the order of a spectrum (looks.js `COLOURS`), each drawn as
// the small screen it makes, its own light on it where it is a print, and
// the chosen one named under the lot. Two rows on every width, and nothing
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

import { useEffect, useRef } from 'react'
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

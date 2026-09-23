// ── the colour panel ────────────────────────────────────────────────────────
//
// Under the composer's screen while its `colour` key is on (screens/
// Write.jsx): the one thing a writer chooses about how their letter looks,
// which is the colour it is lit in. The screen above is the preview, and it
// is the real screen (screen.jsx `Screen`), so what is picked here is on the
// letter before the finger has lifted.
//
// It was a rail of three — texture, color, type — over a gallery of
// forty-two papers, twenty-nine grounds and twenty-four faces. The papers,
// the grounds and the faces went with the screens (looks.js): one face, one
// layout, and a colour that carries its own treatment with it. So this is
// one list, in three short groups, each colour drawn as the small screen it
// makes:
//
//   lit       the backlit screens, and the negative
//   printed   the posters and the risos, in their own inks
//   copied    the xerox, blown out
//
// Nothing here takes a colour a person typed, a picture or a word
// (docs/WALL-FEATURES.md, G3, G4 and G7): every choice is one every writer
// can make, which is what keeps a colour a mask rather than a signature.
//
// It is one radio group to a screen reader and to a keyboard: the arrows
// walk the whole list, across the groups, and the tab key leaves it.

import { useRef } from 'react'
import { COLOURS, GROUPS, colourOf } from './looks.js'
import { Mini } from './screen.jsx'

export function LookPanel({ look, onChange, seed = '' }) {
  const cur = colourOf(look, seed)
  const box = useRef(null)
  const pick = (c) => onChange({ tint: c.slug })
  const keys = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = COLOURS.findIndex((c) => c.slug === cur.slug)
    const next = COLOURS[(i + step + COLOURS.length) % COLOURS.length]
    pick(next)
    const el = box.current && box.current.querySelector(`[data-value="${next.slug}"]`)
    if (el) el.focus()
  }
  return (
    <div className="wl-look" ref={box}>
      <div className="wl-look-groups" role="radiogroup" aria-label="the colour it is lit in" onKeyDown={keys}>
        {GROUPS.map((g) => (
          <div className="wl-look-group" key={g.key}>
            <span className="wl-look-h" aria-hidden="true">{g.label}</span>
            <div className="wl-look-opts">
              {COLOURS.filter((c) => g.kinds.includes(c.kind)).map((c) => {
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
          </div>
        ))}
      </div>
      <p className="wl-look-now" aria-live="polite">{cur.name}</p>
    </div>
  )
}

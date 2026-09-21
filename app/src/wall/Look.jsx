// ── the look panel ──────────────────────────────────────────────────────────
//
// Under the composer's card while its pen is on (screens/Write.jsx): the
// paper of the letter, chosen. ONE rail and ONE grid, and the card above
// them is the preview, since the card is the real card (parts.jsx `Paper`)
// and a look is its tokens moved: whatever is picked here is on the letter
// before the finger has lifted, and what goes up is what was seen.
//
//   texture   five papers, whole, each in its own tokens with the two
//             letters in its face (looks.js THEMES). The big choice.
//             Picking one resets the other two to what it brought
//   color     the paper's own ground, and eleven grounds (TINTS)
//   type      six faces, each with its own name set in itself (FACES)
//
// ── why it is one row and not three ─────────────────────────────────────────
// It was three rows stacked under the card, each scrolling sideways, each
// with a label over it and a name under every tile: three scrollbars, two
// dozen captions in nine-pixel mono, and half the options past the right
// edge of the sheet at any moment. Everything was on the screen and nothing
// could be read — which is the failure mode of a generated panel, where
// every choice is given equal weight and equal room and the person is left
// to sort it out.
//
// A person choosing a paper for forty words is doing ONE of three things at
// a time. So the panel asks which, on a rail (the composer's own switch,
// parts.jsx `Segmented`, in tab clothes), and then gives that one thing the
// whole width: a grid that fits without scrolling, tiles big enough to be
// looked at, and one line under it naming what is chosen. Nothing is hidden
// that is not one tap away, nothing scrolls sideways, and the panel's height
// hardly moves between the three, so switching does not shove the card.
//
// The words on the rail are what a writer is choosing — texture, color,
// type — not what the row stores. The schema's three keys are `theme`,
// `tint` and `face` and they do not move (looks.js).
//
// Nothing here takes a colour a person typed, a picture or a word
// (docs/WALL-FEATURES.md, G3, G4 and G7): every choice is one every writer
// can make, which is what keeps a look a mask rather than a signature.
//
// The keyboard: the rail's arrows move between the three, the grid's arrows
// move within one, and the tab key walks rail, then grid, the way a set of
// tabs over a panel is walked anywhere else.

import { useCallback, useId, useState } from 'react'
import { THEMES, TINTS, FACES, themeOf, tokensOf, lookAttrs, normaliseLook } from './looks.js'

// The three, in the order they are asked: the paper first because it brings
// the other two with it, then the two dials on it.
const AXES = [
  { key: 'texture', label: 'texture' },
  { key: 'color', label: 'color' },
  { key: 'type', label: 'type' },
]

// the keyboard, along a line of choices: the arrows move the choice and take
// the focus with it, in either axis, since a grid is walked both ways
function arrows(e, values, current, pick) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  e.preventDefault()
  const at = Math.max(0, values.indexOf(current))
  const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
  const next = values[(at + dir + values.length) % values.length]
  pick(next)
  const el = e.currentTarget.querySelector(`[data-value="${next}"]`)
  if (el) el.focus()
}

// ── the rail ────────────────────────────────────────────────────────────────
// Which of the three is being chosen. It wears the switch's clothes
// (wall.css `.wl-seg`, the sliding thumb and all), because on the step
// before this one the same object asks who the letter is for, and a product
// with two rails that look different has two rails to learn. It is a tablist
// rather than a radio group: what it switches is the panel under it, not a
// value on the letter.
function Rail({ at, onGo, ids }) {
  const keys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = AXES.findIndex((a) => a.key === at)
    const next = AXES[(i + (e.key === 'ArrowRight' ? 1 : -1) + AXES.length) % AXES.length]
    onGo(next.key)
    const el = e.currentTarget.querySelector(`[data-value="${next.key}"]`)
    if (el) el.focus()
  }
  const i = Math.max(0, AXES.findIndex((a) => a.key === at))
  return (
    <div
      className="wl-seg wl-look-rail" role="tablist" aria-label="what to change about the paper"
      style={{ '--n': AXES.length, '--i': i }} onKeyDown={keys}
    >
      <span className="wl-seg-thumb" aria-hidden="true" />
      {AXES.map((a) => (
        <button
          type="button" role="tab" key={a.key} data-value={a.key} id={ids.tab(a.key)}
          className="wl-seg-opt" aria-selected={a.key === at} aria-controls={ids.panel}
          tabIndex={a.key === at ? 0 : -1}
          onClick={() => onGo(a.key)}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

// One choice in a grid. The name is not drawn under it: twenty-two captions
// in nine-pixel mono were most of the old panel's ink, and the one worth
// reading — what is chosen right now — is on the line under the grid.
// It is still said, to a pointer and to a screen reader.
function Option({ value, on, name, pick, children }) {
  return (
    <button
      type="button" role="radio" aria-checked={on} data-value={value}
      className="wl-look-opt" tabIndex={on ? 0 : -1}
      aria-label={name} title={name}
      onClick={() => pick(value)}
    >
      {children}
    </button>
  )
}

// a small paper: the look's tokens on a tile, with the two letters and a
// few lines, drawn by the same rules as the card it stands for
function Tile({ look }) {
  return (
    <span className="wl-look-tile wl-looked" style={tokensOf(look)} {...lookAttrs(look)} aria-hidden="true">
      <span className="wl-look-tile-in">
        <span className="wl-look-aa">Aa</span>
        <span className="wl-look-bar" style={{ width: '92%' }} />
        <span className="wl-look-bar" style={{ width: '64%' }} />
        <span className="wl-look-bar" style={{ width: '78%' }} />
      </span>
    </span>
  )
}

export function LookPanel({ look, onChange }) {
  const [axis, setAxis] = useState('texture')
  const uid = useId()
  const ids = { tab: (k) => `${uid}-${k}`, panel: `${uid}-panel` }

  const theme = themeOf(look)
  const tint = look?.tint || ''
  const face = look?.face || theme.face
  const set = useCallback((next) => onChange(normaliseLook(next)), [onChange])

  const pickTheme = useCallback((slug) => set({ theme: slug }), [set])
  const pickTint = useCallback((slug) => set({ ...(look || {}), theme: theme.slug, tint: slug || undefined }), [set, look, theme])
  const pickFace = useCallback((slug) => set({ ...(look || {}), theme: theme.slug, face: slug }), [set, look, theme])

  // what the line under the grid says: the choice on the axis being shown,
  // in its own word, and "as is" for a colour left as the paper brought it
  const now = axis === 'texture' ? theme.name : axis === 'color' ? (tint || 'as is') : face

  return (
    <div className="wl-look" role="group" aria-label="the look of the letter">
      <Rail at={axis} onGo={setAxis} ids={ids} />

      <div className="wl-look-body" role="tabpanel" id={ids.panel} aria-labelledby={ids.tab(axis)}>
        {axis === 'texture' && (
          <div
            className="wl-look-grid is-texture" role="radiogroup" aria-label="texture"
            onKeyDown={(e) => arrows(e, THEMES.map((t) => t.slug), theme.slug, pickTheme)}
          >
            {THEMES.map((t) => (
              <Option key={t.slug} value={t.slug} on={t.slug === theme.slug} name={t.name} pick={pickTheme}>
                <Tile look={{ theme: t.slug }} />
              </Option>
            ))}
          </div>
        )}

        {axis === 'color' && (
          <div
            className="wl-look-grid is-color" role="radiogroup" aria-label="color"
            onKeyDown={(e) => arrows(e, ['', ...TINTS.map((t) => t.slug)], tint, pickTint)}
          >
            {/* the paper's own colour first, which for a look with a gradient
                is the gradient, and is the one a chosen colour is put back to */}
            <Option value="" on={!tint} name="as is" pick={pickTint}>
              <span className="wl-look-dot" style={tokensOf({ theme: theme.slug })} aria-hidden="true" />
            </Option>
            {TINTS.map((t) => (
              <Option key={t.slug} value={t.slug} on={t.slug === tint} name={t.slug} pick={pickTint}>
                <span className="wl-look-dot" style={tokensOf({ theme: theme.slug, tint: t.slug })} aria-hidden="true" />
              </Option>
            ))}
          </div>
        )}

        {axis === 'type' && (
          <div
            className="wl-look-grid is-type" role="radiogroup" aria-label="type"
            onKeyDown={(e) => arrows(e, FACES.map((f) => f.slug), face, pickFace)}
          >
            {FACES.map((f) => (
              <Option key={f.slug} value={f.slug} on={f.slug === face} name={f.name} pick={pickFace}>
                {/* the face's own name, set in the face, at the size the
                    letter would set it: the type menu's oldest idiom, and
                    the one that needs no caption under it */}
                <span
                  className="wl-look-chip" aria-hidden="true"
                  style={{ '--chip-face': f.family, '--chip-w': f.weight, '--chip-size': f.size }}
                >
                  {f.name}
                </span>
              </Option>
            ))}
          </div>
        )}
      </div>

      {/* the one caption: what is chosen on the axis being shown. It stands
          where a row's label used to, under the grid rather than over it,
          because it is an answer and not a heading. */}
      <p className="wl-look-now" aria-live="polite">{now}</p>
    </div>
  )
}

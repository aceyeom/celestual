// ── the look panel ──────────────────────────────────────────────────────────
//
// Under the composer's card while its pen is on (screens/Write.jsx): the
// paper of the letter, chosen. Three rows and the card above them is the
// preview, since the card is the real card (parts.jsx `Paper`) and a look is
// its tokens moved: whatever is picked here is on the letter before the
// finger has lifted, and what goes up is what was seen.
//
//   paper    the gallery: nine whole looks, each a small paper in its own
//            tokens with the two letters in its face and a few lines of type
//            (looks.js THEMES). The big choice. Picking one resets the two
//            rows under it to what the look brought.
//   colour   twelve grounds, and the paper's own first (TINTS)
//   type     six faces, in themselves (FACES)
//
// The shape is the lock screen's: a gallery of finished looks, then two
// dials that tune the one chosen. Three rows is as many as a person
// choosing a paper for forty words wants to see, and nine by twelve by six
// is more letters than the wall will carry this year. Nothing here takes a
// colour a person typed, a picture or a word (docs/WALL-FEATURES.md, G3,
// G4 and G7): every choice is one every writer can make.
//
// Each row is a radio group. The arrow keys move within one, and the row
// scrolls to keep the chosen tile on the glass when the panel opens.

import { useEffect, useRef } from 'react'
import { Label } from './parts.jsx'
import { THEMES, TINTS, FACES, themeOf, tokensOf, lookAttrs, normaliseLook } from './looks.js'

// the keyboard, in a row: the arrows move the choice and the focus with it
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

// a row of choices that scrolls sideways, and brings the chosen one onto
// the glass when it is first drawn
function Row({ label, values, current, pick, children }) {
  const el = useRef(null)
  useEffect(() => {
    const row = el.current
    if (!row) return
    const on = row.querySelector('[aria-checked="true"]')
    if (on && on.scrollIntoView) {
      try { on.scrollIntoView({ block: 'nearest', inline: 'center' }) } catch { /* an old browser */ }
    }
  }, [])
  return (
    <div className="wl-look-row">
      <Label tone="dim" as="span" className="wl-look-lab" id={`wl-look-${label}`}>{label}</Label>
      <div
        className="wl-look-scroll" role="radiogroup" aria-labelledby={`wl-look-${label}`} ref={el}
        onKeyDown={(e) => arrows(e, values, current, pick)}
      >
        {children}
      </div>
    </div>
  )
}

function Option({ value, on, name, pick, children }) {
  return (
    <button
      type="button" role="radio" aria-checked={on} data-value={value}
      className="wl-look-opt" tabIndex={on ? 0 : -1}
      onClick={() => pick(value)}
    >
      {children}
      <span className="wl-look-opt-name">{name}</span>
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
  const theme = themeOf(look)
  const tint = look?.tint || ''
  const face = look?.face || theme.face
  const set = (next) => onChange(normaliseLook(next))

  const pickTheme = (slug) => set({ theme: slug })
  const pickTint = (slug) => set({ ...(look || {}), theme: theme.slug, tint: slug || undefined })
  const pickFace = (slug) => set({ ...(look || {}), theme: theme.slug, face: slug })

  return (
    <div className="wl-look" role="group" aria-label="the look of the letter">
      <Row label="paper" values={THEMES.map((t) => t.slug)} current={theme.slug} pick={pickTheme}>
        {THEMES.map((t) => (
          <Option key={t.slug} value={t.slug} on={t.slug === theme.slug} name={t.name} pick={pickTheme}>
            <Tile look={{ theme: t.slug }} />
          </Option>
        ))}
      </Row>

      <Row label="colour" values={['', ...TINTS.map((t) => t.slug)]} current={tint} pick={pickTint}>
        {/* the paper's own colour first, which for a look with a gradient is
            the gradient, and is the one a chosen colour is put back to */}
        <Option value="" on={!tint} name="as is" pick={pickTint}>
          <span className="wl-look-dot" style={tokensOf({ theme: theme.slug })} aria-hidden="true" />
        </Option>
        {TINTS.map((t) => (
          <Option key={t.slug} value={t.slug} on={t.slug === tint} name={t.slug} pick={pickTint}>
            <span className="wl-look-dot" style={tokensOf({ theme: theme.slug, tint: t.slug })} aria-hidden="true" />
          </Option>
        ))}
      </Row>

      <Row label="type" values={FACES.map((f) => f.slug)} current={face} pick={pickFace}>
        {FACES.map((f) => (
          <Option key={f.slug} value={f.slug} on={f.slug === face} name={f.name} pick={pickFace}>
            <span className="wl-look-chip" style={{ '--chip-face': f.family }} aria-hidden="true">
              <span className="wl-look-chip-aa">Aa</span>
            </span>
          </Option>
        ))}
      </Row>
    </div>
  )
}

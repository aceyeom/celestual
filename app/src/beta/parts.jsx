// The parts every screen is built from. Small, unstyled-by-props, and all of
// the styling in beta.css — so a change to how a link behaves is one edit in
// one place rather than ten inline objects that have drifted apart.

import { useEffect, useMemo, useRef, useState } from 'react'
import { atHandle } from './handles.js'

// ── navigation is typeset, not chromed ──────────────────────────────────────
// An arrow and a word, from the concert poster. The arrow is its own span so it
// can move 4px on hover without dragging the label with it, and it sits at
// --ash-dim so the WORD is what you read and the arrow is what you follow.
export function ArrowLink({ children, onClick, href, tone = '', disabled = false, glyph = '→', className = '' }) {
  const cls = ['beta-link', tone && `is-${tone}`, className].filter(Boolean).join(' ')
  const body = <><span className="beta-arrow" aria-hidden="true">{glyph}</span><span>{children}</span></>
  if (href && !disabled) return <a className={cls} href={href} onClick={onClick}>{body}</a>
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined}>
      {body}
    </button>
  )
}

export function Eyebrow({ children, style }) {
  return <div className="beta-eyebrow" style={style}>{children}</div>
}

// `as` exists because several screens set two things in display type and only
// one of them is the heading — "You were both looking." is a caption on a pair
// of cards, not a second <h1> on a screen that already has one.
export function Display({ children, size = 44, vulnerable = false, style, className = '', as: Tag = 'h1' }) {
  const cls = ['beta-display', size === 38 && 'is-38', size === 34 && 'is-34', vulnerable && 'is-vulnerable', className]
    .filter(Boolean).join(' ')
  return <Tag className={cls} style={style}>{children}</Tag>
}

export function Help({ children, small = false, dim = false, style }) {
  const cls = ['beta-help', small && 'is-13', dim && 'is-dim'].filter(Boolean).join(' ')
  return <p className={cls} style={style}>{children}</p>
}

// ── the bare baseline ───────────────────────────────────────────────────────
// The '@' is painted, not typed: it is a sibling of the input, it is never in
// the value, and a person cannot backspace it away. Handles are stored without
// one and displayed with one, and this is where that stops being a convention
// and starts being enforced.
export function HandleField({ value, onChange, onSubmit, autoFocus = false, locked = false, placeholder = '', id, label = 'Instagram handle' }) {
  const ref = useRef(null)
  useEffect(() => {
    // Autofocus on a pointer device only. On a phone, focusing on mount throws
    // the keyboard up over the sky before anybody has seen it — and the sky is
    // the thing that makes the next thirty seconds work.
    if (!autoFocus) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine && ref.current) ref.current.focus()
  }, [autoFocus])

  return (
    <div className={`beta-field${locked ? ' is-locked' : ''}`}>
      <span className="beta-at" aria-hidden="true">@</span>
      <input
        ref={ref}
        id={id}
        aria-label={label}
        type="text"
        value={value}
        readOnly={locked}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
        enterKeyHint="go"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
      />
    </div>
  )
}

// ── paper ───────────────────────────────────────────────────────────────────
// The only bright surface in the product, and on the screens where it appears
// it is the only bright object anywhere. The seal is rendered from a DECOY of
// matching length — the real string is not in this DOM and was never sent to
// this browser. A blur that can be lifted in devtools is not a seal.
function decoy(len) {
  const n = Math.max(12, Math.min(90, len || 40))
  let out = ''
  for (let i = 0; i < n; i++) out += i % 11 === 10 ? ' ' : '▓'
  return out
}

export function Paper({ letter, entering = false, seal = null, sealLifting = false, compact = false }) {
  if (!letter) return null
  return (
    <article className={`beta-paper${entering ? ' is-entering' : ''}`}>
      <div className="beta-for">for {atHandle(letter.targetHandle)}</div>
      <div className="beta-paper-rule" />
      <p>{letter.body}</p>
      {letter.hasSeal && (
        <div style={{ marginTop: compact ? 14 : 20 }}>
          {seal ? (
            <div className={`beta-seal${sealLifting ? ' is-lifting' : ''}`} style={{ filter: 'none' }}>{seal}</div>
          ) : (
            <div className="beta-seal" aria-hidden="true">{decoy(48)}</div>
          )}
          <div className="beta-sealed-label">{seal ? 'unsealed' : 'sealed'}</div>
        </div>
      )}
    </article>
  )
}

// ── ornament ────────────────────────────────────────────────────────────────
// Inline SVG, currentColor, used sparingly. Three shapes in the whole build and
// each has a rule attached to it, because an ornament with no rule becomes a
// sprinkle and a sprinkle is the fastest way to look machine-made.

// ── the four-point star is not here ─────────────────────────────────────────
// §4.7 of the brief permits it, max one per screen, as a section mark. It was
// built, it was placed beside "WHEN IT IS MUTUAL" on /beta/app, and it came
// back out — because the eyebrow beside it was already marking the section, in
// type, and an ornament that repeats what the typography just said is the
// definition of the sprinkle the same rule forbids. The two ornaments left each
// carry something nothing else on their screen carries: the halftone sphere is
// the only object with mass on the Threshold, and the orbit rings are the
// dissolve's one-time claim that the field has a centre and you are in it.
//
// Once in the entire flow, on /beta/sky, around the user's own point.
export function Orbits({ size = 240 }) {
  return (
    <svg className="beta-ornament beta-orbits" width={size} height={size} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <circle cx="120" cy="120" r="46"  stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
      <circle cx="120" cy="120" r="80"  stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <circle cx="120" cy="120" r="114" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
      <circle cx="166" cy="120" r="1.8" fill="currentColor" opacity="0.8" />
      <circle cx="120" cy="40"  r="1.4" fill="currentColor" opacity="0.6" />
      <circle cx="34"  cy="132" r="1.2" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

// Once, on the Threshold, small, low-right, at 25%.
export function Halftone({ size = 108, style }) {
  const dots = useMemo(() => {
    const out = []
    const step = 7
    for (let y = step / 2; y < 100; y += step) {
      for (let x = step / 2; x < 100; x += step) {
        const dx = x - 34, dy = y - 32
        const d = Math.sqrt(dx * dx + dy * dy) / 78
        const r = Math.max(0, 2.6 * (1 - d))
        // Outside the circle there is nothing. A halftone gradient that keeps
        // going is a texture; one that stops at an edge is a sphere.
        const inside = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2) < 48
        if (r > 0.16 && inside) out.push({ x, y, r })
      }
    }
    return out
  }, [])
  return (
    <svg className="beta-halftone" width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden="true">
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--chalk)" />)}
    </svg>
  )
}

// ── the bloom ───────────────────────────────────────────────────────────────
// The entire accent system. At most one per screen, behind the object that
// matters most on that screen. Never a hue.
export function Bloom({ opacity = 0.14, size = 260, breathing = false, style }) {
  return (
    <div
      className={`beta-bloom${breathing ? ' is-breathing' : ''}`}
      style={{ '--bloom-o': opacity, width: size, height: size, margin: `${-size / 2}px 0 0 ${-size / 2}px`, ...style }}
      aria-hidden="true"
    />
  )
}

// ── the wait ────────────────────────────────────────────────────────────────
// LOOKING → LOOKING. → LOOKING.. at 400ms. Not a spinner: a spinner says the
// machine is busy, and this says somebody is looking through something for you.
export function Looking({ word = 'LOOKING' }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 3), 400)
    return () => clearInterval(t)
  }, [])
  return <div className="beta-looking" role="status">{word}{'.'.repeat(n)}</div>
}

// A full-bleed rule. Full-bleed or not at all — the only partial rule in the
// system is the active-nav underline, and this build has no nav.
export function Rule({ style }) { return <hr className="beta-rule" style={style} /> }

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PARTS                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every screen is assembled out of these, and all of the styling is in
// wall.css. Props here select a role, never a value — there is no `color`
// prop and no `size` in pixels — so changing what a ghost pill looks like is
// one edit in one file rather than nine inline objects that drifted apart.

import { useEffect, useId, useRef, useState } from 'react'
import { atHandle } from './data.js'
import { Ecliptic, Mark, Sparkle } from './art.jsx'
import { member } from './auth.js'

// ── type ────────────────────────────────────────────────────────────────────

// The Didone. Four sizes, and the terminal period is set by the caller because
// it is punctuation and not a decoration — the poster's title has one and its
// nav does not, and that distinction is the difference between a statement and
// a label.
export function Display({ children, size = 'xl', as: Tag = 'h1', className = '', style, id }) {
  return <Tag id={id} className={`wl-display is-${size} ${className}`} style={style}>{children}</Tag>
}

// The tiny letterspaced monospace the poster runs under its title and in its
// corners. Every count, date, handle and source code in the build is set in
// this face, because those are all IDENTIFIERS and monospace is how a person
// reads one.
export function Label({ children, tone = '', className = '', style, as: Tag = 'div' }) {
  return <Tag className={`wl-label${tone ? ` is-${tone}` : ''} ${className}`} style={style}>{children}</Tag>
}

// The letter itself, and the only place the old-style serif is used. Its job
// is to be read at length on a cream ground, which is the one thing the Didone
// is bad at.
export function Prose({ children, className = '', style }) {
  return <p className={`wl-prose ${className}`} style={style}>{children}</p>
}

// ── the redaction ───────────────────────────────────────────────────────────
// What a letter looks like to somebody who is not from Berkeley: the real
// letter, its real length, its real line breaks, with every word struck out.
//
// It is built out of the actual words rather than out of lorem or a grey block,
// so the shape on the paper is the shape of the thing behind it — a long letter
// looks long, a two-line one looks short, and nobody is being shown a fake
// paragraph. Nothing readable is in the DOM: the bars carry a length and no
// text, so the letter is not sitting in the page waiting to be read out of it.
export function Redacted({ text }) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  return (
    <p className="wl-redacted" role="img" aria-label={`a letter of ${words.length} words, redacted`}>
      {words.map((w, i) => (
        <span key={i} className="wl-redact-w" style={{ '--n': Math.min(14, w.length) }} />
      ))}
    </p>
  )
}

export function Rule({ tone = '', className = '', style }) {
  return <div className={`wl-rule${tone ? ` is-${tone}` : ''} ${className}`} style={style} role="presentation" />
}

// ── navigation is typeset, not chromed ──────────────────────────────────────
// An arrow and a word, off the poster's nav. The arrow is its own span so it
// can travel on hover without dragging the word with it, and it sits dimmer
// than the label so the WORD is what you read and the arrow is what you follow.
export function ArrowLink({ children, onClick, href, tone = '', size = '', disabled = false, className = '', ...rest }) {
  const cls = ['wl-arrow', tone && `is-${tone}`, size && `is-${size}`, className].filter(Boolean).join(' ')
  const body = <><span className="wl-arrow-g" aria-hidden="true">→</span><span className="wl-arrow-t">{children}</span></>
  if (href && !disabled) return <a className={cls} href={href} onClick={onClick} {...rest}>{body}</a>
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>{body}</button>
  )
}

// ── the pill ────────────────────────────────────────────────────────────────
// Three roles and no fourth. `light` is the reference's white capsule and is
// the primary action on any screen that has one; `ghost` is the outlined
// capsule beside a list row; `ember` is the one saturated object in the entire
// build and appears at most once on a screen, on the thing that is true NOW.
export function Pill({ children, onClick, tone = 'ghost', wide = false, disabled = false, icon = null, className = '', ...rest }) {
  const cls = ['wl-pill', `is-${tone}`, wide && 'is-wide', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  )
}

// A pill that is not a control. Row actions look like capsules and are not
// clickable in their own right — the whole row is the target — and a <button>
// inside a <button> is invalid HTML that React will refuse to hydrate. So the
// affordance is a span carrying the same classes, and the row keeps the click.
export function PillTag({ children, tone = 'ghost', icon = null, className = '' }) {
  return (
    <span className={`wl-pill is-${tone} is-tag ${className}`} aria-hidden="true">
      {icon}
      <span>{children}</span>
    </span>
  )
}

// ── the icons ───────────────────────────────────────────────────────────────
// Drawn here, on one 24-unit grid, at one stroke weight, and every one of them
// says what it goes to rather than what it is:
//
//   wall   four lines of unequal length — the inscription itself, seen small
//   find   a glass
//   write  a nib
//   join   two figures and the arc between them, which is the mark the core
//          service's own diagram is built out of
//
// Seven glyphs is the whole set, which is well under the point where an icon
// library would save anybody anything — and none of these exist in one.
const PATHS = {
  wall:  'M4 7h9M16 7h4M4 12h5M12 12h8M4 17h11M18 17h2',
  find:  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16.2 16.2 21 21',
  write: 'M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6zM14.4 7.2l2.4 2.4',
  join:  'M3.4 14.5a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0M16.4 14.5a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0M6.6 12.7Q12 5.2 17.4 12.7',
  close: 'M6 6l12 12M18 6L6 18',
  key:   'M12 4.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M10.7 11.2 9.9 19.6h4.2l-.8-8.4',
  back:  'M14 5l-7 7 7 7',
  down:  'M5 10l7 7 7-7',
  play:  'M9 6.5v11l9-5.5z',
}

// ── the close mark ──────────────────────────────────────────────────────────
// Its own drawing on its own grid, not the 24-unit set above, because it is
// the one glyph that appears on every sheet and it is the only thing standing
// where a line of text used to. Two strokes through a hairline ring, finer
// than the nav icons so it reads as a dismissal rather than as a fourth
// destination, and it turns a quarter under the pointer.
//
// It replaced "back to the wall" set as a link. A sheet that closes is not a
// place you navigate to, and typesetting the exit as a sentence made it the
// loudest thing on three screens.
export function Close({ onClick, label = 'close', className = '' }) {
  return (
    <button
      type="button" className={`wl-close ${className}`}
      onClick={onClick} aria-label={label} title={label}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"
        fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <path d="M5.1 5.1 14.9 14.9M14.9 5.1 5.1 14.9" />
      </svg>
    </button>
  )
}

export function Icon({ name, size = 20, className = '' }) {
  const solid = name === 'play'
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'} stroke={solid ? 'none' : 'currentColor'}
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}

// Every icon carries a label. It is never drawn — on a pointer device it
// arrives as a tooltip after a beat, and a screen reader reads it always — so
// the bar is legible without a word on it and still navigable without sight.
export function IconButton({ name, label, onClick, tone = '', on = false, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`wl-iconbtn${tone ? ` is-${tone}` : ''}${on ? ' is-on' : ''} ${className}`}
      onClick={onClick} aria-label={label} title={label}
      aria-current={on ? 'page' : undefined}
      {...rest}
    >
      <Icon name={name} />
    </button>
  )
}

// ── the bar ─────────────────────────────────────────────────────────────────
// The same three targets, in the same two places, on every screen of the wall:
// the mark goes home, and the two on the right are the only two things a
// person can do here. Nothing in it is a word, and nothing in it moves between
// screens — a nav that rearranges itself is a nav somebody has to re-read.
export function TopBar({ go, at = 'wall', onMark }) {
  const who = member()
  return (
    <header className="wl-top">
      <button
        type="button" className="wl-brand"
        onClick={onMark || (() => go('wall'))}
        aria-label={at === 'wall' ? 'celestual, back to the top' : 'back to the wall'}
        title={at === 'wall' ? 'the top' : 'the wall'}
      >
        {at !== 'wall' && <Icon name="back" size={17} />}
        <Ecliptic size={21} className="wl-brand-mark" />
      </button>
      <nav className="wl-top-acts" aria-label="the wall">
        <IconButton name="wall" label="the wall" on={at === 'wall'} onClick={() => go('wall')} />
        <IconButton name="find" label="look for a name" on={at === 'find'} onClick={() => go('find')} />
        <IconButton name="write" label="write a letter" on={at === 'write'} onClick={() => go('write')} />
        {/* The fourth target, and the only one that changes what it draws. A
            keyhole while the letters are shut, and once they are open, the
            constellation of the address that opened them — the same figure the
            wall draws beside a handle, so a person's own mark is the same
            object here as it is there. */}
        <button
          type="button"
          className={`wl-iconbtn wl-memberbtn${at === 'gate' ? ' is-on' : ''}`}
          onClick={() => go('gate')}
          aria-label={who ? `signed in as ${who}` : 'sign in to read the letters'}
          title={who ? who : 'sign in to read'}
          aria-current={at === 'gate' ? 'page' : undefined}
        >
          {who ? <Mark handle={who} size={22} lit /> : <Icon name="key" />}
        </button>
      </nav>
    </header>
  )
}

// ── the paper ───────────────────────────────────────────────────────────────
// The one bright surface in the product, and the reference's central object:
// a cream card with a generous radius, a dateline across the top under a
// hairline, and old-style serif beneath it.
//
// The grain on it is not the page's grain. Paper scatters light and a screen
// does not, so this one is warmer, coarser and about four times stronger than
// the grain on the void — without it the card is a beige rectangle, and with
// it the card is a material.
export function Paper({ dateline, title, children, foot, tone = '', className = '', style, ...rest }) {
  return (
    <article className={`wl-paper${tone ? ` is-${tone}` : ''} ${className}`} style={style} {...rest}>
      <div className="wl-paper-grain" aria-hidden="true" />
      {dateline && (
        <header className="wl-paper-head">
          <span>{dateline.date}</span>
          <span>{dateline.day}</span>
        </header>
      )}
      {title && <h2 className="wl-paper-title">{title}</h2>}
      <div className="wl-paper-body">{children}</div>
      {foot && <footer className="wl-paper-foot">{foot}</footer>}
    </article>
  )
}

// ── the bare baseline ───────────────────────────────────────────────────────
// The '@' is painted, not typed: it is a sibling of the input, never in the
// value, and cannot be backspaced away. Handles are stored bare and shown with
// one, and this is where that stops being a convention and starts being
// enforced.
export function HandleField({ value, onChange, onSubmit, autoFocus = false, locked = false,
  placeholder = '', label = 'Instagram handle', size = '', busy = false }) {
  const ref = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!autoFocus || !ref.current) return
    // On a phone, focusing on mount throws the keyboard up over the wall
    // before anybody has seen the wall — and the wall is the thing that makes
    // the next thirty seconds work. So: pointer devices only.
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) ref.current.focus()
  }, [autoFocus])

  return (
    <div className={`wl-field${size ? ` is-${size}` : ''}${locked ? ' is-locked' : ''}${busy ? ' is-busy' : ''}`}>
      <span className="wl-at" aria-hidden="true">@</span>
      <input
        ref={ref} id={id} aria-label={label} type="text" value={value}
        readOnly={locked} placeholder={placeholder}
        autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false"
        inputMode="text" enterKeyHint="go"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
      />
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

// The letter's own field. Counts down rather than up, because the limit is the
// point — forty words is what makes these readable, and a counter that only
// tells you when you have broken the rule has told you too late.
export function LetterField({ value, onChange, max = 260, placeholder = '', autoFocus = false, rows = 5 }) {
  const ref = useRef(null)
  const id = useId()
  const left = max - value.length

  useEffect(() => {
    if (!autoFocus || !ref.current) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) ref.current.focus()
  }, [autoFocus])

  // Grows with what is in it, to a ceiling. A letter box that scrolls
  // internally hides the end of your own sentence from you while you write it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(260, el.scrollHeight)}px`
  }, [value])

  return (
    <div className="wl-letterfield">
      <textarea
        ref={ref} id={id} rows={rows} value={value} placeholder={placeholder}
        aria-label="your letter" maxLength={max} spellCheck="true"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={`wl-count${left < 40 ? ' is-near' : ''}`} aria-hidden="true">{left}</div>
    </div>
  )
}

// ── the sheet ───────────────────────────────────────────────────────────────
// Everything that is not the wall arrives as one of these: it rises from the
// bottom edge over a dimmed wall, and the wall stays mounted and visible
// behind it. That is the difference between a surface with things on it and a
// stack of pages, and it is the whole reason the composer feels like part of
// the wall rather than a form the wall sent you to.
//
// Dismissal is by the grip, by the scrim, by Escape, and by dragging it down
// past a third of its height — four ways, because a sheet you cannot get out
// of is the fastest way to lose somebody at a demo table.
export function Sheet({ children, onClose, tall = false, labelledBy, className = '' }) {
  const [drag, setDrag] = useState(0)
  const [closing, setClosing] = useState(false)
  const start = useRef(null)
  const box = useRef(null)

  const dismiss = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 240)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    // The wall behind must not scroll while a sheet is up: on a phone the
    // touch would otherwise be taken by the wall the moment the sheet's own
    // content hits its end.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e) => { start.current = e.touches ? e.touches[0].clientY : e.clientY }
  const onMove = (e) => {
    if (start.current == null) return
    const y = e.touches ? e.touches[0].clientY : e.clientY
    setDrag(Math.max(0, y - start.current))
  }
  const onUp = () => {
    const h = box.current ? box.current.offsetHeight : 400
    if (drag > h / 3) dismiss()
    start.current = null
    setDrag(0)
  }

  return (
    <div className={`wl-sheet-wrap${closing ? ' is-closing' : ''} ${className}`}>
      <button type="button" className="wl-scrim" aria-label="close" onClick={dismiss} />
      <section
        ref={box}
        className={`wl-sheet${tall ? ' is-tall' : ''}${drag ? ' is-dragging' : ''}`}
        style={drag ? { transform: `translate3d(0, ${drag}px, 0)` } : undefined}
        role="dialog" aria-modal="true" aria-labelledby={labelledBy}
      >
        <div
          className="wl-grip" aria-hidden="true"
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        ><span /></div>
        {children}
      </section>
    </div>
  )
}

// ── the list row ────────────────────────────────────────────────────────────
// The reference's journey list, with the constellation standing where it puts
// a photograph. One row shape for the search results, the ledger and the
// wall's overflow, so those three read as the same object in three places.
export function Row({ mark, handle, meta, action, onClick, tone = '', lit = false }) {
  return (
    <button type="button" className={`wl-row${tone ? ` is-${tone}` : ''}${lit ? ' is-lit' : ''}`} onClick={onClick}>
      <span className="wl-row-mark">{mark}</span>
      <span className="wl-row-text">
        <span className="wl-row-handle">{atHandle(handle)}</span>
        {meta && <span className="wl-row-meta">{meta}</span>}
      </span>
      {action && <span className="wl-row-action">{action}</span>}
    </button>
  )
}

// ── the wait ────────────────────────────────────────────────────────────────
// Three sparkles breathing out of phase. Not a spinner: a spinner is a
// promise that something is being computed, and nothing here is being
// computed — the pause is the product deciding to give somebody a second
// before it answers a question they were nervous about asking.
export function Waiting({ label = 'looking' }) {
  return (
    <div className="wl-waiting" role="status" aria-live="polite">
      <Sparkle size={11} twinkle delay={0} />
      <Sparkle size={11} twinkle delay={240} />
      <Sparkle size={11} twinkle delay={480} />
      <span className="wl-sr">{label}</span>
    </div>
  )
}

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

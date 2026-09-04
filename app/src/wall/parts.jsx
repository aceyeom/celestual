// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PARTS                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every screen is assembled out of these, and all of the styling is in
// wall.css. Props here select a role, never a value — there is no `color`
// prop and no `size` in pixels — so changing what a ghost pill looks like is
// one edit in one file rather than nine inline objects that drifted apart.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { atHandle, normHandle } from './data.js'
import { Ecliptic, Provider, Sparkle } from './art.jsx'
import { member } from './auth.js'
import { copyText, openInstagram, igUsername, igWebLink } from './handoff.js'
import { resolveHandle, peekHandle, peekServer, resolveEnabled, monogram, IDLE, PEEK_DEBOUNCE_MS } from '../api/handles.js'

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
// ── the redaction ───────────────────────────────────────────────────────────
// A letter read from outside the campus gate never arrives with its words. The
// database withholds the body and sends two integers instead: how many words
// there are and how many characters. That is enough to draw a redaction at the
// right size, and it is the least that is: a fixed-size grey box pretending to
// be a letter tells somebody nothing about whether forty words were written or
// four.
//
// The individual word lengths are INVENTED, deterministically, from the
// letter's own id. So the shape is stable (the same letter redacts the same way
// on every device and every reload, which is what stops it reading as a loading
// state) and no word-level information leaves the server. The total is nudged
// toward the real character count so the block ends up the right size overall.
export function Redacted({ text, words = 0, chars = 0, seed = '' }) {
  // A body we actually hold, which happens only where the words are already on
  // screen. Kept because it is strictly more honest when it is available.
  if (text) {
    const w = String(text).trim().split(/\s+/).filter(Boolean)
    return (
      <p className="wl-redacted" role="img" aria-label={`a letter of ${w.length} words, redacted`}>
        {w.map((x, i) => <span key={i} className="wl-redact-w" style={{ '--n': Math.min(14, x.length) }} />)}
      </p>
    )
  }

  const n = Math.max(0, Math.min(120, words | 0))
  if (!n) return null
  // The average word, rounded, is what the invented lengths vary around.
  const mean = Math.max(2, Math.min(12, Math.round((chars || n * 5) / n)))
  const key = String(seed || '')
  const lens = []
  for (let i = 0; i < n; i++) {
    // A small stable hash per position. Not Math.random: a redaction that
    // reshuffles on every render is an animation nobody asked for.
    let h = 0x9e3779b9
    const s = `${key}#${i}`
    for (let j = 0; j < s.length; j++) h = Math.imul(h ^ s.charCodeAt(j), 0x27d4eb2d) >>> 0
    lens.push(Math.max(2, Math.min(14, mean - 2 + (h % 5))))
  }
  return (
    <p className="wl-redacted" role="img" aria-label={`a letter of ${n} words, redacted`}>
      {lens.map((x, i) => <span key={i} className="wl-redact-w" style={{ '--n': x }} />)}
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
// Two roles and no third. `light` is the reference's white capsule and is the
// primary action on any screen that has one; `ghost` is the outlined capsule
// beside a list row.
//
// There was a third, `ember`: a filled saturated capsule, described here as
// the one saturated object in the build. It had exactly one caller — "today",
// on the core service, beside a date that had just said so — and it spent the
// whole colour ration on the least load-bearing word on that screen. Both are
// gone. The accent still exists and is still rationed; it is now on the ping
// that is running out, which is the thing anybody actually has to act on.
//
// ── it takes an href, and it has to ─────────────────────────────────────────
// It used to render a <button> whatever it was given, and `...rest` spread an
// `href` onto it — which is not an error anywhere, in any browser or in any
// linter, and does nothing at all. Two of these were the ONLY way out of the
// DM code flow ("open instagram", on Main's proof step and on the wall's
// takedown), and both were dead capsules that answered a tap with nothing.
// ArrowLink two blocks up has always switched on href; this now does the same.
//
// ── lit ─────────────────────────────────────────────────────────────────────
// `lit` puts the running light on it (see `Light` below): the same point of
// light that runs the result card's frame, riding round the inside of the
// capsule as a soft rose bloom under the word. Never a halo round the outside;
// that read as a second object circling the button.
//
// It is on by default for the light capsule, which is the primary act on
// every screen that has one: the front door had it and the wall's sheets did
// not, and the same product answered a press with two different buttons. A
// ghost pill never carries it. Disabled, the light goes out and the plate
// stays, so a button that cannot be pressed is not one that is glowing.
export function Pill({ children, onClick, href, tone = 'ghost', wide = false, lit = tone === 'light', disabled = false, icon = null, className = '', ...rest }) {
  const cls = ['wl-pill', `is-${tone}`, wide && 'is-wide', lit && 'is-lit', className].filter(Boolean).join(' ')
  const body = <>{lit ? <Light plate="chalk" on={!disabled} /> : null}{icon}<span>{children}</span></>
  if (href && !disabled) return <a className={cls} href={href} onClick={onClick} {...rest}>{body}</a>
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>{body}</button>
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
//   flag   a marker left on a thing, not a verdict about it
//
// Nine glyphs is the whole set, which is well under the point where an icon
// library would save anybody anything — and none of these exist in one. It was
// ten: a solid play triangle sat inside the core service's row capsules, on a
// ledger where nothing plays. It went with the redesign and its fill branch
// went with it, so every glyph in the build is now one stroke weight.
const PATHS = {
  wall:  'M4 7h9M16 7h4M4 12h5M12 12h8M4 17h11M18 17h2',
  find:  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16.2 16.2 21 21',
  write: 'M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6zM14.4 7.2l2.4 2.4',
  join:  'M3.4 14.5a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0M16.4 14.5a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0M6.6 12.7Q12 5.2 17.4 12.7',
  close: 'M6 6l12 12M18 6L6 18',
  key:   'M12 4.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M10.7 11.2 9.9 19.6h4.2l-.8-8.4',
  back:  'M14 5l-7 7 7 7',
  down:  'M5 10l7 7 7-7',
  /* a flag on a staff — a mark left on a thing, which is what a report is:
     it does not judge the letter, it points at it */
  flag:  'M6 21V4M6 5h11l-2.4 3.9L17 12.8H6',
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
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
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

// ── the brand ───────────────────────────────────────────────────────────────
// The mark and the name, locked, and it is the way home on every bar in the
// product: the front door's, Main's flow screens', the wall's. It used to be
// three things: the word alone on the front door, the mark alone on Main's
// other screens, and the mark alone on the wall, which is how one product came
// to sign itself three ways. The mark is chalk at all times and the word is
// set in the display face at the size the lockup sets it (wall.css
// `.wl-brand`). `back` grows the chevron the wall's sheets use, so "back" and
// "home" stay the same target in the same place. A real anchor when it is
// given an href, so it opens in a new tab and copies like one.
export function Brand({ onClick, href, back = false, label = 'celestual, the front', title = 'the front', className = '' }) {
  const body = (
    <>
      {back ? <Icon name="back" size={17} /> : null}
      <Ecliptic size={26} className="wl-brand-mark" />
      <span className="wl-brand-word">celestual.</span>
    </>
  )
  const cls = `wl-brand ${className}`
  if (href) {
    return <a className={cls} href={href} onClick={onClick} aria-label={label} title={title}>{body}</a>
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={label} title={title}>{body}</button>
  )
}

// ── the bar ─────────────────────────────────────────────────────────────────
// The same targets, in the same two places, on every screen of the wall: the
// brand goes home, and the ones on the right are the only things a person can
// do here. The only word in it is the name, and nothing in it moves between
// screens: a nav that rearranges itself is a nav somebody has to re-read.
//
// ── the fourth glyph is gone ──
// There used to be a `wall` icon at the head of the row, lit whenever you were
// on the wall. On every other screen it was a way back; on the wall itself,
// which is where almost everybody sees it, it was a control that pointed at the
// page it was already on and did nothing when pressed. A lit target that
// answers a tap with nothing teaches somebody that this bar is decorative, and
// it teaches it on the first screen of the product. The way back to the wall is
// the mark, on the left, on every screen, which is where a person reaches for
// it anyway.
export function TopBar({ go, at = 'wall', onMark }) {
  const who = member()
  return (
    <header className="wl-top">
      <Brand
        back={at !== 'wall'}
        onClick={onMark || (() => go('wall'))}
        label={at === 'wall' ? 'celestual, back to the top' : 'back to the wall'}
        title={at === 'wall' ? 'the top' : 'the wall'}
      />
      <nav className="wl-top-acts" aria-label="the wall">
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
          {who ? <Face handle={who} size={22} resolve={false} /> : <Icon name="key" />}
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
// ── the title block ──
// `dateline` is two cells across the top rule and each caller decides what its
// two facts are (data.js `dateline` and `sinceline`). The right-hand one is
// either a plain `trail` — the other half of a date — or a `stamp`, which is
// the card's state and is set as a mark on the document rather than as type. `crest` is the letterhead
// — the constellation, standing beside the name the way a monogram stands at
// the head of a sheet of paper, which is where it belongs on a card ABOUT
// somebody. It used to sit in a row underneath the card with a timestamp and a
// button, where it was one of three unrelated objects competing at the same
// weight and read as none of them.
export function Paper({ dateline, title, crest, children, foot, tone = '', className = '', style, ...rest }) {
  return (
    <article className={`wl-paper${tone ? ` is-${tone}` : ''} ${className}`} style={style} {...rest}>
      <div className="wl-paper-grain" aria-hidden="true" />
      {dateline && (
        <header className="wl-paper-head">
          <span>{dateline.lead}</span>
          {dateline.stamp
            ? <span className="wl-paper-stamp">{dateline.stamp}</span>
            : dateline.trail ? <span>{dateline.trail}</span> : null}
        </header>
      )}
      {/* The letterhead stands whether or not the card is titled. On the core
          service every card is inside something that has already named the
          handle — the sill under the leaf, or the sheet's own head line — so
          the crest arrives WITHOUT a title and still belongs: the constellation
          is a picture of who, and the line above it is the word for who. */}
      {(title || crest) && (
        <div className={`wl-paper-crest${title ? '' : ' is-bare'}`}>
          {crest}
          {title && <h2 className="wl-paper-title">{title}</h2>}
        </div>
      )}
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

// ── the sheet's header ──────────────────────────────────────────────────────
//
// Every sheet in the build now opens on this row, and that is a layout decision
// rather than a tidy-up. Six sheets each owned a different top: one was a lone
// close mark on an empty line, one was a heading and a close mark fighting for
// the same baseline, one was step dots. Three different rhythms in a stack of
// screens somebody walks through in ninety seconds reads as three different
// products, and the lone close mark was the worst of them — an empty row with
// one heavy object floating at the end of it, which is the shape you get when
// nothing has been decided about what the top of a sheet is FOR.
//
// It is for two things: what this sheet is about, on the left, and the way out,
// on the right. `lead` carries the first — the mark when there is nothing to
// say, a pager when there is more than one letter, step dots in the composer —
// and it is always optically lighter than the close, because the way out is the
// only control in the row.
export function SheetHead({ lead = null, onClose, label = 'close' }) {
  return (
    <div className="wl-head">
      <div className="wl-head-lead">{lead || <Ecliptic size={20} className="wl-head-mark" />}</div>
      <Close onClick={onClose} label={label} />
    </div>
  )
}

// ── the sheet's foot ────────────────────────────────────────────────────────
// One primary, then whatever is quieter than it, in one column with one rhythm.
// The alternative — every sheet inventing its own arrangement of a pill and a
// sentence — is what put a 50px capsule and a 12px link at the same distance
// from the content on one screen and 40px apart on the next.
export function SheetFoot({ children, className = '' }) {
  return <div className={`wl-foot ${className}`}>{children}</div>
}

// ── the door, stated where it stands ────────────────────────────────────────
// Reading, writing and reporting are all behind the same berkeley.edu address
// (auth.js), and all three used to say so in their own words in their own
// place. This is the one wording, in the one shape, wherever somebody has
// walked into that door: the sentence that names what is shut, and the pill
// that opens it. Nothing else — no explanation of the policy, no second
// argument for it. A person who has just tapped a control they cannot use wants
// the key, not the reasoning.
export function Locked({ children, onOpen, cta = 'sign in with berkeley' }) {
  return (
    <div className="wl-locked">
      <Sparkle size={12} className="wl-locked-spark" />
      <p className="wl-locked-say">{children}</p>
      <Pill tone="light" wide icon={<Icon name="key" size={17} />} onClick={onOpen}>{cta}</Pill>
    </div>
  )
}

// ── the small box ───────────────────────────────────────────────────────────
// A short reason, on the screen that has already taken the letter down. It is
// small on purpose and it counts nothing: this box is not evidence and nobody
// is being asked to make a case. Two lines of room says "a sentence is enough",
// and a box the size of the composer would say the opposite.
export function ReasonField({ value, onChange, placeholder = '', max = 240, autoFocus = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!autoFocus || !ref.current) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) ref.current.focus()
  }, [autoFocus])
  return (
    <div className="wl-reason">
      <textarea
        ref={ref} rows={3} value={value} maxLength={max} placeholder={placeholder}
        aria-label="why" spellCheck="true"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

// ── the list row ────────────────────────────────────────────────────────────
// The reference's journey list, with the constellation standing where it puts
// a photograph. One row shape for the search results, the ledger and the
// wall's overflow, so those three read as the same object in three places.
//
// `onEnter`/`onLeave` are the ledger's tie to its own diagram: pointing at a
// row lights the ring that row is on, and focusing it with a keyboard does the
// same. It is opt-in, because on the search and on the wall's overflow there
// is nothing for a row to light.
export function Row({ mark, handle, meta, action, onClick, tone = '', lit = false, onEnter, onLeave }) {
  return (
    <button
      type="button" className={`wl-row${tone ? ` is-${tone}` : ''}${lit ? ' is-lit' : ''}`}
      onClick={onClick}
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      onFocus={onEnter} onBlur={onLeave}
    >
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

// ── THE DM CODE ─────────────────────────────────────────────────────────────
//
// The one screen in the product that asks somebody to leave it, and the only
// one whose success depends on what they do after they have gone. It is drawn
// once, here, because it was drawn twice — on Main's proof step and on the
// wall's takedown — and both copies had the same three faults:
//
//   THE BUTTON DID NOTHING.  `<Pill href=...>` rendered a <button> with an href
//                            attribute on it, which is inert. The only way out
//                            of the flow was the small web link underneath.
//   THE CODE STAYED BEHIND.  Nothing put it on the clipboard, so the way the
//                            flow actually ran was: read four digits, leave for
//                            another app, try to still have them. Instagram
//                            cannot be handed a prefilled message — there is no
//                            ?text= on ig.me and no scheme that carries one —
//                            so the clipboard IS the way the code travels, and
//                            every door out of here copies before it opens.
//   THE THREAD WAS A GUESS.  Both links pointed at the same URL for every
//                            device. handoff.openInstagram picks per device now:
//                            ig.me into the app on a phone, instagram.com/m/<us>
//                            on a desktop, which is the celestual thread and not
//                            Instagram's front page.
//
// The digits stay selectable (`user-select: all`) because a browser can refuse a
// programmatic copy and a person who cannot select the code is a person who
// cannot finish. `note` is whatever the calling screen has to say underneath.
export function DmCode({ code, note = null }) {
  const [copied, setCopied] = useState(false)
  const ig = igUsername()

  const copy = () => copyText(code).then((ok) => { setCopied(ok); return ok })

  // AWAITED, and on the phone that is the whole difference. `location.href` on
  // the mobile path leaves immediately, and a clipboard write started in the
  // same tick has not landed when the page goes: the person arrives in the DM
  // thread with an empty clipboard, which is the one thing this button exists
  // to prevent. The write is still started inside the click, so the gesture
  // that permits it is intact.
  const openIt = async () => { await copy(); openInstagram() }

  return (
    <div className="wl-dm">
      {/* Whatever the calling screen has to say about this code, said BEFORE
          it: which handle is being proved is the context for the digits, not a
          footnote to them. */}
      {note}

      <div className="wl-dm-code">
        <button
          type="button" className="wl-dm-digits" onClick={copy}
          aria-label={`your code is ${String(code).split('').join(' ')}, copy it`}
        >
          {code}
        </button>
        <Label tone="dim">send this to <span className="wl-h">{atHandle(ig)}</span> on instagram</Label>
      </div>

      <Pill tone="light" wide onClick={openIt} icon={<Provider size={17} />}>
        {copied ? `copied · open ${atHandle(ig)}` : `copy it and open ${atHandle(ig)}`}
      </Pill>

      <div className="wl-dm-foot">
        <Waiting label="watching for it" />
        <Label tone="dim" className="wl-dm-alt">
          {/* The same thread, as an ordinary link, for the tap that wants a new
              tab or a long press. It copies on the way out too. */}
          <a className="wl-a" href={igWebLink()} target="_blank" rel="noreferrer" onClick={copy}>
            or open the celestual thread on the web
          </a>
        </Label>
        <p className="wl-dm-said" role="status" aria-live="polite">
          {copied ? 'the code is on your clipboard. paste it into the DM' : 'paste it into the DM and come back'}
        </p>
      </div>
    </div>
  )
}

// ── WHO THAT IS ─────────────────────────────────────────────────────────────
//
// Four objects, and a person looks the same in all of them: the FACE, which is
// the account's own picture or a monogram; WHO, the face with the name and the
// handle beside it; the ROW that is a person; and the CARD under a field, which
// is the resolver's answer while somebody is still typing.
//
// The face replaced the constellation. design/DESIGN.md 3.4 put a star figure
// seeded from the handle wherever a photograph would be, because there was no
// photograph. There is one now (docs/HANDLE-RESOLVER.md), and a product that
// draws a person as a hash on one screen and as their own face on the next is
// two products. So: one disc, on the sky, on the wall, in the bar and on paper.

// The resolver's answer for one handle, as a hook. `null` until there is one,
// and null for good when the resolver is off or the account was not found: a
// caller draws the monogram in both cases and never waits on this.
//
// It PEEKS. A face is drawn for every handle on the sky, on the wall's index,
// on a letter, in the bar, and a lookup that reached Apify for each of those
// would be a run per row on every screen anybody opens. Every handle that was
// ever committed through a field is in the server's cache, so a peek finds
// it for free; a handle that never was draws its monogram, and that is a
// designed state.
export function useProfile(handle) {
  const h = normHandle(handle)
  const [p, setP] = useState(() => peekHandle(h))
  useEffect(() => {
    if (!resolveEnabled || h.length < 2) { setP(null); return undefined }
    const known = peekHandle(h)
    if (known) { setP(known); return undefined }
    let alive = true
    setP(null)
    peekServer(h).then((r) => { if (alive) setP(r) })
    return () => { alive = false }
  }, [h])
  return p && p.state === 'found' ? p : null
}

// ── THE RESOLVER, UNDER A FIELD ─────────────────────────────────────────────
// What a field knows about the handle in it, and the one way to ask for more.
//
//   at        the four-state answer (api/handles.js), plus 'looking' while a
//             lookup is out. Draw it with HandleCard.
//   ask()     commit: the lookup that may reach Apify. Called from Enter, the
//             button, or the card, and from nowhere that fires on its own.
//   settled   whether pressing the act should go through now. True when the
//             handle has been answered, or asked and could not be answered,
//             or the resolver is off. False means: ask first, and the card
//             will show the person to press.
//
// While somebody types, this only peeks the cache (free, and instant for a
// handle anybody has committed before). Nothing here runs the actor on a
// pause for breath, which is what `dav`, `davi` and `david_j` in the ledger
// were. See IT ASKS ON COMMIT in api/handles.js.
export function useResolver(handle) {
  const h = normHandle(handle)
  const [at, setAt] = useState(() => peekHandle(h) || { state: 'idle', handle: h })
  const cur = useRef(h)
  cur.current = h
  // The handle a commit has already been made for, answer or no answer. A
  // provider that could not tell us is not asked again on the next press:
  // "unknown" never blocks the act.
  const asked = useRef('')

  useEffect(() => {
    if (!resolveEnabled || h.length < 2) { setAt({ state: 'idle', handle: h }); return undefined }
    const known = peekHandle(h)
    if (known) { setAt(known); return undefined }
    setAt({ state: 'idle', handle: h })
    let alive = true
    const id = setTimeout(async () => {
      const r = await peekServer(h)
      if (alive && r) setAt(r)
    }, PEEK_DEBOUNCE_MS)
    return () => { alive = false; clearTimeout(id) }
  }, [h])

  const ask = useCallback(async () => {
    if (!resolveEnabled || h.length < 2) return { state: 'unknown', handle: h }
    const known = peekHandle(h)
    if (known) { setAt(known); return known }
    setAt({ state: 'looking', handle: h })
    const r = await resolveHandle(h)
    if (cur.current === h) {
      asked.current = h
      setAt(r)
    }
    return r
  }, [h])

  const settled = !resolveEnabled || h.length < 2
    || at.state === 'found' || at.state === 'missing' || asked.current === h
  return { at, ask, settled }
}

// ── the face ────────────────────────────────────────────────────────────────
// A disc, sized by `size`, carrying the picture when the resolver has one and
// a monogram until then and otherwise. The monogram is already in place under
// the picture, so a face that never arrives is a designed state and a face
// that fails to load is the same state. `resolve` off draws the monogram only,
// for the one identity in the product that is not an Instagram handle.
export function Face({ handle, size = 30, resolve = true, lit = false, className = '', style }) {
  const p = useProfile(resolve ? handle : '')
  const raw = String(handle || '').trim().replace(/^@+/, '')
  const mono = p ? monogram(p) : raw.slice(0, size >= 40 ? 2 : 1).toUpperCase()
  const [shown, setShown] = useState(false)
  const [broken, setBroken] = useState(false)
  const src = p?.avatar || ''
  useEffect(() => { setShown(false); setBroken(false) }, [src])
  return (
    <span
      className={`wl-face${lit ? ' is-lit' : ''}${shown ? ' has-img' : ''} ${className}`}
      style={{ '--s': `${size}px`, ...style }} aria-hidden="true"
    >
      <span className="wl-face-mono">{mono}</span>
      {src && !broken ? (
        <img
          src={src} alt="" loading="lazy" decoding="async"
          onLoad={() => setShown(true)} onError={() => setBroken(true)}
        />
      ) : null}
    </span>
  )
}

// The name beside the face, and the handle under it. When there is no name the
// handle stands as the name, in its own face, and the line under it carries
// whatever the caller had to say (`meta`). The badge is the product's own
// sparkle: redrawing somebody else's trust mark would be claiming it is ours.
export function Who({ handle, size = 40, meta = null, className = '' }) {
  const p = useProfile(handle)
  const name = p?.name || ''
  const under = [name ? atHandle(handle) : '', meta].filter(Boolean).join(' · ')
  return (
    <span className={`wl-who ${className}`}>
      <Face handle={handle} size={size} />
      <span className="wl-who-id">
        <span className={`wl-who-name${name ? '' : ' is-h'}`}>
          {name || atHandle(handle)}
          {p?.verified ? <Sparkle size={9} className="wl-who-badge" /> : null}
        </span>
        {under ? <span className="wl-who-at">{under}</span> : null}
      </span>
    </span>
  )
}

// A row that is a person: the face, the name, a line under it, and whatever
// stands at the end. The sky's standing pings and the wall's search results
// are both this, so a person looks the same in both.
export function PersonRow({ handle, meta, action, onClick, lit = false, size = 40, className = '' }) {
  return (
    <button
      type="button" className={`wl-row is-person${lit ? ' is-lit' : ''} ${className}`}
      onClick={onClick}
    >
      <Who handle={handle} size={size} meta={meta} className="wl-row-who" />
      {action ? <span className="wl-row-action">{action}</span> : null}
    </button>
  )
}

// ── you, in the bar ─────────────────────────────────────────────────────────
// One chip on every bar in Main: the face and the handle once one is proved,
// and the way in before that. The handle keeps its case, in the identifier
// face, at one size. It used to be three things: a ghost capsule on the front
// door, an uppercased label on the sky, and a constellation on the wall.
export function Me({ who, onClick, className = '' }) {
  const on = !!who?.handleVerified
  return (
    <button
      type="button" className={`wl-pill is-ghost wl-me${on ? ' is-on' : ''} ${className}`}
      onClick={onClick} aria-label={on ? `your sky, ${atHandle(who.handle)}` : 'sign in'}
    >
      {on ? <Face handle={who.handle} size={18} /> : null}
      <span className={on ? 'wl-me-h' : undefined}>{on ? atHandle(who.handle) : 'sign in'}</span>
    </button>
  )
}

// ── the running light ───────────────────────────────────────────────────────
// A point of light that runs round an element's own edge. It was drawn for
// the result card, where it runs while the resolver is out, and it is the
// same object on the two acts that matter most: the pill that places a ping
// and the row on the sky that says it is mutual.
//
// Drop it as the first child of anything that is `position: relative` and
// `isolation: isolate` (wall.css `.wl-light`), and it measures that element
// and runs its edge, corners and all. Two grounds:
//
//   star    a dark plate with a scatter of star shaped holes in it, under a
//           hairline. The light runs behind the plate and twinkles through
//           the holes as it passes. The card, and the mutual row.
//   chalk   an opaque chalk plate, which is the pill's own fill, with the
//           light riding over it and clipped to the capsule: a soft rose bloom
//           travelling round the inside of the button's edge, and nothing
//           outside it.
//
// `on` is whether it is running. Off, the light fades and holds still, and
// the plate stays: the plate is the element's ground in every state.
const HOLES = 'M56.1 3.96C56.4645 3.96 56.76 4.25519 56.76 4.62C56.76 4.98481 56.4645 5.28 56.1 5.28C55.9131 5.28 55.7443 5.20201 55.624 5.07762C55.5632 5.01446 55.5147 4.93904 55.4829 4.8559C55.4552 4.78243 55.44 4.70315 55.44 4.62C55.44 4.5549 55.4494 4.49174 55.4668 4.43244C55.4906 4.35188 55.5292 4.27775 55.5795 4.21329C55.7004 4.05926 55.8885 3.96 56.1 3.96ZM40.26 17.16C40.6245 17.16 40.92 17.4552 40.92 17.82C40.92 18.1848 40.6245 18.48 40.26 18.48C39.8955 18.48 39.6 18.1848 39.6 17.82C39.6 17.4552 39.8955 17.16 40.26 17.16ZM74.58 5.28C74.7701 5.28 74.9413 5.36057 75.0618 5.48882C75.073 5.50043 75.0837 5.51268 75.094 5.52557C75.1088 5.54426 75.1231 5.56359 75.1359 5.58357L75.1479 5.60291L75.1595 5.62353C75.1711 5.64481 75.1814 5.66672 75.1906 5.68928C75.2226 5.76662 75.24 5.85106 75.24 5.94C75.24 6.1585 75.1336 6.3525 74.9699 6.47238C74.9158 6.51234 74.8555 6.54393 74.7908 6.56584C74.7247 6.58775 74.6538 6.6 74.58 6.6C74.2156 6.6 73.92 6.30481 73.92 5.94C73.92 5.87684 73.929 5.8156 73.9455 5.7576C73.9596 5.70862 73.979 5.66221 74.0032 5.61903C74.0657 5.50688 74.1595 5.41471 74.2728 5.35541C74.3647 5.30707 74.4691 5.28 74.58 5.28ZM21.66 33.52C22.0245 33.52 22.32 33.8152 22.32 34.18C22.32 34.5448 22.0245 34.84 21.66 34.84C21.2955 34.84 21 34.5448 21 34.18C21 33.8152 21.2955 33.52 21.66 33.52ZM8.16 32.86C8.16 32.4952 7.8645 32.2 7.5 32.2C7.1355 32.2 6.84 32.4952 6.84 32.86C6.84 33.2248 7.1355 33.52 7.5 33.52C7.8645 33.52 8.16 33.2248 8.16 32.86ZM7.5 23.68C7.8645 23.68 8.16 23.9752 8.16 24.34C8.16 24.7048 7.8645 25 7.5 25C7.1355 25 6.84 24.7048 6.84 24.34C6.84 23.9752 7.1355 23.68 7.5 23.68ZM19.32 18.48C19.32 18.1152 19.0245 17.82 18.66 17.82C18.2955 17.82 18 18.1152 18 18.48C18 18.8448 18.2955 19.14 18.66 19.14C19.0245 19.14 19.32 18.8448 19.32 18.48ZM5.66 11.84C6.0245 11.84 6.32001 12.1352 6.32001 12.5C6.32001 12.8648 6.0245 13.16 5.66 13.16C5.2955 13.16 5 12.8648 5 12.5C5 12.1352 5.2955 11.84 5.66 11.84ZM35.16 35.5C35.16 35.1352 34.8645 34.84 34.5 34.84C34.1355 34.84 33.84 35.1352 33.84 35.5C33.84 35.8648 34.1355 36.16 34.5 36.16C34.8645 36.16 35.16 35.8648 35.16 35.5ZM53.5 36.18C53.8645 36.18 54.16 36.4752 54.16 36.84C54.16 37.2048 53.8645 37.5 53.5 37.5C53.1355 37.5 52.84 37.2048 52.84 36.84C52.84 36.4752 53.1355 36.18 53.5 36.18ZM48.5 28.66C48.5 28.2952 48.2045 28 47.84 28C47.4755 28 47.18 28.2952 47.18 28.66C47.18 29.0248 47.4755 29.32 47.84 29.32C48.2045 29.32 48.5 29.0248 48.5 28.66ZM60.34 27.34C60.7045 27.34 61 27.6352 61 28C61 28.3648 60.7045 28.66 60.34 28.66C59.9755 28.66 59.68 28.3648 59.68 28C59.68 27.6352 59.9755 27.34 60.34 27.34ZM56.284 16.5C56.284 16.1352 55.9885 15.84 55.624 15.84C55.2595 15.84 54.964 16.1352 54.964 16.5C54.964 16.8648 55.2595 17.16 55.624 17.16C55.9885 17.16 56.284 16.8648 56.284 16.5ZM46.2 7.26C46.2 6.89519 45.9045 6.6 45.54 6.6C45.5174 6.6 45.4953 6.60129 45.4733 6.60387L45.453 6.60579L45.4124 6.61225L45.3857 6.61804L45.3845 6.61836C45.3675 6.62277 45.3504 6.62721 45.3341 6.63287C45.2522 6.65929 45.1774 6.70184 45.1134 6.75597C45.0627 6.79916 45.0186 6.84943 44.9828 6.90551C44.9178 7.00799 44.88 7.12981 44.88 7.26C44.88 7.62481 45.1755 7.92 45.54 7.92C45.7372 7.92 45.9141 7.83363 46.0353 7.69635C46.0808 7.64478 46.1182 7.58613 46.1459 7.52232C46.1807 7.4424 46.2 7.35346 46.2 7.26ZM33 9.34C33 8.9752 32.7045 8.68 32.34 8.68C31.9755 8.68 31.68 8.9752 31.68 9.34C31.68 9.7048 31.9755 10 32.34 10C32.7045 10 33 9.7048 33 9.34ZM16 4.8559C16.3645 4.8559 16.66 5.1511 16.66 5.5159C16.66 5.8807 16.3645 6.1759 16 6.1759C15.6355 6.1759 15.34 5.8807 15.34 5.5159C15.34 5.1511 15.6355 4.8559 16 4.8559ZM69.66 21.16C69.66 20.7952 69.3645 20.5 69 20.5C68.6355 20.5 68.34 20.7952 68.34 21.16C68.34 21.5248 68.6355 21.82 69 21.82C69.3645 21.82 69.66 21.5248 69.66 21.16ZM80.52 15.18C80.52 14.8152 80.2245 14.52 79.86 14.52C79.4956 14.52 79.2 14.8152 79.2 15.18C79.2 15.5448 79.4956 15.84 79.86 15.84C80.2245 15.84 80.52 15.5448 80.52 15.18ZM78.16 34.84C78.16 34.4752 77.5 34.18 77.5 34.18C77.5 34.18 76.84 34.4752 76.84 34.84C76.84 35.2048 77.1355 35.5 77.5 35.5C77.8645 35.5 78.16 35.2048 78.16 34.84ZM85.66 24.34C86.0245 24.34 86.32 24.6352 86.32 25C86.32 25.3648 86.0245 25.66 85.66 25.66C85.2955 25.66 85 25.3648 85 25C85 24.6352 85.2955 24.34 85.66 24.34ZM91.32 10C91.32 9.6352 91.0245 9.34 90.66 9.34C90.2955 9.34 90 9.6352 90 10C90 10.3648 90.2955 10.66 90.66 10.66C91.0245 10.66 91.32 10.3648 91.32 10ZM138.6 0H0V46.2H138.6V0ZM92.64 34.84C92.64 34.4752 91.98 34.18 91.98 34.18C91.98 34.18 91.32 34.4752 91.32 34.84C91.32 35.2048 91.6155 35.5 91.98 35.5C92.3445 35.5 92.64 35.2048 92.64 34.84Z'

function StarPlate() {
  return (
    <span className="wl-plate is-star" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 40" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d={HOLES} fill="currentColor" />
      </svg>
    </span>
  )
}

// The route the light runs: the host's own edge, measured, and its own corner
// radius, so the frame that lights is the frame that is there and not a
// rectangle guessed at. A capsule's light goes round the capsule.
function edgePath(w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2))
  const f = (v) => Math.round(v * 100) / 100
  return `path('M ${f(k)} 0 H ${f(w - k)} A ${f(k)} ${f(k)} 0 0 1 ${f(w)} ${f(k)} V ${f(h - k)} `
    + `A ${f(k)} ${f(k)} 0 0 1 ${f(w - k)} ${f(h)} H ${f(k)} A ${f(k)} ${f(k)} 0 0 1 0 ${f(h - k)} `
    + `V ${f(k)} A ${f(k)} ${f(k)} 0 0 1 ${f(k)} 0 Z')`
}

export function Light({ on = true, plate = 'star', className = '' }) {
  const beam = useRef(null)
  useLayoutEffect(() => {
    const el = beam.current
    // The frame is the light's own box, which is inset to nothing inside the
    // host, so measuring it is measuring the host.
    const frame = el && el.parentElement
    if (!el || !frame) return undefined
    const set = () => {
      const r = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0
      el.style.setProperty('--path', edgePath(frame.offsetWidth, frame.offsetHeight, r))
    }
    set()
    const ro = window.ResizeObserver ? new ResizeObserver(set) : null
    if (ro) ro.observe(frame)
    return () => { if (ro) ro.disconnect() }
  }, [])
  return (
    <span className={`wl-light is-${plate}${on ? ' is-on' : ''} ${className}`} aria-hidden="true">
      <span className="wl-light-beam" ref={beam} />
      {plate === 'star' ? <StarPlate /> : <span className="wl-plate is-chalk" aria-hidden="true" />}
    </span>
  )
}

// ── THE RESULT CARD ─────────────────────────────────────────────────────────
//
// docs/rebuild-spec.md section 5 singles this out: "This card is the main
// affordance that makes the product read as professional, so it gets real
// design attention." It is the one place in the product where somebody else's
// account is drawn while they are still being typed, and it is drawn under the
// composer on the wall, under the handle field on Main, and on the front door.
//
// ── what it is allowed to carry ─────────────────────────────────────────────
// Four things, and the spec names all four: an avatar, a handle, a display
// name, a verification badge. Nothing else. No follower count, no post count,
// no bio, no link. This product does not tell anybody how popular anybody is.
//
// ── it waits with a light ───────────────────────────────────────────────────
// While the resolver is out, which on a cold handle is ten seconds, a point of
// light (`Light`, above) runs round the card's own edge and twinkles through
// the plate's star shaped holes as it passes. Not a spinner, which promises a computation, and
// not a shimmer, which is a pattern from a different product: the frame the
// answer will land in, lit round its border. The frame holds the exact height
// the answer takes, so nothing under it moves when the answer lands.
//
// ── and it can be pressed ───────────────────────────────────────────────────
// Given `onSelect` the card is a button from the first frame: disabled while it
// is looking, live the moment the answer lands, and the same element throughout
// so the light going out and the arrow arriving are one transition rather than
// a swap. Pressing it is the same act as the pill beneath it. The answer that
// popped up under the field is the thing to press.
//
// ── it draws, it does not ask ───────────────────────────────────────────────
// The card is handed `at` by `useResolver` and asks for nothing itself. It
// used to resolve on a pause in the typing, and the ledger showed what that
// cost: every prefix of a name that happens to be somebody's account, run
// through the actor one after another. Now the field peeks the cache while a
// person types, and the person's own press is what asks.
//
// ── the states ──────────────────────────────────────────────────────────────
//   idle     nothing typed yet, or nothing known yet. Nothing drawn.
//   looking  asked. The light is running.
//   found    the account.
//   missing  no account by that name, said in one line, and the act still goes
//            through. Our provider is imperfect and somebody who knows their
//            friend's handle is right.
export function HandleCard({ at = IDLE, onSelect = null, className = '' }) {
  const h = normHandle(at.handle)

  // Idle and unknown draw nothing. "Unknown" is our lookup failing, not an
  // answer about the account, and reporting the two the same way would be
  // telling somebody their friend does not exist.
  if (!at || at.state === 'idle' || at.state === 'unknown') return null

  const looking = at.state === 'looking'
  const missing = at.state === 'missing'
  const pick = typeof onSelect === 'function'
  const Tag = pick ? 'button' : 'div'
  const cls = ['wl-card', looking ? 'is-looking' : missing ? 'is-missing' : 'is-found', pick && 'is-pick', className]
    .filter(Boolean).join(' ')
  const mono = looking ? '' : missing ? h.slice(0, 1).toUpperCase() : monogram(at)
  const name = looking ? '' : missing ? 'no account by that name' : (at.name || `@${at.handle}`)
  const under = looking ? '' : missing ? `@${h}` : (at.name ? `@${at.handle}` : '')
  const live = pick ? { type: 'button', onClick: looking ? undefined : onSelect, disabled: looking } : {}

  return (
    <Tag className={cls} aria-live="polite" aria-busy={looking || undefined} {...live}>
      <Light on={looking} />
      <span className="wl-card-disc" aria-hidden="true">
        <span className="wl-card-mono">{mono}</span>
        {!looking && at.avatar ? (
          <img
            src={at.avatar} alt="" loading="lazy" decoding="async"
            /* A face that fails to load falls through to the monogram under it
               rather than to a broken-image glyph in the middle of a field. */
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : null}
      </span>
      <span className="wl-card-id">
        <span className="wl-card-skel" aria-hidden="true">
          <span className="wl-card-bar" />
          <span className="wl-card-bar is-short" />
        </span>
        <span className="wl-card-real">
          <span className="wl-card-name">
            {name}
            {!looking && at.verified ? <Sparkle size={10} className="wl-card-badge" /> : null}
          </span>
          {under ? <span className="wl-card-at">{under}</span> : null}
        </span>
      </span>
      {pick ? <span className="wl-card-go" aria-hidden="true">&#8594;</span> : null}
    </Tag>
  )
}

// ── the foot of the site ────────────────────────────────────────────────────
// The same block under the front door, under the wall, and (restated in
// legal.css, because a static page cannot import this) under the three legal
// pages: the lockup and the one sentence, the addresses on the product, the
// legal pages, and how to reach the company. It replaced a row of five links
// with nothing behind them, which is what a footer looks like when nobody has
// decided what a footer is for.
//
// It is the one place the company is written as a company: the name, a
// contact address, a telephone and a street. A product that asks somebody to
// type another person's handle into it owes them a way to reach a person.
export const COMPANY = {
  name: 'Celestual LLC',
  email: 'contact@celestual.app',
  phone: '(412) 214-2277',
  tel: '+14122142277',
  address: ['8 The Green', 'Dover, Delaware 19901'],
  year: 2026,
}

// The addresses on Main. Given the shell's `go`, a plain click on one of these
// stays inside the shell rather than reloading the app; a modified click, a
// middle click and a copy still get a real anchor.
const IN_SHELL = { '/': 'hero', '/place': 'place', '/sky': 'sky', '/optout': 'optout' }
function inShell(go, href) {
  const name = IN_SHELL[href]
  if (!go || !name) return undefined
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
    e.preventDefault()
    go(name)
  }
}

export function SiteFoot({ go = null, className = '' }) {
  const link = (href, text) => <a href={href} onClick={inShell(go, href)}>{text}</a>
  return (
    <footer className={`wl-colophon ${className}`}>
      <div className="wl-colophon-brand">
        <Brand href="/" onClick={inShell(go, '/')} />
        <p className="wl-colophon-line">you both find out, or neither of you does.</p>
      </div>

      <nav className="wl-colophon-cols" aria-label="the rest of it">
        <div className="wl-colophon-col">
          <Label tone="dim">product</Label>
          {link('/berkeley', 'berkeley wall')}
          {link('/place', 'place a ping')}
          {link('/optout', 'take your @ off')}
        </div>
        <div className="wl-colophon-col">
          <Label tone="dim">legal</Label>
          {link('/terms', 'terms')}
          {link('/privacy', 'privacy')}
          {link('/data-deletion', 'deleting your data')}
        </div>
        <div className="wl-colophon-col is-contact">
          <Label tone="dim">contact</Label>
          <a className="wl-h" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          <a className="wl-h" href={`tel:${COMPANY.tel}`}>{COMPANY.phone}</a>
          <address>{COMPANY.address[0]}<br />{COMPANY.address[1]}</address>
        </div>
      </nav>

      <div className="wl-colophon-foot">
        <span>&copy; {COMPANY.year} {COMPANY.name}</span>
        <span>independent. not affiliated with instagram or meta.</span>
      </div>
    </footer>
  )
}

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

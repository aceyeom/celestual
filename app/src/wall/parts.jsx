// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PARTS                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every screen is assembled out of these, and all of the styling is in
// wall.css. Props here select a role, never a value — there is no `color`
// prop and no `size` in pixels — so changing what a ghost pill looks like is
// one edit in one file rather than nine inline objects that drifted apart.

import { createContext, useCallback, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { atHandle, normHandle, search } from './data.js'
import { Ecliptic, Sparkle } from './art.jsx'
import { member, isReader, verified, toWrite } from './auth.js'
import { copyText, openInstagram, igUsername } from './handoff.js'
import { resolveHandle, peekHandle, peekServer, resolveEnabled, monogram, isWarm, markWarm, IDLE, PEEK_DEBOUNCE_MS } from '../api/handles.js'

// ── type ────────────────────────────────────────────────────────────────────

// The Didone. Four sizes, and the terminal period is set by the caller because
// it is punctuation and not a decoration — the poster's title has one and its
// nav does not, and that distinction is the difference between a statement and
// a label.
// `ref` rides through to the element (React 19 passes it as a prop), so a
// screen can hand its headline to the sky (ground.jsx useSkyAvoid).
export function Display({ children, size = 'xl', as: Tag = 'h1', className = '', style, id, ref }) {
  return <Tag ref={ref} id={id} className={`wl-display is-${size} ${className}`} style={style}>{children}</Tag>
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
// What a letter looks like to somebody this product has not proved: the real
// letter, its real length, its real line breaks, with every word struck out.
//
// It is built out of the actual words rather than out of lorem or a grey block,
// so the shape on the paper is the shape of the thing behind it — a long letter
// looks long, a two-line one looks short, and nobody is being shown a fake
// paragraph. Nothing readable is in the DOM: the bars carry a length and no
// text, so the letter is not sitting in the page waiting to be read out of it.
// ── the redaction ───────────────────────────────────────────────────────────
// A letter read from outside the read gate never arrives with its words. The
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
  /* the way out of the room: the door's frame and an arrow leaving through
     it. The one glyph in the set that points away from the wall */
  signout: 'M12.6 4H7a2.2 2.2 0 0 0-2.2 2.2v11.6A2.2 2.2 0 0 0 7 20h5.6M9.8 12h9.6M15.9 8.4l3.5 3.6-3.5 3.6',
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

// ── the heart ───────────────────────────────────────────────────────────────
// The tenth glyph, on the same grid at the same stroke, and the one that has
// two states: a line when nobody has pressed it, and filled with its own ink
// when this person has. It is drawn here and not in an icon set for the
// reason every glyph is: it has to sit on the paper beside the letter's own
// type, struck in the paper's ink, and a set would not know it was there.
export function Heart({ size = 18, on = false, className = '' }) {
  return (
    <svg
      className={`wl-icon wl-heart-glyph${on ? ' is-on' : ''} ${className}`}
      width={size} height={size} viewBox="0 0 24 24"
      fill={on ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M12 20.4C8.6 17.6 4.4 14.3 4.4 10.1A4 4 0 0 1 12 8.1a4 4 0 0 1 7.6 2c0 4.2-4.2 7.5-7.6 10.3z" />
    </svg>
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
//
// ── and on the wall itself, the brand is the way to the front ──
// design/DESIGN.md 3.6: the brand is the way home on every bar in the
// product, and off the front door it grows the chevron the sheets use, so
// "back" and "home" are the same target in the same place. On the wall it
// used to scroll to the top instead, which on a screen one viewport tall was
// a control that did nothing, and it left a person who had come from the
// front door with no way back to it but the foot. It is a real anchor to `/`
// now: the wall's shell cannot draw Main, so the walk back is a navigation,
// and a plain click, a middle click and a copy all get the same address. On a
// sheet it stays what it was, the way back to the wall the sheet is over.
//
// ── and under the wall's veil, the brand alone ──
// `acts` is whether the three glyphs on the right are drawn at all. The wall
// hands it false while its veil is up: the poster has one door on it and the
// way home, and a bar offering three more things to press over a title
// nobody has read yet is three decisions before the first one. They arrive
// with the pill once the veil has gone (screens/Wall.jsx).
export function TopBar({ go, at = 'wall', acts = true }) {
  const who = member()
  // Whether the letters are open, which is not the same question as whether
  // this browser has a campus address. A person who proved their handle on
  // Main can read every letter here, and the bar used to answer their tap with
  // "sign in to read the letters" on a surface they were already signed in to.
  const reads = isReader()
  // What to put on the disc. The address when this browser holds one, and the
  // handle it proved when it does not: both are the person, and the second one
  // even has a face the resolver can draw.
  const mine = who || verified()[0] || ''
  const onWall = at === 'wall'
  return (
    <header className="wl-top">
      <Brand
        back
        href={onWall ? '/' : undefined}
        onClick={onWall ? undefined : () => go('wall')}
        label={onWall ? 'celestual, the front' : 'back to the wall'}
        title={onWall ? 'the front' : 'the wall'}
      />
      {acts && (
      <nav className="wl-top-acts" aria-label="the wall">
        <IconButton name="find" label="look for a name" on={at === 'find'} onClick={() => go('find')} />
        {/* ── the composer, as a word ──
            The one act on the wall, and it stands in the bar between the glass
            and the person: a small chalk capsule carrying the nib and the word
            "write", with the running light inside it, so it is the primary on
            the screen the way the wide pill at the foot used to be. It was a
            bare nib among two other glyphs, and a wide capsule reading "write
            anonymously" docked at the bottom edge over the field. The capsule
            was standing on the faces it was about, and the nib in the bar was
            a glyph nobody read as the door. One control now, where the eye
            already goes for the controls, and the field keeps its bottom edge. */}
        <Pill
          tone="light" lit className={`wl-top-write${at === 'write' ? ' is-on' : ''}`}
          onClick={() => toWrite(go)} icon={<Icon name="write" size={15} />}
          aria-label="write a letter" title="write a letter"
          aria-current={at === 'write' ? 'page' : undefined}
        >
          write
        </Pill>
        {/* The fourth target, and the only one that changes what it draws. A
            keyhole while the letters are shut, and once they are open, the
            constellation of the address that opened them — the same figure the
            wall draws beside a handle, so a person's own mark is the same
            object here as it is there. */}
        <button
          type="button"
          className={`wl-iconbtn wl-memberbtn${at === 'gate' ? ' is-on' : ''}`}
          onClick={() => go('gate')}
          aria-label={who ? `signed in as ${who}`
            : mine ? `signed in as ${atHandle(mine)}`
            : reads ? 'your account'
            : 'sign in to read the letters'}
          title={who || (mine ? atHandle(mine) : reads ? 'your account' : 'sign in to read')}
          aria-current={at === 'gate' ? 'page' : undefined}
        >
          {who || reads
            ? <Face handle={mine} size={22} resolve={!who && !!mine} />
            : <Icon name="key" />}
        </button>
      </nav>
      )}
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
// `aside` stands at the end of the crest row: the one control a card may
// carry beside its title, which today is the pen on Main's letter.
export function Paper({ dateline, title, crest, aside = null, children, foot, tone = '', className = '', style, ...rest }) {
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
          {aside}
        </div>
      )}
      <div className="wl-paper-body">{children}</div>
      {foot && <footer className="wl-paper-foot">{foot}</footer>}
    </article>
  )
}

// ── the pen ─────────────────────────────────────────────────────────────────
// The one control that lives on paper: the nib, struck in the paper's ink
// inside a hairline ring, standing at the end of a line that can be changed.
// It is the same nib the wall's bar draws for "write", on the same grid at
// the same stroke, so it is one glyph in two materials rather than an icon
// set's pencil beside the product's own pen. A word ("change") stood where it
// stands, and a word on a letter is a word in the letter.
export function Pen({ onClick, label = 'change it', className = '' }) {
  return (
    <button type="button" className={`wl-pen ${className}`} onClick={onClick} aria-label={label} title={label}>
      <Icon name="write" size={15} />
    </button>
  )
}

// ── the bare baseline ───────────────────────────────────────────────────────
// The '@' is painted, not typed: it is a sibling of the input, never in the
// value, and cannot be backspaced away. Handles are stored bare and shown with
// one, and this is where that stops being a convention and starts being
// enforced.
export function HandleField({ value, onChange, onSubmit, autoFocus = false, locked = false,
  placeholder = '', label = 'Instagram handle', size = '', busy = false, inputRef = null,
  onKeyDown = null }) {
  const ref = useRef(null)
  const id = useId()
  // The caller's own handle on the input, for "not them? change it": a
  // control that sends the person back to the field has to reach the field.
  const setRef = useCallback((el) => {
    ref.current = el
    if (inputRef) inputRef.current = el
  }, [inputRef])

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
        ref={setRef} id={id} aria-label={label} type="text" value={value}
        readOnly={locked} placeholder={placeholder}
        autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false"
        inputMode="text" enterKeyHint="go"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // A list under the field (Suggest) takes the arrows, escape, and
          // an enter on a lit row, and says so; everything else is the
          // field's own.
          if (onKeyDown && onKeyDown(e)) return
          if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() }
        }}
      />
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

// The letter's own field. `count` draws the characters left under the
// paper's corner, counting down rather than up, because where a limit is the
// point a counter that only says when it has been broken has said it too
// late. The wall turns it off: there the box grows with the words and the
// ceiling is the server's, and a number ticking under a letter somebody is
// still finding the words for is a meter on a moment that should not have one.
export function LetterField({ value, onChange, max = 260, placeholder = '', autoFocus = false, rows = 5, count = true }) {
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
      {count ? <div className={`wl-count${left < 40 ? ' is-near' : ''}`} aria-hidden="true">{left}</div> : null}
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
//
// The way out ends when the drop ends. The route used to change on a timer
// set to the length of the stylesheet's drop, and on a phone that was slow
// to start the animation the sheet was cut off mid-fall by the wall coming
// back under it. So the close listens for the animation's own end and the
// timer is only the floor under a browser that never sends one.
//
// ── and everything on the sheet leaves through the same door ────────────────
// The close mark in the head, and any capsule on a sheet that says "back to
// the wall", used to call the route change directly: the sheet was unmounted
// on the spot, with no drop, while the scrim and the key closed it with one.
// Two of the four ways out of the same sheet cut and two fell. So the sheet
// leaves its own way out on a context (`useSheet`), the head's mark takes it,
// `ClosePill` takes it, and the route changes when the glass has gone,
// whichever of the four it was.
//
// `onClosing` is told the moment the way out is taken, and by what: the
// letter uses it to fly its card back into the disc it came out of, and
// declines when the sheet was dragged down, since a sheet already half off
// the glass is not a sheet a card flies home from. A `ref` gets the same
// `dismiss`, for a screen that has to leave without anybody pressing
// anything: the composer goes the moment its letter is up, and the wall
// under it receives the name.
const SheetCtx = createContext(null)
export function useSheet() { return useContext(SheetCtx) }

const SHEET_OUT_MS = 320
export function Sheet({ children, onClose, onClosing = null, tall = false, labelledBy, className = '', ref = null }) {
  const [drag, setDrag] = useState(0)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const start = useRef(null)
  const box = useRef(null)
  // the latest handler, read at the moment the way out is taken rather than
  // at the moment the key listener was attached
  const onClosingRef = useRef(onClosing)
  onClosingRef.current = onClosing

  const dismiss = useCallback((by = 'scrim') => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    if (onClosingRef.current) onClosingRef.current(by)
  }, [])
  const ctx = useMemo(() => ({ dismiss }), [dismiss])
  // and the same way out in the hand of the screen on the sheet, for the one
  // that leaves on its own: the composer, once the letter is up
  useImperativeHandle(ref, () => ({ dismiss }), [dismiss])

  useEffect(() => {
    if (!closing) return undefined
    const el = box.current
    let done = false
    const finish = () => { if (done) return; done = true; onClose() }
    // the section's own drop (wall.css `wl-drop-sheet`, or `wl-dialog-out`
    // on a spread, or `wl-glass-out` when a card is flying home), and not
    // the end of anything animating inside it
    const onEnd = (e) => {
      if (e.target === el && /^wl-(drop-sheet|dialog-out|glass-out)$/.test(e.animationName)) finish()
    }
    if (el) el.addEventListener('animationend', onEnd)
    const t = setTimeout(finish, SHEET_OUT_MS + 260)
    return () => { if (el) el.removeEventListener('animationend', onEnd); clearTimeout(t) }
  }, [closing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss('key') }
    window.addEventListener('keydown', onKey)
    // The wall behind must not scroll while a sheet is up: on a phone the
    // touch would otherwise be taken by the wall the moment the sheet's own
    // content hits its end.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [dismiss])

  const onDown = (e) => { start.current = e.touches ? e.touches[0].clientY : e.clientY }
  const onMove = (e) => {
    if (start.current == null) return
    const y = e.touches ? e.touches[0].clientY : e.clientY
    setDrag(Math.max(0, y - start.current))
  }
  // A sheet let go past a third of its height closes from where the hand
  // left it. The offset is KEPT through the close rather than reset to zero
  // first: reset, the sheet jumped back to the top of its travel and then
  // fell the whole way, which is the one moment in the gesture that read as
  // clunky. The drop keyframe (wall.css `wl-drop-sheet`) starts from the
  // `--drag` the section carries, so the fall picks up exactly where the
  // drag stopped.
  const onUp = () => {
    const h = box.current ? box.current.offsetHeight : 400
    start.current = null
    if (drag > h / 3) { dismiss('drag'); return }
    setDrag(0)
  }

  const held = drag > 0 && !closing
  const style = drag > 0
    ? { '--drag': `${drag}px`, ...(held ? { transform: `translate3d(0, ${drag}px, 0)` } : null) }
    : undefined

  return (
    <SheetCtx.Provider value={ctx}>
    <div className={`wl-sheet-wrap${closing ? ' is-closing' : ''} ${className}`}>
      <button type="button" className="wl-scrim" aria-label="close" onClick={() => dismiss('scrim')} />
      <section
        ref={box}
        className={`wl-sheet${tall ? ' is-tall' : ''}${held ? ' is-dragging' : ''}`}
        style={style}
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
    </SheetCtx.Provider>
  )
}

// A capsule that closes the sheet it stands on, through the sheet's own way
// out, so it leaves the glass the way the close mark does. `onClose` is what
// it does when it is drawn on no sheet at all.
export function ClosePill({ children, onClose, ...rest }) {
  const sheet = useContext(SheetCtx)
  return (
    <Pill {...rest} onClick={() => (sheet ? sheet.dismiss('pill') : onClose && onClose())}>{children}</Pill>
  )
}

// The same, as the quiet control: a sentence under a primary that closes
// the sheet, for "leave it up" and its kind.
export function CloseQuiet({ children, onClose, className = '' }) {
  const sheet = useContext(SheetCtx)
  return (
    <button
      type="button" className={`wl-quiet ${className}`}
      onClick={() => (sheet ? sheet.dismiss('quiet') : onClose && onClose())}
    >
      {children}
    </button>
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
// on the right. `lead` carries the first — a pager when there is more than one
// letter, step dots in the composer — and it is always optically lighter than
// the close, because the way out is the only control in the row.
//
// ── and when a sheet has nothing to say there, it says nothing ──
// The empty half used to be filled with the mark, and a brand mark standing on
// a sheet that is already inside the product is signage pointing at the room
// you are in. Worse, it was not even the same object twice: the letter drew the
// mark, the report and the takedown drew a sparkle, and the composer drew step
// dots, so three sheets a person walks in one minute opened three different
// ways. The slot is empty unless the sheet has a real answer for it.
export function SheetHead({ lead = null, onClose, label = 'close' }) {
  // the sheet's own way out when there is one, so the mark closes the sheet
  // the way the scrim does rather than cutting the route under it
  const sheet = useContext(SheetCtx)
  return (
    <div className="wl-head">
      <div className="wl-head-lead">{lead}</div>
      <Close onClick={sheet ? () => sheet.dismiss('mark') : onClose} label={label} />
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
// Reading, writing and reporting each stand behind a door (auth.js), and all
// three used to say so in their own words in their own place. This is the one
// wording, in the one shape, wherever somebody has walked into one: the
// sentence that names what is shut, and the pill that opens it. Nothing else.
// No explanation of the policy, no second argument for it. A person who has
// just tapped a control they cannot use wants the key, not the reasoning.
//
// The pill goes to the campus gate in every case, because that is the door
// this surface owns. It is not the only way through the reading door since
// 0044 (a handle proved on Main opens it too), but a person standing here has
// not proved anything yet, and offering them two doors at once is offering
// them a decision instead of a way in.
//
// The word on it is "sign in" and nothing more. It used to read "sign in with
// berkeley", under a heading that had just said Berkeley in larger type: the
// button repeated the room's name back at somebody standing in it.
export function Locked({ children, onOpen, cta = 'sign in' }) {
  return (
    <div className="wl-locked">
      <p className="wl-locked-say">{children}</p>
      <Pill tone="light" wide onClick={onOpen}>{cta}</Pill>
    </div>
  )
}

// ── the allowance, said quietly ─────────────────────────────────────────────
// One object for the two things this surface rations.
//
//   week   three letters in any five days, for the writer (migrations 0044
//          and 0051). Drawn as NOTHING until they are spent, and then as one
//          line saying how long to wait. The number itself is never drawn:
//          not the three, not how many are left, not the limit.
//   reads  five whole letters before the door, for the reader (0045). Drawn
//          as marks: one struck for each already read, one hollow for each
//          still standing, and a sentence only on the last.
//
// Both are a STATE and not a warning. A person reading their first letter of
// five should be able to look straight past the marks; a person writing their
// second letter should not be looking at a meter at all.
//
// The count is the server's (`wall_quota`, and the `free` on every read), never
// this browser's arithmetic. A count the client keeps is a count the reader
// owns. `resets` is the server's too: when the oldest spent letter falls out
// of the window, which is the moment one comes back.
export function Allowance({ left, limit, resets = 0, kind = 'week', reading = false, className = '' }) {
  if (!Number.isFinite(left) || !Number.isFinite(limit) || limit <= 0) return null
  const spent = Math.max(0, Math.min(limit, limit - left))
  const reads = kind === 'reads'
  // ── the writer's allowance says nothing until it is spent ──
  // The three marks came off the composer and the account. A person writing
  // their second letter does not need a meter saying it is their second, and
  // "one left" beside the one thing to press read as a warning about an act
  // they had not yet decided on. So it is silent while any letter is left,
  // and says one thing, once, when none is: how many days until one comes
  // back. Counted up to the day, because a wait said in hours is a countdown
  // and a wait said in days is a fact.
  if (!reads) {
    if (left > 0) return null
    return (
      <Label tone="dim" className={`wl-allow is-spent is-week ${className}`} role="status">
        {waitLine(resets)}
      </Label>
    )
  }
  // On the last free letter the reader is looking AT the letter, and telling
  // somebody to sign in while they are mid-sentence is the screen talking over
  // itself. It says what just happened instead, and asks on the next card,
  // which is the one that is actually shut.
  const say = left === 0 ? (reading ? 'that was the last free one' : 'sign in to keep reading')
    : left === 1 ? 'one free letter left' : ''
  const said = left === 0 ? `no free letters left, of ${limit}`
    : left === 1 ? `one free letter left, of ${limit}`
    : `${left} free letters left, of ${limit}`
  return (
    <div className={`wl-allow${left === 0 ? ' is-spent' : ''} ${className}`}>
      <span className="wl-allow-marks" aria-hidden="true">
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={`wl-allow-mark${i < spent ? ' is-used' : ''}`} />
        ))}
      </span>
      <Label tone="dim" as="span" className="wl-allow-say">
        <span className="wl-sr">{said}</span>
        <span aria-hidden="true">{say}</span>
      </Label>
    </div>
  )
}

// How long to wait, in days, said as one line. `resets` is a timestamp, or
// nothing when the server did not say (an old schema, a refusal without a
// date), in which case the line still says to wait and does not invent a
// number.
const DAY_MS = 86400000
export function waitLine(resets) {
  const ms = Number(resets) > 0 ? Number(resets) - Date.now() : 0
  if (!(ms > 0)) return 'wait a few days before you can draft more'
  const days = Math.max(1, Math.ceil(ms / DAY_MS))
  return days === 1 ? 'wait a day before you can draft more' : `wait ${days} days before you can draft more`
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
// once, here, for Main's proof step and the wall's takedown, so the two cannot
// drift.
//
// ── three things, and nothing else ──────────────────────────────────────────
// One line saying where the code goes, the code, and the one act. Under the
// heading every screen sets over it (`VerifyHead`), that is the whole page.
// It used to carry a label over the code naming the handle being proved, a
// line under the code saying where to send it, a status line saying the block
// was waiting, and another saying the code was on the clipboard, and a person
// standing at the one step that costs them anything was reading a screen
// instead of doing the one thing on it. The pill says when it has copied.
// The only line that ever appears under it is `status`: what the relay said
// about a DM that arrived with the wrong code, or a lapsed one, which is the
// one thing a person here has to be told.
//
// ── what is still true ──────────────────────────────────────────────────────
//   THE CODE TRAVELS.  Instagram cannot be handed a prefilled message, so the
//                      clipboard is how the code gets there. The pill copies
//                      before it opens, and the digits copy on a tap.
//   THE DOOR IS PER DEVICE.  handoff.openInstagram picks ig.me into the app on
//                      a phone and the web thread on a desktop. One door.
//   THE DIGITS SELECT.  `user-select: all`, for the browser that refuses a
//                      programmatic copy: a person who cannot select the code
//                      is a person who cannot finish.
export function DmCode({ code, status = '' }) {
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
      <p className="wl-dm-to">DM the code to <span className="wl-h">{atHandle(ig)}</span></p>

      <div className="wl-dm-code">
        <button
          type="button" className="wl-dm-digits" onClick={copy}
          aria-label={`your code is ${String(code).split('').join(' ')}, copy it`}
        >
          {code}
        </button>
      </div>

      <Pill tone="light" wide onClick={openIt}>
        {copied ? 'copied. open instagram' : 'copy and open instagram'}
      </Pill>

      {status ? (
        <p className="wl-dm-said is-note" role="status" aria-live="polite">{status}</p>
      ) : null}
    </div>
  )
}

// The one heading over the code, wherever it is drawn: Main's proof step, the
// sky's sign in, the opt out, the wall's takedown. It says what the step is
// for and nothing about how; the block under it is the how.
export function VerifyHead({ size = 'm', as = 'h1', id, className = '', ref }) {
  return (
    <Display size={size} as={as} id={id} className={className} ref={ref}>
      Verify the account<br />belongs to you.
    </Display>
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
  return { at, ask, settled, looking: at.state === 'looking' }
}

// ── the words under the field while the resolver is out ────────────────────
// A cold handle takes six to twenty seconds, sometimes thirty, and a card
// with a light running round it for twenty seconds with nothing said is a
// screen that has frozen. So the field says what it is doing, and after a
// while it says that this is normal. Ash, not the accent: nothing has failed.
export function useLookingWords(at) {
  const looking = at?.state === 'looking'
  const since = useRef(0)
  const [, bump] = useState(0)
  useEffect(() => {
    if (!looking) return undefined
    since.current = Date.now()
    bump((n) => n + 1)
    const id = setInterval(() => bump((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [looking, at?.handle])
  if (!looking) return ''
  const s = (Date.now() - since.current) / 1000
  if (s < 6) return `looking for ${atHandle(at.handle)} on instagram`
  if (s < 16) return 'still looking. a first look at a name takes a few seconds'
  return 'instagram is slow to answer. this can take up to half a minute'
}

// What the act's capsule says once the card is up. The second press is
// against a person, and the button says which person it is agreeing to.
export function confirmWord(at, idle) {
  switch (at?.state) {
    case 'looking': return 'looking'
    case 'found':   return 'yes, that\u2019s them'
    case 'missing': return 'use it anyway'
    case 'unknown': return 'go on anyway'
    default:        return idle
  }
}

// ── THE SUGGESTIONS ─────────────────────────────────────────────────────────
// Names off the wall's public index, as a person types, the way a search box
// on a social app fills in under the cursor: a face, a name, the handle and
// how many letters it carries, from the first character.
//
// They come from wall_search (0040) and from nowhere else. The resolver's
// cache would be the obvious source and it is the one source this must never
// read: it is the list of everybody who has ever been pinged, and a typeahead
// over it would let anyone enumerate that list a letter at a time. The
// index is public on purpose, and the resolver's fields ride on it for the
// names it already knows, so the rows arrive drawn and cost no request each.
//
//   useSuggest   the rows, the lit one, and the keys. `onPick` takes a row;
//                `skip` hides the list (the field is settled, or on another
//                step); `exclude` drops the handle already in the field, so
//                the person in the card is not listed again under it.
//   Suggest      draws them. Pointer and keyboard both move the light, and
//                pressing a row is the same act as typing that handle.
//
// Answers are held for the life of the tab per query: backspacing through a
// name replays what was already seen, and the wall's index does not change
// between one keystroke and the next.
const SUGGEST_MS = 120
const SUGGEST_MAX = 4
const suggested = new Map()

export function useSuggest(query, { onPick = null, skip = false, exclude = '' } = {}) {
  const q = normHandle(query)
  const ex = normHandle(exclude)
  const [got, setGot] = useState(() => (q && suggested.get(q)) || [])
  const [asking, setAsking] = useState(false)
  const [active, setActive] = useState(-1)
  const [shut, setShut] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    setActive(-1)
    setShut(false)
    if (skip || q.length < 1) { setGot([]); setAsking(false); return undefined }
    const known = suggested.get(q)
    if (known) { setGot(known); setAsking(false); return undefined }
    const seq = ++latest.current
    setAsking(true)
    const t = setTimeout(async () => {
      const out = await search(q)
      if (seq !== latest.current) return
      const top = out.slice(0, SUGGEST_MAX)
      suggested.set(q, top)
      setGot(top)
      setAsking(false)
    }, SUGGEST_MS)
    return () => clearTimeout(t)
  }, [q, skip])

  const rows = ex ? got.filter((t) => t.handle !== ex) : got
  const open = !skip && !shut && rows.length > 0
  const pick = useCallback((t) => {
    setShut(true)
    if (onPick) onPick(t)
  }, [onPick])
  const keyDown = useCallback((e) => {
    if (!open) return false
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % rows.length); return true }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? rows.length - 1 : i - 1)); return true }
    if (e.key === 'Escape') { e.preventDefault(); setShut(true); return true }
    if (e.key === 'Enter' && active >= 0 && rows[active]) { e.preventDefault(); pick(rows[active]); return true }
    return false
  }, [open, rows, active, pick])

  return { rows, open, asking, active, setActive, pick, keyDown }
}

export function Suggest({ sug, label = 'on the wall', className = '' }) {
  const { rows, open, active, setActive, pick } = sug
  if (!open) return null
  return (
    <div className={`wl-suggest ${className}`} role="listbox" aria-label={label}>
      <Label as="span" tone="dim" className="wl-suggest-lab">{label}</Label>
      {rows.map((t, i) => (
        <button
          type="button" role="option" aria-selected={i === active} key={t.handle}
          className={`wl-suggest-row${i === active ? ' is-active' : ''}`}
          /* the field keeps its focus and its keyboard through a press on a
             row, so a person on a phone is not thrown back to the top */
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(t)}
          onPointerEnter={() => setActive(i)}
        >
          <Who handle={t.handle} size={34} meta={t.count > 1 ? `${t.count} letters` : null} className="wl-suggest-who" />
        </button>
      ))}
    </div>
  )
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
  // Which src has actually arrived, and which one failed — held as the URL
  // rather than as two booleans reset by an effect. The effect version had a
  // race the whole product could hit: a picture already in the browser's cache
  // finishes before React attaches `onLoad`, that event is gone, and the reset
  // effect then ran on mount and put the flag back to false — so the face sat
  // at opacity 0 behind its monogram with the image right there in the DOM.
  // Comparing against `src` makes a new handle's picture unshown for free.
  //
  // A picture the wall has already fetched and decoded (api/handles.js
  // warmFaces, and every Face that finished loading one) is shown on the
  // first frame, with no fade: `got` starts at the src, so the face is a
  // person from the moment it is on the screen. The 320ms fade is for a
  // picture that is actually arriving.
  const src = p?.avatar || ''
  const [got, setGot] = useState(() => (isWarm(src) ? src : ''))
  const [bad, setBad] = useState('')
  const shown = !!src && (got === src || isWarm(src))
  const broken = !!src && bad === src
  const landed = () => { markWarm(src); setGot(src) }
  return (
    <span
      className={`wl-face${lit ? ' is-lit' : ''}${shown ? ' has-img' : ''} ${className}`}
      style={{ '--s': `${size}px`, ...style }} aria-hidden="true"
    >
      <span className="wl-face-mono">{mono}</span>
      {/* Eager, not lazy. A face is thirty pixels and it is almost always in
          the first screen; `loading="lazy"` held every one of them back until
          layout had settled, which on a phone was the visible beat between
          the row landing and the picture arriving. */}
      {src && !broken ? (
        <img
          src={src} alt="" decoding="async"
          /* the cache race, caught on the way in: an image that is already
             complete when the ref runs never fires the handler below */
          ref={(el) => { if (el && el.complete && el.naturalWidth > 0 && got !== src) landed() }}
          onLoad={landed} onError={() => setBad(src)}
        />
      ) : null}
    </span>
  )
}

// ── the addressee ───────────────────────────────────────────────────────────
// Who a letter is for, at the head of its paper: the word "for", the name the
// resolver has for them, and the handle under it. It used to be the handle
// alone, set large, and a card that opened on "@sofiaaa.reyes" read as a
// card ABOUT a handle; "for Sofia Reyes" is a letter to a person. When the
// resolver has no name the handle stands in the name's place, after the same
// word, and there is no second line. `id` lands on the name, so a sheet can
// be labelled by it. Drawn on the letter, on the composer's preview and on
// the posted card, so what is written on is what goes up.
export function Addressee({ handle, id, className = '' }) {
  const p = useProfile(handle)
  const name = p?.name || ''
  const h = atHandle(handle)
  return (
    <span className={`wl-addressee ${className}`}>
      <span className="wl-addressee-line">
        <span className="wl-addressee-for" aria-hidden="true">for</span>
        <span className={`wl-addressee-name${name ? '' : ' is-h'}`} id={id}>
          {name || h || '\u00a0'}
          {p?.verified ? <Sparkle size={9} className="wl-who-badge" /> : null}
        </span>
      </span>
      {name ? <span className="wl-addressee-at">{h}</span> : null}
    </span>
  )
}

// ── the face, opened ────────────────────────────────────────────────────────
// A face on a letter can be pressed, and it opens the way a profile picture
// opens on Instagram: the picture, large, over a dimmed room, with the name
// and the handle under it, and a tap anywhere puts it away. Rendered at the
// body, because a sheet's glass is a containing block for anything fixed
// inside it and the picture has to stand over the whole screen.
//
// ── it opens out of the disc, and closes back into it ───────────────────────
// `from` is where the small face was standing when it was pressed, and
// `source` is that face's element, asked again on the way out in case the
// sheet under it has scrolled. The large disc is put where the small one
// was, at its size, and runs out to where it stands on the travelling curve
// the sheets move on; the name and the handle arrive a beat behind it; and
// on the way out the same disc runs back and lands on the small one as the
// room's light comes back. It used to pop up from nothing at the middle of
// the screen and vanish on the tap: a picture that comes from nowhere and
// goes nowhere is a dialog, and this is the same face, larger.
const VIEW_IN_MS = 460
const VIEW_OUT_MS = 340
const EASE_VIEW = 'cubic-bezier(0.32, 0.72, 0, 1)'
export function FaceViewer({ handle, onClose, from = null, source = null }) {
  const p = useProfile(handle)
  const name = p?.name || ''
  const disc = useRef(null)
  const [closing, setClosing] = useState(false)
  const done = useRef(false)
  const still = useMemo(prefersReducedMotion, [])

  // the flight in, before the first paint
  useLayoutEffect(() => {
    const el = disc.current
    if (!el || !from || still || !el.animate) return undefined
    const c = el.getBoundingClientRect()
    if (!c.width) return undefined
    const s = Math.max(0.05, from.w / c.width)
    const ox = from.x + from.w / 2 - (c.left + c.width / 2)
    const oy = from.y + from.h / 2 - (c.top + c.height / 2)
    const a = el.animate([
      { transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${s.toFixed(4)})` },
      { transform: 'none' },
    ], { duration: VIEW_IN_MS, easing: EASE_VIEW, fill: 'backwards' })
    return () => { try { a.cancel() } catch { /* gone */ } }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // the flight out, and then the caller takes the viewer down
  const close = useCallback(() => {
    if (done.current) return
    done.current = true
    setClosing(true)
    const el = disc.current
    const srcEl = source && source.current
      ? (source.current.querySelector('.wl-face') || source.current) : null
    const src = srcEl ? srcEl.getBoundingClientRect() : null
    const to = src && src.width ? { x: src.left, y: src.top, w: src.width, h: src.height } : from
    if (!el || !to || still || !el.animate) { onClose(); return }
    const c = el.getBoundingClientRect()
    if (!c.width) { onClose(); return }
    const s = Math.max(0.05, to.w / c.width)
    const ox = to.x + to.w / 2 - (c.left + c.width / 2)
    const oy = to.y + to.h / 2 - (c.top + c.height / 2)
    el.animate([
      { transform: 'none' },
      { transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${s.toFixed(4)})` },
    ], { duration: VIEW_OUT_MS, easing: EASE_VIEW, fill: 'forwards' })
    setTimeout(onClose, VIEW_OUT_MS)
  }, [from, source, still, onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className={`wl-viewer${from ? ' is-from' : ''}${closing ? ' is-closing' : ''}`}
      role="dialog" aria-modal="true" aria-label={`${name || atHandle(handle)}, the picture`}
    >
      <button type="button" className="wl-viewer-scrim" aria-label="close" onClick={close} />
      <div className="wl-viewer-in" onClick={close}>
        <span className="wl-viewer-disc" ref={disc}>
          <Face handle={handle} size={280} className="wl-viewer-face" />
        </span>
        <span className="wl-viewer-who">
          <span className={`wl-viewer-name${name ? '' : ' is-h'}`}>
            {name || atHandle(handle)}
            {p?.verified ? <Sparkle size={11} className="wl-who-badge" /> : null}
          </span>
          {name ? <span className="wl-viewer-at">{atHandle(handle)}</span> : null}
        </span>
      </div>
    </div>,
    document.body,
  )
}

// The face as a control: press it and it opens (FaceViewer) out of itself.
// One element on the paper, so the crest of a letter is the same disc it
// always was with a press on it, and the viewer rides on the caller's tree.
export function OpenFace({ handle, size = 34, className = '' }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(null)
  const btn = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  const h = normHandle(handle)
  const press = () => {
    if (!h) return
    const el = btn.current ? (btn.current.querySelector('.wl-face') || btn.current) : null
    const r = el ? el.getBoundingClientRect() : null
    setFrom(r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null)
    setOpen(true)
  }
  return (
    <>
      <button
        ref={btn}
        type="button" className={`wl-face-open ${className}`}
        onClick={press}
        aria-label={`see ${atHandle(h) || 'their'} picture larger`} title="see it larger"
      >
        <Face handle={h} size={size} />
      </button>
      {open ? <FaceViewer handle={h} onClose={close} from={from} source={btn} /> : null}
    </>
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
//   star    a dark plate under a hairline, and the light riding over it,
//           clipped to the frame: a soft warm point travelling round the
//           inside of the card's edge. The card, and the mutual row. The
//           plate used to be cut with a scatter of tiny holes for the light
//           to twinkle through, and on a card about a person that scatter
//           read as polka dots on the card rather than as light behind it;
//           the plate is plain now and the light runs on it, the way it
//           runs on the capsule.
//   chalk   an opaque chalk plate, which is the pill's own fill, with the
//           light riding over it and clipped to the capsule: a soft rose bloom
//           travelling round the inside of the button's edge, and nothing
//           outside it.
//
// `on` is whether it is running. Off, the light fades and holds still, and
// the plate stays: the plate is the element's ground in every state.
function StarPlate() {
  return <span className="wl-plate is-star" aria-hidden="true" />
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
// the plate's star shaped holes as it passes, and two bars breathe where the
// name and the handle will land. Not a spinner, which promises a computation,
// and not a shimmer, which is a pattern from a different product: the frame
// the answer will land in, lit round its border. The frame holds the exact
// height the answer takes, so nothing under it moves when the answer lands.
//
// The light came off for one release and went back on. Without it the card
// waited as two grey bars in an unframed box, and a wait of ten seconds with
// nothing moving on the card itself read as a card that had stalled; the words
// under the field said what was happening, but the object the eye was on did
// not. The light is the account of the wait, and it is the same light that
// takes over on the capsule the moment the answer lands (`Pill lit`), so the
// two are one clock handed from the card to the act.
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
//   unknown  we could not check: offline, capped, the provider down or slow.
//            Said as that, in one line, and never as "no account": the two
//            are different facts and reporting them the same way would be
//            telling somebody their friend does not exist. It used to draw
//            nothing, and a press that drew nothing and moved on read as a
//            flow that skipped the confirmation.
export function HandleCard({ at = IDLE, onSelect = null, className = '' }) {
  const h = normHandle(at.handle)

  if (!at || at.state === 'idle') return null

  const looking = at.state === 'looking'
  const missing = at.state === 'missing'
  const unknown = at.state === 'unknown'
  const pick = typeof onSelect === 'function'
  const Tag = pick ? 'button' : 'div'
  const cls = ['wl-card',
    looking ? 'is-looking' : missing ? 'is-missing' : unknown ? 'is-unknown' : 'is-found',
    pick && 'is-pick', className]
    .filter(Boolean).join(' ')
  const mono = looking ? '' : (missing || unknown) ? h.slice(0, 1).toUpperCase() : monogram(at)
  const name = looking ? ''
    : missing ? 'no account by that name'
    : unknown ? 'could not check that one right now'
    : (at.name || `@${at.handle}`)
  const under = looking ? '' : (missing || unknown) ? `@${h}` : (at.name ? `@${at.handle}` : '')
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
// pages: the lockup and the one sentence, the legal pages, and how to reach
// the company. It replaced a row of five links with nothing behind them, which
// is what a footer looks like when nobody has decided what a footer is for.
//
// ── what came off it ────────────────────────────────────────────────────────
// A third column called "product": the wall, the composer and the opt out. The
// wall has its own door in the bar, the composer is the whole page above the
// foot, and the opt out is a privacy control rather than a product, so it
// stands with the legal pages. Three columns on a phone was also the reason
// the foot was taller than the hero's type block: it is two now, and short.
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
          <Label tone="dim">legal</Label>
          {link('/terms', 'terms')}
          {link('/privacy', 'privacy')}
          {link('/data-deletion', 'deleting your data')}
          {link('/optout', 'take your @ off')}
        </div>
        <div className="wl-colophon-col is-contact">
          <Label tone="dim">contact</Label>
          <a className="wl-h" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          <a className="wl-h" href={`tel:${COMPANY.tel}`}>{COMPANY.phone}</a>
          <address>{COMPANY.address[0]}, {COMPANY.address[1]}</address>
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

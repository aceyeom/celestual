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
import { atHandle, normHandle, search, targetKey, isNameKey, nameFor } from './data.js'
import { Ecliptic, Sparkle, Verified } from './art.jsx'
import { member, isReader, verified, toWrite } from './auth.js'
import { copyText, openInstagram, igUsername } from './handoff.js'
import { resolveHandle, peekHandle, peekServer, resolveEnabled, monogram, IDLE, PEEK_DEBOUNCE_MS } from '../api/handles.js'
import { PixelPic, PixIcon, Wait } from './screen.jsx'
import { Caret } from './caret.jsx'
import { campus } from './campus.js'
import LiquidButton from './LiquidButton.jsx'
import { setAfterGate } from './store.js'
import { href } from './router.js'
// the owner's parts at the foot of this file (the toast, the switch, the
// address field), and the sheets built from them
import './owner.css'

// ── the wall is the phone ───────────────────────────────────────────────────
// Every control on the wall is drawn in the phone's own language (DESIGN.md
// 2.6): its pixel glyphs, its keys, its one face. Main shares these parts
// and keeps the room's, so the switch is a context the wall's shell turns on
// (index.jsx) rather than a prop on every call: the parts that DRAW read it
// (the primary, the icons, the close mark, the arrow link, the light, the
// heart), and phone.css restyles everything else under `.wl-root.is-room`.
export const PhoneChrome = createContext(false)
export const usePhone = () => useContext(PhoneChrome)
// the stroke icons below, as the phone's glyphs (looks.js PIX)
const PIX_OF = { back: 'back', find: 'find', write: 'pen', join: 'arrow', close: 'close', key: 'key', down: 'down', flag: 'flag', signout: 'signout' }
// one of a glyph's pixels is this many of the page's, whatever its size, so
// every glyph on a screen of the wall shares one grid the way a phone's did
const pixScale = (size) => Math.max(2, Math.round((size - 2) / 9))

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
  const phone = usePhone()
  const cls = ['wl-arrow', tone && `is-${tone}`, size && `is-${size}`, className].filter(Boolean).join(' ')
  // the phone's face has no arrows, so on the wall the arrow is its glyph
  const g = phone ? <PixIcon name="arrow" scale={2} /> : '→'
  const body = <><span className="wl-arrow-g" aria-hidden="true">{g}</span><span className="wl-arrow-t">{children}</span></>
  if (href && !disabled) return <a className={cls} href={href} onClick={onClick} {...rest}>{body}</a>
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>{body}</button>
  )
}

// ── the pill ────────────────────────────────────────────────────────────────
// Two roles and no third. `light` is the primary action on any screen that
// has one; `ghost` is the outlined capsule beside a list row.
//
// `light` was the reference's white capsule for the whole of the build and is
// the liquid metal one now (LiquidButton.jsx): a dark capsule with a metal
// rim, the same fragment shader the mark is poured in. The role is unchanged
// and so is every caller — the primary is still one word in one place, it is
// just made of something else.
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
// It was on by default for the light capsule and is now on nothing: the metal
// has its own current and a rose point travelling round the inside of it
// would be a second one under the same word. A ghost pill never carried it.
// The prop and the component stay for the one caller that is not a pill — the
// veil's "view the wall" (screens/Wall.jsx `.wl-mast-go`).
export function Pill({ children, onClick, href, tone = 'ghost', wide = false, lit = tone === 'light', disabled = false, icon = null, className = '', ...rest }) {
  const phone = usePhone()
  // ── the primary is a material now ──
  // Every `light` capsule in the build — "write a letter" at the foot of the
  // wall, "place a ping" on the front door, the step buttons on the composer,
  // the gate's, the takedown's — is the liquid metal capsule
  // (LiquidButton.jsx). The role chose the fill before and it chooses the
  // material now, which is the same edit in the same place: nothing below
  // this line and no caller anywhere knows what a primary is made of.
  //
  // The running light does not come with it. `Light` is a chalk plate with a
  // rose point travelling round its inside, and a rose point travelling round
  // the inside of a metal capsule is two currents under one word.
  //
  // ── and on the wall it is the phone's lit key ──
  // The wall is the phone (DESIGN.md 2.6), and metal poured into a capsule is
  // the room's material, not the phone's. There the primary is a key: a chalk
  // plate with the word struck out of it in the phone's face, the way the
  // chosen row of a menu is drawn (screen.css `.wl-scr-menu li.is-on`), so the
  // one bright control on a screen of the wall is the one the phone would
  // light. It keeps `wl-pill` for its metrics, like the metal did, and
  // `is-light` so every rule and script that finds the primary still finds it.
  if (tone === 'light' && phone) {
    const cls = ['wl-pill', 'is-light', 'is-key', wide && 'is-wide', className].filter(Boolean).join(' ')
    const busy = !!rest['aria-busy']
    const body = <>{busy ? <Wait /> : icon}<span>{children}</span></>
    if (href && !disabled) return <a className={cls} href={href} onClick={onClick} {...rest}>{body}</a>
    return <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>{body}</button>
  }
  if (tone === 'light') {
    return (
      <LiquidButton
        onClick={onClick} href={href} wide={wide} disabled={disabled}
        icon={icon} className={className} {...rest}
      >{children}</LiquidButton>
    )
  }
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
  const phone = usePhone()
  return (
    <button
      type="button" className={`wl-close ${className}`}
      onClick={onClick} aria-label={label} title={label}
    >
      {/* on the wall, the phone's own cross, in a square key (phone.css) */}
      {phone ? <PixIcon name="close" scale={2} /> : (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"
          fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M5.1 5.1 14.9 14.9M14.9 5.1 5.1 14.9" />
        </svg>
      )}
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
  const phone = usePhone()
  // on the wall, the heart the letters' own centre key draws
  if (phone) return <PixIcon name={on ? 'heart' : 'heartO'} scale={pixScale(size)} className={`wl-icon wl-heart-glyph${on ? ' is-on' : ''} ${className}`} />
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
  const phone = usePhone()
  // on the wall, the phone's glyph for the same destination
  if (phone && PIX_OF[name]) {
    return <PixIcon name={PIX_OF[name]} scale={pixScale(size)} className={`wl-icon ${className}`} />
  }
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
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
export function Brand({ onClick, href, back = false, label = 'celestual, the front', title = 'the front', mark = 26, className = '' }) {
  const body = (
    <>
      {back ? <Icon name="back" size={17} /> : null}
      <Ecliptic size={mark} className="wl-brand-mark" />
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
// ── the row is one size ──
// Three targets on the right, at one height: the glass and the person are
// forty pixel rings, and the capsule between them stands thirty-six tall on
// the same centre line. The face on the person's ring fills it, at thirty
// pixels inside the forty, the way a face fills a ring anywhere else on the
// product; it was drawn at twenty-two, the size of the glyphs beside it, and
// a face is not a glyph: at the glyphs' size it read as a dot on the end of
// the row, and the row read as heavy on the left and light on the right.
export function TopBar({ go, at = 'wall', acts = true, inert = false }) {
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
  // The wall at the root is home already, and the brand stands on it without
  // the chevron. A wall mounted under a base of its own (there has been one,
  // at /berkeley, campus.js) would send it to the root instead.
  const home = onWall && !!campus().base
  return (
    <header className="wl-top" inert={inert || undefined}>
      <Brand
        back={!onWall || home}
        href={home ? '/' : undefined}
        onClick={home ? undefined : () => go('wall')}
        label={home ? 'celestual, the front' : onWall ? 'celestual' : 'back to the wall'}
        title={home ? 'the front' : 'the wall'}
      />
      {acts && (
      <nav className="wl-top-acts" aria-label="the wall">
        {/* ── the bar carries the brand and the person, and nothing else ──
            The glass stood here once as a 40px ring, and the composer stood
            here as a chalk capsule beside the person. With the ear and the
            search plate stacked under it, the top of the wall was three rows
            of chrome in three vocabularies, and two similar capsules a hundred
            pixels apart. The search is the wall's own question and it stands
            alone under the bar now (screens/Wall.jsx `Seek`), and the act is
            at the foot, where a thumb is (`WriteAct`). The bar keeps the way
            home and the person. */}
        {/* The one target here, and the only one that changes what it draws. A
            key while nobody is signed in, and once somebody is, the face of
            the address they signed in with, so a person's own mark is the
            same object here as it is on the wall.
            It opens the person: their pings, what they have not finished and
            what they have written (screens/You.jsx), for anybody the product
            knows by any proof. Anybody else is asked in first, and lands on
            the same sheet once they are. The key is named for that and for
            nothing else: it went on saying "sign in to read the letters" to
            a screen reader and on hover after every letter was open to
            anybody (migration 0066). */}
        <button
          type="button"
          className={`wl-iconbtn wl-memberbtn${at === 'gate' || at === 'you' ? ' is-on' : ''}`}
          onClick={() => {
            if (who || reads || mine) { go('you'); return }
            setAfterGate({ name: 'you' })
            go('gate')
          }}
          aria-label={who ? `signed in as ${who}`
            : mine ? `signed in as ${atHandle(mine)}`
            : reads ? 'your account'
            : 'sign in'}
          title={who || (mine ? atHandle(mine) : reads ? 'your account' : 'sign in')}
          aria-current={at === 'gate' || at === 'you' ? 'page' : undefined}
        >
          {who || reads
            ? <Face handle={mine} size={30} resolve={!who && !!mine} />
            : <Icon name="key" size={22} />}
        </button>
      </nav>
      )}
    </header>
  )
}

// ── the act, at the foot ────────────────────────────────────────────────────
// The one primary on the wall: the metal capsule carrying the nib and the
// words, standing in the middle of the bottom edge where a thumb already is.
// It stood in the bar as a small capsule beside the person, which put the act
// and the question (the search plate under the bar) within a hundred pixels
// of each other as two capsules of one shape, and the top of the wall read as
// crammed. Down here it is the one object at the foot, and the plate is the
// one thing at the head.
//
// It was a chalk capsule with the running light inside it until the primary
// became a material (Pill above, LiquidButton.jsx). The pairing at the two
// ends of the wall still holds and has turned over: the question at the head
// is the glass the crowd shows through, and the act at the foot is the one
// solid thing on the screen.
export function WriteAct({ go, className = '' }) {
  return (
    <Pill
      tone="light" className={`wl-write-act ${className}`}
      onClick={() => toWrite(go)} icon={<Icon name="write" size={15} />}
      aria-label="write a letter" title="write a letter"
    >
      write a letter
    </Pill>
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
// it the card is a material. Which grain it is belongs to the THEME
// (looks.js, `data-grain`): it was laid unconditionally, so the one theme
// with a texture of its own drew that texture through a noise field, and
// sixteen surfaces now share the layer with `none` a real answer among them.
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
// ── and what it is no longer ──
// It carried a letter's paper (0055): forty-two of them, with furniture and
// three layouts of their own. A letter on the wall is a screen now
// (screen.jsx), and the paper is Main's again: the ping's card, the plain
// cream sheet, and nothing on it a writer chose.
export function Paper({ dateline, title, crest, aside = null, children, foot, tone = '', className = '', style, ...rest }) {
  const headEl = dateline ? (
    <header className="wl-paper-head">
      <span>{dateline.lead}</span>
      {dateline.stamp
        ? <span className="wl-paper-stamp">{dateline.stamp}</span>
        : dateline.trail ? <span>{dateline.trail}</span> : null}
    </header>
  ) : null
  const titleEl = title ? <h2 className="wl-paper-title">{title}</h2> : null
  /* The letterhead stands whether or not the card is titled. On the core
     service every card is inside something that has already named the
     handle — the sill under the leaf, or the sheet's own head line — so
     the crest arrives WITHOUT a title and still belongs: the constellation
     is a picture of who, and the line above it is the word for who. */
  const crestEl = (title || crest) ? (
    <div className={`wl-paper-crest${title ? '' : ' is-bare'}`}>
      {crest}
      {titleEl}
      {aside}
    </div>
  ) : null

  return (
    <article className={`wl-paper${tone ? ` is-${tone}` : ''} ${className}`} style={style} {...rest}>
      <div className="wl-paper-grain" aria-hidden="true" />
      {headEl}
      {crestEl}
      <div className="wl-paper-body">{children}</div>
      {foot ? <footer className="wl-paper-foot">{foot}</footer> : null}
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
// `on` is for the pen that is a toggle: the composer's, which opens and
// closes the look panel under the card, and stands lit while it is open.
export function Pen({ onClick, label = 'change it', on = null, className = '' }) {
  return (
    <button
      type="button" className={`wl-pen${on ? ' is-on' : ''} ${className}`}
      onClick={onClick} aria-label={label} title={label}
      aria-pressed={on === null ? undefined : !!on}
    >
      <Icon name="write" size={15} />
    </button>
  )
}

// ── the bookmarks ───────────────────────────────────────────────────────────
// Two or three words on a rail, one of them open, and the open one sits on
// the rail as a tab does on a page: a soft ground rounded at the head, square
// at the foot, and a lit spine along the line under it. The rail is the top
// edge of the thing it changes — the field under it, the panel under it — so
// the tab and what it opens are ONE object with a bookmark in it rather than
// a control floating above a second control.
//
// It was a filled capsule with an inset ring round both words and a glyph
// beside each of them: a heavy object standing over a bare baseline field,
// which on the composer's first question made three stacked boxes out of one
// question. The ring came off, the ground came off, and the glyphs came off —
// an `@` beside the word "instagram" and a star beside "anything else" say
// nothing the words had not already said, and the product does not wear an
// icon set (DESIGN.md 1.3).
//
// The tab is one element that slides to the choice on the sheet's own
// travelling curve, so the choice is seen to move rather than to swap. It is
// a radio group to a screen reader and to a keyboard, and the arrow keys move
// it. `Look.jsx` wears the same rail as a tablist, which is why the markup is
// a grid of equal columns with `--n` and `--i` on it and nothing measured.
export function Segmented({ value, onChange, options, label, className = '' }) {
  const at = Math.max(0, options.findIndex((o) => o.value === value))
  const keys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = options[(at + dir + options.length) % options.length]
    onChange(next.value)
    const el = e.currentTarget.querySelector(`[data-value="${next.value}"]`)
    if (el) el.focus()
  }
  return (
    <div
      className={`wl-seg ${className}`} role="radiogroup" aria-label={label}
      style={{ '--n': options.length, '--i': at }}
      onKeyDown={keys}
    >
      <span className="wl-seg-thumb" aria-hidden="true" />
      {options.map((o, i) => (
        <button
          type="button" role="radio" key={o.value} data-value={o.value}
          className="wl-seg-opt" aria-checked={i === at}
          tabIndex={i === at ? 0 : -1}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── the bare baseline ───────────────────────────────────────────────────────
// The '@' is painted, not typed: it is a sibling of the input, never in the
// value, and cannot be backspaced away. Handles are stored bare and shown with
// one, and this is where that stops being a convention and starts being
// enforced.
//
// ── and a name, since 0053 ──
// `kind="name"` is the same field asking for a first name instead of a
// handle: the painted @ goes, the input sets in the display face because a
// name is something a person means and a handle is an identifier, and the
// keyboard capitalises the way a name is written. Nothing else moves, so the
// switch between the two is seen as the @ going out and the type changing
// its voice, which is the whole explanation.
//
// `focusOnTouch` is for the one field a person has already asked for with
// their thumb: the search, which opens from a tap on a field on the wall,
// so the keyboard that tap raised is the keyboard this field keeps.
export function HandleField({ value, onChange, onSubmit, autoFocus = false, focusOnTouch = false, locked = false,
  placeholder = '', label = 'Instagram handle', size = '', busy = false, inputRef = null,
  onKeyDown = null, kind = 'handle', onFocus = null, onBlur = null, centred = false }) {
  const ref = useRef(null)
  const id = useId()
  // on the wall the caret is the phone's (caret.jsx); Main keeps the native one
  const phone = usePhone()
  const named = kind === 'name'
  // `kind="search"` is the wall's own question: a glass in the place of the
  // @, because a name is as good an answer as a handle since 0054, and a
  // painted @ would say otherwise.
  const seeking = kind === 'search'
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
    // the next thirty seconds work. So: pointer devices only, unless the
    // person's own tap on a field is what opened this one.
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine || focusOnTouch) ref.current.focus()
  }, [autoFocus, focusOnTouch])

  // ── centred: the @ and what is typed after it stay one string ─────────────
  // On the door (screens/Gate.jsx) the field sits on a centred axis, and an
  // input that fills the row centres its TEXT inside itself — which leaves the
  // painted @ stranded at the far left with a hand's width of nothing between
  // it and the handle it belongs to. So the input is sized to what is in it,
  // the way the gate's address field already sizes itself, and the row centres
  // the pair. Floored at the placeholder's width so an empty field is not a
  // caret alone, and capped so a long handle scrolls inside the field rather
  // than pushing the @ off the axis.
  // On the wall an empty field's hint stands clear of the caret (phone.css),
  // and the field is that much wider so the hint is not cut.
  const chars = Math.min(20, Math.max((placeholder || '').length || 11, value.length + 1))
  const fit = centred
    ? { width: phone && !value ? `calc(${chars}ch + 0.3em)` : `${chars}ch`, flex: '0 1 auto' }
    : undefined

  return (
    <div className={`wl-field${size ? ` is-${size}` : ''}${locked ? ' is-locked' : ''}${busy ? ' is-busy' : ''}${named ? ' is-name' : ''}${seeking ? ' is-search' : ''}${centred ? ' is-centred' : ''}`}>
      {named ? null
        : seeking ? <span className="wl-at wl-field-glass" aria-hidden="true"><Icon name="find" size={size === 'lg' ? 24 : 20} /></span>
        : <span className="wl-at" aria-hidden="true">@</span>}
      <input
        ref={setRef} id={id} aria-label={label} type="text" value={value}
        readOnly={locked} placeholder={placeholder} style={fit}
        autoComplete="off" autoCapitalize={named ? 'words' : 'none'} autoCorrect="off" spellCheck="false"
        inputMode={seeking ? 'search' : 'text'} enterKeyHint={seeking ? 'search' : 'go'}
        onFocus={onFocus || undefined} onBlur={onBlur || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // A list under the field (Suggest) takes the arrows, escape, and
          // an enter on a lit row, and says so; everything else is the
          // field's own.
          if (onKeyDown && onKeyDown(e)) return
          if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() }
        }}
      />
      {phone ? <Caret of={ref} /> : null}
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
//
// `onEscape` is asked first when Escape is pressed, wherever the focus is,
// and a screen that answers true has used the key for something smaller
// than the sheet: the composer takes its colours down with it.
const SheetCtx = createContext(null)
export function useSheet() { return useContext(SheetCtx) }

const SHEET_OUT_MS = 320
export function Sheet({ children, onClose, onClosing = null, onEscape = null, tall = false, labelledBy, className = '', aside = null, ref = null }) {
  const [drag, setDrag] = useState(0)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const start = useRef(null)
  const box = useRef(null)
  // the latest handler, read at the moment the way out is taken rather than
  // at the moment the key listener was attached
  const onClosingRef = useRef(onClosing)
  onClosingRef.current = onClosing
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

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
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (onEscapeRef.current && onEscapeRef.current(e) === true) { e.preventDefault(); return }
      dismiss('key')
    }
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
      {/* out of the tab order: the wall under it is inert, and the scrim
          would be the first stop, an invisible one */}
      <button type="button" className="wl-scrim" tabIndex={-1} aria-label="close" onClick={() => dismiss('scrim')} />
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
      {/* whatever stands on the glass beside the sheet rather than in it:
          the letter's close mark, which has to sit in the corner of the
          window and not in the corner of a card that is moving */}
      {aside}
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

// ── a screen that is shut ──────────────────────────────────────────────────
// The composer, met by somebody the product has not proved yet. It used to be
// its own thing entirely: left aligned, no mark, one sentence in sentence
// case and a bare "sign in" capsule — standing four hundred pixels away from
// `/gate`, which asks the SAME question, centred, under the mark, with three
// ways through and the legal line at its foot. Two screens for one question,
// in two alignments, with two casings, and the one a person hits first was
// the one that did not look like the product.
//
// DESIGN.md 8.5 already says what this is: "Every sign in screen in the
// product, on one shape." So it is the door, with one way through instead of
// three, and the axis changes here and changes back behind it exactly as it
// does on the gate. What is behind the single capsule is still the gate —
// this screen does not duplicate the three ways, it is the one door that
// leads to them.
export function Locked({ children, onOpen, cta = 'sign in', title, id }) {
  return (
    <div className="wl-door">
      <DoorHead title={title} say={children} id={id} />
      <div className="wl-door-ways">
        <Pill tone="light" wide onClick={onOpen}>{cta}</Pill>
      </div>
      <div className="wl-push" />
      <DoorFoot />
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
//
// A ration that is not being counted at all — the desk's switch off, migration
// 0052 — arrives as an infinity, and the first line below is what draws it:
// nothing. A meter with no end on it is not a quieter meter, it is a number
// nobody can act on.
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

// When the next letter can go up, in days, said as one line. It is the
// sending that waits and not the writing, since a draft is kept all week.
// `resets` is a timestamp, or nothing when the server did not say (an old
// schema, a refusal without a date), in which case the line still says it
// is days off and does not invent a number.
const DAY_MS = 86400000
export function waitLine(resets) {
  const ms = Number(resets) > 0 ? Number(resets) - Date.now() : 0
  if (!(ms > 0)) return 'your next letter can go up in a few days'
  const days = Math.max(1, Math.ceil(ms / DAY_MS))
  return days === 1 ? 'your next letter can go up tomorrow' : `your next letter can go up in ${days} days`
}

// ── the small box ───────────────────────────────────────────────────────────
// A short reason, on the screen that has already taken the letter down. It is
// small on purpose and it counts nothing: this box is not evidence and nobody
// is being asked to make a case. Two lines of room says "a sentence is enough",
// and a box the size of the composer would say the opposite.
export function ReasonField({ value, onChange, placeholder = '', max = 240, autoFocus = false }) {
  const ref = useRef(null)
  const phone = usePhone()
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
      {phone ? <Caret of={ref} /> : null}
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

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE DOOR                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three parts, and between them they are every sign in screen the product has:
// the head a door opens on, the box a mailed code is typed into, and the line
// that asks for another one. They are here rather than on a screen because
// there are FOUR doors — the wall at the root, the wall at Berkeley, the link
// in a mail and the code page — and four screens each inventing a heading, a
// field and a way to ask again is how one product comes to have four sign ins.
//
// ── and the door is the one centred thing in the build ──────────────────────
// Everything else is left aligned, and design/DESIGN.md is emphatic about why:
// a rag on the right is what says a person set the page, and a centred
// paragraph moves its own left edge on every line so the eye hunts for the
// start of the next one. That argument is about READING, and none of it is
// true of a door. There is no paragraph here to track down a column: there is
// a mark, one sentence, and the two or three ways through. A door is a thing
// you stand square in front of, its objects are stacked on one axis, and the
// mark at the head of it is a symmetrical drawing — put that block hard left
// and the sheet reads as a form somebody has to fill in rather than as a way
// in. So the door is centred, the product behind it is not, and the change of
// axis is itself the signal that this screen is not part of the wall.

// ── the head ────────────────────────────────────────────────────────────────
// The mark, the one line that says what is being asked, and at most one
// sentence under it. Nothing else has ever belonged here: the gate used to
// open straight onto a heading with no signature over it at all, on four
// different screens, so the one moment somebody is deciding whether to hand
// this product an address was also the one moment it did not say who it was.
//
// The mark is `Ecliptic`, flat, and not `LiquidMark`. DESIGN.md 3.5 rations
// the poured metal to the product's own events — the intro, a mutual, the
// reveal — and a sign in is not one of them. Here it is a glyph.
export function DoorHead({ title, say = null, id, className = '', ref }) {
  return (
    <div className={`wl-door-head ${className}`}>
      <Ecliptic size={38} className="wl-door-mark" />
      <Display size="s" as="h2" id={id} ref={ref} className="wl-door-title">{title}</Display>
      {say ? <p className="wl-door-say">{say}</p> : null}
    </div>
  )
}

// ── "or" ────────────────────────────────────────────────────────────────────
// A hairline with one word sitting in it, between the way in that is one tap
// and the ways in that are not. It is drawn rather than written because the
// alternative is a third heading, and a screen with three headings on it has
// none.
export function Or({ children = 'or', className = '' }) {
  return (
    <div className={`wl-or ${className}`} role="separator">
      <span className="wl-or-word">{children}</span>
    </div>
  )
}

// ── the legal line ──────────────────────────────────────────────────────────
// At the foot of every door, quieter than anything on it. It is the one thing
// here nobody reads before they act and everybody has the right to read
// afterwards, so it is present, plain, and never in the way: real anchors, so
// a person can open either in a new tab and come back to a sheet that has not
// lost the address they were halfway through typing.
export function DoorFoot({ className = '' }) {
  return (
    <div className={`wl-door-foot ${className}`}>
      by continuing you agree to the <a href="/terms">terms</a> and
      the <a href="/privacy">privacy policy</a>.
    </div>
  )
}

// ── THE CODE ────────────────────────────────────────────────────────────────
//
// One object, drawn twice: here, and in supabase/functions/_shared/mail.ts,
// which is the mail the digits arrive in. The two are held to the same values
// on purpose — `--void-2` behind a hairline, the field's own 14px corner, the
// identifier face at 38px tracked 0.14em, centred — because a person reads six
// characters off one screen and types them into another about ten seconds
// later, and a code that is one shape in the inbox and another in the field is
// a code they have to check twice. The one thing that cannot match is the
// face: no mail client loads a web font, so the mail falls back to SF Mono and
// Courier while this is Geist Mono. Everything a client CAN hold is held.
//
// ── one input, not six ──────────────────────────────────────────────────────
// Six boxes with a digit each is the fashionable drawing of this and it is six
// inputs: six focus states to move between, a backspace rule to write, and an
// autofill that lands the whole code in the first box on half the browsers
// that offer it. This is one field. `autocomplete="one-time-code"` works,
// paste works, the mail's own selection pastes in whole, and a person who
// wants to fix the third digit uses the caret they already know how to use.
//
// ── static, when nobody is typing ───────────────────────────────────────────
// Without `onChange` it is the same box drawn around a code being SHOWN rather
// than asked for: /copy, where the code came in on the address and the only
// thing to do with it is take it. `user-select: all` there, so one press has
// the whole of it, which is the same affordance the mail offers.
export function CodeBox({
  value, onChange = null, onSubmit = null, length = 6,
  autoFocus = false, label = 'the code from the mail', className = '',
}) {
  const dots = '·'.repeat(length)
  const ref = useRef(null)
  const phone = usePhone()
  if (!onChange) {
    return (
      <div className={`wl-codebox is-shown ${className}`}>
        <div className="wl-codebox-digits" aria-label={`your code is ${String(value).split('').join(' ')}`}>
          {value}
        </div>
      </div>
    )
  }
  return (
    <div className={`wl-codebox ${className}`}>
      <input
        ref={ref} className="wl-codebox-in"
        value={value}
        // Digits only, and never more than the code is long: a paste that
        // brought a space, a newline or the sentence around it off a mail
        // client's selection lands as the code and nothing else.
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
        aria-label={label} placeholder={dots}
        type="text" inputMode="numeric" autoComplete="one-time-code"
        autoFocus={autoFocus} autoCorrect="off" spellCheck="false" enterKeyHint="go"
        maxLength={length}
      />
      {phone ? <Caret of={ref} /> : null}
    </div>
  )
}

// ── asking for another one ──────────────────────────────────────────────────
//
// The screen that had no answer for the commonest thing that happens on it.
// A mailed code goes missing — a slow relay, a spam folder, an address typed
// with one wrong character — and the only way forward the gate offered was
// "use a different address", which is not what happened and not what anybody
// wants to do about it.
//
// It waits before it offers, and that is the whole design. A resend put up the
// moment the first code is sent is a button people press three times in eight
// seconds, which mails three codes, invalidates two of them and walks somebody
// into the rate limit that then locks the address for an hour. So the line
// counts down first, in the identifier face because it is a number being read
// off a clock, and only then becomes a control.
export function Resend({ onSend, wait = 30, className = '' }) {
  const [left, setLeft] = useState(wait)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  // `alive` rather than a bare setState after the await: this line sits on a
  // sheet somebody can close while the mail is going out, and React's
  // development StrictMode mounts and unmounts every component once before it
  // settles. Same trap Signin.jsx documents at length.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const go = async () => {
    if (left > 0 || busy) return
    setBusy(true)
    const out = await onSend()
    if (!alive.current) return
    setBusy(false)
    // A send that failed says so through the screen's own fault line, which is
    // already under this one. What it must not do is start the clock again and
    // tell somebody a code is coming.
    if (out === false) return
    setSent(true)
    setLeft(wait)
  }

  if (busy) return <p className={`wl-resend ${className}`}>sending</p>
  if (left > 0) {
    return (
      <p className={`wl-resend ${className}`} role="status" aria-live="polite">
        {sent ? 'a new code is on its way' : 'no code yet?'}{' '}
        <span className="wl-resend-clock">{left}s</span>
      </p>
    )
  }
  return (
    <button type="button" className={`wl-quiet wl-resend-go ${className}`} onClick={go}>
      send another code
    </button>
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
      <p className="wl-dm-to">send this code to <span className="wl-h">{atHandle(ig)}</span> in a DM</p>

      <div className="wl-dm-code">
        <button
          type="button" className="wl-dm-digits" onClick={copy}
          aria-label={`your code is ${String(code).split('').join(' ')}, copy it`}
        >
          {code}
        </button>
      </div>

      <Pill tone="light" wide onClick={openIt}>
        {copied ? 'copied. open Instagram' : 'copy and open Instagram'}
      </Pill>

      {status ? (
        <p className="wl-dm-said is-note" role="status" aria-live="polite">{status}</p>
      ) : null}
    </div>
  )
}

// The one heading over the code, wherever it is drawn: Main's proof step, the
// sky's sign in, the opt out, the wall's takedown and its claim. It says what
// the step is, in the words the gate asks it in (VOICE.md 2); the block under
// it is the how.
export function VerifyHead({ size = 'm', as = 'h1', id, className = '', ref }) {
  return (
    <Display size={size} as={as} id={id} className={className} ref={ref}>
      confirm this is<br />your Instagram.
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
//                the person in the card is not listed again under it;
//                `handles` keeps only the names that are an @, for the
//                ping's field, where a first name is nobody a ping can find.
//   Suggest      draws them. Pointer and keyboard both move the light, and
//                pressing a row is the same act as typing that handle.
//
// Answers are held for the life of the tab per query: backspacing through a
// name replays what was already seen, and the wall's index does not change
// between one keystroke and the next.
const SUGGEST_MS = 120
const SUGGEST_MAX = 4
const suggested = new Map()

export function useSuggest(query, { onPick = null, skip = false, exclude = '', max = SUGGEST_MAX, handles = false } = {}) {
  // as typed (0054): a space or an accent is the server's to hear, and a
  // first name is not a handle to normalise
  const q = String(query || '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const ex = targetKey(exclude)
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
      // What the server answered, whole. The ceiling is the CALLER'S — the
      // composer shows four under its field and the wall's own panel shows
      // more — and a cache that had already been cut to four would hand the
      // second caller the first caller's ceiling.
      suggested.set(q, out)
      setGot(out)
      setAsking(false)
    }, SUGGEST_MS)
    return () => clearTimeout(t)
  }, [q, skip])

  const rows = got.filter((t) => (!ex || t.handle !== ex) && (!handles || !isNameKey(t.handle))).slice(0, max)
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

// The composer's list, under "who is it to". It keeps its caption: there the
// words are the fact a person needs — that these names are already on the
// wall — rather than a label on a wall saying "wall", which is what the same
// three words were over the wall's own results (screens/Wall.jsx `Seek`).
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
// A person, as a small lit screen: a square of the night LCD, sized by
// `size`, carrying their picture cut to the screen's pixels in its own
// colours when the resolver has one (screen.jsx `PixelPic`), and their
// monogram in the screen's face until then and otherwise. The picture was
// dithered into the panel's grey ink until 26 September, which drew every
// person on a sheet, a row or the bar as a black and white photo. The monogram is in place under
// the picture, so a picture that never arrives is a designed state and one
// that fails to load is the same state. `resolve` off draws the monogram
// only, for the one identity in the product that is not an Instagram handle.
//
// It was a disc. Everything a person stands for on the wall is a screen now
// (looks.js), and a round photograph among square lit screens was the one
// object on the surface from a different product.
//
// A first name's key (`~sofia`, 0053) is never resolved: it draws the
// monogram of the name as written, and asks nothing, because the resolver
// would answer with a stranger of the same spelling.
//
// The picture's size decides how many pixels it is cut to, about one to
// every one of the page's, in fours: thirty-two a side at thirty pixels,
// sixty-four at sixty-four, sixteen on the smallest chip, and a hundred and
// ninety-two opened large, so a face is clear at every size.
export function PixelFace({ src = '', mono = '', size = 30, lit = false, className = '', style }) {
  const [ready, setReady] = useState('')
  const cells = Math.min(192, Math.max(16, Math.round(size / 4) * 4))
  const shown = !!src && ready === src
  return (
    <span
      className={`wl-face${lit ? ' is-lit' : ''}${shown ? ' has-img' : ''} ${className}`}
      style={{ '--s': `${size}px`, ...style }}
      aria-hidden="true"
    >
      <span className="wl-face-mono">{mono}</span>
      {src ? <PixelPic key={src} src={src} cells={cells} onReady={() => setReady(src)} /> : null}
    </span>
  )
}

export function Face({ handle, size = 30, resolve = true, lit = false, name = '', className = '', style }) {
  const named = isNameKey(handle)
  const p = useProfile(resolve && !named ? handle : '')
  const raw = String(handle || '').trim().replace(/^@+/, '')
  const said = named ? (name || nameFor(handle) || raw.slice(1)) : ''
  const mono = p ? monogram(p).slice(0, size < 24 ? 1 : 2)
    : named ? (size >= 40 || said.includes(' ') ? monogram({ name: said }) : said.slice(0, 1).toUpperCase())
    : raw.slice(0, size >= 40 ? 2 : 1).toUpperCase()
  return <PixelFace src={p?.avatar || ''} mono={mono} size={size} lit={lit} className={className} style={style} />
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
//
// A letter to a first name (0053) reads "for Sofia" and nothing under it:
// the name branch, with no handle to set on the second line.
export function Addressee({ handle, id, className = '' }) {
  const named = isNameKey(handle)
  const p = useProfile(named ? '' : handle)
  const name = named ? (nameFor(handle) || String(handle || '').trim().slice(1)) : (p?.name || '')
  const h = named ? '' : atHandle(handle)
  return (
    <span className={`wl-addressee ${className}`}>
      <span className="wl-addressee-line">
        <span className="wl-addressee-for" aria-hidden="true">for</span>
        <span className={`wl-addressee-name${name ? '' : ' is-h'}`} id={id}>
          {name || h || '\u00a0'}
          {p?.verified ? <Verified size={11} className="wl-who-badge" /> : null}
        </span>
      </span>
      {name && h ? <span className="wl-addressee-at">{h}</span> : null}
    </span>
  )
}

// ── the face, opened ────────────────────────────────────────────────────────
// A face on a letter can be pressed, and it opens the way a profile picture
// opens on Instagram: the picture, large, in the dark room, with the name
// and the handle under it, and a tap anywhere puts it away. Rendered at the
// wall's root rather than inside the sheet, because a sheet's glass is a
// containing block for anything fixed inside it and the picture has to
// stand over the whole screen; at the root and not the body, because the
// wall's type, colours and curves are declared there.
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
  // .wl-root has no transform, filter or contain, so fixed still pins to the
  // viewport, and z 70 there is over the sheets (50) and the cut (60) and
  // under the intro (90)
  const host = (source && source.current && source.current.closest('.wl-root')) || document.querySelector('.wl-root') || document.body
  return createPortal(
    <div
      className={`wl-viewer${from ? ' is-from' : ''}${closing ? ' is-closing' : ''}`}
      role="dialog" aria-modal="true" aria-label={`${name || atHandle(handle)}, the picture`}
    >
      <button type="button" className="wl-viewer-scrim" aria-label="close" onClick={close} />
      <div className="wl-viewer-in" onClick={close}>
        <span className="wl-viewer-disc" ref={disc}>
          <Face handle={handle} size={280} className="wl-viewer-face" style={{ '--s': 'min(78vw, 56svh, 380px)' }} />
        </span>
        <span className="wl-viewer-who">
          <span className={`wl-viewer-name${name ? '' : ' is-h'}`}>
            {name || atHandle(handle)}
            {p?.verified ? <Verified size={13} className="wl-who-badge" /> : null}
          </span>
          {name ? <span className="wl-viewer-at">{atHandle(handle)}</span> : null}
        </span>
      </div>
    </div>,
    host,
  )
}

// The face as a control: press it and it opens (FaceViewer) out of itself.
// One element on the paper, so the crest of a letter is the same disc it
// always was with a press on it, and the viewer rides on the caller's tree.
//
// A first name (0053) has no account and so no picture: its disc stands on
// the card as a monogram and is not a control.
export function OpenFace({ handle, size = 34, className = '' }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(null)
  const btn = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  const named = isNameKey(handle)
  const h = named ? String(handle || '').trim() : normHandle(handle)
  if (named) {
    return <span className={`wl-face-open is-still ${className}`}><Face handle={h} size={size} /></span>
  }
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
//
// A first name's key (0053) prints the name as written, in the name's own
// face, with no handle under it: the row for "Sofia" is a monogram, the
// word, and how many letters.
export function Who({ handle, size = 40, meta = null, className = '' }) {
  const named = isNameKey(handle)
  const p = useProfile(named ? '' : handle)
  const name = named ? (nameFor(handle) || String(handle || '').trim().slice(1)) : (p?.name || '')
  const under = [!named && name ? atHandle(handle) : '', meta].filter(Boolean).join(' · ')
  return (
    <span className={`wl-who ${className}`}>
      <Face handle={handle} size={size} />
      <span className="wl-who-id">
        <span className={`wl-who-name${name ? '' : ' is-h'}`}>
          {name || atHandle(handle)}
          {p?.verified ? <Verified size={11} className="wl-who-badge" /> : null}
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
      onClick={onClick} aria-label={on ? `your pings, ${atHandle(who.handle)}` : 'sign in'}
    >
      {on ? <Face handle={who.handle} size={22} /> : null}
      <span className={on ? 'wl-me-h' : undefined}>{on ? atHandle(who.handle) : 'sign in'}</span>
    </button>
  )
}

// ── the roll ────────────────────────────────────────────────────────────────
// A count set in the identifier face whose figures turn when it changes: each
// digit is a column of the ten, slid to the one it shows, so a letter arriving
// on the wall turns the last figure up one and a hundredth letter mounts a
// column at the head. It is drawn still on mount, at the number it is given,
// and moves only when the number does, so a figure moving means a letter went
// up. Under reduced motion the columns do not slide. The columns are keyed
// from the right, so a count going from 99 to 100 keeps the two it had.
// Read as one number: the digits are hidden from the tree and the roll
// carries the figure as its label.
function RollDigit({ digit }) {
  return (
    <span className="wl-roll-d">
      <span className="wl-roll-col" style={{ transform: `translate3d(0, ${-digit}em, 0)` }}>
        {DIGITS.map((d) => <span key={d}>{d}</span>)}
      </span>
    </span>
  )
}
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Roll({ value, className = '' }) {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  const digits = String(n).split('').map(Number)
  const len = digits.length
  return (
    <span className={`wl-roll ${className}`} role="img" aria-label={String(n)}>
      <span className="wl-roll-in" aria-hidden="true">
        {digits.map((d, i) => <RollDigit key={len - i} digit={d} />)}
      </span>
    </span>
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
//   none    no plate at all, for a host that already has a ground of its own:
//           the composer's body, which is the tabbed sheet the bookmark is
//           attached to and cannot have a second surface laid inside it. The
//           beam alone, clipped to the host's radius.
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
  const phone = usePhone()
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
  // A point of light running an edge is the room's way of saying "wait".
  // On the wall the phone says it, with its own blinking glyphs where the
  // answer will land (phone.css `.wl-settled-skel`), so no beam is drawn.
  if (phone) return null
  return (
    <span className={`wl-light is-${plate}${on ? ' is-on' : ''} ${className}`} aria-hidden="true">
      <span className="wl-light-beam" ref={beam} />
      {plate === 'star' ? <StarPlate />
        : plate === 'chalk' ? <span className="wl-plate is-chalk" aria-hidden="true" />
        : null}
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
        {/* the same small screen every person on the wall is: a picture that
            fails to load falls through to the monogram under it */}
        <PixelFace src={looking ? '' : at.avatar || ''} mono={mono} size={40} />
      </span>
      <span className="wl-card-id">
        <span className="wl-card-skel" aria-hidden="true">
          <span className="wl-card-bar" />
          <span className="wl-card-bar is-short" />
        </span>
        <span className="wl-card-real">
          <span className="wl-card-name">
            {name}
            {!looking && at.verified ? <Verified size={13} className="wl-card-badge" /> : null}
          </span>
          {under ? <span className="wl-card-at">{under}</span> : null}
        </span>
      </span>
      {pick ? <span className="wl-card-go" aria-hidden="true">&#8594;</span> : null}
    </Tag>
  )
}

// ── THE ANSWER, IN THE FIELD'S PLACE ────────────────────────────────────────
// What the resolver found, standing exactly where the handle was typed, inside
// the same body the field lives in (wall.css `.wl-write-body`): the same
// measure, the same ground, the same height. The field is not a field any more
// once the person has committed to a handle — it is a person — and a screen
// that draws the answer as a THIRD object under the tab and the field is a
// screen with three stacked boxes on it answering one question.
//
// ── it is one element in every state ────────────────────────────────────────
// Looking, found, and no-account are the same row, so the light going out and
// the answer arriving are one transition rather than a swap. While it is out,
// the point of light runs the body's own edge (`Light`) and two bars breathe
// where the name and the handle will land: not a spinner, which promises a
// computation, and not a shimmer, which is a pattern from a different product.
// The frame holds the height the answer takes, so nothing moves when it lands.
// Nothing is said in words beside it, because the light is the saying.
//
// The way back is an X and not an arrow. An arrow at the end of a row is a
// door: it says the row is the way on, and the way on is the capsule at the
// foot of the sheet, which is where every other act on this surface lives.
// What a person actually wants from this row is OUT of it — "that is not
// them, let me type again" — so the mark at its end is the close mark, the one
// this product already uses for exactly that, and pressing it hands the field
// back with the handle still in it.
//
// It draws, it does not ask: `at` comes from `useResolver` and nothing here
// reaches a server. `unknown` never gets here — the composer walks straight
// past an answer it could not get rather than telling somebody their friend
// does not exist.
export function Addressed({ at, onClear, looking = false, label = 'change who it is for', className = '' }) {
  const h = normHandle(at.handle)
  const missing = !looking && at.state !== 'found'
  const mono = looking ? '' : missing ? h.slice(0, 1).toUpperCase() : monogram(at)
  const name = missing ? 'no account by that name' : (at.name || `@${h}`)
  const under = missing || at.name ? `@${h}` : ''
  return (
    <div
      className={`wl-settled${looking ? ' is-looking' : ''}${missing ? ' is-missing' : ''} ${className}`}
      aria-live="polite" aria-busy={looking || undefined}
    >
      <span className="wl-settled-disc" aria-hidden="true">
        <PixelFace src={looking ? '' : at.avatar || ''} mono={mono} size={40} />
      </span>
      {/* the two states share one cell and cross fade: the words land where
          the bars were, and nothing moves */}
      <span className="wl-settled-id">
        <span className="wl-settled-skel" aria-hidden="true">
          <span className="wl-settled-bar" />
          <span className="wl-settled-bar is-short" />
        </span>
        <span className="wl-settled-real">
          <span className="wl-settled-name">
            {name}
            {!looking && at.verified ? <Verified size={15} className="wl-settled-badge" /> : null}
          </span>
          {under ? <span className="wl-settled-at">{under}</span> : null}
        </span>
      </span>
      {looking ? null : <Close onClick={onClear} label={label} className="wl-settled-clear" />}
    </div>
  )
}

// ── the foot of the site ────────────────────────────────────────────────────
// The same block under both walls, and (restated in legal.css, because a
// static page cannot import this) under the three legal pages: the lockup
// and the one sentence, the legal pages, and how to reach
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

// The one address on the foot that the wall draws itself: placing a ping,
// which is a sheet raised over the wall the foot is under. Given the shell's
// `go`, a plain click raises it in place rather than reloading the app; a
// modified click, a middle click and a copy still get a real anchor, to the
// same sheet on the same wall. Everything else here is a page of its own.
function inShell(go, name) {
  if (!go || !name) return undefined
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
    e.preventDefault()
    go(name)
  }
}

export function SiteFoot({ go = null, className = '' }) {
  const link = (to, text, name = '') => <a href={to} onClick={inShell(go, name)}>{text}</a>
  return (
    <footer className={`wl-colophon ${className}`}>
      <div className="wl-colophon-brand">
        <Brand href="/" />
        <p className="wl-colophon-line">if it&rsquo;s mutual, you both find out. if not, nobody ever knows.</p>
      </div>

      <nav className="wl-colophon-cols" aria-label="the rest of it">
        <div className="wl-colophon-col">
          <Label tone="dim">celestual</Label>
          {link(href('ping'), 'send a private note', 'ping')}
          {link(href('write'), 'write a letter', 'write')}
        </div>
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

// ── THE OWNER'S PARTS ───────────────────────────────────────────────────────
// Two small objects for the person who has claimed their @ (docs/ONE-WALL.md,
// api/alerts.js): the switch an alert is turned on with, and the field an
// alert's address is typed into. Styled in owner.css, in the phone's
// language, like everything else on the wall.
//
// There was a third, the toast that carried a removal's undo for five
// seconds at the foot of the glass, over the thread under the letter. The
// undo is the letter's own screen's now, for as long as it stands
// (screens/Letter.jsx `removedFace`), and the toast went with it.

// One setting, on or off: the sentence it is about, and a switch at its end.
// The whole row is the control, so the sentence is what is pressed.
export function Switch({ on = false, onChange, children, disabled = false, busy = false, className = '' }) {
  return (
    <button
      type="button" role="switch" aria-checked={!!on} aria-busy={busy || undefined}
      className={`wl-switch${on ? ' is-on' : ''}${busy ? ' is-busy' : ''} ${className}`}
      onClick={() => { if (!disabled && !busy && onChange) onChange(!on) }} disabled={disabled}
    >
      <span className="wl-switch-say">{children}</span>
      <span className="wl-switch-track" aria-hidden="true"><span className="wl-switch-knob" /></span>
    </button>
  )
}

// An address, whole: the gate's own field (`wl-addr`, screens/Gate.jsx) with
// nothing painted beside it, since an alert can go to any inbox.
export function EmailField({ value, onChange, onSubmit, autoFocus = false, label = 'your email address', placeholder = 'you@anywhere.com' }) {
  const ref = useRef(null)
  const phone = usePhone()
  useEffect(() => {
    if (!autoFocus || !ref.current) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) ref.current.focus()
  }, [autoFocus])
  return (
    <div className="wl-addr is-whole wl-owner-addr">
      <input
        ref={ref} className="wl-addr-in" value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit() } }}
        aria-label={label} placeholder={placeholder}
        type="email" inputMode="email" autoComplete="email"
        autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="send"
      />
      {phone ? <Caret of={ref} /> : null}
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

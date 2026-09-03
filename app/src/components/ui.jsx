// ui.jsx — CELESTUAL's parts, cut and finished.
//
// All colour comes from the single source of truth in ../theme.js — nothing
// defines its own hexes — and the whole product lives inside one leather case
// with the star chart engraved into it. See docs/DESIGN.md for the rules these
// components enforce.
//
// Two laws govern this file, and between them they are the design:
//
//   A CONTROL IS AN OBJECT. Not a rectangle with a hover state. A button is a
//   plate that has been pressed into leather and can be pressed further; a
//   field is a line you write on; a card is a seal. Each one has a top edge
//   that catches light and a bottom edge that does not, because that is what
//   tells a hand which way is up before it has read anything.
//
//   NOTHING GLOWS. Light in here is subtractive: the important thing is the one
//   closest to ivory, and the quiet thing is the one that has sunk back toward
//   the leather. That is the entire hierarchy system, and it is why a person who
//   cannot see colour reads this product exactly as well as a person who can.
import * as React from 'react'
import { GalaxyField } from '../galaxy.js'
import {
  makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS, FONT, SIZE, LINE, TRACK, ICON,
  TEXT, HAIR, ONSKY, LIGHT, FRAME, MEASURE, INDEX_W, GROUNDS, CARD_FACES, groundOf, sealLight,
} from '../theme.js'
import { leatherSurface, paperSurface, stitching } from '../texture.js'
import { searchHandles, normHandle } from '../api/celestual.js'

export {
  makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS, FONT, SIZE, LINE, TRACK, ICON,
  TEXT, HAIR, ONSKY, LIGHT, FRAME, MEASURE, INDEX_W, GROUNDS, CARD_FACES, groundOf, sealLight,
}

// One breakpoint in the whole product. Below it the case is a pocket edition:
// the same book, set narrower. Components ask for it rather than each screen
// re-deciding what "small" means.
export function useNarrow(px = 760) {
  const [narrow, setNarrow] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${px}px)`).matches,
  )
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    on()
    return () => mq.removeEventListener('change', on)
  }, [px])
  return narrow
}

// ── the one motion preference ────────────────────────────────────────────────
// Every animated thing in here has to ask the same question, and until now each
// one asked it its own way: `window.matchMedia(...).matches`, read straight
// through during render, in three different files. That is wrong twice. It is
// read at render time with no subscription, so somebody who turns the setting
// ON gets whatever the app happened to sample when the component first mounted
// and keeps the animation until a reload; and it touches `window` during render,
// which is the one place a component is not allowed to look at the outside
// world. One hook, one listener, one answer — and it is the switch every timing
// decision in the product now reads.
export function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduce(mq.matches)
    mq.addEventListener('change', on)
    on()
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}

// ── dialog accessibility ──────────────────────────────────────────────────────
// One shared hook for every overlay: moves focus in, traps Tab inside, closes on
// Escape, restores focus after. Attach the ref to the dialog element and give it
// role="dialog" aria-modal="true" tabIndex={-1}.
export function useDialog(onClose) {
  const ref = React.useRef(null)
  const closeRef = React.useRef(onClose)
  closeRef.current = onClose
  React.useEffect(() => {
    const prev = document.activeElement
    const el = ref.current
    const focusables = () =>
      el
        ? Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
            (x) => !x.disabled && x.offsetParent !== null,
          )
        : []
    const first = focusables()[0]
    ;(first || el)?.focus?.({ preventScroll: true })
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current && closeRef.current()
      } else if (e.key === 'Tab') {
        const list = focusables()
        if (!list.length) return
        const i = list.indexOf(document.activeElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          list[list.length - 1].focus()
        } else if (!e.shiftKey && i === list.length - 1) {
          e.preventDefault()
          list[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (prev && prev.focus) prev.focus({ preventScroll: true })
    }
  }, [])
  return ref
}

// ── the chart (the persistent backdrop) ───────────────────────────────────────
// The one backdrop for the whole product: a real 3D perspective-projected
// particle galaxy (galaxy.js), engraved into the cover of the case, slowly
// orbiting behind every screen and steerable with a whisper of pointer/tilt
// parallax. The sky here is not a picture behind the interface — it is the
// mechanism. A ping IS a star, you fly to it, and past a certain closeness it
// stops being a point of light and becomes the surface it was made of.
export function GalaxyCanvas({ mode = 'idle', dim, you, them, motion = 20, origin, seals = 0, sealLabels, sealKinds, onReady, style }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  React.useEffect(() => {
    const f = new GalaxyField(ref.current, { you, them, motion })
    field.current = f
    f.setMode(mode, { dim, origin })
    if (seals) f.setSeals(seals)
    if (sealLabels) f.setSealLabels(sealLabels)
    if (sealKinds) f.setSealKinds(sealKinds)
    f.start()
    if (onReady) onReady(f)
    if (import.meta.env.DEV) window.__galaxyField = f
    let ro
    let roRaf = 0
    if (window.ResizeObserver && ref.current && ref.current.parentElement) {
      // Coalesce a burst of resize callbacks (the mobile toolbar fires many as it
      // animates) into a single resize per frame.
      ro = new ResizeObserver(() => {
        if (roRaf) cancelAnimationFrame(roRaf)
        roRaf = requestAnimationFrame(() => f.resize())
      })
      ro.observe(ref.current.parentElement)
    }
    const r1 = requestAnimationFrame(() => f.resize())
    return () => {
      if (ro) ro.disconnect()
      if (roRaf) cancelAnimationFrame(roRaf)
      cancelAnimationFrame(r1)
      f.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    if (field.current) field.current.setMode(mode, { dim, origin })
  }, [mode, dim, origin])
  // The number of "sealed" stars resting in the disk — one per ping. Kept in sync
  // so a placed ping leaves a light in the chart behind the ledger.
  React.useEffect(() => {
    if (field.current) field.current.setSeals(seals)
  }, [seals])
  // The @ each star holds (device plaintext), so a focus dive can name it.
  React.useEffect(() => {
    if (field.current) field.current.setSealLabels(sealLabels || [])
  }, [sealLabels])
  // What light each ping's star burns with — measured off its card's ground.
  React.useEffect(() => {
    if (field.current) field.current.setSealKinds(sealKinds || [])
  }, [sealKinds])
  React.useEffect(() => {
    if (field.current) field.current.setPalette(you, them)
  }, [you, them])
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: TOKENS.ink, ...style }}
    />
  )
}


// ── the mark ─────────────────────────────────────────────────────────────────
// A four-pointed star, cut down the middle, with a body sitting in the cut.
//
// It is ONE drawing, used twice. The right wing is the star. The left wing is
// the SAME star turned a hundred and eighty degrees about the body — so the long
// point that reaches up on one side reaches down on the other, and the short
// point does the opposite. That is the whole construction, and it is why the
// mark leans without ever having been drawn on a slant: the two halves are
// identical, and neither one is level with the other.
//
// Two things about it are load-bearing and neither is decoration:
//
//   THE CUT IS THE GROUND. The hairline between the halves, and the crescent
//   where it opens out around the body, are not painted white — they are holes,
//   and what shows through them is whatever the mark is standing on. That is
//   what lets the artwork sit on a near-black case and on an ivory seal without
//   being redrawn: on ivory the cut is ivory, on the case the cut is the case.
//
//   THE BODY IS THE ONE LIGHT. The wings are the brand's ink; the disc in the
//   middle is the only warm thing in the drawing, on the same value ramp every
//   lit thing in this product sits on. An ivory star with a single caramel body
//   reads at fourteen pixels in a masthead and at four hundred on a specimen
//   sheet, and it never competes with the type beside it.
//
// The geometry is a trace of the original artwork, normalised so the mark is one
// hundred units across. Nothing in here is rounded to look tidy: the numbers are
// where the points actually landed.
const SIGIL = {
  w: 100,
  h: 121.2,
  cut: 50, //             the axis the two halves are parted on
  // the star: its centre, and how far each of the four points reaches
  cx: 50.9,
  cy: 55.6,
  up: 55.6,
  down: 40,
  side: 49.1,
  // the body, which is also the point the second wing is turned about
  bx: 50,
  by: 60.6,
  br: 11.6,
  // how far the concave edges are drawn in between two points. Small: this is a
  // star that has been pulled thin, not a four-lobed flower.
  pinch: 0.1,
}

// A four-pointed star with concave edges, as one closed path.
const starPath = (cx, cy, up, down, side, k) => {
  const x = side * k
  const u = up * k
  const d = down * k
  return (
    `M${cx} ${cy - up}` +
    `Q${cx + x} ${cy - u} ${cx + side} ${cy}` +
    `Q${cx + x} ${cy + d} ${cx} ${cy + down}` +
    `Q${cx - x} ${cy + d} ${cx - side} ${cy}` +
    `Q${cx - x} ${cy - u} ${cx} ${cy - up}Z`
  )
}

// ── the cuts ─────────────────────────────────────────────────────────────────
// The artwork's own inks, kept. An earlier cut of this file re-inked the mark
// into the interface's palette on the argument that a mid-brown sits within a
// few values of the case it stands on. That is true of a mid-brown and it is
// not true of THESE two: the light wing is nearly at the reading colour and the
// dark one sits a full value scale above the ground, so the drawing reads at
// fourteen pixels in the masthead and at four hundred on a specimen sheet
// without being adjusted for the surface underneath it.
//
// What is load-bearing is the artwork's ORDER — left wing light, right wing
// deep, and the body brighter and warmer than either. Invert it and the same
// geometry becomes a different mark: the long point that leads the eye stops
// being the one that reaches up, and the body stops reading as something lit
// and starts reading as a hole.
//
//   THE MARK     the artwork, as drawn. The default, and the only one used
//                anywhere the mark stands alone.
//   STRUCK IVORY one ink at two strengths for the wings and a third for the
//                body: no warm anywhere. For the rare place the mark has to sit
//                beside something else that is lit.
//   ON PAPER     for ivory grounds — the seal, a share card, print.
export const CUTS = [
  { id: 'lamp', name: 'the mark', left: ['#BFAAA1', 1], right: ['#8D7169', 1], body: ['#F2DCCC', '#DCB39A', '#BE8C71'] },
  { id: 'ivory', name: 'struck ivory', left: [TOKENS.cream, 0.96], right: [TOKENS.cream, 0.5], body: [TOKENS.cream, TOKENS.cream2, TOKENS.them] },
  { id: 'warm', name: 'the warm cut', left: [TOKENS.them, 1], right: [TOKENS.saddle, 1], body: ['#F2DCCC', '#DCB39A', '#BE8C71'] },
  { id: 'ink', name: 'on paper', left: [TOKENS.onPaper2, 1], right: [TOKENS.onPaper, 1], body: ['#DCB39A', '#BE8C71', TOKENS.saddle] },
]

const cutOf = (id) => CUTS.find((c) => c.id === id) || CUTS[0]

// `size` is the WIDTH. The mark is taller than it is wide — 1.212:1, the
// artwork's own proportion — and a caller that squares it off is cropping the
// long points, so the height is derived here and never asked for.
export function Sigil({ size = 26, cut = 'lamp', ground = TOKENS.ink, a = 1, style, title }) {
  const raw = React.useId()
  const id = `sg${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  const k = cutOf(cut)
  const g = SIGIL
  // The cut is a hairline in viewBox units, which means it thins to nothing on a
  // small mark. So it is floored in DEVICE pixels instead: about one, whatever
  // the mark is set at, which is exactly how a cut in a plate behaves.
  const w = Math.max(1.3, 110 / size)
  const ring = w * 1.9

  // the star, and the same star turned half a turn about the body
  const right = starPath(g.cx, g.cy, g.up, g.down, g.side, g.pinch)
  const left = starPath(2 * g.bx - g.cx, 2 * g.by - g.cy, g.down, g.up, g.side, g.pinch)

  return (
    <svg
      width={size}
      height={size * (g.h / g.w)}
      viewBox={`0 0 ${g.w} ${g.h}`}
      style={{ display: 'block', opacity: a, overflow: 'visible', flexShrink: 0, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={`${id}-l`}>
          <rect x={-10} y={-10} width={g.cut - w / 2 + 10} height={g.h + 20} />
        </clipPath>
        <clipPath id={`${id}-r`}>
          <rect x={g.cut + w / 2} y={-10} width={g.w + 10} height={g.h + 20} />
        </clipPath>
        {/* the body: light off the top-left shoulder, deepening across the face.
            A metal disc, not a gradient swatch — the third stop lifts again at
            the bottom edge, which is the light the surface it lies on throws
            back up at it. */}
        <linearGradient id={`${id}-b`} x1="0.12" y1="0.02" x2="0.86" y2="1">
          <stop offset="0%" stopColor={k.body[0]} />
          <stop offset="52%" stopColor={k.body[1]} />
          <stop offset="100%" stopColor={k.body[2]} />
        </linearGradient>
      </defs>

      {/* the left wing — the star, turned over — and then the right */}
      <path d={left} fill={k.left[0]} fillOpacity={k.left[1]} clipPath={`url(#${id}-l)`} />
      <path d={right} fill={k.right[0]} fillOpacity={k.right[1]} clipPath={`url(#${id}-r)`} />
      {/* where the cut opens out around the body. It is only ever on the LEFT:
          the right wing runs straight up to the body's limb, the way it does in
          the original, and that single asymmetry is most of what stops the mark
          reading as a diagram of a planet. */}
      <circle cx={g.bx} cy={g.by} r={g.br + ring} fill={ground} clipPath={`url(#${id}-l)`} />
      <circle cx={g.bx} cy={g.by} r={g.br} fill={`url(#${id}-b)`} />
    </svg>
  )
}

// The brand glyph, everywhere the product signs its own name. Kept under its old
// name so nothing has to be rewired; it is the Sigil now, and it does not glow.
export function Brandmark({ size = 22, cut = 'lamp', title = 'celestual' }) {
  return <Sigil size={size} cut={cut} title={title} />
}

// The one mark set large: the same drawing, at the size a screen makes its
// single claim at. It used to be a white core inside a blurred halo; nothing in
// this brand emits, so what makes it large now is that it IS large.
export function StarMark({ size = 88, cut = 'lamp' }) {
  return (
    <span style={{ display: 'inline-flex', width: size, justifyContent: 'center' }}>
      <Sigil size={size * 0.82} cut={cut} />
    </span>
  )
}

// ── the wordmark, and why it is just the mark ────────────────────────────────
// It used to be the mark with CELESTUAL set beside it in the garalde, on one
// baseline. The name came off. A wordmark that repeats itself on every screen
// of a product somebody has already opened is a business card stapled to every
// page, and the mark carries the name for anyone who has seen it once — which,
// by the second screen, is everyone.
//
// `sub` and `tone` are kept because callers pass them; both are ignored now,
// and the component is deliberately not renamed, because it is still the thing
// that signs the page.
export function Wordmark({ size = 15, cut = 'lamp' }) {
  return <Sigil size={size * 1.52} cut={cut} title="celestual" />
}

// ── the case ─────────────────────────────────────────────────────────────────
// The blind-tooled border every screen sits inside. A binder runs two fillets
// round a cover, a heavy one and a light one, and strikes a small mark where
// they turn the corner. It is barely visible and it is the reason the page has
// edges at all: without it a dark screen is a void, and with it the same dark
// screen is the inside of something.
export function Frame() {
  const mark = (x, y, sx, sy) => (
    <svg
      key={`${x}${y}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      style={{ position: 'absolute', [x]: FRAME.inset - 4, [y]: FRAME.inset - 4, transform: `scale(${sx},${sy})` }}
    >
      <path d="M0.5 8.5 L0.5 0.5 L8.5 0.5" fill="none" stroke={rgba(TOKENS.cream, 0.17)} strokeWidth="1" />
    </svg>
  )
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: FRAME.inset,
          border: `1px solid ${rgba(TOKENS.cream, 0.075)}`,
          boxShadow: '0 1px 0 rgba(0,0,0,0.35)',
        }}
      />
      <div style={{ position: 'absolute', inset: FRAME.inset2, border: `1px solid ${rgba(TOKENS.cream, 0.04)}` }} />
      {mark('left', 'top', 1, 1)}
      {mark('right', 'top', -1, 1)}
      {mark('left', 'bottom', 1, -1)}
      {mark('right', 'bottom', -1, -1)}
    </div>
  )
}

// ── the masthead ─────────────────────────────────────────────────────────────
// One bar across the head of EVERY page: the wordmark on the left, the way into
// the index on the right, both on the same baseline. It is the same object on
// every screen, which is the whole point — before it, the wordmark appeared on
// some screens and not others, the account sat in one floating corner chip and
// "log in" in the same corner on a different screen, and the two places the
// product has lived in a fixed bar at the foot. Four navigations, none of them
// aligned to anything.
//
// The bar itself is never a hit target. It spans the whole head of the page, and
// a transparent strip that eats clicks is worse than no bar.
export function Masthead({ C, open, onToggle, onHome, home, hidden }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(24px, calc(env(safe-area-inset-top) + 18px))',
        left: 'max(24px, calc(env(safe-area-inset-left) + 18px))',
        right: 'max(24px, calc(env(safe-area-inset-right) + 18px))',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACE.lg,
        pointerEvents: 'none',
        opacity: hidden ? 0 : 1,
        transition: 'opacity .45s ease',
      }}
    >
      <HomeMark onHome={onHome} here={home} hidden={hidden} />
      <IndexTab C={C} open={open} onToggle={onToggle} hidden={hidden} />
    </div>
  )
}

// The mark, and it is a way home. It sat here as decoration for a long time —
// the one thing on the page that looks exactly like the thing every other site
// puts a link under, and did nothing when pressed. A mark in a masthead is a
// door in every book anybody has read; leaving it shut is not restraint, it is
// a dead control.
//
// It answers the way the rest of this product answers: nothing glows, nothing
// bounces. The mark lifts a hair off the page under a hand and settles back
// when it goes, which is what a pressed plate does, and it is `aria-current`
// (not disabled) on the page it already leads to — still focusable, still says
// where you are, and pressing it there is simply a no-op rather than a history
// entry pointing at the screen you are on.
function HomeMark({ onHome, here, hidden }) {
  const [hot, setHot] = React.useState(false)
  const reduce = usePrefersReducedMotion()
  if (!onHome) return <Sigil size={26} cut="lamp" title="celestual" />
  return (
    <button
      type="button"
      onClick={() => !here && onHome()}
      aria-label="celestual — the front page"
      aria-current={here ? 'page' : undefined}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onBlur={() => setHot(false)}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        // the hit target a thumb needs, hung off the mark's own top-left so the
        // glyph stays exactly where the bar has always set it
        margin: '-10px -12px -10px -10px',
        padding: '10px 12px 10px 10px',
        cursor: here ? 'default' : 'pointer',
      }}
    >
      {/* no `title` here: the button carries the accessible name, and a labelled
          image inside a labelled control is the same thing announced twice */}
      <Sigil
        size={26}
        cut="lamp"
        style={{
          transform: hot && !here && !reduce ? 'translateY(-1px)' : 'none',
          opacity: hot && !here ? 1 : 0.94,
          transition: reduce ? 'opacity .2s linear' : 'transform .22s cubic-bezier(.16,.84,.28,1), opacity .2s linear',
        }}
      />
    </button>
  )
}

// The way in. The mark beside it is three ruled entries — an index, drawn the
// way an index is set — and the short line moves when it opens, like a finger
// keeping the place. It is the only thing in the bar that changes.
function IndexTab({ C, open, onToggle, hidden }) {
  const [hot, setHot] = React.useState(false)
  const lit = (C && C.star) || TOKENS.star
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'close the index' : 'the index'}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '10px 0 10px 14px',
        color: open || hot ? TEXT.read : TEXT.quiet,
        transition: 'color .2s linear',
      }}
    >
      {/* three ruled entries — an index, drawn the way an index is set. The
          short line moves when it opens, like a finger keeping the place. The
          word "INDEX" used to sit beside it and has gone: a glyph that has to
          be captioned is the wrong glyph, and this one is not.

          The line grows on a SCALE rather than on `width`. It is three one-pixel
          bars and it would be easy to call the difference academic, except that
          this control sits in the masthead of every screen, over a canvas that
          repaints continuously — and a width transition is a layout on each of
          its frames, which is the one kind of work that cannot be handed to the
          compositor. Scaled from the left edge it is the same line arriving the
          same way, for nothing. */}
      <span aria-hidden style={{ display: 'block', width: 20, flex: '0 0 auto' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'block',
              height: 1,
              marginTop: i ? 5 : 0,
              width: '100%',
              transformOrigin: 'left center',
              transform: `scaleX(${(open ? i === 1 : i !== 1) ? 1 : 0.56})`,
              background: open ? lit : 'currentColor',
              transition: 'transform .3s cubic-bezier(.16,.84,.28,1), background .2s linear',
            }}
          />
        ))}
      </span>
    </button>
  )
}

// ── the index ────────────────────────────────────────────────────────────────
// Not a menu that appears over the page: a COLUMN the page makes room for. It
// takes its width out of the setting, the setting re-centres in what is left,
// and the two move together — which is the difference between opening a drawer
// and having something drop on top of your work. On a phone there is no width
// to give away, so the column is the whole measure and the page steps aside.
//
// It has no panel, no fill and no trim. What separates it from the page is one
// tooled channel down its left edge, exactly the rule the rest of the product is
// divided with, and a wash of the ground itself deep enough to read type over
// the chart.
//
// ── what came off it, and why ────────────────────────────────────────────────
// A numbered entry, a note under every line, a heading over the list and a
// colophon at its foot. All four were the same mistake: an index in a BOOK is
// numbered because a book has chapters in a fixed order and the number is how
// you find one. A product has four places and you are already in one of them.
// Numbering them said "you are reading a chapter", which is a claim about the
// thing rather than a way of getting around it, and the notes turned four words
// into eight lines of small print nobody asked for.
//
// So: four lines, set at reading size, in the order somebody actually needs
// them. That is the whole component.
export function IndexColumn({ C, open, items, screen, go, narrow }) {
  const lit = (C && C.star) || TOKENS.star
  return (
    <nav
      aria-label="menu"
      aria-hidden={open ? undefined : true}
      // React 19 takes `inert` as a real boolean. The empty string that used to
      // stand for "present" here now reads as false, so the closed column stayed
      // reachable by keyboard AND logged a console error on every render of it.
      inert={!open}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: narrow ? '100%' : INDEX_W,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingRight: `max(${SPACE.xl}px, calc(env(safe-area-inset-right) + ${SPACE.lg}px))`,
        paddingLeft: narrow ? `max(${SPACE.xl}px, calc(env(safe-area-inset-left) + ${SPACE.lg}px))` : SPACE.xl,
        background: narrow
          ? `linear-gradient(90deg, ${rgba(TOKENS.ink, 0.88)} 0%, ${rgba(TOKENS.ink, 0.96)} 30%, ${rgba(TOKENS.ink, 0.96)} 100%)`
          : `linear-gradient(90deg, ${rgba(TOKENS.ink, 0.3)} 0%, ${rgba(TOKENS.ink, 0.88)} 20%, ${rgba(TOKENS.ink, 0.96)} 100%)`,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
        transition: open
          ? 'transform .46s cubic-bezier(.16,.84,.28,1), opacity .3s ease'
          : 'transform .46s cubic-bezier(.16,.84,.28,1), opacity .3s ease, visibility 0s linear .46s',
        overflowY: 'auto',
      }}
    >
      {/* the tooled channel: the same two pixels every rule in here is made of,
          stood on end */}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: `linear-gradient(90deg, ${HAIR.tooledDark} 0 1px, ${HAIR.tooledLight} 1px 2px)`,
        }}
      />

      {items.map((it) => {
        const on = it.key === screen
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => go(it)}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE.sm,
              width: '100%',
              textAlign: 'left',
              padding: '15px 0',
              color: on ? TEXT.read : TEXT.quiet,
              fontFamily: FONT.serif,
              fontWeight: 300,
              fontSize: 26,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              transition: 'color .2s linear',
            }}
          >
            {it.name}
            {on && <span aria-hidden className="lamp" style={{ width: 5, height: 5, borderRadius: '50%', background: lit, flex: '0 0 auto' }} />}
          </button>
        )
      })}
    </nav>
  )
}


// ── the send-off ─────────────────────────────────────────────────────────────
// A fixed, pointer-transparent overlay pinned exactly over the @ field. The
// field presses down to the point of light the star launches from, so the
// hand-off from the page to the chart has nothing visible in it: no ignition, no
// diffraction spikes, no bloom. A die comes down, and what was written on the
// page is in the sky. Torn down by App after ~1.3s.
export function Liftoff({ C, handle, geom }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 402
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700
  const cx = geom?.cx ?? vw / 2
  const cy = geom?.cy ?? vh * 0.42
  const w = geom?.w ?? Math.min(360, vw - 48)
  const h = geom?.h ?? 60
  const lit = (C && C.star) || TOKENS.star
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
      <div
        className="lift-off"
        style={{
          position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 3,
          borderBottom: `1px solid ${rgba(lit, 0.8)}`,
        }}
      >
        <span style={{ fontFamily: FONT.mono, fontSize: Math.min(22, h * 0.36), color: rgba(lit, 0.85) }}>@</span>
        <span style={{ fontFamily: FONT.mono, fontSize: Math.min(22, h * 0.36), color: TOKENS.cream, whiteSpace: 'nowrap' }}>{handle}</span>
      </div>
    </div>
  )
}

// ── surfaces ─────────────────────────────────────────────────────────────────
// A leather panel, stitched. The stitch is the tell: it is the one detail that
// says a hand made the object, and it is why every leather good has one.
//
// Kept under its old name (`GlassPanel`) because half the product mounts one,
// but there is no glass in it any more and no backdrop filter either. A
// translucent blurred slab is the single most-copied surface in software; a
// grained hide with a saddle stitch round it is not.
export function GlassPanel({ C, children, style, inset = false, stitched, ...rest }) {
  const stitch = stitched != null ? stitched : !inset
  return (
    <div
      {...rest}
      style={{
        position: 'relative',
        ...leatherSurface(inset ? TOKENS.ink2 : TOKENS.ink3),
        borderRadius: RADIUS.card,
        border: `1px solid ${inset ? HAIR.faint : HAIR.mid}`,
        boxShadow: inset ? LIGHT.well : LIGHT.rest,
        ...style,
      }}
    >
      {/* The stitch is ABSOLUTE and therefore out of flow, which is the only
          reason it can sit here beside the children rather than wrapping them.
          Wrapping them is what a first cut of this did, and it silently broke
          every call site that passes its own `display: flex` and `gap` in
          `style`: the layout then applied to the wrapper and the real children
          stacked inside it with no gaps at all. A panel is a surface; it does
          not get to change how what is on it is laid out. */}
      {stitch && <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: RADIUS.card, pointerEvents: 'none', ...stitching() }} />}
      {children}
    </div>
  )
}

// Kept as an explicit name too, because "panel" is what it is.
export const Panel = GlassPanel

// ── the three type registers, as components ──────────────────────────────────
// EVERY piece of text in the product goes through one of these. Nothing inline
// picks its own size, face or leading: that drift is exactly what made the same
// idea look like three different products on three different screens.

// Display: the one headline a screen is allowed. A garalde, set large and
// light, with the leading pulled tight — which is why it reads as a title page
// rather than as a hero section.
export function Display({ C, children, color, align = 'left', style }) {
  return (
    <h1
      style={{
        margin: 0, fontFamily: FONT.serif, fontWeight: 300,
        fontSize: SIZE.display, lineHeight: LINE.tight, letterSpacing: TRACK.title,
        color: color || (C ? C.cream : TOKENS.cream),
        textAlign: align, textWrap: 'balance', ...style,
      }}
    >
      {children}
    </h1>
  )
}

// Title: a section's or a sheet's headline — one step under Display.
export function Title({ C, children, color, align = 'left', as = 'h2', style }) {
  const Tag = as
  return (
    <Tag
      style={{
        margin: 0, fontFamily: FONT.serif, fontWeight: 400,
        fontSize: SIZE.title, lineHeight: 1.06,
        color: color || (C ? C.cream : TOKENS.cream),
        textAlign: align, textWrap: 'balance', ...style,
      }}
    >
      {children}
    </Tag>
  )
}

// ── everything under the headline carries the ground ─────────────────────────
// ONSKY started life as a fix for the two QUIETEST registers, on the argument
// that a stamped label and a Courier tick are set at well under half strength
// and vanish the moment one crosses the galactic centre.
//
// The rest of the setting needs it for the same reason, and it needs it now
// rather than then: with paper reserved for the seal and the plate, every line
// of body copy in this product is set DIRECTLY on the chart. There is no panel
// under it any more. So the halo goes on everything at reading size and under —
// it is a tight, soft wash of the case's own colour, invisible where there is
// nothing bright behind the type, and the difference between legible and not
// over the core.
//
// The two display steps deliberately opt out. A garalde set at forty-odd pixels
// is legible over anything, and a shadow under high stroke contrast at that size
// thickens the hairlines and muddies the face.

// Lead: a spoken serif line, under a title or on the case itself.
export function Lead({ C, children, color, size = SIZE.lead, italic = true, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.serif, fontStyle: italic ? 'italic' : 'normal', fontWeight: 400,
        fontSize: size, lineHeight: 1.42, color: color || (C ? C.cream : TOKENS.cream),
        textShadow: ONSKY, ...style,
      }}
    >
      {children}
    </span>
  )
}

// Body / Small: the mechanical register. Jost 300, because a geometric sans set
// light is the hand this product writes its instructions in.
export function Body({ C, children, color, align, style }) {
  return (
    <p style={{ margin: 0, fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.body, lineHeight: LINE.body, color: color || (C ? C.muted : TOKENS.muted), textAlign: align, textShadow: ONSKY, ...style }}>
      {children}
    </p>
  )
}

export function Small({ C, children, color, align, style }) {
  return (
    <p style={{ margin: 0, fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.6, color: color || (C ? C.muted : TOKENS.muted), textAlign: align, textShadow: ONSKY, ...style }}>
      {children}
    </p>
  )
}

// Kicker: the stamped label. Uppercase Jost, tracked wide enough that it reads
// as a caption printed on a plate rather than as small text. It carries the
// ground with it (ONSKY) so it survives crossing the galactic centre.
export function Kicker({ C, children, color, micro, onPaper, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.sans, fontWeight: 400,
        fontSize: micro ? SIZE.micro : SIZE.meta,
        letterSpacing: micro ? TRACK.micro : TRACK.meta,
        textTransform: 'uppercase',
        color: color || (onPaper ? TOKENS.onPaper2 : TEXT.faint),
        textShadow: onPaper ? undefined : ONSKY,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Label — the same register under the name the design system uses for it.
export const Label = Kicker

// Mono: metadata that is NOT a label — counts, clocks, codes, dates. Courier,
// never uppercased, and never allowed to carry a feeling.
export function Mono({ C, children, color, size = SIZE.meta, onPaper, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.mono, fontSize: size, letterSpacing: TRACK.tick,
        color: color || (onPaper ? TOKENS.onPaper3 : TEXT.faint),
        textShadow: onPaper ? undefined : ONSKY,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Tick — the same register under the design system's name for it.
export const Tick = Mono

// Serif kept as a thin alias so older call sites keep rendering in one register.
export function Serif({ C, children, size = SIZE.lead, italic = true, color, style }) {
  return (
    <span style={{ fontFamily: FONT.serif, fontStyle: italic ? 'italic' : 'normal', fontWeight: 400, fontSize: size, lineHeight: 1.42, color: color || (C ? C.cream : TOKENS.cream), ...style }}>
      {children}
    </span>
  )
}

// A tooled rule: the dark channel the tool cut, and the light catching on its
// upper lip. Two pixels doing the work of a border, and the reason a divider in
// here reads as pressed into the case rather than drawn on top of it.
export function Rule({ C, width = '100%', delay = 0, style }) {
  return (
    <span
      aria-hidden
      className="tool-rule"
      style={{
        display: 'block', width, height: 2,
        background: `linear-gradient(180deg, ${HAIR.tooledDark} 0 1px, ${HAIR.tooledLight} 1px 2px)`,
        animationDelay: delay ? `${delay}s` : undefined,
        ...style,
      }}
    />
  )
}

// ── the head of a screen ─────────────────────────────────────────────────────
// A way back, a kicker, and a rule. The same three objects on every screen, in
// the same place, so the product has a masthead instead of a navbar.
//
// The kicker is optional, and a screen should drop it whenever the headline
// underneath already says the same thing. A page that has to introduce itself
// has a headline that is not working.
export function ScreenHeader({ C, onBack, label, right, style }) {
  return (
    <div style={{ marginBottom: SPACE.md, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, marginBottom: SPACE.sm, flexWrap: 'wrap', minHeight: 24 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, minWidth: 0 }}>
          {onBack ? <BackBtn C={C} onClick={onBack} /> : null}
          {typeof label === 'string' ? <Kicker C={C}>{label}</Kicker> : label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>{right}</span>
      </div>
      <Rule C={C} />
    </div>
  )
}

// A quiet note under a field or an action. No icon, no bullet, no chrome: the
// hush is the whole treatment.
export function Note({ C, children, tone, align, style }) {
  return (
    <p
      style={{
        margin: 0, padding: '0 2px', fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small,
        lineHeight: LINE.body, textAlign: align,
        color: tone === 'accent' ? (C ? C.star : TOKENS.star) : tone === 'quiet' ? TEXT.faint : TEXT.quiet,
        textShadow: ONSKY,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

// ── the plates (buttons) ─────────────────────────────────────────────────────
// A letterpress plate: ivory stock, the label struck into it, a keyline printed
// inside the trim. Pressing it pushes it into the leather by one pixel and takes
// the light off its top edge, which is the whole animation. There is no hover
// glow, no lift, no gradient sweep.
function usePress() {
  const [down, setDown] = React.useState(false)
  return {
    down,
    handlers: {
      onPointerDown: () => setDown(true),
      onPointerUp: () => setDown(false),
      onPointerLeave: () => setDown(false),
      onPointerCancel: () => setDown(false),
    },
  }
}

export function Plate({ children, onClick, disabled, full = true, tone = 'ivory', style, ...rest }) {
  const { down, handlers } = usePress()
  const dark = tone === 'leather'
  // A disabled plate is not a faded plate. Dropping a paper object to a third of
  // its opacity over brown leather gives a dead grey slab, which is both ugly
  // and a lie about the material. An unstruck plate is simply the OUTLINE of
  // one: the trim scored into the leather, nothing printed on it yet.
  //
  // It carries a little of the ground with it, though. A scored recess with
  // NOTHING in it lands wherever the chart happens to be, and the one time it
  // lands on the galactic centre the outline and its label both vanish into the
  // light. The fill is the case's own colour, deepened the way a recess deepens.
  const surface = disabled ? { background: rgba(TOKENS.ink, 0.5) } : dark ? leatherSurface(TOKENS.ink4) : paperSurface(TOKENS.paper)
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...handlers}
      {...rest}
      style={{
        position: 'relative',
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACE.sm,
        padding: '17px 30px',
        border: disabled ? `1px solid ${rgba(TOKENS.cream, 0.16)}` : '1px solid transparent',
        borderRadius: RADIUS.field,
        ...surface,
        color: disabled ? rgba(TOKENS.cream, 0.42) : dark ? TOKENS.cream : TOKENS.onPaper,
        boxShadow: disabled
          ? LIGHT.well
          : down
            ? LIGHT.pressed
            : `0 1px 0 ${rgba('#FFFFFF', dark ? 0.06 : 0.5)} inset, 0 -1px 0 rgba(0,0,0,${dark ? 0.4 : 0.18}) inset, 0 9px 22px rgba(0,0,0,0.44)`,
        transform: down && !disabled ? 'translateY(1px)' : 'translateY(0)',
        transition: 'transform .1s linear, box-shadow .12s linear',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: 1,
          border: `1px solid ${disabled ? rgba(TOKENS.cream, 0.07) : dark ? rgba(TOKENS.cream, 0.13) : rgba(TOKENS.onPaper, 0.18)}`,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: SPACE.sm,
          fontFamily: FONT.sans,
          fontWeight: 400,
          fontSize: 11.5,
          letterSpacing: TRACK.meta,
          textTransform: 'uppercase',
          textShadow: disabled ? ONSKY : dark ? '0 1px 0 rgba(0,0,0,.45)' : '0 1px 0 rgba(255,255,255,.5)',
        }}
      >
        {children}
      </span>
    </button>
  )
}

// A screen gets ONE primary, and it is the struck ivory plate.
export function PrimaryButton({ C, children, onClick, disabled, style }) {
  return (
    <Plate onClick={onClick} disabled={disabled} style={style}>
      {children}
    </Plate>
  )
}

// The alternative to it: the same plate, struck into the leather instead of
// printed on paper. Same corner, same trim, so a stacked pair reads as one
// column rather than as a button and a pill.
export function OutlineButton({ C, children, onClick, style }) {
  return (
    <Plate tone="leather" onClick={onClick} style={{ padding: '15px 26px', ...style }}>
      {children}
    </Plate>
  )
}

// The quiet exit. Not a ghost button: a line of type with a hairline under it,
// which is what a footnote reference looks like and exactly the weight this
// deserves.
export function GhostButton({ C, children, onClick, style }) {
  const [hot, setHot] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        padding: '4px 0',
        background: 'none',
        border: 0,
        color: hot ? TEXT.read : TEXT.quiet,
        transition: 'color .2s linear',
        ...style,
      }}
    >
      <span style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 'inherit', letterSpacing: '0.04em', textShadow: ONSKY }}>{children}</span>
      <span
        aria-hidden
        style={{
          height: 1,
          width: '100%',
          background: hot ? rgba(TOKENS.cream, 0.4) : rgba(TOKENS.cream, 0.16),
          transition: 'background .2s linear',
        }}
      />
    </button>
  )
}

export const Quiet = GhostButton

// The row a screen's exits live on, so "not now" / "your pings" / "leave" never
// again sit at three different offsets on three different screens.
export function ExitRow({ C, children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.lg, flexWrap: 'wrap', ...style }}>
      {children}
    </div>
  )
}

// ── the ruled line (the field) ───────────────────────────────────────────────
// You do not type into a box in here. You write on a line, under a printed
// caption, with the @ already set in front of it in the typewriter face the rest
// of the metadata uses. A box with a 16px radius and a focus glow is the single
// most generic object in software; a ruled line is a form somebody printed.
//
// `kind` is kept from the old field so nothing has to change at the call sites:
// 'handle' prints the @, 'email' and 'text' do not.
export function Field({ C, kind = 'handle', value, onChange, placeholder, autoFocus, onEnter, emphasis, scale, label, onPaper, ...rest }) {
  const ref = React.useRef(null)
  const [focus, setFocus] = React.useState(false)
  const lit = (C && C.star) || TOKENS.star
  const ink = onPaper ? TOKENS.onPaper : TOKENS.cream
  const rule = onPaper
    ? focus ? rgba(TOKENS.onPaper, 0.55) : rgba(TOKENS.onPaper, 0.22)
    : focus ? rgba(lit, 0.8) : rgba(TOKENS.cream, 0.24)
  React.useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])
  const clean = (v) =>
    kind === 'email' ? v.replace(/\s/g, '') : kind === 'handle' ? v.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase() : v
  // Three steps, and the third exists for exactly one field: the @ on the send
  // screen. That line is the entire act — it is what the headline above it is
  // asking for — and taking it at the same 22px as an email address made the
  // most important thing on the screen the third-largest thing on it. It is
  // fluid rather than fixed, because a handle can be thirty characters and a
  // phone is 390px wide: it opens up to a display size on a laptop and settles
  // back to something a long @ still fits on inside a small window.
  const fs = scale === 'hero' ? 'clamp(26px, 7.6vw, 40px)' : emphasis ? 22 : 17
  const nudge = scale === 'hero' ? -2 : -1
  return (
    <label style={{ display: 'block', width: '100%' }}>
      {label && (
        <Kicker C={C} onPaper={onPaper} style={{ display: 'block', marginBottom: SPACE.sm }}>
          {label}
        </Kicker>
      )}
      <div
        onClick={() => ref.current && ref.current.focus()}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 3, paddingBottom: 9,
          borderBottom: `1px solid ${rule}`, transition: 'border-color .18s linear',
        }}
      >
        {kind === 'handle' && (
          <span style={{ fontFamily: FONT.mono, fontSize: fs, color: onPaper ? rgba(TOKENS.onPaper, 0.42) : rgba(lit, 0.85), transform: `translateY(${nudge}px)` }}>@</span>
        )}
        <input
          ref={ref}
          className={onPaper ? 'ph-ink' : 'ph-ivory'}
          type={kind === 'email' ? 'email' : 'text'}
          inputMode={kind === 'email' ? 'email' : 'text'}
          value={value}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange && onChange(clean(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter()
          }}
          placeholder={placeholder}
          {...rest}
          style={{
            flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent',
            fontFamily: kind === 'handle' ? FONT.mono : FONT.sans,
            fontWeight: kind === 'handle' ? 400 : 300,
            fontSize: fs, letterSpacing: '0.02em', color: ink, padding: 0,
            caretColor: onPaper ? TOKENS.onPaper : lit,
          }}
        />
      </div>
    </label>
  )
}

// Kept under the design system's own name.
export const Ruled = Field

// A handle, stamped. Not a pill: the @ in the typewriter face, the name beside
// it, and a hairline under the pair — the way a name is written on a form.
export function HandleChip({ C, handle, big }) {
  const lit = (C && C.star) || TOKENS.star
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 2, maxWidth: '100%',
        padding: big ? '4px 0 6px' : '2px 0 4px',
        borderBottom: `1px solid ${rgba(TOKENS.cream, 0.22)}`,
        fontFamily: FONT.mono, fontSize: big ? 19 : 14, color: TOKENS.cream,
      }}
    >
      <span style={{ color: lit }}>@</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{handle}</span>
    </span>
  )
}

// Instagram-style @ search: the ruled field with an optional live typeahead
// under it. Results come from the pluggable searchHandles() adapter — empty
// until a server-side provider is wired. The list is a leaf of the index rather
// than a floating menu: a wash of the ground, one tooled rule at its head.
export function HandleSearchField({ C, value, onChange, placeholder, autoFocus, onEnter, label, scale }) {
  const [results, setResults] = React.useState([])
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const seq = React.useRef(0)
  React.useEffect(() => {
    const q = normHandle(value)
    if (q.length < 2) {
      setResults([])
      return
    }
    const my = ++seq.current
    const id = setTimeout(async () => {
      const r = await searchHandles(q)
      if (my === seq.current) {
        setResults(r)
        setActive(-1)
      }
    }, 220)
    return () => clearTimeout(id)
  }, [value])
  const show = open && results.length > 0
  const pick = (h) => {
    onChange(normHandle(h))
    setResults([])
    setOpen(false)
  }
  return (
    <div style={{ position: 'relative' }} onFocusCapture={() => setOpen(true)}>
      <Field
        C={C}
        kind="handle"
        label={label}
        value={value}
        onChange={(v) => {
          onChange(v)
          setOpen(true)
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        emphasis
        scale={scale}
        onEnter={() => {
          if (show && active >= 0) pick(results[active].handle)
          else if (onEnter) onEnter()
        }}
      />
      {show && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 25,
            background: `linear-gradient(180deg, ${rgba(TOKENS.ink, 0.97)}, ${rgba(TOKENS.ink, 0.99)})`,
            borderTop: `1px solid ${HAIR.strong}`, borderBottom: `1px solid ${HAIR.faint}`,
            boxShadow: makeShadow(C || TOKENS).menu,
            maxHeight: 280, overflowY: 'auto',
          }}
        >
          {results.map((r, i) => (
            <button
              key={r.handle}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r.handle)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: SPACE.sm, padding: '11px 12px',
                background: i === active ? rgba(TOKENS.cream, 0.05) : 'transparent',
                border: 0, borderBottom: `1px solid ${HAIR.faint}`, textAlign: 'left',
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: rgba(TOKENS.cream, 0.07), display: 'grid', placeItems: 'center' }}>
                {r.avatar ? (
                  <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: TEXT.faint, fontFamily: FONT.mono, fontSize: 13 }}>@</span>
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: TOKENS.cream, fontFamily: FONT.mono, fontSize: 14 }}>
                  {r.handle}
                  {r.verified && <Icon name="check" size={12} color={TOKENS.star} stroke={1.4} />}
                </span>
                {r.full_name && <span style={{ display: 'block', fontFamily: FONT.sans, fontWeight: 300, color: TEXT.faint, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── state, without a colour ──────────────────────────────────────────────────
// Three states and no hue between them. A standing ping is a filled mark that
// breathes; a waiting one is an open dashed mark; a mutual is the joined pair.
// Somebody who cannot see colour reads this exactly as well as somebody who
// can, which is the accidental benefit of a monochrome brand and a good reason
// to keep it.
export function Mark({ C, state = 'waiting', size = 11 }) {
  const lit = (C && C.star) || TOKENS.star
  if (state === 'mutual') {
    return (
      <svg width={size * 1.9} height={size} viewBox="0 0 21 11" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
        <line x1="6" y1="5.5" x2="15" y2="5.5" stroke={rgba(lit, 0.7)} strokeWidth="1" />
        <circle cx="6" cy="5.5" r="3.1" fill={lit} />
        <circle cx="15" cy="5.5" r="2.5" fill={TOKENS.cream} />
      </svg>
    )
  }
  const filled = state === 'standing'
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" aria-hidden style={{ display: 'block', flexShrink: 0 }} className={filled ? 'lamp' : ''}>
      <circle
        cx="5.5"
        cy="5.5"
        r="3.4"
        fill={filled ? lit : 'none'}
        stroke={filled ? 'none' : rgba(TOKENS.cream, 0.4)}
        strokeWidth="1"
        strokeDasharray={filled ? '' : '2 2'}
      />
    </svg>
  )
}

// Kept under the old name so every ping row keeps rendering.
export const StateDot = Mark

// The lamp somebody left on: what a screen shows while it is waiting on
// something outside itself. It breathes in LUMINOSITY and never in scale — a
// pulsing dot is a notification badge, and expanding rings are a radar.
export function Sonar({ C, color, size = 16 }) {
  const col = color || (C && C.star) || TOKENS.star
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      <span aria-hidden style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: `1px solid ${rgba(col, 0.28)}` }} />
      <span className="lamp" style={{ width: size * 0.38, height: size * 0.38, borderRadius: '50%', background: col }} />
    </span>
  )
}

// ── the slot meter ───────────────────────────────────────────────────────────
// Slots drawn as notches cut in a strip. It is a physical counter (a punch card,
// a ration book) rather than a progress bar, and it is legible at a glance
// without a number, which is what a meter is for.
export function Slots({ C, used = 0, cap = 2, style }) {
  const lit = (C && C.star) || TOKENS.star
  return (
    <span style={{ display: 'inline-flex', gap: 4, ...style }}>
      {Array.from({ length: Math.max(0, cap) }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 17,
            height: 7,
            borderRadius: 1,
            background: i < used ? lit : 'transparent',
            border: `1px solid ${i < used ? 'transparent' : rgba(TOKENS.cream, 0.22)}`,
            boxShadow: i < used ? 'inset 0 -1px 0 rgba(0,0,0,.3)' : LIGHT.well,
          }}
        />
      ))}
    </span>
  )
}

// A row of choices that are MATERIALS, not options. Each swatch is the real
// surface at the real texture, so choosing is looking at the thing rather than
// reading its name.
export function Swatches({ C, items, value, onChange, size = 46, round = true }) {
  const lit = (C && C.star) || TOKENS.star
  return (
    <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
      {items.map((it) => {
        const on = it.id === value
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            title={it.name}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 0 }}
          >
            <span
              style={{
                display: 'block',
                width: size,
                height: size,
                borderRadius: round ? '50%' : RADIUS.field,
                ...(it.surface || {}),
                boxShadow: on
                  ? `0 0 0 1px ${lit}, 0 0 0 4px ${rgba(lit, 0.16)}, ${LIGHT.leaf}`
                  : `0 0 0 1px ${rgba(TOKENS.cream, 0.14)}, 0 4px 12px rgba(0,0,0,.4)`,
                transition: 'box-shadow .16s linear',
              }}
            />
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: 9.5,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: on ? lit : TEXT.faint,
                textShadow: ONSKY,
              }}
            >
              {it.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// The way back: an arrow drawn as one rule with two barbs, and the word. Not a
// circle with a chevron in it — the only circle in this product is the seal.
export function BackBtn({ C, onClick, label = 'back' }) {
  const [hot, setHot] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 0',
        background: 'none', border: 0,
        color: hot ? TEXT.read : TEXT.faint,
        fontFamily: FONT.mono, fontSize: 11, letterSpacing: TRACK.tick,
        textShadow: ONSKY, transition: 'color .2s linear',
      }}
    >
      <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden>
        <path d="M0.5 4 L15.5 4 M0.5 4 L4 1 M0.5 4 L4 7" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      {label}
    </button>
  )
}

// The logged-out counterpart to ProfileButton: a stamped label in the corner, so
// returning people have an obvious, always-visible way back to their pings.
export function LoginButton({ C, label, onClick }) {
  const [hot, setHot] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 0',
        background: 'none', border: 0, borderBottom: `1px solid ${hot ? rgba(TOKENS.cream, 0.4) : rgba(TOKENS.cream, 0.16)}`,
        color: hot ? TEXT.read : TEXT.quiet,
        fontFamily: FONT.sans, fontWeight: 400, fontSize: SIZE.meta,
        letterSpacing: TRACK.meta, textTransform: 'uppercase', textShadow: ONSKY,
        transition: 'color .2s linear, border-color .2s linear',
      }}
    >
      {label}
    </button>
  )
}

// The signed-in chip: the mark and your @, tucked in a corner, on one baseline.
export function ProfileButton({ C, handle, onClick }) {
  const [hot, setHot] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="account"
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 0', maxWidth: 220,
        background: 'none', border: 0, borderBottom: `1px solid ${hot ? rgba(TOKENS.cream, 0.4) : rgba(TOKENS.cream, 0.16)}`,
        color: hot ? TEXT.read : TEXT.quiet,
        fontFamily: FONT.mono, fontSize: SIZE.small, letterSpacing: TRACK.tick, textShadow: ONSKY,
        transition: 'color .2s linear, border-color .2s linear',
      }}
    >
      <Sigil size={11} cut="lamp" />
      {handle ? (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: (C && C.star) || TOKENS.star }}>@</span>
          {handle}
        </span>
      ) : (
        <span>account</span>
      )}
    </button>
  )
}

// ── the countdown ─────────────────────────────────────────────────────────────
// One clock, shared by the landing banner, the trial page and the slot ledger,
// ticking to a fixed instant. It re-renders once a SECOND, which is the whole
// point: a deadline written as a date is information, a deadline that moves
// while you look at it is pressure. `done` is true once the instant has passed,
// so every caller can say its own thing instead of counting into negatives.
export function useCountdown(iso) {
  const target = React.useMemo(() => new Date(iso).getTime(), [iso])
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    // Aligned to the wall clock rather than to mount, so the digits flip on the
    // second and not 380ms into it. setInterval alone drifts; this re-aims after
    // every tick, which also recovers cleanly when a phone wakes from sleep.
    let id
    const tick = () => {
      setNow(Date.now())
      id = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    id = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(id)
  }, [target])
  const left = Math.max(0, target - now)
  const s = Math.floor(left / 1000)
  return {
    done: left <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  }
}

const pad2 = (n) => String(n).padStart(2, '0')

// The clock as four counted units, each under its own stamped tick — read at a
// glance, never mistaken for a phone number. Courier throughout, because a
// clock is metadata and metadata is never allowed to carry a feeling.
// `compact` is the banner's edition: one dense mono line that fits a corner.
export function Countdown({ C, iso, compact, closedLabel = 'closed', color }) {
  const { done, days, hours, mins, secs } = useCountdown(iso)
  const lit = color || (C && C.star) || TOKENS.star
  if (done) {
    return (
      <span style={{ fontFamily: FONT.mono, fontSize: compact ? SIZE.micro : SIZE.meta, letterSpacing: TRACK.tick, color: TEXT.faint, textShadow: ONSKY }}>
        {closedLabel}
      </span>
    )
  }
  if (compact) {
    return (
      <span
        aria-label={`${days} days ${hours} hours ${mins} minutes ${secs} seconds left`}
        style={{ fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.tick, color: lit, fontVariantNumeric: 'tabular-nums', textShadow: ONSKY }}
      >
        {days}d {pad2(hours)}h {pad2(mins)}m {pad2(secs)}s
      </span>
    )
  }
  const units = [
    [days, 'days'],
    [pad2(hours), 'hrs'],
    [pad2(mins), 'min'],
    [pad2(secs), 'sec'],
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.sm }}>
      {units.map(([v, l], i) => (
        <React.Fragment key={l}>
          {i > 0 && (
            <span aria-hidden style={{ fontFamily: FONT.mono, fontSize: 20, lineHeight: '30px', color: rgba(TOKENS.cream, 0.18) }}>:</span>
          )}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 34 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 24, lineHeight: '30px', color: lit, fontVariantNumeric: 'tabular-nums', textShadow: ONSKY }}>
              {v}
            </span>
            <Kicker C={C} micro>{l}</Kicker>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ── the first light banner, and why there isn't one ─────────────────────────
// A slip of paper tipped into the title page — "Head of Marketing
// Applications!" over a ticking deadline, linking to /trial. It is gone from
// the front of the product. The landing has one job, the one act at the top of
// it, and a recruitment notice set under the two doors was the page asking a
// stranger for something before it had finished telling them what this is. The
// brief itself still stands at /trial for anyone holding the link, and it
// carries its own countdown.

// ── the dock, and why there isn't one ────────────────────────────────────────
// There used to be a NavDock here: a fragment of star chart at the foot of the
// two hub screens, with a hairline meridian through two stations. It was a
// genuinely nice object and it was one of FOUR navigations — the dock, a profile
// chip in one corner, a "log in" chip in the same corner on other screens, and
// loose ghost links at the bottom of whichever page needed one. None of them was
// aligned to anything else, they disagreed about where "back" lives, and between
// them they still could not reach half the product.
//
// The masthead and the index (above) are the whole navigation now. The index
// reaches every destination the dock did and every one it did not, it carries
// the account, and it says what each page is currently holding. See
// docs/DESIGN.md §7.

// ── the icon set ──────────────────────────────────────────────────────────────
// SIX glyphs. That is the whole set, deliberately.
//
// This used to be twenty outline icons — an envelope on the email hint, a
// padlock on the privacy line, an eyeball on the "no alert" note, a camera on
// every mention of Instagram. None of them carried meaning the sentence beside
// them did not already carry, they came from the same free outline vocabulary
// every other app draws from, and because each call site picked its own size and
// stroke they never even matched each other.
//
// What survives is only what a HAND needs: go back, go on, close, the check that
// confirms a thing is done, a search affordance for a real search field, and the
// returning arrow on the one mechanic that runs a clock backwards. The stroke is
// a hairline, because everything else in here is drawn with one.
export function Icon({ name, size = ICON.md, color = 'currentColor', stroke = 1.2 }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    back: <path d="M12 4l-6 6 6 6" {...p} />,
    arrow: (
      <>
        <path d="M4 10h11" {...p} />
        <path d="M11 5.5L15.5 10 11 14.5" {...p} />
      </>
    ),
    close: <path d="M5 5l10 10M15 5L5 15" {...p} />,
    x: <path d="M5 5l10 10M15 5L5 15" {...p} />,
    check: <path d="M4 10.5l4 4 8-9" {...p} />,
    search: (
      <>
        <circle cx="8.8" cy="8.8" r="5.2" {...p} />
        <path d="M12.7 12.7L16.5 16.5" {...p} />
      </>
    ),
    // the clock, wound on: an arc that comes back to where it started
    refresh: (
      <>
        <path d="M16 10a6 6 0 1 1-1.9-4.4" {...p} />
        <path d="M16.2 2.6v3.6h-3.6" {...p} />
      </>
    ),
  }
  if (!paths[name]) return null
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

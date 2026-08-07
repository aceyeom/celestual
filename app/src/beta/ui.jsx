// beta/ui.jsx — the parts, cut and finished.
//
// Everything the beta screens are built from. Two rules govern the whole file:
//
//   A CONTROL IS AN OBJECT. Not a rectangle with a hover state. A button is a
//   plate that has been pressed into leather and can be pressed further; a
//   field is a line you write on; a card is a seal. Each one has a top edge
//   that catches light and a bottom edge that does not, because that is what
//   tells a hand which way is up before it has read anything.
//
//   NOTHING GLOWS. The production app is lit by two stars and every important
//   thing on it has a halo. In here light is subtractive: the important thing
//   is the one closest to ivory, and the quiet thing is the one that has sunk
//   back toward the leather. That is the entire hierarchy system.

import { useEffect, useId, useRef, useState } from 'react'
import { C, TEXT, LINE, ONSKY, FONT, SIZE, LEAD, TRACK, R, S, FRAME, MEASURE, INDEX_W, LIGHT, rgba, groundOf, faceOf, stamp, wordCount } from './tokens.js'
import { leatherSurface, paperSurface, groundSurface, stitching } from './texture.js'

// One breakpoint in the whole product. Below it the case is a pocket edition:
// the same book, set narrower, with the plate's legend dropped. Components ask
// for it rather than each screen re-deciding what "small" means.
export function useNarrow(px = 760) {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${px}px)`).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    on()
    return () => mq.removeEventListener('change', on)
  }, [px])
  return narrow
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
      <path d="M0.5 8.5 L0.5 0.5 L8.5 0.5" fill="none" stroke={rgba(C.ivory, 0.17)} strokeWidth="1" />
    </svg>
  )
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: FRAME.inset,
          border: `1px solid ${rgba(C.ivory, 0.075)}`,
          boxShadow: `0 1px 0 rgba(0,0,0,0.35)`,
        }}
      />
      <div style={{ position: 'absolute', inset: FRAME.inset2, border: `1px solid ${rgba(C.ivory, 0.04)}` }} />
      {mark('left', 'top', 1, 1)}
      {mark('right', 'top', -1, 1)}
      {mark('left', 'bottom', 1, -1)}
      {mark('right', 'bottom', -1, -1)}
    </div>
  )
}

// ── the masthead ─────────────────────────────────────────────────────────────
// One bar across the head of every page: the wordmark on the left, the way into
// the index on the right, both on the same baseline. It is the same object on
// every screen, which is the whole point — the index used to be a bookmark
// ribbon hanging off the top-right corner, set vertically, on its own scrap of
// leather with its own trim and its own shadow. Two problems with that, and
// only one of them was decoration: it was the single element in the product
// that was not aligned to anything else, and it read as a thing stuck ON the
// page rather than as part of it.
//
// So it is set horizontally, in the masthead, in the same stamped label the
// rest of the interface labels things with, and it has no plate under it at
// all. The mark beside it is three ruled entries — an index, drawn as an index
// is set — and it is the only thing that changes when the index is open.
export function Masthead({ open, onToggle, hidden }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(28px, calc(env(safe-area-inset-top) + 22px))',
        left: `max(34px, calc(env(safe-area-inset-left) + 26px))`,
        right: `max(34px, calc(env(safe-area-inset-right) + 26px))`,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: S.lg,
        // the bar itself is never a hit target: it spans the whole head of the
        // page, and a transparent strip that eats clicks is worse than no bar
        pointerEvents: 'none',
        opacity: hidden ? 0 : 1,
        transition: 'opacity .45s ease',
      }}
    >
      <Wordmark size={13} />
      <IndexTab open={open} onToggle={onToggle} hidden={hidden} />
    </div>
  )
}

function IndexTab({ open, onToggle, hidden }) {
  const [hot, setHot] = useState(false)
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
        gap: 11,
        padding: '8px 0',
        color: open || hot ? TEXT.read : TEXT.quiet,
        transition: 'color .2s linear',
      }}
    >
      <span aria-hidden style={{ display: 'block', width: 18, flex: '0 0 auto' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'block',
              height: 1,
              marginTop: i ? 4 : 0,
              // closed, it is a stack of entries with one short line, the way a
              // page of an index actually sets. Open, the short line moves — a
              // finger keeping the place, and nothing else in the bar moves.
              width: (open ? i === 1 : i !== 1) ? '100%' : '56%',
              background: open ? C.caramel : 'currentColor',
              transition: 'width .3s cubic-bezier(.16,.84,.28,1), background .2s linear',
            }}
          />
        ))}
      </span>
      <span
        style={{
          fontFamily: FONT.sans,
          fontWeight: 400,
          fontSize: SIZE.label,
          letterSpacing: TRACK.label,
          textTransform: 'uppercase',
        }}
      >
        index
      </span>
    </button>
  )
}

// ── the index ────────────────────────────────────────────────────────────────
// Not a menu that appears over the page: a COLUMN the page makes room for. It
// takes its width out of the setting, the setting re-centres in what is left,
// and the two move together — which is the difference between opening a drawer
// and having something drop on top of your work.
//
// It has no panel, no fill and no trim. What separates it from the page is one
// tooled channel down its left edge, exactly the rule the rest of the product
// is divided with, and a wash of the ground itself deep enough to read type
// over the chart. On a phone there is no width to give away, so the column is
// the whole measure and the page steps aside for it.
export function IndexColumn({ open, items, screen, go, narrow }) {
  return (
    <nav
      aria-label="the index"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: narrow ? '100%' : INDEX_W,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'max(116px, calc(env(safe-area-inset-top) + 104px))',
        paddingRight: `max(${S.xl}px, calc(env(safe-area-inset-right) + ${S.lg}px))`,
        paddingBottom: `max(${S.xl}px, env(safe-area-inset-bottom))`,
        paddingLeft: narrow ? `max(${S.xl}px, calc(env(safe-area-inset-left) + ${S.lg}px))` : S.xl,
        background: narrow
          ? `linear-gradient(90deg, ${rgba(C.void, 0.88)} 0%, ${rgba(C.void, 0.95)} 30%, ${rgba(C.void, 0.95)} 100%)`
          : `linear-gradient(90deg, ${rgba(C.void, 0.3)} 0%, ${rgba(C.void, 0.88)} 20%, ${rgba(C.void, 0.95)} 100%)`,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'transform .46s cubic-bezier(.16,.84,.28,1), opacity .3s ease',
        overflowY: 'auto',
      }}
    >
      {/* the tooled channel: the same two pixels every rule in here is made of,
          stood on end */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(90deg, ${LINE.tooledDark} 0 1px, ${LINE.tooledLight} 1px 2px)`,
        }}
      />

      <Label style={{ marginBottom: S.sm }}>the index</Label>
      <Rule style={{ marginBottom: S.xs }} />

      {items.map((it, i) => {
        const on = it.key === screen
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => go(it.key)}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              width: '100%',
              textAlign: 'left',
              padding: '14px 0',
              borderBottom: `1px solid ${LINE.faint}`,
              color: on ? TEXT.read : TEXT.quiet,
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: SIZE.tick,
                letterSpacing: TRACK.tick,
                color: on ? C.caramel : TEXT.faint,
                flex: '0 0 auto',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontFamily: FONT.sans, fontWeight: 300, fontSize: 15, letterSpacing: '0.02em' }}>{it.name}</span>
            {on && (
              <span
                aria-hidden
                className="lamp"
                style={{ alignSelf: 'center', width: 5, height: 5, borderRadius: '50%', background: C.caramel, flex: '0 0 auto' }}
              />
            )}
          </button>
        )
      })}

      <div style={{ flex: 1, minHeight: S.xl }} />
      <Tick>the bindery edition · beta</Tick>
    </nav>
  )
}

// ── the column ───────────────────────────────────────────────────────────────
// The measure is narrow, the type inside it is ranged left, and the block that
// carries it sits in the middle of the window. On a phone the measure IS the
// screen; on a laptop the same page comes out centred rather than stranded in
// the left third, which is what makes the two read as one product.
//
// ── the spine, and why there isn't one ───────────────────────────────────────
// There used to be a hairline ruled down the left of every column — the spine,
// the thing the setting was hung off. On paper that is a real idea. On screen it
// was a pale vertical line standing an inch off the left of every page in the
// product, attached to nothing, at the exact weight and colour of a rendering
// artefact. It read as a seam in the window rather than as part of the book, and
// once you had noticed it on one screen you could not stop seeing it on the rest
// of them.
//
// The setting does not need it. Type ranged left against a consistent left
// margin already has an axis; the rule was drawing a line the eye was drawing
// anyway. It is gone, and the indent it needed went with it.
//
// `paddingTop` clears the masthead. The colophon is the last thing in the
// column rather than pinned to the viewport: a colophon belongs at the foot of
// the setting, and a fixed one sits on top of whatever scrolls beneath it.
export function Column({ children, wide = false, colophon = true, style }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        padding: `max(116px, calc(env(safe-area-inset-top) + 104px)) max(${S.xl}px, calc(env(safe-area-inset-right) + ${S.lg}px)) ${S.xxl}px max(${S.xl}px, calc(env(safe-area-inset-left) + ${S.lg}px))`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: wide ? 880 : MEASURE }}>
        {children}
        {colophon && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: S.xxxl, opacity: 0.55 }}>
            <Tick>the bindery edition</Tick>
            <span aria-hidden style={{ width: 18, height: 1, background: rgba(C.ivory, 0.16) }} />
            <Tick>beta</Tick>
          </div>
        )}
      </div>
    </div>
  )
}

// ── type ─────────────────────────────────────────────────────────────────────

export const Title = ({ children, style, as: T = 'h1' }) => (
  <T
    style={{
      fontFamily: FONT.serif,
      fontWeight: 300,
      fontSize: SIZE.title,
      lineHeight: LEAD.title,
      letterSpacing: TRACK.title,
      color: TEXT.read,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </T>
)

export const Chapter = ({ children, style, as: T = 'h2' }) => (
  <T
    style={{
      fontFamily: FONT.serif,
      fontWeight: 400,
      fontSize: SIZE.chapter,
      lineHeight: LEAD.chapter,
      color: TEXT.read,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </T>
)

export const Lead = ({ children, italic = true, style }) => (
  <p
    style={{
      fontFamily: FONT.serif,
      fontStyle: italic ? 'italic' : 'normal',
      fontWeight: 400,
      fontSize: SIZE.lead,
      lineHeight: LEAD.lead,
      color: TEXT.read,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </p>
)

export const Body = ({ children, quiet, style }) => (
  <p
    style={{
      fontFamily: FONT.sans,
      fontWeight: 300,
      fontSize: SIZE.body,
      lineHeight: LEAD.body,
      color: quiet ? TEXT.quiet : TEXT.read,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </p>
)

export const Small = ({ children, style }) => (
  <p style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.6, color: TEXT.quiet, margin: 0, ...style }}>
    {children}
  </p>
)

// The stamped label. Uppercase Jost, tracked wide enough that it reads as a
// caption printed on a plate rather than as small text.
export const Label = ({ children, tone = 'quiet', style }) => (
  <div
    style={{
      fontFamily: FONT.sans,
      fontWeight: 400,
      fontSize: SIZE.label,
      letterSpacing: TRACK.label,
      textTransform: 'uppercase',
      color: tone === 'lit' ? C.caramel : tone === 'read' ? TEXT.read : tone === 'ink' ? C.ink2 : TEXT.faint,
      textShadow: tone === 'ink' ? undefined : ONSKY,
      ...style,
    }}
  >
    {children}
  </div>
)

// Metadata. Courier only, and it never carries a feeling.
export const Tick = ({ children, tone = 'faint', style }) => (
  <span
    style={{
      fontFamily: FONT.mono,
      fontSize: SIZE.tick,
      letterSpacing: TRACK.tick,
      color: tone === 'lit' ? C.caramel : tone === 'read' ? TEXT.read : tone === 'ink' ? C.ink3 : TEXT.faint,
      textShadow: tone === 'ink' ? undefined : ONSKY,
      ...style,
    }}
  >
    {children}
  </span>
)

// A tooled rule: the dark channel the tool cut, and the light catching on its
// upper lip. Two pixels doing the work of a border.
export const Rule = ({ width = '100%', style }) => (
  <div
    aria-hidden
    style={{
      width,
      height: 2,
      background: `linear-gradient(180deg, ${LINE.tooledDark} 0 1px, ${LINE.tooledLight} 1px 2px)`,
      ...style,
    }}
  />
)

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
//   what let the artwork move to a near-black case without being redrawn: on
//   ivory the cut is ivory, on the case the cut is the case.
//
//   THE BODY IS THE ONE LIGHT. The wings are the brand's ink; the disc in the
//   middle is the only warm thing in the drawing, on the same value ramp every
//   lit thing in this product sits on. Which is also the argument for the
//   default: an ivory star with a single caramel body reads at fourteen pixels
//   in the masthead and at four hundred on the specimen sheet, and it never
//   competes with the type beside it.
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

// ── the iterations ───────────────────────────────────────────────────────────
// The artwork came in on white, in two mauves and a rose gold, and not one of
// the three survived the move: at this ground a mid-brown sits within a few
// values of what it is standing on, and a mark you have to look for is not a
// mark. So the drawing is untouched and the ink is not.
//
// What IS kept is the artwork's order — left wing lightest, right wing deepest,
// and the body brighter than either, because that order is the drawing. Invert
// it and the same geometry becomes a different mark: the long point that leads
// the eye stops being the one that reaches up, and the body stops reading as
// something lit and starts reading as a hole.
//
//   IVORY, LIT   the default, and the lightest of them. Ivory against wheat,
//                with the body run from a bright warm highlight down through
//                caramel to saddle — a piece of metal rather than a filled
//                circle, and the only warm thing in the drawing.
//   STRUCK IVORY the unified one. A single ink at two strengths for the wings
//                and a third for the body: no warm anywhere. This is the cut to
//                use anywhere the mark stands beside something else that is lit.
//   THE WARM CUT the artwork's own two-tone relationship, moved up the ramp far
//                enough to clear the case: wheat against saddle.
//   ON PAPER     for ivory grounds — a share card, a favicon on white, print.
export const CUTS = [
  { id: 'lamp', name: 'ivory, lit', left: [C.ivory, 1], right: [C.wheat, 1], body: [C.ivory2, C.caramel, C.saddle] },
  { id: 'ivory', name: 'struck ivory', left: [C.ivory, 0.96], right: [C.ivory, 0.5], body: [C.ivory, C.ivory2, C.wheat] },
  { id: 'warm', name: 'the warm cut', left: [C.wheat, 1], right: [C.saddle, 1], body: [C.ivory2, C.wheat, C.caramel] },
  { id: 'ink', name: 'on paper', left: [C.ink2, 1], right: [C.ink, 1], body: [C.wheat, C.caramel, C.saddle] },
]

const cutOf = (id) => CUTS.find((c) => c.id === id) || CUTS[0]

// `size` is the WIDTH. The mark is taller than it is wide — 1.212:1, the
// artwork's own proportion — and a caller that squares it off is cropping the
// long points, so the height is derived here and never asked for.
export function Sigil({ size = 26, cut = 'lamp', ground = C.void, a = 1, style }) {
  const raw = useId()
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
      style={{ display: 'block', opacity: a, overflow: 'visible', ...style }}
      aria-hidden
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

export function Wordmark({ size = 15, sub, tone, cut = 'lamp' }) {
  const ink = tone || C.ivory
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.62 }}>
      <Sigil size={size * 1.52} cut={cut} />
      <div>
        {/* The name used to be tracked out to a third of an em, which is a
            letterspace for a single word set alone on a title page and far too
            much for a word standing next to a mark: at that setting "celestual"
            stops being a word and becomes nine letters in a row. Pulled in to a
            normal uppercase interval, it reads as one object again. */}
        <div
          style={{
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: size,
            letterSpacing: TRACK.wordmark,
            textTransform: 'uppercase',
            color: ink,
            lineHeight: 1,
          }}
        >
          celestual
        </div>
        {sub && (
          <div style={{ marginTop: 5, fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.13em', color: rgba(C.ivory, 0.34) }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── surfaces ─────────────────────────────────────────────────────────────────

// A leather panel, stitched. The stitch is the tell: it is the one detail that
// says a hand made the object, and it is why every leather good has one.
export function Panel({ children, stitched = true, raised = true, style }) {
  return (
    <div
      style={{
        position: 'relative',
        ...leatherSurface(raised ? C.hide : C.cocoa),
        borderRadius: R.panel,
        boxShadow: raised ? LIGHT.rest : LIGHT.well,
        padding: S.lg,
        ...style,
      }}
    >
      {stitched && <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: R.panel, pointerEvents: 'none', ...stitching() }} />}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

// ── the leaf, and why there isn't one ────────────────────────────────────────
// There used to be a `Leaf` here: an ivory sheet of laid paper tipped into the
// case, and every form in the product was written on one. It was the most
// literal expression of the idea this brand is built on, and on the new ground
// it was the worst thing on the page.
//
// A slab of #F1E7D3 on a near-black case is a contrast ratio somewhere north of
// eighteen to one, held across a rectangle several hundred pixels wide. Nothing
// else in the frame can survive next to that: the type on the leather beside it
// goes grey, the galaxy behind it goes flat, and the eye reads the RECTANGLE
// rather than anything written in it. It was legible in the way a lightbox is
// legible.
//
// So paper is no longer a surface the interface is built out of. It is reserved
// for the two objects that are genuinely made of it — the seal, which is the
// card a ping carries, and the plate, which is the one struck label per screen
// — and everything that used to sit on a leaf is now set directly on the case
// in ivory. The ground got dark enough to hold it; that was the whole point of
// the ground getting dark.
//
// ── the plates (buttons) ─────────────────────────────────────────────────────
// A letterpress plate: ivory stock, the label struck into it, a keyline printed
// inside the trim. Pressing it pushes it into the leather by one pixel and
// takes the light off its top edge, which is the whole animation.
function usePress() {
  const [down, setDown] = useState(false)
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

export function Plate({ children, onClick, disabled, full, tone = 'ivory', style }) {
  const { down, handlers } = usePress()
  const dark = tone === 'leather'
  // A disabled plate is not a faded plate. Dropping a paper object to a third
  // of its opacity over brown leather gives a dead grey slab, which is both
  // ugly and a lie about the material. An unstruck plate is simply the OUTLINE
  // of one: the trim is scored into the leather, and nothing has been printed
  // on it yet.
  //
  // It carries a little of the ground with it, though, which it did not have to
  // when the ground was a flat brown. A scored recess with NOTHING in it lands
  // wherever the chart happens to be — and the one time it lands on the
  // galactic centre, the outline and its label both vanish into the light. The
  // fill is the case's own colour, deepened the way a recess deepens; it reads
  // as scored rather than as a slab, and it always reads.
  const surface = disabled ? { background: rgba(C.void, 0.5) } : dark ? leatherSurface(C.hide2) : paperSurface(C.ivory)
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...handlers}
      style={{
        position: 'relative',
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: S.sm,
        padding: '17px 30px',
        borderRadius: R.press,
        ...surface,
        color: disabled ? rgba(C.ivory, 0.42) : dark ? C.ivory : C.ink,
        border: disabled ? `1px solid ${rgba(C.ivory, 0.16)}` : '1px solid transparent',
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
          border: `1px solid ${disabled ? rgba(C.ivory, 0.07) : dark ? rgba(C.ivory, 0.13) : rgba(C.ink, 0.18)}`,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontFamily: FONT.sans,
          fontWeight: 400,
          fontSize: 11.5,
          letterSpacing: TRACK.label,
          textTransform: 'uppercase',
          textShadow: disabled ? ONSKY : dark ? '0 1px 0 rgba(0,0,0,.45)' : '0 1px 0 rgba(255,255,255,.5)',
        }}
      >
        {children}
      </span>
    </button>
  )
}

// The quiet exit. Not a ghost button: a line of type with a tooled rule under
// it, which is what a footnote reference looks like and exactly the weight this
// deserves.
export function Quiet({ children, onClick, style }) {
  const [hot, setHot] = useState(false)
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
        color: hot ? TEXT.read : TEXT.quiet,
        transition: 'color .2s linear',
        ...style,
      }}
    >
      <span style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 13, letterSpacing: '0.04em' }}>{children}</span>
      <span
        aria-hidden
        style={{
          height: 1,
          width: '100%',
          background: hot ? rgba(C.ivory, 0.4) : rgba(C.ivory, 0.16),
          transition: 'background .2s linear',
        }}
      />
    </button>
  )
}

// ── the ruled line (the field) ───────────────────────────────────────────────
// You do not type into a box in here. You write on a line, under a printed
// caption, with the @ already set in front of it in the typewriter face the
// rest of the metadata uses. A box with a 16px radius and a focus glow is the
// single most generic object in software; a ruled line is a form somebody
// printed.
//
// `tone` is which side of the material it is printed on: `ink` on paper, and
// `ivory` on the case, which is what every field in the product uses now that
// the leaf is gone. Both are the same object — a caption, a rule, and a caret.
export function Ruled({ label, prefix = '@', value, onChange, placeholder, autoFocus, onEnter, tone = 'ink', big }) {
  const ref = useRef(null)
  const [focus, setFocus] = useState(false)
  const onPaper = tone === 'ink'
  const ink = onPaper ? C.ink : C.ivory
  const rule = onPaper ? (focus ? rgba(C.ink, 0.55) : rgba(C.ink, 0.22)) : focus ? rgba(C.caramel, 0.8) : rgba(C.ivory, 0.24)
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 400,
            fontSize: SIZE.label,
            letterSpacing: TRACK.label,
            textTransform: 'uppercase',
            color: onPaper ? rgba(C.ink, 0.5) : TEXT.faint,
            textShadow: onPaper ? undefined : ONSKY,
            marginBottom: S.sm,
          }}
        >
          {label}
        </div>
      )}
      <div
        onClick={() => ref.current && ref.current.focus()}
        style={{ display: 'flex', alignItems: 'baseline', gap: 3, paddingBottom: 9, borderBottom: `1px solid ${rule}`, transition: 'border-color .18s linear' }}
      >
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: big ? 22 : 17,
            color: onPaper ? rgba(C.ink, 0.42) : rgba(C.caramel, 0.85),
            transform: 'translateY(-1px)',
          }}
        >
          {prefix}
        </span>
        <input
          ref={ref}
          className={onPaper ? 'ph-ink' : 'ph-ivory'}
          value={value}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter()
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 'none',
            background: 'transparent',
            fontFamily: FONT.mono,
            fontSize: big ? 22 : 17,
            letterSpacing: '0.02em',
            color: ink,
            padding: 0,
            caretColor: onPaper ? C.ink : C.caramel,
          }}
        />
      </div>
    </label>
  )
}

// ── the seal ─────────────────────────────────────────────────────────────────
// The card a ping carries. It is a circle for the reason it has always been a
// circle in this product: a ping is a star and this is the star's surface. It is
// a struck seal — a double keyline inside the trim, one of three materials
// underneath, and three things printed on it in a fixed order.
//
// ── why the legend came off the rim ──────────────────────────────────────────
// The handle and the date used to run round the edge on a real curve, the way a
// legend does on a coin. It was the most convincing thing in the file and it was
// the wrong call, for a reason that only shows up once you try to READ one:
//
//   A curved line has no reading axis. Every glyph in "@raines" sat at a
//   different angle, so the eye had to re-level itself letter by letter — fine
//   for a legend nobody reads, which is what a legend on a coin is, and not fine
//   at all for the single most important fact on the card. It is WHO IT IS FOR.
//   That is not ornament round the edge, it is the first line.
//
//   And it fought its own container. Set on an arc inside a circle inside a
//   round frame, the handle was the fourth concentric thing in a hundred pixels;
//   nothing in the composition was square to anything, so nothing had a top.
//
// So it is set straight now, across the top, on the card's own vertical axis —
// and the date straight across the foot, which gives the disc a head and a foot
// and therefore an up. Three horizontal bands, ranged on one centre line: who it
// is for, what was said, when it was written. The curve is gone and the object
// reads as a card rather than as a token.
export function Seal({ card, size = 220, className = '', style, elevated = true }) {
  const g = groundOf(card && card.ground)
  const f = faceOf(card && card.face)
  const text = (card && card.words) || ''
  const n = wordCount(text)
  const dark = g.id === 'hide'
  // Below about a hundred and twenty pixels the legend stops being type and
  // becomes two grey smudges, so the seal drops it and gives the room back to
  // the words. A card too small to print its own head does not print it smaller;
  // it stops being a card and becomes a token, and a token in a list is right.
  const legend = size >= 118
  const ratio = (n <= 7 ? 0.082 : n <= 13 ? 0.068 : 0.056) * (legend ? 1 : 1.34)
  const fs = size * ratio * f.scale
  const headInk = dark ? rgba(C.ivory, 0.82) : rgba(C.ink, 0.7)
  const footInk = dark ? rgba(C.ivory, 0.42) : rgba(C.ink, 0.4)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        ...groundSurface(g, { scale: Math.round(size * 0.9) }),
        boxShadow: elevated
          ? `${LIGHT.seal}, inset 0 1px 0 ${rgba('#FFFFFF', dark ? 0.05 : 0.4)}, inset 0 -2px 6px rgba(0,0,0,${dark ? 0.42 : 0.14})`
          : 'none',
        ...style,
      }}
    >
      {/* the double keyline struck inside the trim */}
      <div aria-hidden style={{ position: 'absolute', inset: size * 0.038, borderRadius: '50%', border: `1px solid ${dark ? rgba(C.ivory, 0.26) : rgba(C.ink, 0.24)}` }} />
      {legend && (
        <div aria-hidden style={{ position: 'absolute', inset: size * 0.088, borderRadius: '50%', border: `1px solid ${dark ? rgba(C.ivory, 0.11) : rgba(C.ink, 0.1)}` }} />
      )}

      {legend && (
        <>
          {/* who it is for. Ranged on the card's centre line, level, and clipped
              rather than shrunk — a thirty-character handle is allowed to run
              out of chord, and it is not allowed to set the type size for every
              other card in the product. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: size * 0.128,
              padding: `0 ${size * 0.19}px`,
              textAlign: 'center',
              fontFamily: FONT.mono,
              fontSize: size * 0.047,
              letterSpacing: `${size * 0.008}px`,
              lineHeight: 1,
              color: headInk,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            @{(card && card.handle) || ''}
          </div>
          {/* the hairline under the head. It is what turns two lines of Courier
              into a printed card rather than two lines of Courier. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: size * 0.196,
              width: size * 0.2,
              height: 1,
              transform: 'translateX(-50%)',
              background: dark ? rgba(C.ivory, 0.22) : rgba(C.ink, 0.18),
            }}
          />
          {/* and when it was written */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: size * 0.132,
              textAlign: 'center',
              fontFamily: FONT.mono,
              fontSize: size * 0.039,
              letterSpacing: `${size * 0.008}px`,
              lineHeight: 1,
              color: footInk,
            }}
          >
            {stamp(card && card.placed)}
          </div>
        </>
      )}

      {/* the words */}
      <div
        style={{
          position: 'absolute',
          top: size * (legend ? 0.255 : 0.1),
          bottom: size * (legend ? 0.225 : 0.1),
          left: size * (legend ? 0.145 : 0.1),
          right: size * (legend ? 0.145 : 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: f.family,
            fontStyle: f.style,
            fontWeight: f.weight,
            fontSize: fs,
            lineHeight: f.lead,
            letterSpacing: f.track,
            textTransform: f.transform,
            color: text ? g.ink : g.quiet,
            maxWidth: '100%',
            textWrap: 'balance',
          }}
        >
          {text || '—'}
        </div>
      </div>
    </div>
  )
}

// ── state, without a colour ──────────────────────────────────────────────────
// Three states and no hue between them. A standing ping is a filled mark that
// breathes; a waiting one is an open mark; a mutual is the pair. Somebody who
// cannot see colour reads this exactly as well as somebody who can, which is
// the accidental benefit of a monochrome brand and a good reason to keep it.
export function Mark({ state = 'waiting', size = 11 }) {
  if (state === 'mutual') {
    return (
      <svg width={size * 1.9} height={size} viewBox="0 0 21 11" aria-hidden style={{ display: 'block' }}>
        <line x1="6" y1="5.5" x2="15" y2="5.5" stroke={rgba(C.caramel, 0.7)} strokeWidth="1" />
        <circle cx="6" cy="5.5" r="3.1" fill={C.caramel} />
        <circle cx="15" cy="5.5" r="2.5" fill={C.ivory} />
      </svg>
    )
  }
  const filled = state === 'standing'
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" aria-hidden style={{ display: 'block' }} className={filled ? 'lamp' : ''}>
      <circle
        cx="5.5"
        cy="5.5"
        r="3.4"
        fill={filled ? C.caramel : 'none'}
        stroke={filled ? 'none' : rgba(C.ivory, 0.4)}
        strokeWidth="1"
        strokeDasharray={filled ? '' : '2 2'}
      />
    </svg>
  )
}

// ── the head of a screen ─────────────────────────────────────────────────────
// A kicker, a rule, and a way back. The same three objects on every screen, in
// the same place, so the product has a masthead instead of a navbar.
//
// The kicker is OPTIONAL, and a screen should drop it whenever the headline
// underneath already says the same thing. "THE SEND" stamped over "who is on
// your mind?" is not a label, it is the page saying its own name out loud before
// speaking — and a page that has to introduce itself has a headline that is not
// working. Where the two overlap, the headline wins and the kicker goes.
export function Head({ kicker, onBack, right }) {
  return (
    <div style={{ marginBottom: S.xl }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: S.md, marginBottom: S.sm, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S.md }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="back"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: TEXT.faint,
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden>
                <path d="M0.5 4 L15.5 4 M0.5 4 L4 1 M0.5 4 L4 7" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
              back
            </button>
          )}
          {kicker && <Label>{kicker}</Label>}
        </div>
        {right}
      </div>
      <Rule />
    </div>
  )
}

// ── the slot meter ───────────────────────────────────────────────────────────
// Three slots, drawn as three notches cut in a strip. It is a physical counter
// (a punch card, a ration book) rather than a progress bar, and it is legible
// at a glance without a number, which is what a meter is for.
export function Slots({ used, cap = 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 17,
              height: 7,
              borderRadius: 1,
              background: i < used ? C.caramel : 'transparent',
              border: `1px solid ${i < used ? 'transparent' : rgba(C.ivory, 0.22)}`,
              boxShadow: i < used ? 'inset 0 -1px 0 rgba(0,0,0,.3)' : LIGHT.well,
            }}
          />
        ))}
      </div>
      <Tick>
        {used} of {cap}
      </Tick>
    </div>
  )
}

// A row of choices that are MATERIALS, not options. Each swatch is the real
// surface, at the real texture, so choosing is looking at the thing rather than
// reading its name.
export function Swatches({ items, value, onChange, size = 46, round = true }) {
  return (
    <div style={{ display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
      {items.map((it) => {
        const on = it.id === value
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            title={it.name}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                display: 'block',
                width: size,
                height: size,
                borderRadius: round ? '50%' : R.press,
                ...(it.surface || {}),
                boxShadow: on
                  ? `0 0 0 1px ${C.caramel}, 0 0 0 4px ${rgba(C.caramel, 0.16)}, ${LIGHT.leaf}`
                  : `0 0 0 1px ${rgba(C.ivory, 0.14)}, 0 4px 12px rgba(0,0,0,.4)`,
                transition: 'box-shadow .16s linear',
              }}
            />
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: 9.5,
                // tighter than a stamped label: three material names have to
                // stand side by side inside a phone's measure
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: on ? C.caramel : TEXT.faint,
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

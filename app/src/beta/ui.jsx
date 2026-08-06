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

import { useEffect, useRef, useState } from 'react'
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
// The measure is narrow and the type inside it is ranged left, hung off a real
// rule — the spine. That much is unchanged, and it is still what keeps a page
// from reading as a centred template stack.
//
// What changed is where the column SITS. It used to be pinned to the left edge
// of the window, which on a phone is invisible (the measure is the screen) and
// on a laptop leaves the entire page in the left third with a third of a metre
// of empty case beside it — the same layout reading as two different products
// depending on what you opened it on. The block is centred now, the setting
// inside it is not, and the phone layout comes out byte for byte where it was.
//
// `paddingTop` clears the masthead. The colophon is the last thing in the
// column rather than pinned to the viewport: a colophon belongs at the foot of
// the setting, and a fixed one sits on top of whatever scrolls beneath it.
export function Column({ children, spine = true, wide = false, colophon = true, style }) {
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
      <div style={{ position: 'relative', width: '100%', maxWidth: wide ? 880 : MEASURE, paddingLeft: spine ? S.lg : 0 }}>
        {spine && (
          <div
            aria-hidden
            className="tool-spine"
            style={{
              position: 'absolute',
              left: 0,
              top: 4,
              bottom: 4,
              width: 1,
              background: `linear-gradient(180deg, ${rgba(C.ivory, 0)} 0%, ${rgba(C.ivory, 0.18)} 14%, ${rgba(C.ivory, 0.18)} 86%, ${rgba(C.ivory, 0)} 100%)`,
            }}
          />
        )}
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
// The brand, and it is the same object the chart draws: a struck star inside a
// scribed ring. The identity and the sky are one drawing, which is what makes a
// logo feel inevitable rather than applied.
export function Reticle({ size = 26, stroke = C.ivory, a = 1 }) {
  const c = size / 2
  const r = size * 0.34
  const sp = size * 0.46
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', opacity: a }} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke={stroke} strokeOpacity="0.42" strokeWidth={size * 0.035} />
      <path
        d={`M${c} ${c - sp} Q${c + size * 0.055} ${c - size * 0.055} ${c + sp} ${c}
            Q${c + size * 0.055} ${c + size * 0.055} ${c} ${c + sp}
            Q${c - size * 0.055} ${c + size * 0.055} ${c - sp} ${c}
            Q${c - size * 0.055} ${c - size * 0.055} ${c} ${c - sp} Z`}
        fill={stroke}
      />
      {[0, 1, 2, 3].map((k) => {
        const ang = (k * Math.PI) / 2
        const x1 = c + Math.cos(ang) * (r + size * 0.06)
        const y1 = c + Math.sin(ang) * (r + size * 0.06)
        const x2 = c + Math.cos(ang) * (r + size * 0.15)
        const y2 = c + Math.sin(ang) * (r + size * 0.15)
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeOpacity="0.34" strokeWidth={size * 0.035} />
      })}
    </svg>
  )
}

export function Wordmark({ size = 15, sub, tone = C.ivory }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: S.md }}>
      <Reticle size={size * 1.7} stroke={tone} />
      <div>
        <div
          style={{
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: size,
            letterSpacing: TRACK.wordmark,
            textTransform: 'uppercase',
            color: tone,
            lineHeight: 1,
          }}
        >
          celestual
        </div>
        {sub && (
          <div style={{ marginTop: 5, fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.16em', color: rgba(C.ivory, 0.34) }}>
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
// circle in this product: a ping is a star and this is the star's surface. What
// is new is that it is now an OBJECT — a struck seal, with the rim text set
// round its edge on a real curve the way it is on a coin, a double keyline
// inside the trim, and one of three materials underneath.
//
// The rim text is SVG textPath, not a row of rotated spans, so it is genuinely
// on the curve at every size and stays crisp when the seal is 88px in a list
// and when it is 320px in a reveal.
export function Seal({ card, size = 220, className = '', style, elevated = true }) {
  const g = groundOf(card && card.ground)
  const f = faceOf(card && card.face)
  const text = (card && card.words) || ''
  const n = wordCount(text)
  // Below about a hundred and twenty pixels the rim text stops being text and
  // becomes a smudge round the edge, so the seal drops it and gives the space
  // back to the words instead. A coin too small to read its own legend does not
  // print the legend smaller; it stops being a coin and becomes a token.
  const rim = size >= 120
  const ratio = (n <= 7 ? 0.082 : n <= 13 ? 0.068 : 0.056) * (rim ? 1 : 1.34)
  const fs = size * ratio * f.scale
  const rimR = size * 0.5 - size * 0.052
  const id = `rim-${(card && card.handle) || 'x'}-${Math.round(size)}`
  const rimInk = g.id === 'hide' ? rgba(C.ivory, 0.72) : rgba(C.ink, 0.62)

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
          ? `${LIGHT.seal}, inset 0 1px 0 ${rgba('#FFFFFF', g.id === 'hide' ? 0.05 : 0.4)}, inset 0 -2px 6px rgba(0,0,0,${g.id === 'hide' ? 0.42 : 0.14})`
          : 'none',
        ...style,
      }}
    >
      {/* the double keyline struck inside the trim */}
      <div aria-hidden style={{ position: 'absolute', inset: size * 0.038, borderRadius: '50%', border: `1px solid ${g.id === 'hide' ? rgba(C.ivory, 0.26) : rgba(C.ink, 0.24)}` }} />
      {rim && (
        <div aria-hidden style={{ position: 'absolute', inset: size * 0.088, borderRadius: '50%', border: `1px solid ${g.id === 'hide' ? rgba(C.ivory, 0.11) : rgba(C.ink, 0.1)}` }} />
      )}

      {/* the rim: who it is for, and when it was written */}
      {rim && (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          <defs>
            <path id={`${id}-t`} d={`M ${size / 2 - rimR} ${size / 2} A ${rimR} ${rimR} 0 0 1 ${size / 2 + rimR} ${size / 2}`} fill="none" />
            <path id={`${id}-b`} d={`M ${size / 2 - rimR} ${size / 2} A ${rimR} ${rimR} 0 0 0 ${size / 2 + rimR} ${size / 2}`} fill="none" />
          </defs>
          <text
            fill={rimInk}
            style={{ fontFamily: FONT.mono, fontSize: size * 0.043, letterSpacing: `${size * 0.007}px` }}
          >
            <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">
              {`@${(card && card.handle) || ''}`}
            </textPath>
          </text>
          <text
            fill={g.id === 'hide' ? rgba(C.ivory, 0.44) : rgba(C.ink, 0.42)}
            style={{ fontFamily: FONT.mono, fontSize: size * 0.036, letterSpacing: `${size * 0.007}px` }}
          >
            <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">
              {stamp(card && card.placed)}
            </textPath>
          </text>
        </svg>
      )}

      {/* the words */}
      <div
        style={{
          position: 'absolute',
          inset: size * (rim ? 0.155 : 0.1),
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
          <Label>{kicker}</Label>
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

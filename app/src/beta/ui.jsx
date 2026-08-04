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
import { C, TEXT, LINE, FONT, SIZE, LEAD, TRACK, R, S, FRAME, MEASURE, LIGHT, rgba, groundOf, faceOf, stamp, wordCount } from './tokens.js'
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

// ── the column ───────────────────────────────────────────────────────────────
// Every screen hangs off a rule on the left instead of floating in the middle
// of the viewport. This one structural decision does more to kill the "generic
// product page" read than any colour ever could: centred stacks are what a
// template gives you, and a hung column is what a person laying out a page
// does. The rule is real, and it is the spine.
// `paddingTop` clears the ribbon's tail and `paddingRight` keeps the measure
// out from under it, so no page ever has to know the ribbon exists. The
// colophon is the last thing in the column rather than pinned to the viewport:
// a colophon belongs at the foot of the setting, and a fixed one sits on top of
// whatever scrolls beneath it.
export function Column({ children, spine = true, wide = false, colophon = true, style }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        padding: `max(132px, calc(env(safe-area-inset-top) + 118px)) max(${S.xxl}px, calc(env(safe-area-inset-right) + ${S.lg}px)) ${S.xxl}px max(${S.xl}px, calc(env(safe-area-inset-left) + ${S.lg}px))`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
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

// An ivory leaf tipped into the case. Paper is thin, so its shadow is tight and
// its edge is a real edge: a hairline of shadow on the underside, none on top.
export function Leaf({ children, tone = 'ivory', style, className = '' }) {
  const base = tone === 'chalk' ? C.chalk : tone === 'ivory2' ? C.ivory2 : C.ivory
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        ...paperSurface(base),
        color: C.ink,
        borderRadius: R.press,
        boxShadow: LIGHT.leaf,
        padding: S.lg,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

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
  const surface = disabled ? { background: 'transparent' } : dark ? leatherSurface(C.hide2) : paperSurface(C.ivory)
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
        color: disabled ? rgba(C.ivory, 0.3) : dark ? C.ivory : C.ink,
        border: disabled ? `1px solid ${rgba(C.ivory, 0.11)}` : '1px solid transparent',
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
          textShadow: disabled ? 'none' : dark ? '0 1px 0 rgba(0,0,0,.45)' : '0 1px 0 rgba(255,255,255,.5)',
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
// You do not type into a box in here. You write on a line, on a slip of paper,
// under a printed caption, with the @ already set in front of it in the
// typewriter face the rest of the metadata uses. A box with a 16px radius and a
// focus glow is the single most generic object in software; a ruled line is a
// form somebody printed.
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

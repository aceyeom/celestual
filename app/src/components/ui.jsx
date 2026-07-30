// ui.jsx — CELESTUAL's primitives (the galaxy edition). All color comes from the
// single source of truth in ../theme.js — nothing defines its own hexes — and
// the whole product lives inside one deep cosmic-violet field lit by the two
// stars: starlight-amber (`you`) and rose (`them`). See docs/DESIGN.md for the
// rules these components enforce.
import * as React from 'react'
import { GalaxyField } from '../galaxy.js'
import { CommunityGalaxy } from '../communityGalaxy.js'
import { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS, FONT, SIZE, LINE, TRACK, ICON } from '../theme.js'
import { searchHandles, normHandle } from '../api/celestual.js'
import { bySlug } from '../communities.js'

export { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS, FONT, SIZE, LINE, TRACK, ICON }

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

// ── the galaxy field (the persistent backdrop) ────────────────────────────────
// The one backdrop for the whole product: a real 3D perspective-projected
// particle galaxy (galaxy.js) that slowly orbits behind every screen, steerable
// with a whisper of pointer/tilt parallax. This is the cosmos the product lives
// inside — the two stars (amber `you`, rose `them`) are the field's own light.
// Mount it once, in idle mode, as a fixed full-bleed layer under the content.
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
  // so a placed ping leaves a soft glow in the galaxy behind the pings list.
  React.useEffect(() => {
    if (field.current) field.current.setSeals(seals)
  }, [seals])
  // The @ each star holds (device plaintext), so a focus dive can name it.
  React.useEffect(() => {
    if (field.current) field.current.setSealLabels(sealLabels || [])
  }, [sealLabels])
  // Who each ping is to the viewer — the category tint its star wears.
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

// ── the community galaxy (a countable galaxy: one star per real ping) ─────────
// The community page's own galaxy — distinct from the ambient backdrop above.
// Every star is one ping; the field fills as pings arrive. Full-bleed at
// z-index 0 so it sits UNDER the screen's content (which the screen wraps at
// z-index 1) but OVER the ambient backdrop.
// `onReady(field)` hands the live engine to the screen so it can launch() a
// ping as the demo (or real data) ticks. Remount on a community change by
// giving it key={slug}.
// `inline` mounts the field inside its parent box (absolute, not fixed) — the
// live share card uses this to carry a real, breathing galaxy inside a card.
export function CommunityGalaxyCanvas({ you, them, pings = 0, forming = false, dim = 1, mine, publicHandles, ownPublic, onReady, inline = false }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  const readyRef = React.useRef(onReady)
  readyRef.current = onReady
  // the viewer's own placed @s — kept in a ref so the forming→open resolve can
  // re-seat them after a reseed without re-running the mount effect
  const mineRef = React.useRef(mine)
  mineRef.current = mine
  React.useEffect(() => {
    const f = new CommunityGalaxy(ref.current, { you, them })
    field.current = f
    if (forming) {
      f.setForming(true)
    } else {
      f.seed(pings)
    }
    f.syncMine(mineRef.current || [])
    f.setPublicHandles(publicHandles || [], ownPublic || null)
    f.start()
    if (readyRef.current) readyRef.current(f)
    if (import.meta.env.DEV) window.__communityGalaxy = f
    let ro
    let roRaf = 0
    if (window.ResizeObserver && ref.current && ref.current.parentElement) {
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
    if (field.current) field.current.setPalette(you, them)
  }, [you, them])
  // Live reconciliation: the sky tracks its community's numbers after mount too.
  // A gathering community that crosses the floor RESOLVES — the forming gas gives
  // way to its real, countable stars. Counts only ever reconcile upward here
  // (screen-driven launch() already leads the props; a server refresh that
  // jumps ahead settles the difference in without a meteor storm).
  React.useEffect(() => {
    const f = field.current
    if (!f) return
    if (forming) {
      if (!f.forming) f.setForming(true)
      return
    }
    if (f.forming) {
      f.setForming(false)
      f.seed(pings, [])
      f.syncMine(mineRef.current || [])
      return
    }
    if (pings > f.count) f.setCount(pings)
  }, [forming, pings])
  // the viewer's own stars follow the device-held ping list (adds rest in
  // quietly; a released ping's star leaves the sky)
  React.useEffect(() => {
    if (field.current) field.current.syncMine(mine || [])
  }, [mine])
  // the opted-in public @s (and the viewer's own, once they flip public)
  React.useEffect(() => {
    if (field.current) field.current.setPublicHandles(publicHandles || [], ownPublic || null)
  }, [publicHandles, ownPublic])
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: inline ? 'absolute' : 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0,
        background: TOKENS.ink, pointerEvents: 'none',
        opacity: dim, transition: 'opacity .6s ease',
      }}
    />
  )
}

// ── the star ──────────────────────────────────────────────────────────────────
// The single warm star — the only bright thing in the product. A white core
// breathing in light inside a soft warm halo. `size` is the whole mark's box;
// the match screen is the one place it renders larger than anywhere else.
export function StarMark({ C, size = 88 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      <span
        aria-hidden
        className="star-halo"
        style={{
          position: 'absolute', inset: '-18%', borderRadius: '50%',
          background: `radial-gradient(circle at 46% 42%, ${rgba(C.star, 0.26)} 0%, ${rgba(C.star, 0.07)} 46%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute', width: size * 0.44, height: size * 0.44, borderRadius: '50%',
          background: `radial-gradient(circle, ${rgba(C.star, 0.4)}, transparent 70%)`, filter: 'blur(2px)',
        }}
      />
      <span
        className="star-core"
        style={{
          width: Math.max(7, size * 0.09), height: Math.max(7, size * 0.09), borderRadius: '50%', background: '#fff',
          boxShadow: `0 0 8px 2px #fff, 0 0 20px 6px ${rgba(C.star, 0.6)}, 0 0 46px 16px ${rgba(C.star, 0.2)}`,
        }}
      />
    </span>
  )
}

// The brand glyph — the concave four-point sparkle, warm-hearted. Reads as one
// of the night's own stars, not a logo.
export function Brandmark({ C, size = 22, title = 'celestual' }) {
  const gid = React.useId()
  const star = (C && C.star) || TOKENS.star
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      style={{ display: 'block', overflow: 'visible', filter: `drop-shadow(0 0 6px ${rgba(star, 0.45)})` }}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="42%" stopColor="#FFE3C8" />
          <stop offset="100%" stopColor={star} />
        </radialGradient>
      </defs>
      <path d="M16 1 Q17.6 14.4 31 16 Q17.6 17.6 16 31 Q14.4 17.6 1 16 Q14.4 14.4 16 1 Z" fill={`url(#${gid})`} />
    </svg>
  )
}

// ── the curated community seal ────────────────────────────────────────────────
// A small monochrome emblem for an official community — a cosmos ring set with
// the brand's crest star, around the school's serif monogram. Tinted to the two
// stars only (cream ring/letters, one amber crest), so no third hue enters. If a
// community carries an `asset` (a black-on-transparent logo dropped in
// app/public/schools/), it's rendered instead and palette-tinted to a clean
// monochrome silhouette, so a hand-swapped logo still reads as this cosmos.
export function SchoolMark({ C, slug, size = 46 }) {
  const c = bySlug(slug)
  const tint = C.cream
  if (c && c.asset) {
    return (
      <span
        role="img"
        aria-label={c.name}
        style={{
          display: 'inline-block', width: size, height: size, flexShrink: 0, background: tint,
          WebkitMaskImage: `url(${c.asset})`, maskImage: `url(${c.asset})`,
          WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center',
          WebkitMaskSize: 'contain', maskSize: 'contain',
        }}
      />
    )
  }
  const mono = (c && c.mono) || (c && c.short ? c.short.slice(0, 3) : '·')
  const fs = mono.length >= 3 ? 12.5 : mono.length === 2 ? 15.5 : 18
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={(c && c.name) || slug} style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}>
      <circle cx="20" cy="20" r="18.2" fill="none" stroke={rgba(tint, 0.42)} strokeWidth="1.3" />
      {/* the crest star — every community wears the brand's one amber light */}
      <path d="M20 0.6 Q20.7 3.5 23.5 4.2 Q20.7 4.9 20 7.8 Q19.3 4.9 16.5 4.2 Q19.3 3.5 20 0.6 Z" fill={C.star} />
      <text
        x="20" y="21" dominantBaseline="central" textAnchor="middle"
        fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic" fontSize={fs} fill={tint}
      >
        {mono}
      </text>
    </svg>
  )
}

// ── the send-off morph (the @ field becomes a star and lifts off) ────────────
// A fixed, pointer-transparent overlay pinned exactly over the @ field: the box
// collapses horizontally into a slit, pinches to a point, and a star ignites
// with a glisten (crossed diffraction spikes + a blooming halo — the starburst).
// It hands off, at the same origin point, to the galaxy's send-off drift, so the
// star appears to fly on into the disk. Torn down by App after ~1.3s.
export function Liftoff({ C, handle, geom }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 402
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700
  const cx = geom?.cx ?? vw / 2
  const cy = geom?.cy ?? vh * 0.42
  const w = geom?.w ?? Math.min(360, vw - 48)
  const h = geom?.h ?? 60
  const hue = C.star
  const spikeBg = (deg) => `linear-gradient(${deg}deg, transparent, ${rgba(hue, 0.7)} 34%, #fff 50%, ${rgba(hue, 0.7)} 66%, transparent)`
  const at0 = { position: 'absolute', left: 0, top: 0 }
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
      {/* the @ box ghost that collapses horizontally into a point */}
      <div
        className="lo-box"
        style={{
          position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: RADIUS.field,
          background: C.ink2, border: `1.5px solid ${rgba(hue, 0.55)}`, boxShadow: `0 0 26px ${rgba(hue, 0.18)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        <span className="lo-text" style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: Math.min(22, h * 0.36), color: C.cream, whiteSpace: 'nowrap' }}>
          <span style={{ color: hue }}>@</span>{handle}
        </span>
      </div>
      {/* the star igniting where the slit pinched shut */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <span className="lo-halo" style={{ ...at0, width: 156, height: 156, marginLeft: -78, marginTop: -78, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(hue, 0.5)}, ${rgba(C.them, 0.12)} 45%, transparent 68%)` }} />
        <span className="lo-spike" style={{ ...at0, width: 150, height: 2, marginLeft: -75, marginTop: -1, background: spikeBg(90) }} />
        <span className="lo-spike" style={{ ...at0, width: 2, height: 150, marginLeft: -1, marginTop: -75, background: spikeBg(180) }} />
        <span className="lo-core" style={{ ...at0, width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: '#fff', boxShadow: `0 0 22px 7px ${rgba(hue, 0.85)}, 0 0 58px 20px ${rgba(hue, 0.4)}` }} />
      </div>
    </div>
  )
}

// ── a frosted glass panel ─────────────────────────────────────────────────────
// A translucent, blurred surface that lifts foreground content off the living
// galaxy so the field can stay lit behind it without fighting the text. Used to
// hold the pings list (and each ping row) above the backdrop.
export function GlassPanel({ C, children, style, inset = false, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        position: 'relative',
        background: inset ? rgba(C.ink2, 0.5) : rgba(C.ink2, 0.62),
        border: `1px solid ${rgba(C.cream, inset ? 0.06 : 0.1)}`,
        borderRadius: RADIUS.card,
        backdropFilter: 'blur(14px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.05)',
        boxShadow: inset ? 'none' : '0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── the three type registers, as components (docs/DESIGN.md §type) ───────────
// EVERY piece of text in the product goes through one of these. Nothing inline
// picks its own size, face or leading any more: that drift is exactly what made
// the same idea look like three different products on three different screens.

// Display: the one headline a screen is allowed. Serif italic, fluid.
export function Display({ C, children, color, align = 'left', style }) {
  return (
    <h1
      style={{
        margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
        fontSize: SIZE.display, lineHeight: LINE.tight, color: color || C.cream,
        textAlign: align, textWrap: 'balance', ...style,
      }}
    >
      {children}
    </h1>
  )
}

// Title: a sheet's or a section's headline — one step under Display.
export function Title({ C, children, color, align = 'left', as = 'h2', style }) {
  const Tag = as
  return (
    <Tag
      style={{
        margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
        fontSize: SIZE.title, lineHeight: LINE.tight, color: color || C.cream,
        textAlign: align, textWrap: 'balance', ...style,
      }}
    >
      {children}
    </Tag>
  )
}

// Lead: a spoken serif line inside a card or under a title.
export function Lead({ C, children, color, size = SIZE.lead, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
        fontSize: size, lineHeight: LINE.snug, color: color || C.cream, ...style,
      }}
    >
      {children}
    </span>
  )
}

// Body / Small: the mechanical register.
export function Body({ C, children, color, align, style }) {
  return (
    <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: SIZE.body, lineHeight: LINE.body, color: color || C.muted, textAlign: align, ...style }}>
      {children}
    </p>
  )
}

export function Small({ C, children, color, align, style }) {
  return (
    <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: SIZE.small, lineHeight: LINE.body, color: color || C.muted, textAlign: align, ...style }}>
      {children}
    </p>
  )
}

// Kicker: the metadata register — mono, uppercase, letterspaced. Never feelings.
export function Kicker({ C, children, color, micro, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.mono, fontSize: micro ? SIZE.micro : SIZE.meta,
        letterSpacing: micro ? TRACK.micro : TRACK.meta,
        textTransform: 'uppercase', color: color || C.muted, ...style,
      }}
    >
      {children}
    </span>
  )
}

// Mono: metadata that is NOT a label — counts, clocks, codes. Not uppercased.
export function Mono({ C, children, color, size = SIZE.meta, style }) {
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: '.3px', color: color || C.muted, ...style }}>
      {children}
    </span>
  )
}

// Serif kept as a thin alias so older call sites keep rendering in one register.
export function Serif({ C, children, size = SIZE.lead, italic = true, color, style }) {
  return (
    <span style={{ fontFamily: FONT.serif, fontStyle: italic ? 'italic' : 'normal', fontWeight: 400, fontSize: size, lineHeight: LINE.snug, color: color || C.cream, ...style }}>
      {children}
    </span>
  )
}

// A hairline rule that fades at both ends and grows from its center.
export function Rule({ C, delay = 0, width = '76%' }) {
  return (
    <span
      aria-hidden
      style={{
        height: 1, width, maxWidth: 230, margin: '0 auto', display: 'block',
        background: `linear-gradient(90deg, transparent, ${rgba(C.cream, 0.16)}, transparent)`,
        transformOrigin: 'center', animation: `ruleGrow .6s ease ${delay}s both`,
      }}
    />
  )
}

// ── the one screen header ─────────────────────────────────────────────────────
// Every screen that has a way back wears THIS, so the back button, the label and
// the right-hand slot land on the same pixel everywhere. Screens used to each
// hand-roll a flex row with a spacer div of a guessed width; that is why nothing
// lined up between them.
export function ScreenHeader({ C, onBack, label, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, minHeight: 38, ...style }}>
      <span style={{ width: 38, flexShrink: 0, display: 'flex' }}>{onBack ? <BackBtn C={C} onClick={onBack} /> : null}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm }}>
        {typeof label === 'string' ? <Kicker C={C}>{label}</Kicker> : label}
      </span>
      <span style={{ width: 38, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</span>
    </div>
  )
}

// A quiet note under a field or an action. No icon, no bullet, no chrome: the
// indent and the hush are the whole treatment.
export function Note({ C, children, tone, align, style }) {
  return (
    <p
      style={{
        margin: 0, padding: '0 2px', fontFamily: FONT.sans, fontSize: SIZE.small,
        lineHeight: LINE.body, textAlign: align,
        color: tone === 'accent' ? rgba(C.star, 0.92) : tone === 'quiet' ? rgba(C.muted, 0.8) : C.muted,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

// ── buttons ───────────────────────────────────────────────────────────────────
// Three weights of action, one geometry each. A screen gets ONE primary; an
// outline is the alternative to it; a ghost is the way out. Nothing else is a
// button.
export function PrimaryButton({ C, children, onClick, disabled, style }) {
  const [h, setH] = React.useState(false)
  const SHADOW = makeShadow(C)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: '100%',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: '17px 22px',
        borderRadius: RADIUS.field,
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: SIZE.head,
        letterSpacing: '.2px',
        color: disabled ? C.muted : C.onStar,
        background: disabled ? C.ink3 : `linear-gradient(180deg, ${C.star}, ${rgba(C.star, 0.86)})`,
        boxShadow: disabled ? 'none' : SHADOW.cta(C.star, h),
        transform: h && !disabled ? 'translateY(-1.5px)' : 'none',
        transition: 'transform .18s, box-shadow .25s, background .2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// Full width and the same corner as the primary, so a stacked pair reads as one
// column instead of a button and a pill.
export function OutlineButton({ C, children, onClick, style }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACE.sm,
        padding: '15px 22px',
        borderRadius: RADIUS.field,
        cursor: 'pointer',
        background: h ? rgba(C.cream, 0.06) : 'transparent',
        border: `1px solid ${h ? rgba(C.cream, 0.3) : C.line}`,
        color: C.cream,
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: SIZE.body,
        letterSpacing: '.2px',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        transition: 'background .2s, border-color .2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({ C, children, onClick, style }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 6px',
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: SIZE.small,
        color: h ? C.cream : C.muted,
        transition: 'color .2s',
        letterSpacing: '.2px',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// The row a screen's exits live on, so "not now" / "your pings" / "leave" never
// again sit at three different offsets on three different screens.
export function ExitRow({ C, children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.xl, flexWrap: 'wrap', ...style }}>
      {children}
    </div>
  )
}

// ── fields ────────────────────────────────────────────────────────────────────
// unified input. kind: 'email' | 'handle' | 'text'. emphasis = the hero field.
export function Field({ C, kind = 'handle', value, onChange, placeholder, autoFocus, onEnter, emphasis }) {
  const [focus, setFocus] = React.useState(false)
  const col = C.star
  const SHADOW = makeShadow(C)
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])
  const clean = (v) =>
    kind === 'email' ? v.replace(/\s/g, '') : kind === 'handle' ? v.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase() : v
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.md,
        width: '100%',
        padding: emphasis ? '19px 20px' : '15px 17px',
        borderRadius: RADIUS.field,
        background: C.ink2,
        border: `1.5px solid ${focus ? rgba(col, 0.8) : emphasis ? rgba(col, 0.28) : C.line}`,
        boxShadow: focus ? SHADOW.focus(col) : emphasis ? SHADOW.rest(col) : 'none',
        transition: 'border-color .2s, box-shadow .25s',
      }}
    >
      {/* the @ is the product's own mark, so it stays. An email field gets no
          envelope glyph: the placeholder already says what it is. */}
      {kind === 'handle' ? (
        <span style={{ fontFamily: FONT.mono, fontSize: emphasis ? 22 : 19, color: rgba(col, 0.9), fontWeight: 700 }}>@</span>
      ) : null}
      <input
        ref={ref}
        type={kind === 'email' ? 'email' : 'text'}
        inputMode={kind === 'email' ? 'email' : 'text'}
        value={value}
        onChange={(e) => onChange(clean(e.target.value))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontFamily: kind === 'handle' ? FONT.mono : FONT.sans,
          fontSize: emphasis ? 19 : 17,
          color: C.cream,
          letterSpacing: '.2px',
          fontWeight: kind === 'handle' ? 400 : 500,
        }}
      />
    </div>
  )
}

export function HandleChip({ C, handle, big }) {
  const col = C.star
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: big ? '8px 15px' : '5px 11px',
        borderRadius: RADIUS.chip,
        background: rgba(col, 0.1),
        border: `1px solid ${rgba(col, 0.38)}`,
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: big ? 17 : 13.5,
        color: C.cream,
        maxWidth: '100%',
      }}
    >
      <span style={{ color: col }}>@</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{handle}</span>
    </span>
  )
}

// Instagram-style @ search: a validated handle field with an optional live
// typeahead on top. Results come from the pluggable searchHandles() adapter —
// empty until a server-side provider is wired.
export function HandleSearchField({ C, value, onChange, placeholder, autoFocus, onEnter }) {
  const [results, setResults] = React.useState([])
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const SHADOW = makeShadow(C)
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
        value={value}
        onChange={(v) => {
          onChange(v)
          setOpen(true)
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        emphasis
        onEnter={() => {
          if (show && active >= 0) pick(results[active].handle)
          else if (onEnter) onEnter()
        }}
      />
      {show && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 25, padding: 6,
            borderRadius: RADIUS.card, background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`,
            boxShadow: SHADOW.menu, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            maxHeight: 280, overflowY: 'auto',
          }}
        >
          {results.map((r, i) => (
            <button
              key={r.handle}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r.handle)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: RADIUS.inner,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: i === active ? rgba(C.star, 0.1) : 'transparent',
              }}
            >
              <span
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: rgba(C.star, 0.16), display: 'grid', placeItems: 'center',
                }}
              >
                {r.avatar ? (
                  <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: C.star, fontFamily: FONT.mono, fontWeight: 700 }}>@</span>
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.cream, fontFamily: FONT.mono, fontSize: 14 }}>
                  {r.handle}
                  {r.verified && <Icon name="check" size={13} color={C.star} />}
                </span>
                {r.full_name && <span style={{ display: 'block', color: C.muted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── state marks ───────────────────────────────────────────────────────────────
// The ping-state dot: standing carries a faint warm breath; waiting sits in
// cooler grey; mutual is the star itself.
export function StateDot({ C, state = 'waiting', size = 8 }) {
  if (state === 'mutual') {
    return <span aria-hidden style={{ fontSize: size + 4, lineHeight: 1, color: C.star, textShadow: `0 0 10px ${rgba(C.star, 0.7)}` }}>✦</span>
  }
  const warm = state === 'standing'
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: warm ? rgba(C.star, 0.9) : rgba(C.muted, 0.4),
        boxShadow: warm ? `0 0 10px ${rgba(C.star, 0.55)}` : 'none',
        animation: warm ? 'breathe 3.6s ease-in-out infinite' : 'none',
      }}
    />
  )
}

// calm sonar — expanding rings + still core (used while waiting on the DM)
export function Sonar({ C, color, size = 16 }) {
  const col = color || C.star
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      {[0, 1].map((i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: `1px solid ${rgba(col, 0.5)}`,
            animation: `ping 3s ease-out ${i * 1.5}s infinite`,
          }}
        />
      ))}
      <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: col, boxShadow: `0 0 8px 1px ${rgba(col, 0.7)}`, animation: 'breathe 3s ease-in-out infinite' }} />
    </span>
  )
}

export function BackBtn({ C, onClick, label = 'back' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: C.ink2, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
    >
      <Icon name="back" size={16} color="currentColor" stroke={1.9} />
    </button>
  )
}

// The logged-out counterpart to ProfileButton: a clear "log in" chip for the
// top corner, so returning people have an obvious, always-visible way back to
// their pings without hunting through the footer.
export function LoginButton({ C, label, onClick }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 15px',
        borderRadius: RADIUS.chip, background: rgba(C.ink2, h ? 0.86 : 0.7),
        border: `1px solid ${h ? rgba(C.star, 0.42) : C.line}`, color: C.cream, cursor: 'pointer',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        fontFamily: FONT.sans, fontSize: SIZE.small, fontWeight: 600, letterSpacing: '.2px', transition: 'all .2s',
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {label}
    </button>
  )
}

// ── the countdown ─────────────────────────────────────────────────────────────
// One clock, shared by the landing banner and the trial page, ticking to a fixed
// instant. It re-renders once a SECOND, which is the whole point: a deadline
// written as a date is information, a deadline that moves while you look at it
// is pressure. `done` is true once the instant has passed, so every caller can
// say its own thing instead of counting backwards into negative numbers.
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

// The clock as four counted units, each under its own tick — read at a glance,
// never mistaken for a phone number. `compact` is the banner's edition: one
// dense mono line that fits a corner of a phone.
export function Countdown({ C, iso, compact, closedLabel = 'closed', color }) {
  const { done, days, hours, mins, secs } = useCountdown(iso)
  const lit = color || C.star
  if (done) {
    return (
      <span style={{ fontFamily: FONT.mono, fontSize: compact ? SIZE.micro : SIZE.meta, letterSpacing: TRACK.micro, textTransform: 'uppercase', color: C.muted }}>
        {closedLabel}
      </span>
    )
  }
  if (compact) {
    return (
      <span
        aria-label={`${days} days ${hours} hours ${mins} minutes ${secs} seconds left`}
        style={{ fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: '1.2px', color: lit, fontVariantNumeric: 'tabular-nums' }}
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md }}>
      {units.map(([v, l], i) => (
        <React.Fragment key={l}>
          {i > 0 && (
            <span aria-hidden style={{ fontFamily: FONT.mono, fontSize: 22, lineHeight: '30px', color: rgba(C.cream, 0.18) }}>:</span>
          )}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 34 }}>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, lineHeight: '30px', color: lit, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 20px ${rgba(lit, 0.35)}` }}>
              {v}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro, textTransform: 'uppercase', color: C.muted }}>{l}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ── the first light banner ────────────────────────────────────────────────────
// The landing's one door to the trial: a small designed banner resting top-right
// (mirroring the login chip's corner), not a chip — a hairline card with the
// star's own light down its leading edge, the call in the serif voice and the
// deadline ticking beneath it, second by second. The clock is the banner's real
// argument: a job opening with a date on it is a notice, one that is visibly
// running out is a decision.
export function TrialBanner({ C, line, deadline, href = '/trial' }) {
  const [h, setH] = React.useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 13px 7px 12px',
        // capped so the line wraps rather than growing left into the login chip
        // on a narrow phone, where the two corners are only a thumb apart
        maxWidth: 'min(58vw, 290px)',
        borderRadius: RADIUS.inner, textDecoration: 'none',
        background: rgba(C.ink2, h ? 0.92 : 0.78),
        border: `1px solid ${h ? rgba(C.star, 0.5) : rgba(C.star, 0.26)}`,
        borderLeft: `2px solid ${rgba(C.star, h ? 0.95 : 0.7)}`,
        boxShadow: h ? `0 8px 28px rgba(0,0,0,.5), 0 0 22px ${rgba(C.star, 0.14)}` : '0 6px 22px rgba(0,0,0,.4)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        transition: 'all .25s ease',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span aria-hidden style={{ flexShrink: 0, color: C.star, fontSize: 10, lineHeight: 1, textShadow: `0 0 10px ${rgba(C.star, 0.8)}` }}>✦</span>
        <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.2, color: C.cream }}>{line}</span>
      </span>
      <span style={{ paddingLeft: 16 }}>
        <Countdown C={C} iso={deadline} compact closedLabel="applications closed" color={rgba(C.star, 0.92)} />
      </span>
    </a>
  )
}

// ── the dock ──────────────────────────────────────────────────────────────────
// The product's TWO places — your sky and your pings — drawn in the product's
// own vocabulary instead of an app-store glass pill: a fragment of STAR CHART
// resting at the foot of the screen. One hairline meridian runs through the
// stations; where you are burns as a small four-ray star over its name set in
// the brand serif, and the rest sit as charted points with their tiny monospace
// ticks. No container, no blur slab: the chart floats on the sky itself over a
// breath of ink so it stays legible, and melts away whenever the sky takes the
// whole frame (a dive, a held zoom, the send-off).
//
// It used to carry three stations, two of which opened the same place — a
// community list and that community's sky. The list is not a destination, it is
// a picker, so it now lives inside the sky page and the dock stops lying about
// how many places this product has.
export function NavDock({ C, items, hidden }) {
  // The minor ticks charted between the stations, derived from however many
  // there are, so the meridian stays even at two stations or at four.
  const ticks = []
  for (let i = 1; i < items.length; i++) {
    const mid = (i / items.length) * 100
    ticks.push(mid - 4, mid + 4)
  }
  return (
    <nav
      data-noripple
      aria-label="celestual"
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 'max(10px, env(safe-area-inset-bottom))', zIndex: 22,
        width: 'min(392px, calc(100vw - 40px))',
        opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity .45s ease',
      }}
    >
      {/* a breath of ink beneath the chart — legibility without a glass slab */}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: '-10%', right: '-10%', top: -26, bottom: -14,
          background: `radial-gradient(75% 150% at 50% 78%, ${rgba(C.ink, 0.72)}, ${rgba(C.ink, 0.3)} 60%, transparent 78%)`,
          pointerEvents: 'none',
        }}
      />
      {/* the meridian — a hairline through the three stations, dissolving at
          its ends, with faint minor ticks charted between them */}
      <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 13, height: 1, background: `linear-gradient(90deg, transparent, ${rgba(C.cream, 0.26)} 14%, ${rgba(C.cream, 0.26)} 86%, transparent)`, pointerEvents: 'none' }} />
      {ticks.map((left, i) => (
        <span key={i} aria-hidden style={{ position: 'absolute', left: `${left}%`, top: 12.5, width: 2, height: 2, borderRadius: '50%', background: rgba(C.cream, 0.3), transform: 'translateX(-50%)', pointerEvents: 'none' }} />
      ))}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={it.onClick}
            aria-label={it.label}
            aria-current={it.active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '2px 8px 6px', background: 'none', border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* the station: the lit star where you are, a charted point elsewhere */}
            <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 24, height: 24 }}>
              {it.active ? (
                <>
                  <span aria-hidden style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.star, 0.4)}, ${rgba(C.star, 0.1)} 55%, transparent 75%)` }} />
                  <svg width="17" height="17" viewBox="0 0 20 20" style={{ position: 'relative', filter: `drop-shadow(0 0 7px ${rgba(C.star, 0.85)})` }}>
                    <path d="M10 1.6 L11.9 8.1 L18.4 10 L11.9 11.9 L10 18.4 L8.1 11.9 L1.6 10 L8.1 8.1 Z" fill={C.star} />
                    <path d="M10 5.4 L10.9 9.1 L14.6 10 L10.9 10.9 L10 14.6 L9.1 10.9 L5.4 10 L9.1 9.1 Z" fill="#FFF6EA" />
                  </svg>
                </>
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 6.5, height: 6.5, borderRadius: '50%',
                    border: `1px solid ${rgba(C.cream, 0.55)}`, background: rgba(C.ink, 0.5),
                    boxShadow: `0 0 8px ${rgba(C.cream, 0.14)}`,
                    transition: 'border-color .25s ease',
                  }}
                />
              )}
            </span>
            <span
              style={
                it.active
                  ? { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: 15, lineHeight: '15px', color: C.cream, textShadow: `0 0 14px ${rgba(C.star, 0.45)}`, letterSpacing: '.2px' }
                  : { fontFamily: FONT.mono, fontSize: SIZE.micro, lineHeight: '15px', letterSpacing: TRACK.micro, textTransform: 'uppercase', color: rgba(C.cream, 0.6) }
              }
            >
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

// The signed-in chip: the star avatar + your @, tucked in a corner.
export function ProfileButton({ C, handle, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="account"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 13px 0 7px',
        borderRadius: RADIUS.chip, background: rgba(C.ink2, 0.7), border: `1px solid ${C.line}`,
        color: C.cream, cursor: 'pointer', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        fontFamily: FONT.mono, fontSize: SIZE.small, letterSpacing: '.2px', maxWidth: 220,
      }}
    >
      {/* the account mark is the product's own star, lit — never a stroked
          person-in-a-circle avatar glyph */}
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 34% 30%, #fff, ${rgba(C.star, 0.9)} 62%, ${rgba(C.star, 0.5)})`, boxShadow: `0 0 10px ${rgba(C.star, 0.5)}` }} />
      {handle ? (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: C.star }}>@</span>
          {handle}
        </span>
      ) : (
        <span style={{ color: C.muted }}>account</span>
      )}
    </button>
  )
}

// ── the icon set ──────────────────────────────────────────────────────────────
// FIVE glyphs. That is the whole set, deliberately.
//
// This used to be twenty outline icons — an envelope on the email hint, a
// padlock on the privacy line, an eyeball on the "no alert" note, a camera on
// every mention of Instagram, a planet, a speech bubble, a share node graph.
// None of them carried meaning the sentence beside them did not already carry,
// they came from the same free outline vocabulary every other app draws from,
// and because each call site picked its own size and stroke they never even
// matched each other. Removing them is the single biggest thing that stops this
// product looking like a template.
//
// What survives is only what a HAND needs: go back, go on, close, and the check
// that confirms a thing is done, plus a search affordance for a real search
// field. Meaning is carried by type, by light and by the one star.
export function Icon({ name, size = ICON.md, color = 'currentColor', stroke = 1.8 }) {
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
    check: <path d="M4 10.5l4 4 8-9" {...p} />,
    search: (
      <>
        <circle cx="8.8" cy="8.8" r="5.2" {...p} />
        <path d="M12.7 12.7L16.5 16.5" {...p} />
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

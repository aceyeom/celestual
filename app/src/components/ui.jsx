// ui.jsx — CELESTUAL's primitives (the galaxy edition). All color comes from the
// single source of truth in ../theme.js — nothing defines its own hexes — and
// the whole product lives inside one deep cosmic-violet field lit by the two
// stars: starlight-amber (`you`) and rose (`them`). See docs/DESIGN.md for the
// rules these components enforce.
import * as React from 'react'
import { GalaxyField } from '../galaxy.js'
import { CommunityGalaxy } from '../communityGalaxy.js'
import { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS } from '../theme.js'
import { searchHandles, normHandle } from '../api/celestual.js'
import { bySlug } from '../communities.js'

export { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS }

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
export function GalaxyCanvas({ mode = 'idle', dim, you, them, motion = 20, origin, seals = 0, onReady, style }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  React.useEffect(() => {
    const f = new GalaxyField(ref.current, { you, them, motion })
    field.current = f
    f.setMode(mode, { dim, origin })
    if (seals) f.setSeals(seals)
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
// Every star is one ping; the field fills as pings arrive and lights anonymous
// match-constellations. Full-bleed at z-index 0 so it sits UNDER the screen's
// content (which the screen wraps at z-index 1) but OVER the ambient backdrop.
// `onReady(field)` hands the live engine to the screen so it can launch() a ping
// and addConstellation() a match as the demo (or real data) ticks. Remount on a
// community change by giving it key={slug}.
export function CommunityGalaxyCanvas({ you, them, pings = 0, matches = 0, forming = false, dim = 1, onReady }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  const readyRef = React.useRef(onReady)
  readyRef.current = onReady
  React.useEffect(() => {
    const f = new CommunityGalaxy(ref.current, { you, them })
    field.current = f
    if (forming) {
      f.setForming(true)
    } else {
      f.seed(pings)
      f.setConstellations(matches)
    }
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
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0,
        background: '#04030A', pointerEvents: 'none',
        opacity: dim, transition: 'opacity .6s ease',
      }}
    />
  )
}

// ── the night field (retired backdrop, kept for reference) ─────────────────────
// The still navy field used by the "night edition". Superseded by GalaxyCanvas —
// the living galaxy is the product's backdrop again. Left exported so nothing
// imports break; not mounted.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function NightField({ style }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)
      // a barely-there vertical falloff so the field has depth without a hue swing
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(20,29,49,0.35)')
      g.addColorStop(0.55, 'rgba(20,29,49,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      const rand = mulberry32(20260703) // fixed seed: one sky, always
      const n = Math.round((w * h) / 11000) // sparse — emptiness is the point
      for (let i = 0; i < n; i++) {
        const x = rand() * w
        const y = rand() * h
        const r = 0.3 + rand() * 0.9
        const a = 0.05 + rand() * 0.3
        // one star in ~14 carries a whisper of warmth; the rest are cool dust
        const warm = rand() < 0.07
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = warm ? `rgba(255,162,92,${a * 0.8})` : `rgba(226,232,244,${a})`
        ctx.fill()
      }
    }
    draw()
    let raf = 0
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: TOKENS.ink, ...style }}
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
        <span className="lo-text" style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: Math.min(22, h * 0.36), color: C.cream, whiteSpace: 'nowrap' }}>
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
export function GlassPanel({ C, children, style, inset = false }) {
  return (
    <div
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

// ── the hero typewriter ───────────────────────────────────────────────────────
// Types a sequence of short phrases one after another — type, hold, erase, next —
// with a blinking caret. Timing is deliberately uneven (each phrase can set its
// own hold) so it feels spoken, not mechanical; the last phrase (the payoff)
// holds longest before the loop resets. `phrases`: [{ text, hold }]. `render`
// lets a caller style a phrase (e.g. amber the @, serif the payoff).
export function Typewriter({ phrases, className, style, caretColor, render }) {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [i, setI] = React.useState(0)
  const [n, setN] = React.useState(reduce ? (phrases[0]?.text.length || 0) : 0)
  const [erasing, setErasing] = React.useState(false)
  React.useEffect(() => {
    if (reduce) return // reduced motion: show the first phrase, fully, no motion
    const phrase = phrases[i]
    if (!phrase) return
    const full = phrase.text.length
    let delay
    if (!erasing && n < full) {
      // type — a touch irregular, like a hand. A phrase can set its own pace
      // (typeSpeed = base ms/char, typeVar = jitter) so a hero line can hurry.
      delay = (phrase.typeSpeed ?? 46) + Math.random() * (phrase.typeVar ?? 34)
    } else if (!erasing && n >= full) {
      delay = phrase.hold ?? 1400 // hold on the finished phrase
    } else if (erasing && n > 0) {
      delay = 26 // erase — quicker than typing
    } else {
      delay = 220 // a breath before the next phrase begins
    }
    const id = setTimeout(() => {
      if (!erasing && n < full) setN(n + 1)
      else if (!erasing && n >= full) setErasing(true)
      else if (erasing && n > 0) setN(n - 1)
      else {
        setErasing(false)
        setI((i + 1) % phrases.length)
      }
    }, delay)
    return () => clearTimeout(id)
  }, [i, n, erasing, phrases, reduce])
  const phrase = phrases[i] || phrases[0]
  const shown = phrase.text.slice(0, n)
  return (
    <span className={className} style={style}>
      {render ? render(shown, phrase) : shown}
      <span className="tw-caret" aria-hidden style={{ color: caretColor || 'currentColor', fontWeight: 300, marginLeft: 1 }}>
        |
      </span>
    </span>
  )
}

// ── the three type registers, as components (docs/DESIGN.md §type) ───────────
// Kicker: the metadata register — mono, uppercase, letterspaced. Never feelings.
export function Kicker({ C, children, color, style }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px',
        textTransform: 'uppercase', color: color || C.muted, ...style,
      }}
    >
      {children}
    </span>
  )
}

// Serif: the emotional register — Instrument Serif, italic by default.
export function Serif({ C, children, size = 30, italic = true, color, style }) {
  return (
    <span
      style={{
        fontFamily: "'Instrument Serif', serif", fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 400, fontSize: size, lineHeight: 1.16, color: color || C.cream, ...style,
      }}
    >
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

// ── buttons ───────────────────────────────────────────────────────────────────
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
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 16,
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

export function OutlineButton({ C, children, onClick, style }) {
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 22px',
        borderRadius: RADIUS.chip,
        cursor: 'pointer',
        background: h ? rgba(C.cream, 0.06) : 'transparent',
        border: `1px solid ${h ? rgba(C.cream, 0.3) : C.line}`,
        color: C.cream,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 14,
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
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 13.5,
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
      {kind === 'handle' ? (
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: emphasis ? 22 : 19, color: rgba(col, 0.9), fontWeight: 700 }}>@</span>
      ) : kind === 'email' ? (
        <Icon name="mail" size={emphasis ? 21 : 18} color={col} stroke={1.7} />
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
          fontFamily: kind === 'handle' ? "'Space Mono', monospace" : "'Space Grotesk', sans-serif",
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
        fontFamily: "'Space Mono', monospace",
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
                  <span style={{ color: C.star, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>@</span>
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.cream, fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
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

// ── the meter ─────────────────────────────────────────────────────────────────
// The campus assurance-contract meter: a thin horizontal line filling with warm
// light, the count in large numerals beside/above it. The count shown is always
// the true count — the meter IS the campaign.
export function Meter({ C, count, threshold }) {
  const frac = Math.max(0, Math.min(1, threshold > 0 ? count / threshold : 0))
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(44px, 12vw, 58px)', lineHeight: 1, color: C.cream }}>
          {Number(count).toLocaleString()}
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, letterSpacing: '.5px', color: C.muted }}>
          of {Number(threshold).toLocaleString()}
        </span>
      </div>
      <div style={{ position: 'relative', height: 2, borderRadius: 2, background: rgba(C.cream, 0.09), overflow: 'visible' }}>
        <div
          className="meter-fill"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac * 100}%`,
            borderRadius: 2, background: `linear-gradient(90deg, ${rgba(C.star, 0.4)}, ${C.star})`,
            boxShadow: `0 0 12px ${rgba(C.star, 0.55)}`,
          }}
        />
        {/* the leading edge glows like a star travelling the line */}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: '50%', left: `${frac * 100}%`, transform: 'translate(-50%, -50%)',
            width: 5, height: 5, borderRadius: '50%', background: '#fff',
            boxShadow: `0 0 8px 2px ${rgba(C.star, 0.8)}`,
          }}
        />
      </div>
    </div>
  )
}

// ── the progress ring ─────────────────────────────────────────────────────────
// A community's climb toward its team-set threshold, shown as a ring instead of
// a raw count: a faint cream track, an amber→rose arc that fills once on mount
// and eases smoothly whenever the value changes (so live activity visibly climbs
// it), and a white star riding the leading edge — the Meter's edge-star, curved.
// The percentage is the serif hero (the product's hero-number register); the
// label sits in mono beneath. Collapses to a static ring under reduced-motion.
export function ProgressRing({ C, frac = 0, size = 150, label, sublabel }) {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const r = 52
  const circ = 2 * Math.PI * r
  const target = Math.max(0, Math.min(1, frac || 0))
  const pct = Math.round(target * 100)
  const [mounted, setMounted] = React.useState(reduce)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const shown = mounted ? target : 0
  const offset = circ * (1 - shown)
  const deg = 360 * shown
  const gid = React.useId()
  const ease = 'cubic-bezier(.2,.7,.2,1)'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.star} />
            <stop offset="62%" stopColor={C.star} />
            <stop offset="100%" stopColor={C.them} />
          </linearGradient>
        </defs>
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={r} fill="none" stroke={rgba(C.cream, 0.08)} strokeWidth="8" />
          <circle
            cx="60" cy="60" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: reduce ? 'none' : `stroke-dashoffset 1.15s ${ease}`, filter: `drop-shadow(0 0 5px ${rgba(C.star, 0.5)})` }}
          />
        </g>
        {/* the star travelling the leading edge */}
        <g style={{ transformBox: 'view-box', transformOrigin: '60px 60px', transform: `rotate(${deg}deg)`, transition: reduce ? 'none' : `transform 1.15s ${ease}` }}>
          <circle cx="60" cy="8" r="6" fill={rgba(C.star, 0.45)} />
          <circle cx="60" cy="8" r="2.7" fill="#fff" style={{ filter: `drop-shadow(0 0 4px ${rgba(C.star, 0.9)})` }} />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span key={pct} className="fade" style={{ fontFamily: "'Instrument Serif', serif", fontSize: size * 0.3, lineHeight: 1, color: C.cream }}>
          {pct}<span style={{ fontSize: size * 0.135, color: rgba(C.cream, 0.66) }}>%</span>
        </span>
        {label && (
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: Math.max(9, size * 0.058), letterSpacing: '1.6px', textTransform: 'uppercase', color: rgba(C.star, 0.92) }}>{label}</span>
        )}
        {sublabel && (
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: Math.max(8.5, size * 0.05), letterSpacing: '.4px', color: C.muted }}>{sublabel}</span>
        )}
      </div>
    </div>
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
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '.2px', transition: 'all .2s',
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      <Icon name="enter" size={15} color={rgba(C.star, 0.95)} stroke={2} />
      {label}
    </button>
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
        fontFamily: "'Space Mono', monospace", fontSize: 12.5, letterSpacing: '.2px', maxWidth: 220,
      }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 23, height: 23, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, #fff, ${rgba(C.star, 0.85)})`, flexShrink: 0 }}>
        <Icon name="star" size={12} color={C.onStar} stroke={2} />
      </span>
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

export function Icon({ name, size = 16, color = 'currentColor', stroke = 1.8 }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    lock: (
      <>
        <rect x="4" y="9.5" width="12" height="8.5" rx="2.2" {...p} />
        <path d="M6.5 9.5V7a3.5 3.5 0 017 0v2.5" {...p} />
      </>
    ),
    arrow: (
      <>
        <path d="M4 10h11" {...p} />
        <path d="M11 5.5L15.5 10 11 14.5" {...p} />
      </>
    ),
    check: <path d="M4 10.5l4 4 8-9" {...p} />,
    eye: (
      <>
        <path d="M2.5 10S5.5 5 10 5s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z" {...p} />
        <circle cx="10" cy="10" r="2.2" {...p} />
      </>
    ),
    back: <path d="M12 4l-6 6 6 6" {...p} />,
    mail: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="2.2" {...p} />
        <path d="M3 6l7 5 7-5" {...p} />
      </>
    ),
    star: <path d="M10 2.5l1.6 5 5 .2-4 3.1 1.5 4.9-4.1-3-4.1 3 1.5-4.9-4-3.1 5-.2z" {...p} />,
    info: (
      <>
        <circle cx="10" cy="10" r="7.4" {...p} />
        <path d="M10 9v4.2" {...p} />
        <circle cx="10" cy="6.4" r="0.5" fill={color} stroke="none" />
      </>
    ),
    clock: (
      <>
        <circle cx="10" cy="10" r="7.2" {...p} />
        <path d="M10 5.8V10l3 1.8" {...p} />
      </>
    ),
    x: (
      <>
        <path d="M5 5l10 10M15 5L5 15" {...p} />
      </>
    ),
    instagram: (
      <>
        <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="4.2" {...p} />
        <circle cx="10" cy="10" r="3.4" {...p} />
        <circle cx="14" cy="6" r="0.7" {...p} />
      </>
    ),
    plus: <path d="M10 4.6v10.8M4.6 10h10.8" {...p} />,
    copy: (
      <>
        <rect x="7" y="7" width="9.5" height="9.5" rx="2" {...p} />
        <path d="M13 7V5.5a2 2 0 00-2-2H5.5a2 2 0 00-2 2V11a2 2 0 002 2H7" {...p} />
      </>
    ),
    download: (
      <>
        <path d="M10 3.5v9M6.5 9.5L10 13l3.5-3.5" {...p} />
        <path d="M4 16.5h12" {...p} />
      </>
    ),
    refresh: (
      <>
        <path d="M15.5 4.6v4h-4" {...p} />
        <path d="M13.8 14.6A6 6 0 1 1 15.5 8.6" {...p} />
      </>
    ),
    message: (
      <>
        <path d="M4 5h12a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0116 14H8l-3.5 3v-3H4a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 014 5z" {...p} />
      </>
    ),
    enter: (
      <>
        <path d="M9.5 4H14a2 2 0 012 2v8a2 2 0 01-2 2H9.5" {...p} />
        <path d="M3.5 10h8M8.5 6.5L12 10l-3.5 3.5" {...p} />
      </>
    ),
    search: (
      <>
        <circle cx="8.8" cy="8.8" r="5.2" {...p} />
        <path d="M12.7 12.7L16.5 16.5" {...p} />
      </>
    ),
    share: (
      <>
        <circle cx="5" cy="10" r="2.2" {...p} />
        <circle cx="14.5" cy="5" r="2.2" {...p} />
        <circle cx="14.5" cy="15" r="2.2" {...p} />
        <path d="M7 8.9l5.5-2.8M7 11.1l5.5 2.8" {...p} />
      </>
    ),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

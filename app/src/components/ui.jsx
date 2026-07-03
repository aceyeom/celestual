// ui.jsx — minimal primitives for CELESTUAL (galaxy edition). All color comes from
// the single source of truth in ../theme.js — nothing defines its own hexes — so
// the whole product reads as one cosmos on every screen.
import * as React from 'react'
import { GalaxyField } from '../galaxy.js'
import { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS } from '../theme.js'
import { searchHandles, normHandle } from '../api/celestual.js'

export { makeColors, rgba, RADIUS, SPACE, makeShadow, TOKENS }

// ── dialog accessibility ──────────────────────────────────────────────────────
// One shared hook for every overlay (account sheet, verify, star readout, nova):
// moves focus in, traps Tab inside, closes on Escape, and restores focus to
// wherever the person was. Attach the returned ref to the dialog element and
// give it role="dialog" aria-modal="true" tabIndex={-1}.
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

// Calm gradient backdrop for the entry screens (no canvas). It shares the deep
// cosmic-violet base with the galaxy and only lets the two star accents glow
// faintly through, so moving between the galaxy and these screens never swings
// to a different color world. A violet wash sits under the warm accent to keep
// it in the same family.
export function WarmBg({ C, variant = 'center', children }) {
  const violet = 'rgba(126,107,168,0.14)' // ties the wash to the galaxy's nebula
  const g = {
    center: `radial-gradient(560px 480px at 50% 34%, ${rgba(C.you, 0.15)}, transparent 70%),
             radial-gradient(620px 560px at 50% 36%, ${violet}, transparent 74%),
             radial-gradient(460px 420px at 82% 96%, ${rgba(C.them, 0.12)}, transparent 72%)`,
    low: `radial-gradient(540px 440px at 50% 90%, ${rgba(C.you, 0.15)}, transparent 72%),
             radial-gradient(600px 520px at 50% 88%, ${violet}, transparent 76%),
             radial-gradient(380px 340px at 14% 8%, ${rgba(C.them, 0.1)}, transparent 74%)`,
    quiet: `radial-gradient(640px 520px at 50% 16%, ${rgba(C.you, 0.1)}, transparent 72%),
             radial-gradient(700px 560px at 50% 14%, ${violet}, transparent 76%)`,
  }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.ink }}>
      <div style={{ position: 'absolute', inset: 0, background: g[variant] }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,.5) 100%)' }} />
      {children}
    </div>
  )
}

// React wrapper around the canvas GalaxyField. `onReady` hands the live field
// instance up so overlays (e.g. the star tag) can read the star's screen
// position each frame; `origin` is the normalized point the send-off drift
// starts from — where the @ morphed into a star.
export function GalaxyCanvas({ mode = 'idle', dim, you, them, sealColor, motion = 20, seals = 0, origin, onReady, style }) {
  const ref = React.useRef(null)
  const field = React.useRef(null)
  React.useEffect(() => {
    const f = new GalaxyField(ref.current, { you, them, motion })
    field.current = f
    f.setSeals(seals)
    f.setMode(mode, { dim, origin })
    f.start()
    if (onReady) onReady(f)
    // Dev-only handle for visual/automated testing of the field (positions, focus,
    // seal slots). Tree-shaken out of production builds via import.meta.env.DEV.
    if (import.meta.env.DEV) window.__galaxyField = f
    let ro
    let roRaf = 0
    if (window.ResizeObserver && ref.current && ref.current.parentElement) {
      // Coalesce a burst of resize callbacks (the mobile toolbar fires many as it
      // animates) into a single resize per frame; galaxy.resize() then itself
      // ignores the tiny height-only changes. Together this stops the canvas from
      // re-allocating every toolbar frame.
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
    if (field.current) field.current.setSeals(seals)
  }, [seals])
  React.useEffect(() => {
    if (field.current) field.current.setMode(mode, { dim, origin })
  }, [mode, dim, origin])
  React.useEffect(() => {
    if (field.current) field.current.setMotion(motion)
  }, [motion])
  React.useEffect(() => {
    if (field.current) field.current.setPalette(you, them)
  }, [you, them])
  // Nova seal style: the light the person's own sealed stars burn with.
  React.useEffect(() => {
    if (field.current && field.current.setSealColor) field.current.setSealColor(sealColor || null)
  }, [sealColor])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...style }} />
}

// Subtle @handle tags that trail the resting stars — one per sealed person, so
// every star floating in the field stays identifiable. Reads the galaxy's live
// per-star `sealedScreen` positions each frame and moves each tag imperatively
// (no React re-render churn). `handles` is aligned with the stars by index.
export function StarTags({ fieldRef, handles, mutual, color, matchColor, show, onTap }) {
  const refs = React.useRef([])
  const widths = React.useRef([]) // cached tag widths (stable per handle) — avoid per-frame layout
  React.useEffect(() => {
    widths.current = [] // handles changed → indices shifted, re-measure
    let raf
    const TH = 20 // tag height (for overlap tests)
    // Foreground text blocks (headline / handle / buttons) mark themselves with
    // [data-tag-keepout]; tags step around their on-screen rects so they never
    // land on top of the text. Those rects DON'T move within a screen, so we cache
    // them and re-measure only a few times a second (and on resize/scroll) instead
    // of calling getBoundingClientRect on every element every frame — reading
    // layout 60×/s was a major source of the mobile jank. Tag positions still
    // update every frame; only the keep-out measurement is throttled.
    let keepouts = []
    let lastMeasure = 0
    const measureKeepouts = () => {
      const els = document.querySelectorAll('[data-tag-keepout]')
      const out = []
      for (let k = 0; k < els.length; k++) {
        const r = els[k].getBoundingClientRect()
        if (r.width && r.height) out.push({ x: r.left, y: r.top, w: r.width, h: r.height })
      }
      keepouts = out
    }
    const invalidate = () => { lastMeasure = 0 } // force a re-measure next frame
    window.addEventListener('resize', invalidate)
    window.addEventListener('scroll', invalidate, { passive: true })
    const tick = (now) => {
      const f = fieldRef.current
      const arr = (f && f.sealedScreen) || []
      const vw = window.innerWidth, vh = window.innerHeight
      if (now - lastMeasure > 240) {
        measureKeepouts()
        lastMeasure = now
      }
      // Tags placed so far THIS frame, so later ones can yield instead of piling —
      // seeded with the cached keep-out rects (z-index raise below keeps tags above
      // content; this keeps them from sitting ON the text).
      const placed = keepouts.slice()
      for (let i = 0; i < refs.current.length; i++) {
        const el = refs.current[i]
        if (!el) continue
        const ps = arr[i]
        if (!(show && !!handles[i] && ps && ps.vis)) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }
        // Tag width is fixed for a given handle, so measure once and cache rather
        // than forcing a layout read every animation frame.
        let w = widths.current[i]
        if (w == null) {
          w = el.offsetWidth
          if (w) widths.current[i] = w
        }
        w = w || 84
        // Anchor up-and-right of the star, flipping sides / below when it'd spill.
        let x = ps.x + 12
        if (x + w > vw - 8) x = ps.x - 12 - w
        let y = ps.y - 24
        if (y < 8) y = ps.y + 16
        // The old code CLAMPED every tag into the viewport, which jammed a busy
        // sky's tags into a solid wall along the edges (the "goes very wrong" on
        // mobile). Instead: if the star sits off-screen, or the tag can't fit in
        // bounds, or it would collide with a tag already shown this frame, just
        // hide this one (it fades out gently). The star's @ is still reachable by
        // tapping it. Stable index order means the same tag always wins a contest,
        // so there's no frame-to-frame flicker.
        const starOff = ps.x < 6 || ps.x > vw - 6 || ps.y < 6 || ps.y > vh - 6
        const outOfBounds = x < 6 || x + w > vw - 6 || y < 6 || y + TH > vh - 6
        const rect = { x, y, w, h: TH }
        const hit = placed.some(
          (p) => !(rect.x + rect.w + 8 < p.x || rect.x > p.x + p.w + 8 || rect.y + rect.h + 6 < p.y || rect.y > p.y + p.h + 6),
        )
        if (starOff || outOfBounds || hit) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }
        placed.push(rect)
        el.style.opacity = '1'
        el.style.pointerEvents = 'auto'
        el.style.transform = `translate(${x}px, ${y}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', invalidate)
      window.removeEventListener('scroll', invalidate)
    }
  }, [show, fieldRef, handles])
  // Tag chips read in the single rose token by default — the stale old-palette
  // fallback ('#FF8C66') used to contradict theme.js here.
  const col = color || TOKENS.them
  // Mutual stars read in the warm "match" accent (and carry a ✦) so a busy sky
  // shows which stars found their way back, without opening each one.
  const mset = new Set((mutual || []).map(normHandle).filter(Boolean))
  return handles.map((h, i) => {
    const isM = mset.has(normHandle(h))
    const tagCol = isM ? matchColor || col : col
    // A real button, so the sky's stars are reachable by keyboard and screen
    // reader — not only by canvas hit-testing. Visibility (opacity + pointer
    // events) is driven imperatively per frame above.
    return (
      <button
        key={i}
        ref={(el) => (refs.current[i] = el)}
        onClick={onTap ? () => onTap(i) : undefined}
        aria-label={'@' + h}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          // Above the screen content (zIndex:4) so a tag is never hidden behind
          // the foreground, but below Liftoff (8) and every modal/overlay.
          zIndex: 6,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity .6s ease',
          willChange: 'transform',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '3px 10px',
          borderRadius: RADIUS.chip,
          cursor: 'pointer',
          background: isM ? rgba(tagCol, 0.14) : 'rgba(10,8,16,0.42)',
          border: `1px solid ${rgba(tagCol, isM ? 0.55 : 0.3)}`,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          fontFamily: "'Space Mono', monospace",
          fontSize: 10.5,
          letterSpacing: '.3px',
          color: 'rgba(244,236,227,0.82)',
          whiteSpace: 'nowrap',
        }}
      >
        {isM && <span style={{ color: rgba(tagCol, 0.95) }}>✦</span>}
        <span style={{ color: rgba(tagCol, 0.95) }}>@</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{h}</span>
      </button>
    )
  })
}

// The @ → star morph. The actual @ textbox (a ghost positioned exactly over the
// real field, via `geom`) collapses horizontally into a point, where a star
// ignites and glistens; it then dissolves as the galaxy's send-off drift — which
// starts from this same point — carries it away with a trail. A full-screen,
// one-shot overlay owned by App so it survives the screen change underneath it.
export function Liftoff({ C, handle, geom, col }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 402
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700
  const cx = geom?.cx ?? vw / 2
  const cy = geom?.cy ?? vh * 0.43
  const w = geom?.w ?? Math.min(360, vw - 48)
  const h = geom?.h ?? 60
  // `col` is the Nova seal style's light; defaults to the amber "you" token.
  const hue = col || C.you
  const spikeBg = (deg) => `linear-gradient(${deg}deg, transparent, ${rgba(hue, 0.7)} 34%, #fff 50%, ${rgba(hue, 0.7)} 66%, transparent)`
  // each star layer is a 0×0 anchor at (cx,cy); children center on it with margins
  const at0 = { position: 'absolute', left: 0, top: 0 }
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
      {/* the textbox ghost that collapses horizontally into a point */}
      <div
        className="lo-box"
        style={{
          position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: RADIUS.field,
          background: C.ink2, border: `1.5px solid ${rgba(hue, 0.55)}`, boxShadow: `0 0 26px ${rgba(hue, 0.18)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        <span className="lo-text" style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: Math.min(22, h * 0.36), color: C.cream, whiteSpace: 'nowrap' }}>
          <span style={{ color: C.you }}>@</span>{handle}
        </span>
      </div>
      {/* the star igniting where the slit pinched shut */}
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
        <span className="lo-halo" style={{ ...at0, width: 156, height: 156, marginLeft: -78, marginTop: -78, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(hue, 0.5)}, ${rgba(C.them, 0.12)} 45%, transparent 68%)` }} />
        <span className="lo-spike" style={{ ...at0, width: 140, height: 2, marginLeft: -70, marginTop: -1, background: spikeBg(90) }} />
        <span className="lo-spike" style={{ ...at0, width: 2, height: 140, marginLeft: -1, marginTop: -70, background: spikeBg(180) }} />
        <span className="lo-core" style={{ ...at0, width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: '#fff', boxShadow: `0 0 22px 7px ${rgba(hue, 0.85)}, 0 0 58px 20px ${rgba(hue, 0.4)}` }} />
      </div>
    </div>
  )
}

// The brand mark — just the four-point glisten, no wordmark. A single amber→rose
// star (the same concave sparkle as the favicon) so the brand reads as one of its
// own stars: simple, clean, and at home in the cosmos. `size` keeps the old call
// sites working; it maps to the glyph's rendered diameter.
export function Glisten({ C, size = 24, title }) {
  const you = (C && C.you) || '#FF9E6B'
  const them = (C && C.them) || '#E6749E'
  const gid = React.useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', overflow: 'visible', filter: `drop-shadow(0 0 6px ${rgba(you, 0.45)})` }}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="38%" stopColor="#FFE2C4" />
          <stop offset="80%" stopColor={you} />
          <stop offset="100%" stopColor={them} />
        </radialGradient>
      </defs>
      {/* concave four-point sparkle — pinched arms, the photographic glisten */}
      <path
        d="M16 1 Q17.6 14.4 31 16 Q17.6 17.6 16 31 Q14.4 17.6 1 16 Q14.4 14.4 16 1 Z"
        fill={`url(#${gid})`}
      />
    </svg>
  )
}

// Kept as `Brandmark` for the existing call sites — now icon-only. The historical
// `size` (a cap-height ~12–14) maps up to a comfortable glyph diameter.
export function Brandmark({ C, size = 14 }) {
  return <Glisten C={C} size={Math.round(size * 1.7)} title="Celestual" />
}

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
        // Shares RADIUS.field with the inputs above it — the Continue button and
        // the handle field now read as one family instead of fighting.
        borderRadius: RADIUS.field,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '.2px',
        color: disabled ? C.muted : C.onYou,
        background: disabled ? C.ink3 : `linear-gradient(180deg, ${C.you}, ${rgba(C.you, 0.86)})`,
        boxShadow: disabled ? 'none' : SHADOW.cta(C.you, h),
        transform: h && !disabled ? 'translateY(-1.5px)' : 'none',
        transition: 'transform .18s, box-shadow .25s, background .2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// Pill outline button — a clear secondary action that doesn't pull focus from
// the galaxy the way the solid amber PrimaryButton does. Used for "enter someone
// else" on the resting sky.
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

// unified input. kind: 'email' | 'handle'. emphasis = larger hero styling.
export function Field({ C, kind = 'handle', value, onChange, placeholder, accent, autoFocus, onEnter, emphasis }) {
  const [focus, setFocus] = React.useState(false)
  const col = accent || C.you
  const SHADOW = makeShadow(C)
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])
  const clean = (v) => (kind === 'email' ? v.replace(/\s/g, '') : v.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase())
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        // The bold, organic @ used to sit a hair (gap:4) from the typed text and
        // visually bleed into the first letter. Both variants now breathe at the
        // same SPACE.md so the prefix reads as a quiet prefix, not a glyph fused
        // to the username.
        gap: SPACE.md,
        width: '100%',
        // Emphasis is expressed through padding / glow / border, NOT a different
        // corner: every input shares RADIUS.field with the buttons below them.
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
      ) : (
        <Icon name="mail" size={emphasis ? 21 : 18} color={col} stroke={1.7} />
      )}
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
          fontFamily: kind === 'email' ? "'Space Grotesk', sans-serif" : "'Space Mono', monospace",
          fontSize: emphasis ? 19 : 18,
          color: C.cream,
          letterSpacing: '.2px',
          fontWeight: kind === 'email' ? 500 : 400,
        }}
      />
    </div>
  )
}

export function HandleChip({ C, handle, color, big }) {
  const col = color || C.you
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: big ? '8px 15px' : '5px 11px',
        borderRadius: RADIUS.chip,
        background: rgba(col, 0.12),
        border: `1px solid ${rgba(col, 0.42)}`,
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

// calm sonar ping — expanding rings + still core (replaces blinking status)
export function Sonar({ C, color, size = 16 }) {
  const col = color || C.you
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

export function StepDots({ C, step, n = 2 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: RADIUS.chip, background: i === step ? C.you : C.line, transition: 'all .3s' }} />
      ))}
    </div>
  )
}

export function BackBtn({ C, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: C.ink2, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
    >
      <Icon name="back" size={16} color="currentColor" stroke={1.9} />
    </button>
  )
}

// Compact language switcher (browser-lang is auto-detected; this is the manual
// override). A globe button that reveals the curated locales. Sits unobtrusively
// in a screen corner and works the same on phone and desktop.
export function LanguageSwitcher({ C, lang, langs, onChange }) {
  const [open, setOpen] = React.useState(false)
  const SHADOW = makeShadow(C)
  const ref = React.useRef(null)
  const menuRef = React.useRef(null)
  React.useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    // Keyboard path: Escape dismisses, arrows walk the locales.
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = menuRef.current ? Array.from(menuRef.current.querySelectorAll('button')) : []
        if (!items.length) return
        const i = items.indexOf(document.activeElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
        items[next].focus()
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 11px',
          borderRadius: RADIUS.chip, background: rgba(C.ink2, 0.7), border: `1px solid ${C.line}`,
          color: C.muted, cursor: 'pointer', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, letterSpacing: '.3px',
        }}
      >
        <Icon name="globe" size={14} color={C.muted} />
        <span style={{ textTransform: 'uppercase' }}>{lang}</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'absolute', top: 40, right: 0, zIndex: 30, minWidth: 150, padding: 6,
            borderRadius: RADIUS.card, background: rgba(C.ink2, 0.96), border: `1px solid ${C.line}`,
            boxShadow: SHADOW.menu, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            maxHeight: '60vh', overflowY: 'auto',
          }}
        >
          {Object.entries(langs).map(([code, name]) => (
            <button
              key={code}
              role="menuitem"
              onClick={() => {
                onChange(code)
                setOpen(false)
              }}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 12px', borderRadius: RADIUS.inner, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: code === lang ? rgba(C.you, 0.12) : 'transparent',
                color: code === lang ? C.cream : C.muted, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
              }}
            >
              {name}
              {code === lang && <Icon name="check" size={15} color={C.you} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The signed-in chip: a small amber→rose star avatar + the user's @handle, tucked
// in a screen corner. Tap to open the account area. Shows who you're signed in as
// (or just "account" before a handle is set).
export function ProfileButton({ C, handle, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Account"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 13px 0 7px',
        borderRadius: RADIUS.chip, background: rgba(C.ink2, 0.7), border: `1px solid ${C.line}`,
        color: C.cream, cursor: 'pointer', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        fontFamily: "'Space Mono', monospace", fontSize: 12.5, letterSpacing: '.2px', maxWidth: 220,
      }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 23, height: 23, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${rgba(C.you, 0.95)}, ${rgba(C.them, 0.78)})`, flexShrink: 0 }}>
        <Icon name="star" size={12} color={C.onYou} stroke={2} />
      </span>
      {handle ? (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: C.you }}>@</span>
          {handle}
        </span>
      ) : (
        <span style={{ color: C.muted }}>account</span>
      )}
    </button>
  )
}

// Instagram-style @ search. It's a normal validated handle field (manual entry
// always works) with a live typeahead dropdown layered on top. Results come from
// the pluggable searchHandles() adapter — empty until a server-side provider is
// wired, at which point suggestions appear automatically with no UI change.
export function HandleSearchField({ C, value, onChange, placeholder, accent, autoFocus, onEnter }) {
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
        accent={accent}
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
                background: i === active ? rgba(C.you, 0.1) : 'transparent',
              }}
            >
              <span
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: rgba(accent || C.you, 0.18), display: 'grid', placeItems: 'center',
                }}
              >
                {r.avatar ? (
                  <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: accent || C.you, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>@</span>
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.cream, fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
                  {r.handle}
                  {r.verified && <Icon name="check" size={13} color={accent || C.you} />}
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
    share: (
      <>
        <circle cx="6" cy="10" r="2.2" {...p} />
        <circle cx="14" cy="5" r="2.2" {...p} />
        <circle cx="14" cy="15" r="2.2" {...p} />
        <path d="M8 9l4-2.5M8 11l4 2.5" {...p} />
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
    globe: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M3 10h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14" {...p} />
      </>
    ),
    x: (
      <>
        <path d="M5 5l10 10M15 5L5 15" {...p} />
      </>
    ),
    trash: (
      <>
        <path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6M6.5 6l.6 9a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-9" {...p} />
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
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

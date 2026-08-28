// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SKY — the one thing the product is remembered by                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A fixed field of faint points behind every screen, where EACH POINT IS ONE
// LIVE UNSENT LETTER. That is not a decorative metaphor, it is the reason the
// field exists at all: the wall has to survive being nearly empty on launch
// night, and a sparse list reads as a dead product while a sparse star field
// reads as a quiet night. The honest thing and the beautiful thing are the same
// thing here, which is rare enough to be worth building around.
//
// It is also the connective tissue between the screens, and each mode is doing
// a specific emotional job:
//
//   ambient   Threshold, Search. Slow, present, not asking for anything.
//   slowing   the search itself. Drift decelerates to a stop while it looks.
//   still     NOTHING YET. The field stops dead. That stillness IS the empty
//             state and it does more work than any illustration would.
//   dim       a letter was found. The field drops to 40% and gets out of the
//             way, because on that screen the paper is the only bright object.
//   forward   /beta/sky. The field is the subject: it pulls forward, points
//             gain scale, and the orbit motif appears once, around your point.
//
// ── the performance shape ──────────────────────────────────────────────────
// Sixty points, hard cap. Every point is one absolutely-positioned 1–3px div
// whose ONLY animated property is a transform, driven by a CSS keyframe rather
// than a rAF loop — so after first paint this component does no work at all,
// the main thread is free, and the compositor owns the whole field. The
// parallax is a single transform on the one wrapper, not sixty.

import { useEffect, useMemo, useRef } from 'react'

export const MAX_POINTS = 60

// A small deterministic PRNG. Deterministic matters: the point that detaches
// and becomes a letter has to be in the same place on the screen before and
// after the route changes, and a field that reshuffles on every render turns
// that continuity into a flicker.
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5;  s >>>= 0
    return s / 4294967296
  }
}

const between = (r, lo, hi) => lo + r() * (hi - lo)

// The field, as data. Memoized on count so it is computed once per session.
export function skyPoints(count) {
  const n = Math.max(0, Math.min(MAX_POINTS, count | 0))
  const out = []
  for (let i = 0; i < n; i++) {
    const r = rng(0x9e37 + i * 2654435761)
    // Four or five carry a bloom. Any more and 'brighter' stops meaning
    // anything; any fewer and the field is flat.
    const bright = i % 9 === 4
    out.push({
      i,
      x: between(r, 3, 97),
      y: between(r, 3, 96),
      s: bright ? 2 : Math.round(between(r, 1, 3)),
      o: bright ? between(r, 0.45, 0.55) : between(r, 0.15, 0.5),
      dur: Math.round(between(r, 90, 180)),
      delay: -Math.round(between(r, 0, 180)),
      dx: between(r, -3, 3),
      dy: between(r, -3, 3),
      bright,
    })
  }
  return out
}

// Where a point sits, in viewport pixels. The letter screen needs this to
// launch the travelling point from exactly where the field had it — if the
// comet starts anywhere else the whole illusion is a light that came from
// nowhere.
export function pointPixels(count, index) {
  const pts = skyPoints(count)
  const p = pts[((index % pts.length) + pts.length) % pts.length]
  if (!p) return { x: 0, y: 0 }
  return { x: (p.x / 100) * window.innerWidth, y: (p.y / 100) * window.innerHeight }
}

// The scale /beta/sky pulls the field forward by. Exported because the orbit
// rings have to land on the user's point AFTER that scale — a motif that says
// "this one is yours" while sitting 40px off the point is worse than no motif.
export const FORWARD_SCALE = 1.35

// ── which point can be yours ────────────────────────────────────────────────
// Not any of them. The orbit rings on /beta/sky are drawn AROUND your point,
// and a point at 94% x puts three quarters of the motif off the side of a
// phone. So the point that becomes your letter is chosen from a band where a
// 240px ring fits and where the headline sits under it rather than through it.
//
// Two other approaches were built first and both were worse. Clamping the rings
// into a safe box puts the motif forty pixels off the point it is supposed to
// be identifying, which is worse than having no motif. Translating the whole
// field so your point lands under the rings reads beautifully in isolation and
// empties half the viewport of stars, because a 190px shift takes a third of a
// forty-point field off the left edge. Choosing a better point costs nothing
// and nobody can tell.
const BAND = { x0: 24, x1: 76, y0: 12, y1: 42 }

export function focusCandidates(count) {
  const pts = skyPoints(count)
  const inBand = pts.filter((p) => p.x >= BAND.x0 && p.x <= BAND.x1 && p.y >= BAND.y0 && p.y <= BAND.y1)
  // A field small enough to have nothing in the band still has to have a point
  // to call yours, so fall back to the whole field rather than to nothing.
  return (inBand.length ? inBand : pts).map((p) => p.i)
}

// Where a point ends up once the field has been pulled forward: the field is an
// inset:0 layer, so its origin is the centre of the viewport and the scale
// pushes every point away from that centre.
export function pointPixelsForward(count, index) {
  const { x, y } = pointPixels(count, index)
  const c = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  return { x: c.x + (x - c.x) * FORWARD_SCALE, y: c.y + (y - c.y) * FORWARD_SCALE }
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {{ count: number, mode?: 'ambient'|'slowing'|'still'|'dim'|'forward',
 *           yours?: number|null, parallax?: boolean, hidden?: boolean }} props
 */
export default function Sky({ count, mode = 'ambient', yours = null, parallax = false, hidden = false }) {
  const points = useMemo(() => skyPoints(count), [count])
  const inner = useRef(null)

  // Parallax, only on /beta/sky, only when motion is welcome, and capped at
  // ±8px because a field that swings further stops being a sky and starts
  // being a gimmick. Written straight to the style rather than through state:
  // this fires on every pointer move and has no business causing a render.
  useEffect(() => {
    if (!parallax || prefersReducedMotion()) return
    const el = inner.current
    if (!el) return
    let raf = 0
    let px = 0, py = 0

    const apply = () => {
      raf = 0
      el.style.setProperty('--px', `${px.toFixed(2)}px`)
      el.style.setProperty('--py', `${py.toFixed(2)}px`)
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply) }

    const onPointer = (e) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      px = ((e.clientX / w) - 0.5) * -16
      py = ((e.clientY / h) - 0.5) * -16
      queue()
    }
    // Device tilt, where the browser gives it up without a permission prompt.
    // No prompt is asked for: a modal from a page somebody reached by scanning
    // a flyer, before they have seen anything, costs more than the effect is
    // worth. Where it is refused, the pointer handler still covers a drag.
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      px = Math.max(-8, Math.min(8, (e.gamma / 45) * -8))
      py = Math.max(-8, Math.min(8, ((e.beta - 45) / 45) * -8))
      queue()
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('deviceorientation', onTilt, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onTilt)
      if (raf) cancelAnimationFrame(raf)
      el.style.removeProperty('--px')
      el.style.removeProperty('--py')
    }
  }, [parallax])

  return (
    // `hidden` is the Threshold's 1400ms fade-in, and it is an inline opacity
    // rather than a class because the transition it needs to run is the one
    // already on .beta-sky: setting 0 inline and then removing it lets the
    // stylesheet's own 1400ms carry the field up, with nothing to keep in sync.
    <div className="beta-sky" data-mode={mode} style={hidden ? { opacity: 0 } : undefined} aria-hidden="true">
      <div className="beta-field-inner" ref={inner}>
        {points.map((p) => (
          <i
            key={p.i}
            className={p.i === yours ? 'is-yours' : p.bright ? 'is-bright' : undefined}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              '--s': `${p.s}px`,
              '--o': p.o,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

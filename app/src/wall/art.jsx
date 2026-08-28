// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ART                                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every ornament in this build is drawn here, from a path or a loop, and there
// is not one downloaded asset, icon set or stock illustration in the tree. Two
// reasons, and only the second one is about taste:
//
//   1. Everything here is derived from a handle. The constellation beside a
//      name is that name's hash and nobody else's; the sphere's shading and
//      the field's drift come out of the same function. An icon set cannot do
//      that, because an icon set does not know what it is next to.
//   2. This brand is being judged against a reference that is entirely
//      geometry and type — a sparkle, a dotted sphere, a ring system, a blur.
//      Those five things are cheap to draw and impossible to buy without
//      looking like everybody else who bought them.
//
// The six primitives, and where the reference puts each one:
//   Sparkle    the four-point star, top-right of the poster and beside the title
//   Ecliptic   the brand mark — that same star with a ring around it
//   Halftone   the dotted sphere in the poster's bottom corner
//   Orbit      the ring system the journey screen opens on
//   Bloom      the soft blurred mass the modal is built around
//   Mark       the constellation that stands where the reference puts a face

import { useEffect, useId, useRef } from 'react'
import { hash, rand } from './data.js'

// ── the four-point star ─────────────────────────────────────────────────────
// The points are joined by curves that bow INWARD toward the centre, which is
// the whole difference between a sparkle and a plus sign. The control points
// sit at 30% along each arm: pull them to 45% and it becomes a diamond, drop
// them to 15% and it becomes a cross. 30% is the reference.
const SPARK = 'M50 0C51.5 29 62 40.5 100 50C62 59.5 51.5 71 50 100C48.5 71 38 59.5 0 50C38 40.5 48.5 29 50 0Z'

export function Sparkle({ size = 18, tone = 'chalk', twinkle = false, delay = 0, className = '', style }) {
  return (
    <svg
      className={`wl-spark${twinkle ? ' is-twinkle' : ''} ${className}`}
      style={{ '--spark-delay': `${delay}ms`, ...style }}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false"
    >
      <path d={SPARK} fill={tone === 'ember' ? 'var(--ember)' : tone === 'ink' ? 'var(--paper-ink)' : 'currentColor'} />
    </svg>
  )
}

// ── the mark ────────────────────────────────────────────────────────────────
// The wall's logo: the sparkle above, with a ring around it, seen from just off
// the ring's own plane.
//
// The ring is NOT a stroke. It is the area between two ellipses, the inner one
// pushed toward the far side, filled even-odd — so the band is widest along its
// near edge and narrows toward the back, which is what a tilted ring in
// perspective does. A stroke of even width has no near and no far, and reads as
// a hoop laid on top of the star rather than a ring around it.
//
// Depth is drawn, not implied: the far half of the ring is painted first and
// the star covers it, the near half is painted last over a star that has been
// notched to let it through. The notch is a HOLE, so the void shows in it — the
// same move star.svg makes, and the reason one drawing serves the tab, the
// void and an ivory print.
//
// One rule governs every number below. A side arm must sit inside the ring's
// hole or reach past its outer edge; an arm that ENDS inside the band gets
// notched off and left behind as a floating tip. That is why the star is narrow
// (SIDE 24 against UP 45) and why this ring is rounder than the 0.34 ellipses
// Orbit draws — a flatter hole has no room to hold the arms.
const ECL = {
  rx: 46,          // the ring, to the middle of its band
  flat: 0.38,      // ry/rx — the viewing angle. Lower is nearer the ring's plane
  tilt: -19,       // degrees off horizontal
  w: 2.5,          // half-width of the band along its NEAR edge
  taper: 0.58,     // the far edge, as a fraction of the near one. Real
                   // foreshortening lands near here; run it to zero and the
                   // ring stops reading as a ring and starts reading as a brush
  gutter: 1.8,     // the void between the ring and the star it crosses
  up: 45, down: 45, side: 24,
}

// SPARK's own control points, as fractions of each arm. The generator below at
// equal arms therefore redraws SPARK exactly: the mark's star is the same star,
// only narrowed.
const K = { a: 0.03, b: 0.42, c: 0.24, d: 0.19 }

const f2 = (v) => (Math.round(v * 100) / 100)

function starPath({ up, down, side }) {
  const pts = [[0, -up], [side, 0], [0, down], [-side, 0]]
  let d = `M0 ${-up}`
  for (let i = 0; i < 4; i++) {
    const from = pts[i], to = pts[(i + 1) % 4]
    // leaving a point on the vertical axis, or arriving at one: the control
    // pair is the same two offsets, in the other order
    const vert = from[0] === 0
    const sx = Math.sign(to[0]) || Math.sign(from[0])
    const sy = Math.sign(from[1]) || Math.sign(to[1])
    const arm = sy > 0 ? down : up
    const near = [K.a * side * sx, K.b * arm * sy]
    const far = [K.c * side * sx, K.d * arm * sy]
    const [c1, c2] = vert ? [near, far] : [far, near]
    d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${to[0]} ${to[1]}`
  }
  return `${d}Z`
}

function ellipse(cx, cy, a, b, tilt) {
  const t = (tilt * Math.PI) / 180
  const dx = a * Math.cos(t), dy = a * Math.sin(t)
  const arc = `A${f2(a)} ${f2(b)} ${tilt} 0 1 `
  return `M${f2(cx + dx)} ${f2(cy + dy)}${arc}${f2(cx - dx)} ${f2(cy - dy)}${arc}${f2(cx + dx)} ${f2(cy + dy)}Z`
}

// `grow` dilates the band, which is how the gutter that notches the star is cut
// from the very same numbers rather than from a second set that could drift.
function ringPath(grow = 0) {
  const { rx, flat, tilt, w, taper } = ECL
  const ry = rx * flat
  const near = w + grow, far = Math.max(0.02, w * taper + grow)
  const mid = (near + far) / 2, push = (near - far) / 2
  const t = (tilt * Math.PI) / 180
  return ellipse(50, 50, rx + mid, ry + mid, tilt)
       + ellipse(50 + Math.sin(t) * push, 50 - Math.cos(t) * push,
                 rx - mid, ry - mid, tilt)
}

const HALF = (tilt) => `rotate(${tilt} 50 50)`

export function Ecliptic({ size = 20, className = '', style, title }) {
  const id = useId().replace(/:/g, '')
  const ring = ringPath()
  return (
    <svg
      className={`wl-ecliptic ${className}`} style={style}
      width={size} height={size} viewBox="0 0 100 100"
      role={title ? 'img' : undefined} aria-label={title}
      aria-hidden={title ? undefined : 'true'} focusable="false"
    >
      <defs>
        {/* the near half of the ring, and the far half, split at the ends of
            its long axis — which is where a ring actually passes behind the
            body it is going round */}
        <clipPath id={`${id}n`}><rect x="-110" y="50" width="320" height="160" transform={HALF(ECL.tilt)} /></clipPath>
        <clipPath id={`${id}f`}><rect x="-110" y="-110" width="320" height="160" transform={HALF(ECL.tilt)} /></clipPath>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <path d={ringPath(ECL.gutter)} fill="#000" fillRule="evenodd" clipPath={`url(#${id}n)`} />
        </mask>
      </defs>
      <path d={ring} fill="currentColor" fillRule="evenodd" clipPath={`url(#${id}f)`} />
      <g mask={`url(#${id}m)`}>
        <path d={starPath(ECL)} transform="translate(50 50)" fill="currentColor" />
      </g>
      <path d={ring} fill="currentColor" fillRule="evenodd" clipPath={`url(#${id}n)`} />
    </svg>
  )
}

// The same drawing as one standalone file, for the browser tab.
//
// It is the SAME assembly, not a reduced one: an earlier pass notched the star
// against the whole ring instead of splitting it, which is invisible at sixteen
// pixels and leaves the top spire detached at a hundred and eighty — and this
// file is what an apple-touch-icon would point at. One mark, one drawing.
// currentColor is no use to a favicon, so this one is painted.
export function eclipticFavicon(tone = '#F4F1EA') {
  const half = `rotate(${ECL.tilt} 50 50)`
  const ring = ringPath()
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    + `<defs><clipPath id="n"><rect x="-110" y="50" width="320" height="160" transform="${half}"/></clipPath>`
    + `<clipPath id="f"><rect x="-110" y="-110" width="320" height="160" transform="${half}"/></clipPath>`
    + '<mask id="m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">'
    + '<rect x="-10" y="-10" width="120" height="120" fill="#fff"/>'
    + `<path d="${ringPath(ECL.gutter)}" fill="#000" fill-rule="evenodd" clip-path="url(#n)"/></mask></defs>`
    + `<path d="${ring}" fill="${tone}" fill-rule="evenodd" clip-path="url(#f)"/>`
    // the mask is on the group, never on the transformed path itself: a
    // userSpaceOnUse mask resolves in the coordinate system the element it sits
    // on establishes, so a translate on the same node drags the notch with it
    + `<g mask="url(#m)"><path d="${starPath(ECL)}" transform="translate(50 50)" fill="${tone}"/></g>`
    + `<path d="${ring}" fill="${tone}" fill-rule="evenodd" clip-path="url(#n)"/></svg>`
}

// ── the halftone sphere ─────────────────────────────────────────────────────
// A sphere rendered as a dot screen: dots on a fixed grid, clipped to a circle,
// each one sized by how far it is from a light source that sits off the
// upper-left shoulder. Near the light the dots swell until they nearly touch
// and read as solid; away from it they shrink to nothing and the ground shows
// through. That falloff IS the shading — there is no gradient anywhere in it.
//
// Built once into a path per render rather than as N elements: a 22×22 grid is
// ~380 circles, and 380 nodes for an ornament is a bad trade on a phone.
export function Halftone({ size = 96, grid = 20, className = '', style }) {
  const step = 100 / grid
  const dots = []
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const cx = (x + 0.5) * step
      const cy = (y + 0.5) * step
      const dx = cx - 50, dy = cy - 50
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 49) continue
      // distance from the light, normalised across the ball's diameter
      const lx = cx - 30, ly = cy - 28
      const lit = Math.sqrt(lx * lx + ly * ly) / 92
      // a hard rim keeps the silhouette readable once the dots get small
      const edge = Math.min(1, (49 - d) / 8)
      const r = Math.max(0, (0.52 - lit * 0.62)) * step * 1.5 * (0.35 + edge * 0.65)
      if (r < 0.16) continue
      dots.push(`M${cx.toFixed(2)} ${cy.toFixed(2)}m-${r.toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 -${(r * 2).toFixed(2)} 0`)
    }
  }
  return (
    <svg className={`wl-halftone ${className}`} style={style} width={size} height={size}
      viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={dots.join('')} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

// ── the ring system ─────────────────────────────────────────────────────────
// The journey screen opens on a body with rings around it and small bodies
// riding them. Here it carries a meaning rather than a mood: the centre is
// you, each ring is a ping you have standing, and the body on the ring is the
// person it went to. A mutual ring closes — it is the only one drawn solid,
// and the only one carrying a lit body.
//
// The bodies move by CSS on an SVG <animateTransform>-free path: each is
// wrapped in a <g> that rotates about the centre, so one transform per body
// and nothing recomputes geometry per frame.
export function Orbit({ size = 300, rings = [], still = false, className = '', style }) {
  const cx = 50, cy = 50
  return (
    <svg
      className={`wl-orbit${still ? ' is-still' : ''} ${className}`}
      style={style} width={size} height={size} viewBox="0 0 100 100"
      aria-hidden="true" focusable="false"
    >
      <defs>
        <radialGradient id="wl-core" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#2A2731" />
          <stop offset="62%" stopColor="#131219" />
          <stop offset="100%" stopColor="#0A0910" />
        </radialGradient>
        <radialGradient id="wl-corona" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="rgba(255,244,228,0.16)" />
          <stop offset="100%" stopColor="rgba(255,244,228,0)" />
        </radialGradient>
      </defs>

      {/* the rings, outermost first so the near ones overlap them */}
      {rings.map((r, i) => (
        <ellipse
          key={`r${i}`} cx={cx} cy={cy} rx={r.rx} ry={r.rx * 0.34}
          className={`wl-ring${r.closed ? ' is-closed' : ''}${r.fading ? ' is-fading' : ''}`}
        />
      ))}

      {/* the corona, then the body. The corona is wider than the body and
          fades to nothing, so the centre has a presence without a glow ring
          around it — a hard-edged halo is the tell of a drawn sun. */}
      <circle cx={cx} cy={cy} r="26" fill="url(#wl-corona)" />
      <circle cx={cx} cy={cy} r="13.5" fill="url(#wl-core)" />
      {/* the terminator: one thin arc of light down the lit side, no more */}
      <path d="M50 36.5a13.5 13.5 0 0 1 0 27" className="wl-orbit-rim" />

      {/* the bodies. Each rides its own ring on its own period and its own
          phase, so they never line up into a pattern the eye can lock onto.
          They travel by CSS motion path rather than by a rotation inside a
          squashed group: squashing the group to make the ring elliptical
          squashes the moon on it too, and a planet that flattens into a lens
          at three and nine o'clock is the tell of a fake orbit. offset-path
          moves a round moon along an elliptical route and leaves it round. */}
      {rings.map((r, i) => {
        const ry = (r.rx * 0.34).toFixed(2)
        const d = `M${(cx - r.rx).toFixed(2)} ${cy}a${r.rx} ${ry} 0 1 0 ${(r.rx * 2).toFixed(2)} 0a${r.rx} ${ry} 0 1 0 ${(-r.rx * 2).toFixed(2)} 0`
        return (
          <circle
            key={`b${i}`} cx="0" cy="0" r={r.moon || 1.9}
            className={`wl-moon${r.closed ? ' is-lit' : ''}`}
            style={{
              offsetPath: `path('${d}')`,
              animationDuration: `${r.period || 30}s`,
              animationDelay: `${-(r.phase || 0) * (r.period || 30)}s`,
            }}
          />
        )
      })}
    </svg>
  )
}

// ── the bloom ───────────────────────────────────────────────────────────────
// The reference's modal is built around one enormous, heavily blurred white
// mass and nothing else. That mass is doing all of the emotional work on the
// screen, and it is doing it because it is the ONLY bright thing there.
//
// So: at most one per screen, and it is a luminance rather than a colour — a
// four-point star pushed through a 26px blur until the arms dissolve and only
// the warmth of it is left. A blur this heavy on a live element is a real cost
// on a phone, so it is drawn once into an SVG filter and promoted, not stacked
// out of box-shadows.
export function Bloom({ size = 300, opacity = 0.5, className = '', style }) {
  return (
    <svg className={`wl-bloom ${className}`} style={{ opacity, ...style }}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <filter id="wl-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <radialGradient id="wl-warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.95" />
          <stop offset="34%" stopColor="var(--glow)" stopOpacity="0.24" />
          <stop offset="72%" stopColor="var(--glow)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#wl-warm)" />
      <g filter="url(#wl-soft)" opacity="0.55">
        <path d={SPARK} fill="var(--glow)" transform="translate(18 18) scale(0.64)" />
      </g>
    </svg>
  )
}

// ── the constellation ───────────────────────────────────────────────────────
// Where the reference puts a circular photograph beside a name, this build
// puts a small star figure derived from the handle. Not decoration and not an
// avatar substitute: the same handle draws the same figure everywhere it
// appears, so a person learns their own mark on the wall and recognises it in
// a list two screens later without reading the text.
//
// Four to six stars, placed on a jittered ring so no figure collapses into a
// line, joined in sequence by a hairline. The brightest star is the first one.
export function Mark({ handle, size = 34, lit = false, className = '', style }) {
  const seed = hash(handle || 'celestual')
  const n = 4 + (seed % 3)
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(handle, i) * 1.1
    const r = 20 + rand(handle, i + 40) * 16
    pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r])
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')
  return (
    <svg className={`wl-mark${lit ? ' is-lit' : ''} ${className}`} style={style}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="48" className="wl-mark-ring" />
      <path d={line} className="wl-mark-line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 4.4 : 2.6} className="wl-mark-star" />
      ))}
    </svg>
  )
}

// ── the field ───────────────────────────────────────────────────────────────
// The ground the whole prototype sits on. Every point is one live letter, so
// the density of the sky is the real size of the wall and a thin wall looks
// thin — which is honest, and which is also why the field is worth having at
// all rather than being a background image.
//
// Canvas, not DOM. Ninety drifting nodes is ninety composited layers the
// browser has to reconcile every frame; on a canvas it is one. It idles at
// well under a frame's budget because nothing here is recomputed — positions
// come out of the hash once, and the only per-frame work is a phase advance
// and a fill.
export function Field({ count = 72, mode = 'drift', hidden = false }) {
  const ref = useRef(null)
  const state = useRef({ raf: 0, t: 0, mode, target: 1, ease: 1 })

  useEffect(() => { state.current.mode = mode }, [mode])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: true })
    if (!ctx) return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1
    const stars = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand(`f${i}`, 1),
        y: rand(`f${i}`, 2),
        // a cubed magnitude puts most of the field near invisible and a handful
        // genuinely bright, which is what a real sky does and what an evenly
        // random one conspicuously does not
        m: Math.pow(rand(`f${i}`, 3), 3),
        sp: 0.25 + rand(`f${i}`, 4) * 0.75,
        ph: rand(`f${i}`, 5) * Math.PI * 2,
      })
    }

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(cv)

    let last = performance.now()
    function frame(now) {
      const dt = Math.min(48, now - last); last = now
      const s = state.current
      // `still` does not stop the field on the frame it is asked to — it
      // decelerates over about a second. A sky that halts is a bug; a sky that
      // slows to nothing is the room holding its breath, which is the point.
      s.target = s.mode === 'still' ? 0 : s.mode === 'slow' ? 0.18 : 1
      s.ease += (s.target - s.ease) * Math.min(1, dt / 620)
      s.t += dt * 0.001 * s.ease

      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i]
        // a slow lateral drift that wraps, plus a breath on the alpha
        const x = ((st.x + s.t * 0.004 * st.sp) % 1) * w
        const y = st.y * h
        const tw = 0.55 + 0.45 * Math.sin(s.t * 0.6 * st.sp + st.ph)
        const a = (0.05 + st.m * 0.62) * (0.55 + tw * 0.45)
        const r = 0.5 + st.m * 1.35
        ctx.globalAlpha = a
        ctx.fillStyle = '#F4F1EA'
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 6.2832)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      s.raf = requestAnimationFrame(frame)
    }

    if (reduce) {
      // One static frame. The field still carries its meaning — this many
      // points, this many letters — it simply does not move.
      state.current.ease = 0
      frame(performance.now())
      cancelAnimationFrame(state.current.raf)
    } else {
      state.current.raf = requestAnimationFrame(frame)
    }

    return () => { cancelAnimationFrame(state.current.raf); ro.disconnect() }
  }, [count])

  return <canvas ref={ref} className={`wl-starfield${hidden ? ' is-hidden' : ''}`} aria-hidden="true" />
}

// ── the step dots ───────────────────────────────────────────────────────────
// Straight off the bottom of the poster. Used for the composer's three steps,
// which is the only place in the build with a sequence worth counting.
export function Dots({ n, at, onGo }) {
  return (
    <div className="wl-dots" role="tablist" aria-label="step">
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i} type="button" role="tab" aria-selected={i === at}
          aria-label={`step ${i + 1}`}
          className={`wl-dot${i === at ? ' is-on' : ''}${i < at ? ' is-done' : ''}`}
          onClick={onGo && i < at ? () => onGo(i) : undefined}
          disabled={!onGo || i > at}
        />
      ))}
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ALIGNMENT                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The hero's one interactive object, and the reason this surface is a signature
// surface rather than a page with a headline on it.
//
// The mark is a star inside a ring. This takes the mark apart: two rings, drawn
// from the same `ringPath()` the logo is drawn from, tilted away from each other
// and turning back toward each other. Two orbits, two people. As they close on
// one another the star between them comes up, and at the moment they coincide
// they stop being two rings and become the mark.
//
// That is the product, drawn: nothing exists until both sides are pointing at
// the same thing, and the instant they are, one object stands where there were
// two. Nobody has to be told what it means for it to work.
//
// ── how it is driven, and by what ───────────────────────────────────────────
// A fine pointer drives it: the closer the hand is to the object's centre, the
// closer the alignment. Where there is no fine pointer, which is the majority
// case for this product, it runs on its own clock. The orbits fall apart and
// come back together once every nine seconds and the mark forms for a beat, so
// the interaction is never the only way to see the thing happen.
//
// Under prefers-reduced-motion it is drawn aligned, lit and still. That is the
// composed static fallback 7.2 asks for: the final frame, not an empty one.
//
// ── why there is no state in here ──────────────────────────────────────────
// Every value below is one number, written straight onto four nodes inside the
// frame callback. Putting that number in React state would re-render this tree
// sixty times a second to change four attributes, which is the difference
// between this holding 60fps on a mid range phone and not.

import { useEffect, useRef } from 'react'
import { ECL, NEAR, ringPath, starPath } from '../wall/mark.js'

const RING = ringPath()
const NOTCH = ringPath(ECL.gutter)
const STAR = starPath(ECL)

// How far apart the two orbits stand when nothing is aligning them. Chosen off
// the geometry rather than by eye: at 46 degrees the two bands cross near the
// ends of the long axis, where each is at its widest, so the crossings read as
// two objects overlapping rather than as one thick band.
const SPREAD = 46

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const ease = (t) => t * t * (3 - 2 * t)

export default function Alignment({ size = 320, still = false, id = 'a' }) {
  const box = useRef(null)
  const ghost = useRef(null)
  const star = useRef(null)
  const bloom = useRef(null)
  const rings = useRef(null)

  useEffect(() => {
    const paint = (k) => {
      if (ghost.current) {
        ghost.current.setAttribute('transform', `rotate(${(SPREAD * (1 - k)).toFixed(2)} 50 50)`)
        ghost.current.setAttribute('opacity', (0.16 + k * 0.5).toFixed(3))
      }
      // The star comes up late and fast, and the light later still, so the glow
      // is the last thing to happen rather than the first.
      if (star.current) star.current.setAttribute('opacity', Math.pow(k, 3.2).toFixed(3))
      if (rings.current) rings.current.setAttribute('opacity', (0.34 + k * 0.66).toFixed(3))
      if (bloom.current) bloom.current.style.opacity = Math.pow(k, 5).toFixed(3)
    }

    if (still) { paint(1); return }

    const el = box.current
    if (!el) return

    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches
    let raf = 0
    let target = 0
    let value = 0
    let hand = false
    let last = performance.now()
    const t0 = last

    // How long the object takes to cover most of the distance to where it is
    // going, in SECONDS. A per frame coefficient is a different spring on every
    // device: the same number settles in a third of a second at 60fps and in
    // four on a phone holding fifteen. Two constants rather than one, because
    // the hand gets the quicker of them (a control that lags the pointer feels
    // broken) and the autonomous cycle gets the slower (it is breathing).
    const TAU_HAND = 0.11
    const TAU_DRIFT = 0.20

    function onMove(e) {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      // One at the centre, nothing past a radius and a half. Smoothstepped, so
      // the last few degrees of alignment take the most hand, which is what
      // makes finding it feel like finding it.
      target = ease(clamp(1 - Math.hypot(dx, dy) / 1.5, 0, 1))
      hand = true
    }
    function onLeave() { hand = false }

    if (fine) {
      window.addEventListener('pointermove', onMove, { passive: true })
      el.addEventListener('pointerleave', onLeave)
    }

    function frame(now) {
      if (!hand) {
        // Three parts, and the first two happen once.
        //
        // The object holds apart while the page enters, arrives over a second
        // and a half, STANDS for two, and only then starts breathing on the
        // nine second cosine. Without that opening the surface loads mid cycle
        // and the first thing anybody ever sees is the mark half undone, which
        // is the one state it should never introduce itself in. Without the
        // hold it arrives and leaves in the same breath, which reads as a
        // glitch rather than as an arrival.
        const t = (now - t0) / 1000
        if (t < 0.7) target = 0                             // the page enters
        else if (t < 2.2) target = ease((t - 0.7) / 1.5)    // the orbits arrive
        else if (t < 4.4) target = 1                        // and the mark stands
        else target = ease(clamp((Math.cos(((t - 4.4) / 9) * Math.PI * 2) + 1) / 2, 0, 1))
      }
      // Eased toward, never snapped to. The hand leads and the object follows.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      value += (target - value) * (1 - Math.exp(-dt / (hand ? TAU_HAND : TAU_DRIFT)))
      paint(value)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [still])

  const near = `sg-near-${id}`
  const notch = `sg-notch-${id}`

  return (
    <div className="sg-align" ref={box} style={{ width: size, height: size }}>
      <div className="sg-align-bloom" ref={bloom} style={{ opacity: 0 }} aria-hidden="true" />
      <svg
        viewBox="0 0 100 100" width={size} height={size}
        role="img" aria-label="two orbits closing on one another until they form the mark"
      >
        <defs>
          {/* The near half plane, so the ring passes in front of the star at the
              bottom of its circuit exactly as the mark does. */}
          <clipPath id={near}>
            <rect x={NEAR.x} y={NEAR.y} width={NEAR.width} height={NEAR.height} transform={NEAR.transform} />
          </clipPath>
          <mask id={notch} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
            <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
            <path d={NOTCH} fill="#000" fillRule="evenodd" clipPath={`url(#${near})`} />
          </mask>
        </defs>

        {/* The other orbit, turning back. Never brighter than the one it is
            closing on, because the two are the same kind of thing. */}
        <g ref={ghost} opacity="0.16" transform={`rotate(${SPREAD} 50 50)`}>
          <path d={RING} fill="currentColor" fillRule="evenodd" />
        </g>

        {/* And the mark's own three layers, in the mark's own order: the whole
            ring, the star notched by the near band's gutter, the near band over
            the top. At full alignment this is the logo, drawn by the logo's
            code, with nothing added. */}
        <g ref={rings} opacity="0.34">
          <path d={RING} fill="currentColor" fillRule="evenodd" />
          <g mask={`url(#${notch})`}>
            <path ref={star} d={STAR} transform="translate(50 50)" fill="currentColor" opacity="0" />
          </g>
          <path d={RING} fill="currentColor" fillRule="evenodd" clipPath={`url(#${near})`} />
        </g>
      </svg>
    </div>
  )
}

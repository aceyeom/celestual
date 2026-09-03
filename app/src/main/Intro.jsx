// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first two seconds of the front door                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall has an overture: the mark assembling itself on black, once per tab,
// before the page exists. This is Main's, and it is the same assembly with one
// difference: the mark is not drawn here, it is poured. LiquidMark renders the
// silhouette as a metal surface with a current under it, and this is the one
// place in the product that material is spent at size.
//
// Nothing else is on the screen. No name, because the name is in the corner of
// the page underneath; no bloom, because a material with a current in it is
// already the light. The logo, and the black it comes out of.
//
// ── how a shader is drawn in ────────────────────────────────────────────────
// The overture reveals its ring with a mask sweeping the band's own centreline
// and its star with a scale up off nothing. A fragment shader cannot be masked
// that way, so the same two moves are made with a COVER: a black sheet over
// the metal, on the black veil, cut away by one SVG mask that carries both
// sweeps. The sweep runs the route the ring actually takes (ECL_SPINE, clipped
// to the band) and the star opens as a hole the star's own shape, so the
// metal arrives in the order the overture assembles in, and out of the same
// nine constants.
//
// ── the beats: 2120ms, first frame to bare page ─────────────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves.
//   1 ·  180ms   THE CIRCUIT. The band is uncovered round its orbit, 900ms,
//                slow at both ends, and the metal under it is already flowing.
//   2 ·  520ms   THE STAR. It opens while the circuit is still closing behind
//                it, up off nothing with a few degrees bleeding out.
//   3 · 1180ms   ASSEMBLED. Nothing moves but the metal.
//   4 · 1560ms   THE LIFT, after a hold. The mark drifts up and dissolves
//                while the black goes with it, and the hero is already rising
//                underneath by the time the black is half gone.
//     · 2120ms   the black is gone.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to `/` from the sky does not replay it,
// a refresh does. It is skippable on any tap or key. Under prefers-reduced-
// motion it renders assembled, holds a beat, and lifts; the metal stands
// still. And it never plays over any address but the front door.

import { useEffect, useId, useRef, useState } from 'react'
import { ECL, ECL_SPINE, ringPath, starPath } from '../wall/mark.js'
import LiquidMark from './LiquidMark.jsx'
import './intro.css'

//                 0    1    2     3     4
const BEATS = [0, 180, 520, 1180, 1560]
const LIFT = 4
const OUT = 560

// The band, dilated a hair, so the sweep's cut clears the metal's own edge.
const BAND = ringPath(1.6)
// The star, a little fuller than the mark's, for the same reason: the hole
// has to be at least the shape it uncovers.
const STAR = starPath({ up: ECL.up + 1.6, down: ECL.down + 1.6, side: ECL.side + 1.6, thick: 0.96 })

// A beat to hold on, for the screenshot loop only. `/?beat=3` draws the intro
// assembled and leaves it there; nothing in production reads the query string.
function heldBeat() {
  if (!import.meta.env.DEV) return null
  const b = new URLSearchParams(window.location.search).get('beat')
  return b === null ? null : Math.max(0, Math.min(LIFT, Number(b) || 0))
}

export default function Intro({ reduce, onReveal, onDone }) {
  const hold = useRef(heldBeat()).current
  const [at, setAt] = useState(hold ?? 0)
  const timers = useRef([])
  const done = useRef(false)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setAt(LIFT)
  }

  useEffect(() => {
    if (hold !== null) return undefined
    if (reduce) {
      setAt(3)
      timers.current.push(setTimeout(() => setAt(LIFT), 560))
      return () => timers.current.forEach(clearTimeout)
    }
    // Geometry only, so every beat can start on the first frame: there is no
    // face to wait for any more.
    BEATS.forEach((ms, i) => {
      if (i === 0) return
      timers.current.push(setTimeout(() => setAt(i), ms))
    })
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, hold])

  useEffect(() => {
    if (hold !== null) return undefined
    const go = () => skip.current()
    window.addEventListener('pointerdown', go)
    window.addEventListener('keydown', go)
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [hold])

  // The page is mounted the instant the lift starts and is already rising by
  // the time the black is half gone: one movement, not two screens.
  useEffect(() => {
    if (at < LIFT || done.current) return undefined
    done.current = true
    onReveal()
    const t = setTimeout(onDone, OUT)
    return () => clearTimeout(t)
  }, [at, onReveal, onDone])

  return (
    <div className={`hi is-at${at}`} aria-hidden="true">
      <div className="hi-veil" />
      <div className="hi-stage">
        <div className="hi-mark">
          <LiquidMark size="100%" speed={at >= LIFT ? 0.35 : 0.8} still={reduce} />
          {/* the cover. Black on black, and the mask is where the sequence
              lives: white keeps the cover, black cuts it away. */}
          <svg className="hi-cover" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={`${uid}b`}>
                <path d={BAND} clipRule="evenodd" />
              </clipPath>
              <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
                <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
                <path
                  className="hi-sweep" d={ECL_SPINE} pathLength="100"
                  fill="none" stroke="#000" strokeWidth="26"
                  strokeDasharray="100" strokeDashoffset="100"
                  clipPath={`url(#${uid}b)`}
                />
                <g className="hi-star">
                  <path d={STAR} transform="translate(50 50)" fill="#000" />
                </g>
              </mask>
            </defs>
            <rect x="-10" y="-10" width="120" height="120" fill="#000" mask={`url(#${uid}m)`} />
          </svg>
        </div>
      </div>
    </div>
  )
}

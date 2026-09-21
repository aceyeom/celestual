// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first two seconds of either surface                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The mark, poured, on black, once per tab, before the page exists. It plays
// over the front door at `/` and over the wall at `/berkeley`, and it is the
// same sequence on both: the wall used to have an overture of its own, a flat
// mark assembling beside the name with a bloom behind it, and Main had this,
// and the two surfaces of one product opened on two different logos. Now they
// open on one. LiquidMark renders the silhouette as a metal surface with a
// current under it, and this is the one place in the product that material is
// spent at size.
//
// Nothing else is on the screen. No name, because the name is in the bar of
// the page underneath on both surfaces now; no bloom, because a material with
// a current in it is already the light. The logo, and the black it comes out
// of.
//
// ── how a shader is drawn in ────────────────────────────────────────────────
// The old overture revealed its ring with a mask sweeping the band's own
// centreline and its star with a scale up off nothing. A fragment shader
// cannot be masked that way, so the same two moves are made with a COVER: a
// black sheet over the metal, on the black veil, cut away by one SVG mask that
// carries both sweeps. The sweep runs the route the ring actually takes
// (ECL_SPINE, clipped to the band) and the star opens as a hole the star's own
// shape, so the metal arrives in the order the mark assembles in, and out of
// the same nine constants.
//
// Both cuts are FEATHERED, which is the difference between a mark that lights
// and a mark that is wiped on. See `FEATHER` below for what a hard edge over a
// material did to this.
//
// ── the cover leaves before the lift does ───────────────────────────────────
// The cover is a black square a fifth wider than the mark, and once the mark
// is assembled every cut in it is open, so the square is doing nothing but
// being black on black. It used to lift WITH the stage, and for the half
// second the black veil and the stage were both on their way out at different
// rates the square was visible as a darker square over the page, with its
// edge, around the mark. So it fades out on the assembled beat, while the veil
// is still opaque and nothing can be seen changing, and what lifts is the
// metal alone.
//
// ── the beats: 2280ms, first frame to bare page ─────────────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves.
//   1 ·  180ms   THE CIRCUIT. The band is uncovered round its orbit, 900ms,
//                slow at both ends, and the metal under it is already flowing.
//   2 ·  520ms   THE STAR. It opens while the circuit is still closing behind
//                it, up off nothing with a few degrees bleeding out.
//   3 · 1180ms   ASSEMBLED. Nothing moves but the metal, and the cover goes.
//   4 · 1560ms   THE LIFT, after a hold. The mark drifts up and dissolves
//                while the black goes with it, and the page is already rising
//                underneath by the time the black is half gone.
//     · 2280ms   the black is gone.
//
// ── and the metal is there before the first cut ─────────────────────────────
// The held frame is at least 180ms and it is longer when the metal needs
// longer: the shader is compiled and its first frame drawn behind the cover,
// and beat 1 waits for LiquidMark to say so (`onReady`), up to HOLD_MAX from
// mount. It used to start on the clock alone, and on a phone, where the
// compile takes longer than the held frame, the circuit was cut open over
// the flat chalk mark and the metal arrived a moment later on a ring already
// on the screen: the ring was seen to blink from chalk to metal. Now the
// sequence uncovers the metal from its first pixel, and the swap under the
// cover is instant (`cut`), since nothing under a cover can be seen changing
// and a fade still running when the cover opens is a fade seen on the ring.
// Past the ceiling the sequence runs on the chalk mark and the metal fades in
// over it, gently, which is the designed state for a driver that is slow or
// never answers.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to the front from the sky, or back to
// the wall from a letter, does not replay it; a refresh does. It is skippable
// on any tap or key. Under prefers-reduced-motion it renders assembled, holds
// a beat, and lifts; the metal stands still.
//
// ── and it waits, when there is something to wait for ───────────────────────
// `ready` is whether the page under it is ready to be seen. The wall hands it
// false until its index and the faces on its first screen have landed
// (index.jsx), and the lift holds on the assembled mark, metal flowing, until
// it is true: the one screen in the product built to be looked at while
// something else finishes is this one, and a wall drawn with sixty grey discs
// that fill in a second later is a wall that arrived too early. It is never a
// spinner and never says it is loading. The mark holds, and then it lifts.
// The shell puts a ceiling on it, so a dead network is a wall of monograms
// and not a logo forever; and a tap still lifts it at once, because a brand
// animation that cannot be got out of is a toll gate.

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ECL, ECL_SPINE, f2, rad, ringPath, starPath } from './mark.js'
import LiquidMark from './LiquidMark.jsx'
import './intro.css'

//                 0    1    2     3     4
const BEATS = [0, 180, 520, 1180, 1560]
const LIFT = 4
// How long the black takes to leave. 1560 + 720 = 2280.
const OUT = 720
// The most the held frame is stretched waiting for the metal, from mount. A
// shader that has not drawn by then is a slow driver, and the mark it gets is
// the chalk one, which is a mark and not a hole.
const HOLD_MAX = 760

// The band, dilated a hair, so the sweep's cut clears the metal's own edge.
const BAND = ringPath(1.6)

// ── the cuts are feathered, and that is the whole of the polish ─────────────
// Both holes in the cover used to be hard-edged shapes, and a hard edge over a
// material is an edge the material did not ask for. The sweep is a thick
// butt-capped stroke clipped to the band, so its head was a STRAIGHT CHORD
// across the ring: wherever the metal happened to be bright under it, the mark
// was drawn in with a blunt white wedge on the end of it, and the last of the
// orbit closed as a notch with two square corners — a bite out of the logo,
// with nothing in it belonging to the logo's own curves. The star had the same
// problem more quietly: a crisp silhouette held at a third of its opacity is a
// crisp outline of the star, drawn in grey.
//
// So the cover's cuts carry a blur (`FEATHER`, `STAR_FEATHER`). The sweep's
// goes on the stroke and the band clips the group ABOVE it, so the blur is
// taken on a 26-wide stroke and then cut back to a band under ten: the ring's
// own silhouette lands as sharp as it is drawn, and the only soft thing in the
// frame is the front of the reveal. The metal lights along the orbit now,
// rather than being wiped by a rectangle.
//
// Every hole is dilated by the blur it carries, so that when the sequence is
// assembled — while the cover is still up, before beat 3 fades it — the cuts
// are open past the mark on every side and no soft edge is resting on the
// metal. `feather()` is that reach in one place, since a blur that grew
// without its dilation growing with it would dim the mark's own rim.
const FEATHER = 2.4
const STAR_FEATHER = 1.6
const feather = (sd) => sd * 2.2

// The star, fuller than the mark's, so the hole is at least the shape it
// uncovers and its own feather falls outside the metal.
const STAR_GROW = 1.6 + feather(STAR_FEATHER)
const STAR = starPath({
  up: ECL.up + STAR_GROW, down: ECL.down + STAR_GROW, side: ECL.side + STAR_GROW, thick: 0.96,
})

// ── and each filter is given the box it actually needs ──────────────────────
// A filter region is a surface the browser rasterises, and this one is
// re-rasterised on every frame of the sweep, in the two seconds where the
// shader is also compiling and the page under it is mounting. The lazy box is
// the whole 100-unit square with a margin, which is about twice the area
// either shape occupies. So each region is measured off the same constants the
// shapes are: the ring's own half-extents at its tilt, the star's arms, and
// the feather's reach around both.
//
// `filterUnits="userSpaceOnUse"` means these are the coordinates the cover's
// viewBox is in, and the region is read in the space the FILTERED ELEMENT
// stands in rather than the one its own transform sets up — so the star's box
// is the star at full size, and the scale it opens from only ever asks for
// less of it.
function box(hx, hy, pad) {
  return { x: f2(50 - hx - pad), y: f2(50 - hy - pad), width: f2(2 * (hx + pad)), height: f2(2 * (hy + pad)) }
}
const TILT = rad(ECL.tilt)
// the band at its tilt: the projection of a tilted ellipse onto each axis
const BAND_RX = ECL.rx + ECL.w + 1.6
const BAND_RY = BAND_RX * ECL.flat
const SWEEP_BOX = box(
  Math.hypot(BAND_RX * Math.cos(TILT), BAND_RY * Math.sin(TILT)),
  Math.hypot(BAND_RX * Math.sin(TILT), BAND_RY * Math.cos(TILT)),
  feather(FEATHER),
)
const STAR_BOX = box(
  ECL.side + STAR_GROW,
  Math.max(ECL.up, ECL.down) + STAR_GROW,
  feather(STAR_FEATHER),
)

// A beat to hold on, for the screenshot loop only. `/?beat=3` draws the intro
// assembled and leaves it there; nothing in production reads the query string.
function heldBeat() {
  if (!import.meta.env.DEV) return null
  const b = new URLSearchParams(window.location.search).get('beat')
  return b === null ? null : Math.max(0, Math.min(LIFT, Number(b) || 0))
}

export default function Intro({ reduce, ready = true, onReveal, onDone }) {
  const hold = useRef(heldBeat()).current
  const [at, setAt] = useState(hold ?? 0)
  // The clock has reached the lift. The lift itself waits on this AND on
  // `ready`, so a page that is slow to arrive holds the assembled mark and a
  // page that is quick changes nothing about the two seconds.
  const [due, setDue] = useState(false)
  // Whether the sequence has started: beat 1 has been scheduled, and from
  // here the metal's swap is a fade rather than a cut, because from here the
  // cover is opening and a cut would be seen.
  const [started, setStarted] = useState(false)
  const timers = useRef([])
  const done = useRef(false)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  // The start of the sequence: beat 1 and everything after it, on the clock,
  // measured from the moment the metal is there or the ceiling is reached,
  // whichever is first, and never before the held frame is over. Called by
  // the metal (`onReady`, below) or by the ceiling, and only the first call
  // counts.
  const start = useRef(() => {})

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    // and the metal arriving after this must not start the beats over
    start.current = () => {}
    setStarted(true)
    setAt(LIFT)
  }

  useEffect(() => {
    if (hold !== null) return undefined
    if (reduce) {
      setStarted(true)
      setAt(3)
      timers.current.push(setTimeout(() => setDue(true), 560))
      return () => timers.current.forEach(clearTimeout)
    }
    const t0 = performance.now()
    let begun = false
    start.current = () => {
      if (begun) return
      begun = true
      const elapsed = performance.now() - t0
      // where beat 1 lands, from mount: the held frame, or now if the metal
      // took longer than that
      const from = Math.max(BEATS[1], elapsed)
      setStarted(true)
      BEATS.forEach((ms, i) => {
        if (i === 0) return
        const at = from + (ms - BEATS[1])
        // a beat never takes the sequence backwards: a skip may have put it
        // at the lift already
        timers.current.push(setTimeout(() => (i === LIFT ? setDue(true) : setAt((a) => Math.max(a, i))), Math.max(0, at - elapsed)))
      })
    }
    timers.current.push(setTimeout(() => start.current(), HOLD_MAX))
    return () => { timers.current.forEach(clearTimeout); start.current = () => {} }
  }, [reduce, hold])
  const metalReady = useCallback(() => start.current(), [])

  useEffect(() => {
    if (due && ready) setAt((a) => (a < LIFT ? LIFT : a))
  }, [due, ready])

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
          <LiquidMark size="100%" speed={at >= LIFT ? 0.35 : 0.8} still={reduce} cut={!started} onReady={metalReady} />
          {/* the cover. Black on black, and the mask is where the sequence
              lives: white keeps the cover, black cuts it away. */}
          <svg className="hi-cover" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs>
              {/* The band the sweep is cut back to, dilated past the metal's
                  own edge so the clip never shaves the ring. */}
              <clipPath id={`${uid}b`}>
                <path d={BAND} clipRule="evenodd" />
              </clipPath>
              {/* The two feathers. sRGB, not the filter default: a mask is
                  read as luminance and a ramp computed in linear light reads
                  as a hard edge with a smudge on it rather than as a fade. */}
              <filter id={`${uid}fs`} filterUnits="userSpaceOnUse" {...SWEEP_BOX} colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={FEATHER} />
              </filter>
              <filter id={`${uid}ft`} filterUnits="userSpaceOnUse" {...STAR_BOX} colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={STAR_FEATHER} />
              </filter>
              <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
                <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
                {/* The circuit. The nesting is the whole trick and it only
                    reads one way round: the STROKE is blurred, and the band
                    clips what comes out of the blur. The stroke is 26 wide
                    against a band under ten, so its lateral feather is thrown
                    away by the clip and the ring's own silhouette lands as
                    sharp as it is drawn — only the head and tail of the sweep,
                    which is where the chord was, come through soft. Blur the
                    clipped band instead and the ring loses its edges. */}
                <g clipPath={`url(#${uid}b)`}>
                  <path
                    className="hi-sweep" d={ECL_SPINE} pathLength="100"
                    fill="none" stroke="#000" strokeWidth="26"
                    strokeDasharray="100" strokeDashoffset="100"
                    filter={`url(#${uid}fs)`}
                  />
                </g>
                <g className="hi-star" filter={`url(#${uid}ft)`}>
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

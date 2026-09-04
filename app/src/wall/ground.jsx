// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE GROUND                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The room every screen in the product is in, mounted once per shell and
// living across every route change. design/DESIGN.md section 7 lists the
// layers and the order, and this is the one place they are stacked:
//
//   the plasma      a fragment shader, two colours, both of them the void. A
//                   slow warp of noise, rendered through an 8x8 ordered dither
//                   so it arrives as texture rather than as a gradient. It is
//                   what stops a blue black screen reading as a blue black
//                   screen: the dark has a current in it, the way the mark's
//                   metal does, and at a fraction of the contrast.
//   the halo        one enormous off centre warm radial and a cold one, felt
//                   more than seen
//   the nebula      the galaxy's pink, very faded, sliding with the far stars
//                   at the field's own pace (wall.css `.wl-nebula`)
//   the field       the stars, on the GPU (field.js), with depth and parallax
//   the grain       feTurbulence at three and a half percent, so the black is
//                   a room rather than a screen that is off
//
// ── why one component ───────────────────────────────────────────────────────
// Main mounted a WebGL field and the wall mounted a 2D one, at a different
// count, a different drift and a different brightness curve, and the two
// surfaces of one product had two different skies. Both shells mount this now,
// so the front door and the wall are the same room, and the desktop sky is as
// dense as the phone's (see field.js on the count).
//
// ── what it costs ───────────────────────────────────────────────────────────
// Two WebGL2 contexts. The plasma renders at one device pixel per CSS pixel
// and is capped at about 1.4 megapixels, which is well under what the phone
// it is on would draw for a single photograph, and both shaders pause when
// the tab is hidden. A browser without WebGL2 gets the halo, the 2D field and
// the grain, which is the same room with the current stopped.
//
// ── the pace ────────────────────────────────────────────────────────────────
// `pace` is what the field is doing under the current screen: drifting,
// slowed under a sheet, or still where the act cannot be undone. The plasma
// keeps its own speed throughout, because it is the room and not the weather.

import { useEffect, useRef } from 'react'
import { Dithering } from '@paper-design/shaders-react'
import { mountField, PACE } from './field.js'

let gl2 = null
export function hasWebGL2() {
  if (gl2 !== null) return gl2
  try {
    const c = document.createElement('canvas')
    gl2 = !!c.getContext('webgl2')
  } catch {
    gl2 = false
  }
  return gl2
}

// The two colours. Both are the void: the back is --void itself and the front
// is --void-1, one step up, so the brightest the plasma ever gets is the
// ground a sheet is laid on. Hex, because the shader parses a colour string
// and the tokens are hex in wall.css. It was tried two steps up and at half
// the scale, and it read as marble: a plasma that can be SEEN is a
// background, and this is meant to be the room's own wall, felt.
const BACK = '#08070B'
// The front carries a breath of the nebula's pink, one or two counts of red
// over the blue black, so the current in the plasma is the same colour as
// the haze drifting over it rather than a colder thing under it.
const FRONT = '#110D15'

// The nebula crosses one viewport in this long. The far end of the field's
// drift crosses one in 250 seconds (field.js, 0.004 widths a second); the
// nebula sits behind the farthest star and goes a little slower still.
const NEBULA_LOOP_MS = 330_000

export default function Ground({ pace = 'drift', lit = true, still = false, className = '' }) {
  const canvas = useRef(null)
  const field = useRef(null)
  const nebula = useRef(null)
  const drift = useRef(null)
  const gl = hasWebGL2()

  // ── the nebula ──
  // One slide to the right by a viewport width, looping, driven by the Web
  // Animations API so its rate can follow the field's pace without a restart.
  // Under reduced motion (`still`) it does not move, like the field.
  useEffect(() => {
    const el = nebula.current
    if (!el || still || typeof el.animate !== 'function') return undefined
    const a = el.animate(
      [{ transform: 'translate3d(-50%, 0, 0)' }, { transform: 'translate3d(0, 0, 0)' }],
      { duration: NEBULA_LOOP_MS, iterations: Infinity, easing: 'linear' },
    )
    drift.current = a
    return () => { a.cancel(); drift.current = null }
  }, [still])

  useEffect(() => {
    const a = drift.current
    if (!a) return
    const rate = PACE[pace] ?? 1
    if (rate === 0) a.pause()
    else { a.playbackRate = rate; a.play() }
  }, [pace])

  // ── the field ──
  // One instance, for the life of the shell. That is what makes it the room
  // these screens are in rather than a background each of them owns a copy of.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return undefined
    const f = mountField(cv, { pace })
    field.current = f

    // The hand. One pointer listener, feeding the field's parallax. Under
    // reduced motion the field ignores it and there is no reason to listen.
    function onMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      f.point(x, y)
    }
    if (!still) window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      f.stop()
      field.current = null
    }
    // `pace` is fed through below; remounting the field to change it would
    // reshuffle nothing, but it would restart the drift.
  }, [still])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (field.current) field.current.pace(pace)
  }, [pace])

  return (
    <div className={`wl-ground ${className}`} aria-hidden="true">
      {gl && (
        <Dithering
          className="wl-dither"
          colorBack={BACK}
          colorFront={FRONT}
          shape="warp"
          type="8x8"
          size={2}
          scale={1.15}
          speed={still ? 0 : 0.1}
          minPixelRatio={1}
          maxPixelCount={1400000}
        />
      )}
      <div className="wl-halo" />
      <div ref={nebula} className="wl-nebula" />
      <canvas ref={canvas} className={`wl-starfield${lit ? '' : ' is-hidden'}`} />
      <div className="wl-grain" />
    </div>
  )
}

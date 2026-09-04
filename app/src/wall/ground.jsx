// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE GROUND                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The room every screen in the product is in, mounted once per shell and
// living across every route change. design/DESIGN.md section 7 lists the
// layers and the order, and this is the one place they are stacked:
//
//   the sky         the clouds, drawn by the field itself (field.js, THE SKY
//                   BEHIND THE STARS): the void with the galaxy's violet and
//                   pink in it at a whisper, a domain warped noise with a
//                   current, posterised through an ordered dither so it is
//                   texture and not gradient. It is the deepest layer of the
//                   one field, so it drifts the way the farthest star drifts
//                   and shifts to the hand the way the farthest star shifts.
//   the halo        one enormous off centre warm radial and a cold one, felt
//                   more than seen. The room's own light, and it stays put:
//                   the lamp is in the room, the sky is outside the window.
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
// ── why one field ───────────────────────────────────────────────────────────
// The sky was three things once: a plasma from a shader package warping in
// place, a sheet of pink sliding on a CSS timer, and the stars drifting on a
// third clock. Three motions on one screen read as three things laid on top
// of each other. Now the clouds and the stars are one field on one clock and
// one hand, which is the difference between a backdrop and a sky.
//
// ── what it costs ───────────────────────────────────────────────────────────
// Two WebGL2 contexts, both the field's. The sky renders at one pixel per CSS
// pixel and is capped under a megapixel, which is well under what the phone it
// is on would draw for a single photograph, and both stop with the tab. A
// browser without WebGL2 gets a still gradient, the halo, the 2D field and the
// grain, which is the same room with the current stopped.
//
// ── the pace ────────────────────────────────────────────────────────────────
// `pace` is what the field is doing under the current screen: drifting,
// slowed under a sheet, or still where the act cannot be undone. The clouds
// take the same pace, because they are the same field.

import { useEffect, useRef } from 'react'
import { mountField } from './field.js'

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

export default function Ground({ pace = 'drift', lit = true, still = false, className = '' }) {
  const canvas = useRef(null)
  const sky = useRef(null)
  const field = useRef(null)

  // ── the field ──
  // One instance, for the life of the shell. That is what makes it the room
  // these screens are in rather than a background each of them owns a copy of.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return undefined
    const f = mountField(cv, { pace, sky: sky.current })
    field.current = f

    // The hand. One pointer listener, feeding the field's parallax. Under
    // reduced motion the field ignores it and there is no reason to listen.
    // Up is up: the field's y runs upward, the screen's runs downward, and
    // without the flip the near stars followed the hand across and fled it
    // down, which is not parallax, it is a shrug.
    function onMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = 1 - (e.clientY / window.innerHeight) * 2
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
      <canvas ref={sky} className="wl-sky" />
      <div className="wl-halo" />
      <canvas ref={canvas} className={`wl-starfield${lit ? '' : ' is-hidden'}`} />
      <div className="wl-grain" />
    </div>
  )
}

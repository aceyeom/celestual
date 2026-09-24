// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE GROUND                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The room every screen in the product is in, mounted once per shell and
// living across every route change. design/DESIGN.md section 7 lists the
// layers and the order, and this is the one place they are stacked. There
// are two rooms, and `room` picks one.
//
// ── the wall: the black room (`room`) ───────────────────────────────────────
// Every letter is a screen left on in a dark room, and an opened letter is
// one of them lit in a black room (wall.css `.is-letter .wl-scrim`). So the
// wall is that room with every screen on: the same black, the same grain,
// tile for tile, and opening a letter turns the other screens off without
// changing the room they were in. There is no sky and no star in it:
//
//   the black       #000, the letter's room
//   the far lights  four enormous soft glows at two or three percent, each
//                   drifting on its own minute long clock (FAR, below): the
//                   light of screens further off in the dark, felt more than
//                   seen, and gone when the lights are
//   the grain       the letter room's own sensor grain, at 7 percent
//
// No canvas, no WebGL and no pointer listener. The pace a sheet sets has
// nothing to slow here, and the corners fall away over the screens in
// wall.css (`.wl-root.is-room .wl-stage::after`).
//
// ── Main: the sky (the default) ─────────────────────────────────────────────
// The front door (/ping, /sky, the hero) keeps its night:
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
// ── why one field ───────────────────────────────────────────────────────────
// The sky was three things once: a plasma from a shader package warping in
// place, a sheet of pink sliding on a CSS timer, and the stars drifting on a
// third clock. Three motions on one screen read as three things laid on top
// of each other. Now the clouds and the stars are one field on one clock and
// one hand, which is the difference between a backdrop and a sky.
//
// ── what it costs ───────────────────────────────────────────────────────────
// The sky is two WebGL2 contexts, both the field's. It renders at one pixel
// per CSS pixel and is capped under a megapixel, and both stop with the tab.
// A browser without WebGL2 gets a still gradient, the halo, the 2D field and
// the grain, which is the same room with the current stopped. The black room
// is a handful of CSS layers and draws nothing a frame.
//
// ── the pace ────────────────────────────────────────────────────────────────
// `pace` is what the field is doing under the current screen: drifting,
// slowed under a sheet, or still where the act cannot be undone. The clouds
// take the same pace, because they are the same field.

import { useCallback, useEffect, useRef } from 'react'
import { mountField, setSkyAvoid } from './field.js'

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

// ── the type the sky parts round ────────────────────────────────────────────
// A ref callback. Put it on the one block of type a screen is about, its
// headline, and the clouds behind it flow round it, thin under it and gather
// a little pink along its edge (field.js, THE TYPE THE SKY PARTS ROUND).
// One block per screen, and the last one registered wins; when the screen
// goes the clouds close back over where the words were.
//
//   const avoid = useSkyAvoid()
//   <h1 ref={avoid}>…</h1>
export function useSkyAvoid() {
  const mine = useRef(null)
  useEffect(() => () => {
    // The screen unmounted with the block still registered: let it go, but
    // only if nobody else has registered since.
    if (mine.current) { setSkyAvoid(null); mine.current = null }
  }, [])
  return useCallback((el) => {
    if (el) {
      mine.current = el
      setSkyAvoid(el)
    } else if (mine.current) {
      mine.current = null
      setSkyAvoid(null)
    }
  }, [])
}

// ── the far lights ──────────────────────────────────────────────────────────
// The concept's own: where each glow stands, how wide it is, its colour and
// its strength, and the clock and the reach of its drift.
const FAR = [
  { x: '12%', y: '28%', s: '46vmax', c: '#A3BB6B', a: 0.034, t: '71s', dx: '6vmax',  dy: '-3vmax' },
  { x: '88%', y: '20%', s: '38vmax', c: '#DF93AF', a: 0.028, t: '83s', dx: '-5vmax', dy: '4vmax' },
  { x: '80%', y: '84%', s: '52vmax', c: '#7EA494', a: 0.032, t: '64s', dx: '-7vmax', dy: '-2vmax' },
  { x: '20%', y: '90%', s: '40vmax', c: '#E0A95A', a: 0.024, t: '92s', dx: '4vmax',  dy: '-5vmax' },
]

export default function Ground({ pace = 'drift', lit = true, still = false, tint = 'main', room = false, className = '' }) {
  const canvas = useRef(null)
  const sky = useRef(null)
  const field = useRef(null)

  // ── the field ──
  // One instance, for the life of the shell. That is what makes it the room
  // these screens are in rather than a background each of them owns a copy of.
  useEffect(() => {
    if (room) return undefined
    const cv = canvas.current
    if (!cv) return undefined
    const f = mountField(cv, { pace, sky: sky.current, tint })
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
  }, [still, tint, room])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (field.current) field.current.pace(pace)
  }, [pace])

  if (room) return (
    <div className={`wl-ground is-room${lit ? ' is-lit' : ''} ${className}`} aria-hidden="true">
      <div className="wl-far">
        {FAR.map((g, i) => (
          <i key={i} style={{ '--x': g.x, '--y': g.y, '--s': g.s, '--c': g.c, '--a': g.a, '--t': g.t, '--dx': g.dx, '--dy': g.dy }} />
        ))}
      </div>
      <div className="wl-grain" />
    </div>
  )

  return (
    <div className={`wl-ground is-${tint}${hasWebGL2() ? ' has-gl' : ''} ${className}`} aria-hidden="true">
      <canvas ref={sky} className="wl-sky" />
      <div className="wl-halo" />
      <canvas ref={canvas} className={`wl-starfield${lit ? '' : ' is-hidden'}`} />
      <div className="wl-grain" />
    </div>
  )
}

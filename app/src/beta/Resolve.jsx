// beta/Resolve.jsx — the ping zoom.
//
// Tapping one of your pings does not open a card. The camera goes to the star,
// and past a certain closeness the star's true angular diameter overtakes the
// instrument's point-spread and it stops being a point of light — it becomes
// the surface it was made of all along.
//
// This is production's mechanic, on production's curve, literally: `resolveOf`
// is imported from card/Resolve.jsx rather than reimplemented, because two
// copies of those four numbers are two zooms that agree right up until somebody
// tunes one. What is different is only what arrives at the end of the dive: a
// struck seal instead of a photographic disc.
//
// Nothing here is scheduled. Every value is read off `cam.focus` on the frame
// it is true, so the seal opens at the rate the camera actually resolves it,
// and closing is the identical curve run backwards because it IS the identical
// curve: clearFocus() releases the dive and `focus` decays.

import { useEffect, useRef, useState } from 'react'
import { resolveOf, fullSize, REST_Y } from '../card/zoom.js'
import { C, rgba } from './tokens.js'
import { Seal } from './ui.jsx'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

function useResolve(fieldRef, index, open) {
  const [r, setR] = useState(null)
  const raf = useRef(0)
  const running = useRef(false)

  useEffect(() => {
    if (!open && !running.current) {
      setR(null)
      return undefined
    }
    running.current = true
    let live = true
    let settled = 0

    const tick = () => {
      if (!live) return
      const f = fieldRef.current
      const cam = f && f.cam
      const focus = cam ? clamp(cam.focus, 0, 1) : open ? 1 : 0
      // where the point of light actually is on the glass, if the field
      // publishes one (the 2D fallback does not, and then the seal simply
      // opens where it was travelling anyway)
      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null
      const rest = { x: window.innerWidth / 2, y: window.innerHeight * REST_Y }
      setR({ ...resolveOf(focus, scr, rest, fullSize()), arrived: focus > 0.995, focus })
      if (!open && focus < 0.002) settled++
      else settled = 0
      if (settled < 4) raf.current = requestAnimationFrame(tick)
      else {
        running.current = false
        setR(null)
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(raf.current)
    }
  }, [fieldRef, index, open])

  return r
}

export function SealResolve({ card, index, open, fieldRef, onClose }) {
  const r = useResolve(fieldRef, index, open)
  if (!r || !card) return null
  const half = r.size / 2

  return (
    <>
      {/* the field recedes as the seal resolves, so there is something to read
          it against. Never to black: the point of arriving here is that the
          seal is IN the sky, not in front of it. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background: `radial-gradient(circle at 50% ${REST_Y * 100}%, transparent 0%, ${rgba(C.void, 0.6)} 60%, ${rgba(C.void, 0.86)} 100%)`,
          opacity: r.opacity * 0.9,
        }}
      />

      <div
        style={{
          position: 'fixed',
          left: r.x - half,
          top: r.y - half,
          width: r.size,
          height: r.size,
          zIndex: 3,
          pointerEvents: 'none',
          filter: r.blur > 0.05 ? `blur(${r.blur}px)` : 'none',
          opacity: r.opacity,
        }}
      >
        <Seal card={card} size={r.size} />
      </div>

      {/* One way back, and it is the same gesture that got here: anywhere.
          It arms once the seal has visibly started to open rather than at the
          end of the dive, because a tap that does nothing for two seconds is a
          tap somebody makes again, harder. The threshold is late enough that
          the tap which STARTED the dive can never be the one that cancels it. */}
      {r.resolve > 0.15 && (
        <div onPointerUp={onClose} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
      )}
    </>
  )
}

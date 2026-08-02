// card/Resolve.jsx — the approach.
//
// This file is the answer to "how does a ping become a card", and the answer is
// that it does not become anything. You go to it.
//
// The engine already draws a resolve: sky/engine.js's `discOf()` decides, per
// star per frame, whether its true angular diameter has overtaken the
// instrument's point-spread — whether it is still a point of light or has
// started to be a surface. A dive crosses that threshold on the way in. What
// this file does is hang the card on the SAME variable, so the photograph
// arrives exactly as the physics says a surface would:
//
//   focus 0.00 → 0.52   a point of light. Nothing of the card exists.
//   focus 0.52 → 0.99   the disc opens out of the point, blurred at first the
//                       way an unresolved body is, sharpening as it grows,
//                       travelling from wherever the star hangs in the field
//                       toward the frame it will hold.
//   focus 1.00          resolved. A poster, hanging in the field.
//
// and every one of those numbers is read off `cam.focus` on the frame it is
// true, not scheduled against a guess at how long the flight will take. The
// production code learned this lesson already and left the note in
// screens.jsx: "a dive's bank breathes with how far the star is, so no single
// delay was ever going to be right." The camera says when it has landed. This
// asks it every frame.
//
// Closing runs the identical curve backwards, because it is the identical
// curve: `clearFocus()` releases the dive, `focus` decays, and the card
// contracts into the point of light it grew out of. There is no exit animation
// written anywhere in this file.
import * as React from 'react'
import { rgba, Icon } from '../components/ui.jsx'
import Card from './Disc.jsx'
import { tintOf } from './model.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Where a fully resolved card comes to rest. The poster carries its own words
// now, so the disc is the entire object and it sits very near the middle of the
// frame — a shade high, because the eye reads a centered circle as low.
const REST_Y = 0.46

// The diameter a card holds at full resolve. One number, so every card in the
// product resolves to the same size and the sky never implies that one ping
// matters more than another.
export const fullSize = () =>
  Math.min(400, Math.round(Math.min(window.innerWidth * 0.84, window.innerHeight * 0.56)))

// ── the resolve ──────────────────────────────────────────────────────────────
// Samples the live camera every frame while a card is open and hands back where
// its disc is, how big it is, and how sharp. Runs only between the tap and the
// moment the released dive has fully decayed, so a resting sky costs nothing.
//
// `index` is which of the ambient field's sealed stars this card belongs to, so
// the disc can grow out of the exact point of light it is. The community sky
// flies to its own slot instead and publishes no such list, so the index is
// allowed to be null there: the card then opens where the layout says, which is
// where it was travelling anyway.
function useResolve(fieldRef, index, open) {
  const [r, setR] = React.useState(null)
  const raf = React.useRef(0)
  // The loop outlives `open` on purpose: closing is the same curve run
  // backwards, so it keeps sampling until the released dive has decayed. A
  // card that was never opened never starts one.
  const running = React.useRef(false)

  React.useEffect(() => {
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
      // The 2D fallback has no camera and no projected star list. It still
      // shows a sky, so the card still has to open — it simply opens where the
      // layout says instead of where the star is.
      const cam = f && f.cam
      const focus = cam ? clamp(cam.focus, 0, 1) : open ? 1 : 0
      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null

      const resolve = smoothstep(0.52, 0.995, focus)
      const size = fullSize() * resolve
      const restX = window.innerWidth / 2
      const restY = window.innerHeight * REST_Y
      // Where the star actually is, until the disc is large enough that the
      // difference between the star's projection and the frame it wants is
      // worth crossing. Both ends are real positions; the resolve is what
      // walks between them.
      const sx = scr && scr.vis ? scr.x : restX
      const sy = scr && scr.vis ? scr.y : restY
      const e = smoothstep(0.15, 1, resolve)

      setR({
        x: sx + (restX - sx) * e,
        y: sy + (restY - sy) * e,
        size,
        // An unresolved body is not a small sharp body. It is a smear the
        // instrument cannot separate yet, which is why this is a blur and not
        // just a scale.
        blur: (1 - resolve) * 9,
        opacity: clamp(resolve * 1.7, 0, 1),
        arrived: focus > 0.995,
        focus,
      })

      // Keep the loop alive while anything is moving. Once a released dive has
      // decayed to nothing for a few frames, stop: a resting sky should not be
      // paying for a rAF that reads the same zero forever.
      if (!open && focus < 0.002) settled++
      else settled = 0
      if (settled < 4) {
        raf.current = requestAnimationFrame(tick)
      } else {
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

// ── the resolved card, held in the sky ───────────────────────────────────────
// The disc rides the camera, and that is the whole overlay. There is no text
// beside it, under it or over it: the words, the @ and the date are set inside
// the poster, so what arrives at the end of a dive is one object rather than an
// object with a caption.
export function CardResolve({ C, card, url, index, open, fieldRef, onClose }) {
  const r = useResolve(fieldRef, index, open)
  if (!r || !card) return null
  const hue = tintOf(C, card.tone)
  const half = r.size / 2

  return (
    <>
      {/* the sky recedes as the card resolves, so the poster has something to
          be read against — but never to black: the point of arriving here is
          that the card is IN the field, not in front of it */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: `radial-gradient(circle at 50% ${REST_Y * 100}%, transparent 0%, ${rgba(C.ink, 0.55)} 62%, ${rgba(C.ink, 0.82)} 100%)`,
          opacity: r.opacity * 0.9,
        }}
      />

      <div
        style={{
          position: 'fixed', left: r.x - half, top: r.y - half, width: r.size, height: r.size,
          zIndex: 3, pointerEvents: 'none',
          filter: r.blur > 0.05 ? `blur(${r.blur}px)` : 'none',
          opacity: r.opacity,
        }}
      >
        <Card C={C} card={card} url={url} size={r.size} tint={hue} glow={0.6 + r.focus} />
      </div>

      {/* One way back, and it is the same gesture that got here: anywhere. The
          button is the one visible sign of it — a card resolved in an otherwise
          empty sky with no chrome on it reads as somewhere you might be stuck. */}
      {r.arrived && (
        <>
          <div onPointerUp={onClose} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <button
            onClick={onClose}
            aria-label="back to your sky"
            className="fade"
            style={{
              position: 'fixed', top: 'max(14px, env(safe-area-inset-top))', right: 'max(14px, env(safe-area-inset-right))',
              zIndex: 6, width: 42, height: 42, borderRadius: '50%', cursor: 'pointer',
              background: rgba(C.ink2, 0.8), border: `1px solid ${rgba(C.cream, 0.22)}`,
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              display: 'grid', placeItems: 'center', color: rgba(C.cream, 0.92),
              boxShadow: '0 10px 34px rgba(0,0,0,.5)',
            }}
          >
            <Icon name="close" size={16} color="currentColor" stroke={2} />
          </button>
        </>
      )}
    </>
  )
}

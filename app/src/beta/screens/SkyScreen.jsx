// /beta/sky — THE DISSOLVE
//
// The wall becomes the product. The field pulls forward, the points gain scale,
// and the concentric orbit motif appears — ONCE in the entire flow, here,
// centred on the person's own point. That "once" is the rule that makes it
// mean something: an ornament used twice is a pattern, and a pattern is
// decoration.
//
// The line has to carry the whole reframe in one sentence, and it does: every
// point that has been drifting behind every screen since the Threshold was a
// letter somebody wrote and did not send. The sky was never a background.

import { useEffect, useState } from 'react'
import { ArrowLink, Display, Orbits } from '../parts.jsx'
import { pointPixelsForward } from '../Sky.jsx'
import { reset } from '../store.js'

const RING = 240

export default function SkyScreen({ go, restart, setSkyMode, count, yours }) {
  useEffect(() => { setSkyMode('forward') }, [setSkyMode])

  // The rings go on your point, wherever the field has it after the pull
  // forward. Fixed rather than laid out in the column, because the thing they
  // have to agree with is the viewport. Re-measured on resize so a phone
  // rotating mid-demo does not leave the motif behind.
  const [at, setAt] = useState(null)
  useEffect(() => {
    if (yours == null || !count) return
    const place = () => setAt(pointPixelsForward(count, yours))
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [count, yours])

  return (
    <div className="beta-col">
      {at && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', zIndex: 2, pointerEvents: 'none',
            left: at.x - RING / 2, top: at.y - RING / 2, width: RING, height: RING,
          }}
        >
          <Orbits size={RING} />
        </div>
      )}
      <div style={{ height: '34vh', minHeight: 150 }} />

      <Display size={38}>Every letter here is a light someone left on.</Display>

      <div className="beta-push" />

      <ArrowLink onClick={() => go('app')}>open Celestual</ArrowLink>

      {/* Demos get walked six times in an hour. A reset that is total and one
          tap away is the difference between the sixth walk-through behaving
          like the first and the sixth walk-through being an apology. */}
      <div style={{ marginTop: 34 }}>
        <ArrowLink glyph="↺" tone="quiet" className="is-mono" onClick={() => { reset(); restart() }}>
          start over
        </ArrowLink>
      </div>
    </div>
  )
}

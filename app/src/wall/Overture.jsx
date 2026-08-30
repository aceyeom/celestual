// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE OVERTURE — the first second, on black                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The mark assembling itself on an empty black screen, once per tab, before
// anything else exists. Not a spinner and not a splash: nothing is loading
// behind it and it never claims to be. It is the one second where this is a
// place rather than a page, and the wall arrives out of the end of it rather
// than after it.
//
// ── the budget: 2200ms, first frame to bare wall ────────────────────────────
// The old cut ran 1760ms and the mark was gone before anybody had finished
// looking at it — the lift began 140ms BEFORE the word had finished wiping in,
// so the one moment the thing was ever whole never actually existed on screen.
// It read as fast rather than as brief, which are not the same quality: fast is
// something you missed, brief is something that was over.
//
// The extra 440ms is not spread evenly and none of it went into slowing the
// assembly down. It is spent almost entirely on the HOLD — the beat where
// nothing moves and the mark is simply standing there — because that is the
// only frame in the sequence that is doing the actual job, and it is the one
// frame the old timing did not have. The assembly itself moved by ~180ms; the
// hold went from less than nothing to 260ms.
//
// ── the build, and why each beat is where it is ─────────────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves is what makes the
//                first thing that moves land. Two frames of nothing is a
//                stutter; a fifth of a second is a breath.
//   1 ·  200ms   THE CIRCUIT. A mask runs a 24-unit stroke along the band's
//                own centreline (`ECL_SPINE`) with the dash offset driven to
//                zero, so the ring is DRAWN round its orbit rather than faded
//                up. It travels the route the ring actually takes, because the
//                mask path and the ring come out of the same constants. 900ms
//                to close, so it is still drawing when the star lands on it.
//   2 ·  560ms   THE STAR. It arrives while the circuit is still closing behind
//                it, scaling up off nothing with a few degrees of rotation
//                bleeding out — a shape that settles reads as an object, a
//                shape that fades in reads as an image.
//   3 ·  820ms   THE NAME. The word wipes out to the right of the mark under a
//                travelling sheen, and the whole lockup slides left by half the
//                word as it comes, so the composition stays centred THROUGHOUT
//                rather than being centred, then jumping, then being centred
//                again. That slide is the single most expensive-looking thing
//                here and it costs one transform.
//   4 · 1380ms   ASSEMBLED. The wipe lands on this beat rather than after it,
//                so the bloom reaching full and the word arriving whole are one
//                event. Nothing moves again until the lift.
//   5 · 1640ms   THE LIFT, after 260ms of stillness. The lockup drifts up and
//                dissolves while the black goes with it, and the wall is
//                already cascading underneath by the time the black is half
//                gone. One motion, not two screens.
//     · 2200ms   the black is gone.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It never plays twice in a tab, it is skippable on any tap or key, and under
// `prefers-reduced-motion` it renders assembled and lifts almost at once. A
// brand animation that cannot be got out of is a toll gate.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Ecliptic } from './art.jsx'

//                 0    1     2     3     4      5
const BEATS = [0, 200, 560, 820, 1380, 1640]
const LIFT = 5
const OUT = 560          // how long the black takes to leave. 1640 + 560 = 2200
const FONT_CAP = 900     // the name waits for its face, but not for ever

export default function Overture({ reduce, onReveal, onDone }) {
  const [at, setAt] = useState(0)
  const [shift, setShift] = useState(0)
  const word = useRef(null)
  const timers = useRef([])
  const done = useRef(false)

  // ── the slide ──
  // Half the word plus the gap, measured rather than guessed: the mark starts
  // sitting on the optical centre by itself and ends up on the left of a
  // lockup that is centred as a whole, and the difference between those two
  // positions is exactly this number. A hard-coded guess is wrong at every
  // size except the one it was tuned at, and this thing is set in vw.
  useLayoutEffect(() => {
    const el = word.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      const gap = parseFloat(getComputedStyle(el.parentElement).columnGap) || 0
      setShift((w + gap) / 2)
    }
    measure()
    // A Didone that swaps in mid-slide would move the target under the
    // animation, so the measurement is retaken once the real face has landed.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
  }, [])

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setAt(LIFT)
  }

  // ── the sequence ──
  useEffect(() => {
    const start = performance.now()
    if (reduce) {
      // Assembled, a beat to read it, then gone. The preference is honoured by
      // arriving rather than by freezing on an empty screen — and the hold is
      // kept, because the hold is the only part of this that was ever for the
      // viewer rather than for the motion.
      setAt(4)
      timers.current.push(setTimeout(() => setAt(LIFT), 520))
      return () => timers.current.forEach(clearTimeout)
    }

    // The ring and the star are geometry and can start on the first frame. The
    // name cannot: a Didone that arrives as Georgia and swaps to Bodoni halfway
    // through its own reveal is the one thing that would give the whole
    // sequence away. So beats 1 and 2 run immediately and the name waits for
    // its face, up to a cap, after which it goes with whatever is loaded.
    BEATS.forEach((ms, i) => {
      if (i === 0 || i > 2) return
      timers.current.push(setTimeout(() => setAt(i), ms))
    })

    let alive = true
    const faceReady = document.fonts && document.fonts.load
      ? Promise.race([
          document.fonts.load('400 48px "Bodoni Moda"').catch(() => {}),
          new Promise((r) => setTimeout(r, FONT_CAP)),
        ])
      : Promise.resolve()

    faceReady.then(() => {
      if (!alive) return
      const late = Math.max(0, BEATS[3] - performance.now() + start)
      timers.current.push(setTimeout(() => setAt(3), late))
      timers.current.push(setTimeout(() => setAt(4), late + (BEATS[4] - BEATS[3])))
      timers.current.push(setTimeout(() => setAt(LIFT), late + (BEATS[LIFT] - BEATS[3])))
    })

    return () => { alive = false; timers.current.forEach(clearTimeout) }
  }, [reduce])

  // Any tap, any key. Nobody should have to sit through a logo twice, and the
  // second person at a demo table is always the one who has seen it.
  useEffect(() => {
    const go = () => skip.current()
    window.addEventListener('pointerdown', go)
    window.addEventListener('keydown', go)
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [])

  // The wall is mounted the instant the lift starts and is already cascading
  // by the time the black is half gone. That overlap is the whole difference
  // between a transition and two screens in a row.
  useEffect(() => {
    if (at < LIFT || done.current) return
    done.current = true
    onReveal()
    const t = setTimeout(onDone, OUT)
    return () => clearTimeout(t)
  }, [at, onReveal, onDone])

  return (
    <div className={`wl-ov is-at${at}`} aria-hidden="true">
      <div className="wl-ov-veil" />
      <div className="wl-ov-stage">
        <div className="wl-ov-bloom" />
        <div className="wl-ov-lock" style={{ '--shift': `${shift}px` }}>
          <Ecliptic size={64} sweep className="wl-ov-mark" />
          <span className="wl-ov-word" ref={word}>
            celestual.
            <span className="wl-ov-sheen" />
          </span>
        </div>
      </div>
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first two seconds of the front door                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall has an overture: the mark assembling itself on black, once per tab,
// before the page exists. Main never had one, so a person arriving at the front
// door got the page and a person arriving at the wall got an entrance. This is
// Main's, and it is the same shape for the same reasons, with one difference:
// the mark is not drawn here, it is poured. LiquidMark renders the same
// silhouette as a metal surface with a current under it, and the two seconds
// this runs are the one place in the product that material is spent at size.
//
// ── the beats: 2280ms, first frame to bare page ─────────────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves.
//   1 ·  180ms   THE MARK. It rises out of nothing, already flowing: scale and
//                opacity over 760ms, and the liquid is running from the first
//                frame it is visible, so it never reads as a still image that
//                then starts.
//   2 ·  820ms   THE NAME. The word wipes out to the right of the mark under a
//                travelling sheen, and the whole lockup slides left by half the
//                word so the composition stays centred throughout.
//   3 · 1400ms   ASSEMBLED. The wipe lands here. Nothing moves but the metal.
//   4 · 1720ms   THE LIFT, after 320ms of stillness. The lockup drifts up and
//                dissolves while the black goes with it, and the hero is
//                already rising underneath by the time the black is half gone.
//     · 2280ms   the black is gone.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to `/` from the sky does not replay it,
// a refresh does. It is skippable on any tap or key. Under prefers-reduced-
// motion it renders assembled, holds a beat, and lifts; the metal stands
// still. And it never plays over any address but the front door.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import LiquidMark from './LiquidMark.jsx'
import './intro.css'

//                 0    1     2     3     4
const BEATS = [0, 180, 820, 1400, 1720]
const LIFT = 4
const OUT = 560
const FONT_CAP = 900

// The display face, read off the token rather than named here, so the intro
// waits for whichever face the system is set in.
function displayFace(el) {
  const stack = getComputedStyle(el).getPropertyValue('--f-display') || ''
  const first = stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
  const weight = getComputedStyle(el).getPropertyValue('--w-display').trim() || '600'
  return first ? `${weight} 48px "${first}"` : ''
}

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
  const [shift, setShift] = useState(0)
  const root = useRef(null)
  const word = useRef(null)
  const timers = useRef([])
  const done = useRef(false)

  // Half the word plus the gap, measured: the mark starts on the optical centre
  // alone and ends on the left of a lockup centred as a whole.
  useLayoutEffect(() => {
    const el = word.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      const gap = parseFloat(getComputedStyle(el.parentElement).columnGap) || 0
      setShift((w + gap) / 2)
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
  }, [])

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setAt(LIFT)
  }

  useEffect(() => {
    if (hold !== null) return undefined
    const start = performance.now()
    if (reduce) {
      setAt(3)
      timers.current.push(setTimeout(() => setAt(LIFT), 560))
      return () => timers.current.forEach(clearTimeout)
    }

    timers.current.push(setTimeout(() => setAt(1), BEATS[1]))

    // The name waits for its face, up to a cap. A word that arrives in the
    // fallback and swaps mid wipe is the one thing that would give it away.
    let alive = true
    const want = root.current ? displayFace(root.current) : ''
    const faceReady = want && document.fonts && document.fonts.load
      ? Promise.race([
          document.fonts.load(want).catch(() => {}),
          new Promise((r) => setTimeout(r, FONT_CAP)),
        ])
      : Promise.resolve()

    faceReady.then(() => {
      if (!alive) return
      const late = Math.max(0, BEATS[2] - (performance.now() - start))
      timers.current.push(setTimeout(() => setAt(2), late))
      timers.current.push(setTimeout(() => setAt(3), late + (BEATS[3] - BEATS[2])))
      timers.current.push(setTimeout(() => setAt(LIFT), late + (BEATS[LIFT] - BEATS[2])))
    })

    return () => { alive = false; timers.current.forEach(clearTimeout) }
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
    <div className={`hi is-at${at}`} aria-hidden="true" ref={root}>
      <div className="hi-veil" />
      <div className="hi-stage">
        <div className="hi-bloom" />
        <div className="hi-lock" style={{ '--shift': `${shift}px` }}>
          <div className="hi-mark">
            <LiquidMark size="100%" speed={at >= LIFT ? 0.35 : 0.8} still={reduce} />
          </div>
          <span className="hi-word" ref={word}>
            celestual.
            <span className="hi-sheen" />
          </span>
        </div>
      </div>
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first three seconds of either surface                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A phone, on black, once per tab, before the page exists. Its screen comes
// on, two shadows run in from either edge of it, catch each other and hold
// on, and what they were holding on to comes apart and goes back together as
// the mark. Then the screen goes out and the page is there. It plays over the
// wall at `/` and at `/berkeley`, and over Main's front door, and it is the
// same three seconds on all of them.
//
// It used to be the mark poured in liquid metal, uncovered along its own
// orbit. That was the room's object on a surface that had since become the
// phone (DESIGN.md 2.6): every letter is a Series 40 screen photographed in a
// dark room, and the first thing anybody saw was a material that belonged to
// neither. Now the first thing is one of those screens, the night one every
// letter is lit in unless its writer chose, and the story on it is the
// product's, told in the phone's own pixels (pixmark.js, PixelStory.jsx):
// two people, and the moment they find out.
//
// Nothing else is on the glass. The status row carries the aerial and the
// battery and nothing that would say a message had come in, because nothing
// has; no name, because the name is in the bar of the page underneath.
//
// ── the beats: 2870ms to the lift, 3590ms to a bare page ────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves. The screen
//                comes on at 120, the phone's own flicker (screen.css
//                `wl-wake`), and throws its light on the black round it.
//   1 ·  300ms   THE RUN. They come in off either edge, three cells a
//                frame, twelve frames a second.
//   2 · 1180ms   THE MEETING. Arms out, and on the frame they touch the
//                whole panel inverts for 70ms. The catch, then the hold,
//                one foot off the ground.
//   3 · 2470ms   THE MARK. From 1810 what they stood on lifts into the
//                ring and the two of them gather into the star, every
//                pixel landing on a whole cell. Held.
//   4 · 2870ms   THE LIFT. The screen goes to sleep, the phone rises a
//                little and dissolves, and the black goes with it; the
//                page is already rising underneath by the time the black
//                is half gone.
//     · 3590ms   the black is gone.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to the wall from a letter does not
// replay it; a refresh does. It is skippable on any tap or key, and a skip
// lands the mark and lifts at once, so a brand animation is never a toll
// gate. Under prefers-reduced-motion it draws the mark, holds a beat, and
// lifts; nothing on the glass moves.
//
// ── and it waits, when there is something to wait for ───────────────────────
// `ready` is whether the page under it is ready to be seen. The wall hands it
// false until its index and the faces on its first screen have landed
// (index.jsx), and the lift holds on the mark until it is true: the one
// screen in the product built to be looked at while something else finishes
// is this one. It is never a spinner and never says it is loading. The shell
// puts a ceiling on it, and a tap still lifts it at once.
//
// ── what it no longer has to wait for ───────────────────────────────────────
// The metal was a fragment shader, compiled on the phone's own time, and the
// old sequence held its first cut until the shader had drawn a frame, with a
// ceiling, and a cover over it, and a fade for the driver that never
// answered. A canvas has nothing to compile. The story is on the glass from
// its first frame, and all of that is gone.

import { useEffect, useRef, useState } from 'react'
import { Screen } from './screen.jsx'
import PixelStory, { SQUARE } from './PixelStory.jsx'
import { introStory } from './pixmark.js'
import './intro.css'

const STORY = introStory(300)
//                 0    1          2                   3                   4
const BEATS = [0, 300, STORY.times.meet, STORY.times.done, STORY.times.done + 400]
const LIFT = 4
// How long the black takes to leave. 2870 + 720 = 3590.
const OUT = 720

// the night screen, as a letter with no colour of its own is lit, and no keys
const LOOK = { tint: 'night' }
const NO_KEYS = {}

// ── the screenshot loop's holds ──
// Development only; nothing in production reads the query string. `?beat=3`
// holds the mark, as the loop's `intro` frame has always done; `?t=900`
// holds the clock at 900ms, for a frame of the run or of the hug;
// `?intro=ascii` draws the same story typed, and `?tint=green` lights it in
// the classic Nokia colour, for the owner to set beside the shipped one.
function dev() {
  if (!import.meta.env.DEV) return { beat: null, t: null, mode: 'pixel', look: LOOK }
  const q = new URLSearchParams(window.location.search)
  const b = q.get('beat')
  const t = q.get('t')
  const beat = b === null ? null : Math.max(0, Math.min(LIFT, Number(b) || 0))
  const at = t === null ? null : Math.max(0, Number(t) || 0)
  const tint = q.get('tint')
  return {
    beat, t: at, mode: q.get('intro') === 'ascii' ? 'ascii' : 'pixel',
    look: tint && /^[a-z-]{2,24}$/.test(tint) ? { tint } : LOOK,
  }
}
// the beat a held clock is on
const beatAt = (t) => BEATS.reduce((n, ms, i) => (i < LIFT && t >= ms ? i : n), 0)

export default function Intro({ reduce, ready = true, onReveal, onDone }) {
  const hold = useRef(dev()).current
  const held = hold.beat !== null || hold.t !== null
  const heldClock = hold.t !== null ? hold.t : hold.beat !== null ? BEATS[Math.min(hold.beat, 3)] : null
  const [at, setAt] = useState(hold.t !== null ? beatAt(hold.t) : hold.beat ?? (reduce ? 3 : 0))
  // The clock has reached the lift. The lift itself waits on this AND on
  // `ready`, so a page that is slow to arrive holds the mark and a page that
  // is quick changes nothing about the three seconds.
  const [due, setDue] = useState(false)
  // A skip freezes the glass on its last frame, the mark, and lifts.
  const [skipped, setSkipped] = useState(false)
  const t0 = useRef(performance.now()).current
  const timers = useRef([])
  const done = useRef(false)

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSkipped(true)
    setAt(LIFT)
  }

  useEffect(() => {
    if (held) return undefined
    if (reduce) {
      timers.current.push(setTimeout(() => setDue(true), 560))
      return () => timers.current.forEach(clearTimeout)
    }
    BEATS.forEach((ms, i) => {
      if (i === 0) return
      // a beat never takes the sequence backwards: a skip may have put it at
      // the lift already
      timers.current.push(setTimeout(() => (i === LIFT ? setDue(true) : setAt((a) => Math.max(a, i))), ms))
    })
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, held])

  useEffect(() => {
    if (due && ready) setAt((a) => (a < LIFT ? LIFT : a))
  }, [due, ready])

  useEffect(() => {
    if (held) return undefined
    const go = () => skip.current()
    window.addEventListener('pointerdown', go)
    window.addEventListener('keydown', go)
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [held])

  // The page is mounted the instant the lift starts and is already rising by
  // the time the black is half gone: one movement, not two screens.
  useEffect(() => {
    if (at < LIFT || done.current) return undefined
    done.current = true
    onReveal()
    const t = setTimeout(onDone, OUT)
    return () => clearTimeout(t)
  }, [at, onReveal, onDone])

  // The glass's clock: running from mount, or held on a frame. Under reduced
  // motion, and after a skip, it is held on the last one.
  const clock = heldClock !== null ? heldClock : reduce || skipped ? STORY.end : null

  return (
    <div className={`hi is-at${at}${held ? ' is-held' : ''}`} aria-hidden="true">
      <div className="hi-veil" />
      <div className="hi-stage">
        <Screen look={hold.look} seed="intro" keys={NO_KEYS} live={false} state="waking" className="hi-screen" style={SQUARE}>
          <PixelStory story={STORY} at={clock} from={t0} mode={hold.mode} />
        </Screen>
      </div>
    </div>
  )
}

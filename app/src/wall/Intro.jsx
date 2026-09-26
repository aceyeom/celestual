// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first three and a half seconds of either surface         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A phone, on black, once per tab, before the page exists. Its screen comes
// on grey, the night screen every letter is lit in unless its writer chose;
// a boy and a girl run in from either edge of it; he slows and opens his
// arms, and she runs into them, her own run carrying her on into him, and
// is held. From where they hold each other the backlight turns pink, a wave
// out to the edges of the glass, and as it reaches them the phone's own
// glass turns with it, its bands, its status and the light it throws, until
// the whole phone is a letter lit in rose (looks.js `skinOf`). What they
// were holding on to glides together as the mark, on the rose screen. Then
// the screen goes out and the page is there. It plays over the wall at `/`
// and at `/berkeley`, and it is the same three and a half seconds on both.
//
// The story on the glass is the product's, told in the phone's own pixels
// (pixmark.js, folk.js, PixelStory.jsx): two people, and the moment they
// find out. Nothing else is on the glass. The status row carries the aerial
// and the battery and nothing that would say a message had come in, because
// nothing has; no name, because the name is in the bar of the page under it.
//
// ── the beats: 3080ms to the lift, 3690ms to a bare page ────────────────────
//
//   0 ·    0ms   black. A held frame before anything moves. The screen
//                comes on at 120, the phone's own flicker (screen.css
//                `wl-wake`), and throws its grey light on the black round it.
//   1 ·  180ms   THE RUN. She comes in from the right, he from the left,
//                sixteen drawings a second, sliding between the cells at the
//                display's own rate. From 870 he slows; at 1055 he stands
//                with his arms open.
//   2 · 1180ms   THE CATCH. She lands in them and her run carries her on,
//                leaning the way she ran, into him and behind him; her heel
//                comes up, her hair and her hem swing past and settle. From
//                1490 they hold each other, and breathe.
//     · 1550ms   THE PINK, from where they hold each other: the backlight,
//                a wave out to the edges of the glass; at the glass's edges
//                it takes the phone's bands, its status and the light it
//                throws on the black with it (intro.css, the rose), so the
//                phone becomes the rose letter. Nothing goes on out into the
//                room: the light round the phone is a rose letter's own.
//   3 · 2920ms   THE MARK. From 2090 the two of them glide into the star and
//                the ground into the ring, every pixel between the cells as
//                it travels and put on one as it lands. The mark stands whole
//                on the rose screen.
//   4 · 3080ms   THE LIFT. The screen goes to sleep, the phone rises a
//                little and dissolves, and the black goes with it; the page
//                is already rising underneath by the time the black is half
//                gone.
//     · 3690ms   the black is gone.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to the wall from a letter does not
// replay it; a refresh does. It is skippable on any tap or key, and a skip
// lands the mark and lifts at once, so a brand animation is never a toll
// gate: the glass jumps to the mark on the rose screen and the phone's glass
// turns rose in a quarter of a second as it goes out. Under
// prefers-reduced-motion it draws the mark on the rose letter, holds a beat,
// and lifts; nothing on the glass moves.
//
// ── and it waits, when there is something to wait for ───────────────────────
// `ready` is whether the page under it is ready to be seen. The wall hands it
// false until its index and the faces on its first screen have landed
// (index.jsx), and the lift holds on the mark until it is true: the one
// screen in the product built to be looked at while something else finishes
// is this one. It is never a spinner and never says it is loading. The shell
// puts a ceiling on it, and a tap still lifts it at once. It never waits on
// the network to start: the story is drawn from the first frame.

import { useEffect, useRef, useState } from 'react'
import { Screen } from './screen.jsx'
import PixelStory, { SQUARE } from './PixelStory.jsx'
import { introStory } from './pixmark.js'
import { skinOf, skinVars } from './looks.js'
import './intro.css'

// ── the two skins ──
// The phone starts as the night screen and ends as a letter lit in rose,
// both exactly as looks.js lights a letter: the pink the wave carries across
// the panel is the rose letter's own panel, and its ink the rose's ink.
const NIGHT = skinOf('night')
const ROSE = skinOf('rose')
const STORY = introStory(100, { panel: [ROSE.hi, ROSE.mid, ROSE.lo], ink: [NIGHT.ink, ROSE.ink] })
//                 0    1                  2                   3                   4
const BEATS = [0, STORY.times.run, STORY.times.catch, STORY.times.done, STORY.times.done + 160]
const LIFT = 4
// How long the black takes to leave. 3080 + 610 = 3690.
const OUT = 610
// when the pink leaves them, which is when the phone's glass starts to turn
const GLOW = STORY.times.glow

// The phone's glass, from the night's to the rose's: each of the skin's
// colours the Screen paints with (looks.js `skinVars`, screen.css) is the
// two mixed by how far the pink has come. Three numbers carry it, animated
// in intro.css: the top band and its status as the wave reaches the top of
// the glass, the bottom band and the panel under the pink as it reaches the
// bottom, and the light the phone throws on the black as the whole glass is
// pink. Handed to `Screen` as its `style`, which is laid over its skin.
const N = skinVars('night')
const R = skinVars('rose')
const turn = (name, by) => `color-mix(in srgb, ${N[name]}, ${R[name]} calc(var(${by}) * 100%))`
const FRAME = {
  ...SQUARE,
  '--s-top': turn('--s-top', '--hi-top'),
  '--s-top-2': turn('--s-top-2', '--hi-top'),
  '--s-lit': turn('--s-lit', '--hi-top'),
  '--s-bloom': turn('--s-bloom', '--hi-top'),
  '--s-bot': turn('--s-bot', '--hi-bot'),
  '--s-hi': turn('--s-hi', '--hi-bot'),
  '--s-mid': turn('--s-mid', '--hi-bot'),
  '--s-lo': turn('--s-lo', '--hi-bot'),
  '--s-halo': turn('--s-halo', '--hi-glow'),
  '--s-halo-2': turn('--s-halo-2', '--hi-glow'),
  '--s-edge': turn('--s-edge', '--hi-glow'),
}

// the night screen, as a letter with no colour of its own is lit, and no keys
const LOOK = { tint: 'night' }
const NO_KEYS = {}

// ── the screenshot loop's holds ──
// Development only; nothing in production reads the query string. `?beat=3`
// holds the mark, as the loop's `intro` frame has always done; `?t=900`
// holds the clock at 900ms, for a frame of the run or of the hold;
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
  // is quick changes nothing about the three and a half seconds.
  const [due, setDue] = useState(false)
  // A skip freezes the glass on its last frame, the mark, and lifts.
  const [skipped, setSkipped] = useState(false)
  // the pink has left them, and the phone's glass turns with it
  const [lit, setLit] = useState(heldClock !== null && heldClock >= GLOW)
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
    // Each beat on the glass's own clock, from the first frame (`t0`), and
    // not from now: the first frame is worked out before this runs, and a
    // beat counted from here would come that much after the glass it goes
    // with (the phone turning rose after the pink has reached its edges).
    const on = (ms) => Math.max(0, ms - (performance.now() - t0))
    if (reduce) {
      timers.current.push(setTimeout(() => setDue(true), on(560)))
      return () => timers.current.forEach(clearTimeout)
    }
    BEATS.forEach((ms, i) => {
      if (i === 0) return
      // a beat never takes the sequence backwards: a skip may have put it at
      // the lift already
      timers.current.push(setTimeout(() => (i === LIFT ? setDue(true) : setAt((a) => Math.max(a, i))), on(ms)))
    })
    timers.current.push(setTimeout(() => setLit(true), on(GLOW)))
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, held, t0])

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
  // the time the black is half gone: one movement, not two screens. The
  // instant after its first frame is on the glass, that is: mounting the
  // page is the heaviest work of the load, and done in the same frame the
  // lift would wait for it, still, before it moved at all. Once the lift is
  // moving it is the compositor's (opacity and transform) and goes on
  // through the page being built under it.
  useEffect(() => {
    if (at < LIFT || done.current) return undefined
    done.current = true
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        raf = 0
        onReveal()
      })
    })
    const t = setTimeout(onDone, OUT)
    return () => {
      // put away before the page was mounted: whoever runs this next mounts it
      if (raf) {
        cancelAnimationFrame(raf)
        done.current = false
      }
      clearTimeout(t)
    }
  }, [at, onReveal, onDone])

  // The glass's clock: running from mount, or held on a frame. Under reduced
  // motion, and after a skip, it is held on the last one.
  const clock = heldClock !== null ? heldClock : reduce || skipped ? STORY.end : null
  // A held clock holds the glass's turn on the same moment as the pink:
  // its animations paused that far in (intro.css `.hi.is-held`).
  const since = heldClock !== null && lit ? { '--hi-since': `${GLOW - heldClock}ms` } : undefined
  // the phone is the rose letter already: under reduced motion, and after a
  // skip, which lands the mark on the rose screen (the pink not yet having
  // gone, it turns in a quarter of a second as the screen goes out)
  const rose = reduce || (skipped && !lit)
  const cls = ['hi', `is-at${at}`, held && 'is-held', lit && 'is-glow', rose && 'is-rose', reduce && 'is-still'].filter(Boolean).join(' ')

  return (
    <div className={cls} style={since} aria-hidden="true">
      <div className="hi-veil" />
      <div className="hi-stage">
        {/* (a tint held for the owner, `?tint=`, is that colour throughout) */}
        <Screen look={hold.look} seed="intro" keys={NO_KEYS} live={false} state="waking" className="hi-screen" style={hold.look === LOOK ? FRAME : SQUARE}>
          <PixelStory story={STORY} at={clock} from={t0} mode={hold.mode} />
        </Screen>
      </div>
    </div>
  )
}

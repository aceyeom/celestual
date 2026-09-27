// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INTRO, the first four seconds of either surface                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A phone, on black, once per tab, before the page exists. Its screen comes
// on grey, the night screen every letter is lit in unless its writer chose,
// with nothing on it but the ground, and stays lit and empty for a beat.
// Then a boy and a girl run in from out past either edge of it, onto the
// glass on the same frame; he slows and opens his arms, and she runs into
// them, her own run carrying her on into him, and is held. On the frame
// they hold each other the backlight turns, the panel's own cells going
// over a few at a time, out to the edges of the glass, and in the same
// movement the two of them and the ground they stood on glide together into
// the mark. As the colour reaches the edges the phone's own glass turns
// with it, its bands, its status and the light it throws, until the whole
// phone is a letter lit in that colour (looks.js `skinOf`), and the mark
// stands there a second. Then the screen goes out and the page is there. It
// plays over the wall at `/` and at `/berkeley`, and it is the same four
// seconds on both.
//
// The story on the glass is the product's, told in the phone's own pixels
// (pixmark.js, folk.js, PixelStory.jsx): two people, and the moment they
// find out. Nothing else is on the glass. The status row carries the aerial
// and the battery and nothing that would say a message had come in, because
// nothing has; no name, because the name is in the bar of the page under it.
//
// ── the colour it turns ─────────────────────────────────────────────────────
// It was always the rose. Now each load draws the colour, out of the
// letters' own lit ones (`TINTS`): the rose, the lilac, the ice, the green
// or the amber, each exactly as looks.js lights a letter in it, so the
// intro never opens on a colour the wall does not have, and the dark ink
// the mark is drawn in reads on every one of them. The owner asked for it
// to be different every time. So it is never the same colour twice running
// on one device (`LAST`), and about one load in nine (`RAINBOW_ODDS`) it is
// all five at once: the panel turns round the wheel from where they hold
// each other out to the corners, rose at the middle and lilac at the edges
// (PixelStory.jsx `pinkOf`), the phone's bands stay the night's dark glass,
// and the light it throws on the black is the same wheel, going slowly
// round (intro.css, the wheel). Never a colour made up for the occasion.
//
// ── the beats: 3780ms to the lift, 4390ms to a bare page ────────────────────
//
//   0 ·    0ms   black: the first frame the page can paint, and not the
//                render that made it (PixelStory.jsx `useFirstFrame`). The
//                story's heavy start is done on the black before it.
//         40ms   the screen comes on, the phone's own flicker and focus
//                (screen.css `wl-wake`, 500ms here), and throws its grey
//                light on the black round it. On the glass, the ground and
//                nobody.
//        540ms   the screen is on, lit and empty, and stays so for a beat.
//   1 ·  780ms   THE RUN. He comes in from the left and she from the right,
//                out of the frame and over the edges of the glass on the
//                same frame (pixmark.js `I_RUN_AT`), posed afresh at the
//                display's own rate and sliding between the cells. From
//                1230 he slows; at 1610 he stands with his arms open.
//   2 · 1690ms   THE CATCH. She lands in them and her run carries her on,
//                leaning the way she ran, into him and behind him; her heel
//                comes up, her hair and her hem swing past and settle.
//     · 2110ms   THE COLOUR, from where they hold each other: the backlight
//                turning, a few of the panel's cells at a time, in a ragged
//                front that steps out to the last corner of the glass in a
//                little over a second. As it reaches them it takes the
//                phone's top band and its status (2411), its bottom band
//                (2670) and the light it throws on the black (intro.css),
//                and once the whole panel has turned, the panel under it
//                (3210), so the phone becomes the letter lit in it.
//     · 2190ms   and THE MARK, on the frame they hold each other: the two
//                of them glide into the star and the ground into the ring,
//                out from where they hold each other as the colour is, every
//                pixel between the cells as it travels and put on one as it
//                lands (pixmark.js `I_QUICK`).
//   3 · 2780ms   the mark is whole, while the last corners of the glass
//                turn, and stands a second.
//   4 · 3780ms   THE LIFT. The screen goes to sleep, the phone rises a
//                little and dissolves, and the black goes with it; the page
//                is already rising underneath by the time the black is half
//                gone.
//     · 4390ms   the black is gone.
//
// It was three and a half seconds, and the mark stood for a sixth of one
// before the screen went out; the owner asked for the pink to take its time
// and for the mark to be there long enough to be seen, and it grew to five
// and a half. Then the pink went all the way to the edges before the mark
// began to gather, the two of them standing in it for most of a second,
// and the owner asked for the morph to be faster and to happen as the pink
// goes out. So the glide starts on the frame they hold each other and is
// two thirds the length it was, the colour is a little quicker to the
// corners, and the mark still stands a second: the lift comes over a second
// sooner.
//
// ── what it refuses to do ───────────────────────────────────────────────────
// It plays once per tab: walking back to the wall from a letter does not
// replay it; a refresh does, in another colour. It is skippable on any tap
// or key, and a skip lands the mark and lifts at once, so a brand animation
// is never a toll gate: the glass jumps to the mark on the lit screen and
// the phone's glass turns in a quarter of a second as it goes out. Under
// prefers-reduced-motion it draws the mark on the letter lit in the colour
// it drew, holds it a little over a second, and lifts; nothing on the glass
// moves, and the wheel's light stands still.
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
import PixelStory, { SQUARE, useFirstFrame } from './PixelStory.jsx'
import { introStory, I_QUICK, I_RUN_AT, I_ENTER, I_WAKE_AT, I_WAKE_MS } from './pixmark.js'
import { COLOURS, hexRgb, mix, skinOf, skinVars } from './looks.js'
import './intro.css'

// ── the colours it may turn ──
// The letters' own lit colours, the ones with a hue to them: not the night,
// which is where it starts, nor the white, which is the night a little
// brighter and read as the screen turned up rather than turned. `WHEEL` is
// the same five in the pool's own order round the wheel, from the rose,
// which the rainbow leaves from, to the lilac in the corners.
const TINTS = ['rose', 'lilac', 'ice', 'green', 'amber']
const WHEEL = ['rose', 'amber', 'green', 'ice', 'lilac']
const RAINBOW = 'rainbow'
const RAINBOW_ODDS = 1 / 9
// the colour the last load drew, in the browser's storage, so the next
// never draws it again
const LAST = 'celestual.intro.v1'
// every lit colour, which `?tint=` may hold the intro in
const LIT = new Set(COLOURS.filter((c) => c.kind === 'lit').map((c) => c.slug))

const NIGHT = skinOf('night')
const N = skinVars('night')
// how long the mark stands whole before the lift
const MARK_HOLD = 1000
const LIFT = 4
// How long the black takes to leave. 3780 + 610 = 4390.
const OUT = 610
// under reduced motion, how long the mark is held before the lift
const STILL_HOLD = 1200

// the three colours of a lit panel, from where its backlight is brightest out
const panelOf = (s) => [s.hi, s.mid, s.lo]
// a colour as the three numbers of an rgb, for the canvas
const rgbOf = (hex) => hexRgb(hex).join(', ')

// ── the tale, for the colour drawn ──
// The story, with the colour in it, and the phone's glass, from the night's
// to the colour's: each of the skin's colours the Screen paints with
// (looks.js `skinVars`, screen.css) is the two mixed by how far the colour
// has come. Four numbers carry it, animated in intro.css: the top band and
// its status as the colour reaches the top of the glass, the bottom band as
// it reaches the bottom, the light the phone throws on the black as it
// fills the glass, and the panel itself under it only once it has covered
// all of it, so that no part of the grey is seen to turn except a block of
// cells at a time. Handed to `Screen` as its `style`, which is laid over its
// skin; the moments, from the story (pixmark.js `introStory` times), as the
// delays of those four animations (`turn`), and the wake's own, from
// pixmark.js too, so that the screen comes on and the empty glass is held on
// the clock the run is on.
//
// The rainbow keeps the night's bands and the night's ink, since a wheel has
// no one colour to darken them from; its panel under the canvas is the
// lilac of the corners, and its light on the black is the wheel (intro.css).
function taleOf(tint) {
  const wheel = tint === RAINBOW
  const to = wheel ? skinOf(WHEEL[WHEEL.length - 1]) : skinOf(tint)
  const story = introStory(I_RUN_AT - I_ENTER, {
    pace: I_QUICK,
    panel: panelOf(wheel ? skinOf(WHEEL[0]) : to),
    ink: [NIGHT.ink, wheel ? NIGHT.ink : to.ink],
    // a block that has just turned, a step lighter, in the colour's own
    // light (the wheel's is each block's own, PixelStory.jsx `spreadOn`)
    front: wheel ? null : rgbOf(mix(to.mid, '#FFFFFF', 0.6)),
    spectrum: wheel ? WHEEL.map((c) => panelOf(skinOf(c))) : null,
  })
  const T = wheel
    ? { ...N, '--s-hi': to.hi, '--s-mid': to.mid, '--s-lo': to.lo, '--s-halo': 'transparent' }
    : skinVars(tint)
  const mixed = (name, by) => `color-mix(in srgb, ${N[name]}, ${T[name]} calc(var(${by}) * 100%))`
  const frame = {
    ...SQUARE,
    '--s-top': mixed('--s-top', '--hi-top'),
    '--s-top-2': mixed('--s-top-2', '--hi-top'),
    '--s-lit': mixed('--s-lit', '--hi-top'),
    '--s-bloom': mixed('--s-bloom', '--hi-top'),
    '--s-bot': mixed('--s-bot', '--hi-bot'),
    '--s-hi': mixed('--s-hi', '--hi-pan'),
    '--s-mid': mixed('--s-mid', '--hi-pan'),
    '--s-lo': mixed('--s-lo', '--hi-pan'),
    '--s-halo': mixed('--s-halo', '--hi-glow'),
    '--s-halo-2': mixed('--s-halo-2', '--hi-glow'),
    '--s-edge': mixed('--s-edge', '--hi-glow'),
  }
  if (wheel) {
    // the wheel's light, the five at their own hue, and how much of it is
    // on: as much as a lit letter throws, as the colour fills the glass
    frame['--hi-wheel'] = `conic-gradient(${[...WHEEL, WHEEL[0]].map((c) => skinOf(c).glow).join(', ')})`
    frame['--hi-wheel-on'] = 'calc(var(--hi-glow) * 0.34)'
  }
  const t = story.times
  const glow = t.glow
  return {
    tint,
    wheel,
    story,
    frame,
    glow,
    //       0    1         2        3       4
    beats: [0, I_RUN_AT, t.catch, t.done, t.done + MARK_HOLD],
    turn: {
      '--hi-wake-at': `${I_WAKE_AT}ms`,
      '--hi-wake-ms': `${I_WAKE_MS}ms`,
      '--hi-top-at': `${t.top - glow}ms`,
      '--hi-bot-at': `${t.bottom - glow}ms`,
      '--hi-pan-at': `${t.covered - glow}ms`,
      '--hi-glow-ms': `${t.covered - glow - 200}ms`,
    },
  }
}

// the night screen, as a letter with no colour of its own is lit, and no keys
const LOOK = { tint: 'night' }
const NO_KEYS = {}

// ── the screenshot loop's holds ──
// Development only; nothing in production reads the query string. `?beat=3`
// holds the mark, as the loop's `intro` frame has always done; `?t=2450`
// holds the clock at 2450ms, for a frame of the run, of the catch or of the
// glide (the run is 780 to 1690, the glide 2190 to 2780); a held frame is
// the rose, so the loop's pictures are the same every time, unless
// `?tint=ice` holds it in another lit colour, or `?tint=rainbow` in the
// wheel, which a live load may be held in too. `?intro=ascii` draws the same
// story typed, and `?screen=green` lights the phone in the classic Nokia
// colour from the first frame, for the owner to set beside the shipped one.
function dev() {
  if (!import.meta.env.DEV) return { beat: null, t: null, mode: 'pixel', look: LOOK, tint: null }
  const q = new URLSearchParams(window.location.search)
  const b = q.get('beat')
  const t = q.get('t')
  const beat = b === null ? null : Math.max(0, Math.min(LIFT, Number(b) || 0))
  const at = t === null ? null : Math.max(0, Number(t) || 0)
  const tint = q.get('tint')
  const screen = q.get('screen')
  return {
    beat, t: at, mode: q.get('intro') === 'ascii' ? 'ascii' : 'pixel',
    look: screen && /^[a-z-]{2,24}$/.test(screen) ? { tint: screen } : LOOK,
    tint: tint === RAINBOW || LIT.has(tint) ? tint : null,
  }
}

// The colour for this load: the one held, the rose on a held frame, or one
// drawn, which is never the last one drawn on this device, and now and then
// the wheel (never twice running either). A browser that keeps nothing (a
// private window, storage turned off) draws freely.
function drawTint(hold, held) {
  if (hold.tint) return hold.tint
  if (held) return 'rose'
  let last = null
  try { last = window.localStorage.getItem(LAST) } catch { /* nothing kept */ }
  if (last !== RAINBOW && Math.random() < RAINBOW_ODDS) return RAINBOW
  const pool = TINTS.filter((c) => c !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function Intro({ reduce, ready = true, onReveal, onDone }) {
  const hold = useRef(dev()).current
  const held = hold.beat !== null || hold.t !== null
  // the colour, drawn once for the mount, and the story told in it
  const [tale] = useState(() => taleOf(drawTint(hold, held)))
  const { story, beats, glow } = tale
  // (the mark, held, is the moment before the lift: the colour reaches the
  // corners, and the phone has turned, a little after the mark is whole)
  const heldClock = hold.t !== null ? hold.t : hold.beat !== null ? beats[Math.min(hold.beat, 3)] + (hold.beat >= 3 ? MARK_HOLD - 1 : 0) : null
  // the beat a held clock is on
  const beatAt = (t) => beats.reduce((n, ms, i) => (i < LIFT && t >= ms ? i : n), 0)
  const [at, setAt] = useState(hold.t !== null ? beatAt(hold.t) : hold.beat ?? (reduce ? 3 : 0))
  // The clock has reached the lift. The lift itself waits on this AND on
  // `ready`, so a page that is slow to arrive holds the mark and a page that
  // is quick changes nothing about the four seconds.
  const [due, setDue] = useState(false)
  // A skip freezes the glass on its last frame, the mark, and lifts.
  const [skipped, setSkipped] = useState(false)
  // the colour has left them, and the phone's glass turns with it
  const [lit, setLit] = useState(heldClock !== null && heldClock >= glow)
  // The clock's nought: the first frame the page can paint, after the
  // story's heavy start, with the screen's wake set on it. Null until then,
  // and the glass is held dark and empty.
  const root = useRef(null)
  const t0 = useFirstFrame(root, () => story.prime(), held || reduce)
  const waking = held || reduce || t0 !== null
  const timers = useRef([])
  const done = useRef(false)

  // what was drawn is kept, so the next load draws another; a held frame
  // keeps nothing
  useEffect(() => {
    if (hold.tint || held) return
    try { window.localStorage.setItem(LAST, tale.tint) } catch { /* nothing kept */ }
  }, [tale, hold, held])

  const skip = useRef(() => {})
  skip.current = () => {
    if (at >= LIFT) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSkipped(true)
    setAt(LIFT)
  }

  useEffect(() => {
    if (held || t0 === null) return undefined
    // Each beat on the glass's own clock, from its nought (`t0`), and not
    // from now: a beat counted from here would come after the glass it goes
    // with by however long this took to run (the phone turning after the
    // colour has reached its edges).
    const on = (ms) => Math.max(0, ms - (performance.now() - t0))
    if (reduce) {
      timers.current.push(setTimeout(() => setDue(true), on(STILL_HOLD)))
      return () => timers.current.forEach(clearTimeout)
    }
    beats.forEach((ms, i) => {
      if (i === 0) return
      // a beat never takes the sequence backwards: a skip may have put it at
      // the lift already
      timers.current.push(setTimeout(() => (i === LIFT ? setDue(true) : setAt((a) => Math.max(a, i))), on(ms)))
    })
    timers.current.push(setTimeout(() => setLit(true), on(glow)))
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, held, t0, beats, glow])

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

  // The glass's clock: held on the empty glass until its nought, then
  // running from it, or held on a frame. Under reduced motion, and after a
  // skip, it is held on the last one.
  const clock = heldClock !== null ? heldClock : reduce || skipped ? story.end : t0 === null ? 0 : null
  // A held clock holds the glass's turn on the same moment as the colour:
  // its animations paused that far in (intro.css `.hi.is-held`).
  const since = heldClock !== null && lit ? { ...tale.turn, '--hi-since': `${glow - heldClock}ms` } : tale.turn
  // the phone is the lit letter already: under reduced motion, and after a
  // skip, which lands the mark on the lit screen (whatever of the glass has
  // not yet turned turns in a quarter of a second as the screen goes out)
  const rose = reduce || skipped
  const cls = [
    'hi', `is-at${at}`, waking && 'is-on', held && 'is-held', lit && 'is-glow', rose && 'is-rose', reduce && 'is-still',
    tale.wheel && 'is-rainbow',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} style={since} aria-hidden="true" ref={root}>
      <div className="hi-veil" />
      <div className="hi-stage">
        {/* (a screen held for the owner, `?screen=`, is that colour
            throughout) */}
        <Screen
          look={hold.look} seed="intro" keys={NO_KEYS} live={false} state={waking ? 'waking' : 'dark'}
          className="hi-screen" style={hold.look === LOOK ? tale.frame : SQUARE}
        >
          <PixelStory story={story} at={clock} from={t0} mode={hold.mode} />
        </Screen>
      </div>
    </div>
  )
}

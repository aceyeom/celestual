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
// phone is a letter lit in that look (looks.js `skinOf`), and the mark
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
// It was always the rose, and then one of five, and the owner still saw it
// pink more often than not, and asked for it to go round more often, in
// other colours, above all the rainbow, and in gradients. So each load draws
// one of fifteen looks (`LOOKS`), and every colour in every one of them is a
// letter's own lit colour exactly as looks.js lights a letter in it, the
// rose, the lilac, the ice, the green or the amber: never a colour made up
// for the occasion. Five are one of them, as it was. Five are the rainbow,
// all five at once: four of them round the wheel out from where they hold
// each other to the corners, each from another colour and each colour a
// fifth of the glass, their light on the black a wheel of the five going
// round, two one way and two the other; and the prism, the five laid across
// the glass. Five are gradients, two or three of them melting into each
// other, and only ever neighbours on the wheel, since two from across it
// mix to mud: two out from them to the corners (peach, seaglass, twilight),
// or three laid across (dusk, lagoon). The phone follows whichever it is,
// its bands and its status in the colours of the glass under them and its
// light on the black in theirs (`taleOf`, intro.css).
//
// The draw is a bag kept on the device (`BAG`): every look comes round once
// a round, the rainbows twice, so of every twenty loads ten are a rainbow,
// five a gradient and five one colour, and the rose alone one. It never
// draws the look it drew last, nor two running that open on the same
// colour, nor two running that read as pink (`alike`, `PINK`), and it would
// rather not draw two of a kind running (`drawLook`). A browser that keeps
// nothing (a private window, storage turned off) draws from all fifteen.

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
// replay it; a refresh does, in another look. It is skippable on any tap
// or key, and a skip lands the mark and lifts at once, so a brand animation
// is never a toll gate: the glass jumps to the mark on the lit screen and
// the phone's glass turns in a quarter of a second as it goes out. Under
// prefers-reduced-motion it draws the mark on the letter lit in the look it
// drew, holds it a little over a second, and lifts; nothing on the glass
// moves, and a rainbow's light stands still.
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

// ── the looks it may turn ──
// Every colour in them is one of the letters' own lit colours with a hue to
// them: not the night, which is where it starts, nor the white, which is
// the night a little brighter and reads as the screen turned up rather than
// turned. Round the wheel they go the rose, the amber, the green, the ice,
// the lilac and back to the rose, and a look of more than one only ever
// sets neighbours on that wheel beside each other: the amber and the ice
// mixed are a khaki, the rose and the green a putty.
//
// A look is its colours (`stops`) and how they lie on the glass (`lay`):
//   one    one letter's light, as it always was
//   hug    out from where they hold each other to the corners, the first
//          round them and the last in the corners; two of them split the
//          glass about in half (three would be two thirds the middle one)
//   even   the same, each colour an equal share of the glass: the rainbow
//   axis   across the glass at an angle (`axis`, as a `linear-gradient`'s),
//          the first on the side it leaves and the last where it points
// `lead` is the colour the glass opens on, the one where they hold each
// other, measured on the glass for `axis` looks (a little above the middle,
// so it is the middle colour, or near it). A rainbow's light on the black
// turns (`spin`: 1 the way round its colours go out, -1 back), and it is in
// the bag twice (`n`).
const LOOKS = new Map([
  ['rose', { kind: 'one', lay: 'one', stops: ['rose'], lead: 'rose' }],
  ['lilac', { kind: 'one', lay: 'one', stops: ['lilac'], lead: 'lilac' }],
  ['ice', { kind: 'one', lay: 'one', stops: ['ice'], lead: 'ice' }],
  ['green', { kind: 'one', lay: 'one', stops: ['green'], lead: 'green' }],
  ['amber', { kind: 'one', lay: 'one', stops: ['amber'], lead: 'amber' }],
  // the rainbow, round the wheel from each of four colours: two go round it
  // one way and their light turns the one way, two the other
  ['wheel-amber', { kind: 'rainbow', lay: 'even', stops: ['amber', 'green', 'ice', 'lilac', 'rose'], lead: 'amber', spin: 1, n: 2 }],
  ['wheel-green', { kind: 'rainbow', lay: 'even', stops: ['green', 'ice', 'lilac', 'rose', 'amber'], lead: 'green', spin: 1, n: 2 }],
  ['wheel-ice', { kind: 'rainbow', lay: 'even', stops: ['ice', 'green', 'amber', 'rose', 'lilac'], lead: 'ice', spin: -1, n: 2 }],
  ['wheel-lilac', { kind: 'rainbow', lay: 'even', stops: ['lilac', 'ice', 'green', 'amber', 'rose'], lead: 'lilac', spin: -1, n: 2 }],
  // and across the glass in the order of a spectrum, the lilac in the top
  // left corner and the rose in the bottom right
  ['prism', { kind: 'rainbow', lay: 'axis', axis: 125, stops: ['lilac', 'ice', 'green', 'amber', 'rose'], lead: 'green', n: 2 }],
  // the gradients: two out from them, and three across
  ['peach', { kind: 'gradient', lay: 'hug', stops: ['amber', 'rose'], lead: 'amber' }],
  ['seaglass', { kind: 'gradient', lay: 'hug', stops: ['green', 'ice'], lead: 'green' }],
  ['twilight', { kind: 'gradient', lay: 'hug', stops: ['ice', 'lilac'], lead: 'ice' }],
  // the lilac at the top of the glass and the amber at its foot, a sky
  ['dusk', { kind: 'gradient', lay: 'axis', axis: 175, stops: ['lilac', 'rose', 'amber'], lead: 'rose' }],
  ['lagoon', { kind: 'gradient', lay: 'axis', axis: 135, stops: ['green', 'ice', 'lilac'], lead: 'ice' }],
])
// the bag, full: every look once, the rainbows twice
const ORDER = [...LOOKS].flatMap(([id, l]) => Array(l.n || 1).fill(id))
// the two colours that read as pink or violet on the black; and the looks
// that do, the ones that open on either of them and the ones out from them
// whose corners, half the glass, are either (the peach, the twilight):
// never two of them running
const PINKISH = new Set(['rose', 'lilac'])
const PINK = new Set([...LOOKS]
  .filter(([, l]) => PINKISH.has(l.lead) || (l.lay === 'hug' && PINKISH.has(l.stops[l.stops.length - 1])))
  .map(([id]) => id))
// `?tint=rainbow`, the name the loop and the owner have always held a
// rainbow by: the one round the wheel from the amber
const RAINBOW = 'wheel-amber'
// what is left in the bag and what the last load drew, in the browser's
// storage; and the colour the last load drew before there was a bag
const BAG = 'celestual.intro.v2'
const OLD = 'celestual.intro.v1'
// every lit colour, which `?tint=` may hold the intro in as well
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

// each of the skin's colours the intro's phone turns, and the number that
// turns it (intro.css): the top band and its status, the bottom band, the
// panel under the canvas, and the light round the phone
const TURNS = [
  ['--s-top', '--hi-top'], ['--s-top-2', '--hi-top'], ['--s-lit', '--hi-top'], ['--s-bloom', '--hi-top'],
  ['--s-bot', '--hi-bot'],
  ['--s-hi', '--hi-pan'], ['--s-mid', '--hi-pan'], ['--s-lo', '--hi-pan'],
  ['--s-halo', '--hi-glow'], ['--s-halo-2', '--hi-glow'], ['--s-edge', '--hi-glow'],
]

// ── where the glass is which colour ──
// The phone's bands follow the colour of the glass under them: the top band
// is sampled at five places across it (`BAND_AT`, the third of them over
// where they hold each other) and so is the bottom one, and each is how far
// along its look the colour of the glass is there, 0 the first colour and 1
// the last. For a look out from them, measured on the glass by laying the
// front out as PixelStory.jsx does (`spreadMap`) on a phone's panel, and a
// desk's is within a few hundredths; for one across, worked out from the
// angle (`axisAt`). They hold while the place the colour leaves from, the
// noise in its front and the proportion of the glass do, and are measured
// again if any of those moves.
const BAND_AT = [0, 25, 43, 75, 100]
const ALONG = {
  hug: { top: [0.77, 0.56, 0.41, 0.61, 0.95], bot: [0.88, 0.78, 0.76, 0.82, 1] },
  even: { top: [0.9, 0.45, 0.27, 0.58, 1], bot: [0.96, 0.9, 0.87, 0.92, 1] },
}
// how far along a look laid across the glass the point (`x`, `y`) of it is,
// each 0 to 1, on a panel `A` times as wide as it is tall
function axisAt(deg, x, y, A = 1.13) {
  const r = (deg * Math.PI) / 180
  const dx = Math.sin(r)
  const dy = -Math.cos(r)
  const p = (u, v) => (u - 0.5) * A * dx + (v - 0.5) * dy
  const c = [p(0, 0), p(1, 0), p(0, 1), p(1, 1)]
  const lo = Math.min(...c)
  const hi = Math.max(...c)
  return (p(x, y) - lo) / (hi - lo || 1)
}
// each lit colour's skin, as the Screen paints with it, made once
const VARS = new Map()
const varsOf = (c) => {
  if (!VARS.has(c)) VARS.set(c, skinVars(c))
  return VARS.get(c)
}
// one of the skin's colours `t` of the way along a look: the two lit colours
// either side of it, mixed, as the CSS the phone is painted with
function along(stops, key, t) {
  const n = stops.length - 1
  if (!n) return varsOf(stops[0])[key]
  const u = Math.max(0, Math.min(n, t * n))
  const a = Math.min(n - 1, Math.floor(u))
  const f = u - a
  if (f < 0.005) return varsOf(stops[a])[key]
  if (f > 0.995) return varsOf(stops[a + 1])[key]
  return `color-mix(in srgb, ${varsOf(stops[a])[key]}, ${varsOf(stops[a + 1])[key]} ${(f * 100).toFixed(1)}%)`
}

// ── the tale, for the look drawn ──
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
// A look of more than one colour is a gradient on the phone too. Each band
// is a gradient across it, each stop the night's band and the look's own
// band at that place mixed by the band's number, so the band turns as the
// one colour's does, and turns into the colours of the glass under it; the
// aerial and the battery are each lit in the light of the glass at their
// end of the band. Everything else, the tight light round the phone and its
// edge, is the look's colour in its corners (or, for one across, in its
// middle). The wide light a rainbow or a look across throws on the black is
// a lamp behind the phone in all its colours (`--hi-wheel`, intro.css): a
// wheel of them, turning, or a light laid across at its angle, still, as
// strong as a lit letter's; the light of one out from them is the colour in
// its corners, which is what the glass's edges are lit. They are all set
// here, on the screen itself, and not in the stylesheet under it, since the
// four numbers are not handed down (intro.css).
function taleOf(id) {
  const look = LOOKS.get(id) || { kind: 'one', lay: 'one', stops: [id], lead: id }
  const { stops, lay } = look
  const one = lay === 'one'
  const to = skinOf(stops[0])
  const story = introStory(I_RUN_AT - I_ENTER, {
    pace: I_QUICK,
    panel: panelOf(to),
    ink: [NIGHT.ink, skinOf(look.lead).ink],
    // a block that has just turned, a step lighter, in the colour's own
    // light (a gradient's is each block's own, PixelStory.jsx `spreadOn`)
    front: one ? rgbOf(mix(to.mid, '#FFFFFF', 0.6)) : null,
    spectrum: one ? null : stops.map((c) => panelOf(skinOf(c))),
    axis: lay === 'axis' ? look.axis : null,
    even: lay === 'even',
  })
  // a lamp on the black: every rainbow's, and a look across the glass's
  const lamp = lay === 'axis' || lay === 'even'
  // what each turns to: one colour's own skin, or the look's colour in its
  // corners (across its middle, for one laid across), with no halo of its
  // own under a lamp, so the grey goes out as the lamp comes up
  const skin = one ? skinVars(stops[0]) : null
  const at = lay === 'axis' ? 0.5 : 0.9
  const target = (key) => (skin ? skin[key] : lamp && key === '--s-halo' ? 'transparent' : along(stops, key, at))
  const frame = { ...SQUARE }
  for (const [key, by] of TURNS) frame[key] = `color-mix(in srgb, ${N[key]}, ${target(key)} calc(var(${by}) * 100%))`
  if (!one) {
    // where along the look each place on the two bands is
    const top = lay === 'axis' ? BAND_AT.map((x) => axisAt(look.axis, x / 100, 0)) : ALONG[lay].top
    const bot = lay === 'axis' ? BAND_AT.map((x) => axisAt(look.axis, x / 100, 1)) : ALONG[lay].bot
    const turned = (key, t, by) => `color-mix(in srgb, ${N[key]}, ${along(stops, key, t)} calc(var(${by}) * 100%))`
    const band = (key, ts, by) => `linear-gradient(90deg, ${ts.map((t, i) => `${turned(key, t, by)} ${BAND_AT[i]}%`).join(', ')})`
    frame['--hi-band-top'] = band('--s-top', top, '--hi-top')
    frame['--hi-band-bot'] = band('--s-bot', bot, '--hi-bot')
    // the aerial at the band's left end and the battery at its right
    frame['--hi-lit-l'] = turned('--s-lit', top[0], '--hi-top')
    frame['--hi-lit-r'] = turned('--s-lit', top[4], '--hi-top')
    frame['--hi-bloom-l'] = turned('--s-bloom', top[0], '--hi-top')
    frame['--hi-bloom-r'] = turned('--s-bloom', top[4], '--hi-top')
  }
  if (lamp) {
    // the lamp, its colours at their own hue, and how much of it is on: as
    // much as a lit letter throws, as the colour fills the glass
    const glows = stops.map((c) => skinOf(c).glow)
    frame['--hi-wheel'] = lay === 'axis'
      ? `linear-gradient(${look.axis}deg, ${glows.join(', ')})`
      : `conic-gradient(${[...glows, glows[0]].join(', ')})`
    frame['--hi-wheel-on'] = 'calc(var(--hi-glow) * 0.34)'
    if (look.spin) frame['--hi-spin'] = look.spin < 0 ? 'reverse' : 'normal'
  }
  const t = story.times
  const glow = t.glow
  return {
    id,
    look,
    lamp,
    spin: lamp && !!look.spin,
    blend: !one,
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
// `?tint=dusk` holds it in one of the looks, or `?tint=ice` in any lit
// colour, or `?tint=rainbow` in the rainbow the owner has always held it
// in, which a live load may be held in too. `?intro=ascii` draws the same
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
    tint: tint === 'rainbow' ? RAINBOW : LOOKS.has(tint) || LIT.has(tint) ? tint : null,
  }
}

// ── the draw ──
// Two looks are alike when they are the same look, or open on the same
// colour (the one the glass opens on is the one seen first, round the two
// of them and under the mark), or both read as pink (`PINK`). `last` is the
// look the last load drew (`id`, `lead`, `kind`, `pink`), or nothing.
const alike = (id, last) => {
  if (!last) return false
  return id === last.id || LOOKS.get(id).lead === last.lead || (PINK.has(id) && last.pink)
}
const lastOf = (id) => ({ id, lead: LOOKS.get(id).lead, kind: LOOKS.get(id).kind, pink: PINK.has(id) })
// what the browser kept: the bag, what the round before carried over, and
// the last look, each checked against the looks this build has (a Map, so
// nothing kept is read as one of an object's own names); or, before there
// was a bag, the colour the last load drew (the rainbow it had then opened
// on the rose). Nothing, if it keeps nothing.
const known = (list) => (Array.isArray(list) ? list.filter((i) => LOOKS.has(i)) : [])
function kept() {
  try {
    const raw = window.localStorage.getItem(BAG)
    if (raw) {
      const k = JSON.parse(raw) || {}
      return { bag: known(k.bag), carry: known(k.carry), last: LOOKS.has(k.last) ? lastOf(k.last) : null, ok: true }
    }
    const old = window.localStorage.getItem(OLD)
    const last = old === 'rainbow' ? { id: null, lead: 'rose', kind: 'rainbow', pink: true }
      : LOOKS.has(old) ? lastOf(old) : null
    return { bag: [], carry: [], last, ok: true }
  } catch {
    return { bag: [], carry: [], last: null, ok: false }
  }
}
// The look for this load: the one held, the rose on a held frame, or one
// drawn out of the bag, with what to keep for the next (`keep`, written once
// the intro is on the page and not here: under development React asks for
// the first render twice, and a draw that wrote would take two out of the
// bag). Out of what is left in the bag, not alike the last; of those, one
// of another kind than the last if there is one; of those, any. A bag that
// is empty is filled again. One where everything left is alike the last
// starts the next round now, and what was left carries over (`carry`), to
// be drawn first as soon as it may be, so no look waits much more than a
// round to come round again.
const pick = (list) => list[Math.floor(Math.random() * list.length)]
function drawLook(hold, held) {
  if (hold.tint) return { id: hold.tint, keep: null }
  if (held) return { id: 'rose', keep: null }
  const { bag, carry, last, ok } = kept()
  const fits = (list) => list.filter((i) => !alike(i, last))
  let c = carry
  let b = bag.length ? bag : [...ORDER]
  let from = fits(c)
  let out = c
  if (!from.length) {
    from = fits(b)
    out = b
  }
  if (!from.length) {
    c = [...c, ...b]
    b = [...ORDER]
    from = fits(b)
    out = b
  }
  const other = from.filter((i) => !last || LOOKS.get(i).kind !== last.kind)
  const id = pick(other.length ? other : from)
  out.splice(out.indexOf(id), 1)
  return { id, keep: ok ? { bag: b, carry: c, last: id } : null }
}
export default function Intro({ reduce, ready = true, onReveal, onDone }) {
  const hold = useRef(dev()).current
  const held = hold.beat !== null || hold.t !== null
  // the look, drawn once for the mount, and the story told in it
  const [tale] = useState(() => {
    const d = drawLook(hold, held)
    return { ...taleOf(d.id), keep: d.keep }
  })
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

  // what is left in the bag, and what was drawn, is kept, so the next load
  // draws another; a held frame, or a look held, keeps nothing. Written
  // twice under development's second render, the same both times
  useEffect(() => {
    if (!tale.keep) return
    try {
      window.localStorage.setItem(BAG, JSON.stringify(tale.keep))
      window.localStorage.removeItem(OLD)
    } catch { /* nothing kept */ }
  }, [tale])

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
  // not yet turned turns in a quarter of a second as the screen goes out).
  // And what the look asks of the phone (intro.css): a lamp behind it, which
  // turns, and bands that are gradients; none of it on a screen held in one
  // colour throughout (`?screen=`), which is not wearing the look
  const landed = reduce || skipped
  const own = hold.look === LOOK
  const cls = [
    'hi', `is-at${at}`, waking && 'is-on', held && 'is-held', lit && 'is-glow', landed && 'is-landed', reduce && 'is-still',
    own && tale.lamp && 'is-lamp', own && tale.spin && 'is-spin', own && tale.blend && 'is-blend',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} style={since} aria-hidden="true" ref={root}>
      <div className="hi-veil" />
      <div className="hi-stage">
        {/* (a screen held for the owner, `?screen=`, is that colour
            throughout) */}
        <Screen
          look={hold.look} seed="intro" keys={NO_KEYS} live={false} state={waking ? 'waking' : 'dark'}
          className="hi-screen" style={own ? tale.frame : SQUARE}
        >
          <PixelStory story={story} at={clock} from={t0} mode={hold.mode} />
        </Screen>
      </div>
    </div>
  )
}

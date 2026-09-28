// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FILM: it's mutual, over the whole screen                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The first time a mutual is opened on a device, its telling takes the
// whole screen (screens/Reveal.jsx). The owner saw the old reveal and said
// it looked like the intro laid over the message, and asked for the
// animation over the entire screen, with both names in it, ending on
// something worth keeping. So the phone is the screen: the glass of the slot
// that was pressed (Slot.jsx) grows until it is the room's whole height,
// and the story is told on it once (pixmark.js `filmStory`), the names
// credited on the glass before the two of them run in; then the camera
// pulls back, the glass closes down onto the middle of one rose phone, and
// that phone is the keepsake (Keepsake.jsx), with the mark still alive in
// it. Nothing here is a second drawing of anything: the glass is a letter's
// `Screen`, night turning rose (turn.js), and the cells are PixelStory's.
//
// ── in order ────────────────────────────────────────────────────────────────
//
//   push-in    from the slot's own rect (revealfrom.js `takeRevealFrom`), a
//              transform, 560ms on `--ease`: the stage is laid out at full
//              size and scaled down onto the slot's glass, and only the
//              panel and its sleeping backlight (the veil at .38, as the
//              slot's is) are there while it grows. The bands come in from
//              either edge in its last quarter
//   wake       from nothing (the mail's link, a reload, a new device): the
//              room is black, and the backlight comes on in the phone's own
//              flicker over 900ms, on the veil's opacity and nothing else,
//              since a blur at full bleed is the most expensive frame the
//              page could draw. Both are the compositor's to draw, so the
//              press puts up only the glass, and the story's cells are laid
//              in while it grows or wakes, and the keepsake behind it after
//              them (Reveal.jsx): on a phone slowed four times the press was
//              half a second before anything moved, and is a fifth of one
//   the story  from its nought, the story's clock (pixmark.js): the notes,
//              the names, the two of them, the pink, the rose, the mark, and
//              `it's mutual.` typed under it. The phone's bands and light
//              turn rose with the pink (mutual.css `wl-mutual-turn`)
//   pull-back  300ms after the sentence is said: the glass scales and moves
//              onto the keepsake's mark and is cut down to it, 900ms on the
//              sweep, so the story's own cells land on the keepsake's (both
//              are told where their cells are, PixelStory.jsx `onLayout`),
//              while the bands go and the room light comes up round where it
//              lands. Two transforms and no clip-path (see `pull`)
//   landing    the keepsake is under it and the stage goes out over it in
//              140ms, the strip unfolding from the mark (Keepsake.jsx); the
//              film's canvases are let go 400ms later
//
// A tap that is not on a control, any key but Escape, Tab and a modifier
// held alone, or `skip` jumps the story to the sentence said and pulls back
// 160ms later, in 600ms; during the push-in or the wake it waits for the
// glass, and during the pull-back it runs what is left two and a half times
// as fast. Every press is answered inside a quarter of a second, and the
// whole of it can be left at any moment by `back` or Escape, which puts the
// screen to sleep. (Until the review of 28 September the listeners were
// only there from the glass's nought to the pull-back, so a tap in the
// push-in or the pull-back did nothing, and Shift on its way to Shift+Tab
// skipped the film.)
//
// ── the glass, at any size ──────────────────────────────────────────────────
// A cell of the story is a whole number of device pixels (PixelStory.jsx
// `crisp`), and the glass is as wide as the window unless that would leave
// more than sixteen columns of panel either side of the story, which on a
// desk it would: there the glass stops at the width the intro's two are
// ever set along for (pixmark.js `ENTER`) and the room is black either side
// of it, so the pink only ever fills the phone (`glassOf`).
//
// ── the names ───────────────────────────────────────────────────────────────
// Theirs over yours, first names when both are known, both @s when either
// is not, so a name never stands beside an @ (`namesOf`). Worked out while
// the slot is pressed (`primeFilm`) and frozen once the reveal has them or
// 400ms after it opens, whichever is first, so the film, the keepsake and
// every line on the screen say the same two.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Screen } from './screen.jsx'
import PixelStory, { SQUARE, underPink, crispDpr, useFirstFrame } from './PixelStory.jsx'
import { filmStory, keepStory, I_COLS, I_ROWS } from './pixmark.js'
import { typeCells, readyType } from './pixtype.js'
import { skinOf } from './looks.js'
import { turnStyle } from './turn.js'
import { normHandle, atHandle } from './data.js'
import { langOf } from './type.js'
import { peekHandle, peekServer } from '../api/handles.js'

export const SAY = 'it’s mutual.'
const NIGHT = skinOf('night')
const ROSE = skinOf('rose')
const PANEL = [ROSE.hi, ROSE.mid, ROSE.lo]
const INK = [NIGHT.ink, ROSE.ink]

// ── the pair ────────────────────────────────────────────────────────────────
// Both of them hold the same phone: the same faults on the glass, the same
// hot spot, the same dust, whichever of the two opened it. It was seeded by
// whose device it was (`mutual:${mine}:${them}`), and the two phones of one
// mutual were two phones.
export const pairSeed = (me, them) => `mutual:${[normHandle(me), normHandle(them)].sort().join(':')}`

// A first name, as the resolver has the name: its first word, if it is a
// word a person would be called by (letters, and an apostrophe or a hyphen
// in them, fourteen at most), and nothing otherwise
const FIRST = /^[\p{L}\p{M}'’-]{1,14}$/u
export function firstName(profile) {
  const w = String(profile && profile.state === 'found' ? profile.name || '' : '').trim().split(/\s+/)[0] || ''
  return FIRST.test(w) ? w : ''
}

// The two, as this device says them: theirs first. `first` is both first
// names or null, which the picture carries and nothing else does (keepshare.js)
function pairFrom(me, them, pm, pt) {
  const a = firstName(pt)
  const b = firstName(pm)
  const first = a && b ? [a, b] : null
  return { names: first || [atHandle(them), atHandle(me)], first }
}
// what is known now, without asking
export function namesNow(me, them) {
  return pairFrom(me, them, peekHandle(normHandle(me)), peekHandle(normHandle(them)))
}
// and what the resolver says, once it has said it (a found answer is kept
// by api/handles.js, so the second ask costs nothing)
const NAMES = new Map()
export function namesOf(me, them) {
  const k = `${normHandle(me)}>${normHandle(them)}`
  if (!NAMES.has(k)) {
    const ask = (h) => (h ? peekHandle(h) || peekServer(h).catch(() => null) : null)
    NAMES.set(k, Promise.all([ask(normHandle(me)), ask(normHandle(them))]).then(([pm, pt]) => pairFrom(me, them, pm, pt)))
  }
  return NAMES.get(k)
}

// ── the stories, made once for a pair of names ──────────────────────────────
// The film is made for the two names it credits and kept, so the one primed
// while the slot was pressed is the one the reveal plays; the keepsake's is
// the same for every pair. Both need the phone's face loaded before their
// words are cut into cells (pixtype.js `readyType`), and one made while the
// face was still not there (`sure`, pixtype.js `typeCells`) is not kept:
// kept, it said `it's mutual.` in the fallback face for the rest of the
// visit. The reveal asks for the keepsake's again once the face has come
// (`faceCame`).
const FILMS = new Map()
export function filmFor([a, b]) {
  const k = `${a}\n${b}`
  if (FILMS.has(k)) return FILMS.get(k)
  const [ca, cb, say] = [typeCells(a), typeCells(b), typeCells(SAY)]
  const film = { ...filmStory({ credit: { a: ca, b: cb }, say, panel: PANEL, ink: INK }), sure: ca.sure && cb.sure && say.sure }
  if (film.sure) {
    FILMS.set(k, film)
    while (FILMS.size > 4) FILMS.delete(FILMS.keys().next().value)
  }
  return film
}
let KEEP = null
export function keepFor() {
  if (KEEP) return KEEP
  const say = typeCells(SAY)
  const keep = { ...keepStory({ ink: INK, say }), sure: say.sure }
  if (keep.sure) KEEP = keep
  return keep
}
// the phone's face, however long after the reveal's ceiling it comes
export const faceCame = () => readyType(SAY, 60000)
// The film's words in their face. A name in Korean, Japanese or Chinese
// whose face has not come by the time the glass wakes is credited as the
// two @s, which the phone's own face always has
export async function wordsReady(names) {
  const ok = await readyType(`${SAY}${names.join('')}`)
  return ok || !names.some((n) => langOf(n))
}

// ── ahead of the press ──────────────────────────────────────────────────────
// What the film needs before its first frame, started as a finger comes down
// on the slot (Slot.jsx) and again when the reveal opens, and done once: the
// two names, the faces they are set in, the words cut into cells, and the
// heavy start of the story (the mark rasterised and the glide worked out) a
// few milliseconds at a time while the page is idle, so no frame of the
// push-in pays for it. Answers the names.
const PRIMED = new Map()
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 120 }) : setTimeout(() => fn(null), 16))
export function primeFilm(me, them) {
  const k = `${normHandle(me)}>${normHandle(them)}`
  if (PRIMED.has(k)) return PRIMED.get(k)
  const job = namesOf(me, them).then(async (pair) => {
    const ok = await wordsReady(pair.names)
    const credit = ok ? pair.names : [atHandle(them), atHandle(me)]
    const film = filmFor(credit)
    // the keepsake's mark in a slice of its own, and the film's three
    // milliseconds a slice, for at most a few seconds of slices
    idle(() => keepFor().prime())
    let n = 0
    const step = (dl) => {
      const budget = Math.min(3, dl && dl.timeRemaining ? dl.timeRemaining() : 3)
      if (film.prime(budget) || ++n > 400) return
      idle(step)
    }
    idle(step)
    return { ...pair, credit }
  })
  PRIMED.set(k, job)
  return job
}

// ── the glass ───────────────────────────────────────────────────────────────
// The bands at full bleed, in px and not in the screen's `cqw`, which at this
// width would set the soft keys at fifty pixels (mutual.css `.wl-film-scr`),
// and how wide the glass is for a window (see the header). The safe areas
// are the stylesheet's, and add to both.
const BANDS = { top: 50, bot: 52, shortTop: 36, shortBot: 40 }
function glassOf(vw, vh) {
  const short = vh <= 560
  const top = short ? BANDS.shortTop : BANDS.top
  const panelH = vh - top - (short ? BANDS.shortBot : BANDS.bot)
  // (at the device pixels the glass is drawn at, PixelStory.jsx `crispDpr`)
  const d = crispDpr(vw, panelH)
  const cell = Math.max(2, Math.floor(Math.min((vw * d) / I_COLS, (panelH * d) / I_ROWS)))
  const cols = Math.floor((vw * d) / cell)
  const w = (cols - I_COLS) / 2 > 16 ? Math.floor(((I_COLS + 32) * cell) / d) : vw
  return { w, panelH, top, vh }
}

// the night's phone turning rose, its panel under the pink only once the
// pink has covered it (PixelStory.jsx `underPink`)
const PHONE = underPink(turnStyle('night', 'rose', SQUARE))
const LOOK = { tint: 'night' }
// the curves (DESIGN.md 6.1): the push-in and the bands on `--ease`, the
// bands leaving on `--ease-out`, the pull-back on the named sweep, slow at
// both ends, and the wake on the phone's own flicker (screen.css `wl-wake`)
const EASE = 'cubic-bezier(0.16, 1, 0.30, 1)'
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
// (the sweep is read off its curve a step at a time, `SWEEP_AT`: see the
// pull-back)
const SWEEP_AT = bezier(0.33, 0.02, 0.15, 1)
const FLICKER = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const PUSH_MS = 560
const BANDS_IN = 280
const BANDS_LEAD = 240
const WAKE_MS = 900
const PULL_MS = 900
const PULL_SKIP_MS = 600
const PULL_STEPS = 60
const SKIP_LAG = 160
const QUICKER = 2.5
// keys that are only ever half of something (see skipping it)
const ALONE = new Set([
  'Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Hyper', 'Super', 'Fn', 'FnLock',
  'CapsLock', 'NumLock', 'ScrollLock', 'Symbol', 'SymbolLock', 'Dead', 'Process', 'Unidentified',
])
const CENTRE_LEAD = 180
const OUT_MS = 140
const LET_GO = 400
// A cubic-bezier as CSS draws one, for a script that needs the curve's
// value part way along: how far along it is at `x` of the time (and the
// keepsake's unfold, which is squeezed and undone the same way)
export function bezier(x1, y1, x2, y2) {
  const at = (a, b, t) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}
// the backlight coming on out of nothing, on the veil's opacity alone
const WAKE = [
  { opacity: 1, offset: 0 }, { opacity: 0.38, offset: 0.28 }, { opacity: 0.7, offset: 0.38 },
  { opacity: 0.08, offset: 0.52 }, { opacity: 0, offset: 1 },
]
// and the bands with it, in two steps from a little before half way
const BANDS_WAKE = [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.4, easing: 'steps(2, end)' }, { opacity: 1, offset: 0.6 }]

// ── the screenshot loop's hold ──
// Development only: `?film=5200` holds the film on 5200ms from its nought,
// the glass, the phone's light and the veil as they are then; a moment in
// the pull-back (7170 to 8070) holds the camera part way back, and a moment
// before nought (-300) holds the push-in out of a slot that far from done.
export function filmHold() {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('film')
  return v === null ? null : Number(v) || 0
}

// the light, as a held frame has it: how far the bands and the panel have
// turned at `t`, on the story's moments (mutual.css keeps the curves)
function heldLight(story, t) {
  const T = story.times
  const k = (a, ms) => Math.max(0, Math.min(1, (t - a) / ms))
  return { turn: k(T.top, 460), pan: k(T.covered, 160) }
}

export default function Film({
  story, seed, stamp, rect = null, hold = null, from = null, skipAt = null,
  onFrom, onSkip, onPull, onLand, onGone, onBack, keep,
}) {
  const T = story.times
  const root = useRef(null)
  const stage = useRef(null)
  const lens = useRef(null)
  const lay = useRef(null)
  const anims = useRef([])
  // (a frame asked for after the page has let the film go draws nothing)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const [size, setSize] = useState(() => glassOf(window.innerWidth, window.innerHeight))
  const held = hold !== null
  const pushed = !!rect && rect.w > 0 && rect.h > 0 && (!held || hold < 0)
  // 0 the glass growing or waking, 1 on, 2 the pink, 3 pulling back, 4 landed
  const [beat, setBeat] = useState(() => (held ? (hold >= T.pull ? 3 : hold >= T.glow ? 2 : hold >= 0 ? 1 : 0) : 0))

  // the window, measured again when it changes; a pull-back under way is
  // finished at once, since where it was flying to has moved
  useEffect(() => {
    const on = () => {
      setSize(glassOf(window.innerWidth, window.innerHeight))
      for (const a of anims.current) { try { a.finish() } catch { /* already gone */ } }
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // ── the glass's nought ──
  // Out of a slot: the frame the push-in starts on, and its length after
  // it. Out of nothing: the first frame the page can paint (`useFirstFrame`,
  // which primes the story on the black first), and the wake after it.
  // Held: a nought as far back as the hold. Once, whichever it is.
  const t0 = useFirstFrame(root, story.prime, pushed || held)
  const begun = useRef(false)
  useLayoutEffect(() => {
    if (begun.current) return
    const el = stage.current
    if (held && hold >= 0) { begun.current = true; onFrom(performance.now() - hold); return }
    if (!pushed) {
      if (t0 === null) return
      begun.current = true
      wake(el, t0)
      onFrom(t0 + WAKE_MS)
      return
    }
    begun.current = true
    if (!el || !el.animate) { onFrom(performance.now()); return }
    // the stage laid out whole, and scaled down onto the slot's glass: its
    // panel squeezed into the slot's, which with only the panel and its
    // sleeping light on it is the slot's own glass, larger
    const W = el.clientWidth || size.w
    const H = el.clientHeight || window.innerHeight
    const x0 = (window.innerWidth - W) / 2
    const start = `translate(${rect.x - x0}px, ${rect.y}px) scale(${rect.w / W}, ${rect.h / H})`
    el.style.transform = start
    requestAnimationFrame((ts) => {
      if (!alive.current) return
      el.style.transform = ''
      const a = el.animate([{ transform: start }, { transform: 'none' }], { duration: PUSH_MS, easing: EASE })
      anims.current.push(a)
      const bands = bandsIn(el)
      // (held part way, for the screenshot loop, and never started)
      if (held) {
        for (const x of [a, ...bands]) { x.pause(); x.currentTime = PUSH_MS + hold }
        return
      }
      onFrom(ts + PUSH_MS)
    })
    // once, when the glass is first laid out, and again only to hear the
    // first frame on the black
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t0])

  // the bands come in over the last of the push-in, from either edge
  const bandsIn = (el) => {
    const top = el.querySelector('.wl-scr-top')
    const bot = el.querySelector('.wl-scr-bot')
    const opts = { duration: BANDS_IN, delay: PUSH_MS - BANDS_LEAD, easing: EASE, fill: 'backwards' }
    const run = []
    if (top) run.push(top.animate([{ transform: 'translate3d(0, -100%, 0)' }, { transform: 'none' }], opts))
    if (bot) run.push(bot.animate([{ transform: 'translate3d(0, 100%, 0)' }, { transform: 'none' }], opts))
    anims.current.push(...run)
    return run
  }
  // and out of nothing, the backlight flickers on under the glass, and the
  // bands with it, on the frame the page first paints
  const wake = (el, at) => {
    if (!el || !el.animate) return
    const opts = { duration: WAKE_MS, easing: FLICKER, fill: 'both' }
    const veil = el.querySelector('.wl-film-veil')
    const run = []
    if (veil) run.push(veil.animate(WAKE, opts))
    for (const b of el.querySelectorAll('.wl-scr-top, .wl-scr-bot')) run.push(b.animate(BANDS_WAKE, { duration: WAKE_MS, fill: 'both' }))
    for (const a of run) a.startTime = at
    anims.current.push(...run)
  }

  // ── the beats, on the story's clock ──
  // The glass shown and the veil lifting at nought; the pink at its moment;
  // the column put where the mark will be seen whole, a moment before the
  // pull-back; then the pull-back, and the landing once it has flown. A skip
  // moves the clock (Reveal.jsx) and says when it was pressed, and the
  // pull-back comes 160ms after it and quicker.
  const pulled = useRef(false)
  useEffect(() => {
    if (from === null || held) return undefined
    const ids = []
    const at = (t, fn) => ids.push(setTimeout(fn, Math.max(0, t - performance.now())))
    at(from, () => setBeat((b) => Math.max(b, 1)))
    at(from + T.glow, () => setBeat((b) => Math.max(b, 2)))
    const pullAt = skipAt !== null ? Math.max(skipAt + SKIP_LAG, from) : from + T.pull
    const ms = skipAt !== null ? PULL_SKIP_MS : PULL_MS
    at(pullAt - CENTRE_LEAD, () => { if (!pulled.current && keep.current) keep.current.centre() })
    at(pullAt, () => { if (!pulled.current) pull(ms) })
    return () => ids.forEach(clearTimeout)
    // `pull` is this render's, over the refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, skipAt, held])
  // a skip that comes while the camera is already pulling back runs what is
  // left of it faster, without a jump, and the light the keepsake throws
  // coming up with it
  useEffect(() => {
    if (skipAt === null || !pulled.current) return
    for (const a of anims.current) { try { a.updatePlaybackRate(QUICKER) } catch { /* finished */ } }
    if (keep.current) keep.current.quicken(QUICKER)
  }, [skipAt, keep])

  // ── the pull-back ──
  // Where the film's grid is, in the stage's own pixels, and where the
  // keepsake's is on the page (both as PixelStory laid them out): the glass
  // is scaled by the one's width over the other's and moved so the two grids
  // are one, and cut down, in its own pixels, to what will be the keepsake's
  // mark panel (`cl` `ct` `cr` `cb`, in from each edge).
  //
  // The cut is not a clip-path. A clip-path moving is drawn again by the
  // page on every frame, and on a phone slowed four times it was two frames
  // in five of the pull-back lost. It is the stage's own edge instead
  // (`overflow: hidden`), the stage moved and squeezed onto the part of the
  // glass still seen, and the lens inside it moved and squeezed back, so the
  // glass is where the one transform would have put it: two transforms, and
  // a transform is the compositor's to draw. The two are worked out a frame
  // or so apart along the sweep and run straight between (`PULL_STEPS`),
  // since a squeeze and its undoing, each taken straight from end to end,
  // are not each other's undoing on the way.
  const measure = () => {
    const st = stage.current
    const host = st && st.querySelector('.wl-story')
    const L = lay.current
    const k = keep.current && keep.current.where()
    if (!st || !host || !L || !k) return null
    const sr = st.getBoundingClientRect()
    const hr = host.getBoundingClientRect()
    const fx = hr.left - sr.left + (L.mx + L.ox * L.cell) / L.dpr
    const fy = hr.top - sr.top + (L.my + L.oy * L.cell) / L.dpr
    const s = k.world.w / ((I_COLS * L.cell) / L.dpr)
    const dx = k.world.x - sr.left - fx * s
    const dy = k.world.y - sr.top - fy * s
    const cl = (k.panel.x - sr.left - dx) / s
    const ct = (k.panel.y - sr.top - dy) / s
    const cr = st.clientWidth - cl - k.panel.w / s
    const cb = st.clientHeight - ct - k.panel.h / s
    return { s, dx, dy, cl, ct, cr, cb, W: st.clientWidth, H: st.clientHeight }
  }
  const pull = (ms, paused = null) => {
    pulled.current = true
    const st = stage.current
    const ln = lens.current
    const m = measure()
    if (!st || !ln || !m || !st.animate) { land(); return }
    const { W, H } = m
    const cut = []
    const back = []
    for (let i = 0; i <= PULL_STEPS; i++) {
      const offset = i / PULL_STEPS
      const e = SWEEP_AT(offset)
      // the glass as the one transform has it, `e` of the way back
      const fs = 1 + (m.s - 1) * e
      const fx = m.dx * e
      const fy = m.dy * e
      // the part of it still seen, on the page, and the stage onto that
      const vx = fx + fs * m.cl * e
      const vy = fy + fs * m.ct * e
      const kx = (fs * (W - (m.cl + m.cr) * e)) / W
      const ky = (fs * (H - (m.ct + m.cb) * e)) / H
      cut.push({ offset, transform: `translate(${vx}px, ${vy}px) scale(${kx}, ${ky})` })
      back.push({ offset, transform: `translate(${(fx - vx) / kx}px, ${(fy - vy) / ky}px) scale(${fs / kx}, ${fs / ky})` })
    }
    const moved = st.animate(cut, { duration: ms, fill: 'forwards' })
    const undone = ln.animate(back, { duration: ms, fill: 'forwards' })
    const out = { duration: Math.round(ms * 0.27), easing: EASE_OUT, fill: 'forwards' }
    const run = [moved, undone]
    const top = st.querySelector('.wl-scr-top')
    const bot = st.querySelector('.wl-scr-bot')
    if (top) run.push(top.animate([{ transform: 'none' }, { transform: 'translate3d(0, -100%, 0)' }], out))
    if (bot) run.push(bot.animate([{ transform: 'none' }, { transform: 'translate3d(0, 100%, 0)' }], out))
    anims.current.push(...run)
    setBeat((b) => Math.max(b, 3))
    if (onPull) onPull(ms, paused)
    if (paused !== null) {
      for (const x of run) { x.pause(); x.currentTime = Math.min(paused, x.effect.getTiming().duration) }
      return
    }
    moved.finished.then(land, () => {})
  }
  const landed = useRef(false)
  const land = () => {
    if (landed.current || !alive.current) return
    landed.current = true
    setBeat(4)
    if (onLand) onLand()
    const st = stage.current
    if (st && st.animate) anims.current.push(st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, easing: 'linear', fill: 'forwards' }))
    setTimeout(() => { if (alive.current && onGone) onGone() }, LET_GO)
  }

  // a held frame in the pull-back: the camera part way back, stood still
  useEffect(() => {
    if (!held || hold < T.pull || hold >= T.land) return undefined
    const id = setTimeout(() => {
      if (keep.current) keep.current.centre()
      pull(PULL_MS, hold - T.pull)
    }, 600)
    return () => clearTimeout(id)
    // once, for the hold
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── skipping it ──
  // A press anywhere that is not a control, or a key, from the moment the
  // glass is up until it has landed: in the push-in or the wake the skip
  // waits for the glass (Reveal.jsx `queued`), and in the pull-back it runs
  // what is left faster. Only a press that begins after the film was put up
  // counts, and never a key held down since, so the press that opened it,
  // still arriving, is not taken for a skip. A key on a control is the
  // control's (Enter on `back` goes back), and a modifier alone is on its
  // way to something else: Shift before Shift+Tab skipped the film. `skip`
  // stays a key through the pull-back for the same reason.
  const [upAt] = useState(() => performance.now())
  const armed = beat < 4 && !held
  useEffect(() => {
    if (!armed) return undefined
    const onDown = (e) => { if (e.timeStamp >= upAt && !e.target.closest('a, button')) onSkip() }
    const onKey = (e) => {
      if (e.repeat || e.timeStamp < upAt || ALONE.has(e.key)) return
      if (e.key === 'Escape' || e.key === 'Tab' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target.closest('a, button, input, textarea')) return
      onSkip()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [armed, onSkip, upAt])

  // the focus is the film's while it plays, so a reader is on the dialog and
  // a key lands here and not on the page behind it
  useEffect(() => {
    if (!held && root.current) root.current.focus({ preventScroll: true })
  }, [held])

  const lit = held ? heldLight(story, hold) : null
  const style = {
    ...PHONE,
    // the backlight brightest in the middle of the panel, where the mark
    // will stand, as the keepsake's is round its mark
    '--q-hx': '50%',
    '--q-hy': `${((100 * (size.top + size.panelH / 2)) / size.vh).toFixed(2)}%`,
    '--mu-turn-at': `${T.top - T.glow}ms`, '--mu-pan-at': `${T.covered - T.glow}ms`,
    ...(lit ? { '--held-turn': lit.turn, '--held-pan': lit.pan } : null),
  }
  const keys = {
    l: { label: 'back', onClick: onBack, aria: 'back' },
    r: { label: 'skip', onClick: onSkip, aria: 'skip to the notes', disabled: beat >= 4 },
  }
  const cls = [
    'wl-film', pushed && beat === 0 && 'is-pushing', !pushed && !held && beat === 0 && 'is-waking',
    beat >= 1 && 'is-on', beat >= 2 && 'is-glow', skipAt !== null && 'is-skip', beat >= 3 && 'is-pulling',
    held && 'is-held',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} ref={root} tabIndex={-1}>
      <div className="wl-film-stage" ref={stage} style={{ '--glass-w': `${size.w}px` }}>
        <div className="wl-film-lens" ref={lens}>
          <Screen look={LOOK} seed={seed} top={{ stamp, bat: 4 }} keys={keys} className="wl-film-scr" style={style}>
            {/* laid in once the glass has begun to grow or wake (see the
                header), and not on the press */}
            {from !== null || held ? (
              <PixelStory
                story={story} crisp from={from} at={held ? hold : null}
                onLayout={(l) => { lay.current = l }}
              />
            ) : null}
            {/* the backlight asleep, over the cells and under the glass */}
            <span className="wl-film-veil" aria-hidden="true" />
          </Screen>
        </div>
      </div>
    </div>
  )
}

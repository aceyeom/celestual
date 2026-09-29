// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KEEPSAKE: one rose phone, the mark at its head, and the two notes   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// What a mutual is once it has been told (screens/Reveal.jsx): the thing the
// film pulls back into (Film.jsx), and what opens on every visit after the
// first. The owner asked for the reveal to show both letters, with both
// names, as something two people would keep and pass round; the old sheet
// had their note on a panel under the phone and yours behind a key, because
// you know what you wrote. But what was told is the two of them, and a
// keepsake of it that holds one note is half of it.
//
// So it is one phone, the rose letter, held square, and its glass is the
// whole of what happened, read from the top down. The mark crowns it: alive
// at the head of the glass, where the film lands, with `it's mutual.` under
// it in the glass's own cells, and the two first names under that as one
// line, `Jules & Ace`, the one place the pair is named together. Then the
// two notes, theirs first and yours second, as the phone's inbox showed a
// message: each a small screen of its own on the glass, with its own strip
// across its top, a darker band of the rose like the phone's own band in
// miniature, carrying the line its writer set there (`dear Ace` when they
// set none) and the battery they left it on, over their words, signed
// `from Jules`. Two people's phones, one moment, on one glass.
//
// It was cut into three by two dark lines, their note, the mark and yours,
// with the two names crammed into a second status row (`Jules · Ace`); the
// owner found it subdivided, and generic where it should be the one thing
// of its kind (29 September). So nothing cuts the glass now: the mark's
// panel has no edge, its unlit dots run on under the notes on the same
// cells (mutual.css `.wl-keep-body`, PixelStory.jsx `dots`), and the band
// is one row, the aerial and the night it was told, with no battery of the
// phone's own, since each note carries its writer's. On a desk the phone is
// as wide as it is tall and the two notes stand side by side under the
// mark, level with each other, which is the two faces most plainly; a
// phone on its side sets them beside the mark. The phone is sized by its
// own height as well as the window's width, so a note of three lines is a
// phone a little narrower and not one with its keys under the fold
// (`place`, mutual.css `--keep-h`). The same markup every way, in the order
// a reader hears it.
//
//   alive    the mark (its breath, the glint going round the ring, a cell of
//            the star lit now and then, ten frames a second and never taken
//            back; pixmark.js `keepStory`), the cursor on the phone's beat,
//            and the light the phone throws in the room, breathing slowly
//   still    everything else: the phone, the notes, the names, the keys.
//            Nothing floats, no colour drifts, and nothing is told again on
//            its own (the owner cut all three)
//
// Its two soft keys are the phone's: `options` (write them a new note, or
// open the one already out on them since, or take it off your list) and
// `share` (a picture of it). Every menu, the question before taking it off
// and every note after a press stand in the mark's place, as a phone put a
// menu on its screen, with the menu's name and where in it the chosen row
// is on the status row, as a phone titled a menu, and the two notes stay in
// view under them. Under the phone, the one lit key: their Instagram, which
// is where this product's part ends.
//
// ── taking it off ───────────────────────────────────────────────────────────
// A mutual is kept on both lists for good (0072), and taking it off is
// taking it off your own: they keep theirs and are not told
// (`forgetMutual`). Asked once, in the phone's own words, with keeping it
// the key the focus starts on, and said as done before the sheet closes
// onto the private notes, where it is no longer listed.
//
// ── the picture ─────────────────────────────────────────────────────────────
// `share` draws the keepsake as a picture (keepshare.js): the rose phone
// with both first names, both notes and the mark, the night, and the
// product's signature. The owner asked for it with the notes, so it has
// them unless a person leaves them off from the same menu, and never a
// handle or a link. It is drawn still as the phone stood before 29
// September, the names in the band and the glass in three, until it is
// drawn as this one stands (keeplayout.js).

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Screen, ScreenMenu, ScreenNote, Pix } from './screen.jsx'
import PixelStory, { SQUARE, crispDpr } from './PixelStory.jsx'
import { SheetFoot, Pill } from './parts.jsx'
import { I_COLS, I_ROWS, NOTE } from './pixmark.js'
import { atHandle } from './data.js'
import { langOf } from './type.js'
import { bezier } from './Film.jsx'
import { forgetMutual } from './pings.js'
import { editNote } from './screens/Ping.jsx'
import { prepareMutual, isMutualReady, shareMutual, canShareFiles } from './keepshare.js'

const LOOK = { tint: 'rose' }
const EASE = 'cubic-bezier(0.16, 1, 0.30, 1)'
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
// How it unfolds out of its mark, on `--ease` read a step at a time, and the
// beats after it (mutual.css): out of the film in 380ms; out of the slot's
// glass, a flight of 360ms with the phone opening under it from 150ms, in
// 280ms, and the glass gone into it 90ms after it lands, all of it in 450
const UNFOLD_AT = bezier(0.16, 1, 0.30, 1)
const UNFOLD_STEPS = 30
const UNFOLD_MS = 380
const UNFOLD_FLY_MS = 280
const FLY_MS = 360
export const FLY_OPENS = 150
const FLY_OUT = 90
// how long `taken off.` stands before the screen sleeps
const GONE_MS = 900

// ── the words, by how many there are ──
// Four sizes of the phone's face, the largest a note of a line or two and
// the smallest the whole of a note's two hundred and eighty characters,
// which at it fit the panel with nothing scrolled (mutual.css `is-l`..).
// Both notes are set at the one size the longer of them takes: two voices
// at two sizes, side by side, said one of them louder.
function sizeOf(...texts) {
  const n = Math.max(0, ...texts.map((t) => [...String(t || '')].length))
  return n <= 60 ? 'l' : n <= 120 ? 'm' : n <= 200 ? 's' : 'xs'
}

// the sealed note the stories draw, as a glyph (pixmark.js `NOTE`)
const NOTE_D = NOTE.map((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('')
function NoteGlyph() {
  return (
    <svg className="wl-px wl-keep-glyph" viewBox={`0 0 ${NOTE[0].length} ${NOTE.length}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={NOTE_D} />
    </svg>
  )
}

// ── a line, set to fit ──
// The line across a note's strip is its writer's, up to forty characters
// (pings.js `greetOf`), and at its own size the strip holds about thirty
// of the face, near two fifths of an em each, fewer on a desk, where the
// two notes stand side by side. So a longer line is set smaller, down to
// two thirds of its size, before anything is cut: the way screen.jsx
// `lineSize` sets a long greeting. The page is told how long it is, in
// the face's own widths (a Korean, Japanese or Chinese character is about
// as wide as two and a half of the others), and works out the size from
// the strip it stands in (mutual.css `--n`), so the one line is right on a
// phone, on its side and on a desk. The two names under the mark are set
// the same way.
const WIDE = /[\u1100-\u11FF\u2E80-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/
const measureOf = (text) => ({ '--n': [...String(text || '')].reduce((n, c) => n + (WIDE.test(c) ? 2.6 : 1), 0) || 1 })

// One of the two notes, as the phone's inbox showed a message: a small
// screen on the glass with its own strip across the top, the line its
// writer set there and the battery they left it on, then what they wrote,
// or that they wrote nothing, and whose it is under it. A group a reader
// lands on, with its name. The battery is theirs to have set, so it is
// drawn as they left it and never blinks, even empty: the keepsake is still
function Note({ who, title, bat, text, size, side, innerRef }) {
  const label = `from ${who}`
  return (
    <figure className={`wl-keep-note is-${side}`} aria-label={label} tabIndex={-1} ref={innerRef}>
      <div className="wl-keep-head">
        <span className="wl-keep-title" lang={langOf(title) || undefined} style={measureOf(title)}>{title}</span>
        <Pix name={`bata${bat}`} className="wl-keep-bat" style={BAT_SIZE} />
      </div>
      {text ? (
        <p className={`wl-keep-words is-${size}`} lang={langOf(text) || undefined}>{text}</p>
      ) : (
        <p className="wl-keep-words is-none"><NoteGlyph /><span>sent without a note.</span></p>
      )}
      <figcaption className="wl-keep-from" lang={langOf(who) || undefined}>{label}</figcaption>
    </figure>
  )
}
// the battery on a note's strip, a size under its line (`Pix` is in `cqw`
// of the screen, and the keepsake's sizes are in `--su`)
const BAT_SIZE = { height: 'calc(4.2 * var(--su))', width: 'auto' }

// How much of the mark's panel is left under the story's last row: the
// story's grid worked out for the panel as PixelStory.jsx lays it (`size`,
// a whole number of device pixels to a cell, the rows in the middle of
// the panel), before it has, so the names under `it's mutual.` stand
// where they will from the first frame and the phone never moves under a
// glass flying onto it. Coarser cells, a desk's, leave more
function slackOf(w, h) {
  if (!w || !h) return 0
  const dpr = crispDpr(w, h)
  const cell = Math.max(1, Math.floor(Math.min((w * dpr) / I_COLS, (h * dpr) / I_ROWS)))
  const pr = Math.max(I_ROWS, Math.floor((h * dpr) / cell))
  const my = (Math.round(h * dpr) - pr * cell) >> 1
  return Math.max(0, h - (my + (((pr - I_ROWS) >> 1) + I_ROWS) * cell) / dpr)
}

// The face a note was left on: the line its writer set, or `dear` and the
// name of the one it is to, and the battery they left it on, or full. A
// note sent without words has neither (pings.js `placing`), and is drawn
// on the phone's own.
function faceOf(words, greet, bat, to) {
  const set = !!words
  return {
    title: (set && greet) || `dear ${to}`,
    bat: set && Number.isInteger(bat) && bat >= 0 && bat <= 4 ? bat : 4,
  }
}

export default function Keepsake({
  me, them, p, names, first, seed, stamp, story, from = null, at = null,
  state = 'rest', enter = 'fade', fly = null, menu = null, standing = null,
  go, onGone, apiRef, escRef,
}) {
  const box = useRef(null)
  const strip = useRef(null)
  const mark = useRef(null)
  const theirs = useRef(null)
  const light = useRef(null)
  const coming = useRef(null)
  const lens = useRef(null)
  const lay = useRef(null)
  const body = useRef(null)
  const [view, setView] = useState(() => (menu ? { kind: menu, at: 0 } : null))
  const [notesOn, setNotesOn] = useState(true)
  const [, drawn] = useState(0)
  // the backlight's hot spot at the middle of the mark, as a share of the
  // phone's height, and where the light it throws stands in the room
  const [spot, setSpot] = useState({ hy: 50, lx: 0, ly: 0 })
  const here = useRef(true)
  useEffect(() => { here.current = true; return () => { here.current = false } }, [])

  // ── where things are ──
  // The mark panel and the cells in it, on the page, for the film to land
  // on (Film.jsx `measure`); the hot spot and the room light, whenever the
  // phone is laid out again. And how tall the phone is in its own units,
  // `--su`, which is the same at every size, since everything on it is
  // set in them: the window fits the whole of it by that (mutual.css
  // `--keep-h`), so a note of three lines is a phone a little narrower and
  // not one with its keys under the fold. Written to the room straight, as
  // the dots are, and only when it has moved by more than a unit, so the
  // size it gives is never answered by another
  useLayoutEffect(() => {
    const el = strip.current
    const mk = mark.current
    const bx = box.current
    if (!el || !mk || !bx) return undefined
    const place = () => {
      const sr = el.getBoundingClientRect()
      const mr = mk.getBoundingClientRect()
      const br = bx.getBoundingClientRect()
      if (!sr.height) return
      const su = parseFloat(getComputedStyle(el).getPropertyValue('--su'))
      // (less what the names are drawn up by into the mark's panel, which is
      // the cells' to say and not the phone's, mutual.css `--pair-lift`)
      const b = body.current
      if (b) b.style.setProperty('--mark-slack', `${Math.round(slackOf(mk.clientWidth, mk.clientHeight) * 1000) / 1000}px`)
      const lift = b ? parseFloat(getComputedStyle(b).getPropertyValue('--pair-lift')) || 0 : 0
      if (su > 0) {
        const h = Math.ceil(((el.offsetHeight + lift) / su) * 2) / 2
        const was = parseFloat(bx.style.getPropertyValue('--keep-h'))
        if (!(Math.abs(h - was) <= 1)) bx.style.setProperty('--keep-h', String(h))
      }
      dotsOn()
      setSpot({
        hy: Math.round((1000 * (mr.top - sr.top + mr.height / 2)) / sr.height) / 10,
        lx: Math.round(mr.left - br.left + mr.width / 2),
        ly: Math.round(mr.top - br.top + mr.height / 2),
      })
    }
    place()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    if (ro) ro.observe(el)
    return () => { if (ro) ro.disconnect() }
  }, [])

  // ── the glass's unlit dots ──
  // The mark's canvas draws none of its own (`dots`), and the glass lays
  // them over the whole of itself instead, mark, names and notes alike, on
  // the story's own cells: the pitch, the lit part of a cell, and where the
  // first one starts, which is the canvas's, measured from the glass's
  // corner (mutual.css `.wl-keep-body`), under whatever scale the phone is
  // opening at. Written straight to the glass whenever the story or the
  // phone is laid out, and never by a render
  const dotsOn = (L = lay.current) => {
    const b = body.current
    const host = mark.current && mark.current.querySelector('.wl-story')
    if (!b || !host || !L || !L.dpr) return
    const br = b.getBoundingClientRect()
    const hr = host.getBoundingClientRect()
    const kx = br.width && b.offsetWidth ? b.offsetWidth / br.width : 1
    const ky = br.height && b.offsetHeight ? b.offsetHeight / br.height : kx
    const px = (v) => `${Math.round(v * 1000) / 1000}px`
    b.style.setProperty('--dot-p', px(L.cell / L.dpr))
    b.style.setProperty('--dot-d', px((L.cell - L.gap) / L.dpr))
    b.style.setProperty('--dot-x', px((hr.left - br.left) * kx + L.mx / L.dpr))
    b.style.setProperty('--dot-y', px((hr.top - br.top) * ky + L.my / L.dpr))
  }

  useImperativeHandle(apiRef, () => ({
    // the cells of the mark and the panel round them, on the page
    where() {
      const mk = mark.current
      const host = mk && mk.querySelector('.wl-story')
      const L = lay.current
      if (!mk || !host || !L) return null
      const mr = mk.getBoundingClientRect()
      const hr = host.getBoundingClientRect()
      return {
        world: {
          x: hr.left + (L.mx + L.ox * L.cell) / L.dpr, y: hr.top + (L.my + L.oy * L.cell) / L.dpr,
          w: (I_COLS * L.cell) / L.dpr, h: (I_ROWS * L.cell) / L.dpr,
        },
        panel: { x: mr.left, y: mr.top, w: mr.width, h: mr.height },
      }
    },
    // a phone taller than the window is scrolled so its mark is in the
    // middle of it, which is where the film lands and where a reader's eye is
    centre() {
      const mk = mark.current
      const sc = mk && mk.closest('.wl-sheet')
      if (!sc || sc.scrollHeight <= sc.clientHeight + 1) return
      const mr = mk.getBoundingClientRect()
      const cr = sc.getBoundingClientRect()
      const want = sc.scrollTop + (mr.top - cr.top) + mr.height / 2 - sc.clientHeight / 2
      sc.scrollTop = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, want))
    },
    // the light it throws coming up as the film lands in it (`ms` long)
    lightUp(ms, paused = null) {
      const el = light.current
      if (!el || !el.animate) return
      const a = el.animate([
        { opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(1.3)' },
        { opacity: 0.75, transform: 'translate3d(-50%, -50%, 0) scale(1)' },
      ], { duration: ms, easing: EASE_OUT, fill: 'forwards' })
      if (paused !== null) { a.pause(); a.currentTime = Math.min(ms, paused) }
      coming.current = a
    },
    // and as much faster as the film, when a skip quickens the pull-back
    quicken(rate) {
      try { if (coming.current) coming.current.updatePlaybackRate(rate) } catch { /* finished */ }
    },
  }), [])

  // ── arriving ──
  // Out of the film: laid out and hidden while it plays, then unfolding out
  // of its mark as the film goes out over it, both notes waking on one frame
  // and the keys after (`landing`, mutual.css). Out of the slot, when the
  // film has been seen: the slot's glass flies to the mark and the phone
  // unfolds out of it while it is still arriving, the notes simply there as
  // it opens and the lit key a beat behind, the whole of it in under half a
  // second (`fly`); it was the film's landing again, after a flight, and a
  // reader who opens their keepsake most days waited a second for its notes.
  // Otherwise it comes up where it stands (`fade`), and under reduced motion
  // that is all that moves.
  //
  // The unfold is two transforms, as the film's pull-back is (Film.jsx
  // `pull`): the strip moved and squeezed onto its mark and cut by its own
  // edge (`is-unfolding`), the lens in it squeezed back, so the phone stands
  // still where it is and only the cut opens, worked out a step at a time
  // along the curve. It was a clip-path, which the page draws again on every
  // frame, until the review of 28 September held it to DESIGN.md's
  // transforms and opacities.
  const [landing, setLanding] = useState(false)
  const unfold = (ms) => {
    const el = strip.current
    const ln = lens.current
    const mk = mark.current
    if (!el || !ln || !mk || !el.animate) return
    const sr = el.getBoundingClientRect()
    const mr = mk.getBoundingClientRect()
    const W = sr.width
    const H = sr.height
    if (!W || !H) return
    const x0 = mr.left - sr.left
    const y0 = mr.top - sr.top
    const cut = []
    const back = []
    for (let i = 0; i <= UNFOLD_STEPS; i++) {
      const offset = i / UNFOLD_STEPS
      const e = UNFOLD_AT(offset)
      // the part of the strip seen, `e` of the way from the mark to all of it
      const x = x0 * (1 - e)
      const y = y0 * (1 - e)
      const kx = (mr.width + (W - mr.width) * e) / W
      const ky = (mr.height + (H - mr.height) * e) / H
      cut.push({ offset, transform: `translate(${x}px, ${y}px) scale(${kx}, ${ky})` })
      back.push({ offset, transform: `scale(${1 / kx}, ${1 / ky}) translate(${-x}px, ${-y}px)` })
    }
    // (the strip's class is its own and never changes, so React leaves this
    // one where it is put)
    el.classList.add('is-unfolding')
    const a = el.animate(cut, { duration: ms })
    ln.animate(back, { duration: ms })
    const done = () => el.classList.remove('is-unfolding')
    a.finished.then(done, done)
  }
  useLayoutEffect(() => {
    if (state !== 'landing') return
    unfold(UNFOLD_MS)
    setLanding(true)
    // the focus the film had (its keys, or the dialog) goes to their note
    const a = document.activeElement
    if (theirs.current && (!a || a === document.body || a.closest('.wl-film'))) theirs.current.focus({ preventScroll: true })
  }, [state])
  // arriving any other way, a reader starts on their note too, unless a
  // menu was asked for and has the focus already. Out of the slot the phone
  // is there to be focused while the glass flies, at no strength and not
  // hidden (mutual.css): hidden, the focus asked for on arriving went
  // nowhere, and the keyboard was left on the page's body with the menu up
  useEffect(() => {
    if (enter === 'film' || menu || !theirs.current) return
    theirs.current.focus({ preventScroll: true })
    // once, on arriving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // the slot's glass, flying to the mark: laid over where the mark is and
  // scaled down onto the slot, then let go to its own size, and the phone
  // unfolding out from under it once it is most of the way there
  const flier = useRef(null)
  const [flying, setFlying] = useState(enter === 'fly' && !!fly)
  useLayoutEffect(() => {
    if (!flying) return undefined
    const el = flier.current
    const mk = mark.current
    if (!el || !mk || !el.animate) { setFlying(false); return undefined }
    const mr = mk.getBoundingClientRect()
    Object.assign(el.style, { left: `${mr.left}px`, top: `${mr.top}px`, width: `${mr.width}px`, height: `${mr.height}px` })
    const start = `translate(${fly.x - mr.left}px, ${fly.y - mr.top}px) scale(${fly.w / mr.width}, ${fly.h / mr.height})`
    const a = el.animate([{ transform: start }, { transform: 'none' }], { duration: FLY_MS, easing: EASE, fill: 'both' })
    const veil = el.firstChild
    if (veil && veil.animate) veil.animate([{ opacity: 0.38 }, { opacity: 0 }], { duration: FLY_MS, easing: EASE_OUT, fill: 'both' })
    const t = setTimeout(() => { unfold(UNFOLD_FLY_MS); setLanding(true) }, FLY_OPENS)
    a.finished.then(() => {
      const out = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLY_OUT, easing: 'linear', fill: 'forwards' })
      out.finished.then(() => { if (here.current) setFlying(false) }, () => {})
    }, () => {})
    return () => clearTimeout(t)
    // once, from the slot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── the room light, breathing ──
  // Once it is at rest: from the strength the landing left it at, slowly
  // brighter and back, a little larger and back, for as long as it is open.
  // The compositor's, and still under reduced motion (mutual.css).
  const rest = state === 'rest'
  useEffect(() => {
    const el = light.current
    if (!rest || !el || !el.animate) return undefined
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const a = el.animate([
      { opacity: 0.75, transform: 'translate3d(-50%, -50%, 0) scale(0.96)' },
      { opacity: 1, transform: 'translate3d(-50%, -50%, 0) scale(1.04)' },
    ], { duration: 4200, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', iterations: Infinity, direction: 'alternate' })
    return () => a.cancel()
  }, [rest])

  // ── the menus ──
  // Writing to them again is a new note, unless one is already out on them
  // since the mutual, and then it is that note, opened as itself to change
  // its words or let it go (Ping.jsx `editNote`): offered as a new one, it
  // opened a composer saying the note was already out, over the mutual's
  // old words (the review of 28 September)
  const back = () => setView(null)
  const n0 = names[0]
  const optionItems = [
    standing
      ? { t: `your new note to ${n0}`, run: () => editNote(go, them, standing.line, standing) }
      : { t: `send ${n0} a new note`, run: () => go('ping', them) },
    { t: 'take it off my list', run: () => setView({ kind: 'confirm' }) },
  ]
  // The picture: first names only, or none; the notes unless they are left
  // off; the mark on the frame the keepsake is drawn still on; and not the
  // pair's seed, which is their handles (keepshare.js `lookOf`)
  const face = () => ({
    stamp, names: first, notes: notesOn ? [p.theirLine || '', p.line || ''] : null,
    frame: story ? story.frame(story.still) : null,
  })
  const sharing = !!view && view.kind === 'share'
  useEffect(() => {
    if (!sharing || !story) return undefined
    let live = true
    prepareMutual(face()).then(() => { if (live) drawn((k) => k + 1) })
    return () => { live = false }
    // the picture for what it says now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing, notesOn, story])
  const canFiles = canShareFiles()
  const shareItems = [
    ...(canFiles ? [{ t: isMutualReady(face()) ? 'to someone' : 'to someone…', how: 'share' }] : []),
    { t: 'save the picture', how: 'save' },
    { t: notesOn ? 'leave the notes off' : 'put the notes back', how: 'notes' },
  ]
  const pass = async (how) => {
    if (how === 'notes') { setNotesOn((o) => !o); return }
    // a phone opens the share sheet only inside the tap that asked, so a tap
    // before the picture is drawn waits for it and puts the menu back
    if (how === 'share' && !isMutualReady(face())) {
      setView({ kind: 'note', glyph: 'env', title: 'drawing it' })
      const b = await prepareMutual(face())
      if (!here.current) return
      setView(b ? { kind: 'share', at: 0 } : { kind: 'note', title: 'it did not go', text: 'try again', done: true })
      return
    }
    const going = shareMutual(how, face())
    setView({ kind: 'note', glyph: 'env', title: how === 'save' ? 'saving' : 'sharing' })
    const out = await going
    if (!here.current) return
    if (out === 'left') { setView({ kind: 'share', at: 0 }); return }
    const said = { shared: ['check', 'shared'], saved: ['check', 'saved'] }[out] || ['', 'it did not go', 'try again']
    setView({ kind: 'note', glyph: said[0], title: said[1], text: said[2] || '', done: true })
  }

  // ── taking it off ──
  const takeOff = async () => {
    setView({ kind: 'note', glyph: 'wait', title: 'taking it off', busy: true })
    const out = await forgetMutual({ me, them })
    if (!here.current) return
    if (out.ok || out.error === 'none') {
      setView({ kind: 'note', glyph: 'check', title: 'taken off.', busy: true })
      setTimeout(() => { if (here.current && onGone) onGone() }, GONE_MS)
      return
    }
    setView({ kind: 'note', title: 'it did not go through.', text: 'give it a moment, then try again.', done: true })
  }
  // the question opens with the focus on keeping it
  const confirming = !!view && view.kind === 'confirm'
  useEffect(() => {
    if (!confirming) return
    const k = document.getElementById('wl-keep-no')
    if (k) k.focus({ preventScroll: true })
  }, [confirming])

  // Escape leaves whatever stands in the mark's place first, and closes the
  // sheet only from the keepsake itself (Reveal.jsx `onEscape`); a menu has
  // its own (screen.jsx `ScreenMenu`)
  useImperativeHandle(escRef, () => () => {
    if (!view) return false
    if (!view.busy) setView(null)
    return true
  }, [view])

  // ── where the focus goes ──
  // What stands in the mark's place takes the key a reader pressed with it,
  // and the menu's list goes when it does: after Escape, `keep it`, `ok`
  // and a pick, the focus was left on the page's body, or on `share`, which
  // is the button `keep it` was (the review of 28 September). So the glass
  // coming back to rest puts it on the key that opened what was up, and a
  // note that is done puts it on its `ok`. Not taken from anything outside
  // the phone: a pick that opens the ping sheet keeps what that sheet gives.
  const opener = useRef('wl-keep-options')
  const wasUp = useRef(!!view)
  useEffect(() => {
    const was = wasUp.current
    wasUp.current = !!view
    const id = view ? (view.kind === 'note' && view.done ? 'wl-keep-ok' : '') : was ? opener.current : ''
    const a = document.activeElement
    if (!id || (a && a !== document.body && !(box.current && box.current.contains(a)))) return
    const k = document.getElementById(id)
    if (k) k.focus({ preventScroll: true })
  }, [view])

  // ── the phone, as it stands ──
  // One status row: the aerial and the night it was told, and no battery,
  // since each note carries its own. A menu takes the row as a phone titled
  // one, its name where the night was and where in it the chosen row is at
  // the far end (`date`, `counter`, sized in `--su` by mutual.css)
  const pos = (k, items) => `${Math.min(k.at || 0, items.length - 1) + 1}/${items.length}`
  let top = { stamp, bat: null }
  let keys
  let over = null
  if (view && (view.kind === 'options' || view.kind === 'share')) {
    const items = view.kind === 'options' ? optionItems : shareItems
    const sel = Math.min(view.at || 0, items.length - 1)
    const pick = (j) => {
      const it = items[j]
      if (!it) return
      if (it.how) pass(it.how)
      else { setView(null); it.run() }
    }
    top = { date: view.kind, counter: pos(view, items), bat: null }
    over = (
      <ScreenMenu
        items={items.map((x) => x.t)} at={sel} label={view.kind}
        onAt={(j) => setView({ ...view, at: j })} onPick={pick} onBack={back}
      />
    )
    keys = {
      l: { label: 'select', onClick: () => pick(sel), aria: `select ${items[sel]?.t || ''}` },
      r: { label: 'back', onClick: back, aria: 'back to the notes' },
    }
  } else if (view && view.kind === 'confirm') {
    over = (
      <ScreenNote title="take it off your list?">
        it leaves your list for good. {n0} keeps theirs and is not told.
        {standing ? ` your new note to ${n0} is still standing.` : ''}
      </ScreenNote>
    )
    keys = {
      l: { label: 'take it off', onClick: takeOff, aria: `take it off your list. ${n0} keeps theirs and is not told` },
      r: { label: 'keep it', onClick: back, aria: 'keep it', id: 'wl-keep-no' },
    }
  } else if (view && view.kind === 'note') {
    over = <ScreenNote glyph={view.glyph} title={view.title}>{view.text || null}</ScreenNote>
    keys = view.done ? { r: { label: 'ok', onClick: back, aria: 'back to the notes', id: 'wl-keep-ok' } } : {}
  } else {
    keys = {
      l: {
        label: 'options', id: 'wl-keep-options',
        onClick: () => { opener.current = 'wl-keep-options'; setView({ kind: 'options', at: 0 }) },
        aria: `options: ${standing ? `your new note to ${n0}` : `send ${n0} a new note`}, or take it off your list`,
      },
      r: {
        label: 'share', id: 'wl-keep-share',
        onClick: () => { opener.current = 'wl-keep-share'; if (story) prepareMutual(face()); setView({ kind: 'share', at: 0 }) },
        aria: 'share a picture of it, or save it',
      },
    }
  }
  // The mark stands still while anything stands in its place, on the frame
  // it was on, and goes on from where its clock is when it comes back
  const paused = useRef(null)
  if (!over) paused.current = null
  else if (paused.current === null) paused.current = at ?? (from !== null ? performance.now() - from : 0)
  const hidden = state === 'hidden'
  const words = sizeOf(p.theirLine, p.line)
  // theirs is to you and yours to them: `names` is theirs, then yours
  const theirFace = faceOf(p.theirLine, p.theirGreet, p.theirBat, names[1])
  const yourFace = faceOf(p.line, p.greet, p.bat, names[0])
  const cls = [
    'wl-keep', hidden && 'is-hidden', landing && 'is-landing', enter === 'fade' && !hidden && 'is-fading',
    enter === 'fly' && 'is-flying', view && 'is-over',
  ].filter(Boolean).join(' ')
  const phone = { ...SQUARE, '--q-hx': '50%', '--q-hy': `${spot.hy}%` }

  return (
    <div className={cls} ref={box} style={{ '--lx': `${spot.lx}px`, '--ly': `${spot.ly}px` }}>
      <span className="wl-keep-light" ref={light} aria-hidden="true" />
      <div className="wl-keep-strip" ref={strip} inert={hidden || undefined} aria-hidden={hidden || undefined}>
        {/* the squeeze undone while the strip unfolds (`unfold`) */}
        <div className="wl-keep-lens" ref={lens}>
          <Screen look={LOOK} seed={seed} top={top} keys={keys} live={!hidden} className="wl-keep-scr" style={phone}>
            <div className="wl-keep-body" ref={body}>
              {/* the crown, the film's panel, its cells the glass's
                  (`dotsOn`) */}
              <div className="wl-keep-mark" ref={mark}>
                {story ? (
                  <PixelStory
                    story={story} crisp dots={false} from={from} at={over ? paused.current : at}
                    onLayout={(l) => { lay.current = l; dotsOn(l) }}
                  />
                ) : null}
                {over ? <div className="wl-keep-over">{over}</div> : null}
              </div>
              <div className="wl-keep-inbox">
                {/* the two of them, once, as one line under what was told;
                    a reader has their names from the notes, so it is not
                    read twice */}
                <p className="wl-keep-pair" aria-hidden="true" style={measureOf(`${names[0]} & ${names[1]}`)}>
                  <span lang={langOf(names[0]) || undefined}>{names[0]}</span>
                  <span className="wl-keep-amp">&amp;</span>
                  <span lang={langOf(names[1]) || undefined}>{names[1]}</span>
                </p>
                <Note who={names[0]} {...theirFace} text={p.theirLine} size={words} side="theirs" innerRef={theirs} />
                <Note who={names[1]} {...yourFace} text={p.line} size={words} side="yours" />
              </div>
            </div>
          </Screen>
        </div>
      </div>
      <SheetFoot className="wl-keep-foot">
        <Pill
          tone="light" wide href={`https://instagram.com/${them}`} rel="noreferrer noopener" target="_blank"
          tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined}
        >
          message {atHandle(them)} on Instagram
        </Pill>
      </SheetFoot>
      {flying ? <div className="wl-keep-fly" ref={flier} aria-hidden="true"><span /></div> : null}
    </div>
  )
}

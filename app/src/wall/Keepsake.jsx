// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KEEPSAKE: one rose phone, both notes, and the mark between them     ║
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
// whole of what happened: their note at the top of the panel, the mark in
// the middle of it, alive, with `it's mutual.` under it, and your note at
// the foot, the panel cut into three by two dark lines of the phone's own
// glass. The status row carries the night it was told, and the second row
// the two of them, theirs first (screen.jsx `pair`). On a desk the three
// stand in a row, theirs, the mark, yours, on a phone as wide as the room
// allows. The same markup either way, in the order a reader hears it.
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
// take it off your list) and `share` (a picture of it). Every menu, the
// question before taking it off and every note after a press stand in the
// mark's place, as a phone put a menu on its screen, and the two notes stay
// in view beside them. Under the phone, the one lit key: their Instagram,
// which is where this product's part ends.
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
// handle or a link.

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Screen, ScreenMenu, ScreenNote } from './screen.jsx'
import PixelStory, { SQUARE } from './PixelStory.jsx'
import { SheetFoot, Pill } from './parts.jsx'
import { I_COLS, I_ROWS, NOTE } from './pixmark.js'
import { atHandle } from './data.js'
import { langOf } from './type.js'
import { forgetMutual } from './pings.js'
import { prepareMutual, isMutualReady, shareMutual, canShareFiles } from './keepshare.js'

const LOOK = { tint: 'rose' }
const EASE = 'cubic-bezier(0.16, 1, 0.30, 1)'
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
// how it unfolds out of its mark, and the beats after it (mutual.css)
const UNFOLD_MS = 380
const FLY_MS = 480
const FLY_OUT = 140
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

// One of the two notes: whose it is, and what they wrote, or that they
// wrote nothing. A group a reader lands on, with its name.
function Note({ who, text, size, side, innerRef }) {
  const label = `from ${who}`
  return (
    <figure className={`wl-keep-note is-${side}`} aria-label={label} tabIndex={-1} ref={innerRef}>
      <figcaption className="wl-keep-from" lang={langOf(who) || undefined}>{label}</figcaption>
      {text ? (
        <p className={`wl-keep-words is-${size}`} lang={langOf(text) || undefined}>{text}</p>
      ) : (
        <p className="wl-keep-words is-none"><NoteGlyph /><span>sent without a note.</span></p>
      )}
    </figure>
  )
}

export default function Keepsake({
  me, them, p, names, first, seed, stamp, story, from = null, at = null,
  state = 'rest', enter = 'fade', fly = null, menu = null, standing = false,
  go, onGone, apiRef, escRef,
}) {
  const box = useRef(null)
  const strip = useRef(null)
  const mark = useRef(null)
  const theirs = useRef(null)
  const light = useRef(null)
  const lay = useRef(null)
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
  // phone is laid out again
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
    },
  }), [])

  // ── arriving ──
  // Out of the film: laid out and hidden while it plays, then unfolding out
  // of its mark as the film goes out over it, both notes waking on one frame
  // and the keys after (`landing`, mutual.css). Out of the slot, when the
  // film has been seen: the slot's glass flies to the mark and the phone
  // unfolds out of it the same way (`fly`). Otherwise it comes up where it
  // stands (`fade`), and under reduced motion that is all that moves.
  const [landing, setLanding] = useState(false)
  const unfold = () => {
    const el = strip.current
    const mk = mark.current
    if (!el || !mk || !el.animate) return
    const sr = el.getBoundingClientRect()
    const mr = mk.getBoundingClientRect()
    const inset = `inset(${mr.top - sr.top}px ${sr.right - mr.right}px ${sr.bottom - mr.bottom}px ${mr.left - sr.left}px)`
    el.animate([{ clipPath: inset }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: UNFOLD_MS, easing: EASE })
  }
  useLayoutEffect(() => {
    if (state !== 'landing') return
    unfold()
    setLanding(true)
    // the focus the film had (its keys, or the dialog) goes to their note
    const a = document.activeElement
    if (theirs.current && (!a || a === document.body || a.closest('.wl-film'))) theirs.current.focus({ preventScroll: true })
  }, [state])
  // arriving any other way, a reader starts on their note too, unless a
  // menu was asked for and has the focus already
  useEffect(() => {
    if (enter === 'film' || menu || !theirs.current) return
    theirs.current.focus({ preventScroll: true })
    // once, on arriving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // the slot's glass, flying to the mark: laid over where the mark is and
  // scaled down onto the slot, then let go to its own size
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
    const t = setTimeout(() => { unfold(); setLanding(true) }, 300)
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
  const back = () => setView(null)
  const n0 = names[0]
  const optionItems = [
    { t: `send ${n0} a new note`, run: () => go('ping', them) },
    { t: 'take it off my list', run: () => setView({ kind: 'confirm' }) },
  ]
  // The picture: first names only, or none; the notes unless they are left
  // off; the mark on the frame the keepsake is drawn still on
  const face = () => ({
    seed, stamp, names: first, notes: notesOn ? [p.theirLine || '', p.line || ''] : null,
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

  // ── the phone, as it stands ──
  const pos = (k, items) => `${Math.min(k.at || 0, items.length - 1) + 1}/${items.length}`
  let top = { stamp, bat: 4, pair: names }
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
    top = { stamp, bat: 4, name: view.kind, pos: pos(view, items) }
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
    keys = view.done ? { r: { label: 'ok', onClick: back, aria: 'back to the notes' } } : {}
  } else {
    keys = {
      l: {
        label: 'options', onClick: () => setView({ kind: 'options', at: 0 }),
        aria: `options: send ${n0} a new note, or take it off your list`,
      },
      r: {
        label: 'share', onClick: () => { if (story) prepareMutual(face()); setView({ kind: 'share', at: 0 }) },
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
  const cls = [
    'wl-keep', hidden && 'is-hidden', landing && 'is-landing', enter === 'fade' && !hidden && 'is-fading',
    enter === 'fly' && 'is-flying', view && 'is-over',
  ].filter(Boolean).join(' ')
  const phone = { ...SQUARE, '--q-hx': '50%', '--q-hy': `${spot.hy}%` }

  return (
    <div className={cls} ref={box} style={{ '--lx': `${spot.lx}px`, '--ly': `${spot.ly}px` }}>
      <span className="wl-keep-light" ref={light} aria-hidden="true" />
      <div className="wl-keep-strip" ref={strip} inert={hidden || undefined} aria-hidden={hidden || undefined}>
        <Screen look={LOOK} seed={seed} top={top} keys={keys} live={!hidden} className="wl-keep-scr" style={phone}>
          <div className="wl-keep-body">
            <Note who={names[0]} text={p.theirLine} size={words} side="theirs" innerRef={theirs} />
            <div className="wl-keep-mark" ref={mark}>
              {story ? (
                <PixelStory
                  story={story} crisp from={from} at={over ? paused.current : at}
                  onLayout={(l) => { lay.current = l }}
                />
              ) : null}
              {over ? <div className="wl-keep-over">{over}</div> : null}
            </div>
            <Note who={names[1]} text={p.line} size={words} side="yours" />
          </div>
        </Screen>
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


// ── /berkeley/letter/:id — THE LETTER ───────────────────────────────────────
//
// A cream card rising off the bottom edge over a wall that stays visible and
// dimmed behind it, and on a wide screen a card centred in the middle of it.
// Both come straight off the reference: the journal's paper card with its
// dateline, and the modal that dims what is behind it rather than replacing it.
//
// ── the rebalance, and what was actually wrong ──────────────────────────────
// The card was right and everything around it was not. Four things:
//
//   1  THE TOP WAS AN EMPTY ROW WITH ONE HEAVY OBJECT ON THE END OF IT. The
//      close mark floated alone above the card, the single darkest shape on the
//      screen, sitting on nothing. It is now one half of a real header — what
//      this sheet is about on the left, the way out on the right — and every
//      other sheet in the build opens on the same row (parts.jsx `SheetHead`).
//   2  THE CARD WAS DATED TWICE, IN TWO VOICES, IN TWO PLACES. "7. August 2026
//      / Friday" across the top rule, and "3 weeks ago" in a strip underneath.
//      Only one of those is a fact anybody wants about an unsent letter: an
//      unsent letter has no anniversary, and its weekday means nothing to the
//      person reading it. The relative age is the whole of it, so it moved onto
//      the rule and the absolute date is gone (data.js `sinceline`).
//   3  THE STRIP UNDER THE CARD WAS THREE UNRELATED THINGS AT ONE WEIGHT — a
//      constellation, a timestamp and a control, side by side, none of them
//      winning. The constellation went into the card as its letterhead, where
//      it stands beside the name it belongs to; the timestamp went onto the
//      rule; and the control went down to the foot with the other control.
//   4  "LETTERS OPEN FOR BERKELEY.EDU" WAS EXPLAINING A DOOR NOBODY HAD TRIED
//      YET. It sat above the button in the same grey as everything else and
//      earned none of the space it took. The card already says SEALED on its
//      own rule, which is the fact; the gate names the domain, which is the
//      consequence, at the moment somebody has decided to find out.
//
// What is left reads top to bottom in three steps at three weights: the header,
// the card, and the one thing to do. The flag for the one reader in twenty who
// came here to get something off the wall stands on the card itself, at the
// end of its foot, opposite the heart (below).
//
// ── who it is for ───────────────────────────────────────────────────────────
// The card opens on "for", the name the resolver has for the person, and the
// handle under it (parts.jsx `Addressee`), with their face beside it; the
// face can be pressed and opens large, the way a profile picture does on
// Instagram (parts.jsx `OpenFace`). It used to open on the handle alone, set
// large, which read as a card about a handle rather than a letter to a person.
//
// ── it opens out of the disc that was pressed ───────────────────────────────
// The wall leaves the circle of the disc behind on the way out (morph.js)
// and the card claims it on the way in: the letter's own card, with its words
// on it from the first frame, starts as that circle — the paper cut round,
// the whole card scaled to the disc — and opens out to where it stands, while
// the sheet's glass comes up under it and the header and the foot arrive a
// beat behind. One element, one transform, and the real card the whole way.
//
// A deep link, a refresh, a back button, a turn of the stack or a reader who
// has asked for less movement opens the ordinary way, because none of them
// has a circle to open out of.
//
// ── the deck, turned like a carousel ────────────────────────────────────────
// Every letter on the wall is one card in one deck, in the wall's own order:
// the names in the order the index carries them, newest first, and under each
// name its letters. So the card after the last letter under a name is the
// first letter under the next name, and a swipe can be kept up from one end
// of the wall to the other.
//
// The turn is a carousel, and the direction is the one a person expects from
// every carousel they have ever used. Swipe LEFT and the card goes left while
// the NEXT letter comes in from the right; swipe RIGHT and the card goes right
// while the PREVIOUS letter comes in from the left. The chevron on the right
// is the next letter and the one on the left is the previous, and the arrow
// keys do the same. It used to be a stack: the card flew off and the next
// rose from under it, and a turn back flew the card off to the right while
// the previous slid in from the left, which is two cards moving away from
// each other, and on the chevrons it read as the card being sent the wrong
// way. Now the two cards move together, as one strip, the whole way.
//
// The finger has the card. While it is down both neighbours stand beside the
// card, off the glass, and travel with it, so a drag shows the next letter
// arriving rather than a card leaving on its own. Let go past the threshold,
// or thrown, and the strip runs on to the neighbour; let go short, and it
// springs back. At either end of the deck, where there is nothing further,
// the card follows a fifth as far, which is how a thing says "no more".
//
// A turn is still a route change, so every letter keeps its own address. The
// strip moves first and the address changes once the neighbour has landed,
// silently: the leaf that takes over is the same card the neighbour slot was
// already showing, at the same place, so nothing on the glass changes on the
// swap. The next name's letters are asked for while this one is being read,
// so the neighbour has its words before it is ever pulled into view.
//
// ── the one place anything is asked for ─────────────────────────────────────
// The names are public and what was written under them is not. To a stranger
// this card arrives REDACTED — the real letter, at its real length, with every
// word struck out — and either of the product's proofs lifts it: a campus
// address, or a handle proved by the DM code (migration 0044). The first
// eight are free to anybody (0045, 0049) and are the server's count; nothing
// here draws a meter over a letter somebody is reading.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Paper, Prose, Redacted,
  Pill, ClosePill, Icon, Label, OpenFace, Addressee, Heart,
} from '../parts.jsx'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, normHandle,
  sinceline, atHandle, heart, wall, liveCount,
} from '../data.js'
import { mark, setAfterGate } from '../store.js'
import { cardStep } from '../seed.js'
import { isReader, toWrite } from '../auth.js'
import { land, locate } from '../morph.js'

// ── the hearts ──────────────────────────────────────────────────────────────
// The one thing a reader can do to a letter that is not writing, reporting or
// taking it down: press the heart, once, and see how many did. It sits in the
// paper's foot, under the words, struck in the paper's ink (parts.jsx
// `Heart`, wall.css `.wl-hearts`), because it is a mark on the document and
// not a control on the sheet. The count is a count and nothing else: no
// names ride with it, from the server or anywhere, and zero says nothing at
// all rather than "0", because an unhearted letter is not a letter that
// failed. Behind the same gate as reading: on a sealed letter the heart is
// the way to the gate, and the count still shows, since it is public the way
// the letter's shape is.
function Hearts({ letter: l, onGate }) {
  const [busy, setBusy] = useState(false)
  const mine = isReader()
  const n = l.hearts || 0
  const press = async () => {
    if (!mine) { onGate(); return }
    if (busy) return
    setBusy(true)
    await heart(l.id, !l.hearted)
    setBusy(false)
  }
  const said = n === 0 ? '' : String(n)
  return (
    <div className={`wl-hearts${l.hearted ? ' is-on' : ''}`}>
      <button
        type="button" className={`wl-heart${l.hearted ? ' is-on' : ''}`}
        onClick={press} disabled={busy}
        aria-pressed={mine ? l.hearted : undefined}
        aria-label={!mine ? 'sign in to heart this letter'
          : l.hearted ? 'take your heart off this letter' : 'heart this letter'}
      >
        <Heart size={18} on={l.hearted} />
      </button>
      <span className="wl-hearts-n" aria-live="polite" aria-label={n === 1 ? 'one heart' : n ? `${n} hearts` : undefined}>
        {said}
      </span>
    </div>
  )
}

// ── the swipe ───────────────────────────────────────────────────────────────
// How far a finger has to travel, or how fast, for the strip to run on rather
// than spring back; how much of the travel the card follows (all of it: a
// card that lags the finger is a card on a string); how much less it follows
// at the end of the deck; the room between the card and the one beside it;
// and how long the strip takes to run on, or to spring back.
const TURN_PX = 56
const TURN_V = 0.4         // px per ms
const FOLLOW = 1
const FOLLOW_END = 0.22
const SLOP = 6
const GAP = 24
const SLIDE_MS = 320
const SPRING_MS = 280
const EASE_SLIDE = 'cubic-bezier(0.32, 0.72, 0, 1)'

// ── the opening ─────────────────────────────────────────────────────────────
// How long the card takes to open out of the disc, on the travelling curve
// the sheets move on (wall.css --ease-sheet): a straight run through the
// middle and a settle over the last third, so the distance is actually
// crossed on the screen. The paper's corner is the card's own radius at the
// end and a circle's at the start. It starts on the frame of the press, so
// the whole of the wait between a finger and the words is this number; it
// was 560, and the words were readable before it finished, but a card that
// is still growing under a reader is a card they wait for.
const OPEN_MS = 440
const EASE_TRAVEL = 'cubic-bezier(0.32, 0.72, 0, 1)'
const RADIUS = 18          // wall.css --r-card
// ── and the closing ─────────────────────────────────────────────────────────
// How long the card takes to go back into its disc, on the same curve: it
// leaves quickly and settles onto the face, dissolving over the last part of
// the way so what is left on the field is the disc and not a small paper.
// Shorter than the opening: the system's answer to a dismissal snaps.
const CLOSE_MS = 340

// ── the address takes two shapes ────────────────────────────────────────────
// /berkeley/letter/<uuid>    one letter, which is what a shared link points at
// /berkeley/letter/<handle>  a name, which is what the wall and the search
//                            send somebody to, because a tile is a name
//
// They are not ambiguous: a handle is at most 30 characters of [a-z0-9._] and
// an id is a 36 character uuid with hyphens in it. Both land on the same
// screen, and the turn below always moves by id so every letter under a name
// still has its own address.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Where a neighbour stands, relative to the card, while the card is at `dx`.
const beside = (dir, dx, w) => dx + dir * (w + GAP)

// The leaf: the paper and the words, keyed per card so each arrival is its
// own element. It tells the screen when it is on the glass, before paint, so
// the strip can be put back to rest on the same frame the next card is
// drawn — which is the one moment that cannot be found from the screen's own
// render, since a render is not a commit.
function Leaf({ className, onMount, children }) {
  useLayoutEffect(() => { onMount() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={className}>{children}</div>
}

// The card, for one letter, or the waiting card for a name whose letters are
// still on their way. Drawn once here and used for the card on the glass and
// for the neighbours beside it, so what slides in is what lands.
function Card({ l, handle, seed, id, foot }) {
  if (!l) {
    /* `waiting`, not `shut`. They draw the same block of bars and they are
       not the same fact: a letter that has arrived shut is blurred, because
       it is a letter you are not close enough to, and a letter that has not
       arrived is neither shut nor open yet. */
    return (
      <Paper
        dateline={{ lead: 'reading' }}
        crest={handle ? <span className="wl-letter-crest"><OpenFace handle={handle} size={34} /></span> : null}
        title={<Addressee handle={handle || ''} id={id} />}
        tone="waiting"
      >
        <Redacted words={22} chars={110} seed={String(seed || handle || '')} />
      </Paper>
    )
  }
  const open = l.body !== null
  return (
    <Paper
      dateline={sinceline(l.at, open ? '' : 'sealed')}
      crest={<span className="wl-letter-crest"><OpenFace handle={l.to} size={34} /></span>}
      title={<Addressee handle={l.to} id={id} />}
      tone={open ? '' : 'shut'}
      foot={foot}
    >
      {open
        ? <Prose>{l.body}</Prose>
        : <Redacted words={l.words} chars={l.chars} seed={l.id} />}
    </Paper>
  )
}

export default function Letter({ id: param, go, back, reduce = false, rev = 0 }) {
  // Whether the flag has been opened. Nothing else on this sheet holds state:
  // the card is the server's, and this is one control deciding whether it is
  // showing itself or the two things it opens.
  const [flagged, setFlagged] = useState(false)
  // `silent` says the next address change is the strip landing on a
  // neighbour that is already on the glass, so the leaf that takes over
  // must not make an entrance. Declared up here because the render-phase
  // update below reads it.
  const silentRef = useRef(false)
  const byId = UUID.test(String(param || ''))
  const handle = byId ? null : normHandle(param)

  // ── which card this is ──
  // The address changes on every turn and on nothing else, so it is what
  // keys the leaf, and it is kept as state from the last render rather than
  // as a ref: a render can be thrown away without being committed, and a ref
  // moved during one of those leaves a key that has already changed by the
  // time the commit comes. The flag closes with the card it was opened on.
  //
  // Whether the leaf ARRIVES, with a beat of fade, or takes over silently is
  // decided here too, once, on the render that changes the key, and kept
  // with the key. It used to be read off `silent` on every render, and
  // `silent` is put back the moment the leaf lands (`landed`, below): the
  // next render, a frame later, found it false and put the fade on a card
  // that was already standing on the glass, which sent the card to nothing
  // and faded it back in. That was the flicker on every turn of the deck.
  const [seen, setSeen] = useState(param)
  const [leaf, setLeaf] = useState({ key: 0, fade: false })
  if (seen !== param) {
    setSeen(param)
    setLeaf({ key: leaf.key + 1, fade: !silentRef.current })
    setFlagged(false)
  }

  // ── the disc that was pressed ──
  // Claimed once, on the first render, and only ever there: the wall left a
  // circle behind on the way out of it (morph.js) and the card opens out of
  // that circle instead of the sheet rising over it. Nothing is claimed on a
  // deep link, a refresh or a back button, so all three open the ordinary
  // way. `flying` is the opening itself: while it is on, the sheet's glass
  // lets the card stand outside it.
  const [from] = useState(() => land(handle))
  const [flying, setFlying] = useState(() => !!from && !reduce)
  const cardBox = useRef(null)

  // The letters under a name, when that is what the address named.
  const forHandle = handle ? lettersFor(handle) : []
  const id = byId ? param : (forHandle[0]?.id || null)

  const one = byId
    ? letter(id)
    : (knowsHandle(handle) ? (forHandle[0] || null) : undefined)

  const name = one ? one.to : handle
  const siblings = one ? lettersFor(one.to) : forHandle
  const at = siblings.findIndex((l) => l.id === (one?.id || id))
  const of = siblings.length

  // ── the deck ──
  // The wall's index, in its own order, read when the corpus moves: which
  // name this is, how many letters stand before it, and what is either side
  // of this card. Past the end of a name the deck runs on to the next name's
  // first letter, and before its start to the last letter of the name before.
  const tiles = useMemo(() => wall(), [rev]) // eslint-disable-line react-hooks/exhaustive-deps
  const ti = name ? tiles.findIndex((t) => t.handle === name) : -1
  let before = 0
  for (let i = 0; i < ti; i++) before += tiles[i].count
  const total = ti >= 0 ? liveCount() : of
  const pos = (ti >= 0 ? before : 0) + Math.max(0, at)
  const nextTo = at >= 0 && at < of - 1 ? { id: siblings[at + 1].id }
    : ti >= 0 && tiles[ti + 1] ? { handle: tiles[ti + 1].handle, end: 'first' }
    : null
  const prevTo = at > 0 ? { id: siblings[at - 1].id }
    : ti > 0 ? { handle: tiles[ti - 1].handle, end: 'last' }
    : null

  // the neighbours' letters, asked for while this one is read, so a turn
  // onto another name lands on its card and not on a request
  const nextH = nextTo && nextTo.handle ? nextTo.handle : ''
  const prevH = prevTo && prevTo.handle ? prevTo.handle : ''
  useEffect(() => { if (nextH) loadHandle(nextH) }, [nextH])
  useEffect(() => { if (prevH) loadHandle(prevH) }, [prevH])

  // What stands either side: the letter itself when it has landed, and the
  // name's waiting card when it has not. The route a turn goes to is the
  // letter's own id when there is one, and the name when there is not, which
  // opens on its first letter the moment it lands.
  const cardBeside = (to) => {
    if (!to) return null
    if (to.id) return { l: letter(to.id) || null, handle: null, target: to.id }
    const ls = lettersFor(to.handle)
    const l = ls.length ? (to.end === 'last' ? ls[ls.length - 1] : ls[0]) : null
    return { l, handle: to.handle, target: l ? l.id : to.handle }
  }
  const prevCard = cardBeside(prevTo)
  const nextCard = cardBeside(nextTo)

  // ── the strip ──
  // `move` is what the strip is doing: nothing, following a finger, or
  // running on to a neighbour. While it is anything, the neighbours stand
  // beside the card, and every position is written straight to the three
  // elements from the gesture rather than through a render. `dx` is where
  // the card is, and `silent` says the next leaf is the neighbour that was
  // already on the glass, so it takes over without an entrance.
  const [move, setMove] = useState(null)   // null · { kind: 'drag'|'slide', dir?, w }
  const prevSlot = useRef(null)
  const nextSlot = useRef(null)
  const track = useRef(null)
  const dx = useRef(0)
  // the card's height when the strip started to move, which is where the
  // track's height is measured from while it moves
  const hBase = useRef(0)
  const silent = silentRef
  const busy = useRef(false)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const after = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }

  const place = (x, w, transition, ms = 0) => {
    dx.current = x
    const set = (el, v) => {
      if (!el) return
      el.style.transition = transition
      el.style.transform = `translate3d(${v.toFixed(1)}px, 0, 0)`
    }
    set(cardBox.current, x)
    set(prevSlot.current, beside(-1, x, w))
    set(nextSlot.current, beside(1, x, w))
    // ── the height goes with the strip ──
    // A short letter beside a long one is a card beside a taller card, and
    // the glass used to take the new height on the frame the address
    // changed: everything under the card jumped. The track's height follows
    // the strip instead, from this card's height toward the neighbour's by
    // how far the strip has gone, so the sheet is seen to grow or shrink
    // with the finger, and a turn from a chevron carries its height on the
    // same clock as its travel. It finishes where the next card stands, and
    // the next card takes over at exactly that height (`rest`).
    const tr = track.current
    if (tr) {
      const h0 = hBase.current
      const side = x < 0 ? nextSlot.current : x > 0 ? prevSlot.current : null
      const h1 = side ? side.offsetHeight : h0
      const f = Math.min(1, Math.abs(x) / (w + GAP))
      tr.style.transition = ms ? `height ${ms}ms ${EASE_SLIDE}` : 'none'
      if (h0) tr.style.height = `${(h0 + (h1 - h0) * f).toFixed(1)}px`
    }
    // a style flush, so a neighbour that has just been put on the glass has
    // a place to move FROM: a transition set on an element that has never
    // been styled does not run, it arrives
    if (transition === 'none' && cardBox.current) void cardBox.current.offsetWidth
  }
  const rest = () => {
    for (const el of [cardBox.current, prevSlot.current, nextSlot.current]) {
      if (el) { el.style.transition = ''; el.style.transform = '' }
    }
    if (track.current) { track.current.style.transition = ''; track.current.style.height = '' }
    hBase.current = 0
    dx.current = 0
  }
  const measure = () => { hBase.current = cardBox.current ? cardBox.current.offsetHeight : 0 }
  // The neighbours are put beside the card before they are painted.
  useLayoutEffect(() => {
    if (!move) return
    place(dx.current, move.w, 'none')
  }, [move])

  const width = () => (cardBox.current && cardBox.current.offsetWidth) || 360

  // Run on to the neighbour in `dir` (1 next, -1 previous), from wherever
  // the finger left the card, then change the address once it has landed.
  const slide = (dir, fromX = 0) => {
    if (busy.current) return
    const side = dir > 0 ? nextCard : prevCard
    if (!side) return
    const w = width()
    if (reduce) { silent.current = true; go('letter', side.target); return }
    busy.current = true
    dx.current = fromX
    if (!hBase.current) measure()
    setMove((m) => (m && m.kind === 'drag' ? { ...m, kind: 'slide', dir } : { kind: 'slide', dir, w }))
    requestAnimationFrame(() => {
      place(-dir * (w + GAP), w, `transform ${SLIDE_MS}ms ${EASE_SLIDE}`, SLIDE_MS)
    })
    after(SLIDE_MS + 20, () => {
      silent.current = true
      busy.current = false
      go('letter', side.target)
    })
  }
  const slideRef = useRef(slide)
  slideRef.current = slide

  // Let go short of the threshold: the strip springs back to rest.
  const spring = () => {
    if (!move && Math.abs(dx.current) < 0.5) { rest(); return }
    busy.current = true
    place(0, width(), `transform ${SPRING_MS}ms ${EASE_SLIDE}`, SPRING_MS)
    after(SPRING_MS + 20, () => { busy.current = false; rest(); setMove(null) })
  }

  // The leaf that has just arrived takes the glass: the strip is put back
  // to rest before paint, and the neighbours go, so the card the neighbour
  // slot was showing is now the card, in the same place, with nothing seen
  // to change.
  const landed = () => {
    rest()
    if (silent.current) { silent.current = false; setMove(null) }
  }

  // The arrow keys turn the deck, on a keyboard. Not while a sheet is being
  // typed into, and there is nothing to type into here.
  const canTurn = !!(nextTo || prevTo)
  useEffect(() => {
    if (!canTurn) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); slideRef.current(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); slideRef.current(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canTurn])

  // ── the swipe ──
  // A finger on the card takes the strip sideways. The axis is decided on
  // the first few pixels and a vertical drag is handed back to the sheet at
  // once, so the card can still be scrolled past on a long phone;
  // `touch-action: pan-y` on the stage says the same thing to the browser.
  // A mouse does not swipe: on a desktop the chevrons and the arrow keys
  // turn the deck, and a drag over a letter selects its words.
  const drag = useRef(null)
  const onDown = (e) => {
    if (e.pointerType === 'mouse' || busy.current || !canTurn) return
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, axis: '', w: width() }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const x = e.clientX - d.x
    const y = e.clientY - d.y
    if (!d.axis) {
      if (Math.abs(x) < SLOP && Math.abs(y) < SLOP) return
      d.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'
      if (d.axis === 'y') { drag.current = null; return }
      // the neighbours come to stand beside the card, and the height the
      // strip starts from is this card's
      measure()
      setMove({ kind: 'drag', w: d.w })
    }
    const end = (x < 0 && !nextTo) || (x > 0 && !prevTo)
    d.dx = x * (end ? FOLLOW_END : FOLLOW)
    place(d.dx, d.w, 'none')
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    const v = d.dx / Math.max(1, performance.now() - d.t)
    const dir = d.dx < 0 ? 1 : -1
    const to = dir > 0 ? nextTo : prevTo
    if (to && (Math.abs(d.dx) > TURN_PX || Math.abs(v) > TURN_V)) slide(dir, d.dx)
    else spring()
  }
  const onCancel = () => { drag.current = null; spring() }
  const swipe = canTurn
    ? { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel }
    : null

  // The letter, then the rest of its handle's letters for the turn. Two
  // requests rather than one, because a person who opened a link off a card
  // wants the letter on screen before the stack exists.
  useEffect(() => { if (byId) loadLetter(param) }, [byId, param])
  useEffect(() => { if (handle) loadHandle(handle) }, [handle])
  useEffect(() => { if (one) loadHandle(one.to) }, [one])

  // The first step off the scan: a letter was opened. `mark` dims the tile on
  // the wall behind this sheet; `step` is what says the card that produced this
  // visit got somebody as far as reading something (migration 0047), once per
  // device however many letters they go on to open.
  useEffect(() => {
    if (!one) return
    mark('opened', one.id)
    cardStep('read')
  }, [one])

  // ── the opening ──
  // Before the first paint: the card is measured where it stands, and one
  // transform puts it where the disc was, at the disc's size, with the
  // paper's corner a circle's; then both run out to nothing on the travelling
  // curve. The card is the real card the whole way, words and all, so if the
  // letter lands mid-flight it lands on the card that is opening, and the
  // sheet under it comes up as glass rather than rising (wall.css
  // `.is-from-disc`).
  useLayoutEffect(() => {
    if (!from || reduce) return undefined
    const el = cardBox.current
    if (!el || !el.animate) { setFlying(false); return undefined }
    const paper = el.querySelector('.wl-paper') || el
    const c = el.getBoundingClientRect()
    if (!c.width || !c.height) { setFlying(false); return undefined }
    const s = Math.max(0.05, from.w / c.width)
    const ox = from.x + from.w / 2 - (c.left + c.width / 2)
    const oy = from.y + from.h / 2 - (c.top + c.height / 2)
    const a = el.animate([
      { transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${s.toFixed(4)})` },
      { transform: 'none' },
    ], { duration: OPEN_MS, easing: EASE_TRAVEL, fill: 'backwards' })
    const b = paper.animate([
      { borderRadius: '50%' },
      { borderRadius: '50%', offset: 0.2 },
      { borderRadius: `${RADIUS}px` },
    ], { duration: OPEN_MS, easing: EASE_TRAVEL, fill: 'backwards' })
    let over = false
    const end = () => { if (over) return; over = true; setFlying(false) }
    a.onfinish = end
    // a tab that goes to the background stops handing out frames, and a
    // sheet left with its glass open is worse than no opening at all
    const bail = setTimeout(end, OPEN_MS + 300)
    return () => {
      clearTimeout(bail)
      try { a.cancel(); b.cancel() } catch { /* gone */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── the way out, back into the disc ──
  // Closed by the mark, the scrim or the key, the card goes back to the disc
  // of the name it is showing, if that disc is on the glass: the same
  // transform the opening ran, the other way, with the paper's corner going
  // round and the card dissolving over the last part of the way, while the
  // glass fades in place instead of dropping (wall.css `.is-to-disc`) and
  // the wall's light comes back under it. Dragged down, the sheet falls the
  // way every sheet falls, and with no disc to go to it drops. The disc is
  // asked for on the way out and not remembered from the way in, because the
  // deck may have been turned to another name since.
  const [leaving, setLeaving] = useState(false)
  const closing = (by) => {
    if (by === 'drag' || reduce) return
    const el = cardBox.current
    const to = locate(name)
    if (!el || !to || !el.animate) return
    const paper = el.querySelector('.wl-paper') || el
    const c = el.getBoundingClientRect()
    if (!c.width || !c.height) return
    const s = Math.max(0.05, to.w / c.width)
    const ox = to.x + to.w / 2 - (c.left + c.width / 2)
    const oy = to.y + to.h / 2 - (c.top + c.height / 2)
    el.animate([
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.5 },
      { transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${s.toFixed(4)})`, opacity: 0 },
    ], { duration: CLOSE_MS, easing: EASE_TRAVEL, fill: 'forwards' })
    paper.animate([
      { borderRadius: `${RADIUS}px` },
      { borderRadius: '50%', offset: 0.7 },
      { borderRadius: '50%' },
    ], { duration: CLOSE_MS, easing: EASE_TRAVEL, fill: 'forwards' })
    setLeaving(true)
  }

  // A letter that was here a moment ago and is not now. It is not an error and
  // it is not framed as one: a report takes a letter down on the tap, and the
  // most likely way somebody lands here is by walking back to one they or
  // somebody else just took off the wall.
  //
  // `undefined` is "not asked yet" and `null` is "asked, and it is gone". The
  // card waits rather than announcing a removal that has not happened.
  if (one === null) {
    return (
      <Sheet onClose={back} labelledBy="wl-letter-h">
        <div className="wl-sheet-in wl-letter">
          <SheetHead onClose={back} label="back to the wall" />
          <Paper
            dateline={{ lead: 'not on the wall' }}
            title={<span id="wl-letter-h" className="wl-letter-to">gone</span>}
          >
            <Prose>That letter has come down.</Prose>
          </Paper>
          <SheetFoot>
            <ClosePill tone="light" wide onClose={back}>back to the wall</ClosePill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const open = !!one && one.body !== null
  const pager = at >= 0 && total > 1
    ? <Label tone="dim" className="wl-pager" aria-label={`letter ${pos + 1} of ${total}`}>{pos + 1} / {total}</Label>
    : null
  const toGate = () => { if (one) setAfterGate({ name: 'letter', id: one.id }); go('gate') }

  // ── the two marks a reader can leave ──
  // The heart at the head of the foot and the flag at its end, both struck in
  // the paper's ink, because both are marks on the document rather than
  // controls on the sheet. A flag is left ON a thing, so it stands in the
  // card's corner, the size of the heart beside it rather than of a button.
  const marks = (l, live) => (
    <div className="wl-letter-marks">
      <Hearts letter={l} onGate={toGate} />
      <button
        type="button" className={`wl-flag${live && flagged ? ' is-on' : ''}`}
        onClick={live ? () => setFlagged(!flagged) : undefined}
        aria-expanded={live ? flagged : undefined}
        aria-controls={live ? 'wl-flag-opts' : undefined}
        aria-label="take this off the wall" title="take this off the wall"
        tabIndex={live ? undefined : -1}
      >
        <Icon name="flag" size={15} />
      </button>
    </div>
  )
  // a neighbour beside the card, off the glass, drawn as the card it is
  const slot = (side, dir, ref) => side ? (
    <div className="wl-letter-slot" ref={ref} aria-hidden="true" data-side={dir > 0 ? 'next' : 'prev'}>
      <Card l={side.l} handle={side.handle} seed={side.target} foot={side.l ? marks(side.l, false) : null} />
    </div>
  ) : null
  const showPrev = move && (move.kind === 'drag' || move.dir < 0)
  const showNext = move && (move.kind === 'drag' || move.dir > 0)
  // an arrival that is not the strip landing: a back button, a link. A
  // beat of fade, and none at all on the first leaf, which is the sheet's.
  // Decided with the key (above), so it cannot change under a leaf that is
  // already on the glass.
  const came = leaf.fade ? ' is-arrived' : ''

  return (
    /* Not `tall`. The floor exists so a bottom sheet does not read as a
       notification, and this one is never small: a card, a full-width pill and
       two controls. */
    <Sheet
      onClose={back} onClosing={closing} labelledBy="wl-letter-to"
      className={`${from ? `is-from-disc${flying ? ' is-flying' : ''}` : ''}${leaving ? ' is-to-disc' : ''}`}
    >
      <div className="wl-sheet-in wl-letter">
        <SheetHead onClose={back} label="back to the wall" lead={pager} />

        {/* ── the card, and the two ways past it ──
            One object, carrying everything true about the letter: how long it
            has been up, whether it is shut, who it is for, and the words.
            Either side of it, in the gutters, a chevron to the letter before
            and the one after; the card itself takes the finger; and while it
            is moving the neighbours stand beside it on the same strip, clipped
            at the sheet's edge (wall.css `.wl-letter-track`). */}
        <div
          className={`wl-letter-stage${flying || leaving ? '' : ' is-landed'}${move ? ' is-moving' : ''}`}
          {...swipe}
        >
          {canTurn ? (
            <button
              type="button" className="wl-turn is-prev" disabled={!prevTo}
              onClick={() => slide(-1)} aria-label="the letter before this one" title="the letter before"
            >
              <Icon name="back" size={16} />
            </button>
          ) : null}
          <div className="wl-letter-track" ref={track}>
            {showPrev ? slot(prevCard, -1, prevSlot) : null}
            <div className="wl-letter-card" ref={cardBox}>
              <Leaf className={`wl-letter-leaf${came}`} key={leaf.key} onMount={landed}>
                <Card
                  l={one || null} handle={one ? null : handle} seed={String(param)}
                  id="wl-letter-to" foot={one ? marks(one, true) : null}
                />
              </Leaf>
            </div>
            {showNext ? slot(nextCard, 1, nextSlot) : null}
          </div>
          {canTurn ? (
            <button
              type="button" className="wl-turn is-next" disabled={!nextTo}
              onClick={() => slide(1)} aria-label="the letter after this one" title="the letter after"
            >
              <Icon name="back" size={16} />
            </button>
          ) : null}
        </div>

        {/* ── the foot ──
            One primary, and while the flag is on, the two things somebody who
            came looking for THEMSELVES needs, standing where the primary was:
            one pane of glass, two rows in it, each a glyph, the act and what
            it does in one line, so the reversible act and the irreversible
            one are told apart before either is pressed. The fast door first.
            While the words are still on their way the foot holds its height
            with nothing on it, so the card does not move when they land. */}
        <SheetFoot>
          {!one ? (
            <div className="wl-foot-hold" aria-hidden="true" />
          ) : flagged ? (
            <div className="wl-acts" id="wl-flag-opts">
              <div className="wl-acts-pane" role="group" aria-label="take this off the wall">
                <button type="button" className="wl-act" onClick={() => go('report', one.id)}>
                  <span className="wl-act-glyph" aria-hidden="true"><Icon name="flag" size={16} /></span>
                  <span className="wl-act-text">
                    <span className="wl-act-h">Report this letter</span>
                    <span className="wl-act-say">it comes off the wall now, and a person reads it after.</span>
                  </span>
                  <span className="wl-act-go" aria-hidden="true"><Icon name="back" size={14} /></span>
                </button>
                <button type="button" className="wl-act" onClick={() => go('remove', one.to)}>
                  <span className="wl-act-glyph" aria-hidden="true"><Icon name="signout" size={16} /></span>
                  <span className="wl-act-text">
                    <span className="wl-act-h">Take my name off the wall</span>
                    <span className="wl-act-say">if {atHandle(one.to)} is you. every letter to it comes off, and stays off.</span>
                  </span>
                  <span className="wl-act-go" aria-hidden="true"><Icon name="back" size={14} /></span>
                </button>
              </div>
              <button type="button" className="wl-quiet" onClick={() => setFlagged(false)}>leave it up</button>
            </div>
          ) : open ? (
            <Pill tone="light" wide onClick={() => toWrite(go, one.to)}>
              write to {atHandle(one.to)}
            </Pill>
          ) : (
            /* The gate. It names no policy and gives no reasons: the card
               beside it already says SEALED, and a person who has not decided
               to open it does not need the argument for why it is shut. */
            <Pill tone="light" wide onClick={toGate}>
              read it
            </Pill>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

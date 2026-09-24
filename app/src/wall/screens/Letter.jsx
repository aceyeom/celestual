// ── /berkeley/letter/:id — THE LETTER ───────────────────────────────────────
//
// The card, in the middle of the glass, over a wall that stays visible and
// dimmed behind it. Nothing else: no sheet under it, no header row over it,
// no count, no pill. One mark in the corner of the glass is the way out, and
// the two chevrons in the gutters turn the deck.
//
// ── why it is centred, and why the chrome came off ──────────────────────────
// It was a bottom sheet with a header row (`1 / 23` and the close mark), the
// card, and a wide pill under the card reading "write to @them". A bottom
// sheet takes the card's own height, so a short letter stood low on the glass
// and a long one high, and a swipe from one to the other moved the card under
// the eye; the count over it answered a question nobody reading a letter was
// asking; and the pill under it was a plate the width of the screen under a
// letter that had already said everything. Centred, a card of any height is
// read from the same place, and the one act the pill carried is a mark on
// the paper's foot beside the heart, the size of the heart, in the paper's
// ink (`marks`, below).
//
// ── how it opens ────────────────────────────────────────────────────────────
// It rises a little and fades in, on the system's own curve, and goes the same
// way (wall.css `wl-letter-in`). It used to open OUT of the disc that was
// pressed: the wall handed the disc's circle across, the card was put where
// the disc was at the disc's size with the paper's corner a circle's, and one
// transform ran it out to where it stands while the corner unrolled. That was
// a border radius and a transform animating on the real card, words and all,
// over a sheet with a backdrop blur under it, and it dropped frames on every
// phone it was tried on. The pulse the press sends through the crowd stays
// (Hive.jsx `tapAt`): the wall still answers the touch, under the glass.
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
// keys do the same.
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
//
// ── and the shut card says what shut it (`sealSay`) ─────────────────────────
// It did not, for a while, and the argument for that was that the card
// already says SEALED and a person who has not decided to open it does not
// need the argument for why it is shut. That holds for somebody who arrived
// at a shut letter. It does not hold for the person this actually happens
// to: they read eight whole letters, were told nothing about eight, and then
// watched the ninth arrive with its words struck out and one capsule under
// it reading "read it". A blur nobody was warned about reads as a fault in
// the page, and the capsule under it reads as the fault's retry. So the seal
// says the two facts of that moment and stops: the free ones are behind
// them, and which door opens the rest. It is the server's count and not this
// browser's, and the first half of it is not said at all when the desk has
// the free reads switched off (0052), because there was then never a free
// one to have spent.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, SheetFoot, Pill, Close, Icon, Brand, ArrowLink, useProfile, useSheet,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, RoomLight } from '../screen.jsx'
import { colourOf, chargeOf, dateOf } from '../looks.js'
import { shareLetter, prepareLetter, letterFace, starred, canShare, isReady } from '../share.js'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, targetKey, isNameKey,
  atHandle, nameFor, normHandle, heart, wall, freeReads,
} from '../data.js'
import { href } from '../router.js'
import { mark, setAfterGate } from '../store.js'
import { cardStep } from '../seed.js'
import { isReader, toWrite } from '../auth.js'
import { campus, needsCampus } from '../campus.js'

// ── the name on the screen ──────────────────────────────────────────────────
// The top row carries who the letter is for the way a phone carried the
// contact a draft was going to: the first name, when the resolver has one,
// and otherwise the handle. A first name (0053) is itself.
function useFirst(to) {
  const named = isNameKey(to)
  const p = useProfile(named ? '' : to)
  if (!to) return ''
  if (named) return nameFor(to) || String(to).slice(1)
  const n = p && p.name ? String(p.name).trim().split(/\s+/)[0] : ''
  return n || normHandle(to)
}

// ── the close ──
function LetterX({ label }) {
  const sheet = useSheet()
  return <Close className="wl-letter-x" onClick={() => sheet && sheet.dismiss('mark')} label={label} />
}

// ── a letter reached from a link ────────────────────────────────────────────
// Somebody sent this person a link and this letter is the first of the
// product they have seen: a screen, a close mark, and a black room, which
// read as a confessions page anybody could be running. So a letter opened
// that way (`cold`, index.jsx) signs itself the way every bar in the product
// does: the mark and the word, small, in the corner opposite the close mark,
// in the room's own hand (DESIGN.md 3.6 and 2.6), and under the card one line
// that says what else is here, `view the wall`. Both go to the wall and land
// on the names, not on the poster (screens/Wall.jsx `open`). The close mark
// keeps doing what it does. A letter opened from the wall carries neither:
// the person already knows whose wall they are on.
function wallClick(e, sheet, onWall) {
  // a click that asks for a new tab or a window keeps the anchor's own way
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  onWall()
  if (sheet) sheet.dismiss('wall')
}
function LetterBrand({ onWall }) {
  const sheet = useSheet()
  return (
    <Brand
      className="wl-letter-brand is-small" mark={19} href={href('wall')}
      label="celestual, the wall" title="the wall"
      onClick={(e) => wallClick(e, sheet, onWall)}
    />
  )
}
function ViewWall({ onWall }) {
  const sheet = useSheet()
  return (
    <ArrowLink size="s" tone="quiet" className="wl-letter-out" href={href('wall')} onClick={(e) => wallClick(e, sheet, onWall)}>
      view the wall
    </ArrowLink>
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

// How far a neighbour's centre stands from the card's, for a screen `w`
// wide. It rests just past the edge of the glass and never in the room: on
// a phone that is the screen and the gap, as it always was, and in a wide
// room it is half the window and half the screen.
const span = (w) => Math.max(w + GAP, (document.documentElement.clientWidth + w) / 2 + 6)
// Where a neighbour stands, relative to the card, while the card is at `dx`.
const beside = (dir, dx, w) => dx + dir * span(w)

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
// ── one letter, as its screen ───────────────────────────────────────────────
// What the phone shows depends on `view`: the letter itself, the options
// menu, the share menu, or a note ("shared", "saved"). Only the live card
// has a view of its own; the neighbours on the strip are always the letter.
//
//   the letter   options · the heart and its count · share
//   a menu       select · back
//   a note       ok
//
// The right key said `send` until the composer's own act said `send
// anonymously`: one word for putting a letter up and for passing one on is a
// word somebody has to stop and read twice. `send` is the writer's; passing a
// letter on is `share`, and the menu the key opens says so in its top row.
//
// The heart is the reader's one mark that is not writing or reporting: once
// per person, the count is a count and nothing else, and zero says nothing
// rather than "0". Behind the same gate as reading, so on a letter from
// outside it the heart is the way to the gate.
function LetterScreen({ l, handle, seed, id, live = false, view = null, onView, go, toGate, woke = '' }) {
  const to = l ? l.to : handle
  const first = useFirst(to)
  const [busy, setBusy] = useState(false)
  const [, drawn] = useState(0)
  const at = view || { kind: 'letter' }
  const h = to && !isNameKey(to) ? atHandle(to) : ''
  // who it is to, as the screen says it: "dear" and the first name, with
  // the handle beside it, or "dear" and the handle alone where the resolver
  // has no name, so the row never says the handle twice
  const plain = !!h && first === normHandle(to)
  const toName = plain ? h : first
  const toHandle = plain ? '' : h
  const back = () => onView && onView(null)

  // The shared picture, drawn as the share menu opens, whose `to someone…`
  // says `to someone` once it is there (share.js `prepareLetter`). Not ahead
  // of that: drawing it holds a phone for most of a second, which is a stall
  // in the turn when it lands on a letter only passed through
  const sharing = live && !!l && !!view && view.kind === 'share'
  useEffect(() => {
    if (!sharing) return undefined
    let alive = true
    prepareLetter(letterFace(l, { name: toName, handle: toHandle })).then(() => { if (alive) drawn((n) => n + 1) })
    return () => { alive = false }
  }, [sharing, l && l.id, l && l.body != null, l && l.hearts, l && l.hearted, toName, toHandle]) // eslint-disable-line react-hooks/exhaustive-deps
  // whether this letter is still the one on the glass, so what a tap
  // answers late (a picture drawn, a file saved) is not put on the next
  const here = useRef(true)
  useEffect(() => { here.current = true; return () => { here.current = false } }, [])

  if (!l) {
    /* `waiting`: the screen is on and nothing has arrived on it yet, which is
       neither shut nor open, so it is only the lit glass */
    return (
      <Screen seed={String(seed || handle || '')} look={null} top={{ name: toName, handle: toHandle, dear: true, icon: 'pen' }} live={false} nameId={id}>
        <ScreenText text="" />
      </Screen>
    )
  }

  const open = l.body !== null
  const text = open ? l.body : starred(l.words, l.chars, l.id)
  const hearts = l.hearts || 0

  const pressHeart = async () => {
    if (!isReader()) { toGate(); return }
    if (busy) return
    setBusy(true)
    await heart(l.id, !l.hearted)
    setBusy(false)
  }

  const optionItems = [
    ...(open
      ? [{ t: `write to ${first || 'them'}`, run: () => toWrite(go, l.to) }]
      : [{ t: 'read it', run: toGate }]),
    { t: 'report this letter', run: () => go('report', l.id) },
    /* A first name is nobody's to empty: forty people share it, and no
       handle proof can stand for it (0053). */
    ...(isNameKey(l.to) ? [] : [{ t: 'take my name off', run: () => go('remove', l.to) }]),
  ]
  const face = () => letterFace(l, { name: toName, handle: toHandle })
  // Under a menu titled `share`, the row that opens the phone's own share
  // sheet says where it goes rather than `share` a second time
  const shareItems = [
    ...(canShare() ? [{ t: isReady(face()) ? 'to someone' : 'to someone…', how: 'share' }] : []),
    { t: 'save the picture', how: 'save' },
    { t: 'copy the link', how: 'copy' },
  ]
  const pass = async (how) => {
    // a phone opens the share sheet only inside the tap that asked, so a
    // tap before the picture is drawn waits for it and puts the menu back,
    // and the next tap shares the file
    if (how === 'share' && !isReady(face())) {
      onView({ kind: 'note', glyph: 'env', title: 'drawing it' })
      const b = await prepareLetter(face())
      if (!here.current) return
      onView(b ? { kind: 'share', at: 0 } : { kind: 'note', glyph: '', title: 'it did not go', text: 'try again', done: true })
      return
    }
    // otherwise the sheet is asked for before anything is awaited, with the
    // picture drawn ahead (`prepareLetter`)
    const going = shareLetter(how, face(), `${window.location.origin}${href('letter', l.id)}`)
    onView({ kind: 'note', glyph: 'env', title: { share: 'sharing', save: 'saving', copy: 'copying' }[how] || 'sharing' })
    const out = await going
    if (!here.current) return
    if (out === 'left') { onView(null); return }
    const said = {
      shared: ['check', 'shared'], saved: ['check', 'saved'], copied: ['check', 'link copied'],
    }[out] || ['', 'it did not go', 'try again']
    onView({ kind: 'note', glyph: said[0], title: said[1], text: said[2] || '', done: true })
  }

  // the letter's own status rows, kept under a note, so the band is never
  // an empty strip and the sheet keeps its name
  const letterTop = {
    name: toName, handle: toHandle, dear: true,
    icon: open ? 'pen' : 'lock',
    date: dateOf(l.at), counter: `${280 - (open ? l.body.length : l.chars || 0)}/1`, bat: chargeOf(l.at),
  }
  let top
  let body
  let keys
  if (at.kind === 'options' || at.kind === 'share') {
    const items = at.kind === 'options' ? optionItems : shareItems
    const pick = (j) => {
      const it = items[j]
      if (!it) return
      if (it.how) pass(it.how)
      else { onView(null); it.run() }
    }
    // the menu's name, and where in it the chosen row is, on the right of
    // the second row, the way the phone counted them
    const sel = Math.min(at.at || 0, items.length - 1)
    top = { name: at.kind, pos: `${sel + 1}/${items.length}`, icon: '', date: dateOf(l.at), bat: chargeOf(l.at) }
    body = (
      <ScreenMenu
        items={items.map((x) => x.t)} at={sel}
        onAt={(j) => onView({ ...at, at: j })} onPick={pick} label={at.kind}
        onBack={back}
      />
    )
    keys = {
      l: { label: 'select', onClick: () => pick(sel), aria: `select ${items[sel]?.t || ''}` },
      r: { label: 'back', onClick: back, aria: 'back to the letter' },
    }
  } else if (at.kind === 'note') {
    top = letterTop
    body = <ScreenNote glyph={at.glyph} title={at.title}>{at.text || null}</ScreenNote>
    keys = at.done ? { l: { label: 'ok', onClick: back, aria: 'back to the letter' } } : {}
  } else {
    top = letterTop
    body = <ScreenText text={text} sealed={!open} />
    keys = {
      l: { label: 'options', onClick: () => onView({ kind: 'options', at: 0 }), aria: open ? 'options: write to them, report' : 'options: read it, report' },
      c: {
        glyph: l.hearted ? 'heart' : 'heartO', label: hearts ? String(hearts) : '',
        onClick: pressHeart, disabled: busy, on: l.hearted,
        pressed: isReader() ? !!l.hearted : undefined,
        aria: !isReader() ? 'sign in to heart this letter'
          : `${l.hearted ? 'take your heart off this letter' : 'heart this letter'}${hearts ? `, ${hearts === 1 ? 'one heart' : `${hearts} hearts`}` : ''}`,
      },
      r: { label: 'share', onClick: () => { prepareLetter(face()); onView({ kind: 'share', at: 0 }) }, aria: 'share this letter, save its picture, or copy its link' },
    }
  }
  return (
    <Screen
      look={l.look} seed={l.id} top={top} keys={keys} live={live}
      state={woke} nameId={id}
      className={open ? '' : 'is-shut'}
    >
      {body}
    </Screen>
  )
}

function sealSay() {
  const free = freeReads()
  const spent = !!free && free.limit > 0 && free.left <= 0
  const opens = needsCampus()
    ? `sign in with ${campus().place} to read the whole wall.`
    : 'sign in to read the whole wall.'
  return spent ? `you have read the free ones. ${opens}` : opens
}

export default function Letter({
  id: param, go, up, upLabel = 'back to the wall', reduce = false, rev = 0,
  cold = false, toWall = null, pushWall = null,
}) {
  // Where the sheet lands once it has gone: the way it was opened FROM, as
  // every sheet does, unless it was left by the way to the wall, which lands
  // on a wall entry of its own (index.jsx `pushWall`).
  const via = useRef('up')
  const leave = useCallback(() => {
    if (via.current === 'wall' && pushWall) pushWall()
    else up()
  }, [pushWall, up])
  const onWall = useCallback(() => {
    via.current = 'wall'
    if (toWall) toWall()
  }, [toWall])
  const aside = cold
    ? <><LetterBrand onWall={onWall} /><LetterX label={upLabel} /></>
    : <LetterX label={upLabel} />
  const wrap = `is-letter${cold ? ' is-cold' : ''}`
  // What the live screen is showing: the letter (null), a menu, or a note.
  // Nothing else on this sheet holds state: the letter is the server's.
  const [view, setView] = useState(null)
  // The screen wakes once, on the first letter the sheet opens on, the way a
  // phone's backlight comes up; a turn does not wake it again.
  const [woke, setWoke] = useState('waking')
  useEffect(() => {
    if (reduce) { setWoke(''); return undefined }
    const t = setTimeout(() => setWoke(''), 950)
    return () => clearTimeout(t)
  }, [reduce])
  // `silent` says the next address change is the strip landing on a
  // neighbour that is already on the glass, so the leaf that takes over
  // must not make an entrance. Declared up here because the render-phase
  // update below reads it.
  const silentRef = useRef(false)
  const byId = UUID.test(String(param || ''))
  // a handle, or a first name's tilde key (0053): the same address either way
  const handle = byId ? null : targetKey(param)

  // ── which card this is ──
  // The address changes on every turn and on nothing else, so it is what
  // keys the leaf, and it is kept as state from the last render rather than
  // as a ref: a render can be thrown away without being committed, and a ref
  // moved during one of those leaves a key that has already changed by the
  // time the commit comes. A menu closes with the card it was opened on.
  //
  // Whether the leaf ARRIVES, with a beat of fade, or takes over silently is
  // decided here too, once, on the render that changes the key, and kept
  // with the key.
  const [seen, setSeen] = useState(param)
  const [leaf, setLeaf] = useState({ key: 0, fade: false })
  if (seen !== param) {
    setSeen(param)
    setLeaf({ key: leaf.key + 1, fade: !silentRef.current })
    setView(null)
  }
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
  // name this is, and what is either side of this card. Past the end of a
  // name the deck runs on to the next name's first letter, and before its
  // start to the last letter of the name before.
  const tiles = useMemo(() => wall(), [rev]) // eslint-disable-line react-hooks/exhaustive-deps
  const ti = name ? tiles.findIndex((t) => t.handle === name) : -1
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
  // the frame a turn starts the strip on, kept so a late one can be put off
  const frame = useRef(0)
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(frame.current) }, [])
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
    // A short letter beside a long one is a card beside a taller card. The
    // track's height follows the strip from this card's height toward the
    // neighbour's by how far the strip has gone, so the card is seen to grow
    // or shrink with the finger about its own middle, and the next card
    // takes over at exactly that height (`rest`).
    const tr = track.current
    if (tr) {
      const h0 = hBase.current
      const side = x < 0 ? nextSlot.current : x > 0 ? prevSlot.current : null
      const h1 = side ? side.offsetHeight : h0
      const f = Math.min(1, Math.abs(x) / span(w))
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

  // the screen's width, and not its card's: the card is the sheet's width
  const width = () => {
    const box = cardBox.current
    const scr = box && box.querySelector('.wl-scene')
    return (scr && scr.offsetWidth) || (box && box.offsetWidth) || 360
  }

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
    // the landing is timed from the frame the strip starts on, so a frame
    // that comes late cannot land the address before the strip has moved
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      place(-dir * span(w), w, `transform ${SLIDE_MS}ms ${EASE_SLIDE}`, SLIDE_MS)
      after(SLIDE_MS + 20, () => {
        silent.current = true
        busy.current = false
        go('letter', side.target)
      })
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
    // a leaf that came by another way while a turn's frame was still due
    if (frame.current) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      busy.current = false
      setMove(null)
    }
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
  // the first few pixels and a vertical drag is handed back to the glass at
  // once; `touch-action: pan-y` on the stage says the same thing to the
  // browser. A mouse does not swipe: on a desktop the chevrons and the arrow
  // keys turn the deck, and a drag over a letter selects its words.
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
  // the way out stops a turn that is under way, so it cannot land on a letter
  // after the letter has been closed
  const stop = () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(frame.current) }
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

  // A letter that was here a moment ago and is not now. It is not an error and
  // it is not framed as one: a report takes a letter down on the tap, and the
  // most likely way somebody lands here is by walking back to one they or
  // somebody else just took off the wall.
  //
  // `undefined` is "not asked yet" and `null` is "asked, and it is gone". The
  // card waits rather than announcing a removal that has not happened.
  if (one === null) {
    return (
      <Sheet onClose={leave} onClosing={stop} labelledBy="wl-letter-h" className={wrap} aside={aside}>
        <div className="wl-sheet-in wl-letter">
          <div className="wl-letter-card">
            <Screen
              seed={String(param)} look={null} state={woke}
              top={{ name: 'not on the wall', icon: 'lock' }}
              keys={{ r: { label: 'back', onClick: up, aria: upLabel } }}
              live nameId="wl-letter-h"
            >
              <ScreenNote title="gone">that letter has come down.</ScreenNote>
            </Screen>
          </div>
        </div>
      </Sheet>
    )
  }

  const open = !!one && one.body !== null
  const toGate = () => { if (one) setAfterGate({ name: 'letter', id: one.id }); go('gate') }

  // a neighbour beside the card, off the glass, drawn as the screen it is,
  // with its keys drawn and not pressable
  const slot = (side, dir, ref) => side ? (
    <div className="wl-letter-slot" ref={ref} aria-hidden="true" data-side={dir > 0 ? 'next' : 'prev'}>
      <LetterScreen l={side.l} handle={side.handle} seed={side.target} go={go} toGate={toGate} />
    </div>
  ) : null
  const showPrev = move && (move.kind === 'drag' || move.dir < 0)
  const showNext = move && (move.kind === 'drag' || move.dir > 0)
  // an arrival that is not the strip landing: a back button, a link. A
  // beat of fade, and none at all on the first leaf, which is the sheet's.
  // Decided with the key (above), so it cannot change under a leaf that is
  // already on the glass.
  const came = leaf.fade ? ' is-arrived' : ''

  // ── what stands under the screen ──
  // Nothing, almost always: writing to them, reporting it and taking a name
  // off are in the screen's own options, and sharing it is its own key. On
  // a sealed letter, the way to the gate, with the one line that says what
  // it is a gate ON (`sealSay`). The capsule keeps its word: the act is
  // still reading this letter, and the line above it is the reason.
  const foot = !one || open ? null : (
    <div className="wl-seal">
      <p className="wl-seal-say">{sealSay()}</p>
      <Pill tone="light" wide onClick={toGate}>
        read it
      </Pill>
    </div>
  )

  return (
    <Sheet onClose={leave} onClosing={stop} labelledBy="wl-letter-to" className={wrap} aside={aside}>
      <div className="wl-sheet-in wl-letter">
        {one ? <RoomLight key={colourOf(one.look, one.id).slug} look={one.look} seed={one.id} /> : null}
        {/* ── the card, and the two ways past it ──
            One object, carrying everything true about the letter: how long it
            has been up, whether it is shut, who it is for, and the words.
            Either side of it, in the gutters, a chevron to the letter before
            and the one after; the card itself takes the finger; and while it
            is moving the neighbours stand beside it on the same strip, just
            past the edge of the glass, which is the only clip (`span`). */}
        <div
          className={`wl-letter-stage is-landed${move ? ' is-moving' : ''}`}
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
                <LetterScreen
                  l={one || null} handle={one ? null : handle} seed={String(param)}
                  id="wl-letter-to" live view={view} onView={setView} go={go} toGate={toGate}
                  woke={woke}
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

        {foot || cold ? (
          <SheetFoot>
            {foot}
            {cold ? <ViewWall onWall={onWall} /> : null}
          </SheetFoot>
        ) : null}
      </div>
    </Sheet>
  )
}

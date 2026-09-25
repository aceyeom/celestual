// ── /berkeley/letter/:id — THE LETTER ───────────────────────────────────────
//
// The card, in the middle of the glass, over a wall that stays visible and
// dimmed behind it. Nothing else: no sheet under it, no header row over it,
// no count, no pill. One mark in the corner of the glass is the way out, and
// the letters either side of it, asleep, are the rest of the deck.
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
// while the PREVIOUS letter comes in from the left. The arrow keys do the
// same, and so does a sideways swipe on a trackpad, one letter a swipe.
//
// ── and it shows there is more without saying so ──
// It used to say so with two chevrons in the gutters, which are a control
// somebody has to find and read. The deck says it itself now: the letter
// before and the letter after stand either side of the card at rest, asleep,
// the way the phones round the lit one on a table are there in the dark. On
// a phone that is a sliver of each at the edges of the glass; in a wide room
// it is the two screens themselves, dim, beside it. A press on one turns to
// it, and the first two times the deck is opened on a device that has never
// turned it, the card leans once toward the next letter and back (`nudge`).
// No word, no dots and no count: the deck is the whole wall, and a count of
// it is a number nobody reading a letter asked for.
//
// The hand has the card, a finger or a mouse. It follows one to one, the
// neighbours travel with it, and each screen is lit by how near the middle
// it stands, so the one leaving goes to sleep as the one arriving wakes. Let
// go past three tenths of the way, or thrown in the direction it is going,
// and the strip runs on at the speed it was let go at; let go short, or thrown
// back, and it springs home. Past either end of the deck the card still
// gives, less the further it is pulled, which is how a thing says "no more".
//
// A turn is still a route change, so every letter keeps its own address. The
// strip moves first and the address changes once the neighbour has landed,
// and nothing is drawn again when it does: every screen on the strip is keyed
// by its letter (`Cell`), so the neighbour that lands IS the card from then
// on, the same element in the same place. The next name's letters are asked
// for while this one is being read, so the neighbour has its words before it
// is ever pulled into view.
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
  Sheet, SheetFoot, Pill, Close, Brand, ArrowLink, useProfile, useSheet,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, RoomLight } from '../screen.jsx'
import { colourOf, chargeOf, stampOf } from '../looks.js'
import { shareLetter, prepareLetter, letterFace, starred, canShare, isReady } from '../share.js'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, targetKey, isNameKey,
  atHandle, nameFor, normHandle, heart, wall, freeReads,
} from '../data.js'
import { href } from '../router.js'
import { mark, setAfterGate, getState, patch } from '../store.js'
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
// How far a hand moves before the deck is sure it is a turn and not a scroll
// or a tap (the card then follows from there, so it does not jump the
// slack); how far a slow let go has to have carried the card, as a share of
// the screen, for the strip to run on; how fast a throw has to be, in the
// direction the card is going, to run on however short it was; and the last
// stretch of the gesture its speed is read over, so a flick at the end of a
// slow drag is a flick.
const SLOP = 8
const COMMIT = 0.3
const FLICK = 0.25        // px per ms
const SAMPLE_MS = 90
// How long the strip takes to run on, or to spring home, after a let go:
// whatever carries on the speed the hand left it at (`handoff`), inside these
// bounds. A press on a neighbour, or a trackpad, turns it in TURN_MS on the
// system's travel curve, and an arrow key in KEY_MS, since a key asks for
// less of a show than a hand does.
const SLIDE_MIN = 240
const SLIDE_MAX = 420
const SPRING_MIN = 220
const SPRING_MAX = 380
const TURN_MS = 340
const KEY_MS = 260
const EASE_SLIDE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const EASE_HOME = 'cubic-bezier(0.16, 1, 0.3, 1)'
// The lean toward the next letter a new reader is shown once the screen has
// woken, and how many times a device is shown it before it stops asking.
const NUDGE_PX = 26
const NUDGE_AT = 1250
const NUDGES = 2

// The curve a let go runs on. EASE_SLIDE leaves at 2.25 times its average
// speed (0.72 over 0.32), so a strip with `dist` still to go that should
// leave at the hand's `v` takes 2.25 * dist / v, kept inside the bounds; and
// where a bound cuts it, the curve's first handle moves so the strip still
// leaves at the hand's speed. A card let go of while still starts from still;
// one thrown leaves as fast as it was thrown.
function handoff(dist, v, lo, hi) {
  if (!(dist > 0.5)) return { ms: lo, ease: EASE_SLIDE }
  const ms = Math.min(hi, Math.max(lo, v > 0 ? (2.25 * dist) / v : hi))
  const y1 = Math.min(1, Math.max(0.04, (0.32 * v * ms) / dist))
  return { ms: Math.round(ms), ease: `cubic-bezier(0.32, ${y1.toFixed(3)}, 0, 1)` }
}

// Past either end of the deck the card still gives, less the further it is
// pulled, the way a thing at its limit does, and never past `d`. `unband` is
// the way back, for a card caught while it is still giving.
const band = (x, d, c = 0.55) => (x * d * c) / (d + c * Math.abs(x))
const unband = (y, d, c = 0.55) => (Math.abs(y) >= d ? Math.sign(y) * d * 40 : (y * d) / (c * (d - Math.abs(y))))

// The hand's speed as it let go, in px per ms, off the last stretch of it: a
// hand that stopped before it lifted threw nothing.
function speed(s, at) {
  if (s.length < 2) return 0
  const last = s[s.length - 1]
  if (at - last.t > 60) return 0
  let i = s.length - 1
  while (i > 0 && last.t - s[i - 1].t <= SAMPLE_MS) i--
  const dt = last.t - s[i].t
  return dt > 0 ? (last.x - s[i].x) / dt : 0
}

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
// ── one screen on the strip ─────────────────────────────────────────────────
// The card on the glass, or the letter either side of it, asleep. Keyed by
// its letter, so a turn draws nothing again: the neighbour that lands is the
// card from then on, the same element where it already stood, and the card
// that left is the neighbour on the other side. Only the one past it is new,
// and a screen that comes to stand beside the card once the sheet is up (that
// one, or a name whose letters have just arrived) comes up out of the dark
// rather than appearing (`fresh`). The neighbours are pictures of the next
// letter and not a second set of controls, so they are `inert`.
function Cell({ side = 0, fresh = false, arrived = false, reduce = false, children }) {
  const ref = useRef(null)
  // one that stood there when the sheet was first drawn is brought up by the
  // stylesheet instead, once the card has woken (wall.css `.is-waking`)
  const [early] = useState(!fresh)
  useLayoutEffect(() => {
    const el = ref.current
    if (!fresh || !side || reduce || !el || typeof el.animate !== 'function') return undefined
    const dim = parseFloat(getComputedStyle(el).getPropertyValue('--peek-dim')) || 0.4
    const up = el.animate([{ opacity: 0 }, { opacity: dim }], { duration: 420, easing: EASE_HOME })
    return () => up.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref} className={side ? `wl-letter-slot${early ? ' is-early' : ''}` : 'wl-letter-card'}
      data-side={side > 0 ? 'next' : side < 0 ? 'prev' : undefined}
      aria-hidden={side ? 'true' : undefined} inert={side ? true : undefined}
    >
      <div className={`wl-letter-leaf${arrived ? ' is-arrived' : ''}`}>{children}</div>
    </div>
  )
}

// ── the light in the room, handed on ──
// The room is lit by the screen on the glass (screen.jsx `RoomLight`), and a
// turn onto a screen of another colour hands the light across: the one that
// was lit goes out while the new one comes up, so the room never goes dark
// between two letters.
function Lights({ look, seed }) {
  const slug = colourOf(look, seed).slug
  const [lit, setLit] = useState(() => [{ n: 0, slug, look, seed, out: false }])
  const last = lit[lit.length - 1]
  if (last.slug !== slug) {
    setLit([...lit.filter((x) => !x.out).map((x) => ({ ...x, out: true })), { n: last.n + 1, slug, look, seed, out: false }])
  }
  const going = lit.some((x) => x.out)
  useEffect(() => {
    if (!going) return undefined
    const t = setTimeout(() => setLit((ls) => ls.filter((x) => !x.out)), 560)
    return () => clearTimeout(t)
  }, [going, lit.length])
  return lit.map((x) => (
    <span key={x.n} className={`wl-letter-light${x.out ? ' is-out' : ''}`} aria-hidden="true">
      <RoomLight look={x.look} seed={x.seed} />
    </span>
  ))
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

  // Outside the gate the press is kept rather than dropped: the gate opens
  // back onto this letter and presses the heart on the way in (Gate.jsx
  // `finish`), so somebody who signed in to heart it is not sent to find the
  // key and press it a second time
  const pressHeart = async () => {
    if (!isReader()) { setAfterGate({ name: 'letter', id: l.id, heart: true }); go('gate'); return }
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
  // an empty strip and the sheet keeps its name. By the battery, the day it
  // went up, where the draft counted what was left: a letter that is up has
  // nothing left to count, and one date on the row, not two
  const letterTop = {
    name: toName, handle: toHandle, dear: true,
    icon: open ? 'pen' : 'lock',
    stamp: stampOf(l.at), bat: chargeOf(l.at),
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
    // the second row, the way the phone counted them. The first row stays
    // the letter's, so nothing on it moves when a menu opens
    const sel = Math.min(at.at || 0, items.length - 1)
    top = { name: at.kind, pos: `${sel + 1}/${items.length}`, icon: '', stamp: stampOf(l.at), bat: chargeOf(l.at) }
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
      /* never disabled while a press is out: the heart is drawn at once
         (data.js `heart`), and a key that dimmed until the server answered
         read as a press that had not taken, and let go of the focus */
      c: {
        glyph: l.hearted ? 'heart' : 'heartO', label: hearts ? String(hearts) : '',
        onClick: pressHeart, on: l.hearted,
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
  // neighbour that is already on the glass, so the card must not make an
  // entrance. `moved` says the deck has been turned on this sheet, after
  // which nothing on it wakes again. Declared up here because the render
  // reads them.
  const silentRef = useRef(false)
  const moved = useRef(false)
  const byId = UUID.test(String(param || ''))
  // a handle, or a first name's tilde key (0053): the same address either way
  const handle = byId ? null : targetKey(param)

  // ── which card this is ──
  // The address changes on every turn and on nothing else, and it is kept as
  // state from the last render rather than as a ref: a render can be thrown
  // away without being committed, and a ref moved during one of those leaves
  // an address that has already changed by the time the commit comes. A menu
  // closes with the card it was opened on.
  //
  // Whether the card ARRIVES, with a beat of fade, or takes over silently is
  // decided here too, once, on the render that changes the address, and kept
  // with it.
  const [seen, setSeen] = useState(param)
  const [arrived, setArrived] = useState(false)
  if (seen !== param) {
    setSeen(param)
    setArrived(!silentRef.current)
    setView(null)
  }

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
  // Three screens stand on it: the card, and either side of it the letter
  // before and the letter after, asleep (`Cell`). At rest the stylesheet
  // stands them where they are (wall.css `--peek-*`); while anything moves,
  // every position is written straight to them from the gesture rather than
  // through a render, and each is lit and sized by how near the middle it
  // stands (`place`). `dx` is where the card is.
  const stage = useRef(null)
  const track = useRef(null)
  const dx = useRef(0)
  // the card's height when the strip started to move, which is where the
  // track's height is measured from while it moves
  const hBase = useRef(0)
  const silent = silentRef
  // a turn running on, which nothing takes back; a spring, a lean or a bump,
  // which a hand can catch; and the strip's measure while either is under way
  const busy = useRef(false)
  const settling = useRef(false)
  const measured = useRef(null)
  const timers = useRef([])
  const nudgeAt = useRef(0)
  const closing = useRef(false)
  // the soft key that had the focus when a turn began, handed to the same
  // key on the card it lands on, so a keyboard keeps its place
  const keyed = useRef('')
  // how a turn under way stops listening for its own landing
  const landing = useRef(null)
  // the hand on the strip, and whether the click its let go makes is to be
  // swallowed
  const drag = useRef(null)
  const flung = useRef(false)
  const unfling = useRef(0)
  // what the live screen is showing, for a timer that fires after a render
  const viewRef = useRef(view)
  viewRef.current = view
  // whether the sheet has been drawn once: a screen that comes to stand on
  // the strip after that comes up out of the dark (`Cell`)
  const opened = useRef(false)
  const born = useRef(0)
  useEffect(() => { opened.current = true; born.current = performance.now() }, [])
  const after = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
  const hold = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  // the lean, put off for this sheet: a hand or a key got there first
  const leaned = useRef(false)
  const hush = () => { leaned.current = true; clearTimeout(nudgeAt.current); nudgeAt.current = 0 }
  useEffect(() => () => { hold(); clearTimeout(nudgeAt.current); clearTimeout(unfling.current) }, [])

  // the three, as they stand now
  const cells = () => {
    const t = track.current
    if (!t) return {}
    return {
      card: t.querySelector(':scope > .wl-letter-card'),
      prev: t.querySelector(':scope > [data-side="prev"]'),
      next: t.querySelector(':scope > [data-side="next"]'),
    }
  }
  // The strip's measure, off the stylesheet: the screen's width, the room
  // between two screens, and how dim and how small a sleeping one stands
  // (wall.css `--peek-gap`, `--peek-dim`, `--peek-scale`), so the rest a
  // gesture is written back to is exactly the rest the stylesheet draws.
  const geo = () => {
    if (measured.current) return measured.current
    const { card } = cells()
    const scene = card && card.querySelector('.wl-scene')
    const w = (scene && parseFloat(getComputedStyle(scene).width)) || 360
    const cs = stage.current ? getComputedStyle(stage.current) : null
    const num = (k, d) => {
      const v = cs ? parseFloat(cs.getPropertyValue(k)) : NaN
      return Number.isFinite(v) ? v : d
    }
    measured.current = { w, span: w + num('--peek-gap', 10), dim: num('--peek-dim', 0.4), scale: num('--peek-scale', 1) }
    return measured.current
  }

  // a screen's height as it is laid out, to the fraction of a pixel and
  // whatever it is scaled by, which is the height the track lands on
  const heightOf = (el) => (el.firstElementChild ? parseFloat(getComputedStyle(el.firstElementChild).height) || 0 : 0)
  // The strip with the card at `x`. Each screen is lit and sized by how far
  // from the middle it stands: at rest that is the stylesheet's own numbers,
  // and between two rests the one leaving goes to sleep as the one arriving
  // wakes. Each shrinks toward its near edge, so the gap between two screens
  // stays the gap.
  const place = (x, transition = 'none', ms = 0, ease = EASE_SLIDE, grow = true) => {
    const G = geo()
    dx.current = x
    const c = cells()
    const put = (el, p) => {
      if (!el) return
      const f = Math.min(1, Math.abs(p) / G.span)
      el.style.transition = transition
      if (p) el.style.transformOrigin = p < 0 ? '100% 50%' : '0% 50%'
      el.style.transform = `translate3d(${p.toFixed(2)}px, 0, 0) scale(${(1 - (1 - G.scale) * f).toFixed(4)})`
      el.style.opacity = (1 - (1 - G.dim) * f).toFixed(3)
    }
    put(c.card, x)
    put(c.prev, x - G.span)
    put(c.next, x + G.span)
    // ── the height goes with the strip ──
    // A short letter beside a long one is a card beside a taller card. The
    // track's height follows the strip from this card's height toward the
    // neighbour's by how far the strip has gone, and every screen on it is
    // centred on its middle, so the card is seen to grow or shrink with the
    // hand about its own middle and the next card takes over at exactly that
    // height (`rest`). A lean does not carry it: the bob is not worth it.
    const tr = track.current
    if (tr && grow && hBase.current) {
      const side = x < 0 ? c.next : x > 0 ? c.prev : null
      const h1 = side ? heightOf(side) || hBase.current : hBase.current
      const f = Math.min(1, Math.abs(x) / G.span)
      tr.style.transition = ms ? `height ${ms}ms ${ease}` : 'none'
      tr.style.height = `${(hBase.current + (h1 - hBase.current) * f).toFixed(2)}px`
    }
  }
  // Back to what the stylesheet draws: nothing written on any of the three.
  const rest = () => {
    const c = cells()
    for (const el of [c.card, c.prev, c.next]) {
      if (!el) continue
      el.style.transition = ''
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.opacity = ''
    }
    if (track.current) { track.current.style.transition = ''; track.current.style.height = '' }
    hBase.current = 0
    dx.current = 0
  }
  // and still: the measure is read again next time, since the window may
  // have changed under a strip at rest
  const settled = () => {
    settling.current = false
    measured.current = null
    if (stage.current) delete stage.current.dataset.moving
  }
  const measure = () => {
    const { card } = cells()
    hBase.current = card ? heightOf(card) : 0
  }
  // Where the card is SEEN, halfway through a spring or a lean, for a hand
  // that catches it there: the strip stops where it is, and the hand has it
  // from that place rather than from where it was going.
  const catchStrip = () => {
    if (!settling.current) return dx.current
    const { card } = cells()
    let x = dx.current
    try { if (card) x = new DOMMatrixReadOnly(getComputedStyle(card).transform).m41 } catch { /* the last place written stands */ }
    hold()
    settling.current = false
    place(x, 'none', 0, EASE_SLIDE, !!hBase.current)
    return x
  }
  // the first turn a device makes is the last lean it is shown
  const turned = () => {
    moved.current = true
    if (!getState().turned) patch({ turned: true })
  }

  // A turn asked for past either end: the card leans a little the way it
  // was asked to go and comes home, which is how a thing at its end says so.
  const bump = (dir) => {
    if (reduce || busy.current || settling.current || closing.current) return
    settling.current = true
    place(-dir * 16, `transform 150ms ${EASE_OUT}, opacity 150ms ${EASE_OUT}`, 0, EASE_OUT, false)
    after(160, () => place(0, `transform 420ms ${EASE_HOME}, opacity 420ms ${EASE_HOME}`, 0, EASE_HOME, false))
    after(600, () => { rest(); settled() })
  }

  // Run on to the neighbour in `dir` (1 next, -1 previous), from wherever the
  // card is, at the speed a hand let it go at, and change the address once
  // it has landed.
  const slide = (dir, { from = null, v = 0, ms: fixed = TURN_MS } = {}) => {
    // a key or a wheel while a hand holds the card is the hand's to finish
    if (busy.current || closing.current || (drag.current && from == null)) return
    hush()
    const side = dir > 0 ? nextCard : prevCard
    if (!side) { bump(dir); return }
    const x0 = from == null ? catchStrip() : from
    const focused = document.activeElement
    const k = focused && focused.closest ? focused.closest('.wl-letter-card .wl-sk') : null
    keyed.current = k ? (['is-l', 'is-c', 'is-r'].find((n) => k.classList.contains(n)) || '') : ''
    if (view) setView(null)
    turned()
    if (reduce) { hold(); settled(); silent.current = true; go('letter', side.target); return }
    busy.current = true
    if (!hBase.current) measure()
    if (stage.current) stage.current.dataset.moving = dir > 0 ? 'next' : 'prev'
    const G = geo()
    place(x0)
    // a flush, so a screen that has only just come to stand beside the card
    // has somewhere to move FROM: a transition set on an element that has
    // never been styled does not run, it arrives
    if (track.current) void track.current.offsetWidth
    const to = -dir * G.span
    const { ms, ease } = v > 0 ? handoff(Math.abs(to - x0), v, SLIDE_MIN, SLIDE_MAX) : { ms: fixed, ease: EASE_SLIDE }
    place(to, `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`, ms, ease)
    // The address changes when the neighbour has arrived, which is the end
    // of its own travel and not a clock started beside it: a phone that
    // drops the first frame of a turn starts the travel late, and a landing
    // timed from the press cut the last of it off and jumped. The clock is
    // only the fallback, for a travel that never reports its end.
    const arriving = dir > 0 ? cells().next : cells().prev
    let down = false
    const onEnd = (e) => { if (e.target === arriving && e.propertyName === 'transform') land() }
    const unland = () => {
      down = true
      if (arriving) arriving.removeEventListener('transitionend', onEnd)
    }
    const land = () => {
      if (down || closing.current) return
      unland()
      silent.current = true
      go('letter', side.target)
    }
    if (arriving) arriving.addEventListener('transitionend', onEnd)
    landing.current = unland
    after(ms + 320, land)
    // and should the address not change after all, the strip is let go of
    // rather than left running on to nothing
    after(ms + 1200, () => { unland(); busy.current = false; rest(); settled() })
  }
  const slideRef = useRef(slide)
  slideRef.current = slide

  // Let go short, or thrown back: home, from wherever the card is, carrying
  // the speed it was let go at when that was toward the middle.
  const spring = (v = 0) => {
    const x0 = dx.current
    if (reduce || Math.abs(x0) < 0.5) { hold(); rest(); settled(); return }
    const home = Math.sign(v) === -Math.sign(x0) ? Math.abs(v) : 0
    const { ms, ease } = handoff(Math.abs(x0), home, SPRING_MIN, SPRING_MAX)
    settling.current = true
    place(0, `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`, ms, ease)
    after(ms + 20, () => { rest(); settled() })
  }

  // ── the landing ──
  // The card that has just taken the glass. The strip is put back to rest
  // before paint, and since every screen on it is keyed by its letter, the
  // one that landed is already where rest puts it, and so is the one that
  // left: nothing is seen to change. A card that came by another way (a
  // link, the history) is put down the same way, and whatever was under way
  // is let go.
  useLayoutEffect(() => {
    hold()
    if (landing.current) { landing.current(); landing.current = null }
    rest()
    settled()
    busy.current = false
    silent.current = false
    const k = keyed.current
    keyed.current = ''
    const key = k && track.current ? track.current.querySelector(`:scope > .wl-letter-card .wl-sk.${k}`) : null
    if (key && !key.disabled) key.focus({ preventScroll: true })
  }, [param]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── the lean ──
  // The first two times a device opens the deck, and until it has turned it
  // once, the card leans toward the next letter a little after the screen has
  // woken, and comes home: the next one is seen to be there, and which way
  // it is. Never under reduced motion, never over a menu, and anything a hand
  // or a key does first puts it off for this sheet.
  const nudge = () => {
    nudgeAt.current = 0
    leaned.current = true
    if (busy.current || settling.current || drag.current || closing.current || viewRef.current) return
    if (!cells().next) return
    const s = getState()
    if (s.turned || (s.hinted || 0) >= NUDGES) return
    patch({ hinted: (s.hinted || 0) + 1 })
    settling.current = true
    place(-NUDGE_PX, `transform 380ms ${EASE_OUT}, opacity 380ms ${EASE_OUT}`, 0, EASE_OUT, false)
    after(440, () => place(0, `transform 680ms ${EASE_HOME}, opacity 680ms ${EASE_HOME}`, 0, EASE_HOME, false))
    after(1140, () => { rest(); settled() })
  }
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge
  const hasNext = !!nextTo
  useEffect(() => {
    if (leaned.current || reduce || !hasNext) return undefined
    const s = getState()
    if (s.turned || (s.hinted || 0) >= NUDGES) return undefined
    nudgeAt.current = setTimeout(() => nudgeRef.current(), Math.max(400, NUDGE_AT - (performance.now() - born.current)))
    return () => { clearTimeout(nudgeAt.current); nudgeAt.current = 0 }
  }, [hasNext, reduce])

  // The arrow keys turn the deck, on a keyboard. Not while a sheet is being
  // typed into, and there is nothing to type into here; a menu on the
  // screen keeps its own arrows (screen.jsx `ScreenMenu`).
  const canTurn = !!(nextTo || prevTo)
  useEffect(() => {
    if (!canTurn) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); slideRef.current(1, { ms: KEY_MS }) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); slideRef.current(-1, { ms: KEY_MS }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canTurn])

  // ── a trackpad ──
  // Two fingers sideways turn the deck one letter a swipe, the way they turn
  // a page. The glide a trackpad keeps sending after the fingers lift is part
  // of the same swipe, so once a swipe has turned the deck it turns nothing
  // more until the wheel goes quiet, or until a delta rises again, which a
  // glide does not do and a new swipe does. Taken out of the browser's
  // hands (a listener that is not passive, which React's own is), since a
  // sideways swipe left to it is the history going back, and the letter
  // closing under the hand.
  useEffect(() => {
    if (!canTurn) return undefined
    let acc = 0
    let locked = false
    let quiet = 0
    let last = 0
    let at = 0
    const onWheel = (e) => {
      if (e.ctrlKey) return
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerWidth : 1
      const x = e.deltaX * unit
      const y = e.deltaY * unit
      if (!x || Math.abs(x) <= Math.abs(y) * 1.2) return
      e.preventDefault()
      clearTimeout(quiet)
      quiet = setTimeout(() => { locked = false; acc = 0; last = 0 }, 180)
      const now = performance.now()
      const ax = Math.abs(x)
      if (locked && now - at > 380 && ax > last * 2 && ax > 10) { locked = false; acc = 0 }
      last = ax
      if (locked) return
      acc += x
      if (Math.abs(acc) < 40) return
      locked = true
      at = now
      const dir = acc > 0 ? 1 : -1
      acc = 0
      slideRef.current(dir)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => { window.removeEventListener('wheel', onWheel); clearTimeout(quiet) }
  }, [canTurn])

  // ── the swipe ──
  // A hand on the card takes the strip sideways, a finger or a mouse. The
  // axis is decided on the first few pixels and a vertical drag is handed
  // back to the glass at once; `touch-action: pan-y` on the stage says the
  // same thing to the browser. Once it is sideways the stage keeps the
  // pointer wherever it goes, only the first finger counts, and the click a
  // drag ends in is swallowed, so a drag let go of over a soft key does not
  // heart the letter or open its menu. A mouse over a turnable deck selects
  // no words (wall.css): the card is a thing that is picked up.
  const onDown = (e) => {
    if (!e.isPrimary || drag.current || busy.current || !canTurn) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    hush()
    flung.current = false
    const ox = catchStrip()
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox, axis: '', s: [] }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    if (!d.axis) {
      const mx = e.clientX - d.sx
      const my = e.clientY - d.sy
      if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return
      d.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (d.axis === 'y') { drag.current = null; if (d.ox) spring(); return }
      // the slack is not taken up: the card moves from here, and where it
      // was still giving at an end it is taken back to the pull behind it
      d.sx = e.clientX
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a pointer the browser is not tracking, as scripts/preview.mjs sends */ }
      const G = geo()
      const end = (d.ox < 0 && !nextTo) || (d.ox > 0 && !prevTo)
      if (end) d.ox = unband(d.ox, G.w / 2)
      if (!hBase.current) measure()
      const st = stage.current
      if (st && e.pointerType === 'mouse') st.dataset.grab = ''
      const sel = window.getSelection ? window.getSelection() : null
      if (sel && !sel.isCollapsed) sel.removeAllRanges()
    }
    const t = e.timeStamp
    d.s.push({ x: e.clientX, t })
    while (d.s.length > 2 && t - d.s[0].t > SAMPLE_MS * 2) d.s.shift()
    const raw = d.ox + e.clientX - d.sx
    const end = (raw < 0 && !nextTo) || (raw > 0 && !prevTo)
    // the way the strip is going, which wakes the neighbour it is going to
    // in full (wall.css, what a print asleep costs)
    const way = raw < 0 ? 'next' : 'prev'
    if (stage.current && stage.current.dataset.moving !== way) stage.current.dataset.moving = way
    place(end ? band(raw, geo().w / 2) : raw)
  }
  const onUp = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (stage.current) delete stage.current.dataset.grab
    if (d.axis !== 'x') { if (d.ox) spring(); return }
    flung.current = true
    clearTimeout(unfling.current)
    unfling.current = setTimeout(() => { flung.current = false }, 400)
    const v = speed(d.s, e.timeStamp)
    const x = dx.current
    const dir = x < 0 ? 1 : -1
    const to = dir > 0 ? nextTo : prevTo
    // thrown, it goes the way it was thrown; let go slowly, it goes where
    // it was taken, if that was far enough
    const along = Math.sign(v) === Math.sign(x)
    const thrown = Math.abs(v) > FLICK
    if (to && Math.abs(x) > 0.5 && (thrown ? along : Math.abs(x) > COMMIT * geo().w)) {
      slide(dir, { from: x, v: along ? Math.abs(v) : 0 })
    } else spring(v)
  }
  const onCancel = (e) => {
    const d = drag.current
    if (!d || (e && e.pointerId !== d.id)) return
    drag.current = null
    if (stage.current) delete stage.current.dataset.grab
    if (d.axis === 'x' || d.ox) spring()
  }
  const onClick = (e) => {
    if (!flung.current) return
    flung.current = false
    e.preventDefault()
    e.stopPropagation()
  }
  // the way out stops a turn that is under way, so it cannot land on a letter
  // after the letter has been closed
  const stop = () => {
    closing.current = true
    hold()
    hush()
    if (landing.current) { landing.current(); landing.current = null }
  }
  const swipe = canTurn
    ? {
      onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp,
      onPointerCancel: onCancel, onLostPointerCapture: onCancel, onClickCapture: onClick,
    }
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

  // The three on the strip: the letter before, this one and the letter
  // after, each keyed by its letter (`Cell`). The card is the one whose
  // address this is, lit and live; either side, the screen that letter is,
  // with its keys drawn and not pressable. A card that is an arrival and not
  // the strip landing (a link, the history) takes a beat of fade, decided
  // with the address (above), and the first card none, since it is the
  // sheet's own entrance.
  const here = one ? one.id : String(param)
  const strip = [
    prevCard ? { key: prevCard.target, side: -1, c: prevCard } : null,
    { key: here, side: 0 },
    nextCard ? { key: nextCard.target, side: 1, c: nextCard } : null,
  ].filter(Boolean)

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
        {one ? <Lights look={one.look} seed={one.id} /> : null}
        {/* ── the card, and the letters either side of it ──
            One object, carrying everything true about the letter: when it
            went up, whether it is shut, who it is for, and the words. Either
            side of it the letter before and the one after, asleep, a sliver
            at the edge of a phone's glass and whole in a wide room. The card
            takes the hand, and a press on a neighbour turns to it: over each
            stands a key with nothing drawn on it (`.wl-turn`), which is also
            the turn a keyboard or a screen reader finds. The glass is the
            only clip. */}
        <div
          ref={stage}
          className={`wl-letter-stage${canTurn ? ' can-turn' : ''}${woke && !moved.current ? ' is-waking' : ''}`}
          {...swipe}
        >
          {prevTo ? (
            <button type="button" className="wl-turn is-prev" onClick={() => slide(-1)} aria-label="the letter before this one" />
          ) : null}
          <div className="wl-letter-track" ref={track}>
            {strip.map((s) => (
              <Cell key={s.key} side={s.side} fresh={opened.current} arrived={!s.side && arrived} reduce={reduce}>
                {s.side ? (
                  <LetterScreen l={s.c.l} handle={s.c.handle} seed={s.c.target} go={go} toGate={toGate} />
                ) : (
                  <LetterScreen
                    l={one || null} handle={one ? null : handle} seed={String(param)}
                    id="wl-letter-to" live view={view} onView={setView} go={go} toGate={toGate}
                    woke={moved.current ? '' : woke}
                  />
                )}
              </Cell>
            ))}
          </div>
          {nextTo ? (
            <button type="button" className="wl-turn is-next" onClick={() => slide(1)} aria-label="the letter after this one" />
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

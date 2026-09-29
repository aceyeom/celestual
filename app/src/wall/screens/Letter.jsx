// ── /berkeley/letter/:id — THE LETTER ───────────────────────────────────────
//
// The card, in the middle of the glass, over a wall that stays visible and
// dimmed behind it. Nothing else: no sheet under it, no header row over it,
// no pill. One mark in the corner of the glass is the way out, and the
// letters either side of it, asleep, are the rest of the deck. The card's
// thread of replies is a sheet its right soft key raises from the foot of
// the glass, the letter rising and stepping back to stand whole above it
// (Replies.jsx `ThreadSheet`, and the sheet, below): nothing hangs under
// the phone, and nothing but the thread scrolls.
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
// ── how flat a phone is ──
// Every phone on the deck is one rectangle in one plane, and only its lie is
// its own. The strip moves whole objects sideways, and they read cleanly
// while it does only if every outline is the same rectangle standing on the
// same middle line: so the proportion is the phones' middle one on this
// sheet, and the card and its neighbours, their status rows and their key
// bands, stand in a line across the gap (wall.css, one phone, one outline).
// The angle each lies at on the table (`--q-rz`) is kept, turning the whole
// phone as one body (`Handset`); the camera's depth is not, since a screen
// turned in depth reads as a card swivelling while the hand slides it.
// Everything that makes a letter its own phone is
// painted, costs the gesture nothing, and stays: its corner, its light,
// its pixels, its dust and glare, a print's grain. Opened, a phone is held
// square to the eye, as a screen that is being used always is (DESIGN.md
// 2.6, the stories).
//
// A turn is still a route change, so every letter keeps its own address. The
// strip moves first and the address changes once the neighbour has landed,
// and nothing is drawn again when it does: every screen on the strip is keyed
// by its letter (`Cell`), so the neighbour that lands IS the card from then
// on, the same element in the same place. The next name's letters are asked
// for while this one is being read, so the neighbour has its words before it
// is ever pulled into view.
//
// ── nothing is asked for here ───────────────────────────────────────────────
// Every letter is whole to anybody, as many as they read (the owner, 26
// September; migration 0066). The card used to arrive REDACTED past the
// eighth letter a browser read, every word struck out and a lit key under it
// reading "read it" over "sign in to read the whole wall" (0045, 0049): a
// paywall with no price on it. The seal, its line and its key are gone, and
// the database hands every body to every reader. What is left of the door is
// the nudge (Nudge.jsx): a note under the card, never over it, once somebody
// has read a few, saying what signing in gets them, with `not now` beside
// `sign in`. The heart still asks for a proof, since it is counted against a
// person.
//
// ── and the @ is not printed on it ──────────────────────────────────────────
// The top row said who a letter was for the way a phone said the contact a
// draft was going to: the first name, and the @handle beside it. The handle
// stays the letter's key, what it is filed under, found by and removed by,
// and the search hears it typed with its @ or without (wall_search); it is
// never printed on the letter's face, the neighbours beside it or the
// picture shared off it. The row says "dear" and the name: the writer's own
// line, or the resolver's first name for the @, or, with neither, "dear you",
// which is who a letter is to.

import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Sheet, SheetFoot, Close, Brand, ArrowLink, useProfile, useSheet,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, RoomLight } from '../screen.jsx'
import { colourOf, chargeOf, stampOf, lookFor, rgbTile, skinOf, skinVars, quirks, countSaid } from '../looks.js'
import { stripMoving, idle, unidle } from '../strip.js'
import { shareLetter, prepareLetter, letterFace, canShare, isReady } from '../share.js'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, targetKey, isNameKey,
  nameFor, heart, wall, loadWall, removeLetter,
  isYours, canTakeBack, withdraw, unwithdraw,
} from '../data.js'
import { ownerRemove, ownerRestore } from '../../api/alerts.js'
import { href } from '../router.js'
import { mark, getState, patch } from '../store.js'
import { cardStep } from '../seed.js'
import { isReader, toWrite } from '../auth.js'
import { letterMarks } from '../schools.js'
import { Nudge, useNudge } from '../Nudge.jsx'
import { openForAlerts } from './You.jsx'
import { useThread, threadKey, ThreadSheet } from '../Replies.jsx'

// ── the name on the screen ──────────────────────────────────────────────────
// The top row carries who the letter is for the way a phone carried the
// contact a draft was going to: the first name, when the resolver has one
// for the @. A first name (0053) is itself. Never the handle (the head of
// this file says why): '' when there is no name, and the row says "dear
// you" (`NO_NAME`).
const NO_NAME = 'you'
function useFirst(to) {
  const named = isNameKey(to)
  const p = useProfile(named ? '' : to)
  if (!to) return ''
  if (named) return nameFor(to) || String(to).slice(1)
  return p && p.name ? String(p.name).trim().split(/\s+/)[0] : ''
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
// does: the mark and the word, drawn on the phone's grid as the bar draws
// them, in the corner opposite the close mark (DESIGN.md 3.6), and under the card one line
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
      className="wl-letter-brand is-small" href={href('wall')}
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
// Where the replies stand, and the letter with them (the sheet, below). On a
// phone: the sheet is this share of the window's height, never under the
// least a thread can be read in, and never so tall that less than this much
// of the letter shows over it; the letter stands between the close mark
// and the sheet's edge, this far off each, shown as small as it must be to
// stand there whole and never under half its size. At half, the sheet gives
// the letter back what it would have covered, down to the second share of
// the window, and past that the letter stands at the top at half and the
// sheet covers its foot. And how quickly a thread thrown down goes, however
// little it was pulled (px per ms).
const SHEET_SHARE = 0.64
const SHEET_LEAST = 0.56
const SHEET_MIN = 300
const LETTER_LEAST = 140
const LETTER_GAP = 12
const LETTER_MIN = 0.5
const SHEET_FLICK = 0.11
// and how long a press takes to raise them and to lay them down, on the
// sheet's own curve (`EASE_SLIDE`); going away is the quicker
const OPEN_MS = 440
const SHUT_MS = 340
// In a wide room, or on a phone on its side, the replies are a panel beside
// the letter: this wide, this far off it, as tall as the letter's phone and
// never under the least, this far from the edges of the room, and rising
// this far into place as it comes (replies.css keeps the same number)
const PANEL_W = [380, 420]
const PANEL_GAP = 28
const PANEL_H = 520
const ROOM_EDGE = 32
const PANEL_RISE = 24
// the room is a desk from this wide, or a phone on its side: the same query
// replies.css draws the panel under, asked of the same window
const DESK_ROOM = '(min-width: 900px), (max-height: 560px) and (orientation: landscape)'
const deskRoom = () => !!(window.matchMedia && window.matchMedia(DESK_ROOM).matches)
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
// that left is the neighbour on the other side. A name whose letters are
// still on their way stands keyed by the name, and keeps that element when
// they land (Letter `keyOf`). Only the one past the neighbour is new, and a
// screen that comes to stand beside the card once the sheet is up comes up
// out of the dark rather than appearing (`fresh`). The neighbours are
// pictures of the next letter and not a second set of controls, so they are
// `inert`.
function Cell({ side = 0, fresh = false, arrived = false, reduce = false, children }) {
  const ref = useRef(null)
  // one that stood there when the sheet was first drawn is brought up by the
  // stylesheet instead, once the card has woken (wall.css `.is-waking`)
  const [early] = useState(!fresh)
  // The fade writes the screen's light for as long as it runs, over the light
  // the strip gives it (Letter `place`), so a screen faded in under a hand
  // came across the glass at a tenth of its light. Not while the strip moves,
  // then, and not for one standing off the glass where nobody would see it; a
  // hand or a turn stops one under way (Letter `wake`), and so does the screen
  // becoming the card.
  const up = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!fresh || !side || reduce || !el || typeof el.animate !== 'function') return undefined
    if (el.closest('.wl-letter-stage[data-moving]')) return undefined
    const r = el.getBoundingClientRect()
    if (r.right <= 0 || r.left >= window.innerWidth) return undefined
    const dim = parseFloat(getComputedStyle(el).getPropertyValue('--peek-dim')) || 0.4
    up.current = el.animate([{ opacity: 0 }, { opacity: dim }], { duration: 420, easing: EASE_HOME })
    return () => { if (up.current) up.current.cancel(); up.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!side && up.current) { up.current.cancel(); up.current = null }
  }, [side])
  return (
    <div
      ref={ref} className={side ? `wl-letter-slot${early ? ' is-early' : ''}` : 'wl-letter-card'}
      data-side={Math.abs(side) > 1 ? 'far' : side > 0 ? 'next' : side < 0 ? 'prev' : undefined}
      aria-hidden={side ? 'true' : undefined} inert={side ? true : undefined}
    >
      <div className={`wl-letter-leaf${arrived ? ' is-arrived' : ''}`}>{children}</div>
    </div>
  )
}

// ── one phone ───────────────────────────────────────────────────────────────
// Every screen on the strip is a phone (`.wl-set`) lying on the table at its
// own angle, the angle on this box and not on the screen, and the screen in
// it (`.wl-set-up`), which is what rises and steps back while the replies
// are up (the sheet, below). The card's right soft key is its thread's
// (Replies.jsx `threadKey`, handed to the screen through `ThreadKey`), and
// the thread is the card's alone: read once by the sheet (`useThread` in
// `Letter`, handed in as `th`) and never for a neighbour, which is the same
// phone with the bubble and no count on its key and nothing by its aerial.
// Kept the same element whichever side it stands on, so the neighbour that
// lands IS the card, and its thread is read as it lands.
const ThreadKey = createContext(null)
function Handset({ l, seed, live = false, open = false, onToggle, th = null, children }) {
  const q = quirks(seed)
  const on = live && !!l && !!th && th.on
  const keyId = live && l ? `wl-thread-${l.id}` : undefined
  // the card's thread is its own and is read again with every render of it;
  // a neighbour's is nothing, and stays the same nothing, so the screen on a
  // neighbour is not drawn again whenever the sheet is (`LetterScreen`)
  const own = live ? th : null
  const ctx = useMemo(
    () => ({ th: own, open, onToggle, keyId, letter: live ? l : null }),
    [live, own, open, onToggle, keyId, l],
  )
  return (
    <div className={`wl-set${on ? ' has-thread' : ''}`} style={{ '--q-rz': q.vars['--q-rz'] }}>
      <div className="wl-set-up">
        <ThreadKey.Provider value={ctx}>{children}</ThreadKey.Provider>
      </div>
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

// ── a letter its owner has just taken down ──
// The screen once the owner has removed a letter (`removeMine` in the sheet
// below): what happened, and the two soft keys a phone put under it, `undo`
// on the left, which puts it back, and `back` on the right, which leaves.
// Drawn on the letter's own glass, and on the "not on the wall" one once the
// letter is read again and is gone, so the undo stands as long as either
// does. `r` is { busy, said, onUndo, onLeave, leaveLabel }.
//
// And the same screen for the letter's WRITER, who took it back themselves
// (`takeBack` in the sheet below, the owner's ruling of 29 September): it
// says `taken back.`, the words the writer chose from the menu said back to
// them as done, and its right key is `ok`, since a writer who took their own
// letter down is not being shown out of anything. A letter that was waiting
// on the desk when it was taken back goes back to waiting (0074), where no
// reader can see it, so its undo lands on a screen that says so and has
// nothing more to undo (`held`). `who` is 'writer' for these.
function removedFace(r) {
  const writer = r.who === 'writer'
  if (writer && r.held) {
    return {
      body: <ScreenNote glyph="check" title="it's being read">it goes up once it passes.</ScreenNote>,
      keys: { r: { label: 'ok', onClick: r.onLeave, aria: r.leaveLabel || 'ok' } },
    }
  }
  return {
    body: r.busy
      ? <ScreenNote glyph="wait" title="putting it back" />
      : r.said
        ? <ScreenNote title="it did not come back">{r.said}</ScreenNote>
        : <ScreenNote glyph="check" title={writer ? 'taken back.' : 'removed'} />,
    keys: r.busy ? {} : {
      l: r.done ? undefined : { label: 'undo', onClick: r.onUndo, aria: 'undo: put the letter back where it was' },
      r: writer
        ? { label: 'ok', onClick: r.onLeave, aria: r.leaveLabel || 'ok' }
        : { label: 'back', onClick: r.onLeave, aria: r.leaveLabel || 'back' },
    },
  }
}

// The card, for one letter, or the waiting card for a name whose letters are
// still on their way. Drawn once here and used for the card on the glass and
// for the neighbours beside it, so what slides in is what lands.
// ── one letter, as its screen ───────────────────────────────────────────────
// What the phone shows depends on `view`: the letter itself, the options
// menu, the share menu, or a note ("shared", "saved"). Only the live card
// has a view of its own; the neighbours on the strip are always the letter.
//
//   the letter   the heart and its count, the replies' bubble and its
//                count, together on the left · options, alone on the right
//   a menu       select · back
//   a note       ok
//
// The heart and the bubble were the middle and right keys, with `options`
// on the left, until the owner's ruling of 29 September: "rearrange the
// likes and comments so its on the left together and the options on the
// right". What a reader does to a letter is together, under one thumb, and
// the menu is where a phone kept its menu, alone at the other end of the
// band (screen.jsx `keys.l` as a list). `share` is the first row of the
// options on every letter now, thread or none, so the band is the same
// three things on every letter; a letter with no thread to read has the
// heart alone on the left. The key that opens a menu is the key that shuts
// it: `options` is on the right, and a menu's `back` is on the right.
//
// The right key said `send` until the composer's own act said `send
// anonymously`: one word for putting a letter up and for passing one on is a
// word somebody has to stop and read twice. `send` is the writer's; passing a
// letter on is `share`, and the menu the key opens says so in its top row.
//
// The heart is the reader's one mark that is not writing or reporting: once
// per person, the count is a count and nothing else, and zero says nothing
// rather than "0". It was behind the same gate as reading, and on a letter
// from outside it the heart was the way to the gate; since 0068 it is
// anybody's, on any device, and pressing it never opens a door.
//
// ── and it is drawn again only when it changes ──
// A screen is the dearest thing on the sheet to draw, and the sheet is drawn
// again for a good many things that are not the screens beside the card: a
// turn landing, the screen drawn ahead of one, a menu, the replies raised,
// the card waking. Each of those drew both neighbours again too, the words
// and the pixels and the keys of letters that had not changed, inside the
// frame the thing happened on. So a screen is kept as it was unless what it
// shows has changed (`memo`), which for a neighbour is only its letter.
const LetterScreen = memo(function LetterScreen({ l, handle, seed, id, live = false, view = null, onView, go, woke = '', onRemove = null, onTakeBack = null }) {
  const to = l ? l.to : handle
  const first = useFirst(to)
  const hs = useContext(ThreadKey)
  const [busy, setBusy] = useState(false)
  const [, drawn] = useState(0)
  const at = view || { kind: 'letter' }
  // who it is to, as the screen says it: "dear" and the first name, and
  // "dear you" where there is none. The @ is not said at all
  const toName = first || NO_NAME
  const back = () => onView && onView(null)

  // The shared picture, drawn as the share menu opens, whose `to someone…`
  // says `to someone` once it is there (share.js `prepareLetter`). Not ahead
  // of that: drawing it holds a phone for most of a second, which is a stall
  // in the turn when it lands on a letter only passed through
  const sharing = live && !!l && !!view && view.kind === 'share'
  // the replies' count as the key says it, for the picture's bubble: the
  // card's own thread only, read and not put away (Replies.jsx `shown`)
  const th0 = hs && hs.th
  // and `null` where the card has no bubble at all, a thread that cannot be
  // read, so the picture draws the heart alone as the card does
  const repliesN = !(th0 && th0.on) ? null
    : th0.t && th0.t.ok && !th0.hiddenFromMe ? th0.count || 0 : 0
  useEffect(() => {
    if (!sharing) return undefined
    let alive = true
    prepareLetter(letterFace(l, { name: toName, replies: repliesN })).then(() => { if (alive) drawn((n) => n + 1) })
    return () => { alive = false }
  }, [sharing, l && l.id, l && l.hearts, l && l.hearted, toName, repliesN]) // eslint-disable-line react-hooks/exhaustive-deps
  // whether this letter is still the one on the glass, so what a tap
  // answers late (a picture drawn, a file saved) is not put on the next
  const here = useRef(true)
  useEffect(() => { here.current = true; return () => { here.current = false } }, [])

  if (!l) {
    /* `waiting`: the screen is on and nothing has arrived on it yet, so it
       is only the lit glass, lit in the colour the name was last seen in
       (looks.js `lookFor`) so that its letter landing does not change it */
    return (
      <Screen seed={String(seed || handle || '')} look={lookFor(handle)} top={{ name: toName, dear: true, icon: 'pen' }} live={false} nameId={id}>
        <ScreenText text="" />
      </Screen>
    )
  }

  const text = l.body || ''
  const hearts = l.hearts || 0
  // the count on the key, in whole thousands past a thousand, as a phone
  // counted, so it is never more than three figures, and three set a step
  // smaller (screen.css `.is-long`), and the bubble beside it keeps its
  // place whatever the count (screen.css `.wl-sk-n`). "9.9k" was four, and
  // ran into the word. The replies' key counts the same way (looks.js
  // `countSaid`)
  const heartsSaid = countSaid(hearts)
  // the envelope by the aerial: the person the letter is to has answered
  // (Replies.jsx `threadKey` says why it is there and not on the key). The
  // card's own thread only; a neighbour's is never read
  const heard = !!(hs && hs.th && hs.th.answered)

  // Anybody's since 0068 (likes are open to everybody): the press goes
  // straight to the server, which keeps one heart per device, and never to
  // the gate
  const pressHeart = async () => {
    if (busy) return
    setBusy(true)
    await heart(l.id, !l.hearted)
    setBusy(false)
  }

  /* A first name is nobody's to claim or to empty: forty people share it,
     and no handle proof can stand for it (0053). A letter to an @ is its
     owner's (docs/ONE-WALL.md), and the menu is two menus, one for each
     side of that. To the person who has proved it (`mine`, api.js): this
     one letter down, with an undo (`removeMine`, below), and the whole
     name off for good (screens/Remove.jsx). Writing to yourself and
     reporting a letter you can remove in one tap are not on it. To anybody
     else: write to them, report it, and "this is about me", which is the
     way to prove it (screens/Claim.jsx) and the way to everything the owner
     can do, taking the name off included (the claim's own sheet and the
     account's "take my name off the wall for good"). It was four look alike
     rows, "this is about me" beside "take my name off", a claim beside a DM
     that ends in something permanent.

     And a third, for the person who WROTE it (the owner's ruling of 29
     September, 0074): `take it back`, and nothing a stranger's menu has.
     Writing to the person you wrote to, reporting your own words and
     claiming to be the one they are about are not things a writer does to
     their own letter. Whose it is is the server's answer to this session
     alone (`yours`, api.js), or this device's own record of what it put up
     (data.js `isYours`), and it is never drawn anywhere but on this menu,
     for this reader. A database without the take back hides the row
     (`canTakeBack`). A letter written to your own @ is both yours and
     mine: the row to take it back, and the row to take the name off. */
  const toAt = !isNameKey(l.to)
  const yours = !!onTakeBack && canTakeBack() && isYours(l)
  // The replies' key (Replies.jsx `threadKey`) stands beside the heart, and
  // sharing is the first row of the options on every letter, where a phone
  // put what it did with the thing on its screen, whether or not the letter
  // has a thread to read.
  const tk = hs ? threadKey(hs.th, { open: hs.open, onToggle: hs.onToggle, id: hs.keyId, letter: hs.letter }) : null
  // the replies' count goes on the shared picture's bubble as it stands on
  // the key (share.js `letterFace`)
  const face = () => letterFace(l, { name: toName, replies: tk ? repliesN : null })
  const openShare = () => { prepareLetter(face()); onView({ kind: 'share', at: 0 }) }
  const optionItems = [{ t: 'share', run: openShare }, ...(yours ? [
    { t: 'take it back', run: () => onTakeBack(l) },
    ...(l.mine && toAt ? [{ t: 'take my name off', run: () => go('remove', l.to) }] : []),
  ] : l.mine && onRemove ? [
    { t: 'remove this letter', run: () => onRemove(l) },
    ...(toAt ? [{ t: 'take my name off', run: () => go('remove', l.to) }] : []),
  ] : [
    { t: `write to ${first || 'them'}`, run: () => toWrite(go, l.to) },
    { t: 'report this letter', run: () => go('report', l.id) },
    ...(toAt ? [{ t: 'this is about me', run: () => go('claim', l.to) }] : []),
  ])]
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
  // the greeting its writer chose, and the school it was posted from: a
  // sticker on the phone's corner for a letter from a proved address, a
  // plain tag for a name note's picked campus (schools.js `letterMarks`)
  const marks = letterMarks(l)
  const letterTop = {
    name: toName, dear: true,
    salutation: marks.salutation, tag: marks.tag,
    icon: 'pen',
    stamp: stampOf(l.at), bat: chargeOf(l.at), mail: heard,
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
    top = { name: at.kind, pos: `${sel + 1}/${items.length}`, icon: '', stamp: stampOf(l.at), bat: chargeOf(l.at), mail: heard }
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
  } else if (at.kind === 'removed') {
    top = letterTop
    const off = removedFace(at)
    body = off.body
    keys = off.keys
  } else if (at.kind === 'ask') {
    /* a question the screen puts before an act that cannot be taken back:
       the act on the left key, and keeping things as they are on the right */
    top = letterTop
    body = <ScreenNote title={at.title}>{at.text || null}</ScreenNote>
    keys = {
      l: { label: at.yes, onClick: at.onYes, aria: at.aria || at.yes },
      r: { label: 'keep it', onClick: back, aria: 'keep it on the wall' },
    }
  } else {
    top = letterTop
    body = <ScreenText text={text} />
    /* never disabled while a press is out: the heart is drawn at once
       (data.js `heart`), and a key that dimmed until the server answered
       read as a press that had not taken, and let go of the focus */
    const hk = {
      glyph: l.hearted ? 'heart' : 'heartO', label: hearts ? heartsSaid : '',
      cls: `is-heart${heartsSaid.length > 2 ? ' is-long' : ''}`,
      onClick: pressHeart, on: l.hearted,
      pressed: !!l.hearted,
      aria: `${l.hearted ? 'take your heart off this letter' : 'heart this letter'}${hearts ? `, ${hearts === 1 ? 'one heart' : `${hearts} hearts`}` : ''}`,
    }
    keys = {
      l: tk ? [hk, tk] : [hk],
      r: { label: 'options', cls: 'is-options', onClick: () => onView({ kind: 'options', at: 0 }), aria: `options: ${optionItems.map((x) => x.t).join(', ')}` },
    }
  }
  return (
    <Screen
      look={l.look} seed={l.id} top={top} keys={keys} live={live}
      state={woke} nameId={id} sticker={marks.sticker}
    >
      {body}
    </Screen>
  )
})

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
  const wrap = `is-letter${cold ? ' is-cold' : ''}`
  // What the live screen is showing: the letter (null), a menu, or a note,
  // and whether the card's replies are up. Nothing else on this sheet holds
  // state: the letter is the server's, and so is its thread (Replies.jsx
  // `useThread`). Every letter arrives with its replies down, and the deck
  // does not turn while they are up (the sheet, below).
  const [view, setView] = useState(null)
  const [thread, setThread] = useState(false)
  // the sheet down and at rest, and not merely on its way down: until it has
  // landed it is still on the glass and still takes a press (the hand that
  // catches it going turns it round), and the black round it still swallows
  // one, so a second tap as it goes lays nothing else down and never closes
  // the letter under it
  const [laid, setLaid] = useState(true)
  const threadRef = useRef(thread)
  threadRef.current = thread

  // ── the owner takes it down ──
  // One tap from the menu, by the person who has proved the letter's @
  // (docs/ONE-WALL.md `wall_owner_remove`): it comes down, and the screen
  // says so with the way back on its own key, `undo`, for as long as the
  // screen stands (`wall_owner_restore`, good for a day on the server). It
  // files no claim and shuts nothing else. A database that does not have the
  // call yet is answered with the old removal, which cannot be undone and
  // closes the @ to new letters, so it is asked for first, on the screen.
  //
  // The undo was a toast at the foot of the glass for five seconds, over the
  // thread's "you reply as" row, and after it the screen read "removed" with
  // nothing on it to put the letter back, while the server would have for a
  // day. It is the screen's now, on the letter's own glass or, once the
  // letter is read again and is gone, on the "not on the wall" screen that
  // takes its place (`removedFace`), until the sheet is left.
  const [removed, setRemoved] = useState(null)   // { id, to, busy, said }
  const freshen = (l) => Promise.all([loadLetter(l.id, true), loadHandle(l.to, true), loadWall(true)])
  const removeForGood = async (l) => {
    setView({ kind: 'note', glyph: 'wait', title: 'removing' })
    const out = await removeLetter(l.id)
    if (out?.ok) { setView(null); return }
    setView({
      kind: 'note', glyph: '', title: 'it did not come down', done: true,
      text: out?.error === 'unverified' || out?.error === 'no_session' ? 'confirm your Instagram again, then try' : 'try again',
    })
  }
  const removeMine = async (l) => {
    setView({ kind: 'note', glyph: 'wait', title: 'removing' })
    const out = await ownerRemove(l.id)
    if (out?.ok) {
      setRemoved({ id: l.id, to: l.to, busy: false, said: '' })
      setView(null)
      await freshen(l)
      return
    }
    if (out?.error === 'missing') {
      setView({
        kind: 'ask', title: 'remove it for good?', yes: 'remove', aria: 'remove it for good',
        text: 'this cannot be undone, and nobody can write to your @ again.',
        onYes: () => removeForGood(l),
      })
      return
    }
    setView({ kind: 'note', glyph: '', title: 'it did not come down', text: 'try again', done: true })
  }
  const undoMine = async () => {
    const r = removed
    if (!r || r.busy) return
    setRemoved({ ...r, busy: true, said: '' })
    const out = await ownerRestore(r.id)
    if (out?.ok) {
      setRemoved(null)
      setView(null)
      await freshen(r)
      return
    }
    setRemoved({ ...r, busy: false, said: 'try again' })
  }

  // ── the writer takes it back ──
  // The owner's ruling of 29 September: the person who wrote a letter can
  // take it back down, at any time while it stands (0074
  // `wall_writer_remove`). `take it back` on the menu asks first, on the
  // screen, `take it back?`, the act on the left key and `keep it` on the
  // right, since a letter coming off the wall is not something a thumb
  // should do by landing on the wrong row; and then it is down, the screen
  // says `taken back.`, and `undo` puts it back where it was for as long as
  // the screen stands (the server keeps the way back for a day, and the
  // account's list and the wall's own card after a post offer it too). The
  // same `removed` state and face as the owner's, marked as the writer's.
  const takeBack = (l) => {
    setView({
      kind: 'ask', title: 'take it back?', yes: 'take it back', aria: 'take it back off the wall',
      text: 'it comes off the wall now. you can put it back for a day.',
      onYes: async () => {
        setView({ kind: 'note', glyph: 'wait', title: 'taking it back' })
        const out = await withdraw(l.id)
        if (out?.ok) {
          setRemoved({ id: l.id, to: l.to, busy: false, said: '', who: 'writer' })
          setView(null)
          return
        }
        setView({
          kind: 'note', glyph: '', title: out?.error === 'gone' ? 'it is already down' : 'it did not come down', done: true,
          text: out?.error === 'gone' ? '' : 'try again',
        })
      },
    })
  }
  const undoTakeBack = async () => {
    const r = removed
    if (!r || r.busy) return
    setRemoved({ ...r, busy: true, said: '' })
    const out = await unwithdraw(r.id, r.to)
    if (out?.ok && out.status === 'pending') { setRemoved({ ...r, busy: false, held: true }); return }
    if (out?.ok) { setRemoved(null); setView(null); return }
    if (out?.error === 'expired') { setRemoved({ ...r, busy: false, done: true, said: 'the day to put it back is over.' }); return }
    setRemoved({ ...r, busy: false, said: 'try again' })
  }
  // Handed to the memoised screen through a ref, so the prop is the same
  // function on every render and a card that has not changed is not drawn
  // again for it (`LetterScreen`, the perf notes above)
  const takeRef = useRef(takeBack)
  takeRef.current = takeBack
  const onTakeBack = useCallback((l) => takeRef.current(l), [])
  // what the removed screen's keys do, with the state it draws
  const removedAt = removed ? {
    ...removed, onUndo: removed.who === 'writer' ? undoTakeBack : undoMine, onLeave: leave, leaveLabel: upLabel,
  } : null
  const aside = cold
    ? <><LetterBrand onWall={onWall} /><LetterX label={upLabel} /></>
    : <LetterX label={upLabel} />
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
    setThread(false)
    setLaid(true)
  }

  // The letters under a name, when that is what the address named.
  const forHandle = handle ? lettersFor(handle) : []
  const id = byId ? param : (forHandle[0]?.id || null)

  const one = byId
    ? letter(id)
    : (knowsHandle(handle) ? (forHandle[0] || null) : undefined)

  // ── the card's thread ──
  // Read here, once, for the card and never for a neighbour: its count and
  // its envelope are the card's key's and status row's (`Handset`), and the
  // sheet it raises stands over the whole glass and not in the card
  // (Replies.jsx `ThreadSheet`), so it is drawn by the sheet and not by the
  // phone. The sheet is lit with the letter's own light, its colours handed
  // to it here, since it stands outside the phone that has them.
  const th = useThread(one && one.body != null ? one : null)
  const threadOn = !!one && one.body != null && th.on
  const oneId = one ? one.id : ''
  const oneLook = one ? one.look : null
  const sheetSkin = useMemo(() => {
    if (!oneId) return null
    const colour = colourOf(oneLook, oneId)
    const s = skinOf(colour)
    return { kind: s.kind, vars: skinVars(colour, !!s.print) }
  }, [oneLook, oneId])

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
  // what was last written to the strip, which is written again to a screen
  // that comes to stand on it while it moves (the effect after the landing)
  const wrote = useRef(null)
  // the frame a hand has asked for, and where it will put the card
  const frame = useRef(0)
  const want = useRef(0)
  // the three screens' heights, and the foot under them, read once as the
  // strip starts to move (`measure`)
  const tall = useRef(null)
  const silent = silentRef
  // a turn running on, and where it is going, which a hand or a key that
  // comes before it has landed lands at once, where it is seen (`landNow`);
  // where that leaves the card; a spring, a lean or a bump, which a hand can
  // catch; and the strip's measure while any of them is under way
  const busy = useRef(false)
  const turning = useRef(null)
  const carry = useRef(null)
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
  // the strip after that comes up out of the dark (`Cell`), and is drawn
  // when the page is idle (`admit`)
  const opened = useRef(false)
  const born = useRef(0)
  useEffect(() => { opened.current = true; born.current = performance.now() }, [])
  const after = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
  const hold = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  // the lean, put off for this sheet: a hand or a key got there first
  const leaned = useRef(false)
  const hush = () => { leaned.current = true; clearTimeout(nudgeAt.current); nudgeAt.current = 0 }
  useEffect(() => () => {
    hold()
    clearTimeout(nudgeAt.current)
    clearTimeout(unfling.current)
    cancelAnimationFrame(frame.current)
    stripMoving(false)
  }, [])

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

  // The strip with the card at `x`. Each screen is lit and sized by how far
  // from the middle it stands: at rest that is the stylesheet's own numbers,
  // and between two rests the one leaving goes to sleep as the one arriving
  // wakes. Each shrinks toward its near edge, so the gap between two screens
  // stays the gap.
  //
  // It never carries a thread. It used to: a hand that took a phone slid
  // open on its thread sideways folded the thread shut as it went, by how far
  // the card had gone. The replies are a sheet over the room now, and while
  // it is up the deck does not turn at all (the sheet, below), so a turn only
  // ever moves phones with nothing out.
  //
  // Nothing is read here, and the track's height is not written. It used to
  // follow the strip from this card's height toward the neighbour's, read off
  // the neighbour on every report of the hand, and a read after a write is a
  // layout forced on the spot: one for every report, which is more often than
  // a phone draws, and each moved the screens inside their own layers, so a
  // print was pulled through its press again on every frame. Every screen on
  // the track stands on its middle, so the track can keep the card's height
  // while they move and take the next card's once it has landed, and nothing
  // on the strip is seen to change; only the foot under it moves, and it is
  // carried there (the landing, below).
  const place = (x, transition = 'none') => {
    if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0 }
    const G = geo()
    dx.current = x
    wrote.current = { x, transition }
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
  }
  // Where a hand puts the card, written on the frame's own clock: a hand
  // reports as often as it likes, and the strip is written once a frame, at
  // the last place it reported.
  const placeSoon = (x) => {
    dx.current = x
    want.current = x
    if (frame.current) return
    frame.current = requestAnimationFrame(() => { frame.current = 0; place(want.current) })
  }
  // Back to what the stylesheet draws: nothing written on any of the three.
  const rest = () => {
    if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0 }
    wrote.current = null
    const c = cells()
    for (const el of [c.card, c.prev, c.next]) {
      if (!el) continue
      el.style.transition = ''
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.opacity = ''
    }
    dx.current = 0
  }
  // and still: the measure is read again next time, since the window may
  // have changed under a strip at rest, and what landed meanwhile is drawn
  // (strip.js)
  const settled = () => {
    settling.current = false
    measured.current = null
    tall.current = null
    if (stage.current) delete stage.current.dataset.moving
    stripMoving(false)
  }
  // The three heights, read as the strip starts to move and before anything
  // is written to it on that frame, so the read costs nothing, for the foot
  // to be carried by when the next card lands.
  const measure = () => {
    if (tall.current) return
    const c = cells()
    const h = (el) => (el && el.firstElementChild ? el.firstElementChild.offsetHeight : 0)
    const up = stage.current && stage.current.parentElement
    tall.current = {
      card: h(c.card), prev: h(c.prev), next: h(c.next),
      foot: up ? up.querySelector(':scope > .wl-foot') : null,
    }
  }
  // The strip starts to move. What lands meanwhile waits (strip.js); a
  // screen still coming up out of the dark is let be at its light, since the
  // strip is about to give it one (`Cell`); the heights are read; and a
  // screen still to come beside the card is drawn now, since the hand may be
  // about to want it (`admit`).
  const wake = () => {
    stripMoving(true)
    const c = cells()
    for (const el of [c.card, c.prev, c.next]) {
      if (el && el.getAnimations) for (const a of el.getAnimations()) a.cancel()
    }
    admit(true)
    measure()
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
    place(x)
    return x
  }
  // A turn still running on, caught by a hand or asked for again by a key:
  // it lands at once, where it is seen, and whatever caught it has the card
  // it was bringing in from there. It used to be let run on, and the hand or
  // the key was ignored until it had, so a second throw a moment after the
  // first did nothing at all. Returns where the new card stands.
  const landNow = () => {
    const t = turning.current
    if (!t || closing.current) return null
    const { card } = cells()
    let x = dx.current
    try { if (card) x = new DOMMatrixReadOnly(getComputedStyle(card).transform).m41 } catch { /* the last place written stands */ }
    place(x)
    if (landing.current) { landing.current(); landing.current = null }
    hold()
    carry.current = x + t.dir * geo().span
    silent.current = true
    flushSync(() => go('letter', t.target))
    if (turning.current) {
      // the address did not change after all: the strip is let go of
      turning.current = null
      carry.current = null
      busy.current = false
      rest()
      settled()
      return null
    }
    return dx.current
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
    stripMoving(true)
    place(-dir * 16, `transform 150ms ${EASE_OUT}, opacity 150ms ${EASE_OUT}`)
    after(160, () => place(0, `transform 420ms ${EASE_HOME}, opacity 420ms ${EASE_HOME}`))
    after(600, () => { rest(); settled() })
  }

  // Run on to the neighbour in `dir` (1 next, -1 previous), from wherever the
  // card is, at the speed a hand let it go at, and change the address once
  // it has landed.
  const slide = (dir, { from = null, v = 0, ms: fixed = TURN_MS } = {}) => {
    // a key or a wheel while a hand holds the card is the hand's to finish
    if (closing.current || (drag.current && from == null)) return
    // and nothing turns the deck while the replies are up: the sheet is
    // what is being read, and it is laid down first (the sheet, below)
    if (threadRef.current) return
    // a phone still settling from its replies is let finish first
    if (sliding.current) finishQ()
    // and one while a turn is still running on lands it, and turns again
    // from where it was seen: a key pressed twice is two letters
    if (turning.current) {
      if (from != null) return
      const x = landNow()
      if (x != null) slideRef.current(dir, { from: x, ms: fixed })
      return
    }
    if (busy.current) return
    hush()
    const side = dir > 0 ? nextCard : prevCard
    if (!side) { bump(dir); return }
    const x0 = from == null ? catchStrip() : from
    const focused = document.activeElement
    const k = focused && focused.closest ? focused.closest('.wl-letter-card .wl-sk') : null
    // by what the key is and not where it stands, since the heart and the
    // bubble share one place on the band (`is-heart`, `is-thread`,
    // `is-options`); a key with none of those is found by its place
    keyed.current = k ? (['is-heart', 'is-thread', 'is-options', 'is-l', 'is-c', 'is-r'].find((n) => k.classList.contains(n)) || '') : ''
    if (view) setView(null)
    turned()
    if (reduce) { hold(); settled(); silent.current = true; go('letter', side.target); return }
    busy.current = true
    wake()
    if (stage.current) stage.current.dataset.moving = dir > 0 ? 'next' : 'prev'
    const G = geo()
    place(x0)
    // a flush, so a screen that has only just come to stand beside the card
    // has somewhere to move FROM: a transition set on an element that has
    // never been styled does not run, it arrives
    if (track.current) void track.current.offsetWidth
    const to = -dir * G.span
    const { ms, ease } = v > 0 ? handoff(Math.abs(to - x0), v, SLIDE_MIN, SLIDE_MAX) : { ms: fixed, ease: EASE_SLIDE }
    place(to, `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`)
    turning.current = { dir, target: side.target }
    run.current = { dir, from: x0, to, ms, ease, t0: performance.now() }
    // and the screen past the neighbour is drawn while it runs (`ahead`)
    unidle(aheadAt.current)
    const n = turnNo.current
    aheadAt.current = idle(() => { aheadAt.current = 0; setAhead({ dir, from: param, n }) })
    // The address changes when the neighbour has arrived, which is the end
    // of its own travel and not a clock started beside it: a phone that
    // drops the first frame of a turn starts the travel late, and a landing
    // timed from the press cut the last of it off and jumped. The clock is
    // only the fallback, for a travel that never reports its end. The change
    // is drawn there and then, before the next frame, so there is never a
    // frame between the travel's end and the card that has landed.
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
      flushSync(() => go('letter', side.target))
    }
    if (arriving) arriving.addEventListener('transitionend', onEnd)
    landing.current = unland
    after(ms + 320, land)
    // and should the address not change after all, the strip is let go of
    // rather than left running on to nothing
    after(ms + 1200, () => { unland(); busy.current = false; turning.current = null; run.current = null; rest(); settled() })
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
    stripMoving(true)
    place(0, `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}`)
    after(ms + 20, () => { rest(); settled() })
  }

  // ── the landing ──
  // The card that has just taken the glass. The strip is put back to rest
  // before paint, and since every screen on it keeps its element, the one
  // that landed is already where rest puts it, and so is the one that left:
  // nothing is seen to change. A card that came by another way (a link, the
  // history) is put down the same way, and whatever was under way is let go.
  // A turn landed early (`landNow`) is put down where it was seen instead,
  // for whatever landed it; the screen past the new card is drawn when that
  // hand or key moves it (`wake`), and not for a hand that only stops it.
  useLayoutEffect(() => {
    hold()
    if (landing.current) { landing.current(); landing.current = null }
    if (aheadAt.current) { unidle(aheadAt.current); aheadAt.current = 0 }
    turnNo.current += 1
    const was = turning.current
    const t = tall.current
    turning.current = null
    run.current = null
    // the letter that landed arrives with its replies down, and nothing a
    // sheet wrote is left on it or on the one that left
    sliding.current = null
    clearQ(true)
    // the screen drawn ahead of the turn travelled in on its own (the effect
    // below); it stands beside the card now, where the stylesheet puts it
    const fe = farEl.current
    if (fe && fe.getAnimations) for (const a of fe.getAnimations()) a.cancel()
    farEl.current = null
    rest()
    busy.current = false
    silent.current = false
    const x = carry.current
    carry.current = null
    if (x != null) {
      tall.current = null
      place(x)
    } else settled()
    // ── and the foot goes with it ──
    // The track took the new card's height on this frame, and nothing on the
    // strip moved, since every screen on it stands on its middle; what stands
    // under the strip moved by half the difference, and is carried there
    // from where it stood.
    if (was && t && t.foot && t.foot.isConnected && !reduce && typeof t.foot.animate === 'function') {
      const h1 = was.dir > 0 ? t.next : t.prev
      const d = h1 && t.card ? (h1 - t.card) / 2 : 0
      if (Math.abs(d) >= 1) {
        t.foot.animate(
          [{ transform: `translate3d(0, ${(-d).toFixed(1)}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
          { duration: 300, easing: EASE_SLIDE },
        )
      }
    }
    const k = keyed.current
    keyed.current = ''
    const key = k && track.current ? track.current.querySelector(`:scope > .wl-letter-card .wl-sk.${k}`) : null
    if (key && !key.disabled) key.focus({ preventScroll: true })
    // and the neighbour a mouse or the focus is on, which may have changed
    // under a key or a pointer that did not move (`reaim`)
    reaim()
  }, [param]) // eslint-disable-line react-hooks/exhaustive-deps

  // A screen that comes to stand on the strip while it is written to (the
  // one past the card, drawn for a hand) is written to with the rest. And the
  // one drawn ahead of a turn joins the strip where it would have been had it
  // been there from the start, two screens along, off the glass, and travels
  // in with it on the same curve, from the same moment: it arrives beside the
  // new card as the card lands, the way the next phone on a table is simply
  // there when the one before it is moved, and never appears or fades in.
  const run = useRef(null)
  const slid = useRef(new WeakSet())
  useLayoutEffect(() => {
    const w = wrote.current
    if (w) place(w.x, w.transition)
    const f = track.current ? track.current.querySelector(':scope > [data-side="far"]') : null
    farEl.current = f
    const r = run.current
    if (!f || !r || slid.current.has(f) || typeof f.animate !== 'function') return
    slid.current.add(f)
    const G = geo()
    const at = (x) => `translate3d(${(x + 2 * r.dir * G.span).toFixed(2)}px, 0, 0) scale(${G.scale})`
    f.style.transition = 'none'
    f.style.transformOrigin = r.dir > 0 ? '0% 50%' : '100% 50%'
    f.style.opacity = String(G.dim)
    const a = f.animate([{ transform: at(r.from) }, { transform: at(r.to) }], { duration: r.ms, easing: r.ease, fill: 'forwards' })
    // on the card's own clock where it can be read, since the card's travel
    // began on a frame and not on the call that asked for it
    const { card } = cells()
    const lead = card && card.getAnimations ? card.getAnimations().find((t) => t.transitionProperty === 'transform') : null
    a.currentTime = lead && lead.currentTime != null ? lead.currentTime : Math.min(r.ms, performance.now() - r.t0)
  })

  // ── the lean ──
  // The first two times a device opens the deck, and until it has turned it
  // once, the card leans toward the next letter a little after the screen has
  // woken, and comes home: the next one is seen to be there, and which way
  // it is. Never under reduced motion, never over a menu, and anything a hand
  // or a key does first puts it off for this sheet.
  const nudge = () => {
    nudgeAt.current = 0
    leaned.current = true
    if (busy.current || settling.current || drag.current || closing.current || viewRef.current || threadRef.current) return
    if (!cells().next) return
    const s = getState()
    if (s.turned || (s.hinted || 0) >= NUDGES) return
    patch({ hinted: (s.hinted || 0) + 1 })
    settling.current = true
    stripMoving(true)
    place(-NUDGE_PX, `transform 380ms ${EASE_OUT}, opacity 380ms ${EASE_OUT}`)
    after(440, () => place(0, `transform 680ms ${EASE_HOME}, opacity 680ms ${EASE_HOME}`))
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

  // ── the sheet ───────────────────────────────────────────────────────────────
  // The card's replies (Replies.jsx `ThreadSheet`, whose head says what it is
  // made of). On a phone a press on the card's right soft key raises a sheet
  // from the foot of the glass, and on the same clock the letter's phone
  // rises and steps back until the whole of it stands in the room left
  // between the close mark and the sheet's edge, square to the eye and still
  // lit, the way a reel stands over its comments. Past half its size it
  // steps back no further: it stands at the top, and the sheet covers its
  // foot. In a wide room, or on a phone on its side, a sheet dragged up from
  // the bottom of the glass is a phone gesture on furniture, so the letter
  // slides to the left and the replies stand at its right as a panel as tall
  // as it is, rising into place as it slides. Either way the neighbours go
  // dark, the turn keys go and the foot under the card fades, and the deck
  // does not turn: while the replies are up they are what is being read.
  //
  // At rest the stylesheet draws both, down or up, off the numbers measured
  // here (`fitThread`: `--o-*` on the sheet's room for the letter, `--th-*`
  // on the replies); a press only changes which (`thread`), and the letter
  // and the replies run on one length and one curve, so they move as one
  // thing. A hand, on the letter or on the sheet, writes the same transforms
  // straight to them instead (`writeQ`), at `q` between down (0) and up (1),
  // and hands them back to the stylesheet once they have come to rest.
  // Anything that catches them moving catches them where they are SEEN
  // (`readQ`).
  const room = useRef(null)
  const og = useRef(null)
  const sliding = useRef(null)
  const qFrame = useRef(0)
  const sheetEl = useRef(null)
  const liveSet = () => {
    const { card } = cells()
    return card ? card.querySelector('.wl-set') : null
  }
  const liveKey = () => {
    const set = liveSet()
    return set ? set.querySelector('.wl-sk.is-thread') : null
  }
  // The numbers the letter and the replies stand at, off the window as it is
  // now (above says what they are). While a field on the sheet has a phone's
  // keys, the sheet rides up over them by what they cover (`--o-kb`, the
  // visual viewport's own maths) and is held short enough that its head
  // stays under the close mark, and the letter behind it stays where it is;
  // a panel on a phone on its side stands in what the keys leave instead.
  const fitThread = () => {
    const root = room.current
    const sheet = sheetEl.current
    const set = liveSet()
    const card = set && set.closest('.wl-letter-card')
    const up = set && set.querySelector(':scope > .wl-set-up')
    if (!root || !up || !card || !sheet) return null
    const W0 = window.innerWidth
    const H = window.innerHeight
    const desk = deskRoom()
    const h = up.offsetHeight
    const w = up.offsetWidth
    // where the card stands in the window, off the layout, which the strip's
    // and the sheet's own transforms do not move
    let x = 0
    let y = 0
    for (let el = card; el && !el.classList.contains('wl-sheet-wrap'); el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop }
    const cx = x + card.offsetWidth / 2
    const mark = root.parentElement && root.parentElement.parentElement
      ? root.parentElement.parentElement.querySelector(':scope > .wl-letter-x') : null
    const top0 = (mark ? mark.offsetTop + mark.offsetHeight : 54) + 10
    const vv = window.visualViewport
    const a = document.activeElement
    const typing = !!(a && sheet.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName))
    const kb = typing && vv ? Math.max(0, Math.round(H - vv.height - vv.offsetTop)) : 0
    const rz = parseFloat(set.style.getPropertyValue('--q-rz')) || 0
    const put = (el, k, v) => el.style.setProperty(k, v)
    let g
    if (!desk) {
      let S = Math.max(SHEET_MIN, Math.min(Math.round(H * SHEET_SHARE), H - top0 - LETTER_LEAST))
      // a letter at half its size that the sheet would cover a sliver of
      // (its key band cut through the middle) is given the room back, as
      // far as the sheet can spare it
      const short = h * LETTER_MIN - (H - S - top0 - LETTER_GAP)
      if (short > 0) S -= Math.max(0, Math.min(Math.ceil(short), S - Math.max(SHEET_MIN, Math.round(H * SHEET_LEAST))))
      const left = H - S - top0 - LETTER_GAP
      const s = Math.min(1, Math.max(LETTER_MIN, left / h))
      const top = top0 + Math.max(0, (left - h * s) / 2)
      const held = kb ? Math.max(SHEET_MIN * 0.6, Math.min(S, Math.round((vv ? vv.height : H) - top0))) : S
      g = { desk, dx: 0, dy: Math.round(top - y), s, h, w, rz, S: held }
      put(sheet, '--th-h', `${held}px`)
      put(sheet, '--o-kb', `${kb}px`)
    } else {
      const W = Math.round(Math.min(PANEL_W[1], Math.max(Math.min(PANEL_W[0], W0 * 0.5), W0 - 2 * ROOM_EDGE - PANEL_GAP - w)))
      const s = Math.min(1, (W0 - 2 * ROOM_EDGE - PANEL_GAP - W) / w, (H - 2 * ROOM_EDGE) / h)
      const pw = w * s
      const ph = h * s
      const x0 = (W0 - (pw + PANEL_GAP + W)) / 2
      const edge = Math.min(ROOM_EDGE, Math.round(H * 0.04))
      let PH = Math.round(Math.min(Math.max(PANEL_H, ph), H - 2 * edge))
      let PY = Math.round(Math.max(edge, Math.min(H - edge - PH, (H - PH) / 2)))
      if (kb && vv) {
        PH = Math.min(PH, Math.round(vv.height - 16))
        PY = Math.round(vv.offsetTop + Math.max(8, (vv.height - PH) / 2))
      }
      g = { desk, dx: Math.round(x0 + pw / 2 - cx), dy: Math.round((H - ph) / 2 - y), s, h, w, rz, S: PH }
      put(sheet, '--th-w', `${W}px`)
      put(sheet, '--th-h', `${PH}px`)
      put(sheet, '--th-x', `${Math.round(x0 + pw + PANEL_GAP)}px`)
      put(sheet, '--th-y', `${PY}px`)
      put(sheet, '--o-kb', '0px')
    }
    put(root, '--o-dx', `${g.dx}px`)
    put(root, '--o-dy', `${g.dy}px`)
    put(root, '--o-s', g.s.toFixed(4))
    og.current = g
    return g
  }
  // how far up the replies are SEEN to be, off the letter's own travel,
  // which is plain pixels and never a share of anything laid out
  const readQ = () => {
    const g = og.current
    const set = liveSet()
    const up = set && set.querySelector(':scope > .wl-set-up')
    const was = threadRef.current ? 1 : 0
    if (!g || !up) return was
    const k = (v) => Math.max(0, Math.min(1, v))
    try {
      const m = new DOMMatrixReadOnly(getComputedStyle(up).transform)
      if (Math.abs(g.dy) >= Math.abs(g.dx) && Math.abs(g.dy) > 2) return k(m.m42 / g.dy)
      if (Math.abs(g.dx) > 2) return k(m.m41 / g.dx)
      if (g.s < 0.99) return k((1 - m.a) / (1 - g.s))
    } catch { /* what the state says stands */ }
    return was
  }
  // The letter and the replies at `q`, written straight to them, on `tr` (a
  // length and a curve) or at once. `peers` is how the neighbours and the
  // foot under the card fade with them; the strip never moves while the
  // replies are up, so it is always given. The sheet is written by how far
  // it has left to rise, the panel by how far it has left to rise into
  // place and how faint it still is. A `q` past up (a sheet pulled up past
  // its rest) takes the sheet a little further up, and its foot goes on
  // under the glass (replies.css), so there is never a gap under it.
  const writeQ = (q, tr = 'none', peers = null) => {
    const g = og.current
    const set = liveSet()
    if (!g || !set) return
    const up = set.querySelector(':scope > .wl-set-up')
    const sheet = sheetEl.current
    const k = Math.max(0, Math.min(1, q))
    const move = tr === 'none' ? 'none' : `transform ${tr}`
    set.style.transition = move
    set.style.transform = `rotate(${(g.rz * (1 - k)).toFixed(3)}deg)`
    if (up) {
      up.style.transition = move
      up.style.transform = `translate3d(${(g.dx * q).toFixed(2)}px, ${(g.dy * q).toFixed(2)}px, 0) scale(${(1 - (1 - g.s) * q).toFixed(4)})`
    }
    if (sheet) {
      sheet.style.visibility = 'visible'
      if (g.desk) {
        // coming up, the panel's light follows a beat behind its rise, so
        // it fades up over a room the neighbour beside the letter has
        // already gone dark in, and never shows it through half its glass
        const ms = parseFloat(tr) || 0
        const fade = tr === 'none' ? '' : k > 0.5
          ? `opacity ${Math.round(ms * 0.8)}ms ${EASE_OUT} ${Math.round(ms * 0.2)}ms`
          : `opacity ${tr}`
        sheet.style.transition = tr === 'none' ? 'none' : `transform ${tr}, ${fade}`
        sheet.style.transform = `translate3d(0, ${((1 - k) * PANEL_RISE).toFixed(2)}px, 0)`
        sheet.style.opacity = k.toFixed(3)
      } else {
        sheet.style.transition = move
        sheet.style.transform = `translate3d(0, ${((1 - q) * g.S).toFixed(2)}px, 0)`
      }
    }
    const root = room.current
    if (root) {
      for (const el of root.querySelectorAll(':scope > .wl-letter-light')) {
        el.style.transition = move
        el.style.transform = `translate3d(${(g.dx * k).toFixed(1)}px, ${(g.dy * k * 0.5).toFixed(1)}px, 0)`
      }
    }
    if (peers == null) return
    if (root) {
      const foot = root.querySelector(':scope > .wl-foot')
      if (foot) { foot.style.transition = peers; foot.style.opacity = (1 - k).toFixed(3) }
    }
    const G = geo()
    const c = cells()
    for (const el of [c.prev, c.next]) {
      if (!el) continue
      el.style.transition = peers
      el.style.opacity = (G.dim * (1 - k)).toFixed(3)
    }
  }
  // and back to the stylesheet: nothing written on any phone on the strip or
  // on the replies, nor, with `peers`, on the neighbours and the foot
  const clearQ = (peers = false) => {
    if (qFrame.current) { cancelAnimationFrame(qFrame.current); qFrame.current = 0 }
    const t = track.current
    if (t) {
      for (const el of t.querySelectorAll('.wl-set, .wl-set-up')) {
        el.style.transition = ''
        el.style.transform = ''
      }
      if (peers) {
        for (const el of t.querySelectorAll(':scope > .wl-letter-slot')) { el.style.transition = ''; el.style.opacity = '' }
      }
    }
    const sheet = sheetEl.current
    if (sheet) {
      sheet.style.transition = ''
      sheet.style.transform = ''
      sheet.style.visibility = ''
      sheet.style.opacity = ''
    }
    const root = room.current
    if (root) {
      for (const el of root.querySelectorAll(':scope > .wl-letter-light')) { el.style.transition = ''; el.style.transform = '' }
      const foot = peers ? root.querySelector(':scope > .wl-foot') : null
      if (foot) { foot.style.transition = ''; foot.style.opacity = '' }
    }
  }
  // ── the run ──
  // Up (1) or down (0) from wherever they are SEEN: pinned there, the page
  // told which it is going to (so the replies are reachable, or not, from
  // the first frame), and then written on their way on one length and one
  // curve, and handed back to the stylesheet when they land. A hand's let go
  // leaves at the hand's speed (`handoff`); a press takes the sheet's own
  // length, OPEN_MS up and SHUT_MS down, since going away is quicker, cut
  // short by how little is left when a press catches it moving. The
  // neighbours go dark quickly as it rises and come back a beat after it
  // starts down. Under reduced motion there is no travel at all: the letter
  // stands where it is going, and the replies cross fade (replies.css).
  const runQ = (to, { v = 0, from = null } = {}) => {
    const g = fitThread()
    if (!g) return
    // the strip's measure, read now, while the page has just been measured
    // for the sheet and nothing has been written since: read inside the
    // first write (`writeQ`, for the neighbours' light) it made the browser
    // style the page once for that and again for the press
    geo()
    const q = from == null ? readQ() : from
    hold()
    writeQ(q, 'none', 'none')
    const open = !!to
    // laid down with the focus on it, the focus goes to the key first, before
    // the sheet it is on stops taking it: by the grip, the black, Escape, a
    // wheel or a hand pulling it down alike
    if (!open) keyBack()
    if (open !== threadRef.current || laid) {
      threadRef.current = open
      flushSync(() => { setThread(open); setLaid(false) })
    }
    if (reduce) { sliding.current = null; clearQ(true); if (!open) setLaid(true); return }
    void liveSet()?.offsetWidth
    const travel = g.desk ? Math.max(Math.abs(g.dx), 120) : g.S
    const left = Math.abs(to - q)
    const { ms, ease } = v > 0
      ? (to ? handoff(left * travel, v, 240, OPEN_MS) : handoff(left * travel, v, 200, SHUT_MS))
      : { ms: Math.round((to ? OPEN_MS : SHUT_MS) * Math.max(0.4, left)), ease: EASE_SLIDE }
    const peers = to
      ? `opacity ${Math.min(g.desk ? 140 : 180, ms)}ms ${EASE_OUT}`
      : `opacity 240ms ${EASE_OUT} ${Math.round(ms * 0.4)}ms`
    sliding.current = { to }
    writeQ(to, `${ms}ms ${ease}`, peers)
    after(ms + (to ? 30 : 280), () => { sliding.current = null; clearQ(true); if (!to) setLaid(true) })
  }
  // one still under way, landed where it was going, for a turn of the deck
  // that comes as it lands
  const finishQ = () => {
    if (!sliding.current) return
    hold()
    sliding.current = null
    clearQ(true)
    if (!threadRef.current) setLaid(true)
  }

  // ── up, and down ──
  // A press on the key, Enter or Space on it, two fingers down over the
  // letter, or the letter pushed up. Raised by a press, the thread's list
  // takes the focus (not its field: a keyboard coming up would cover the
  // replies), and laid down, the focus goes back to the key. A press on the
  // key, on the grip or anywhere off the sheet while it moves turns it round
  // where it is.
  const canSlide = () => {
    if (busy.current || turning.current || closing.current || drag.current || settling.current) return false
    const set = liveSet()
    return !!(set && set.classList.contains('has-thread') && sheetEl.current)
  }
  const openThread = (by = 'press') => {
    if (!canSlide() || (threadRef.current && !sliding.current)) return
    hush()
    runQ(1)
    if (by !== 'wheel') {
      const list = sheetEl.current && sheetEl.current.querySelector('.wl-low-list')
      if (list) list.focus({ preventScroll: true })
    }
  }
  // the focus, on the sheet or the black round it, handed to the key
  const keyBack = () => {
    const sheet = sheetEl.current
    const a = document.activeElement
    if (a && ((sheet && sheet.contains(a)) || a.classList.contains('wl-th-room'))) {
      const key = liveKey()
      if (key && key.focus) key.focus({ preventScroll: true })
      else if (a.blur) a.blur()
    }
  }
  const shutThread = () => {
    if (!threadRef.current) return
    keyBack()
    if (!canSlide()) { flushSync(() => { setThread(false); setLaid(true) }); threadRef.current = false; return }
    runQ(0)
  }
  const openRef = useRef(openThread)
  openRef.current = openThread
  const shutRef = useRef(shutThread)
  shutRef.current = shutThread
  const toggleThread = () => {
    const s = sliding.current
    if (s ? s.to : threadRef.current) shutThread()
    else openThread('press')
  }
  // Escape lays the replies down before it closes the letter, and on the
  // sheet it goes back a step first (the terms, the school's door; the field
  // takes its own, Replies.jsx). Laid down from the keyboard, the focus goes
  // to the key even when what had it has already gone from the page (a
  // reply reported, folded under its flag). All of it here, on the letter's
  // one listener (parts.jsx `Sheet`), and never on a second of the sheet's
  const onEscape = () => {
    if (!threadRef.current) return false
    const sheet = sheetEl.current
    const back = sheet && !sheet.classList.contains('is-read') ? sheet.querySelector('[data-low-back]') : null
    if (back) { back.click(); return true }
    const a = document.activeElement
    const key = !a || a === document.body || !a.isConnected ? liveKey() : null
    if (key) key.focus({ preventScroll: true })
    shutThread()
    return true
  }
  // While they are up the window can change under them (a phone turned, a
  // keyboard up), and they are measured again (`fitThread` says what a
  // keyboard does to them).
  useEffect(() => {
    if (!thread) return undefined
    const sheet = sheetEl.current
    const vv = window.visualViewport
    const fit = () => {
      if (busy.current || drag.current || sliding.current) return
      fitThread()
    }
    window.addEventListener('resize', fit)
    if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit) }
    document.addEventListener('focusin', fit)
    document.addEventListener('focusout', fit)
    return () => {
      window.removeEventListener('resize', fit)
      if (vv) { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit) }
      document.removeEventListener('focusin', fit)
      document.removeEventListener('focusout', fit)
      if (sheet) sheet.style.setProperty('--o-kb', '0px')
    }
  }, [thread]) // eslint-disable-line react-hooks/exhaustive-deps

  // The arrow keys turn the deck, on a keyboard, and never while the replies
  // are up. Not while a field has the keys: the reply being written keeps
  // its arrows for its caret. A menu on the screen keeps its own arrows too
  // (screen.jsx `ScreenMenu`).
  const canTurn = !!(nextTo || prevTo)
  const canTurnRef = useRef(canTurn)
  canTurnRef.current = canTurn
  useEffect(() => {
    if (!canTurn) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || threadRef.current) return
      const tg = e.target
      if (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); slideRef.current(1, { ms: KEY_MS }) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); slideRef.current(-1, { ms: KEY_MS }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canTurn])

  // ── a trackpad, or a wheel ──
  // Two fingers sideways turn the deck one letter a swipe, the way they turn
  // a page. The glide a trackpad keeps sending after the fingers lift is part
  // of the same swipe, so once a swipe has turned the deck it turns nothing
  // more until the wheel goes quiet, or until a delta rises again, which a
  // glide does not do and a new swipe does. Taken out of the browser's
  // hands (a listener that is not passive, which React's own is), since a
  // sideways swipe left to it is the history going back, and the letter
  // closing under the hand.
  //
  // Up and down over the letter, the same wheel raises and lays down its
  // replies, once a gesture: scrolled down over the phone, the replies come
  // up, and scrolled up anywhere off the sheet while they are up, they go
  // down. Over the sheet itself the wheel only ever scrolls the thread. And
  // while they are up, sideways turns nothing, and is still kept from the
  // browser, for whom it is the history going back.
  useEffect(() => {
    let acc = 0
    let locked = false
    let quiet = 0
    let last = 0
    let at = 0
    let vacc = 0
    let vlocked = false
    let vquiet = 0
    const onWheel = (e) => {
      if (e.ctrlKey) return
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerWidth : 1
      const x = e.deltaX * unit
      const y = e.deltaY * unit
      if (y && Math.abs(y) > Math.abs(x) * 1.2) {
        const tg = e.target
        if (!tg || !tg.closest || tg.closest('.wl-th')) return
        if (!tg.closest('.wl-letter-card .wl-set.has-thread > .wl-set-up, .wl-th-room')) return
        e.preventDefault()
        clearTimeout(vquiet)
        vquiet = setTimeout(() => { vlocked = false; vacc = 0 }, 220)
        if (vlocked) return
        vacc += y
        if (Math.abs(vacc) < 30) return
        const down = vacc > 0
        vacc = 0
        if (down && !threadRef.current) { vlocked = true; openRef.current('wheel') }
        else if (!down && threadRef.current) { vlocked = true; shutRef.current() }
        return
      }
      if (!canTurnRef.current) return
      if (!x || Math.abs(x) <= Math.abs(y) * 1.2) return
      e.preventDefault()
      if (threadRef.current) return
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
    return () => { window.removeEventListener('wheel', onWheel); clearTimeout(quiet); clearTimeout(vquiet) }
  }, [])

  // ── the swipe ──
  // A hand on the card takes the strip sideways, a finger or a mouse, and
  // on a phone with a thread behind it, takes the phone up and down. The
  // axis is decided on the first few pixels, sideways winning a diagonal,
  // since turning is the commoner act. Sideways, the stage keeps the pointer
  // wherever it goes, only the first finger counts, and the click a drag ends
  // in is swallowed, so a drag let go of over a soft key does not heart the
  // letter or open its menu. A mouse over a turnable deck selects no words
  // (wall.css): the card is a thing that is picked up. A hand that comes down
  // while a turn is still running on catches it (`landNow`).
  //
  // Up and down, the hand has the letter, one to one, and its replies come
  // up from the foot of the glass with it (`writeQ`); let go past three
  // tenths of the way, or pushed, and they run on up at the speed they were
  // let go at, and short, they go down again. Past either end it gives, less
  // the further it is pulled. While they are up the letter is under a press
  // that lays them down (`backdrop`, below), and the sheet takes its own
  // hand (the sheet under a thumb, below).
  const onDown = (e) => {
    if (!e.isPrimary || drag.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const tg = e.target
    const up = !!(tg && tg.closest && tg.closest('.wl-letter-card .wl-set.has-thread > .wl-set-up'))
    if (!canTurn && !up) return
    let ox
    if (turning.current) {
      ox = landNow()
      if (ox == null) return
    } else if (busy.current) return
    else ox = catchStrip()
    hush()
    flung.current = false
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ox, axis: '', up, s: [{ x: e.clientX, t: e.timeStamp }] }
  }
  // the replies taken up or down, by the letter or by the sheet: from where
  // they are seen, measured afresh. A hand on the letter moves the letter
  // one to one; a hand on the sheet moves the sheet one to one (`d.sheet`)
  const startQ = (d, e, my) => {
    if (busy.current || turning.current || closing.current || settling.current || Math.abs(d.ox) > 0.5) return false
    hold()
    sliding.current = null
    const q0 = readQ()
    const g = fitThread()
    if (!g) return false
    d.sy = e.clientY - Math.sign(my) * Math.max(0, Math.abs(my) - SLOP)
    const travel = d.sheet ? g.S : Math.max(Math.abs(g.dy), 120)
    d.v = { open: q0 > 0.5, q0, q: q0, travel, flick: d.sheet ? SHEET_FLICK : FLICK, s: [{ x: e.clientY, t: e.timeStamp }] }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a pointer the browser is not tracking */ }
    if (stage.current && e.pointerType === 'mouse' && !d.sheet) stage.current.dataset.grab = ''
    if (!reduce) writeQ(q0, 'none', 'none')
    return true
  }
  const moveQ = (d, e) => {
    const v = d.v
    v.s.push({ x: e.clientY, t: e.timeStamp })
    while (v.s.length > 2 && e.timeStamp - v.s[0].t > SAMPLE_MS * 2) v.s.shift()
    const T = v.travel
    const raw = v.q0 - (e.clientY - d.sy) / T
    v.q = raw < 0 ? band(raw * T, 48) / T : raw > 1 ? 1 + band((raw - 1) * T, 48) / T : raw
    v.dy = e.clientY - d.sy
    if (reduce || qFrame.current) return
    qFrame.current = requestAnimationFrame(() => { qFrame.current = 0; if (drag.current === d) writeQ(d.v.q, 'none', 'none') })
  }
  const endQ = (d, e, cancel = false) => {
    const v = d.v
    if (qFrame.current) { cancelAnimationFrame(qFrame.current); qFrame.current = 0 }
    flung.current = true
    clearTimeout(unfling.current)
    unfling.current = setTimeout(() => { flung.current = false }, 400)
    const sp = cancel ? 0 : speed(v.s, e.timeStamp)
    let to
    if (cancel) to = v.open ? 1 : 0
    else if (reduce) to = Math.abs(v.dy || 0) > 3 * SLOP ? (v.dy < 0 ? 1 : 0) : (v.open ? 1 : 0)
    else if (sp < -v.flick) to = 1
    else if (sp > v.flick) to = 0
    else to = v.open ? (v.q < 0.7 ? 0 : 1) : (v.q > 0.3 ? 1 : 0)
    // the hand's speed carries on only toward where it is going
    runQ(to, { v: Math.max(0, to ? -sp : sp), from: v.q })
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    if (!d.axis) {
      const mx = e.clientX - d.sx
      const my = e.clientY - d.sy
      if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return
      d.axis = Math.abs(mx) >= Math.abs(my) * 0.8 ? 'x' : 'y'
      if (d.axis === 'y') {
        // handed back to the glass, unless it is the phone's own
        if (!d.up || !startQ(d, e, my)) { drag.current = null; if (d.ox) spring() }
        return
      }
      if (!canTurn || threadRef.current) { drag.current = null; return }
      // a phone still settling from its replies is let finish
      finishQ()
      // the slack is not taken up: the card moves from here, and where it
      // was still giving at an end it is taken back to the pull behind it.
      // Only the slack: a phone that was busy for a moment reports a stretch
      // of travel as one move, and that travel was the hand's
      d.sx = e.clientX - Math.sign(mx) * Math.max(0, Math.abs(mx) - SLOP)
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a pointer the browser is not tracking, as scripts/preview.mjs sends */ }
      wake()
      const G = geo()
      const end = (d.ox < 0 && !nextTo) || (d.ox > 0 && !prevTo)
      if (end) d.ox = unband(d.ox, G.w / 2)
      const st = stage.current
      // moving, once: what the stylesheet draws differently while the strip
      // moves is the same either way it goes, so a hand that changes its
      // mind does not have the stage's style worked out again
      if (st && st.dataset.moving == null) st.dataset.moving = mx < 0 ? 'next' : 'prev'
      if (st && e.pointerType === 'mouse') st.dataset.grab = ''
      const sel = window.getSelection ? window.getSelection() : null
      if (sel && !sel.isCollapsed) sel.removeAllRanges()
    }
    if (d.axis === 'y') { moveQ(d, e); return }
    // every report the browser folded into this one, so a throw read off a
    // busy frame is read off the whole of it
    const t = e.timeStamp
    const ev = e.nativeEvent
    const all = ev && typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : []
    for (const p of all.length ? all : [e]) d.s.push({ x: p.clientX, t: p.timeStamp })
    while (d.s.length > 2 && t - d.s[0].t > SAMPLE_MS * 2) d.s.shift()
    d.lx = e.clientX
    const raw = d.ox + e.clientX - d.sx
    const end = (raw < 0 && !nextTo) || (raw > 0 && !prevTo)
    placeSoon(end ? band(raw, geo().w / 2) : raw)
  }
  const onUp = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (stage.current) delete stage.current.dataset.grab
    if (d.axis === 'y' && d.v) { endQ(d, e); return }
    if (d.axis !== 'x') { if (d.ox) spring(); return }
    flung.current = true
    clearTimeout(unfling.current)
    unfling.current = setTimeout(() => { flung.current = false }, 400)
    const v = speed(d.s, e.timeStamp)
    const x = dx.current
    const w = geo().w
    // Thrown, it goes one letter the way it was thrown, from the card the
    // hand took, wherever that card was when it was taken: a second throw
    // that catches a turn on its way in is the letter after, not a push home.
    // Unless the hand had carried it most of the way the other way first.
    // Let go slowly, it goes where it was taken, if that was far enough and
    // it was the hand that took it there.
    const thrown = Math.abs(v) > FLICK
    const dir = thrown ? (v < 0 ? 1 : -1) : (x < 0 ? 1 : -1)
    const to = dir > 0 ? nextTo : prevTo
    const toward = -dir * (d.lx - d.sx)
    const ok = !!to && (thrown ? toward > -COMMIT * w : Math.abs(x) > COMMIT * w && toward > 0)
    if (ok) slide(dir, { from: x, v: thrown ? Math.abs(v) : 0 })
    else spring(v)
  }
  const onCancel = (e) => {
    const d = drag.current
    if (!d || (e && e.pointerId !== d.id)) return
    drag.current = null
    if (stage.current) delete stage.current.dataset.grab
    if (d.axis === 'y' && d.v) { endQ(d, e, true); return }
    if (d.axis === 'x' || d.ox) spring()
  }
  // Safari tells the element the finger landed on that it lost the pointer
  // when the stage takes it, and that bubbles here, where it read as the
  // drag being cancelled on its first move: no letter on an iPhone could be
  // swiped. Only the stage's own counts
  const onLost = (e) => { if (e.target === e.currentTarget) onCancel(e) }
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
  // and iOS takes a drag it has not been told is ours as the start of a
  // scroll, and cancels the pointer under it: once the drag is the card's,
  // sideways or up and down raising its replies, the touch is the card's
  const gone = one === null
  useEffect(() => {
    const st = stage.current
    if (!st) return undefined
    const onTouch = (e) => { if (drag.current && (drag.current.axis === 'x' || drag.current.v) && e.cancelable) e.preventDefault() }
    st.addEventListener('touchmove', onTouch, { passive: false })
    return () => st.removeEventListener('touchmove', onTouch)
  }, [gone])
  const swipe = {
    onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp,
    onPointerCancel: onCancel, onLostPointerCapture: onLost, onClickCapture: onClick,
  }

  // ── the sheet under a thumb ──
  // The sheet is pulled down by its grip and its head, one to one with the
  // finger, and by the thread itself when the thread is at its top and the
  // finger goes down, the way every sheet of comments is let go of. Let go
  // past three tenths of the way down, or thrown down at all quickly
  // (`SHEET_FLICK`), and it goes; short, it springs back up; pulled up past
  // its rest it gives, less the further it is pulled. Caught moving, the
  // hand has it from where it is seen (`startQ`). A thread scrolled away
  // from its top scrolls, a finger going up the thread is the thread's, and
  // so is the tray, where people type. Heard on the sheet itself, since it
  // stands outside the stage, with a `touchmove` that is not passive: a
  // phone that has not been told the drag is ours begins to scroll under it
  // and takes the finger away. Only on a phone: a panel in a wide room is
  // not pulled anywhere.
  const sheetKey = threadOn && one ? one.id : ''
  const hand = useRef(null)
  hand.current = { startQ, moveQ, endQ }
  useEffect(() => {
    const el = sheetEl.current
    if (!el) return undefined
    let clear = null
    const onSheetDown = (e) => {
      if (!e.isPrimary || drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return
      if (!(threadRef.current || sliding.current) || deskRoom()) return
      const tg = e.target
      const head = tg && tg.closest ? tg.closest('.wl-th-head') : null
      const list = !head && tg && tg.closest ? tg.closest('.wl-low-list') : null
      if (!head && !list) return
      if (list && (list.scrollTop > 0 || tg.closest('textarea, input, select, a'))) return
      drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: 0, axis: '', sheet: true, list }
      // and let go of wherever it is let go, when it never became a drag
      // and so was never the sheet's to hear
      if (clear) window.removeEventListener('pointerup', clear, true)
      clear = () => { const d = drag.current; if (d && d.sheet && !d.v) drag.current = null }
      window.addEventListener('pointerup', clear, { once: true, capture: true })
    }
    const onSheetMove = (e) => {
      const d = drag.current
      if (!d || !d.sheet || e.pointerId !== d.id) return
      if (!d.v) {
        const mx = e.clientX - d.sx
        const my = e.clientY - d.sy
        if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return
        // the list's own scroll, unless it is at its top and the finger
        // goes down; the head is the sheet's whichever way it goes
        const down = my > 0 && Math.abs(my) > Math.abs(mx)
        const mine = d.list ? down && d.list.scrollTop <= 0 : Math.abs(my) >= Math.abs(mx)
        if (!mine || !hand.current.startQ(d, e, my)) { drag.current = null; return }
        d.axis = 'y'
      }
      hand.current.moveQ(d, e)
    }
    const onSheetUp = (e) => {
      const d = drag.current
      if (!d || !d.sheet || e.pointerId !== d.id) return
      drag.current = null
      if (d.v) hand.current.endQ(d, e)
    }
    const onSheetCancel = (e) => {
      const d = drag.current
      if (!d || !d.sheet || (e && e.pointerId !== d.id)) return
      drag.current = null
      if (d.v) hand.current.endQ(d, e, true)
    }
    // Safari's word that a pointer was lost, from the element under the
    // finger, is not the sheet's (the stage's `onLost` says why)
    const onSheetLost = (e) => { if (e.target === el) onSheetCancel(e) }
    const onTouch = (e) => {
      const d = drag.current
      if (d && d.sheet && d.v && e.cancelable) e.preventDefault()
    }
    // the press a drag ends in is not a press on what it ended over
    const onSheetClick = (e) => {
      if (!flung.current) return
      flung.current = false
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('pointerdown', onSheetDown)
    el.addEventListener('pointermove', onSheetMove)
    el.addEventListener('pointerup', onSheetUp)
    el.addEventListener('pointercancel', onSheetCancel)
    el.addEventListener('lostpointercapture', onSheetLost)
    el.addEventListener('touchmove', onTouch, { passive: false })
    el.addEventListener('click', onSheetClick, true)
    return () => {
      el.removeEventListener('pointerdown', onSheetDown)
      el.removeEventListener('pointermove', onSheetMove)
      el.removeEventListener('pointerup', onSheetUp)
      el.removeEventListener('pointercancel', onSheetCancel)
      el.removeEventListener('lostpointercapture', onSheetLost)
      el.removeEventListener('touchmove', onTouch)
      el.removeEventListener('click', onSheetClick, true)
      if (clear) window.removeEventListener('pointerup', clear, true)
      if (drag.current && drag.current.sheet) drag.current = null
    }
  }, [sheetKey])

  // ── the neighbour a key or a mouse is on ──
  // A mouse over a turn key, or the keyboard's focus on one, wakes the
  // neighbour behind it a little (wall.css). The stage is told which by the
  // keys themselves (`data-hover`, `data-focus`), and asked again when a turn
  // lands, since a key the pointer is still over or the focus is still on
  // says nothing then, and one that has gone says nothing at all. The
  // stylesheet used to ask with a `:has()` over the keys' `:hover` and
  // `:focus-visible`, and Chrome could not tell which changes that cared
  // about: every element added to the page or taken off it, a turn's
  // landing and the wall's discs included, was a style pass over all two
  // thousand of them.
  const sideOf = (b) => (b.classList.contains('is-next') ? 'next' : 'prev')
  const tell = (k, v) => {
    const st = stage.current
    if (!st || (st.getAttribute(k) || '') === v) return
    if (v) st.setAttribute(k, v)
    else st.removeAttribute(k)
  }
  const onAim = (e) => {
    const b = e.currentTarget
    const st = stage.current
    if (!b || !st) return
    if (e.type === 'focus') tell('data-focus', b.matches(':focus-visible') ? sideOf(b) : '')
    else if (e.type === 'blur') { if (st.getAttribute('data-focus') === sideOf(b)) tell('data-focus', '') }
    else if (e.pointerType === 'touch') return
    else if (e.type === 'pointerenter') tell('data-hover', sideOf(b))
    else if (st.getAttribute('data-hover') === sideOf(b)) tell('data-hover', '')
  }
  const reaim = () => {
    const st = stage.current
    if (!st) return
    const on = (how) => {
      for (const b of st.querySelectorAll(':scope > .wl-turn')) if (b.matches(how)) return sideOf(b)
      return ''
    }
    tell('data-focus', on(':focus-visible'))
    tell('data-hover', on(':hover'))
  }
  const aimed = { onFocus: onAim, onBlur: onAim, onPointerEnter: onAim, onPointerLeave: onAim }

  // ── which element each screen keeps ──
  // A screen is keyed by its letter, so a turn draws nothing again. A name
  // whose letters are still on their way stands as its waiting card, keyed by
  // the name, and when they land its letter takes the name's key for as long
  // as the sheet is up: the element is kept, rather than drawn again and
  // brought up out of the dark again the moment its words arrive, under a
  // hand or at rest. The card a turn lands on by its name keeps it the same
  // way.
  const alias = useRef(new Map())
  const drawnKeys = useRef(new Set())
  const keyOf = (l, name, fallback) => {
    if (l && alias.current.has(l.id)) return alias.current.get(l.id)
    const k = name ? `@${name}` : ''
    if (!l) return k || fallback
    if (k && drawnKeys.current.has(k)) { alias.current.set(l.id, k); return k }
    return l.id
  }
  // ── and the one past the neighbour ──
  // A turn lands on a card whose neighbour past it has never been drawn, and
  // drawing a screen is the dearest thing on the sheet (the words set to
  // fit, the pixels struck): done on the frame the turn landed on, it was
  // that frame dropped, and done as the next hand came down, it was the
  // first frame of that hand's drag. So it is drawn while the strip runs on
  // toward it (`ahead`), when the page is otherwise only waiting on the
  // compositor to move the strip, and it travels in with the strip (the
  // effect after the landing). A screen new to the strip any other way is
  // drawn when the page is next idle, and at once whenever a hand, a key or
  // a turn wants it before then (`wake`).
  const [, setRoom] = useState(0)
  const [ahead, setAhead] = useState(null)
  const aheadAt = useRef(0)
  const farEl = useRef(null)
  // which turn this is, so a screen drawn ahead of one turn is never drawn
  // for another that happens to leave from the same letter
  const turnNo = useRef(0)
  const shown = useRef(new Set())
  const pending = useRef([])
  const admit = (now) => {
    const ks = pending.current
    if (!ks.length) return
    for (const k of ks) shown.current.add(k)
    pending.current = []
    if (now) flushSync(() => setRoom((n) => n + 1))
    else setRoom((n) => n + 1)
  }
  // the letter past a neighbour, in the deck's own order
  const past = (c, dir) => {
    if (!c || !c.l) return null
    const ls = lettersFor(c.l.to)
    const i = ls.findIndex((x) => x.id === c.l.id)
    if (i >= 0 && ls[i + dir]) return { l: ls[i + dir], name: '' }
    const t = tiles.findIndex((x) => x.handle === c.l.to)
    const name = t >= 0 && tiles[t + dir] ? tiles[t + dir].handle : ''
    const hs = name ? lettersFor(name) : []
    return { l: hs.length ? (dir > 0 ? hs[0] : hs[hs.length - 1]) : null, name }
  }
  const waiting = []
  const strip = [
    prevCard ? { key: keyOf(prevCard.l, prevCard.handle, prevCard.target), side: -1, c: prevCard } : null,
    { key: keyOf(one, handle, String(param)), side: 0 },
    nextCard ? { key: keyOf(nextCard.l, nextCard.handle, nextCard.target), side: 1, c: nextCard } : null,
  ].filter((s) => {
    if (!s) return false
    if (!s.side || !opened.current || shown.current.has(s.key)) { shown.current.add(s.key); return true }
    waiting.push(s.key)
    return false
  })
  // the one past the neighbour a turn is running on toward: last on the
  // strip going on and first going back, so that no screen already drawn is
  // moved in the page when the turn lands
  const far = ahead && ahead.from === param && ahead.n === turnNo.current ? past(ahead.dir > 0 ? nextCard : prevCard, ahead.dir) : null
  if (far && (far.l || far.name)) {
    const s = {
      key: keyOf(far.l, far.name, far.name), side: 2 * ahead.dir,
      c: { l: far.l, handle: far.l ? null : far.name, target: far.l ? far.l.id : far.name },
    }
    if (!strip.some((x) => x.key === s.key)) {
      shown.current.add(s.key)
      if (s.side > 0) strip.push(s)
      else strip.unshift(s)
    }
  }
  // two screens are never one element
  if (strip.length > 1 && new Set(strip.map((s) => s.key)).size < strip.length) {
    strip.forEach((s) => { if (s.side) s.key = `${s.side}:${s.key}` })
  }
  pending.current = waiting
  useLayoutEffect(() => { drawnKeys.current = new Set(strip.map((s) => s.key)) })
  // The letter two away either side, whose screen is the one drawn when the
  // deck is turned onto its neighbour: its name's letters are asked for, and
  // its pixels struck (looks.js `rgbTile`, kept per letter), while the page
  // is idle and one at a time, so that drawing it later is only drawing it.
  const beyond = [past(nextCard, 1), past(prevCard, -1)]
  const warm = () => {
    for (const b of beyond) {
      if (!b) continue
      if (b.name && !knowsHandle(b.name)) loadHandle(b.name)
      if (b.l && !skinOf(colourOf(b.l.look, b.l.id)).print) idle(() => rgbTile(b.l.id))
    }
  }
  const warmRef = useRef(warm)
  warmRef.current = warm
  const later = waiting.join(' ')
  useEffect(() => {
    let id = 0
    const draw = () => {
      if (busy.current || drag.current || settling.current) { id = idle(draw); return }
      id = 0
      admit(false)
      warmRef.current()
    }
    id = idle(draw)
    return () => { if (id) unidle(id) }
  }, [param, later])

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

  // ── and the nudge ──
  // Once somebody not signed in has read a few, a note under the card says
  // what signing in gets them (Nudge.jsx `useNudge`, which decides when, as
  // the sheet opens on this address, and remembers a `not now`).
  const note = useNudge(!isReader(), String(param || ''))

  // A letter that was here a moment ago and is not now. It is not an error and
  // it is not framed as one: a report takes a letter down on the tap, and the
  // most likely way somebody lands here is by walking back to one they or
  // somebody else just took off the wall.
  //
  // `undefined` is "not asked yet" and `null` is "asked, and it is gone". The
  // card waits rather than announcing a removal that has not happened.
  //
  // One gone letter is not a stranger's: the one its owner just removed on
  // this sheet, which is read again the moment it comes down and answers
  // gone. Its screen keeps the undo (`removedFace`).
  //
  // Nor is one its writer just took back (`takeBack`), and that one is gone
  // from under a name that may have other letters: a sheet opened on a name
  // stands on the name's newest letter, which, once the one taken back has
  // left the cache, is the next one down. So a sheet on a name whose letter
  // was just taken down here stands on the undo, as a sheet on a letter's
  // id does, until the undo is pressed or the sheet is left, and never
  // slides a letter the person did not ask for under their thumb.
  const downHere = !!removedAt && !!one && !byId && removedAt.to === handle && removedAt.id !== one.id
  if (one === null || downHere) {
    const mineGone = removedAt && (removedAt.id === param || removedAt.to === handle) ? removedFace(removedAt) : null
    return (
      <Sheet onClose={leave} onClosing={stop} labelledBy="wl-letter-h" className={wrap} aside={aside} room>
        <div className="wl-sheet-in wl-letter">
          <div className="wl-letter-card">
            <Screen
              seed={String(param)} look={null} state={woke}
              top={{ name: 'not on the wall', icon: 'lock' }}
              keys={mineGone ? mineGone.keys : { r: { label: 'back', onClick: up, aria: upLabel } }}
              live nameId="wl-letter-h"
            >
              {mineGone ? mineGone.body : <ScreenNote title="gone">that letter has come down.</ScreenNote>}
            </Screen>
          </div>
        </div>
      </Sheet>
    )
  }

  // The three on the strip (`strip`, above): the letter before, this one and
  // the letter after, each keeping its element (`keyOf`). The card is the one
  // whose address this is, lit and live; either side, the screen that letter
  // is, with its keys drawn and not pressable. A card that is an arrival and
  // not the strip landing (a link, the history) takes a beat of fade,
  // decided with the address (above), and the first card none, since it is
  // the sheet's own entrance.

  // ── what stands under the phone ──
  // Nothing, almost always: writing to them, reporting it and taking a name
  // off are in the screen's own options, sharing is the first of them, and
  // the thread is a sheet over the glass (the sheet, above, and `sheet`,
  // below). Once in a while, the nudge (`note`, above), which asks
  // and never stands in the way: the letter over it is already whole. Its
  // key goes to the one door that can keep its promise: the account, opened
  // on the Instagram DM, since an email when a letter is written to you
  // needs the @ proved, and then asked about the email (You.jsx
  // `openForAlerts`). It went to the gate, whose Google and address could
  // never send that email, and which closed back onto this letter with
  // nothing turned on. It fades while the replies are up, and comes back as
  // they go down.
  const foot = note.on ? <Nudge nudge={note} onSignIn={() => openForAlerts(go)} /> : null

  // ── the replies, over the glass ──
  // The sheet stands on the glass beside the letter's sheet rather than in
  // it (parts.jsx `Sheet` `aside`), since the letter's own entrance and the
  // card are transformed and would pin it to the card, and after the close
  // mark, which the scripts find as the first way out on the page. It is
  // keyed by the letter, so every letter's replies open on their own words.
  // While they are up a press anywhere off the sheet, on the letter or on
  // the black round it, lays them down (`backdrop`), and does nothing else:
  // only the next one reaches the room and closes the letter.
  // It never takes the focus itself (a press on a button does, and it goes
  // with the sheet), so the focus on the sheet is handed to the key.
  const backdrop = thread || !laid ? (
    <button
      type="button" className="wl-th-room" tabIndex={-1} aria-label="shut the replies"
      onMouseDown={(e) => e.preventDefault()} onClick={shutThread}
    />
  ) : null
  const sheet = threadOn && sheetSkin ? (
    <ThreadSheet
      key={one.id} ref={sheetEl} letter={one} th={th} open={thread} reduce={reduce} go={go}
      onClose={shutThread} style={sheetSkin.vars} kind={sheetSkin.kind} resting={laid}
    />
  ) : null

  // ── and what the stylesheet reads off the sheet ──
  // Whether the replies are up, whether a note stands under it, whether
  // that note is folded away with nothing beside it, and whether the card is
  // waking: said here, on the elements styled by them, and not found out by
  // the stylesheet with a `:has()`. Chrome answered each of those by styling
  // the whole page again, some two thousand elements, whenever any element
  // anywhere was added, taken away or changed a class, which on a phone was
  // a tenth of a second at the start and the end of every turn.
  const cardWoke = moved.current ? '' : woke
  const folded = note.on && !note.open && !cold

  return (
    <Sheet
      onClose={leave} onClosing={stop} onEscape={onEscape} labelledBy="wl-letter-to" room
      className={`${wrap}${thread ? ' is-slid' : ''}${note.on ? ' has-note' : ''}`} aside={<>{backdrop}{aside}{sheet}</>}
    >
      <div
        className={`wl-sheet-in wl-letter${thread ? ' is-thread' : ''}`} ref={room}
        data-waking={one && cardWoke === 'waking' ? '' : undefined}
      >
        {one ? <Lights look={one.look} seed={one.id} /> : null}
        {/* ── the card, and the letters either side of it ──
            One object, carrying everything true about the letter: when it
            went up, whether it is shut, who it is for, and the words, and
            on its right soft key its replies. Either side of it the letter
            before and the one after, asleep, a sliver at the edge of a
            phone's glass and whole in a wide room, each the same phone
            with no count on that key. The card takes the hand, and a press on
            a neighbour turns to it: over each stands a key with nothing
            drawn on it (`.wl-turn`), which is also the turn a keyboard or a
            screen reader finds. The glass is the only clip. */}
        <div
          ref={stage}
          className={`wl-letter-stage${canTurn ? ' can-turn' : ''}${cardWoke ? ' is-waking' : ''}`}
          {...swipe}
        >
          {prevTo ? (
            <button type="button" className="wl-turn is-prev" onClick={() => slide(-1)} aria-label="the letter before this one" tabIndex={thread ? -1 : undefined} {...aimed} />
          ) : null}
          <div className="wl-letter-track" ref={track}>
            {strip.map((s) => (
              <Cell key={s.key} side={s.side} fresh={opened.current} arrived={!s.side && arrived} reduce={reduce}>
                {s.side ? (
                  <Handset l={s.c.l} seed={s.c.l ? s.c.l.id : String(s.c.target || s.c.handle || '')}>
                    <LetterScreen l={s.c.l} handle={s.c.handle} seed={s.c.target} go={go} />
                  </Handset>
                ) : (
                  <Handset
                    l={one || null} seed={one ? one.id : String(param || handle || '')} live
                    open={thread} onToggle={toggleThread} th={th}
                  >
                    <LetterScreen
                      l={one || null} handle={one ? null : handle} seed={String(param)}
                      id="wl-letter-to" live go={go}
                      view={removedAt && one && removedAt.id === one.id ? { kind: 'removed', ...removedAt } : view}
                      onView={setView}
                      woke={cardWoke} onRemove={removeMine} onTakeBack={onTakeBack}
                    />
                  </Handset>
                )}
              </Cell>
            ))}
          </div>
          {nextTo ? (
            <button type="button" className="wl-turn is-next" onClick={() => slide(1)} aria-label="the letter after this one" tabIndex={thread ? -1 : undefined} {...aimed} />
          ) : null}
        </div>

        {foot || cold ? (
          <SheetFoot className={note.on ? `has-fold${folded ? ' is-folded' : ''}` : ''}>
            {foot}
            {cold ? <ViewWall onWall={onWall} /> : null}
          </SheetFoot>
        ) : null}
      </div>
    </Sheet>
  )
}

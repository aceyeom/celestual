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
// ── the deck ────────────────────────────────────────────────────────────────
// A name with more than one letter under it is a stack, and the stack is a
// DECK: every letter under the name is a card on one track, the one being
// read in the middle at full light, and the edge of the one before and the
// one after showing either side of it, a little smaller and a little dimmer,
// so the fact that there is more is on the screen and not in a number.
// A finger takes the track sideways and the cards follow it one to one, with
// give at either end of the stack, where a pull says "there is nothing
// further" by giving less; let go past a fifth of the width, or fast, and the
// next card comes to the middle, otherwise the one you had springs back. A
// row of dots under the deck says how many and which, and each is a way to
// its card; on a wide screen a chevron stands in the room either side of the
// dialog; the arrow keys do the same; and the header keeps the count.
//
// It used to be one card, with a swipe on it that nothing on the screen
// admitted to: the card took a finger and slid a beat when a turn was made,
// and the only sign there was anything to turn to was a chevron in ash
// standing on the paper's edge in a gutter twenty two pixels wide. A swipe
// nobody can see is a swipe nobody makes. So the neighbours are on the
// screen, the dots are on the screen, and the gesture moves the thing it
// looks like it moves.
//
// A turn is a route change, the same as it always was, so every letter under
// a name keeps its own address; the deck reads which card is at the middle
// off the address and slides to it, so the back button turns the deck too.
// Only the cards within two of the middle are drawn: a name with forty
// letters is forty slots on the track and five cards in them, and the track
// is the same width either way.
//
// ── it opens from the disc ──────────────────────────────────────────────────
// Pressed on the wall, the sheet opens out of the disc that was pressed with
// the card already on it (parts.jsx `Sheet`, `origin`; morph.js), and the
// words are on the card the moment the sheet is. Nothing is claimed on a deep
// link, a refresh or a back button, so all three open the ordinary way.
//
// ── the one place anything is asked for ─────────────────────────────────────
// The names are public and what was written under them is not. To a stranger
// this card arrives REDACTED — the real letter, at its real length, with every
// word struck out — and either of the product's proofs lifts it: a campus
// address, or a handle proved by the DM code (migration 0044). Nothing else on
// the index changes: the wall, the search and the counts are open to
// everybody, and a person who has just scanned a code off a card is never
// asked for anything before they have seen what this is.
//
// The redaction is drawn from the letter's own words, not from a grey block,
// because the shape of the thing has to be honest even while it is shut. And
// no readable text is in the DOM behind it.
//
// The five free letters (migration 0045) are the server's count and they are
// not drawn here any more. Five hollow marks under every card, one struck per
// letter read, put a meter on a page somebody was reading, and a meter over a
// letter is a countdown whatever it is called. The sixth card arrives sealed
// and says so on its own rule, which is the moment the fact is worth having.
//
// What is still NOT here matters as much. There is no way from a letter into
// the core service — no "find out who", no account for it, no offer of any
// kind. The door to the product opens after you have written, on the wall.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Paper, Prose, Redacted,
  Pill, Icon, Label, Face, Heart,
} from '../parts.jsx'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, normHandle,
  sinceline, atHandle, heart,
} from '../data.js'
import { mark, setAfterGate } from '../store.js'
import { cardStep } from '../seed.js'
import { isReader } from '../auth.js'
import { land } from '../morph.js'

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
//
// ── it asks the door, not the card ──
// The press used to be allowed whenever the WORDS had arrived, and since 0045
// the words arrive for anybody: five whole letters land open on a browser that
// has proved nothing. So an unverified reader pressed a heart, watched it fill,
// and had it emptied again a moment later when the server refused the same
// browser it had never let through. The glyph now asks the same question every
// other act on this surface asks — is this reader through the door — and sends
// the ones who are not to it: the same answer they were going to get, arriving
// before the count moves rather than after.
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

// ── the deck ────────────────────────────────────────────────────────────────
// How far a finger has to take the track, as a fraction of its width, or how
// fast, for the next card to come to the middle rather than the one you had
// springing back; how much of the finger the track follows past either end
// of the stack; how many pixels a press may travel and still be a tap; how
// many cards are drawn either side of the one being read; and how many
// letters a name may carry before the dots under the deck would be a
// dotted line, past which the count in the header is the count.
const TURN_FRAC = 0.2
const TURN_V = 0.45        // px per ms
const END_GIVE = 0.3
const SLOP = 6
const DRAWN = 2
const DOTS_MAX = 12

// One track, every card on it, and the finger. `n` is how many cards, `at`
// which is at the middle, `card(i)` draws the one at `i`, and `onTurn(i)`
// asks for another to be brought to the middle; the deck itself decides
// nothing about which letter is which.
//
// The track's place is one custom property, `--at`, and its offset under a
// finger is another, `--dx`; the stylesheet turns the two into one transform
// (wall.css `.wl-deck-track`), so a turn is a transition on that transform
// from wherever the finger left the track to the card that was asked for,
// with nothing measured. The one measurement is the height of the card at
// the middle, which the deck takes as its own so the sheet is the height of
// the letter being read and not of the longest letter under the name.
function Deck({ n, at, card, onTurn, label }) {
  const deck = useRef(null)
  const track = useRef(null)
  const slots = useRef([])
  const drag = useRef(null)
  const moved = useRef(0)
  const [h, setH] = useState(0)

  // The track lands on the card the address names, and the finger's offset
  // is folded into the same change of transform, so a turn that was made by
  // a swipe carries on from where the finger let go rather than snapping
  // back first. A layout effect, so both land before the frame is drawn.
  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    el.style.transition = ''
    el.style.setProperty('--at', String(at))
    el.style.setProperty('--dx', '0px')
  }, [at])

  // The deck is the height of the card at the middle. Measured, and watched,
  // because the card grows when the words land on it.
  useLayoutEffect(() => {
    const el = slots.current[at]
    if (!el) return undefined
    const read = () => setH(el.offsetHeight)
    read()
    const ro = window.ResizeObserver ? new ResizeObserver(read) : null
    if (ro) ro.observe(el)
    return () => { if (ro) ro.disconnect() }
  }, [at, n])

  // ── the finger ──
  // A touch or a pen, never a mouse: a mouse on a card is somebody about to
  // select the words on it, and on a wide screen the chevrons, the dots and
  // the arrow keys are the way through. The axis is decided on the first
  // few pixels and a vertical drag is handed back to the sheet at once
  // (`touch-action: pan-y` on the deck says the same to the browser), so a
  // long letter can still be scrolled past. Listeners go on the window for
  // the move and the release, so a finger that leaves the deck mid-swipe is
  // still the swipe.
  const onDown = (e) => {
    if (e.pointerType === 'mouse' || n < 2) return
    const d = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, axis: '' }
    drag.current = d
    moved.current = 0
    const el = track.current
    const move = (ev) => {
      if (drag.current !== d) return
      const dx = ev.clientX - d.x
      const dy = ev.clientY - d.y
      if (!d.axis) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (d.axis === 'y') { done(); return }
        if (deck.current) deck.current.classList.add('is-held')
      }
      d.dx = dx
      moved.current = Math.abs(dx)
      const end = (dx < 0 && at >= n - 1) || (dx > 0 && at <= 0)
      if (el) {
        el.style.transition = 'none'
        el.style.setProperty('--dx', `${(dx * (end ? END_GIVE : 1)).toFixed(1)}px`)
      }
    }
    const done = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      if (deck.current) deck.current.classList.remove('is-held')
      drag.current = null
    }
    const settle = () => {
      if (el) { el.style.transition = ''; el.style.setProperty('--dx', '0px') }
    }
    const up = (ev) => {
      if (drag.current !== d) return
      done()
      if (d.axis !== 'x') return
      const w = deck.current ? deck.current.clientWidth : 360
      const v = d.dx / Math.max(1, (ev.timeStamp || performance.now()) - d.t)
      const dir = d.dx < 0 ? 1 : -1
      const to = at + dir
      if ((Math.abs(d.dx) > w * TURN_FRAC || Math.abs(v) > TURN_V) && to >= 0 && to < n) {
        // the track stays where the finger left it, and the turn takes it
        // the rest of the way (the layout effect above); and if no turn
        // comes, because the address refused it, the track springs back
        if (el) el.style.transition = ''
        onTurn(to)
        window.setTimeout(() => {
          if (!drag.current && el && el.style.getPropertyValue('--dx') !== '0px') settle()
        }, 320)
      } else settle()
    }
    const cancel = () => { if (drag.current !== d) return; done(); settle() }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  // A tap on the edge of a neighbour brings it to the middle. The neighbours
  // are inert, so the tap lands on the track under them, and which side of
  // the middle it landed on is which way to turn. A tap that travelled was
  // a swipe, and a swipe has already been answered.
  const onClick = (e) => {
    if (moved.current > SLOP || n < 2) return
    const mid = slots.current[at]
    if (!mid) return
    const r = mid.getBoundingClientRect()
    if (e.clientX < r.left && at > 0) onTurn(at - 1)
    else if (e.clientX > r.right && at < n - 1) onTurn(at + 1)
  }

  const bind = (i) => (el) => { slots.current[i] = el }
  return (
    <div
      className={`wl-deck${h ? ' is-sized' : ''}`} ref={deck}
      style={h ? { '--deck-h': `${h}px` } : undefined}
      onPointerDown={onDown} onClick={onClick}
      role="group" aria-label={label}
    >
      <div className="wl-deck-track" ref={track} style={{ '--at': at, '--dx': '0px' }}>
        {Array.from({ length: n }, (_, i) => {
          const on = i === at
          const drawn = Math.abs(i - at) <= DRAWN
          return (
            <div
              key={i} ref={bind(i)}
              className={`wl-deck-slot${on ? ' is-on' : ''}`}
              inert={on ? undefined : true}
              aria-hidden={on ? undefined : true}
            >
              {drawn ? card(i) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
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

export default function Letter({ id: param, go, back }) {
  // Whether the flag has been opened. Nothing else on this sheet holds state:
  // the card is the server's, and this is one control deciding whether it is
  // showing itself or the two things it opens.
  const [flagged, setFlagged] = useState(false)
  const byId = UUID.test(String(param || ''))
  const handle = byId ? null : normHandle(param)

  // ── the disc that was pressed ──
  // Claimed once, on the first render, and only ever there: the wall left a
  // circle behind on the way out of it (morph.js) and the sheet opens out of
  // the middle of that circle. Nothing is claimed on a deep link, a refresh
  // or a back button, so all three open the ordinary way.
  const [from] = useState(() => land(handle))
  const origin = from ? { x: from.x + from.w / 2, y: from.y + from.h / 2 } : null
  const who = from ? from.handle : handle

  // The letters under a name, when that is what the address named.
  const forHandle = handle ? lettersFor(handle) : []
  const id = byId ? param : (forHandle[0]?.id || null)

  const one = byId
    ? letter(id)
    : (knowsHandle(handle) ? (forHandle[0] || null) : undefined)

  const siblings = one ? lettersFor(one.to) : forHandle
  const found = siblings.findIndex((l) => l.id === (one?.id || id))
  const at = found < 0 ? 0 : found
  const of = siblings.length

  // ── turning ──
  // By index into the stack, which the deck asks for and the keys and the
  // chevrons ask for; each becomes the address of that letter.
  const turnTo = (i) => {
    const next = siblings[i]
    if (!next || i === at) return
    setFlagged(false)
    go('letter', next.id)
  }
  const turnRef = useRef(turnTo)
  turnRef.current = turnTo

  // The arrow keys turn the stack, on a keyboard. Not while a sheet is being
  // typed into, and there is nothing to type into here.
  useEffect(() => {
    if (of < 2) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); turnRef.current(at + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turnRef.current(at - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [of, at])

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
  if (one === undefined) {
    return (
      <Sheet onClose={back} labelledBy="wl-letter-h" origin={origin}>
        <div className="wl-sheet-in wl-letter">
          <SheetHead onClose={back} label="back to the wall" />
          {/* `waiting`, not `shut`. They draw the same block of bars and they
              are not the same fact: a letter that has arrived shut is blurred,
              because it is a letter you are not close enough to, and a letter
              that has not arrived is neither shut nor open yet. */}
          <div className="wl-deck-room">
            <Deck
              n={1} at={0} onTurn={() => {}} label="the letter"
              card={() => (
                <Paper
                  dateline={{ lead: 'reading' }}
                  crest={who ? <Face handle={who} size={30} /> : null}
                  title={<span id="wl-letter-h" className="wl-letter-to">{who ? atHandle(who) : '\u00a0'}</span>}
                  tone="waiting"
                >
                  <Redacted words={22} chars={110} seed={String(param)} />
                </Paper>
              )}
            />
          </div>
        </div>
      </Sheet>
    )
  }

  if (!one) {
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
            <Pill tone="light" wide onClick={back}>back to the wall</Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const open = one.body !== null
  const toGate = () => { setAfterGate({ name: 'letter', id: one.id }); go('gate') }

  // One card of the deck: everything true about that letter, and on the one
  // at the middle the two marks a reader can leave. The crest is the person's
  // own face, the same disc the search puts in its rows and the sky puts
  // beside a ping.
  const card = (i) => {
    const l = siblings[i]
    if (!l) return null
    const here = i === at
    const lOpen = l.body !== null
    return (
      <Paper
        dateline={sinceline(l.at, lOpen ? '' : 'sealed')}
        crest={<Face handle={l.to} size={30} />}
        title={<span id={here ? 'wl-letter-to' : undefined} className="wl-letter-to">{atHandle(l.to)}</span>}
        tone={lOpen ? '' : 'shut'}
        foot={(
          /* ── the two marks a reader can leave ──
              The heart at the head of the foot and the flag at its end,
              both struck in the paper's ink, because both are marks on the
              document rather than controls on the sheet. The flag used to
              float alone under the pill, a hairline ring on the void at the
              bottom of the sheet, which is where a thing goes when nothing
              has been decided about it. It belongs to the letter: a flag
              is left ON a thing. So it is in the card's corner now, where a
              reader looking for the way to say "not this one" looks, and it
              is the size of the heart beside it rather than of a button. */
          <div className="wl-letter-marks">
            <Hearts letter={l} onGate={toGate} />
            <button
              type="button" className={`wl-flag${here && flagged ? ' is-on' : ''}`}
              onClick={() => setFlagged(!flagged)} aria-expanded={here ? flagged : undefined}
              aria-controls={here ? 'wl-flag-opts' : undefined}
              aria-label="take this off the wall" title="take this off the wall"
            >
              <Icon name="flag" size={15} />
            </button>
          </div>
        )}
      >
        {lOpen
          ? <Prose>{l.body}</Prose>
          : <Redacted words={l.words} chars={l.chars} seed={l.id} />}
      </Paper>
    )
  }

  return (
    /* Not `tall`. The floor exists so a bottom sheet does not read as a
       notification, and this one is never small: a card, a full-width pill and
       two controls. Forcing it to 62dvh on a long phone left a slab of empty
       void under the last control, which is the same "nothing has been decided
       about this space" the old header had at the other end. */
    <Sheet onClose={back} labelledBy="wl-letter-to" origin={origin}>
      <div className="wl-sheet-in wl-letter">
        <SheetHead
          onClose={back}
          label="back to the wall"
          lead={of > 1
            ? <Label tone="dim" className="wl-pager" aria-label={`letter ${at + 1} of ${of}`}>{at + 1} / {of}</Label>
            : null}
        />

        {/* ── the deck, and the ways through it ──
            The cards on their track, the neighbours showing either side of
            the one being read; on a wide screen a chevron in the room either
            side of it; and under it, one dot per letter, the one at the
            middle drawn long. */}
        <div className="wl-deck-room">
          {of > 1 && (
            <button
              type="button" className="wl-turn is-prev" disabled={at <= 0}
              onClick={() => turnTo(at - 1)} aria-label="the letter before this one" title="the letter before"
            >
              <Icon name="back" size={16} />
            </button>
          )}
          <Deck
            n={Math.max(1, of)} at={at} card={card} onTurn={turnTo}
            label={of > 1 ? `${of} letters to ${atHandle(one.to)}, swipe to read the others` : `a letter to ${atHandle(one.to)}`}
          />
          {of > 1 && (
            <button
              type="button" className="wl-turn is-next" disabled={at >= of - 1}
              onClick={() => turnTo(at + 1)} aria-label="the letter after this one" title="the letter after"
            >
              <Icon name="back" size={16} />
            </button>
          )}
        </div>
        {of > 1 && of <= DOTS_MAX && (
          <div className="wl-dots wl-deck-dots" role="tablist" aria-label="the letters under this name">
            {siblings.map((l, i) => (
              <button
                key={l.id} type="button" role="tab"
                className={`wl-dot${i === at ? ' is-on' : i < at ? ' is-done' : ''}`}
                aria-selected={i === at} aria-label={`letter ${i + 1} of ${of}`}
                onClick={() => turnTo(i)}
              />
            ))}
          </div>
        )}

        {/* ── the foot ──
            One primary, and while the flag is on, the two things somebody who
            came looking for THEMSELVES needs, standing where the primary was.
            They take its place rather than stacking under it because a person
            who has just tapped the flag is not here to write, and a foot that
            keeps offering the pill above the choice they asked for has two
            questions on it. "leave it up" is the way back, in the words the
            report screen uses for the same act. */}
        <SheetFoot>
          {flagged ? (
            /* ── what the flag opens ──
                Two rows, each a sentence in the reader's own words, and no
                cost written under either: both lead to a screen that says
                what it does before anything happens, and a menu that
                explains two irreversible acts in small grey type was asking
                somebody to read terms at the moment they least wanted to. */
            <div className="wl-flag-opts" id="wl-flag-opts">
              <button type="button" className="wl-opt" onClick={() => go('remove', one.to)}>
                <span>Take my @ down</span>
                <span className="wl-opt-go" aria-hidden="true">&#8594;</span>
              </button>
              <button type="button" className="wl-opt" onClick={() => go('report', one.id)}>
                <span>Report letter</span>
                <span className="wl-opt-go" aria-hidden="true">&#8594;</span>
              </button>
              <button type="button" className="wl-quiet" onClick={() => setFlagged(false)}>leave it up</button>
            </div>
          ) : open ? (
            <Pill tone="light" wide onClick={() => go('write', one.to)}>
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

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
// ── turning the pages ───────────────────────────────────────────────────────
// A name with more than one letter under it is a small stack, and the stack
// is turned where the letter is: a chevron either side of the card, in the
// gutters, and the card itself takes a swipe. On a phone the swipe is the
// gesture and the chevrons are what say there is more; on a desktop the
// chevrons are the control and the arrow keys do the same. The header keeps
// the count, `2 / 3`, because that is where "where am I" belongs; it used to
// carry the two small arrows as well, twenty-eight pixel rings at the far end
// of the sheet from the thing they turned, and a control for the card that is
// not on the card is a control somebody has to go looking for.
//
// A turn is a route change, the same as it always was, so every letter under
// a name keeps its own address. The card that arrives comes in from the side
// it was turned toward, a beat, and the one that left is simply gone: the
// letter is the object, and one object moving is a page turning where two
// crossing would be a carousel.
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

import { useEffect, useRef, useState } from 'react'
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
import Morph from '../Morph.jsx'

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

// ── the swipe ───────────────────────────────────────────────────────────────
// How far a finger has to travel, or how fast, for the card to turn rather
// than spring back; how much of the travel the card follows; and how much
// less it follows at the end of the stack, where there is nothing to turn to.
const TURN_PX = 64
const TURN_V = 0.45        // px per ms
const FOLLOW = 0.55
const FOLLOW_END = 0.2
const SLOP = 6

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

export default function Letter({ id: param, go, back, reduce = false }) {
  // Whether the flag has been opened. Nothing else on this sheet holds state:
  // the card is the server's, and this is one control deciding whether it is
  // showing itself or the two things it opens.
  const [flagged, setFlagged] = useState(false)
  const byId = UUID.test(String(param || ''))
  const handle = byId ? null : normHandle(param)

  // ── the disc that was pressed ──
  // Claimed once, on the first render, and only ever there: the wall left a
  // circle behind on the way out of it (morph.js) and the card grows out of
  // that circle instead of the sheet rising over it. Nothing is claimed on a
  // deep link, a refresh or a back button, so all three open the ordinary way.
  const [from] = useState(() => land(handle))
  const cardBox = useRef(null)
  const cardCrest = useRef(null)
  const flight = from
    ? <Morph from={from} handle={from.handle} card={cardBox} crest={cardCrest} reduce={reduce} />
    : null

  // The letters under a name, when that is what the address named.
  const forHandle = handle ? lettersFor(handle) : []
  const id = byId ? param : (forHandle[0]?.id || null)

  const one = byId
    ? letter(id)
    : (knowsHandle(handle) ? (forHandle[0] || null) : undefined)

  const siblings = one ? lettersFor(one.to) : forHandle
  const at = siblings.findIndex((l) => l.id === (one?.id || id))
  const of = siblings.length

  // ── turning ──
  // Which way the card that is arriving came from: set by a turn, read by
  // the card that mounts on the new id, and left alone otherwise, so a deep
  // link and a refresh open the card the ordinary way.
  const slide = useRef(0)
  const turn = (dir) => {
    const next = siblings[at + dir]
    if (!next) return
    slide.current = dir
    setFlagged(false)
    go('letter', next.id)
  }
  const turnRef = useRef(turn)
  turnRef.current = turn

  // The arrow keys turn the stack, on a keyboard. Not while a sheet is being
  // typed into, and there is nothing to type into here.
  useEffect(() => {
    if (of < 2) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); turnRef.current(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turnRef.current(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [of])

  // A finger on the card takes it sideways. The axis is decided on the first
  // few pixels and a vertical drag is handed back to the sheet at once, so
  // the card can still be scrolled past on a long phone; `touch-action:
  // pan-y` on the stage says the same thing to the browser. The card follows
  // with some resistance, and with a great deal more at the end of the stack,
  // where a pull says "there is nothing further" by giving less.
  const drag = useRef(null)
  const onDown = (e) => {
    if (e.pointerType === 'mouse' || of < 2) return
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, axis: '' }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'y') { drag.current = null; return }
    }
    d.dx = dx
    const end = (dx < 0 && at >= of - 1) || (dx > 0 && at <= 0)
    const el = cardBox.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform = `translate3d(${(dx * (end ? FOLLOW_END : FOLLOW)).toFixed(1)}px, 0, 0)`
    }
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    const el = cardBox.current
    if (el) { el.style.transition = ''; el.style.transform = '' }
    if (!d || d.axis !== 'x') return
    const v = d.dx / Math.max(1, performance.now() - d.t)
    const dir = d.dx < 0 ? 1 : -1
    if (Math.abs(d.dx) > TURN_PX || Math.abs(v) > TURN_V) turn(dir)
  }
  const swipe = of > 1
    ? { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp }
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
  if (one === undefined) {
    return (
      <>
      <Sheet onClose={back} labelledBy="wl-letter-h">
        <div className="wl-sheet-in wl-letter">
          <SheetHead onClose={back} label="back to the wall" />
          {/* `waiting`, not `shut`. They draw the same block of bars and they
              are not the same fact: a letter that has arrived shut is blurred,
              because it is a letter you are not close enough to, and a letter
              that has not arrived is neither shut nor open yet. */}
          <div className="wl-letter-stage">
          <div className="wl-letter-card" ref={cardBox}>
            <Paper
              dateline={{ lead: 'reading' }}
              crest={from ? <span className="wl-letter-crest" ref={cardCrest}><Face handle={from.handle} size={30} /></span> : null}
              title={<span id="wl-letter-h" className="wl-letter-to">&nbsp;</span>} tone="waiting"
            >
              <Redacted words={22} chars={110} seed={String(param)} />
            </Paper>
          </div>
          </div>
        </div>
      </Sheet>
      {flight}
      </>
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
  const came = slide.current > 0 ? ' is-from-right' : slide.current < 0 ? ' is-from-left' : ''

  return (
    /* Not `tall`. The floor exists so a bottom sheet does not read as a
       notification, and this one is never small: a card, a full-width pill and
       two controls. Forcing it to 62dvh on a long phone left a slab of empty
       void under the last control, which is the same "nothing has been decided
       about this space" the old header had at the other end. */
    <>
    <Sheet onClose={back} labelledBy="wl-letter-to">
      <div className="wl-sheet-in wl-letter">
        <SheetHead
          onClose={back}
          label="back to the wall"
          lead={of > 1
            ? <Label tone="dim" className="wl-pager" aria-label={`letter ${at + 1} of ${of}`}>{at + 1} / {of}</Label>
            : null}
        />

        {/* ── the card, and the two ways past it ──
            One object, carrying everything true about the letter: how long it
            has been up, whether it is shut, whose name it is under, and the
            words. The crest is the person's own face, the same disc the search
            puts in its rows and the sky puts beside a ping. Either side of it,
            in the gutters, a chevron to the letter before and the one after;
            and the card itself takes the finger. */}
        <div className="wl-letter-stage" {...swipe}>
          {of > 1 && (
            <button
              type="button" className="wl-turn is-prev" disabled={at <= 0}
              onClick={() => turn(-1)} aria-label="the letter before this one" title="the letter before"
            >
              <Icon name="back" size={16} />
            </button>
          )}
          <div className={`wl-letter-card${came}`} ref={cardBox} key={one.id}>
          <Paper
            dateline={sinceline(one.at, open ? '' : 'sealed')}
            crest={<span className="wl-letter-crest" ref={cardCrest}><Face handle={one.to} size={30} /></span>}
            title={<span id="wl-letter-to" className="wl-letter-to">{atHandle(one.to)}</span>}
            tone={open ? '' : 'shut'}
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
                <Hearts
                  letter={one}
                  onGate={() => { setAfterGate({ name: 'letter', id: one.id }); go('gate') }}
                />
                <button
                  type="button" className={`wl-flag${flagged ? ' is-on' : ''}`}
                  onClick={() => setFlagged(!flagged)} aria-expanded={flagged}
                  aria-controls="wl-flag-opts"
                  aria-label="take this off the wall" title="take this off the wall"
                >
                  <Icon name="flag" size={15} />
                </button>
              </div>
            )}
          >
            {open
              ? <Prose>{one.body}</Prose>
              : <Redacted words={one.words} chars={one.chars} seed={one.id} />}
          </Paper>
          </div>
          {of > 1 && (
            <button
              type="button" className="wl-turn is-next" disabled={at >= of - 1}
              onClick={() => turn(1)} aria-label="the letter after this one" title="the letter after"
            >
              <Icon name="back" size={16} />
            </button>
          )}
        </div>

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
            <Pill tone="light" wide
              onClick={() => { setAfterGate({ name: 'letter', id: one.id }); go('gate') }}>
              read it
            </Pill>
          )}
        </SheetFoot>
      </div>
    </Sheet>
    {flight}
    </>
  )
}

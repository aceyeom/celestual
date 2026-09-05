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
// What is left reads top to bottom in four steps at four weights: the header,
// the card, the one thing to do, and the two quiet things you can do instead.
//
// ── the one place anything is asked for ─────────────────────────────────────
// The names are public and what was written under them is not. To a stranger
// this card arrives REDACTED — the real letter, at its real length, with every
// word struck out — and a berkeley.edu address lifts it. Nothing else on the
// index changes: the wall, the search and the counts are open to everybody, and
// a person who has just scanned a code off a card is never asked for anything
// before they have seen what this is.
//
// The redaction is drawn from the letter's own words, not from a grey block,
// because the shape of the thing has to be honest even while it is shut. And
// no readable text is in the DOM behind it.
//
// What is still NOT here matters as much. There is no way from a letter into
// the core service — no "find out who", no account for it, no offer of any
// kind. The door to the product opens after you have written, on the wall.

import { useEffect } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Paper, Prose, Redacted,
  Pill, Icon, Label, Face,
} from '../parts.jsx'
import { letter, lettersFor, loadLetter, loadHandle, knowsHandle, normHandle, sinceline, atHandle } from '../data.js'
import { mark, setAfterGate } from '../store.js'

// The pager, and it lives in the header rather than under the card. It is the
// answer to "where am I", which is what a header is for; under the card it was
// a third object competing with the two controls beside it, and it pushed the
// only thing worth pressing another forty pixels down the screen.
function Pager({ at, of, go, siblings }) {
  return (
    <div className="wl-pager">
      <button type="button" className="wl-pager-b" disabled={at <= 0}
        onClick={() => go('letter', siblings[at - 1].id)} aria-label="the letter before this one">
        <Icon name="back" size={15} />
      </button>
      <Label tone="dim">{at + 1} / {of}</Label>
      <button type="button" className="wl-pager-b wl-pager-b--next" disabled={at >= of - 1}
        onClick={() => go('letter', siblings[at + 1].id)} aria-label="the letter after this one">
        <Icon name="back" size={15} />
      </button>
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
// screen, and the pager below always moves by id so every letter under a name
// still has its own address.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Letter({ id: param, go, back }) {
  const byId = UUID.test(String(param || ''))
  const handle = byId ? null : normHandle(param)

  // The letters under a name, when that is what the address named.
  const forHandle = handle ? lettersFor(handle) : []
  const id = byId ? param : (forHandle[0]?.id || null)

  const one = byId
    ? letter(id)
    : (knowsHandle(handle) ? (forHandle[0] || null) : undefined)

  const siblings = one ? lettersFor(one.to) : forHandle
  const at = siblings.findIndex((l) => l.id === (one?.id || id))

  // The letter, then the rest of its handle's letters for the pager. Two
  // requests rather than one, because a person who opened a link off a card
  // wants the letter on screen before the pager exists.
  useEffect(() => { if (byId) loadLetter(param) }, [byId, param])
  useEffect(() => { if (handle) loadHandle(handle) }, [handle])
  useEffect(() => { if (one) loadHandle(one.to) }, [one])

  useEffect(() => { if (one) mark('opened', one.id) }, [one])

  // A letter that was here a moment ago and is not now. It is not an error and
  // it is not framed as one: a report takes a letter down on the tap, and the
  // most likely way somebody lands here is by walking back to one they or
  // somebody else just took off the wall.
  //
  // `undefined` is "not asked yet" and `null` is "asked, and it is gone". The
  // card waits rather than announcing a removal that has not happened.
  if (one === undefined) {
    return (
      <Sheet onClose={back} labelledBy="wl-letter-h">
        <div className="wl-sheet-in wl-letter">
          <SheetHead onClose={back} label="back to the wall" />
          <Paper dateline={{ lead: 'reading' }} title={<span id="wl-letter-h" className="wl-letter-to">&nbsp;</span>} tone="shut">
            <Redacted words={22} chars={110} seed={String(param)} />
          </Paper>
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
            <Pill tone="light" wide icon={<Icon name="wall" size={17} />} onClick={back}>back to the wall</Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const open = one.body !== null

  return (
    /* Not `tall`. The floor exists so a bottom sheet does not read as a
       notification, and this one is never small: a card, a full-width pill and
       two controls. Forcing it to 62dvh on a long phone left a slab of empty
       void under the last control, which is the same "nothing has been decided
       about this space" the old header had at the other end. */
    <Sheet onClose={back} labelledBy="wl-letter-to">
      <div className="wl-sheet-in wl-letter">
        <SheetHead
          onClose={back}
          label="back to the wall"
          lead={siblings.length > 1
            ? <Pager at={at} of={siblings.length} go={go} siblings={siblings} />
            : null}
        />

        {/* ── the card ──
            One object, carrying everything true about the letter: how long it
            has been up, whether it is shut, whose name it is under, and the
            words. The crest is the person's own face, the same disc the search
            puts in its rows and the sky puts beside a ping. */}
        <Paper
          dateline={sinceline(one.at, open ? '' : 'sealed')}
          crest={<Face handle={one.to} size={30} />}
          title={<span id="wl-letter-to" className="wl-letter-to">{atHandle(one.to)}</span>}
          tone={open ? '' : 'shut'}
        >
          {open
            ? <Prose>{one.body}</Prose>
            : <Redacted words={one.words} chars={one.chars} seed={one.id} />}
        </Paper>

        {/* ── the foot ──
            One primary, and under it the two things somebody who came looking
            for THEMSELVES needs. Those two are set at the same quiet weight as
            each other and well below the pill, because between them they are
            the answer for about one reader in twenty — and for that one reader
            they have to be in plain sight rather than in a menu. */}
        <SheetFoot>
          {open ? (
            <Pill tone="light" wide icon={<Icon name="write" size={17} />} onClick={() => go('write', one.to)}>
              write one to {atHandle(one.to)}
            </Pill>
          ) : (
            /* The gate. It names no policy and gives no reasons: the card
               beside it already says SEALED, and a person who has not decided
               to open it does not need the argument for why it is shut. */
            <Pill tone="light" wide icon={<Icon name="key" size={17} />}
              onClick={() => { setAfterGate({ name: 'letter', id: one.id }); go('gate') }}>
              read it
            </Pill>
          )}

          <div className="wl-letter-quiet">
            {/* The way off the wall, standing beside the name it is about, on
                the screen where somebody who came looking for themselves has
                just found what they came for. */}
            <button type="button" className="wl-mine" onClick={() => go('remove', one.to)}>
              this is me
            </button>
            {/* And the way to take THIS ONE down, which is a different act with
                a different cost and belongs beside it rather than buried. It is
                not hidden from a stranger: a control that only appears once you
                are signed in is a control nobody knows exists. */}
            <button type="button" className="wl-mine" onClick={() => go('report', one.id)}>
              report it
            </button>
          </div>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

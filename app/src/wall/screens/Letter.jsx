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
// What is still NOT here matters as much. There is no way from a letter into
// the core service — no "find out who", no account for it, no offer of any
// kind. The door to the product opens after you have written, on the wall.

import { useEffect, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Paper, Prose, Redacted,
  Pill, Icon, Label, Face, Heart, Allowance,
} from '../parts.jsx'
import {
  letter, lettersFor, loadLetter, loadHandle, knowsHandle, normHandle,
  sinceline, atHandle, heart, gated, freeReads,
} from '../data.js'
import { mark, setAfterGate } from '../store.js'
import { cardStep } from '../seed.js'
import { isReader } from '../auth.js'

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
  // Whether the flag has been opened. Nothing else on this sheet holds state:
  // the card is the server's, and this is one control deciding whether it is
  // showing itself or the two things it opens.
  const [flagged, setFlagged] = useState(false)
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
      <Sheet onClose={back} labelledBy="wl-letter-h">
        <div className="wl-sheet-in wl-letter">
          <SheetHead onClose={back} label="back to the wall" />
          {/* `waiting`, not `shut`. They draw the same block of bars and they
              are not the same fact: a letter that has arrived shut is blurred,
              because it is a letter you are not close enough to, and a letter
              that has not arrived is neither shut nor open yet. */}
          <Paper dateline={{ lead: 'reading' }} title={<span id="wl-letter-h" className="wl-letter-to">&nbsp;</span>} tone="waiting">
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
            <Pill tone="light" wide onClick={back}>back to the wall</Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const open = one.body !== null

  // ── the five ──
  // Every browser reads five whole letters before it is asked for anything
  // (migration 0045). The meter is drawn only for somebody the five still
  // apply to: a person through the gate is not counting anything, and drawing
  // them five hollow marks would be inventing a limit they do not have.
  //
  // Both facts are the server's, off the read that drew this card. Nothing
  // here counts, and nothing here decides: `open` above is still the only
  // thing that says whether the words came.
  const free = gated() === false ? freeReads() : null

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
          ) : (
          <>
          {/* ── how many are left, over the one thing to do ──
              Five marks, struck as they go, and no sentence beside them until
              the last one. It stands above the pill rather than beside it
              because on this screen the pill is the whole width, and it is
              drawn whether the card is open or shut: seeing the fourth mark go
              out while you are still reading is what makes the fifth not a
              surprise. Nothing here is a countdown to a paywall. It is a
              statement of how much of somebody else's wall this browser has
              been handed without being asked for anything. */}
          {free ? (
            <Allowance
              left={free.left} limit={free.limit} kind="reads" reading={open}
              className="wl-letter-free"
            />
          ) : null}

          {open ? (
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
          </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

// ── /beta/letter/:id — THE LETTER ───────────────────────────────────────────
//
// A cream card rising off the bottom edge over a wall that stays visible and
// dimmed behind it, and on a wide screen a card centred in the middle of it.
// Both come straight off the reference: the journal's paper card with its
// dateline, and the modal that dims what is behind it rather than replacing it.
//
// ── the one place anything is asked for ─────────────────────────────────────
// The names are public and what was written under them is not. To a stranger
// this card arrives REDACTED — the real letter, at its real length, with every
// word struck out — and a berkeley.edu address lifts it. Nothing else on the
// surface changes: the wall, the search, the counts and the composer are open
// to everybody, and a person who has just scanned a code off a card is never
// asked for anything before they have seen what this is.
//
// The redaction is drawn from the letter's own words, not from a grey block,
// because the shape of the thing has to be honest even while it is shut. And
// no readable text is in the DOM behind it.
//
// An earlier build gated a SECOND HALF of each letter on proving the handle it
// was about, which meant a stranger thirty seconds off a card was being asked
// to prove an identity to finish a sentence. That is gone and is not what this
// is: there is one letter, it is whole, and the only question is whether you
// are from the campus it is about.
//
// What is still NOT here matters as much. There is no way from a letter into
// the core service — no "find out who", no account for it, no offer of any
// kind. The door to the product opens after you have written, on the wall.

import { useEffect } from 'react'
import { Sheet, Paper, Prose, Redacted, Label, Pill, Rule, Icon, Close } from '../parts.jsx'
import { Mark } from '../art.jsx'
import { letter, lettersFor, dateline, ago, atHandle } from '../data.js'
import { isMember } from '../auth.js'
import { mark } from '../store.js'

export default function Letter({ id, go, back }) {
  const one = letter(id)
  const siblings = one ? lettersFor(one.to) : []
  const at = siblings.findIndex((l) => l.id === id)

  useEffect(() => { if (one) mark('opened', one.id) }, [one])

  if (!one) {
    return (
      <Sheet onClose={back}>
        <div className="wl-sheet-in wl-letter">
          <div className="wl-letter-top"><Close onClick={back} /></div>
          <Label tone="dim">that letter is gone</Label>
        </div>
      </Sheet>
    )
  }

  const open = isMember()

  return (
    <Sheet onClose={back} tall labelledBy="wl-letter-to">
      <div className="wl-sheet-in wl-letter">
        <div className="wl-letter-top"><Close onClick={back} /></div>

        <Paper
          dateline={dateline(one.at)}
          title={<span id="wl-letter-to" className="wl-letter-to">{atHandle(one.to)}</span>}
          tone={open ? '' : 'shut'}
        >
          {open ? <Prose>{one.body}</Prose> : <Redacted text={one.body} />}
        </Paper>

        {/* the pager — only where a name actually carries more than one */}
        {siblings.length > 1 && (
          <div className="wl-pager">
            <button type="button" className="wl-pager-b" disabled={at <= 0}
              onClick={() => go('letter', siblings[at - 1].id)} aria-label="the letter before this one">
              <Icon name="back" size={16} />
            </button>
            <Label tone="dim">{at + 1} / {siblings.length}</Label>
            <button type="button" className="wl-pager-b wl-pager-b--next" disabled={at >= siblings.length - 1}
              onClick={() => go('letter', siblings[at + 1].id)} aria-label="the letter after this one">
              <Icon name="back" size={16} />
            </button>
          </div>
        )}

        <div className="wl-letter-meta">
          <Mark handle={one.to} size={26} />
          <Label tone="dim">{ago(one.at)}</Label>
          {/* The way off the wall, standing beside the name it is about, on the
              screen where somebody who came looking for themselves has just
              found what they came for. It is not buried in a footer and it does
              not lead to a form. */}
          <button type="button" className="wl-mine" onClick={() => go('remove', one.to)}>
            this is me
          </button>
        </div>

        <Rule />

        <div className="wl-letter-acts">
          {open ? (
            <Pill tone="light" wide icon={<Icon name="write" size={17} />} onClick={() => go('write', one.to)}>
              write one to {atHandle(one.to)}
            </Pill>
          ) : (
            /* The gate, and it is the only thing on the card that is asking for
               anything. It says what it opens and what it does not, and it is
               under the letter rather than over it: the shape of what is being
               withheld should be visible before anybody decides whether to
               answer for it. */
            <div className="wl-shut">
              <Label tone="dim">letters open for berkeley.edu</Label>
              <Pill tone="light" wide icon={<Icon name="key" size={17} />} onClick={() => go('gate')}>
                read it
              </Pill>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

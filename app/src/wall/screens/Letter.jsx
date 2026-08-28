// ── /beta/letter/:id — THE LETTER ───────────────────────────────────────────
//
// A cream card rising off the bottom edge over a wall that stays visible and
// dimmed behind it, and on a wide screen a card centred in the middle of it.
// Both come straight off the reference: the journal's paper card with its
// dateline, and the modal that dims what is behind it rather than replacing it.
//
// ── the whole letter, to anybody, with nothing asked ────────────────────────
// It is public and it is complete. An earlier build kept a second line that
// only the person the letter was about could open, which meant the wall had to
// know who you were, which meant a stranger who had scanned a card thirty
// seconds earlier was being asked to prove a handle before they could finish
// reading. That is the moment the whole thing fell over, and it is gone: there
// is no hidden half, no claim, no verification, and nothing here to sign in to.
//
// What is NOT here matters as much. There is no way from a letter into the
// core service — no "find out who", no account, no offer of any kind. Reading
// costs nothing and leads nowhere but more reading, or writing one yourself.
// The door to the product opens after you have written, on the wall, once.

import { useEffect } from 'react'
import { Sheet, Paper, Prose, Label, ArrowLink, Pill, Rule, Icon } from '../parts.jsx'
import { Mark } from '../art.jsx'
import { letter, lettersFor, dateline, ago, atHandle } from '../data.js'
import { mark } from '../store.js'

export default function Letter({ id, go, back }) {
  const one = letter(id)
  const siblings = one ? lettersFor(one.to) : []
  const at = siblings.findIndex((l) => l.id === id)

  useEffect(() => { if (one) mark('opened', one.id) }, [one])

  if (!one) {
    return (
      <Sheet onClose={back}>
        <div className="wl-sheet-in">
          <Label tone="dim">that letter is gone</Label>
          <div className="wl-gap" />
          <ArrowLink onClick={back}>back to the wall</ArrowLink>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-letter-to">
      <div className="wl-sheet-in wl-letter">
        <Paper
          dateline={dateline(one.at)}
          title={<span id="wl-letter-to" className="wl-letter-to">{atHandle(one.to)}</span>}
        >
          <Prose>{one.body}</Prose>
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
          <Label tone="dim">{ago(one.at)} · unsigned</Label>
        </div>

        <Rule />

        <div className="wl-letter-acts">
          <Pill tone="light" wide icon={<Icon name="write" size={17} />} onClick={() => go('write', one.to)}>
            write one to {atHandle(one.to)}
          </Pill>
          <ArrowLink tone="quiet" size="s" onClick={back}>back to the wall</ArrowLink>
        </div>
      </div>
    </Sheet>
  )
}

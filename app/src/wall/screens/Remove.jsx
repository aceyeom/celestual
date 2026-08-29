// ── /beta/remove/:handle — OFF THE WALL ─────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ONE SCREEN THAT ASKS FOR NOTHING AT ALL.                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Putting a handle on a public wall says, in public, that this person is being
// written about. Nobody on that wall agreed to be there. So the way back off
// has to cost less than being on it does, and everything about this screen is
// that one sentence:
//
//   · no account, and no offer of one
//   · no address, no code, no inbox to go and check
//   · no form, no reason to give, no category to pick
//   · no queue, no review, no "we will look into this within five days"
//   · one tap, and the name and every letter under it are gone before the
//     sheet has finished animating
//
// A takedown behind a sign-up is a takedown that says "make an account first"
// to the one person on the wall who never chose to be on it. That is worse
// than no takedown, because it looks like one.
//
// ── the objection, answered ─────────────────────────────────────────────────
// Anybody can take down anybody. That is the right trade and it is not close.
// A wrong removal costs one name off a wall and can be asked for again; a slow
// one costs somebody the ability to get their own name off a public page about
// them, for as long as it takes. The check that would fix it is a check that a
// person is who they say, and every honest version of that is a login, which
// is the exact thing that must not stand in the way. The place for the proof
// is AFTERWARDS, on the way back on.

import { useState } from 'react'
import { Sheet, Display, Label, Pill, Close, Prose, HandleField } from '../parts.jsx'
import { Mark, Sparkle } from '../art.jsx'
import { atHandle, isRemoved, lettersFor, normHandle, removeHandle, validHandle } from '../data.js'

export default function Remove({ handle: prefill, back }) {
  const [value, setValue] = useState(() => prefill || '')
  const [gone, setGone] = useState(null)
  const h = normHandle(value)
  const count = h ? lettersFor(h).length : 0
  const ok = validHandle(h) && !isRemoved(h)

  const take = () => {
    if (!ok) return
    setGone({ handle: h, n: removeHandle(h) })
  }

  // ── done ──
  // It has already happened. No confirmation to accept, nothing to check an
  // inbox for, and no undo offered — an undo on this control would mean the
  // removal was never real.
  if (gone) {
    return (
      <Sheet onClose={back} labelledBy="wl-rm-h">
        <div className="wl-sheet-in wl-remove">
          <div className="wl-remove-top">
            <Sparkle size={13} className="wl-remove-spark" />
            <Close onClick={back} />
          </div>
          <Display size="s" as="h2" id="wl-rm-h">It&rsquo;s off the wall.</Display>
          <div className="wl-remove-gone">
            <Label tone="dim">
              <span className="wl-h">{atHandle(gone.handle)}</span>
            </Label>
            <Prose className="wl-gate-copy">
              {gone.n === 0
                ? 'The name is gone, and it cannot be put back up.'
                : `${gone.n === 1 ? 'The one letter' : `All ${gone.n} letters`} under it went with it, and the name cannot be put back up.`}
            </Prose>
          </div>
          <div className="wl-push" />
          <div className="wl-gate-foot">
            <Pill tone="light" wide onClick={back}>done</Pill>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={back} labelledBy="wl-rm-h">
      <div className="wl-sheet-in wl-remove">
        <div className="wl-remove-top">
          <Sparkle size={13} className="wl-remove-spark" />
          <Close onClick={back} />
        </div>

        <Display size="s" as="h2" id="wl-rm-h">
          Take a name<br />off the wall.
        </Display>

        <Prose className="wl-gate-copy">
          If it is yours, it comes off. There is nothing to prove and nobody to ask.
        </Prose>

        <div className="wl-remove-field">
          <HandleField
            value={value} onChange={setValue} onSubmit={take}
            autoFocus={!prefill} size="lg" placeholder="yourhandle"
          />
        </div>

        {/* What is about to happen, said before it happens rather than in a
            dialogue afterwards. The count is the whole of it. */}
        <div className="wl-remove-what" aria-live="polite">
          {isRemoved(h) ? (
            <Label tone="dim">that name is already off the wall</Label>
          ) : validHandle(h) ? (
            <div className="wl-remove-row">
              <Mark handle={h} size={28} />
              <Label tone="dim">
                {count === 0 ? 'no letters, and no way back on'
                  : count === 1 ? 'one letter goes with it. no way back on'
                  : `${count} letters go with it. no way back on`}
              </Label>
            </div>
          ) : null}
        </div>

        <div className="wl-push" />

        <div className="wl-gate-foot">
          <Pill tone="light" wide disabled={!ok} onClick={take}>take it down</Pill>
        </div>
      </div>
    </Sheet>
  )
}

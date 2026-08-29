// ── /beta/remove/:handle — OFF THE WALL ─────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ONE ACTION ON THIS SURFACE THAT NOBODY CAN UNDO.                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Putting a handle on a public wall says, in public, that this person is being
// written about. Nobody on that wall agreed to be there, and the way back off
// has to cost them less than being on it does. That principle has not moved.
// What moved is WHICH way off this screen is.
//
// There are two, and they are not the same act:
//
//   ONE LETTER    reported, and off the wall on the tap (screens/Report.jsx).
//                 Nothing is proven, nothing is asked, nothing is destroyed,
//                 and a desk can put it back. That is the fast door and it is
//                 the one almost everybody wants — including, most of the time,
//                 the person the letter is about.
//   A WHOLE NAME  this screen. The handle goes, EVERY letter written to it goes
//                 with it, the name can never be put back up, and no desk can
//                 reverse it. It is the only irreversible thing on the wall.
//
// ── why this one asks, when nothing else does ───────────────────────────────
// An earlier build made this instant too, and argued for it: a takedown behind
// a login says "make an account first" to the one person on the wall who never
// chose to be there. That argument is right about the COST and wrong about the
// asymmetry. Reporting a letter is undoable by a person at a desk in a minute.
// Emptying a name is undoable by nobody, ever, and what it destroys does not
// belong only to the person asking — it is forty letters written by people who
// are not in the room and cannot be asked.
//
// So the proof sits on the irreversible action and nowhere else, and it is
// bought as cheaply as a proof can be: not an account, not an address, not a
// form, not a queue. One question — is this handle yours — asked of the place
// the handle actually lives, answered once, and thrown away (auth.js
// `verifyHandle`). Nothing about the account is read and nothing is stored
// beside the handle.
//
// And the person who genuinely just wants a letter about them gone is never
// sent here to get it: they tap `report it` on the letter, it is down, and this
// screen is not in their way.
//
// ── what this screen still refuses ──────────────────────────────────────────
// No reason to give. No category. No queue and no "we will look into this
// within five days". No offer of an account on the way past, and no second
// thing asked once the first is answered. The handoff is the whole of it, and
// once it comes back the name comes off before the sheet has finished moving.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, Prose, HandleField, Waiting,
} from '../parts.jsx'
import { Mark, Sparkle, Provider } from '../art.jsx'
import { atHandle, isRemoved, lettersFor, normHandle, removeHandle, validHandle } from '../data.js'
import { isVerified, verifyHandle } from '../auth.js'

export default function Remove({ handle: prefill, back }) {
  const [value, setValue] = useState(() => prefill || '')
  const [asking, setAsking] = useState(false)   // the handoff is out
  const [gone, setGone] = useState(null)
  // Set on the way IN as well as cleared on the way out. React's StrictMode
  // mounts, unmounts and remounts every component in development: a flag that
  // is only ever cleared in the teardown is false for the whole life of the
  // second mount, and the handoff comes back to a screen that has decided it is
  // gone. It sat on "asking instagram…" for ever and nothing in the console
  // said why.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const h = normHandle(value)
  const count = h ? lettersFor(h).length : 0
  const named = validHandle(h) && !isRemoved(h)
  // Proven once per handle and remembered, so somebody who came back for a
  // second name is asked again and somebody who reloaded on the same one is
  // not. A proof that has to be repeated inside one sitting is a proof that has
  // become a password.
  const proven = named && isVerified(h)

  const ask = () => {
    if (!named || asking) return
    setAsking(true)
    verifyHandle(h).finally(() => { if (alive.current) setAsking(false) })
  }

  const take = () => {
    if (!proven) return
    setGone({ handle: h, n: removeHandle(h) })
  }

  const head = <SheetHead onClose={back} label="back to the wall"
    lead={<Sparkle size={13} className="wl-head-spark" />} />

  // ── done ──
  // It has already happened. No confirmation to accept, nothing to check an
  // inbox for, and no undo offered — an undo on this control would mean the
  // removal was never real.
  if (gone) {
    return (
      <Sheet onClose={back} labelledBy="wl-rm-h">
        <div className="wl-sheet-in wl-remove">
          {head}
          <Display size="s" as="h2" id="wl-rm-h">It&rsquo;s off the wall.</Display>
          <div className="wl-remove-gone">
            <Label tone="dim"><span className="wl-h">{atHandle(gone.handle)}</span></Label>
            <Prose className="wl-gate-copy">
              {gone.n === 0
                ? 'The name is gone, and it cannot be put back up.'
                : `${gone.n === 1 ? 'The one letter' : `All ${gone.n} letters`} under it went with it, and the name cannot be put back up.`}
            </Prose>
          </div>
          <div className="wl-push" />
          <SheetFoot><Pill tone="light" wide onClick={back}>done</Pill></SheetFoot>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-rm-h">
      <div className="wl-sheet-in wl-remove">
        {head}

        <Display size="s" as="h2" id="wl-rm-h">
          {proven ? <>It&rsquo;s yours.<br />Take it down.</> : <>Take your name<br />off the wall.</>}
        </Display>

        <Prose className="wl-gate-copy">
          {proven
            ? 'Every letter under it goes with it, and the name cannot be put back up.'
            : 'This one is permanent, so it is the one thing the wall asks about. If you only want one letter gone, report it on the letter instead — that is instant and asks nothing.'}
        </Prose>

        <div className="wl-remove-field">
          <HandleField
            value={value} onChange={setValue} onSubmit={proven ? take : ask}
            autoFocus={!prefill} size="lg" placeholder="yourhandle"
            locked={proven}
          />
        </div>

        {/* What is about to happen, said before it happens rather than in a
            dialogue afterwards. The count is the whole of it. */}
        <div className="wl-remove-what" aria-live="polite">
          {isRemoved(h) ? (
            <Label tone="dim">that name is already off the wall</Label>
          ) : validHandle(h) ? (
            <div className="wl-remove-row">
              <Mark handle={h} size={28} lit={proven} />
              <Label tone="dim">
                {count === 0 ? 'no letters · no way back on'
                  : count === 1 ? 'one letter goes with it · no way back'
                  : `${count} letters go with it · no way back`}
              </Label>
            </div>
          ) : null}
        </div>

        <div className="wl-push" />

        <SheetFoot>
          {proven ? (
            <Pill tone="light" wide onClick={take}>take it down</Pill>
          ) : (
            <>
              {/* ── the handoff ──
                  Drawn as a destination rather than as a security step: one
                  button, the provider's shape on the same 24-unit grid as every
                  other glyph here, and the sentence under it saying exactly
                  what is asked and what is kept. A verification screen that
                  explains itself in four bullet points has already told
                  somebody they are being processed. */}
              <Pill
                tone="light" wide disabled={!named || asking} onClick={ask}
                icon={asking ? null : <Provider size={17} />}
              >
                {asking ? 'asking instagram…' : 'prove it is yours'}
              </Pill>
              <div className="wl-remove-handoff">
                {asking ? <Waiting label="waiting on instagram" /> : null}
                {/* Short enough to be set as a label. The monospace here is
                    letterspaced and upper-cased, which is right for an
                    identifier and wrong for a paragraph — a two-line sentence
                    in it is a sentence nobody reads. */}
                <Label tone="dim">one question · nothing is kept</Label>
              </div>
              {/* Said plainly, on the screen, the way the gate's own note is. A
                  beta that mimes an OAuth round trip and does not say so is
                  teaching the wrong thing about what this build does. */}
              <p className="wl-gate-beta">
                This is the beta. No provider is contacted — the handoff is drawn
                on a timer and any handle will come back proven.
              </p>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

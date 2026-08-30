// ── /berkeley/write — THE COMPOSER ──────────────────────────────────────────
//
// Two steps, and they are one sentence broken across them:
//
//     step 1   Someone at Berkeley you can't forget.      ← their handle
//     step 2   And what makes them so.                    ← the letter
//
// That is the entire brief, and it is the reason the wall fills up. An earlier
// build asked "what did you never say?", which is a question about the writer:
// it asks somebody to find a regret, decide it is worth publishing, and phrase
// it — three jobs, at a table, on a phone. This asks them to think of ONE
// PERSON, which everybody can do instantly, and then say why, which is the
// part that actually makes a letter worth finding.
//
// The card is live from the first keystroke of step 2. That is the single most
// important decision on this screen: a person typing into a plain box is
// filling in a form, and a person watching their own words settle onto the
// same cream card they were reading a minute ago is writing a letter. It is
// the same component the wall renders (parts.jsx `Paper`), not a lookalike, so
// what they see here is exactly what goes up.
//
// ── the door, and what it does not change ──────────────────────────────────
// The composer is behind the same berkeley.edu address that opens the letters
// (auth.js). An anonymous letter about a named student, publishable by anybody
// on earth with a browser, is not anonymity — it is an open relay pointed at a
// person who never agreed to any of it.
//
// The address does not follow the letter anywhere. It is not read on this
// screen, it is not passed to `write`, and there is no author field in the
// corpus for it to land in (data.js) — so being let in and being known are
// still two different things, and only the first one happens here. What a
// person is asked for is a domain, once, on the way in; what the wall records
// is a handle, a body and a time.
//
// ── the screen, before the wall sees it ────────────────────────────────────
// Layer 1 of the moderation runs against every keystroke of the letter
// (moderate.js) — slurs, links, phone numbers, addresses, room numbers. It
// refuses HERE, at the keyboard, naming the thing, rather than after somebody
// has committed forty words and pressed the button. Layers 2 and 3 run on the
// next screen, where the letter is read before it is published rather than
// after.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, SheetHead, Paper, Display, Label, Pill, Locked,
  HandleField, LetterField,
} from '../parts.jsx'
import { Dots, Sparkle } from '../art.jsx'
import { normHandle, validHandle, atHandle, dateline, isRemoved } from '../data.js'
import { isMember } from '../auth.js'
import { fault } from '../moderate.js'
import { getState, patch } from '../store.js'

// Characters. Below this it is a comment rather than a letter — but the floor
// was twice this and it was wrong: at sixty, the true thing somebody actually
// wanted to say ("you gave me your umbrella and walked home in it") was being
// turned away for being short, and what got typed to clear the bar was padding.
// A letter is short because it is true. Thirty keeps a bare handle and a stray
// keystroke off the wall and lets everything else through.
const MIN_BODY = 30
const MAX_BODY = 320

export default function Write({ to: prefill, go, back }) {
  const draft = getState().draft || {}
  const [to, setTo] = useState(() => prefill || draft.to || '')
  const [body, setBody] = useState(() => draft.body || '')
  // Somebody who tapped "write one to @them" on a letter already answered the
  // first question. Unless the name they arrived with has come off the wall,
  // in which case they land on the name step and are told so, rather than on a
  // blank card addressed to somebody who is not there.
  const [step, setStep] = useState(() => (prefill && !isRemoved(prefill) ? 1 : 0))
  const first = useRef(true)

  const h = normHandle(to)
  // A name that has asked to come off the wall stays off it, and the composer
  // says so where somebody is typing it rather than after they have written
  // forty words to it.
  const off = isRemoved(h)
  // The first thing layer 1 objects to, said in words. One at a time: a list of
  // five complaints under a text box is a wall, and the writer only has to fix
  // one of them to find out whether the next one is real.
  const caught = body.trim() ? fault(body) : ''
  const ok = [validHandle(h) && !off, body.trim().length >= MIN_BODY && !caught]
  const dl = useMemo(() => dateline(Date.now()), [])

  // One draft under one key, so backing out of the sheet and coming back does
  // not cost somebody the forty words they just wrote.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    patch({ draft: { to: h, body } })
  }, [h, body])

  function next() {
    if (!ok[step]) return
    if (step === 0) { setStep(1); return }
    patch({ draft: { to: h, body: body.trim() } })
    go('posted')
  }

  // ── the door ──
  // Instead of the composer, not in front of a disabled one. A greyed-out form
  // with an explanation beside it makes somebody read a sentence to find out
  // they cannot use the thing they are looking at.
  if (!isMember()) {
    return (
      <Sheet onClose={back} labelledBy="wl-write-h">
        <div className="wl-sheet-in wl-write">
          <SheetHead onClose={back} label="back to the wall" />
          <Display size="s" as="h2" id="wl-write-h">Letters are written<br />by Berkeley.</Display>
          <div className="wl-push" />
          <Locked onOpen={() => go('gate')}>
            Your information will stay anonymous.
          </Locked>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-write-h">
      <div className="wl-sheet-in wl-write">
        <SheetHead onClose={back} label="back to the wall"
          lead={<Dots n={2} at={step} onGo={setStep} />} />

        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">
          {step === 0 ? <>Someone at Berkeley<br />you can&rsquo;t forget.</> : <>And what<br />makes them so.</>}
        </Display>

        {step === 0 ? (
          <div className="wl-write-step">
            <HandleField
              value={to} onChange={setTo} onSubmit={next}
              autoFocus size="lg" placeholder="theirhandle"
            />
            <Label tone="dim" className="wl-write-note">
              <Sparkle size={9} /> {off ? 'that name has asked to stay off the wall' : 'yours is never asked for'}
            </Label>
          </div>
        ) : (
          <div className="wl-write-step">
            <Paper
              dateline={dl}
              title={<span className="wl-letter-to">{atHandle(h)}</span>}
              tone={body.trim() ? '' : 'empty'}
            >
              <LetterField
                value={body} onChange={setBody} max={MAX_BODY} autoFocus
                placeholder="You gave me your umbrella outside Wheeler and walked home in it. I still have it."
              />
            </Paper>
            {/* One line under the card, and it is the same line whether the
                letter is too short or has tripped the screen — because to the
                person writing, both are the same fact: this is not going up
                yet, and here is the one thing to change. The fault wins, since
                a letter that is short AND has a phone number in it is not
                fixed by getting longer. */}
            <div className="wl-write-floor" aria-live="polite">
              {caught ? (
                <Label className="wl-write-caught">{caught}</Label>
              ) : body.trim().length > 0 && body.trim().length < MIN_BODY ? (
                <Label tone="dim">
                  {MIN_BODY - body.trim().length === 1
                    ? 'one more character'
                    : `${MIN_BODY - body.trim().length} more characters`}
                </Label>
              ) : null}
            </div>
          </div>
        )}

        <div className="wl-write-foot">
          {step === 1 && (
            <Pill tone="ghost" onClick={() => setStep(0)}>a different name</Pill>
          )}
          <Pill tone="light" onClick={next} disabled={!ok[step]}>
            {step === 0 ? 'next' : 'put it up'}
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}

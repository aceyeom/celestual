// ── /beta/write — THE COMPOSER ──────────────────────────────────────────────
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
// Nothing here asks who they are, and nothing records it. There is no account
// to make, no handle of their own to give, and no field for one.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, Paper, Display, Label, Pill, Close,
  HandleField, LetterField,
} from '../parts.jsx'
import { Dots, Sparkle } from '../art.jsx'
import { normHandle, validHandle, atHandle, dateline, isRemoved } from '../data.js'
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
  const ok = [validHandle(h) && !off, body.trim().length >= MIN_BODY]
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

  return (
    <Sheet onClose={back} tall labelledBy="wl-write-h">
      <div className="wl-sheet-in wl-write">
        <div className="wl-write-top">
          <Dots n={2} at={step} onGo={setStep} />
          <Close onClick={back} />
        </div>

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
            {body.trim().length > 0 && body.trim().length < MIN_BODY && (
              <Label tone="dim" className="wl-write-floor">
                {MIN_BODY - body.trim().length === 1
                  ? 'one more character'
                  : `${MIN_BODY - body.trim().length} more characters`}
              </Label>
            )}
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

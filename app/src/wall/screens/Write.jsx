// ── /beta/write — THE COMPOSER ──────────────────────────────────────────────
//
// The sheet that rises out of the gradient dock. Three steps, and the step
// dots off the bottom of the poster are the only progress indicator — a
// labelled stepper on a three-field form is chrome apologising for itself.
//
//   1. who it is for
//   2. the letter — written ON the paper, not into a box that becomes paper
//   3. the seal — the one line only they can read, and it is optional
//
// The card is live from the first keystroke of step 2. That is the single most
// important decision on this screen: a person writing into a plain textarea is
// filling in a form, and a person watching their own words settle onto the
// same cream card they were reading two minutes ago is writing a letter. Same
// component as the wall renders (parts.jsx `Paper`), not a lookalike, so what
// they see here is exactly what goes up.
//
// Nothing on this screen reaches a server, here or in the real thing, until
// step 3 is answered — a half-written letter is not a draft the wall is
// entitled to.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, Paper, Prose, Display, Label, Pill, ArrowLink,
  HandleField, LetterField, prefersReducedMotion,
} from '../parts.jsx'
import { Dots, Sparkle, Mark } from '../art.jsx'
import { normHandle, validHandle, atHandle, dateline } from '../data.js'
import { getState, patch } from '../store.js'

const MIN_BODY = 40   // characters. Below this it is a comment, not a letter.
const MAX_BODY = 260
const MAX_SEAL = 64

export default function Write({ to: prefill, go, back }) {
  const draft = getState().draft || {}
  const [to, setTo] = useState(() => prefill || draft.to || '')
  const [body, setBody] = useState(() => draft.body || '')
  const [seal, setSeal] = useState(() => draft.seal || '')
  // Somebody who tapped "write one back" on a letter already answered step 1.
  const [step, setStep] = useState(() => (prefill ? 1 : 0))
  const first = useRef(true)

  const h = normHandle(to)
  const ok = [validHandle(h), body.trim().length >= MIN_BODY, true]
  const dl = useMemo(() => dateline(Date.now()), [])

  // Kept as one draft under one key so backing out of the sheet and coming
  // back does not cost somebody the forty words they just wrote.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    patch({ draft: { to: h, body, seal } })
  }, [h, body, seal])

  function next() {
    if (!ok[step]) return
    if (step < 2) { setStep(step + 1); return }
    patch({ draft: { to: h, body: body.trim(), seal: seal.trim() } })
    go('sealed')
  }

  const HEADS = [
    'Who is it for?',
    'What did you never say?',
    'One thing only they would know.',
  ]

  return (
    <Sheet onClose={back} tall labelledBy="wl-write-h">
      <div className="wl-sheet-in wl-write">
        <div className="wl-write-top">
          <Dots n={3} at={step} onGo={setStep} />
          <Label tone="dim">{step === 2 ? 'optional' : `step ${step + 1}`}</Label>
        </div>

        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">{HEADS[step]}</Display>

        {/* ── step 1 ── */}
        {step === 0 && (
          <div className="wl-write-step">
            <HandleField
              value={to} onChange={setTo} onSubmit={next}
              autoFocus size="lg" placeholder="theirhandle"
            />
            <p className="wl-write-note">
              <Sparkle size={9} /> they are never told, and never will be
            </p>
          </div>
        )}

        {/* ── steps 2 and 3, both on the live card ──
            The card is the same object on both, and the seal simply grows a
            footer on it. Rebuilding the preview between the two steps would
            make the paper flicker at the exact moment somebody is deciding
            whether to give away the one detail that identifies them. */}
        {step > 0 && (
          <div className="wl-write-step">
            <Paper
              dateline={dl}
              title={<span className="wl-letter-to">{atHandle(h)}</span>}
              tone={body.trim() ? '' : 'empty'}
              foot={step === 2 ? (
                <div className="wl-seal is-open is-writing">
                  <Label tone="ink" className="wl-seal-cap">
                    <Sparkle size={9} tone="ink" /> sealed for <span className="wl-h">{atHandle(h)}</span>
                  </Label>
                  <input
                    className="wl-seal-input"
                    value={seal}
                    maxLength={MAX_SEAL}
                    placeholder="the detail that proves you were there"
                    aria-label="the seal"
                    onChange={(e) => setSeal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next() } }}
                  />
                </div>
              ) : null}
            >
              {step === 1
                ? <LetterField
                    value={body} onChange={setBody} max={MAX_BODY}
                    autoFocus placeholder="You gave me your umbrella outside Wheeler and walked home in it."
                  />
                : <Prose>{body.trim()}</Prose>}
            </Paper>

            {step === 1 && body.trim().length > 0 && body.trim().length < MIN_BODY && (
              <Label tone="dim" className="wl-write-floor">
                {MIN_BODY - body.trim().length} more characters
              </Label>
            )}

            {step === 2 && (
              <div className="wl-write-who">
                <Mark handle={h} size={26} />
                <Label tone="dim">unsigned</Label>
              </div>
            )}
          </div>
        )}

        <div className="wl-write-foot">
          {step > 0 && (
            <ArrowLink tone="quiet" size="s" onClick={() => setStep(step - 1)}>back</ArrowLink>
          )}
          <Pill tone="light" onClick={next} disabled={!ok[step]}>
            {step === 2 ? 'seal it' : step === 1 ? 'then the seal' : 'write it'}
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}

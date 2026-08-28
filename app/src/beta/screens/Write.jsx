// /beta/write — THE COMPOSER
//
// Three steps, one question per screen, and a confirm that shows the card
// exactly as the wall will show it, seal included. One question at a time is
// not a fashion: the second question ("say the thing you never sent") is the
// hardest thing this product asks anybody to do, and it should be the only
// thing on the screen when it is asked.

import { useMemo, useState } from 'react'
import { ArrowLink, Display, HandleField, Help, Paper } from '../parts.jsx'
import { normHandle } from '../handles.js'
import { deterministic, firstReason } from '../moderate.js'
import { getState, patch } from '../store.js'

const BODY_MAX = 280
const SEAL_MAX = 90

export default function Write({ go }) {
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState('')
  const [body, setBody] = useState('')
  const [seal, setSeal] = useState('')
  const [problem, setProblem] = useState('')

  const targetOk = normHandle(target).length >= 3
  const bodyOk = body.trim().length >= 12 && body.length <= BODY_MAX

  const preview = useMemo(() => ({
    id: 'preview',
    targetHandle: normHandle(target),
    body: body.trim(),
    hasSeal: !!seal.trim(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  }), [target, body, seal])

  // Layer 1 of the moderation contract, run before the person is allowed
  // forward rather than after they have committed. It is a courtesy to the
  // writer — the same list runs again server-side, where it is a control — and
  // it says exactly what the problem is, because a writer told "something went
  // wrong" edits at random and submits the same thing again.
  function checkAndAdvance(next) {
    const text = next === 3 ? `${body}\n${seal}` : body
    const v = deterministic(text)
    if (v.verdict === 'reject') { setProblem(firstReason(v.reasons)); return }
    setProblem('')
    setStep(next)
  }

  function send() {
    patch({ draft: { targetHandle: normHandle(target), body: body.trim(), sealedLine: seal.trim() } })
    go('sealing')
  }

  return (
    <div className="beta-col">
      <div className="beta-steps" style={{ marginTop: 28 }}>
        <i className={step >= 0 ? 'is-done' : ''} />
        <i className={step >= 1 ? 'is-done' : ''} />
        <i className={step >= 2 ? 'is-done' : ''} />
      </div>

      <div className="beta-lede-s" />

      {step === 0 && (
        <>
          <Display size={38}>Who can&rsquo;t you stop thinking about?</Display>
          <div style={{ marginTop: 36 }}>
            <HandleField value={target} onChange={setTarget} onSubmit={() => targetOk && setStep(1)} autoFocus />
          </div>
          {/* load-bearing for the campaign, enforced in copy and validated
              nowhere: a form that rejects somebody's person is a form that
              taught them this wall is not for them */}
          <Help style={{ marginTop: 18 }} small>They have to be at Berkeley.</Help>
          <div className="beta-push" />
          <ArrowLink onClick={() => setStep(1)} disabled={!targetOk}>next</ArrowLink>
        </>
      )}

      {step === 1 && (
        <>
          <Display size={38}>Say the thing you never sent.</Display>
          <textarea
            className="beta-area"
            style={{ marginTop: 28 }}
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Your letter"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 12 }}>
            <Help small>Anyone can read this. Only they will know it&rsquo;s them.</Help>
            {/* the counter appears only past 200. A counter visible from the
                first keystroke is a word limit; this is a letter */}
            {body.length > 200 && (
              <span className={`beta-count${body.length >= BODY_MAX ? ' is-over' : ''}`}>{body.length}/{BODY_MAX}</span>
            )}
          </div>
          {problem && <Help style={{ marginTop: 14 }}>{problem}</Help>}
          <div className="beta-push" />
          <ArrowLink onClick={() => checkAndAdvance(2)} disabled={!bodyOk}>next</ArrowLink>
          <ArrowLink onClick={() => setStep(0)} tone="quiet" glyph="←">back</ArrowLink>
        </>
      )}

      {step === 2 && (
        <>
          <Display size={38}>One detail only they would know.</Display>
          <textarea
            className="beta-area"
            style={{ marginTop: 28, minHeight: 96 }}
            value={seal}
            maxLength={SEAL_MAX}
            onChange={(e) => setSeal(e.target.value)}
            aria-label="The sealed line"
          />
          <Help style={{ marginTop: 12 }} small>This part stays sealed until they ask.</Help>
          {problem && <Help style={{ marginTop: 14 }}>{problem}</Help>}
          <div className="beta-push" />
          <ArrowLink onClick={() => checkAndAdvance(3)} disabled={!seal.trim()}>next</ArrowLink>
          <ArrowLink onClick={() => { setSeal(''); setStep(3) }} tone="quiet">leave it unsealed</ArrowLink>
        </>
      )}

      {step === 3 && (
        <>
          <Display size={34}>This is what they&rsquo;ll see.</Display>
          <div style={{ marginTop: 28 }}>
            <Paper letter={preview} />
          </div>
          <div className="beta-push" />
          <ArrowLink onClick={send}>send it</ArrowLink>
          <ArrowLink onClick={() => setStep(1)} tone="quiet">change something</ArrowLink>
        </>
      )}
    </div>
  )
}

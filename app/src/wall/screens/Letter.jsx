// ── /beta/letter/:id — THE LETTER ───────────────────────────────────────────
//
// A cream card rising off the bottom edge over a wall that stays visible and
// dimmed behind it. Both halves of that come straight off the reference: the
// journal's paper card with its dateline, and the modal that dims what is
// behind it rather than replacing it.
//
// ── what is public and what is not ──────────────────────────────────────────
// The letter is public. That is the whole mechanism: a wall you cannot read is
// a wall nobody stops at, and every letter here was written to be found by
// somebody who does not know it exists.
//
// The SEAL is not. It is the one line only the person it is about should be
// able to read — the detail that proves the writer was actually there — and it
// is what makes the wall worth being on rather than worth reading. So it
// arrives redacted, and the redaction is a DECOY string of matching length
// generated at render (data.js `decoy`). The real characters are not in the
// document, behind a blur or otherwise, until unseal() hands them over one at
// a time. Open the inspector at the demo table and there is nothing there.
//
// ── and this is the hinge ───────────────────────────────────────────────────
// Once the seal is open, the only question left is who. That question has no
// answer here and never will — which is not a limitation of the wall, it is
// the product. The line under an opened seal is the door into the mutual
// blind, and it is the most-earned moment in the flow to put it.

import { useEffect, useRef, useState } from 'react'
import { Sheet, Paper, Prose, Label, ArrowLink, Pill, Rule, Waiting } from '../parts.jsx'
import { Sparkle, Bloom, Mark } from '../art.jsx'
import { letter, lettersFor, unseal, decoy, dateline, ago, atHandle } from '../data.js'
import { mark } from '../store.js'

export default function Letter({ id, go, back, reduce }) {
  const one = letter(id)
  const siblings = one ? lettersFor(one.to) : []
  const at = siblings.findIndex((l) => l.id === id)

  const [seal, setSeal] = useState(null)
  const [opening, setOpening] = useState(false)
  const veil = useRef(null)

  // A different letter under the same sheet is a different letter: the seal
  // does not travel with the pager.
  useEffect(() => { setSeal(null); setOpening(false) }, [id])

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

  async function open() {
    if (opening || seal) return
    setOpening(true)
    // Held to a floor so the redaction has time to dissolve rather than
    // snapping. The wait is not the lookup — the lookup is instant — it is the
    // second somebody needs to decide they want to read it.
    const started = Date.now()
    const value = await unseal(one.id)
    const rest = Math.max(0, (reduce ? 0 : 900) - (Date.now() - started))
    veil.current = setTimeout(() => { setSeal(value || ''); setOpening(false) }, rest)
  }
  useEffect(() => () => clearTimeout(veil.current), [])

  const dl = dateline(one.at)

  return (
    <Sheet onClose={back} tall labelledBy="wl-letter-to">
      <div className="wl-sheet-in wl-letter">
        <Paper
          dateline={dl}
          title={<span id="wl-letter-to" className="wl-letter-to">{atHandle(one.to)}</span>}
          foot={
            one.sealed ? (
              <div className={`wl-seal${seal !== null ? ' is-open' : ''}${opening ? ' is-opening' : ''}`}>
                <Label tone="ink" className="wl-seal-cap">
                  <Sparkle size={9} tone="ink" /> {seal !== null ? 'the seal' : <>sealed for <span className="wl-h">{atHandle(one.to)}</span></>}
                </Label>
                <div className="wl-seal-line">
                  {/* Two layers, cross-fading. The decoy is aria-hidden and the
                      real line is announced when it arrives, so a screen reader
                      is never read a wall of blocks. */}
                  <span className="wl-seal-decoy" aria-hidden="true">{decoy(one.sealLen)}</span>
                  <span className="wl-seal-real">{seal}</span>
                </div>
              </div>
            ) : null
          }
        >
          <Prose>{one.body}</Prose>
        </Paper>

        {/* the pager — only where a name actually carries more than one */}
        {siblings.length > 1 && (
          <div className="wl-pager">
            <button type="button" className="wl-pager-b" disabled={at <= 0}
              onClick={() => go('letter', siblings[at - 1].id)} aria-label="previous letter">←</button>
            <Label tone="dim">{at + 1} of {siblings.length} to <span className="wl-h">{atHandle(one.to)}</span></Label>
            <button type="button" className="wl-pager-b" disabled={at >= siblings.length - 1}
              onClick={() => go('letter', siblings[at + 1].id)} aria-label="next letter">→</button>
          </div>
        )}

        <div className="wl-letter-meta">
          <Mark handle={one.to} size={26} lit={seal !== null} />
          <Label tone="dim">{ago(one.at)} · unsigned</Label>
        </div>

        <Rule />

        {/* ── the actions ──
            One primary, and what it is depends on whether the seal is open.
            Before: read the rest of it. After: the only question left. */}
        <div className="wl-letter-acts">
          {one.sealed && seal === null && (
            opening
              ? <div className="wl-letter-wait"><Waiting label="opening" /></div>
              : <Pill tone="light" wide onClick={open}>this one is about me</Pill>
          )}

          {seal !== null && (
            <div className="wl-revealed">
              <Bloom size={260} opacity={0.34} className="wl-revealed-bloom" />
              <p className="wl-revealed-q">So who wrote it?</p>
              <ArrowLink onClick={() => go('blind')}>the only way to find out</ArrowLink>
            </div>
          )}

          <ArrowLink tone={seal !== null ? 'quiet' : ''} onClick={() => go('write', one.to)}>
            write one back
          </ArrowLink>
          {!one.sealed && seal === null && (
            <ArrowLink tone="quiet" onClick={() => go('find')}>look for your own</ArrowLink>
          )}
        </div>
      </div>
    </Sheet>
  )
}

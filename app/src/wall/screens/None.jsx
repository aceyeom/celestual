// ── /beta/none — NOBODY WROTE TO YOU ────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THIS IS THE HERO OF THE BUILD. IT IS NOT THE FALLBACK.                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Nineteen of twenty people who scan a code and look for themselves land here.
// They arrive having just typed their own name into a wall in front of them —
// which is the highest-intent thirty seconds anywhere in this product, and it
// is reached by NOT finding anything. A build that treats this screen as the
// unhappy path has misread which path it is on.
//
// Four decisions carry it:
//
//   1. The field stops. Completely. It has drifted under every screen up to
//      this one and here it decelerates to nothing over about a second — the
//      room holding its breath. No empty-state illustration, no shrug, no
//      "check back soon".
//   2. The handle is already there. They typed it forty seconds ago. Asking
//      somebody to type their own name a second time, to be told about a
//      letter that does not exist yet, is how you lose the nineteen.
//   3. Nothing auto-advances. Answering the first offer collapses it into one
//      line with the only bloom on the screen behind it, and then it just
//      sits. The second offer wakes two seconds later and waits.
//   4. The second offer is the whole event. They cannot receive a letter that
//      nobody has written — but they can be the reason the next person finds
//      one. The dock is already half on screen, and here it comes all the way
//      up.

import { useEffect, useState } from 'react'
import { Display, Label, Pill, ArrowLink, HandleField, Rule } from '../parts.jsx'
import { Bloom, Sparkle, Mark } from '../art.jsx'
import { normHandle, validHandle, atHandle, handleCount } from '../data.js'
import { getState, patch } from '../store.js'

export default function None({ go, setField, reduce }) {
  const [value, setValue] = useState(() => getState().handle || getState().query || '')
  const [kept, setKept] = useState(() => getState().kept)
  const [awake, setAwake] = useState(() => getState().kept && true)

  useEffect(() => { setField('still') }, [setField])

  // The second offer brightens two seconds after the first is answered, over
  // 1400ms, rather than appearing. A link that pops in the instant you finish
  // something is a product asking for the next thing before you have finished
  // feeling the last one.
  useEffect(() => {
    if (!kept) return
    const t = setTimeout(() => setAwake(true), reduce ? 0 : 2000)
    return () => clearTimeout(t)
  }, [kept, reduce])

  const h = normHandle(value)

  function keep() {
    if (!validHandle(h)) return
    patch({ handle: h, kept: true })
    setKept(true)
  }

  return (
    <div className="wl-page wl-none">
      <div className="wl-none-air" />

      <Display size="l">
        No one has<br />written to
      </Display>
      <p className="wl-none-handle">{atHandle(h) || '@you'}</p>
      <Label tone="dim" className="wl-none-sub">
        <Sparkle size={9} /> yet · {handleCount()} names are up
      </Label>

      <div className="wl-none-slot">
        {kept ? (
          <div className="wl-none-kept">
            <Bloom size={320} opacity={0.42} className="wl-none-bloom" />
            <Mark handle={h} size={44} lit className="wl-none-mark" />
            <p className="wl-none-line">We&rsquo;ll be watching for you.</p>
          </div>
        ) : (
          <>
            <HandleField value={value} onChange={setValue} onSubmit={keep} size="lg" />
            <div className="wl-gap" />
            <Pill tone="light" wide onClick={keep} disabled={!validHandle(h)}>
              tell me the moment someone does
            </Pill>
          </>
        )}
      </div>

      <div className="wl-push" />

      {/* ── the turn ──
          Everything above this rule is about a letter that does not exist.
          Everything below it is about the person who could make the next one
          exist. That is the trade the whole event is built on: nineteen people
          find nothing, and the wall is only there at all because some of them
          wrote anyway. */}
      <Rule />
      <div className={`wl-none-turn${kept ? ' is-waking' : ''}${awake ? ' is-awake' : ''}`}>
        <Display size="s" as="p">Somebody has to be first.</Display>
        <div className="wl-gap" />
        <Pill tone={kept ? 'light' : 'ghost'} wide onClick={() => go('write')}>write one</Pill>
        <div className="wl-gap-s" />
        <ArrowLink tone="quiet" size="s" onClick={() => go('wall')}>back to the wall</ArrowLink>
      </div>
    </div>
  )
}

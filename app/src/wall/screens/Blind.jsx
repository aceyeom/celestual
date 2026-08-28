// ── /beta/blind — THE HAND-OFF ──────────────────────────────────────────────
//
// Where the campaign stops being a campaign and becomes the product. Every
// road out of the wall arrives here: opening a seal and wanting a name,
// sealing a letter and being told they will never know, or just reading two
// letters and wondering.
//
// The mechanism gets three lines and a diagram, and the lines are set in the
// poster's nav pattern — an arrow and a phrase, at display size, arriving one
// at a time. That is deliberate: the mutual blind is a THREE-STEP RULE, the
// reference already had a perfect form for a short ordered list of large
// statements, and a paragraph explaining the same rule in ten-point grey is
// the thing this build is specifically trying not to be.
//
// The diagram is the argument. Two figures, an arc leaving each one, and the
// arcs only close into a ring when both have been drawn. Nothing lights until
// both sides exist — which is the entire product in one ornament, and it says
// it without a caption.

import { useEffect, useState } from 'react'
import { Display, Label, Pill, ArrowLink } from '../parts.jsx'
import { Sparkle, Bloom } from '../art.jsx'
import { getState } from '../store.js'
import { atHandle } from '../data.js'

// ── the pair ────────────────────────────────────────────────────────────────
// Two nodes, two arcs, and a junction that only exists when both arcs are
// drawn. The arcs are stroked with a dash offset animated from full to zero,
// so each one is drawn rather than faded in — a line that appears has been
// switched on, a line that draws has been sent.
function Pair({ at }) {
  return (
    <svg className={`wl-pair is-at${at}`} viewBox="0 0 240 120" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wl-join" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the two of them */}
      <circle className="wl-pair-node is-a" cx="34" cy="60" r="9" />
      <circle className="wl-pair-node is-b" cx="206" cy="60" r="9" />

      {/* one arc out of each, over and under, so they read as two separate
          journeys rather than as one line with a dot at each end */}
      <path className="wl-pair-arc is-a" d="M43 60Q120 6 197 60" />
      <path className="wl-pair-arc is-b" d="M197 60Q120 114 43 60" />

      {/* the junction — nothing here until both arcs are drawn */}
      <circle className="wl-pair-halo" cx="120" cy="60" r="30" fill="url(#wl-join)" />
      <g className="wl-pair-star">
        <path d="M120 44c1 9 4.5 12.5 16 16-11.5 3.5-15 7-16 16-1-9-4.5-12.5-16-16 11.5-3.5 15-7 16-16Z" />
      </g>
    </svg>
  )
}

const LINES = [
  'You write theirs.',
  'They write yours.',
  'You both find out. At once.',
]

export default function Blind({ go, setField, reduce }) {
  const [at, setAt] = useState(reduce ? 3 : 0)
  const them = getState().draft?.to || ''

  useEffect(() => { setField('slow') }, [setField])

  useEffect(() => {
    if (reduce) return
    const ts = [700, 1500, 2400, 3400].map((ms, i) => setTimeout(() => setAt(i + 1), ms))
    return () => ts.forEach(clearTimeout)
  }, [reduce])

  return (
    <div className={`wl-page wl-blind is-at${at}`}>
      <header className="wl-top">
        <div className="wl-top-mark">
          <Sparkle size={15} />
          <Label>the mutual blind</Label>
        </div>
        <ArrowLink tone="quiet" size="s" onClick={() => go('wall')}>the wall</ArrowLink>
      </header>

      <div className="wl-blind-air" />

      <Display size="l" className="wl-blind-h">
        Nothing happens<br />unless it&rsquo;s mutual.
      </Display>

      <div className="wl-blind-fig">
        <Bloom size={300} opacity={at >= 3 ? 0.4 : 0} className="wl-blind-bloom" />
        <Pair at={at} />
      </div>

      {/* the rule, in the poster's nav voice */}
      <ol className="wl-rule-list">
        {LINES.map((l, i) => (
          <li key={l} className={`wl-rule-line${at > i ? ' is-in' : ''}`}>
            <span className="wl-arrow-g" aria-hidden="true">→</span>
            <span>{l}</span>
          </li>
        ))}
      </ol>

      <div className="wl-push" />

      <div className={`wl-blind-foot${at >= 4 ? ' is-in' : ''}`}>
        <Label tone="dim">
          {them ? <>your letter to <span className="wl-h">{atHandle(them)}</span> is already one half</> : <>one standing ping is already one half</>}
        </Label>
        <div className="wl-gap" />
        <Pill tone="light" wide onClick={() => go('orbit')}>place the other half</Pill>
        <div className="wl-gap-s" />
        <ArrowLink tone="quiet" size="s" onClick={() => go('wall')}>not yet</ArrowLink>
      </div>
    </div>
  )
}

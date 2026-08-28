// ── /beta/join — THE ONE DOOR ───────────────────────────────────────────────
//
// The only route from the wall into the core service, reached from one place:
// the tab at the bottom of the wall, which does not exist until somebody has
// put a letter up.
//
// That gating is the whole point. The wall asks nothing of anybody — no
// account, no handle, no verification — and the moment it starts offering one
// it stops being a thing you can hand out on paper. But a person who has just
// named somebody is, right then, carrying exactly one question: did they do
// the same. This screen is that question and nothing else.
//
// The mechanism gets three lines and a diagram, set in the poster's nav voice
// — an arrow and a phrase, at display size, arriving one at a time. The
// mutual blind is a three-step rule, the reference already had a perfect form
// for a short ordered list of large statements, and a paragraph explaining the
// same rule in ten-point grey is the thing this build exists not to be.
//
// The diagram is the argument. Two figures, an arc leaving each, and a
// junction that only exists once both arcs are drawn. Nothing lights until
// both sides do — the product in one ornament, with no caption.

import { useEffect, useState } from 'react'
import { Display, Label, Pill, ArrowLink, Icon } from '../parts.jsx'
import { Sparkle, Bloom } from '../art.jsx'

// Two nodes, two arcs, and a junction. The arcs are stroked with a dash offset
// animated to zero, so each is DRAWN rather than faded in — a line that
// appears has been switched on, a line that draws has been sent.
function Pair({ at }) {
  return (
    <svg className={`wl-pair is-at${at}`} viewBox="0 0 240 120" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wl-join-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="wl-pair-node is-a" cx="34" cy="60" r="9" />
      <circle className="wl-pair-node is-b" cx="206" cy="60" r="9" />
      <path className="wl-pair-arc is-a" d="M43 60Q120 6 197 60" />
      <path className="wl-pair-arc is-b" d="M197 60Q120 114 43 60" />
      <circle className="wl-pair-halo" cx="120" cy="60" r="30" fill="url(#wl-join-g)" />
      <g className="wl-pair-star">
        <path d="M120 44c1 9 4.5 12.5 16 16-11.5 3.5-15 7-16 16-1-9-4.5-12.5-16-16 11.5-3.5 15-7 16-16Z" />
      </g>
    </svg>
  )
}

const LINES = [
  'You put their name down.',
  'They put yours down.',
  'You both find out. At once.',
]

export default function Join({ go, setField, reduce }) {
  const [at, setAt] = useState(reduce ? 4 : 0)
  useEffect(() => { setField('slow') }, [setField])

  useEffect(() => {
    if (reduce) return
    const ts = [600, 1400, 2300, 3200].map((ms, i) => setTimeout(() => setAt(i + 1), ms))
    return () => ts.forEach(clearTimeout)
  }, [reduce])

  return (
    <div className={`wl-page wl-join is-at${at}`}>
      <header className="wl-top">
        <button type="button" className="wl-brand" onClick={() => go('wall')}
          aria-label="back to the wall" title="the wall">
          <Icon name="back" size={17} /><Sparkle size={14} />
        </button>
      </header>

      <div className="wl-join-air" />

      <Display size="l" className="wl-join-h">
        Did they put<br />you down too?
      </Display>

      <div className="wl-join-fig">
        <Bloom size={300} opacity={at >= 3 ? 0.4 : 0} className="wl-join-bloom" />
        <Pair at={at} />
      </div>

      <ol className="wl-rule-list">
        {LINES.map((l, i) => (
          <li key={l} className={`wl-rule-line${at > i ? ' is-in' : ''}`}>
            <span className="wl-arrow-g" aria-hidden="true">→</span>
            <span>{l}</span>
          </li>
        ))}
      </ol>

      <div className="wl-push" />

      <div className={`wl-join-foot${at >= 4 ? ' is-in' : ''}`}>
        <Label tone="dim">your letter stays anonymous</Label>
        <div className="wl-gap" />
        <Pill tone="light" wide icon={<Icon name="join" size={17} />} onClick={() => go('orbit')}>
          register
        </Pill>
        <div className="wl-gap-s" />
        <ArrowLink tone="quiet" size="s" onClick={() => go('wall')}>back to the wall</ArrowLink>
      </div>
    </div>
  )
}

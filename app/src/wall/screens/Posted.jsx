// ── /beta/posted — IT IS UP ─────────────────────────────────────────────────
//
// The one long animation in the build, and the only place it is worth the
// spend. Somebody has just named a person they never said anything to; the
// three seconds after that are not a loading state.
//
// Three beats, and each one is a claim:
//
//   0 · 0ms     the paper is still there, and then it goes — the card
//               contracts toward its own centre and the light leaves it
//   1 · 900ms   the sparkles converge and one point of light leaves with it
//   2 · 1950ms  the point lands: the name is on the wall, lit, among the
//               others, and the count is one higher
//
// Beat 2 matters more than it looks. The letter is genuinely written into the
// corpus here (data.js `write`), not mimed — so the wall behind this screen,
// the search, and the count in the masthead all really do carry it a moment
// later. A prototype that fakes its own payoff falls over the first time
// somebody at the demo table taps back.
//
// And then it stops. There is no offer on this screen and no next step in it:
// the way on is the tab that will be waiting at the bottom of the wall, which
// is one tap away and does not chase anybody down here to make its case.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, Paper, Prose, Icon } from '../parts.jsx'
import { Sparkle, Bloom } from '../art.jsx'
import { write, wall, liveCount, atHandle, dateline } from '../data.js'
import { getState, patch } from '../store.js'

const BEATS = [0, 900, 1950]

export default function Posted({ go, reduce }) {
  const draft = getState().draft
  const [beat, setBeat] = useState(reduce ? 2 : 0)
  const timers = useRef([])

  // Written once, on mount, and held in state — a re-render must not put a
  // second copy of the same letter on the wall.
  const [row] = useState(() => {
    if (!draft || !draft.to || !draft.body) return null
    const r = write(draft)
    patch({ draft: null, written: [r.id, ...getState().written].slice(0, 12) })
    return r
  })

  useEffect(() => {
    if (reduce || !row) return
    BEATS.forEach((at, i) => {
      if (i === 0) return
      timers.current.push(setTimeout(() => setBeat(i), at))
    })
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, row])

  // The strip: this name, and the four nearest it on the wall, so the landing
  // reads as joining something rather than as a confirmation dialogue.
  const strip = useMemo(() => {
    if (!row) return []
    const tiles = wall()
    const i = Math.max(0, tiles.findIndex((t) => t.handle === row.to))
    return tiles.slice(i, i + 5)
  }, [row])

  if (!row) {
    return (
      <div className="wl-page wl-posted">
        <div className="wl-posted-air" />
        <Display size="m">Nothing to put up.</Display>
        <div className="wl-gap" />
        <Pill tone="light" icon={<Icon name="write" size={17} />} onClick={() => go('write')}>write one</Pill>
      </div>
    )
  }

  return (
    <div className={`wl-page wl-posted is-b${beat}`}>
      <div className="wl-posted-air" />

      {/* beats 0–1 · the paper going */}
      <div className="wl-posted-stage">
        <Bloom size={300} opacity={beat >= 1 ? 0.44 : 0.12} className="wl-posted-bloom" />
        <div className="wl-posted-card">
          <Paper dateline={dateline(row.at)} title={<span className="wl-letter-to">{atHandle(row.to)}</span>}>
            <Prose>{row.body}</Prose>
          </Paper>
        </div>
        <div className="wl-converge" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Sparkle key={i} size={10 + (i % 3) * 4} className={`wl-conv c${i}`} />
          ))}
        </div>
      </div>

      {/* beat 2 · it is on the wall */}
      <div className="wl-posted-land">
        <Display size="m">It&rsquo;s up.</Display>
        <Label tone="dim" className="wl-posted-count">{liveCount()} letters · yours is the newest</Label>
        <div className="wl-strip" aria-hidden="true">
          {strip.map((t) => (
            <span key={t.handle} className={`wl-strip-n${t.handle === row.to ? ' is-mine' : ''}`}>
              {atHandle(t.handle)}
            </span>
          ))}
        </div>
      </div>

      <div className="wl-push" />

      <div className="wl-posted-foot">
        <Pill tone="light" wide icon={<Icon name="wall" size={17} />} onClick={() => go('wall')}>
          back to the wall
        </Pill>
      </div>
    </div>
  )
}

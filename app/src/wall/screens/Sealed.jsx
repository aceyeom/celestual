// ── /beta/sealed — THE SEAL ─────────────────────────────────────────────────
//
// The one long animation in the build, and the only place it is worth the
// spend. Somebody has just written forty words about a person they never said
// them to; the four seconds after that are not a loading state.
//
// The sequence is four beats, and each one is a claim:
//
//   0 · 0ms      the paper is still there, and then it closes — the card
//                contracts toward its own centre and the light goes out of it
//   1 · 950ms    the sparkles converge and one point of light leaves
//   2 · 2000ms   the point lands: the name is on the wall, lit, among the
//                others, and the count on the masthead is one higher
//   3 · 3100ms   and only then, the question the whole product answers
//
// Beat 2 matters more than it looks. The letter is genuinely written into the
// corpus here (data.js `write`), not mimed — so the wall behind this screen,
// the search, and the count in the masthead all really do carry it a moment
// later. A prototype that fakes its own payoff is a prototype that falls over
// the first time somebody at the demo table taps back.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, ArrowLink, Paper, Prose } from '../parts.jsx'
import { Sparkle, Bloom, Mark } from '../art.jsx'
import { write, wall, liveCount, atHandle, dateline } from '../data.js'
import { getState, patch } from '../store.js'

const BEATS = [0, 950, 2000, 3100]

export default function Sealed({ go, reduce }) {
  const draft = getState().draft
  const [beat, setBeat] = useState(reduce ? 3 : 0)
  const timers = useRef([])

  // Written once, on mount, and held in state — a re-render must not put a
  // second copy of the same letter on the wall.
  const [row] = useState(() => {
    if (!draft || !draft.to || !draft.body) return null
    const r = write(draft)
    patch({ draft: null, written: [r.id, ...getState().written].slice(0, 12), handle: getState().handle })
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

  // The strip under the seal: this name, and the four that were nearest it on
  // the wall, so the landing reads as joining something rather than as a
  // confirmation dialogue.
  const strip = useMemo(() => {
    if (!row) return []
    const tiles = wall()
    const i = Math.max(0, tiles.findIndex((t) => t.handle === row.to))
    return tiles.slice(i, i + 5)
  }, [row])

  if (!row) {
    return (
      <div className="wl-page wl-sealed">
        <div className="wl-none-air" />
        <Display size="m">Nothing to seal.</Display>
        <div className="wl-gap" />
        <ArrowLink onClick={() => go('write')}>write one</ArrowLink>
      </div>
    )
  }

  const dl = dateline(row.at)

  return (
    <div className={`wl-page wl-sealed is-b${beat}`}>
      <div className="wl-sealed-air" />

      {/* beat 0–1 · the paper closing */}
      <div className="wl-sealed-stage">
        <Bloom size={300} opacity={beat >= 1 ? 0.44 : 0.12} className="wl-sealed-bloom" />

        <div className="wl-sealed-card">
          <Paper dateline={dl} title={<span className="wl-letter-to">{atHandle(row.to)}</span>}>
            <Prose>{row.body}</Prose>
          </Paper>
        </div>

        {/* the convergence — six sparkles falling in on the centre */}
        <div className="wl-converge" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Sparkle key={i} size={10 + (i % 3) * 4} className={`wl-conv c${i}`} />
          ))}
        </div>
      </div>

      {/* beat 2 · it is on the wall */}
      <div className="wl-sealed-land">
        <Display size="m">It&rsquo;s up.</Display>
        <Label tone="dim" className="wl-sealed-count">
          {liveCount()} letters · yours is the newest
        </Label>

        <div className="wl-strip" aria-hidden="true">
          {strip.map((t) => (
            <span key={t.handle} className={`wl-strip-n${t.handle === row.to ? ' is-mine' : ''}`}>
              {atHandle(t.handle)}
            </span>
          ))}
        </div>
      </div>

      <div className="wl-push" />

      {/* beat 3 · the turn into the product */}
      <div className="wl-sealed-turn">
        <div className="wl-sealed-who">
          <Mark handle={row.to} size={30} lit />
          <p className="wl-sealed-q">
            {atHandle(row.to)} will never know it was you.
          </p>
        </div>
        <Pill tone="light" wide onClick={() => go('blind')}>unless they write yours</Pill>
        <div className="wl-gap-s" />
        <ArrowLink tone="quiet" size="s" onClick={() => go('wall')}>back to the wall</ArrowLink>
      </div>
    </div>
  )
}

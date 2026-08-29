// ── /beta/join — THE ONE DOOR ───────────────────────────────────────────────
//
// The only route from the wall into the core service, reached from one place:
// the tab at the bottom of the wall, which does not exist until somebody has
// put a letter up.
//
// That gating is the whole point. The wall asks nothing of anybody until they
// try to read or write, and the moment it starts offering an ACCOUNT it stops
// being a thing you can hand out on paper. But a person who has just named
// somebody is, right then, carrying exactly one question: did they do the same.
// This screen is that question and nothing else.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FIGURE — what was wrong with it, and what it is now                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// It was two circles and two quadratic curves with a star fading in between
// them. Every part of that is the default: a quadratic bezier between two dots
// is the first thing anybody draws, the circles were nodes because circles are
// what a node is in a diagram nobody thought about, and the star arrived by
// changing its opacity, which is the animation you get when you have not
// decided what the thing is DOING. It was legible and it was worth nothing —
// generic geometry on the one screen where this product has to look like it was
// made by someone.
//
// What replaced it is not a richer diagram. It is the same claim, made out of
// the one shape this brand already owns:
//
//   THE TWO ARCS ARE THE TWO HALVES OF THE MARK'S OWN RING.
//
// They come out of `eclipticHalves()` in art.jsx, which is built from the same
// ECL constants the logo is built from — the same radius, the same 0.5 flatten,
// the same -19° tilt. Move a number in the mark and this figure moves with it,
// because it is not a drawing of the mark, it is the mark taken apart.
//
// So the sequence is the product, literally:
//
//   1  one person puts a name down    → the left node lights and sends an arc
//                                       over the top. A point of light travels
//                                       ahead of it: a line that DRAWS has been
//                                       sent; a line that appears was switched
//                                       on. Half a ring. It is not anything.
//   2  the other does the same        → the right node sends the other half,
//                                       under. The two meet.
//   3  the circuit closes             → and the instant it does, the star
//                                       ignites inside it, scaling up off
//                                       nothing with a few degrees of rotation
//                                       bleeding out, and the bloom opens behind
//                                       it. What is standing on the screen at
//                                       the end of the sequence is the logo,
//                                       assembled by two people, and neither
//                                       half of it was a mark on its own.
//
// ── on buying this instead ──────────────────────────────────────────────────
// A Lottie file or a stock illustration was the obvious way to make this screen
// look expensive, and it is the one thing that would have made it look cheaper.
// Every ornament in this build is derived from something true — the field's
// density is the letter count, a constellation is a handle's hash, the mark is
// six constants — and a bought animation is the only object that could sit here
// knowing nothing about what it is next to. It would also be the tell: this
// brand is being judged against a reference that is entirely geometry and type,
// and the second there is a purchased asset in it, the whole surface reads as
// assembled rather than drawn. The external assets this build does use are the
// four faces, and they are enough.

import { useEffect, useRef, useState } from 'react'
import { Display, Label, Pill, Close, Icon } from '../parts.jsx'
import { Bloom, Ecliptic, eclipticHalves, ECL, starPath } from '../art.jsx'

// The two halves and the two ends, straight off the mark.
const { left, right, high, low } = eclipticHalves()
const STAR = starPath(ECL)

// A node is not a circle. It is the same four-point star the sparkle and the
// mark are both built from, sitting inside a hairline ring — so the two people
// on this diagram are drawn out of the same curve as the thing they are about
// to make between them.
function Node({ at, cls }) {
  const s = 11.5
  return (
    <g className={`wl-circuit-node ${cls}`}>
      <circle cx={at[0]} cy={at[1]} r="9" className="wl-circuit-node-ring" />
      <path
        d="M50 0C51.5 29 62 40.5 100 50C62 59.5 51.5 71 50 100C48.5 71 38 59.5 0 50C38 40.5 48.5 29 50 0Z"
        transform={`translate(${at[0] - s / 2} ${at[1] - s / 2}) scale(${s / 100})`}
        className="wl-circuit-node-star"
      />
    </g>
  )
}

function Circuit({ at }) {
  return (
    <svg className={`wl-circuit is-at${at}`} viewBox="0 14 100 72"
      aria-hidden="true" focusable="false">
      <defs>
        {/* ── the gutter ──
            The mark's third layer, and the reason the finished figure reads as
            the logo rather than as a starburst sitting on a hoop. In the mark
            the ring passes BEHIND the star at the top of its circuit and IN
            FRONT of it at the bottom, and the near band cuts a void out of the
            star where it crosses (art.jsx, ECL.gutter). Here the near half is
            the `low` arc, so it is stroked out of the star at four units wide
            and then drawn again over the top. Without this the two are just
            stacked and nothing crosses anything, which is the one thing this
            mark is built to do. */}
        <mask id="wl-join-cut" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <path d={low} fill="none" stroke="#000" strokeWidth="4.2" />
        </mask>
      </defs>

      {/* the circuit as it will be, held at almost nothing — so the arcs are
          drawn ONTO a route rather than into empty space, which is the
          difference between a line being sent and a line being invented */}
      <path className="wl-circuit-ghost" d={high} />
      <path className="wl-circuit-ghost" d={low} />

      <path className="wl-circuit-arc is-a" d={high} pathLength="100" />
      <path className="wl-circuit-arc is-b" d={low} pathLength="100" />

      {/* the point of light that runs ahead of each arc as it draws */}
      <circle className="wl-circuit-lead is-a" r="1.9" style={{ offsetPath: `path('${high}')` }} />
      <circle className="wl-circuit-lead is-b" r="1.9" style={{ offsetPath: `path('${low}')` }} />

      <Node at={left} cls="is-a" />
      <Node at={right} cls="is-b" />

      {/* nothing at the centre until BOTH halves exist. The product, in one
          ornament, with no caption under it.

          There is ONE light on this screen and it is the Bloom behind the SVG,
          which is the build's rationed accent object. There used to be a second
          one in here as well — a 34-unit radial at the same centre — and two
          soft warm circles stacked on a near-black ground do not read as
          twice the light. They read as grey, spread across two hundred pixels,
          with a visible edge: smoke behind a ring. One light, and the star
          carries its own. */}
      <g className="wl-circuit-star" mask="url(#wl-join-cut)">
        <path d={STAR} transform="translate(50 50) scale(0.54)" />
      </g>
      {/* and the near half again, over the star it just crossed */}
      <path className="wl-circuit-arc is-over" d={low} />
    </svg>
  )
}

const LINES = [
  'You put their name down.',
  'They put yours down.',
  'You both find out. At once.',
]

//              1     2     3     4
const BEATS = [650, 1750, 2900, 3400]
const LAST = 4

export default function Join({ go, setField, reduce }) {
  const [at, setAt] = useState(reduce ? LAST : 0)
  const timers = useRef([])
  useEffect(() => { setField('slow') }, [setField])

  useEffect(() => {
    if (reduce) return
    BEATS.forEach((ms, i) => timers.current.push(setTimeout(() => setAt(i + 1), ms)))
    return () => timers.current.forEach(clearTimeout)
  }, [reduce])

  // The same escape the overture has, for the same reason: this runs three and
  // a half seconds and the second person at a demo table has already seen it.
  // A tap anywhere lands the whole thing.
  useEffect(() => {
    if (reduce) return
    const skip = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      setAt(LAST)
    }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [reduce])

  return (
    <div className={`wl-page wl-join is-at${at}`}>
      <header className="wl-top">
        {/* The mark stands, and the X leaves. On a screen that is not a sheet
            the exit is still the same object it is on every sheet, rather than
            a chevron welded to the logo. */}
        <span className="wl-brand is-still"><Ecliptic size={21} className="wl-brand-mark" /></span>
        <Close onClick={() => go('wall')} label="back to the wall" />
      </header>

      <div className="wl-join-air" />

      {/* The offer, said as the offer. It was a question — "Did they put you
          down too?" — which is the thing a person arriving here is already
          asking themselves; a screen that asks it back has spent its headline
          restating the visitor's own state of mind. This is the one sentence
          that says what pressing the button GETS them, and it is the same
          sentence, word for word, as the tab they pressed to get here. */}
      <Display size="l" className="wl-join-h">
        Get notified if they<br />put you down too.
      </Display>

      <div className="wl-join-fig">
        {/* One bloom, at the size the mark actually is rather than at the size
            of the box around it. At 310 it was a grey panel behind a ring; the
            light has to come off the star, not sit behind the whole figure. */}
        <Bloom size={215} opacity={at >= 3 ? 0.28 : 0} className="wl-join-bloom" />
        <Circuit at={at} />
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

      <div className={`wl-join-foot${at >= LAST ? ' is-in' : ''}`}>
        <Label tone="dim">your letter stays anonymous</Label>
        <div className="wl-gap" />
        <Pill tone="light" wide icon={<Icon name="join" size={17} />} onClick={() => go('orbit')}>
          register
        </Pill>
      </div>
    </div>
  )
}

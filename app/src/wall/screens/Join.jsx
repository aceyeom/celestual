// ── /berkeley/join — THE ONE DOOR ───────────────────────────────────────────
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
// ║  THE FIGURE — it is not LIKE the mark. It IS the mark.                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// It began as two circles and two quadratic curves with a star fading in
// between them, which is the default drawing for any two things joining. That
// was replaced by the two halves of the mark's own CENTRELINE, stroked at a
// constant width, which was much better and still not the thing: a hairline
// hoop with a star in it is a diagram of the logo, and the logo is a BAND whose
// width varies two to one round its circuit, passing behind the star at the top
// and in front of it at the bottom.
//
// So the figure is now assembled out of the mark's own parts, in the mark's own
// order (art.jsx `Ecliptic`), and the finished frame is the logo pixel for
// pixel:
//
//   the far half    `ringPath()` clipped to the half-plane ABOVE the ring's
//                   long axis. It is the band, at its real varying width, not a
//                   stroke pretending to be one.
//   the near half   the same path clipped BELOW that axis.
//   the star        `starPath(ECL)` at full size, masked by the dilated near
//                   band (ECL.gutter) so the band cuts its void out of the star
//                   exactly where it crosses.
//   the near half   again, over the star it just crossed. That third layer is
//                   the whole reason the mark reads as one object rather than
//                   as a starburst sitting on a hoop.
//
// Each half is DRAWN rather than faded up: a 26-unit stroke runs along that
// half's own arc inside a mask, with the dash offset driven to zero, so the
// band arrives with its own varying width already on it. Same technique as the
// overture, same constants, same route.
//
// ── the two people are named ────────────────────────────────────────────────
// The vertices used to carry two small four-point stars, which were pretty and
// said nothing: a diagram of two anonymous nodes on the one screen whose entire
// claim is that the two nodes are YOU and SOMEBODY IN PARTICULAR. They are
// handles now, set in the identifier face, and THE BAND IS CUT WHERE THEY SIT
// (`plate` below, cut out of every ring layer's mask). A label floating over a
// ring is a caption; a label standing in a gap in the ring is part of the
// figure, and the gap is what says these two are where the circuit is open
// until the other one answers.
//
// So the sequence is the product, literally:
//
//   1  you put their name down     → the band leaves @you and draws over the
//                                    top. A point of light travels ahead of it:
//                                    a line that DRAWS has been sent; a line
//                                    that appears was switched on. Half a ring.
//                                    It is not anything.
//   2  they put yours down         → the other half leaves @them and travels
//                                    under. The two meet.
//   3  the circuit closes          → and the instant it does, the star ignites
//                                    inside it and the bloom opens behind it.
//                                    What is standing on the screen at the end
//                                    is the logo, assembled by two people, and
//                                    neither half of it was a mark on its own.
//
// ── on buying this instead ──────────────────────────────────────────────────
// A Lottie file or a stock illustration was the obvious way to make this screen
// look expensive, and it is the one thing that would have made it look cheaper.
// Every ornament in this build is derived from something true — the field's
// density is the letter count, a constellation is a handle's hash, the mark is
// six constants — and a bought animation is the only object that could sit here
// knowing nothing about what it is next to.

import { useEffect, useId, useRef, useState } from 'react'
import { Display, Label, Pill, Close, Icon } from '../parts.jsx'
import { Bloom, Ecliptic, eclipticHalves, ECL, ringPath, starPath } from '../art.jsx'

// Every part of the mark, straight off the mark. Move a constant in art.jsx and
// this figure moves with it, because it is not a drawing of the logo: it is the
// logo, taken apart into the order it assembles in.
const { left, right, high, low } = eclipticHalves()
const RING = ringPath()
const GUTTER = ringPath(ECL.gutter)
const STAR = starPath(ECL)

// The two half-planes, split along the ring's own long axis. `art.jsx` keeps the
// near one for the mark itself; the far one is its complement and is what makes
// each half of this figure an exact half rather than an arc that looks like one.
const PLANE = { x: -110, width: 320, height: 160, transform: `rotate(${ECL.tilt} 50 50)` }
const NEAR_Y = 50
const FAR_Y = -110

// ── the two people, and the gap each one stands in ──────────────────────────
// The type size is in the mark's own units, and the plate under it is worked
// out from the string rather than measured: the face is a monospace, so one
// advance is 0.6em and the width of "@them" is arithmetic. The plate is cut out
// of every ring layer, which is what puts the handle IN the band rather than on
// top of it.
const YOU = '@you'
const THEM = '@them'
const TAG = 7.2          // the type size
const ADVANCE = 0.6      // one monospace advance, as a fraction of the size
const PAD_X = 3.2
const PAD_Y = 2.4

function plate(text, at) {
  const w = text.length * TAG * ADVANCE + PAD_X * 2
  const h = TAG + PAD_Y * 2
  return { x: at[0] - w / 2, y: at[1] - h / 2, width: w, height: h, rx: h / 2 }
}
const PLATES = [plate(YOU, left), plate(THEM, right)]

function Cuts() {
  return PLATES.map((p, i) => <rect key={i} {...p} fill="#000" />)
}

function Circuit({ at }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const box = { x: -30, y: -30, width: 160, height: 160 }
  return (
    /* The box holds the whole mark at full size — the star's arms reach 47
       units off centre, well past the ring — plus the two handles standing off
       either end of the long axis. Cropping any of that to keep the figure
       short is how the last version ended up scaling the star down to a
       fifty-four percent copy of itself, which is the one thing that stopped it
       being the logo. */
    <svg className={`wl-circuit is-at${at}`} viewBox="-10 -4 120 108"
      aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${uid}near`}>
          <rect {...PLANE} y={NEAR_Y} />
        </clipPath>
        <clipPath id={`${uid}far`}>
          <rect {...PLANE} y={FAR_Y} />
        </clipPath>

        {/* the band, minus the two gaps the handles stand in */}
        <mask id={`${uid}plate`} maskUnits="userSpaceOnUse" {...box}>
          <rect {...box} fill="#fff" />
          <Cuts />
        </mask>

        {/* ── the two sweeps ──
            A 26-unit stroke along each half's own arc, with the dash offset
            driven to zero, so the band is DRAWN round its route rather than
            faded up — and it arrives carrying its own varying width, because
            what is travelling is a mask over the real band and not a stroke
            standing in for one. Butt caps, because the arc ends exactly on the
            long axis where the clip plane cuts, and a round cap there would
            bleed the far half into the near one. */}
        <mask id={`${uid}sweepa`} maskUnits="userSpaceOnUse" {...box}>
          <path className="wl-circuit-sweep is-a" d={high} pathLength="100"
            fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="butt"
            strokeDasharray="100" strokeDashoffset="100" />
          <Cuts />
        </mask>
        <mask id={`${uid}sweepb`} maskUnits="userSpaceOnUse" {...box}>
          <path className="wl-circuit-sweep is-b" d={low} pathLength="100"
            fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="butt"
            strokeDasharray="100" strokeDashoffset="100" />
          <Cuts />
        </mask>

        {/* the gutter: the void the near band cuts out of the star where it
            crosses in front of it (art.jsx, ECL.gutter) */}
        <mask id={`${uid}gutter`} maskUnits="userSpaceOnUse" {...box}>
          <rect {...box} fill="#fff" />
          <path d={GUTTER} fill="#000" fillRule="evenodd" clipPath={`url(#${uid}near)`} />
        </mask>
      </defs>

      {/* the circuit as it will be, held at almost nothing — so each half is
          drawn ONTO a route rather than into empty space, which is the
          difference between a line being sent and a line being invented */}
      <g className="wl-circuit-ghost" mask={`url(#${uid}plate)`}>
        <path d={RING} fillRule="evenodd" />
      </g>

      {/* one leaves @you and travels over the top */}
      <g className="wl-circuit-half is-a" clipPath={`url(#${uid}far)`} mask={`url(#${uid}sweepa)`}>
        <path d={RING} fillRule="evenodd" />
      </g>
      {/* the other leaves @them and travels under */}
      <g className="wl-circuit-half is-b" clipPath={`url(#${uid}near)`} mask={`url(#${uid}sweepb)`}>
        <path d={RING} fillRule="evenodd" />
      </g>

      {/* the point of light that runs ahead of each half as it draws */}
      <circle className="wl-circuit-lead is-a" r="1.7" style={{ offsetPath: `path('${high}')` }} />
      <circle className="wl-circuit-lead is-b" r="1.7" style={{ offsetPath: `path('${low}')` }} />

      {/* nothing at the centre until BOTH halves exist. The product, in one
          ornament, with no caption under it.

          There is ONE light on this screen and it is the Bloom behind the SVG,
          which is the build's rationed accent object. The star carries its own
          and nothing else does: two soft warm circles stacked on a near-black
          ground do not read as twice the light, they read as grey with a
          visible edge. */}
      <g className="wl-circuit-star" mask={`url(#${uid}gutter)`}>
        <path d={STAR} transform="translate(50 50)" />
      </g>

      {/* and the near half again, over the star it just crossed. This is the
          layer that makes the finished frame the mark rather than a star and a
          hoop that happen to overlap. */}
      <g className="wl-circuit-half is-over" clipPath={`url(#${uid}near)`} mask={`url(#${uid}plate)`}>
        <path d={RING} fillRule="evenodd" />
      </g>

      {/* the two people, standing in the gaps the band left for them */}
      <text className="wl-circuit-tag is-a" x={left[0]} y={left[1]}
        fontSize={TAG} textAnchor="middle" dominantBaseline="central">{YOU}</text>
      <text className="wl-circuit-tag is-b" x={right[0]} y={right[1]}
        fontSize={TAG} textAnchor="middle" dominantBaseline="central">{THEM}</text>
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

  // Out of the wall and into the product. `assign` rather than a route change:
  // see the note on the button below.
  const register = () => { window.location.assign('/') }

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
        <span className="wl-brand is-still"><Ecliptic size={26} className="wl-brand-mark" /></span>
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
        <Label tone="dim">your information will stay anonymous</Label>
        <div className="wl-gap" />
        {/* ── the hand-off ──
            This used to open /berkeley/orbit, a drawn stand-in for the core
            service that lived inside the wall's own bundle. It does not any
            more: registering means registering, so the button leaves this tree
            entirely and lands on the product at the root of the site.

            A real navigation rather than a route change, because the wall and
            production are two different apps behind one document (main.jsx) and
            pushing a production path into this history stack would leave the
            wall trying to render a screen it does not have. */}
        <Pill tone="light" wide icon={<Icon name="join" size={17} />} onClick={register}>
          register
        </Pill>
      </div>
    </div>
  )
}

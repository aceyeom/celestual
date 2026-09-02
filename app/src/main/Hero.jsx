// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MAIN HERO                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The front door, at `/`. One of the two surfaces docs/rebuild-spec.md 7.1 says
// carries the artistry, and the one a person meets before they know what this
// is.
//
// Promoted from /signature in Phase 6b, unchanged in everything that was
// approved: the same sentence, the same two orbits closing on one another, the
// same great deal of room. Two things are different and both are wiring rather
// than design. The wall's numbers are real, read off wall_index, and they are
// absent rather than invented when the wall has nothing on it yet. And the
// primary capsule goes somewhere: it is the door into Main's own flow, which is
// what docs/launchsteps.md section 0c said Phase 6b would give it.
//
// It has exactly three jobs and it is laid out in that order:
//
//   1  say the mechanic, flat, in the face that is allowed to feel
//   2  show it, in the one object on this page that moves
//   3  offer the two doors: Main's own flow, and the Berkeley wall
//
// ── what is deliberately not here ──────────────────────────────────────────
// No feature grid, no three benefits, no testimonial, no second heading that
// restates the first. A product whose whole promise is that nothing is
// announced cannot have a front door that announces four things. The page is
// one sentence, one object, two doors, and a great deal of empty room.
//
// The wall's masthead is the layout reference: the type block sits left, the
// drawn object sits right of it on a wide screen and under it on a phone, and
// the column never grows past what the system already allows.

import { useEffect, useRef, useState } from 'react'
import Alignment from '../signature/Alignment.jsx'
import { wallSummary, sinceAgo } from './data.js'
import Ticker from './Ticker.jsx'
import { ECL, ringPath, starPath } from '../wall/mark.js'

const MARK = { ring: ringPath(), star: starPath(ECL) }

// The mark, small, for the bar. Drawn here rather than imported from art.jsx
// because that module carries the whole ornament set and this surface needs one
// shape out of it.
function Mark({ size = 24 }) {
  return (
    <svg className="wl-ecl" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="sg-bar-near">
          <rect x="-110" y="50" width="320" height="160" transform={`rotate(${ECL.tilt} 50 50)`} />
        </clipPath>
        <mask id="sg-bar-notch" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <path d={ringPath(ECL.gutter)} fill="#000" fillRule="evenodd" clipPath="url(#sg-bar-near)" />
        </mask>
      </defs>
      <path d={MARK.ring} fill="currentColor" fillRule="evenodd" />
      <g mask="url(#sg-bar-notch)"><path d={MARK.star} transform="translate(50 50)" fill="currentColor" /></g>
      <path d={MARK.ring} fill="currentColor" fillRule="evenodd" clipPath="url(#sg-bar-near)" />
    </svg>
  )
}

export default function Hero({ go, who, still = false }) {
  const stage = useRef(null)

  // The wall's own two numbers. Asked once, and the gate below draws its quiet
  // form until they land rather than a zero: "0 letters" on a front door is a
  // worse sentence than no sentence, and it is the one a fetch that has not
  // returned would put there.
  const [wall, setWall] = useState(null)
  useEffect(() => {
    let alive = true
    wallSummary().then((w) => { if (alive) setWall(w) })
    return () => { alive = false }
  }, [])

  // The type leans on the hand. Each line answers by a different amount, so the
  // three lines separate in depth as the pointer crosses them and close back up
  // when it leaves: the same parallax the field is doing, in the one other
  // place on the page big enough to show it. Six pixels at the extreme, which
  // is under a character's width and over the threshold where the eye notices
  // that the page is aware of it.
  useEffect(() => {
    if (still) return
    const el = stage.current
    if (!el) return
    let raf = 0
    let x = 0, y = 0, tx = 0, ty = 0
    function onMove(e) {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    function frame() {
      x += (tx - x) * 0.05
      y += (ty - y) * 0.05
      el.style.setProperty('--lean-x', x.toFixed(3))
      el.style.setProperty('--lean-y', y.toFixed(3))
      raf = requestAnimationFrame(frame)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [still])

  return (
    <main className="wl-main sg-page sg-hero">
      <header className="wl-top sg-top">
        <span className="wl-top-mark">
          <span className="wl-lockup sg-lockup">
            <span className="wl-brand-mark"><Mark size={25} /></span>
            <span className="wl-lockup-word">celestual.</span>
          </span>
        </span>
        <span className="wl-label is-dim sg-top-note">berkeley</span>
      </header>

      <div className="sg-hero-body" ref={stage}>
        <div className="sg-hero-say">
          <p className="wl-label is-dim sg-in" style={{ '--d': '0ms' }}>
            double blind, both ways
          </p>

          {/* One sentence, three lines, and the break points are chosen rather
              than left to the browser: the turn lands on "or neither", which is
              the half of the mechanic people do not expect. */}
          <h1 className="wl-display is-xl sg-say">
            <span className="sg-line sg-in" style={{ '--d': '90ms' }}>
              <span className="sg-lean" style={{ '--lean': 0.6 }}>you both</span>
            </span>
            <span className="sg-line sg-in" style={{ '--d': '190ms' }}>
              <span className="sg-lean" style={{ '--lean': 1 }}>find out,</span>
            </span>
            <span className="sg-line sg-in" style={{ '--d': '300ms' }}>
              <span className="sg-lean" style={{ '--lean': 1.6 }}>or neither of you does.</span>
            </span>
          </h1>

          <p className="sg-mech sg-in" style={{ '--d': '480ms' }}>
            place a ping on somebody. if they place one back, you are both told
            at once. if they do not, nobody is, and nobody ever knows there was
            anything to know.
          </p>
        </div>

        <div className="sg-hero-stage sg-in" style={{ '--d': '380ms' }}>
          <Alignment size={340} still={still} id="hero" />
        </div>
      </div>

      {/* ── the ticker ──
          Spec section 8. Names off the wall, drifting, with nothing on them but
          a display name, a handle and a badge. It sits between the composition
          and the doors because that is where it answers the question the
          composition raises: this is a real place with real people written to
          in it. It draws nothing at all when the wall is empty, which is the
          correct state for a front page rather than an empty band. */}
      <Ticker />

      <div className="sg-hero-foot">
        {/* The wall, as a door rather than as a mention. It carries its own two
            real numbers, because a campus surface that will not say how many
            letters are on it is a campus surface nobody believes. */}
        <a className="sg-gate sg-in" href="/berkeley" style={{ '--d': '620ms' }}>
          <span className="sg-gate-l">
            <span className="wl-label is-dim">the wall at berkeley</span>
            {wall ? (
              <>
                <span className="sg-gate-h">
                  {wall.letters === 1 ? 'one letter' : `${wall.letters} letters`}
                  {', to '}
                  {wall.handles === 1 ? 'one name' : `${wall.handles} names`}
                </span>
                <span className="sg-gate-m">
                  the newest is to <span className="sg-h">@{wall.newest}</span>,{' '}
                  {sinceAgo(wall.newestAt)}
                </span>
              </>
            ) : (
              /* Nothing counted yet, or nothing there to count. The door still
                 opens and it still says what is behind it; what it does not do
                 is put a number on the front page that it had to invent. */
              <>
                <span className="sg-gate-h">letters nobody sent</span>
                <span className="sg-gate-m">written about people who never saw them</span>
              </>
            )}
          </span>
          <span className="sg-gate-g" aria-hidden="true">&#8594;</span>
        </a>

        <div className="wl-dock sg-dock sg-in" style={{ '--d': '720ms' }}>
          <div className="wl-dock-veil" />
          <div className="wl-dock-in">
            {/* Two words and they are the act, not an invitation to consider
                the act. Spec 7.1 bans "get started" for the reason this button
                exists: the thing you came to do is the thing on the button.

                Somebody who already has pings out lands on their own sky
                instead, because a front door that sends a returning person
                through the sign-up is a front door that has not looked. */}
            <button
              className="wl-pill is-light" type="button"
              onClick={() => go(who.handleVerified ? 'sky' : 'place')}
            >
              {who.handleVerified ? 'your sky' : 'place a ping'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

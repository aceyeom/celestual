// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MAIN HERO                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The front door. One of the two surfaces docs/rebuild-spec.md 7.1 says carries
// the artistry, and the one a person meets before they know what this is.
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

import { useEffect, useRef } from 'react'
import Alignment from './Alignment.jsx'
import { WALL, LETTER, since } from './data.js'
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

export default function Hero({ still = false }) {
  const stage = useRef(null)

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

      <div className="sg-hero-foot">
        {/* The wall, as a door rather than as a mention. It carries its own two
            real numbers, because a campus surface that will not say how many
            letters are on it is a campus surface nobody believes. */}
        <a className="sg-gate sg-in" href="/berkeley" style={{ '--d': '620ms' }}>
          <span className="sg-gate-l">
            <span className="wl-label is-dim">the wall at {WALL.campus}</span>
            <span className="sg-gate-h">{WALL.letters} letters, {WALL.standing} of them still sealed</span>
            <span className="sg-gate-m">
              the newest is to <span className="sg-h">@{LETTER.to_handle}</span>,{' '}
              {since(LETTER.written_at)} ago
            </span>
          </span>
          <span className="sg-gate-g" aria-hidden="true">&#8594;</span>
        </a>

        <div className="wl-dock sg-dock sg-in" style={{ '--d': '720ms' }}>
          <div className="wl-dock-veil" />
          <div className="wl-dock-in">
            <button className="wl-pill is-light" type="button">place a ping</button>
          </div>
        </div>
      </div>
    </main>
  )
}

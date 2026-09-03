// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FRONT DOOR                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Main's hero, at `/`. One of the two surfaces docs/rebuild-spec.md 7.1 gives
// the artistry to, and the one a person meets before they know what this is.
//
// ── what it has to do, in order ─────────────────────────────────────────────
//
//   1  say what this is, and let somebody do it right there
//   2  show it, in the one object on the page that moves
//   3  explain how it works, for the person who wants to know before they act
//   4  name the wall, say what it is, and give it a door that reads as one
//   5  give a returning person the way to their own sky
//
// ── what came off, and why ──────────────────────────────────────────────────
// The first hero was one composition in one viewport and it was approved as a
// poster. As a door it failed in five ways, and each of them is a section here:
// the mark, four hundred pixels of it, was the only object and it explained
// nothing; the wall was the word "berkeley" in the corner and a row at the
// foot; there was nowhere to sign in; nothing said how it worked; and the one
// capsule sat at the bottom left of the screen after a ticker of names that
// belonged to a different surface.
//
// The mark still opens the page, at the size a mark should be, in the lockup.
// The two orbits closing on one another are still the reveal's, where they
// mean what they say. The ticker is still here, under the wall it comes from.
//
// ── what is deliberately still not here ─────────────────────────────────────
// No testimonial, no count of people, no "as seen on", no second heading that
// restates the first, no faces. Every number on this page is read off the wall's
// public index or it is absent. The cards in the scene say "you" and "them" and
// carry no handle, because a front door that fakes activity is the pattern this
// product exists to not be.

import { useEffect, useState } from 'react'
import { Lockup, Ecliptic, Sparkle } from '../wall/art.jsx'
import { Display, Label, Pill, HandleField, ArrowLink } from '../wall/parts.jsx'
import { normHandle, validHandle, atHandle } from '../wall/data.js'
import { wallSummary, sinceAgo } from './data.js'
import { href } from './router.js'
import Ticker from './Ticker.jsx'
import Scene, { Orbits } from './Scene.jsx'
import './hero.css'

// A link to one of Main's own addresses. It is a real anchor, so it opens in a
// new tab, copies and reads out like one, and a plain click stays inside the
// shell rather than reloading the app.
function Jump({ go, to, id, children, ...rest }) {
  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
    e.preventDefault()
    go(to, id)
  }
  return <a href={href(to, id)} onClick={onClick} {...rest}>{children}</a>
}

export default function Hero({ go, who, still = false }) {
  // The wall's own two numbers. Asked once, and the section below draws its
  // quiet form until they land rather than a zero: "0 letters" on a front door
  // is a worse sentence than no sentence.
  const [wall, setWall] = useState(null)
  useEffect(() => {
    let alive = true
    wallSummary().then((w) => { if (alive) setWall(w) })
    return () => { alive = false }
  }, [])

  // ── the ask ──
  // A handle typed here lands on /place with the name already in it. An empty
  // field still opens the flow, which then asks; a handle that cannot be one
  // is said so, in place, and nothing moves.
  const [to, setTo] = useState('')
  const [said, setSaid] = useState('')
  const submit = () => {
    const h = normHandle(to)
    if (!h) { go('place'); return }
    if (!validHandle(h)) { setSaid('that handle does not look right'); return }
    go('place', h)
  }

  const toHow = (e) => {
    e.preventDefault()
    const el = document.getElementById('how')
    if (el) el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <main className="hm-page">
      {/* ── the bar ──
          The lockup, because this is the one screen that has to say the name.
          Then the three ways off it: down the page, to the wall, and to your
          own sky, which is where signing in happens and is also where it
          lands. The capsule reads the handle once one is proved. */}
      <header className="hm-top hm-in" style={{ '--d': '0ms' }}>
        <Jump go={go} to="hero" className="hm-home" aria-label="celestual, the front">
          {/* The word alone. The mark has just filled the screen in the intro
              and stands in the scene below; a third copy of it beside its own
              name in the corner is the product signing every line. */}
          <span className="hm-word">celestual.</span>
        </Jump>
        <nav className="hm-nav" aria-label="celestual">
          <a className="hm-navlink is-how" href="#how" onClick={toHow}>how it works</a>
          <a className="hm-navlink" href="/berkeley">the wall</a>
          <Pill tone="ghost" onClick={() => go('sky')}>
            {who.handleVerified ? <span className="hm-me">{atHandle(who.handle)}</span> : 'sign in'}
          </Pill>
        </nav>
      </header>

      {/* ── the hero ── */}
      <section className="hm-hero">
        <div className="hm-say">
          <Label className="hm-eyebrow hm-in" style={{ '--d': '60ms' }}>double blind, both ways</Label>

          {/* One sentence, two lines, and the break is chosen rather than left
              to the browser: the turn lands on "or neither", which is the half
              of the mechanic people do not expect. */}
          <h1 className="wl-display is-xl hm-title hm-in" style={{ '--d': '140ms' }}>
            <span className="hm-line">you both find out,</span>
            <span className="hm-line">or neither of you does.</span>
          </h1>

          <p className="hm-read hm-mech hm-in" style={{ '--d': '260ms' }}>
            place a ping on somebody&rsquo;s instagram. <b>they are never told.</b> if they
            place one on you, you are both told at the same moment. if they do not, nobody
            is, and nobody ever knows there was anything to know.
          </p>

          <form className="hm-ask hm-in" style={{ '--d': '380ms' }} onSubmit={(e) => { e.preventDefault(); submit() }}>
            <HandleField
              value={to} onChange={(v) => { setTo(v); setSaid('') }} onSubmit={submit}
              size="lg" placeholder="theirhandle" label="their instagram handle"
            />
            <div className="hm-ask-row">
              <Pill tone="light" onClick={submit}>place a ping</Pill>
              <span className="hm-read hm-ask-note">
                free. one instagram message proves the @ is yours, and that is the whole account.
              </span>
            </div>
            <p className="hm-said" role="status" aria-live="polite">{said}</p>
          </form>

          <div className="hm-facts hm-in" style={{ '--d': '460ms' }}>
            <Label><Sparkle size={8} />two standing at a time</Label>
            <Label><Sparkle size={8} />sixty days each</Label>
            <Label><Sparkle size={8} />never told unless it is mutual</Label>
          </div>
        </div>

        <div className="hm-stage hm-in" style={{ '--d': '320ms' }}>
          <Scene still={still} />
          <Label className="hm-stage-cap">what a mutual looks like. until then, both stay sealed.</Label>
        </div>
      </section>

      {/* ── how it works ──
          A ledger down the page, with the mark's own states beside the steps.
          Not a card grid: three boxes with an icon each is the one layout the
          spec bans by name, and it is banned because it reads as generated. */}
      <section id="how" className="hm-how">
        <div className="hm-sec-head">
          <Label>how it works</Label>
          <Display size="l" as="h2">nothing is said until it is said twice.</Display>
          <p className="hm-read hm-sec-copy">
            a ping is a sealed card with a name on it. the only thing that can open it is
            the same card, placed back.
          </p>
        </div>

        <div className="hm-how-body">
          <ol className="hm-steps">
            <li className="hm-step">
              <Orbits state={0} className="hm-step-glyph" />
              <div className="hm-step-text">
                <Label>01</Label>
                <Display size="s" as="h3">place a ping on a handle.</Display>
                <p className="hm-read hm-step-p">
                  type their instagram, write a line only they will ever read, and prove your
                  own handle once with one DM. they are not told.
                </p>
              </div>
            </li>
            <li className="hm-step">
              <Orbits state={1} className="hm-step-glyph" />
              <div className="hm-step-text">
                <Label>02</Label>
                <Display size="s" as="h3">it stands for sixty days.</Display>
                <p className="hm-read hm-step-p">
                  you can hold two at a time. let one go whenever you like, and nobody is told
                  that either. when it lapses, it lapses quietly.
                </p>
              </div>
            </li>
            <li className="hm-step">
              <Ecliptic size={52} className="hm-step-glyph" />
              <div className="hm-step-text">
                <Label>03</Label>
                <Display size="s" as="h3">if they place one on you, it is mutual.</Display>
                <p className="hm-read hm-step-p">
                  you are both told at the same moment, and each of you reads what the other
                  wrote. if they never do, neither of you ever hears a word.
                </p>
              </div>
            </li>
          </ol>

          <div className="hm-rules">
            <div className="hm-rule">
              <span className="hm-rule-k">a hash</span>
              <span className="hm-read hm-rule-v">
                is all the server keeps of who you entered. salted, one way, and never shown
                to anybody.
              </span>
            </div>
            <div className="hm-rule">
              <span className="hm-rule-k">your @</span>
              <span className="hm-read hm-rule-v">
                is proved with one instagram message. there is no password and nothing to
                install.
              </span>
            </div>
            <div className="hm-rule">
              <span className="hm-rule-k">for good</span>
              <span className="hm-read hm-rule-v">
                is how a name comes off. <Jump go={go} to="optout">take your handle off</Jump> and
                it can never be entered again.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── the wall ──
          Named, explained, counted, with a door that says what it is. The
          numbers are the wall's own, off its public index, and they are absent
          rather than invented when there is nothing to count. */}
      <section className="hm-wall">
        <div className="hm-sec-head">
          <Label>a campus surface</Label>
          <Display size="l" as="h2">the wall at berkeley.</Display>
          <p className="hm-read hm-sec-copy">
            short anonymous letters from people who were there, each addressed to one
            handle. the names are public. the letters open with a berkeley.edu address,
            every one is screened before it appears, and the person it is about can take
            it down.
          </p>
        </div>

        <div className="hm-wall-body">
          {wall ? (
            <div className="hm-wall-facts">
              <div className="hm-wall-fact">
                <span className="hm-wall-fact-k">{wall.letters}</span>
                <span className="hm-read hm-wall-fact-v">{wall.letters === 1 ? 'letter on the wall' : 'letters on the wall'}</span>
              </div>
              <div className="hm-wall-fact">
                <span className="hm-wall-fact-k">{wall.handles}</span>
                <span className="hm-read hm-wall-fact-v">{wall.handles === 1 ? 'name written to' : 'names written to'}</span>
              </div>
              <div className="hm-wall-fact">
                <span className="hm-wall-fact-k is-h">{atHandle(wall.newest)}</span>
                <span className="hm-read hm-wall-fact-v">the newest, {sinceAgo(wall.newestAt)}</span>
              </div>
            </div>
          ) : (
            <p className="hm-read hm-sec-copy">letters nobody sent, written about people who never saw them.</p>
          )}
          <ArrowLink href="/berkeley" className="hm-wall-go">open the wall</ArrowLink>
        </div>

        <Ticker />
      </section>

      {/* ── the foot ── */}
      <footer className="hm-foot">
        <div className="hm-foot-row">
          <Lockup size={15} className="hm-foot-lock" />
          <nav className="hm-foot-links" aria-label="the rest of it">
            <a href="/berkeley">the wall at berkeley</a>
            <Jump go={go} to="sky">your sky</Jump>
            <Jump go={go} to="optout">take your handle off</Jump>
            <a href="/terms">terms</a>
            <a href="/privacy">privacy</a>
            <a href="/data-deletion">data deletion</a>
          </nav>
        </div>
        <Label className="hm-foot-note">double blind, both ways</Label>
      </footer>
    </main>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FRONT DOOR                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Main's hero, at `/`. One of the two surfaces docs/rebuild-spec.md 7.1 gives
// the artistry to, and the one a person meets before they know what this is.
//
// ── one screen ──────────────────────────────────────────────────────────────
// It does not scroll. It was a page: a hero, a ledger of how it works, a
// section on the wall with its counts and a ticker, and a foot, and it said
// everything three times on the way down. A front door has one thing to say
// and one thing to do, so this is: the sentence, one line under it, the field
// and the act, three facts, the object, and the way to the rest.
//
// ── what is deliberately not here ───────────────────────────────────────────
// No testimonial, no count of people, no "as seen on", no second heading that
// restates the first, no faces. The cards in the scene say "you" and "them"
// and carry no handle, because a front door that fakes activity is the pattern
// this product exists to not be.

import { useState } from 'react'
import { Sparkle } from '../wall/art.jsx'
import { Label, Pill, HandleField, HandleCard, Me } from '../wall/parts.jsx'
import { normHandle, validHandle } from '../wall/data.js'
import { href } from './router.js'
import Scene from './Scene.jsx'
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
  // ── the ask ──
  // A handle typed here lands on /place with the name already in it. An empty
  // field still opens the flow, which then asks; a handle that cannot be one
  // is said so, in place, and nothing moves. The card that pops up under the
  // field is the same act: press the person, place the ping.
  const [to, setTo] = useState('')
  const [said, setSaid] = useState('')
  const submit = () => {
    const h = normHandle(to)
    if (!h) { go('place'); return }
    if (!validHandle(h)) { setSaid('that handle does not look right'); return }
    go('place', h)
  }

  return (
    <main className="hm-page">
      {/* ── the bar ──
          The word, because this is the one screen that has to say the name.
          Then the wall, and you. */}
      <header className="hm-top hm-in" style={{ '--d': '0ms' }}>
        <Jump go={go} to="hero" className="hm-home" aria-label="celestual, the front">
          <span className="hm-word">celestual.</span>
        </Jump>
        <nav className="hm-nav" aria-label="celestual">
          <a className="hm-navlink" href="/berkeley">the wall</a>
          <Me who={who} onClick={() => go('sky')} />
        </nav>
      </header>

      {/* ── the hero ── */}
      <section className="hm-hero">
        <div className="hm-say">
          {/* One sentence, two lines, and the break is chosen rather than left
              to the browser: the turn lands on "or neither", which is the half
              of the mechanic people do not expect. */}
          <h1 className="wl-display is-xl hm-title hm-in" style={{ '--d': '100ms' }}>
            <span className="hm-line">you both find out,</span>
            <span className="hm-line">or neither of you does.</span>
          </h1>

          <p className="hm-read hm-mech hm-in" style={{ '--d': '220ms' }}>
            place a ping on somebody&rsquo;s instagram. <b>they are never told.</b> if
            they place one on you, you both find out at once.
          </p>

          <form className="hm-ask hm-in" style={{ '--d': '340ms' }} onSubmit={(e) => { e.preventDefault(); submit() }}>
            <HandleField
              value={to} onChange={(v) => { setTo(v); setSaid('') }} onSubmit={submit}
              size="lg" placeholder="theirhandle" label="their instagram handle"
            />
            <HandleCard handle={to} onSelect={submit} />
            <div className="hm-ask-row">
              <Pill tone="light" onClick={submit}>place a ping</Pill>
              <p className="hm-said" role="status" aria-live="polite">{said}</p>
            </div>
          </form>

          {/* The three terms, as labels. They are the rules of the object
              beside them and they are read once. */}
          <div className="hm-facts hm-in" style={{ '--d': '420ms' }}>
            <Label><Sparkle size={8} />two at a time</Label>
            <Label><Sparkle size={8} />sixty days</Label>
            <Label><Sparkle size={8} />free</Label>
          </div>
        </div>

        <div className="hm-stage hm-in" style={{ '--d': '300ms' }}>
          <Scene still={still} />
        </div>
      </section>

      {/* ── the foot ── */}
      <footer className="hm-foot hm-in" style={{ '--d': '480ms' }}>
        <nav className="hm-foot-links" aria-label="the rest of it">
          <a href="/berkeley">the wall at berkeley</a>
          <Jump go={go} to="sky">your sky</Jump>
          <Jump go={go} to="optout">take your @ off</Jump>
          <a href="/terms">terms</a>
          <a href="/privacy">privacy</a>
        </nav>
      </footer>
    </main>
  )
}

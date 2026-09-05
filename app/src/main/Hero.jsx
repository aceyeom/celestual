// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FRONT DOOR                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Main's hero, at `/`. One of the two surfaces docs/rebuild-spec.md 7.1 gives
// the artistry to, and the one a person meets before they know what this is.
//
// ── one screen, and the foot under it ───────────────────────────────────────
// It was a page: a hero, a ledger of how it works, a section on the wall with
// its counts and a ticker, and a foot, and it said everything three times on
// the way down. A front door has one thing to say and one thing to do, so the
// first screen is: the sentence, one line under it, the field and the act,
// three facts, the object. Under that, and only under it, the foot of the
// site: the same block the wall and the legal pages end on, with the company
// on it. A person who scrolls is a person looking for it.
//
// ── what is deliberately not here ───────────────────────────────────────────
// No testimonial, no count of people, no "as seen on", no second heading that
// restates the first, no faces. The cards in the scene say "you" and "them"
// and carry no handle, because a front door that fakes activity is the pattern
// this product exists to not be.

import { useRef, useState } from 'react'
import {
  Pill, HandleField, HandleCard, Me, Brand, SiteFoot, useResolver, useLookingWords, confirmWord,
} from '../wall/parts.jsx'
import { normHandle, validHandle } from '../wall/data.js'
import { useSkyAvoid } from '../wall/ground.jsx'
import Scene from './Scene.jsx'
import './hero.css'

export default function Hero({ go, who, still = false }) {
  // ── the ask ──
  // A handle typed here lands on /place with the name already in it. An empty
  // field still opens the flow, which then asks; a handle that cannot be one
  // is said so, in place, and nothing moves. The card that pops up under the
  // field is the same act: press the person, place the ping.
  const [to, setTo] = useState('')
  const [said, setSaid] = useState('')
  // The headline is what the sky parts round on this screen.
  const avoid = useSkyAvoid()
  // ── the card under the field, and the two presses ──
  // It peeks the cache while the person types (free, instant for a handle
  // anybody has committed before) and asks Apify only when they press. The
  // first press on a handle nobody has looked up draws the card looking, with
  // a line under it saying so; the answer lands as a person, a "no account by
  // that name", or a "could not check", and the capsule changes its word to
  // match. The second press, on the card or the capsule, is the act, and it
  // is against what the card says. Nothing moves on without that second
  // press: a lookup that failed used to let the same press through, so the
  // flow read as one that looked and then skipped the confirmation.
  const them = useResolver(to)
  const words = useLookingWords(them.at)
  const field = useRef(null)
  const submit = async () => {
    const h = normHandle(to)
    if (!h) { go('place'); return }
    if (!validHandle(h)) { setSaid('that handle does not look right'); return }
    if (them.looking) return
    if (!them.settled) { await them.ask(); return }
    go('place', h)
  }
  // "not them": back to the field, with the name selected so a keystroke
  // replaces it. Editing resets the card on its own.
  const fix = () => { const el = field.current; if (el) { el.focus(); el.select() } }
  const cardUp = ['found', 'missing', 'unknown'].includes(them.at.state)

  // The brand is a real anchor to `/`, so it opens in a new tab and copies like
  // one, and a plain click stays inside the shell rather than reloading the app.
  const home = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
    e.preventDefault()
    go('hero')
  }

  return (
    <main className="hm-page">
      {/* ── the fold ──
          The first screen: the bar, the type block, the act and the object,
          sharing the height of the viewport between them. The foot of the site
          is under it, not in it, so the object keeps the room it was given. */}
      <div className="hm-fold">
      {/* ── the bar ──
          The brand, which is the same lockup every bar in the product
          carries. Then the wall, and you. */}
      <header className="hm-top hm-in" style={{ '--d': '0ms' }}>
        <Brand href="/" onClick={home} className="hm-home" />
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
          <h1 ref={avoid} className="wl-display is-xl hm-title hm-in" style={{ '--d': '100ms' }}>
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
              busy={them.looking} inputRef={field}
            />
            <HandleCard at={them.at} onSelect={submit} />
            <div className="hm-ask-row">
              {/* Lit: the glow the result card waits with, seen through the
                  capsule, on the one act on the screen. Disabled while the
                  resolver is out, so a second tap cannot skip past the card. */}
              <Pill tone="light" lit onClick={submit} disabled={them.looking}>
                {confirmWord(them.at, 'place a ping')}
              </Pill>
              {cardUp && !said ? (
                <button type="button" className="wl-quiet hm-fix" onClick={fix}>not them? change it</button>
              ) : (
                <p className={`hm-said${words && !said ? ' is-quiet' : ''}`} role="status" aria-live="polite">
                  {said || words}
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="hm-stage hm-in" style={{ '--d': '300ms' }}>
          <Scene still={still} />
        </div>
      </section>
      </div>

      {/* ── the foot ──
          The site's, shared with the wall and the legal pages. Plain clicks on
          Main's own addresses stay in the shell. */}
      <SiteFoot go={go} className="hm-in" />
    </main>
  )
}

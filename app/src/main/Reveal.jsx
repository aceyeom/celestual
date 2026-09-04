// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MUTUAL REVEAL                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The second signature surface, and the one the whole product exists to reach.
// Two people each said something into the dark without knowing the other had,
// and this is the screen where they are told, at the same instant, that they
// both did.
//
// Promoted from /signature/reveal in Phase 6b. The composition is unchanged in
// every part that was approved: the same four beats, the same alignment, the
// same two cards rising together. What changed is that a real mutual drives it
// and the two profiles are resolved rather than invented.
//
// It is reached from the sky and from nowhere else. There is deliberately no
// link to it from the hero: the reveal is not somewhere a person goes from the
// front door, it is what happens when somebody they never named turns out to
// have named them, and a button that jumped to it would be the one lie this
// product could tell about its own mechanic.
//
// ── the argument for the composition ───────────────────────────────────────
// It is built as four beats, and the order is the meaning:
//
//   1  the mark forms          the two orbits arrive at each other. Whatever
//                              else is on the screen, the first thing that
//                              happens is the alignment, because that is the
//                              event. The bloom is spent here and nowhere else.
//   2  the sentence lands      three words, in the face that is allowed to feel
//   3  the two cards rise      side by side, together, never one before the
//                              other. A stagger here would say one of them
//                              mattered more, and the entire premise is that
//                              neither did
//   4  the handle, and the way out
//
// The cards rise TOGETHER and everything else is staggered. That is the one
// place in this build where two objects deliberately share a frame.
//
// ── what the cards are ─────────────────────────────────────────────────────
// Each is the paper, carrying the identity shape from spec section 5: the
// avatar, the handle, the display name, the verification badge. An avatar that
// is missing draws a monogram, because spec section 5 says a failed download
// stores nothing and a missing avatar must never block a card from rendering.
// This is the surface where that promise is most expensive to break, so it is
// the one that has to survive the state.

import { useEffect, useState } from 'react'
import { Who, useProfile } from '../wall/parts.jsx'
import { normHandle, atHandle } from '../wall/data.js'
import { heldProof } from '../wall/auth.js'
import { myPings, sinceAgo } from './data.js'
import LiquidMark from '../wall/LiquidMark.jsx'
import TopBar from './TopBar.jsx'

// One side of it: the paper, the person, the line. The person is parts.jsx
// `Who`, which is the same face and name the sky and the search draw, so the
// two of you look here the way you looked to each other on the way in.
function Card({ handle, ping, side, delay }) {
  return (
    <article className="wl-paper sg-card sg-in" style={{ '--d': delay }}>
      <div className="wl-paper-grain" />

      <div className="wl-paper-head">
        <span>{side}</span>
        <span className="wl-paper-stamp">{sinceAgo(ping.at)}</span>
      </div>

      <div className="sg-who">
        <Who handle={handle} size={42} />
      </div>

      <div className="wl-paper-body">
        <p className="wl-prose">{ping.line}</p>
      </div>
    </article>
  )
}

export default function Reveal({ go, who, known = true, id, still = false }) {
  const them = normHandle(id)
  const [mutual, setMutual] = useState(undefined)

  // The mutual itself, off the same RPC the sky reads. Asked here as well as
  // there so a shared or reloaded address lands on the screen rather than on an
  // empty one. Not asked, and nothing said, until whoami has answered: this
  // screen used to say "Nothing here." for the second before it did.
  useEffect(() => {
    let alive = true
    if (!known) { setMutual(undefined); return undefined }
    if (!who.handleVerified || !them) { setMutual(null); return undefined }
    setMutual(undefined)
    myPings({ handle: who.handle, proof: heldProof(who.handle) }).then((out) => {
      if (!alive) return
      setMutual(out.mutuals.find((m) => normHandle(m.to) === them) || null)
    })
    return () => { alive = false }
  }, [who.handle, who.handleVerified, them, known])

  const theirs = useProfile(them)

  if (mutual === undefined) {
    return <main className="wl-main sg-page sg-reveal"><TopBar go={go} who={who} /></main>
  }

  // Not a mutual, or not this person's to see. Said flatly and without a
  // reason, because every reason this screen could give is a fact about
  // somebody else.
  if (!mutual) {
    return (
      <main className="wl-main sg-page sg-reveal">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <h1 className="wl-display is-l">Nothing here.</h1>
        </div>
        <div className="mn-foot">
          <button className="wl-pill is-light" type="button" onClick={() => go('sky')}>your sky</button>
        </div>
      </main>
    )
  }

  // Each side carries its own timestamp and nothing carries the pair's.
  // celestual_my_pings hands this person their own, so their card is dated and
  // the other card is not: it used to wear this person's date under "them",
  // which was the one thing on the screen that was not true.
  const mineSide = { at: mutual.at, line: mutual.line }
  const theirSide = { at: 0, line: mutual.theirLine }

  return (
    <main className="wl-main sg-page sg-reveal">
      {/* The seal: the mark as a material, the same object the sky's mutual
          row wears and the front door lights. No bloom behind it. The paper is
          the bright thing on this screen, because it is what the two of them
          actually wrote, and the metal is the light of its own. */}
      <div className="sg-reveal-stage sg-in" style={{ '--d': '0ms' }}>
        <span className="sg-reveal-seal" aria-hidden="true">
          <LiquidMark size="100%" speed={0.6} still={still} />
        </span>
      </div>

      <h1 className="wl-display is-xl sg-in sg-reveal-say" style={{ '--d': '520ms' }}>
        it&#8217;s mutual.
      </h1>

      {/* Together, not staggered. See the note at the top of this file. */}
      <div className="sg-pair">
        <Card handle={who.handle} ping={mineSide} side="you" delay="900ms" />
        <Card handle={them} ping={theirSide} side="them" delay="900ms" />
      </div>

      <div className="sg-reveal-foot">
        <p className="sg-mech sg-in" style={{ '--d': '1400ms' }}>
          the rest is yours. celestual&#8217;s part is done.
        </p>

        <div className="sg-reveal-acts sg-in" style={{ '--d': '1520ms' }}>
          <a
            className="wl-pill is-light"
            href={`https://instagram.com/${them}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            open {atHandle(them)}
          </a>
          <button className="wl-quiet" type="button" onClick={() => go('sky')}>
            keep this to yourself
          </button>
        </div>
      </div>

      {/* The one thing this screen owes anybody who is not looking at it: the
          same four facts, in the order they matter, for a reader that never
          sees the composition above. */}
      <p className="wl-sr">
        Mutual with {theirs?.name || atHandle(them)}, {atHandle(them)}
        {theirs?.verified ? ', verified on Instagram' : ''}.
        You placed yours {sinceAgo(mineSide.at)}.
      </p>
    </main>
  )
}

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
import Alignment from '../signature/Alignment.jsx'
import { normHandle, atHandle } from '../wall/data.js'
import { heldProof } from '../wall/auth.js'
import { resolveHandle } from '../api/handles.js'
import { myPings, since } from './data.js'
import TopBar from './TopBar.jsx'

// Initials off the display name, the first two letters when there is one word,
// and the handle's first letter when there is no name at all. A card with an
// empty disc on it looks broken rather than private.
function monogram(p) {
  const name = String(p?.display_name || '').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || '')).toUpperCase()
  }
  return String(p?.handle || '?').slice(0, 1).toUpperCase()
}

// The verification badge, drawn. Every other product on the phone uses a
// downloaded glyph for this; this one has a four point star already, so the
// tick sits inside the mark's own vocabulary rather than beside it.
function Verified({ title }) {
  return (
    <svg className="sg-ver" width="14" height="14" viewBox="0 0 24 24" role="img" aria-label={title}>
      <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
      <path
        d="M7.6 12.3 10.6 15.2 16.5 9.1" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function Card({ profile, ping, side, delay }) {
  return (
    <article className="wl-paper sg-card sg-in" style={{ '--d': delay }}>
      <div className="wl-paper-grain" />

      <div className="wl-paper-head">
        <span>{side}</span>
        <span className="wl-paper-stamp">{since(ping.at)} ago</span>
      </div>

      <div className="sg-who">
        <span className="sg-disc" aria-hidden="true">
          {profile.avatar
            ? <img src={profile.avatar} alt="" />
            : <span className="sg-mono">{monogram(profile)}</span>}
        </span>
        <span className="sg-who-id">
          <span className="sg-who-name">
            {profile.display_name}
            {profile.is_verified && <Verified title="verified on instagram" />}
          </span>
          <span className="sg-who-at">@{profile.handle}</span>
        </span>
      </div>

      <div className="wl-paper-body">
        <p className="wl-prose">{ping.line}</p>
      </div>
    </article>
  )
}

// A profile the resolver knows about, or the shape of one built from the
// handle alone. The reveal must render whatever the resolver says, including
// nothing: it is off by default and it can be rate limited, and neither is a
// reason to withhold the one screen this product exists to reach.
function useProfile(handle) {
  const [p, setP] = useState(() => ({ handle: normHandle(handle), display_name: '', is_verified: false, avatar: null }))
  useEffect(() => {
    const h = normHandle(handle)
    if (!h) return undefined
    let alive = true
    setP({ handle: h, display_name: '', is_verified: false, avatar: null })
    resolveHandle(h).then((r) => {
      if (!alive || r.state !== 'found') return
      setP({ handle: r.handle, display_name: r.name, is_verified: r.verified, avatar: r.avatar || null })
    })
    return () => { alive = false }
  }, [handle])
  return p
}

export default function Reveal({ go, who, id }) {
  const them = normHandle(id)
  const [mutual, setMutual] = useState(undefined)

  // The mutual itself, off the same RPC the sky reads. Asked here as well as
  // there so a shared or reloaded address lands on the screen rather than on an
  // empty one.
  useEffect(() => {
    let alive = true
    if (!who.handleVerified || !them) { setMutual(null); return undefined }
    myPings({ handle: who.handle, proof: heldProof(who.handle) }).then((out) => {
      if (!alive) return
      setMutual(out.mutuals.find((m) => normHandle(m.to) === them) || null)
    })
    return () => { alive = false }
  }, [who.handle, who.handleVerified, them])

  const mine = useProfile(who.handle)
  const theirs = useProfile(them)

  if (mutual === undefined) {
    return <main className="wl-main sg-page sg-reveal"><TopBar go={go} /></main>
  }

  // Not a mutual, or not this person's to see. Said flatly and without a
  // reason, because every reason this screen could give is a fact about
  // somebody else.
  if (!mutual) {
    return (
      <main className="wl-main sg-page sg-reveal">
        <TopBar go={go} />
        <div className="mn-mid">
          <h1 className="wl-display is-l">Nothing here.</h1>
          <p className="sg-mech">Nothing has opened under that name.</p>
        </div>
        <div className="mn-foot">
          <button className="wl-pill is-light" type="button" onClick={() => go('sky')}>your sky</button>
        </div>
      </main>
    )
  }

  // Each side carries its own timestamp and nothing carries the pair's. The
  // eyebrow below says how far apart they were placed, which is the fact both
  // people actually have, and neither card claims to know when the other one
  // found out.
  const mineSide = { at: mutual.at, line: mutual.line }
  const theirSide = { at: mutual.at, line: mutual.theirLine }

  return (
    <main className="wl-main sg-page sg-reveal">
      <div className="sg-reveal-stage sg-in" style={{ '--d': '0ms' }}>
        <Alignment size={220} still id="reveal" />
      </div>

      {/* What is actually known. celestual_my_pings returns each person their
          OWN timestamp and not the other's, so "placed nine days apart" is a
          sentence this screen cannot truthfully say however good it sounds. It
          says the thing both people can check instead. */}
      <p className="wl-label is-dim sg-in sg-reveal-eyebrow" style={{ '--d': '520ms' }}>
        you both said it, and neither of you knew
      </p>

      <h1 className="wl-display is-xl sg-in sg-reveal-say" style={{ '--d': '640ms' }}>
        it&#8217;s mutual.
      </h1>

      {/* Together, not staggered. See the note at the top of this file. */}
      <div className="sg-pair">
        <Card profile={mine} ping={mineSide} side="you" delay="980ms" />
        <Card profile={theirs} ping={theirSide} side="them" delay="980ms" />
      </div>

      <div className="sg-reveal-foot">
        <p className="sg-mech sg-in" style={{ '--d': '1500ms' }}>
          the rest is yours. celestual&#8217;s part is done.
        </p>

        <div className="sg-reveal-acts sg-in" style={{ '--d': '1620ms' }}>
          <a
            className="wl-pill is-light"
            href={`https://instagram.com/${theirs.handle}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            open {atHandle(theirs.handle)}
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
        Mutual with {theirs.display_name || atHandle(theirs.handle)}, {atHandle(theirs.handle)}
        {theirs.is_verified ? ', verified on Instagram' : ''}.
        You placed yours {since(mineSide.at)} ago. They placed theirs {since(theirSide.at)} ago.
      </p>
    </main>
  )
}

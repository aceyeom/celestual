// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MUTUAL REVEAL                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The second signature surface, and the one the whole product exists to reach.
// Two people each said something into the dark without knowing the other had,
// and this is the screen where they are told, at the same instant, that they
// both did.
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
// avatar, the handle, the display name, the verification badge. Both avatars
// are null here on purpose. Spec section 5 says a failed download stores
// nothing, the UI falls back to a monogram, and a missing avatar must never
// block a card from rendering, so the surface where that promise is most
// expensive to break is the one that gets drawn in that state.

import Alignment from './Alignment.jsx'
import { ME, THEM, MUTUAL, monogram, since, apart } from './data.js'

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
        <span className="wl-paper-stamp">{since(ping.placed_at)} ago</span>
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

export default function Reveal() {
  return (
    <main className="wl-main sg-page sg-reveal">
      <div className="sg-reveal-stage sg-in" style={{ '--d': '0ms' }}>
        <Alignment size={220} still id="reveal" />
      </div>

      <p className="wl-label is-dim sg-in sg-reveal-eyebrow" style={{ '--d': '520ms' }}>
        placed {apart(MUTUAL.mine.placed_at, MUTUAL.theirs.placed_at)} apart, neither of you knowing
      </p>

      <h1 className="wl-display is-xl sg-in sg-reveal-say" style={{ '--d': '640ms' }}>
        it&#8217;s mutual.
      </h1>

      {/* Together, not staggered. See the note at the top of this file. */}
      <div className="sg-pair">
        <Card profile={ME} ping={MUTUAL.mine} side="you" delay="980ms" />
        <Card profile={THEM} ping={MUTUAL.theirs} side="them" delay="980ms" />
      </div>

      <div className="sg-reveal-foot">
        <p className="sg-mech sg-in" style={{ '--d': '1500ms' }}>
          the rest is yours. celestual&#8217;s part is done.
        </p>

        <div className="sg-reveal-acts sg-in" style={{ '--d': '1620ms' }}>
          <a
            className="wl-pill is-light"
            href={`https://instagram.com/${THEM.handle}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            open @{THEM.handle}
          </a>
          <button className="wl-quiet" type="button">keep this to yourself</button>
        </div>
      </div>

      {/* The one thing this screen owes anybody who is not looking at it: the
          same four facts, in the order they matter, for a reader that never
          sees the composition above. */}
      <p className="wl-sr">
        Mutual with {THEM.display_name}, @{THEM.handle}
        {THEM.is_verified ? ', verified on Instagram' : ''}.
        You placed yours {since(MUTUAL.mine.placed_at)} ago. They placed theirs {since(MUTUAL.theirs.placed_at)} ago.
      </p>
    </main>
  )
}

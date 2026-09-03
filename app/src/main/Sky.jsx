// ── /sky, what you have out ─────────────────────────────────────────────────
//
// Everything this person has placed, and nothing about anybody else. Two kinds
// of row and the difference between them is the whole product:
//
//   standing  a ping nobody has answered. It says the name, and how long it has
//             left. It does NOT say whether they have seen it, whether they are
//             on celestual, or whether anybody else has placed one on them,
//             because none of that is knowable without telling somebody
//             something they did not consent to being told.
//   mutual    both of you placed one. This is the only row that opens, and it
//             opens onto the reveal, which is its own surface.
//
// ── the empty state is the product ──────────────────────────────────────────
// Most people arriving here have nothing out yet, and the screen they meet is
// not an error and not an onboarding checklist. It is one sentence and one
// door, because the thing to do is the thing to do.
import { useEffect, useState } from 'react'
import { Display, Label, Pill, Prose, Row, PillTag } from '../wall/parts.jsx'
import { Mark, Sparkle } from '../wall/art.jsx'
import { atHandle } from '../wall/data.js'
import { heldProof } from '../wall/auth.js'
import { myPings, daysLeft, since } from './data.js'
import TopBar from './TopBar.jsx'
import Prove from './Prove.jsx'

export default function Sky({ go, who, refreshWho }) {
  const [state, setState] = useState({ loading: true, pings: [], mutuals: [] })

  useEffect(() => {
    let alive = true
    if (!who.handleVerified) { setState({ loading: false, pings: [], mutuals: [] }); return undefined }
    myPings({ handle: who.handle, proof: heldProof(who.handle) }).then((out) => {
      if (alive) setState({ loading: false, pings: out.pings, mutuals: out.mutuals })
    })
    return () => { alive = false }
  }, [who.handle, who.handleVerified])

  // ── not proved on this device ──
  // Said instead of the list rather than over a greyed-out one. A screen that
  // shows somebody an empty version of their own sky and a sentence explaining
  // why has made them read to find out they are looking at nothing.
  //
  // And it asks the question right here. This is where the front door's "sign
  // in" lands, and until now it landed on a sentence and a button into the
  // composer: somebody with three pings out was sent to start a fourth to see
  // the three. The proof is the same DM code /place asks for, and once it
  // lands `who` changes under this screen and the list draws itself.
  if (!who.handleVerified) {
    return (
      <main className="mn-page mn-sky">
        <TopBar go={go} />
        <div className="mn-mid">
          <Display size="m" as="h1">Your sky is<br />behind your @.</Display>
          <Prose className="mn-copy">
            a ping is placed by a handle, so seeing yours means proving the handle is
            yours. one instagram message, asked once.
          </Prose>
          <Prove who={who} refreshWho={refreshWho} />
        </div>
        <div className="mn-foot">
          <button type="button" className="wl-quiet" onClick={() => go('place')}>
            or place one first
          </button>
        </div>
      </main>
    )
  }

  const standing = state.pings.filter((p) => p.state !== 'mutual')

  return (
    <main className="mn-page mn-sky">
      <TopBar go={go} right={<span className="wl-label is-dim">{atHandle(who.handle)}</span>} />

      <div className="mn-mid">
        <Display size="m" as="h1" className="mn-h">
          {state.loading ? <>&nbsp;</>
            : state.mutuals.length ? <>Someone said it<br />back.</>
            : standing.length ? <>Standing.</>
            : <>Nothing out<br />yet.</>}
        </Display>

        {/* ── the mutuals ──
            First, and set apart, because it is the only thing on this screen
            that is news. A mutual buried under six standing rows is a mutual
            somebody scrolls past. */}
        {state.mutuals.map((p) => (
          <button key={p.id} type="button" className="mn-mutual" onClick={() => go('reveal', p.to)}>
            <Mark handle={p.to} size={44} lit />
            <span className="mn-mutual-l">
              <span className="wl-label is-dim">
                <Sparkle size={9} /> both of you
              </span>
              <span className="mn-mutual-h">{atHandle(p.to)}</span>
              <span className="mn-mutual-m">yours has stood {since(p.at)}</span>
            </span>
            <span className="sg-gate-g" aria-hidden="true">&#8594;</span>
          </button>
        ))}

        {/* ── the standing ──
            A name and a number of days. Nothing about the other person, because
            there is nothing about the other person that can be said. */}
        {standing.length ? (
          <div className="mn-list">
            {state.mutuals.length ? <Label tone="dim">and still out</Label> : null}
            {standing.map((p) => (
              <Row
                key={p.id}
                mark={<Mark handle={p.to} size={30} />}
                handle={p.to}
                meta={`${daysLeft(p.expires)} days left`}
                action={<PillTag tone="ghost">standing</PillTag>}
              />
            ))}
          </div>
        ) : !state.loading && !state.mutuals.length ? (
          <Prose className="mn-copy">
            place one on somebody. if they place one back, you are both told at once.
            if they do not, nobody is, and nobody ever knows there was anything to know.
          </Prose>
        ) : null}
      </div>

      <div className="mn-foot">
        <Pill tone="light" wide onClick={() => go('place')}>place a ping</Pill>
        <a className="wl-quiet mn-quiet-link" href="/berkeley">the wall at berkeley</a>
      </div>
    </main>
  )
}

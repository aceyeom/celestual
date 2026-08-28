// /beta/ask/:id — THE HINGE
//
// The most important screen for the business, because it is where somebody who
// came to look at a wall becomes somebody using Celestual. It is also the one
// screen where the obvious product instinct is wrong.
//
// The instinct is to reward the ask with the reveal: they tapped, give them the
// name, they will love it. Do not. The entire product is that the other person
// chooses — that is the thing being sold, it is the thing that makes the wall
// safe, and a demo that fakes an instant unlock teaches the wrong mechanic to
// the first hundred people who ever see it, several of whom will be the ones
// explaining it to everybody else.
//
// So the seal does not lift. What happens instead is that the point which
// became this card goes back into the field, brighter than its neighbours, and
// the flow says what it now is.

import { useEffect, useState } from 'react'
import { ArrowLink, Display, Help, Paper } from '../parts.jsx'
import { repo } from '../data/index.js'
import { getState } from '../store.js'

export default function Ask({ id, go, setSkyMode }) {
  const [letter, setLetter] = useState(null)
  const [asked, setAsked] = useState(() => !!getState().asked[id])
  const [busy, setBusy] = useState(false)

  useEffect(() => { setSkyMode('dim') }, [setSkyMode])

  useEffect(() => {
    let alive = true
    repo.getLetter(id).then((l) => { if (alive) setLetter(l) })
    return () => { alive = false }
  }, [id])

  async function ask() {
    if (busy) return
    setBusy(true)
    await repo.requestReveal(id)
    setBusy(false)
    setAsked(true)
    // the card's point returns to the field, and from here on it is the
    // brightest thing in it
    setSkyMode('ambient')
  }

  if (!letter) return <div className="beta-col"><div className="beta-lede" /></div>

  if (asked) {
    return (
      <div className="beta-col">
        <div className="beta-lede" />
        <Display size={34}>Asked. They&rsquo;ll know you found it.</Display>
        <div className="beta-push" />
        <Help style={{ marginBottom: 22 }}>This is Celestual now.</Help>
        <ArrowLink onClick={() => go('sky')}>open Celestual</ArrowLink>
      </div>
    )
  }

  return (
    <div className="beta-col">
      <div className="beta-lede-s" />
      <Display size={38}>Ask who wrote it.</Display>
      <Help style={{ marginTop: 18 }}>
        They choose whether to answer. You&rsquo;ll never see their name unless they say yes.
      </Help>

      <div style={{ marginTop: 30 }}>
        <Paper letter={letter} />
      </div>

      <div className="beta-push" />
      <ArrowLink onClick={ask} disabled={busy}>ask</ArrowLink>
      <ArrowLink onClick={() => go('sky')} tone="quiet">leave it sealed</ArrowLink>
    </div>
  )
}

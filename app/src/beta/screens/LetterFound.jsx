// /beta/letter/:id — THE LETTER
//
// The one screen where light wins. Everything else in this build is type on a
// void; this is a sheet of paper, and on this screen it is the only bright
// object anywhere — which is why the field behind it drops to 40% the moment
// the card lands.
//
// The entrance is two elements reading as one motion: a point leaves the field
// and travels to the centre over 700ms, and where it lands the card grows out
// of a blur. Trying to morph one element into the other would have been the
// obvious thing and it would have cost a layout-animating monster; two elements
// and a handoff is cheaper, steadier, and reads identically.

import { useEffect, useRef, useState } from 'react'
import { ArrowLink, Eyebrow, Paper } from '../parts.jsx'
import { pointPixels, prefersReducedMotion } from '../Sky.jsx'
import { repo } from '../data/index.js'
import { getState } from '../store.js'

function daysLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

export default function LetterFound({ id, go, setSkyMode, count, yours }) {
  const [letter, setLetter] = useState(null)
  const [missing, setMissing] = useState(false)
  const [landed, setLanded] = useState(prefersReducedMotion())
  const [removing, setRemoving] = useState(false)
  const comet = useRef(null)

  useEffect(() => {
    let alive = true
    repo.getLetter(id).then((l) => {
      if (!alive) return
      if (!l) { setMissing(true); return }
      setLetter(l)
    })
    return () => { alive = false }
  }, [id])

  // The field gets out of the way, but only once there is something to get out
  // of the way for.
  useEffect(() => { if (letter) setSkyMode('dim') }, [letter, setSkyMode])

  // The travel. Starts at the exact pixel the field had that point at — if the
  // comet starts anywhere else it is a light that came from nowhere, and the
  // whole conceit that these points are the letters quietly dies.
  useEffect(() => {
    if (!letter || landed || prefersReducedMotion()) return
    const from = pointPixels(count, yours ?? 0)
    const el = comet.current
    if (el) {
      el.style.setProperty('--fx', `${from.x}px`)
      el.style.setProperty('--fy', `${from.y}px`)
      el.style.setProperty('--tx', `${window.innerWidth / 2}px`)
      el.style.setProperty('--ty', `${Math.round(window.innerHeight * 0.46)}px`)
    }
    const t = setTimeout(() => setLanded(true), 700)
    return () => clearTimeout(t)
  }, [letter, landed, count, yours])

  async function takeDown() {
    if (!letter || removing) return
    setRemoving(true)
    await repo.removeLetter(letter.id, getState().handle)
    go('nothing')
  }

  if (missing) {
    // A letter that expired, or was taken down, between the link being sent and
    // the link being opened. It is not an error — it is the wall working — so
    // it is not dressed as one.
    return (
      <div className="beta-col">
        <div className="beta-lede-s" />
        <Eyebrow>NOTHING HERE ANY MORE</Eyebrow>
        <p className="beta-help" style={{ marginTop: 18 }}>This one came down.</p>
        <div className="beta-push" />
        <ArrowLink onClick={() => go('look')}>look for your name</ArrowLink>
      </div>
    )
  }

  if (!letter) return <div className="beta-col"><div className="beta-lede" /></div>

  return (
    <>
      {!landed && <span ref={comet} className="beta-comet" />}
      <div className="beta-col" style={{ justifyContent: 'center' }}>
        <div style={{ opacity: landed ? 1 : 0, transition: 'opacity 200ms linear' }}>
          <Eyebrow style={{ marginBottom: 20 }}>
            ONE LETTER · {daysLeft(letter.expiresAt)} DAYS LEFT
          </Eyebrow>

          <Paper letter={letter} entering={landed && !prefersReducedMotion()} />

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ArrowLink onClick={() => go('claim', letter.id)}>this is me</ArrowLink>
            {/* One tap, at full legibility, never behind a menu. This is what
                keeps a wall of anonymous letters about named people from
                reading as predatory, and it only works if it is visibly easy. */}
            <ArrowLink onClick={takeDown} tone="secondary" disabled={removing}>not me, take it down</ArrowLink>
          </div>
        </div>
      </div>
    </>
  )
}

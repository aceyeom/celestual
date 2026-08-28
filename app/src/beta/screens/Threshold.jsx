// /beta — THE THRESHOLD
//
// The first thing a person sees after scanning a flyer in the dark, and the
// only screen in the build carrying a long animation. That is a deliberate
// spend: the load sequence buys the atmosphere every screen after it draws
// down. It is orchestrated ONCE per session — somebody coming back to this
// route from /beta/look does not sit through a title card again.
//
//   sky      fades in over 1400ms   (the layout owns this one)
//   headline rises 24px over 900ms, 400ms in
//   eyebrow  1100ms
//   links    1400ms and 1550ms
//
// Nothing is interactive until it completes. A link that answers a tap while
// the type is still arriving turns a title card into a loading screen somebody
// was fighting.

import { useEffect, useState } from 'react'
import { ArrowLink, Display, Eyebrow, Halftone } from '../parts.jsx'
import { prefersReducedMotion } from '../Sky.jsx'

// Session-scoped and module-level rather than in the store: this is about the
// last thirty seconds, not about who the person is, and `↺ start over` should
// not make somebody watch it again.
let PLAYED = false

const DONE = 2450

// One beat of the sequence. When the sequence has already played, or motion is
// unwelcome, it is a plain wrapper and there is no animation to suppress.
function Beat({ at, playing, kind = 'rise', children }) {
  if (!playing) return children
  return <div className={kind === 'rise' ? 'beta-rise' : 'beta-in'} style={{ '--in': `${at}ms` }}>{children}</div>
}

export default function Threshold({ go }) {
  const [playing] = useState(() => !PLAYED && !prefersReducedMotion())
  const [armed, setArmed] = useState(() => PLAYED || prefersReducedMotion())

  useEffect(() => {
    if (armed) return
    const t = setTimeout(() => { PLAYED = true; setArmed(true) }, DONE)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <div className="beta-col">
      <div className="beta-lede" style={{ position: 'relative' }}>
        {/* the halftone sphere: once in the build, small, low-right, at 25% */}
        <Halftone size={108} style={{ bottom: 0, right: 4 }} />
      </div>

      <Beat at={400} playing={playing}>
        <Display>Someone here wrote something they never sent.</Display>
      </Beat>

      <Beat at={1100} playing={playing} kind="fade">
        <Eyebrow style={{ marginTop: 22 }}>Berkeley · 2026</Eyebrow>
      </Beat>

      <div className="beta-push" />

      <Beat at={1400} playing={playing} kind="fade">
        <ArrowLink onClick={() => go('look')} disabled={!armed}>look for your name</ArrowLink>
      </Beat>
      <Beat at={1550} playing={playing} kind="fade">
        <ArrowLink onClick={() => go('write')} tone="secondary" disabled={!armed}>write one</ArrowLink>
      </Beat>
    </div>
  )
}

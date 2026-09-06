// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE NOTICE                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A flyer pinned to the front door while a campus wall is open.
//
// The wall used to be a link in the bar, beside the sign in chip, on every
// visit, forever. But the wall is not a part of the product the way the sky
// is: it is a thing that happens on one campus for one term, and a permanent
// nav item is the wrong shape for a temporary event. It also put the
// product's most local thing at the same weight as the product's own front
// door, for everybody, from everywhere.
//
// So it is a notice now, and it is shaped like the thing it is: a piece of
// paper, pinned up, carrying the wall's own headline, the count, and the way
// there. It reads wall_pulse (0040) once per tab, and it is only on the door
// while that says the campus is open. When the term ends and the campus
// closes, it comes down on its own, and nothing on the front door has to be
// edited.
//
// It is the same paper as a ping, because a flyer on this door is a piece of
// this product's paper and not a banner. The pin is the campus's gold.

import { useEffect, useState } from 'react'
import { wallPulse } from '../wall/api.js'

// Asked once per tab. A person who comes back to the front door three times
// in a session does not need the wall counted three times.
let PULSE = null
let ASKING = null

function pulse() {
  if (PULSE) return Promise.resolve(PULSE)
  if (!ASKING) ASKING = wallPulse().then((r) => { PULSE = r; return r })
  return ASKING
}

export default function WallNotice({ className = '', style }) {
  const [p, setP] = useState(PULSE)
  useEffect(() => {
    let alive = true
    pulse().then((r) => { if (alive) setP(r) })
    return () => { alive = false }
  }, [])

  // Up while the campus is open, whatever is on the wall. An open wall with
  // nothing on it yet is the state the term starts in, and the door is the
  // one place a person who did not scan a flyer can find it from; hiding
  // the notice until the first letter would hide the wall exactly when it
  // most needs somebody to be first.
  if (!p || !p.ok || !p.open) return null

  const empty = p.names < 1
  const letters = p.letters === 1 ? 'one letter' : `${p.letters} letters`
  const names = p.names === 1 ? 'one name' : `${p.names} names`

  return (
    <a className={`wl-paper hm-notice ${className}`} href="/berkeley" style={style}>
      <span className="wl-paper-grain" aria-hidden="true" />
      <span className="hm-notice-pin" aria-hidden="true" />
      <span className="hm-notice-lab">on now, at berkeley</span>
      <span className="hm-notice-title">A wall of unforgettable berkeley bears.</span>
      <span className="hm-notice-meta">
        <span>{empty ? 'nothing on it yet' : `${letters} to ${names}`}</span>
        <span className="hm-notice-go">{empty ? 'write the first' : 'read the wall'} &#8594;</span>
      </span>
    </a>
  )
}

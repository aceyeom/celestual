// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE NOTICE                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The way to the campus wall, on the front door, while the wall is open.
//
// The wall used to be a link in the bar, beside the sign in chip, on every
// visit, forever. But the wall is not a part of the product the way the sky
// is: it is a thing that happens on one campus for one term, and a permanent
// nav item is the wrong shape for a temporary event. It also put the
// product's most local thing at the same weight as the product's own front
// door, for everybody, from everywhere.
//
// ── one line, not a flyer ───────────────────────────────────────────────────
// It was a sheet of the product's paper, pinned up at the foot of the fold
// with a headline on it. Two things were wrong with that. The front door
// already has two sheets of that paper on it, the scene's two cards, and a
// third one in the same cream read as a third letter rather than as a
// destination. And a flyer is a poster: it took a hundred and thirty pixels
// to say one thing.
//
// So it is a line now, and it is drawn in the room's own material rather
// than on paper: a hairline capsule on the void, the campus's lamp at the
// head of it, the name of the wall, the count, and the arrow. It stands
// under the ask, in the reading column, because that is where the eye is
// when it has finished with the front door and is looking for what else is
// here. It reads wall_pulse (0040) once per tab and it is only on the door
// while that says the campus is open. When the term ends and the campus
// closes, it comes down on its own.

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
  // the line until the first letter would hide the wall exactly when it
  // most needs somebody to be first.
  if (!p || !p.ok || !p.open) return null

  const empty = p.names < 1
  const letters = p.letters === 1 ? 'one letter' : `${p.letters} letters`
  const names = p.names === 1 ? 'one name' : `${p.names} names`

  return (
    <a className={`hm-wall ${className}`} href="/berkeley" style={style}>
      <span className="hm-wall-lamp" aria-hidden="true" />
      <span className="hm-wall-name">The Berkeley Wall</span>
      <span className="hm-wall-meta">
        {empty ? 'open now' : <>{letters}<span className="hm-wall-more"> · {names}</span></>}
      </span>
      <span className="hm-wall-go" aria-hidden="true">&#8594;</span>
    </a>
  )
}

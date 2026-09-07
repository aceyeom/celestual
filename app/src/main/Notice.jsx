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
// ── an ear, not a badge ─────────────────────────────────────────────────────
// It has been three things. A sheet of the product's paper pinned under the
// fold with a headline on it, which was a third letter on a door that already
// had two. Then a hairline capsule under the ask with a glowing gold dot at
// the head of it, which is the announcement pill every generated landing page
// opens on, and which put the wall's own colour on the one screen that is not
// the wall's.
//
// It is an ear now: the line a newspaper runs above its masthead, at the
// head of the type block, before the headline, set in the identifier face
// the way every dateline and count in the product is set. The wall's own
// masthead prints its count in exactly this face at exactly this size, so
// the line on the door and the line on the wall are one line, on two
// surfaces. No dot, no glow, no capsule: the name, the count, and the arrow,
// which travels under the pointer the way every arrow in the product does.
// The product's own sparkle stands at the head of it, dim, because a label
// with a sparkle set into it is already an idiom here (the note under the
// place screen's field) and an icon set would not know what it is next to.
//
// It reads wall_pulse (0040) once per tab and it is only on the door while
// that says the campus is open. When the term ends and the campus closes, it
// comes down on its own.

import { useEffect, useState } from 'react'
import { wallPulse } from '../wall/api.js'
import { Sparkle } from '../wall/art.jsx'

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

  const n = p.letters
  const count = p.names < 1 ? 'open now' : `${n} ${n === 1 ? 'letter' : 'letters'}`

  return (
    <a
      className={`hm-ear ${className}`} href="/berkeley" style={style}
      title="the wall" aria-label={`the wall at Berkeley, ${count}. open it`}
    >
      <Sparkle size={8} className="hm-ear-spark" />
      <span className="hm-ear-name">the wall at Berkeley</span>
      <span className="hm-ear-dot" aria-hidden="true">&middot;</span>
      <span className="hm-ear-meta">{count}</span>
      <span className="hm-ear-go" aria-hidden="true">&#8594;</span>
    </a>
  )
}

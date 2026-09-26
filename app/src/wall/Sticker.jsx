// ── the school's plate ──────────────────────────────────────────────────────
//
// A letter written to an @ goes up from a verified school address, and it
// says so the way the phone in a student's hand would have said it: the
// phone is on the school's network. Every phone of the era named the network
// it was on in its status row, beside the aerial, and a Berkeley letter's
// reads `CAL` there with a small star after it, the aerial and the name lit
// in the school's gold (screen.jsx `Network`, school.css, and the shared
// picture in share.js).
//
// It was a die-cut sticker of the school slapped on the phone's top right
// corner, and it read as a thing stuck on from outside, over the battery.
// The network's name is the phone's own, and it covers nothing.
//
// This is the same status row off a screen, where the composer offers the
// Berkeley wall and where the mailed link lands (screens/Write.jsx,
// Verify.jsx): the aerial, the name and the star on an unlit panel of the
// chrome's own, a small plate. Its name and its props are the sticker's, so
// the screens that draw it did not change; a sticker's `seed` and `tilt` are
// taken and let go, since nothing on the phone is stuck on at an angle any
// more.
//
// It is a picture with a sentence, for a screen reader: who wrote it, by the
// school's address ("written by a verified berkeley.edu student"). The
// composer and the landing page pass `label=""` where the words beside it
// say so already.

import { schoolOf, stickerLabel } from './schools.js'
import { glyphPath } from './looks.js'
import './school.css'

const ANT = glyphPath('ant')
const STAR = glyphPath('star')

// the glyphs a whole number of the page's pixels to each of theirs
// (school.css `--cell`), so they are never smoothed
function Glyph({ g, className }) {
  return (
    <svg className={className} viewBox={`0 0 ${g.w} ${g.h}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={g.d} />
    </svg>
  )
}

export function Sticker({ school, className = '', style, label = null }) {
  const s = school && typeof school === 'object' && school.short ? school : schoolOf(school)
  if (!s) return null
  const said = label === null ? stickerLabel(s) : label
  return (
    <span
      className={`wl-sticker ${className}`} style={{ '--net': s.fg, ...style }}
      role={said ? 'img' : undefined} aria-label={said || undefined} aria-hidden={said ? undefined : 'true'}
    >
      <Glyph g={ANT} className="wl-sticker-ant" />
      <span className="wl-sticker-nm" aria-hidden="true">{s.short}</span>
      <Glyph g={STAR} className="wl-sticker-star" />
    </span>
  )
}

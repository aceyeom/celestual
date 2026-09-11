// ── morph.js — the disc the letter opens from ───────────────────────────────
//
// A name on the wall is a circle with a face in it, and the letter under that
// name is a cream card with the same face at its head. Those are the same
// object at two moments, and until now the surface said so by cutting from one
// to the other: a disc was pressed, a sheet rose from the bottom edge, and the
// person who pressed it had to work out for themselves that the card belonged
// to the thing they touched.
//
// So the sheet opens out of the disc. The circle that was pressed is where the
// letter's sheet grows from, with the card already on it (parts.jsx `Sheet`,
// `origin`), so the card is seen to come from the face it belongs to and
// nowhere in it is the moment where the wall was replaced by a screen.
//
// ── why this is a module and not a prop ─────────────────────────────────────
// The two ends of the movement are in two different trees. The disc is a slot
// in the hive, thrown away the instant the route changes; the sheet is mounted
// by the shell afterwards. Nothing renders both, and threading a DOMRect up
// through the wall's screen, the shell's router and back down into the sheet
// would put a piece of animation state on four components that have no other
// reason to know about it.
//
// So the disc leaves its rectangle here on the way out and the sheet picks it
// up on the way in. It is a single slot with a short life: a hand-off that is
// not claimed within `WINDOW` never happened, which is what makes a deep link,
// a back button and a page reload all land as an ordinary sheet rather than
// opening out of a disc that is not on the screen.

// How long a hand-off stays claimable. Long enough to cover the route change
// and the sheet's first render, short enough that a letter opened from
// anywhere else in the same second cannot pick up somebody else's circle.
const WINDOW = 700

let PENDING = null

// The wall, on the way out: this handle, and where its disc is standing.
export function takeOff(handle, rect) {
  if (!rect || !rect.width) { PENDING = null; return }
  PENDING = {
    handle,
    at: performance.now(),
    x: rect.left, y: rect.top, w: rect.width, h: rect.height,
  }
}

// The sheet, on the way in. Claims the hand-off and clears it, so a second
// screen mounting behind the first cannot open from the same circle twice.
// `handle` is checked when the caller knows one — a letter opened by id off a
// shared link has none, and the freshness window is enough on its own there.
export function land(handle) {
  const p = PENDING
  PENDING = null
  if (!p) return null
  if (performance.now() - p.at > WINDOW) return null
  if (handle && p.handle && handle !== p.handle) return null
  return p
}

// Thrown away without being claimed: a press that ended somewhere else.
export function drop() { PENDING = null }

// ── where a mutual was opened from ──────────────────────────────────────────
//
// A mutual is opened by a press on its slot in the private notes (the
// account sheet, screens/You.jsx, Slot.jsx), and the telling takes the whole
// screen from there (screens/Reveal.jsx). The takeover is meant to grow out
// of the thing pressed, so the slot hands the reveal where its glass was as
// it goes, and the reveal takes it on its first frame. Held for the one
// opening it is for: a reveal reached any other way (the mail's link, a
// reload, the note sheet's `open the mutual`, Ping.jsx; the list of people
// written to opens the note sheet since 0072) finds nothing here and opens
// from the black, as it always has.
//
// A rect and not the element: the account sheet is gone by the time the
// reveal draws, and a node that has left the page has no box.
//
// The slot's `edit` key opens the same reveal, landed, with its options up
// (`menu`), since what can be done to a mutual (write them a new note, take
// it off one's list) is the keepsake's own menu and is drawn once, there.
//
// And the way back: a reveal closed onto the account sheet says which slot
// it was, so the sheet puts the focus back on it (`returnTo`, `takeReturn`),
// and a person on a keyboard is where they were.

let FROM = null
let BACK = null
// how long a press is worth: a reveal that draws later than this was not
// opened by it
const FRESH_MS = 1500

export function openReveal(go, handle, el = null, { menu = '' } = {}) {
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
  FROM = { handle, at: performance.now(), menu, rect: r && r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null }
  go('reveal', handle)
}

// Where the reveal of `handle` was opened from, once, or null: the glass's
// rect (null when there was none to measure) and the menu to land on.
export function takeRevealFrom(handle) {
  const f = FROM
  FROM = null
  if (!f || f.handle !== handle || performance.now() - f.at > FRESH_MS) return null
  return f.rect ? { ...f.rect, menu: f.menu } : { x: 0, y: 0, w: 0, h: 0, menu: f.menu }
}

// Fresh for as long as a press is: a reveal that closed somewhere other than
// the account sheet leaves nothing here for the next time the sheet opens.
export function returnTo(handle) {
  BACK = handle ? { handle, at: performance.now() } : null
}

export function takeReturn() {
  const b = BACK
  BACK = null
  return b && performance.now() - b.at <= FRESH_MS ? b.handle : null
}

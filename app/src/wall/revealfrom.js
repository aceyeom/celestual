// ── where a mutual was opened from ──────────────────────────────────────────
//
// A mutual is opened by a press on its slot in the private notes (the
// account sheet, screens/You.jsx), and the telling takes the whole screen
// from there (screens/Reveal.jsx). The takeover is meant to grow out of the
// thing pressed, so the slot hands the reveal where it was on the glass as
// it goes, and the reveal takes it on its first frame. Held for the one
// opening it is for: a reveal reached any other way (the mail's link, a
// reload, the list of people written to) finds nothing here and opens from
// the middle of the screen, as it always has.
//
// A rect and not the element: the account sheet is gone by the time the
// reveal draws, and a node that has left the page has no box.

let FROM = null
// how long a press is worth: a reveal that draws later than this was not
// opened by it
const FRESH_MS = 1500

export function openReveal(go, handle, el = null) {
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
  FROM = r && r.width > 0 && r.height > 0
    ? { handle, at: performance.now(), x: r.left, y: r.top, w: r.width, h: r.height }
    : null
  go('reveal', handle)
}

// The rect the reveal of `handle` was opened from, once, or null.
export function takeRevealFrom(handle) {
  const f = FROM
  FROM = null
  if (!f || f.handle !== handle || performance.now() - f.at > FRESH_MS) return null
  return { x: f.x, y: f.y, w: f.w, h: f.h }
}

// ── the strip, and the corpus that waits for it ─────────────────────────────
// The letter's deck is turned by writing straight to its three screens while a
// hand has them or while they run on to the next letter (screens/Letter.jsx),
// and the shell draws everything again whenever a read lands (index.jsx
// `subscribe`). A read landing in the middle of a turn would do that under the
// hand: a render mid-swipe is a dropped frame on a phone, and a name's waiting
// card could turn into its letter halfway across the glass. So while the strip
// moves the shell's notice is held, and only the last one is kept, since a
// notice says no more than that the cache moved. It is let go of once the strip
// has been still for a moment, when the page is idle, so the draw it asks for
// never lands on the frame a turn lands on.
let moving = false
let held = null
let wake = 0

// when the page is next idle, and no later than a quarter second: WebKit has
// no idle callback, and a clock stands in for it there
export const idle = (fn) => (typeof requestIdleCallback === 'function'
  ? requestIdleCallback(fn, { timeout: 240 })
  : setTimeout(fn, 60))
export const unidle = (id) => (typeof cancelIdleCallback === 'function' ? cancelIdleCallback(id) : clearTimeout(id))

// the shell's notice: now, or once the strip is still
export function afterStrip(fn) {
  if (moving || wake) held = fn
  else fn()
}

// the letter's: the strip has started to move, or has come to rest
export function stripMoving(on) {
  if (on) {
    moving = true
    if (wake) { unidle(wake); wake = 0 }
    return
  }
  if (!moving) return
  moving = false
  if (!held || wake) return
  wake = idle(() => {
    wake = 0
    if (moving) return
    const fn = held
    held = null
    if (fn) fn()
  })
}

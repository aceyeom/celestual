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
//
// ── and every other answer that would draw under a hand ──
// The shell's notice was the only one held, and it was not the only one that
// landed mid-swipe: the thread of the card a turn had just landed on
// (Replies.jsx `useThread`) and the face its name is drawn with (parts.jsx
// `useProfile`) came back while the next hand was already on the glass and
// drew the whole sheet again under it (the owner, 29 September: swiping
// through the letters is slow). So a hold is kept for each asker by name
// (`key`), the last of each, and all of them are let go together once the
// strip is still. The shell's is `rev`, and there is one shell, so only its
// newest notice is kept. Every other asker keys its hold on its own callback
// (Replies.jsx `load`, parts.jsx `useProfile`), since a key shared between
// askers would keep only the last of them: two faces for one handle are
// answered by the same peek in the same breath, and under one key the first
// would never be drawn at all.
let moving = false
const held = new Map()
let wake = 0

// when the page is next idle, and no later than a quarter second: WebKit has
// no idle callback, and a clock stands in for it there
export const idle = (fn) => (typeof requestIdleCallback === 'function'
  ? requestIdleCallback(fn, { timeout: 240 })
  : setTimeout(fn, 60))
export const unidle = (id) => (typeof cancelIdleCallback === 'function' ? cancelIdleCallback(id) : clearTimeout(id))

// an answer that would draw: now, or once the strip is still. Only the last
// held under each `key` is kept, since each says where its asker stands now
export function afterStrip(fn, key = 'rev') {
  if (moving || wake) held.set(key, fn)
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
  if (!held.size || wake) return
  wake = idle(() => {
    wake = 0
    if (moving) return
    const fns = [...held.values()]
    held.clear()
    for (const fn of fns) fn()
  })
}

// ── Morph.jsx — the disc opening into the card ──────────────────────────────
//
// The other half of morph.js. The wall left a circle behind; this draws it,
// flies it, and opens it into the letter, and then gets out of the way.
//
// ── what is actually moving ─────────────────────────────────────────────────
// One element, and it is neither the disc nor the card: it is a stand-in that
// starts as the exact circle the finger was on and ends as the exact rectangle
// the card occupies, having been both on the way. Three things interpolate at
// once and they are deliberately on three different clocks, because a shape
// that changes everything about itself at one rate reads as a slide:
//
//   THE FRAME   the rectangle, from the disc's circle to the card's box, and
//               its corner from a half of itself to the card's own radius.
//               This is the longest movement and it carries the whole thing.
//   THE PAPER   the cream, which is not there at the start and is by two
//               thirds of the way. The circle is a photograph; the card is a
//               sheet of paper with a photograph on it, and the paper has to
//               arrive under the face rather than behind it.
//   THE FACE    from filling the frame to standing at the head of it, at the
//               size the letterhead sets. It leads the frame, so the face is
//               already where it is going while the paper is still opening
//               around it — which is what makes this read as a card being
//               opened rather than a picture being resized.
//
// Under it, the sheet's own glass comes up at the halfway mark and its header
// and foot arrive last, on the landing. Nothing about the sheet's ordinary
// entrance plays: this IS the entrance, and two of them at once is the reason
// shared-element transitions usually look wrong.
//
// ── why the destination is read every frame ─────────────────────────────────
// Because it moves. The letter is not in the cache when the disc is pressed —
// the sheet opens on a card that is waiting for it — and when the words land
// the card grows, the sheet re-centres under them and the pager appears in
// the header. A flight aimed once at where the card was standing at the start
// lands twenty pixels above where it ends up, and the cross-fade at the end
// has to hide the jump. So the frame is interpolated by hand against a rect
// read fresh on every frame: whatever the card does mid-flight, the stand-in
// is on it at the moment it stops. That is the whole reason this is not four
// lines of `element.animate()`.
//
// If anything it needs is missing — no hand-off, no card, or a reader who has
// asked for less movement — it draws nothing and says so at once, and the
// sheet opens the way it always did. Every line below is decoration on a
// screen that works without it.

import { useLayoutEffect, useRef, useState } from 'react'
import { Face } from './parts.jsx'

// The whole movement. The face is on a shorter clock than the frame so it
// settles first; the paper is on a later one so the cream arrives under a face
// that has already landed.
const DUR = 640
// The three clocks, as fractions of the frame's. The face leads a little so it
// is where it is going before the paper has finished arriving; the corner
// leads a lot, because a rectangle that keeps a circle's radius while it grows
// is a capsule, and a capsule with a face at one end of it is a switch; and
// the paper is early and quick, because a half-opaque cream over a dark room
// is neither the photograph nor the card but a grey smear between them.
const FACE = 0.86
const CORNER = 0.5
const PAPER = { from: 0.06, to: 0.44 }
const RADIUS = 18            // wall.css --r-card, which the paper is cut to
const CREST = 30             // the size the letterhead sets its face at

// ── the curve, and why it is not the house one ──
// Everything else on this surface eases on `--ease`, cubic-bezier(0.16,1,
// 0.3,1), which spends four fifths of its distance in the first quarter of its
// time. That is right for a thing appearing and wrong for a thing TRAVELLING:
// on a 600ms flight it means the card is finished at 140ms and then drifts
// imperceptibly for another 460, which reads as a cut followed by nothing.
// This one holds a nearly straight line through the middle of the movement and
// settles over the last third, so the distance is actually crossed on the
// screen. It is written out as a solver rather than handed to the browser
// because the frame is interpolated here, against a destination that moves.
function bez(p1x, p1y, p2x, p2y) {
  const A = (a, b) => 1 - 3 * b + 3 * a
  const B = (a, b) => 3 * b - 6 * a
  const C = (a) => 3 * a
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a)
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 5; i++) {
      const d = slope(t, p1x, p2x)
      if (d === 0) break
      t -= (calc(t, p1x, p2x) - x) / d
    }
    return calc(t, p1y, p2y)
  }
}
const EASE = bez(0.5, 0.02, 0.2, 1)
const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export default function Morph({ from, handle, card, crest, reduce = false, onDone }) {
  const box = useRef(null)
  const paper = useRef(null)
  const face = useRef(null)
  const [gone, setGone] = useState(false)

  useLayoutEffect(() => {
    let raf = 0
    let over = false
    const end = () => { if (over) return; over = true; setGone(true); if (onDone) onDone() }

    const el = box.current
    const wrap = card && card.current
    if (reduce || !el || !wrap || !from) { end(); return undefined }
    // the paper inside the wrapper, which is what the flight actually lands
    // on: on a spread the card is narrower than the column it stands in
    const to = wrap.querySelector('.wl-paper') || wrap
    const first = to.getBoundingClientRect()
    if (!first.width || !first.height) { end(); return undefined }

    // The sheet does not also play its own entrance. Set before the first
    // paint, so the rise never starts and there is nothing to cancel.
    const sheet = to.closest ? to.closest('.wl-sheet') : null
    const runs = []
    const run = (node, frames, opts) => {
      if (!node || !node.animate) return null
      const a = node.animate(frames, { fill: 'both', easing: 'cubic-bezier(0.22, 1, 0.30, 1)', ...opts })
      runs.push(a)
      return a
    }
    if (sheet) {
      sheet.style.animation = 'none'
      const a = run(sheet, [{ opacity: 0 }, { opacity: 0, offset: 0.28 }, { opacity: 1 }], { duration: DUR * 0.92 })
      if (!a) sheet.style.opacity = ''
      const rest = sheet.querySelectorAll('.wl-head, .wl-foot')
      rest.forEach((n) => run(n, [
        { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 440, delay: DUR * 0.5 }))
    }
    // the real card is not on the screen until the stand-in has landed on
    // exactly where it is
    to.style.opacity = '0'

    // ── the landing ──
    // The stand-in and the card are the same rectangle by now, the same
    // paper with the same face at its head, and the stand-in is over the
    // card. So the card is simply switched on underneath and the stand-in
    // fades off it: what a person sees is the words arriving on a card that
    // never moved. The two used to cross-fade, both half on at the midpoint,
    // and a card that dims for a tenth of a second at the end of its own
    // flight reads as a flicker.
    const handOver = () => {
      to.style.opacity = ''
      if (el.animate) {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'both' })
        a.onfinish = end
        setTimeout(end, 400)
      } else end()
    }

    const t0 = performance.now()
    const step = (now) => {
      const p = clamp01((now - t0) / DUR)
      const e = EASE(p)
      const fe = EASE(clamp01(p / FACE))
      const d = to.getBoundingClientRect()

      el.style.left = `${lerp(from.x, d.left, e).toFixed(1)}px`
      el.style.top = `${lerp(from.y, d.top, e).toFixed(1)}px`
      el.style.width = `${lerp(from.w, d.width, e).toFixed(1)}px`
      el.style.height = `${lerp(from.h, d.height, e).toFixed(1)}px`
      const re = EASE(clamp01(p / CORNER))
      el.style.borderRadius = `${lerp(from.w / 2, RADIUS, re).toFixed(1)}px`

      const f = face.current
      if (f) {
        const c = crest && crest.current ? crest.current.getBoundingClientRect() : null
        const cw = c && c.width ? c.width : CREST
        const cx = c && c.width ? c.left - d.left : 20
        const cy = c && c.width ? c.top - d.top : 20
        f.style.left = `${lerp(0, cx, fe).toFixed(1)}px`
        f.style.top = `${lerp(0, cy, fe).toFixed(1)}px`
        f.style.width = `${lerp(from.w, cw, fe).toFixed(1)}px`
        f.style.height = `${lerp(from.h, cw, fe).toFixed(1)}px`
      }

      const g = paper.current
      if (g) g.style.opacity = String(EASE(clamp01((p - PAPER.from) / (PAPER.to - PAPER.from))).toFixed(3))

      if (p < 1) raf = requestAnimationFrame(step)
      else handOver()
    }
    raf = requestAnimationFrame(step)
    // a tab that goes to the background stops handing out frames, and a card
    // left invisible under a stand-in nobody is animating is worse than no
    // transition at all
    const bail = setTimeout(() => { cancelAnimationFrame(raf); handOver() }, DUR + 900)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(bail)
      runs.forEach((a) => { try { a.cancel() } catch { /* already gone */ } })
      if (sheet) { sheet.style.animation = ''; sheet.style.opacity = '' }
      to.style.opacity = ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (gone || !from) return null
  return (
    <div
      className="wl-morph" ref={box} aria-hidden="true"
      style={{ left: from.x, top: from.y, width: from.w, height: from.h, borderRadius: from.w / 2 }}
    >
      <div className="wl-morph-paper" ref={paper} style={{ opacity: 0 }} />
      <div className="wl-morph-face" ref={face} style={{ width: from.w, height: from.h }}>
        <Face handle={handle} size={Math.round(from.w)} />
      </div>
    </div>
  )
}

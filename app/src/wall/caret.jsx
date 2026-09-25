// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE CARET: the phone's own cursor, where a person is typing             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The browser's caret is a hairline, one CSS pixel wide, in whatever colour
// the cascade leaves it. On the draft's screen it stood under the screen's
// own tilt, blur and press and all but went out, and on a pale panel it was
// drawn in the room's chalk and did (phone.css says why). A phone never drew
// a hairline. Its cursor was a bar on the face's own grid, from the top of
// the capitals to a pixel under the line, blinking on the phone's beat, and
// the letter on the wall already draws that bar before an empty draft
// (screen.css `wl-draft-cur`).
//
// So this draws it where a person is typing, on the face's own grid (a
// stroke of Jersey 10 is two of the grid's pixels, the gap between two
// letters one, a space four):
//
//   the bar         between words and at the end of them, which is where a
//                   caret is while somebody writes: four of the grid's
//                   pixels wide (0.214em, two strokes), as wide as a space
//                   and half a pixel clear of the letters either side, from
//                   the top of the capitals to one stroke under the line
//   the cell        in the middle of a word, where the gap is one pixel and
//                   a bar that wide swallowed a narrow letter whole: the
//                   letter after the caret, inverted, a cell of its own
//                   width with the letter struck out of it in the ground's
//                   colour, the way the phone showed the word it was
//                   composing and every chosen row
//
//   on the screen   in the words' own ink with their slight bloom, and
//                   inside the screen, so the screen's tilt, blur and press
//                   are the caret's too
//   in the chrome   the wall's fields (DESIGN.md 2.6): chalk, snapped to
//                   the device's pixels and never under three of the page's,
//                   with no glow, since nothing new is backlit
//
// It blinks on the phone's beat, 1060ms in two steps, and it is lit at once
// and stays lit while somebody types: every keystroke and every move starts
// the beat again from its lit half. Under reduced motion it is lit and
// still. A selected range has no caret, since the selection is drawn in its
// place, inverted as the phone inverted a chosen row. While an input method
// is composing a word the caret stands at the end of what is being composed
// and never goes out, because Gboard composes every word and a caret that
// hid for each would flicker through a sentence.
//
// ── how ─────────────────────────────────────────────────────────────────────
// Where a caret stands in a field is not something a page can ask, so it is
// measured: one box kept off the glass for the whole page (the way screen.jsx
// strikes its glyph sheet once), set exactly as the field is set from the
// field's own computed style (not its classes: a textarea's letter spacing
// is `normal` while the screen round it has its own), holding the text up to
// the caret, the character after it in a plain span, and the rest. That
// span starts where the caret is, and since it holds the real words and not
// a box, the mirror breaks its lines exactly where the field does. Its
// place is read off the mirror, which is not turned, and the caret is put
// there in the field's own box, a sibling of the field, by the field's
// layout pixels (`offsetLeft`, `offsetTop`). Layout pixels, because the
// screen is turned in three dimensions and every client rectangle inside it
// is a picture of the perspective, not the layout.
//
// The native caret goes transparent only while this one is drawn (the
// `data-caret` attribute), so in any state this does not draw (a range, no
// focus, a field that cannot be typed in, a forced colour scheme) the
// browser's own caret is back.

import { useLayoutEffect, useRef } from 'react'

// what a line is set with; everything else about the mirror is fixed
const COPY = [
  'direction', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch',
  'fontVariantNumeric', 'fontVariantLigatures', 'fontVariantCaps', 'fontFeatureSettings',
  'fontVariationSettings', 'fontKerning', 'fontSynthesis', 'fontOpticalSizing',
  'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'textAlign', 'textIndent',
  'tabSize', 'overflowWrap', 'wordBreak', 'hyphens', 'textRendering',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
]

// a stroke of the face, in ems: two of the pixels of the grid Jersey 10 is
// drawn on, and the width of the cursor the letter already draws
// (screen.css `.wl-scr-cur`)
const PX = 0.107
// the capitals stand this far over the baseline, and the caret is this
// tall: cap top to one stroke under the line
const CAP = 0.533
const TALL = 0.64

let mirror = null
function mirrorOf() {
  if (mirror && mirror.isConnected) return mirror
  mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  mirror.dataset.caretMirror = ''
  const st = mirror.style
  // fixed, so however many lines it holds it never lengthens the page
  st.position = 'fixed'
  st.top = '0'
  st.left = '-9999px'
  st.visibility = 'hidden'
  st.overflow = 'hidden'
  st.pointerEvents = 'none'
  st.boxSizing = 'content-box'
  st.border = '0'
  st.margin = '0'
  st.height = 'auto'
  document.body.appendChild(mirror)
  return mirror
}

// Where the caret at `pos` stands in the field `el`: its left edge and its
// baseline, in pixels from the field's own border box, scrolled as the
// field is scrolled, and the size of the face it is set in.
function measure(el, pos) {
  const cs = getComputedStyle(el)
  const m = mirrorOf()
  const st = m.style
  for (const k of COPY) st[k] = cs[k]
  const area = el.tagName === 'TEXTAREA'
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const padT = parseFloat(cs.paddingTop) || 0
  const padB = parseFloat(cs.paddingBottom) || 0
  // the width the words wrap in: a scroll bar's gutter is not part of it
  st.width = `${Math.max(0, el.clientWidth - padL - padR)}px`
  st.whiteSpace = area ? 'pre-wrap' : 'pre'
  if (!area) st.overflowWrap = 'normal'
  // an empty draft's example is indented a little behind the painted
  // cursor (screen.css); the typed caret stands where that cursor blinks
  if (!el.value) st.textIndent = '0px'
  // the first line's top and its baseline (an empty inline, and a box of no
  // size, which stands on the baseline), then the words up to the caret,
  // the character after it in a span of its own, and the rest. The span
  // starts where the caret is and is as wide as that character; a zero
  // width space when there is none, so the span has a place and the
  // centred and right aligned fields are not moved by it
  const next = nextOf(el.value, pos)
  const top = document.createElement('span')
  const base = document.createElement('span')
  base.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  const here = document.createElement('span')
  here.textContent = next || '\u200b'
  m.replaceChildren(top, base, document.createTextNode(el.value.slice(0, pos)), here, document.createTextNode(el.value.slice(pos + next.length)))
  const fs = parseFloat(cs.fontSize) || 16
  let y = here.offsetTop + (base.offsetTop - top.offsetTop)
  // a single line is set in the middle of the field's height
  if (!area) y += (el.clientHeight - padT - padB - (m.offsetHeight - padT - padB)) / 2
  // across, to the fraction of a pixel: the mirror is not turned, so its
  // rectangles are its layout
  const mr = m.getBoundingClientRect()
  const ar = here.getClientRects()[0] || here.getBoundingClientRect()
  return {
    x: el.clientLeft + (ar.left - mr.left) - el.scrollLeft,
    y: el.clientTop + y - el.scrollTop,
    // how far a line's baseline stands under the top of its line box
    drop: base.offsetTop - padT,
    next, adv: next ? ar.width : 0,
    fs, cs,
  }
}

// The character after the caret, whole (a pair of surrogates is one), or
// nothing at the end of the words or of a line.
function nextOf(value, pos) {
  if (pos >= value.length || value[pos] === '\n') return ''
  return String.fromCodePoint(value.codePointAt(pos))
}

// `of` is a ref to the field. `screen` is the draft's screen: sized in the
// face's own pixels and left unrounded, since the screen is turned and
// blurred round it; otherwise a field of the wall's chrome, on the device's
// own pixels.
export function Caret({ of, screen = false }) {
  const bar = useRef(null)
  useLayoutEffect(() => {
    const el = of && of.current
    const c = bar.current
    if (!el || !c || typeof window === 'undefined') return undefined
    let raf = 0
    let composing = false
    let was = ''
    let restart = false
    const off = () => {
      c.hidden = true
      el.removeAttribute('data-caret')
      was = ''
    }
    const sync = () => {
      raf = 0
      if (document.activeElement !== el || el.readOnly || el.disabled) { off(); return }
      const a = el.selectionStart
      const b = el.selectionEnd
      if (a === null || b === null || (a !== b && !composing)) { off(); return }
      const pos = composing ? b : a
      const at = measure(el, pos)
      // the face's grid: a stroke is two of its pixels, the gap between two
      // letters one, a space four
      const p = PX / 2 * at.fs
      // Between words and at the end, the bar: four of the grid's pixels,
      // the width of a space, standing in the cell the next character will
      // take, a pixel clear of the last letter as every letter is of the
      // one before it. In the middle of a word there is no room for it, the
      // gap being one pixel, and a bar there swallowed a narrow letter
      // whole. So there the caret is the letter after it, inverted: a cell
      // of that letter's own width, half a pixel wider on the left and
      // narrower on the right so the letter sits in the middle of it,
      // struck out of it in the ground's colour on its own baseline, as the
      // phone inverted the word it was composing and every chosen row
      const cell = !!at.next && !/\s/.test(at.next)
      // half of the gap either side of the letter, the field's own tracking
      // with it (the code box spaces its digits out)
      const ls = parseFloat(at.cs.letterSpacing) || 0
      const shift = cell ? (p + ls) / 2 : 0
      const wide = cell ? at.adv : 4 * p
      // in the chrome, on the device's own pixels, so the bar's edges are
      // as crisp as the letters'
      const dpr = window.devicePixelRatio || 1
      const snap = (v) => Math.round(v * dpr) / dpr
      const w = screen ? wide : Math.max(3, snap(wide))
      const h = screen ? TALL * at.fs : snap(TALL * at.fs)
      const g = c.firstChild
      if (g) {
        const say = cell ? at.next : ''
        if (g.textContent !== say) g.textContent = say
        if (say) {
          const gs = g.style
          gs.fontFamily = at.cs.fontFamily
          gs.fontSize = at.cs.fontSize
          gs.fontWeight = at.cs.fontWeight
          gs.fontVariantNumeric = at.cs.fontVariantNumeric
          gs.fontFeatureSettings = at.cs.fontFeatureSettings
          gs.letterSpacing = at.cs.letterSpacing
          gs.textTransform = at.cs.textTransform
          gs.lineHeight = at.cs.lineHeight
          gs.left = `${shift}px`
          gs.top = `${CAP * at.fs - at.drop}px`
        }
      }
      const y = at.y - CAP * at.fs
      // scrolled out of the field: nothing to draw
      const slack = 0.2 * at.fs
      if (y + h < el.clientTop - slack || y > el.clientTop + el.clientHeight + slack) { off(); return }
      if (at.x < el.clientLeft - 1 || at.x > el.clientLeft + el.clientWidth + 1) { off(); return }
      // in the box the field and the caret share. The caret may stand past
      // the end of the field itself, into the padding round it (a field
      // sized to what is typed in it ends where the last letter does), but
      // never past that box: a space hanging off the end of a line keeps
      // the caret on the glass
      const room = el.offsetParent ? el.offsetParent.clientWidth - w : Infinity
      const left = Math.min(Math.max(el.offsetLeft + at.x - shift, 0), room)
      const topPx = el.offsetTop + y
      const L = screen ? left : snap(left)
      const T = screen ? topPx : snap(topPx)
      c.style.width = `${w}px`
      c.style.height = `${h}px`
      c.style.transform = `translate(${L}px, ${T}px)`
      // lit again from the start of the beat whenever it moves or a key
      // lands: the same keyframes under two names, swapped, start over
      const now = `${L}|${T}`
      if (restart || now !== was) c.classList.toggle('is-b')
      restart = false
      was = now
      c.hidden = false
      el.setAttribute('data-caret', '')
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(sync) }
    const typed = () => { restart = true; ask() }
    const compose = (e) => { composing = e.type === 'compositionstart'; typed() }
    const blur = () => { if (raf) cancelAnimationFrame(raf); raf = 0; off() }
    const onSelect = () => { if (document.activeElement === el) ask() }
    const on = [
      ['input', typed], ['keydown', ask], ['keyup', ask], ['pointerdown', ask], ['pointerup', ask],
      ['select', ask], ['focus', ask], ['blur', blur], ['scroll', ask],
      ['compositionstart', compose], ['compositionend', compose],
    ]
    for (const [t, f] of on) el.addEventListener(t, f)
    document.addEventListener('selectionchange', onSelect)
    window.addEventListener('resize', ask)
    // the face arriving, and the field changing size (the screen's words
    // step down a size as they fill it, and a phone's keyboard takes half
    // the window)
    const fonts = document.fonts
    if (fonts && fonts.addEventListener) fonts.addEventListener('loadingdone', ask)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ask) : null
    if (ro) ro.observe(el)
    ask()
    return () => {
      for (const [t, f] of on) el.removeEventListener(t, f)
      document.removeEventListener('selectionchange', onSelect)
      window.removeEventListener('resize', ask)
      if (fonts && fonts.removeEventListener) fonts.removeEventListener('loadingdone', ask)
      if (ro) ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      el.removeAttribute('data-caret')
    }
  }, [of, screen])
  return <span className={`wl-caret${screen ? ' is-screen' : ''}`} ref={bar} aria-hidden="true" hidden><i /></span>
}

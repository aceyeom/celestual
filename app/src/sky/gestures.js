// sky/gestures.js — one hand, one vocabulary, both skies.
//
// The two canvas engines each grew their own pointer handling, and they ended
// up genuinely different: the ambient field had drag-orbit and pinch-dolly, the
// community sky had those plus tap, double-tap-to-dive, pan-while-zoomed and
// tag-hit-testing. Same gestures, two implementations, two sets of thresholds,
// two ideas about what counts as a tap. This is the single vocabulary:
//
//   one pointer, moved a little      → a tap
//   one pointer, moved a lot         → orbit, or pan when already zoomed in
//   two pointers                     → pinch to dolly, drift to pan
//   two taps in quick succession     → dive toward the spot (or pull all the
//                                      way home, if already deep in)
//   wheel                            → dolly toward the cursor
//
// The engine owns nothing about what these MEAN. It reports them; the sky
// decides. That is what lets the same code be a fully navigable galaxy on the
// community page and an untouchable backdrop everywhere else, without either
// behaviour being a special case inside the other.

const TAP_MS = 380
const TAP_SLOP = 7
const DBLTAP_MS = 330
const DBLTAP_SLOP = 42

// Anything the viewer might actually be trying to press must not also be
// steering the galaxy behind it.
const INTERACTIVE = 'button, a, input, textarea, select, [role="button"], [data-noripple]'

export class Gestures {
  constructor(handlers = {}) {
    this.h = handlers
    this.enabled = false
    this.pts = new Map()
    this.mode = null
    this.sx = 0
    this.sy = 0
    this.lx = 0
    this.ly = 0
    this.downT = 0
    this.dist0 = 1
    this.scale0 = 1
    this.lastTap = 0
    this.lastTapX = 0
    this.lastTapY = 0
    this._down = (e) => this.onDown(e)
    this._move = (e) => this.onMove(e)
    this._up = (e) => this.onUp(e)
    this._wheel = (e) => this.onWheel(e)
  }

  bind() {
    window.addEventListener('pointerdown', this._down, { passive: true })
    window.addEventListener('pointermove', this._move, { passive: true })
    window.addEventListener('pointerup', this._up, { passive: true })
    window.addEventListener('pointercancel', this._up, { passive: true })
    window.addEventListener('wheel', this._wheel, { passive: true })
  }
  unbind() {
    window.removeEventListener('pointerdown', this._down)
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
    window.removeEventListener('wheel', this._wheel)
    this.pts.clear()
    this.mode = null
  }

  // true while a real gesture owns the pointer — the ambient parallax has to
  // stand down, or the sky fights the hand steering it
  get owned() {
    return this.mode === 'drag' || this.mode === 'pinch'
  }

  _blocked(e) {
    const el = e.target
    return !!(el && el.closest && el.closest(INTERACTIVE))
  }

  onDown(e) {
    if (this._blocked(e)) return
    // A sky that is only a backdrop still answers a touch — a tap sends a wave
    // through the disk — but it is never steered. That distinction is the whole
    // difference between the community page and every other screen.
    if (!this.enabled) {
      if (this.h.onBackdropTap) this.h.onBackdropTap(e.clientX, e.clientY)
      return
    }
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (this.pts.size === 2) {
      const [p1, p2] = [...this.pts.values()]
      this.mode = 'pinch'
      this.dist0 = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
      this.scale0 = this.h.getScale ? this.h.getScale() : 1
      this.lx = (p1.x + p2.x) / 2
      this.ly = (p1.y + p2.y) / 2
      if (this.h.onPinchStart) this.h.onPinchStart(this.lx, this.ly)
    } else if (this.pts.size === 1) {
      this.mode = 'press'
      this.sx = this.lx = e.clientX
      this.sy = this.ly = e.clientY
      this.downT = performance.now()
    }
    if (this.h.onActivity) this.h.onActivity()
  }

  onMove(e) {
    const p = this.pts.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    if (this.mode === 'pinch' && this.pts.size >= 2) {
      const [p1, p2] = [...this.pts.values()]
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
      if (this.h.onPinch) this.h.onPinch(this.scale0 * (d / this.dist0), this.scale0, this.dist0 / d)
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      if (this.h.onPan) this.h.onPan(this.lx, this.ly, mx, my)
      this.lx = mx
      this.ly = my
    } else if (this.mode === 'press' || this.mode === 'drag') {
      if (this.mode === 'press' && Math.hypot(e.clientX - this.sx, e.clientY - this.sy) > TAP_SLOP) this.mode = 'drag'
      if (this.mode !== 'drag') return
      if (this.h.onDrag) this.h.onDrag(e.clientX - this.lx, e.clientY - this.ly, this.lx, this.ly, e.clientX, e.clientY)
      this.lx = e.clientX
      this.ly = e.clientY
    }
    if (this.h.onActivity) this.h.onActivity()
  }

  onUp(e) {
    if (!this.pts.delete(e.pointerId)) return
    if (this.mode === 'pinch') {
      if (this.pts.size < 2) this.mode = this.pts.size === 1 ? 'drag' : null
      return
    }
    if (this.mode === 'drag') {
      this.mode = null
      if (this.h.onRelease) this.h.onRelease()
      return
    }
    if (this.mode !== 'press') return
    this.mode = null
    if (performance.now() - this.downT > TAP_MS) return
    const now = performance.now()
    if (now - this.lastTap < DBLTAP_MS && Math.hypot(e.clientX - this.lastTapX, e.clientY - this.lastTapY) < DBLTAP_SLOP) {
      this.lastTap = 0
      if (this.h.onDoubleTap) this.h.onDoubleTap(e.clientX, e.clientY)
      return
    }
    this.lastTap = now
    this.lastTapX = e.clientX
    this.lastTapY = e.clientY
    if (this.h.onTap) this.h.onTap(e.clientX, e.clientY)
  }

  onWheel(e) {
    if (this._blocked(e)) return
    if (!this.enabled && !(this.h.wheelAlways && this.h.wheelAlways())) return
    if (this.h.onWheel) this.h.onWheel(e.deltaY, e.clientX, e.clientY)
  }
}

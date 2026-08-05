// sky/fallback2d.js — the sky for a browser that cannot give us a GPU.
//
// WebGL2 is available essentially everywhere this product is used, including
// the Instagram in-app browser, which is the surface that actually matters
// here. But contexts do get refused: an ancient device, a hardened enterprise
// profile, a browser that has already handed out its last context to another
// tab, a driver blocklist. In every one of those cases the product must still
// have a night sky behind it, because the night sky is not decoration — it is
// the whole visual identity.
//
// So this is a deliberately modest canvas-2D field: a soft core, a slow drift,
// a scatter of stars with real blackbody colour, and the viewer's own stars
// resting in it. It does not try to compete with the real engine. It tries to
// be quiet, correct, and never broken, and it implements the same public
// surface so nothing calling into it has to know which one it got.

import { blackbodyRGB, normalizeLum, sampleStar, tempToU } from './blackbody.js'
import { rng } from './model.js'

const TWO = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// `ramp` mirrors the WebGL path's LUT hook (blackbody.js): a field built on
// another colour curve has to fall back to a field built on the same curve, or
// a machine without WebGL2 gets a different brand.
function css(T, ramp) {
  const [r, g, b] = ramp ? normalizeLum(ramp(tempToU(T), T)) : blackbodyRGB(T)
  const f = (v) => Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(1, v * 0.62), 1 / 2.2) * 255)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

class Field2D {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.you = opts.you || '#FF9E6B'
    this.them = opts.them || '#E6749E'
    // the LUT hook and the void, mirrored from the WebGL path so a machine
    // without a GPU still gets the same brand rather than a different one
    this.ramp = opts.ramp || null
    this.ground = opts.ground || ['#06050E', '#040309', '#030206']
    this.core = opts.core || ['255,236,206', '255,214,176', '214,150,120']
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    this.t = 0
    this.spin = 0
    this.dim = 1
    this.dimTarget = 1
    this.running = false
    this.lastTs = 0
    this.insetT = 0
    this.insetB = 0
    this._gen()
    this._boundTick = (ts) => this._tick(ts)
    this._onResize = () => this.resize()
    this._onVis = () => (document.hidden ? this.stop() : this.start())
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    this.resize(true)
  }

  _gen() {
    const rnd = rng(90210)
    const mobile = window.innerWidth < 540
    // thinned by a quarter alongside the real engine's field (galaxy.js), so a
    // machine without a GPU gets the same sky at the same density, not a busier
    // one
    const n = mobile ? 465 : 750
    this.stars = []
    for (let i = 0; i < n; i++) {
      // the same three populations the real engine uses, at a thousandth of the
      // density: a gold heart, a blue-armed disk, a sparse halo
      const u = rnd()
      const region = u < 0.2 ? 'bulge' : u < 0.84 ? 'disk' : 'halo'
      const r = region === 'bulge' ? Math.pow(rnd(), 2) * 0.3 : region === 'halo' ? 0.6 + rnd() * 1.5 : -0.4 * Math.log(1 - rnd() * 0.99)
      const arm = region === 'disk' && rnd() < 0.6
      const ang = arm ? (rnd() < 0.5 ? 0 : Math.PI) + r * 3.6 + (rnd() - 0.5) * 0.5 : rnd() * TWO
      const s = sampleStar(rnd, arm ? 'arm' : region)
      this.stars.push({
        r, ang,
        y: (rnd() - 0.5) * (region === 'bulge' ? 0.3 : 0.09) * (region === 'halo' ? 6 : 1),
        col: css(s.T, this.ramp),
        mag: Math.min(1, 0.16 + Math.log(1 + s.lum) * 0.12),
        tw: rnd() * TWO,
        tws: 0.2 + rnd() * 0.6,
      })
    }
  }

  resize(force) {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 760
    if (!force && this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const avail = Math.max(h * 0.42, h - this.insetT - this.insetB)
    this.unit = Math.min(w * 0.8, avail * 0.56)
    this.cx = w / 2
    this.cy = this.insetT || this.insetB ? clamp(this.insetT + avail * 0.44, h * 0.24, h * 0.6) : h * 0.44
    this._grad = null
    this.start()
  }

  setViewInsets(top = 0, bottom = 0) {
    this.insetT = Math.max(0, top | 0)
    this.insetB = Math.max(0, bottom | 0)
    this.resize(true)
  }
  setPalette(you, them) {
    this.you = you
    this.them = them
    this.start()
  }
  setMotion() {}
  start() {
    if (this.running) return
    this.running = true
    this.lastTs = performance.now()
    requestAnimationFrame(this._boundTick)
  }
  stop() {
    this.running = false
  }
  destroy() {
    this.stop()
    if (this._sendoffTimer) clearTimeout(this._sendoffTimer)
    this._sendoffTimer = null
    this.onSendoffDone = null
    window.removeEventListener('resize', this._onResize)
    document.removeEventListener('visibilitychange', this._onVis)
  }

  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.t += dt
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2.2)
    // Even here the galaxy turns: slowly, always — and clockwise on the glass,
    // the same way the real engine turns it. The arms are wound outward in the
    // +angle direction here too (_gen adds r * 3.6 to an arm star's angle), so
    // this is the sign that makes them TRAIL rather than lead, and a machine
    // without a GPU gets a galaxy turning the same way as everyone else's.
    // model.js carries the long note.
    this.spin -= dt * (this.reduced ? 0.004 : 0.011)
    this._draw(dt)
    requestAnimationFrame(this._boundTick)
  }

  _project(r, ang, y) {
    const a = ang + this.spin
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const ct = Math.cos(1.04), st = Math.sin(1.04)
    const sy = y * ct - z * st
    const zc = 2.7 + y * st + z * ct
    if (zc <= 0.05) return null
    const p = 2.35 / zc
    return { sx: this.cx + x * this.unit * p, sy: this.cy + sy * this.unit * p, p }
  }

  _draw(dt) {
    const ctx = this.ctx
    const d = this.dim
    if (!this._grad) {
      const g = ctx.createLinearGradient(0, 0, 0, this.h)
      g.addColorStop(0, this.ground[0])
      g.addColorStop(0.55, this.ground[1])
      g.addColorStop(1, this.ground[2])
      this._grad = g
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = this._grad
    ctx.fillRect(0, 0, this.w, this.h)

    // the core's light
    ctx.globalCompositeOperation = 'lighter'
    const o = this._project(0, 0, 0)
    if (o) {
      const R = this.unit * 0.5
      const g = ctx.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, R)
      g.addColorStop(0, `rgba(${this.core[0]},${0.2 * d})`)
      g.addColorStop(0.18, `rgba(${this.core[1]},${0.11 * d})`)
      g.addColorStop(0.5, `rgba(${this.core[2]},${0.04 * d})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(o.sx, o.sy, R, 0, TWO)
      ctx.fill()
    }

    for (const s of this.stars) {
      const pr = this._project(s.r, s.ang, s.y)
      if (!pr || pr.sx < -8 || pr.sx > this.w + 8 || pr.sy < -8 || pr.sy > this.h + 8) continue
      s.tw += dt * s.tws
      const a = s.mag * (0.72 + 0.28 * Math.sin(s.tw)) * d
      if (a <= 0.012) continue
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillStyle = s.col
      const D = Math.max(0.9, 1.5 * pr.p)
      ctx.beginPath()
      ctx.arc(pr.sx, pr.sy, D, 0, TWO)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    this._drawOwn(ctx, d)
    ctx.globalCompositeOperation = 'source-over'
  }
  _drawOwn() {}
}

// the ambient sky's fallback — carries the viewer's own stars and no cinematics
export class Galaxy2D extends Field2D {
  constructor(canvas, opts) {
    super(canvas, opts)
    this.sealed = []
    this.sealedScreen = []
    this.sealLabels = []
    this.sealKinds = []
    this.sealHue = null
    this.mode = 'idle'
    this.focusIndex = -1
    this._seed = 0
  }
  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    this.dimTarget = mode === 'idle' ? (data.dim != null ? data.dim : 1) : mode === 'resting' ? 0.5 : mode === 'match' ? 0.5 : 0.7
    // There is no flight to fly here — this is the sky a device gets when it
    // could not give us WebGL2 at all. But the send-off's ARRIVAL is what the
    // screen after it waits on, so it still has to be reported, or the words
    // never come and the placement looks like it failed.
    if (mode === 'sendoff' && changed) {
      if (this._sendoffTimer) clearTimeout(this._sendoffTimer)
      this._sendoffTimer = setTimeout(() => {
        this._sendoffTimer = null
        const cb = this.onSendoffDone
        this.onSendoffDone = null
        if (cb) cb()
      }, 1400)
    }
    this.start()
  }
  setSeals(n) {
    while (this.sealed.length < n) {
      const seed = this._seed++
      this.sealed.push({ r: clamp(0.34 + 0.072 * Math.sqrt(seed), 0.34, 1.42), ang: seed * 2.39996323, y: (seed % 2 ? 1 : -1) * 0.035, phase: seed * 1.7 })
    }
    if (this.sealed.length > n) this.sealed.length = Math.max(0, n)
    this.start()
  }
  setSealLabels(l) {
    this.sealLabels = l || []
  }
  setSealKinds(k) {
    this.sealKinds = k || []
  }
  setSealColor(h) {
    this.sealHue = h || null
  }
  removeSealAt(i) {
    if (i >= 0 && i < this.sealed.length) this.sealed.splice(i, 1)
  }
  vanishStar() {}
  focusStar() {}
  clearFocus() {}
  setNavEnabled() {}
  hitTest(x, y, radius = 56) {
    let best = -1
    let bd = radius * radius
    for (let i = 0; i < this.sealedScreen.length; i++) {
      const p = this.sealedScreen[i]
      if (!p || !p.vis) continue
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }
  _drawOwn(ctx, d) {
    this.sealedScreen.length = this.sealed.length
    for (let i = 0; i < this.sealed.length; i++) {
      const s = this.sealed[i]
      const pr = this._project(s.r, s.ang, s.y)
      if (!pr) {
        this.sealedScreen[i] = { x: 0, y: 0, vis: false }
        continue
      }
      this.sealedScreen[i] = { x: pr.sx, y: pr.sy, vis: true }
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.9 + s.phase)
      const tint = tintOf(this.sealKinds[i]) || this.sealHue || this.you
      const R = (13 + pulse * 3) * pr.p
      const g = ctx.createRadialGradient(pr.sx, pr.sy, 0, pr.sx, pr.sy, R)
      g.addColorStop(0, hexA(tint, 0.55 * d))
      g.addColorStop(0.45, hexA(tint, 0.16 * d))
      g.addColorStop(1, hexA(tint, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(pr.sx, pr.sy, R, 0, TWO)
      ctx.fill()
      ctx.globalAlpha = Math.min(1, (0.85 + 0.15 * pulse) * d)
      ctx.fillStyle = '#FFFDF8'
      ctx.beginPath()
      ctx.arc(pr.sx, pr.sy, 1.8 * pr.p + 0.6, 0, TWO)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}

// the community sky's fallback — countable stars, no cinematics
export class Community2D extends Field2D {
  constructor(canvas, opts) {
    super(canvas, opts)
    this.pings = 0
    this.mine = []
    this.forming = false
    this.publicTags = []
    this.tagsEnabled = false
    this.zoomEnabled = false
    this.dive = null
    this.onZoomState = null
    this.onTagTap = null
  }
  get count() {
    return this.pings
  }
  seed(n, mine = []) {
    this.pings = Math.max(0, n | 0)
    this.mine = (mine || []).map((m) => (typeof m === 'object' ? m : { label: m, kind: '' }))
    this._genPings()
    this.start()
  }
  syncMine(entries = []) {
    this.mine = entries.map((m) => (typeof m === 'object' ? m : { label: m, kind: '' })).filter((m) => m.label)
    this._genPings()
    this.start()
  }
  launch(k = 1) {
    this.pings += k
    this._genPings()
    this.start()
    return this.pings
  }
  setCount(n) {
    this.pings = Math.max(0, n | 0)
    this._genPings()
    this.start()
  }
  setForming(on) {
    this.forming = !!on
    this.start()
  }
  setPublicHandles() {}
  setTagsEnabled() {}
  setZoomEnabled() {}
  resetView() {}
  releaseDive() {}
  locateMine() {
    return false
  }
  diveToStar() {
    return false
  }
  hasMine() {
    return this.mine.length > 0
  }
  ripple() {}
  _genPings() {
    const rnd = rng(4242)
    this.ping = []
    const n = Math.min(this.pings, 1400)
    for (let i = 0; i < n; i++) {
      const r = 0.031 * Math.sqrt(i + 0.6)
      const arm = rnd() < 0.7
      const ang = arm ? (i % 2 ? Math.PI : 0) + r * 4.3 + (rnd() - 0.5) * 0.5 : rnd() * TWO
      const s = sampleStar(rnd, arm ? 'arm' : r < 0.16 ? 'bulge' : 'disk')
      this.ping.push({ r, ang, y: (rnd() - 0.5) * 0.05, col: css(s.T, this.ramp), mag: 0.4 + rnd() * 0.4, tw: rnd() * TWO, tws: 0.2 + rnd() * 0.6 })
    }
  }
  _drawOwn(ctx, d) {
    if (this.forming || !this.ping) return
    for (const s of this.ping) {
      const pr = this._project(s.r, s.ang, s.y)
      if (!pr) continue
      ctx.globalAlpha = Math.min(1, s.mag * d)
      ctx.fillStyle = s.col
      ctx.beginPath()
      ctx.arc(pr.sx, pr.sy, Math.max(1, 1.7 * pr.p), 0, TWO)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

// A seal's light comes off its card now (card/model.js tintOf), so a "kind" is
// a colour. The four names are the pings placed before the card existed.
const TINT = { crush: '#F79BC3', ex: '#F08578', friend: '#96BCF8', complicated: '#B9A3E8' }
const tintOf = (k) => (typeof k === 'string' && k.charAt(0) === '#' ? k : TINT[k]) || null
function hexA(hex, a) {
  const h = (hex || '#fff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

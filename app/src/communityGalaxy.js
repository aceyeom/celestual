// communityGalaxy.js — a living, COUNTABLE galaxy for a single community.
//
// This is a different galaxy from the ambient backdrop (galaxy.js). There, stars
// are procedural dust that sets the mood. Here, every star is ONE real ping: the
// field starts empty and fills as pings arrive (0 → a thousand+), and each new
// ping ignites with a launch streak that rises from below and settles into the
// disk — "someone placed a ping," made visible. Mutual matches light small,
// ANONYMOUS constellations in the outer field: a constellation is never tied to
// an identifiable ping, so watching the sky can never reveal who matched whom.
// That anonymity is structural, not incidental — it's the double-blind, kept.
//
// Dependency-free canvas (same house style as galaxy.js): cached sprites, one
// rAF loop, honors prefers-reduced-motion, pauses on a hidden tab.

function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// A round, anti-aliased star sprite: a white-hot core falling off through the
// star's own hue to a soft transparent edge. One per hue, cached.
function makeStar(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  const grd = c.createRadialGradient(m, m, 0, m, m, m)
  grd.addColorStop(0.0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.32, `rgba(${(r + 400) / 2.6 | 0},${(g + 400) / 2.6 | 0},${(b + 400) / 2.6 | 0},0.95)`)
  grd.addColorStop(0.6, `rgba(${r},${g},${b},0.5)`)
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.beginPath()
  c.arc(m, m, m, 0, Math.PI * 2)
  c.fill()
  return s
}

// A soft glow halo, full-alpha at center → 0 at the rim. Rides on globalAlpha.
function makeGlow(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  const grd = c.createRadialGradient(m, m, 0, m, m, m)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.9)`)
  grd.addColorStop(0.4, `rgba(${r},${g},${b},0.32)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  return s
}

const TWO = Math.PI * 2
const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // golden angle — even, non-clumping fill
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (p) => p * p * (3 - 2 * p)
const easeOut = (p) => 1 - Math.pow(1 - p, 3)

// how many pings map the disk to (nearly) full-frame. A small community is a
// tight bright core; a big one sprawls to the rim — so size is FELT, not read.
const CAP = 1200
const LAUNCH_DUR = 1.35 // seconds for a launch streak to arrive + ignite
const TILT = 0.55 // vertical squash → the disk reads as a tilted ellipse

export class CommunityGalaxy {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.you = opts.you || '#FF9E6B'
    this.them = opts.them || '#E6749E'
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    this.t = 0
    this.spin = 0
    this.lastTs = 0
    this.running = false
    this.pTarget = { x: 0, y: 0 }
    this.p = { x: 0, y: 0 }
    this.ripples = [] // tap shockwaves
    this.mineIndex = -1 // the viewer's own star (their last placed ping), highlighted
    this.locate = null // a running "find your star" homing animation

    this.stars = [] // one per ping: { i, hue, tw, tws, born, launching, ox, oy, trail, mine }
    this.consts = [] // one per mutual match: anonymous asterism
    // "forming" = a gathering community below the privacy floor. Its exact ping
    // count is withheld (small counts de-anonymize), so instead of countable
    // stars we show uncountable luminous gas + a fixed scatter of sub-resolution
    // motes — activity you can feel but never count. It RESOLVES into real stars
    // when the community opens (setForming(false) + seed()).
    this.forming = false
    this.motes = []
    this._starSprite = {}
    this._glow = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), white: makeGlow('#FFFFFF', 64) }

    // deep-background field + drifting nebula, built once (mood only, not counted)
    this._seedDecor()

    this._boundTick = (ts) => this._tick(ts)
    this._bind()
    this.resize()
  }

  _starFor(hex) {
    if (!this._starSprite[hex]) this._starSprite[hex] = makeStar(hex, 40)
    return this._starSprite[hex]
  }

  // pick a star's hue: mostly warm cream/amber, a cooler minority, a rare rose.
  _hue(rnd) {
    const r = rnd()
    if (r < 0.5) return '#EFE9F4'
    if (r < 0.72) return this.you
    if (r < 0.9) return '#F4C9A1'
    if (r < 0.97) return '#BFD3FA'
    return this.them
  }

  _seedDecor() {
    let s = 20260708
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    this.bg = []
    const bn = window.innerWidth < 540 ? 130 : 210
    for (let i = 0; i < bn; i++) {
      this.bg.push({ x: rnd(), y: rnd(), z: 0.3 + rnd() * 0.7, r: rnd() < 0.9 ? 0.4 + rnd() * 0.6 : 1 + rnd() * 0.8, a: 0.1 + rnd() * 0.4, tw: rnd() * TWO, tws: 0.15 + rnd() * 0.7 })
    }
    this.neb = []
    const NCOL = ['#7E6BA8', '#C77E8A', this.you, '#5E7BB0']
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TWO
      const rr = 0.15 + rnd() * 0.6
      this.neb.push({ dx: Math.cos(a) * rr, dz: Math.sin(a) * rr, rad: 0.3 + rnd() * 0.4, col: NCOL[i % NCOL.length], a: 0.05 + rnd() * 0.05, tw: rnd() * TWO, tws: 0.05 + rnd() * 0.1 })
    }
  }

  // The disk-plane slot for the i-th ping — a phyllotaxis (sunflower) spiral with
  // a two-arm bias so it reads as a galaxy, not a perfect sunflower. Deterministic
  // in i, so a star never moves once placed and a re-count is stable.
  _slot(i) {
    const rr = Math.sqrt(i + 0.5) / Math.sqrt(CAP) // even area fill, normalized 0..~1
    let ang = i * GOLDEN
    // gentle spiral-arm pull: bias the angle toward the nearer of two logarithmic arms
    const arm = (i % 2) * Math.PI
    ang = ang + Math.sin(rr * 3.1 + arm) * 0.28
    // a stable pseudo-random height + twinkle, hashed from i
    const hsh = (Math.sin(i * 127.1) * 43758.5453) % 1
    const h = (hsh - Math.floor(hsh) - 0.5) * (0.05 + 0.09 * Math.exp(-rr * 2))
    return { dx: Math.cos(ang) * rr, dz: Math.sin(ang) * rr, y: h }
  }

  // Project a disk-plane point (dx, dz, y) to screen, applying spin + tilt +
  // pointer parallax. Returns { x, y, depth } where depth ∈ ~[-1,1] (front = +).
  _project(dx, dz, y) {
    const cs = Math.cos(this.spin), sn = Math.sin(this.spin)
    let rx = dx * cs - dz * sn
    let rz = dx * sn + dz * cs
    // pointer parallax: a slight yaw + tilt lean toward the pointer
    rx += this.p.x * 0.06
    const depth = rz // before squash — used for painter's order + shading
    const sx = this.cx + rx * this.scale + this.p.x * 8
    const sy = this.cy + rz * this.scale * (TILT + this.p.y * 0.06) - y * this.scale - this.p.y * 8
    return { x: sx, y: sy, depth }
  }

  _bind() {
    this._onResize = () => this.resize()
    this._onPointer = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      this.pTarget.x = clamp(x, -1, 1)
      this.pTarget.y = clamp(y, -1, 1)
    }
    this._onVis = () => (document.hidden ? this.stop() : this.start())
    // A tap anywhere non-interactive sends a soft ripple across the field — the
    // sky answers the touch. Guarded so taps on buttons/inputs never trigger it.
    this._onDown = (e) => {
      const el = e.target
      if (el && el.closest && el.closest('button, a, input, textarea, [role="button"], [data-noripple]')) return
      this.ripple(e.clientX, e.clientY)
    }
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    if (!this.reduced) {
      window.addEventListener('pointermove', this._onPointer, { passive: true })
      window.addEventListener('pointerdown', this._onDown, { passive: true })
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 760
    if (this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.scale = Math.min(w, h) * 0.46
    this.cx = w / 2
    this.cy = h * 0.4 // core sits in the upper-middle "hero" zone
    this._bgGrad = null
    this._vig = null
    if (this.reduced) this.start()
  }

  setPalette(you, them) {
    this.you = you
    this.them = them
    this._glow.you = makeGlow(you, 64)
    this._glow.them = makeGlow(them, 64)
    this.start()
  }

  // Instantly populate `n` resting ping-stars (used on mount / when the true
  // count is already known). They twinkle-in over a beat rather than launching,
  // so opening a busy community doesn't fire a thousand rockets.
  seed(n) {
    n = Math.max(0, Math.floor(n))
    this.stars = []
    this.mineIndex = -1
    this.locate = null
    for (let i = 0; i < n; i++) this.stars.push(this._makeStar(i, /*settleOnly*/ true))
    this.start()
  }

  _makeStar(i, settleOnly, mine) {
    return {
      i,
      mine: !!mine,
      hue: mine ? this.you : this._hue((() => { let s = (i * 2654435761) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280 })()),
      tw: (i * 1.7) % TWO,
      tws: 0.4 + ((i * 13) % 100) / 140,
      born: settleOnly ? -10 : this.t, // launched now, or already settled
      launching: !settleOnly,
      settleAt: settleOnly ? this.t + Math.random() * 0.9 : 0, // stagger the twinkle-in
      ox: 0,
      oy: 0,
      trail: [],
    }
  }

  get count() {
    return this.stars.length
  }

  // Enter/leave the "forming" (gathering, count-withheld) state. On enter, seed a
  // fixed, evocative amount of gas + motes that never reveals the true count.
  setForming(on) {
    this.forming = !!on
    if (on && !this.motes.length) {
      let s = 74218
      const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
      for (let i = 0; i < 30; i++) {
        const a = rnd() * TWO
        const rr = Math.pow(rnd(), 0.7) * 0.6
        this.motes.push({ dx: Math.cos(a) * rr, dz: Math.sin(a) * rr, y: (rnd() - 0.5) * 0.08, tw: rnd() * TWO, tws: 0.2 + rnd() * 0.5, drift: rnd() * TWO })
      }
    }
    this.start()
  }

  // Fire `k` new pings: each rises from below and ignites in its slot. This is the
  // live "someone placed a ping" beat. `opts.mine` marks the star as the viewer's
  // own — it lands brighter, keeps a soft ring, and can be found again via locate().
  launch(k = 1, opts = {}) {
    for (let j = 0; j < k; j++) {
      const i = this.stars.length
      const st = this._makeStar(i, false, !!opts.mine)
      // launch origin: from below the frame, roughly under its final position
      const slot = this._slot(i)
      const pr = this._project(slot.dx, slot.dz, slot.y)
      st.ox = pr.x + (Math.random() - 0.5) * this.w * 0.3
      st.oy = this.h + 30 + Math.random() * 60
      this.stars.push(st)
      if (opts.mine) this.mineIndex = i
    }
    if (opts.mine) this.locateMine()
    this.start()
    return this.stars.length
  }

  // Draw the eye to the viewer's own star: a homing ring converges onto it and it
  // flares. No-op if they don't have one yet.
  locateMine() {
    if (this.mineIndex < 0 || !this.stars[this.mineIndex]) return false
    this.locate = { t: 0, i: this.mineIndex }
    this.start()
    return true
  }

  hasMine() {
    return this.mineIndex >= 0 && !!this.stars[this.mineIndex]
  }

  // Trim to `n` (for a demo reset). Growing is done via launch()/seed().
  setCount(n) {
    n = Math.max(0, Math.floor(n))
    if (n < this.stars.length) this.stars.length = n
    else if (n > this.stars.length) this.launch(n - this.stars.length)
    this.start()
  }

  // Ensure `n` anonymous match-constellations exist. New ones trace themselves in.
  setConstellations(n) {
    n = Math.max(0, Math.floor(n))
    while (this.consts.length < n) this.addConstellation(this.consts.length === 0)
    if (this.consts.length > n) this.consts.length = n
    this.start()
  }

  addConstellation(instant) {
    // Keep the sky legible however long a session runs: past a cap, retire the
    // oldest figure so new matches always have room and nothing ever tangles.
    const MAX_CONSTS = 28
    if (this.consts.length >= MAX_CONSTS) this.consts.shift()
    const idx = this._constSeed = (this._constSeed || 0) + 1
    let s = idx * 99991
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    // seat it within the community's own light (mid-disk, not orbiting outside),
    // golden-angle spaced so figures never pile up on each other and stay on-frame
    const ang = idx * GOLDEN * 1.4
    const rad = 0.42 + rnd() * 0.38
    const cxp = Math.cos(ang) * rad
    const czp = Math.sin(ang) * rad
    const nodes = []
    const nn = 3 + Math.floor(rnd() * 3) // 3–5 nodes: a small asterism, never a tangle
    for (let k = 0; k < nn; k++) {
      nodes.push({ dx: cxp + (rnd() - 0.5) * 0.14, dz: czp + (rnd() - 0.5) * 0.14, y: 0.04 + rnd() * 0.06 })
    }
    // edges as a simple open path (sorted by angle from the figure's centroid so
    // the polyline never crosses itself → always legible)
    nodes.sort((a, b) => Math.atan2(a.dz - czp, a.dx - cxp) - Math.atan2(b.dz - czp, b.dx - cxp))
    this.consts.push({ nodes, born: instant ? -10 : this.t, tw: rnd() * TWO })
    this.start()
  }

  // a tap sends a soft ring across the field (interactive life)
  ripple(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    this.ripples.push({ x: clientX - rect.left, y: clientY - rect.top, t: 0 })
    this.start()
  }

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
    window.removeEventListener('resize', this._onResize)
    document.removeEventListener('visibilitychange', this._onVis)
    window.removeEventListener('pointermove', this._onPointer)
    window.removeEventListener('pointerdown', this._onDown)
  }

  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    if (this.reduced) {
      this.t += dt
      this._draw(0)
      // settle quickly then rest (no perpetual repaint)
      const busy = this.stars.some((s) => s.launching) || this.ripples.length || this.locate || this.consts.some((c) => this.t - c.born < 1.6)
      if (!busy && this.t > 1) { this.running = false; return }
      requestAnimationFrame(this._boundTick)
      return
    }
    this.t += dt
    this.spin += dt * 0.02 // a slow, calm orbit
    this.p.x = lerp(this.p.x, this.pTarget.x, Math.min(1, dt * 2.4))
    this.p.y = lerp(this.p.y, this.pTarget.y, Math.min(1, dt * 2.4))
    this._draw(dt)
    requestAnimationFrame(this._boundTick)
  }

  _draw(dt) {
    const ctx = this.ctx
    // backdrop
    ctx.globalCompositeOperation = 'source-over'
    if (!this._bgGrad) {
      const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, Math.max(this.w, this.h) * 0.85)
      g.addColorStop(0, '#0A0713')
      g.addColorStop(0.6, '#070510')
      g.addColorStop(1, '#04030A')
      this._bgGrad = g
    }
    ctx.fillStyle = this._bgGrad
    ctx.fillRect(0, 0, this.w, this.h)

    this._drawBackground(dt)
    this._drawNebula(dt)
    this._drawCore()
    if (this.forming) {
      // gathering: uncountable gas + motes; no discrete stars, no constellations
      this._drawForming(dt)
    } else {
      this._drawStars(dt)
      this._drawConstellations(dt)
      this._drawLocate(dt)
    }
    this._drawRipples(dt)
    this._drawVignette()

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // A soft radial vignette that deepens the frame edges, so the field reads as a
  // lit disk in real depth rather than a flat wash.
  _drawVignette() {
    const ctx = this.ctx
    if (!this._vig) {
      const g = ctx.createRadialGradient(this.cx, this.cy, this.scale * 0.55, this.cx, this.cy, Math.max(this.w, this.h) * 0.95)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.7, 'rgba(3,2,8,0.28)')
      g.addColorStop(1, 'rgba(2,1,6,0.62)')
      this._vig = g
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = this._vig
    ctx.fillRect(0, 0, this.w, this.h)
  }

  // The "find your star" homing gesture: a ring closes in on the viewer's own star
  // and it flares. Runs once per locateMine() call, then clears itself.
  _drawLocate(dt) {
    if (!this.locate) return
    const st = this.stars[this.locate.i]
    if (!st || st.launching) { if (!st) this.locate = null; return }
    const slot = this._slot(st.i)
    const pr = this._project(slot.dx, slot.dz, slot.y)
    this.locate.t += dt
    const dur = 1.7
    const p = this.locate.t / dur
    if (p >= 1) { this.locate = null; return }
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    // ring converges inward over the first ~65% of the beat
    const conv = easeOut(clamp(p / 0.65, 0, 1))
    const R = (1 - conv) * this.scale * 0.55 + 7
    ctx.globalAlpha = (1 - p) * 0.6
    const grd = ctx.createLinearGradient(pr.x - R, pr.y, pr.x + R, pr.y)
    grd.addColorStop(0, this._rgba(this.them, 0.9))
    grd.addColorStop(0.5, this._rgba(this.you, 1))
    grd.addColorStop(1, this._rgba(this.them, 0.9))
    ctx.strokeStyle = grd
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(pr.x, pr.y, R, 0, TWO)
    ctx.stroke()
    // the star flares as the ring lands
    const flare = clamp((p - 0.55) / 0.45, 0, 1)
    if (flare > 0) {
      const sz = 12 + (1 - Math.abs(flare - 0.5) * 2) * 22
      ctx.globalAlpha = (1 - flare) * 0.9
      ctx.drawImage(this._glow.you, pr.x - sz, pr.y - sz, sz * 2, sz * 2)
      ctx.globalAlpha = 1
      ctx.drawImage(this._starFor('#FFFFFF'), pr.x - 6, pr.y - 6, 12, 12)
    }
  }

  _drawBackground(dt) {
    const ctx = this.ctx
    for (const b of this.bg) {
      b.tw += dt * b.tws
      const par = (1 - b.z) * 18
      const x = b.x * this.w - this.p.x * par
      const y = b.y * this.h - this.p.y * par
      const a = b.a * (0.5 + 0.5 * Math.sin(b.tw))
      if (a <= 0.02) continue
      ctx.globalAlpha = Math.min(0.8, a)
      ctx.fillStyle = '#E8ECFA'
      ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2)
    }
  }

  _drawNebula(dt) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const nb of this.neb) {
      const pr = this._project(nb.dx, nb.dz, 0)
      nb.tw += dt * nb.tws
      const rr = nb.rad * this.scale * (1.1 + this.stars.length / CAP) // grows a touch as the galaxy fills
      const a = nb.a * (0.7 + 0.3 * Math.sin(nb.tw))
      if (!this._nebGrad) this._nebGrad = {}
      if (!this._nebGrad[nb.col]) {
        const [r, g, b] = hexToRgb(nb.col)
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
        grd.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`)
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
        this._nebGrad[nb.col] = grd
      }
      ctx.save()
      ctx.globalAlpha = clamp(a, 0, 1)
      ctx.translate(pr.x, pr.y)
      ctx.scale(rr, rr)
      ctx.fillStyle = this._nebGrad[nb.col]
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, TWO)
      ctx.fill()
      ctx.restore()
    }
  }

  // A soft luminous core whose brightness scales with how full the galaxy is —
  // an empty community is nearly dark; a dense one glows.
  _drawCore() {
    const ctx = this.ctx
    // forming reads as a warm, gathering ember; otherwise brightness tracks fill
    const fill = this.forming ? 0.42 : clamp(this.stars.length / 220, 0.2, 1) // faint ember even when empty; saturates around a few hundred
    const pr = this._project(0, 0, 0)
    const R = this.scale * (0.5 + 0.5 * clamp(this.stars.length / CAP, 0, 1))
    if (!this._coreGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,236,206,0.22)')
      g.addColorStop(0.3, 'rgba(255,206,168,0.10)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._coreGrad = g
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = fill
    ctx.translate(pr.x, pr.y)
    ctx.scale(R, R * TILT)
    ctx.fillStyle = this._coreGrad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()
  }

  // The gathering state: a soft luminous haze with a few dim, drifting motes —
  // enough to read as "something is happening here" without ever being countable.
  _drawForming(dt) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const m of this.motes) {
      m.tw += dt * m.tws
      m.drift += dt * 0.08
      const dx = m.dx + Math.cos(m.drift) * 0.02
      const dz = m.dz + Math.sin(m.drift) * 0.02
      const pr = this._project(dx, dz, m.y)
      const a = 0.16 * (0.5 + 0.5 * Math.sin(m.tw)) * clamp(0.6 + pr.depth * 0.5, 0.2, 1)
      if (a <= 0.01) continue
      ctx.globalAlpha = a
      const sz = 10 + 6 * Math.sin(m.tw * 0.7)
      ctx.drawImage(this._glow.you, pr.x - sz, pr.y - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1
  }

  _drawStars(dt) {
    const ctx = this.ctx
    const glowQ = []
    for (const st of this.stars) {
      const slot = this._slot(st.i)
      const pr = this._project(slot.dx, slot.dz, slot.y)
      st.tw += dt * st.tws
      const age = this.t - st.born
      const shade = clamp(0.55 + pr.depth * 0.5, 0.3, 1.1) // front stars brighter

      // LAUNCH: rise from origin along an eased arc, then ignite at the slot.
      if (st.launching) {
        const p = clamp(age / LAUNCH_DUR, 0, 1)
        if (p >= 1) {
          st.launching = false
          st.trail = []
        } else {
          const e = easeOut(p)
          // arc: interpolate origin→slot with a lifted control point
          const mx = (st.ox + pr.x) / 2
          const my = Math.min(st.oy, pr.y) - this.h * 0.12
          const x = (1 - e) * (1 - e) * st.ox + 2 * (1 - e) * e * mx + e * e * pr.x
          const y = (1 - e) * (1 - e) * st.oy + 2 * (1 - e) * e * my + e * e * pr.y
          // comet trail
          st.trail.push([x, y])
          if (st.trail.length > 14) st.trail.shift()
          ctx.globalCompositeOperation = 'lighter'
          for (let k = 0; k < st.trail.length; k++) {
            const tp = st.trail[k]
            const f = k / st.trail.length
            ctx.globalAlpha = f * f * 0.5 * (1 - e * 0.4)
            const sz = 3 + f * 9
            ctx.drawImage(this._glow.you, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
          }
          // bright head
          ctx.globalAlpha = 1
          ctx.drawImage(this._starFor('#FFFFFF'), x - 7, y - 7, 14, 14)
          continue
        }
      }

      // freshly-arrived ignition flash (brief expanding ring)
      const ignite = st.launching ? 0 : clamp(1 - (age - LAUNCH_DUR) / 0.5, 0, 1)
      if (!st.launching && age < LAUNCH_DUR + 0.5 && age > 0 && st.settleAt < 0.001) {
        ctx.globalCompositeOperation = 'lighter'
        const rr = (1 - ignite) * 26 + 6
        ctx.globalAlpha = ignite * 0.6
        ctx.drawImage(this._glow.you, pr.x - rr, pr.y - rr, rr * 2, rr * 2)
      }

      // resting star — a soft twinkle. A staggered settle-in on seed.
      let settle = 1
      if (st.settleAt > 0.001) settle = clamp((this.t - (st.settleAt - 0.9)) / 0.9, 0, 1)
      const tw = 0.7 + 0.3 * Math.sin(st.tw)
      const a = 0.85 * tw * shade * settle
      if (a <= 0.02) continue
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = Math.min(1, a)
      const D = clamp(2.4 * (0.8 + pr.depth * 0.4), 1.6, 4.2) * (1 + ignite * 1.4) * (st.mine ? 1.35 : 1)
      ctx.drawImage(this._starFor(st.hue), pr.x - D, pr.y - D, D * 2, D * 2)
      // the brighter half also get a faint bloom (queued for the additive pass)
      if (tw > 0.85 && pr.depth > 0) glowQ.push([pr.x, pr.y, a * 0.5, st.hue])

      // the viewer's own star keeps a soft, breathing ring so it's always findable
      // in the crowd — the one star in this sky that is theirs.
      if (st.mine) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.7)
        ctx.globalCompositeOperation = 'lighter'
        const gs = 9 + pulse * 3
        ctx.globalAlpha = 0.45 + 0.4 * pulse
        ctx.drawImage(this._glow.you, pr.x - gs, pr.y - gs, gs * 2, gs * 2)
        ctx.globalAlpha = 0.35 + 0.35 * pulse
        ctx.strokeStyle = this._rgba('#FFFFFF', 1)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(pr.x, pr.y, 6.5 + pulse * 1.6, 0, TWO)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.drawImage(this._starFor('#FFFFFF'), pr.x - 2.8, pr.y - 2.8, 5.6, 5.6)
      }
    }
    // additive bloom pass
    ctx.globalCompositeOperation = 'lighter'
    for (const [x, y, a, hue] of glowQ) {
      ctx.globalAlpha = Math.min(0.4, a)
      const g = hue === this.them ? this._glow.them : this._glow.you
      ctx.drawImage(g, x - 7, y - 7, 14, 14)
    }
  }

  _drawConstellations(dt) {
    const ctx = this.ctx
    for (const cn of this.consts) {
      const age = this.t - cn.born
      cn.tw += dt * 0.6
      const shimmer = 0.6 + 0.4 * Math.sin(cn.tw)
      // trace-in: reveal the polyline over ~1.4s when freshly born
      const reveal = clamp(age / 1.4, 0, 1)
      const pts = cn.nodes.map((n) => this._project(n.dx, n.dz, n.y))
      // edges (faint rose→cream light-threads)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = 1
      const segs = pts.length - 1
      for (let k = 0; k < segs; k++) {
        const segReveal = clamp(reveal * segs - k, 0, 1)
        if (segReveal <= 0) break
        const a = pts[k], b = pts[k + 1]
        const bx = lerp(a.x, b.x, segReveal), by = lerp(a.y, b.y, segReveal)
        const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
        grd.addColorStop(0, this._rgba(this.them, 0.0))
        grd.addColorStop(0.5, `rgba(245,236,246,${0.24 * shimmer})`)
        grd.addColorStop(1, this._rgba(this.you, 0.18 * shimmer))
        ctx.strokeStyle = grd
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
      // nodes
      for (let k = 0; k < pts.length; k++) {
        const on = reveal * pts.length > k
        if (!on) continue
        const pt = pts[k]
        ctx.globalAlpha = 0.5 * shimmer
        ctx.drawImage(this._glow.them, pt.x - 6, pt.y - 6, 12, 12)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 0.9 * shimmer
        ctx.drawImage(this._starFor('#FFFFFF'), pt.x - 2.6, pt.y - 2.6, 5.2, 5.2)
        ctx.globalCompositeOperation = 'lighter'
      }
    }
  }

  // A touch answers with a warm shockwave on the disk plane: a quick core bloom at
  // the point, then two concentric rings — amber leading into rose — easing outward
  // and fading. Richer and warmer than a single flat stroke, so the sky feels alive
  // to the hand rather than merely clickable.
  _drawRipples(dt) {
    if (!this.ripples.length) return
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    this.ripples = this.ripples.filter((r) => {
      r.t += dt
      const dur = 1.3
      const p = r.t / dur
      if (p >= 1) return false
      // the initial bloom — a soft warm flash right at the touch
      const flash = clamp(1 - p / 0.28, 0, 1)
      if (flash > 0) {
        const fs = 16 + (1 - flash) * 30
        ctx.globalAlpha = flash * 0.5
        ctx.drawImage(this._glow.you, r.x - fs, r.y - fs, fs * 2, fs * 2)
      }
      // two rings, staggered, colored amber↔rose across their width
      for (let k = 0; k < 2; k++) {
        const pk = clamp(p - k * 0.14, 0, 1)
        if (pk <= 0) continue
        const rad = easeOut(pk) * this.scale * (0.66 + k * 0.2)
        ctx.globalAlpha = (1 - pk) * (0.3 - k * 0.12)
        const grd = ctx.createLinearGradient(r.x - rad, r.y, r.x + rad, r.y)
        grd.addColorStop(0, this._rgba(this.them, 0.85))
        grd.addColorStop(0.5, this._rgba(this.you, 0.95))
        grd.addColorStop(1, this._rgba(this.them, 0.85))
        ctx.strokeStyle = grd
        ctx.lineWidth = 1.9 - k * 0.7
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, rad, rad * TILT, 0, 0, TWO)
        ctx.stroke()
      }
      return true
    })
  }

  _rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
  }
}

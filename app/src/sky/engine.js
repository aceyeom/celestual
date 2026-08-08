// sky/engine.js — the one instrument both skies are played on.
//
// galaxy.js and communityGalaxy.js used to be two 1,700- and 2,500-line files
// that each carried their own camera, their own projection, their own frame-time
// governor, their own nebula pass, their own dive grammar and their own tag
// renderer. They were kept identical by hand and by comment, and both files say
// so out loud. Everything that was duplicated lives here now, once, and the two
// skies are what they always should have been: two POPULATIONS on one engine.
//
// A subclass says what lives in its sky (`_build`), what its events look like
// (`_frame`), and how the hand should be answered. It never touches GL.
//
// The frame, in order — and the order is the whole compositing model, since
// there is no depth buffer and there does not need to be one:
//
//   1  the deep-space floor + the far galaxy's band          (opaque)
//   2  the deep field, the halo                              (additive)
//   3  the disk: every ordinary star                         (additive)
//   4  the volumetric gas                        (emission + T x dst)
//        ...so everything above is genuinely dimmed by the dust in front of it
//   5  near-field stars, the viewer's own stars, events      (additive)
//        ...which are in front of the disk, so they are not dust-attenuated —
//        and your own star staying findable through a dust lane is a feature
//   6  the @ layer                                           (alpha)
//   7  bloom, ACES, dither                                   (the sensor)

import { createGL, guessTier, TIER, Target, makeFullscreen, FULLSCREEN_VS } from './gl.js'
import { makeBlackbodyLUT } from './blackbody.js'
import { makeNoiseVolume, makeBlueNoise } from './volume.js'
import { Camera, CAM, FOCAL, TILT } from './camera.js'
import { StarPass } from './stars.js'
import { GasPass } from './gas.js'
import { BodyPass } from './body.js'
import { PostChain } from './post.js'
import { BillboardPass, SpritePass } from './fx.js'
import { PATTERN_SPEED } from './model.js'

export { CAM, FOCAL, TILT }
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t

export function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
// The brand's colours are authored in sRGB; everything inside the renderer is
// linear light. Converting once here is why an amber halo stays amber through
// the tonemap instead of drifting yellow as it brightens.
export function linearOf(hex, gain = 1) {
  const [r, g, b] = hexToRgb(hex)
  const f = (v) => {
    const s = v / 255
    return (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)) * gain
  }
  return [f(r), f(g), f(b)]
}

// ── when a star stops being a point ──────────────────────────────────────────
// Stefan-Boltzmann, on the CPU: L = 4(pi)R^2(sigma)T^4, so R goes as
// sqrt(L)/T^2. This is the same line stars.js's vertex shader runs, and it has
// to STAY the same line — it is what decides where the opaque body pass draws,
// and a disc that disagrees with the point it grew out of is a disc sitting
// beside its own star.
export function starRadius(radiusScale, temp, lum) {
  const tRel = temp / 5772
  return (radiusScale * Math.sqrt(lum)) / (tRel * tRel)
}
const sstep = (a, b, x) => {
  const u = clamp((x - a) / (b - a), 0, 1)
  return u * u * (3 - 2 * u)
}

export class SkyEngine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.opts = opts
    // the two lights, in the brand's one hue at two values (theme.js)
    this.you = opts.you || '#B98A55'
    this.them = opts.them || '#D6B78A'
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    const made = createGL(canvas)
    this.ok = !!made
    if (!made) return
    this.gl = made.gl
    this.caps = made.caps

    this.tier = guessTier(this.caps)
    this.budget = TIER[this.tier]
    this.dprEff = this.dpr * (this.tier === 0 ? 1 : this.tier === 1 ? 0.85 : 0.68)
    this.lost = false

    // ── clocks ──
    // `t` is wall time. `orbitT` is the galaxy's own clock — it slows almost to
    // a stop through a dive so the target star holds steady under the flight
    // path, and it is what every star's orbital phase is integrated against.
    // `pattern` is the density wave's own slow rotation, the deepest and
    // calmest motion in the product.
    this.t = 0
    this.orbitT = 0
    this.orbitTPrev = 0
    this.pattern = 0
    this.patternPrev = 0
    this.motion = opts.motion != null ? opts.motion : 20
    // How much of the per-star velocity smear is actually drawn. Normally 1,
    // and normally nothing touches it. It exists because motion blur is honest
    // about camera ROTATION as well as travel, and a camera that swings its
    // whole horizon in a second smears every star to the length cap at once —
    // which is physically what a real lens would do and visually a swirl of
    // dashes that reads as a glitch. A scene that knows it is about to turn
    // hard can lean on this rather than on the turn being wrong.
    this.motionScale = 1
    this.dim = 1
    this.dimTarget = 1
    this.running = false
    this.lastTs = 0

    this.cam = new Camera()
    this.cam.reduced = this.reduced
    this.RPrev = new Float32Array(this.cam.R)
    this.eyePrev = { x: 0, y: 0, z: 0 }

    this._initGL()

    // How wide, in world units, the thing being framed is. The camera's pixel
    // scale is solved from this every resize — which is what lets a community
    // sky genuinely GROW: as the disk gets bigger the view simply stands
    // further back, and no existing star has to move.
    this.frameRadius = 1.35
    this.frameFit = 0.5
    // Where the galactic centre sits down the frame. A sky that is a BACKDROP
    // has to decide this against the type in front of it, not against the
    // canvas: at 0.44 the brightest, busiest thing in the picture lands exactly
    // where a centred headline does, and every screen in the product then reads
    // over the one part of the galaxy that cannot be read over.
    this.centerY = 0.44
    // …and where it sits ACROSS it. Almost always the middle, and it exists for
    // the same reason `centerY` does: the galactic centre is the one part of
    // the picture nothing can be read over, so a layout that puts type in a
    // fixed column needs to be able to move the heart out from behind it.
    this.centerX = 0.5
    this.insetT = 0
    this.insetB = 0
    this.bandShift = [0, 0]
    // ── one star, one size, on every screen ──
    // `cam.unit` is how many pixels a world unit is worth, and it is solved from
    // the VIEWPORT: a laptop frames the same galaxy across two and a half times
    // as many pixels as a phone. That is right for the galaxy — it should fill
    // the window it is given — and wrong for the individual star, because a
    // star's rendered size is the larger of the instrument's point-spread
    // (constant, in pixels) and its own angular diameter (radius x unit). Scale
    // the frame up and the second term wins: the same field that is a fine
    // grain of points at 390px opens into fat out-of-focus saucers at 1440, and
    // the two devices are showing two different skies. It is why a size that
    // was tuned on a phone "did not go through" on a desktop.
    //
    // So the physical radius carries a compensating factor, solved once per
    // layout against a reference phone's framing. A star is then the same
    // OBJECT everywhere: the same pixels at rest, resolving into a body at the
    // same point on the same dive, on any screen. The galaxy still grows with
    // the window; only its grain stays put.
    this.sizeScale = 1

    // ── the governor ──
    // An EMA of raw frame time walks the quality tier up and down. It only ever
    // trades resolution and decoration; in the community sky the countable
    // pings are never among the things it is allowed to drop.
    this._ftEma = 16
    this._qAt = 0

    this._boundTick = (ts) => this._tick(ts)
    this._bindBase()
    this.resize(true)
  }

  // Every GPU-side object in one place, so a context that comes back can be
  // rebuilt by calling this again rather than by remounting the whole sky.
  _initGL() {
    const gl = this.gl
    // `opts.ramp` swaps the Planck locus for another one-dimensional colour
    // curve — the one hook a single-hue sky needs (blackbody.js, galaxy.js).
    // Absent, which it is everywhere in production, this is the real physics.
    this.bbTex = makeBlackbodyLUT(gl, this.opts.ramp)
    this.noiseTex = makeNoiseVolume(gl, { size: this.tier >= 2 ? 48 : 64, seed: this.opts.noiseSeed || 1337 })
    this.blueTex = makeBlueNoise(gl)
    this.fullscreen = makeFullscreen(gl)
    this.scene = null
    this.gasTarget = null
    this.starPass = new StarPass(gl)
    this.gasPass = new GasPass(gl, this.caps)
    this.body = new BodyPass(gl)
    this.post = new PostChain(gl, this.caps, this.fullscreen)
    this.fx = new BillboardPass(gl, 3072)
    this.sprites = new SpritePass(gl)
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  start() {
    if (this.running || !this.ok || this.lost || this.destroyed) return
    this.running = true
    this.lastTs = performance.now()
    requestAnimationFrame(this._boundTick)
  }
  stop() {
    this.running = false
  }
  destroy() {
    // The `destroyed` latch matters more than it looks. Every mutator in this
    // engine calls start(), and the gesture layer holds WINDOW listeners — so a
    // torn-down instance could be woken by a stray pointer move and try to draw
    // with GL objects that had already been deleted. React's StrictMode makes
    // that happen on every mount in development.
    this.destroyed = true
    this.stop()
    this._unbindBase()
    if (this.gest) this.gest.unbind()
    if (!this.ok) return
    const gl = this.gl
    this.starPass.destroy()
    this.gasPass.destroy()
    this.body.destroy()
    this.post.destroy()
    this.fx.destroy()
    this.sprites.destroy()
    if (this.scene) this.scene.destroy()
    if (this.gasTarget) this.gasTarget.destroy()
    gl.deleteTexture(this.bbTex)
    gl.deleteTexture(this.noiseTex)
    gl.deleteTexture(this.blueTex)
    gl.deleteVertexArray(this.fullscreen.vao)
    gl.deleteBuffer(this.fullscreen.buf)
    // Only force the context away if the canvas is genuinely gone from the
    // document. React's StrictMode mounts, tears down and re-mounts every effect
    // against the SAME canvas node in development — so forcing loss here killed
    // the context the very next instance was about to draw into, and the sky
    // came up black on every dev reload.
    if (!this.canvas.isConnected) {
      const lose = gl.getExtension('WEBGL_lose_context')
      if (lose) lose.loseContext()
    }
  }

  setPalette(you, them) {
    this.you = you
    this.them = them
    this._paletteChanged()
    this.start()
  }
  _paletteChanged() {}

  setMotion(m) {
    this.motion = m
    this.start()
  }

  // The screen tells the sky how much of the frame its chrome occupies, and the
  // galaxy re-centres in the band of sky the foreground actually leaves clear.
  // A readout card can never hide the heart.
  setViewInsets(top = 0, bottom = 0) {
    const t = Math.max(0, Math.round(top))
    const b = Math.max(0, Math.round(bottom))
    if (t === this.insetT && b === this.insetB) return
    this.insetT = t
    this.insetB = b
    this.resize(true)
    this.start()
  }

  resize(force) {
    if (!this.ok) return
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 760
    // Ignore the small height-only changes the mobile URL bar makes as it
    // collapses on scroll. Re-allocating every render target on each toolbar
    // frame is what made the old canvas galaxy "vibrate" inside the Instagram
    // in-app browser, and reallocating three float buffers would be worse.
    if (!force && this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.width = Math.max(1, Math.round(w * this.dprEff))
    this.height = Math.max(1, Math.round(h * this.dprEff))
    this.canvas.width = this.width
    this.canvas.height = this.height

    const gl = this.gl
    if (!this.scene) this.scene = new Target(gl, this.caps, this.width, this.height)
    else this.scene.resize(this.width, this.height)
    const gs = this.budget.gasScale
    if (!this.gasTarget) this.gasTarget = new Target(gl, this.caps, this.width * gs, this.height * gs)
    else this.gasTarget.resize(this.width * gs, this.height * gs)
    this.post.resize(this.width, this.height, this.budget.bloomLevels)

    this._layout()
    this._resized()
    this.start()
  }
  _resized() {}

  // Where the galaxy sits, and how big. Deliberately generous: the rim is
  // ALLOWED to spill past the frame, because the sky is a place rather than a
  // picture and a contained shape on black reads as a graphic.
  _layout() {
    const availTop = this.insetT
    const avail = Math.max(this.h * 0.42, this.h - this.insetT - this.insetB)
    const cx = this.w * this.centerX
    const cy = this.insetT || this.insetB ? clamp(availTop + avail * 0.44, this.h * 0.24, this.h * 0.62) : this.h * this.centerY
    const minDim = Math.min(this.w, avail)
    const P0 = FOCAL / CAM
    const px = minDim * this.frameFit + Math.max(this.w, this.h) * 0.035
    const unit = px / (this.frameRadius * P0)
    this.cam.setFrame(this.w, this.h, cx, cy, unit)
    // The framing a 390 x 844 phone would have solved for, which is the screen
    // every size in this renderer was tuned against. `frameRadius` cancels, so
    // this is purely "how much bigger is this window's picture than that one",
    // and a star's radius is divided by it. Clamped: a very small phone should
    // not be handed visibly fatter stars, and a wall-sized window should not
    // shrink them into invisibility.
    const pxRef = 390 * this.frameFit + 844 * 0.035
    this.sizeScale = clamp(pxRef / Math.max(px, 1e-3), 0.34, 1.08)
  }

  // The galaxy grew (or shrank): re-solve the framing so it still fits, without
  // any star having to move.
  setFrameRadius(r) {
    const next = Math.max(0.3, r)
    if (Math.abs(next - this.frameRadius) < 0.004) return
    this.frameRadius = next
    this._layout()
    this.start()
  }

  // ── input ─────────────────────────────────────────────────────────────────
  _bindBase() {
    this._onResize = () => this.resize()
    this._onVis = () => (document.hidden ? this.stop() : this.start())
    this._onPointer = (e) => {
      if (this._pointerOwned && this._pointerOwned()) return
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      this.cam.parallaxTarget.x = clamp(x, -1, 1)
      this.cam.parallaxTarget.y = clamp(y, -1, 1)
    }
    this._onTilt = (e) => {
      if (e.gamma == null && e.beta == null) return
      const nx = clamp((e.gamma || 0) / 35, -1, 1)
      const ny = clamp(((e.beta || 0) - 45) / 35, -1, 1)
      // Raw device-orientation is noisy; fed straight in, hand-held sensor
      // jitter makes the whole field tremble. Dead-zone, then low-pass, so only
      // a real tilt moves the camera.
      const dz = (v) => (Math.abs(v) < 0.06 ? 0 : v)
      this.cam.parallaxTarget.x = this.cam.parallaxTarget.x * 0.85 + dz(nx) * 0.15
      this.cam.parallaxTarget.y = this.cam.parallaxTarget.y * 0.85 + dz(ny) * 0.15
    }
    // A GPU context can be taken away at any time — a backgrounded tab, another
    // page claiming the last context, a driver reset. Calling preventDefault is
    // what makes the browser promise to give one back; without it the canvas is
    // simply dead forever, which for this product means the night sky is gone.
    this._onLost = (e) => {
      e.preventDefault()
      this.stop()
      this.lost = true
      if (this.onContextLost) this.onContextLost()
    }
    this._onRestored = () => {
      if (!this.lost) return
      this.lost = false
      // every GPU object died with the context; build a new set and repopulate
      this._initGL()
      this._build()
      this.resize(true)
      this.start()
    }
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    this.canvas.addEventListener('webglcontextlost', this._onLost)
    this.canvas.addEventListener('webglcontextrestored', this._onRestored)
    if (!this.reduced) {
      window.addEventListener('pointermove', this._onPointer, { passive: true })
      window.addEventListener('deviceorientation', this._onTilt, { passive: true })
    }
  }
  _unbindBase() {
    window.removeEventListener('resize', this._onResize)
    document.removeEventListener('visibilitychange', this._onVis)
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this._onLost)
      this.canvas.removeEventListener('webglcontextrestored', this._onRestored)
    }
    window.removeEventListener('pointermove', this._onPointer)
    window.removeEventListener('deviceorientation', this._onTilt)
  }

  // ── the governor ──────────────────────────────────────────────────────────
  _govern(rawMs, ts) {
    if (rawMs > 0 && rawMs < 250) this._ftEma = this._ftEma * 0.94 + rawMs * 0.06
    if (ts - this._qAt < 1800) return
    if (this._ftEma > 33 && this.tier < 2) {
      this.tier++
      this._applyTier(ts)
    } else if (this._ftEma < 15 && this.tier > 0 && ts - this._qAt > 7000) {
      this.tier--
      this._applyTier(ts)
    }
  }
  _applyTier(ts) {
    this._qAt = ts || performance.now()
    this._ftEma = 21 // re-centre the meter so one step gets a fair trial
    this.budget = TIER[this.tier]
    this.dprEff = this.dpr * (this.tier === 0 ? 1 : this.tier === 1 ? 0.85 : 0.68)
    this._rebuild()
    this.resize(true)
  }
  // subclasses regenerate their populations at the new budget
  _rebuild() {}

  // ── the frame ─────────────────────────────────────────────────────────────
  _tick(ts) {
    if (!this.running || !this.ok || this.lost || this.destroyed) return
    const raw = ts - this.lastTs
    // Reduced motion halves the frame rate rather than freezing the sky. The
    // preference is about vestibular safety, not about wanting a dead picture:
    // a slow, steady, non-accelerating drift is well inside it, and this sky
    // is meant to be alive.
    if (this.reduced && raw < 30) {
      requestAnimationFrame(this._boundTick)
      return
    }
    const dt = Math.min(0.05, raw / 1000)
    this.lastTs = ts
    this._govern(raw, ts)

    this.t += dt
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2.2)

    // remember the previous basis BEFORE the camera moves — the star shader
    // needs it to compute each star's true apparent motion for the smear
    this.RPrev.set(this.cam.R)
    this.eyePrev.x = this.cam.eye.x
    this.eyePrev.y = this.cam.eye.y
    this.eyePrev.z = this.cam.eye.z
    this.orbitTPrev = this.orbitT
    this.patternPrev = this.pattern

    const stillness = this.cam.update(dt, { t: this.t, holdDur: this.holdDur })
    // The galaxy's own clock. It never stops — the field is always turning,
    // always shearing, and a still screen is never a still picture — but it
    // nearly stills through a dive so the star being flown to holds its place.
    const rate = (this.motion / 100) * (this.reduced ? 0.42 : 1) * stillness
    this.orbitT += dt * rate * 6
    this.pattern += dt * PATTERN_SPEED * rate * 6
    this.bandShift[0] = -this.cam.parallax.x * 0.006
    this.bandShift[1] = -this.cam.parallax.y * 0.004

    this._frame(dt)
    this._render()
    requestAnimationFrame(this._boundTick)
  }
  // subclasses advance their own state and enqueue their events here
  _frame() {}

  // ── the star / body hand-off, in one place for both skies ────────────────
  // `radius` is what starRadius() returned; `persp` is what cam.project() gave
  // back for the star in question.
  //
  //   discOf     — 0 = a point of light, 1 = a body with a face. The shader's
  //                own ramp, so the two agree about what a star currently IS.
  //   handoverOf — whether that body is big enough to be worth its own pass.
  //                Being technically resolved is not the same thing: at the
  //                resting camera one of your stars is already a hair over the
  //                point-spread, and its "disc" is about a pixel across. The
  //                star pass's two lines of limb darkening are exactly right at
  //                that size; a photosphere shader and its antialiasing are
  //                not. The band is wide so the swap is a cross-fade, never a
  //                frame where the star changes what it is made of.
  // ── "the camera has landed" ──────────────────────────────────────────────
  // Every screen that flies somewhere has words waiting to arrive with it, and
  // until now each of them guessed: a CSS animation-delay hard-coded against
  // what the dive was thought to take. The dive does not take a fixed time —
  // its bank breathes with how far the star has to travel — so the guess was
  // wrong by up to nine hundred milliseconds, always in the direction of the
  // name appearing over a camera that was still moving.
  //
  // Subclasses call this once per frame with a live dive; it fires exactly once
  // per flight, the moment the flight is genuinely over.
  _armArrival(cb) {
    this._arriveCb = cb || null
    this._arrived = false
  }
  _checkArrival() {
    if (!this._arriveCb || this._arrived) return
    if (this.cam.focus < 0.999) return
    this._arrived = true
    const cb = this._arriveCb
    this._arriveCb = null
    cb()
  }

  // `radius` here is the RAW radius starRadius() returned; both of these apply
  // the layout's size compensation themselves, so a caller can never forget it
  // and leave the CPU disagreeing with the shader about what a star is.
  discOf(radius, persp) {
    const psf = 0.95 * this.dprEff
    const angPx = radius * this.sizeScale * this.cam.unit * persp * this.dprEff
    return sstep(psf * 0.85, psf * 2.2, angPx)
  }
  handoverOf(radius, persp) {
    const angPx = radius * this.sizeScale * this.cam.unit * persp * this.dprEff
    return sstep(6 * this.dprEff, 13 * this.dprEff, angPx)
  }
  // and the drawn radius of a body, in world units — what body.js has to be
  // handed so its disc lands exactly where the point of light was
  bodyRadius(radius) {
    return radius * this.sizeScale
  }

  get _ctx() {
    return {
      width: this.width,
      height: this.height,
      scale: this.dprEff,
      orbitT: this.orbitT,
      orbitTPrev: this.orbitTPrev,
      pattern: this.pattern,
      patternPrev: this.patternPrev,
      t: this.t,
      dim: this.dim,
      sizeScale: this.sizeScale,
      psf: 0.95 * this.dprEff,
      gasSteps: this.budget.gasSteps,
      bbTex: this.bbTex,
      noiseTex: this.noiseTex,
      blueTex: this.blueTex,
      fullscreen: this.fullscreen,
      CAM,
      FOCAL,
      RPrev: this.RPrev,
      eyePrev: this.eyePrev,
      reduced: this.reduced,
      motionScale: this.motionScale,
      bandShift: this.bandShift,
    }
  }

  _render() {
    const gl = this.gl
    const ctx = this._ctx

    // 1 — the floor
    this.post.drawBackground(this.scene, ctx)

    // 2/3 — everything behind and inside the gas, additively
    this.scene.bind()
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    // `inFront` is the only thing that splits the star pass in two: it is which
    // side of the gas a population belongs on, and therefore whether the dust
    // is allowed to dim it.
    for (const g of this.starPass.groups) g.visible = g.enabled !== false && !g.inFront
    this.starPass.draw(this.cam, ctx)

    // 4 — the gas, marched at reduced resolution and composited as the second
    // half of the transfer integral: dst = emission + transmittance x dst
    if (this.gasPass.gain > 0.002 && this.budget.gasSteps > 0) {
      this.gasPass.render(this.gasTarget, this.cam, ctx)
      this.scene.bind()
      this.gasPass.composite(this.gasTarget)
      this.fullscreen.draw()
    }

    // 5 — what is in FRONT of the disk: near-field stars, your own stars, and
    // every event. Unattenuated, deliberately — your star staying findable
    // through a dust lane is the design, not an oversight.
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    for (const g of this.starPass.groups) g.visible = g.enabled !== false && !!g.inFront
    this.starPass.draw(this.cam, ctx)
    for (const g of this.starPass.groups) g.visible = g.enabled !== false
    this.fx.draw(this.cam, ctx)

    // 6 — the one opaque thing in the sky.
    // A star close enough to show a face is a SURFACE, and a surface has a
    // back: it has to occlude the field behind it, which nothing additive can
    // do. Drawn last of the light, so everything above is genuinely hidden by
    // it, and before the @ layer, so a handle still reads over its own star.
    this.body.detail = this.tier === 0 ? 1 : 0
    this.body.draw(ctx)

    // 7 — the @ layer
    this.sprites.draw(ctx)

    // 8 — the sensor
    this.post.run(this.scene, ctx)
    this.fx.reset()
    this.body.reset()
    this.sprites.reset()
  }
}

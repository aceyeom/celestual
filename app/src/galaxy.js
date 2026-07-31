// galaxy.js — the ambient sky. The cosmos the whole product lives inside.
//
// Rewritten on the shared WebGL2 engine in sky/. What used to be seventeen
// hundred lines of hand-rolled canvas compositing is now a POPULATION: this
// file says what lives in the ambient sky and what its events look like, and
// sky/engine.js draws it. Every line of camera, projection, nebula, governor
// and dive grammar that used to be duplicated between this file and
// communityGalaxy.js has moved there, once.
//
// What changed, visibly:
//
//   · a hundred and twenty thousand stars instead of eighteen hundred, orbiting
//     on real density-wave ellipses, and costing the main thread nothing
//   · every star's colour is its blackbody temperature and every star's
//     brightness is its luminosity over the square of its distance, so the
//     field's palette is demographics rather than decoration: an old gold
//     bulge, blue star-forming arms, a scatter of red giants
//   · the nebula is a volume you can fly through, not billboards you had to
//     dissolve before the camera reached them
//   · a dive goes ALL THE WAY IN. Past a certain closeness a star's true
//     angular diameter overtakes the instrument's point-spread and it stops
//     being a point of light: a photosphere, limb-darkened, granulating.
//   · the match is no longer two dots meeting on a flat overlay. It is a real
//     inspiral in the disk, ending in a binary.
//
// What deliberately did not change: the lens (CAM/FOCAL/TILT), the two stars,
// the cosmic-violet void, the send-off's meteor grammar, and every method
// signature App.jsx and ui.jsx call.

import { SkyEngine, clamp, lerp, linearOf } from './sky/engine.js'
import { smooth, easeOut, easeFlight } from './sky/camera.js'
import {
  genBulge, genDisk, genHalo, genDeepField, genNearField,
  writeStar, omegaAt, TILT_RATE, eccentricityAt, rng,
} from './sky/model.js'
import { tempToU } from './sky/blackbody.js'
import { Gestures } from './sky/gestures.js'
import { CATEGORY_TINTS } from './theme.js'
import { Galaxy2D } from './sky/fallback2d.js'

const TWO = Math.PI * 2
const VANISH_DUR = 0.62 // the wink-out when a ping is withdrawn

// the send-off, beat for beat — the same grammar as the community sky's launch
const COAL_DUR = 1.0 // the star forming under the DOM morph, before it flies
const METEOR_DUR = 1.25 // the streak from the morph point into the disk
const IGNITE_DUR = 0.6 // the landing glisten

// ── the match ────────────────────────────────────────────────────────────────
// The old reveal was a screen-space overlay that ignored the 3D field entirely:
// two dots sliding along arcs, a gradient line between them, ten motes, and a
// merge into ONE star. It was the least true thing in the product and the most
// important frame in it.
//
// This is what actually happens when two stars find each other, and it says the
// right thing. They fall into a decaying orbit around a barycenter neither of
// them is at. As they close, tides pull luminous matter off each one toward the
// other, so there is a bridge and the bridge is made of them. They touch, and
// the flash sends a light echo outward through the surrounding gas — a real
// expanding shell that lights the nebula from inside as it passes.
//
// And then they are a BINARY. Not one merged star: two, distinct, amber and
// rose, locked in a slow shared orbit that does not decay and does not end.
// A merge would have said one of them stopped existing.
const M_APPROACH = 4.4 // the inspiral
const M_FLASH = 0.55 // the touch
const M_ECHO = 3.4 // the light echo's sweep
const M_SEP0 = 0.34 // where they start, in world units
const M_SEP1 = 0.052 // the binary's settled separation

export class GalaxyField extends SkyEngine {
  constructor(canvas, opts = {}) {
    super(canvas, opts)
    // No WebGL2 at all (a very old in-app browser, a context the browser
    // refused, a driver blocklist): hand back a small canvas-2D field instead,
    // so the product still has a sky. Returning an object from a constructor
    // substitutes it for `this`, so every caller keeps its `new GalaxyField(...)`
    // and never has to know which one it got. Deliberately modest: the point is
    // that nothing is ever broken, not that the fallback competes.
    if (!this.ok) return new Galaxy2D(canvas, opts)

    this.mode = 'idle'
    this.modeT = 0
    this.origin = null // where the @ became a star (normalized screen coords)

    // ── the viewer's own stars ──
    // One per placed ping, resting in the disk. Slots carry a monotonic seed
    // that is never reused, so removing one from the middle leaves the others
    // exactly where they were and a later add can never land on a freed slot.
    this.sealed = []
    this.sealLabels = []
    this.sealKinds = []
    this.sealedScreen = []
    this._slotSeed = 0
    this.sealHue = null
    this.vanish = null

    // ── focus ──
    this.focusIndex = -1
    this.focusHold = false
    this.navEnabled = false
    this.holdDur = 1.9

    // ambient shooting stars — an occasional grace note in the deep sky, never
    // weather
    this.shoots = []
    this._shootAt = 3 + Math.random() * 4

    this.match = null

    this._build()
    this._bindHand()
    this.start()
  }

  // ── the population ────────────────────────────────────────────────────────
  _build() {
    const b = this.budget
    const gl = this.gl
    void gl
    const mobile = window.innerWidth < 540
    const n = Math.floor(b.stars * (mobile ? 0.62 : 1))

    // Proportions matter more than counts. A galaxy that is mostly disk with a
    // dense heart and a sparse halo reads instantly; get the ratio wrong and no
    // amount of stars will save it.
    this.gBulge = this.starPass.createGroup(genBulge(Math.floor(n * 0.19), { seed: 9011, radius: 0.29 }), {
      gain: 0.05, radiusScale: 0.00045, resolve: 0.35,
    })
    this.gDisk = this.starPass.createGroup(genDisk(Math.floor(n * 0.63), { seed: 9013, rDisk: 1.2, armFrac: 0.55 }), {
      gain: 0.125, radiusScale: 0.0006,
    })
    this.gHalo = this.starPass.createGroup(genHalo(Math.floor(n * 0.18), { seed: 9017, rMax: 2.8 }), {
      gain: 0.17, radiusScale: 0.0003, resolve: 0, pattern: 0,
    })
    // The deep field: the rest of the universe, well outside this galaxy. It
    // barely creeps while the disk streams past during a dive, and that
    // contrast is the entire reason camera travel reads as travel.
    this.gDeep = this.starPass.createGroup(genDeepField(b.deep, { seed: 9019, rMin: 3.4, rMax: 30 }), {
      gain: 0.8, radiusScale: 0.00012, twinkle: 0.8, motion: 0.55, resolve: 0, pattern: 0,
    })
    // The near field, drawn IN FRONT of the gas: loose stars between the camera
    // and the disk, whose fast sweep past the glass is what makes a dive feel
    // like flying rather than zooming.
    this.gNear = this.starPass.createGroup(genNearField(b.passers, { seed: 9023, extent: 2.5 }), {
      gain: 0.075, radiusScale: 0.00002, resolve: 0, nearFade: 0.55, pattern: 0,
    })
    this.gNear.inFront = true

    // the viewer's own stars, plus room for the match's two
    this.gHero = this.starPass.createHeroGroup(48)
    this.gHero.inFront = true
    this.gHero.radiusScale = 0.0026 // yours resolve into bodies sooner than the field

    this.frameRadius = 1.45
    this._layout()
    this._tuneGas()
    this._tunePost()
  }

  // The governor moved the budget: throw the whole field away and regenerate it
  // at the new density. Every generator is seeded, so the galaxy that comes back
  // is the same galaxy, and the hero group carries no state worth preserving —
  // it is refilled from `sealed` every single frame.
  _rebuild() {
    this.starPass.clear()
    this._build()
  }

  _tuneGas() {
    const g = this.gasPass
    g.diskR = 1.3
    g.diskH = 0.08
    g.arms = 2
    g.gain = 0.55
    g.dust = 1.0
    g.fill = 99
    g.forming = 0
    // The ramp is physics that happens to be the brand: warm scattered
    // starlight in the heart, H-alpha rose through the mid-disk (656 nm is why
    // every emission nebula you have seen a photograph of is pink), and the
    // cool violet-blue of reflection and doubly-ionised oxygen at the rim.
    g.warm = linearOf('#FFB37A', 1.0)
    g.mid = linearOf(this.them, 0.95)
    g.cool = linearOf('#6E7BD8', 0.9)
  }

  _tunePost() {
    const p = this.post
    p.bloomAmount = 0.42
    p.threshold = 1.15
    p.knee = 0.55
    p.vignette = 0.3
    p.exposure = 1
  }

  _paletteChanged() {
    this._tuneGas()
  }

  // ── the hand ──────────────────────────────────────────────────────────────
  // The ambient sky is a backdrop almost everywhere. It becomes steerable only
  // while a star view is held (setNavEnabled), which is when the viewer is
  // genuinely LOOKING at something rather than reading over it.
  _bindHand() {
    this.gest = new Gestures({
      getScale: () => this.cam.diveDist,
      onDrag: (dx, dy) => {
        this.cam.dragging = true
        this.cam.dragBy(dx * 0.0042, dy * 0.0032)
        this.start()
      },
      onRelease: () => this.cam.fling(),
      onPinch: (_, __, inv) => {
        this.cam.diveDist = clamp(inv, 0.35, 3.4)
        this.start()
      },
      onWheel: (dy) => {
        this.cam.diveDist = clamp(this.cam.diveDist * Math.exp(dy * 0.0014), 0.35, 3.4)
        this.start()
      },
    })
    this.gest.bind()
    this._pointerOwned = () => this.gest.owned
  }

  setNavEnabled(on) {
    this.navEnabled = !!on
    this.gest.enabled = !!on
    this.cam.orbitHome = !on
    if (!on) {
      this.gest.pts.clear()
      this.gest.mode = null
      this.cam.diveDist = 1
    }
    this.start()
  }

  // ── modes ─────────────────────────────────────────────────────────────────
  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    if (changed) this.modeT = 0
    if (mode === 'idle') this.dimTarget = data.dim != null ? data.dim : 1
    if (mode === 'sendoff') {
      this.dimTarget = 0.66
      if (data.origin) this.origin = data.origin
    }
    if (mode === 'resting') this.dimTarget = 0.45
    if (mode === 'match') {
      this.dimTarget = 0.26
      if (changed) this._startMatch()
    } else if (changed && this.match) {
      this.match = null
      this.post.flash = 0
      if (this.cam.dive) this.cam.releaseDive(0)
    }
    this.start()
  }

  // ── the viewer's stars ────────────────────────────────────────────────────
  // Placement is a golden-angle fan over growing orbits: each new star seats
  // further out and a third of a turn around, so a busy sky spreads instead of
  // collapsing into one overlapping clump the way three fixed rings did.
  _placeSlot(seed) {
    // seated OUT along the disk, clear of the bulge: a star of yours resting
    // inside the core's blaze can never be picked out of it
    const a = clamp(0.58 + 0.088 * Math.sqrt(seed), 0.58, 1.5)
    const b = a * eccentricityAt(a, 0.18, 1.2)
    return {
      seed,
      a,
      b,
      phi0: seed * 2.39996323, // the golden angle
      omega: omegaAt(a),
      theta0: TILT_RATE * a,
      y: (seed % 2 ? 1 : -1) * (0.03 + (seed % 3) * 0.012),
      phase: seed * 1.7, // desynced breathing
    }
  }

  setSeals(n) {
    while (this.sealed.length < n) this.sealed.push(this._placeSlot(this._slotSeed++))
    if (this.sealed.length > n) this.sealed.length = Math.max(0, n)
    this.start()
  }
  setSealLabels(labels) {
    this.sealLabels = labels || []
    this.start()
  }
  setSealKinds(kinds) {
    this.sealKinds = kinds || []
    this.start()
  }
  setSealColor(hex) {
    this.sealHue = hex || null
    this.start()
  }
  removeSealAt(i) {
    if (i == null || i < 0 || i >= this.sealed.length) return
    this.sealed.splice(i, 1)
    this.sealedScreen.splice(i, 1)
    if (this.vanish) {
      if (this.vanish.i === i) this.vanish = null
      else if (this.vanish.i > i) this.vanish.i--
    }
    if (this.focusIndex === i) this.clearFocus()
    else if (this.focusIndex > i) this.focusIndex--
    this.start()
  }
  vanishStar(i) {
    if (i == null || i < 0) return
    this.vanish = { i, t: 0 }
    this.start()
  }

  // where a sealed star is in the world, right now
  _sealedWorld(s, out) {
    const phi = s.phi0 + s.omega * this.orbitT
    const th = s.theta0 + this.pattern
    const ex = s.a * Math.cos(phi)
    const ez = s.b * Math.sin(phi)
    const ct = Math.cos(th), st = Math.sin(th)
    out = out || {}
    out.x = ex * ct - ez * st
    out.z = ex * st + ez * ct
    out.y = s.y
    return out
  }

  // ── focus ─────────────────────────────────────────────────────────────────
  focusStar(i, opts = {}) {
    if (i == null || i < 0 || i >= this.sealed.length) return this.clearFocus()
    this.focusIndex = i
    this.focusHold = !!opts.hold
    const s = this.sealed[i]
    this.cam.startDive(() => this._sealedWorld(s), { hold: !!opts.hold })
    this.start()
  }
  clearFocus() {
    this.focusHold = false
    if (this.cam.dive) this.cam.releaseDive(0)
    else this.focusIndex = -1
    this.start()
  }

  // Which sealed star is under a screen point. Generous by design: a resting
  // star is a small thing and a thumb is not.
  hitTest(clientX, clientY, radius = 56) {
    const arr = this.sealedScreen || []
    let best = -1
    let bestD = radius * radius
    for (let i = 0; i < arr.length; i++) {
      const ps = arr[i]
      if (!ps || !ps.vis) continue
      const dx = ps.x - clientX
      const dy = ps.y - clientY
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  // ── the frame ─────────────────────────────────────────────────────────────
  _frame(dt) {
    this.modeT += dt
    if (this.vanish) {
      this.vanish.t += dt
      if (this.vanish.t >= VANISH_DUR) this.vanish = null
    }
    if (!this.cam.dive && this.focusIndex >= 0 && this.cam.focus <= 0.001) this.focusIndex = -1

    // the gas brightens a little as the camera closes on the disk, the way real
    // gas does when you are inside it rather than looking at it
    this.gasPass.gain = 0.55 * (1 - this.cam.focus * 0.35) * (this.mode === 'match' ? 0.5 : 1)

    if (this.mode === 'match') this._frameMatch(dt)
    else this._frameSealed(dt)

    if (this.mode === 'sendoff') this._frameSendoff(dt)
    this._frameShoots(dt)
  }

  // ── the resting set ───────────────────────────────────────────────────────
  _frameSealed(dt) {
    void dt
    const hero = this.gHero
    hero.count = 0
    this.sealedScreen.length = this.sealed.length
    const flying = this.mode === 'sendoff' && this.modeT < COAL_DUR + METEOR_DUR
    const n = this.sealed.length
    const you = linearOf(this.sealHue || this.you)
    const pr = {}

    for (let i = 0; i < n; i++) {
      const s = this.sealed[i]
      // the newest star's position belongs to the send-off this frame
      if (flying && i === n - 1) continue
      const w = this._sealedWorld(s, pr)
      const scr = this.cam.project(w.x, w.y, w.z)
      this.sealedScreen[i] = scr ? { x: scr.sx, y: scr.sy, vis: true } : { x: 0, y: 0, vis: false }

      const isFocus = this.focusIndex === i && this.cam.focus > 0.001
      const f = isFocus ? this.cam.focus : 0
      // during a dive everything but the hero melts back into the depth
      const fade = this.cam.focus > 0.001 && !isFocus ? 1 - 0.86 * this.cam.focus : 1
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.9 + s.phase)
      const tint = CATEGORY_TINTS[this.sealKinds[i]] || this.sealHue || this.you
      const tcol = linearOf(tint)
      let gain = (4.6 + pulse * 1.1) * fade * (1 + f * 2.4)

      // the withdrawal: the halo blooms outward as the core contracts to a
      // point and winks out, and then React drops it
      if (this.vanish && this.vanish.i === i) {
        const vp = clamp(this.vanish.t / VANISH_DUR, 0, 1)
        const fadeV = 1 - vp
        gain *= fadeV * fadeV
        this.fx.world(w.x, w.y, w.z, 0.1 + vp * 0.55, linearOf(tint), 2.2 * fadeV, 0)
        this.sealedScreen[i] = { x: scr ? scr.sx : 0, y: scr ? scr.sy : 0, vis: false }
      }
      this._pushHero(hero, s, tint, gain, 0.8 + f * 0.4, f)
      // The dressing, in the sky's own light: the category's halo around it, a
      // warm-white bloom seating the core in that halo, and the product's own
      // four-point glisten resting on top. All three are additive HDR, so they
      // bloom through the same optics as every other star and can never read as
      // a sticker laid over the field.
      if (fade > 0.05) {
        const near = 1 + f * 2.2
        // Sizes are WORLD units, and at the resting camera one world unit is
        // only ~180 pixels — so a halo that reads as generous here is a much
        // bigger number than screen-space intuition suggests.
        this.fx.world(w.x, w.y, w.z, (0.115 + pulse * 0.02) * near, tcol, (1.15 + pulse * 0.4) * fade, 0)
        this.fx.world(w.x, w.y, w.z, (0.048 + pulse * 0.008) * near, you, (1.5 + pulse * 0.5) * fade, 0)
        this.fx.world(w.x, w.y, w.z, (0.235 + pulse * 0.04) * near, tcol, (0.7 + pulse * 0.28) * fade, 2)
      }
    }
  }

  // one of the viewer's stars, written into the hero instance buffer
  _pushHero(hero, s, tintHex, gain, spike, discBias) {
    if (hero.count >= hero.capacity) return
    const i = hero.count++
    // A hero star is a real star: a hot white-gold photosphere that will resolve
    // into a body if you fly close enough, wearing its category light as a halo.
    writeStar(hero.star, i, s.a, s.b, s.phi0, s.omega, s.theta0, s.y, tempToU(7400), 4.2)
    const t = linearOf(tintHex)
    const o = i * 4
    hero.tint[o] = t[0]
    hero.tint[o + 1] = t[1]
    hero.tint[o + 2] = t[2]
    hero.tint[o + 3] = gain
    hero.fx[o] = spike
    hero.fx[o + 1] = discBias
    hero.fx[o + 2] = 0
    hero.fx[o + 3] = 1
  }

  // a free-floating hero star that is not on a slot (the match's two)
  _pushHeroAt(hero, x, y, z, tintHex, gain, spike, temp = 7000, lum = 5) {
    if (hero.count >= hero.capacity) return
    const i = hero.count++
    const r = Math.hypot(x, z) || 1e-5
    writeStar(hero.star, i, r, r, Math.atan2(z, x) - this.pattern, 0, 0, y, tempToU(temp), lum)
    const t = linearOf(tintHex)
    const o = i * 4
    hero.tint[o] = t[0]
    hero.tint[o + 1] = t[1]
    hero.tint[o + 2] = t[2]
    hero.tint[o + 3] = gain
    hero.fx[o] = spike
    hero.fx[o + 1] = 0.4
    hero.fx[o + 2] = 0
    hero.fx[o + 3] = 1
  }

  // ── the send-off ──────────────────────────────────────────────────────────
  // The @ became a star under the DOM morph; now that star coalesces at exactly
  // that point on the glass, streaks across real sky into its slot, and ignites.
  // Unchanged in shape from the canvas engine — the grammar was right — but the
  // trail is now light in the same HDR buffer as everything else, so it blooms
  // through the same optics as the stars it is flying between.
  _frameSendoff() {
    const n = this.sealed.length
    const s = this.sealed[n - 1]
    if (!s) return
    const tt = this.modeT
    const tint = CATEGORY_TINTS[this.sealKinds[n - 1]] || this.sealHue || this.you
    const col = linearOf(tint)
    const white = [1, 0.96, 0.9]
    const ox = this.origin ? this.origin.x * this.w : this.w / 2
    const oy = this.origin ? this.origin.y * this.h : this.h * 0.43
    const w = this._sealedWorld(s)
    const scr = this.cam.project(w.x, w.y, w.z)
    const tx = scr ? scr.sx : this.w / 2
    const ty = scr ? scr.sy : this.h * 0.44

    if (tt < COAL_DUR) {
      // phase 1 — gathering. Long enough to sit under the DOM morph's own
      // collapse, so the handoff when the overlay dissolves is seamless.
      const fc = smooth(tt / COAL_DUR)
      this.fx.screen(ox, oy, 90 * (1 - fc) + 26, col, 1.2 * fc, 0)
      this.fx.screen(ox, oy, 26 + fc * 42, white, 0.5 + 2.4 * fc, 2)
      this.fx.screen(ox, oy, 5 + fc * 3, white, 6 * fc, 0)
      this.sealedScreen[n - 1] = { x: ox, y: oy, vis: true }
      return
    }
    if (tt < COAL_DUR + METEOR_DUR) {
      // phase 2 — the meteor: an eased, gently bowed streak into the live-
      // projected slot, its trail thinning to nothing behind a hot head
      const e = easeFlight(clamp((tt - COAL_DUR) / METEOR_DUR, 0, 1))
      const dx = tx - ox, dy = ty - oy
      const mx = (ox + tx) / 2 - dy * 0.14
      const my = (oy + ty) / 2 + dx * 0.14
      const at = (u) => [
        (1 - u) * (1 - u) * ox + 2 * (1 - u) * u * mx + u * u * tx,
        (1 - u) * (1 - u) * oy + 2 * (1 - u) * u * my + u * u * ty,
      ]
      const [hx, hy] = at(e)
      const TAIL = 16
      for (let k = 1; k <= TAIL; k++) {
        const u = Math.max(0, e - (k / TAIL) * 0.22)
        const [px, py] = at(u)
        const q = 1 - k / TAIL
        this.fx.screen(px, py, 3 + q * 9, k < 4 ? white : col, q * q * 2.6, 0)
      }
      this.fx.screen(hx, hy, 34, col, 2.2, 0)
      this.fx.screen(hx, hy, 7, white, 9, 0)
      this.sealedScreen[n - 1] = { x: hx, y: hy, vis: true }
      return
    }
    // phase 3 — the landing glisten, handing off to the resting star
    const q = (tt - COAL_DUR - METEOR_DUR) / IGNITE_DUR
    if (q >= 1 || !scr) return
    const bell = Math.sin(Math.PI * clamp(q, 0, 1))
    this.fx.world(w.x, w.y, w.z, 0.22 + bell * 0.5, white, bell * 3.4, 2)
    this.fx.world(w.x, w.y, w.z, 0.1 + bell * 0.26, col, bell * 2.4, 0)
  }

  // ── ambient shooting stars ────────────────────────────────────────────────
  // A slim streak crossing a corner of the deep sky every few seconds. Only
  // while the field is at rest — never over a dive, a send-off or the match —
  // and never more than one at a time. A grace note, not weather.
  _frameShoots(dt) {
    if (this.reduced) return
    this._shootAt -= dt
    if (this._shootAt <= 0) {
      this._shootAt = 4 + Math.random() * 5
      const calm = (this.mode === 'idle' || this.mode === 'resting') && this.cam.focus < 0.2 && this.dim > 0.3
      if (calm && !this.shoots.length) {
        const m = Math.min(this.w, this.h)
        const len = m * (0.2 + Math.random() * 0.16)
        const th = 0.1 + Math.random() * 0.55
        const sgn = Math.random() < 0.5 ? -1 : 1
        this.shoots.push({
          x0: (0.1 + Math.random() * 0.8) * this.w,
          y0: (0.06 + Math.random() * 0.5) * this.h,
          dx: Math.cos(th) * len * sgn,
          dy: Math.sin(th) * len,
          tail: m * (0.07 + Math.random() * 0.05),
          dur: 0.85 + Math.random() * 0.5,
          t: 0,
          // a meteor's colour is the metal it is burning — sodium yellow,
          // magnesium blue-white, iron orange. A real detail, cheaply had.
          hue: Math.random() < 0.3 ? '#9FD8FF' : Math.random() < 0.5 ? '#FFE7B8' : '#FFF6EC',
        })
      }
    }
    if (!this.shoots.length) return
    const dist = (s) => Math.hypot(s.dx, s.dy)
    this.shoots = this.shoots.filter((s) => {
      s.t += dt
      const p = s.t / s.dur
      if (p >= 1) return false
      const e = 1 - Math.pow(1 - p, 2.1)
      const hx = s.x0 + s.dx * e
      const hy = s.y0 + s.dy * e
      const bell = Math.sin(Math.PI * p)
      const col = linearOf(s.hue)
      const d = dist(s) || 1
      const nx = s.dx / d, ny = s.dy / d
      const tail = s.tail * (0.35 + 0.65 * bell)
      for (let k = 1; k <= 10; k++) {
        const q = 1 - k / 10
        this.fx.screen(hx - nx * tail * (k / 10), hy - ny * tail * (k / 10), 2 + q * 5, col, q * q * bell * 1.6 * this.dim, 0)
      }
      this.fx.screen(hx, hy, 9, [1, 0.98, 0.95], bell * 4 * this.dim, 0)
      return true
    })
  }

  // ── THE MATCH ─────────────────────────────────────────────────────────────
  _startMatch() {
    // Stage it somewhere real: a spot in the disk, out along an arm, far enough
    // from the core that the two stars have dark sky behind them. The camera
    // flies there — this happens IN the galaxy, not on a pane in front of it.
    const rnd = rng(0x51ce)
    const a = 0.98
    const th = TILT_RATE * a + rnd() * 0.4
    const cx = Math.cos(th) * a
    const cz = Math.sin(th) * a
    this.match = {
      t: 0,
      cx,
      cy: 0.012,
      cz,
      // the orbit's own plane, tipped a little out of the disk so the pair
      // never reads as two dots sliding along a line
      tip: 0.42,
      ang: rnd() * TWO,
      echo: [],
      motes: null,
    }
    this.post.flash = 0
    // A dive that stops well short: the whole point of this frame is that there
    // are TWO of them, so the camera has to arrive far enough out to hold both.
    this.cam.startDive(() => ({ x: cx, y: 0.012, z: cz }), { hold: true, standoff: 0.20 })
  }

  _frameMatch(dt) {
    const m = this.match
    if (!m) return
    m.t += dt
    const hero = this.gHero
    hero.count = 0
    const you = this.you
    const them = this.them
    const white = [1, 0.97, 0.93]
    const cyou = linearOf(you)
    const cthem = linearOf(them)

    const t = m.t
    const p = clamp(t / M_APPROACH, 0, 1)

    // ── the inspiral ────────────────────────────────────────────────────────
    // Separation decays, and — this is the part that makes it read as physics
    // rather than as animation — the angular speed rises as the pair closes,
    // because Kepler's third law says it must. The dance quickens on its own.
    const sep = lerp(M_SEP0, M_SEP1, easeOut(p))
    const kepler = Math.pow(M_SEP0 / Math.max(sep, 1e-4), 1.5)
    m.ang += dt * 0.55 * kepler * (t < M_APPROACH ? 1 : 0.16)

    const ca = Math.cos(m.ang), sa = Math.sin(m.ang)
    const tip = m.tip
    // the two stars, on opposite sides of a barycenter neither of them is at
    const ax = m.cx + ca * sep * 0.5
    const az = m.cz + sa * sep * 0.5 * Math.cos(tip)
    const ay = m.cy + sa * sep * 0.5 * Math.sin(tip)
    const bx = m.cx - ca * sep * 0.5
    const bz = m.cz - sa * sep * 0.5 * Math.cos(tip)
    const by = m.cy - sa * sep * 0.5 * Math.sin(tip)

    const merged = t > M_APPROACH
    const flashP = clamp((t - M_APPROACH) / M_FLASH, 0, 1)

    // ── the tidal bridge ────────────────────────────────────────────────────
    // As they close, each star pulls luminous matter off the other. The bridge
    // between them is not a drawn line: it is made of them, and it brightens as
    // the tide strengthens, which goes as the inverse cube of separation.
    const tide = clamp(Math.pow(M_SEP0 / Math.max(sep, 1e-4), 3) * 0.02, 0, 1) * (merged ? 1 - flashP : 1)
    if (tide > 0.01) {
      const N = 26
      for (let i = 1; i < N; i++) {
        const u = i / N
        // the stream bows outward, the way tidal tails actually do
        const bow = Math.sin(u * Math.PI) * sep * 0.16
        const x = lerp(ax, bx, u) - sa * bow
        const z = lerp(az, bz, u) + ca * bow
        const y = lerp(ay, by, u)
        const c = u < 0.5 ? cyou : cthem
        const w = Math.sin(u * Math.PI)
        this.fx.world(x, y, z, 0.006 + w * 0.012, c, tide * w * 2.6, 0)
      }
    }

    // ── the two ─────────────────────────────────────────────────────────────
    if (!merged || flashP < 1) {
      const flare = merged ? 1 + flashP * 26 : 1 + (1 - p) * 0.2
      this._pushHeroAt(hero, ax, ay, az, you, 5.5 * flare, 0.95, 7600, 9)
      this._pushHeroAt(hero, bx, by, bz, them, 5.5 * flare, 0.95, 6900, 9)
    }

    // ── the touch ───────────────────────────────────────────────────────────
    if (merged && flashP < 1) {
      const bell = Math.sin(Math.PI * flashP)
      // The whole sky lifts for an instant. Added in linear light BEFORE the
      // tonemap, so ACES rolls it off its shoulder the way a real sensor rolls
      // off a real flash — and kept small, because this frame has to stay
      // readable. A match is the brightest moment in the product; it is not
      // supposed to be a white screen.
      this.post.flash = bell * 0.42
      this.post.flashColor = [1, 0.88, 0.78]
      this.fx.world(m.cx, m.cy, m.cz, 0.03 + bell * 0.16, white, bell * 9, 0)
      this.fx.world(m.cx, m.cy, m.cz, 0.04 + bell * 0.3, white, bell * 4, 2)
      if (!m.echo.length && flashP > 0.3) m.echo.push({ t: 0 })
    } else if (merged) {
      this.post.flash = Math.max(0, this.post.flash - dt * 2.4)
    }

    // ── the light echo ──────────────────────────────────────────────────────
    // A real astronomical phenomenon, and the most beautiful thing this reveal
    // could possibly do: the flash's light travels outward and lights the gas it
    // passes through, so for a few seconds you watch the nebula around them
    // illuminate from the inside, in a ring, expanding.
    for (const e of m.echo) {
      e.t += dt
      const q = e.t / M_ECHO
      if (q >= 1) continue
      const R = easeOut(q) * 1.15
      const bright = Math.pow(1 - q, 1.6) * (1 - Math.exp(-q * 9))
      const N = this.tier >= 2 ? 34 : 64
      for (let i = 0; i < N; i++) {
        const a2 = (i / N) * TWO
        const x = m.cx + Math.cos(a2) * R
        const z = m.cz + Math.sin(a2) * R
        // the shell is spherical, so it rises out of the disk plane too
        const yy = m.cy + Math.sin(a2 * 3.1 + q * 2) * R * 0.11
        this.fx.world(x, yy, z, 0.016 + R * 0.05, [1, 0.86, 0.78], bright * 1.5, 0)
      }
      // and the gas genuinely brightens as the front sweeps it
      this.gasPass.gain = 0.55 + bright * 0.9
    }

    // ── the binary ──────────────────────────────────────────────────────────
    // What they become. Two stars, distinct, orbiting a shared centre at a
    // separation that no longer decays — a stable system, not a merger. The old
    // reveal collapsed them into ONE point of light, which said that one of them
    // stopped existing.
    if (merged && flashP >= 1) {
      const settle = smooth(clamp((t - M_APPROACH - M_FLASH) / 2.2, 0, 1))
      const breathe = 1 + 0.06 * Math.sin(t * 0.9)
      const g = (4.2 + settle * 2.6) * breathe
      this._pushHeroAt(hero, ax, ay, az, you, g, 1.0, 7600, 10)
      this._pushHeroAt(hero, bx, by, bz, them, g, 1.0, 6900, 10)
      // the shared envelope — gas the pair has drawn around itself, lit from
      // both sides at once
      const N = 18
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1)
        const x = lerp(ax, bx, u)
        const z = lerp(az, bz, u)
        const y = lerp(ay, by, u)
        const w2 = Math.sin(u * Math.PI)
        const c = [lerp(cyou[0], cthem[0], u), lerp(cyou[1], cthem[1], u), lerp(cyou[2], cthem[2], u)]
        this.fx.world(x, y, z, 0.03 + w2 * 0.05, c, settle * w2 * 0.85, 0)
      }
    }
  }
}

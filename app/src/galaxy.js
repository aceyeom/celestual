// galaxy.js — a real 3D perspective-projected particle galaxy for CELESTUAL.
// Stars live in 3D coordinates, spin around the galactic axis, and are projected
// through a perspective camera that the viewer can subtly steer with the pointer
// (or device tilt) — so the field has genuine depth and parallax, not a flat 2D
// swirl. Dependency-free (hand-rolled canvas math, no three.js).
//
// The field is built from layered populations so it dissolves into space instead
// of reading as one contained shape: a bright spheroidal core bulge, an
// exponential-falloff disk whose feathered spiral arms have no hard rim, scattered
// inter-arm + halo stars, soft drifting nebula gas, and a full-frame deep
// background starfield behind everything.
//
// Modes: 'idle' (slow orbit), 'sendoff' (your star coalesces where the @ became a
//        star, then drifts into its place), 'resting' (the stacked set rests in
//        the disk), 'match' (two stars drift together into a calm glowing binary).
// The star sprites — the shared instrument both skies draw their light with
// (see starSprites.js): an Airy-style point source with hairline rays for every
// star, the full tapered diffraction burst for the bright ones.
import { hexToRgb, makeGlow, makeStarSprite, makeSpikeSprite } from './starSprites.js'
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const smooth = (p) => p * p * (3 - 2 * p)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t

// Stellar palette — warm gold core, cream body, cool young arms, rare red giant.
const PAL = {
  gold: '#F6DCA9',
  cream: '#EFEAF2',
  warm: '#F4C9A1',
  blue: '#BFD3FA',
  ice: '#A7C2FF',
  red: '#F3A98A',
}

// camera / projection
const VANISH_DUR = 0.55 // seconds — the star's wink-out when withdrawn
// The cinematic fly-into-a-star focus is time-driven (not an exponential chase),
// so it has a fixed, deliberate length: a longer, graceful push IN and a slightly
// quicker — but equally smooth — pull back OUT.
const FOCUS_IN = 1.45 // seconds — camera glide into the tapped star
const FOCUS_OUT = 0.9 // seconds — camera drift back out to the resting sky
const CAM = 2.7 // camera distance from galactic center
const FOCAL = 2.35 // focal length (bigger = flatter / less perspective)
const TILT = 1.04 // base disk tilt toward the camera (rad)
// How close the camera comes to rest in FRONT of the focused star (camera-space z
// at full focus). Small = a deep, dramatic arrival that fills the frame; bounded
// well above the near plane so the hero never blows past into bare pixels.
const STANDOFF = 0.26
const TWO = Math.PI * 2

export class GalaxyField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.opts = opts
    // Fallbacks mirror theme.js TOKENS (App always passes the live palette; these
    // only exist so a bare `new GalaxyField(canvas)` still draws on-palette).
    this.you = opts.you || '#FF9E6B'
    this.them = opts.them || '#E6749E'
    this.motion = opts.motion != null ? opts.motion : 20
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Honor prefers-reduced-motion (§5.3): keep the starfield as a calm, near-
    // static window into space instead of a continuously swirling animation.
    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    this.spin = 0
    this.t = 0
    this.mode = 'idle'
    this.modeT = 0
    this.lastTs = 0
    this.dim = 1
    this.dimTarget = 1
    this.running = false
    // pointer / tilt parallax — target vs. smoothed current
    this.pTarget = { x: 0, y: 0 }
    this.p = { x: 0, y: 0 }
    this.glows = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), warm: makeGlow('#FFE0C2', 64), white: makeGlow('#FFFFFF', 64), seal: makeGlow(this.you, 64) }
    // Nova seal style: the light the person's OWN sealed stars burn with. Null
    // means "follow the `you` palette"; set via setSealColor().
    this.sealHue = null
    this._glowCache = {}
    this._dotCache = {} // hue -> round star sprite
    this._spike = makeSpikeSprite('#FFFFFF', 64) // shared diffraction cross (white, tinted via alpha)
    // Soft round sprites cost more per star than the old square quads, so the
    // field is a touch leaner — it reads denser now (each star carries a glow), so
    // fewer points still fill the frame.
    const count = opts.count || (window.innerWidth < 540 ? 1150 : 1800)
    this._gen(count)
    this._genPassers()
    this.trail = []
    this.motes = null
    // where the @ became a star (normalized 0..1 screen coords) — the send-off
    // drift starts here so it continues straight out of the DOM morph.
    this.origin = null
    // live screen positions of every resting star, so a subtle DOM tag can
    // follow each one. [{ x, y, vis }, …], aligned with `sealed` by index.
    this.sealedScreen = []
    // Each sealed person becomes a persistent star resting in the disk; the set
    // stacks across the session so "more people → more stars". Slots carry a
    // monotonic placement seed (never reused) so removing one from the middle
    // leaves the others exactly where they were and never collides a later add.
    this.sealed = []
    this._slotSeed = 0
    // The @ each sealed star holds (device-held plaintext, aligned by index) —
    // drawn over the star at a focus dive's arrival, never at rest.
    this.sealLabels = []
    // Camera focus on a single star (the interactive resting field): the camera
    // physically flies THROUGH the field toward sealed[focusIndex] — neighbours
    // stream past with real depth parallax and the hero swells as we close on it.
    this.focus = 0 // eased 0..1 (the value the camera transform reads)
    this.focusP = 0 // linear focus progress 0..1; `focus` is its ease-in-out
    this.focusTarget = 0
    this.focusIndex = -1
    // A held focus doesn't glide back on its own: the viewer stays with the
    // star (free to orbit around it) until clearFocus() — the pings screen's
    // star view. While held, the canvas skips its own @ label; the DOM overlay
    // owns the star's name and intent line.
    this.focusHold = false
    // The hand-driven camera, live only while a star view is held (or a caller
    // flips setNavEnabled): drag orbits the whole sky around the focus point,
    // pinch/wheel dollies closer or further (a multiplier on the standoff).
    this.navEnabled = false
    this.orbit = { yaw: 0, pitch: 0 }
    this.viewDist = 1
    this._nav = { pts: new Map(), mode: null, lx: 0, ly: 0, dist0: 1, dist1: 1 }
    // Live camera offset in view-aligned world space, folded into the perspective
    // projection so the WHOLE field (stars, dust, nebula, core) flies past as one.
    // (0,0,0) is the resting camera; during focus it travels laterally to frame the
    // star and forward (camZ) to dive in. Smoothed toward its target every frame so
    // a tap/re-tap eases rather than snaps.
    this.cam = { x: 0, y: 0, z: 0 }
    // A star being withdrawn plays a brief implosion-then-fade in place before
    // the React layer drops it from the set: { i, t }.
    this.vanish = null
    // Bind the frame callback ONCE (the loop used to allocate a fresh bound
    // function every frame — needless GC churn at 60fps).
    this._boundTick = (ts) => this._tick(ts)
    this._bind()
    this.resize()
  }

  // Tinted glow texture cache so arm/bulge glow stars can each carry their own hue.
  _glowFor(hex) {
    if (!this._glowCache[hex]) this._glowCache[hex] = makeGlow(hex, 64)
    return this._glowCache[hex]
  }
  // Round star sprite cache (one per hue) — the anti-aliased point of light that
  // replaces the old square quads.
  _dotFor(hex) {
    if (!this._dotCache[hex]) this._dotCache[hex] = makeStarSprite(hex, 32)
    return this._dotCache[hex]
  }

  _gen(n) {
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    // cheap approx-normal in ~[-1,1]
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

    this.stars = []
    const push = (px, py, pz, r, base, hue, glow) => {
      this.stars.push({
        px,
        py,
        pz,
        r,
        rad: glow ? 1.1 + rnd() * 1.3 : 0.45 + rnd() * 0.85,
        base,
        hue,
        glow,
        tw: rnd() * TWO,
        tws: glow ? 0.5 + rnd() : 0.15 + rnd() * 0.5,
      })
    }

    // 1 · BULGE — bright, dense, slightly-flattened spheroid at the core.
    const nb = Math.floor(n * 0.2)
    for (let i = 0; i < nb; i++) {
      const rr = Math.pow(rnd(), 1.9) * 0.3
      const u = rnd() * TWO
      const v = rnd() * 2 - 1
      const ringr = Math.sqrt(1 - v * v)
      const cr = rnd()
      const hue = cr < 0.6 ? PAL.gold : cr < 0.85 ? PAL.warm : PAL.cream
      push(rr * ringr * Math.cos(u), rr * v * 0.7, rr * ringr * Math.sin(u), rr, 0.5 + rnd() * 0.5, hue, rnd() < 0.1)
    }

    // 2 · DISK — exponential radial falloff (no hard edge) on two feathered
    // spiral arms, with a chunk of inter-arm field stars so it never reads as two
    // painted stripes. Arms widen and bluen outward; the plane is thin.
    const ARMS = 2
    const TWIST = 2.6
    const nd = Math.floor(n * 0.62)
    for (let i = 0; i < nd; i++) {
      let r = -0.34 * Math.log(1 - rnd() * 0.992) // exponential disk
      if (r > 1.9) r = 1.9 - rnd() * 0.3 // fold the rare long tail back in
      const onArm = rnd() < 0.7
      let ang
      if (onArm) {
        const arm = Math.floor(rnd() * ARMS)
        ang = arm * (TWO / ARMS) + r * TWIST + gauss() * (0.17 + r * 0.16)
      } else {
        ang = rnd() * TWO
      }
      const thick = 0.018 + 0.05 * Math.exp(-r * 2.2) // thin disk, fatter inward
      const cr = rnd()
      let hue
      if (r < 0.35) hue = cr < 0.5 ? PAL.gold : PAL.cream
      else if (r < 0.9) hue = cr < 0.16 ? PAL.warm : cr < 0.82 ? PAL.cream : PAL.blue
      else hue = cr < 0.5 ? PAL.blue : cr < 0.6 ? PAL.ice : PAL.cream
      if (cr > 0.986) hue = PAL.red
      const base = (0.3 + rnd() * 0.5) * (onArm ? 1 : 0.68) * (1 - r * 0.16)
      push(Math.cos(ang) * r, gauss() * thick, Math.sin(ang) * r, r, base, hue, rnd() < 0.045)
    }

    // 3 · HALO — sparse faint stars in a big flattened spheroid. Fills the space
    // around the disk so the galaxy bleeds into the void instead of being cut out.
    const nh = n - this.stars.length
    for (let i = 0; i < nh; i++) {
      const rr = 0.5 + Math.pow(rnd(), 0.6) * 1.9
      const u = rnd() * TWO
      const v = rnd() * 2 - 1
      const ringr = Math.sqrt(1 - v * v)
      push(rr * ringr * Math.cos(u), rr * v * 0.45, rr * ringr * Math.sin(u), rr, 0.1 + rnd() * 0.17, rnd() < 0.3 ? PAL.blue : PAL.cream, false)
    }

    // Foreground dust — large volume, strong near-field parallax (kept, softened).
    this.dust = []
    const dn = Math.floor(n * 0.22)
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        px: (rnd() - 0.5) * 4.4,
        py: (rnd() - 0.5) * 2.8,
        pz: (rnd() - 0.5) * 4.4,
        rad: 0.4 + rnd() * 0.9,
        base: 0.06 + rnd() * 0.22,
        tw: rnd() * TWO,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }

    // Nebula — soft colored gas clouds living in the disk; depth + space vibe.
    this.nebula = []
    const NCOL = [PAL.blue, '#7E6BA8', '#C77E8A', PAL.warm, '#5E7BB0']
    for (let i = 0; i < 13; i++) {
      const r = 0.2 + rnd() * 1.05
      const a = rnd() * TWO
      this.nebula.push({
        px: Math.cos(a) * r,
        py: gauss() * 0.12,
        pz: Math.sin(a) * r,
        rad: 0.34 + rnd() * 0.55,
        col: NCOL[Math.floor(rnd() * NCOL.length)],
        a: 0.045 + rnd() * 0.06,
        tw: rnd() * TWO,
        tws: 0.05 + rnd() * 0.12,
      })
    }

    // Deep background starfield — screen-space, fills the whole frame so the scene
    // reads as a window into space, not a shape on black. Subtle parallax + twinkle.
    this.bg = []
    const bn = window.innerWidth < 540 ? 200 : 340
    for (let i = 0; i < bn; i++) {
      this.bg.push({
        x: rnd(),
        y: rnd(),
        z: 0.3 + rnd() * 0.7, // parallax depth (smaller = nearer = moves more)
        rad: rnd() < 0.92 ? 0.5 + rnd() * 0.7 : 1.0 + rnd() * 0.9,
        base: 0.12 + rnd() * 0.5,
        hue: rnd() < 0.15 ? PAL.blue : rnd() < 0.2 ? PAL.warm : '#FFFFFF',
        tw: rnd() * TWO,
        tws: 0.15 + rnd() * 0.7,
      })
    }
  }

  // The near-field passers — loose stars drifting between the camera and the
  // disk. At rest they're a whisper; the moment the camera travels (a dive, a
  // held orbit, a pinch) they sweep past with real parallax, streaking like the
  // window of a ship — close ones fast and bright, far ones slow and faint.
  _genPassers() {
    let s = 51733
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    this.passers = []
    const n = window.innerWidth < 540 ? 30 : 44
    for (let i = 0; i < n; i++) {
      this.passers.push({
        px: (rnd() - 0.5) * 4.6,
        py: (rnd() - 0.5) * 3.0,
        pz: (rnd() - 0.5) * 4.6,
        // a slow autonomous drift, so a few are always passing by
        vx: (rnd() - 0.5) * 0.05,
        vy: (rnd() - 0.5) * 0.02,
        vz: (rnd() - 0.5) * 0.05,
        rad: 0.5 + rnd() * 1.1,
        base: 0.1 + rnd() * 0.3,
        hue: rnd() < 0.2 ? PAL.blue : rnd() < 0.28 ? PAL.warm : '#FFFFFF',
        lx: null,
        ly: null,
      })
    }
  }

  _bind() {
    this._onResize = () => this.resize()
    this._onPointer = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      this.pTarget.x = clamp(x, -1, 1)
      this.pTarget.y = clamp(y, -1, 1)
    }
    this._onTilt = (e) => {
      if (e.gamma == null && e.beta == null) return
      const nx = clamp((e.gamma || 0) / 35, -1, 1)
      const ny = clamp(((e.beta || 0) - 45) / 35, -1, 1)
      // Raw device-orientation is noisy — fed straight in, hand-held sensor jitter
      // made the whole field tremble (the other half of the IG-webview "vibration").
      // Apply a small dead-zone, then low-pass toward the new reading so only real
      // tilts move the camera.
      const dz = (v) => (Math.abs(v) < 0.06 ? 0 : v)
      this.pTarget.x = this.pTarget.x * 0.85 + dz(nx) * 0.15
      this.pTarget.y = this.pTarget.y * 0.85 + dz(ny) * 0.15
    }
    // Pause the canvas when the tab is hidden (§5.3) — no battery/GPU spend on a
    // backgrounded tab. Resumes cleanly on return (start() reseeds lastTs).
    this._onVis = () => {
      if (document.hidden) this.stop()
      else this.start()
    }
    // The star-view hand: drag orbits around the held star, pinch/wheel pulls
    // closer or further. Live only while navEnabled — everywhere else these
    // handlers fall straight through and the backdrop stays a backdrop.
    this._navDown = (e) => {
      if (!this.navEnabled) return
      const el = e.target
      if (el && el.closest && el.closest('button, a, input, textarea, [role="button"], [data-noripple]')) return
      const nv = this._nav
      nv.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (nv.pts.size === 2) {
        const [p1, p2] = [...nv.pts.values()]
        nv.mode = 'pinch'
        nv.dist0 = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
        nv.dist1 = this.viewDist
      } else if (nv.pts.size === 1) {
        nv.mode = 'drag'
        nv.lx = e.clientX
        nv.ly = e.clientY
      }
      this.start()
    }
    this._navMove = (e) => {
      if (!this.navEnabled) return
      const nv = this._nav
      const p = nv.pts.get(e.pointerId)
      if (!p) return
      p.x = e.clientX
      p.y = e.clientY
      if (nv.mode === 'pinch' && nv.pts.size >= 2) {
        const [p1, p2] = [...nv.pts.values()]
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
        this.viewDist = clamp(nv.dist1 * (nv.dist0 / d), 0.35, 3.2)
      } else if (nv.mode === 'drag') {
        this.orbit.yaw = clamp(this.orbit.yaw + (e.clientX - nv.lx) * 0.0042, -2.4, 2.4)
        this.orbit.pitch = clamp(this.orbit.pitch - (e.clientY - nv.ly) * 0.0032, -1.1, 1.1)
        nv.lx = e.clientX
        nv.ly = e.clientY
      }
      this.start()
    }
    this._navUp = (e) => {
      const nv = this._nav
      if (!nv.pts.delete(e.pointerId)) return
      if (nv.pts.size < 2 && nv.mode === 'pinch') nv.mode = nv.pts.size === 1 ? 'drag' : null
      if (nv.pts.size === 0) nv.mode = null
    }
    this._navWheel = (e) => {
      if (!this.navEnabled) return
      this.viewDist = clamp(this.viewDist * Math.exp(e.deltaY * 0.0014), 0.35, 3.2)
      this.start()
    }
    window.addEventListener('pointerdown', this._navDown, { passive: true })
    window.addEventListener('pointermove', this._navMove, { passive: true })
    window.addEventListener('pointerup', this._navUp, { passive: true })
    window.addEventListener('pointercancel', this._navUp, { passive: true })
    window.addEventListener('wheel', this._navWheel, { passive: true })
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    // Reduced-motion: skip pointer/tilt parallax entirely (it's continuous motion).
    if (!this.reduced) {
      window.addEventListener('pointermove', this._onPointer, { passive: true })
      window.addEventListener('deviceorientation', this._onTilt, { passive: true })
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 700
    // Ignore the small height-only changes the mobile URL bar / toolbar makes as it
    // collapses on scroll. Re-allocating the canvas backing store (which clears it)
    // and re-centering the field on every toolbar frame is what made the galaxy
    // "vibrate" inside the Instagram in-app browser. A width change or a real height
    // change (orientation, keyboard) still does a full resize.
    if (this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    // Spread the field so the disk spills past the frame on wide monitors as
    // well as tall phones — it should read as a window into a much bigger space,
    // not a single contained shape. (Star pixel sizes don't scale with unit, so
    // this widens the field rather than zooming it.)
    this.unit = Math.min(this.w, this.h) * 0.82 + Math.max(this.w, this.h) * 0.06
    this.cx = this.w / 2
    this.cy = this.h * 0.44
    this._bgGrad = null // height changed → rebuild the cached backdrop gradient
    if (this.reduced) this.start() // a settled reduced-motion field must repaint
  }

  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    if (changed) this.modeT = 0
    if (mode === 'idle') this.dimTarget = data.dim != null ? data.dim : 1
    if (mode === 'sendoff') {
      this.dimTarget = 0.66
      if (data.origin) this.origin = data.origin
      if (changed) this.trail = []
    }
    if (mode === 'resting') this.dimTarget = 0.42
    if (mode === 'match') {
      this.dimTarget = 0.22
      if (changed) this.motes = null
    }
    this.start() // resume the loop if a settled reduced-motion field went idle
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
    window.removeEventListener('deviceorientation', this._onTilt)
    window.removeEventListener('pointerdown', this._navDown)
    window.removeEventListener('pointermove', this._navMove)
    window.removeEventListener('pointerup', this._navUp)
    window.removeEventListener('pointercancel', this._navUp)
    window.removeEventListener('wheel', this._navWheel)
  }
  setMotion(m) {
    this.motion = m
    this.start()
  }

  // Drift the camera toward sealed star `i` and zoom in. Pass -1 (or clearFocus)
  // to drift back out. `opts.hold` keeps the camera there — the star view: the
  // viewer stays with the star, hand-orbiting the sky around it, until
  // clearFocus() pulls back out.
  focusStar(i, opts = {}) {
    if (i == null || i < 0 || i >= this.sealed.length) return this.clearFocus()
    this.focusIndex = i
    this.focusTarget = 1
    this.focusHold = !!opts.hold
    this.start()
  }
  clearFocus() {
    this.focusTarget = 0
    this.focusHold = false
    this.start()
  }

  // Turn the star-view hand on/off (drag orbits, pinch/wheel dollies). Turning
  // it off lets the view glide home — orbit and distance ease back to rest.
  setNavEnabled(on) {
    this.navEnabled = !!on
    if (!on) {
      this._nav.pts.clear()
      this._nav.mode = null
      // reduced motion never runs the easing loop — settle home instantly
      if (this.reduced) {
        this.orbit.yaw = 0
        this.orbit.pitch = 0
        this.viewDist = 1
      }
    }
    this.start()
  }

  // Play a quick vanish (implode + fade) on sealed star `i`. The React layer
  // calls this just before it removes the star from its arrays, so the point of
  // light is seen to wink out instead of simply disappearing on the next frame.
  vanishStar(i) {
    if (i == null || i < 0) return
    this.vanish = { i, t: 0 }
    this.start()
  }

  // Which sealed star (if any) is under a screen-space point — used to turn a
  // tap into a focus. Only meaningful when not already zoomed (focus ≈ 0), where
  // sealedScreen positions match raw screen coordinates. Returns index or -1.
  // The radius is generous: a resting star is a tiny point and its @handle tag
  // floats ~30px up-and-right of it, so a forgiving target lets a tap on the
  // handle (or anywhere near the star) select it instead of missing a 2px dot.
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
  setPalette(you, them) {
    this.you = you
    this.them = them
    this.glows.you = makeGlow(you, 64)
    this.glows.them = makeGlow(them, 64)
    this.glows.seal = makeGlow(this.sealHue || you, 64)
    this._matchBloom = null // palette-tinted cache must be rebuilt
    this.start()
  }

  // Nova seal style — tint the person's own sealed stars (and the send-off
  // drift). Pass null to fall back to the `you` palette accent.
  setSealColor(hex) {
    this.sealHue = hex || null
    this.glows.seal = makeGlow(this.sealHue || this.you, 64)
    this.start()
  }

  // Place a fresh slot from a monotonic seed (never reused), so a star's spot in
  // the disk is fixed for its whole life and a later add can't land on a slot a
  // removed star used to hold.
  //
  // Placement is a sunflower (phyllotaxis) spiral: the angle steps by the golden
  // angle and the radius grows with √index, so each new star fans further OUT
  // along the disk instead of stacking onto a handful of fixed rings. On a narrow
  // phone the old 3-ring scheme ran out of room and collapsed a busy sky into one
  // overlapping clump (and a wall of piled @tags); the spiral fills evenly and
  // keeps expanding, so the field never "runs out of space".
  _placeSlot(seed) {
    const ring = seed % 3
    return {
      seed,
      theta0: seed * 2.39996323, // golden angle — even, non-repeating placement
      // √-growth radius, capped so the farthest stars still sit inside the disk.
      r: clamp(0.3 + 0.085 * Math.sqrt(seed), 0.3, 1.55),
      y: (seed % 2 ? 1 : -1) * (0.035 + ring * 0.014), // gently above / below the plane
      phase: seed * 1.7, // desynced twinkle
    }
  }

  // Match the resting set to the number of people sealed. Growing is the common
  // case (each seal adds a star); shrinking from the TAIL covers a rolled-back
  // send-off and a full reset (forget). Removing a specific star from the middle
  // goes through removeSealAt so the survivors keep their exact places and stay
  // index-aligned with the @handle tags.
  setSeals(n) {
    while (this.sealed.length < n) this.sealed.push(this._placeSlot(this._slotSeed++))
    if (this.sealed.length > n) this.sealed.length = Math.max(0, n)
    this.start()
  }

  // The @ each sealed star belongs to, aligned with `sealed` by index (null for
  // a ping restored from another device). Read only at a focus dive's arrival.
  setSealLabels(labels) {
    this.sealLabels = labels || []
    this.start()
  }

  // Remove the slot at index `i` (identity-stable): the survivors keep their own
  // positions, and the focus/vanish indices follow the splice. This is what keeps
  // each drifting star matched to the tag it's labelled with after a release.
  removeSealAt(i) {
    if (i == null || i < 0 || i >= this.sealed.length) return
    this.sealed.splice(i, 1)
    this.sealedScreen.splice(i, 1)
    if (this.vanish) {
      if (this.vanish.i === i) this.vanish = null
      else if (this.vanish.i > i) this.vanish.i--
    }
    if (this.focusIndex === i) {
      this.focusIndex = -1
      this.focusTarget = 0
    } else if (this.focusIndex > i) {
      this.focusIndex--
    }
    this.start()
  }

  // Rotate a local point into view-aligned world space (spin → parallax yaw →
  // tilt). The shared first half of _project; also used to find the focused star's
  // world position so the camera can aim for it.
  _view(px, py, pz, rot) {
    let x = px * rot.cosS + pz * rot.sinS
    let z = -px * rot.sinS + pz * rot.cosS
    let y = py
    const x2 = x * rot.cosY + z * rot.sinY
    const z2 = -x * rot.sinY + z * rot.cosY
    x = x2
    z = z2
    const y3 = y * rot.cosT - z * rot.sinT
    const z3 = y * rot.sinT + z * rot.cosT
    return { x, y: y3, z: z3 }
  }

  // Rotate a local point into view space, subtract the live camera offset, then
  // perspective-project. Returns null when behind (or essentially at) the camera —
  // which is how stars the camera dives past simply drop out of frame.
  _project(px, py, pz, rot) {
    const v = this._view(px, py, pz, rot)
    const cs = this.cam
    const x = v.x - cs.x
    const y = v.y - cs.y
    const zc = CAM + v.z - cs.z // camera-space depth
    if (zc <= 0.05) return null
    const persp = FOCAL / zc
    return {
      sx: this.cx + x * this.unit * persp,
      sy: this.cy + y * this.unit * persp,
      persp,
      zc,
      shade: clamp((CAM + 1.1 - zc) / 2.0 + 0.45, 0.35, 1.25),
    }
  }

  _rot() {
    // As the camera commits to a dive, freeze its orientation: pointer parallax and
    // the idle drift wind down toward 0 so the target star holds rock-steady in the
    // crosshairs instead of swimming while we fly in.
    const hold = 1 - this.focus
    const driftY = Math.sin(this.t * 0.12) * 0.07 * hold
    // The hand's orbit rides OUTSIDE the focus envelope: during a held star
    // view the camera re-aims at the star every frame, so orbiting swings the
    // whole sky around the hero with true parallax while it stays centered.
    const yaw = this.p.x * 0.32 * hold + driftY + this.orbit.yaw
    const tilt = TILT + (this.p.y * 0.2 + Math.sin(this.t * 0.09) * 0.025) * hold + this.orbit.pitch
    return {
      cosS: Math.cos(this.spin),
      sinS: Math.sin(this.spin),
      cosY: Math.cos(yaw),
      sinY: Math.sin(yaw),
      cosT: Math.cos(tilt),
      sinT: Math.sin(tilt),
    }
  }

  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.modeT += dt
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 2.2)
    // Camera focus is time-driven and eased, NOT an exponential chase: focusP is
    // linear progress (ramping 0→1 toward the tapped star, 1→0 on release over a
    // fixed duration), and `focus` is its ease-in-out. So the camera departs
    // gently, accelerates through the field, and SETTLES softly onto the star —
    // a deliberate cinematic glide instead of a fast lurch that then creeps the
    // final few percent. A re-tap mid-pull-out simply reverses the same ramp.
    const fdur = this.focusTarget === 1 ? FOCUS_IN : FOCUS_OUT
    this.focusP = clamp(this.focusP + (this.focusTarget === 1 ? 1 : -1) * (dt / fdur), 0, 1)
    this.focus = easeInOut(this.focusP)
    if (this.focusP <= 0.0001 && this.focusTarget === 0) {
      this.focus = 0
      this.focusIndex = -1
    }
    // advance (and retire) a star's wink-out
    if (this.vanish) {
      this.vanish.t += dt
      if (this.vanish.t >= VANISH_DUR) this.vanish = null
    }
    if (this.reduced) {
      // Reduced-motion: no spin, no parallax, no twinkle advance (_draw(0)). The
      // dim cross-fade and one-shot send-off settle still resolve, then — unlike
      // before — the loop actually STOPS instead of re-rendering identical frames
      // forever. It resumes on any state change (every mutator calls start()), so
      // this is a genuine rest with no idle GPU/CPU spend.
      this._draw(0)
      if (this._settled()) {
        this.running = false
        return
      }
      requestAnimationFrame(this._boundTick)
      return
    }
    this.t += dt
    // nearly freeze the slow orbit while a star is held in focus, so it sits
    // still under the camera instead of drifting out of frame
    this.spin += dt * (this.motion / 100) * 0.16 * (1 - this.focus * 0.96)
    this.p.x = lerp(this.p.x, this.pTarget.x, Math.min(1, dt * 2.6))
    this.p.y = lerp(this.p.y, this.pTarget.y, Math.min(1, dt * 2.6))
    // with the hand gone, the view glides home (orbit unwinds, distance rests)
    if (!this.navEnabled) {
      const home = Math.min(1, dt * 2.2)
      this.orbit.yaw = lerp(this.orbit.yaw, 0, home)
      this.orbit.pitch = lerp(this.orbit.pitch, 0, home)
      this.viewDist = lerp(this.viewDist, 1, home)
    }
    this._draw(dt)
    requestAnimationFrame(this._boundTick)
  }

  // Reduced-motion only: has everything that animates come to rest? True once the
  // dim/focus cross-fades have resolved, no star is winking out, and the one-shot
  // send-off / match transitions have played out.
  _settled() {
    const dimDone = Math.abs(this.dim - this.dimTarget) < 0.004
    const focusDone = Math.abs(this.focus - this.focusTarget) < 0.004
    const transient = (this.mode === 'sendoff' && this.modeT < 4.2) || (this.mode === 'match' && this.modeT < 5.5)
    return dimDone && focusDone && !this.vanish && !transient
  }

  _draw(dt) {
    const ctx = this.ctx,
      // As the camera flies into a star, melt the surrounding field down so the
      // close-up arrives over a calm, near-dark sky with the hero star alone —
      // the busy galaxy recedes into the void instead of streaking past at full
      // brightness. The focused star itself isn't scaled by `d`, so it stays lit
      // while everything around it dissolves.
      d = this.dim * (1 - this.focus * 0.45),
      rot = this._rot()
    // When zoomed, the whole field is magnified, so even tiny points must be drawn
    // as round sprites or they'd smear into squares. Un-zoomed, the faint sub-pixel
    // majority can take a cheap fill (they read as points either way) — that's what
    // keeps the soft-sprite field affordable on low-end hardware.
    const zoomed = this.focus > 0.01

    // deep-space backdrop with a faint cool zenith glow. The vertical gradient only
    // depends on height, so build it once per resize instead of every frame.
    ctx.globalCompositeOperation = 'source-over'
    if (!this._bgGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, this.h)
      g.addColorStop(0, '#06050E')
      g.addColorStop(0.55, '#040309')
      g.addColorStop(1, '#030206')
      this._bgGrad = g
    }
    ctx.fillStyle = this._bgGrad
    ctx.fillRect(0, 0, this.w, this.h)

    // full-frame background starfield (screen-space parallax + twinkle)
    this._drawBackground(dt, d)

    // Camera focus: fly the camera THROUGH the field toward the focused star.
    // Instead of a flat 2D magnification, we offset the perspective camera in
    // view-aligned world space — laterally to bring the star into the crosshairs,
    // and forward (cam.z) to dive in — so neighbours stream past with true depth
    // parallax and the hero swells as we close. Computed here (rot is known) BEFORE
    // anything projects, then folded into every _project call this frame. At
    // focus≈0 the offset is (0,0,0): the identity camera, no seam.
    // Reduced motion opts out of the physical travel: keep the camera at rest and
    // let the scrim + readout simply cross-fade in over a calm, dimmed field.
    if (!this.reduced && this.focus > 0.0005 && this.focusIndex >= 0 && this.focusIndex < this.sealed.length) {
      const s = this.sealed[this.focusIndex]
      const T = this._view(Math.cos(s.theta0) * s.r, s.y, Math.sin(s.theta0) * s.r, rot)
      const f = this.focus
      // forward travel so the target's camera-space depth eases CAM+T.z →
      // STANDOFF (× the pinch-adjustable view distance, so a held view can
      // pull closer or lean back)
      this.cam.x = f * T.x
      this.cam.y = f * T.y
      this.cam.z = f * (CAM + T.z - STANDOFF * this.viewDist)
    } else {
      this.cam.x = this.cam.y = this.cam.z = 0
    }

    // projected galactic core → anchor for the core glow + hero events (after the
    // camera offset is set, so the core sweeps aside correctly during a dive).
    const o = this._project(0, 0, 0, rot) || { sx: this.cx, sy: this.cy, persp: 1 }
    this.ox = o.sx
    this.oy = o.sy

    // nebula gas (additive, behind the stars)
    this._drawNebula(dt, d, rot)

    // soft core glow (additive) — a luminous, layered galactic bulge: a tight
    // bright heart inside a broad warm halo, so the centre reads as a real core.
    // soft core glow — a fixed-color radial built ONCE in unit space and drawn via a
    // transform (its position/size follow the projected core each frame, its `d`
    // dim via globalAlpha). Avoids re-allocating a gradient every frame.
    ctx.globalCompositeOperation = 'lighter'
    // Cap the radius so diving past the core can't scale a single gradient up to an
    // enormous off-screen fill (cost without payoff — beyond ~2× the frame it's a
    // flat wash either way).
    const coreR = Math.min(this.unit * 0.5 * o.persp, Math.max(this.w, this.h) * 2)
    if (!this._coreGrad) {
      // Calmer than it once was: the bulge still reads as a luminous core, but its
      // central wash is dialed back (and its radius trimmed) so it never blooms
      // brightly enough to swallow the foreground text sitting over the mid-screen.
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,236,206,0.2)')
      g.addColorStop(0.16, 'rgba(255,214,176,0.12)')
      g.addColorStop(0.46, 'rgba(214,150,120,0.045)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._coreGrad = g
    }
    ctx.save()
    ctx.globalAlpha = d
    ctx.translate(o.sx, o.sy)
    ctx.scale(coreR, coreR)
    ctx.fillStyle = this._coreGrad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()

    // diffuse disk haze — the milky glow of unresolved starlight smeared along the
    // tilted plane. It's what makes the field read as one galaxy rather than a
    // scatter of dots. Drawn additively as an ellipse aligned to the projected disk.
    this._drawDiskHaze(d, rot, o)

    // foreground dust (source-over, twinkling) — strong parallax. Soft round
    // motes (a warm/cream sprite) rather than square specks.
    ctx.globalCompositeOperation = 'source-over'
    const dustSprite = this._dotFor(PAL.cream), dustWarm = this._dotFor(PAL.warm)
    for (const p of this.dust) {
      const pr = this._project(p.px, p.py, p.pz, rot)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      p.tw += dt * p.tws
      const a = p.base * (0.7 + 0.3 * Math.sin(p.tw)) * d * clamp(pr.shade, 0.3, 1.2)
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.55, a)
      const D = clamp(p.rad * pr.persp * 2.6, 1.6, this.h * 0.4)
      if (zoomed) {
        ctx.drawImage(p.warm ? dustWarm : dustSprite, pr.sx - D / 2, pr.sy - D / 2, D, D)
      } else {
        // faint near-field mote — a cheap point un-zoomed
        ctx.fillStyle = p.warm ? PAL.warm : PAL.cream
        const s = D * 0.4
        ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
      }
    }

    // arm/bulge/halo stars (round, anti-aliased) + collect glow stars for the
    // additive bloom/spike pass.
    const glowQ = []
    for (const st of this.stars) {
      const pr = this._project(st.px, st.py, st.pz, rot)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      st.tw += dt * st.tws
      const a = st.base * (0.7 + 0.3 * Math.sin(st.tw)) * d * pr.shade
      if (st.glow) glowQ.push([pr, st, a])
      if (a <= 0.004) continue
      // a soft sprite spreads its light over more area than the old solid quad, so
      // lift the alpha to keep the field reading bright and crisp, not washed thin.
      ctx.globalAlpha = Math.min(0.96, a * 1.5)
      // diameter: the bright core ≈ the old quad, plus a soft feathered halo so
      // it reads as a point of light. A floor keeps the faintest stars visible; a
      // ceiling stops a star the camera dives past from ballooning into a costly
      // full-frame wash on the way by.
      const D = clamp(st.rad * pr.persp * 3, 1.9, this.h * 0.5)
      // The round sprite is what kills the pixelation, but it's only worth its cost
      // on stars big or bright enough to actually read as a disc; the faint sub-2px
      // crowd takes a cheap point fill (indistinguishable at that size, far cheaper).
      if (zoomed || D >= 2.4 || a >= 0.34) {
        ctx.drawImage(this._dotFor(st.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
      } else {
        ctx.fillStyle = st.hue
        const s = D * 0.42
        ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
      }
    }

    // glow pass (additive): a tinted bloom on every glow star, and on the very
    // brightest a faint diffraction cross so the field looks photographed.
    ctx.globalCompositeOperation = 'lighter'
    for (const [pr, st, a] of glowQ) {
      const sz = st.rad * 7 * pr.persp
      ctx.globalAlpha = Math.min(0.55, a * 0.7)
      ctx.drawImage(this._glowFor(st.hue), pr.sx - sz / 2, pr.sy - sz / 2, sz, sz)
      if (a > 0.5) {
        const ss = sz * 2.6
        ctx.globalAlpha = Math.min(0.22, (a - 0.5) * 0.32)
        ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      }
    }

    this._drawPassers(dt, d, rot)
    this._drawHero(dt, rot)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // The near-field passers: loose stars drifting between the camera and the
  // disk. Each remembers its last screen position — when the camera travels
  // (a dive, a hand-orbit, a pinch) they draw short streaks along their own
  // apparent motion, so flying feels like flying. At rest they are a whisper.
  _drawPassers(dt, d, rot) {
    if (!this.passers || !this.passers.length) return
    const ctx = this.ctx
    const active = this.focus > 0.02 || this.navEnabled || Math.abs(this.viewDist - 1) > 0.02
    const lift = active ? 1 : 0.5
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    for (const p of this.passers) {
      p.px += p.vx * dt
      p.py += p.vy * dt
      p.pz += p.vz * dt
      // wrap the drift inside its shell so the pool never thins out
      if (p.px > 2.4) p.px = -2.4
      else if (p.px < -2.4) p.px = 2.4
      if (p.py > 1.6) p.py = -1.6
      else if (p.py < -1.6) p.py = 1.6
      if (p.pz > 2.4) p.pz = -2.4
      else if (p.pz < -2.4) p.pz = 2.4
      const pr = this._project(p.px, p.py, p.pz, rot)
      if (!pr || pr.sx < -80 || pr.sx > this.w + 80 || pr.sy < -80 || pr.sy > this.h + 80) {
        p.lx = null
        continue
      }
      const a = p.base * d * lift * clamp(pr.persp / (FOCAL / CAM), 0.4, 2.4)
      const D = clamp(p.rad * pr.persp * 2.4, 1.2, 8)
      if (!this.reduced && p.lx != null) {
        const sp = Math.hypot(pr.sx - p.lx, pr.sy - p.ly)
        // a streak only when the star is genuinely sweeping past (and never
        // across a wrap teleport)
        if (sp > 2.5 && sp < 320) {
          ctx.globalAlpha = Math.min(0.6, a * (0.45 + sp * 0.02))
          ctx.strokeStyle = p.hue
          ctx.lineWidth = Math.min(2.2, D * 0.4)
          ctx.beginPath()
          ctx.moveTo(p.lx, p.ly)
          ctx.lineTo(pr.sx, pr.sy)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = Math.min(0.85, a)
      ctx.drawImage(this._dotFor(p.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
      p.lx = pr.sx
      p.ly = pr.sy
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // Soft luminous disk: map a radial gradient onto the disk's projected ellipse
  // by projecting its in-plane major (+x) and minor (+z) axes, so the haze tilts
  // and spins with the galaxy. Additive + very faint, so it reads as glow, not fog.
  _drawDiskHaze(d, rot, o) {
    const ctx = this.ctx
    const ax = this._project(1, 0, 0, rot)
    const az = this._project(0, 0, 1, rot)
    if (!ax || !az) return
    const ux = ax.sx - o.sx, uy = ax.sy - o.sy
    const vx = az.sx - o.sx, vy = az.sy - o.sy
    // Gradient is defined in the unit-circle local space and reused every frame
    // (only the transform below changes), so build it once. `d` is applied via
    // globalAlpha rather than rebuilt stops — no per-frame allocation.
    if (!this._hazeGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,226,196,0.05)')
      g.addColorStop(0.45, 'rgba(206,170,210,0.035)') // cool violet toward the rim
      g.addColorStop(0.8, 'rgba(150,150,200,0.012)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._hazeGrad = g
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = d
    ctx.transform(ux, uy, vx, vy, o.sx, o.sy) // unit circle → disk ellipse
    ctx.fillStyle = this._hazeGrad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()
  }

  _drawBackground(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    const px = this.p.x,
      py = this.p.y
    for (const b of this.bg) {
      b.tw += dt * b.tws
      const par = (1 - b.z) * 26
      const x = b.x * this.w - px * par
      const y = b.y * this.h - py * par
      if (x < -4 || x > this.w + 4 || y < -4 || y > this.h + 4) continue
      const a = b.base * (0.5 + 0.5 * Math.sin(b.tw)) * d
      if (a <= 0.01) continue
      ctx.globalAlpha = Math.min(0.85, a)
      // The deep backdrop sits behind the zoom transform, so it's never magnified —
      // at 0.5–2px these read as points. A cheap fill (round for the few big ones,
      // a fast 1px dot for the faint majority) keeps the frame light.
      if (b.rad > 1.1) {
        const D = b.rad * 2.4
        ctx.drawImage(this._dotFor(b.hue), x - D / 2, y - D / 2, D, D)
      } else {
        ctx.fillStyle = b.hue
        const s = b.rad
        ctx.fillRect(x - s, y - s, s * 2, s * 2)
      }
    }
  }

  // One normalized (unit-radius, full-alpha) radial gradient per nebula colour,
  // built once and reused — the per-frame `a` rides on globalAlpha. Rebuilding 13
  // radial gradients every frame was a top mobile cost (felt on the match screen).
  _nebGradFor(hex) {
    if (!this._nebGrad) this._nebGrad = {}
    if (!this._nebGrad[hex]) {
      const [r, g, b] = hexToRgb(hex)
      const grd = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
      grd.addColorStop(0.5, `rgba(${r},${g},${b},0.4)`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      this._nebGrad[hex] = grd
    }
    return this._nebGrad[hex]
  }

  _drawNebula(dt, d, rot) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const nb of this.nebula) {
      const pr = this._project(nb.px, nb.py, nb.pz, rot)
      if (!pr) continue
      nb.tw += dt * nb.tws
      const rr = nb.rad * this.unit * pr.persp
      // skip clouds too small to see, fully off-frame, or so close they'd be a flat
      // full-screen wash (cheap guard for the fly-in's near field)
      if (rr < 5 || rr > Math.max(this.w, this.h) * 1.6 || pr.sx < -rr || pr.sx > this.w + rr || pr.sy < -rr || pr.sy > this.h + rr) continue
      const a = nb.a * (0.7 + 0.3 * Math.sin(nb.tw)) * d * clamp(pr.shade, 0.4, 1.2)
      if (a <= 0.002) continue
      ctx.save()
      ctx.globalAlpha = clamp(a, 0, 1)
      ctx.translate(pr.sx, pr.sy)
      ctx.scale(rr, rr)
      ctx.fillStyle = this._nebGradFor(nb.col)
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, TWO)
      ctx.fill()
      ctx.restore()
    }
  }

  _star(x, y, color, coreR, glowR, glowA) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = glowA
    ctx.drawImage(this.glows[color], x - glowR, y - glowR, glowR * 2, glowR * 2)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, coreR, 0, TWO)
    ctx.fill()
  }

  _drawHero(dt, rot) {
    if (this.mode === 'match') {
      this._drawMatch(dt)
      return
    }
    // sendoff drifts the newest star into place; every other mode just rests the
    // whole stacked set so it survives the screen change without a cut.
    this.sealedScreen.length = this.sealed.length // drop tags for trimmed stars
    const flying = this.mode === 'sendoff'
    this._drawSealed(rot, flying)
    if (flying) this._drawFlyIn(rot)
  }

  // Position of a sealed star in 3D disk space. _project applies the galaxy
  // spin, so each one quietly orbits the core and shares the field's parallax.
  _sealedAt(s, rot) {
    return this._project(Math.cos(s.theta0) * s.r, s.y, Math.sin(s.theta0) * s.r, rot)
  }

  _drawSealed(rot, excludeLast) {
    const n = this.sealed.length
    const focusing = this.focus > 0.001
    for (let i = 0; i < n; i++) {
      // the flying star's screen position is owned by _drawFlyIn this frame
      if (excludeLast && i === n - 1) continue
      const pr = this._sealedAt(this.sealed[i], rot)
      if (!pr) {
        this.sealedScreen[i] = { x: 0, y: 0, vis: false }
        continue
      }
      // Withdrawing this star: a soft halo blooms outward while the core
      // contracts to a point and winks out — then the React layer drops it.
      if (this.vanish && this.vanish.i === i) {
        const ctx = this.ctx
        const vp = clamp(this.vanish.t / VANISH_DUR, 0, 1)
        const fade = 1 - vp
        ctx.globalCompositeOperation = 'lighter'
        const hr = (8 + vp * 30) * pr.persp
        ctx.globalAlpha = 0.5 * fade
        ctx.drawImage(this.glows.seal, pr.sx - hr, pr.sy - hr, hr * 2, hr * 2)
        ctx.globalAlpha = fade
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(pr.sx, pr.sy, Math.max(0.2, 1.9 * (1 - vp) * pr.persp + 0.3), 0, TWO)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        this.sealedScreen[i] = { x: pr.sx, y: pr.sy, vis: false }
        continue
      }
      // a slow, shallow twinkle — a star settling, not a blinking indicator
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.9 + this.sealed[i].phase)
      const sh = clamp(pr.shade, 0.45, 1.2)
      const isFocus = focusing && i === this.focusIndex
      const f = isFocus ? this.focus : 0
      // a HELD star view lives with the star for as long as the viewer stays,
      // so its dressing is bounded to a beautiful medium star instead of the
      // momentary frame-filling flare of the timed dive (which the old
      // auto-pull-out made survivable). The overlay names it; the star burns.
      const held = isFocus && this.focusHold
      // during a dive, everything but the hero melts back into the depth
      const fade = focusing && !isFocus ? 1 - 0.82 * this.focus : 1
      // Your own star, dressed like it matters: a white-hot core inside layered
      // amber + rose light, the product's diffraction glisten resting shyly on
      // top, and a fine breathing ring. It swells with the dive and, at arrival,
      // flares to its full photographic signature with its @ risen above it.
      const ctx = this.ctx
      ctx.globalCompositeOperation = 'lighter'
      let ro = clamp((14 + pulse * 3) * pr.persp, 8, this.h * 0.3) * (1 + f * 2)
      if (held) ro = Math.min(ro, 110)
      ctx.globalAlpha = (0.09 + 0.07 * pulse) * sh * fade
      ctx.drawImage(this.glows.them, pr.sx - ro, pr.sy - ro, ro * 2, ro * 2)
      let go = clamp((9 + pulse * 2.5) * pr.persp, 6, this.h * 0.28) * (1 + f * 2.6)
      if (held) go = Math.min(go, 84)
      ctx.globalAlpha = (0.36 + 0.26 * pulse) * sh * fade
      ctx.drawImage(this.glows.seal, pr.sx - go, pr.sy - go, go * 2, go * 2)
      let ss = clamp((16 + pulse * 5) * pr.persp, 10, this.h * 0.3) * (1 + f * 2.8)
      if (held) ss = Math.min(ss, 190)
      ctx.globalAlpha = Math.min(1, (0.18 + 0.15 * pulse) * fade + f * 0.55)
      ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      let cd = clamp(2.5 * pr.persp, 1.6, this.h * 0.08) * (1 + f * 2.2) * (0.9 + pulse * 0.2)
      if (held) cd = Math.min(cd, 10)
      ctx.globalAlpha = Math.min(1, (0.78 + 0.22 * pulse) * fade + f)
      ctx.drawImage(this._dotFor('#FFFFFF'), pr.sx - cd, pr.sy - cd, cd * 2, cd * 2)
      ctx.globalAlpha = (0.2 + 0.18 * pulse) * fade * (1 - f) + f * (held ? 0.5 : 0.85)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      const ringR = clamp((6.5 + pulse * 1.4) * pr.persp, 5, 40) * (1 + f * 1.9)
      ctx.arc(pr.sx, pr.sy, held ? Math.min(ringR, 52) : ringR, 0, TWO)
      ctx.stroke()
      // arrival: the @ this ping holds rises over the star on a slim tick.
      // A HELD star view skips this — the DOM overlay carries the @ and the
      // intent line there, designed rather than canvas-set.
      const label = this.sealLabels[i]
      if (isFocus && label && f > 0.55 && !this.focusHold) {
        const fl = smooth((f - 0.55) / 0.45)
        const off = 32 + f * 22
        ctx.globalAlpha = fl * 0.4
        ctx.beginPath()
        ctx.moveTo(pr.sx, pr.sy - 15 - f * 8)
        ctx.lineTo(pr.sx, pr.sy - off + 9)
        ctx.stroke()
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = clamp(fl * 0.96, 0, 1)
        ctx.font = "700 14.5px 'Space Mono', monospace"
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0,0,0,0.85)'
        ctx.shadowBlur = 8
        ctx.fillStyle = 'rgba(255,250,244,0.98)'
        ctx.fillText('@' + label, pr.sx, pr.sy - off)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      // each resting star carries its own tag — record where it is on screen
      this.sealedScreen[i] = { x: pr.sx, y: pr.sy, vis: true }
    }
  }

  // The send-off: the star coalesces exactly where the @ became a star, then
  // drifts on a long, decelerating arc into its resting slot — settling, not
  // flashing. Hands off seamlessly to _drawSealed's resting size at the end.
  _drawFlyIn(rot) {
    const s = this.sealed[this.sealed.length - 1]
    if (!s) return
    const ctx = this.ctx
    const pr = this._sealedAt(s, rot)
    const tx = pr ? pr.sx : this.ox,
      ty = pr ? pr.sy : this.oy
    const ox = this.origin ? this.origin.x * this.w : this.cx
    const oy = this.origin ? this.origin.y * this.h : this.h * 0.43

    // COAL holds the forming star at the origin long enough to align with the DOM
    // morph overlay's collapse+ignite+glisten (~1.25s), so the galaxy star is
    // already sitting under the overlay when it dissolves — a seamless handoff —
    // and only THEN does it drift out with its trail.
    const COAL = 1.0,
      DRIFT = 2.7
    const tt = this.modeT

    // phase 1 — coalesce: the star gathers and brightens at the origin point
    if (tt < COAL) {
      const f = smooth(tt / COAL)
      // a faint halo contracting into the forming point
      ctx.globalCompositeOperation = 'lighter'
      const hr = 26 * (1 - f) + 9
      ctx.globalAlpha = 0.4 * f
      ctx.drawImage(this.glows.seal, ox - hr, oy - hr, hr * 2, hr * 2)
      ctx.globalAlpha = 1
      this._star(ox, oy, 'seal', 1.2 + 0.9 * f, 8 + 7 * f, 0.18 + 0.34 * f)
      this.sealedScreen[this.sealed.length - 1] = { x: ox, y: oy, vis: true }
      this.trail = []
      return
    }

    // phase 2 — drift: gentle S-curve, easeInOut so it departs and arrives slowly
    const e = easeInOut(Math.min(1, (tt - COAL) / DRIFT))
    const dx = tx - ox,
      dy = ty - oy
    const mx = (ox + tx) / 2 - dy * 0.16
    const my = (oy + ty) / 2 + dx * 0.16
    const x = (1 - e) * (1 - e) * ox + 2 * (1 - e) * e * mx + e * e * tx
    const y = (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * my + e * e * ty

    // soft drifting wake (additive, fading toward the tail)
    this.trail.push([x, y])
    if (this.trail.length > 32) this.trail.shift()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < this.trail.length; i++) {
      const tp = this.trail[i],
        f = i / this.trail.length
      ctx.globalAlpha = f * f * 0.26 * (1 - e * 0.5)
      const sz = 2 + f * 7
      ctx.drawImage(this.glows.seal, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1

    this.sealedScreen[this.sealed.length - 1] = { x, y, vis: true }
    // size eases down to the resting size; a slow breath instead of a shine
    const breathe = 0.48 + 0.06 * Math.sin(this.t * 2)
    this._star(x, y, 'seal', 1.9 + (1 - e) * 0.5, 14 - e * 2, breathe)
  }

  // MATCH — calm, on-theme coalescence. The two stars drift together along
  // gentle arcs linked by a brightening light-bridge (the part worth keeping),
  // meet in a single soft bloom, draw a few faint motes STRAIGHT inward (no
  // orbiting, no shockwave, no shrapnel), and settle into ONE still star
  // breathing inside layered amber/rose haloes — nothing spins.
  _drawMatch(dt) {
    const ctx = this.ctx
    const t = this.modeT
    // Stage the meeting in the open space below the headline + handle chips.
    const cx = this.cx
    const cy = this.h * 0.6

    const APPROACH = 2.6
    const e = easeInOut(Math.min(1, t / APPROACH))
    const gap = this.unit * 0.5 * (1 - e)
    const arc = Math.sin((1 - e) * Math.PI) * this.unit * 0.1 // gentle bow, decays to 0
    const xA = cx - gap,
      yA = cy - arc
    const xB = cx + gap,
      yB = cy + arc

    ctx.globalCompositeOperation = 'lighter'

    // luminous bridge brightens as they near
    if (e > 0.3) {
      const fa = clamp((e - 0.3) / 0.7, 0, 1)
      const lg = ctx.createLinearGradient(xA, yA, xB, yB)
      lg.addColorStop(0, this._rgba(this.you, 0))
      lg.addColorStop(0.5, `rgba(255,240,228,${0.42 * fa})`)
      lg.addColorStop(1, this._rgba(this.them, 0))
      ctx.strokeStyle = lg
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(xA, yA)
      ctx.lineTo(xB, yB)
      ctx.stroke()
    }

    if (t < APPROACH) {
      this._heroGlow(xA, yA, 'you', 0.4)
      this._heroGlow(xB, yB, 'them', 0.4)
      this._star(xA, yA, 'you', 2.0, 15, 0.55)
      this._star(xB, yB, 'them', 2.0, 15, 0.55)
      return
    }

    const bt = t - APPROACH

    // a single soft bloom of light that swells then fades — the moment of meeting.
    // Cached unit gradient (rebuilt only when the palette changes), drawn via a
    // transform with the swell on globalAlpha, and bounded to the bloom's own circle
    // instead of a full-frame fill every frame.
    const bloom = Math.exp(-bt * 1.3) * (1 - Math.exp(-bt * 5))
    if (bloom > 0.006) {
      const fr = this.unit * (0.18 + bt * 0.1)
      if (!this._matchBloom) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        g.addColorStop(0, 'rgba(255,246,236,0.6)')
        g.addColorStop(0.4, this._rgba(this.you, 0.26))
        g.addColorStop(0.7, this._rgba(this.them, 0.14))
        g.addColorStop(1, 'rgba(0,0,0,0)')
        this._matchBloom = g
      }
      ctx.save()
      ctx.globalAlpha = clamp(bloom, 0, 1)
      ctx.translate(cx, cy)
      ctx.scale(fr, fr)
      ctx.fillStyle = this._matchBloom
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, TWO)
      ctx.fill()
      ctx.restore()
    }

    // a few faint motes drawn STRAIGHT inward, then gone — matter gathering, no
    // circling. They fade as they reach the center (one-shot inflow).
    if (!this.motes) {
      this.motes = []
      for (let i = 0; i < 10; i++) {
        this.motes.push({ a: Math.random() * TWO, r0: this.unit * (0.14 + Math.random() * 0.22), sp: 0.5 + Math.random() * 0.5, col: Math.random() < 0.5 ? 'you' : 'them', ph: Math.random() * TWO })
      }
    }
    const gather = easeInOut(clamp(bt / 1.8, 0, 1))
    for (const m of this.motes) {
      const rr = m.r0 * (1 - gather)
      const x = cx + Math.cos(m.a) * rr
      const y = cy + Math.sin(m.a) * rr * 0.8
      const a = 0.3 * (1 - gather) * (0.6 + 0.4 * Math.sin(t * m.sp + m.ph))
      if (a <= 0.01) continue
      ctx.globalAlpha = a
      ctx.drawImage(this.glows[m.col], x - 3, y - 3, 6, 6)
    }
    ctx.globalAlpha = 1

    // the joined star: a single calm point breathing inside layered haloes. The
    // amber + rose inner glows fold into a unified white core — one star, still.
    const settle = easeOut(clamp(bt / 1.5, 0, 1))
    const breathe = 1 + 0.08 * Math.sin(t * 1.4)
    this._star(cx, cy, 'warm', 0.1, (34 + settle * 6) * breathe, 0.14)
    this._heroGlow(cx, cy, 'you', 1.4 * (1 - settle * 0.4))
    this._heroGlow(cx, cy, 'them', 1.4 * (1 - settle * 0.4))
    this._star(cx, cy, 'white', (1.9 + settle * 0.7) * breathe, (18 + settle * 5) * breathe, 0.55)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  _heroGlow(x, y, color, alpha) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = alpha * 0.4
    ctx.drawImage(this.glows[color], x - 14, y - 14, 28, 28)
    ctx.globalAlpha = 1
  }

  _rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
  }
}

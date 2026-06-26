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
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function makeGlow(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.95)`)
  grd.addColorStop(0.3, `rgba(${r},${g},${b},0.42)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  return s
}
// A single star as a round, anti-aliased sprite: a hot near-white core that
// falls off through the star's own hue to a soft transparent edge. Drawn (scaled)
// in place of 1px square quads, so the field reads as real points of light with
// a faint bloom instead of a grid of pixels. One per hue, cached.
function makeStarSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  // pull the inner core toward white so even tinted stars burn white-hot at center
  const wr = (r + 255 * 1.6) / 2.6, wg = (g + 255 * 1.6) / 2.6, wb = (b + 255 * 1.6) / 2.6
  const grd = c.createRadialGradient(m, m, 0, m, m, m)
  grd.addColorStop(0.0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.28, `rgba(${wr | 0},${wg | 0},${wb | 0},0.98)`)
  grd.addColorStop(0.5, `rgba(${r},${g},${b},0.62)`)
  grd.addColorStop(0.78, `rgba(${r},${g},${b},0.16)`)
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.beginPath()
  c.arc(m, m, m, 0, Math.PI * 2)
  c.fill()
  return s
}
// Four soft diffraction spikes (a slim cross that fades to nothing) — the
// photographic signature of a bright star through a lens. Added, very faintly,
// only to the few brightest stars so the field looks shot, not drawn.
function makeSpikeSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  for (const horiz of [true, false]) {
    const g1 = horiz ? c.createLinearGradient(0, m, size, m) : c.createLinearGradient(m, 0, m, size)
    g1.addColorStop(0, `rgba(${r},${g},${b},0)`)
    g1.addColorStop(0.5, `rgba(255,255,255,0.9)`)
    g1.addColorStop(1, `rgba(${r},${g},${b},0)`)
    c.fillStyle = g1
    // a hairline that tapers — drawn as a thin triangle-ish bar via a soft 2px line
    const th = Math.max(1, size * 0.014)
    if (horiz) c.fillRect(0, m - th, size, th * 2)
    else c.fillRect(m - th, 0, th * 2, size)
  }
  return s
}
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
const FOCUS_IN = 1.25 // seconds — camera glide into the tapped star
const FOCUS_OUT = 0.82 // seconds — camera drift back out to the resting sky
const CAM = 2.7 // camera distance from galactic center
const FOCAL = 2.35 // focal length (bigger = flatter / less perspective)
const TILT = 1.04 // base disk tilt toward the camera (rad)
const TWO = Math.PI * 2

export class GalaxyField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.opts = opts
    this.you = opts.you || '#FF8C66'
    this.them = opts.them || '#FF5E8A'
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
    this.glows = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), warm: makeGlow('#FFE0C2', 64), white: makeGlow('#FFFFFF', 64) }
    this._glowCache = {}
    this._dotCache = {} // hue -> round star sprite
    this._spike = makeSpikeSprite('#FFFFFF', 64) // shared diffraction cross (white, tinted via alpha)
    // Soft round sprites cost more per star than the old square quads, so the
    // field is a touch leaner — it reads denser now (each star carries a glow), so
    // fewer points still fill the frame.
    const count = opts.count || (window.innerWidth < 540 ? 1150 : 1800)
    this._gen(count)
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
    // Camera focus on a single star (the interactive resting field): the camera
    // drifts toward sealed[focusIndex] and zooms in; everything else recedes.
    this.focus = 0 // eased 0..1 (the value the camera transform reads)
    this.focusP = 0 // linear focus progress 0..1; `focus` is its ease-in-out
    this.focusTarget = 0
    this.focusIndex = -1
    this.focusScreen = { x: 0, y: 0, vis: false } // where the focused star sits now
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
  }
  setMotion(m) {
    this.motion = m
    this.start()
  }

  // Drift the camera toward sealed star `i` and zoom in. Pass -1 (or clearFocus)
  // to drift back out.
  focusStar(i) {
    if (i == null || i < 0 || i >= this.sealed.length) return this.clearFocus()
    this.focusIndex = i
    this.focusTarget = 1
    this.start()
  }
  clearFocus() {
    this.focusTarget = 0
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
    this._matchBloom = null // palette-tinted cache must be rebuilt
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

  // Rotate a local point into view space (spin → parallax yaw → tilt), then
  // perspective-project. Returns null when behind the camera.
  _project(px, py, pz, rot) {
    let x = px * rot.cosS + pz * rot.sinS
    let z = -px * rot.sinS + pz * rot.cosS
    let y = py
    const x2 = x * rot.cosY + z * rot.sinY
    const z2 = -x * rot.sinY + z * rot.cosY
    x = x2
    z = z2
    const y3 = y * rot.cosT - z * rot.sinT
    const z3 = y * rot.sinT + z * rot.cosT
    y = y3
    z = z3
    const zc = CAM + z
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
    const driftY = Math.sin(this.t * 0.12) * 0.07
    const yaw = this.p.x * 0.32 + driftY
    const tilt = TILT + this.p.y * 0.2 + Math.sin(this.t * 0.09) * 0.025
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
      this.focusScreen.vis = false
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

    // projected galactic core → anchor for the core glow + hero events
    const o = this._project(0, 0, 0, rot) || { sx: this.cx, sy: this.cy, persp: 1 }
    this.ox = o.sx
    this.oy = o.sy

    // Camera focus: zoom the galaxy toward the focused star so it eases to the
    // center of frame. The deep backdrop stays put (space is far); only the disk
    // and stars move — reading as the camera drifting in. Mapped so that at
    // focus=0 it's the identity transform (no seam when there's no focus).
    let _focusSaved = false
    if (this.focus > 0.001 && this.focusIndex >= 0 && this.focusIndex < this.sealed.length) {
      const fp = this._sealedAt(this.sealed[this.focusIndex], rot)
      if (fp) {
        const f = this.focus
        // A deep, deliberate push-in: the field magnifies toward the star so it
        // grows to fill the frame and its neighbours sweep out past the edges,
        // reading as genuine forward travel INTO the star rather than a modest
        // nudge. Held in check so the sparse field never blows up into bare pixels.
        const scale = 1 + f * 2.3
        const ctX = lerp(fp.sx, this.cx, f)
        const ctY = lerp(fp.sy, this.cy, f)
        this.focusScreen = { x: ctX, y: ctY, vis: true }
        ctx.save()
        ctx.translate(ctX, ctY)
        ctx.scale(scale, scale)
        ctx.translate(-fp.sx, -fp.sy)
        _focusSaved = true
      }
    }

    // nebula gas (additive, behind the stars)
    this._drawNebula(dt, d, rot)

    // soft core glow (additive) — a luminous, layered galactic bulge: a tight
    // bright heart inside a broad warm halo, so the centre reads as a real core.
    // soft core glow — a fixed-color radial built ONCE in unit space and drawn via a
    // transform (its position/size follow the projected core each frame, its `d`
    // dim via globalAlpha). Avoids re-allocating a gradient every frame.
    ctx.globalCompositeOperation = 'lighter'
    const coreR = this.unit * 0.6 * o.persp
    if (!this._coreGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,236,206,0.34)')
      g.addColorStop(0.16, 'rgba(255,214,176,0.2)')
      g.addColorStop(0.46, 'rgba(214,150,120,0.07)')
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
      const D = Math.max(1.6, p.rad * pr.persp * 2.6)
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
      // it reads as a point of light. A floor keeps the faintest stars visible.
      const D = Math.max(1.9, st.rad * pr.persp * 3)
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

    this._drawHero(dt, rot)
    if (_focusSaved) ctx.restore()
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
      if (rr < 5 || pr.sx < -rr || pr.sx > this.w + rr || pr.sy < -rr || pr.sy > this.h + rr) continue
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
        ctx.drawImage(this.glows.you, pr.sx - hr, pr.sy - hr, hr * 2, hr * 2)
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
      const pulse = 0.84 + 0.16 * Math.sin(this.t * 0.9 + this.sealed[i].phase)
      const sh = clamp(pr.shade, 0.45, 1.2)
      const isFocus = focusing && i === this.focusIndex
      // The focused star is the one we're flying toward — but the close-up's hero
      // is the crisp DOM star in the readout, so this canvas point HANDS OFF. To
      // make that a connected motion (not a cut): it stays lit and BLOOMS larger
      // through the drift-in, then dissolves only once the camera has nearly
      // arrived — so it visibly grows into the close-up star. Every other star
      // simply recedes into the depth-blurred field.
      const handoff = 1 - smooth(clamp((this.focus - 0.45) / 0.5, 0, 1))
      const fade = focusing ? (isFocus ? handoff : 1 - 0.82 * this.focus) : 1
      const bloom = isFocus ? 1 + this.focus * 2.2 : 1
      const core = Math.max(1.1, 1.9 * pr.persp)
      this._star(pr.sx, pr.sy, 'you', core * (isFocus ? handoff * bloom : 1), 12 * pr.persp * pulse * bloom, 0.5 * pulse * sh * fade)
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
      ctx.drawImage(this.glows.you, ox - hr, oy - hr, hr * 2, hr * 2)
      ctx.globalAlpha = 1
      this._star(ox, oy, 'you', 1.2 + 0.9 * f, 8 + 7 * f, 0.18 + 0.34 * f)
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
      ctx.drawImage(this.glows.you, tp[0] - sz, tp[1] - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1

    this.sealedScreen[this.sealed.length - 1] = { x, y, vis: true }
    // size eases down to the resting size; a slow breath instead of a shine
    const breathe = 0.48 + 0.06 * Math.sin(this.t * 2)
    this._star(x, y, 'you', 1.9 + (1 - e) * 0.5, 14 - e * 2, breathe)
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

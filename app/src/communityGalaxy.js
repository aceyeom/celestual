// communityGalaxy.js — the living sky of ONE community.
//
// This is a different instrument from the ambient backdrop (galaxy.js). There,
// stars are procedural dust that sets the mood for the general public. Here the
// sky is LIVE and COUNTABLE: every disk star is one real ping, the field starts
// empty and fills as pings arrive (0 → a thousand+), and every mutual match
// lights a small ANONYMOUS constellation — never tied to an identifiable ping,
// so watching the sky can never reveal who matched whom. That anonymity is
// structural, not incidental — it's the double-blind, kept.
//
// It shares the backdrop galaxy's entire visual language on purpose — the same
// deep-space gradient, the same perspective camera and tilt, the same soft round
// star sprites, nebula gas, disk haze and full-frame background field — so the
// moment the app swaps backdrops (joining a community, browsing one) reads as
// turning to face a different part of the SAME universe, never a cheaper one.
//
// The live mechanics:
//   · ping stars sit on two feathered logarithmic arms + inter-arm scatter with
//     a compact luminous heart — a deterministic slot per index, filling from
//     the core outward, so a small community is a tight young galaxy and a big
//     one sprawls into the full spiral. Size is FELT, never merely read.
//   · a new ping arrives as a METEOR: a slim streak that decelerates out of deep
//     space into its slot and ignites with a diffraction-spike glisten (the same
//     photographic signature the send-off morph uses), then settles to a twinkle.
//   · matches trace themselves in as in-disk asterisms — a travelling spark draws
//     the light-threads node to node; the figures ride the disk's own rotation.
//   · below the privacy floor the community is FORMING: a slowly swirling proto-
//     galaxy of luminous gas and uncountable motes (activity you can feel but
//     never count), which resolves into real stars when the community opens.
//   · a tap sends a wave through the disk PLANE (not a flat screen ring); stars
//     the wavefront crosses flare briefly — the sky answers the hand.
//   · locateMine() flies the camera THROUGH the field to the viewer's own star
//     (real depth parallax, neighbours streaming past), holds on it while it
//     flares inside its ring, then eases back out. One gesture, no DOM.
//
// Dependency-free canvas, one rAF loop, honors prefers-reduced-motion, pauses on
// a hidden tab — the same house rules as galaxy.js.

function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// The three sprites below deliberately mirror galaxy.js stroke for stroke — the
// two skies must be lit by the same physics of light. (Kept local rather than
// imported: the engines are separate on purpose and may tune independently.)
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
// A round, anti-aliased point of light: white-hot core falling off through the
// star's own hue to a soft transparent edge. One per hue, cached.
function makeStarSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
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
// Four soft diffraction spikes — the photographic signature of a bright star
// through a lens. Meteor ignitions and the brightest residents wear it.
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
    const th = Math.max(1, size * 0.014)
    if (horiz) c.fillRect(0, m - th, size, th * 2)
    else c.fillRect(m - th, 0, th * 2, size)
  }
  return s
}

const TWO = Math.PI * 2
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (p) => p * p * (3 - 2 * p)
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

// Stellar palette — identical to galaxy.js: warm gold heart, cream body, cool
// young arms, rare red giant. The community's own two lights (`you`, `them`)
// join it at runtime.
const PAL = {
  gold: '#F6DCA9',
  cream: '#EFEAF2',
  warm: '#F4C9A1',
  blue: '#BFD3FA',
  ice: '#A7C2FF',
  red: '#F3A98A',
}

// camera / projection — the SAME lens as galaxy.js, so the two skies share one
// geometry and the backdrop swap between them never re-frames the universe.
const CAM = 2.7 // camera distance from galactic center
const FOCAL = 2.35 // focal length
const TILT = 1.04 // base disk tilt toward the camera (rad)

// how many pings map the disk to (nearly) full frame; the disk fills from the
// heart outward with √-area growth, so the size of a community is felt.
const CAP = 1200
const RMAX = 1.05 // disk radius (world units) at full cap — spills just past frame
const PITCH = 3.1 // how far the two arms wind over the disk (rad at r = RMAX)

const METEOR_DUR = 1.15 // seconds a new ping streaks in
const IGNITE_DUR = 0.55 // the glisten when it lands
// The find-your-star dive: a deliberate, time-driven camera glide (in → hold on
// the flaring star → back out), the same cinematic grammar as galaxy.js's focus.
const DIVE_IN = 1.5
const DIVE_HOLD = 1.35
const DIVE_OUT = 0.95
const STANDOFF = 0.34 // how close (camera-space z) the dive comes to rest

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

    // ── the live populations ──
    this.stars = [] // one per ping: { i, born, state, settleAt, mine, ox, oy, cxp, cyp, trail }
    this.consts = [] // one per mutual match: { nodes, born, tw, dying }
    this._slots = [] // deterministic disk slot per ping index (built lazily)
    this._cSeed = 0
    this.mineIndex = -1 // the viewer's own star (their last placed ping)

    // "forming" = a gathering community below the privacy floor: uncountable
    // luminous gas + sub-resolution motes instead of discrete stars.
    this.forming = false
    this.gas = []
    this.motes = []

    // interactions
    this.waves = [] // disk-plane tap waves: { px, pz, t }
    this.dive = null // the running find-your-star camera dive: { t }
    this.locateFx = null // reduced-motion fallback: a converging ring, no travel
    this.focus = 0 // eased dive progress the camera transform reads
    this.cam = { x: 0, y: 0, z: 0 }

    this._dotCache = {}
    this._glowCache = {}
    this.glows = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), white: makeGlow('#FFFFFF', 64) }
    this._spike = makeSpikeSprite('#FFFFFF', 64)

    this._genDecor()
    this._boundTick = (ts) => this._tick(ts)
    this._bind()
    this.resize()
  }

  _dotFor(hex) {
    if (!this._dotCache[hex]) this._dotCache[hex] = makeStarSprite(hex, 32)
    return this._dotCache[hex]
  }
  _glowFor(hex) {
    if (!this._glowCache[hex]) this._glowCache[hex] = makeGlow(hex, 64)
    return this._glowCache[hex]
  }

  // ── the scene dressing (mood, never counted) ────────────────────────────────
  // A full-frame deep starfield, foreground dust and in-plane nebula gas — the
  // same layered depth galaxy.js builds, so an EMPTY community still opens onto
  // a real universe (the pings are what's missing, not the cosmos).
  _genDecor() {
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

    this.bg = []
    const bn = window.innerWidth < 540 ? 200 : 340
    for (let i = 0; i < bn; i++) {
      this.bg.push({
        x: rnd(),
        y: rnd(),
        z: 0.3 + rnd() * 0.7,
        rad: rnd() < 0.92 ? 0.5 + rnd() * 0.7 : 1.0 + rnd() * 0.9,
        base: 0.12 + rnd() * 0.5,
        hue: rnd() < 0.15 ? PAL.blue : rnd() < 0.2 ? PAL.warm : '#FFFFFF',
        tw: rnd() * TWO,
        tws: 0.15 + rnd() * 0.7,
      })
    }

    this.dust = []
    const dn = window.innerWidth < 540 ? 90 : 150
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        px: (rnd() - 0.5) * 4.2,
        py: (rnd() - 0.5) * 2.6,
        pz: (rnd() - 0.5) * 4.2,
        rad: 0.4 + rnd() * 0.9,
        base: 0.05 + rnd() * 0.18,
        tw: rnd() * TWO,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }

    this.nebula = []
    const NCOL = [PAL.blue, '#7E6BA8', '#C77E8A', PAL.warm, '#5E7BB0']
    for (let i = 0; i < 10; i++) {
      const r = 0.18 + rnd() * 0.85
      const a = rnd() * TWO
      this.nebula.push({
        px: Math.cos(a) * r,
        py: gauss() * 0.1,
        pz: Math.sin(a) * r,
        rad: 0.3 + rnd() * 0.5,
        col: NCOL[Math.floor(rnd() * NCOL.length)],
        a: 0.04 + rnd() * 0.055,
        tw: rnd() * TWO,
        tws: 0.05 + rnd() * 0.12,
      })
    }
  }

  // ── the deterministic disk slot for the i-th ping ───────────────────────────
  // Radius grows with √index (even area fill, heart outward — the community's
  // size is its silhouette); angle seats most stars on two feathered logarithmic
  // arms with an inter-arm scatter and a compact spheroidal heart, so ANY count
  // reads as a genuine spiral galaxy, not a sunflower plot. Deterministic in i:
  // a star never moves once placed, and a re-seed lands everyone identically.
  _slot(i) {
    if (this._slots[i]) return this._slots[i]
    let s = (i * 2654435761 + 0x9e3779b9) >>> 0
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

    let r = Math.sqrt((i + 0.5) / CAP) * RMAX
    const kind = rnd()
    let ang, y
    if (r < 0.13 || kind < 0.17) {
      // the heart — a bright spheroid fed by a real share of the pings, so the
      // center burns dense and golden instead of reading as a hollow ring
      ang = rnd() * TWO
      r *= 0.55 + rnd() * 0.5
      y = gauss() * 0.05
    } else if (kind < 0.74) {
      // an arm star — two arms, winding with radius, feathered by a gaussian
      ang = (i % 2) * Math.PI + (r / RMAX) * PITCH + gauss() * (0.2 + r * 0.18)
      y = gauss() * (0.016 + 0.05 * Math.exp(-r * 2.4))
    } else {
      // inter-arm field star — keeps the disk from reading as two painted stripes
      ang = rnd() * TWO
      y = gauss() * (0.02 + 0.045 * Math.exp(-r * 2.2))
    }

    // hue by radius (gold heart → cream body → young blue rim), seasoned with the
    // community's own two lights and the rare red giant
    const cr = rnd()
    let hue
    if (r < 0.3) hue = cr < 0.5 ? PAL.gold : cr < 0.8 ? PAL.warm : PAL.cream
    else if (r < 0.72) hue = cr < 0.14 ? PAL.warm : cr < 0.78 ? PAL.cream : PAL.blue
    else hue = cr < 0.45 ? PAL.blue : cr < 0.58 ? PAL.ice : PAL.cream
    if (cr > 0.985) hue = PAL.red
    else if (cr > 0.955) hue = this.you
    else if (cr > 0.94) hue = this.them

    const slot = {
      px: Math.cos(ang) * r,
      pz: Math.sin(ang) * r,
      y,
      r,
      hue,
      // each ping is a resolved star, not dust — big and bright enough that the
      // countable population owns the sky over every decorative layer
      rad: 0.75 + rnd() * 1.05,
      base: (0.52 + rnd() * 0.44) * (1 - r * 0.16),
      glow: rnd() < 0.09,
      phase: rnd() * TWO,
      tws: 0.2 + rnd() * 0.6,
    }
    this._slots[i] = slot
    return slot
  }

  // ── binding / lifecycle ─────────────────────────────────────────────────────
  _bind() {
    this._onResize = () => this.resize()
    this._onPointer = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      this.pTarget.x = clamp(x, -1, 1)
      this.pTarget.y = clamp(y, -1, 1)
    }
    // device tilt steers the sky like galaxy.js: dead-zoned + low-passed so only
    // real tilts move the camera, never hand-held sensor jitter.
    this._onTilt = (e) => {
      if (e.gamma == null && e.beta == null) return
      const nx = clamp((e.gamma || 0) / 35, -1, 1)
      const ny = clamp(((e.beta || 0) - 45) / 35, -1, 1)
      const dz = (v) => (Math.abs(v) < 0.06 ? 0 : v)
      this.pTarget.x = this.pTarget.x * 0.85 + dz(nx) * 0.15
      this.pTarget.y = this.pTarget.y * 0.85 + dz(ny) * 0.15
    }
    this._onVis = () => (document.hidden ? this.stop() : this.start())
    // A tap anywhere non-interactive sends a wave through the disk plane.
    // Guarded so taps on buttons/inputs never trigger it.
    this._onDown = (e) => {
      const el = e.target
      if (el && el.closest && el.closest('button, a, input, textarea, [role="button"], [data-noripple]')) return
      this.ripple(e.clientX, e.clientY)
    }
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    if (!this.reduced) {
      window.addEventListener('pointermove', this._onPointer, { passive: true })
      window.addEventListener('deviceorientation', this._onTilt, { passive: true })
      window.addEventListener('pointerdown', this._onDown, { passive: true })
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 760
    // Ignore the small height-only changes of the collapsing mobile URL bar
    // (reallocating the backing store every toolbar frame reads as vibration).
    if (this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.unit = Math.min(w, h) * 0.62 + Math.max(w, h) * 0.05
    this.cx = w / 2
    this.cy = h * 0.42 // the heart rests in the page's hero zone
    this._bgGrad = null
    if (this.reduced) this.start()
  }

  setPalette(you, them) {
    this.you = you
    this.them = them
    this.glows.you = makeGlow(you, 64)
    this.glows.them = makeGlow(them, 64)
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
    window.removeEventListener('deviceorientation', this._onTilt)
    window.removeEventListener('pointerdown', this._onDown)
  }

  // ── the live API (what the app drives) ──────────────────────────────────────
  get count() {
    return this.stars.length
  }
  get matchCount() {
    return this.consts.length
  }

  // Instantly populate `n` resting ping-stars (mount / true count known). They
  // twinkle in over a staggered beat — opening a busy sky never fires a meteor
  // shower at the viewer.
  seed(n) {
    n = Math.max(0, Math.floor(n))
    this.stars = []
    this.mineIndex = -1
    this.dive = null
    this.locateFx = null
    for (let i = 0; i < n; i++) {
      this.stars.push({ i, born: -10, state: 'rest', settleAt: this.t + Math.random() * 1.1, mine: false })
    }
    this.start()
  }

  // Fire `k` new pings. Each arrives as a meteor and ignites in its slot — the
  // live "someone placed a ping" beat. Past a small burst the remainder settle
  // in quietly instead: a data catch-up must never read as a meteor storm.
  launch(k = 1, opts = {}) {
    const meteors = Math.min(k, 6)
    for (let j = 0; j < k; j++) {
      const i = this.stars.length
      const st = { i, born: this.t + j * 0.12, state: 'meteor', settleAt: 0, mine: !!opts.mine, trail: [] }
      if (j >= meteors) {
        st.state = 'rest'
        st.born = -10
        st.settleAt = this.t + Math.random() * 0.9
      } else {
        this._aimMeteor(st)
      }
      if (this.reduced) {
        // reduced motion: no streaks — the star simply fades into place
        st.state = 'rest'
        st.born = -10
        st.settleAt = this.t + 0.01
        st.trail = null
      }
      this.stars.push(st)
      if (opts.mine) this.mineIndex = i
    }
    this.start()
    return this.stars.length
  }

  // Choose the meteor's entry point: off-frame, from the upper hemisphere,
  // roughly opposite its landing slot so the streak crosses real sky.
  _aimMeteor(st) {
    if (!this._rotCache) this._rotCache = this._rot() // launch before first frame
    const slot = this._slot(st.i)
    const pr = this._project(slot.px, slot.y, slot.pz) || { sx: this.cx, sy: this.cy }
    const side = pr.sx < this.cx ? 1 : -1 // enter from the far side
    const a = -Math.PI / 2 + side * (0.3 + Math.random() * 0.5)
    const dist = Math.max(this.w, this.h) * (0.36 + Math.random() * 0.18)
    st.ox = pr.sx + Math.cos(a) * dist
    st.oy = pr.sy + Math.sin(a) * dist
    st.bow = (Math.random() - 0.5) * 0.36 // the arc's gentle sideways bow
  }

  // Trim to `n` (demo reset). Growing goes through launch()'s burst guard.
  setCount(n) {
    n = Math.max(0, Math.floor(n))
    if (n < this.stars.length) {
      this.stars.length = n
      if (this.mineIndex >= n) this.mineIndex = -1
    } else if (n > this.stars.length) {
      this.launch(n - this.stars.length)
    }
    this.start()
  }

  // Enter/leave the forming (gathering, count-withheld) state. The proto-galaxy
  // is a fixed, evocative amount of swirling gas + motes — never the true count.
  setForming(on) {
    this.forming = !!on
    if (on && !this.gas.length) {
      let s = 74218
      const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
      const GCOL = [this.you, '#7E6BA8', '#C77E8A', '#5E7BB0', PAL.warm]
      for (let i = 0; i < 12; i++) {
        this.gas.push({
          ang: rnd() * TWO,
          r: 0.08 + Math.pow(rnd(), 0.8) * 0.48,
          y: (rnd() - 0.5) * 0.06,
          rad: 0.2 + rnd() * 0.34,
          col: GCOL[i % GCOL.length],
          a: 0.075 + rnd() * 0.06,
          spd: 0.03 + rnd() * 0.05, // each knot orbits at its own pace — the swirl
          tw: rnd() * TWO,
          tws: 0.08 + rnd() * 0.12,
        })
      }
      for (let i = 0; i < 60; i++) {
        this.motes.push({
          ang: rnd() * TWO,
          r: 0.06 + Math.pow(rnd(), 0.7) * 0.55,
          y: (rnd() - 0.5) * 0.07,
          spd: 0.04 + rnd() * 0.08,
          tw: rnd() * TWO,
          tws: 0.2 + rnd() * 0.5,
        })
      }
    }
    this.start()
  }

  // Ensure `n` anonymous match-constellations exist; new ones trace themselves in.
  setConstellations(n) {
    n = Math.max(0, Math.floor(n))
    while (this.consts.length < n) this.addConstellation(this.consts.length < n - 1)
    while (this.consts.length > n) this.consts.pop()
    this.start()
  }

  addConstellation(instant) {
    // Keep the sky legible however long a session runs: past a cap the oldest
    // figure fades out (a constellation dissolving, not a list shifting).
    const MAX = 24
    const live = this.consts.filter((c) => !c.dying)
    if (live.length >= MAX) live[0].dying = this.t
    const idx = ++this._cSeed
    let s = (idx * 99991) >>> 0
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
    // Seat the figure INSIDE the lit disk (never the empty rim): its radius rides
    // the current fill envelope, and golden-angle sequencing keeps figures from
    // ever piling onto each other.
    const fill = Math.max(Math.sqrt(Math.max(this.stars.length, 60) / CAP) * RMAX, 0.42)
    const angC = idx * GOLDEN * 2.2
    const rC = (0.24 + rnd() * 0.5) * fill
    const cxp = Math.cos(angC) * rC
    const czp = Math.sin(angC) * rC
    const nn = 3 + Math.floor(rnd() * 3)
    const nodes = []
    for (let k = 0; k < nn; k++) {
      nodes.push({
        px: cxp + (rnd() - 0.5) * 0.15,
        pz: czp + (rnd() - 0.5) * 0.15,
        y: 0.04 + rnd() * 0.06, // floats a breath above the plane, over the stars
      })
    }
    // an open path sorted by angle around the centroid — never self-crossing
    nodes.sort((a, b) => Math.atan2(a.pz - czp, a.px - cxp) - Math.atan2(b.pz - czp, b.px - cxp))
    this.consts.push({ nodes, born: instant ? -10 : this.t, tw: rnd() * TWO, dying: 0 })
    this.start()
  }

  // The find-your-star gesture: the camera dives through the field to the
  // viewer's own star, holds while it flares, and glides back out. Reduced
  // motion trades the travel for a calm converging ring. No-op without a star.
  locateMine() {
    if (this.mineIndex < 0 || !this.stars[this.mineIndex]) return false
    if (this.reduced) this.locateFx = { t0: this.t } // clock-based: survives dt=0 draws
    else this.dive = { t: 0 }
    this.start()
    return true
  }
  hasMine() {
    return this.mineIndex >= 0 && !!this.stars[this.mineIndex]
  }

  // A tap becomes a wave in the DISK PLANE: unproject the screen point onto the
  // plane (a few Newton passes over the perspective divide), then let an
  // expanding ring sweep the disk — stars flare as the front crosses them.
  ripple(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    const tx = clientX - rect.left
    const ty = clientY - rect.top
    const rot = this._rot()
    const A = this._view(1, 0, 0, rot)
    const B = this._view(0, 0, 1, rot)
    let zc = CAM
    let a = 0, b = 0
    for (let it = 0; it < 3; it++) {
      const persp = FOCAL / zc
      const x = (tx - this.cx) / (this.unit * persp)
      const y = (ty - this.cy) / (this.unit * persp)
      const det = A.x * B.y - B.x * A.y
      if (Math.abs(det) < 1e-6) break
      a = (x * B.y - B.x * y) / det
      b = (A.x * y - x * A.y) / det
      zc = CAM + a * A.z + b * B.z
      if (zc < 0.4) zc = 0.4
    }
    const rr = Math.hypot(a, b)
    if (rr > RMAX * 1.5) {
      const f = (RMAX * 1.5) / rr
      a *= f
      b *= f
    }
    this.waves.push({ px: a, pz: b, t: 0 })
    if (this.waves.length > 3) this.waves.shift()
    this.start()
  }

  // ── projection (galaxy.js's lens, verbatim math) ────────────────────────────
  _view(px, py, pz, rot) {
    let x = px * rot.cosS + pz * rot.sinS
    let z = -px * rot.sinS + pz * rot.cosS
    const x2 = x * rot.cosY + z * rot.sinY
    const z2 = -x * rot.sinY + z * rot.cosY
    x = x2
    z = z2
    const y3 = py * rot.cosT - z * rot.sinT
    const z3 = py * rot.sinT + z * rot.cosT
    return { x, y: y3, z: z3 }
  }

  _project(px, py, pz) {
    const rot = this._rotCache
    const v = this._view(px, py, pz, rot)
    const x = v.x - this.cam.x
    const y = v.y - this.cam.y
    const zc = CAM + v.z - this.cam.z
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
    // While the dive holds a star, freeze the orientation so it sits rock-steady
    // in the crosshairs instead of swimming under the camera.
    const hold = 1 - this.focus
    const driftY = Math.sin(this.t * 0.12) * 0.06 * hold
    const yaw = this.p.x * 0.3 * hold + driftY
    const tilt = TILT + (this.p.y * 0.18 + Math.sin(this.t * 0.09) * 0.02) * hold
    return {
      cosS: Math.cos(this.spin),
      sinS: Math.sin(this.spin),
      cosY: Math.cos(yaw),
      sinY: Math.sin(yaw),
      cosT: Math.cos(tilt),
      sinT: Math.sin(tilt),
    }
  }

  // ── the loop ────────────────────────────────────────────────────────────────
  _tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts

    // the dive timeline: glide in, hold on the flaring star, glide out
    if (this.dive) {
      this.dive.t += dt
      const t = this.dive.t
      if (t < DIVE_IN) this.focus = easeInOut(t / DIVE_IN)
      else if (t < DIVE_IN + DIVE_HOLD) this.focus = 1
      else if (t < DIVE_IN + DIVE_HOLD + DIVE_OUT) this.focus = easeInOut(1 - (t - DIVE_IN - DIVE_HOLD) / DIVE_OUT)
      else {
        this.dive = null
        this.focus = 0
      }
    } else {
      this.focus = 0
    }

    if (this.reduced) {
      this.t += dt
      this._draw(0)
      const busy =
        this.locateFx ||
        this.waves.length ||
        this.stars.some((s) => s.settleAt > 0 && this.t - s.settleAt < 1.2) ||
        this.consts.some((c) => !c.dying && this.t - c.born < 2.4)
      if (!busy && this.t > 1) {
        this.running = false
        return
      }
      requestAnimationFrame(this._boundTick)
      return
    }

    this.t += dt
    this.spin += dt * 0.024 * (1 - this.focus * 0.96) // a slow, calm orbit; still under the dive
    this.p.x = lerp(this.p.x, this.pTarget.x, Math.min(1, dt * 2.5))
    this.p.y = lerp(this.p.y, this.pTarget.y, Math.min(1, dt * 2.5))
    this._draw(dt)
    requestAnimationFrame(this._boundTick)
  }

  _draw(dt) {
    const ctx = this.ctx
    const rot = (this._rotCache = this._rot())

    // the dive's camera travel: offset toward the target star in view space so
    // the WHOLE field (gas, dust, every star) flies past as one
    if (this.focus > 0.0005 && this.mineIndex >= 0 && this.stars[this.mineIndex]) {
      const slot = this._slot(this.mineIndex)
      const T = this._view(slot.px, slot.y, slot.pz, rot)
      const f = this.focus
      this.cam.x = f * T.x
      this.cam.y = f * T.y
      this.cam.z = f * (CAM + T.z - STANDOFF)
    } else {
      this.cam.x = this.cam.y = this.cam.z = 0
    }

    // as the camera commits, the field melts back so the hero star arrives alone
    const d = 1 - this.focus * 0.5
    const fillFrac = clamp(this.stars.length / CAP, 0, 1)

    // deep-space backdrop — the SAME gradient as galaxy.js, so swapping between
    // the two skies never changes the color of space itself
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

    this._drawBackground(dt, d)
    this._drawNebula(dt, d, fillFrac)

    const o = this._project(0, 0, 0) || { sx: this.cx, sy: this.cy, persp: 1 }
    this._drawCore(o, d, fillFrac)
    this._drawDiskHaze(o, d, fillFrac)
    this._drawDust(dt, d)

    if (this.forming) {
      this._drawForming(dt)
    } else {
      this._drawStars(dt, d)
      this._drawConstellations(dt, d)
    }
    this._drawWaves(dt)
    this._drawLocateFx()

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // full-frame background starfield — always fully lit: the universe is there
  // even when the community is empty; the pings are what's missing, not space.
  _drawBackground(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    const px = this.p.x, py = this.p.y
    for (const b of this.bg) {
      b.tw += dt * b.tws
      const par = (1 - b.z) * 26
      const x = b.x * this.w - px * par
      const y = b.y * this.h - py * par
      if (x < -4 || x > this.w + 4 || y < -4 || y > this.h + 4) continue
      const a = b.base * (0.5 + 0.5 * Math.sin(b.tw)) * d
      if (a <= 0.01) continue
      ctx.globalAlpha = Math.min(0.85, a)
      if (b.rad > 1.1) {
        const D = b.rad * 2.4
        ctx.drawImage(this._dotFor(b.hue), x - D / 2, y - D / 2, D, D)
      } else {
        ctx.fillStyle = b.hue
        ctx.fillRect(x - b.rad, y - b.rad, b.rad * 2, b.rad * 2)
      }
    }
  }

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

  // in-plane nebula gas. Its light grows with the community — a young sky is
  // thin and clear; a full one is milky with unresolved starlight.
  _drawNebula(dt, d, fillFrac) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    const grow = this.forming ? 0.8 : 0.55 + 0.45 * fillFrac
    for (const nb of this.nebula) {
      const pr = this._project(nb.px, nb.py, nb.pz)
      if (!pr) continue
      nb.tw += dt * nb.tws
      const rr = nb.rad * this.unit * pr.persp
      if (rr < 5 || rr > Math.max(this.w, this.h) * 1.6 || pr.sx < -rr || pr.sx > this.w + rr || pr.sy < -rr || pr.sy > this.h + rr) continue
      const a = nb.a * grow * (0.7 + 0.3 * Math.sin(nb.tw)) * d * clamp(pr.shade, 0.4, 1.2)
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

  // the luminous heart — its brightness tracks how full the galaxy is. An empty
  // community is a faint ember; a dense one glows like a real bulge.
  _drawCore(o, d, fillFrac) {
    const ctx = this.ctx
    const fill = this.forming ? 0.66 : clamp(0.16 + this.stars.length / 240, 0.16, 1)
    const coreR = Math.min(this.unit * (0.28 + 0.3 * fillFrac + (this.forming ? 0.18 : 0)) * o.persp, Math.max(this.w, this.h) * 2)
    if (!this._coreGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,236,206,0.22)')
      g.addColorStop(0.16, 'rgba(255,214,176,0.13)')
      g.addColorStop(0.46, 'rgba(214,150,120,0.05)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._coreGrad = g
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = fill * d
    ctx.translate(o.sx, o.sy)
    ctx.scale(coreR, coreR)
    ctx.fillStyle = this._coreGrad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()
  }

  // the milky wash of unresolved starlight along the tilted plane — mapped onto
  // the disk's projected ellipse so it tilts and spins with the galaxy. It only
  // exists in proportion to the stars that make it.
  _drawDiskHaze(o, d, fillFrac) {
    if (!this.forming && fillFrac < 0.02) return
    const ctx = this.ctx
    const ax = this._project(1, 0, 0)
    const az = this._project(0, 0, 1)
    if (!ax || !az) return
    const spread = this.forming ? 0.62 : 0.35 + 0.75 * Math.sqrt(fillFrac)
    const ux = (ax.sx - o.sx) * spread, uy = (ax.sy - o.sy) * spread
    const vx = (az.sx - o.sx) * spread, vy = (az.sy - o.sy) * spread
    if (!this._hazeGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,226,196,0.055)')
      g.addColorStop(0.45, 'rgba(206,170,210,0.038)')
      g.addColorStop(0.8, 'rgba(150,150,200,0.014)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._hazeGrad = g
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = d * (this.forming ? 0.7 : clamp(0.3 + fillFrac, 0, 1))
    ctx.transform(ux, uy, vx, vy, o.sx, o.sy)
    ctx.fillStyle = this._hazeGrad
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()
  }

  _drawDust(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.dust) {
      const pr = this._project(p.px, p.py, p.pz)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      p.tw += dt * p.tws
      const a = p.base * (0.7 + 0.3 * Math.sin(p.tw)) * d * clamp(pr.shade, 0.3, 1.2)
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.5, a)
      const D = clamp(p.rad * pr.persp * 2.4, 1.4, this.h * 0.3)
      ctx.fillStyle = p.warm ? PAL.warm : PAL.cream
      const s = D * 0.4
      ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
    }
  }

  // ── the ping stars ──────────────────────────────────────────────────────────
  _drawStars(dt, d) {
    const ctx = this.ctx
    const glowQ = []
    const meteors = []
    const focusing = this.focus > 0.001
    const waves = this.waves

    for (const st of this.stars) {
      const slot = this._slot(st.i)

      // METEOR — streaking in; drawn in a top pass so trails ride over the field
      if (st.state === 'meteor') {
        if (this.t >= st.born) meteors.push(st)
        continue
      }

      const pr = this._project(slot.px, slot.y, slot.pz)
      if (!pr || pr.sx < -40 || pr.sx > this.w + 40 || pr.sy < -40 || pr.sy > this.h + 40) continue
      slot.phase += dt * slot.tws

      // seeded stars settle in on a stagger; launched stars are already lit
      let settle = 1
      if (st.settleAt > 0) settle = smooth(clamp((this.t - st.settleAt) / 0.9, 0, 1))

      // the wavefront of a tap flares stars as it crosses them
      let flare = 0
      for (const w of waves) {
        const p = w.t / 1.25
        if (p >= 1) continue
        const R = easeOut(p) * 0.95
        const dp = Math.hypot(slot.px - w.px, slot.pz - w.pz)
        flare += Math.exp(-((dp - R) * (dp - R)) / 0.007) * (1 - p)
      }
      flare = Math.min(flare, 1)

      // the freshly-ignited glisten (the beat after a meteor lands)
      let ignite = 0
      if (st.state === 'ignite') {
        const q = (this.t - st.igniteAt) / IGNITE_DUR
        if (q >= 1) st.state = 'rest'
        else ignite = Math.sin(Math.PI * clamp(q, 0, 1))
      }

      const isMine = st.mine
      // during a dive everything but the hero melts back into the depth
      const fade = focusing ? (isMine ? 1 : 1 - 0.82 * this.focus) : 1
      const tw = 0.7 + 0.3 * Math.sin(slot.phase)
      const a = (slot.base * tw * pr.shade * settle + flare * 0.5) * fade
      if (a <= 0.004 && !isMine) continue

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = Math.min(0.96, a * 1.5)
      const D = clamp(slot.rad * pr.persp * 3, 1.9, this.h * 0.5) * (1 + ignite * 1.1 + flare * 0.5) * (isMine ? 1.3 : 1)
      if (D >= 2.4 || a >= 0.34 || focusing) {
        ctx.drawImage(this._dotFor(isMine ? this.you : slot.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
      } else {
        ctx.fillStyle = slot.hue
        const s = D * 0.42
        ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
      }
      if (slot.glow || ignite > 0 || flare > 0.25 || isMine) glowQ.push([pr, slot, a, ignite, flare, isMine])
    }

    // additive pass: tinted blooms; diffraction spikes on ignition + the brightest
    ctx.globalCompositeOperation = 'lighter'
    for (const [pr, slot, a, ignite, flare, isMine] of glowQ) {
      const hue = isMine ? this.you : slot.hue
      const sz = slot.rad * (7 + ignite * 10 + flare * 5) * pr.persp * (isMine ? 1.4 : 1)
      ctx.globalAlpha = Math.min(0.6, a * 0.7 + ignite * 0.4 + flare * 0.3)
      ctx.drawImage(this._glowFor(hue), pr.sx - sz / 2, pr.sy - sz / 2, sz, sz)
      if (ignite > 0) {
        const ss = 22 + ignite * 34
        ctx.globalAlpha = ignite * 0.85
        ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      } else if (a > 0.5 && slot.glow) {
        const ss = sz * 2.4
        ctx.globalAlpha = Math.min(0.2, (a - 0.5) * 0.3)
        ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      }
    }

    // the viewer's own star: a soft breathing ring, always findable in the crowd —
    // and the hero the dive is flying toward.
    if (this.mineIndex >= 0 && this.stars[this.mineIndex] && this.stars[this.mineIndex].state !== 'meteor') {
      const slot = this._slot(this.mineIndex)
      const pr = this._project(slot.px, slot.y, slot.pz)
      if (pr) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.7)
        const f = this.focus
        ctx.globalCompositeOperation = 'lighter'
        const gs = (9 + pulse * 3) * (1 + f * 3)
        ctx.globalAlpha = 0.4 + 0.35 * pulse + f * 0.25
        ctx.drawImage(this.glows.you, pr.sx - gs, pr.sy - gs, gs * 2, gs * 2)
        ctx.globalAlpha = (0.3 + 0.3 * pulse) * (1 - f) + f * 0.85
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(pr.sx, pr.sy, (6.5 + pulse * 1.6) * (1 + f * 2.4), 0, TWO)
        ctx.stroke()
        // at the dive's arrival the star burns with its full photographic flare
        if (f > 0.65) {
          const fl = smooth((f - 0.65) / 0.35)
          const ss = 40 + fl * 46 + pulse * 6
          ctx.globalAlpha = fl * (0.55 + 0.25 * pulse)
          ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
          ctx.globalAlpha = 1
          const cd = 7 + fl * 5
          ctx.drawImage(this._dotFor('#FFFFFF'), pr.sx - cd, pr.sy - cd, cd * 2, cd * 2)
        }
      }
    }

    // meteors last, over everything — the newest light crossing the whole sky
    for (const st of meteors) this._drawMeteor(st, dt)
  }

  // A slim shooting star: a tapering gradient streak decelerating into its slot.
  // The head is a hot point with a small halo; the tail thins to nothing.
  _drawMeteor(st, dt) {
    const ctx = this.ctx
    const slot = this._slot(st.i)
    const pr = this._project(slot.px, slot.y, slot.pz)
    if (!pr) {
      // landing point swung behind the camera (deep in a dive) — settle silently
      st.state = 'rest'
      st.trail = null
      return
    }
    const p = clamp((this.t - st.born) / METEOR_DUR, 0, 1)
    if (p >= 1) {
      st.state = 'ignite'
      st.igniteAt = this.t
      st.trail = null
      return
    }
    const e = easeOut(p)
    // a gently bowed arc from the entry point to the (live-projected) slot
    const mx = (st.ox + pr.sx) / 2 - (pr.sy - st.oy) * st.bow
    const my = (st.oy + pr.sy) / 2 + (pr.sx - st.ox) * st.bow
    const x = (1 - e) * (1 - e) * st.ox + 2 * (1 - e) * e * mx + e * e * pr.sx
    const y = (1 - e) * (1 - e) * st.oy + 2 * (1 - e) * e * my + e * e * pr.sy

    st.trail.push([x, y])
    if (st.trail.length > 15) st.trail.shift()
    if (st.trail.length < 2) return

    ctx.globalCompositeOperation = 'lighter'
    const [yr, yg, yb] = hexToRgb(this.you)
    // the streak fades in as it enters and never spans the frame: walk BACK from
    // the head, accumulating at most ~a hand's width of tail, alphas rising
    // toward the head and widths tapering away from it. During a dive the live
    // traffic melts back with the rest of the field so the hero star holds alone.
    const enter = smooth(clamp(p / 0.2, 0, 1)) * (1 - this.focus * 0.75)
    const MAXLEN = Math.min(this.w, this.h) * 0.34
    let len = 0
    ctx.lineCap = 'round'
    for (let k = st.trail.length - 1; k >= 1; k--) {
      const ax = st.trail[k][0], ay = st.trail[k][1]
      const bx = st.trail[k - 1][0], by = st.trail[k - 1][1]
      const seg = Math.hypot(ax - bx, ay - by)
      len += seg
      if (len > MAXLEN) break
      const f = 1 - len / MAXLEN // 1 at the head → 0 at the tail's end
      ctx.globalAlpha = f * f * 0.55 * enter
      ctx.strokeStyle = f > 0.8 ? 'rgba(255,250,244,0.95)' : `rgba(${yr},${yg},${yb},0.8)`
      ctx.lineWidth = 0.3 + f * 1.6
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
    // the hot head
    ctx.globalAlpha = 0.5 * enter
    ctx.drawImage(this.glows.you, x - 7, y - 7, 14, 14)
    ctx.globalAlpha = enter
    ctx.drawImage(this._dotFor('#FFFFFF'), x - 4, y - 4, 8, 8)
  }

  // ── the anonymous match-constellations ──────────────────────────────────────
  // Small asterisms living IN the disk, riding its rotation. A newborn figure is
  // traced by a travelling spark, node to node; a retiring one dissolves.
  _drawConstellations(dt, d) {
    const ctx = this.ctx
    const fade = 1 - this.focus * 0.85
    if (fade <= 0.02) return
    const gone = []
    for (const cn of this.consts) {
      cn.tw += dt * 0.6
      const shimmer = 0.6 + 0.4 * Math.sin(cn.tw)
      let life = 1
      if (cn.dying) {
        life = 1 - clamp((this.t - cn.dying) / 1.2, 0, 1)
        if (life <= 0) {
          gone.push(cn)
          continue
        }
      }
      const reveal = clamp((this.t - cn.born) / 2.0, 0, 1)
      const pts = []
      let vis = true
      let depth = 0
      for (const n of cn.nodes) {
        const pr = this._project(n.px, n.y, n.pz)
        if (!pr) {
          vis = false
          break
        }
        depth += pr.shade
        pts.push(pr)
      }
      if (!vis) continue
      depth = clamp(depth / pts.length, 0.4, 1.1) // back-side figures sit dimmer

      const segs = pts.length - 1
      const frontier = reveal * segs
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      let sparkX = null, sparkY = null
      for (let k = 0; k < segs; k++) {
        const segReveal = clamp(frontier - k, 0, 1)
        if (segReveal <= 0) break
        const a = pts[k], b = pts[k + 1]
        const bx = lerp(a.sx, b.sx, segReveal)
        const by = lerp(a.sy, b.sy, segReveal)
        if (segReveal < 1) {
          sparkX = bx
          sparkY = by
        }
        const grd = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy)
        grd.addColorStop(0, this._rgba(this.them, 0.04))
        grd.addColorStop(0.5, `rgba(245,236,246,${0.2 * shimmer})`)
        grd.addColorStop(1, this._rgba(this.you, 0.13 * shimmer))
        ctx.strokeStyle = grd
        ctx.globalAlpha = life * depth * fade
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
      // nodes pop as the frontier passes them: a rose glow + a white point,
      // with a brief glint right when each one lights
      for (let k = 0; k < pts.length; k++) {
        const on = clamp(frontier - (k - 1), 0, 1)
        if (on <= 0) continue
        const pt = pts[k]
        const glint = reveal < 1 ? clamp(1 - Math.abs(frontier - k) * 1.6, 0, 1) : 0
        ctx.globalAlpha = (0.34 * shimmer + glint * 0.45) * life * depth * fade
        const gs = 4.5 + glint * 5
        ctx.drawImage(this.glows.them, pt.sx - gs, pt.sy - gs, gs * 2, gs * 2)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = (0.72 * shimmer + glint * 0.28) * life * depth * fade
        const ds = 2.1 + glint * 1.7
        ctx.drawImage(this._dotFor('#FFFFFF'), pt.sx - ds, pt.sy - ds, ds * 2, ds * 2)
        ctx.globalCompositeOperation = 'lighter'
        if (glint > 0.35) {
          const ss = 12 + glint * 12
          ctx.globalAlpha = glint * 0.55 * life * fade
          ctx.drawImage(this._spike, pt.sx - ss / 2, pt.sy - ss / 2, ss, ss)
        }
      }
      // the travelling spark drawing the figure
      if (sparkX != null && reveal < 1) {
        ctx.globalAlpha = 0.9 * fade
        ctx.drawImage(this._dotFor('#FFFFFF'), sparkX - 3, sparkY - 3, 6, 6)
        ctx.globalAlpha = 0.5 * fade
        ctx.drawImage(this.glows.them, sparkX - 8, sparkY - 8, 16, 16)
      }
    }
    for (const g of gone) {
      const at = this.consts.indexOf(g)
      if (at >= 0) this.consts.splice(at, 1)
    }
  }

  // ── the forming proto-galaxy ────────────────────────────────────────────────
  // Swirling knots of luminous gas + uncountable sub-resolution motes, orbiting
  // the ember heart. Enough to read as "something is gathering here" without
  // ever being countable — the privacy floor, made visible.
  _drawForming(dt) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const g of this.gas) {
      g.ang += dt * g.spd
      g.tw += dt * g.tws
      const pr = this._project(Math.cos(g.ang) * g.r, g.y, Math.sin(g.ang) * g.r)
      if (!pr) continue
      const rr = g.rad * this.unit * pr.persp
      const a = g.a * (0.7 + 0.3 * Math.sin(g.tw)) * clamp(pr.shade, 0.4, 1.2)
      if (a <= 0.003 || rr < 4) continue
      ctx.save()
      ctx.globalAlpha = clamp(a, 0, 1)
      ctx.translate(pr.sx, pr.sy)
      ctx.scale(rr, rr)
      ctx.fillStyle = this._nebGradFor(g.col)
      ctx.beginPath()
      ctx.arc(0, 0, 1, 0, TWO)
      ctx.fill()
      ctx.restore()
    }
    for (const m of this.motes) {
      m.ang += dt * m.spd
      m.tw += dt * m.tws
      const pr = this._project(Math.cos(m.ang) * m.r, m.y, Math.sin(m.ang) * m.r)
      if (!pr) continue
      const a = 0.2 * (0.5 + 0.5 * Math.sin(m.tw)) * clamp(pr.shade, 0.3, 1.1)
      if (a <= 0.01) continue
      ctx.globalAlpha = a
      const sz = (5.5 + 3 * Math.sin(m.tw * 0.7)) * pr.persp
      ctx.drawImage(this.glows.you, pr.sx - sz, pr.sy - sz, sz * 2, sz * 2)
    }
    ctx.globalAlpha = 1
  }

  // ── the tap wave ────────────────────────────────────────────────────────────
  // Two rings sweep the disk PLANE (sampled + projected, so they tilt with the
  // galaxy) — amber leading into rose. The stars they cross flare in _drawStars.
  _drawWaves(dt) {
    if (!this.waves.length) return
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    this.waves = this.waves.filter((w) => {
      w.t += dt
      const dur = 1.25
      const p = w.t / dur
      if (p >= 1) return false
      // the touch blooms once, right where the finger met the plane
      const flash = clamp(1 - p / 0.25, 0, 1)
      if (flash > 0) {
        const pr = this._project(w.px, 0, w.pz)
        if (pr) {
          const fs = (14 + (1 - flash) * 26) * pr.persp
          ctx.globalAlpha = flash * 0.45
          ctx.drawImage(this.glows.you, pr.sx - fs, pr.sy - fs, fs * 2, fs * 2)
        }
      }
      for (let k = 0; k < 2; k++) {
        const pk = clamp(p - k * 0.12, 0, 1)
        if (pk <= 0) continue
        const R = easeOut(pk) * (0.95 + k * 0.15)
        const alpha = (1 - pk) * (0.3 - k * 0.1)
        if (alpha <= 0.01) continue
        ctx.globalAlpha = alpha
        ctx.strokeStyle = this._rgba(k === 0 ? this.you : this.them, 0.9)
        ctx.lineWidth = 1.6 - k * 0.5
        ctx.beginPath()
        let started = false
        for (let sgm = 0; sgm <= 42; sgm++) {
          const a = (sgm / 42) * TWO
          const pr = this._project(w.px + Math.cos(a) * R, 0, w.pz + Math.sin(a) * R)
          if (!pr) {
            started = false
            continue
          }
          if (!started) {
            ctx.moveTo(pr.sx, pr.sy)
            started = true
          } else ctx.lineTo(pr.sx, pr.sy)
        }
        ctx.stroke()
      }
      return true
    })
  }

  // reduced-motion "find your star": a calm converging ring, no camera travel
  _drawLocateFx() {
    if (!this.locateFx) return
    const st = this.stars[this.mineIndex]
    if (!st) {
      this.locateFx = null
      return
    }
    const slot = this._slot(this.mineIndex)
    const pr = this._project(slot.px, slot.y, slot.pz)
    const dur = 1.7
    const p = (this.t - this.locateFx.t0) / dur
    if (p >= 1 || !pr) {
      this.locateFx = null
      return
    }
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    const conv = easeOut(clamp(p / 0.65, 0, 1))
    const R = (1 - conv) * this.unit * 0.4 + 8
    ctx.globalAlpha = (1 - p) * 0.6
    ctx.strokeStyle = this._rgba(this.you, 0.95)
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(pr.sx, pr.sy, R, 0, TWO)
    ctx.stroke()
    const flare = clamp((p - 0.55) / 0.45, 0, 1)
    if (flare > 0) {
      const bell = Math.sin(Math.PI * flare)
      const sz = 12 + bell * 22
      ctx.globalAlpha = bell * 0.9
      ctx.drawImage(this.glows.you, pr.sx - sz, pr.sy - sz, sz * 2, sz * 2)
      ctx.globalAlpha = 1
      ctx.drawImage(this._dotFor('#FFFFFF'), pr.sx - 6, pr.sy - 6, 12, 12)
    }
  }

  _rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
  }
}

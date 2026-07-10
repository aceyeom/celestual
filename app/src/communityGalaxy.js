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
// It shares the backdrop galaxy's visual language on purpose — the same deep-
// space gradient, perspective camera and tilt, soft round star sprites and
// nebula gas — so the moment the app swaps backdrops reads as turning to face a
// different part of the SAME universe, never a cheaper one.
//
// The live mechanics:
//   · ping stars seat on two feathered logarithmic arms winding out of a dense
//     golden bulge, with a thin inter-arm field — a deterministic slot per
//     index, filling from the core outward, so a small community is a tight
//     young galaxy and a big one sprawls into a true spiral (never a blob).
//     Unresolved arm-dust and arm-seated gas grow with the population, so the
//     spiral's silhouette reads at every size. Size is FELT, never merely read.
//   · the whole scene is volumetric: a deep 3D shell of field stars surrounds
//     the disk, so any camera travel (a zoom, a dive) streams real depth past
//     the viewer instead of scaling a flat picture.
//   · stars render as points of LIGHT, not textures: approach makes a star
//     brighter and gives it diffraction spikes — it never swells into a soft
//     pixel blob, however deep the zoom goes.
//   · a new ping arrives as a METEOR: a slim streak that decelerates out of deep
//     space into its slot and ignites with a diffraction-spike glisten, then
//     settles to a twinkle.
//   · matches trace themselves in as in-disk asterisms — a travelling spark
//     draws the light-threads node to node; the figures ride the disk rotation.
//   · below the privacy floor the community is FORMING: a slowly swirling proto-
//     galaxy of luminous gas and uncountable motes.
//   · the sky is HANDLED, not watched: drag orbits the disk, pinch (or wheel,
//     or a double-tap) dives the camera toward the exact point touched — with
//     real depth parallax — and a drag while zoomed pans across the field.
//     The view rests where the hand leaves it; resetView() glides home.
//     Gestures live only where the screen enables them (setZoomEnabled).
//   · a plain tap still sends a wave through the disk PLANE; stars the
//     wavefront crosses flare briefly — the sky answers the hand.
//   · locateMine() flies the camera THROUGH the field to the viewer's own star
//     (neighbours streaming past), holds on it while it flares, then eases back.
//   · the viewer's own stars are radiant four-spike beacons, each tinted by who
//     the ping is to them (crush / ex / friend / complicated — theme.js's
//     CATEGORY_TINTS, the same hues the options tab introduces).
//   · opted-in public @s render ONLY where the screen turns them on
//     (setTagsEnabled) and self-declutter — overlapping tags yield, fading,
//     so the sky never piles handles into a glitchy heap.
//
// Dependency-free canvas, one rAF loop, honors prefers-reduced-motion, pauses
// on a hidden tab, and degrades gracefully under load: a frame-time governor
// steps the backing resolution and decorative density down (and back up) so a
// thousand-star sky stays fluid on a weak phone.

import { CATEGORY_TINTS } from './theme.js'

function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── sprites ───────────────────────────────────────────────────────────────────
// All the light in the sky comes from three pre-baked sprites per hue, cached.
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
// A point of light: a hard white-hot core dropping fast through the star's own
// hue to a tight halo. The energy is concentrated in the middle third, so the
// sprite stays a crisp STAR when drawn small and never becomes a soft disc
// when drawn large — the falloff carries the "point source" read at any scale.
function makeStarSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  const wr = (r + 255 * 2) / 3, wg = (g + 255 * 2) / 3, wb = (b + 255 * 2) / 3
  const grd = c.createRadialGradient(m, m, 0, m, m, m)
  grd.addColorStop(0.0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.16, `rgba(${wr | 0},${wg | 0},${wb | 0},0.98)`)
  grd.addColorStop(0.34, `rgba(${r},${g},${b},0.55)`)
  grd.addColorStop(0.55, `rgba(${r},${g},${b},0.18)`)
  grd.addColorStop(0.8, `rgba(${r},${g},${b},0.04)`)
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.beginPath()
  c.arc(m, m, m, 0, Math.PI * 2)
  c.fill()
  return s
}
// Four soft diffraction spikes — the photographic signature of a bright star
// through a lens. White-hot at the crossing, feathering into the given hue.
function makeSpikeSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  for (const horiz of [true, false]) {
    const g1 = horiz ? c.createLinearGradient(0, m, size, m) : c.createLinearGradient(m, 0, m, size)
    g1.addColorStop(0, `rgba(${r},${g},${b},0)`)
    g1.addColorStop(0.28, `rgba(${r},${g},${b},0.28)`)
    g1.addColorStop(0.5, `rgba(255,255,255,0.92)`)
    g1.addColorStop(0.72, `rgba(${r},${g},${b},0.28)`)
    g1.addColorStop(1, `rgba(${r},${g},${b},0)`)
    c.fillStyle = g1
    const th = Math.max(1, size * 0.012)
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

// Stellar palette — warm gold bulge, cream body, cool young arms, rare red
// giant. The community's own two lights (`you`, `them`) join it at runtime.
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
const P0 = FOCAL / CAM // resting perspective at the galactic center

// how many pings map the disk to (nearly) full frame; the disk fills from the
// heart outward with √-area growth, so the size of a community is felt.
const CAP = 1200
const RMAX = 1.05 // disk radius (world units) at full cap
const PITCH = 3.3 // how far each arm winds over the disk (rad at r = RMAX)
const armAngle = (arm, r) => arm * Math.PI + (r / RMAX) * PITCH

const METEOR_DUR = 1.15 // seconds a new ping streaks in
const IGNITE_DUR = 0.55 // the glisten when it lands
// The find-your-star dive: a deliberate, time-driven camera glide (in → hold on
// the flaring star → back out), the same cinematic grammar as galaxy.js's focus.
const DIVE_IN = 1.5
const DIVE_HOLD = 1.9 // long enough to read the @ resting over the star
const DIVE_OUT = 0.95
const STANDOFF = 0.34 // how close (camera-space z) the dive comes to rest

// The hand-driven camera. Zoom is a real dolly toward a point on the disk plane
// (nearer stars spread faster than far ones — depth, not scale). It RESTS where
// the hand leaves it; nothing snaps back on a timer. Orbit is full-axis: the
// hand can swing all the way around the disk and well over/under its plane —
// the sky is a place to move through, not a picture to nudge.
const ZOOM_MAX = 14
const DBLTAP_STEP = 2.6 // magnification per double-tap
const ORBIT_YAW_MAX = Math.PI // a full swing either way around the disk
const ORBIT_PITCH_MIN = -1.15
const ORBIT_PITCH_MAX = 1.15

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
    this.stars = [] // one per ping: { i, born, state, settleAt, mine, label, kind, ox, oy, trail }
    this.consts = [] // one per mutual match: { nodes, born, tw, dying }
    this._slots = [] // deterministic disk slot per ping index (built lazily)
    this._cSeed = 0
    // The viewer's OWN stars — one per ping this device placed, each carrying its
    // device-held plaintext @ and who that ping is to them (the category tint):
    // [{ st, label, kind }]. A list, not a single index, so "find your star"
    // resolves with any number of standing pings and survives a remount.
    this.mine = []
    this.mineCursor = 0 // which own star an unlabelled locate visits next
    this.diveSt = null // the star the running dive is flying to
    this.diveLabel = null // its @, drawn over the star at arrival
    this.diveDist = 1 // pinch-adjustable standoff multiplier for a HELD dive
    // Opted-in public @s — members who chose to announce themselves in this sky.
    this.publicList = []
    this.ownPublic = null // the viewer's own @ when they've flipped public
    this.publicTags = [] // seated tags: [{ st, label, own, tw, vis }]
    this.tagsEnabled = false // only the community screen turns the @s on
    this.onTagTap = null // (label, own) → the screen answers a tapped public @

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

    // The hand-driven camera: `zoom` eases toward `zoomTarget` (a dolly toward
    // `zoomFocus`, a point on the disk plane); `orbit` is the drag-steered
    // yaw/pitch with release inertia. All of it live only where the screen
    // enables it (setZoomEnabled), so ambient backdrop taps never zoom.
    this.zoomEnabled = false
    this.zoom = 1
    this.zoomTarget = 1
    this.zoomFocus = { px: 0, pz: 0 }
    this._zoomActive = false
    this.onZoomState = null // (isZoomed:boolean) → screen fades chrome while zoomed
    this.orbit = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0 }
    this.gest = { pts: new Map(), mode: null, sx: 0, sy: 0, lx: 0, ly: 0, downT: 0, dist0: 1, zoom0: 1, lastTap: 0, lastTapX: 0, lastTapY: 0, vyaw: 0, vpitch: 0 }
    this._interactAt = -10

    // the frame-time governor: quality steps 0 (full) → 2 (lean). It only ever
    // trades resolution and decoration — the countable pings always render.
    this.qLevel = 0
    this._ftEma = 16
    this._qAt = 0
    this.dprEff = this.dpr

    this._dotCache = {}
    this._glowCache = {}
    this._spikeCache = {}
    this.glows = { you: makeGlow(this.you, 64), them: makeGlow(this.them, 64), white: makeGlow('#FFFFFF', 64) }
    this._spike = makeSpikeSprite('#FFFFFF', 128)

    this._genDecor()
    this._boundTick = (ts) => this._tick(ts)
    this._bind()
    this.resize()
  }

  // Source sprites are generously sized (a zoom magnifies the whole field, and a
  // small sprite blown up reads as a stepped blob); drawImage cost tracks the
  // DESTINATION size, so the crispness is free.
  _dotFor(hex) {
    if (!this._dotCache[hex]) this._dotCache[hex] = makeStarSprite(hex, 128)
    return this._dotCache[hex]
  }
  _glowFor(hex) {
    if (!this._glowCache[hex]) this._glowCache[hex] = makeGlow(hex, 64)
    return this._glowCache[hex]
  }
  _spikeFor(hex) {
    if (!this._spikeCache[hex]) this._spikeCache[hex] = makeSpikeSprite(hex, 128)
    return this._spikeCache[hex]
  }

  // ── the scene dressing (mood, never counted) ────────────────────────────────
  // A volumetric shell of deep-field stars all around the disk, foreground dust
  // and arm-seated nebula gas. Every layer is a real 3D point through the same
  // lens, so camera travel streams depth past the viewer — an EMPTY community
  // still opens onto a real universe (the pings are what's missing, not the
  // cosmos).
  _genDecor() {
    let s = 90217
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5
    const mobile = window.innerWidth < 540

    // the deep field — a shell of far suns (2.4 → 8 world units out), denser
    // near, thinning with distance. They barely move at rest; they STREAM when
    // the camera dives.
    this.shell = []
    const sn = mobile ? 300 : 460
    for (let i = 0; i < sn; i++) {
      const rr = 2.4 + Math.pow(rnd(), 1.5) * 5.6
      const v = rnd() * 2 - 1
      const u = rnd() * TWO
      const ring = Math.sqrt(1 - v * v)
      this.shell.push({
        px: rr * ring * Math.cos(u),
        py: rr * v * 0.85,
        pz: rr * ring * Math.sin(u),
        rad: rnd() < 0.9 ? 0.5 + rnd() * 0.75 : 1.1 + rnd() * 0.9,
        base: 0.14 + rnd() * 0.5,
        hue: rnd() < 0.16 ? PAL.blue : rnd() < 0.22 ? PAL.warm : '#FFFFFF',
        tw: rnd() * TWO,
        tws: 0.15 + rnd() * 0.7,
      })
    }

    // near dust — sparse motes floating between the camera and the disk, the
    // strongest parallax layer of all.
    this.dust = []
    const dn = mobile ? 80 : 130
    for (let i = 0; i < dn; i++) {
      this.dust.push({
        px: (rnd() - 0.5) * 4.2,
        py: (rnd() - 0.5) * 2.2,
        pz: (rnd() - 0.5) * 4.2,
        rad: 0.3 + rnd() * 0.7,
        base: 0.05 + rnd() * 0.16,
        tw: rnd() * TWO,
        tws: 0.1 + rnd() * 0.4,
        warm: rnd() < 0.12,
      })
    }

    // arm dust — unresolved starlight seeded along the same spiral equation the
    // pings seat on, so the arms read as continuous luminous lanes. Its light is
    // gated by the population envelope at draw time: a young community keeps a
    // tight silhouette, a grown one wears the full spiral.
    this.armDust = []
    const an = mobile ? 360 : 520
    for (let i = 0; i < an; i++) {
      // two in three ride the arm lanes; the rest pool into the bulge, so the
      // heart stays milky and golden however the camera holds it
      const core = rnd() < 0.34
      const r = core ? 0.03 + Math.pow(rnd(), 1.4) * 0.24 : 0.1 + Math.pow(rnd(), 0.7) * (RMAX - 0.08)
      const arm = i % 2
      const ang = core ? rnd() * TWO : armAngle(arm, r) + gauss() * (0.12 + 0.12 * (r / RMAX))
      this.armDust.push({
        px: Math.cos(ang) * r,
        pz: Math.sin(ang) * r,
        y: gauss() * (core ? 0.05 : 0.012 + 0.04 * Math.exp(-r * 2.6)),
        r,
        rad: 0.5 + rnd() * 0.9,
        base: 0.08 + rnd() * 0.2,
        hue: r > 0.55 ? (rnd() < 0.5 ? PAL.blue : PAL.cream) : rnd() < 0.5 ? PAL.gold : PAL.warm,
        tw: rnd() * TWO,
        tws: 0.2 + rnd() * 0.5,
      })
    }

    // the near-field passers — loose stars adrift between the camera and the
    // disk. Each carries a slow drift of its own, so even a resting sky has a
    // few quietly passing by; the moment the camera travels (a zoom, a dive,
    // an orbit) they streak past with true depth — near ones fast and bright,
    // far ones slow and faint.
    this.passers = []
    const pn = mobile ? 34 : 50
    for (let i = 0; i < pn; i++) {
      this.passers.push({
        px: (rnd() - 0.5) * 4.8,
        py: (rnd() - 0.5) * 3.0,
        pz: (rnd() - 0.5) * 4.8,
        vx: (rnd() - 0.5) * 0.05,
        vy: (rnd() - 0.5) * 0.02,
        vz: (rnd() - 0.5) * 0.05,
        rad: 0.5 + rnd() * 1.1,
        base: 0.1 + rnd() * 0.28,
        hue: rnd() < 0.2 ? PAL.blue : rnd() < 0.28 ? PAL.warm : '#FFFFFF',
        lx: null,
        ly: null,
      })
    }

    // nebula gas — knots of luminous cloud riding the arms (cool, star-forming
    // blues and violets) with a warm pair resting in the bulge.
    this.nebula = []
    const NCOL = [PAL.blue, '#7E6BA8', '#C77E8A', '#5E7BB0']
    for (let i = 0; i < 10; i++) {
      const inCore = i < 2
      const r = inCore ? 0.08 + rnd() * 0.14 : 0.28 + rnd() * 0.62
      const ang = inCore ? rnd() * TWO : armAngle(i % 2, r) + gauss() * 0.16
      this.nebula.push({
        px: Math.cos(ang) * r,
        py: gauss() * 0.06,
        pz: Math.sin(ang) * r,
        rad: 0.22 + rnd() * 0.4,
        col: inCore ? PAL.warm : NCOL[Math.floor(rnd() * NCOL.length)],
        a: 0.045 + rnd() * 0.05,
        r,
        tw: rnd() * TWO,
        tws: 0.05 + rnd() * 0.12,
      })
    }
  }

  // ── the deterministic disk slot for the i-th ping ───────────────────────────
  // Radius grows with √index (even area fill, heart outward — the community's
  // size is its silhouette). A real share of stars feeds a dense golden BULGE;
  // most of the rest seat on two logarithmic arms that wind ~three-quarters of
  // a turn each, feathered tight enough to stay legible as arms; a thin
  // inter-arm field keeps the disk from reading as two painted stripes.
  // Deterministic in i: a star never moves once placed.
  _slot(i) {
    if (this._slots[i]) return this._slots[i]
    let s = (i * 2654435761 + 0x9e3779b9) >>> 0
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

    let r = Math.sqrt((i + 0.5) / CAP) * RMAX
    const kind = rnd()
    let ang, y
    let arm = false
    if (r < 0.15 || kind < 0.16) {
      // the bulge — a bright oblate spheroid, dense and golden at any count
      ang = rnd() * TWO
      r *= 0.5 + rnd() * 0.55
      y = gauss() * (0.045 + 0.035 * Math.exp(-r * 4))
    } else if (kind < 0.84) {
      // an arm star — two arms winding with radius, feathered by a tight
      // gaussian that widens gently toward the rim, plus radial scatter so the
      // lanes read organic, never drafted
      arm = true
      r = clamp(r + gauss() * 0.04, 0.1, RMAX)
      ang = armAngle(i % 2, r) + gauss() * (0.11 + 0.13 * (r / RMAX))
      y = gauss() * (0.014 + 0.045 * Math.exp(-r * 2.6))
    } else {
      // inter-arm field star — present, but visibly quieter than the lanes
      ang = rnd() * TWO
      y = gauss() * (0.018 + 0.04 * Math.exp(-r * 2.2))
    }

    // hue by radius (gold heart → cream body → young blue arms), seasoned with
    // the community's own two lights and the rare red giant
    const cr = rnd()
    let hue
    if (r < 0.28) hue = cr < 0.55 ? PAL.gold : cr < 0.85 ? PAL.warm : PAL.cream
    else if (r < 0.66) hue = cr < 0.14 ? PAL.warm : cr < 0.72 ? PAL.cream : PAL.blue
    else hue = cr < 0.5 ? PAL.blue : cr < 0.64 ? PAL.ice : PAL.cream
    if (cr > 0.985) hue = PAL.red
    else if (cr > 0.958) hue = this.you
    else if (cr > 0.944) hue = this.them

    const slot = {
      px: Math.cos(ang) * r,
      pz: Math.sin(ang) * r,
      y,
      r,
      hue,
      // each ping is a resolved star, not dust — big and bright enough that the
      // countable population owns the sky over every decorative layer. Arm
      // stars burn a touch brighter than the inter-arm field: the contrast is
      // what makes the spiral legible.
      rad: 0.75 + rnd() * 1.05,
      base: (0.54 + rnd() * 0.44) * (1 - r * 0.14) * (arm || r < 0.3 ? 1 : 0.8),
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
      // ambient parallax only — a live drag/pinch owns the pointer
      if (this.gest.mode === 'drag' || this.gest.mode === 'pinch') return
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
    this._gDown = (e) => this._gestureDown(e)
    this._gMove = (e) => this._gestureMove(e)
    this._gUp = (e) => this._gestureUp(e)
    this._gWheel = (e) => this._gestureWheel(e)
    window.addEventListener('resize', this._onResize)
    document.addEventListener('visibilitychange', this._onVis)
    window.addEventListener('pointerdown', this._gDown, { passive: true })
    window.addEventListener('pointermove', this._gMove, { passive: true })
    window.addEventListener('pointerup', this._gUp, { passive: true })
    window.addEventListener('pointercancel', this._gUp, { passive: true })
    window.addEventListener('wheel', this._gWheel, { passive: true })
    if (!this.reduced) {
      window.addEventListener('pointermove', this._onPointer, { passive: true })
      window.addEventListener('deviceorientation', this._onTilt, { passive: true })
    }
  }

  resize(force) {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width || window.innerWidth || 402
    const h = rect.height || window.innerHeight || 760
    // Ignore the small height-only changes of the collapsing mobile URL bar
    // (reallocating the backing store every toolbar frame reads as vibration).
    if (!force && this.w && w === this.w && Math.abs(h - this.h) < 130) return
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * this.dprEff)
    this.canvas.height = Math.round(h * this.dprEff)
    this.ctx.setTransform(this.dprEff, 0, 0, this.dprEff, 0, 0)
    // Frame the disk generously: the sky is a place, not a picture, so the
    // rim is ALLOWED to spill past the frame — on a phone the outer stars
    // bleed off both edges (space keeps going past the glass) and on a wide
    // monitor the field reads expansive rather than contained.
    this.unit = Math.min(w * 0.8, h * 0.52) + Math.max(w, h) * 0.04
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
    window.removeEventListener('pointerdown', this._gDown)
    window.removeEventListener('pointermove', this._gMove)
    window.removeEventListener('pointerup', this._gUp)
    window.removeEventListener('pointercancel', this._gUp)
    window.removeEventListener('wheel', this._gWheel)
  }

  // ── the live API (what the app drives) ──────────────────────────────────────
  get count() {
    return this.stars.length
  }
  get matchCount() {
    return this.consts.length
  }

  // A viewer's-own entry arrives as a plain label or { label, kind } — kind is
  // who the ping is to them (crush / ex / friend / complicated), the tint the
  // star wears. Normalized here so every caller stays simple.
  _mineEntry(m) {
    if (m && typeof m === 'object') return { label: m.label || null, kind: m.kind || '' }
    return { label: m || null, kind: '' }
  }

  // Instantly populate `n` resting ping-stars (mount / true count known). They
  // twinkle in over a staggered beat — opening a busy sky never fires a meteor
  // shower at the viewer. `mine` is the device-held list of the viewer's own
  // placed pings: each rests in as their own findable star.
  seed(n, mine = []) {
    n = Math.max(0, Math.floor(n))
    this.stars = []
    this.mine = []
    this.mineCursor = 0
    this.dive = null
    this.diveSt = null
    this.diveLabel = null
    this.locateFx = null
    for (let i = 0; i < n; i++) {
      this.stars.push({ i, born: -10, state: 'rest', settleAt: this.t + Math.random() * 1.1, mine: false })
    }
    for (const m of mine) this._restMine(this._mineEntry(m))
    this._seatPublicTags()
    this.start()
  }

  // Your own stars are spread around the disk: consecutive indices would seat
  // them as touching neighbours, which reads as an artifact once each burns
  // bright. One golden-angle turn per own-star keeps them apart,
  // deterministically (the cache is rebuilt fresh so a reseed lands them
  // identically).
  _spreadMineSlot(i, k) {
    delete this._slots[i]
    const slot = this._slot(i)
    const a = Math.atan2(slot.pz, slot.px) + k * 2.39996323
    slot.px = Math.cos(a) * slot.r
    slot.pz = Math.sin(a) * slot.r
    return slot
  }

  // Quietly rest one of the viewer's own stars into the disk (no meteor) — the
  // mount path, when the device already holds placed pings.
  _restMine(entry) {
    const i = this.stars.length
    this._spreadMineSlot(i, this.mine.length)
    const st = { i, born: -10, state: 'rest', settleAt: this.t + Math.random() * 0.9, mine: true, label: entry.label, kind: entry.kind }
    this.stars.push(st)
    this.mine.push({ st, label: entry.label, kind: entry.kind })
    return st
  }

  // Reconcile the viewer's own stars against the device-held ping list. Adds
  // missing ones quietly, updates a changed tint in place, and drops stars for
  // pings that were let go. Idempotent by label, so a screen-driven launch()
  // that already added its @ is a no-op.
  syncMine(entries = []) {
    const want = entries.map((m) => this._mineEntry(m)).filter((m) => m.label)
    const have = new Map(this.mine.map((m) => [m.label, m]))
    for (const e of want) {
      const cur = have.get(e.label)
      if (!cur) this._restMine(e)
      else if (cur.kind !== e.kind) {
        cur.kind = e.kind
        cur.st.kind = e.kind
      }
    }
    const labels = new Set(want.map((e) => e.label))
    for (const m of [...this.mine]) {
      if (m.label && !labels.has(m.label)) {
        const at = this.stars.indexOf(m.st)
        if (at >= 0) this.stars.splice(at, 1)
        this.mine.splice(this.mine.indexOf(m), 1)
        if (this.diveSt === m.st) {
          this.diveSt = null
          this.dive = null
        }
      }
    }
    this._seatPublicTags()
    this.start()
  }

  // Fire `k` new pings. Each arrives as a meteor and ignites in its slot — the
  // live "someone placed a ping" beat. Past a small burst the remainder settle
  // in quietly instead: a data catch-up must never read as a meteor storm.
  launch(k = 1, opts = {}) {
    const meteors = Math.min(k, 6)
    for (let j = 0; j < k; j++) {
      const i = this.stars.length
      if (opts.mine) this._spreadMineSlot(i, this.mine.length)
      const st = { i, born: this.t + j * 0.12, state: 'meteor', settleAt: 0, mine: !!opts.mine, label: opts.label || null, kind: opts.kind || '', trail: [] }
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
      if (opts.mine) this.mine.push({ st, label: opts.label || null, kind: opts.kind || '' })
    }
    this._seatPublicTags()
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
      this.mine = this.mine.filter((m) => this.stars.includes(m.st))
      if (this.diveSt && !this.stars.includes(this.diveSt)) {
        this.diveSt = null
        this.dive = null
      }
      this._seatPublicTags()
    } else if (n > this.stars.length) {
      this.launch(n - this.stars.length)
    }
    this.start()
  }

  // The opted-in public @s: small handle tags resting over real stars, so the
  // sky's population reads as real people — an identity announcement ("i'm
  // here"), never activity (who anyone pinged stays double-blind). `own` is the
  // viewer's handle once they've flipped public; it rides their newest star.
  setPublicHandles(list = [], own = null) {
    this.publicList = (list || []).filter(Boolean).slice(0, 12)
    this.ownPublic = own || null
    this._seatPublicTags()
    this.start()
  }

  // Whether the @ layer renders at all. Only the community page — where the sky
  // is the hero — turns it on; everywhere else this same engine is an ambient
  // backdrop, and handles floating behind foreground cards read as glitches.
  setTagsEnabled(on) {
    this.tagsEnabled = !!on
    this.start()
  }

  // Seat each public @ on a deterministic resident star (hashed by handle, so a
  // tag never wanders between frames or mounts), skipping the viewer's own.
  // Tags prefer the disk's mid-body — never the luminous heart, where they'd
  // pile over the community's central seal, and never the thin far rim.
  _seatPublicTags() {
    const prior = new Map(this.publicTags.map((tg) => [tg.label, tg.vis]))
    const tags = []
    const n = this.stars.length
    if (n > 0) {
      const used = new Set()
      const seatable = (idx) => {
        if (used.has(idx) || this.stars[idx].mine) return false
        const r = this._slot(this.stars[idx].i).r
        return r > RMAX * 0.34 && r < RMAX * 0.92
      }
      for (const label of this.publicList) {
        if (this.ownPublic && label === this.ownPublic) continue
        let h = 0
        for (let c = 0; c < label.length; c++) h = (h * 31 + label.charCodeAt(c)) >>> 0
        let idx = h % n
        let guard = 0
        while (!seatable(idx) && guard++ < n) idx = (idx + 7) % n
        if (!seatable(idx)) continue // a very young sky — better untagged than piled
        used.add(idx)
        tags.push({ st: this.stars[idx], label, own: false, tw: ((h % 100) / 100) * TWO, vis: prior.get(label) || 0 })
      }
    }
    if (this.ownPublic && this.mine.length) {
      tags.push({ st: this.mine[this.mine.length - 1].st, label: this.ownPublic, own: true, tw: 0, vis: prior.get(this.ownPublic) || 0 })
    }
    this.publicTags = tags
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

  // The find-your-star gesture: the camera dives through the field to one of the
  // viewer's own stars, holds while it flares (its @ rising above it), and
  // glides back out. Pass a label to fly to that exact ping; without one,
  // repeated calls visit each of your stars in turn — so the gesture resolves
  // however many pings are placed. Reduced motion trades the travel for a calm
  // converging ring. No-op without a star.
  // `opts.hold` turns the dive into a STAR VIEW: the camera flies in and then
  // STAYS with the star — the viewer hand-orbits the whole sky around it and
  // pinches closer/further — until releaseDive() glides back out. While held,
  // the canvas skips its own @ tag; the screen's overlay owns the star's name.
  locateMine(label, opts = {}) {
    if (!this.mine.length) return false
    let entry = null
    if (label) entry = this.mine.find((m) => m.label === label) || null
    if (!entry) {
      entry = this.mine[this.mineCursor % this.mine.length]
      this.mineCursor++
    }
    if (!entry || !this.stars.includes(entry.st)) return false
    this.diveSt = entry.st
    this.diveLabel = entry.label
    this.diveDist = 1
    // the dive owns the camera — release any hand-held zoom first
    this.zoomTarget = 1
    if (this.reduced) this.locateFx = { t0: this.t } // clock-based: survives dt=0 draws
    else this.dive = { t: 0, held: !!opts.hold }
    this.start()
    return true
  }

  // End a held star view: the camera glides back out to the resting sky.
  releaseDive() {
    if (this.dive && this.dive.held) {
      // jump the timeline to the start of the pull-out phase
      this.dive = { t: DIVE_IN + DIVE_HOLD, held: false }
    }
    this.start()
  }
  hasMine() {
    return this.mine.length > 0
  }

  // Turn the hand-driven camera on/off. The community screen switches it on
  // while the sky is the hero; everywhere else this same engine is only the
  // ambient backdrop, so taps stay a ripple with no zoom. Turning it off
  // releases any live zoom and orbit.
  setZoomEnabled(on) {
    this.zoomEnabled = !!on
    if (!on) this.resetView()
    this.start()
  }

  // Glide the camera home: zoom out to the resting frame, orbit unwinding.
  resetView() {
    this.zoomTarget = 1
    this.orbit.vyaw = 0
    this.orbit.vpitch = 0
    this.start()
  }

  // ── gestures ────────────────────────────────────────────────────────────────
  // One pointer: a quick touch is a tap (a wave through the disk; two in a row
  // dive the camera toward the spot), a drag orbits the disk — or pans across
  // it once zoomed. Two pointers pinch-zoom around their midpoint. A wheel
  // dollies toward the cursor. Everything rests where the hand leaves it.
  _gestureDown(e) {
    const el = e.target
    if (el && el.closest && el.closest('button, a, input, textarea, [role="button"], [data-noripple]')) return
    const g = this.gest
    g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // a HELD star view keeps the hand alive (orbit + pinch around the star);
    // a timed dive, or a screen that hasn't enabled gestures, stays a backdrop
    const held = this.dive && this.dive.held
    if ((!this.zoomEnabled && !held) || (this.dive && !held)) {
      // backdrop mode: the old behavior — a tap is a ripple, nothing more
      if (g.pts.size === 1 && !this.reduced) this.ripple(e.clientX, e.clientY)
      return
    }
    this._interactAt = this.t
    if (g.pts.size === 2) {
      const [p1, p2] = [...g.pts.values()]
      g.mode = 'pinch'
      g.dist0 = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
      g.zoom0 = this.zoomTarget
      g.dive0 = this.diveDist
      g.lx = (p1.x + p2.x) / 2
      g.ly = (p1.y + p2.y) / 2
      // anchor the dolly on the point between the fingers
      if (!held && this.zoomTarget <= 1.04) this.zoomFocus = this._planePoint(g.lx, g.ly)
    } else if (g.pts.size === 1) {
      g.mode = 'press'
      g.sx = g.lx = e.clientX
      g.sy = g.ly = e.clientY
      g.downT = performance.now()
      g.vyaw = 0
      g.vpitch = 0
    }
    this.start()
  }

  _gestureMove(e) {
    const g = this.gest
    const p = g.pts.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    if (g.mode === 'pinch' && g.pts.size >= 2) {
      const [p1, p2] = [...g.pts.values()]
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1
      if (this.dive && this.dive.held) {
        // star view: the pinch pulls the camera closer to (or back from) the star
        this.diveDist = clamp((g.dive0 || 1) * (g.dist0 / d), 0.4, 3.4)
        this._interactAt = this.t
        this.start()
        return
      }
      this.zoomTarget = clamp(g.zoom0 * (d / g.dist0), 1, ZOOM_MAX)
      // two-finger drift pans the field with the hand
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      if (this.zoom > 1.04) this._panBy(g.lx, g.ly, mx, my)
      g.lx = mx
      g.ly = my
      this._interactAt = this.t
      this.start()
    } else if (g.mode === 'press' || g.mode === 'drag') {
      if (g.mode === 'press' && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 7) g.mode = 'drag'
      if (g.mode !== 'drag') return
      const dx = e.clientX - g.lx
      const dy = e.clientY - g.ly
      if (this.zoom > 1.06 && !(this.dive && this.dive.held)) {
        // zoomed: the drag pans — the world follows the finger
        this._panBy(g.lx, g.ly, e.clientX, e.clientY)
      } else {
        // resting: the drag orbits — steering the whole disk in the hand
        this.orbit.yaw = clamp(this.orbit.yaw + dx * 0.0036, -ORBIT_YAW_MAX, ORBIT_YAW_MAX)
        this.orbit.pitch = clamp(this.orbit.pitch - dy * 0.0028, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX)
        g.vyaw = dx * 0.22
        g.vpitch = -dy * 0.17
      }
      g.lx = e.clientX
      g.ly = e.clientY
      this._interactAt = this.t
      this.start()
    }
  }

  _gestureUp(e) {
    const g = this.gest
    if (!g.pts.delete(e.pointerId)) return
    if (g.mode === 'pinch') {
      if (g.pts.size < 2) g.mode = null
      return
    }
    if (g.mode === 'drag') {
      // let the orbit coast a breath past the release
      this.orbit.vyaw = g.vyaw
      this.orbit.vpitch = g.vpitch
      g.mode = null
      return
    }
    if (g.mode !== 'press') return
    g.mode = null
    if (performance.now() - g.downT > 380) return
    // taps inside a held star view stay quiet — the hand there is for orbiting
    if (this.dive && this.dive.held) return
    const now = performance.now()
    // double-tap: dive toward the spot — or, from deep in, pull all the way home
    if (now - g.lastTap < 330 && Math.hypot(e.clientX - g.lastTapX, e.clientY - g.lastTapY) < 42) {
      g.lastTap = 0
      if (this.zoomTarget > 2.6) this.resetView()
      else {
        this.zoomFocus = this._planePoint(e.clientX, e.clientY)
        this.zoomTarget = Math.min(Math.max(this.zoomTarget, 1) * DBLTAP_STEP, ZOOM_MAX)
      }
      this._interactAt = this.t
      this.start()
      return
    }
    g.lastTap = now
    g.lastTapX = e.clientX
    g.lastTapY = e.clientY
    // a tap on a public @ answers as a meeting, not a ripple: the camera dollies
    // to that person's star and the screen is told who it is
    const tag = this._tagAt(e.clientX, e.clientY)
    if (tag) {
      const slot = this._slot(tag.st.i)
      this.zoomFocus = { px: slot.px, pz: slot.pz }
      this.zoomTarget = Math.max(this.zoomTarget, 3.4)
      this._interactAt = this.t
      if (this.onTagTap) this.onTagTap(tag.label, tag.own)
      this.start()
      return
    }
    if (!this.reduced) this.ripple(e.clientX, e.clientY)
  }

  // Which public @ (if any) sits under a screen point. Tags record their live
  // screen position each frame; the target is generous — a handle is small and
  // a thumb is not.
  _tagAt(clientX, clientY) {
    if (!this.tagsEnabled || !this.publicTags.length) return null
    let best = null
    let bestD = 44 * 44
    for (const tag of this.publicTags) {
      if (tag.vis < 0.25 || tag.sx == null) continue
      const dx = tag.sx - clientX
      const dy = tag.sy - clientY + 8 // the tag floats just over its star
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = tag
      }
    }
    return best
  }

  _gestureWheel(e) {
    const el = e.target
    if (el && el.closest && el.closest('button, a, input, textarea, [role="button"], [data-noripple]')) return
    if (this.dive && this.dive.held) {
      // star view: the wheel pulls the camera closer to (or back from) the star
      this.diveDist = clamp(this.diveDist * Math.exp(e.deltaY * 0.0014), 0.4, 3.4)
      this._interactAt = this.t
      this.start()
      return
    }
    if (!this.zoomEnabled || this.dive) return
    const f = Math.exp(-e.deltaY * 0.0016)
    const nz = clamp(this.zoomTarget * f, 1, ZOOM_MAX)
    if (nz > this.zoomTarget && this.zoomTarget <= 1.04) this.zoomFocus = this._planePoint(e.clientX, e.clientY)
    this.zoomTarget = nz
    this._interactAt = this.t
    this.start()
  }

  // Slide the zoom focus so the disk-plane point under (x0,y0) lands under
  // (x1,y1) — the world follows the finger. One step per event converges
  // visually (the focus shift re-centers the camera the next frame).
  _panBy(x0, y0, x1, y1) {
    const w0 = this._planePoint(x0, y0)
    const w1 = this._planePoint(x1, y1)
    let px = this.zoomFocus.px + (w0.px - w1.px)
    let pz = this.zoomFocus.pz + (w0.pz - w1.pz)
    const rr = Math.hypot(px, pz)
    if (rr > RMAX * 1.25) {
      const f = (RMAX * 1.25) / rr
      px *= f
      pz *= f
    }
    this.zoomFocus = { px, pz }
  }

  // Unproject a screen point onto the disk plane (y = 0), honoring the live
  // camera offsets — a few Newton passes over the perspective divide.
  _planePoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    const tx = clientX - rect.left
    const ty = clientY - rect.top
    const rot = this._rotCache || this._rot()
    const A = this._view(1, 0, 0, rot)
    const B = this._view(0, 0, 1, rot)
    let zc = CAM
    let a = 0, b = 0
    for (let it = 0; it < 4; it++) {
      const persp = FOCAL / zc
      const x = (tx - this.cx) / (this.unit * persp) + this.cam.x
      const y = (ty - this.cy) / (this.unit * persp) + this.cam.y
      const det = A.x * B.y - B.x * A.y
      if (Math.abs(det) < 1e-6) break
      a = (x * B.y - B.x * y) / det
      b = (A.x * y - x * A.y) / det
      zc = CAM + a * A.z + b * B.z - this.cam.z
      if (zc < 0.35) zc = 0.35
    }
    const rr = Math.hypot(a, b)
    if (rr > RMAX * 1.4) {
      const f = (RMAX * 1.4) / rr
      a *= f
      b *= f
    }
    return { px: a, pz: b }
  }

  // A tap becomes a wave in the DISK PLANE: an expanding ring sweeps the disk —
  // stars flare as the front crosses them. The sky answers the hand.
  ripple(clientX, clientY) {
    const pt = this._planePoint(clientX, clientY)
    this.waves.push({ px: pt.px, pz: pt.pz, t: 0 })
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
    // in the crosshairs instead of swimming under the camera. The hand's orbit
    // rides the same envelope, so a dive overrides a half-turned disk cleanly.
    const hold = 1 - this.focus
    // a HELD star view keeps the hand's orbit fully alive: the camera re-aims
    // at the star every frame, so orbiting swings the whole sky around the
    // hero with real parallax while it stays pinned in the crosshairs
    const ow = this.dive && this.dive.held ? 1 : hold
    const driftY = Math.sin(this.t * 0.12) * 0.05 * hold
    const yaw = this.p.x * 0.22 * hold + this.orbit.yaw * ow + driftY
    const tilt = TILT + (this.p.y * 0.14 + Math.sin(this.t * 0.09) * 0.02) * hold + this.orbit.pitch * ow
    return {
      cosS: Math.cos(this.spin),
      sinS: Math.sin(this.spin),
      cosY: Math.cos(yaw),
      sinY: Math.sin(yaw),
      cosT: Math.cos(tilt),
      sinT: Math.sin(tilt),
    }
  }

  // ── the frame-time governor ─────────────────────────────────────────────────
  // An EMA of raw frame time steps quality down (backing resolution + the
  // decorative layers' density) when the device can't hold the frame, and back
  // up when it can. The countable pings are never traded away. Hysteresis on
  // both edges so it never flaps.
  _govern(rawMs, ts) {
    if (rawMs > 0 && rawMs < 250) this._ftEma = this._ftEma * 0.94 + rawMs * 0.06
    if (ts - this._qAt < 1600) return
    if (this._ftEma > 34 && this.qLevel < 2) {
      this.qLevel++
      this._qAt = ts
      this._applyQuality()
    } else if (this._ftEma < 17 && this.qLevel > 0 && ts - this._qAt > 6000) {
      this.qLevel--
      this._qAt = ts
      this._applyQuality()
    }
  }
  _applyQuality() {
    const scale = [1, 0.78, 0.6][this.qLevel]
    this.dprEff = Math.max(1, this.dpr * scale)
    this._ftEma = 22 // re-center the meter so one step gets a fair trial
    this.resize(true)
  }
  // decorative layers draw every `step`-th particle under pressure
  get _decorStep() {
    return this.qLevel === 0 ? 1 : 2
  }

  // ── the loop ────────────────────────────────────────────────────────────────
  _tick(ts) {
    if (!this.running) return
    const raw = ts - this.lastTs
    const dt = Math.min(0.05, raw / 1000)
    this.lastTs = ts
    this._govern(raw, ts)

    // the dive timeline: glide in, hold on the flaring star, glide out. A HELD
    // dive parks at full focus — the star view — until releaseDive().
    if (this.dive) {
      if (this.dive.held) {
        this.dive.t = Math.min(this.dive.t + dt, DIVE_IN)
        this.focus = easeInOut(this.dive.t / DIVE_IN)
      } else {
        this.dive.t += dt
        const t = this.dive.t
        if (t < DIVE_IN) this.focus = easeInOut(t / DIVE_IN)
        else if (t < DIVE_IN + DIVE_HOLD) this.focus = 1
        else if (t < DIVE_IN + DIVE_HOLD + DIVE_OUT) this.focus = easeInOut(1 - (t - DIVE_IN - DIVE_HOLD) / DIVE_OUT)
        else {
          this.dive = null
          this.focus = 0
        }
      }
    } else {
      this.focus = 0
    }

    if (this.reduced) {
      this.t += dt
      this._easeZoom(dt)
      this._draw(0)
      const busy =
        this.locateFx ||
        this.waves.length ||
        this.zoom !== this.zoomTarget ||
        this.zoom > 1.001 !== this.zoomTarget > 1.001 ||
        Math.abs(this.zoom - this.zoomTarget) > 0.002 ||
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

    // the hand's orbit: inertia coasts past release, then the view RESTS where
    // the hand left it — full axis freedom, nothing snaps back on a timer. It
    // only glides home when the sky stops being the hero (gestures switched
    // off) and no held star view is pinning the camera.
    const g = this.gest
    if (g.mode !== 'drag') {
      this.orbit.yaw = clamp(this.orbit.yaw + this.orbit.vyaw * dt, -ORBIT_YAW_MAX, ORBIT_YAW_MAX)
      this.orbit.pitch = clamp(this.orbit.pitch + this.orbit.vpitch * dt, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX)
      const dec = Math.exp(-dt * 2.4)
      this.orbit.vyaw *= dec
      this.orbit.vpitch *= dec
      if (!this.zoomEnabled && !(this.dive && this.dive.held)) {
        const home = Math.min(1, dt * 1.6)
        this.orbit.yaw = lerp(this.orbit.yaw, 0, home)
        this.orbit.pitch = lerp(this.orbit.pitch, 0, home)
      }
    }

    this._easeZoom(dt)

    this._draw(dt)
    requestAnimationFrame(this._boundTick)
  }

  // the dolly eases toward the hand's target: a touch quicker pushing in than
  // settling out, so a gesture feels answered and a release feels like a glide.
  // The screen only goes immersive once the zoom is a commitment (not a nudge),
  // and comes back a little below that so the chrome never flickers at the edge.
  _easeZoom(dt) {
    if (this.zoom === this.zoomTarget) return
    const k = this.zoomTarget > this.zoom ? 6 : 3.4
    this.zoom = lerp(this.zoom, this.zoomTarget, Math.min(1, dt * k))
    if (Math.abs(this.zoom - this.zoomTarget) < 0.002) this.zoom = this.zoomTarget
    const active = this._zoomActive ? this.zoom > 1.18 : this.zoom > 1.32
    if (active !== this._zoomActive) {
      this._zoomActive = active
      if (this.onZoomState) this.onZoomState(active)
    }
  }

  _draw(dt) {
    const ctx = this.ctx
    const rot = (this._rotCache = this._rot())

    // the dive's camera travel: offset toward the target star in view space so
    // the WHOLE field (gas, dust, every star) flies past as one
    if (this.focus > 0.0005 && this.diveSt) {
      const slot = this._slot(this.diveSt.i)
      const T = this._view(slot.px, slot.y, slot.pz, rot)
      const f = this.focus
      this.cam.x = f * T.x
      this.cam.y = f * T.y
      this.cam.z = f * (CAM + T.z - STANDOFF * this.diveDist)
    } else if (this.zoom > 1.001) {
      // the hand's dolly: `cen` (0→1 as zoom climbs) both magnifies the focused
      // point by ~`zoom`× (its camera-space depth shrinks to zc0/zoom) and
      // slides it toward frame center — nearer stars swell faster than far
      // ones, so the lean-in reads as real 3D depth. At zoom≈1 the offset is
      // zero: the identity camera, no seam with the resting sky.
      const T = this._view(this.zoomFocus.px, 0, this.zoomFocus.pz, rot)
      const zc0 = CAM + T.z
      const cen = 1 - 1 / this.zoom
      this.cam.x = cen * T.x
      this.cam.y = cen * T.y
      this.cam.z = cen * zc0
    } else {
      this.cam.x = this.cam.y = this.cam.z = 0
    }

    // as the camera commits to a dive, the field melts back so the hero star
    // arrives alone
    const d = 1 - this.focus * 0.5
    const fillFrac = clamp(this.stars.length / CAP, 0, 1)
    // the population envelope: how far out the disk is lit (arm dust and gas
    // only glow where real pings already live)
    const fillR = Math.max(Math.sqrt(Math.max(this.stars.length, 30) / CAP) * RMAX, 0.3)

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

    this._drawShell(dt, d)
    this._drawNebula(dt, d, this.forming ? 0.8 : fillFrac, fillR)

    const o = this._project(0, 0, 0) || { sx: this.cx, sy: this.cy, persp: 1 }
    this._drawCore(o, d, fillFrac)
    this._drawDiskHaze(o, d, fillFrac)
    this._drawArmDust(dt, d, fillFrac, fillR)
    this._drawDust(dt, d)

    if (this.forming) {
      // a gathering sky withholds everyone else's count — but the viewer's OWN
      // stars still shine (they reveal nothing about anyone but themselves), so
      // "find your star" works before the community opens too.
      this._drawForming(dt)
      this._drawMine(dt)
    } else {
      this._drawStars(dt, d)
      this._drawConstellations(dt, d)
      this._drawPublicTags(dt, d)
      this._drawMine(dt)
    }
    this._drawPassers(dt, d)
    this._drawWaves(dt)
    this._drawLocateFx()

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // The near-field passers: loose stars adrift between the camera and the disk.
  // Each remembers its last screen position — when the camera travels (a zoom,
  // a dive, a hand-orbit) they streak along their own apparent motion, so a
  // deep zoom feels like flying through space, close stars sweeping past while
  // the far field barely moves. At rest they are a whisper of drift.
  _drawPassers(dt, d) {
    if (!this.passers.length || this.qLevel >= 2) return
    const ctx = this.ctx
    const moving = this.focus > 0.02 || this.zoom > 1.2 || this.gest.mode === 'drag' || Math.abs(this.orbit.vyaw) > 0.02
    const lift = moving ? 1 : 0.5
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    for (const p of this.passers) {
      p.px += p.vx * dt
      p.py += p.vy * dt
      p.pz += p.vz * dt
      // wrap the drift inside its shell so the pool never thins out
      if (p.px > 2.5) p.px = -2.5
      else if (p.px < -2.5) p.px = 2.5
      if (p.py > 1.6) p.py = -1.6
      else if (p.py < -1.6) p.py = 1.6
      if (p.pz > 2.5) p.pz = -2.5
      else if (p.pz < -2.5) p.pz = 2.5
      const pr = this._project(p.px, p.py, p.pz)
      if (!pr || pr.sx < -80 || pr.sx > this.w + 80 || pr.sy < -80 || pr.sy > this.h + 80) {
        p.lx = null
        continue
      }
      const a = p.base * d * lift * clamp(pr.persp / P0, 0.4, 2.4)
      const D = clamp(p.rad * pr.persp * 2.4, 1.2, 8)
      if (!this.reduced && p.lx != null) {
        const sp = Math.hypot(pr.sx - p.lx, pr.sy - p.ly)
        // a streak only when the star is genuinely sweeping past (never across
        // a wrap teleport)
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

  // the volumetric deep field — always fully lit: the universe is there even
  // when the community is empty; the pings are what's missing, not space.
  _drawShell(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    const step = this._decorStep
    const magnified = this.focus > 0.001 || this.zoom > 1.05
    for (let i = 0; i < this.shell.length; i += step) {
      const b = this.shell[i]
      const pr = this._project(b.px, b.py, b.pz)
      if (!pr || pr.sx < -8 || pr.sx > this.w + 8 || pr.sy < -8 || pr.sy > this.h + 8) continue
      b.tw += dt * b.tws * step
      const a = b.base * (0.55 + 0.45 * Math.sin(b.tw)) * d
      if (a <= 0.01) continue
      ctx.globalAlpha = Math.min(0.85, a)
      const D = clamp(b.rad * pr.persp * 2.6, 1.1, 5)
      if (D >= 1.9 || magnified) {
        ctx.drawImage(this._dotFor(b.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
      } else {
        ctx.fillStyle = b.hue
        const s2 = D * 0.5
        ctx.fillRect(pr.sx - s2, pr.sy - s2, s2 * 2, s2 * 2)
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

  // arm-riding nebula gas. Its light grows with the community — a young sky is
  // thin and clear; a full one is milky with unresolved starlight along the
  // spiral lanes.
  _drawNebula(dt, d, fillFrac, fillR) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    const grow = this.forming ? 0.8 : 0.45 + 0.55 * fillFrac
    for (const nb of this.nebula) {
      if (!this.forming && nb.r > fillR + 0.18) continue // unlit beyond the population
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
    const fill = this.forming ? 0.66 : clamp(0.18 + this.stars.length / 220, 0.18, 1)
    // capped well under the frame: deep in a zoom the bulge's bloom must stay a
    // place the camera is passing, never a gray wash over the whole view
    const coreR = Math.min(this.unit * (0.3 + 0.28 * fillFrac + (this.forming ? 0.18 : 0)) * o.persp, Math.max(this.w, this.h) * 1.05)
    if (!this._coreGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,236,206,0.3)')
      g.addColorStop(0.15, 'rgba(255,214,176,0.16)')
      g.addColorStop(0.42, 'rgba(214,150,120,0.055)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      this._coreGrad = g
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // thinning with the dolly: passing INTO the bulge's light, not into fog
    ctx.globalAlpha = (fill * d) / (1 + (this.zoom - 1) * 0.3)
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
    const spread = this.forming ? 0.62 : 0.32 + 0.72 * Math.sqrt(fillFrac)
    const ux = (ax.sx - o.sx) * spread, uy = (ax.sy - o.sy) * spread
    const vx = (az.sx - o.sx) * spread, vy = (az.sy - o.sy) * spread
    if (!this._hazeGrad) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, 'rgba(255,226,196,0.05)')
      g.addColorStop(0.45, 'rgba(206,170,210,0.034)')
      g.addColorStop(0.8, 'rgba(150,150,200,0.012)')
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

  // unresolved starlight along the spiral lanes — the arms' connective glow.
  // Gated to the lit disk (fillR), so it grows outward WITH the community.
  _drawArmDust(dt, d, fillFrac, fillR) {
    if (this.forming || fillFrac < 0.015) return
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    const step = this._decorStep
    const grow = 0.35 + 0.65 * fillFrac
    for (let i = 0; i < this.armDust.length; i += step) {
      const p = this.armDust[i]
      const edge = clamp((fillR + 0.12 - p.r) / 0.15, 0, 1) // feathered frontier
      if (edge <= 0.01) continue
      const pr = this._project(p.px, p.y, p.pz)
      if (!pr || pr.sx < -20 || pr.sx > this.w + 20 || pr.sy < -20 || pr.sy > this.h + 20) continue
      p.tw += dt * p.tws * step
      const a = p.base * grow * edge * (0.7 + 0.3 * Math.sin(p.tw)) * d * clamp(pr.shade, 0.35, 1.2)
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.4, a)
      const rel = pr.persp / P0
      const D = clamp(p.rad * 2.2 * Math.pow(rel, 0.55), 1.2, 6)
      ctx.drawImage(this._dotFor(p.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  _drawDust(dt, d) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    const step = this._decorStep
    const warmSprite = this._dotFor(PAL.warm), creamSprite = this._dotFor(PAL.cream)
    for (let i = 0; i < this.dust.length; i += step) {
      const p = this.dust[i]
      const pr = this._project(p.px, p.py, p.pz)
      if (!pr || pr.sx < -30 || pr.sx > this.w + 30 || pr.sy < -30 || pr.sy > this.h + 30) continue
      p.tw += dt * p.tws * step
      const a = p.base * (0.7 + 0.3 * Math.sin(p.tw)) * d * clamp(pr.shade, 0.3, 1.2)
      if (a <= 0.004) continue
      ctx.globalAlpha = Math.min(0.5, a)
      const rel = pr.persp / P0
      const D = clamp(p.rad * 2.4 * Math.pow(rel, 0.6), 1.2, 9)
      ctx.drawImage(p.warm ? warmSprite : creamSprite, pr.sx - D / 2, pr.sy - D / 2, D, D)
    }
  }

  // ── the ping stars ──────────────────────────────────────────────────────────
  // A star is a POINT SOURCE: approach barely grows its core (sub-linear, hard
  // capped) — instead it brightens, blooms, and earns diffraction spikes. That
  // is what keeps a deep zoom reading as flying toward real stars instead of
  // inflating a texture.
  _drawStars(dt, d) {
    const ctx = this.ctx
    const glowQ = []
    const meteors = []
    const focusing = this.focus > 0.001
    const magnified = focusing || this.zoom > 1.05
    const liteGlow = this.qLevel >= 2
    const waves = this.waves

    for (const st of this.stars) {
      const slot = this._slot(st.i)

      // METEOR — streaking in; drawn in a top pass so trails ride over the field
      if (st.state === 'meteor') {
        if (this.t >= st.born) meteors.push(st)
        continue
      }

      // the viewer's own stars get their dedicated pass (_drawMine)
      if (st.mine) continue

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

      // during a dive everything but the hero melts back into the depth
      const fade = focusing ? 1 - 0.82 * this.focus : 1
      const tw = 0.7 + 0.3 * Math.sin(slot.phase)
      const rel = pr.persp / P0 // 1 at the resting center; grows on approach
      const lum = clamp(Math.pow(rel, 1.1), 0.3, 2.1)
      const a = (slot.base * tw * pr.shade * settle * lum + flare * 0.5) * fade
      if (a <= 0.004) continue

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = Math.min(0.96, a * 1.4)
      const D = Math.min(slot.rad * 2.9 * Math.pow(rel, 0.5), 11) * (1 + ignite * 0.9 + flare * 0.45)
      if (D >= 2 || magnified) {
        ctx.drawImage(this._dotFor(slot.hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
      } else {
        ctx.fillStyle = slot.hue
        const s = D * 0.42
        ctx.fillRect(pr.sx - s, pr.sy - s, s * 2, s * 2)
      }
      const near = rel > 1.45
      if (!liteGlow && (slot.glow || near || ignite > 0 || flare > 0.25)) glowQ.push([pr, slot, a, ignite, flare, rel, D])
      else if (liteGlow && (ignite > 0 || flare > 0.25)) glowQ.push([pr, slot, a, ignite, flare, rel, D])
    }

    // additive pass: tinted blooms; diffraction spikes for ignitions, the
    // brightest residents, and any star the camera is closing in on. Every
    // approach term rides the star's OWN faded alpha (a) — during a dive the
    // melting field must never bloom back through the fade — and bloom sizes
    // are hard-capped: brightness is spent as light, never as a bokeh disc.
    ctx.globalCompositeOperation = 'lighter'
    for (const [pr, slot, a, ignite, flare, rel, D] of glowQ) {
      const sz = Math.min(slot.rad * (6 + ignite * 10 + flare * 5) * Math.pow(rel, 0.8), 30)
      ctx.globalAlpha = Math.min(0.6, a * (0.55 + Math.max(0, rel - 1.4) * 0.22) + ignite * 0.4 + flare * 0.3)
      ctx.drawImage(this._glowFor(slot.hue), pr.sx - sz / 2, pr.sy - sz / 2, sz, sz)
      const approach = clamp((rel - 1.45) * 0.5, 0, 0.8)
      if (ignite > 0) {
        const ss = 22 + ignite * 34
        ctx.globalAlpha = ignite * 0.85
        ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      } else if ((approach > 0.05 && a > 0.1) || (a > 0.5 && slot.glow)) {
        const ss = clamp(D * (2.4 + rel * 0.7), 14, 64)
        ctx.globalAlpha = Math.min(0.7, approach * a * 1.5 + (slot.glow ? 0.14 * a : 0))
        ctx.drawImage(this._spike, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      }
    }

    // meteors last, over everything — the newest light crossing the whole sky
    for (const st of meteors) this._drawMeteor(st, dt)
  }

  // ── the viewer's own stars ────────────────────────────────────────────────
  // One per ping this device placed — a white-hot core wearing full diffraction
  // spikes inside a halo tinted by who the ping is to them (the category's
  // light: rose for a crush, ember for an ex, blue for a friend, violet for
  // complicated — theme.js's CATEGORY_TINTS, first met on the options tab).
  // Unmistakably a STAR, unmistakably yours, never shouting over the field.
  // During a locate dive the target flares to its full photographic signature
  // and the @ it holds (device-held plaintext — no one else's sky ever shows
  // it) rises above.
  _drawMine(dt) {
    if (!this.mine.length) return
    const ctx = this.ctx
    const focusing = this.focus > 0.001
    for (const m of this.mine) {
      const st = m.st
      if (st.state === 'meteor') {
        // non-forming skies draw mine meteors in the shared top pass
        if (this.forming && this.t >= st.born) this._drawMeteor(st, dt)
        continue
      }
      const slot = this._slot(st.i)
      const pr = this._project(slot.px, slot.y, slot.pz)
      if (!pr) continue
      // the landing glisten right after this star's meteor touched down
      let ignite = 0
      if (st.state === 'ignite') {
        const q = (this.t - st.igniteAt) / IGNITE_DUR
        if (q >= 1) st.state = 'rest'
        else ignite = Math.sin(Math.PI * clamp(q, 0, 1))
      }
      const isDive = focusing && st === this.diveSt
      const f = isDive ? this.focus : 0
      const fade = focusing && !isDive ? 1 - 0.82 * this.focus : 1
      if (fade <= 0.03) continue
      let settle = 1
      if (st.settleAt > 0) settle = smooth(clamp((this.t - st.settleAt) / 0.9, 0, 1))
      if (settle <= 0.01) continue
      const tint = CATEGORY_TINTS[m.kind] || this.you
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.1 + slot.phase)
      const rel = pr.persp / P0
      const near = Math.pow(clamp(rel, 0.5, 3), 0.55)
      const base = settle * fade

      ctx.globalCompositeOperation = 'lighter'
      // the tinted halo — the category's light, read at a glance
      const ro = (13 + pulse * 3) * near * (1 + f * 2.4)
      ctx.globalAlpha = (0.2 + 0.12 * pulse) * base
      ctx.drawImage(this._glowFor(tint), pr.sx - ro, pr.sy - ro, ro * 2, ro * 2)
      // an inner warm-white bloom seats the core in its halo
      const go = (6.5 + pulse * 1.8) * near * (1 + f * 2.6)
      ctx.globalAlpha = (0.4 + 0.22 * pulse) * base
      ctx.drawImage(this.glows.white, pr.sx - go, pr.sy - go, go * 2, go * 2)
      // full diffraction spikes, tinted at the feathered ends — always worn:
      // this is what makes your star read as a STAR
      const ss = (30 + pulse * 6 + ignite * 26) * near * (1 + f * 2.6)
      ctx.globalAlpha = Math.min(1, (0.4 + 0.18 * pulse) * base + ignite * 0.5 + f * 0.5)
      ctx.drawImage(this._spikeFor(tint), pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
      // the white-hot core — a point, never a blob
      const cd = Math.min((2.9 + pulse * 0.5) * near, 5) * (1 + f * 1.6)
      ctx.globalAlpha = Math.min(1, (0.85 + 0.15 * pulse) * base + f)
      ctx.drawImage(this._dotFor('#FFFFFF'), pr.sx - cd, pr.sy - cd, cd * 2, cd * 2)

      // arrival: the @ this ping holds rises over the star on a slim tick.
      // A HELD star view skips this — the screen's overlay owns the name there.
      if (isDive && this.diveLabel && f > 0.55 && !(this.dive && this.dive.held)) {
        const fl = smooth((f - 0.55) / 0.45)
        const off = 34 + f * 22
        ctx.globalAlpha = fl * 0.4
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pr.sx, pr.sy - 16 - f * 8)
        ctx.lineTo(pr.sx, pr.sy - off + 9)
        ctx.stroke()
        this._drawTag(pr.sx, pr.sy - off, '@' + this.diveLabel, fl * 0.96, 14.5, true)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // ── the public @s ─────────────────────────────────────────────────────────
  // Members who chose to announce themselves: small resting tags over real
  // stars. Enough that the sky reads as inhabited by real people — never a
  // roster (capped, faint, melting back during a dive), and never who anyone
  // pinged. Only drawn where the screen turns the layer on. Tags DECLUTTER
  // themselves: when two would collide on screen, the lower-priority one yields
  // and fades — the sky never piles handles into a heap. All appearance and
  // retreat is eased, so nothing pops.
  _drawPublicTags(dt, d) {
    if (!this.tagsEnabled || !this.publicTags.length) return
    const fade = (1 - this.focus * 0.92) * d
    const taken = [] // reserved screen rects, priority order
    for (const tag of this.publicTags) {
      const st = tag.st
      let want = false
      let x = 0, y = 0, size = 10
      if (st && st.state !== 'meteor' && fade > 0.03) {
        const slot = this._slot(st.i)
        const pr = this._project(slot.px, slot.y, slot.pz)
        if (pr && pr.sx > 30 && pr.sx < this.w - 30 && pr.sy > 40 && pr.sy < this.h - 8) {
          const rel = pr.persp / P0
          size = clamp((tag.own ? 11 : 10) * Math.pow(rel, 0.45), 9, 14)
          x = pr.sx
          y = pr.sy - clamp(8 * rel, 7, 18) - 5
          const wpx = size * 0.62 * (tag.label.length + 1) + 12
          const rect = { x0: x - wpx / 2, x1: x + wpx / 2, y0: y - size - 4, y1: y + 4 }
          let clear = true
          for (const r of taken) {
            if (rect.x0 < r.x1 && rect.x1 > r.x0 && rect.y0 < r.y1 && rect.y1 > r.y0) {
              clear = false
              break
            }
          }
          if (clear) {
            taken.push(rect)
            want = true
          }
        }
      }
      tag.vis = clamp(tag.vis + (want ? 1 : -1) * dt * 3, 0, 1)
      // remember where the tag sits on screen, so a tap can land on it
      tag.sx = want ? x : null
      tag.sy = want ? y : null
      if (tag.vis <= 0.02 || !want) continue
      tag.tw += dt * 0.5
      const a = (tag.own ? 0.8 : 0.48 + 0.1 * Math.sin(tag.tw)) * fade * smooth(tag.vis)
      this._drawTag(x, y, '@' + tag.label, a, size)
    }
  }

  // A small mono @ tag floating over a star — screen-space, quietly lit.
  _drawTag(x, y, text, alpha, size = 11, bright = false) {
    if (alpha <= 0.02) return
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = clamp(alpha, 0, 1)
    ctx.font = `700 ${size}px 'Space Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 8
    ctx.fillStyle = bright ? 'rgba(255,250,244,0.98)' : 'rgba(243,236,246,0.85)'
    ctx.fillText(text, x, y)
    ctx.restore()
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
  // traced by a travelling spark, node to node; a retiring one dissolves. Two
  // solid strokes per segment (a rose under-glow beneath a cream thread) — no
  // per-frame gradient allocations, so two dozen figures cost nothing.
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
        const la = life * depth * fade
        ctx.strokeStyle = this._rgba(this.them, 0.07 * shimmer)
        ctx.globalAlpha = la
        ctx.lineWidth = 2.2
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.strokeStyle = `rgba(245,236,246,${(0.11 + 0.06 * shimmer).toFixed(3)})`
        ctx.lineWidth = 1
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
        ctx.globalAlpha = (0.26 * shimmer + glint * 0.45) * life * depth * fade
        const gs = 4 + glint * 5
        ctx.drawImage(this.glows.them, pt.sx - gs, pt.sy - gs, gs * 2, gs * 2)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = (0.6 * shimmer + glint * 0.32) * life * depth * fade
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
    const st = this.diveSt
    if (!st || !this.stars.includes(st)) {
      this.locateFx = null
      return
    }
    const slot = this._slot(st.i)
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

// sky/model.js — where the stars actually are, and why the arms exist.
//
// The old engines drew spiral arms by taking a radius and adding a twist to the
// angle: `ang = arm * PI + r * TWIST`. That produces a spiral-shaped scatter,
// but it is a drawing of an arm, not an arm, and it shows — it needs gaussian
// feathering to stop reading as two painted stripes, it has no reason to hold
// together under rotation, and it makes a galaxy that can only ever spin as a
// rigid picture.
//
// This uses the density wave theory instead, which is what real spiral arms
// are. The insight (Lin & Shu, 1964) is that the arms are not made of stars.
// They are a standing wave — a traffic jam. Every star travels its own quiet
// elliptical orbit around the galactic center, but the orbits are not aligned:
// each one is rotated slightly further than the one inside it. Where
// neighbouring ellipses crowd together, stars spend more time, density rises,
// gas compresses, and new hot blue stars ignite. That crowding IS the arm.
//
// Three things fall out of this for free, and all three are things the old
// model had to fake:
//
//   1. The arms are genuinely, permanently shaped like arms, at every radius,
//      without any feathering hack — because they are an emergent consequence
//      of the orbit family rather than a curve someone drew.
//   2. The galaxy can rotate differentially (inner stars orbiting faster than
//      outer ones, as they truly do) WITHOUT the arms winding up and smearing
//      into a disc — the winding problem that killed the naive theory in the
//      first place. Stars flow through the arms; the pattern stays.
//   3. Blue stars belong in the arms and old red ones don't, for a physical
//      reason rather than an artistic one: the arm is where the gas is being
//      compressed, so it is where new stars are being born, and the brightest
//      of those die before they can drift out.
//
// A star's whole life here is eight floats. Its position at any moment is
// computed in the vertex shader from them plus one clock, so a hundred thousand
// stars orbiting is exactly as expensive on the CPU as zero stars orbiting.
//
//   [0] a       semi-major axis of its orbit
//   [1] b       semi-minor axis
//   [2] phi0    where it sits on that orbit at t = 0
//   [3] omega   its angular speed (from the rotation curve)
//   [4] theta0  its orbit's tilt — the density wave itself
//   [5] y       height above the galactic plane
//   [6] tempU   blackbody temperature, as a LUT coordinate
//   [7] lum     relative luminosity
//
export const STAR_STRIDE = 8

// ── the shape of the galaxy ──────────────────────────────────────────────────
// How far each successive orbit is rotated past the one inside it. This single
// number is the spiral: it is the arms' pitch angle, and nothing else in the
// model refers to "an arm" at all. At 4.3 rad per world unit the disk winds
// about three quarters of a turn, which is the grand-design look — open enough
// to read instantly at a glance on a phone, tight enough to be unmistakably a
// spiral rather than a pinwheel.
export const TILT_RATE = 4.3

// Orbits are ellipses, and how elongated they are decides how hard the arms
// bite. Circular orbits (ratio 1) crowd nowhere and give a featureless disc;
// too elongated and the galaxy reads as a bar. The core is kept nearly round —
// a real bulge is pressure-supported and doesn't participate in the wave — and
// the ratio opens out through the disk and relaxes again at the rim, which is
// what tapers the arms off into the halo instead of cutting them at a radius.
export function eccentricityAt(a, rCore, rDisk) {
  if (a < rCore) return 1.0 - 0.22 * (a / rCore)
  const t = Math.min(1, (a - rCore) / Math.max(1e-4, rDisk - rCore))
  // 0.78 at the arms' strongest, easing back toward round at the frontier
  return 0.78 + 0.2 * t * t
}

// The rotation curve. Real galaxies do not rotate like a record: the inner disk
// climbs almost solidly, then the curve flattens and stays flat far past where
// the visible mass ends (the observation that gave us dark matter). Angular
// speed is therefore highest at the heart and falls off outward, so the galaxy
// is continuously shearing — which is exactly the motion that makes a still
// screen feel alive rather than animated.
const RC = 0.22 // where the curve turns over
const OM0 = 0.0125 // scales the whole thing; ~5 min for a mid-disk orbit
export function omegaAt(a) {
  return OM0 / Math.sqrt(a * a + RC * RC)
}

// The pattern itself turns, slowly and rigidly — the wave's own speed, quite
// separate from the stars moving through it. Slower than everything else in the
// frame by design: it is the deepest, calmest motion in the product.
export const PATTERN_SPEED = 0.0061

// ── deterministic randomness ─────────────────────────────────────────────────
// Every generator is seeded, so a sky is identical on every mount and across
// every device. A galaxy that reshuffled itself when you navigated away and
// back would quietly destroy the illusion that it is a place.
export function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}
export function gaussFrom(rnd) {
  return (rnd() + rnd() + rnd() + rnd() - 2) / 2
}

// ── writing a star ───────────────────────────────────────────────────────────
export function writeStar(buf, i, a, b, phi0, omega, theta0, y, tempU, lum) {
  const o = i * STAR_STRIDE
  buf[o] = a
  buf[o + 1] = b
  buf[o + 2] = phi0
  buf[o + 3] = omega
  buf[o + 4] = theta0
  buf[o + 5] = y
  buf[o + 6] = tempU
  buf[o + 7] = lum
}

// A star that does not orbit — the deep field, the halo, a fixed marker. Given
// a point in space, encode it in the same eight floats so ONE shader can draw
// every population in the sky. (A circular orbit of radius |p| whose phase is
// p's own angle is a stationary point; give it a whisper of omega and it drifts
// instead, which is what keeps even the far field from looking painted on.)
export function writeStatic(buf, i, x, y, z, tempU, lum, drift = 0) {
  const r = Math.hypot(x, z) || 1e-5
  writeStar(buf, i, r, r, Math.atan2(z, x), drift, 0, y, tempU, lum)
}

// The position a star occupies at a given orbit clock — the CPU mirror of the
// vertex shader's math, needed wherever the engine has to KNOW where something
// is: aiming a camera dive, hit-testing a tap, seating an @ tag over its star.
// The two must agree exactly or a tapped star and its label drift apart.
export function starAt(buf, i, orbitT, patternAngle, out) {
  const o = i * STAR_STRIDE
  const a = buf[o], b = buf[o + 1]
  const phi = buf[o + 2] + buf[o + 3] * orbitT
  const th = buf[o + 4] + patternAngle
  const ex = a * Math.cos(phi)
  const ez = b * Math.sin(phi)
  const ct = Math.cos(th), st = Math.sin(th)
  out = out || { x: 0, y: 0, z: 0 }
  out.x = ex * ct - ez * st
  out.z = ex * st + ez * ct
  out.y = buf[o + 5]
  return out
}

// ── populations ──────────────────────────────────────────────────────────────
// Each generator returns a Float32Array laid out for the star shader. They are
// deliberately separate calls rather than one big "make a galaxy", because the
// two skies want different mixes of the same ingredients and the community sky
// has to be able to regrow its disk at runtime without touching anything else.

import { sampleStar, tempToU } from './blackbody.js'

// The bulge: an old, dense, pressure-supported spheroid. It is nearly round, it
// barely participates in the wave, and it is gold because every blue star it
// ever had died a long time ago.
export function genBulge(count, { seed = 11, radius = 0.3, flatten = 0.72 } = {}) {
  const rnd = rng(seed)
  const buf = new Float32Array(count * STAR_STRIDE)
  for (let i = 0; i < count; i++) {
    // r^(1/4)-ish concentration: a real bulge is far denser at its heart than a
    // uniform sphere, which is what gives it a luminous core rather than a ball
    const a = Math.pow(rnd(), 2.1) * radius
    const b = a * eccentricityAt(a, radius, radius)
    const phi = rnd() * Math.PI * 2
    // out-of-plane thickness — a bulge is a squashed sphere, not a disk
    const g = gaussFrom(rnd)
    const y = g * a * flatten * 0.62
    const s = sampleStar(rnd, 'bulge')
    writeStar(buf, i, a, b, phi, omegaAt(a), TILT_RATE * a * 0.35, y, tempToU(s.T), s.lum)
  }
  return buf
}

// The disk: the wave's home. `armFrac` of the stars are seeded into the
// crowding — young, hot, and short-lived, exactly where the gas is being
// compressed — and the rest are spread evenly along their orbits as the settled
// older population drifting through.
export function genDisk(count, { seed = 23, rCore = 0.18, rDisk = 1.15, armFrac = 0.55, thickness = 1 } = {}) {
  const rnd = rng(seed)
  const buf = new Float32Array(count * STAR_STRIDE)
  for (let i = 0; i < count; i++) {
    // an exponential disk — the radial profile every real spiral has
    let a = -0.42 * Math.log(1 - rnd() * 0.995)
    if (a > rDisk * 1.5) a = rDisk * (1.0 + rnd() * 0.4)
    a = Math.max(0.045, a)
    const b = a * eccentricityAt(a, rCore, rDisk)
    const young = rnd() < armFrac && a > rCore * 0.8
    let phi
    if (young) {
      // Born in the jam. The crowding sits near the ends of each orbit's major
      // axis, so a young star's phase clusters there — this is the physical
      // reason arms are blue, expressed as three lines of generator rather than
      // as an art direction note.
      const lobe = rnd() < 0.5 ? 0 : Math.PI
      phi = lobe + gaussFrom(rnd) * 0.44
    } else {
      phi = rnd() * Math.PI * 2
    }
    const g = gaussFrom(rnd)
    // the disk is THIN, and thinner further out — a flared inner disk is what
    // gives the galaxy a heart when you look at it edge-on
    const y = g * (0.012 + 0.055 * Math.exp(-a * 2.4)) * thickness
    const s = sampleStar(rnd, young ? 'arm' : 'disk')
    writeStar(buf, i, a, b, phi, omegaAt(a), TILT_RATE * a, y, tempToU(s.T), s.lum)
  }
  return buf
}

// The halo: ancient stars on wild, barely-ordered orbits far above and below
// the plane. Sparse and dim, and the whole reason the galaxy dissolves into
// space instead of being cut out of it.
export function genHalo(count, { seed = 37, rMin = 0.5, rMax = 2.6, flatten = 0.55 } = {}) {
  const rnd = rng(seed)
  const buf = new Float32Array(count * STAR_STRIDE)
  for (let i = 0; i < count; i++) {
    const rr = rMin + Math.pow(rnd(), 0.62) * (rMax - rMin)
    const v = rnd() * 2 - 1
    const ring = Math.sqrt(Math.max(0, 1 - v * v))
    const u = rnd() * Math.PI * 2
    const s = sampleStar(rnd, 'halo')
    writeStatic(buf, i, rr * ring * Math.cos(u), rr * v * flatten, rr * ring * Math.sin(u), tempToU(s.T), s.lum, omegaAt(rr) * 0.25)
  }
  return buf
}

// The deep field: everything else in the universe. A shell of far suns well
// outside the galaxy, which barely creep while the disk streams past during a
// dive — that contrast is the entire reason camera travel reads as travel
// rather than as a zoom.
export function genDeepField(count, { seed = 53, rMin = 3.2, rMax = 26 } = {}) {
  const rnd = rng(seed)
  const buf = new Float32Array(count * STAR_STRIDE)
  for (let i = 0; i < count; i++) {
    const rr = rMin + Math.pow(rnd(), 1.35) * (rMax - rMin)
    const v = rnd() * 2 - 1
    const ring = Math.sqrt(Math.max(0, 1 - v * v))
    const u = rnd() * Math.PI * 2
    // Distant galaxies' worth of stars: the population is unresolved, so the
    // sampling is broad rather than physical. What matters here is that the
    // colours are varied and mostly cool — a far field of identical white dots
    // is the tell of a synthetic sky.
    const t = rnd()
    const T = t < 0.12 ? 12000 + rnd() * 14000 : t < 0.28 ? 3200 + rnd() * 1400 : 4600 + rnd() * 3200
    writeStatic(buf, i, rr * ring * Math.cos(u), rr * v * 0.92, rr * ring * Math.sin(u), tempToU(T), 0.25 + rnd() * 3.2)
  }
  return buf
}

// The near field: loose stars drifting BETWEEN the camera and the disk. They
// are what make a dive feel like a dive — close things sweep past fast, far
// things barely move, and the brain reads the difference as distance travelled.
export function genNearField(count, { seed = 71, extent = 2.4 } = {}) {
  const rnd = rng(seed)
  const buf = new Float32Array(count * STAR_STRIDE)
  for (let i = 0; i < count; i++) {
    const T = rnd() < 0.22 ? 9000 + rnd() * 9000 : 3600 + rnd() * 2800
    writeStatic(
      buf, i,
      (rnd() - 0.5) * extent * 2,
      (rnd() - 0.5) * extent * 1.3,
      (rnd() - 0.5) * extent * 2,
      tempToU(T), 0.3 + rnd() * 2.4,
      (rnd() - 0.5) * 0.02,
    )
  }
  return buf
}

// ── the countable sky's slots ────────────────────────────────────────────────
// One ping, one star, forever in the same place. The community sky's whole
// contract is that its population is REAL and COUNTABLE, so a slot has to be a
// pure function of the ping's index — a star that moved when someone else
// joined would make the sky a decoration rather than a record.
//
// The radius grows as sqrt(i), which fills area evenly from the heart outward,
// and — this is the part that matters for growth — it is an ABSOLUTE radius,
// not a fraction of some cap. When a community goes from 100 members to 10,000
// its existing stars do not move a millimetre: the galaxy genuinely gets
// bigger, and the camera simply stands further back to hold it in frame. The
// old model divided by a fixed CAP of 1,200, so every new ping past that
// silently re-scaled everyone else's position.
const SLOT_SCALE = 0.031

export function slotRadius(i) {
  return SLOT_SCALE * Math.sqrt(i + 0.6)
}
// How big the disk is for a population of n — what the camera has to frame.
export function diskRadiusFor(n) {
  return Math.max(0.36, slotRadius(Math.max(0, n - 1)) * 1.06)
}

// The i-th ping's star. Deterministic, stable for the life of the community.
export function writeSlot(buf, at, i, seedSalt = 0) {
  // a hash of the index, so a slot's character is fixed but not patterned
  let s = ((i + 1) * 2654435761 + 0x9e3779b9 + seedSalt) >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
  const g = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2

  const a0 = slotRadius(i)
  const rCore = 0.17
  const rDisk = Math.max(0.5, a0 * 1.2)
  const kind = rnd()
  let a = a0
  let phi
  let young = false
  let y
  if (a0 < 0.13 || kind < 0.15) {
    // the heart — the first hundred pings are a young, tight, golden cluster,
    // which is exactly what a new community should look like
    a = a0 * (0.55 + rnd() * 0.5)
    phi = rnd() * Math.PI * 2
    y = g() * (0.04 + 0.03 * Math.exp(-a * 4))
  } else if (kind < 0.84) {
    young = true
    a = Math.max(0.05, a0 + g() * 0.035)
    const lobe = rnd() < 0.5 ? 0 : Math.PI
    phi = lobe + g() * 0.5
    y = g() * (0.012 + 0.05 * Math.exp(-a * 2.6))
  } else {
    phi = rnd() * Math.PI * 2
    y = g() * (0.016 + 0.045 * Math.exp(-a * 2.2))
  }
  const b = a * eccentricityAt(a, rCore, Math.max(rDisk, rCore + 0.01))
  const s2 = sampleStar(rnd, young ? 'arm' : a < 0.16 ? 'bulge' : 'disk')
  // A ping is a resolved star, not dust: the countable population owns the sky
  // over every decorative layer, so its floor luminosity is lifted.
  writeStar(buf, at, a, b, phi, omegaAt(a), TILT_RATE * a, y, tempToU(s2.T), Math.max(1.4, s2.lum))
  return { a, b, phi, y }
}

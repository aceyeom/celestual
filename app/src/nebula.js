// nebula.js — the baked cloud instrument both skies draw their gas with.
//
// The old gas was a handful of huge radial gradients — soft-serve fog, the
// "cheap gradient" look. This bakes REAL cloud structure once, offscreen, and
// lets the engines blit it every frame for the cost of a few drawImage calls:
//
//   · hundreds of small soft puffs whose density, hue and alpha are driven by
//     fractal value noise (fBm) — filaments, knots and shoals instead of one
//     smooth wash;
//   · seated along the SAME spiral equation the engine's stars use (the
//     `angle` callback), so the gas and the population describe one galaxy;
//   · carved by dark dust lanes (destination-out puffs riding a second noise
//     channel) — the rifts that make a bright body read as a real nebula;
//   · dusted with sub-pixel grain: unresolved starlight in the milky body.
//
// Everything is deterministic in its seed: a sheet never boils between mounts.
// One bake per (seed × palette); the engines cache the canvas and map it onto
// the tilted disk plane with a single transform, so the cloud tilts, spins and
// parallaxes with the galaxy like everything else.

const TWO = Math.PI * 2

function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── deterministic 2D value noise + fBm ───────────────────────────────────────
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = ((x | 0) * 374761393 + (y | 0) * 668265263) ^ ((seed | 0) * 974711)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return ((h >>> 0) % 4096) / 4096
  }
  const sm = (t) => t * t * (3 - 2 * t)
  const noise = (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const a = hash(xi, yi)
    const b = hash(xi + 1, yi)
    const c = hash(xi, yi + 1)
    const d = hash(xi + 1, yi + 1)
    const u = sm(xf)
    const v = sm(yf)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  const fbm = (x, y, oct = 4) => {
    let s = 0
    let amp = 0.5
    let f = 1
    for (let o = 0; o < oct; o++) {
      s += noise(x * f, y * f) * amp
      f *= 2.03
      amp *= 0.5
    }
    return s
  }
  return { noise, fbm }
}

// a soft gas puff — cooler-hearted than a star glow, so clouds read as matter
// catching light, never as blurred stars
const puffCache = {}
function makePuff(color) {
  if (puffCache[color]) return puffCache[color]
  const size = 64
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.5)`)
  grd.addColorStop(0.4, `rgba(${r},${g},${b},0.2)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  puffCache[color] = s
  return s
}

let darkPuff = null
function makeDarkPuff() {
  if (darkPuff) return darkPuff
  const size = 64
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(0,0,0,0.85)')
  grd.addColorStop(0.5, 'rgba(0,0,0,0.4)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  darkPuff = s
  return s
}

// ── the disk sheet ───────────────────────────────────────────────────────────
// A square canvas mapped to the disk plane: world (px, pz) ∈ [-extent, extent]²
// → texture space. The engine draws it with one plane transform per frame.
//
//   seed     — everything derives from it; same seed, same cloud, forever
//   extent   — world half-width the sheet covers (the engine's disk radius + margin)
//   angle    — (arm, r) → the engine's own spiral equation, so gas rides the
//              same lanes its stars seat on
//   arms     — how many arms feed filaments
//   feather  — how loosely the filaments hug the lanes (higher = a wilder,
//              proto-galaxy swirl; lower = clean spiral gas)
//   ramp     — hue ramp from the heart outward: [core, inner, mid, rim]
//   lanes    — 0..1 how hard the dark dust carves
export function makeNebulaSheet({
  seed = 1,
  size = 512,
  extent = 1.2,
  angle = (arm, r) => arm * Math.PI + r * 3,
  arms = 2,
  feather = 0.16,
  ramp = ['#F4C9A1', '#C77E8A', '#7E6BA8', '#5E7BB0'],
  lanes = 0.7,
  grain = 1,
} = {}) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')
  const { noise, fbm } = makeNoise(seed)
  let s = (seed * 48271) % 2147483647 || 7
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5
  const px2 = (wx) => ((wx / extent) * 0.5 + 0.5) * size // world → texture px

  // 1 · the luminous body — noise-gated puffs seated on the arm filaments
  // (most) and pooled through the inter-arm body (the rest), denser and
  // warmer toward the heart. Density is fBm-shaped, so the cloud has knots,
  // shoals and true empty gaps — structure, not wash.
  ctx.globalCompositeOperation = 'lighter'
  const sprites = ramp.map((hex) => makePuff(hex))
  const P = Math.round(size * 2.6) // puff candidates (≈1330 at 512)
  for (let i = 0; i < P; i++) {
    const onArm = rnd() < 0.62
    const r = onArm ? Math.pow(rnd(), 0.72) * extent * 0.86 : Math.pow(rnd(), 0.6) * extent * 0.9
    const arm = i % Math.max(1, arms)
    const ang = onArm ? angle(arm, r) + gauss() * (feather + feather * 1.4 * (r / extent)) : rnd() * TWO
    const wx = Math.cos(ang) * r
    const wz = Math.sin(ang) * r
    // density: fBm over world space, biased brighter toward the heart and
    // gated so real gaps survive between the shoals
    const den = fbm(wx * 2.6 + 40, wz * 2.6 + 40) * (onArm ? 1.12 : 0.92)
    const gate = Math.max(0, den - 0.34)
    if (gate <= 0.004) continue
    const heart = Math.exp(-(r / extent) * 2.1)
    // hue: the heart burns the ramp's warm end; the rim cools through it,
    // stirred by a second noise channel so color pools rather than bands
    const stir = noise(wx * 5 + 90, wz * 5 + 90) * 0.55
    const hueT = Math.min(0.999, Math.max(0, (r / extent) * 0.9 + stir - heart * 0.45))
    const sp = sprites[Math.min(ramp.length - 1, Math.floor(hueT * ramp.length))]
    const x = px2(wx)
    const y = px2(wz)
    const rad = (4 + Math.pow(gate, 0.7) * 26 + heart * 8) * (size / 512)
    ctx.globalAlpha = Math.min(0.16, gate * (0.1 + heart * 0.12) * 1.5)
    ctx.drawImage(sp, x - rad, y - rad, rad * 2, rad * 2)
  }

  // 2 · the dark rifts — dust lanes carved OUT of the body along the arms'
  // inner edges and wherever the lane-noise channel runs deep. This is what
  // turns bright fog into a nebula.
  if (lanes > 0.01) {
    ctx.globalCompositeOperation = 'destination-out'
    const dark = makeDarkPuff()
    const L = Math.round(size * 1.1)
    for (let i = 0; i < L; i++) {
      const r = Math.pow(rnd(), 0.7) * extent * 0.82
      const arm = i % Math.max(1, arms)
      const edge = 0.4 + rnd() * 0.5
      const ang = angle(arm, r) - feather * edge + gauss() * feather * 0.5
      const wx = Math.cos(ang) * r
      const wz = Math.sin(ang) * r
      const rift = fbm(wx * 3.4 + 210, wz * 3.4 + 210)
      if (rift < 0.52) continue
      const x = px2(wx)
      const y = px2(wz)
      const rad = (3 + (rift - 0.52) * 34) * (size / 512)
      ctx.globalAlpha = Math.min(0.42, (rift - 0.52) * 1.15) * lanes
      ctx.drawImage(dark, x - rad, y - rad, rad * 2, rad * 2)
    }
  }

  // 3 · the grain — sub-pixel unresolved starlight dusted where the gas is
  // densest, so the milky body sparkles faintly instead of reading airbrushed
  if (grain > 0.01) {
    ctx.globalCompositeOperation = 'lighter'
    const G = Math.round(size * 1.6)
    for (let i = 0; i < G; i++) {
      const r = Math.pow(rnd(), 0.62) * extent * 0.88
      const ang = rnd() * TWO
      const wx = Math.cos(ang) * r
      const wz = Math.sin(ang) * r
      const den = fbm(wx * 2.6 + 40, wz * 2.6 + 40)
      if (den < 0.42) continue
      const x = px2(wx)
      const y = px2(wz)
      const a = (den - 0.42) * (0.5 + rnd() * 0.6) * grain
      if (a <= 0.02) continue
      ctx.globalAlpha = Math.min(0.55, a)
      const warm = rnd() < 0.3
      ctx.fillStyle = warm ? 'rgba(255,226,200,1)' : 'rgba(238,240,252,1)'
      const d = rnd() < 0.85 ? 1 : 1.6
      ctx.fillRect(x, y, d, d)
    }
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  cv._extent = extent
  return cv
}

// ── the deep-sky band ────────────────────────────────────────────────────────
// A long milky-way ribbon for a backdrop: dense unresolved starlight pooling
// along a horizontal band, fBm-clumped, split by a dark central rift, dusted
// with grain. The engine lays it across deep space at a slant, far behind the
// disk — the "you are inside a bigger galaxy" light every real night sky has.
export function makeBandSheet({ seed = 2, w = 1024, h = 288, ramp = ['#EFEAF2', '#BFD3FA', '#7E6BA8', '#F4C9A1'] } = {}) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  const { noise, fbm } = makeNoise(seed)
  let s = (seed * 69621) % 2147483647 || 11
  const rnd = () => (s = (s * 69621) % 2147483647) / 2147483647

  ctx.globalCompositeOperation = 'lighter'
  const sprites = ramp.map((hex) => makePuff(hex))
  const P = Math.round(w * 1.4)
  for (let i = 0; i < P; i++) {
    const x = rnd() * w
    // pool toward the band's spine, with a slow wave along its length
    const spine = h * (0.5 + Math.sin((x / w) * Math.PI * 1.7 + seed) * 0.08)
    const y = spine + (rnd() + rnd() + rnd() - 1.5) * h * 0.42
    if (y < 0 || y > h) continue
    const den = fbm(x * 0.008 + 7, y * 0.016 + 7)
    const gate = Math.max(0, den - 0.36)
    if (gate <= 0.004) continue
    const endFade = Math.sin((x / w) * Math.PI) // the ribbon dissolves at its ends
    const stir = noise(x * 0.02 + 50, y * 0.03 + 50)
    const sp = sprites[Math.min(ramp.length - 1, Math.floor(stir * ramp.length))]
    const rad = 4 + Math.pow(gate, 0.7) * 30
    ctx.globalAlpha = Math.min(0.13, gate * 0.34) * endFade
    ctx.drawImage(sp, x - rad, y - rad, rad * 2, rad * 2)
  }

  // the great rift — the dark dust river that makes it the milky way
  ctx.globalCompositeOperation = 'destination-out'
  const dark = makeDarkPuff()
  for (let i = 0; i < Math.round(w * 0.5); i++) {
    const x = rnd() * w
    const spine = h * (0.52 + Math.sin((x / w) * Math.PI * 1.7 + seed) * 0.08)
    const y = spine + (rnd() - 0.5) * h * 0.2
    const rift = fbm(x * 0.006 + 300, y * 0.02 + 300)
    if (rift < 0.46) continue
    const rad = 6 + (rift - 0.46) * 60
    ctx.globalAlpha = Math.min(0.5, (rift - 0.46) * 1.5)
    ctx.drawImage(dark, x - rad, y - rad, rad * 2, rad * 2)
  }

  // grain — the band IS unresolved stars; let a few thousand of them show
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < w * 2; i++) {
    const x = rnd() * w
    const spine = h * (0.5 + Math.sin((x / w) * Math.PI * 1.7 + seed) * 0.08)
    const y = spine + (rnd() + rnd() + rnd() - 1.5) * h * 0.4
    if (y < 0 || y > h) continue
    const den = fbm(x * 0.008 + 7, y * 0.016 + 7)
    if (den < 0.4) continue
    ctx.globalAlpha = Math.min(0.5, (den - 0.4) * (0.4 + rnd() * 0.7)) * Math.sin((x / w) * Math.PI)
    ctx.fillStyle = rnd() < 0.25 ? 'rgba(255,228,204,1)' : 'rgba(240,242,252,1)'
    ctx.fillRect(x, y, 1, 1)
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  return cv
}

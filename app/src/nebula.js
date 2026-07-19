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

// ── the structured puff ──────────────────────────────────────────────────────
// The old puff was a bare radial gradient, and a cloud assembled from bare
// radial gradients reads as exactly that: rows of round pale stains. Real gas
// catches light unevenly — it is riven. So every puff now draws through a
// baked fBm alpha MASK: the billboard is torn into wisps and clumps with
// feathered, irregular edges, and its silhouette is no longer a circle. A
// small family of masks (each its own noise seed) breaks the repetition so
// neighbouring puffs never share a shape; masks are applied at bake time, so
// a structured puff still costs the engines exactly one drawImage.
export const PUFF_VARIANTS = 4
const maskCache = {}
function puffMask(variant) {
  const v = ((variant | 0) % PUFF_VARIANTS + PUFF_VARIANTS) % PUFF_VARIANTS
  if (maskCache[v]) return maskCache[v]
  const size = 96
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const c = cv.getContext('2d')
  const { fbm } = makeNoise(7717 + v * 991)
  const img = c.createImageData(size, size)
  const data = img.data
  const m = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - m) / m
      const dy = (y - m) / m
      const r2 = dx * dx + dy * dy
      if (r2 >= 1) continue
      // radial envelope — full through the body, feathering hard to nothing
      // at the rim so no scaled billboard ever shows a square or a hard edge
      const env = Math.pow(1 - r2, 1.6)
      // the rive — fBm across the billboard, gated deep enough that true
      // holes open inside the body (light through torn gas, not a disc)
      const n = fbm(dx * 2.3 + v * 11.7, dy * 2.3 + v * 7.3, 4)
      const a = env * Math.min(1, Math.max(0, n * 1.9 - 0.5))
      const at = (y * size + x) * 4
      data[at] = 255
      data[at + 1] = 255
      data[at + 2] = 255
      data[at + 3] = (a * 255) | 0
    }
  }
  c.putImageData(img, 0, 0)
  maskCache[v] = cv
  return cv
}

// a riven gas puff — the mask torn into wisps, tinted by an inner-glow
// gradient so each clump is brighter-hearted than its edges: matter catching
// light, never a blurred star
const puffCache = {}
export function makePuff(color, variant = 0) {
  const key = color + '|' + (variant | 0)
  if (puffCache[key]) return puffCache[key]
  const size = 96
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  c.drawImage(puffMask(variant), 0, 0)
  c.globalCompositeOperation = 'source-in'
  // additive stacking desaturates — dozens of overlapping tints average
  // toward gray — so each puff is baked a shade RICHER than its ramp color
  // (channels pushed away from luma) and the sky sums back to the true hue
  const [r0, g0, b0] = hexToRgb(color)
  const luma = 0.299 * r0 + 0.587 * g0 + 0.114 * b0
  const sat = (v) => Math.max(0, Math.min(255, Math.round(luma + (v - luma) * 1.45)))
  const r = sat(r0), g = sat(g0), b = sat(b0)
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
  grd.addColorStop(0.45, `rgba(${r},${g},${b},0.32)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0.12)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  c.globalCompositeOperation = 'source-over'
  puffCache[key] = s
  return s
}

// the dust clump — the same riven silhouette, near-ink with a whisper of warm
// brown (interstellar dust is sooty, not void-black). destination-out callers
// only read its alpha; the volumetric pass paints it BETWEEN the sorted light.
const darkPuffCache = {}
export function makeDarkPuff(variant = 0) {
  const key = variant | 0
  if (darkPuffCache[key]) return darkPuffCache[key]
  const size = 96
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  c.drawImage(puffMask(variant), 0, 0)
  c.globalCompositeOperation = 'source-in'
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(9,6,12,0.85)')
  grd.addColorStop(0.5, 'rgba(9,6,12,0.42)')
  grd.addColorStop(1, 'rgba(9,6,12,0.14)')
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  c.globalCompositeOperation = 'source-over'
  darkPuffCache[key] = s
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

// ── the VOLUMETRIC cloud ─────────────────────────────────────────────────────
// The baked disk sheet above is a flat texture mapped onto the disk plane —
// perfect face-on, but turn the galaxy toward its side axis and a painting
// has no thickness: it collapses into a sliver and the illusion breaks. This
// generator replaces it with a TRUE 3D cloud: hundreds of gas puffs seated in
// the disk VOLUME (spiral filaments in the plane, a real gaussian thickness
// out of it, pooling toward the heart), each one projected through the
// engine's own camera every frame and drawn as a depth-sorted soft billboard.
// Rotate the galaxy on any axis and the cloud holds its body — near puffs
// spread past the camera, far ones recede, edge-on it stacks into a proper
// luminous band with real parallax between its layers.
//
// Density, hue and the dark dust are driven by the same fBm the sheet used,
// so the cloud keeps its knots, shoals and carved rifts — dust puffs are
// generated as `dark: true` and the engine paints them near-ink BETWEEN the
// depth-sorted light (occlusion, not erasure), which is what a real rift is.
//
// Deterministic in its seed; generation happens once, drawing is a per-frame
// project + sort + blit. Each puff:
//   { ang, r, y, rad, hue, a, dark, v, tw, tws }
//   ang/r/y — cylinder coordinates in disk space (the engine adds spin/tilt)
//   rad     — world-unit radius of the billboard
//   hue     — a blended color off `ramp` (dark puffs ignore it)
//   v       — which riven mask silhouette the puff wears (see makePuff)
export function genVolumetricCloud({
  seed = 1,
  count = 520,
  extent = 1.2,
  angle = (arm, r) => arm * Math.PI + r * 3,
  arms = 2,
  feather = 0.16,
  ramp = ['#F4C9A1', '#C77E8A', '#7E6BA8', '#5E7BB0'],
  thickness = (r) => 0.045 + 0.14 * Math.exp(-r * 2.4),
  dustFrac = 0.32,
  coreFrac = 0.2,
  swirlJitter = 0, // 0 = clean spiral gas; higher = wilder proto-cloud swirl
} = {}) {
  const { noise, fbm } = makeNoise(seed)
  let s = (seed * 48271) % 2147483647 || 7
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5

  // The hue ramp is CONTINUOUS: sample the four stops with linear blending
  // (gently quantized so sprite bakes stay bounded), so neighbouring puffs
  // shade into each other through real intermediate colors. The old discrete
  // pick jumped between four paint pots — the patchy, inconsistent color.
  const rampRgb = ramp.map(hexToRgb)
  const hueAt = (t) => {
    const q = Math.min(0.999, Math.max(0, t)) * (rampRgb.length - 1)
    const i = q | 0
    const f = Math.round((q - i) * 3) / 3
    const A = rampRgb[i]
    const B = rampRgb[Math.min(i + 1, rampRgb.length - 1)]
    const r = Math.round(A[0] + (B[0] - A[0]) * f)
    const g = Math.round(A[1] + (B[1] - A[1]) * f)
    const b = Math.round(A[2] + (B[2] - A[2]) * f)
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }

  const puffs = []
  const target = Math.round(count)
  let guard = target * 14
  while (puffs.length < target && guard-- > 0) {
    const dark = rnd() < dustFrac
    const inCore = !dark && rnd() < coreFrac
    let r, ang
    let offArm = false
    if (inCore) {
      // the heart — gas pooled dense and warm around the bulge
      r = Math.pow(rnd(), 1.5) * extent * 0.34
      ang = rnd() * TWO
    } else if (dark) {
      // dust rides the arms' INNER edges — the carved rift of a real spiral
      r = (0.12 + Math.pow(rnd(), 0.72) * 0.82) * extent
      const arm = puffs.length % Math.max(1, arms)
      ang = angle(arm, r) - feather * (0.35 + rnd() * 0.55) + gauss() * feather * 0.5
    } else {
      // gas belongs to the LANES. Four in five puffs hug the arm equation;
      // the loose remainder must also pass a harder density gate below, so
      // stray gas only survives where the fBm field is genuinely dense —
      // never as lone blobs scattered across empty disk.
      const onArm = rnd() < 0.8
      offArm = !onArm
      r = (onArm ? Math.pow(rnd(), 0.72) * 0.88 : Math.pow(rnd(), 0.58) * 0.94) * extent
      const arm = puffs.length % Math.max(1, arms)
      ang = onArm
        ? angle(arm, r) + gauss() * (feather + feather * 1.5 * (r / extent) + swirlJitter)
        : rnd() * TWO
    }
    const wx = Math.cos(ang) * r
    const wz = Math.sin(ang) * r
    // fBm gates density so real knots, shoals and empty gaps survive; loose
    // inter-arm gas answers to a much deeper gate than the lanes
    const den = dark ? fbm(wx * 3.4 + 210, wz * 3.4 + 210) : fbm(wx * 2.6 + 40, wz * 2.6 + 40)
    const gate = Math.max(0, den - (dark ? 0.46 : offArm ? 0.42 : 0.33))
    if (gate <= 0.006) continue
    const heart = Math.exp(-(r / extent) * 2.1)
    // hue cools smoothly from the heart outward, stirred only enough that
    // color pools — a gentle hand, so the ramp stays one coherent gradient
    const stir = noise(wx * 5 + 90, wz * 5 + 90) * 0.3
    const hueT = Math.min(0.999, Math.max(0, (r / extent) * 1.05 + stir - heart * 0.4))
    puffs.push({
      ang,
      r,
      y: gauss() * thickness(r) * (dark ? 0.55 : 1), // dust hugs the plane
      rad: (dark ? 0.05 + Math.pow(gate, 0.75) * 0.16 : 0.05 + Math.pow(gate, 0.7) * 0.21 + heart * 0.04) * (extent / 1.2),
      hue: hueAt(hueT),
      // quieter than it once was: the cloud's beauty is spent on structure,
      // not wattage — and loose gas whispers under the lanes it drifts between
      a: dark ? Math.min(0.34, 0.1 + gate * 0.8) : Math.min(0.13, gate * (0.1 + heart * 0.12) * 1.4) * (offArm ? 0.6 : 1),
      dark,
      v: (rnd() * PUFF_VARIANTS) | 0, // which riven silhouette this puff wears
      tw: rnd() * TWO,
      tws: 0.04 + rnd() * 0.1,
    })
  }
  return puffs
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

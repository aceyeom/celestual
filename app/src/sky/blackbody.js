// sky/blackbody.js — a star's real color, from its real temperature.
//
// The old skies picked a hue from a bag of six hand-chosen swatches. That is
// why the field never quite read as a photograph of anything: real stellar
// color is not a palette, it is a one-dimensional curve — the Planck locus —
// running from deep amber at 2,500 K through white around 6,500 K to hard blue
// past 20,000 K, and every star in the universe sits somewhere on it.
//
// So we do the actual physics, once, at startup:
//
//   Planck's law → CIE 1931 XYZ (via analytic fits to the colour-matching
//   functions) → linear sRGB → normalized to constant luminance
//
// and bake the result into a 256×1 lookup texture the star shaders sample by
// temperature. Luminance is deliberately factored OUT of the color: how BRIGHT
// a star is comes from its magnitude and its distance, never from its hue, so
// the two can be reasoned about — and tuned — independently. That separation is
// what makes a red giant able to be both cool and overwhelming.
//
// Everything is linear-light. Tonemapping happens once, at the very end of the
// frame (gl.js's ACES), which is the only place in the pipeline that knows what
// a display is.

const T_MIN = 1200
const T_MAX = 40000

// Wyman, Sloan & Shirley's multi-lobe gaussian fits to the CIE 1931 2° standard
// observer. Accurate to well under a perceptual JND across the visible band and
// far cheaper than carrying three tabulated 471-entry curves around.
function cieX(w) {
  const t1 = (w - 442.0) * (w < 442.0 ? 0.0624 : 0.0374)
  const t2 = (w - 599.8) * (w < 599.8 ? 0.0264 : 0.0323)
  const t3 = (w - 501.1) * (w < 501.1 ? 0.049 : 0.0382)
  return 0.362 * Math.exp(-0.5 * t1 * t1) + 1.056 * Math.exp(-0.5 * t2 * t2) - 0.065 * Math.exp(-0.5 * t3 * t3)
}
function cieY(w) {
  const t1 = (w - 568.8) * (w < 568.8 ? 0.0213 : 0.0247)
  const t2 = (w - 530.9) * (w < 530.9 ? 0.0613 : 0.0322)
  return 0.821 * Math.exp(-0.5 * t1 * t1) + 0.286 * Math.exp(-0.5 * t2 * t2)
}
function cieZ(w) {
  const t1 = (w - 437.0) * (w < 437.0 ? 0.0845 : 0.0278)
  const t2 = (w - 459.0) * (w < 459.0 ? 0.0385 : 0.0725)
  return 1.217 * Math.exp(-0.5 * t1 * t1) + 0.681 * Math.exp(-0.5 * t2 * t2)
}

// Planck's spectral radiance, in whatever units — the curve is normalized away
// immediately, so only its SHAPE matters here.
function planck(wNm, T) {
  const w = wNm * 1e-9
  const c1 = 3.7417718e-16
  const c2 = 1.4388e-2
  return c1 / (Math.pow(w, 5) * (Math.exp(c2 / (w * T)) - 1))
}

// Temperature → linear-sRGB chromaticity, normalized so that the perceived
// luminance of every entry is 1. Integrated at 5 nm over the visible band.
export function blackbodyRGB(T) {
  let X = 0, Y = 0, Z = 0
  for (let w = 380; w <= 780; w += 5) {
    const s = planck(w, T)
    X += s * cieX(w)
    Y += s * cieY(w)
    Z += s * cieZ(w)
  }
  const n = X + Y + Z
  if (n <= 0) return [1, 1, 1]
  X /= n
  Y /= n
  Z /= n
  // CIE XYZ → linear sRGB (sRGB primaries, D65)
  let r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z
  let g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z
  let b = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z
  // Temperatures at the ends of the locus fall outside the sRGB gamut; rather
  // than clipping to a flat primary (which is what makes naive blackbody code
  // render 2000 K as pure saturated red), desaturate toward white until the
  // color is representable. It keeps the whole locus smooth and printable.
  const m = Math.min(r, g, b)
  if (m < 0) {
    r -= m
    g -= m
    b -= m
  }
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (lum <= 0) return [1, 1, 1]
  return [r / lum, g / lum, b / lum]
}

// Luminance-normalize any colour the way blackbodyRGB normalizes its own: how
// BRIGHT a star is comes from its magnitude and its distance, never from its
// hue, and the whole star pipeline downstream depends on that separation
// holding. Anything handed in through `ramp` goes through here first.
export function normalizeLum(rgb) {
  const [r, g, b] = rgb
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (!(lum > 0)) return [1, 1, 1]
  return [r / lum, g / lum, b / lum]
}

// The 256×1 lookup the shaders sample. u = 0 is T_MIN, u = 1 is T_MAX, spaced
// logarithmically so the crowded, interesting end of the locus (2,500–8,000 K,
// where nearly every visible star lives) gets most of the resolution.
//
// `ramp(u, T)` optionally replaces the Planck locus with another
// one-dimensional colour curve, which is the single hook a monochrome sky needs:
// every star in the field, every hero halo and every resolved surface reads its
// colour from this one texture, so swapping the curve recolours the entire
// universe without touching a shader. It is used by /beta (see beta/sky.js),
// where the whole brand is one hue and the locus runs brown to ivory instead of
// amber to blue. Passing nothing keeps the real physics, which is what every
// production surface does.
export function makeBlackbodyLUT(gl, ramp) {
  const N = 256
  // Values above 1 are normal here — a hot star's blue channel genuinely
  // exceeds unit luminance-normalized white — so the LUT has to be float, not
  // an 8-bit texture that would clamp the ends of the locus flat.
  const data = new Float32Array(N * 4)
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1)
    const T = tempAt(u)
    const [r, g, b] = ramp ? normalizeLum(ramp(u, T)) : blackbodyRGB(T)
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 1
  }
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  // RGBA16F is sampleable everywhere WebGL2 is; only RENDERING to it needs an
  // extension, and we never render to this one.
  const half = new Uint16Array(N * 4)
  for (let i = 0; i < data.length; i++) half[i] = toHalf(data[i])
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, N, 1, 0, gl.RGBA, gl.HALF_FLOAT, half)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

export function tempAt(u) {
  return T_MIN * Math.pow(T_MAX / T_MIN, u)
}
// The inverse — what a generator stores in the star's attribute buffer.
export function tempToU(T) {
  return Math.log(Math.max(T_MIN, Math.min(T_MAX, T)) / T_MIN) / Math.log(T_MAX / T_MIN)
}

// float32 → IEEE half. Small enough to inline; avoids shipping a dependency for
// one bit-twiddle.
const _f32 = new Float32Array(1)
const _i32 = new Int32Array(_f32.buffer)
export function toHalf(val) {
  _f32[0] = val
  const x = _i32[0]
  let bits = (x >> 16) & 0x8000
  let m = (x >> 12) & 0x07ff
  const e = (x >> 23) & 0xff
  if (e < 103) return bits
  if (e > 142) {
    bits |= 0x7c00
    bits |= (e === 255 ? 0 : 1) && x & 0x007fffff
    return bits
  }
  if (e < 113) {
    m |= 0x0800
    bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1)
    return bits
  }
  bits |= ((e - 112) << 10) | (m >> 1)
  bits += m & 1
  return bits
}

// ── the stellar populations ──────────────────────────────────────────────────
// Which temperatures actually occur, and how often. A real galaxy's colour is
// not decoration — it is demographics, and it varies with WHERE you look:
//
//   · the bulge is old. Its massive blue stars burned out billions of years
//     ago, so what remains is red and yellow dwarfs and a scatter of luminous
//     red giants. This is why a real galaxy's heart is gold.
//   · the arms are where gas is still collapsing, so they hold the young, hot,
//     short-lived O and B stars — which is why arms are BLUE, and why they are
//     blue only where they are actively forming stars.
//   · between the arms sits the settled middle population, sun-like and calm.
//
// Sampling from this rather than from a palette is the whole reason the new
// field reads as a photograph of a galaxy instead of an illustration of one.
// Returns { T, lum } — temperature in kelvin and relative luminosity.

// The initial mass function, sampled through its consequence: hot stars are
// rare and brilliant, cool stars are common and dim, in roughly the ratio the
// real universe keeps.
export function sampleStar(rnd, region) {
  const u = rnd()
  // The fractions below are not the real IMF's, and they are not meant to be.
  // A real galaxy has hundreds of billions of stars and this field has a
  // hundred thousand, so each rendered star stands in for a million; sampling
  // the true fractions would put roughly zero supergiants in frame. What is
  // preserved is the ORDERING and the ratios that matter to the eye: brilliant
  // stars are rare and rare stars are brilliant, arms are blue because they are
  // young, the bulge is gold because it is old. Push the bright tails any
  // higher and the frame turns into a string of beads; any lower and the arms
  // stop reading as arms.
  if (region === 'bulge') {
    // old, metal-rich population: red and yellow dwarfs, with real red giants
    if (u < 0.015) {
      // the red giants — cool, enormous, and by far the brightest things here.
      // A handful of them is what gives a bulge its warm grain rather than a
      // uniform yellow wash.
      return { T: 3100 + rnd() * 1100, lum: 40 + rnd() * 180 }
    }
    if (u < 0.28) return { T: 4200 + rnd() * 1100, lum: 0.5 + rnd() * 2.4 }
    if (u < 0.72) return { T: 3300 + rnd() * 1000, lum: 0.06 + rnd() * 0.4 }
    return { T: 5200 + rnd() * 1200, lum: 0.7 + rnd() * 1.8 }
  }
  if (region === 'arm') {
    // a star-forming lane: the young and violent end of the sequence
    if (u < 0.005) {
      // O/B supergiants. One in two hundred, and they carry the arm's entire
      // colour — this ratio is the difference between a blue arm and a string
      // of blown-out beads.
      return { T: 16000 + rnd() * 15000, lum: 700 + rnd() * 4200 }
    }
    if (u < 0.045) return { T: 9000 + rnd() * 5500, lum: 22 + rnd() * 150 }
    if (u < 0.26) return { T: 6900 + rnd() * 2300, lum: 2.5 + rnd() * 12 }
    if (u < 0.60) return { T: 5300 + rnd() * 1500, lum: 0.5 + rnd() * 2.0 }
    return { T: 3400 + rnd() * 1500, lum: 0.05 + rnd() * 0.5 }
  }
  if (region === 'halo') {
    // ancient, metal-poor, and sparse — the oldest light in the galaxy
    if (u < 0.008) return { T: 3600 + rnd() * 900, lum: 18 + rnd() * 70 }
    if (u < 0.5) return { T: 4300 + rnd() * 1400, lum: 0.2 + rnd() * 1.1 }
    return { T: 3400 + rnd() * 1100, lum: 0.03 + rnd() * 0.3 }
  }
  // the settled disk between the lanes
  if (u < 0.003) return { T: 11000 + rnd() * 8000, lum: 160 + rnd() * 900 }
  if (u < 0.018) return { T: 3200 + rnd() * 1000, lum: 26 + rnd() * 110 }
  if (u < 0.14) return { T: 7200 + rnd() * 2400, lum: 2.2 + rnd() * 11 }
  if (u < 0.52) return { T: 5300 + rnd() * 1600, lum: 0.5 + rnd() * 2.0 }
  return { T: 3300 + rnd() * 1600, lum: 0.04 + rnd() * 0.45 }
}

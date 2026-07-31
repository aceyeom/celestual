// sky/volume.js — the 3D noise volume the gas is carved out of.
//
// The old nebula was billboards: hundreds of little riven sprites, projected,
// sorted in JavaScript every single frame, and drawn back-to-front. It was a
// good imitation and it had two incurable problems. Sorted billboards are
// O(n log n) on the main thread forever, and — worse — a billboard always faces
// the camera, so gas could never actually be SOMEWHERE. The comments in
// nebula.js are a long record of fighting that: puffs dissolving near the
// camera so they don't "wash the glass", dark puffs needing their own blend
// mode to fake occlusion, a hard rim where the sheet was clipped.
//
// A raymarched volume has none of those problems because the gas genuinely
// occupies space. You can fly through it. Dust in front of light occludes the
// light because it is, in fact, in front of it. Edge-on, the disk's gas stacks
// into a real luminous band with real parallax between its layers, for free,
// because that is what a volume does when you look along it.
//
// The march needs a density field, and evaluating fractal noise analytically at
// thirty steps per pixel is far too expensive on the phones this has to run on.
// So the noise is baked ONCE into a small tiling 3D texture and the march
// becomes thirty texture fetches — which mobile GPUs are extremely good at.
//
// Four channels, four jobs:
//   R — the base density octave (where gas is at all)
//   G — a finer detail octave (filaments and knots inside it)
//   B — the dust channel, decorrelated from the gas so lanes cut ACROSS it
//       rather than tracing it
//   A — a slow variation used to tint and to breathe

// A cheap integer hash — deterministic, well-distributed, and fast enough that
// a quarter of a million voxels is a startup cost, not a stall.
function hash3(x, y, z, seed) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 974711) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// Tiling value noise: the lattice wraps at `period`, so the texture can repeat
// in every direction without a visible seam and the volume can be sampled well
// outside [0,1] without running out of gas.
function vnoise(x, y, z, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  const wrap = (n) => ((n % period) + period) % period
  const x0 = wrap(xi), x1 = wrap(xi + 1)
  const y0 = wrap(yi), y1 = wrap(yi + 1)
  const z0 = wrap(zi), z1 = wrap(zi + 1)
  const c000 = hash3(x0, y0, z0, seed), c100 = hash3(x1, y0, z0, seed)
  const c010 = hash3(x0, y1, z0, seed), c110 = hash3(x1, y1, z0, seed)
  const c001 = hash3(x0, y0, z1, seed), c101 = hash3(x1, y0, z1, seed)
  const c011 = hash3(x0, y1, z1, seed), c111 = hash3(x1, y1, z1, seed)
  const a = c000 + (c100 - c000) * u
  const b = c010 + (c110 - c010) * u
  const c = c001 + (c101 - c001) * u
  const d = c011 + (c111 - c011) * u
  const e = a + (b - a) * v
  const f = c + (d - c) * v
  return e + (f - e) * w
}

function fbm(x, y, z, octaves, baseFreq, period, seed) {
  let sum = 0
  let amp = 0.5
  let f = baseFreq
  let p = period
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(x * f, y * f, z * f, p, seed + o * 7919) * amp
    f *= 2
    p *= 2
    amp *= 0.5
  }
  return sum
}

// Build the volume. `size` is deliberately small: the gas is low-frequency by
// nature and the march samples it with trilinear filtering at continuously
// varying scales, so 64³ carries far more apparent detail than it has voxels.
// A weak device drops to 48³ and no one can tell.
export function makeNoiseVolume(gl, { size = 64, seed = 1337 } = {}) {
  const N = size
  const data = new Uint8Array(N * N * N * 4)
  const inv = 1 / N
  let at = 0
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const fx = x * inv, fy = y * inv, fz = z * inv
        // base: broad shoals of gas
        const base = fbm(fx, fy, fz, 3, 4, 4, seed)
        // detail: the filaments and knots that make it read as matter
        const det = fbm(fx, fy, fz, 3, 11, 11, seed + 4001)
        // dust: an independent field, so the dark lanes cross the bright gas
        // instead of merely outlining it — which is what a real dust lane does
        const dust = fbm(fx, fy, fz, 3, 6, 6, seed + 9127)
        // slow: the low-frequency variation that tints and breathes
        const slow = fbm(fx, fy, fz, 2, 2, 2, seed + 20011)
        data[at++] = (Math.max(0, Math.min(1, base)) * 255) | 0
        data[at++] = (Math.max(0, Math.min(1, det)) * 255) | 0
        data[at++] = (Math.max(0, Math.min(1, dust)) * 255) | 0
        data[at++] = (Math.max(0, Math.min(1, slow)) * 255) | 0
      }
    }
  }
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_3D, tex)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT)
  gl.bindTexture(gl.TEXTURE_3D, null)
  return tex
}

// A 64×64 blue-noise-ish tile for dithering the final frame and jittering the
// raymarch's first step. Jittering is what lets 20 steps look like 200: the
// banding a low step count produces is turned into fine grain, which the eye
// forgives completely and the bloom pass largely erases.
export function makeBlueNoise(gl, size = 64) {
  const N = size
  const data = new Uint8Array(N * N * 4)
  // A proper void-and-cluster tile is overkill here; an interleaved-gradient
  // sequence decorrelated by a hash gives grain with no visible structure at
  // the amplitudes we dither at.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4
      const ig = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1
      data[i] = (ig * 255) | 0
      data[i + 1] = (hash3(x, y, 0, 77) * 255) | 0
      data[i + 2] = (hash3(x, y, 1, 91) * 255) | 0
      data[i + 3] = 255
    }
  }
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return tex
}

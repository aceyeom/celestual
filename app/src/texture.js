// texture.js — the materials, drawn rather than downloaded.
//
// Everything in this brand is a surface: pebbled leather, laid paper, chalk
// card, and the fine tooth over the void. None of it is a stock image and none
// of it is a CSS gradient pretending. Each tile is genuinely rendered, pixel by
// pixel, from wrapped value noise, so it is seamless at any size, weighs
// nothing over the wire, and is REAL at 1:1 — you can put your face against the
// screen and the grain is still there, which is the difference between a
// material and a filter.
//
// Every tile is an OVERLAY: dark where the surface dips, warm-light where it
// catches, transparent in between. So one leather tile sits correctly on every
// brown in tokens.js without a second render, and the same paper tile works on
// ivory and on chalk.
//
// Tiles are generated once, on first ask, and memoized as data URLs.

const CACHE = new Map()

// ── noise ────────────────────────────────────────────────────────────────────
// A hash and a wrapped value noise. Wrapping is the whole trick: every octave's
// lattice period divides the tile, so the tile repeats without a seam, which is
// what lets a 256px square carry a whole leather case.
function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const wrap = (n, p) => ((n % p) + p) % p
const smooth = (t) => t * t * (3 - 2 * t)

// `px`/`py` are the lattice periods the field wraps on, per axis. Passing them
// separately is what makes a directional grain possible without breaking the
// tile (see fbmA).
function vnoise(x, y, px, seed, py = px) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const x0 = wrap(xi, px)
  const x1 = wrap(xi + 1, px)
  const y0 = wrap(yi, py)
  const y1 = wrap(yi + 1, py)
  const a = hash2(x0, y0, seed)
  const b = hash2(x1, y0, seed)
  const c = hash2(x0, y1, seed)
  const d = hash2(x1, y1, seed)
  const top = a + (b - a) * u
  const bot = c + (d - c) * u
  return top + (bot - top) * v
}

// Fractal sum. `p` is the lattice period of the first octave IN TILE UNITS, so
// every octave stays commensurate with the tile and the seam never appears.
function fbm(nx, ny, p, octaves, seed) {
  let sum = 0
  let amp = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const pi = p * (1 << i)
    sum += vnoise(nx * pi, ny * pi, pi, seed + i * 101) * amp
    norm += amp
    amp *= 0.5
  }
  return sum / norm
}

// The same, with a different lattice period per axis, which is how you get a
// DIRECTIONAL grain: a low period across and a high one down gives long
// horizontal strands. It has to be done here, with two integer periods, and not
// by multiplying the input coordinates: scaling nx by 0.34 walks the lattice
// off the tile boundary and the tile stops wrapping, which shows up on screen
// as a hard band every 190 pixels. That is exactly what the first cut of this
// file did, and it is why the paper looked striped.
function fbmA(nx, ny, px, py, octaves, seed) {
  let sum = 0
  let amp = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const a = px * (1 << i)
    const b = py * (1 << i)
    sum += vnoise(nx * a, ny * b, a, seed + i * 101, b) * amp
    norm += amp
    amp *= 0.5
  }
  return sum / norm
}

// Ridged noise — the pebble. Folding the signal at its midpoint turns smooth
// blobs into cells with creases between them, which is exactly what a grained
// hide is: a field of cells with a valley at every boundary.
const ridge = (n) => 1 - Math.abs(n * 2 - 1)

// ── the painter ──────────────────────────────────────────────────────────────
// Runs `f(nx, ny)` over a square and writes an overlay: negative returns dip
// (a dark crease), positive returns catch the light (a warm highlight).
function paint(key, size, f, { dark = [0, 0, 0], light = [255, 232, 200] } = {}) {
  if (CACHE.has(key)) return CACHE.get(key)
  if (typeof document === 'undefined') return ''
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = f(x / size, y / size, x, y)
      const i = (y * size + x) * 4
      const c = v < 0 ? dark : light
      d[i] = c[0]
      d[i + 1] = c[1]
      d[i + 2] = c[2]
      d[i + 3] = Math.max(0, Math.min(255, Math.round(Math.abs(v) * 255)))
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = `url("${cv.toDataURL('image/png')}")`
  CACHE.set(key, url)
  return url
}

// ── leather ──────────────────────────────────────────────────────────────────
// A grained hide, at the scale of a book cover. Three things stacked, in the
// order a tanner would name them:
//
//   the GRAIN   pebbles at two scales, the small ones sitting inside the large,
//               each with a dark crease at its boundary
//   the BREAK   long, very low-frequency swells — where the hide has been
//               folded over a board and has taken a set
//   the PORE    a fine per-pixel tooth so the surface never goes plastic
//
// Deliberately restrained: real chrome-tanned leather at arm's length is much
// subtler than the tiled "leather background" of every skeuomorphic app ever
// shipped, and the moment the grain shouts, it stops reading as a material and
// starts reading as a texture pack.
export const leather = (size = 320, seed = 7) =>
  paint(`leather:${size}:${seed}`, size, (nx, ny, px, py) => {
    const big = ridge(fbm(nx, ny, 16, 3, seed))
    const small = ridge(fbm(nx, ny, 38, 2, seed + 31))
    const cell = big * 0.5 + small * 0.5
    // The crease is the dark part; the top of the pebble catches. The
    // threshold sits high on purpose: below it the pixel dips, above it it
    // lifts, so most of the hide is in shadow and only the crowns of the
    // pebbles come up. Centred instead, half the surface lifts and the grain
    // reads as speckled granite rather than as skin.
    let v = (cell - 0.66) * 0.26
    // the break: broad, soft, almost subliminal. It was three times this and
    // the hide read as camouflage: at that amplitude the low frequency stops
    // being a fold in a skin and starts being a cloud painted on one.
    v += (fbm(nx, ny, 4, 2, seed + 77) - 0.5) * 0.07
    // pore
    v += (hash2(px, py, seed + 9) - 0.5) * 0.075
    return Math.max(-0.42, Math.min(0.26, v))
  })

// ── laid paper ───────────────────────────────────────────────────────────────
// Ivory stock, made the old way. What makes paper read as paper is not noise:
// it is FIBRE (short directional strands, because the pulp settles with a
// grain) plus MOTTLE (the cloud where the sheet is thicker) plus the LAID LINES
// pressed in by the wires of the mould. The last one is the detail nobody puts
// in, and it is the one that makes the surface look made rather than generated.
export const paper = (size = 384, seed = 3) =>
  paint(
    `paper:${size}:${seed}`,
    size,
    (nx, ny, px, py) => {
      // fibre: a long period across, a short one down, so the strands lie in
      // the direction the pulp settled
      let v = (fbmA(nx, ny, 5, 44, 2, seed) - 0.5) * 0.07
      // mottle: the cloud in the sheet, kept fine and shallow so the sheet
      // reads as one sheet rather than as a repeating swatch
      v += (fbm(nx, ny, 9, 3, seed + 41) - 0.5) * 0.05
      // the laid lines: the mould's fine wires, sixteen to the tile
      v += Math.sin((px * Math.PI * 2 * 16) / size) * 0.012
      // and the chain lines, three to the tile, soft rather than a hard pixel
      const chain = Math.abs(((px / size) * 3) % 1 - 0.5)
      v -= Math.exp(-chain * chain * 900) * 0.022
      // tooth
      v += (hash2(px, py, seed + 5) - 0.5) * 0.05
      return Math.max(-0.3, Math.min(0.26, v))
    },
    { dark: [96, 70, 44], light: [255, 252, 244] },
  )

// ── chalk card ───────────────────────────────────────────────────────────────
// A gessoed card: drier, cooler, more matte than paper, and coarser. No fibre
// and no laid lines, because it was cast rather than couched. It is the second
// ground purely so the product can say the same sentence in a different mood
// without ever reaching for a second colour.
export const chalk = (size = 320, seed = 19) =>
  paint(
    `chalk:${size}:${seed}`,
    size,
    (nx, ny, px, py) => {
      let v = (fbm(nx, ny, 10, 4, seed) - 0.5) * 0.16
      v += (ridge(fbm(nx, ny, 40, 2, seed + 13)) - 0.55) * 0.09
      // the dust: coarse, clustered, unlike paper's even tooth
      const g = hash2(px, py, seed + 3)
      v += (g > 0.86 ? 0.2 : g < 0.1 ? -0.16 : 0) * 0.6
      v += (g - 0.5) * 0.07
      return Math.max(-0.32, Math.min(0.34, v))
    },
    { dark: [46, 44, 36], light: [255, 254, 248] },
  )

// ── the tooth over the void ──────────────────────────────────────────────────
// The sky is not a black rectangle: it is the inside of a closed case, and it
// has a surface. Very fine, very quiet, and it exists so the field never bands
// on a dark gradient.
export const tooth = (size = 128, seed = 61) =>
  paint(
    `tooth:${size}:${seed}`,
    size,
    (nx, ny, px, py) => {
      let v = (fbm(nx, ny, 6, 3, seed) - 0.5) * 0.06
      v += (hash2(px, py, seed + 2) - 0.5) * 0.045
      return v
    },
    { dark: [0, 0, 0], light: [255, 226, 186] },
  )

// ── the stitch ───────────────────────────────────────────────────────────────
// A real saddle stitch: slanted, alternating, with the thread's own shadow
// under it. Drawn as an SVG tile and repeated along an edge, so it stays 1:1
// sharp at any panel size and never stretches at a corner the way a
// border-image does.
//
// Returns a style object to spread onto the stitched element. Four background
// layers, one per edge, each repeating in one direction only.
// Pitch matters more than anything else here. The first cut ran a stitch every
// fifteen pixels at half opacity and it read as engine turning, not as thread:
// a real saddle stitch on a wallet is six to eight millimetres apart, which at
// screen scale is nearer twenty-two, and the thread is duller than the leather
// it is sunk into rather than brighter.
const PITCH = 22
const stitchTile = (horizontal, colour, shade) => {
  const w = horizontal ? PITCH : 10
  const h = horizontal ? 10 : PITCH
  const d = horizontal ? 'M3 7.2 L10.2 2.8' : 'M7.2 3 L2.8 10.2'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<g fill="none" stroke-linecap="round">` +
    `<path d="${d}" stroke="${shade}" stroke-width="2.2" transform="translate(0,0.9)"/>` +
    `<path d="${d}" stroke="${colour}" stroke-width="1.3"/>` +
    `</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function stitching({ colour = 'rgba(226,206,172,0.24)', shade = 'rgba(0,0,0,0.34)', inset = 8 } = {}) {
  const H = stitchTile(true, colour, shade)
  const V = stitchTile(false, colour, shade)
  return {
    backgroundImage: `${H}, ${H}, ${V}, ${V}`,
    backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
    backgroundPosition: `${inset}px ${inset}px, ${inset}px calc(100% - ${inset}px), ${inset}px ${inset}px, calc(100% - ${inset}px) ${inset}px`,
    backgroundSize: `${PITCH}px 10px, ${PITCH}px 10px, 10px ${PITCH}px, 10px ${PITCH}px`,
  }
}

// ── surfaces ─────────────────────────────────────────────────────────────────
// The ready-made backgrounds. Each is the tile plus the lighting that belongs
// with that material: leather is lit from above-left the way a book on a desk
// is; paper is lit flat, because paper is flat.

export const leatherSurface = (base, { scale = 260, light = 0.5 } = {}) => ({
  backgroundColor: base,
  backgroundImage: `radial-gradient(120% 90% at 24% 0%, rgba(255,226,186,${0.06 * light}) 0%, transparent 62%), ${leather()}`,
  backgroundSize: `auto, ${scale}px ${scale}px`,
})

export const paperSurface = (base, { scale = 300 } = {}) => ({
  backgroundColor: base,
  backgroundImage: `radial-gradient(150% 120% at 50% -10%, rgba(255,255,255,0.26) 0%, transparent 62%), ${paper()}`,
  backgroundSize: `auto, ${scale}px ${scale}px`,
})

export const chalkSurface = (base, { scale = 250 } = {}) => ({
  backgroundColor: base,
  backgroundImage: `radial-gradient(150% 120% at 50% -10%, rgba(255,255,255,0.13) 0%, transparent 66%), ${chalk()}`,
  backgroundSize: `auto, ${scale}px ${scale}px`,
})

// Pick the surface for a card ground id (theme.js GROUNDS).
export function groundSurface(g, opts) {
  if (g.texture === 'paper') return paperSurface(g.base, opts)
  if (g.texture === 'chalk') return chalkSurface(g.base, opts)
  return leatherSurface(g.base, opts)
}

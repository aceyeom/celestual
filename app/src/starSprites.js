// starSprites.js — the one place a star's LIGHT is drawn.
//
// Both skies (galaxy.js, the ambient field, and communityGalaxy.js, the live
// community sky) draw every point of light from these pre-baked sprites, so a
// star looks like the same star everywhere. Three instruments:
//
//   makeGlow        — a soft round halo (bloom under a core, nebula knots)
//   makeStarSprite  — a POINT SOURCE: a tiny white-hot core dropping steeply
//                     through the star's own hue, with four hairline rays baked
//                     in at a whisper. Small draws read as crisp stars (never
//                     featureless dots); large draws read as a photographed
//                     star (never an inflated blob).
//   makeStarMips    — the same point source baked at a ladder of sizes, so
//                     every draw can sample near 2× its destination and even
//                     the tiniest field star stays needle sharp (starMipFor
//                     picks the right rung).
//   makeSpikeSprite — the full diffraction burst a BRIGHT star earns: four long
//                     tapered primary rays (white-hot at the crossing, the hue
//                     feathering to nothing at the tips), a faint diagonal
//                     secondary cross, and a small bloom where they meet — the
//                     signature of a real lens, not a plus sign.
//
// All sprites are cached by the callers; nothing here allocates per frame.

export function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function makeGlow(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  // a silk falloff — enough stops that the halo breathes out with no visible
  // shoulder; a two-stop gradient leaves a ring the eye reads as a sticker
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.9)`)
  grd.addColorStop(0.2, `rgba(${r},${g},${b},0.56)`)
  grd.addColorStop(0.42, `rgba(${r},${g},${b},0.24)`)
  grd.addColorStop(0.66, `rgba(${r},${g},${b},0.085)`)
  grd.addColorStop(0.85, `rgba(${r},${g},${b},0.024)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.fillRect(0, 0, size, size)
  return s
}

// One tapered ray: a slim lens from the center out to `len`, edges bowing
// inward so it thins to a true point, filled with a gradient that runs
// white-hot → hue → nothing along its length. Drawn in the current transform.
function ray(c, len, w, stops) {
  const grd = c.createLinearGradient(0, 0, len, 0)
  for (const [at, col] of stops) grd.addColorStop(at, col)
  c.fillStyle = grd
  c.beginPath()
  c.moveTo(0, -w)
  c.quadraticCurveTo(len * 0.22, -w * 0.3, len, 0)
  c.quadraticCurveTo(len * 0.22, w * 0.3, 0, w)
  c.closePath()
  c.fill()
}

export function makeStarSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  const wr = ((r + 255 * 2) / 3) | 0, wg = ((g + 255 * 2) / 3) | 0, wb = ((b + 255 * 2) / 3) | 0

  // four hairline rays, baked at a whisper — what keeps a small star a STAR
  c.save()
  c.translate(m, m)
  for (let k = 0; k < 4; k++) {
    ray(c, m * 0.96, size * 0.016, [
      [0, `rgba(255,255,255,0.72)`],
      [0.3, `rgba(${wr},${wg},${wb},0.24)`],
      [1, `rgba(${r},${g},${b},0)`],
    ])
    c.rotate(Math.PI / 2)
  }
  c.restore()

  // the point source: a hard white heart, then a LONG smooth exhale through
  // the hue — stop-laddered close enough to a true exponential falloff that
  // no shoulder or ring survives at any draw size. Energy still lives in the
  // middle fifth, so a star stays a needle of light, never a soft disc.
  const grd = c.createRadialGradient(m, m, 0, m, m, m)
  grd.addColorStop(0.0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.11, 'rgba(255,255,255,1)')
  grd.addColorStop(0.19, `rgba(${wr},${wg},${wb},0.96)`)
  grd.addColorStop(0.28, `rgba(${r},${g},${b},0.6)`)
  grd.addColorStop(0.38, `rgba(${r},${g},${b},0.3)`)
  grd.addColorStop(0.5, `rgba(${r},${g},${b},0.13)`)
  grd.addColorStop(0.64, `rgba(${r},${g},${b},0.05)`)
  grd.addColorStop(0.8, `rgba(${r},${g},${b},0.016)`)
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`)
  c.fillStyle = grd
  c.beginPath()
  c.arc(m, m, m, 0, Math.PI * 2)
  c.fill()
  return s
}

// The point-source MIP LADDER. One big bake minified 10–60× down to a 2px
// field star is exactly the mush that read as low-fidelity: bilinear
// sampling collapses past ~2× minification and the needle core averages away
// into a gray smudge. So the same star is baked at a ladder of sizes, and
// every draw pulls the bake nearest 2× its destination — each star on
// screen, from a 1.5px background point to a full close-up, samples inside
// bilinear's sweet spot and stays a crisp point of light. Five tiny canvases
// per hue, baked once; picking from the ladder is a four-compare loop.
const MIP_SIZES = [8, 16, 32, 64, 128]
export function makeStarMips(color) {
  return MIP_SIZES.map((sz) => makeStarSprite(color, sz))
}
export function starMipFor(mips, D) {
  const want = D * 2
  for (let i = 0; i < mips.length; i++) if (mips[i].width >= want) return mips[i]
  return mips[mips.length - 1]
}

export function makeSpikeSprite(color, size) {
  const s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')
  const [r, g, b] = hexToRgb(color)
  const m = size / 2
  c.save()
  c.translate(m, m)
  // the faint diagonal secondaries first, under the primaries
  c.rotate(Math.PI / 4)
  for (let k = 0; k < 4; k++) {
    ray(c, m * 0.5, size * 0.008, [
      [0, 'rgba(255,255,255,0.5)'],
      [0.4, `rgba(${r},${g},${b},0.16)`],
      [1, `rgba(${r},${g},${b},0)`],
    ])
    c.rotate(Math.PI / 2)
  }
  // the four long primaries — white at the crossing, the hue carrying the
  // middle, feathering to nothing; the vertical pair a touch shorter, the way
  // a real aperture renders
  c.rotate(-Math.PI / 4)
  for (let k = 0; k < 4; k++) {
    const len = m * (k % 2 === 0 ? 0.98 : 0.8)
    ray(c, len, size * 0.011, [
      [0, 'rgba(255,255,255,0.95)'],
      [0.14, 'rgba(255,255,255,0.6)'],
      [0.45, `rgba(${r},${g},${b},0.3)`],
      [1, `rgba(${r},${g},${b},0)`],
    ])
    c.rotate(Math.PI / 2)
  }
  c.restore()
  // a small bloom seats the crossing so the burst never reads as a plus sign
  const bloom = c.createRadialGradient(m, m, 0, m, m, size * 0.09)
  bloom.addColorStop(0, 'rgba(255,255,255,0.9)')
  bloom.addColorStop(0.5, `rgba(${r},${g},${b},0.25)`)
  bloom.addColorStop(1, `rgba(${r},${g},${b},0)`)
  c.fillStyle = bloom
  c.beginPath()
  c.arc(m, m, size * 0.09, 0, Math.PI * 2)
  c.fill()
  return s
}

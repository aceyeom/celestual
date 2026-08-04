// beta/sky.js — the Bindery's galaxy.
//
// The first cut of this route drew its own 2D star chart. It was a nice
// drawing and it was the wrong call: the product's sky is not a backdrop, it
// is the mechanism — a ping IS a star, you fly to it, and past a certain
// closeness it stops being a point of light and becomes the surface it was
// made of. A hand-rolled chart cannot do any of that, so a rebrand built on
// one is a rebrand of the pictures and not of the product.
//
// So the beta now runs the REAL engine. Same hundred and twenty thousand stars
// on real density-wave orbits, same camera, same nebula volume, same send-off
// flight the camera rides, same held dive, same body pass. Every mechanic and
// every animation is production's, because they are literally production's
// code (`galaxy.js`, `sky/`).
//
// What changes is the light, and it changes in ONE place.
//
// ── the ramp ─────────────────────────────────────────────────────────────────
// Every star's colour in this engine comes from a single 256-entry lookup
// indexed by temperature: the Planck locus, running deep amber at 2,500 K
// through white at 6,500 K to hard blue past 20,000 K. `sky/blackbody.js` now
// takes an optional replacement curve, so the whole universe can be recoloured
// by handing it a different one-dimensional ramp. There is no shader change and
// no second code path.
//
// The Bindery's curve keeps the physics' SHAPE and drops its hue: cool stars go
// deep chocolate, hot ones go ivory. That is not a cheat, it is the honest half
// of the truth — the cool end of the real locus genuinely is brown, and the hot
// end genuinely is white. What the beta gives up is the blue, which is exactly
// the thing the brand has no room for.
//
// The consequence is worth stating, because it is why this works at all: the
// bulge is old, so it is full of 3,000–5,000 K stars, and it comes out the
// colour of the leather. The arms are young and hot, so they come out ivory.
// The galaxy's structure still reads — an old brown heart, pale forming arms —
// off demographics rather than off decoration, in one hue.

import { GalaxyField } from '../galaxy.js'
import { linearOf } from '../sky/engine.js'
import { C, hexToRgb } from './tokens.js'

// The curve, as stops on u (the LUT's log-temperature coordinate: u=0 is
// 1,200 K, u=1 is 40,000 K). Luminance is normalized away downstream, so these
// are chromaticities — pick them for hue and let brightness stay physics.
const STOPS = [
  [0.0, '#3E2009'], // 1,200 K   the coolest dwarfs: burnt umber
  [0.22, '#7A461C'], // 2,600 K  deep chocolate
  [0.36, '#A66A34'], // 4,000 K  the old bulge: saddle
  [0.5, '#C79458'], // 6,900 K   sun-like: caramel
  [0.64, '#E3C79A'], // 11,000 K wheat
  [0.8, '#F3E6CC'], // 20,000 K  near ivory
  [1.0, '#FFFAF0'], // 40,000 K  the hottest: paper white
]

const RAMP_LUT = STOPS.map(([u, hex]) => [u, hexToRgb(hex).map((v) => v / 255)])

export function binderyRamp(u) {
  const x = u < 0 ? 0 : u > 1 ? 1 : u
  for (let i = 1; i < RAMP_LUT.length; i++) {
    const [u1, c1] = RAMP_LUT[i]
    if (x <= u1 || i === RAMP_LUT.length - 1) {
      const [u0, c0] = RAMP_LUT[i - 1]
      const t = u1 === u0 ? 0 : (x - u0) / (u1 - u0)
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t]
    }
  }
  return RAMP_LUT[RAMP_LUT.length - 1][1]
}

// The two lights the interface hands the engine. Production's are amber and
// rose, the two stars of the metaphor; here they are one hue at two values,
// because this brand has no second hue and says "you" and "them" with tone.
export const YOU = C.caramel
export const THEM = C.wheat

// What a canvas-2D fallback paints when there is no GPU: the same void and the
// same warm heart, so a machine without WebGL2 still gets this brand.
const GROUND = [C.void2, C.void, '#0E0906']
const CORE = ['255,238,214', '228,182,126', '150,96,52']

const OPTS = { ramp: binderyRamp, you: YOU, them: THEM, ground: GROUND, core: CORE }


// ── the tuning ───────────────────────────────────────────────────────────────
// Two overrides, and they are the two places the engine holds a colour that the
// LUT does not reach.
//
// THE NEBULA. Production's ramp is warm heart → H-alpha rose → violet rim, which
// is real physics and two hues this brand does not have. The Bindery's runs lit
// cocoa through saddle to chalk: the same structure, read as dust caught in
// lamplight going cold at the rim rather than as ionised gas.
//
// THE BLOOM. Nothing in this brand glows, and bloom is the engine's one
// glowing. It is not switched off, because a star with no bloom at all is a
// dot and the field stops having any depth — it is pulled back to where it
// reads as a lens flaring slightly rather than as light leaking out of objects.
function tuneGas(g) {
  g.warm = linearOf('#C28B52', 1.0) // the heart: lamplight in dust
  g.mid = linearOf('#8A5C33', 0.95) // the mid-disk: saddle
  g.cool = linearOf('#C9C2B4', 0.85) // the rim: chalk, going cold
}

function tunePost(p) {
  p.bloomAmount = 0.13
  p.threshold = 1.7
  p.knee = 0.6
  p.vignette = 0.52
  p.exposure = 0.97
  // No lateral chromatic spread. It is a lovely real lens artefact and it is
  // the one thing in the pipeline that can put a green and a magenta fringe on
  // a bright star, which in a brand with exactly one hue reads as a rendering
  // fault rather than as a lens.
  p.chroma = 0
  // The lifted black. Production's void is the void and is genuinely black;
  // this one is the inside of a closed leather case, and a case is not black.
  // Without it the whole rebrand comes out as a brown galaxy floating on a
  // black screen instead of a brown galaxy inside something.
  p.floor = hexToRgb(C.void).map((v) => v / 255)
}

// the meteors, in this brand's one hue. Production's set has a magnesium
// blue-white in it, which is a lovely real detail and the only blue that would
// ever appear in a sky that has no blue in it.
const SHOOT_HUES = ['#FFF6EC', '#F1E7D3', '#F1E7D3', '#E3C79A', '#D6B78A']

export class BinderyField extends GalaxyField {
  constructor(canvas, opts = {}) {
    super(canvas, { ...OPTS, shootHues: SHOOT_HUES, ...opts })
  }
  _tuneGas() {
    super._tuneGas()
    if (this.gasPass) tuneGas(this.gasPass)
  }
  _tunePost() {
    super._tunePost()
    if (this.post) tunePost(this.post)
  }
}

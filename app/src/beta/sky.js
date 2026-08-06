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
// The middle of this curve is where the galaxy's mass actually is — the bulge
// and the inner disk are made of 3,000–7,000 K stars — so the middle of the
// curve is what the eye reads as "the colour of the galaxy". It used to run
// through saddle and caramel, which are the leather's own browns, and against
// the old lifted ground that came out as a tan smudge: the heart was the same
// family of colour as the case it was printed on, only brighter.
//
// Now that the ground is near-black there is room to let the middle go GOLD
// rather than tan — more yellow, less red, and a good deal less blue, which is
// the difference between old brass and old chocolate. Nothing here leaves the
// one hue; it is the same ramp turned a few degrees toward the light, and the
// ends are untouched because the cool dwarfs genuinely are umber and the hot
// giants genuinely are white.
const STOPS = [
  [0.0, '#3E2009'], // 1,200 K   the coolest dwarfs: burnt umber
  [0.22, '#7E4715'], // 2,600 K  deep chocolate
  [0.36, '#B0762A'], // 4,000 K  the old bulge: struck bronze
  [0.5, '#D8A44E'], // 6,900 K   sun-like: gold
  [0.64, '#EBD298'], // 11,000 K wheat
  [0.8, '#F5E9CB'], // 20,000 K  near ivory
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
const GROUND = [C.void2, C.void, '#060403']
const CORE = ['255,240,214', '232,186,110', '150,96,44']

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
  g.warm = linearOf('#CE9645', 1.0) // the heart: lamplight in dust
  g.mid = linearOf('#8F5F2C', 0.95) // the mid-disk: saddle
  g.cool = linearOf('#C9C2B4', 0.85) // the rim: chalk, going cold
}

function tunePost(p) {
  // All four of these move together with the ground, and they move because the
  // ground moved. On the old lifted floor the frame had perhaps two thirds of a
  // value scale to work in, so the exposure was held under 1 and the vignette
  // was pushed hard to keep the corners from washing out. With the case dropped
  // to near-black there is a full scale underneath every star: the exposure can
  // sit above 1 without the faint field turning to fog, the bloom can come up
  // enough to give the heart a real core, and the vignette can come back off —
  // it was doing the darkening the ground now does for itself, and a heavy
  // vignette over a dark ground is just a dirty lens.
  p.bloomAmount = 0.17
  p.threshold = 1.55
  p.knee = 0.6
  p.vignette = 0.4
  p.exposure = 1.08
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

// ── the framing, on a phone ──────────────────────────────────────────────────
// The engine solves its framing off the SHORT side of the window and its star
// size off a reference phone, which between them are why the same galaxy is two
// different pictures on the two devices:
//
//   on a laptop the short side is 900px, so the disk is drawn across ~500px of
//   radius and every star is scaled DOWN to about 0.45 of its reference size.
//   Fine grain, wide galaxy.
//
//   on a phone the short side is 390px, so the disk gets ~225px of radius and
//   the stars stay at 1.0. Half the picture, twice the grain — a tight bright
//   knot of comparatively enormous points, rotating fastest exactly where it is
//   densest. That is the "concentrated in the middle, and each piece is big"
//   read, and on a display that renders the sky below its native resolution and
//   scales it up, a knot of big points sliding a pixel or two a frame is also
//   what shimmers.
//
// So a narrow window gets its own framing: the galaxy is drawn half again as
// wide, the stars are cut back, and the ambient orbit clock is slowed. The
// engine is untouched — these are the two numbers it already solves against,
// set per-window — and production, which shares that engine, sees none of it.
const NARROW = 620
// how much wider the disk is drawn (frameFit is a fraction of the short side)
const NARROW_FIT = 0.74
// and how much smaller each star is drawn against it. The engine spends the
// difference on POPULATION — `_build` scales its count by 1/sizeScale — so the
// field does not just get finer, it gets denser, which is the other half of why
// a phone's sky read as a scatter of specks rather than as a galaxy.
const NARROW_GRAIN = 0.74
// …and on a wide window, where the framing was never wrong, only small. A
// galaxy drawn across half the short side sits in the middle of the window as
// an OBJECT with case all round it; drawn wider it becomes the field the page
// is printed on, which is the thing the whole route claims. `frameFit` cancels
// out of the engine's reference framing, so this costs nothing in grain.
const WIDE_FIT = 0.6
// the ambient rotation, slowed from the engine's 20. Per-star motion blur is
// drawn from frame-to-frame screen delta, and the core's angular velocity is
// the highest in the picture; at a phone's render scale that is a knot of short
// smears changing direction every frame. A dive is unaffected — its smear comes
// from camera travel, and the orbit clock is nearly stopped through one anyway.
const NARROW_MOTION = 13
// ── and the part of it that is only ever wrong on a phone ────────────────────
// The camera takes a whisper of parallax off the pointer on a desktop and off
// DEVICE ORIENTATION on a phone. On a desktop the pointer is still when you are
// reading. A phone in a hand never is: it is a gyroscope taped to a wrist, and
// the tilt handler's dead-zone opens at about two degrees of roll, which is
// less than the tremor of holding something up to read it.
//
// So on a phone the camera is always very slightly turning, and per-star motion
// blur is honest about camera ROTATION — it smears the entire field along the
// swing. A whole sky of short dashes changing direction several times a second
// does not read as parallax. It reads as the page glitching, which is exactly
// what it was called, and it is the one artefact that could not appear on a
// desktop at all.
//
// Two numbers, both of them the engine's own: how far a tilt is allowed to
// swing the camera, and how much of the resulting velocity is actually drawn.
// A dive is untouched in feel — its smear comes from travel, which is orders of
// magnitude larger than this and still capped at a sixth of the viewport.
const NARROW_PARALLAX = 0.11
const NARROW_SMEAR = 0.5
// Where the galactic centre sits down the frame. The engine picks 0.6 for a
// page whose type is ranged left, and it picks it for exactly this reason: the
// heart is the one part of the picture nothing can be read over, so it is put
// where the words are not. The words are in the middle of the window now, so
// the heart goes further down — under the setting rather than behind it, in
// the quiet below the last line, with the arms carrying the frame the type
// actually sits in.
const CENTRE_Y = 0.84
const NARROW_CENTRE_Y = 0.78

export class BinderyField extends GalaxyField {
  constructor(canvas, opts = {}) {
    super(canvas, { ...OPTS, shootHues: SHOOT_HUES, ...opts })
  }

  // Called from inside SkyEngine's own constructor (via the first resize), so
  // it may not touch anything this class sets up later. `w`/`h` are written by
  // resize() immediately before this runs, which is all it needs.
  _layout() {
    const w = this.w || window.innerWidth || 390
    const h = this.h || window.innerHeight || 844
    const narrow = Math.min(w, h) < NARROW
    this.frameFit = narrow ? NARROW_FIT : WIDE_FIT
    this.motion = narrow ? NARROW_MOTION : 20
    // GalaxyField sets this in _build and then lays out; a resize comes back
    // through here, so this is the last word either way.
    this.centerY = narrow ? NARROW_CENTRE_Y : CENTRE_Y
    this.motionScale = narrow ? NARROW_SMEAR : 1
    if (this.cam) this.cam.parallaxGain = narrow ? NARROW_PARALLAX : 0.3
    super._layout()
    // AFTER the engine has solved it: `frameFit` cancels out of the engine's
    // reference framing, so a wider disk on its own leaves the grain exactly
    // where it was. This is the part that makes the star smaller.
    if (narrow) this.sizeScale *= NARROW_GRAIN
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

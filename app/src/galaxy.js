// galaxy.js — the ambient sky. The cosmos the whole product lives inside.
//
// Rewritten on the shared WebGL2 engine in sky/. What used to be seventeen
// hundred lines of hand-rolled canvas compositing is now a POPULATION: this
// file says what lives in the ambient sky and what its events look like, and
// sky/engine.js draws it. Every line of camera, projection, nebula, governor
// and dive grammar that used to be duplicated between this file and
// communityGalaxy.js has moved there, once.
//
// What changed, visibly:
//
//   · a hundred and twenty thousand stars instead of eighteen hundred, orbiting
//     on real density-wave ellipses, and costing the main thread nothing
//   · every star's colour is its blackbody temperature and every star's
//     brightness is its luminosity over the square of its distance, so the
//     field's palette is demographics rather than decoration: an old gold
//     bulge, blue star-forming arms, a scatter of red giants
//   · the nebula is a volume you can fly through, not billboards you had to
//     dissolve before the camera reached them
//   · a dive goes ALL THE WAY IN. Past a certain closeness a star's true
//     angular diameter overtakes the instrument's point-spread and it stops
//     being a point of light — and past a certain SIZE it stops being light at
//     all and becomes a surface, drawn opaque by sky/body.js, occluding the
//     field behind it the way a body does.
//   · the send-off is a flight you take rather than a streak you watch: the
//     camera falls in behind the new star and rides it into the disk.
//   · the match is not an event in here at all any more. The sky's whole part
//     in a reveal is to hold the dive into the viewer's own ping, and be dark.
//
// What deliberately did not change: the lens (CAM/FOCAL/TILT), the two stars,
// the cosmic-violet void, and every method signature App.jsx and ui.jsx call.

import { SkyEngine, clamp, lerp, linearOf, starRadius } from './sky/engine.js'
import { smooth, easeOut, easeFlight } from './sky/camera.js'
import {
  genBulge, genDisk, genHalo, genDeepField, genNearField,
  writeStar, omegaAt, TILT_RATE, eccentricityAt,
} from './sky/model.js'
import { tempToU, blackbodyRGB } from './sky/blackbody.js'
import { CAM as LENS_CAM, FOCAL as LENS_FOCAL } from './sky/camera.js'
import { Gestures } from './sky/gestures.js'
import { starTint } from './theme.js'
import { Galaxy2D } from './sky/fallback2d.js'

const VANISH_DUR = 0.62 // the wink-out when a ping is withdrawn

// ── the send-off ─────────────────────────────────────────────────────────────
// This used to be a streak drawn on the glass: a bright head and sixteen tail
// puffs, sliding across a still picture of a galaxy from the @ field to wherever
// the slot happened to project. It was a 2D animation playing in front of a 3D
// sky, and it read as one — a thick comet sticker crossing a photograph.
//
// Now the star is a real object at a real place in the world, and the camera
// GOES WITH IT. It launches from just off the lens, arcs up over the disk, and
// comes down into its slot out along an arm; the camera falls in behind its
// shoulder, turns to look down the flight line, and rides the whole way. The
// field does not slide past — it opens out around the frame, because the eye is
// genuinely travelling through it. The gas closes over you and thins again. The
// near field tears past and dissolves at the glass.
//
// The beats, and what each one is for:
//
//   COAL   the @ collapses to a point on the glass, under the DOM morph, so
//          the hand-off from the form to the sky has nothing visible in it
//   RUN    the flight
//   LAND   the star decelerates into its slot and ignites; the camera settles
//   SETTLE the camera lets go and glides back out to the resting sky, which is
//          the shot that says what the whole thing was for: your ping, out
//          there, one light among a hundred thousand
//
// and only THEN the words. The old timeline guessed at this with a 3.6s
// setTimeout in App.jsx and a 2.1s CSS animation-delay; the flight now reports
// its own arrival, so the text cannot land early on a camera still moving.
const COAL_DUR = 0.55
const RUN_DUR = 2.05
const LAND_DUR = 0.62
// The pull-out is the longest beat, and it is long on purpose. It is not just a
// retreat: the camera also has to give back the orientation it borrowed, from
// looking down the flight line to the galaxy's own resting horizon, and that
// can be most of a right angle. Taken quickly it whips the entire field across
// the frame — and because the star pass renders true per-star velocity, every
// star in the sky smears to its length cap at once and the last thing you see
// is a swirl of dashes. Given room, the same move is the shot the whole flight
// was for: the camera easing back until your star is one light among all of
// them, exactly where you put it.
const SETTLE_DUR = 1.75
// What the flight costs, in seconds. Exported because App.jsx needs a deadline
// to fall back on: the sky reports its own arrival now, but a backgrounded tab
// stops rendering and a context loss stops it for good, and a send-off that
// never reports is a user stranded on an animation that has stopped.
export const SENDOFF_SECONDS = COAL_DUR + RUN_DUR + LAND_DUR + SETTLE_DUR

// How far behind its shoulder the camera rides, in world units. Far enough that
// the star stays a hard bright spark rather than opening into a disc (a launch
// is an ignition, not an inspection), close enough that it is unmistakably the
// subject of the shot.
const CHASE_STANDOFF = 0.46

// the resting hero star — one temperature and one luminosity, in one place, so
// the CPU can size its disc exactly the way the vertex shader does
const HERO_TEMP = 7400
const HERO_LUM = 4.2
const HERO_RGB = blackbodyRGB(HERO_TEMP)
// The photosphere's surface brightness, and it is a TONEMAPPING decision more
// than a physical one. ACES compresses hard above 1: at 2.0 the whole disc
// lands between 0.90 and 0.94 on screen, so a granulation pattern with a real
// 30% swing in it arrives as a 4% swing — which is precisely how a surface with
// convection cells, spots and faculae on it came out looking like a blank white
// ball. Sitting the disc's centre near 1.2 puts the variation in the part of
// the curve that can still show it, and the star reads brighter for it, because
// what makes something look bright is contrast against what is around it.
const SURFACE_B = 1.34

// ── the match ────────────────────────────────────────────────────────────────
// The sky's half of the reveal, and it is now almost nothing. That is the point.
//
// It has been two other things. First it drew the whole reveal — two hero stars
// falling into a decaying orbit out in the disk, a tidal bridge, a merger flash,
// a settled binary — with the cards arriving over the top afterwards. Then the
// pair moved into card/Spread.jsx as the actual cards, and what stayed here was
// a flight to an empty patch of disk plus an expanding light echo sweeping the
// nebula.
//
// The echo was the last piece of scenery, and scenery is exactly what a reveal
// cannot afford. It lit a band of gas across the frame on the one screen whose
// entire job is to hold two people's words still enough to read, and it was
// doing it a long way from anything either of them had placed. So it is gone,
// and so is the flight to nowhere: the reveal now begins where the person's own
// ping already lives, on the ordinary held dive that every other zoom in the
// product uses (card/Resolve.jsx). The overlay calls `focusStar` itself.
//
// What is left for the sky is the one thing it is genuinely better at than any
// overlay: being dark, and holding still. There is no event in here at all now —
// no echo, no flight to nowhere, and no flash, because there is no longer an
// impact to flash at. The reveal's light is a corona rising around the limb of
// one card, and light around a card belongs in the layer the card is drawn in.
// A sky that lit up as well would be a sky insisting on being part of it.
//
// So the interface is one setter, `matchCover`, and it exists for a compositing
// reason rather than a dramatic one: the card is opaque, it sits exactly over
// the star it grew out of, and it turns over — so the sky has to know when to
// stop drawing the thing underneath.

export class GalaxyField extends SkyEngine {
  constructor(canvas, opts = {}) {
    super(canvas, opts)
    // No WebGL2 at all (a very old in-app browser, a context the browser
    // refused, a driver blocklist): hand back a small canvas-2D field instead,
    // so the product still has a sky. Returning an object from a constructor
    // substitutes it for `this`, so every caller keeps its `new GalaxyField(...)`
    // and never has to know which one it got. Deliberately modest: the point is
    // that nothing is ever broken, not that the fallback competes.
    if (!this.ok) return new Galaxy2D(canvas, opts)

    this.mode = 'idle'
    this.modeT = 0
    this.origin = null // where the @ became a star (normalized screen coords)
    this.flight = null // the send-off's path, while one is being flown
    this.onSendoffDone = null // fired once, when the camera has actually landed

    // ── the viewer's own stars ──
    // One per placed ping, resting in the disk. Slots carry a monotonic seed
    // that is never reused, so removing one from the middle leaves the others
    // exactly where they were and a later add can never land on a freed slot.
    this.sealed = []
    this.sealLabels = []
    this.sealKinds = []
    this.sealedScreen = []
    this._slotSeed = 0
    this.sealHue = null
    this.vanish = null

    // ── focus ──
    this.focusIndex = -1
    this.focusHold = false
    this.navEnabled = false
    this.holdDur = 1.9

    // ambient shooting stars — an occasional grace note in the deep sky, never
    // weather
    this.shoots = []
    this._shootAt = 3 + Math.random() * 4

    this.match = null

    this._build()
    this._bindHand()
    this.start()
  }

  // ── the population ────────────────────────────────────────────────────────
  _build() {
    const b = this.budget
    const gl = this.gl
    void gl
    const mobile = window.innerWidth < 540
    const n = Math.floor(b.stars * (mobile ? 0.62 : 1))

    // Proportions matter more than counts. A galaxy that is mostly disk with a
    // dense heart and a sparse halo reads instantly; get the ratio wrong and no
    // amount of stars will save it.
    // The core is the one place a galaxy can go wrong by being GENEROUS. Packed
    // as tightly as it was, the bulge stopped resolving into stars at all and
    // read as one bright smudge with a clump of discs sitting on it. Fewer
    // stars, spread through a wider bulge, at a lower gain: the heart is still
    // unmistakably the heart, and you can see that it is made of suns.
    this.gBulge = this.starPass.createGroup(genBulge(Math.floor(n * 0.12), { seed: 9011, radius: 0.35 }), {
      gain: 0.022, radiusScale: 0.00034, resolve: 0.3,
    })
    this.gDisk = this.starPass.createGroup(genDisk(Math.floor(n * 0.63), { seed: 9013, rDisk: 1.2, armFrac: 0.55 }), {
      gain: 0.070, radiusScale: 0.00055,
    })
    this.gHalo = this.starPass.createGroup(genHalo(Math.floor(n * 0.13), { seed: 9017, rMax: 2.8 }), {
      gain: 0.050, radiusScale: 0.0003, resolve: 0, pattern: 0,
    })
    // The deep field: the rest of the universe, well outside this galaxy. It
    // barely creeps while the disk streams past during a dive, and that
    // contrast is the entire reason camera travel reads as travel.
    // Deliberately SPARSE. This layer is scenery behind every screen in the
    // product, and at full density it stopped being depth and became a texture
    // of dots reading over the type — the galaxy is the subject, not the
    // backdrop it hangs in.
    this.gDeep = this.starPass.createGroup(genDeepField(Math.floor(b.deep * 0.5), { seed: 9019, rMin: 3.4, rMax: 30 }), {
      gain: 0.24, radiusScale: 0.00012, twinkle: 0.8, motion: 0.55, resolve: 0, pattern: 0,
    })
    // The near field, drawn IN FRONT of the gas: loose stars between the camera
    // and the disk, whose fast sweep past the glass is what makes a dive feel
    // like flying rather than zooming.
    this.gNear = this.starPass.createGroup(genNearField(b.passers, { seed: 9023, extent: 2.5 }), {
      gain: 0.04, radiusScale: 0.00002, resolve: 0, nearFade: 0.55, pattern: 0,
    })
    this.gNear.inFront = true

    // the viewer's own stars, plus room for the match's two
    this.gHero = this.starPass.createHeroGroup(48)
    this.gHero.inFront = true
    this.gHero.radiusScale = 0.0062 // yours resolve into a body well before the field does
    // A held star is the calmest frame in the product: you are looking AT
    // someone. Scintillation on a photosphere you are close enough to read the
    // surface of is not physics, it is fidget.
    this.gHero.twinkle = 0.1

    this.frameRadius = 1.45
    this._layout()
    this._tuneGas()
    this._tunePost()
  }

  // The governor moved the budget: throw the whole field away and regenerate it
  // at the new density. Every generator is seeded, so the galaxy that comes back
  // is the same galaxy, and the hero group carries no state worth preserving —
  // it is refilled from `sealed` every single frame.
  _rebuild() {
    this.starPass.clear()
    this._build()
  }

  _tuneGas() {
    const g = this.gasPass
    g.diskR = 1.3
    g.diskH = 0.08
    g.arms = 2
    g.gain = 0.3
    g.dust = 1.0
    g.fill = 99
    g.forming = 0
    // The ramp is physics that happens to be the brand: warm scattered
    // starlight in the heart, H-alpha rose through the mid-disk (656 nm is why
    // every emission nebula you have seen a photograph of is pink), and the
    // cool violet-blue of reflection and doubly-ionised oxygen at the rim.
    g.warm = linearOf('#FFB37A', 1.0)
    g.mid = linearOf(this.them, 0.95)
    g.cool = linearOf('#6E7BD8', 0.9)
  }

  _tunePost() {
    const p = this.post
    p.bloomAmount = 0.2
    p.threshold = 1.5
    p.knee = 0.55
    p.vignette = 0.4
    p.exposure = 1
  }

  _paletteChanged() {
    this._tuneGas()
  }

  // ── the hand ──────────────────────────────────────────────────────────────
  // The ambient sky is a backdrop almost everywhere. It becomes steerable only
  // while a star view is held (setNavEnabled), which is when the viewer is
  // genuinely LOOKING at something rather than reading over it.
  _bindHand() {
    this.gest = new Gestures({
      getScale: () => this.cam.diveDist,
      onDrag: (dx, dy) => {
        this.cam.dragging = true
        this.cam.dragBy(dx * 0.0042, dy * 0.0032)
        this.start()
      },
      onRelease: () => this.cam.fling(),
      onPinch: (_, __, inv) => {
        this.cam.diveDist = clamp(inv, 0.35, 3.4)
        this.start()
      },
      onWheel: (dy) => {
        this.cam.diveDist = clamp(this.cam.diveDist * Math.exp(dy * 0.0014), 0.35, 3.4)
        this.start()
      },
    })
    this.gest.bind()
    this._pointerOwned = () => this.gest.owned
  }

  setNavEnabled(on) {
    this.navEnabled = !!on
    this.gest.enabled = !!on
    this.cam.orbitHome = !on
    if (!on) {
      this.gest.pts.clear()
      this.gest.mode = null
      this.cam.diveDist = 1
    }
    this.start()
  }

  // ── modes ─────────────────────────────────────────────────────────────────
  setMode(mode, data = {}) {
    const changed = mode !== this.mode
    this.mode = mode
    if (changed) this.modeT = 0
    if (mode === 'idle') this.dimTarget = data.dim != null ? data.dim : 1
    if (mode === 'sendoff') {
      // The field stays at FULL brightness through a flight. Dimming the sky
      // was right when the send-off was a streak with a form behind it; it is
      // wrong when the sky is the thing you are moving through. It comes back
      // down at the settle, where the words have to read over it.
      this.dimTarget = 1
      if (data.origin) this.origin = data.origin
      if (changed) this._startSendoff()
    } else if (changed && this.flight) {
      this._endSendoff(false)
    }
    if (mode === 'resting') this.dimTarget = 0.45
    if (mode === 'match') {
      this.dimTarget = 0.26
      if (changed) this._startMatch()
    } else if (changed && this.match) {
      this.match = null
      this.post.flash = 0
      if (this.cam.dive) this.cam.releaseDive(0)
    }
    this.start()
  }

  // ── the viewer's stars ────────────────────────────────────────────────────
  // Placement is a golden-angle fan over growing orbits: each new star seats
  // further out and a third of a turn around, so a busy sky spreads instead of
  // collapsing into one overlapping clump the way three fixed rings did.
  _placeSlot(seed) {
    // seated OUT along the disk, clear of the bulge: a star of yours resting
    // inside the core's blaze can never be picked out of it
    const a = clamp(0.58 + 0.088 * Math.sqrt(seed), 0.58, 1.5)
    const b = a * eccentricityAt(a, 0.18, 1.2)
    return {
      seed,
      a,
      b,
      phi0: seed * 2.39996323, // the golden angle
      omega: omegaAt(a),
      theta0: TILT_RATE * a,
      y: (seed % 2 ? 1 : -1) * (0.03 + (seed % 3) * 0.012),
      phase: seed * 1.7, // desynced breathing
    }
  }

  setSeals(n) {
    while (this.sealed.length < n) this.sealed.push(this._placeSlot(this._slotSeed++))
    if (this.sealed.length > n) this.sealed.length = Math.max(0, n)
    this.start()
  }
  setSealLabels(labels) {
    this.sealLabels = labels || []
    this.start()
  }
  setSealKinds(kinds) {
    this.sealKinds = kinds || []
    this.start()
  }
  setSealColor(hex) {
    this.sealHue = hex || null
    this.start()
  }
  removeSealAt(i) {
    if (i == null || i < 0 || i >= this.sealed.length) return
    this.sealed.splice(i, 1)
    this.sealedScreen.splice(i, 1)
    if (this.vanish) {
      if (this.vanish.i === i) this.vanish = null
      else if (this.vanish.i > i) this.vanish.i--
    }
    if (this.focusIndex === i) this.clearFocus()
    else if (this.focusIndex > i) this.focusIndex--
    this.start()
  }
  vanishStar(i) {
    if (i == null || i < 0) return
    this.vanish = { i, t: 0 }
    this.start()
  }

  // where a sealed star is in the world, right now
  _sealedWorld(s, out) {
    const phi = s.phi0 + s.omega * this.orbitT
    const th = s.theta0 + this.pattern
    const ex = s.a * Math.cos(phi)
    const ez = s.b * Math.sin(phi)
    const ct = Math.cos(th), st = Math.sin(th)
    out = out || {}
    out.x = ex * ct - ez * st
    out.z = ex * st + ez * ct
    out.y = s.y
    return out
  }

  // ── focus ─────────────────────────────────────────────────────────────────
  focusStar(i, opts = {}) {
    if (i == null || i < 0 || i >= this.sealed.length) return this.clearFocus()
    this.focusIndex = i
    this.focusHold = !!opts.hold
    const s = this.sealed[i]
    // `standoff` is how far short the dive stops, and almost every caller wants
    // the default: all the way in, until the star's own disc overtakes the
    // point-spread and it becomes a surface, because that surface is the card.
    // The reveal is the one caller that does not. There the card turns over, and
    // a disc seen edge-on stops covering what is behind it — which at full dive
    // is a two-hundred-pixel photosphere sitting in the hole, plus a scatter of
    // nearby field stars opened into soft out-of-focus plates. Correct optics,
    // and on that screen a row of grey lens-dust discs across the one frame that
    // has to be legible. Stopping short leaves the field a field and leaves your
    // star the point of light the card is made of.
    this.cam.startDive(() => this._sealedWorld(s), { hold: !!opts.hold, standoff: opts.standoff })
    // the overlay's name and intent line ride this, not a timer (engine.js)
    this._armArrival(opts.onArrive)
    this.start()
  }
  clearFocus() {
    this.focusHold = false
    this._armArrival(null)
    if (this.cam.dive) this.cam.releaseDive(0)
    else this.focusIndex = -1
    this.start()
  }

  // Which sealed star is under a screen point. Generous by design: a resting
  // star is a small thing and a thumb is not.
  hitTest(clientX, clientY, radius = 56) {
    const arr = this.sealedScreen || []
    let best = -1
    let bestD = radius * radius
    for (let i = 0; i < arr.length; i++) {
      const ps = arr[i]
      if (!ps || !ps.vis) continue
      const dx = ps.x - clientX
      const dy = ps.y - clientY
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  // ── the frame ─────────────────────────────────────────────────────────────
  _frame(dt) {
    this.modeT += dt
    if (this.vanish) {
      this.vanish.t += dt
      if (this.vanish.t >= VANISH_DUR) this.vanish = null
    }
    if (!this.cam.dive && this.focusIndex >= 0 && this.cam.focus <= 0.001) this.focusIndex = -1
    this._checkArrival()

    // the gas brightens a little as the camera closes on the disk, the way real
    // gas does when you are inside it rather than looking at it
    // A dive ends INSIDE the disk, where the ray marches through a great deal of
    // gas — so the cloud has to fall right back or the arrival is a wash of
    // nebula with a star somewhere in it. The star is the subject.
    this.gasPass.gain = 0.3 * (1 - this.cam.focus * 0.88) * (this.mode === 'match' ? 0.5 : 1)

    // ── one body on this screen ──
    // During a reveal nothing in the FIELD is allowed to become a surface. This
    // is the same inequality `discOf()` runs — a star's true angular diameter
    // against the instrument's point-spread — and it is scaled by `cam.unit`,
    // which is roughly twice as large on a laptop as on a phone. So a standoff
    // that leaves the disk a field of points at 390 pixels wide opens a dozen of
    // them into big soft plates at 1280, and the most important frame in the
    // product picks up what looks like dirt on the lens. Correct optics; wrong
    // screen. The one thing here that has a face is the card.
    const wide = this.mode === 'match' ? 0 : 1
    this.gDisk.resolve = wide
    this.gBulge.resolve = 0.3 * wide

    // The resting set runs in EVERY mode now, the match included, because the
    // match is a dive into one of these stars. It used to be skipped there —
    // correct while the reveal was staged at an empty spot in the disk with two
    // hero bodies invented for it, and wrong the moment the thing being flown to
    // became the viewer's own ping. Skipping it left `sealedScreen` stale, so the
    // card had no point of light to grow out of.
    this._frameSealed(dt)
    if (this.mode === 'sendoff') this._frameSendoff(dt)
    this._frameShoots(dt)
  }

  // ── the resting set ───────────────────────────────────────────────────────
  _frameSealed(dt) {
    void dt
    const hero = this.gHero
    hero.count = 0
    this.sealedScreen.length = this.sealed.length
    const flying = this.mode === 'sendoff' && this.modeT < COAL_DUR + RUN_DUR + LAND_DUR
    const n = this.sealed.length
    const you = linearOf(this.sealHue || this.you)
    const pr = {}
    // A chase drives `focus` too — it is the same solver — but it means
    // something completely different there. In a dive, focus is PROXIMITY: the
    // camera is closing on one star, everything else should melt back, and the
    // exposure has to stop down against a source getting four hundred times
    // brighter. In a chase it is only how far the camera has fallen in behind
    // a subject at a FIXED distance. Reading it as proximity during a send-off
    // dimmed the entire sky you had just been asked to fly through to a seventh
    // of its brightness, and stopped the exposure down on nothing.
    const proximity = this.cam.chasing ? 0 : this.cam.focus
    // A star that has just LANDED is still half a world unit from the lens,
    // which is close enough for its disc to overtake the point-spread — so the
    // instant the flight handed it back, the spark it had been for four seconds
    // would open into a seven-pixel grey saucer. It stays a point until the
    // camera has actually backed away from it, which is what the settle is.
    let settleRes = 1
    if (this.mode === 'sendoff' && this.flight && !this.flight.reduced) {
      const landEnd = COAL_DUR + RUN_DUR + LAND_DUR
      settleRes = clamp((this.modeT - landEnd) / (SETTLE_DUR * 0.7), 0, 1)
    }

    for (let i = 0; i < n; i++) {
      const s = this.sealed[i]
      // the newest star's position belongs to the send-off this frame
      if (flying && i === n - 1) continue
      const w = this._sealedWorld(s, pr)
      const scr = this.cam.project(w.x, w.y, w.z)
      this.sealedScreen[i] = scr ? { x: scr.sx, y: scr.sy, vis: true } : { x: 0, y: 0, vis: false }

      const isFocus = this.focusIndex === i && proximity > 0.001
      const f = isFocus ? proximity : 0
      // during a dive everything but the hero melts back into the depth
      const fade = proximity > 0.001 && !isFocus ? 1 - 0.86 * proximity : 1
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.9 + s.phase)
      const tint = starTint(this.sealKinds[i]) || this.sealHue || this.you
      const tcol = linearOf(tint)
      // Calibrated at BOTH ends: about 1.5x white at rest, so your star reads
      // as a little brighter than its neighbours and nothing more, and about
      // 4x at the end of a dive, so arriving on it is an event without the
      // frame washing out. The inverse-square law does the rest.
      // The exposure stops DOWN as the camera closes, the way a real one would
      // on a source getting four hundred times brighter. Without it the
      // inverse-square law wins and the arrival is a white screen.
      // A reveal's card has replaced this star outright by the time it is solid
      // (matchCover). Until then it is still the thing being flown to, so the
      // two cross over on the card's own curve rather than on a second one.
      const taken = isFocus && this.match ? this.match.cover : 0
      let gain = (0.36 + pulse * 0.06) * fade * (1 - f * 0.80) * (1 - taken)
      let alive = fade * (1 - taken)

      // the withdrawal: the halo blooms outward as the core contracts to a
      // point and winks out, and then React drops it
      if (this.vanish && this.vanish.i === i) {
        const vp = clamp(this.vanish.t / VANISH_DUR, 0, 1)
        const fadeV = 1 - vp
        gain *= fadeV * fadeV
        alive *= fadeV * fadeV
        this.fx.world(w.x, w.y, w.z, 0.1 + vp * 0.55, linearOf(tint), 2.2 * fadeV, 0)
        this.sealedScreen[i] = { x: scr ? scr.sx : 0, y: scr ? scr.sy : 0, vis: false }
      }

      // ── does this one have a face yet? ────────────────────────────────────
      // The same inequality the vertex shader tests, run here so the CPU knows
      // when to hand the star over to the opaque body pass. It has to be the
      // SAME arithmetic — the disc has to appear exactly where the point it
      // grew out of was — so the radius is Stefan-Boltzmann on the hero's own
      // temperature and luminosity, and the onset is the shader's own
      // smoothstep against the point-spread's width.
      const disc = scr ? this.discOf(this._heroRadius(), scr.persp) * settleRes : 0
      const own = scr ? 1 - this.handoverOf(this._heroRadius(), scr.persp) : 1
      // `taken` gates the body outright rather than just dimming it: the
      // photosphere pass is OPAQUE — it exists so a body occludes the field
      // behind it — so a black one is still a hole.
      if (disc > 0.004 && own < 0.996 && scr && taken < 0.5) {
        // Its brightness is NOT the point-source gain. That number is an
        // exposure trim for a thing being drawn as a point-spread, and using it
        // here is what left the photosphere sitting at a fifth of the halo that
        // was painted over it — a dim grey ball under its own glow. A surface
        // has a surface brightness, it is independent of distance, and it wants
        // to land in the tonemap's shoulder so the granulation survives.
        this.body.push(scr.sx, scr.sy, this._heroRadius() * this.cam.unit * scr.persp, HERO_RGB, SURFACE_B * hero.dim * this.cam.exposure * alive, {
          cover: disc * (1 - own),
          corona: 0.9,
          seed: s.seed * 3.7 + 1.3,
          // it turns, slowly, and that is most of what says it is a world
          spin: this.t * 0.035 + s.seed * 1.9,
          tip: 0.30 + (s.seed % 3) * 0.12,
        })
      }
      this._pushHero(hero, s, tint, gain, 0.2 + f * 0.18, f, own, settleRes)
      // The whole distinction between your star and the field is ONE small
      // tinted halo. It is deliberately quiet: your ping should be findable in
      // the sky, not shouting over it, and a beacon with a bloom and a glisten
      // stacked on top stops reading as a star at all. The category's light,
      // just wide enough to notice, is the entire signature. It grows with the
      // dive, which is when you have actually asked to look at it.
      // It is a FINDABILITY mark — it says which point of light in a field of
      // thousands is yours — and flying to the star is the one gesture that
      // answers that question outright. Growing it into the dive was backwards:
      // this is a sphere in world space, and closing from 2.7 units to the
      // standoff magnifies it about fiftyfold, so at the arrival it was a
      // two-thousand-pixel disc of flat category colour over the entire frame.
      // That wash — not the star — was what an arrival actually looked like. So
      // it shrinks as it is approached and is nearly gone by the time you are
      // there: at that range the photosphere is the subject.
      if (fade > 0.05) {
        const near = 1 - f * 0.94
        this.fx.world(w.x, w.y, w.z, (0.030 + pulse * 0.004) * near, tcol, (0.5 + pulse * 0.14) * fade * (1 - f * 0.9), 0)
      }
    }
  }

  // the true radius of one of the viewer's stars — see engine.js's starRadius
  _heroRadius() {
    return starRadius(this.gHero.radiusScale, HERO_TEMP, HERO_LUM)
  }

  // one of the viewer's stars, written into the hero instance buffer.
  // `owns` is whether this pass still draws the star's own photosphere: once
  // body.js has taken the disc over it must not, or the surface is lit twice.
  _pushHero(hero, s, tintHex, gain, spike, discBias, owns = 1, mayResolve = 1) {
    if (hero.count >= hero.capacity) return
    const i = hero.count++
    // A hero star is a real star: a hot white-gold photosphere that will resolve
    // into a body if you fly close enough, wearing its category light as a halo.
    writeStar(hero.star, i, s.a, s.b, s.phi0, s.omega, s.theta0, s.y, tempToU(HERO_TEMP), HERO_LUM)
    const t = linearOf(tintHex)
    const o = i * 4
    hero.tint[o] = t[0]
    hero.tint[o + 1] = t[1]
    hero.tint[o + 2] = t[2]
    hero.tint[o + 3] = gain
    hero.fx[o] = spike
    hero.fx[o + 1] = discBias
    hero.fx[o + 2] = mayResolve
    hero.fx[o + 3] = owns
  }

  // a free-floating hero star that is not on a slot (the match's two, and the
  // one being flown to its place during a send-off)
  _pushHeroAt(hero, x, y, z, tintHex, gain, spike, temp = 7000, lum = 5, opts = {}) {
    if (hero.count >= hero.capacity) return
    const i = hero.count++
    const r = Math.hypot(x, z) || 1e-5
    writeStar(hero.star, i, r, r, Math.atan2(z, x) - this.pattern, 0, 0, y, tempToU(temp), lum)
    const t = linearOf(tintHex)
    const o = i * 4
    hero.tint[o] = t[0]
    hero.tint[o + 1] = t[1]
    hero.tint[o + 2] = t[2]
    hero.tint[o + 3] = gain
    hero.fx[o] = spike
    hero.fx[o + 1] = opts.bias != null ? opts.bias : 0.4
    hero.fx[o + 2] = opts.resolve != null ? opts.resolve : 1
    hero.fx[o + 3] = 1
  }

  // ── the send-off ──────────────────────────────────────────────────────────
  // Set up the flight: where the star leaves from, where it is going, and the
  // curve between the two. Everything here is world space — that is the whole
  // difference from what this used to be.
  _startSendoff() {
    const n = this.sealed.length
    const s = this.sealed[n - 1]
    if (!s) return
    this.post.flash = 0
    // Reduced motion gets the arrival without the journey. The preference is
    // about vestibular safety, and a camera flying through a galaxy is exactly
    // the thing it is asking not to have; a still frame that resolves to the
    // same place, quickly, honours it without dropping the moment.
    if (this.reduced) {
      this.flight = { reduced: true, done: false }
      return
    }
    // Where it starts: just off the lens, under the point on the glass the @
    // collapsed at. Unprojecting a screen point at a chosen depth is the
    // camera's own maths run backwards — this is the one place in the product
    // that needs it, so it lives here rather than in the camera.
    const cam = this.cam
    const ox = (this.origin ? this.origin.x : 0.5) * this.w
    const oy = (this.origin ? this.origin.y : 0.43) * this.h
    const zc = 0.40
    const persp = LENS_FOCAL / zc
    const vx = (ox - cam.cx) / (cam.unit * persp)
    const vy = (oy - cam.cy) / (cam.unit * persp)
    const vz = zc - LENS_CAM
    const T = cam.Rt
    this.flight = {
      reduced: false,
      done: false,
      p0: {
        x: T[0] * vx + T[1] * vy + T[2] * vz,
        y: T[3] * vx + T[4] * vy + T[5] * vz,
        z: T[6] * vx + T[7] * vy + T[8] * vz,
      },
      slot: s,
      launched: false,
      // a scratch point, so a flight costs no allocations per frame
      _p: { x: 0, y: 0, z: 0 },
      _d: { x: 0, y: 0, z: 0 },
    }
    this.dimTarget = 1
  }

  // The camera does not move until the star does. Starting the chase at the
  // send-off's first frame instead swung the whole sky during the COAL beat,
  // while the only thing on screen was a spark pinned to the glass at the @'s
  // old position — so the point the star was about to launch from drifted out
  // from under it, and the hand-off from the form to the flight had a jump in
  // exactly the place it most needed not to.
  _launch() {
    const f = this.flight
    if (!f || f.launched) return
    f.launched = true
    this.cam.startChase(() => this._flightPos(), {
      aim: () => this._flightDir(),
      standoff: CHASE_STANDOFF,
      grab: 0.55,
    })
  }

  // The path, as a cubic Bézier, re-solved from the LIVE slot every frame.
  // Freezing the destination at launch would be simpler and very nearly right —
  // the galaxy's clock is almost stopped during a chase — but "very nearly"
  // means the star lands beside its slot rather than in it, and the whole point
  // of the shot is that it arrives somewhere real.
  //
  // The shape matters as much as the endpoints. A straight line from the lens
  // to a point in the disk is a flight through nothing: the camera never
  // changes its relationship to the galaxy, so nothing sweeps. This one climbs
  // out over the disk, so you see the arms from above, and then DESCENDS into
  // the plane on its final approach — down through the dust, into the arm, and
  // the field closes over you on the way in.
  _flightCurve() {
    const f = this.flight
    const p0 = f.p0
    const p3 = this._sealedWorld(f.slot, f._p)
    const dx = p3.x - p0.x, dy = p3.y - p0.y, dz = p3.z - p0.z
    const len = Math.hypot(dx, dy, dz) || 1
    // the climb, and a lateral kick perpendicular to the ground track, so the
    // path bows rather than lying in one flat plane
    // Shallow on purpose. A steeper climb is a better ride, but the descent's
    // final direction is where the camera is LEFT pointing when the flight
    // ends, and every degree of it has to be given back during the pull-out.
    const up = Math.min(0.40, len * 0.23)
    const kx = -dz / len, kz = dx / len
    return {
      p0,
      p1: { x: p0.x + dx * 0.34 + kx * up * 0.60, y: p0.y + dy * 0.34 + up * 0.95, z: p0.z + dz * 0.34 + kz * up * 0.60 },
      p2: { x: p0.x + dx * 0.82 + kx * up * 0.22, y: p0.y + dy * 0.82 + up * 0.34, z: p0.z + dz * 0.82 + kz * up * 0.22 },
      p3,
    }
  }

  // how far along the path the star is, 0..1
  _flightU() {
    const tt = this.modeT - COAL_DUR
    if (tt <= 0) return 0
    return easeFlight(clamp(tt / RUN_DUR, 0, 1))
  }

  _flightPos(out) {
    const f = this.flight
    if (!f || f.reduced) return null
    const c = this._flightCurve()
    const u = this._flightU()
    const v = 1 - u
    const a = v * v * v, b = 3 * v * v * u, d = 3 * v * u * u, e = u * u * u
    out = out || f._d
    out.x = a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x
    out.y = a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y
    out.z = a * c.p0.z + b * c.p1.z + d * c.p2.z + e * c.p3.z
    return out
  }

  // the path's derivative — where the camera looks. Analytic, so the aim
  // carries none of the numerical noise a frame-to-frame difference would.
  _flightDir() {
    const f = this.flight
    if (!f || f.reduced) return null
    const c = this._flightCurve()
    const u = this._flightU()
    const v = 1 - u
    const a = 3 * v * v, b = 6 * v * u, d = 3 * u * u
    return {
      x: a * (c.p1.x - c.p0.x) + b * (c.p2.x - c.p1.x) + d * (c.p3.x - c.p2.x),
      y: a * (c.p1.y - c.p0.y) + b * (c.p2.y - c.p1.y) + d * (c.p3.y - c.p2.y),
      z: a * (c.p1.z - c.p0.z) + b * (c.p2.z - c.p1.z) + d * (c.p3.z - c.p2.z),
    }
  }

  _endSendoff(fire) {
    this.cam.endChase()
    this.flight = null
    this.post.flash = 0
    this.motionScale = 1
    if (fire && this.onSendoffDone) {
      const cb = this.onSendoffDone
      this.onSendoffDone = null
      cb()
    }
  }

  // ── the flight, frame by frame ────────────────────────────────────────────
  _frameSendoff(dt) {
    void dt
    const f = this.flight
    if (!f || f.done) return
    const n = this.sealed.length
    const s = this.sealed[n - 1]
    if (!s) return
    const tt = this.modeT
    const tint = starTint(this.sealKinds[n - 1]) || this.sealHue || this.you
    const col = linearOf(tint)
    const white = [1, 0.96, 0.9]

    if (f.reduced) {
      // no flight: a short bloom where the star lands, and the words on time
      const w = this._sealedWorld(s)
      const q = clamp(tt / 0.9, 0, 1)
      const bell = Math.sin(Math.PI * q)
      this.fx.world(w.x, w.y, w.z, 0.045 + bell * 0.05, white, bell * 2.0, 2)
      this.dimTarget = 0.62
      if (tt >= 0.9) {
        f.done = true
        this._endSendoff(true)
      }
      return
    }

    // ── COAL — the @ collapses to a point on the glass ──────────────────────
    // Small. This is a spark being struck, not a flare being fired: the old
    // ninety-pixel bloom under a thirty-four-pixel head is most of what read as
    // "way too thick", and there is nothing for it to be that big FOR — the
    // whole gesture is that a handle becomes one point of light.
    if (tt < COAL_DUR) {
      const ox = (this.origin ? this.origin.x : 0.5) * this.w
      const oy = (this.origin ? this.origin.y : 0.43) * this.h
      const fc = smooth(tt / COAL_DUR)
      this.fx.screen(ox, oy, 30 * (1 - fc) + 7, col, 0.9 * fc, 0)
      this.fx.screen(ox, oy, 9 + fc * 12, white, 0.4 + 1.3 * fc, 2)
      this.fx.screen(ox, oy, 2.4, white, 3.2 * fc, 0)
      this.sealedScreen[n - 1] = { x: ox, y: oy, vis: true }
      return
    }

    this._launch()
    const runEnd = COAL_DUR + RUN_DUR
    const landEnd = runEnd + LAND_DUR
    const land = clamp((tt - runEnd) / LAND_DUR, 0, 1)

    // ── SETTLE — the camera lets go ─────────────────────────────────────────
    // From here the star is back in `sealed`'s hands: it has landed, it is a
    // resting star of yours, and _frameSealed draws it. Drawing it here too
    // would put two of them in the same place at twice the light. All that is
    // left to run is the camera's own unwind and the sky coming down to the
    // brightness the words have to read over.
    if (tt >= landEnd) {
      this.post.flash = 0
      const q = clamp((tt - landEnd) / SETTLE_DUR, 0, 1)
      this.cam.setChaseOut(q)
      this.dimTarget = lerp(1, 0.62, q)
      this.gasPass.gain = lerp(0.084, 0.3, q)
      // The smear belongs to the RUN. Through the unwind it would only be
      // drawing the camera's own turn, which is the one kind of motion the eye
      // reads as a fault rather than as speed.
      this.motionScale = 1 - smooth(clamp(q * 1.6, 0, 1)) * 0.88
      if (q >= 1) {
        f.done = true
        this._endSendoff(true)
      }
      return
    }

    const p = this._flightPos()
    if (!p) return

    // ── the gas ─────────────────────────────────────────────────────────────
    // Alive through the flight, and pulled back on the DESCENT. The dive's rule
    // (kill the cloud, the star is the subject) is wrong for the run — flying
    // through the gas, watching it close over the frame, is a large part of
    // what says you crossed a galaxy — but it is right for the arrival. The
    // last third of the path drops into the plane, where the ray marches
    // through the whole thickness of the disk, and left alone that is a flat
    // brown fog over the entire frame with a star somewhere in it.
    const deep = clamp((this._flightU() - 0.60) / 0.40, 0, 1)
    this.gasPass.gain = 0.3 * (1 - deep * 0.72) * (1 - land * 0.55)

    // ── the star ────────────────────────────────────────────────────────────
    // Held as a POINT for the whole flight (mayResolve = 0). At this range its
    // true angular diameter would overtake the point-spread and open it into a
    // sixteen-pixel saucer — a dull grey disc where there should be a spark.
    const hero = this.gHero
    // brightest at the launch, easing to exactly the resting star's own gain by
    // the time the resting star takes over, so the hand-off has no step in it
    const gain = tt < runEnd ? 1.45 : lerp(1.45, 0.36, easeOut(land))
    // its rays settle onto the resting star's too, for the same reason
    const spike = tt < runEnd ? 0.5 : lerp(0.5, 0.2, easeOut(land))
    this._pushHeroAt(hero, p.x, p.y, p.z, tint, gain, spike, HERO_TEMP, HERO_LUM, {
      resolve: 0,
      bias: 0.15,
    })
    // its own light, as light: a tight halo in the category's colour
    this.fx.world(p.x, p.y, p.z, 0.012, col, 2.4 * (1 - land * 0.6), 0)

    // the wake — a short taper of light shed behind it, in the world, so it
    // recedes with real perspective as the camera closes. Deliberately thin:
    // the camera is directly behind this, and anything wider is a smear across
    // the middle of the shot rather than a trail.
    if (tt < runEnd) {
      const u = this._flightU()
      const c = this._flightCurve()
      const at = (uu) => {
        const v = 1 - uu
        const a = v * v * v, b = 3 * v * v * uu, d = 3 * v * uu * uu, e = uu * uu * uu
        return {
          x: a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x,
          y: a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y,
          z: a * c.p0.z + b * c.p1.z + d * c.p2.z + e * c.p3.z,
        }
      }
      for (let k = 1; k <= 7; k++) {
        const uu = u - (k / 7) * 0.075
        if (uu <= 0) break
        const q = 1 - k / 7
        const w = at(uu)
        this.fx.world(w.x, w.y, w.z, 0.004 + q * 0.008, k < 3 ? white : col, q * q * 1.5, 0)
      }
    }

    const scr = this.cam.project(p.x, p.y, p.z)
    this.sealedScreen[n - 1] = scr ? { x: scr.sx, y: scr.sy, vis: true } : { x: 0, y: 0, vis: false }

    // ── LAND — it takes its place ───────────────────────────────────────────
    if (tt >= runEnd) {
      const bell = Math.sin(Math.PI * land)
      // A glisten, sized in world units against a star whose own halo is 0.012
      // wide. The old one opened to 0.72 — about a hundred pixels of flat white
      // at this range, which is not an ignition, it is the frame being erased.
      this.fx.world(p.x, p.y, p.z, 0.020 + bell * 0.055, white, bell * 2.6, 2)
      this.fx.world(p.x, p.y, p.z, 0.014 + bell * 0.030, col, bell * 1.8, 0)
      // and NO whole-sky flash. post.flash adds in linear light before the
      // tonemap, which is right for the match's light echo — a real expanding
      // shell — but it means a value as small as 0.045 comes out the far side
      // of ACES and the sRGB encode as a mid-grey over every pixel in the
      // frame. The landing was arriving on a sky the colour of wet cardboard.
      // A ping taking its place is an intimate event; it gets the glisten, and
      // the glisten is local.
    }
  }

  // ── ambient shooting stars ────────────────────────────────────────────────
  // A slim streak crossing a corner of the deep sky every few seconds. Only
  // while the field is at rest — never over a dive, a send-off or the match —
  // and never more than one at a time. A grace note, not weather.
  _frameShoots(dt) {
    if (this.reduced) return
    this._shootAt -= dt
    if (this._shootAt <= 0) {
      this._shootAt = 4 + Math.random() * 5
      const calm = (this.mode === 'idle' || this.mode === 'resting') && this.cam.focus < 0.2 && this.dim > 0.3
      if (calm && !this.shoots.length) {
        const m = Math.min(this.w, this.h)
        const len = m * (0.2 + Math.random() * 0.16)
        const th = 0.1 + Math.random() * 0.55
        const sgn = Math.random() < 0.5 ? -1 : 1
        this.shoots.push({
          x0: (0.1 + Math.random() * 0.8) * this.w,
          y0: (0.06 + Math.random() * 0.5) * this.h,
          dx: Math.cos(th) * len * sgn,
          dy: Math.sin(th) * len,
          tail: m * (0.07 + Math.random() * 0.05),
          dur: 0.85 + Math.random() * 0.5,
          t: 0,
          // a meteor's colour is the metal it is burning — sodium yellow,
          // magnesium blue-white, iron orange. A real detail, cheaply had.
          hue: Math.random() < 0.3 ? '#9FD8FF' : Math.random() < 0.5 ? '#FFE7B8' : '#FFF6EC',
        })
      }
    }
    if (!this.shoots.length) return
    const dist = (s) => Math.hypot(s.dx, s.dy)
    this.shoots = this.shoots.filter((s) => {
      s.t += dt
      const p = s.t / s.dur
      if (p >= 1) return false
      const e = 1 - Math.pow(1 - p, 2.1)
      const hx = s.x0 + s.dx * e
      const hy = s.y0 + s.dy * e
      const bell = Math.sin(Math.PI * p)
      const col = linearOf(s.hue)
      const d = dist(s) || 1
      const nx = s.dx / d, ny = s.dy / d
      const tail = s.tail * (0.35 + 0.65 * bell)
      for (let k = 1; k <= 10; k++) {
        const q = 1 - k / 10
        this.fx.screen(hx - nx * tail * (k / 10), hy - ny * tail * (k / 10), 2 + q * 5, col, q * q * bell * 1.6 * this.dim, 0)
      }
      this.fx.screen(hx, hy, 9, [1, 0.98, 0.95], bell * 4 * this.dim, 0)
      return true
    })
  }

  // ── THE MATCH ─────────────────────────────────────────────────────────────
  // Nothing starts. The reveal's camera move is the ordinary held dive into the
  // viewer's own ping, which the overlay asks for by name, so the sky's only job
  // between here and the strike is to be dark and to hold still.
  _startMatch() {
    this.match = { cover: 0 }
    this.post.flash = 0
  }

  // How completely the overlay's card has taken the star's place, 0..1, set by
  // card/Spread.jsx every frame because it is the only thing that knows.
  //
  // In every other zoom the question never comes up: the card is opaque and sits
  // exactly over the star it grew out of, so whether the engine also draws a
  // photosphere under there is unobservable. The reveal turns the card over, and
  // a disc seen edge-on covers nothing — so for two frames a half-turn the sky
  // was showing a grey ball where the card had been. Two drawings of one object
  // is one too many, and the card is the one with the words on it.
  matchCover(v) {
    if (this.match) this.match.cover = clamp(v, 0, 1)
  }

}

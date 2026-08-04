// card/Spread.jsx — the reveal.
//
// One object. Two faces. Yours is the back, theirs is the front, and the whole
// event is the moment it turns over.
//
// ── what this replaces, twice ────────────────────────────────────────────────
// First the sky drew the reveal: two invented hero stars inspiralling out in the
// disk, a merger flash, a settled binary — and then, once it was over, the two
// cards appeared on top of it and sat still. The two things you were watching
// were never the two things the reveal was about.
//
// So the pair became the real cards, orbiting each other in a fixed layer. That
// was truer and still wrong, for a quieter reason: an endless binary has no
// resting frame. Two discs circling forever means nothing to read, nowhere for
// the eye to land, and a second disc permanently eating the space the first one
// needs — so both had to be small, and small is where a poster stops being a
// poster. It also arrived by its own private route: a flight to an empty patch
// of disk, which is the one place in the product a person's ping is not.
//
// ── what it is now ───────────────────────────────────────────────────────────
//   the zoom     The ordinary held dive into YOUR ping — the same `focusStar`
//                every other zoom in the product uses, resolving on the same
//                curve (card/Resolve.jsx `resolveOf`), landing on the same
//                object. You arrive at the thing you actually placed.
//   the dark     Half a second of it, with your card resolved and nothing else
//                happening. This beat is the whole reason the next one lands.
//   the crash    Their star, out of the deep field, on a collision bearing:
//                a spark that barely moves and grows the way something coming
//                straight at you grows, until it is bigger than the frame it is
//                aimed at. It rakes your card with rose light before it lands.
//   the flip     The strike drives the disc's top edge away and it TUMBLES —
//                fast, freely, losing rate to nothing but its own settling —
//                then aims itself at the nearest face that shows theirs and
//                springs into it, overshooting once and rocking flat. A coin.
//   the rest     Their card, square on, holding still, at the size a poster
//                wants to be read at. Tap it and it turns back over to yours.
//
// The two people are one object with two sides. That is the product's entire
// claim, and it is now the literal geometry of the frame rather than a
// metaphor drawn beside it.
//
// ── what it deliberately does NOT add ────────────────────────────────────────
// A share button that carries their words. The share sheet renders YOUR card
// and the mutual mark, and can never include theirs (§4, content & safety).
// Their words were written to one person.
import * as React from 'react'
import {
  rgba, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, Small, Icon,
} from '../components/ui.jsx'
import Card from './Disc.jsx'
import { TYPE_FLOOR, tintOf } from './model.js'
import { resolveOf, fullSize } from './Resolve.jsx'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── the beats ────────────────────────────────────────────────────────────────
// Only the two that are ours. The zoom has no duration here on purpose: it is
// the camera's, it breathes with how far your star happens to be, and this file
// asks `cam.focus` what it is rather than guessing how long it took — the same
// lesson the rest of the product already learned and left a note about.
const DWELL = 0.45 //    your card, alone, before anything comes out of the dark
const APPROACH = 1.1 //  their star, from first spark to impact
// How long the wall will wait for a camera that is not keeping up before it
// starts the reveal anyway. The sky advances its own time per frame and clamps
// dt for stability, so a device drawing at eight frames a second flies the same
// dive at a fraction of wall speed — and this has to outlast that, because a
// crash that lands on a card still halfway through resolving lands on nothing.
// On any device that can keep up, the camera is home in about three seconds and
// this number never comes up. It is the floor under a bad day, not a schedule.
const GRACE = 9
// And how long it will wait for a sky to exist at all. The reveal takes the
// ambient field even from someone whose backdrop is normally their community's,
// so on that path the canvas is mounting on the same frame this is, and for a
// tick or two there is genuinely nothing to ask. Past this, there is no engine
// coming: the card simply opens where the layout says.
const NO_SKY = 1.2
// Where the zoom stops. Every other zoom in the product goes all the way in
// (sky/camera.js STANDOFF) because at the end of one the star IS the card, and
// the card is opaque over it. This one turns the card over — and a disc seen
// edge-on covers nothing, so at full dive the flip opens a hole onto a
// two-hundred-pixel photosphere with a scatter of out-of-focus field stars
// around it. Stopping short keeps your star the point of light the card is made
// of, which is what you want to glimpse through the turn anyway.
const STANDOFF = 0.52

// ── the crash ────────────────────────────────────────────────────────────────
// Where it hits, and where it comes from, and they are two different angles.
// The strike is high on the right limb, because a blow through the centre of
// mass makes nothing spin — every degree the disc turns is paid for by that
// offset. The approach is steeper than the limb it lands on, so the star falls
// through the frame rather than sliding in from the side.
const STRIKE_A = -1.05 //   rad to the point of contact, from the disc's centre
const COMES_FROM = -1.22 // rad to the direction it falls in along (up is −y).
//                          As shallow as the frame allows: the strike sits about
//                          a quarter of the way down a phone and there is only
//                          so much width to the right of it, so anything flatter
//                          than this starts outside the window instead of at the
//                          top of it.
const FALL = 2 / 3 //       free fall: separation goes as (T − t)^⅔ — slow off
//                          the mark and quickest at the very end. An ease does
//                          the opposite, and nothing in a gravitational field
//                          has ever got slower on arrival.
const NEAR = 11 //          apparent size goes as 1/distance, and this is the
//                          constant of it: an eleven-fold swell between the
//                          first frame and the last. A body on its way in does
//                          not fade up; it stays small for most of the fall and
//                          then takes the frame, which is why it reads as a
//                          collision and not as a transition. Steeper than this
//                          and the whole approach is a sub-pixel speck until the
//                          final two frames, which is not something coming — it
//                          is something appearing.
const SEEN = 0.3 //         how deep the scintillation cuts at its furthest. A
//                          star this far off should waver, not blink out; taken
//                          all the way to nothing it simply was not there for
//                          half the frames of its own approach.
const FLARE = 0.36 //       the burst at the point of contact
// There is no trail behind it, and that is a measurement rather than a taste.
// A streak is motion blur, motion blur is distance travelled during one
// exposure, and this body covers about ten pixels a frame for nearly all of its
// fall — under a third of its own width. Drawn anyway it came out as five discs
// piled on top of each other inside the halo: not a smear, a smudge. What
// actually says "far away and coming fast" here is the size going as
// 1/distance and the scintillation dying out, both of which are real.

// How far out it starts, and it is DERIVED, not picked: exactly far enough that
// the first frame of the fall sits a hair above the top of the window.
//
// A body on a true collision bearing holds its bearing and only grows, so one
// that starts a screen away spends nine tenths of its fall outside the frame and
// then arrives — which is a jump scare, not an approach. The distance a person
// can actually watch is the distance between the top of the window and the card,
// so that is the distance it falls. The FAR part is carried where distance is
// really carried: in how small the thing is, how faint it is, and how much it
// wavers.
const reachOf = (hy) => (hy + 6) / Math.abs(Math.sin(COMES_FROM))

// ── the flip ─────────────────────────────────────────────────────────────────
// A coin, integrated rather than keyframed. The impulse is the strike; after it
// the disc is simply a body with angular momentum, losing rate to its own
// settling, until it is slow enough to be caught — and only THEN does it decide
// where to land, by picking the nearest face ahead of itself that shows theirs.
//
// Landing on an exact face is therefore a result and not a schedule, which is
// what makes the number of turns look chosen by physics instead of by a
// designer. Nothing here counts revolutions.
const W0 = 1900 //      deg/s at the strike — five turns a second, which at sixty
//                      frames is five frames to the half turn: fast enough to be
//                      a spin and slow enough that every one of them is a
//                      readable piece of a disc rather than a strobe
const DRAG = 1.22 //    1/s. Not air. A body coming to rest in a frame.
const CATCH = 700 //    deg/s below which it is slow enough to aim
const LEAD = 90 //      never land on a face it has already gone past
const ZETA = 0.52 //    the catch, underdamped — one clean overshoot and a rock.
//                      At 0.6 the disc came to rest about eighteen degrees past
//                      its face, which is a five per cent squash: correct, and
//                      too small to see. A coin settling is a thing you notice.
const WN_MIN = 10 //    rad/s, floor and ceiling on how hard the catch pulls, so
const WN_MAX = 26 //    a four-turn fall and a one-tap half turn settle at the
//                      same tempo instead of one snapping and the other drifting
const GLINT = 0.028 //  seconds the limb stays lit after it passes through
//                      side-on. Fired on the CROSSING rather than read off the
//                      angle: at five turns a second the disc jumps forty
//                      degrees a frame and lands inside that window perhaps one
//                      pass in four, so an instantaneous test gives a coin that
//                      flashes at random. A crossing test gives one flash per
//                      half turn on every device, which is what a coin does.
const WOBBLE = 6.5 //   deg of precession off the main axis, decaying. A tumbling
//                      object is never a hinge, and this is the difference.
const LAND_WOBBLE = 5 // and the same thing again as it comes to rest — see below
const REST_EPS = 0.35

// Which face is up, in degrees. 0 shows theirs, 180 shows yours — the disc
// starts on yours because that is what the dive resolved into.
const THEIRS = 0
const YOURS = 180

// ── the stage ────────────────────────────────────────────────────────────────
// One disc, so it gets the size a card is meant to be read at — the same
// `fullSize()` every other resolve in the product lands on — minus whatever the
// line above and the buttons below actually need.
// Measured off what the column actually costs on the tightest phone still worth
// supporting: the safe-area padding, the two lines of headline, the tap line,
// the button, the two ghosts under it, and the gaps between all of them. On
// anything phone-shaped `fullSize()` wins and this never binds; it exists so a
// 640-tall screen shrinks the disc instead of sliding it under the button.
const CHROME = 344
function sizeOf() {
  const vh = typeof window === 'undefined' ? 780 : window.innerHeight
  return Math.round(Math.max(TYPE_FLOOR + 6, Math.min(fullSize(), (vh - CHROME) * 0.98)))
}

// ── the choreography ─────────────────────────────────────────────────────────
// One rAF loop. It samples the camera for the zoom, runs its own clock for the
// crash, and integrates the flip; nothing else in the file knows what time it is.
function useReveal(fieldRef, index, centre, size, onStrike) {
  const still = reduced()
  const [s, setS] = React.useState(null)
  // Reduced motion has no loop to publish from, so its one gesture goes through
  // state instead: `hand` counts the half turns taken by a finger.
  const [hand, setHand] = React.useState(0)
  const st = React.useRef(null)
  // `want` is the face being landed ON and `face` is the one currently showing.
  // They are not the same thing for the length of a flip, and the catch has to
  // aim at the first — the disc starts on yours and its whole business is
  // getting to theirs.
  // Reduced motion never flips, so it never travels from one face to the other:
  // it starts on the one the flip would have landed on.
  if (!st.current) {
    const from = still ? THEIRS : YOURS
    st.current = { r: from, w: 0, target: null, wn: WN_MIN, want: from, face: from, dir: 1, glint: 0, tap: 0, open: false, land: -1 }
  }
  // The geometry changes under the loop when a phone turns. Read through a ref
  // so a resize re-frames the reveal without restarting it.
  const geo = React.useRef({ centre, size })
  geo.current = { centre, size }
  const hit = React.useRef(onStrike)
  hit.current = onStrike

  // The one gesture the frame accepts. It sets a target and lets the same
  // integrator that landed the crash run it: a tap is a half turn caught with no
  // impulse behind it, so it arrives with the identical overshoot and rock, at
  // the identical tempo, in a fifth of the travel.
  const turn = React.useCallback(() => {
    const g = st.current
    if (g.target != null || g.w !== 0) return
    g.want = g.want === THEIRS ? YOURS : THEIRS
    g.tap++
    if (still) {
      // The preference is about vestibular safety, and a disc spinning five
      // times a second is precisely what it is asking not to see. So the object
      // presents its other side: the same information, none of the motion.
      g.r = g.want
      g.face = g.want
      setHand((n) => n + 1)
      return
    }
    g.dir = -g.dir
    g.target = g.r + g.dir * 180
    g.wn = WN_MIN
    g.land = 0
  }, [still])

  // ── reduced motion ──
  // Their card, resolved, square on, and nothing else — the arrival with none of
  // the flight. Built where it is read rather than pushed from a loop, because a
  // rAF that recomputes a still frame sixty times a second is the same cost as
  // the animation it is standing in for.
  const stillFrame = React.useMemo(() => {
    if (!still) return null
    void hand
    return {
      ...resolveOf(1, null, centre, size),
      rot: st.current.r, roll: 0, yaw: 0, push: 0, slide: { x: 0, y: 0 }, glint: 0,
      star: null, flare: 0, rake: 0, lit: 0,
      named: true, told: true, open: true, face: st.current.face, tap: st.current.tap,
    }
  }, [still, hand, centre, size])

  React.useEffect(() => {
    if (still) return undefined
    let raf = 0
    let live = true
    const t0 = performance.now()
    const g = st.current
    let prev = 0
    let landed = -1 // wall seconds at which the camera finished the zoom
    let struck = -1 // wall seconds at which their star arrived
    let fired = false
    let dove = false // whether the zoom has been asked for
    let flew = false // and whether the sky actually took it
    let dark = 0 //    seconds spent with no sky to ask

    const tick = () => {
      if (!live) return
      const now = (performance.now() - t0) / 1000
      // dt off the same clock everything here is integrated against, clamped for
      // the reason every integrator in this codebase clamps it: a backgrounded
      // tab must not come back to a disc that has spun through four hundred
      // revolutions in one frame.
      const dt = clamp(now - prev, 0, 0.05)
      prev = now

      const f = fieldRef && fieldRef.current
      const q = geo.current
      // ── the zoom ──
      // Asked for here rather than in an effect of its own, because the sky this
      // screen flies through can be a frame or two behind this screen: the
      // reveal takes the ambient field even from someone whose backdrop is
      // normally their community's, and an effect that fires once, at mount,
      // against a ref that is still null simply never dives. This asks on the
      // frame there is something to ask.
      let focus
      if (f && f.cam && !dove && f.focusStar && index != null && index >= 0) {
        dove = true
        f.focusStar(index, { hold: true, standoff: STANDOFF })
        // Did the sky take it? It refuses when the star it was handed does not
        // exist — a ping list that has not caught up, a restore mid-flight — and
        // an unasked question is not something to wait on. Without this the
        // reveal simply held a blank frame until the wall-clock floor ran out.
        flew = f.focusIndex === index
      }
      if (f && f.cam && flew) {
        // Read, never timed. A dive's bank breathes with how far the star is, so
        // no single delay was ever going to be right; the camera knows when it
        // has landed, and this asks it every frame.
        focus = clamp(f.cam.focus, 0, 1)
      } else if (f && (dove || !f.cam)) {
        // A sky with no camera (canvas-2D, a lost context), or one that had
        // nothing to fly to. Either way there is no flight to wait on, so the
        // card is already where it was going.
        focus = 1
      } else {
        dark += dt
        focus = dark > NO_SKY ? 1 : 0
      }
      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null
      const disc = resolveOf(focus, scr, q.centre, q.size)
      // and tell the sky how much of its star is left to draw. The card is
      // opaque and sits exactly where the star is, so the two must cross over on
      // ONE curve — this one — or the flip opens a hole onto a photosphere.
      if (f && f.matchCover) f.matchCover(disc.opacity)
      if (landed < 0 && (focus > 0.995 || now > GRACE)) landed = now

      // ── the crash ──
      const u = landed < 0 ? -1 : now - landed - DWELL
      let star = null
      let rake = 0
      if (u >= 0 && struck < 0) {
        const p = clamp(u / APPROACH, 0, 1)
        star = starAt(p, q, now)
        rake = smoothstep(0.58, 1, p)
        if (p >= 1) {
          struck = now
          star = null
          rake = 1
          // the impulse, and the only one: everything the disc does from here is
          // this number decaying
          g.w = W0
          g.target = null
          g.want = THEIRS
        }
      }

      // ── the flip ──
      // Free while it is fast, caught once it is not. `target` is chosen AT the
      // catch and never before, so how far the disc travels is decided by the
      // rate it still has rather than by a count of revolutions somebody typed.
      if (g.w !== 0 || g.target != null) {
        const was = g.r
        if (g.target == null) {
          g.w *= Math.exp(-DRAG * dt)
          g.r += g.w * dt
          if (Math.abs(g.w) < CATCH) {
            const dir = g.w < 0 ? -1 : 1
            const from = g.r + dir * LEAD
            // the nearest face ahead of itself that shows the side it is landing
            // on — the disc stops where it was already going
            const k = dir > 0 ? Math.ceil((from - g.want) / 360) : Math.floor((from - g.want) / 360)
            g.target = g.want + k * 360
            g.dir = dir
            // Fixed here, once. Recomputed per frame off the live rate it would
            // stiffen as the spring accelerated the disc into its own target,
            // which is a spring that pulls harder the faster you go: a landing
            // that snaps instead of settling.
            g.wn = clamp((1.6 * Math.abs(g.w)) / Math.max(Math.abs(g.target - g.r), 1), WN_MIN, WN_MAX)
            g.land = 0
          }
        } else {
          const d = g.target - g.r
          g.w += (g.wn * g.wn * d - 2 * ZETA * g.wn * g.w) * dt
          g.r += g.w * dt
          if (Math.abs(g.target - g.r) < REST_EPS && Math.abs(g.w) < 10) {
            g.r = g.target
            g.w = 0
            g.target = null
            g.face = g.want
            g.open = true
            g.land = -1
          }
        }
        if (g.land >= 0) g.land += dt
        // one flash per pass through side-on, counted rather than sampled
        if (Math.floor((was - 90) / 180) !== Math.floor((g.r - 90) / 180)) g.glint = 1
      }
      if (g.glint > 0) g.glint = Math.max(0, g.glint - dt / GLINT)

      // ── what the strike did to the rest of it ──
      // The same impulse, spent three other ways: a wobble off the tumble's own
      // axis, a shove along the line the star came in on, and a push toward the
      // lens. All three decay to nothing, because the disc has to come to rest
      // square on or the words are not readable.
      const v = struck < 0 ? -1 : now - struck
      const decay = v < 0 ? 0 : Math.exp(-v / 0.52)
      const roll = v < 0 ? 0 : WOBBLE * decay * Math.sin((v / 0.33) * Math.PI * 2)
      // The landing's own wobble, off the axis the disc is turning on. Rotation
      // near a face is second-order in what the eye sees — a thirty-degree
      // overshoot is an eleven per cent squash, which is real and nearly
      // invisible — so a settle expressed only along the flip axis reads as the
      // disc pulsing rather than rocking. A body coming to rest with any
      // momentum left off-axis precesses; this is that, small, and it is what
      // makes the last half second look like something settling.
      const lw = g.land < 0 ? 0 : LAND_WOBBLE * Math.exp(-g.land / 0.26) * Math.sin((g.land / 0.3) * Math.PI * 2)
      const yaw = lw + (v < 0 ? 0 : WOBBLE * 0.55 * decay * Math.sin((v / 0.47) * Math.PI * 2))
      const knock = v < 0 ? 0 : Math.exp(-v / 0.24) * Math.sin((v / 0.34) * Math.PI * 2)
      // Instant on, then decay. A bell peaks in the middle, which means the
      // brightest instant of a collision arrives two hundred milliseconds after
      // the collision — a flash that has to get going first is a lamp, not an
      // impact.
      const flare = v < 0 || v > FLARE ? 0 : Math.pow(1 - v / FLARE, 2)

      if (struck >= 0 && !fired) {
        fired = true
        if (hit.current) hit.current()
      }

      setS({
        ...disc,
        rot: g.r,
        roll,
        yaw,
        glint: g.glint,
        push: knock * q.size * 0.09,
        slide: { x: -knock * q.size * 0.05, y: knock * q.size * 0.075 },
        star,
        flare,
        // What light is falling on the face, and it is one number because it is
        // one story: their star raking it rose on the way in, and then the
        // strike itself, white, from the same corner.
        lit: Math.max(rake * 0.55, flare),
        named: disc.resolve > 0.55, //  "it's mutual." — you learn that it happened
        told: struck >= 0, //           and then, at the impact, what happened
        // Once, and then never false again. Hung on the live "is it turning"
        // instead, the buttons and the line under them faded out and back in
        // every single time the card was tapped — the screen flinching at its
        // own one gesture. The reveal is over when the disc first comes to rest;
        // turning it over afterwards is reading, not arriving.
        open: g.open,
        face: g.face,
        tap: g.tap,
      })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(raf)
      // Let the star go. Closing is the same curve run backwards — `focus`
      // decays and the camera glides home along the path it came in on — so
      // there is no exit animation to write here either.
      const f = fieldRef && fieldRef.current
      if (dove && f && f.clearFocus) f.clearFocus()
    }
  }, [fieldRef, index, still])

  return [still ? stillFrame : s, turn]
}

// ── their star, on the way in ────────────────────────────────────────────────
// A body on a collision course barely moves across the sky. It holds its bearing
// and it GROWS, and that constancy is the whole reason an incoming thing reads as
// incoming rather than as something drifting past. So the bearing is fixed here
// and the size is not: apparent radius goes as 1/distance, which is one line and
// is the entire effect.
function starAt(p, q, now) {
  const d = Math.pow(1 - p, FALL)
  const S = q.size
  const hx = q.centre.x + Math.cos(STRIKE_A) * S * 0.5
  const hy = q.centre.y + Math.sin(STRIKE_A) * S * 0.5
  const reach = reachOf(hy)
  const ax = Math.cos(COMES_FROM)
  const ay = Math.sin(COMES_FROM)
  return {
    x: hx + ax * reach * d,
    y: hy + ay * reach * d,
    r: (S * 0.14) / (1 + d * NEAR),
    // A star's flux goes as 1/distance², so it does not simply get bigger — it
    // gets brighter faster than it gets bigger, and the halo is where that
    // shows.
    halo: 0.22 + 0.62 * (1 - d),
    // And it SCINTILLATES while it is far, because scintillation is an angular-
    // size effect: the atmosphere can only make a point of light dance, never a
    // disc. So the twinkle dying out as the thing closes is not decoration, it
    // is the same "point of light becomes a body" crossing the rest of the sky
    // is built on — and it is what tells you, before anything else does, that
    // what is coming is coming from a very long way off.
    lit: 1 - Math.pow(d, 2.4) * SEEN * (1.5 + 0.85 * Math.sin(now * 19)),
    d,
  }
}

// ── the disc, held in the field ──────────────────────────────────────────────
// A fixed layer: for the length of the zoom the card is wherever your star is,
// which is not where the column reserved room for it, and their star spends most
// of its fall genuinely off the edge of the window.
//
// The two faces are one object. `preserve-3d` and a back face turned 180° is all
// a real flip needs; what makes it read as a printed disc rather than a widget
// is everything hung off the facing angle — the shading, the foreshortening the
// perspective does for free, and the light that catches the edge as it passes
// through.
function Held({ C, s, theirs, yours, theirUrl, yourUrl, them, onTurn, open }) {
  const S = s.size
  const half = S / 2
  const hueThem = tintOf(C, theirs && theirs.tone)
  const hueYou = tintOf(C, yours && yours.tone)
  // How square-on the visible face is. Everything about the light comes off this
  // one cosine, the way it does on any real surface.
  const rad = (s.rot * Math.PI) / 180
  const facing = Math.abs(Math.cos(rad))
  const front = Math.cos(rad) >= 0
  const hue = front ? hueThem : hueYou
  // The edge. A disc has one, and at the instant it turns through side-on that
  // edge is the only thing there is to see — a hairline that catches the light
  // and is gone. This is NOT a drawn stroke on the card: Disc.jsx is right that
  // nothing in a real sky has one, and a ring that were always there would turn
  // the card into a badge. It is a specular event, fired by the loop on the
  // crossing itself so it happens once per half-turn at any frame rate, and
  // shaped here by how side-on the disc actually is on the frame that flash
  // lands in — so a device slow enough to swallow a whole half-turn in one tick
  // cannot leave a bright line lying across a card that is facing the viewer.
  const edge = (s.glint || 0) * (0.4 + 0.6 * (1 - facing))

  const face = (card, url, tint, label, back) => (
    <span
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateX(180deg)' : 'none',
      }}
    >
      <Card C={C} card={card} url={url} size={S} tint={tint} label={label} glow={0.55 + facing * 0.6} />
      {/* the shading. A surface turned away from the light is darker, and a
          printed disc turning end over end passes through that twice a
          revolution. Without it the flip is a picture being rotated; with it,
          it is an object. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: rgba(C.ink, 0.62 * (1 - facing)),
        }}
      />
      {/* and the light actually falling on it: rose off their star as it comes
          in, then white off the strike, raking from the corner it came from */}
      {s.lit > 0.01 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%', opacity: s.lit * facing,
            background: `radial-gradient(circle at 76% 18%, ${rgba(C.cream, 0.5)} 0%, ${rgba(C.them, 0.34)} 34%, transparent 68%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </span>
  )

  return (
    <div
      style={{
        position: 'absolute', left: s.x - half, top: s.y - half, width: S, height: S,
        filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',
        opacity: s.opacity,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div
        role={open ? 'button' : undefined}
        tabIndex={open ? 0 : undefined}
        aria-label={open ? 'turn the card over' : undefined}
        onPointerUp={open ? onTurn : undefined}
        onKeyDown={open ? (e) => ((e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTurn())) : undefined}
        style={{
          width: '100%', height: '100%', borderRadius: '50%',
          cursor: open ? 'pointer' : 'default',
          // The same focal ratio the sky is photographed through (sky/camera.js
          // FOCAL). One lens for the whole product: the disc foreshortens on its
          // way round exactly as hard as a star does on its way past.
          perspective: S * 2.35,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          style={{
            position: 'relative', width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            transform:
              `translate3d(${s.slide.x}px, ${s.slide.y}px, ${s.push}px) ` +
              `rotateX(${s.rot}deg) rotateZ(${s.roll}deg) rotateY(${s.yaw}deg)`,
          }}
        >
          {face(theirs, theirUrl, hueThem, `@${them}`, false)}
          {face(yours, yourUrl, hueYou, 'yours', true)}
        </div>
      </div>

      {/* the specular edge, drawn OUTSIDE the 3D body so it stays a flat line on
          the glass — which is what a highlight is */}
      {edge > 0.01 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: half - 1.5, width: '100%', height: 3,
            borderRadius: 3, opacity: edge * 0.9,
            background: `linear-gradient(90deg, transparent 0%, ${rgba(hue, 0.6)} 14%, ${rgba(C.cream, 0.95)} 50%, ${rgba(hue, 0.6)} 86%, transparent 100%)`,
            boxShadow: `0 0 ${S * 0.07}px ${rgba(C.cream, 0.55 * edge)}`,
          }}
        />
      )}
    </div>
  )
}

// ── their star, and the strike ───────────────────────────────────────────────
function Crash({ C, s }) {
  const star = s.star
  return (
    <>
      {star && (
        <>
          <span
            aria-hidden
            style={{
              position: 'absolute', left: star.x - star.r * 3.4, top: star.y - star.r * 3.4,
              width: star.r * 6.8, height: star.r * 6.8, borderRadius: '50%', opacity: star.halo,
              background: `radial-gradient(circle, ${rgba(C.cream, 0.55)} 0%, ${rgba(C.them, 0.4)} 26%, ${rgba(C.them, 0.14)} 54%, transparent 76%)`,
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute', left: star.x - star.r, top: star.y - star.r,
              width: star.r * 2, height: star.r * 2, borderRadius: '50%', opacity: star.lit,
              background: `radial-gradient(circle at 42% 36%, ${rgba(C.cream, 0.98)} 0%, ${rgba(C.cream, 0.9)} 30%, ${rgba(C.them, 0.9)} 70%, ${rgba(C.them, 0.5)} 100%)`,
            }}
          />
        </>
      )}

      {/* The contact, and it is SMALL. The sky is already lifting the whole
          frame on this instant (galaxy.js matchStrike, ACES-rolled so it lifts
          rather than clips); a second flash at screen scale on top of that does
          not read as bright, it reads as grey — every pixel raised at once is
          just a lower contrast ratio, and the most important frame in the
          product turns to fog with a card somewhere in it. What makes something
          look bright is what is dark next to it. So this is a burst about as
          wide as the disc, hot in the middle, ended by the time the second turn
          is over: light coming off one point, which is where the two actually
          met. */}
      {s.flare > 0.01 && (() => {
        const r = s.size * (0.14 + s.flare * 0.3)
        const hx = s.x + Math.cos(STRIKE_A) * s.size * 0.5
        const hy = s.y + Math.sin(STRIKE_A) * s.size * 0.5
        return (
          <span
            aria-hidden
            style={{
              position: 'absolute', left: hx - r, top: hy - r, width: r * 2, height: r * 2,
              borderRadius: '50%', opacity: s.flare * 0.92,
              background: `radial-gradient(circle, ${rgba(C.cream, 0.98)} 0%, ${rgba(C.cream, 0.6)} 10%, ${rgba(C.you, 0.34)} 24%, ${rgba(C.them, 0.12)} 46%, transparent 70%)`,
            }}
          />
        )
      })()}
    </>
  )
}

// ── the reveal ───────────────────────────────────────────────────────────────
// `theirs` and `yours` are two cards. `index` is which of the ambient field's
// sealed stars this ping is, so the zoom flies to the real one. `onSay` is the
// exit, and it is the loudest thing on the screen from the moment the disc comes
// to rest, because celestual ends at the handoff (§1.6): there is no chat here,
// and the DM is not the product stopping short, it is the product working.
export default function Spread({ C, yours, theirs, yourUrl, theirUrl, index, fieldRef, onSay, onShare, onBack }) {
  const [size, setSize] = React.useState(sizeOf)
  const stageEl = React.useRef(null)
  const [centre, setCentre] = React.useState({ x: 0, y: 0 })

  // The strike is the overlay's to time, because the overlay owns the object
  // that gets hit. The sky is told, on that frame, so its flash and this one are
  // the same instant by construction rather than by two timers that agree until
  // a slow device pulls them apart.
  const onStrike = React.useCallback(() => {
    const f = fieldRef && fieldRef.current
    if (f && f.matchStrike) f.matchStrike()
  }, [fieldRef])

  // The zoom lives inside this: it is the same held `focusStar` the status
  // page's "see it in the sky" makes, and it is asked for from the loop, on the
  // frame the sky exists to ask.
  const [s, turn] = useReveal(fieldRef, index, centre, size, onStrike)

  // Measured, not computed. The disc is centred on whatever the column actually
  // left for it — which moves when the type wraps, when a font finishes loading,
  // or when a phone turns — and never on an assumption about how tall the line
  // above it came out.
  React.useEffect(() => {
    const measure = () => {
      const el = stageEl.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setCentre({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    const onResize = () => {
      setSize(sizeOf())
      measure()
    }
    measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    // The disc is drawn in a FIXED layer off a rect in viewport coordinates, so
    // a scroll moves the room without moving the thing that lives in it. This
    // screen fits a viewport on anything shaped like a phone; a short landscape
    // window is the case where it does not, and there it has to come with the
    // column.
    window.addEventListener('scroll', measure, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && stageEl.current) ro.observe(stageEl.current)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('scroll', measure)
      if (ro) ro.disconnect()
    }
  }, [])

  const named = !!(s && s.named)
  const told = !!(s && s.told)
  const open = !!(s && s.open)
  const them = (theirs && theirs.handle) || (yours && yours.handle) || ''

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `max(40px, env(safe-area-inset-top)) clamp(14px, 4vw, 40px) max(24px, env(safe-area-inset-bottom))`,
        gap: SPACE.lg,
      }}
    >
      {/* The sky recedes as the card resolves, so the poster has something to be
          read against — the identical veil card/Resolve.jsx hangs on the
          identical variable, because it is the identical arrival. Never to
          black: the point of getting here is that the card is IN the field, not
          in front of it. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
          background: `radial-gradient(118% 72% at 50% 48%, ${rgba(C.ink, 0.6)} 0%, ${rgba(C.ink, 0.5)} 56%, ${rgba(C.ink, 0.8)} 100%)`,
          opacity: s ? s.opacity * 0.9 : 0,
        }}
      />

      <div
        style={{
          position: 'relative', zIndex: 3, textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
        }}
      >
        {/* The headline arrives with YOUR card, at the end of the zoom: you have
            landed on the thing you placed, and this names what it turned out to
            be. */}
        <h1
          style={{
            margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
            fontSize: SIZE.display, lineHeight: 1.05, color: C.cream,
            opacity: named ? 1 : 0, transition: 'opacity .9s ease',
          }}
        >
          it’s mutual.
        </h1>
        {/* And the sentence arrives on the strike, because the strike is the
            second half of it. A statement, so it is set in the interface
            register rather than the metadata one: it is not a label, it is what
            happened. */}
        <p
          style={{
            margin: '0 auto', maxWidth: 320, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted,
            opacity: told ? 1 : 0, transition: 'opacity .7s ease',
          }}
        >
          you entered @{them}. @{them} entered you.
        </p>
      </div>

      {/* The room the disc is given, and it is empty: the disc is drawn in a
          fixed layer, because for the length of the zoom it is wherever your
          star happens to hang. What this reserves is the space it comes to rest
          in, which is the only thing the column needs to know. The disc follows
          it here in the DOM so a reader who is listening gets the screen in the
          order it means: what happened, then what you each said, then where to
          go. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <div ref={stageEl} aria-hidden style={{ flex: '0 1 auto', width: size, height: size, maxWidth: '100%' }} />
      </div>

      {/* NOT aria-hidden, whatever it looks like. What is in here is the two
          people's actual words; a decorative layer is the one thing this is not.
          Overflow is clipped because their star spends most of its fall outside
          the window, and a page that scrolls sideways during a reveal is a page
          that has told on itself. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {s && (
          <>
            <Crash C={C} s={s} />
            <Held
              C={C} s={s} theirs={theirs} yours={yours} theirUrl={theirUrl} yourUrl={yourUrl}
              them={them} onTurn={turn} open={open}
            />
          </>
        )}
      </div>

      <div
        style={{
          position: 'relative', zIndex: 3, width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
          opacity: open ? 1 : 0, transition: 'opacity .7s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* The one instruction on the screen, and it is needed: a disc with a
            second side is worth nothing if nobody knows it has one. Mono, quiet,
            and it stops being shown the moment it has been used. */}
        <div
          style={{
            fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
            textTransform: 'uppercase', textAlign: 'center', color: rgba(C.cream, 0.42),
            opacity: s && s.tap ? 0 : 1, transition: 'opacity .5s ease',
          }}
        >
          {s && s.face === THEIRS ? 'tap the card for yours' : 'tap the card for theirs'}
        </div>
        <PrimaryButton C={C} onClick={onSay}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            go say it <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <Small C={C} align="center" color={C.muted}>the rest is yours.</Small>
        <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.xl, marginTop: SPACE.sm }}>
          {/* Shares YOUR card and the mutual mark. Never theirs, at any tier, for
              any reason — their words were written to one person, and a share
              sheet that could carry them is a share sheet that will. */}
          <GhostButton C={C} onClick={onShare} style={{ fontSize: SIZE.meta }}>share your card</GhostButton>
          <GhostButton C={C} onClick={onBack} style={{ fontSize: SIZE.meta }}>your sky</GhostButton>
        </div>
      </div>
    </div>
  )
}

// card/Spread.jsx — the reveal.
//
// Two cards, one screen, both of them yours to read. Nothing on this screen
// arrives; the other one was already there.
//
// ── what this replaces, and why it kept being wrong ──────────────────────────
// Four designs have stood here. The sky drew an inspiral of two invented stars
// and the cards turned up afterwards, having done nothing. Then the pair became
// the real cards, orbiting forever — truer, and with no resting frame: two discs
// circling means nothing to read and nowhere for the eye to land. Then their
// ping came in on a collision course, struck this one, and set it spinning like
// a tossed coin.
//
// That third one failed for a reason worth writing down. **A coin flip is a
// wager.** It is chance, suspense, heads-or-tails — and a mutual is the precise
// opposite of chance: two people already decided, separately, weeks ago. A
// collision is worse. It is violence, and nobody here was hit. Between them they
// spent eleven separate events — impact, flash, tumble, wobble, overshoot,
// glint, rock — on a screen that is not a game and has no input to reward.
// VOICE.md has the sentence for it: *the 2am message, never the carnival.*
//
// So the fourth was one object with two faces: your card, turning over to show
// theirs on the back. It was quiet, and it was almost right, and it had one
// structural fault that no amount of tuning could reach — **a two-sided object
// can only ever show you one side.** At the end of the most important screen in
// the product, half of what the screen is about is facing away from you. Two
// people wrote to each other, and the design made you choose which one of them
// to be looking at. Worse, it made "what did I write" and "what did they write"
// into two separate acts of memory rather than one image you can see at once.
//
// ── what it is now ───────────────────────────────────────────────────────────
// The pair. Both cards, side by side, at rest, in one frame.
//
// Their card did not fly in from anywhere. It has existed since the day they
// wrote it, in the dark, DIRECTLY BEHIND yours, the whole time you were checking
// and finding nothing. That is not a metaphor here, it is the staging: theirs is
// drawn at the same point, a little smaller, hidden by yours — so the only
// evidence of it is the light escaping past your limb. Then the two part, and
// what was behind comes out and sits beside. Four beats, one motion:
//
//   the arrival   The ordinary held dive into YOUR ping — the same `focusStar`
//                 every other zoom in the product makes, on the same curve
//                 (`resolveOf`). You land on the thing you actually placed.
//   the light     Their light rises around the limb of your card. Nothing moves.
//                 This is an ECLIPSE: the near body is dark, and all you get of
//                 the far one is the corona around its edge. It is the whole
//                 claim of the product in one image, and it needs no words —
//                 there is something on the other side of this.
//   the parting   The two draw apart, on the camera's own easing, and theirs
//                 comes up to full size as it clears. Not a reveal-by-motion:
//                 the motion is the FRAME re-composing itself to hold two things
//                 where it had been holding one.
//   the pair      Both at rest, level, the same size, each keeping a quiet halo
//                 of the other's light. Neither is the front.
//
// Tapping either one brings it forward to be read; tapping it again sets it
// back. That is a reading aid, not a state — the resting frame is the pair.
//
// ── what carries it, given that almost nothing moves ─────────────────────────
// The light does. Every value on this screen is a lighting value: whose light is
// escaping, how much of it, and from behind what. The only motion is one slide
// of about a card's width, in well under a second, and it does not overshoot,
// because a hand setting two photographs down side by side does not bounce.
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
import { easeFlight } from '../sky/camera.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── the beats ────────────────────────────────────────────────────────────────
// Three numbers, and they are unhurried without being slow. The old sequence
// packed eleven events into the same span; this one spends it on three.
//
// They came down by about half. Not because the shape was wrong — it is the
// same three beats in the same order — but because of WHERE this screen sits.
// Nobody arrives at it by accident: they saw a sealed match on the ledger, they
// decided to look, and they pressed it. Every beat after that decision is time
// spent between a person and the one answer they came back for, and three and
// three quarter seconds on top of a three second dive is not restraint, it is a
// wait. A held breath is a beat; a held breath you notice holding is a delay.
//
// The zoom has no duration here on purpose: it is the camera's, it breathes with
// how far your star happens to be, and this file asks `cam.focus` what it is
// rather than guessing how long it took. What it DOES do is ask for a shorter
// one (RUN / BANK below), since on this screen the flight is not the event.
const HOLD = 0.34 //  your card, alone, before the dark gives anything up
const BLOOM = 0.78 // their light coming up around the limb
const PART = 0.82 //  the two drawing apart

// The approach, handed to the camera. Every other dive in the product runs 2.6
// seconds and is a flight you watch; this one is a door opening.
const RUN = 1.25
const BANK = 0.62

// How long the wall will wait for a camera that is not keeping up before it
// starts the reveal anyway. The sky advances its own time per frame and clamps
// dt for stability, so a device drawing at eight frames a second flies the same
// dive at a fraction of wall speed — and this has to outlast that, because light
// coming up around a card that is still resolving comes up around nothing. On
// any device that can keep up the camera is home in about a second and a half
// and this never comes up. It is the floor under a bad day, not a schedule.
const GRACE = 5
// And how long it will wait for a sky to exist at all. The reveal takes the
// ambient field even from someone whose backdrop is normally their community's,
// so on that path the canvas is mounting on the same frame this is, and for a
// tick or two there is genuinely nothing to ask. Past this, there is no engine
// coming: the card simply opens where the layout says.
const NO_SKY = 1.2
// Where the zoom stops. Every other zoom in the product goes all the way in
// (sky/camera.js STANDOFF) because at the end of one the star IS the card, and
// the card is opaque over it. This one puts the card somewhere else on the
// screen before it is done — so at full dive the parting would slide your card
// off a two-hundred-pixel photosphere and leave it sitting in the gap. Stopping
// short leaves the field a field, and `matchCover` takes the star itself.
const STANDOFF = 0.52

// ── the light ────────────────────────────────────────────────────────────────
// What escapes past the limb, as a fraction, at the three moments it means
// different things.
//
// The eclipse, which is the beat that has to carry the whole middle of this
// screen. It is loud on purpose: for a second and a half it is the only thing
// happening, and the first cut of this had it sitting at a quarter opacity
// because the swell below was doing all the work — so the beat meant to say
// "there is something on the other side of this" said it almost inaudibly.
const CORONA_BLOOM = 0.62
// The residue. Once the two are side by side each keeps a halo of its own
// light — quieter, and it never goes away. Nothing here stops existing.
const CORONA_REST = 0.14
// And the swell as the gap opens, because the instant a body clears another
// body is the instant the most light gets past. It is the brightest frame on
// the screen and it costs nothing to arrange — the same light, read at a
// different moment.
const CORONA_EDGE = 0.3
// How far past the limb it reaches, in card diameters. A corona HUGS the body:
// it is brightest within a fraction of a radius of the limb and gone not long
// after. Given the whole screen to spread across it stops being light coming
// from behind something and becomes a colour wash with a card in it, which is
// the same mistake the old impact flash made — every pixel lifted at once is
// not brightness, it is a lower contrast ratio.
const CORONA_REACH = 1.55
// …and it PULLS IN as the two settle. There are two coronas at rest where the
// eclipse had one, and two of anything at the old reach is not light around a
// body, it is an orange wash with two cards in it — the exact failure this
// constant's own note warns about, arrived at from the other direction.
const CORONA_REACH_REST = 1.15

// ── how the two sit ──────────────────────────────────────────────────────────
// Not in a row. Two photographs put down on a table do not line up: the second
// lands a little short of the first and a little to one side, and the near one
// covers a sliver of the far one. That small failure of alignment is most of
// what separates "two things someone set down" from "two things a layout
// placed", and it is the difference between a pair and a diagram.
//
// Both numbers are fractions of a card's diameter, and both are deliberately
// small. The overlap has to stay under the disc's own type margin — nothing
// either of them wrote may ever be behind the other card — and the offset has
// to stay well inside the angle at which a pair reads as tumbled rather than
// as placed.
const OVERLAP = 0.09 // how far the near card laps over the far one
const SKEW = 0.06 //    and how far each is set off the shared axis

// ── the stage ────────────────────────────────────────────────────────────────
// Two discs have to fit, both readable, and "readable" has a number:
// model.js's TYPE_FLOOR is the diameter below which the card's own type stops
// being type. So the layout solves for the largest pair that fits the box the
// column actually left, along whichever axis fits them better — side by side on
// anything wide, stacked on a phone held upright.
//
// The overlap BUYS size: two discs that lap over each other need less room than
// two that do not, and the room they give back goes into the diameter, which is
// what the words are read at.
//
// ── and it is clamped to the WINDOW, not only to the column ─────────────────
// This used to end at `Math.max(TYPE_FLOOR, …)`, on the argument that a card
// too small to set its own type is worse than a pair that overflows a little.
// Both halves of that were wrong on a short screen. The pair is drawn in a
// FIXED layer with `overflow: hidden` on it, so "overflows a little" is not a
// pair spilling generously past its column — it is a card with its bottom
// sliced off by the edge of the window, at the one moment in the product where
// what is being cut off is a sentence somebody wrote to you.
//
// So the window has the final say. The floor still wins against the COLUMN (a
// stage that measured short because the type above it wrapped should not shrink
// the cards), and the viewport still wins against the floor, which is the one
// bound that cannot be argued with: it is the glass.
const SPAN = 2 - OVERLAP //  diameters used along the pair's axis
const CROSS = 1 + 2 * SKEW //           and across it
// how much of the window's short side the pair leaves as air, so a card ends
// before the edge rather than at it
const MARGIN = 12
function pairOf(box) {
  const cap = fullSize()
  const row = Math.min(cap, box.w / SPAN, box.h / CROSS)
  const col = Math.min(cap, box.h / SPAN, box.w / CROSS)
  const across = row >= col
  const vw = (typeof window !== 'undefined' ? window.innerWidth : 360) - MARGIN * 2
  const vh = (typeof window !== 'undefined' ? window.innerHeight : 640) - MARGIN * 2
  const roof = across
    ? Math.min(vw / SPAN, vh / CROSS)
    : Math.min(vh / SPAN, vw / CROSS)
  return {
    across,
    size: Math.round(Math.min(Math.max(TYPE_FLOOR, across ? row : col), roof)),
  }
}

// ── the choreography ─────────────────────────────────────────────────────────
// One rAF loop, and almost all of what it publishes is light. It samples the
// camera for the zoom, runs one clock for the bloom and the parting, and
// evaluates both as pure functions of that clock — there is no integrator here,
// no state to drift, and nothing to settle.
function useReveal(fieldRef, index, centre, size) {
  const still = reduced()
  const [s, setS] = React.useState(null)
  // The geometry changes under the loop when a phone turns. Read through a ref
  // so a resize re-frames the reveal without restarting it.
  const geo = React.useRef({ centre, size })
  geo.current = { centre, size }

  // ── reduced motion ──
  // Both cards, resolved, already apart, with the light settled where it ends
  // up. Built where it is read rather than pushed from a loop, because a rAF
  // that recomputes a still frame sixty times a second is the same cost as the
  // animation it is standing in for.
  const stillFrame = React.useMemo(() => {
    if (!still) return null
    return { ...resolveOf(1, null, centre, size), part: 1, bloom: 1, named: true, told: true, open: true }
  }, [still, centre, size])

  React.useEffect(() => {
    if (still) return undefined
    let raf = 0
    let live = true
    const t0 = performance.now()
    let prev = 0
    let landed = -1 // wall seconds at which the camera finished the zoom
    let dove = false // whether the zoom has been asked for
    let flew = false // and whether the sky actually took it
    let dark = 0 //    seconds spent with no sky to ask
    let alone = 0 //   and seconds spent opening without one

    const tick = () => {
      if (!live) return
      const now = (performance.now() - t0) / 1000
      const dt = clamp(now - prev, 0, 0.05)
      prev = now

      const f = fieldRef && fieldRef.current
      const q = geo.current
      // ── the zoom ──
      // Asked for here rather than in an effect of its own, because the sky this
      // screen flies through can be a frame or two behind this screen: the
      // reveal takes the ambient field even from someone whose backdrop is
      // normally their community's, and an effect that fires once, at mount,
      // against a ref that is still null simply never dives.
      let focus = 0
      // Is there a flight to be had at all? A canvas-2D fallback has no camera;
      // a ping list that has not caught up, or a restore mid-flight, leaves no
      // star to fly to. Both are ordinary, and neither is something to wait on.
      const canFly = !!(f && f.cam && f.focusStar && index != null && index >= 0)
      if (canFly && !dove) {
        dove = true
        f.focusStar(index, { hold: true, standoff: STANDOFF, run: RUN, bankScale: BANK })
        // and the sky can still refuse, if the star it was handed is not there
        flew = f.focusIndex === index
      }
      if (canFly && flew) {
        // Read, never timed. A dive's bank breathes with how far the star is, so
        // no single delay was ever going to be right; the camera knows when it
        // has landed, and this asks it every frame.
        focus = clamp(f.cam.focus, 0, 1)
      } else if (f) {
        // A sky, but no flight. The card opens by itself — on the resolve's own
        // curve rather than by appearing, because a card that snaps into
        // existence is a card nobody watched arrive.
        alone += dt
        focus = smoothstep(0, 0.7, alone)
      } else {
        // No sky yet. Give it a moment; the ambient canvas may be mounting on
        // the same frame this is.
        dark += dt
        if (dark > NO_SKY) {
          alone += dt
          focus = smoothstep(0, 0.7, alone)
        }
      }
      // The floor under a bad day, and it does more than start a clock. Past it
      // the camera has plainly not kept up, so the card stops waiting on it and
      // resolves where the layout says — easing in, and never below wherever the
      // camera had already got to, so nothing snaps and nothing goes backwards.
      //
      // Starting the BEATS on this floor while still reading the camera was a
      // real failure: on a machine slow enough to take fifteen seconds over the
      // dive, the light came up and the cards drew apart over a resolve that was
      // still at zero. The most important screen in the product played to an
      // empty frame.
      if (now > GRACE) focus = Math.max(focus, smoothstep(GRACE, GRACE + 0.6, now))
      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null
      const disc = resolveOf(focus, scr, q.centre, q.size)
      // and tell the sky how much of its star is left to draw. Your card is
      // opaque and sits exactly where the star is, so the two must cross over on
      // ONE curve — this one — or there are two of the same object on screen.
      // It stays covered afterwards, through the parting: the card IS the star,
      // and a star left burning in the gap between the two would be a third
      // thing on a screen that is about exactly two.
      if (f && f.matchCover) f.matchCover(disc.opacity)
      if (landed < 0 && focus > 0.995) landed = now

      // ── the light, and then the parting ──
      const u = landed < 0 ? -1 : now - landed
      const at = HOLD + BLOOM
      // The bloom is still rising as the two begin to move, and reaches full
      // right about where the gap opens. One swell across two beats, so there is
      // no seam between "the light came up" and "they parted" — they are the
      // same event seen twice.
      const bloom = u < 0 ? 0 : smoothstep(HOLD, at + PART * 0.5, u)
      const part = u < 0 ? 0 : easeFlight(clamp((u - at) / PART, 0, 1))

      setS({
        ...disc,
        bloom,
        part,
        named: disc.resolve > 0.55, // "it's mutual." — you learn that it happened
        // and the sentence arrives with their light, because their light IS the
        // second half of it
        told: bloom > 0.06,
        open: part >= 1,
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
      const fld = fieldRef && fieldRef.current
      if (dove && fld && fld.clearFocus) fld.clearFocus()
    }
  }, [fieldRef, index, still])

  return still ? stillFrame : s
}

// ── the pair, and the light between them ─────────────────────────────────────
// A fixed layer, because for the length of the zoom your card is wherever your
// star hangs, which is not where the column reserved room for it.
//
// Theirs is drawn FIRST, which is the whole trick: at rest it is at the same
// point as yours and a little smaller, so it is completely hidden, and the only
// evidence of it is its own light reaching past your limb. Nothing has to be
// faded in and nothing has to arrive — the parting simply stops one thing
// covering the other.
function Held({ C, s, theirs, yours, theirUrl, yourUrl, them, held, onHold, open, across, size }) {
  const S = size
  const half = S / 2
  const hueThem = tintOf(C, theirs && theirs.tone)
  const hueYou = tintOf(C, yours && yours.tone)

  // Where each card ends up, given a sign: -1 is yours, +1 is theirs. Half the
  // pitch each, in opposite directions, so the pair stays centred on the frame
  // the column reserved for it however far through the parting it is — and half
  // the offset each ACROSS that axis, which is the misalignment. Stacked, yours
  // settles a little left and theirs a little right; side by side, yours a
  // little high and theirs a little low. Same gesture, turned ninety degrees.
  //
  // Both are scaled by `part`, so the two are still exactly concentric while
  // theirs is hidden behind yours. The offset arrives as they separate rather
  // than being a place they were already sitting.
  const reach = (S * (1 - OVERLAP)) / 2
  const skew = S * SKEW
  const seat = (sign) => {
    const along = sign * reach * s.part
    const off = sign * skew * s.part
    return across ? { x: along, y: off } : { x: off, y: along }
  }

  // ── the corona ──
  // Their light: a floor that arrives with the bloom and never leaves, plus the
  // swell as the gap opens and stops holding it in. It is centred on THEIR card,
  // which is what makes it read as their light rather than as a glow the screen
  // is doing: while they are behind yours it escapes past your limb, and when
  // they come out it comes with them.
  const swell = CORONA_EDGE * Math.sin(Math.PI * s.part)
  const haloThem = clamp(s.bloom * ((1 - s.part) * CORONA_BLOOM + s.part * CORONA_REST + swell), 0, 1)
  // And yours, which only exists once there is something for it to be behind.
  // Before the parting your card is the near body in an eclipse and a near body
  // in an eclipse is dark; that is the entire image.
  const haloYou = clamp(s.bloom * s.part * CORONA_REST, 0, 1)
  const R = S * (CORONA_REACH + (CORONA_REACH_REST - CORONA_REACH) * s.part)

  // A corona is not a ring drawn on the sky. It is light from a body you cannot
  // see, so it is brightest just past the limb and falls away for a long time
  // after that — and the middle of it is filled, not hollow, which costs nothing
  // while the card is covering it and is the entire payoff at the moment the two
  // separate, when it stops being covered.
  //
  // ── why it is drawn at its widest and SCALED down ──────────────────────────
  // It used to be laid out at `R` — left, top, width and height all recomputed
  // from a number this loop changes sixty times a second. Every one of those
  // frames asked the browser to lay the element out again AND to rasterize a
  // six-stop radial gradient across six hundred pixels again, twice over (there
  // are two of these), for a picture that was the same picture at a slightly
  // different size. That is most of what made the most important screen in the
  // product the least smooth one in it.
  // Drawn once at its widest and scaled, the gradient is rasterized a single
  // time and everything after that is the compositor moving a texture around.
  const RMAX = S * CORONA_REACH
  const corona = (hue, a) =>
    a > 0.004 && (
      <span
        aria-hidden
        style={{
          position: 'absolute', left: half - RMAX / 2, top: half - RMAX / 2, width: RMAX, height: RMAX,
          borderRadius: '50%', opacity: a,
          transform: `scale(${R / RMAX})`,
          willChange: 'transform, opacity',
          background:
            `radial-gradient(circle, ${rgba(hue, 0.24)} 0%, ${rgba(hue, 0.2)} 46%, ` +
            `${rgba(hue, 0.5)} 58%, ${rgba(hue, 0.15)} 65%, ${rgba(hue, 0.035)} 74%, transparent 86%)`,
        }}
      />
    )

  // One card, at its place in the pair. `lift` is the reading aid: the one you
  // tapped comes forward and the other stands back. It is a CSS transition
  // rather than another clock in the loop, because it answers a finger and has
  // to feel like it, and because nothing else on this screen depends on it.
  //
  // The seat is a TRANSFORM, not a left/top. Both say the same thing about
  // where the card is; only one of them says it without putting the whole
  // fixed layer through layout on every frame of the parting.
  const one = ({ card, url, hue, label, at, scale, halo, mine, on }) => {
    const lift = held ? (on ? 1.1 : 0.9) : 1
    const fade = held && !on ? 0.42 : 1
    return (
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: S, height: S,
          transform: `translate3d(${s.x - half + at.x}px, ${s.y - half + at.y}px, 0)`,
          // Quantized to a third of a pixel. A blur is re-rasterized every time
          // its radius changes and nobody alive can see the difference between
          // 4.21px and 4.33px of it, so the approach spends a couple of dozen
          // rasterizations instead of one per frame.
          filter: s.blur > 0.05 ? `blur(${Math.round(s.blur * 3) / 3}px)` : 'none',
          opacity: s.opacity,
          willChange: 'transform, opacity',
          pointerEvents: open ? 'auto' : 'none',
          // Now that they lap over each other, paint order is a thing a finger
          // can change: the one you asked to read comes over the top of the
          // other rather than growing behind it.
          zIndex: on ? 2 : 1,
        }}
      >
        {/* behind the card in paint order, which is what makes it light from
            BEHIND rather than a glow painted on top */}
        {corona(hue, halo)}
        <div
          role={open ? 'button' : undefined}
          tabIndex={open ? 0 : undefined}
          aria-label={open ? (mine ? 'your card' : `@${them}’s card`) : undefined}
          onPointerUp={open ? () => onHold(on ? null : (mine ? 'yours' : 'theirs')) : undefined}
          onKeyDown={open ? (e) => ((e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onHold(on ? null : (mine ? 'yours' : 'theirs')))) : undefined}
          style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
            cursor: open ? 'pointer' : 'default',
            transform: `scale(${scale * lift})`,
            opacity: fade,
            transition: 'transform .5s cubic-bezier(.2,.7,.2,1), opacity .5s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* `glow` is quantized for the same reason the blur is: it drives four
              box-shadow radii on a four-hundred-pixel disc, and a shadow whose
              radius changes is a shadow drawn again. Eleven steps across the
              parting is smooth and is not sixty. */}
          <Card C={C} card={card} url={url} size={S} tint={hue} label={label} glow={0.4 + Math.round(s.part * 10) * 0.05} />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* theirs, drawn first: behind yours, and a little further away, so that
          until the two part there is nothing of it to see but its light — and
          once they have parted, still the far one of the two, with yours lying
          over its edge the way the photograph you set down second does */}
      {one({
        card: theirs, url: theirUrl, hue: hueThem, label: `@${them}`,
        at: seat(1), scale: 0.88 + 0.12 * s.part, halo: haloThem,
        mine: false, on: held === 'theirs',
      })}
      {one({
        card: yours, url: yourUrl, hue: hueYou, label: 'yours',
        at: seat(-1), scale: 1, halo: haloYou,
        mine: true, on: held === 'yours',
      })}
    </>
  )
}

// ── the reveal ───────────────────────────────────────────────────────────────
// `theirs` and `yours` are two cards. `index` is which of the ambient field's
// sealed stars this ping is, so the zoom flies to the real one. `onSay` is the
// exit, and it is the loudest thing on the screen from the moment the pair comes
// to rest, because celestual ends at the handoff (§1.6): there is no chat here,
// and the DM is not the product stopping short, it is the product working.
export default function Spread({ C, yours, theirs, yourUrl, theirUrl, index, fieldRef, onSay, onShare, onBack }) {
  const stageEl = React.useRef(null)
  // Measured, not computed. The pair is centred on whatever the column actually
  // left for it — which moves when the type wraps, when a font finishes loading,
  // or when a phone turns — and never on an assumption about how tall the line
  // above it came out. Both the axis and the size fall out of that same rect, so
  // there is one source of truth for the whole layout.
  const [box, setBox] = React.useState({ x: 0, y: 0, w: 0, h: 0 })
  const [held, setHeld] = React.useState(null)

  React.useEffect(() => {
    const measure = () => {
      const el = stageEl.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const next = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
      // Rounded, and only set when it MOVED. This is wired to `scroll`, which
      // on a phone fires on every frame the URL bar animates, and an unguarded
      // setState there re-rendered the whole reveal (both cards, both coronas)
      // for a rect that had not changed by a pixel.
      setBox((prev) =>
        Math.round(prev.x) === Math.round(next.x) &&
        Math.round(prev.y) === Math.round(next.y) &&
        Math.round(prev.w) === Math.round(next.w) &&
        Math.round(prev.h) === Math.round(next.h)
          ? prev
          : next,
      )
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    // The pair is drawn in a FIXED layer off a rect in viewport coordinates, so
    // a scroll moves the room without moving the things that live in it.
    window.addEventListener('scroll', measure, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && stageEl.current) ro.observe(stageEl.current)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('scroll', measure)
      if (ro) ro.disconnect()
    }
  }, [])

  const { across, size } = React.useMemo(() => pairOf(box.w && box.h ? box : { w: 320, h: 520 }), [box])
  // The pair rests on the stage's centre — but never so far toward an edge that
  // half of it is outside the glass. The stage is a flex child whose height came
  // out of whatever the type above it did, so on a short screen with a long
  // headline its centre can sit low enough that the lower card's words fall off
  // the bottom. Both reaches are known here (half the pair along its axis, half
  // its cross-section across), so the rest is arithmetic.
  const centre = React.useMemo(() => {
    const halfAlong = (size * SPAN) / 2 + MARGIN
    const halfAcross = (size * CROSS) / 2 + MARGIN
    const rx = across ? halfAlong : halfAcross
    const ry = across ? halfAcross : halfAlong
    const vw = typeof window !== 'undefined' ? window.innerWidth : 360
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640
    // When the pair genuinely cannot fit (it is already clamped to the window,
    // so this is the rounding), centring beats pinning it to one edge.
    const fit = (v, r, extent) => (r * 2 >= extent ? extent / 2 : clamp(v, r, extent - r))
    return { x: fit(box.x, rx, vw), y: fit(box.y, ry, vh) }
  }, [box.x, box.y, size, across])
  const s = useReveal(fieldRef, index, centre, size)

  const named = !!(s && s.named)
  const told = !!(s && s.told)
  const open = !!(s && s.open)
  const them = (theirs && theirs.handle) || (yours && yours.handle) || ''

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `max(32px, env(safe-area-inset-top)) clamp(14px, 4vw, 40px) max(20px, env(safe-area-inset-bottom))`,
        gap: SPACE.md,
      }}
    >
      {/* The sky recedes as the cards resolve, so the pair has something to be
          read against — the identical veil card/Resolve.jsx hangs on the
          identical variable, because it is the identical arrival. Never to
          black: the point of getting here is that the cards are IN the field,
          not in front of it. */}
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
          display: 'flex', flexDirection: 'column', gap: SPACE.sm,
        }}
      >
        {/* The headline arrives with YOUR card, at the end of the zoom: you have
            landed on the thing you placed, and this names what it turned out to
            be. */}
        <h1
          style={{
            margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
            fontSize: SIZE.title, lineHeight: 1.05, color: C.cream,
            opacity: named ? 1 : 0, transition: 'opacity .5s ease',
          }}
        >
          it’s mutual.
        </h1>
        {/* And the sentence arrives with their light, because their light is the
            second half of it. A statement, so it is set in the interface
            register rather than the metadata one: it is not a label, it is what
            happened. */}
        <p
          style={{
            margin: '0 auto', maxWidth: 320, fontSize: SIZE.small, lineHeight: 1.6, color: C.muted,
            opacity: told ? 1 : 0, transition: 'opacity .6s ease',
          }}
        >
          you entered @{them}. @{them} entered you.
        </p>
      </div>

      {/* The room the pair is given, and it is empty: they are drawn in a fixed
          layer, because for the length of the zoom your card is wherever your
          star happens to hang. What this reserves is the space they come to rest
          in — and, since both the axis and the size are solved from this rect,
          it is also the only thing that decides whether the pair sits side by
          side or one above the other. The cards follow it here in the DOM so a
          reader who is listening gets the screen in the order it means: what
          happened, then what you each said, then where to go. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', minHeight: 0 }}>
        {/* `alignSelf: stretch`, not `height: 100%`. The row above centres its
            children, and a percentage height against a parent whose own height
            came out of flex resolution measures as ZERO — which silently fed the
            layout a box with no height, so the pair fell back to its stacked
            default on every screen including the wide ones. Stretching asks for
            the cross size directly and cannot round to nothing. */}
        <div ref={stageEl} aria-hidden style={{ flex: 1, alignSelf: 'stretch', maxWidth: 900 }} />
      </div>

      {/* NOT aria-hidden, whatever it looks like. What is in here is the two
          people's actual words; a decorative layer is the one thing this is not. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {s && (
          <Held
            C={C} s={s} theirs={theirs} yours={yours} theirUrl={theirUrl} yourUrl={yourUrl}
            them={them} held={held} onHold={setHeld} open={open} across={across} size={size}
          />
        )}
      </div>

      <div
        style={{
          position: 'relative', zIndex: 3, width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: SPACE.sm,
          opacity: open ? 1 : 0, transition: 'opacity .5s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* The one instruction on the screen. Two cards at half size are two
            cards you can see and might not be able to read, so it says the
            gesture that fixes that — and stops being shown the moment it has
            been used. */}
        <div
          style={{
            fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
            textTransform: 'uppercase', textAlign: 'center', color: rgba(C.cream, 0.4),
            opacity: held ? 0 : 1, transition: 'opacity .6s ease',
          }}
        >
          tap either one to read it closer
        </div>
        <PrimaryButton C={C} onClick={onSay}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            go say it <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <Small C={C} align="center" color={C.muted}>the rest is yours.</Small>
        <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.xl, marginTop: 2 }}>
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

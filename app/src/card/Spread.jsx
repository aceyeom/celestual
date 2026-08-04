// card/Spread.jsx — the reveal.
//
// One object with two sides, and nothing on this screen arrives. The other side
// was already there.
//
// ── what this replaces, and why it kept being wrong ──────────────────────────
// Three designs have stood here. The sky drew an inspiral of two invented stars
// and the cards turned up afterwards, having done nothing. Then the pair became
// the real cards, orbiting forever — truer, and with no resting frame: two discs
// circling means nothing to read and nowhere for the eye to land. Then their
// ping came in on a collision course, struck this one, and set it spinning like
// a tossed coin.
//
// That last one failed for a reason worth writing down, because it is the reason
// this file now looks the way it does. **A coin flip is a wager.** It is chance,
// suspense, heads-or-tails — and a mutual is the precise opposite of chance:
// two people already decided, separately, weeks ago. A collision is worse. It is
// violence, and nobody here was hit. Between them they spent eleven separate
// events — impact, flash, tumble, wobble, overshoot, glint, rock — on a screen
// that is not a game and has no input to reward. VOICE.md has the sentence for
// it: *the 2am message, never the carnival.* That was the carnival.
//
// ── what it is now ───────────────────────────────────────────────────────────
// Their card did not fly in from anywhere. It has existed since the day they
// wrote it, in the dark, behind yours, the whole time you were checking and
// finding nothing. What changes at a reveal is not that something happens — it
// is that something stops being hidden. So there are three beats and one motion:
//
//   the arrival   The ordinary held dive into YOUR ping — the same `focusStar`
//                 every other zoom in the product makes, on the same curve
//                 (`resolveOf`). You land on the thing you actually placed.
//   the light     Their light rises around the limb of your card. Nothing moves.
//                 This is an ECLIPSE: the near body is dark, and all you get of
//                 the far one is the corona around its edge. It is the whole
//                 claim of the product in one image, and it needs no words —
//                 there is something on the other side of this.
//   the turn      One half turn, about the vertical axis, slow, on the camera's
//                 own easing. Not a coin: the way a hand turns a photograph over
//                 to read what is written on the back. It does not overshoot,
//                 because a hand does not.
//
// Then it rests, and their light is on the front — but yours is still behind it,
// a fainter corona that never goes away. The other side does not stop existing
// when you turn to it.
//
// Tapping turns it back, the way you would turn a photograph back.
//
// ── what carries the drama, given that almost nothing moves ──────────────────
// The light does. Every value on this screen is a lighting value: which side the
// light is on, how much of it escapes past the limb, how hard the face is
// raking. The turn is the only motion and it is 180 degrees in a second and a
// half. Everything that used to be spent on kinetics is spent on light instead,
// which is the difference between a thing happening to you and a thing you are
// being shown.
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
// Three numbers, and they are all slow. The old sequence packed its events into
// the same span; the whole redesign is that this one spends the span on three
// things instead of eleven.
//
// The zoom has no duration here on purpose: it is the camera's, it breathes with
// how far your star happens to be, and this file asks `cam.focus` what it is
// rather than guessing how long it took.
const HOLD = 0.7 //   your card, alone, before the dark gives anything up
const BLOOM = 1.5 //  their light coming up around the limb
const TURN = 1.5 //   the half turn
// A turn you asked for is an answer to a touch and must not feel sluggish; the
// first one is the reveal and is allowed to take its time. Same gesture, and the
// only thing that differs is that one of them is a reply.
const TAP_TURN = 1.05

// How long the wall will wait for a camera that is not keeping up before it
// starts the reveal anyway. The sky advances its own time per frame and clamps
// dt for stability, so a device drawing at eight frames a second flies the same
// dive at a fraction of wall speed — and this has to outlast that, because light
// coming up around a card that is still resolving comes up around nothing. On
// any device that can keep up the camera is home in about three seconds and this
// never comes up. It is the floor under a bad day, not a schedule.
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
// edge-on covers nothing, so at full dive the turn opens a hole onto a
// two-hundred-pixel photosphere with a scatter of out-of-focus field stars
// around it. Stopping short leaves the field a field.
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
// The residue. Once you have turned to them, yours is the light behind, and it
// stays there, quieter, forever. The other side does not stop existing.
const CORONA_REST = 0.34
// And the swell as the disc comes side-on, because a disc seen side-on is not
// blocking anything. It is the brightest instant on the screen and it costs
// nothing to arrange — the same number, read at a different angle.
const CORONA_EDGE = 0.45
// How far past the limb it reaches, in card diameters. A corona HUGS the body:
// it is brightest within a fraction of a radius of the limb and gone not long
// after. Given the whole screen to spread across it stops being light coming
// from behind something and becomes a colour wash with a card in it, which is
// the same mistake the old impact flash made — every pixel lifted at once is
// not brightness, it is a lower contrast ratio.
const CORONA_REACH = 1.7

// ── the turn ─────────────────────────────────────────────────────────────────
// About the VERTICAL axis. End-over-end is the coin; turning something over in
// your hands is this, and the axis is most of the difference between the two.
//
// On `easeFlight`, which is sky/camera.js's own flight curve — Perlin's
// smootherstep, flat-launched and flat-landed, spending the travel across the
// whole move instead of hoarding it into one mid-course whoosh. The card turns
// on exactly the curve the camera flies on. There is no overshoot and no spring
// anywhere in this file: a hand setting a photograph down does not bounce.
const TIP = 5 // deg. A single hump on the other axis, peaking side-on and back
//               to nothing — the small tilt anything picked up and turned over
//               takes. Not a wobble: it does not oscillate, and it is exactly
//               zero at both ends, so the card always comes to rest square.

// Which face is up, in degrees. 180 shows yours, 360 shows theirs — the disc
// starts on yours because that is what the dive resolved into.
const YOURS = 180
const THEIRS = 360

// ── the stage ────────────────────────────────────────────────────────────────
// One disc, so it gets the size a card is meant to be read at — the same
// `fullSize()` every other resolve in the product lands on — minus whatever the
// line above and the buttons below actually need. Measured off the tightest
// phone still worth supporting; on anything phone-shaped `fullSize()` wins and
// this never binds.
const CHROME = 344
function sizeOf() {
  const vh = typeof window === 'undefined' ? 780 : window.innerHeight
  return Math.round(Math.max(TYPE_FLOOR + 6, Math.min(fullSize(), (vh - CHROME) * 0.98)))
}

// ── the choreography ─────────────────────────────────────────────────────────
// One rAF loop, and almost all of what it publishes is light. It samples the
// camera for the zoom, runs one clock for the bloom, and evaluates the turn as a
// pure function of when that turn started — there is no integrator here, no
// state to drift, and nothing to settle.
function useReveal(fieldRef, index, centre, size) {
  const still = reduced()
  const [s, setS] = React.useState(null)
  // Reduced motion has no loop to publish from, so its one gesture goes through
  // state instead: `hand` counts the turns taken by a finger.
  const [hand, setHand] = React.useState(0)
  const st = React.useRef(null)
  // `rot` is where the disc rests; `turn` is the one that is running, if one is.
  // Reduced motion never travels between the faces, so it starts on the one the
  // turn would have landed on.
  if (!st.current) {
    st.current = { rot: still ? THEIRS : YOURS, turn: null, dir: -1, tap: 0, open: still }
  }
  // The geometry changes under the loop when a phone turns. Read through a ref
  // so a resize re-frames the reveal without restarting it.
  const geo = React.useRef({ centre, size })
  geo.current = { centre, size }

  // The one gesture the frame accepts, and it is the same motion the reveal
  // makes — a turn back the way it came, because that is what a hand does with
  // something it has turned over.
  const turn = React.useCallback(() => {
    const g = st.current
    if (!g.open || g.turn) return
    g.tap++
    if (still) {
      // The preference is about vestibular safety. The object simply presents
      // its other side: the same information, none of the motion.
      g.rot = g.rot === THEIRS ? YOURS : THEIRS
      setHand((n) => n + 1)
      return
    }
    g.dir = -g.dir
    g.turn = { from: g.rot, to: g.rot + g.dir * 180, at: -1, dur: TAP_TURN }
  }, [still])

  // ── reduced motion ──
  // Their card, resolved, square on, with the light already settled where it
  // ends up. Built where it is read rather than pushed from a loop, because a
  // rAF that recomputes a still frame sixty times a second is the same cost as
  // the animation it is standing in for.
  const stillFrame = React.useMemo(() => {
    if (!still) return null
    void hand
    return {
      ...resolveOf(1, null, centre, size),
      rot: st.current.rot, tip: 0, bloom: 1, turned: 1,
      named: true, told: true, open: true, tap: st.current.tap,
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
        f.focusStar(index, { hold: true, standoff: STANDOFF })
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
      // dive, the light came up and the disc turned over a card whose resolve
      // was still at zero. The most important screen in the product played to an
      // empty frame.
      if (now > GRACE) focus = Math.max(focus, smoothstep(GRACE, GRACE + 0.9, now))
      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null
      const disc = resolveOf(focus, scr, q.centre, q.size)
      // and tell the sky how much of its star is left to draw. The card is
      // opaque and sits exactly where the star is, so the two must cross over on
      // ONE curve — this one — or the turn opens a hole onto a photosphere.
      if (f && f.matchCover) f.matchCover(disc.opacity)
      if (landed < 0 && focus > 0.995) landed = now

      // ── the light, and then the turn ──
      const u = landed < 0 ? -1 : now - landed
      const at = HOLD + BLOOM
      // The bloom is still rising as the disc starts to move, and reaches full
      // right about where the disc goes side-on. One swell across two beats, so
      // there is no seam between "the light came up" and "it turned" — they are
      // the same event seen twice.
      const bloom = u < 0 ? 0 : smoothstep(HOLD, at + TURN * 0.5, u)
      if (u >= at && !g.turn && g.rot === YOURS && !g.open) {
        g.turn = { from: YOURS, to: THEIRS, at: now, dur: TURN }
      }
      // A tap sets its turn without a start time, because `turn()` runs outside
      // this loop and the loop is the only thing that knows what time it is.
      if (g.turn && g.turn.at < 0) g.turn.at = now

      let rot = g.rot
      let tip = 0
      // How far through the reveal's own turn the screen is, which is what tells
      // the light when to stop being an event and start being a residue. It is
      // the FIRST turn only: a tap afterwards is you looking again, not the
      // reveal happening a second time, so it stays at 1 from then on.
      let turned = g.open ? 1 : 0
      if (g.turn) {
        const p = clamp((now - g.turn.at) / g.turn.dur, 0, 1)
        const e = easeFlight(p)
        rot = g.turn.from + (g.turn.to - g.turn.from) * e
        tip = TIP * Math.sin(Math.PI * p) * (g.turn.to > g.turn.from ? 1 : -1)
        if (!g.open) turned = e
        if (p >= 1) {
          g.rot = g.turn.to
          g.turn = null
          g.open = true
          rot = g.rot
          tip = 0
          turned = 1
        }
      }

      setS({
        ...disc,
        rot,
        tip,
        bloom,
        turned,
        named: disc.resolve > 0.55, // "it's mutual." — you learn that it happened
        // and the sentence arrives with their light, because their light IS the
        // second half of it
        told: bloom > 0.06,
        open: g.open,
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
      const fld = fieldRef && fieldRef.current
      if (dove && fld && fld.clearFocus) fld.clearFocus()
    }
  }, [fieldRef, index, still])

  return [still ? stillFrame : s, turn]
}

// ── the disc, and the light behind it ────────────────────────────────────────
// A fixed layer, because for the length of the zoom the card is wherever your
// star hangs, which is not where the column reserved room for it.
//
// The two faces are one object: `preserve-3d`, and a back face turned 180°. What
// keeps that from reading as a widget is that none of it is a rotation with
// decoration on top — the shading, the foreshortening the perspective does for
// free, and above all the corona are all functions of ONE angle, so the light
// tells you where the disc is without the disc having to move quickly.
function Held({ C, s, theirs, yours, theirUrl, yourUrl, them, onTurn, open }) {
  const S = s.size
  const half = S / 2
  const hueThem = tintOf(C, theirs && theirs.tone)
  const hueYou = tintOf(C, yours && yours.tone)
  // Everything about the light comes off this one cosine, the way it does on any
  // real surface.
  const c = Math.cos((s.rot * Math.PI) / 180)
  const facing = Math.abs(c)
  const front = c >= 0

  // ── the corona ──
  // How much of the far side's light escapes past the limb: a floor that arrives
  // with the bloom and never leaves, plus everything the disc stops blocking as
  // it comes side-on.
  const halo = clamp(
    s.bloom * ((1 - s.turned) * CORONA_BLOOM + s.turned * CORONA_REST + CORONA_EDGE * (1 - facing)),
    0, 1,
  )
  // Whose light it is. Theirs while you are looking at yours, yours once you
  // have turned to theirs — and the handover happens on the SECOND half of the
  // turn, and LATE in it. Anywhere near side-on the colour change lands on the
  // brightest frame of the screen, and a half-and-half of amber and rose at full
  // intensity is orange: the most important instant in the product came out the
  // colour of a streetlight. Theirs now holds pure all the way through the peak
  // and gives way only in the last quarter of the turn, where their face has
  // taken the frame and the light has already fallen back to its resting level —
  // so the two are never both loud at once. It is the true order of events too:
  // the light stops being behind the disc when the disc it is behind becomes the
  // one you are looking at.
  const w = smoothstep(0.92, 0.5, c)
  const R = S * CORONA_REACH

  // A corona is not a ring drawn on the sky. It is light from a body you cannot
  // see, so it is brightest just past the limb and falls away for a long time
  // after that — and the middle of it is filled, not hollow, which costs nothing
  // while the disc is covering it and is the entire payoff at side-on, when the
  // disc stops.
  const corona = (hue, a, key) =>
    a > 0.004 && (
      <span
        key={key}
        aria-hidden
        style={{
          position: 'absolute', left: half - R / 2, top: half - R / 2, width: R, height: R,
          borderRadius: '50%', opacity: a,
          background:
            `radial-gradient(circle, ${rgba(hue, 0.24)} 0%, ${rgba(hue, 0.2)} 46%, ` +
            `${rgba(hue, 0.5)} 58%, ${rgba(hue, 0.15)} 65%, ${rgba(hue, 0.035)} 74%, transparent 86%)`,
        }}
      />
    )

  const face = (card, url, tint, label, back) => (
    <span
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'none',
      }}
    >
      <Card C={C} card={card} url={url} size={S} tint={tint} label={label} glow={0.35 + facing * 0.55} />
      {/* A surface turned away from the light is darker, and a printed disc
          turning through side-on passes all the way through that. Without it the
          turn is a picture being rotated; with it, it is an object. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: rgba(C.ink, 0.6 * (1 - facing)),
        }}
      />
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
      {/* Behind the disc in paint order, which is the whole trick: while the
          card is facing you, all that shows of this is the part outside its
          limb. */}
      {corona(hueThem, halo * w, 'them')}
      {corona(hueYou, halo * (1 - w), 'you')}

      <div
        role={open ? 'button' : undefined}
        tabIndex={open ? 0 : undefined}
        aria-label={open ? 'turn the card over' : undefined}
        onPointerUp={open ? onTurn : undefined}
        onKeyDown={open ? (e) => ((e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTurn())) : undefined}
        style={{
          position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
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
            transform: `rotateY(${s.rot}deg) rotateX(${s.tip}deg)`,
          }}
        >
          {face(theirs, theirUrl, hueThem, `@${them}`, false)}
          {face(yours, yourUrl, hueYou, 'yours', true)}
        </div>
      </div>
    </div>
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

  // The zoom lives inside this: it is the same held `focusStar` the status
  // page's "see it in the sky" makes, and it is asked for from the loop, on the
  // frame the sky exists to ask.
  const [s, turn] = useReveal(fieldRef, index, centre, size)

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
    // a scroll moves the room without moving the thing that lives in it.
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
        {/* And the sentence arrives with their light, because their light is the
            second half of it. A statement, so it is set in the interface
            register rather than the metadata one: it is not a label, it is what
            happened. */}
        <p
          style={{
            margin: '0 auto', maxWidth: 320, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted,
            opacity: told ? 1 : 0, transition: 'opacity 1.1s ease',
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
          people's actual words; a decorative layer is the one thing this is not. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {s && (
          <Held
            C={C} s={s} theirs={theirs} yours={yours} theirUrl={theirUrl} yourUrl={yourUrl}
            them={them} onTurn={turn} open={open}
          />
        )}
      </div>

      <div
        style={{
          position: 'relative', zIndex: 3, width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
          opacity: open ? 1 : 0, transition: 'opacity 1s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* The one instruction on the screen, and it is needed: an object with a
            second side is worth nothing if nobody knows it has one. It says the
            gesture rather than the outcome, and it stops being shown the moment
            it has been used. */}
        <div
          style={{
            fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
            textTransform: 'uppercase', textAlign: 'center', color: rgba(C.cream, 0.4),
            opacity: s && s.tap ? 0 : 1, transition: 'opacity .6s ease',
          }}
        >
          turn it over
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

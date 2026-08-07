// beta/Reveal.jsx — the mutual.
//
// ── what this replaces, and why it was wrong ─────────────────────────────────
// This screen used to be ONE object with two faces: your seal, turning over on
// the vertical axis to show theirs on the back. It was quiet, it was a real
// gesture — the way a hand turns something over to read what is on the other
// side — and it had a structural fault that no amount of tuning could reach.
//
//   A TWO-SIDED OBJECT CAN ONLY EVER SHOW YOU ONE SIDE.
//
// At the end of the most important screen in the product, half of what the
// screen is about was facing away. Two people wrote to each other, weeks apart,
// without knowing; the design then made you pick which one of them to be looking
// at, and turned "what did I write" and "what did they write" into two separate
// acts of memory instead of one image you can hold at once. It also meant the
// screen had a hidden state, which meant it needed a caption telling you it had
// one, which is the tell that the object was not doing its job.
//
// ── what it is now ───────────────────────────────────────────────────────────
// The pair. Both seals, at rest, in one frame, both readable without touching
// anything.
//
// Theirs did not fly in from anywhere. It has existed since the day they wrote
// it, in the dark, DIRECTLY BEHIND yours, the whole time you were checking and
// finding nothing. That is the staging, not a metaphor: theirs is drawn at the
// same point, a little smaller, completely hidden — so the only evidence of it
// is the light escaping past your limb. Then the two part.
//
//   THE ARRIVAL  The ordinary held dive into YOUR ping — the same `focusStar`
//                every other zoom makes, on the same curve (`resolveOf`). You
//                land on the thing you actually placed.
//   THE LIGHT    Their light rises around the limb of your seal. Nothing moves.
//                This is an ECLIPSE: the near body is dark and all you get of
//                the far one is the corona around its edge. It is the claim of
//                the product in one image and it needs no words.
//   THE PARTING  The two draw apart, on the camera's own easing. Yours goes up
//                and a little left; theirs comes out below it and a little
//                right. Not a reveal-by-motion — the FRAME re-composing itself
//                to hold two things where it had been holding one.
//   THE PAIR     Both at rest, lapping over each other, each keeping a quiet
//                halo of its own light. Neither one is the front.
//
// ── why they are stacked on a diagonal rather than set in a row ──────────────
// Two photographs put down on a table do not line up. The second lands a little
// short of the first and a little to one side, and the near one covers a sliver
// of the far one — and that small failure of alignment is most of what separates
// "two things somebody set down" from "two things a layout placed".
//
// It is also the arrangement that survives a phone. A row needs two diameters of
// WIDTH, which a phone does not have, so a row on a phone has to become a column
// on a phone, and then the same screen is two compositions and neither one is
// designed. The fall is one composition: it needs about one and a third
// diameters across and one and four fifths down, which is the shape of every
// screen this will ever open on. The pair sits the same way on a laptop and in a
// hand, and only the diameter changes.
//
// Everything is read off `cam.focus` on the frame it is true. Nothing here is
// scheduled against a guess at how long a dive takes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveOf, fullSize } from '../card/zoom.js'
import { easeFlight } from '../sky/camera.js'
import { C, FONT, S, rgba, sealLight, groundOf } from './tokens.js'
import { Seal } from './ui.jsx'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

// production's timings, unchanged (card/Spread.jsx)
const HOLD = 0.7 //  your seal, alone, before the dark gives anything up
const BLOOM = 1.5 // their light coming up around the limb
const PART = 1.5 //  the two drawing apart
const GRACE = 9 //   the floor under a machine that cannot keep up
const NO_SKY = 1.2
const STANDOFF = 0.52

// ── how the pair sits ────────────────────────────────────────────────────────
// Each seal travels this far from the shared centre, as a fraction of its own
// diameter, in opposite directions — so the pair stays centred on the room the
// page reserved for it however far through the parting it is.
//
// It is a little under half a diameter each, which puts the two centres about
// nine tenths of a diameter apart and laps them over each other by about a
// tenth. That is the whole budget: the overlap has to stay outside the seal's
// own type margin, because nothing either person wrote may ever sit behind the
// other card. This number never changes — only the ANGLE does.
const REACH = 0.45

// And the angle the fall is on, measured off vertical. At the near end it is a
// card set down below another and a little to the side, which is the whole
// composition; the far end is the same fall leaned over until it will fit a
// window that is wide and short — a phone turned sideways, and nothing else.
//
// It is one composition either way. The alternative, which production takes, is
// to swap to a side-by-side row below some breakpoint, and that gives you a
// screen that is two different designs depending on which way somebody happens
// to be holding a phone. Leaning the same fall keeps it one.
const LEAN_MIN = (22 * Math.PI) / 180
const LEAN_MAX = (52 * Math.PI) / 180

const spanOf = (lean) => ({
  x: 1 + 2 * REACH * Math.sin(lean),
  y: 1 + 2 * REACH * Math.cos(lean),
})

// The diameter below which a seal stops printing its own legend (ui.jsx, Seal),
// plus a little. The pair is never solved under it: two cards you can see and
// cannot read are worse than one you can.
const FLOOR = 126

// ── the light ────────────────────────────────────────────────────────────────
// What escapes past the limb, at the three moments it means different things.
const CORONA_BLOOM = 0.6 // the eclipse. Loud: for a second and a half it is the
//                          only thing happening on the screen.
const CORONA_REST = 0.14 // the residue. Neither light stops existing.
const CORONA_EDGE = 0.28 // the swell as the gap opens, because the instant one
//                          body clears another is when the most light gets past.
const CORONA_REACH = 1.5 //      how far past the limb it carries, in diameters
const CORONA_REACH_REST = 1.12 // …and it pulls in as they settle, because there are
//                          two of them at rest and two at full reach is not
//                          light around a body, it is a wash with cards in it.

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The room is not filled to its own edges. A pair solved against the exact rect
// comes out touching the headline above it and the button under it on every
// screen that happens to be tight, which reads as a layout that only just fit
// rather than as two things set down with room around them — and the seal is a
// physical object, so the air round it is part of the object.
const AIR = 0.94

// The largest pair that fits the room the page actually left, and the angle that
// makes it largest. Swept rather than solved: the closed form is a transcendental
// in one variable, this runs thirteen multiplications once per resize, and the
// answer is the same to a degree either way.
//
// Never under the floor, even if that means the fall overruns — which it only
// can on a window shorter than a phone in landscape, and a seal too small to
// read is the worse failure.
function pairOf(box) {
  const w = (box.w || 320) * AIR
  const h = (box.h || 520) * AIR
  const cap = fullSize()
  let best = { lean: LEAN_MIN, size: 0 }
  for (let i = 0; i <= 12; i++) {
    const lean = LEAN_MIN + ((LEAN_MAX - LEAN_MIN) * i) / 12
    const sp = spanOf(lean)
    const size = Math.min(cap, w / sp.x, h / sp.y)
    if (size > best.size) best = { lean, size }
  }
  return { lean: best.lean, size: Math.max(FLOOR, Math.round(best.size)) }
}

function useReveal(fieldRef, index, centre, size) {
  const still = reduced()
  const [s, setS] = useState(null)
  // The geometry changes under the loop when a phone turns. Read through a ref
  // so a resize re-frames the reveal without restarting it.
  const geo = useRef({ centre, size })
  geo.current = { centre, size }

  // Reduced motion: both seals, resolved, already apart, with the light settled
  // where it ends up. Built where it is read rather than pushed from a loop.
  const stillFrame = useMemo(() => {
    if (!still) return null
    return { ...resolveOf(1, null, centre, size), part: 1, bloom: 1, named: true, open: true }
  }, [still, centre, size])

  useEffect(() => {
    if (still) return undefined
    let raf = 0
    let live = true
    const t0 = performance.now()
    let prev = 0
    let landed = -1 // wall seconds at which the camera finished the zoom
    let dove = false
    let flew = false
    let dark = 0
    let alone = 0

    const tick = () => {
      if (!live) return
      const now = (performance.now() - t0) / 1000
      const dt = clamp(now - prev, 0, 0.05)
      prev = now
      const f = fieldRef && fieldRef.current
      const q = geo.current

      let focus = 0
      const canFly = !!(f && f.cam && f.focusStar && index != null && index >= 0)
      if (canFly && !dove) {
        dove = true
        f.focusStar(index, { hold: true, standoff: STANDOFF })
        flew = f.focusIndex === index
      }
      if (canFly && flew) {
        focus = clamp(f.cam.focus, 0, 1)
      } else if (f) {
        alone += dt
        focus = smoothstep(0, 0.7, alone)
      } else {
        dark += dt
        if (dark > NO_SKY) {
          alone += dt
          focus = smoothstep(0, 0.7, alone)
        }
      }
      if (now > GRACE) focus = Math.max(focus, smoothstep(GRACE, GRACE + 0.9, now))

      const scr = (index != null && index >= 0 && f && f.sealedScreen && f.sealedScreen[index]) || null
      const disc = resolveOf(focus, scr, q.centre, q.size)
      // tell the sky how much of its star is left to draw: your seal is opaque
      // and sits exactly where the star is, so the two cross over on ONE curve.
      // It stays covered through the parting — the seal IS the star, and a star
      // left burning in the gap would be a third thing on a screen about two.
      if (f && f.matchCover) f.matchCover(disc.opacity)
      if (landed < 0 && focus > 0.995) landed = now

      // The bloom is still rising as the two begin to move and reaches full
      // right about where the gap opens: one swell across two beats, so there is
      // no seam between "the light came up" and "they parted".
      const u = landed < 0 ? -1 : now - landed
      const at = HOLD + BLOOM
      const bloom = u < 0 ? 0 : smoothstep(HOLD, at + PART * 0.5, u)
      const part = u < 0 ? 0 : easeFlight(clamp((u - at) / PART, 0, 1))

      setS({ ...disc, bloom, part, named: disc.resolve > 0.55, open: part >= 1 })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(raf)
    }
  }, [fieldRef, index, still])

  return still ? stillFrame : s
}

// ── the pair, and the light between them ─────────────────────────────────────
// A fixed layer, because for the length of the zoom your seal is wherever your
// star hangs, which is not where the column reserved room for it.
//
// Theirs is drawn FIRST, which is the whole trick: at rest it is at the same
// point as yours and a little smaller, so it is completely hidden, and the only
// evidence of it is its own light reaching past your limb. Nothing has to be
// faded in and nothing has to arrive — the parting simply stops one thing
// covering the other.
function Held({ s, yours, theirs, full, lean }) {
  const D = s.size
  const half = D / 2
  const hueThem = sealLight(groundOf(theirs && theirs.ground).tone)
  const hueYou = sealLight(groundOf(yours && yours.ground).tone)

  // Where each ends up, given a sign: -1 is yours, and yours goes up and left.
  // The same reach each, in opposite directions, and both scaled by `part`, so
  // the two are exactly concentric for as long as theirs is hidden — the offset
  // ARRIVES as they separate rather than being a place they were already sitting.
  const dx = full * REACH * Math.sin(lean)
  const dy = full * REACH * Math.cos(lean)
  const seat = (sign) => ({ x: sign * dx * s.part, y: sign * dy * s.part })

  // Their light: a floor that arrives with the bloom and never leaves, plus the
  // swell as the gap opens and stops holding it in. It is centred on THEIR seal,
  // which is what makes it read as their light rather than as something the
  // screen is doing.
  const swell = CORONA_EDGE * Math.sin(Math.PI * s.part)
  const haloThem = clamp(s.bloom * ((1 - s.part) * CORONA_BLOOM + s.part * CORONA_REST + swell), 0, 1)
  // And yours, which only exists once there is something for it to be behind: up
  // to that point your seal is the near body in an eclipse, and a near body in an
  // eclipse is dark. That is the entire image.
  const haloYou = clamp(s.bloom * s.part * CORONA_REST, 0, 1)
  const R = D * (CORONA_REACH + (CORONA_REACH_REST - CORONA_REACH) * s.part)

  // A corona is not a ring drawn on the sky. It is light from a body you cannot
  // see: brightest just past the limb, falling away for a long time after, and
  // FILLED rather than hollow — which costs nothing while the seal covers it and
  // is the entire payoff at the moment the two separate.
  const corona = (hue, a) =>
    a > 0.004 && (
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: half - R / 2,
          top: half - R / 2,
          width: R,
          height: R,
          borderRadius: '50%',
          opacity: a,
          background:
            `radial-gradient(circle, ${rgba(hue, 0.2)} 0%, ${rgba(hue, 0.17)} 46%, ` +
            `${rgba(hue, 0.44)} 58%, ${rgba(hue, 0.13)} 65%, ${rgba(hue, 0.03)} 74%, transparent 86%)`,
        }}
      />
    )

  const one = (card, at, scale, hue, halo, z) => (
    <div
      style={{
        position: 'absolute',
        left: s.x - half + at.x,
        top: s.y - half + at.y,
        width: D,
        height: D,
        filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',
        opacity: s.opacity,
        zIndex: z,
      }}
    >
      {/* behind the seal in paint order, which is what makes it light from
          BEHIND rather than a glow painted on top */}
      {corona(hue, halo)}
      <div style={{ position: 'relative', width: '100%', height: '100%', transform: `scale(${scale})` }}>
        <Seal card={card} size={D} />
      </div>
    </div>
  )

  return (
    <>
      {/* theirs, drawn first: behind yours and a little further away, so until
          the two part there is nothing of it to see but its light — and once
          they have parted, still the far one, with yours lying over its edge the
          way the photograph you set down second does */}
      {one(theirs, seat(1), 0.88 + 0.12 * s.part, hueThem, haloThem, 1)}
      {one(yours, seat(-1), 1, hueYou, haloYou, 2)}
    </>
  )
}

export function Reveal({ yours, theirs, index, fieldRef, children }) {
  const stage = useRef(null)
  // Measured, not computed. The pair is centred on whatever the page actually
  // left for it — which moves when the type wraps, when a font finishes loading,
  // or when a phone turns — and both the centre and the diameter fall out of
  // that same rect, so there is one source of truth for the whole layout.
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const { lean, size } = useMemo(() => pairOf(box), [box])
  const centre = useMemo(() => ({ x: box.x, y: box.y }), [box.x, box.y])
  const s = useReveal(fieldRef, index, centre, size)

  useEffect(() => {
    const measure = () => {
      const el = stage.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setBox({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    // The pair is drawn in a FIXED layer off a rect in viewport coordinates, so
    // a scroll moves the room without moving the things that live in it.
    window.addEventListener('scroll', measure, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && stage.current) ro.observe(stage.current)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('scroll', measure)
      if (ro) ro.disconnect()
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // The head clears the masthead and nothing more. It is written against
        // the window's HEIGHT rather than as a flat number because on a short
        // window that clearance is the difference between a pair with room round
        // it and a pair sitting on the headline — ninety-odd pixels of margin is
        // a quarter of a phone held sideways.
        padding: `max(58px, min(92px, 12dvh), env(safe-area-inset-top)) ${S.lg}px max(${S.lg}px, env(safe-area-inset-bottom))`,
        gap: S.md,
      }}
    >
      {/* the field recedes as the seals resolve, and never to black */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: `radial-gradient(118% 72% at 50% 48%, ${rgba(C.void, 0.6)} 0%, ${rgba(C.void, 0.52)} 56%, ${rgba(C.void, 0.84)} 100%)`,
          opacity: s ? s.opacity * 0.9 : 0,
        }}
      />

      <h1
        style={{
          margin: 0,
          fontFamily: FONT.serif,
          fontStyle: 'italic',
          fontWeight: 300,
          // measured against BOTH axes: a headline set off viewport width alone
          // comes out at its largest on the one window that has the least room
          // under it — a phone on its side — and puts the pair through it
          fontSize: 'clamp(26px, min(7.4vw, 8.4vh), 50px)',
          lineHeight: 1,
          color: C.ivory,
          opacity: s && s.named ? 1 : 0,
          transition: 'opacity .9s ease',
        }}
      >
        it is mutual.
      </h1>

      {/* The room the pair comes to rest in. It is empty on purpose — the seals
          are drawn in a fixed layer, because for the length of the zoom they are
          wherever your star happens to hang — and it is the only thing that
          decides how large they come out.

          `alignSelf: stretch`, not `height: 100%`. The column above centres its
          children, and a percentage height against a parent whose own height came
          out of flex resolution measures as ZERO, which would silently feed the
          layout a box with no height and floor the pair on every screen. */}
      <div style={{ flex: 1, display: 'flex', width: '100%', justifyContent: 'center', minHeight: 0 }}>
        <div ref={stage} aria-hidden style={{ flex: 1, alignSelf: 'stretch', maxWidth: 760 }} />
      </div>

      {/* NOT aria-hidden, whatever it looks like. What is in here is the two
          people's actual words; a decorative layer is the one thing this is not. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
        {s && <Held s={s} yours={yours} theirs={theirs} full={size} lean={lean} />}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          opacity: s && s.open ? 1 : 0,
          transition: 'opacity 1s ease',
          pointerEvents: s && s.open ? 'auto' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

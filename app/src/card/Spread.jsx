// card/Spread.jsx — the fused spread.
//
// The most important frame in the product, and the one the plan spends its
// strictest sentence on: "both cards unseal in the same instant" (§3). Not one
// then the other, not yours-first-so-you-can-brace: the same instant, because
// the entire ethical architecture is that neither of you moved second.
//
// ── what this replaces ───────────────────────────────────────────────────────
// The sky used to draw the whole reveal — two hero stars inspiralling out in
// the disk, a tidal bridge, a merger flash, a settled binary — and then, when
// it was over, the two cards appeared over the top of it, scaled up out of
// nothing, and sat still. Two things were wrong with that and they were the
// same thing twice. The pair you watched fall together were abstractions OF the
// pings rather than the pings; and the pings themselves arrived after the
// event, as a result, having done nothing. A reveal in which the two objects it
// is about are the two objects that never move is not a reveal.
//
// So the pair moved here, and they are the actual cards:
//
//   0.0 → 2.8s   THE FALL. Two pings — the real ones, each carrying its own
//                ground — come in from off-frame and fall toward a barycenter
//                neither of them is at. Separation decays under something that
//                accelerates the way gravity does, and the angular speed rises
//                as they close because Kepler's third law says it must: a
//                near-radial glide that winds itself into a whirl on its own,
//                without a keyframe anywhere in it.
//   2.8 → 3.3s   THE TOUCH. The tightest pass, at the top of the whirl. The sky
//                flashes on the same frame (galaxy.js reads the same clock) and
//                sends its light echo out through the gas.
//   3.3 → 5.2s   THE ZOOM. The camera comes in. Nothing about the orbit changes
//                — the pair is a settled binary now and stays one — but the
//                whole scene magnifies, the discs cross card/model.js's
//                TYPE_FLOOR on the way, and the words simply arrive, because a
//                poster is what a ping looks like from close enough.
//   5.2s →       THE BINARY. It never stops. The two keep circling, slowly, one
//                passing in front of the other and back again.
//
// Both cards are on the same orbit at opposite phases, so they are the same
// size, at the same distance, moving at the same speed, forever. There is no
// arrangement of this frame in which one of them is the subject.
//
// ── time ─────────────────────────────────────────────────────────────────────
// Off the ENGINE's clock, not the wall's, and the difference is not academic.
// The sky advances its own time per frame and clamps dt at 50 ms for stability,
// so a device drawing at ten frames a second plays the match at a fraction of
// wall speed. A setTimeout for 4.95 s — which is what this once was — opened
// both cards while the two were still falling toward each other, and the flash
// then went off over the top of an already-revealed spread, washing it white.
// It looked exactly as wrong as it was. The engine knows what time it is in the
// match it is playing; this asks it, every frame, and falls back to the wall
// only when there is no engine at all (canvas-2D, a lost context) — because a
// reveal that never arrives is far worse than one that arrives on a guess.
//
// ── what it deliberately does NOT add ────────────────────────────────────────
// A share button that carries their words. The share sheet renders YOUR card
// and the mutual mark, and can never include theirs (§4, content & safety).
// Their words were written to one person.
import * as React from 'react'
import {
  rgba, SPACE, FONT, SIZE, PrimaryButton, GhostButton, Small, Icon,
} from '../components/ui.jsx'
import Card from './Disc.jsx'
import { TYPE_FLOOR } from './model.js'
import { MATCH } from '../galaxy.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── the clock ────────────────────────────────────────────────────────────────
// The fall and the touch belong to the sky as much as to this file, so they
// live in galaxy.js and are imported rather than copied. The zoom is this
// file's alone: the sky is already where it is going by then.
const T_TOUCH = MATCH.approach
const T_ZOOM0 = T_TOUCH + MATCH.flash * 0.34 // the camera starts moving inside the flash
const T_ZOOM = 1.9
const T_REST = T_TOUCH + MATCH.flash + T_ZOOM
const GRACE = 5 // how far the sky's clock may fall behind the wall's before the
//                wall starts pulling it along — see `tick`

// ── the orbit ────────────────────────────────────────────────────────────────
// Everything here is in CARD DIAMETERS, not pixels. The orbit is one shape and
// the zoom is one multiplier over it, which is what makes a 320px phone and a
// desktop show the same event rather than two differently-tuned animations.
const SEP_TOUCH = 0.92 //  the grazing pass — closer than their own width
const SEP_REST = 1.22 //   the settled binary, wide enough that the two never eat
//                         each other's words at the tightest point of the tip
const FALL = 0.72 //       the fall's exponent — see `sepAt`
const ENTRY = 1.15 //      how far off-frame they start, in screens
const TIP_FALL = 0.86 //   rad — steeply tipped while falling, so it reads as 3D
const TIP_REST = 0.5 //    rad — flatter once settled, so both faces stay square on
const Z_PING = 0.24 //     the camera's standoff while they are still points of light
const OMEGA_TOUCH = 11 //  rad/s at the tightest pass. The whirl.
const LAPSE_REST = 0.031 // where the time-lapse ends up — see `rate`
const WAKE = 5 //          ghosts per body, while they are fast enough to leave one
const GHOST = 0.032 //     seconds of path between one ghost and the next

// ── the stage ────────────────────────────────────────────────────────────────
// How big a card can be, given that TWO of them have to orbit inside whatever
// the line above and the buttons below leave behind. A shared circular orbit
// whose bodies never overlap costs, at minimum, twice a diameter across the
// short axis — that is geometry, not a choice — so the card size falls out of
// the viewport rather than being picked and then hoped for.
//
// The orbit's long axis follows the room: upright on a phone, across on a
// laptop. Same orbit, turned to fit, plus a few degrees of tilt so it never
// reads as two dots sliding up and down a line.
const CHROME = 318 // the headline block, the buttons, and the padding around them
const TILT = 0.15
const LONG = SEP_REST + 1.02 //           the pair's own box, in diameters, with a
const SHORT = SEP_REST * 0.855 + 1.04 //  little over for the tilt and the tip's breath

function stageOf() {
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth
  const vh = typeof window === 'undefined' ? 780 : window.innerHeight
  const w = Math.max(220, vw - 28)
  const h = Math.max(200, vh - CHROME)
  const upright = h >= w
  const long = upright ? h : w
  const short = upright ? w : h
  // Never below the floor. A card that resolves and still sets no type is a
  // reveal that reveals nothing (card/model.js TYPE_FLOOR), so on a screen too
  // small to hold the whole orbit the orbit is the thing that gives — the pair
  // simply comes closer to the buttons, which are painted over it anyway.
  const D = Math.max(TYPE_FLOOR + 4, Math.min(230, long / LONG, short / SHORT))
  return {
    D,
    node: (upright ? Math.PI / 2 : 0) + TILT,
    w: (upright ? SHORT : LONG) * D,
    h: (upright ? LONG : SHORT) * D,
    // where they come in from: far enough out that the first frame of the fall
    // is genuinely off-screen on this device, whatever shape it is
    sep0: (ENTRY * Math.max(vw, vh)) / (D * Z_PING),
  }
}

// ── how far apart they are, at a time ────────────────────────────────────────
// Two bodies dropped toward each other from rest close as (T − t)^⅔, which is
// slow off the mark and quickest at the end, and that exponent is the whole
// difference between a glide and a slide: an ease gets SLOWER as it arrives,
// and nothing in a gravitational field has ever done that.
//
// Past the touch it opens back out a little and stops: what they become is a
// binary, not a merger, and a merger would have said one of them had stopped
// existing.
//
// A function of time rather than a value per frame because the wake needs it
// too — a ghost is where the body was 32ms ago, and during the fall that is
// mostly further OUT, not further back around the circle.
function sepAt(t, sep0) {
  if (t >= T_TOUCH) return lerp(SEP_TOUCH, SEP_REST, smoothstep(T_TOUCH, T_REST - 0.5, t))
  return SEP_TOUCH + (sep0 - SEP_TOUCH) * Math.pow(1 - t / T_TOUCH, FALL)
}

// One body's place on the tipped ellipse, and how far toward the viewer it is.
function project(a, R, cosTip, sinTip, cosN, sinN) {
  const ox = Math.cos(a) * R
  const oy = Math.sin(a) * R * cosTip
  return { x: ox * cosN - oy * sinN, y: ox * sinN + oy * cosN, d: Math.sin(a) * sinTip }
}

// ── the choreography ─────────────────────────────────────────────────────────
// One rAF loop, sampling the engine's match clock and integrating the orbit
// forward. It publishes where the two are, how big, how sharp, and how bright,
// and nothing else in the file knows what time it is.
function useMatch(fieldRef, stage) {
  const still = reduced()
  const [s, setS] = React.useState(null)
  // The phase survives a resize: the orbit is expressed in diameters, so a
  // rotated phone changes the pixels and nothing else.
  const st = React.useRef(null)
  if (!st.current) st.current = { ang: -0.62, prev: 0, eng: null }
  const geo = React.useRef(stage)
  geo.current = stage

  React.useEffect(() => {
    // A whole frame, from a time and a phase. Pure, and the only place any of
    // these numbers is worked out — the integrator below reads `omega` and
    // `rate` back off it rather than deriving them a second time, because two
    // derivations of the same curve are two curves waiting to disagree.
    const at = (t, ang) => {
      const g = geo.current
      const zoomP = smoothstep(T_ZOOM0, T_REST, t)
      // the camera. Slow off the mark, then committed — a move, not a fade.
      const z = lerp(Z_PING, 1, zoomP * zoomP * (3 - 2 * zoomP))
      const sepW = sepAt(t, g.sep0)
      const tip = lerp(TIP_FALL, TIP_REST, smoothstep(0, T_REST, t)) + 0.045 * Math.sin(t * 0.33)
      const D = g.D * z
      const R = (sepW * D) / 2
      const cosT = Math.cos(tip)
      const sinT = Math.sin(tip)
      const cosN = Math.cos(g.node)
      const sinN = Math.sin(g.node)

      // Kepler's third law: the closer they get the faster they go, by a power
      // of three halves, and nothing schedules it. This is the orbit's own
      // clock and it never changes.
      const omega = OMEGA_TOUCH * Math.pow(SEP_TOUCH / Math.max(sepW, 1e-3), 1.5)
      // And this is the film's. A binary this tight really does come round in
      // about a second, so what the fall actually is, is a TIME-LAPSE: it runs
      // fast while they are far apart and nothing is happening quickly, and it
      // comes down to real time as they close — which is exactly how anyone
      // cutting a time-lapse of an inspiral would cut it, because the
      // alternative is a pair that sit almost still for two seconds and then
      // blur. Kepler at a power of three halves, played at a rate that falls as
      // the square root, leaves the SEEN speed going as 1/separation: a steady
      // glide that becomes a whirl only because the circle it is on is
      // collapsing. Then the settle takes the rate the rest of the way down,
      // and the two go on circling at something a person can watch.
      const rate = still
        ? 0
        : Math.sqrt(Math.max(sepW, 1e-3) / SEP_TOUCH) *
          lerp(1, LAPSE_REST, smoothstep(T_TOUCH + MATCH.flash * 0.5, T_REST, t))

      // How far along the point-of-light → surface crossing the pair is, which
      // is the same variable sky/engine.js's `discOf()` hangs a star's own
      // resolve on. Below it a body is not a small sharp body — it is a smear
      // the instrument cannot separate, and what you see is its LIGHT rather
      // than its face. Above it, the photograph.
      const sharp = smoothstep(0.26, 0.72, z)
      // as a fraction of the disc, so a 42px ping smears by two pixels and not
      // by five, which at that size is the whole object
      const blur = (1 - sharp) * D * 0.055
      const seen = omega * rate
      const trail = still ? 0 : clamp((1 - smoothstep(0.34, 0.78, z)) * clamp(seen / 3, 0, 1), 0, 1)

      // ── one of the two ───────────────────────────────────────────────────
      // `size` is a LAYOUT number and `scale` is not, and keeping them apart is
      // the difference between a reveal that costs nothing to sit on and one
      // that reflows two posters sixty times a second for as long as the screen
      // is up. Past the settle `z` is exactly 1, so `size` stops changing, the
      // type stops being re-measured, and the orbit goes on turning entirely in
      // transforms — which is work the compositor does without waking layout at
      // all. `glow` is quantised for the same reason: it paints a 90-pixel
      // shadow, and it does not need to repaint it for a change nobody can see.
      const body = (phase, k) => {
        const p = project(phase, R, cosT, sinT, cosN, sinN)
        // perspective, and it is what makes the pair read as an orbit rather
        // than a rotation: the one on the near side is bigger and burns a
        // little harder, and half a turn later it is the other one
        const near = 1 + p.d * 0.12
        // The wake is where the body actually WAS, sampled back down the same
        // two curves — so it points outward along the fall and wraps around the
        // circle in the whirl, instead of always lying along the orbit.
        const wake = []
        for (let i = 1; trail > 0.02 && i <= WAKE; i++) {
          const back = GHOST * i
          const q = project(phase - seen * back, (sepAt(t - back, g.sep0) * D) / 2, cosT, sinT, cosN, sinN)
          wake.push({
            k: `${k}${i}`,
            x: q.x,
            y: q.y,
            r: D * near * (0.5 - i * 0.062),
            a: trail * Math.pow(1 - i / (WAKE + 1), 2.4),
          })
        }
        return {
          x: p.x,
          y: p.y,
          size: D,
          scale: near,
          blur,
          front: p.d > 0,
          // what is left of the point of light, over the surface underneath it
          lit: 1 - sharp,
          // pings are points of light and burn like it; a resolved card is a
          // surface and does not
          glow: Math.round((0.8 + 0.9 * (1 - z)) * (1 + p.d * 0.2) * 25) / 25,
          wake,
        }
      }

      return {
        t,
        z,
        omega,
        rate,
        a: body(ang, 'a'),
        b: body(ang + Math.PI, 'b'),
        flash: t < T_TOUCH ? 0 : Math.sin(Math.PI * clamp((t - T_TOUCH) / MATCH.flash, 0, 1)),
        veil: smoothstep(T_TOUCH - 0.5, T_REST - 0.4, t),
        open: t >= T_TOUCH,
        rested: t >= T_REST - 0.2,
      }
    }

    // Reduced motion gets the arrival and none of the flight: the settled
    // binary, held still, at the phase where both faces are square on.
    if (still) {
      setS(at(T_REST + 4, -0.62))
      return undefined
    }

    let raf = 0
    let live = true
    const t0 = performance.now()
    const s0 = st.current
    s0.prev = 0
    // If there is no match running at all — the canvas-2D fallback, a lost
    // context — nothing will ever report a time, so the wall carries it.
    s0.eng = null

    const tick = () => {
      if (!live) return
      const f = fieldRef && fieldRef.current
      if (s0.eng == null) s0.eng = !!(f && f.match)
      const wall = (performance.now() - t0) / 1000
      // The engine's clock, or the wall if there is no engine — and, past
      // GRACE, whichever is further along. A sky drawing at four frames a
      // second advances its own time at a quarter of wall speed (it clamps dt
      // for stability, which is right), and a reveal that stays sealed for
      // half a minute on a tired phone is worse than one that finishes a beat
      // out of step with a flash. The two agree exactly on any device that can
      // keep up, because there `max` picks the engine every frame.
      const t = s0.eng && f && f.match ? Math.max(f.match.t, wall - GRACE) : wall
      // dt off the SAME clock the phase is integrated against, clamped for the
      // same reason the engine clamps its own: a backgrounded tab must not come
      // back to a pair that has spun through four hundred revolutions.
      const dt = clamp(t - s0.prev, 0, 0.05)
      s0.prev = t

      const frame = at(t, s0.ang)
      // integrate AFTER sampling, so the frame that gets published and the
      // phase it was drawn at can never be one tick apart
      s0.ang += dt * frame.omega * frame.rate

      setS(frame)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(raf)
    }
  }, [fieldRef, still])

  return s
}

// ── the pair, in the field ───────────────────────────────────────────────────
// A fixed layer, because the two spend the first seconds of the fall outside
// the box the layout gave them. `centre` is where the stage spacer actually
// sits, so the orbit is centred on the room the column left for it and nothing
// has to be guessed.
function Pair({ C, s, centre, theirs, yours, theirUrl, yourUrl, them }) {
  if (!s) return null
  const one = (b, card, url, tint, label, key) => (
    <React.Fragment key={key}>
      {b.wake.map((w) => (
        <span
          key={w.k}
          aria-hidden
          style={{
            position: 'absolute', left: centre.x + w.x - w.r, top: centre.y + w.y - w.r,
            width: w.r * 2, height: w.r * 2, borderRadius: '50%', opacity: w.a,
            background: `radial-gradient(circle, ${rgba(tint, 0.85)} 0%, ${rgba(tint, 0.25)} 45%, transparent 72%)`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: centre.x, top: centre.y,
          width: b.size, height: b.size, marginLeft: -b.size / 2, marginTop: -b.size / 2,
          transform: `translate3d(${b.x}px, ${b.y}px, 0) scale(${b.scale})`,
          zIndex: b.front ? 2 : 1,
          filter: b.blur > 0.05 ? `blur(${b.blur}px)` : 'none',
        }}
      >
        <Card C={C} card={card} url={url} size={b.size} tint={tint} label={label} glow={b.glow} />
        {/* the point of light, lying over the surface until the surface is
            resolved enough to be one. A ping's ground is a night photograph or
            a near-black plate, so at 42 across it is a dark dot with a halo
            round it — which is what an unresolved star is NOT. You do not see a
            distant star's face; you see the light coming off it, and only when
            it resolves do you start to see what it is made of. This is that,
            and it dissolves on exactly the curve the disc sharpens on. */}
        {b.lit > 0.01 && (
          <span
            aria-hidden
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%', opacity: b.lit,
              background: `radial-gradient(circle at 40% 34%, ${rgba(C.cream, 0.95)} 0%, ${rgba(tint, 0.92)} 38%, ${rgba(tint, 0.6)} 78%, ${rgba(tint, 0.3)} 100%)`,
            }}
          />
        )}
      </div>
    </React.Fragment>
  )

  return (
    // NOT aria-hidden, whatever it looks like. What is in here is the two
    // people's actual words; a decorative layer is the one thing this is not.
    // Overflow is clipped because for the first second the pair is genuinely
    // outside the window, and a page that scrolls sideways during a reveal is
    // a page that has told on itself.
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* the touch. The sky throws its own flash on this frame — galaxy.js is
          reading the same clock — and this is the near half of it, at the
          barycentre, where the two actually met. */}
      {s.flash > 0.01 && (() => {
        // Sized off the PAIR, not off the screen. The sky is already throwing a
        // whole-field flash on this frame (galaxy.js, ACES-rolled so it lifts
        // rather than clips); a second one at screen scale on top of it turned
        // the most important frame in the product into a grey wash with two
        // specks in it. This is the near half of that event — a burst where the
        // two actually met, big enough to see them inside.
        const r = s.a.size * (2.4 + s.flash * 2.2)
        return (
          <span
            aria-hidden
            style={{
              position: 'absolute', left: centre.x - r, top: centre.y - r, width: r * 2, height: r * 2,
              borderRadius: '50%', opacity: s.flash * 0.75,
              background: `radial-gradient(circle, ${rgba(C.cream, 0.85)} 0%, ${rgba(C.you, 0.4)} 22%, ${rgba(C.them, 0.16)} 46%, transparent 70%)`,
            }}
          />
        )
      })()}
      {one(s.a, theirs, theirUrl, C.them, `@${them}`, 'them')}
      {one(s.b, yours, yourUrl, C.you, 'yours', 'you')}
    </div>
  )
}

// ── the spread ───────────────────────────────────────────────────────────────
// `theirs` and `yours` are two cards. `onSay` is the exit, and it is the loudest
// thing on the screen from this moment on, because celestual ends at the
// handoff (§1.6): there is no chat here, and the DM is not the product stopping
// short, it is the product working.
export default function Spread({ C, yours, theirs, yourUrl, theirUrl, fieldRef, onSay, onShare, onBack }) {
  const [stage, setStage] = React.useState(stageOf)
  const stageEl = React.useRef(null)
  const [centre, setCentre] = React.useState({ x: 0, y: 0 })
  const s = useMatch(fieldRef, stage)

  // Measured, not computed. The orbit is centred on whatever the column
  // actually left for it — which moves when the type wraps, when a font
  // finishes loading, or when a phone turns — and never on an assumption about
  // how tall the line above it came out.
  React.useEffect(() => {
    const measure = () => {
      const el = stageEl.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setCentre({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    const onResize = () => {
      setStage(stageOf())
      measure()
    }
    measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    // The pair is drawn in a FIXED layer off a rect in viewport coordinates, so
    // a scroll moves the room without moving the two things that live in it.
    // This screen fits a viewport on anything shaped like a phone; a short
    // landscape window is the case where it does not, and there the pair has to
    // come with the column.
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

  const open = !!(s && s.open)
  const rested = !!(s && s.rested)
  const them = (theirs && theirs.handle) || (yours && yours.handle) || ''

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `max(40px, env(safe-area-inset-top)) clamp(14px, 4vw, 40px) max(24px, env(safe-area-inset-bottom))`,
        gap: SPACE.lg,
      }}
    >
      {/* The reveal happens inside the event, and the event is bright: the
          flash and the light echo sweeping out behind it are the two loudest
          frames the renderer ever draws. Words set over them are not words.
          This is the veil that keeps the one thing on this screen that must
          always be legible legible — and it comes in with the camera, so it
          never touches the fall. Never to black: the point of arriving here is
          that the pair is IN the field, not in front of it. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
          background: `radial-gradient(120% 74% at 50% 46%, ${rgba(C.ink, 0.74)} 0%, ${rgba(C.ink, 0.52)} 58%, ${rgba(C.ink, 0.78)} 100%)`,
          opacity: s ? s.veil : 0,
        }}
      />

      {/* The line arrives with the flash, before the surfaces do — you learn
          that it happened, and then you find out what was said. */}
      <div
        style={{
          position: 'relative', zIndex: 3, textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
          opacity: open ? 1 : 0, transition: 'opacity .8s ease',
        }}
      >
        <h1 style={{ margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: SIZE.display, lineHeight: 1.05, color: C.cream }}>
          it’s mutual.
        </h1>
        {/* A statement, so it is set in the interface register, not the
            metadata one. As tracked uppercase mono it ran wider than the
            column, wrapped, and orphaned its last word — and it was never
            metadata to begin with. It is the sentence that says what happened. */}
        <p style={{ margin: '0 auto', maxWidth: 320, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted }}>
          you entered @{them}. @{them} entered you.
        </p>
      </div>

      {/* The room the orbit is given, and it is empty: the pair is drawn in a
          fixed layer, because for the first second the two are nowhere near
          this box — they are still off the edge of the screen, falling toward
          it. What this reserves is the space they settle into, which is the
          only thing the column needs to know. The pair follows it here in the
          DOM so that a reader who is listening gets the words in the order the
          screen means them: what happened, then what you each said, then where
          to go. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <div
          ref={stageEl}
          aria-hidden
          style={{ flex: '0 1 auto', width: Math.round(stage.w), height: Math.round(stage.h), maxWidth: '100%' }}
        />
      </div>

      <Pair
        C={C} s={s} centre={centre}
        theirs={theirs} yours={yours} theirUrl={theirUrl} yourUrl={yourUrl} them={them}
      />

      <div
        style={{
          position: 'relative', zIndex: 3, width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
          opacity: rested ? 1 : 0, transition: 'opacity .7s ease',
          pointerEvents: rested ? 'auto' : 'none',
        }}
      >
        <PrimaryButton C={C} onClick={onSay}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            go say it <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <Small C={C} align="center" color={C.muted}>the rest is yours.</Small>
        <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.xl, marginTop: SPACE.sm }}>
          {/* Shares YOUR card and the mutual mark. Never theirs, at any tier,
              for any reason — their words were written to one person, and a
              share sheet that could carry them is a share sheet that will. */}
          <GhostButton C={C} onClick={onShare} style={{ fontSize: SIZE.meta }}>share your card</GhostButton>
          <GhostButton C={C} onClick={onBack} style={{ fontSize: SIZE.meta }}>your sky</GhostButton>
        </div>
      </div>
    </div>
  )
}

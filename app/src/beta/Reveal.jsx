// beta/Reveal.jsx — the mutual.
//
// Production's reveal, beat for beat, with a seal where the photographic disc
// is. The beats are not decoration and are worth restating, because they are
// the argument of the whole product:
//
//   THE ARRIVAL  The ordinary held dive into YOUR ping — the same `focusStar`
//                every other zoom makes, on the same curve (`resolveOf`). You
//                land on the thing you actually placed.
//   THE LIGHT    Their light rises around the limb of your seal. Nothing moves.
//                This is an ECLIPSE: the near body is dark and all you get of
//                the far one is the corona around its edge. It is the claim of
//                the product in one image and it needs no words.
//   THE TURN     One half turn about the vertical axis, slow, and the seal is
//                theirs. Not a coin: the way a hand turns something over to
//                read the back. It does not overshoot, because a hand does not.
//
// The turn happens by itself the first time, which is also how the beta gets to
// carry no instruction. Production prints "turn it over" under the disc, and it
// is right to: an object with a second side is worth nothing if nobody knows it
// has one. An object that turns itself once has already said so.
//
// Everything is read off `cam.focus` on the frame it is true. Nothing here is
// scheduled against a guess at how long a dive takes.

import { useCallback, useEffect, useRef, useState } from 'react'
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
const TURN = 1.5 //  the half turn
const TAP_TURN = 1.05
const TIP = 5 //     deg of tilt on the other axis, peaking side-on and back
const YOURS = 180
const THEIRS = 360
const GRACE = 9 //   the floor under a machine that cannot keep up
const NO_SKY = 1.2
const STANDOFF = 0.52

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const sizeOf = () => Math.round(Math.min(fullSize(), window.innerHeight * 0.52))

function useReveal(fieldRef, index, centre, size) {
  const still = reduced()
  const [s, setS] = useState(null)
  const [hand, setHand] = useState(0)
  const st = useRef(null)
  if (!st.current) st.current = { rot: still ? THEIRS : YOURS, turn: null, dir: -1, tap: 0, open: still }
  const geo = useRef({ centre, size })
  geo.current = { centre, size }

  // the one gesture the frame accepts, and it is the same motion the reveal
  // makes: a turn back the way it came
  const turn = useCallback(() => {
    const g = st.current
    if (!g.open || g.turn) return
    g.tap++
    if (still) {
      g.rot = g.rot === THEIRS ? YOURS : THEIRS
      setHand((n) => n + 1)
      return
    }
    g.dir = -g.dir
    g.turn = { from: g.rot, to: g.rot + g.dir * 180, at: -1, dur: TAP_TURN }
  }, [still])

  useEffect(() => {
    if (!still) return undefined
    void hand
    setS({
      ...resolveOf(1, null, geo.current.centre, geo.current.size),
      rot: st.current.rot, tip: 0, bloom: 1, turned: 1, named: true, told: true, open: true, tap: st.current.tap,
    })
    return undefined
  }, [still, hand, centre, size])

  useEffect(() => {
    if (still) return undefined
    let raf = 0
    let live = true
    const t0 = performance.now()
    const g = st.current
    let prev = 0
    let landed = -1
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
      // tell the sky how much of its star is left to draw: the seal is opaque
      // and sits exactly where the star is, so the two cross over on ONE curve
      if (f && f.matchCover) f.matchCover(disc.opacity)
      if (landed < 0 && focus > 0.995) landed = now

      const u = landed < 0 ? -1 : now - landed
      const at = HOLD + BLOOM
      const bloom = u < 0 ? 0 : smoothstep(HOLD, at + TURN * 0.5, u)
      if (u >= at && !g.turn && g.rot === YOURS && !g.open) {
        g.turn = { from: YOURS, to: THEIRS, at: now, dur: TURN }
      }
      if (g.turn && g.turn.at < 0) g.turn.at = now

      let rot = g.rot
      let tip = 0
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

      setS({ ...disc, rot, tip, bloom, turned, named: disc.resolve > 0.55, told: bloom > 0.06, open: g.open, tap: g.tap })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      live = false
      cancelAnimationFrame(raf)
    }
  }, [fieldRef, index, still])

  return [s, turn]
}

// ── the held object ──────────────────────────────────────────────────────────
// Two faces of one thing, in a real 3D transform, with their light behind it.
// The corona is drawn OUTSIDE the seal's edge, never over it: an eclipse is
// light around a limb, and light spilling across the near body is a glow, which
// this brand does not have.
function Held({ s, yours, theirs, onTurn }) {
  const half = s.size / 2
  const theirTone = groundOf(theirs && theirs.ground).tone
  const light = sealLight(theirTone)
  // Their face carries no pre-rotation, so it is the one pointing at the viewer
  // whenever the container's own rotation has cosine above zero.
  const showTheirs = Math.cos((s.rot * Math.PI) / 180) > 0

  return (
    <div
      style={{
        position: 'fixed',
        left: s.x - half,
        top: s.y - half,
        width: s.size,
        height: s.size,
        pointerEvents: s.open ? 'auto' : 'none',
        filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',
        opacity: s.opacity,
        perspective: s.size * 3.2,
      }}
      onPointerUp={s.open ? onTurn : undefined}
    >
      {/* their light, around the limb */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -s.size * 0.16,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rgba(light, 0)} 40%, ${rgba(light, 0.5 * s.bloom)} 51%, ${rgba(light, 0.14 * s.bloom)} 64%, ${rgba(light, 0)} 78%)`,
          opacity: 0.35 + 0.65 * (1 - s.turned * 0.55),
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${s.rot}deg) rotateX(${s.tip}deg)`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <Seal card={yours} size={s.size} />
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          <Seal card={theirs} size={s.size} />
        </div>
      </div>
      {/* which side you are looking at, said once, in the metadata voice */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '100%',
          marginTop: 14,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: '0.18em',
          color: rgba(C.ivory, 0.4),
          opacity: s.open ? 1 : 0,
          transition: 'opacity .6s ease',
        }}
      >
        {showTheirs ? 'theirs' : 'yours'}
      </div>
    </div>
  )
}

export function Reveal({ yours, theirs, index, fieldRef, children }) {
  const [size, setSize] = useState(sizeOf)
  const stage = useRef(null)
  const [centre, setCentre] = useState({ x: 0, y: 0 })
  const [s, turn] = useReveal(fieldRef, index, centre, size)

  useEffect(() => {
    const measure = () => {
      const el = stage.current
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
    window.addEventListener('scroll', measure, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && stage.current) ro.observe(stage.current)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
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
        padding: `max(96px, env(safe-area-inset-top)) ${S.lg}px max(${S.xl}px, env(safe-area-inset-bottom))`,
        gap: S.lg,
      }}
    >
      {/* the field recedes as the seal resolves, and never to black */}
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
          fontSize: 'clamp(32px, 7.6vw, 52px)',
          lineHeight: 1,
          color: C.ivory,
          opacity: s && s.named ? 1 : 0,
          transition: 'opacity .9s ease',
        }}
      >
        it is mutual.
      </h1>

      {/* the room the seal comes to rest in. It is empty on purpose: the seal
          is drawn in a fixed layer, because for the length of the zoom it is
          wherever your star happens to hang. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <div ref={stage} aria-hidden style={{ flex: '0 1 auto', width: size, height: size, maxWidth: '100%' }} />
      </div>

      <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
        {s && (
          <div style={{ pointerEvents: 'auto' }}>
            <Held s={s} yours={yours} theirs={theirs} onTurn={turn} />
          </div>
        )}
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

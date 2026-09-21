// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PRIMARY, IN LIQUID METAL                                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// "write a letter" and every capsule of its rank: a dark capsule with a metal
// rim round it, a current running under the rim, and the word standing over
// the two on its own plane. It is the same fragment shader the mark is poured
// in (LiquidMark.jsx) — one material in the build, spent in two places —
// mounted here without a mask so the metal is the surface itself rather than
// a silhouette cut out of it.
//
// ── it is a role, not a caller ──────────────────────────────────────────────
// Nothing imports this directly. `Pill tone="light"` is the primary act on
// every screen that has one, and the light pill IS this now (parts.jsx), so
// the composer's capsule, the front door's, the gate's and the wall's are one
// object in one material rather than four callers that agreed to look alike.
// Everything below therefore has to survive every shape a primary is already
// asked to take: wide and full-bleed on a sheet's foot, content-width in a
// dock, with a nib in front of the word or without one, disabled, and as an
// <a> where the act is a link out (parts.jsx, "it takes an href").
//
// ── the layers ──────────────────────────────────────────────────────────────
// Stacked on the button's own perspective, which is what gives the capsule its
// slight bulge — the face is projected a little larger than the rim under it,
// so the edge reads as a rim around a face and not as a border drawn on a
// rectangle:
//
//   rim           the shader, clipped to the capsule, under a hairline of
//                 black and the drop shadow that seats the whole thing
//   face          the near-black plate the word is read against, inset by a
//                 rim's width, pushed out over it, and the thing that
//                 answers a press
//   ink           the word and the glyph, flat on the face and never moved,
//                 for the reason wall.css gives under `.wl-lq-ink`
//   wake          where the hand landed, clipped to the capsule
//   hit    —      the button element itself, which is all of them
//
// ── what a mount costs ──────────────────────────────────────────────────────
// A WebGL2 context, a compile and a link, per button. The wall already spends
// one on the field behind it (field.js) and may spend another on the mark, and
// a browser will start dropping the oldest context somewhere around sixteen —
// which would take the field down, not the button. So the mounts are counted
// and capped (`BUDGET`), and a capsule that cannot have the metal gets the
// still frame of it: a drawn gradient in the same greys, which is the rule for
// every drawn thing here (design/DESIGN.md) and is also what a browser with no
// WebGL2 has always got from LiquidMark.
//
// Under prefers-reduced-motion the shader still mounts and the clock does not
// run: the material is correct as a still frame, and that is the whole of the
// difference.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders'
import { hasWebGL2 } from './ground.jsx'

// parts.jsx exports the same one line, and parts.jsx imports this file: asking
// it for the media query would be a cycle for a matchMedia call.
function stillPreferred() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// The material. The abstract shape blown up past the capsule's own box so what
// crosses the rim is the middle of a metal sheet rather than a circle sitting
// in a button: `u_scale` is the zoom and the two offsets are where the sheet is
// cut from, which is off-centre on purpose so no two edges of the capsule get
// the same band. Dispersion is low, as it is on the mark — a rainbow edge on
// the primary act would be the one saturated thing on the screen.
const UNIFORMS = {
  u_repetition: 4,
  u_softness: 0.5,
  u_shiftRed: 0.3,
  u_shiftBlue: 0.3,
  u_distortion: 0,
  u_contour: 0,
  u_angle: 45,
  u_scale: 8,
  u_shape: 1,
  u_offsetX: 0.1,
  u_offsetY: -0.1,
}

// ── the zoom is a function of the capsule, not a constant ───────────────────
// `u_scale` above is the zoom for ONE shape: a capsule 142 by 46, which is
// what the material was drawn on. The shader's window into the sheet is the
// canvas's aspect over the zoom, and the sheet it is cutting from is a disc
// that runs out: put the same constant on a full-width capsule at the foot of
// a sheet and the window runs off both ends of the disc, where the shader
// returns nothing — a wide primary came out with metal across its left half
// and a dead black rim on its right.
//
// So the zoom rides the capsule's own proportion and the window stays the
// width it was drawn at, whatever the button is. A wide capsule is the same
// slice of the same sheet, seen at the same size, for longer.
const REF_W = 142
const REF_H = 46
const REF_SCALE = 8

function zoomFor(el) {
  const w = el.offsetWidth || REF_W
  const h = el.offsetHeight || REF_H
  const aspect = Math.max(0.35, w / Math.max(1, h))
  return Math.max(0.5, (REF_SCALE * aspect) / (REF_W / REF_H))
}

// The clock, in three states. It idles under the resting capsule, doubles when
// a pointer is on it, and is thrown for the length of a press — which is the
// button answering the hand in the material rather than with a second
// animation drawn over it.
const IDLE = 0.6
const HOVER = 1
const STRUCK = 2.4
const STRIKE_MS = 300
const RIPPLE_MS = 600

// A capsule is 46px tall and about a hundred wide, and there is nothing sharp
// in a soft metal: one device pixel per CSS pixel, capped, the way LiquidMark
// rations its own small mounts.
const MIN_PIXEL_RATIO = 1
const MAX_PIXEL_COUNT = 40_000

// How many of these may hold a context at once, across the whole page. Past it
// a capsule draws the still frame instead, and first mounted is first served:
// on a screen with one primary, which is nearly every screen here, the one a
// person is looking at is always inside the budget. A capsule that missed it
// does not come back for a context later — a button that poured metal thirty
// seconds after the screen settled would be a button that changed material
// while nobody was doing anything.
const BUDGET = 4
let live = 0

export default function LiquidButton({
  children, onClick, href, wide = false, disabled = false, icon = null, className = '', ...rest
}) {
  const metal = useRef(null)
  const shader = useRef(null)
  const hit = useRef(null)
  const seq = useRef(0)
  const strike = useRef(0)
  const hovered = useRef(false)
  const [ripples, setRipples] = useState([])
  const [poured, setPoured] = useState(false)

  // Whether this capsule may hold the material at all. A disabled one may
  // not: no context is taken for a control nobody can press, and it is the
  // plate and the word with nothing moving under either. Reading the flag
  // costs a canvas the first time and is answered from a module-level memo
  // after that (ground.jsx).
  const may = useMemo(() => !disabled && hasWebGL2(), [disabled])
  const still = useMemo(stillPreferred, [])

  useEffect(() => {
    if (!may) return undefined
    const host = metal.current
    if (!host || live >= BUDGET) return undefined
    live += 1
    let mount = null
    let zoom = zoomFor(host)
    try {
      mount = new ShaderMount(
        host, liquidMetalFragmentShader, { ...UNIFORMS, u_scale: zoom }, undefined,
        still ? 0 : IDLE, 0, MIN_PIXEL_RATIO, MAX_PIXEL_COUNT,
      )
      shader.current = mount
      setPoured(true)
    } catch {
      // No context, a driver that refused the link, a tab that has already
      // spent every context it is allowed: the still frame stands.
      live -= 1
      return undefined
    }
    // A capsule changes width: a label arrives, a breakpoint moves, a sheet's
    // foot is laid out after the first frame. The zoom follows it, and only
    // when the proportion has actually moved — resetting a uniform draws a
    // frame, and a resize observer that fires on every sub-pixel would draw
    // one per pixel of a window being dragged.
    let ro = null
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        const next = zoomFor(host)
        if (Math.abs(next - zoom) < 0.05) return
        zoom = next
        mount.setUniforms({ u_scale: next })
      })
      ro.observe(host)
    }
    return () => {
      shader.current = null
      setPoured(false)
      live -= 1
      if (ro) ro.disconnect()
      mount.dispose()
    }
  }, [may, still])

  // The clock only ever moves through here, so a pointer leaving mid-strike
  // cannot leave the capsule running at the speed of a press.
  const runAt = useCallback((speed) => {
    if (still) return
    shader.current?.setSpeed?.(speed)
  }, [still])
  const settle = useCallback(() => {
    runAt(hovered.current ? HOVER : IDLE)
  }, [runAt])

  // Every clock this component starts, stopped on the way out. A press that
  // navigates — which is what a primary does — unmounts the capsule inside
  // the length of its own ripple.
  const wakes = useRef(new Set())
  useEffect(() => () => {
    clearTimeout(strike.current)
    wakes.current.forEach(clearTimeout)
    wakes.current.clear()
  }, [])

  const enter = () => { hovered.current = true; runAt(HOVER) }
  const leave = () => { hovered.current = false; runAt(IDLE) }

  const press = (e) => {
    if (disabled) return
    runAt(STRUCK)
    clearTimeout(strike.current)
    strike.current = setTimeout(settle, STRIKE_MS)

    // The ripple starts where the hand landed, which is what makes it read as
    // the surface answering rather than as an effect the button plays. A
    // keyboard's enter has no point on the capsule and gets none — `detail` is
    // the click count, and it is zero when the click was not a pointer's.
    const el = hit.current
    if (el && !still && e.detail > 0) {
      const box = el.getBoundingClientRect()
      const id = ++seq.current
      const drop = { id, x: e.clientX - box.left, y: e.clientY - box.top }
      setRipples((all) => [...all, drop])
      const t = setTimeout(() => {
        wakes.current.delete(t)
        setRipples((all) => all.filter((r) => r.id !== id))
      }, RIPPLE_MS)
      wakes.current.add(t)
    }

    if (onClick) onClick(e)
  }

  // It keeps `wl-pill` and the role class goes: the capsule's METRICS are the
  // pill's — the heights, the padding, the gap, `is-wide`, and the dozen
  // contextual rules that place a primary in a dock, a sheet's foot or the
  // composer's footer all key on `.wl-pill`. Only the surface is this file's,
  // and `is-light` is dropped so the chalk fill is never there to undo.
  const cls = ['wl-pill', 'wl-lq', wide && 'is-wide', poured && 'is-poured', disabled && 'is-off', className]
    .filter(Boolean).join(' ')

  const body = (
    <>
      <span className="wl-lq-rim" aria-hidden="true">
        {may ? <span className="wl-lq-metal" ref={metal} /> : null}
      </span>
      <span className="wl-lq-face" aria-hidden="true" />
      <span className="wl-lq-ink">{icon}<span className="wl-lq-word">{children}</span></span>
      <span className="wl-lq-wake" aria-hidden="true">
        {ripples.map((r) => (
          <span key={r.id} className="wl-lq-ripple" style={{ left: `${r.x}px`, top: `${r.y}px` }} />
        ))}
      </span>
    </>
  )

  if (href && !disabled) {
    return (
      <a
        ref={hit} className={cls} href={href} onClick={press}
        onPointerEnter={enter} onPointerLeave={leave} {...rest}
      >{body}</a>
    )
  }
  return (
    <button
      ref={hit} type="button" className={cls} onClick={press} disabled={disabled}
      onPointerEnter={enter} onPointerLeave={leave} {...rest}
    >{body}</button>
  )
}

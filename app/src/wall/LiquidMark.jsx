// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MARK, IN LIQUID METAL                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The Ecliptic drawn as a material rather than as a fill: a metal surface with
// a slow current running under it, cut to the mark's own silhouette.
//
// The shape is still the mark. `eclipticSVG()` in wall/mark.js draws it from
// the nine constants the favicon and the bar use, scripts/export-liquid.mjs
// rasterises that drawing and hands it to the shader package's own
// pre-processor, and what comes back is app/public/liquid-mark.png: the mark's
// silhouette with an edge distance field in the red channel and its opacity in
// the green, which is the texture the liquid metal fragment shader reads.
// Change the geometry, run the export, and this moves with it. Nothing here is
// a second drawing of the logo.
//
// ── why the shader is mounted directly ──────────────────────────────────────
// The package's <LiquidMetal> component takes any image and runs that
// pre-processing on mount, every mount: an SVG is upsampled to 4096px and a
// Poisson problem is solved over it, which took a second on a good machine and
// ten on a slow one, and the intro has the mark on screen at 180ms. So the
// solve is done once by the export script and the fragment shader is mounted
// here with the finished texture, through the same ShaderMount the component
// itself uses. The uniforms below are the component's, written out.
//
// ── what the shader is, and why it is allowed ───────────────────────────────
// design/DESIGN.md rule 3 says everything is drawn and nothing is downloaded.
// This is a fragment shader running on the GPU, drawn per frame from a mask and
// a clock. The mask is a generated file, in the way design/logo/ is generated,
// and both are written by a script from the geometry rather than by hand.
//
// ── where it is spent ───────────────────────────────────────────────────────
// Rationed like the bloom. It stands in the intro, large, for the two seconds
// before either surface exists, it stands in the hero's scene where the mark
// lights when the two cards open, and it is the seal on a mutual. It does not
// replace the mark in the bar, in the steps, or anywhere the mark is a glyph
// rather than an event.
//
// ── what a mount costs, and where the cost is put ───────────────────────────
// A mount is not free: the mask is decoded, the fragment shader is compiled
// and linked on the GPU driver's own time, the texture is uploaded with its
// mipmaps, and then every frame runs a heavy shader over every pixel of the
// canvas. On the reveal that used to land in the middle of the screen's
// entrance, on a canvas rendered at twice the device's pixels, beside a sky
// that is already a shader: the tap on the mutual row answered with a hitch
// and a few dropped frames, which on a phone read as the screen lagging.
//
// Three things about that, all here so no caller has to know:
//
//   THE FLAT MARK IS UNDER IT. The same drawing the bar carries stands in the
//   metal's place from the first frame, in chalk, and the metal fades in
//   over it once its first frame is drawn. The silhouette is identical, so
//   the fade reads as the mark lighting, not as a swap, and a slow driver or
//   a missing texture leaves a mark on the screen rather than a hole.
//
//   THE PIXELS ARE COUNTED. `quality` says what a mount is for: the intro
//   at full size renders at the package's own two pixels per CSS pixel; a
//   seal and a row are capped at a pixel count, and one per CSS pixel, since
//   there is nothing sharp in a soft metal and nobody can tell at 44px.
//
//   THE MOUNT CAN WAIT. `defer` holds the shader back by that many
//   milliseconds, so a screen can run its entrance on a flat mark and pay
//   for the compile once nothing else is moving.
//
//   AND IT SAYS WHEN IT HAS ARRIVED. `onReady` fires once the metal has drawn
//   a frame, so a caller with a sequence that should be run on the metal (the
//   intro) can hold that sequence for it. "Arrived" is a frame after the
//   canvas is in the tree, not the moment it is: the package inserts the
//   canvas before its first frame is drawn, and a mark handed over on that
//   frame is a mark handed over to a blank canvas.
//
// ── the swap, and why it is not a crossfade ─────────────────────────────────
// The metal fades in OVER the flat mark, and the flat mark leaves only once
// the metal is wholly there. It used to fade out on the same clock the metal
// faded in, which is a crossfade, and a crossfade of two opaque shapes of the
// same silhouette on a black ground dips: halfway through, half of one over
// half of the other is three quarters of either, so the mark dimmed and came
// back. Worse, the curve every transition here runs on has a hard start, so
// that dip was a fifty millisecond step. On a laptop the swap landed under the
// intro's cover and nobody saw it; on a phone the shader takes longer to
// compile than the cover takes to open, the swap landed on a ring already on
// the screen, and the ring was seen to blink. With the metal on top and the
// flat held underneath until the metal is opaque, the luminance can only move
// one way, over the whole fade, and where the metal's soft edge does not
// quite cover the flat the last thing to go is a hairline of chalk.
//
// `cut` makes the swap instant instead. The intro asks for that while its
// cover is still over the mark: nothing under the cover can be seen changing,
// and a nine hundred millisecond fade that is still running when the cover
// opens is a fade seen on the ring.
//
// The mask is fetched and decoded once per page and handed to every mount as
// the same image element, rather than each mount loading the URL again.
//
// ── the fallback ────────────────────────────────────────────────────────────
// A browser without WebGL2 gets the flat mark at the same size. The surface is
// correct as a still frame either way, which is the rule for every drawn thing
// in the system.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ShaderMount } from '@paper-design/shaders-react'
import { liquidMetalFragmentShader, LiquidMetalShapes, ShaderFitOptions } from '@paper-design/shaders'
import { Ecliptic } from './art.jsx'
import { hasWebGL2 } from './ground.jsx'

export const LIQUID_MASK = '/liquid-mark.png'

// The material. Chalk as the tint, so the highlights are the same near white as
// the type; a transparent back, so the void shows through where the mark is not.
// Low chromatic shift, because a rainbow edge on the logo would be the one
// saturated thing on a screen whose whole colour budget is one pale blue.
//
// Colours are the shader's own vec4s. Chalk is #F4F1EA.
const CHALK = [0.957, 0.945, 0.918, 1]
const NONE = [0, 0, 0, 0]

const UNIFORMS = {
  u_colorBack: NONE,
  u_colorTint: CHALK,
  u_isImage: true,
  u_shape: LiquidMetalShapes.none,
  u_softness: 0.3,
  u_repetition: 1.7,
  u_shiftRed: 0.06,
  u_shiftBlue: 0.06,
  u_distortion: 0.12,
  u_contour: 0.65,
  u_angle: 70,
  // sizing: the object, contained, centred
  u_fit: ShaderFitOptions.contain,
  u_scale: 1,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
}

// What each use is worth in pixels. `full` is the package's own default: two
// pixels per CSS pixel, uncapped. The other two are capped at a count and at
// the device's own pixels, since the material is soft and the canvas is small.
const QUALITY = {
  full: { minPixelRatio: 2, maxPixelCount: 1920 * 1080 * 4 },
  seal: { minPixelRatio: 1, maxPixelCount: 120_000 },
  row:  { minPixelRatio: 1, maxPixelCount: 24_000 },
}

// The mask, once. Decoded on first use and held for the page, so the second
// and third mounts on a screen wait on nothing but the compile.
let MASK = null
function mask() {
  if (MASK) return MASK
  const img = new Image()
  img.decoding = 'async'
  img.src = LIQUID_MASK
  MASK = img
  return img
}

// Fetch and decode the mask now, ahead of a mount that is about to happen: the
// sky calls it when there is a mutual on it, so the reveal's seal has its
// texture before the row is even pressed.
export function warmLiquidMark() {
  if (typeof window === 'undefined' || !hasWebGL2()) return
  const img = mask()
  if (img.decode) img.decode().catch(() => {})
}

export default function LiquidMark({
  size = 64, speed = 0.7, still = false, quality = 'full', defer = 0, cut = false, onReady = null,
  className = '', style,
}) {
  const ok = useMemo(hasWebGL2, [])
  const host = useRef(null)
  // Whether the metal has drawn a frame yet: the mount is asynchronous behind
  // the texture and the compile, and until it lands the flat mark is the
  // whole drawing.
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(defer <= 0)
  const arrived = useRef(onReady)
  arrived.current = onReady

  useEffect(() => {
    if (!ok || mounted) return undefined
    const t = setTimeout(() => setMounted(true), defer)
    return () => clearTimeout(t)
  }, [ok, mounted, defer])

  // The canvas arrives as a child of the mount's own element, prepended by the
  // package once the texture is decoded and the program is linked. Its first
  // frame is drawn on the next animation frame, when the package's resize
  // observer sizes it, so the metal is declared ready one frame after that:
  // watched rather than assumed, and a frame late rather than a frame early.
  useEffect(() => {
    if (!ok || !mounted) return undefined
    const el = host.current
    if (!el) return undefined
    let raf = 0
    let mo = null
    const drawn = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          setReady(true)
          if (arrived.current) arrived.current()
        })
      })
    }
    if (el.querySelector('canvas')) drawn()
    else {
      mo = new MutationObserver(() => {
        if (!el.querySelector('canvas')) return
        mo.disconnect(); mo = null
        drawn()
      })
      mo.observe(el, { childList: true })
    }
    return () => { if (mo) mo.disconnect(); cancelAnimationFrame(raf) }
  }, [ok, mounted])

  // One uniforms object per mount, carrying the shared decoded mask.
  const uniforms = useMemo(() => (ok ? { ...UNIFORMS, u_image: mask() } : null), [ok])
  const q = QUALITY[quality] || QUALITY.full

  const box = { width: size, height: size, ...style }
  if (!ok) return <Ecliptic size={size} className={className} style={style} />
  return (
    <span className={`wl-liquid${ready ? ' is-ready' : ''}${cut ? ' is-cut' : ''} ${className}`} style={box} aria-hidden="true">
      <Ecliptic size="100%" className="wl-liquid-flat" />
      {mounted && (
        <ShaderMount
          ref={host}
          fragmentShader={liquidMetalFragmentShader}
          uniforms={uniforms}
          mipmaps={['u_image']}
          minPixelRatio={q.minPixelRatio}
          maxPixelCount={q.maxPixelCount}
          speed={still ? 0 : speed}
          className="wl-liquid-metal"
          aria-hidden="true"
        />
      )}
    </span>
  )
}

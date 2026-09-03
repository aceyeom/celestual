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
// the name is arriving, and it stands in the hero's scene where the mark lights
// when the two cards open. It does not replace the mark in the bar, in the
// steps, or anywhere the mark is a glyph rather than an event.
//
// ── the fallback ────────────────────────────────────────────────────────────
// A browser without WebGL gets the flat mark at the same size. The surface is
// correct as a still frame either way, which is the rule for every drawn thing
// in the system.

import { useMemo } from 'react'
import { ShaderMount } from '@paper-design/shaders-react'
import { liquidMetalFragmentShader, LiquidMetalShapes, ShaderFitOptions } from '@paper-design/shaders'
import { Ecliptic } from '../wall/art.jsx'

export const LIQUID_MASK = '/liquid-mark.png'

let webgl = null
function hasWebGL() {
  if (webgl !== null) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }
  return webgl
}

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
  u_image: LIQUID_MASK,
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

export default function LiquidMark({ size = 64, speed = 0.7, still = false, className = '', style }) {
  const ok = useMemo(hasWebGL, [])
  if (!ok) return <Ecliptic size={size} className={className} style={style} />
  return (
    <ShaderMount
      fragmentShader={liquidMetalFragmentShader}
      uniforms={UNIFORMS}
      mipmaps={['u_image']}
      speed={still ? 0 : speed}
      className={className}
      style={{ width: size, height: size, display: 'block', ...style }}
      aria-hidden="true"
    />
  )
}

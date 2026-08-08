// sky/gl.js — the WebGL2 substrate both skies are rendered on.
//
// Everything here is hand-rolled and dependency-free, exactly like the canvas
// engines it replaces. What it buys over canvas 2D is the thing canvas 2D can
// never give: the per-star work moves off the CPU entirely. A star's orbit,
// its blackbody color, its apparent magnitude and its point-spread function are
// all evaluated in the vertex/fragment shader from static attributes and one
// time uniform, so a hundred thousand stars cost the main thread nothing per
// frame — where the old engine spent a `drawImage` per star and topped out at
// eighteen hundred.
//
// The pipeline is deliberately small:
//
//   scene FBO (half-float HDR)  ← the whole sky renders here, unclamped
//        │
//        ├─ bright-pass → dual-Kawase down/up chain → bloom
//        │
//        └─ composite: scene + bloom → ACES tonemap → dither → the canvas
//
// HDR is the point. In the old engine "glow" was a pre-baked halo PNG blitted
// under every bright star, which is why brightness had to be spent as SIZE
// (a bigger sticker) and why the comments are full of hard caps fighting bokeh
// discs. Here a star simply emits more than 1.0 and the bloom pass discovers
// it, the way a real sensor does. Brightness is finally allowed to be light.

// ── capability tiers ─────────────────────────────────────────────────────────
// The floor is the Instagram in-app browser on a mid-range phone, which is where
// most of this product is actually seen. Tier 0 is a modern device; tier 2 is a
// weak one holding on. The frame-time governor walks between them at runtime;
// nothing here is chosen once and frozen.
export const TIER = {
  0: { stars: 46000, deep: 9000, gasSteps: 32, gasScale: 0.5, bloomLevels: 5, dust: 900, passers: 40 },
  1: { stars: 26000, deep: 5000, gasSteps: 20, gasScale: 0.5, bloomLevels: 4, dust: 500, passers: 28 },
  2: { stars: 12000, deep: 2400, gasSteps: 12, gasScale: 0.34, bloomLevels: 3, dust: 240, passers: 18 },
}

export function createGL(canvas) {
  const attrs = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  }
  let gl = null
  try {
    gl = canvas.getContext('webgl2', attrs)
  } catch (e) {
    gl = null
  }
  if (!gl) return null

  // Half-float render targets are what make HDR possible. WebGL2 can *sample*
  // HALF_FLOAT natively but rendering INTO one needs the extension; without it
  // we fall back to 8-bit and pre-scale the exposure so the sky still reads
  // (bloom gets coarser, nothing breaks).
  const hf = gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float')
  const caps = {
    hdr: !!hf,
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    // A renderer string is the only honest signal we get about the class of
    // GPU we landed on, and it decides where the governor STARTS rather than
    // where it can go — a weak phone shouldn't have to drop three frames to
    // discover it is a weak phone.
    renderer: (() => {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      try {
        return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : ''
      } catch (e) {
        return ''
      }
    })(),
  }
  return { gl, caps }
}

// A first guess at the quality tier from the device itself, so the opening
// seconds already look right instead of being corrected after the fact.
export function guessTier(caps) {
  const r = (caps.renderer || '').toLowerCase()
  const mem = navigator.deviceMemory || 4
  const cores = navigator.hardwareConcurrency || 4
  const small = Math.min(window.innerWidth, window.innerHeight) < 420
  // A phone is a phone whatever its spec sheet says. `deviceMemory` on a recent
  // Android reads 8 and `hardwareConcurrency` reads eight cores, which used to
  // put a handset on the top tier — forty-six thousand stars and a thirty-two
  // step volumetric march, at up to twice device resolution, on a chip that is
  // also thermally throttled and drawing the rest of the interface. The
  // governor walked it back down eventually, but "eventually" is several
  // seconds of the first impression this product gets to make.
  const handheld = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
    : small
  // Anything clearly software-rendered goes straight to the floor.
  if (/swiftshader|llvmpipe|software|mesa offscreen/.test(r)) return 2
  if (mem <= 2 || cores <= 4) return small ? 2 : 1
  if (mem <= 4 && small) return 1
  // The only change here: no handheld starts on the top tier. Everything below
  // is left exactly where it was, because a phone that was already on tier 1
  // was already being asked for something it can draw, and the governor still
  // walks anything that cannot keep up down from here.
  return handheld ? 1 : 0
}

// ── shaders ──────────────────────────────────────────────────────────────────
export function compile(gl, vsSrc, fsSrc, name = 'program') {
  const vs = shader(gl, gl.VERTEX_SHADER, vsSrc, name + ':vs')
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSrc, name + ':fs')
  if (!vs || !fs) return null
  const p = gl.createProgram()
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    if (import.meta.env && import.meta.env.DEV) console.warn('[sky] link failed', name, gl.getProgramInfoLog(p))
    gl.deleteProgram(p)
    return null
  }
  // Uniform locations are looked up ONCE and memoized. `getUniformLocation` is
  // a synchronous driver round-trip; calling it per frame per uniform is one of
  // the classic ways a WebGL renderer quietly becomes CPU-bound.
  const u = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)
    if (!info) continue
    const base = info.name.replace(/\[0\]$/, '')
    u[base] = gl.getUniformLocation(p, info.name)
  }
  const a = {}
  const an = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES)
  for (let i = 0; i < an; i++) {
    const info = gl.getActiveAttrib(p, i)
    if (!info) continue
    a[info.name] = gl.getAttribLocation(p, info.name)
  }
  return { p, u, a }
}

function shader(gl, type, src, label) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    if (import.meta.env && import.meta.env.DEV) {
      console.warn('[sky] compile failed', label, gl.getShaderInfoLog(s))
      console.warn(src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'))
    }
    gl.deleteShader(s)
    return null
  }
  return s
}

// ── render targets ───────────────────────────────────────────────────────────
// One color attachment, no depth. The sky needs no depth buffer: every layer is
// additive or explicitly composited in a fixed order (see engine.js's pass
// list), and additive blending is order-independent by construction — which is
// exactly why the old engine's per-frame JS sort of every gas puff can simply
// be deleted rather than ported.
export class Target {
  constructor(gl, caps, w, h, opts = {}) {
    this.gl = gl
    this.hdr = opts.hdr !== false && caps.hdr
    this.filter = opts.filter || gl.LINEAR
    this.fbo = gl.createFramebuffer()
    this.tex = gl.createTexture()
    this.w = 0
    this.h = 0
    this.resize(w, h)
  }
  resize(w, h) {
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    if (w === this.w && h === this.h) return
    const gl = this.gl
    this.w = w
    this.h = h
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      this.hdr ? gl.RGBA16F : gl.RGBA8,
      w, h, 0, gl.RGBA,
      this.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
  bind() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, this.w, this.h)
  }
  destroy() {
    const gl = this.gl
    gl.deleteFramebuffer(this.fbo)
    gl.deleteTexture(this.tex)
  }
}

// ── the fullscreen triangle ──────────────────────────────────────────────────
// One triangle, not two — a quad's shared diagonal makes the GPU shade the seam
// twice, and every post pass in this engine is fill-rate bound.
export function makeFullscreen(gl) {
  const vao = gl.createVertexArray()
  const buf = gl.createBuffer()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)
  return { vao, buf, draw: () => { gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3) } }
}

export const FULLSCREEN_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

// The unit quad every star, puff and sprite is instanced over. Corner offsets
// live in [-1,1]; the instance attributes carry everything else.
export function makeQuad(gl) {
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  return buf
}

// ── shader fragments shared across passes ────────────────────────────────────
// GLSL has no include, so the pieces every pass needs are string constants that
// get concatenated. Keeping them in one place is what stops the two skies from
// drifting apart at the pixel level, which is exactly what happened to the two
// canvas engines.

// Hash / value noise, used for twinkle jitter and the gas field's detail octave.
export const GLSL_HASH = `
float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec3 hash31(float p){
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}
float hash13(vec3 p3){
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
`

// The point-spread function every star's light is drawn through. This is the
// single most important function in the renderer: it is what makes a point of
// light read as a STAR rather than as a soft dot, and it is evaluated
// analytically per pixel instead of being sampled from a baked sprite, so it
// stays exact at every magnification — including the ones the old mip ladder
// existed to paper over.
//
//   · an Airy-like core: a very tight, very bright heart
//   · a broad, low aureole (real optics scatter light much further than a
//     gaussian suggests; without it bright stars look pasted on)
//   · four tapered diffraction rays, their strength earned by brightness
//
// Here "r" is the distance from the star's centre in units of its core radius.
export const GLSL_PSF = `
float psfCore(float r){
  // a steep exponential heart with a soft shoulder — the shoulder is what
  // separates a rendered star from a glowing sphere
  float core = exp(-r * r * 5.2);
  float halo = exp(-r * 1.55) * 0.22;
  float aureole = 0.030 / (1.0 + r * r * 0.85);
  return core + halo + aureole;
}
// four rays (plus a faint 45-degree secondary pair), tapering to a true point.
// "spin" lets a star's spikes sit at its own angle so a field of bright stars
// never reads as a stamped grid of identical plus signs.
float psfSpikes(vec2 d, float r, float spin){
  float cs = cos(spin), sn = sin(spin);
  vec2 q = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
  vec2 a = abs(q);
  float taper = exp(-r * 0.42);
  float horiz = exp(-a.y * 26.0) * taper;
  float vert  = exp(-a.x * 26.0) * taper * 0.82;
  vec2 dg = abs(vec2(q.x - q.y, q.x + q.y) * 0.70710678);
  float diag = (exp(-dg.x * 46.0) + exp(-dg.y * 46.0)) * taper * 0.16;
  return horiz + vert + diag;
}
`

// ACES filmic, the fitted RRT+ODT approximation. It is what lets a star burn to
// 40× white without the highlight turning into a flat clipped disc — hue is
// preserved into the shoulder, so a hot blue star stays blue at its core
// instead of blowing out to featureless paper.
export const GLSL_TONEMAP = `
vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
`

// sky/fx.js — everything in the sky that is an EVENT rather than a star.
//
// Meteors and their trails, the wavefront a tap sends through the disk plane,
// the motes drawn inward by a match, the light echo of the merger, the sparks
// of a gathering community, the glisten when a new ping lands. In the canvas
// engines each of these was its own hand-rolled draw loop with its own blend
// juggling; here they are all instances of two small passes.
//
//   BillboardPass — additive light. A position (in world space, so it tilts and
//                   parallaxes with the galaxy, or in screen space when it
//                   genuinely belongs to the glass), a size, a shape, a colour,
//                   an intensity. Because it writes into the same HDR buffer as
//                   the stars, an event's light blooms through the same optics
//                   as everything else and can never look pasted on.
//
//   SpritePass    — the @ pills and anything else with legible type on it.
//                   Baked once to an offscreen 2D canvas, uploaded as a
//                   texture, blitted with straight alpha. Text is the one thing
//                   a shader has no business drawing.

import { compile, makeQuad, GLSL_HASH } from './gl.js'

const BILLBOARD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPos;    // xyz, w: 0 = world space, 1 = screen space
layout(location=2) in vec4 aParam;  // size, shape, rotation, aspect
layout(location=3) in vec4 aColor;  // rgb, intensity

uniform mat3  uR;
uniform vec3  uEye;
uniform vec2  uCenter, uViewport;
uniform float uUnit, uCam, uFocal, uScale;

out vec2  vUv;
out vec3  vColor;
out float vI;
out float vShape;

void main(){
  float px;
  vec2 centre;
  if (aPos.w > 0.5) {
    centre = aPos.xy * uScale;
    px = aParam.x * uScale;
  } else {
    vec3 v = uR * aPos.xyz;
    float zc = uCam + v.z - uEye.z;
    if (zc <= 0.008) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float persp = uFocal / zc;
    centre = uCenter * uScale + (v.xy - uEye.xy) * uUnit * uScale * persp;
    // a world-space billboard's size is a world size, so it grows on approach
    px = aParam.x * uUnit * uScale * persp;
  }
  px = min(px, min(uViewport.x, uViewport.y) * 1.4);
  float c = cos(aParam.z), s = sin(aParam.z);
  vec2 o = vec2(aCorner.x * px * aParam.w, aCorner.y * px);
  vec2 rot = vec2(o.x * c - o.y * s, o.x * s + o.y * c);
  vUv = aCorner;
  vColor = aColor.rgb;
  vI = aColor.a;
  vShape = aParam.y;
  vec2 p = centre + rot;
  gl_Position = vec4((p / uViewport) * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
}
`

const BILLBOARD_FS = `#version 300 es
precision highp float;
${GLSL_HASH}
in vec2  vUv;
in vec3  vColor;
in float vI;
in float vShape;
out vec4 frag;

void main(){
  float r = length(vUv);
  float a;
  if (vShape < 0.5) {
    // a soft glow — the same long exhale a star's aureole has, so an event's
    // light and a star's light are made of the same stuff
    a = exp(-r * r * 3.4) + 0.16 * exp(-r * 2.2);
  } else if (vShape < 1.5) {
    // a hairline ring: the wavefront's leading edge
    float d = abs(r - 0.78);
    a = exp(-d * d * 320.0) + 0.1 * exp(-d * 26.0);
  } else if (vShape < 2.5) {
    // the four-point glisten — the product's own mark, as light
    vec2 q = abs(vUv);
    float cross = exp(-q.y * 42.0) + exp(-q.x * 42.0);
    a = (exp(-r * r * 26.0) * 1.6 + cross * exp(-r * 2.6) * 0.55);
  } else {
    // a streak segment: hot along its spine, feathering away across it
    a = exp(-vUv.y * vUv.y * 9.0) * exp(-max(0.0, abs(vUv.x) - 0.25) * 3.4);
  }
  // Take the falloff to exactly zero at the quad's rim. A soft gaussian is
  // still faintly non-zero in the corners, and against a near-black sky at
  // event brightness that reads as a visible rectangle — which is precisely
  // what a big merger flash was drawing before this line existed.
  a *= smoothstep(1.0, 0.7, r);
  if (a < 0.0016) discard;
  frag = vec4(vColor * (a * vI), 1.0);
}
`

const SPRITE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
uniform vec2 uPos, uSize, uViewport;
uniform float uScale;
out vec2 vUv;
void main(){
  vUv = aCorner * 0.5 + 0.5;
  vec2 p = (uPos + aCorner * uSize * 0.5) * uScale;
  gl_Position = vec4((p / uViewport) * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
}
`

const SPRITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uTex;
uniform float uAlpha;
void main(){
  vec4 c = texture(uTex, vUv);
  // the pills are baked in sRGB; the scene buffer is linear light
  frag = vec4(pow(c.rgb, vec3(2.2)) * c.a * uAlpha, c.a * uAlpha);
}
`

export class BillboardPass {
  constructor(gl, capacity = 2048) {
    this.gl = gl
    this.prog = compile(gl, BILLBOARD_VS, BILLBOARD_FS, 'fx:billboard')
    this.capacity = capacity
    this.count = 0
    this.pos = new Float32Array(capacity * 4)
    this.param = new Float32Array(capacity * 4)
    this.color = new Float32Array(capacity * 4)
    this.quad = makeQuad(gl)
    this.vao = gl.createVertexArray()
    this.posBuf = gl.createBuffer()
    this.paramBuf = gl.createBuffer()
    this.colorBuf = gl.createBuffer()
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)
    const bind = (buf, loc, arr) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 16, 0)
      gl.vertexAttribDivisor(loc, 1)
    }
    bind(this.posBuf, 1, this.pos)
    bind(this.paramBuf, 2, this.param)
    bind(this.colorBuf, 3, this.color)
    gl.bindVertexArray(null)
  }

  reset() {
    this.count = 0
  }

  // world-space light: tilts, parallaxes and grows with the galaxy
  world(x, y, z, size, color, intensity, shape = 0, rot = 0, aspect = 1) {
    if (this.count >= this.capacity || intensity <= 0.0005) return
    const i = this.count++
    const o = i * 4
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z; this.pos[o + 3] = 0
    this.param[o] = size; this.param[o + 1] = shape; this.param[o + 2] = rot; this.param[o + 3] = aspect
    this.color[o] = color[0]; this.color[o + 1] = color[1]; this.color[o + 2] = color[2]; this.color[o + 3] = intensity
  }

  // screen-space light: for the things that genuinely live on the glass —
  // the send-off's coalescing point under the DOM morph, an ambient meteor
  screen(x, y, sizePx, color, intensity, shape = 0, rot = 0, aspect = 1) {
    if (this.count >= this.capacity || intensity <= 0.0005) return
    const i = this.count++
    const o = i * 4
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = 0; this.pos[o + 3] = 1
    this.param[o] = sizePx; this.param[o + 1] = shape; this.param[o + 2] = rot; this.param[o + 3] = aspect
    this.color[o] = color[0]; this.color[o + 1] = color[1]; this.color[o + 2] = color[2]; this.color[o + 3] = intensity
  }

  draw(cam, ctx) {
    if (!this.count || !this.prog) return
    const gl = this.gl
    gl.useProgram(this.prog.p)
    const u = this.prog.u
    gl.uniformMatrix3fv(u.uR, false, cam.R)
    gl.uniform3f(u.uEye, cam.eye.x, cam.eye.y, cam.eye.z)
    gl.uniform2f(u.uCenter, cam.cx, cam.cy)
    gl.uniform2f(u.uViewport, ctx.width, ctx.height)
    gl.uniform1f(u.uUnit, cam.unit)
    gl.uniform1f(u.uCam, ctx.CAM)
    gl.uniform1f(u.uFocal, ctx.FOCAL)
    gl.uniform1f(u.uScale, ctx.scale)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos, 0, this.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.paramBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.param, 0, this.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color, 0, this.count * 4)
    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count)
    gl.bindVertexArray(null)
  }

  destroy() {
    const gl = this.gl
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.posBuf)
    gl.deleteBuffer(this.paramBuf)
    gl.deleteBuffer(this.colorBuf)
    gl.deleteBuffer(this.quad)
    if (this.prog) gl.deleteProgram(this.prog.p)
  }
}

// The @ layer. Each handle is baked ONCE to a small offscreen canvas — a glass
// pill, a hairline border, the @ in the product's amber, the handle in cream —
// uploaded as a texture, and blitted thereafter. A sky full of handles costs
// what a sky full of handles should cost: nothing per frame.
export class SpritePass {
  constructor(gl) {
    this.gl = gl
    this.prog = compile(gl, SPRITE_VS, SPRITE_FS, 'fx:sprite')
    this.quad = makeQuad(gl)
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    this.textures = new Map()
    this.queue = []
  }

  // upload (and memoize) a baked canvas
  texture(key, bake) {
    let t = this.textures.get(key)
    if (t) return t
    const gl = this.gl
    const canvas = bake()
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    t = { tex, w: canvas._w || canvas.width, h: canvas._h || canvas.height }
    this.textures.set(key, t)
    return t
  }

  reset() {
    this.queue.length = 0
  }
  push(t, x, y, w, h, alpha) {
    if (alpha > 0.004) this.queue.push([t, x, y, w, h, alpha])
  }

  draw(ctx) {
    if (!this.queue.length || !this.prog) return
    const gl = this.gl
    gl.useProgram(this.prog.p)
    gl.enable(gl.BLEND)
    // premultiplied — the shader multiplies rgb by alpha, so a pill's glass
    // edge composites without the dark fringe straight alpha would leave
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform2f(this.prog.u.uViewport, ctx.width, ctx.height)
    gl.uniform1f(this.prog.u.uScale, ctx.scale)
    gl.uniform1i(this.prog.u.uTex, 1)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindVertexArray(this.vao)
    for (const [t, x, y, w, h, a] of this.queue) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex)
      gl.uniform2f(this.prog.u.uPos, x, y)
      gl.uniform2f(this.prog.u.uSize, w, h)
      gl.uniform1f(this.prog.u.uAlpha, a)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    gl.bindVertexArray(null)
  }

  destroy() {
    const gl = this.gl
    for (const t of this.textures.values()) gl.deleteTexture(t.tex)
    this.textures.clear()
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quad)
    if (this.prog) gl.deleteProgram(this.prog.p)
  }
}

// The baked @ pill. Unchanged in spirit from the canvas engine's version —
// this shape is right and there is no reason to redesign it — but baked at 3x
// so it stays crisp when a dive magnifies the sky around it.
export function bakeTag(text, { own = false, bright = false, you = '#FF9E6B' } = {}) {
  const SCALE = 3
  const size = 11
  const font = `700 ${size}px 'Space Mono', monospace`
  const meas = document.createElement('canvas').getContext('2d')
  meas.font = font
  const tw = meas.measureText(text).width
  const atW = meas.measureText('@').width
  const padX = 9
  const h = 21
  const w = Math.ceil(tw + padX * 2)
  const cv = document.createElement('canvas')
  cv.width = w * SCALE
  cv.height = h * SCALE
  const g = cv.getContext('2d')
  g.scale(SCALE, SCALE)
  const r = h / 2 - 0.5
  g.beginPath()
  g.moveTo(r + 0.5, 0.5)
  g.arcTo(w - 0.5, 0.5, w - 0.5, h - 0.5, r)
  g.arcTo(w - 0.5, h - 0.5, 0.5, h - 0.5, r)
  g.arcTo(0.5, h - 0.5, 0.5, 0.5, r)
  g.arcTo(0.5, 0.5, w - 0.5, 0.5, r)
  g.closePath()
  g.fillStyle = bright ? 'rgba(13,9,22,0.88)' : 'rgba(13,9,22,0.74)'
  g.fill()
  g.lineWidth = 1
  g.strokeStyle = own || bright ? rgbaHex(you, own ? 0.62 : 0.5) : 'rgba(243,236,246,0.22)'
  g.stroke()
  g.font = font
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  const cy = h / 2 + 0.5
  g.fillStyle = rgbaHex(you, 0.95)
  g.fillText('@', padX, cy)
  g.fillStyle = bright ? 'rgba(255,250,244,0.98)' : 'rgba(243,236,246,0.92)'
  g.fillText(text.slice(1), padX + atW, cy)
  cv._w = w
  cv._h = h
  return cv
}

function rgbaHex(hex, a) {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

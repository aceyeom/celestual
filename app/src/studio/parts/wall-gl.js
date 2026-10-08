// ── the wall, in WebGL ──────────────────────────────────────────────────────
//
// The reel's wall of letters at the size it is meant to be: some three and a
// half thousand letters on the inside of a hall that curves round towards
// whoever stands in it and rises out of sight, each one a cell of the sheet
// of real screens (films/wall-atlas.jsx), drawn in true perspective as one
// instanced draw a frame. Each throws its own colour on the wall round it,
// the dust in the air catches it, a letter's distance from the plane the
// camera is focused on softens it (the texture's own mip levels), and the
// hall's haze takes the furthest. Plain WebGL2 with no library, and nothing
// in it but the wall: the reel (reel.jsx) says where the camera is and how
// lit each letter is, and this draws it.

import { ATLAS, CELLS, cellTint } from './wall-letters.js'

// ── a little linear algebra, column major as GL keeps it ────────────────────
export const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
}
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}
function lookAt(eye, target, up) {
  const z = v3.norm(v3.sub(eye, target))
  const x = v3.norm(v3.cross(up, z))
  const y = v3.cross(z, x)
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1]
}
function mul(a, b) {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
// a camera: where it is, what it looks at, its roll, its field of view
export function cameraOf({ eye, target, roll = 0, fov = 46 }, w = 1080, h = 1920) {
  const fwd = v3.norm(v3.sub(target, eye))
  const side0 = v3.norm(v3.cross(fwd, [0, 1, 0]))
  const up0 = v3.add(v3.scale([0, 1, 0], Math.cos(roll)), v3.scale(side0, Math.sin(roll)))
  const vp = mul(perspective((fov * Math.PI) / 180, w / h, 0.05, 400), lookAt(eye, target, up0))
  // the lens's own right and up, for what always faces it
  const side = v3.norm(v3.cross(fwd, up0))
  const up = v3.cross(side, fwd)
  // a point of the world to the frame's pixels, and how far in front of
  // the lens it is (behind it, null)
  const project = (p) => {
    const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12]
    const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13]
    const ww = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15]
    if (ww <= 0.01) return null
    return [((x / ww + 1) / 2) * w, ((1 - y / ww) / 2) * h, ww]
  }
  return { eye, vp, project, side, up, fwd, fov }
}

// ── the wall ────────────────────────────────────────────────────────────────
// Every letter: its middle, the half of its width and of its height as
// vectors (so a letter can stand at any angle), the cell of the sheet it
// shows, the colour of the light it throws, and how lit it is. The inside
// face of a hall: a grid curved round a circle of `R` towards whoever stands
// in it, far taller than it is wide, every letter a hair off its place and
// its square, so it is a wall people put letters on and not a table of
// them. No letter is within three of itself, and no two neighbours are lit
// in one colour.
export const UNIT = { w: 1, h: ATLAS.h / ATLAS.w }
export const GRID = { sx: 1.14, sy: UNIT.h + 0.17, cols: 30, below: 14, above: 34, R: 44 }
const hash = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
export function wallOf(haloOf = () => [1, 1, 1]) {
  const out = []
  const at = new Map()
  const key = (i, j) => (i + 500) * 1000 + j + 500
  at.set(key(0, 0), 0)
  for (let j = -GRID.below; j <= GRID.above; j++) {
    for (let i = -GRID.cols; i <= GRID.cols; i++) {
      const k = (i + 100) * 977 + (j + 100) * 131
      const home = i === 0 && j === 0
      let cell = 0
      if (!home) {
        const near = new Set()
        const tints = new Set()
        for (let dj = -3; dj <= 3; dj++) {
          for (let di = -3; di <= 3; di++) {
            const c = at.get(key(i + di, j + dj))
            if (c == null) continue
            near.add(c)
            if (Math.abs(di) <= 1 && Math.abs(dj) <= 1) tints.add(cellTint(c))
          }
        }
        let pool = []
        for (let c = 1; c < CELLS; c++) if (!near.has(c) && !tints.has(cellTint(c))) pool.push(c)
        if (!pool.length) for (let c = 1; c < CELLS; c++) if (!near.has(c)) pool.push(c)
        cell = pool[Math.floor(hash(k + 7) * pool.length)]
        at.set(key(i, j), cell)
      }
      const jx = home ? 0 : (hash(k) - 0.5) * 0.12
      const jy = home ? 0 : (hash(k + 1) - 0.5) * 0.12
      const jz = home ? 0 : (hash(k + 2) - 0.5) * 0.3
      const tilt = home ? 0 : (hash(k + 3) - 0.5) * 0.07
      const th = (i * GRID.sx + jx) / GRID.R
      // facing the middle of the hall
      const n = [-Math.sin(th), 0, Math.cos(th)]
      const pos = [GRID.R * Math.sin(th) + n[0] * jz, j * GRID.sy + jy, GRID.R * (1 - Math.cos(th)) + n[2] * jz]
      const right0 = [Math.cos(th), 0, Math.sin(th)]
      const right = v3.scale(v3.add(v3.scale(right0, Math.cos(tilt)), v3.scale([0, 1, 0], Math.sin(tilt))), UNIT.w / 2)
      const up = v3.scale(v3.add(v3.scale([0, 1, 0], Math.cos(tilt)), v3.scale(right0, -Math.sin(tilt))), UNIT.h / 2)
      out.push({ i, j, pos, right, up, cell, home, seed: hash(k + 11), dist: Math.hypot(i * GRID.sx, j * GRID.sy), halo: haloOf(cell) })
    }
  }
  return out
}

// the dust in the hall's air: motes that catch the screens' light, each on
// its own slow drift, soft as a lens sees what is not in focus
export const DUST = Array.from({ length: 320 }, (_, n) => ({
  pos: [(hash(n * 3 + 1) - 0.5) * 30, -6 + hash(n * 3 + 2) * 40, 0.8 + hash(n * 3 + 3) ** 0.8 * 26],
  vel: [(hash(n * 5 + 1) - 0.5) * 0.12, 0.05 + hash(n * 5 + 2) * 0.12, (hash(n * 5 + 3) - 0.5) * 0.08],
  size: 0.012 + hash(n * 7 + 1) ** 3 * 0.035,
  glow: 0.25 + hash(n * 7 + 2) * 0.75,
}))

// ── the letters ──
const VERT = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec3 iRight;
layout(location=3) in vec3 iUp;
layout(location=4) in vec4 iUv;
layout(location=5) in float iLit;
layout(location=6) in vec3 iHalo;
uniform mat4 uVP;
uniform vec3 uEye;
uniform float uFocus;
uniform float uAperture;
uniform float uFogStart;
uniform float uFog;
out vec2 vUv;
out float vLit;
out float vBias;
void main() {
  vec3 p = iPos + iRight * aCorner.x + iUp * aCorner.y;
  gl_Position = uVP * vec4(p, 1.0);
  vec2 k = aCorner * 0.5 + 0.5;
  vUv = vec2(mix(iUv.x, iUv.z, k.x), mix(iUv.w, iUv.y, k.y));
  float d = distance(iPos, uEye);
  vBias = clamp(abs(d - uFocus) / max(d, 0.5) * uAperture, 0.0, 5.0);
  vLit = iLit * exp(-max(0.0, d - uFogStart) * uFog);
}`
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
in vec2 vUv;
in float vLit;
in float vBias;
out vec4 o;
void main() {
  vec3 c = texture(uAtlas, vUv, vBias).rgb;
  o = vec4(c * vLit, 1.0);
}`

// ── the light each letter throws on the wall round it ──
const HALO_VERT = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec3 iRight;
layout(location=3) in vec3 iUp;
layout(location=5) in float iLit;
layout(location=6) in vec3 iHalo;
uniform mat4 uVP;
uniform vec3 uEye;
uniform float uFogStart;
uniform float uFog;
uniform float uSpread;
out vec2 vC;
out vec3 vCol;
void main() {
  vec3 n = normalize(cross(iRight, iUp));
  vec3 p = iPos - n * 0.04 + (iRight * aCorner.x + iUp * aCorner.y) * uSpread;
  gl_Position = uVP * vec4(p, 1.0);
  vC = aCorner;
  float d = distance(iPos, uEye);
  vCol = iHalo * iLit * exp(-max(0.0, d - uFogStart) * uFog);
}`
const HALO_FRAG = `#version 300 es
precision highp float;
in vec2 vC;
in vec3 vCol;
out vec4 o;
void main() {
  float r = length(vC);
  float a = exp(-r * r * 3.4) * (1.0 - smoothstep(0.82, 1.0, r));
  o = vec4(vCol * a, 1.0);
}`

// ── the dust ──
const DUST_VERT = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec3 iVel;
layout(location=3) in vec2 iSize;
uniform mat4 uVP;
uniform vec3 uEye;
uniform vec3 uSide;
uniform vec3 uUp;
uniform float uTime;
uniform float uFocus;
uniform float uBokeh;
uniform float uLight;
out vec2 vC;
out float vA;
void main() {
  vec3 c = iPos + iVel * uTime + vec3(sin(uTime * 0.7 + iPos.y) * 0.05, 0.0, cos(uTime * 0.5 + iPos.x) * 0.05);
  float d = distance(c, uEye);
  float blur = abs(d - uFocus) * uBokeh;
  float s = iSize.x + blur;
  vec3 p = c + (uSide * aCorner.x + uUp * aCorner.y) * s;
  gl_Position = uVP * vec4(p, 1.0);
  vC = aCorner;
  vA = uLight * iSize.y * min(1.0, (iSize.x * iSize.x) / (s * s) * 1.6) * smoothstep(0.3, 1.2, d);
}`
const DUST_FRAG = `#version 300 es
precision highp float;
in vec2 vC;
in float vA;
out vec4 o;
void main() {
  float r = length(vC);
  float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA;
  o = vec4(vec3(1.0, 0.93, 0.84) * a, 1.0);
}`

function shader(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`wall-gl: ${gl.getShaderInfoLog(s)}`)
  return s
}
function program(gl, vs, fs, names) {
  const prog = gl.createProgram()
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`wall-gl: ${gl.getProgramInfoLog(prog)}`)
  return { prog, u: Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)])) }
}

export class WallGL {
  constructor(canvas, image, letters) {
    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: false })
    if (!gl) throw new Error('wall-gl: no WebGL2')
    this.gl = gl
    this.letters = letters
    this.wall = program(gl, VERT, FRAG, ['uVP', 'uEye', 'uFocus', 'uAperture', 'uFogStart', 'uFog', 'uAtlas'])
    this.halo = program(gl, HALO_VERT, HALO_FRAG, ['uVP', 'uEye', 'uFogStart', 'uFog', 'uSpread'])
    this.dust = program(gl, DUST_VERT, DUST_FRAG, ['uVP', 'uEye', 'uSide', 'uUp', 'uTime', 'uFocus', 'uBokeh', 'uLight'])
    const F = 4
    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    // per letter: pos 3, right 3, up 3, uv 4, lit 1, halo 3
    this.stride = 17
    this.data = new Float32Array(letters.length * this.stride)
    letters.forEach((l, n) => {
      const c = l.cell
      const u0 = ((c % ATLAS.cols) * ATLAS.w + 1) / (ATLAS.cols * ATLAS.w)
      const v0 = (Math.floor(c / ATLAS.cols) * ATLAS.h + 1) / (ATLAS.rows * ATLAS.h)
      const u1 = ((c % ATLAS.cols + 1) * ATLAS.w - 1) / (ATLAS.cols * ATLAS.w)
      const v1 = ((Math.floor(c / ATLAS.cols) + 1) * ATLAS.h - 1) / (ATLAS.rows * ATLAS.h)
      this.data.set([...l.pos, ...l.right, ...l.up, u0, v0, u1, v1, 0, ...l.halo], n * this.stride)
    })
    this.inst = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst)
    gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW)
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst)
    for (const [loc, size, off] of [[1, 3, 0], [2, 3, 3], [3, 3, 6], [4, 4, 9], [5, 1, 13], [6, 3, 14]]) {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, this.stride * F, off * F)
      gl.vertexAttribDivisor(loc, 1)
    }
    // the dust: pos 3, vel 3, size and glow 2
    const dust = new Float32Array(DUST.length * 8)
    DUST.forEach((d, n) => dust.set([...d.pos, ...d.vel, d.size, d.glow], n * 8))
    this.dvao = gl.createVertexArray()
    gl.bindVertexArray(this.dvao)
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const db = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, db)
    gl.bufferData(gl.ARRAY_BUFFER, dust, gl.STATIC_DRAW)
    for (const [loc, size, off] of [[1, 3, 0], [2, 3, 3], [3, 2, 6]]) {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 8 * F, off * F)
      gl.vertexAttribDivisor(loc, 1)
    }
    gl.bindVertexArray(null)
    // the sheet, with every mip level, filtered as steeply as the card allows
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const an = gl.getExtension('EXT_texture_filter_anisotropic')
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
    this.tex = tex
  }

  // one frame: the camera; each letter's light and the light it throws;
  // the plane in focus and how quickly the rest go soft; where the haze
  // begins; and the dust, at `time` seconds, as lit as `dust`
  draw(cam, lit, halo, { focus = 8, aperture = 1, fogStart = 10, fog = 0.03, spread = 2.2, time = 0, dust = 0, bokeh = 0.02 } = {}) {
    const { gl } = this
    for (let n = 0; n < this.letters.length; n++) this.data[n * this.stride + 13] = lit[n]
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data)
    const vp = new Float32Array(cam.vp)
    // the letters, opaque, nearest first in the depth buffer
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.disable(gl.BLEND)
    gl.useProgram(this.wall.prog)
    let u = this.wall.u
    gl.uniformMatrix4fv(u.uVP, false, vp)
    gl.uniform3fv(u.uEye, cam.eye)
    gl.uniform1f(u.uFocus, focus)
    gl.uniform1f(u.uAperture, aperture)
    gl.uniform1f(u.uFogStart, fogStart)
    gl.uniform1f(u.uFog, fog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.uniform1i(u.uAtlas, 0)
    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.letters.length)
    // the light round them, added, behind every letter that stands in front
    for (let n = 0; n < this.letters.length; n++) this.data[n * this.stride + 13] = halo[n]
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data)
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.useProgram(this.halo.prog)
    u = this.halo.u
    gl.uniformMatrix4fv(u.uVP, false, vp)
    gl.uniform3fv(u.uEye, cam.eye)
    gl.uniform1f(u.uFogStart, fogStart)
    gl.uniform1f(u.uFog, fog)
    gl.uniform1f(u.uSpread, spread)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.letters.length)
    // and the dust in the air
    if (dust > 0.001) {
      gl.useProgram(this.dust.prog)
      u = this.dust.u
      gl.uniformMatrix4fv(u.uVP, false, vp)
      gl.uniform3fv(u.uEye, cam.eye)
      gl.uniform3fv(u.uSide, cam.side)
      gl.uniform3fv(u.uUp, cam.up)
      gl.uniform1f(u.uTime, time)
      gl.uniform1f(u.uFocus, focus)
      gl.uniform1f(u.uBokeh, bokeh)
      gl.uniform1f(u.uLight, dust)
      gl.bindVertexArray(this.dvao)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, DUST.length)
    }
    gl.bindVertexArray(null)
    gl.depthMask(true)
    gl.disable(gl.BLEND)
  }
}

// ── a flat thing put where the wall's camera sees a letter ──────────────────
// The CSS matrix that carries a box `w` by `h` onto the four points a
// letter's corners land on in the frame, so a DOM phone (lin's, typing) can
// stand exactly where the wall's camera draws its cell. The projective map
// of the unit square onto a quadrilateral (Heckbert), scaled to the box.
export function boxOnto(w, h, q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q // top left, top right, bottom right, bottom left
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const hh = (dx1 * dy3 - dx3 * dy1) / den
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + hh * x3
  const c = x0
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + hh * y3
  const f = y0
  // the unit square scaled to the box
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1]
  return `matrix3d(${m.map((v) => v.toFixed(8)).join(',')})`
}

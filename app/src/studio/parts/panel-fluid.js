// ── the panel, alive ────────────────────────────────────────────────────────
//
// The dark the reel goes into after the send is a screen's own panel, and
// light moves in it as ink moves in water. The light is a fluid, solved on
// the graphics card every sixtieth of a second (stable fluids: Jos Stam,
// 1999; its passes after Pavel Dobryakov's WebGL Fluid Simulation, MIT):
// the flow's velocity on a coarse grid, its pressure solved away so it never
// piles up, its eddies kept alive (vorticity confinement), and its dye, the
// light itself, carried along it on a grid of exactly the panel's cells. So
// a cell of the screen shows the light that has drifted into it: as a star,
// drawn in the panel's own pixels, a point where a little light has come
// and a sparkle where a lot has, over a faint haze of the light's colour
// (three.js; the stars' glow is postprocessing's mipmap bloom).
//
// It is drawn from `t` and nothing else. The flow is stepped from its start
// at a fixed rate, the story's own `script` adding light and moving it at
// each step, so any frame is the same frame however it is come to: forward
// a step at a time, or from the start again when the film goes back.
import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing'

const VERT = /* glsl */ `
  uniform vec2 texelSize;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main () {
    vUv = position.xy * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
const HEAD = /* glsl */ `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
`
const FRAG = {
  // a little of something added round a point: light, or a push
  splat: `
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform vec2 uSize;
    uniform vec3 uValue;
    uniform float uRadius;
    void main () {
      vec2 d = (vUv - uPoint) * uSize;
      float g = exp(-dot(d, d) / (uRadius * uRadius));
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + g * uValue, 1.0);
    }`,
  // light taken away round a point, or everywhere
  fade: `
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform vec2 uSize;
    uniform float uRadius;
    uniform float uAmount;
    void main () {
      vec2 d = (vUv - uPoint) * uSize;
      float g = uRadius > 0.0 ? exp(-dot(d, d) / (uRadius * uRadius)) : 1.0;
      gl_FragColor = texture2D(uTarget, vUv) * (1.0 - uAmount * g);
    }`,
  advect: `
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform float dt;
    uniform float dissipation;
    uniform vec2 simTexel;
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * simTexel;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
    }`,
  divergence: `
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,
  curl: `
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,
  vorticity: `
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 v = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
    }`,
  scale: `
    uniform sampler2D uTarget;
    uniform float uAmount;
    void main () { gl_FragColor = uAmount * texture2D(uTarget, vUv); }`,
  pressure: `
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }`,
  gradient: `
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(v, 0.0, 1.0);
    }`,
  // the panel as the camera sees it, a night of the screen's own pixels:
  // every pixel of the frame back to its place on the panel, its cell, and
  // where in its cell. A cell is a star waiting for light, each with its own
  // need of it, so a little light lights only a few and a lot lights most;
  // the more light has come to it, the bigger it shows, from a point to a
  // cross to a longer cross to a sparkle, each drawn a pixel of the panel at
  // a time and twinkling slowly in its own time; mostly the white of a star,
  // a little of the light's own colour, over a faint haze of that colour
  display: `
    uniform sampler2D uDye;
    uniform vec2 uCells;
    uniform vec2 uMargin;
    uniform vec2 uOrigin;
    uniform float uCell;
    uniform vec2 uRes;
    uniform vec2 uA;
    uniform vec2 uF;
    uniform float uZ;
    uniform vec3 uInk;
    uniform float uGrid;
    uniform float uGain;
    uniform float uStar;
    uniform float uHaze;
    uniform float uTint;
    uniform float uTop;
    uniform float uTime;
    float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // a run of the cell's own pixels, [a, b), softened by a frame pixel
    float run (float v, float a, float b, float w) { return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v)); }
    void main () {
      vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
      vec2 p = uA + (frag - uF) / uZ;
      vec2 g = (p - uOrigin) / uCell;
      vec2 id = floor(g);
      vec2 f = fract(g);
      // the cell's own square, unlit, the dark between the cells left dark
      float px = 1.0 / (uCell * uZ);
      float lit = 1.0 - 1.0 / uCell;
      float cell = run(f.x, 0.0, lit, px * 0.5) * run(f.y, 0.0, lit, px * 0.5);
      vec2 tex = (id + uMargin + 0.5) / uCells;
      vec3 dye = max(texture2D(uDye, vec2(tex.x, 1.0 - tex.y)).rgb, 0.0) * uGain;
      float I = dot(dye, vec3(0.2126, 0.7152, 0.0722));
      // its star: its own need of light, its own place in the cell, and its
      // own slow twinkle; and not every cell is a star, so the sky is never
      // the screen's grid
      float need = hash(id + 13.0) < 0.62 ? 0.012 + 1.1 * pow(hash(id), 1.6) : 1e9;
      float over = I - need;
      vec2 at = vec2(2.0 + floor(3.0 * hash(id + 3.1)), 2.0 + floor(3.0 * hash(id + 5.3)));
      float tw = 0.5 + 0.5 * sin(uTime * (0.7 + 1.9 * hash(id + 41.3)) + 6.2832 * hash(id + 7.7));
      float size = over <= 0.0 ? 0.0 : 1.0 + floor(clamp(over / (0.1 + need) * (0.75 + 0.5 * tw), 0.0, 3.99));
      // where in the cell, in the panel's own pixels, the middle at 3
      vec2 q = f * uCell - at + 3.0;
      float w = 0.5 / uZ;
      float star = run(q.x, 3.0, 4.0, w) * run(q.y, 3.0, 4.0, w);
      if (size >= 2.0) star = max(star, 0.55 * max(run(q.x, 2.0, 5.0, w) * run(q.y, 3.0, 4.0, w), run(q.x, 3.0, 4.0, w) * run(q.y, 2.0, 5.0, w)));
      if (size >= 3.0) star = max(star, 0.3 * max(run(q.x, 1.0, 6.0, w) * run(q.y, 3.0, 4.0, w), run(q.x, 3.0, 4.0, w) * run(q.y, 1.0, 6.0, w)));
      if (size >= 4.0) star = max(star, 0.26 * (run(q.x, 2.0, 3.0, w) + run(q.x, 4.0, 5.0, w)) * (run(q.y, 2.0, 3.0, w) + run(q.y, 4.0, 5.0, w)));
      float bright = (0.4 + 0.6 * clamp(over * 2.5, 0.0, 1.0)) * (0.72 + 0.28 * tw);
      vec3 hue = dye / max(1e-4, max(dye.r, max(dye.g, dye.b)));
      vec3 tint = mix(vec3(1.0, 0.97, 0.93), hue, uTint);
      // under the words at the top of the frame the panel is kept darker
      float band = mix(uTop, 1.0, smoothstep(330.0, 640.0, frag.y));
      // and under the stars a haze of the light, smooth across the cells as
      // a nebula is, and held down where the light is strong, so it stays a
      // haze
      vec2 smooth2 = ((p - uOrigin) / uCell + uMargin) / uCells;
      vec3 neb = max(texture2D(uDye, vec2(smooth2.x, 1.0 - smooth2.y)).rgb, 0.0) * uGain;
      float nI = dot(neb, vec3(0.2126, 0.7152, 0.0722));
      // its colour kept quiet, half way to the grey of starlight
      neb = mix(neb, vec3(nI), 0.45);
      vec3 col = cell * uInk * uGrid + (neb / (1.0 + 1.5 * nI) * uHaze + tint * star * bright * uStar) * band;
      gl_FragColor = vec4(col, 1.0);
    }`,
}

const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
export const linear = (rgb) => rgb.map(lin)

export class PanelFluid {
  // `cells`: the panel's grid (its origin on the frame, a cell's size, how
  // many cells the panel is, and a margin of cells round the frame);
  // `script(fluid, t, n)`: what the story does to the flow at the film's
  // moment `t`, the `n`th step; `steps`: the film's moment of each step
  constructor(canvas, { cells, script, steps, w = 1080, h = 1920 }) {
    this.cells = cells
    this.script = script
    this.steps = steps
    this.w = w
    this.h = h
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(w, h, false)
    this.renderer.autoClear = false
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    this.quad = new THREE.Mesh(geo)
    this.quad.frustumCulled = false
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
    // the dye is a cell a texel; the flow is solved at half that
    const { cw, ch } = cells
    this.dyeSize = [cw, ch]
    this.simSize = [Math.ceil(cw / 2), Math.ceil(ch / 2)]
    this.size = [cw * cells.c, ch * cells.c]
    const target = ([x, y], filter) => new THREE.WebGLRenderTarget(x, y, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false,
    })
    const pair = (size, filter) => {
      const p = { read: target(size, filter), write: target(size, filter) }
      p.swap = () => { const r = p.read; p.read = p.write; p.write = r }
      return p
    }
    this.velocity = pair(this.simSize, THREE.LinearFilter)
    this.dye = pair(this.dyeSize, THREE.LinearFilter)
    this.pressure = pair(this.simSize, THREE.NearestFilter)
    this.divergence = target(this.simSize, THREE.NearestFilter)
    this.curlT = target(this.simSize, THREE.NearestFilter)
    const simTexel = new THREE.Vector2(1 / this.simSize[0], 1 / this.simSize[1])
    const mat = (body, uniforms, texel = simTexel) => new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: HEAD + body, depthTest: false, depthWrite: false,
      uniforms: { texelSize: { value: texel }, ...Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])) },
    })
    const size = new THREE.Vector2(...this.size)
    this.m = {
      splat: mat(FRAG.splat, { uTarget: null, uPoint: new THREE.Vector2(), uSize: size, uValue: new THREE.Vector3(), uRadius: 1 }),
      fade: mat(FRAG.fade, { uTarget: null, uPoint: new THREE.Vector2(), uSize: size, uRadius: 0, uAmount: 0 }),
      advect: mat(FRAG.advect, { uVelocity: null, uSource: null, dt: 0, dissipation: 0, simTexel }),
      divergence: mat(FRAG.divergence, { uVelocity: null }),
      curl: mat(FRAG.curl, { uVelocity: null }),
      vorticity: mat(FRAG.vorticity, { uVelocity: null, uCurl: null, curl: 0, dt: 0 }),
      scale: mat(FRAG.scale, { uTarget: null, uAmount: 1 }),
      pressure: mat(FRAG.pressure, { uPressure: null, uDivergence: null }),
      gradient: mat(FRAG.gradient, { uPressure: null, uVelocity: null }),
    }
    this.display = mat(FRAG.display, {
      uDye: null, uCells: new THREE.Vector2(cw, ch), uMargin: new THREE.Vector2(cells.margin, cells.margin),
      uOrigin: new THREE.Vector2(cells.x, cells.y), uCell: cells.c, uRes: new THREE.Vector2(w, h),
      uA: new THREE.Vector2(), uF: new THREE.Vector2(), uZ: 1, uInk: new THREE.Vector3(...linear([0x15, 0x17, 0x1b])),
      uGrid: 1, uGain: 1, uStar: 1.3, uHaze: 0.06, uTint: 0.36, uTop: 0.35, uTime: 0,
    })
    this.displayScene = new THREE.Scene()
    const shown = new THREE.Mesh(geo, this.display)
    shown.frustumCulled = false
    this.displayScene.add(shown)
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.22, luminanceSmoothing: 0.3, intensity: 0.7, radius: 0.55, levels: 6 })
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, depthBuffer: false })
    this.composer.setSize(w, h, false)
    this.composer.addPass(new RenderPass(this.displayScene, this.camera))
    this.composer.addPass(new EffectPass(this.camera, this.bloom, this.tone))
    // what the story may change as it goes
    this.curl = 18
    this.dyeFade = 0.45
    this.velFade = 0.3
    this.pressureKeep = 0.8
    this.iterations = 24
    this.reset()
  }

  pass(material, out) {
    this.quad.material = material
    this.renderer.setRenderTarget(out)
    this.renderer.render(this.scene, this.camera)
  }

  reset() {
    const r = this.renderer
    r.setClearColor(0x000000, 0)
    for (const t of [this.velocity.read, this.velocity.write, this.dye.read, this.dye.write, this.pressure.read, this.pressure.write, this.divergence, this.curlT]) {
      r.setRenderTarget(t)
      r.clear()
    }
    r.setRenderTarget(null)
    this.n = 0
  }

  // the panel's own pixels to the flow's: x across, y down, both in px
  uvOf(x, y) {
    const { cells } = this
    return [(x - (cells.x - cells.margin * cells.c)) / this.size[0], 1 - (y - (cells.y - cells.margin * cells.c)) / this.size[1]]
  }

  // light of `rgb` (linear, and it may be more than 1) round a point
  ink(x, y, rgb, r) {
    const m = this.m.splat
    m.uniforms.uTarget.value = this.dye.read.texture
    m.uniforms.uPoint.value.set(...this.uvOf(x, y))
    m.uniforms.uValue.value.set(rgb[0], rgb[1], rgb[2])
    m.uniforms.uRadius.value = r
    this.pass(m, this.dye.write)
    this.dye.swap()
  }

  // a push round a point, in the panel's px a second (y down)
  push(x, y, vx, vy, r) {
    const m = this.m.splat
    // the flow's velocity is in its own texels a second, y up
    const k = this.simSize[0] / this.size[0]
    m.uniforms.uTarget.value = this.velocity.read.texture
    m.uniforms.uPoint.value.set(...this.uvOf(x, y))
    m.uniforms.uValue.value.set(vx * k, -vy * k, 0)
    m.uniforms.uRadius.value = r
    this.pass(m, this.velocity.write)
    this.velocity.swap()
  }

  // light taken away round a point (`r` 0: everywhere)
  fade(x, y, r, amount) {
    const m = this.m.fade
    m.uniforms.uTarget.value = this.dye.read.texture
    m.uniforms.uPoint.value.set(...this.uvOf(x, y))
    m.uniforms.uRadius.value = r
    m.uniforms.uAmount.value = amount
    this.pass(m, this.dye.write)
    this.dye.swap()
  }

  step(dt) {
    const { m } = this
    m.curl.uniforms.uVelocity.value = this.velocity.read.texture
    this.pass(m.curl, this.curlT)
    m.vorticity.uniforms.uVelocity.value = this.velocity.read.texture
    m.vorticity.uniforms.uCurl.value = this.curlT.texture
    m.vorticity.uniforms.curl.value = this.curl
    m.vorticity.uniforms.dt.value = dt
    this.pass(m.vorticity, this.velocity.write)
    this.velocity.swap()
    m.divergence.uniforms.uVelocity.value = this.velocity.read.texture
    this.pass(m.divergence, this.divergence)
    m.scale.uniforms.uTarget.value = this.pressure.read.texture
    m.scale.uniforms.uAmount.value = this.pressureKeep
    this.pass(m.scale, this.pressure.write)
    this.pressure.swap()
    m.pressure.uniforms.uDivergence.value = this.divergence.texture
    for (let i = 0; i < this.iterations; i++) {
      m.pressure.uniforms.uPressure.value = this.pressure.read.texture
      this.pass(m.pressure, this.pressure.write)
      this.pressure.swap()
    }
    m.gradient.uniforms.uPressure.value = this.pressure.read.texture
    m.gradient.uniforms.uVelocity.value = this.velocity.read.texture
    this.pass(m.gradient, this.velocity.write)
    this.velocity.swap()
    m.advect.uniforms.uVelocity.value = this.velocity.read.texture
    m.advect.uniforms.uSource.value = this.velocity.read.texture
    m.advect.uniforms.dt.value = dt
    m.advect.uniforms.dissipation.value = this.velFade
    this.pass(m.advect, this.velocity.write)
    this.velocity.swap()
    m.advect.uniforms.uVelocity.value = this.velocity.read.texture
    m.advect.uniforms.uSource.value = this.dye.read.texture
    m.advect.uniforms.dissipation.value = this.dyeFade
    this.pass(m.advect, this.dye.write)
    this.dye.swap()
  }

  // every step up to the film's moment `t`, from the start again if the
  // film has gone back
  stepTo(t) {
    let lo = 0
    let hi = this.steps.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.steps[mid] <= t) lo = mid + 1; else hi = mid }
    if (lo < this.n) this.reset()
    while (this.n < lo) {
      this.script(this, this.steps[this.n], this.n)
      this.step(1 / 60)
      this.n++
    }
  }

  // the frame: the panel through the view `v` (its point `a` at the frame's
  // `f`, `z` times), `grid` how much of its unlit cells show, `gain` the
  // light's strength
  render(v, { grid = 1, gain = 1, time = 0, top = 0.35 } = {}) {
    const u = this.display.uniforms
    u.uDye.value = this.dye.read.texture
    u.uA.value.set(v.a[0], v.a[1])
    u.uF.value.set(v.f[0], v.f[1])
    u.uZ.value = v.z
    u.uGrid.value = grid
    u.uGain.value = gain
    u.uTime.value = time
    u.uTop.value = top
    this.renderer.setRenderTarget(null)
    this.composer.render()
  }

  dispose() {
    this.composer.dispose()
    this.renderer.dispose()
  }
}

// ── the solver's notice ─────────────────────────────────────────────────────
// The solver's passes (splat, advection, divergence, curl, vorticity,
// pressure, gradient) follow Pavel Dobryakov's WebGL Fluid Simulation
// (github.com/PavelDoGreat/WebGL-Fluid-Simulation), under its licence:
//
// MIT License
//
// Copyright (c) 2017 Pavel Dobryakov
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

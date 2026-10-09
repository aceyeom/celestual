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
// Over the flow, each frame, the light the story places itself: colour
// spreading from where its sources are, soft hearts, pixels in flight,
// drawn into a layer of the same cells
// and shown as each cell's round point of light, dim light cool and grey as
// the eye sees it at night (`render`'s `light`).
//
// It is drawn from `t` and nothing else. The flow is stepped from its start
// at a fixed rate, the story's own `script` adding light and moving it at
// each step, so any frame is the same frame however it is come to: forward
// a step at a time, or from the start again when the film goes back.
import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing'

// how many sources of colour and points a frame may hold
export const MAXS = 24
export const MAXPTS = 8192
// a source of colour, as `light.sources` holds it, sixteen numbers: where it
// is (x, y, on the panel); how far it has spread; its strength; its colour
// (linear) and a seed; how far its streaks have flowed outward (they flow
// in as it goes down) and how far they have turned, both as the story has
// moved them so far, so a change of pace never jumps them; for a source
// that is one side of a meeting, the side's direction and how softly it
// falls off (nought: all round); how bright its spreading front is, how
// much of its body shows, its own time in seconds, and the scale of its
// streaks
export const SOURCE = 16

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
  // the light the story places on the panel this frame, at each cell's
  // middle: colour spreading out over the dark from where its sources are
  // (see `SOURCE` above for what each holds), as ink spreads in water. Each
  // has a soft edge that wavers slowly along its length, a brighter band
  // where it is still spreading into the dark, and inside it, light drawn
  // out in silky streaks that flow outward (or in) as it goes and turn a
  // little as they go, along spirals, never along spokes. Where two meet,
  // each keeps to its own side, and the line between them is the streaks'
  // own, so the two colours wind into each other; and the hearts, soft
  // round glows
  light: `
    uniform sampler2D uSrc;
    uniform int uSrcN;
    uniform vec2 uLo;
    uniform vec2 uSpan;
    uniform vec4 uHeart[4];
    uniform vec3 uHeartCol[4];
    float h31 (vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
    float n3 (vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
      float b = mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
      return mix(a, b, f.z);
    }
    float fbm2 (vec3 p) { return (0.5 * n3(p) + 0.25 * n3(p * 2.03 + vec3(1.7, 9.2, 3.1))) / 0.75; }
    float fbm3 (vec3 p) { return (0.5 * n3(p) + 0.25 * n3(p * 2.03 + vec3(1.7, 9.2, 3.1)) + 0.125 * n3(p * 4.1 + vec3(8.3, 2.8, 5.5))) / 0.875; }
    void main () {
      vec2 p = uLo + vec2(vUv.x, 1.0 - vUv.y) * uSpan;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < ${MAXS}; i++) {
        if (i >= uSrcN) break;
        vec4 A = texelFetch(uSrc, ivec2(i * 4, 0), 0);
        vec4 B = texelFetch(uSrc, ivec2(i * 4 + 1, 0), 0);
        vec4 C = texelFetch(uSrc, ivec2(i * 4 + 2, 0), 0);
        vec4 D = texelFetch(uSrc, ivec2(i * 4 + 3, 0), 0);
        vec2 d = p - A.xy;
        float r = length(d);
        float R = max(A.z, 1.0);
        if (r > R * 1.5 || A.w <= 0.0) continue;
        vec2 ring = d / max(r, 1e-3);
        float wv = fbm2(vec3(ring * 1.3 + B.w, D.z * 0.12));
        float Rf = R * (0.8 + 0.4 * wv);
        // the streaks, in the source's own log-polar space, so they flow out
        // along it faster the further out they are, as a spreading drop's do,
        // and turned more the further out, so they lie along spirals
        float lr = log(r + 36.0);
        float tw = C.y + 0.55 * lr;
        vec2 rr = vec2(ring.x * cos(tw) - ring.y * sin(tw), ring.x * sin(tw) + ring.y * cos(tw));
        vec3 s3 = vec3(rr * 1.5 * D.w + B.w, lr * 2.2 * D.w - C.x);
        vec3 wq = vec3(fbm2(s3 + vec3(0.0, 0.0, 4.1)), fbm2(s3 + vec3(5.2, 1.3, 0.0)), 0.0);
        float m = fbm3(s3 + 1.6 * wq);
        // the streaks: broad soft ones, and through them fine threads where
        // the flow is drawn thin, as silk's sheen and marbled ink's are
        float silk = pow(1.0 - abs(2.0 * m - 1.0), 12.0);
        float veins = 0.1 + 0.6 * smoothstep(0.36, 0.82, m) + 0.5 * silk;
        // its edge goes further out where its streaks are bright, as ink's
        // does along its tendrils, so it is never a circle; and the front,
        // where it is still going out into the dark, is the streaks' ends
        // lit, never a ring
        float Re = Rf * (0.8 + 0.4 * m);
        float body = 1.0 - smoothstep(0.1 * Re, Re, r);
        float e = (r - 0.88 * Re) / (0.16 * Re + 4.0);
        float front = exp(-e * e) * D.x * (0.08 + 0.92 * veins * veins);
        // its side of a meeting: the turned direction, and the streaks, so
        // the line between the two winds as they do
        float side = C.w > 0.0 ? smoothstep(-C.w, C.w, dot(rr, vec2(cos(C.z + 0.55 * 3.58), sin(C.z + 0.55 * 3.58))) + 0.7 * (m - 0.5)) : 1.0;
        acc += A.w * B.rgb * side * (D.y * body * veins + front * (0.55 + 0.45 * veins));
      }
      for (int k = 0; k < 4; k++) {
        vec2 dd = (p - uHeart[k].xy) / max(uHeart[k].z, 1e-3);
        acc += exp(-dot(dd, dd)) * uHeart[k].w * uHeartCol[k];
      }
      gl_FragColor = vec4(acc, 1.0);
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
    uniform sampler2D uLight;
    uniform float uLightGain;
    uniform float uLightHaze;
    uniform vec4 uShadeA;
    uniform vec4 uShadeB;
    uniform vec2 uShadeK;
    float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // a run of the cell's own pixels, [a, b), softened by a frame pixel
    float run (float v, float a, float b, float w) { return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v)); }
    // a box on the frame, its edges softened by s
    float box (vec2 p, vec4 b, float s) {
      vec2 k = smoothstep(b.xy - s, b.xy, p) * (1.0 - smoothstep(b.zw, b.zw + s, p));
      return k.x * k.y;
    }
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
      // under the words the panel is kept darker: at the top of the frame,
      // and wherever this frame's words are (its shade)
      float band = mix(uTop, 1.0, smoothstep(330.0, 640.0, frag.y));
      band *= (1.0 - uShadeK.x * box(frag, uShadeA, 110.0)) * (1.0 - uShadeK.y * box(frag, uShadeB, 110.0));
      // and under the stars a haze of the light, smooth across the cells as
      // a nebula is, and held down where the light is strong, so it stays a
      // haze
      vec2 smooth2 = ((p - uOrigin) / uCell + uMargin) / uCells;
      vec3 neb = max(texture2D(uDye, vec2(smooth2.x, 1.0 - smooth2.y)).rgb, 0.0) * uGain;
      float nI = dot(neb, vec3(0.2126, 0.7152, 0.0722));
      // its colour kept quiet, half way to the grey of starlight
      neb = mix(neb, vec3(nI), 0.45);
      vec3 col = cell * uInk * uGrid + (neb / (1.0 + 1.5 * nI) * uHaze + tint * star * bright * uStar) * band;
      // the light placed this frame: the cell's own round point of it, each
      // with its own slow shimmer, as light on water has. Dim light goes cool
      // and grey, as the eye sees at night (the Purkinje shift), and bright
      // light keeps its colour, so nothing fades through brown; the
      // brightest cells catch a cross, as a star does
      vec3 L = max(texture2D(uLight, vec2(tex.x, 1.0 - tex.y)).rgb, 0.0) * uLightGain;
      L *= 0.88 + 0.24 * (0.5 + 0.5 * sin(uTime * (0.9 + 1.7 * hash(id + 17.1)) + 6.2832 * hash(id + 23.9)));
      float Ly = dot(L, vec3(0.2126, 0.7152, 0.0722));
      // a warm light keeps its colour only when it is bright: dimmer, it
      // goes to the grey of starlight sooner than a cool one, as a dim
      // orange is otherwise brown
      float warm = clamp((L.r - L.b) / max(1e-4, max(L.r, max(L.g, L.b))), 0.0, 1.0);
      float sat = smoothstep(0.01, 0.12 + 0.45 * warm, Ly) * 1.2;
      vec3 cool = Ly * mix(vec3(0.82, 0.92, 1.18), vec3(1.0, 0.98, 0.96), warm);
      L = cool + (L - Ly) * sat + (Ly - cool) * min(1.0, sat);
      float rr = length(f - 0.5);
      float edge = max(0.06, px);
      float pt = 1.0 - smoothstep(0.42 - edge, 0.42 + edge * 0.5, rr);
      float arm = smoothstep(0.55, 1.1, Ly) * 0.5 * max(run(q.x, 1.0, 6.0, w) * run(q.y, 3.0, 4.0, w), run(q.x, 3.0, 4.0, w) * run(q.y, 1.0, 6.0, w));
      // and between the points, the same light smooth across the cells, low
      // and a little grey, so it reads as light in the glass and not as dots
      vec3 Lh = max(texture2D(uLight, vec2(smooth2.x, 1.0 - smooth2.y)).rgb, 0.0) * uLightGain;
      float Lhy = dot(Lh, vec3(0.2126, 0.7152, 0.0722));
      Lh = mix(Lh, Lhy * vec3(0.86, 0.94, 1.1), 0.45);
      col += (L * pt * 1.3 + mix(L, vec3(Ly), 0.5) * arm + Lh * uLightHaze) * band;
      gl_FragColor = vec4(col, 1.0);
    }`,
}

// the pixels in flight: each a point of light in the panel's px, shared
// between the four cells it falls among, as much to each as it is near
const POINT_VERT = /* glsl */ `
  attribute vec3 tint;
  uniform vec2 uLo;
  uniform vec2 uSpan;
  varying vec3 vTint;
  void main () {
    vec2 uv = (position.xy - uLo) / uSpan;
    gl_Position = vec4(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
    gl_PointSize = 2.0;
    vTint = tint;
  }
`
const POINT_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vTint;
  void main () {
    vec2 d = abs(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(vTint * max(0.0, 1.0 - d.x) * max(0.0, 1.0 - d.y), 1.0);
  }
`
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
    // the light placed each frame, a cell a texel: its sources and hearts
    // drawn over the whole of it, and the pixels in flight added to it; read
    // a texel at a time for the points, and smoothly for the light between
    this.light = target(this.dyeSize, THREE.LinearFilter)
    this.srcData = new Float32Array(MAXS * SOURCE)
    this.srcTex = new THREE.DataTexture(this.srcData, MAXS * 4, 1, THREE.RGBAFormat, THREE.FloatType)
    this.srcTex.minFilter = THREE.NearestFilter
    this.srcTex.magFilter = THREE.NearestFilter
    this.srcTex.needsUpdate = true
    const lo = new THREE.Vector2(cells.x - cells.margin * cells.c, cells.y - cells.margin * cells.c)
    this.m.light = mat(FRAG.light, {
      uSrc: this.srcTex, uSrcN: 0, uLo: lo, uSpan: size,
      uHeart: [0, 1, 2, 3].map(() => new THREE.Vector4()), uHeartCol: [0, 1, 2, 3].map(() => new THREE.Vector3()),
    })
    const pts = new THREE.BufferGeometry()
    pts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXPTS * 3), 3))
    pts.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(MAXPTS * 3), 3))
    this.points = new THREE.Points(pts, new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uLo: { value: lo }, uSpan: { value: size } },
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
    }))
    this.points.frustumCulled = false
    this.pointScene = new THREE.Scene()
    this.pointScene.add(this.points)
    this.display.uniforms.uLight = { value: this.light.texture }
    this.display.uniforms.uLightGain = { value: 1 }
    this.display.uniforms.uLightHaze = { value: 0 }
    this.display.uniforms.uShadeA = { value: new THREE.Vector4() }
    this.display.uniforms.uShadeB = { value: new THREE.Vector4() }
    this.display.uniforms.uShadeK = { value: new THREE.Vector2() }
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

  // the light placed this frame (`light`: `sources`, SOURCE numbers a
  // source, and `n` of them; `hearts`, up to four of [x, y, radius,
  // strength, r, g, b]; `points`, five numbers a point, x, y and its
  // colour, and `m` of them), drawn into its layer of cells
  place(light) {
    const r = this.renderer
    const m = this.m.light
    const n = light ? Math.min(MAXS, light.n || 0) : 0
    if (n) {
      this.srcData.set(light.sources.subarray(0, n * SOURCE))
      this.srcTex.needsUpdate = true
    }
    m.uniforms.uSrcN.value = n
    for (let k = 0; k < 4; k++) {
      const h = (light && light.hearts && light.hearts[k]) || [0, 0, 1, 0, 0, 0, 0]
      m.uniforms.uHeart.value[k].set(h[0], h[1], h[2], h[3])
      m.uniforms.uHeartCol.value[k].set(h[4], h[5], h[6])
    }
    this.pass(m, this.light)
    const count = light ? Math.min(MAXPTS, light.m || 0) : 0
    if (count) {
      const pos = this.points.geometry.attributes.position
      const tint = this.points.geometry.attributes.tint
      for (let i = 0; i < count; i++) {
        pos.array[i * 3] = light.points[i * 5]
        pos.array[i * 3 + 1] = light.points[i * 5 + 1]
        pos.array[i * 3 + 2] = 0
        tint.array[i * 3] = light.points[i * 5 + 2]
        tint.array[i * 3 + 1] = light.points[i * 5 + 3]
        tint.array[i * 3 + 2] = light.points[i * 5 + 4]
      }
      pos.needsUpdate = true
      tint.needsUpdate = true
      this.points.geometry.setDrawRange(0, count)
      r.setRenderTarget(this.light)
      r.render(this.pointScene, this.camera)
    }
  }

  // the frame: the panel through the view `v` (its point `a` at the frame's
  // `f`, `z` times), `grid` how much of its unlit cells show, `gain` the
  // flow's light's strength, `star` its stars', `lightGain` the placed
  // light's and `lightHaze` the light between its points, `shade` up to two
  // boxes on the frame kept darker for the words over them ([x0, y0, x1,
  // y1, how much]); and the light placed this frame
  render(v, { grid = 1, gain = 1, time = 0, top = 0.35, star = 1.3, lightGain = 1, lightHaze = 0, shade = [] } = {}, light = null) {
    this.place(light)
    const u = this.display.uniforms
    u.uStar.value = star
    u.uLightGain.value = lightGain
    u.uLightHaze.value = lightHaze
    const [sa, sb] = [shade[0] || [0, 0, 0, 0, 0], shade[1] || [0, 0, 0, 0, 0]]
    u.uShadeA.value.set(sa[0], sa[1], sa[2], sa[3])
    u.uShadeB.value.set(sb[0], sb[1], sb[2], sb[3])
    u.uShadeK.value.set(sa[4], sb[4])
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

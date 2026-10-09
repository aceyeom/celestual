// ── the letter, in the light ────────────────────────────────────────────────
//
// The letter the reveal holds, lin's on one side and kai's on the other,
// drawn in WebGL from the reel's own photographs of its two faces
// (films/reel-faces.jsx), so that the colours it comes out of can move it.
// It is a mesh of the glass, and every point of it is moved by the flow it
// is in; its picture is drawn through the same flow, so as it comes out of
// the light its words swim into place, and as kai's is given back to the
// light they are drawn out along the flow and it melts into the colours, a
// soft edge going through it, never a hole eaten in it.
//
// Turned and set in the room's perspective exactly as the page set the
// letter before it (CSS's perspective(2600px) rotateX rotateY rotateZ
// scale, about its middle, reel.jsx `cardQuad`), and with the light the
// glass throws round it (screen.css `.wl-scene-halo` and `-2`) drawn behind
// it on the same plane. Drawn from what it is handed and nothing else.
import * as THREE from 'three'

// the letter's own size, in its px
export const W = 1000
export const H = 1160
// how far round it its light is drawn
const HALO = 330

const NOISE = /* glsl */ `
  float h31 (vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
  float n3 (vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
    float b = mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
    return mix(a, b, f.z);
  }
  float fbm (vec3 p) { return (0.5 * n3(p) + 0.25 * n3(p * 2.03 + vec3(1.7, 9.2, 3.1)) + 0.125 * n3(p * 4.1 + vec3(8.3, 2.8, 5.5))) / 0.875; }
  // the flow at a point of the glass, each way from -1 to 1
  vec2 field (vec2 p, float ph) {
    return vec2(fbm(vec3(p / 230.0, ph)), fbm(vec3(p / 230.0 + vec2(5.2, 1.3), ph + 3.7))) * 2.0 - 1.0;
  }
`

const VERT = /* glsl */ `
  uniform vec3 uPose;
  uniform vec3 uTurn;
  uniform float uWarp;
  uniform float uPull;
  uniform float uFlow;
  uniform vec2 uOut;
  varying vec2 vP;
  ${NOISE}
  void main () {
    vec2 p = position.xy;
    vP = p;
    // the glass moved by the flow, and drawn outward from the spread's heart
    vec2 d = uWarp * field(p, uFlow);
    vec2 o = p - uOut;
    float r = length(o);
    d += (o / max(r, 1.0)) * uPull * (0.3 + 0.7 * fbm(vec3(p / 300.0, uFlow * 0.7 + 9.0))) * smoothstep(-200.0, 700.0, r);
    vec2 q = (p + d - vec2(${W}.0, ${H}.0) * 0.5) * uPose.z;
    // turned as CSS turns it, the last named first: about z, then y, then x
    float x = q.x;
    float y = q.y;
    float z = 0.0;
    float c = cos(uTurn.z);
    float s = sin(uTurn.z);
    float t = x * c - y * s;
    y = x * s + y * c;
    x = t;
    c = cos(uTurn.y);
    s = sin(uTurn.y);
    t = x * c + z * s;
    z = -x * s + z * c;
    x = t;
    c = cos(uTurn.x);
    s = sin(uTurn.x);
    t = y * c - z * s;
    z = y * s + z * c;
    y = t;
    // and in the room's perspective: the divide is left to the card, so its
    // picture is drawn in perspective and not stretched across it
    float w = 1.0 - z / 2600.0;
    gl_Position = vec4(2.0 * (uPose.x * w + x) / 1080.0 - w, -(2.0 * (uPose.y * w + y) / 1920.0 - w), 0.0, w);
  }
`

const GLASS = /* glsl */ `
  precision highp float;
  uniform sampler2D uFace;
  uniform float uWhite;
  uniform float uSwirl;
  uniform float uMelt;
  uniform float uFlow;
  uniform vec2 uOut;
  uniform vec3 uInto;
  uniform float uAlpha;
  varying vec2 vP;
  ${NOISE}
  void main () {
    // its corners, round as the glass's are, soft by a pixel
    vec2 e = abs(vP - vec2(${W}.0, ${H}.0) * 0.5) - (vec2(${W}.0, ${H}.0) * 0.5 - 10.0);
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 10.0;
    float inside = 1.0 - smoothstep(-0.9, 0.9, sd);
    // its picture, taken from back along the flow: the words drawn out
    // along it, and outward from the spread's heart
    vec2 o = vP - uOut;
    vec2 back = (field(vP, uFlow * 0.8 + 2.0) * 0.65 + 0.35 * o / max(length(o), 1.0)) * uSwirl;
    vec3 col = texture2D(uFace, clamp((vP - back) / vec2(${W}.0, ${H}.0), vec2(0.0005), vec2(0.9995))).rgb;
    // melting: each point of it in its own time, its edges first and its
    // middle last; it lifts into the light first, its colours and its words
    // going to the light's own, and then thins away into it, softly, so no
    // edge ever goes through it
    float mid = clamp(min(min(vP.x, ${W}.0 - vP.x), min(vP.y, ${H}.0 - vP.y)) / 520.0, 0.0, 1.0);
    float n = 0.55 * fbm(vec3(vP / 320.0, 4.0 + uFlow * 0.3)) + 0.45 * mid;
    float m = clamp(uMelt * 1.7 - 0.7 * n, 0.0, 1.0);
    float keep = 1.0 - smoothstep(0.3, 1.0, m);
    col = mix(col, uInto, smoothstep(0.0, 0.62, m) * 0.92);
    col = mix(col, vec3(1.0), uWhite);
    float a = inside * keep * uAlpha;
    gl_FragColor = vec4(col * a, a);
  }
`

const HALO_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uHalo;
  uniform float uHaloA;
  varying vec2 vP;
  float erf (float x) {
    float s = sign(x);
    x = abs(x);
    float t = 1.0 / (1.0 + 0.3275911 * x);
    return s * (1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x));
  }
  // a box seen through a blur as wide as sg, edge by edge
  float blurred (vec2 p, vec4 b, float sg) {
    vec2 lo = (p - b.xy) / (sg * 1.4142136);
    vec2 hi = (p - b.zw) / (sg * 1.4142136);
    return 0.25 * (erf(lo.x) - erf(hi.x)) * (erf(lo.y) - erf(hi.y));
  }
  void main () {
    // the wide light, 4 hundredths of the glass round it and 9 soft; and the
    // close one, 2 in and 3 soft (screen.css, at the letter's size)
    float a1 = 0.3 * blurred(vP, vec4(-40.0, -40.0, ${W}.0 + 40.0, ${H}.0 + 40.0), 90.0);
    float a2 = 0.16 * blurred(vP, vec4(20.0, 20.0, ${W}.0 - 20.0, ${H}.0 - 20.0), 30.0);
    float a = (1.0 - (1.0 - a1) * (1.0 - a2)) * uHaloA;
    gl_FragColor = vec4(uHalo * a, a);
  }
`

// a plane of the letter's px, `pad` round it, in `nx` by `ny` squares
function plane(pad, nx, ny) {
  const g = new THREE.PlaneGeometry(W + 2 * pad, H + 2 * pad, nx, ny)
  const p = g.attributes.position
  // the plane's own middle at nought and y up, to the letter's px, y down
  for (let i = 0; i < p.count; i++) p.setXY(i, p.getX(i) + W / 2, H / 2 - p.getY(i))
  return g
}

export class LetterGL {
  // `faces`: the two photographs, lin's and kai's, as images
  constructor(canvas, faces) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(1080, 1920, false)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    const aniso = this.renderer.capabilities.getMaxAnisotropy()
    this.faces = Object.fromEntries(Object.entries(faces).map(([k, img]) => {
      const tex = new THREE.Texture(img)
      tex.colorSpace = THREE.NoColorSpace
      tex.flipY = false
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.anisotropy = aniso
      tex.needsUpdate = true
      return [k, tex]
    }))
    const common = {
      uPose: { value: new THREE.Vector3() }, uTurn: { value: new THREE.Vector3() },
      uWarp: { value: 0 }, uPull: { value: 0 }, uFlow: { value: 0 }, uOut: { value: new THREE.Vector2(W / 2, H / 2) },
    }
    const blend = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor }
    this.glass = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: GLASS, ...blend,
      uniforms: { ...common, uFace: { value: null }, uWhite: { value: 0 }, uSwirl: { value: 0 }, uMelt: { value: 0 }, uInto: { value: new THREE.Vector3(1, 1, 1) }, uAlpha: { value: 1 } },
    })
    this.halo = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: HALO_FRAG, ...blend,
      // the same pose as the glass, but the light round it is not warped
      uniforms: { ...common, uWarp: { value: 0 }, uPull: { value: 0 }, uHalo: { value: new THREE.Vector3() }, uHaloA: { value: 1 } },
    })
    this.scene = new THREE.Scene()
    const haloMesh = new THREE.Mesh(plane(HALO, 8, 8), this.halo)
    const glassMesh = new THREE.Mesh(plane(3, 72, 84), this.glass)
    for (const m of [haloMesh, glassMesh]) { m.frustumCulled = false; this.scene.add(m) }
    haloMesh.renderOrder = 0
    glassMesh.renderOrder = 1
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  // the letter at a moment: `face` which side ('lin' or 'kai'), `pose` its
  // middle on the frame and its size, `turn` its three angles in degrees as
  // the page would turn that side, `alpha`, `white` how white it is coming
  // on; `warp` how far the flow moves its glass and `swirl` its picture,
  // `pull` how far it is drawn outward from `out` (the spread's heart on
  // it, in its own px), `flow` the flow's phase; `melt` how much of it has
  // gone into the light, `into` that light's colour; `halo` the colour of
  // the light it throws and `haloA` how much (sRGB, 0 to 1)
  draw({ face, pose, turn, alpha = 1, white = 0, warp = 0, swirl = 0, pull = 0, out = [W / 2, H / 2], flow = 0, melt = 0, into = [1, 1, 1], halo = [1, 1, 1], haloA = 1 }) {
    const rad = Math.PI / 180
    for (const m of [this.glass, this.halo]) {
      const g = m.uniforms
      g.uPose.value.set(pose[0], pose[1], pose[2])
      g.uTurn.value.set(turn[0] * rad, turn[1] * rad, turn[2] * rad)
      g.uFlow.value = flow
      g.uOut.value.set(out[0], out[1])
    }
    const g = this.glass.uniforms
    g.uFace.value = this.faces[face]
    g.uWarp.value = warp
    g.uPull.value = pull
    g.uSwirl.value = swirl
    g.uMelt.value = melt
    g.uWhite.value = white
    g.uAlpha.value = alpha
    g.uInto.value.set(into[0], into[1], into[2])
    const h = this.halo.uniforms
    h.uHalo.value.set(halo[0], halo[1], halo[2])
    h.uHaloA.value = haloA * alpha
    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    if (alpha > 0.001) this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    for (const t of Object.values(this.faces)) t.dispose()
    this.renderer.dispose()
  }
}

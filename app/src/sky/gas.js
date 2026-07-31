// sky/gas.js — the nebula, as an actual volume.
//
// The old gas was billboards. Hundreds of small riven sprites, projected,
// sorted back-to-front in JavaScript every frame, and blended. It was a good
// imitation, and nebula.js's comments are an honest record of the three things
// it could never fix:
//
//   · a billboard always faces the camera, so gas could never really be
//     anywhere. Edge-on, a painted sheet collapses to a sliver.
//   · dark dust had to use a different blend mode to fake occlusion, and even
//     then it was an eraser mark rather than matter standing in front of light.
//   · a puff the camera got close to had to DISSOLVE, or it smeared across the
//     frame — "the white stains". So you could never fly through the gas.
//
// This marches a ray through a density field instead. Thirty-odd samples per
// pixel, front to back, accumulating emission and attenuating by extinction —
// the actual radiative transfer integral, truncated. All three problems stop
// existing rather than being managed: gas is somewhere, so it stacks into a
// real luminous band when you look along the disk; dust occludes because it is
// genuinely in front; and you can fly straight through it, because there is a
// through.
//
// The density field is not arbitrary. Its spiral ridge sits at exactly the
// angle model.js's orbit family crowds at (theta = TILT_RATE * r + pattern),
// so the gas and the stars are describing the same object rather than two
// spirals that happen to be drawn on top of each other. And it SHEARS: the
// noise is sampled in a frame that co-rotates with the local orbital speed, so
// the gas winds differentially, exactly like the stars moving through it.
//
// Colour is physics too. The inner regions are warm (old starlight scattered
// off dust), the mid-disk is rose (H-alpha, at 656 nm — which is why every real
// emission nebula you have ever seen a photograph of is pink), and the outer
// lanes run violet-blue (reflection nebulae and doubly-ionised oxygen). That
// ramp lands, without being asked to, on this product's own two stars.

import { compile, FULLSCREEN_VS } from './gl.js'
import { TILT_RATE } from './model.js'

const FS = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec2 vUv;
out vec4 frag;

uniform mat3  uRt;         // view -> world
uniform vec3  uEyeWorld;   // ray origin, in world space
uniform vec2  uCenter;     // the optical centre, in this target's pixels
uniform vec2  uViewport;
uniform float uUnit, uFocal;
uniform float uOrbitT, uPattern, uTime;
uniform float uSteps;
uniform float uDiskR;      // the gas frontier
uniform float uDiskH;      // its thickness at the heart
uniform float uTiltRate;   // the spiral's pitch — shared with the star model
uniform float uArms;
uniform float uTurb;       // 0 = clean lanes, 1 = a wild proto-cloud
uniform float uGain;       // overall emission
uniform float uDust;       // how hard the dust lanes bite
uniform float uFill;       // how far out the population has lit the gas
uniform float uDim;
uniform float uForming;    // 0 = a settled spiral, 1 = a gathering cloud
uniform vec3  uWarm, uMid, uCool;
uniform sampler3D uNoise;
uniform sampler2D uBlue;

// The bounding volume: an oblate ellipsoid around the disk. Rays that miss it
// cost one quadratic and nothing else, which is what keeps a full-frame
// volumetric affordable on a phone — most of any given frame is empty sky.
bool hitBounds(vec3 ro, vec3 rd, float R, float H, out float t0, out float t1){
  vec3 s = vec3(1.0, R / max(H, 1e-4), 1.0);
  vec3 o = ro * s;
  vec3 d = rd * s;
  float a = dot(d, d);
  float b = 2.0 * dot(o, d);
  float c = dot(o, o) - R * R;
  float disc = b * b - 4.0 * a * c;
  if (disc < 0.0) return false;
  float sq = sqrt(disc);
  t0 = (-b - sq) / (2.0 * a);
  t1 = (-b + sq) / (2.0 * a);
  return t1 > 0.0;
}

// The density field. Everything the nebula is, in one function.
// Returns: x = emitting gas, y = obscuring dust, z = how "young" (blue) it is.
vec3 field(vec3 p){
  float r = length(p.xz);
  if (r > uDiskR * 1.25) return vec3(0.0);

  // ── the spiral ridge ───────────────────────────────────────────────────
  // The same angle the orbit family crowds at, so gas and stars are one object.
  float ang = atan(p.z, p.x);
  float phase = ang - (uTiltRate * r + uPattern);
  float ridge = cos(uArms * phase) * 0.5 + 0.5;
  // sharpen into lanes; a forming cloud keeps them soft and unformed
  float lanes = mix(pow(ridge, 2.6), 0.55 + 0.45 * ridge, uForming);

  // ── the disk's own profile ─────────────────────────────────────────────
  float h = uDiskH * (0.35 + 0.9 * exp(-r * 2.4));
  float vert = exp(-abs(p.y) / max(h, 1e-4));
  float radial = exp(-r / (uDiskR * 0.52)) * smoothstep(0.0, uDiskR * 0.12, r);
  // the population frontier: gas only glows where real stars already live
  float frontier = smoothstep(uFill + 0.2, uFill - 0.05, r);

  // ── the shear ──────────────────────────────────────────────────────────
  // Sampling the noise in a frame that co-rotates with the local orbital speed
  // is what makes the gas wind differentially instead of turning as one rigid
  // painted sheet. It is a two-line change and it is most of the reason the
  // cloud reads as alive.
  float omega = 0.0125 / sqrt(r * r + 0.0484);
  float sw = -omega * uOrbitT * 0.55;
  float cs = cos(sw), sn = sin(sw);
  vec3 q = vec3(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);

  vec4 n1 = texture(uNoise, q * 0.55 + vec3(0.13, 0.41, 0.77));
  vec4 n2 = texture(uNoise, q * 1.9 + vec3(0.61, 0.22, 0.08) + uTime * 0.0016);
  float base = n1.r * 0.66 + n2.g * 0.34;
  // the rive: gate the field hard enough that true holes open inside the body.
  // Gas that never goes to zero is fog; gas with gaps is matter.
  float gate = smoothstep(0.34 + 0.14 * uTurb, 0.78, base);

  float gas = lanes * vert * radial * frontier * gate;

  // ── dust ───────────────────────────────────────────────────────────────
  // A decorrelated channel, biased to the INNER edge of each lane — which is
  // where a real spiral's dust sits, because that is the side the gas is being
  // compressed from. It hugs the plane far more tightly than the glowing gas.
  float inner = cos(uArms * (phase + 0.42)) * 0.5 + 0.5;
  float dustLane = pow(inner, 3.2);
  float dustN = smoothstep(0.36, 0.8, n1.b * 0.7 + n2.b * 0.3);
  float dust = dustLane * dustN * exp(-abs(p.y) / max(h * 0.55, 1e-4)) * radial * frontier * uDust;
  dust *= (1.0 - uForming * 0.55);

  // how young this patch is — hot new stars ionise the gas around them, so the
  // arm ridges run blue and the settled inter-arm gas stays warm
  float young = lanes * smoothstep(0.4, 0.85, n2.r);
  return vec3(gas, dust, young);
}

void main(){
  // reconstruct the world-space ray for this pixel
  vec2 px = vUv * uViewport;
  vec3 dv = vec3((px - uCenter) / (uUnit * uFocal), 1.0);
  vec3 rd = normalize(uRt * dv);
  vec3 ro = uEyeWorld;

  float t0, t1;
  float R = uDiskR * 1.3;
  float H = max(uDiskH * 4.0, uDiskR * 0.22);
  if (!hitBounds(ro, rd, R, H, t0, t1)) { frag = vec4(0.0, 0.0, 0.0, 1.0); return; }
  t0 = max(t0, 0.0);
  if (t1 <= t0) { frag = vec4(0.0, 0.0, 0.0, 1.0); return; }

  float steps = uSteps;
  float dt = (t1 - t0) / steps;
  // Jitter the first step with blue noise. This is what lets twenty samples
  // look like two hundred: the banding a low step count produces becomes fine
  // grain instead, which the eye forgives entirely and the bloom pass mostly
  // erases.
  float jit = texture(uBlue, px / 64.0).r;
  float t = t0 + dt * jit;

  vec3 acc = vec3(0.0);
  float trans = 1.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= steps || trans < 0.012) break;
    vec3 p = ro + rd * t;
    vec3 f = field(p);
    float gas = f.x, dust = f.y, young = f.z;
    if (gas > 0.001 || dust > 0.001) {
      float r = length(p.xz);
      // the colour ramp: warm heart, rose mid-disk (H-alpha), violet rim
      float u = clamp(r / max(uDiskR, 1e-4), 0.0, 1.0);
      vec3 col = u < 0.45
        ? mix(uWarm, uMid, u / 0.45)
        : mix(uMid, uCool, (u - 0.45) / 0.55);
      // ionised gas around young stars runs hotter and bluer
      col = mix(col, mix(col, uCool, 0.55) * 1.25, young * 0.5);
      // the heart is brighter, as a real one is
      float heart = 1.0 + 1.5 * exp(-u * 3.0);
      vec3 emit = col * gas * uGain * heart;
      float sigma = gas * 0.55 + dust * 7.0;
      acc += trans * emit * dt;
      trans *= exp(-sigma * dt);
    }
    t += dt;
  }

  frag = vec4(acc * uDim, clamp(trans, 0.0, 1.0));
}
`

// Composite the half-resolution march onto the full-resolution scene. The blend
// is the second half of the transfer equation: dst = emission + T * dst, so the
// stars already in the buffer are genuinely dimmed by the dust in front of them
// instead of having a dark sprite painted over them.
const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uSrc;
void main(){ frag = texture(uSrc, vUv); }
`

export class GasPass {
  constructor(gl, caps) {
    this.gl = gl
    this.caps = caps
    this.prog = compile(gl, FULLSCREEN_VS, FS, 'gas')
    this.blit = compile(gl, FULLSCREEN_VS, COMPOSITE_FS, 'gas:blit')
    // The knobs a sky sets. Both skies use ONE cloud shader; a gathering
    // community is the same field with its arms unformed and its turbulence up,
    // which means crossing the privacy floor can genuinely RESOLVE a proto-cloud
    // into a spiral in place rather than cross-fading between two baked clouds.
    this.diskR = 1.25
    this.diskH = 0.075
    this.arms = 2
    this.turb = 0
    this.gain = 1
    this.dust = 1
    this.fill = 99
    this.forming = 0
    this.warm = [1.0, 0.68, 0.42]
    this.mid = [0.92, 0.42, 0.58]
    this.cool = [0.44, 0.5, 0.95]
  }

  render(target, cam, ctx) {
    const gl = this.gl
    const p = this.prog
    if (!p) return false
    target.bind()
    gl.disable(gl.BLEND)
    gl.useProgram(p.p)
    const u = p.u
    gl.uniformMatrix3fv(u.uRt, false, cam.Rt)
    gl.uniform3f(u.uEyeWorld, cam.eyeWorld[0], cam.eyeWorld[1], cam.eyeWorld[2])
    // the march renders at its own resolution; the optical centre and the world
    // scale have to follow it or the gas will not line up with the stars
    const s = target.w / ctx.width
    gl.uniform2f(u.uCenter, cam.cx * ctx.scale * s, cam.cy * ctx.scale * s)
    gl.uniform2f(u.uViewport, target.w, target.h)
    gl.uniform1f(u.uUnit, cam.unit * ctx.scale * s)
    gl.uniform1f(u.uFocal, ctx.FOCAL)
    gl.uniform1f(u.uOrbitT, ctx.orbitT)
    gl.uniform1f(u.uPattern, ctx.pattern)
    gl.uniform1f(u.uTime, ctx.t)
    gl.uniform1f(u.uSteps, ctx.gasSteps)
    gl.uniform1f(u.uDiskR, this.diskR)
    gl.uniform1f(u.uDiskH, this.diskH)
    gl.uniform1f(u.uTiltRate, TILT_RATE)
    gl.uniform1f(u.uArms, this.arms)
    gl.uniform1f(u.uTurb, this.turb)
    gl.uniform1f(u.uGain, this.gain)
    gl.uniform1f(u.uDust, this.dust)
    gl.uniform1f(u.uFill, this.fill)
    gl.uniform1f(u.uDim, ctx.dim)
    gl.uniform1f(u.uForming, this.forming)
    gl.uniform3fv(u.uWarm, this.warm)
    gl.uniform3fv(u.uMid, this.mid)
    gl.uniform3fv(u.uCool, this.cool)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_3D, ctx.noiseTex)
    gl.uniform1i(u.uNoise, 2)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, ctx.blueTex)
    gl.uniform1i(u.uBlue, 3)
    ctx.fullscreen.draw()
    return true
  }

  composite(src) {
    const gl = this.gl
    if (!this.blit) return
    gl.enable(gl.BLEND)
    // dst = emission + transmittance * dst — the transfer integral, finished
    gl.blendFunc(gl.ONE, gl.SRC_ALPHA)
    gl.useProgram(this.blit.p)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.uniform1i(this.blit.u.uSrc, 1)
  }

  destroy() {
    const gl = this.gl
    if (this.prog) gl.deleteProgram(this.prog.p)
    if (this.blit) gl.deleteProgram(this.blit.p)
  }
}

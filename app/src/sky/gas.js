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
uniform float uCore;       // the bulge's weight, against the disk's
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
// Returns: x = emitting gas, y = obscuring dust, z = how "young" (blue) it is,
// w = the bulge, which carries its own weight (uCore) rather than the disk's.
vec4 field(vec3 p){
  float r = length(p.xz);
  if (r > uDiskR * 1.25) return vec4(0.0);

  // ── the heart ──────────────────────────────────────────────────────────
  // How much of this sample is BULGE rather than disk — and it is the exact
  // inverse of what used to stand here. The old radial profile was multiplied
  // by a smoothstep rising from the axis out to a tenth of the disk, which took
  // the density to ZERO at the centre: a hole punched clean through the precise
  // middle of the galaxy. On screen that is a small dark circle with a ring of
  // specks around it, sitting exactly where the brightest thing in the picture
  // belongs — which is the whole reason the core read as missing rather than as
  // merely dim.
  //
  // A bulge is not a disk with a hole in it. It is pressure-supported, so it is
  // ROUND where the disk is flat; it is old and smooth, so it has neither lanes
  // nor rifts; and it is the densest light in the galaxy. All three come out of
  // this one weight.
  //
  // Measured on a SPHEROID rather than in the plane, and that is not a detail:
  // length(p.xz) is a CYLINDER, so a bulge built on it is a chimney standing up
  // the galaxy's axis — and this camera looks up that axis at sixty degrees, so
  // the march integrates the chimney's whole length into a bright smear sitting
  // well below the centre it is supposed to be at. Flattened by the same 0.72
  // genBulge gives the stars, so the gas and the stars are one body.
  float rb = max(uDiskR * 0.115, 1e-4);
  float qb = length(vec3(p.x, p.y / 0.72, p.z)) / rb;
  float core = exp(-qb * qb * 1.6);

  // ── the spiral ridge ───────────────────────────────────────────────────
  // The same angle the orbit family crowds at, so gas and stars are one object.
  float ang = atan(p.z, p.x);
  float phase = ang - (uTiltRate * r + uPattern);
  float ridge = cos(uArms * phase) * 0.5 + 0.5;
  // sharpen into lanes; a forming cloud keeps them soft and unformed
  float lanes = mix(pow(ridge, 2.6), 0.55 + 0.45 * ridge, uForming);
  // the arms have not formed this far in. Letting the two ridges run all the
  // way to the axis pinches them together into an X across the middle; the
  // bulge relaxes them back into one smooth body.
  lanes = mix(lanes, 1.0, core);

  // ── the disk's own profile ─────────────────────────────────────────────
  float h = uDiskH * (0.35 + 0.9 * exp(-r * 2.4));
  float vert = exp(-abs(p.y) / max(h, 1e-4));
  // exponential outward, and now rising all the way in to the axis instead of
  // stopping short of it
  float radial = exp(-r / (uDiskR * 0.52));
  // the population frontier: gas only glows where real stars already live.
  // Written as a rising ramp subtracted from one — smoothstep is undefined when
  // its edges are handed over in descending order, and most drivers only
  // happen to give the falling curve this wants (see stars.js).
  float frontier = 1.0 - smoothstep(uFill - 0.05, uFill + 0.2, r);

  // ── the shear ──────────────────────────────────────────────────────────
  // Sampling the noise in a frame that co-rotates with the local orbital speed
  // is what makes the gas wind differentially instead of turning as one rigid
  // painted sheet. It is a two-line change and it is most of the reason the
  // cloud reads as alive.
  //
  // The sign mirrors model.js's omegaAt, which is negative because a spiral's
  // arms trail: this galaxy turns clockwise on the glass. Sampling the noise at
  // a rotated point makes the cloud appear to turn the OPPOSITE way from that
  // rotation, so the cloud has to be handed the stars' own signed rate in order
  // to shear with them rather than against them.
  float omega = -0.0125 / sqrt(r * r + 0.0484);
  float sw = -omega * uOrbitT * 0.55;
  float cs = cos(sw), sn = sin(sw);
  vec3 q = vec3(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);

  vec4 n1 = texture(uNoise, q * 0.55 + vec3(0.13, 0.41, 0.77));
  vec4 n2 = texture(uNoise, q * 1.9 + vec3(0.61, 0.22, 0.08) + uTime * 0.0016);
  float base = n1.r * 0.66 + n2.g * 0.34;
  // the rive: gate the field hard enough that true holes open inside the body.
  // Gas that never goes to zero is fog; gas with gaps is matter. The heart is
  // spared it — a bulge is one continuous body of old starlight, and holes torn
  // through the middle of it are the artifact this whole section is undoing.
  float gate = mix(smoothstep(0.34 + 0.14 * uTurb, 0.78, base), 1.0, core * 0.9);

  float gas = lanes * vert * radial * frontier * gate;
  // The bulge's own body of light, kept OUT of the disk's gain so each sky can
  // weigh its heart against a cloud it lights differently (uCore). Only a
  // whisper of the noise reaches it: a bulge is smooth, and the grain in a real
  // one is its stars, which this galaxy has plenty of.
  float bulge = core * frontier * (0.82 + 0.36 * base) * (1.0 - uForming * 0.75);

  // ── dust ───────────────────────────────────────────────────────────────
  // A decorrelated channel, biased to the INNER edge of each lane — which is
  // where a real spiral's dust sits, because that is the side the gas is being
  // compressed from. It hugs the plane far more tightly than the glowing gas.
  float inner = cos(uArms * (phase + 0.42)) * 0.5 + 0.5;
  float dustLane = pow(inner, 3.2);
  float dustN = smoothstep(0.36, 0.8, n1.b * 0.7 + n2.b * 0.3);
  float dust = dustLane * dustN * exp(-abs(p.y) / max(h * 0.55, 1e-4)) * radial * frontier * uDust;
  dust *= (1.0 - uForming * 0.55);
  // and it thins to nothing through the bulge. The lanes converge on the axis,
  // so a dust arm left running that far in draws a dark bar straight across the
  // core — which is the second way the middle of this galaxy went missing.
  dust *= 1.0 - core * 0.92;

  // How young this patch is — hot new stars ionise the gas around them, so the
  // arm ridges run blue and the settled inter-arm gas stays warm. The bulge
  // takes none of it: it is the oldest light in the galaxy with no star
  // formation left anywhere in it — and since the lane weight is held at one
  // through the core, without this the new heart would come out ionised and
  // BLUE. The one thing a bulge unarguably is, is gold.
  float young = lanes * smoothstep(0.4, 0.85, n2.r) * (1.0 - core);
  return vec4(gas, dust, young, bulge);
}

void main(){
  // Reconstruct the world-space ray for this pixel — in the STAR pass's pixel
  // frame, which measures y downward from the top. vUv comes off a fullscreen
  // triangle in NDC, so its y runs upward from the bottom, while uCenter is
  // cam.cy: a DOM coordinate, y down. Reconstructing against the raw vUv
  // therefore built every ray with its vertical component negated, and the
  // whole nebula rendered MIRRORED against the field it belongs to — the gas
  // spiral winding one way while the stars wound the other, dust lanes lying
  // where no arm was, and the heart of the cloud sitting a chunk of the frame
  // away from the heart of the galaxy (cam.cy is 0.44 of the height, not 0.5,
  // so the mirror is visibly off-centre as well as backwards). It survived this
  // long because a cloud is soft and nobody can point at where a cloud ought to
  // be — but it is the reason gas and stars never looked like one object.
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uViewport;
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
    vec4 f = field(p);
    float gas = f.x, dust = f.y, young = f.z, bulge = f.w;
    if (gas > 0.001 || dust > 0.001 || bulge > 0.001) {
      float r = length(p.xz);
      // the colour ramp: warm heart, rose mid-disk (H-alpha), violet rim
      float u = clamp(r / max(uDiskR, 1e-4), 0.0, 1.0);
      vec3 col = u < 0.45
        ? mix(uWarm, uMid, u / 0.45)
        : mix(uMid, uCool, (u - 0.45) / 0.55);
      // ionised gas around young stars runs hotter and bluer
      col = mix(col, mix(col, uCool, 0.55) * 1.25, young * 0.5);
      // the inner disk runs a little hotter than the outer, as a real one does
      // — but only a little. A steep boost here flattens the whole middle into
      // one featureless clot and takes the arms' structure with it; the bulge
      // is a body of its own now and does not need this to carry it.
      float heart = 1.0 + 0.8 * exp(-u * 2.4);
      vec3 emit = col * (gas + bulge * uCore) * uGain * heart;
      float sigma = gas * 0.55 + dust * 7.0;
      acc += trans * emit * dt;
      trans *= exp(-sigma * dt);
    }
    t += dt;
  }

  // the gas composite MULTIPLIES the buffer by this alpha, so a stray NaN here
  // would not merely add a black shape but erase everything behind it
  vec3 emit = min(acc * uDim, vec3(512.0));
  emit = mix(emit, vec3(0.0), vec3(isnan(emit)));
  float T = clamp(trans, 0.0, 1.0);
  frag = vec4(max(emit, vec3(0.0)), isnan(T) ? 1.0 : T);
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
    // How heavily the bulge is weighted against the disk's own gain. It is a
    // ratio rather than an absolute so the heart fades with the cloud on a dive
    // without anything having to remember to fade it — and because the two skies
    // light their disks very differently (an ambient galaxy sits at 0.3, a full
    // community at nearly one), a ratio is the only form of this number that
    // means the same thing in both.
    this.core = 4.2
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
    // view -> world, and Rt is likewise stored row-major (see stars.js)
    gl.uniformMatrix3fv(u.uRt, true, cam.Rt)
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
    gl.uniform1f(u.uCore, this.core)
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

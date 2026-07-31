// sky/stars.js — a star, rendered as a star.
//
// This is the pass that replaces `ctx.drawImage(sprite, ...)`. Everything a
// star is now happens on the GPU, per pixel, per frame:
//
//   · where it is — its orbit is integrated in the vertex shader from six
//     floats and one clock, so a hundred thousand stars moving costs the main
//     thread exactly nothing
//   · what colour it is — its blackbody temperature, looked up on the Planck
//     locus, not chosen from a palette
//   · how bright it is — its luminosity over the square of its distance, which
//     is the actual inverse-square law and not a hand-tuned alpha ramp
//   · how big it is — and this is the interesting one. A star has TWO sizes:
//     the point-spread function of the instrument looking at it (roughly
//     constant on screen, which is why distant stars are all the same size in
//     every photograph ever taken), and its true angular diameter (which grows
//     without limit as you approach). The rendered size is the larger of the
//     two. Far away, the PSF wins and a star is a point of light. Close enough,
//     the angular diameter overtakes it and the star becomes a BODY: a
//     photosphere with limb darkening and granulation. Nothing switches modes;
//     one inequality flips, because that is what actually happens when you fly
//     toward a sun.
//
// The old engine could not do this. Brightness there had to be spent as SIZE,
// because a blitted halo sprite has no headroom above opaque — which is why its
// comments are full of hard caps fighting "bokeh discs" and "blurry low-fi
// blobs". Here a star simply emits 40x white into a half-float buffer and the
// bloom pass finds it. Brightness is allowed to be light again.
//
// Motion blur is real too. The shader knows the camera basis and the orbit
// clock of the PREVIOUS frame, so it computes where each star was and stretches
// its quad along that delta — a genuine per-star velocity smear during a dive,
// rather than the old trick of remembering last frame's screen position on the
// CPU and stroking a line to it.

import { compile, makeQuad, GLSL_HASH, GLSL_PSF } from './gl.js'
import { STAR_STRIDE } from './model.js'

const COMMON = `
precision highp float;
${GLSL_HASH}

// the blackbody LUT's domain, mirrored from blackbody.js
const float T_MIN = 1200.0;
const float T_MAX = 40000.0;
float tempAt(float u){ return T_MIN * pow(T_MAX / T_MIN, u); }
`

const VS = (hero) => `#version 300 es
${COMMON}

layout(location=0) in vec2 aCorner;   // the unit quad, [-1,1]
layout(location=1) in vec4 aOrbit;    // a, b, phi0, omega
layout(location=2) in vec4 aStar;     // theta0, y, tempU, lum
${hero ? 'layout(location=3) in vec4 aTint;   // rgb tint, a = extra gain' : ''}
${hero ? 'layout(location=4) in vec4 aFx;     // spikeGain, discBias, ringPhase, alive' : ''}

uniform mat3  uR, uRPrev;
uniform vec3  uEye, uEyePrev;
uniform vec2  uCenter;
uniform vec2  uViewport;
uniform float uUnit, uCam, uFocal;
uniform float uOrbitT, uOrbitTPrev;
uniform float uPattern, uPatternPrev;
uniform float uExposure, uDim, uPsf, uTime;
uniform float uGain;        // population-wide brightness trim
uniform float uRadiusScale; // how readily stars resolve into bodies
uniform float uTwinkle;
uniform float uMotion;      // 0 = no smear, 1 = full per-star motion blur
uniform float uResolve;     // may this population resolve into bodies at all?
uniform float uNear;        // near-plane dissolve distance (0 = never dissolve)
// Does this population ride the density wave's own rotation? The disk does —
// its orbit tilts ARE the wave. The deep field, the halo and the near field do
// not: they are outside the galaxy, and turning them with it would rotate the
// entire universe around the viewer.
uniform float uPatternMix;
uniform sampler2D uBB;

out vec2  vOffset;   // position inside the sprite, in core-radius units
out vec3  vColor;    // the star's linear colour
out vec3  vTint;     // the category light a hero star's halo wears
out float vTintMix;
out float vI;        // arriving intensity
out float vSurface;  // photosphere surface brightness (distance-invariant)
out float vDisc;     // 0 = unresolved point, 1 = fully resolved body
out float vSpike;    // how much diffraction this star has earned
out float vSpin;     // its own spike orientation
out float vSeg;      // half-length of the motion streak, in core units
out float vEdge;     // where the sprite ends, in core units
out float vSeed;

vec3 orbitPos(vec4 orb, float theta0, float y, float clock, float pattern){
  float phi = orb.z + orb.w * clock;
  float th  = theta0 + pattern * uPatternMix;
  vec2 e = vec2(orb.x * cos(phi), orb.y * sin(phi));
  float ct = cos(th), st = sin(th);
  return vec3(e.x * ct - e.y * st, y, e.x * st + e.y * ct);
}

// world -> screen. Returns xy in pixels, z = camera-space depth.
vec3 toScreen(vec3 p, mat3 R, vec3 eye){
  vec3 v = R * p;
  float zc = uCam + v.z - eye.z;
  if (zc <= 0.008) return vec3(0.0, 0.0, -1.0);
  float persp = uFocal / zc;
  return vec3(uCenter + (v.xy - eye.xy) * uUnit * persp, zc);
}

void main(){
  vSeed = float(gl_InstanceID);
  vec3 rnd3 = hash31(vSeed * 0.61803 + 7.0);

  vec3 p     = orbitPos(aOrbit, aStar.x, aStar.y, uOrbitT,     uPattern);
  vec3 pPrev = orbitPos(aOrbit, aStar.x, aStar.y, uOrbitTPrev, uPatternPrev);
  vec3 s     = toScreen(p,     uR,     uEye);
  vec3 sPrev = toScreen(pPrev, uRPrev, uEyePrev);

  // behind the camera: collapse the quad so it costs nothing downstream
  if (s.z < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

  float zc = s.z;
  float T  = tempAt(aStar.z);
  vColor   = texture(uBB, vec2(aStar.z, 0.5)).rgb;

  // ── the two sizes ────────────────────────────────────────────────────────
  // Stefan-Boltzmann: L = 4(pi)R^2(sigma)T^4, so a star's radius follows
  // sqrt(L)/T^2. A cool red giant is enormous and a hot blue dwarf is small,
  // which is exactly why giants are the first things to resolve on approach.
  float tRel = T / 5772.0;
  float radius = uRadiusScale * sqrt(aStar.w) / (tRel * tRel);
  float persp  = uFocal / zc;
  float angPx  = radius * uUnit * persp;   // the true disc, in pixels
  float corePx = max(uPsf, angPx);         // what the instrument actually draws
  // Only the populations that MEAN something are allowed to resolve into a
  // body. The decorative near field is nominally made of ordinary distant suns
  // that merely happen to lie between the camera and the disk — letting their
  // discs open up as the camera brushes past them is what produced the soft
  // bokeh saucers the old engine spent so many comments capping.
  vDisc = smoothstep(uPsf * 0.85, uPsf * 2.2, angPx) * uResolve;
  corePx = mix(min(corePx, uPsf * 1.6), corePx, uResolve);

  // ── how much light arrives ───────────────────────────────────────────────
  // The inverse-square law, and then the problem every astrophotograph has:
  // the stars in one frame span six orders of magnitude of brightness. Shown
  // linearly, the handful of supergiants are all you see and the other hundred
  // thousand stars are black. So the flux gets an ASINH STRETCH — Lupton's, the
  // standard display transform in astronomy — which is linear near zero, so the
  // faint field keeps its true relative brightness, and logarithmic for bright
  // sources, so a supergiant reads as overwhelming without erasing the sky
  // around it. It is a display curve, not a fudge: the physics is upstream of
  // it and the ordering is exactly preserved.
  float flux = aStar.w / max(zc * zc, 1e-6);
  // A whisper of scintillation keeps a still field alive — and it fades out
  // completely as a star resolves, because something you are close enough to
  // see the surface of has no business flickering.
  float tw = 1.0 + uTwinkle * (1.0 - vDisc) * 0.34 * sin(uTime * (0.5 + rnd3.x * 1.4) + rnd3.y * 6.2831);
  vI = asinh(flux * 34.0) * uGain * uExposure * uDim * tw;
  // and a star the camera is about to pass THROUGH dissolves rather than
  // smearing itself across the glass
  if (uNear > 0.0) vI *= smoothstep(uNear * 0.22, uNear, zc);

  // Surface brightness is independent of distance (the inverse-square fall in
  // flux is exactly cancelled by the growth in solid angle) and goes as T^4.
  // This is what makes an O-star's photosphere blinding and a red giant's a
  // deep smouldering ember, with no per-star tuning anywhere.
  vSurface = pow(tRel, 4.0) * 1.15 * uDim * uExposure;

${hero ? `
  // A hero star keeps its blackbody HEART and wears the category light in its
  // halo — a white-hot core inside rose, or ember, or ice-blue, or violet. The
  // tint is who the ping is to you; the core is that it is a star. Tinting the
  // whole thing would have thrown away the physics the rest of the sky is built
  // on, and would have made your own stars the only fake ones in the field.
  vTint = aTint.rgb;
  vTintMix = 1.0;
  vI     *= aTint.a;
  vSurface *= aTint.a;
  vSpike  = aFx.x;
  corePx  = max(corePx, uPsf * (1.0 + aFx.y));
` : `
  vTint = vColor;
  vTintMix = 0.0;
  // Only genuinely luminous stars earn the diffraction cross. Spikes on every
  // near star read as glitter; in a real photograph they belong to a handful
  // of suns, and that scarcity is what makes them read as light rather than as
  // decoration.
  vSpike = smoothstep(0.9, 6.0, vI) * (1.0 - vDisc * 0.55);
`}
  vSpin = rnd3.z * 3.14159;

  // ── the sprite's extent ──────────────────────────────────────────────────
  // The PSF's wings reach further the brighter the star, but only
  // logarithmically — which is the whole reason a bright star reads as bright
  // rather than as big. Clamped so one enormous foreground sun can never turn
  // into a full-screen fill.
  float spread = 1.8 + 2.4 * log2(1.0 + max(vI, 0.0)) + vSpike * 5.5;
  float extPx  = min(corePx * spread, min(uViewport.x, uViewport.y) * 1.2);
  // The fragment shader needs to know where the sprite ENDS, so it can take the
  // point-spread's long tail to exactly zero there. Without this the aureole —
  // which by design falls off very slowly, because real optics do — is still
  // faintly non-zero at the quad's corner, and a bright star leaves a visible
  // rectangle on the sky. It is the one artifact an analytic PSF can have that
  // a baked sprite cannot.
  vEdge = spread;

  // ── motion ───────────────────────────────────────────────────────────────
  vec2 motion = (sPrev.z > 0.0) ? (s.xy - sPrev.xy) : vec2(0.0);
  float mlen = min(length(motion) * uMotion, min(uViewport.x, uViewport.y) * 0.16);
  vec2 dir = mlen > 0.001 ? normalize(motion) : vec2(1.0, 0.0);
  vec2 perp = vec2(-dir.y, dir.x);
  float halfLen = mlen * 0.5;

  // the sprite is a capsule: a segment of length "mlen" with the PSF wrapped
  // around it, so a star sweeping past is smeared along its own true apparent
  // path instead of being stroked with a line
  vec2 centre = s.xy - motion * 0.5 * uMotion;
  vec2 offPx = dir * (aCorner.x * (extPx + halfLen)) + perp * (aCorner.y * extPx);
  vec2 px = centre + offPx;

  vOffset = vec2(aCorner.x * (extPx + halfLen), aCorner.y * extPx) / max(corePx, 0.0001);
  vSeg = halfLen / max(corePx, 0.0001);

  gl_Position = vec4((px / uViewport) * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
}
`

const FS = `#version 300 es
${COMMON}
${GLSL_PSF}

in vec2  vOffset;
in vec3  vColor;
in vec3  vTint;
in float vTintMix;
in float vI;
in float vSurface;
in float vDisc;
in float vSpike;
in float vSpin;
in float vSeg;
in float vEdge;
in float vSeed;

uniform float uTime;
out vec4 frag;

// two octaves of value noise on the photosphere — convection granulation. Only
// ever evaluated on the handful of pixels of a genuinely resolved star, so its
// cost is invisible.
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash11(i.x + i.y * 57.0);
  float b = hash11(i.x + 1.0 + i.y * 57.0);
  float c = hash11(i.x + (i.y + 1.0) * 57.0);
  float d = hash11(i.x + 1.0 + (i.y + 1.0) * 57.0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main(){
  // capsule distance: collapses to plain radial distance when the star is not
  // moving, so a resting field costs nothing extra for the motion support
  vec2 q = vec2(max(abs(vOffset.x) - vSeg, 0.0), vOffset.y);
  float r = length(q);
  float window = smoothstep(vEdge, vEdge * 0.68, r);
  if (window <= 0.0 && vDisc < 0.5) discard;

  // ── chromatic bloom ──────────────────────────────────────────────────────
  // A real lens does not focus every wavelength at the same point. Sampling the
  // point-spread at a slightly different radius per channel makes a bright
  // star's halo shade outward through its own colour — the warm inner ring and
  // cool outer fringe that make photographed starlight look photographed.
  vec3 psf = vec3(
    psfCore(r * 0.93),
    psfCore(r),
    psfCore(r * 1.09)
  );
  // the halo shades from the star's own blackbody heart out into its category
  // light; at vTintMix = 0 (every ordinary star) this costs one mix and changes
  // nothing
  vec3 col = mix(vColor, vTint, clamp(r * 0.62, 0.0, 1.0) * vTintMix);
  vec3 light = col * vI * psf;

  // the diffraction cross, earned
  if (vSpike > 0.002) {
    float sp = psfSpikes(q, r, vSpin);
    light += col * vI * vSpike * sp * 0.85;
  }

  // ── the resolved photosphere ─────────────────────────────────────────────
  if (vDisc > 0.002) {
    float inside = smoothstep(1.02, 0.90, r);
    if (inside > 0.0) {
      // limb darkening: the edge of a star's disc is dimmer and redder than its
      // centre, because there you are looking through more of its atmosphere at
      // a shallower angle. It is the single cue that makes a disc read as a
      // sphere rather than as a circle.
      float mu = sqrt(clamp(1.0 - r * r, 0.0, 1.0));
      float limb = 0.34 + 0.66 * pow(mu, 0.58);
      // granulation — the convection cells boiling on the surface, drifting
      vec2 sp = vOffset * 3.4 + vec2(vSeed * 13.7, vSeed * 7.1);
      float gran = vnoise(sp + uTime * 0.05) * 0.6 + vnoise(sp * 2.7 - uTime * 0.03) * 0.4;
      float surf = (0.86 + 0.28 * gran) * limb;
      // the limb reddens as it darkens — cooler gas, seen obliquely
      vec3 edgeTint = mix(vec3(1.0, 0.72, 0.46), vec3(1.0), pow(mu, 0.4));
      vec3 body = vColor * edgeTint * vSurface * surf;
      light = mix(light, body + light * 0.35, inside * vDisc);
    }
  }

  frag = vec4(light * window, 1.0);
}
`

// ── the pass ─────────────────────────────────────────────────────────────────
export class StarPass {
  constructor(gl) {
    this.gl = gl
    this.quad = makeQuad(gl)
    this.prog = compile(gl, VS(false), FS, 'stars')
    this.heroProg = compile(gl, VS(true), FS, 'stars:hero')
    this.groups = []
  }

  // A population: one static attribute buffer, one draw call. Buffers are
  // uploaded once and never touched again unless the population itself changes
  // (a community growing, a ping released), which is the entire point.
  createGroup(data, opts = {}) {
    const gl = this.gl
    const g = {
      vao: gl.createVertexArray(),
      buf: gl.createBuffer(),
      count: data.length / STAR_STRIDE,
      capacity: data.length / STAR_STRIDE,
      gain: opts.gain != null ? opts.gain : 1,
      radiusScale: opts.radiusScale != null ? opts.radiusScale : 0.0012,
      twinkle: opts.twinkle != null ? opts.twinkle : 1,
      motion: opts.motion != null ? opts.motion : 0.55,
      resolve: opts.resolve != null ? opts.resolve : 1,
      nearFade: opts.nearFade || 0,
      pattern: opts.pattern != null ? opts.pattern : 1,
      hero: false,
      visible: true,
      dim: 1,
    }
    gl.bindVertexArray(g.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf)
    gl.bufferData(gl.ARRAY_BUFFER, data, opts.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW)
    const stride = STAR_STRIDE * 4
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0)
    gl.vertexAttribDivisor(1, 1)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16)
    gl.vertexAttribDivisor(2, 1)
    gl.bindVertexArray(null)
    this.groups.push(g)
    return g
  }

  // The viewer's own stars, a tapped stranger's, the two stars of a match: a
  // handful of instances that carry their own tint and their own dressing.
  // Rebuilt every frame from a tiny array, because there are never more than a
  // few dozen and their state changes constantly.
  createHeroGroup(capacity = 64) {
    const gl = this.gl
    const g = {
      vao: gl.createVertexArray(),
      buf: gl.createBuffer(),
      tintBuf: gl.createBuffer(),
      fxBuf: gl.createBuffer(),
      count: 0,
      capacity,
      star: new Float32Array(capacity * STAR_STRIDE),
      tint: new Float32Array(capacity * 4),
      fx: new Float32Array(capacity * 4),
      gain: 1,
      radiusScale: 0.0012,
      twinkle: 0.35,
      motion: 1,
      resolve: 1,
      nearFade: 0,
      pattern: 1,
      hero: true,
      visible: true,
      dim: 1,
    }
    gl.bindVertexArray(g.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)
    const bind = (buf, loc, size, bytes) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, size * 4, 0)
      gl.vertexAttribDivisor(loc, 1)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf)
    gl.bufferData(gl.ARRAY_BUFFER, g.star, gl.DYNAMIC_DRAW)
    const stride = STAR_STRIDE * 4
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0)
    gl.vertexAttribDivisor(1, 1)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16)
    gl.vertexAttribDivisor(2, 1)
    bind(g.tintBuf, 3, 4, g.tint)
    bind(g.fxBuf, 4, 4, g.fx)
    gl.bindVertexArray(null)
    this.groups.push(g)
    return g
  }

  uploadHero(g) {
    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, g.star, 0, g.count * STAR_STRIDE)
    gl.bindBuffer(gl.ARRAY_BUFFER, g.tintBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, g.tint, 0, g.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, g.fxBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, g.fx, 0, g.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  // Regrow a static population in place — the community sky, gaining members.
  // Reallocates only when the new population outgrows the buffer, and grows in
  // generous steps so a busy evening is not a stream of reallocations.
  updateGroup(g, data) {
    const gl = this.gl
    const n = data.length / STAR_STRIDE
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf)
    if (n > g.capacity) {
      g.capacity = Math.ceil(n * 1.5)
      gl.bufferData(gl.ARRAY_BUFFER, g.capacity * STAR_STRIDE * 4, gl.DYNAMIC_DRAW)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
    }
    g.count = n
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  draw(cam, ctx) {
    const gl = this.gl
    let cur = null
    for (const g of this.groups) {
      if (!g.visible || g.count <= 0 || g.dim <= 0.001) continue
      const prog = g.hero ? this.heroProg : this.prog
      if (!prog) continue
      if (cur !== prog) {
        gl.useProgram(prog.p)
        cur = prog
        const u = prog.u
        gl.uniformMatrix3fv(u.uR, false, cam.R)
        gl.uniformMatrix3fv(u.uRPrev, false, ctx.RPrev)
        gl.uniform3f(u.uEye, cam.eye.x, cam.eye.y, cam.eye.z)
        gl.uniform3f(u.uEyePrev, ctx.eyePrev.x, ctx.eyePrev.y, ctx.eyePrev.z)
        gl.uniform2f(u.uCenter, cam.cx * ctx.scale, cam.cy * ctx.scale)
        gl.uniform2f(u.uViewport, ctx.width, ctx.height)
        gl.uniform1f(u.uUnit, cam.unit * ctx.scale)
        gl.uniform1f(u.uCam, ctx.CAM)
        gl.uniform1f(u.uFocal, ctx.FOCAL)
        gl.uniform1f(u.uOrbitT, ctx.orbitT)
        gl.uniform1f(u.uOrbitTPrev, ctx.orbitTPrev)
        gl.uniform1f(u.uPattern, ctx.pattern)
        gl.uniform1f(u.uPatternPrev, ctx.patternPrev)
        gl.uniform1f(u.uExposure, cam.exposure)
        gl.uniform1f(u.uTime, ctx.t)
        gl.uniform1f(u.uPsf, ctx.psf)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, ctx.bbTex)
        gl.uniform1i(u.uBB, 0)
      }
      const u = cur.u
      // The sky's own dim (the calm screens, the send-off, the match) folds into
      // every population's — except the hero stars. Yours stay lit through a
      // dimmed field on purpose: that is what keeps your own ping findable while
      // the foreground text reads over a quietened cosmos.
      gl.uniform1f(u.uDim, g.hero ? g.dim : g.dim * ctx.dim)
      gl.uniform1f(u.uGain, g.gain)
      gl.uniform1f(u.uRadiusScale, g.radiusScale)
      gl.uniform1f(u.uTwinkle, ctx.reduced ? 0 : g.twinkle)
      gl.uniform1f(u.uMotion, ctx.reduced ? 0 : g.motion)
      gl.uniform1f(u.uResolve, g.resolve != null ? g.resolve : 1)
      gl.uniform1f(u.uNear, g.nearFade || 0)
      gl.uniform1f(u.uPatternMix, g.pattern != null ? g.pattern : 1)
      if (g.hero) this.uploadHero(g)
      gl.bindVertexArray(g.vao)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, g.count)
    }
    gl.bindVertexArray(null)
  }

  // Throw the whole population away. Called when the frame-time governor moves
  // the quality tier, which regenerates every buffer at a new density — doing
  // this piecemeal (keeping some groups, rebuilding others, re-attaching them
  // afterwards) is exactly the kind of bookkeeping that ends up using a deleted
  // buffer. Populations are cheap to regenerate and deterministic in their
  // seeds, so the same galaxy comes back.
  clear() {
    const gl = this.gl
    for (const g of this.groups) {
      gl.deleteVertexArray(g.vao)
      gl.deleteBuffer(g.buf)
      if (g.tintBuf) gl.deleteBuffer(g.tintBuf)
      if (g.fxBuf) gl.deleteBuffer(g.fxBuf)
    }
    this.groups.length = 0
  }

  destroy() {
    const gl = this.gl
    this.clear()
    gl.deleteBuffer(this.quad)
    if (this.prog) gl.deleteProgram(this.prog.p)
    if (this.heroProg) gl.deleteProgram(this.heroProg.p)
  }
}

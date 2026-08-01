// sky/body.js — the one thing in this sky that is not made of light.
//
// Every other pass in the renderer is additive. That is correct for stars: a
// point of light has no back, nothing hides behind it, and summing light into
// an HDR buffer is what a sensor does. But it is wrong for a SURFACE, and at
// the end of a dive a star stops being a point and becomes a surface — and an
// additive surface is a ghost. The field behind it shines straight through, the
// point-spread's own core sits on top of it as a milky wash, and what should be
// the closest, most solid object in the product reads as a slightly transparent
// ball. That is precisely what it looked like.
//
// So a resolved photosphere gets its own pass, and it is OPAQUE. It is drawn
// after every additive layer, with premultiplied alpha, so inside the limb the
// destination is REPLACED. Stars behind it are occluded. There is a horizon.
//
// The same quad carries the corona: outside r = 1 the shader writes alpha 0 and
// non-zero colour, which under premultiplied blending is exactly addition — so
// the disc is solid and the light around it still sums into the same HDR buffer
// the bloom pass reads. One draw, two blending regimes, no second target.
//
// What is on the surface, and why each thing is there:
//
//   · limb darkening, per channel. You are looking through more atmosphere at
//     a shallower angle near the edge, so the limb is dimmer AND redder. This
//     is the single cue that turns a circle into a sphere, and doing it per
//     channel (blue falls off fastest) is what makes the reddening free.
//   · granulation, sampled on the SPHERE rather than on the disc. The noise is
//     evaluated at (x, y, sqrt(1-r^2)) — the actual visible point of the unit
//     sphere — so the cells foreshorten toward the limb on their own. Sampling
//     flat, in disc coordinates, is what made the old attempt look like a
//     texture pasted on a coin.
//   · supergranulation under it, an order of magnitude larger and far fainter.
//   · starspots: cool magnetic regions, umbra and penumbra, with filamentary
//     structure in the penumbra. Placed by noise, so they are different on
//     every star and they ROTATE, because the body turns.
//   · faculae: the bright magnetic network in the lanes between granules,
//     visible mainly near the limb, which is why the real Sun's edge sparkles.
//   · a chromospheric rim, and a streamered corona reaching out past it.
//
// The whole thing costs what it costs only on the handful of pixels of a
// genuinely resolved star, which in practice means one star, during a dive.

import { compile, makeQuad, GLSL_HASH } from './gl.js'

// how far past the limb the quad reaches, for the corona
const EXT = 1.85

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPos;    // cx, cy (css px), radius (css px), spin
layout(location=2) in vec4 aColor;  // rgb (linear), surface brightness
layout(location=3) in vec4 aMisc;   // seed, coverage, corona gain, pole tip

uniform vec2  uViewport;
uniform float uScale;

out vec2  vUv;      // position on the disc, in stellar radii
out vec3  vColor;
out float vSurface;
out float vSeed;
out float vCover;
out float vCorona;
out float vSpin;
out float vTip;
out float vPx;      // the star's radius in device pixels — the detail budget

void main(){
  vUv = aCorner * ${EXT.toFixed(2)};
  vColor = aColor.rgb;
  vSurface = aColor.a;
  vSeed = aMisc.x;
  vCover = aMisc.y;
  vCorona = aMisc.z;
  vTip = aMisc.w;
  vSpin = aPos.w;
  float rPx = aPos.z * uScale;
  vPx = rPx;
  vec2 p = aPos.xy * uScale + aCorner * rPx * ${EXT.toFixed(2)};
  gl_Position = vec4((p / uViewport) * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
}
`

const FS = `#version 300 es
precision highp float;
${GLSL_HASH}

in vec2  vUv;
in vec3  vColor;
in float vSurface;
in float vSeed;
in float vCover;
in float vCorona;
in float vSpin;
in float vTip;
in float vPx;

uniform float uTime;
uniform float uDetail;  // 1 = every octave, 0 = the cheap sky
out vec4 frag;

// value noise on the sphere. Eight hashed corners and a smoothstep — the same
// noise the gas volume uses, at a scale where a "cell" is a convection cell.
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

void main(){
  float r = length(vUv);
  if (r > ${EXT.toFixed(2)}) discard;

  vec3 light = vec3(0.0);
  float alpha = 0.0;

  // ── the disc ──────────────────────────────────────────────────────────────
  if (r < 1.0009) {
    // How much of the sphere's normal points at us. Everything on the surface
    // is a function of this: it IS the cosine of the viewing angle.
    float mu = sqrt(max(1.0 - r * r, 0.0));

    // The visible point of the unit sphere, turned into the body's own frame:
    // tip the pole out of the line of sight, then spin. The spin is real and
    // very slow, and it is what makes a held star read as a WORLD — spots and
    // granules creep across the face instead of sitting there like a print.
    vec3 sph = vec3(vUv.x, vUv.y, mu);
    float ct = cos(vTip), st = sin(vTip);
    sph = vec3(sph.x, sph.y * ct - sph.z * st, sph.y * st + sph.z * ct);
    float sa = sin(vSpin), ca = cos(vSpin);
    sph = vec3(sph.x * ca + sph.z * sa, sph.y, -sph.x * sa + sph.z * ca);
    vec3 sp = sph + vSeed;

    // ── granulation ─────────────────────────────────────────────────────────
    // Convection: hot gas rises in the middle of a cell, cools, and sinks in
    // the dark lanes between them. The contrast punch (the smoothstep) is what
    // turns smooth value noise into cells-with-lanes rather than clouds.
    // The frequency is tied to how big the star actually is on screen, so a
    // star 40 px across gets cells it can resolve and one filling the frame
    // gets the fine structure it has earned — instead of the fixed low
    // frequency that made a close star a flat gradient.
    float fq = clamp(vPx * 0.15, 11.0, 46.0);
    float boil = uTime * 0.035;

    // Supergranulation first, because it is also the WARP. Value noise lives on
    // a cubic lattice, and at the contrast convection needs, that lattice is
    // plainly visible: the cells come out as axis-aligned squares, which is the
    // one thing that makes a procedural surface read as procedural. Two cures,
    // both nearly free. Displace the sample point by the wide noise, so the
    // lattice bends; and take the second octave through a rotation, so its grid
    // never lines up with the first one's. What is left has no preferred
    // direction, which is what a boiling surface actually looks like.
    float sup = vnoise3(sp * 5.2 + 11.0);
    vec3 wp = sp + (sup - 0.5) * 0.075;
    const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
    float g = vnoise3(wp * fq + boil) * 0.62 + vnoise3(ROT * wp * (fq * 2.1) - boil * 1.7) * 0.38;
    if (uDetail > 0.5) g = g * 0.82 + vnoise3(ROT * ROT * wp * (fq * 4.7) + boil * 2.4) * 0.18;
    float gran = smoothstep(0.30, 0.74, g);
    // The real Sun's granules swing about 15% around the mean. This is roughly
    // double that, deliberately: the tonemap eats most of the contrast on the
    // way to the screen, and a physically exact swing arrives invisible.
    float surf = 0.62 + 0.55 * gran + 0.13 * (sup - 0.5);

    // ── starspots ───────────────────────────────────────────────────────────
    // Cool magnetic regions. Umbra about a quarter as bright as the
    // photosphere and markedly redder (it is genuinely cooler gas), penumbra
    // between, and the penumbra is filamentary rather than smooth.
    float sn = vnoise3(wp * 2.9 + 37.0);
    float pen = smoothstep(0.640, 0.716, sn);
    float umb = smoothstep(0.716, 0.770, sn);
    if (pen > 0.0) {
      float fil = uDetail > 0.5 ? vnoise3(wp * vec3(34.0, 9.0, 34.0) + 5.0) : gran;
      float pDark = 1.0 - pen * (0.38 + 0.22 * fil);
      surf *= mix(1.0, pDark, 1.0 - umb);
      surf *= 1.0 - umb * 0.80;
    }

    // ── faculae ─────────────────────────────────────────────────────────────
    // The bright network in the lanes, seen through the side of the granule
    // wall — so it shows near the limb and all but vanishes at disc centre.
    float fac = (1.0 - smoothstep(0.30, 0.62, gran)) * pow(1.0 - mu, 2.2) * 0.55;
    surf += fac * (1.0 - umb);

    // ── limb darkening, per channel ─────────────────────────────────────────
    // I(mu)/I(1) = 1 - u + u*mu, the standard linear law, with u rising toward
    // the blue. The limb comes out dimmer and warmer for free — no tint ramp.
    vec3 u = vec3(0.56, 0.72, 0.88);
    vec3 limb = (1.0 - u) + u * mu;

    // the chromosphere: a thin hot rim right at the edge of the disc, where you
    // are looking tangentially through the layer above the photosphere
    float rim = smoothstep(0.978, 0.9995, r);
    vec3 chrom = vec3(1.0, 0.40, 0.33) * rim * rim * 1.15;

    vec3 body = vColor * limb * surf * vSurface + chrom * vSurface * 0.5;

    // the limb itself is razor sharp — a star's atmosphere is a rounding error
    // against its radius. Antialias it against the pixel, nothing wider.
    float w = max(fwidth(r), 0.0006);
    float cov = (1.0 - smoothstep(1.0 - w, 1.0 + w, r)) * vCover;
    light += body * cov;
    alpha = cov;
  }

  // ── the corona ────────────────────────────────────────────────────────────
  // Outside the limb: alpha stays 0, so this composites as pure addition into
  // the same HDR buffer every star writes to. Streamers are angular noise,
  // stretched radially, the way the real thing is combed out along field lines.
  if (r > 0.985) {
    float o = max(r - 1.0, 0.0);
    float ang = atan(vUv.y, vUv.x);
    float sN = vnoise3(vec3(cos(ang), sin(ang), 0.0) * 3.4 + vSeed + o * 0.6);
    float streamers = 0.45 + 0.95 * sN;
    float k = exp(-o * 6.2) * streamers * 0.22 + exp(-o * 48.0) * 0.55;
    light += vColor * vSurface * vCorona * k * (1.0 - alpha);
  }

  // the rule every pass writes under: nothing that is not finite and
  // non-negative may enter the buffer (see stars.js)
  vec3 outc = min(light, vec3(512.0));
  outc = mix(outc, vec3(0.0), vec3(isnan(outc)));
  alpha = clamp(alpha, 0.0, 1.0);
  if (alpha < 0.002 && dot(outc, vec3(1.0)) < 0.0008) discard;
  frag = vec4(max(outc, vec3(0.0)), alpha);
}
`

// ── the pass ─────────────────────────────────────────────────────────────────
// There is never more than a handful of these — a resolved star is one you are
// standing in front of — so the buffers are tiny and rewritten every frame.
export class BodyPass {
  constructor(gl, capacity = 8) {
    this.gl = gl
    this.prog = compile(gl, VS, FS, 'body')
    this.capacity = capacity
    this.count = 0
    this.detail = 1
    this.pos = new Float32Array(capacity * 4)
    this.color = new Float32Array(capacity * 4)
    this.misc = new Float32Array(capacity * 4)
    this.quad = makeQuad(gl)
    this.vao = gl.createVertexArray()
    this.posBuf = gl.createBuffer()
    this.colorBuf = gl.createBuffer()
    this.miscBuf = gl.createBuffer()
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
    bind(this.colorBuf, 2, this.color)
    bind(this.miscBuf, 3, this.misc)
    gl.bindVertexArray(null)
  }

  reset() {
    this.count = 0
  }

  // x, y and radius are in CSS pixels — the same units the CPU projection and
  // the billboard pass speak, so the disc lands exactly where the star pass
  // drew the point it grew out of.
  push(x, y, radiusCss, color, surface, opts = {}) {
    if (this.count >= this.capacity || !(radiusCss > 0)) return
    const i = this.count++
    const o = i * 4
    this.pos[o] = x
    this.pos[o + 1] = y
    this.pos[o + 2] = radiusCss
    this.pos[o + 3] = opts.spin || 0
    this.color[o] = color[0]
    this.color[o + 1] = color[1]
    this.color[o + 2] = color[2]
    this.color[o + 3] = surface
    this.misc[o] = opts.seed || 0
    this.misc[o + 1] = opts.cover != null ? opts.cover : 1
    this.misc[o + 2] = opts.corona != null ? opts.corona : 1
    this.misc[o + 3] = opts.tip != null ? opts.tip : 0.35
  }

  draw(ctx) {
    if (!this.count || !this.prog) return
    const gl = this.gl
    gl.useProgram(this.prog.p)
    gl.enable(gl.BLEND)
    // premultiplied: inside the limb alpha is 1 and the destination is
    // REPLACED (this is the occlusion), outside it alpha is 0 and the corona
    // simply adds. One blend mode, both behaviours.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform2f(this.prog.u.uViewport, ctx.width, ctx.height)
    gl.uniform1f(this.prog.u.uScale, ctx.scale)
    gl.uniform1f(this.prog.u.uTime, ctx.t)
    gl.uniform1f(this.prog.u.uDetail, this.detail)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos, 0, this.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.color, 0, this.count * 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.miscBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.misc, 0, this.count * 4)
    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count)
    gl.bindVertexArray(null)
    gl.blendFunc(gl.ONE, gl.ONE)
  }

  destroy() {
    const gl = this.gl
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.posBuf)
    gl.deleteBuffer(this.colorBuf)
    gl.deleteBuffer(this.miscBuf)
    gl.deleteBuffer(this.quad)
    if (this.prog) gl.deleteProgram(this.prog.p)
  }
}

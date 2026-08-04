// sky/post.js — the end of the frame: bloom, tonemap, and the deep-space floor.
//
// This is the pass that lets every other pass stop lying. In the canvas engines
// "glow" was a pre-baked halo image blitted under each bright star, which meant
// brightness could only ever be spent as SIZE — a bigger sticker — and the code
// is full of hard caps fighting the bokeh discs that produced. Here the sky is
// rendered into a half-float buffer with no ceiling at all: a hot supergiant
// genuinely writes 40x white, and this pass is what discovers it, the way a
// camera sensor does.
//
// Bloom is dual-Kawase rather than a gaussian mip chain. Both give a wide, soft
// falloff; Kawase gets there with a handful of bilinear taps per level instead
// of a separable kernel per level, which on a phone is the difference between
// affordable and not — and mobile bandwidth, not arithmetic, is what this whole
// renderer is budgeted against.
//
// Then ACES, which is what keeps a blown highlight coloured. Naive clamping
// turns every bright star into the same white disc; ACES's shoulder rolls off
// while preserving hue, so a 30,000 K star's core stays visibly blue at full
// exposure and a red giant's stays amber. That single curve is most of the
// difference between "renders stars" and "photographs stars".

import { compile, FULLSCREEN_VS, Target, GLSL_TONEMAP, GLSL_HASH } from './gl.js'

// The deep-space floor. Not a flat fill: real dark sky is not uniform, and a
// perfectly even black is the fastest way to make a canvas read as a canvas.
// A vertical cosmic-violet gradient, plus the faint slanted light of the far
// larger galaxy this whole field hangs inside — sampled from the same noise
// volume the gas uses, so it has real clumped structure and a dust rift down
// its spine instead of being a smooth airbrushed band.
const BACKGROUND_FS = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 frag;
uniform vec2 uViewport;
uniform vec3 uTop, uMid, uBot;
uniform float uBand;      // the far galaxy's brightness
uniform float uBandTilt;
uniform vec2 uBandShift;  // a whisper of parallax; it is very far away
uniform sampler3D uNoise;

void main(){
  vec3 sky = vUv.y < 0.55
    ? mix(uTop, uMid, vUv.y / 0.55)
    : mix(uMid, uBot, (vUv.y - 0.55) / 0.45);

  if (uBand > 0.001) {
    vec2 p = (vUv - 0.5 + uBandShift) * vec2(uViewport.x / uViewport.y, 1.0);
    float c = cos(uBandTilt), s = sin(uBandTilt);
    vec2 q = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    // the ribbon's cross-section: dense at the spine, dissolving outward
    float spine = exp(-q.y * q.y * 26.0);
    // clumped starlight along its length, and the great rift down its middle
    vec4 n = texture(uNoise, vec3(q * vec2(0.55, 2.1) + 0.5, 0.31));
    vec4 n2 = texture(uNoise, vec3(q * vec2(1.7, 4.4) + 0.5, 0.77));
    float milk = smoothstep(0.28, 0.85, n.r * 0.7 + n2.g * 0.3);
    float rift = smoothstep(0.42, 0.86, n.b) * exp(-q.y * q.y * 90.0);
    float ends = smoothstep(1.15, 0.25, abs(q.x)); // dissolves at both ends
    float band = spine * milk * ends * max(0.0, 1.0 - rift * 1.5);
    sky += mix(vec3(0.62, 0.60, 0.78), vec3(0.80, 0.70, 0.60), n2.a) * band * uBand;
  }
  frag = vec4(sky, 1.0);
}
`

const PREFILTER_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold, uKnee;
void main(){
  // a 4-tap box while we are already downsampling — it costs nothing and it
  // stops single blown pixels from flickering as the camera moves
  vec3 c = (
    texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb +
    texture(uSrc, vUv + uTexel * vec2( 1.0, -1.0)).rgb +
    texture(uSrc, vUv + uTexel * vec2(-1.0,  1.0)).rgb +
    texture(uSrc, vUv + uTexel * vec2( 1.0,  1.0)).rgb
  ) * 0.25;
  // soft-knee threshold: a hard cut makes bloom pop in as things brighten,
  // which is exactly the kind of switching the eye notices
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  float w = max(soft, br - uThreshold) / max(br, 1e-5);
  frag = vec4(c * w, 1.0);
}
`

const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uSrc;
uniform vec2 uHalf;
void main(){
  vec3 sum = texture(uSrc, vUv).rgb * 4.0;
  sum += texture(uSrc, vUv - uHalf).rgb;
  sum += texture(uSrc, vUv + uHalf).rgb;
  sum += texture(uSrc, vUv + vec2(uHalf.x, -uHalf.y)).rgb;
  sum += texture(uSrc, vUv - vec2(uHalf.x, -uHalf.y)).rgb;
  frag = vec4(sum / 8.0, 1.0);
}
`

const UP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uSrc;
uniform vec2 uHalf;
void main(){
  vec3 sum = texture(uSrc, vUv + vec2(-uHalf.x * 2.0, 0.0)).rgb;
  sum += texture(uSrc, vUv + vec2(-uHalf.x, uHalf.y)).rgb * 2.0;
  sum += texture(uSrc, vUv + vec2(0.0, uHalf.y * 2.0)).rgb;
  sum += texture(uSrc, vUv + vec2(uHalf.x, uHalf.y)).rgb * 2.0;
  sum += texture(uSrc, vUv + vec2(uHalf.x * 2.0, 0.0)).rgb;
  sum += texture(uSrc, vUv + vec2(uHalf.x, -uHalf.y)).rgb * 2.0;
  sum += texture(uSrc, vUv + vec2(0.0, -uHalf.y * 2.0)).rgb;
  sum += texture(uSrc, vUv + vec2(-uHalf.x, -uHalf.y)).rgb * 2.0;
  frag = vec4(sum / 12.0, 1.0);
}
`

const COMPOSITE_FS = `#version 300 es
precision highp float;
${GLSL_HASH}
${GLSL_TONEMAP}
in vec2 vUv;
out vec4 frag;
uniform sampler2D uScene, uBloom, uBlue;
uniform vec2 uViewport;
uniform float uBloomAmount, uExposure, uVignette, uChroma, uTime, uFlash;
uniform vec3  uFloor;
uniform vec3 uFlashColor;

void main(){
  // The last line of defence. Every pass that writes the scene buffer already
  // guarantees a finite, non-negative value (stars.js explains why), but ACES
  // is where a non-finite one would become visible — Inf/Inf is NaN, and NaN
  // clamps to black — so the sensor refuses to read one rather than printing a
  // hole in the sky.
  vec3 scene = min(texture(uScene, vUv).rgb, vec3(60000.0));
  scene = mix(scene, vec3(0.0), vec3(isnan(scene)));

  // Bloom carries a whisper of lateral chromatic spread — the red halo reaching
  // very slightly further than the blue. It is the same optical truth the star
  // shader's per-channel point-spread expresses, continued at the scale of the
  // whole frame, and it is what stops a big bloom from looking like a grey
  // gaussian smear pasted over the picture.
  vec2 c = (vUv - 0.5) * uChroma;
  vec3 bloom = vec3(
    texture(uBloom, vUv + c * 1.6).r,
    texture(uBloom, vUv).g,
    texture(uBloom, vUv - c * 1.4).b
  );
  bloom = mix(min(bloom, vec3(60000.0)), vec3(0.0), vec3(isnan(bloom)));
  vec3 col = scene + bloom * uBloomAmount;

  // the match's light echo, and any other whole-sky flash — added in linear
  // light BEFORE the tonemap, so it rolls off the shoulder like real light
  // rather than washing the frame out to paper
  col += uFlashColor * uFlash;

  col *= uExposure;
  col = aces(col);

  // a very soft vignette. Not for style: it is what keeps the corners of a
  // wide monitor from reading as brighter than the centre of the field.
  float v = length((vUv - 0.5) * vec2(1.0, 0.92));
  col *= 1.0 - uVignette * smoothstep(0.35, 0.95, v);

  // linear -> sRGB
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));

  // The floor the frame never goes below — a lifted black, the way a print on
  // paper has no true black in it because the paper is not black. Zero in
  // production, where the void genuinely is the void; /beta lifts it to the
  // colour of a closed leather case, which is the difference between a brown
  // galaxy on a black screen and a brown galaxy inside something.
  col = uFloor + col * (1.0 - uFloor);

  // Dither. A near-black cosmic field in 8-bit banding is one of the most
  // recognisable tells of a rendered background, and a quarter-LSB of noise
  // removes it completely at zero perceptual cost.
  float d = texture(uBlue, gl_FragCoord.xy / 64.0).r;
  col += (d - 0.5) / 255.0;

  frag = vec4(col, 1.0);
}
`

export class PostChain {
  constructor(gl, caps, fullscreen) {
    this.gl = gl
    this.caps = caps
    this.fs = fullscreen
    this.background = compile(gl, FULLSCREEN_VS, BACKGROUND_FS, 'bg')
    this.prefilter = compile(gl, FULLSCREEN_VS, PREFILTER_FS, 'bloom:pre')
    this.down = compile(gl, FULLSCREEN_VS, DOWN_FS, 'bloom:down')
    this.up = compile(gl, FULLSCREEN_VS, UP_FS, 'bloom:up')
    this.composite = compile(gl, FULLSCREEN_VS, COMPOSITE_FS, 'composite')
    this.levels = []
    this.bloomAmount = 0.2
    this.threshold = 1.5
    this.knee = 0.55
    this.exposure = 1
    this.vignette = 0.4
    this.floor = [0, 0, 0]
    this.chroma = 0.0055
    this.flash = 0
    this.flashColor = [1, 0.95, 0.9]
    this.bandBright = 0.019
    this.bandTilt = -0.42
    // Deep space is BLACK, and the violet in it is the faintest tint rather
    // than a colour of its own — a lifted floor is what made the sky read as a
    // dark purple surface with stars printed on it instead of as depth. Kept
    // just off zero, and dithered in the composite, so it still breathes
    // vertically and never bands.
    this.sky = { top: [0.0031, 0.0026, 0.0078], mid: [0.0017, 0.0014, 0.0046], bot: [0.0010, 0.0008, 0.0028] }
  }

  resize(w, h, count) {
    const gl = this.gl
    for (const l of this.levels) l.destroy()
    this.levels = []
    let lw = Math.max(1, Math.floor(w / 2))
    let lh = Math.max(1, Math.floor(h / 2))
    for (let i = 0; i < count; i++) {
      this.levels.push(new Target(gl, this.caps, lw, lh))
      lw = Math.max(1, Math.floor(lw / 2))
      lh = Math.max(1, Math.floor(lh / 2))
      if (lw <= 2 || lh <= 2) break
    }
  }

  drawBackground(target, ctx) {
    const gl = this.gl
    const p = this.background
    if (!p) return
    target.bind()
    gl.disable(gl.BLEND)
    gl.useProgram(p.p)
    gl.uniform2f(p.u.uViewport, target.w, target.h)
    gl.uniform3fv(p.u.uTop, this.sky.top)
    gl.uniform3fv(p.u.uMid, this.sky.mid)
    gl.uniform3fv(p.u.uBot, this.sky.bot)
    gl.uniform1f(p.u.uBand, this.bandBright * ctx.dim)
    gl.uniform1f(p.u.uBandTilt, this.bandTilt)
    gl.uniform2f(p.u.uBandShift, ctx.bandShift[0], ctx.bandShift[1])
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_3D, ctx.noiseTex)
    gl.uniform1i(p.u.uNoise, 2)
    this.fs.draw()
  }

  // scene (HDR) → bloom chain → the canvas
  run(scene, ctx) {
    const gl = this.gl
    gl.disable(gl.BLEND)
    if (this.levels.length && this.prefilter && this.down && this.up) {
      // bright pass into level 0
      const l0 = this.levels[0]
      l0.bind()
      gl.useProgram(this.prefilter.p)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, scene.tex)
      gl.uniform1i(this.prefilter.u.uSrc, 1)
      gl.uniform2f(this.prefilter.u.uTexel, 1 / scene.w, 1 / scene.h)
      gl.uniform1f(this.prefilter.u.uThreshold, this.threshold)
      gl.uniform1f(this.prefilter.u.uKnee, this.knee)
      this.fs.draw()

      // down the chain
      gl.useProgram(this.down.p)
      gl.uniform1i(this.down.u.uSrc, 1)
      for (let i = 1; i < this.levels.length; i++) {
        const src = this.levels[i - 1]
        const dst = this.levels[i]
        dst.bind()
        gl.bindTexture(gl.TEXTURE_2D, src.tex)
        gl.uniform2f(this.down.u.uHalf, 0.5 / src.w, 0.5 / src.h)
        this.fs.draw()
      }
      // and back up, accumulating — additive so each level's wider blur is
      // layered onto the tighter ones and the falloff stays smooth
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.useProgram(this.up.p)
      gl.uniform1i(this.up.u.uSrc, 1)
      for (let i = this.levels.length - 1; i > 0; i--) {
        const src = this.levels[i]
        const dst = this.levels[i - 1]
        dst.bind()
        gl.bindTexture(gl.TEXTURE_2D, src.tex)
        gl.uniform2f(this.up.u.uHalf, 0.5 / src.w, 0.5 / src.h)
        this.fs.draw()
      }
      gl.disable(gl.BLEND)
    }

    // composite to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, ctx.width, ctx.height)
    const p = this.composite
    if (!p) return
    gl.useProgram(p.p)
    gl.activeTexture(gl.TEXTURE4)
    gl.bindTexture(gl.TEXTURE_2D, scene.tex)
    gl.uniform1i(p.u.uScene, 4)
    gl.activeTexture(gl.TEXTURE5)
    gl.bindTexture(gl.TEXTURE_2D, this.levels.length ? this.levels[0].tex : scene.tex)
    gl.uniform1i(p.u.uBloom, 5)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, ctx.blueTex)
    gl.uniform1i(p.u.uBlue, 3)
    gl.uniform2f(p.u.uViewport, ctx.width, ctx.height)
    gl.uniform1f(p.u.uBloomAmount, this.levels.length ? this.bloomAmount : 0)
    gl.uniform1f(p.u.uExposure, this.exposure)
    gl.uniform1f(p.u.uVignette, this.vignette)
    gl.uniform3fv(p.u.uFloor, this.floor)
    gl.uniform1f(p.u.uChroma, this.chroma)
    gl.uniform1f(p.u.uTime, ctx.t)
    gl.uniform1f(p.u.uFlash, this.flash)
    gl.uniform3fv(p.u.uFlashColor, this.flashColor)
    this.fs.draw()
  }

  destroy() {
    const gl = this.gl
    for (const l of this.levels) l.destroy()
    this.levels = []
    for (const p of [this.background, this.prefilter, this.down, this.up, this.composite]) {
      if (p) gl.deleteProgram(p.p)
    }
  }
}

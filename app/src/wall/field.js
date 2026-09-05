// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FIELD                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The void and its stars, on the GPU. docs/rebuild-spec.md 7.2 asks for a point
// field in WebGL with slow autonomous drift, pointer parallax, and real depth
// through parallax layers rather than through scaled opacity. This is that, and
// nothing else: it draws points and it does not know what surface it is under.
//
// It is ONE field for the whole product. It was written for the signature
// surfaces and Main, while the wall kept a 2D canvas of its own with a
// different drift, a different brightness curve and a different count, and the
// two surfaces of one product had two different skies. They share this one now
// (ground.jsx), so walking from the front door to the wall does not change the
// room.
//
// ── why depth is a per point attribute and not three canvases ───────────────
// Three stacked canvases at three opacities is the cheap version of this and it
// is the one that reads as wallpaper, because every point in a layer moves by
// exactly the same amount and the eye finds the seam immediately. Here depth is
// a float per point, and it drives four things at once: how fast the point
// drifts, how far it answers the pointer, how large it draws, and how bright it
// is. A near point is big, bright, fast and answers the hand; a far one is a
// dim speck that barely moves. That is parallax, and it costs one attribute.
//
// ── the count is a density, not a number ────────────────────────────────────
// It is chosen off the viewport rather than off a device string, and it is a
// density: so many points per thousand CSS pixels, the same on every screen.
// It used to be one point per three thousand pixels with a floor of 320, and
// the floor is what a phone got, which put a phone at three times the density
// of a desktop. The sky read as a sky on a phone and as an empty room with a
// few specks in it on anything wider. Now the desktop is as dense as the phone
// and the cap is what stops a 4K display asking for ten thousand points.
//
// ── the pace ────────────────────────────────────────────────────────────────
// The clock is accumulated rather than read off performance.now(), so the
// field can be asked to slow down or stop: `pace('slow')` under a sheet,
// `pace('still')` where the act cannot be undone. It decelerates over about
// six hundred milliseconds rather than halting on the frame it is asked to,
// because a sky that halts is a bug and a sky that slows to nothing is the
// room holding its breath.
//
// ── the frame budget ────────────────────────────────────────────────────────
// One buffer, uploaded once. One draw call. Every per point value is computed
// in the vertex shader from four static floats and one clock uniform, so the
// main thread does nothing per frame but write two numbers and call draw.
//
// Two fallbacks, in this order:
//   · prefers-reduced-motion  one static frame, no clock, no pointer
//   · no WebGL2               the same model drawn in canvas 2D at half count
//
// ── THE SKY BEHIND THE STARS ────────────────────────────────────────────────
// The nebula is drawn here too, on a second canvas under the points, by the
// same loop, off the same clock, answering the same hand. It used to be two
// other things: a plasma from a shader package that warped in place, and a
// CSS layer of pink that slid on a timer of its own, and with the stars that
// was three motions on one screen, which the eye reads as three things laid
// on top of each other. Now there is one: the clouds are a layer of the same
// field, drifting to the right the way the stars drift, at the pace of a
// star in the middle of the field, and shifting to the hand the way a star
// shifts. Near stars pass in front of them; that is the depth. And they part
// round the type: whichever screen is up registers its headline (ground.jsx
// useSkyAvoid) and the clouds flow round it, thin under it, and gather a
// little pink along its edge.
//
// The clouds themselves are a domain warped noise (fbm of fbm), which is what
// gives them a current, and they carry the room's two accents at a whisper:
// a violet body and a pink vein along the warp, over the void. The added
// light is posterised through an 8x8 ordered dither at two pixels, so it
// arrives as texture rather than as a gradient, the way the plasma did, and
// the empty void between the clouds stays flat. Under the hand the cloud
// lights by a few counts, so the sky answers a person and not only the eye.
//
// It renders at one pixel per CSS pixel, capped under a megapixel, because
// there is nothing sharp in it. Without WebGL2 the canvas keeps a still CSS
// gradient of the same two colours, which is the room with the current
// stopped.

const VERT = `#version 300 es
in vec4 a;              // x, y, depth, magnitude

uniform float uT;       // seconds
uniform vec2  uPtr;     // pointer, -1..1, already smoothed
uniform vec2  uSize;    // canvas size in device pixels
uniform float uDpr;

out float vM;

void main() {
  float d = a.z;

  // Depth drives the drift. A far point crawls, a near one travels, and the
  // ratio is what the eye reads as distance.
  float speed = mix(0.004, 0.020, d);

  // And it drives the parallax. The near plane answers the hand about six
  // times as far as the deep one.
  vec2 par = uPtr * mix(0.004, 0.026, d);

  // fract() is the wrap. A point that leaves the right edge is the same point
  // arriving at the left, so the field never runs out and never repeats a
  // visible seam.
  vec2 p = fract(vec2(a.x + uT * speed, a.y) + par);

  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);

  // Size in device pixels. A near point is close to three pixels across and a
  // far one is under one, which is what stops the field reading as confetti.
  gl_PointSize = (0.55 + a.w * 1.5) * mix(0.7, 2.1, d) * uDpr;

  // The magnitude carried through, plus the depth's own contribution to
  // brightness. Opacity is NOT doing the work of depth here; it is agreeing
  // with the four other things that are.
  vM = a.w * mix(0.35, 1.0, d);
}`

const FRAG = `#version 300 es
precision mediump float;
in float vM;
out vec4 o;

void main() {
  // A point sprite is a square. This is the disc inside it, with a soft edge,
  // so a star is a star and not a pixel.
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c) * 4.0;
  float a = (1.0 - smoothstep(0.35, 1.0, r)) * vM;
  if (a <= 0.002) discard;

  // Chalk, premultiplied, drawn additively. The ground shows through the tail
  // of every falloff rather than being punched out by it.
  o = vec4(vec3(0.957, 0.945, 0.918) * a, a);
}`

// A full screen triangle. Three vertices cover the clip square and the rest
// is the fragment shader's.
const SKY_VERT = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const SKY_FRAG = `#version 300 es
precision highp float;

uniform float uT;      // seconds, the field's own clock
uniform vec2  uPtr;    // the hand, -1..1, eased, the same values the stars get
uniform float uHand;   // 0 until a pointer has moved, then 1: touch has no hand
uniform vec2  uRes;    // this canvas, in pixels
uniform vec4  uAvoid;  // the type: centre x, centre y, half width, half height, in uv
uniform float uAvoidOn;// 0 with nothing registered, eased to 1 while something is
out vec4 o;

// The room's colours. The void is wall.css --void; the two accents are the
// galaxy's, and they are added at a few counts, never painted.
const vec3 VOID   = vec3(0.031, 0.027, 0.043);
const vec3 VIOLET = vec3(0.42, 0.30, 0.72);
const vec3 PINK   = vec3(0.98, 0.58, 0.76);

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = ROT * p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
// The 8x8 ordered dither threshold, 0..1, from its bit reversed form.
float bayer(ivec2 c) {
  int x = c.x & 7, y = c.y & 7, z = x ^ y;
  int v = ((z & 1) << 5) | ((y & 1) << 4) | ((z & 2) << 2) | ((y & 2) << 1) | ((z & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;

  // The sheet of cloud drifts the way the stars drift, to the right, at the
  // pace of a star in the middle of the field: a screen in about eighty
  // seconds. It used to sit behind the deepest star at a quarter of that,
  // which on a phone read as a still tint with stars over it. It answers the
  // hand a little more than the deepest star, because it is the largest thing
  // on the screen and a sky that does not move under the hand is a poster.
  vec2 p = uv - vec2(uT * 0.012, 0.0) - uPtr * 0.006;
  p.x *= aspect;
  vec2 s = p * 1.35;

  // ── the type ──
  // Whatever the page registered (ground.jsx useSkyAvoid): the headline on
  // the front door, the question on a flow screen. The clouds part round it
  // the way a current parts round a stone. Three things, all off one signed
  // distance to the block's rounded edge, in the same aspect corrected
  // space the noise is sampled in:
  //   the bow wave   the noise is pushed outward from the block, hardest at
  //                  its edge, so the veins bend round the words
  //   the clearing   the cloud thins inside the block, so the type sits in
  //                  a still patch of the void and stays legible
  //   the rim        the pink gathers along the edge, which is what makes
  //                  the parting read as light round the words rather than
  //                  as a hole cut out of a picture
  vec2 aq = vec2(uv.x * aspect, uv.y) - vec2(uAvoid.x * aspect, uAvoid.y);
  vec2 ah = vec2(uAvoid.z * aspect, uAvoid.w);
  float ar = 0.05;
  vec2 dq = abs(aq) - ah + ar;
  float d = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - ar;
  float wave = exp(-max(d, 0.0) * 9.0) * uAvoidOn;
  s += (aq / max(length(aq), 0.02)) * wave * 0.22;
  float clearing = (1.0 - smoothstep(-0.02, 0.10, d)) * uAvoidOn;
  float rim = exp(-(d * d) / 0.0018) * uAvoidOn;

  // The current: the warp's own phase moves, so the clouds churn in place
  // while the whole sheet of them drifts. Fast enough to be seen changing
  // over a few seconds, slow enough that nothing on the screen is ever
  // moving faster than the near stars.
  float t = uT * 0.045;
  vec2 q = vec2(fbm(s + t * 0.40), fbm(s + vec2(5.2, 1.3) - t * 0.30));
  vec2 r = vec2(fbm(s + 2.4 * q + vec2(1.7, 9.2) + t * 0.15),
                fbm(s + 2.4 * q + vec2(8.3, 2.8) - t * 0.126));
  float n = fbm(s + 2.0 * r);

  float dust0 = smoothstep(0.38, 0.78, n);                 // where there is cloud
  float dust = dust0 * (1.0 - 0.72 * clearing);            // and where the type is not
  float body = smoothstep(0.30, 0.80, q.y) * dust;         // the violet of it
  float vein = smoothstep(0.50, 0.88, r.x) * dust          // the pink along the warp
             + rim * 0.5 * dust0 * smoothstep(0.35, 0.88, r.x);

  // The hand: a soft light in the cloud where the pointer is, a few counts
  // at most, and only where there is cloud to light.
  vec2 hand = vec2((uPtr.x * 0.5 + 0.5) * aspect, uPtr.y * 0.5 + 0.5);
  vec2 hd = vec2(uv.x * aspect, uv.y) - hand;
  float lamp = exp(-dot(hd, hd) / 0.16) * uHand;

  vec3 add = VIOLET * body * 0.09
           + PINK * vein * 0.16
           + mix(PINK, VIOLET, 0.35) * lamp * (0.02 + 0.06 * dust);

  // Posterised through the dither at two pixel cells: texture, not gradient.
  // Only the light is quantised, so the void between the clouds stays flat.
  float th = bayer(ivec2(gl_FragCoord.xy) / 2);
  add = floor(add * 40.0 + th) / 40.0;

  o = vec4(VOID + add, 1.0);
}`

// The sky renders at one pixel per CSS pixel and no more than this many of
// them. There is nothing sharp in a cloud.
const SKY_MAX_PX = 900_000

// The sky's own program on its own canvas. Returns null when WebGL2 is not
// there, in which case the canvas keeps its CSS gradient (wall.css .wl-sky).
function mountSky(canvas) {
  if (!canvas) return null
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, SKY_VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, SKY_FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const uT = gl.getUniformLocation(prog, 'uT')
  const uPtr = gl.getUniformLocation(prog, 'uPtr')
  const uHand = gl.getUniformLocation(prog, 'uHand')
  const uRes = gl.getUniformLocation(prog, 'uRes')
  const uAvoid = gl.getUniformLocation(prog, 'uAvoid')
  const uAvoidOn = gl.getUniformLocation(prog, 'uAvoidOn')

  // The canvas is only reallocated when its size has changed, since setting
  // width or height clears it. The viewport and uRes are set every time,
  // including the first, whatever the canvas already measures: a canvas keeps
  // its size across a remount but the program is new, and a program whose
  // uRes was never set divides every fragment by zero. Under React's
  // development double mount that was every load: the sky came up flat, and
  // went white the moment the hand lit the lamp, because NaN times a hand of
  // zero folds to zero and NaN times anything else is NaN.
  function size() {
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight)
    const k = Math.min(1, Math.sqrt(SKY_MAX_PX / (cw * ch)))
    const w = Math.max(1, Math.round(cw * k)), h = Math.max(1, Math.round(ch * k))
    const changed = w !== canvas.width || h !== canvas.height
    if (changed) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(uRes, w, h)
    return changed
  }
  size()

  return {
    size,
    draw(t, ptr, hand, av) {
      gl.uniform1f(uT, t)
      gl.uniform2f(uPtr, ptr.x, ptr.y)
      gl.uniform1f(uHand, hand)
      gl.uniform4f(uAvoid, av.x, av.y, av.w, av.h)
      gl.uniform1f(uAvoidOn, av.on)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    stop() {
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    },
  }
}

// One hash, so a field is the same field on every load and every device. A
// starfield that reshuffles on refresh is a starfield nobody recognises.
function rand(seed) {
  let h = seed * 2654435761 >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

function model(count) {
  const a = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    // A cubed magnitude puts most of the field near invisible and a handful
    // genuinely bright, which is what a real sky does and what an evenly
    // random one conspicuously does not.
    const m = Math.pow(rand(i * 7 + 1), 3)
    a[i * 4 + 0] = rand(i * 7 + 2)
    a[i * 4 + 1] = rand(i * 7 + 3)
    a[i * 4 + 2] = Math.pow(rand(i * 7 + 4), 1.6)
    a[i * 4 + 3] = 0.06 + m * 0.94
  }
  return a
}

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s)
    return null
  }
  return s
}

// What each pace is worth, as a multiplier on the clock. Exported so the
// nebula layer in ground.jsx can keep the same pace without a second table.
export const PACE = { drift: 1, slow: 0.18, still: 0 }
// Seconds to cover most of the distance to a new pace. The 2D field this
// replaced took about 620ms to come to rest, and it was right.
const PACE_TAU = 0.62

// So many points per thousand CSS pixels, wherever the field is drawn.
const PER_KPX = 0.9
const FLOOR = 320
const CAP = 2600

function countFor(canvas, density) {
  const area = Math.max(1, canvas.clientWidth * canvas.clientHeight)
  return Math.round(Math.min(CAP, Math.max(FLOOR, (area / 1000) * PER_KPX)) * density)
}

// The 2D path. Same model, same wrap, half the points, and it exists because a
// blue black rectangle with nothing in it is the one state this surface must
// never reach.
function twoD(canvas, count, still, pace0) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return { point() {}, pace() {}, stop() {} }
  const a = model(Math.round(count / 2))
  const n = a.length / 4
  let raf = 0, w = 0, h = 0, dpr = 1
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
  let target = PACE[pace0] ?? 1
  let ease = target
  let t = 0

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    w = canvas.clientWidth; h = canvas.clientHeight
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  let last = performance.now()
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    if (!still) {
      ease += (target - ease) * (1 - Math.exp(-dt / PACE_TAU))
      t += dt * ease
    }
    ptr.x += (ptr.tx - ptr.x) * 0.06
    ptr.y += (ptr.ty - ptr.y) * 0.06
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < n; i++) {
      const d = a[i * 4 + 2], m = a[i * 4 + 3]
      const speed = 0.004 + (0.020 - 0.004) * d
      const px = 0.004 + (0.026 - 0.004) * d
      const x = ((a[i * 4] + t * speed + ptr.x * px) % 1 + 1) % 1
      const y = ((a[i * 4 + 1] + ptr.y * px) % 1 + 1) % 1
      ctx.globalAlpha = Math.min(1, m * (0.35 + 0.65 * d))
      ctx.fillStyle = '#F4F1EA'
      ctx.beginPath()
      ctx.arc(x * w, y * h, (0.35 + m * 0.85) * (0.7 + d * 1.0), 0, 6.2832)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (!still) raf = requestAnimationFrame(frame)
  }
  frame(performance.now())

  return {
    point(x, y) { ptr.tx = x; ptr.ty = y },
    pace(mode) { target = PACE[mode] ?? 1 },
    stop() { cancelAnimationFrame(raf); ro.disconnect() },
  }
}

// ── THE TYPE THE SKY PARTS ROUND ────────────────────────────────────────────
// One element, registered by whichever screen is up (ground.jsx
// `useSkyAvoid`), read as a rectangle a few times a second and handed to the
// sky shader as the block the clouds flow round. Nothing about it is stored:
// it is a box, in viewport fractions, and it is gone when the screen is.
//
// The rectangle is eased rather than snapped, so a route change glides the
// clearing from the old headline to the new one, and the presence is eased
// too, so a screen with nothing registered lets the clouds close back over
// where the words were rather than cutting to a different sky.
let avoidEl = null
let avoidWake = null
export function setSkyAvoid(el) {
  avoidEl = el || null
  if (avoidWake) avoidWake()
}

// How often the block is measured, in frames. A layout read every sixth
// frame is nothing, and a headline does not move between them.
const AVOID_EVERY = 6

// Mount a field on a canvas. Returns { point, pace, stop }: `point` takes a
// pointer in -1..1 and the field eases toward it, `pace` takes 'drift', 'slow'
// or 'still' and the field decelerates to it, `stop` releases everything.
// `sky` is a second canvas, under the first, for the clouds (THE SKY BEHIND
// THE STARS, above); without it, or without WebGL2, there are only stars.
export function mountField(canvas, { density = 1, pace: pace0 = 'drift', sky: skyCanvas = null } = {}) {
  const still = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const count = countFor(canvas, density)

  const gl = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: 'low-power',
  })
  if (!gl) return twoD(canvas, count, still, pace0)

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return twoD(canvas, count, still, pace0)

  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return twoD(canvas, count, still, pace0)
  gl.useProgram(prog)

  const sky = mountSky(skyCanvas)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, model(count), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0)

  const uT = gl.getUniformLocation(prog, 'uT')
  const uPtr = gl.getUniformLocation(prog, 'uPtr')
  const uSize = gl.getUniformLocation(prog, 'uSize')
  const uDpr = gl.getUniformLocation(prog, 'uDpr')

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  // Reallocated only on a change of size, since that clears the canvas; the
  // viewport and the uniforms are set every time. See the sky's size() for
  // why: a remount keeps the canvas and its size but not the program, and a
  // star program whose uDpr was never set draws every star at nothing.
  let dpr = 1
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(uSize, w, h)
    gl.uniform1f(uDpr, dpr)
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
  // The hand's presence, eased in once a pointer has moved. A touch screen
  // never sets it, so the lamp in the clouds never lights under nothing.
  let handT = 0, hand = 0
  let raf = 0
  let last = performance.now()
  let target = PACE[pace0] ?? 1
  let ease = target
  let t = 0

  // The block the clouds part round: where it is now, where it is going, and
  // how present it is. Kept in viewport fractions with y up, which is the
  // shader's own space.
  const av = { x: 0.5, y: 0.5, w: 0, h: 0, on: 0 }
  const avT = { x: 0.5, y: 0.5, w: 0, h: 0, on: 0 }
  let avFrame = 0
  function measureAvoid() {
    const el = avoidEl
    if (!el || !el.isConnected) { avT.on = 0; return }
    const r = el.getBoundingClientRect()
    const W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight)
    if (r.width <= 0 || r.height <= 0) { avT.on = 0; return }
    avT.x = (r.left + r.width / 2) / W
    avT.y = 1 - (r.top + r.height / 2) / H
    avT.w = r.width / 2 / W
    avT.h = r.height / 2 / H
    avT.on = 1
  }
  function easeAvoid(dt) {
    const k = 1 - Math.exp(-dt / 0.35)
    av.x += (avT.x - av.x) * k
    av.y += (avT.y - av.y) * k
    av.w += (avT.w - av.w) * k
    av.h += (avT.h - av.h) * k
    av.on = Math.max(0, Math.min(1, av.on + (avT.on - av.on) * (1 - Math.exp(-dt / 0.6))))
  }

  // The sky follows the star canvas's size, and under reduced motion it is
  // drawn once here and again on each resize, since the loop below stops.
  // A screen registering its headline under reduced motion redraws it too:
  // the clearing is part of the still frame.
  let skyRo = null
  const drawStill = () => {
    if (!sky || !still) return
    measureAvoid()
    Object.assign(av, avT)
    sky.draw(0, ptr, 0, av)
  }
  if (sky) {
    const resky = () => { if (sky.size() && still) drawStill() }
    skyRo = new ResizeObserver(resky)
    skyRo.observe(skyCanvas)
  }
  const wake = () => drawStill()
  avoidWake = wake

  // Seconds to cover most of the distance to the pointer. In seconds and not in
  // frames: a per frame coefficient is a different spring on a phone holding 30
  // than on a desktop holding 120, and the parallax would arrive at a different
  // speed on each.
  const TAU = 0.28

  function frame(now) {
    // The hand is eased rather than followed. A field that snaps to the cursor
    // is a field that is being dragged; one that arrives a third of a second
    // late is a room with depth in it.
    //
    // The step is clamped at both ends. The first frame's timestamp can come
    // in EARLIER than the clock the mount read, by most of a second on a busy
    // load, and a negative step turns every easing here into a spring that
    // flies away from its target instead of toward it: the block the clouds
    // part round went to minus four screens on the first frame and the sky
    // came up white.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
    last = now
    const k = 1 - Math.exp(-dt / TAU)
    ptr.x += (ptr.tx - ptr.x) * k
    ptr.y += (ptr.ty - ptr.y) * k
    hand += (handT - hand) * (1 - Math.exp(-dt / 0.9))
    if (!still) {
      ease += (target - ease) * (1 - Math.exp(-dt / PACE_TAU))
      t += dt * ease
    }

    // The clouds first, on their own canvas, off the same clock and the same
    // eased hand, so the two layers can never disagree about where they are.
    if (sky) {
      if (avFrame++ % AVOID_EVERY === 0) measureAvoid()
      easeAvoid(dt)
      sky.draw(still ? 0 : t, ptr, hand, av)
    }

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(uT, still ? 0 : t)
    gl.uniform2f(uPtr, ptr.x, ptr.y)
    gl.drawArrays(gl.POINTS, 0, count)
    if (!still) raf = requestAnimationFrame(frame)
  }
  frame(performance.now())

  return {
    point(x, y) {
      if (still) return
      handT = 1
      ptr.tx = Math.max(-1, Math.min(1, x))
      ptr.ty = Math.max(-1, Math.min(1, y))
    },
    pace(mode) { target = PACE[mode] ?? 1 },
    stop() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (skyRo) skyRo.disconnect()
      if (avoidWake === wake) avoidWake = null
      if (sky) sky.stop()
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      // Deliberately NOT WEBGL_lose_context. A canvas has one context per type
      // for its whole life: losing it does not free the canvas for a second
      // one, it hands the same dead context back to whoever asks next. Under
      // React's development double mount that is the very next line of this
      // module, and the surface comes up with a context that silently accepts
      // every call and draws nothing. Deleting the objects is the whole of the
      // cleanup that is actually ours to do.
    },
  }
}

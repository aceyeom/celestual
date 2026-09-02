// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FIELD                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The void and its stars, on the GPU. docs/rebuild-spec.md 7.2 asks for a point
// field in WebGL with slow autonomous drift, pointer parallax, and real depth
// through parallax layers rather than through scaled opacity. This is that, and
// nothing else: it draws points and it does not know what surface it is under.
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
// ── the frame budget ────────────────────────────────────────────────────────
// One buffer, uploaded once. One draw call. Every per point value is computed
// in the vertex shader from four static floats and one clock uniform, so the
// main thread does nothing per frame but write two numbers and call draw. The
// count is chosen off the viewport rather than off a device string: a phone
// gets fewer points because it has fewer pixels to put them in, which is the
// honest reason rather than a guess about its GPU.
//
// Two fallbacks, in this order:
//   · prefers-reduced-motion  one static frame, no clock, no pointer
//   · no WebGL2               the same model drawn in canvas 2D at half count

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

// The 2D path. Same model, same wrap, half the points, and it exists because a
// blue black rectangle with nothing in it is the one state this surface must
// never reach.
function twoD(canvas, count, still) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return () => {}
  const a = model(Math.round(count / 2))
  const n = a.length / 4
  let raf = 0, w = 0, h = 0, dpr = 1
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    w = canvas.clientWidth; h = canvas.clientHeight
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  let t0 = performance.now()
  function frame(now) {
    const t = still ? 0 : (now - t0) / 1000
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
    stop() { cancelAnimationFrame(raf); ro.disconnect() },
  }
}

// Mount a field on a canvas. Returns { point, stop }: `point` takes a pointer
// in -1..1 and the field eases toward it, `stop` releases everything.
export function mountField(canvas, { density = 1 } = {}) {
  const still = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Off the viewport, not off a device string. Roughly one point per 3,000 CSS
  // pixels of surface, floored so a small phone still has a sky.
  const area = Math.max(1, canvas.clientWidth * canvas.clientHeight)
  const count = Math.round(Math.min(1400, Math.max(320, area / 3000)) * density)

  const gl = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: 'low-power',
  })
  if (!gl) return twoD(canvas, count, still)

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return twoD(canvas, count, still)

  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return twoD(canvas, count, still)
  gl.useProgram(prog)

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

  let dpr = 1
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (w === canvas.width && h === canvas.height) return
    canvas.width = w; canvas.height = h
    gl.viewport(0, 0, w, h)
    gl.uniform2f(uSize, w, h)
    gl.uniform1f(uDpr, dpr)
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
  let raf = 0
  const t0 = performance.now()
  let last = t0

  // Seconds to cover most of the distance to the pointer. In seconds and not in
  // frames: a per frame coefficient is a different spring on a phone holding 30
  // than on a desktop holding 120, and the parallax would arrive at a different
  // speed on each.
  const TAU = 0.28

  function frame(now) {
    // The hand is eased rather than followed. A field that snaps to the cursor
    // is a field that is being dragged; one that arrives a third of a second
    // late is a room with depth in it.
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const k = 1 - Math.exp(-dt / TAU)
    ptr.x += (ptr.tx - ptr.x) * k
    ptr.y += (ptr.ty - ptr.y) * k

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(uT, still ? 0 : (now - t0) / 1000)
    gl.uniform2f(uPtr, ptr.x, ptr.y)
    gl.drawArrays(gl.POINTS, 0, count)
    if (!still) raf = requestAnimationFrame(frame)
  }
  frame(performance.now())

  return {
    point(x, y) {
      if (still) return
      ptr.tx = Math.max(-1, Math.min(1, x))
      ptr.ty = Math.max(-1, Math.min(1, y))
    },
    stop() {
      cancelAnimationFrame(raf)
      ro.disconnect()
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

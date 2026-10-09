(() => {
  'use strict'
  const MASKS = %%MASKS%%
  const ROUND = %%ROUND%%
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2)

  // ── the shared parts ─────────────────────────────────────────────────────
  const VS = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'
  function makeProgram(gl, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
    const u = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name) }
    return { p, u }
  }
  function quad(gl) {
    const b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    return b
  }
  function bindQuad(gl, buf, prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const loc = gl.getAttribLocation(prog.p, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }
  function texture(gl, filter = gl.LINEAR) {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src })
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const span = (t, a, b) => clamp((t - a) / (b - a))
  const ease = (k) => { const x = clamp(k); return 1 - Math.pow(1 - x, 3) }
  const inOut = (k) => { const x = clamp(k); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
  const lerp = (a, b, k) => a + (b - a) * k
  // a seeded number in [0, 1) for a print and a purpose, the same every time
  const rnd = (seed, k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }
  // fit a 1080 by 1920 sheet of DOM words to the stage, through the camera
  function placeSheet(sheet, stage, cam) {
    const k = stage.clientWidth / 1080
    sheet.style.transform = `scale(${k}) translate(540px, 960px) scale(${cam[2]}) translate(${-cam[0]}px, ${-cam[1]}px)`
  }
  // only draw while it can be seen
  function watch(el, on) {
    let seen = false
    const io = new IntersectionObserver((es) => { seen = es[0].isIntersecting; on(seen && !document.hidden) }, { rootMargin: '120px' })
    io.observe(el)
    document.addEventListener('visibilitychange', () => on(seen && !document.hidden))
  }
  function press(buttons, id) { for (const b of buttons) b.setAttribute('aria-pressed', String(b.id === id)) }

  // ── two inks: the press ──────────────────────────────────────────────────
  const RISO_FS = `
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam;
uniform sampler2D uT0;
uniform sampler2D uT1;
uniform float uSeed;
uniform vec2 uOR;
uniform vec2 uOI;
uniform vec2 uOK;
uniform float uRotI;
uniform vec3 uOn;
uniform vec3 uDens;
uniform float uTime;

const vec3 PAPER = vec3(0.9569, 0.9412, 0.8941);
const vec3 TR = vec3(0.9139, 0.6125, 0.7675);
const vec3 TI = vec3(0.5861, 0.7667, 0.9649);
const vec3 TK = vec3(0.0410, 0.0417, 0.0526);
const vec2 P0 = vec2(40.0, 560.0);
const vec2 PS = vec2(1000.0, 900.0);
const vec2 TOUCH = vec2(580.0, 1150.0);

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec4 t0(vec2 sp) { vec2 uv = (sp - P0) / PS; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0); return texture2D(uT0, vec2(0.1105 + uv.x * 0.8746, uv.y)); }
vec4 t1(vec2 sp) { vec2 uv = (sp - P0) / PS; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0); return texture2D(uT1, vec2(0.1105 + uv.x * 0.8746, uv.y)); }

float target(vec2 sp) {
  vec2 d = sp - vec2(984.0, 112.0);
  float ring = 1.0 - smoothstep(1.0, 2.1, abs(length(d) - 19.0));
  float cx = (1.0 - smoothstep(0.7, 1.6, abs(d.x))) * step(abs(d.y), 31.0);
  float cy = (1.0 - smoothstep(0.7, 1.6, abs(d.y))) * step(abs(d.x), 31.0);
  return clamp(ring + cx + cy, 0.0, 1.0);
}
vec2 petals(vec2 sp) {
  vec2 acc = vec2(0.0);
  if (sp.y < P0.y - 40.0 || sp.y > P0.y + PS.y + 20.0) return acc;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float a1 = h21(vec2(fi, 1.3)); float a2 = h21(vec2(fi, 7.1)); float a3 = h21(vec2(fi, 3.7));
    float y = P0.y - 30.0 + mod(a1 * 820.0 + uTime * (30.0 + a2 * 28.0), 820.0);
    float x = P0.x + 20.0 + a3 * 960.0 + sin(uTime * 0.8 + fi * 1.7) * 26.0;
    vec2 d = sp - vec2(x, y);
    float an = uTime * (0.5 + a2) + fi;
    float c = cos(an); float s = sin(an);
    d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    float e = length(d / vec2(8.5, 3.0 + 3.2 * abs(sin(an * 1.3))));
    float cov = 1.0 - smoothstep(0.75, 1.0, e);
    if (mod(fi, 2.0) < 1.0) acc.x = max(acc.x, cov); else acc.y = max(acc.y, cov);
  }
  return acc;
}
float figure(float m, float above, float y) {
  float d = m * (0.74 + 0.22 * smoothstep(P0.y + 420.0, P0.y + 900.0, y));
  return d - m * (1.0 - above) * 0.4;
}
float densR(vec2 sp) {
  vec4 a = t0(sp);
  float d = figure(a.r, t0(sp + vec2(0.0, -11.0)).r, sp.y);
  d *= 1.0 - clamp(a.a - a.b, 0.0, 1.0);
  d = max(d, t1(sp).a * 0.8);
  d = max(d, petals(sp).x * 0.74);
  return max(d, target(sp));
}
float densI(vec2 sp) {
  vec4 a = t0(sp);
  float d = figure(a.g, t0(sp + vec2(0.0, -11.0)).g, sp.y);
  d *= 1.0 - clamp(a.a - a.b, 0.0, 1.0);
  d = max(d, petals(sp).y * 0.74);
  return max(d, target(sp));
}
float densK(vec2 sp) {
  vec4 a = t0(sp); vec4 b = t1(sp);
  vec2 uv = (sp - P0) / PS;
  float inPic = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float sky = inPic * 0.3 * (1.0 - smoothstep(0.0, 0.56, uv.y));
  vec2 mc = vec2(582.0, 700.0);
  sky *= smoothstep(76.0, 190.0, length(sp - mc));
  sky *= 1.0 - step(0.992, h21(floor(sp / 9.0))) * step(uv.y, 0.46);
  float d = max(sky, b.g * 0.17);
  d = max(d, b.b);
  d *= 1.0 - clamp(max(a.r * uOn.x, a.g * uOn.y) * 1.4, 0.0, 1.0);
  d = max(d, a.b);
  vec2 c = min(sp, vec2(1080.0, 1920.0) - sp);
  float mk = (1.0 - smoothstep(0.6, 1.4, abs(c.x - 38.0))) * step(c.y, 26.0) + (1.0 - smoothstep(0.6, 1.4, abs(c.y - 38.0))) * step(c.x, 26.0);
  return max(d, clamp(mk, 0.0, 1.0));
}
float screen(vec2 sp, float ang, float g, float pitchPx, float seed) {
  if (g <= 0.003) return 0.0;
  float c = cos(ang); float s = sin(ang);
  vec2 q = vec2(c * sp.x + s * sp.y, -s * sp.x + c * sp.y) / 7.0;
  vec2 cell = floor(q);
  vec2 f = (q - cell) * 2.0 - 1.0;
  float ax = abs(f.x); float ay = abs(f.y);
  float S = (ax + ay > 1.0) ? ((ax - 1.0) * (ax - 1.0) + (ay - 1.0) * (ay - 1.0) - 1.0) : (1.0 - (f.x * f.x + f.y * f.y));
  float gg = clamp(g * 1.06 + 0.01, 0.0, 1.0);
  float th = 1.0 - 2.0 * gg + (vn(sp * 0.45 + seed * 13.1) - 0.5) * 0.17;
  float w = 2.4 / max(pitchPx, 1.0);
  float cov = smoothstep(th - w, th + w, S);
  cov *= 1.0 - 0.16 * smoothstep(0.8, 1.0, gg) * vn(sp * 0.035 + seed * 3.7);
  if (h21(cell + fract(seed * 0.37)) < 0.0005) cov *= 0.12;
  return cov;
}
void main() {
  vec2 n = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  vec2 sp = uCam.xy + (n - 0.5) * vec2(1080.0, 1920.0) / uCam.z;
  float pitchPx = 7.0 * uCam.z * uRes.x / 1080.0;
  vec2 pr = sp - uOR;
  vec2 pi = sp - uOI;
  float cr = cos(uRotI); float sr = sin(uRotI);
  vec2 dq = pi - TOUCH;
  pi = TOUCH + vec2(cr * dq.x - sr * dq.y, sr * dq.x + cr * dq.y);
  vec2 pk = sp - uOK;
  float cR = uOn.x > 0.5 ? screen(pr, radians(75.0), densR(pr) * uDens.x, pitchPx, uSeed) : 0.0;
  float cI = uOn.y > 0.5 ? screen(pi, radians(15.0), densI(pi) * uDens.y, pitchPx, uSeed + 1.7) : 0.0;
  float cK = screen(pk, radians(45.0), densK(pk) * uDens.z, pitchPx, uSeed + 3.1);
  float fib = vn(vec2(sp.x * 0.9, sp.y * 0.06) + uSeed * 7.0) * 0.6 + vn(sp * 0.35 + uSeed) * 0.4;
  vec3 col = PAPER * (0.985 + fib * 0.03);
  col *= mix(vec3(1.0), TR, cR);
  col *= mix(vec3(1.0), TI, cI);
  col *= mix(vec3(1.0), TK, cK);
  gl_FragColor = vec4(col, 1.0);
}`

  async function twoInks() {
    const stage = document.getElementById('riso-stage')
    const cv = document.getElementById('riso')
    const sheet = document.getElementById('riso-sheet')
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) { stage.insertAdjacentHTML('beforeend', '<div class="nogl">this browser has no WebGL, so the press cannot run here.</div>'); return }
    let prog
    try { prog = makeProgram(gl, RISO_FS) } catch (e) { stage.insertAdjacentHTML('beforeend', '<div class="nogl">the press did not start here.</div>'); return }
    const buf = quad(gl)
    const names = ['her', 'him', 'ribbon', 'boards', 'boardsair', 'moon', 'trees', 'branch', 'bloom']
    const ims = await Promise.all(names.map((n) => load(MASKS['a_' + n])))
    const W = ims[0].naturalWidth
    const H = ims[0].naturalHeight
    const c2 = document.createElement('canvas')
    c2.width = W; c2.height = H
    const x2 = c2.getContext('2d', { willReadFrequently: true })
    const red = (im) => { x2.clearRect(0, 0, W, H); x2.drawImage(im, 0, 0); const d = x2.getImageData(0, 0, W, H).data; const o = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) o[i] = d[i * 4]; return o }
    const m = {}
    names.forEach((n, i) => { m[n] = red(ims[i]) })
    const pack = (a, b, c, d) => { const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { o[i * 4] = a[i]; o[i * 4 + 1] = b[i]; o[i * 4 + 2] = c[i]; o[i * 4 + 3] = d[i] } return o }
    const her = m.her.map((v, i) => Math.max(v, m.ribbon[i]))
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    const T0 = texture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, pack(her, m.him, m.boards, m.boardsair))
    const T1 = texture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, pack(m.moon, m.trees, m.branch, m.bloom))

    const groups = Object.fromEntries([...sheet.querySelectorAll('.grp')].map((g) => [g.dataset.g, g]))
    const words = [...sheet.querySelectorAll('.pr')]
    const keys = ['k-play', 'k-iris', 'k-jun', 'k-both'].map((id) => document.getElementById(id))
    const closer = document.getElementById('k-closer')
    let mode = reduce ? 'both' : 'play'
    let t0 = performance.now()
    let held = reduce ? 20 : null
    const LOOP = 14.5
    const LAND = 7.6
    const SNAP = 8.6

    // what the press holds at a moment of the loop
    function at(t) {
      const s = { on: [1, 0], g: 'iris', cam: [540, 960, 1], drift: [0, 0], rot: 0 }
      if (t < 3.5) return s
      if (t < 7.0) return { ...s, on: [0, 1], g: 'jun' }
      s.on = [1, t >= LAND ? 1 : 0]
      s.g = t >= SNAP + 0.5 ? 'both' : 'iris'
      if (t < SNAP + 0.5) s.g = 'none'
      const zin = inOut(span(t, LAND - 0.3, LAND + 0.3))
      const zout = inOut(span(t, SNAP + 0.35, SNAP + 1.45))
      const zk = zin * (1 - zout)
      s.cam = [lerp(540, 580, zk), lerp(960, 1150, zk), lerp(1, 2.8, zk)]
      if (t >= LAND && t < SNAP + 4 / 12) {
        const k = t < SNAP ? 1 : [1, 5 / 14, 1.5 / 14, 0.4 / 14][Math.min(3, Math.floor((t - SNAP) * 12))]
        s.drift = [14 * k, -9 * k]
        s.rot = (3 * k * Math.PI) / 180
      }
      return s
    }

    window.__inks = (which, at) => { mode = which; held = at; draw(performance.now()) }
    function draw(now) {
      const tt = held != null ? held : ((now - t0) / 1000) % LOOP
      const t = mode === 'iris' ? 1.5 : mode === 'jun' ? 5 : tt
      const s = at(t)
      const print = reduce ? 3 : Math.floor((now - t0) / (1000 / 12))
      const seed = print % 997
      const jit = (k, r) => { const a = rnd(seed, k) * Math.PI * 2; const d = Math.sqrt(rnd(seed, k + 0.5)) * r; return [Math.cos(a) * d, Math.sin(a) * d] }
      const oR = reduce ? [0.6, -0.4] : jit(1, 1.5)
      const oI0 = reduce ? [-0.5, 0.7] : jit(2, 1.5)
      const oK = reduce ? [0.3, 0.2] : jit(3, 1.0)
      const oI = [oI0[0] + s.drift[0], oI0[1] + s.drift[1]]
      const dens = [0, 1, 2].map((k) => (reduce ? 1 : 1 + (rnd(seed, 4 + k) - 0.5) * 0.12))
      let cam = s.cam
      const z = Number(closer.value)
      if (z > 1.01) cam = [lerp(540, 580, span(z, 1, 2.2)), lerp(960, 1150, span(z, 1, 2.2)), z]
      // the canvas, at the stage's size
      const w = Math.round(stage.clientWidth * DPR())
      const h = Math.round(w * 16 / 9)
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      gl.viewport(0, 0, w, h)
      gl.useProgram(prog.p)
      bindQuad(gl, buf, prog)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T0); gl.uniform1i(prog.u.uT0, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T1); gl.uniform1i(prog.u.uT1, 1)
      gl.uniform2f(prog.u.uRes, w, h)
      gl.uniform3f(prog.u.uCam, cam[0], cam[1], cam[2])
      gl.uniform1f(prog.u.uSeed, seed + 0.123)
      gl.uniform2f(prog.u.uOR, oR[0], oR[1])
      gl.uniform2f(prog.u.uOI, oI[0], oI[1])
      gl.uniform2f(prog.u.uOK, oK[0], oK[1])
      gl.uniform1f(prog.u.uRotI, s.rot)
      gl.uniform3f(prog.u.uOn, s.on[0], s.on[1], 1)
      gl.uniform3f(prog.u.uDens, dens[0], dens[1], dens[2])
      gl.uniform1f(prog.u.uTime, reduce ? 4 : Math.floor((now - t0) / (1000 / 12)) / 12)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      // the words, printed with their inks
      for (const [g, el] of Object.entries(groups)) el.hidden = g !== s.g
      for (const el of words) {
        const o = el.dataset.ink === 'r' ? oR : el.dataset.ink === 'i' ? oI0 : oK
        el.style.transform = `translate(${Number(el.dataset.x) + o[0]}px, ${Number(el.dataset.y) + o[1]}px)`
      }
      placeSheet(sheet, stage, cam)
    }

    let raf = 0
    let live = false
    let lastPrint = -1
    let lastCam = ''
    const loop = (now) => {
      raf = 0
      if (!live) return
      const print = Math.floor((now - t0) / (1000 / 12))
      const camKey = closer.value + (mode === 'play' || mode === 'both' ? String(Math.round(now / 16)) : '')
      if (print !== lastPrint || camKey !== lastCam) { draw(now); lastPrint = print; lastCam = camKey }
      if (!reduce) raf = requestAnimationFrame(loop)
    }
    const start = (on) => { live = on; if (on && !raf) raf = requestAnimationFrame(loop) }
    watch(stage, start)
    const go = (id) => {
      press(keys, id)
      mode = id.slice(2)
      held = null
      t0 = performance.now()
      if (mode === 'both') { t0 = performance.now() - 7000; held = null }
      if (reduce) { held = mode === 'both' || mode === 'play' ? 20 : null; draw(performance.now()) }
    }
    for (const b of keys) b.addEventListener('click', () => go(b.id))
    closer.addEventListener('input', () => { if (reduce) draw(performance.now()) })
    // "both" plays the print landing once, then holds the sheet
    const hold = () => { if (mode === 'both' && held == null && (performance.now() - t0) / 1000 > 13.5) held = 13.5; requestAnimationFrame(hold) }
    if (!reduce) requestAnimationFrame(hold)
    new ResizeObserver(() => draw(performance.now())).observe(stage)
    draw(performance.now())
  }

  // ── round: the whole film, live ──────────────────────────────────────────
  // Every frame drawn from the film's clock by the animatic's own modules
  // (page/round-*.js, bundled in here as ROUND by build.py), in any order.
  async function round() {
    const stage = document.getElementById('round-stage')
    const cv = document.getElementById('round-gl')
    const ov = document.getElementById('round-over')
    const scrub = document.getElementById('round-t')
    const at = document.getElementById('round-at')
    const play = document.getElementById('r-play')
    const jumps = [...document.querySelectorAll('#round [data-f]')]
    try { await document.fonts.load('40px "Jersey 10"') } catch (e) { /* drawn in the fallback face */ }
    let film
    try { film = ROUND.createRound(cv, ov) } catch (e) {
      stage.insertAdjacentHTML('beforeend', '<div class="nogl">this browser has no WebGL2, so the film cannot be drawn here.</div>')
      return
    }
    const T = ROUND.T
    const N = T.FRAMES
    const label = (fr) => {
      const c = T.clockAt(fr.f)
      const when = c.show ? `${c.hour}:14 ${c.merid}` : 'the wall'
      const who = fr.link ? ` · ${T.LINKS[fr.link - 1].writer} to ${T.LINKS[fr.link - 1].to}` : fr.phase === 'open' ? ' · the seat' : ''
      return `bar ${fr.bar} · ${when}${who}`
    }
    let f = 0
    const show = (n) => {
      f = ((Math.round(n) % N) + N) % N
      const fr = film.frame(f)
      scrub.value = String(f)
      at.textContent = label(fr)
      return fr
    }
    // three frames the film drew, held under it
    const still = document.createElement('canvas')
    still.width = 540
    still.height = 960
    const sg = still.getContext('2d')
    ;[130, 616, 645].forEach((n, i) => {
      show(n)
      sg.drawImage(cv, 0, 0, 540, 960)
      sg.drawImage(ov, 0, 0, 540, 960)
      const img = document.getElementById(`round-still-${i}`)
      if (img) img.src = still.toDataURL('image/png')
    })
    let playing = !reduce
    let live = false
    let t0 = 0
    let f0 = 0
    let raf = 0
    const setPlay = (on) => { playing = on; play.setAttribute('aria-pressed', String(on)); play.textContent = on ? 'pause' : 'play'; if (on) { t0 = performance.now(); f0 = f; kick() } }
    const loop = (now) => {
      raf = 0
      if (!live || !playing) return
      show(f0 + ((now - t0) * T.FPS) / 1000)
      raf = requestAnimationFrame(loop)
    }
    const kick = () => { if (live && playing && !raf) raf = requestAnimationFrame(loop) }
    watch(stage, (on) => { live = on; if (on) { t0 = performance.now(); f0 = f; kick() } })
    play.addEventListener('click', () => setPlay(!playing))
    scrub.addEventListener('input', () => { if (playing) setPlay(false); show(+scrub.value) })
    for (const b of jumps) b.addEventListener('click', () => { show(+b.dataset.f); t0 = performance.now(); f0 = f })
    // for the checks: any moment of the film, in milliseconds
    window.__round = (ms) => show((ms * T.FPS) / 1000)
    show(reduce ? 130 : 0)
    setPlay(playing)
  }

  const begin = () => { round().catch(() => {}); twoInks().catch(() => {}) }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin, begin)
  else begin()
})()

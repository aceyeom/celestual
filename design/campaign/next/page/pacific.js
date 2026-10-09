// ── pacific's two cities ───────────────────────────────────────────────────
// Seoul on a Sunday afternoon in amber, turned over above Berkeley on the
// Saturday night in ice, as the treatment drew them live for the PACIFIC
// script (treatment.html at b443af9). Each world is lit, then brought down
// to four tones on 3 px cells by a blue noise mask made here (void and
// cluster); the two people are the bench telling's own at its first moment
// (pacific-her.png, pacific-him.png).
//
// The frame may be any height. Each half shows a window of its world's
// 960 px hung from the seam: Seoul from `win[0]` (its y at the seam) out to
// the top edge, Berkeley from `win[1]` down to the foot. The minute before
// nine: no rose yet, and the two phones dark beside them.

const VS = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'

const WORLD_FS = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uFrame;
uniform float uSeam;
uniform vec2 uWin;
uniform float uT;
uniform vec2 uMoon;
uniform float uStars;
uniform float uSkyline;
uniform float uMoonOver;
uniform sampler2D uHer;
uniform sampler2D uHim;
uniform sampler2D uBlue;

float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), u.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float blue(vec2 c) { return texture2D(uBlue, (c + 0.5) / 64.0).r; }

float mask(sampler2D tex, vec2 p, vec2 o, vec2 sz) {
  vec2 uv = (p - o) / sz;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2D(tex, uv).r;
}

// Seoul, a Sunday afternoon: light, from the sky at y 0 to the steps at 960
float seoul(vec2 p) {
  float L = mix(0.70, 0.86, smoothstep(-500.0, 470.0, p.y));
  float cb = smoothstep(60.0, 150.0, p.y) * (1.0 - smoothstep(320.0, 420.0, p.y));
  float cn = fbm(vec2(p.x * 0.0052 + uT * 0.006, p.y * 0.012));
  float cl = smoothstep(0.55, 0.68, cn) * cb;
  float tp = smoothstep(0.52, 0.72, fbm(vec2(p.x * 0.0052 + uT * 0.006, (p.y - 16.0) * 0.012)));
  L = mix(L, mix(0.78, 0.99, tp), cl);
  vec2 sun = vec2(300.0, 150.0);
  float ds = length(p - sun);
  L += 0.30 * exp(-ds / 150.0);
  L = mix(L, 1.0, 1.0 - smoothstep(38.0, 44.0, ds));
  vec2 mo = vec2(812.0, 120.0);
  float c1 = (1.0 - smoothstep(18.0, 20.0, length(p - mo))) * smoothstep(15.0, 17.0, length(p - mo - vec2(-7.0, -3.0)));
  L += 0.09 * c1;
  // the skyline, from the river to the ridge, uSkyline px nearer the steps
  vec2 q = vec2(p.x, p.y - uSkyline);
  float ridge = 466.0 + 36.0 * fbm(vec2(q.x * 0.004, 3.1)) - 22.0 * exp(-pow((q.x - 180.0) / 160.0, 2.0));
  if (q.y > ridge && q.y < 620.0) L = 0.645 - 0.05 * fbm(q * 0.02);
  float col = floor(q.x / 36.0);
  float top = 516.0 + 42.0 * h1(vec2(col, 2.0));
  if (q.y > top && q.y < 606.0 && fract(q.x / 36.0) > 0.16) {
    L = 0.54;
    vec2 w = fract(vec2(q.x / 6.0, q.y / 7.0));
    if (w.x < 0.5 && w.y < 0.45) L = 0.45;
  }
  float hill = 604.0 - 96.0 * exp(-pow((q.x - 862.0) / 128.0, 2.0));
  if (q.y > hill && q.y < 612.0) L = 0.47 + 0.05 * fbm(q * 0.03);
  float tw = step(abs(q.x - 862.0), 3.5) * step(hill - 128.0, q.y) * step(q.y, hill + 2.0);
  float pod = step(length((q - vec2(862.0, hill - 108.0)) / vec2(17.0, 8.0)), 1.0);
  float ant = step(abs(q.x - 862.0), 1.4) * step(hill - 172.0, q.y) * step(q.y, hill - 116.0);
  if (tw + pod + ant > 0.5) L = 0.38;
  float deck = 603.0 + (1080.0 - q.x) * 0.011;
  if (abs(q.y - deck) < 3.5) L = 0.34;
  if (q.y > deck && q.y < deck + 16.0 && fract(q.x / 66.0) < 0.07) L = 0.32;
  if (q.y > 614.0 && p.y < 820.0) {
    L = 0.60 + 0.07 * fbm(vec2(p.x * 0.01, p.y * 0.05 + uT * 0.15));
    float colm = exp(-abs(p.x - 300.0) / 120.0);
    float sp = vn(vec2(p.x * 0.23, p.y * 0.95) + vec2(uT * 0.7, uT * 2.6));
    if (sp > 0.94 - 0.2 * colm) L = 1.0;
  }
  if (p.y >= 820.0) L = fract((p.y - 820.0) / 26.0) < 0.62 ? 0.84 : 0.58;
  float m = mask(uHer, p, vec2(292.0, 560.0), vec2(190.0, 380.0));
  if (m > 0.5 && p.y < 906.0) {
    float up = mask(uHer, p - vec2(0.0, 8.0), vec2(292.0, 560.0), vec2(190.0, 380.0));
    L = up < 0.5 ? 0.88 : 0.09;
  }
  return L;
}
// Berkeley, a Saturday night: dark, the sky at y 0, the wall at the foot
float berkeley(vec2 p) {
  float L = mix(0.05, 0.20, smoothstep(0.0, 540.0, p.y));
  if (p.y < uStars && h1(floor(p / 6.0)) > 0.994) L = 0.68;
  vec2 mo = uMoon;
  float dm = length(p - mo);
  float cres = (1.0 - smoothstep(24.0, 26.0, dm)) * smoothstep(21.0, 23.5, length(p - mo - vec2(10.0, -5.0)));
  if (uMoonOver < 0.5) { L += 0.11 * exp(-dm / 70.0); L = mix(L, 0.97, cres); }
  float band = smoothstep(290.0, 420.0, p.y) * (1.0 - smoothstep(560.0, 660.0, p.y));
  float wv = fbm(vec2(p.x * 0.002 + uT * 0.01, p.y * 0.004));
  float fn = fbm(vec2(p.x * 0.0042 - uT * 0.035, p.y * 0.011 + 0.5 * wv));
  float fog = smoothstep(0.42, 0.72, fn) * band;
  L = mix(L, 0.40 + 0.14 * smoothstep(400.0, 620.0, p.y), fog * 0.9);
  // (or in a gap in the fog, in front of it)
  if (uMoonOver > 0.5) { L += 0.11 * exp(-dm / 70.0); L = mix(L, 0.97, cres); }
  if (p.y > 540.0 && p.y < 600.0) {
    L = 0.06 + 0.04 * fbm(vec2(p.x * 0.02, p.y * 0.2));
    float by = 556.0 + (p.x - 540.0) * 0.035;
    if (abs(p.y - by) < 2.2 && fract(p.x / 14.0) < 0.32) L = 0.92;
    if (p.x > 720.0 && p.y < 553.0 && h1(floor(p / 4.0)) > 0.8) L = 0.86;
  }
  float ridge = 600.0 + 30.0 * fbm(vec2(p.x * 0.005, 7.7));
  if (p.y > ridge && p.y < 880.0) {
    L = 0.05;
    if (p.y < 720.0 && h1(floor(p / 5.0)) > 0.9) L = 0.8;
  }
  float tower = step(abs(p.x - 300.0), 9.0) * step(470.0, p.y) * step(p.y, ridge + 4.0);
  float roof = step(abs(p.x - 300.0), 9.0 - (470.0 - p.y) * 0.55) * step(452.0, p.y) * step(p.y, 470.0);
  if (tower + roof > 0.5) L = 0.10;
  if (abs(p.x - 300.0) < 4.5 && abs(p.y - 493.0) < 4.5) L = 0.96;
  float m = mask(uHim, p, vec2(300.0, 470.0), vec2(166.0, 408.0));
  if (m > 0.5) {
    float up = mask(uHim, p - vec2(0.0, 8.0), vec2(300.0, 470.0), vec2(166.0, 408.0));
    L = up < 0.5 ? 0.36 : 0.03;
  }
  if (p.y > 862.0) L = p.y < 872.0 ? 0.24 : 0.09;
  return L;
}
vec3 tone(float lv, vec3 a, vec3 b, vec3 c, vec3 d) { return lv < 0.5 ? a : lv < 1.5 ? b : lv < 2.5 ? c : d; }
vec3 paint(float lv, float which) {
  if (which < 0.5) return tone(lv, vec3(0.067, 0.086, 0.102), vec3(0.392, 0.506, 0.604), vec3(0.561, 0.722, 0.863), vec3(0.929, 0.957, 0.976));
  return tone(lv, vec3(0.106, 0.078, 0.043), vec3(0.616, 0.463, 0.247), vec3(0.878, 0.663, 0.353), vec3(0.980, 0.945, 0.898));
}
void main() {
  vec2 n = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  vec2 f = n * uFrame;
  vec2 cell = floor(gl_FragCoord.xy);
  float L; float which; vec2 p;
  if (f.y < uSeam) {
    // Seoul turned over: its sky at the seam, its steps at the top edge
    p = vec2(1080.0 - f.x, uWin.x + uSeam - f.y);
    L = seoul(p); which = 1.0;
  } else {
    p = vec2(f.x, uWin.y + f.y - uSeam);
    L = berkeley(p); which = 0.0;
  }
  float v = clamp(L, 0.0, 1.0) * 3.0;
  float lv = floor(v);
  lv += step(blue(cell), v - lv);
  lv = min(lv, 3.0);
  gl_FragColor = vec4(paint(lv, which), 1.0);
}`

// the page's own blue noise, 64 by 64: void and cluster, seeded, the same
// every time
export function blueNoise(N = 64) {
  const n = N * N
  const R = 5
  const sg = 1.5
  const K = []
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) K.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)))
  const add = (E, i, s) => { const x = i % N; const y = (i / N) | 0; for (let k = 0; k < K.length; k += 3) E[((y + K[k + 1] + N) % N) * N + ((x + K[k] + N) % N)] += s * K[k + 2] }
  const pick = (E, bin, want) => { let b = -1; let v = want ? -Infinity : Infinity; for (let i = 0; i < n; i++) { if (bin[i] !== want) continue; if (want ? E[i] > v : E[i] < v) { v = E[i]; b = i } } return b }
  let seed = 20261008
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const bin = new Uint8Array(n)
  const E = new Float64Array(n)
  const ones = Math.round(n * 0.1)
  for (let c = 0; c < ones;) { const i = Math.floor(r() * n); if (!bin[i]) { bin[i] = 1; add(E, i, 1); c++ } }
  for (let it = 0; it < n; it++) {
    const c = pick(E, bin, 1); bin[c] = 0; add(E, c, -1)
    const v = pick(E, bin, 0)
    if (v === c) { bin[c] = 1; add(E, c, 1); break }
    bin[v] = 1; add(E, v, 1)
  }
  const rank = new Float32Array(n)
  const b1 = bin.slice()
  const E1 = E.slice()
  for (let k = ones - 1; k >= 0; k--) { const c = pick(E1, b1, 1); b1[c] = 0; add(E1, c, -1); rank[c] = k }
  for (let k = ones; k < n; k++) { const v = pick(E, bin, 0); bin[v] = 1; add(E, v, 1); rank[v] = k }
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.round(((rank[i] + 0.5) / n) * 255)
  return out
}

const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src })

// where the two phones lie, in each world's own px
export const PHONES = { seoul: [220, 892], berkeley: [540, 848] }

// The two cities into a canvas of cells, one pixel a 3 px cell of a frame
// `W` by `H` with the seam at `seam`. A shorter frame may place the scene
// again: its windows, the moon (and whether it hangs in front of the fog),
// how far down the stars reach, and how far Seoul's skyline sits toward the
// steps. The defaults are the 9:16 frame as the treatment drew it.
export async function citiesCells({ W = 1080, H = 1920, seam = 960, win = [0, 0], t = 41, moon = [250, 175], stars = 380, skyline = 0, moonOver = false } = {}) {
  const cols = W / 3
  const rows = H / 3
  const cv = document.createElement('canvas')
  cv.width = cols
  cv.height = rows
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true })
  const sh = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
    return s
  }
  const pr = gl.createProgram()
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, WORLD_FS))
  gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) || 'link')
  gl.useProgram(pr)
  const u = (name) => gl.getUniformLocation(pr, name)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const texture = (unit, filter) => {
    const tx = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tx)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, filter === gl.NEAREST ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, filter === gl.NEAREST ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    return tx
  }
  const [her, him] = await Promise.all([load(new URL('./pacific-her.png', import.meta.url).href), load(new URL('./pacific-him.png', import.meta.url).href)])
  texture(0, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, her)
  texture(1, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, him)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  texture(2, gl.NEAREST)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 64, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, blueNoise())
  gl.uniform1i(u('uHer'), 0)
  gl.uniform1i(u('uHim'), 1)
  gl.uniform1i(u('uBlue'), 2)
  gl.uniform2f(u('uRes'), cols, rows)
  gl.uniform2f(u('uFrame'), W, H)
  gl.uniform1f(u('uSeam'), seam)
  gl.uniform2f(u('uWin'), win[0], win[1])
  gl.uniform1f(u('uT'), t)
  gl.uniform2f(u('uMoon'), moon[0], moon[1])
  gl.uniform1f(u('uStars'), stars)
  gl.uniform1f(u('uSkyline'), skyline)
  gl.uniform1f(u('uMoonOver'), moonOver ? 1 : 0)
  gl.viewport(0, 0, cols, rows)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  gl.finish()
  return cv
}

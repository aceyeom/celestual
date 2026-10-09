// ── the six worlds, as light ───────────────────────────────────────────────
// Each world is a fragment program that draws one half of the frame (1080 by
// 960 px, y down from the seam) as linear luminance, four samples to a cell,
// and then reduces it to one of four tones with the blue noise, and to a
// palette with the colour's arrival. Written here from published maths
// (MAKING.md, section 3): value noise and fbm, closed form light in a cone,
// thin lens drops, ripple rings, curl like steam, copper bar cloud.
// Every number in a world is in pixels of that half, or frames of its clock.

export const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform vec2 uRes;        // the panel's cells
uniform vec2 uView;       // the half it shows, in px
uniform vec4 uCrop;       // the part of it this panel shows (x, y, w, h), px
uniform float uW;         // the world's clock, frames
uniform float uFlood;     // where the colour stands, 0 to 1
uniform float uLetter;    // the letter's palette
uniform float uLook;      // the canon's look up, 0 to 1
uniform float uPlateau;   // how far the tones hold flat
uniform vec2 uNoiseOff;
uniform sampler2D uBlue;  // 128 by 128 void and cluster
uniform sampler2D uFig;   // the people, a mask over the half
uniform sampler2D uArr;   // the colour's arrival, a byte a block
uniform vec4 uPhone;      // the phone's screen, in px of the half
uniform float uPhoneLit;  // and its light
uniform float uSent;      // frames since the letter went up, or -1
out vec4 oCol;

const vec4 LV = vec4(0.007, 0.155, 0.337, 0.863);
const float PI = 3.14159265;
// every world is drawn 42 px to the right of where it was laid out, so the
// spine stands at x 744 and the larger phone keeps clear of the writer
const float SHIFT = 42.0;

uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hh(int a, int b) { return float(pcg(pcg(uint(a) + 0x9e3779b9u) ^ uint(b) * 2654435761u)) / 4294967295.0; }
float hh3(int a, int b, int c) { return float(pcg(pcg(pcg(uint(a) + 0x9e3779b9u) ^ uint(b) * 2654435761u) ^ uint(c) * 40503u)) / 4294967295.0; }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = p - i; vec2 u = f * f * (3.0 - 2.0 * f);
  int x = int(i.x); int y = int(i.y);
  return mix(mix(hh(x, y), hh(x + 1, y), u.x), mix(hh(x, y + 1), hh(x + 1, y + 1), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p = p * 2.07 + vec2(13.1, 7.3); a *= 0.5; } return s; }
float rect(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
float sbox(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float fill(float d, float w) { return clamp(0.5 - d / w, 0.0, 1.0); }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float glow(vec2 p, vec2 c, float r) { vec2 d = (p - c) / r; return 1.0 / (1.0 + dot(d, d)); }
float pool(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }
float sat(float x) { return clamp(x, 0.0, 1.0); }

// light in the air inside a cone (apex, unit direction, half angle): even
// across with a little more toward the axis, falling off with distance from
// the apex, its edge soft over the last fifth of its width. 0 to 1
float cone(vec2 p, vec2 apex, vec2 dir, float a, float len) {
  vec2 v = p - apex;
  float along = dot(v, dir);
  if (along <= 0.0) return 0.0;
  float across = abs(dot(v, vec2(-dir.y, dir.x)));
  float edge = along * tan(a);
  float inside = smoothstep(edge, edge * 0.8, across);
  float core = 0.6 + 0.4 * (1.0 - across / max(edge, 1.0));
  return inside * core / (1.0 + pow(along / len, 2.0));
}
// a mote: a hashed point drifting in a box, flaring on the axis of a light
float motes(vec2 p, vec2 lo, vec2 hi, float t, int salt, float n) {
  float s = 0.0;
  for (int k = 0; k < 28; k++) {
    if (float(k) >= n) break;
    float a = hh(k, salt); float b = hh(k + 91, salt); float c = hh(k + 177, salt);
    vec2 q = lo + (hi - lo) * vec2(fract(a + t * (0.0004 + 0.0008 * c)), fract(b - t * (0.0011 + 0.0012 * a)));
    q.x += 9.0 * sin(t * 0.021 + 6.28 * c);
    float d = length(p - q);
    s += exp(-d * d / (2.0 * 3.4 * 3.4)) * (0.6 + 0.4 * sin(t * 0.09 + 40.0 * a));
  }
  return s;
}

// the people: their mask, and a rim of light on the side toward a light,
// where a step of w px toward it leaves the figure
float fig(vec2 p) { return texture(uFig, p / uView).r; }
float figRim(vec2 p, vec2 toLight, float w) {
  float m = fig(p);
  if (m < 0.02) return 0.0;
  vec2 d = toLight / max(length(toLight), 1e-3);
  float out_ = 1.0 - fig(p + d * w);
  if (out_ <= 0.0) return 0.0;
  // the edge's own way out, from the mask's slope: lit only where it faces the light
  vec2 e = vec2(6.0, 0.0);
  vec2 g = vec2(fig(p + e.xy) - fig(p - e.xy), fig(p + e.yx) - fig(p - e.yx));
  vec2 n = -g / max(length(g), 1e-4);
  return m * out_ * smoothstep(0.3, 0.95, dot(n, d));
}
// the phone's screen in the world's own coordinates
vec4 phoneRect() { return uPhone - vec4(SHIFT, 0.0, SHIFT, 0.0); }
// the phone as a light: a tight glow round its screen, 0 to 1
float phoneLight(vec2 p) {
  if (uPhoneLit <= 0.0) return 0.0;
  vec4 ph = phoneRect();
  vec2 c = (ph.xy + ph.zw) * 0.5;
  vec2 h = (ph.zw - ph.xy) * 0.5;
  float d = max(sbox(p, c, h), 0.0);
  return uPhoneLit / (1.0 + (d * d) / (46.0 * 46.0));
}
// a person over a world: dark, lit at the rim by the key light (a point
// with its reach, or with a reach of 0 a direction) and by the phone
float person(vec2 p, float L, vec2 key, float keyI, float reach, float dark) {
  float m = fig(p);
  if (m < 0.01) return L;
  vec2 toKey = reach > 0.0 ? key - p : key;
  float fall = reach > 0.0 ? 1.0 / (1.0 + dot(toKey, toKey) / (reach * reach)) : 1.0;
  float rim = figRim(p, toKey, 8.0) * keyI * fall;
  vec4 ph = phoneRect();
  vec2 pc = (ph.xy + ph.zw) * 0.5;
  rim += figRim(p, pc - p, 7.0) * phoneLight(p) * 0.2;
  return mix(L, dark + rim, m);
}
`

// the end of every world program: four samples a cell, the plateau curve,
// the blue noise, the colour's arrival and its crest
export const MAIN = /* glsl */ `
int toneIn(float L, float a, float b, int k, float th) {
  float u = clamp((L - a) / (b - a), 0.0, 1.0);
  u = smoothstep(uPlateau, 1.0 - uPlateau, u);
  return k + (u > th ? 1 : 0);
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 cpx = uCrop.zw / uRes;
  float L = 0.0;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) L += scene(uCrop.xy + (vec2(cell) + (vec2(i, j) + 0.5) * 0.5) * cpx - vec2(SHIFT, 0.0));
  L *= 0.25;
  float th = texelFetch(uBlue, (cell + ivec2(uNoiseOff)) & 127, 0).r;
  int tone = 3;
  if (L < LV.y) tone = toneIn(L, LV.x, LV.y, 0, th);
  else if (L < LV.z) tone = toneIn(L, LV.y, LV.z, 1, th);
  else if (L < LV.w) tone = toneIn(L, LV.z, LV.w, 2, th);
  float pal = 0.0;
  float crest = 0.0;
  if (uFlood >= 1.0) pal = uLetter;
  else if (uFlood > 0.0) {
    float a = texelFetch(uArr, cell / 2, 0).r;
    float edge = (th - 0.5) * 0.03;
    if (a <= uFlood + edge) { pal = uLetter; if (uFlood - a < 0.045) crest = 1.0; }
  }
  if (crest > 0.0) tone = min(tone + 1, 3);
  oCol = vec4(float(tone) / 3.0, pal / 8.0, crest, 1.0);
}
`

// Every world is calibrated to the four tones' bands (night's luminances):
// below .05 is the darkest tone, .05 to .11 its pattern into the second,
// .11 to .21 the second, .21 to .28 the pattern into the third, .28 to .5
// the third, .5 to .7 the pattern into the brightest, over .7 the
// brightest. Most of a frame is the darkest; only a world's key light
// reaches the brightest (LOOK.md, rules 1 and 2).

// ── 1. the 51B, 5:14 pm ─────────────────────────────────────────────────────
// Inside the bus at the evening rush. The ceiling strip along the seam; the
// window band across the upper half, steamed from inside, the street in the
// afterglow streaming past left to right (the bus goes left); a pole past
// the glass on every downbeat and a street light on every other;
// condensation drops, each a thin lens holding the street upside down; the
// grab pole (the spine) at x 702; the seat beyond it; the two of them.
export const BUS = /* glsl */ `
const float V = 13.0;             // px a frame, the street going by
const float WIN0 = 64.0;
const float WIN1 = 600.0;
float street(vec2 q, float t) {
  // the afterglow, low in the west, dimming up the glass
  float L = mix(0.24, 0.05, sat((280.0 - q.y) / 220.0));
  // far: the hills, slow
  float xf = q.x - t * V * 0.18;
  if (q.y > 236.0 + 26.0 * fbm(vec2(xf / 160.0, 1.7))) L = 0.03;
  // the buildings at the street's pace: upper floors dark with a few lit
  // windows, and at street level the shops' display windows, lit, so the
  // heads aboard are dark against them; the pavement in front
  float xs = q.x - t * V;
  float blk = floor(xs / 150.0);
  float bx = xs - blk * 150.0;
  float top = 262.0 + 34.0 * hh(int(blk), 3);
  if (q.y > 548.0) return 0.07 + 0.05 * hh(int(blk), 21) + 0.04 * exp(-pow((bx - 75.0) / 40.0, 2.0));
  if (q.y > 446.0) {
    // a shop: its window lit edge to edge but for its door and its pier
    float lit = 0.32 + 0.3 * hh(int(blk), 17);
    if (bx < 10.0 || (bx > 104.0 && bx < 124.0)) return 0.012;
    if (q.y < 458.0) return 0.02 + 0.5 * step(0.5, hh(int(blk), 9)) * step(20.0, bx) * step(bx, 100.0);
    return lit * (0.85 + 0.15 * vnoise(vec2(bx / 9.0, q.y / 11.0 + blk)));
  }
  if (q.y > top) {
    L = 0.012;
    vec2 wc = vec2(mod(bx, 50.0), mod(q.y - top, 38.0));
    int wi = int(floor(bx / 50.0)); int wj = int(floor((q.y - top) / 38.0));
    float on = step(0.62, hh3(int(blk), wi, wj));
    if (wc.x > 10.0 && wc.x < 40.0 && wc.y > 9.0 && wc.y < 30.0) L = mix(L, 0.24 + 0.3 * hh3(int(blk), wi + 7, wj), on);
  }
  // a pole every downbeat, near and fast
  if (mod(q.x - t * V * 1.7, 36.0 * V * 1.7) < 14.0 && q.y > 70.0) L = 0.008;
  // a street light every other downbeat, its head smeared by the shutter
  float lp = mod(q.x - t * V * 1.7 - 18.0 * V * 1.7, 72.0 * V * 1.7);
  float lamp = exp(-pow(length(vec2(max(0.0, abs(lp - 11.0) - 11.0), q.y - 98.0)) / 7.0, 2.0));
  return L + 1.6 * lamp + 0.16 * glow(vec2(lp, q.y), vec2(11.0, 98.0), 30.0);
}
float scene(vec2 p) {
  float t = uW;
  float L = 0.012;
  if (p.y < WIN0) {
    // the ceiling and its strip: the brightest thing aboard
    L = 0.02 + 0.09 * exp(-pow((p.y - 24.0) / 22.0, 2.0));
    if (p.y > 18.0 && p.y < 30.0) L = 1.2;
  } else if (p.y < WIN1) {
    float mull = min(abs(p.x - 404.0), abs(p.x - 904.0));
    if (mull < 12.0 || p.x < 20.0) L = 0.02 + 0.04 * exp(-pow((p.y - 70.0) / 50.0, 2.0));
    else {
      L = street(p, t);
      // condensation: the glass fogged toward its foot and in patches
      float fog = sat(sat((p.y - 430.0) / 170.0) * 0.8 + 0.3 * smoothstep(0.4, 0.85, fbm(p / 70.0)));
      // drops, each a thin lens: inside it the street, upside down and sharp
      vec2 g = vec2(30.0, 34.0);
      vec2 id = floor(p / g);
      float slide = floor(t / (64.0 + 32.0 * hh(int(id.x), 5))) * 3.0;
      vec2 o = g * vec2(hh(int(id.x), int(id.y)), fract(hh(int(id.y), int(id.x)) + slide / g.y));
      vec2 c = id * g + o;
      float r = 3.0 + 6.0 * hh(int(id.x) + 5, int(id.y) + 2);
      float drop = step(0.4, hh(int(id.x) + 2, int(id.y) + 9)) * step(length(p - c), r) * step(240.0, p.y + 60.0 * hh(int(id.x), 1));
      if (drop > 0.5) { L = street(c - (p - c) * 7.0, t) * 1.1; fog = 0.0; }
      L = mix(L, 0.07 + 0.3 * L, fog);
      // the strip, doubled in the dark glass
      L += 0.06 * exp(-pow((p.y - 84.0) / 5.0, 2.0));
    }
  } else {
    // below the glass: the sill catching the strip, the seat's back
    L = 0.010;
    if (p.y < WIN1 + 12.0) L = 0.13;
    float s1 = sbox(p, vec2(930.0, 880.0), vec2(160.0, 120.0)) - 8.0;
    L = mix(L, 0.016 + 0.11 * exp(-pow((p.y - 758.0) / 8.0, 2.0)), fill(s1, 3.0));
    // light from the street passing over the seats, on the beat
    float pass = pow(0.5 + 0.5 * cos(6.2832 * (t / 72.0 + p.x / 1400.0)), 8.0);
    L += 0.05 * pass * sat(1.0 - abs(p.y - 700.0) / 120.0);
  }
  // the grab pole, the spine, catching the strip down its left edge
  if (abs(p.x - 702.0) < 7.0) L = 0.012 + 0.6 * exp(-pow((p.x - 698.0) / 2.2, 2.0)) * (0.55 + 0.45 * exp(-p.y / 300.0));
  L += 0.06 * phoneLight(p);
  return person(p, L, vec2(0.0, -1.0), 0.32, 0.0, 0.006);
}
`

// ── 2. the café after the open mic, 9:14 pm ────────────────────────────────
// Seen from the stage behind wren, out into the dark room: one spot still on,
// hanging from a pipe at the spine; its beam a hard wedge down beside her
// onto the stage; motes flaring in it; the mic stand and its long shadow;
// chairs up on the tables against the front window; headlights through the
// window sweeping the far wall every other downbeat.
export const CAFE = /* glsl */ `
const vec2 SPOT = vec2(702.0, 118.0);
float scene(vec2 p) {
  float t = uW;
  float L = 0.010;
  // the front window onto the street behind her, a street light out there
  vec2 wq = p - vec2(600.0, 400.0);
  if (abs(wq.x) < 190.0 && abs(wq.y) < 120.0) {
    L = 0.06 + 0.07 * sat(1.0 - length((wq - vec2(70.0, -30.0)) / vec2(200.0, 150.0))) + 0.02 * fbm(p / 50.0);
    if (abs(wq.x) < 4.0 || abs(wq.x - 96.0) < 3.0 || abs(wq.y + 30.0) < 3.5) L = 0.012;
  }
  // headlights through it, sweeping the far wall every other downbeat
  float sw = mod(t + 20.0, 72.0);
  float bx = 1180.0 - sw * 30.0;
  L += 0.09 * exp(-pow((p.x - bx - 0.3 * (p.y - 300.0)) / 60.0, 2.0)) * step(sw, 40.0) * sat(1.0 - abs(p.y - 330.0) / 230.0) * step(p.y, 560.0);
  // the floor of the room, and the tables with their chairs up, dark
  // against the window
  if (p.y > 560.0) L = 0.012;
  for (int k = 0; k < 4; k++) {
    float cx = 470.0 + float(k) * 150.0;
    float ty = 496.0 + float(k) * 10.0;
    float d = sbox(p, vec2(cx, ty), vec2(52.0, 4.0));
    d = min(d, sbox(p, vec2(cx - 36.0, ty + 40.0), vec2(2.5, 40.0)));
    d = min(d, sbox(p, vec2(cx + 36.0, ty + 40.0), vec2(2.5, 40.0)));
    // a chair upside down on it: its seat, its legs in the air, its back
    d = min(d, sbox(p, vec2(cx - 6.0, ty - 9.0), vec2(26.0, 4.0)));
    d = min(d, sbox(p, vec2(cx - 26.0, ty - 40.0), vec2(2.0, 30.0)));
    d = min(d, sbox(p, vec2(cx + 14.0, ty - 40.0), vec2(2.0, 30.0)));
    d = min(d, sbox(p, vec2(cx + 22.0, ty + 12.0), vec2(2.0, 22.0)));
    L = mix(L, 0.010, fill(d, 1.5));
  }
  // the pipe down from the ceiling, the spine, and the spot hanging off it
  if (abs(p.x - 702.0) < 5.0 && p.y < SPOT.y) L = 0.02 + 0.06 * exp(-abs(p.x - 699.0));
  // the beam, down and a little to the right onto the stage beside her
  vec2 dir = normalize(vec2(0.3, 1.0));
  float beam = cone(p, SPOT + vec2(0.0, 14.0), dir, 0.2, 900.0);
  L += 0.14 * beam * (0.85 + 0.15 * fbm(vec2(p.x / 90.0, p.y / 90.0 - t * 0.004)));
  // the pool on the stage where it lands
  L += 0.8 * pool(p, vec2(930.0, 904.0), vec2(150.0, 50.0)) * step(820.0, p.y);
  // the mic stand in the light, and its long shadow away from the spot
  float stand = min(seg(p, vec2(860.0, 640.0), vec2(860.0, 884.0)) - 2.5, length(p - vec2(860.0, 634.0)) - 8.0);
  float shadow = seg(p, vec2(860.0, 884.0), vec2(1070.0, 944.0)) - 5.0;
  L = mix(L, L * 0.3, fill(shadow, 3.0) * step(820.0, p.y));
  L = mix(L, 0.012 + 0.25 * beam, fill(stand, 2.0));
  // motes, flaring as they cross the beam
  L += 0.7 * motes(p, vec2(700.0, 140.0), vec2(1010.0, 860.0), t, 3, 22.0) * beam;
  // the spot's housing and its lens
  if (sbox(p, SPOT, vec2(20.0, 14.0)) < 0.0) L = 0.02 + 1.2 * step(sbox(p, SPOT + vec2(4.0, 10.0), vec2(9.0, 4.0)), 0.0);
  L += 0.06 * phoneLight(p);
  return person(p, L, SPOT, 0.5, 420.0, 0.006);
}
`

// ── 3. the reading room at closing, 11:14 pm ───────────────────────────────
// Two rows of long tables receding to tall windows, a green shaded lamp at
// every place, each with its pool on the desk. They go out on the beat on
// the building's timer while hugo is above, the last three as his link
// opens, so the phone is the last light; then the colour reaches each lamp
// and it comes back on. A column (the spine) between the rows.
export const LIBRARY = /* glsl */ `
uniform float uOff[12];   // the world clock each lamp went out at
float lampOn(int k, vec2 at) {
  float s = 1.0;
  if (uW >= uOff[k]) s = 0.25 * exp(-(uW - uOff[k]) / 5.0);
  // the colour reaching it lights it again
  if (uFlood > 0.0 && texelFetch(uArr, ivec2((at + vec2(SHIFT, 0.0)) / 12.0), 0).r <= uFlood) s = 1.0;
  return s;
}
float scene(vec2 p) {
  float L = 0.010;
  // the far wall and its tall windows, the city's glow in them
  if (p.y < 260.0) {
    L = 0.012;
    for (int k = 0; k < 4; k++) {
      float wx = 300.0 + float(k) * 170.0;
      if (abs(p.x - wx) < 48.0 && p.y > 40.0 && p.y < 236.0) {
        L = 0.04 + 0.03 * sat(1.0 - p.y / 236.0);
        if (abs(p.x - wx) < 2.5 || abs(p.y - 130.0) < 2.5) L = 0.012;
      }
    }
  }
  // the column, the spine, standing between the rows halfway down the room
  float lit = 0.0;
  bool column = abs(p.x - 702.0) < 15.0 && p.y < 540.0;
  if (column) L = 0.012;
  for (int r = 0; r < 2; r++) {
    for (int k = 0; k < 6; k++) {
      float z = float(k) / 5.0;
      float s = mix(1.0, 0.34, z);
      vec2 base = vec2(560.0 + (r == 0 ? -1.0 : 1.0) * mix(300.0, 90.0, z), mix(800.0, 290.0, z));
      // (behind the column, nothing of this lamp's is seen)
      if (column && base.y < 536.0) continue;
      float on = lampOn(r * 6 + k, base);
      // the table under it, its near edge catching the lamp
      float tb = sbox(p, base + vec2(0.0, 18.0 * s), vec2(130.0 * s, 8.0 * s));
      L = mix(L, 0.012 + 0.16 * on * pool(p, base + vec2(0.0, 12.0 * s), vec2(130.0 * s, 16.0 * s)), fill(tb, 2.0));
      // the pool on the desk, and a little in the air round the shade
      lit += on * (0.7 * pool(p, base + vec2(0.0, 6.0 * s), vec2(96.0 * s, 15.0 * s)) + 0.04 * glow(p, base - vec2(0.0, 36.0 * s), 80.0 * s));
      // the shade, lit inside, and its stem
      vec2 sc = base - vec2(0.0, 44.0 * s);
      L = mix(L, 0.012, fill(seg(p, sc, base) - 1.6 * s, 1.5));
      L = mix(L, 0.015 + 0.9 * on * step(sc.y + 2.0 * s, p.y), fill(sbox(p, sc, vec2(24.0 * s, 8.0 * s)) - 3.0 * s, 2.0));
    }
  }
  L += lit;
  // the lamps' light hanging in the room, round the rows
  float air = 0.0;
  for (int k = 0; k < 6; k++) air += lampOn(6 + k, vec2(0.0)) + lampOn(k, vec2(0.0));
  L += 0.075 * (air / 12.0) * exp(-pow((p.y - 560.0) / 260.0, 2.0)) * (0.7 + 0.3 * fbm(p / 120.0));
  if (column) L = 0.012 + 0.09 * exp(-pow((p.x - 689.0) / 4.0, 2.0)) * sat(lit * 3.0 + 0.3);
  L += 0.06 * phoneLight(p);
  return person(p, L, vec2(860.0, 760.0), 0.4 * lampOn(6, vec2(860.0, 800.0)), 260.0, 0.005);
}
`

// ── 4. the hospital roof on her break, 1:14 am ─────────────────────────────
// At eye height over the parapet: most of the frame one tone of sky; the
// cloud lit from beneath in bands near the horizon whose thresholds
// undulate a row at a time; the bay and the bridge's line of lights; the
// city as windows, most steady and a few restless; the beacon mast (the
// spine) blinking every other bar; steam from her tea.
export const ROOF = /* glsl */ `
float scene(vec2 p) {
  float t = uW;
  float L = 0.012;
  // the sky, and the cloud lit from below in rows
  if (p.y < 420.0) {
    float row = floor(p.y / 6.0);
    float under = sat((p.y - 250.0) / 170.0);
    float band = 0.5 + 0.5 * sin(row * 0.55 + t * 0.012 + 3.0 * fbm(vec2(p.x / 240.0 + t * 0.0007, row * 0.09)));
    L = 0.016 + 0.03 * under + 0.1 * step(1.0 - 0.6 * under, band) * step(0.02, under);
  }
  // the bay, and the bridge's string of lights across it
  else if (p.y < 470.0) {
    L = 0.018 + 0.03 * sat((p.y - 430.0) / 40.0);
    float sag = 440.0 + 9.0 * pow((p.x - 650.0) / 420.0, 2.0);
    L += 1.1 * step(fract(p.x / 24.0), 0.25) * step(abs(p.y - sag), 2.5) * step(240.0, p.x);
    // its towers
    L = mix(L, 0.012, step(abs(p.x - 420.0), 3.0) * step(418.0, p.y) * step(p.y, 452.0));
    L = mix(L, 0.012, step(abs(p.x - 880.0), 3.0) * step(418.0, p.y) * step(p.y, 452.0));
  }
  // the city: windows to the bay, most steady, a few restless; streets
  // traced by their lights
  else if (p.y < 720.0) {
    float depth = (p.y - 470.0) / 250.0;
    // the city's own light, hanging in the air over it
    L = 0.045 + 0.035 * exp(-pow((p.y - 520.0) / 90.0, 2.0)) - 0.02 * depth;
    vec2 g = vec2(mix(8.0, 20.0, depth), mix(6.0, 14.0, depth));
    vec2 id = floor(p / g);
    vec2 f = fract(p / g);
    // blocks of buildings, and the dark between them
    float blockOn = step(0.45, vnoise(vec2(id.x * 0.17, id.y * 0.3)));
    float h = hh(int(id.x), int(id.y));
    float on = step(0.84, h) * blockOn;
    float rate = pow(hh(int(id.x) + 3, int(id.y)), 9.0);
    float restless = step(0.5, fract(t / (16.0 + 160.0 * (1.0 - rate)) + h));
    float win = step(abs(f.x - 0.5), 0.3) * step(abs(f.y - 0.5), 0.3);
    L += on * win * (0.35 + 0.5 * hh(int(id.x) + 9, int(id.y))) * mix(1.0, restless, step(0.72, rate));
    // a few streets, each a row of lights
    float sy = fract((p.y - 470.0) / mix(40.0, 90.0, depth));
    L += 0.45 * step(sy, 0.06) * step(fract(p.x / mix(16.0, 36.0, depth)), 0.16) * step(0.4, vnoise(vec2(p.x / 90.0, floor((p.y - 470.0) / mix(40.0, 90.0, depth)))));
  }
  // the parapet, its edge catching the city, and the roof
  else {
    L = 0.010;
    if (p.y < 734.0) L = 0.14;
  }
  // the beacon mast, the spine, and its slow blink
  if (abs(p.x - 702.0) < 4.0 && p.y > 70.0 && p.y < 724.0) L = 0.012 + 0.12 * step(p.x, 700.0);
  float blink = step(mod(t, 72.0), 12.0);
  L += (0.15 + 1.3 * blink) * glow(p, vec2(702.0, 64.0), 8.0) + 0.06 * blink * glow(p, vec2(702.0, 64.0), 40.0);
  // steam from her tea, curling up, lit by the city
  vec2 q = p - vec2(780.0, 860.0);
  if (q.y < 0.0 && q.y > -380.0) {
    float k = -q.y / 380.0;
    float wob = 30.0 * (fbm(vec2(q.y / 60.0 - t * 0.02, 3.1)) - 0.5) * (0.3 + k);
    float d = abs(q.x - wob - 36.0 * k * sin(q.y / 70.0 + t * 0.05));
    float wisp = exp(-d * d / (2.0 * pow(6.0 + 18.0 * k, 2.0))) * smoothstep(0.0, 0.1, k) * (1.0 - k);
    L += 0.16 * wisp * smoothstep(0.35, 0.75, fbm(vec2(q.x / 40.0, q.y / 30.0 + t * 0.03)));
  }
  L += 0.06 * phoneLight(p);
  return person(p, L, vec2(0.0, 1.0), 0.16, 0.0, 0.006);
}
`

// ── 5. a corner in the rain, 3:14 am ───────────────────────────────────────
// One street light, its pole the spine; rain only inside its cone, in long
// streaks a cell wide; wet asphalt; a puddle that is a true mirror, rings
// trembling in it where drops land; the crossing signal's hand, and at the
// send its walking figure; the far houses dark but for one window.
export const CORNER = /* glsl */ `
const vec2 LAMP = vec2(702.0, 46.0);
const float GROUND = 700.0;
float buzz(float t) { return 1.0 - 0.08 * step(0.82, hh(int(floor(t / 18.0)), 4)) * step(0.5, fract(t / 3.0)); }
// rain in whole cells: streaks a cell wide, long and slanted, falling fast,
// each column at its own pace
float rain(vec2 p, float t) {
  vec2 q = vec2(p.x + 0.16 * p.y, p.y);
  float col = floor(q.x / 6.0);
  float h = hh(int(col), 11);
  if (h < 0.45) return 0.0;
  float speed = 70.0 + 50.0 * hh(int(col), 12);
  float period = 260.0 + 220.0 * hh(int(col), 13);
  float len = 40.0 + 80.0 * hh(int(col), 14);
  float y = mod(q.y - t * speed + 977.0 * h, period);
  return step(y, len) * (0.4 + 0.6 * y / len);
}
float upper(vec2 p, float t) {
  float L = 0.010;
  // the sky over the houses, a little lighter than the street
  if (p.y < 430.0) L = 0.014 + 0.012 * sat((430.0 - p.y) / 380.0);
  // the far houses, a roofline, one window lit
  float roof = 430.0 + 30.0 * step(0.5, fract((p.x + 40.0) / 260.0)) - 20.0 * step(0.8, fract(p.x / 170.0));
  if (p.y > roof && p.y < GROUND) {
    L = 0.008;
    if (abs(p.x - 930.0) < 14.0 && abs(p.y - roof - 60.0) < 18.0) L = 0.3;
  }
  // the crossing signal on its pole: the hand, and at the send the walker
  if (abs(p.x - 1000.0) < 3.0 && p.y > 320.0 && p.y < GROUND) L = 0.012;
  if (sbox(p, vec2(1000.0, 300.0), vec2(22.0, 26.0)) < 0.0) {
    vec2 s = p - vec2(1000.0, 300.0);
    float hand = sbox(s, vec2(0.0, 2.0), vec2(8.0, 10.0));
    float man = min(length(s - vec2(0.0, -12.0)) - 4.0, seg(s, vec2(0.0, -6.0), vec2(0.0, 8.0)) - 3.0);
    man = min(man, min(seg(s, vec2(0.0, 8.0), vec2(-7.0, 20.0)), seg(s, vec2(0.0, 8.0), vec2(7.0, 20.0))) - 2.5);
    L = 0.012 + 0.6 * fill(uSent >= 0.0 ? man : hand, 1.5);
  }
  // the pole, the spine, and the lamp's head with its small halo
  float b = buzz(t);
  if (abs(p.x - 702.0) < 6.0 && p.y > LAMP.y && p.y < GROUND) L = 0.012 + 0.1 * exp(-pow((p.x - 698.0) / 2.0, 2.0)) * exp(-(p.y - LAMP.y) / 260.0);
  float dl = length((p - LAMP) / vec2(1.8, 1.0));
  L += b * (1.6 * exp(-dl * dl / (2.0 * 7.0 * 7.0)) + 0.1 * glow(p, LAMP, 26.0));
  // the wet air lit inside the cone, and the rain only there
  float c = cone(p, LAMP + vec2(0.0, 8.0), vec2(0.0, 1.0), 0.5, 520.0);
  L += b * c * (0.05 + 0.5 * rain(p, t));
  return L;
}
float scene(vec2 p) {
  float t = uW;
  float L;
  if (p.y < GROUND) L = upper(p, t);
  else {
    // wet asphalt: dark, the lamp's long reflection under the pole
    L = 0.010 + 0.012 * fbm(p / 30.0);
    L += 0.12 * buzz(t) * exp(-pow((p.x - 702.0) / 16.0, 2.0)) * exp(-(p.y - GROUND) / 140.0);
    // the puddle: a mirror about the ground line, trembling with rings
    float pd = length((p - vec2(870.0, 892.0)) / vec2(160.0, 56.0)) - 1.0 + 0.15 * fbm(p / 60.0);
    if (pd < 0.0) {
      vec2 off = vec2(0.0);
      for (int k = 0; k < 5; k++) {
        float ph = hh(k, 21);
        float per = 24.0 + 12.0 * float(k % 3);
        float age = mod(t + ph * 36.0, per);
        vec2 at = vec2(820.0 + 240.0 * hh(k + int(floor((t + ph * 36.0) / per)), 8), 840.0 + 80.0 * hh(k, 12));
        vec2 d = (p - at) * vec2(1.0, 3.0);
        float r = length(d);
        float w = sin(0.35 * (r - age * 2.6)) * exp(-age / 14.0) * exp(-pow((r - age * 2.6) / 12.0, 2.0));
        off += normalize(d + 1e-4) * w * 7.0;
      }
      L = 0.010 + 0.8 * upper(vec2(p.x, 2.0 * GROUND - p.y) + off, t);
    }
  }
  L += 0.06 * phoneLight(p);
  return person(p, L, LAMP, 0.7, 520.0, 0.005);
}
`

// ── 6. the bakery as the sun clears the hills, 7:14 am ─────────────────────
// The window east to the hills, its mullion the spine; the sky brightening;
// the crescent fading; when the colour comes the first sun rakes through the
// window across the bench in a beam with flour hanging in it; the deck
// oven's glow at the left; racks of loaves; steam off the loaves.
export const BAKERY = /* glsl */ `
uniform float uSun;       // 0 before the sun, 1 when it has cleared the ridge
float scene(vec2 p) {
  float t = uW;
  float sun = uSun;
  float day = sat((t + 150.0) / 320.0);
  float L = 0.012;
  // the oven, left: its door's glow flickering
  float flick = 0.88 + 0.08 * sin(t * 0.7) * sin(t * 0.23 + 1.0) + 0.04 * step(0.7, hh(int(floor(t / 9.0)), 6));
  if (p.x < 360.0 && p.y > 300.0 && p.y < 640.0) L = 0.016;
  L = mix(L, 0.62 * flick, fill(sbox(p, vec2(190.0, 430.0), vec2(130.0, 46.0)), 3.0));
  L += 0.05 * flick * glow(p, vec2(190.0, 440.0), 150.0) * step(p.y, 700.0);
  // the window east: the sky brightening over the ridge
  if (p.x > 460.0 && p.x < 1056.0 && p.y > 40.0 && p.y < 600.0) {
    float low = sat((p.y - 40.0) / 500.0);
    L = mix(0.04, 0.12 + 0.12 * day, low * low) + 0.3 * sun * low * low;
    float ridge = 548.0 + 20.0 * fbm(vec2(p.x / 170.0, 4.2)) - 14.0 * sat((p.x - 700.0) / 300.0);
    // the sun is never a disc: only the ridge catching where it comes
    L += sun * 1.2 * exp(-pow(length((p - vec2(890.0, ridge)) / vec2(70.0, 18.0)), 2.0)) * step(p.y, ridge + 1.0);
    if (p.y > ridge) L = 0.02 + 0.03 * sun;
    // the crescent, fading
    vec2 m = p - vec2(980.0, 110.0);
    L += 0.6 * (1.0 - day) * step(length(m), 12.0) * step(11.0, length(m - vec2(5.0, -3.0)));
    // the mullion, the spine, and the transom
    if (abs(p.x - 702.0) < 9.0 || abs(p.y - 300.0) < 5.0) L = 0.012;
  }
  // racks of loaves, catching the oven
  // loaves cooling along the bench, dark against the window, their crusts
  // catching the oven on one side and the sun on the other
  if (p.x > 770.0 && p.x < 1060.0 && p.y > 570.0 && p.y < 612.0) {
    float lf = length(vec2(mod(p.x - 770.0, 48.0) - 24.0, (p.y - 598.0) * 1.5)) - 21.0;
    float edge = step(-3.0, lf) * (0.06 * (1.0 - day) + 0.4 * sun * step(mod(p.x - 770.0, 48.0), 24.0));
    L = mix(L, 0.016 + edge, fill(lf, 1.5));
  }
  // the steel bench, flour on it, its edge catching the light
  if (p.y > 610.0 && p.y < 700.0) {
    L = 0.02 + 0.012 * fbm(p / 14.0) + 0.04 * step(0.93, hh(int(p.x / 6.0), int(p.y / 6.0)));
    if (p.y < 618.0) L = 0.13 + 0.7 * sun;
  }
  if (p.y >= 700.0) L = 0.010;
  // the first sun: a beam raking in from the window, the mullion's shadow in it
  if (sun > 0.0) {
    vec2 dir = normalize(vec2(-0.85, 0.55));
    vec2 v = p - vec2(820.0, 150.0);
    float across = dot(v, vec2(-dir.y, dir.x));
    float along = dot(v, dir);
    float b = smoothstep(150.0, 128.0, abs(across)) * step(0.0, along) * (1.0 - 0.85 * exp(-pow(across / 12.0, 2.0))) * sun;
    L += 0.07 * b;
    if (p.y > 610.0 && p.y < 700.0) L += 0.6 * b;
    // flour hanging in it, with fading trails
    float fl = 0.0;
    for (int k = 0; k < 4; k++) fl += motes(p, vec2(380.0, 200.0), vec2(860.0, 640.0), t - float(k) * 3.0, 7, 24.0) * (1.0 - float(k) * 0.24);
    L += 0.7 * fl * b;
  }
  // steam off the loaves cooling on the bench
  vec2 q = p - vec2(470.0, 610.0);
  if (q.y < 0.0 && q.y > -260.0 && abs(q.x) < 120.0) {
    float k = -q.y / 260.0;
    float n = fbm(vec2(q.x / 34.0 + 0.4 * sin(q.y / 50.0 + t * 0.03), q.y / 40.0 + t * 0.035));
    L += 0.08 * smoothstep(0.55, 0.85, n) * (1.0 - k) * smoothstep(0.0, 0.1, k) * (0.5 + sun);
  }
  L += 0.06 * phoneLight(p);
  return person(p, L, sun > 0.0 ? vec2(0.85, -0.55) : vec2(0.2, -1.0), 0.12 + 0.12 * day + 0.4 * sun, 0.0, 0.006);
}
`

export const WORLD_SRC = [BUS, CAFE, LIBRARY, ROOF, CORNER, BAKERY]
// how flat each world holds its tones (LOOK.md, rule 2)
export const PLATEAU = [0.28, 0.32, 0.3, 0.26, 0.3, 0.28]

// ── the composite ──────────────────────────────────────────────────────────
// Full resolution. The top half mirrored, the bottom right way up; the pane
// solved by ray and plane, crisp at each frame's angle (no blur: a blur
// makes colours no palette has, and the eye reads a stepped fall as a fall);
// a face turned from the light, and the shadow it throws on what is beneath,
// go one tone down their own palette; the riso's two drums a hair apart; the
// end card's modules with their cascade; the seam's ripple. Every pixel of a
// world, still or falling, is one of its palette's four.
export const COMPOSITE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform vec2 uCanvas;         // device px
uniform sampler2D uTex[4];    // world panels: 0 writer, 1 above, 2 revealed, 3 under
uniform sampler2D uSheet[6];  // the contact sheet's small worlds
uniform sampler2D uCards;     // the letters, the line and the lockup, one atlas
uniform vec3 uPal[28];        // seven palettes of four, sRGB
uniform int uTop;             // source above the seam (0..3 a world, 4 the end card)
uniform int uBot;             // source below
uniform int uFront;           // the pane's front
uniform int uBack;            // the pane's back
uniform float uTh;            // the pane's angle
uniform float uPane;          // 1 when there is a pane
uniform float uRipple;        // the seam's ripple, 0 to 1
uniform float uT;             // the film's frame
uniform float uEnd;           // 1 in the end phase
uniform int uSlots;           // how many modules the end card has
uniform vec4 uSlot[6];        // each module's place on the frame (x, y, w, h)
uniform float uFlip[6];       // each module's angle in the cascade
uniform float uLine;          // the line shown
uniform float uLock;          // the lockup shown
uniform float uLineY;         // where the line stands
uniform float uLockY;         // and the lockup
uniform vec4 uCardRect[12];   // where each card sits in the atlas (x, y, w, h), 0..5 letters, 6 line, 7 lockup, 8.. the sheet's phones
uniform vec4 uSheetPhone[6];  // each small world's phone, in its module's px (x, y, w, h)
uniform sampler2D uPhoneTex;  // the writer's phone, drawn at twice its size
uniform vec4 uPhoneRect;      // where its display is on the frame (x0, y0, x1, y1)
uniform float uPhoneOn;
out vec4 oCol;

const float P = 4200.0;

// a world panel's cell at (x, r): r is the distance from the seam
vec4 cellOf(int s, vec2 xr) {
  ivec2 c = ivec2(clamp(floor(xr / 6.0), vec2(0.0), vec2(179.0, 159.0)));
  if (s == 0) return texelFetch(uTex[0], c, 0);
  if (s == 1) return texelFetch(uTex[1], c, 0);
  if (s == 2) return texelFetch(uTex[2], c, 0);
  return texelFetch(uTex[3], c, 0);
}
vec3 palette(float pal, float tone) { return uPal[int(pal + 0.5) * 4 + int(tone + 0.5)]; }
// a cell's palette and tone as colour, dim tones down; the riso's tones
// are its two drums, the second laid 2 px out of register
vec3 inks(float pal, float tone, float t2, float p2) {
  if (pal == 5.0) {
    bool v = tone <= 1.0;
    // (where the colour has not reached the second drum's cell yet, this cell's own)
    bool y = p2 == 5.0 ? (t2 == 0.0 || t2 == 2.0) : (tone == 0.0 || tone == 2.0);
    if (v && y) return uPal[20];
    if (v) return uPal[21];
    if (y) return uPal[22];
    return uPal[23];
  }
  return palette(pal, tone);
}
vec3 worldAt(int s, vec2 xr, float dim) {
  vec4 c = cellOf(s, xr);
  float pal = floor(c.g * 8.0 + 0.5);
  float tone = max(0.0, floor(c.r * 3.0 + 0.5) - dim);
  float t2 = tone;
  float p2 = pal;
  if (pal == 5.0) {
    vec4 c2 = cellOf(s, xr - vec2(2.0, 2.0));
    t2 = max(0.0, floor(c2.r * 3.0 + 0.5) - dim);
    p2 = floor(c2.g * 8.0 + 0.5);
  }
  return inks(pal, tone, t2, p2);
}
// the contact sheet's small worlds (each its module's size in 6 px cells)
vec3 sheetWorld(int k, vec2 q) {
  ivec2 sz = textureSize(uSheet[0], 0);
  ivec2 c = clamp(ivec2(floor(q / 6.0)), ivec2(0), sz - 1);
  vec4 v;
  if (k == 0) v = texelFetch(uSheet[0], c, 0);
  else if (k == 1) v = texelFetch(uSheet[1], c, 0);
  else if (k == 2) v = texelFetch(uSheet[2], c, 0);
  else if (k == 3) v = texelFetch(uSheet[3], c, 0);
  else if (k == 4) v = texelFetch(uSheet[4], c, 0);
  else v = texelFetch(uSheet[5], c, 0);
  float pal = floor(v.g * 8.0 + 0.5);
  float tone = floor(v.r * 3.0 + 0.5);
  return inks(pal, tone, tone, pal);
}
// a small world with its writer's phone held up in it, its letter on it as it
// stood when it went up, drawn at the module's own scale
vec3 sheetAt(int k, vec2 q) {
  vec3 w = sheetWorld(k, q);
  vec4 pr = uSheetPhone[k];
  vec2 d = q - pr.xy;
  if (pr.z <= 0.0 || d.x < 0.0 || d.y < 0.0 || d.x >= pr.z || d.y >= pr.w) return w;
  vec4 r = uCardRect[8 + k];
  vec4 c = texture(uCards, (r.xy + d) / vec2(textureSize(uCards, 0)));
  return mix(w, c.rgb, c.a);
}
vec3 cardAt(int k, vec2 q, vec2 size) {
  vec4 r = uCardRect[k];
  vec2 uv = (r.xy + q / size * r.zw) / vec2(textureSize(uCards, 0));
  return texture(uCards, uv).rgb;
}
// the end card: the room's black, the modules, the line, the lockup
vec3 endCard(vec2 px) {
  vec3 col = vec3(0.039);
  for (int k = 0; k < 6; k++) {
    if (k >= uSlots) break;
    vec4 sl = uSlot[k];
    vec2 q = px - sl.xy;
    if (q.x < 0.0 || q.y < 0.0 || q.x >= sl.z || q.y >= sl.w) continue;
    float th = uFlip[k];
    float mid = sl.w * 0.5;
    // the module's halves: the world before, the letter after
    bool top = q.y < mid;
    float c = cos(th);
    if (th <= 0.0) return sheetAt(k, q);
    if (th >= 3.1415) return cardAt(k, q, sl.zw);
    if (top) {
      // the falling flap's front over the top half while it stands, the letter's top behind
      float reach = mid - mid * max(c, 0.0);
      if (c > 0.0 && q.y >= reach) return sheetAt(k, vec2(q.x, mid - (mid - q.y) / max(c, 1e-3)));
      return cardAt(k, q, sl.zw);
    }
    // the back of the flap, the letter's lower half, once it is past level
    float reach = mid - mid * min(c, 0.0);
    if (c < 0.0 && q.y <= reach) return cardAt(k, vec2(q.x, mid + (q.y - mid) / max(-c, 1e-3)), sl.zw);
    return sheetAt(k, q);
  }
  if (uLine > 0.5) { vec4 r = uCardRect[6]; vec2 q = px - vec2((1080.0 - r.z) * 0.5, uLineY); if (q.x >= 0.0 && q.y >= 0.0 && q.x < r.z && q.y < r.w) return cardAt(6, q, r.zw); }
  if (uLock > 0.5) { vec4 r = uCardRect[7]; vec2 q = px - vec2((1080.0 - r.z) * 0.5, uLockY); if (q.x >= 0.0 && q.y >= 0.0 && q.x < r.z && q.y < r.w) return cardAt(7, q, r.zw); }
  return col;
}
// a source at a point: worlds are read by (x, distance from the seam), the end card by the frame
vec3 source(int s, vec2 px, float r, float dim) {
  if (s == 4) return endCard(px) * (dim > 0.0 ? 0.78 : 1.0);
  return worldAt(s, vec2(px.x, r), dim);
}
// the pane at angle th, seen through frame point px: the hit's x and distance
// from the hinge, which face, and whether it hits
vec4 paneHit(vec2 px, float th) {
  vec3 C = vec3(540.0, 0.0, P);
  vec3 d = vec3(px.x - 540.0, px.y - 960.0, -P);
  vec3 n = vec3(0.0, sin(th), cos(th));
  float den = dot(n, d);
  if (abs(den) < 1e-6) return vec4(0.0);
  float s = -dot(n, C) / den;
  vec3 H = C + s * d;
  float r = -H.y * cos(th) + H.z * sin(th);
  float front = dot(n, C - H) > 0.0 ? 1.0 : 0.0;
  float hit = (s > 0.0 && H.x >= 0.0 && H.x <= 1080.0 && r >= 0.0 && r <= 960.0) ? 1.0 : 0.0;
  return vec4(H.x, r, front, hit);
}
// light from above and in front, for the pane's faces and its shadow
const vec3 LK = vec3(0.0, -0.574, 0.819);
float shade(float th, float front) {
  vec3 n = vec3(0.0, sin(th), cos(th)) * (front > 0.5 ? 1.0 : -1.0);
  return mix(0.42, 1.0, clamp(dot(n, LK) / 0.819, 0.0, 1.0));
}
float shadowOn(vec2 px, float th) {
  vec3 Q = vec3(px.x, px.y - 960.0, 0.0);
  vec3 n = vec3(0.0, sin(th), cos(th));
  float den = dot(n, LK);
  if (abs(den) < 1e-5) return 1.0;
  float t = -dot(n, Q) / den;
  if (t <= 0.0) return 1.0;
  vec3 H = Q + t * LK;
  float r = -H.y * cos(th) + H.z * sin(th);
  if (r < 0.0 || r > 960.0 || H.x < 0.0 || H.x > 1080.0) return 1.0;
  return mix(0.55, 0.9, clamp(t / 900.0, 0.0, 1.0));
}
vec3 frameAt(vec2 px, float th) {
  bool moving = uPane > 0.5 && th > 0.01 && th < 3.13;
  if (uPane > 0.5) {
    vec4 h = paneHit(px, th);
    if (h.w > 0.5) {
      int s = h.z > 0.5 ? uFront : uBack;
      // a face turned from the light goes a tone down its own palette
      float dim = moving && shade(th, h.z) < 0.8 ? 1.0 : 0.0;
      if (s == 4) return endCard(vec2(h.x, h.z > 0.5 ? 960.0 - h.y : 960.0 + h.y)) * (dim > 0.0 ? 0.78 : 1.0);
      return worldAt(s, vec2(h.x, h.y), dim);
    }
  }
  float r = abs(px.y - 960.0);
  // the rows by the seam ripple, in whole cells
  vec2 q = px;
  if (uRipple > 0.0 && r < 18.0) q.x += 6.0 * floor(0.5 + 1.6 * uRipple * sin(px.y * 0.21 + uT * 0.9) * (1.0 - r / 18.0));
  // and where the pane's shadow falls, a tone down too
  float dim = moving && shadowOn(px, th) < 0.8 ? 1.0 : 0.0;
  vec3 c = px.y < 960.0 ? source(uTop, q, 960.0 - px.y, dim) : source(uBot, q, px.y - 960.0, dim);
  // the writer's phone: the one crisp lit thing, over its world, under the pane
  if (uPhoneOn > 0.5 && px.y >= 960.0 && px.x >= uPhoneRect.x && px.x < uPhoneRect.z && px.y >= uPhoneRect.y && px.y < uPhoneRect.w) {
    vec4 ph = texture(uPhoneTex, (px - uPhoneRect.xy) / (uPhoneRect.zw - uPhoneRect.xy));
    c = mix(c, ph.rgb * (dim > 0.0 ? 0.78 : 1.0), ph.a);
  }
  return c;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) * (1080.0 / uCanvas.x);
  if (uEnd > 0.5 && uPane < 0.5) { oCol = vec4(endCard(px), 1.0); return; }
  oCol = vec4(frameAt(px, uTh), 1.0);
}
`

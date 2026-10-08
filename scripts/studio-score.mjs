#!/usr/bin/env node
// studio-score.mjs: the reel's score, made from the reel's own clock.
//
// Nothing here is a recording. It is a small synthesiser written for this
// piece: a felt piano built from its strings' partials, pads of saws a few
// cents apart through filters that open as they swell, low strings, bells,
// the keys of an old phone, a board's cards, and air. Every sound is placed
// at the moment app/src/studio/parts/reel-time.js says its picture happens:
// a key for every letter on the frame it lands, the piano answering the
// words, a glint for every letter of the hall near the lens as the light
// reaches it, a run after each note going up as a light, a card for every
// flap, a chord rolled across the keyboard where the two lights touch, and
// a glint for every cell of the name as it is lit.
//
// 96 beats a minute, in D major and its B minor, quiet, and only as loud as
// it needs to be. Mastered to -14 LUFS with a true peak a decibel and a half
// under full scale by ffmpeg's loudnorm in two passes.
//
//   node scripts/studio-score.mjs [out.wav]      48 kHz, 16 bit, stereo
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MS, BEAT, A, B, S, SAY, typedA, typedB, STORY_TIMES, reelAt, wakeOf } from '../app/src/studio/parts/reel-time.js'
import { wallOf } from '../app/src/studio/parts/wall-gl.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/celestual-reel.wav')

const SR = 48000
const N = Math.round((MS / 1000) * SR)
const TAU = Math.PI * 2
const sec = (s) => Math.round(s * SR)
const at = (ms) => Math.round((ms / 1000) * SR)
const hz = (m) => 440 * 2 ** ((m - 69) / 12)

// ── the buses ───────────────────────────────────────────────────────────────
// drums, the music the drums duck, the keys and sounds of the phones, and a
// send into the room
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) })
const DR = bus()
const MU = bus()
const FX = bus()
const RV = bus()
const DL = bus()

let seed = 0x9e3779b9
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }

function lay(b, ms, len, fn, { gain = 1, pan = 0, verb = 0, delay = 0 } = {}) {
  const s0 = at(ms)
  const a = ((pan + 1) * Math.PI) / 4
  const gl = Math.cos(a) * gain
  const gr = Math.sin(a) * gain
  for (let i = 0; i < len; i++) {
    const k = s0 + i
    if (k < 0) continue
    if (k >= N) break
    const v = fn(i)
    b.L[k] += v * gl; b.R[k] += v * gr
    if (verb) { RV.L[k] += v * gl * verb; RV.R[k] += v * gr * verb }
    if (delay) { DL.L[k] += v * gl * delay; DL.R[k] += v * gr * delay }
  }
}

// ── the parts of a voice ────────────────────────────────────────────────────
// a saw with its corners rounded off where they would alias
function saw() {
  let p = (rnd() + 1) / 2
  return (f) => {
    const dt = f / SR
    p += dt; if (p >= 1) p -= 1
    let v = 2 * p - 1
    if (p < dt) { const x = p / dt; v -= x + x - x * x - 1 } else if (p > 1 - dt) { const x = (p - 1) / dt; v -= x * x + x + x + 1 }
    return v
  }
}
// a lowpass of two poles, its cutoff moved as it plays (RBJ's cookbook)
function lowpass(q = 0.707) {
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  let b0 = 0; let b1 = 0; let b2 = 0; let a1 = 0; let a2 = 0; let last = -1
  return (x, fc) => {
    if (Math.abs(fc - last) > 1) {
      last = fc
      const w = (TAU * Math.min(fc, SR * 0.45)) / SR
      const al = Math.sin(w) / (2 * q)
      const c = Math.cos(w)
      const a0 = 1 + al
      b0 = ((1 - c) / 2) / a0; b1 = (1 - c) / a0; b2 = b0; a1 = (-2 * c) / a0; a2 = (1 - al) / a0
    }
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}
function highpass(fc, q = 0.707) {
  const w = (TAU * fc) / SR
  const al = Math.sin(w) / (2 * q)
  const c = Math.cos(w)
  const a0 = 1 + al
  const b0 = ((1 + c) / 2) / a0; const b1 = -(1 + c) / a0; const b2 = b0; const a1 = (-2 * c) / a0; const a2 = (1 - al) / a0
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y }
}
const adsr = (i, len, a, d, s, r) => {
  const t = i / SR
  const T = len / SR
  if (t < a) return t / a
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d)
  if (t < T - r) return s
  return Math.max(0, s * (1 - (t - (T - r)) / r))
}

// ── the instruments ─────────────────────────────────────────────────────────
// a felt piano: each string's partials where a real string's are (a little
// sharp of whole multiples, more so up the keyboard), each dying at its own
// rate, quick first and then slow as a struck string does, two strings a
// hair apart beating slowly against each other, and the felt hammer's soft
// knock. Struck harder (`vel`), the higher partials come up.
function piano(ms, m, { vel = 0.5, gain = 0.1, pan = 0, decay = 3.4, verb = 0.4, delay = 0.06 } = {}) {
  const f0 = hz(m)
  const inh = 0.00028 * (1 + Math.max(0, m - 48) / 30)
  const parts = []
  for (let n = 1; n <= 12; n++) {
    const fn = n * f0 * Math.sqrt(1 + inh * n * n)
    if (fn > 9000) break
    parts.push({
      w: (TAU * fn) / SR, w2: (TAU * fn * (1 + 0.0007 * (0.5 + rnd() * 0.5))) / SR,
      amp: n ** -(1.75 - 0.8 * vel) * (n === 2 ? 0.8 : 1),
      tau: (decay * 1.5) / (1 + 0.55 * (n - 1)) * (262 / Math.max(131, f0)) ** 0.4,
      ph: rnd() * TAU,
    })
  }
  const lp = lowpass(0.6)
  const L = sec(Math.min(7, decay * 2.4))
  lay(MU, ms, L, (i) => {
    const t = i / SR
    let v = 0
    for (const p of parts) {
      const e = 0.5 * Math.exp(-t / (p.tau * 0.22)) + 0.5 * Math.exp(-t / p.tau)
      v += p.amp * e * (Math.sin(p.w * i + p.ph) + Math.sin(p.w2 * i + p.ph)) * 0.5
    }
    const knock = i < sec(0.03) ? lp(rnd(), 900 + 1800 * vel) * Math.exp(-i / sec(0.006)) * 0.25 : 0
    // and let go of softly at the end of its time, never cut
    const tail = Math.min(1, (L - i) / sec(0.4))
    return (v * Math.min(1, i / sec(0.005)) + knock) * (0.35 + 0.65 * vel) * tail
  }, { gain, pan, verb, delay })
}
// a chord on the piano, its notes rolled up from the lowest a little apart
const roll = (ms, notes, { gap = 45, vel = 0.42, gain = 0.085, decay = 3.6, verb = 0.45 } = {}) =>
  notes.forEach((m, i) => piano(ms + i * gap, m, { vel: vel - i * 0.02, gain, decay, pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.5, verb }))
// a pad: five saws a few cents apart through a lowpass that opens as it
// swells, slowly, its notes `len` long
function pad(ms, len, notes, { gain = 0.03, cut = [350, 1200], q = 0.8, attack = 1.1, release = 1.2, verb = 0.6, pan = 0.35 } = {}) {
  notes.forEach((m, n) => {
    const f = hz(m)
    const osc = [0, 1, 2, 3, 4].map(() => saw())
    const det = [-0.009, -0.004, 0, 0.0045, 0.01]
    const lp = lowpass(q)
    const L = sec(len / 1000)
    lay(MU, ms, L, (i) => {
      const e = adsr(i, L, attack, 0.5, 0.88, release)
      const k = i / L
      let v = 0
      for (let j = 0; j < 5; j++) v += osc[j](f * (1 + det[j]))
      return lp(v * 0.2, cut[0] + (cut[1] - cut[0]) * Math.sin(Math.min(1, k * 1.3) * Math.PI / 2)) * e
    }, { gain: gain * 1.35, pan: ((n % 2) * 2 - 1) * pan, verb })
  })
}
// the low strings: a sine and its soft saw, coming in under the chord
function low(ms, m, len, { gain = 0.07, attack = 0.35 } = {}) {
  const f = hz(m)
  const o = saw()
  const lp = lowpass(0.7)
  const L = sec(len / 1000)
  lay(MU, ms, L, (i) => {
    const t = i / SR
    const e = adsr(i, L, attack, 0.3, 0.85, 0.6)
    return (Math.sin(TAU * f * t) * 0.85 + lp(o(f), 420) * 0.3) * e
  }, { gain, verb: 0.15 })
}
// a bell: a sine and its inharmonic partials, struck and let ring
function bell(ms, m, { gain = 0.03, decay = 1.6, pan = 0, verb = 0.6, delay = 0.2, p2 = 0.25 } = {}) {
  const f = hz(m)
  const L = sec(decay * 3.2)
  lay(FX, ms, L, (i) => {
    const t = i / SR
    const a = Math.min(1, i / sec(0.003), (L - i) / sec(0.2))
    return a * (Math.sin(TAU * f * t) * Math.exp(-t / decay)
      + p2 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (decay * 0.4))
      + 0.08 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / (decay * 0.18)))
  }, { gain, pan, verb, delay })
}
// a key on an old phone: a tick of noise through a resonance, and the
// plastic's body under it, close and quiet
function key(ms, { pitch = 2200, body = 420, gain = 0.06, pan = 0 } = {}) {
  let y1 = 0; let y2 = 0
  const r = 0.985
  const w = (TAU * pitch) / SR
  const c1 = 2 * r * Math.cos(w)
  const c2 = -r * r
  lay(FX, ms, sec(0.05), (i) => {
    const x = i < sec(0.004) ? rnd() * (1 - i / sec(0.004)) : 0
    const y = x + c1 * y1 + c2 * y2
    y2 = y1; y1 = y
    const thump = Math.sin((TAU * body * i) / SR) * Math.exp(-i / sec(0.008)) * 0.6
    return (y * 0.09 + thump) * Math.exp(-i / sec(0.012))
  }, { gain, pan, verb: 0.1 })
}
// a pulse under the waiting, felt more than heard: a low sine's knock, no
// click, the music ducking under it a little
const KICKS = []
function thump(ms, { gain = 0.22 } = {}) {
  KICKS.push([ms, gain])
  lay(DR, ms, sec(0.45), (i) => {
    const t = i / SR
    const ph = TAU * (48 * t + 60 * 0.03 * (1 - Math.exp(-t / 0.03)))
    return Math.tanh(Math.sin(ph) * Math.exp(-t / 0.15) * 1.3) * Math.min(1, i / 30)
  }, { gain })
}
// a bloom under a meeting: a sine falling slowly through the floor
function boom(ms, { gain = 0.2, from = 90, to = 36, len = 2 } = {}) {
  let ph = 0
  lay(DR, ms, sec(len), (i) => {
    const t = i / SR
    const f = to + (from - to) * Math.exp(-t / 0.25)
    ph += (TAU * f) / SR
    return Math.sin(ph) * Math.exp(-t / (len * 0.4)) * Math.min(1, i / sec(0.02))
  }, { gain })
}
// air: noise through a band that moves, swelling in, swelling and going,
// or falling away
function air(ms, len, { gain = 0.05, from = 400, to = 9000, rise = true, swell = false, pan = 0, verb = 0.5, q = 2 } = {}) {
  const lp = lowpass(q)
  const L = sec(len / 1000)
  lay(FX, ms, L, (i) => {
    const k = i / L
    // a swell breathes out at its top rather than stopping there
    const e = swell ? Math.sin(Math.PI * k) ** 1.5 : rise ? Math.sin((k * Math.PI) / 2) ** 2.4 * Math.min(1, (1 - k) / 0.12) : (1 - k) ** 1.6
    return lp(rnd(), from * (to / from) ** k) * e
  }, { gain, pan, verb })
}
// a flap: the card's slap, the board's body under it, quietly
function flap(ms, { gain = 0.07, pan = 0 } = {}) {
  const hp = highpass(1800, 1.2)
  lay(FX, ms, sec(0.07), (i) => {
    const t = i / SR
    return hp(rnd()) * Math.exp(-t / 0.006) * 0.8 + Math.sin(TAU * 190 * t) * Math.exp(-t / 0.014) * 0.7
  }, { gain, pan, verb: 0.2 })
}
// a phone waking: the inverter's buzz, faint
function wakeBuzz(ms, { gain = 0.04, pan = 0 } = {}) {
  lay(FX, ms, sec(0.2), (i) => {
    const t = i / SR
    return (Math.sin(TAU * 118 * t) * 0.6 + Math.sin(TAU * 236 * t) * 0.3 + rnd() * 0.1) * Math.exp(-t / 0.05)
  }, { gain, pan })
}
// a cell lit: the smallest glint
function tick(ms, { gain = 0.012, pan = 0, pitch = 4200 } = {}) {
  lay(FX, ms, sec(0.05), (i) => Math.sin((TAU * pitch * i) / SR) * Math.exp(-i / sec(0.012)), { gain, pan, verb: 0.5, delay: 0.3 })
}

// ── the score ───────────────────────────────────────────────────────────────
// D major and its B minor, the chords turning as the scenes do, the piano's
// line answering the words, nothing louder than it needs to be
const r = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
const CH = {
  Bm: [47, 54, 59, 61, 62], G: [43, 50, 54, 57, 59], D: [50, 57, 62, 64, 66], Asus: [45, 52, 57, 59, 62],
  A: [45, 52, 57, 59, 61], DF: [42, 50, 57, 62, 66], Em: [40, 47, 54, 55, 59],
}
// [ms, chord, its root low, how long]
const CHORDS = [
  [0, 'Bm', 35, 2700], [2500, 'G', 31, 2700], [5000, 'D', 38, 2700], [7500, 'Asus', 33, 1350], [8750, 'A', 33, 1450],
  [10000, 'Bm', 35, 1350], [11250, 'G', 31, 1450],
  [12500, 'DF', 30, 1350], [13750, 'G', 31, 1450],
  [15000, 'Em', 40, 1350], [16250, 'Asus', 33, 1350], [17500, 'A', 33, 1350],
  [18750, 'G', 31, 650], [19250, 'A', 33, 1100], [20250, 'DF', 30, 1150],
  [21300, 'D', 38, 1500], [22500, 'G', 31, 1350], [23750, 'D', 38, 1350],
  [25000, 'Bm', 35, 1350], [26250, 'G', 31, 1350],
  [27500, 'Em', 40, 1350], [28750, 'Asus', 33, 1850],
  [30500, 'D', 38, 3250],
]
CHORDS.forEach(([ms, c, root, len], i) => {
  const quiet = ms >= S.ifnot[0] && ms < S.lock[0]
  pad(ms, len + 300, CH[c], { gain: quiet ? 0.018 : 0.026, cut: [320, quiet ? 800 : 1300], attack: i ? 0.5 : 1.4 })
  // the root where a phone's speaker can play it, and the floor under it
  low(ms, root + 12, len + 200, { gain: quiet ? 0.03 : 0.045 })
  low(ms, root, len + 200, { gain: quiet ? 0.016 : 0.024 })
})

// 0 to 3.75: the letter. The keys of lin's phone close and soft, and the
// piano answering the words: the high note on `i loved you.`, falling, a
// breath, and home as the last word lands
typedA().forEach((ms, i) => {
  const sp = A.text[i] === ' '
  key(ms, { pitch: sp ? 1280 : 1900 + ((i * 397) % 900), body: sp ? 250 : 380 + ((i * 53) % 120), gain: sp ? 0.05 : 0.065, pan: -0.1 })
})
const tA = typedA()
const iLoved = A.text.indexOf('i loved')
const iMaybe = A.text.indexOf('maybe')
roll(0, [47, 54, 59], { vel: 0.3, gain: 0.07 })
piano(60, 71, { vel: 0.35, gain: 0.09 })
piano(tA[iLoved] - 20, 78, { vel: 0.55, gain: 0.11 })
piano(tA[iLoved + 11], 76, { vel: 0.45, gain: 0.1 })
piano(tA[iLoved + 11] + 310, 74, { vel: 0.4, gain: 0.09 })
piano(tA[iMaybe] - 20, 73, { vel: 0.45, gain: 0.1 })
roll(2500, [43, 50, 59], { vel: 0.3, gain: 0.065 })
piano(tA[tA.length - 1], 74, { vel: 0.5, gain: 0.1, decay: 4 })

// 3.75 to 10: the hall. Every letter near the lens coming on is a glint of
// the pentatonic, where it is, as the light goes out over the wall; the
// hall's air swelling as it opens; the line's words on the piano
const PENTA = [74, 76, 78, 81, 83, 86, 88, 90, 93]
wallOf().forEach((l, n) => {
  if (l.home || l.dist > 11 || r(n + 5) > 0.22) return
  const ms = wakeOf(l.dist, l.seed) + 70
  bell(ms, PENTA[Math.floor(r(n + 9) * PENTA.length)], { gain: 0.016 / (1 + l.dist / 4), decay: 0.7, pan: Math.max(-0.85, Math.min(0.85, l.i / 7)), verb: 0.7, delay: 0.25, p2: 0.12 })
})
air(S.wake, 5200, { gain: 0.05, from: 300, to: 5000, swell: true })
roll(5000, [50, 57, 66], { vel: 0.35, gain: 0.07 })
;[[S.lines[0], 81], [S.lines[1], 78], [S.lines[2], 76], [S.lines[2] + 312, 74]].forEach(([ms, m], i) => piano(ms, m, { vel: 0.45 - i * 0.03, gain: 0.1 }))
roll(7500, [45, 52, 57], { vel: 0.3, gain: 0.065 })
piano(8125, 76, { vel: 0.38, gain: 0.09 })
piano(8750, 73, { vel: 0.4, gain: 0.09 })
// lin's letter coming away from the wall to the lens
air(S.lift[0], S.lift[1] - S.lift[0] + 100, { gain: 0.045, from: 250, to: 3800, q: 1.4 })
piano(9375, 76, { vel: 0.38, gain: 0.085 })

// 10 to 12.5: sent privately. The key, the words lifting off the glass, the
// screen saying so, and the note going up as a light: a run up the
// pentatonic, softly, after it
roll(10000, [47, 54, 59], { vel: 0.3, gain: 0.065 })
piano(10000, 74, { vel: 0.42, gain: 0.095 })
key(S.press, { pitch: 1500, body: 300, gain: 0.08, pan: -0.05 })
;[170, 250, 330].forEach((d, i) => tick(S.press + d, { gain: 0.01, pitch: 3000 + i * 400 }))
bell(S.press + 410, 81, { gain: 0.03, decay: 1.2, pan: -0.1 })
bell(S.press + 530, 86, { gain: 0.026, decay: 1.4, pan: 0.1 })
roll(11250, [43, 50, 59], { vel: 0.3, gain: 0.065 })
piano(S.privately, 71, { vel: 0.4, gain: 0.09 })
;[74, 76, 78, 81, 83, 86, 88].forEach((m, i) => bell(S.rise + i * 150, m, { gain: 0.016 + i * 0.0015, decay: 0.9, pan: i * 0.05, verb: 0.65, delay: 0.3, p2: 0.12 }))
air(S.rise, S.send[1] - S.rise + 300, { gain: 0.04, from: 600, to: 9000 })

// 12.5 to 15: kai. A breath of the inverter, kai's keys a little further
// off, the piano a phrase lower, as if from another room; kai's light going
// up as lin's did, a third lower
wakeBuzz(S.kWake, { pan: 0.15 })
typedB().forEach((ms, i) => {
  const sp = B.text[i] === ' '
  key(ms, { pitch: sp ? 1250 : 2100 + ((i * 271) % 800), body: sp ? 240 : 400 + ((i * 41) % 110), gain: sp ? 0.04 : 0.055, pan: 0.18 })
})
roll(12500, [42, 50, 57], { vel: 0.3, gain: 0.065 })
piano(S.kRead, 78, { vel: 0.42, gain: 0.095 })
piano(S.kIf, 76, { vel: 0.4, gain: 0.09 })
roll(13750, [43, 50, 59], { vel: 0.3, gain: 0.06 })
piano(S.kIf + 312, 74, { vel: 0.42, gain: 0.095 })
piano(S.kIf + 312 + 470, 71, { vel: 0.36, gain: 0.085 })
key(S.kSend, { pitch: 1500, body: 300, gain: 0.07, pan: 0.15 })
bell(S.kSend + 410, 78, { gain: 0.028, decay: 1.2, pan: 0.15 })
bell(S.kSend + 530, 83, { gain: 0.024, decay: 1.4, pan: 0.25 })
;[71, 74, 76, 78, 81, 83].forEach((m, i) => bell(S.kRise + i * 150, m, { gain: 0.015 + i * 0.0015, decay: 0.9, pan: 0.2 - i * 0.06, verb: 0.65, delay: 0.3, p2: 0.12 }))

// 15 to 18.1: every mutual is revealed on saturday at nine. The board's
// cards, a pulse coming up under them like a held breath, the chord
// climbing to the dominant and waiting there
S.days.forEach((d) => [0, 24, 48].forEach((o, c) => flap(d + o, { gain: 0.06, pan: (c - 1) * 0.3 })))
for (let i = 0; i < 7; i++) if (i !== 4) flap(S.time + i * 40, { gain: 0.05, pan: (i / 3 - 1) * 0.4 })
bell(S.place, 81, { gain: 0.02, decay: 1.2 })
roll(15000, [40, 47, 55], { vel: 0.3, gain: 0.06 })
piano(S.wLine[0], 71, { vel: 0.38, gain: 0.085 })
piano(S.wLine[1], 74, { vel: 0.42, gain: 0.09 })
roll(16250, [45, 52, 57], { vel: 0.32, gain: 0.06 })
piano(16250, 76, { vel: 0.42, gain: 0.09 })
piano(17500, 78, { vel: 0.45, gain: 0.09 })
for (let k = 0; k < 8; k++) thump(15625 + k * 312.5, { gain: 0.1 + k * 0.02 })
air(S.wait[0] + 1200, S.meet - S.wait[0] - 1200, { gain: 0.045, from: 300, to: 7000, q: 2.4 })

// 18.1 to 22.5: nine o'clock. The two lights touch: the bloom, a chord
// rolled across the whole keyboard. The two of them run: an arpeggio up
// under their feet. They are held: the chord opens. `it's mutual.`: a soft
// tick a letter, and home, the whole of it, as the last lands.
boom(S.meet, { gain: 0.24, from: 80, to: 36, len: 2.4 })
roll(S.meet, [31, 43, 50, 59, 66, 69, 74, 78], { gap: 60, vel: 0.5, gain: 0.08, decay: 4 })
bell(S.meet + 40, 86, { gain: 0.03, decay: 2.2 })
air(S.meet - 400, 450, { gain: 0.05, from: 1500, to: 9000 })
;[57, 61, 64, 69, 73, 76, 81].forEach((m, i) => piano(S.run + i * 142, m, { vel: 0.38 + i * 0.03, gain: 0.08, decay: 2.4, pan: (i / 6 - 0.5) * 0.4 }))
roll(S.drop, [30, 42, 57, 62, 66, 74], { gap: 40, vel: 0.5, gain: 0.08, decay: 4 })
boom(S.drop, { gain: 0.16, from: 70, to: 36, len: 1.6 })
bell(S.drop + 30, 90, { gain: 0.024, decay: 1.8 })
const ST = STORY_TIMES
const TYPE_MS = (ST.said - ST.say) / [...SAY].length
;[...SAY].forEach((c, k) => { if (c !== ' ') key(reelAt(ST.say + TYPE_MS * (k + 1)), { pitch: 3000, body: 520, gain: 0.03, pan: -0.1 + k * 0.02 }) })
const SAID = reelAt(ST.said)
roll(SAID, [26, 38, 50, 57, 62, 66, 69, 74, 78], { gap: 55, vel: 0.55, gain: 0.085, decay: 4.5 })
;[[86, 0, -0.3], [90, 120, 0.15], [93, 240, 0.3], [98, 380, 0]].forEach(([m, d, p]) => bell(SAID + d, m, { gain: 0.026, decay: 1.8, pan: p, p2: 0.18 }))
boom(SAID, { gain: 0.2, from: 70, to: 37, len: 2.6 })

// 22.5 to 25: you both find out. The line, warm, the two notes a note each
roll(22500, [43, 50, 59], { vel: 0.35, gain: 0.065 })
piano(S.both, 78, { vel: 0.48, gain: 0.1 })
piano(S.both + 312, 76, { vel: 0.44, gain: 0.095 })
piano(S.both + 624, 74, { vel: 0.4, gain: 0.09 })
roll(23750, [38, 50, 57, 66], { vel: 0.36, gain: 0.065 })
piano(23750, 81, { vel: 0.45, gain: 0.09 })
piano(24375, 78, { vel: 0.4, gain: 0.085 })

// 25 to 27.5: the ones that never meet. The music thins to almost nothing;
// a light going out is a glint falling away; the line falls with them
const FALL = [93, 90, 88, 86, 83, 81, 78, 76, 74, 71, 69, 66, 64, 62]
FALL.map((m, i) => [S.ifnot[0] + 300 + (i / FALL.length) * 1900 + r(i + 200) * 90, m, (r(i + 300) - 0.5) * 1.4]).forEach(([ms, m, pan]) => bell(ms, m, { gain: 0.009, decay: 0.9, pan, verb: 0.75, delay: 0.3, p2: 0.1 }))
piano(S.nLine[0], 73, { vel: 0.32, gain: 0.08 })
piano(S.nLine[1], 71, { vel: 0.3, gain: 0.075 })
piano(S.nLine[1] + 312, 69, { vel: 0.3, gain: 0.075 })
piano(S.nLine[1] + 940, 66, { vel: 0.28, gain: 0.07, decay: 4 })

// 27.5 to 33.75: the question, asked on three notes and not answered: the
// chord left open. Then the name lit out of the last light, every cell a
// glint, and home at last, held under the address to the end
air(S.ask[0] - 300, 900, { gain: 0.025, from: 6000, to: 600, rise: false })
roll(27500, [40, 47, 55], { vel: 0.28, gain: 0.06 })
;[[S.q[0], 78], [S.q[1], 76], [S.q[2], 76]].forEach(([ms, m], i) => piano(ms, m, { vel: 0.42 - i * 0.02, gain: 0.095, decay: i === 2 ? 4.5 : 3.4 }))
roll(28750, [45, 52, 57, 62], { vel: 0.28, gain: 0.055 })
// and the leading note, left hanging until the name comes
piano(29375, 73, { vel: 0.3, gain: 0.07, decay: 4 })
for (let i = 0; i < 70; i++) {
  const d = (i / 70) ** 0.8 * (S.lock[1] - S.lock[0]) + r(i + 70) * 40
  tick(S.lock[0] + d, { gain: 0.007 + 0.006 * (1 - i / 70), pan: (r(i + 90) - 0.5) * 1.2, pitch: 3000 + r(i + 11) * 3200 })
}
roll(S.lock[0], [26, 38, 50, 57, 62, 64, 66, 69, 74], { gap: 70, vel: 0.5, gain: 0.08, decay: 5 })
boom(S.lock[0], { gain: 0.16, from: 70, to: 37, len: 3 })
bell(S.lock[0] + 60, 86, { gain: 0.022, decay: 2.4 })
piano(S.url, 81, { vel: 0.4, gain: 0.085, decay: 4 })
piano(S.url + 625, 86, { vel: 0.36, gain: 0.075, decay: 4.5 })

// ── the mix ─────────────────────────────────────────────────────────────────
// the music ducks under every kick, as a pumping heart would
const duck = new Float32Array(N).fill(1)
for (const [ms, g] of KICKS) {
  const s0 = at(ms)
  const depth = 0.55 * Math.min(1, g / 0.42)
  for (let i = 0; i < sec(0.3) && s0 + i < N; i++) duck[s0 + i] = Math.min(duck[s0 + i], 1 - depth * Math.exp(-i / sec(0.09)))
}
// a ping pong delay a dotted eighth long
{
  const d = sec((BEAT * 0.75) / 1000)
  for (let i = d; i < N; i++) {
    DL.L[i] += DL.R[i - d] * 0.42
    DL.R[i] += DL.L[i - d] * 0.42
  }
}
// the room: Schroeder's, four combs and two all passes, a little different
// on each side so the room is wide
function reverb(x, spread) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d: d + spread, b: new Float32Array(d + spread), i: 0, f: 0 }))
  const aps = [225, 556, 441].map((d) => ({ d: d + (spread >> 1), b: new Float32Array(d + (spread >> 1)), i: 0 }))
  const y = new Float32Array(x.length)
  for (let n = 0; n < x.length; n++) {
    let s = 0
    for (const c of combs) {
      const o = c.b[c.i]
      c.f = o * 0.7 + c.f * 0.3
      c.b[c.i] = x[n] + c.f * 0.88
      c.i = (c.i + 1) % c.d
      s += o
    }
    s /= combs.length
    for (const a of aps) {
      const o = a.b[a.i]
      const v = -0.5 * s + o
      a.b[a.i] = s + 0.5 * o
      a.i = (a.i + 1) % a.d
      s = v
    }
    y[n] = s
  }
  return y
}
// the delay's returns go to the room too
for (let i = 0; i < N; i++) { RV.L[i] += DL.L[i] * 0.3; RV.R[i] += DL.R[i] * 0.3 }
const RL = reverb(RV.L, 0)
const RR = reverb(RV.R, 23)
const L = new Float32Array(N)
const R = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const m = duck[i]
  L[i] = DR.L[i] + MU.L[i] * m + FX.L[i] + DL.L[i] * 0.5 + RL[i] * 1.1
  R[i] = DR.R[i] + MU.R[i] * m + FX.R[i] + DL.R[i] * 0.5 + RR[i] * 1.1
}
// tape: a soft saturation on the whole, and the last second let go
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const drive = 1.15 / Math.max(1e-6, peak)
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8)
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const f = Math.min(1, (N - i) / sec(0.9)) * Math.min(1, i / sec(0.01))
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * drive) * 0.8 * f * 32767), 44 + i * 4)
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * drive) * 0.8 * f * 32767), 46 + i * 4)
}
mkdirSync(dirname(out), { recursive: true })
const raw = `${out}.raw.wav`
writeFileSync(raw, buf)
// mastered: measured once, then brought to -14 LUFS with those numbers
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const mm = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{')))
const norm = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${mm.input_i}:measured_TP=${mm.input_tp}:measured_LRA=${mm.input_lra}:measured_thresh=${mm.input_thresh}:offset=${mm.target_offset}:linear=true`
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', norm, '-ar', String(SR), '-c:a', 'pcm_s16le', out])
spawnSync('rm', ['-f', raw])
console.log(out.replace(`${root}/`, ''), `${(MS / 1000).toFixed(1)}s`, `from ${mm.input_i} LUFS`)

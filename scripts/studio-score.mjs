#!/usr/bin/env node
// studio-score.mjs: the reel's score, made from the reel's own clock.
//
// Nothing here is a recording. It is a small synthesiser written for this
// piece: band-limited saws (polyBLEP), biquad filters swept as they play,
// envelopes, a kick that the pads duck under, a stereo delay a dotted eighth
// long, a room, tape's soft saturation on the whole, and a carillon's bells
// with a tuned bell's partials. Every sound is placed at the moment
// app/src/studio/parts/reel-time.js says its picture happens: a key for every
// letter on the frame it lands, a blip for every phone of the wall as it
// wakes, a chord under each line of the wall's, the tower's run climbing as
// it is drawn and its bell on the frame the lantern lights, a tap for every
// finger, a clack for every flap, the riser into the drop on the frame the
// two of them are held, a heartbeat under the question, a note for every
// half turn of the two lights heard where each light is, and a tick for
// every pixel of the name coming home.
//
// 120 beats a minute, in B minor and its relative D. Mastered to -14 LUFS
// with a true peak a decibel and a half under full scale by ffmpeg's
// loudnorm in two passes.
//
//   node scripts/studio-score.mjs [out.wav]      48 kHz, 16 bit, stereo
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MS, BEAT, A, B, S, SAY, typedA, typedB, STORY_TIMES, reelAt, ORBIT, orbitOf } from '../app/src/studio/parts/reel-time.js'

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
// a pad: five saws a few cents apart through a lowpass that opens as it
// swells, its notes `ms` long
function pad(ms, len, notes, { gain = 0.05, cut = [400, 1600], q = 0.9, attack = 0.6, release = 0.8, verb = 0.5, b = MU, pan = 0.35 } = {}) {
  gain *= 1.35
  notes.forEach((m, n) => {
    const f = hz(m)
    const osc = [-11, -5, 0, 6, 12].map(() => saw())
    const det = [-0.011, -0.005, 0, 0.0055, 0.012]
    const lp = lowpass(q)
    const L = sec(len / 1000)
    lay(b, ms, L, (i) => {
      const e = adsr(i, L, attack, 0.4, 0.85, release)
      const k = i / L
      let v = 0
      for (let j = 0; j < 5; j++) v += osc[j](f * (1 + det[j]))
      return lp(v * 0.2, cut[0] + (cut[1] - cut[0]) * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2)) * e
    }, { gain, pan: ((n % 2) * 2 - 1) * pan, verb })
  })
}
// a pluck: a saw through a filter that closes fast
function pluck(ms, m, { gain = 0.07, decay = 0.22, cut = 3200, pan = 0, verb = 0.25, delay = 0.25 } = {}) {
  gain *= 1.25
  const f = hz(m)
  const o = saw()
  const o2 = saw()
  const lp = lowpass(1.6)
  const L = sec(decay * 4)
  lay(MU, ms, L, (i) => {
    const t = i / SR
    const e = Math.exp(-t / decay) * Math.min(1, t / 0.002)
    return lp((o(f) + o2(f * 1.004)) * 0.5, 220 + cut * Math.exp(-t / (decay * 0.5))) * e
  }, { gain, pan, verb, delay })
}
// a bass: a sine and its saw, under the kick
function bass(ms, m, len, { gain = 0.16 } = {}) {
  const f = hz(m)
  const o = saw()
  const lp = lowpass(0.8)
  const L = sec(len / 1000)
  lay(MU, ms, L, (i) => {
    const t = i / SR
    const e = adsr(i, L, 0.004, 0.12, 0.7, 0.06)
    return (Math.sin(TAU * f * t) * 0.8 + lp(o(f), 1100) * 0.35) * e
  }, { gain })
}
// a bell: a sine and its inharmonic partials, struck and let ring
function bell(ms, m, { gain = 0.05, decay = 1.6, pan = 0, verb = 0.55, delay = 0.2, p2 = 0.3, b = FX } = {}) {
  gain *= 1.25
  const f = hz(m)
  lay(b, ms, sec(decay * 3.2), (i) => {
    const t = i / SR
    const a = Math.min(1, i / sec(0.003))
    return a * (Math.sin(TAU * f * t) * Math.exp(-t / decay)
      + p2 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (decay * 0.4))
      + 0.1 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / (decay * 0.18)))
  }, { gain, pan, verb, delay })
}
// a key on an old phone: a tick of noise through a resonance, and the
// plastic's body under it
function key(ms, { pitch = 2200, body = 420, gain = 0.1, pan = 0 } = {}) {
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
  }, { gain, pan, verb: 0.08 })
}
// the drums
const KICKS = []
function kick(ms, { gain = 0.5, deep = 1 } = {}) {
  KICKS.push([ms, gain])
  gain *= 0.72
  const hp = highpass(3200, 0.9)
  lay(DR, ms, sec(0.5), (i) => {
    const t = i / SR
    const ph = TAU * (55 * t + 110 * deep * 0.035 * (1 - Math.exp(-t / 0.035)))
    const body = Math.sin(ph) * Math.exp(-t / (0.16 + 0.06 * deep))
    // the beater's click, where a phone's speaker hears a kick
    const click = hp(i < sec(0.004) ? rnd() : 0) * 0.9
    return Math.tanh((body + click) * 1.6)
  }, { gain })
}
function clap(ms, { gain = 0.16, pan = 0 } = {}) {
  const hp = highpass(900)
  lay(DR, ms, sec(0.35), (i) => {
    const t = i / SR
    const bursts = [0, 0.009, 0.019].reduce((v, o) => v + (t >= o ? Math.exp(-(t - o) / 0.007) : 0), 0)
    return hp(rnd()) * (bursts * 0.6 + Math.exp(-t / 0.09) * 0.5)
  }, { gain, pan, verb: 0.3 })
}
function hat(ms, { gain = 0.05, open = false, pan = 0.2 } = {}) {
  const hp = highpass(7000)
  lay(DR, ms, sec(open ? 0.35 : 0.06), (i) => hp(rnd()) * Math.exp(-i / sec(open ? 0.11 : 0.018)), { gain, pan })
}
function crash(ms, { gain = 0.08 } = {}) {
  const hp = highpass(4200)
  lay(DR, ms, sec(2.4), (i) => { const t = i / SR; return hp(rnd()) * Math.exp(-t / 0.8) * (0.7 + 0.3 * Math.sin(TAU * 5.3 * t)) }, { gain, verb: 0.5, pan: 0.15 })
}
// a boom under a hit: a sine falling through the floor
function boom(ms, { gain = 0.45, from = 120, to = 34, len = 1.1 } = {}) {
  gain *= 0.7
  let ph = 0
  lay(DR, ms, sec(len), (i) => {
    const t = i / SR
    const f = to + (from - to) * Math.exp(-t / 0.09)
    ph += (TAU * f) / SR
    // and three times its pitch, driven and short, which a phone can play
    const mid = Math.tanh(Math.sin(ph * 3) * 3) * Math.exp(-t / 0.08) * 0.45
    return (Math.sin(ph) * Math.exp(-t / (len * 0.45)) + mid) * Math.min(1, i / 40)
  }, { gain })
}
// air: noise through a band that moves, swelling in or falling away
function air(ms, len, { gain = 0.08, from = 400, to = 9000, rise = true, pan = 0, verb = 0.4, q = 2.2 } = {}) {
  const lp = lowpass(q)
  const L = sec(len / 1000)
  lay(FX, ms, L, (i) => {
    const k = i / L
    const e = rise ? k ** 2.2 : (1 - k) ** 1.6
    return lp(rnd(), from * (to / from) ** k) * e
  }, { gain, pan, verb })
}
// the screen going out: a whine falling to nothing, and the click
function off(ms, { gain = 0.1 } = {}) {
  lay(FX, ms, sec(0.32), (i) => {
    const t = i / SR
    const hum = (Math.sin(TAU * 118 * t) * 0.6 + Math.sin(TAU * 236 * t) * 0.25) * Math.exp(-t / 0.07)
    return hum * 0.7 + (i < sec(0.003) ? rnd() * 0.8 : 0)
  }, { gain, verb: 0.3 })
}
// a flap: the card's slap, the board's body under it
function flap(ms, { gain = 0.13, pan = 0 } = {}) {
  const hp = highpass(1800, 1.2)
  lay(FX, ms, sec(0.07), (i) => {
    const t = i / SR
    return hp(rnd()) * Math.exp(-t / 0.006) * 0.8 + Math.sin(TAU * 190 * t) * Math.exp(-t / 0.014) * 0.7
  }, { gain, pan, verb: 0.12 })
}
// a phone waking: the inverter's buzz and a blip
function wakeBuzz(ms, { gain = 0.08, pan = 0 } = {}) {
  lay(FX, ms, sec(0.2), (i) => {
    const t = i / SR
    return (Math.sin(TAU * 118 * t) * 0.6 + Math.sin(TAU * 236 * t) * 0.3 + rnd() * 0.12) * Math.exp(-t / 0.05)
  }, { gain, pan })
}

// a bell of the tower's carillon: struck bronze, its partials where a
// tuned bell's are (the hum an octave under, the prime, the minor third
// that makes a bell sound a bell, the fifth, the nominal an octave over),
// each dying at its own rate, and the clapper's strike on top
function carillon(ms, m, { gain = 0.06, decay = 2.6, pan = 0, verb = 0.7, delay = 0.12 } = {}) {
  const f = hz(m)
  const parts = [[0.5, 0.5, 1.4], [1, 0.9, 1], [1.2, 0.55, 0.62], [1.5, 0.3, 0.45], [2, 0.42, 0.55], [2.5, 0.16, 0.3], [3, 0.12, 0.22], [4.2, 0.06, 0.12]]
  const hp = highpass(2600, 0.8)
  lay(FX, ms, sec(decay * 3), (i) => {
    const t = i / SR
    const a = Math.min(1, i / sec(0.002))
    let v = 0
    for (const [r, g, d] of parts) v += g * Math.sin(TAU * f * r * t + r) * Math.exp(-t / (decay * d))
    const strike = i < sec(0.012) ? hp(rnd()) * (1 - i / sec(0.012)) * 0.5 : 0
    return (v * 0.3 + strike) * a
  }, { gain, pan, verb, delay })
}
// a finger on glass: the soft knock of a pad on a screen and a click under it
function tap(ms, { gain = 0.12, pan = 0, pitch = 1800 } = {}) {
  const hp = highpass(900, 0.9)
  lay(FX, ms, sec(0.08), (i) => {
    const t = i / SR
    const knock = Math.sin(TAU * 210 * t) * Math.exp(-t / 0.012) * 0.7
    const click = hp(i < sec(0.003) ? rnd() : 0) * 0.6 + Math.sin(TAU * pitch * t) * Math.exp(-t / 0.006) * 0.3
    return knock + click
  }, { gain, pan, verb: 0.12 })
}
// the heart lit: a blip that rises, and the glint of it
function pop(ms, { gain = 0.08, pan = 0 } = {}) {
  let ph = 0
  lay(FX, ms, sec(0.22), (i) => {
    const t = i / SR
    const f = 520 + 1400 * (1 - Math.exp(-t / 0.03))
    ph += (TAU * f) / SR
    return Math.sin(ph) * Math.exp(-t / 0.07) * Math.min(1, i / 60)
  }, { gain, pan, verb: 0.35, delay: 0.25 })
}
// a heartbeat: the two of it, low and close
function beatHeart(ms, { gain = 0.34 } = {}) {
  kick(ms, { gain, deep: 0.35 })
  kick(ms + 165, { gain: gain * 0.55, deep: 0.3 })
}
// a pixel landing: the smallest tick
function tick(ms, { gain = 0.03, pan = 0, pitch = 4200 } = {}) {
  lay(FX, ms, sec(0.02), (i) => Math.sin((TAU * pitch * i) / SR) * Math.exp(-i / sec(0.003)), { gain, pan, verb: 0.15 })
}
// a whoosh across: noise through a band that sweeps, panned with the move
function whoosh(ms, len, { gain = 0.1, from = 300, to = 6000, panFrom = -0.8, panTo = 0.8 } = {}) {
  const lp = lowpass(1.8)
  const L = sec(len / 1000)
  const s0 = at(ms)
  for (let i = 0; i < L; i++) {
    const k = s0 + i
    if (k < 0) continue
    if (k >= N) break
    const q = i / L
    const e = Math.sin(Math.PI * q) ** 1.4
    const v = lp(rnd(), from * (to / from) ** Math.sin((Math.PI * q) / 2)) * e * gain
    const p = panFrom + (panTo - panFrom) * q
    const a = ((p + 1) * Math.PI) / 4
    FX.L[k] += v * Math.cos(a); FX.R[k] += v * Math.sin(a)
    RV.L[k] += v * Math.cos(a) * 0.3; RV.R[k] += v * Math.sin(a) * 0.3
  }
}
// pixels coming apart: a crackle of short bursts, bright
function crackle(ms, len, { gain = 0.06 } = {}) {
  const hp = highpass(3000, 0.7)
  const L = sec(len / 1000)
  lay(FX, ms, L, (i) => {
    const grain = Math.floor(i / sec(0.006))
    const on = ((Math.sin(grain * 91.7) * 43758.5453) % 1 + 1) % 1 > 0.55
    return on ? hp(rnd()) * (1 - i / L) : 0
  }, { gain, verb: 0.25 })
}

// ── the score ───────────────────────────────────────────────────────────────
const b = (n) => n * BEAT
// B minor and D: the chords a bar each, the drop in D
const Bm9 = [47, 54, 57, 61, 62]
const Gmaj9 = [43, 50, 54, 57, 59, 62]
const D9 = [38, 45, 50, 54, 57, 64]
const A6 = [45, 52, 54, 57, 61]
const Em9 = [40, 47, 50, 54, 57, 62]
const r = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1

// 0 to 2: up close. The keys are the rhythm, a heartbeat under them, the
// first chord breathing in
typedA().forEach((ms, i) => {
  const sp = A.text[i] === ' '
  key(ms, { pitch: sp ? 1280 : 1900 + ((i * 397) % 900), body: sp ? 250 : 380 + ((i * 53) % 120), gain: sp ? 0.12 : 0.16, pan: -0.15 })
})
pad(0, 2600, Bm9, { gain: 0.032, cut: [300, 900], attack: 0.35, release: 0.7 })
;[0, b(2)].forEach((ms) => { kick(ms, { gain: 0.32, deep: 0.5 }); kick(ms + 180, { gain: 0.18, deep: 0.4 }) })

// 1.75 to 4: back into the wall. Every phone of it waking is a note of
// the pentatonic, scattered, the city coming on; the wall's line is three
// chords on three eighths, and the colours going round are a run up the
// pentatonic a 32nd at a time
const PENTA = [71, 74, 76, 78, 81, 83, 86, 88]
for (let i = 0; i < 16; i++) {
  pluck(2320 + r(i + 3) * 620, PENTA[(i * 5) % PENTA.length], { gain: 0.03, decay: 0.12, cut: 2600, pan: ((i % 5) / 2 - 1) * 0.7, delay: 0.35, verb: 0.4 })
}
air(S.wall[0], S.lines[0] - S.wall[0], { gain: 0.07, from: 300, to: 8000 })
whoosh(S.wall[0] - 40, 560, { gain: 0.11, from: 5000, to: 400, panFrom: 0.3, panTo: -0.3 })
boom(S.wall[0], { gain: 0.3, from: 110, to: 36, len: 0.9 })
;[[S.lines[0], Gmaj9], [S.lines[1], A6], [S.lines[2], D9]].forEach(([ms, ch], i) => {
  boom(ms, { gain: 0.24 + i * 0.08, from: 150, to: 40, len: 0.7 })
  pad(ms, i === 2 ? 1000 : 240, ch, { gain: 0.045, cut: [2600, 1100], attack: 0.005, release: i === 2 ? 0.6 : 0.15, verb: 0.6 })
})
crash(S.lines[2], { gain: 0.05 })
for (let k = 0; k < 9; k++) pluck(S.wave + k * 62.5, [74, 76, 78, 81, 83, 86, 88, 90, 93][k], { gain: 0.035, decay: 0.1, cut: 5000, pan: (k / 4 - 1) * 0.6, delay: 0.3, verb: 0.35 })
;[b(6), b(7)].forEach((ms) => kick(ms, { gain: 0.38 }))
clap(b(7), { gain: 0.12 })
// the whip, and the floor going out under it
whoosh(S.whip[0] - 80, 380, { gain: 0.16, from: 400, to: 9000, panFrom: 0.7, panTo: -0.7 })
boom(4000, { gain: 0.32, from: 90, to: 30, len: 1.2 })

// 4 to 7.5: the berkeley wall. The construction set out in ticks; the tower
// drawn from the ground up as a run climbing a sixteenth at a time; the
// lantern lit with the carillon's first bell and a phrase of it while the
// letters go round; a finger, a letter brought near, a heart, a pop
for (let i = 0; i < 16; i++) tick(S.guides + i * 24, { gain: 0.025, pan: (i % 2 ? 1 : -1) * 0.4, pitch: 3200 + (i % 4) * 300 })
pad(4000, 3600, Em9, { gain: 0.03, cut: [400, 1800], attack: 0.8, release: 1.2, verb: 0.7 })
;[50, 54, 57, 59, 62, 66, 69, 71, 74, 78, 81, 83].forEach((m, i) => pluck(S.plot[0] + i * 62.5, m, { gain: 0.036 + i * 0.0025, decay: 0.1, cut: 4200, pan: ((i % 2) * 2 - 1) * 0.15, delay: 0.22, verb: 0.32 }))
bass(4000, 40, 950, { gain: 0.1 })
air(S.plot[0], S.lamp - S.plot[0], { gain: 0.05, from: 600, to: 9000 })
// the lantern
carillon(S.lamp, 74, { gain: 0.1, decay: 3 })
carillon(S.lamp + 4, 62, { gain: 0.05, decay: 3.4, pan: -0.15 })
crash(S.lamp, { gain: 0.04 })
kick(S.lamp, { gain: 0.42 })
;[[375, 69], [500, 71], [750, 66], [1000, 69]].forEach(([d, m], i) => carillon(S.lamp + d, m, { gain: 0.05, decay: 2.2, pan: (i % 2 ? 0.25 : -0.25) }))
whoosh(S.ring - 50, 700, { gain: 0.08, from: 500, to: 5000, panFrom: -0.6, panTo: 0.6 })
for (let k = 10; k <= 14; k++) kick(b(k), { gain: k === 12 ? 0.4 : 0.3 })
for (let k = 20; k < 30; k++) hat(b(k / 2), { gain: k % 2 ? 0.025 : 0.038 })
;[43, 40, 38].forEach((m, i) => bass(5000 + i * 500, m, 460, { gain: 0.12 }))
// the finger, the letter brought to the lens, the heart
tap(S.tap1, { gain: 0.16 })
whoosh(S.open[0] + 20, 450, { gain: 0.07, from: 300, to: 3000, panFrom: 0.1, panTo: -0.1 })
pad(S.open[0], 1400, Gmaj9, { gain: 0.035, cut: [900, 2600], attack: 0.15, release: 0.8, verb: 0.7 })
tap(S.tap2, { gain: 0.15, pan: 0.2, pitch: 2400 })
pop(S.tap2 + 10, { gain: 0.16, pan: 0.2 })
boom(S.tap2, { gain: 0.16, from: 180, to: 60, len: 0.35 })
for (let i = 0; i < 8; i++) bell(S.tap2 + 30 + i * 28, [86, 90, 93, 95, 98, 93, 100, 102][i], { gain: 0.012, decay: 0.25, pan: (r(i + 40) - 0.5) * 1.2, verb: 0.5, p2: 0.1 })
off(7290, { gain: 0.06 })

// 7.5 to 9.5: the send. The beat, cut on the beat; the words on it
for (let k = 15; k <= 18; k++) kick(b(k), { gain: 0.42 })
;[b(16), b(18)].forEach((ms) => clap(ms))
for (let k = 30; k < 37; k++) hat(b(k / 2), { gain: k % 2 ? 0.035 : 0.05 })
key(S.press, { pitch: 1500, body: 300, gain: 0.16, pan: -0.1 })
tap(S.press, { gain: 0.1, pan: 0.1 })
bell(S.press + 60, 88, { gain: 0.03, decay: 0.2, verb: 0.2, b: FX })
bell(S.press + 150, 93, { gain: 0.026, decay: 0.3, verb: 0.2, b: FX })
air(S.press + 190, 430, { gain: 0.14, from: 500, to: 12000, pan: 0 })
boom(S.press + 620, { gain: 0.25, from: 200, to: 50, len: 0.5 })
;[S.sendIt, S.privately].forEach((ms, i) => {
  boom(ms, { gain: 0.28, from: 150, to: 40, len: 0.6 })
  pad(ms, 420, i ? A6 : Gmaj9, { gain: 0.04, cut: [2600, 1200], attack: 0.005, release: 0.25, verb: 0.5 })
})
bass(b(15), 31, 480); bass(b(16), 43, 480); bass(b(17), 38, 480)
off(S.off, { gain: 0.13 })

// 9.5 to 11.5: the other. Out of the black, warmer: the bass walks, the keys
// are kai's, the line in three on the beats, and the note away
wakeBuzz(S.bWake, { gain: 0.06, pan: 0.15 })
typedB().forEach((ms, i) => {
  const sp = B.text[i] === ' '
  key(ms, { pitch: sp ? 1250 : 2100 + ((i * 271) % 800), body: sp ? 240 : 400 + ((i * 41) % 110), gain: sp ? 0.07 : 0.095, pan: 0.18 })
})
pad(S.bWake, 2000, [43, 50, 54, 57, 62], { gain: 0.035, cut: [500, 1500], attack: 0.5 })
for (let k = 20; k <= 22; k++) kick(b(k), { gain: 0.36 })
clap(b(21), { gain: 0.12 })
for (let k = 39; k < 46; k++) hat(b(k / 2), { gain: k % 2 ? 0.03 : 0.045 })
;[43, 43, 50, 47, 45, 45].forEach((m, i) => bass(S.bWake + 250 + i * 250, m - 12, 220, { gain: 0.13 }))
;[S.read, S.ifThey].forEach((ms) => pluck(ms, 78, { gain: 0.05, decay: 0.3, delay: 0.4 }))
key(S.bSend, { pitch: 1500, body: 300, gain: 0.15, pan: 0.15 })
tap(S.bSend, { gain: 0.1, pan: 0.2 })
bell(S.bSend + 60, 88, { gain: 0.028, decay: 0.2, verb: 0.2 })
bell(S.bSend + 150, 93, { gain: 0.024, decay: 0.3, verb: 0.2 })
whoosh(S.bSend + 170, 330, { gain: 0.07, from: 6000, to: 500, panFrom: 0, panTo: 0.5 })

// 11.5 to 13: the week. A clack for every flap, the riser under them, the
// roll quickening; the finger on the time, and the glass opening out of it
S.days.forEach((d) => [0, 28, 56].forEach((o, c) => flap(d + o, { gain: 0.12, pan: (c - 1) * 0.35 })))
for (let i = 0; i < 7; i++) if (i !== 4) flap(S.time + i * 24, { gain: 0.09, pan: (i / 3 - 1) * 0.5 })
air(S.wait[0], 2250, { gain: 0.07, from: 200, to: 11000, q: 3.5 })
{
  // the roll: eighths, then sixteenths, then thirty-seconds, into the drop
  const hits = []
  for (let ms = 12000; ms < 12750; ms += 250) hits.push(ms)
  for (let ms = 12750; ms < 13500; ms += 125) hits.push(ms)
  for (let ms = 13500; ms < S.drop - 250; ms += 62.5) hits.push(ms)
  hits.forEach((ms, i) => clap(ms, { gain: 0.02 + 0.05 * (i / hits.length), pan: ((i % 2) * 2 - 1) * 0.15 }))
}
pad(S.wait[0], 2250, [47, 54, 59, 62, 66], { gain: 0.03, cut: [300, 5200], attack: 1.6, release: 0.1, q: 2.4 })
tap(S.tap3, { gain: 0.2 })
bell(S.tap3 + 20, 86, { gain: 0.03, decay: 0.5, verb: 0.4 })
whoosh(S.tap3 + 30, 250, { gain: 0.09, from: 200, to: 7000, panFrom: 0, panTo: 0 })
for (let k = 23; k <= 27; k++) kick(b(k), { gain: 0.34 })
// the run: a climbing arpeggio under the two of them running, and from the
// moment they are held a breath of nothing before the drop
;[59, 62, 66, 69, 71, 74, 78, 81].forEach((m, i) => pluck(S.run[0] - 100 + i * 105, m, { gain: 0.04 + i * 0.004, decay: 0.16, cut: 4000, pan: ((i % 2) * 2 - 1) * 0.3, delay: 0.2 }))
air(S.drop - 210, 210, { gain: 0.035, from: 2500, to: 9000 })

// 14: the drop. They are held: the chord, the kick, the crash, the motif
const DROP = S.drop
boom(DROP, { gain: 0.6, from: 140, to: 32, len: 1.6 })
crash(DROP, { gain: 0.15 })
pad(DROP, 2700, D9, { gain: 0.09, cut: [5200, 1800], attack: 0.01, release: 0.9, verb: 0.6, pan: 0.5 })
pad(DROP, 2300, D9.slice(2).map((m) => m + 12), { gain: 0.03, cut: [7000, 2600], attack: 0.01, release: 0.8, verb: 0.7, pan: 0.6 })
for (let k = 28; k <= 32; k++) kick(b(k), { gain: 0.45 })
;[b(29), b(31)].forEach((ms) => clap(ms, { gain: 0.18 }))
for (let k = 57; k < 66; k++) hat(b(k / 2), { gain: k % 2 ? 0.035 : 0.05, open: k % 4 === 3 })
;[38, 38, 45, 43].forEach((m, i) => bass(DROP + i * 500, m, 470, { gain: 0.16 }))
;[[0, 78], [250, 81], [500, 86], [1000, 85], [1500, 81]].forEach(([d, m]) => bell(DROP + d, m, { gain: 0.045, decay: 0.9, pan: (d / 1000) - 0.4, delay: 0.35 }))
// `it's mutual.` typed in the glass's cells, a soft tick a letter, and the
// bell when the last of it lands
const ST = STORY_TIMES
const TYPE_MS = (ST.said - ST.say) / [...SAY].length
;[...SAY].forEach((c, k) => { if (c !== ' ') key(reelAt(ST.say + TYPE_MS * (k + 1)), { pitch: 3000, body: 520, gain: 0.05, pan: -0.1 + k * 0.02 }) })
const SAID = reelAt(ST.said)
;[[74, 0, -0.3], [78, 110, 0.15], [81, 220, 0.3], [86, 360, 0]].forEach(([m, d, p]) => bell(SAID + d, m, { gain: 0.045, decay: 1.4, pan: p, p2: 0.2 }))

// 16.5 to 18.5: the question. The drums go; a heartbeat under it, a low
// bell for each line, and the chord held open
air(S.ask[0] - 300, 900, { gain: 0.04, from: 9000, to: 600, rise: false })
pad(S.ask[0], 2300, [43, 50, 54, 57, 62, 66], { gain: 0.034, cut: [700, 1500], attack: 0.25, release: 0.9, verb: 0.75 })
;[S.q[0], S.q[1], S.q[2], S.q[2] + 500].forEach((ms) => beatHeart(ms, { gain: 0.3 }))
;[[S.q[0], 62], [S.q[1], 66], [S.q[2], 69]].forEach(([ms, m], i) => carillon(ms, m, { gain: 0.045 + i * 0.01, decay: 2, pan: (i - 1) * 0.2, verb: 0.75 }))
// 18.5: the letters to pixels
crackle(S.burst, 240, { gain: 0.12 })
boom(S.burst, { gain: 0.2, from: 200, to: 70, len: 0.4 })
bell(S.burst, 98, { gain: 0.02, decay: 0.4 })
// 18.65 to 20: the two lights going round each other, quicker each turn: a
// note a light at each half turn, heard where each light is, rising, and the
// air drawn in under them
{
  let last = [-1, -1]
  const SCALE = [62, 66, 69, 71, 74, 78, 81, 83, 86, 90, 93, 95]
  for (let ms = ORBIT.from; ms < S.meet - 20; ms += 5) {
    for (const side of [0, 1]) {
      const o = orbitOf(side, ms)
      const half = Math.floor(o.turn / (Math.PI / 2))
      if (half !== last[side]) {
        last[side] = half
        const pan = Math.max(-0.9, Math.min(0.9, (o.x - 540) / 380))
        const m = SCALE[Math.min(SCALE.length - 1, Math.floor(o.k * SCALE.length))] + (side ? 0 : -5)
        bell(ms, m, { gain: 0.022 + o.k * 0.02, decay: 0.35, pan, verb: 0.45, delay: 0.2, p2: 0.2 })
      }
    }
  }
}
air(ORBIT.from, S.meet - ORBIT.from, { gain: 0.09, from: 300, to: 12000, q: 2.8 })
pad(ORBIT.from, S.meet - ORBIT.from + 50, [47, 54, 59, 62, 66, 69], { gain: 0.03, cut: [300, 6000], attack: 1.1, release: 0.05, q: 2 })
kick(S.burst + 500, { gain: 0.26, deep: 0.4 })
kick(S.burst + 1000, { gain: 0.3, deep: 0.4 })
// 20: they meet. The flash, and the name: the whole chord, the tower's bell,
// and a tick for every pixel coming home
boom(S.meet, { gain: 0.62, from: 150, to: 30, len: 1.8 })
crash(S.meet, { gain: 0.14 })
kick(S.meet, { gain: 0.5 })
pad(S.meet, 2000, [38, 50, 57, 62, 66, 69, 74], { gain: 0.07, cut: [6000, 1400], attack: 0.01, release: 1.4, verb: 0.75, pan: 0.5 })
carillon(S.meet, 74, { gain: 0.08, decay: 3.2 })
carillon(S.meet + 3, 81, { gain: 0.04, decay: 2.6, pan: 0.2 })
for (let i = 0; i < 46; i++) {
  const d = 30 + (i / 46) ** 1.3 * 620 + r(i + 70) * 20
  tick(S.meet + d, { gain: 0.02, pan: (r(i + 90) - 0.5) * 1.4, pitch: 3600 + r(i + 11) * 2400 })
}
// the address, typed
for (let k = 0; k < 'celestual.us'.length; k++) key(S.url + 20 + k * 38, { pitch: 2600 + ((k * 211) % 700), body: 480, gain: 0.05, pan: 0.05 })
pad(S.lock[1], 1300, [50, 57, 62, 66, 69], { gain: 0.022, cut: [1200, 600], attack: 0.2, release: 1, verb: 0.85 })

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
const drive = 1.4 / Math.max(1e-6, peak)
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

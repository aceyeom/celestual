#!/usr/bin/env node
// studio-score.mjs: the reel's score, made from the reel's own clock.
//
// Nothing here is a recording. It is a small synthesiser written for this
// piece: band-limited saws (polyBLEP), biquad filters swept as they play,
// envelopes, a kick that the pads duck under, a stereo delay a dotted eighth
// long, a room, and tape's soft saturation on the whole. Every sound is
// placed at the moment app/src/studio/parts/reel-time.js says its picture
// happens: a key for every letter on the frame it lands, a blip for every
// phone of the wall as it wakes, an impact under the title, the beat for the
// send, a clack for every flap, the riser into the drop on the frame the two
// of them are held, and the bell on the frame the glass has said it.
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
import { MS, BEAT, A, B, S, SAY, typedA, typedB, STORY_TIMES, reelAt } from '../app/src/studio/parts/reel-time.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/film-unsent.wav')

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

// ── the score ───────────────────────────────────────────────────────────────
const b = (n) => n * BEAT
// B minor and D: the chords a bar each, the drop in D
const Bm9 = [47, 54, 57, 61, 62]
const Gmaj9 = [43, 50, 54, 57, 59, 62]
const D9 = [38, 45, 50, 54, 57, 64]
const A6 = [45, 52, 54, 57, 61]

// 0 to 2: up close. The keys are the rhythm, a heartbeat under them, the
// first chord breathing in
typedA().forEach((ms, i) => {
  const sp = A.text[i] === ' '
  key(ms, { pitch: sp ? 1280 : 1900 + ((i * 397) % 900), body: sp ? 250 : 380 + ((i * 53) % 120), gain: sp ? 0.12 : 0.16, pan: -0.15 })
})
pad(0, 2600, Bm9, { gain: 0.032, cut: [300, 900], attack: 0.35, release: 0.7 })
;[0, b(2)].forEach((ms) => { kick(ms, { gain: 0.32, deep: 0.5 }); kick(ms + 180, { gain: 0.18, deep: 0.4 }) })

// 1.75 to 3.5: back into the wall. Every phone of it waking is a note of
// the pentatonic, scattered, the city coming on; the title is the impact
const PENTA = [71, 74, 76, 78, 81, 83, 86, 88]
for (let i = 0; i < 16; i++) {
  const r = ((Math.sin((i + 3) * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
  const ms = S.wall[0] + 180 + r * 760
  pluck(ms, PENTA[(i * 5) % PENTA.length], { gain: 0.03, decay: 0.12, cut: 2600, pan: ((i % 5) / 2 - 1) * 0.7, delay: 0.35, verb: 0.4 })
}
air(S.wall[0], S.title - S.wall[0], { gain: 0.07, from: 300, to: 8000 })
boom(S.title, { gain: 0.5 })
crash(S.title, { gain: 0.05 })
pad(S.title, 1100, Gmaj9, { gain: 0.05, cut: [2400, 900], attack: 0.01, release: 0.5, verb: 0.7 })
bell(S.title, 74, { gain: 0.04, decay: 1.4, pan: -0.2 })
bell(S.title + 3, 78, { gain: 0.03, decay: 1.4, pan: 0.2 })

// 3.5 to 5.5: the send. The beat, cut on the bar; the words on it
for (let k = 7; k <= 10; k++) kick(b(k), { gain: 0.42 })
;[b(8), b(10)].forEach((ms) => clap(ms))
for (let k = 14; k < 21; k++) hat(b(k / 2) + (k % 2 ? 0 : 0), { gain: k % 2 ? 0.035 : 0.05 })
key(S.press, { pitch: 1500, body: 300, gain: 0.16, pan: -0.1 })
bell(S.press + 60, 88, { gain: 0.03, decay: 0.2, verb: 0.2, b: FX })
bell(S.press + 150, 93, { gain: 0.026, decay: 0.3, verb: 0.2, b: FX })
air(3690, 430, { gain: 0.14, from: 500, to: 12000, pan: 0 })
boom(4120, { gain: 0.25, from: 200, to: 50, len: 0.5 })
;[S.sendIt, S.privately].forEach((ms, i) => {
  boom(ms, { gain: 0.28, from: 150, to: 40, len: 0.6 })
  pad(ms, 420, i ? A6 : Gmaj9, { gain: 0.04, cut: [2600, 1200], attack: 0.005, release: 0.25, verb: 0.5 })
})
bass(b(7), 31, 480); bass(b(8), 43, 480); bass(b(9), 38, 480)
off(S.off, { gain: 0.13 })

// 5.5 to 7.5: the other. Out of the black, warmer: the bass walks, the keys
// are kai's, the line in two halves on the beats
wakeBuzz(S.bWake, { gain: 0.06, pan: 0.15 })
typedB().forEach((ms, i) => {
  const sp = B.text[i] === ' '
  key(ms, { pitch: sp ? 1250 : 2100 + ((i * 271) % 800), body: sp ? 240 : 400 + ((i * 41) % 110), gain: sp ? 0.07 : 0.095, pan: 0.18 })
})
pad(S.bWake, 2000, [43, 50, 54, 57, 62], { gain: 0.035, cut: [500, 1500], attack: 0.5 })
for (let k = 12; k <= 14; k++) kick(b(k), { gain: 0.36 })
clap(b(13), { gain: 0.12 })
for (let k = 23; k < 30; k++) hat(b(k / 2), { gain: k % 2 ? 0.03 : 0.045 })
;[43, 43, 50, 47, 45, 45].forEach((m, i) => bass(5750 + i * 250, m - 12, 220, { gain: 0.13 }))
;[S.read, S.ifThey].forEach((ms) => pluck(ms, 78, { gain: 0.05, decay: 0.3, delay: 0.4 }))
key(S.bSend, { pitch: 1500, body: 300, gain: 0.15, pan: 0.15 })
bell(S.bSend + 60, 88, { gain: 0.028, decay: 0.2, verb: 0.2 })
bell(S.bSend + 150, 93, { gain: 0.024, decay: 0.3, verb: 0.2 })
air(S.bSend + 170, 330, { gain: 0.08, from: 9000, to: 400, rise: false, pan: 0.1 })

// 7.5 to 9: the week. A clack for every flap, the riser under them, the
// roll quickening, the filter opening
S.days.forEach((d) => [0, 28, 56].forEach((o, c) => flap(d + o, { gain: 0.12, pan: (c - 1) * 0.35 })))
for (let i = 0; i < 7; i++) if (i !== 4) flap(S.time + i * 24, { gain: 0.09, pan: (i / 3 - 1) * 0.5 })
air(7500, 2250, { gain: 0.07, from: 200, to: 11000, q: 3.5 })
{
  // the roll: eighths, then sixteenths, then thirty-seconds, into the drop
  const hits = []
  for (let ms = 8000; ms < 8750; ms += 250) hits.push(ms)
  for (let ms = 8750; ms < 9500; ms += 125) hits.push(ms)
  for (let ms = 9500; ms < 9750; ms += 62.5) hits.push(ms)
  hits.forEach((ms, i) => clap(ms, { gain: 0.02 + 0.05 * (i / hits.length), pan: ((i % 2) * 2 - 1) * 0.15 }))
}
pad(7500, 2250, [47, 54, 59, 62, 66], { gain: 0.03, cut: [300, 5200], attack: 1.6, release: 0.1, q: 2.4 })
// and the breath: from the moment they are held, the air drawn in, and nothing
air(9790, 210, { gain: 0.035, from: 2500, to: 9000 })
for (let k = 15; k <= 19; k++) kick(b(k), { gain: 0.34 })

// 9 to 10: the run. A climbing arpeggio under the two of them running, and
// from the moment they are held (9750) a breath of nothing before the drop
;[59, 62, 66, 69, 71, 74, 78, 81].forEach((m, i) => pluck(8900 + i * 105, m, { gain: 0.04 + i * 0.004, decay: 0.16, cut: 4000, pan: ((i % 2) * 2 - 1) * 0.3, delay: 0.2 }))

// 10: the drop. They are held: the chord, the kick, the crash, the motif
const DROP = S.drop
boom(DROP, { gain: 0.6, from: 140, to: 32, len: 1.6 })
crash(DROP, { gain: 0.15 })
pad(DROP, 2700, D9, { gain: 0.09, cut: [5200, 1800], attack: 0.01, release: 0.9, verb: 0.6, pan: 0.5 })
// the same chord an octave up, bright, for the light going over the glass
pad(DROP, 2300, D9.slice(2).map((m) => m + 12), { gain: 0.03, cut: [7000, 2600], attack: 0.01, release: 0.8, verb: 0.7, pan: 0.6 })
for (let k = 20; k <= 24; k++) kick(b(k), { gain: 0.45 })
;[b(21), b(23)].forEach((ms) => clap(ms, { gain: 0.18 }))
for (let k = 41; k < 50; k++) hat(b(k / 2), { gain: k % 2 ? 0.035 : 0.05, open: k % 4 === 3 })
;[38, 38, 45, 43].forEach((m, i) => bass(DROP + i * 500, m, 470, { gain: 0.16 }))
// the motif: up to the D, and the C sharp under it
;[[0, 78], [250, 81], [500, 86], [1000, 85], [1500, 81]].forEach(([d, m]) => bell(DROP + d, m, { gain: 0.045, decay: 0.9, pan: (d / 1000) - 0.4, delay: 0.35 }))
// `it's mutual.` typed in the glass's cells, a soft tick a letter, and the
// bell when the last of it lands
const ST = STORY_TIMES
const TYPE_MS = (ST.said - ST.say) / [...SAY].length
;[...SAY].forEach((c, k) => { if (c !== ' ') key(reelAt(ST.say + TYPE_MS * (k + 1)), { pitch: 3000, body: 520, gain: 0.05, pan: -0.1 + k * 0.02 }) })
const SAID = reelAt(ST.said)
;[[74, 0, -0.3], [78, 110, 0.15], [81, 220, 0.3], [86, 360, 0]].forEach(([m, d, p]) => bell(SAID + d, m, { gain: 0.045, decay: 1.4, pan: p, p2: 0.2 }))

// 12.6 to 15: the end. The drums go; the chord comes home, and the metal is
// poured: a shimmer of glass harmonics, and the last note under the word
air(S.end[0] - 300, 900, { gain: 0.05, from: 9000, to: 600, rise: false })
pad(S.end[0], 2400, [43, 50, 54, 57, 62, 66], { gain: 0.03, cut: [1400, 600], attack: 0.3, release: 1.2, verb: 0.75 })
pad(13450, 1550, [38, 50, 57, 62, 66, 69], { gain: 0.028, cut: [1800, 700], attack: 0.05, release: 1.2, verb: 0.8 })
boom(13450, { gain: 0.18, from: 90, to: 36, len: 1.4 })
;[[86, 12700], [90, 12850], [93, 13000], [98, 13150]].forEach(([m, ms], i) => bell(ms, m, { gain: 0.012, decay: 0.8, pan: (i % 2) * 0.6 - 0.3, verb: 0.8, p2: 0.15 }))
bell(13450, 74, { gain: 0.04, decay: 2.2, verb: 0.7 })
bell(13453, 81, { gain: 0.03, decay: 2.0, verb: 0.7, pan: 0.2 })

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

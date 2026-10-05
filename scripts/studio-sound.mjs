#!/usr/bin/env node
// studio-sound.mjs: the film's sound, made from the film's own clock.
//
// Nothing here is a recording. Every sound is a few lines of arithmetic on
// a sample buffer, placed at the moment app/src/studio/parts/film-time.js
// says its picture happens: a key for every letter on the frame it lands,
// the backlight's tick where a phone wakes, two notes when `send` is
// pressed, the hush where the two phones go dark, and a chord that opens
// with the one glass and rings when it says `it's mutual.` The story's own
// moments come from pixmark.js, as the picture's do (film-time.js
// `STORY_TIMES`). Mastered to -14 LUFS and a true peak a decibel under full
// scale, as the reels round it are, by ffmpeg's loudnorm in two passes.
//
//   node scripts/studio-sound.mjs [out.wav]     48 kHz, 16 bit, stereo
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { MS, A, B, T, SEND, SAY, typedA, typedB, filmAt, STORY_TIMES, SAID } from '../app/src/studio/parts/film-time.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/film-unsent.wav')

const SR = 48000
const N = Math.round((MS / 1000) * SR)
const L = new Float32Array(N)
const R = new Float32Array(N)
const WL = new Float32Array(N) // the send into the room's reverb
const WR = new Float32Array(N)
const TAU = Math.PI * 2

// a small generator, so the noise is the same every time the sound is made
let seed = 0x2545f491
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }

// lay a voice into the mix: `fn(i)` for each of `len` samples from `ms`,
// panned (-1 left to 1 right, equal power) and sent to the reverb by `wet`
function lay(ms, len, fn, { gain = 1, pan = 0, wet = 0 } = {}) {
  const s0 = Math.round((ms / 1000) * SR)
  const a = (pan + 1) * Math.PI / 4
  const gl = Math.cos(a) * gain
  const gr = Math.sin(a) * gain
  for (let i = 0; i < len; i++) {
    const k = s0 + i
    if (k < 0 || k >= N) continue
    const v = fn(i)
    L[k] += v * gl; R[k] += v * gr
    if (wet) { WL[k] += v * gl * wet; WR[k] += v * gr * wet }
  }
}
const sec = (s) => Math.round(s * SR)

// ── the voices ──────────────────────────────────────────────────────────────
// a key on an old phone: a tick of noise through a resonance, and a little
// of the plastic's body under it
function key(ms, { pitch = 2200, body = 420, gain = 0.16, pan = 0 } = {}) {
  let y1 = 0; let y2 = 0
  const r = 0.985
  const w = TAU * pitch / SR
  const c1 = 2 * r * Math.cos(w)
  const c2 = -r * r
  lay(ms, sec(0.045), (i) => {
    const x = i < sec(0.004) ? rnd() * (1 - i / sec(0.004)) : 0
    const y = x + c1 * y1 + c2 * y2
    y2 = y1; y1 = y
    const thump = Math.sin(TAU * body * i / SR) * Math.exp(-i / sec(0.008)) * 0.6
    return (y * 0.09 + thump) * Math.exp(-i / sec(0.012))
  }, { gain, pan, wet: 0.12 })
}

// the backlight coming on: a click, a short buzz of the inverter, a thump
function wakeSound(ms, pan = 0, gain = 0.3) {
  lay(ms, sec(0.006), (i) => rnd() * (1 - i / sec(0.006)), { gain: gain * 0.35, pan })
  lay(ms + 20, sec(0.22), (i) => {
    const e = Math.exp(-i / sec(0.06))
    return (Math.sin(TAU * 118 * i / SR) * 0.6 + Math.sin(TAU * 236 * i / SR) * 0.25 + rnd() * 0.08) * e
  }, { gain: gain * 0.18, pan })
  lay(ms, sec(0.18), (i) => Math.sin(TAU * 62 * i / SR) * Math.exp(-i / sec(0.05)), { gain: gain * 0.35, pan })
}

// a bell: a sine and its inharmonic partials, struck and let ring
function bell(ms, f, { gain = 0.05, decay = 1.4, pan = 0, wet = 0.45, p2 = 0.35 } = {}) {
  lay(ms, sec(decay * 3), (i) => {
    const t = i / SR
    const att = Math.min(1, i / sec(0.004))
    return att * (Math.sin(TAU * f * t) * Math.exp(-t / decay)
      + p2 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (decay * 0.45))
      + 0.12 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / (decay * 0.2)))
  }, { gain, pan, wet })
}

// a soft tone, for the send key's two notes
function tone(ms, f, len, { gain = 0.05, pan = 0, wet = 0.3 } = {}) {
  lay(ms, sec(len + 0.25), (i) => {
    const t = i / SR
    const a = Math.min(1, t / 0.006)
    const r = t > len ? Math.exp(-(t - len) / 0.05) : 1
    return Math.sin(TAU * f * t) * a * r * (0.85 + 0.15 * Math.sin(TAU * 2 * f * t))
  }, { gain, pan, wet })
}

// air through a narrowing filter: the note going
function whoosh(ms, len, { gain = 0.05, pan = 0, from = 0.5, to = 0.03 } = {}) {
  let y = 0
  lay(ms, sec(len), (i) => {
    const u = i / sec(len)
    const k = from + (to - from) * u
    y += k * (rnd() - y)
    return y * Math.sin(Math.PI * u) ** 1.5
  }, { gain, pan, wet: 0.5 })
}

// a held voice: two oscillators a hair apart, an envelope of [ms, level]
function pad(f, env, { gain = 0.02, pan = 0, wet = 0.6, bright = 0.18 } = {}) {
  const at = (ms) => {
    if (ms <= env[0][0]) return env[0][1]
    for (let i = 1; i < env.length; i++) {
      if (ms <= env[i][0]) {
        const [t0, v0] = env[i - 1]
        const [t1, v1] = env[i]
        const u = (ms - t0) / (t1 - t0)
        return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * u))
      }
    }
    return env[env.length - 1][1]
  }
  const d = 1.0016
  lay(0, N, (i) => {
    const t = i / SR
    const e = at(t * 1000)
    if (e <= 0) return 0
    const v = Math.sin(TAU * f * t) + Math.sin(TAU * f * d * t + 1.3) + bright * (Math.sin(TAU * 2 * f * t) + Math.sin(TAU * 3 * f * d * t) * 0.5)
    return v * 0.5 * e
  }, { gain, pan, wet })
}

// ── the room ────────────────────────────────────────────────────────────────
// the black room is not silent: a low, brown hush under everything
{
  let b = 0
  lay(0, N, (i) => {
    b = (b + 0.02 * rnd()) * 0.996
    const t = i / SR
    const fade = Math.min(1, t / 0.15) * Math.min(1, (MS / 1000 - t) / 1.0)
    const hush = t * 1000 > T.dim && t * 1000 < T.glass + 200 ? 0.45 : 1
    return b * fade * hush
  }, { gain: 0.035 })
}

// ── the first phone ─────────────────────────────────────────────────────────
// lit before the first frame, so no wake: the film opens on its keys
const keyOf = (c, i, side) => {
  const sp = c === ' '
  const [p0, pr, b0, br] = side < 0 ? [1900, 900, 380, 120] : [2100, 800, 400, 110]
  return { pitch: sp ? 1280 : p0 + ((i * (side < 0 ? 397 : 271)) % pr), body: sp ? 250 : b0 + ((i * 53) % br), gain: sp ? 0.085 : 0.11, pan: side * 0.18 }
}
typedA().forEach((ms, i) => key(ms, keyOf(A.text[i], i, -1)))
const send = (ms, pan) => {
  key(ms, { pitch: 1500, body: 300, gain: 0.14, pan })
  tone(ms + 60, 1318.5, 0.07, { gain: 0.04, pan })
  tone(ms + 150, 1760, 0.1, { gain: 0.035, pan })
  whoosh(ms + SEND.key, 0.42, { gain: 0.1, pan: pan * 1.6 })
}
send(T.aSend, -0.15)

// ── the second ──────────────────────────────────────────────────────────────
wakeSound(T.bWake, 0.1, 0.28)
typedB().forEach((ms, i) => key(ms, keyOf(B.text[i], i, 1)))
send(T.bSend, 0.15)

// ── under it all ────────────────────────────────────────────────────────────
// a low D held from the first frame, with enough of its upper partials that
// a phone's speaker carries it, a little warmer once there are two, and gone
// in the hush where they meet
pad(73.42, [[0, 0.45], [1800, 0.55], [3200, 0.42], [T.bWake, 0.42], [5400, 0.6], [T.dim, 0.6], [T.glass, 0]], { gain: 0.05, wet: 0.2, bright: 0.35 })
pad(146.83, [[0, 0.3], [T.aSleep, 0.3], [3400, 0.15], [T.bWake, 0.15], [5400, 0.35], [T.dim, 0.35], [T.glass, 0]], { gain: 0.016, wet: 0.35, bright: 0.2 })
pad(110, [[0, 0], [T.bWake, 0], [5300, 0.4], [T.dim, 0.4], [T.glass, 0]], { gain: 0.02, pan: 0.2, wet: 0.4 })

// ── the glass ───────────────────────────────────────────────────────────────
const S = STORY_TIMES
const at = (s) => filmAt(s)
wakeSound(T.glass, 0, 0.32)
// the names
bell(at(S.credit), 880, { gain: 0.02, decay: 0.9, pan: -0.2 })
bell(at(S.credit) + 150, 1108.7, { gain: 0.018, decay: 0.9, pan: 0.2 })
// the chord opens with the glass and comes fully in as they are held: D,
// A, F sharp, C sharp, the A and the E above when the glass turns rose
const END = MS
const fall = [[END - 1600, 1], [END, 0]]
const chord = (f, from, peak, { gain = 0.02, pan = 0, bright = 0.15 } = {}) =>
  pad(f, [[0, 0], [from, 0], [from + 1800, peak], ...fall.map(([t, v]) => [t, v * peak])], { gain, pan, wet: 0.7, bright })
chord(73.42, T.glass, 0.8, { gain: 0.05, bright: 0.1 })
chord(146.83, T.glass, 0.7, { gain: 0.03 })
chord(220.0, T.glass + 300, 0.7, { gain: 0.026, pan: -0.25 })
chord(369.99, at(S.catch), 0.75, { gain: 0.022, pan: 0.25 })
chord(554.37, at(S.glow), 0.7, { gain: 0.016, pan: -0.15, bright: 0.08 })
chord(659.26, at(S.glow) + 400, 0.6, { gain: 0.012, pan: 0.3, bright: 0.05 })
// the turn: three points of the light going over the glass
;[[2637, 0, -0.4], [3520, 140, 0.35], [2960, 300, 0]].forEach(([f, d, p]) =>
  bell(at(S.glow) + d, f, { gain: 0.007, decay: 0.4, pan: p, wet: 0.7, p2: 0.2 }))
// `it's mutual.` typed in the glass's cells, a soft tick on each letter as
// it lands (pixmark.js: a letter every 70ms from `say`)
const TYPE_MS = (S.said - S.say) / [...SAY].length
;[...SAY].forEach((c, k) => {
  if (c !== ' ') key(at(S.say + TYPE_MS * (k + 1)), { pitch: 3000, body: 520, gain: 0.05, pan: -0.1 + k * 0.02 })
})
// and when the last of it lands, the bell: low and warm, never bright
;[[587.33, 0, -0.3], [739.99, 110, 0.15], [880, 220, 0.3], [1174.66, 360, 0]].forEach(([f, d, p]) =>
  bell(SAID + d, f, { gain: 0.03, decay: 1.2, pan: p, p2: 0.2 }))
// the step back, and the name: one low note under it
bell(T.back + 250, 293.66, { gain: 0.03, decay: 1.8, pan: 0, wet: 0.6, p2: 0.2 })

// ── the room's reverb ───────────────────────────────────────────────────────
// Schroeder's: four combs in parallel and two all passes after, a little
// different on each side so the room is wide
function reverb(x, spread) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + spread, b: new Float32Array(d + spread), i: 0, f: 0 }))
  const aps = [225, 556].map((d) => ({ d: d + (spread >> 1), b: new Float32Array(d + (spread >> 1)), i: 0 }))
  const y = new Float32Array(x.length)
  for (let n = 0; n < x.length; n++) {
    let s = 0
    for (const c of combs) {
      const o = c.b[c.i]
      c.f = o * 0.72 + c.f * 0.28
      c.b[c.i] = x[n] + c.f * 0.86
      c.i = (c.i + 1) % c.d
      s += o
    }
    s *= 0.25
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
const RL = reverb(WL, 0)
const RR = reverb(WR, 23)
for (let i = 0; i < N; i++) { L[i] += RL[i] * 0.9; R[i] += RR[i] * 0.9 }

// ── out ─────────────────────────────────────────────────────────────────────
// the peak to a decibel under full scale, and the last half second faded
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = 0.89 / Math.max(1e-6, peak)
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8)
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const f = Math.min(1, (N - i) / sec(1.0))
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * f)) * 32767), 44 + i * 4)
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * f)) * 32767), 46 + i * 4)
}
mkdirSync(dirname(out), { recursive: true })
const raw = `${out}.raw.wav`
writeFileSync(raw, buf)
// mastered: measured once, then brought to -14 LUFS with those numbers
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{')))
const norm = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', norm, '-ar', String(SR), '-c:a', 'pcm_s16le', out])
spawnSync('rm', ['-f', raw])
console.log(out.replace(`${root}/`, ''), `${(MS / 1000).toFixed(1)}s`, `from ${m.input_i} LUFS`)

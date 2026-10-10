#!/usr/bin/env node
// studio-sounds.mjs: the reel's sounds alone, for a song of someone's own to
// be laid over them.
//
// Made against the reel's clock (app/src/studio/parts/reel-time.js), so every
// sound is on the frame it belongs to, and made of instruments played and
// recorded: the bass drum, the cymbals, the gong, the organ, the piano, the
// ocean drum and a wine glass are recordings from the Versilian Community
// Sample Library (CC0; the few seconds of each that are used are in
// scripts/sounds, and NOTICE.md there says where each is from), and the
// strings, the voices and the horns are played by FluidSynth from the
// MuseScore General SoundFont, as the song's are. Only the phone's keys and
// a low tone under the biggest moments, felt more than heard, are made
// here. A hall, made here too, is convolved round all of it.
//
// Nothing knocks, crackles or whistles. Each moment is one gesture, a swell
// and what it lands on, and everything rings on into the next, all of it
// on B, the key the film was scored in, mostly its open fifth:
//   0      lin's letter, the phone's keys under the finger, and under the
//          last words a bass drum's roll and a cymbal's swell growing
//   3.29   the camera falls back from the glass to the whole wall: the roll
//          and the swell land on a bass drum, a gong, the organ's low B and
//          the whole orchestra on B minor; the high strings shimmer and a
//          bowed cymbal sings as the backlights come on across the wall
//   8.3    lin's letter comes away from the wall, the low strings rising
//          with it
//   10.6   send: the key; a wine glass, a note at a time, as the letter's
//          pixels go into the envelope, and gone as the phone goes out
//   12.5   the envelope at the lens, a swell, and through it into the dark
//          on the bass drum, a darker gong and the low strings
//   12.9   the night: an ocean drum, the sea under the two by it
//   16.3   the week, the strings trembling high; on the thursday kai's
//          note, a horn
//   19.96  the two touch: a soft drum and the piano's low B
//   20     the two lights go out together: everything swells to the moment
//          the letter turns over, on B minor with its seventh, a gong and
//          the glass on it; `it's mutual.` lifts the voices; the sea again
//          under the two; kai's letter melts away in the glass and a bowed
//          cymbal
//   25     the ones that never meet: low strings, and the piano, a note for
//          each light as it goes
//   27.5   the question: the strings rise under it, the voices from
//          `think`; on `you?` the piano's B minor, held, with a soft gong,
//          and then all of it drawn back in, reversed, into the point
//   31.25  the name, lit from its star: the glass, a cell at a time, on the
//          strings and voices, and left ringing
//
//   node scripts/studio-sounds.mjs [out.wav]     48 kHz, 16 bit, stereo
//   LEVELS=1   each part's level in each scene, for balancing without ears
//              in the room
//   SOLO=a,b   only those parts, for hearing what each is (GAIN=<dB> sets
//              the whole's gain, as LEVELS prints it, to hear them at it)
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { MS, A, S, typedA } from '../app/src/studio/parts/reel-time.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/celestual-reel-sfx.wav')
const SOUNDFONT = process.env.SOUNDFONT || '/usr/share/sounds/sf3/MuseScore_General_Full.sf3'
if (!existsSync(SOUNDFONT)) throw new Error(`studio-sounds: no SoundFont at ${SOUNDFONT} (apt install musescore-general-soundfont fluidsynth)`)

const SR = 48000
const TAIL = 3
const N = Math.round((MS / 1000 + TAIL) * SR)
const TAU = Math.PI * 2
const sec = (s) => Math.round(s * SR)
const at = (ms) => Math.round((ms / 1000) * SR)
const db = (d) => 10 ** (d / 20)
const work = mkdtempSync(join(tmpdir(), 'celestual-sounds-'))

// a seeded random, so the sounds are the same every time they are made
let seed = 0x51d3a7c1
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }
const gauss = () => (rnd() + rnd() + rnd()) / 1.7
const r01 = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1

// the notes, in hertz and as keys, and a semitone as a speed
const B1 = 61.735
const SEMI = 2 ** (1 / 12)

// ── where everything goes ───────────────────────────────────────────────────
// two buses, the sound itself and what of it goes to the hall; and, with
// LEVELS, a meter of each part in each scene
const DRY = { L: new Float32Array(N), R: new Float32Array(N) }
const WET = { L: new Float32Array(N), R: new Float32Array(N) }
const SCENES = [['letter', 0, S.back[0]], ['back', S.back[0], S.back[1]], ['hall', S.back[1], 10000], ['send', 10000, 12500], ['night', 12500, 15000], ['date', 15000, 20000], ['reveal', 20000, 25000], ['ifnot', 25000, 27500], ['ask', 27500, 31250], ['name', 31250, MS]]
const METER = {}
const LEVELS = !!process.env.LEVELS
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null
function add(k, l, r, send, group) {
  if (k < 0 || k >= N || (SOLO && !SOLO.includes(group))) return
  DRY.L[k] += l; DRY.R[k] += r
  if (send) { WET.L[k] += l * send; WET.R[k] += r * send }
  if (LEVELS) {
    const s = SCENES.findIndex(([, a, z]) => k >= at(a) && k < at(z))
    if (s >= 0) { const m = (METER[group] ||= new Float64Array(SCENES.length)); m[s] += (l * l + r * r) / 2 }
  }
}
const panOf = (pan) => { const a = ((pan + 1) * Math.PI) / 4; return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2] }

function biquad(type, fc, q = 0.707, gainDb = 0) {
  const w = (TAU * Math.min(fc, SR * 0.45)) / SR
  const al = Math.sin(w) / (2 * q)
  const c = Math.cos(w)
  let b0; let b1; let b2; let a0 = 1 + al; let a1 = -2 * c; let a2 = 1 - al
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0 }
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0 }
  if (type === 'bp') { b0 = al; b1 = 0; b2 = -al }
  if (type === 'shelf') {
    // a high shelf, `gainDb` above `fc`
    const A = 10 ** (gainDb / 40)
    const sq = 2 * Math.sqrt(A) * al
    b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq)
    a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq
  }
  const k = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  return (x) => { const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y }
}
// a high pass and a low pass, either left out at 0
function band(hp, lp) {
  const f = []
  if (hp) f.push(biquad('hp', hp))
  if (lp) f.push(biquad('lp', lp))
  return (x) => { for (const g of f) x = g(x); return x }
}

// ── the recordings ──────────────────────────────────────────────────────────
// each as it was recorded, both its channels at the film's rate, brought to
// one height (its loudest sample at full scale), so a gain below is a gain
function recording(name) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', join(root, 'scripts/sounds', `${name}.ogg`), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`studio-sounds: the recording ${name}`)
  const n = r.stdout.length / 8
  const L = new Float32Array(n)
  const R = new Float32Array(n)
  let peak = 0
  for (let i = 0; i < n; i++) {
    L[i] = r.stdout.readFloatLE(i * 8)
    R[i] = r.stdout.readFloatLE(i * 8 + 4)
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  }
  for (let i = 0; i < n; i++) { L[i] /= peak; R[i] /= peak }
  return { L, R, ms: (n / SR) * 1000, loudest: loudest(L, R) }
}
// where a recording is loudest, in ms: the fiftieth of a second with the most
// in it, so a swell can be laid with its crest on the moment it builds to
function loudest(L, R) {
  const w = sec(0.02)
  let best = 0
  let where = 0
  for (let i = 0; i + w <= L.length; i += w) {
    let e = 0
    for (let j = i; j < i + w; j++) e += L[j] * L[j] + R[j] * R[j]
    if (e > best) { best = e; where = i }
  }
  return ((where + w / 2) / SR) * 1000
}
// a wine glass sings as the finger goes round it, and its note turns with
// the finger, loud and soft as it passes each microphone, the two out of
// step: one of them is kept, and its level evened out (divided by itself,
// taken over a thirtieth of a second), so it holds one note steadily, and
// the shape it has is given it here; the hall gives it its width
function steady(rec) {
  const x = rec.L
  const w = sec(0.005)
  const n = Math.floor(x.length / w)
  const lvl = new Float32Array(n)
  for (let b = 0; b < n; b++) {
    let e = 0
    for (let j = b * w; j < (b + 1) * w; j++) e += x[j] * x[j]
    lvl[b] = Math.sqrt(e / w)
  }
  const smooth = new Float32Array(n)
  for (let b = 0; b < n; b++) {
    let s = 0
    let c = 0
    for (let j = Math.max(0, b - 3); j <= Math.min(n - 1, b + 3); j++) { s += lvl[j]; c++ }
    smooth[b] = s / c
  }
  const floor = [...smooth].sort((p, q) => p - q)[Math.floor(n / 2)] * 0.3
  const y = new Float32Array(n * w)
  let peak = 0
  for (let i = 0; i < n * w; i++) {
    const p = i / w - 0.5
    const b = Math.max(0, Math.min(n - 2, Math.floor(p)))
    const f = Math.max(0, Math.min(1, p - b))
    y[i] = x[i] / Math.max(floor, smooth[b] * (1 - f) + smooth[b + 1] * f)
    peak = Math.max(peak, Math.abs(y[i]))
  }
  for (let i = 0; i < y.length; i++) y[i] /= peak
  rec.L = y
  rec.R = y
  rec.ms = (y.length / SR) * 1000
  return rec
}
const REC = {}
for (const name of ['bass-drum', 'bass-drum-soft', 'bass-drum-roll', 'cymbal-swell', 'cymbal-swell-short', 'bowed-cymbal', 'gong', 'gong-soft', 'glass', 'ocean-drum', 'organ-pedal', 'piano-as1', 'piano-as2', 'piano-fs4', 'piano-as4', 'piano-d5', 'piano-fs5']) REC[name] = recording(name)
steady(REC.glass)
// everything played in B: the glass sings 964 Hz, 43 cents under the B
// high in the treble, and at these speeds it sings these notes
const GLASS = { B5: 987.77 / 963.7, D6: 1174.66 / 963.7, 'F#6': 1479.98 / 963.7 }
// the gong's strongest partials (144, 287, 345, 425 and 567 Hz, between the
// key's notes) at 0.86 of its speed fall on B, B, D, F sharp and B, near
// enough for a gong; the bass drum's head (42 Hz) at 0.73 rings a low B,
// deeper and slower; the roll's (82 Hz) at 0.753 the B above it; and the
// cymbals' strongest partial (462 Hz) at 1.066 is B
const GONG = 0.86
const DRUM = 0.73
const ROLL = 0.753
const CYMBAL = 1.066
// where a recording played at `rate` crests, in ms
const crest = (rec, rate = 1) => rec.loudest / rate

// a recording laid at `ms`: `from` ms into it, for `len` ms of it, `rate`
// times its speed (and so its pitch), backwards with `rev` (so it swells
// into where it would have begun), faded in and out, filtered, placed and
// sent to the hall
function play(rec, ms, { gain = 1, pan = 0, width = 1, send = 0.35, rate = 1, from = 0, len = Infinity, fadeIn = 0, fadeOut = 0, rev = false, hp = 0, lp = 0, env = null, group = 'x' } = {}) {
  const s0 = sec(from / 1000)
  const avail = Math.floor((rec.L.length - 1 - s0) / rate)
  const n = Math.max(0, Math.min(avail, len === Infinity ? avail : sec(len / 1000)))
  const k0 = at(ms)
  const [pl, pr] = panOf(pan)
  const fl = band(hp, lp)
  const fr = band(hp, lp)
  const fi = sec(fadeIn / 1000)
  const fo = sec(fadeOut / 1000)
  for (let i = 0; i < n; i++) {
    const k = k0 + i
    if (k >= N) break
    const p = s0 + (rev ? n - 1 - i : i) * rate
    const j = Math.floor(p)
    const f = p - j
    let l = fl(rec.L[j] * (1 - f) + rec.L[j + 1] * f)
    let r = fr(rec.R[j] * (1 - f) + rec.R[j + 1] * f)
    const mid = (l + r) / 2
    const side = ((l - r) / 2) * width
    l = mid + side
    r = mid - side
    let e = gain * Math.min(1, fi ? i / fi : 1, fo ? (n - i) / fo : 1)
    if (env) e *= env((i / SR) * 1000)
    add(k, l * e * pl, r * e * pr, send, group)
  }
}

// ── made here: the keys, and the low tone ───────────────────────────────────
// a phone's key as its keyboard clicks under the finger: a tick, and the
// small hollow body of the click, over in a fiftieth of a second; the space
// bar's lower and softer; each a hair different in pitch and weight, as a
// finger never presses twice alike, and a little left or right
function key(ms, n, { space = false, gain = 1 } = {}) {
  const f = (space ? 1250 : 1850) * (1 + 0.012 * (r01(n * 3.7 + 1) * 2 - 1))
  const g = gain * (space ? 0.7 : 1) * (0.85 + 0.3 * r01(n * 5.3 + 2))
  const [pl, pr] = panOf((r01(n * 2.9 + 5) * 2 - 1) * 0.08)
  const tickf = biquad('bp', 4200, 0.8)
  const hp = biquad('hp', 450)
  const len = sec(0.022)
  const k0 = at(ms)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const tick = tickf(rnd()) * Math.exp(-t / 0.0006) * 1.4
    const body = Math.sin(TAU * f * t) * Math.exp(-t / 0.0026) * 0.5 +
      Math.sin(TAU * f * 2.71 * t + 0.7) * Math.exp(-t / 0.0011) * 0.22 +
      Math.sin(TAU * f * 0.36 * t) * Math.exp(-t / 0.0035) * 0.14
    const x = hp(tick + body) * Math.min(1, i / sec(0.0003)) * g
    add(k0 + i, x * pl, x * pr, 0.06, 'keys')
  }
}
// a low tone under the biggest moments, felt more than heard: B an octave
// and a half under middle C, rounded a little so a phone's speaker can give
// its overtones, coming in over a breath and dying slowly
function low(ms, { f = B1, gain = 0.3, rise = 40, fall = 1600, len = 6000 } = {}) {
  const n = sec(len / 1000)
  const k0 = at(ms)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const e = (1 - Math.exp(-t / (rise / 1000))) * Math.exp(-t / (fall / 1000)) * Math.min(1, (n - i) / sec(0.4))
    const x = (Math.tanh(1.6 * Math.sin(TAU * f * t)) / 1.6) * e * gain
    add(k0 + i, x, x, 0.12, 'low')
  }
}

// ── the orchestra ───────────────────────────────────────────────────────────
// the strings in their sections, the voices and the horns, each a part of
// notes and of the breath its players give them: the SoundFont's
// expressive instruments follow controller 2, fuller and brighter as it
// rises, as a section does. Each is played alone and dry; the hall is ours
const PARTS = {}
function part(name, bank, program, mix) {
  PARTS[name] = { name, bank, program, notes: [], cc: [], mix }
  return PARTS[name]
}
// notes held from `ms` for `len`, a few milliseconds apart as players are
function hold(p, ms, len, keys, vel = 70) {
  keys.forEach((key) => p.notes.push({ t: Math.max(0, ms + gauss() * 12), len, key, vel: Math.round(vel + gauss() * 4) }))
}
// the breath along a line of [ms, value] points, eased between them, a step
// every twenty milliseconds
function breath(p, pts) {
  for (let s = 1; s < pts.length; s++) {
    const [t0, v0] = pts[s - 1]
    const [t1, v1] = pts[s]
    const n = Math.max(1, Math.round((t1 - t0) / 20))
    for (let k = s === 1 ? 0 : 1; k <= n; k++) {
      const u = k / n
      p.cc.push({ t: t0 + (t1 - t0) * u, num: 2, value: Math.round(v0 + (v1 - v0) * u * u * (3 - 2 * u)) })
    }
  }
}
const basses = part('basses', 51, 49, { gain: 1.3, pan: 0.32, width: 0.6, hp: 30, send: 0.45 })
const celli = part('celli', 41, 49, { gain: 1.3, pan: 0.22, width: 0.7, hp: 45, send: 0.5 })
const violas = part('violas', 31, 49, { gain: 1.2, pan: 0.06, width: 0.8, hp: 90, send: 0.55 })
const violins = part('violins', 21, 49, { gain: 1.1, pan: -0.28, width: 0.8, hp: 160, lp: 11000, send: 0.6 })
const seconds = part('seconds', 26, 49, { gain: 1.1, pan: -0.12, width: 0.8, hp: 160, lp: 11000, send: 0.6 })
const shimmer = part('shimmer', 21, 44, { gain: 0.6, pan: -0.18, width: 1, hp: 300, lp: 12000, send: 0.8 })
const voices = part('voices', 17, 52, { gain: 1.05, pan: 0, width: 1, hp: 150, lp: 9000, send: 0.7 })
const horns = part('horns', 17, 60, { gain: 0.6, pan: -0.06, width: 0.7, hp: 60, lp: 6000, send: 0.65 })

// ── the sounds, in the film's order ─────────────────────────────────────────
const Z = S.back[0]

// lin's letter typed on the glass, the first sentence there already: a key
// as each letter lands
{
  const t = typedA()
  ;[...A.text].forEach((ch, n) => { if (t[n] >= 0) key(t[n], n, { space: ch === ' ', gain: db(-18) }) })
}

// a bass drum's roll, rising for `lead` ms to its loudest at `end`
function roll(end, lead, gain) {
  const c = crest(REC['bass-drum-roll'], ROLL)
  play(REC['bass-drum-roll'], end - lead, { rate: ROLL, from: (c - lead) * ROLL, len: lead + 650, fadeIn: lead * 0.6, fadeOut: 550, gain, lp: 3000, send: 0.4, group: 'roll' })
}
// under the last words, the world beginning to rise: the roll, from `maybe`,
// and a cymbal's swell under the mallets, both cresting on the moment the
// camera falls back, and a gong's ring played backwards, drawn in to it
roll(Z, 1800, db(-13))
play(REC['cymbal-swell'], Z + 30 - crest(REC['cymbal-swell'], CYMBAL), { rate: CYMBAL, gain: db(-11), hp: 300, lp: 11000, send: 0.45, group: 'cymbal' })
play(REC.gong, Z - 2400, { rev: true, rate: GONG, len: 2400, gain: db(-21), fadeIn: 1400, fadeOut: 12, lp: 4500, send: 0.4, group: 'gong' })
// the strings, the voices and the horns come in under the typing, so softly
// they are hardly there, and grow into it with the roll
hold(basses, Z - 1500, 6800, [35])
breath(basses, [[Z - 1500, 6], [Z - 60, 62], [Z + 350, 96], [Z + 2000, 82], [Z + 4900, 8]])
hold(celli, Z - 1400, 6600, [47, 54])
breath(celli, [[Z - 1400, 6], [Z - 60, 62], [Z + 350, 96], [Z + 2000, 80], [Z + 4700, 8]])
hold(violas, Z - 1100, 6300, [54, 59])
breath(violas, [[Z - 1100, 6], [Z - 60, 58], [Z + 400, 92], [Z + 2000, 76], [Z + 4600, 8]])
hold(seconds, Z - 800, 6000, [66, 71])
breath(seconds, [[Z - 800, 6], [Z - 60, 50], [Z + 450, 88], [Z + 2100, 72], [Z + 4600, 8]])
hold(violins, Z - 800, 6000, [71, 74])
breath(violins, [[Z - 800, 6], [Z - 60, 50], [Z + 450, 90], [Z + 2100, 72], [Z + 4600, 8]])
hold(horns, Z - 400, 4600, [47, 54, 59])
breath(horns, [[Z - 400, 6], [Z, 55], [Z + 500, 92], [Z + 2300, 58], [Z + 4100, 5]])
hold(voices, Z - 200, 5200, [66, 71, 74])
breath(voices, [[Z - 200, 6], [Z + 300, 78], [Z + 2300, 70], [Z + 4900, 5]])
// and land: the bass drum, a gong, the organ's B under all of it, and the
// low tone
play(REC['bass-drum'], Z, { rate: DRUM, gain: db(-3), hp: 30, lp: 7000, send: 0.5, group: 'drum' })
play(REC.gong, Z + 15, { rate: GONG, gain: db(-15), hp: 50, lp: 6500, len: 7500, fadeOut: 4500, send: 0.55, group: 'gong' })
play(REC['organ-pedal'], Z, { rate: 1 / SEMI, gain: db(-11), len: 6200, fadeIn: 60, fadeOut: 3000, send: 0.6, group: 'organ' })
low(Z, { gain: db(-17), rise: 35, fall: 1700, len: 6500 })
// the backlights coming on over the wall from lin's: the violins high and
// trembling, and a cymbal bowed, singing
hold(shimmer, S.wake, 5200, [83, 90])
breath(shimmer, [[S.wake, 5], [S.back[1], 52], [S.wake + 5100, 5]])
play(REC['bowed-cymbal'], S.wake, { gain: db(-17), hp: 400, lp: 12000, fadeIn: 700, len: 9000, fadeOut: 3500, send: 0.75, group: 'bowed' })

// lin's letter comes away from the wall to the camera: the low strings rise
// with it, and fall away as it is sent
hold(celli, S.lift[0], 2100, [54])
breath(celli, [[S.lift[0], 6], [S.lift[1] - 350, 46], [S.lift[1] + 200, 6]])
hold(violas, S.lift[0] + 200, 1900, [59, 66])
breath(violas, [[S.lift[0] + 200, 6], [S.lift[1] - 350, 44], [S.lift[1] + 200, 6]])
play(REC['bowed-cymbal'], S.lift[1] - 1700, { rev: true, from: 300, len: 1700, gain: db(-21), hp: 500, fadeIn: 600, fadeOut: 30, send: 0.6, group: 'bowed' })

// send: the key, pressed; the letter's pixels go up into the envelope, the
// glass singing B, D and F sharp a note at a time, and the piano's B as it
// is sealed; and as the phone goes out to a line and a point, so does the
// glass
key(S.press, 200, { gain: db(-16) })
;[['B5', 0, -0.15], ['D6', 260, 0.12], ['F#6', 520, 0]].forEach(([n, d, pan]) => {
  const from = S.gather[0] + d
  play(REC.glass, from, { rate: GLASS[n], gain: db(-32), pan, fadeIn: 280, len: S.crt[1] - from, fadeOut: S.crt[1] - S.crt[0], send: 0.7, hp: 300, group: 'glass' })
})
play(REC['piano-as4'], S.seal[0], { rate: SEMI, gain: db(-22), len: 5000, fadeOut: 2500, send: 0.65, group: 'piano' })
// it comes at the lens: the cymbal swells, the strings tremble up to it and
// the roll comes back under them, and all of it breaks into the dark on the
// bass drum, the gong and the low strings on B minor
play(REC['cymbal-swell-short'], S.lens[1] - crest(REC['cymbal-swell-short'], CYMBAL), { rate: CYMBAL, gain: db(-9), hp: 300, lp: 11000, len: crest(REC['cymbal-swell-short'], CYMBAL) + 400, fadeOut: 350, send: 0.5, group: 'cymbal' })
roll(S.lens[1], 1500, db(-15))
hold(shimmer, S.gather[1], S.wash[0] + 120 - S.gather[1], [71, 78])
breath(shimmer, [[S.gather[1], 5], [S.lens[1], 92], [S.wash[0] + 400, 0]])
hold(violins, S.crt[0], S.wash[0] + 120 - S.crt[0], [78])
breath(violins, [[S.crt[0], 5], [S.lens[1], 84], [S.wash[0] + 400, 0]])
const W = S.night[0]
play(REC['bass-drum'], W, { rate: DRUM, gain: db(-5), hp: 30, lp: 5000, send: 0.5, group: 'drum' })
play(REC.gong, W + 10, { rate: GONG, gain: db(-17), hp: 50, lp: 3500, len: 7000, fadeOut: 4000, send: 0.55, group: 'gong' })
low(W, { gain: db(-18), rise: 30, fall: 2200, len: 6000 })
hold(basses, W, 3600, [35])
breath(basses, [[W, 74], [W + 600, 70], [W + 3400, 6]])
hold(celli, W, 3400, [47, 50, 54])
breath(celli, [[W, 70], [W + 600, 66], [W + 3200, 6]])

// the night: the sea, an ocean drum's beads rolling, rising and falling
// slowly as waves do, under the two by it
const waves = (ms) => 0.72 + 0.28 * Math.sin((TAU * ms) / 5200 - 1.2)
play(REC['ocean-drum'], 12900, { gain: db(-21), hp: 140, lp: 6000, len: 3100, fadeIn: 1300, fadeOut: 1400, env: waves, send: 0.3, group: 'sea' })

// the week: the violins high and trembling as the days go by, and on the
// thursday kai's note, a horn, warm, a little to the right where it is; at
// nine it all stops
hold(shimmer, S.lapse[0], S.lapse[1] + 300 - S.lapse[0], [78, 83])
breath(shimmer, [[S.lapse[0], 5], [S.kaiIn, 34], [S.lapse[1], 30], [S.lapse[1] + 280, 4]])
hold(horns, S.kaiIn, 1900, [54, 59])
breath(horns, [[S.kaiIn, 5], [S.kaiIn + 700, 58], [S.kaiIn + 1800, 5]])
// the camera leans in, a gong's ring drawn in backwards, and the two touch:
// a soft drum, the low tone and the piano's low B, held
play(REC['gong-soft'], S.touch[2] - 1000, { rev: true, rate: GONG, len: 1000, gain: db(-21), fadeIn: 600, fadeOut: 12, lp: 5000, send: 0.45, group: 'gong' })
play(REC['bass-drum-soft'], S.touch[2], { rate: DRUM, gain: db(-10), lp: 4000, send: 0.5, group: 'drum' })
low(S.touch[2], { gain: db(-21), rise: 60, fall: 1500, len: 4000 })
play(REC['piano-as1'], S.touch[2], { rate: SEMI, gain: db(-13), len: 9000, fadeOut: 4000, send: 0.6, group: 'piano' })

// the two lights go out together: everything swells from the touch to the
// moment the letter turns over and kai's side comes on, B minor with its
// seventh, open and wide; a gong and the drum, softly, on it, and the glass
// on B, D and F sharp; `it's mutual.` lifts the voices once more; and it
// falls away as kai's letter melts back into the light
const T = S.drop
hold(basses, S.touch[2], 4900, [35])
breath(basses, [[S.touch[2], 6], [T, 74], [S.said, 70], [S.both, 50], [S.give[1] - 150, 6]])
hold(celli, S.touch[2], 4900, [47, 54])
breath(celli, [[S.touch[2], 6], [T, 78], [S.said, 72], [S.both, 52], [S.give[1] - 150, 6]])
hold(violas, S.touch[2] + 100, 4800, [62, 66])
breath(violas, [[S.touch[2] + 100, 6], [T, 76], [S.said, 70], [S.both, 50], [S.give[1] - 150, 6]])
hold(seconds, S.meet, 4700, [69, 71])
breath(seconds, [[S.meet, 6], [T, 74], [S.said, 72], [S.both, 50], [S.give[1] - 150, 6]])
hold(violins, S.meet, 4700, [74, 78])
breath(violins, [[S.meet, 6], [T, 78], [S.said, 74], [S.both, 50], [S.give[1] - 150, 6]])
hold(horns, S.meet + 300, 3300, [50, 54, 57])
breath(horns, [[S.meet + 300, 5], [T, 72], [S.said, 58], [S.said + 1000, 5]])
hold(voices, S.meet + 300, 4500, [66, 69, 74])
breath(voices, [[S.meet + 300, 5], [T, 72], [S.said - 100, 64], [S.said + 300, 76], [S.both, 50], [S.give[1] - 200, 5]])
play(REC['cymbal-swell-short'], T - crest(REC['cymbal-swell-short'], CYMBAL), { rate: CYMBAL, gain: db(-13), hp: 300, lp: 11000, send: 0.5, group: 'cymbal' })
play(REC['bass-drum-soft'], T, { rate: DRUM, gain: db(-13), lp: 4500, send: 0.5, group: 'drum' })
play(REC['gong-soft'], T + 10, { rate: GONG, gain: db(-18), hp: 50, lp: 6000, len: 5500, fadeOut: 3000, send: 0.55, group: 'gong' })
low(T, { gain: db(-21), rise: 50, fall: 2000, len: 5000 })
;[['B5', 0, -0.2], ['D6', 150, 0.2], ['F#6', 300, 0]].forEach(([n, d, pan]) => {
  const from = T + d
  play(REC.glass, from, { rate: GLASS[n], gain: db(-34), pan, fadeIn: 500, len: S.give[1] - from, fadeOut: S.give[1] - S.give[0], send: 0.75, hp: 300, group: 'glass' })
})
// the sea again under the two, side by side
play(REC['ocean-drum'], S.said, { from: 3000, gain: db(-24), hp: 140, lp: 6000, len: 2900, fadeIn: 1200, fadeOut: 1200, env: waves, send: 0.3, group: 'sea' })
// kai's letter melting back into the light: a cymbal bowed, softly
play(REC['bowed-cymbal'], S.give[0] - 200, { gain: db(-21), hp: 500, lp: 12000, fadeIn: 500, len: 2600, fadeOut: 1600, send: 0.8, group: 'bowed' })

// the ones that never meet: the low strings, quietly, and the piano, a note
// for each light as it goes out, down the chord, from where it was
hold(basses, S.ifnot[0], 2350, [35])
breath(basses, [[S.ifnot[0], 22], [S.ifnot[0] + 900, 30], [S.fOut, 5]])
hold(celli, S.ifnot[0], 2350, [47])
breath(celli, [[S.ifnot[0], 20], [S.ifnot[0] + 900, 28], [S.fOut, 5]])
;[['piano-fs5', 1, -0.3], ['piano-d5', 1, 0.3], ['piano-as4', SEMI, 0]].forEach(([name, rate, pan], i) => {
  play(REC[name], S.lone[i] + 10, { rate, pan, gain: db(-15 - i), len: 5000, fadeOut: 2500, send: 0.65, group: 'piano' })
})

// the question: the strings rise under it, B with its ninth high, the voices
// from `think`; on `you?` the piano, B minor, low and held, with a soft gong
// and the low tone; then all of it drawn back in to the point the name is
// lit from, the piano's chord and the gong backwards
const Y = S.qWords[5]
hold(celli, S.ask[0], 3500, [47, 54])
breath(celli, [[S.ask[0], 5], [Y, 72], [Y + 800, 46], [S.qOut - 150, 0]])
hold(violas, S.ask[0] + 150, 3350, [59, 66])
breath(violas, [[S.ask[0] + 150, 5], [Y, 70], [Y + 800, 42], [S.qOut - 150, 0]])
hold(violins, S.qWords[2], 3050, [73, 78])
breath(violins, [[S.qWords[2], 5], [Y, 68], [Y + 800, 38], [S.qOut - 150, 0]])
hold(voices, S.qWords[3], 2750, [66, 71])
breath(voices, [[S.qWords[3], 5], [Y, 62], [Y + 900, 34], [S.qOut - 150, 0]])
hold(basses, Y, 1800, [35])
breath(basses, [[Y, 40], [Y + 700, 30], [S.qOut - 150, 0]])
;[['piano-as1', SEMI, db(-11), 0.1], ['piano-as2', SEMI, db(-14), -0.05], ['piano-fs4', 1, db(-18), -0.15], ['piano-d5', 1, db(-20), 0.15]].forEach(([name, rate, gain, pan]) => {
  play(REC[name], Y, { rate, gain, pan, len: 6000, fadeOut: 3500, send: 0.6, group: 'piano' })
})
play(REC['gong-soft'], Y + 10, { rate: GONG, gain: db(-20), hp: 50, lp: 4500, len: 6000, fadeOut: 3000, send: 0.55, group: 'gong' })
low(Y, { gain: db(-21), rise: 60, fall: 1800, len: 4500 })
;[['piano-as2', SEMI, db(-17)], ['piano-fs4', 1, db(-19)], ['piano-d5', 1, db(-21)]].forEach(([name, rate, gain]) => {
  play(REC[name], S.qOut - 1050, { rev: true, rate, gain, len: 1050, fadeIn: 500, fadeOut: 15, send: 0.5, group: 'piano' })
})
play(REC['gong-soft'], S.qOut - 1300, { rev: true, rate: GONG, len: 1300, gain: db(-20), fadeIn: 800, fadeOut: 15, lp: 5500, send: 0.45, group: 'gong' })

// the name, lit from its star a cell at a time: the glass, B, then F sharp,
// then D, on the strings and the voices on B minor with its ninth, a soft
// drum and the low tone under it, and left ringing
const L0 = S.name[0]
;[['B5', 0, 0], ['F#6', 280, -0.18], ['D6', 560, 0.18]].forEach(([n, d, pan]) => {
  const from = L0 + d
  play(REC.glass, from, { rate: GLASS[n], gain: db(-31), pan, fadeIn: d ? 450 : 120, len: MS + 600 - from, fadeOut: 2400, send: 0.8, hp: 300, group: 'glass' })
})
play(REC['bass-drum-soft'], L0, { rate: DRUM, gain: db(-15), lp: 4000, send: 0.5, group: 'drum' })
low(L0, { gain: db(-23), rise: 60, fall: 1800, len: 4000 })
play(REC['gong-soft'], L0 + 10, { rate: GONG, gain: db(-21), hp: 50, lp: 6500, len: 6000, fadeOut: 3000, send: 0.6, group: 'gong' })
hold(basses, L0, MS - L0 + 300, [35])
breath(basses, [[L0, 10], [L0 + 1300, 40], [MS, 8]])
hold(celli, L0, MS - L0 + 300, [47, 54])
breath(celli, [[L0, 10], [L0 + 1300, 50], [MS, 8]])
hold(violas, L0 + 100, MS - L0 + 200, [59, 62])
breath(violas, [[L0 + 100, 8], [L0 + 1400, 48], [MS, 6]])
hold(violins, L0 + 200, MS - L0 + 100, [73, 78])
breath(violins, [[L0 + 200, 6], [L0 + 1500, 40], [MS, 5]])
hold(voices, L0 + 150, MS - L0 + 150, [66, 71, 74])
breath(voices, [[L0 + 150, 5], [L0 + 1500, 52], [MS, 5]])

// ── the orchestra, played ───────────────────────────────────────────────────
// at sixty beats a minute and a thousand ticks a beat, a tick is a ms
const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b }
const chunk = (id, bytes) => [...Buffer.from(id), (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255, ...bytes]
function midiOf(p) {
  const ev = [
    { t: 0, o: 0, d: [0xff, 0x51, 3, 0x0f, 0x42, 0x40] },
    { t: 0, o: 1, d: [0xb0, 0, p.bank] }, { t: 0, o: 1, d: [0xb0, 32, 0] }, { t: 0, o: 1, d: [0xc0, p.program] },
    { t: 0, o: 1, d: [0xb0, 7, 110] }, { t: 0, o: 1, d: [0xb0, 11, 127] }, { t: 0, o: 1, d: [0xb0, 91, 0] }, { t: 0, o: 1, d: [0xb0, 93, 0] },
    { t: 0, o: 1, d: [0xb0, 2, 0] },
  ]
  for (const c of p.cc) ev.push({ t: c.t, o: 2, d: [0xb0, c.num, Math.max(0, Math.min(127, c.value))] })
  for (const n of p.notes) {
    ev.push({ t: n.t, o: 4, d: [0x90, n.key, n.vel] })
    ev.push({ t: n.t + n.len, o: 3, d: [0x80, n.key, 0] })
  }
  ev.sort((a, b) => Math.round(a.t) - Math.round(b.t) || a.o - b.o)
  const bytes = []
  let last = 0
  for (const e of ev) { const t = Math.round(e.t); bytes.push(...vlq(t - last), ...e.d); last = t }
  bytes.push(0, 0xff, 0x2f, 0)
  return Buffer.from([...chunk('MThd', [0, 0, 0, 1, 1000 >> 8, 1000 & 255]), ...chunk('MTrk', bytes)])
}
function readWav(file) {
  const b = readFileSync(file)
  let off = 12
  let fmt = null
  let data = null
  while (off < b.length) {
    const id = b.toString('ascii', off, off + 4)
    const len = b.readUInt32LE(off + 4)
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(off + 8), ch: b.readUInt16LE(off + 10), bits: b.readUInt16LE(off + 22) }
    if (id === 'data') data = b.subarray(off + 8, off + 8 + len)
    off += 8 + len + (len % 2)
  }
  const bps = fmt.bits / 8
  const frames = Math.min(N, data.length / (fmt.ch * bps))
  const L = new Float32Array(N)
  const R = new Float32Array(N)
  for (let i = 0; i < frames; i++) {
    const o = i * fmt.ch * bps
    const get = (k) => (fmt.tag === 3 ? data.readFloatLE(o + k * 4) : data.readInt16LE(o + k * 2) / 32768)
    L[i] = get(0)
    R[i] = get(fmt.ch > 1 ? 1 : 0)
  }
  return { L, R }
}
function writeWav(file, L, R, bits = 32) {
  const n = L.length
  const bps = bits / 8
  const buf = Buffer.alloc(44 + n * 2 * bps)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2 * bps, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(bits === 32 ? 3 : 1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2 * bps, 28); buf.writeUInt16LE(2 * bps, 32); buf.writeUInt16LE(bits, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2 * bps, 40)
  for (let i = 0; i < n; i++) {
    if (bits === 32) { buf.writeFloatLE(L[i], 44 + i * 8); buf.writeFloatLE(R[i], 48 + i * 8) } else {
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4)
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4)
    }
  }
  writeFileSync(file, buf)
}
for (const p of Object.values(PARTS)) {
  if (!p.notes.length || (SOLO && !SOLO.includes(p.name))) continue
  const mid = join(work, `${p.name}.mid`)
  const wav = join(work, `${p.name}.wav`)
  writeFileSync(mid, midiOf(p))
  const r = spawnSync('fluidsynth', ['-ni', '-q', '-R', '0', '-C', '0', '-g', '0.5', '-r', String(SR), '-O', 'float', '-T', 'wav', '-F', wav, SOUNDFONT, mid], { encoding: 'utf8' })
  if (r.status !== 0 || !existsSync(wav)) throw new Error(`fluidsynth ${p.name}: ${r.stderr}`)
  const st = readWav(wav)
  const m = p.mix
  const fl = band(m.hp, m.lp)
  const fr = band(m.hp, m.lp)
  const [pl, pr] = panOf(m.pan)
  for (let i = 0; i < N; i++) {
    let l = fl(st.L[i])
    let r = fr(st.R[i])
    const mid2 = (l + r) / 2
    const side = ((l - r) / 2) * m.width
    l = (mid2 + side) * m.gain * pl
    r = (mid2 - side) * m.gain * pr
    add(i, l, r, m.send, p.name)
  }
}

// ── the hall ────────────────────────────────────────────────────────────────
// an impulse made here: a few early reflections, and then a long tail of
// noise, each band of it dying at its own rate, the highs first as in a
// stone hall, five and a half seconds for the lowest; each side its own;
// convolved by ffmpeg
{
  const len = sec(6)
  const IL = new Float32Array(len)
  const IR = new Float32Array(len)
  const pre = sec(0.024)
  for (let k = 0; k < 14; k++) {
    const t = 0.004 + k * 0.0062 + r01(k * 7.1 + 3) * 0.004
    const g = 0.5 * Math.exp(-t / 0.05) * (0.6 + 0.4 * r01(k * 3.3 + 1))
    const p = r01(k * 5.9 + 2) * 2 - 1
    IL[pre + sec(t)] += (g * (1 - p)) / 2
    IR[pre + sec(t) + 5] += (g * (1 + p)) / 2
  }
  for (const [fc, rt] of [[90, 5.5], [180, 5.2], [360, 4.7], [720, 4.1], [1440, 3.4], [2880, 2.6], [5760, 1.8], [11000, 1.1]]) {
    const bl = biquad('bp', fc, 1.1)
    const br = biquad('bp', fc, 1.1)
    const tau = rt / 6.91
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / SR
      const env = Math.exp(-t / tau) * Math.min(1, t / 0.08) * 0.3
      IL[i] += bl(rnd()) * env
      IR[i] += br(rnd()) * env
    }
  }
  let e2 = 0
  for (let i = 0; i < len; i++) e2 += (IL[i] * IL[i] + IR[i] * IR[i]) / 2
  const g = 1 / Math.sqrt(e2)
  for (let i = 0; i < len; i++) { IL[i] *= g; IR[i] *= g }
  const send = join(work, 'send.wav')
  const imp = join(work, 'impulse.wav')
  const back = join(work, 'room.wav')
  writeWav(send, WET.L, WET.R)
  writeWav(imp, IL, IR)
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', send, '-i', imp, '-filter_complex', '[0][1]afir=dry=0:wet=1:gtype=-1:irgain=1', '-c:a', 'pcm_f32le', back], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`afir: ${r.stderr}`)
  const room = readWav(back)
  for (let i = 0; i < N; i++) { DRY.L[i] += room.L[i]; DRY.R[i] += room.R[i] }
}
if (LEVELS) {
  const dbOf = (e, j) => (e ? (10 * Math.log10(e / (at(SCENES[j][2]) - at(SCENES[j][1])))).toFixed(1) : '  -  ')
  console.log('part      ' + SCENES.map(([s]) => s.padStart(7)).join(''))
  for (const [g, m] of Object.entries(METER)) console.log(g.padEnd(10) + [...m].map((e, j) => dbOf(e, j).padStart(7)).join(''))
}

// ── the master ──────────────────────────────────────────────────────────────
// nothing pressed: below the deepest note, nothing, and a little more air
// over it all (the SoundFont's strings are dark); the whole set so its
// loudest moment, the fall back to the wall, is full, with a ceiling two
// decibels under full scale, which only its loudest instants touch, at the
// wall and at the lens; the last seconds let go of; and a whisper of noise
// under the last bit, as a 16 bit file should have
const end = at(MS)
const L = DRY.L.subarray(0, end)
const R = DRY.R.subarray(0, end)
{
  const hl = biquad('hp', 28)
  const hr = biquad('hp', 28)
  const al = biquad('shelf', 6000, 0.707, 2.5)
  const ar = biquad('shelf', 6000, 0.707, 2.5)
  for (let i = 0; i < end; i++) { L[i] = al(hl(L[i])); R[i] = ar(hr(R[i])) }
}
// the loudest fifth of a second, as a level, brought to -11 dB
{
  const w = sec(0.2)
  let top = 0
  for (let i = 0; i + w <= end; i += w / 4) {
    let e = 0
    for (let j = i; j < i + w; j++) e += (L[j] * L[j] + R[j] * R[j]) / 2
    top = Math.max(top, Math.sqrt(e / w))
  }
  const g = process.env.GAIN ? db(Number(process.env.GAIN)) : db(-11) / top
  if (LEVELS) console.log(`gain: ${(20 * Math.log10(g)).toFixed(1)} dB`)
  for (let i = 0; i < end; i++) { L[i] *= g; R[i] *= g }
}
// the ceiling: the gain each sample needs to stay under it, the least of the
// next four milliseconds' come in over them, and let go over a tenth of a
// second and a half
{
  const ceil = db(-2)
  const ahead = sec(0.004)
  const need = new Float32Array(end)
  for (let i = 0; i < end; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = p > ceil ? ceil / p : 1 }
  const g = new Float32Array(end).fill(1)
  for (let i = 0; i < end; i++) {
    if (need[i] >= 1) continue
    for (let j = Math.max(0, i - ahead); j <= i; j++) g[j] = Math.min(g[j], need[i] + (1 - need[i]) * ((i - j) / ahead))
  }
  const rel = Math.exp(-1 / sec(0.15))
  let cur = 1
  let most = 1
  for (let i = 0; i < end; i++) {
    cur = Math.min(g[i], 1 - (1 - cur) * rel)
    most = Math.min(most, cur)
    L[i] *= cur; R[i] *= cur
  }
  if (process.env.LEVELS) console.log(`ceiling: at most ${(20 * Math.log10(most)).toFixed(1)} dB`)
}
for (let i = 0; i < end; i++) {
  const fade = Math.min(1, i / sec(0.01), (end - i) / sec(1.6)) ** 1.5
  L[i] = L[i] * fade + (rnd() + rnd()) * 0.5 / 32768
  R[i] = R[i] * fade + (rnd() + rnd()) * 0.5 / 32768
}
mkdirSync(dirname(out), { recursive: true })
writeWav(out, L, R, 16)
rmSync(work, { recursive: true, force: true })
console.log(out.replace(`${root}/`, ''), `${(MS / 1000).toFixed(2)}s`, 'the sounds alone')

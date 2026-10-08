#!/usr/bin/env node
// studio-score.mjs: the reel's song, made from the reel's own clock.
//
// A song, played by real instruments: the parts are written here as notes
// against app/src/studio/parts/reel-time.js, so every word on the frame
// lands on the beat it is sung on, and played by FluidSynth from the
// MuseScore General SoundFont (MIT; its grand piano public domain, its
// strings the VSCO 2 Community Edition's, CC0), one stem an instrument. The
// stems are mixed here: humanised as players are (a few milliseconds early
// or late, never two notes alike), the band ducking under the kick, a room
// convolved from an impulse made here (by ffmpeg's afir), a dotted eighth
// delay on the hook, tape's soft saturation, and ffmpeg's loudnorm in two
// passes to -14 LUFS with a true peak a decibel and a half under full scale.
// The phones' keys, the board's cards and the lights are synthesised, as
// foley, on the frames they happen.
//
// The hook is the film's question, `do they still think a-bout you?`: a
// climb to the high note and a fall that does not come home. It is heard
// first on the celesta as the hall rises, sung by the band when the two of
// them are held, half remembered on the piano when the lights go out, and
// last with its words; the name comes in on the chord it never reached.
//
// 96 beats a minute in D major and its B minor:
//   intro      0      Bm  G           the letter: a Rhodes, the keys
//   verse      5      D   A           the hall: brushes, bass, guitar; the hook on celesta
//   verse      10     Bm  G  Asus     sent; kai, the band further off; a two beat turn
//   build      16.25  Em G Asus A     the board; a pulse; at nine the band stops
//   chorus     21.25  D   A           held: the drop, the hook sung, it's mutual
//   breakdown  26.25  Bm              the lights go out; the hook on the piano, alone
//   question   28.75  G   Asus        the hook with its words, left open
//   home       31.25  D               the name
//
//   node scripts/studio-score.mjs [out.wav]      48 kHz, 16 bit, stereo
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { MS, BEAT, A, B, S, SAY, typedA, typedB, STORY_TIMES, reelAt, wakeOf } from '../app/src/studio/parts/reel-time.js'
import { wallOf } from '../app/src/studio/parts/wall-gl.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/celestual-reel.wav')
const SOUNDFONT = process.env.SOUNDFONT || '/usr/share/sounds/sf3/MuseScore_General_Full.sf3'
if (!existsSync(SOUNDFONT)) throw new Error(`studio-score: no SoundFont at ${SOUNDFONT} (apt install musescore-general-soundfont fluidsynth)`)

const SR = 48000
const TAIL = 2.5
const N = Math.round((MS / 1000 + TAIL) * SR)
const TAU = Math.PI * 2
const sec = (s) => Math.round(s * SR)
const at = (ms) => Math.round((ms / 1000) * SR)
const hz = (m) => 440 * 2 ** ((m - 69) / 12)
const bt = (beats) => beats * BEAT
const work = mkdtempSync(join(tmpdir(), 'celestual-score-'))

// a seeded random, so the song is the same song every time it is made
let seed = 0x2f6b9e1d
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1 }
const gauss = () => (rnd() + rnd() + rnd()) / 1.7

// ── the parts ───────────────────────────────────────────────────────────────
// Every part is a list of notes: when (ms), how long (ms), which key, how
// hard. A player is never exactly on the grid: `feel` moves each note a few
// milliseconds and its velocity a few steps, the same way every time.
const PARTS = {}
function part(name, program, { drums = false } = {}) {
  PARTS[name] = { program, drums, notes: [], cc: [] }
  return PARTS[name]
}
function play(p, ms, len, key, vel, { feel = 7, vfeel = 6 } = {}) {
  const t = ms + gauss() * feel
  p.notes.push({ t: Math.max(0, t), len: Math.max(30, len), key, vel: Math.max(1, Math.min(127, Math.round(vel + gauss() * vfeel))) })
}
const chord = (p, ms, len, keys, vel, { roll = 0, ...o } = {}) => keys.forEach((k, i) => play(p, ms + i * roll, len - i * roll, k, vel - i * 2, o))
// a controller over time: [ms, value]
const ctl = (p, ms, num, value) => p.cc.push({ t: ms, num, value: Math.round(value) })
const swell = (p, from, to, v0, v1, num = 11) => { for (let k = 0; k <= 24; k++) ctl(p, from + ((to - from) * k) / 24, num, v0 + ((v1 - v0) * k) / 24) }

// the harmony, a chord a bar or half bar, voiced for the Rhodes (the root
// is the bass's) and for the strings above it
const V = {
  Bm: { rh: [50, 54, 57, 61], st: [59, 62, 66, 71], root: 35 },
  G: { rh: [50, 54, 57, 59], st: [59, 62, 66, 67], root: 31 },
  D: { rh: [50, 54, 57, 64], st: [57, 62, 66, 69], root: 38 },
  A: { rh: [49, 52, 57, 59], st: [57, 61, 64, 69], root: 33 },
  Asus: { rh: [50, 52, 57, 59], st: [57, 62, 64, 69], root: 33 },
  Em: { rh: [50, 54, 55, 59], st: [59, 62, 66, 67], root: 40 },
}
// [beat, chord, beats]; the bar at 24 is two beats long, a turn after
// kai's send before the build
const HARMONY = [
  [0, 'Bm', 4], [4, 'G', 4], [8, 'D', 4], [12, 'A', 4], [16, 'Bm', 4], [20, 'G', 4], [24, 'Asus', 2],
  [26, 'Em', 2], [28, 'G', 2], [30, 'Asus', 2], [32, 'A', 2],
  [34, 'D', 4], [38, 'A', 4], [42, 'Bm', 4], [46, 'G', 2], [48, 'Asus', 2], [50, 'D', 6],
]

// the hook: do they still think a-bout you? [beats from `still`, key, beats]
const HOOK = [[-1, 69, 0.5], [-0.5, 71, 0.5], [0, 74, 1], [1, 78, 1.5], [2.5, 76, 0.5], [3, 74, 1], [4, 76, 2]]
const hookAt = (still, { last = 76, lastLen = 2 } = {}) => HOOK.map(([b, k, l], i) => [bt(still + b), i === HOOK.length - 1 ? last : k, bt(i === HOOK.length - 1 ? lastLen : l)])

const rhodes = part('rhodes', 4)
const piano = part('piano', 0)
const keys = part('keys', 0)
const celesta = part('celesta', 8)
const box = part('box', 10)
const oohs = part('oohs', 53)
const guitar = part('guitar', 24)
const strings = part('strings', 49)
const bass = part('bass', 33)
const pad = part('pad', 89)
const brush = part('brush', 40, { drums: true })
const kit = part('kit', 8, { drums: true })

// ── 0 to 5: the letter. A Rhodes, close and quiet, and the piano answering
// the words as they are typed: the high note on `i loved you.`, falling, a
// breath, and home as the last word lands
chord(rhodes, 0, bt(4.2), V.Bm.rh, 44, { roll: 28 })
chord(rhodes, bt(4), bt(4.2), V.G.rh, 42, { roll: 28 })
chord(pad, 0, bt(8), [47, 54, 59], 30)
swell(pad, 0, bt(2), 30, 90)
const tA = typedA()
const iLoved = A.text.indexOf('i loved')
const iD = iLoved + 'i love'.length
const iMaybe = A.text.indexOf('maybe')
play(piano, tA[iLoved] - 15, bt(1.6), 78, 62, { feel: 0 })
play(piano, tA[iD] - 10, bt(1), 76, 56, { feel: 0 })
play(piano, tA[iLoved + 11] + 10, bt(1.2), 74, 52, { feel: 0 })
play(piano, tA[iMaybe] - 15, bt(1.5), 73, 54, { feel: 0 })
play(piano, tA[tA.length - 1], bt(3), 74, 58, { feel: 0 })
chord(keys, bt(4), bt(3), [43, 50], 40, { roll: 40 })

// ── 5 to 16.25: the verse. Brushes and a bass under the hall; a guitar picking
// the chords; the hook on the celesta and the music box as the camera
// climbs, its first notes under `never told.`
for (const [b0, name, len] of HARMONY) {
  if (b0 < 8 || b0 >= 26) continue
  const v = V[name]
  const soft = b0 >= 20 ? 0.75 : 1
  // the Rhodes: the chord on one, again on the and of three
  chord(rhodes, bt(b0), bt(Math.min(2.4, len)), v.rh, 46 * soft, { roll: 18 })
  if (len === 4) chord(rhodes, bt(b0 + 2.5), bt(1.4), v.rh, 38 * soft, { roll: 14 })
  // the bass: one, the and of two, three, as a hand plays it
  if (b0 < 20) {
    play(bass, bt(b0), bt(1.4), v.root, 78)
    play(bass, bt(b0 + 1.5), bt(0.45), v.root + 12, 58)
    play(bass, bt(b0 + 2), bt(1.8), v.root, 70)
  } else {
    play(bass, bt(b0), bt(len - 0.2), v.root, 60)
  }
  // the guitar: the chord picked in eighths, up and back
  const pick = [v.root + 12, v.rh[1] + 12, v.rh[2] + 12, v.rh[3] + 12, v.rh[2] + 12, v.rh[1] + 12, v.rh[2] + 12, v.rh[3] + 12]
  pick.slice(0, len * 2).forEach((k, i) => play(guitar, bt(b0 + i * 0.5), bt(0.9), k, (i % 2 ? 46 : 56) * soft, { feel: 9 }))
}
hookAt(11).forEach(([t, k, l], i) => {
  play(celesta, t, l, k + 12, 92 - i * 2)
  play(box, t + 8, l, k + 12, 80 - i * 2)
})

// ── 16.25 to 21.25: the build. The board turns over a pulse that tightens: the
// piano on the dominant in eighths, the strings swelling, the snare closing
// in; at nine the band stops dead, and the two of them run in over a run up
// the piano that is the hook's first two notes
chord(rhodes, bt(26), bt(2), V.Em.rh, 42, { roll: 18 })
chord(rhodes, bt(28), bt(2), V.G.rh, 44, { roll: 18 })
chord(rhodes, bt(30), bt(2), V.Asus.rh, 46, { roll: 18 })
for (const [b0, name, len] of HARMONY) {
  if (b0 < 26 || b0 >= 32) continue
  play(bass, bt(b0), bt(len - 0.1), V[name].root, 66)
  chord(strings, bt(b0), bt(len), V[name].st, 82)
}
swell(strings, bt(26), bt(31.8), 50, 120)
for (let k = 0; k < 8; k++) play(keys, bt(28 + k * 0.5), bt(0.45), k < 4 ? 57 : 69, 44 + k * 5, { feel: 4 })
// the run, as they run: A major up the keyboard, a sixteenth a note
;[57, 61, 64, 69, 73, 76, 81].forEach((k, i) => play(keys, S.run + i * 95, bt(1), k, 56 + i * 6, { feel: 3 }))
// the hook's pickup under the last steps: `do they`
hookAt(34).slice(0, 2).forEach(([t, k, l]) => { play(piano, t, l, k, 88); play(oohs, t, l, k, 72) })

// ── 21.25 to 26.25: the chorus. The drop on the bar they are held: the hook sung
// (piano, voices, the celesta an octave over), the strings, the bass in
// eighths, the full kit; `it's mutual.` on the third beat
hookAt(34).slice(2).forEach(([t, k, l], i) => {
  play(piano, t, l, k, 100 - i * 2)
  play(keys, t, l, k - 12, 60)
  play(oohs, t, l + 80, k, 84)
  play(celesta, t, l, k + 12, 66)
})
// and its echo, the celesta alone: `think a-bout`
;[[40, 78, 0.5], [40.5, 76, 0.5], [41, 74, 1]].forEach(([b, k, l]) => play(celesta, bt(b), bt(l), k + 12, 76))
for (const [b0, name] of [[34, 'D'], [38, 'A']]) {
  const v = V[name]
  chord(rhodes, bt(b0), bt(4), v.rh, 50, { roll: 10 })
  chord(strings, bt(b0), bt(4), v.st, 74)
  chord(strings, bt(b0), bt(4), [v.st[0] - 12], 66)
  // the bass: eighths on the root, the octave on the and of four
  for (let e = 0; e < 8; e++) play(bass, bt(b0 + e * 0.5), bt(0.42), e === 7 ? v.root + 12 : v.root, e % 2 ? 62 : 82, { feel: 4 })
  const pick = [v.root + 24, v.rh[2] + 12, v.rh[3] + 12, v.rh[1] + 24]
  for (let e = 0; e < 8; e++) play(guitar, bt(b0 + e * 0.5), bt(0.8), pick[e % 4], e % 2 ? 48 : 58, { feel: 8 })
}
ctl(strings, bt(34), 11, 110)

// ── 26.25 to 28.75: the lights that never meet go out. The band goes; the pad
// and the piano are left, the answer's last notes on the minor
chord(pad, bt(42), bt(4.2), [47, 54, 59, 62], 46)
ctl(pad, bt(42), 11, 100)
chord(strings, bt(42), bt(4), V.Bm.st, 50)
ctl(strings, bt(42), 11, 70)
play(bass, bt(42), bt(3.6), 35, 46)
// the hook's fall, in the minor, slower: `think a-bout you`
;[[42, 78, 1.5], [43.5, 76, 0.5], [44, 74, 1], [45, 71, 1]].forEach(([b, k, l]) => play(piano, bt(b), bt(l) + 100, k, 74))

// ── 28.75 to 31.25: the question. The hook with its words, on the piano alone,
// each note on the frame its word comes; it stops a step short of home
chord(pad, bt(46), bt(2.2), [43, 50, 55, 59], 56)
chord(pad, bt(48), bt(2.4), [45, 52, 57, 62], 58)
chord(rhodes, bt(46), bt(4), [43, 50, 59], 34, { roll: 40 })
const Q = S.qWords
;[[Q[0], 69], [Q[1], 71], [Q[2], 74], [Q[3], 78], [Q[4], 76], [Q[4] + bt(0.5), 74], [Q[5], 76]].forEach(([t, k], i, all) => {
  const next = all[i + 1] ? all[i + 1][0] : bt(50)
  play(piano, t, Math.max(bt(0.5), next - t + 120), k, 84, { feel: 0 })
})

// ── 31.25 to 35: home. The chord it did not reach, the whole of it: the
// name lit out of the last light, and the hook's last note at last on D
chord(keys, bt(50), bt(6), [26, 38, 50, 57, 62, 64, 66, 69, 74], 76, { roll: 55 })
chord(rhodes, bt(50), bt(6), V.D.rh, 44, { roll: 30 })
chord(strings, bt(50), bt(6), V.D.st, 66)
ctl(strings, bt(50), 11, 90)
chord(pad, bt(50), bt(6), [50, 57, 62, 66], 54)
play(bass, bt(50), bt(5.5), 38, 64)
;[[50.5, 81], [51.5, 78], [52, 76], [52.5, 74], [54, 74]].forEach(([b, k]) => play(celesta, bt(b), bt(1.5), k + 12, 70))

// ── the drums ──
// brushes in the verse, softer for kai; a room kit for the build and the
// chorus; nothing after the drop's two bars but a kick under home
for (let bar = 2; bar < 6; bar++) {
  const b0 = bar * 4
  const soft = bar >= 5 ? 0.7 : 1
  play(brush, bt(b0), bt(0.3), 36, 70 * soft)
  play(brush, bt(b0 + 2.5), bt(0.3), 36, 52 * soft)
  if (bar < 5) {
    play(brush, bt(b0 + 1), bt(0.3), 38, 58)
    play(brush, bt(b0 + 3), bt(0.3), 38, 62)
  }
  // the swirl and the shaker in sixteenths, the late ones a little late
  for (let s = 0; s < 16; s++) {
    const swing = s % 2 ? bt(0.04) : 0
    play(brush, bt(b0 + s * 0.25) + swing, bt(0.2), 70, (s % 4 === 0 ? 46 : s % 2 ? 26 : 36) * soft, { feel: 5 })
  }
}
// the turn after kai's send: the kick and the shaker, two beats
play(brush, bt(24), bt(0.3), 36, 50)
for (let s = 0; s < 8; s++) play(brush, bt(24 + s * 0.25) + (s % 2 ? bt(0.04) : 0), bt(0.2), 70, s % 2 ? 22 : 32, { feel: 5 })
// the build: a side stick, then the snare closing in, and the stop
for (let b = 26; b < 32; b++) {
  const up = (b - 26) / 6
  play(kit, bt(b), bt(0.3), 36, (b % 2 ? 66 : 80) + up * 14)
  if (b % 2) play(kit, bt(b), bt(0.3), 37, 60 + up * 16)
  for (let s = 0; s < 4; s++) play(kit, bt(b + s * 0.25) + (s % 2 ? bt(0.04) : 0), bt(0.2), 42, (s % 2 ? 36 : 50) + up * 18, { feel: 4 })
}
for (let k = 0; k < 8; k++) play(kit, bt(30 + k * 0.25), bt(0.2), 38, 50 + k * 6, { feel: 3 })
for (let k = 0; k < 8; k++) play(kit, bt(33 + k * 0.125), bt(0.15), 38, 48 + k * 9, { feel: 2 })
// the chorus: kick, snare and clap on two and four, the hats in sixteenths
for (const b0 of [34, 38]) {
  for (const k of [0, 1.75, 2.5]) play(kit, bt(b0 + k), bt(0.3), 36, k ? 78 : 96, { feel: 3 })
  for (const k of [1, 3]) { play(kit, bt(b0 + k), bt(0.3), 38, 88, { feel: 3 }); play(kit, bt(b0 + k) + 6, bt(0.3), 39, 64, { feel: 3 }) }
  for (let s = 0; s < 16; s++) play(kit, bt(b0 + s * 0.25) + (s % 2 ? bt(0.045) : 0), bt(0.2), s === 14 ? 46 : 42, s % 4 === 0 ? 62 : s % 2 ? 34 : 48, { feel: 4 })
}
play(kit, bt(34), bt(2), 49, 92)
play(kit, bt(38), bt(2), 57, 60)
// a fill into the breakdown, and the floor going out
;[[41, 47], [41.25, 45], [41.5, 43], [41.75, 41]].forEach(([b, k], i) => play(kit, bt(b), bt(0.3), k, 70 + i * 6, { feel: 3 }))
play(kit, bt(50), bt(0.3), 36, 70)
play(kit, bt(50), bt(3), 49, 46)

// ── MIDI, and the SoundFont ─────────────────────────────────────────────────
const PPQ = 960
const TICK = BEAT / PPQ
const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b }
function chunk(id, bytes) { return [...Buffer.from(id), (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255, ...bytes] }
function midiOf(p) {
  const ch = p.drums ? 9 : 0
  const ev = []
  const tempo = Math.round(BEAT * 1000)
  ev.push({ t: 0, o: 0, d: [0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] })
  ev.push({ t: 0, o: 1, d: [0xb0 | ch, 0, 0] }, { t: 0, o: 1, d: [0xc0 | ch, p.program] })
  ev.push({ t: 0, o: 1, d: [0xb0 | ch, 7, 110] }, { t: 0, o: 1, d: [0xb0 | ch, 91, 0] }, { t: 0, o: 1, d: [0xb0 | ch, 93, 0] })
  if (!p.cc.some((c) => c.num === 11)) ev.push({ t: 0, o: 1, d: [0xb0 | ch, 11, 100] })
  for (const c of p.cc) ev.push({ t: c.t / TICK, o: 2, d: [0xb0 | ch, c.num, Math.max(0, Math.min(127, c.value))] })
  for (const n of p.notes) {
    ev.push({ t: n.t / TICK, o: 4, d: [0x90 | ch, n.key, n.vel] })
    ev.push({ t: (n.t + n.len) / TICK, o: 3, d: [0x80 | ch, n.key, 0] })
  }
  ev.sort((a, b) => Math.round(a.t) - Math.round(b.t) || a.o - b.o)
  const bytes = []
  let last = 0
  for (const e of ev) { const t = Math.round(e.t); bytes.push(...vlq(t - last), ...e.d); last = t }
  bytes.push(0, 0xff, 0x2f, 0)
  return Buffer.from([...chunk('MThd', [0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255]), ...chunk('MTrk', bytes)])
}
// a WAV of 32 bit floats, read and written
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
  const frames = data.length / (fmt.ch * fmt.bits / 8)
  const L = new Float32Array(N)
  const R = new Float32Array(N)
  for (let i = 0; i < Math.min(frames, N); i++) {
    const o = i * fmt.ch * fmt.bits / 8
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
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4)
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4)
    }
  }
  writeFileSync(file, buf)
}
// each part, played alone, dry: the room and the mix are ours
const STEMS = {}
for (const [name, p] of Object.entries(PARTS)) {
  if (!p.notes.length) continue
  const mid = join(work, `${name}.mid`)
  const wav = join(work, `${name}.wav`)
  writeFileSync(mid, midiOf(p))
  const r = spawnSync('fluidsynth', ['-ni', '-q', '-R', '0', '-C', '0', '-g', '0.5', '-r', String(SR), '-O', 'float', '-T', 'wav', '-F', wav, SOUNDFONT, mid], { encoding: 'utf8' })
  if (r.status !== 0 || !existsSync(wav)) throw new Error(`fluidsynth ${name}: ${r.stderr}`)
  STEMS[name] = readWav(wav)
}

// ── the foley: synthesised, on its frames ───────────────────────────────────
const FX = { L: new Float32Array(N), R: new Float32Array(N) }
const FXV = { L: new Float32Array(N), R: new Float32Array(N) }
function lay(ms, len, fn, { gain = 1, pan = 0, verb = 0 } = {}) {
  const s0 = at(ms)
  const a = ((pan + 1) * Math.PI) / 4
  for (let i = 0; i < len; i++) {
    const k = s0 + i
    if (k < 0) continue
    if (k >= N) break
    const v = fn(i)
    FX.L[k] += v * Math.cos(a) * gain; FX.R[k] += v * Math.sin(a) * gain
    if (verb) { FXV.L[k] += v * Math.cos(a) * gain * verb; FXV.R[k] += v * Math.sin(a) * gain * verb }
  }
}
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
function biquad(type, fc, q = 0.707, gainDb = 0) {
  const w = (TAU * fc) / SR
  const al = Math.sin(w) / (2 * q)
  const c = Math.cos(w)
  const A = 10 ** (gainDb / 40)
  let b0; let b1; let b2; let a0; let a1; let a2
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al }
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al }
  if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A }
  if (type === 'lowshelf' || type === 'highshelf') {
    const sq = 2 * Math.sqrt(A) * al
    const s = type === 'lowshelf' ? -1 : 1
    b0 = A * ((A + 1) - s * (A - 1) * c + sq); b1 = s * 2 * A * ((A - 1) - s * (A + 1) * c); b2 = A * ((A + 1) - s * (A - 1) * c - sq)
    a0 = (A + 1) + s * (A - 1) * c + sq; a1 = -s * 2 * ((A - 1) + s * (A + 1) * c); a2 = (A + 1) + s * (A - 1) * c - sq
  }
  const k = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  return (x) => { const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y }
}
// a key on an old phone: a tick of noise through a resonance, and the
// plastic's body under it, close and quiet
function key(ms, { pitch = 2200, body = 420, gain = 0.06, pan = 0 } = {}) {
  let y1 = 0; let y2 = 0
  const r = 0.985
  const w = (TAU * pitch) / SR
  const c1 = 2 * r * Math.cos(w)
  const c2 = -r * r
  lay(ms, sec(0.05), (i) => {
    const x = i < sec(0.004) ? rnd() * (1 - i / sec(0.004)) : 0
    const y = x + c1 * y1 + c2 * y2
    y2 = y1; y1 = y
    const thump = Math.sin((TAU * body * i) / SR) * Math.exp(-i / sec(0.008)) * 0.6
    return (y * 0.09 + thump) * Math.exp(-i / sec(0.012))
  }, { gain, pan, verb: 0.15 })
}
// a flap: the card's slap, the board's body under it
function flap(ms, { gain = 0.07, pan = 0 } = {}) {
  const hp = biquad('hp', 1800, 1.2)
  lay(ms, sec(0.07), (i) => {
    const t = i / SR
    return hp(rnd()) * Math.exp(-t / 0.006) * 0.8 + Math.sin(TAU * 190 * t) * Math.exp(-t / 0.014) * 0.7
  }, { gain, pan, verb: 0.2 })
}
// a glint: a little bell, its partials where a struck bar's are
function glint(ms, m, { gain = 0.012, decay = 0.8, pan = 0, verb = 0.8 } = {}) {
  const f = hz(m)
  const L = sec(decay * 3)
  lay(ms, L, (i) => {
    const t = i / SR
    const a = Math.min(1, i / sec(0.002), (L - i) / sec(0.15))
    return a * (Math.sin(TAU * f * t) * Math.exp(-t / decay) + 0.22 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (decay * 0.35)))
  }, { gain, pan, verb })
}
// air: noise through a band that moves, swelling and going
function air(ms, len, { gain = 0.04, from = 400, to = 9000, shape = 'swell', pan = 0, verb = 0.5, q = 2 } = {}) {
  const lp = lowpass(q)
  const L = sec(len / 1000)
  lay(ms, L, (i) => {
    const k = i / L
    const e = shape === 'swell' ? Math.sin(Math.PI * k) ** 1.5 : shape === 'rise' ? k ** 2.6 * Math.min(1, (1 - k) / 0.04) : (1 - k) ** 1.6
    return lp(rnd(), from * (to / from) ** k) * e
  }, { gain, pan, verb })
}
// a phone waking: the inverter's buzz, faint
function wakeBuzz(ms, { gain = 0.03, pan = 0 } = {}) {
  lay(ms, sec(0.2), (i) => {
    const t = i / SR
    return (Math.sin(TAU * 118 * t) * 0.6 + Math.sin(TAU * 236 * t) * 0.3 + rnd() * 0.1) * Math.exp(-t / 0.05)
  }, { gain, pan })
}

// the keys of the two phones, the words as they are typed
typedA().forEach((ms, i) => {
  const sp = A.text[i] === ' '
  key(ms, { pitch: sp ? 1280 : 1900 + ((i * 397) % 900), body: sp ? 250 : 380 + ((i * 53) % 120), gain: sp ? 0.05 : 0.065, pan: -0.1 })
})
typedB().forEach((ms, i) => {
  const sp = B.text[i] === ' '
  key(ms, { pitch: sp ? 1250 : 2100 + ((i * 271) % 800), body: sp ? 240 : 400 + ((i * 41) % 110), gain: sp ? 0.04 : 0.05, pan: 0.18 })
})
key(S.press, { pitch: 1500, body: 300, gain: 0.08, pan: -0.05 })
key(S.kSend, { pitch: 1500, body: 300, gain: 0.07, pan: 0.15 })
wakeBuzz(S.kWake, { pan: 0.15 })
// the hall's letters near the lens, each a glint as the light reaches it
const r01 = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
const PENTA = [74, 76, 78, 81, 83, 86, 88, 90, 93]
wallOf().forEach((l, n) => {
  if (l.home || l.dist > 10 || r01(n + 5) > 0.2) return
  glint(wakeOf(l.dist, l.seed) + 70, PENTA[Math.floor(r01(n + 9) * PENTA.length)], { gain: 0.012 / (1 + l.dist / 4), decay: 0.6, pan: Math.max(-0.85, Math.min(0.85, l.i / 7)) })
})
air(S.wake, 5200, { gain: 0.035, from: 300, to: 5000 })
// sent: the screen's two notes, and the light going up, a glint at a time
glint(S.press + 410, 81, { gain: 0.022, decay: 1.2, verb: 0.6 })
glint(S.press + 530, 86, { gain: 0.02, decay: 1.4, verb: 0.6, pan: 0.1 })
;[74, 78, 81, 86, 90].forEach((m, i) => glint(S.rise + i * 156, m, { gain: 0.012, decay: 0.9, pan: i * 0.05 }))
glint(S.kSend + 410, 78, { gain: 0.02, decay: 1.2, pan: 0.15 })
;[71, 74, 78, 83].forEach((m, i) => glint(S.kRise + i * 156, m, { gain: 0.011, decay: 0.9, pan: 0.2 - i * 0.06 }))
// the board
S.days.forEach((d) => [0, 24, 48].forEach((o, c) => flap(d + o, { gain: 0.06, pan: (c - 1) * 0.3 })))
for (let i = 0; i < 7; i++) if (i !== 4) flap(S.time + i * 40, { gain: 0.05, pan: (i / 3 - 1) * 0.4 })
// the two lights touching, in the quiet before nine: each one's highest
// note from its going up, struck together, as two glasses touch
glint(S.touch[2] - 6, 90, { gain: 0.011, decay: 1.2, pan: -0.08, verb: 0.7 })
glint(S.touch[2] + 4, 83, { gain: 0.011, decay: 1.2, pan: 0.08, verb: 0.7 })
// at nine: the breath the band takes, a swell drawn in backwards
air(S.meet - 200, bt(2) + 200, { gain: 0.05, from: 600, to: 11000, shape: 'rise', q: 1.2 })
// `it's mutual.` typed in the glass's cells
const ST = STORY_TIMES
const TYPE_MS = (ST.said - ST.say) / [...SAY].length
;[...SAY].forEach((c, k) => { if (c !== ' ') key(reelAt(ST.say + TYPE_MS * (k + 1)), { pitch: 3000, body: 520, gain: 0.028, pan: -0.1 + k * 0.02 }) })
// the lights that never met, going out, each on its frame and from its
// place: a glint as it dims, a fainter one as it catches, and gone
;[[S.lone[0], 88, -0.55], [S.lone[1], 83, 0.45], [S.lone[2], 78, -0.15]].forEach(([ms, m, pan]) => {
  glint(ms, m, { gain: 0.011, decay: 1.1, pan })
  glint(ms + 95, m - 12, { gain: 0.005, decay: 0.7, pan })
})
// the name: a glint for every cell coming on, a few of them
for (let i = 0; i < 40; i++) {
  const d = (i / 40) ** 0.8 * (S.lock[1] - S.lock[0]) + r01(i + 70) * 30
  glint(S.lock[0] + d, 86 + Math.floor(r01(i + 11) * 3) * 2, { gain: 0.004 + 0.004 * (1 - i / 40), decay: 0.35, pan: (r01(i + 90) - 0.5) * 1.2, verb: 0.6 })
}
// the address, typed
for (let k = 0; k < 'celestual.us'.length; k++) key(S.url + 20 + k * 38, { pitch: 2600 + ((k * 211) % 700), body: 480, gain: 0.035, pan: 0.05 })

// ── the mix ─────────────────────────────────────────────────────────────────
// each stem: its level, where it sits, what is taken off it, how much of it
// goes to the room and to the delay, and whether it breathes with the kick
const MIX = {
  piano: { gain: 1.7, pan: 0.05, width: 0.6, hp: 70, presence: [2.5, 3200], verb: 0.3, delay: 0.1 },
  keys: { gain: 1.0, pan: -0.05, width: 0.7, hp: 60, verb: 0.3, duck: 0.2 },
  rhodes: { gain: 1.1, pan: -0.15, width: 0.7, hp: 90, lp: 7000, shelf: [-2, 6000], verb: 0.22, duck: 0.35 },
  celesta: { gain: 2.0, pan: 0.2, width: 0.5, hp: 300, verb: 0.45, delay: 0.25 },
  box: { gain: 1.5, pan: -0.25, width: 0.5, hp: 300, verb: 0.5, delay: 0.25 },
  oohs: { gain: 1.4, pan: 0, width: 0.9, hp: 160, lp: 9000, presence: [2, 2500], verb: 0.4, delay: 0.12, duck: 0.15 },
  guitar: { gain: 1.25, pan: 0.3, width: 0.5, hp: 120, presence: [2, 4000], verb: 0.25, duck: 0.3 },
  strings: { gain: 0.5, pan: 0, width: 1, hp: 120, verb: 0.45, duck: 0.4 },
  bass: { gain: 0.95, pan: 0, width: 0, hp: 35, lp: 2400, drive: 1.5, verb: 0, duck: 0.55 },
  pad: { gain: 0.9, pan: 0, width: 1, hp: 140, lp: 6000, verb: 0.5, duck: 0.4 },
  brush: { gain: 0.9, pan: 0, width: 0.6, hp: 40, drive: 1.3, verb: 0.12 },
  kit: { gain: 0.9, pan: 0, width: 0.6, hp: 35, drive: 1.6, verb: 0.1 },
}
// the kick's breath: every kick in the chorus and the build, as an envelope
const duck = new Float32Array(N).fill(1)
for (const n of [...PARTS.kit.notes, ...PARTS.brush.notes].filter((x) => x.key === 36)) {
  const s0 = at(n.t)
  const depth = Math.min(1, n.vel / 96)
  for (let i = 0; i < sec(0.32) && s0 + i < N; i++) {
    const k = i < sec(0.005) ? i / sec(0.005) : Math.exp(-(i - sec(0.005)) / sec(0.11))
    duck[s0 + i] = Math.min(duck[s0 + i], 1 - depth * k)
  }
}
// `LEVELS=1` prints each stem's level in each part of the song, as it sits
// in the mix, for balancing it without ears in the room
const SECTIONS = [['intro', 0, 5000], ['verse', 5000, 16250], ['build', 16250, 21250], ['chorus', 21250, 26250], ['down', 26250, 28750], ['ask', 28750, 31250], ['home', 31250, MS]]
const LEVELS = process.env.LEVELS ? (() => {
  const acc = {}
  return {
    add(name, i, l, r) {
      const sct = SECTIONS.findIndex(([, a, z]) => i >= at(a) && i < at(z))
      if (sct < 0) return
      const k = `${name}|${sct}`
      acc[k] = (acc[k] || 0) + (l * l + r * r) / 2
    },
    print() {
      const db = (k, n) => (acc[k] ? (10 * Math.log10(acc[k] / n)).toFixed(1) : '   -  ')
      console.log('stem     ' + SECTIONS.map(([s]) => s.padStart(7)).join(''))
      for (const name of Object.keys(STEMS)) console.log(name.padEnd(9) + SECTIONS.map(([, a, z], j) => db(`${name}|${j}`, at(z) - at(a)).padStart(7)).join(''))
    },
  }
})() : null
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) })
const MUS = bus()
const VERB = bus()
const ECHO = bus()
for (const [name, st] of Object.entries(STEMS)) {
  const m = MIX[name]
  const chain = () => {
    const f = []
    if (m.hp) f.push(biquad('hp', m.hp, 0.7))
    if (m.lp) f.push(biquad('lp', m.lp, 0.7))
    if (m.shelf) f.push(biquad('highshelf', m.shelf[1], 0.7, m.shelf[0]))
    if (m.presence) f.push(biquad('peak', m.presence[1], 0.9, m.presence[0]))
    return (x) => { for (const g of f) x = g(x); return x }
  }
  const fl = chain()
  const fr = chain()
  const a = ((m.pan + 1) * Math.PI) / 4
  const pl = Math.cos(a) * Math.SQRT2
  const pr = Math.sin(a) * Math.SQRT2
  for (let i = 0; i < N; i++) {
    let l = fl(st.L[i])
    let r = fr(st.R[i])
    // width: the side of the stereo pair kept, or folded into the middle
    const mid = (l + r) / 2
    const side = ((l - r) / 2) * m.width
    l = mid + side
    r = mid - side
    if (m.drive) { l = Math.tanh(l * m.drive) / m.drive; r = Math.tanh(r * m.drive) / m.drive }
    const d = m.duck ? 1 - m.duck * (1 - duck[i]) : 1
    l *= m.gain * pl * d
    r *= m.gain * pr * d
    MUS.L[i] += l; MUS.R[i] += r
    if (LEVELS) LEVELS.add(name, i, l, r)
    if (m.verb) { VERB.L[i] += l * m.verb; VERB.R[i] += r * m.verb }
    if (m.delay) { ECHO.L[i] += l * m.delay; ECHO.R[i] += r * m.delay }
  }
}
if (LEVELS) LEVELS.print()
// the delay: a dotted eighth, crossing from side to side, darkening
{
  const d = sec((BEAT * 0.75) / 1000)
  const lpL = biquad('lp', 3500)
  const lpR = biquad('lp', 3500)
  for (let i = d; i < N; i++) {
    ECHO.L[i] += lpR(ECHO.R[i - d]) * 0.45
    ECHO.R[i] += lpL(ECHO.L[i - d]) * 0.45
  }
  for (let i = 0; i < N; i++) { VERB.L[i] += ECHO.L[i] * 0.3; VERB.R[i] += ECHO.R[i] * 0.3 }
}
for (let i = 0; i < N; i++) { VERB.L[i] += FXV.L[i]; VERB.R[i] += FXV.R[i] }
// the room: an impulse made here (a few early reflections, then a tail of
// noise that darkens as it dies, each side its own), convolved by ffmpeg
{
  const len = sec(2.6)
  const IL = new Float32Array(len)
  const IR = new Float32Array(len)
  const pre = sec(0.018)
  ;[[0.007, 0.5, -0.4], [0.013, 0.42, 0.5], [0.021, 0.35, -0.2], [0.029, 0.3, 0.35], [0.037, 0.22, -0.5]].forEach(([t, g, p]) => {
    IL[pre + sec(t)] += g * (1 - p) * 0.5
    IR[pre + sec(t) + 3] += g * (1 + p) * 0.5
  })
  const dl = lowpass(0.5)
  const dr = lowpass(0.5)
  for (let i = pre; i < len; i++) {
    const t = (i - pre) / SR
    const env = Math.exp(-t / 0.62) * Math.min(1, t / 0.03)
    const fc = 9000 * Math.exp(-t / 0.9) + 900
    IL[i] += dl(rnd(), fc) * env * 0.35
    IR[i] += dr(rnd(), fc) * env * 0.35
  }
  // of unit energy, so a stem's send is the room's level of it
  let e2 = 0
  for (let i = 0; i < len; i++) e2 += (IL[i] * IL[i] + IR[i] * IR[i]) / 2
  const g = 1 / Math.sqrt(e2)
  for (let i = 0; i < len; i++) { IL[i] *= g; IR[i] *= g }
  const send = join(work, 'send.wav')
  const imp = join(work, 'impulse.wav')
  const back = join(work, 'room.wav')
  writeWav(send, VERB.L, VERB.R)
  const pad0 = (x) => { const y = new Float32Array(Math.max(x.length, 4)); y.set(x); return y }
  writeWav(imp, pad0(IL), pad0(IR))
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', send, '-i', imp, '-filter_complex', '[0][1]afir=dry=0:wet=1:gtype=-1:irgain=1', '-c:a', 'pcm_f32le', back], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`afir: ${r.stderr}`)
  const room = readWav(back)
  for (let i = 0; i < N; i++) { MUS.L[i] += room.L[i]; MUS.R[i] += room.R[i] }
}
// the foley over the band, dry
for (let i = 0; i < N; i++) { MUS.L[i] += FX.L[i] * 1.6; MUS.R[i] += FX.R[i] * 1.6 }

// ── the master ──────────────────────────────────────────────────────────────
// a gentle glue (an RMS compressor, slow), tape's soft saturation, the last
// seconds let go of, and loudnorm in two passes
{
  let env = 0
  const att = Math.exp(-1 / sec(0.03))
  const rel = Math.exp(-1 / sec(0.25))
  let peak = 0
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(MUS.L[i]), Math.abs(MUS.R[i]))
  const norm = 0.5 / Math.max(1e-6, peak)
  const thr = 0.22
  const tone = () => { const f = [biquad('peak', 300, 0.9, -1.5), biquad('peak', 3000, 0.8, 1.5), biquad('highshelf', 7500, 0.7, 4.5)]; return (x) => { for (const g of f) x = g(x); return x } }
  const tl = tone()
  const tr = tone()
  for (let i = 0; i < N; i++) {
    const l = tl(MUS.L[i] * norm)
    const r = tr(MUS.R[i] * norm)
    const x = Math.sqrt((l * l + r * r) / 2)
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x
    const g = env > thr ? (thr / env) ** (1 - 1 / 1.6) : 1
    const fade = Math.min(1, (N - i) / sec(1.4)) * Math.min(1, i / sec(0.01))
    MUS.L[i] = Math.tanh(l * g * 1.6) / 1.6 * fade
    MUS.R[i] = Math.tanh(r * g * 1.6) / 1.6 * fade
  }
}
// the film's own length, the last chord let ring into it
const end = at(MS)
const L = MUS.L.subarray(0, end)
const R = MUS.R.subarray(0, end)
for (let i = 0; i < sec(0.9); i++) { const k = (sec(0.9) - i) / sec(0.9); L[end - 1 - i] *= 1 - (1 - k) ** 2; R[end - 1 - i] *= 1 - (1 - k) ** 2 }
mkdirSync(dirname(out), { recursive: true })
const raw = join(work, 'raw.wav')
writeWav(raw, L, R)
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const mm = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{')))
const norm = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${mm.input_i}:measured_TP=${mm.input_tp}:measured_LRA=${mm.input_lra}:measured_thresh=${mm.input_thresh}:offset=${mm.target_offset}:linear=true`
const fin = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', norm, '-ar', String(SR), '-c:a', 'pcm_s16le', out])
if (fin.status !== 0) throw new Error('loudnorm')
if (process.env.STEMS) {
  mkdirSync(process.env.STEMS, { recursive: true })
  for (const [name, st] of Object.entries(STEMS)) writeWav(join(process.env.STEMS, `${name}.wav`), st.L.subarray(0, end), st.R.subarray(0, end))
}
rmSync(work, { recursive: true, force: true })
console.log(out.replace(`${root}/`, ''), `${(MS / 1000).toFixed(2)}s`, `from ${mm.input_i} LUFS`)

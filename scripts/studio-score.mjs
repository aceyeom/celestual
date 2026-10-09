#!/usr/bin/env node
// studio-score.mjs: the reel's song, made from the reel's own clock.
//
// A song for the film, played by real instruments: the parts are written
// here as notes against app/src/studio/parts/reel-time.js, so every word on
// the frame lands on the note it is sung on, and played by FluidSynth from
// the MuseScore General SoundFont (MIT; its grand piano public domain, its
// strings the VSCO 2 Community Edition's, CC0), one stem an instrument. The
// stems are mixed here: loosened as players are (a few milliseconds early
// or late, never two notes alike), a hall convolved from an impulse made
// here (by ffmpeg's afir), tape's soft saturation, and ffmpeg's loudnorm in
// two passes to -14 LUFS with a true peak a decibel and a half under full
// scale. lin's keys and the send are real recordings (scripts/sounds,
// Ion.Sound's, MIT), a keystroke a letter, never the same one twice
// running; the air the letter moves and the screens going out are
// synthesised, on the frames they happen. There are no bells.
//
// It is quiet and it aches: a piano, close, and strings, a cello, a harp and
// voices, in B minor, and no drums. Its melody is the film's question, `do
// they still think a-bout you?`: up a sixth, a sigh down, and up again at
// the end, as a question goes, onto a note that is not home. The piano sighs
// down under lin's typing (F sharp, E, D, C sharp, B); a harp carries the
// letter's pixels into the envelope; a cello comes in with the note that
// comes in on the thursday; a piano ticks the clock round to nine and stops;
// a run and a harp go up into the letter turning over, and the melody is
// sung by everything as kai's side comes on; the cello answers it; the
// piano is alone for the
// ones that go out and for the question, which is left open over A; and the
// name comes in on a chord that does not resolve.
//
// 96 beats a minute; the bar the reveal begins on is two beats long, and
// from the turn the harmony moves every two beats:
//   letter    0      Bm9 Gmaj7         piano, a falling line on the words
//   hall      3.75   Em9 F#sus F#      arpeggios; strings; the climb
//   send      10     Bm9 Gmaj7 D/F#    a breath; the harp; the swell to the lens
//   night     12.5   D/F# Em9          the rule, the piano and the low strings
//   date      15     Gmaj7 G Asus F#   the clock in eighths; the cello at kai's
//   reveal    20     F#, then D A/C#   the run and the harp up into the turn;
//                                      on it the melody, everything
//   both      23.75  Bm9               the cello's answer
//   if not    25     Bm9 Em9           the piano alone, a note for each light
//   question  27.5   G Asus A          the melody with its words, left open
//   name      31.25  Bm9 Gmaj7         and left there
//
//   node scripts/studio-score.mjs [out.wav]      48 kHz, 16 bit, stereo
//   FOLEY=1 node scripts/studio-score.mjs <out.wav>
//                                                the film's sounds alone,
//                                                without the song, for a song
//                                                of someone's own to be laid
//                                                over them (studio-reel.mjs
//                                                `-sfx.mp4`)
import { spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { MS, BEAT, A, S, typedA, typedUrl } from '../app/src/studio/parts/reel-time.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/campaign/celestual-reel.wav')
const SOUNDFONT = process.env.SOUNDFONT || '/usr/share/sounds/sf3/MuseScore_General_Full.sf3'
if (!existsSync(SOUNDFONT)) throw new Error(`studio-score: no SoundFont at ${SOUNDFONT} (apt install musescore-general-soundfont fluidsynth)`)

const SR = 48000
const TAIL = 3
const N = Math.round((MS / 1000 + TAIL) * SR)
const TAU = Math.PI * 2
const sec = (s) => Math.round(s * SR)
const at = (ms) => Math.round((ms / 1000) * SR)
const bt = (beats) => beats * BEAT
const work = mkdtempSync(join(tmpdir(), 'celestual-score-'))
// the sounds alone: no song, a few more of the picture's moments given a
// sound of their own, since no music carries them, and nothing pressed
const FOLEY = !!process.env.FOLEY

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
function play(p, ms, len, key, vel, { feel = 7, vfeel = 5 } = {}) {
  const t = ms + gauss() * feel
  p.notes.push({ t: Math.max(0, t), len: Math.max(30, len), key, vel: Math.max(1, Math.min(127, Math.round(vel + gauss() * vfeel))) })
}
const chord = (p, ms, len, keys, vel, { roll = 0, ...o } = {}) => keys.forEach((k, i) => play(p, ms + i * roll, len - i * roll, k, vel - i * 2, o))
// a controller over time: [ms, value]
const ctl = (p, ms, num, value) => p.cc.push({ t: ms, num, value: Math.round(value) })
const swell = (p, from, to, v0, v1, num = 11) => { for (let k = 0; k <= 24; k++) ctl(p, from + ((to - from) * k) / 24, num, v0 + ((v1 - v0) * k) / 24) }

// the harmony, voiced: the bass's root, the piano's right hand, the
// strings', each a few notes close together, nothing doubled loud
const V = {
  Bm9: { root: 35, rh: [62, 66, 73], st: [47, 54, 62, 66, 73] },
  Gmaj7: { root: 31, rh: [59, 62, 66], st: [43, 50, 59, 66] },
  Em9: { root: 28, rh: [55, 59, 62, 66], st: [40, 47, 55, 62, 66] },
  'F#sus': { root: 30, rh: [59, 61, 66], st: [42, 49, 59, 61] },
  'F#': { root: 30, rh: [58, 61, 66], st: [42, 49, 58, 66] },
  'D/F#': { root: 30, rh: [62, 66, 69, 76], st: [42, 50, 57, 66, 69] },
  Gadd9: { root: 31, rh: [59, 62, 69], st: [43, 50, 59, 69] },
  Asus: { root: 33, rh: [62, 64, 69], st: [45, 52, 62, 64] },
  Dadd9: { root: 38, rh: [66, 69, 76], st: [50, 57, 66, 69, 76] },
  'A/C#': { root: 37, rh: [64, 69, 73], st: [49, 57, 64, 69] },
  Aadd9: { root: 33, rh: [61, 64, 71], st: [45, 52, 61, 64, 71] },
}
// [beat, chord, beats]; the bar at 32 is two beats long, as the letter
// comes out of the light
const HARMONY = [
  [0, 'Bm9', 4], [4, 'Gmaj7', 4], [8, 'Em9', 4], [12, 'F#sus', 2], [14, 'F#', 2],
  [16, 'Bm9', 2], [18, 'Gmaj7', 2], [20, 'D/F#', 2], [22, 'Em9', 2],
  [24, 'Gmaj7', 2], [26, 'Gadd9', 2], [28, 'Asus', 2], [30, 'F#sus', 1], [31, 'F#', 1], [32, 'F#', 2],
  [34, 'Dadd9', 2], [36, 'A/C#', 2], [38, 'Bm9', 2],
  [40, 'Bm9', 2], [42, 'Em9', 2], [44, 'Gadd9', 2], [46, 'Asus', 2], [48, 'Aadd9', 2], [50, 'Bm9', 2], [52, 'Gmaj7', 4],
]

// the melody: do they still think a-bout you? up a sixth, a sigh down, and
// up again onto the ninth, not home [key, beats long]
const HOOK = [66, 69, 71, 74, 73, 71, 73]

const piano = part('piano', 0)
const keys = part('keys', 0)
const strings = part('strings', 49)
const low = part('low', 49)
const cello = part('cello', 42)
const bass = part('bass', 43)
const harp = part('harp', 46)
const choir = part('choir', 52)
const pad = part('pad', 94)
const timp = part('timp', 47)

// the piano's flowing hand: the chord's notes up and back, in quarters
// where the film is still and in eighths where it is moved, the bass under
// it on the bar, soft, a little rubato in the touch
function arp(b0, beats, v, vel, { up = 0, step = 1 } = {}) {
  const rh = v.rh.map((k) => k + up)
  const seq = [rh[0], rh[1], rh[2], rh[rh.length > 3 ? 3 : 1], rh[2], rh[1]]
  play(keys, bt(b0), bt(beats) + 300, v.root + 12, vel + 4, { feel: 6 })
  for (let e = 0; e < beats / step; e++) play(keys, bt(b0 + e * step), bt(step * 1.8), seq[e % seq.length], vel - (e % 2) * 6, { feel: 9, vfeel: 6 })
}

// ── 0 to 3.75: the letter. The piano alone, close, the chord under it, and
// a falling line that answers the words as they are typed: the high note on
// `i lo`, the sigh down on the `d` after the breath, down again on `you.`
// and on `maybe`, and home as the last word lands
const tA = typedA()
const iLoved = A.text.indexOf('i loved')
const iD = iLoved + 'i love'.length
const iYou = A.text.indexOf('you.')
const iMaybe = A.text.indexOf('maybe')
chord(keys, 40, bt(4) + 400, [35, 47], 40, { roll: 60 })
chord(keys, 260, bt(3.8), V.Bm9.rh, 34, { roll: 90 })
chord(pad, 0, bt(8), [47, 54, 62, 66], 40)
swell(pad, 0, bt(3), 20, 70)
play(piano, tA[iLoved] - 20, tA[iD] - tA[iLoved] + 200, 78, 54, { feel: 0 })
play(piano, tA[iD] - 10, bt(1.1), 76, 50, { feel: 0 })
play(piano, tA[iYou] + 20, bt(1), 74, 46, { feel: 0 })
play(piano, tA[iMaybe] - 15, bt(1.6), 73, 46, { feel: 0 })
play(piano, tA[tA.length - 1] + 30, bt(4), 71, 50, { feel: 0 })
chord(keys, bt(4), bt(4) + 200, [31, 43], 38, { roll: 50 })
chord(keys, bt(4) + 120, bt(3.6), V.Gmaj7.rh, 32, { roll: 80 })

// ── 3.75 to 10: the hall. The piano's arpeggios as the backlights come on,
// the strings coming in under them, rising with the camera to the top of the
// hall and the dominant, and down to lin's letter
arp(8, 4, V.Em9, 46)
arp(12, 2, V['F#sus'], 50)
arp(14, 2, V['F#'], 52)
for (const [b0, name, len] of HARMONY) {
  if (b0 < 6 || b0 >= 16) continue
  chord(strings, bt(b0), bt(len) + 200, V[name].st, 60)
  play(bass, bt(b0), bt(len) + 100, V[name].root + 12, 54)
}
chord(strings, bt(6), bt(2) + 100, V.Gmaj7.st, 56)
swell(strings, bt(6), bt(9), 25, 58)
swell(strings, bt(11), bt(15), 58, 84)
swell(strings, bt(15), bt(16.5), 84, 64)
// a cello under the words: `a wall of the ones / you never told.`
;[[9, 55, 1], [10, 54, 1.5], [11.5, 52, 0.5], [12, 54, 4]].forEach(([b, k, l]) => play(cello, bt(b), bt(l) + 80, k, 40))
ctl(cello, 0, 11, 66)
ctl(cello, bt(17), 11, 90)

// ── 10 to 12.5: send. The piano holds its breath on the key; a harp takes
// the letter's pixels up into the envelope; its chord as it is sealed; the
// strings and the voices swell as it comes at the lens, and it breaks on the
// bar into the dark, on D, the light of the key it is in
arp(16, 1, V.Bm9, 44)
chord(keys, bt(17), bt(1.6), [47, 54, 62, 66, 73], 42, { roll: 40 })
chord(strings, bt(16), bt(2) + 100, V.Bm9.st, 70)
chord(strings, bt(18), bt(2) + 100, V.Gmaj7.st, 72)
swell(strings, bt(16.5), bt(19.9), 58, 104)
play(bass, bt(16), bt(2), 47, 54)
play(bass, bt(18), bt(2), 43, 60)
// the harp: B minor up the strings, as the pixels go into the envelope
{
  const scale = [47, 49, 50, 52, 54, 55, 57, 59, 61, 62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83]
  const span = S.gather[1] - S.gather[0]
  scale.forEach((k, i) => play(harp, S.gather[0] + (span * (i / scale.length) ** 1.15), 900, k, 50 + i * 1.5, { feel: 4 }))
}
chord(harp, S.seal[0], 1600, [71, 78, 83], 62, { roll: 30 })
chord(choir, bt(19), bt(1) + 60, [62, 66, 71], 40)
swell(choir, bt(19), bt(19.95), 30, 110)
for (let k = 0; k < 8; k++) play(timp, bt(19 + k * 0.125), bt(0.2), 42, 14 + k * 6, { feel: 2, vfeel: 2 })
// the bar: D, the light of the key, in everything, and let go
chord(strings, bt(20), bt(2) + 300, V['D/F#'].st, 92)
chord(choir, bt(20), bt(2.4), [62, 66, 69], 70)
swell(choir, bt(20), bt(22.5), 110, 40)
swell(strings, bt(20), bt(22.5), 118, 62)
chord(keys, bt(20), bt(2.5), [30, 42], 58, { roll: 30 })
chord(piano, bt(20) + 40, bt(2.5), [66, 69, 74, 78], 60, { roll: 45 })
play(bass, bt(20), bt(2) + 100, 42, 70)

// ── 12.5 to 15: the dark. The rule, said quietly: the low strings, the
// piano alone above them, the melody's first notes and no more
chord(low, bt(20), bt(4) + 200, [30, 42, 49], 60)
chord(low, bt(22), bt(2) + 200, [40, 47], 62)
ctl(low, 0, 11, 80)
chord(strings, bt(22), bt(2) + 200, V.Em9.st, 58)
;[[20.5, 66, 0.5], [21, 69, 0.5], [21.5, 71, 2.2]].forEach(([b, k, l]) => play(piano, bt(b), bt(l), k, 48))
;[[22.5, 74, 0.5], [23, 73, 1.6]].forEach(([b, k, l]) => play(piano, bt(b), bt(l), k, 44))
arp(22, 2, V.Em9, 38)

// ── 15 to 20: the date. The piano starts the clock, F sharp in eighths, as
// the sentence ends on it; the strings rise under it; on the thursday a
// cello comes in, the melody's first notes, for the note that came; the
// clock stops at nine, and in the quiet the two find each other
arp(24, 2, V.Gmaj7, 40)
chord(strings, bt(24), bt(2) + 100, V.Gmaj7.st, 62)
for (const [b0, name, len] of HARMONY) {
  if (b0 < 26 || b0 >= 32) continue
  chord(strings, bt(b0), bt(len) + 120, V[name].st, b0 < 30 ? 76 : 52)
  play(bass, bt(b0), bt(len) + 60, V[name].root + 12, 64)
  chord(keys, bt(b0), bt(len), [V[name].root + 12, V[name].root + 24], 40, { roll: 30 })
}
swell(strings, bt(26), bt(29), 50, 96)
// the clock, until nine
for (let e = 0; bt(26) + e * bt(0.5) < S.lapse[1]; e++) play(piano, bt(26) + e * bt(0.5), bt(0.42), 78, 50 + e * 2.2, { feel: 3, vfeel: 3 })
play(piano, S.lapse[1], bt(1.6), 78, 64, { feel: 0 })
// the cello, for the note that came in
;[[27.5, 54, 0.5], [28, 57, 0.5], [28.5, 59, 1.1]].forEach(([b, k, l]) => play(cello, bt(b), bt(l) + 60, k, 70))
swell(cello, bt(27.5), bt(29), 76, 96)
swell(cello, bt(29), bt(30), 96, 64)
ctl(cello, bt(34), 11, 100)
// at nine the strings hold, down to almost nothing, and the touch is
// heard in it
swell(strings, S.lapse[1] + 100, bt(31.9), 96, 40)
chord(choir, bt(31), bt(1) + 100, [54, 61, 66], 34)

// ── 20 to 23.75: the reveal. As the letter comes out of the light, a run up
// the piano, leaning a little into its last notes, the melody's first, `do
// they`, and a harp up with it into the turn; on the turn, as kai's side
// comes on: the melody sung by everything, the piano, the cello under it,
// the voices, the strings, on D, the key's own light; `it's mutual.` on its
// third beat
;[[S.run - 20, 59], [S.run + 100, 61], [S.run + 210, 62], [S.run + 320, 64]].forEach(([ms, k], i) => play(piano, ms, 600, k, 52 + i * 5, { feel: 3 }))
;[[33.5, 66], [33.75, 69]].forEach(([b, k]) => play(piano, bt(b), bt(0.3), k, 74, { feel: 0 }))
{
  const up = [62, 64, 66, 69, 71, 73, 74, 76, 78, 81, 83, 85, 86]
  const from = bt(33)
  const span = bt(33.96) - from
  up.forEach((k, i) => play(harp, from + span * (i / up.length) ** 0.85, 1100, k, 42 + i * 1.8, { feel: 3 }))
}
// under the run, the strings back on the dominant, and a timpani roll,
// both rising into the bar they are held on, and the timpani's D on it
chord(strings, S.meet, bt(2) + 60, V['F#'].st, 66)
swell(strings, S.meet, bt(33.9), 34, 112)
for (let k = 0; S.meet + k * bt(0.25) < bt(34) - 20; k++) play(timp, S.meet + k * bt(0.25), bt(0.3), 42, 18 + k * 9, { feel: 2, vfeel: 2 })
play(timp, bt(34), bt(2), 38, 92, { feel: 0 })
const peak = [[34, 71, 1], [35, 74, 1.5], [36.5, 73, 0.5], [37, 71, 1], [38, 73, 1.9]]
peak.forEach(([b, k, l]) => {
  play(piano, bt(b), bt(l) + 120, k, 88, { feel: 0 })
  play(piano, bt(b) + 4, bt(l) + 120, k - 12, 62, { feel: 0 })
  play(cello, bt(b), bt(l) + 100, k - 24, 60, { feel: 2 })
})
for (const [b0, name, len] of HARMONY) {
  if (b0 < 34 || b0 >= 38) continue
  chord(strings, bt(b0), bt(len) + 150, V[name].st, 90)
  chord(choir, bt(b0), bt(len) + 120, V[name].rh.map((k) => k - 12), 74)
  play(bass, bt(b0), bt(len) + 80, V[name].root, 82)
  arp(b0, len, V[name], 48, { up: 12, step: 0.5 })
}
ctl(strings, bt(34), 11, 118)
swell(choir, bt(34), bt(37), 96, 80)
chord(harp, bt(34), 1800, [62, 69, 74, 78, 81], 60, { roll: 55 })

// ── 23.75 to 25: `you both find out.` The strings quieter, and the cello
// answers the melody, down, to the B the next scene is on
;[[38.5, 74, 0.5], [39, 73, 0.5], [39.5, 71, 0.75]].forEach(([b, k, l]) => play(cello, bt(b), bt(l) + 100, k - 12, 68, { feel: 4 }))
for (const [b0, name, len] of HARMONY) {
  if (b0 < 38 || b0 >= 40) continue
  chord(strings, bt(b0), bt(len) + 150, V[name].st, 72)
  play(bass, bt(b0), bt(len) + 80, V[name].root + 12, 62)
  arp(b0, len, V[name], 42, { step: 0.5 })
}
swell(strings, bt(38), bt(40), 92, 56)

// ── 25 to 27.5: the ones that never meet. The piano alone over a low B; a
// note for each light as it goes, down the chord, the last lowest
chord(low, bt(40), bt(4) + 300, [35, 47], 50)
chord(keys, bt(40), bt(2), [35, 47], 40, { roll: 40 })
chord(keys, bt(40) + 90, bt(1.8), V.Bm9.rh, 32, { roll: 70 })
chord(keys, bt(42), bt(2), [40, 52], 34, { roll: 40 })
;[[S.lone[0], 78], [S.lone[1], 74], [S.lone[2], 71]].forEach(([ms, k], i) => play(piano, ms + 10, bt(2.2), k, 52 - i * 4, { feel: 0 }))

// ── 27.5 to 31.25: the question. The melody with its words, the piano
// alone, each note on the frame its word comes on; `you?` on the ninth,
// over A with the fourth in it, not home; and left there, the fourth
// letting go to the third under it, so the question is held open and not
// answered, until the name
const Q = S.qWords
;[Q[0], Q[1], Q[2], Q[3], Q[4], Q[4] + bt(0.5), Q[5]].map((t, i) => [t, HOOK[i]]).forEach(([t, k], i, all) => {
  const next = all[i + 1] ? all[i + 1][0] : bt(50)
  play(piano, t, Math.max(bt(0.5), next - t + 140), k, i === all.length - 1 ? 58 : 62, { feel: 0 })
})
chord(keys, bt(44), bt(2), [31, 43], 36, { roll: 50 })
chord(keys, bt(46), bt(2), [33, 45], 36, { roll: 50 })
chord(keys, bt(48) + 60, bt(2), [45, 52, 61], 30, { roll: 80 })
chord(pad, bt(44), bt(2) + 100, [55, 62, 69], 46)
chord(pad, bt(46), bt(2) + 100, [57, 62, 64], 48)
chord(pad, bt(48), bt(2) + 160, [57, 61, 64, 71], 44)
swell(pad, bt(48), bt(50), 90, 60)

// ── 31.25 to 35: the name. B minor with its ninth, everything quietly, and
// then G with its seventh, where it is left
chord(keys, bt(50), bt(2) + 200, [23, 35, 47], 52, { roll: 50 })
chord(piano, bt(50) + 60, bt(2) + 100, [62, 66, 73, 78], 50, { roll: 70 })
chord(strings, bt(50), bt(2) + 200, V.Bm9.st, 64)
chord(choir, bt(50), bt(2) + 200, [62, 66, 73], 46)
chord(keys, bt(52), bt(4) + 900, [19, 31, 43], 50, { roll: 60 })
chord(piano, bt(52) + 80, bt(4) + 800, [59, 62, 66, 69, 74], 46, { roll: 90 })
chord(strings, bt(52), bt(4) + 900, [43, 50, 59, 66, 71], 62)
chord(choir, bt(52), bt(4) + 700, [59, 62, 66], 40)
swell(strings, bt(52), bt(56), 70, 40)
swell(choir, bt(52), bt(56), 70, 30)
play(bass, bt(50), bt(2), 35, 54)
play(bass, bt(52), bt(4) + 600, 31, 52)
play(harp, S.url + 200, 1600, 83, 40)

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
  if (!p.notes.length || FOLEY) continue
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
// ── the recordings ──
// a recording, one channel at the song's rate, as it is
function recording(name) {
  const wav = join(work, `rec-${name}.wav`)
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(root, 'scripts/sounds', `${name}.ogg`), '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_f32le', wav])
  if (r.status !== 0) throw new Error(`studio-score: the recording ${name}`)
  const b = readFileSync(wav)
  let off = 12
  while (off < b.length && b.toString('ascii', off, off + 4) !== 'data') off += 8 + b.readUInt32LE(off + 4)
  const len = b.readUInt32LE(off + 4) / 4
  const x = new Float32Array(len)
  for (let i = 0; i < len; i++) x[i] = b.readFloatLE(off + 8 + i * 4)
  return x
}
// the strokes in a recording of taps: found by their attacks (the level, a
// five-hundredth of a second at a time, coming up twelve decibels in three
// of them), each from just before its attack to the next or a tenth of a
// second, faded out, softened a little above and below as a tap close to
// the ear is, and brought to one height
function strokesOf(x) {
  const hop = SR / 500
  const db = []
  for (let i = 0; i + hop <= x.length; i += hop) {
    let e = 0
    for (let j = 0; j < hop; j++) e += x[i + j] * x[i + j]
    db.push(10 * Math.log10(e / hop + 1e-18))
  }
  const top = Math.max(...db)
  const on = []
  for (let i = 3; i < db.length; i++) if (db[i] - db[i - 3] > 12 && db[i] > top - 30 && (!on.length || i - on[on.length - 1] > 25)) on.push(i)
  return on.map((o, n) => {
    const a = Math.max(0, (o - 2) * hop)
    const z = Math.min(n + 1 < on.length ? (on[n + 1] - 1) * hop : x.length, a + sec(0.1))
    const hp = biquad('hp', 160, 0.7)
    const lp = biquad('lp', 7200, 0.7)
    const s = new Float32Array(z - a)
    let peak = 0
    for (let i = 0; i < s.length; i++) {
      const fade = Math.min(1, i / sec(0.002), (s.length - i) / sec(0.03))
      s[i] = lp(hp(x[a + i])) * fade
      peak = Math.max(peak, Math.abs(s[i]))
    }
    for (let i = 0; i < s.length; i++) s[i] /= peak || 1
    return s
  })
}
// a recorded sound laid on its frame, `rate` times its own speed
function sample(ms, s, { gain = 0.05, rate = 1, pan = 0, verb = 0.12 } = {}) {
  lay(ms, Math.floor(s.length / rate), (i) => {
    const p = i * rate
    const j = Math.floor(p)
    const f = p - j
    return (s[j] || 0) * (1 - f) + (s[j + 1] || 0) * f
  }, { gain, pan, verb })
}
const TAP = strokesOf(recording('tap'))[0]
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
// grains of air over `len` ms from `ms`, thickest a little after the
// middle, each its own length and loudness, the band they are in going
// from `from` to `to`
const r01 = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
function grains(ms, len, { gain = 0.02, from = 6000, to = 1500, n = 120, pan = 0, verb = 0.4 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = r01(i * 3.1 + 7)
    const b = r01(i * 5.7 + 11)
    const k = Math.min(0.97, 0.04 + 0.92 * (a + b) / 2)
    const L = sec(0.006 + 0.016 * r01(i * 2.3 + 1))
    const lp = lowpass(1.6)
    const fc = from * (to / from) ** k
    const g = 0.45 + 0.55 * r01(i * 9.1 + 4)
    lay(ms + len * k, L, (j) => lp(rnd(), fc) * Math.sin((Math.PI * j) / L) ** 2 * g, { gain, pan: pan + (r01(i * 4.3 + 2) - 0.5) * 0.5, verb })
  }
}
// a screen going out, as an old one does: the whine of its circuit falling
// away, and a soft knock as its picture goes to a point
function whine(ms, { gain = 0.02, from = 7000, to = 300, len = 0.34, pan = 0 } = {}) {
  let ph = 0
  const L = sec(len)
  lay(ms, L, (i) => {
    const k = i / L
    ph += (TAU * from * (to / from) ** k) / SR
    return Math.sin(ph) * (1 - k) ** 1.4 * Math.min(1, i / sec(0.004))
  }, { gain, pan, verb: 0.3 })
}
// a phone's key, as its keyboard clicks under the finger: a tick and a
// small bright body, over in a few hundredths of a second; the space bar's a
// little lower and softer. Each a hair different in pitch and weight, as a
// finger never presses twice alike
function key(ms, { gain = 0.02, space = false, n = 0, pan = 0 } = {}) {
  const f = (space ? 1150 : 1700) * (1 + 0.015 * (r01(n * 3.7 + 1) - 0.5) * 2)
  const g = gain * (space ? 0.8 : 1) * (0.85 + 0.3 * r01(n * 5.3 + 2))
  const hp = biquad('hp', 700, 0.7)
  const pk = biquad('peak', space ? 2300 : 3300, 1.2, 6)
  lay(ms, sec(0.03), (i) => {
    const t = i / SR
    const tick = rnd() * Math.exp(-t / 0.0009)
    const body = Math.sin(TAU * f * t) * Math.exp(-t / 0.0045) * 0.55 + Math.sin(TAU * f * 2.37 * t) * Math.exp(-t / 0.002) * 0.3
    return pk(hp(tick * 0.9 + body)) * Math.min(1, i / sec(0.0004))
  }, { gain: g, pan, verb: 0.04 })
}
// a knock, soft, as on a door or a chest: a low body whose pitch drops a
// little as it goes, and the touch of it; low enough to be felt and high
// enough to be heard on a phone's own speaker
function knock(ms, { gain = 0.03, f = 190, len = 0.25, pan = 0, verb = 0.35 } = {}) {
  const lp = lowpass(0.8)
  let ph = 0
  lay(ms, sec(len), (i) => {
    const t = i / SR
    ph += (TAU * f * (1 - 0.15 * Math.min(1, t / 0.08))) / SR
    const body = Math.sin(ph) * Math.exp(-t / (len / 4))
    const hit = lp(rnd(), 2500) * Math.exp(-t / 0.004) * 0.6
    return (body + hit) * Math.min(1, i / sec(0.002))
  }, { gain, pan, verb })
}
function thump(ms, { gain = 0.05, f = 55, len = 0.5, pan = 0 } = {}) {
  lay(ms, sec(len), (i) => {
    const t = i / SR
    return (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) * Math.exp(-t / 0.05)) * Math.exp(-t / (len / 3.5)) * Math.min(1, i / sec(0.003))
  }, { gain, pan, verb: 0.4 })
}
// lin's letter typed on the glass, the phone's keys under it, a click a
// letter as it lands (the first sentence is there already), under the
// piano quietly, and with the sounds alone as they are heard in the hand;
// and send
const KEYS = FOLEY ? 0.022 : 0.009
{
  const at0 = typedA()
  ;[...A.text].forEach((ch, n) => { if (at0[n] >= 0) key(at0[n], { gain: KEYS, space: ch === ' ', n }) })
}
sample(S.press, TAP, { gain: 0.07, rate: 0.94, pan: -0.05 })
// a breath of air under the hall as its backlights come on, under the song
// (alone it is only a hiss)
if (!FOLEY) air(S.wake, 5200, { gain: 0.006, from: 300, to: 3000 })
// the send: the letter's pixels up into the envelope, a breath of air over
// the harp; sealed, a small tap of it closing; the phone going out; the
// envelope at the lens and through it, and away into the dark
air(S.gather[0], S.gather[1] - S.gather[0], { gain: 0.007, from: 1500, to: 8000 })
sample(S.seal[0], TAP, { gain: 0.035, rate: 1.3 })
whine(S.crt[0], { gain: 0.014, from: 7500, to: 500, len: 0.36 })
thump(S.crt[0] + 175, { gain: 0.03, f: 62, len: 0.35 })
air(S.lens[0], S.lens[1] - S.lens[0] + 40, { gain: 0.045, from: 400, to: 12000, shape: 'rise', q: 1.1 })
thump(S.wash[0] + 90, { gain: 0.06, f: 46, len: 1.2 })
air(S.away[0], S.away[1] - S.away[0], { gain: 0.009, from: 6000, to: 500, shape: 'fall' })
// the week's notes and the clock are the music's: the piano ticks it round
// and stops at nine
// the lean in, a breath
air(S.lean[0], S.touch[2] - S.lean[0], { gain: 0.007, from: 300, to: 2400 })
// and the two lights going out together: a slow breath of air under
// them as they spread, as long as they take to, soft at both ends
air(S.touch[2], 1300, { gain: 0.012, from: 300, to: 3000, q: 0.8, verb: 0.75 })
// lin's letter out of the light at us: the air it moves, coming
// quickly and falling away, from the left as it swings out there and back
// to the middle as it comes into the hand
{
  const lp = lowpass(1.2)
  const L = sec(0.78)
  const s0 = at(S.swoosh[0] + 10)
  for (let i = 0; i < L; i++) {
    const t = i / SR
    const e = Math.min(1, t / 0.07) ** 1.5 * Math.exp(-Math.max(0, t - 0.07) / 0.2)
    const x = lp(rnd(), 9000 * Math.exp(-t / 0.3) + 700) * e
    const pan = -0.42 * Math.sin(Math.PI * Math.min(1, t / 0.6))
    const a = ((pan + 1) * Math.PI) / 4
    const k = s0 + i
    if (k >= N) break
    FX.L[k] += x * Math.cos(a) * 0.05; FX.R[k] += x * Math.sin(a) * 0.05
    FXV.L[k] += x * Math.cos(a) * 0.05 * 0.4; FXV.R[k] += x * Math.sin(a) * 0.05 * 0.4
  }
}
// it turns over: a breath of air as it goes
air((S.flip[0] + S.flip[1]) / 2 - 170, 320, { gain: 0.012, from: 1800, to: 6500, q: 1.4 })
// kai's letter melting back into the light: grains of air, each a few
// thousandths of a second, more of them as more of it goes, their band
// falling as it goes, gone on the cut
grains(S.give[0], S.give[1] - S.give[0], { gain: 0.016, from: 7000, to: 1800, n: 150, verb: 0.45 })
// the lights that never met, going out, each as a screen goes, from its
// place
;[[S.lone[0], -0.55], [S.lone[1], 0.45], [S.lone[2], -0.15]].forEach(([ms, pan]) => whine(ms, { gain: 0.006, from: 6000, to: 700, len: 0.24, pan }))
// with no song, the moments it carried are given a sound: the camera's move
// up the hall's height, and lin's letter coming away from the wall to it,
// each the air it moves; kai's note coming on, on the thursday, a little to
// the right where it is; the two touching, low, under the air of it; the
// one who goes, blown away to the left, a gust and the scratch of the
// pencil's lines; and the name lit from its star, a shimmer of air as fine
// as its cells
if (FOLEY) {
  air(5650, 2400, { gain: 0.03, from: 250, to: 2000, q: 0.8, verb: 0.6 })
  air(S.lift[0], 1700, { gain: 0.02, from: 300, to: 3500, verb: 0.5 })
  air(S.kaiIn, 280, { gain: 0.018, from: 1400, to: 6000, pan: 0.3, verb: 0.4 })
  thump(S.touch[2], { gain: 0.032, f: 52, len: 1.1 })
  air(S.lone[0] - 100, 1700, { gain: 0.017, from: 2200, to: 350, pan: -0.45, q: 0.9, verb: 0.5 })
  grains(S.lone[0] - 60, 1300, { gain: 0.011, from: 4200, to: 2400, n: 260, pan: -0.35, verb: 0.2 })
  grains(S.lock[0], 1000, { gain: 0.01, from: 9000, to: 5000, n: 70, verb: 0.6 })
  // the question, a word at a time: each word a soft knock and a breath,
  // a little more each time; and on `you?` the air drawn in before it, a
  // deeper knock held under a low one, and a shimmer as it lights
  S.qWords.slice(0, 5).forEach((ms, i) => {
    knock(ms, { gain: 0.02 + 0.004 * i, f: 196 - 6 * i, len: 0.26 })
    thump(ms, { gain: 0.012 + 0.002 * i, f: 62, len: 0.45 })
    air(ms - 20, 260, { gain: 0.007 + 0.0012 * i, from: 2400, to: 700, shape: 'fall', verb: 0.5 })
  })
  const you = S.qWords[5]
  air(you - 480, 480, { gain: 0.018, from: 300, to: 5000, shape: 'rise', q: 1 })
  knock(you, { gain: 0.05, f: 146, len: 0.7, verb: 0.6 })
  thump(you, { gain: 0.045, f: 44, len: 1.8 })
  grains(you, 1400, { gain: 0.009, from: 8000, to: 4000, n: 90, verb: 0.7 })
}
// and the address under the name, typed, a click a letter
typedUrl().forEach((ms, n) => key(ms, { gain: KEYS * 0.75, n: n + 100 }))

// ── the mix ─────────────────────────────────────────────────────────────────
// each stem: its level, where it sits, what is taken off it, how much of it
// goes to the room and to the delay, and whether it breathes with the kick
const MIX = {
  piano: { gain: 1.5, pan: 0.04, width: 0.7, hp: 60, lp: 7500, shelf: [-2.5, 5500], verb: 0.42 },
  keys: { gain: 1.25, pan: -0.04, width: 0.8, hp: 40, lp: 6000, shelf: [-3, 5000], verb: 0.4 },
  strings: { gain: 0.75, pan: 0, width: 1, hp: 90, lp: 9000, verb: 0.55 },
  low: { gain: 0.8, pan: 0, width: 0.8, hp: 35, lp: 4000, verb: 0.45 },
  cello: { gain: 1.2, pan: -0.12, width: 0.4, hp: 60, presence: [1.5, 2200], verb: 0.45 },
  bass: { gain: 0.8, pan: 0.05, width: 0.2, hp: 30, lp: 1800, verb: 0.3 },
  harp: { gain: 0.8, pan: 0.18, width: 0.6, hp: 120, verb: 0.55 },
  choir: { gain: 0.8, pan: 0, width: 1, hp: 140, lp: 8000, verb: 0.6 },
  pad: { gain: 0.7, pan: 0, width: 1, hp: 120, lp: 5000, verb: 0.5 },
  timp: { gain: 0.9, pan: 0, width: 0.5, hp: 30, verb: 0.5 },
}
// nothing ducks: there is no kick for anything to breathe with
const duck = new Float32Array(N).fill(1)
// `LEVELS=1` prints each stem's level in each part of the song, as it sits
// in the mix, for balancing it without ears in the room
const SECTIONS = [['letter', 0, 3750], ['hall', 3750, 10000], ['send', 10000, 12500], ['night', 12500, 15000], ['date', 15000, 20000], ['reveal', 20000, 23750], ['both', 23750, 25000], ['ifnot', 25000, 27500], ['ask', 27500, 31250], ['name', 31250, MS]]
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
// `MUTE=a,b` leaves those parts out of the mix, for hearing what the rest is
const MUTE = (process.env.MUTE || '').split(',')
for (const [name, st] of Object.entries(STEMS)) {
  if (MUTE.includes(name)) continue
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
  }
}
if (LEVELS) LEVELS.print()
for (let i = 0; i < N; i++) { VERB.L[i] += FXV.L[i]; VERB.R[i] += FXV.R[i] }
// the room: an impulse made here (a few early reflections, then a tail of
// noise that darkens as it dies, each side its own), convolved by ffmpeg; a
// hall, long and dark, for a piano heard from a little way off
{
  const len = sec(3.4)
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
    const env = Math.exp(-t / 0.85) * Math.min(1, t / 0.035)
    const fc = 7000 * Math.exp(-t / 1.1) + 700
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
const FXG = process.env.FXG != null ? Number(process.env.FXG) : 1.2
for (let i = 0; i < N; i++) { MUS.L[i] += FX.L[i] * FXG; MUS.R[i] += FX.R[i] * FXG }

// ── the master ──────────────────────────────────────────────────────────────
// a gentle glue (an RMS compressor, slow), warmth and no added air, tape's
// soft saturation, the last seconds let go of, and loudnorm in two passes;
// the sounds alone are not pressed at all: they are set by their loudest
// moment, four and a half decibels under full scale, so a song laid over
// them has the room it needs
if (FOLEY) {
  let peak = 0
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(MUS.L[i]), Math.abs(MUS.R[i]))
  const g = 10 ** (-4.5 / 20) / Math.max(1e-9, peak)
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / sec(1.4)) * Math.min(1, i / sec(0.01))
    MUS.L[i] *= g * fade
    MUS.R[i] *= g * fade
  }
} else {
  let env = 0
  const att = Math.exp(-1 / sec(0.03))
  const rel = Math.exp(-1 / sec(0.25))
  let peak = 0
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(MUS.L[i]), Math.abs(MUS.R[i]))
  const norm = 0.5 / Math.max(1e-6, peak)
  const thr = 0.22
  const tone = () => { const f = [biquad('peak', 220, 0.8, 0.8), biquad('peak', 3200, 0.8, -0.6), biquad('highshelf', 8500, 0.7, -1.5)]; return (x) => { for (const g of f) x = g(x); return x } }
  const tl = tone()
  const tr = tone()
  for (let i = 0; i < N; i++) {
    const l = tl(MUS.L[i] * norm)
    const r = tr(MUS.R[i] * norm)
    const x = Math.sqrt((l * l + r * r) / 2)
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x
    const g = env > thr ? (thr / env) ** (1 - 1 / 1.35) : 1
    const fade = Math.min(1, (N - i) / sec(1.4)) * Math.min(1, i / sec(0.01))
    MUS.L[i] = Math.tanh(l * g * 1.3) / 1.3 * fade
    MUS.R[i] = Math.tanh(r * g * 1.3) / 1.3 * fade
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
if (FOLEY) {
  writeWav(out, L, R, 16)
  rmSync(work, { recursive: true, force: true })
  console.log(out.replace(`${root}/`, ''), `${(MS / 1000).toFixed(2)}s`, 'the sounds alone')
  process.exit(0)
}
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

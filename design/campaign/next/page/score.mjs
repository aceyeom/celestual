// The round's sound, from the film's own clock (round-time.js): a four voice
// round in E flat over the ground Eb | Bb/D | Cm | Ab, each person's
// instrument entering with their link, and the machine's few sounds on their
// frames. Every instrument is a real recording under CC0: VSCO 2 Community
// Edition (github.com/sgossner/VSCO-2-CE) and the Versilian Community Sample
// Library (github.com/sgossner/VCSL); film/README.md says which folders.
//
//   node score.mjs <samples> <out.wav>   the mastered loop, from the file's first frame
//   node score.mjs --check               the round's counterpoint, bar by bar
//   ROUND_STEMS=<dir> node score.mjs ...  also keep each bus, in film time
//
// The film is a loop, so the sound is one: every note, tail and echo is laid
// into a circular buffer one film long, and what rings past the last frame
// sounds again under the first (the same as playing it twice and keeping the
// second time round). Then it is turned to start where the file does.

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import * as T from './round-time.js'

const SR = 48000
const FPS = 30
const N = Math.round((T.FRAMES / FPS) * SR)
const BAR = 1.2
const EIGHTH = 0.2
const sec = (f) => f / FPS

// ── pitch ──────────────────────────────────────────────────────────────────
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
// scientific pitch, C4 = 60
const P = (s) => { const m = /^([A-G][b#]?)(-?\d)$/.exec(s); return 12 * (+m[2] + 1) + PC[m[1]] }
const NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const nameOf = (x) => `${NAME[x % 12]}${Math.floor(x / 12) - 1}`

// ── the harmony, a bar each ────────────────────────────────────────────────
// bars 1 and 2 the ground's second half (the open); 3 to 18 the ground four
// times under the round; 19 the dominant held under the catch; 20 home as
// the sheet lands; 21 the cascade's chord; 22 to 25 the ground round to bar 1
const CHORD = {
  Eb: [3, 7, 10], 'Bb/D': [10, 2, 5], Cm: [0, 3, 7], Ab: [8, 0, 3], Bb7: [10, 2, 5, 8], 'Eb6/9': [3, 7, 10, 0, 5],
}
const GROUND = ['Eb', 'Bb/D', 'Cm', 'Ab']
const HARMONY = ['Cm', 'Ab', ...Array.from({ length: 16 }, (_, k) => GROUND[k % 4]), 'Bb7', 'Eb', 'Eb6/9', 'Cm', 'Ab', 'Eb', 'Bb/D']
const ROOT = { Eb: 'Eb2', 'Bb/D': 'D2', Cm: 'C2', Ab: 'Ab1', Bb7: 'Bb1', 'Eb6/9': 'Eb2' }
const chordOf = (bar) => HARMONY[(bar - 1) % 25]

// ── the round ──────────────────────────────────────────────────────────────
// Four phrases of four bars, written once, each a layer of a different speed:
// the tune in quarters (sol mi la, sol re ti, do la mi, fa: its head is the
// cascade's own notes), the answer in halves and quarters (its first mi
// where the tune's last fa falls), the walk in eighths, the long notes a bar
// each. A voice enters with the tune and goes
// on through the others, so by bar 15 all four sound at once.
const TUNE = [['Bb4', 2], ['G4', 2], ['C5', 2], ['D5', 4], ['Bb4', 2], ['Eb5', 2], ['C5', 2], ['G4', 2], ['Ab4', 6]]
const ANSWER = [['G4', 4], ['Ab4', 2], ['Bb4', 2], ['F4', 2], ['D4', 2], ['G4', 4], ['Eb4', 2], ['C4', 2], ['Eb4', 2], ['F4', 2]]
const WALK = ['Eb4 G4 Bb4 Eb5 Bb4 G4', 'Bb3 D4 F4 Bb4 F4 D4', 'C4 Eb4 G4 C5 G4 Eb4', 'Eb4 Ab4 C5 Eb5 Ab4 Eb4'].flatMap((b) => b.split(' ').map((p) => [p, 1]))
const LONG = [['G4', 6], ['F4', 6], ['G4', 6], ['C4', 6]]
const PHRASES = { tune: TUNE, answer: ANSWER, walk: WALK, long: LONG }

// who plays what, from which bar, at what octave from the written
const VOICES = {
  sol: { inst: 'clarinet', pan: -0.28, gain: 1.0, from: 3, plan: [['tune', 0], ['answer', 0], ['walk', 0], ['long', 12]] },
  wren: { inst: 'harp', pan: 0.38, gain: 0.85, from: 7, plan: [['tune', 12], ['answer', 12], ['walk', 12]] },
  pia: { inst: 'cello', pan: -0.5, gain: 0.8, from: 11, plan: [['tune', -12], ['answer', -12]] },
  yuna: { inst: 'horn', pan: 0.16, gain: 0.78, from: 15, plan: [['tune', 0]] },
}

// every note of the score: { voice, inst, midi, at (s), dur (s), vel }
function scoreNotes() {
  const out = []
  const note = (voice, inst, p, bar, eighth, len, vel, extra = {}) =>
    out.push({ voice, inst, midi: typeof p === 'number' ? p : P(p), at: (bar - 1) * BAR + eighth * EIGHTH, dur: len * EIGHTH, vel, ...extra })
  // the round, each phrase shaped: a little more into its second bar, less at its end
  const shape = [0.92, 1, 0.96, 0.86]
  for (const [voice, v] of Object.entries(VOICES)) {
    v.plan.forEach(([phrase, oct], k) => {
      const bar0 = v.from + k * 4
      // the round grows as the people do: each voice a little louder as it is joined
      const lift = 0.5 + 0.06 * Math.min(4, (bar0 - 3) / 4)
      let e = 0
      for (const [p, len] of PHRASES[phrase]) {
        const bar = bar0 + Math.floor(e / 6)
        note(voice, v.inst, P(p) + oct, bar0, e, len, lift * shape[bar - bar0], { phrase })
        e += len
      }
    })
  }
  // bar 19: the dominant held while the hinge trembles; the harp trembles with it
  note('sol', 'clarinet', 'D5', 19, 0, 6, 0.26)
  note('yuna', 'horn', 'Ab4', 19, 0, 6, 0.26)
  note('pia', 'cello', 'F3', 19, 0, 6, 0.3)
  const catchAt = sec(T.LINKS[T.N - 1].start + T.PLAN[T.N - 1].catch)
  const releaseAt = sec(T.LINKS[T.N - 1].start + T.PLAN[T.N - 1].release)
  for (let t = catchAt + 0.05, k = 0; t < releaseAt - 0.04; t += 0.1, k++) {
    out.push({ voice: 'wren', inst: 'harp', midi: P(k % 2 ? 'Bb5' : 'F5'), at: t, dur: 0.1, vel: 0.22 + 0.06 * Math.sin(k), damp: true })
  }
  // bar 20: home, as the sheet lands, all four at once
  note('sol', 'clarinet', 'Eb5', 20, 0, 6, 0.56)
  note('yuna', 'horn', 'G4', 20, 0, 6, 0.54)
  note('pia', 'cello', 'Eb3', 20, 0, 12, 0.52)
  ;['Eb4', 'G4', 'Bb4', 'Eb5', 'G5'].forEach((p, k) => out.push({ voice: 'wren', inst: 'harp', midi: P(p), at: 19 * BAR + 0.035 * k, dur: 2.4, vel: 0.5 }))
  // bar 21: each flip of the cascade sounds its writer's note, on its frame
  const inst = { sol: 'clarinet', wren: 'harp', pia: 'cello', yuna: 'horn' }
  T.events().filter((e) => e.kind === 'flip').forEach((e) => {
    out.push({ voice: e.writer, inst: inst[e.writer], midi: P(e.note), at: sec(e.f), dur: sec(T.LINE) - sec(e.f) + 0.6, vel: 0.46, flip: true })
  })
  // bars 22 to 25: the ground under the wall; the clarinet remembers the tune's head
  note('pia', 'cello', 'G3', 22, 0, 6, 0.26)
  note('pia', 'cello', 'Ab3', 23, 0, 6, 0.24)
  note('pia', 'cello', 'G3', 24, 0, 6, 0.22)
  note('pia', 'cello', 'F3', 25, 0, 2, 0.2)
  note('sol', 'clarinet', 'Eb5', 22, 0, 6, 0.28)
  note('sol', 'clarinet', 'C5', 23, 0, 6, 0.26)
  note('sol', 'clarinet', 'Bb4', 24, 0, 2, 0.26)
  note('sol', 'clarinet', 'G4', 24, 2, 2, 0.24)
  note('sol', 'clarinet', 'C5', 24, 4, 2, 0.25)
  note('sol', 'clarinet', 'Bb4', 25, 0, 2, 0.22)
  // the bass: a pluck on each bar's first beat, the whole way round
  const BASS = (bar) => (bar === 19 ? 0.36 : bar >= 15 && bar <= 20 ? 0.62 : bar >= 22 ? 0.42 : 0.5)
  for (let bar = 1; bar <= 25; bar++) note('bass', 'pizz', ROOT[chordOf(bar)], bar, 0, bar === 25 ? 3 : 6, BASS(bar), { damp: bar === 25 })
  // the waltz: a soft strum on beats two and three, until the walk takes over
  const VOICING = { Eb: ['Bb3', 'Eb4', 'G4'], 'Bb/D': ['Bb3', 'D4', 'F4'], Cm: ['C4', 'Eb4', 'G4'], Ab: ['C4', 'Eb4', 'Ab4'] }
  // (the bar before the loop keeps only its first beat, a breath before the
  // landing: the file starts on its last beat, and the first 21 ms of a file
  // are where an AAC encoder's priming goes)
  for (let bar = 1; bar <= 24; bar++) {
    if (bar >= 11 && bar <= 21) continue
    const v = VOICING[chordOf(bar)]
    for (const beat of [1, 2]) v.forEach((p, k) => out.push({ voice: 'waltz', inst: 'strum', midi: P(p), at: (bar - 1) * BAR + beat * 0.4 + 0.012 * k, dur: 0.38, vel: 0.3 + 0.04 * (beat === 1), damp: true }))
  }
  return out
}

// ── the check ──────────────────────────────────────────────────────────────
// The sounding pitch of every voice on every eighth of bars 3 to 21; on each
// downbeat every voice on a tone of its chord; between any two voices no
// parallel fifths or octaves, no unison on a downbeat. The walk is broken
// chords and is held only to the downbeats.
function check() {
  const notes = scoreNotes().filter((n) => !n.damp && n.voice !== 'waltz')
  const at = (voice, e) => {
    const t = e * EIGHTH + 1e-6
    const n = notes.filter((x) => x.voice === voice && x.at <= t && x.at + x.dur > t).sort((a, b) => b.at - a.at)[0]
    return n ? n : null
  }
  const voices = ['bass', 'pia', 'yuna', 'sol', 'wren']
  const bad = []
  let shown = ''
  for (let bar = 3; bar <= 21; bar++) {
    const ch = CHORD[chordOf(bar)]
    const row = []
    for (let k = 0; k < 6; k++) {
      const e = (bar - 1) * 6 + k
      const now = voices.map((v) => at(v, e))
      row.push(now.map((n) => (n ? nameOf(n.midi).padEnd(4) : '.   ')).join(' '))
      if (k === 0) now.forEach((n, i) => { if (n && !ch.includes(n.midi % 12)) bad.push(`bar ${bar}: ${voices[i]} ${nameOf(n.midi)} is not in ${chordOf(bar)}`) })
      // pairs
      const prev = voices.map((v) => at(v, e - 1))
      for (let i = 0; i < voices.length; i++) for (let j = i + 1; j < voices.length; j++) {
        const a = now[i], b = now[j], a0 = prev[i], b0 = prev[j]
        if (!a || !b) continue
        const walk = a.phrase === 'walk' || b.phrase === 'walk'
        if (walk && k !== 0) continue
        if (k === 0 && a.midi === b.midi) bad.push(`bar ${bar}: ${voices[i]} and ${voices[j]} in unison on ${nameOf(a.midi)}`)
        if (!a0 || !b0 || a0 === a || b0 === b || walk) continue
        const i0 = Math.abs(a0.midi - b0.midi) % 12
        const i1 = Math.abs(a.midi - b.midi) % 12
        if ((i0 === 7 && i1 === 7) || (i0 === 0 && i1 === 0)) bad.push(`bar ${bar}.${k}: ${voices[i]} and ${voices[j]} in parallel ${i1 ? 'fifths' : 'octaves'} (${nameOf(a0.midi)} ${nameOf(b0.midi)} to ${nameOf(a.midi)} ${nameOf(b.midi)})`)
      }
    }
    shown += `bar ${String(bar).padStart(2)} ${chordOf(bar).padEnd(6)} | ${row[0]}\n`
  }
  console.log(`            ${voices.map((v) => v.padEnd(4)).join(' ')}`)
  console.log(shown)
  console.log(bad.length ? bad.join('\n') : 'the round is clean: chord tones on every downbeat, no parallel fifths or octaves, no unisons')
  return bad.length
}

if (process.argv[2] === '--check') process.exit(check() ? 1 : 0)

// ── the recordings ─────────────────────────────────────────────────────────
// File names give each note in one of two octave conventions: VSCO's strings,
// winds and brass and VCSL's strumstick name middle C `C3` (as Yamaha does);
// the harp and the glockenspiel name it `C4`. Each was measured.
const KIT = {
  clarinet: { dir: 'vsco/Woodwinds/Clarinet/susLong', re: /_([A-G]#?)(\d)_v(\d)_rr\d/, yamaha: true, sus: true, release: 0.16 },
  horn: { dir: 'vsco/Brass/F Horn/sus', re: /_([A-G]#?)(\d)_v(\d)_\d\.wav$/, yamaha: true, sus: true, release: 0.24 },
  cello: { dir: 'vsco/Strings/Cello Section/susvib', re: /susvib_([A-G]#?)(\d)_v(\d)_\d/, yamaha: true, sus: true, release: 0.28 },
  harp: { dir: 'vsco/Strings/Harp', re: /KSHarp_([A-G]#?)(\d)_/, ring: 3.2 },
  pizz: { dir: 'vsco/Strings/Solo Contrabass/Pizz', re: /_([A-G]#?)(\d)_v(\d)_rr\d/, yamaha: true, ring: 1.5 },
  strum: { dir: 'vcsl/Chordophones/Composite Chordophones/Strumstick/Finger', re: /_([A-G]#?)(\d)_vl(\d)_rr\d/, yamaha: true, ring: 1.6 },
  glock: { dir: 'vsco/Percussion/Glock', re: /glock_medium_([A-G]#?)(\d)/, ring: 3.0 },
}
const ONESHOT = {
  claves: 'vsco/VSCO 1 Percussion/varWood/claves_mf.wav',
  clavesSoft: 'vsco/VSCO 1 Percussion/varWood/claves_pp1.wav',
  clavesMid: 'vsco/VSCO 1 Percussion/varWood/claves_mp.wav',
  ratchet: 'vsco/Percussion/Ratchet1-Fast_v1_rr1_Sum.wav',
  triangle: 'vsco/Percussion/Triangle3-HitM_v1_rr1_Sum.wav',
  shaker: "vsco/VSCO 1 Percussion/varWood/Camo's Shaker/shake1.wav",
}

function readWav(path) {
  const b = readFileSync(path)
  let o = 12
  let fmt = null
  let data = null
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4)
    const size = b.readUInt32LE(o + 4)
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(o + 8), ch: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }
    if (id === 'data') data = [o + 8, Math.min(size, b.length - o - 8)]
    o += 8 + size + (size & 1)
  }
  const { ch, bits, rate } = fmt
  const float = fmt.tag === 3
  const step = (bits / 8) * ch
  const n = Math.floor(data[1] / step)
  const out = [new Float32Array(n), new Float32Array(n)]
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const p = data[0] + i * step + Math.min(c, ch - 1) * (bits / 8)
      let v
      if (float) v = b.readFloatLE(p)
      else if (bits === 16) v = b.readInt16LE(p) / 32768
      else if (bits === 24) v = b.readIntLE(p, 3) / 8388608
      else v = b.readInt32LE(p) / 2147483648
      out[c][i] = v
    }
  }
  return { ch: out, rate }
}
function writeWav(path, L, R) {
  const n = L.length
  const b = Buffer.alloc(44 + n * 8)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 8, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(2, 22)
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 8, 28); b.writeUInt16LE(8, 32); b.writeUInt16LE(32, 34)
  b.write('data', 36); b.writeUInt32LE(n * 8, 40)
  for (let i = 0; i < n; i++) { b.writeFloatLE(L[i], 44 + i * 8); b.writeFloatLE(R[i], 48 + i * 8) }
  writeFileSync(path, b)
}
// where the sound starts: the first sample above a fiftieth of the peak, less 2 ms
function onset(w) {
  let peak = 0
  for (const c of w.ch) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]))
  for (let i = 0; i < w.ch[0].length; i++) if (Math.max(Math.abs(w.ch[0][i]), Math.abs(w.ch[1][i])) > peak * 0.02) return Math.max(0, i - Math.round(0.002 * w.rate))
  return 0
}
// how long a recording takes to speak: from its onset to half the peak of its
// first 600 ms, on a 10 ms envelope (a cello section swells for most of a
// beat; a harp is there at once)
function lead(w, start) {
  const n = Math.round(0.6 * w.rate)
  const k = Math.round(0.01 * w.rate)
  const env = new Float32Array(n)
  let acc = 0
  for (let i = 0; i < n; i++) {
    const j = start + i
    acc += Math.max(Math.abs(w.ch[0][j] || 0), Math.abs(w.ch[1][j] || 0))
    if (i >= k) acc -= Math.max(Math.abs(w.ch[0][j - k] || 0), Math.abs(w.ch[1][j - k] || 0))
    env[i] = acc / k
  }
  let top = 0
  for (let i = 0; i < n; i++) top = Math.max(top, env[i])
  for (let i = 0; i < n; i++) if (env[i] >= top / 2) return Math.max(0, i - k / 2) / w.rate
  return 0
}
function loadKit(root) {
  const kit = {}
  for (const [name, d] of Object.entries(KIT)) {
    const dir = join(root, d.dir)
    const zones = []
    for (const f of readdirSync(dir).sort()) {
      const m = d.re.exec(f)
      if (!f.endsWith('.wav') || !m) continue
      const w = readWav(join(dir, f))
      const start = onset(w)
      // its loudness over the first second, to order the layers
      let e = 0
      const end = Math.min(w.ch[0].length, start + w.rate)
      for (let i = start; i < end; i++) e += w.ch[0][i] ** 2 + w.ch[1][i] ** 2
      zones.push({ midi: 12 * (+m[2] + (d.yamaha ? 2 : 1)) + PC[m[1]], w, start, lead: lead(w, start), rms: Math.sqrt(e / Math.max(1, end - start)), file: f })
    }
    kit[name] = { ...d, zones }
  }
  const one = {}
  for (const [name, f] of Object.entries(ONESHOT)) { const w = readWav(join(root, f)); one[name] = { w, start: onset(w) } }
  return { kit, one }
}

// ── the player ─────────────────────────────────────────────────────────────
// A seeded hand: the same small unevenness every time the score is made.
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const rand = rng(1114)
const gauss = () => { let u = 0; for (let k = 0; k < 6; k++) u += rand(); return (u - 3) / Math.SQRT2 }

function makeBus() { return [new Float32Array(N), new Float32Array(N)] }
// a recording laid into a bus at time t, resampled by `ratio` (cubic), under an
// envelope, panned by balance; wraps round the loop
function lay(bus, w, start, t, { ratio = 1, gain = 1, pan = 0, len = Infinity, fadeIn = 0.003, fadeOut = 0.05, hold = Infinity } = {}) {
  const src = w.ch
  const r = (ratio * w.rate) / SR
  const avail = Math.floor((src[0].length - start - 3) / r)
  const n = Math.min(avail, Math.round(len * SR))
  if (n <= 0) return
  const i0 = Math.round(t * SR)
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2
  const fi = Math.max(1, Math.round(fadeIn * SR))
  const ho = Math.min(n, Math.round(hold * SR))
  const fo = Math.max(1, Math.round(fadeOut * SR))
  for (let k = 0; k < n; k++) {
    let env = k < fi ? k / fi : 1
    if (k >= ho) { const u = (k - ho) / fo; if (u >= 1) break; env *= 0.5 + 0.5 * Math.cos(Math.PI * u) }
    if (k > n - fo && ho >= n) env *= (n - k) / fo
    const x = start + k * r
    const i = Math.floor(x)
    const f = x - i
    for (let c = 0; c < 2; c++) {
      const s = src[c]
      const y0 = s[Math.max(0, i - 1)], y1 = s[i], y2 = s[i + 1], y3 = s[i + 2]
      const v = y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)))
      bus[c][(((i0 + k) % N) + N) % N] += v * env * (c ? gr : gl)
    }
  }
}
// the nearest recorded note, its layer by how hard it is played, a round robin by chance
function pick(inst, midi, vel) {
  const zs = inst.zones
  let best = Infinity
  for (const z of zs) best = Math.min(best, Math.abs(z.midi - midi))
  const near = zs.filter((z) => Math.abs(z.midi - midi) === best)
  const pitch = near.find((z) => z.midi >= midi) ? near.find((z) => z.midi >= midi).midi : near[0].midi
  const layers = [...new Set(zs.filter((z) => z.midi === pitch).map((z) => Math.round(z.rms * 1e6)))].sort((a, b) => a - b)
  const want = layers[Math.min(layers.length - 1, Math.round(vel * (layers.length - 1)))]
  const pool = zs.filter((z) => z.midi === pitch && Math.round(z.rms * 1e6) === want)
  return pool[Math.floor(rand() * pool.length)]
}
function playNote(bus, kit, n, { pan = 0, gain = 1 } = {}) {
  const inst = kit[n.inst]
  const z = pick(inst, n.midi, n.vel)
  const ratio = 2 ** ((n.midi - z.midi) / 12)
  // a hand: a few milliseconds early or late, a little louder or softer
  const t = n.at + (n.flip ? 0 : Math.max(-0.012, Math.min(0.012, gauss() * 0.005)))
  const g = gain * (0.45 + 0.75 * n.vel) * (1 + gauss() * 0.04)
  // loudness evened across the recordings, so a layer changes colour more than level
  const even = 0.12 / Math.max(0.02, z.rms)
  if (inst.sus) {
    // a slow speaker is started a little into its swell, and a little early,
    // as a player leans into the beat; then held, overlapping the next, and let go
    const skip = 0.4 * z.lead
    const early = Math.min(0.12, 0.55 * z.lead)
    lay(bus, z.w, z.start + Math.round(skip * z.w.rate), t - early, { ratio, gain: g * even, pan, hold: n.dur + 0.02 + early, fadeOut: inst.release, fadeIn: 0.012 })
  } else {
    lay(bus, z.w, z.start, t, { ratio, gain: g * even, pan, len: inst.ring, hold: n.damp ? n.dur + 0.06 : Infinity, fadeOut: n.damp ? 0.12 : 0.4 })
  }
}

// ── the room ───────────────────────────────────────────────────────────────
// An impulse made in code: early reflections, then a decorrelated tail
// falling 60 dB in `rt` seconds, its highs dying faster than its lows.
function impulse(rt, len, seed) {
  const r = rng(seed)
  const g = () => { let u = 0; for (let k = 0; k < 6; k++) u += r(); return u - 3 }
  const n = Math.round(len * SR)
  const out = [new Float32Array(n), new Float32Array(n)]
  for (let c = 0; c < 2; c++) {
    const ir = out[c]
    for (let k = 0; k < 14; k++) {
      const t = 0.006 + r() * 0.07
      ir[Math.round(t * SR)] += (r() < 0.5 ? -1 : 1) * 0.5 * (1 - t / 0.09)
    }
    let lp = 0
    for (let i = Math.round(0.018 * SR); i < n; i++) {
      const t = i / SR
      const cut = 9000 * Math.exp(-t * 1.3) + 900
      const a = 1 - Math.exp((-2 * Math.PI * cut) / SR)
      lp += a * (g() - lp)
      const rise = Math.min(1, (t - 0.018) / 0.03)
      ir[i] += lp * Math.exp((-6.91 * t) / rt) * rise * 0.6
    }
    let e = 0
    for (let i = 0; i < n; i++) e += ir[i] * ir[i]
    const k = 1 / Math.sqrt(e)
    for (let i = 0; i < n; i++) ir[i] *= k
  }
  return out
}
function fft(re, im, inv) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t }
  }
  const cs = new Float64Array(n / 2)
  const sn = new Float64Array(n / 2)
  for (let k = 0; k < n / 2; k++) { cs[k] = Math.cos((2 * Math.PI * k) / n); sn[k] = (inv ? 1 : -1) * Math.sin((2 * Math.PI * k) / n) }
  for (let len = 2; len <= n; len <<= 1) {
    const h = len >> 1
    const st = n / len
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < h; j++) {
        const wr = cs[j * st], wi = sn[j * st]
        const a = i + j, b = a + h
        const vr = re[b] * wr - im[b] * wi
        const vi = re[b] * wi + im[b] * wr
        re[b] = re[a] - vr; im[b] = im[a] - vi
        re[a] += vr; im[a] += vi
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
}
// a bus through the room, round the loop: its mid into the two ears' impulses
function reverb(bus, ir, wet) {
  let F = 1
  while (F < N + ir[0].length) F <<= 1
  const xr = new Float64Array(F), xi = new Float64Array(F)
  for (let i = 0; i < N; i++) xr[i] = 0.5 * (bus[0][i] + bus[1][i])
  fft(xr, xi, false)
  const zr = new Float64Array(F), zi = new Float64Array(F)
  for (let i = 0; i < ir[0].length; i++) { zr[i] = ir[0][i]; zi[i] = ir[1][i] }
  fft(zr, zi, false)
  // the two impulses out of one transform, times the signal, back as one
  const yr = new Float64Array(F), yi = new Float64Array(F)
  for (let k = 0; k < F; k++) {
    const m = (F - k) % F
    const lr = 0.5 * (zr[k] + zr[m]), li = 0.5 * (zi[k] - zi[m])
    const rr = 0.5 * (zi[k] + zi[m]), ri = -0.5 * (zr[k] - zr[m])
    const ar = xr[k] * lr - xi[k] * li, ai = xr[k] * li + xi[k] * lr
    const br = xr[k] * rr - xi[k] * ri, bi = xr[k] * ri + xi[k] * rr
    yr[k] = ar - bi; yi[k] = ai + br
  }
  fft(yr, yi, true)
  const out = makeBus()
  for (let i = 0; i < N + ir[0].length - 1; i++) { out[0][i % N] += yr[i] * wet; out[1][i % N] += yi[i] * wet }
  return out
}

// ── the machine ────────────────────────────────────────────────────────────
// Only the moments: each landing's dry click, the hinge catching and letting
// go, the cascade's modules, the clock's plates, the keys, the tap that sends,
// the colour turning. The places under it are kept to a breath.
function foley(one, kit) {
  const buses = {}
  let bus = null
  const into = (kind) => { bus = buses[kind] || (buses[kind] = makeBus()) }
  const ev = T.events()
  const clav = one.claves, soft = one.clavesSoft, mid = one.clavesMid
  const thump = (t, g) => {
    // the flap's weight: a low knock under the click
    const n = Math.round(0.09 * SR), i0 = Math.round(t * SR)
    for (let k = 0; k < n; k++) {
      const v = Math.sin((2 * Math.PI * 92 * k) / SR) * Math.exp(-k / (0.018 * SR)) * g
      bus[0][(i0 + k) % N] += v; bus[1][(i0 + k) % N] += v
    }
  }
  const tick = (t, g, f0, pan) => {
    // a key's tick: a few milliseconds of noise, rung at f0
    const n = Math.round(0.02 * SR), i0 = Math.round(t * SR)
    let y1 = 0, y2 = 0
    const w = (2 * Math.PI * f0) / SR, q = 0.985
    for (let k = 0; k < n; k++) {
      const x = (rand() * 2 - 1) * Math.exp(-k / (0.0015 * SR))
      const y = x + 2 * q * Math.cos(w) * y1 - q * q * y2
      y2 = y1; y1 = y
      const v = y * g * 0.06
      bus[0][(i0 + k) % N] += v * (1 - pan) * 0.7; bus[1][(i0 + k) % N] += v * (1 + pan) * 0.7
    }
  }
  for (const e of ev) {
    const t = sec(e.f)
    into(e.kind)
    if (e.kind === 'clack') {
      const big = e.to === 'sheet' || e.to === 'loop'
      lay(bus, clav.w, clav.start, t, { ratio: 2 ** (-4 / 12), gain: big ? 1.15 : 1 })
      lay(bus, soft.w, soft.start, t, { ratio: 2 ** (8 / 12), gain: 0.36 })
      thump(t, big ? 0.6 : 0.5)
    }
    if (e.kind === 'catch') {
      lay(bus, one.ratchet.w, one.ratchet.start, t, { gain: 0.16, len: 0.16, fadeOut: 0.06, hold: 0.1 })
      // the pane on its pin: a degree, two, five
      ;[4, 11, 19].forEach((d, k) => lay(bus, soft.w, soft.start, t + sec(d), { ratio: 2 ** ((10 - k * 2) / 12), gain: 0.06 + 0.03 * k }))
    }
    if (e.kind === 'release') lay(bus, soft.w, soft.start, t, { ratio: 2 ** (3 / 12), gain: 0.16 })
    if (e.kind === 'flip') {
      lay(bus, mid.w, mid.start, t, { ratio: 2 ** (5 / 12), gain: 0.2, pan: -0.3 + 0.2 * T.LINKS.findIndex((L) => L.writer === e.writer) })
    }
    if (e.kind === 'fold') lay(bus, soft.w, soft.start, t, { ratio: 2 ** (14 / 12), gain: 0.07, pan: -0.5 })
    if (e.kind === 'key') tick(t, 0.5 + 0.2 * rand(), 2600 + 900 * rand(), -0.3)
    if (e.kind === 'send') lay(bus, mid.w, mid.start, t, { ratio: 2 ** (-7 / 12), gain: 0.16, pan: -0.3 })
    if (e.kind === 'latch') { lay(bus, soft.w, soft.start, t, { ratio: 2 ** (12 / 12), gain: 0.07, pan: 0.3 }); lay(bus, one.triangle.w, one.triangle.start, t, { ratio: 1.5, gain: 0.02, len: 0.12, pan: 0.3 }) }
    if (e.kind === 'chime') lay(bus, kit.glock.zones.find((z) => z.midi === P('G5')).w, kit.glock.zones.find((z) => z.midi === P('G5')).start, t, { gain: 0.1, pan: 0.4, len: 2.5 })
    if (e.kind === 'lockup') {
      const g5 = kit.glock.zones.find((z) => z.midi === P('G5'))
      const c6 = kit.glock.zones.find((z) => z.midi === P('C6'))
      lay(bus, c6.w, c6.start, t, { ratio: 2 ** (3 / 12), gain: 0.14, len: 3 })
      lay(bus, g5.w, g5.start, t + 0.012, { ratio: 2 ** (12 / 12), gain: 0.08, len: 3 })
    }
    if (e.kind === 'flood') {
      // the colour turning cell by cell: quick at the phone, slower into the corners
      for (let k = 0; k < 28; k++) {
        const u = 1 - Math.pow(1 - (k + rand()) / 28, 1 / 1.6)
        lay(bus, soft.w, soft.start, t + u * sec(e.frames), { ratio: 2 ** ((19 + rand() * 5) / 12), gain: 0.035 * (1 - 0.6 * u), pan: (rand() - 0.5) * 0.8 })
      }
    }
  }
  return buses
}

// The places, a breath each: the 51B's motor and the streetlights going by,
// the café's room, the wind on the hospital roof, the bakery's oven and the
// first birds. Each world sounds while it is on screen, under the writer
// (the half below) more than above.
function places() {
  const bus = makeBus()
  const R = rng(51)
  // which world is seen at frame f, and how much (1 below, 0.45 above)
  const seen = (f) => {
    const fr = T.frameAt(f)
    const w = {}
    if (fr.bottom) w[fr.bottom.world] = 1
    if (fr.top) w[fr.top.world] = Math.max(w[fr.top.world] || 0, 0.45)
    if (fr.flap && fr.flap.back && fr.flap.back.world != null) w[fr.flap.back.world] = Math.max(w[fr.flap.back.world] || 0, 0.6)
    return w
  }
  const lev = Array.from({ length: 6 }, () => new Float32Array(T.FRAMES))
  for (let f = 0; f < T.FRAMES; f++) { const w = seen(f); for (const k in w) lev[k][f] = w[k] }
  // smoothed over a third of a second, round the loop
  const level = (k, i) => {
    const x = (i / SR) * FPS
    const f0 = Math.floor(x), u = x - f0
    let s = 0
    for (let d = -5; d <= 6; d++) s += lev[k][(((f0 + d) % T.FRAMES) + T.FRAMES) % T.FRAMES] * Math.max(0, 1 - Math.abs(d - u) / 6)
    return s / 6
  }
  // one pass of a noise colour through two one poles, run twice round so the loop is seamless
  const noise = (lo, hi, seed) => {
    const r = rng(seed)
    const out = new Float32Array(N)
    const al = 1 - Math.exp((-2 * Math.PI * hi) / SR), ah = 1 - Math.exp((-2 * Math.PI * lo) / SR)
    let a = 0, b = 0
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) { a += al * (r() * 2 - 1 - a); b += ah * (a - b); out[i] = a - b }
    let e = 0
    for (let i = 0; i < N; i++) e += out[i] * out[i]
    const k = 1 / Math.sqrt(e / N)
    for (let i = 0; i < N; i++) out[i] *= k
    return out
  }
  const motor = noise(30, 260, 2), cafe = noise(120, 1800, 3), wind = noise(300, 2400, 4), oven = noise(60, 700, 5)
  const BUS = 0, CAFE = 1, ROOF = 3, BAKERY = 5
  for (let i = 0; i < N; i++) {
    const t = i / SR
    const lb = level(BUS, i), lc = level(CAFE, i), lr = level(ROOF, i), lk = level(BAKERY, i)
    let l = 0, r = 0
    if (lb) {
      // the motor, and its whine rising and falling with the traffic
      const whine = Math.sin(2 * Math.PI * (612 * t + 9 * Math.sin(2 * Math.PI * 0.21 * t))) * 0.05
      const hum = Math.sin(2 * Math.PI * 49 * t) * 0.35 + Math.sin(2 * Math.PI * 98 * t) * 0.15
      const v = lb * 0.012 * (motor[i] + hum + whine)
      l += v; r += v
    }
    if (lc) { const v = lc * 0.0035 * cafe[i]; l += v; r += v * 0.9 }
    if (lr) {
      const gust = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.13 * t + 1.3) * Math.sin(2 * Math.PI * 0.071 * t)
      l += lr * 0.006 * gust * wind[i]; r += lr * 0.006 * gust * wind[(i + 4801) % N]
    }
    if (lk) { const v = lk * 0.004 * (oven[i] + 0.3 * Math.sin(2 * Math.PI * 120 * t)); l += v; r += v }
    bus[0][i] = l; bus[1][i] = r
  }
  // the streetlights and the poles going past the bus windows
  T.events().filter((e) => e.kind === 'pole' || e.kind === 'streetlight').forEach((e) => {
    const i0 = Math.round(sec(e.f) * SR), n = Math.round(0.42 * SR)
    for (let k = 0; k < n; k++) {
      const u = k / n
      const env = Math.sin(Math.PI * u) ** 2 * 0.006
      const v = wind[(i0 * 7 + k) % N] * env
      bus[0][(i0 + k) % N] += v * (1.2 - u); bus[1][(i0 + k) % N] += v * (0.2 + u)
    }
  })
  // the first birds while the bakery is in the picture: a few short calls
  for (let f = 0; f < T.FRAMES; f += 3) {
    if (lev[BAKERY][f] < 0.4 || R() > 0.05 * lev[BAKERY][f]) continue
    const i0 = Math.round(sec(f) * SR)
    const f0 = 3200 + R() * 1600, n = Math.round((0.05 + R() * 0.06) * SR), pan = R() * 0.8 - 0.1
    let ph = 0
    for (let k = 0; k < n; k++) {
      const u = k / n
      ph += (2 * Math.PI * f0 * (1 + 0.35 * Math.sin(Math.PI * u) - 0.2 * u)) / SR
      const v = Math.sin(ph) * Math.sin(Math.PI * u) ** 2 * 0.004 * lev[BAKERY][f]
      bus[0][(i0 + k) % N] += v * (1 - pan); bus[1][(i0 + k) % N] += v * (1 + pan)
    }
  }
  return bus
}

// ── the master ─────────────────────────────────────────────────────────────
// Peaks held to a ceiling before the loudness is set, so the two pass
// normalisation can stay linear (no compression of its own).
function limit(L, R, ceiling) {
  const look = Math.round(0.004 * SR)
  const rel = Math.exp(-1 / (0.09 * SR))
  const need = new Float32Array(N)
  for (let i = 0; i < N; i++) need[i] = Math.min(1, ceiling / Math.max(1e-9, Math.abs(L[i]), Math.abs(R[i])))
  // the least gain over the look ahead, then a smooth return
  const g = new Float32Array(N)
  let cur = 1
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N; i++) {
      let m = 1
      for (let k = 0; k <= look; k += 4) m = Math.min(m, need[(i + k) % N])
      cur = m < cur ? m : m + (cur - m) * rel
      g[i] = cur
    }
  }
  for (let i = 0; i < N; i++) { L[i] *= g[i]; R[i] *= g[i] }
}
// ffmpeg writes its loudness report on stderr
function measure(path) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
  return JSON.parse(/\{[^{}]*\}/.exec(r.stderr)[0])
}
// how loud a bus is: its RMS over a span of the loop, and its peak
function rmsOf(bus, t0 = 0, t1 = N / SR) {
  let e = 0
  const a = Math.round(t0 * SR), b = Math.round(t1 * SR)
  for (let i = a; i < b; i++) e += bus[0][i] ** 2 + bus[1][i] ** 2
  return Math.sqrt(e / (2 * Math.max(1, b - a)))
}
function peakOf(bus) {
  let p = 0
  for (let i = 0; i < N; i++) p = Math.max(p, Math.abs(bus[0][i]), Math.abs(bus[1][i]))
  return p
}
const dB = (x) => 20 * Math.log10(Math.max(1e-12, x))
// each kind of sound set against the round: its peak this many dB over the
// round's RMS (the places, their RMS this far under it)
const LEVELS = { clack: 13, catch: 6, release: 3, flip: 8, fold: -3, key: -6, send: 3, latch: -4, chime: 3, lockup: 8, flood: -9 }
const PLACES = -21

function main() {
  const [root, outPath] = process.argv.slice(2)
  if (!root || !outPath) { console.log('node score.mjs <samples> <out.wav>  or  node score.mjs --check'); process.exit(1) }
  const t0 = Date.now()
  const { kit, one } = loadKit(root)
  console.log('recordings', Object.entries(kit).map(([k, v]) => `${k} ${v.zones.length}`).join(', '), `(${Date.now() - t0} ms)`)
  // the score
  const music = makeBus()
  const notes = scoreNotes()
  for (const n of notes) {
    const v = VOICES[n.voice]
    const pan = v ? v.pan : n.voice === 'bass' ? 0 : n.voice === 'waltz' ? 0.22 : 0
    const gain = v ? v.gain : n.voice === 'bass' ? 1.1 : n.voice === 'waltz' ? 0.42 : 1
    playNote(music, kit, n, { pan, gain })
  }
  console.log(`${notes.length} notes`)
  // the round's own loudness, bars 3 to 18, is what everything is set against
  const ref = rmsOf(music, 2 * BAR, 18 * BAR)
  const fol = makeBus()
  for (const [kind, b] of Object.entries(foley(one, kit))) {
    if (!(kind in LEVELS)) continue
    const k = (ref * 10 ** (LEVELS[kind] / 20)) / Math.max(1e-9, peakOf(b))
    for (let i = 0; i < N; i++) { fol[0][i] += b[0][i] * k; fol[1][i] += b[1][i] * k }
    console.log(`  ${kind.padEnd(8)} peak ${LEVELS[kind] > 0 ? '+' : ''}${LEVELS[kind]} dB on the round`)
  }
  const air = places()
  // the places by their loudest second
  let loud = 0
  for (let t = 0; t + 1 <= N / SR; t += 0.25) loud = Math.max(loud, rmsOf(air, t, t + 1))
  const ka = (ref * 10 ** (PLACES / 20)) / Math.max(1e-9, loud)
  for (let i = 0; i < N; i++) { air[0][i] *= ka; air[1][i] *= ka }
  const hall = impulse(1.9, 2.6, 7)
  const room = impulse(0.7, 1.0, 8)
  const mw = reverb(music, hall, 0.24)
  const fw = reverb(fol, room, 0.14)
  // (ROUND_STEMS=<dir> keeps each bus as its own file, in film time, for a look)
  if (process.env.ROUND_STEMS) {
    const d = process.env.ROUND_STEMS
    const stems = { music, room: mw, foley: fol, places: air }
    for (const [k, b] of Object.entries(stems)) writeWav(join(d, `${k}.wav`), b[0], b[1])
  }
  const L = new Float32Array(N), R = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    L[i] = music[0][i] + mw[0][i] + fol[0][i] + fw[0][i] + air[0][i]
    R[i] = music[1][i] + mw[1][i] + fol[1][i] + fw[1][i] + air[1][i]
  }
  // measure, hold the peaks to 12 dB over the loudness, set the loudness
  const tmp = mkdtempSync(join(tmpdir(), 'round-score-'))
  const raw = join(tmp, 'raw.wav')
  let peak = 0
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  for (let i = 0; i < N; i++) { L[i] *= 0.5 / peak; R[i] *= 0.5 / peak }
  writeWav(raw, L, R)
  const m0 = measure(raw)
  const ceiling = 10 ** ((+m0.input_i + 11.5) / 20)
  limit(L, R, ceiling)
  // turned to start where the file does, at the loop flap's release
  const off = Math.round(sec(T.FILE_START) * SR)
  const turn = (x) => { const y = new Float32Array(N); for (let i = 0; i < N; i++) y[i] = x[(i + off) % N]; return y }
  const FL = turn(L), FR = turn(R)
  writeWav(raw, FL, FR)
  const m1 = measure(raw)
  const af = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true:print_format=json`
  const r2 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', '-i', raw, '-af', af, '-ar', String(SR), '-c:a', 'pcm_s24le', outPath], { encoding: 'utf8' })
  const m2 = JSON.parse(/\{[^{}]*\}/.exec(r2.stderr)[0])
  rmSync(tmp, { recursive: true, force: true })
  console.log(`loudness ${m1.input_i} LUFS, peak ${m1.input_tp} dBTP before; ${m2.normalization_type} to ${m2.output_i} LUFS, ${m2.output_tp} dBTP`)
  console.log(`wrote ${outPath} in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
}
main()

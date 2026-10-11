#!/usr/bin/env node
// sound.mjs: the third reel's sounds, effects only, so a song can be laid
// over them. Each sound is a recording in ../sounds (NOTICE.md says whose),
// laid on the frame it belongs to, the whole given a little room and set
// near -30 LUFS, the first two reels' level.
//
//   node scripts/sound.mjs [public/sound.wav]
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'public/sound.wav')
const FPS = 30
// where each scene begins in the film (Reel.tsx: DUR less the transitions)
const G = { hook: 0, dance: 150 - 14, sea: 150 - 14 + 420 - 10, nobody: 150 - 14 + 420 - 10 + 80 }
G.end = G.nobody + 100 - 14
const TOTAL = G.end + 110
const sec = (frame) => frame / FPS
// where each swell is loudest, in seconds into its recording
const CREST = { 'cymbal-swell-short': 1.02, 'cymbal-swell': 3.58 }

const ev = []
// a recording at `at` seconds: `from` and `len` of it, its gain, faded
const lay = (name, at, { gain = 0.3, from = 0, len = null, fadeIn = 0, fadeOut = 0, rev = false } = {}) => ev.push({ name, at, gain, from, len, fadeIn, fadeOut, rev })
// a swell laid so it is loudest on `at`, `lead` seconds of it
const swell = (name, at, gain, lead = CREST[name]) => lay(name, at - lead, { gain, from: CREST[name] - lead, len: lead + 0.35, fadeIn: lead * 0.6, fadeOut: 0.3 })
const key = (frame, gain) => lay('tap', sec(frame), { gain })

// the hook: the roses there at once, and a bowed cymbal under `so nobody does`
lay('bass-drum-soft', 0, { gain: 0.35 })
lay('gong-soft', 0.02, { gain: 0.12, len: 5, fadeOut: 3 })
lay('bowed-cymbal', sec(100), { gain: 0.13, len: 4, fadeIn: 0.8, fadeOut: 1.5 })
// both write it, a key at a time, the two in step; both delete it
for (let i = 0; i < 10; i++) key(G.dance + 24 + 3 * i, 0.22)
for (let i = 0; i < 10; i++) key(G.dance + 96 + 2 * i, 0.1)
// the jolt back, drawn in; typed again; sent, the two keys; into the notes
swell('cymbal-swell-short', sec(G.dance + 158), 0.22, 0.5)
for (let i = 0; i < 10; i++) key(G.dance + 164 + 2 * i, 0.2)
key(G.dance + 196, 0.45)
key(G.dance + 200, 0.45)
swell('cymbal-swell-short', sec(G.dance + 224), 0.18, 0.6)
// saturday at nine; the two halves close and the notes meet: a swell
// landing on the drum and the gong
lay('bass-drum-soft', sec(G.dance + 298), { gain: 0.22 })
swell('cymbal-swell', sec(G.dance + 336), 0.42, 2.2)
lay('bass-drum', sec(G.dance + 336), { gain: 0.55, len: 5, fadeOut: 2 })
lay('gong-soft', sec(G.dance + 337), { gain: 0.28, len: 6, fadeOut: 3 })
// the sea
lay('ocean-drum', sec(G.sea), { gain: 0.16, len: 3.2, fadeIn: 0.6, fadeOut: 1 })
// one note, gone: the gong drawn in, backwards, to the moment it goes
lay('gong-soft', sec(G.nobody + 58) - 1.3, { gain: 0.16, from: 0, len: 1.3, rev: true, fadeIn: 0.8 })
// the name
lay('bass-drum-soft', sec(G.end + 46), { gain: 0.32 })
lay('gong-soft', sec(G.end + 47), { gain: 0.2, len: 4, fadeOut: 2.5 })

const args = ['-v', 'error', '-y']
const chains = []
ev.forEach((e, i) => {
  args.push('-ss', String(Math.max(0, e.from)))
  if (e.len) args.push('-t', String(e.len))
  args.push('-i', join(root, 'sounds', `${e.name}.ogg`))
  const at = Math.max(0, e.at)
  const f = ['aformat=sample_rates=48000:channel_layouts=stereo']
  if (e.rev) f.push('areverse')
  if (e.fadeIn) f.push(`afade=t=in:d=${e.fadeIn}`)
  if (e.fadeOut && e.len) f.push(`afade=t=out:st=${Math.max(0, e.len - e.fadeOut)}:d=${e.fadeOut}`)
  f.push(`volume=${e.gain}`, `adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}`)
  chains.push(`[${i}:a]${f.join(',')}[e${i}]`)
})
const mix = `${ev.map((_, i) => `[e${i}]`).join('')}amix=inputs=${ev.length}:normalize=0:duration=longest,aecho=0.8:0.6:70|130|210:0.22|0.14|0.08,highpass=f=28,atrim=0:${sec(TOTAL)},afade=t=out:st=${sec(TOTAL) - 1.4}:d=1.4,loudnorm=I=-30:TP=-2:LRA=18[out]`
args.push('-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', out)
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status || 1)
console.log(out.replace(`${root}/`, ''), `${sec(TOTAL).toFixed(2)}s`)

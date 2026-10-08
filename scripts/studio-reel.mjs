#!/usr/bin/env node
// studio-reel.mjs: the reel, photographed in parallel and finished.
//
// A frame of the reel takes seconds to draw (a wall of real screens, each
// blurred by its depth; shaders drawn on the processor), so the frames are
// shared out among a few photographers at once (studio-film.mjs `--frames`),
// each its own browser on its own run of the film. Then one pass of ffmpeg
// lays the score under them and finishes the picture as a lens and a film
// would: the lights bloom, the colours part by a pixel at the edges, and a
// grain moves over it. Two cuts come out of the one run of frames:
//
//   design/campaign/<id>.mp4      thirty frames a second, each two of the
//                                 sixty laid over each other, as a shutter
//                                 open half the frame blurs what moves
//   design/campaign/<id>-60.mp4   the sixty, sharp
//
//   node scripts/studio-reel.mjs celestual-reel [--jobs 2] [--fps 60] [--keep]
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MS } from '../app/src/studio/parts/reel-time.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const id = args.find((a) => !a.startsWith('--')) || 'celestual-reel'
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
// two: the browsers draw on the processor, and each already spreads its
// drawing over every core, so a third only makes all three wait on each
// other (on four cores, three ran each frame slower than one alone)
const jobs = Number(opt('jobs', 2))
const fps = Number(opt('fps', 60))
const ms = Number(opt('ms', MS))
const scratch = process.env.FRAMES || join(root, '.studio-frames', id)
const outDir = process.env.OUT || join(root, 'design/campaign')
const wav = join(outDir, `${id}.wav`)

const run = (cmd, a) => new Promise((ok, no) => {
  const p = spawn(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], cwd: root })
  p.stdout.on('data', (d) => process.stdout.write(String(d)))
  p.on('close', (c) => (c === 0 ? ok() : no(new Error(`${cmd} ${c}`))))
})

const total = Math.round((ms / 1000) * fps)
if (!args.includes('--encode-only')) {
  // the score first: it is made in a second or two from the same clock
  await run('node', ['scripts/studio-score.mjs', wav])
  if (existsSync(scratch) && !args.includes('--resume')) rmSync(scratch, { recursive: true })
  mkdirSync(scratch, { recursive: true })
  const have = new Set(readdirSync(scratch))
  const shares = []
  for (let k = 0; k < jobs; k++) {
    const a = Math.floor((k * total) / jobs)
    const z = Math.floor(((k + 1) * total) / jobs) - 1
    // a share already photographed whole is not taken again
    let todo = a
    while (todo <= z && have.has(`f${String(todo).padStart(5, '0')}.jpg`)) todo++
    if (todo <= z) shares.push([todo, z])
  }
  console.log(`${id}: ${total} frames at ${fps}fps in ${shares.length} shares`)
  // started a few seconds apart, so the servers' first compiles do not all
  // land on the processor at once
  await Promise.all(shares.map(([a, z], k) => new Promise((r) => setTimeout(r, k * 6000))
    .then(() => run('node', ['scripts/studio-film.mjs', id, '--fps', String(fps), '--frames', scratch, '--first', String(a), '--last', String(z)]))))
}

// ── the finish ──────────────────────────────────────────────────────────────
// in RGB, so the light adds as light: bloom (the frame a quarter size,
// blurred, laid back over it in screen), the red and blue a pixel apart, and
// a grain of the film's own that moves
const fc = (tail) => [
  '[0:v]format=gbrp,split=2[a][b]',
  '[b]scale=iw/4:ih/4:flags=bilinear,gblur=sigma=10,scale=1080:1920:flags=bicubic[g]',
  `[a][g]blend=all_mode=screen:all_opacity=0.24,rgbashift=rh=-1:bh=1,noise=c0s=5:c0f=t${tail ? `,${tail}` : ''},format=yuv420p[v]`,
].join(';')
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart']
const input = ['-framerate', String(fps), '-i', join(scratch, 'f%05d.jpg'), '-i', wav]
console.log('finishing')
// the thirty: each frame the sixty's 2k and 2k+1 laid over each other, so a
// cut on a bar (always an even frame of the sixty) is never half one shot
// and half the next
const half = spawnSync('ffmpeg', ['-v', 'error', '-y', ...input, '-filter_complex', fc('tmix=frames=2,select=mod(n\\,2),setpts=N/(30*TB)'), '-map', '[v]', '-map', '1:a', '-r', '30', '-crf', '19', ...enc, join(outDir, `${id}.mp4`)], { stdio: 'inherit' })
if (half.status !== 0) throw new Error('ffmpeg, the thirty')
const full = spawnSync('ffmpeg', ['-v', 'error', '-y', ...input, '-filter_complex', fc(''), '-map', '[v]', '-map', '1:a', '-crf', '20', ...enc, join(outDir, `${id}-60.mp4`)], { stdio: 'inherit' })
if (full.status !== 0) throw new Error('ffmpeg, the sixty')
if (!args.includes('--keep')) rmSync(scratch, { recursive: true })
console.log(`${outDir.replace(`${root}/`, '')}/${id}.mp4 and ${id}-60.mp4`)

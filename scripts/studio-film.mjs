#!/usr/bin/env node
// studio-film.mjs: a film off the studio page, a frame at a time.
//
// A film is a module in app/src/studio/films/ whose `Film` is drawn from its
// `t` and nothing else (index.jsx). This opens /studio.html?film=<id>, and
// for every frame tells the page the moment (`window.__seek`), photographs
// the board and hands the picture to ffmpeg, so the film is exactly its
// frames, at its own rate, however long each took to draw.
//
//   node scripts/studio-film.mjs <id>                    the whole film
//   node scripts/studio-film.mjs <id> --stills 0,4000    those moments, as PNGs
//   node scripts/studio-film.mjs <id> --from 3000 --to 6000 --fps 15
//   AUDIO=file.wav node scripts/studio-film.mjs <id>     with a sound track
//
// Writes design/campaign/<id>.mp4 (H.264, yuv420p, faststart), or OUT=dir.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { studio } from './studio.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.env.OUT || join(root, 'design/campaign')
const args = process.argv.slice(2)
const id = args.find((a) => !a.startsWith('--') && !/^[\d,.-]+$/.test(a))
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null }
if (!id) { console.error('studio-film: which film?'); process.exit(1) }

const s = await studio()
try {
  const { films } = await s.list()
  const f = films.find((x) => x.id === id)
  if (!f) throw new Error(`studio-film: no film ${id} (there are ${films.map((x) => x.id).join(', ') || 'none'})`)
  const scale = Number(opt('scale')) || 1
  const page = await s.pageAt(scale)
  await s.open(page, `film=${encodeURIComponent(id)}`, f.w, f.h)
  const clip = await page.locator('.st-board').first().boundingBox()
  const grab = (type = 'png') => page.screenshot({ type, ...(type === 'jpeg' ? { quality: 96 } : {}), clip: { x: clip.x, y: clip.y, width: f.w, height: f.h } })
  mkdirSync(out, { recursive: true })

  const stills = opt('stills')
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate((ms) => window.__seek(ms), t)
      const file = join(out, `${id}-${String(t).padStart(5, '0')}.png`)
      writeFileSync(file, await grab('png'))
      console.log(file.replace(`${root}/`, ''))
    }
  } else {
    const fps = Number(opt('fps')) || f.fps || 30
    const from = Number(opt('from')) || 0
    const to = Number(opt('to')) || f.ms
    const n = Math.round(((to - from) / 1000) * fps)
    const file = join(out, `${id}${opt('suffix') || ''}.mp4`)
    const audio = process.env.AUDIO && existsSync(process.env.AUDIO) ? ['-i', process.env.AUDIO] : []
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', ...audio,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-vf', `scale=${f.w * scale}:${f.h * scale}:flags=lanczos`,
      ...(audio.length ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-movflags', '+faststart', file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] })
    const t0 = Date.now()
    for (let i = 0; i < n; i++) {
      const t = from + (i * 1000) / fps
      await page.evaluate((ms) => window.__seek(ms), t)
      const buf = await grab('png')
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 30 === 0) process.stdout.write(`\r${id}: frame ${i + 1}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    ff.stdin.end()
    await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))))
    console.log(`\n${file.replace(`${root}/`, '')}  ${n} frames at ${fps}fps`)
  }
  if (page.problems.length) console.log(page.problems.map((m) => `   ! ${m.slice(0, 300)}`).join('\n'))
} finally {
  await s.close()
}

// Render the final cut to PNG frames for the encode, in the delivered file's
// order: `node render.mjs <outdir> [jobs]`. It serves the repo, opens the dev
// bench's render page in headless Chromium with the studio's flags (software
// GL, no hinting, every compositor stage before a draw), and has each page
// draw frames off one queue. A frame already on disk is skipped, so a stopped
// render picks up where it was. Two jobs suit four cores; a third is slower.
import http from 'node:http'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import { FRAMES, cutFrame } from './round-time.js'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const [,, outDir = 'frames', jobsArg = '2'] = process.argv
const JOBS = Math.max(1, +jobsArg)
const ROOT = new URL('../../../../', import.meta.url).pathname
const PORT = 8771
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }
const FLAGS = [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--font-render-hinting=none', '--run-all-compositor-stages-before-draw', '--disable-checker-imaging',
  '--force-gpu-mem-available-mb=6144', '--force-gpu-mem-discardable-limit-mb=4096',
]

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  if (!url.startsWith('/repo/') || url.includes('..')) { res.writeHead(404); return res.end() }
  try {
    const body = await readFile(join(ROOT, url.slice(6)))
    res.writeHead(200, { 'content-type': TYPES[extname(url)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch { res.writeHead(404); res.end() }
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
await mkdir(outDir, { recursive: true })

const name = (k) => join(outDir, `${String(k).padStart(4, '0')}.png`)
const exists = (p) => access(p).then(() => true, () => false)
const todo = []
for (let k = 0; k < FRAMES; k++) if (!(await exists(name(k)))) todo.push(k)
console.log(`${FRAMES - todo.length} frames on disk, ${todo.length} to draw, ${JOBS} jobs`)

const browser = await chromium.launch({ args: FLAGS })
const t0 = Date.now()
let done = 0
async function job() {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, timezoneId: 'America/Los_Angeles' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[error]', e.message))
  await page.goto(`http://127.0.0.1:${PORT}/repo/design/campaign/next/page/round-dev.html?serve`)
  await page.waitForFunction(() => window.__render, null, { timeout: 120000 })
  while (todo.length) {
    const k = todo.shift()
    const url = await page.evaluate((f) => window.__render(f), cutFrame('file', k))
    await writeFile(name(k), Buffer.from(url.split(',')[1], 'base64'))
    done++
    if (done % 25 === 0) {
      const per = (Date.now() - t0) / done
      console.log(`${done} drawn, ${(per / 1000).toFixed(2)} s a frame, about ${Math.round((todo.length * per) / 60000)} min to go`)
    }
  }
  await ctx.close()
}
await Promise.all(Array.from({ length: JOBS }, job))
await browser.close()
server.close()
console.log(`drew ${done} frames in ${Math.round((Date.now() - t0) / 1000)} s`)

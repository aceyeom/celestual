// Photograph round's posters from the bench (posters.html) at a pixel ratio:
// `node posters.mjs <outdir> [ratio] [name...]`. Ratio 2 makes the 2160 by
// 2700 masters, 1 the 1080 by 1350 copies. With no names, the three chosen.
import http from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const [,, outDir = 'posters', ratioArg = '2', ...given] = process.argv
const DPR = +ratioArg || 2
const NAMES = given.length ? given : ['letter', 'wall', 'clock']
const ROOT = new URL('../../../../', import.meta.url).pathname
const PORT = 8773
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' }

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
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'] })
for (const name of NAMES) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: DPR, timezoneId: 'America/Los_Angeles' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[error]', e.message))
  await page.goto(`http://127.0.0.1:${PORT}/repo/design/campaign/next/page/posters.html?p=${name}`)
  await page.waitForFunction(() => window.__done, null, { timeout: 300000 })
  await page.locator('#poster').screenshot({ path: join(outDir, `${name}.png`) })
  console.log('wrote', join(outDir, `${name}.png`))
  await ctx.close()
}
await browser.close()
server.close()

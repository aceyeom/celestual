#!/usr/bin/env node
// studio.mjs: the campaign's pictures, photographed off the studio page.
//
// Every poster is a module in app/src/studio/posters/ drawn with the
// product's own parts (app/src/studio/kit.jsx: the wall's `Screen`, the
// stories, the brand's cells, the faces). This serves the app through its
// own Vite, as darkroom.mjs does, opens /studio.html?p=<id> at the poster's
// size, waits for it to be whole (index.jsx `whole`) and photographs the
// board.
//
//   node scripts/studio.mjs                  every poster
//   node scripts/studio.mjs ig-01 li-02      these
//   node scripts/studio.mjs --sheet          and the contact sheet of all
//   OUT=dir node scripts/studio.mjs          somewhere other than design/campaign
//
// A poster's `scale` is how many device pixels to its CSS pixel (1 unless it
// says), and its `kind` is `png` or `jpg`. npm --prefix app install first.
import { createServer as createHttp } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const app = join(root, 'app')
const out = process.env.OUT || join(root, 'design/campaign')

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium'
  return undefined
}

export async function studio() {
  const req = createRequire(join(app, 'package.json'))
  const vite = await import(pathToFileURL(join(dirname(req.resolve('vite/package.json')), 'dist/node/index.js')).href)
  const server = await vite.createServer({
    root: app, configFile: join(app, 'vite.config.js'), logLevel: 'error', appType: 'mpa',
    server: { middlewareMode: true, hmr: false, ws: false },
  })
  const http = createHttp((rq, rs) => server.middlewares(rq, rs, () => rs.writeHead(404).end()))
  await new Promise((done) => http.listen(0, '127.0.0.1', done))
  const base = `http://127.0.0.1:${http.address().port}`
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'],
  })
  const pages = new Map()
  async function pageAt(scale) {
    if (pages.has(scale)) return pages.get(scale)
    const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: scale })
    page.problems = []
    page.on('pageerror', (e) => { if (!/WebSocket/.test(String(e))) page.problems.push(String(e)) })
    page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text())) page.problems.push(m.text()) })
    pages.set(scale, page)
    return page
  }
  async function open(page, query, w, h) {
    await page.setViewportSize({ width: Math.max(200, Math.ceil(w)), height: Math.max(200, Math.ceil(h)) })
    await page.goto(`${base}/studio.html?${query}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 })
  }
  async function list() {
    const page = await pageAt(1)
    await open(page, 'list=1', 400, 400)
    return { posters: await page.evaluate(() => window.__studio.list()), films: await page.evaluate(() => window.__studio.films()) }
  }
  async function shoot(p) {
    const page = await pageAt(p.scale || 1)
    page.problems.length = 0
    await open(page, `p=${encodeURIComponent(p.id)}`, p.w, p.h)
    const clip = await page.locator('.st-board').first().boundingBox()
    const opts = p.kind === 'jpg' ? { type: 'jpeg', quality: 93 } : { type: 'png' }
    const buf = await page.screenshot({ ...opts, clip: { x: clip.x, y: clip.y, width: p.w, height: p.h } })
    return { buf, problems: [...page.problems] }
  }
  async function close() {
    await browser.close()
    http.close()
    await server.close()
  }
  return { base, browser, pageAt, open, list, shoot, close }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const want = args.filter((a) => !a.startsWith('--'))
  const s = await studio()
  try {
    const { posters } = await s.list()
    const todo = posters.filter((p) => (want.length ? want.includes(p.id) : !p.id.startsWith('_')))
    if (!todo.length) console.log('no posters match', want.join(' '))
    mkdirSync(out, { recursive: true })
    for (const p of todo) {
      const t0 = Date.now()
      const { buf, problems } = await s.shoot(p)
      const file = join(out, `${p.id}.${p.kind === 'jpg' ? 'jpg' : 'png'}`)
      writeFileSync(file, buf)
      console.log(file.replace(`${root}/`, '').padEnd(46), `${p.w * (p.scale || 1)}×${p.h * (p.scale || 1)}`.padEnd(11), `${(buf.length / 1024).toFixed(0)} KB`.padEnd(8), `${Date.now() - t0}ms`)
      for (const m of problems) console.log('   ! ', m.slice(0, 300))
    }
  } finally {
    await s.close()
  }
}

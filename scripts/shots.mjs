#!/usr/bin/env node
// shots.mjs - the visual loop in docs/rebuild-spec.md 7.3, as one command.
//
// Build a surface, run this, open both files, and look at them. A surface that
// has not been viewed is not finished, whatever the build says.
//
// It serves the repository over http rather than opening files off disk, for
// two reasons: design/components.html reads its own stylesheet back to show the
// states a still frame cannot show, and a browser refuses to do that on a
// file: URL; and a dev server is what the app itself needs anyway.
//
//   node scripts/shots.mjs components          the component sheet
//   node scripts/shots.mjs /signature          a route on the dev server
//   node scripts/shots.mjs /signature reveal   ...saved under that name
//
// Two viewports, both from 7.3: 390x844 and 1440x900.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/shots')
mkdirSync(out, { recursive: true })

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, scale: 3 },
  { name: 'desk', width: 1440, height: 900, scale: 2 },
]

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
}

// A static server over the repository, and nothing more. It is only ever bound
// to the loopback interface for the length of one screenshot run, but a path
// that can escape the root is still a path that can escape the root, so the
// normalised path is checked before anything is opened.
function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '')
      let file = join(root, rel)
      if (!file.startsWith(root)) { res.writeHead(403).end(); return }
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
      if (!existsSync(file)) { res.writeHead(404).end('not found'); return }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
      createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// Which Chromium to drive. Playwright's own by default. Where the machine
// already has one (a CI image, this repository's cloud sandbox), point
// CHROMIUM_PATH at it, or let PLAYWRIGHT_BROWSERS_PATH be found: a playwright
// that expects a build the image does not carry otherwise fails at launch with
// a message about downloading browsers, which is the wrong advice there.
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium')
  return undefined
}

const target = process.argv[2] || 'components'
const label = process.argv[3] || (target === 'components' ? 'components' : target.replace(/^\/+/, '').replace(/\//g, '-') || 'root')

// A path is a route on the app's own dev server. A bare word is a page in the
// repository, which today means the component sheet.
const isRoute = target.startsWith('/')
const base = isRoute ? (process.env.DEV_URL || 'http://localhost:5173') : null

const server = isRoute ? null : await serve()
const url = isRoute ? base + target : `http://127.0.0.1:${server.address().port}/design/components.html`

const browser = await chromium.launch({ executablePath: chromiumPath() })
const made = []

for (const v of VIEWPORTS) {
  // A route is shot at the viewport, at the device's own pixel ratio, because
  // a hairline and a 9px label are the two things a critique turns on. A whole
  // reference page is shot at 1: it is already several thousand pixels tall and
  // three times that is a file nobody opens.
  const page = await browser.newPage({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: isRoute ? v.scale : 1,
  })
  const problems = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('pageerror', (e) => problems.push(String(e)))

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // One second of settle. Entrances in this system run to 900ms and a shot
  // taken before they land is a shot of a surface mid-flight.
  await page.waitForTimeout(1100)

  const file = join(out, `${label}-${v.name}.png`)
  await page.screenshot({ path: file, fullPage: !isRoute })
  made.push(`design/shots/${label}-${v.name}.png`)

  if (problems.length) {
    console.error(`\n  ${v.name}: ${problems.length} console error${problems.length === 1 ? '' : 's'}`)
    for (const p of problems.slice(0, 8)) console.error(`    ${p}`)
  }
  await page.close()
}

await browser.close()
if (server) server.close()

console.log(made.join('\n'))

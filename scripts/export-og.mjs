#!/usr/bin/env node
// export-og.mjs: the picture a link to celestual.us unfurls into, out of the
// system that draws everything else.
//
// docs/rebuild-spec.md section 8 puts the share thumbnail in scope. The first
// one was the old design's (an amber accent, an italic serif, a glowing four
// point star and an em dash), and the second was the lockup alone on the old
// blue black. Neither was the product anybody arriving from the link would
// land in, which is a black room with a phone screen left on in it. So this is
// that room: #000, one night screen lit in it, the pixel mark on the screen as
// the intro draws it, and beside it the lockup in the room's own hand.
//
// ── WHY IT IS GENERATED AND NOT DRAWN ────────────────────────────────────────
// The mark is nine constants and two path builders in app/src/wall/mark.js,
// the pixel mark is pixmark.js cut from them, the screen is screen.css with
// the night skin and a phone's quirks from looks.js, and the faces are the
// ones in app/public/fonts. A hand made PNG is a copy of all of that which
// falls behind the day any of it changes, and a card that disagrees with the
// page it links to is worse than none. So the card is a page: this serves the
// repository over http for as long as the shot takes, writes a page that links
// the real stylesheet and imports the real modules, builds the screen the way
// screen.jsx builds one, and photographs it with Playwright's Chromium.
//
// ── AND WHY IT IS A PNG ──────────────────────────────────────────────────────
// Every scraper (Facebook, X, iMessage, LinkedIn, Slack) renders a raster and
// none of them renders SVG. A blank card silently kills the product's main
// growth surface, which is a link somebody sends to one other person.
//
// ── THE COMPOSITION ──────────────────────────────────────────────────────────
// The screen and the name, and nothing else. A preview is seen at the size of
// a thumb beside the description the page already sends, and at that size a
// sentence is a smear; the mark on a lit screen and the word beside it read
// at a hundred pixels wide. The screen is the intro's (seed `intro`, held
// square as the intro holds it, the mark's cells drawn in the panel's own ink
// with its unlit dots faintly there), and it throws its light on the room.
// The lockup is set as everywhere (DESIGN.md 3.3): the mark 1.13 times the
// word, 0.38em between them, the word lifted 0.03em onto the mark's axis, in
// chalk with the mark's own hair of light.
//
// scripts/export-mail.mjs draws the mail's header from the same page.
//
// Run: node scripts/export-og.mjs
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, extname, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium')
  return undefined
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}

// The repository over the loopback interface, and the card at `/__card`.
function serve(html) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(req.url.split('?')[0])
      if (path === '/__card') {
        res.writeHead(200, { 'content-type': TYPES['.html'] }).end(html)
        return
      }
      const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''))
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
      createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// ── the page ─────────────────────────────────────────────────────────────────
// `width` and `height` are the picture's; `screen` is the screen's width and
// `word` the word's size, in its pixels; `gap` is between the screen and the
// lockup. The screen is built by the script at the foot from the modules the
// product runs on.
function card({ width, height, screen, word, gap, lift = 0 }) {
  const mark = Math.round(word * 1.13)
  return `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="/app/public/fonts/faces.css">
<link rel="stylesheet" href="/app/src/wall/screen.css">
<link rel="stylesheet" href="/app/src/wall/story.css">
<style>
  html, body { margin: 0; background: #000; }
  .card {
    --f-s40: 'Jersey 10', 'Geist Mono', ui-monospace, monospace;
    --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    position: relative; width: ${width}px; height: ${height}px; overflow: hidden; background: #000;
    display: flex; align-items: center; justify-content: center; gap: ${gap}px;
    -webkit-font-smoothing: antialiased;
  }
  /* the one light in the room is the screen's, falling on the dark round it
     in the screen's colour (screen.css .wl-room-light) */
  .room {
    position: absolute; left: var(--lx); top: 50%; width: ${Math.round(screen * 3.4)}px; aspect-ratio: 1;
    transform: translate(-50%, -50%);
    background: radial-gradient(closest-side, var(--halo) 0%, color-mix(in srgb, var(--halo) 40%, transparent) 38%, transparent 100%);
  }
  .phone { position: relative; width: ${screen}px; transform: translateY(${lift}px); }
  .phone .wl-scr { transform: none; }
  .lockup { position: relative; display: inline-flex; align-items: center; gap: ${Math.round(word * 0.38)}px; color: #F4F1EA; }
  .lockup svg { display: block; width: ${mark}px; height: ${mark}px; filter: drop-shadow(0 0 ${Math.round(word * 0.2)}px rgba(244, 241, 234, 0.18)); }
  .word {
    font-family: 'Newsreader', 'Iowan Old Style', Palatino, Georgia, serif;
    font-weight: 500; font-size: ${word}px; line-height: 1; letter-spacing: -0.022em;
    transform: translateY(-0.03em); opacity: 0.94;
  }
  /* the sensor's grain over the whole photograph, as the shared picture has */
  .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.07; mix-blend-mode: screen; }
</style>
<div class="card">
  <span class="room"></span>
  <div class="phone" id="phone"></div>
  <div class="lockup" id="lockup"><span class="word">celestual.</span></div>
  <svg class="grain" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>
</div>
<script type="module">
  import { colourOf, skinOf, skinVars, quirks, glyphPath } from '/app/src/wall/looks.js'
  import { markCells, MARK_CUT } from '/app/src/wall/pixmark.js'
  import { eclipticSVG, CHALK } from '/app/src/wall/mark.js'

  // the lockup: the favicon's own drawing, in chalk
  document.getElementById('lockup').insertAdjacentHTML('afterbegin', eclipticSVG(CHALK))

  // the screen, the way screen.jsx \`Screen\` builds one: the night skin, the
  // intro's phone, held square (PixelStory.jsx \`SQUARE\`)
  const colour = colourOf({ tint: 'night' })
  const s = skinOf(colour)
  const q = quirks('intro')
  const vars = { ...skinVars(colour), ...q.vars, '--q-rx': '0deg', '--q-ry': '0deg', '--q-rz': '0deg' }
  const pix = (name, h) => {
    const g = glyphPath(name)
    return '<svg class="wl-px" viewBox="0 0 ' + g.w + ' ' + g.h + '" shape-rendering="crispEdges" style="height:' + h + 'cqw;width:' + ((h * g.w) / g.h).toFixed(2) + 'cqw"><path d="' + g.d + '"/></svg>'
  }
  const phone = document.getElementById('phone')
  phone.innerHTML = '<div class="wl-scene" data-kind="lit" data-colour="night">'
    + '<span class="wl-scene-halo"></span><span class="wl-scene-halo-2"></span>'
    + '<div class="wl-scr-press"><div class="wl-scr" data-kind="lit">'
    + '<div class="wl-scr-bg"></div>'
    + '<div class="wl-scr-top"><div class="wl-scr-r1"><span class="wl-scr-ant wl-lit-g">' + pix('ant', 9) + '</span>'
    + '<span class="wl-scr-bat wl-lit-g">' + pix('bata4', 8) + '</span></div><div class="wl-scr-r2"></div></div>'
    + '<div class="wl-scr-body"><div class="wl-story"><canvas class="wl-story-cv"></canvas></div></div>'
    + '<div class="wl-scr-bot"></div>'
    + '<span class="wl-scr-fx is-light"></span><span class="wl-scr-fx is-streak"></span>'
    + '<span class="wl-scr-fx is-glass"></span><span class="wl-scr-fx is-glare"></span><span class="wl-scr-fx is-shine"></span>'
    + '</div></div></div>'
  const scene = phone.firstChild
  for (const [k, v] of Object.entries(vars)) scene.style.setProperty(k, v)
  document.querySelector('.room').style.setProperty('--halo', vars['--s-halo'])
  document.querySelector('.card').style.setProperty('--lx', (phone.offsetLeft + phone.offsetWidth / 2) + 'px')

  // the mark, in the panel's own dots (PixelStory.jsx \`paint\`): the whole
  // body a grid of them at a whole number of device pixels each, the unlit
  // ones a breath of the ink, and the mark's cells in the ink, in the middle
  const body = phone.querySelector('.wl-story')
  const cv = phone.querySelector('canvas')
  const dpr = window.devicePixelRatio || 1
  const w = body.clientWidth
  const h = body.clientHeight
  const cell = Math.max(1, Math.floor(Math.min((w * dpr) / 57, (h * dpr) / 45)))
  const gap = cell >= 6 ? Math.max(1, Math.round(cell * 0.14)) : cell >= 3 ? 1 : 0
  const pc = Math.floor((w * dpr) / cell)
  const pr = Math.floor((h * dpr) / cell)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = w + 'px'
  cv.style.height = h + 'px'
  const g = cv.getContext('2d')
  const mx = (cv.width - pc * cell) >> 1
  const my = (cv.height - pr * cell) >> 1
  const { list, n } = markCells(47, MARK_CUT)
  const ox = (pc - n) >> 1
  const oy = (pr - n) >> 1
  const lit = new Set(list.map((c) => (c.y + oy) * pc + (c.x + ox)))
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(s.ink.slice(i, i + 2), 16))
  for (let i = 0; i < pc * pr; i++) {
    g.fillStyle = lit.has(i) ? s.ink : 'rgba(' + r + ', ' + gg + ', ' + b + ', 0.07)'
    g.fillRect(mx + (i % pc) * cell, my + Math.floor(i / pc) * cell, cell - gap, cell - gap)
  }
  document.fonts.ready.then(() => { document.body.dataset.ready = '' })
</script>`
}

// ── the shot ─────────────────────────────────────────────────────────────────
export async function shoot(opts, out) {
  const server = await serve(card(opts))
  const browser = await chromium.launch({ executablePath: chromiumPath() })
  const page = await browser.newPage({ viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: 1 })
  const problems = []
  page.on('pageerror', (e) => problems.push(String(e)))
  await page.goto(`http://127.0.0.1:${server.address().port}/__card`, { waitUntil: 'networkidle' })
  await page.waitForSelector('body[data-ready]', { timeout: 10000 })
  await page.waitForTimeout(300)
  mkdirSync(dirname(out), { recursive: true })
  await page.locator('.card').screenshot({ path: out })
  await browser.close()
  server.close()
  if (problems.length) throw new Error(problems.join('\n'))
}

// 1200 by 630, the size every scraper asks for
export const OG = { width: 1200, height: 630, screen: 334, word: 104, gap: 88 }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = join(root, 'app/public/og.png')
  await shoot(OG, out)
  // the old og.svg went with it: no scraper reads one
  const stale = join(root, 'app/public/og.svg')
  if (existsSync(stale)) writeFileSync(stale, '')
  console.log('app/public/og.png')
}

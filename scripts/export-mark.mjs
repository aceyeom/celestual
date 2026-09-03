#!/usr/bin/env node
// export-mark.mjs - the logo, out of the code that draws it.
//
// The mark is not a drawn asset. It is nine constants and two path builders in
// app/src/wall/mark.js, so there is no vector file to hunt for and no risk that
// an exported one falls behind the build. This script imports those exports and
// writes design/logo/ from them, which means the file a printer is handed and
// the shape on the screen cannot disagree.
//
// SVG is written straight from the geometry. PNG is rendered by the same
// headless Chromium the screenshot loop uses, so the anti-aliasing on a 1024px
// export is a browser's rather than a rasteriser nobody configured.
//
// Run: node scripts/export-mark.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { eclipticSVG, INK, CHALK } from '../app/src/wall/mark.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/logo')
mkdirSync(out, { recursive: true })

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
const exe = chromiumPath()

// The mark, at a size, on a ground. `currentColor` is the one the app embeds:
// the component takes its colour from whatever it is inside, and the file
// should be able to do the same.
function svg(fill, px) {
  const body = eclipticSVG(fill)
    .replace('<svg ', `<svg width="${px}" height="${px}" `)
  return body
}

const GROUNDS = [
  { name: 'chalk', fill: CHALK, on: 'void', behind: '#08070B' },
  { name: 'ink', fill: INK, on: 'chalk', behind: '#F4F1EA' },
]

// The vector. One file per ground plus the one that inherits, which is three
// files and covers every placement this brand has.
writeFileSync(join(out, 'mark.svg'), svg('currentColor', 512) + '\n')
for (const g of GROUNDS) writeFileSync(join(out, `mark-${g.name}.svg`), svg(g.fill, 512) + '\n')

// The lockup, as markup rather than as geometry: the word is type, and type in
// a vector file is either a live font reference or an outline nobody can edit.
// It stays live, and the PNG beside it is the one to hand somebody who does not
// have the face installed.
function lockup(fill, px) {
  const mark = eclipticSVG(fill).replace('<svg ', `<svg width="${px}" height="${px}" `)
  return `<div class="lock" style="color:${fill}">${mark}<span class="w">celestual.</span></div>`
}

const faces = readFileSync(join(root, 'app/public/fonts/faces.css'), 'utf8')
  .replace(/url\('\.\//g, `url('${pathToFileURL(join(root, 'app/public/fonts')).href}/`)

function page(html, behind) {
  return `<!doctype html><meta charset="utf-8"><style>
    ${faces}
    html,body{margin:0;padding:0;background:${behind === 'none' ? 'transparent' : behind}}
    body{display:inline-block}
    /* the specimen sheet sets the mark one eighth larger than the word it
       stands beside, and design/source/eclipse.html is where that ratio comes
       from. 106 and 120 is the same 1.13 at export scale. */
    .lock{display:inline-flex;align-items:center;gap:0.38em;line-height:1;font-size:106px}
    .lock svg{display:block;flex:0 0 auto}
    .w{font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:600;font-variation-settings:'opsz' 24;letter-spacing:-0.018em;
       line-height:1;white-space:nowrap;transform:translateY(-0.03em)}
    .m{display:block}
  </style>${html}`
}

const browser = await chromium.launch({ executablePath: exe })
const made = []

for (const g of GROUNDS) {
  // The mark alone, transparent, at the three sizes anything ever asks for.
  for (const px of [1024, 512, 128]) {
    const p = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
    await p.setContent(page(`<div class="m">${svg(g.fill, px)}</div>`, 'none'))
    const file = `mark-${g.name}-${px}.png`
    await p.locator('.m').screenshot({ path: join(out, file), omitBackground: true })
    await p.close()
    made.push(file)
  }

  // And on its own ground, which is what a deck or a favicon preview wants.
  const p = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 })
  await p.setContent(page(`<div class="m" style="padding:180px;background:${g.behind}">${svg(g.fill, 664)}</div>`, g.behind))
  const onGround = `mark-${g.name}-on-${g.on}-1024.png`
  await p.locator('.m').screenshot({ path: join(out, onGround) })
  await p.close()
  made.push(onGround)

  // The lockup, twice: transparent for placement, and on its ground.
  const l = await browser.newPage({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 2 })
  await l.setContent(page(lockup(g.fill, 120), 'none'))
  await l.evaluate(() => document.fonts.ready)
  const lockFile = `lockup-${g.name}.png`
  await l.locator('.lock').screenshot({ path: join(out, lockFile), omitBackground: true })
  await l.close()
  made.push(lockFile)
}

await browser.close()

// The lockup as markup, for anywhere the face is available.
writeFileSync(join(out, 'lockup.html'), page(lockup('currentColor', 120), 'transparent') + '\n')

// ── the tab's icon ───────────────────────────────────────────────────────────
// Phase 8. The wall injects this drawing as a data URI at runtime, which means
// every route that is not the wall showed `star.svg`, the retired mark, and
// showed it before any JavaScript ran on every route including the wall's.
//
// It is a static file now, linked from app/index.html, so the tab is right on
// the first paint of every address and the injection is a no-op that agrees
// with it. Ink with a prefers-color-scheme rule handing it chalk on a dark tab
// strip: a browser reports the scheme to an icon document the same way it does
// to a page, and one drawing has to be visible on both.
writeFileSync(join(root, 'app/public/icon.svg'), eclipticSVG(INK, CHALK) + '\n')

// And the same drawing in chalk, for use ON A PAGE rather than on a tab strip.
// The two are not interchangeable and the screenshot pass is what showed it:
// icon.svg is ink first, so used as an <img> on the void it rendered a mark
// nobody could see. Its dark-mode rule does not save it there, because that
// media query is evaluated against the IMAGE document's own scheme, not the
// page's. The legal pages read this one.
writeFileSync(join(root, 'app/public/mark.svg'), eclipticSVG(CHALK) + '\n')

console.log(`design/logo/\n  ${['mark.svg', 'mark-chalk.svg', 'mark-ink.svg', 'lockup.html', ...made].join('\n  ')}`)
console.log('app/public/icon.svg\napp/public/mark.svg')

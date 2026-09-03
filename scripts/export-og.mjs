#!/usr/bin/env node
// export-og.mjs: the share thumbnail, out of the system that draws everything
// else.
//
// docs/rebuild-spec.md section 8 puts the share thumbnail in scope. The one
// that shipped was the old design's: a warm amber accent, an italic serif, a
// glowing four point star and an em dash in the copy. This writes the new one.
//
// ── WHY IT IS GENERATED AND NOT DRAWN ────────────────────────────────────────
// Same argument as scripts/export-mark.mjs. The mark is nine constants and two
// path builders in app/src/wall/mark.js, the palette is wall.css, and the faces
// are the four in app/public/fonts. A hand made PNG is a copy of all three that
// falls behind the day any of them changes, and a share card that disagrees
// with the page it links to is worse than none.
//
// ── AND WHY IT IS A PNG ──────────────────────────────────────────────────────
// Every scraper (Facebook, X, iMessage, LinkedIn, Slack) renders a raster and
// none of them renders SVG. A blank card silently kills the product's main
// growth surface, which is a link somebody sends to one other person.
//
// Run: node scripts/export-og.mjs
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { eclipticSVG, CHALK } from '../app/src/wall/mark.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium')
  return undefined
}

const faces = readFileSync(join(root, 'app/public/fonts/faces.css'), 'utf8')
  .replace(/url\('\.\//g, `url('${pathToFileURL(join(root, 'app/public/fonts')).href}/`)

// wall.css, verbatim. Nothing here invents a value.
const VOID = '#08070B'
const ASH = '#9C978E'
const HAIR = 'rgba(244, 241, 234, 0.09)'

// The sentence is the hero's, with its own three line break. A share card that
// says something the page does not say is a share card promising a different
// product from the one behind the link.
const page = `<!doctype html><meta charset="utf-8"><style>
  ${faces}
  html, body { margin: 0; padding: 0; background: ${VOID}; }
  .card {
    position: relative; width: 1200px; height: 630px; overflow: hidden;
    background: ${VOID}; color: ${CHALK};
    padding: 72px 80px; box-sizing: border-box;
    display: flex; flex-direction: column; justify-content: space-between;
    -webkit-font-smoothing: antialiased;
  }
  /* The halo, the same one the hero stands in: one very large, very soft rise
     of light off the upper right, drawn as a radial gradient rather than as a
     blurred object, because a blur at this size is expensive and identical. */
  .halo {
    position: absolute; inset: 0;
    background: radial-gradient(760px 620px at 78% 18%, rgba(244,241,234,0.075) 0%, rgba(244,241,234,0) 62%);
  }
  /* The grain, generated in code, never a bitmap file (spec 7.2). */
  .grain { position: absolute; inset: 0; opacity: 0.5; mix-blend-mode: overlay; }
  .top, .say, .foot { position: relative; }
  .top { display: flex; align-items: center; gap: 14px; }
  .top svg { display: block; }
  .word {
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 20px; font-weight: 500; letter-spacing: 5.4px; text-transform: uppercase;
  }
  .say {
    font-family: 'Newsreader', 'Iowan Old Style', Palatino, Georgia, serif;
    font-weight: 400; font-size: 78px; line-height: 1.03; letter-spacing: -0.018em;
    margin: 0; max-width: 780px;
  }
  /* Each half of the sentence is one line, and the break is chosen rather than
     left to the box: the turn lands on "or neither", which is the half of the
     mechanic people do not expect. */
  .say b { font-weight: 400; display: block; white-space: nowrap; }
  .foot {
    font-family: 'Inter Tight', Inter, system-ui, sans-serif;
    font-size: 22px; line-height: 1.5; letter-spacing: -0.004em;
    color: ${ASH}; margin: 0; max-width: 46ch;
  }
  .rule { height: 1px; background: ${HAIR}; margin: 0 0 26px; }
  /* The object, and it is the mark rather than a second drawing: one ring and
     the star inside it, set enormous, bleeding off the right edge, at the
     weight of something behind the type rather than beside it. The composition
     was left heavy with 400px of empty ground on the right, and a share card is
     the one image of this product most people will ever see. */
  .object {
    position: absolute; top: -150px; right: -400px;
    width: 900px; height: 900px; opacity: 0.1; color: ${CHALK};
  }
  .object svg { display: block; width: 100%; height: 100%; }
</style>
<div class="card">
  <div class="halo"></div>
  <div class="object">${eclipticSVG(CHALK)}</div>
  <svg class="grain" xmlns="http://www.w3.org/2000/svg">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.055"/>
  </svg>

  <div class="top">
    ${eclipticSVG(CHALK).replace('<svg ', '<svg width="34" height="34" ')}
    <span class="word">celestual</span>
  </div>

  <h1 class="say"><b>you both find out,</b><b>or neither of you does.</b></h1>

  <div>
    <div class="rule"></div>
    <p class="foot">place a ping on somebody. if they place one back, you are both told at once. if they do not, nobody is.</p>
  </div>
</div>`

const browser = await chromium.launch({ executablePath: chromiumPath() })
const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await p.setContent(page)
await p.evaluate(() => document.fonts.ready)
const out = join(root, 'app/public/og.png')
await p.locator('.card').screenshot({ path: out })
await p.close()
await browser.close()

// The old og.svg went with it: no scraper reads one, and a second copy of this
// composition in a second format is a second thing to keep in step.
const stale = join(root, 'app/public/og.svg')
if (existsSync(stale)) writeFileSync(stale, '')
console.log('app/public/og.png')

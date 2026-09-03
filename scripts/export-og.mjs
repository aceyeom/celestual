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

// ── the composition ──────────────────────────────────────────────────────────
// The lockup, and nothing else. The card used to carry the hero's sentence, a
// paragraph, a rule, a small lockup in the corner and the mark again at nine
// hundred pixels behind all of it. A share preview is seen at the size of a
// thumb, beside the description the page already sends, and at that size a
// paragraph is texture and a sentence is a smear. The mark and the name, on
// the ground, in the light the page stands in, is the whole of it.
//
// The lockup is set the way art.jsx `Lockup` sets it: the mark 1.13 times the
// word's size, a 0.38em gap, the word lifted 0.03em onto the mark's axis.
const WORD = 118
const page = `<!doctype html><meta charset="utf-8"><style>
  ${faces}
  html, body { margin: 0; padding: 0; background: ${VOID}; }
  .card {
    position: relative; width: 1200px; height: 630px; overflow: hidden;
    background: ${VOID}; color: ${CHALK};
    display: grid; place-items: center;
    -webkit-font-smoothing: antialiased;
  }
  /* the halo the hero stands in, felt rather than seen */
  .halo {
    position: absolute; inset: 0;
    background: radial-gradient(640px 420px at 50% 44%, rgba(244,241,234,0.055) 0%, rgba(244,241,234,0) 70%);
  }
  /* the grain, generated in code, never a bitmap file (spec 7.2) */
  .grain { position: absolute; inset: 0; opacity: 0.5; mix-blend-mode: overlay; }
  .lockup {
    position: relative;
    display: inline-flex; align-items: center; gap: ${Math.round(WORD * 0.38)}px;
    transform: translateY(-6px);
  }
  .lockup svg { display: block; width: ${Math.round(WORD * 1.13)}px; height: ${Math.round(WORD * 1.13)}px; }
  .word {
    font-family: 'Newsreader', 'Iowan Old Style', Palatino, Georgia, serif;
    font-weight: 500; font-size: ${WORD}px; line-height: 1; letter-spacing: -0.022em;
    transform: translateY(-0.03em);
  }
</style>
<div class="card">
  <div class="halo"></div>
  <svg class="grain" xmlns="http://www.w3.org/2000/svg">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.055"/>
  </svg>
  <div class="lockup">
    ${eclipticSVG(CHALK)}
    <span class="word">celestual.</span>
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

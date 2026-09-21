#!/usr/bin/env node
// papers.mjs — every paper a letter can be written on, on a real card.
//
// The looks are the one part of the product that cannot be reasoned about.
// A theme is a ground, a grain and a set of drawn parts, and whether those
// three add up to a NEON SIGN or to a dark rectangle with a border is a
// question only the eye answers. `npm run shots` cannot reach them: the
// panel is behind the composer, which is behind the campus address, and
// forty-two papers times two viewports is not a route.
//
// So this builds one page with the whole menu on it — the same card markup
// parts.jsx `Paper` renders, the same tokens looks.js computes, the same
// wall.css — and shoots it. Nothing here ships and nothing here is imported
// by the app: it reads looks.js and writes pictures.
//
//   node scripts/papers.mjs                every paper, the contact sheet
//   node scripts/papers.mjs synthwave      one paper, large, on its own
//
// The card below is `Paper`'s default layout with the reader's three marks
// in its foot, because the thing worth checking is exactly that: whether a
// paper's furniture has walked into the heart, the pen or the flag.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { THEMES, TINTS, FACES, FAMILY_THEMES, tokensOf, lookAttrs, chromeOf, layoutOf } from '../app/src/wall/looks.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/shots/papers')
mkdirSync(out, { recursive: true })

const only = process.argv[2] || ''

// the words on every card, so forty-two cards differ by their paper alone
const TO = '@sofia.reyes'
const BODY = 'I walked the long way past your building for a whole semester and never once went in. You would have said something kind and I would have said nothing back.'

const MARK = `<span class="wl-mark" aria-hidden="true"><svg viewBox="0 0 100 100" width="34" height="34"><circle cx="50" cy="50" r="34" class="wl-mark-ring" fill="none"/><path d="M22 66 40 28l20 26 16-20" class="wl-mark-line" fill="none" stroke-width="5"/><circle cx="22" cy="66" r="6" class="wl-mark-star"/><circle cx="40" cy="28" r="4.4" class="wl-mark-star"/><circle cx="60" cy="54" r="4.4" class="wl-mark-star"/><circle cx="76" cy="34" r="6" class="wl-mark-star"/></svg></span>`

const HEART = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z"/></svg>`
const PEN = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20l4-1 9.5-9.5-3-3L5 16l-1 4Z"/></svg>`
const FLAG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 21V4h11l-2 3.5L17 11H6"/></svg>`

const MARKS = `<footer class="wl-paper-foot"><div class="wl-letter-marks">
  <div class="wl-letter-marks-l">
    <span class="wl-hearts"><button class="wl-heart"><span class="wl-icon wl-heart-glyph">${HEART}</span></button><span class="wl-hearts-n">12</span></span>
    <button class="wl-pen-to">${PEN}</button>
  </div>
  <button class="wl-flag">${FLAG}</button>
</div></footer>`

const vars = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';')
const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('')

// The same four slots `Paper` renders, in the same order, with the three
// layouts it branches on. A card drawn here that is not the card the app
// draws is a picture of nothing.
function card(look) {
  const chrome = chromeOf(look)
  const layout = layoutOf(look)
  const fx = chrome && chrome !== 'nokia' && chrome !== 'chin'
    ? (chrome === 'stamp' || chrome === 'seal'
      ? `<span class="wl-fx wl-fx-${chrome}"><svg viewBox="0 0 100 100" width="${chrome === 'stamp' ? 26 : 22}" height="${chrome === 'stamp' ? 26 : 22}"><path d="M22 66 40 28l20 26 16-20" class="wl-mark-line" fill="none" stroke-width="5"/><circle cx="22" cy="66" r="6" class="wl-mark-star"/><circle cx="40" cy="28" r="4.4" class="wl-mark-star"/><circle cx="60" cy="54" r="4.4" class="wl-mark-star"/><circle cx="76" cy="34" r="6" class="wl-mark-star"/></svg></span>`
      : `<span class="wl-fx wl-fx-${chrome}"></span>`)
    : ''
  const head = `<header class="wl-paper-head"><span>3 days unsaid</span></header>`
  const crest = `<div class="wl-paper-crest">${MARK}<h2 class="wl-paper-title"><span class="wl-letter-to">${TO}</span></h2></div>`
  const body = `<div class="wl-paper-body"><p class="wl-prose">${BODY}</p></div>`
  let inner = head + crest + body
  if (layout === 'screen') {
    inner = `<div class="wl-paper-screen"><span class="wl-nk-bar"><span class="wl-nk-sig"><i></i><i></i><i></i><i></i></span><span class="wl-nk-batt"><i></i><i></i><i></i></span></span>${head}${crest}${body}</div>`
  } else if (layout === 'framed') {
    inner = `<div class="wl-paper-plate">${head}<div class="wl-paper-crest is-bare">${MARK}</div>${body}</div><div class="wl-paper-chin"><h2 class="wl-paper-title"><span class="wl-letter-to">${TO}</span></h2></div>`
  } else if (layout === 'divided') {
    inner = `<div class="wl-paper-divided"><div class="wl-paper-msg">${head}${body}</div><div class="wl-paper-addr">${crest}<span class="wl-paper-lines"><i></i><i></i><i></i></span></div></div>`
  }
  return `<article class="wl-paper has-look wl-looked" style="${vars(tokensOf(look))}"${attrs(lookAttrs(look))}>
    <div class="wl-paper-grain"></div>${fx}${inner}${MARKS}
  </article>`
}

function page(cards, width) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(join(root, 'app/public/fonts/faces.css')).href}">
<link rel="stylesheet" href="${pathToFileURL(join(root, 'app/src/wall/wall.css')).href}">
<style>
  /* the body wears .wl-root, because every token in wall.css hangs off it
     and a page without it draws the cards with half their values missing */
  body { margin: 0; background: #08070B; padding: 28px; }
  .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(${width}px, 1fr)); gap: 34px 26px; max-width: 1560px; margin: 0 auto; }
  .one { display: flex; flex-direction: column; gap: 9px; }
  .cap { font-family: 'Geist Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #8A8A93; }
</style></head><body class="wl-root"><div class="sheet">${cards}</div></body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH ? join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium') : undefined })

// The page is WRITTEN and then navigated to, rather than set on a blank one:
// a document served from about:blank cannot load a file:// stylesheet, so
// `setContent` drew forty-two unstyled cards on a black ground and the first
// contact sheet was a picture of nothing at all.
// Two passes at two weights. The retina png is what a look is judged on; a
// contact sheet of forty-two of those is sixteen megabytes, which is a file
// nobody can send anybody, so `PAPERS_LIGHT=1` shoots the same page at one
// device pixel as a jpeg for carrying around.
const LIGHT = process.env.PAPERS_LIGHT === '1'

async function shoot(name, html, width, height) {
  const file = join(tmpdir(), `celestual-papers-${name}.html`)
  writeFileSync(file, html)
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: LIGHT ? 1 : 2 })
  const p = await ctx.newPage()
  await p.goto(pathToFileURL(file).href, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(400)
  const shot = LIGHT ? `${name}.jpg` : `${name}.png`
  await p.screenshot({ path: join(out, shot), fullPage: true, ...(LIGHT ? { type: 'jpeg', quality: 86 } : null) })
  await ctx.close()
  rmSync(file, { force: true })
  console.log(shot)
}

// ── and the picker ──────────────────────────────────────────────────────────
// The other half of the question. Forty-two papers a writer cannot FIND are
// forty-one papers nobody uses, so the texture axis is shot the way the
// panel draws it: the seven families down one scroller, each tile drawing
// the real furniture at `--fx`.
function tile(look) {
  const chrome = chromeOf(look)
  const fx = chrome && chrome !== 'nokia' && chrome !== 'chin' ? `<span class="wl-fx wl-fx-${chrome}"></span>` : ''
  return `<span class="wl-look-tile wl-looked" style="${vars(tokensOf(look))}"${attrs(lookAttrs(look))}><span class="wl-paper-grain"></span>${fx}<span class="wl-look-tile-in"><span class="wl-look-aa">Aa</span><span class="wl-look-bar" style="width:92%"></span><span class="wl-look-bar" style="width:64%"></span><span class="wl-look-bar" style="width:78%"></span></span></span>`
}

function panel() {
  const fams = FAMILY_THEMES.map((f) => `<section class="wl-look-fam">
    <h3 class="wl-look-fam-h"><span>${f.name}</span><i>${f.note}</i></h3>
    <div class="wl-look-grid is-texture">${f.themes.map((t) => `<button class="wl-look-opt" role="radio" aria-checked="${t.slug === 'synthwave'}">${tile({ theme: t.slug })}</button>`).join('')}</div>
  </section>`).join('')
  const dots = ['', ...TINTS.map((t) => t.slug)].map((slug) => `<button class="wl-look-opt" role="radio" aria-checked="${slug === 'flare'}"><span class="wl-look-dot" style="${vars(tokensOf(slug ? { theme: 'synthwave', tint: slug } : { theme: 'synthwave' }))}"></span></button>`).join('')
  const chips = FACES.map((f) => `<button class="wl-look-opt" role="radio" aria-checked="${f.slug === 'techno'}"><span class="wl-look-chip" style="--chip-face:${f.family};--chip-w:${f.weight};--chip-size:${f.size}">${f.name}</span></button>`).join('')
  const one = (label, i, body) => `<div class="col"><span class="cap">${label}</span><div class="wl-look" style="--i:${i}"><div class="wl-look-sheet"><div class="wl-look-body">${body}</div><p class="wl-look-now">${label}</p></div></div></div>`
  return `<div class="panels">
    ${one('texture', 0, `<div class="wl-look-fams">${fams}</div>`)}
    ${one('color', 1, `<div class="wl-look-grid is-color">${dots}</div>`)}
    ${one('type', 2, `<div class="wl-look-grid is-type">${chips}</div>`)}
  </div>`
}

if (only === 'panel') {
  const html = page('', 420).replace('<div class="sheet"></div>', panel())
    .replace('</style>', '.panels { display: flex; gap: 30px; justify-content: center; align-items: flex-start; } .col { width: 440px; }</style>')
  await shoot('panel', html, 1480, 760)
  // and the same gallery with its window opened right out, which is the only
  // way to see all seven families and all forty-two tiles in one picture
  await shoot('panel-all', html.replace('</style>', '.wl-look-body { height: auto; -webkit-mask-image: none; mask-image: none; }</style>'), 1480, 900)
} else if (only.includes(',')) {
  // a handful of papers at reading size, which is the pass that catches a
  // piece of furniture standing where the words are
  const slugs = only.split(',').map((x) => x.trim()).filter(Boolean)
  const cards = slugs.map((slug) => `<div class="one"><span class="cap">${slug}</span>${card({ theme: slug })}</div>`).join('')
  await shoot('some', page(cards, 430), 1000, 900)
} else if (only) {
  const theme = THEMES.find((t) => t.slug === only)
  if (!theme) { console.error(`no paper called ${only}`); process.exit(1) }
  // one paper, as is and then under four colours, because a tint is the
  // other half of what a paper is
  const looks = [{ theme: only }, ...['rose', 'ink', 'flare', 'sage'].map((tint) => ({ theme: only, tint }))]
  const cards = looks.map((l) => `<div class="one"><span class="cap">${l.tint || 'as is'}</span>${card(l)}</div>`).join('')
  await shoot(only, page(cards, 420), 1000, 900)
} else {
  const cards = THEMES.map((t) => `<div class="one"><span class="cap">${t.family} / ${t.name}</span>${card({ theme: t.slug })}</div>`).join('')
  await shoot('all', page(cards, 380), 1500, 1000)
  // and the same forty-two under one chosen colour, which is the pass that
  // catches a paper whose furniture was only ever right in its own hues
  const tinted = THEMES.map((t) => `<div class="one"><span class="cap">${t.name} / rose</span>${card({ theme: t.slug, tint: 'rose' })}</div>`).join('')
  await shoot('all-rose', page(tinted, 380), 1500, 1000)
  console.log(`\n${THEMES.length} papers, ${TINTS.length} colours, in design/shots/papers/`)
}

await browser.close()

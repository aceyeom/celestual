#!/usr/bin/env node
// screens.mjs: every colour a letter can be lit in, as the picture it shares.
//
// The screens are the one part of the wall that cannot be reasoned about.
// Whether a colour's treatment (the lit panel, the negative, the poster's
// four inks, the riso's slipped drum, the copier's heat) adds up to a
// photograph of a screen or to a coloured rectangle is a question only the
// eye answers, and the composer that offers them is behind a sign in.
//
// So this asks the running app to draw them. It opens the dev server, imports
// the wall's own share.js in the page, and renders the picture `share` makes
// for one letter in every colour, and then the same colour on a handful of
// letter ids, which is the check on looks.js `quirks`: the same colour on
// five letters should be five phones, and none of them a different design.
// Nothing here ships.
//
//   npm run dev                        in another terminal, first
//   node scripts/screens.mjs           every colour, and five quirks of each
//   node scripts/screens.mjs teal      one colour
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { COLOURS } from '../app/src/wall/looks.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/shots/screens')
mkdirSync(out, { recursive: true })

const only = process.argv[2] || ''
const BASE = process.env.DEV_URL || 'http://localhost:5173'
const BODY = 'I walked the long way past your building for a whole semester and never once went in. You would have said something kind and I would have said nothing back.'

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    || undefined,
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
// no backend: the page only has to load the modules
await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.fulfill({ json: [] })))
await page.goto(`${BASE}/berkeley`, { waitUntil: 'networkidle' })

const made = []
for (const c of COLOURS.filter((x) => !only || x.slug === only)) {
  for (let k = 0; k < 5; k++) {
    const id = `${(k * 0x2f1b3 + c.slug.length * 7919).toString(16).padStart(8, '0').slice(-8)}-2222-4333-8444-5555${String(k).padStart(8, '0')}`
    const png = await page.evaluate(async ({ tint, id, body }) => {
      const m = await import('/src/wall/share.js')
      const l = { id, to: 'sofia.reyes', look: { tint }, body, words: 30, chars: body.length, hearts: 3, hearted: false, at: Date.now() - 86400000 }
      const blob = await m.renderLetter(m.letterFace(l, { name: 'Sofia', handle: '@sofia.reyes' }))
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of buf) s += String.fromCharCode(b)
      return btoa(s)
    }, { tint: c.slug, id, body: BODY })
    const file = join(out, `${c.slug}-${k + 1}.png`)
    writeFileSync(file, Buffer.from(png, 'base64'))
    made.push(file.replace(`${root}/`, ''))
  }
}
await browser.close()
console.log(made.join('\n'))

#!/usr/bin/env node
// studio-pdf.mjs: pictures the studio has photographed, bound as one PDF.
//
// A LinkedIn document is a PDF, a page to a picture. This lays each PNG on a
// page of its own, the page the size of the picture, with no margin round
// it, and prints the lot with the same chromium the studio photographs with.
// The page size is read off the first picture (its PNG header), so every
// picture handed to it should be the same size.
//
//   node scripts/studio-pdf.mjs <out.pdf> <a.png> [<b.png> ...]
//   node scripts/studio-pdf.mjs design/campaign/li-doc.pdf design/campaign/li-doc-0*.png
//   TITLE='...' node scripts/studio-pdf.mjs ...   the document's title (its
//                                                 file name without one)
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium'
  return undefined
}

// a PNG's width and height, from its IHDR, which always comes first
function sizeOf(buf) {
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')

export async function bind(out, pngs, title = basename(out, '.pdf')) {
  if (!pngs.length) throw new Error('no pictures to bind')
  const bufs = pngs.map((p) => readFileSync(p))
  const { w, h } = sizeOf(bufs[0])
  bufs.forEach((b, i) => {
    const s = sizeOf(b)
    if (s.w !== w || s.h !== h) console.log(`   ! ${pngs[i]} is ${s.w}×${s.h}, not ${w}×${h}; it is fitted to the page`)
  })
  const pages = bufs.map((b) => `<div class="pg"><img src="data:image/png;base64,${b.toString('base64')}" alt=""></div>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: ${w}px ${h}px; margin: 0; }
    html, body { margin: 0; padding: 0; background: #000; }
    .pg { width: ${w}px; height: ${h}px; overflow: hidden; break-after: page; }
    .pg:last-child { break-after: auto; }
    .pg img { display: block; width: 100%; height: 100%; object-fit: cover; }
  </style></head><body>${pages}</body></html>`
  const browser = await chromium.launch({ executablePath: chromiumPath() })
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : i.decode()))))
    const pdf = await page.pdf({ width: `${w}px`, height: `${h}px`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    writeFileSync(out, pdf)
  } finally {
    await browser.close()
  }
  return { w, h, n: bufs.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [out, ...pngs] = process.argv.slice(2)
  if (!out || !out.endsWith('.pdf') || !pngs.length) {
    console.log('node scripts/studio-pdf.mjs <out.pdf> <a.png> [<b.png> ...]')
    process.exit(1)
  }
  const t0 = Date.now()
  const { w, h, n } = await bind(resolve(out), pngs.map((p) => resolve(p)), process.env.TITLE || undefined)
  const kb = statSync(resolve(out)).size / 1024
  console.log(out.padEnd(46), `${n} pages`.padEnd(11), `${w}×${h}`.padEnd(11), `${(kb / 1024).toFixed(1)} MB`.padEnd(8), `${Date.now() - t0}ms`)
}

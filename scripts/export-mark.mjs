#!/usr/bin/env node
// export-mark.mjs - the logo, out of the code that draws it.
//
// The brand is not a drawn asset kept somewhere. It is a few grids of cells
// in app/src/wall/brand.js: the mark on its grid of 25, the tab's mark on its
// grid of 15, and the word's own letters, locked on one grid and one baseline
// (design/DESIGN.md 3). This script imports those and writes design/logo/,
// the tab's icon and the few pictures app/public serves from them, which
// means the file a printer is handed and the brand on the bar cannot
// disagree.
//
// Every file is whole cells at a whole number of pixels a cell. The SVGs say
// `crispEdges`; the PNGs are written a pixel at a time, here, with no browser
// and no smoothing in between, so a cell is a square of one colour in every
// one of them and nothing is anti-aliased. It used to render the smooth mark
// through headless Chromium for its anti-aliasing; a pixel mark wants the
// opposite, and needs nothing but node.
//
// Run: node scripts/export-mark.mjs
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { INK, CHALK, eclipticSVG } from '../app/src/wall/mark.js'
import { MARK, LOCKUP, cellsOf, wordCells, markSVG, lockupSVG, tabSVG } from '../app/src/wall/brand.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/logo')
mkdirSync(out, { recursive: true })

// The room's black, which is what the wall stands on now (DESIGN.md 2.1)
const ROOM = '#000000'
const GROUNDS = [
  { name: 'chalk', fill: CHALK, on: 'void', behind: ROOM },
  { name: 'ink', fill: INK, on: 'chalk', behind: CHALK },
]

// ── a PNG, by hand ──────────────────────────────────────────────────────────
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
// `cells` at `scale` pixels a cell, `pad` pixels of `ground` (or of nothing)
// round them: [left, top, right, bottom], or one number for all four
function png(cells, w, h, { scale, pad = 0, fill, ground = null }) {
  const [pl, pt, pr, pb] = Array.isArray(pad) ? pad : [pad, pad, pad, pad]
  const W = w * scale + pl + pr
  const H = h * scale + pt + pb
  const px = Buffer.alloc(W * H * 4)
  if (ground) {
    const [r, g, b] = rgb(ground)
    for (let i = 0; i < W * H; i++) px.set([r, g, b, 255], i * 4)
  }
  const [r, g, b] = rgb(fill)
  for (const [cx, cy] of cells) {
    for (let y = 0; y < scale; y++) {
      for (let x = 0; x < scale; x++) {
        const i = ((pt + cy * scale + y) * W + (pl + cx * scale + x)) * 4
        px.set([r, g, b, 255], i)
      }
    }
  }
  const raw = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
  const head = Buffer.alloc(13)
  head.writeUInt32BE(W, 0)
  head.writeUInt32BE(H, 4)
  head.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}
// padding that centres `n` pixels in `size`, the odd pixel on the right
const centre = (n, size) => [Math.floor((size - n) / 2), Math.ceil((size - n) / 2)]

const mark = cellsOf(MARK)
const N = MARK.length
const word = wordCells()
const lock = [...mark, ...word.cells.map(([x, y]) => [x + LOCKUP.word.x, y])]
const made = []
const put = (dir, file, data) => {
  writeFileSync(join(dir, file), data)
  made.push(join(dir === out ? 'design/logo' : 'app/public', file))
}

// ── the vectors ─────────────────────────────────────────────────────────────
// The mark and the lockup, each once in `currentColor` for embedding and once
// on each fixed ink, at twenty and eight pixels a cell; the tab's own drawing
// beside them, for the record of what the tab shows.
put(out, 'mark.svg', markSVG('currentColor', { scale: 20 }) + '\n')
put(out, 'lockup.svg', lockupSVG('currentColor', { scale: 8 }) + '\n')
for (const g of GROUNDS) {
  put(out, `mark-${g.name}.svg`, markSVG(g.fill, { scale: 20 }) + '\n')
  put(out, `lockup-${g.name}.svg`, lockupSVG(g.fill, { scale: 8 }) + '\n')
}
put(out, 'mark-tab.svg', tabSVG('currentColor').replace('<svg ', '<svg width="160" height="160" ') + '\n')
// And the vector, Ecliptic from mark.js's constants, for where the product
// still draws it as a material rather than as the name: the head of a door,
// the desk, the poured metal's mask (DESIGN.md 3.5). The system's sheet
// (design/components.html) shows it from here.
put(out, 'ecliptic.svg', eclipticSVG('currentColor').replace('<svg ', '<svg width="512" height="512" ') + '\n')
for (const g of GROUNDS) put(out, `ecliptic-${g.name}.svg`, eclipticSVG(g.fill).replace('<svg ', '<svg width="512" height="512" ') + '\n')

// ── the pictures ────────────────────────────────────────────────────────────
for (const g of GROUNDS) {
  // the mark alone, transparent, at the three sizes anything ever asks for:
  // thirty, fifteen and three pixels a cell, centred in the square
  for (const [px, scale] of [[1024, 30], [512, 15], [128, 3]]) {
    const [a, b] = centre(N * scale, px)
    put(out, `mark-${g.name}-${px}.png`, png(mark, N, N, { scale, pad: [a, a, b, b], fill: g.fill }))
  }
  // and on its own ground, which is what a deck or a favicon preview wants:
  // twenty six pixels a cell, 858 of the 1024, the rest its air
  const [a, b] = centre(N * 26, 1024)
  put(out, `mark-${g.name}-on-${g.on}-1024.png`, png(mark, N, N, { scale: 26, pad: [a, a, b, b], fill: g.fill, ground: g.behind }))
  // the lockup, transparent for placement, at eight pixels a cell
  put(out, `lockup-${g.name}.png`, png(lock, LOCKUP.w, LOCKUP.h, { scale: 8, fill: g.fill }))
  // and on its ground with its clear space round it: half the mark, twelve
  // cells, on every side (DESIGN.md 3.3)
  put(out, `lockup-${g.name}-on-${g.on}.png`, png(lock, LOCKUP.w, LOCKUP.h, { scale: 8, pad: 12 * 8, fill: g.fill, ground: g.behind }))
}

// the lockup as markup is gone: the word is a drawing now, and lockup.svg
// is the whole of it
if (existsSync(join(out, 'lockup.html'))) rmSync(join(out, 'lockup.html'))

// ── what app/public serves ──────────────────────────────────────────────────
const pub = join(root, 'app/public')

// The tab's icon, linked from app/index.html and every legal page, so the tab
// is right on the first paint of every address (the wall draws the same
// string again at runtime, index.jsx). Ink, with a prefers-color-scheme rule
// handing it chalk on a dark tab strip: a browser reports the scheme to an
// icon document the same way it does to a page, and one drawing has to be
// visible on both.
put(pub, 'icon.svg', tabSVG(INK, CHALK) + '\n')

// The home screen's icon. iOS takes a PNG and not an SVG, and fills what is
// transparent with black anyway, so it is the room: the mark in chalk at five
// pixels a cell on #000, 165 of the 180, clear of the corners iOS rounds off.
{
  const [a, b] = centre(N * 5, 180)
  put(pub, 'apple-touch-icon.png', png(mark, N, N, { scale: 5, pad: [a, a, b, b], fill: CHALK, ground: ROOM }))
}

// The lockup in chalk, for use ON A PAGE rather than on a tab strip: the legal
// pages sign themselves with it (legal.css `.brand`), at one pixel a cell, as
// every bar does. icon.svg will not do there: it is ink first, and its dark
// rule answers the image's own scheme, not the page's.
put(pub, 'lockup.svg', lockupSVG(CHALK) + '\n')
// and the mark alone in chalk, kept at the address it has always had
put(pub, 'mark.svg', markSVG(CHALK) + '\n')

// The mark a mail could draw, at a public address, from when a mail was
// signed with the mark alone. The mails are signed with the whole lockup now
// (scripts/export-mail.mjs, `sign.png`); this stays for the mails already in
// people's inboxes, which now show the mark they would be sent today.
{
  const [a, b] = centre(N * 7, 256)
  put(pub, 'mark-chalk-256.png', png(mark, N, N, { scale: 7, pad: [a, a, b, b], fill: CHALK }))
}

console.log(made.join('\n'))

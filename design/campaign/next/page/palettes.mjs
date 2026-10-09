// The product's parts the page draws with, read from the app itself and
// written to round-product.js, so there is one source of truth:
//   the seven palettes round dithers its worlds into (`skinOf`), darkest
//   first: a lit colour's ink, lo, mid and lit; acid's picture steps
//   (`flat.pic`); the riso's overprint, its two drums and its paper
//   (`print.stops`);
//   each letter colour's screen: its bands, its panel, its words (`skinOf`);
//   the status row's glyphs and the battery at each charge (looks.js `PIX`);
//   the lockup, as cells (brand.js `LOCKUP`).
// `node palettes.mjs` writes it.
import { writeFileSync } from 'node:fs'
import { skinOf, PIX } from '../../../../app/src/wall/looks.js'
import { LOCKUP } from '../../../../app/src/wall/brand.js'

const NAMES = ['night', 'amber', 'acid', 'green', 'ice', 'violet-yellow', 'rose']
const up = (h) => (typeof h === 'string' && h.startsWith('#') ? h.toUpperCase() : h)
export function paletteOf(name) {
  const s = skinOf(name)
  if (s.kind === 'lit') return [s.ink, s.lo, s.mid, s.lit].map(up)
  if (s.kind === 'brat') return [...s.flat.pic].reverse().map(up)
  if (s.kind === 'riso') return s.print.stops.map(up)
  throw new Error(`no palette for ${name} (${s.kind})`)
}
const screenOf = (name) => {
  const s = skinOf(name)
  const o = { kind: s.kind, top: s.top, top2: s.top2, bot: s.bot, hi: s.hi, mid: s.mid, lo: s.lo, ink: s.ink, lit: s.lit, cur: s.cur, bloom: s.bloom, soft: s.soft }
  if (s.flat) o.flat = { top: s.flat.top, bot: s.flat.bot, ink: s.flat.ink, lit: s.flat.lit, body: s.flat.body, accent: s.flat.accent }
  if (s.print) o.stops = s.print.stops
  return o
}
const glyphs = Object.fromEntries(['ant', 'pen', 'wait', 'heartO', 'bata0', 'bata1', 'bata2', 'bata3', 'bata4'].map((k) => [k, PIX[k]]))
const out = {
  PALETTES: Object.fromEntries(NAMES.map((n) => [n, paletteOf(n)])),
  SCREENS: Object.fromEntries(NAMES.map((n) => [n, screenOf(n)])),
  GLYPHS: glyphs,
  LOCKUP: { w: LOCKUP.w, h: LOCKUP.h, d: LOCKUP.d },
}
const body = Object.entries(out).map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 1)}\n`).join('')
writeFileSync(new URL('./round-product.js', import.meta.url), `// Written by palettes.mjs from the app; do not edit by hand.\n${body}`)
console.log(out.PALETTES, Object.keys(out.GLYPHS), out.LOCKUP.w, out.LOCKUP.h)

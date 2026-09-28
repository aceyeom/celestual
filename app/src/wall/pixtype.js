// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PHONE'S FACE, IN CELLS                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Words the stories set on the glass in the phone's own pixels and not in the
// page's type: the two names the mutual's film credits, and `it's mutual.`,
// typed under the mark a cell at a time (pixmark.js `filmStory`,
// `keepStory`). The old reveal typed its sentence in the DOM over the canvas,
// in the same face at another pitch, and the letters stood on the glass a
// hair off the cells round them; set in cells they are the glass's own, lit
// and dimmed and carried with it.
//
// Jersey 10 is drawn on a grid of its own, and at 18.6667px, which is 1400
// over 75, one pixel of its grid is one pixel of a canvas exactly: a
// capital ten tall, a stem two wide, and not a pixel of it grey. So a text
// is drawn once at that size on a canvas of its own, and every pixel lit
// past half is a cell. A face for Korean, Japanese or Chinese (type.js
// `s40Face`) shares the grid, and is loaded first (`readyType`), since a
// canvas never asks for a face itself.
//
// Answers `{ cells, w, ends }`: the lit cells, each [x, y] from the pen's
// start on the baseline (so a capital's top row is y -10), the width the
// text advances, and the advance after each character, where a cursor
// would stand once that character is typed. Worked out once for a text and
// kept, and never in node, where there is no canvas to draw it on.

import { s40Face, langOf, ensureCjk } from './type.js'

const SIZE = 1400 / 75
// the pen's start and the baseline on the scratch canvas, with room above a
// capital and below a descender, and for a face that stands a little taller
const X0 = 2
const BASE = 18
const TALL = 26

const TYPED = new Map()

export function typeCells(text) {
  const t = String(text ?? '')
  if (TYPED.has(t)) return TYPED.get(t)
  const empty = { cells: [], w: 0, ends: [] }
  if (!t || typeof document === 'undefined') return empty
  const cv = document.createElement('canvas')
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return empty
  const font = `400 ${SIZE}px ${s40Face(t)}`
  g.font = font
  const chars = Array.from(t)
  const w = Math.ceil(g.measureText(t).width)
  const ends = []
  let so = ''
  for (const ch of chars) {
    so += ch
    ends.push(Math.round(g.measureText(so).width))
  }
  cv.width = w + 2 * X0 + 2
  cv.height = TALL
  // a resized canvas forgets its font
  g.font = font
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  g.fillStyle = '#000'
  g.fillText(t, X0, BASE)
  const d = g.getImageData(0, 0, cv.width, cv.height).data
  const cells = []
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] >= 128) cells.push([x - X0, y - BASE])
  }
  const out = { cells, w, ends }
  TYPED.set(t, out)
  return out
}

// The face a text is set in, loaded, before it is drawn in cells: Jersey
// 10, and the pixel face for its language where it has one. Answers whether
// it is there by `ceiling`, and never throws; a face that did not come is
// the caller's to decide about (the film credits the @s instead).
export async function readyType(text, ceiling = 1800) {
  const t = String(text ?? '')
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return true
  // Latin asks for Jersey alone: asked for the whole list, the browser
  // matches the text against every face the CJK stylesheet declares, a few
  // hundred of them, which on a slow phone was a frame and more
  const cjk = !!langOf(t)
  const font = `400 ${SIZE}px ${cjk ? s40Face(t) : '"Jersey 10"'}`
  const wait = (async () => {
    if (cjk) await ensureCjk()
    const got = await document.fonts.load(font, t)
    // whether every face the text needs has come, and not only the first
    return cjk ? document.fonts.check(font, t) : got.length > 0
  })().catch(() => false)
  const cap = new Promise((done) => setTimeout(() => done(false), ceiling))
  return Promise.race([wait, cap])
}

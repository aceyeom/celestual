// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE BRAND, ON THE PHONE'S GRID                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The whole product is drawn as an old phone now (design/DESIGN.md 2.6), and
// for a while the one thing on it that was not was its own name: Ecliptic as
// a smooth vector and `celestual.` set in Newsreader, the room's serif, over
// a surface where every other word is Jersey 10 and every glyph is a pixel.
// The owner asked for the logo to take the digital style and to be beautiful
// in it. So the brand is drawn here, a cell at a time, and nothing in it is
// type or a curve:
//
//   MARK       Ecliptic on a grid of 33, the one every lockup and every
//              export is drawn from (1 October: the 25 it was, a little finer,
//              at the owner's ask). Its ring is mark.js's own, rastered alone
//              at 37 and cut to its 33, so the ellipse steps a cell at a time;
//              the star is drawn round the needle by hand with concave sides,
//              so it reads as a sparkle rather than a diamond. Its crossings
//              are drawn by hand: where the ring passes behind the star it
//              stops a cell short either side of the needle; where it passes
//              in front it runs on unbroken and the needle stops a cell short
//              of it above and below.
//   MARK_TAB   the same drawing again at 15, for the tab, where a pixel is a
//              pixel of the screen: each cell chosen by hand so the crossing
//              still reads at 16px, rather than the 25 scaled down, which is
//              a blur. It stands in a 16 by 16 icon a cell in from the top
//              and the left.
//   FACE       the word's own letters, the letter's hand (1 October): a
//              serif on the grid, stems two cells wide and hairlines one, an
//              x-height of nine and ascenders of four, a ball on the c, a flag
//              on the l, a spur on the u and the a, one cell between letters
//              and the stop a two cell square on the baseline. Drawn and not
//              set, so the word is the same object at every size and on every
//              surface, a canvas and a mail included, and needs no face.
//   LOCKUP     the mark, six cells of air, and the word, on one grid and one
//              baseline: the word's x-height is centred on the mark's middle
//              row (rows 12 to 20 of the mark's 33).
//
// Every drawing is whole cells, drawn with `crispEdges` at a whole number of
// pixels to a cell and never at a fraction of one, so it is as sharp as the
// phone's own glyphs (screen.jsx `PixIcon`). On a screen the lockup is drawn
// at one pixel a cell, 33 tall; the exports and the pictures draw it at two,
// four, five and so on. It takes `currentColor` wherever it can.
//
// Pure data and string builders, like mark.js: parts.jsx draws it, share.js
// signs the pictures with it, and scripts/export-mark.mjs writes the tab's
// icon and design/logo/ from it in node. Ecliptic's own constants stay in
// mark.js, for the poured mark (`LiquidMark`) and the stories, which still
// rasterise the vector themselves.

import { INK } from './mark.js'

// `#` the star, `o` the ring, `.` nothing. The two are one ink; they are told
// apart here only so the drawing can be read.
export const MARK = [
  '.................................',
    '.................................',
    '................#................',
    '................#................',
    '................#................',
    '................#................',
    '................#................',
    '................#.oooooooooo.....',
    '..............o.#........ooooo...',
    '...........ooo..#...........ooo..',
    '.........oo....###...........ooo.',
    '.......oo......###............ooo',
    '......o........###............ooo',
    '.....o........#####...........ooo',
    '....o.........#####...........oo.',
    '...o........#########........ooo.',
    '..o.....#################....oo..',
    '.oo.........#########.......oo...',
    '.oo...........#####........oo....',
    'ooo...........#####......ooo.....',
    'ooo............###......ooo......',
    'ooo............###....oooo.......',
    '.oooo..........###.ooooo.........',
    '..ooooo...........oooo...........',
    '...oooooooooooooooo..............',
    '.....oooooooooooo................',
    '.................................',
    '................#................',
    '................#................',
    '................#................',
    '................#................',
    '.................................',
    '.................................',
]

export const MARK_TAB = [
  '.......#.......',
  '.......#.......',
  '.......#.......',
  '.......#.ooooo.',
  '....oo.#.....oo',
  '..oo...#......o',
  '.o....###.....o',
  'o...#######..oo',
  'o.....###...oo.',
  'o.........oo...',
  'ooo....oooo....',
  '.oooooo........',
  '.......#.......',
  '.......#.......',
  '.......#.......',
]

const fill = (n, row) => Array.from({ length: n }, () => row)
export const FACE = {
  x: 9,
  asc: 4,
  gap: 1,
  glyphs: {
    c: ['..#####.', '.##...##', '##....##', '##......', '##......', '##......', '##......', '.##....#', '..#####.'],
    e: ['..####..', '.##..##.', '##....##', '########', '##......', '##......', '##......', '.##....#', '..#####.'],
    l: ['###.', '.##.', ...fill(10, '.##.'), '####'],
    s: ['.######', '##...##', '##.....', '.###...', '...###.', '.....##', '.....##', '##...##', '######.'],
    t: ['..#...', '.##...', '.##...', '######', ...fill(6, '.##...'), '.##..#', '..###.'],
    u: ['###..###.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##..###.', '..###.###'],
    a: ['.#####..', '##...##.', '.....##.', '..#####.', '.##..##.', '##...##.', '##...##.', '##..###.', '.###.###'],
    '.': ['##', '##'],
  },
}
export const WORD = 'celestual.'

// the lockup's own measures, in cells
export const LOCK = { gap: 6, base: 21 }

// The lit cells of a drawing, as [x, y]
export function cellsOf(rows, dx = 0, dy = 0) {
  const out = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') out.push([x + dx, y + dy])
  })
  return out
}

// The word's cells, from its first column, with y counted from the top of
// the mark's grid so the word stands on the lockup's baseline (`LOCK.base`)
export function wordCells(text = WORD) {
  const out = []
  let pen = 0
  for (const ch of text) {
    const g = FACE.glyphs[ch]
    if (!g) continue
    for (const [x, y] of cellsOf(g)) out.push([pen + x, LOCK.base - g.length + y])
    pen += g[0].length + FACE.gap
  }
  return { cells: out, w: pen - FACE.gap }
}

// Cells as one path, each row's runs merged into a rectangle, so a drawing
// is a few dozen rectangles rather than hundreds of squares
export function pathOf(cells) {
  const rows = new Map()
  for (const [x, y] of cells) {
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y).push(x)
  }
  let d = ''
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y).sort((a, b) => a - b)
    for (let i = 0; i < xs.length;) {
      let j = i
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++
      d += `M${xs[i]} ${y}h${j - i + 1}v1h-${j - i + 1}z`
      i = j + 1
    }
  }
  return d
}

// The lockup, measured once: the mark's box, the word's box beside it, and
// the paths of each in its own box (parts.jsx `Brand` draws them as two, so
// the word can be given back on the narrowest phones) and of the whole.
function lockupOf() {
  const n = MARK.length
  const word = wordCells()
  const x = n + LOCK.gap
  const mark = cellsOf(MARK)
  return {
    w: x + word.w,
    h: n,
    gap: LOCK.gap,
    mark: { w: n, h: n, d: pathOf(mark) },
    word: { x, w: word.w, h: n, d: pathOf(word.cells) },
    d: pathOf([...mark, ...word.cells.map(([cx, cy]) => [cx + x, cy])]),
  }
}
export const LOCKUP = lockupOf()

// An SVG string of a drawing, `scale` pixels to a cell, `pad` cells of air
// round it, in `color`; `ground` lays a colour under the whole of it and
// `onDark` hands the drawing another colour when the image itself is asked
// for a dark scheme (a tab strip, below).
function svgOf(d, w, h, color, { scale = 1, pad = 0, ground = '', onDark = '', title = '' } = {}) {
  const W = w + 2 * pad
  const H = h + 2 * pad
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${W} ${H}" width="${W * scale}" height="${H * scale}" shape-rendering="crispEdges"${title ? ' role="img"' : ''}>`
    + (title ? `<title>${title}</title>` : '')
    + (onDark ? `<style>@media (prefers-color-scheme:dark){#k{fill:${onDark}}}</style>` : '')
    + (ground ? `<rect x="${-pad}" y="${-pad}" width="${W}" height="${H}" fill="${ground}"/>` : '')
    + `<path id="k" fill="${color}" d="${d}"/></svg>`
}
export const markSVG = (color = 'currentColor', o = {}) => svgOf(LOCKUP.mark.d, LOCKUP.mark.w, LOCKUP.mark.h, color, o)
export const lockupSVG = (color = 'currentColor', o = {}) => svgOf(LOCKUP.d, LOCKUP.w, LOCKUP.h, color, { title: 'celestual.', ...o })

// ── the tab's icon ──────────────────────────────────────────────────────────
// `MARK_TAB` in a 16 by 16 icon, a cell in from the top and the left, so a
// tab strip draws it at one pixel a cell and a sharp screen at two, and
// neither of them has to blur it. Struck in INK, because a desktop browser
// paints its tab strip near white and a chalk mark there is no mark at all;
// the dark scheme's rule hands it `onDark` (mark.js has the whole argument,
// `eclipticSVG`). Plain markup: percent-encoding is the caller's, in one pass.
const TAB = pathOf(cellsOf(MARK_TAB, 1, 1))
export function tabSVG(color = INK, onDark = '') {
  return svgOf(TAB, 16, 16, color, { onDark })
}

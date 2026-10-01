// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LOGO, TOLD OTHER WAYS: iterations of 1 October, none adopted        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The owner asked for iterations of the mark and the word that sit closer to
// the theme: the phone left on in a black room, its screen, its keys, the
// letter on it, and the two people a mutual is about. Ecliptic (a ring and a
// sparkle) reads as a planet before it reads as a phone, and the drawn word is
// a clean pixel sans that could sign anything. These are the other ways it
// could go. Nothing in the product reads this file: `app/src/wall/brand.js`
// is still the brand, and adopting one of these is porting its rows into
// `MARK`, `MARK_TAB` and `FACE` there.
//
// Every drawing is on the phone's grid, as brand.js's are, in the same rows:
// `#` lit, `o` lit too (a ring or a line, told apart only so it can be read),
// `g` a cell of the display that is there and unlit (drawn faint, the way an
// LCD shows its dark pixels), `.` nothing. The marks are 25 by 25 like `MARK`,
// with a tab's own drawing at 15 by 15 like `MARK_TAB`; the words stand on
// their own baseline, the last row.
//
// The sheet that shows them side by side, on the black, on a lit screen, at
// one pixel a cell on the bar and as the card a link unfurls into, is the
// design canvas they were drawn for. `node scripts/export-iterations.mjs`
// writes each one as an SVG into design/logo/iterations/.

const fill = (n, row) => Array.from({ length: n }, () => row)

// ── the marks ────────────────────────────────────────────────────────────────
// `now` is brand.js's own, for comparison.
export const MARKS = {
  // the screen: the phone itself, its two bands of glass, the aerial and the
  // battery on the top one and the soft keys on the bottom, and the panel lit
  // with the star struck out of it, which is how the mark stands on every
  // letter's screen and on the card a link unfurls into
  screen: {
    name: 'the screen',
    rows: [
      '...ooooooooooooooooooo...',
      '.oo...................oo.',
      '.o..ooo.........oooo...o.',
      '.o...o.........ooooo...o.',
      '.o...o..........oooo...o.',
      '.o.....................o.',
      '.o.###################.o.',
      '.o.#########.#########.o.',
      '.o.#########.#########.o.',
      '.o.########...########.o.',
      '.o.#######.....#######.o.',
      '.o.######.......######.o.',
      '.o.####...........####.o.',
      '.o.######.......######.o.',
      '.o.#######.....#######.o.',
      '.o.########...########.o.',
      '.o.#########.#########.o.',
      '.o.#########.#########.o.',
      '.o.###################.o.',
      '.o.###################.o.',
      '.o.....................o.',
      '.o..oooo.........oooo..o.',
      '.o.....................o.',
      '.oo...................oo.',
      '...ooooooooooooooooooo...',
    ],
    tab: [
      '.#############.',
      '#.............#',
      '#.#.......###.#',
      '#.###########.#',
      '#.#####.#####.#',
      '#.#####.#####.#',
      '#.####...####.#',
      '#.##.......##.#',
      '#.####...####.#',
      '#.#####.#####.#',
      '#.#####.#####.#',
      '#.###########.#',
      '#.............#',
      '#..##.....##..#',
      '.#############.',
    ],
  },
  // the star key: the phone's own `*`, a lit key with the star struck out of
  // it and its edge under it, the way the wall's lit keys stand
  starkey: {
    name: 'the star key',
    rows: [
      '.........................',
      '....#################....',
      '..#####################..',
      '.#######################.',
      '.#######################.',
      '.###########.###########.',
      '.###########.###########.',
      '.##########...##########.',
      '.##########...##########.',
      '.#########.....#########.',
      '.########.......########.',
      '.#####.............#####.',
      '.########.......########.',
      '.#########.....#########.',
      '.##########...##########.',
      '.##########...##########.',
      '.###########.###########.',
      '.###########.###########.',
      '.#######################.',
      '.#######################.',
      '..#####################..',
      '....#################....',
      '.........................',
      '....#################....',
      '.........................',
    ],
    tab: [
      '..###########..',
      '.#############.',
      '#######.#######',
      '#######.#######',
      '######...######',
      '#####.....#####',
      '###.........###',
      '#####.....#####',
      '######...######',
      '#######.#######',
      '#######.#######',
      '.#############.',
      '..###########..',
      '...............',
      '..###########..',
    ],
  },
  // the letter: the envelope the phone showed by the aerial (looks.js
  // `PIX.env`), sealed with the star where its flap comes to a point
  envelope: {
    name: 'the letter',
    rows: [
      '.........................',
      '.........................',
      '.........................',
      'ooooooooooooooooooooooooo',
      'oo.....................oo',
      'o.o...................o.o',
      'o..oo...............oo..o',
      'o....o.............o....o',
      'o.....o.....#.....o.....o',
      'o......o....#....o......o',
      'o.......o..###..o.......o',
      'o.........#####.........o',
      'o........#######........o',
      'o......###########......o',
      'o........#######........o',
      'o.........#####.........o',
      'o..........###..........o',
      'o...........#...........o',
      'o...........#...........o',
      'o.......................o',
      'o.......................o',
      'ooooooooooooooooooooooooo',
      '.........................',
      '.........................',
      '.........................',
    ],
    tab: [
      '...............',
      '###############',
      '##...........##',
      '#.#.........#.#',
      '#..#.......#..#',
      '#...#..#..#...#',
      '#......#......#',
      '#.....###.....#',
      '#...#######...#',
      '#.....###.....#',
      '#......#......#',
      '#......#......#',
      '#.............#',
      '###############',
      '...............',
    ],
  },
  // two stars: Ecliptic's own ring with the sparkle taken out of its middle
  // and two on its circuit instead, the near one larger and in front of the
  // ring and the far one smaller behind it, which is the intro's binary
  // (scenes/binary.js) on the frame before they meet
  binary: {
    name: 'two stars',
    rows: [
      '.........................',
      '.........................',
      '.......#.................',
      '.......#.................',
      '......###................',
      '....#######...oooooooo...',
      '......###...oo.......ooo.',
      '.......#..............oo.',
      '.....o.#...............oo',
      '....o..................oo',
      '...o.............#.....oo',
      '..o..............#.....o.',
      '.o..............###...oo.',
      'oo..............###..oo..',
      'oo.............#####.....',
      'oo............#######....',
      'oo.........#############.',
      '.ooo..........#######....',
      '.oooooooooooo..#####.....',
      '...ooooooooo....###......',
      '................###......',
      '.................#.......',
      '.................#.......',
      '.........................',
      '.........................',
    ],
    tab: [
      '...............',
      '.....#.........',
      '....###........',
      '.....#...ooooo.',
      '..oo.........oo',
      '.o............o',
      'o.........#...o',
      'o.........#..oo',
      'o........###.o.',
      'oo.....#######.',
      '.oooo.....###..',
      '...oooooo..#...',
      '...........#...',
      '...............',
      '...............',
    ],
  },
  // the overlap: two people, and the only thing lit is where they meet,
  // which is the whole mechanism (nothing is told unless both)
  venn: {
    name: 'the overlap',
    rows: [
      '.........................',
      '.........................',
      '.......ooooo.............',
      '.....oo.....oo...........',
      '....o.........o..........',
      '...o...........o.........',
      '...o...........o.........',
      '..o.............o........',
      '..o..........####o.......',
      '..o........######.oo.....',
      '..o.......#######...o....',
      '..o......########....o...',
      '...o.....#######.....o...',
      '...o....########......o..',
      '....o...#######.......o..',
      '.....oo.######........o..',
      '.......o####..........o..',
      '........o.............o..',
      '.........o...........o...',
      '.........o...........o...',
      '..........o.........o....',
      '...........oo.....oo.....',
      '.............ooooo.......',
      '.........................',
      '.........................',
    ],
    tab: [
      '...............',
      '....ooo........',
      '..oo...oo......',
      '..o.....o......',
      '.o.......o.....',
      '.o......##o....',
      '.o....####.oo..',
      '..o...###...o..',
      '..oo.####....o.',
      '....o##......o.',
      '.....o.......o.',
      '......o.....o..',
      '......oo...oo..',
      '........ooo....',
      '...............',
    ],
  },
  // the meeting: a note going out from either side, as the aerial draws its
  // waves (aerial.jsx), and the star where the two reach each other
  meet: {
    name: 'the meeting',
    rows: [
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '...o........#........o...',
      '...oo.......#.......oo...',
      '....o......###......o....',
      '....oo....#####....oo....',
      '.....o...#######...o.....',
      '.....o.###########.o.....',
      '.....o...#######...o.....',
      '....oo....#####....oo....',
      '....o......###......o....',
      '...oo.......#.......oo...',
      '...o........#........o...',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
    tab: [
      '...............',
      '...............',
      '...............',
      '...............',
      '.o.....#.....o.',
      '.oo....#....oo.',
      '..o...###...o..',
      '..o.#######.o..',
      '..o...###...o..',
      '.oo....#....oo.',
      '.o.....#.....o.',
      '...............',
      '...............',
      '...............',
      '...............',
    ],
  },
}

// ── the words ────────────────────────────────────────────────────────────────
// Glyph tables in brand.js's `FACE` shape (rows from the top of the glyph,
// standing on one baseline), where the word is drawn a letter at a time.

// the draft: the phone's bold, stems and horizontals both two cells, and
// where the stop was, the phone's own cursor (caret.jsx: a bar four cells
// wide, from the top of the tallest letter to two cells under the line),
// blinking on the phone's beat. A draft left unsent, as every letter is
export const DRAFT = {
  x: 10,
  asc: 3,
  gap: 2,
  glyphs: {
    c: ['.#######', '########', ...fill(6, '##......'), '########', '.#######'],
    e: ['.######.', '########', '##....##', '##....##', '########', '########', '##......', '##......', '########', '.#######'],
    l: fill(13, '##'),
    s: ['.#######', '########', '##......', '##......', '#######.', '.#######', '......##', '......##', '########', '#######.'],
    t: ['.##...', '.##...', '.##...', '######', '######', ...fill(6, '.##...'), '.#####', '..####'],
    u: [...fill(8, '##....##'), '########', '.#######'],
    a: ['.######.', '########', '......##', '......##', '.#######', '########', '##....##', '##....##', '########', '.#######'],
  },
  cursor: { w: 4, gap: 3, under: 2 },
}

// the display: the five by seven of a phone's character screen, one cell
// between letters, every cell of a letter's box there whether it is lit or
// not, so the word stands on its own dark pixels
export const MATRIX = {
  gap: 1,
  glyphs: {
    c: ['.....', '.....', '.###.', '#....', '#....', '#...#', '.###.'],
    e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
    l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
    t: ['.#...', '.#...', '###..', '.#...', '.#...', '.#..#', '..##.'],
    u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
    a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  },
}

// the letter's hand: a serif drawn on the grid, two cell stems and one cell
// hairlines, a ball on the c, a flag on the l, a spur on the u and the a,
// and the stop kept
export const SERIF = {
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

// Set a word from a table: every glyph on one baseline, `gap` cells apart
export function setWord(table, word) {
  const gs = [...word].map((ch) => table.glyphs[ch])
  const H = Math.max(...gs.map((g) => g.length))
  const W = gs.reduce((w, g) => w + g[0].length, 0) + table.gap * (gs.length - 1)
  const out = Array.from({ length: H }, () => Array(W).fill('.'))
  let pen = 0
  for (const g of gs) {
    const dy = H - g.length
    g.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') out[dy + y][pen + x] = '#' }))
    pen += g[0].length + table.gap
  }
  return out.map((r) => r.join(''))
}

// The draft, with its cursor after the last letter: the word's own rows, two
// more under the line, and the bar
function draftWord() {
  const word = setWord(DRAFT, 'celestual')
  const { w, gap, under } = DRAFT.cursor
  const W = word[0].length + gap + w
  const rows = [...word, ...fill(under, '')].map((r) => r.padEnd(W, '.'))
  return rows.map((r, y) => r.slice(0, W - w) + (y <= word.length - 1 + under ? '#'.repeat(w) : '.'.repeat(w)))
}

// The display's word: each letter's box drawn whole, the cells it does not
// light marked `g`
function matrixWord() {
  const lit = setWord(MATRIX, 'celestual')
  return lit.map((r) => [...r].map((c, x) => (c === '#' ? '#' : x % 6 === 5 ? '.' : 'g')).join(''))
}

export const WORDS = {
  draft: { name: 'the draft', rows: draftWord(), cursor: true },
  matrix: { name: 'the display', rows: matrixWord() },
  serif: { name: "the letter's hand", rows: setWord(SERIF, 'celestual.') },
  // the room's own italic (Newsreader, which set the word until 29 September)
  // brought onto the phone's grid: traced at 25 pixels, 500, and kept a cell
  // at a time, so it is the old name in the new screen's pixels
  italic: {
    name: 'the old name, on the screen',
    rows: [
      '.......................###.......................................................###...',
      '......................####......................................................####...',
      '.......................##........................................................##....',
      '.......................##.......................##...............................##....',
      '......................###......................###..............................###....',
      '......................##.......................##...............................##.....',
      '....####.....####.....##......####....####...#######..###....##......#######....##.....',
      '..##..###...#...##...###....##..##...##..##...###....####...###.....##...##....###.....',
      '.##....#...##...##...##....##...##...#....#...###...#..##...##.....##....##....##......',
      '.##.......##...###...##...###..###...##.......##......###...##....###...###....##......',
      '##.......###.###....###...##.###.....###......##......##...###...###....##....###......',
      '##.......####.......##....###.........###....###.....###...###...##.....##....##.......',
      '##.......##.........##...###..........###....##......##....##....##....###....##.......',
      '##....#..##.....#..###...###....#......##....##..#...##...###...###...###....###.......',
      '##....#..###...#...##..#.###....#..#....#...###.#...###..#.##.#.###..#.##.##.##..#..##.',
      '######...#######...####...######..###..##...####....#####.####..#####..####..####..####',
      '.####.....#####....###.....####....####......##......###..###....###..###....###....##.',
    ],
  },
}

// ── the lockups ──────────────────────────────────────────────────────────────
// Which mark goes with which word, and the colour of the screen each is shown
// lit in. Weight is what pairs them: a solid mark with the bold word, a
// mark of lines with a word of hairlines.
export const LOCKUPS = [
  { key: 'left-on', name: 'left on', mark: 'screen', word: 'draft', tint: 'night' },
  { key: 'sealed', name: 'sealed', mark: 'envelope', word: 'serif', tint: 'amber' },
  { key: 'binary', name: 'two stars', mark: 'binary', word: 'italic', tint: 'rose' },
  { key: 'overlap', name: 'the overlap', mark: 'venn', word: 'matrix', tint: 'ice' },
  { key: 'star-key', name: 'the star key', mark: 'starkey', word: 'draft', tint: 'green' },
]

// A lockup, cell by cell: the mark cut to its lit cells, six cells of air,
// and the word with its x-height's middle on the mark's middle row. The
// display's word is drawn at two cells a pixel beside a mark, so its letters
// stand as tall as the others'
const XMID = { draft: 7.5, matrix: 8.5, serif: 8, italic: 11 }
const lit = (c) => c === '#' || c === 'o'
function trim(rows) {
  const ys = rows.map((r, y) => ([...r].some(lit) ? y : -1)).filter((y) => y >= 0)
  const xs = rows.flatMap((r) => [...r].map((c, x) => (lit(c) ? x : -1))).filter((x) => x >= 0)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  return rows.slice(ys[0], ys[ys.length - 1] + 1).map((r) => r.padEnd(x1 + 1, '.').slice(x0, x1 + 1))
}
const double = (rows) => rows.flatMap((r) => { const d = [...r].map((c) => c + c).join(''); return [d, d] })
export function lockupOf({ mark, word }) {
  const m = trim(MARKS[mark].rows)
  const w = word === 'matrix' ? double(WORDS[word].rows) : WORDS[word].rows
  const top = Math.round((m.length - 1) / 2 - XMID[word])
  const y0 = Math.min(0, top)
  const H = Math.max(m.length, top + w.length) - y0
  const mw = m[0].length
  const out = Array.from({ length: H }, () => Array(mw + 6 + w[0].length).fill('.'))
  m.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') out[y - y0][x] = c }))
  w.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') out[y + top - y0][mw + 6 + x] = c }))
  return out.map((r) => r.join(''))
}

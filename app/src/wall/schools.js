// ── the schools, and the sticker each one prints ────────────────────────────
//
// A letter written to an @ goes up from a verified school address, and it
// carries that school on it as a sticker slapped on the phone's corner
// (Sticker.jsx, and the shared picture in share.js). This file is what a
// sticker IS: the school's short name and its two colours, and the sticker
// itself as a grid of pixels, so the page and the picture draw one drawing.
//
// It is an original drawing and not anybody's mark: the school's short name
// set in a pixel face of our own, on the school's colour, inside a white
// die-cut border, with a small pixel star in its corner and the bottom corner
// lifting off the glass. No script, no seal, no crest.
//
// `berkeley` is the one school posting to an @ today (docs/ONE-WALL.md). The
// rest are here so a school the server opens tomorrow prints in its own
// colours on the first letter, and anything this file does not name prints
// in the neutral one, with the short name the server gave it or its slug.

export const SCHOOLS = {
  berkeley: { short: 'CAL', name: 'UC Berkeley', domain: 'berkeley.edu', bg: '#003262', fg: '#FDB515' },
  stanford: { short: 'STANFORD', name: 'Stanford', domain: 'stanford.edu', bg: '#8C1515', fg: '#FFFFFF' },
  ucla: { short: 'UCLA', name: 'UCLA', domain: 'ucla.edu', bg: '#2774AE', fg: '#FFD100' },
  usc: { short: 'USC', name: 'USC', domain: 'usc.edu', bg: '#990000', fg: '#FFCC00' },
  nyu: { short: 'NYU', name: 'NYU', domain: 'nyu.edu', bg: '#57068C', fg: '#FFFFFF' },
  harvard: { short: 'HARVARD', name: 'Harvard', domain: 'harvard.edu', bg: '#A51C30', fg: '#FFFFFF' },
  mit: { short: 'MIT', name: 'MIT', domain: 'mit.edu', bg: '#A31F34', fg: '#FFFFFF' },
}

// the neutral one: the room's ink under the room's chalk
const NEUTRAL = { bg: '#1F2A44', fg: '#F4F1EA' }

const cleanSlug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

// The school a domain belongs to, by its registrable name: `berkeley.edu`,
// `eecs.berkeley.edu` and `cs.stanford.edu` are Berkeley, Berkeley and
// Stanford. The server's own answer (the `campus` on a verification) wins
// wherever there is one; this is for the places that only hold a domain.
export function slugOfDomain(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^.*@/, '')
  if (!d) return ''
  for (const [slug, s] of Object.entries(SCHOOLS)) {
    if (d === s.domain || d.endsWith(`.${s.domain}`)) return slug
  }
  const parts = d.split('.').filter(Boolean)
  return parts.length >= 2 ? cleanSlug(parts[parts.length - 2]) : cleanSlug(parts[0])
}

// Whether an address or a domain is at Berkeley: the domain itself, or any
// department's subdomain of it.
export function atBerkeley(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'berkeley') return true
  return slugOfDomain(s) === 'berkeley' && /(^|[.@])berkeley\.edu$/.test(s)
}

// Everything the sticker and its label need, for a campus slug. `hint` is
// what the server said about the campus, when it said something (`short`,
// `name`, `domain`), and it fills in for a school this file does not know.
export function schoolOf(slug, hint = {}) {
  const k = cleanSlug(slug)
  if (!k || k === 'global') return null
  const known = SCHOOLS[k]
  const short = String((known && known.short) || hint.short || k).toUpperCase().replace(/[^A-Z0-9&. -]/g, '').trim().slice(0, 9) || k.slice(0, 4).toUpperCase()
  return {
    slug: k,
    short,
    name: (known && known.name) || String(hint.name || '') || k.charAt(0).toUpperCase() + k.slice(1),
    domain: (known && known.domain) || String(hint.domain || '') || '',
    bg: (known && known.bg) || NEUTRAL.bg,
    fg: (known && known.fg) || NEUTRAL.fg,
  }
}

// What a screen reader hears for a sticker: who wrote it, said by the
// school's address when there is one.
export function stickerLabel(school) {
  if (!school) return ''
  return `written by a verified ${school.domain || school.name} student`
}

// ── the face ────────────────────────────────────────────────────────────────
// Five by seven, one pixel strokes, drawn here once and thickened when the
// sticker is set (`bold`), so the letters are the chunky ones a die-cut
// sticker carries and still a whole number of the sticker's pixels.
const FONT = {
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  C: ['.XXX.', 'X...X', 'X....', 'X....', 'X....', 'X...X', '.XXX.'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  F: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'],
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXXX'],
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['XXX', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..XXX', '...X.', '...X.', '...X.', 'X..X.', 'X..X.', '.XX..'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  N: ['X...X', 'XX..X', 'XX..X', 'X.X.X', 'X..XX', 'X..XX', 'X...X'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  V: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  X: ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  Z: ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'],
  0: ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
  1: ['.X.', 'XX.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  2: ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  3: ['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'],
  4: ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'],
  5: ['XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'],
  6: ['.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  7: ['XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...'],
  8: ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'],
  9: ['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.'],
  '&': ['.XX..', 'X..X.', 'X.X..', '.X...', 'X.X.X', 'X..X.', '.XX.X'],
  '.': ['.', '.', '.', '.', '.', '.', 'X'],
  '-': ['...', '...', '...', 'XXX', '...', '...', '...'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

// the small star in the corner: four points, a lit middle
const STAR = ['...X...', '...X...', '..XXX..', 'XXXXXXX', '..XXX..', '...X...', '...X...']

// ── the sticker, as pixels ──────────────────────────────────────────────────
// A grid of cells, each one of:
//
//   0  nothing (the glass shows through)
//   1  the die-cut border, white
//   2  the school's colour
//   3  the letters, in the school's second colour
//   4  the letters' shadow, a step darker than the ground
//   5  the star, where it stands on the school's colour
//   6  the back of the sticker, where the corner lifts
//   7  the crease along that fold
//   8  the star, where it stands off the colour, on the die cut
//
// and any of 1 to 8 plus ten: the same, in the shadow the lifted corner
// throws on the sticker along its edge.
//
// `short` is set across one line; a long one is set in a narrower gap and
// the sticker is simply wider, and the caller sizes it by its height.
const cache = new Map()

export function stickerGrid(short) {
  const text = String(short || '').toUpperCase().slice(0, 9) || '?'
  if (cache.has(text)) return cache.get(text)
  const glyphs = [...text].map((ch) => FONT[ch] || FONT[' '])
  // the letters, thickened: every cell also lit one to its right
  const bold = glyphs.map((g) => g.map((row) => {
    const r = `${row}.`
    let out = ''
    for (let i = 0; i < r.length; i++) out += r[i] === 'X' || (i > 0 && r[i - 1] === 'X') ? 'X' : '.'
    return out
  }))
  const gap = text.length > 5 ? 1 : 1
  const tw = bold.reduce((n, g) => n + g[0].length, 0) + gap * (bold.length - 1)
  const th = 7
  // the plate: the letters with room round them, and a cell more below for
  // their shadow; the star needs its corner
  const padX = 3
  const padTop = 4
  const padBot = 3
  const border = 2
  const pw = tw + padX * 2
  const ph = th + padTop + padBot
  const starH = STAR.length
  // the star stands on the plate's top right corner, half off it
  const starX = pw - Math.ceil(STAR[0].length / 2) - 1
  const starY = -Math.floor(starH / 2) + 1
  const ox = border
  const oy = border + Math.max(0, -starY)
  const W = pw + border * 2 + Math.max(0, starX + STAR[0].length - pw)
  const H = ph + oy + border
  const g = Array.from({ length: H }, () => new Uint8Array(W))
  // the plate, its corners stepped round
  const R = 2
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const dx = x < R ? R - x : x >= pw - R ? x - (pw - R - 1) : 0
      const dy = y < R ? R - y : y >= ph - R ? y - (ph - R - 1) : 0
      if (dx && dy && dx + dy > R + 1) continue
      g[oy + y][ox + x] = 2
    }
  }
  // the star, over the corner
  STAR.forEach((row, j) => [...row].forEach((c, i) => {
    const X = ox + starX + i
    const Y = oy + starY + j
    if (c === 'X' && Y >= 0 && Y < H && X < W) g[Y][X] = g[Y][X] === 2 ? 5 : 8
  }))
  // the die cut: everything within two cells of the plate or the star, round
  const solid = g.map((row) => Array.from(row, (v) => v !== 0))
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y][x]) continue
      let near = false
      for (let j = -border; j <= border && !near; j++) {
        for (let i = -border; i <= border && !near; i++) {
          if (i * i + j * j > border * border + 1) continue
          const yy = y + j
          const xx = x + i
          if (yy >= 0 && yy < H && xx >= 0 && xx < W && solid[yy][xx]) near = true
        }
      }
      if (near) g[y][x] = 1
    }
  }
  // the letters and their shadow, one cell down and right
  let at = ox + padX
  const ty = oy + padTop
  bold.forEach((gl) => {
    gl.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== 'X') return
      const sx = at + i + 1
      const sy = ty + j + 1
      if (g[sy] && g[sy][sx] === 2) g[sy][sx] = 4
    }))
    gl.forEach((row, j) => [...row].forEach((c, i) => {
      if (c === 'X') g[ty + j][at + i] = 3
    }))
    at += gl[0].length + gap
  })
  // the corner lifting off the glass: the bottom right cut away along a
  // diagonal and folded back over itself, the sticker's white back showing,
  // with a crease where it bends
  const k = Math.max(4, Math.round(Math.min(W, H) * 0.26))
  const line = W + H - 2 - k
  const lifted = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x + y > line && g[y][x]) { lifted.push([x, y]); g[y][x] = 0 }
    }
  }
  for (const [x, y] of lifted) {
    // reflected across the fold, x + y = line
    const rx = line - y
    const ry = line - x
    if (ry >= 0 && ry < H && rx >= 0 && rx < W) g[ry][rx] = 6
  }
  for (let y = 0; y < H; y++) {
    const x = line - y
    if (x >= 0 && x < W && g[y][x]) g[y][x] = 7
  }
  // and the flap's shadow on the sticker, a cell wide along its two free
  // edges, so the corner reads as lifted and not as cut
  const flap = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 6) flap.push([x, y])
  for (const [x, y] of flap) {
    for (const [xx, yy] of [[x - 1, y], [x, y - 1], [x - 1, y - 1]]) {
      const v = g[yy] && g[yy][xx]
      if (v && v <= 8 && v !== 6 && v !== 7) g[yy][xx] = v + 10
    }
  }
  const out = { w: W, h: H, cells: g }
  cache.set(text, out)
  return out
}

// The colour of each kind of cell, for a school.
export function stickerInks(school) {
  const bg = (school && school.bg) || NEUTRAL.bg
  const fg = (school && school.fg) || NEUTRAL.fg
  const ink = {
    1: '#FFFFFF',
    2: bg,
    3: fg,
    4: shade(bg, 0.55),
    5: fg,
    6: '#E6E2DA',
    7: '#B3AEA4',
    // a white star on the white die cut would be no star: there it is the
    // school's colour
    8: light(fg) ? bg : fg,
  }
  for (let v = 1; v <= 8; v++) ink[v + 10] = shade(ink[v], v === 1 ? 0.74 : 0.62)
  return ink
}

function light(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.8
}

function shade(hex, k) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  const r = Math.round(((n >> 16) & 255) * k)
  const g = Math.round(((n >> 8) & 255) * k)
  const b = Math.round((n & 255) * k)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// One run per row of each ink, as `[ink, x, y, w]`, so a drawing is a few
// dozen rectangles and not a few hundred.
export function stickerRuns(grid) {
  const runs = []
  grid.cells.forEach((row, y) => {
    let x = 0
    while (x < grid.w) {
      const v = row[x]
      if (!v) { x++; continue }
      let e = x + 1
      while (e < grid.w && row[e] === v) e++
      runs.push([v, x, y, e - x])
      x = e
    }
  })
  return runs
}

// A stable tilt for one letter's sticker, off its id: never straight, never
// more than about ten degrees, and the same on every device.
export function stickerTilt(seed) {
  let h = 0x811c9dc5
  for (const ch of String(seed || '')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
  const mag = 4 + (h % 60) / 10
  return (h & 64 ? -1 : 1) * mag
}

// ── what a letter carries ───────────────────────────────────────────────────
// For a letter as the wall reads it (api.js `shapeLetter`): the salutation
// its writer set, or nothing, in which case the screen says "dear" and the
// name; the sticker, for a letter posted from a verified school address; and
// for a name note the writer tagged with a school, the school's short name as
// a plain tag, since a name note is never verified and never carries the
// sticker. A letter from before the one wall carries none of these fields,
// and draws as it always did.
export function letterMarks(l) {
  if (!l) return { salutation: '', sticker: null, tag: '' }
  const salutation = l.salutation ? String(l.salutation) : ''
  const campus = l.campus && l.campus !== 'global' ? l.campus : ''
  if (l.verified && campus) {
    return { salutation, sticker: schoolOf(campus, { name: l.school || '' }), tag: '' }
  }
  const school = campus && l.kind === 'name' ? schoolOf(campus, { name: l.school || '' }) : null
  return { salutation, sticker: null, tag: school ? school.short.toLowerCase() : '' }
}

// ── the keepsake's picture, laid out ────────────────────────────────────────
//
// Where everything on the mutual's picture goes (keepshare.js, which draws
// it), which is where it stands on the keepsake (Keepsake.jsx, mutual.css):
// the phone's band, the aerial, the night and the pair's one battery; the
// mark crowning the glass, `it's mutual.` in its cells; the two first names
// under it; the two notes, each a small screen with its strip and its line,
// its words and whose it is; the phone's foot; and the product's signature
// under the phone. All of it inside the middle 1080 by 1350 of a story's 1080 by 1920,
// which is what a feed crops a post to. Arithmetic and a measure, and
// nothing drawn, so scripts/check-stories.mjs lays out the notes and the
// lines a person could write here as well, in node, and holds the picture to
// its crop (section 7).
//
// It is kept to the crop however the notes are written. Both are set at the
// one size the longer takes, the largest of the sizes they both fit at; and
// two notes too long for the phone even at the least of them, which a note
// of many short lines is (a line break is a line however little is on it,
// and a note of forty letters one to a line is shorter than the limit),
// keep what room there is between them, the shorter all of its lines and
// the other the rest, and a note cut short ends on an ellipsis. Until the
// review of 28 September the size stopped at the least and the phone went
// on growing: nine short lines put the signature under the crop, and forty
// took the foot of the phone off the picture. The two lines across the
// strips are one size as well, the one the longer needs, never larger than
// a step over the words, and cut with an ellipsis only at the least of it;
// they are one line, and take no more room however they are written. The
// mark's panel is what is left: six pixels to a cell whenever the words
// can be 28 or more beside it, and never under five.

import { wrap, fit } from './wrap.js'
import { s40Face } from './type.js'

export const W = 1080
export const H = 1920
// the feed's crop, the band everything that matters stands in
export const CROP_TOP = 285
export const CROP_BOT = 1635
// the phone: 840 wide, and every size on it in the keepsake's own unit, a
// hundredth of its width (mutual.css `--su`)
export const PX = 120
export const PW = 840
export const SU = PW / 100
// the band over the glass, the one status row, and the foot under it
export const BAND = Math.round(14.8 * SU)
export const FOOT = Math.round(10 * SU)
// The battery on the band, the pair's (keepface.js, 0077): the glyph's
// seventeen columns and eight rows at eight pixels to a row, so it is crisp
// (looks.js `bata0` to `bata4`), which is 7.6 units to the page's 8, and
// its far end the band's edge in from the phone's, as the aerial's near end
// is (mutual.css `.wl-scr-top`). The notes each carried one of their own
// until the owner put the one at the top of the card (29 September)
export const BAND_BAT_H = 64
export const BAND_BAT_W = (17 * BAND_BAT_H) / 8
export const BAND_END = Math.round(2.2 * SU)
// the signature under the phone, and the room between them
export const SIGN_GAP = 76
export const SIGN_H = 52

// ── the glass ──
// the notes' margin from the glass's edges, the air between them, and
// under the last of them
export const SIDE = Math.round(3.4 * SU)
export const GAP = Math.round(2.4 * SU)
const LOW = Math.round(2.8 * SU)
// the mark's panel: never smaller than five pixels to a cell of the story,
// no taller than it needs to be, and with the notes left off the panel
// the phone's width gives it
const COLS = 95
const ROWS = 75
const MARK_MIN = 5 * ROWS
// and six pixels to a cell whenever the notes still have words of 28 or
// more beside it: the mark crowns the phone, and at five it was a quarter
// of the phone wide over two short notes set as large as they would go
const MARK_GOOD = 6 * ROWS
const GOOD_WORDS = 28
const MARK_MAX = 8 * ROWS + 38
const MARK_BARE = 663
// The names, under `it's mutual.`: as large as 8 units, or as the line
// allows, down to 4.6, stood up 2.2 into the foot of the story's last row
// (mutual.css `.wl-keep-pair`), the ampersand a gap either side; then 5.4
// to the first note. With nobody named, the first note that much under the
// sentence
const NAME_MAX = Math.round(8 * SU)
const NAME_MIN = Math.round(4.6 * SU)
export const NAME_UP = Math.round(2.2 * SU)
export const NAME_GAP = Math.round(1.8 * SU)
const NAME_LOW = Math.round(5.4 * SU)
const SAY_LOW = Math.round(4.4 * SU)

// ── a note ──
// its strip, and the line on it; the words' inset from the panel's edge and
// the room over them; whose it is, under them
export const HEAD = Math.round(6.4 * SU)
export const INSET = Math.round(3 * SU)
export const HEAD_END = Math.round(2.6 * SU)
const TITLE_MAX = Math.round(5.4 * SU)
const TITLE_MIN = Math.round(3.1 * SU)
export const WORDS_TOP = Math.round(2.2 * SU)
export const FROM_TOP = Math.round(1.2 * SU)
export const FROM_LOW = Math.round(2 * SU)
// The notes' words, as large as both will go at one size: a line or two of
// each at the largest, the whole of two notes of 280 characters at the least
const WORDS = [56, 52, 48, 44, 40, 37, 34, 32, 30, 28, 26]
// whose it is, never larger than what they wrote: at the smallest words the
// caption comes down with them, to a size still read at a glance
export const capOf = (f) => Math.max(24, Math.min(Math.round(5.2 * SU), Math.round(f * 0.8)))
// a note sent without one: the sealed note and a line saying so
export const SEAL_H = 44
export const SEAL_GAP = 12
export const SEAL_SAY = 36
const SEALED = SEAL_H + SEAL_GAP + SEAL_SAY

export const faceOf = (text) => s40Face(text)
export const LINE = 1.02
export const NOTE_W = PW - 2 * SIDE
export const INNER = NOTE_W - 2 * INSET
// the room a line has on its strip: the strip, less the insets either end.
// It was less a battery and the gap before it too, while each note carried
// one
export const TITLE_ROOM = NOTE_W - INSET - HEAD_END
// the tallest the phone may be: the crop, less 15 either side of the block,
// the gap and the signature
const MOST = CROP_BOT - CROP_TOP - 30 - SIGN_GAP - SIGN_H

// Where the story's last row ends in a mark's panel `m` tall: its grid laid
// as PixelStory.jsx `paintStill` lays it, a whole number of pixels to a
// cell, the rows in the middle of the panel
export function storyFoot(m) {
  const cell = Math.max(1, Math.floor(Math.min(PW / COLS, m / ROWS)))
  const pr = Math.max(ROWS, Math.floor(m / cell))
  const my = (m - pr * cell) >> 1
  return my + (((pr - ROWS) >> 1) + ROWS) * cell
}

// A note's height at word size `f`, and its lines. An empty note is the
// sealed note's glyph over a line saying so
function noteOf(g, text, f) {
  const chrome = HEAD + WORDS_TOP + FROM_TOP + capOf(f) + FROM_LOW
  if (!text) return { lines: null, h: chrome + SEALED, chrome }
  g.font = `400 ${f}px ${faceOf(text)}`
  const lines = wrap(g, text, INNER)
  return { lines, h: chrome + Math.round(lines.length * f * LINE), chrome }
}

// Two notes still too tall for `room` at the least size: each keeps its
// share of the lines there is room for (see the header), theirs the odd one
function clamped(g, notes, { f, a, b }, room) {
  const lh = f * LINE
  // the lines there is room for, round what each note has besides its lines
  // (an empty one's all of it), with a pixel spare for the two heights each
  // rounded
  const bare = (x) => (x.lines ? x.chrome : x.h)
  const n = Math.max(2, Math.floor((room - bare(a) - bare(b) - 1) / lh))
  const na = a.lines ? a.lines.length : 0
  const nb = b.lines ? b.lines.length : 0
  const most = Math.ceil(n / 2)
  const ka = nb <= n - most ? n - nb : Math.min(na, most)
  const kb = n - ka
  const cut = (text, note, k) => {
    if (!note.lines || note.lines.length <= k) return note
    const lines = note.lines.slice(0, Math.max(1, k))
    const last = lines.length - 1
    g.font = `400 ${f}px ${faceOf(text)}`
    lines[last] = fit(g, `${lines[last].replace(/\s+$/, '')}…`, INNER)
    return { lines, h: note.chrome + Math.round(lines.length * lh), chrome: note.chrome }
  }
  return { f, a: cut(notes[0], a, ka), b: cut(notes[1], b, kb) }
}

// The two first names as one line, `A & B`, as large as the glass lets it
// be up to 8 units and no smaller than 4.6, each name cut to half the line
// only if even that is too wide
function namesOf(g, names) {
  if (!names) return null
  const [a, b] = names
  const room = 0.96 * NOTE_W
  const at = (size) => {
    g.font = `400 ${size}px ${faceOf(`${a}${b}`)}`
    return g.measureText(a).width + g.measureText('&').width + g.measureText(b).width + 2 * NAME_GAP
  }
  const w = at(NAME_MAX)
  const size = w <= room ? NAME_MAX : Math.max(NAME_MIN, Math.floor((NAME_MAX * room) / w))
  if (at(size) <= room) return { size, parts: [a, b] }
  g.font = `400 ${size}px ${faceOf(`${a}${b}`)}`
  const half = (room - g.measureText('&').width - 2 * NAME_GAP) / 2
  return { size, parts: [fit(g, a, half), fit(g, b, half)] }
}

// The two lines across the strips, at the one size the longer needs: a
// step under the words, as a note's strip is on the page, up to 5.4 units,
// down to 3.1 to fit the strip, and cut only there
function titlesOf(g, titles, f) {
  if (!titles) return null
  const most = Math.max(TITLE_MIN, Math.min(TITLE_MAX, Math.round(f * 0.86)))
  const at = (size) => Math.max(...titles.map((t) => {
    g.font = `400 ${size}px ${faceOf(t)}`
    return g.measureText(t).width
  }))
  const w = at(most)
  const size = w <= TITLE_ROOM ? most : Math.max(TITLE_MIN, Math.floor((most * TITLE_ROOM) / w))
  return {
    size,
    lines: titles.map((t) => {
      g.font = `400 ${size}px ${faceOf(t)}`
      return fit(g, t, TITLE_ROOM)
    }),
  }
}

// Where everything goes, for the picture with the notes and without them.
// `g` is anything with a font and `measureText` (a canvas's context). With
// the notes off there are no notes and no lines: the mark and the names
// alone, the mark larger, and the band as it always is, its battery on it
export function layoutOf(g, o) {
  const names = namesOf(g, o.names)
  // where the first note starts under a mark's panel `m` tall: under the
  // names, or under the sentence
  const glassFoot = (m) => BAND + storyFoot(m) + (names ? names.size - NAME_UP + NAME_LOW : SAY_LOW)
  if (!o.notes) {
    const inner = names ? storyFoot(MARK_BARE) - NAME_UP + names.size + Math.round(3 * SU) : MARK_BARE
    const glass = Math.max(MARK_BARE, inner)
    return { names, f: 0, title: null, notes: null, mark: MARK_BARE, glass, foot: FOOT, ph: BAND + glass + FOOT }
  }
  const tail = GAP + LOW + FOOT
  // the room the two notes have between them with the mark at six pixels
  // to a cell, and the largest words both fit at there; failing that, with
  // the mark at its least
  const pickAt = (m, least) => {
    const room = MOST - glassFoot(m) - tail
    let pick = null
    // (two notes sent without words have no words to size, and their
    // captions and lines are sized to the line that says so)
    for (const f of o.notes.some(Boolean) ? WORDS : [SEAL_SAY]) {
      if (f < least) break
      pick = { f, a: noteOf(g, o.notes[0], f), b: noteOf(g, o.notes[1], f) }
      if (pick.a.h + pick.b.h <= room) return { pick, room }
    }
    return { pick, room, over: true }
  }
  let at = pickAt(MARK_GOOD, GOOD_WORDS)
  if (at.over) at = pickAt(MARK_MIN, 0)
  let { pick } = at
  if (at.over) pick = clamped(g, o.notes, pick, at.room)
  // and the mark as large as the room left lets it be
  let mark = MARK_MAX
  while (mark > MARK_MIN && glassFoot(mark) + pick.a.h + pick.b.h + tail > MOST) mark--
  const first = glassFoot(mark)
  const ph = first + pick.a.h + GAP + pick.b.h + LOW + FOOT
  return {
    names, f: pick.f, title: titlesOf(g, o.titles || null, pick.f),
    notes: [pick.a, pick.b], tops: [first, first + pick.a.h + GAP], mark, glass: ph - BAND - FOOT, foot: FOOT, ph,
  }
}

// The top of the phone on the picture: the phone and the signature under it
// one block in the middle of the feed's crop, never above its top
export function topOf(L) {
  const block = L.ph + SIGN_GAP + SIGN_H
  return Math.max(CROP_TOP + 15, Math.round(CROP_TOP + (CROP_BOT - CROP_TOP - block) / 2))
}

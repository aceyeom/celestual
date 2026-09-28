// ── the keepsake's picture, laid out ────────────────────────────────────────
//
// Where everything on the mutual's picture goes (keepshare.js, which draws
// it): the phone's bands, the two notes, the mark between them and the
// signature under it, all inside the middle 1080 by 1350 of a story's 1080
// by 1920, which is what a feed crops a post to. Arithmetic and a measure,
// and nothing drawn, so scripts/check-stories.mjs lays out the notes a
// person could write here as well, in node, and holds the picture to its
// crop (section 7).
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
// took the foot of the phone off the picture.

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
// the band over the glass: the status row, and the two of them on a second
// row under it; with nobody named, the one row, and no dark band where the
// names would be
export const TOP = Math.round(25.8 * SU)
export const TOP_ALONE = Math.round(14.8 * SU)
export const GUTTER = 5
// the signature under the phone, and the room between them
export const SIGN_GAP = 76
export const SIGN_H = 52

// The notes' words, as large as both will go at one size: a line or two of
// each at the largest, the whole of two notes of 280 characters at the least
const WORDS = [56, 52, 48, 44, 40, 37, 34, 32, 30, 28, 26]
export const PAD = Math.round(4 * SU)
const CAPTION = Math.round(5.2 * SU)
// whose it is, never larger than what they wrote: at the smallest words the
// caption comes down with them, to a size still read at a glance
export const capOf = (f) => Math.max(24, Math.min(CAPTION, Math.round(f * 0.8)))
export const CAP_GAP = Math.round(2.4 * SU)
// the mark's panel: never smaller than five pixels to a cell of the story,
// and no taller than it needs to be
const MARK_MIN = 5 * 75 + 10
const MARK_MAX = 8 * 75 + 38
// the phone's foot, under the notes and without them
const FOOT = Math.round(10 * SU)
const FOOT_BARE = Math.round(14 * SU)
// the mark alone, with the notes left off
const MARK_BARE = 663

export const faceOf = (text) => s40Face(text)
export const LINE = 1.02
const INNER = PW - 2 * PAD
// the tallest the phone may be: the crop, less 15 either side of the block,
// the gap and the signature
const MOST = CROP_BOT - CROP_TOP - 30 - SIGN_GAP - SIGN_H

// A note's height at word size `f`, and its lines. An empty note is the
// sealed note's glyph over a line saying so
function noteOf(g, text, f) {
  const chrome = PAD + capOf(f) + CAP_GAP + PAD
  if (!text) return { lines: null, h: chrome + Math.round(7 * SU + 2 * SU + 6.2 * SU), chrome }
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

// Where everything goes, for the picture with the notes and without them.
// `g` is anything with a font and `measureText` (a canvas's context)
export function layoutOf(g, o) {
  const top = o.names ? TOP : TOP_ALONE
  if (!o.notes) return { top, f: 0, notes: null, mark: MARK_BARE, foot: FOOT_BARE, ph: top + MARK_BARE + FOOT_BARE }
  // the room the two notes have between them, with the mark at its least
  const room = MOST - top - 2 * GUTTER - MARK_MIN - FOOT
  let pick = null
  for (const f of WORDS) {
    pick = { f, a: noteOf(g, o.notes[0], f), b: noteOf(g, o.notes[1], f) }
    if (pick.a.h + pick.b.h <= room) break
  }
  if (pick.a.h + pick.b.h > room) pick = clamped(g, o.notes, pick, room)
  const mark = Math.max(MARK_MIN, Math.min(MARK_MAX, room - pick.a.h - pick.b.h + MARK_MIN))
  const ph = top + pick.a.h + GUTTER + mark + GUTTER + pick.b.h + FOOT
  return { top, f: pick.f, notes: [pick.a, pick.b], mark, foot: FOOT, ph }
}

// The top of the phone on the picture: the phone and the signature under it
// one block in the middle of the feed's crop, never above its top
export function topOf(L) {
  const block = L.ph + SIGN_GAP + SIGN_H
  return Math.max(CROP_TOP + 15, Math.round(CROP_TOP + (CROP_BOT - CROP_TOP - block) / 2))
}

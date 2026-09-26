// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE CREATURES: who somebody is in a thread, and nowhere else            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A reply is anonymous to everybody reading it (migration 0068), and a thread
// of fifteen anonymous replies set in one face is fifteen of the same grey
// line: nobody can tell who is answering whom, or that the third reply and
// the eighth are the same person. So every writer in a thread is a small
// creature on a small screen, and a name of two words for it (`quiet moth`),
// the way a phone with no contact saved for a number still gave the number a
// picture.
//
// ── what it is made of ──────────────────────────────────────────────────────
// `who`, which is all the server says about a writer: sixteen hex of a
// salted hash of the letter and the author (0068 `wall_reply_who`). The same
// person is the same creature all the way down one thread, and a different
// one under the next letter, so a creature cannot be followed from thread to
// thread and says nothing about anybody. Everything below is arithmetic on
// those sixteen figures; nothing is `Math.random()`, so a creature is the
// same on every phone.
//
//   the kind     one of fifteen, each drawn on an eleven by ten grid of the
//                screen's own cells, facing you, the way the phone's own
//                glyphs are drawn (looks.js PIX). Drawn as half of itself
//                and mirrored, so every one is symmetrical by construction
//   the screen   one of the twelve colours a letter is lit in (looks.js
//                COLOURS), in that colour's own inks: a lit screen's panel
//                with its words' dark ink, a print's paper and its darkest
//                ink, acid's lime and black. The twelve hues live on screens
//                and nowhere else (DESIGN.md 2.5), and this is a screen: a
//                creature is a picture on a small one, as a person's face is
//                (`PixelPic`)
//   the blush    whether its cheeks are in the second ink
//   the name     a word from a short gentle list and the kind, so the name
//                is what is drawn. Never anything that could describe a
//                person, and never anything unkind
//
// The recipient is never a creature. Their reply carries their own small
// screen, the face of the @ the letter is to (Replies.jsx), because the one
// thing a recipient's reply says is who is answering.

import { COLOURS, mix } from './looks.js'

// ── the kinds ───────────────────────────────────────────────────────────────
// Half of each drawing, from the left edge to the middle column inclusive,
// mirrored on the way out (`draw`). `X` is the ink, `h` the second ink, `c`
// a cheek (the second ink when it blushes, the ink when it does not), `o`
// an eye cut out of the ink to the panel under it, `.` the panel.
const KINDS = [
  ['ghost', ['...XXX', '..XXXX', '.XXXXX', '.XXoXX', '.XXoXX', '.XXXXX', '.XcXXX', '.XXXXX', '.XXXXX', '.X.XX.']],
  ['cat', ['.X....', '.XX...', '.XXXXX', 'XXXXXX', 'XXXoXX', 'XXXoXX', 'XcXXX.', 'XXXX.X', '.XXXXX', '..XXXX']],
  ['frog', ['.XXX..', 'XXoXX.', 'XXXXXX', 'XcXXXX', 'XX.XXX', 'XXX...', '.XXXXX', '.XX.XX', 'XXX...']],
  ['owl', ['.X....', '.XX...', '.XXXXX', 'XhhhXX', 'XhXhXX', 'XhhhX.', 'XXXXXh', 'XXhXXX', '.XXXXX', '..X...']],
  ['bear', ['.XX...', 'XXXXXX', 'XXXXXX', 'XXXoXX', 'XcXXXX', 'XXXhhh', 'XXXhhX', '.XXXhh', '..XXXX']],
  ['rabbit', ['.XXX..', '.XhX..', '.XhX..', '.XXXXX', 'XXXXXX', 'XXXoXX', 'XcXXXX', 'XXXXXh', '.XXXXX', '..XXXX']],
  ['mouse', ['XXX...', 'XhX...', 'XXXXXX', '.XXXXX', '.XXoXX', '.XcXXX', '..XXXh', '...XXX', '....XX']],
  ['fox', ['X.....', 'XX....', 'XhX...', 'XXXXXX', 'XXXoXX', '.XXXXX', '.hhXXX', '..hhhX', '...hhh', '....hh']],
  ['penguin', ['...XXX', '..XXXX', '.XXhhh', '.XhXhh', '.XhhhX', 'XXhhhh', 'XXhhhh', 'X.hhhh', '..hhhh', '..XX..']],
  ['chick', ['.....X', '...XXX', '..XXXX', '.XXoXX', '.XcXhh', '.XXXXh', '.XXXXX', '..XXXX', '...XXX', '...X..']],
  ['octopus', ['...XXX', '..XXXX', '.XXXXX', '.XXoXX', '.XcXXX', '.XXXXX', 'XXXXXX', 'X.XX.X', 'X.X..X', '..X...']],
  ['alien', ['..X...', '...X..', '..XXXX', '.XXXXX', 'XXoooX', 'XXXooX', '.XXXXX', '..XXXX', '...XX.', '....XX']],
  ['jellyfish', ['...XXX', '.XXXXX', 'XXXXXX', 'XXXoXX', 'XcXXXX', 'XhXhXh', '.X.X.X', '.X..X.', 'X...X.', '....X.']],
  ['moth', ['..X...', '...X..', 'XX..XX', 'XXX.XX', 'XhXXoX', 'XXXXXX', '.XXXXX', '..X.XX', '.X..XX', '....XX']],
  ['bat', ['....X.', 'X...XX', 'XX.XXX', 'XXXXoX', 'XXXXXX', 'X.XXXh', '...XXX', '....X.']],
]

// The word before the kind. Gentle, short, and nothing a person could be
// described by or hurt by.
const WORDS = [
  'quiet', 'small', 'late', 'soft', 'still', 'sleepy', 'brave', 'calm', 'bright', 'shy',
  'kind', 'slow', 'lucky', 'early', 'gentle', 'tiny', 'pale', 'warm', 'fond', 'round',
]

// A drawing's grid: eleven wide, as tall as its rows, each cell one of the
// codes above, with `c` settled by the blush.
const W = 11
function draw(half, blush) {
  return half.map((row) => {
    const left = row.padEnd(6, '.').slice(0, 6)
    const full = left + [...left.slice(0, 5)].reverse().join('')
    return [...full].map((ch) => (ch === 'c' ? (blush ? 'h' : 'X') : ch))
  })
}

// ── the inks of a screen ────────────────────────────────────────────────────
// What a small screen in each colour is painted with: the panel, its hot
// corner, the ink a creature is drawn in, and the second ink. Read off the
// colour table itself, so a colour that changes there changes here.
export function inksOf(c) {
  const colour = c || COLOURS[0]
  switch (colour.kind) {
    case 'lit':
      return { panel: colour.hue, hi: mix(colour.hue, '#FFFFFF', 0.34), ink: mix(colour.hue, '#000000', 0.86), mid: mix(colour.hue, '#000000', 0.48), lit: true }
    case 'neg':
      // the panel dark and the words the bright thing, so what it throws on
      // the glass is its words' light and not its panel's
      return { panel: '#161616', hi: '#2A2A2A', ink: '#EDEDED', mid: '#7C7C7C', lit: false, dark: true, glow: colour.hue }
    case 'brat':
      return { panel: colour.hue, hi: mix(colour.hue, '#F4F07A', 0.4), ink: colour.ink || '#050505', mid: mix(colour.hue, '#000000', 0.5), lit: false }
    case 'riso':
      return { panel: colour.b, hi: mix(colour.b, '#FFFFFF', 0.28), ink: colour.a, mid: mix(colour.a, colour.b, 0.45), lit: false }
    default: {
      // a print: its paper, and its darkest ink for the words. A copy has
      // no second ink of its own, so its toner is let down halfway
      const s = Array.isArray(colour.stops) && colour.stops.length >= 4 ? colour.stops : ['#101010', '#555555', '#DDDDDD', '#F4F1EA']
      const mid = s[1] === s[0] ? mix(s[0], s[2], 0.5) : s[1]
      return { panel: s[2], hi: s[3], ink: s[0], mid, lit: false }
    }
  }
}

// ── one writer ──────────────────────────────────────────────────────────────
// Sixteen hex in; the kind, the screen, the drawing and the name out. Kept,
// since a thread asks for the same few over and over as it is drawn.
const MEMO = new Map()

function figures(who) {
  const s = String(who || '').toLowerCase().replace(/[^0-9a-f]/g, '')
  if (s.length >= 12) return s
  // not a server's `who` (a fixture, an old tab): hashed into sixteen hex
  let a = 0x811c9dc5
  let b = 0x01000193
  for (const ch of String(who || 'nobody')) {
    a = Math.imul(a ^ ch.charCodeAt(0), 0x01000193) >>> 0
    b = Math.imul(b ^ (a >>> 7), 0x27d4eb2d) >>> 0
  }
  return (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'))
}

export function creatureOf(who) {
  const key = String(who || '')
  if (MEMO.has(key)) return MEMO.get(key)
  const f = figures(key)
  const n = (i, len = 4) => parseInt(f.slice(i, i + len), 16) || 0
  const [kind, half] = KINDS[n(0) % KINDS.length]
  const colour = COLOURS[n(4) % COLOURS.length]
  const word = WORDS[n(8) % WORDS.length]
  const blush = (n(12, 1) & 1) === 1
  const out = {
    kind, colour: colour.slug, inks: inksOf(colour),
    grid: draw(half, blush), w: W, name: `${word} ${kind}`,
  }
  MEMO.set(key, out)
  return out
}

// The names of every writer in a thread, in the order they first spoke, with
// a figure after any name a second writer in the same thread drew too, so
// two quiet moths are never one.
export function namesFor(whos) {
  const seen = new Map()
  const out = new Map()
  for (const w of whos) {
    if (!w || out.has(w)) continue
    const base = creatureOf(w).name
    const k = (seen.get(base) || 0) + 1
    seen.set(base, k)
    out.set(w, k > 1 ? `${base} ${k}` : base)
  }
  return out
}

// For the contact sheet on the components page, and for a test that walks
// every kind: the kinds, by name.
export const CREATURES = KINDS.map(([k]) => k)

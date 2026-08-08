// card/model.js — the card, as data.
//
// The change the whole plan turns on (the plan, §0): the two fields are split
// in time. The PHOTO is now — where you are, this minute, while you're thinking
// about them. The WORDS are then — the small thing you still remember.
//
// This matters because the photo was never of the memory and never could be. A
// large share of the people this is for have no photograph of the person they
// are entering: the crush, the situationship, the one who never became
// anything. Sending them into a three-year-old camera roll at 2am to hunt for a
// picture is where the funnel dies. Everyone is somewhere. Everyone remembers
// one small thing.
//
// It also fixes the sky. Every image is recent, ambient, low-light, quiet — a
// ceiling, a windshield, a stairwell, a street — so the field composites into
// one work instead of a collage of strangers' vacations.

// Twenty words, hard. Not a character count: a character count teaches people to
// write shorter sentences, and a word count teaches them to write one true
// thing.
import { FONT, TOKENS, GROUNDS, CARD_FACES } from '../theme.js'

export const MAX_WORDS = 20

// The one universal prompt. There is no dropdown, no category, no relationship
// label — the ambiguity is the product (the plan, §1.3). It asks for as little
// as it can: the field is where a person is going to hesitate, and a prompt
// that describes the assignment is a prompt they read twice. The three seeds
// under it do the teaching.
export const PROMPT = 'leave a short message'

// ── the seeds ────────────────────────────────────────────────────────────────
// Never show an empty composer. These are the register, taught by example
// rather than by instruction: plain, specific, unpoetic, and about a detail
// nobody would invent. A blank canvas produces the two failure modes — the joke
// card and the empty hedge — and no amount of copy under the field prevents
// either one. Three real cards do.
export const SEEDS = [
  'you always took the window seat',
  'you laughed a beat late, every time',
  'we said we would be roommates',
]

export const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean)
export const wordCount = (s) => words(s).length

// Trim to the ceiling without cutting a word in half.
export function clampWords(s, max = MAX_WORDS) {
  const w = words(s)
  if (w.length <= max) return s
  return w.slice(0, max).join(' ')
}

// A card can be placed once it has its words. The photo is optional by
// deliberate decision: the words are the costly signal and the thing no
// competitor can ask for, and the photo is the step most likely to lose someone
// at 2am. A card with no photo is not a hole — the disc simply shows the star's
// own surface, so it is still, literally, a star.
export const cardReady = (card) => wordCount(card && card.words) > 0

// ── the light a card is lit by ───────────────────────────────────────────────
// A star's colour used to be looked up from which category a person filed the
// other one under — crush, ex, friend, complicated. That is banned outright: no
// dropdown, no category, no relationship label, ever, because the ambiguity is
// the product (§1.3). So the tint cannot come from a picker.
//
// It comes from the GROUND. A star's colour is its temperature, and the card IS
// the star's surface, so the surface decides. Paper throws the palest light,
// chalk sits between, leather burns deepest; a photograph is measured the same
// way, off its own warmth. One number, no picker, and it moves along the one
// hue's own value ramp — wheat at the paper end, saddle at the leather end —
// which is how a monochrome brand shows difference without cheating.
//
// A card with no ground at all is wheat, which is the palest light in the
// product and what every unwritten star in this sky already is.
export function tintOf(C, tone) {
  const t = typeof tone === 'number' ? Math.max(0, Math.min(1, tone)) : 1
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
  const a = hex((C && C.saddle) || TOKENS.saddle) // the leather end
  const b = hex((C && C.them) || TOKENS.them) //     the paper end
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// ── the grounds ──────────────────────────────────────────────────────────────
// A card's ground is a photograph or one MATERIAL. Both are grounds for the
// same poster, and choosing between them is the only design decision the user
// makes.
//
// It used to be five flat dark colours. It is three materials now, and that is
// a different kind of choice: you are picking what the note is written on, and
// there are only so many things in a book to write on. It also solves what the
// five never could — the sky has to keep reading as one work, and a photograph
// of a room at night sits beside laid paper the way it sits beside nothing
// else.
//
//   LEAF   ivory laid paper. the default. warm, fibrous, slightly mottled.
//   CHALK  a chalky grey gesso card. cooler, drier, more matte. the same note,
//          in a different mood, without introducing a hue to say so.
//   HIDE   the leather itself, written in the pale ink the case is stamped
//          with. the only one where the type goes light-on-dark.
//
// The definitions live in theme.js beside every other material in the product,
// so the composer's swatch, the seal in the ledger, the resolve at the end of a
// dive and the 1080-wide Story render are all reading one row of one table.
export const PLATES = GROUNDS.map((g) => ({ ...g, hex: g.base }))

// ── the five that came before ────────────────────────────────────────────────
// Every card placed before the transfer holds one of five flat dark plate ids,
// and the words on it are somebody's. All five were DARK, so all five resolve
// to the leather: the card keeps the ground it was written on, in the one
// material this product has that is the same colour it was. Nothing rewrites a
// stored row — the map is applied on the way in, every time one is read.
const LEGACY_PLATES = { ink: 'hide', violet: 'hide', ember: 'hide', rose: 'chalk', blue: 'hide' }

export const plateOf = (id) => {
  const key = LEGACY_PLATES[id] || id
  return PLATES.find((p) => p.id === key) || PLATES[0]
}

// ── the type ─────────────────────────────────────────────────────────────────
// Three faces, and they are the product's own three (docs/DESIGN.md §type), so
// choosing one is choosing a register the reader has already seen used rather
// than downloading a font. Each carries its own metrics, because a face swap
// that keeps one size and one leading is not a design choice, it is a bug with
// a dropdown: the stamp needs air and a smaller size to hold a line, the hand
// needs tighter tracking and more leading than the voice does.
//
// The ids are unchanged (`serif`, `sans`, `mono`) because they are what the
// server's validator whitelists and what every card already placed is stored
// with. What is behind them is new.
export const FACES = CARD_FACES

export const faceOf = (id) => FACES.find((f) => f.id === id) || FACES[0]

// ── the poster ───────────────────────────────────────────────────────────────
// Every size inside the disc is a fraction of the diameter, not a step on the
// screen ladder. Narrow deliberate exception, and the same one card.js already
// takes: a composed artifact is an artboard, not a screen, and this one is
// drawn as a thumbnail, as a resolve in the sky, as half a spread and as a
// 1080-wide Story render. A fixed pixel size would be four different designs.
export function fitRatio(text) {
  const n = wordCount(text)
  if (n <= 8) return 0.062
  if (n <= 13) return 0.053
  return 0.045
}

export const metaSize = (d) => Math.max(7, Math.min(11, d * 0.026))

// ── two floors, not one ──────────────────────────────────────────────────────
// `TYPE_FLOOR` is where the LEGEND comes off: below it the @ and the date stop
// being type and become two grey smudges, so the seal drops them and gives the
// room back to the words. A card too small to print its own head does not print
// it smaller.
//
// The WORDS have a floor of their own, and it is much lower, because the words
// are the card. At 88px — the size a seal is set at in the ledger — a short
// line is entirely readable once it has the whole disc to itself, and a seal
// with nothing written on it is not a seal, it is a button. Setting both floors
// to the same number is what made every entry in the ledger a blank disc.
export const TYPE_FLOOR = 118
export const WORD_FLOOR = 54

// How much bigger the words are set once the legend is off and they have the
// whole disc. Same figure the seal has always used.
export const LEGEND_OFF = 1.34

// ── the composition ──────────────────────────────────────────────────────────
// The text block is an object with a place, not a centered stack. Where it
// starts is chosen by how much text there is, and after that the user can move
// it; everything else about the layout is derived from where it ended up.
//
// A short line wants the lower left, which is where a poster puts a caption
// that is meant to be read after the picture. A middling one moves up the same
// left margin so it has room to break. Only the longest text goes to the middle
// of the disc, because the middle is the only place a circle is wide enough for
// six lines, and by then the type IS the picture.
export function autoPos(text) {
  const n = wordCount(text)
  if (n <= 6) return { x: 0.2, y: 0.68 }
  if (n <= 13) return { x: 0.2, y: 0.4 }
  return { x: 0.5, y: 0.5 }
}

// How far the anchor may travel. Past this the block starts eating its own
// measure faster than it gains position, and a poster whose text can be dragged
// under the limb is not a poster.
const REACH = 0.3

export function clampPos(pos) {
  const x = (pos && pos.x) != null ? pos.x : 0.5
  const y = (pos && pos.y) != null ? pos.y : 0.5
  const dx = x - 0.5
  const dy = y - 0.5
  const d = Math.hypot(dx, dy)
  if (d <= REACH) return { x, y }
  return { x: 0.5 + (dx / d) * REACH, y: 0.5 + (dy / d) * REACH }
}

// Alignment is not a control. It is read off the block's own position, which is
// how a person laying this out by hand would do it: text sitting left of centre
// hangs off a left margin, text in the middle is centred. One decision, made
// once, from a fact already on screen.
export const alignAt = (pos) => (pos.x < 0.43 ? 'left' : pos.x > 0.57 ? 'right' : 'center')

// The measure, from the circle itself. A chord is narrower the further it is
// from the middle, so the width a block may take is a real geometric fact about
// where it is rather than one number applied everywhere. `BLEED` is how far the
// block is assumed to reach above and below its anchor, so the chord is taken
// at the block's edge and not at its middle, where it would be too generous and
// the last line would run into the limb.
const MARGIN = 0.055
const BLEED = 0.09

export function measureAt(pos) {
  const off = Math.min(0.5, Math.abs(pos.y - 0.5) + BLEED)
  const hw = Math.sqrt(Math.max(0, 0.25 - off * off))
  const left = 0.5 - hw + MARGIN
  const right = 0.5 + hw - MARGIN
  const align = alignAt(pos)
  if (align === 'left') return Math.max(0.2, right - pos.x)
  if (align === 'right') return Math.max(0.2, pos.x - left)
  return Math.max(0.2, 2 * Math.min(pos.x - left, right - pos.x))
}

// The credit line goes in the half the words left empty, on the words' own
// margin, in the words' own alignment. That is what makes it read as part of
// one composition instead of a caption that came with the frame.
export function metaPos(pos) {
  return { x: pos.x, y: pos.y > 0.5 ? 0.2 : 0.81 }
}

// ── the model ────────────────────────────────────────────────────────────────
// One card per ping. `photoId` is this device's key into the local blob cache
// (card/photos.js); `hasPhoto` is what the SERVER says — whether there is a
// photograph on the row waiting to be fetched onto a device that does not hold
// it yet. The two are separate on purpose: the first is where the bytes are
// now, the second is whether they exist at all.
//
// Nothing a user makes reaches the other person before both have chosen each
// other (the plan, §1.1). Both halves of the card are sealed the way the ping
// itself is: the server holds them, and the only reads that can ever return
// them belong to the counterpart of a row that is already matched (migration
// 0022 for the words, 0025 for the photograph).
export function makeCard({ handle, words: w, photoId = null, hasPhoto = false, bg = 'leaf', face = 'serif', pos, tone, placed }) {
  const text = clampWords(w || '')
  return {
    handle: String(handle || '').toLowerCase(),
    words: text,
    photoId,
    hasPhoto: !!hasPhoto,
    bg,
    face,
    pos: clampPos(pos || autoPos(text)),
    tone: tone != null ? tone : plateOf(bg).tone,
    placed: placed || Date.now(),
  }
}

// ── the wire ─────────────────────────────────────────────────────────────────
// What the server is told, and it is exactly the poster: the words, which
// ground, which face, where the block sits, and the one number the light is
// mixed from. Flat, because the same shape is validated in SQL
// (celestual_card_clean) and a nested `pos` would be two casts there for no
// reason.
//
// The photograph is not in here, and that is now a matter of PLUMBING rather
// than of principle: it travels too (migration 0025), on the same seal, but as
// its own call — a third of a megabyte has no business inside the statement
// that decides whether a pair is mutual, and a picture that fails to upload
// must never be able to cost somebody their ping. api/celestual.js
// `putCardPhoto` is the other half of this function.
export function toWire(card) {
  if (!card || !cardReady(card)) return null
  const pos = clampPos(card.pos || autoPos(card.words))
  return {
    words: clampWords(card.words),
    bg: plateOf(card.bg).id,
    face: faceOf(card.face).id,
    x: Number(pos.x.toFixed(4)),
    y: Number(pos.y.toFixed(4)),
    tone: Number((card.tone != null ? card.tone : plateOf(card.bg).tone).toFixed(4)),
  }
}

// The reverse, and it trusts nothing: a card coming back off the wire is the
// other person's, so every field is put back through the same clamps the
// composer writes under.
export function fromWire(w, { handle, placed } = {}) {
  if (!w || typeof w !== 'object') return null
  const words = clampWords(String(w.words || ''))
  if (!wordCount(words)) return null
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d)
  return makeCard({
    handle,
    words,
    bg: plateOf(w.bg).id,
    face: faceOf(w.face).id,
    pos: { x: num(w.x, 0.5), y: num(w.y, 0.5) },
    tone: Math.max(0, Math.min(1, num(w.tone, plateOf(w.bg).tone))),
    // the server's one word about the other half: whether there is a
    // photograph on this row at all. The bytes are a separate, deliberate fetch
    // (card/photos.js `ensurePhoto`) made by the screen about to draw them.
    hasPhoto: w.photo === true,
    placed,
  })
}

// The date tick under a card. Mono, uppercase, and never relative ("2 days
// ago") — a relative date is a clock the reader has to do arithmetic on, and
// this one is metadata, not news.
export function stamp(ms) {
  const d = new Date(ms || Date.now())
  const m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()]
  return `${m} ${d.getDate()}`
}

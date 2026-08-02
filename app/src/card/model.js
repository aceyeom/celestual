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
import { FONT } from '../theme.js'

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
// The production app tints a person's star by which category they were filed
// under — crush, ex, friend, complicated. This plan bans that outright: no
// dropdown, no category, no relationship label, ever, because the ambiguity is
// the product (§1.3). So the tint cannot come from a picker.
//
// It comes from the photograph. A star's colour is its temperature, and the
// card IS the star's surface, so the surface decides: a warm frame (a lamp, a
// dashboard at night) burns toward amber, a cool one (a window, a streetlight,
// a screen) toward rose. Those are the product's own two stars and no third hue
// enters, so the law in docs/DESIGN.md §2 holds while the label ban in the plan
// also holds. Nobody is asked anything.
//
// A card with no photograph is amber, which is the product's primary light and
// what every star in this sky already is.
export function tintOf(C, tone) {
  const t = typeof tone === 'number' ? Math.max(0, Math.min(1, tone)) : 1
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
  const a = hex(C.them) // cool end — rose
  const b = hex(C.you) //  warm end — amber
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// ── the plates ───────────────────────────────────────────────────────────────
// A card's ground is a photograph or one flat colour. Both are grounds for the
// same poster, and choosing between them is the only design decision the user
// makes.
//
// The colours are deliberately a short, dark, low-chroma set rather than a
// picker. Two reasons. The sky has to keep reading as one work, and forty cards
// in forty saturated hues is the collage the whole plan is trying to avoid. And
// a photograph of a room at night already lands in this range on its own, so a
// flat plate and a photo sit together instead of looking like two different
// products. These are grounds, not accents: docs/DESIGN.md's two-accent law
// governs the interface, and nothing here is ever used as one.
export const PLATES = [
  { id: 'ink', hex: '#08070D', tone: 1 },
  { id: 'violet', hex: '#191327', tone: 0.42 },
  { id: 'ember', hex: '#2B1710', tone: 1 },
  { id: 'rose', hex: '#2B1220', tone: 0 },
  { id: 'blue', hex: '#101A2E', tone: 0.14 },
]

export const plateOf = (id) => PLATES.find((p) => p.id === id) || PLATES[0]

// ── the type ─────────────────────────────────────────────────────────────────
// Three faces, and they are the product's own three (docs/DESIGN.md §3), so
// choosing one is choosing a register rather than downloading a font. Each
// carries its own metrics, because a face swap that keeps one size and one
// leading is not a design choice, it is a bug with a dropdown: mono needs air
// and a smaller size to hold a line, sans needs tighter tracking and more
// leading than a serif does.
export const FACES = [
  { id: 'serif', family: FONT.serif, style: 'italic', weight: 400, scale: 1, lead: 1.15, track: '0', transform: 'none' },
  { id: 'sans', family: FONT.sans, style: 'normal', weight: 500, scale: 0.84, lead: 1.34, track: '-0.012em', transform: 'none' },
  { id: 'mono', family: FONT.mono, style: 'normal', weight: 400, scale: 0.68, lead: 1.6, track: '0.02em', transform: 'lowercase' },
]

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

export const TYPE_FLOOR = 118

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
// One card per ping. `photoId` points into the local blob store (card/photos.js)
// and never leaves this device; everything else is what rides on the ping row.
//
// Nothing a user makes reaches the other person before both have chosen each
// other (the plan, §1.1). The card is sealed the way the ping itself is: the
// server holds it, and the only read that can ever return it belongs to the
// counterpart of a row that is already matched (migration 0022).
export function makeCard({ handle, words: w, photoId = null, bg = 'ink', face = 'serif', pos, tone, placed }) {
  const text = clampWords(w || '')
  return {
    handle: String(handle || '').toLowerCase(),
    words: text,
    photoId,
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
// The photograph is NOT in here and there is no argument that puts it here. It
// stays in this browser (card/photos.js), which is the only version of "it never
// left your phone" that is a fact rather than a policy.
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

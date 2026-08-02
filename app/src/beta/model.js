// beta/model.js — the card, as data.
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
export const MAX_WORDS = 20

// The one universal prompt. There is no dropdown, no category, no relationship
// label — the ambiguity is the product (the plan, §1.3).
//
// "The moment you'd go back to" produces hedges: *hope you're doing well
// wherever you are.* "The small thing you still remember" produces
// *you always took the window seat.* Asking for a DETAIL rather than a FEELING
// is the whole anti-cringe mechanism, and it is one string.
export const PROMPT = 'the small thing you still remember'
export const PHOTO_PROMPT = 'where you are, right now'

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

// ── the poster ───────────────────────────────────────────────────────────────
// The words are set INSIDE the disc, and their size is a ratio of it, not a
// step on the screen ladder. That is a deliberate narrow exception and it is
// the same one card.js already takes: a composed artifact is an artboard, not a
// screen, and its type has to hold its proportions at every size it is ever
// drawn at — a thumbnail in a row, a card resolved in the sky, half of a
// spread, a 1080-wide Story render. A fixed pixel size would be four different
// designs.
//
// Three steps rather than a continuous fit, so the same words always produce
// the same card and two cards of similar length look like a set.
export function fitRatio(text) {
  const n = wordCount(text)
  if (n <= 8) return 0.1
  if (n <= 13) return 0.082
  return 0.066
}

// The metadata rides a floor and a ceiling: purely proportional, it fell under
// five pixels on the spread and grew to a headline on the Story render.
export const metaSize = (d) => Math.max(8, Math.min(12, d * 0.032))

// Below this the disc carries no type at all. Curved or straight, there is no
// legible size for a poster in a thumbnail, and type too small to read is
// decoration pretending to be content.
export const TYPE_FLOOR = 118

// ── the model ────────────────────────────────────────────────────────────────
// One card per ping. `photoId` points into the local blob store, or is null and
// `bg` names a plate instead. Nothing here is ever unsealed before a mutual —
// nothing a user makes reaches the other person before both have chosen each
// other (the plan, §1.1), and in this prototype that law is enforced by there
// being no network at all.
export function makeCard({ handle, words: w, photoId = null, bg = 'ink', tone }) {
  return {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    handle: String(handle || '').toLowerCase(),
    words: clampWords(w || ''),
    photoId,
    bg,
    tone: tone != null ? tone : plateOf(bg).tone,
    placed: Date.now(),
    mutual: false,
    // Their card, revealed only at a mutual. Held here so the prototype can
    // play the reveal; in production it does not exist on this device until
    // the server has both sides.
    theirs: null,
  }
}

// The date tick under a card. Mono, uppercase, and never relative ("2 days
// ago") — a relative date is a clock the reader has to do arithmetic on, and
// this one is metadata, not news.
export function stamp(ms) {
  const d = new Date(ms || Date.now())
  const m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()]
  return `${m} ${d.getDate()}`
}

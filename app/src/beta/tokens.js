// beta/tokens.js — THE BINDERY. The beta brand, in one file.
//
// This is not a re-skin of the galaxy edition. It shares no token, no face, no
// radius and no shadow with app/src/theme.js, and it is deliberately sealed off
// from it: nothing under beta/ imports from the production design system, and
// nothing in production imports from here. The two can be looked at side by
// side and judged as two products, which is the whole point of the route.
//
// ── the idea ─────────────────────────────────────────────────────────────────
// Celestual as a hand-bound almanac. A leather case, blind-tooled; a star chart
// engraved into the cover; ivory leaves tipped in, where the writing happens.
// You are not "using an app", you are holding somebody's book and putting a
// slip of paper in it.
//
// Three consequences the whole system is built out of:
//
//   1. ONE HUE. Everything is chocolate through ivory. Hierarchy is carried by
//      VALUE and TEXTURE, never by a second colour, because a leather book has
//      no second colour either. There is no red, no green, no blue, no "state
//      colour" anywhere in this brand. A thing that needs to stand out gets
//      lighter, or gets a texture the things around it do not have.
//   2. MATERIALS, NOT EFFECTS. No glow, no blur halo, no glass. Light in here
//      behaves the way it behaves on a physical surface: a 1px catch along a
//      top edge, a shadow that sits UNDER an object rather than around it, and
//      grain that is genuinely there at 1:1 (texture.js draws it, per pixel).
//   3. PRESSED, NOT ROUNDED. Corners are 2px. The only circle in the product is
//      the seal, because a seal is a circle. A 16px pill is the single fastest
//      tell that nobody chose anything.
//
// Every number below is a decision. If a component needs a size or a colour
// that is not here, the answer is to argue for it here, not to type a hex into
// a style object.

// ── the case ─────────────────────────────────────────────────────────────────
// The browns, darkest to lightest. Named after what they are, because a
// designer picking one is picking a material and not a number on a ramp.
export const C = {
  // the void behind the chart. Not black: a black field with brown objects on
  // it reads as a dark-mode website. This is the inside of a closed book.
  void: '#150E09',
  void2: '#1D1409',

  // the leather itself
  cocoa: '#2E1E14', //  the case, the page ground
  hide: '#3B2716', //   a raised panel, a pocket, the dock
  hide2: '#4A3220', //  the lip of a raised panel, a pressed state
  cognac: '#6B4526', //  tooled edges, the stitch channel, dividers on leather
  saddle: '#8A5C33', //  the light chocolate the brand is named for
  caramel: '#B98A55', //  the one light. what "lit", "yours", "now" looks like
  wheat: '#D6B78A', //  the palest brown. hairlines on ivory, spent states

  // the leaves
  ivory: '#F1E7D3', //   paper, and the reading colour on leather
  ivory2: '#E4D6BB', //  the second leaf, a shaded page
  chalk: '#C9C2B4', //   the chalky grey ground (the third card texture)
  chalk2: '#B3AB9B',

  // ink, for anything set ON ivory or chalk
  ink: '#241811',
  ink2: '#4A3A2D', //    the quieter ink
  ink3: '#7A6A5B', //    the quietest, a pencil note
}

// Text colours, by register. Named for the JOB so a screen never has to know
// which brown it is asking for.
export const TEXT = {
  // on leather
  read: C.ivory, //      what you are meant to read
  quiet: 'rgba(241,231,211,0.70)', // the mechanical voice
  faint: 'rgba(241,231,211,0.46)', // ticks, counts, spent things
  lit: C.caramel, //     the one highlight. use it once per screen
  // on paper
  onPaper: C.ink,
  onPaperQuiet: C.ink2,
  onPaperFaint: C.ink3,
}

// Hairlines. Three weights and no more: a rule is either structural, a divider,
// or a whisper.
export const LINE = {
  strong: 'rgba(241,231,211,0.20)',
  mid: 'rgba(241,231,211,0.11)',
  faint: 'rgba(241,231,211,0.055)',
  // on paper the rules go the other way
  onPaper: 'rgba(36,24,17,0.16)',
  onPaperFaint: 'rgba(36,24,17,0.08)',
  // the tooled line pressed into leather: a dark channel with a light catch
  tooledDark: 'rgba(0,0,0,0.40)',
  tooledLight: 'rgba(255,226,186,0.10)',
}

// ── type ─────────────────────────────────────────────────────────────────────
// Three faces, cast against type. None of them appears in production.
//
//   CORMORANT GARAMOND — the voice. A real garalde: high stroke contrast, small
//     x-height, long extenders. It wants to be set LARGE and LIGHT with tight
//     leading, which is the opposite of how the galaxy edition sets its serif,
//     and it is why a headline here reads as an engraved title page instead of
//     a hero section.
//   JOST — the hand. A geometric sans with 1920s bones (the Futura lineage that
//     sits on every piece of pre-war luggage and every book spine of the
//     period). It carries every mechanic: buttons, labels, body.
//   COURIER PRIME — the stamp. Metadata only: dates, counts, day-clocks, the
//     four-letter codes. It is the typewriter in the back office, and it is
//     never allowed to carry a feeling.
export const FONT = {
  serif: "'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif",
  sans: "'Jost', 'Futura', 'Century Gothic', system-ui, sans-serif",
  mono: "'Courier Prime', 'Courier New', ui-monospace, monospace",
}

// The Google Fonts request for the three, injected by the beta app on mount so
// production never pays for a font it does not use.
export const FONT_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&' +
  'family=Jost:ital,wght@0,300;0,400;0,500;1,300&' +
  'family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap'

// The ladder. Fewer steps than production's, and spread further apart: the
// distance between the title page and the footnote is most of what makes a book
// look like a book.
export const SIZE = {
  colophon: 'clamp(46px, 13vw, 96px)', // the title page, once, on the landing
  title: 'clamp(30px, 7.4vw, 46px)', //   a screen's one headline
  chapter: 'clamp(21px, 5vw, 27px)', //   a section head, a sheet head
  lead: 19, //                            a spoken serif line
  body: 15, //                            the reading size (Jost 300)
  small: 13, //                           secondary
  label: 10.5, //                         tracked uppercase Jost — every label
  tick: 10.5, //                          Courier metadata
}

// Leading and tracking, by face. A face swap that keeps one leading is the bug
// with a dropdown that the production card model warns about, so the beta
// carries the metrics with the face.
export const LEAD = { title: 0.94, chapter: 1.06, lead: 1.42, body: 1.66, tick: 1.5 }
export const TRACK = {
  title: '-0.018em', //  a large garalde needs to be pulled in
  label: '0.22em', //    small-caps Jost: wide enough to read as a stamped label
  tick: '0.1em',
  wordmark: '0.34em',
}

// ── geometry ─────────────────────────────────────────────────────────────────
// Two corners in the entire product. The seal is the only circle.
export const R = { press: 2, panel: 3, seal: '50%' }

// The spacing rhythm is 6px, not 4px. It is a bigger step, and it gives the
// whole layout the slower cadence of a printed page.
export const S = { xs: 6, sm: 12, md: 18, lg: 24, xl: 36, xxl: 54, xxxl: 78 }

// The tooled frame: how far the blind-tooled border sits in from the edge of
// the case. A real binder's margin, and every screen hangs inside it.
export const FRAME = { inset: 14, inset2: 22 }

// The measure. Text does not run wider than this, ever, and the column is hung
// off a left rule rather than centred, which is the single biggest structural
// difference from the production app.
export const MEASURE = 560

// ── light ────────────────────────────────────────────────────────────────────
// How a surface catches light in this brand. All of it is edge behaviour: a
// catch on the top, a shadow under the bottom, and a shadow the object casts on
// what it is lying on. Nothing emits.
export const LIGHT = {
  // a panel lying on leather
  rest: '0 1px 0 rgba(255,226,186,0.055) inset, 0 -1px 0 rgba(0,0,0,0.34) inset, 0 10px 26px rgba(0,0,0,0.34)',
  // a panel pressed INTO leather (fields, wells, the stitch channel)
  well: 'inset 0 2px 5px rgba(0,0,0,0.46), inset 0 -1px 0 rgba(255,226,186,0.05)',
  // an ivory leaf lying on the case: paper is thin, so its shadow is tight
  leaf: '0 1px 1px rgba(0,0,0,0.30), 0 12px 30px rgba(0,0,0,0.42)',
  // the seal, which is thicker than paper and sits proud of it
  seal: '0 2px 3px rgba(0,0,0,0.34), 0 18px 42px rgba(0,0,0,0.46)',
  // a plate under the thumb
  pressed: 'inset 0 2px 6px rgba(0,0,0,0.5)',
  // the only thing in the brand allowed to look lit, and it is still not a
  // glow: it is warm light spilling off an edge onto the leather beside it
  spill: (a = 0.22) => `0 6px 22px rgba(185,138,85,${a})`,
}

// ── the grounds ──────────────────────────────────────────────────────────────
// The three surfaces a card can be written on. This replaces the production
// card's five dark plates, and the reason it is three is that these are
// MATERIALS rather than colours: you are choosing what the note is written on,
// and there are only so many things in a book to write on.
//
//   LEAF   ivory laid paper. the default. warm, fibrous, slightly mottled.
//   CHALK  a chalky grey gesso card. cooler, drier, more matte. the same note,
//          in a different mood, without introducing a hue to say so.
//   HIDE   the leather itself, written in the pale ink the case is stamped
//          with. the only one where the type goes light-on-dark.
//
// `tone` is the light the ping's star burns with, and it is measured off the
// ground exactly the way production measures it off a photograph: paper throws
// the palest light, leather the deepest. One number, no picker.
export const GROUNDS = [
  { id: 'leaf', name: 'laid paper', base: C.ivory, ink: C.ink, quiet: C.ink2, rule: LINE.onPaper, tone: 1, texture: 'paper' },
  { id: 'chalk', name: 'chalk card', base: C.chalk, ink: '#2C2A24', quiet: '#5B564B', rule: 'rgba(36,34,28,0.17)', tone: 0.55, texture: 'chalk' },
  { id: 'hide', name: 'the leather', base: C.hide, ink: C.ivory, quiet: 'rgba(241,231,211,0.6)', rule: LINE.strong, tone: 0.12, texture: 'leather' },
]

export const groundOf = (id) => GROUNDS.find((g) => g.id === id) || GROUNDS[0]

// The light a seal burns with, from its ground's tone. Wheat at the paper end,
// saddle at the leather end. One hue, moved along its own value ramp, which is
// how a monochrome brand shows difference without cheating.
export function sealLight(tone) {
  const t = Math.max(0, Math.min(1, typeof tone === 'number' ? tone : 1))
  const a = hexToRgb(C.saddle)
  const b = hexToRgb(C.wheat)
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ── the faces a card can be set in ───────────────────────────────────────────
// Same three faces as the interface, because a person choosing one is choosing
// a register they have already seen used. Each carries its own metrics.
export const FACES = [
  { id: 'hand', name: 'the voice', family: FONT.serif, style: 'italic', weight: 400, scale: 1, lead: 1.16, track: '0.004em', transform: 'none' },
  { id: 'plain', name: 'plain', family: FONT.sans, style: 'normal', weight: 300, scale: 0.78, lead: 1.46, track: '0.006em', transform: 'none' },
  { id: 'stamp', name: 'stamped', family: FONT.mono, style: 'normal', weight: 400, scale: 0.62, lead: 1.62, track: '0.02em', transform: 'lowercase' },
]

export const faceOf = (id) => FACES.find((f) => f.id === id) || FACES[0]

// ── the words ────────────────────────────────────────────────────────────────
// Kept from the product: twenty words, hard. It is the one constraint that
// makes people write one true thing instead of a paragraph.
export const MAX_WORDS = 20
export const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean)
export const wordCount = (s) => words(s).length
export const clampWords = (s, max = MAX_WORDS) => {
  const w = words(s)
  return w.length <= max ? s : w.slice(0, max).join(' ')
}

// The date tick under a seal. Set in Courier, lowercase, never relative.
export function stamp(ms) {
  const d = new Date(ms || Date.now())
  const m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()]
  return `${m} ${String(d.getDate()).padStart(2, '0')}`
}

// Days between now and an ISO timestamp, floored at zero.
export const daysLeft = (iso) => {
  const t = Date.parse(iso || '')
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.ceil((t - Date.now()) / 864e5))
}

export const normHandle = (h) =>
  String(h || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase().slice(0, 30)

export const isValidHandle = (h) => /^[a-z0-9._]{1,30}$/.test(normHandle(h))

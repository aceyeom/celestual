// theme.js — CELESTUAL's single source of truth for colour, type and geometry.
//
// The visual language is docs/DESIGN.md, and since the Bindery transfer it is
// ONE system rather than two. What used to live on /beta is production now: a
// hand-bound almanac. A leather case, blind-tooled; a star chart engraved into
// the cover; the writing set on the case itself. You are not "using an app",
// you are holding somebody's book and putting a slip of paper in it.
//
// Three consequences the whole product is built out of, and every number below
// serves one of them:
//
//   1. ONE HUE. Everything is chocolate through ivory. Hierarchy is carried by
//      VALUE and TEXTURE, never by a second colour, because a leather book has
//      no second colour either. There is no red, no green, no blue, no state
//      colour anywhere. A thing that needs to stand out gets lighter, or wears
//      a texture the things around it do not.
//   2. MATERIALS, NOT EFFECTS. No glow, no blur halo, no glass. Light behaves
//      the way it behaves on a physical surface: a 1px catch along a top edge,
//      a shadow that sits UNDER an object rather than around it, and grain that
//      is genuinely there at 1:1 (texture.js draws it, per pixel).
//   3. PRESSED, NOT ROUNDED. Corners are 2px and 3px. The only circle in the
//      product is the seal, because a seal is a circle. A 16px pill is the
//      single fastest tell that nobody chose anything.
//
// Everything visual derives from THESE tokens — the React tree, the sky canvas,
// the seal renderer, the Story card and styles.css — so the whole product reads
// as one object on every screen, mobile and web. Do not type a hex into a style
// object; argue for it here instead.

// ── the case ─────────────────────────────────────────────────────────────────
// The browns, darkest to lightest, named after what they are, because a
// designer picking one is picking a material and not a number on a ramp.
//
// The KEYS keep their old names (`ink`, `cream`, `muted`, `you`, `them`,
// `star`) so every call site in the product keeps reading the token it always
// read. What changed is what is behind them.
export const TOKENS = {
  // ── the ground ──
  // The closed case: the surface the chart is engraved into and every screen is
  // printed on. Still not black — a black field with brown objects on it reads
  // as a dark-mode website — but close to it, and that is the single decision
  // the rest of this palette is built around.
  //
  // An earlier ground sat much lighter, at a brown you can comfortably read
  // type on. That turned out to be the problem: the chart is drawn on this, the
  // sky's floor is set to it, and a lifted floor spends its whole lift on the
  // FAINTEST light in the frame. Every outer-arm star and every wisp of rim
  // dust was landing within a few values of the ground it stood on, so the
  // galaxy read as a brown wash with a bright middle instead of as a galaxy.
  //
  // Down here the same stars have most of a value scale under them. The heart
  // goes gold rather than tan, the arms come back, and the ground still
  // measures warm: it is brown ink at four percent, not a grey, so nothing has
  // to fight a cold cast. sky/post.js's floor is set to exactly this value
  // (galaxy.js `_tunePost`), so the canvas and the page are one surface with no
  // seam between them.
  ink: '#0B0705',
  ink2: '#241710', //  cocoa — the case, a page ground, a panel lying on it
  ink3: '#2F1E13', //  hide — a raised panel, a pocket, the dock
  ink4: '#3C2819', //  hide2 — the lip of a raised panel, a pressed state
  cognac: '#5C3A1F', // tooled edges, the stitch channel, dividers on leather
  saddle: '#8A5C33', // the light chocolate the brand is named for

  // ── text ──
  cream: '#F1E7D3', //  ivory: paper, and the reading colour on leather
  cream2: '#E4D6BB', // the second leaf, a shaded page
  // the mechanical voice. A solid token rather than a translucent one, because
  // half the product passes it through rgba() for a quieter step still.
  muted: '#A2937E',
  line: 'rgba(241,231,211,0.11)',

  // ── the two lights ──
  // Production used to be lit by two hues — amber and rose. This brand has one,
  // moved along its own value ramp, so "you" and "them" are told apart by TONE.
  // Caramel is used ONCE per screen: if two things on a page are lit, one of
  // them is wrong.
  you: '#B98A55', //   caramel — the one light. "lit", "yours", "now"
  them: '#D6B78A', //  wheat — the palest brown, hairlines, spent states
  onYou: '#241811', // ink, for anything set ON a lit surface
  // `star`/`onStar` are aliases of the primary light, kept so every component
  // that reads C.star lights up in caramel. The accent and the "you" star are
  // the same light — never a third hue.
  star: '#B98A55',
  onStar: '#241811',

  // ── the leaves ──
  // Reserved for the two objects genuinely made of paper: the SEAL, which is
  // the card a ping carries, and the PLATE, which is the one struck label per
  // screen. Everything else is set directly on the case in ivory.
  //
  // Paper is not a surface the interface is built out of, and that is a
  // correction rather than a preference. A slab of #F1E7D3 on a near-black case
  // is a contrast ratio north of eighteen to one held across a rectangle
  // several hundred pixels wide, and nothing else in the frame survives beside
  // it: the type on the leather goes grey, the galaxy goes flat, and the eye
  // reads the RECTANGLE rather than anything written in it.
  paper: '#F1E7D3',
  chalk: '#C9C2B4', //  the chalky grey ground (the third card material)
  chalk2: '#B3AB9B',
  onPaper: '#241811', //  ink, for anything set ON ivory or chalk
  onPaper2: '#4A3A2D', // the quieter ink
  onPaper3: '#7A6A5B', // the quietest, a pencil note
}

// Text colours by register, named for the JOB so a screen never has to know
// which brown it is asking for.
export const TEXT = {
  read: TOKENS.cream, //             what you are meant to read
  quiet: 'rgba(241,231,211,0.70)', // the mechanical voice
  faint: 'rgba(241,231,211,0.46)', // ticks, counts, spent things
  lit: TOKENS.you, //                the one highlight, once per screen
  onPaper: TOKENS.onPaper,
  onPaperQuiet: TOKENS.onPaper2,
  onPaperFaint: TOKENS.onPaper3,
}

// The smallest type in the product is a stamped label and a mono tick, and both
// are set at well under half strength directly on the chart. That is right nine
// tenths of the time — they are meant to be quiet — and wrong the moment one of
// them crosses the galactic centre, which is orders of magnitude brighter than
// the ground either side of it and turns a 10px line into a smudge.
//
// So the two quietest registers carry the ground with them: a tight, soft halo
// of the case's own colour sitting under the glyphs. It is invisible where
// there is nothing behind the type — a shadow the same colour as the ground is
// no shadow at all — and it is the difference between legible and not over the
// core. Anything set ON paper opts out; there is no sky behind it.
export const ONSKY = '0 1px 2px rgba(11,7,5,0.9), 0 0 9px rgba(11,7,5,0.75)'

// Hairlines. Three weights and no more: a rule is either structural, a divider,
// or a whisper. (`LINE` is the leading ladder — see below — so the rules live
// under their own name.)
export const HAIR = {
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

// ── what light a star burns with ─────────────────────────────────────────────
// This used to be a lookup: one tint per "who are they to you" answer, chosen
// from a dropdown. The card replaced that outright (docs/STAR-CARDS.md) — there
// is no category to look up any more, because there is no category. A star's
// colour is now MEASURED, off the ground of the card it carries (card/model.js
// tintOf), and it arrives here as a colour rather than as a name.
//
// The old table stays for the pings placed before today, whose rows still hold
// the category they were filed under. Nothing writes it, and all four names now
// resolve onto this brand's one ramp rather than to four hues that no longer
// exist anywhere in the product.
const LEGACY_CATEGORY_TINTS = {
  crush: TOKENS.them,
  ex: TOKENS.saddle,
  friend: TOKENS.cream2,
  complicated: TOKENS.you,
}

// A seal's own light, or null to let the field decide. Takes a colour, since
// that is what a card hands over; still answers to the four old names.
export const starTint = (k) =>
  (typeof k === 'string' && k.charAt(0) === '#' ? k : LEGACY_CATEGORY_TINTS[k]) || null

// ── type — three faces, ONE size ladder ──────────────────────────────────────
// None of the three appears anywhere else in this product's history, and each
// is doing a job the others cannot:
//
//   CORMORANT GARAMOND — the voice. A real garalde: high stroke contrast, small
//     x-height, long extenders. It wants to be set LARGE and LIGHT with tight
//     leading, which is why a headline reads as an engraved title page instead
//     of a hero section.
//   JOST — the hand. A geometric sans with 1920s bones (the Futura lineage on
//     every piece of pre-war luggage and every book spine of the period). It
//     carries every mechanic: buttons, labels, body copy.
//   COURIER PRIME — the stamp. Metadata only: dates, counts, day-clocks, the
//     four-letter codes. It is the typewriter in the back office, and it is
//     never allowed to carry a feeling.
export const FONT = {
  serif: "'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif",
  sans: "'Jost', 'Futura', 'Century Gothic', system-ui, -apple-system, sans-serif",
  mono: "'Courier Prime', 'Courier New', ui-monospace, monospace",
}

// The ladder. Fewer steps than the old one and spread further apart: the
// distance between the title page and the footnote is most of what makes a book
// look like a book. Every piece of text in the product is one of these steps.
// Nothing invents a size.
export const SIZE = {
  // the ONE place the brand is allowed to shout: the match reveal, and nowhere
  // else. Kept as a named step so nobody reaches for it by accident.
  hero: 'clamp(40px, 10vw, 70px)',
  colophon: 'clamp(46px, 13vw, 96px)', // the title page, once, on the landing
  display: 'clamp(30px, 7.4vw, 46px)', // one per screen
  title: 'clamp(21px, 5vw, 27px)', //     a section head, a sheet head
  figure: 26, //                          a number that is the point of its card
  lead: 19, //                            a spoken serif line
  head: 15, //                            a card title (Jost 400)
  body: 15, //                            the reading size (Jost 300)
  small: 13, //                           secondary
  meta: 10.5, //                          tracked uppercase Jost, and Courier
  micro: 9.5, //                          the quietest tick
}

// Leading, by register. A face swap that keeps one leading is the bug with a
// dropdown that card/model.js warns about, so the metrics travel with the face.
export const LINE = { tight: 0.94, snug: 1.24, body: 1.62 }

// Letterspacing. A large garalde needs pulling in; small-caps Jost needs
// opening out far enough to read as a stamped label rather than as small text.
export const TRACK = {
  title: '-0.018em',
  meta: '0.22em',
  micro: '0.2em',
  tick: '0.1em',
  // The name, set beside the mark. A third of an em is a title-page letterspace
  // — right for one word alone in the middle of a leaf, wrong for a word that
  // has to hold together as one object next to a drawing. At that interval the
  // eye reads nine letters; at this one it reads a name.
  wordmark: '0.075em',
}

// ── geometry — two corners in the entire product ─────────────────────────────
// The seal is the only circle. `chip` used to be 999 and every small control in
// the product was a pill; a pill is the single fastest way to make software look
// like every other software, so it is a pressed plate now like everything else.
export const RADIUS = {
  chip: 2, //     small controls: labels, tags, row actions
  field: 2, //    inputs AND buttons
  card: 3, //     sheets, modals, panels
  inner: 2, //    nested rows inside a panel
  circle: '50%', // the seal, and the seal alone
}

// The spacing rhythm is 6px, not 4px. It is a bigger step, and it gives the
// whole layout the slower cadence of a printed page.
export const SPACE = { xs: 6, sm: 12, md: 18, lg: 24, xl: 36, xxl: 54, xxxl: 78 }

// The tooled frame: how far the blind-tooled border sits in from the edge of
// the case. A real binder's margin, and every screen hangs inside it.
export const FRAME = { inset: 14, inset2: 22 }

// The measure. Text does not run wider than this, ever, and the block that
// carries it is CENTRED — ranged left inside a centred column. Both halves
// matter: on a phone the measure IS the screen and the setting looks composed;
// pinned to the left EDGE as well, the identical page becomes a stripe of type
// in the left third of a laptop with an acre of empty case beside it, and the
// two stop reading as the same product.
export const MEASURE = 560

// The index, when it is open. It is a COLUMN — it takes its width out of the
// page and the page re-centres in what is left — so this is a layout dimension
// rather than the size of a floating panel.
export const INDEX_W = 292

// ── icons — deliberately almost none ─────────────────────────────────────────
// A generic outline icon set is the fastest way to make a product look like
// every other product. Celestual draws its meaning from type, from value and
// from one light; the only glyphs that survive are the ones a hand needs to
// navigate (back, close, forward) plus a confirmation check. See ui.jsx's Icon.
export const ICON = { sm: 14, md: 16, lg: 18 }

// ── light ────────────────────────────────────────────────────────────────────
// How a surface catches light in this brand. All of it is edge behaviour: a
// catch on the top, a shadow under the bottom, and the shadow the object casts
// on what it is lying on. NOTHING EMITS.
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

// Named elevation presets, kept under their old names so nothing has to be
// rewired. Every one of them used to be a halo; none of them is now.
export function makeShadow(C) {
  return {
    // a field is a ruled line, so "focus" is the rule taking the light rather
    // than a ring blooming around a box
    focus: () => `0 1px 0 ${rgba(C.you, 0.5)}`,
    rest: () => 'none',
    // a letterpress plate: the catch on the top edge, the dark under the
    // bottom, and the shadow it throws on the case
    cta: (c, hot) =>
      hot
        ? `0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.18) inset, 0 12px 28px rgba(0,0,0,0.5)`
        : `0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.18) inset, 0 9px 22px rgba(0,0,0,0.44)`,
    card: LIGHT.rest,
    menu: '0 1px 0 rgba(255,226,186,0.05) inset, 0 16px 40px rgba(0,0,0,0.5)',
    press: LIGHT.pressed,
    well: LIGHT.well,
  }
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

// '#RRGGBB' → three 0..1 components. What the sky's post chain wants for its
// lifted floor: it is applied AFTER the sRGB encode, so this is a plain byte
// scale rather than a linearisation — the point is that the canvas comes out at
// EXACTLY the page's own background colour, with no seam between the two.
export function rgbUnit(hex) {
  return hexToRgb(hex).map((v) => v / 255)
}

// ── the grounds ──────────────────────────────────────────────────────────────
// The three surfaces a card can be written on. This replaced the five dark
// plates, and the reason it is three is that these are MATERIALS rather than
// colours: you are choosing what the note is written on, and there are only so
// many things in a book to write on.
//
//   LEAF   ivory laid paper. the default. warm, fibrous, slightly mottled.
//   CHALK  a chalky grey gesso card. cooler, drier, more matte. the same note,
//          in a different mood, without introducing a hue to say so.
//   HIDE   the leather itself, written in the pale ink the case is stamped
//          with. the only one where the type goes light-on-dark.
//
// `tone` is the light the ping's star burns with, and it is measured off the
// ground exactly the way it is measured off a photograph: paper throws the
// palest light, leather the deepest. One number, no picker.
export const GROUNDS = [
  { id: 'leaf', name: 'laid paper', base: TOKENS.paper, ink: TOKENS.onPaper, quiet: TOKENS.onPaper2, rule: HAIR.onPaper, tone: 1, texture: 'paper' },
  { id: 'chalk', name: 'chalk card', base: TOKENS.chalk, ink: '#2C2A24', quiet: '#5B564B', rule: 'rgba(36,34,28,0.17)', tone: 0.55, texture: 'chalk' },
  { id: 'hide', name: 'the leather', base: TOKENS.ink3, ink: TOKENS.cream, quiet: 'rgba(241,231,211,0.6)', rule: HAIR.strong, tone: 0.12, texture: 'leather' },
]

export const groundOf = (id) => GROUNDS.find((g) => g.id === id) || GROUNDS[0]

// The light a seal burns with, from its ground's tone. Wheat at the paper end,
// saddle at the leather end. One hue, moved along its own value ramp, which is
// how a monochrome brand shows difference without cheating.
export function sealLight(tone) {
  const t = Math.max(0, Math.min(1, typeof tone === 'number' ? tone : 1))
  const a = hexToRgb(TOKENS.saddle)
  const b = hexToRgb(TOKENS.them)
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// ── the faces a card can be set in ───────────────────────────────────────────
// The same three faces as the interface, because a person choosing one is
// choosing a register they have already seen used. Each carries its own metrics.
export const CARD_FACES = [
  { id: 'serif', name: 'the voice', family: FONT.serif, style: 'italic', weight: 400, scale: 1, lead: 1.16, track: '0.004em', transform: 'none' },
  { id: 'sans', name: 'plain', family: FONT.sans, style: 'normal', weight: 300, scale: 0.78, lead: 1.46, track: '0.006em', transform: 'none' },
  { id: 'mono', name: 'stamped', family: FONT.mono, style: 'normal', weight: 400, scale: 0.62, lead: 1.62, track: '0.02em', transform: 'lowercase' },
]

// The colour object handed down the React tree. Defaults to the singular TOKENS
// above; accepts an optional [you, them] palette override so the sky canvas and
// the UI always read the same light.
export function makeColors(palette) {
  const you = (palette && palette[0]) || TOKENS.you
  const them = (palette && palette[1]) || TOKENS.them
  return { ...TOKENS, you, them, star: you }
}

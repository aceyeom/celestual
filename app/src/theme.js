// theme.js — CELESTUAL's single source of truth for color and geometry.
//
// The visual language is docs/DESIGN.md (the galaxy edition): the whole product
// lives on one warm dark ground — the inside of an old leather case — with the
// galaxy drawn INTO it rather than photographed behind it, lit by TWO warm
// stars: starlight-amber (`you`) and rose (`them`), the two stars of the core
// metaphor. This is the canonical look. Do NOT flatten it back to a
// single-accent scheme, and do not put the cold violet void back, unless the
// human explicitly asks; a re-skin is a design decision the human makes, never
// a cleanup Claude performs on its own.
//
// Everything visual derives from THESE tokens — the React tree, the galaxy
// canvas, the story card renderer, and styles.css custom properties — so the
// whole product reads as one coherent cosmos on every screen, mobile and web.

export const TOKENS = {
  // ── the ground ──
  // The base every screen and the galaxy itself are drawn on. It used to be a
  // cosmic violet-black: the VOID, sitting at or below the darkest thing the
  // renderer paints. That is the right colour for a photograph of space and the
  // wrong one for this product, because the sky here is not a photograph the
  // interface floats over — it is the surface the interface is printed on, and
  // it has to be quiet enough to hold type anywhere on it.
  //
  // So it is a dark tobacco now: the inside of an old leather case, the back of
  // a foxed endpaper. Warm, so the two stars belong to it rather than sitting
  // on top of it; lifted just off black, because nothing made of paper or hide
  // is ever truly black, and a lifted ground is what takes the harsh edge off
  // every bright thing drawn on it. sky/post.js's floor is set to exactly this
  // value (galaxy.js `_tunePost`), so the canvas and the page are one surface
  // with no seam between them.
  ink: '#120E0B',
  ink2: '#1E1714',
  ink3: '#2B211B',
  // text
  cream: '#F4EDE4', // the emotional + interface voice — warm ivory, not blue-white
  muted: '#A6988C', // the mechanical voice (warm grey, the colour of old ink)
  line: 'rgba(244,237,228,0.10)',
  // the two stars — the accents of the whole product
  you: '#FF9E6B', // starlight amber (primary / "you")
  them: '#E6749E', // rose (secondary / "them" / mutuality)
  onYou: '#1A0F0A', // ink for text ON the bright amber CTA
  // `star`/`onStar` are aliases of the primary star (`you`), kept so every
  // component that reads C.star lights up in starlight-amber. The primary accent
  // and the "you" star are the same light — never a third hue.
  star: '#FF9E6B',
  onStar: '#1A0F0A',
}

// ── what light a star burns with ─────────────────────────────────────────────
// This used to be a lookup: one tint per "who are they to you" answer, chosen
// from a dropdown. The card replaced that outright (docs/STAR-CARDS.md) — there
// is no category to look up any more, because there is no category. A star's
// colour is now MEASURED, off the ground of the card it carries (card/model.js
// tintOf), and it arrives here as a colour rather than as a name.
//
// The old table stays for the pings placed before today, whose rows still hold
// the category they were filed under. Nothing writes it.
const LEGACY_CATEGORY_TINTS = {
  crush: '#F79BC3',
  ex: '#F08578',
  friend: '#96BCF8',
  complicated: '#B9A3E8',
}

// A seal's own light, or null to let the field decide. Takes a colour, since
// that is what a card hands over; still answers to the four old names.
export const starTint = (k) =>
  (typeof k === 'string' && k.charAt(0) === '#' ? k : LEGACY_CATEGORY_TINTS[k]) || null

// ── Type — three faces, ONE size ladder. ─────────────────────────────────────
// Every piece of text in the product is one of the steps below. Nothing invents
// a size. The three faces map to the three registers (docs/DESIGN.md §type):
// serif carries feeling, sans carries mechanics, mono carries metadata.
export const FONT = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'Space Mono', ui-monospace, monospace",
}

// The ladder. `display` and `title` are fluid; everything below is fixed, so a
// card reads identically on every screen it appears on.
export const SIZE = {
  // the ONE place the brand is allowed to shout: the match reveal, and nowhere
  // else. Kept as a named step so nobody reaches for it by accident.
  hero: 'clamp(38px, 11vw, 52px)',
  display: 'clamp(30px, 8.4vw, 42px)', // one per screen, serif italic
  title: 'clamp(23px, 6.2vw, 28px)', //   sheet + section headline
  figure: 26, //                          a number that is the point of its card
  lead: 19, //                            a spoken serif line inside a card
  head: 16, //                            card title, sans 600
  body: 15, //                            the reading size
  small: 13, //                           secondary sans
  meta: 11, //                            mono metadata
  micro: 9.5, //                          the quietest mono tick
}

export const LINE = { tight: 1.1, snug: 1.3, body: 1.55 }

// The letterspacing that goes with mono metadata, by step.
export const TRACK = { meta: '1.6px', micro: '2px' }

// ── Geometry — one soft-radius scale, one spacing rhythm. ────────────────────
// Inputs and buttons share ONE corner (`field`); cards step up one notch; true
// pills are reserved for tiny chips. Shapes never compete.
export const RADIUS = {
  chip: 999, // tiny pills ONLY: badges, tags, chips
  field: 16, // inputs AND primary/secondary buttons
  card: 20, // sheets, modals, dropdown containers
  inner: 12, // nested rows inside a card
  circle: '50%', // back button, x/remove buttons
}

// 4px spacing rhythm. Every gap and pad in the product is one of these.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 }

// ── Icons — deliberately almost none. ────────────────────────────────────────
// A generic outline icon set is the fastest way to make a product look like
// every other product. Celestual draws its meaning from type, light and the one
// star; the only glyphs that survive are the ones a hand needs to navigate
// (back, close, forward) plus a confirmation check. Everything that used to be
// iconified is now said in words, or not said at all. See ui.jsx's `Icon`.
export const ICON = { sm: 14, md: 16, lg: 18 }

// Named glow/elevation presets — the star-halo aesthetic, centralized.
export function makeShadow(C) {
  return {
    focus: (c) => `0 0 0 4px ${rgba(c, 0.13)}, 0 0 32px ${rgba(c, 0.16)}`,
    rest: (c) => `0 0 26px ${rgba(c, 0.1)}`,
    cta: (c, hot) => `0 10px 30px ${rgba(c, hot ? 0.4 : 0.26)}, inset 0 1px 0 rgba(255,255,255,.34)`,
    card: '0 30px 80px rgba(0,0,0,.6)',
    menu: '0 18px 50px rgba(0,0,0,.5)',
  }
}

export function rgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// '#RRGGBB' → three 0..1 components. What the sky's post chain wants for its
// lifted floor: it is applied AFTER the sRGB encode, so this is a plain byte
// scale rather than a linearisation — the point is that the canvas comes out at
// EXACTLY the page's own background colour, with no seam between the two.
export function rgbUnit(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// The color object handed down the React tree. Defaults to the singular TOKENS
// above; accepts an optional [you, them] palette override so the galaxy canvas
// and the UI always read the same two stars.
export function makeColors(palette) {
  const you = (palette && palette[0]) || TOKENS.you
  const them = (palette && palette[1]) || TOKENS.them
  return { ...TOKENS, you, them, star: you }
}

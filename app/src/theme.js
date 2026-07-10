// theme.js — CELESTUAL's single source of truth for color and geometry.
//
// The visual language is docs/DESIGN.md (the galaxy edition): the whole product
// lives inside one deep cosmic-violet field, lit by TWO warm stars — starlight-
// amber (`you`) and rose (`them`), the two stars of the core metaphor. This is
// the canonical look. Do NOT flatten it back to a single-accent navy scheme
// unless the human explicitly asks for that; a re-skin is a design decision the
// human makes, never a cleanup Claude performs on its own.
//
// Everything visual derives from THESE tokens — the React tree, the galaxy
// canvas, the story card renderer, and styles.css custom properties — so the
// whole product reads as one coherent cosmos on every screen, mobile and web.

export const TOKENS = {
  // deep-space base — shared by every screen's backdrop and the galaxy void
  ink: '#0B0814',
  ink2: '#16111F',
  ink3: '#211934',
  // text
  cream: '#F3ECF6', // the emotional + interface voice
  muted: '#9E92B6', // the mechanical voice (cool violet-grey)
  line: 'rgba(243,236,246,0.10)',
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

// Palette passed to the galaxy canvas + makeColors, as a 2-tuple [you, them].
export const PALETTE = [TOKENS.you, TOKENS.them]

// The category lights — one tint per "who are they to you" answer, introduced
// on the options tab and worn by the person's own stars in their community's
// sky. Soft pastels of the same starlight family (never neon): rose for a
// crush, ember for an ex, ice-blue for a friend, violet for complicated.
// Subtle by design — the sky stays celestial, never a scatter of markers.
export const CATEGORY_TINTS = {
  crush: '#F79BC3',
  ex: '#F08578',
  friend: '#96BCF8',
  complicated: '#B9A3E8',
}

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

// 4px spacing rhythm.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }

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

// The color object handed down the React tree. Defaults to the singular TOKENS
// above; accepts an optional [you, them] palette override so the galaxy canvas
// and the UI always read the same two stars.
export function makeColors(palette) {
  const you = (palette && palette[0]) || TOKENS.you
  const them = (palette && palette[1]) || TOKENS.them
  return { ...TOKENS, you, them, star: you }
}

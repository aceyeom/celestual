// theme.js — CELESTUAL's single source of truth for color.
//
// Why this file exists: the app used to mix an orange "loading" world with a
// purple galaxy world, and ad-hoc hexes were scattered across screens, the
// canvas, and the CSS. Everything visual now derives from THESE tokens — the
// React UI, the galaxy canvas, and styles.css custom properties — so the whole
// product reads as one coherent cosmos on every screen, mobile and web alike.
//
// The world is deep cosmic violet. Starlight-amber (`you`) is the single warm
// accent; rose (`them`) is its mutual counterpart — the two stars of the core
// metaphor. Backdrops never swing to a different hue family between screens.

export const TOKENS = {
  // deep-space base — shared by every screen's backdrop and the canvas void
  ink: '#0B0814',
  ink2: '#16111F',
  ink3: '#211934',
  // text
  cream: '#F3ECF6',
  muted: '#9E92B6',
  line: 'rgba(243,236,246,0.10)',
  // the two stars — the only accents in the whole product
  you: '#FF9E6B', // starlight amber (primary / "you")
  them: '#E6749E', // rose (secondary / "them")
}

// Palette passed to the galaxy + makeColors. Kept as a 2-tuple [you, them] for
// backwards-compat with the existing call sites.
export const PALETTE = [TOKENS.you, TOKENS.them]

export function rgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Full color object used across the React tree. Accepts an optional palette
// override (still honored) but defaults to the singular TOKENS above.
export function makeColors(palette) {
  const you = (palette && palette[0]) || TOKENS.you
  const them = (palette && palette[1]) || TOKENS.them
  return { ...TOKENS, you, them }
}

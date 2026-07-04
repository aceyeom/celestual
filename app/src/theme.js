// theme.js — CELESTUAL's single source of truth for color and geometry.
//
// The visual language is docs/DESIGN.md, derived from the masterguide
// (docs/ULTIMATE-PRODUCT-FRAMEWORK.md Part 4): deep navy fields, generous empty
// space, and ONE warm orange star as the only accent in the entire product.
// There is no second accent, no theme picker, no cosmetic tier — a screen that
// needs a second color is a screen that's doing too much.
//
// Everything visual derives from THESE tokens — the React tree, the night-field
// canvas, the story card renderer, and styles.css — so the product reads as one
// unbroken night on every screen.

export const TOKENS = {
  // the navy field — every backdrop, panel and raised surface
  ink: '#070B14',
  ink2: '#0C1322',
  ink3: '#141D31',
  // text
  cream: '#F2EEE5', // the emotional + interface voice
  muted: '#8B94A8', // the mechanical voice (slate — quiet, cooler than the field)
  line: 'rgba(242,238,229,0.10)',
  // the single warm star — the only accent, anywhere, ever
  star: '#FFA25C',
  // ink for text ON the warm star (buttons)
  onStar: '#1A0F06',
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

// The color object handed down the React tree. One product, one night — no
// palette overrides, no themes (the old Nova hooks are gone on purpose).
export function makeColors() {
  return { ...TOKENS }
}

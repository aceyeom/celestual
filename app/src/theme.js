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

// ── Geometry — the unified soft-radius scale. ────────────────────────────────
// The app used to mix three fighting shape languages on one screen: pill chips
// (999), medium-rounded buttons/inputs (13/15/17), and large sheets (22). The
// system is now: inputs AND buttons share ONE soft corner (`field`); cards step
// up one notch (`card`); true pills (`chip`) are reserved for tiny chips only —
// badges, tags, step dots, account/lang chips. So shapes stop competing.
export const RADIUS = {
  chip: 999, // tiny pills ONLY: badges, tags, step dots, account/lang chips
  field: 16, // inputs AND primary/secondary buttons — one shared soft corner
  card: 20, // sheets, modals, dropdown containers, info/hint boxes
  inner: 12, // nested rows inside a card (dropdown items, sheet rows)
  circle: '50%', // avatars, back button, x/remove buttons
}

// 4px spacing rhythm — replaces the ad-hoc 6/7/9/11/13/22 values that were
// scattered across the screens, so vertical rhythm reads the same everywhere.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }

// Named glow/elevation presets — keep the star-halo aesthetic, just centralize
// it so focus glows, CTA shadows and card elevation are consistent everywhere.
export function makeShadow(C) {
  return {
    focus: (c) => `0 0 0 4px ${rgba(c, 0.13)}, 0 0 32px ${rgba(c, 0.16)}`,
    rest: (c) => `0 0 26px ${rgba(c, 0.1)}`,
    cta: (c, hot) => `0 10px 30px ${rgba(c, hot ? 0.42 : 0.28)}, inset 0 1px 0 rgba(255,255,255,.38)`,
    card: '0 30px 80px rgba(0,0,0,.6)',
    menu: '0 18px 50px rgba(0,0,0,.5)',
  }
}

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

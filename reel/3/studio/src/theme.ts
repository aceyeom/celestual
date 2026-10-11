// ── the third reel's design ─────────────────────────────────────────────────
// Paper, ink and photographs: the brand's rarely used light ground (chalk
// paper, ink type), the photographs laid on it as prints, and the type the
// brand's display serif, set large. Nothing of the first two reels' night
// and pixels, but the drawn lockup that signs it.
export const FPS = 30
export const W = 1080
export const H = 1920

export const PAPER = '#F4F1EA'
export const INK = '#17150F'
export const ASH = '#8A857C'
export const CHALK = '#F4F1EA'

export const SERIF = 'Newsreader, Georgia, serif'
export const SANS = '"Inter Tight", system-ui, sans-serif'

// the platform's own buttons and captions: nothing that must be read below
// SAFE.bottom or right of SAFE.right
export const SAFE = { top: 220, bottom: 1540, left: 72, right: 960 }

// the grades, dark to light: a black and white photograph toned toward one
// person's colour while the two are apart, and warm once they are not
export const TONES = {
  ice: ['#0B1820', '#DDEFF4'],
  rose: ['#22101A', '#F7DDE3'],
  warm: ['#1A120C', '#F5E5CC'],
} as const
export type Tone = keyof typeof TONES

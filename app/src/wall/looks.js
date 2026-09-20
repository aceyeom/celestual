// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LOOKS: what a letter's paper can be                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A letter chooses its paper (migration 0055). What the row keeps is three
// slugs, `{ theme, tint, face }`, or nothing for the plain paper; what a slug
// DRAWS is decided here and nowhere else. The schema's whole opinion is
// `wall_look_clean`: an object, three keys, each a short lower case slug. So
// a new look is a row in one of the three lists below and a rule or two in
// wall.css, never a migration, and a slug this build does not know draws the
// plain paper rather than nothing.
//
// ── the three axes, and why three ───────────────────────────────────────────
// The lock screen's own model: a gallery of complete looks, then two dials
// that tune the one chosen. The THEME is the big choice and it is whole: a
// ground, an ink, a face, a corner, a texture. The TINT recolours it, and
// the FACE resets its type, and either can be left as the theme brought it.
// Nine themes, twelve tints and six faces are a few hundred letters that
// look different from each other, which is the freedom, and every one of
// them is a choice from a menu that every writer shares, which is what keeps
// a look from being a signature (docs/WALL-FEATURES.md, G3). Nothing here
// takes a colour a person typed, a picture, or a word.
//
// ── one set of tokens ───────────────────────────────────────────────────────
// A look is drawn as custom properties on the paper (`lookVars`): the ground,
// the ink and the four strengths of it that the paper's own rules already
// use for its rule, its stamp, its foot and its marks, the face and its
// weights, the corner. The plain paper declares the same properties at the
// system's values (wall.css `.wl-paper`), so every rule on the card reads one
// token and a look changes the token. The disc on the wall reads the same
// tokens (`Face`), which is how the paper of a letter becomes the paper of
// its name on the field.
//
// Nothing here names a hue outside the two lists, and the derived strengths
// are arithmetic on the ink, so a tint's rule, stamp and foot come out at
// the same relative weights the plain paper's do.

// ── the faces ───────────────────────────────────────────────────────────────
// Six. The first three are the system's own (design/DESIGN.md section 4), at
// the letter's job; the other three are fetched for the looks and used for
// nothing else (scripts/fetch-faces.mjs). `size` scales the body's type and
// `title` the addressee's, because a hand at 16px is smaller than a serif at
// 16px and a pixel face at 16px is larger.
export const FACES = [
  { slug: 'serif', name: 'serif', family: "'Newsreader', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif", weight: 400, titleWeight: 500, size: 1, title: 1 },
  { slug: 'sans',  name: 'sans',  family: "'Inter Tight', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", weight: 400, titleWeight: 600, size: 0.96, title: 0.94 },
  { slug: 'mono',  name: 'mono',  family: "'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace", weight: 400, titleWeight: 500, size: 0.88, title: 0.86 },
  { slug: 'pixel', name: 'pixel', family: "'Pixelify Sans', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 500, size: 1.04, title: 1 },
  { slug: 'hand',  name: 'hand',  family: "'Caveat', 'Newsreader', 'Iowan Old Style', cursive", weight: 500, titleWeight: 600, size: 1.24, title: 1.2 },
  { slug: 'round', name: 'round', family: "'Comfortaa', 'Inter Tight', system-ui, sans-serif", weight: 500, titleWeight: 700, size: 0.92, title: 0.9 },
]

// ── the tints ───────────────────────────────────────────────────────────────
// Twelve grounds with the ink that reads on each. The first is the plain
// paper's own chalk; eight are light and three are dark. The lit edge and the
// shadowed foot of each are derived, the way the plain paper's are declared.
export const TINTS = [
  { slug: 'chalk',  paper: '#F4F1EA', ink: '#17150F' },
  { slug: 'rose',   paper: '#F5D5DD', ink: '#4A1B2B' },
  { slug: 'peach',  paper: '#F9D8C2', ink: '#4E2812' },
  { slug: 'butter', paper: '#F6E7AE', ink: '#45380D' },
  { slug: 'sage',   paper: '#D5E1C6', ink: '#20311A' },
  { slug: 'mint',   paper: '#CAECDF', ink: '#11392B' },
  { slug: 'sky',    paper: '#D2E3F5', ink: '#122A47' },
  { slug: 'lilac',  paper: '#E2D7F4', ink: '#301F4D' },
  { slug: 'slate',  paper: '#2A2D37', ink: '#E9EAF0' },
  { slug: 'ink',    paper: '#17150F', ink: '#F4F1EA' },
  { slug: 'plum',   paper: '#3A1E3F', ink: '#F3DDF5' },
  { slug: 'forest', paper: '#1D3227', ink: '#DBEADE' },
]

// ── the themes ──────────────────────────────────────────────────────────────
// Each is whole. `paper` and `ink` are its own tint (a flat ground), and a
// theme may bring a `ground` of its own instead, a gradient, which a chosen
// tint replaces. `ink2` is the secondary ink where the derived one would be
// wrong (gold on black). `texture` names a rule in wall.css drawn under the
// type by `data-look`; `radius` is the corner. The first is the plain paper
// and is never stored: it is what a null look draws.
export const THEMES = [
  { slug: 'paper',    name: 'paper',    paper: '#F4F1EA', ink: '#17150F', face: 'serif', radius: 18 },
  { slug: 'night',    name: 'night',    paper: '#0F0E14', ink: '#F4F1EA', face: 'serif', radius: 18 },
  { slug: 'y2k',      name: 'y2k',      paper: '#DCE3FF', ink: '#3A2A6B', face: 'round', radius: 24,
    ground: 'linear-gradient(135deg, #EAE5FF 0%, #CDF3F2 36%, #FFD6F0 70%, #D6E1FF 100%)', texture: 'gloss' },
  { slug: 'nokia',    name: 'nokia',    paper: '#C3CFA3', ink: '#1C2418', face: 'pixel', radius: 10, texture: 'lcd' },
  { slug: 'receipt',  name: 'receipt',  paper: '#FBFAF3', ink: '#33332E', face: 'mono',  radius: 4,  texture: 'dashed' },
  { slug: 'notebook', name: 'notebook', paper: '#FDFCF6', ink: '#1F3480', face: 'hand',  radius: 6,  texture: 'ruled' },
  { slug: 'terminal', name: 'terminal', paper: '#050B07', ink: '#72F09C', face: 'mono',  radius: 12, texture: 'scan' },
  { slug: 'candy',    name: 'candy',    paper: '#FFDCE6', ink: '#7C2A52', face: 'round', radius: 26,
    ground: 'linear-gradient(160deg, #FFD3E6 0%, #FFE8D2 56%, #FFF3C4 100%)' },
  { slug: 'gold',     name: 'gold',     paper: '#110F15', ink: '#F0B429', ink2: '#A98A3C', face: 'serif', radius: 18 },
]

const SLUG = /^[a-z][a-z0-9-]{0,23}$/

const byThemeSlug = new Map(THEMES.map((t) => [t.slug, t]))
const byTintSlug = new Map(TINTS.map((t) => [t.slug, t]))
const byFaceSlug = new Map(FACES.map((f) => [f.slug, f]))

// ── the shape ───────────────────────────────────────────────────────────────
// The same cleaning the server does (wall_look_clean): three keys, slugs,
// and nothing for the plain paper. Not the catalogue: a slug this build does
// not know is kept, so a letter written by a newer build keeps its look in
// the row and draws the plain paper here. `normalise` goes one step further
// for what THIS build writes: a tint or a face that is the theme's own is not
// worth storing.
export function cleanLook(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out = {}
  const pick = (k) => (typeof raw[k] === 'string' && SLUG.test(raw[k]) ? raw[k] : '')
  const theme = pick('theme')
  if (theme && theme !== 'paper') out.theme = theme
  const tint = pick('tint')
  if (tint) out.tint = tint
  const face = pick('face')
  if (face) out.face = face
  return Object.keys(out).length ? out : null
}

export function normaliseLook(raw) {
  const look = cleanLook(raw)
  if (!look) return null
  const theme = themeOf(look)
  const out = { ...look }
  if (out.tint && theme.paper && !theme.ground && byTintSlug.get(out.tint)?.paper === theme.paper) delete out.tint
  if (out.face && out.face === theme.face) delete out.face
  return Object.keys(out).length ? out : null
}

// One string per look, for a memo key and for React: two looks that draw the
// same are the same string.
export function lookKey(look) {
  const l = cleanLook(look)
  return l ? `${l.theme || ''}/${l.tint || ''}/${l.face || ''}` : ''
}

export function themeOf(look) {
  return (look && byThemeSlug.get(look.theme)) || THEMES[0]
}
export function tintOf(look) {
  return (look && look.tint && byTintSlug.get(look.tint)) || null
}
export function faceOf(look) {
  const theme = themeOf(look)
  return (look && look.face && byFaceSlug.get(look.face)) || byFaceSlug.get(theme.face) || FACES[0]
}

// What a look is called, in words, for the desk and for a label: the theme,
// then the tint and the face when they are not the theme's own.
export function lookLabel(look) {
  const l = cleanLook(look)
  if (!l) return ''
  const theme = themeOf(l)
  const parts = [theme.name]
  const tint = tintOf(l)
  if (tint) parts.push(tint.slug)
  if (l.face && l.face !== theme.face) parts.push(l.face)
  return parts.join(', ')
}

// ── the arithmetic ──────────────────────────────────────────────────────────
function rgb(hex) {
  const h = String(hex || '').replace('#', '')
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(s, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
function toHex(r, g, b) {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
export function mix(a, b, t) {
  const A = rgb(a)
  const B = rgb(b)
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}
export function alpha(hex, a) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
// Whether a ground is dark, off its luma: it decides which way the lit edge
// and the shadowed foot go, and which way the secondary ink leans.
export function isDark(hex) {
  const [r, g, b] = rgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 118
}

// ── the tokens ──────────────────────────────────────────────────────────────
// What a look sets on a paper, a tile or a disc. Null for the plain paper:
// the stylesheet's own declarations stand. `tokensOf` is the same
// arithmetic with the plain paper included, for the panel's tiles and dots,
// which draw the plain paper as a choice beside the others.
export function lookVars(look) {
  const l = cleanLook(look)
  if (!l) return null
  return tokensOf(l)
}

export function tokensOf(look) {
  const l = cleanLook(look) || {}
  const theme = themeOf(l)
  const tint = tintOf(l)
  const face = faceOf(l)
  const paper = tint ? tint.paper : theme.paper
  const ink = tint ? tint.ink : theme.ink
  const dark = isDark(paper)
  const hi = mix(paper, '#FFFFFF', dark ? 0.06 : 0.45)
  const edge = mix(paper, '#000000', dark ? 0.32 : 0.07)
  const ground = !tint && theme.ground
    ? theme.ground
    : `linear-gradient(168deg, ${hi} 0%, ${paper} 34%, ${edge} 100%)`
  const ink2 = !tint && theme.ink2 ? theme.ink2 : mix(ink, paper, dark ? 0.42 : 0.4)
  return {
    '--lk-ground': ground,
    '--lk-paper': paper,
    '--lk-paper-hi': hi,
    '--lk-paper-edge': edge,
    '--lk-ink': ink,
    '--lk-ink-2': ink2,
    '--lk-rule': alpha(ink, 0.16),
    '--lk-ink-faint': alpha(ink, 0.05),
    '--lk-ink-soft': alpha(ink, 0.07),
    '--lk-ink-mid': alpha(ink, 0.3),
    '--lk-ink-strong': alpha(ink, 0.55),
    '--lk-face': face.family,
    '--lk-face-w': String(face.weight),
    '--lk-title-w': String(face.titleWeight),
    '--lk-size': String(face.size),
    '--lk-title-size': String(face.title),
    '--lk-radius': `${theme.radius}px`,
  }
}

// The attributes a looked element carries beside its vars: the theme's slug,
// which the stylesheet keys its textures on, and whether the ground is dark,
// which decides how the grain and the gloss are laid on it.
export function lookAttrs(look) {
  const l = cleanLook(look) || {}
  const theme = themeOf(l)
  const tint = tintOf(l)
  return {
    'data-look': theme.slug,
    'data-lit': isDark(tint ? tint.paper : theme.paper) ? 'dark' : 'light',
  }
}

// ── the wall's memo ─────────────────────────────────────────────────────────
// The look on the newest letter under a key, learned from wherever this
// browser last saw the key (the index, a search, a letter), the way a first
// name's spelling is learned (data.js `learnName`). It is what a disc on the
// field, a row in the search and a face in the dock draw when nobody hands
// them a letter's own look.
const LOOKS = new Map()
export function learnLook(key, look) {
  if (!key) return
  const l = cleanLook(look)
  if (l) LOOKS.set(key, l)
  else LOOKS.delete(key)
}
export function lookFor(key) {
  return (key && LOOKS.get(key)) || null
}

// ── the disc ────────────────────────────────────────────────────────────────
// How the name on a looked disc is set: the whole name when it is short
// enough to stand in the disc at a size that can be read, and the monogram
// otherwise. The size is what fits the disc's width at the face's average
// advance, capped so one letter is not a poster.
export function nameOnDisc(name, size) {
  const n = String(name || '').trim()
  if (!n || size < 44 || n.length > 9) return null
  const px = Math.min(size * 0.3, (size * 0.74) / (0.58 * n.length))
  if (px < size * 0.15) return null
  return { text: n, px: Math.round(px * 10) / 10 }
}

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
// ground, an ink, a face, a corner, a grain, and — since the eight papers —
// FURNITURE, which is the part of it that is not a fill.
//
// The panel calls the three by what a writer is actually choosing — TEXTURE,
// COLOR, TYPE (Look.jsx) — while the row keeps the three keys the schema
// admits, `theme`, `tint`, `face`. The words are the interface's and the
// keys are the column's, and neither has to move for the other.
//
// Eight papers, twenty-three colours and twelve faces are a couple of
// thousand letters that look different from each other, which is the
// freedom, and every one of them is a choice from a menu that every writer
// shares, which is what keeps a look from being a signature
// (docs/WALL-FEATURES.md, G3). Nothing here takes a colour a person typed,
// a picture, or a word.
//
// ── furniture, and why a theme is not a tint ────────────────────────────────
// It was five themes of which four had no texture in them: a ground, a face
// and a corner, on an axis labelled TEXTURE. Only the nokia had a rule in
// the stylesheet, and the grain the plain paper lays over everything was
// multiplied on top of that rule, so the one theme that drew anything drew
// it through a noise field.
//
// A theme now carries four more things, and they are what make a paper an
// OBJECT rather than a fill:
//
//   grain      the surface, and the theme owns it. One layer, ever: the
//              plain paper's fibre is no longer laid over a theme that has
//              a texture of its own (`none` is a real answer, and four of
//              the eight give it)
//   chrome     the drawn parts that belong to this paper and no other: the
//              nokia's signal and battery, the chalkboard's rail, the
//              letterpress's blind deboss, the telegram's printed form, the
//              postcard's stamp box. Drawn by parts.jsx `Furniture` and
//              ruled in wall.css, every one of them a gradient or a border
//              (docs/WALL-FEATURES.md, G7)
//   layout     the three papers that do not just dress the card but MOVE
//              it: the nokia wraps its head and body in a screen, the
//              polaroid puts the addressee on the chin under the picture,
//              the postcard divides the back. Everything else is the same
//              four slots in the same order
//   frame      what the card itself is when the letter is not written on
//              it: the nokia's plastic shell, the polaroid's white border.
//              The tint then recolours the SCREEN or the PICTURE, which is
//              the surface a writer means, and never the shell around it
//
// None of it is a column. The row still keeps three slugs, `wall_look_clean`
// still admits exactly three keys, and eight papers needed no migration.
//
// ── and what came off ───────────────────────────────────────────────────────
// `candy`, `night` and `gold`. The first was a gradient the colour dial
// deleted the moment anybody touched it; the other two were a ground and a
// face with nothing drawn on them, and the two papers that replace them in
// that role — the velvet and the chalkboard — are lit from the other side
// and have furniture. A letter already written on one of the three keeps
// its slug in its row and draws the plain paper, the same way a letter on
// y2k, receipt, notebook or terminal has since those came off: nothing is
// ever rewritten in the corpus to take a row off a menu.
//
// ── one set of tokens ───────────────────────────────────────────────────────
// A look is drawn as custom properties on the paper (`lookVars`): the ground,
// the ink and the four strengths of it that the paper's own rules already
// use for its rule, its stamp, its foot and its marks, the face and its
// weights, the corner, and the EDGE. The plain paper declares the same
// properties at the system's values (wall.css `.wl-paper`), so every rule on
// the card reads one token and a look changes the token. The disc on the wall
// reads the same tokens (`Face`), which is how the paper of a letter becomes
// the paper of its name on the field.
//
// The edge is the newest of them and it is a fix. The card's hairline was
// `rgba(0,0,0,0.22)`, declared once and never varied, so a near black paper
// had no edge at all while a cream one had a hard line — the same card
// reading as two different objects depending on what was chosen. It is
// derived off the ink now, like the rule and the stamp beside it, so all
// eight papers carry one weight of edge.
//
// Nothing here names a hue outside the two lists, and the derived strengths
// are arithmetic on the ink, so a tint's rule, stamp and foot come out at
// the same relative weights the plain paper's do.

// ── the faces ───────────────────────────────────────────────────────────────
// Twelve. The first three are the system's own (design/DESIGN.md section 4)
// at the letter's job, and they are free: a browser that has drawn any screen
// in this product already has them. The other nine are fetched for the looks
// and used for nothing else in the build — never a headline, a label, a
// control or an identifier (scripts/fetch-faces.mjs).
//
// `size` scales the body's type and `title` the addressee's, because a hand
// at 16px is smaller than a serif at 16px, a pixel face at 16px is larger,
// and a copperplate at 16px is barely there. Every number below is the one
// that puts that face's LOWER CASE on the same optical line as the serif's.
//
// Six were added with the eight papers, and the reason is that half of the
// six that stood here were the product's own furniture doing a second job:
// a writer opening TYPE was choosing between the chrome and two defaults.
// Nine of the twelve are now a face somebody would pick to SAY something in.
export const FACES = [
  { slug: 'serif',      name: 'serif',      family: "'Newsreader', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif", weight: 400, titleWeight: 500, size: 1, title: 1 },
  { slug: 'sans',       name: 'sans',       family: "'Inter Tight', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", weight: 400, titleWeight: 600, size: 0.96, title: 0.94 },
  { slug: 'mono',       name: 'mono',       family: "'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace", weight: 400, titleWeight: 500, size: 0.88, title: 0.86 },
  { slug: 'pixel',      name: 'pixel',      family: "'Pixelify Sans', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 500, size: 1.04, title: 1 },
  { slug: 'hand',       name: 'hand',       family: "'Caveat', 'Newsreader', 'Iowan Old Style', cursive", weight: 500, titleWeight: 600, size: 1.24, title: 1.2 },
  { slug: 'round',      name: 'round',      family: "'Comfortaa', 'Inter Tight', system-ui, sans-serif", weight: 500, titleWeight: 700, size: 0.92, title: 0.9 },
  // A struck key with the ink spread around it, and the one the menu most
  // obviously lacked: it is what an unsigned letter is actually written in.
  // One weight only, so the title takes the same 400 the body does.
  { slug: 'typewriter', name: 'typewriter', family: "'Special Elite', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 400, size: 0.94, title: 0.92 },
  // Drawn ON a grid rather than rounded onto one, which is what keeps it
  // from being the pixel again. It sets very small, hence the scale.
  { slug: 'screen',     name: 'screen',     family: "'VT323', 'Geist Mono', ui-monospace, monospace", weight: 400, titleWeight: 400, size: 1.38, title: 1.3 },
  { slug: 'poster',     name: 'poster',     family: "'Oswald', 'Inter Tight', system-ui, sans-serif", weight: 400, titleWeight: 600, size: 1, title: 1.02 },
  { slug: 'display',    name: 'display',    family: "'Playfair Display', 'Newsreader', Georgia, serif", weight: 400, titleWeight: 600, size: 0.98, title: 1 },
  { slug: 'marker',     name: 'marker',     family: "'Permanent Marker', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 0.98, title: 0.94 },
  // The only face in the menu with a real flourish in it. Its x height is
  // about half the serif's, so it is scaled further than anything else here.
  { slug: 'script',     name: 'script',     family: "'Pinyon Script', 'Caveat', cursive", weight: 400, titleWeight: 400, size: 1.45, title: 1.4 },
]

// ── the tints ───────────────────────────────────────────────────────────────
// Twenty-three grounds with the ink that reads on each. The lit edge, the
// shadowed foot and the hairline of every one of them are derived, the way
// the plain paper's are declared: a colour here is two hex values and the
// arithmetic below does the rest.
//
// It was eleven, and eleven was one band — seven light pastels at almost the
// same chroma and four darks — so a writer choosing COLOR was choosing how
// much pink. The list is now four bands, in this order, which is also the
// order the panel's four rows of six draw them in:
//
//   near white   chalk, bone, oat, dust        the letter barely dressed
//   warm         blush → clay                  where seven of the eleven were
//   cool         sage → lilac                  four steps apart, not two
//   deep         graphite → ink                seven where there were four,
//                                              and a mid grey there was none of
//
// The rule that cut `mint` still stands and is the reason the list is spread
// rather than merely longer: a swatch nobody can tell from its neighbour is
// a swatch that makes the grid longer without making a letter more its own.
// Nothing here is within a step of the thing beside it.
//
// Twenty-three and not twenty-four because the paper's own ground stands
// first in the grid as a choice ("as is"), which makes it twenty-four cells,
// four even rows of six and no ragged last line.
//
// A letter already written on `mint` — or on any slug a later build drops —
// keeps that slug in its row and draws its paper's own ground.
export const TINTS = [
  // near white
  { slug: 'chalk',    paper: '#F4F1EA', ink: '#17150F' },
  { slug: 'bone',     paper: '#EDE4D2', ink: '#2E2717' },
  { slug: 'oat',      paper: '#E2D6BC', ink: '#352B17' },
  { slug: 'dust',     paper: '#D9D5CD', ink: '#26241E' },
  // warm
  { slug: 'blush',    paper: '#F9E4E6', ink: '#4A2129' },
  { slug: 'rose',     paper: '#F5D5DD', ink: '#4A1B2B' },
  { slug: 'coral',    paper: '#F9C8B7', ink: '#57241A' },
  { slug: 'peach',    paper: '#F9D8C2', ink: '#4E2812' },
  { slug: 'amber',    paper: '#F3CA8C', ink: '#48310D' },
  { slug: 'butter',   paper: '#F6E7AE', ink: '#45380D' },
  { slug: 'clay',     paper: '#D9B9A4', ink: '#3B2317' },
  // cool
  { slug: 'sage',     paper: '#D5E1C6', ink: '#20311A' },
  { slug: 'sea',      paper: '#C2E0D8', ink: '#0F332B' },
  { slug: 'sky',      paper: '#D2E3F5', ink: '#122A47' },
  { slug: 'denim',    paper: '#ABC1DF', ink: '#17283F' },
  { slug: 'lilac',    paper: '#E2D7F4', ink: '#301F4D' },
  // deep
  { slug: 'graphite', paper: '#494952', ink: '#EFEFF4' },
  { slug: 'slate',    paper: '#2A2D37', ink: '#E9EAF0' },
  { slug: 'teal',     paper: '#17352F', ink: '#CFE7DF' },
  { slug: 'forest',   paper: '#1D3227', ink: '#DBEADE' },
  { slug: 'plum',     paper: '#3A1E3F', ink: '#F3DDF5' },
  { slug: 'wine',     paper: '#3C1620', ink: '#F3D6DC' },
  { slug: 'ink',      paper: '#17150F', ink: '#F4F1EA' },
]

// ── the themes ──────────────────────────────────────────────────────────────
// Each is whole. `paper` and `ink` are its own tint — and on a theme with a
// `frame`, they are the SCREEN's or the PICTURE's, not the shell's, because
// the surface a writer means when they pick a colour is the one the words
// are on. A theme may bring a `ground` of its own instead, a gradient, which
// a chosen tint replaces. `ink2` is the secondary ink where the derived one
// would be wrong.
//
// `radius` is the corner, and it is one of four (design/DESIGN.md 5.2):
//
//   2   print      a sheet that came off a press or out of a form
//   6   cut        a card that was trimmed — a postcard, a print, a slate
//   12  device     a thing with a moulded shell
//   18  card       the system's own, which the plain paper keeps
//
// It was 18 / 26 / 10 / 18 / 18, where 26 is `--r-sheet` — a SHEET's corner,
// not a card's — and 10 was not a token at all.
//
// `grain` names the one surface layer the paper carries and the theme owns
// it; `chrome` names its drawn parts (parts.jsx `Furniture`); `layout` is
// set only by the three that move the card's own slots.
//
// Eight, in the order the panel draws them: four flat papers on the first
// row, then four objects on the second. A letter written on a theme this
// build no longer carries keeps its slug in the row and draws the plain
// paper here, which is what `cleanLook` keeping an unknown slug is for.
export const THEMES = [
  // ── the four flat papers ──
  { slug: 'paper', name: 'paper', paper: '#F4F1EA', ink: '#17150F',
    face: 'serif', radius: 18, grain: 'fibre' },

  // Cotton stock, pressed. The chrome is a blind deboss — a rule with a lit
  // line above it and a shadowed one below, which is what an unlinked plate
  // leaves in a heavy sheet — and the crest and the addressee are struck the
  // same way. The grain is coarser and slower than the plain paper's, because
  // cotton has a tooth and wood pulp has a grain.
  { slug: 'letterpress', name: 'letterpress', paper: '#F1ECE0', ink: '#211E18',
    face: 'serif', radius: 2, grain: 'tooth', chrome: 'deboss' },

  // The divided back, which is the whole of what a postcard is: the message
  // on the left of a rule, the address on the right of it, and a stamp box
  // in the corner with the constellation where the sovereign's head goes.
  { slug: 'postcard', name: 'postcard', paper: '#F2EADA', ink: '#33291C',
    face: 'hand', radius: 6, grain: 'fibre', chrome: 'stamp', layout: 'divided' },

  // Form stock, printed in a single pass: a double rule struck round the
  // sheet and a faint ruling under the words, both in the form's own brown.
  // The body is set upper case, which is the convention and is a DISPLAY
  // choice — the words in the row are the words the writer typed, and the
  // list at the keyboard and the classifier after it read exactly what they
  // read on any other paper.
  { slug: 'telegram', name: 'telegram', paper: '#F3E3A4', ink: '#2E2410',
    face: 'typewriter', radius: 2, grain: 'fibre', chrome: 'form' },

  // ── the four objects ──
  // The picture and the chin under it. The frame is the white border and it
  // is not the paper: a chosen colour moves the EMULSION, so `ink` on a
  // polaroid is a dark photograph in a white frame rather than a black
  // rectangle with a black chin. The addressee is written on the chin, in
  // the hand, which is where a name goes on a print.
  { slug: 'polaroid', name: 'polaroid', paper: '#F3EBDC', ink: '#231F18',
    frame: 'linear-gradient(168deg, #FFFFFD 0%, #FAFAF7 46%, #EDECE6 100%)',
    face: 'hand', radius: 6, grain: 'none', chrome: 'chin', layout: 'framed' },

  // The one that was already here, and the one that was only ever a lattice.
  // It is an object now: a moulded shell, a screen recessed into it, the
  // dateline standing as the status row with the signal and the battery on
  // it, and the foot standing as the two softkeys. The lattice is the only
  // thing on the screen — the grain is off, so nothing is multiplied over it.
  { slug: 'nokia', name: 'nokia', paper: '#C3CFA3', ink: '#1B2416',
    frame: 'linear-gradient(170deg, #3C4038 0%, #24261F 58%, #171812 100%)',
    face: 'pixel', radius: 12, grain: 'none', chrome: 'nokia', layout: 'screen' },

  // Slate, dust and a wooden rail along the bottom edge. The dark paper that
  // is not the void: `night` was the void with a serif on it, and a letter
  // that looks like the wall it is pinned to is a letter with no paper.
  { slug: 'chalkboard', name: 'chalkboard', paper: '#26342C', ink: '#EFEFE6',
    ground: 'linear-gradient(168deg, #2E3D34 0%, #26342C 48%, #1D2A23 100%)',
    face: 'hand', radius: 6, grain: 'dust', chrome: 'rail' },

  // Deep pile with a bloom off the top left and a debossed border. Where
  // `gold` spent a second saturated colour on a hairline frame, this one is
  // a MATERIAL: the ink is the light the pile throws back, and the only
  // bright thing on the sheet is still the paper.
  { slug: 'velvet', name: 'velvet', paper: '#2B1220', ink: '#F2DEE4', ink2: '#C9A2B2',
    ground: 'radial-gradient(112% 88% at 24% 6%, #5A2340 0%, #3A1629 46%, #240E1A 100%)',
    face: 'display', radius: 18, grain: 'pile', chrome: 'deboss' },
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
    // The hairline round the card, derived off the ink the way the rule and
    // the stamp above it are. It was `rgba(0,0,0,0.22)` declared once on
    // `.wl-paper` and never varied, which drew a hard line on a cream paper
    // and NOTHING at all on a near black one. A dark ground takes a lit
    // edge and a light ground a shadowed one, a little weaker, because a
    // dark line on a pale card reads heavier than a pale line on a dark one.
    '--lk-edge': alpha(ink, dark ? 0.2 : 0.26),
    // What the card itself is on a theme whose letter is written on
    // something INSIDE it: the nokia's shell, the polaroid's border. The
    // tokens above stay the screen's and the picture's, so a chosen colour
    // moves the surface the words are on and never the shell around it.
    '--lk-frame': theme.frame || ground,
  }
}

// The attributes a looked element carries beside its vars: the theme's slug,
// which the stylesheet keys its chrome on; whether the ground is dark, which
// decides which way the grain is laid on it; and the grain itself, which is
// the theme's and not the plain paper's. `data-grain` is the fix for two
// layers multiplying over each other: the one grain layer on the card reads
// this attribute and draws that surface and no other, so a theme that brings
// a texture of its own says `none` and gets exactly its own texture.
export function lookAttrs(look) {
  const l = cleanLook(look) || {}
  const theme = themeOf(l)
  const tint = tintOf(l)
  return {
    'data-look': theme.slug,
    'data-lit': isDark(tint ? tint.paper : theme.paper) ? 'dark' : 'light',
    'data-grain': theme.grain || 'fibre',
  }
}

// The two hooks a themed card needs in JSX rather than in CSS: what it draws
// beside its type (parts.jsx `Furniture`) and whether it moves its own slots
// (`Paper`). Both are the theme's, never the tint's or the face's — picking
// a colour or a face can never change what a paper IS.
export function chromeOf(look) {
  return themeOf(look).chrome || ''
}
export function layoutOf(look) {
  return themeOf(look).layout || ''
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

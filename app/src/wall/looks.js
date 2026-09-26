// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LOOKS: what colour a letter's screen is lit in                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A letter on the wall is a phone screen, left on in a dark room: an unsent
// draft, the cursor still blinking after the last word. Every letter is that
// one screen, set in one face (Jersey 10, the Series 40 grid), with the same
// three rows on it (the status across the top, the words, the soft keys),
// and the only thing a writer chooses is the COLOUR it is lit in.
//
// It was forty-two papers in seven families, twenty-nine tints and
// twenty-four faces, and then eighteen colours in three groups. Now it is
// one pool of twelve, in the order of a spectrum, and each colour carries
// its own treatment with it, because on a real screen the two are the same
// fact:
//
//   lit       a backlit LCD photographed in the dark. The panel glows, the
//             bands above and below it are the phone's own dark glass, and
//             the words bloom a little. night, white, ice, green, amber, rose
//   negative  the same screen with the panel dark and the words the bright
//             thing
//   poster    that photograph screen printed in four flat inks, the paper
//             the colour. teal, lilac
//   riso      two drum inks laid a hair out of register on warm paper.
//             violet / yellow
//   xerox     photocopied, and blown out: the toner exposure is the effect
//   brat      a square of acid lime, black words, and nothing else: the
//             album cover everybody knows, photographed on cheap film.
//             acid (below, `brat`)
//
// A print carries its own LIGHT with it as well, and the light is the
// colour's and never a second choice (`light`, and screen.css, the prints'
// lights). The backlight's hot corner, printed in the palest ink, was on
// every print, and read as the same white stain on each. Each print has a
// light of its own out of the same press: teal a keyline round its panel,
// lilac its light carried as a halftone screen, and violet / yellow none,
// its panel the yellow drum flat.
//
// ── and every one keeps the phone's two bands ──
// The status across the top and the keys at the foot stand on two bands of
// the phone's glass, above and below the panel, on every screen: a lit one's
// dark glass, a copy's toner, and a print's bands laid in one of its own
// inks (`bands`: the second, or on lilac the darkest) with the status and the
// keys struck out of them in the palest. Acid's are near black, the lime's
// own shadow, with its status and keys in the lime. Teal, lilac and acid were
// one poster edge to edge, and beside nine screens with bands they read as
// three other objects; the bands make the twelve one phone in twelve colours.
//
// ── acid ──
// Acid was a poster, its four inks a lime pulled out of the night screen by
// the press, with the hot corner caught in a pale yellow. Beside the others
// it read as one more tint of the same machine, and the owner's word for it
// was generic. The lime everybody has in their head is not a printed LCD at
// all. It is a flat square of #8ACE00 with a word on it in black, the type
// a little soft, as if it had been made small once and blown up again: an
// album cover, and one that is recognised from across a room. So acid is
// that square (`brat`), painted by the stylesheet and not by the press, so
// it is the same square on WebKit, where the press does not run, as on
// Chromium, where it does:
//
//   the lime    the panel, with no rule round it. A touch lighter and
//               warmer where this phone's backlight is brightest (`--q-hx`,
//               `--q-hy`), which on a square of paper is where the lamp
//               caught it, and a touch deeper towards the edges. Slight:
//               from across the room it is one flat colour
//   the bands   the phone's two, above and below it, as every screen has
//               them: near black, the lime's own shadow, with the status
//               and the keys struck in the lime
//   the grain   heavy and monochrome, a cheap photograph of a printed
//               square, across the lime and the bands alike: an SVG noise
//               laid over it as an image (screen.css `--wl-grain`), since
//               feTurbulence inside an image is drawn by every engine where
//               a filter on the page is not
//   the words   black on the lime, and all of it softened a hair, never so
//               far that a word has to be guessed
//
// Its slug and its name stay `acid`, so a letter that went up in it is
// still acid, and now looks like this.
//
// The prints keep their own ground: a poster is teal, whatever room it is
// in. The room is not theirs. Every screen, lit or printed, stands in the
// same black (`.wl-room`), so the wall is one dark room and not a paint
// chart.
//
// ── what the row keeps ──────────────────────────────────────────────────────
// The column is 0055's: `{ theme, tint, face }`, three slugs, cleaned by
// `wall_look_clean`. A letter now writes ONE of them, `{ tint: 'teal' }`,
// and never a face: there is one. A row written before the screens (a theme,
// a face, a tint this list does not have) is not an error. It draws the
// colour its own id picks (`colourOf`), so an old letter is still a lit
// screen and never a blank one, and migration 0058 has already given every
// letter on the wall a colour of its own. A colour that has left the pool
// (`RETIRED`) draws the one nearest its hue, and 0061 moved its rows.
//
// ── and what makes each one its own (`quirks`) ──────────────────────────────
// Two screens of the same colour are still two phones. Out of the letter's
// id comes a handful of small facts that no two letters share and nobody
// chose: how the phone is tilted in the photograph, the exact proportion of
// its panel, where its backlight is brightest, the pitch of its pixels and
// the moiré the camera made of them, a speck of dust, a dead pixel, a
// hairline scratch, which battery glyph that model draws, how far a riso
// drum slipped, how hot the copier ran. Each is small on its own and none
// changes what the screen says or where its keys are. Nothing is
// Math.random(): the same letter is the same photograph on every phone.

// ── the colours ─────────────────────────────────────────────────────────────
// `hue` is the one colour a lit screen is made from; the bands, the ink, the
// glow and the bloom are arithmetic on it (`skinOf`). A print carries its
// four inks, darkest first, because a print IS its inks, its `light`, which
// is where the press lays the palest of them, and `bands`, which of its inks
// the two bands of glass are laid in, 1 the second and 0 the darkest
// (`skinOf`). The square carries its lime (`hue`) and its black (`ink`), and
// the rest of it is arithmetic on the lime.
//
// One pool, in the order the panel draws it and the arrows walk it: the
// greys, then round the wheel from the cold blue through the greens and the
// yellows to the reds, the pink and the violet, and last the two that are
// not lit.
export const COLOURS = [
  { slug: 'night', name: 'night', kind: 'lit', hue: '#9D9D9D' },
  { slug: 'white', name: 'white', kind: 'lit', hue: '#D7DDE3' },
  { slug: 'ice', name: 'ice', kind: 'lit', hue: '#8FB8DC' },
  { slug: 'teal', name: 'teal', kind: 'poster', light: 'keyline', bands: 1, stops: ['#101412', '#3D6257', '#7EA494', '#E3A58C'] },
  { slug: 'green', name: 'green', kind: 'lit', hue: '#A3BB6B' },
  { slug: 'acid', name: 'acid', kind: 'brat', hue: '#8ACE00', ink: '#050505' },
  { slug: 'violet-yellow', name: 'violet / yellow', kind: 'riso', light: 'plain', bands: 1, paper: '#F4F0E4', a: '#5A3DA8', b: '#F7C200' },
  { slug: 'amber', name: 'amber', kind: 'lit', hue: '#E0A95A' },
  { slug: 'rose', name: 'rose', kind: 'lit', hue: '#DF93AF' },
  { slug: 'lilac', name: 'lilac', kind: 'poster', light: 'dots', bands: 0, stops: ['#130F20', '#4A3C79', '#A799D7', '#F0D86D'] },
  { slug: 'negative', name: 'negative', kind: 'neg', hue: '#BDBDBD' },
  { slug: 'xerox', name: 'xerox', kind: 'xerox', stops: ['#0D0D0C', '#0D0D0C', '#ECEAE4', '#ECEAE4'] },
]

// The colours that have left the pool, and the one each is drawn as now:
// the nearest by the hue of its main ink, so a letter that went up in blush
// is still a pink letter, and one that went up in ember an amber one, so
// the panel is two even rows of six. Read wherever a row's colour is read (`colourOf`,
// `normaliseLook`); migrations 0061 and 0063 moved the rows themselves, and this is
// what a row the migration has not reached, or a draft kept in a browser,
// is drawn as. A Map, so a slug is never read as one of an object's own
// names.
export const RETIRED = new Map([
  ['blush', 'rose'], ['pink-blue', 'rose'], ['cobalt', 'ice'],
  ['orange-teal', 'amber'], ['red-green', 'amber'], ['ember', 'amber'],
])
const current = (slug) => RETIRED.get(slug) || slug

const BY_SLUG = new Map(COLOURS.map((c) => [c.slug, c]))
const SLUG = /^[a-z][a-z0-9-]{0,23}$/
export const DEFAULT_COLOUR = 'night'

// ── the hash ────────────────────────────────────────────────────────────────
// Its own, rather than data.js's, because data.js imports this file. The
// same two lanes of multiply and xor, and a small generator off it.
function hash(str) {
  let a = 0x9e3779b9
  let b = 0x85ebca6b
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 0x27d4eb2d) >>> 0
    b = Math.imul(b ^ (a >>> 13), 0x165667b1) >>> 0
  }
  return (a ^ (b >>> 15)) >>> 0
}
function prng(seed) {
  let t = hash(seed) || 1
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// ── the shape ───────────────────────────────────────────────────────────────
// The same cleaning the server does (wall_look_clean): an object, the three
// keys, slugs. Not the catalogue: a slug this build does not know is kept,
// so a row is never rewritten by reading it.
export function cleanLook(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out = {}
  for (const k of ['theme', 'tint', 'face']) {
    if (typeof raw[k] === 'string' && SLUG.test(raw[k]) && !(k === 'theme' && raw[k] === 'paper')) out[k] = raw[k]
  }
  return Object.keys(out).length ? out : null
}

// What THIS build writes: one colour, or nothing when it is not one of ours.
export function normaliseLook(raw) {
  const l = cleanLook(raw)
  const t = l && current(l.tint)
  return t && BY_SLUG.has(t) ? { tint: t } : null
}

export function lookKey(look) {
  const l = cleanLook(look)
  return l ? `${l.theme || ''}/${l.tint || ''}/${l.face || ''}` : ''
}

// The colour a letter is lit in: its own when it chose one of these (or the
// one a retired colour became), and otherwise the one its id picks, so a
// letter with no colour in its row is still a screen and still the same one
// every time.
export function colourOf(look, seed = '') {
  const l = cleanLook(look)
  const t = l && current(l.tint)
  if (t && BY_SLUG.has(t)) return BY_SLUG.get(t)
  return COLOURS[hash(`${seed}#colour`) % COLOURS.length]
}

export function colourBySlug(slug) {
  return BY_SLUG.get(current(slug)) || BY_SLUG.get(DEFAULT_COLOUR)
}

// A colour for a draft nobody has chosen one for yet, so the wall is not a
// field of the same grey.
export function freshLook(seed = `${Date.now()}`) {
  return { tint: COLOURS[hash(`${seed}#fresh`) % COLOURS.length].slug }
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
export function multiply(a, b) {
  const A = rgb(a)
  const B = rgb(b)
  return toHex((A[0] * B[0]) / 255, (A[1] * B[1]) / 255, (A[2] * B[2]) / 255)
}
export function alpha(hex, a) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${+Number(a).toFixed(3)})`
}
export function hexRgb(hex) { return rgb(hex) }

// ── the skin ────────────────────────────────────────────────────────────────
// Everything a screen of this colour is painted with, once, for every place
// that paints one: the letter (`Screen`), the small screens on the wall
// (`Tile`), the panel's thumbnails and the picture a letter is sent as
// (share.js). One table, so the four never drift apart.
//
//   top, top2, bot   the dark glass above and below the panel
//   hi, mid, lo      the panel, from where the backlight is brightest out
//   ink, lit         the words on the panel, and the words on the glass
//   bloom            what a camera makes of a lit word in the dark
//   glow             the light the screen throws on the room round it
//   k                how strongly it throws it
//   print            for the prints: the four inks the photograph is
//                    quantised into, how the press laid them, and the
//                    greys a picture is struck in to come out as them
//   flat             the small screen's own fill, for the tiles and the
//                    thumbnails, which are too small for a filter, and on
//                    a print the inks a tile's picture is struck in
//   light            on a print, which of the prints' lights it is (below)
//   paper            a thing that is lit and does not light: a print or the
//                    square. It throws almost nothing on the room, has no
//                    LCD's pixels up close and no backlight's clouds, and is
//                    uncovered rather than woken. `print` is narrower: only
//                    what is pulled through the press
const cache = new Map()

// ── the prints' lights ──
// The press lays a print's palest ink wherever the greys under it are over
// three quarters, so where a print's light falls is decided by the panel's
// three greys (hi, mid and lo, as a lit panel's are), and the stylesheet
// draws each light in its own shape out of them (screen.css, the prints'
// lights; share.js draws the same). Every light here is in the colour's own
// inks, so none of them is a new hue.
//
//   corner    the backlight's hot corner: hi crosses into the palest ink
//             round the point the panel is brightest at. It was every
//             print's, then acid's alone, and acid is the square now; it
//             stays as the press's own default, for a print that names
//             none and for `/looks.html?light=corner`
//   keyline   no light on the panel, which is flat in the main ink, and a
//             line of the palest ink round the panel instead, a hair inside
//             the rule and the bands
//   dots      the hot corner held under the palest ink and carried by a
//             halftone screen, so it prints as dots that grow towards the
//             point it is brightest at
//   plain     no light at all: the panel flat in the main ink. It was
//             called `bands`, when violet / yellow was the one print with
//             the phone's bands; every screen has them now (above)
const LIGHTS = {
  corner: ['#D4D4D4', '#A9A9A9', '#8C8C8C'],
  keyline: ['#A2A2A2', '#A0A0A0', '#9F9F9F'],
  dots: ['#A2A2A2', '#A0A0A0', '#9F9F9F'],
  plain: ['#A2A2A2', '#A0A0A0', '#9F9F9F'],
}
// the bands' grey under the press, by the ink they are laid in: one flat
// grey in the middle of that ink's bin, so neither the grain nor the grid
// breaks a band into the ink next to it
const BAND_GREY = ['#202020', '#606060']
// and each light on the small screens, which are too small for the press:
// a layer of the palest ink over the main one, in the same place
const SPOTS = {
  corner: 'radial-gradient(31% 25% at var(--q-hx, 78%) var(--q-hy, 64%), var(--t-accent) 62%, transparent 100%)',
  dots: 'radial-gradient(80% 64% at var(--q-hx, 78%) var(--q-hy, 64%), transparent, var(--t-body) 66%), radial-gradient(var(--t-accent) 34%, transparent 44%) 0 0 / 4px 4px, radial-gradient(var(--t-accent) 34%, transparent 44%) 2px 2px / 4px 4px',
}
export function skinOf(colour) {
  const c = typeof colour === 'string' ? colourBySlug(colour) : colour || colourBySlug(DEFAULT_COLOUR)
  if (cache.has(c.slug)) return cache.get(c.slug)
  let s
  if (c.kind === 'lit') {
    const b = c.hue
    const ink = mix(b, '#000000', 0.88)
    s = {
      kind: 'lit',
      top: mix(b, '#000000', 0.5), top2: mix(b, '#000000', 0.58), bot: mix(b, '#000000', 0.9),
      hi: mix(b, '#FFFFFF', 0.3), mid: b, lo: mix(b, '#000000', 0.3),
      ink, lit: mix(b, '#FFFFFF', 0.84), cur: mix(b, '#FFFFFF', 0.86),
      bloom: alpha(mix(b, '#FFFFFF', 0.5), 0.55), soft: alpha(ink, 0.35),
      glow: b, k: c.slug === 'night' ? 0.8 : 1,
    }
  } else if (c.kind === 'neg') {
    s = {
      kind: 'neg',
      top: '#262626', top2: '#1D1D1D', bot: '#070707',
      hi: '#242424', mid: '#161616', lo: '#0A0A0A',
      ink: '#F1F1F1', lit: '#EDEDED', cur: '#F2F2F2',
      bloom: 'rgba(255, 255, 255, 0.3)', soft: 'rgba(255, 255, 255, 0.55)',
      glow: c.hue, k: 0.5,
    }
  } else if (c.kind === 'brat') {
    // The square (acid, at the head of this file). Its two bands are the
    // lime's own shadow, near black with the green still in it, and what
    // stands on them, the status and the keys, is in the lime, a touch paler
    // so it holds at the size of a key: the cover's two colours, the other
    // way round. The panel between them is the lime a touch warmer and
    // lighter at the hot corner and a touch deeper at the edge, and `soft`
    // is the ink's own blur, the halo a word printed small and blown up
    // again has round it
    const b = c.hue
    const ink = c.ink
    const glass = mix(b, '#000000', 0.88)
    s = {
      kind: 'brat',
      top: glass, top2: glass, bot: glass,
      hi: mix(b, '#F4F07A', 0.4), mid: b, lo: mix(b, '#1C3300', 0.26),
      ink, lit: mix(b, '#F4F07A', 0.2), cur: ink,
      bloom: 'transparent', soft: alpha(ink, 0.55),
      glow: b, k: 0.8,
    }
  } else {
    // A print is the lit night screen, photographed, then pulled through the
    // press: its greys become the inks (`printFilter`). So the screen under
    // the filter is drawn in greys, lighter than the night's so the panel
    // lands on the paper colour and the backlight's hot corner on the
    // accent ink.
    const stops = c.kind === 'riso'
      ? [multiply(c.a, c.b), c.a, c.b, c.paper]
      : c.stops
    const ink = stops[0]
    // a copy's bands go to toner at every exposure and its panel to paper,
    // and its lit words have no bloom for the threshold to turn into blobs
    const xer = c.kind === 'xerox'
    const light = xer ? '' : LIGHTS[c.light] ? c.light : 'corner'
    const [hi, mid, lo] = xer ? ['#DCDCDC', '#BEBEBE', '#A0A0A0'] : LIGHTS[light]
    // the bands, in the ink the colour names for them (`BAND_GREY`)
    const band = BAND_GREY[c.bands === 0 ? 0 : 1]
    s = {
      kind: c.kind, light,
      top: xer ? '#1F1F1F' : band,
      top2: xer ? '#191919' : band,
      bot: xer ? '#0E0E0E' : band,
      hi, mid, lo,
      ink: '#131313', lit: '#F4F4F4', cur: '#131313',
      bloom: xer ? 'transparent' : 'rgba(255, 255, 255, 0.4)', soft: 'rgba(0, 0, 0, 0.3)',
      glow: c.kind === 'xerox' ? '#ECEAE4' : stops[2], k: c.kind === 'xerox' ? 0.55 : 0.8,
      print: {
        stops,
        blur: c.kind === 'poster' ? 0.7 : 0.55,
        grain: c.kind === 'poster' ? 0.17 : c.kind === 'riso' ? 0.26 : 0.22,
        ghost: c.kind === 'riso' ? 0.3 : 0,
        // the picture's tones, paper to darkest, in greys inside the press's
        // four bins even under the panel's grid and the grain's dark bias. A
        // copy has one threshold, so its picture has two
        pic: xer ? ['#F5F5F5', '#141414'] : ['#F5F5F5', '#ADADAD', '#6B6B6B', '#141414'],
      },
      inkHex: ink,
    }
  }
  // the small screen's own fill: a lit one is its panel and its bands; a
  // print is its paper colour with the words in its darkest ink and a rule
  // of it round the edge, its light over that, and its bands in their ink
  if (s.print) {
    const [dark, second, main, accent] = s.print.stops
    s.flat = {
      top: 'transparent', bot: 'transparent', ink: dark, lit: dark, cur: dark,
      body: c.kind === 'xerox' ? '#ECEAE4' : main,
      accent: c.kind === 'xerox' ? '' : accent,
      border: dark,
      spot: SPOTS[s.light] || 'none',
      ts: c.kind === 'riso' ? `1.5px 1px 0 ${alpha(c.a, 0.75)}` : c.kind === 'xerox' ? '0 0 0.7px rgba(13, 13, 12, 0.8)' : 'none',
    }
    if (c.kind === 'xerox') { s.flat.top = '#0D0D0C'; s.flat.bot = '#0D0D0C'; s.flat.lit = '#ECEAE4'; s.flat.border = '' }
    // the tile's picture in the print's own inks, paper to darkest: a
    // poster's accent, main, mid and dark, a riso's paper, b, a and their
    // overprint. A copy's tile keeps the toner's four greys
    else s.flat.pic = [...s.print.stops].reverse()
    // and its bands, in the ink they are laid in, with what stands on them
    // in the palest
    if (c.kind !== 'xerox') {
      const band = c.bands === 0 ? dark : second
      s.flat.top = band; s.flat.bot = band; s.flat.lit = accent; s.flat.cur = accent
    }
  } else if (s.kind === 'brat') {
    // the square, small: the same lime with the same warm corner between
    // the same two near black bands, no rule, and the grain laid over it by
    // the stylesheet. A tile's picture is struck in four steps from the lime
    // to the black, the way a photograph on that cover would have been
    // printed
    s.flat = {
      top: s.top, bot: s.bot, ink: s.ink, lit: s.lit, cur: s.ink,
      body: `radial-gradient(120% 95% at var(--q-hx, 80%) var(--q-hy, 66%), ${s.hi}, ${s.mid} 52%, ${s.lo})`,
      accent: '', border: '', spot: 'none',
      ts: `0 0 1px ${alpha(s.ink, 0.6)}`,
      pic: [s.mid, mix(s.mid, s.ink, 0.36), mix(s.mid, s.ink, 0.7), s.ink],
    }
  } else {
    s.flat = {
      top: s.top, bot: s.bot, ink: s.ink, lit: s.lit, cur: s.cur,
      body: `radial-gradient(120% 95% at var(--q-hx, 80%) var(--q-hy, 66%), ${s.hi}, ${s.mid} 52%, ${s.lo})`,
      accent: '', border: '',
      ts: s.kind === 'neg'
        ? '0 0 1px #fff, 0 0 6px rgba(255, 255, 255, 0.5), 0 0 14px rgba(255, 255, 255, 0.22)'
        : `0 0 1.2px ${alpha(s.ink, 0.35)}`,
    }
  }
  s.slug = c.slug
  s.name = c.name
  s.light = s.light || ''
  s.paper = !!s.print || s.kind === 'brat'
  cache.set(c.slug, s)
  return s
}

// ── where the press does not run ──
// The press is an SVG filter laid on an HTML element (`printFilter`), and
// WebKit, which is every browser on an iPhone, draws the element without it:
// the greys the filter was to turn into inks came out as they are, and every
// print read as a black and white screen. There the screen is painted in its
// inks to begin with (`inkOf`), each grey put in the ink the press would have
// put it in, so a print is its colour on every phone. `?press=0` draws that
// in development on any browser.
export const PRESS = (() => {
  if (typeof navigator === 'undefined') return true
  if (import.meta.env && import.meta.env.DEV && typeof location !== 'undefined' && /[?&]press=0\b/.test(location.search)) return false
  const ua = navigator.userAgent || ''
  return !(/AppleWebKit/.test(ua) && !/(Chrome|Chromium|Edg|OPR)\//.test(ua))
})()

// The ink the press lays a grey in: its luminance, in the same bins as the
// filter's table, and a copy's one threshold at the middle
function inkOf(s, hex) {
  const { stops } = s.print
  const [r, g, b] = rgb(hex)
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (s.kind === 'xerox') return l < 0.5 ? stops[0] : stops[2]
  return stops[Math.min(stops.length - 1, Math.floor(l * stops.length))]
}

// The custom properties a screen of this colour is painted with, for the
// stylesheet (screen.css) to read. The same names on the letter, the tile
// and the thumbnail. `inked` paints a print in its inks, for a screen the
// press does not run on (`PRESS`).
export function skinVars(colour, inked = false) {
  const s = skinOf(colour)
  const g = (a) => alpha(s.glow, a * s.k)
  const p = inked && s.print ? (hex) => inkOf(s, hex) : (hex) => hex
  return {
    '--s-top': p(s.top), '--s-top-2': p(s.top2), '--s-bot': p(s.bot),
    '--s-hi': p(s.hi), '--s-mid': p(s.mid), '--s-lo': p(s.lo),
    '--s-ink': p(s.ink), '--s-lit': p(s.lit), '--s-cur': p(s.cur),
    '--s-bloom': inked && s.print ? 'transparent' : s.bloom,
    '--s-soft': inked && s.print ? alpha(s.print.stops[0], 0.3) : s.soft,
    '--s-glow': g(0.42), '--s-glow-2': g(0.16), '--s-edge': g(0.28),
    '--s-halo': s.paper ? alpha(s.glow, s.kind === 'xerox' ? 0.07 : 0.11) : g(0.3), '--s-halo-2': s.paper ? alpha(s.glow, 0.08) : g(0.16),
    '--t-top': s.flat.top, '--t-bot': s.flat.bot, '--t-body': s.flat.body,
    '--t-ink': s.flat.ink, '--t-lit': s.flat.lit, '--t-cur': s.flat.cur,
    '--t-ts': s.flat.ts, '--t-border': s.flat.border || 'transparent', '--t-accent': s.flat.accent || 'transparent',
    '--t-spot': s.flat.spot || 'none',
  }
}

// ── the press ───────────────────────────────────────────────────────────────
// A print is a real filter over the lit screen: the photograph blurred a
// little, turned to luminance, roughened with grain where the press would
// break up an edge, and quantised into the four inks. A riso lays the
// second drum a hair off the first. `q` is the letter's own quirks: the
// grain's seed, the slip of the drum, the heat of the copier.
export function printFilter(colour, q) {
  const s = skinOf(colour)
  if (!s.print) return ''
  const { stops, blur, ghost } = s.print
  let grain = s.print.grain
  let table = stops
  if (s.kind === 'xerox') {
    // a hot copier burns more of the page to black, a cool one lets it go
    // to white: the one threshold between toner and paper walks with the
    // exposure, and the grain round it with how far it walked. Hot, the
    // panel's dim corner goes to toner in a speckle; cool, only the words
    // and the glass hold. The glass is dark at either end of the range.
    const e = q ? q.exposure : 0
    grain += Math.abs(e) * 0.12
    const n = 24
    const dark = Math.round(n * (0.5 + e * 0.14))
    table = Array.from({ length: n }, (_, i) => (i < dark ? stops[0] : stops[2]))
  }
  const ch = (i) => table.map((h) => (rgb(h)[i] / 255).toFixed(3)).join(' ')
  const lumi = '0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0'
  const seed = q ? q.grainSeed : 4
  const dx = q ? q.slipX : 1.4
  const dy = q ? q.slipY : 0.9
  const tail = ghost
    ? `<feOffset in="p" dx="${dx.toFixed(2)}" dy="${dy.toFixed(2)}" result="po"/><feComposite in="p" in2="po" operator="arithmetic" k2="${1 - ghost}" k3="${ghost}"/>`
    : ''
  return `<feGaussianBlur stdDeviation="${blur}" result="b"/>`
    + `<feColorMatrix in="b" type="matrix" values="${lumi}" result="l"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed}" result="n"/>`
    + '<feColorMatrix in="n" type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1" result="ng"/>'
    + `<feComposite in="l" in2="ng" operator="arithmetic" k2="1" k3="${grain.toFixed(3)}" k4="${(-grain / 2).toFixed(3)}" result="ln"/>`
    + `<feComponentTransfer in="ln" result="p"><feFuncR type="discrete" tableValues="${ch(0)}"/><feFuncG type="discrete" tableValues="${ch(1)}"/><feFuncB type="discrete" tableValues="${ch(2)}"/></feComponentTransfer>`
    + tail
    // and only where the screen is: the grain is laid over the whole filter
    // region, the screen's box and a margin round it, and without this the
    // margin came out as a faint rectangle of paper in the dark
    + '<feComposite in2="SourceAlpha" operator="in"/>'
}

// ── the quirks ──────────────────────────────────────────────────────────────
// What makes this screen this one. Every value is small on purpose: the
// screen should read as the same object on every letter, the way a row of
// phones on a table is one object, and look again and no two are held the
// same way. Nothing here moves a key, changes a word or makes a letter
// harder to read.
const range = (r, a, b) => a + (b - a) * r()
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length]
const memo = new Map()
export function quirks(seed) {
  const key = String(seed || '')
  if (memo.has(key)) return memo.get(key)
  const r = prng(`${key}#quirks`)
  const sign = () => (r() < 0.5 ? -1 : 1)
  // the photograph: how it was held
  const rz = range(r, 0.15, 0.95) * sign()
  const rx = range(r, 0.5, 2.2)
  const ry = range(r, 0.6, 3.1) * sign()
  // the panel: its proportion, its corner, where its light is
  const ar = range(r, 1.12, 1.2)
  const rad = range(r, 0.8, 1.9)
  const hx = range(r, 62, 88)
  const hy = range(r, 52, 78)
  // the pixels, and the moiré the camera made of them
  const pitch = range(r, 2.7, 3.35)
  const moire = range(r, 0.35, 1.5) * sign()
  // the glass: the glare's angle, a speck or two of dust, sometimes a scratch
  const glare = range(r, 84, 112)
  const glareA = range(r, 0.04, 0.1)
  const specks = r() < 0.18 ? 0 : r() < 0.7 ? 1 : 2
  const dust = []
  for (let i = 0; i < specks; i++) {
    dust.push(`radial-gradient(circle at ${range(r, 12, 88).toFixed(1)}% ${range(r, 30, 92).toFixed(1)}%, rgba(0,0,0,${range(r, 0.14, 0.26).toFixed(2)}) 0, rgba(0,0,0,0.08) ${range(r, 1.2, 2.4).toFixed(1)}%, transparent ${range(r, 3.4, 5.6).toFixed(1)}%)`)
  }
  const scratchOn = r() < 0.24
  const sa = range(r, 18, 70) * sign()
  const sp = range(r, 20, 80)
  // a short hairline in one patch of the glass, not a line through all of it
  const scratch = scratchOn
    ? `linear-gradient(${sa.toFixed(1)}deg, transparent calc(50% - 0.5px), rgba(255,255,255,0.14) 50%, transparent calc(50% + 0.5px)) ${sp.toFixed(1)}% ${(100 - sp).toFixed(1)}% / 38% 30% no-repeat`
    : 'none'
  // the panel's own faults: a ghost column the driver left on, a dead pixel
  const streak = r() < 0.55
  const streakX = range(r, 58, 90)
  // the dead pixel is stuck lit, on one of the dark bands: in the words it
  // read as a full stop
  const deadOn = r() < 0.22
  const dead = deadOn
    ? (() => {
      const x = range(r, 14, 86)
      const y = range(r, 20, 86)
      const yy = y < 53 ? 4 + (y - 20) * 0.3 : 88 + (y - 53) * 0.24
      return `linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)) ${x.toFixed(1)}% ${yy.toFixed(1)}% / 0.9cqw 0.9cqw no-repeat`
    })()
    : 'none'
  // the model: which battery and aerial it drew, and where the name sat.
  // Every phone draws the same ones now (screen.jsx), but the three draws
  // stay, so every quirk after them lands where it always did
  r(); r(); r()
  // the words: where the lines start and how far down the first one sits.
  // The start is about in line with the aerial, which stands 3cqw in
  const pad = range(r, 2.4, 3.4)
  const lift = range(r, 1.1, 2.4)
  const topPad = range(r, 2.2, 3.1)
  // the cursor, so a wall of them is not one metronome
  const blink = Math.round(range(r, 0, 1060))
  // the light it throws on the room
  const halo = range(r, 0.85, 1.12)
  // the prints: the grain, the drum's slip, the copier's heat
  const grainSeed = 1 + Math.floor(r() * 97)
  const slipX = range(r, 0.6, 1.9) * sign()
  const slipY = range(r, 0.4, 1.3) * sign()
  const exposure = range(r, -0.6, 0.6)
  // A third of the small screens of a print used to carry a wash of the
  // accent ink in a corner of their own. A print's light is its colour's
  // now (`skinOf`, the prints' lights), the same on the letter, the tile
  // and the picture, and the seven draws the wash took stay, so every
  // quirk after them lands where it always did
  if (r() < 0.34) for (let i = 0; i < 7; i++) r()
  // xerox: the roller's streaks, and the grey the lid let in down one edge
  const rollers = `linear-gradient(90deg, transparent ${range(r, 8, 30).toFixed(1)}%, rgba(0,0,0,0.12) 0, transparent ${range(r, 0.3, 0.8).toFixed(2)}rem, transparent ${range(r, 55, 92).toFixed(1)}%, rgba(0,0,0,0.08) 0, transparent ${range(r, 0.2, 0.5).toFixed(2)}rem)`
  const lid = sign() > 0 ? 'left' : 'right'
  // the backlight, which is never even: a few clouds where the diffuser
  // sits badly, darker mostly and now and then lighter; one edge the lamps
  // bleed in along; and the corners falling away. Drawn on the page as
  // `--q-mura` and on the Send picture from the same numbers (share.js)
  const clouds = []
  const nClouds = 2 + Math.floor(r() * 3)
  for (let i = 0; i < nClouds; i++) {
    const white = r() < 0.3
    clouds.push({
      w: range(r, 24, 52), h: range(r, 16, 36), x: range(r, 6, 94), y: range(r, 14, 94),
      a: white ? range(r, 0.05, 0.11) : range(r, 0.07, 0.17), white,
    })
  }
  const bleed = { to: pick(r, ['top', 'bottom', 'left', 'right']), a: range(r, 0.04, 0.1), len: range(r, 8, 20) }
  const vig = { w: range(r, 118, 140), h: range(r, 112, 134), x: range(r, 42, 58), y: range(r, 40, 56), a: range(r, 0.16, 0.32) }
  const light = { clouds, bleed, vig }
  const mura = [
    ...clouds.map((c) => `radial-gradient(${c.w.toFixed(1)}% ${c.h.toFixed(1)}% at ${c.x.toFixed(1)}% ${c.y.toFixed(1)}%, rgba(${c.white ? '255,255,255' : '0,0,0'},${c.a.toFixed(3)}), transparent 100%)`),
    `linear-gradient(to ${bleed.to}, rgba(255,255,255,${bleed.a.toFixed(3)}), transparent ${bleed.len.toFixed(1)}%)`,
    `radial-gradient(${vig.w.toFixed(1)}% ${vig.h.toFixed(1)}% at ${vig.x.toFixed(1)}% ${vig.y.toFixed(1)}%, transparent 52%, rgba(0,0,0,${vig.a.toFixed(3)}) 100%)`,
  ].join(', ')
  const out = {
    rz, rx, ry, ar, rad, hx, hy, pitch, moire, glare, glareA, dust, scratch, streak, streakX, dead,
    pad, lift, topPad, blink, halo, grainSeed, slipX, slipY, exposure, rollers, lid, light,
  }
  out.vars = {
    '--q-rz': `${rz.toFixed(3)}deg`, '--q-rx': `${rx.toFixed(3)}deg`, '--q-ry': `${ry.toFixed(3)}deg`,
    '--q-ar': ar.toFixed(4), '--q-rad': `${rad.toFixed(2)}%`,
    '--q-hx': `${hx.toFixed(1)}%`, '--q-hy': `${hy.toFixed(1)}%`,
    '--q-pitch': `${pitch.toFixed(2)}px`, '--q-moire': `${moire.toFixed(2)}deg`,
    '--q-glare': `${glare.toFixed(1)}deg`, '--q-glare-a': glareA.toFixed(3),
    '--q-dust': dust.length ? dust.join(', ') : 'none', '--q-scratch': scratch,
    '--q-streak-x': `${streakX.toFixed(1)}%`, '--q-streak-a': streak ? '1' : '0', '--q-dead': dead,
    '--q-pad': `${pad.toFixed(2)}cqw`, '--q-lift': `${lift.toFixed(2)}cqw`, '--q-top-pad': `${topPad.toFixed(2)}cqw`,
    '--q-blink': `-${blink}ms`, '--q-halo': halo.toFixed(3),
    '--q-rollers': rollers, '--q-mura': mura,
    // where the square's grain starts, off the grain's own seed, so two acid
    // letters side by side are two photographs and not one noise laid twice
    // (screen.css, acid). Read from a value already drawn, so every quirk
    // after it lands where it always did
    '--q-grain': `${(grainSeed * 53) % 256}px ${(grainSeed * 97) % 256}px`,
  }
  memo.set(key, out)
  return out
}

// ── the pixels, up close ────────────────────────────────────────────────────
// What a camera catches of an LCD in the dark: every pixel's three stripes,
// and no two pixels lit quite alike. A tile of RGB_CELLS pixels a side, three
// image pixels to a pixel and one column to a stripe, drawn round a neutral
// grey, so that laid over the screen in `overlay` it tints and does not
// darken. Each pixel is pushed a little off by the letter's own seed, and the
// push gathers in soft patches the way a sensor's colour noise does, so the
// screen reads as photographed rather than drawn and each letter's is its
// own. Struck once per seed, as a PNG the page and the Send picture share.
export const RGB_CELLS = 64
const RGBS = new Map()
export function rgbTile(seed) {
  const key = String(seed || '')
  if (RGBS.has(key)) return RGBS.get(key)
  if (typeof document === 'undefined') return ''
  const r = prng(`${key}#rgb`)
  const n = RGB_CELLS
  const side = n * 3
  const cv = document.createElement('canvas')
  cv.width = side
  cv.height = side
  const g = cv.getContext('2d')
  if (!g) return ''
  // a coarse field per channel, four by four and wrapping, read smoothly
  // across the tile: where the colour noise gathers
  const F = 4
  const field = [0, 1, 2].map(() => Array.from({ length: F * F }, () => r() * 2 - 1))
  const ease = (t) => t * t * (3 - 2 * t)
  const at = (c, i, j) => field[c][(j % F) * F + (i % F)]
  const patch = (c, x, y) => {
    const fx = (x / n) * F
    const fy = (y / n) * F
    const i = Math.floor(fx)
    const j = Math.floor(fy)
    const tx = ease(fx - i)
    const ty = ease(fy - j)
    const top = at(c, i, j) + (at(c, i + 1, j) - at(c, i, j)) * tx
    const bot = at(c, i, j + 1) + (at(c, i + 1, j + 1) - at(c, i, j + 1)) * tx
    return top + (bot - top) * ty
  }
  const img = g.createImageData(side, side)
  const d = img.data
  const tint = [0, 0, 0]
  for (let cy = 0; cy < n; cy++) {
    for (let cx = 0; cx < n; cx++) {
      // the pixel a hair brighter or dimmer, and its colour pushed off
      const lum = (r() - 0.5) * 22
      for (let c = 0; c < 3; c++) tint[c] = patch(c, cx, cy) * 18 + (r() - 0.5) * 36
      for (let py = 0; py < 3; py++) {
        for (let s = 0; s < 3; s++) {
          const i = ((cy * 3 + py) * side + cx * 3 + s) * 4
          // each stripe carries its own colour a little over the others
          for (let c = 0; c < 3; c++) d[i + c] = 128 + lum + tint[c] + (c === s ? 22 : -8)
          d[i + 3] = 255
        }
      }
    }
  }
  g.putImageData(img, 0, 0)
  let url
  try { url = cv.toDataURL('image/png') } catch { url = '' }
  // a strip of letters is a few dozen seeds; the oldest go first
  if (RGBS.size >= 64) RGBS.delete(RGBS.keys().next().value)
  RGBS.set(key, url)
  return url
}

// ── the wall's memo ─────────────────────────────────────────────────────────
// The look on the newest letter under a key, learned from wherever this
// browser last saw the key (the index, a search, a letter). It is what a
// small screen on the field draws when nobody hands it a letter's own look.
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

// ── the glyphs ──────────────────────────────────────────────────────────────
// Drawn on the screen's own pixel grid, one string per row, `X` lit. The
// letter draws them as SVG (screen.jsx `Pix`), the wall's small screens as
// masks made once, and the picture a letter is sent as with fillRect: one
// drawing, three ways of putting it on glass.
export const PIX = {
  // the aerial as the phone drew it: a bar, the mast through a hollow
  // triangle, and a heavy stem
  ant: ['XXXXXXXXX', 'XX..X..XX', '.X..X..X.', '.XX.X.XX.', '..XXXXX..', '...XXX...', '...XXX...', '...XXX...', '...XXX...', '...XXX...'],
  // the pen, down to the right: two edges, and the square nib they close on
  pen: ['XX...XX....', '.XX...XX...', '..XX...XX..', '...XX...XXX', '....XX...XX', '.....XX..XX', '......XX.XX', '.......XXXX', '.......XXXX', '....XXXXXXX'],
  lock: ['..XXX..', '.X...X.', '.X...X.', 'XXXXXXX', 'XXX.XXX', 'XXX.XXX', 'XXXXXXX'],
  heart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  heartO: ['.XX.XX.', 'X..X..X', 'X.....X', '.X...X.', '..X.X..', '...X...'],
  check: ['......X', '.....XX', 'X...XX.', 'XX.XX..', '.XXX...', '..X....'],
  env: ['XXXXXXXXXXX', 'XX.......XX', 'X.X.....X.X', 'X..X...X..X', 'X...XXX...X', 'X.........X', 'XXXXXXXXXXX'],
  send: ['X..........', 'XXX........', 'X..XXX.....', 'X.....XXX..', 'X........XX', 'X.....XXX..', 'X..XXX.....', 'XXX........', 'X..........'],
  link: ['..XX..XX...', '.X..XX..X..', 'X...XX...X.', 'X..X..X..X.', '.X..XX..X..', '..XX..XX...'],
  save: ['...XXX...', '...XXX...', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....', 'XXXXXXXXX'],
  // ── the chrome's own ──
  // The whole wall is the phone now (DESIGN.md 2.6), so the controls round
  // the screens are drawn on the same grid as the glyphs on them: the lens,
  // the back and down chevrons, the close mark, the key, the flag, the way
  // out, the arrow a link follows, and the hourglass the phone turned while
  // it was busy. Drawn by screen.jsx `PixIcon`, a whole number of the page's
  // pixels to each of theirs, and never an icon set's.
  find: ['..XXX....', '.X...X...', 'X.....X..', 'X.....X..', 'X.....X..', '.X...X...', '..XXXXX..', '......XX.', '.......XX'],
  back: ['...XX', '..XX.', '.XX..', 'XX...', '.XX..', '..XX.', '...XX'],
  down: ['XX...XX', '.XX.XX.', '..XXX..', '...X...'],
  close: ['X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X...X.', 'X.....X'],
  key: ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.', '..X..', '..XX.', '..X..', '..XX.'],
  flag: ['XXXXXX', 'X....X', 'X...X.', 'X....X', 'XXXXXX', 'X.....', 'X.....', 'X.....'],
  signout: ['XXXX......', 'X.........', 'X.....X...', 'X.....XX..', 'X.XXXXXXX.', 'X.....XX..', 'X.....X...', 'X.........', 'XXXX......'],
  arrow: ['....X..', '....XX.', 'XXXXXXX', '....XX.', '....X..'],
  wait: ['XXXXXXX', 'X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X.X.X.', 'X.XXX.X', 'XXXXXXX'],
}
// the battery as the phone drew it, its nub on the left and its cells
// draining from that end; the charge in it is how fresh the letter is
const BAT = {
  a: ['..XXXXXXXXXXXXXXX', '..X.............X', 'XXX.............X', 'X.X.............X', 'X.X.............X', 'XXX.............X', '..X.............X', '..XXXXXXXXXXXXXXX'],
}
// the cells inside it, left to right, and which end they drain from
const CELLS = { a: { x0: 4, rev: true } }
for (let n = 0; n <= 4; n++) {
  for (const m of Object.keys(BAT)) {
    const { x0, rev } = CELLS[m]
    const cell = (x) => {
      const i = x - x0
      if (i < 0 || i >= 12 || i % 3 === 2) return false
      const k = Math.floor(i / 3)
      return rev ? k >= 4 - n : k < n
    }
    PIX[`bat${m}${n}`] = BAT[m].map((row, y) => [...row].map((ch, x) => (ch === 'X' || (y >= 2 && y <= 5 && cell(x)) ? 'X' : '.')).join(''))
  }
}

// The charge, off a letter: how long it has been sitting there unsaid.
export function chargeOf(ts) {
  if (!ts) return 4
  const hrs = (Date.now() - ts) / 3600000
  return hrs < 20 ? 4 : hrs < 60 ? 3 : hrs < 132 ? 2 : hrs < 240 ? 1 : 0
}

// The day a letter went up, or a ping was placed, the way the phone stamped
// a message it had kept: 09/24/26, month, day and year in two figures each,
// by the clock of the phone it is read on. It stands in the status row where
// the draft counted its characters (screen.jsx `stamp`), so a screen being
// written says how much is left and one that is up or placed says when.
const two = (n) => String(n).padStart(2, '0')
export function stampOf(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return `${two(d.getMonth() + 1)}/${two(d.getDate())}/${two(d.getFullYear() % 100)}`
}

// The path of a glyph, for an SVG `d` or a mask made once.
export function glyphPath(name) {
  const rows = PIX[name]
  if (!rows) return { d: '', w: 1, h: 1 }
  let d = ''
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') d += `M${x} ${y}h1v1h-1z` }))
  return { d, w: rows[0].length, h: rows.length }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE DESIGN: which scales the wall is drawn at, and who gets to say      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// system.css declares the scales and the presets. This file is the other half
// of that: what a design IS as a value, where it is read from, how it reaches
// the DOM, and how it gets out of the browser again as something a person can
// paste into the stylesheet.
//
// A design is five fields and nothing else:
//
//   style    which voice — which face plays which role, how hard the corners
//            are, how loud the labels are
//   layout   which arrangement — where the type block sits, what measure it
//            is set in, how dense the vertical rhythm is
//   type     a multiplier on the whole type scale
//   space    a multiplier on the whole spacing scale
//   round    a multiplier on the whole radius scale
//
// Two menus and three sliders. That is deliberately small: a design system
// with forty knobs is a design system nobody turns, and the five above
// between them reach every number in system.css — which is every number the
// primitives in wall.css read.
//
// ── where a design comes from, in order ─────────────────────────────────────
// The address first, then what this browser last chose, then the defaults.
//
// The address matters more than it looks. `?style=poster&layout=split` is a
// design somebody can send to somebody else, and a design two people can be
// looking at while they talk about it — which is the difference between
// iterating on a build and describing one. It is read once, applied, and left
// in the bar rather than scrubbed, because the whole point of it is to be
// copied out of the bar.
//
// ── and what it is NOT ──────────────────────────────────────────────────────
// It is not in store.js. The store is session state — a draft, a scan source,
// what this device has read — and `reset()` wipes the lot, which is correct
// for a demo and wrong for a build setting: a reset in the middle of a design
// review should not put the surface back to a style nobody was looking at. So
// it has its own key and its own life.
//
// It is also not a THEME in the product sense, and it never reaches a letter.
// A letter chooses its own paper (looks.js) and that choice belongs to the
// person who wrote it; this decides how the surface AROUND the letters is
// drawn. The two are on purpose independent: a letter on the velvet paper
// looks the same under every one of the five styles.

const KEY = 'celestual.wall.design.v1'

// ── the styles ──────────────────────────────────────────────────────────────
// The slug is the attribute value, the name is what a person reads, and the
// note is what the choice actually costs — written as the argument for it,
// because a menu of five adjectives is a menu nobody can choose from.
//
// `roles` is what the style does to the four font roles, held here as well as
// in the stylesheet so a panel can say "labels: body face" without parsing
// CSS to find out. It is documentation, not the source of truth: system.css
// is, and the two are checked against each other by eye when either moves.
export const STYLES = [
  {
    slug: 'editorial',
    name: 'Editorial',
    note: 'The house voice, tuned. The serif leads. The mono is demoted to what it is good at, which is strings: handles, codes, counts. And the small caps label comes out of the mono into the body face. That one move is what stops the surface reading as a terminal wearing a Didone hat.',
    roles: { display: 'serif', body: 'sans', label: 'sans', id: 'mono' },
  },
  {
    slug: 'archive',
    name: 'Archive',
    note: 'One face does everything but the headline. No caps tracking, no mono anywhere, small corners, hairlines instead of fills. The quietest of the five and the most consistent by construction. It is the reference the other four are judged against.',
    roles: { display: 'serif', body: 'sans', label: 'sans', id: 'sans' },
  },
  {
    slug: 'poster',
    name: 'Poster',
    note: 'The reference sheet this brand came off, taken literally. The display band goes up, the labels go loud and wide, the corners go nearly square, and type does the structural work that borders do elsewhere. Loud, and still one system.',
    roles: { display: 'serif', body: 'sans', label: 'mono', id: 'mono' },
  },
  {
    slug: 'soft',
    name: 'Soft',
    note: 'No serif and no mono: one sans in every role, big corners, generous air. The furthest from the house voice and the easiest to read on a phone, which is the argument for having it on the list at all.',
    roles: { display: 'sans', body: 'sans', label: 'sans', id: 'sans' },
  },
  {
    slug: 'terminal',
    name: 'Terminal',
    note: 'The opposite extreme, on the list for the same reason the archive is: one face everywhere, headline included, is trivially consistent, and seeing it makes the cost of the other four legible. Square corners, flat leading, tracking opened throughout.',
    roles: { display: 'mono', body: 'mono', label: 'mono', id: 'mono' },
  },
]

// ── the layouts ─────────────────────────────────────────────────────────────
// Where things sit, never what face they are in. Every layout has to be
// readable under every style — that is the test that says these are two axes
// and not one axis with two labels on it.
export const LAYOUTS = [
  {
    slug: 'centered',
    name: 'Centred',
    note: "The poster's own block, in the middle of the glass. What the build already drew, and the right answer for a first screen that is a title and one door.",
  },
  {
    slug: 'column',
    name: 'Column',
    note: 'Everything flush left in one measure, top to bottom, on every screen. The most ordinary of the four and the one that scales best once a screen has a lot on it: the eye returns to one left edge instead of finding a new centre per block.',
  },
  {
    slug: 'split',
    name: 'Split',
    note: 'The title on one side and everything that answers it on the other, once there is width for it. Under 900px it is the column, because a split on a phone is two columns of four words.',
  },
  {
    slug: 'compact',
    name: 'Compact',
    note: 'The column with the air taken out and the display band down a step. For the screens that are genuinely lists, and for a small phone.',
  },
]

// ── the three knobs ─────────────────────────────────────────────────────────
// Each multiplies a whole scale, so the RELATIONSHIPS inside that scale
// survive the turn. The bounds are where the surface stops working rather
// than where it stops being nice: below 0.8 on type the micro label is
// unreadable, above 1.25 the display band wraps on a phone.
export const TUNERS = [
  { key: 'type',  name: 'Type scale',    prop: '--tune-type',  min: 0.85, max: 1.25, step: 0.01, def: 1 },
  { key: 'space', name: 'Spacing scale', prop: '--tune-space', min: 0.7,  max: 1.4,  step: 0.01, def: 1 },
  { key: 'round', name: 'Corner radius', prop: '--tune-round', min: 0,    max: 1.6,  step: 0.02, def: 1 },
]

export const DEFAULT = { style: 'editorial', layout: 'centered', type: 1, space: 1, round: 1 }

const has = (list, slug) => list.some((x) => x.slug === slug)
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// A design off any source, normalised. Anything unrecognised falls back to the
// default rather than reaching the DOM: a style slug from an old link should
// draw the house voice, not an unstyled surface.
export function normalise(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  const num = (v, t) => {
    const n = Number(v)
    return Number.isFinite(n) ? clamp(n, t.min, t.max) : t.def
  }
  return {
    style:  has(STYLES, d.style) ? d.style : DEFAULT.style,
    layout: has(LAYOUTS, d.layout) ? d.layout : DEFAULT.layout,
    type:   num(d.type,  TUNERS[0]),
    space:  num(d.space, TUNERS[1]),
    round:  num(d.round, TUNERS[2]),
  }
}

// ── the address ─────────────────────────────────────────────────────────────
// Five params, all optional, and any one of them alone is a valid link: an
// address carrying only `?style=poster` is the house layout in the poster
// voice, which is the comparison somebody usually wants.
export function fromQuery(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  let q
  try { q = new URLSearchParams(search || '') } catch { return null }
  const keys = ['style', 'layout', 'type', 'space', 'round']
  if (!keys.some((k) => q.has(k))) return null
  const out = {}
  for (const k of keys) if (q.has(k)) out[k] = q.get(k)
  return out
}

// The design as an address, for handing one over. Only what differs from the
// default is written down, so the common case is a short link and a link with
// nothing in it means "as built".
export function toQuery(design) {
  const d = normalise(design)
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(d)) if (v !== DEFAULT[k]) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ── what this browser last chose ────────────────────────────────────────────
export function stored() {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? normalise(JSON.parse(raw)) : null
  } catch { return null }
}

export function save(design) {
  const d = normalise(design)
  try { window.localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* private mode: it lives for this tab */ }
  return d
}

export function forget() {
  try { window.localStorage.removeItem(KEY) } catch { /* as above */ }
}

// The address, then this browser, then the defaults.
export function current() {
  const q = fromQuery()
  if (q) return normalise({ ...(stored() || DEFAULT), ...q })
  return stored() || { ...DEFAULT }
}

// ── onto the element ────────────────────────────────────────────────────────
// Two attributes and three properties. Everything else that changes is a
// consequence of those five, which is the property worth keeping: there is no
// second code path where a design is half-applied.
export function apply(el, design) {
  if (!el) return
  const d = normalise(design)
  el.dataset.style = d.style
  el.dataset.layout = d.layout
  for (const t of TUNERS) el.style.setProperty(t.prop, String(d[t.key]))
  return d
}

// ── and back out as CSS ─────────────────────────────────────────────────────
// A design that can only be reached by turning a slider is a design that dies
// with the tab. This is how one becomes the build: paste it over the knobs at
// the head of system.css, or into the `.wl-root` block, and the surface draws
// what the slider drew with nothing set at runtime at all.
export function toCss(design) {
  const d = normalise(design)
  const style = STYLES.find((s) => s.slug === d.style)
  const layout = LAYOUTS.find((l) => l.slug === d.layout)
  const n = (v) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3))))
  return [
    '/* the design, as chosen. system.css holds what each of the two names',
    `   means: style ${d.style} — ${style ? style.name : ''}, layout ${d.layout} — ${layout ? layout.name : ''}. */`,
    '.wl-root {',
    `  --tune-type:  ${n(d.type)};`,
    `  --tune-space: ${n(d.space)};`,
    `  --tune-round: ${n(d.round)};`,
    '}',
    '',
    '/* and the two attributes, which index.jsx sets from design.js. To freeze',
    '   this design into the build instead, set them on the element itself:',
    `   <div className="wl-root" data-style="${d.style}" data-layout="${d.layout}"> */`,
  ].join('\n')
}

// ── is the workbench open ───────────────────────────────────────────────────
// The panel is not part of the product. It is there when somebody asks for it
// with `?design` in the address, and never otherwise: a visitor who scanned a
// card off a table is not shown the knobs the surface was built with.
export function panelWanted(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  try { return new URLSearchParams(search || '').has('design') } catch { return false }
}

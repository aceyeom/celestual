// ── the route table ─────────────────────────────────────────────────────────
//
// The wall is one surface with sheets on top of it, not eight pages. But a
// surface whose whole job is to be walked through by other people has to be
// deep-linkable: "open the sealing animation" cannot mean "scan the code,
// search a handle, write forty words, wait". So every state of the surface
// has an address, and the address is what the shell renders from.
//
// No routing library: the host app matches location.pathname by hand
// (main.jsx) and this build does the same, in forty lines, so the wall adds
// nothing to the dependency tree the rest of the product is judged from.
//
// ── the address, and the two walls ──────────────────────────────────────────
// It was /beta while this was one. The wall is the Berkeley campus surface at
// /berkeley, a place that reads correctly on a printed card, and since the
// wall for everybody opened at the root of the site (campus.js) the same
// table is read under two bases: `/berkeley/letter/x` on the campus wall and
// `/letter/x` on the one at `/`. The base is set once, by the entry, before
// anything builds an address (`setBase`, campus.js `configure`).
//
// /beta still resolves. Cards and flyers are already out with it on them and
// paper cannot be redeployed, so main.jsx rewrites the old prefix onto the
// campus wall before the shell ever mounts.
export let BASE = '/berkeley'
export const BERKELEY_BASE = '/berkeley'
export const LEGACY_BASE = '/beta'

export function setBase(b) { BASE = String(b || '') }

// Which sheet, if any, is raised over the wall. The wall itself never
// unmounts while one of these is up — that is what makes it a surface. The
// gate, the report and the takedown are on this list too, and deliberately:
// none of them is a place you GO. Each is a question asked about something on
// the screen behind it, and a person sent away from the names to answer one is
// a person who has to find their way back to them. The report in particular has
// to stay a sheet: the letter it is about is a scroll position away, and a
// takedown screen that has replaced the thing it is taking down makes somebody
// trust their memory instead of their eyes.
//
// The ping and the account are on it for the same reason. A ping is placed
// FROM the wall, on a name the person has just been reading or writing to,
// and it closes back onto the wall it was raised over; the account is a look
// at what this person has out, taken without leaving the names. The mutual
// is the end of that same story, so it is raised over the wall too.
export const SHEETS = new Set(['letter', 'find', 'write', 'gate', 'remove', 'report', 'ping', 'you', 'reveal'])

// Every address under a wall's base, by its first segment. At the root this
// is also what decides which addresses are the wall's at all: `/optout` is
// Main's, `/letter/x` is the wall's, and nothing under `/` is claimed by
// the wall on the strength of not being anybody else's.
const HEADS = new Set(['letter', 'find', 'write', 'gate', 'remove', 'report', 'join', 'ping', 'you', 'reveal'])

const norm = (pathname) => String(pathname || '/').replace(/\/+$/, '') || '/'
const rootOf = (base) => base || '/'

export function parse(pathname) {
  const p = norm(pathname)
  if (p === rootOf(BASE)) return { name: 'wall' }
  const rest = p.startsWith(BASE + '/') ? p.slice(BASE.length + 1) : ''
  const [head, id = ''] = rest.split('/')
  switch (head) {
    // A letter or a report with nothing after it is not an address: it drew a
    // "reading" card that never finished. It is the wall.
    case 'letter': return id ? { name: 'letter', id } : { name: 'wall' }   // a letter, raised over the wall
    case 'find':   return { name: 'find' }         // the search, raised over the wall
    case 'write':  return { name: 'write', id }    // the composer, raised over the wall
    case 'gate':   return { name: 'gate' }         // the door on the LETTERS, not on the wall
    case 'remove': return { name: 'remove', id }   // a whole name coming off, once it is proven
    case 'report': return id ? { name: 'report', id } : { name: 'wall' }   // one letter coming down, now
    case 'join':   return { name: 'join' }         // what a ping is, drawn, before placing one
    case 'ping':   return { name: 'ping', id }     // placing a ping, raised over the wall
    case 'you':    return { name: 'you' }          // this person: their pings, drafts and letters
    // It's mutual: the other one's handle, raised over the wall. Main drew
    // it at /reveal until it was the phone's, and the address came with it.
    case 'reveal': return id ? { name: 'reveal', id } : { name: 'wall' }
    // /berkeley/orbit was a drawn stand-in for the core service with a seeded
    // ledger in it, reachable by anybody who typed the address. The ping is
    // a sheet on the wall now, and the stand-in is gone.
    default:       return { name: 'wall' }
  }
}

export function href(name, id) {
  if (name === 'wall') return rootOf(BASE)
  return id ? `${BASE}/${name}/${id}` : `${BASE}/${name}`
}

// Whether an address belongs to the wall at `base`. Under a named base
// everything below it is the wall's; at the root only the wall's own heads
// are, since the root is shared with Main.
export function ownsAt(base, pathname) {
  const p = norm(pathname)
  if (p === rootOf(base)) return true
  if (!p.startsWith(base + '/')) return false
  if (base) return true
  const head = p.slice(base.length + 1).split('/')[0]
  return HEADS.has(head)
}

// Only ever called with a path this build produced. It refuses anything else
// rather than silently pushing a production URL into a history stack the wall
// then tries to render.
export function isWallPath(pathname) {
  return ownsAt(BASE, pathname)
}

// The old address, and only the old address. A visitor who scanned a card
// printed before the rename lands on /berkeley/find; this is what turns that into
// /berkeley/find without a round trip to a server that would only redirect it
// back to the same single-page document anyway.
export function legacyRewrite(pathname) {
  const p = norm(pathname)
  if (p !== LEGACY_BASE && !p.startsWith(LEGACY_BASE + '/')) return null
  return BERKELEY_BASE + p.slice(LEGACY_BASE.length)
}

// ── the wall that is home ───────────────────────────────────────────────────
// Berkeley is the wall the product is built round, and an address that says
// nothing about which wall it wants lands there: the old front door at /ping,
// Main's flow at /place and /@handle, and the sky at /sky, which is what the
// mutual mail has always linked to. One constant, so home can move.
export const HOME_BASE = BERKELEY_BASE

function decode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}

// Bare, lowercase, the characters an @ can carry and no more: the rule
// wall/data.js `normHandle` holds to, restated here so the fork can read an
// address before any of the wall's own modules have loaded.
function bare(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30)
}

// Main's addresses for the ping, and where each one lives now. /ping and
// /place were the front door and the flow; /@handle was the same flow with a
// name already in it, which is what a shared link looks like; /sky was the
// list, which is the account sheet now; and /reveal is the mutual, raised
// over the wall like everything else about a ping. The handle rides on, so a
// link to a person still opens on that person. Like the old prefix above it
// is a rewrite in the history rather than a navigation, so the bar reads the
// address that is drawn and there is no hop anybody sees.
export function movedRewrite(pathname) {
  const p = norm(pathname)
  const [rawHead = '', rawId = ''] = p.slice(1).split('/')
  const head = decode(rawHead)
  const at = (name, h) => `${HOME_BASE}/${name}${h ? `/${h}` : ''}`
  if (head.startsWith('@')) return at('ping', bare(head))
  switch (head) {
    case 'ping':
    case 'place':  return at('ping', bare(decode(rawId)))
    case 'sky':    return at('you')
    case 'reveal': return rawId ? at('reveal', bare(decode(rawId))) : at('you')
    default:       return null
  }
}

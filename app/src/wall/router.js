// ── the route table ─────────────────────────────────────────────────────────
//
// The wall is one surface with sheets on top of it, not eight pages. But a
// surface whose whole job is to be walked through by other people has to be
// deep-linkable: "open the sealing animation" cannot mean "scan the code,
// search a handle, write forty words, wait". So every state of the surface
// has an address, and the address is what the shell renders from.
//
// No routing library: the host app matches location.pathname by hand
// (App.jsx parseRoute) and this build does the same, in forty lines, so the
// wall adds nothing to the dependency tree the rest of the product is judged
// from.
//
// ── the address ─────────────────────────────────────────────────────────────
// It was /beta while this was one. It is not one any more: the wall is the
// Berkeley campus surface, it is live, and the word "beta" was a phase rather
// than a place. /berkeley is a place, it reads correctly on a printed card, and
// it leaves room for the next campus to be a sibling rather than a rewrite.
//
// /beta still resolves. Cards and flyers are already out with it on them and
// paper cannot be redeployed, so main.jsx rewrites the old prefix onto this one
// before the shell ever mounts.
export const BASE = '/berkeley'
export const LEGACY_BASE = '/beta'

// Which sheet, if any, is raised over the wall. The wall itself never
// unmounts while one of these is up — that is what makes it a surface. The
// gate, the report and the takedown are on this list too, and deliberately:
// none of them is a place you GO. Each is a question asked about something on
// the screen behind it, and a person sent away from the names to answer one is
// a person who has to find their way back to them. The report in particular has
// to stay a sheet: the letter it is about is a scroll position away, and a
// takedown screen that has replaced the thing it is taking down makes somebody
// trust their memory instead of their eyes.
export const SHEETS = new Set(['letter', 'find', 'write', 'gate', 'remove', 'report'])

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === BASE || p === '') return { name: 'wall' }
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
    case 'posted': return { name: 'posted' }       // it is up, and the wall took it
    case 'join':   return { name: 'join' }         // the door to the core service, which is Main
    // /berkeley/orbit was a drawn stand-in for the core service with a seeded
    // ledger in it, reachable by anybody who typed the address. The core
    // service is Main, at the root of the site, and /berkeley/join sends
    // people there. The stand-in is gone.
    default:       return { name: 'wall' }
  }
}

export function href(name, id) {
  if (name === 'wall') return BASE
  return id ? `${BASE}/${name}/${id}` : `${BASE}/${name}`
}

// Only ever called with a path this build produced. It refuses anything else
// rather than silently pushing a production URL into a history stack the wall
// then tries to render.
export function isWallPath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '')
  return p === BASE || p.startsWith(BASE + '/')
}

// The old address, and only the old address. A visitor who scanned a card
// printed before the rename lands on /berkeley/find; this is what turns that into
// /berkeley/find without a round trip to a server that would only redirect it
// back to the same single-page document anyway.
export function legacyRewrite(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p !== LEGACY_BASE && !p.startsWith(LEGACY_BASE + '/')) return null
  return BASE + p.slice(LEGACY_BASE.length)
}

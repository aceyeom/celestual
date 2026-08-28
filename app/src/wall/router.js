// ── the route table ─────────────────────────────────────────────────────────
//
// The wall is one surface with sheets on top of it, not eight pages. But a
// prototype whose whole job is to be walked through by other people has to be
// deep-linkable — "open the sealing animation" cannot mean "scan the code,
// search a handle, write forty words, wait". So every state of the surface
// has an address, and the address is what the shell renders from.
//
// No routing library: the host app matches location.pathname by hand
// (App.jsx parseRoute) and this build does the same, in forty lines, so the
// prototype adds nothing to the dependency tree it is being judged from.

export const BASE = '/beta'

// Which sheet, if any, is raised over the wall. The wall itself never
// unmounts while one of these is up — that is what makes it a surface.
export const SHEETS = new Set(['letter', 'find', 'write'])

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === BASE || p === '') return { name: 'wall' }
  const rest = p.startsWith(BASE + '/') ? p.slice(BASE.length + 1) : ''
  const [head, id = ''] = rest.split('/')
  switch (head) {
    case 'letter': return { name: 'letter', id }   // a letter, raised over the wall
    case 'find':   return { name: 'find' }         // the search, raised over the wall
    case 'write':  return { name: 'write', id }    // the composer, raised over the wall
    case 'none':   return { name: 'none' }         // nobody wrote to you — the hinge
    case 'sealed': return { name: 'sealed' }       // the seal, and the wall taking it
    case 'blind':  return { name: 'blind' }        // the hand-off into the mutual blind
    case 'orbit':  return { name: 'orbit', id }    // the core service, standing
    default:       return { name: 'wall' }
  }
}

export function href(name, id) {
  if (name === 'wall') return BASE
  return id ? `${BASE}/${name}/${id}` : `${BASE}/${name}`
}

// Only ever called with a path this build produced. It refuses anything else
// rather than silently pushing a production URL into a history stack the
// prototype then tries to render.
export function isWallPath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '')
  return p === BASE || p.startsWith(BASE + '/')
}

// ── the front door moved ────────────────────────────────────────────────────
// The root of the site is the wall for everybody now (wall/campus.js), and
// the ping's own front door, the hero with its two sealed cards, stands at
// /ping: the page the wall's tab hands people to, and the one the foot of
// every page links to as the rest of the product.

function decode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/' || p === '/ping') return { name: 'hero' }

  const [rawHead, rawId = ''] = p.slice(1).split('/')
  const head = decode(rawHead)
  const id = decode(rawId)

  // The open door: /@handle, which is what a shared link looks like. It is the
  // same act as /place with a name already in it, so it resolves to one screen
  // rather than to a second copy of the flow.
  if (head.startsWith('@')) return { name: 'place', to: head.slice(1) }

  switch (head) {
    case 'place':  return { name: 'place', to: id }
    case 'sky':    return { name: 'sky' }
    case 'reveal': return { name: 'reveal', id }
    // Phase 8. Three addresses that arrive from outside the product: an opt out
    // somebody was pointed at, and two links out of a mail. All three used to
    // render in the old design.
    case 'optout': return { name: 'optout' }
    case 'copy':   return { name: 'copy' }
    case 'signin': return { name: 'signin' }
    default:       return null
  }
}

export function href(name, id) {
  if (name === 'hero') return '/ping'
  return id ? `/${name}/${id}` : `/${name}`
}

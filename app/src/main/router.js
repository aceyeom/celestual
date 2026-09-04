// ── Main's route table ──────────────────────────────────────────────────────
//
// Phase 6b. Main is the product the wall hands off into: a ping placed on
// somebody, standing for sixty days, revealed only if they place one back.
//
// It is mounted at `/` and it is a small table on purpose. The old landing at
// App.jsx has about twenty routes on it, most of which are a campaign, a
// sandbox or a competition, and none of which spec section 8 puts in scope.
// What is in scope is the hero, the flow that follows it, and the reveal, so
// those are what is here.
//
// No routing library. App.jsx matches location.pathname by hand and the wall
// does the same, so this does too and adds nothing to a dependency tree the
// rest of the product is judged from.
export const ROUTES = ['hero', 'place', 'sky', 'reveal', 'optout', 'copy', 'signin']

// The addresses Main does not draw. The wall's, the old printed address that
// rewrites onto it, the signature preview, the desk, and the three legal pages
// that a Vercel rewrite serves as static HTML before this bundle is reached.
// `paid` was on this list while the retired design still served the Stripe
// return; both went on 4 September, and anything not claimed by another shell
// draws the not found below.
export const NOT_OURS = new Set([
  'admin', 'privacy', 'terms', 'data-deletion', 'berkeley', 'beta', 'signature',
])

function decode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return { name: 'hero' }

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
  if (name === 'hero') return '/'
  return id ? `/${name}/${id}` : `/${name}`
}

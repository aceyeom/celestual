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

// Everything Main does NOT claim, and after Phase 8's routing pass the list is
// short and every entry on it is a decision rather than a deferral:
//
//   berkeley, beta   the wall's, and the old printed address that rewrites onto it
//   signature        where Phase 3 was approved. Static, and it stays
//   admin            the desk
//   paid             the Stripe return. Q3 keeps the billing layer out of scope,
//                    so this is the one address still served by App.jsx
//   privacy, terms, data-deletion   static HTML, served by a Vercel rewrite and
//                    never reaching this bundle at all
//
// /trial, /recruit, /r and the bare four letter matcher went with the campaign
// in Phase 7 (Q12). /c and /demo went in Phase 8 (Q15, Q16). None of them is
// claimed by anything now, so they fall through to the not found below.
export const NOT_OURS = new Set([
  'paid', 'admin', 'privacy', 'terms', 'data-deletion', 'berkeley', 'beta', 'signature',
])

// location.pathname is percent encoded. A link somebody's messaging app has
// escaped arrives as /%40john.doe or /place/john%2Edoe, and read raw the first
// is nobody's address and the second is a ping placed on "john2edoe" for sixty
// days. Decoded once, here; a malformed escape is left as it came.
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

// Whether Main owns this address at all. main.jsx asks before mounting.
//
// Phase 8 inverted the default. It used to answer `false` for anything not on
// the table, which fell through to App.jsx and rendered the retired design for
// every typo in the product. Main claims everything that is not somebody else's
// now, and an address matching nothing draws the not found IN THE SYSTEM the
// rest of the product is in.
export function isMainPath(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return true
  const head = decode(p.slice(1).split('/')[0])
  if (head.startsWith('@')) return true
  return !NOT_OURS.has(head)
}

export function href(name, id) {
  if (name === 'hero') return '/'
  return id ? `/${name}/${id}` : `/${name}`
}

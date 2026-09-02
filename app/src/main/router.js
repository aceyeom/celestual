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
export const ROUTES = ['hero', 'place', 'sky', 'reveal']

// Everything Main does NOT claim. App.jsx still owns these, in the old design,
// and Phase 6b does not touch them: /optout and /copy are kept, /signin waits
// on Phase 8's routing pass, and /trial, /recruit, /c, /demo and /paid are all
// pending an answer in docs/open-questions.md. A fork that swallowed them would
// be deleting features by routing rather than by decision.
export const NOT_OURS = new Set([
  'optout', 'copy', 'signin', 'trial', 'recruit', 'r', 'c', 'demo', 'paid',
  'admin', 'privacy', 'terms', 'data-deletion', 'berkeley', 'beta', 'signature',
])

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return { name: 'hero' }

  const [head, id = ''] = p.slice(1).split('/')

  // The open door: /@handle, which is what a shared link looks like. It is the
  // same act as /place with a name already in it, so it resolves to one screen
  // rather than to a second copy of the flow.
  if (head.startsWith('@')) return { name: 'place', to: head.slice(1) }

  switch (head) {
    case 'place':  return { name: 'place', to: id }
    case 'sky':    return { name: 'sky' }
    case 'reveal': return { name: 'reveal', id }
    default:       return null
  }
}

// Whether Main owns this address at all. main.jsx asks before mounting, and a
// `false` falls through to App.jsx exactly as it did before Main existed.
export function isMainPath(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return true
  const head = p.slice(1).split('/')[0]
  if (head.startsWith('@')) return true
  if (NOT_OURS.has(head)) return false
  return ROUTES.includes(head)
}

export function href(name, id) {
  if (name === 'hero') return '/'
  return id ? `/${name}/${id}` : `/${name}`
}

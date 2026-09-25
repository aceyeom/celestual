// ── what is left on Main ────────────────────────────────────────────────────
// Three addresses that arrive from outside the product: an opt out somebody
// was pointed at, and two links out of a mail. The front door at /ping, the
// flow at /place and /@handle, the list at /sky and the mutual at /reveal
// are the wall's now (wall/router.js `movedRewrite`), rewritten before this
// shell is chosen, so none of them ever reaches it.

function decode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}

export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  const head = decode(p.slice(1).split('/')[0])
  switch (head) {
    case 'optout': return { name: 'optout' }
    case 'copy':   return { name: 'copy' }
    case 'signin': return { name: 'signin' }
    default:       return null
  }
}

export function href(name, id) {
  return id ? `/${name}/${id}` : `/${name}`
}

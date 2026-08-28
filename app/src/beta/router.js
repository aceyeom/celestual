// A router for ten screens, in sixty lines, with no dependency.
//
// The host app routes by reading window.location.pathname and matching it
// (App.jsx `parseRoute`), and adding React Router for the beta would put a
// routing library in a bundle that has never had one — for a flow whose entire
// route table is a prefix and at most one id. So: the same technique the app
// already uses, kept local to the beta.

export const BASE = '/beta'

// path → { name, id }
export function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (p === BASE || p === '') return { name: 'threshold' }
  const rest = p.startsWith(BASE + '/') ? p.slice(BASE.length + 1) : ''
  const [head, id = ''] = rest.split('/')
  switch (head) {
    case 'look':    return { name: 'look' }
    case 'letter':  return { name: 'letter', id }
    case 'nothing': return { name: 'nothing' }
    case 'write':   return { name: 'write' }
    case 'sealing': return { name: 'sealing' }
    case 'claim':   return { name: 'claim', id }
    case 'ask':     return { name: 'ask', id }
    case 'sky':     return { name: 'sky' }
    case 'app':     return { name: 'app' }
    default:        return { name: 'threshold' }
  }
}

export function href(name, id) {
  if (name === 'threshold') return BASE
  return id ? `${BASE}/${name}/${id}` : `${BASE}/${name}`
}

// Only ever called from inside the beta, and only with a beta path. It refuses
// anything else rather than silently pushing a production URL into a history
// stack the beta then tries to render.
export function isBetaPath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '')
  return p === BASE || p.startsWith(BASE + '/')
}

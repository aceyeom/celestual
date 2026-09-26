// alerts.js: the claimed @, and what its owner can do with it.
//
// docs/ONE-WALL.md is the contract. Instagram verification is ownership: the
// person who proved an @ can turn on an email for when somebody writes to it,
// take a letter about them down in one tap with a day's undo, and stop the
// emails from a link in any one of them. Every call those need is here and
// nowhere else.
//
// ── read defensively ────────────────────────────────────────────────────────
// These RPCs land with the backend that is being built beside this front end,
// and a tab can meet a database a migration behind it. So a function the
// database does not have answers `{ ok: false, error: 'missing' }` rather than
// the network word every other failure gets: the screens read that as "this
// is not here yet" and fall back quietly (Letter.jsx to the old, permanent
// removal behind a confirm, You.jsx to no alert switches at all). None of
// this throws.
import { supabase, hasSupabase } from './supabase.js'
import { sessionToken } from './identity.js'

const OFFLINE = { ok: false, error: 'offline' }
const FUNCTION = 'celestual-edu-verify'

// PostgREST answers a function it cannot find with PGRST202 and a 404. Both
// are checked, since which of the two a proxy passes on is not ours to pick.
function isMissing(error, status) {
  if (status === 404) return true
  const code = String(error?.code || '')
  return code === 'PGRST202' || code === '42883'
}

async function rpc(fn, args) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error, status } = await supabase.rpc(fn, args)
    if (error) return { ok: false, error: isMissing(error, status) ? 'missing' : 'network' }
    if (data && typeof data === 'object') return data
    return { ok: false, error: 'empty' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ── once per token ──────────────────────────────────────────────────────────
// The email links spend their token on load. React mounts a screen twice in
// development, and a second call with the same token is answered `used`, so
// every token call is made once per page and its answer shared.
const RUNS = new Map()
function once(key, run) {
  if (!RUNS.has(key)) RUNS.set(key, run())
  return RUNS.get(key)
}

// ── the letter, by the owner of its @ ───────────────────────────────────────
// Files no claim and shuts nothing else: only this letter comes down, and
// `wall_owner_restore` puts it back within a day.
export const ownerRemove = (letterId) =>
  rpc('wall_owner_remove', { p_token: sessionToken(), p_letter: String(letterId || '') })

export const ownerRestore = (letterId) =>
  rpc('wall_owner_restore', { p_token: sessionToken(), p_letter: String(letterId || '') })

// ── the letter, by the link in the email ────────────────────────────────────
// `/r#t=`. Errors: 'invalid', 'expired' (30 days) and 'used'.
export const removeByToken = (token) =>
  once(`r:${token}`, () => rpc('wall_remove_by_token', { p_token: String(token || '') }))

// Within a day of the removal. Not shared with `once`: an undo pressed twice
// is two presses, and the second is the server's to refuse.
export const restoreByToken = (token) =>
  rpc('wall_restore_by_token', { p_token: String(token || '') })

// ── the alerts ──────────────────────────────────────────────────────────────
// { ok, handle, claimed, email (masked), email_verified, wrote, mutual }
export const alertsGet = () => rpc('celestual_alerts_get', { p_token: sessionToken() })

// { ok } or errors 'claim' (the wrote alert needs a claimed @) and 'email'
// (there is no confirmed address to send to).
export const alertsSet = (wrote, mutual) =>
  rpc('celestual_alerts_set', { p_token: sessionToken(), p_wrote: !!wrote, p_mutual: !!mutual })

// `/alerts#off=`, the stop link in every alert.
export const alertsOffByToken = (token) =>
  once(`off:${token}`, () => rpc('celestual_alerts_off_by_token', { p_token: String(token || '') }))

// ── the address the alerts go to ────────────────────────────────────────────
// A magic link, confirmed on /verify (built beside this), for the purpose
// 'alerts'. The answer carries `request`, which `linkStatus` is asked about,
// and `match`, the two digits printed in the email so a person can tell their
// own request from somebody else's.
async function invoke(body) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, { body })
    if (error) {
      const status = error?.context?.status
      if (status === 404) return { ok: false, error: 'missing' }
      // A refusal comes back as a non 2xx with the function's own answer in
      // the body, and that answer is the word the screen needs.
      try {
        const said = error?.context && typeof error.context.json === 'function' ? await error.context.json() : null
        if (said && said.error) return { ok: false, error: String(said.error) }
      } catch { /* not JSON */ }
      return { ok: false, error: 'send' }
    }
    return data && typeof data === 'object' ? data : { ok: false, error: 'send' }
  } catch {
    return { ok: false, error: 'send' }
  }
}

export function sendAlertLink(email) {
  return invoke({
    action: 'link',
    email: String(email || '').trim().toLowerCase(),
    session: sessionToken(),
    purpose: 'alerts',
  })
}

// { ok, verified, purpose } for the session that asked, and nobody else.
export function linkStatus(request) {
  return invoke({ action: 'status', request: String(request || ''), session: sessionToken() })
}

// What a refusal from the link says, in words.
export function linkFault(error) {
  switch (error) {
    case 'email': return 'that does not look like an email address.'
    case 'rate': return 'that is a lot of links for one hour. try again later.'
    case 'taken': return 'that address belongs to another account.'
    case 'domain': return 'that address cannot be used here.'
    case 'missing': return 'email alerts are not ready yet. try again soon.'
    case 'offline': return 'there is no connection. try again in a moment.'
    default: return 'the email did not send. try again in a moment.'
  }
}

// A loose check before anything is sent: the server's is the real one.
export function looksLikeEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw || '').trim())
}

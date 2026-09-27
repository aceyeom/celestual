// replies-api.js: a letter's thread, on a server (migration 0068).
//
// ── what the server will and will not say ───────────────────────────────────
//   the thread     anybody, about any live letter (`wall_reply_thread`). Each
//                  reply carries `who`, a salted hash of the letter and its
//                  writer, and never the writer. What this device may do
//                  there, and why not, rides with it in `me`
//   a like         anybody, as a heart is (`wall_reply_like`)
//   a report       any device, once a reply (`wall_reply_report`), and taken
//                  back the same way
//   shut, away     the recipient alone (`wall_reply_thread_set`)
//   a reply        through celestual-wall-reply and nothing else: it reads
//                  the reply before the database is asked to keep it
//
// Every function answers `{ ok, ... }` and none of them throws, as api.js
// does. One more word than api.js has: `missing`, for a database or a deploy
// that does not have the replies yet, which the thread answers by not being
// drawn at all rather than by drawing a fault under every letter.
import { supabase, hasSupabase } from '../api/supabase.js'
import { sessionToken } from '../api/identity.js'

const OFFLINE = { ok: false, error: 'offline' }

async function call(fn, args) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) {
      // PostgREST's word for a function it does not have (the migration is
      // not applied here yet)
      if (error.code === 'PGRST202' || error.code === '42883') return { ok: false, error: 'missing' }
      return { ok: false, error: 'network' }
    }
    return data ?? { ok: false, error: 'empty' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// An edge function, and the word it answered with when it refused: a
// refusal can come back as a non 2xx with the function's own answer in its
// body, and that answer is the word the thread needs.
async function invoke(name, body) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (error) {
      const status = error?.context?.status
      if (status === 404) return { ok: false, error: 'missing' }
      try {
        const said = error?.context && typeof error.context.json === 'function' ? await error.context.json() : null
        if (said && said.error) return { ...said, ok: false, error: String(said.error) }
      } catch { /* not JSON */ }
      return { ok: false, error: 'network' }
    }
    return data && typeof data === 'object' ? data : { ok: false, error: 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export const readThread = (letter) =>
  call('wall_reply_thread', { p_token: sessionToken(), p_letter: String(letter || '') })

export const likeReply = (id, on) =>
  call('wall_reply_like', { p_token: sessionToken(), p_reply: String(id || ''), p_on: !!on })

export const reportReply = (id, on = true) =>
  call('wall_reply_report', { p_token: sessionToken(), p_reply: String(id || ''), p_on: !!on })

// 'open', 'locked' (shut: no new replies but theirs) or 'closed' (put away)
export const setThread = (letter, state) =>
  call('wall_reply_thread_set', { p_token: sessionToken(), p_letter: String(letter || ''), p_state: state })

// The reply. `nonce` is the draft's, kept across retries of the same words,
// so a send that timed out and was pressed again is one reply.
export const sendReply = ({ letter, body, nonce, accept = false }) =>
  invoke('celestual-wall-reply', {
    token: sessionToken(), letter: String(letter || ''), body: String(body || ''),
    nonce: String(nonce || ''), accept: !!accept,
  })

// The school address, by the magic link the composer uses (docs/ONE-WALL.md,
// celestual-edu-verify `link`), worded for a proof with nothing waiting on it
// (`draft: false`), since nothing is posted when it is tapped: the thread
// under the letter opens to this device. Any school: no campus is asked for.
export const sendSchoolLink = (email) =>
  invoke('celestual-edu-verify', {
    action: 'link', email: String(email || '').trim().toLowerCase(),
    session: sessionToken(), purpose: 'edu', draft: false,
  })

// Whether the link this device asked for has been tapped, wherever it was.
export const schoolLinkStatus = (request) =>
  invoke('celestual-edu-verify', { action: 'status', request: String(request || ''), session: sessionToken() })

// A nonce for a draft: the shape the function takes.
export function freshNonce() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
  } catch { /* an old browser */ }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

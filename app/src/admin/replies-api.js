// replies-api.js: the desk's half of the replies (migration 0068).
//
// Two calls through the celestual-admin edge function, with the password,
// as every desk call is (api/admin.js): the queue, and a decision on one
// reply. Kept beside the screen that reads them rather than added to
// api/admin.js, so the replies are one folder's worth of the desk.
import { supabase, hasSupabase } from '../api/supabase.js'

async function call(body) {
  if (!hasSupabase) return { ok: false, error: 'network' }
  try {
    const { data, error } = await supabase.functions.invoke('celestual-admin', { body })
    if (error || !data) return { ok: false, error: 'network' }
    return data
  } catch {
    return { ok: false, error: 'network' }
  }
}

// `status` is waiting (the held and the hidden, oldest first), held, hidden,
// live, removed, rejected, or all. Every row carries who wrote it.
export function deskReplies(password, { status = 'waiting', limit = 50, offset = 0 } = {}) {
  return call({ password, action: 'desk_replies', status, limit, offset })
}

// `live` puts a reply up, or back (and its reports stop counting); `removed`
// takes it down. The note is kept beside the decision.
export function deskReplySet(password, id, status, note = '') {
  return call({ password, action: 'desk_reply_set', id, status, note })
}

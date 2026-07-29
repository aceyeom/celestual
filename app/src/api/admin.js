// admin.js — the client half of the desk at celestual.us/admin.
//
// Every call carries the password; the celestual-admin edge function is the
// only place it is checked, against a server-held secret. Nothing about the
// desk lives in this bundle beyond the shape of the requests — a reader of
// this file learns the door exists, not how to open it.
import { supabase, hasSupabase } from './supabase.js'

const FUNCTION = 'celestual-admin'

export const adminEnabled = () => hasSupabase

async function call(body) {
  if (!hasSupabase) return { ok: false, error: 'network' }
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, { body })
    if (error || !data) return { ok: false, error: 'network' }
    return data
  } catch {
    return { ok: false, error: 'network' }
  }
}

// The whole desk in one object:
//   { ok, competitors:[…], users:[…], attempts:[…], counts:{…} }
//   { ok:false, error:'password'|'rate'|'server'|'network' }
export function adminOverview(password) {
  return call({ password, action: 'overview' })
}

// Erase one person entirely (they may come back).
export function adminDeleteUser(password, handle) {
  return call({ password, action: 'delete_user', handle })
}

// Erase + suppress: the @ can't be pinged and can't verify back in.
export function adminBanUser(password, handle) {
  return call({ password, action: 'ban_user', handle })
}

// Remove a trial competitor (their row + link counters), leaving any ordinary
// user data they hold untouched.
export function adminDeleteCompetitor(password, handle) {
  return call({ password, action: 'delete_competitor', handle })
}

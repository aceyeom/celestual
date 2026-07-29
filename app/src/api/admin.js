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

// Lift a suppression so the @ can verify again (0018). The cure for a mistaken
// "delete everything", a mistaken opt-out, or a ban worth reversing — erased
// pings stay erased, only the door reopens.
//   { ok:true, handle, lifted:bool }
export function adminUnbanUser(password, handle) {
  return call({ password, action: 'unban_user', handle })
}

// One @, the whole truth: suppressed? member? what its last verification
// attempts did (0018). Use this the moment someone says their codes are
// correct and nothing happens.
//   { ok:true, handle, suppressed, member, verifications:[…] }
export function adminHandleStatus(password, handle) {
  return call({ password, action: 'handle_status', handle })
}

// Drop a handle's unfinished verification rows (0019) — the cure for someone
// stuck behind their own stale codes.
export function adminClearPending(password, handle) {
  return call({ password, action: 'clear_pending', handle })
}

// Admit a handle by hand (0019). Stamped verified_via='manual' so the desk
// never mistakes our word for Meta's. Refused for a suppressed @ — lift the
// lockout first, deliberately.
export function adminVerifyUser(password, handle) {
  return call({ password, action: 'verify_user', handle })
}

// Remove a trial competitor (their row + link counters), leaving any ordinary
// user data they hold untouched.
export function adminDeleteCompetitor(password, handle) {
  return call({ password, action: 'delete_competitor', handle })
}

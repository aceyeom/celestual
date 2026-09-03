// admin.js: the client half of the desk at celestual.us/admin.
//
// Every call carries the password; the celestual-admin edge function is the
// only place it is checked, against a server-held secret. Nothing about the
// desk lives in this bundle beyond the shape of the requests, so a reader of
// this file learns the door exists, not how to open it.
//
// Two halves, because the product has two. Phase 4b layered celestual_users
// over the old identity layer and backfilled from it rather than replacing it,
// so both are live and the DM code flow still writes the old one.
//
//   the desk     0033. The rebuild's tables: the row, the resolution cache,
//                the moderation queue, the caps, the wall, the reports.
//   the legacy   0017 to 0020. The DM flow's own records, and the six handle
//                actions that operate on them.
import { supabase, hasSupabase } from './supabase.js'

const FUNCTION = 'celestual-admin'

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

// ── the desk (0033) ──────────────────────────────────────────────────────────

// Counts, rate limit status, merge conflicts, scan attribution, campuses.
// One call, and it is what the desk opens on.
export function deskOverview(password) {
  return call({ password, action: 'desk_overview' })
}

// The rows. `query` matches a handle, an edu address, a plain email or an id.
export function deskUsers(password, { query = '', limit = 50, offset = 0 } = {}) {
  return call({ password, action: 'desk_users', query, limit, offset })
}

// One person whole: the row, every merge either way, their letters with the
// bodies, and what they have claimed.
export function deskUser(password, id) {
  return call({ password, action: 'desk_user', id })
}

// The Apify resolution cache. Rows come back with `avatar`, which the edge
// function builds from the stored path and the public bucket.
export function deskProfiles(password, { query = '', limit = 50, offset = 0 } = {}) {
  return call({ password, action: 'desk_profiles', query, limit, offset })
}

// Force a re-resolve. It deletes the cached row, so the next lookup of that
// handle is an ordinary cache miss and takes the ordinary path. Spec section 5.
export function deskProfileForget(password, handle) {
  return call({ password, action: 'desk_profile_forget', handle })
}

// Wall submissions and the moderation queue, which are one table read two ways.
// `status` is one of pending, live, rejected, removed, or empty for all of them.
export function deskLetters(password, { status = '', query = '', limit = 50, offset = 0 } = {}) {
  return call({ password, action: 'desk_letters', status, query, limit, offset })
}

// A person's decision on one letter. Publishing from here is the deliberate
// escape from layer 3 of the screen: anything the classifier returns 'review'
// for sits at pending until somebody moves it.
export function deskLetterSet(password, id, status, note = '') {
  return call({ password, action: 'desk_letter_set', id, status, note })
}

// User-flagged content. The letter is already down when a report arrives, so
// this queue is asking whether it goes back up.
export function deskReports(password, { status = 'open', limit = 50, offset = 0 } = {}) {
  return call({ password, action: 'desk_reports', status, limit, offset })
}

// The action path spec section 10 asks for. Uphold and the letter stays down;
// dismiss and it goes back up. Every report on that letter closes with it.
export function deskReportResolve(password, id, uphold, note = '') {
  return call({ password, action: 'desk_report_resolve', id, uphold, note })
}

// Everybody who looked for a name and found nothing.
export function deskWaitlist(password, { limit = 100, offset = 0 } = {}) {
  return call({ password, action: 'desk_waitlist', limit, offset })
}

// Close a merge that stopped to ask. It records that a person looked; it does
// not perform the merge, because 0030 refuses those two merges on purpose.
export function deskConflictResolve(password, id, note = '') {
  return call({ password, action: 'desk_conflict_resolve', id, note })
}

// ── the legacy layer (0017 to 0020) ──────────────────────────────────────────
// The DM code flow still writes celestual_members and
// celestual_ig_verifications, so these still do the job they did.

// { ok, users:[…], unverified:[…], growth:[…], logs:[…], counts:{…} }
// { ok:false, error:'password'|'rate'|'server'|'network' }
export function adminOverview(password) {
  return call({ password, action: 'overview' })
}

// Erase one person entirely (they may come back).
export function adminDeleteUser(password, handle) {
  return call({ password, action: 'delete_user', handle })
}

// Erase and ban: the @ cannot be pinged and cannot verify back in. This is the
// ONLY thing that refuses an identity. "Delete everything" in the account
// screen does not go through here and closes no doors (migration 0020).
export function adminBanUser(password, handle) {
  return call({ password, action: 'ban_user', handle })
}

// Lift whatever is on this @ (0018), ban or opt-out alike. Since 0020 only a
// ban blocks verifying, so this is for reversing a ban or honouring a changed
// mind about an opt-out. Erased pings stay erased; only the door reopens.
export function adminUnbanUser(password, handle) {
  return call({ password, action: 'unban_user', handle })
}

// One @, the whole truth: suppressed? member? what its last verification
// attempts did (0018). Use this the moment somebody says their codes are
// correct and nothing happens.
export function adminHandleStatus(password, handle) {
  return call({ password, action: 'handle_status', handle })
}

// Drop a handle's unfinished verification rows (0019), the cure for somebody
// stuck behind their own stale codes.
export function adminClearPending(password, handle) {
  return call({ password, action: 'clear_pending', handle })
}

// Admit a handle by hand (0019). Stamped verified_via='manual' so the desk
// never mistakes our word for Meta's. Refused for a suppressed @: lift the
// lockout first, deliberately.
//
// This writes the OLD layer only. celestual_users.handle_verified_at has one
// writer, celestual_user_bind_handle, and it demands a live DM proof
// (spec section 4). Nothing on this screen can set it.
export function adminVerifyUser(password, handle) {
  return call({ password, action: 'verify_user', handle })
}

// The Supabase adapter. Written, typed against the same contract, wired — and
// off, behind VITE_BETA_DATA_SOURCE. It is here now rather than later because
// an interface only proves it is the right interface once a second thing
// implements it; writing this file is what established that no screen needs a
// server-shaped call it cannot make.
//
// ── the one rule this file exists to enforce ────────────────────────────────
// The client NEVER queries beta_letters. It queries beta_letters_public, a view
// that does not have `author_handle` or `sealed_line` as columns at all — not
// filtered out, not nulled, absent — so no policy mistake, no forgotten
// `select`, and no clever query can produce them. Reveal and unlock happen in
// an Edge Function that returns the one field being unlocked and nothing else.
//
// If a `from('beta_letters')` ever appears below this line, that is the bug.

import { createClient } from '@supabase/supabase-js'
import { normHandle } from '../handles.js'
import { normSource } from './seed.js'

const URL = import.meta.env?.VITE_BETA_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL || ''
const KEY = import.meta.env?.VITE_BETA_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
const FN = 'celestual-beta'

export const hasSupabase = !!(URL && KEY)

const sb = hasSupabase ? createClient(URL, KEY, { auth: { persistSession: false } }) : null

const VIEW = 'beta_letters_public'
const COLS = 'id, target_handle, body, campus, created_at, expires_at, has_seal'

function fromRow(r) {
  return {
    id: r.id,
    targetHandle: r.target_handle,
    body: r.body,
    hasSeal: !!r.has_seal,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }
}

// Every privileged operation is one Edge Function call. Not because it is
// tidier, but because each of these needs something the browser must not hold:
// the service key that writes a pending row, the classifier's API key, the
// ManyChat token that sends a DM, and the check that the handle asking to
// unlock a seal is the handle the letter was addressed to.
async function call(action, payload) {
  if (!sb) return { ok: false, error: 'unconfigured' }
  try {
    const { data, error } = await sb.functions.invoke(FN, { body: { action, ...payload } })
    if (error || !data) return { ok: false, error: 'network' }
    return data
  } catch {
    return { ok: false, error: 'network' }
  }
}

export const supabaseRepo = {
  async logScan(sourceCode) {
    if (!sb) return
    await sb.from('beta_scans').insert({ source_code: normSource(sourceCode) })
  },

  async findByHandle(handle) {
    if (!sb) return []
    const h = normHandle(handle)
    if (!h) return []
    const { data, error } = await sb.from(VIEW).select(COLS).eq('target_handle', h).order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(fromRow)
  },

  async getLetter(id) {
    if (!sb) return null
    const { data, error } = await sb.from(VIEW).select(COLS).eq('id', id).maybeSingle()
    if (error || !data) return null
    return fromRow(data)
  },

  // Goes in at status='pending' inside the function, is classified there, and
  // becomes 'live' only if it clears. The browser is never told which, because
  // the browser telling a writer "you were rejected by the classifier" is a
  // free oracle for finding out what the classifier lets through.
  async createLetter(input) {
    const out = await call('create_letter', {
      target_handle: normHandle(input.targetHandle),
      body: input.body,
      sealed_line: input.sealedLine || null,
      author_handle: normHandle(input.authorHandle),
      source_code: normSource(input.sourceCode),
    })
    if (!out.ok) return { id: '', status: 'rejected', reason: out.reason || out.error || 'rejected' }
    return { id: out.id, status: 'pending' }
  },

  async joinWaitlist(handle, sourceCode) {
    if (!sb) return
    await sb.from('beta_waitlist').upsert(
      { handle: normHandle(handle), source_code: normSource(sourceCode) },
      { onConflict: 'handle' },
    )
  },

  async startVerification(handle) {
    const out = await call('start_verification', { handle: normHandle(handle) })
    return { challengeId: out.ok ? out.challenge_id : '' }
  },

  async confirmVerification(challengeId, code) {
    const out = await call('confirm_verification', { challenge_id: challengeId, code: String(code || '') })
    return { ok: !!out.ok }
  },

  async claimLetter(letterId, handle) {
    await call('claim_letter', { letter_id: letterId, handle: normHandle(handle) })
  },

  async requestReveal(letterId) {
    await call('request_reveal', { letter_id: letterId })
    return { status: 'pending' }
  },

  // Returns the sealed line and nothing else, and only to a verified claimant
  // of that letter. The author's handle is not part of this response and is not
  // part of any response.
  async unlockSeal(letterId) {
    const out = await call('unlock_seal', { letter_id: letterId })
    return { sealedLine: out.ok ? out.sealed_line : '' }
  },

  async removeLetter(letterId, handle) {
    await call('remove_letter', { letter_id: letterId, handle: normHandle(handle) })
  },

  async liveCount() {
    if (!sb) return 0
    const { count } = await sb.from(VIEW).select('id', { count: 'exact', head: true })
    return count || 0
  },
}

// eduverify.js — school (.edu) email verification for community membership.
//
// Your ping only ever reaches people from your own community, so membership is
// real, not self-declared: to join a school you prove you're there by entering a
// one-time code we email to an address at that school's domain. One person, one
// community, one address.
//
// The flow:
//   1. send(email, slug)  → the celestual-edu-verify edge function checks the
//      address is at the school's domain, mints a 6-digit code, stores only its
//      SHA-256 hash, emails the code, and returns a random correlation `token`.
//   2. verify(token, code) → the same function checks the code against the stored
//      hash (never returning it) and, on a match, reports the email + slug back.
//
// The code is a SECRET here (unlike the IG DM code, which the user re-sends): it
// is emailed, never returned to the browser, and only its hash is stored. The
// sandbox never touches any of this — the sheet auto-confirms locally so the shape
// is fully playable with nothing sent.
import { supabase, hasSupabase } from './supabase.js'
import { emailMatchesSchool, isEduEmail } from '../communities.js'

const FUNCTION = 'celestual-edu-verify'

// On only when the flag is set AND a real backend exists. Otherwise the sheet uses
// a local accept (like the IG stub) so dev/preview stays fully testable.
export const eduVerifyEnabled = () =>
  import.meta.env.VITE_EDU_VERIFY_ENABLED === '1' && hasSupabase

// Client-side domain pre-check, so we never fire a send for an address that can't
// belong to the school (the server re-checks — this is only to fail fast + kindly).
export function localEmailCheck(email, slug) {
  if (!isEduEmail(email)) return { ok: false, error: 'email' }
  if (!emailMatchesSchool(email, slug)) return { ok: false, error: 'domain' }
  return { ok: true }
}

// Send a code to `email` for `slug`. Returns { token, expiresAt }. Throws an Error
// whose .code is one of 'domain' | 'email' | 'rate' | 'send' so the UI can localize.
export async function sendEduCode({ email, slug }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION, {
    body: { action: 'send', email: String(email).trim().toLowerCase(), slug },
  })
  if (error) {
    const e = new Error('send_failed')
    e.code = 'send'
    throw e
  }
  if (!data?.ok) {
    const e = new Error(data?.error || 'send_failed')
    e.code = data?.error || 'send'
    throw e
  }
  return { token: data.token, expiresAt: data.expires_at }
}

// Verify a code. Never throws — a transient failure reads as { ok:false, error }.
// On success returns { ok:true, email, slug }.
export async function verifyEduCode({ token, code }) {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, {
      body: { action: 'verify', token, code: String(code).replace(/\D/g, '') },
    })
    if (error) return { ok: false, error: 'send' }
    return data || { ok: false, error: 'code' }
  } catch {
    return { ok: false, error: 'send' }
  }
}

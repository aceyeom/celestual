// relogin.js — durable, DM-free recovery of a verified session (Fix B).
//
// A DM-verified session lives 30 days server-side, but its key — the browser's
// `proof` secret — dies with localStorage (Instagram's in-app browser, iOS ITP, a
// new device). This module trades the recurring DM for a one-time email magic
// link (see supabase/migrations/0013 and the celestual-relogin edge function):
//
//   1. bindRecovery(handle, proof, email) — at the ONE-TIME DM verification, bind
//      the handle to the email the user already gave. Only a live DM proof can
//      write it, so the trust chain holds.
//   2. requestSignInLink(handle) — "sign back in": email a magic link to the bound
//      address. Always resolves ok (the server never reveals whether the handle is
//      registered); the UI offers a DM fallback so nobody is stranded.
//   3. redeemSignInLink(token) — opening the link mints a FRESH proof client-side,
//      sends only its hash, and gets back the handle + a full 30-day session — no
//      DM. The raw proof never leaves the browser.
import { supabase, hasSupabase } from './supabase.js'
import { igVerifyEnabled, genProof, sha256Hex } from './igverify.js'

// Recovery rides the same backend + flag as Instagram verification.
export const reloginConfigured = () => igVerifyEnabled()

// Bind handle⇄email under the fresh DM proof. Best-effort — a failure just means
// no email recovery is available yet (the DM path still works). Never throws.
export async function bindRecovery({ handle, proof, email }) {
  if (!hasSupabase || !handle || !proof || !email) return { ok: false }
  try {
    const { data, error } = await supabase.rpc('celestual_bind_recovery', {
      p_handle: handle,
      p_proof: proof,
      p_email: String(email).trim().toLowerCase(),
    })
    if (error) return { ok: false }
    return data || { ok: false }
  } catch {
    return { ok: false }
  }
}

// Ask for a sign-in link to `handle`'s bound email. Resolves { ok:true } whether
// or not an email was actually sent (anti-enumeration) — so the UI shows the same
// "check your email" either way and always offers the DM fallback beneath it.
export async function requestSignInLink(handle) {
  if (!hasSupabase || !handle) return { ok: false }
  try {
    const { data, error } = await supabase.functions.invoke('celestual-relogin', {
      body: { action: 'request', handle: String(handle).trim() },
    })
    if (error) return { ok: false }
    return data || { ok: false }
  } catch {
    return { ok: false }
  }
}

// Redeem a magic-link token: mint a fresh proof here, send only its hash, and get
// back the handle it re-verified. On success returns { ok:true, handle, proof } —
// the caller stores the session and restores the pings. Never throws.
export async function redeemSignInLink(token) {
  if (!hasSupabase || !token) return { ok: false }
  try {
    const proof = genProof()
    const proofHash = await sha256Hex(proof)
    const { data, error } = await supabase.functions.invoke('celestual-relogin', {
      body: { action: 'redeem', token: String(token).trim(), proof_hash: proofHash },
    })
    if (error || !data?.ok || !data.handle) return { ok: false }
    return { ok: true, handle: data.handle, proof }
  } catch {
    return { ok: false }
  }
}

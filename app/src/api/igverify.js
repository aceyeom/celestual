// igverify.js — Instagram DM handle-ownership verification (no Facebook OAuth).
//
// The flow this drives (see docs/SETUP-IG-VERIFY.md and migration 0004):
//   1. start(handle) → the browser mints a random 256-bit `proof`, sends only its
//      SHA-256 hash to the server, and gets back a one-time 4-digit code.
//   2. The user copies the code and DMs it to our Instagram account (deep-linked
//      via ig.me). Meta's webhook tells our backend who really sent it; if that
//      account's username matches the claimed handle, the session flips verified.
//   3. poll(token, proofHash) → the browser watches for that flip.
//   4. The raw `proof` is the capability the browser then hands to celestual_submit
//      to prove ownership at seal time. It is a secret — treated like an auth token.
//
// Security note: the 4-digit code is only a correlation id, never a secret. See the
// migration header for why a guess is worthless. This module holds the real secret
// (`proof`) client-side and only ever transmits its hash until seal time.
import { supabase, hasSupabase } from './supabase.js'

// On when the flag is set AND a real Supabase backend is configured. Otherwise the
// app uses the local verified stub so dev/preview stays fully testable.
export const igVerifyEnabled = () => import.meta.env.VITE_IG_VERIFY_ENABLED === '1' && hasSupabase

// The Instagram account people DM the code to. Set VITE_IG_USERNAME to your handle
// (without the @). ig.me/m/<username> opens straight into a DM thread with it.
export const igUsername = () => (import.meta.env.VITE_IG_USERNAME || 'celestual').replace(/^@+/, '')
export const igDeepLink = () => `https://ig.me/m/${igUsername()}`

const subtle = () => (typeof crypto !== 'undefined' && crypto.subtle) || null

function toHex(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}

// A fresh 256-bit secret, hex-encoded. This is the bearer proof of ownership.
export function genProof() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return toHex(b)
}

// SHA-256 of a string → lowercase hex (matches Postgres digest(text,'sha256')).
export async function sha256Hex(str) {
  const buf = await subtle().digest('SHA-256', new TextEncoder().encode(str))
  return toHex(new Uint8Array(buf))
}

// Begin a verification for `handle`. Returns the code to show the user plus the
// proof secret/hash to keep for polling + sealing. Throws on a backend/rate error
// so the caller can surface it.
export async function startVerification(handle) {
  const proof = genProof()
  const proofHash = await sha256Hex(proof)
  const { data, error } = await supabase.rpc('celestual_start_ig_verification', {
    p_handle: handle,
    p_proof_hash: proofHash,
  })
  if (error) throw error
  if (!data?.ok) {
    const e = new Error(data?.error || 'start_failed')
    e.code = data?.error
    throw e
  }
  return { token: data.token, expiresAt: data.expires_at, proof, proofHash }
}

// Poll for the DM result. Returns 'pending' | 'verified' | 'expired' | 'none'.
// Never throws — a transient failure reads as 'pending' so the UI keeps watching.
export async function pollVerification(token, proofHash) {
  try {
    const { data, error } = await supabase.rpc('celestual_poll_ig_verification', {
      p_token: token,
      p_proof_hash: proofHash,
    })
    if (error) return 'pending'
    return data?.status || 'pending'
  } catch {
    return 'pending'
  }
}

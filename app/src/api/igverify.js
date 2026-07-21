// igverify.js — Instagram DM handle-ownership verification (no Facebook OAuth).
//
// The flow this drives (see docs/DEBUG-IG-WEBHOOK.md and migrations 0004/0012):
//   1. start(handle) → the browser mints a random 256-bit `proof`, sends only its
//      SHA-256 hash to the server (with the typed handle as a HINT), and gets back
//      a one-time 4-digit code.
//   2. The user copies the code and DMs it to our Instagram account (deep-linked
//      via ig.me). Meta's webhook tells our backend who REALLY sent it, and that
//      Meta-authenticated account IS the identity: whoever DMs a live code is
//      verified as that account (migration 0012 — the code is a pure correlation
//      id; there is no typed @ to "mismatch" against).
//   3. poll(token, proofHash) → the browser watches for the flip AND reads back
//      the adopted @, so it can adopt the real account the DM authenticated.
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
export const igUsername = () => (import.meta.env.VITE_IG_USERNAME || 'celestual.us').replace(/^@+/, '')
export const igDeepLink = () => `https://ig.me/m/${igUsername()}`

// Desktop web equivalent. ig.me is a MOBILE universal-link domain: on a logged-out
// desktop browser its redirect chain lands on a browser error page (chrome-error://
// chromewebdata/), and Instagram's recovery redirect to /accounts/login is then
// blocked by Chrome ("Unsafe attempt to load URL … from frame with URL chrome-error://
// …"). The canonical www.instagram.com/m/<user> URL avoids that: when logged out it
// redirects SAME-ORIGIN to the login page and, once signed in, opens the DM thread.
export const igWebLink = () => `https://www.instagram.com/m/${igUsername()}`

// The user doesn't DM the bare digits — they DM the code with a fixed prefix, e.g.
// "star-1283". That prefix is the routing marker your ManyChat automation keys on:
// its Condition only calls the backend ("the db ping") when the incoming DM contains
// "star-", so ordinary DMs never reach your function. Only the bare 4 digits are ever
// stored or polled server-side; the prefix is plumbing, not part of the secret.
export const CODE_PREFIX = 'star-'
export const dmCode = (token) => `${CODE_PREFIX}${token}`

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

// Poll for the DM result. Returns { status, handle }:
//   status: 'pending' | 'verified' | 'expired' | 'none'
//   handle: the adopted @ (the Meta-authenticated account that DM'd), present
//           only once status is 'verified' — the browser adopts it as identity.
// Never throws — a transient failure reads as 'pending' so the UI keeps watching.
export async function pollVerification(token, proofHash) {
  try {
    const { data, error } = await supabase.rpc('celestual_poll_ig_verification', {
      p_token: token,
      p_proof_hash: proofHash,
    })
    if (error) return { status: 'pending', handle: null }
    return { status: data?.status || 'pending', handle: data?.handle || null }
  } catch {
    return { status: 'pending', handle: null }
  }
}

// ── In-flight verification persistence ────────────────────────────────────
// Opening Instagram deep-links away from this tab — and on mobile that often
// RELOADS or replaces the celestual page (the in-app browser, or the OS evicting
// a backgrounded tab). The proof/code live in React memory, so without this they'd
// be lost on return: the overlay would mint a brand-new code, which the DM the user
// already sent can never match — verification silently never completes.
//
// So we stash the live record (handle + code + proof + hash + expiry) here. On
// return the overlay resumes THIS code and keeps polling; it's cleared the moment
// verification succeeds, expires, or the user cancels. The proof is the same class
// of secret already kept in localStorage for the verified session (see auth.js),
// and it self-expires with the ~24-hour code TTL (migration 0011), so this
// widens nothing.
const PENDING = 'celestual:igpending'

export function savePending(rec) {
  try {
    if (rec && rec.token && rec.proof) localStorage.setItem(PENDING, JSON.stringify(rec))
  } catch {
    /* ignore — private mode / quota */
  }
}

// Return the saved record only while it's still usable; prune it otherwise.
export function loadPending() {
  try {
    const r = JSON.parse(localStorage.getItem(PENDING))
    if (!r || !r.token || !r.proof || !r.proofHash) return null
    if (!r.expiresAt || Date.parse(r.expiresAt) <= Date.now()) {
      clearPending()
      return null
    }
    return r
  } catch {
    return null
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(PENDING)
  } catch {
    /* ignore */
  }
}

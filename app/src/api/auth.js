// auth.js — identity for CELESTUAL, via Instagram DM verification (NO Facebook OAuth).
//
// Product model: the flow never opens on a sign-in wall. People watch the intro,
// set up THEIR side (handle + optional email), and prove that handle is really
// theirs by sending a one-time code to our Instagram account as a DM. There is no
// Facebook/Instagram OAuth, no popup, no redirect — so the in-progress entry (held
// in memory, privacy model §4.3) is never at risk. The actual code/poll/secret
// machinery lives in ./igverify.js; this module just owns the resulting SESSION.
//
// A session is a small local record of "this browser proved it owns @handle":
//   { verified:true, handle, proof, provider:'instagram_dm', email, name }
// `proof` is the bearer secret celestual_submit checks at seal time — treat it like
// an auth token. When verification isn't wired yet (VITE_IG_VERIFY_ENABLED=0 or no
// Supabase) we fall back to a local stub so dev/preview stays fully testable.
import { igVerifyEnabled } from './igverify.js'

const STORE = 'celestual:auth'

// True when real Instagram verification is configured (vs. the local stub).
export { igVerifyEnabled as verifyConfigured }

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE))
    return s && s.verified ? s : null
  } catch {
    return null
  }
}

function persist(session) {
  try {
    localStorage.setItem(STORE, JSON.stringify(session))
  } catch {
    /* ignore — private mode / quota */
  }
}

// Record a successful Instagram DM verification of `handle`. `proof` is the secret
// the browser will hand to celestual_submit to prove ownership at seal time.
export function markVerified(handle, proof) {
  const session = { verified: true, provider: 'instagram_dm', handle: handle || '', proof: proof || null, email: '', name: '' }
  persist(session)
  return session
}

// Local verified stub — used only when real verification isn't configured, so the
// flow stays testable. It carries no proof (the server-side gate is off in that
// mode) and no handle (the typed @ already stands).
export function signInStub() {
  const stub = { verified: true, provider: 'stub', handle: '', proof: null, email: '', name: '' }
  persist(stub)
  return stub
}

export function signOut() {
  try {
    localStorage.removeItem(STORE)
  } catch {
    /* ignore */
  }
}

// Restore any session saved on this device (no network — there's no OAuth to
// resume). Kept async for call-site compatibility.
export async function resumeSession() {
  return getSession()
}

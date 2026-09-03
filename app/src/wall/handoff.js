// handoff.js: the one place the wall asks who somebody is.
//
// Two different questions, and the wall is careful about which is which,
// because conflating them is the mistake spec section 4 exists to prevent.
//
//   THE CAMPUS   a berkeley.edu address, proved by a code in the inbox. It says
//                you are from the campus this wall is about. It opens the
//                letters. It says nothing whatever about whether any particular
//                handle is yours.
//   THE HANDLE   an Instagram DM code, proved by the account that sends it. It
//                says @sofiaaa.reyes is you. It is the only thing in this
//                product that says so, and it is the only thing that may take a
//                name off the wall.
//
// Resolving a handle through Apify is a third thing and it proves nothing. It
// looks up a public profile so a card can be drawn. Nothing on that path
// reaches either function here.
//
// ── what changed in Phase 6b ────────────────────────────────────────────────
// Both of these used to be a timer. `auth.js` said so on the glass: "Nothing is
// sent and no code is checked", and the takedown screen printed "Instagram is
// not connected yet. Any handle proves here." Both are real now, and both notes
// have come off the screens that carried them.
import {
  igVerifyEnabled, igDeepLink, igWebLink, dmCode,
  startVerification, pollVerification,
} from '../api/igverify.js'
import { sendEduCode, verifyEduCode, eduVerifyEnabled } from '../api/eduverify.js'
import { sessionToken } from '../api/identity.js'
import { verifyHandle, signIn, DOMAIN } from './auth.js'

// The school this wall is about, as celestual-edu-verify knows it. One campus
// today; wall_campuses is what makes a second one a row rather than a rewrite.
export const CAMPUS_SLUG = 'uc-berkeley'

export { igDeepLink, igWebLink, dmCode, igVerifyEnabled, eduVerifyEnabled, DOMAIN }

// ── the campus ──────────────────────────────────────────────────────────────
// Mint a code and mail it. Returns { ok, token } or { ok:false, error }, where
// error is one of 'domain' | 'email' | 'rate' | 'send' and the screen puts
// words to it.
export async function sendCampusCode(email) {
  try {
    const out = await sendEduCode({ email, slug: CAMPUS_SLUG })
    return { ok: true, token: out.token, expiresAt: out.expiresAt }
  } catch (e) {
    return { ok: false, error: e?.code || 'send' }
  }
}

// Check the code. On a match the edge function also binds the address to this
// browser's identity row, which is what makes the campus survive the tab, so
// the session token rides along.
//
// The address it signs in with is the one the SERVER just verified, not the one
// the field held, because those can differ by a typo the server forgave and the
// screen should show what was actually proved.
export async function checkCampusCode(token, code) {
  const out = await verifyEduCode({ token, code, session: sessionToken() })
  if (!out?.ok) return { ok: false, error: out?.error || 'code' }
  if (out.identity_error === 'conflict_edu') {
    // The identity row already carries a different verified campus. 0030 refuses
    // rather than picking, and has written the pair somewhere a person will see
    // it. The screen says so in a sentence rather than showing a slug.
    return { ok: false, error: 'other_campus' }
  }
  signIn(out.email)
  return { ok: true, email: out.email }
}

// ── the handle ──────────────────────────────────────────────────────────────
// Start a verification. The browser mints the proof, sends only its hash, and
// gets back a code to DM. The proof never leaves this tab until it is spent.
export async function startHandoff(handle) {
  if (!igVerifyEnabled()) return { ok: false, error: 'off' }
  try {
    // startVerification mints the proof itself and hands both halves back.
    const out = await startVerification(handle)
    if (!out?.token) return { ok: false, error: 'start' }
    return { ok: true, token: out.token, code: dmCode(out.token), proof: out.proof, proofHash: out.proofHash }
  } catch {
    return { ok: false, error: 'start' }
  }
}

// Watch for the flip. Meta tells the backend who actually sent the code, and
// that account is the identity: whoever DMs a live code is verified as that
// account, whatever they typed into the field first.
//
// On success the proof is spent once, here, against
// celestual_user_bind_handle, which is the only writer of handle_verified_at
// anywhere in the product.
export async function pollHandoff({ token, proofHash, proof }) {
  try {
    const out = await pollVerification(token, proofHash)
    if (out?.status === 'expired') return { ok: false, error: 'expired' }
    if (out?.status !== 'verified') return { ok: false, pending: true }
    // Whoever DMd the live code is the identity, whatever was typed into the
    // field first. Migration 0012: the code is a pure correlation id.
    const handle = out.handle || ''
    if (!handle) return { ok: false, error: 'nohandle' }
    const bound = await verifyHandle(handle, proof)
    if (!bound.ok) return { ok: false, error: bound.error }
    return { ok: true, handle }
  } catch {
    return { ok: false, pending: true }
  }
}

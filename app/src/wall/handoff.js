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
  igVerifyEnabled, igDeepLink, igWebLink, igUsername, dmCode,
  startVerification, pollVerification,
  savePending, loadPending, clearPending,
} from '../api/igverify.js'
import { sendEduCode, verifyEduCode, eduVerifyEnabled } from '../api/eduverify.js'
import { sessionToken } from '../api/identity.js'
import { verifyHandle, signIn, DOMAIN } from './auth.js'

// The school this wall is about, as celestual-edu-verify knows it. One campus
// today; wall_campuses is what makes a second one a row rather than a rewrite.
export const CAMPUS_SLUG = 'uc-berkeley'

export { igDeepLink, igWebLink, igUsername, dmCode, igVerifyEnabled, eduVerifyEnabled, DOMAIN }
export { savePending, loadPending, clearPending }

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
  // The address checked out and the session was NOT bound to it: the bind
  // failed, or the code was one already spent. Signing the device in on the
  // client anyway drew a member whose every read came back redacted and
  // whose every write answered 'gate', with nothing on the screen to explain.
  if (!out.signed_in) return { ok: false, error: 'identity' }
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
    // expiresAt rides along because the record is stashed in localStorage while
    // the person is away in Instagram, and a stash with no clock on it is a
    // stash that resumes a code that lapsed while they were gone.
    return {
      ok: true,
      token: out.token,
      code: dmCode(out.token),
      proof: out.proof,
      proofHash: out.proofHash,
      expiresAt: out.expiresAt,
    }
  } catch (e) {
    // The reason travels. startVerification throws with the RPC's own word on
    // it — 'banned' (that @ opted out, 0018), 'rate_limited', 'busy' — and
    // flattening all three to 'start' is what produced a screen that answered
    // "it did not go through" to a door that is shut for a nameable reason.
    return { ok: false, error: e?.code || 'start' }
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

// ── getting to the DM, and getting the code there with you ──────────────────
//
// Two things that were missing and that made this flow unusable, both of them
// about the same forty seconds: the walk from a code on our screen to a message
// box in somebody else's app.
//
// THE CODE TRAVELS. Instagram has no way to prefill the text of a DM — there is
// no ?text= on ig.me and there is no scheme that carries one — so the closest
// thing to "the code is already typed" is the code already being on the
// clipboard when the thread opens. Everything that opens Instagram from this
// product copies first and says so, and the code stays selectable on the glass
// for the browsers that refuse a programmatic copy.
export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(text))
      return true
    }
  } catch {
    /* a denied permission, or an insecure origin — fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = String(text)
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function inAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent || '')
}

function mobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

// AND THE RIGHT DOOR PER DEVICE. ig.me is a mobile universal link: on a phone it
// opens the celestual thread in the app, and on a logged-out desktop browser its
// redirect chain dead-ends on a browser error page. So the phone gets ig.me in
// the same tab (a new tab a universal link never returns from is a tab the
// person is left holding), and the desktop gets www.instagram.com/m/<us>, which
// is the same thread and which redirects same-origin to a login when it has to.
export function openInstagram() {
  if (inAppBrowser() || mobile()) {
    try { window.location.href = igDeepLink() } catch { /* ignore */ }
    return
  }
  const url = igWebLink()
  try {
    const aw = window.screen?.availWidth || 1280
    const ah = window.screen?.availHeight || 800
    const w = Math.min(720, Math.max(560, aw - 80))
    const h = Math.min(860, ah - 60)
    const baseX = window.screenLeft ?? window.screenX ?? 0
    const baseY = window.screenTop ?? window.screenY ?? 0
    const vw = window.innerWidth || w
    const vh = window.innerHeight || h
    const left = Math.max(0, baseX + (vw - w) / 2)
    const top = Math.max(0, baseY + (vh - h) / 2)
    const win = window.open(url, 'celestual-dm', `popup,noopener,width=${w},height=${h},left=${left},top=${top}`)
    if (!win) window.open(url, '_blank', 'noopener')
  } catch {
    try { window.location.href = url } catch { /* ignore */ }
  }
}

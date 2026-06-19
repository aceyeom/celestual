// auth.js — Instagram (Meta) sign-in for CELESTUAL.
//
// Product decision (revised): the flow no longer opens on a sign-in wall. People
// watch the intro, set up THEIR side (handle + optional email), choose who they
// can't stop thinking about, and only confirm it's really them — with Instagram —
// at the moment of sealing. The /demo route bypasses sign-in (and the paywall)
// entirely.
//
// Why sign-in happens at SEAL time, via a POPUP, not a full-page redirect: the ex
// handle is held in memory only and is never persisted (privacy model §4.3). A
// full-page OAuth redirect would discard that in-progress entry on return, so the
// real provider opens a popup and hands the session back to this tab — the page,
// and the entry, survive. If the popup is blocked we fall back to a redirect.
//
// Real wiring uses Supabase's Facebook OAuth provider (same Supabase project the
// app already talks to). To go live see SETUP-AUTH-AND-PAYMENTS.md. Until then
// `metaConfigured()` is false and we resolve a local verified stub so the flow is
// fully testable in dev/preview without a configured provider.
import { supabase, hasSupabase } from './supabase.js'

const STORE = 'celeste:auth'
export const metaConfigured = () => import.meta.env.VITE_META_ENABLED === '1' && hasSupabase

// The popup hands its OAuth result back to this exact URL; it must be on the
// project's Supabase "Redirect URLs" allow-list (see the setup guide).
const AUTH_CB_PARAM = 'auth'
const AUTH_CB_VALUE = 'cb'
const POPUP_MSG = 'celestual-auth'
const cbUrl = () =>
  `${window.location.origin}${window.location.pathname}?${AUTH_CB_PARAM}=${AUTH_CB_VALUE}`

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
    /* ignore */
  }
}

function sessionFromUser(u) {
  const meta = u.user_metadata || {}
  return {
    email: u.email || meta.email || '',
    name: meta.full_name || meta.name || '',
    handle: meta.user_name || meta.preferred_username || '',
    verified: true,
    provider: 'facebook',
  }
}

export function signOut() {
  try {
    localStorage.removeItem(STORE)
  } catch {
    /* ignore */
  }
  if (metaConfigured()) supabase.auth.signOut().catch(() => {})
}

// Confirm it's really you, at seal time. Resolves to a session on success, or
// throws on cancel/failure so the caller can leave the entry untouched. The stub
// path resolves synchronously (no redirect, nothing lost); the real path opens a
// popup and waits for it to hand the session back.
export async function signInWithMeta() {
  if (!metaConfigured()) {
    // Local verified stub — proves "it's you" without a provider. We don't invent
    // a handle/email here; the typed handle and optional email already stand.
    const stub = { email: '', name: '', handle: '', verified: true, provider: 'stub' }
    persist(stub)
    return stub
  }
  return signInPopup()
}

// Popup OAuth that keeps this tab (and the in-progress entry) alive. The popup
// lands on cbUrl(), where the bootstrap (see isAuthCallback/handleAuthCallback)
// posts the tokens back here and closes itself; we adopt them with setSession().
async function signInPopup() {
  // Open the popup SYNCHRONOUSLY, while the click gesture is still live, so it
  // isn't blocked — then navigate it to the OAuth URL once we have it. (This must
  // be reached with no awaits between the user's click and here.)
  const popup = window.open('about:blank', 'celestual-auth', 'width=480,height=760,menubar=no,toolbar=no')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { skipBrowserRedirect: true, redirectTo: cbUrl(), scopes: 'public_profile,email' },
  })
  if (error || !data?.url) {
    try {
      popup && popup.close()
    } catch {
      /* ignore */
    }
    throw error || new Error('No OAuth URL returned')
  }
  if (!popup) {
    // Popup blocked — fall back to a full redirect. The entry can't survive that,
    // but a working sign-in beats a dead button; on return we land on the setup
    // step, signed in, ready to re-enter.
    window.location.href = data.url
    return null
  }
  popup.location.href = data.url

  return new Promise((resolve, reject) => {
    let done = false
    const settle = (fn, v) => {
      if (done) return
      done = true
      clearInterval(poll)
      window.removeEventListener('message', onMsg)
      try {
        if (!popup.closed) popup.close()
      } catch {
        /* ignore */
      }
      fn(v)
    }
    const adopt = async (tokens) => {
      try {
        if (tokens?.access_token) {
          await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          })
        }
        const { data: s } = await supabase.auth.getSession()
        const u = s?.session?.user
        if (u) {
          const session = sessionFromUser(u)
          persist(session)
          settle(resolve, session)
        }
      } catch (e) {
        settle(reject, e)
      }
    }
    const onMsg = (ev) => {
      if (ev.origin !== window.location.origin) return
      if (ev.data && ev.data.type === POPUP_MSG) adopt(ev.data.tokens)
    }
    window.addEventListener('message', onMsg)
    // Backstop: if the postMessage is missed, notice the popup closing and either
    // adopt a now-present session or treat it as a cancel.
    const poll = setInterval(async () => {
      if (popup.closed) {
        const { data: s } = await supabase.auth.getSession()
        if (s?.session?.user) adopt(null)
        else settle(reject, new Error('cancelled'))
      }
    }, 700)
  })
}

// Called once on load to capture a session that was established by a full-page
// redirect (the popup fallback path), so the app resumes signed in.
export async function resumeSession() {
  if (!metaConfigured()) return getSession()
  const { data } = await supabase.auth.getSession()
  const u = data?.session?.user
  if (u) {
    const session = sessionFromUser(u)
    persist(session)
    return session
  }
  return getSession()
}

// ── popup callback (runs in the popup window only) ─────────────────────────────
// True when this document was opened as the OAuth popup target.
export function isAuthCallback() {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.opener &&
      new URLSearchParams(window.location.search).get(AUTH_CB_PARAM) === AUTH_CB_VALUE
    )
  } catch {
    return false
  }
}

// In the popup: read the session Supabase parsed from the URL, hand its tokens to
// the opener, then close. Kept tiny so the popup never renders the whole app.
export async function handleAuthCallback() {
  try {
    const { data } = await supabase.auth.getSession()
    const s = data?.session
    window.opener.postMessage(
      { type: POPUP_MSG, tokens: s ? { access_token: s.access_token, refresh_token: s.refresh_token } : null },
      window.location.origin,
    )
  } catch {
    /* ignore — opener's poll backstop will resolve or cancel */
  } finally {
    window.close()
  }
}

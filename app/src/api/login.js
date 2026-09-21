// login.js: a google account, or a code mailed to any address.
//
// The two doors that are not the DM (api/igverify.js) and not the campus
// code (api/eduverify.js). Both run on Supabase Auth, which the rest of the
// product does not use and does not need to: the app's own session is the
// token identity.js mints (spec section 3), and what a login proves is bound
// to THAT row, once, by `celestual_user_bind_login` (migration 0057). The
// Supabase session that carried the proof is then let go. Nothing here makes
// Supabase Auth the product's identity; it is the courier for one fact.
//
// ── how a proof travels ─────────────────────────────────────────────────────
//   google   signInWithOAuth sends the browser to Google and back to the
//            address it was on, with a code in the query. The client below
//            exchanges the code on load (PKCE, so the code is worthless to
//            anybody who reads the address), and `finishLogin` finds the
//            session waiting.
//   email    signInWithOtp mails a six digit code, verifyOtp checks it, and
//            the session is in hand without leaving the page.
//   then     the client calls the bind RPC WITH the Supabase session's own
//            JWT as its authorization, so the function reads the provider,
//            the subject and the address off `auth.jwt()`: verified by the
//            platform, never typed, never trusted from the browser.
//
// ── why a second client ─────────────────────────────────────────────────────
// api/supabase.js is built with `persistSession: false`, since nothing on
// it holds a Supabase session. A login has to: the code Google sends back
// is exchanged with a verifier the browser put away before it left, and a
// client that keeps nothing has nothing to exchange it with. So this is its
// own client, under its own storage key, kept only as long as a login is in
// flight. It is created on first use, so a visitor who never signs in never
// pays for it.
import { createClient } from '@supabase/supabase-js'
import { hasSupabase } from './supabase.js'
import { sessionToken, shape } from './identity.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let client = null
export function loginClient() {
  if (!hasSupabase) return null
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'celestual.login',
      },
    })
  }
  return client
}

// Both doors need the project and nothing else: the Google provider and the
// mail are switched on in the project's dashboard (docs/GOOGLE-AUTH-SETUP.md).
export const loginEnabled = () => hasSupabase

function missingRpc(error) {
  return error?.code === 'PGRST202' || /could not find the function/i.test(String(error?.message || ''))
}

// ── google ──────────────────────────────────────────────────────────────────
// Leaves the page. `returnTo` is where Google sends the browser back, which
// is the gate that asked, so the sheet that started the login is the sheet
// that finishes it.
export async function startGoogle(returnTo) {
  const c = loginClient()
  if (!c) return { ok: false, error: 'offline' }
  try {
    const { error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + (returnTo || '/'),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) return { ok: false, error: 'start' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'start' }
  }
}

// ── email ───────────────────────────────────────────────────────────────────
// A six digit code, mailed. The project's magic link template has to carry
// the token for this to arrive as a code rather than as a link (the setup
// document says where). Errors are the slugs the gate puts words to.
export async function sendEmailCode(email) {
  const c = loginClient()
  if (!c) return { ok: false, error: 'offline' }
  const e = String(email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: 'email' }
  try {
    const { error } = await c.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } })
    if (error) {
      const msg = String(error.message || '')
      return { ok: false, error: /rate|too many|seconds/i.test(msg) ? 'rate' : 'send' }
    }
    return { ok: true, email: e }
  } catch {
    return { ok: false, error: 'send' }
  }
}

export async function checkEmailCode(email, code) {
  const c = loginClient()
  if (!c) return { ok: false, error: 'offline' }
  const e = String(email || '').trim().toLowerCase()
  const t = String(code || '').replace(/\D/g, '')
  if (t.length < 6) return { ok: false, error: 'code' }
  try {
    const { error } = await c.auth.verifyOtp({ email: e, token: t, type: 'email' })
    if (error) return { ok: false, error: /expired/i.test(String(error.message || '')) ? 'expired' : 'code' }
  } catch {
    return { ok: false, error: 'code' }
  }
  return bind()
}

// ── the bind ────────────────────────────────────────────────────────────────
// The Supabase session in hand is spent against the app's own row and then
// let go. The RPC is called on the login client so its authorization header
// is the session's JWT, which is the only thing the function trusts.
// the Supabase session this browser is holding, if any, once the client has
// finished reading the address it was opened on
async function held(c) {
  try { return (await c.auth.getSession()).data.session || null } catch { return null }
}

async function bind() {
  const c = loginClient()
  if (!c) return { ok: false, error: 'offline' }
  const session = await held(c)
  if (!session) return { ok: false, error: 'no_login' }
  const who = session.user || {}
  const provider = who.app_metadata?.provider || 'email'
  let out
  try {
    const { data, error } = await c.rpc('celestual_user_bind_login', { p_token: sessionToken() })
    if (error) out = { ok: false, error: missingRpc(error) ? 'no_identity_layer' : 'network' }
    else if (!data?.ok) out = { ok: false, error: data?.error || 'failed' }
    else out = { ok: true, user: shape(data.user), provider, email: who.email || null }
  } catch {
    out = { ok: false, error: 'network' }
  }
  // spent, whichever way it went: a Supabase session left in storage would
  // bind again on the next load, and the product's session is its own token
  try { await c.auth.signOut({ scope: 'local' }) } catch { /* already gone */ }
  return out
}

// ── the return ──────────────────────────────────────────────────────────────
// Called by the gate on mount. A browser that has just come back from Google
// has a session waiting once the code in the address has been exchanged;
// one that has not has nothing, and this answers null at once. The code is
// scrubbed out of the address either way, so a reload does not try to spend
// it twice.
export async function finishLogin() {
  const c = loginClient()
  if (!c) return null
  const session = await held(c)
  scrub()
  if (!session) return null
  return bind()
}

function scrub() {
  try {
    const u = new URL(window.location.href)
    let touched = false
    for (const k of ['code', 'error', 'error_description', 'error_code']) {
      if (u.searchParams.has(k)) { u.searchParams.delete(k); touched = true }
    }
    if (touched) window.history.replaceState(window.history.state, '', u.pathname + (u.search || '') + u.hash)
  } catch { /* nothing to scrub */ }
}

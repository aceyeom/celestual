// trial.js — the First Light trial's client half (migration 0017).
//
// The self-serve replacement for 0016's comment→DM→invite loop: a candidate
// registers on celestual.us/trial, proves an email (code sent by the
// celestual-trial edge function), signs the agreement in-app, and CHOOSES the
// four-letter code that becomes their root-level tracking link
// (celestual.us/<code>). Counting is unchanged from 0016 — visits and credited
// signups land against the code, and the account page reads its numbers
// through celestual_recruit_stats, gated on the same browser-held dashboard
// key (saveDash / loadDash in recruit.js).
import { supabase, hasSupabase } from './supabase.js'
import { genProof, sha256Hex } from './igverify.js'
import { saveDash } from './recruit.js'

const FUNCTION = 'celestual-trial'
const ACCOUNT = 'celestual:trial' // this device's competitor account (never the key — that's DASH)

export const trialEnabled = () => hasSupabase

// The four-letter namespace. Mirrors celestual_trial_code_ok server-side —
// this copy only fails fast and kindly; the server is the authority.
export const RESERVED_CODES = [
  'demo', 'copy', 'priv', 'term', 'data', 'sign', 'page', 'home', 'root', 'help',
  'info', 'mail', 'news', 'blog', 'docs', 'shop', 'apps', 'star', 'ping', 'test',
  // 'paid' is where Stripe sends someone back (migration 0021). A competitor
  // holding it would swallow every return from a payment page.
  'paid',
  // 'beta' is the star & card prototype (src/beta/), mounted in main.jsx before
  // App's router ever sees the path. A competitor holding it would be issued a
  // tracking link that never reaches the landing page.
  'beta',
]

export function normChoice(code) {
  return String(code || '').trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 4)
}

export function choiceProblem(code) {
  const c = normChoice(code)
  if (!/^[a-z]{4}$/.test(c)) return 'format'
  if (RESERVED_CODES.includes(c)) return 'reserved'
  return ''
}

export function trialLink(code) {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://celestual.us'
  return `${origin}/${normChoice(code)}`
}

async function call(body) {
  if (!hasSupabase) return { ok: false, error: 'network' }
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, { body })
    if (error || !data) return { ok: false, error: 'network' }
    return data
  } catch {
    return { ok: false, error: 'network' }
  }
}

// Send the 6-digit code to `email`. { ok, token, expires_at } | { ok:false, error }.
export function startEmail(email) {
  return call({ action: 'start', email: String(email || '').trim().toLowerCase() })
}

// Live availability for the code picker. { ok, available, reason }.
export function checkChoice(choice) {
  return call({ action: 'check', choice: normChoice(choice) })
}

// The signature: the verified email code plus the details. Mints this device's
// dashboard key exactly like 0016's signing did (only its hash goes up), and
// keeps it on success so the account page opens by itself from now on.
//   { ok:true, code, handle, existing? } | { ok:false, error }
export async function claimTrial({ token, code, name, handle, choice }) {
  const key = genProof()
  const res = await call({
    action: 'claim',
    token,
    code: String(code || '').replace(/\D/g, ''),
    name: String(name || '').trim(),
    handle,
    choice: normChoice(choice),
    dash_hash: await sha256Hex(key),
  })
  if (res?.ok && res.code) {
    saveDash({ code: res.code, key })
    saveTrialAccount({ code: res.code, handle: res.handle || '', name: String(name || '').trim() })
    return { ...res, key }
  }
  return res
}

// The way back in from any device: a fresh email code names the account, a
// fresh key is bound, the same code comes back.
//   { ok:true, code, handle, name } | { ok:false, error:'unknown'|… }
export async function loginTrial({ token, code }) {
  const key = genProof()
  const res = await call({
    action: 'login',
    token,
    code: String(code || '').replace(/\D/g, ''),
    dash_hash: await sha256Hex(key),
  })
  if (res?.ok && res.code) {
    saveDash({ code: res.code, key })
    saveTrialAccount({ code: res.code, handle: res.handle || '', name: res.name || '' })
    return { ...res, key }
  }
  return res
}

// ── this device's competitor account (labels only; the key lives in DASH) ────
export function saveTrialAccount(rec) {
  try {
    if (rec && rec.code) localStorage.setItem(ACCOUNT, JSON.stringify(rec))
  } catch {
    /* ignore */
  }
}

export function loadTrialAccount() {
  try {
    const r = JSON.parse(localStorage.getItem(ACCOUNT))
    return r && r.code ? r : null
  } catch {
    return null
  }
}

export function clearTrialAccount() {
  try {
    localStorage.removeItem(ACCOUNT)
  } catch {
    /* ignore */
  }
}

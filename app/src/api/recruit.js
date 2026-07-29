// recruit.js — the tracking-link half of the trial program (migration 0016).
//
// WHAT THIS IS NOW. 0016 shipped a comment→DM→invite loop: a reel went up,
// someone commented "celestual", ManyChat DMed them a signing link, they signed,
// and they got a tracking link. 0017 replaced that whole front door with the
// self-serve signup at /trial, and the invite half of this file (openInvite,
// signAgreement) plus the celestual-recruit edge function are gone.
//
// What survives is the part the trial links actually run on, unchanged: remember
// which link a visitor arrived through, count the visit, credit the signup when
// they verify, and read a competitor's numbers back for their account page.
//
// One secret lives in the browser here and is never sent in the clear: the DASH
// key, minted at signing time by the trial flow. Its hash goes up and binds the
// competitor's dashboard; the raw key stays on this device. Losing it costs the
// dashboard, not the code — logging back in with the same email re-binds it.
import { supabase, hasSupabase } from './supabase.js'
import { genProof, sha256Hex } from './igverify.js'

const REF = 'celestual:ref' //  the code a visitor arrived through
const DASH = 'celestual:dash' // this device's own recruit dashboard key

// ── the visitor side (celestual.us/r/<code>) ─────────────────────────────────

// Remember which link brought someone here, so the signup can be credited once
// they actually verify. Stored, not sent: attribution happens at verification.
export function rememberRef(code) {
  const c = normCode(code)
  if (!c) return ''
  try {
    localStorage.setItem(REF, c)
  } catch {
    /* private mode — attribution degrades to this session only */
  }
  return c
}

export function loadRef() {
  try {
    return normCode(localStorage.getItem(REF))
  } catch {
    return ''
  }
}

export function clearRef() {
  try {
    localStorage.removeItem(REF)
  } catch {
    /* ignore */
  }
}

export function normCode(code) {
  return String(code || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
}

// Count the open. One integer per code per day, server-side; nothing about the
// visitor is recorded. Best-effort — a failed count never blocks the page.
export async function countVisit(code) {
  const c = normCode(code)
  if (!hasSupabase || !c) return
  try {
    await supabase.rpc('celestual_recruit_visit', { p_code: c })
  } catch {
    /* ignore */
  }
}

// Credit the signup, once, at the moment the new person finishes verifying. The
// server only accepts a handle it has actually verified, so this cannot invent
// people. Clears the stored code either way: one arrival, one credit.
export async function attributeSignup(handle) {
  const code = loadRef()
  if (!code || !handle) return false
  clearRef()
  if (!hasSupabase) return false
  try {
    const { data } = await supabase.rpc('celestual_recruit_attribute', { p_code: code, p_handle: handle })
    return !!data?.ok
  } catch {
    return false
  }
}

// ── the recruit side (celestual.us/recruit) ──────────────────────────────────

// Their numbers: link opens, signups, and the last seven days for the sparkline.
export async function recruitStats({ code, key }) {
  const c = normCode(code)
  if (!hasSupabase || !c || !key) return { ok: false }
  try {
    const hash = await sha256Hex(key)
    const { data, error } = await supabase.rpc('celestual_recruit_stats', { p_code: c, p_dash_hash: hash })
    if (error || !data?.ok) return { ok: false }
    return data
  } catch {
    return { ok: false }
  }
}

// ── the dashboard key, kept on this device ───────────────────────────────────
export function saveDash(rec) {
  try {
    if (rec && rec.code && rec.key) localStorage.setItem(DASH, JSON.stringify(rec))
  } catch {
    /* ignore */
  }
}

export function loadDash() {
  try {
    const r = JSON.parse(localStorage.getItem(DASH))
    return r && r.code && r.key ? r : null
  } catch {
    return null
  }
}

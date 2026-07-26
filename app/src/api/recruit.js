// recruit.js — the recruitment program's client half (migration 0016).
//
// The loop: a reel goes up, someone comments "celestual", ManyChat DMs them a
// signing link (the celestual-recruit edge function), they sign, and they get a
// personal tracking link — celestual.us/r/<code> — whose visits and signups are
// counted against them.
//
// Two secrets live in the browser here, and neither is ever sent in the clear:
//
//   · the INVITE token, which arrives in the DM link's fragment. We hash it
//     before it touches the network, exactly like the DM proof.
//   · the DASH key, minted HERE at signing time. Its hash goes up and binds the
//     recruit's dashboard; the raw key stays on this device (and in the link we
//     hand them to keep). Losing it costs the dashboard, not the code — a fresh
//     comment re-issues one.
import { supabase, hasSupabase } from './supabase.js'
import { genProof, sha256Hex } from './igverify.js'

const REF = 'celestual:ref' //  the code a visitor arrived through
const DASH = 'celestual:dash' // this device's own recruit dashboard key

export const recruitEnabled = () => hasSupabase

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

export function recruitLink(code) {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://celestual.us'
  return `${origin}/r/${normCode(code)}`
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

// Open an invite from the DM link. Returns what the agreement page needs:
//   { ok:true, handle, status:'invited' }
//   { ok:true, handle, status:'signed', code }
//   { ok:false }
export async function openInvite(token) {
  if (!hasSupabase || !token) return { ok: false }
  try {
    const hash = await sha256Hex(String(token).trim())
    const { data, error } = await supabase.rpc('celestual_recruit_open', { p_invite_hash: hash })
    if (error || !data?.ok) return { ok: false }
    return data
  } catch {
    return { ok: false }
  }
}

// Sign it. Mints this device's dashboard key, sends only its hash, and gets the
// personal code back. On success the key is saved so the dashboard opens by
// itself on this device from now on.
export async function signAgreement({ token, name }) {
  if (!hasSupabase || !token) return { ok: false, error: 'invalid' }
  try {
    const dash = genProof()
    const [inviteHash, dashHash] = await Promise.all([sha256Hex(String(token).trim()), sha256Hex(dash)])
    const { data, error } = await supabase.rpc('celestual_recruit_sign', {
      p_invite_hash: inviteHash,
      p_name: String(name || '').trim(),
      p_dash_hash: dashHash,
    })
    if (error || !data?.ok) return { ok: false, error: data?.error || 'invalid' }
    saveDash({ code: data.code, key: dash })
    return { ok: true, code: data.code, handle: data.handle, key: dash }
  } catch {
    return { ok: false, error: 'invalid' }
  }
}

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

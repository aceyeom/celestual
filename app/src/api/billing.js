// ── the paid door, and nothing else ─────────────────────────────────────────
//
// The only client side money code. Production sells two things (migration
// 0021, woken by 0053; runbook docs/STRIPE-SETUP.md):
//
//   'slot'    an extra slot: one more standing ping, $2.99, once, repeatable
//             to a ceiling of ten. What a person reads is "extra slot".
//   'steady'  unlimited: no cap on standing pings, each held six months,
//             $12.99 a month. What a person reads is "unlimited".
//
// Everything else stays free: placing, matching, the reveal, renewing, letting
// one go, the opt out, erasure, verification, the wall. The door is drawn in
// two places only, both in front of somebody who already holds their cap: the
// letter, the moment a placement is refused for want of a slot, and one quiet
// line on the sky. "let one go" is always the primary control and the paid
// line sits under it.
//
// This module never sees a card. startCheckout takes a Stripe hosted URL and
// the browser goes there; the money lands on our side only as a webhook the
// browser cannot forge (supabase/functions/celestual-stripe-webhook). The @
// itself never reaches Stripe: the function sends an opaque purchase id.
//
// OFF BY DEFAULT, at the desk. `billing_enabled` is a row the desk writes
// (migration 0053) and the server reads: celestual_billing_status says whether
// the door is drawn, and celestual_billing_begin refuses with 'off' while it is
// shut, so the switch is real and not a courtesy of the client.
import { supabase, hasSupabase } from './supabase.js'
import { normHandle } from './celestual.js'

const FUNCTION = 'celestual-stripe'

// What the buyer reads. Stripe is what actually charges, and the two must
// match to the cent: change one, change the other, in the same commit.
export const SLOT_PRICE = '$2.99'
export const PLAN_PRICE = '$12.99'

const OFF = { ok: false, enabled: false, planOffered: false, standing: 0, cap: 2, freeCap: 2, extra: 0, plan: null, pingDays: 60 }

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

// What this handle holds and may buy. Proof gated on the server; without a
// live proof the answer is the free cap, with `enabled` still true or false
// so a screen can draw the right door for a signed out person. `cap` is null
// on a pass: no ceiling. Never throws, and any failure answers "off" so every
// reader can test `enabled` without a null check.
export async function fetchBilling({ handle, proof } = {}) {
  if (!hasSupabase || !normHandle(handle)) return OFF
  try {
    const { data, error } = await supabase.rpc('celestual_billing_status', {
      p_handle: normHandle(handle),
      p_proof: proof || null,
    })
    if (error || !data) return OFF
    return {
      ok: !!data.ok,
      enabled: !!data.enabled,
      planOffered: !!data.plan_offered,
      standing: Number(data.standing) || 0,
      cap: data.cap == null ? null : Number(data.cap),
      freeCap: Number(data.free_cap) || 2,
      extra: Number(data.extra) || 0,
      plan: data.plan || null,
      pingDays: Number(data.ping_days) || 60,
    }
  } catch {
    return OFF
  }
}

// Open a Checkout Session for `kind` and leave for Stripe's page. Resolves
// { ok:true, url } as the page is leaving, or { ok:false, error } with one of
// the server's stable slugs:
//   'off' | 'unverified' | 'suppressed' | 'rate' | 'at_cap' | 'has_plan'
//   | 'handle' | 'kind' | 'config' | 'stripe' | 'network'
export async function startCheckout({ handle, proof, kind = 'slot' } = {}) {
  if (!hasSupabase) return { ok: false, error: 'off' }
  if (!normHandle(handle)) return { ok: false, error: 'handle' }
  const out = await call({ action: 'checkout', handle: normHandle(handle), proof: proof || null, kind })
  if (!out?.ok || !out.url) return { ok: false, error: out?.error || 'stripe' }
  window.location.assign(String(out.url))
  return { ok: true, url: String(out.url) }
}

// The returning browser's own nudge, so a person who just paid does not stare
// at a stale meter while the webhook lands. Idempotent on the server: if the
// webhook already granted, this answers applied:false and changes nothing.
// Returns { ok, paid, applied, kind, cap } | { ok:false, error }.
export async function confirmCheckout(sessionId) {
  const s = String(sessionId || '')
  if (!hasSupabase || !/^cs_[A-Za-z0-9_]+$/.test(s)) return { ok: false, error: 'bad_input' }
  return call({ action: 'confirm', session_id: s })
}

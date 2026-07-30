// billing.js — the one paid door, and nothing else.
//
// Production sells exactly two things (docs/PRICING-REVENUE.md §3, migration
// 0021, runbook docs/STRIPE-SETUP.md):
//
//   'slot'   — one more standing ping, $2.99, once, repeatable
//   'steady' — ten standing pings, each held six months, $12.99 a month
//
// Everything else stays free forever: placing, matching, the reveal, renewing,
// letting one go, the opt-out, erasure, verification, communities. The paid door
// only ever appears on Screen 9, in front of someone who already holds their
// free two and is trying to hold one more, and it always sits beside the free
// one ("let one go"), never in front of it.
//
// This module never sees a card. startCheckout returns a Stripe-hosted URL and
// the browser goes there; the money lands on our side only as a webhook the
// browser cannot forge (supabase/functions/celestual-stripe-webhook). The @
// itself never reaches Stripe: the edge function sends an opaque purchase id.
//
// OFF BY DEFAULT. Without VITE_STRIPE_ENABLED=1 every call here returns a
// disabled result and Screen 9 keeps showing the single free door, exactly as it
// has since the repositioning. The sandbox is separate and always was: /demo
// previews the shape with an inert form (screens.jsx's SlotPaywall) and never
// calls any of this.
import { supabase, hasSupabase } from './supabase.js'
import { normHandle } from './celestual.js'

const FUNCTION = 'celestual-stripe'

// The whole production monetization surface, behind one flag. Both halves
// matter: the flag is the deliberate wake decision, hasSupabase means there is
// a backend to take the money.
export const billingEnabled = () => import.meta.env.VITE_STRIPE_ENABLED === '1' && hasSupabase

// The monthly plan is a second, separate decision (and a second Stripe price).
// With the slot door on and this off, Screen 9 offers the one-time slot only.
export const planOffered = () => billingEnabled() && import.meta.env.VITE_STRIPE_PLAN === '1'

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

// Open a Checkout Session for `kind`. Returns { ok:true, url } to redirect to,
// or { ok:false, error } with one of the server's stable slugs:
//   'unverified' | 'at_cap' | 'has_plan' | 'suppressed' | 'rate' | 'config'
//   | 'stripe' | 'network' | 'off'
export async function startCheckout({ handle, proof, kind = 'slot', demo } = {}) {
  if (demo) return { ok: false, error: 'off' } // the sandbox never reaches a processor
  if (!billingEnabled()) return { ok: false, error: 'off' }
  if (!normHandle(handle)) return { ok: false, error: 'handle' }
  return call({ action: 'checkout', handle: normHandle(handle), proof: proof || null, kind })
}

// The returning browser's own nudge, so a person who just paid doesn't stare at
// a stale meter while the webhook lands. Idempotent server-side: if the webhook
// already granted, this reports applied:false and changes nothing.
// Returns { ok, paid, applied, kind, cap } | { ok:false, error }.
export async function confirmCheckout(sessionId) {
  if (!billingEnabled() || !sessionId) return { ok: false, error: 'off' }
  return call({ action: 'confirm', session_id: sessionId })
}

// What this handle is owed: { ok, standing, cap, free_cap, extra, plan,
// plan_until, ping_days }. Proof-gated server-side; the unproven answer is the
// free cap, which is the truth for almost everyone. Never throws.
export async function fetchBilling({ handle, proof, demo } = {}) {
  if (demo || !hasSupabase || !normHandle(handle)) return null
  try {
    const { data, error } = await supabase.rpc('celestual_billing_status', {
      p_handle: normHandle(handle),
      p_proof: proof || null,
    })
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// What Stripe sent us home with. `s` is the Checkout Session id on success,
// `c` marks the person backing out of the payment page.
// Returns { session, cancelled }.
export function returnFromCheckout() {
  try {
    const q = new URLSearchParams(window.location.search || '')
    const s = q.get('s') || ''
    return { session: /^cs_[A-Za-z0-9_]+$/.test(s) ? s : '', cancelled: q.get('c') === '1' }
  } catch {
    return { session: '', cancelled: false }
  }
}

// Drop the session id from the address bar once it's been confirmed, so a
// reload (or a shared link) can't replay it and nothing lingers in history.
export function scrubReturnUrl() {
  try {
    window.history.replaceState(window.history.state, '', '/paid')
  } catch {
    /* history unavailable — harmless */
  }
}

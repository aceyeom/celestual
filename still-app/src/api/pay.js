// pay.js — the paywall for CELESTE.
//
// Product decision: the first star is free for everyone, forever. Sending any
// additional person into the sky requires a one-off payment. The /demo route is
// NEVER paywalled (see App: demo mode short-circuits canSeal).
//
// Providers: Stripe (international cards) + KakaoPay / TossPay (Korea). All run
// through a Supabase Edge Function (`still-checkout`) so secret keys stay
// server-side; the client only ever opens the returned hosted-checkout URL and
// trusts the server's entitlement read. To go live:
//   1. Deploy supabase/functions/still-checkout (creates a session per provider).
//   2. Set the provider secret keys in Supabase function env.
//   3. Set VITE_PAY_ENABLED=1 in Vercel.
// Until then `payConfigured()` is false: we keep the first star free and, rather
// than blocking testing, treat extra stars as unlocked locally (clearly a dev
// state) so the rest of the flow stays exercisable.
import { supabase, hasSupabase } from './supabase.js'

export const FREE_STARS = 1 // first one's on us
export const PRICE_LABEL = '$2.99'
export const payConfigured = () => import.meta.env.VITE_PAY_ENABLED === '1' && hasSupabase

const STORE = 'celeste:entitlement'

// How many paid stars this person has unlocked (beyond the free one). Persisted
// locally for UX; the server is always the source of truth at seal time.
export function getUnlocked() {
  try {
    return Number(JSON.parse(localStorage.getItem(STORE))?.unlocked || 0)
  } catch {
    return 0
  }
}
function setUnlocked(n) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ unlocked: n }))
  } catch {
    /* ignore */
  }
}
export function grantUnlocked(n = 1) {
  setUnlocked(getUnlocked() + n)
}

// Is the user allowed to seal star #index (0-based)? demo always true; first is
// free; beyond that needs an unlocked credit.
export function canSealIndex(index, { demo } = {}) {
  if (demo) return true
  if (index < FREE_STARS) return true
  return getUnlocked() >= index - FREE_STARS + 1
}

// Start hosted checkout for one extra star. provider: 'stripe' | 'kakao' | 'toss'.
export async function startCheckout(provider) {
  if (!payConfigured()) {
    // Dev/preview: no real billing wired — grant locally so the flow is testable.
    grantUnlocked(1)
    return { ok: true, dev: true }
  }
  const { data, error } = await supabase.functions.invoke('still-checkout', {
    body: { provider, return_url: window.location.origin + window.location.pathname },
  })
  if (error) throw error
  if (data?.url) {
    window.location.href = data.url // hosted checkout (Stripe/Kakao/Toss)
    return { ok: true }
  }
  throw new Error('No checkout URL returned')
}

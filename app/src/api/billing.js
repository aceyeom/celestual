// ── buying pings (docs/PINGS-BY-THE-WEEK.md, migration 0071) ────────────────
//
// The only money this product handles, and it never touches a card: the
// celestual-stripe edge function proves the @ with the same DM proof a ping
// needs, writes a pending purchase, and hands back a Stripe Checkout page,
// which the browser leaves for. Stripe sends the buyer back to /paid with the
// session, and `confirm` asks the function to read it and grant the pings
// once, the same grant the webhook makes (whichever lands first wins, and
// the other changes nothing).
//
// Stripe is told a purchase id and a quantity, never an @.
import { supabase, hasSupabase } from './supabase';

export const PING_CENTS = 299;
export const MAX_BUY = 10;

// cents, as a price is written: $2.99, $29.90
export function price(cents) {
  const n = Math.max(0, Math.round(Number(cents) || 0));
  return `$${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}

async function call(body) {
  if (!hasSupabase) return { ok: false, error: 'config' };
  try {
    const { data, error } = await supabase.functions.invoke('celestual-stripe', { body });
    if (error) return { ok: false, error: 'network' };
    return data || { ok: false, error: 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// A checkout for `quantity` pings, bought on `handle`. Answers { ok, url }
// to leave for, or { ok:false, error } where error is one of the function's
// slugs: 'unverified', 'suppressed', 'rate', 'quantity', 'config', 'stripe'.
export function checkout({ handle, proof, quantity }) {
  const n = Math.max(1, Math.min(MAX_BUY, Math.round(Number(quantity) || 1)));
  return call({ action: 'checkout', kind: 'pings', handle, proof, quantity: n });
}

// Back from Stripe: { ok, paid, applied, quantity, credits }.
export function confirm(sessionId) {
  return call({ action: 'confirm', session_id: String(sessionId || '') });
}

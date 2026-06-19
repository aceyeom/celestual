// CELESTUAL — the calls the whole product makes.
//
// submitEntry records a one-way "I still think about @them". Per the deferred-
// reveal safety model (docs/SECURITY.md §2.3) the server NEVER tells the
// caller whether it's mutual — it returns only { recorded: true }. The "yes" is
// delivered solely through the owner-controlled channel (the match email to the
// earlier entrant). This closes the live prober oracle. All matching/anonymity
// logic lives in the `celestual_submit` SECURITY DEFINER RPC (see
// supabase/migrations/0001_celestual.sql).
import { supabase, hasSupabase } from './supabase';

// Mirror of the server-side celestual_norm(): lowercase, drop a leading @, keep only
// IG-legal characters. Used purely for client-side validation + display.
export function normHandle(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '');
}

export function isValidHandle(h) {
  const n = normHandle(h);
  return n.length >= 1 && n.length <= 30;
}

// Record a one-way entry. Returns { recorded } and, when throttled/blocked, an
// `error` of 'rate_limited' | 'suppressed'. Never returns a match result.
export async function submitEntry({ me, ex, email }) {
  if (!hasSupabase) {
    // Offline demo: just acknowledge — there is no live reveal anymore.
    await new Promise((r) => setTimeout(r, 600));
    return { recorded: true };
  }

  const { data, error } = await supabase.rpc('celestual_submit', {
    p_from: me,
    p_to: ex,
    p_email: email ? email.trim() : null,
  });
  if (error) throw error;
  return data; // { recorded: boolean, error?: 'rate_limited' | 'suppressed' }
}

// Un-send a one-way entry you made (§4.6).
export async function withdrawEntry({ me, ex }) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { withdrawn: true };
  }
  const { data, error } = await supabase.rpc('celestual_withdraw', { p_from: me, p_to: ex });
  if (error) throw error;
  return data; // { withdrawn: boolean }
}

// ── @ SEARCH (Instagram-style typeahead) ──────────────────────────────────
// Pluggable adapter. The client can NEVER hold a scraper key, and suggesting
// from our own entered handles would leak who's been entered (privacy model) —
// so by default this returns nothing and manual entry + validation carries the
// flow. When a server-side provider is wired up (a Supabase Edge Function that
// proxies a vetted Instagram search source), set VITE_HANDLE_SEARCH=1 and this
// calls it. Swapping providers later is a change to that one edge function, not
// to the app. See supabase/functions/celestual-search/.
const SEARCH_ENABLED = import.meta.env.VITE_HANDLE_SEARCH === '1'

export async function searchHandles(query) {
  const q = normHandle(query)
  if (q.length < 2) return []
  if (!SEARCH_ENABLED || !hasSupabase) return [] // manual entry only until a provider is live
  try {
    const { data, error } = await supabase.functions.invoke('celestual-search', { body: { q } })
    if (error) return []
    // Expected shape: [{ handle, full_name, avatar, verified }]
    return Array.isArray(data?.results) ? data.results.slice(0, 8) : []
  } catch {
    return []
  }
}

// Public erasure / "never let me be entered" for a handle (§2.5).
export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle), erased: 0 };
  }
  const { data, error } = await supabase.rpc('celestual_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string, erased: number }
}

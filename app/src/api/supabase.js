// Supabase client for CELESTUAL. Configured from Vite env vars set in Vercel:
//   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  — the project's anon/public key
// CELESTUAL talks to Supabase only through the `celestual_*` SECURITY DEFINER
// RPCs; the browser never reads a table directly (docs/SECURITY.md §1).
// When the vars are absent (local dev with no cloud) the app runs on safe local
// fallbacks that simulate matching — see ./celestual.js.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && key);

// The ping model uses NO Supabase Auth session — identity is proven by an
// Instagram DM (api/igverify.js) and pings restore via celestual_my_pings, both
// gated by that proof. So the client needs no session persistence; every RPC is
// an anon call carrying the DM proof where ownership matters.
export const supabase = hasSupabase
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

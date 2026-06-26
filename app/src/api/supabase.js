// Supabase client for CELESTUAL. Configured from Vite env vars set in Vercel:
//   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  — the project's anon/public key
// CELESTUAL uses only the `celestual_*` tables/RPCs.
// When the vars are absent (local dev with no cloud) the app runs in a demo
// mode that simulates matching locally — see ./celestual.js.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && key);

// Identity is proven by an Instagram DM (api/igverify.js), which does NOT mint a
// Supabase Auth session — so today these auth options are dormant and the sky
// persists locally (api/profile.js). They're left ON so that if a real Supabase
// Auth session is ever introduced, it survives reloads (persistSession) with a
// live JWT for RLS access to the owner's own rows (autoRefreshToken).
export const supabase = hasSupabase
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'celestual:sb-auth',
      },
    })
  : null;

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

// persistSession is now ON: a signed-in user (Instagram/Meta via Supabase Auth)
// stays signed in across reloads, which is what lets their account + encrypted sky
// survive a refresh. autoRefreshToken keeps the JWT (and therefore RLS access to
// their own rows) alive in long sessions. The popup OAuth callback still hands its
// tokens back to the opener tab via setSession() — see api/auth.js.
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

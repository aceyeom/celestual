// Supabase client. Configured from Vite env vars set in Vercel:
//   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  — the project's anon/public key
// When the vars are absent (local dev with no cloud, SSR smoke test) the app
// runs in offline mode against the bundled src/data fallback.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && key);

export const supabase = hasSupabase
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

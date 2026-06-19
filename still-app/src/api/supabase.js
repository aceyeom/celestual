// Supabase client for CELESTE Configured from Vite env vars set in Vercel:
//   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY  — the project's anon/public key
// Same project as DOLBOMI; CELESTE only touches the `still_*` tables/RPCs.
// When the vars are absent (local dev with no cloud) the app runs in a demo
// mode that simulates matching locally — see ./still.js.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(url && key);

export const supabase = hasSupabase
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

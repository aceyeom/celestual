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
//
// Realtime is used for one thing, the wall's nudge (wall/api.js subscribeWall),
// and a socket that cannot be opened (a network that blocks it, a project
// with Realtime off) must cost nothing: after a few quick tries the client
// tries once a minute, since the wall re-reads its index on a clock anyway.
const backoff = (tries) => (tries > 5 ? 60_000 : [1000, 2000, 5000, 10000][tries - 1] || 10000);

export const supabase = hasSupabase
  ? createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { reconnectAfterMs: backoff },
    })
  : null;

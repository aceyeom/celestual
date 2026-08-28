// Which adapter the beta got. One variable, and no screen ever learns the
// answer — every screen imports `repo` and calls the contract in types.js.
//
//   VITE_BETA_DATA_SOURCE=mock      (default) — zero backend, seeded, walkable
//   VITE_BETA_DATA_SOURCE=supabase            — the live wall
//
// Supabase falls back to mock rather than to a broken screen if the project is
// not configured: a demo that renders an error because an env var is missing is
// a demo that fails in the one room where it mattered.

import { mockRepo } from './mock.js'
import { supabaseRepo, hasSupabase } from './supabase.js'

const want = String(import.meta.env?.VITE_BETA_DATA_SOURCE || 'mock').toLowerCase()

export const SOURCE = want === 'supabase' && hasSupabase ? 'supabase' : 'mock'

/** @type {import('./types.js').WallRepo} */
export const repo = SOURCE === 'supabase' ? supabaseRepo : mockRepo

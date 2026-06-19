import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Pure SPA build (deployed to Vercel). The backend is Supabase, reached
// directly from the browser via @supabase/supabase-js — no dev proxy needed.
export default defineConfig({
  plugins: [react()],
})

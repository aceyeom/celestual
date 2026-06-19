import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CELESTUAL — pure SPA build. Backend is Supabase, reached directly from the
// browser via @supabase/supabase-js. The root build (../package.json) outputs
// this app to ../dist (served at celestual.us/).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

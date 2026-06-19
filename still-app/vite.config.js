import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// STILL. — pure SPA build. Backend is Supabase, reached directly from the
// browser via @supabase/supabase-js. The root build (../package.json) outputs
// this app to ../dist (served at dolbomi.app/) and the archived dolbomi app to
// ../dist/dolbomi (served at dolbomi.app/dolbomi).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CELESTUAL: pure SPA build. Backend is Supabase, reached directly from the
// browser via @supabase/supabase-js. The root build (../package.json) outputs
// this app to ../dist (served at celestual.us/).
//
// The one exception to "reached directly" is /api/resolve. In production that
// path is a Vercel rewrite onto the celestual-resolve edge function, so the
// device cookie it sets is first party rather than a cookie on
// *.supabase.co that Safari and Chrome would drop (open question Q8). The dev
// proxy below is the same rewrite, so local dev exercises the same path the
// browser takes in production instead of a second code path that only works
// on a laptop.
// https://vite.dev/config/
const SUPABASE = process.env.VITE_SUPABASE_URL || ''

export default defineConfig({
  plugins: [react()],
  server: SUPABASE
    ? {
        proxy: {
          '/api/resolve': {
            target: `${SUPABASE}/functions/v1/celestual-resolve`,
            changeOrigin: true,
            rewrite: () => '',
          },
        },
      }
    : undefined,
})

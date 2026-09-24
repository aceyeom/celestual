import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CELESTUAL: pure SPA build. The backend is Supabase, reached directly from the
// browser via @supabase/supabase-js. The root build (../package.json) outputs
// this app to ../dist, served at celestual.us/.
//
// ── THE TWO PLACES PRODUCTION IS NOT A PURE SPA ──────────────────────────────
// Production has three rewrites in `vercel.json` and one function in `api/`,
// and a dev server that does not carry them is a dev server testing a
// different product. Both are mirrored below.
//
//   /api/resolve      in production, api/resolve.js: a Vercel function that
//                     forwards to the celestual-resolve edge function with the
//                     visitor's address and a shared secret, so the device
//                     cookie is first party (Q8) and the IP backstop counts
//                     the visitor rather than Vercel. In development it is a
//                     plain proxy straight to the function: no secret, so the
//                     function counts the address it sees, which is yours.
//
//   /terms, /privacy, /data-deletion
//                     onto static HTML in public/. Without this they fall
//                     through to the SPA's catch-all, which in development
//                     rendered the app for every legal address. Phase 8's
//                     screenshot pass is what found it: a shot of /data-deletion
//                     came back showing the landing page.
// https://vite.dev/config/
const SUPABASE = process.env.VITE_SUPABASE_URL || ''

// vercel.json's `rewrites`, as a dev middleware. Extensionless in, .html out,
// and nothing else changes: the file is served by Vite's own static handler.
const LEGAL = ['/terms', '/privacy', '/data-deletion']

function legalRewrites() {
  return {
    name: 'celestual-legal-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '').split('?')[0].replace(/\/+$/, '')
        if (LEGAL.includes(path)) req.url = `${path}.html`
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), legalRewrites()],
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

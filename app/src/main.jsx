import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'

// No OAuth popup/callback to intercept anymore — identity is proven with an
// Instagram DM code entirely in-tab (see api/igverify.js), so the app just boots.
//
// ── /beta ────────────────────────────────────────────────────────────────────
// The route forks HERE, before the app mounts, because the beta is not a theme:
// it is a different brand with its own palette, faces, geometry, motion,
// backdrop and screens (src/beta/, docs/BETA-BINDERY.md). Mounting it inside
// App.jsx would mean the production galaxy engine, the production stylesheet
// and the whole production state tree all booting first, behind a page that
// wants none of them.
//
// Everything under beta/ is loaded on demand, so production ships not one byte
// of it and never fetches the beta's three typefaces. The `beta` class on <html>
// is what beta.css scopes itself to, so neither stylesheet can reach the other.
const root = createRoot(document.getElementById('root'))

if (/^\/beta(\/|$)/.test(window.location.pathname)) {
  document.documentElement.classList.add('beta')
  import('./beta/App.jsx').then(({ default: BetaApp }) => {
    root.render(
      <StrictMode>
        <BetaApp />
      </StrictMode>,
    )
  })
} else {
  root.render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
}

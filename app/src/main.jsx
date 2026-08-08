import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'

// No OAuth popup/callback to intercept — identity is proven with an Instagram
// DM code entirely in-tab (see api/igverify.js), so the app just boots.
//
// ── /beta, and why there isn't one ───────────────────────────────────────────
// This file used to fork on `/beta` before mounting, because the beta was not a
// theme: it was a second brand with its own palette, faces, geometry, motion,
// backdrop and screens, deliberately sealed off from production so the two
// could be judged side by side.
//
// That judgement was made. The Bindery IS the product now — the tokens are in
// theme.js, the parts are in components/ui.jsx, the materials are in
// texture.js, and the chart's one-hue ramp is in galaxy.js. There is nothing
// left to fork to, one stylesheet governs the whole product, and the three
// faces are fetched in index.html for every route rather than injected on one.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

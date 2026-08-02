import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import BetaApp from './beta/index.jsx'
import { I18nProvider } from './i18n/index.js'

// No OAuth popup/callback to intercept anymore — identity is proven with an
// Instagram DM code entirely in-tab (see api/igverify.js), so the app just boots.
//
// /beta is the one exception, and it forks HERE rather than inside App's router
// on purpose: it is a parallel prototype of the star & card system
// (src/beta/), and mounting it beside the real app instead of inside it means
// there is no path by which it can touch production state, production screens
// or the ping model. App.jsx is not aware it exists. See src/beta/index.jsx.
const beta = /^\/beta\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>{beta ? <BetaApp /> : <App />}</I18nProvider>
  </StrictMode>,
)

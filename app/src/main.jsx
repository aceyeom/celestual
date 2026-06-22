import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'

// No OAuth popup/callback to intercept anymore — identity is proven with an
// Instagram DM code entirely in-tab (see api/igverify.js), so the app just boots.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'
import { isAuthCallback, handleAuthCallback } from './api/auth.js'

// If this document was opened as the Instagram OAuth popup, don't boot the app —
// hand the session back to the opener tab and close. Keeps the popup instant and
// the in-progress entry alive in the original tab.
if (isAuthCallback()) {
  handleAuthCallback()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
}

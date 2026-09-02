import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'
import { BASE, legacyRewrite } from './wall/router.js'

// No OAuth popup/callback to intercept — identity is proven with an Instagram
// DM code entirely in-tab (see api/igverify.js), so the app just boots.
//
// ── /berkeley, and why the fork is here ──────────────────────────────────────
// This file used to fork on `/beta` before mounting, because the beta was not a
// theme: it was a second brand with its own palette, faces, geometry, motion,
// backdrop and screens, deliberately sealed off from production so the two
// could be judged side by side.
//
// That judgement was made and the Bindery won — the tokens are in theme.js, the
// parts are in components/ui.jsx, the materials are in texture.js, and one
// stylesheet governs the whole product. What used to be behind that fork is
// production now, and the word "beta" no longer describes anything in this
// repository.
//
// The fork that is left is not a beta. It is THE WALL: the Berkeley campus
// surface, reached by scanning a QR code off a card or a flyer, plus the hand
// off into the mutual blind that the wall exists to fill. It lives at
// /berkeley because that is what it is — a campus, not a phase — and because
// the next campus should be a sibling address rather than a second rewrite of
// this file.
//
// It is a second brand for the same reason the first one was: a blue-black
// void, four different faces, a field of drifting points, and a cream card that
// is the only bright object in it. None of that belongs in the almanac, and the
// almanac's ground, grain and cursor do not belong in it.
//
// Production's path below is untouched and stays synchronous: the wall is a
// dynamic import, so its chunk — and the four Google faces it injects — never
// reach anybody who did not scan a piece of paper.
//
// ── the paper that is already out there ──────────────────────────────────────
// Cards and flyers carry /beta and cannot be redeployed. The old prefix is
// rewritten onto the new one here, in the history rather than through a
// navigation, so a scan of an old card lands on the wall with the right address
// in the bar and no visible redirect.
const here = (window.location.pathname || '/').replace(/\/+$/, '') || '/'
const moved = legacyRewrite(here)
if (moved) {
  window.history.replaceState(window.history.state, '', moved + window.location.search + window.location.hash)
}

const path = moved || here
const wallPath = path === BASE || path.startsWith(BASE + '/')

// ── /signature ───────────────────────────────────────────────────────────────
// The two signature surfaces from the rebuild's Phase 3: the Main hero and the
// mutual reveal. They fork here for the same reason the wall does, and the fork
// has to happen BEFORE App.jsx sees the path: App's route table ends with a
// bare four letter matcher for a competitor's tracking link, and any short word
// that is not on its reserved list is claimed by it.
//
// This is a preview address. The hero becomes `/` and the reveal becomes a
// state of the core service in Phase 6b, once there is something behind them.
const SIGNATURE = '/signature'
const sigPath = path === SIGNATURE || path.startsWith(SIGNATURE + '/')

const root = createRoot(document.getElementById('root'))

if (sigPath) {
  import('./signature/index.jsx').then(({ default: SignatureApp }) => {
    root.render(
      <StrictMode>
        <SignatureApp />
      </StrictMode>,
    )
  })
} else if (wallPath) {
  import('./wall/index.jsx').then(({ default: WallApp }) => {
    root.render(
      <StrictMode>
        <WallApp />
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

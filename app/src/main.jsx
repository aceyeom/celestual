import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.js'

// No OAuth popup/callback to intercept — identity is proven with an Instagram
// DM code entirely in-tab (see api/igverify.js), so the app just boots.
//
// ── /beta, and why there is one again ────────────────────────────────────────
// This file used to fork on `/beta` before mounting, because the beta was not a
// theme: it was a second brand with its own palette, faces, geometry, motion,
// backdrop and screens, deliberately sealed off from production so the two
// could be judged side by side.
//
// That judgement was made and the Bindery won — the tokens are in theme.js, the
// parts are in components/ui.jsx, the materials are in texture.js, and one
// stylesheet governs the whole product. What used to be behind this fork is
// production now.
//
// The address stayed reserved (api/trial.js RESERVED_CODES) for exactly this:
// "the day anything experimental wants that address again". THE WALL wants it.
// It is the event surface — a wall of unsent letters, reached by scanning a
// QR code off a card or a flyer — plus the hand-off into the mutual blind that
// the wall exists to fill. It is a VISUAL PROTOTYPE: it reaches no server, it
// keeps nothing outside the tab it is open in, and it is populated from a
// seeded corpus (src/wall/seed.js) so the whole flow can be walked cold.
//
// It is a second brand again for the same reason the first one was: a
// blue-black void, four different faces, a field of drifting points, and a
// cream card that is the only bright object in it. None of that belongs in the
// almanac, and the almanac's ground, grain and cursor do not belong in it.
//
// So the fork is back, and it is the ONLY change this build makes to anything
// that already existed. Everything else lives under src/wall/, nothing in the
// existing app imports from there, and this branch is the single line of
// contact between the two.
//
// Production's path below is untouched and stays synchronous: the wall is a
// dynamic import, so its chunk — and the four Google faces it injects — never
// reach anybody who did not scan a piece of paper.
const betaPath = /^\/beta(\/|$)/.test(`${(window.location.pathname || '/').replace(/\/+$/, '')}/`)

const root = createRoot(document.getElementById('root'))

if (betaPath) {
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

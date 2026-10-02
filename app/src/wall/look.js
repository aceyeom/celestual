// ── which look the account is in ────────────────────────────────────────────
//
// Two other ways the account could look, drawn beside the one it has for the
// owner to choose between (screens/You.jsx says what each is): `?profile=1`,
// the quiet one, and `?profile=2`, the lit one; `?profile=0` is the card as
// it was, and the default. Read once, as the page loads, since the address
// does not outlive the router, and kept for the browser's tab, so the card
// opened again from the bar keeps its look.
//
// Here and not in the account's own file because the bar reads it too: in
// either look a reveal waiting to be opened is a mark on the person's face
// in the bar (parts.jsx `TopBar`), and opening it is the account's to do.
const LOOK_KEY = 'celestual.you.look'
export const LOOK = (() => {
  if (typeof location === 'undefined') return 0
  const m = /[?&]profile=([012])\b/.exec(location.search)
  try {
    if (m) window.sessionStorage.setItem(LOOK_KEY, m[1])
    return Number(m ? m[1] : window.sessionStorage.getItem(LOOK_KEY)) || 0
  } catch { return m ? Number(m[1]) : 0 }
})()
export const LOOK_CLASS = LOOK ? ` is-v${LOOK}` : ''

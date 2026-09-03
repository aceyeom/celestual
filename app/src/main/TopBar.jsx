// The bar. One mark, and nothing else on it.
//
// ── the word came off ──
// It carried the mark AND "celestual" beside it, while the wall's bar
// (parts.jsx TopBar) carries the mark alone — so the same product signed its
// two halves two different ways, and a person crossing from the wall to Main
// saw the brand change shape on the way. The mark is the signature on both
// surfaces now. It is the same drawing from the same module the wall uses
// (art.jsx Ecliptic), rather than the private copy that used to live here: two
// hand-inlined SVGs of one logo are two things that can drift, and one of them
// had already drifted a pixel of size.
//
// The wall's bar is a nav — a search and an account sit on the right of it —
// because the wall is a surface somebody browses. Main is a flow: there is one
// thing to do on each screen, and the bar's whole job is the way back to the
// front door.
import { Ecliptic } from '../wall/art.jsx'

export default function TopBar({ go, right = null }) {
  return (
    <header className="sg-top mn-top">
      <button type="button" className="wl-brand mn-top-mark" onClick={() => go('hero')}
        aria-label="celestual, back to the front" title="the front">
        <Ecliptic size={26} className="wl-brand-mark" />
      </button>
      {right}
    </header>
  )
}

// The bar. The mark on the left, and you on the right, on every screen.
//
// The mark is the same drawing from the same module the wall uses (art.jsx
// Ecliptic), so the two bars cannot drift. The chip on the right is parts.jsx
// `Me`: the face and the handle once one is proved, and the way in before that.
// It used to be three things, a ghost capsule on the front door, an uppercased
// label on the sky and nothing at all on the flow screens, which is how the
// same person came to be signed three different ways in one product.
import { Ecliptic } from '../wall/art.jsx'
import { Me } from '../wall/parts.jsx'

export default function TopBar({ go, who = null, right = null }) {
  return (
    <header className="sg-top mn-top">
      <button type="button" className="wl-brand mn-top-mark" onClick={() => go('hero')}
        aria-label="celestual, back to the front" title="the front">
        <Ecliptic size={26} className="wl-brand-mark" />
      </button>
      {right !== null ? right : who ? <Me who={who} onClick={() => go('sky')} /> : null}
    </header>
  )
}

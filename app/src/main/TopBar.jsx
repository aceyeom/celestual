// The bar. The brand on the left, and you on the right, on every screen.
//
// The brand is parts.jsx `Brand`: the mark and the name, locked, the same
// object the front door's bar and the wall's bar carry, so the three bars
// cannot drift. The chip on the right is parts.jsx `Me`: the face and the
// handle once one is proved, and the way in before that. It used to be three
// things, a ghost capsule on the front door, an uppercased label on the sky
// and nothing at all on the flow screens, which is how the same person came
// to be signed three different ways in one product.
import { Brand, Me } from '../wall/parts.jsx'

export default function TopBar({ go, who = null, right = null }) {
  return (
    <header className="sg-top mn-top">
      <Brand onClick={() => go('hero')} className="mn-top-mark" label="celestual, back to the front" />
      {right !== null ? right : who ? <Me who={who} onClick={() => go('sky')} /> : null}
    </header>
  )
}

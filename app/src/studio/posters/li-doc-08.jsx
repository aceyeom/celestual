// ── the lesson deck, 08: the end ────────────────────────────────────────────
// The mutual's keepsake on a rose phone, held quiet: the mark gathered at
// the head of the glass and `it's mutual.` whole under it, the cursor out,
// since nothing more is being typed (parts/doc.jsx `heldKeep`). Under it
// the one line the deck was about, and the lockup and the address.

import { useEffect, useState } from 'react'
import { Phone, PixelStory, Light, Lockup, readyFilm, useHold, turnStyle } from '../kit.jsx'
import { Page, Title, heldKeep, W, H, M, row, HALF } from '../parts/doc.jsx'

const END_CELL = 3
const PW = 450
const PX = W / 2
const PT = row(2) + HALF

// The words are cut into the glass's cells from the phone's face, so the
// face has to be in before they are cut; on a busy machine the kit's own
// wait can give up first, so this one waits for the face itself too
function useKeep() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const face = document.fonts.load('400 40px "Jersey 10"', 'it’s mutual. Jules Ace').catch(() => null)
    Promise.all([face, readyFilm('Jules', 'Ace')]).then(() => setOk(true))
  }, [])
  useHold(ok)
  return ok
}

function Poster() {
  const ok = useKeep()
  const s = ok ? heldKeep('rose') : null
  return (
    <Page n={8} sign={false}>
      <Light x={PX} y={PT + 220} size={1200} tint="rose" strength={0.75} />
      {s ? (
        <Phone
          w={PW} mode="bare" seed="doc-end" tint="rose" className="is-story dc-keep" square
          top={{ stamp: '10/03/26' }} keys={{ l: { label: 'options' }, r: { label: 'share' } }}
          screenStyle={{ '--mu-turn': 1, ...turnStyle('night', 'rose') }}
          style={{ position: 'absolute', left: PX - PW / 2, top: PT }}
        >
          <PixelStory story={s} at={0} />
        </Phone>
      ) : null}
      <Title base={row(10)} style={{ textAlign: 'center', left: 0, width: W }}>nothing happens<br />unless it’s mutual.</Title>
      {/* the lockup under the line with half its height clear above it,
          and the address where the lockup stands on every other page */}
      <div className="dc-end" style={{ left: M, right: M, top: row(12) - 14 }}>
        <Lockup cell={END_CELL} />
      </div>
      <span className="dc-url" style={{ position: 'absolute', left: M, top: row(14) - 24 - 21 }}>celestual.us</span>
    </Page>
  )
}

export default { id: 'li-doc-08', w: W, h: H, title: 'nothing happens unless it’s mutual', format: 'linkedin document', order: 47, Poster }

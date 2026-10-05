// ── the lesson deck, 08: the end ────────────────────────────────────────────
// The mutual's own film on a rose phone, held after its last word: the mark
// gathered at the head of the glass and `it's mutual.` in its cells. Under
// it the one line the deck was about, and the lockup and the address.

import { useEffect, useState } from 'react'
import { Phone, PixelStory, Light, Lockup, filmOf, readyFilm, useHold, turnStyle } from '../kit.jsx'
import { Page, Title, W, H, U, M, row } from '../parts/doc.jsx'

const AT = 7770
const PW = 480
const PX = W / 2

function useFilm() {
  const [ok, setOk] = useState(false)
  useEffect(() => { readyFilm('Jules', 'Ace').then(() => setOk(true)) }, [])
  useHold(ok)
  return ok
}

function Poster() {
  const ok = useFilm()
  const s = ok ? filmOf('Jules', 'Ace') : null
  return (
    <Page n={8} head>
      <Light x={PX} y={row(5)} size={1300} tint="rose" strength={0.8} />
      {s ? (
        <Phone
          w={PW} mode="bare" seed="doc-end" tint="rose" className="is-story" square
          top={{ stamp: '10/03/26' }} keys={{ l: { label: 'options' }, r: { label: 'share' } }}
          screenStyle={{ '--mu-turn': 1, ...turnStyle('night', 'rose') }}
          style={{ position: 'absolute', left: PX - PW / 2, top: row(2) }}
        >
          <PixelStory story={s} at={AT} />
        </Phone>
      ) : null}
      <Title base={row(10) + 45} size={96} lh={0.9} style={{ textAlign: 'center' }}>nothing happens unless it’s mutual.</Title>
      <div className="dc-end" style={{ left: M, right: M, top: row(12) + 20 }}>
        <span className="dc-url">celestual.us</span>
      </div>
    </Page>
  )
}

export default { id: 'li-doc-08', w: W, h: H, title: 'nothing happens unless it’s mutual', format: 'linkedin document', order: 47, Poster }

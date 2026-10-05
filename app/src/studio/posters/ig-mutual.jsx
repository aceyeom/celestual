// ── it's mutual ─────────────────────────────────────────────────────────────
// The moment. The mutual's own film on a rose phone, held at a frame after
// its last word: the mark gathered at the head of the glass and alive, the
// glint going round its ring, `it's mutual.` in the glass's own cells and
// the cursor lit after it. Under it the two notes that made it, as the
// cafe's still had them, each in the phone's face and in english under it,
// signed the way a picture that names nobody signs them.

import { useEffect, useState } from 'react'
import { Phone, PixelStory, Light, filmOf, readyFilm, useHold, turnStyle } from '../kit.jsx'
import { ensureCjk } from '../../wall/type.js'
import { IgBoard, W, H, U, BASE, NIGHT, PAIR } from '../parts/ig.jsx'

// a frame of the film with the mark alive, its light up round the star,
// the glint on the near side of the ring and the cursor lit
const AT = 7770
const NOTES = [
  { from: 'from them', ko: '그때 나를 놓아줘서 고마웠어', en: 'thank you for letting me go back then.' },
  { from: 'from me', ko: '잘 봤어 항상 응원할게', en: 'i saw you on tv. i’ll be rooting for you.' },
]

// the phone, and the night it was told on its band, as the keepsake
// carries it
const PW = PAIR.w
const PY = PAIR.y
// the english under each note, in pixels
const EN = 24

function useReady() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const ko = NOTES.map((n) => n.ko).join('')
    Promise.all([
      readyFilm('Jules', 'Ace'),
      ensureCjk().then(() => document.fonts.load(`40px 'Celestual Pixel KO'`, ko)).catch(() => null),
    ]).then(() => setOk(true))
  }, [])
  useHold(ok)
  return ok
}

function Poster() {
  const ok = useReady()
  const s = ok ? filmOf('Jules', 'Ace') : null
  return (
    <IgBoard className="ig-mutual" vignette={0.7}>
      <Light x={W / 2} y={PY + 420} size={2200} tint="rose" strength={0.55} />
      <Light x={W / 2} y={PY + 360} size={1150} tint="rose" strength={0.9} />
      {/* and close round the glass, where its light is strongest */}
      <Light x={W / 2} y={PY + 330} size={860} colour="rgba(232, 150, 182, 0.3)" />
      {s ? (
        <Phone
          w={PW} mode="bare" seed="mutual" tint="rose" className="is-story" tilt={[1.6, -2.4, -0.9]}
          top={{ stamp: NIGHT }} keys={{ l: { label: 'options' }, r: { label: 'share' } }}
          screenStyle={{ '--mu-turn': 1, ...turnStyle('night', 'rose'), '--q-dust': 'none', '--q-scratch': 'none', '--q-streak-a': '0' }}
          style={{ position: 'absolute', left: (W - PW) / 2, top: PY }}
        >
          <PixelStory story={s} at={AT} />
        </Phone>
      ) : null}
      {/* the notes as a script sets two voices: whose, at the margin, and
          the words from the phone's left edge. The english of the second
          stands on the series' baseline: a line of 1.3 puts the box's foot
          0.415 of its size under it */}
      <div className="ig-notes" style={{ left: U, right: U, bottom: H - (BASE + 0.415 * EN), '--col': `${(W - PW) / 2 - U}px` }}>
        {NOTES.map((n) => (
          <figure key={n.from} className="ig-note">
            <figcaption>{n.from}</figcaption>
            <p className="ig-note-ko" lang="ko">{n.ko}</p>
            <p className="ig-note-en">{n.en}</p>
          </figure>
        ))}
      </div>
    </IgBoard>
  )
}

export default { id: 'ig-mutual', w: W, h: H, title: 'it’s mutual', format: 'instagram 4:5', order: 12, Poster }

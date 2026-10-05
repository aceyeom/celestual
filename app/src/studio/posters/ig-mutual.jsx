// ── it's mutual ─────────────────────────────────────────────────────────────
// The moment. The mutual's own film on a rose phone, held at a frame after
// its last word: the mark gathered at the head of the glass and alive, the
// glint going round its ring, `it's mutual.` in the glass's own cells and
// the cursor lit after it. The phone stands turned a little in the dark,
// a thing that is kept and has been handled, and its light lies on the
// floor in front of it. Under it the two notes that made it, as the cafe's
// still had them, side by side as two voices, each in the phone's face and
// in english under it, signed the way a picture that names nobody signs
// them.

import { useEffect, useMemo, useState } from 'react'
import { PixelStory, Light, filmOf, readyFilm, useHold, turnStyle } from '../kit.jsx'
import { ensureCjk } from '../../wall/type.js'
import { IgBoard, PairPhone, Spill, W, H, U, BASE, NIGHT, PAIR } from '../parts/ig.jsx'

// a frame of the film with the mark alive, its light up round the star,
// the glint on the near side of the ring and the cursor lit
const AT = 7770
// each note broken where its own sense breaks
const NOTES = [
  { from: 'from them', ko: '그때 나를 놓아줘서\n고마웠어', en: 'thank you for letting me\ngo back then.' },
  { from: 'from me', ko: '잘 봤어\n항상 응원할게', en: 'i saw you on tv.\ni’ll be rooting for you.' },
]
// the english under each note, in pixels, and its line
const EN = 30
const EN_LINE = 1.25

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

// The film as this picture tells it: the breath behind the mark taken down
// to `k` of itself, since at a poster's size a ring of light that wide is a
// wash over the pink, and the cells round the star a step hotter in its
// place, so the mark's light comes from its own cells
function quieter(s, k = 0.4) {
  return {
    ...s,
    frame: (t, e) => {
      const f = s.frame(t, e)
      const gl = f.glow ? [].concat(f.glow) : []
      if (!gl.length) return f
      const { x, y, r } = gl[0]
      const near = r * 0.62
      const cells = f.cells.map((c) => {
        if (Math.hypot(c[0] - x, c[1] - y) > near) return c
        const d = [...c]
        d[3] = Math.min(1, (c[3] || 0) + 1 / 16)
        return d
      })
      return { ...f, cells, glow: gl.map((g) => ({ ...g, a: g.a * k })), key: `${f.key}|q` }
    },
  }
}

function Poster() {
  const ok = useReady()
  const s = useMemo(() => (ok ? quieter(filmOf('Jules', 'Ace')) : null), [ok])
  // the foot of the phone, and the floor in front of it
  const foot = PAIR.y + PAIR.w * PAIR.ar
  return (
    <IgBoard className="ig-mutual" vignette={0.7}>
      <Light x={W / 2} y={PAIR.y + 380} size={2000} tint="rose" strength={0.5} />
      <Spill x={W / 2 + 14} y={foot + 34} w={720} h={124} colour="rgba(226, 132, 168, 0.36)" />
      {s ? (
        <PairPhone
          seed="mutual" tint="rose" light="rose" className="is-story" edge="rgba(244, 196, 214, 0.62)"
          top={{ stamp: NIGHT }} keys={{ l: { label: 'options' }, r: { label: 'share' } }}
          screenStyle={{ '--mu-turn': 1, ...turnStyle('night', 'rose'), '--q-streak-a': '0' }}
        >
          <PixelStory story={s} at={AT} />
        </PairPhone>
      ) : null}
      {/* the two notes, side by side, the last line of each on the series'
          baseline: a line of 1.25 puts the box's foot 0.39 of the size under
          it */}
      <div className="ig-notes" style={{ left: U, right: U, bottom: H - (BASE + (0.265 + (EN_LINE - 1) / 2) * EN) }}>
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

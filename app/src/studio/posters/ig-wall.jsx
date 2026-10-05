// ── the wall ────────────────────────────────────────────────────────────────
// The wall at night: all twelve colours, each a different letter to a
// different person, pasted up with plasters in a loose grid and each a
// little turned, the way the street posters went up. Seen along the wall,
// so it goes off into the dark: one letter lit brighter and in focus, and
// the rest falling away from it, softer and dimmer the further they are.

import { Phone, Light } from '../kit.jsx'
import { IgBoard, LitPlaster, WallSurface, Headline, rng, W, H } from '../parts/ig.jsx'

// the twelve, in the panel's own order, each to somebody
const LETTERS = [
  { tint: 'night', to: 'Leo', text: 'do you still sleep on the left side?' },
  { tint: 'white', to: 'Hana', text: 'you said we’d see the cherry blossoms next year. it’s next year.' },
  { tint: 'ice', to: 'Mateo', text: 'the alleyway behind the dumpling shop where u kissed me.' },
  { tint: 'teal', to: 'Priya', text: 'the library seat by the window is free on tuesdays. i check.' },
  { tint: 'green', to: 'Omar', text: 'my little alcoholic. the bartender at fifth ave asked about you.' },
  { tint: 'acid', to: 'Dani', text: 'you still have my hoodie. keep it. i just wanted you to know i know.' },
  { tint: 'violet-yellow', to: 'Wen', text: 'we never finished the show. i’m on episode six. i’m waiting.' },
  { tint: 'amber', to: 'Lucas', text: 'i made so many cupcakes. i can’t quite make them like you do.' },
  { tint: 'rose', to: 'Iris', text: 'i wonder if you still wear our ring. i do.' },
  { tint: 'lilac', to: 'Kai', text: 'your song came on at the laundromat and i let my clothes go round again.' },
  { tint: 'negative', to: 'Nadia', text: 'i walk the long way home now. it passes your building.' },
  { tint: 'xerox', to: 'Sofia', text: 'the pretzel guy asked why i came alone. i said he won’t see you anymore.' },
]
const DAYS = ['09/19/26', '09/21/26', '09/22/26', '09/24/26', '09/25/26', '09/26/26', '09/28/26', '09/29/26', '09/30/26', '10/01/26', '10/02/26', '10/04/26']

// where each goes on the wall, as [column, row]: a loose four by three,
// the colours scattered so no two neighbours are the same kind of light
const PLACE = [[2, 0], [2, 1], [1, 1], [3, 2], [1, 0], [0, 0], [1, 2], [3, 0], [0, 2], [3, 1], [2, 2], [0, 1]]
// the one lit brighter, and in focus
const FOCUS = 1

// the wall's own size, and the screens on it
const WW = 1600
const WH = 1180
const SW = 280
const PITCH_X = 372
const PITCH_Y = 376
const OX = 220
const OY = 210

function layout() {
  const r = rng('the wall')
  return LETTERS.map((l, i) => {
    const [c, row] = PLACE[i]
    return {
      ...l,
      i,
      day: DAYS[i],
      x: OX + c * PITCH_X + (r() - 0.5) * 44,
      y: OY + row * PITCH_Y + (r() - 0.5) * 40,
      rot: (r() - 0.5) * 7,
      tape: r() < 0.5 ? 'top' : r() < 0.6 ? 'both' : 'corners',
      tx: (r() < 0.5 ? -1 : 1) * (0.16 + r() * 0.14) * SW,
      bx: (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.2) * SW,
      tr: (r() - 0.5) * 24,
      br: (r() - 0.5) * 24,
    }
  })
}

function Letter({ l, focus }) {
  const h = SW * 1.16
  // how far from the one in focus, across the wall: the depth the lens
  // reads it at, and the distance its light has to fall
  const f = focus
  const dx = (l.x - f.x) / PITCH_X
  const dy = (l.y - f.y) / PITCH_Y
  const far = Math.hypot(dx, dy * 0.8)
  const on = l.i === f.i
  const blur = on ? 0 : Math.min(7, 1.6 + Math.abs(dx) * 2.4 + Math.abs(dy) * 0.8)
  const dim = on ? 1 : Math.max(0.12, 0.44 - far * 0.15)
  return (
    <div
      className={`ig-wall-letter${on ? ' is-on' : ''}`}
      style={{
        left: l.x - SW / 2, top: l.y - h / 2, width: SW, height: h,
        transform: `rotate(${l.rot.toFixed(2)}deg)`,
        filter: on ? 'none' : `blur(${blur.toFixed(2)}px) brightness(${dim.toFixed(3)})`,
      }}
    >
      <Phone w={SW} tint={l.tint} seed={`wall-${l.to}`} mode="letter" name={l.to} stamp={l.day} hearts={0} text={l.text} cursor={false} />
      {l.tape !== 'corners' ? <LitPlaster x={SW / 2 + l.tx} y={-6} len={76} rot={90 + l.tr} dark={0.3} from={0} /> : null}
      {l.tape === 'both' ? <LitPlaster x={SW / 2 + l.bx} y={h + 4} len={72} rot={90 + l.br} dark={0.36} from={180} /> : null}
      {l.tape === 'corners' ? (
        <>
          <LitPlaster x={12} y={10} len={76} rot={-44} dark={0.3} from={0} />
          <LitPlaster x={SW - 12} y={h - 8} len={76} rot={-42} dark={0.36} from={180} />
        </>
      ) : null}
    </div>
  )
}

function Poster() {
  const all = layout()
  const focus = all[FOCUS]
  const pool = `radial-gradient(40% 48% at ${(focus.x / WW) * 100}% ${(focus.y / WH) * 100}%, #000 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.14) 70%, transparent 100%)`
  return (
    <IgBoard className="ig-wall-board">
      <div className="ig-wall" style={{ left: -300, top: -120, width: WW, height: WH }}>
        <WallSurface w={WW} h={WH} tone="#DCE3EA" pool={pool} />
        <Light x={focus.x} y={focus.y} size={1500} tint={focus.tint} strength={1} />
        {all.map((l) => <Letter key={l.to} l={l} focus={focus} />)}
      </div>
      <Headline size={90}>every letter on the wall<br />is to somebody.</Headline>
    </IgBoard>
  )
}

export default { id: 'ig-wall', w: W, h: H, title: 'the wall', format: 'instagram 4:5', order: 11, Poster }

// ── the wall ────────────────────────────────────────────────────────────────
// The wall at night: all twelve colours, each a different letter to a
// different person, pasted up with plasters in a loose grid and each a
// little turned, the way the street posters went up. Seen along the wall,
// so it goes off into the dark: one letter lit brighter and in focus, the
// column nearer the lens running off the frame, and the rest falling away
// from it, softer and dimmer the further they are.

import { Phone, Light } from '../kit.jsx'
import { IgBoard, LitPlaster, WallSurface, Headline, rng, W } from '../parts/ig.jsx'

// the twelve, each to somebody
const LETTERS = {
  night: { to: 'Leo', text: 'do you still sleep on the left side?' },
  // the one in focus is set as its writer broke it, so the two halves end
  // on the same words
  white: { to: 'Hana', text: 'you said we’d see\nthe cherry blossoms\nnext year.\nit’s next year.' },
  ice: { to: 'Mateo', text: 'the alleyway behind the dumpling shop where u kissed me.' },
  teal: { to: 'Priya', text: 'the library seat by the window is free on tuesdays. i check.' },
  green: { to: 'Omar', text: 'my little alcoholic. the bartender at fifth ave asked about you.' },
  acid: { to: 'Dani', text: 'you still have my hoodie. keep it. i just wanted you to know i know.' },
  'violet-yellow': { to: 'Wen', text: 'we never finished the show. i’m on episode six. i’m waiting.' },
  amber: { to: 'Lucas', text: 'i made so many cupcakes. i can’t quite make them like you do.' },
  rose: { to: 'Iris', text: 'i wonder if you still wear our ring. i do.' },
  lilac: { to: 'Kai', text: 'your song came on at the laundromat and i let my clothes go round again.' },
  negative: { to: 'Nadia', text: 'i walk the long way home now. it passes your building.' },
  xerox: { to: 'Sofia', text: 'the pretzel guy asked why i came alone. i said he won’t see you anymore.' },
}

// the wall, column by column from the far end to the near one, three to a
// column from the top. The one in focus is white, and round it only the
// dark ones and the dim ones: the negative over it, the green and the teal
// beside and under it, and the paper (the xerox, the ice, the lilac) at the
// far end, where the light does not reach
const GRID = [
  ['xerox', 'ice', 'lilac'],
  ['acid', 'green', 'violet-yellow'],
  ['negative', 'white', 'teal'],
  ['rose', 'amber', 'night'],
]
const FOCUS = 'white'
// and its words at the size its longest line fills the glass at
const FOCUS_FS = 12.8
// the day each went up, the near end the newest
const DAYS = ['09/19/26', '09/21/26', '09/22/26', '09/24/26', '09/25/26', '09/26/26', '09/28/26', '09/29/26', '09/30/26', '10/01/26', '10/02/26', '10/04/26']

// the lens: how far it stands from the wall, and how far along the wall it
// looks. The letter in focus is where the wall is turned round, so it is
// drawn at its own size, the column nearer is larger and the far end small
const LENS = 1000
const TURN = -34
// the screens, and the grid they are pasted on, in the wall's own pixels
const SW = 336
const SH = SW * 1.16
const PITCH_X = 440
const PITCH_Y = 470
// where the one in focus is on the wall, and where it lands in the picture
const FX = 1400
const FY = 800
const AT = { x: 590, y: 392 }
const WW = 1960
const WH = 1600

function layout() {
  const r = rng('the wall')
  const out = []
  let n = 0
  GRID.forEach((col, c) => {
    col.forEach((tint, row) => {
      out.push({
        tint, ...LETTERS[tint], c, row, day: DAYS[n++],
        x: FX + (c - 2) * PITCH_X + (r() - 0.5) * 40,
        y: FY + (row - 1) * PITCH_Y + (r() - 0.5) * 36,
        rot: (r() - 0.5) * 6,
      })
    })
  })
  // the one in focus stands square on its place
  const f = out.find((l) => l.tint === FOCUS)
  f.x = FX
  f.y = FY
  f.rot = -1.2
  return out
}

// the plasters each letter went up with, in its own box: across a corner,
// or over the top edge. Only the letters the light reaches show theirs; on
// the far ones the dark has them
const TAPE = {
  white: [{ x: SW - 12, y: 10, rot: 40, len: 104 }, { x: -2, y: SH + 2, rot: 40, len: 104 }],
  green: [{ x: SW - 18, y: 8, rot: 44, len: 84 }],
  teal: [{ x: 22, y: 8, rot: -42, len: 84 }],
}

function Letter({ l, focus }) {
  // how far from the one in focus, along the wall and up it: the depth the
  // lens reads it at, and the distance its light has to fall
  const dx = (l.x - focus.x) / PITCH_X
  const dy = (l.y - focus.y) / PITCH_Y
  const far = Math.hypot(dx, dy * 0.8)
  const on = l.tint === focus.tint
  const blur = on ? 0 : Math.min(7.5, 1.6 + Math.abs(dx) * 2.4 + Math.abs(dy) * 2.6)
  const dim = on ? 1 : Math.max(0.09, 0.4 - far * 0.14)
  return (
    <div
      className={`ig-wall-letter${on ? ' is-on' : ''}`}
      style={{
        left: l.x - SW / 2, top: l.y - SH / 2, width: SW, height: SH,
        transform: `rotate(${l.rot.toFixed(2)}deg)`,
        filter: on ? 'none' : `blur(${blur.toFixed(2)}px) brightness(${dim.toFixed(3)})`,
        '--ig-wfs': on ? `${FOCUS_FS}cqw` : undefined,
      }}
    >
      <Phone w={SW} tint={l.tint} seed={`wall-${l.to}`} mode="letter" name={l.to} stamp={l.day} hearts={0} text={l.text} cursor={false} />
      {(TAPE[l.tint] || []).map((t, i) => (
        <LitPlaster key={i} x={t.x} y={t.y} len={t.len} rot={t.rot} dark={on ? 0.24 : 0.4} from={t.y < SH / 2 ? 0 : 180} />
      ))}
    </div>
  )
}

function Poster() {
  const all = layout()
  const focus = all.find((l) => l.tint === FOCUS)
  const pool = `radial-gradient(34% 46% at ${(FX / WW) * 100}% ${(FY / WH) * 100}%, #000 0%, rgba(0,0,0,0.5) 38%, rgba(0,0,0,0.12) 72%, transparent 100%)`
  return (
    <IgBoard className="ig-wall-board">
      {/* the wall goes into the dark a unit above the words */}
      <div className="ig-wall-view">
        <div
          className="ig-wall"
          style={{
            left: AT.x - FX, top: AT.y - FY, width: WW, height: WH,
            transformOrigin: `${FX}px ${FY}px`, transform: `perspective(${LENS}px) rotateY(${TURN}deg)`,
          }}
        >
          <WallSurface w={WW} h={WH} tone="#DCE3EA" pool={pool} />
          <Light x={FX} y={FY} size={1300} tint={FOCUS} strength={0.9} />
          {all.map((l) => <Letter key={l.to} l={l} focus={focus} />)}
        </div>
      </div>
      <Headline size={90}>every letter on the wall<br />is to somebody.</Headline>
    </IgBoard>
  )
}

export default { id: 'ig-wall', w: W, h: 1350, title: 'the wall', format: 'instagram 4:5', order: 11, Poster }

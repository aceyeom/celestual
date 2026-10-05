// ── the four, pasted up ─────────────────────────────────────────────────────
// The street sheets as they will be found: four A4s on a rendered wall at
// night, each a little turned and held with plasters, and the light of a
// street lamp out of the frame falling across them, cut by the edge of
// something between, so june's is in the light, the next two are crossed by
// the shadow's edge and eli's is nearly in the dark.

import { Board, Plaster, Lockup } from '../kit.jsx'
import { Wall, Pasted, Scrap, STREET } from '../parts/print.jsx'

const W = 1080
const H = 1350
const U = 72
const SW = 340
const SH = Math.round(SW * 1169 / 827)

// where each sheet goes: its top left, its turn, and its plasters, each
// [across, top or foot, length, turn off the vertical]
const PLACE = [
  { x: 132, y: 76, rot: -2.4, tape: [[0.5, 0, 80, 5]] },
  { x: 596, y: 128, rot: 1.7, tape: [[0.46, 0, 86, -4], [0.55, 1, 82, 7]] },
  { x: 150, y: 630, rot: 0.9, tape: [[0.52, 0, 84, -6]] },
  { x: 612, y: 676, rot: -1.6, tape: [[0.5, 0, 78, 3], [0.44, 1, 84, -5]] },
]

// the shadow of whatever stands between the lamp and the wall: its edge
// runs down from the top right to the foot on the left, soft as a shadow
// is a few metres from what casts it
const EDGE = 'M 930 -40 L 1200 -40 L 1200 1400 L -40 1400 L -40 1290 Z'

function Poster() {
  return (
    <Board w={W} h={H} grain={0.06} className="pr-mock">
      <Wall w={W} h={H} lamp={[-60, -200]} at={340} to={[420, 520]} tone="#C2B9A9" />
      <Scrap x={548} y={62} w={84} rot={-4} />
      <Plaster x={543} y={60} len={76} rot={93} />
      {PLACE.map((p, i) => (
        <Pasted key={i} x={p.x} y={p.y} w={SW} rot={p.rot} letter={STREET[i]} seed={i * 7 + 3}>
          {p.tape.map(([tx, ty, len, r], j) => (
            <Plaster key={j} x={SW * tx} y={ty ? SH - 4 : 4} len={len} rot={90 + r} />
          ))}
        </Pasted>
      ))}
      <svg className="pr-dark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <filter id="pr-mock-pen" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="16" /></filter>
          <radialGradient id="pr-mock-fall" cx="0.16" cy="0.06" r="1.05">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.28" />
            <stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#pr-mock-fall)" />
        <path d={EDGE} fill="#000" opacity="0.8" filter="url(#pr-mock-pen)" />
      </svg>
      <div className="pr-mock-sign" style={{ left: U, right: U, bottom: U }}>
        <Lockup cell={2} />
        <span>celestual.us</span>
      </div>
    </Board>
  )
}

export default { id: 'print-mockup-wall', w: W, h: H, title: 'the four, pasted up', format: 'instagram 4:5', order: 86, Poster }

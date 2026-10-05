import { useEffect, useState } from 'react'
import { Board, Lockup, Light, photo, useHold } from '../kit.jsx'
import { useFaces } from '../parts/carousel.jsx'

// The street campaign's own still, one of the four on the strip, the letter
// held where the face was and a finger at whoever is looking. Graded into
// the room in two parts, as a print is: the street crushed and drained and
// let go to black round the letter, the passers by burnt out of it by hand,
// and the printed screen kept in its own colour, a little lifted, so it is
// the one lit thing. The sensor's grain over all of it, and the line asked
// of the person it points at.
const W = 1080
const H = 1920
// the photograph (2140 by 1206) at `K` times, its left edge `PX` and its
// top `PY` on the board, the printed screen in the middle of the width
const K = 1.5
const PX = -1503
const PY = 90
const at = ([x, y]) => `${(x * K + PX).toFixed(1)},${(y * K + PY).toFixed(1)}`
// in the photograph's own pixels: the printed panel, and the sheet it is
// printed on, its white edge and all
const PANEL = [[1282.5, 314], [1444, 312.5], [1446, 507.5], [1284, 509]]
const SHEET = [[1263, 281], [1462, 275], [1456, 561], [1265, 561]]
// burnt in where a passer by's face is, and where a sign or a shop would
// say which street it is, on the board: where, how wide
const BURN = [
  [356, 742, 62], [222, 688, 52], [120, 742, 44], [322, 680, 40], [24, 714, 44],
  [876, 690, 74], [946, 704, 84], [740, 724, 46], [1050, 700, 60],
  [358, 592, 34], [334, 520, 40], [168, 580, 70], [776, 604, 36], [790, 470, 48], [800, 760, 50],
  [372, 652, 30], [712, 632, 24],
]
// the letter's middle on the board, for the light it throws and the fall
const CX = 543
const CY = 706

// the photograph is drawn in an svg, which the camera does not wait for,
// so it is decoded first and the camera held until it is in
function usePhoto(src) {
  const [got, setGot] = useState(false)
  useEffect(() => {
    let on = true
    const im = new Image()
    im.src = src
    im.decode().catch(() => null).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (on) setGot(true) })))
    return () => { on = false }
  }, [src])
  useHold(got)
  return got
}

function Poster() {
  const ok = useFaces()
  const got = usePhoto(photo('street-four'))
  const img = { href: photo('street-four'), x: PX, y: PY, width: 2140 * K, height: 1206 * K, preserveAspectRatio: 'none' }
  return (
    <Board w={W} h={H} grain={0.1}>
      <svg className="cs-print" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          {/* the street: half its colour, and the blacks crushed */}
          <filter id="cs-street" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0.5" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="2" offset="-0.012" />
              <feFuncG type="gamma" amplitude="1" exponent="2" offset="-0.012" />
              <feFuncB type="gamma" amplitude="1" exponent="1.95" offset="-0.01" />
            </feComponentTransfer>
          </filter>
          {/* the letter: all its colour, a tenth brighter */}
          <filter id="cs-lit" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.1" />
              <feFuncG type="linear" slope="1.1" />
              <feFuncB type="linear" slope="1.1" />
            </feComponentTransfer>
          </filter>
          <filter id="cs-feather" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6" /></filter>
          <filter id="cs-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
          <mask id="cs-panel" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <polygon points={PANEL.map(at).join(' ')} fill="#fff" filter="url(#cs-feather)" />
          </mask>
          {/* the burns stop at the sheet's edge, as a hand over a print does */}
          <mask id="cs-off-sheet" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <polygon points={SHEET.map(at).join(' ')} fill="#000" filter="url(#cs-feather)" />
          </mask>
          {/* the street let go to black round the letter and the hand: an oval
              about them, and past it nineteen parts in twenty black */}
          <radialGradient id="cs-fall" gradientUnits="userSpaceOnUse" cx={CX} cy={CY + 80} r="1" gradientTransform={`translate(${CX} ${CY + 80}) scale(300 420) translate(${-CX} ${-CY - 80})`}>
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.48" stopColor="#000" stopOpacity="0" />
            <stop offset="0.68" stopColor="#000" stopOpacity="0.72" />
            <stop offset="0.86" stopColor="#000" stopOpacity="0.95" />
            <stop offset="1" stopColor="#000" stopOpacity="1" />
          </radialGradient>
        </defs>
        {got ? <image {...img} filter="url(#cs-street)" /> : null}
        <g mask="url(#cs-off-sheet)">
          {BURN.map(([x, y, r]) => <circle key={`${x}.${y}`} cx={x} cy={y} r={r} fill="#000" filter="url(#cs-soft)" />)}
        </g>
        <rect width={W} height={H} fill="url(#cs-fall)" />
        {got ? <image {...img} filter="url(#cs-lit)" mask="url(#cs-panel)" /> : null}
      </svg>
      <div className="cs-glow"><Light x={CX} y={CY} size={760} tint="rose" strength={0.22} /></div>
      {ok ? (
        <div className="cs-type">
          <h2 className="cs-line">still feel it?</h2>
          <div className="cs-sign"><Lockup cell={2} /><span className="cs-url">celestual.us</span></div>
        </div>
      ) : null}
    </Board>
  )
}

export default { id: 'ig-story-street', w: W, h: H, title: 'still feel it, on the street', format: 'instagram story 9:16', order: 30, Poster }

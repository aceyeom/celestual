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
// the photograph (2140 by 1206) at `K` times, placed so the letter's middle
// (`MID`, in its own pixels) stands at `CX`, `CY` on the board, in the
// middle of the width and above the line
const K = 1.7
const MID = [1364, 410.7]
const CX = 543
const CY = 706
const PX = CX - MID[0] * K
const PY = CY - MID[1] * K
const on = ([x, y]) => [x * K + PX, y * K + PY]
const at = (p) => on(p).map((v) => v.toFixed(1)).join(',')
// everything below in the photograph's own pixels: the printed panel, and
// the sheet it is printed on, its white edge and all
const PANEL = [[1278.5, 314], [1444, 312.5], [1446, 507.5], [1280, 509]]
const SHEET = [[1263, 281], [1462, 275], [1456, 561], [1265, 561]]
// burnt in where a passer by's face is, where a sign or a shop would say
// which street it is, and where a speck of another colour is: where, how
// wide, and how soft
const BURN = [
  [1239, 435, 41], [1150, 399, 35], [1082, 435, 29], [1217, 393, 27], [1018, 416, 29],
  [1586, 400, 49], [1633, 409, 56], [1495, 423, 31], [1702, 407, 40],
  [1241, 335, 23], [1225, 287, 27], [1114, 327, 47], [1519, 343, 24], [1529, 253, 32], [1535, 447, 33],
  [1250, 375, 20], [1477, 361, 16], [1362, 605, 6], [1380, 605, 6],
]
const SOFT = 10.7
// the two specks of colour at the sheet's edges, burnt to the edge itself
const SPECK = [[1470, 357, 9], [1258, 303, 8]]
// the hand pointing out of the picture, under the letter: an oval about it
// that keeps more of its light, in the middle and across
const HAND = [1329, 560, 73, 50]
const HAND_SOFT = 13
// the street let go to black round the letter and the hand: an oval about
// them, below the letter's middle, and how far across and down it reaches
const FALL = [53, 200, 280]

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
  const [hx, hy] = on(HAND)
  const fy = CY + FALL[0] * K
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
          {/* the hand, lit by the letter it holds: its blacks let up less */}
          <filter id="cs-hand" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0.6" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="1.4" offset="-0.01" />
              <feFuncG type="gamma" amplitude="1" exponent="1.4" offset="-0.01" />
              <feFuncB type="gamma" amplitude="1" exponent="1.4" offset="-0.01" />
            </feComponentTransfer>
          </filter>
          {/* the letter: all its colour, a little brighter, and turned from
              the street's warm light toward the rose it was printed in */}
          <filter id="cs-lit" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.06" />
              <feFuncG type="linear" slope="1.04" />
              <feFuncB type="linear" slope="1.14" />
            </feComponentTransfer>
          </filter>
          <filter id="cs-feather" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6" /></filter>
          <filter id="cs-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={SOFT * K} /></filter>
          <filter id="cs-speck" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={3 * K} /></filter>
          <filter id="cs-oval" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={HAND_SOFT * K} /></filter>
          <mask id="cs-panel" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <polygon points={PANEL.map(at).join(' ')} fill="#fff" filter="url(#cs-feather)" />
          </mask>
          <mask id="cs-hand-m" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <ellipse cx={hx} cy={hy} rx={HAND[2] * K} ry={HAND[3] * K} fill="#fff" filter="url(#cs-oval)" />
          </mask>
          {/* the burns stop at the sheet's edge, as a hand over a print does */}
          <mask id="cs-off-sheet" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <polygon points={SHEET.map(at).join(' ')} fill="#000" filter="url(#cs-feather)" />
          </mask>
          {/* past the oval, nineteen parts in twenty black */}
          <radialGradient id="cs-fall" gradientUnits="userSpaceOnUse" cx={CX} cy={fy} r="1" gradientTransform={`translate(${CX} ${fy}) scale(${FALL[1] * K} ${FALL[2] * K}) translate(${-CX} ${-fy})`}>
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.48" stopColor="#000" stopOpacity="0" />
            <stop offset="0.68" stopColor="#000" stopOpacity="0.72" />
            <stop offset="0.86" stopColor="#000" stopOpacity="0.95" />
            <stop offset="1" stopColor="#000" stopOpacity="1" />
          </radialGradient>
        </defs>
        {got ? <image {...img} filter="url(#cs-street)" /> : null}
        {got ? <image {...img} filter="url(#cs-hand)" mask="url(#cs-hand-m)" /> : null}
        <g mask="url(#cs-off-sheet)">
          {BURN.map(([x, y, r]) => { const [bx, by] = on([x, y]); return <circle key={`${x}.${y}`} cx={bx} cy={by} r={r * K} fill="#000" filter="url(#cs-soft)" /> })}
        </g>
        {SPECK.map(([x, y, r]) => { const [bx, by] = on([x, y]); return <circle key={`${x}.${y}`} cx={bx} cy={by} r={r * K} fill="#000" filter="url(#cs-speck)" /> })}
        <rect width={W} height={H} fill="url(#cs-fall)" />
        {got ? <image {...img} filter="url(#cs-lit)" mask="url(#cs-panel)" /> : null}
      </svg>
      <div className="cs-glow"><Light x={CX} y={CY} size={760 * K / 1.5} tint="rose" strength={0.3} /></div>
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

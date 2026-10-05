import { Board, Lockup, photo } from '../kit.jsx'
import { useFaces } from '../parts/carousel.jsx'

// The street campaign's own still, one of the four on the strip, the letter
// held where the face was and a finger at whoever is looking. Graded into
// the room: the street let go to black round the lit screen, the blacks
// crushed, the sensor's grain over all of it, and the line asked of the
// person it points at.
const W = 1080
const H = 1920
// the photograph (2140 by 1206) at `K` times, its left edge `PX` and its
// top `PY` on the board
const K = 1.85
const PX = -1074 * K
const PY = -110
// and burnt in where a passer by's face is lit beside the letter, as a
// print is, by hand: where, how wide, how far down
const BURN = [[306, 712, 118, 0.97], [168, 640, 120, 0.9], [906, 690, 150, 0.85]]

function Poster() {
  const ok = useFaces()
  return (
    <Board w={W} h={H} grain={0.1}>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="cs-crush" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0.72" />
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude="1.08" exponent="1.55" offset="-0.02" />
            <feFuncG type="gamma" amplitude="1.08" exponent="1.55" offset="-0.02" />
            <feFuncB type="gamma" amplitude="1.08" exponent="1.5" offset="-0.015" />
          </feComponentTransfer>
        </filter>
      </svg>
      <img
        className="cs-photo" src={photo('street-four')} alt=""
        style={{ left: PX, top: PY, width: 2140 * K, height: 1206 * K, filter: 'url(#cs-crush)' }}
      />
      {BURN.map(([x, y, r, k]) => (
        <span key={x} className="cs-burn" aria-hidden="true" style={{ left: x - r, top: y - r, width: 2 * r, height: 2 * r, opacity: k }} />
      ))}
      <span className="cs-fall" aria-hidden="true" />
      {ok ? (
        <div className="cs-type">
          <h2 className="cs-line">still feel it?</h2>
          <div className="cs-sign"><Lockup cell={2} /><span>celestual.us</span></div>
        </div>
      ) : null}
    </Board>
  )
}

export default { id: 'ig-story-street', w: W, h: H, title: 'still feel it, on the street', format: 'instagram story 9:16', order: 30, Poster }

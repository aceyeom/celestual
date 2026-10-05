// ── silence is the product working ──────────────────────────────────────────
// The principle card, as a page from a book: the chalk paper, a plate
// printed into it, and the line under it in the display cut. The plate is
// the black room with a draft left on in it, lying on the table, nothing
// written: the negative, so the panel is dark and the one lit thing on it is
// the cursor, with the whole count of characters left on its band and
// nothing on its keys.

import { Phone, Grain } from '../kit.jsx'
import { Page, Pool, Table, W, U, M } from '../parts/li.jsx'

const PLATE = { x: M, y: 2 * U, w: W - M * 2, h: 8 * U }
const PW = 350
const PX = PLATE.w * 0.58
const PY = PLATE.h * 0.47

function Poster() {
  return (
    <Page paper head={{ l: 'celestual · the voice', r: 'resolution, never pursuit' }}>
      <div className="li-plate is-printed" style={{ left: PLATE.x, top: PLATE.y, width: PLATE.w, height: PLATE.h }}>
        <Table bw={PLATE.w} bh={PLATE.h} x={PX} y={PY + 20} w={900} h={460} opacity={0.26} />
        <Pool x={PX + 10} y={PY + 20} w={1100} h={540} colour="rgba(226, 228, 222, 0.1)" />
        <Pool x={PX} y={PY + 14} w={640} h={320} colour="rgba(232, 234, 228, 0.18)" />
        <Phone
          w={PW} x={PX} y={PY} tint="negative" seed="silence-2" text="" name="" tilt={[54, 0, -16]} className="li-lying" keys={{}}
          screenStyle={{ '--q-dust': 'none', '--q-scratch': 'none' }}
        />
        <Grain opacity={0.09} />
      </div>
      <p className="li-id li-cap" style={{ left: M, right: M, top: PLATE.y + PLATE.h + 16 }}>
        <span>fig. 1</span>
        <span>a draft, left on. nothing on it but the cursor.</span>
      </p>
      <h2 className="li-line" style={{ left: M - 5, top: 920, fontSize: 126 }}>
        <em>silence</em> is the<br />product working.
      </h2>
      <p className="li-id" style={{ left: M, top: 1200 }}>from celestual’s voice guide</p>
    </Page>
  )
}

export default { id: 'li-post-silence', w: W, h: 1500, title: 'silence is the product working', format: 'linkedin 4:5', order: 30, Poster }

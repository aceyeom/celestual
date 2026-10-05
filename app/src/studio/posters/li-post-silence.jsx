// ── silence is the product working ──────────────────────────────────────────
// The principle card, as a page from a book: the chalk paper, a plate
// printed into it, and the line under it in the display cut. The plate is
// the black room with a draft left on in it, lying on the table, nothing
// written: the negative, so the panel is dark, its band and its keys held
// low, and the one lit thing on it is the cursor.

import { Phone, Grain } from '../kit.jsx'
import { Page, Pool, Table, W, U, M } from '../parts/li.jsx'

const PLATE = { x: M, y: 2 * U, w: W - M * 2, h: 7 * U }
const PW = 450
const PX = PLATE.w * 0.5 + 6
const PY = PLATE.h * 0.5 - 24
// the panel at the room's own dark, so the cursor is the one lit thing on it
const DARK = {
  '--q-dust': 'none', '--q-scratch': 'none', '--li-persp': '1300px',
  '--s-hi': '#121212', '--s-mid': '#0B0B0B', '--s-lo': '#060606', '--s-top': '#141414', '--s-top-2': '#0F0F0F',
}

function Poster() {
  return (
    <Page paper head={{ l: 'celestual · the voice', r: 'resolution, never pursuit' }} className="li-silence">
      <div className="li-plate is-printed" style={{ left: PLATE.x, top: PLATE.y, width: PLATE.w, height: PLATE.h }}>
        <Table bw={PLATE.w} bh={PLATE.h} x={PX} y={PY + 40} w={1000} h={540} opacity={0.22} />
        <Pool x={PX} y={PY + 30} w={1100} h={560} colour="rgba(226, 228, 222, 0.07)" />
        <Phone
          w={PW} x={PX} y={PY} tint="negative" seed="silence-2" text="" name="" tilt={[42, 0, -13]} className="li-lying"
          screenStyle={DARK}
        />
        <Grain opacity={0.08} />
      </div>
      <p className="li-id li-cap" style={{ left: M, right: M, top: PLATE.y + PLATE.h + 16 }}>
        <span>fig. 1</span>
        <span>a draft, left on. the cursor is still blinking.</span>
      </p>
      <h2 className="li-line" style={{ left: M - 6, top: 808, fontSize: 132, lineHeight: 0.98 }}>
        <em>silence</em> is<br />the product<br />working.
      </h2>
      <p className="li-id" style={{ left: M, top: 1236 }}>from celestual’s voice guide</p>
    </Page>
  )
}

export default { id: 'li-post-silence', w: W, h: 1500, title: 'silence is the product working', format: 'linkedin 4:5', order: 30, Poster }

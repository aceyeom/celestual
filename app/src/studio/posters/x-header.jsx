// ── the X header ────────────────────────────────────────────────────────────
// The banner's family, set the other way: the twelve facing the camera in
// one even row, as the composer offers them, and one of them on. The rest
// are lit only by it, more dimly the further they stand, so the row is one
// wall with one light in it. The fact under it, and the lockup.

import { Phone, Light, Lockup } from '../kit.jsx'
import { Page, ROW_LETTERS } from '../parts/li.jsx'
import { COLOURS } from '../../wall/looks.js'

const XW = 1500
const XH = 500
const XU = 100
const PW = 90
const N = 12
const GAP = (XW - XU * 2 - PW * N) / (N - 1)
const CY = 224
// the one that is on
const ON = 8

const BY = new Map(ROW_LETTERS.map((l) => [l.tint, l]))

function Poster() {
  const onX = XU + ON * (PW + GAP) + PW / 2
  return (
    <Page w={XW} h={XH} sign={false} className="li-x">
      <Light x={onX} y={CY} size={980} tint={COLOURS[ON].slug} strength={1} />
      {COLOURS.map((c, i) => {
        const l = BY.get(c.slug)
        const far = Math.abs(i - ON)
        return (
          <div
            key={c.slug} className={`li-shelf${i === ON ? ' is-on' : ''}`}
            style={{ left: XU + i * (PW + GAP), top: CY, width: PW, '--li-far': Math.min(1, far / 6) }}
          >
            <Phone w={PW} tint={c.slug} seed={`x-${l.name}`} name={l.name} text={l.text} />
          </div>
        )
      })}
      {/* the fact under the one that is on, on its left edge; the lockup at
          the right, clear of the picture X lays over the left of the foot */}
      <p className="li-id" style={{ left: onX - PW / 2, top: CY + 76, fontSize: 16, letterSpacing: '0.08em' }}>a letter can be lit in twelve colours.</p>
      <div className="li-sign" style={{ right: XU, top: XH - 72 - 66, height: 66 }}><Lockup cell={2} /></div>
    </Page>
  )
}

export default { id: 'x-header', w: XW, h: XH, title: 'the X header', format: 'x header', order: 35, Poster }

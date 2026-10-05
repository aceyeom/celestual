// ── the X header ────────────────────────────────────────────────────────────
// The banner's family, set the other way: the twelve facing the camera in
// one even row, in the order the composer offers them, and one of them on.
// The row runs in from beyond the left edge, where X lays the avatar, and
// stops on the right margin. The rest are lit only by the one that is on,
// more dimly the further they stand and each evened for its own brightness,
// so the row is one wall with one light in it and its far end goes into the
// dark. The fact and the lockup end on the row's own right edge.

import { Phone, Light, Lockup, lockupSize } from '../kit.jsx'
import { Page, Fit, ROW_LETTERS, evenOf } from '../parts/li.jsx'
import { COLOURS } from '../../wall/looks.js'

const XW = 1500
const XH = 500
const XU = 100
const PW = 132
const GAP = 14
const N = COLOURS.length
// the row ends on the right margin and runs out past the left edge
const X0 = XW - XU - N * PW - (N - 1) * GAP
const CY = 178
// the light the one that is on throws along the row, falling off as a
// lamp's does: the near ones caught by it, the far ones gone into the room
const lit = (d) => 0.36 * Math.exp(-d / 3.1)
// the one that is on: the rose
const ON = COLOURS.findIndex((c) => c.slug === 'rose')
const SIGN = lockupSize(2)

const BY = new Map(ROW_LETTERS.map((l) => [l.tint, l]))

function Poster() {
  const onX = X0 + ON * (PW + GAP) + PW / 2
  return (
    <Page w={XW} h={XH} sign={false} className="li-x">
      <Light x={onX} y={CY} size={900} tint="rose" strength={1} />
      {COLOURS.map((c, i) => {
        const l = BY.get(c.slug)
        const far = Math.abs(i - ON)
        return (
          <div
            key={c.slug} className={`li-shelf${i === ON ? ' is-on' : ''}`}
            style={{ left: X0 + i * (PW + GAP), top: CY, width: PW, '--li-k': lit(far).toFixed(3), '--li-ks': (0.75 - Math.min(far, 6) * 0.06).toFixed(2), ...evenOf(c.slug) }}
          >
            <Phone w={PW} tint={c.slug} seed={`x-${l.name}`} name={l.name} text={l.text} />
          </div>
        )
      })}
      {/* the fact from the lit one's left edge to the row's right, and the
          lockup on that edge, clear of the avatar X lays over the left of
          the foot and inside the band X keeps when it crops */}
      <span className="li-x-dark" aria-hidden="true" />
      <p className="li-id li-x-cap" style={{ left: onX - PW / 2, top: 290 }}>
        <Fit w={XW - XU - (onX - PW / 2)}>a letter can be lit in twelve colours.</Fit>
      </p>
      <div className="li-sign" style={{ right: XU, top: 350, height: SIGN.h }}><Lockup cell={2} /></div>
    </Page>
  )
}

export default { id: 'x-header', w: XW, h: XH, title: 'the X header', format: 'x header', order: 35, Poster }

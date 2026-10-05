// ── the link card ───────────────────────────────────────────────────────────
// What a link to celestual.us carries when it is pasted into a post: one lit
// screen in the black room, a draft with the cursor after its last word,
// and one line beside it, the whole mechanism. Signed with the lockup.

import { Phone, Light } from '../kit.jsx'
import { Page, Sign } from '../parts/li.jsx'

const LW = 1200
const LH = 627
// the card's grid: its width over 15
const LU = 80
const PW = 330
const PX = 3.5 * LU + 10
const PY = LH / 2 + 6

function Poster() {
  return (
    <Page w={LW} h={LH} sign={false} className="li-link">
      <Light x={PX} y={PY} size={1300} tint="ice" strength={1} />
      <Light x={PX} y={PY} size={620} tint="ice" strength={0.6} />
      <Phone w={PW} x={PX} y={PY} tint="ice" seed="link-jules" name="jules" text="do you still sleep on the left side?" />
      <h2 className="li-line" style={{ left: 7 * LU - 4, top: 120, fontSize: 70, lineHeight: 1.04 }}>
        nothing happens<br />unless it’s mutual.
      </h2>
      {/* the word's baseline on the foot of the glass */}
      <Sign h={LH} l={7 * LU} r={LU} foot={92} />
    </Page>
  )
}

export default { id: 'li-link', w: LW, h: LH, title: 'the link card', format: 'linkedin link', order: 33, Poster }

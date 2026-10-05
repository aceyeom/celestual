// ── the link card ───────────────────────────────────────────────────────────
// What a link to celestual.us carries when it is pasted into a post: one lit
// screen in the black room, a draft with the cursor after its last word,
// photographed rather than laid out: turned a little on the table, close
// enough that its foot runs off the card. Beside it one line, the whole
// mechanism, and the lockup under it, the two one block on the glass. No
// address: LinkedIn prints the domain under every card.

import { Phone, Light, Lockup, lockupSize } from '../kit.jsx'
import { Page } from '../parts/li.jsx'

const LW = 1200
const LH = 627
// the card's grid: its width over 15, the margins a unit and a half
const LU = 80
const LM = 120
const PW = 404
const PX = LM + PW / 2 + 4
// the glass's top a unit and a half down, its foot off the card
const PY = 386
// the line and the lockup, from the text column to the right margin, the
// line's foot on the first line of the letter where the two face each other
const TX = 7.5 * LU
const SIGN = lockupSize(2)

function Poster() {
  return (
    <Page w={LW} h={LH} sign={false} className="li-link">
      <Light x={PX + 20} y={PY - 20} size={1300} tint="ice" strength={1} />
      <Light x={PX} y={PY - 20} size={640} tint="ice" strength={0.55} />
      <Phone w={PW} x={PX} y={PY} tint="ice" seed="link-jules" name="jules" text="do you still sleep on the left side?" tilt={[4, 9, -3]} />
      <div className="li-link-say" style={{ left: TX, right: LM, top: 198 }}>
        <h2 className="li-line">nothing happens<br />unless it’s mutual.</h2>
        <Lockup cell={2} style={{ height: SIGN.h }} />
      </div>
    </Page>
  )
}

export default { id: 'li-link', w: LW, h: LH, title: 'the link card', format: 'linkedin link', order: 33, Poster }

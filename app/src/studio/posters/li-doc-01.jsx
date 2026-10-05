// ── the lesson deck, 01: the cover ──────────────────────────────────────────
// The deck's title, and under it a draft left on: a letter written and not
// sent, the cursor still after its last word and `send` unpressed. Nothing
// has happened, and that is the product working.

import { Phone, Light } from '../kit.jsx'
import { Page, Title, Lesson, W, H, U, M, row, CAP_BASE } from '../parts/doc.jsx'

const PW = 460
// the phone's right edge on the margin, and its foot on the floor every
// other page keeps its caption on, so nothing on the cover reaches lower
// than anything on the pages after it
const PX = W - M - PW / 2
const PH = 530
const PY = CAP_BASE - PH / 2

function Poster() {
  return (
    <Page n={1} num={false} label="a lesson deck, in eight pages">
      <Title base={row(3)} size={122} lh={0.9}>how to build<br />a product where<br /><em>nothing</em> happens.</Title>
      <Light x={PX} y={PY} size={1200} tint="ice" strength={0.72} />
      <Phone w={PW} x={PX} y={PY} tint="ice" seed="doc-cover" name="jules" counter="224/1" text="do you still sleep on the left side?" />
      {/* the subtitle's last line on the same floor as the phone's foot */}
      <Lesson base={CAP_BASE - U / 2} width={4 * U}>a founder’s notes<br />on building celestual.</Lesson>
    </Page>
  )
}

export default { id: 'li-doc-01', w: W, h: H, title: 'how to build a product where nothing happens', format: 'linkedin document', order: 40, Poster }

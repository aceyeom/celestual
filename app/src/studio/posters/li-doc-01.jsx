// ── the lesson deck, 01: the cover ──────────────────────────────────────────
// The deck's title, and under it a draft left on: a letter written and not
// sent, the cursor still after its last word and `send` unpressed. Nothing
// has happened, and that is the product working.

import { Phone, Light } from '../kit.jsx'
import { Page, Title, Lesson, W, H, U, M, row } from '../parts/doc.jsx'

const PW = 500
// the phone stands on the thirteenth row line, its right edge on the margin
const PX = W - M - PW / 2
const PY = row(13) - 292

function Poster() {
  return (
    <Page n={1} label="a lesson deck, in eight pages">
      <Title base={row(3)} size={122} lh={0.9} style={{ whiteSpace: 'nowrap' }}>how to build a<br />product where<br /><em>nothing</em> happens.</Title>
      <Light x={PX} y={PY} size={1300} tint="ice" strength={0.75} />
      <Phone w={PW} x={PX} y={PY} tint="ice" seed="doc-cover" name="jules" counter="224/1" text="do you still sleep on the left side?" />
      <Lesson base={row(12) + 45} width={4 * U}>a founder’s notes on building celestual.</Lesson>
    </Page>
  )
}

export default { id: 'li-doc-01', w: W, h: H, title: 'how to build a product where nothing happens', format: 'linkedin document', order: 40, Poster }

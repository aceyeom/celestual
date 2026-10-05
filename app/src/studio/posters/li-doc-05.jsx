// ── the lesson deck, 05: the words ──────────────────────────────────────────
// The copy has a linter. Its figure is the hardest thing the product says,
// a night that was not mutual (Night.jsx), on a screen photocopied and
// blown out: three short lines, and not one of the three things the linter
// stops.

import { Phone, ScreenText, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, W, H, U, M, row, col } from '../parts/doc.jsx'

const PW = 470
const PX = M + PW / 2
const PY = row(9) + 30

function Poster() {
  return (
    <Page n={5}>
      <Kicker base={row(2)} n={4}>the words</Kicker>
      <Title base={row(3)} size={104} lh={0.9}>our copy has a linter.</Title>
      <Light x={PX} y={PY} size={1000} tint="xerox" strength={0.5} />
      <Phone w={PW} x={PX} y={PY} tint="xerox" seed="doc-night" mode="bare" top={{ bat: 4 }} keys={{ l: { label: 'ok' } }}>
        <ScreenText text={'not this time. they didn’t send you one. they’ll never know you did.'} />
      </Phone>
      <Lesson x={col(7)} base={row(6) + 45} width={W - M - col(7)}>
        <p><b>no exclamation marks. no emoji. no dashes.</b></p>
        <p>a script reads every word the product says, the mails included, and fails on any of the three.</p>
      </Lesson>
      <Caption base={row(12) + 45} n={5} x={col(7)} width={W - M - col(7)} style={{ gridTemplateColumns: '90px 1fr' }}>a night that was not mutual. it passes.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-05', w: W, h: H, title: 'our copy has a linter', format: 'linkedin document', order: 44, Poster }

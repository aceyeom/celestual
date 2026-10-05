// ── the lesson deck, 05: the words ──────────────────────────────────────────
// The copy has a linter. Its figure is the hardest thing the product says,
// a night that was not mutual (Night.jsx), on a screen photocopied and
// blown out: three short lines, and not one of the three things the linter
// stops. Beside it the voice guide's reason for the third.

import { Phone, ScreenText, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, lessonBase, W, H, U, M, col } from '../parts/doc.jsx'

const PW = 400
const PT = 590

function Poster() {
  return (
    <Page n={5}>
      <Kicker n={4}>words</Kicker>
      <Title>our copy has a linter.</Title>
      <Lesson base={lessonBase(1)} width={10 * U}>
        <p><b>no exclamation marks. no emoji. no dashes.</b></p>
        <p>a script reads every word the product says, the mails included, and fails on any of the three.</p>
      </Lesson>
      <Light x={M + PW / 2} y={PT + 235} size={950} tint="xerox" strength={0.45} />
      <div style={{ position: 'absolute', left: M, top: PT, width: PW }}>
        <Phone w={PW} tint="xerox" seed="doc-night" mode="bare" top={{ bat: 4 }} keys={{ l: { label: 'ok' } }}>
          <ScreenText text={'not this time. they didn’t send you one. they’ll never know you did.'} />
        </Phone>
      </div>
      <p className="dc-quote" style={{ left: col(6), top: PT - 6, width: W - M - col(6), fontSize: 56, lineHeight: '60px' }}>
        a dash is a writer stalling. use a full stop, or cut the second half.
        <span className="dc-quote-by">celestual’s voice guide</span>
      </p>
      <Caption n={5}>a night that was not mutual. it passes.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-05', w: W, h: H, title: 'our copy has a linter', format: 'linkedin document', order: 44, Poster }

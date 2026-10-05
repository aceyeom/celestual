// ── the lesson deck, 05: the words ──────────────────────────────────────────
// The copy has a linter. Its figure is the hardest thing the product says,
// a night that was not mutual, on the screen a note opens on afterwards
// (Night.jsx `NightReport`, as screens/You.jsx draws it): the night's own
// phone, the night's date by the battery its week ran down, the envelope
// that went and the place where the one back would have been, and three
// short lines with not one of the three things the linter stops. Beside it
// the voice guide's reason for the third, in its own words.

import { Phone, Light } from '../kit.jsx'
import { NightReport } from '../../wall/Night.jsx'
import { Page, Kicker, Title, Lesson, Caption, lessonBase, W, H, U, M, col, row, HALF } from '../parts/doc.jsx'

const PW = 410
const PT = row(6) + HALF
// the quote in the column the callouts and the key stand in on the pages
// either side of this one
const QX = col(7)
const QS = 72

function Poster() {
  return (
    <Page n={5}>
      <Kicker n={4}>words</Kicker>
      <Title>our copy has a linter.</Title>
      <Lesson base={lessonBase(1)} width={10 * U}>
        <p><b>no exclamation marks. no emoji. no dashes.</b></p>
        <p>a script reads every word the product says,<br />the mails included, and fails on any of the three.</p>
      </Lesson>
      <Light x={M + PW / 2} y={PT + 240} size={1000} tint="night" strength={0.75} />
      <div style={{ position: 'absolute', left: M, top: PT, width: PW }}>
        <Phone
          w={PW} tint="night" seed="doc-night" mode="bare"
          top={{ stamp: '10/03/26', bat: 0, icon: 'pen', salutation: 'dear you' }}
          keys={{ l: { label: 'options' }, r: { label: 'back' } }}
        >
          <NightReport p={{}} />
        </Phone>
      </div>
      {/* the quote's first baseline level with the phone's status row */}
      <p className="dc-quote" style={{ left: QX, top: PT - 8, width: W - M - QX, fontSize: QS, lineHeight: '78px' }}>
        a dash<br />is a writer<br />stalling.
        <span className="dc-quote-by">celestual’s voice guide</span>
      </p>
      <Caption n={5}>a night that was not mutual. it passes.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-05', w: W, h: H, title: 'our copy has a linter', format: 'linkedin document', order: 44, Poster }

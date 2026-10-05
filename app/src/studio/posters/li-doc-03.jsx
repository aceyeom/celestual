// ── the lesson deck, 03: silence ────────────────────────────────────────────
// A note sent privately, and the week it stands in. The figure is the
// ping's own screen once it is out (screens/Ping.jsx, done): the day it
// went by the battery, the check, `till this saturday` and the one line
// under it, and no keys, since there is nothing left to press. Beside it
// the days it stands, from the one it went on to the night it is told on,
// and the four between them with nothing in them at all. That is the
// product working.

import { Phone, Light } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import { Page, Kicker, Title, Lesson, Caption, lessonBase, W, H, U, M, HALF, col, row } from '../parts/doc.jsx'

const PW = 400
const PH = 470
// the phone's foot on the last day's baseline, its head a hair over the
// first day's caps
const PB = row(12)
const PT = PB - PH
// the week: a day to a unit, from the first row under the phone's head to
// the one its foot stands on
const DAYS = [
  { d: 'mon', n: '10/05', say: 'sent privately.' },
  { d: 'tue', n: '10/06' },
  { d: 'wed', n: '10/07' },
  { d: 'thu', n: '10/08' },
  { d: 'fri', n: '10/09' },
  { d: 'sat', n: '10/10', say: '9pm pacific.' },
]
const WX = col(6)
const WB = PB - (DAYS.length - 1) * U

function Poster() {
  return (
    <Page n={3}>
      <Kicker n={2}>silence</Kicker>
      <Title>silence is<br />the product working.</Title>
      <Lesson base={lessonBase(2)} width={9 * U}>if it’s ever mutual, you’ll both know.<br />if it isn’t, nobody ever will.</Lesson>
      <Light x={M + PW / 2} y={PT + PH / 2} size={980} tint="green" strength={0.5} />
      <div className="dc-standing" style={{ position: 'absolute', left: M, top: PT, width: PW }}>
        <Phone w={PW} tint="green" seed="doc-standing" mode="bare" top={{ stamp: '10/05/26', icon: 'pen', salutation: 'dear you', bat: 4 }} keys={{}}>
          <ScreenNote glyph="check" title="till this saturday">if they send you one by then, you both find out at 9pm pacific.</ScreenNote>
        </Phone>
      </div>
      <div className="dc-week" style={{ left: WX, width: W - M - WX }}>
        {DAYS.map((x, i) => (
          <p key={x.d} className={`dc-day${x.say ? ' is-said' : ''}`} style={{ top: WB + i * U - HALF }}>
            <span>{x.d}</span>
            <span>{x.n}</span>
            {x.say ? <span>{x.say}</span> : null}
          </p>
        ))}
      </div>
      <Caption n={3}>a note, standing.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-03', w: W, h: H, title: 'silence is the product working', format: 'linkedin document', order: 42, Poster }

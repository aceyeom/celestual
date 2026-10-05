// ── the lesson deck, 04: truth, exactly ─────────────────────────────────────
// A letter on the wall as it stands, held square, and two of its parts
// called out: the battery, which counts nothing and so claims nothing, and
// the heart, whose count is nought and says so.

import { Phone, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, Callouts, lessonBase, W, H, U, M, col } from '../parts/doc.jsx'

const PW = 400
const PT = 600
const CALLS = [
  { sel: '.wl-scr-bat', label: 'the battery', text: 'the writer’s to set. it counts nothing, so it claims nothing.' },
  { sel: '.wl-sk.is-heart', label: 'the heart', text: <>nobody has hearted it, so it says <span className="dc-n">0</span>.</>, up: true },
]

function Poster() {
  return (
    <Page n={4}>
      <Kicker n={3}>counts</Kicker>
      <Title>truth, exactly.</Title>
      <Lesson base={lessonBase(1)} width={9 * U}>every count is exactly true, or it isn’t there. no implied activity, no padded numbers, no hint that someone likes you.</Lesson>
      <Light x={M + PW / 2} y={PT + 230} size={1000} tint="amber" strength={0.6} />
      <div className="dc-fig-truth" style={{ position: 'absolute', left: M, top: PT, width: PW }}>
        <Phone w={PW} tint="amber" seed="doc-truth" mode="letter" name="Iris" stamp="10/05/26" hearts={0} cursor={false} square text="i walk the long way home now. it passes your building." />
      </div>
      <Callouts within=".dc-fig-truth" items={CALLS} x={col(7)} width={W - M - col(7)} />
      <Caption n={4}>a letter on the wall, as it stands.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-04', w: W, h: H, title: 'truth, exactly', format: 'linkedin document', order: 43, Poster }

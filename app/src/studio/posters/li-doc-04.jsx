// ── the lesson deck, 04: truth, exactly ─────────────────────────────────────
// A letter on the wall as it stands, held square, and two of its parts
// called out: the battery, which counts nothing and so claims nothing, and
// the heart, whose count is nought and says so. The letter is the street's
// own in the colour it was printed in (charlie's, amber).

import { Phone, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, Callouts, lessonBase, W, H, U, M, col, row, HALF } from '../parts/doc.jsx'

const PW = 400
const PT = row(6) + HALF
const CX = col(7)
// the heart's words would run into the caption under it, so its line
// turns up a unit and a half over it and its label stands there
const CALLS = [
  { sel: '.wl-scr-bat', label: 'the battery', text: <>the writer’s to set.<br />it counts nothing,<br />so it claims nothing.</> },
  { sel: '.wl-sk.is-heart', label: 'the heart', elbow: [CX - 70, row(10)], text: <>nobody has hearted it,<br />so it says <span className="dc-px">0</span>.</> },
]

function Poster() {
  return (
    <Page n={4}>
      <Kicker n={3}>counts</Kicker>
      <Title>truth, exactly.</Title>
      <Lesson base={lessonBase(1)} width={9 * U}>every count is exactly true, or it isn’t there.<br />no implied activity. no padded numbers.</Lesson>
      <Light x={M + PW / 2} y={PT + 230} size={1000} tint="amber" strength={0.6} />
      <div className="dc-fig-truth" style={{ position: 'absolute', left: M, top: PT, width: PW }}>
        <Phone w={PW} tint="amber" seed="doc-truth" mode="letter" name="Sofia" stamp="10/05/26" hearts={0} cursor={false} square text="i made so many cupcakes. i can’t quite make them like you do." />
      </div>
      <Callouts within=".dc-fig-truth" items={CALLS} x={CX} width={W - M - CX} />
      <Caption n={4}>a letter on the wall, as it stands.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-04', w: W, h: H, title: 'truth, exactly', format: 'linkedin document', order: 43, Poster }

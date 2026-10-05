// ── the lesson deck, 04: truth, exactly ─────────────────────────────────────
// A letter's foot seen from a hand's width away: `options`, and the heart
// with its count, which is nought, and says so. The plate runs the board's
// full width, cut square at its top and foot as a frame of film is cut.

import { Phone, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, W, H, U, M, row } from '../parts/doc.jsx'

// the plate, and the phone inside it, many times the plate's width, laid so
// that its band of keys falls across the plate
const PT = row(7)
const PH = 5 * U
const PW = 2300

function Poster() {
  return (
    <Page n={4}>
      <Kicker base={row(2)} n={3}>truth, exactly</Kicker>
      <Title base={row(3)} size={88} lh={0.9} width={10 * U}>every count is exactly true, or it isn’t there.</Title>
      <Lesson base={row(5)} width={9 * U}>no implied activity. no padded numbers. a letter nobody has hearted says 0.</Lesson>
      <div className="dc-plate" style={{ left: 0, top: PT, width: W, height: PH }}>
        <Light x={W * 0.42} y={PH * 0.6} size={1600} tint="amber" strength={0.6} />
        <Phone
          w={PW} tint="amber" seed="doc-truth" mode="letter" name="Theo" stamp="10/05/26" hearts={0} cursor={false}
          text="i walk the long way home now. it passes your building."
          style={{ position: 'absolute', left: -180, top: -2200 }}
        />
      </div>
      <Caption base={row(12) + 45} n={4}>the foot of a letter on the wall. the count is the count.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-04', w: W, h: H, title: 'truth, exactly', format: 'linkedin document', order: 43, Poster }

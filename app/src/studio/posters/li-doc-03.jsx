// ── the lesson deck, 03: silence ────────────────────────────────────────────
// The quietest page in the deck. Its figure is a draft on the negative
// screen, the panel dark and nothing on it but the cursor, so that the one
// bright thing on the page is a cursor two of the face's pixels wide.

import { Phone, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, lessonBase, W, H, U, HALF, CAP_BASE } from '../parts/doc.jsx'

const PW = 380
const PX = W / 2
// the phone, centred in the room between the lesson and the caption
const PY = (lessonBase(2) + HALF + CAP_BASE - 40) / 2

function Poster() {
  return (
    <Page n={3}>
      <Kicker n={2}>silence</Kicker>
      <Title>silence is the product working.</Title>
      <Lesson base={lessonBase(2)} width={8 * U}>if it’s ever mutual, you’ll both know. if it isn’t, nobody ever will.</Lesson>
      <Light x={PX} y={PY} size={900} tint="negative" strength={0.35} />
      <Phone w={PW} x={PX} y={PY} tint="negative" seed="doc-quiet" name="" counter="260/1" text="" />
      <Caption n={3}>the cursor is still blinking.</Caption>
    </Page>
  )
}


export default { id: 'li-doc-03', w: W, h: H, title: 'silence is the product working', format: 'linkedin document', order: 42, Poster }

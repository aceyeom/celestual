// ── the lesson deck, 03: silence ────────────────────────────────────────────
// The quietest page in the deck. Its figure is the intro's empty glass, the
// frame every telling opens on: the ground, in the night's ink, and nobody
// standing on it. The page around it is as empty as it can be and still be
// read.

import { StoryPhone, Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, W, H, U, M, row, col } from '../parts/doc.jsx'

const PW = 540
const PX = W - M - PW / 2
const PY = row(5) + 60

function Poster() {
  return (
    <Page n={3}>
      <Kicker base={row(2)} n={2}>silence</Kicker>
      <Light x={PX} y={PY} size={1100} tint="night" strength={0.45} />
      <StoryPhone w={PW} x={PX} y={PY} tint="night" seed="doc-empty" story="intro" t={-600} />
      <Caption base={row(8) + 45} x={col(5)} width={W - M - col(5)} n={3} style={{ gridTemplateColumns: '90px 1fr' }}>the empty glass. the ground, and nobody on it.</Caption>
      <Title base={row(10)} size={104} lh={0.9}>silence is the product working.</Title>
      <Lesson base={row(12) + 15} width={8 * U}>if it’s ever mutual, you’ll both know. if it isn’t, nobody ever will.</Lesson>
    </Page>
  )
}

export default { id: 'li-doc-03', w: W, h: H, title: 'silence is the product working', format: 'linkedin document', order: 42, Poster }

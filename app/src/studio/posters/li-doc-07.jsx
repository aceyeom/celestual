// ── the lesson deck, 07: drawn ──────────────────────────────────────────────
// The mark on its own grid, 33 by 33, large enough to count: every cell a
// hairline square, the lit ones filled, at a whole number of pixels a cell.

import { Light } from '../kit.jsx'
import { Page, Kicker, Title, Lesson, Caption, MarkCells, W, H, U, M, row } from '../parts/doc.jsx'

const CELL = 18
const S = 33 * CELL

function Poster() {
  return (
    <Page n={7}>
      <Kicker base={row(2)} n={6}>drawn</Kicker>
      <Title base={row(3)} size={104} lh={0.9}>everything is drawn.</Title>
      <Lesson base={row(4) + 15} width={9 * U}>no icon set, no stock, no bitmap. the grain is feTurbulence. the mark is 33 by 33 cells, rastered from nine constants, then every cell looked at.</Lesson>
      <MarkCells cell={CELL} style={{ left: W - M - S - 1, top: row(6) + 45 }} />
      <Caption base={row(13) + 10} n={7}>the mark, a cell at a time.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-07', w: W, h: H, title: 'everything is drawn', format: 'linkedin document', order: 46, Poster }

// ── the lesson deck, 07: drawn ──────────────────────────────────────────────
// The mark on its own grid, 33 by 33, large enough to count: every cell a
// hairline square, the lit ones filled, at a whole number of pixels a cell,
// and every eighth line numbered as squared paper is. Three of the places
// the drawing was decided a cell at a time are boxed and keyed beside it
// (DESIGN.md 3.1a).

import { Page, Kicker, Title, Lesson, Caption, Key, MarkCells, lessonBase, W, H, U, M, col } from '../parts/doc.jsx'

const CELL = 15
const S = 33 * CELL
const GX = M
const GY = 585
// each box is the cells it holds, and where on the grid its number stands
const BOXES = [
  { n: 1, x0: 15, y0: 7, x1: 17, y1: 8, nx: 13, ny: 5 },
  { n: 2, x0: 12, y0: 12, x1: 20, y1: 15, nx: 22, ny: 12 },
  { n: 3, x0: 15, y0: 23, x1: 17, y1: 26, nx: 19, ny: 28 },
]
const KEY = [
  { n: 1, label: 'behind', text: 'the ring stops a cell short of the needle.' },
  { n: 2, label: 'the star', text: 'a cell narrower each row, so it reads as a sparkle.' },
  { n: 3, label: 'in front', text: 'the needle stops a cell short of the ring.' },
]

function Poster() {
  return (
    <Page n={7}>
      <Kicker n={6}>drawn</Kicker>
      <Title>everything is drawn.</Title>
      <Lesson base={lessonBase(1)} width={10 * U}>no icon set, no stock, no bitmap. the grain is <span className="dc-n">feTurbulence</span>. the mark is <span className="dc-n">33</span> by <span className="dc-n">33</span> cells, rastered from nine constants, then every cell looked at.</Lesson>
      <MarkCells cell={CELL} keys={BOXES} style={{ left: GX, top: GY }} />
      <Key x={col(7)} top={GY - 6} width={W - M - col(7)} items={KEY} step={170} />
      <Caption n={7}>the mark, a cell at a time.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-07', w: W, h: H, title: 'everything is drawn', format: 'linkedin document', order: 46, Poster }

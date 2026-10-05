// ── the lesson deck, 07: drawn ──────────────────────────────────────────────
// The mark on its own grid, 33 by 33, large enough to count: every cell a
// hairline square, the lit ones filled, at a whole number of pixels a cell,
// and every eighth line numbered along the top as squared paper is. Three
// of the places the drawing was decided by hand, a cell at a time, are
// boxed and keyed beside it (DESIGN.md 3.1a): the ring is mark.js's own,
// rastered, and the star and both of its crossings are drawn.

import { Page, Kicker, Title, Lesson, Caption, Key, MarkCells, lessonBase, W, H, U, M, col, row, HALF } from '../parts/doc.jsx'

const CELL = 15
const GX = M
const GY = row(6) + HALF
// each box is the cells it holds, and where on the grid its number stands
const BOXES = [
  { n: 1, x0: 15, y0: 7, x1: 17, y1: 8, nx: 13, ny: 5 },
  { n: 2, x0: 12, y0: 12, x1: 20, y1: 15, nx: 22, ny: 12 },
  { n: 3, x0: 15, y0: 23, x1: 17, y1: 26, nx: 19, ny: 28 },
]
const KEY = [
  { n: 1, label: 'the far crossing', text: <>the ring stops a cell<br />short of the needle.</> },
  { n: 2, label: 'the star', text: <>a cell narrower each row,<br />so it reads as a sparkle.</> },
  { n: 3, label: 'the near crossing', text: <>the needle stops a cell<br />short of the ring.</> },
]

function Poster() {
  return (
    <Page n={7}>
      <Kicker n={6}>drawn</Kicker>
      <Title>everything is drawn.</Title>
      <Lesson base={lessonBase(1)} width={10 * U}>
        no icon set, no stock, no image files.<br />
        the grain is <span className="dc-n">feTurbulence</span>. the ring is rastered.<br />
        the star and both crossings are drawn by hand.
      </Lesson>
      <MarkCells cell={CELL} keys={BOXES} ticks="x" style={{ left: GX, top: GY }} />
      <Key x={col(7)} top={GY - 6} width={W - M - col(7)} items={KEY} step={170} />
      <Caption n={7}>the mark, a cell at a time.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-07', w: W, h: H, title: 'everything is drawn', format: 'linkedin document', order: 46, Poster }

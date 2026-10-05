// ── the lesson deck, 06: one bright thing ───────────────────────────────────
// The twelve colours as twelve phones on one wall, each with its own letter
// from the street, and every backlight down but one. The page keeps the
// rule it states.

import { Phone, Light } from '../kit.jsx'
import { COLOURS } from '../../wall/looks.js'
import { Page, Kicker, Title, Lesson, Caption, W, H, U, M, row } from '../parts/doc.jsx'

const LETTERS = [
  ['charlie', 'i made so many cupcakes. i can’t quite make them like you do.'],
  ['amy', 'the alleyway behind the dumpling shop where u kissed me.'],
  ['jessica', 'i wonder if you still wear our ring. i do.'],
  ['lin', 'do you ever think about me when you pass by our cafe?'],
  ['sasha', 'the pretzel guy asked why i came alone. i said he won’t see you anymore.'],
  ['david', 'my little alcoholic. the bartender at fifth ave asked about you.'],
  ['maya', 'the coffee guy still makes two. i drink both.'],
  ['noah', 'you said we’d see the cherry blossoms next year. it’s next year.'],
  ['june', 'your song came on at the laundromat and i let my clothes go round again.'],
  ['theo', 'i walk the long way home now. it passes your building.'],
  ['mina', 'we never finished the show. i’m on episode six. i’m waiting.'],
  ['ren', 'the library seat by the window is free on tuesdays. i check.'],
]

// the wall: four across and three down, a column and a half wide each
const LIT = 'green'
const CW = 2 * U + 20
const GX = (W - 2 * M - 4 * CW) / 3
const TOP = row(6) + 20
const RH = 2 * U + 30

function Poster() {
  const li = COLOURS.findIndex((c) => c.slug === LIT)
  const lx = M + (li % 4) * (CW + GX) + CW / 2
  const ly = TOP + Math.floor(li / 4) * RH + 110
  return (
    <Page n={6}>
      <Kicker base={row(2)} n={5}>light</Kicker>
      <Title base={row(3)} size={104} lh={0.9}>one bright thing per screen.</Title>
      <Lesson base={row(5)} width={9 * U}>a lit surface or a bloom. never both, and never two of either. the eye has to land somewhere.</Lesson>
      <Light x={lx} y={ly} size={900} tint={LIT} strength={0.9} />
      {COLOURS.map((c, i) => {
        const [name, text] = LETTERS[i]
        return (
          <div key={c.slug} className={`dc-wall-one${c.slug === LIT ? ' is-lit' : ''}`} style={{ left: M + (i % 4) * (CW + GX), top: TOP + Math.floor(i / 4) * RH, width: CW }}>
            <Phone w={CW} tint={c.slug} seed={`doc-wall-${c.slug}`} name={name} text={text} cursor={c.slug === LIT} />
          </div>
        )
      })}
      <Caption base={row(13) + 10} n={6}>twelve colours, and one of them on.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-06', w: W, h: H, title: 'one bright thing per screen', format: 'linkedin document', order: 45, Poster }

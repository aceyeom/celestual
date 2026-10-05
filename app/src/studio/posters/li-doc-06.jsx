// ── the lesson deck, 06: one bright thing ───────────────────────────────────
// The twelve colours as twelve phones on one wall, each with its own letter
// from the street, and every backlight down but one. The page keeps the
// rule it states.

import { Phone, Light } from '../kit.jsx'
import { COLOURS } from '../../wall/looks.js'
import { Page, Kicker, Title, Lesson, Caption, lessonBase, W, H, U, M } from '../parts/doc.jsx'

// each colour with a letter of its own: the street's in the colour it was
// printed in, and the new ones in the rest
const LETTERS = {
  night: ['noah', 'you said we’d see the cherry blossoms next year. it’s next year.'],
  white: ['ryan', 'i still can’t forgive you for what you have done. or maybe i can’t forgive myself for forgiving you.'],
  ice: ['amy', 'the alleyway behind the dumpling shop where u kissed me.'],
  teal: ['theo', 'i walk the long way home now. it passes your building.'],
  green: ['david', 'my little alcoholic. the bartender at fifth ave asked about you.'],
  acid: ['ren', 'the library seat by the window is free on tuesdays. i check.'],
  'violet-yellow': ['maya', 'the coffee guy still makes two. i drink both.'],
  amber: ['charlie', 'i made so many cupcakes. i can’t quite make them like you do.'],
  rose: ['jessica', 'i wonder if you still wear our ring. i do.'],
  lilac: ['june', 'your song came on at the laundromat and i let my clothes go round again.'],
  negative: ['mina', 'we never finished the show. i’m on episode six. i’m waiting.'],
  xerox: ['sasha', 'the pretzel guy asked why i came alone. i said he won’t see you anymore.'],
}

// the wall: two even rows of six across the measure, as the composer's
// panel lays the colours, and the one lit
const LIT = 'lilac'
const CW = 144
const GX = (W - 2 * M - 6 * CW) / 5
const RH = 186
const TOP = 652

function Poster() {
  const li = COLOURS.findIndex((c) => c.slug === LIT)
  const lx = M + (li % 6) * (CW + GX) + CW / 2
  const ly = TOP + Math.floor(li / 6) * RH + 80
  return (
    <Page n={6}>
      <Kicker n={5}>light</Kicker>
      <Title>one bright thing per screen.</Title>
      <Lesson base={lessonBase(2)} width={9 * U}>a lit surface or a bloom. never both, and never two of either. the eye has to land somewhere.</Lesson>
      <Light x={lx} y={ly} size={820} tint={LIT} strength={1} />
      {COLOURS.map((c, i) => {
        const [name, text] = LETTERS[c.slug]
        return (
          <div key={c.slug} className={`dc-wall-one${c.slug === LIT ? ' is-lit' : ''}`} style={{ left: M + (i % 6) * (CW + GX), top: TOP + Math.floor(i / 6) * RH, width: CW }}>
            <Phone w={CW} tint={c.slug} seed={`doc-wall-${c.slug}`} name={name} text={text} cursor={c.slug === LIT} />
          </div>
        )
      })}
      <Caption n={6}>twelve colours, and one of them on.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-06', w: W, h: H, title: 'one bright thing per screen', format: 'linkedin document', order: 45, Poster }

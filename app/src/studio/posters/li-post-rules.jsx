// ── the three rules ─────────────────────────────────────────────────────────
// The design system's first page (DESIGN.md 1), set on a Swiss grid: each
// rule on its hairline, in the display cut, with the line under it that
// says why, and beside it a diagram drawn from the real parts. The twelve
// colours are the screens' own thumbnails, the one lit screen is one phone
// among fifteen, and the mark is brand.js's 33 by 33, every cell counted.
// The page keeps all three: one accent, one lit thing, nothing downloaded.

import { Phone, Light } from '../kit.jsx'
import { Mini } from '../../wall/screen.jsx'
import { COLOURS } from '../../wall/looks.js'
import { Page, MarkGrid, W, H, U, M } from '../parts/li.jsx'

const TOP = 2 * U + 20
// two rows of a module and the last of a module and a half, so the mark
// can be drawn large enough to count
const ROWS = [300, 300, 460]
const AT = ROWS.map((_, i) => TOP + ROWS.slice(0, i).reduce((a, b) => a + b, 0))
const END = TOP + ROWS.reduce((a, b) => a + b, 0)
const COL = M + 7 * U
const DW = W - M - COL
// the diagrams stand on the headline's cap line
const DY = 76
// a swatch and a phone are the same size, so the two rows of six line up
const SW = 55
const GAP = (DW - SW * 6) / 5

const RULES = [
  { n: '1', rule: <>the accent<br />is rationed.</>, why: 'one saturated colour, its uses countable on one hand. the screens’ twelve are the only other hues.' },
  { n: '2', rule: <>one bright thing<br />per screen.</>, why: 'a lit surface or the bloom, never both, and never two of either. the eye has to land somewhere.' },
  { n: '3', rule: <>everything<br />is drawn.</>, why: 'no icon set, no stock, no bitmap. the grain is generated, and the mark is a grid of cells.' },
]

// the composer's pool: two even rows of six, in the order the panel draws it
function Pool() {
  return (
    <>
      <div className="li-pool-grid" style={{ gridTemplateColumns: `repeat(6, ${SW}px)`, columnGap: GAP, rowGap: 16 }}>
        {COLOURS.map((c) => (
          <span key={c.slug} className="li-mini" style={{ width: SW, height: Math.round(SW * 1.16) }}><Mini colour={c} /></span>
        ))}
      </div>
      <p className="li-dia-cap"><i className="li-accent" />the accent, spent once on this page</p>
    </>
  )
}

// the same twelve as phones, in the same places, and one of them on: the
// rose, under its own swatch
const LIT = 'rose'
const PH = Math.round(SW * 1.16)
const LIT_AT = COLOURS.findIndex((c) => c.slug === LIT)
const LIT_X = COL + (LIT_AT % 6) * (SW + GAP) + SW / 2
const LIT_Y = AT[1] + DY + Math.floor(LIT_AT / 6) * (PH + 16) + PH / 2
function Wall() {
  return (
    <>
      <div className="li-wall" style={{ gridTemplateColumns: `repeat(6, ${SW}px)`, columnGap: GAP, rowGap: 16 }}>
        {COLOURS.map((c) => (
          <div key={c.slug} className={c.slug === LIT ? 'is-lit' : 'is-off'} data-kind={c.kind} style={{ width: SW }}>
            <Phone w={SW} tint={c.slug} seed={`rules-${c.slug}`} mode="bare" square top={{ bat: 4 }} keys={{}} />
          </div>
        ))}
      </div>
      <p className="li-dia-cap">twelve screens, one of them on</p>
    </>
  )
}

function Poster() {
  return (
    <Page head={{ l: 'celestual · the three rules', r: 'this page keeps all three' }}>
      {RULES.map((r, i) => {
        return (
          <section key={r.n} className="li-rule" style={{ top: AT[i], left: M, width: W - M * 2, height: ROWS[i] }}>
            <span className="li-rule-n">{r.n}</span>
            <h2 className="li-rule-h">{r.rule}</h2>
            <p className="li-rule-why">{r.why}</p>
          </section>
        )
      })}
      <div className="li-dia" style={{ left: COL, top: AT[0] + DY, width: DW }}><Pool /></div>
      <Light x={LIT_X} y={LIT_Y} size={420} tint={LIT} strength={0.85} />
      <div className="li-dia" style={{ left: COL, top: AT[1] + DY, width: DW }}><Wall /></div>
      <div className="li-dia" style={{ left: COL, top: AT[2] + DY, width: DW }}>
        <MarkGrid cell={10} ink="rgba(244, 241, 234, 0.6)" line="rgba(244, 241, 234, 0.09)" />
        <p className="li-dia-cap">the mark, 33 by 33, a cell at a time</p>
      </div>
      <span className="li-rule-end" style={{ left: M, right: M, top: END }} />
    </Page>
  )
}

export default { id: 'li-post-rules', w: W, h: H, title: 'the three rules', format: 'linkedin 4:5', order: 31, Poster }

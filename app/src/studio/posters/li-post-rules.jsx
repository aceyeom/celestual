// ── the three rules ─────────────────────────────────────────────────────────
// The design system's first page (DESIGN.md 1), set on a Swiss grid: each
// rule on its hairline, its number hung in the margin, the rule in the
// display cut and the line that says why under it, and beside it a diagram
// drawn from the real parts. The first two are the same twelve screens: the
// pool, each at the strength of a panel and nothing more, and then the wall,
// all off but the rose, which stands under its own swatch with its light on
// the room. The third is brand.js's 33 by 33, every cell counted. The page
// keeps all three: one accent, one lit thing, nothing downloaded.

import { Phone, Light } from '../kit.jsx'
import { COLOURS } from '../../wall/looks.js'
import { Page, MarkGrid, evenOf, W, H, U, M } from '../parts/li.jsx'

const TOP = 2 * U + 20
// two rows the same and the last taller, so the mark is large enough to count
const ROWS = [300, 300, 420]
const AT = ROWS.map((_, i) => TOP + ROWS.slice(0, i).reduce((a, b) => a + b, 0))
const END = TOP + ROWS.reduce((a, b) => a + b, 0)
const COL = M + 7 * U
const DW = W - M - COL
// the diagrams stand on the rule's cap line
const DY = 40
// a swatch and a phone are the same object, so the two rows of six line up
const SW = 56
const GAP = (DW - SW * 6) / 5
const RG = 14

const RULES = [
  { n: '1', rule: <>the accent<br />is rationed.</>, why: <>one saturated colour, its uses countable on one hand.<br />the screens’ twelve are the only other hues.</> },
  { n: '2', rule: <>one bright thing<br />per screen.</>, why: <>a lit surface or the bloom, never both,<br />and never two of either. the eye has to land somewhere.</> },
  { n: '3', rule: <>everything<br />is drawn.</>, why: <>no icon set, no stock, no bitmap texture. the grain is generated,<br />and the mark is a grid of cells.</> },
]

// the twelve, two even rows of six in the order the composer's pool draws
// them: as swatches, every one at a panel's strength, or as a wall with
// one of them on
function Twelve({ lit = null }) {
  return (
    <div className={`li-twelve${lit ? ' is-wall' : ' is-pool'}`} style={{ gridTemplateColumns: `repeat(6, ${SW}px)`, columnGap: GAP, rowGap: RG }}>
      {COLOURS.map((c) => (
        <div key={c.slug} className={c.slug === lit ? 'is-lit' : 'is-off'} data-kind={c.kind} style={{ width: SW, ...evenOf(c.slug) }}>
          <Phone w={SW} tint={c.slug} seed={`rules-${c.slug}`} mode="bare" square top={{ bat: 4 }} keys={{}} />
        </div>
      ))}
    </div>
  )
}

const LIT = 'rose'
const LIT_AT = COLOURS.findIndex((c) => c.slug === LIT)

function Poster() {
  return (
    <Page head={{ l: 'celestual · the three rules', r: 'from the design system' }}>
      {RULES.map((r, i) => (
        <section key={r.n} className="li-rule" style={{ top: AT[i], left: M, width: W - M * 2, height: ROWS[i] }}>
          <span className="li-rule-n">{r.n}</span>
          <h2 className="li-rule-h">{r.rule}</h2>
          <p className="li-rule-why">{r.why}</p>
        </section>
      ))}
      <div className="li-dia" style={{ left: COL, top: AT[0] + DY, width: DW }}>
        <Twelve />
        <p className="li-dia-cap"><i className="li-accent" />the accent, spent once on this page</p>
      </div>
      <Lit />
      <div className="li-dia" style={{ left: COL, top: AT[1] + DY, width: DW }}>
        <Twelve lit={LIT} />
        <p className="li-dia-cap">twelve screens, one of them on</p>
      </div>
      <div className="li-dia" style={{ left: COL, top: AT[2] + DY, width: DW }}>
        <MarkGrid cell={8} fill={5} ink="#F4F1EA" line="rgba(244, 241, 234, 0.09)" />
        <p className="li-dia-cap">the mark, 33 by 33, a cell at a time</p>
      </div>
      <span className="li-rule-end" style={{ left: M, right: M, top: END }} />
    </Page>
  )
}

// the light the rose throws on the room, under it
function Lit() {
  const ph = SW * 1.16
  const x = COL + (LIT_AT % 6) * (SW + GAP) + SW / 2
  const y = AT[1] + DY + Math.floor(LIT_AT / 6) * (ph + RG) + ph / 2
  return <Light x={x} y={y} size={440} tint={LIT} strength={0.9} />
}

export default { id: 'li-post-rules', w: W, h: H, title: 'the three rules', format: 'linkedin 4:5', order: 31, Poster }

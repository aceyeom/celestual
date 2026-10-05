// ── the profile banner ──────────────────────────────────────────────────────
// The twelve colours as one wall seen from its end: twelve drafts in a row,
// each in its own colour and with its own letter, going away to the right
// into the dark, the nearest lit brighter than the rest. The lockup stands
// where the row runs out. The left third is the room and nothing else, since
// the profile picture covers it.

import { Phone, Light } from '../kit.jsx'
import { Page, Stack, ROW_LETTERS, evenOf } from '../parts/li.jsx'

const BW = 1584
const BH = 396
const PW = 182
const GAP = 34
// where the row starts, and how far it is turned away
const X0 = 592
const TURN = 74
// the eye, from the row's start: the row runs out toward it
const EYE = 430
// the lockup, at three pixels a cell, half its height clear of the row's end
const LX = 1168

function Poster() {
  return (
    <Page w={BW} h={BH} sign={false} className="li-banner">
      {/* the amber's light, held right of the profile picture's third */}
      <Light x={X0 + PW / 2 + 40} y={BH / 2} size={640} tint={ROW_LETTERS[0].tint} strength={0.9} />
      <div className="li-row3d" style={{ left: X0, top: 0, height: BH, '--li-turn': `${TURN}deg`, '--li-eye': `${EYE}px` }}>
        <div className="li-row3d-in" style={{ gap: GAP }}>
          {ROW_LETTERS.map((l, i) => (
            <div key={l.name} className="li-row3d-ph" style={{ width: PW, '--li-far': i / (ROW_LETTERS.length - 1), ...evenOf(l.tint) }}>
              <Phone w={PW} tint={l.tint} seed={`row-${l.name}`} name={l.name} text={l.text} />
            </div>
          ))}
        </div>
      </div>
      {/* the lockup alone, on the row's horizon: LinkedIn prints the address */}
      <Stack x={LX} y={BH / 2} cell={3} url={null} />
    </Page>
  )
}

export default { id: 'li-banner', w: BW, h: BH, title: 'the profile banner', format: 'linkedin banner', order: 34, Poster }

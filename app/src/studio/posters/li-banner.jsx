// ── the profile banner ──────────────────────────────────────────────────────
// The twelve colours as one wall seen from its end: twelve drafts in a row,
// each in its own colour and with its own letter, going away to the right
// into the dark, the nearest lit brighter than the rest. The lockup stands
// where the row runs out. The left third is the room and nothing else, since
// the profile picture covers it.

import { Phone, Light } from '../kit.jsx'
import { Page, Stack, ROW_LETTERS } from '../parts/li.jsx'

const BW = 1584
const BH = 396
const PW = 182
const GAP = 34
// where the row starts, and how far it is turned away
const X0 = 592
const TURN = 74
// the eye, from the row's start: the row runs out toward it
const EYE = 430

function Poster() {
  return (
    <Page w={BW} h={BH} sign={false} className="li-banner">
      <Light x={X0 + PW / 2} y={BH / 2} size={760} tint={ROW_LETTERS[0].tint} strength={0.9} />
      <div className="li-row3d" style={{ left: X0, top: 0, height: BH, '--li-turn': `${TURN}deg`, '--li-eye': `${EYE}px` }}>
        <div className="li-row3d-in" style={{ gap: GAP }}>
          {ROW_LETTERS.map((l, i) => (
            <div key={l.name} className="li-row3d-ph" style={{ width: PW, '--li-far': i / (ROW_LETTERS.length - 1) }}>
              <Phone w={PW} tint={l.tint} seed={`row-${l.name}`} name={l.name} text={l.text} />
            </div>
          ))}
        </div>
      </div>
      <Stack x={1196} y={BH / 2} />
    </Page>
  )
}

export default { id: 'li-banner', w: BW, h: BH, title: 'the profile banner', format: 'linkedin banner', order: 34, Poster }

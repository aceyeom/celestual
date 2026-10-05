// ── the lesson deck, 02: the mechanic ───────────────────────────────────────
// The whole of the mechanic in four sentences, each beside the frame of the
// door's own story that tells it (screens/Join.jsx, on the night's glass):
// he lets a note go, it seals and dims and she never knows, she lets one go,
// and the two of them run to each other. The frames read as one strip, the
// first three with their backlight let down and the last one lit.

import { Phone, PixelStory, Light } from '../kit.jsx'
import { Page, Kicker, Caption, door, W, H, U, M, row, col } from '../parts/doc.jsx'

// the strip: four frames down the first two columns and a half, a row of
// two units and a half each, from half a unit under the kicker; each line
// set beside its frame, from the fourth column
const TOP = row(2) + 45
const STEP = 2.5 * U
const FW = 186
const FH = 222
const LINE = 66

function Poster() {
  const d = door()
  const FRAMES = [
    { t: 1300, say: <>you send a note privately.</> },
    { t: 2000, say: <>they never know.</> },
    { t: 2700, say: <>unless they send you one back.</> },
    { t: d.times.run + 400, say: <>then it’s mutual.</>, lit: true },
  ]
  return (
    <Page n={2}>
      <Kicker base={row(2)} n={1}>the mechanic, in four sentences</Kicker>
      {FRAMES.map((f, i) => {
        const y = TOP + i * STEP
        return (
          <div key={f.t}>
            {f.lit ? <Light x={M + FW / 2} y={y + FH / 2} size={760} tint="night" strength={0.75} /> : null}
            <div className={`dc-frame${f.lit ? ' is-lit' : ''}`} style={{ left: M, top: y, width: FW }}>
              <Phone w={FW} tint="night" seed={`doc-door-${i}`} mode="bare" square className="is-story">
                <PixelStory story={d} at={f.t} />
              </Phone>
            </div>
            <div className="dc-said" style={{ left: col(4), top: y, width: W - M - col(4), height: FH }}>
              <h2 className={`dc-title${f.lit ? '' : ' is-quiet'}`} style={{ fontSize: LINE, lineHeight: 1 }}>{f.say}</h2>
            </div>
          </div>
        )
      })}
      <Caption n={2} base={row(13) - 8} x={M} style={{ gridTemplateColumns: `${col(4) - M}px 1fr` }}>the door’s own story, four frames of it.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-02', w: W, h: H, title: 'the mechanic, in four sentences', format: 'linkedin document', order: 41, Poster }

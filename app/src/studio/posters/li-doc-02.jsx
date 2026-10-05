// ── the lesson deck, 02: the mechanic ───────────────────────────────────────
// The whole of the mechanic in four sentences, each beside the frame of the
// door's own story that tells it (screens/Join.jsx, on the night's glass):
// he lets a note go, it seals and dims and she never knows, she lets one go,
// and the two of them run to each other. Each frame is a window cut out of
// the glass round where the two of them stand, so they are large enough to
// be seen doing it; the four read as one strip, the first three with their
// backlight let down and the last one lit.

import { Phone, PixelStory, Light } from '../kit.jsx'
import { Page, Kicker, Caption, door, W, H, M, HALF, row, col } from '../parts/doc.jsx'

// the strip: four windows down the margin, from half a unit under the
// kicker to the caption's own clear space; each line set beside its window,
// from the fifth column
const TOP = row(2) + HALF
const FW = 280
const FH = 204
const STEP = 216
const LINE = 60
// the phone behind each window, and where in it the window is cut. The
// story lays itself out for the glass it is told on, so it is told on one
// glass, 470 wide, and that glass is taken down to the window: from a hair
// over a raised hand to a hair under the ground they stand on (0.255 to
// 0.885 of its width), which leaves out the empty sky over them and the
// phone's two bands, and across its middle
const PW = 470
const K = FH / (0.63 * PW)
const CUT_Y = 0.255 * PW
const CUT_X = 0.495 * PW - FW / K / 2
const FIT = { left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${(-CUT_X * K).toFixed(2)}px, ${(-CUT_Y * K).toFixed(2)}px) scale(${K.toFixed(4)})` }

function Poster() {
  const d = door()
  const FRAMES = [
    { t: 1300, say: <>you send a note<br />privately.</> },
    { t: 2000, say: <>they never know.</> },
    { t: 2700, say: <>unless they send<br />you one back.</> },
    { t: d.times.run + 400, say: <>then it’s mutual.</>, lit: true },
  ]
  return (
    <Page n={2}>
      <Kicker n={1}>the mechanic</Kicker>
      {FRAMES.map((f, i) => {
        const y = TOP + i * STEP
        return (
          <div key={f.t}>
            {f.lit ? <Light x={M + FW / 2} y={y + FH / 2} size={820} tint="night" strength={0.7} /> : null}
            <div className={`dc-frame${f.lit ? ' is-lit' : ''}`} style={{ left: M, top: y, width: FW, height: FH }}>
              <Phone w={PW} tint="night" seed={`doc-door-${i}`} mode="bare" square className="is-story" style={FIT}>
                <PixelStory story={d} at={f.t} />
              </Phone>
            </div>
            <div className="dc-said" style={{ left: col(5), top: y, width: W - M - col(5), height: FH }}>
              <h2 className={`dc-title${f.lit ? '' : ' is-quiet'}`} style={{ fontSize: LINE, lineHeight: 1.02 }}>{f.say}</h2>
            </div>
          </div>
        )
      })}
      <Caption n={2}>the story the product tells, in four frames.</Caption>
    </Page>
  )
}

export default { id: 'li-doc-02', w: W, h: H, title: 'the mechanic, in four sentences', format: 'linkedin document', order: 41, Poster }

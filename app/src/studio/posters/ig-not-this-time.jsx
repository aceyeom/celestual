// ── not this time ───────────────────────────────────────────────────────────
// The night that was not mutual, kept with its dignity. The note's own
// phone on the night after, in the night's colour, as the product draws
// it: the night's date on its band, the battery run out, and on the glass
// the two envelopes, the one that went and the place where the one back
// would have been, and the two lines that settle it. Its light is going
// down. The title of it is the poster's, in the serif, under it.

import { Phone, Light } from '../kit.jsx'
import { NightReport } from '../../wall/Night.jsx'
import { IgBoard, Headline, W, H, NIGHT, PAIR } from '../parts/ig.jsx'

// the same phone, at the same size and in the same place, as the night
// that was mutual (ig-mutual.jsx): the same night, the other way
const PW = PAIR.w
const PY = PAIR.y

function Poster() {
  return (
    <IgBoard className="ig-ntt" vignette={0.6}>
      <Light x={W / 2} y={PY + 380} size={1400} tint="negative" strength={0.5} />
      <Phone
        w={PW} mode="bare" tint="negative" seed="not-this-time" className="ig-ntt-phone" tilt={[1.6, 2.4, 0.9]}
        top={{ stamp: NIGHT, bat: 0 }} keys={{ l: { label: 'options' }, r: { label: 'back' } }}
        screenStyle={{ '--q-dust': 'none' }}
        style={{ position: 'absolute', left: (W - PW) / 2, top: PY }}
      >
        <NightReport p={{}} />
      </Phone>
      <Headline size={132}>not this time.</Headline>
    </IgBoard>
  )
}

export default { id: 'ig-not-this-time', w: W, h: H, title: 'not this time', format: 'instagram 4:5', order: 13, Poster }

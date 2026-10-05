// ── not this time ───────────────────────────────────────────────────────────
// The night that was not mutual, kept with its dignity. The note's own
// phone on the night after, in the night's colour, as the product draws
// it: the night's date on its band, and on the glass the two envelopes, the
// one that went and the place where the one back would have been, and the
// two lines that settle it. Its light is going down. The title of it is the
// poster's, in the serif, under it.

import { Light } from '../kit.jsx'
import { NightReport } from '../../wall/Night.jsx'
import { IgBoard, PairPhone, Spill, Headline, W, NIGHT, PAIR } from '../parts/ig.jsx'

function Poster() {
  // the foot of the phone, and the floor in front of it
  const foot = PAIR.y + PAIR.w * PAIR.ar
  return (
    <IgBoard className="ig-ntt" vignette={0.6}>
      <Light x={W / 2} y={PAIR.y + 380} size={1400} tint="negative" strength={0.42} />
      <Spill x={W / 2 - 14} y={foot + 34} w={720} h={124} colour="rgba(200, 200, 206, 0.12)" />
      {/* the same phone, at the same size and in the same place, as the
          night that was mutual (ig-mutual.jsx), turned the other way */}
      <PairPhone
        mirror seed="not-this-time" tint="negative" light="negative" glow={0.4} className="ig-ntt-phone" edge="rgba(214, 214, 220, 0.34)"
        top={{ stamp: NIGHT }} keys={{ l: { label: 'options' }, r: { label: 'back' } }}
        screenStyle={{ '--q-dust': 'none', '--q-scratch': 'none' }}
      >
        <NightReport p={{}} />
      </PairPhone>
      <Headline size={148}>not this time.</Headline>
    </IgBoard>
  )
}

export default { id: 'ig-not-this-time', w: W, h: 1350, title: 'not this time', format: 'instagram 4:5', order: 13, Poster }

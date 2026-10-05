// ── unsent ──────────────────────────────────────────────────────────────────
// The series' first: one draft, so close it fills the frame, the way a
// macro lens sees a lit LCD. The words in the phone's face at the size of a
// headline, every one of the face's pixels a cell of the panel with its
// three stripes and the dark between them, the cursor still after the last
// word, the dust on the glass, and the focus falling off past the words.
// The key that would send it runs off the edge of the frame.

import { Phone, Light } from '../kit.jsx'
import { IgBoard, Focus, Dust, LitPlaster, W, H } from '../parts/ig.jsx'

const TEXT = 'the coffee guy\nstill makes two.\ni drink both.'

// the phone, and the face's size on it, in cqw of the glass: one of the
// face's pixels is 75 of its 1400 units, and that is the panel's pitch
const SW = 1207
const FS = 14
const PX = (FS * 75) / 1400
// the first baseline, from the top of the glass: the two status rows and
// their padding, the body's lift, and the face's ascent in a line of 1.02
const GY = 2.6 + 23.2 + 1.6 + 0.7779 * FS
const LEFT = 37
const TOP = -228

const glass = {
  '--q-pad': '3cqw', '--q-top-pad': '2.6cqw', '--q-lift': '1.6cqw', '--q-ar': '1.13',
  '--q-pitch': `${PX.toFixed(4)}cqw`, '--ig-fs': `${FS}cqw`,
  '--ig-gx': '3cqw', '--ig-gy': `${GY.toFixed(4)}cqw`,
  // the backlight seen this close: brightest behind the words, a cloud
  // where the diffuser sits badly low on the right, the lamps bleeding in
  // along the top, and the far corner falling away
  '--q-dust': 'none', '--q-scratch': 'none', '--q-streak-a': '0',
  '--q-mura': [
    'radial-gradient(60% 42% at 38% 30%, rgba(255,255,255,0.08), transparent 100%)',
    'radial-gradient(40% 26% at 78% 74%, rgba(0,0,0,0.1), transparent 100%)',
    'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent 14%)',
    'radial-gradient(130% 120% at 34% 30%, transparent 50%, rgba(0,0,0,0.3) 100%)',
  ].join(', '),
}

function Draft() {
  return (
    <Phone
      w={SW} tint="amber" seed="maya" name="maya" text={TEXT} quiet={false}
      tilt={[2.6, -6.5, -1.4]} screenStyle={glass}
      style={{ position: 'absolute', left: LEFT, top: TOP }}
    />
  )
}

function Poster() {
  return (
    <IgBoard className="ig-unsent" vignette={0.55}>
      <Light x={LEFT + SW / 2} y={TOP + 700} size={2200} tint="amber" strength={0.55} />
      <div className="ig-macro" style={{ position: 'absolute', inset: 0 }}>
        <Focus mask="radial-gradient(78% 46% at 44% 30%, #000 0%, #000 62%, transparent 100%)" soft={8}>
          <Draft />
        </Focus>
      </div>
      <Dust w={W} h={1120} seed="maya-glass" specks={110} hairs={1} lint={[600, 700, 300, 160]} opacity={0.5} style={{ left: 0, top: 0, zIndex: 25, mixBlendMode: 'screen' }} />
      <Dust w={W} h={1120} seed="maya-dark" specks={60} hairs={1} lint={[120, 760, 260, 120]} tone="#2A1A08" opacity={0.45} style={{ left: 0, top: 0, zIndex: 25, mixBlendMode: 'multiply' }} />
      <LitPlaster x={534} y={1112} len={204} rot={-87} dark={0.7} from={270} soft={1.4} />
    </IgBoard>
  )
}

export default { id: 'ig-unsent', w: W, h: H, title: 'unsent', format: 'instagram 4:5', order: 10, Poster }

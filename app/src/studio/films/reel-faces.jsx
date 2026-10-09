// ── the letter's two faces ──────────────────────────────────────────────────
// Not a film: one frame, lin's letter and kai's, each the reel's own glass
// as it is held in the reveal, flat and side by side, photographed once at
// twice the size into app/src/studio/assets/reel-face-lin.jpg and
// reel-face-kai.jpg, for the reveal to draw the letter from in WebGL, where
// the colours can warp it and take it back (parts/reel-card.js):
//
//   OUT=<dir> node scripts/studio-film.mjs reel-faces --stills 0 --scale 2
//
// and each half cut out of it.
import { Board } from '../kit.jsx'
import { NoteScreen, PW } from '../parts/note-screen.jsx'
import { A, B } from '../parts/reel-time.js'
import { FACE_A, FACE_B } from '../parts/reel.jsx'

const H = 1160
const face = (who, props, i) => (
  <div style={{ position: 'absolute', left: i * PW, top: 0, width: PW, height: H, overflow: 'hidden' }}>
    <div className="rl-card" style={{ position: 'absolute', left: 0, top: 0 }}>
      <NoteScreen who={who} t={1e6} times={new Array([...who.text].length).fill(0)} sendAt={1e9} {...props} />
    </div>
  </div>
)

function Film() {
  return (
    <Board w={PW * 2} h={H} grain={0} style={{ position: 'relative' }}>
      {face(A, FACE_A, 0)}
      {face(B, FACE_B, 1)}
    </Board>
  )
}

export default { id: 'reel-faces', w: PW * 2, h: H, ms: 1, fps: 1, Film }

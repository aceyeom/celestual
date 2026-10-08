// ── the wall's sheet ────────────────────────────────────────────────────────
// Not a film: one frame, every letter of the reel's wall on the wall's own
// `Screen`, side by side on a grid of whole cells, photographed once into
// app/src/studio/assets/wall-atlas.jpg for the wall's WebGL to draw from
// (parts/wall-gl.js):
//
//   node scripts/studio-film.mjs wall-atlas --stills 0
//
// The first cell is lin's note as the reel's own composer holds it once the
// last word is down (parts/note-screen.jsx, at the reel's size and made
// smaller), so the wall's cell and the phone the reel lays over it are the
// same picture; the rest are letters on the wall, `dear` and a name, the
// day, and their hearts.
import { Board, Phone } from '../kit.jsx'
import { NoteScreen, PW } from '../parts/note-screen.jsx'
import { A, typedA } from '../parts/reel-time.js'
import { ATLAS, LETTERS, tintOf, heartsOf } from '../parts/wall-letters.js'

const cell = (i) => ({ position: 'absolute', left: (i % ATLAS.cols) * ATLAS.w, top: Math.floor(i / ATLAS.cols) * ATLAS.h, width: ATLAS.w, height: ATLAS.h, overflow: 'hidden' })

function Film() {
  return (
    <Board w={ATLAS.cols * ATLAS.w} h={ATLAS.rows * ATLAS.h} grain={0} style={{ position: 'relative' }}>
      <div style={cell(0)}>
        <div style={{ width: PW, transform: `scale(${ATLAS.w / PW})`, transformOrigin: '0 0' }}>
          <NoteScreen who={A} t={1e6} times={typedA()} sendAt={1e9} fs={12.6} quiet={false} still />
        </div>
      </div>
      {LETTERS.map(([name, text], i) => (
        <div key={name} style={cell(i + 1)}>
          <Phone w={ATLAS.w} tint={tintOf(i)} seed={`atlas-${name}`} mode="letter" square name={name} stamp="10/06/26" hearts={heartsOf(i)} text={text} cursor={false} />
        </div>
      ))}
    </Board>
  )
}

export default { id: 'wall-atlas', w: ATLAS.cols * ATLAS.w, h: ATLAS.rows * ATLAS.h, ms: 1, fps: 1, Film }

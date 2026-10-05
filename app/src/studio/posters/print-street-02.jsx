// ── the street, 02 ──────────────────────────────────────────────────────────
// ren, in violet and yellow: the riso's two drums, a hair out of register

import { Board } from '../kit.jsx'
import { StreetSheet, STREET, A4 } from '../parts/print.jsx'

const letter = STREET[1]

function Poster() {
  return (
    <Board w={A4.w} h={A4.h} grain={0} bg="#FFFFFF">
      <StreetSheet letter={letter} />
    </Board>
  )
}

export default { id: 'print-street-02', w: A4.w, h: A4.h, scale: A4.scale, title: `the street, ${letter.name}`, format: 'print, a4 at 300 dpi', order: 82, Poster }

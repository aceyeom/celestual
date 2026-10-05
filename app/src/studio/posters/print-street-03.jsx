// ── the street, 03 ──────────────────────────────────────────────────────────
// sam, on acid: the square, painted, its words a hair soft

import { Board } from '../kit.jsx'
import { StreetSheet, STREET, A4 } from '../parts/print.jsx'

const letter = STREET[2]

function Poster() {
  return (
    <Board w={A4.w} h={A4.h} grain={0} bg="#FFFFFF">
      <StreetSheet letter={letter} />
    </Board>
  )
}

export default { id: 'print-street-03', w: A4.w, h: A4.h, scale: A4.scale, title: `the street, ${letter.name}`, format: 'print, a4 at 300 dpi', order: 83, Poster }

// ── the street, 01 ──────────────────────────────────────────────────────────
// june, lit in ice: the LCD photographed in the dark, printed on A4

import { Board } from '../kit.jsx'
import { StreetSheet, STREET, A4 } from '../parts/print.jsx'

const letter = STREET[0]

function Poster() {
  return (
    <Board w={A4.w} h={A4.h} grain={0} bg="#FFFFFF">
      <StreetSheet letter={letter} />
    </Board>
  )
}

export default { id: 'print-street-01', w: A4.w, h: A4.h, scale: A4.scale, title: `the street, ${letter.name}`, format: 'print, a4 at 300 dpi', order: 81, Poster }

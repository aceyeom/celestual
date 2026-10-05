import { Unsent, MS } from '../parts/film.jsx'

// the film at 4:5, for the feed
const L = {
  w: 1080, h: 1350,
  a: { x: 540, y: 590, w: 600 }, aSleep: { x: 540, y: 560, w: 480 }, a2: { x: 360, y: 450, w: 360 },
  b: { x: 712, y: 820, w: 420 },
  mid: { x: 540, y: 600, w: 620 }, end: { w: 430, y: 500 },
  fsA: 12.6, fsB: 13.4,
  cap: 1110, capGap: 62, capSize: 50,
  endLine: 820, lineSize: 50, signGap: 60, cell: 3, urlSize: 26,
}

function Film({ t }) {
  return <Unsent t={t} L={L} />
}

export default { id: 'film-unsent-45', w: 1080, h: 1350, ms: MS, fps: 30, Film }

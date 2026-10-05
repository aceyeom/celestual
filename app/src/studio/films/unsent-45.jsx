import { Unsent, MS } from '../parts/film.jsx'

// the film at 4:5, for the feed
const L = {
  w: 1080, h: 1350,
  a: { x: 540, y: 540, w: 600 }, a2: { x: 540, y: 330, w: 330 },
  b: { x: 540, y: 790, w: 380 },
  mid: { x: 540, y: 560, w: 620 }, end: { w: 420, y: 470 },
  fsA: 12.6, fsB: 13.4,
  cap: 1064, capGap: 66, capSize: 54,
  weekY: 1080, weekSize: 28,
  endLine: 800, lineSize: 58, signGap: 52, cell: 3, urlSize: 32,
}

function Film({ t }) {
  return <Unsent t={t} L={L} />
}

export default { id: 'film-unsent-45', w: 1080, h: 1350, ms: MS, fps: 30, Film }

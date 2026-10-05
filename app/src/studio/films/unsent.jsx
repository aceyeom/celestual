import { Unsent, MS } from '../parts/film.jsx'

// the film at 9:16, for a reel, a story or a short
const L = {
  w: 1080, h: 1920,
  a: { x: 540, y: 860, w: 820 }, aSleep: { x: 540, y: 820, w: 660 }, a2: { x: 352, y: 640, w: 470 },
  b: { x: 728, y: 1170, w: 560 },
  mid: { x: 540, y: 880, w: 840 }, end: { w: 600, y: 760 },
  fsA: 12.6, fsB: 13.4,
  cap: 1560, capGap: 80, capSize: 66,
  endLine: 1180, lineSize: 62, signGap: 78, cell: 3, urlSize: 30,
}

function Film({ t }) {
  return <Unsent t={t} L={L} />
}

export default { id: 'film-unsent', w: 1080, h: 1920, ms: MS, fps: 30, Film }

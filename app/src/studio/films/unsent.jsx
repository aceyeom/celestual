import { Unsent, MS } from '../parts/film.jsx'

// the film at 9:16, for a reel, a story or a short. Everything with words
// on it stays above 1500, clear of the bar a reel lays over its foot, and
// left of 920, clear of its keys down the right
const L = {
  w: 1080, h: 1920,
  a: { x: 540, y: 780, w: 760 }, a2: { x: 540, y: 500, w: 400 },
  b: { x: 540, y: 1040, w: 460 },
  mid: { x: 540, y: 800, w: 840 }, end: { w: 560, y: 680 },
  fsA: 12.6, fsB: 13.4,
  cap: 1336, capGap: 84, capSize: 70,
  weekY: 1356, weekSize: 34,
  endLine: 1080, lineSize: 72, signGap: 64, cell: 3, urlSize: 36,
}

function Film({ t }) {
  return <Unsent t={t} L={L} />
}

export default { id: 'film-unsent', w: 1080, h: 1920, ms: MS, fps: 30, Film }

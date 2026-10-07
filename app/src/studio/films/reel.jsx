import { Reel, MS } from '../parts/reel.jsx'

// the reel at 9:16, for a reel, a story or a short
function Film({ t }) {
  return <Reel t={t} />
}

export default { id: 'celestual-reel', w: 1080, h: 1920, ms: MS, fps: 60, Film }

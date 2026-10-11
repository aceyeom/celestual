import { Composition } from 'remotion'
import { Reel, TOTAL } from './Reel'
import { FPS, W, H } from './theme'

// The third reel, two cuts: the hook with names, and the hook to both of you
export const Root = () => (
  <>
    <Composition id="Reel3" component={Reel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ hook: 'a' as const }} />
    <Composition id="Reel3B" component={Reel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ hook: 'b' as const }} />
  </>
)

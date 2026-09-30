// ── the tellings ────────────────────────────────────────────────────────────
// The other ways the mark is told, in the order the lab shows them
// (proto/logos.jsx). Each is `make(f)`, a fresh story (kit.js `tale`) at
// pitch `f`, with a name, a line on what happens, how long it runs to the
// whole mark, and the screen it was made with in mind.
import { benchStory } from './bench.js'
import { umbrellaStory } from './umbrella.js'
import { binaryStory } from './binary.js'

export const SCENES = [
  {
    id: 'bench', name: 'the bench', make: benchStory, ms: 7700, for: 'the intro',
    line: 'behind them, at night. she turns to look at him and holds it, moves along the bench to him once, and leans on into him to rest her head on his shoulder; he lays his cheek on her hair. a star falls.',
  },
  {
    id: 'umbrella', name: 'the umbrella', make: umbrellaStory, ms: 5750, for: 'the door',
    line: 'rain, in silhouette. she waits under a lamp, cold. he comes running with the umbrella furled, brakes in front of her and swings it up: it springs open over the two of them as she puts her arms round his neck. his arm round her waist, he kisses her forehead, and her foot comes up behind her. the rain turns to petals; the canopy opens into the ring.',
  },
  {
    id: 'binary', name: 'binary', make: binaryStory, ms: 4100, for: 'loading',
    line: 'two lights circling on the ring\'s own orbit, each turn tighter and quicker. they touch; the flash goes out as a wave that parts the sky and settles into the ring. can circle for as long as a page takes to load.',
  },
]

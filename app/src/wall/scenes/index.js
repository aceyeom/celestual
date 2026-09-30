// ── the tellings ────────────────────────────────────────────────────────────
// The other ways the mark is told, in the order the lab shows them
// (proto/logos.jsx). Each is `make()`, a fresh story (kit.js `tale`), with a
// name, a line on what happens, how long it runs to the whole mark, and the
// screen it was made with in mind.
import { benchStory } from './bench.js'
import { umbrellaStory } from './umbrella.js'
import { binaryStory } from './binary.js'

export const SCENES = [
  {
    id: 'bench', name: 'the bench', make: benchStory, ms: 7300, for: 'the intro',
    line: 'behind them, at night. she turns to look at him, holds it, shifts along the bench to him and rests her head on his shoulder; his arm comes round her. a star falls.',
  },
  {
    id: 'umbrella', name: 'the umbrella', make: umbrellaStory, ms: 5300, for: 'the door',
    line: 'rain, in silhouette. she runs in and brakes to a stop beside him; he tilts his umbrella over her, she looks up and slips her hand into his arm. the rain turns to petals; the canopy lifts into the ring.',
  },
  {
    id: 'binary', name: 'binary', make: binaryStory, ms: 4100, for: 'loading',
    line: 'two lights circling on the ring\'s own orbit, each turn tighter and quicker. they touch; the flash goes out as a wave that parts the sky and settles into the ring. can circle for as long as a page takes to load.',
  },
]

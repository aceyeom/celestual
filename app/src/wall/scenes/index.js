// ── the tellings ────────────────────────────────────────────────────────────
// Every other way the mark is told, in the order the lab shows them
// (proto/logos.jsx). Each is `make()`, a fresh story (kit.js `tale`), with a
// name, a line on what happens, how long it runs to the whole mark, and the
// screen it was made with in mind.
import { benchStory } from './bench.js'
import { eclipseStory } from './eclipse.js'
import { umbrellaStory } from './umbrella.js'
import { planesStory } from './planes.js'
import { threadStory } from './thread.js'
import { binaryStory } from './binary.js'
import { blossomStory } from './blossom.js'

export const SCENES = [
  {
    id: 'bench', name: 'the bench', make: benchStory, ms: 6300, for: 'the intro',
    line: 'behind them, at night. she sits down beside him and leans on his shoulder; a star falls; petals keep falling round the mark.',
  },
  {
    id: 'eclipse', name: 'eclipse', make: eclipseStory, ms: 5000, for: 'the mutual',
    line: 'the sun and the moon cross the sky to each other. totality, the corona, the stars out; then the diamond ring, and the rim of the moon opens into the ring.',
  },
  {
    id: 'umbrella', name: 'the umbrella', make: umbrellaStory, ms: 4900, for: 'the door',
    line: 'rain. he tilts his umbrella to her as she runs in, and she takes his arm. the rain slows into falling petals; the canopy lifts into the ring.',
  },
  {
    id: 'planes', name: 'two notes', make: planesStory, ms: 4400, for: 'sending a ping',
    line: 'two notes folded into paper planes, sent from either side. a loop each; each flies half the orbit and their lines draw the ring; they dive in and meet as the star.',
  },
  {
    id: 'thread', name: 'the red thread', make: threadStory, ms: 5300, for: 'the mutual',
    line: 'a red thread ties his hand to hers, back to back at either edge. it tugs; each turns; they walk it shorter. from their joined hands it rises into the ring.',
  },
  {
    id: 'binary', name: 'binary', make: binaryStory, ms: 4100, for: 'loading',
    line: 'two stars circling on the ring\'s own orbit, each turn tighter and quicker. they touch; the flash goes out as a wave and settles into the ring. can circle for as long as a page takes to load.',
  },
  {
    id: 'blossom', name: 'blossom', make: blossomStory, ms: 5000, for: 'the intro',
    line: 'a cherry tree comes into flower; two birds fly in and land side by side, and lean in. a gust takes every petal round in a wheel into the ring; the birds become the star.',
  },
]

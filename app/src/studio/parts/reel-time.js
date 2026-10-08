// ── the reel's clock ────────────────────────────────────────────────────────
//
// Thirty five seconds at 96 beats a minute: a beat is 625ms, a bar 2.5s,
// fourteen bars, every scene a bar or a bar and a half, and every word and
// every hit of the sound on a beat. The picture (reel.jsx) and the score
// (scripts/studio-score.mjs) both read this file, so a key is heard on the
// frame its letter lands. Plain script, so node reads it as the page does.
//
// The story, a bar or so a scene: lin writes the thing never said; the
// camera falls back into a hall of everybody's; lin's comes away from the
// wall and is sent privately, and goes up as a light; somewhere else kai
// writes one too; every mutual is revealed on saturday at nine; at nine the
// two lights meet and it is mutual; they both find out; the ones that never
// meet go out, and nobody knows; and the question, to whoever is watching.

import { filmStory } from '../../wall/pixmark.js'

export const MS = 35000
export const BPM = 96
export const BEAT = 60000 / BPM
export const BAR = BEAT * 4
export const beat = (n) => n * BEAT

export const SAY = 'it’s mutual.'
export const A = { name: 'lin', to: 'kai', tint: 'ice', seed: 'lin', text: 'i never said this two years ago. i loved you. maybe i still do.' }
// kai's own note: kai has not read lin's, and cannot until the reveal
export const B = { name: 'kai', to: 'lin', tint: 'amber', seed: 'kai', text: 'i was waiting for you to say it first.' }

// A person's rhythm, the same on every frame: a beat a letter, a longer one
// after a space, longer after a stop, and a small unevenness off the letter
// itself. `step` is the beat, or the beat for each letter. Answers the
// moment each character lands.
export function rhythm(text, from, step, stop = 2.5) {
  const out = []
  let t = from
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const prev = text[i - 1] || ''
    const st = typeof step === 'function' ? step(i) : step
    const wobble = ((Math.sin((i + 1) * 12.9898 + c.charCodeAt(0) * 78.233) * 43758.5453) % 1 + 1) % 1
    t += st * (0.7 + wobble * 0.6) + (prev === ' ' ? st * 0.4 : 0) + (/[.?,]/.test(prev) ? st * stop : 0)
    out.push(t)
  }
  return out
}

// ── the scenes, in ms ───────────────────────────────────────────────────────
// On the song's bars (scripts/studio-score.mjs): a bar is 2.5s, and one bar
// of two beats after kai's send, so the drop and everything after it sit a
// half bar later than a plain count would put them. Every line is on a
// beat, and every line has gone before its scene does.
export const S = {
  // the glass: the first line already there, then the rest, the hardest
  // words slowest, a held breath before the last
  letter: [0, 3750],
  // one shot from the letter on: back from the glass along the wall, a few
  // of its letters read in passing, up the hall's height to a stop, and
  // lin's letter coming away from the wall to the camera
  wall: [3750, 10000], wake: 3700, lines: [5625, 6250, 6875], linesOut: 7900, lift: [8300, 10000],
  // send it privately; the screen says so and goes dark, and the note goes
  // up as a light
  send: [10000, 12500], sendIt: 10000, press: 10625, privately: 11250, rise: 11500, sendOut: 11900,
  // somewhere else, kai, who has not read it and cannot, writes one too;
  // then the line, as kai's goes up
  kai: [12500, 16250], kWake: 12500, kSend: 14063, kRise: 14700, kRead: 14688, kIf: 15000, kOne: 15313, kOut: 15800,
  // every mutual is revealed on saturday at nine: the board finishes the
  // sentence the words begin
  wait: [16250, 19375], wLine: [16563, 17188], days: [17300, 17410, 17520, 17630, 17740, 17850], time: 18060, place: 18360, wOut: 18750,
  // nine o'clock: the two lights find each other (`touch`: there, a little
  // apart; the wait over; touching), and on the touch the film cuts to the
  // phone and the product's own reveal: they are held on the bar the song
  // comes in on, and it is said on that bar's third beat
  touch: [19560, 19840, 19960],
  reveal: [19375, 23750], meet: 20000, glass: 20000, run: 20500, drop: 21250, said: 22500,
  // and they both find out
  notes: [23750, 26250], both: 24063, nOut: 25700,
  // the ones that never meet go out
  ifnot: [26250, 28750], nLine: [26563, 27188], knows: 27500, fOut: 28250, lone: [27030, 27470, 27910],
  // the question, to whoever is watching, over an empty letter of their
  // own; then the name
  ask: [28750, 35000], q: [28750, 29688, 30625], lock: [31250, 32250], url: 32250,
  // the question's words, each on its note of the song's hook (scripts/
  // studio-score.mjs `HOOK`): do they still think a-bout you?
  qWords: [28750, 29063, 29375, 29688, 30000, 30625],
}

// the light going out over the hall from lin's: the moment a letter `dist`
// from lin's, with its own `seed`, comes on
export const RIPPLE = 5.5
export const wakeOf = (dist, seed) => S.wake + (dist / RIPPLE) * 1000 + seed * 160

// lin's note: the first sentence already on the glass on the first frame,
// then `i love`, and a hesitation, and the `d`: loved, then, not love; the
// rest at a hand's pace, a held breath, and the last sentence slower
export const A_HOLD = 32
export function typedA() {
  const t = rhythm(A.text, -2800, (i) => (i < A_HOLD ? 60 : i < 46 ? 84 : 58), 2.5)
  const from = (i, d) => { for (let k = i; k < t.length; k++) t[k] += d }
  const i1 = A.text.indexOf('i loved')
  const iD = i1 + 'i love'.length
  const i2 = A.text.indexOf('maybe')
  from(i1, 150 - t[i1])
  from(iD, t[iD - 1] + 640 - t[iD])
  from(i2, t[i2 - 1] + 180 - t[i2])
  return t
}
export const typedB = () => rhythm(B.text, S.kai[0] + 120, 30)

// ── the mutual's own film against the reel's clock ──────────────────────────
// Its moments as the product tells them (pixmark.js `filmStory`), with a
// sentence of SAY's length, so `said` is the moment its last letter lands.
export const STORY_TIMES = filmStory({ say: { cells: [], w: 0, ends: Array.from(SAY, (_, i) => i + 1) } }).times
const ST = STORY_TIMES
// the run from just after they come in to where they are held, then the
// light over the glass on the drop, and on to the sentence said
export const STORY = [[S.run, ST.enter + 360], [S.drop - 250, ST.catch], [S.drop, ST.glow], [S.said, ST.said], [S.said + 4000, ST.said + 4000]]
export function storyAt(t) {
  if (t <= STORY[0][0]) return STORY[0][1]
  for (let i = 1; i < STORY.length; i++) {
    const [t1, s1] = STORY[i]
    if (t <= t1) {
      const [t0, s0] = STORY[i - 1]
      return s0 + ((t - t0) / (t1 - t0)) * (s1 - s0)
    }
  }
  return STORY[STORY.length - 1][1]
}
export function reelAt(s) {
  for (let i = 1; i < STORY.length; i++) {
    const [t1, s1] = STORY[i]
    if (s <= s1) {
      const [t0, s0] = STORY[i - 1]
      return t0 + ((s - s0) / (s1 - s0)) * (t1 - t0)
    }
  }
  return STORY[STORY.length - 1][0]
}

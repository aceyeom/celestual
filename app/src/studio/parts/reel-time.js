// ── the reel's clock ────────────────────────────────────────────────────────
//
// Thirty three and three quarter seconds at 96 beats a minute: a beat is
// 625ms, a bar 2.5s, thirteen bars and a half, every scene a bar or a bar
// and a bit, and every word and every hit of the sound on a beat. The picture (reel.jsx) and the score
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

export const MS = 33750
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
export const S = {
  // the glass: the first line already there, then the rest, the hardest
  // words slowest, a held breath before the last
  letter: [0, 3750],
  // one shot from the letter on: back from the glass into the hall, the
  // light going out over it from lin's and up it, and lin's letter coming
  // away from the wall to the camera
  wall: [3750, 10000], wake: 3700, lines: [5625, 6250, 6875], linesOut: 8750, lift: [7900, 10000],
  // send it privately, and it goes up as a light
  send: [10000, 12500], sendIt: 10000, press: 10625, privately: 11250, rise: 11500, sendOut: 12100,
  // somewhere else, kai writes one too, and it goes up too
  kai: [12500, 15000], kWake: 12500, kRead: 12813, kIf: 13438, kSend: 14063, kRise: 14600, kOut: 14400,
  // every mutual is revealed on saturday at nine: the week turns on a board
  wait: [15000, 18125], wLine: [15313, 15938], days: [15700, 15810, 15920, 16030, 16140, 16250], time: 16560, place: 16900, wOut: 17500,
  // nine o'clock: the two lights meet, and the product's own reveal
  reveal: [18125, 22500], meet: 18750, glass: 19050, run: 19250, drop: 20250, said: 21300,
  // and they both find out
  notes: [22500, 25000], both: 22813, nOut: 24700,
  // the ones that never meet go out
  ifnot: [25000, 27500], nLine: [25313, 25938], fOut: 27250,
  // the question, and the name lit out of the last light
  ask: [27500, 33750], q: [27750, 28063, 28375], qOut: 29900, lock: [30500, 31500], url: 31500,
}

// the light going out over the hall from lin's: the moment a letter `dist`
// from lin's, with its own `seed`, comes on
export const RIPPLE = 5.5
export const wakeOf = (dist, seed) => S.wake + (dist / RIPPLE) * 1000 + seed * 160

// lin's note: the first sentence already on the glass on the first frame,
// then `i loved you.` at a hand's pace, a held breath, and the last
// sentence slower
export const A_HOLD = 32
export function typedA() {
  const t = rhythm(A.text, -2800, (i) => (i < A_HOLD ? 60 : i < 46 ? 84 : 66), 2.5)
  // `i loved you.` from just after the first frame, and a breath held before
  // `maybe i still do.`, which lands a beat and a half before the wall
  const i1 = A.text.indexOf('i loved')
  const i2 = A.text.indexOf('maybe')
  const d1 = 320 - t[i1]
  for (let i = i1; i < t.length; i++) t[i] += d1
  const d2 = t[i2 - 1] + 430 - t[i2]
  for (let i = i2; i < t.length; i++) t[i] += d2
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

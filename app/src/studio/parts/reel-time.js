// ── unsent, the reel's clock ────────────────────────────────────────────────
//
// Fifteen seconds cut to a score at 120 beats a minute: a beat is 500ms, a
// bar 2s, and every cut, every word and every hit of the sound lands on one
// of them. The picture (reel.jsx) and the score (scripts/studio-score.mjs)
// both read this file, so a key is heard on the frame its letter lands and
// the drop is the frame the two of them meet. Plain script, so node reads
// it as the page does.

import { filmStory } from '../../wall/pixmark.js'

export const MS = 15000
export const BPM = 120
export const BEAT = 60000 / BPM
export const beat = (n) => n * BEAT

export const SAY = 'it’s mutual.'
export const A = { name: 'lin', to: 'kai', tint: 'ice', seed: 'lin', text: 'do you ever think about me when you pass by our cafe?' }
// a note that stands on its own: kai has not read lin's, and cannot until
// the reveal, so it never answers it
export const B = { name: 'kai', to: 'lin', tint: 'amber', seed: 'kai', text: 'i still order two at our cafe.' }

// A person's rhythm, the same on every frame: a beat a letter, a longer one
// after a space, longer after a stop, and a small unevenness off the letter
// itself. `step` is the beat, or the beat for each letter. Answers the
// moment each character lands.
export function rhythm(text, from, step) {
  const out = []
  let t = from
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const prev = text[i - 1] || ''
    const st = typeof step === 'function' ? step(i) : step
    const wobble = ((Math.sin((i + 1) * 12.9898 + c.charCodeAt(0) * 78.233) * 43758.5453) % 1 + 1) % 1
    t += st * (0.7 + wobble * 0.6) + (prev === ' ' ? st * 0.4 : 0) + (/[.?,]/.test(prev) ? st * 2.5 : 0)
    out.push(t)
  }
  return out
}

// ── the scenes, in ms ───────────────────────────────────────────────────────
export const S = {
  // the glass up close, the letters a hand high, the camera after the cursor
  macro: [0, 2000],
  // the camera falls back through the phone into the wall of letters, and
  // the title lands on the second beat of the second bar
  wall: [1750, 3500], title: beat(5),
  // the hard cut on the bar: send, the note going, the envelope at the lens,
  // the words on the beats, the screen going out
  send: [3500, 5500], press: beat(7), sendIt: beat(8), privately: beat(9), off: beat(10),
  // out of the black, the other phone, and the line in two halves
  other: [5500, 7500], bWake: beat(11), read: beat(12), ifThey: beat(13), bSend: 7100,
  // the week on the flaps, a sixteenth a day, the city under them, and the
  // time of the reveal whole on the beat (8500) and held for one
  wait: [7500, 9000], days: [7500, 7625, 7750, 7875, 8000, 8125], time: 8250,
  // the run, on the glass at the size of the room, landing on the drop
  run: [9000, 10000],
  // the drop: they are held, the light goes over everything, the mark
  drop: 10000, mutual: [10000, 12600],
  // and the end, signed
  end: [12600, 15000],
}

// lin's note: the first line already there on the first frame, the rest
// at a quick hand's pace as the camera pushes in on it, and the last word
// slow, so the question mark is what the push in arrives at
export const A_HOLD = 18
export const A_LAND = 48
export const typedA = () => rhythm(A.text, -1100, (i) => (i < A_HOLD || i >= A_LAND ? 60 : 30))
export const typedB = () => rhythm(B.text, 5640, 30)

// ── the mutual's own film against the reel's clock ──────────────────────────
// Its moments as the product tells them (pixmark.js `filmStory`), with a
// sentence of SAY's length, so `said` is the moment its last letter lands.
export const STORY_TIMES = filmStory({ say: { cells: [], w: 0, ends: Array.from(SAY, (_, i) => i + 1) } }).times
// the run from just after they come in to where they are held, a breath
// before the drop; the drop is the light going over the glass (the story's
// `glow`), so the rose is the drop; then on to the sentence said, and the
// story's own pace while the mark lives
const ST = STORY_TIMES
export const STORY = [[S.run[0], ST.enter + 360], [9750, ST.catch], [S.drop, ST.glow], [12350, ST.said], [16350, ST.said + 4000]]
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

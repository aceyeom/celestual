// ── the reel's clock ────────────────────────────────────────────────────────
//
// Twenty two seconds cut to a score at 120 beats a minute: a beat is 500ms,
// a bar 2s, eleven bars, and every cut, every word and every hit of the
// sound lands on one of them. The picture (reel.jsx) and the score
// (scripts/studio-score.mjs) both read this file, so a key is heard on the
// frame its letter lands and the drop is the frame the two of them meet.
// Plain script, so node reads it as the page does.

import { filmStory } from '../../wall/pixmark.js'

export const MS = 22000
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
  // the camera falls back through the phone into the wall of letters, the
  // wall's own line over it a line an eighth, and a wave of the twelve
  // colours over every letter on the beat after
  wall: [1750, 4000], lines: [2500, 2750, 3000], wave: 3000,
  // the whip into the dark on the bar
  whip: [3850, 4150],
  // the berkeley wall: the campanile drawn as its elevation is, from the
  // ground up, its lantern lit on the beat, the campus's letters turning
  // round it; a finger stops them, opens one and hearts it
  berk: [4000, 7500], guides: 4000, plot: [4100, 4950], lamp: 5000, title: 4500, ring: 5000,
  stop: [5250, 5900], tap1: 6000, open: [6000, 6450], tap2: 6750,
  // send, the envelope through the lens, the words on the beats, the screen
  // going out
  send: [7500, 9500], press: 7500, sendIt: 8000, privately: 8500, off: 9000,
  // out of the black, the other phone, and the line in three
  other: [9500, 11500], bWake: 9500, read: 10000, ifThey: 10500, bSend: 11100,
  // the week on the flaps, a sixteenth a day, the city under them, the time
  // of the reveal whole on the beat, and a finger on it that opens the glass
  wait: [11500, 13000], days: [11500, 11625, 11750, 11875, 12000, 12125], time: 12250, tap3: 12750,
  // the run, on the glass at the size of the room, landing on the drop
  run: [13000, 14000],
  // the drop: they are held, the light goes over everything, the mark, and
  // the sentence said on the bar
  drop: 14000, mutual: [14000, 16500], said: 16000,
  // the question, a line a beat, then its letters go to the phone's pixels,
  // two of them circling, and they meet on the last bar: the name, drawn
  ask: [16500, 22000], q: [16500, 17000, 17500], burst: 18500, meet: 20000, lock: [20000, 20650], url: 20650,
}

// the two lights at the end: each half of the question gathered into one
// and set circling the other on the tilt of the mark's ring, a turn and
// three quarters, quicker each turn and closer, until they meet. The score
// reads it too, so each light's notes are heard where it is
export const ORBIT = { cx: 540, cy: 900, a0: 330, ratio: 0.42, tilt: (-16 * Math.PI) / 180, turns: 1.75, from: S.burst + 150 }
export function orbitOf(side, t) {
  const k = Math.min(1, Math.max(0, (t - ORBIT.from) / (S.meet - ORBIT.from)))
  const r = ORBIT.a0 * (1 - k * k * k)
  const turn = 2 * Math.PI * ORBIT.turns * k ** 1.8
  const phi = Math.PI * (side ? 0 : 1) + turn
  const ex = Math.cos(phi) * r
  const ey = Math.sin(phi) * r * ORBIT.ratio
  return {
    x: ORBIT.cx + ex * Math.cos(ORBIT.tilt) - ey * Math.sin(ORBIT.tilt),
    y: ORBIT.cy + ex * Math.sin(ORBIT.tilt) + ey * Math.cos(ORBIT.tilt),
    k, turn,
  }
}

// lin's note: the first line already there on the first frame, the rest
// at a quick hand's pace as the camera pushes in on it, and the last word
// slow, so the question mark is what the push in arrives at
export const A_HOLD = 18
export const A_LAND = 48
export const typedA = () => rhythm(A.text, -1100, (i) => (i < A_HOLD || i >= A_LAND ? 60 : 30))
export const typedB = () => rhythm(B.text, S.bWake + 140, 30)

// ── the mutual's own film against the reel's clock ──────────────────────────
// Its moments as the product tells them (pixmark.js `filmStory`), with a
// sentence of SAY's length, so `said` is the moment its last letter lands.
export const STORY_TIMES = filmStory({ say: { cells: [], w: 0, ends: Array.from(SAY, (_, i) => i + 1) } }).times
// the run from just after they come in to where they are held, a breath
// before the drop; the drop is the light going over the glass (the story's
// `glow`), so the rose is the drop; then on to the sentence said on the bar
const ST = STORY_TIMES
export const STORY = [[S.run[0], ST.enter + 360], [S.drop - 250, ST.catch], [S.drop, ST.glow], [S.said, ST.said], [S.said + 4000, ST.said + 4000]]
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

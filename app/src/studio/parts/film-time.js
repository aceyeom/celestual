// ── unsent, the film's clock ────────────────────────────────────────────────
//
// Every moment the film is cut on, in one place, so the picture (film.jsx)
// and the sound (scripts/studio-sound.mjs) are made from the same numbers:
// a key is heard on the frame its letter lands, the bell on the frame the
// glass finishes saying it, and nowhere else. Plain script, so node reads
// it as the page does.

import { filmStory } from '../../wall/pixmark.js'

export const MS = 15000
export const SAY = 'it’s mutual.'
export const A = { name: 'lin', to: 'kai', tint: 'ice', seed: 'lin', text: 'do you ever think about me when you pass by our cafe?' }
// a note that stands on its own: kai has not read lin's, and cannot until
// the reveal, so it never answers it
export const B = { name: 'kai', to: 'lin', tint: 'amber', seed: 'kai', text: 'i still order two at our cafe.' }

// A person's rhythm, the same on every frame: a beat a letter, a longer one
// after a space, longer after a stop, and a small unevenness off the letter
// itself. Answers the moment each character lands.
export function rhythm(text, from, beat) {
  const out = []
  let t = from
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const prev = text[i - 1] || ''
    const wobble = ((Math.sin((i + 1) * 12.9898 + c.charCodeAt(0) * 78.233) * 43758.5453) % 1 + 1) % 1
    t += beat * (0.7 + wobble * 0.6) + (prev === ' ' ? beat * 0.5 : 0) + (/[.?,]/.test(prev) ? beat * 3 : 0)
    out.push(t)
  }
  return out
}

// ── the moments, in ms of the film ──────────────────────────────────────────
// The film opens mid letter, the phone already lit and half the question
// on it, because its first frame is its cover and a black first frame is
// nothing in a feed.
const aType = -1100
const aBeat = 36
const bType = 4320
const bBeat = 34
export const T = {
  aWake: -600, aType, aBeat, aSend: 1750,
  bWake: 3900, bType, bBeat, bSend: 6100,
  // the two going to sleep after they send, and stepping back
  aSleep: 2450, bSleep: 6620,
  // the week going by: the reveal is Saturday at nine, Pacific, and no note
  // is read before it (docs/PINGS-BY-THE-WEEK.md)
  week: 6550,
  // the two coming together going dark, and the one glass waking
  meet: 6900, dim: 7100, glass: 7390,
  // the step back, and how long it takes
  back: 12460, step: 700,
}
// a send: the key lit for a beat, the words going up the glass a line at a
// time, and the phone's own `sent privately.`
export const SEND = { key: 180, lift: 240 }
export const typedA = () => rhythm(A.text, T.aType, T.aBeat)
export const typedB = () => rhythm(B.text, T.bType, T.bBeat)

// ── the mutual's own film against the film's clock ──────────────────────────
// Its moments as the product tells them (pixmark.js `filmStory`), with a
// sentence of SAY's length, so `said` is the moment the last letter lands.
export const STORY_TIMES = filmStory({ say: { cells: [], w: 0, ends: Array.from(SAY, (_, i) => i + 1) } }).times
// The names at twice its pace, the empty glass after them at three times,
// the two of them and the mark a sixth over it, then its own pace while
// the mark lives. Pairs of [film ms, story ms], straight between.
export const STORY = [[T.glass, 900], [8090, 2300], [8290, 2890], [11380, 6490], [15380, 10490]]
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
// and the other way: the film's moment a story moment falls on
export function filmAt(s) {
  for (let i = 1; i < STORY.length; i++) {
    const [t1, s1] = STORY[i]
    if (s <= s1) {
      const [t0, s0] = STORY[i - 1]
      return t0 + ((s - s0) / (s1 - s0)) * (t1 - t0)
    }
  }
  return STORY[STORY.length - 1][0]
}
// the frame the glass has said it all, which the step back waits on
export const SAID = filmAt(STORY_TIMES.said)

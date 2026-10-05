// ── unsent, the film's clock ────────────────────────────────────────────────
//
// The moments the film is cut on, kept apart from its drawing so the sound
// (scripts/studio-sound.mjs) is made from the same numbers as the pictures
// (film.jsx): a key is heard on the frame its letter lands, and nowhere
// else. Plain script, so node reads it as the page does.

export const MS = 15000
export const A = { name: 'lin', to: 'kai', tint: 'ice', seed: 'lin', text: 'do you ever think about me when you pass by our cafe?' }
export const B = { name: 'kai', to: 'lin', tint: 'amber', seed: 'kai', text: 'every day. i still order two.' }

// in ms of the film
export const T = {
  aWake: 250, aType: 760, aBeat: 36, aSend: 3700, aSleep: 4400,
  bWake: 6000, bType: 6420, bBeat: 34, bSend: 7750,
  mail: 8000, dim: 8350, glass: 8640, back: 13300,
}

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
export const typedA = () => rhythm(A.text, T.aType, T.aBeat)
export const typedB = () => rhythm(B.text, T.bType, T.bBeat)

// The mutual's own film against the film's clock: the names at half again
// its pace, the rest at a fifth over it, then its own pace while the mark
// lives. Pairs of [film ms, story ms], straight between.
export const STORY = [[T.glass, 900], [9540, 2300], [12900, 6490], [16900, 10490]]
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

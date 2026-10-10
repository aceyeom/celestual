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
// wall and is sent privately, its own pixels folded into an envelope that
// goes out through the lens into the dark, to wait; every mutual is
// revealed on saturday at nine, and in the week somebody's note comes in;
// at nine the two find each other and are one light, and out of it comes
// lin's letter, which turns over: on its other side is kai's, read for the
// first time, and it is mutual; the ones that never meet go out, and nobody
// knows; and the question, to whoever is watching.

export const MS = 35000
export const BPM = 96
export const BEAT = 60000 / BPM
export const BAR = BEAT * 4
export const beat = (n) => n * BEAT

export const A = { name: 'lin', to: 'kai', tint: 'ice', seed: 'lin', text: 'i never said this two years ago. i loved you. maybe i still do.' }
// kai's own note, to lin, sent on the thursday: never seen being written,
// and read for the first time when it is mutual
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
// On the song's bars (scripts/studio-score.mjs): a bar is 2.5s; the reveal
// begins on a bar of two beats, the letter coming at us, so the bar it turns
// over on sits a half bar later than a plain count would put it, and from
// there the song moves every two beats, so a scene may begin on any second
// beat. Every line is on a beat, and goes as its scene ends.
export const S = {
  // the glass: the first line already there, then the rest, the hardest
  // words slowest, a held breath before the last
  letter: [0, 3750],
  // one shot from the letter on: back from the glass along the wall (`back`,
  // from the moment the last letter is typed until the wall is the whole
  // frame), a few of its letters read in passing, up the hall's height to a
  // stop, and lin's letter coming away from the wall to the camera
  wall: [3750, 10000], back: [3290, 5650], wake: 3700, lines: [5625, 6250], linesOut: 8350, lift: [8300, 10000],
  // send it privately: the key; the letter's own pixels gathered into the
  // envelope; sealed; the phone going out behind it to a line and a point;
  // the envelope coming at the lens; its light over everything
  send: [10000, 12500], sendIt: 10000, privately: 10313, sendOut: 11450, press: 10625,
  gather: [10700, 11450], seal: [11450, 11650], crt: [11600, 11950], lens: [11950, 12480], wash: [12400, 12650],
  // and through the lens into the dark, where it goes away from us to wait
  night: [12500, 15000], away: [12500, 13300], nLines: [12813, 13438], nOut: 14900,
  // every mutual is revealed on saturday at nine: the sentence ends on a
  // clock that runs through the week; somebody's note comes in on the
  // thursday; at nine the camera leans in, and the two find each other
  // (`touch`: there, a little apart; the wait over; touching)
  date: [15000, 20000], dLines: [15313, 15625, 16250], lapse: [16250, 18125], kaiIn: 17188, dOut: 19350,
  // the week's other notes, as they come in
  others: [16380, 16560, 16760, 16960, 17380, 17560, 17760, 17940],
  lean: [19000, 20000], touch: [19560, 19840, 19960],
  // on the touch the two lights go out together, and out of them, once
  // they have begun to spread, lin's letter, the one that was sent, comes
  // at us (`swoosh`); it turns over (`flip`, on its edge on the bar the
  // song comes in on), and on its other side is kai's, read for the first
  // time; it is said on that bar's third beat, and then the rest of it
  reveal: [20000, 25000], meet: 20000, swoosh: [20300, 21050], flip: [20800, 21700], run: 20500, drop: 21250, said: 22500, both: 23750, rOut: 24760,
  // kai's letter melting back into the light, and its light going out
  // with the rest by the cut
  give: [24100, 25000],
  // the ones that never meet go out, each as a screen does, to a line and a
  // point
  ifnot: [25000, 27500], fLines: [25313, 25938], lone: [25625, 26250, 26875], fOut: 27300,
  // the question, to whoever is watching, a word on each note of the hook
  // (scripts/studio-score.mjs `HOOK`): do they still think a-bout you? and
  // then left there, whole, for as long as it took to ask
  ask: [27500, 31250], qWords: [27500, 27813, 28125, 28438, 28750, 29375], qOut: 31250,
  // and the name, lit a cell at a time from its star, and the address
  name: [31250, 35000], lock: [31250, 32250], url: 32250,
}

// the address under the name, typed as a hand types it, a breath after
// its dot
export const URL = 'celestual.us'
export const typedUrl = () => rhythm(URL, S.url - 18, 40, 1.4)

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

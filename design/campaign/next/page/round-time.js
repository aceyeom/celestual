// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ROUND: the clock every part of the film reads                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// One night in Berkeley, letters on the wall, each to the next of the people
// in it and the last to the first. The frame is a split-flap display hinged
// at y 960: the one writing below, right way up; the one they write to
// above, mirrored in the seam. This file is the film's time: which world is
// where, what each phone shows, when each flap lets go and lands, what the
// clock reads and every sound the score has to hit. It is pure and node
// safe, so the page, the render, the score and the checks all read the same
// frame.
//
// The grid is the score's. 150 beats a minute in three, 30 frames a second:
// a beat is 12 frames, an eighth 6, a sixteenth 3, a bar 36, and every
// musical event lands on a whole frame. A link is four bars, 144 frames.
//
// Two versions are written here, each a cast and a shape, and `CUT` picks
// the one this module serves:
//
//   final   four people, 25 bars, 900 frames, 30 s: the film that is made
//     bars  1 to  2   the 51B, 5:14 pm: a seat given
//     bars  3 to  6   sol to wren
//     bars  7 to 10   wren to pia
//     bars 11 to 14   pia to yuna
//     bars 15 to 19   yuna to the one who always stands; the hinge catches
//                     for bar 19, the one broken rule
//     bar  20         the contact sheet; bar 21 the cascade
//     bars 22 to 25   the line, the lockup, and the loop flap onto bar 1
//   long    six people, 32 bars, 1152 frames, 38.4 s: the script as first
//           written (ROUND.md), with the reading room and the corner
//
// Frame FRAMES is frame 0. The delivered file starts at the loop flap's
// release (`FILE_START`), so its first frame is the wall and its loop is the
// film's own.

export const CUT = 'final'

export const FPS = 30
export const BPM = 150
export const BEAT = 12
export const EIGHTH = 6
export const SIXTEENTH = 3
export const BAR = 36
export const W = 1080
export const H = 1920
export const SEAM = 960
export const CELL = 6
export const SPINE = 744
// every world is drawn this far right of where it was laid out (its scene's
// own spine is at 702), so the larger phone keeps clear of the writer; the
// world programs carry the same number (round-worlds.js, SHIFT)
export const SHIFT = 42

// the frame a bar, beat and eighth fall on (bars and beats count from 1)
export const at = (bar, beat = 1, eighth = 0) => (bar - 1) * BAR + (beat - 1) * BEAT + eighth * EIGHTH
export const msOf = (f) => (f * 1000) / FPS
export const frameOf = (ms) => Math.floor((ms * FPS) / 1000 + 1e-6)

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const span = (x, a, b) => clamp((x - a) / (b - a))
const sm = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }

// a number from two others, the same every time it is asked
export function hash(a, b = 0) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

// ── the people and their letters ───────────────────────────────────────────
// `greet` is the line the product prints over a letter: `dear` and the name,
// or the writer's own. `words` is what is typed, with the hand's moments
// written into it: `|` a pause of an eighth, `<n` the composer's clear key
// pressed n times, a character at a time. `flip` is the note each sounds as
// its world turns into its letter at the end.
const SOL = { writer: 'sol', pronoun: 'they', build: 'HIM', world: 0, greet: 'dear wren', to: 'wren', words: 'you hum when you think. i hope nobody ever tells you.', colour: 'amber', kind: 'lit', bat: 4, clock: '5:14 pm', stamp: '11/05/26', read: true, flip: 'Bb4' }
const YUNA = { writer: 'yuna', pronoun: 'she', build: 'HER', world: 5, to: 'sol', greet: 'to the one who always stands', greetFrom: 'dear ', words: 'you give your seat to whoever looks most tired. last night it was me.', colour: 'rose', kind: 'lit', bat: 4, clock: '7:14 am', stamp: '11/06/26', hesitates: true, flip: 'F4' }
const CASTS = {
  // a closed loop in one city: sol hears wren hum at the café; wren sat up
  // with her grandad on pia's ward; pia buys bread at yuna's after every
  // night shift; yuna is the one sol gives the seat to
  final: [
    SOL,
    { writer: 'wren', pronoun: 'she', build: 'HER', world: 1, to: 'pia', greet: 'dear pia', words: 'you sang my grandad to sleep. | i was awake.', colour: 'acid', kind: 'brat', bat: 3, clock: '9:14 pm', stamp: '11/05/26', flip: 'G4' },
    { writer: 'pia', pronoun: 'she', build: 'HER', world: 3, to: 'yuna', greet: 'dear yuna', words: "||| i don't even like bread.", colour: 'ice', kind: 'lit', bat: 1, clock: '1:14 am', stamp: '11/06/26', flip: 'C5' },
    { ...YUNA, flip: 'F4' },
  ],
  long: [
    SOL,
    { writer: 'wren', pronoun: 'she', build: 'HER', world: 1, to: 'hugo', greet: 'dear hugo', words: "i laughed at your band. i'm in one now. || sorry.", colour: 'acid', kind: 'brat', bat: 3, clock: '9:14 pm', stamp: '11/05/26', flip: 'G4' },
    { writer: 'hugo', pronoun: 'he', build: 'HIM', world: 2, to: 'pia', greet: 'dear pia', words: 'you sang my grandad to sleep. i was awake.', colour: 'green', kind: 'lit', bat: 2, clock: '11:14 pm', stamp: '11/05/26', flip: 'Eb2' },
    { writer: 'pia', pronoun: 'she', build: 'HER', world: 3, to: 'omar', greet: 'dear omar', words: "i don't remember the fight. i miss || <6 | i remember everything else.", colour: 'ice', kind: 'lit', bat: 1, clock: '1:14 am', stamp: '11/06/26', flip: 'C3', plan: { rise: [2, 16], greet: 16, type: [18, 93] } },
    { writer: 'omar', pronoun: 'he', build: 'HIM', world: 4, to: 'yuna', greet: 'dear yuna', words: "||| i don't even like bread.", colour: 'violet-yellow', kind: 'riso', bat: 0, clock: '3:14 am', stamp: '11/06/26', flip: 'D5' },
    YUNA,
  ],
}
// the shape: bars before the first link, a link's bars, the last link's
// (with its catch), the whole film's, and where the end's words fall
const SHAPES = {
  final: { bars: 25, open: 2, link: 4, last: 5, line: [22], lockup: [22, 2, 1] },
  long: { bars: 32, open: 2, link: 4, last: 5, line: [30], lockup: [31] },
}
const SHAPE = SHAPES[CUT]
export const BARS = SHAPE.bars
export const FRAMES = BARS * BAR
export const MS = (FRAMES * 1000) / FPS
export const wrap = (f) => ((f % FRAMES) + FRAMES) % FRAMES

export const LINKS = CASTS[CUT].map((c, i, all) => ({
  n: i + 1, ...c, start: at(1 + SHAPE.open + i * SHAPE.link), bars: i === all.length - 1 ? SHAPE.last : SHAPE.link,
}))
export const N = LINKS.length
// the end: the contact sheet lands as the last link's pane does, the cascade
// a bar later, then the line and the lockup
export const SHEET = LINKS[N - 1].start + LINKS[N - 1].bars * BAR
export const CASCADE = SHEET + BAR
export const LINE = at(...SHAPE.line)
export const LOCKUP = at(...SHAPE.lockup)
// the delivered file's first frame: the loop flap's release
export const FILE_START = FRAMES - BEAT
export const MAX_BODY = 280

// ── the worlds ─────────────────────────────────────────────────────────────
// Each is drawn once and used twice: above, mirrored, as somebody who does
// not know; then fallen and right way up, writing. `origin` is the frame its
// own clock reads 0 (the moment it lands as the writer's world; the bus's is
// bar 1), so a world's clock runs on unbroken from one appearance to the
// next. A world nobody in this cut lives in keeps an origin of 0.
const PLACES = [
  { id: 'bus', name: 'the 51B', time: '5:14 pm', light: 'the passing street lights and the ceiling strip', spine: 'the grab pole sol holds' },
  { id: 'cafe', name: 'the café', time: '9:14 pm', light: 'one spot left on', spine: "the spot's hanging pipe" },
  { id: 'library', name: 'the reading room', time: '11:14 pm', light: 'two rows of green shaded lamps', spine: 'a column' },
  { id: 'roof', name: 'the roof', time: '1:14 am', light: 'the city below', spine: 'the beacon mast' },
  { id: 'corner', name: 'the corner', time: '3:14 am', light: 'one street light', spine: "the street light's pole" },
  { id: 'bakery', name: 'the bakery', time: '7:14 am', light: 'first light through the window', spine: 'the window mullion' },
]
// which link a world's person writes in, or -1
export const linkOfWorld = (k) => LINKS.findIndex((L) => L.world === k)
export const WORLDS = PLACES.map((p, k) => {
  const i = linkOfWorld(k)
  return { ...p, origin: i > 0 ? LINKS[i].start : 0 }
})

// ── the plan of a link, in frames from its start ──
// 0 the flap has landed; the phone rises and lights; the composer with its
// greeting; the words; the tap on `send anonymously`; the colour runs out of
// the phone; the one writing and the one above both look up; the colour
// reaches the hinge and it lets go; the next link lands.
// The first link follows the seat, so sol's phone is already rising in bar
// 2, and it is the one that shows `being read` before the letter is up. The
// last is five bars: yuna's phone is propped on the flour bin and already
// on, she turns `dear` into `to`, writes, and the hinge catches for a bar.
const STD = { rise: [6, 24], greet: 24, type: [30, 90], send: 96, read: null, flood: 96, look: 108, release: 132, land: 144 }
const FIRST = { rise: [-18, 0], greet: 0, type: [6, 66], send: 72, read: [72, 96], flood: 96, look: 108, release: 132, land: 144 }
const LAST = { rise: null, greet: 0, edit: [6, 24], type: [30, 102], send: 108, read: null, flood: 108, look: 120, catch: 144, release: 170, land: 180 }
export const PLAN = LINKS.map((L, i) => (i === 0 ? FIRST : i === N - 1 ? LAST : { ...STD, ...(L.plan || {}) }))
export const FLOOD = 36

// ── typing ─────────────────────────────────────────────────────────────────
// A writer's words land a word at a time (a phone's suggestion strip, or a
// glide across the keys) in human bursts: longer words take longer, a full
// stop is a breath, and every landing is on the sixteenth grid. Returns
// [[frame, text], ...].
export function typing(script, f0, f1) {
  const tokens = []
  for (const raw of script.split(' ')) {
    if (!raw) continue
    if (/^\|+$/.test(raw)) { tokens.push({ pause: raw.length }); continue }
    if (/^<\d+$/.test(raw)) { tokens.push({ clear: +raw.slice(1) }); continue }
    tokens.push({ word: raw })
  }
  // a clear takes exactly its presses, a sixteenth each; the rest of the
  // window is shared out by weight: a word costs its length, a stop after it
  // a breath, a pause an eighth
  const cost = (t) => t.word ? 1.2 + 0.16 * t.word.length + (/[.]$/.test(t.word) ? 1.4 : /[,]$/.test(t.word) ? 0.7 : 0)
    : t.pause ? 1.6 * t.pause : 0
  const fixed = tokens.reduce((n, t) => n + (t.clear ? (t.clear + 1) * SIXTEENTH : 0), 0)
  const total = tokens.reduce((n, t) => n + cost(t), 0)
  const room = f1 - f0 - fixed
  const out = []
  let text = ''
  let acc = 0
  let held = 0
  const q = (x) => f0 + held + Math.round(((x / total) * room) / SIXTEENTH) * SIXTEENTH
  for (const t of tokens) {
    if (t.word) {
      text = text ? `${text} ${t.word}` : t.word
      out.push([q(acc), text])
    } else if (t.clear) {
      // the clear key, one character a press, a sixteenth apart
      const start = q(acc)
      for (let i = 1; i <= t.clear; i++) {
        text = text.slice(0, -1)
        out.push([start + i * SIXTEENTH, text.replace(/\s+$/, '')])
      }
      text = text.replace(/\s+$/, '')
      held += (t.clear + 1) * SIXTEENTH
    }
    acc += cost(t)
  }
  // never two events on one frame: a later one waits a sixteenth
  for (let i = 1; i < out.length; i++) if (out[i][0] <= out[i - 1][0]) out[i][0] = out[i - 1][0] + SIXTEENTH
  return out
}

function textAt(events, f) {
  let s = ''
  let prev = ''
  let last = -Infinity
  for (const [g, text] of events) if (g <= f) { prev = s; s = text; last = g }
  // how many characters at its end came with the last change (none when it
  // took some back)
  let k = 0
  while (k < prev.length && k < s.length && prev[k] === s[k]) k++
  return { text: s, since: last, fresh: s.length > prev.length ? s.length - k : 0 }
}

// the schedules, worked out once
const TYPED = LINKS.map((L, i) => {
  const P = PLAN[i]
  const body = typing(L.words, L.start + P.type[0], L.start + P.type[1])
  let greet = null
  if (P.edit) {
    // the composer made the line from her custom name, `dear the one who
    // always stands`; she puts the caret after `dear`, takes it back a
    // character a press, and types `to` in its place
    const rest = L.greet.replace(/^to/, '')
    const steps = ['dear', 'dea', 'de', 'd', '', 't', 'to']
    greet = steps.map((head, k) => [L.start + (k === 0 ? P.greet : P.edit[0] + (k - 1) * SIXTEENTH), head + rest])
  }
  return { greet, rest: P.edit ? L.greet.replace(/^to/, '') : '', body, full: body.length ? body[body.length - 1][1] : '' }
})

// ── the flap ───────────────────────────────────────────────────────────────
// A pane hinged at the seam falls as a plate does: from a small kick at the
// top, gravity's torque grows with the sine of its angle, so it creeps, then
// rushes, and slaps flat on the downbeat. One table, worked out once.
const GRAV = (() => {
  const th0 = 0.07
  let th = th0
  let w = 0
  const dt = 1e-4
  const pts = [[0, th0]]
  let t = 0
  while (th < Math.PI) {
    w += Math.sin(th) * dt
    th += w * dt
    t += dt
    if (Math.floor(t / 0.005) !== Math.floor((t - dt) / 0.005)) pts.push([t, th])
  }
  pts.push([t, Math.PI])
  return { pts, end: t }
})()
function gravity(u) {
  // u in [0, 1] of the fall's time; the angle, 0 standing to PI flat
  const x = clamp(u) * GRAV.end
  const p = GRAV.pts
  let lo = 0
  let hi = p.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x) lo = m; else hi = m }
  const k = (x - p[lo][0]) / ((p[hi][0] - p[lo][0]) || 1)
  return p[lo][1] + (p[hi][1] - p[lo][1]) * k
}
// after the slap, a rebound of a degree or two and a smaller one, settled by
// the eighth frame
function rebound(df) {
  if (df < 0 || df > 8) return Math.PI
  return Math.PI - 0.042 * Math.exp(-0.42 * df) * Math.abs(Math.sin((Math.PI * df) / 3.6))
}
// the angle of a pane released at `r` and landing at `l`
export function flapAngle(f, r, l) {
  if (f < r) return 0
  if (f < l) return gravity((f - r) / (l - r))
  return rebound(f - l)
}
// a flap's angle at any moment of the film, a fraction of a frame included,
// for the shutter's blur
export function angleOf(fl, t) {
  if (fl.caught != null && t < fl.r) return t < fl.c ? 0 : trembling(Math.floor(t), fl.c, fl.r)
  return flapAngle(t, fl.r, fl.l)
}
// the one broken rule: the last link's hinge catches when the colour reaches
// it and trembles for the bar before it lets go
function trembling(f, a, b) {
  const k = span(f, a, b)
  const n = hash(f, 27) - 0.5
  const shake = Math.abs(Math.sin(f * 1.9) * 0.6 + Math.sin(f * 0.71) * 0.4)
  return (0.012 + 0.07 * k * k) * shake + 0.008 * n
}

// ── the clock on the hinge ─────────────────────────────────────────────────
// The product's own digits (`art.jsx` `FlapDigit`). Every scene is at
// fourteen minutes past, so only the hour drum turns, through every hour
// between, and the meridiem drum turns as it passes twelve. A step is the
// product's fold of 130 ms, fold of 130 ms and 40 ms still: 9 frames, a
// dotted eighth, the last landing on the downbeat.
const HOURS = LINKS.map((L) => +L.clock.split(':')[0])
const MERID = LINKS.map((L) => L.clock.split(' ')[1])
export const STEP = 9
export const RIFFLES = LINKS.slice(1).map((L, i) => {
  const steps = []
  let h = HOURS[i]
  let m = MERID[i]
  while (h !== HOURS[i + 1]) {
    h = (h % 12) + 1
    if (h === 12) m = m === 'pm' ? 'am' : 'pm'
    steps.push({ hour: h, merid: m })
  }
  return { land: L.start, steps, start: L.start - steps.length * STEP, from: { hour: HOURS[i], merid: MERID[i] } }
})
export function clockAt(f) {
  // hidden from the contact sheet on; when the loop flap lands the bus, its
  // plates turn over from blank to the bus's time, all four at once
  if (f >= SHEET) return { show: false }
  if (f < STEP) return { show: true, hour: HOURS[0], merid: MERID[0], prev: { hour: '', merid: '' }, fresh: true, fold: f / STEP, minutes: '14' }
  let now = { hour: HOURS[0], merid: MERID[0] }
  let prev = null
  let fold = 0
  for (const r of RIFFLES) {
    if (f >= r.land) { now = r.steps[r.steps.length - 1]; continue }
    if (f >= r.start) {
      const i = Math.floor((f - r.start) / STEP)
      prev = i === 0 ? r.from : r.steps[i - 1]
      now = r.steps[i]
      fold = ((f - r.start) % STEP) / STEP
    }
    break
  }
  return { show: true, hour: now.hour, merid: now.merid, prev, fold, minutes: '14' }
}

// ── the colour ─────────────────────────────────────────────────────────────
// Where the flood stands in a link: 0 before the letter is up, 1 when every
// cell of the writer's world has turned. Eased as the product eases a wash,
// quick at the phone and slower into the far corners; the hinge is the last
// thing it reaches.
export function floodAt(i, f) {
  const P = PLAN[i]
  const u = clamp((f - LINKS[i].start - P.flood) / FLOOD)
  return u <= 0 ? 0 : 1 - Math.pow(1 - u, 1.6)
}

// ── the phone ──────────────────────────────────────────────────────────────
// What the writer's phone shows at a frame: how far it has risen into the
// picture, how lit it is, which state the composer is in, and what it says.
export function phoneAt(i, f) {
  const L = LINKS[i]
  const P = PLAN[i]
  const x = f - L.start
  const typed = TYPED[i]
  const rise = P.rise ? sm(span(x, P.rise[0], P.rise[1])) : 1
  // (a phone that was already there wakes as the flap lands on it)
  const lit = P.rise ? span(x, P.rise[0] + 6, P.rise[1] + 2) : span(x, 0, 6)
  let mode = x < P.greet ? 'waking' : 'draft'
  if (x >= P.send) mode = 'up'
  if (P.read && x >= P.read[0] && x < P.read[1]) mode = 'read'
  const body = textAt(typed.body, f)
  let greet = L.greet
  let greetSince = -Infinity
  let greetCut = null
  if (typed.greet) { const g = textAt(typed.greet, f); greet = g.text; greetSince = g.since; greetCut = g.text.length - typed.rest.length }
  // the key under the thumb as each word lands: the last letter of it
  const last = body.text.slice(-1)
  const keyHit = last === ' ' ? 99 : 'qwertyuiopasdfghjklzxcvbnm'.indexOf(last)
  return {
    mode, rise, lit, greet, greetSince, greetCut, greetFull: L.greet,
    editing: !!(P.edit && x >= P.edit[0] && x < P.edit[1] + SIXTEENTH),
    text: mode === 'read' ? '' : body.text, since: body.since, freshChars: body.fresh, keyAt: body.since, keyHit,
    count: `${MAX_BODY - body.text.length}/1`, stamp: L.stamp, bat: L.bat,
    caret: mode === 'draft', pressed: x >= P.send && x < P.send + SIXTEENTH,
    full: typed.full, colour: L.colour, kind: L.kind,
  }
}

// ── the gesture ────────────────────────────────────────────────────────────
// The canon: at every flood the one writing looks up, and the one above, in
// their own world and their own hour, looks up on the same frame. People move
// on twos, so the envelope steps every other frame.
export function lookAt(f, f0) {
  const g = f - (f % 2)
  return sm(span(g, f0, f0 + 10)) * (1 - sm(span(g, f0 + 34, f0 + 52)))
}

// how far a world's person is looking up at frame f: the sum of the looks it
// takes part in, as the one writing (its own link) and as the one above (the
// link before), so it carries on unbroken through the flap that brings it down
export function lookOf(k, f) {
  const own = linkOfWorld(k)
  if (own < 0) return 0
  const above = (own + N - 1) % N
  return Math.min(1, lookAt(f, LINKS[own].start + PLAN[own].look) + lookAt(f, LINKS[above].start + PLAN[above].look))
}

// a world's own clock when it is seen at frame f; the bus above yuna, and
// both worlds under the loop flap, are in the seconds before bar 1
function clockOf(k, f, before = false) {
  return before ? f - FRAMES - WORLDS[k].origin : f - WORLDS[k].origin
}

// ── the reading room's lamps ───────────────────────────────────────────────
// The moment each lamp goes out, on the room's own clock, by the lamp's
// place (row by row, nearest first, the left row then the right): from the
// far end, the rows in turn, the last three nearest as hugo's link opens.
export const LAMPS_OFF = (() => {
  const j = linkOfWorld(2)
  if (j < 1) return new Array(12).fill(1e6)
  const order = [5, 11, 4, 10, 3, 9, 2, 8, 1, 7, 0, 6]
  const off = new Array(12)
  order.forEach((idx, k) => { off[idx] = (k < 9 ? LINKS[j - 1].start + BEAT + k * BEAT : LINKS[j].start + (k - 9) * BEAT) - WORLDS[2].origin })
  return off
})()

// the worlds of the contact sheet at frame f, each in its letter's colour and
// as it stood when its letter went up: running on from its link's last frame
export function sheetAt(f) {
  return LINKS.map((L) => {
    const g = L.start + L.bars * BAR - 1 + (f - SHEET)
    return { world: L.world, id: WORLDS[L.world].id, clock: clockOf(L.world, g), palette: L.colour, flood: 1, look: lookOf(L.world, g) }
  })
}

// the cascade: a flip on each eighth of its bar, in the order the letters
// went up, each a frame or so early or late, as a board's modules are
const JITTER = [0, 1, -1, 2, 0, 1]
export const flipAt = (i) => CASCADE + i * EIGHTH + JITTER[i % JITTER.length]

// ── one frame of the film ──────────────────────────────────────────────────
export function frameAt(input) {
  const f = wrap(Math.round(input))
  const fr = { f, ms: msOf(f), bar: Math.floor(f / BAR) + 1, beat: Math.floor((f % BAR) / BEAT) + 1, clock: clockAt(f) }
  const world = (k, clock, extra = {}) => ({ world: k, id: WORLDS[k].id, clock, ...extra })

  // the open: the bus, the café above; sol's phone already on its way up
  if (f < LINKS[0].start) {
    const a = LINKS[0].world
    const b = LINKS[1].world
    fr.phase = 'open'
    fr.bottom = world(a, clockOf(a, f), { palette: 'night', flood: 0, look: lookOf(a, f) })
    fr.top = world(b, clockOf(b, f), { palette: 'night', look: lookOf(b, f) })
    if (f >= LINKS[0].start + PLAN[0].rise[0]) fr.phone = phoneAt(0, f)
    return fr
  }
  // the links
  for (let i = 0; i < N; i++) {
    const L = LINKS[i]
    const P = PLAN[i]
    const len = L.bars * BAR
    if (f < L.start || f >= L.start + len) continue
    const x = f - L.start
    const next = LINKS[(i + 1) % N].world
    const flood = floodAt(i, f)
    fr.phase = 'link'
    fr.link = L.n
    fr.bottom = world(L.world, clockOf(L.world, f), { palette: L.colour, flood, look: lookOf(L.world, f) })
    fr.phone = phoneAt(i, f)
    fr.top = world(next, clockOf(next, f, i === N - 1), { palette: 'night', look: lookOf(next, f) })
    if (i < N - 1) {
      // the pane: released when the colour reaches the hinge, landing on the
      // next link's downbeat, carrying the next world upright on its back
      const r = L.start + P.release
      const l = L.start + P.land
      if (f >= r) {
        const after = LINKS[(i + 2) % N].world
        fr.flap = {
          kind: 'pane', theta: flapAngle(f, r, l), lands: l, r, l,
          front: fr.top, back: fr.top,
          revealed: world(after, clockOf(after, f, (i + 2) % N === 0), { palette: 'night', look: lookOf(after, f) }),
          under: fr.bottom,
        }
      }
    } else {
      // the hinge catches when the colour reaches it, trembles, and lets go
      const c = L.start + P.catch
      const r = L.start + P.release
      const l = L.start + P.land
      if (f >= c) {
        fr.flap = {
          kind: 'card', theta: f < r ? trembling(f, c, r) : flapAngle(f, r, l), lands: l, caught: f < r, c, r, l,
          front: fr.top, back: { card: 'sheet', half: 'bottom' }, revealed: { card: 'sheet', half: 'top' }, under: fr.bottom,
        }
      }
    }
    // the pane that landed this link still settling, a sliver of the last
    // writer's world under it
    if (i > 0 && x < 9) {
      const prev = LINKS[i - 1]
      fr.settle = { theta: rebound(x), under: world(prev.world, clockOf(prev.world, f), { palette: prev.colour, flood: 1 }) }
    }
    return fr
  }
  // the end: the contact sheet, the cascade, the wall, the line, the lockup
  fr.phase = 'end'
  fr.sheet = sheetAt(f)
  fr.cascade = LINKS.map((L, i) => {
    const l = flipAt(i)
    const r = l - 5
    return { writer: L.writer, r, l, theta: f < r ? 0 : f < l ? gravity((f - r) / (l - r)) : rebound(f - l), done: f >= l }
  })
  fr.line = f >= LINE
  fr.lockup = f >= LOCKUP
  const last = LINKS[N - 1]
  if (f < SHEET + 9) fr.settle = { theta: rebound(f - SHEET), under: world(last.world, clockOf(last.world, f), { palette: last.colour, flood: 1 }) }
  // the loop: the end card's top half falls onto the bus at the moment
  // before bar 1, with the café revealed above it
  const r = FRAMES - BEAT
  if (f >= r) {
    const a = LINKS[0].world
    const b = LINKS[1].world
    fr.flap = {
      kind: 'card', theta: flapAngle(f, r, FRAMES), lands: FRAMES, r, l: FRAMES,
      front: { card: 'end', half: 'top' },
      back: world(a, clockOf(a, f, true), { palette: 'night', flood: 0, look: lookOf(a, f) }),
      revealed: world(b, clockOf(b, f, true), { palette: 'night', look: lookOf(b, f) }),
      under: { card: 'end', half: 'bottom' },
    }
  }
  return fr
}

// ── what the score has to hit ──────────────────────────────────────────────
// Every frame exact sound in the film, for the score's foley and for the
// check that the picture and the sound agree.
export function events() {
  const out = []
  const ev = (f, kind, extra = {}) => out.push({ f: wrap(f), ms: msOf(wrap(f)), kind, ...extra })
  // the landings, each one dry click; the hinge catching; the loop
  for (let i = 0; i < N - 1; i++) ev(LINKS[i].start + PLAN[i].land, 'clack', { link: i + 2 })
  ev(LINKS[N - 1].start + PLAN[N - 1].catch, 'catch')
  ev(LINKS[N - 1].start + PLAN[N - 1].release, 'release')
  ev(SHEET, 'clack', { to: 'sheet' })
  ev(FRAMES, 'clack', { to: 'loop' })
  // the cascade, each flip sounding its writer's note of the last chord
  LINKS.forEach((L, i) => ev(flipAt(i), 'flip', { writer: L.writer, note: L.flip }))
  ev(LINE, 'line')
  ev(LOCKUP, 'lockup')
  // the clock's folds
  for (const r of RIFFLES) r.steps.forEach((st, k) => ev(r.start + (k + 1) * STEP, 'fold', { hour: st.hour }))
  ev(STEP, 'fold', { hour: HOURS[0], from: 'blank' })
  // the sends, the reading and the floods
  LINKS.forEach((L, i) => {
    const P = PLAN[i]
    ev(L.start + P.send, 'send', { writer: L.writer })
    if (P.read) ev(L.start + P.read[0], 'read')
    ev(L.start + P.flood, 'flood', { writer: L.writer, world: L.world, colour: L.colour, frames: FLOOD })
    ev(L.start + P.look, 'look', { writer: L.writer })
  })
  // the words, each a soft key
  TYPED.forEach((t, i) => {
    for (const [g] of t.body) ev(g, 'key', { writer: LINKS[i].writer })
    if (t.greet) for (const [g] of t.greet.slice(1)) ev(g, 'key', { writer: LINKS[i].writer })
  })
  // the reading room, where it is in the cut: its lamps going out
  const lib = linkOfWorld(2)
  if (lib > 0) LAMPS_OFF.forEach((w, k) => ev(WORLDS[2].origin + w, 'lamp', { lamp: k }))
  // the café: the case's two latches while wren is above
  const cafe = linkOfWorld(1)
  if (cafe > 0) { ev(LINKS[cafe].start - 60, 'latch'); ev(LINKS[cafe].start - 54, 'latch') }
  // the corner, where it is in the cut: the crossing's locator once a second
  // while it is on screen, the walk signal as its letter goes up
  const cor = linkOfWorld(4)
  if (cor > 0) {
    for (let g = LINKS[cor - 1].start; g < LINKS[cor].start + LINKS[cor].bars * BAR; g += 30) ev(g, 'tick')
    ev(LINKS[cor].start + PLAN[cor].send, 'walk')
  }
  // the bus: a pole past the window on every downbeat, a street light on
  // every other, while the bus is on screen (Star Guitar's rule)
  for (let b = 1; b <= BARS; b++) {
    const g = at(b)
    if (g < LINKS[1].start || (g >= LINKS[N - 1].start && g < SHEET)) ev(g, b % 2 ? 'streetlight' : 'pole')
  }
  ev(at(1, 3), 'chime')
  return out.sort((a, b) => a.f - b.f || (a.kind < b.kind ? -1 : 1))
}

// ── the cuts, as sequences of the film's own frames ────────────────────────
export const CUTS = {
  full: [[0, FRAMES]],
  // the delivered file: from the loop flap's release round to the frame before it
  file: [[FILE_START, FRAMES], [0, FILE_START]],
}
export function cutFrame(cut, i) {
  let k = i
  for (const [a, b] of CUTS[cut]) { if (k < b - a) return a + k; k -= b - a }
  return null
}
export const cutLength = (cut) => CUTS[cut].reduce((s, [a, b]) => s + b - a, 0)

// the schedules, for the table and the page
export const typed = TYPED

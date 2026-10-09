// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ROUND: the clock every part of the film reads                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// One night in Berkeley, six people, six letters, each to the next and the
// last to the first. The frame is a split-flap display hinged at y 960: the
// one writing below, right way up; the one they write to above, mirrored in
// the seam. This file is the film's time: which world is where, what each
// phone shows, when each flap lets go and lands, what the clock reads and
// every sound the score has to hit. It is pure and node safe, so the page,
// the studio, the score and the checks all read the same frame.
//
// The grid is the score's. 150 beats a minute in three, 30 frames a second:
// a beat is 12 frames, an eighth 6, a sixteenth 3, a bar 36, and every
// musical event lands on a whole frame. A link is four bars, 144 frames.
// Thirty two bars are 1152 frames, 38.4 seconds, and frame 1152 is frame 0.
//
//   bars  1 to  2   the 51B, 5:14 pm: a seat given
//   bars  3 to  6   link 1, sol to wren
//   bars  7 to 10   link 2, wren to hugo
//   bars 11 to 14   link 3, hugo to pia
//   bars 15 to 18   link 4, pia to omar
//   bars 19 to 22   link 5, omar to yuna
//   bars 23 to 27   link 6, yuna to the one who always stands; the hinge
//                   catches for bar 27, the one broken rule
//   bar  28         the contact sheet: all six worlds at once
//   bar  29         the cascade: each world flips into its letter
//   bars 30 to 32   the line, the lockup, and the loop flap onto bar 1

export const FPS = 30
export const BPM = 150
export const BEAT = 12
export const EIGHTH = 6
export const SIXTEENTH = 3
export const BAR = 36
export const BARS = 32
export const FRAMES = BARS * BAR // 1152
export const MS = (FRAMES * 1000) / FPS // 38400
export const W = 1080
export const H = 1920
export const SEAM = 960
export const CELL = 6
export const SPINE = 702

// the frame a bar, beat and eighth fall on (bars and beats count from 1)
export const at = (bar, beat = 1, eighth = 0) => (bar - 1) * BAR + (beat - 1) * BEAT + eighth * EIGHTH
export const msOf = (f) => (f * 1000) / FPS
export const frameOf = (ms) => Math.floor((ms * FPS) / 1000 + 1e-6)
export const wrap = (f) => ((f % FRAMES) + FRAMES) % FRAMES

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const span = (x, a, b) => clamp((x - a) / (b - a))
const sm = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }

// a number from two others, the same every time it is asked
export function hash(a, b = 0) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

// ── the six worlds ─────────────────────────────────────────────────────────
// Each is drawn once and used twice: above, mirrored, as somebody who does not
// know; then fallen and right way up, writing. `origin` is the frame its own
// clock reads 0 (the moment it lands as the writer's world; the bus's is bar
// 1), so a world's clock runs on unbroken from one appearance to the next.
export const WORLDS = [
  { id: 'bus', name: 'the 51B', time: '5:14 pm', origin: 0, light: 'the passing street lights and the ceiling strip', spine: 'the grab pole sol holds' },
  { id: 'cafe', name: 'the café', time: '9:14 pm', origin: at(7), light: 'one spot left on', spine: "the spot's hanging pipe" },
  { id: 'library', name: 'the reading room', time: '11:14 pm', origin: at(11), light: 'two rows of green shaded lamps', spine: 'a column' },
  { id: 'roof', name: 'the roof', time: '1:14 am', origin: at(15), light: 'the city below', spine: 'the beacon mast' },
  { id: 'corner', name: 'the corner', time: '3:14 am', origin: at(19), light: 'one street light', spine: "the street light's pole" },
  { id: 'bakery', name: 'the bakery', time: '7:14 am', origin: at(23), light: 'first light through the window', spine: 'the window mullion' },
]

// ── the six letters ────────────────────────────────────────────────────────
// `greet` is the line the product prints over a letter: `dear` and the name,
// or the writer's own. `words` is what is typed, with the hand's moments
// written into it: `|` a pause of an eighth, `<n` the composer's clear key
// pressed n times, a character at a time.
export const LINKS = [
  {
    n: 1, writer: 'sol', pronoun: 'they', build: 'HIM', world: 0, to: 'wren', start: at(3), bars: 4,
    greet: 'dear wren', words: 'you hum when you think. i hope nobody ever tells you.',
    colour: 'amber', kind: 'lit', bat: 4, clock: '5:14 pm', stamp: '11/05/26', read: true,
  },
  {
    n: 2, writer: 'wren', pronoun: 'she', build: 'HER', world: 1, to: 'hugo', start: at(7), bars: 4,
    greet: 'dear hugo', words: "i laughed at your band. i'm in one now. || sorry.",
    colour: 'acid', kind: 'brat', bat: 3, clock: '9:14 pm', stamp: '11/05/26',
  },
  {
    n: 3, writer: 'hugo', pronoun: 'he', build: 'HIM', world: 2, to: 'pia', start: at(11), bars: 4,
    greet: 'dear pia', words: 'you sang my grandad to sleep. i was awake.',
    colour: 'green', kind: 'lit', bat: 2, clock: '11:14 pm', stamp: '11/05/26',
  },
  {
    n: 4, writer: 'pia', pronoun: 'she', build: 'HER', world: 3, to: 'omar', start: at(15), bars: 4,
    greet: 'dear omar', words: "i don't remember the fight. i miss || <6 | i remember everything else.",
    colour: 'ice', kind: 'lit', bat: 1, clock: '1:14 am', stamp: '11/06/26',
  },
  {
    n: 5, writer: 'omar', pronoun: 'he', build: 'HIM', world: 4, to: 'yuna', start: at(19), bars: 4,
    greet: 'dear yuna', words: "||| i don't even like bread.",
    colour: 'violet-yellow', kind: 'riso', bat: 0, clock: '3:14 am', stamp: '11/06/26',
  },
  {
    n: 6, writer: 'yuna', pronoun: 'she', build: 'HER', world: 5, to: 'sol', start: at(23), bars: 5,
    greet: 'to the one who always stands', greetFrom: 'dear ',
    words: 'you give your seat to whoever looks most tired. last night it was me.',
    colour: 'rose', kind: 'lit', bat: 4, clock: '7:14 am', stamp: '11/06/26', hesitates: true,
  },
]
export const MAX_BODY = 280

// ── the plan of a link, in frames from its start ──
// 0 the flap has landed; the phone rises and lights; the composer with its
// greeting; the words; the tap on `send anonymously`; the colour runs out of
// the phone; the one writing and the one above both look up; the colour
// reaches the hinge and it lets go; the next link lands.
// Link 1 follows the seat, so sol's phone is already rising in bar 2, and it
// is the one that shows `being read` before the letter is up. Link 6 is five
// bars: yuna's phone is propped on the flour bin and already on, she turns
// `dear` into `to`, writes, and the hinge catches for the whole of bar 27.
const STD = { rise: [6, 24], greet: 24, type: [30, 90], send: 96, read: null, flood: 96, look: 108, release: 132, land: 144 }
export const PLAN = [
  { rise: [-18, 0], greet: 0, type: [6, 66], send: 72, read: [72, 96], flood: 96, look: 108, release: 132, land: 144 },
  STD, STD, { ...STD, rise: [2, 16], greet: 16, type: [18, 93] }, STD,
  { rise: null, greet: 0, edit: [6, 24], type: [30, 102], send: 108, read: null, flood: 108, look: 120, catch: 144, release: 170, land: 180 },
]
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
// the one broken rule: link 6's hinge catches when the colour reaches it and
// trembles for the bar before it lets go
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
const HOURS = [5, 9, 11, 1, 3, 7]
const MERID = ['pm', 'pm', 'pm', 'am', 'am', 'am']
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
  // hidden from the contact sheet until the loop flap brings the bus back
  const back = FRAMES - BEAT
  if (f >= at(28) && f < back) return { show: false }
  if (f >= back) return { show: true, hour: 5, merid: 'pm', prev: null, fold: 0, rise: span(f, back, FRAMES) }
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
  return { show: true, hour: now.hour, merid: now.merid, prev, fold, rise: 1, minutes: '14' }
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
    mode, rise, lit, greet, greetSince, greetCut,
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
  const own = k
  const above = (k + 5) % 6
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
  const order = [5, 11, 4, 10, 3, 9, 2, 8, 1, 7, 0, 6]
  const off = new Array(12)
  order.forEach((idx, k) => { off[idx] = (k < 9 ? at(7, 2) + k * BEAT : at(11) + (k - 9) * BEAT) - WORLDS[2].origin })
  return off
})()

// the six worlds of the contact sheet at frame f, each in its letter's colour
export function sheetAt(f) {
  return LINKS.map((L) => ({ world: L.world, id: WORLDS[L.world].id, clock: clockOf(L.world, f), palette: L.colour, flood: 1, look: lookOf(L.world, f) }))
}

// ── one frame of the film ──────────────────────────────────────────────────
export function frameAt(input) {
  const f = wrap(Math.round(input))
  const fr = { f, ms: msOf(f), bar: Math.floor(f / BAR) + 1, beat: Math.floor((f % BAR) / BEAT) + 1, clock: clockAt(f) }
  const world = (k, clock, extra = {}) => ({ world: k, id: WORLDS[k].id, clock, ...extra })

  // bars 1 and 2: the bus, the café above; sol's phone already on its way up
  if (f < LINKS[0].start) {
    fr.phase = 'open'
    fr.bottom = world(0, clockOf(0, f), { palette: 'night', flood: 0, look: lookOf(0, f) })
    fr.top = world(1, clockOf(1, f), { palette: 'night', look: lookOf(1, f) })
    if (f >= LINKS[0].start + PLAN[0].rise[0]) fr.phone = phoneAt(0, f)
    return fr
  }
  // the links
  for (let i = 0; i < 6; i++) {
    const L = LINKS[i]
    const P = PLAN[i]
    const len = L.bars * BAR
    if (f < L.start || f >= L.start + len) continue
    const x = f - L.start
    const next = (L.world + 1) % 6
    const flood = floodAt(i, f)
    fr.phase = 'link'
    fr.link = L.n
    fr.bottom = world(L.world, clockOf(L.world, f), { palette: L.colour, flood, look: lookOf(L.world, f) })
    fr.phone = phoneAt(i, f)
    fr.top = world(next, clockOf(next, f, next === 0), { palette: 'night', look: lookOf(next, f) })
    if (i < 5) {
      // the pane: released when the colour reaches the hinge, landing on the
      // next link's downbeat, carrying the next world upright on its back
      const r = L.start + P.release
      const l = L.start + P.land
      if (f >= r) {
        const after = (next + 1) % 6
        fr.flap = {
          kind: 'pane', theta: flapAngle(f, r, l), lands: l, r, l,
          front: fr.top, back: fr.top,
          revealed: world(after, clockOf(after, f, after === 0), { palette: 'night', look: 0 }),
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
    const l = at(29) + i * EIGHTH
    const r = l - 5
    return { writer: L.writer, r, l, theta: f < r ? 0 : f < l ? gravity((f - r) / (l - r)) : rebound(f - l), done: f >= l }
  })
  fr.line = f >= at(30)
  fr.lockup = f >= at(31)
  const s0 = LINKS[5].start + PLAN[5].land
  if (f < s0 + 9) fr.settle = { theta: rebound(f - s0), under: world(5, clockOf(5, f), { palette: 'rose', flood: 1 }) }
  // the loop: the end card's top half falls onto the bus at the moment
  // before bar 1, with the café revealed above it
  const r = FRAMES - BEAT
  if (f >= r) {
    fr.flap = {
      kind: 'card', theta: flapAngle(f, r, FRAMES), lands: FRAMES, r, l: FRAMES,
      front: { card: 'end', half: 'top' },
      back: world(0, clockOf(0, f, true), { palette: 'night', flood: 0, look: 0 }),
      revealed: world(1, clockOf(1, f, true), { palette: 'night', look: 0 }),
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
  for (let i = 0; i < 5; i++) ev(LINKS[i].start + PLAN[i].land, 'clack', { link: i + 2 })
  ev(LINKS[5].start + PLAN[5].catch, 'catch')
  ev(LINKS[5].start + PLAN[5].land, 'clack', { to: 'sheet' })
  ev(FRAMES, 'clack', { to: 'loop' })
  // the cascade, each flip sounding its writer's note of the last chord
  const notes = ['Bb4', 'G4', 'Eb2', 'C3', 'D5', 'F4']
  LINKS.forEach((L, i) => ev(at(29) + i * EIGHTH, 'flip', { writer: L.writer, note: notes[i] }))
  ev(at(30), 'line')
  ev(at(31), 'lockup')
  // the clock's folds
  for (const r of RIFFLES) r.steps.forEach((st, k) => ev(r.start + (k + 1) * STEP, 'fold', { hour: st.hour }))
  // the sends, the reading and the floods
  LINKS.forEach((L, i) => {
    const P = PLAN[i]
    ev(L.start + P.send, 'send', { writer: L.writer })
    if (P.read) ev(L.start + P.read[0], 'read')
    ev(L.start + P.flood, 'flood', { writer: L.writer, colour: L.colour, frames: FLOOD })
    ev(L.start + P.look, 'look', { writer: L.writer })
  })
  // the words, each a soft key
  TYPED.forEach((t, i) => {
    for (const [g] of t.body) ev(g, 'key', { writer: LINKS[i].writer })
    if (t.greet) for (const [g] of t.greet.slice(1)) ev(g, 'key', { writer: LINKS[i].writer })
  })
  // the reading room: nine lamps go out on the beat while hugo is above, the
  // last three as his own link opens, so the phone is the last light
  for (let k = 0; k < 9; k++) ev(at(7, 2) + k * BEAT, 'lamp', { lamp: k })
  for (let k = 0; k < 3; k++) ev(at(11) + k * BEAT, 'lamp', { lamp: 9 + k })
  // the café: the case's two latches while wren is above
  ev(at(5, 2), 'latch')
  ev(at(5, 2, 1), 'latch')
  // the corner: the crossing's locator once a second while it is on screen,
  // the walk signal as omar's letter goes up
  for (let g = at(15); g < at(23); g += 30) ev(g, 'tick')
  ev(LINKS[4].start + PLAN[4].send, 'walk')
  // the bus: a pole past the window on every downbeat, a street light on
  // every other, while the bus is on screen (Star Guitar's rule)
  for (let b = 1; b <= BARS; b++) {
    const g = at(b)
    if (g < at(7) || (g >= at(23) && g < at(28))) ev(g, b % 2 ? 'streetlight' : 'pole')
  }
  ev(at(1, 3), 'chime')
  return out.sort((a, b) => a.f - b.f || (a.kind < b.kind ? -1 : 1))
}

// ── the cutdowns, as sequences of the film's own frames ────────────────────
// 15 s: the seat (with the bakery above instead of the café), a flap straight
// to link 6, then the end. 6 s: link 5 and the lockup's bar.
export const CUTS = {
  full: [[0, FRAMES]],
  15: [[0, at(3)], [at(23), FRAMES]],
  6: [[at(19), at(23)], [at(31), at(32)]],
}
export function cutFrame(cut, i) {
  let k = i
  for (const [a, b] of CUTS[cut]) { if (k < b - a) return a + k; k -= b - a }
  return null
}
export const cutLength = (cut) => CUTS[cut].reduce((s, [a, b]) => s + b - a, 0)

// the schedules, for the table and the page
export const typed = TYPED

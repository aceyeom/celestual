#!/usr/bin/env node
// check-stories.mjs — things about the stories on the glass that a
// screenshot cannot prove, because they are true or false on every frame and
// a screenshot is one (app/src/wall/pixmark.js, folk.js).
//
//   1  the two come onto the glass together. He runs half as fast again as
//      she does, and the intro's run is set so that the first lit cell of
//      each crosses its edge of the panel within a frame or two of the
//      other's (folk.js `LEAD`), on a phone's panel, which runs three cells
//      past the story's grid either side, and on a desk's, which is the grid.
//   2  the moments each of them is first seen on a glass that runs further
//      past the grid, which pixmark.js keeps to set the pair along by
//      (`ENTER`, `shiftFor`), are still what the bodies do: worked out again
//      here, at a quarter of the ink and at a half, and a list that has gone
//      stale is a failure that says what it should be.
//   3  every telling opens on the empty glass. For the intro and for each
//      telling of the mutual, frame by frame from the telling's first to the
//      one they come in on: not one cell of either body lit anywhere on the
//      panel, however faint, and that frame a beat after the screen is on
//      (the intro's wake, pixmark.js `I_WAKE_AT` and `I_WAKE_MS`; the
//      mutual's clock starts once its screen is on). Then the first cell of
//      each over its edge within a frame (16ms) of the other's, on a phone's
//      panel and on a desk's, whether it is the first sliver lit, the first
//      cell seen or the first solid one; and on every other glass from none
//      to ten cells past the grid, within two.
//   4  the mutual loops without a seam: the frame a moment before a telling
//      ends is the frame it starts on, the empty glass, and the phone round
//      it (its light, the panel under the pink, the light it throws in the
//      room, how far it has risen, the drift) is where it was at the start;
//      and nothing the phone does jumps anywhere along the telling.
//   5  on the door, a note never touches either of them: at every 4ms of the
//      telling, not one cell of a note is lit on or beside a lit cell of
//      either body. The owner saw a note cut into him; this is the tripwire.
//   6  the mutual's film (pixmark.js `filmStory`, since 28 September), on
//      the glasses a phone, a desk and a phone on its side give it: nobody
//      on the glass before 1900ms, not a cell of the names or the notes left
//      once somebody is, the two coming in on one frame, the names and the
//      notes inside the glass, a name too long for it cut and dotted and
//      not run off its edge; and the keepsake's mark (`keepStory`), handed
//      the film's clock 5500ms on, drawing the frame the film would, from
//      the sentence said to where the camera has pulled all the way back.
//   7  the keepsake's picture (keeplayout.js): with the notes on, however
//      they were written, the phone and the signature under it inside the
//      feed's crop, y 285 to 1635, with the mark at least five pixels to a
//      cell: two notes of 280 characters, notes of many short lines, forty
//      lines of a letter each, notes empty, and with nobody named. Nine
//      short lines put the signature under the crop until the review of 28
//      September, and forty took the foot of the phone off the picture.
//
// It reads the stories as functions of the clock, in node, with no page and
// no canvas: the bodies and the notes are arithmetic until they are drawn,
// and nothing asked for here is past the moment the mark is rasterised. The
// picture is laid out with a measure that stands in for the face, each
// character wider than most of Jersey 10's, so the notes here run to more
// lines than the face would give them and the picture is tried harder than
// the page tries it. Exits non-zero on a failure.
//
// Run: node scripts/check-stories.mjs
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wall = (f) => pathToFileURL(join(root, 'app/src/wall', f)).href
const { introFolk, drawBody, cellsOf, sheet } = await import(wall('folk.js'))
const {
  joinStory, introStory, revealStory, filmStory, keepStory, I_COLS, I_ROWS, I_RUN_AT, I_ENTER, I_WAKE_AT, I_WAKE_MS, I_QUICK, R_EMPTY,
  ENTER, shiftFor,
} = await import(wall('pixmark.js'))

let bad = 0
const fail = (m) => { bad++; console.error(`✗ ${m}`) }
const pass = (m) => console.log(`✓ ${m}`)

// a frame
const FRAME = 16
// the least the empty glass is held once the screen is on: on a phone's
// glass and a desk's, and on any glass at all (one that runs far past the
// grid is reached sooner)
const BEAT = 200
const BEAT_ANY = 100

// ── 1. together ──
const G = 67
const folk = introFolk({ ground: G, mid: (I_COLS - 1) >> 1 })
const SH = sheet(-160, G - 66, I_COLS + 320, 72)
const SS = sheet(-160, G - 66, I_COLS + 320, 72)
// a frame is 16ms; the two may be a frame or two apart, never more
const SLACK = 40
for (const [name, L, R] of [['a phone', -3, I_COLS + 2], ['a desk', 0, I_COLS - 1]]) {
  let him = null
  let her = null
  for (let t = -800; t <= 1200 && (him === null || her === null); t += 2) {
    const { him: a, her: b } = folk.poseAt(t)
    drawBody('him', a, folk.himX(t), G, false, SH)
    drawBody('her', b, folk.herX(t), G, true, SS)
    const lit = (S) => cellsOf(S).filter((c) => c[4] > 0.1).map((c) => c[0])
    if (him === null && Math.max(...lit(SH)) >= L) him = t
    if (her === null && Math.min(...lit(SS)) <= R) her = t
  }
  const gap = Math.abs(him - her)
  if (gap > SLACK) fail(`on ${name} he comes on at ${him}ms and she at ${her}ms, ${gap}ms apart`)
  else pass(`on ${name} the two come on together (${him}ms and ${her}ms)`)
}

// ── 2. the lists the pair is set along by ──
// the moment each first lights a cell at a quarter of the ink (seen) and at
// a half (solid), of a glass `o` cells past the grid on their own side
const STRENGTH = { seen: 0.25, solid: 0.5 }
{
  const n = ENTER.him.seen.length - 1
  const got = { him: {}, her: {} }
  for (const k of Object.keys(STRENGTH)) {
    got.him[k] = new Array(n + 1).fill(null)
    got.her[k] = new Array(n + 1).fill(null)
  }
  for (let t = -900; t <= 400; t += 1) {
    const { him: a, her: b } = folk.poseAt(t)
    drawBody('him', a, folk.himX(t), G, false, SH)
    drawBody('her', b, folk.herX(t), G, true, SS)
    for (const [k, at] of Object.entries(STRENGTH)) {
      const hx = Math.max(...cellsOf(SH).filter((c) => c[4] >= at).map((c) => c[0]))
      const sx = Math.min(...cellsOf(SS).filter((c) => c[4] >= at).map((c) => c[0]))
      for (let o = 0; o <= n; o++) {
        if (got.him[k][o] === null && hx >= -o) got.him[k][o] = t
        if (got.her[k][o] === null && sx <= I_COLS - 1 + o) got.her[k][o] = t
      }
    }
  }
  if (JSON.stringify(got) !== JSON.stringify(ENTER)) fail(`the run has changed: pixmark.js ENTER should be ${JSON.stringify(got)}`)
  else pass(`the moments each is first seen on a glass 0 to ${n} cells past the grid are pixmark.js's own`)
}

// ── 3. the empty glass, and the two of them in on one frame ──
// The first frame from `from` on which a cell of either body is lit, on each
// of the panels (column l to column r), at any strength (`faint`), at a
// quarter of the ink (`seen`) and at a half (`solid`): his are left of the
// middle, hers right. The clock is walked once and every panel is asked on
// each frame, which is the frame the story draws for that glass.
const LEVELS = { faint: 1e-9, ...STRENGTH }
function entriesOf(story, from, until, panels) {
  const mid = (I_COLS - 1) >> 1
  const got = panels.map(() => Object.fromEntries(Object.keys(LEVELS).map((k) => [k, { him: null, her: null }])))
  const open = (g) => Object.values(g).some((e) => e.him === null || e.her === null)
  for (let t = from; t <= until && got.some(open); t += 1) {
    panels.forEach(({ l, r }, i) => {
      if (!open(got[i])) return
      for (const c of story.frame(t, { l, r }).cells) {
        if (c[2] !== 1 || c[0] < l || c[0] > r) continue
        const a = c[4] ?? 1
        for (const [k, at] of Object.entries(LEVELS)) {
          if (a < at) continue
          const e = got[i][k]
          if (c[0] < mid && e.him === null) e.him = t
          if (c[0] > mid && e.her === null) e.her = t
        }
      }
    })
  }
  return got
}
const tellings = [
  // the intro's clock starts on the black; its screen is on at the end of
  // its wake. At its own pace, as Intro.jsx tells it
  ['the intro', introStory(I_RUN_AT - I_ENTER, { pace: I_QUICK }), 0, I_WAKE_AT + I_WAKE_MS, I_RUN_AT + 400],
  // the mutual's clock starts once its screen is on (Reveal.jsx), and every
  // telling after the first starts from the glass the last one ended on
  ['the mutual', revealStory(), 0, 0, R_EMPTY + 400],
]
const PANELS = [['a phone', 3, 3, FRAME, BEAT], ['a desk', 0, 0, FRAME, BEAT]]
for (let o = 0; o <= 10; o++) for (const x of [0, 1]) PANELS.push([`a glass ${o}/${o + x} cells past`, o, o + x, 2 * FRAME, BEAT_ANY])
for (const [name, story, from, lit, until] of tellings) {
  const worst = { faint: [0, ''], seen: [0, ''], solid: [0, ''] }
  let early = Infinity
  const edges = PANELS.map(([, oL, oR]) => ({ l: -oL, r: I_COLS - 1 + oR }))
  const got = entriesOf(story, from, until, edges)
  PANELS.forEach(([panel, , , slack, beat], i) => {
    const { l, r } = edges[i]
    const g = got[i]
    if (Object.values(g).some((e) => e.him === null || e.her === null)) {
      fail(`${name} on ${panel}: nobody came in by ${until}ms`)
      return
    }
    // nothing of either of them, at any strength, until a beat after the
    // screen is on
    const first = Math.min(g.faint.him, g.faint.her)
    early = Math.min(early, first - lit)
    if (first - lit < beat) fail(`${name} on ${panel}: a cell of them is on the glass ${first - lit}ms after the screen is on, before a beat of the empty glass`)
    const say = []
    for (const k of Object.keys(LEVELS)) {
      const gap = Math.abs(g[k].him - g[k].her)
      if (gap > worst[k][0]) worst[k] = [gap, panel]
      if (gap > slack) fail(`${name} on ${panel} (set ${shiftFor(l, r)} along): the first ${k} cell of him at ${g[k].him}ms and of her at ${g[k].her}ms, ${gap}ms apart`)
      say.push(`${k} ${g[k].him} and ${g[k].her}`)
    }
    if (slack === FRAME) pass(`${name} on ${panel}: the glass is empty until ${first}ms, ${first - lit}ms after it is on, and they come in on one frame (${say.join(', ')})`)
  })
  pass(`${name} on every glass 0 to 10 cells past the grid: empty for at least ${early}ms once it is on, and the two at most ${Object.entries(worst).map(([k, [ms, p]]) => `${ms}ms apart ${k} (${p})`).join(', ')}`)
}

// ── 4. the mutual's seam ──
{
  const s = revealStory()
  const P = s.loop
  // the frame a moment before a telling ends, and the frame it starts on
  const cellsKey = (f) => `${f.ink}|${f.wash ? 'w' : ''}|${f.glow ? 'g' : ''}|${[...f.cells].map((c) => c.join(',')).sort().join(';')}`
  const late = s.frame(P - 0.5)
  const first = s.frame(0)
  if (cellsKey(late) !== cellsKey(first)) fail(`the mutual's last frame (${late.key}) is not the frame it starts on (${first.key})`)
  else pass(`the mutual's last frame, ${P - 0.5}ms in, is the empty glass it opens on (${late.key === first.key ? 'the same frame' : 'the same cells'})`)
  // it is the empty glass from the moment the telling is taken back until
  // it is told again
  let odd = null
  for (let t = s.times.night; t < P; t += 1) if (s.frame(t) !== first) { odd = t; break }
  if (odd !== null) fail(`the mutual's glass is not the empty glass at ${odd}ms, after it has been taken back`)
  else pass(`from ${s.times.night}ms to ${P}ms, and from 0 until they come in, the glass is one frame`)
  // the phone round it
  const a = s.lightAt(P - 0.5)
  const b = s.lightAt(0)
  const off = Object.keys(b).filter((k) => Math.abs(Number(a[k]) - Number(b[k])) > 1e-6)
  if (off.length) fail(`the phone at the end of a telling is not as it starts: ${off.map((k) => `${k} ${a[k]} and ${b[k]}`).join(', ')}`)
  else pass(`the phone at the end of a telling is as it starts (${Object.entries(b).map(([k, v]) => `${k} ${v}`).join(', ')})`)
  // and nothing it does jumps: every list of keys runs from the start of
  // the telling to its end, in order, and two keys at one moment agree
  for (const [name, keys] of Object.entries(s.phone)) {
    if (name === 'drift') continue
    const val = (k) => JSON.stringify(k[1])
    let ok = keys[0][0] === 0 && keys[keys.length - 1][0] === P && val(keys[0]) === val(keys[keys.length - 1])
    for (let i = 1; i < keys.length; i++) {
      if (keys[i][0] < keys[i - 1][0]) ok = false
      if (keys[i][0] === keys[i - 1][0] && val(keys[i]) !== val(keys[i - 1])) ok = false
    }
    if (!ok) fail(`the phone's ${name} jumps somewhere along the telling`)
  }
  pass(`the phone's ${Object.keys(s.phone).filter((k) => k !== 'drift').join(', ')} run once round a telling, ${P}ms, and meet themselves`)
  const [d0, d1] = s.phone.drift
  if (!(d0 > 0 && d1 < P && d0 < d1)) fail(`the drift is not inside the telling (${d0} to ${d1})`)
}

// ── 5. the notes ──
const door = joinStory()
const T = door.times
let near = Infinity
let when = null
for (let t = 0; t <= T.run + 800; t += 4) {
  const notes = door.layers.notes(t).cells
  if (!notes.length) continue
  const body = door.layers.bodies(t).cells.filter((c) => (c[4] ?? 1) > 0.03)
  for (const n of notes) {
    for (const b of body) {
      const d = Math.max(Math.abs(n[0] - b[0]), Math.abs(n[1] - b[1]))
      if (d < near) { near = d; when = t }
    }
  }
}
if (near <= 1) fail(`on the door a note comes within ${near} cell of a body, at ${when}ms`)
else pass(`on the door no note comes nearer either of them than ${near} cells`)

// ── 6. the film ──
// Words as pixtype.js `typeCells` answers them, made here without a canvas:
// each character six cells wide, a capital ten tall on the baseline and a
// stem two wide, which is Jersey 10's own grid
function typed(text) {
  const cells = []
  const ends = []
  ;[...text].forEach((ch, i) => {
    const x0 = i * 6
    if (ch !== ' ') for (let y = -10; y < 0; y++) for (const dx of [0, 1, 3, 4]) cells.push([x0 + dx, y])
    ends.push(x0 + 6)
  })
  return { cells, w: ends[ends.length - 1] || 0, ends }
}
{
  // the glasses of Film.jsx's table: a phone of 390 at three, a desk of 1440
  // at two and at one, a phone on its side, and the grid alone
  const GLASSES = [
    ['a phone', { l: -1, r: 95, t: -55, b: 129 }],
    ['a desk at two', { l: -15, r: 110, t: 0, b: 75 }],
    ['a desk at one', { l: -16, r: 110, t: -2, b: 76 }],
    ['a phone on its side', { l: -10, r: 105, t: -1, b: 75 }],
    ['the grid', { l: 0, r: I_COLS - 1, t: 0, b: I_ROWS - 1 }],
  ]
  const say = typed('it’s mutual.')
  for (const [who, credit] of [
    ['two first names', { a: typed('Jules'), b: typed('Ace') }],
    ['two @s', { a: typed('@seoyeon.kim'), b: typed('@ace03d') }],
    ['a name longer than any glass', { a: typed('@a.very.long.handle.of.thirty'), b: typed('@ace03d') }],
  ]) {
    const film = filmStory({ credit, say })
    const T = film.times
    for (const [name, e] of GLASSES) {
      const where = `${who} on ${name}`
      const inside = (c) => c[0] >= e.l && c[0] <= e.r && c[1] >= e.t && c[1] <= e.b
      const bodyAt = (t) => film.layers.base(t, e).cells.filter((c) => c[2] === 1 && inside(c) && (c[4] ?? 1) > 0)
      const wordsAt = (t) => [...film.layers.names(t, e).cells, ...film.layers.notes(t, e).cells]
      // the first frame of either of them on this glass, the last frame with
      // a cell of the names or the notes, and a beat of the empty glass
      // between: a glass that runs further past the grid sees them sooner
      let first = null
      for (let t = 0; t < T.enter + 400 && first === null; t += 1) if (bodyAt(t).length) first = t
      if (first === null) { fail(`the film, ${where}: nobody came in`); continue }
      let last = 0
      for (let t = 0; t < T.enter + 400; t += 1) if (wordsAt(t).length) last = t
      const beat = first - last
      const edge = e.l >= -3 && e.r <= I_COLS + 2
      if (beat < BEAT_ANY) fail(`the film, ${where}: they are on the glass at ${first}ms, ${beat}ms after the last of the names and the notes`)
      // and on a glass three cells past the grid or less, on the moment
      if (edge && Math.abs(first - T.enter) > 2 * FRAME) fail(`the film, ${where}: they come in at ${first}ms and not at ${T.enter}`)
      // the names and the notes on the glass, every frame they are there
      let out = null
      for (let t = 0; t < T.enter && out === null; t += 8) {
        const off = wordsAt(t).find((c) => !inside(c))
        if (off) out = [t, off]
      }
      if (out) fail(`the film, ${where}: a cell of the names or the notes is off the glass at ${out[0]}ms (${out[1][0]}, ${out[1][1]})`)
      // the names stand whole between coming on and going out
      const standing = film.layers.names(T.credit + 100, e).cells
      if (!standing.length) fail(`the film, ${where}: the names are not on the glass at ${T.credit + 100}ms`)
      if (beat >= BEAT_ANY && !out && standing.length) pass(`the film, ${where}: the names and the notes on the glass and gone at ${last}ms, and nobody until ${first}ms`)
    }
    // the two of them come in together on every glass (as section 3 asks
    // of the intro and the loop), off the film's own story
    const panels = GLASSES.slice(0, 4).map(([, e]) => e)
    const got = entriesOf({ frame: (t, g) => film.layers.base(t, g) }, T.enter - 40, T.enter + 400, panels)
    GLASSES.slice(0, 4).forEach(([name], i) => {
      const g = got[i]
      const gaps = Object.keys(LEVELS).map((k) => Math.abs((g[k].him ?? Infinity) - (g[k].her ?? -Infinity)))
      const worst = Math.max(...gaps)
      if (!(worst <= FRAME)) fail(`the film, ${who} on ${name}: the two come in ${worst}ms apart`)
    })
  }
  pass('the film: on every glass the two come in within a frame of each other')

  // the keepsake, on the film's clock 5500ms on, is the film's frame: the
  // same tenth of the mark's life, as alive, and the same sentence and cursor
  const film = filmStory({ credit: { a: typed('Jules'), b: typed('Ace') }, say })
  const keep = keepStory({ say })
  const T = film.times
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  let odd = null
  for (let t = T.said; t <= T.land + 420 && odd === null; t += 5) {
    const u = t - T.live
    const fs = film.layers.sentence(t).cells
    const ks = keep.layers.sentence(u).cells
    if (!same(film.layers.life(t), keep.layers.life(u)) || !same(fs, ks)) odd = t
  }
  if (odd !== null) fail(`the keepsake's mark is not the film's at ${odd}ms`)
  else pass(`the keepsake, handed the film's clock ${T.live}ms on, draws the film's frame from ${T.said}ms to ${T.land + 420}ms`)
}

// ── 7. the picture ──
{
  const { layoutOf, topOf, CROP_TOP, CROP_BOT, SIGN_GAP, SIGN_H } = await import(wall('keeplayout.js'))
  // a canvas's measure, for the face: every character 0.6 of the size wide
  // (Jersey 10's own run nearer half), a CJK one the whole size
  const measure = {
    font: '',
    measureText(t) {
      const f = Number((/(\d+(?:\.\d+)?)px/.exec(this.font) || [])[1]) || 16
      return { width: [...t].reduce((w, ch) => w + (/[\u3000-\u9fff\uac00-\ud7af]/.test(ch) ? f : 0.6 * f), 0) }
    },
  }
  const LONG = 'i kept nearly saying something after class and then not saying it. you always packed up slowly, like you were waiting for something, and i hoped it was me. if this is you then yes: the library steps, friday, after the last lecture. i will be the one pretending to read. see you'
  const lines = (n, w) => Array.from({ length: n }, (_, i) => 'abcdefghijklmnopqrstuvwxyz'.slice(0, w).padEnd(w, String(i % 10))).join('\n')
  const NOTES = [
    ['two notes of 280 characters', [LONG.slice(0, 280), LONG.slice(0, 280)]],
    ['a line each', ['hi', 'i have wanted to say this since the second week of term.']],
    ['nine short lines, and a note', [lines(9, 36), 'hi']],
    ['nine short lines each', [lines(9, 36), lines(9, 36)]],
    ['forty letters, one to a line, each', [lines(40, 1), lines(40, 1)]],
    ['forty letters one to a line, and a long note', [lines(40, 1), LONG.slice(0, 280)]],
    ['a hundred and forty blank lines', ['\n'.repeat(140), 'hi']],
    ['both empty', ['', '']],
    ['one empty, one of many lines', ['', lines(40, 1)]],
    ['Korean, long', ['수업 끝나고 매번 말을 걸고 싶었어. '.repeat(10).slice(0, 280), LONG.slice(0, 280)]],
  ]
  let worst = null
  for (const names of [['Jules', 'Ace'], null]) {
    for (const [what, notes] of NOTES) {
      for (const on of [true, false]) {
        const L = layoutOf(measure, { names, notes: on ? notes : null })
        const top = topOf(L)
        const bottom = top + L.ph + SIGN_GAP + SIGN_H
        const where = `the picture, ${what}${names ? '' : ', nobody named'}${on ? '' : ', the notes left off'}`
        if (top < CROP_TOP || bottom > CROP_BOT) fail(`${where}: the phone and its signature run from y ${top} to ${bottom}, outside ${CROP_TOP} to ${CROP_BOT}`)
        else if (L.mark < 5 * 75) fail(`${where}: the mark's panel is ${L.mark} tall, under five pixels to a cell`)
        else if (!worst || bottom > worst[1]) worst = [where, bottom]
      }
    }
  }
  if (worst) pass(`the picture: every shape of notes inside the crop, the lowest ${worst[0]} at y ${worst[1]} of ${CROP_BOT}`)
}

process.exit(bad ? 1 : 0)

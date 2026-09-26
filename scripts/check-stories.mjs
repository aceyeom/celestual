#!/usr/bin/env node
// check-stories.mjs — two things about the stories on the glass that a
// screenshot cannot prove, because they are true or false on every frame and
// a screenshot is one (app/src/wall/pixmark.js, folk.js).
//
//   1  the two come onto the glass together. He runs half as fast again as
//      she does, and the intro's run is set so that the first lit cell of
//      each crosses its edge of the panel within a frame or two of the
//      other's (folk.js `LEAD`), on a phone's panel, which runs three cells
//      past the story's grid either side, and on a desk's, which is the grid.
//   2  on the door, a note never touches either of them: at every 4ms of the
//      telling, not one cell of a note is lit on or beside a lit cell of
//      either body. The owner saw a note cut into him; this is the tripwire.
//
// It reads the stories as functions of the clock, in node, with no page and
// no canvas: the bodies and the notes are arithmetic until they are drawn.
// Exits non-zero on a failure.
//
// Run: node scripts/check-stories.mjs
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wall = (f) => pathToFileURL(join(root, 'app/src/wall', f)).href
const { introFolk, drawBody, cellsOf, sheet } = await import(wall('folk.js'))
const { joinStory, I_COLS } = await import(wall('pixmark.js'))

let bad = 0
const fail = (m) => { bad++; console.error(`✗ ${m}`) }
const pass = (m) => console.log(`✓ ${m}`)

// ── 1. together ──
const G = 67
const folk = introFolk({ ground: G, mid: (I_COLS - 1) >> 1 })
const SH = sheet(-140, G - 66, I_COLS + 280, 72)
const SS = sheet(-140, G - 66, I_COLS + 280, 72)
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

// ── 2. the notes ──
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

process.exit(bad ? 1 : 0)

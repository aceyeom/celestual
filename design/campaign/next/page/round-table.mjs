// Prints the film's frame table, the typing, the clock and the reading budget
// from round-time.js, and checks what can be checked: every event on a whole
// frame, every letter readable in the time it stands, the stamps right for
// Pacific time. `node round-table.mjs` (add `md` for the script's tables).
import { CUT, LINKS, PLAN, WORLDS, RIFFLES, FRAMES, BAR, BEAT, FPS, msOf, typed, events, frameAt, FLOOD, cutLength, cutFrame, FILE_START, SHEET, LINE, LOCKUP } from './round-time.js'

const md = process.argv.includes('md')
const sec = (f) => (f / FPS).toFixed(2)
const bb = (f) => `${Math.floor(f / BAR) + 1}.${Math.floor((f % BAR) / BEAT) + 1}${f % BEAT ? '+' + (f % BEAT) : ''}`
let bad = 0
const fail = (m) => { bad++; console.log('FAIL', m) }

console.log(`\nround, the ${CUT} cut: ${FRAMES} frames, ${msOf(FRAMES)} ms, ${FRAMES / BAR} bars; the sheet at ${SHEET}, the line at ${LINE}, the lockup at ${LOCKUP}\n`)

// the links
const rows = []
LINKS.forEach((L, i) => {
  const P = PLAN[i]
  const s = L.start
  const t = typed[i].body
  const first = t[0][0]
  const last = t[t.length - 1][0]
  // the phone is covered when the falling pane passes it, about three frames
  // before it lands
  const cover = s + (P.land) - 3
  const hidden = P.read ? P.read[1] - P.read[0] : 0
  const stand = (cover - first - hidden) / FPS
  const words = typed[i].full.split(' ').length + L.greet.split(' ').length
  const chars = typed[i].full.length
  const need = chars / 20 // the product's own reading pace, 20 characters a second
  if (stand < need) fail(`${L.writer}: stands ${stand.toFixed(2)} s, needs ${need.toFixed(2)} s`)
  rows.push({ L, s, P, first, last, cover, stand, words, chars, need })
  console.log(`link ${L.n}  ${L.writer} to ${L.to}  ${WORLDS[L.world].name} ${L.clock}  ${L.colour}`)
  console.log(`  start ${s} (bar ${bb(s)})  words ${first}..${last}  send ${s + P.send}${P.read ? `  being read ${s + P.read[0]}..${s + P.read[1]}` : ''}  flood ${s + P.flood}..${s + P.flood + FLOOD}  look ${s + P.look}${P.catch ? `  catch ${s + P.catch}` : ''}  release ${s + P.release}  land ${s + P.land}`)
  console.log(`  stands ${stand.toFixed(2)} s for ${words} words, ${chars} characters (needs ${need.toFixed(2)} s at 20 a second), ${(words / stand).toFixed(2)} words a second`)
  if (typed[i].greet) console.log('  greeting: ' + typed[i].greet.map(([g, x]) => `${g}:"${x.slice(0, 6)}…"`).join(' '))
  console.log('  ' + t.map(([g, x]) => `${g}:${x.split(' ').pop()}`).join(' '))
})

// the clock
console.log('\nthe clock')
for (const r of RIFFLES) console.log(`  ${r.from.hour} ${r.from.merid} to ${r.steps[r.steps.length - 1].hour} ${r.steps[r.steps.length - 1].merid}: ${r.steps.length} steps from ${r.start}, landing ${r.land}: ${r.steps.map((x) => x.hour + x.merid).join(' ')}`)

// the stamps: the day each letter went up, in Pacific time
const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: '2-digit' })
// each letter's moment, from its clock: the night of 5 November, past
// midnight into the 6th
const when = (L) => {
  const [hm, mer] = L.clock.split(' ')
  let [h, m] = hm.split(':').map(Number)
  if (mer === 'pm' && h !== 12) h += 12
  if (mer === 'am' && h === 12) h = 0
  const date = mer === 'am' ? '2026-11-06' : '2026-11-05'
  return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
LINKS.forEach((L) => {
  const d = new Date(when(L) + ':00-08:00')
  const s = day.format(d)
  if (s !== L.stamp) fail(`${L.writer}'s stamp ${L.stamp} should be ${s}`)
})
console.log('\nstamps ' + LINKS.map((L) => L.stamp).join(' '))

// every event on a whole frame, and in the film
const E = events()
for (const e of E) if (!Number.isInteger(e.f) || e.f < 0 || e.f >= FRAMES) fail(`event ${e.kind} at ${e.f}`)
const kinds = {}
for (const e of E) kinds[e.kind] = (kinds[e.kind] || 0) + 1
console.log('\nevents ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '))

// the loop: frame 1152 is frame 0
const a = JSON.stringify(frameAt(0))
const b = JSON.stringify(frameAt(FRAMES))
if (a !== b) fail(`frame ${FRAMES} is not frame 0`)
// the delivered file: every frame once, starting at the loop flap's release
const seen = new Set()
for (let k = 0; k < cutLength('file'); k++) seen.add(cutFrame('file', k))
if (seen.size !== FRAMES || cutFrame('file', 0) !== FILE_START) fail('the file does not hold every frame once from the loop flap')
console.log(`\nthe file: ${cutLength('file')} frames (${sec(cutLength('file'))} s), from frame ${FILE_START}`)

if (md) {
  console.log('\n| link | writer | starts | words | sent | colour runs | look up | hinge lets go | lands | stands |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const r of rows) console.log(`| ${r.L.n} | ${r.L.writer} | ${r.s} (bar ${bb(r.s)}) | ${r.first} to ${r.last} | ${r.s + r.P.send} | ${r.s + r.P.flood} to ${r.s + r.P.flood + FLOOD} | ${r.s + r.P.look} | ${r.s + r.P.release} | ${r.s + r.P.land} | ${r.stand.toFixed(1)} s |`)
}
console.log(bad ? `\n${bad} failed` : '\nall checks pass')
process.exit(bad ? 1 : 0)

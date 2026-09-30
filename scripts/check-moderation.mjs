#!/usr/bin/env node
// check-moderation.mjs: the wall's first layer, held to the owner's line.
//
// On 30 September the owner found a letter that said "lets fuck babe" read,
// passed and put up, and set the balance the filter keeps: the wall stays
// free for comedy and jokes, and only the plainly bad comes off (the ruling
// is quoted in app/src/wall/moderate.js). This script is that ruling as two
// tables, run against every copy of the list there is outside the database,
// so a change to one copy that the others do not make, or a change that
// starts refusing the owner's jokes, fails here before anybody deploys it.
//
//   1  must refuse  propositions, abuse the list can be sure of, slurs in
//                   their plurals and disguises, contact details. Refused by
//                   the keyboard (`wallFault`), by celestual-wall-moderate's
//                   `deterministic` and by celestual-wall-reply's, all three.
//   2  must pass    the owner's jokes, flirting, swearing inside a feeling,
//                   and the memories the list used to refuse as contact
//                   ("the same dorm 2 years ago", "#2019", "you.me"). Passed
//                   by all three, and by the private note's list too.
//   3  private      what a private note may carry that the wall may not: a
//                   proposition is between two people who both asked, so the
//                   list every text goes through (`fault`) lets it by, and
//                   only the wall's own rules (`caughtOnWall`) catch it.
//   4  the lexicon  every letter the reading must see on a verified @-note
//                   matches a row, so the model reads it; the row is a gate,
//                   never a verdict, and nothing here asserts a refusal.
//   5  the fold     `norm` gives the same string in all three copies, for
//                   every line in every table and a few disguises besides.
//
// The two edge functions are Deno TypeScript that node cannot import, so the
// block each shares with moderate.js (from "the words, folded flat" to the
// function that runs it) is cut out of the source, its types stripped by
// node's own `stripTypeScriptTypes`, and run. With an Anthropic key in the
// environment (MODERATION_API_KEY), section 6 sends both tables to the
// letters' classifier, prompt and all, and reports how it read them; the
// model's word is reported rather than asserted, since it is the reading's
// to give, and a table the model disagrees with is something to look at.
//
//   node scripts/check-moderation.mjs     (npm run check:moderation)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'
import { fault, wallFault, caughtOnWall, norm, whyNot } from '../app/src/wall/moderate.js'
import { replyFault } from '../app/src/wall/replies-check.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let bad = 0
const fail = (m) => { bad++; console.log(`  FAIL ${m}`) }

// ── the server's copies, cut out and run ────────────────────────────────────
function cut(file, from, to, names) {
  const src = readFileSync(join(root, file), 'utf8')
  const a = src.indexOf(from)
  const b = src.indexOf(to, a)
  if (a < 0 || b < 0) throw new Error(`${file}: could not find the block between "${from}" and "${to}"`)
  const js = stripTypeScriptTypes(src.slice(a, b))
  return { ...new Function(`${js}\nreturn { ${names.join(', ')} }`)(), src }
}
const letters = cut('supabase/functions/celestual-wall-moderate/index.ts',
  '// ── the words, folded flat', '// ── layer 3 ──', ['norm', 'deterministic', 'needsReading'])
const replies = cut('supabase/functions/celestual-wall-reply/index.ts',
  '// ── the words, folded flat', '// ── layer 1: nobody else', ['norm', 'deterministic'])

// ── the tables ──────────────────────────────────────────────────────────────
const MUST_REFUSE = [
  // the letter that started this, and its family
  'lets fuck babe', 'babe lets fuck', 'lets fuck', 'let’s fuck', 'wanna fuck?', 'i wanna fuck you',
  'i’d fuck you', 'we should fuck', 'can i fuck you', 'dtf?', 'dtf', 'down to fuck?', 'fuck me daddy',
  'sit on my face', 'send nudes', 'send me nudes', 'show me your tits', 'i’d smash', 'id smash tbh',
  'i would smash you', 'let me hit it', 'i’d hit that', 'i’d tap that', 'suck my dick loser',
  'suck me off', 'give me head', 'let me eat you out',
  // disguised
  'l3ts fuck', 'lets fvck', 'lets f*ck', 'lets fuuuuck babe', 'babe lets fück', 'lets fuсk',
  'ｌｅｔｓ ｆｕｃｋ', 'lets f.u.c.k', 'lets phuck',
  // the emoji that say it
  '\u{1F346}\u{1F351}\u{1F4A6} tonight?', '\u{1F351}\u{1F346}', '\u{1F449}\u{1F44C} you and me', 'wanna \u{1F346}',
  // telling them to hurt themselves
  'kys', 'k y s', 'go kill yourself', 'just go kill yourself', 'you should kill yourself', 'kill yourself',
  'i hope you kill yourself', 'go die', 'pls go jump off a bridge',
  // slurs, their plurals and disguises
  'you niggers', 'faggots', 'retards lol', 'n i g g e r', 'nіgger', 'ｆａｇ', 'you are a f a g',
  'n1gg3r', 'niggerrr', 'trannies', 'dykes',
  // contact, still
  '2650 durant ave', 'meet me at 2650 Durant Ave', 'room 204', 'apt 3b', 'dorm 12', '#204',
  'text me 510 555 0199', 'jules@berkeley.edu', 'instagram.com/jules', 'www.jules.me', 'jules.me',
]
const MUST_PASS = [
  // the owner's jokes, and swearing inside a feeling
  'fuck you for leaving', 'you’re the fucking best', 'shit i miss you', 'fuck, you were right',
  'your playlist is a war crime', 'i’d fight a bear for you', 'kill it at your recital',
  'i could kill you for that haha', 'you owe me $5', 'you shot your shot', 'fuck me, this class is hard',
  'lets fuck shit up this weekend', 'wanna fuck around and find out?', 'i’ll fuck you up at mario kart',
  'i’d smash that exam for you', 'you’re a bad bitch and i mean it', 'suck it up buttercup',
  'don’t kill yourself over finals', 'you’ll kill it', 'i would die for you',
  'i hope you’re miserable', 'you ruined my year', 'you’re a coward and you know why',
  // flirting and attraction
  'you’re so fine it’s rude', 'kiss me already', 'marry me', 'we should kiss',
  'you looked dangerous in that jacket', 'i think about your hands too much', 'damn you look good',
  'we should hang out', 'lets get tacos', 'you’re a peach \u{1F351}', 'finals have me \u{1F4A6}',
  // memories the list used to refuse as contact
  'we lived in the same dorm 2 years ago', 'it’s 20 minutes each way',
  '23 points on court and you still ghosted me', '#2019 was ours', 'i loved you.me? never',
  'i miss you.co-star', 'i owe you 1000000000 hugs', 'room 4 of my heart', 'dorm 2 years ago',
  'spic and span', 'a chink in the armor', 'since 2019. 2020 was the year',
  'you sat two rows ahead all semester and i never once said anything.',
]
// A private note may say what the wall may not.
const PRIVATE_PASS = ['babe lets fuck', 'send nudes', 'i’d smash', 'sit on my face', '\u{1F346}\u{1F351}']
// Letters the reading must see, on a verified @-note.
const MUST_READ = [
  ['lets fuck babe', 'sexual'], ['babe lets f*ck', 'sexual'], ['fuck you bitch', 'abuse'],
  ['you stupid whore', 'abuse'], ['suck my dick loser', 'sexual'], ['\u{1F346}\u{1F351}', 'sexual'],
  ['you n i g g e r s', 'hate'], ['kys', 'abuse'], ['i know where you live. watch your back', 'threat'],
  ['your body is \u{1F525} i want you naked', 'sexual'], ['ur such a \u0441unt', 'abuse'],
]

// ── 1 and 2: the keyboard and both servers agree, and are right ─────────────
console.log('1  must refuse')
for (const t of MUST_REFUSE) {
  const k = wallFault(t)
  const l = letters.deterministic(t)
  const r = replies.deterministic(t)
  if (!k) fail(`the keyboard let ${JSON.stringify(t)} by`)
  if (l.verdict !== 'reject') fail(`celestual-wall-moderate let ${JSON.stringify(t)} by`)
  if (!r.length) fail(`celestual-wall-reply let ${JSON.stringify(t)} by`)
  if (!replyFault(t)) fail(`the reply keyboard let ${JSON.stringify(t)} by`)
  // the server's first reason, said, is the keyboard's sentence
  if (k && l.reasons.length && whyNot(l.reasons).replace(/\.$/, '') !== k.replace(/\.$/, '')) fail(`${JSON.stringify(t)}: the keyboard says "${k}" and the server's reasons say "${whyNot(l.reasons)}"`)
  if (l.reasons.join() !== r.join()) fail(`${JSON.stringify(t)}: the letters' list says ${l.reasons} and the replies' says ${r}`)
}
console.log('2  must pass')
for (const t of MUST_PASS) {
  const k = wallFault(t)
  const l = letters.deterministic(t)
  const r = replies.deterministic(t)
  if (k) fail(`the keyboard refused ${JSON.stringify(t)}: "${k}"`)
  if (l.verdict !== 'pass') fail(`celestual-wall-moderate refused ${JSON.stringify(t)}: ${l.reasons}`)
  if (r.length) fail(`celestual-wall-reply refused ${JSON.stringify(t)}: ${r}`)
  if (fault(t)) fail(`the private note's list refused ${JSON.stringify(t)}`)
}

// ── 3: a private note ───────────────────────────────────────────────────────
console.log('3  private')
for (const t of PRIVATE_PASS) {
  if (fault(t)) fail(`the private note's list refused ${JSON.stringify(t)}: "${fault(t)}"`)
  if (!caughtOnWall(t)) fail(`the wall's own rules let ${JSON.stringify(t)} by`)
}

// ── 4: the lexicon sends them to the model ──────────────────────────────────
console.log('4  the lexicon')
for (const [t, row] of MUST_READ) {
  const hits = letters.needsReading(t)
  if (!hits.includes(row)) fail(`the lexicon read ${JSON.stringify(t)} as [${hits}], not as ${row}`)
}

// ── 5: one fold ─────────────────────────────────────────────────────────────
console.log('5  the fold')
const FOLD = [...MUST_REFUSE, ...MUST_PASS, ...MUST_READ.map(([t]) => t),
  'Ｆｕｃｋ', 'café at 9pm', 'a b', 'i m a d', 'u r a f a g', '$hit', 'b!tch', 'wh0re', 'hello!!!']
for (const t of FOLD) {
  const a = norm(t)
  if (letters.norm(t) !== a) fail(`celestual-wall-moderate folds ${JSON.stringify(t)} to "${letters.norm(t)}", the keyboard to "${a}"`)
  if (replies.norm(t) !== a) fail(`celestual-wall-reply folds ${JSON.stringify(t)} to "${replies.norm(t)}", the keyboard to "${a}"`)
}

// ── 6: the reading, live, when there is a key ───────────────────────────────
const key = process.env.MODERATION_API_KEY
if (!key) {
  console.log('6  the reading: no MODERATION_API_KEY in the environment, so the prompt was not run')
} else {
  console.log('6  the reading (reported, not asserted)')
  const at = letters.src.indexOf('const SYSTEM_PROMPT = `')
  const system = letters.src.slice(at + 23, letters.src.indexOf('`', at + 23))
  const model = process.env.MODERATION_MODEL || 'claude-haiku-4-5-20251001'
  const read = async (body) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: 256, temperature: 0, system,
        output_config: { format: { type: 'json_schema', schema: {
          type: 'object',
          properties: { verdict: { type: 'string', enum: ['pass', 'review', 'reject'] }, reasons: { type: 'array', items: { type: 'string' } } },
          required: ['verdict', 'reasons'], additionalProperties: false,
        } } },
        messages: [{ role: 'user', content: `<addressee>@jules.k</addressee>\n<letter>${body}</letter>\n<sealed_line></sealed_line>` }],
      }),
    })
    if (!res.ok) return `error ${res.status}`
    const data = await res.json()
    const text = (data.content || []).find((b) => b.type === 'text')?.text || ''
    try { const o = JSON.parse(text); return `${o.verdict}${o.reasons.length ? ` [${o.reasons}]` : ''}` } catch { return 'unparsed' }
  }
  for (const [name, list, want] of [['refuse', MUST_REFUSE, 'reject'], ['pass', MUST_PASS, 'pass'], ['read', MUST_READ.map(([t]) => t), null]]) {
    let agree = 0
    for (const t of list) {
      const v = await read(t)
      if (want && v.startsWith(want)) agree++
      else console.log(`  ${name}: ${JSON.stringify(t)} was read ${v}`)
    }
    if (want) console.log(`  ${name}: ${agree} of ${list.length} read as ${want}`)
  }
}

console.log(bad ? `\n${bad} failed` : '\nall passing')
process.exit(bad ? 1 : 0)

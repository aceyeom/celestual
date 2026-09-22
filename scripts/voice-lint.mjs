#!/usr/bin/env node
// voice-lint.mjs — the mechanical half of design/VOICE.md (section 6).
//
// A tripwire, not a critic: scans the canonical English copy and the static
// legal pages for the banned-phrase list, emoji, and exclamation marks, and
// exits non-zero on a hit. Register/frame/vocabulary judgments stay human.
//
// Run: npm run lint:voice
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// What gets scanned. strings.js is scanned whole (every locale should hold the
// voice); public/*.html are the legal and trust pages; and since Phase 8 the
// three surfaces that write their copy inline rather than through i18n are
// scanned too, because that is where most of the product's words now are: the
// wall, Main and the desk.
//
// growth.js came off the list with the file, which went with the communities
// feature in Phase 8 (Q15).
//
// EXEMPT: celestual-challenge.html is not our copy. It is a faithful reproduction
// of the official competition document — the same words the .docx and .pdf carry,
// the ones a competitor signs. Its voice is the document's (sentence case, first
// person plural, exclamation marks and all), and linting it here would mean
// editing a signed agreement to satisfy a style rule. If the doc changes, it
// changes in the doc.
const EXEMPT = new Set([
  'celestual-challenge.html',
  // seed.js is a corpus of INVENTED LETTERS: what a fictional student wrote to
  // somebody, in their words. design/VOICE.md governs what the product says,
  // not what a person in it says, and a rule that edited a letter to satisfy a
  // house style would be editing the one kind of text on the wall that is not
  // ours. It trips on "in a hurry" for exactly that reason.
  'seed.js',
])

// Every .js/.jsx directly inside a directory, sorted, so the list is the
// directory rather than a copy of it that somebody has to remember to update.
const dir = (rel) =>
  readdirSync(join(root, rel))
    .filter((f) => (f.endsWith('.js') || f.endsWith('.jsx')) && !EXEMPT.has(f))
    .sort()
    .map((f) => join(root, rel, f))

const files = [
  // The three surfaces the rebuild built. All three write their copy inline
  // (one locale, one surface each), and between them they are all of the
  // product's words now that the retired design, its i18n layer and the card
  // went on 4 September: the wall's ten screens, Main's seven, the desk's seven.
  ...dir('app/src/wall'),
  ...dir('app/src/wall/screens'),
  ...dir('app/src/main'),
  ...dir('app/src/admin'),
  ...readdirSync(join(root, 'app/public'))
    .filter((f) => f.endsWith('.html') && !EXEMPT.has(f))
    .map((f) => join(root, 'app/public', f)),
]

// Comments are for us, copy is for the reader. Blank out comment text before the
// checks so a `//` explaining a rule can't trip the rule it explains.
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
}

// design/VOICE.md section 6 — the banned list. Case-insensitive substrings.
const BANNED = [
  // generic-error voice
  'something went wrong',
  'oops',
  'uh oh',
  'whoops',
  // paywall voice (nothing is for sale; the fourth slot, if ever, is bought "once")
  'unlock',
  'premium',
  'pro tier',
  'upgrade',
  'go pro',
  'subscribe now',
  // urgency (a ping "lapses", calmly)
  'hurry',
  'expires soon',
  'last chance',
  "don't miss",
  'act now',
  // the fishing frame + the forbidden lever (implied activity — FTC v. NGL)
  'find out who likes you',
  'see who entered you',
  'someone entered you',
  'someone pinged you',
  'people are talking about you',
]

// Emoji (the product's only glyphs are ✦ ✧ · — ritual marks, not emoji).
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{2725}\u{2727}-\u{27BF}\u{FE0F}]/u

// Exclamation marks in copy. HTML entities/attributes make a raw scan noisy, so
// only flag `!` when it directly follows a letter (an exclaimed word) — that is
// the "Success!" pattern the voice bans; `<!doctype`, `!=`, `!important` pass.
const EXCLAIM = /[a-zA-Z]!/

// Dashes. An em or en dash in copy is a writer stalling: it welds two thoughts
// together instead of choosing one, and it reads as machine-written. Use a full
// stop, or cut the second half. Also catches the &mdash;/&ndash; entities the
// legal pages could reach for.
const DASH = /[—–]|&[mn]dash;/

// A banned phrase is banned as a WORD, not as a run of characters. Matching
// bare substrings meant the scan tripped on identifiers that merely contain
// one: IndexedDB's `onupgradeneeded` is not the paywall voice. A leading word
// boundary is enough to fix it and still catches every real form, including
// plurals and inflections ("upgrades", "upgrading"), because only the front of
// the phrase is anchored.
const bannedRe = (phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')

// ── design/VOICE.md section 1: "Product copy is lowercase, including sentence
//    starts. Legal pages and proper nouns keep their case." ─────────────────
//
// This was judgment until sixteen capitalised strings shipped on the wall —
// "Sign in to write.", "Your information will stay anonymous.", "And what makes
// them so." — beside a product that says "write a letter", "look for a name"
// and "send anonymously". Mixed case is not a small thing here: it is the
// register changing halfway down a screen, and it reads as two products.
//
// Only JSX TEXT is checked: the words between the tags, which is where a
// headline or a sentence actually lives. Strings in props are left alone
// because most of them are not copy at all (a class, a key, an aria-role),
// and a lint that cries about `className` is a lint people switch off.
//
// What is allowed to keep its case: a proper noun, an all-caps label (`NOW`,
// `SEALED`), a single letter, and anything starting with an interpolation or a
// tag, since the case then belongs to whatever is being interpolated. The
// legal pages under app/public are exempt, as section 1 says.
// An initialism is not sentence case: "DM the code to" opens with a word
// that has no lower case form.
const ACRONYM = /^[A-Z]{2,}\b/
const PROPER = /^(Celestual|CELESTUAL|Instagram|Google|Meta|Berkeley|Apify|Supabase|Stripe|ManyChat|Resend|Vercel|Sather|Campanile|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b/

// The same rule, for copy that is not a text node. campus.js kept the wall's
// own masthead, the composer's first question and its four example letters in
// a plain object, so none of it was between tags and the check above walked
// straight past it — which is how "A wall of unforgettable berkeley bears."
// stayed capitalised on the masthead of the surface the product is named for.
// Only these keys are read: they are the ones that hold a sentence somebody
// reads, and a rule that looked at every string in the build would trip on
// half the identifiers in it.
const COPY_KEY = /\b(title|sub|say|says|cta|label|prompt|placeholder|someone|hint|note|blurb|lines?|examples?|heading|answer|reason)\s*:/

function casedStrings(line) {
  if (!COPY_KEY.test(line)) return []
  // a CSS font stack is not copy, and the face names inside one are quoted
  // exactly like a sentence is (looks.js FACES)
  if (/\bfamily\s*:/.test(line)) return []
  const out = []
  for (const m of line.matchAll(/'([^'\\]{3,200})'/g)) {
    const t = m[1].trim()
    if (!/^[A-Z]/.test(t)) continue
    if (t === t.toUpperCase()) continue        // an all-caps label keeps its case
    if (ACRONYM.test(t)) continue
    if (t.length <= 2) continue
    if (PROPER.test(t)) continue
    if (!/\s/.test(t) && !/[.?!]$/.test(t)) continue   // one bare word is a slug, not a sentence
    out.push(t)
  }
  return out
}

function casedCopy(line) {
  const out = []
  // text between a closing > and an opening <, with no braces in it
  for (const m of line.matchAll(/>([^<>{}]+)</g)) {
    const t = m[1].trim()
    if (!t) continue
    if (!/^[A-Z]/.test(t)) continue           // lower case already, or a glyph
    if (t === t.toUpperCase()) continue       // an all-caps label keeps its case
    if (ACRONYM.test(t)) continue             // an initialism has no lower case form
    if (t.length <= 2) continue               // a type specimen ("Aa"), not a sentence
    if (PROPER.test(t)) continue
    out.push(t)
  }
  return out
}

let failures = 0
for (const file of files) {
  const text = stripComments(readFileSync(file, 'utf8'))
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const where = `${file.replace(root + '/', '')}:${i + 1}`
    const lower = line.toLowerCase()
    for (const phrase of BANNED) {
      if (bannedRe(phrase).test(lower)) {
        console.error(`✗ ${where} banned phrase "${phrase}": ${line.trim().slice(0, 90)}`)
        failures++
      }
    }
    if (EMOJI.test(line)) {
      console.error(`✗ ${where} emoji in copy: ${line.trim().slice(0, 90)}`)
      failures++
    }
    if (EXCLAIM.test(line)) {
      console.error(`✗ ${where} exclamation mark: ${line.trim().slice(0, 90)}`)
      failures++
    }
    if (DASH.test(line)) {
      console.error(`✗ ${where} dash in copy (use a full stop): ${line.trim().slice(0, 90)}`)
      failures++
    }
    if (!file.includes('/app/public/')) {
      for (const t of [...casedCopy(line), ...casedStrings(line)]) {
        console.error(`✗ ${where} copy starts capitalised (VOICE.md 1): "${t.slice(0, 60)}"`)
        failures++
      }
    }
  })
}

if (failures) {
  console.error(`\nvoice-lint: ${failures} problem${failures === 1 ? '' : 's'} — see design/VOICE.md section 6`)
  process.exit(1)
}
console.log(`voice-lint: ${files.length} files clean`)

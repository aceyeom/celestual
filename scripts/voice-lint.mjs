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
// voice); growth.js carries the placed screen's growth copy; public/*.html are
// the legal/trust pages.
//
// EXEMPT: celestual-challenge.html is not our copy. It is a faithful reproduction
// of the official competition document — the same words the .docx and .pdf carry,
// the ones a competitor signs. Its voice is the document's (sentence case, first
// person plural, exclamation marks and all), and linting it here would mean
// editing a signed agreement to satisfy a style rule. If the doc changes, it
// changes in the doc.
const EXEMPT = new Set(['celestual-challenge.html'])

const files = [
  join(root, 'app/src/i18n/strings.js'),
  join(root, 'app/src/growth.js'),
  // The card (the composer, the prompt, the seeds, the spread) writes its copy
  // inline rather than through i18n, since it is one locale and one surface. It
  // is still copy, so it is still held to design/VOICE.md.
  ...readdirSync(join(root, 'app/src/card'))
    .filter((f) => f.endsWith('.js') || f.endsWith('.jsx'))
    .map((f) => join(root, 'app/src/card', f)),
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
  })
}

if (failures) {
  console.error(`\nvoice-lint: ${failures} problem${failures === 1 ? '' : 's'} — see design/VOICE.md section 6`)
  process.exit(1)
}
console.log(`voice-lint: ${files.length} files clean`)

#!/usr/bin/env node
// voice-lint.mjs — the mechanical half of docs/VOICE.md (§5/§6).
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
// voice); public/*.html are the legal/trust pages.
const files = [
  join(root, 'app/src/i18n/strings.js'),
  ...readdirSync(join(root, 'app/public'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => join(root, 'app/public', f)),
]

// VOICE.md §5 — the banned list. Case-insensitive substrings.
const BANNED = [
  'something went wrong',
  'oops',
  'uh oh',
  'whoops',
  'unlock',
  'premium',
  'pro tier',
  'upgrade now',
  'go pro',
  'hurry',
  'expires soon',
  'last chance',
  "don't miss",
  'find out who likes you',
  'see who entered you',
]

// Emoji (the product's only glyphs are ✦ ✧ · — ritual marks, not emoji).
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{2725}\u{2727}-\u{27BF}\u{FE0F}]/u

// Exclamation marks in copy. HTML entities/attributes make a raw scan noisy, so
// only flag `!` when it directly follows a letter (an exclaimed word) — that is
// the "Success!" pattern the voice bans; `<!doctype`, `!=`, `!important` pass.
const EXCLAIM = /[a-zA-Z]!/

let failures = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const where = `${file.replace(root + '/', '')}:${i + 1}`
    const lower = line.toLowerCase()
    for (const phrase of BANNED) {
      if (lower.includes(phrase)) {
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
  })
}

if (failures) {
  console.error(`\nvoice-lint: ${failures} problem${failures === 1 ? '' : 's'} — see docs/VOICE.md §5`)
  process.exit(1)
}
console.log(`voice-lint: ${files.length} files clean`)

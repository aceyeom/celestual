#!/usr/bin/env node
// export-mail.mjs: the picture at the head of every email celestual sends.
//
// The emails (the magic link, "someone wrote you a letter", the mutual) open
// on one image, `${SITE}/mail/head.png`, shown 600 by 180 and drawn at twice
// that, 1200 by 360, so it is sharp on every phone that reads mail. It is the
// link's picture made into a strip (scripts/export-og.mjs, whose page this
// draws): the black room, a small night screen lit in it with the pixel mark
// on it, and the lockup beside it. An email is read at arm's length in a list
// of other emails, so the strip says whose it is and nothing else; the words
// are the email's.
//
// Why a picture and not markup: a mail client draws neither the faces nor
// the screen's stylesheet, and half of them strip a background. A PNG on a
// black ground is the one thing every one of them shows as it was made, in
// the light scheme and the dark.
//
// Run: node scripts/export-mail.mjs
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shoot } from './export-og.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The screen a little over half the strip's height, so it stands in the room
// with dark above and below it, and the word as large beside it as the strip
// will hold at 600 wide: about 36 pixels there, the size of a heading in the
// mail under it
await shoot({ width: 1200, height: 360, screen: 200, word: 74, gap: 64 }, join(root, 'app/public/mail/head.png'))
console.log('app/public/mail/head.png')

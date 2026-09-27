#!/usr/bin/env node
// export-mail.mjs: the pictures every mail celestual sends is made of.
//
// A mail is the phone too (design/DESIGN.md 2.6): the black room, one screen
// lit in it with the mark on its glass and what the mail has to say typed
// under the mark, the one lit key under the phone, and the lockup signing it
// at the foot. A mail client draws none of that: Gmail and Outlook load no
// web font, so the phone's face falls back to Helvetica, and no client runs
// the screen's stylesheet. So every part of a mail that is the phone is a
// picture, made here out of the real screen (scripts/darkroom.mjs), and the
// sentences, the links and the legal lines round them are the mail's own
// text (supabase/functions/_shared/mail.ts, mails.ts), which is also what a
// client that blocks pictures shows, with each picture's words in its alt.
//
// ── what it makes, into app/public/mail/ ────────────────────────────────────
//   the screens    one for each thing a mail says, 400 by 404 at twice that:
//                  the night screen with the mark on it and one line under
//                  the mark, its cursor blinking on the phone's beat; and the
//                  mutual's, the rose screen as Reveal.jsx draws it, the mark
//                  alive (a light going round its ring, the star twinkling)
//   the keys       the lit key for each act, a chalk plate with the word in
//                  black, and the bezel key for the second thing a mail
//                  offers, each with the light it throws
//   the signature  the lockup, the mark and `celestual.` in the room's serif
//
// The mails point at `${SITE}/mail/<name>`, so these go live with the site
// (docs/launchsteps.md). `head.png`, the strip every mail opened on until
// now, is not made any more and stays where it is, for the mails already in
// people's inboxes. The line on each screen is the mail's too (mail.ts
// `SCREENS`), as its alt text: a line changed here is changed there.
//
// ── why GIFs, and what that costs ────────────────────────────────────────────
// An animated GIF plays in Gmail on the web and in its apps, in Apple Mail
// and in most of the rest; Outlook on a desk shows its first frame and stops
// there. So every first frame here is the whole picture: the line typed, the
// cursor lit, the mark whole. A GIF has one palette of 256 colours for all of
// its frames, so the photograph's two layers of noise (the pixels up close
// and the sensor's grain, screen.css) are left off, and each frame after the
// first carries only the pixels that changed (scripts/prints.mjs). A night
// screen is a little over 110 KB, and the mutual's, 24 frames of it, under
// 300.
//
// Run: node scripts/export-mail.mjs            every picture (npm --prefix app
//      node scripts/export-mail.mjs mutual     install first), or one of them
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { darkroom } from './darkroom.mjs'
import { gifOf } from './prints.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'app/public/mail')

// ── the screens ──────────────────────────────────────────────────────────────
// One phone for every mail, the intro's (looks.js `quirks('intro')`), so the
// mails, the share card and the posts are pictures of the same phone. It is
// shown 272 wide, the width the mutual's screen is on a phone (mutual.css),
// in a room 400 by 404: 64 either side of it for the light it throws, and
// about 43 over and under it, so the words under it stay with it, with the
// room's edge taken to black over the last 24 (darkroom.mjs `fade`).
const ROOM = { w: 400, h: 404, fade: 24, quiet: ['rgb', 'shine'] }
const PHONE = { w: 272, seed: 'intro' }
// the phone's beat: the cursor is lit for half of 1060ms and out for half
const BEAT = 530

// The night screen with the mark standing where the mutual's gathers to and
// the line typed under it where the mutual's is (darkroom.mjs `gathered`,
// mutual.css `.wl-mutual-say`), the cursor lit and then out.
const night = (say) => ({
  scene: { ...ROOM, phone: { ...PHONE, tint: 'night', glass: { story: 'gathered', say } } },
  frames: [{}, { cursor: false }],
  delay: BEAT,
})

// The mutual's, alive: the frames of Reveal.jsx's screen ten times a second,
// from well inside the mark's life, for one turn of the light round its ring
// (pixmark.js `GLINT`, 24 of them), with the light behind the mark held at
// the top of a breath: the breath is the whole panel's light, which a GIF
// can only carry as every pixel of the panel on every frame. The cursor
// blinks on six frames and off six, the nearest the ring's turn divides into
// to the phone's beat, so the loop has no seam.
const alive = []
for (let i = 16; i < 40; i++) alive.push({ t: `live+${i * 100 + 50}`, cursor: i % 12 < 6 })

const SCREENS = {
  signin: night('tap to sign in.'),
  confirm: night('tap to confirm.'),
  letter: night('a letter to you.'),
  lapse: night('still feel it?'),
  code: night('your code.'),
  mutual: {
    scene: { ...ROOM, phone: { ...PHONE, tint: 'rose', glass: { story: 'reveal', say: 'it’s mutual.', glow: 'live+1450' } } },
    frames: alive,
    delay: 100,
  },
}

// ── the keys ─────────────────────────────────────────────────────────────────
// The wall's two (phone.css, THE KEYS), at a mail's size: 48 tall, the word
// in the phone's face at 22, and 12 of the room round each for the light the
// lit one throws. `lit` is the act; the bezel key is the second thing a mail
// offers. A key alone is as wide as the phone above it, so its edges stand
// under the phone's; two keys share that width, a light's width apart.
// mail.ts knows these sizes (`KEYS`).
const KEY = { h: 48, size: 22, room: 12, whole: PHONE.w, half: (PHONE.w - 24) / 2 }
const KEYS = {
  'key-sign-in': { word: 'sign in', lit: true },
  'key-confirm': { word: 'confirm', lit: true },
  'key-confirm-and-post': { word: 'confirm and post', lit: true },
  'key-open': { word: 'open celestual', lit: true },
  'key-keep': { word: 'keep it for next week', lit: true },
  'key-read': { word: 'read it', lit: true, half: true },
  'key-remove': { word: 'remove it', lit: false, half: true },
}

// ── out ──────────────────────────────────────────────────────────────────────
const only = process.argv[2] || ''
mkdirSync(out, { recursive: true })
const made = []
const room = await darkroom({ scale: 2 })
try {
  for (const [name, s] of Object.entries(SCREENS)) {
    if (only && only !== name) continue
    const pngs = await room.shoot(s.scene, s.frames)
    const gif = gifOf(pngs, s.frames.map(() => s.delay), room.glass())
    writeFileSync(join(out, `${name}.gif`), gif)
    made.push([`${name}.gif`, gif.length])
  }
  for (const [name, k] of Object.entries(KEYS)) {
    if (only && only !== name) continue
    const w = k.half ? KEY.half : KEY.whole
    const [png] = await room.shoot({
      w: w + 2 * KEY.room, h: KEY.h + 2 * KEY.room,
      key: { word: k.word, lit: k.lit, size: KEY.size, w, h: KEY.h },
    })
    writeFileSync(join(out, `${name}.png`), png)
    made.push([`${name}.png`, png.length])
  }
  // the signature, 150 by 48, the lockup at a word of 22 in the middle of it
  if (!only || only === 'sign') {
    const [sign] = await room.shoot({ w: 150, h: 48, sign: { word: 22, y: 24 } })
    writeFileSync(join(out, 'sign.png'), sign)
    made.push(['sign.png', sign.length])
  }
} finally {
  await room.close()
}
for (const [f, n] of made) console.log(`app/public/mail/${f}`.padEnd(40), `${(n / 1024).toFixed(1)} KB`)

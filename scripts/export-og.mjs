#!/usr/bin/env node
// export-og.mjs: the pictures celestual is seen as before anybody opens it:
// the card a link to celestual.us unfurls into, and the posts on Instagram.
//
// docs/rebuild-spec.md section 8 puts the share thumbnail in scope. The first
// one was the old design's (an amber accent, an italic serif, a glowing four
// point star and an em dash), and the second was the lockup alone on the old
// blue black. Neither was the product anybody arriving from the link would
// land in, which is a black room with a phone screen left on in it. So each
// of these is that room: #000, one screen lit in it with the pixel mark on
// its glass, the light it throws on the dark, and the lockup, drawn on the
// phone's grid as the product signs itself everywhere (app/src/wall/brand.js).
// The owner's word for the Instagram ones: the retro screen with the logo,
// and nothing else.
//
// The screen is the frame the intro ends on (pixmark.js `introStory`,
// Intro.jsx): the two of them gone into the mark and the whole phone a
// letter lit in rose, the colour the intro ends in whenever it is held, on
// the intro's own phone (looks.js `quirks('intro')`), held square as the
// intro holds it. It is photographed by scripts/darkroom.mjs, which renders
// the real `Screen` and `PixelStory` through the app's own Vite, so none of
// it is a copy of the screen that could fall behind it. The mails are
// pictures of the same phone (scripts/export-mail.mjs).
//
// ── what it makes, and where each one goes ──────────────────────────────────
//   app/public/og.png            1200 by 630: the card every scraper asks for
//                                (iMessage, WhatsApp, Slack, X, Facebook,
//                                LinkedIn), which index.html names for every
//                                address. The screen and the lockup beside
//                                it: at the size of a thumb a sentence is a
//                                smear, and a lit screen and a word read at a
//                                hundred pixels wide. A PNG of 256 colours,
//                                under 100 KB (prints.mjs `png8Of`): a
//                                messenger shows no preview for a card past a
//                                few hundred, and the room's dithered light
//                                alone was most of a megabyte
//   design/instagram/post.jpg    1080 by 1080: a post on the grid, or the
//                                picture on a link in the bio. The screen,
//                                and the lockup signed under it as the shared
//                                picture is (share.js `signature`)
//   design/instagram/story.jpg   1080 by 1920: a story, or a reel's cover.
//                                The same, larger, with the phone and the
//                                name inside the middle 1420, clear of the
//                                bars Instagram lays over the top and the foot
//
// Stills, all three: a scraper shows the first frame of anything, and
// Instagram takes no GIF (its moving pictures are videos). The Instagram
// ones are posted by hand and not served by the site, so they live with the
// logo's exports in design/, as JPEGs at 92, which is what Instagram makes
// of anything it is given.
//
// Run: node scripts/export-og.mjs            (npm --prefix app install first)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { darkroom } from './darkroom.mjs'
import { png8Of } from './prints.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The intro's last frame (darkroom.mjs `intro`), or the mark alone on the
// phone's own coarser grid (`mark`), `w` wide and centred at `x`, `y`.
const phone = (w, x, y, story = 'intro') => ({ w, x, y, tint: 'rose', seed: 'intro', glass: { story } })

// The posts keep the photograph's grain and leave off its pixels up close
// (darkroom.mjs `quiet`), which at a post's size are a haze of colour. The
// card leaves off both, and its mark is the coarser one, which still reads
// as the mark when the card is a thumbnail.
const PHOTO = { quiet: ['rgb'], grain: 0.07 }
const PICTURES = {
  // the card: the screen and the lockup beside it, the lockup at five pixels
  // a cell (DESIGN.md 3.3), 88 apart and the two centred as one across the
  // card; the light it throws is the room's, wide, as a letter is read in
  'app/public/og.png': {
    scene: { w: 1200, h: 630, room: 3.4, quiet: ['rgb', 'shine'], phone: phone(334, 273, 315, 'mark'), sign: { cell: 5, x: 528, y: 315 } },
    small: true,
  },
  // a post: the phone above the middle and the name under it, as far below
  // it as the shared picture signs itself
  'design/instagram/post.jpg': {
    scene: { w: 1080, h: 1080, room: 3.2, ...PHOTO, phone: phone(560, 540, 470), sign: { cell: 2, y: 930 } },
  },
  // a story: the same phone and name, larger, the two centred on the middle
  // of the part of the frame Instagram leaves clear
  'design/instagram/story.jpg': {
    scene: { w: 1080, h: 1920, room: 3.2, ...PHOTO, phone: phone(700, 540, 895), sign: { cell: 3, y: 1415 } },
  },
}

const room = await darkroom({ scale: 1 })
try {
  for (const [path, p] of Object.entries(PICTURES)) {
    const jpeg = path.endsWith('.jpg')
    const [shot] = await room.shoot(p.scene, [{}], { quality: jpeg ? 92 : 0 })
    const file = p.small ? png8Of(shot, room.glass()) : shot
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), file)
    console.log(path.padEnd(28), `${p.scene.w} by ${p.scene.h}`.padEnd(13), `${(file.length / 1024).toFixed(0)} KB`)
  }
} finally {
  await room.close()
}

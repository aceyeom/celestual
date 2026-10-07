#!/usr/bin/env node
// studio-dither.mjs: the campaign's photographs, dithered as the phone
// dithers a face (screen.jsx `PixelPic`): cut to the reel's 9:16, brought
// down to a coarse grid, and ordered-dithered into four tones of one
// screen's colour (black, its shadow, the colour, and its light), so a
// street at night is drawn in the phone's own pixels. For the reel's week
// (app/src/studio/parts/reel.jsx), a day to a photograph.
//
//   node scripts/studio-dither.mjs      writes app/src/studio/assets/dither/
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLOURS, mix } from '../app/src/wall/looks.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'app/src/studio/assets/photos')
const out = join(root, 'app/src/studio/assets/dither')
mkdirSync(out, { recursive: true })

// the photograph, the colour it is drawn in, and where across it to cut
const DAYS = [
  ['street-four', 'ice', 0.5], ['street-spiders', 'rose', 0.47], ['wall-david', 'green', 0.5],
  ['shutter-lin', 'lilac', 0.5], ['fridge-sasha', 'amber', 0.52], ['shutter-ryan', 'white', 0.5],
]
const hueOf = (slug) => COLOURS.find((c) => c.slug === slug).hue
for (const [name, tint, at] of DAYS) {
  const h = hueOf(tint)
  const tones = ['#000000', mix(h, '#000000', 0.62), h, mix(h, '#FFFFFF', 0.55)]
  // the four tones, as a palette ffmpeg can map onto: a PPM of the 256
  // pixels paletteuse asks for, the four tones over and over
  const pal = join(out, `_pal-${tint}.ppm`)
  const px = Array.from({ length: 256 }, (_, i) => tones[i % tones.length]).flatMap((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)))
  writeFileSync(pal, Buffer.concat([Buffer.from('P6\n16 16\n255\n'), Buffer.from(px)]))
  const cw = 'ih*9/16'
  const crop = `crop=${cw}:ih:(iw-${cw})*${at}:0`
  const file = join(out, `${name}.png`)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(src, `${name}.jpg`), '-i', pal, '-filter_complex',
    `[0:v]${crop},scale=270:480:flags=area,eq=contrast=1.25:brightness=0.02:gamma=0.9[p];[p][1:v]paletteuse=dither=bayer:bayer_scale=2`,
    '-frames:v', '1', file])
  execFileSync('rm', ['-f', pal])
  console.log(file.replace(`${root}/`, ''), tint)
}

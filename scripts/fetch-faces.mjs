#!/usr/bin/env node
// fetch-faces.mjs - pull the four faces down and keep them in the repo.
//
// design/DESIGN.md section 4 names four faces. Until now they were fetched from
// fonts.googleapis.com at runtime, which costs a render-blocking round trip to a
// third party on every visit, leaks the visitor to that third party, and leaves
// the build unable to draw its own display face when the network is not there.
// The screenshot loop in rebuild-spec 7.3 is exactly that case: a headless
// browser with no route to Google renders the fallback and the critique is of a
// page that nobody will ever see.
//
// So the faces are files. This script fetches the latin subset of each one and
// writes app/public/fonts/, plus the faces.css that declares them. Run it when a
// face or a weight changes, not on every build.
//
// Run: node scripts/fetch-faces.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'app/public/fonts')

// A modern Chrome. Google serves woff2 to this and truetype to node's default,
// and truetype is roughly three times the bytes for the same glyphs.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// The four faces, each as a weight RANGE rather than as a list of instances.
//
// All four are variable fonts, and asking Google for `wght@400;500` used to
// hand back one file clipped to that range, declared twice. The system then
// set `font-weight: 600` on a pill and got 500, and set the display face at
// 400 because 400 was all there was. On a blue black ground a Didone at 400
// loses its hairlines, and the hero was the least legible screen in the
// product for want of a heavier cut it could have had for free.
//
// So the range is the whole range each face is drawn at, and faces.css declares
// it once per style as `font-weight: 400 900`. The browser picks the exact
// weight off the axis; nothing is synthesised and nothing is faked.
//
// Three faces, where there were four. Newsreader carries both the display job
// and the reading job, at two ends of its optical size axis: the 72 cut for a
// headline and the 16 cut for a paragraph or a letter are drawn differently by
// the same designer, which is what a display face and a text face from two
// different families were being asked to fake.
const FACES = [
  { slug: 'newsreader', query: 'Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800' },
  { slug: 'inter-tight', query: 'Inter+Tight:wght@100..900' },
  { slug: 'geist-mono', query: 'Geist+Mono:wght@100..900' },
]

// Everything the product sets is latin. The other subsets Google returns are
// greek, cyrillic, vietnamese and a maths block, and shipping them would be
// four fifths of the bytes for glyphs no screen in this build can produce.
const KEEP = new Set(['latin', 'latin-ext'])

async function text(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.text()
}

async function bytes(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

// Google's stylesheet is one comment naming the subset, then one @font-face,
// repeated. The comment is the only place the subset name appears, so the
// blocks have to be read in order rather than matched independently.
function blocks(css) {
  const found = []
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/gi
  let m
  while ((m = re.exec(css))) found.push({ subset: m[1], body: m[2] })
  return found
}

function field(body, name) {
  const m = body.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : ''
}

mkdirSync(out, { recursive: true })

const decls = []
// Keyed on the bytes, so a file Google hands back twice under two declarations
// is written once and both declarations point at it.
const written = new Map()

for (const face of FACES) {
  const css = await text(`https://fonts.googleapis.com/css2?family=${face.query}&display=swap`)
  let n = 0
  for (const b of blocks(css)) {
    if (!KEEP.has(b.subset)) continue
    const style = field(b.body, 'font-style') || 'normal'
    const weight = (field(b.body, 'font-weight') || '400').replace(/\s+/g, '-')
    const family = field(b.body, 'font-family').replace(/['"]/g, '')
    const src = (field(b.body, 'src').match(/url\((https:[^)]+)\)/) || [])[1]
    if (!src) continue

    const data = await bytes(src)
    const key = createHash('sha1').update(data).digest('hex')
    let name = written.get(key)
    if (!name) {
      name = `${face.slug}-${style}-${weight}-${b.subset}.woff2`
      writeFileSync(join(out, name), data)
      written.set(key, name)
      n++
    }

    decls.push([
      '@font-face {',
      `  font-family: '${family}';`,
      `  font-style: ${style};`,
      `  font-weight: ${weight.replace(/-/g, ' ')};`,
      '  font-display: swap;',
      `  src: url('./${name}') format('woff2');`,
      `  unicode-range: ${field(b.body, 'unicode-range')};`,
      '}',
    ].join('\n'))
  }
  console.log(`${face.slug}: ${n} file${n === 1 ? '' : 's'}`)
}

writeFileSync(join(out, 'faces.css'), [
  '/* faces.css - generated by scripts/fetch-faces.mjs. Do not edit by hand.',
  '',
  '   The faces of the system, served from this origin. See',
  '   design/DESIGN.md section 4 for what each one is for. */',
  '',
  decls.join('\n\n'),
  '',
].join('\n'))

console.log(`\n${written.size} files, plus faces.css, in app/public/fonts/`)

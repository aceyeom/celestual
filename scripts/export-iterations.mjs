#!/usr/bin/env node
// export-iterations.mjs - the logo told other ways, as files.
//
// design/source/iterations.js keeps the iterations of 1 October (other marks,
// other words, and the lockups they were paired into) as rows of cells, the
// way brand.js keeps the brand. This writes each one into
// design/logo/iterations/ as an SVG in chalk on the room's black, at whole
// pixels a cell and `crispEdges`, so they can be looked at anywhere an SVG
// opens. A display's unlit cells are drawn faint, as the screen draws them.
// None of them is the brand: export-mark.mjs writes that.
//
// Run: node scripts/export-iterations.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MARKS, WORDS, LOCKUPS, lockupOf } from '../design/source/iterations.js'
import { CHALK } from '../app/src/wall/mark.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/logo/iterations')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// a row's runs of one kind of cell, as rectangles
function pathOf(rows, pick) {
  let d = ''
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length;) {
      if (!pick(r[x])) { x++; continue }
      let j = x
      while (j + 1 < r.length && pick(r[j + 1])) j++
      d += `M${x} ${y}h${j - x + 1}v1h-${j - x + 1}z`
      x = j + 1
    }
  })
  return d
}
function svg(rows, scale, pad) {
  const w = Math.max(...rows.map((r) => r.length))
  const h = rows.length
  const ghost = pathOf(rows, (c) => c === 'g')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}" width="${(w + 2 * pad) * scale}" height="${(h + 2 * pad) * scale}" shape-rendering="crispEdges">`
    + `<rect x="${-pad}" y="${-pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="#000"/>`
    + (ghost ? `<path fill="${CHALK}" fill-opacity="0.13" d="${ghost}"/>` : '')
    + `<path fill="${CHALK}" d="${pathOf(rows, (c) => c === '#' || c === 'o')}"/></svg>\n`
}

let n = 0
const put = (name, body) => { writeFileSync(join(out, name), body); n++ }
for (const [key, m] of Object.entries(MARKS)) {
  put(`mark-${key}.svg`, svg(m.rows, 16, 6))
  put(`tab-${key}.svg`, svg(m.tab, 16, 1))
}
for (const [key, w] of Object.entries(WORDS)) put(`word-${key}.svg`, svg(w.rows, 8, 6))
for (const L of LOCKUPS) put(`lockup-${L.key}.svg`, svg(lockupOf(L), 6, 12))
console.log(`wrote ${n} files to design/logo/iterations/`)

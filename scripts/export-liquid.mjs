#!/usr/bin/env node
// export-liquid.mjs: the mark, pre-processed for the liquid metal shader.
//
// app/src/main/LiquidMark.jsx draws the Ecliptic as a metal surface with the
// paper shaders liquid metal fragment shader. That shader does not take a
// silhouette directly: it takes a texture whose red channel is an edge distance
// field and whose green channel is the opacity, and the package computes that
// texture from any image by solving a Poisson problem over it. Done at runtime
// the solve takes a second or more on a good machine and ten on a bad one, and
// the intro has the mark on screen at 180ms. So it is done here, once, and the
// result is a file in app/public/, exactly as design/logo/ is written by
// export-mark.mjs from the same geometry rather than drawn by hand.
//
// The mark is rasterised from `eclipticSVG()` at 1024px first, because the
// package treats an SVG as 4096px and the output would be sixteen times the
// bytes for no visible gain at the sizes this is drawn at.
//
// Needs the dev server on :5173, like scripts/shots.mjs: the package is ESM
// with relative imports and the simplest module loader that resolves them is
// the one already serving the app.
//
// Run: node scripts/export-liquid.mjs
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'app/public/liquid-mark.png')
const SIZE = 1024

const exe = process.env.CHROMIUM_PATH
  || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
  || undefined

const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage()
await page.goto('http://localhost:5173/?beat=0', { waitUntil: 'load' })

const png = await page.evaluate(async (SIZE) => {
  const mark = await import('/src/wall/mark.js')
  const shaders = await import('/node_modules/@paper-design/shaders/dist/index.js')

  // The silhouette, white on nothing, rasterised.
  const svg = mark.eclipticSVG('#ffffff').replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `)
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('the mark did not rasterise'))
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  })
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  c.getContext('2d').drawImage(img, 0, 0, SIZE, SIZE)

  // The solve, on the raster.
  const { pngBlob } = await shaders.toProcessedLiquidMetal(c.toDataURL('image/png'))
  const buf = new Uint8Array(await pngBlob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
  return btoa(s)
}, SIZE)

await browser.close()
writeFileSync(out, Buffer.from(png, 'base64'))
console.log(`app/public/liquid-mark.png  ${Math.round(Buffer.from(png, 'base64').length / 1024)} kB, ${SIZE}px`)

// prints.mjs: the darkroom's photographs, made small enough to send.
//
// scripts/darkroom.mjs takes a picture as the browser draws it, a PNG of
// full colour with every gradient dithered, which is right for a post and
// too heavy for the two places a picture has to be light: a mail, which
// carries a GIF (a palette of 256 colours for all its frames), and the card
// a link unfurls into, which a messenger will not show past a few hundred
// kilobytes. Both are made here from one palette:
//
//   gifOf(pngs, delays, glass)   an animated GIF, every frame after the
//                                first only where it differs from the one
//                                before (scripts/export-mail.mjs)
//   png8Of(png, glass)           a PNG of 256 colours (scripts/export-og.mjs)
//
// ── the palette ──────────────────────────────────────────────────────────────
// A photograph of a phone in a dark room has two kinds of colour: the glass,
// its greys and its ink and its light, and the room round it, one smooth fall
// of the screen's light to black (and the lockup's chalk, where there is
// one). Asked for the whole picture at once, a quantiser spends its colours
// where the pixels differ most and lays the room's light in a dozen steps, a
// stack of rings round every phone. So each has a share. The room's is found
// by a weighted k-means over its own colours, seeded along their lightness,
// and every colour in the room goes to its exact nearest. The glass's is
// gifenc's (a pairwise nearest neighbour over 5-6-5 cells), and a colour on
// the glass goes to the nearest for the middle of its cell, as gifenc maps
// it: coarser, and it keeps the panel's dots a pattern LZW can repeat, which
// is most of what a GIF weighs. `glass` is where the screen is in the
// picture (darkroom.mjs `glass()`); without one the whole picture is room.
import { deflateSync, inflateSync } from 'node:zlib'
import gifenc from 'gifenc'

const { GIFEncoder, quantize } = gifenc

// ── a PNG, read ──────────────────────────────────────────────────────────────
// The screenshots are eight bit RGB or RGBA, one IDAT stream, no interlace:
// all this has to read. Each pixel comes back as one number, 0xRRGGBB.
export function readPng(buf) {
  let p = 8
  let w = 0
  let h = 0
  let type = 0
  const data = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const name = buf.toString('ascii', p + 4, p + 8)
    const body = buf.subarray(p + 8, p + 8 + len)
    if (name === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); type = body[9] }
    else if (name === 'IDAT') data.push(body)
    else if (name === 'IEND') break
    p += 12 + len
  }
  const raw = inflateSync(Buffer.concat(data))
  const bpp = type === 6 ? 4 : 3
  const stride = w * bpp
  const rgb = new Uint32Array(w * h)
  let prev = new Uint8Array(stride)
  let cur = new Uint8Array(stride)
  for (let y = 0; y < h; y++) {
    const at = y * (stride + 1)
    const filter = raw[at]
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev[x]
      const c = x >= bpp ? prev[x - bpp] : 0
      let v = raw[at + 1 + x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const e = a + b - c
        const pa = Math.abs(e - a)
        const pb = Math.abs(e - b)
        const pc = Math.abs(e - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 255
    }
    for (let x = 0; x < w; x++) rgb[y * w + x] = (cur[x * bpp] << 16) | (cur[x * bpp + 1] << 8) | cur[x * bpp + 2]
    ;[prev, cur] = [cur, prev]
  }
  return { w, h, rgb }
}

// ── the palette ──────────────────────────────────────────────────────────────
// distance, weighted the way the eye weighs the three channels
const W = [2, 4, 3]
const lum = (c) => 2 * (c >> 16) + 4 * ((c >> 8) & 255) + 3 * (c & 255)
function dist(a, r, g, b) {
  const dr = (a >> 16) - r
  const dg = ((a >> 8) & 255) - g
  const db = (a & 255) - b
  return W[0] * dr * dr + W[1] * dg * dg + W[2] * db * db
}

// `k` colours for a histogram of colours. A colour counts by the square root
// of how often it occurs, so the black, which is most of the picture, is one
// colour and not a hundred; the seeds are the colours in order of lightness,
// cut into k runs of equal weight, and ten rounds of Lloyd's move them.
function kmeans(hist, k) {
  const cols = [...hist.keys()]
  if (cols.length <= k) return cols
  const wt = cols.map((c) => Math.sqrt(hist.get(c)))
  const order = cols.map((_, i) => i).sort((a, b) => lum(cols[a]) - lum(cols[b]))
  const total = wt.reduce((s, v) => s + v, 0)
  let centres = []
  let run = [0, 0, 0, 0]
  let acc = 0
  let next = total / k
  for (const i of order) {
    const c = cols[i]
    run[0] += (c >> 16) * wt[i]; run[1] += ((c >> 8) & 255) * wt[i]; run[2] += (c & 255) * wt[i]; run[3] += wt[i]
    acc += wt[i]
    if (acc >= next && centres.length < k - 1) {
      centres.push(run.slice(0, 3).map((v) => v / run[3]))
      run = [0, 0, 0, 0]
      next += total / k
    }
  }
  if (run[3]) centres.push(run.slice(0, 3).map((v) => v / run[3]))
  for (let pass = 0; pass < 10; pass++) {
    const sum = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]
      const r = c >> 16
      const g = (c >> 8) & 255
      const b = c & 255
      let best = 0
      let bd = Infinity
      for (let j = 0; j < centres.length; j++) {
        const [cr, cg, cb] = centres[j]
        const d = W[0] * (cr - r) ** 2 + W[1] * (cg - g) ** 2 + W[2] * (cb - b) ** 2
        if (d < bd) { bd = d; best = j }
      }
      const s = sum[best]
      s[0] += r * wt[i]; s[1] += g * wt[i]; s[2] += b * wt[i]; s[3] += wt[i]
    }
    centres = centres.map((c, j) => (sum[j][3] ? sum[j].slice(0, 3).map((v) => v / sum[j][3]) : c))
  }
  const seen = new Set()
  for (const [r, g, b] of centres) seen.add((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b))
  return [...seen]
}

const inside = (glass, x, y) => !!glass && x >= glass.x && x < glass.x + glass.w && y >= glass.y && y < glass.y + glass.h

// The palette for a set of frames, `room` colours for the room and the rest
// of `size` for the glass, and the way each pixel is put in it: `index(c, x,
// y)` answers a colour's place in `colours`.
function paletteOf(images, glass, { room: share = 56, size = 255 } = {}) {
  const inRoom = new Map()
  const pick = images.filter((_, k) => k % Math.max(1, Math.ceil(images.length / 6)) === 0)
  const glassRgba = new Uint8Array((glass ? glass.w * glass.h : 0) * pick.length * 4)
  let g = 0
  for (const im of images) {
    const sampled = pick.includes(im)
    for (let y = 0; y < im.h; y++) {
      for (let x = 0; x < im.w; x++) {
        const c = im.rgb[y * im.w + x]
        if (inside(glass, x, y)) {
          if (sampled && g < glassRgba.length) {
            glassRgba[g++] = c >> 16; glassRgba[g++] = (c >> 8) & 255; glassRgba[g++] = c & 255; glassRgba[g++] = 255
          }
        } else {
          inRoom.set(c, (inRoom.get(c) || 0) + 1)
        }
      }
    }
  }
  const room = kmeans(inRoom, glass ? share : size)
  const lit = glass ? quantize(glassRgba.subarray(0, g), size - room.length).map(([r, gg, b]) => (r << 16) | (gg << 8) | b) : []
  const colours = [...room, ...lit]
  const nearest = (c, from, to) => {
    let i = from
    let bd = Infinity
    const r = c >> 16
    const gg = (c >> 8) & 255
    const b = c & 255
    for (let j = from; j < to; j++) {
      const d = dist(colours[j], r, gg, b)
      if (d < bd) { bd = d; i = j }
    }
    return i
  }
  const roomNear = new Map()
  const glassNear = new Int16Array(65536).fill(-1)
  const index = (c, x, y) => {
    if (!lit.length || !inside(glass, x, y)) {
      let i = roomNear.get(c)
      if (i === undefined) { i = nearest(c, 0, room.length); roomNear.set(c, i) }
      return i
    }
    const key = ((c >> 19) << 11) | (((c >> 10) & 63) << 5) | ((c & 255) >> 3)
    let i = glassNear[key]
    if (i < 0) {
      const mid = ((((key >> 11) << 3) | 4) << 16) | (((((key >> 5) & 63) << 2) | 2) << 8) | (((key & 31) << 3) | 4)
      i = glassNear[key] = nearest(mid, room.length, colours.length)
    }
    return i
  }
  return { colours, index }
}

function indexed(im, index) {
  const idx = new Uint8Array(im.w * im.h)
  for (let p = 0; p < idx.length; p++) idx[p] = index(im.rgb[p], p % im.w, Math.floor(p / im.w))
  return idx
}

// ── the GIF ──────────────────────────────────────────────────────────────────
// One palette for every frame, and its 256th colour kept for the transparent
// one; the first frame whole, and every frame after it only where it differs
// from the one before, the rest transparent over what is there (disposal 1,
// leave it). It loops for as long as it is looked at.
export function gifOf(pngs, delays, glass) {
  const images = pngs.map(readPng)
  const { w, h } = images[0]
  const { colours, index } = paletteOf(images, glass, { room: 56, size: 255 })
  const palette = colours.map((c) => [c >> 16, (c >> 8) & 255, c & 255])
  while (palette.length < 256) palette.push([0, 0, 0])
  const CLEAR = 255
  const gif = GIFEncoder()
  let last = null
  images.forEach((im, k) => {
    const idx = indexed(im, index)
    let put = idx
    if (last) {
      put = new Uint8Array(idx)
      for (let p = 0; p < put.length; p++) if (idx[p] === last[p]) put[p] = CLEAR
    }
    gif.writeFrame(put, w, h, {
      palette: k === 0 ? palette : undefined,
      delay: delays[k], repeat: 0,
      transparent: k > 0, transparentIndex: CLEAR, dispose: 1,
    })
    last = idx
  })
  gif.finish()
  return Buffer.from(gif.bytes())
}

// ── the PNG of 256 colours ──────────────────────────────────────────────────
// Indexed (colour type 3), each row unfiltered, which is what a palette's
// rows compress best as. A larger share for the room here: a card's room has
// the lockup's chalk in it as well as the light.
const CRC = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
export function png8Of(png, glass) {
  const im = readPng(png)
  const { colours, index } = paletteOf([im], glass, { room: 96, size: 256 })
  const idx = indexed(im, index)
  const raw = Buffer.alloc((im.w + 1) * im.h)
  for (let y = 0; y < im.h; y++) raw.set(idx.subarray(y * im.w, (y + 1) * im.w), y * (im.w + 1) + 1)
  const head = Buffer.alloc(13)
  head.writeUInt32BE(im.w, 0)
  head.writeUInt32BE(im.h, 4)
  head[8] = 8
  head[9] = 3
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('PLTE', Buffer.from(colours.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255]))),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SEND: a letter, as a picture somebody can pass on                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The right soft key on every letter is `send`, and it does the three things
// a phone's Send did: to somebody (the share sheet, with the picture and the
// link), to the phone itself (the picture, saved), and the address, copied.
//
// The picture is drawn here with a canvas and not photographed out of the
// page. A screenshot of the DOM would need the page's fonts and filters to
// survive a trip through an SVG, and Safari is the browser most letters are
// read in and the one that least often lets them. So the screen is drawn a
// second time, from the same table (looks.js `skinOf`) and the same quirks
// (`quirks`), at 1080 by 1350, which is the portrait size every feed it will
// be posted to takes whole: the photograph of one screen in a dark room,
// and the address in the dark under it.
//
// A print is pulled through the same press here as on the page: the greys
// quantised into the inks with grain, and a riso's second drum laid a hair
// off the first. Nothing leaves the browser; the picture is made on the
// phone that asked for it.

import { colourOf, skinOf, quirks, PIX, hexRgb, signalOf, chargeOf } from './looks.js'
import { copyText } from './handoff.js'

const W = 1080
const H = 1350
const FACE = '"Jersey 10", "Geist Mono", ui-monospace, monospace'

const rgba = (hex, a) => {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function glyph(g, name, x, y, h, color) {
  const rows = PIX[name]
  if (!rows) return 0
  const s = h / rows.length
  g.fillStyle = color
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === 'X') g.fillRect(x + i * s, y + j * s, s + 0.4, s + 0.4)
  }))
  return rows[0].length * s
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

// words wrapped to a width, the way the screen wraps them: at spaces, and
// through a word that is longer than the line
function wrap(g, text, width) {
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (g.measureText(next).width <= width) { line = next; continue }
      if (line) out.push(line)
      if (g.measureText(word).width <= width) { line = word; continue }
      let chunk = ''
      for (const ch of word) {
        if (g.measureText(chunk + ch).width > width) { out.push(chunk); chunk = ch } else chunk += ch
      }
      line = chunk
    }
    out.push(line)
  }
  return out
}

// ── the press, by hand ──────────────────────────────────────────────────────
function press(g, w, h, s, q) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  let table = s.print.stops.map(hexRgb)
  let grain = s.print.grain
  if (s.kind === 'xerox') {
    const n = 24
    const dark = Math.round(n * (0.5 + q.exposure * 0.14))
    grain += Math.abs(q.exposure) * 0.12
    const [ink, , paper] = s.print.stops.map(hexRgb)
    table = Array.from({ length: n }, (_, i) => (i < dark ? ink : paper))
  }
  // grain off the letter's own seed, so the picture is the same picture
  let t = q.grainSeed * 2654435761 >>> 0
  const rnd = () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
  const n = table.length
  // the grain in cells of two pixels, which at this size is the grain the
  // page's filter lays at the page's size: per pixel it was a hiss
  const cw = Math.ceil(w / 2)
  const grainAt = new Float32Array(cw * Math.ceil(h / 2))
  for (let i = 0; i < grainAt.length; i++) grainAt[i] = (rnd() + rnd() - 1) * 0.5
  const out = new Uint8ClampedArray(d.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (d[i + 3] === 0) continue
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
      const v = Math.min(0.9999, Math.max(0, l + grainAt[(y >> 1) * cw + (x >> 1)] * grain * 1.1))
      const c = table[Math.floor(v * n)]
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = d[i + 3]
    }
  }
  // the second drum, a hair off the first
  if (s.print.ghost) {
    const gx = Math.round(q.slipX * 2.2)
    const gy = Math.round(q.slipY * 2.2)
    const k = s.print.ghost
    const src = out.slice()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = x - gx
        const sy = y - gy
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
        const i = (y * w + x) * 4
        const j = (sy * w + sx) * 4
        if (!src[i + 3]) continue
        out[i] = src[i] * (1 - k) + src[j] * k
        out[i + 1] = src[i + 1] * (1 - k) + src[j + 1] * k
        out[i + 2] = src[i + 2] * (1 - k) + src[j + 2] * k
      }
    }
  }
  img.data.set(out)
  g.putImageData(img, 0, 0)
}

// ── the screen ──────────────────────────────────────────────────────────────
// Drawn flat, at its own size, onto its own canvas; the room turns it.
function drawScreen(o) {
  const colour = colourOf(o.look, o.seed)
  const s = skinOf(colour)
  const q = quirks(o.seed)
  const sw = 820
  const sh = Math.round(sw * q.ar)
  const u = sw / 100 // one cqw
  const cv = document.createElement('canvas')
  cv.width = sw
  cv.height = sh
  const g = cv.getContext('2d', { willReadFrequently: !!s.print })
  const flat = s.kind === 'poster' || s.kind === 'riso'

  roundRect(g, 0, 0, sw, sh, Math.max(4, (q.rad / 100) * sw))
  g.save()
  g.clip()

  // the panel, brightest where this phone's backlight is
  const hx = (q.hx / 100) * sw
  const hy = (q.hy / 100) * sh
  const pg = g.createRadialGradient(hx, hy, 0, hx, hy, Math.hypot(Math.max(hx, sw - hx), Math.max(hy, sh - hy)))
  pg.addColorStop(0, s.hi)
  pg.addColorStop(0.52, s.mid)
  pg.addColorStop(1, s.lo)
  g.fillStyle = pg
  g.fillRect(0, 0, sw, sh)

  // the bands
  const topH = (q.topPad + 9.6 * 2 + 0.6 + 1.8 + (flat ? 1 : 0)) * u
  const botH = 15 * u
  if (!flat) {
    const tg = g.createLinearGradient(0, 0, 0, topH)
    tg.addColorStop(0, s.top)
    tg.addColorStop(1, s.top2)
    g.fillStyle = tg
    g.fillRect(0, 0, sw, topH)
    g.fillStyle = s.bot
    g.fillRect(0, sh - botH, sw, botH)
  }
  const lit = flat ? s.ink : s.lit
  const bloom = flat ? 'transparent' : s.bloom
  const withBloom = (fn) => {
    g.save()
    if (!flat) { g.shadowColor = bloom; g.shadowBlur = 2.4 * u }
    fn()
    g.restore()
  }

  // row one: the aerial and the bars, the name, the count, the battery
  const r1 = (q.topPad + (flat ? 1 : 0)) * u
  const rowH = 9.6 * u
  const mid1 = r1 + rowH / 2
  withBloom(() => {
    let x = 3 * u
    x += glyph(g, q.ant === 't' ? 'antt' : 'anty', x, mid1 - 3.7 * u, 7.4 * u, lit) + u
    glyph(g, `sig${o.sig}`, x, mid1 - 3.7 * u, 7.4 * u, lit)
    const bw = (5.4 * u * 17) / 8
    glyph(g, `bat${q.bat}${o.bat}`, sw - 3 * u - bw, mid1 - 2.7 * u, 5.4 * u, lit)
    g.fillStyle = lit
    g.textBaseline = 'middle'
    g.font = `400 ${10.6 * u}px ${FACE}`
    const cw = g.measureText(o.counter).width
    g.textAlign = 'left'
    g.fillText(o.counter, sw - 3 * u - bw - 2.4 * u - cw, mid1 + 0.4 * u)
    g.font = `400 ${9.2 * u}px ${FACE}`
    const left = 3 * u + 19 * u
    const right = sw - 3 * u - bw - 2.4 * u - cw - 2.4 * u
    let name = o.name
    while (name.length > 1 && g.measureText(name).width > right - left) name = name.slice(0, -1)
    if (name !== o.name) name = `${name.slice(0, -1)}…`
    if (q.nameAt === 'start') { g.textAlign = 'left'; g.fillText(name, left + u, mid1 + 0.4 * u) }
    else { g.textAlign = 'center'; g.fillText(name, (left + right) / 2, mid1 + 0.4 * u) }
    // row two: the pen and the mode, and the handle
    const mid2 = r1 + rowH + 0.6 * u + rowH / 2
    const pw = glyph(g, o.icon, 3 * u, mid2 - 3.5 * u, 7 * u, lit)
    g.textAlign = 'left'
    g.font = `400 ${10.6 * u}px ${FACE}`
    g.fillText(o.mode, 3 * u + pw + 2.4 * u, mid2 + 0.4 * u)
    if (o.handle) {
      g.globalAlpha = 0.82
      g.textAlign = 'right'
      g.font = `400 ${7.4 * u}px ${FACE}`
      g.fillText(o.handle, sw - 3 * u, mid2 + 0.4 * u)
      g.globalAlpha = 1
    }
  })

  // the words, as large as the screen will hold them
  const bx = q.pad * u
  const by = topH + q.lift * u
  const bw = sw - bx - 3.6 * u
  const bh = sh - botH - by - u
  let size = 15.4
  let lines = []
  for (const step of [15.4, 12.4, 10, 8.4, 7.2, 6.2, 5.4]) {
    size = step
    g.font = `400 ${size * u}px ${FACE}`
    lines = wrap(g, o.text, bw)
    if (lines.length * size * u * 1.02 <= bh) break
  }
  const lh = size * u * 1.02
  const max = Math.max(1, Math.floor(bh / lh))
  if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] = `${lines[max - 1].replace(/\s*\S*$/, '')}…` }
  g.save()
  g.fillStyle = s.ink
  g.textAlign = 'left'
  g.textBaseline = 'top'
  g.shadowColor = s.kind === 'neg' ? 'rgba(255, 255, 255, 0.55)' : s.soft
  g.shadowBlur = s.kind === 'neg' ? 2.2 * u : 0.5 * u
  lines.forEach((line, i) => g.fillText(line, bx, by + i * lh + size * u * 0.08))
  // and the cursor, after the last word
  const last = lines[lines.length - 1] || ''
  const cx = bx + g.measureText(last).width + 0.06 * size * u
  g.fillStyle = s.cur
  g.fillRect(cx, by + (lines.length - 1) * lh + size * u * 0.1, Math.max(2, 0.07 * size * u), 0.84 * size * u)
  g.restore()

  // the soft keys
  withBloom(() => {
    const my = sh - botH / 2 - 0.3 * u
    g.fillStyle = lit
    g.textBaseline = 'middle'
    g.font = `400 ${11.4 * u}px ${FACE}`
    g.textAlign = 'left'
    g.fillText(o.left, 3.6 * u, my)
    g.textAlign = 'right'
    g.fillText(o.right, sw - 3.6 * u, my)
    g.font = `400 ${9 * u}px ${FACE}`
    const hw = (5.6 * u * 7) / 6
    const tw = g.measureText(String(o.hearts)).width
    const x0 = sw / 2 - (hw + 1.6 * u + tw) / 2
    glyph(g, o.hearted ? 'heart' : 'heartO', x0, my - 2.8 * u, 5.6 * u, lit)
    g.textAlign = 'left'
    g.fillText(String(o.hearts), x0 + hw + 1.6 * u, my + 0.3 * u)
  })

  // the LCD over all of it: the grid, the glare, the dust, a ghost column
  const pitch = q.pitch * (sw / 470)
  g.fillStyle = s.kind === 'neg' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.14)'
  for (let y = 0; y < sh; y += pitch) g.fillRect(0, y, sw, Math.max(1, pitch * 0.34))
  g.fillStyle = s.kind === 'neg' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.11)'
  for (let x = 0; x < sw; x += pitch) g.fillRect(x, 0, Math.max(1, pitch * 0.34), sh)
  if (q.streak && s.kind !== 'xerox') {
    const sx = (q.streakX / 100) * sw
    const sg = g.createLinearGradient(0, sh * 0.22, 0, sh * 0.86)
    sg.addColorStop(0, 'rgba(0,0,0,0)')
    sg.addColorStop(0.3, 'rgba(0,0,0,0.1)')
    sg.addColorStop(0.75, 'rgba(0,0,0,0.1)')
    sg.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = sg
    g.fillRect(sx, sh * 0.22, 1.2 * u, sh * 0.64)
  }
  const a = (q.glare * Math.PI) / 180
  const gl = g.createLinearGradient(sw / 2 - Math.sin(a) * sw / 2, sh / 2 + Math.cos(a) * sh / 2, sw / 2 + Math.sin(a) * sw / 2, sh / 2 - Math.cos(a) * sh / 2)
  if (s.kind === 'xerox') {
    const left = q.lid === 'left'
    const lg = g.createLinearGradient(left ? 0 : sw, 0, left ? sw * 0.24 : sw * 0.76, 0)
    lg.addColorStop(0, 'rgba(0,0,0,0.3)')
    lg.addColorStop(0.5, 'rgba(0,0,0,0.08)')
    lg.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = lg
    g.fillRect(0, 0, sw, sh)
  } else {
    gl.addColorStop(0, 'rgba(0,0,0,0.08)')
    gl.addColorStop(0.4, 'rgba(0,0,0,0)')
    gl.addColorStop(1, `rgba(255,255,255,${q.glareA})`)
    g.fillStyle = gl
    g.fillRect(0, 0, sw, sh)
  }
  if (flat) {
    g.strokeStyle = 'rgba(0, 0, 0, 0.85)'
    g.lineWidth = 2.8 * u
    g.strokeRect(0, 0, sw, sh)
  }
  g.restore()
  if (s.print) press(g, sw, sh, s, q)
  return { cv, s, q, sw, sh }
}

// ── the room ────────────────────────────────────────────────────────────────
export async function renderLetter(o) {
  if (document.fonts && document.fonts.load) {
    try { await document.fonts.load(`400 40px ${FACE}`) } catch { /* the fallback, then */ }
  }
  const { cv: scr, s, q, sw, sh } = drawScreen(o)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  const cx = W / 2
  const cy = H / 2 - 36
  // the light it throws on the dark round it
  const glow = s.print ? 0.1 : 0.34 * s.k
  const hg = g.createRadialGradient(cx, cy, sw * 0.2, cx, cy, sw * 0.95)
  hg.addColorStop(0, rgba(s.glow, glow))
  hg.addColorStop(0.55, rgba(s.glow, glow * 0.32))
  hg.addColorStop(1, rgba(s.glow, 0))
  g.fillStyle = hg
  g.fillRect(0, 0, W, H)
  // the screen, turned as this phone was held, with its edge lit
  g.save()
  g.translate(cx, cy)
  g.rotate((q.rz * Math.PI) / 180)
  g.shadowColor = s.print ? 'rgba(0, 0, 0, 0.9)' : rgba(s.glow, 0.5 * s.k)
  g.shadowBlur = s.print ? 40 : 30
  g.drawImage(scr, -sw / 2, -sh / 2)
  g.restore()
  // the address, in the dark under it
  g.fillStyle = 'rgba(244, 241, 234, 0.42)'
  g.font = `400 34px ${FACE}`
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillText(o.caption || 'celestual.us', cx, H - 64)
  // and the sensor's grain over the whole photograph
  const n = document.createElement('canvas')
  n.width = 128
  n.height = 128
  const ng = n.getContext('2d')
  const nd = ng.createImageData(128, 128)
  let t = (q.grainSeed * 40503) >>> 0
  for (let i = 0; i < nd.data.length; i += 4) {
    t = (Math.imul(t, 1664525) + 1013904223) >>> 0
    const v = t >>> 24
    nd.data[i] = v; nd.data[i + 1] = v; nd.data[i + 2] = v; nd.data[i + 3] = 18
  }
  ng.putImageData(nd, 0, 0)
  g.globalCompositeOperation = 'screen'
  g.fillStyle = g.createPattern(n, 'repeat')
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'source-over'
  return new Promise((done) => cv.toBlob((b) => done(b), 'image/png'))
}

// What the picture says, off a letter: the same rows the screen shows.
export function letterFace(l, { name, handle }) {
  const open = l.body !== null && l.body !== undefined
  const text = open ? l.body : starred(l.words, l.chars, l.id)
  return {
    look: l.look, seed: l.id, text,
    name, handle,
    counter: `${280 - (open ? l.body.length : l.chars || 0)}/1`,
    mode: open ? 'abc' : 'locked', icon: open ? 'pen' : 'lock',
    sig: signalOf(l.hearts), bat: chargeOf(l.at),
    hearts: l.hearts || 0, hearted: !!l.hearted,
    left: 'options', right: 'send',
  }
}

// A shut letter, as the phone drew a hidden one: a star for every letter of
// every word, the lengths invented from the letter's id, so nothing of the
// words is in the page (parts.jsx `Redacted` says why).
export function starred(words = 0, chars = 0, seed = '') {
  const n = Math.max(1, Math.min(120, words | 0))
  const mean = Math.max(2, Math.min(12, Math.round((chars || n * 5) / n)))
  const out = []
  for (let i = 0; i < n; i++) {
    let h = 0x9e3779b9
    const s = `${seed}#${i}`
    for (let j = 0; j < s.length; j++) h = Math.imul(h ^ s.charCodeAt(j), 0x27d4eb2d) >>> 0
    out.push('*'.repeat(Math.max(2, Math.min(14, mean - 2 + (h % 5)))))
  }
  return out.join(' ')
}

// ── the three ways out ──────────────────────────────────────────────────────
export const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// The picture, drawn ahead: the send menu asks for it when it opens, so by
// the time a finger picks `share` the picture is there and the share sheet
// can be asked for inside that tap. A phone refuses a share sheet that is
// asked for after the tap has finished, and drawing it takes a moment.
const READY = new Map()
const keyOf = (o) => `${o.seed}|${o.look ? o.look.tint || '' : ''}|${o.text.length}|${o.hearts}|${o.hearted}`
export function prepareLetter(o) {
  const k = keyOf(o)
  if (!READY.has(k)) {
    const job = { blob: null, promise: null }
    job.promise = renderLetter(o).then((b) => { job.blob = b; return b }).catch(() => null)
    READY.set(k, job)
  }
  return READY.get(k).promise
}

function fileOf(blob) {
  return blob && typeof File !== 'undefined' ? new File([blob], 'celestual-letter.png', { type: 'image/png' }) : null
}

// Called inside the tap. Answers what happened: 'sent', 'saved', 'copied',
// 'left' (the share sheet was closed without sending) or 'failed'.
export function sendLetter(how, o, url) {
  if (how === 'copy') return copyText(url).then((ok) => (ok ? 'copied' : 'failed'))
  if (how === 'share') {
    const text = o.name ? `a letter for ${o.name}, on the wall` : 'a letter on the wall'
    const ready = READY.get(keyOf(o))
    const shareWith = (blob) => {
      const file = fileOf(blob)
      const data = file && navigator.canShare && navigator.canShare({ files: [file] })
        ? { files: [file], text, url }
        : { text, url }
      return navigator.share(data).then(() => 'sent', (e) => (e && e.name === 'AbortError' ? 'left' : 'failed'))
    }
    // the picture is ready: the sheet is asked for now, in the tap
    if (ready && ready.blob) return shareWith(ready.blob)
    // it is not: the link goes now, in the tap, rather than the picture
    // after it, which the phone would refuse
    return shareWith(null)
  }
  if (how === 'save') {
    return prepareLetter(o).then((blob) => {
      if (!blob) return 'failed'
      const a = document.createElement('a')
      const href = URL.createObjectURL(blob)
      a.href = href
      a.download = 'celestual-letter.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 4000)
      return 'saved'
    })
  }
  return Promise.resolve('failed')
}

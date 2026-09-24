// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SHARE: a letter, as a picture somebody can pass on                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The right soft key on every letter is `share`, and it does the three things
// a phone's Send menu did: to somebody (the share sheet, with the picture and
// the link), to the phone itself (the picture, saved), and the address,
// copied. It said `send` until the composer's act said `send anonymously`,
// and one word for putting a letter up and for passing one on is a word a
// person has to read twice.
//
// The picture is drawn here with a canvas and not photographed out of the
// page. A screenshot of the DOM would need the page's fonts and filters to
// survive a trip through an SVG, and Safari is the browser most letters are
// read in and the one that least often lets them. So the screen is drawn a
// second time, from the same table (looks.js `skinOf`) and the same quirks
// (`quirks`), at 1080 by 1350, which is the portrait size every feed it will
// be posted to takes whole: the photograph of one screen in a dark room,
// and the product's own signature in the dark under it (`signature`). The
// picture at the head of the words is dithered by the page's own hand
// (screen.jsx `dither`).
//
// A print is pulled through the same press here as on the page: the greys
// quantised into the inks with grain, and a riso's second drum laid a hair
// off the first. Nothing leaves the browser; the picture is made on the
// phone that asked for it.

import { colourOf, skinOf, quirks, PIX, hexRgb, signalOf, chargeOf } from './looks.js'
import { dither, loadImage, PIC_CELLS } from './screen.jsx'
import { ECL, NEAR, CHALK, ringPath, starPath, rad } from './mark.js'
import { copyText } from './handoff.js'

const W = 1080
const H = 1350
const FACE = '"Jersey 10", "Geist Mono", ui-monospace, monospace'
// the word's face, with the fallbacks wall.css gives `--f-display`
const SERIF = "'Newsreader', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

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
// through a word that is longer than the line. `widthAt` is a width, or the
// width of line i, since the lines beside a picture are shorter
function wrap(g, text, widthAt) {
  const wAt = typeof widthAt === 'function' ? widthAt : () => widthAt
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (g.measureText(next).width <= wAt(out.length)) { line = next; continue }
      if (line) out.push(line)
      if (g.measureText(word).width <= wAt(out.length)) { line = word; continue }
      let chunk = ''
      for (const ch of word) {
        if (g.measureText(chunk + ch).width > wAt(out.length)) { out.push(chunk); chunk = ch } else chunk += ch
      }
      line = chunk
    }
    out.push(line)
  }
  return out
}

// a line cut to a width with an ellipsis, as the status rows cut theirs
function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text
  let t = Array.from(text)
  while (t.length > 1 && g.measureText(`${t.join('')}…`).width > max) t = t.slice(0, -1)
  return `${t.join('')}…`
}

// ── the press, by hand ──────────────────────────────────────────────────────
// a gaussian blur of `sd` pixels, across then down, of the luminance and of
// the coverage with it, so the edge of the glass does not blur into black
function soften(lum, cover, w, h, sd) {
  const r = Math.max(1, Math.ceil(sd * 2.5))
  const n = 2 * r + 1
  const k = new Float32Array(n)
  let sum = 0
  for (let i = 0; i < n; i++) { k[i] = Math.exp(-((i - r) ** 2) / (2 * sd * sd)); sum += k[i] }
  for (let i = 0; i < n; i++) k[i] /= sum
  const tl = new Float32Array(lum.length)
  const tc = new Float32Array(lum.length)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let a = 0
      let c = 0
      for (let j = 0; j < n; j++) {
        const p = row + (x + j < r ? 0 : x + j - r >= w ? w - 1 : x + j - r)
        a += lum[p] * k[j]
        c += cover[p] * k[j]
      }
      tl[row + x] = a
      tc[row + x] = c
    }
  }
  const al = new Float32Array(w)
  const ac = new Float32Array(w)
  for (let y = 0; y < h; y++) {
    al.fill(0)
    ac.fill(0)
    for (let j = 0; j < n; j++) {
      const p = Math.min(h - 1, Math.max(0, y + j - r)) * w
      const kj = k[j]
      for (let x = 0; x < w; x++) { al[x] += tl[p + x] * kj; ac[x] += tc[p + x] * kj }
    }
    const row = y * w
    for (let x = 0; x < w; x++) lum[row + x] = ac[x] > 0 ? al[x] / ac[x] : 0
  }
}

function press(g, w, h, s, q) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  // the photograph softened a hair before it is quantised, as the page's
  // filter does (looks.js `printFilter`), at two pixels to the page's one:
  // unsoftened, the LCD's grid printed as a mesh
  const lum = new Float32Array(w * h)
  const cover = new Float32Array(w * h)
  for (let k = 0; k < lum.length; k++) {
    const i = k * 4
    cover[k] = d[i + 3] / 255
    lum[k] = cover[k] * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
  }
  soften(lum, cover, w, h, s.print.blur * 2)
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
      const l = lum[y * w + x]
      const v = Math.min(0.9999, Math.max(0, l + grainAt[(y >> 1) * cw + (x >> 1)] * grain * 0.65))
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
// `dots` is the picture at the head of the words, dithered, or nothing.
// The words step down the page's sizes (screen.jsx `useFit`) and then three
// more, where the page would scroll and a picture cannot.
const SIZES = [15.4, 13.8, 12.4, 11.2, 10, 9.2, 8.4, 7.6, 6.8, 6.2, 5.4]
function drawScreen(o, dots = null) {
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
  // how far in the status rows stand: on a print, clear of its rule
  const ex = flat ? 4 * u : 3 * u

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
    // a copy's lit words have none (looks.js `skinOf`)
    if (bloom !== 'transparent') { g.shadowColor = bloom; g.shadowBlur = 2.4 * u }
    fn()
    g.restore()
  }

  // row one: the aerial and the bars, the name, the count, the battery
  const r1 = (q.topPad + (flat ? 1 : 0)) * u
  const rowH = 9.6 * u
  const mid1 = r1 + rowH / 2
  withBloom(() => {
    let x = ex
    x += glyph(g, q.ant === 't' ? 'antt' : 'anty', x, mid1 - 3.7 * u, 7.4 * u, lit) + u
    glyph(g, `sig${o.sig}`, x, mid1 - 3.7 * u, 7.4 * u, lit)
    const bw = (5.4 * u * 17) / 8
    glyph(g, `bat${q.bat}${o.bat}`, sw - ex - bw, mid1 - 2.7 * u, 5.4 * u, lit)
    g.fillStyle = lit
    g.textBaseline = 'middle'
    g.font = `400 ${10.6 * u}px ${FACE}`
    const cw = g.measureText(o.counter).width
    g.textAlign = 'left'
    g.fillText(o.counter, sw - ex - bw - 2.4 * u - cw, mid1 + 0.4 * u)
    g.font = `400 ${9.2 * u}px ${FACE}`
    const left = ex + 19 * u
    const right = sw - ex - bw - 2.4 * u - cw - 2.4 * u
    if (q.nameAt === 'start') { g.textAlign = 'left'; g.fillText(fit(g, o.name || '', right - left - u), left + u, mid1 + 0.4 * u) }
    else { g.textAlign = 'center'; g.fillText(fit(g, o.name || '', right - left), (left + right) / 2, mid1 + 0.4 * u) }
    // row two: the pen and the mode, and the handle in what is left of it
    const mid2 = r1 + rowH + 0.6 * u + rowH / 2
    const pw = glyph(g, o.icon, ex, mid2 - 3.5 * u, 7 * u, lit)
    g.textAlign = 'left'
    g.font = `400 ${10.6 * u}px ${FACE}`
    g.fillText(o.mode, ex + pw + 2.4 * u, mid2 + 0.4 * u)
    const modeEnd = ex + pw + 2.4 * u + g.measureText(o.mode).width + 2.4 * u
    if (o.handle) {
      g.globalAlpha = 0.82
      g.textAlign = 'right'
      g.font = `400 ${7.4 * u}px ${FACE}`
      g.fillText(fit(g, o.handle, sw - ex - modeEnd), sw - ex, mid2 + 0.4 * u)
      g.globalAlpha = 1
    }
  })

  // the words, as large as the screen will hold them, and beside the
  // picture its first lines (screen.css `.wl-scr-body` and `.wl-scr-mms`)
  const bx = (q.pad + (s.print ? 1.4 : 0)) * u
  const by = topH + q.lift * u
  const bw = sw - bx - (flat ? 5 : s.kind === 'xerox' ? 4.4 : 3.6) * u
  const bh = sh - botH - by - u
  // a sealed letter is wrapped as x's, since a star at 4/3 is as wide
  const text = o.sealed ? String(o.text).replace(/\*/g, 'x') : o.text
  const px = 0.25 * u // one of the page's pixels, on a phone
  let size = SIZES[0]
  let lines = []
  let n = 0
  let boxW = 0
  // the words at `step`: the picture the fewest whole lines tall that keep
  // it 27cqw inside its frame, those lines beside it. Answers whether it fits
  const setAt = (step) => {
    const lh0 = step * u * 1.02
    size = step
    g.font = `400 ${step * u}px ${FACE}`
    n = dots ? Math.ceil((30 * u + px) / lh0) : 0
    boxW = n * lh0 - u - px
    const widthAt = (i) => (i < n ? bw - boxW - 2.6 * u : bw)
    lines = wrap(g, text, widthAt)
    return Math.max(lines.length * lh0, n * lh0 - px) <= bh + px
  }
  let step = 0
  while (step < SIZES.length && !setAt(SIZES[step])) step++
  if (step === SIZES.length) setAt(SIZES[SIZES.length - 1])
  else if (step > 0) {
    // then as large as it will go below the step above, as on the page
    let lo = SIZES[step]
    let hi = SIZES[step - 1]
    while (hi - lo > 0.05) {
      const m = (lo + hi) / 2
      if (setAt(m)) lo = m
      else hi = m
    }
    setAt(lo)
  }
  const S = size * u
  const lh = S * 1.02
  const max = Math.max(1, Math.floor((bh + px) / lh))
  if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] = `${lines[max - 1].replace(/\s*\S*$/, '')}…` }
  const xAt = (i) => (i < n ? bx + boxW + 2.6 * u : bx)
  const font = `400 ${S}px ${FACE}`
  const star = `400 ${(S * 4) / 3}px ${FACE}`
  g.save()
  g.font = font
  g.fillStyle = s.ink
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.shadowColor = s.kind === 'neg' ? 'rgba(255, 255, 255, 0.3)' : s.soft
  g.shadowBlur = s.kind === 'neg' ? 2.2 * u : 0.5 * u
  // where a line's baseline is: CSS's half leading, off the face's own
  // ascent and descent, so the words sit where the page's do
  const mx = g.measureText('x')
  const fa = mx.fontBoundingBoxAscent
  const fd = mx.fontBoundingBoxDescent
  const base = fa > 0 && fd >= 0 ? (lh - fa - fd) / 2 + fa : 0.775 * S
  // a star's ink, at 4/3, centred on an x's (screen.css `.wl-scr-stars`)
  let starDy = 0
  if (o.sealed) {
    g.font = star
    const ms = g.measureText('*')
    starDy = ((ms.actualBoundingBoxAscent - ms.actualBoundingBoxDescent) - (mx.actualBoundingBoxAscent - mx.actualBoundingBoxDescent)) / 2
    g.font = font
  }
  lines.forEach((line, i) => {
    const x = xAt(i)
    const y = by + i * lh + base
    if (!o.sealed) { g.fillText(line, x, y); return }
    let at = 0
    for (const run of line.split(/(x+)/)) {
      if (!run) continue
      const x0 = x + g.measureText(line.slice(0, at)).width
      if (run[0] === 'x') { g.font = star; g.fillText('*'.repeat(run.length), x0, y + starDy); g.font = font }
      else g.fillText(run, x0, y)
      at += run.length
    }
  })
  // no cursor: a letter being read is not being written
  g.restore()

  // the picture at the head of the words, framed, in the screen's ink or a
  // print's own inks (Letter.jsx `Picture`), drawn once and scaled square
  if (dots && n) {
    const t = document.createElement('canvas')
    t.width = dots.cells
    t.height = dots.cells
    const tg = t.getContext('2d')
    const img = tg.createImageData(dots.cells, dots.cells)
    const tones = s.print ? s.print.pic.map(hexRgb) : null
    const top = tones ? tones.length - 1 : 0
    const [r, gg, b] = hexRgb(s.ink)
    for (let i = 0; i < dots.alpha.length; i++) {
      const k = i * 4
      const c = tones ? tones[Math.round((dots.alpha[i] / 255) * top)] : null
      img.data[k] = c ? c[0] : r
      img.data[k + 1] = c ? c[1] : gg
      img.data[k + 2] = c ? c[2] : b
      img.data[k + 3] = c ? 255 : dots.alpha[i]
    }
    tg.putImageData(img, 0, 0)
    g.save()
    g.imageSmoothingEnabled = false
    if (s.kind === 'neg') { g.shadowColor = 'rgba(255, 255, 255, 0.35)'; g.shadowBlur = 1.2 * u }
    g.drawImage(t, bx + u, by + u, boxW - 2 * u, boxW - 2 * u)
    g.shadowBlur = 0
    g.lineWidth = 0.5 * u
    g.globalAlpha = s.print && s.kind !== 'xerox' ? 1 : 0.55
    g.strokeStyle = s.ink
    g.strokeRect(bx + 0.25 * u, by + 0.25 * u, boxW - 0.5 * u, boxW - 0.5 * u)
    g.restore()
  }

  // the soft keys, and the heart, which says nothing of a count of none
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
    const count = o.hearts ? String(o.hearts) : ''
    const tw = count ? g.measureText(count).width + 1.6 * u : 0
    const x0 = sw / 2 - (hw + tw) / 2
    glyph(g, o.hearted ? 'heart' : 'heartO', x0, my - 2.8 * u, 5.6 * u, lit)
    g.textAlign = 'left'
    if (count) g.fillText(count, x0 + hw + 1.6 * u, my + 0.3 * u)
  })

  // the LCD over all of it: the grid, the glare, the dust, a ghost column
  const pitch = q.pitch * (sw / 470)
  g.fillStyle = s.kind === 'neg' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(0, 0, 0, 0.14)'
  for (let y = 0; y < sh; y += pitch) g.fillRect(0, y, sw, Math.max(1, pitch * 0.34))
  g.fillStyle = s.kind === 'neg' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.11)'
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
    // the lid's grey, kept in the margin short of the first letter
    const left = q.lid === 'left'
    const lg = g.createLinearGradient(left ? 0 : sw, 0, left ? sw * 0.09 : sw * 0.91, 0)
    lg.addColorStop(0, 'rgba(0,0,0,0.2)')
    lg.addColorStop(0.44, 'rgba(0,0,0,0.05)')
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

// ── the signature ───────────────────────────────────────────────────────────
// The picture is signed the way every bar in the product is: the mark and
// the word (parts.jsx `Brand`), in the lockup's own proportions (DESIGN.md
// 3.3): the mark 1.13 times the word, 0.38em between them, the word lifted
// 0.03em because a serif's optical centre sits below its cap line. It was
// `celestual.us` in the screen's pixel face at 42 per cent, which on a feed
// read as an address set in a phone's type and not as the name of anything.
//
// The mark is drawn from mark.js's own paths and layered the way
// `eclipticSVG` layers them: the ring, then the star with the gutter cut out
// of it where the ring passes in front, then the ring's near half again on
// top. It is drawn opaque on a canvas of its own and laid on the picture
// once, at the lockup's strength, so no layer is counted twice where two
// overlap and the glow belongs to the whole mark rather than to each piece.
// Paths and not an SVG image: a picture drawn from an image can taint the
// canvas in the browser most letters are shared from, and a tainted canvas
// cannot be made into a file.
const WORD = 46
const SIGN_Y = H - 86
const SIGN_ALPHA = 0.9

// the half plane the ring is in front of the star in (mark.js `NEAR`)
function clipNear(g) {
  g.save()
  g.translate(50, 50)
  g.rotate(rad(ECL.tilt))
  g.translate(-50, -50)
  g.beginPath()
  g.rect(NEAR.x, NEAR.y, NEAR.width, NEAR.height)
  g.restore()
  g.clip()
}

function markCanvas(size) {
  const k = size / 100
  const ring = new Path2D(ringPath())
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const g = cv.getContext('2d')
  // the ring, whole
  g.fillStyle = CHALK
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fill(ring, 'evenodd')
  // the star, with the gutter cut out of it on the near side
  const sc = document.createElement('canvas')
  sc.width = size
  sc.height = size
  const s = sc.getContext('2d')
  s.fillStyle = CHALK
  s.setTransform(k, 0, 0, k, 50 * k, 50 * k)
  s.fill(new Path2D(starPath(ECL)))
  s.setTransform(k, 0, 0, k, 0, 0)
  s.save()
  clipNear(s)
  s.globalCompositeOperation = 'destination-out'
  s.fill(new Path2D(ringPath(ECL.gutter)), 'evenodd')
  s.restore()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(sc, 0, 0)
  // and the ring's near half in front of it
  g.setTransform(k, 0, 0, k, 0, 0)
  g.save()
  clipNear(g)
  g.fill(ring, 'evenodd')
  g.restore()
  return cv
}

function signature(g, cx, cy) {
  const mark = Math.round(WORD * 1.13)
  const gap = WORD * 0.38
  g.save()
  g.font = `500 ${WORD}px ${SERIF}`
  // the display tracking, where the canvas has it; measured after, so the
  // pair is centred on the word as it is drawn either way
  if ('letterSpacing' in g) g.letterSpacing = `${(-0.022 * WORD).toFixed(2)}px`
  const m = g.measureText('celestual.')
  const x0 = Math.round(cx - (mark + gap + m.width) / 2)
  // the word's baseline where CSS puts it in a line box one em tall centred
  // on the mark (`.wl-brand`), then lifted
  const fa = m.fontBoundingBoxAscent
  const fd = m.fontBoundingBoxDescent
  const base = fa > 0 && fd >= 0 ? cy - WORD / 2 + (WORD - fa - fd) / 2 + fa : cy + WORD * 0.3
  g.globalAlpha = SIGN_ALPHA
  // the mark keeps the bar's hair of light round it (wall.css `.wl-brand-mark`)
  g.shadowColor = 'rgba(244, 241, 234, 0.18)'
  g.shadowBlur = 20
  g.drawImage(markCanvas(mark), x0, Math.round(cy - mark / 2))
  g.shadowColor = 'transparent'
  g.shadowBlur = 0
  g.fillStyle = CHALK
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.fillText('celestual.', x0 + mark + gap, base - WORD * 0.03)
  g.restore()
}

// ── the room ────────────────────────────────────────────────────────────────
export async function renderLetter(o) {
  if (document.fonts && document.fonts.load) {
    // with the words, so the faces for any letters past plain latin come too
    try { await document.fonts.load(`400 40px ${FACE}`, `${o.text}${o.name || ''}${o.handle || ''}`) } catch { /* the fallback, then */ }
    try { await document.fonts.load(`500 ${WORD}px ${SERIF}`, 'celestual.') } catch { /* the fallback, then */ }
  }
  // the picture, dithered as the page dithers it. Only one that came with
  // CORS: a picture that did not would taint the canvas, and a tainted
  // canvas cannot be made into a file
  let dots = null
  if (o.pic) {
    const got = await loadImage(o.pic)
    const k = skinOf(colourOf(o.look, o.seed)).kind
    const cells = o.picCells || PIC_CELLS
    if (got && got.cors) {
      try {
        const a = dither(got.img, cells, k === 'neg', k === 'xerox' ? 1 : 3)
        if (a) dots = { cells, alpha: a }
      } catch { dots = null }
    }
  }
  const { cv: scr, s, q, sw, sh } = drawScreen(o, dots)
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
  // the signature, in the dark under it
  signature(g, cx, SIGN_Y)
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
  // a JPEG: a PNG of a photograph this size took seconds to make on a phone
  return new Promise((done) => cv.toBlob((b) => done(b), 'image/jpeg', 0.92))
}

// What the picture says, off a letter: the same rows the screen shows, and
// the picture at the head of the words, when the page has one (`pic`).
export function letterFace(l, { name, handle, pic = '', cells = PIC_CELLS }) {
  const open = l.body !== null && l.body !== undefined
  const text = open ? l.body : starred(l.words, l.chars, l.id)
  return {
    look: l.look, seed: l.id, text, sealed: !open,
    name, handle, pic, picCells: cells,
    counter: `${280 - (open ? l.body.length : l.chars || 0)}/1`,
    mode: open ? 'abc' : 'locked', icon: open ? 'pen' : 'lock',
    sig: signalOf(l.hearts), bat: chargeOf(l.at),
    hearts: l.hearts || 0, hearted: !!l.hearted,
    left: 'options', right: 'share',
  }
}

// A shut letter, as the phone drew a hidden one: a star for every letter of
// every word, the lengths invented from the letter's id, so nothing of the
// words is in the page (parts.jsx `Redacted` says why).
export function starred(words = 0, chars = 0, seed = '') {
  const n = Math.max(1, Math.min(120, words | 0))
  // the letters, not the letters and the space after each word
  const mean = Math.max(2, Math.min(12, Math.round(((chars || n * 5) - (n - 1)) / n)))
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

// The picture, drawn ahead: the letter asks for it when the share menu opens,
// so by the time a finger picks `to someone` the picture is there and the share
// sheet can be asked for inside that tap. A phone refuses a share sheet that
// is asked for after the tap has finished, and drawing it takes a moment,
// which starts after the next frame so the menu that asked is on the glass
// first. The last few are kept; one that failed is dropped, so the next ask
// draws it again.
const READY = new Map()
const keyOf = (o) => `${o.seed}|${o.look ? o.look.tint || '' : ''}|${o.text.length}|${o.hearts}|${o.hearted}|${o.name}|${o.handle}|${o.pic || ''}`
const painted = () => new Promise((done) => {
  if (typeof requestAnimationFrame !== 'function') { done(); return }
  requestAnimationFrame(() => setTimeout(done, 0))
})
export function prepareLetter(o) {
  const k = keyOf(o)
  if (!READY.has(k)) {
    const job = { blob: null, promise: null }
    const drop = () => { if (READY.get(k) === job) READY.delete(k) }
    job.promise = painted().then(() => renderLetter(o))
      .then((b) => { job.blob = b; if (!b) drop(); return b })
      .catch(() => { drop(); return null })
    READY.set(k, job)
    while (READY.size > 4) READY.delete(READY.keys().next().value)
  }
  return READY.get(k).promise
}
export const isReady = (o) => !!(READY.get(keyOf(o)) || {}).blob

function fileOf(blob) {
  return blob && typeof File !== 'undefined' ? new File([blob], 'celestual-letter.jpg', { type: 'image/jpeg' }) : null
}

// Called inside the tap. Answers what happened: 'shared', 'saved', 'copied',
// 'left' (the share sheet was closed without sharing) or 'failed'.
export function shareLetter(how, o, url) {
  if (how === 'copy') return copyText(url).then((ok) => (ok ? 'copied' : 'failed'))
  if (how === 'share') {
    const text = o.name ? `a letter for ${o.name}, on the wall` : 'a letter on the wall'
    const ready = READY.get(keyOf(o))
    const shareWith = (blob) => {
      const file = fileOf(blob)
      const data = file && navigator.canShare && navigator.canShare({ files: [file] })
        ? { files: [file], text, url }
        : { text, url }
      return navigator.share(data).then(() => 'shared', (e) => (e && e.name === 'AbortError' ? 'left' : 'failed'))
    }
    // the picture is ready: the sheet is asked for now, in the tap. It is
    // not: nothing goes, rather than the link alone without saying so. The
    // letter asks here only once it is ready (Letter.jsx `pass`)
    if (ready && ready.blob) return shareWith(ready.blob)
    return Promise.resolve('failed')
  }
  if (how === 'save') {
    return prepareLetter(o).then((blob) => {
      if (!blob) return 'failed'
      const a = document.createElement('a')
      const href = URL.createObjectURL(blob)
      a.href = href
      a.download = 'celestual-letter.jpg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 4000)
      return 'saved'
    })
  }
  return Promise.resolve('failed')
}

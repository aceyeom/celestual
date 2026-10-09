// ── the product's screen, drawn ────────────────────────────────────────────
// The letter screen as the product draws it on a canvas (app/src/wall/
// share.js `drawScreen`), at a phone's middle quirks (looks.js `quirks`: the
// light at 78% 64%, the padding 2.9 cqw, the lift 1.6, the top 2.6), for two
// places in the film: the writer's phone, where it is the composer (the
// greeting, the count, the words being written, the caret, `colour` and
// `clear`, and under it the pill), and the wall at the end, where it is the
// letter as it stands (the day, the words, `options` and the heart).
// Its colours, glyphs and lockup are the app's own (round-product.js).

import { SCREENS, GLYPHS, LOCKUP } from './round-product.js'

export const FACE = '"Jersey 10", "Geist Mono", ui-monospace, monospace'
const SIZES = [15.4, 13.8, 12.4, 11.2, 10, 9.2, 8.4, 7.6, 6.8, 6.2, 5.4]
const Q = { pad: 2.9, lift: 1.6, topPad: 2.6, hx: 0.78, hy: 0.64, ar: 1.16 }
export const SCREEN_AR = Q.ar

// a glyph on the phone's grid, `h` tall (share.js `glyph`)
function glyph(g, name, x, y, h, color) {
  const rows = GLYPHS[name]
  if (!rows) return 0
  const s = h / rows.length
  g.fillStyle = color
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') g.fillRect(x + i * s, y + j * s, s + 0.4, s + 0.4) }))
  return rows[0].length * s
}
const glyphW = (name, h) => (GLYPHS[name] ? (GLYPHS[name][0].length * h) / GLYPHS[name].length : 0)
export function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
// words into lines no wider than `w`
function wrap(g, text, w) {
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (line && g.measureText(next).width > w) { out.push(line); line = word } else line = next
    }
    out.push(line)
  }
  return out
}
// a line cut to fit, with an ellipsis
function fit(g, text, w) {
  if (g.measureText(text).width <= w) return text
  let t = text
  while (t && g.measureText(`${t}…`).width > w) t = t.slice(0, -1)
  return `${t}…`
}

// a screen's colours: a lit one's glass and panel; a print as the phone
// paints it where the press does not run, in its inks (screen.css, a print
// where the press does not run); the square as it is
export function skinFor(colour) {
  const s = SCREENS[colour]
  if (s.kind === 'riso') {
    return { kind: 'riso', flat: true, top: s.flat.top, top2: s.flat.top, bot: s.flat.bot, hi: s.flat.body, mid: s.flat.body, lo: s.flat.body, ink: s.flat.ink, lit: s.flat.lit, bloom: 'transparent', soft: 'transparent', rule: s.flat.ink, drum: s.stops[1] }
  }
  return { ...s, flat: s.kind === 'brat' }
}

// The screen, at (x, y), `sw` wide and `sh` tall. `o`:
//   colour, bat            the look and the writer's battery
//   counter | stamp        the count while it is written, the day once it is up
//   greet                  the line across its top
//   text, fresh, caret     the words, how much of their end is still easing in
//                          (characters, and how far in, 0 to 1), the caret lit
//   note                   in place of the words: { glyph, title, text }
//   keys                   'composer' (colour, clear), 'wall' (options, heart) or none
//   heart                  the heart's colour, if not the screen's lit
export function drawScreen(g, x, y, sw, sh, o) {
  const s = skinFor(o.colour)
  const u = sw / 100
  const flat = s.flat
  g.save()
  g.translate(x, y)
  roundRect(g, 0, 0, sw, sh, Math.max(4, 0.013 * sw))
  g.clip()
  // the panel, brightest where this phone's backlight is
  const hx = Q.hx * sw
  const hy = Q.hy * sh
  const pg = g.createRadialGradient(hx, hy, 0, hx, hy, Math.hypot(Math.max(hx, sw - hx), Math.max(hy, sh - hy)))
  pg.addColorStop(0, s.hi)
  pg.addColorStop(0.52, s.mid)
  pg.addColorStop(1, s.lo)
  g.fillStyle = pg
  g.fillRect(0, 0, sw, sh)
  // the greeting: one the row would set much smaller than the words takes a
  // second row at its own size, broken where its two halves are most even,
  // from the whole greeting so it holds still while it is edited
  const ex = flat ? 3.2 * u : 2.2 * u
  const said = o.greet || ''
  const whole = o.greetFull || said
  const pw = glyphW('pen', 8.6 * u) + 1.4 * u
  const room = sw - 2 * ex - pw
  g.font = `400 ${11 * u}px ${FACE}`
  let tail = ''
  if (g.measureText(whole).width > room) {
    let best = Infinity
    for (let i = whole.indexOf(' '); i > 0; i = whole.indexOf(' ', i + 1)) {
      const w = Math.max(g.measureText(whole.slice(0, i)).width, g.measureText(whole.slice(i + 1)).width)
      if (w < best) { best = w; tail = whole.slice(i + 1) }
    }
  }
  const row3 = tail ? 9.6 * u : 0
  // the two bands of glass
  const topH = (Q.topPad + 10.4 * 2 + 0.6 + 1.8 + (flat ? 1 : 0)) * u + row3
  const botH = 14 * u
  const tg = g.createLinearGradient(0, 0, 0, topH)
  tg.addColorStop(0, s.top)
  tg.addColorStop(1, s.top2)
  g.fillStyle = tg
  g.fillRect(0, 0, sw, topH)
  g.fillStyle = s.bot
  g.fillRect(0, sh - botH, sw, botH)
  const lit = s.lit
  const withBloom = (fn) => {
    g.save()
    if (s.bloom && s.bloom !== 'transparent') { g.shadowColor = s.bloom; g.shadowBlur = 2.4 * u }
    fn()
    g.restore()
  }
  // row one: the aerial, the count or the day, the battery
  const r1 = (Q.topPad + (flat ? 1 : 0)) * u
  const rowH = 10.4 * u
  const mid1 = r1 + rowH / 2
  const mid2 = r1 + rowH + 0.6 * u + rowH / 2
  withBloom(() => {
    const aw = glyph(g, 'ant', ex, mid1 - 4.5 * u, 9 * u, lit)
    const bw = 17 * u
    glyph(g, `bata${o.bat}`, sw - ex - bw, mid1 - 4 * u, 8 * u, lit)
    g.fillStyle = lit
    g.textBaseline = 'middle'
    g.font = `400 ${11 * u}px ${FACE}`
    if (o.counter) { g.textAlign = 'right'; g.fillText(o.counter, sw - ex - bw - 2.6 * u, mid1 + 0.4 * u) }
    if (o.stamp) { g.textAlign = 'center'; g.fillText(o.stamp, (ex + aw + sw - ex - bw) / 2, mid1 + 0.4 * u) }
    // row two: the pen and the greeting, set smaller before it is cut
    glyph(g, 'pen', ex, mid2 - 4.3 * u, 8.6 * u, lit)
    const rows = tail && said.endsWith(tail) ? [said.slice(0, said.length - tail.length).trimEnd(), tail] : [said]
    g.font = `400 ${11 * u}px ${FACE}`
    const nw = Math.max(...rows.map((r) => g.measureText(r).width))
    const nsz = nw > room ? Math.max(5.6, (11 * room * 0.97) / nw) : 11
    g.font = `400 ${nsz * u}px ${FACE}`
    g.textAlign = 'left'
    rows.forEach((r, k) => g.fillText(fit(g, r, room), ex + pw, mid2 + 0.4 * u + k * row3))
    if (o.greetCaret) {
      // where the greeting is being edited, or its end
      const cut = Math.min(o.greetCut ?? said.length, rows[0].length)
      const gx = ex + pw + g.measureText(rows[0].slice(0, cut)).width + 0.6 * u
      g.fillRect(gx, mid2 - 0.36 * nsz * u, 0.214 * nsz * u, 0.86 * nsz * u)
    }
  })
  // the words, as large as the screen will hold them, or the note
  const bx = (Q.pad + (flat ? 1.4 : 0)) * u
  const by = topH + Q.lift * u
  const bwid = sw - bx - (flat ? 5 : 3.6) * u
  const bh = sh - botH - by - u
  if (o.note) {
    const nx = bx
    const ny = by + 3 * u
    withBloom(() => {
      g.fillStyle = s.ink
      glyph(g, o.note.glyph, nx, ny, 9 * u, s.ink)
      g.font = `400 ${12.4 * u}px ${FACE}`
      g.textBaseline = 'top'
      g.textAlign = 'left'
      g.fillText(o.note.title, nx + 10 * u, ny - 1.6 * u)
      g.font = `400 ${8.4 * u}px ${FACE}`
      wrap(g, o.note.text, bwid - 2 * u).forEach((l, i) => g.fillText(l, nx, ny + 14 * u + i * 8.6 * u))
    })
  } else {
    const text = o.text || ''
    // the size: the largest step the words fit at, from the whole letter
    // (`o.full`), so the size does not jump as it is written
    let size = SIZES[0]
    for (const st of SIZES) {
      size = st
      g.font = `400 ${st * u}px ${FACE}`
      if (wrap(g, o.full || text || ' ', bwid).length * st * u * 1.02 <= bh) break
    }
    const S = size * u
    const lh = S * 1.02
    g.font = `400 ${S}px ${FACE}`
    g.textBaseline = 'alphabetic'
    g.textAlign = 'left'
    const lines = text ? wrap(g, text, bwid) : []
    const base = 0.8 * S
    const fresh = o.fresh || [0, 1]
    let left = text.length - fresh[0]
    const put = (str, px, py) => {
      if (s.kind === 'riso') { g.fillStyle = s.drum; g.fillText(str, px + 0.28 * u, py + 0.2 * u) }
      g.fillStyle = s.ink
      g.fillText(str, px, py)
    }
    g.save()
    g.shadowColor = s.soft && s.soft !== 'transparent' ? s.soft : 'transparent'
    g.shadowBlur = 0.5 * u
    let endX = bx
    let endY = by + base
    lines.forEach((line, i) => {
      const py = by + i * lh + base
      // the newest characters ease in, as a panel's pixels do
      const old = Math.max(0, Math.min(line.length, left))
      if (old > 0) put(line.slice(0, old), bx, py)
      if (old < line.length) {
        g.globalAlpha = fresh[1]
        put(line.slice(old), bx + g.measureText(line.slice(0, old)).width, py)
        g.globalAlpha = 1
      }
      left -= line.length + 1
      endX = bx + g.measureText(line).width
      endY = py
    })
    g.restore()
    // the caret: a bar on the face's grid, two strokes wide, from the top of
    // the capitals to a stroke under the line (caret.jsx)
    if (o.caret) {
      g.fillStyle = s.ink
      const cx = text && !text.endsWith(' ') ? endX + 0.12 * S : endX
      g.fillRect(cx, endY - 0.66 * S, 0.214 * S, 0.8 * S)
    }
  }
  // the soft keys
  if (o.keys) {
    withBloom(() => {
      const my = sh - botH / 2 - 0.3 * u
      const kx = flat ? 3.2 * u : 2.4 * u
      g.fillStyle = lit
      g.textBaseline = 'middle'
      g.font = `400 ${13.4 * u}px ${FACE}`
      g.textAlign = 'left'
      g.fillText(o.keys === 'wall' ? 'options' : 'colour', kx, my)
      if (o.keys === 'wall') glyph(g, 'heartO', sw - kx - 8 * u, my - 3.4 * u, 6.8 * u, o.heart || lit)
      else { g.textAlign = 'right'; g.fillText('clear', sw - kx, my) }
    })
  }
  // the glass: a faint glare across it, and a print's rule
  if (s.kind === 'lit') {
    const gl = g.createLinearGradient(0, sh, sw, 0)
    gl.addColorStop(0, 'rgba(0,0,0,0.08)')
    gl.addColorStop(0.4, 'rgba(0,0,0,0)')
    gl.addColorStop(1, 'rgba(255,255,255,0.06)')
    g.fillStyle = gl
    g.fillRect(0, 0, sw, sh)
  }
  if (s.kind === 'riso') {
    g.strokeStyle = s.rule
    g.lineWidth = 2.8 * u
    g.strokeRect(0, 0, sw, sh)
  }
  g.restore()
}

// ── the writer's phone ─────────────────────────────────────────────────────
// What its display shows, top to bottom: the composer's card (the screen),
// the pill, and the keyboard while the words are being written. `p` is
// round-time.js `phoneAt`; `f` the film's frame. Drawn at `W` by `H`.
const KEYROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
export function drawPhone(g, W, H, p, f) {
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, W, H)
  roundRect(g, 0, 0, W, H, 0.07 * W)
  g.clip()
  g.fillStyle = '#08070B'
  g.fillRect(0, 0, W, H)
  const up = p.mode === 'up' || p.mode === 'read'
  // the card
  const cw = 0.92 * W
  const ch = cw * SCREEN_AR
  const cx = (W - cw) / 2
  const cy = 0.07 * H
  // the composer's count and the caret; the day once it has gone
  const age = f - p.since
  // the caret: lit at once while somebody types, then the phone's beat
  // (1060 ms in two steps, 32 frames at 30)
  const beat = ((f - Math.max(p.since, p.greetSince)) % 32 + 32) % 32
  const caretOn = p.caret && beat < 16
  drawScreen(g, cx, cy, cw, ch, {
    colour: p.colour, bat: p.bat,
    counter: up ? '' : p.count, stamp: up ? p.stamp : '',
    greet: p.greet, greetFull: p.greetFull, greetCut: p.greetCut, greetCaret: p.editing && caretOn,
    text: p.mode === 'read' ? '' : p.text, full: p.full,
    fresh: [p.freshChars || 0, Math.min(1, (age + 1) / 3)],
    caret: !p.editing && caretOn,
    note: p.mode === 'read' ? { glyph: 'wait', title: 'being read', text: 'it goes up once it passes.' } : null,
    keys: p.mode === 'draft' || p.mode === 'waking' ? 'composer' : p.mode === 'up' ? 'wall' : null,
    heart: p.heart,
  })
  // the pill under it, until the letter has gone
  const pw = 0.62 * W
  const ph = 0.072 * H
  const py = cy + ch + 0.05 * H
  if (!up || p.pressed) {
    g.fillStyle = p.pressed ? '#BDB9B0' : '#F4F1EA'
    roundRect(g, (W - pw) / 2, py, pw, ph, ph / 2)
    g.fill()
    g.fillStyle = '#08070B'
    g.font = `400 ${0.42 * ph}px ${FACE}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('send anonymously', W / 2, py + ph / 2 + 0.02 * ph)
  }
  // the keyboard while the words are written, gone with the letter
  const kbTop = py + ph + 0.045 * H
  const kbH = H - kbTop
  const drop = up ? 1 : 0
  if (!drop) {
    g.fillStyle = '#141318'
    g.fillRect(0, kbTop, W, kbH)
    const kw = W / 10.6
    const kh = kbH / 4.9
    const pressed = p.keyAt != null && f - p.keyAt < 3 ? p.keyHit : -1
    g.font = `400 ${0.44 * kh}px system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let n = 0
    KEYROWS.forEach((row, j) => {
      const x0 = (W - row.length * kw) / 2
      for (let i = 0; i < row.length; i++, n++) {
        const kx = x0 + i * kw + 0.08 * kw
        const ky = kbTop + 0.25 * kh + j * kh * 1.12
        g.fillStyle = n === pressed ? '#55535C' : '#2B2A31'
        roundRect(g, kx, ky, kw * 0.84, kh * 0.92, 0.12 * kw)
        g.fill()
        g.fillStyle = '#D9D6CF'
        g.fillText(row[i], kx + kw * 0.42, ky + kh * 0.48)
      }
    })
    const sy = kbTop + 0.25 * kh + 3 * kh * 1.12
    g.fillStyle = pressed === 99 ? '#55535C' : '#2B2A31'
    roundRect(g, W * 0.25, sy, W * 0.5, kh * 0.92, 0.12 * kw)
    g.fill()
  }
  g.restore()
}

// ── the wall's letter, for the cascade ─────────────────────────────────────
// A module of the end card: the room's black, and the letter's screen in the
// middle of it at the screen's own proportion.
export function drawLetterCard(g, x, y, w, h, L) {
  g.fillStyle = '#0A0A0A'
  g.fillRect(x, y, w, h)
  const sh = h - 12
  const sw = sh / SCREEN_AR
  drawScreen(g, x + (w - sw) / 2, y + 6, sw, sh, {
    colour: L.colour, bat: L.bat, stamp: L.stamp, greet: L.greet, text: L.text, full: L.text, keys: 'wall',
  })
}

// the lockup at whole pixels a cell, in chalk (brand.js `LOCKUP`)
export const LOCKUP_SIZE = [LOCKUP.w, LOCKUP.h]
export function drawLockup(g, x, y, scale, color = '#F4F1EA') {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  g.fillStyle = color
  g.fill(new Path2D(LOCKUP.d))
  g.restore()
}

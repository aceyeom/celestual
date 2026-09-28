// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KEEPSAKE, AS A PICTURE                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The mutual's `share` (Keepsake.jsx): the keepsake drawn once more, with a
// canvas, as a picture two people can keep and pass round. The owner asked
// for their names shown with the letters, and for it to be something worth
// keeping and sharing, so it is the keepsake itself: the rose phone held
// square in the black room, the night it was told on its status row, their
// two first names on the second, their note and yours on its glass either
// side of the mark and `it's mutual.`, and the product's signature in the
// dark under it. It was going to carry the mark and the names and never the
// notes; the notes are what the two of them wrote, and what they would keep.
// A person can leave them off from the same menu (`notes: null`), and then
// the picture is the phone with the mark alone, larger.
//
// Never a handle and never a link: the picture is passed round among
// people, and the reveal's own address says `nothing here.` to anybody but
// the two of them. First names only, and none at all unless both are known,
// so a picture never names one of them and not the other; then the band has
// the one status row, and the notes are `from them` and `from me`.
//
// 1080 by 1920, the size a story takes, with everything that matters inside
// the middle 1080 by 1350 (y 285 to 1635), which is the size a feed crops a
// post to: the phone and the signature under it are centred in that band,
// and nothing is ever outside it, however the notes were written
// (keeplayout.js, which lays it out, and says how).
//
// Drawn the way share.js draws a letter, with its own hand (`glyph`,
// `backlight`, `signature`, `grainOver`, and wrap.js): paths and text and one
// canvas of cells, never an image the canvas could be tainted by, and made
// on the phone that asks for it. The mark is the keepsake's still frame
// (pixmark.js `keepStory`), painted by PixelStory.jsx `paintStill`.

import { skinOf, quirks, rgbTileReady } from './looks.js'
import { glyph, roundRect, backlight, signature, grainOver, imageOf, rgba, SERIF, WORD } from './share.js'
import { fit } from './wrap.js'
import { W, H, PX, PW, SU, GUTTER, SIGN_GAP, SIGN_H, PAD, CAP_GAP, LINE, capOf, faceOf, layoutOf, topOf } from './keeplayout.js'
import { paintStill } from './PixelStory.jsx'
import { I_COLS, I_ROWS, NOTE } from './pixmark.js'
import { langOf, ensureCjk } from './type.js'

const ROSE = skinOf('rose')

// The sealed note, as the stories draw it, `h` tall with its top left at
// (x, y)
function sealed(g, x, y, h, color) {
  const s = h / NOTE.length
  g.fillStyle = color
  NOTE.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') g.fillRect(x + i * s, y + j * s, s + 0.4, s + 0.4) }))
  return NOTE[0].length * s
}

// ── the phone ──
function drawPhone(o, L, tile) {
  const q = quirks(o.seed)
  const ph = L.ph
  const cv = document.createElement('canvas')
  cv.width = PW
  cv.height = ph
  const g = cv.getContext('2d')
  const edge = () => { roundRect(g, 0, 0, PW, ph, Math.max(6, 1.2 * SU)); g.clip() }
  g.save()
  edge()
  // where the mark's panel is, whose middle the backlight is brightest at
  const markY = L.top + (L.notes ? L.notes[0].h + GUTTER : 0)
  const my = markY + L.mark / 2
  // the panel: the rose, round that hot spot, an ellipse 120% by 95% of
  // the phone (screen.css `.wl-scr-bg`)
  g.save()
  g.translate(PW / 2, my)
  g.scale(1, (0.95 * ph) / (1.2 * PW))
  const pg = g.createRadialGradient(0, 0, 0, 0, 0, 1.2 * PW)
  pg.addColorStop(0, ROSE.hi)
  pg.addColorStop(0.52, ROSE.mid)
  pg.addColorStop(1, ROSE.lo)
  g.fillStyle = pg
  g.fillRect(-PW, -4 * ph, 2 * PW, 8 * ph)
  g.restore()
  // the bands, and the two dark lines of glass between the notes and the mark
  const tg = g.createLinearGradient(0, 0, 0, L.top)
  tg.addColorStop(0, ROSE.top)
  tg.addColorStop(1, ROSE.top2)
  g.fillStyle = tg
  g.fillRect(0, 0, PW, L.top)
  g.fillStyle = ROSE.bot
  g.fillRect(0, ph - L.foot, PW, L.foot)
  if (L.notes) {
    g.fillRect(0, markY - GUTTER, PW, GUTTER)
    g.fillRect(0, markY + L.mark, PW, GUTTER)
  }

  // the status rows, lit, with their bloom
  const bloom = (fn) => { g.save(); g.shadowColor = ROSE.bloom; g.shadowBlur = 2.4 * SU; fn(); g.restore() }
  const ex = 2.2 * SU
  const r1 = 2.6 * SU + (10.4 * SU) / 2
  const r2 = 2.6 * SU + 10.4 * SU + 0.6 * SU + (10.4 * SU) / 2
  bloom(() => {
    const aw = glyph(g, 'ant', ex, r1 - 4.5 * SU, 9 * SU, ROSE.lit)
    const bw = 17 * SU
    glyph(g, 'bata4', PW - ex - bw, r1 - 4 * SU, 8 * SU, ROSE.lit)
    g.fillStyle = ROSE.lit
    g.textBaseline = 'middle'
    g.textAlign = 'center'
    if (o.stamp) {
      g.font = `400 ${11 * SU}px ${faceOf(o.stamp)}`
      g.fillText(o.stamp, (ex + aw + PW - ex - bw) / 2, r1 + 0.4 * SU)
    }
    // the two of them, theirs first, each cut before it takes more than its
    // share of the row; nobody when either first name is not known, and then
    // no row for them (keeplayout.js `TOP_ALONE`)
    if (o.names) {
      const [a, b] = o.names
      const size = 11 * SU
      g.font = `400 ${size}px ${faceOf(`${a}${b}`)}`
      const room = PW * 0.45
      const A = fit(g, a, room)
      const B = fit(g, b, room)
      const dot = ' · '
      const wa = g.measureText(A).width
      const wd = g.measureText(dot).width
      const wb = g.measureText(B).width
      let x = PW / 2 - (wa + wd + wb) / 2
      g.textAlign = 'left'
      g.fillText(A, x, r2 + 0.4 * SU)
      x += wa
      g.globalAlpha = 0.72
      g.fillText(dot, x, r2 + 0.4 * SU)
      g.globalAlpha = 1
      g.fillText(B, x + wd, r2 + 0.4 * SU)
    }
  })

  // the notes, as the keepsake sets them: whose, and then the words
  const ink = ROSE.ink
  const drawNote = (text, who, n, y) => {
    g.save()
    g.textAlign = 'left'
    g.textBaseline = 'top'
    g.shadowColor = ROSE.soft
    g.shadowBlur = 0.35 * SU * 2
    g.fillStyle = ink
    g.globalAlpha = 0.72
    g.font = `400 ${capOf(L.f)}px ${faceOf(who)}`
    g.fillText(`from ${who}`, PAD, y + PAD)
    g.globalAlpha = 1
    const wy = y + PAD + capOf(L.f) + CAP_GAP
    if (n.lines) {
      g.font = `400 ${L.f}px ${faceOf(text)}`
      n.lines.forEach((line, i) => g.fillText(line, PAD, wy + i * L.f * LINE))
    } else {
      const gh = 7 * SU
      const gw = (NOTE[0].length * gh) / NOTE.length
      sealed(g, PW / 2 - gw / 2, wy, gh, ink)
      g.textAlign = 'center'
      g.font = `400 ${6.2 * SU}px ${faceOf('x')}`
      g.fillText('sent without a note.', PW / 2, wy + gh + 2 * SU)
    }
    g.restore()
  }
  // Whose each is: the two first names, or with nobody named, `them` and
  // `me`, since the picture is only ever drawn by the one whose note is the
  // lower. Until the review of 28 September a picture that named nobody
  // said nothing over either note, and which was whose was lost
  if (L.notes) {
    const [a, b] = o.names || ['them', 'me']
    drawNote(o.notes[0], a, L.notes[0], L.top)
    drawNote(o.notes[1], b, L.notes[1], markY + L.mark + GUTTER)
  }

  // the mark, alive and still: the keepsake's frame on a canvas of cells
  let cell = 0
  let gx = 0
  let gy = 0
  if (o.frame) {
    const mc = document.createElement('canvas')
    mc.width = PW
    mc.height = L.mark
    const lay = paintStill(mc, o.frame, { cols: I_COLS, rows: I_ROWS, ink })
    g.drawImage(mc, 0, markY)
    if (lay) {
      cell = lay.cell
      gx = lay.mx
      gy = markY + lay.my
    }
  }

  // the LCD over all of it, as a letter's picture has it (share.js
  // `drawScreen`): the backlight's clouds, the grid laid in the gaps between
  // the mark's own cells, the pixels up close, and the glare
  backlight(g, q.light, PW, ph)
  if (cell) {
    const d = cell - Math.max(1, Math.round(cell * 0.14))
    g.fillStyle = 'rgba(0, 0, 0, 0.14)'
    for (let y = gy + d - cell * Math.ceil(gy / cell); y < ph; y += cell) g.fillRect(0, y, PW, 1)
    g.fillStyle = 'rgba(0, 0, 0, 0.11)'
    for (let x = gx + d - cell * Math.ceil(gx / cell); x < PW; x += cell) g.fillRect(x, 0, 1, ph)
  }
  if (tile && cell) {
    const pat = g.createPattern(tile, 'repeat')
    if (pat) {
      pat.setTransform(new DOMMatrix().translate(gx, gy).scale(cell / 3))
      g.save()
      g.globalCompositeOperation = 'overlay'
      g.globalAlpha = 0.6
      g.imageSmoothingEnabled = false
      g.fillStyle = pat
      g.fillRect(0, 0, PW, ph)
      g.restore()
    }
  }
  const a = (q.glare * Math.PI) / 180
  const gl = g.createLinearGradient(PW / 2 - Math.sin(a) * PW / 2, ph / 2 + Math.cos(a) * ph / 2, PW / 2 + Math.sin(a) * PW / 2, ph / 2 - Math.cos(a) * ph / 2)
  gl.addColorStop(0, 'rgba(0,0,0,0.08)')
  gl.addColorStop(0.4, 'rgba(0,0,0,0)')
  gl.addColorStop(1, `rgba(255,255,255,${q.glareA})`)
  g.fillStyle = gl
  g.fillRect(0, 0, PW, ph)
  g.restore()
  return { cv, my, q }
}

// ── the room ────────────────────────────────────────────────────────────────
export async function renderMutual(o) {
  const words = `${o.stamp || ''}${(o.names || []).join('')}${(o.notes || []).join('')}sent without a note.`
  if (document.fonts && document.fonts.load) {
    if (langOf(words)) await ensureCjk()
    try { await document.fonts.load(`400 92px ${faceOf(words)}`, words) } catch { /* the fallback, then */ }
    try { await document.fonts.load(`500 ${WORD}px ${SERIF}`, 'celestual.') } catch { /* the fallback, then */ }
  }
  const tile = await imageOf(await rgbTileReady(o.seed))
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const L = layoutOf(g, o)
  // the phone and the signature under it, one block in the middle of the
  // feed's crop (keeplayout.js)
  const top = topOf(L)
  const { cv: phone, my, q } = drawPhone(o, L, tile)
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  // the light it throws on the dark, round its mark
  const cx = W / 2
  const cy = top + my
  const hg = g.createRadialGradient(cx, cy, 168, cx, cy, 798)
  hg.addColorStop(0, rgba(ROSE.glow, 0.34))
  hg.addColorStop(0.55, rgba(ROSE.glow, 0.11))
  hg.addColorStop(1, rgba(ROSE.glow, 0))
  g.fillStyle = hg
  g.fillRect(0, 0, W, H)
  // the phone, square to the camera, its edge lit
  g.save()
  g.shadowColor = rgba(ROSE.glow, 0.5)
  g.shadowBlur = 30
  g.drawImage(phone, PX, top)
  g.restore()
  signature(g, cx, top + L.ph + SIGN_GAP + SIGN_H / 2)
  grainOver(g, W, H, q.grainSeed)
  return new Promise((done) => cv.toBlob((b) => done(b), 'image/jpeg', 0.92))
}

// ── drawn ahead, and passed on ──────────────────────────────────────────────
// As the letter's is (share.js `prepareLetter`): the share menu asks for it
// as it opens, so the share sheet can be asked for inside the tap on `to
// someone`; the last few are kept, and one that failed is dropped.
const READY = new Map()
const keyOf = (o) => `${o.seed}|${o.stamp}|${(o.names || []).join('·')}|${o.notes ? o.notes.join('\u0001') : '-'}`
const painted = () => new Promise((done) => {
  if (typeof requestAnimationFrame !== 'function') { done(); return }
  requestAnimationFrame(() => setTimeout(done, 0))
})
export function prepareMutual(o) {
  const k = keyOf(o)
  if (!READY.has(k)) {
    const job = { blob: null, promise: null }
    const drop = () => { if (READY.get(k) === job) READY.delete(k) }
    job.promise = painted().then(() => renderMutual(o))
      .then((b) => { job.blob = b; if (!b) drop(); return b })
      .catch(() => { drop(); return null })
    READY.set(k, job)
    while (READY.size > 4) READY.delete(READY.keys().next().value)
  }
  return READY.get(k).promise
}
export const isMutualReady = (o) => !!(READY.get(keyOf(o)) || {}).blob

// Whether this browser hands a picture to the phone's own share sheet
export function canShareFiles() {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof File !== 'undefined'
      && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] })
  } catch {
    return false
  }
}

const NAME = 'celestual-mutual.jpg'
// Called inside the tap. Answers 'shared', 'saved', 'left' (the sheet was
// closed without sharing) or 'failed'.
export function shareMutual(how, o) {
  if (how === 'share') {
    const ready = READY.get(keyOf(o))
    if (!ready || !ready.blob || typeof File === 'undefined') return Promise.resolve('failed')
    const file = new File([ready.blob], NAME, { type: 'image/jpeg' })
    return navigator.share({ files: [file], text: 'it’s mutual.' })
      .then(() => 'shared', (e) => (e && e.name === 'AbortError' ? 'left' : 'failed'))
  }
  if (how === 'save') {
    return prepareMutual(o).then((blob) => {
      if (!blob) return 'failed'
      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = NAME
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      return 'saved'
    })
  }
  return Promise.resolve('failed')
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE KEEPSAKE, AS A PICTURE                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The mutual's `share` (Keepsake.jsx): the keepsake drawn once more, with a
// canvas, as a picture two people can keep and pass round. The owner asked
// for their names shown with the letters, and for it to be something worth
// keeping and sharing, so it is the keepsake itself, as it stands on the
// page: the rose phone held square in the black room, the aerial and the
// night it was told on its band, the mark crowning the glass with `it's
// mutual.` in its cells, their two first names under it, `Jules & Ace`, and
// under them their note and yours, each a small screen of its own with its
// strip across the top, the line its writer set there and the battery they
// left it on, then the words and whose they are; and the product's
// signature in the dark under the phone. One glass with nothing cutting it,
// its unlit dots run on under everything on the story's own cells, and each
// note's panel laid on the lines between them, as the page lays them. It
// was going to carry the mark and the names and never the notes; the notes
// are what the two of them wrote, and what they would keep. A person can
// leave them off from the same menu (`notes: null`), and then the picture
// is the phone with the mark and the names alone, the mark larger, and no
// line and no battery either.
//
// Never a handle and never a link: the picture is passed round among
// people, and the reveal's own address says `nothing here.` to anybody but
// the two of them. First names only, and none at all unless both are known,
// so a picture never names one of them and not the other; then there is no
// line of names under the mark, the notes are `from them` and `from me`,
// and a line a writer left as it came is `dear you` (Keepsake.jsx `face`,
// which hands this nothing it should not print).
//
// 1080 by 1920, the size a story takes, with everything that matters inside
// the middle 1080 by 1350 (y 285 to 1635), which is the size a feed crops a
// post to: the phone and the signature under it are centred in that band,
// and nothing is ever outside it, however the notes and their lines were
// written (keeplayout.js, which lays it out, and says how).
//
// Drawn the way share.js draws a letter, with its own hand (`glyph`,
// `backlight`, `signature`, `grainOver`, and wrap.js): paths and text and one
// canvas of cells, never an image the canvas could be tainted by, and made
// on the phone that asks for it. The mark is the keepsake's still frame
// (pixmark.js `keepStory`), painted by PixelStory.jsx `paintStill`.

import { skinOf, quirks, rgbTileReady } from './looks.js'
import { glyph, roundRect, backlight, signature, grainOver, imageOf, rgba } from './share.js'
import {
  W, H, PX, PW, SU, BAND, SIDE, NOTE_W, INSET, HEAD, HEAD_END, BAT_H, BAT_W, WORDS_TOP, FROM_LOW,
  SEAL_H, SEAL_GAP, SEAL_SAY, NAME_UP, NAME_GAP, SIGN_GAP, SIGN_H, LINE, capOf, faceOf, layoutOf, topOf, storyFoot,
} from './keeplayout.js'
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

// ── its texture ──
// The phone's quirks (its backlight's clouds, its bleed, its glare, its
// grain) and its tile, seeded from what the picture prints and nothing
// else: the night and the two first names, in one order, so the two phones
// draw the same one. It was the keepsake's seed, which is the two handles
// (Film.jsx `pairSeed`), and the bundle is public: anybody with a picture
// of Jules and Ace could draw it for every Jules and Ace they could think of
// and find the two accounts it was (the review of 28 September). The phone
// on the page keeps the pair's seed; it is never passed round.
const lookOf = (o) => `mutual:${o.stamp || ''}:${[...(o.names || [])].sort().join('·')}`

// ── the phone ──
function drawPhone(o, L, tile) {
  const q = quirks(lookOf(o))
  const ph = L.ph
  const cv = document.createElement('canvas')
  cv.width = PW
  cv.height = ph
  const g = cv.getContext('2d')
  const edge = () => { roundRect(g, 0, 0, PW, ph, Math.max(6, 1.2 * SU)); g.clip() }
  g.save()
  edge()
  // the mark's panel, at the head of the glass, whose middle the backlight
  // is brightest at
  const markY = BAND
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
  // the band and the foot
  const tg = g.createLinearGradient(0, 0, 0, BAND)
  tg.addColorStop(0, ROSE.top)
  tg.addColorStop(1, ROSE.top2)
  g.fillStyle = tg
  g.fillRect(0, 0, PW, BAND)
  g.fillStyle = ROSE.bot
  g.fillRect(0, ph - L.foot, PW, L.foot)

  // the mark, alive and still: the keepsake's frame on a canvas of cells,
  // which draws no unlit dots of its own; its grid is the glass's
  const ink = ROSE.ink
  let cell = 0
  let gap = 0
  let gx = 0
  let gy = markY
  let mark = null
  if (o.frame) {
    mark = document.createElement('canvas')
    mark.width = PW
    mark.height = L.mark
    const lay = paintStill(mark, o.frame, { cols: I_COLS, rows: I_ROWS, ink, dots: false })
    if (lay) {
      cell = lay.cell
      gap = lay.gap
      gx = lay.mx
      gy = markY + lay.my
    }
  }
  const d = cell - gap
  // the unlit dots over the whole of the glass, band to foot, on the
  // mark's own cells, a tile of one cell (PixelStory.jsx `ghostGrid`,
  // mutual.css `.wl-keep-body`)
  if (cell) {
    const t = document.createElement('canvas')
    t.width = cell
    t.height = cell
    const tg2 = t.getContext('2d')
    tg2.fillStyle = rgba(ink, 0.07)
    tg2.fillRect(0, 0, d, d)
    const pat = g.createPattern(t, 'repeat')
    if (pat) {
      pat.setTransform(new DOMMatrix().translate(gx, gy))
      g.fillStyle = pat
      g.fillRect(0, BAND, PW, ph - BAND - L.foot)
    }
  }
  if (mark) g.drawImage(mark, 0, markY)

  // The grid's lines, a pixel wide, in the gap after each cell's light,
  // across and down (drawn over everything below); a thing laid on the
  // grid has its edges on them, the line its own first or last pixel
  const lineX = (v) => (cell ? gx + d + Math.round((v - gx - d) / cell) * cell : Math.round(v))
  const lineY = (v) => (cell ? gy + d + Math.round((v - gy - d) / cell) * cell : Math.round(v))

  // the status row, lit, with its bloom: the aerial, and the night in the
  // middle of the row; no battery, since each note carries its own
  const bloom = (fn) => { g.save(); g.shadowColor = ROSE.bloom; g.shadowBlur = 2.4 * SU; fn(); g.restore() }
  const ex = 2.2 * SU
  const r1 = 2.6 * SU + (10.4 * SU) / 2
  bloom(() => {
    glyph(g, 'ant', ex, r1 - 4.5 * SU, 9 * SU, ROSE.lit)
    g.fillStyle = ROSE.lit
    g.textBaseline = 'middle'
    g.textAlign = 'center'
    if (o.stamp) {
      g.font = `400 ${11 * SU}px ${faceOf(o.stamp)}`
      g.fillText(o.stamp, PW / 2, r1 + 0.4 * SU)
    }
  })

  // what is on the glass, in its ink, with the soft edge a lit word has
  const inked = (fn) => {
    g.save()
    g.shadowColor = ROSE.soft
    g.shadowBlur = 0.35 * SU * 2
    g.fillStyle = ink
    fn()
    g.restore()
  }

  // the two of them, under `it's mutual.`, stood up into the foot of the
  // story's last row, the ampersand between them quieter
  if (L.names) {
    const top = markY + storyFoot(L.mark) - NAME_UP
    const { size, parts: [a, b] } = L.names
    inked(() => {
      g.font = `400 ${size}px ${faceOf(`${a}${b}`)}`
      g.textBaseline = 'middle'
      g.textAlign = 'left'
      const wa = g.measureText(a).width
      const wm = g.measureText('&').width
      const wb = g.measureText(b).width
      let x = PW / 2 - (wa + wm + wb + 2 * NAME_GAP) / 2
      const y = top + size / 2
      g.fillText(a, x, y)
      x += wa + NAME_GAP
      g.globalAlpha = 0.56
      g.fillText('&', x, y)
      g.globalAlpha = 1
      g.fillText(b, x + wm + NAME_GAP, y)
    })
  }

  // The notes, as the keepsake sets them: a small screen each, its panel a
  // little brighter than the glass with a hairline of the ink, its strip of
  // darker rose with the writer's line and their battery, laid on the grid;
  // then the words, and whose they are under them
  const drawNote = (text, who, title, bat, n, y) => {
    const x0 = SIDE
    const x1 = SIDE + NOTE_W
    const y1 = y + n.h
    const l = lineX(x0)
    const r = lineX(x1) + 1
    const t = lineY(y)
    const b = lineY(y1) + 1
    const s = Math.max(t + HEAD / 2, lineY(y + HEAD) + 1)
    const rad = Math.max(2, Math.min(0.9 * SU, cell || 0.9 * SU))
    g.save()
    roundRect(g, l, t, r - l, b - t, rad)
    g.clip()
    g.fillStyle = rgba(ROSE.hi, 0.3)
    g.fillRect(l, t, r - l, b - t)
    const sg = g.createLinearGradient(0, t, 0, s)
    sg.addColorStop(0, rgba(ROSE.lo, 0.72))
    sg.addColorStop(1, rgba(ROSE.lo, 0.9))
    g.fillStyle = sg
    g.fillRect(l, t, r - l, s - t)
    g.restore()
    g.save()
    roundRect(g, l + 1, t + 1, r - l - 2, b - t - 2, Math.max(1, rad - 1))
    g.lineWidth = 2
    g.strokeStyle = rgba(ROSE.lo, 0.8)
    g.stroke()
    g.restore()
    const mid = (t + s) / 2
    inked(() => {
      if (title && L.title) {
        g.font = `400 ${L.title.size}px ${faceOf(title)}`
        g.textBaseline = 'middle'
        g.textAlign = 'left'
        g.fillText(title, x0 + INSET, mid + 0.04 * L.title.size)
      }
      if (bat !== null && bat !== undefined) glyph(g, `bata${bat}`, x1 - HEAD_END - BAT_W, Math.round(mid - BAT_H / 2), BAT_H, ink)
      g.textBaseline = 'top'
      g.textAlign = 'left'
      const wy = y + HEAD + WORDS_TOP
      if (n.lines) {
        g.font = `400 ${L.f}px ${faceOf(text)}`
        n.lines.forEach((line, i) => g.fillText(line, x0 + INSET, wy + i * L.f * LINE))
      } else {
        const gw = (NOTE[0].length * SEAL_H) / NOTE.length
        sealed(g, PW / 2 - gw / 2, wy, SEAL_H, ink)
        g.textAlign = 'center'
        g.font = `400 ${SEAL_SAY}px ${faceOf('x')}`
        g.fillText('sent without a note.', PW / 2, wy + SEAL_H + SEAL_GAP)
      }
      g.globalAlpha = 0.72
      g.textAlign = 'right'
      g.textBaseline = 'bottom'
      g.font = `400 ${capOf(L.f)}px ${faceOf(who)}`
      g.fillText(`from ${who}`, x1 - INSET, y1 - FROM_LOW)
    })
  }
  // Whose each is: the two first names, or with nobody named, `them` and
  // `me`, since the picture is only ever drawn by the one whose note is the
  // lower. Until the review of 28 September a picture that named nobody
  // said nothing over either note, and which was whose was lost
  if (L.notes) {
    const [a, b] = o.names || ['them', 'me']
    const lines = (L.title && L.title.lines) || []
    const bats = o.bats || []
    drawNote(o.notes[0], a, lines[0], bats[0], L.notes[0], L.tops[0])
    drawNote(o.notes[1], b, lines[1], bats[1], L.notes[1], L.tops[1])
  }

  // the LCD over all of it, as a letter's picture has it (share.js
  // `drawScreen`): the backlight's clouds, the grid laid in the gaps between
  // the mark's own cells, the pixels up close, and the glare
  backlight(g, q.light, PW, ph)
  if (cell) {
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

// every word the picture sets, for its faces to be loaded before it is:
// the night, the names, the notes, their lines, whose they are, and what
// the picture says in their place
const wordsOf = (o) => [
  o.stamp || '', ...(o.names || []), '&', ...(o.notes || []), ...(o.titles || []),
  'from them me', 'sent without a note.',
].join('')

// ── the room ────────────────────────────────────────────────────────────────
export async function renderMutual(o) {
  const words = wordsOf(o)
  if (document.fonts && document.fonts.load) {
    if (langOf(words)) await ensureCjk()
    try { await document.fonts.load(`400 92px ${faceOf(words)}`, words) } catch { /* the fallback, then */ }
  }
  const tile = await imageOf(await rgbTileReady(lookOf(o)))
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
// someone`; the last few are kept, and one that failed is dropped. Kept by
// everything the picture prints, so a picture of other words, other lines
// or other batteries is never the one handed on.
const READY = new Map()
const SEP = String.fromCharCode(1)
const keyOf = (o) => [
  o.stamp, (o.names || []).join('·'), o.notes ? o.notes.join(SEP) : '-',
  o.titles ? o.titles.join(SEP) : '-', o.bats ? o.bats.join(',') : '-',
].join('|')
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

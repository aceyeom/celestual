// card/share.js — the shareable, and the thing it is careful not to carry.
//
// A screenshot of the fused spread would put another person's private words on
// a Story, and they wrote them to exactly one reader. So the share sheet does
// not photograph the screen: it RENDERS, from data, a card that contains your
// half and the mutual mark and nothing else (the plan, §4 — content & safety).
// There is no argument that gets their words into this file, which is the only
// way to be sure they never end up in the output.
//
// The frame is the product's own: the closed case, and the seal in the middle
// of it, drawn at exactly the ratios the app draws it at. The brand's mark
// underneath — reserved for mutuality and used once.
import { TOKENS, rgba } from '../theme.js'
import {
  tintOf, stamp, plateOf, faceOf, fitRatio, metaSize,
  clampPos, autoPos, alignAt, measureAt, metaPos,
} from './model.js'

const W = 1080
const H = 1920

// ── the night ────────────────────────────────────────────────────────────────
function night(ctx) {
  ctx.fillStyle = TOKENS.ink
  ctx.fillRect(0, 0, W, H)
  // one warm rise off the top-left shoulder — the way a book on a desk is lit.
  // There is no second light, because there is no second hue.
  const a = ctx.createRadialGradient(W * 0.24, 0, 0, W * 0.24, 0, W * 1.2)
  a.addColorStop(0, rgba(TOKENS.you, 0.075))
  a.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = a
  ctx.fillRect(0, 0, W, H)

  // a scatter of real starlight, so the case is not a flat panel
  let s = 0x9e3779b9
  const rnd = () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 0.6 + rnd() * 1.5
    ctx.globalAlpha = 0.08 + rnd() * 0.4
    ctx.fillStyle = rnd() > 0.82 ? TOKENS.you : TOKENS.cream
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // the blind-tooled border the whole product hangs inside, at this canvas's
  // scale: a heavy fillet and a light one, and nothing else
  ctx.strokeStyle = rgba(TOKENS.cream, 0.075)
  ctx.lineWidth = 2
  ctx.strokeRect(46, 46, W - 92, H - 92)
  ctx.strokeStyle = rgba(TOKENS.cream, 0.04)
  ctx.lineWidth = 2
  ctx.strokeRect(72, 72, W - 144, H - 144)
}

// ── the seal ─────────────────────────────────────────────────────────────────
// The same object the app draws, in canvas: the material, one even scrim over a
// photograph, the shared grain, and the double keyline struck inside the trim.
//
// What it does NOT draw is a corona. Three stacked radial glows used to end this
// disc, and nothing in this brand emits: the seal is a physical object lying on
// a leather case, so what ends it is the shadow it throws and one hairline of
// its own light round the trim.
function body(ctx, card, img, cx, cy, r, hue) {
  // the shadow the seal throws on the case, offset DOWN — light comes from
  // above-left in here, so a shadow that is even all round is not a shadow
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.filter = `blur(${Math.round(r * 0.14)}px)`
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.075, r * 0.99, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  // the ground: one material, or a photograph under the scrim that holds every
  // card in the product at one contrast
  const g = plateOf(card && card.bg)
  ctx.fillStyle = g.hex
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = rgba(TOKENS.ink, 0.4)
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }

  // Grain, and it has to be GRAIN. Drawn at three to nine pixels across on a
  // 1080-wide canvas it was bokeh: a field of soft grey discs sitting on the
  // photograph. Film grain is one or two pixels and there is a great deal of
  // it, so the count goes up an order of magnitude as the radius comes down.
  let s = 0x1f83d9ab
  const rnd = () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))
  ctx.globalAlpha = img ? 0.05 : 0.08
  for (let i = 0; i < 16000; i++) {
    const a = rnd() * Math.PI * 2
    const dd = Math.sqrt(rnd()) * r
    const cr = 0.7 + rnd() * 1.5
    ctx.fillStyle = rnd() > 0.5 ? '#FFFFFF' : '#000000'
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, cr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.restore()

  // the trim: one hairline of the light this card's star burns with, measured
  // off its own ground and never picked
  ctx.strokeStyle = rgba(hue, 0.34)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2)
  ctx.stroke()

  // and the double keyline struck inside it — the thing that separates a seal
  // from a circular crop of a picture
  const onDark = !!img || g.id === 'hide'
  ctx.strokeStyle = onDark ? rgba(TOKENS.cream, 0.26) : rgba(TOKENS.onPaper, 0.24)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.962, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = onDark ? rgba(TOKENS.cream, 0.11) : rgba(TOKENS.onPaper, 0.1)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.912, 0, Math.PI * 2)
  ctx.stroke()
}

// Tracked mono, the way canvas cannot do on its own.
function tracked(ctx, text, x0, y, size, track, color, align = 'center', upper = true) {
  const s = upper ? String(text || '').toUpperCase() : String(text || '')
  if (!s) return
  const prevAlign = ctx.textAlign
  ctx.font = `400 ${size}px 'Courier Prime', 'Courier New', ui-monospace, monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  let w = 0
  for (const ch of s) w += ctx.measureText(ch).width + track
  w -= track
  let x = align === 'left' ? x0 : align === 'right' ? x0 - w : x0 - w / 2
  for (const ch of s) {
    ctx.fillText(ch, x, y)
    x += ctx.measureText(ch).width + track
  }
  ctx.textAlign = prevAlign
}

// The mark — reserved for mutuality, and used once. It is the same drawing the
// interface signs its name with (ui.jsx's Sigil): one four-point star, and the
// same star turned half a turn about the body, with the cut between them
// showing the ground through. The body is the only warm thing in it.
function glyph(ctx, x, y, r) {
  const wing = (cx, cy, up, down, side, k) => {
    const px = side * k
    const u = up * k
    const d = down * k
    ctx.beginPath()
    ctx.moveTo(cx, cy - up)
    ctx.quadraticCurveTo(cx + px, cy - u, cx + side, cy)
    ctx.quadraticCurveTo(cx + px, cy + d, cx, cy + down)
    ctx.quadraticCurveTo(cx - px, cy + d, cx - side, cy)
    ctx.quadraticCurveTo(cx - px, cy - u, cx, cy - up)
    ctx.closePath()
  }
  const s = r / 50 //          the artwork is a hundred units across
  const bx = x
  const by = y + 5 * s //      the body, and the point the second wing turns about
  const sx = x + 0.9 * s
  const sy = y + 5.6 * s
  const up = 55.6 * s
  const dn = 40 * s
  const side = 49.1 * s
  const cut = 1.6 * s
  const br = 11.6 * s

  const half = (left) => {
    ctx.save()
    ctx.beginPath()
    if (left) ctx.rect(x - r * 2, y - r * 2, r * 2 - cut / 2, r * 4)
    else ctx.rect(x + cut / 2, y - r * 2, r * 2, r * 4)
    ctx.clip()
    if (left) {
      ctx.fillStyle = TOKENS.cream
      wing(2 * bx - sx, 2 * by - sy, dn, up, side, 0.1)
      ctx.fill()
      // where the cut opens out around the body — a hole, not a painted ring
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(bx, by, br + cut * 1.9, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = TOKENS.them
      wing(sx, sy, up, dn, side, 0.1)
      ctx.fill()
    }
    ctx.restore()
  }
  half(true)
  half(false)

  const g = ctx.createLinearGradient(bx - br, by - br, bx + br, by + br)
  g.addColorStop(0, TOKENS.cream2)
  g.addColorStop(0.52, TOKENS.you)
  g.addColorStop(1, TOKENS.saddle)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(bx, by, br, 0, Math.PI * 2)
  ctx.fill()
}

// wrap a serif line to a measure and return the laid-out rows
function wrap(ctx, text, max) {
  const out = []
  let line = ''
  for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      out.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) out.push(line)
  return out
}

// ── the render ───────────────────────────────────────────────────────────────
// `card` is YOURS. There is no parameter for theirs.
export async function renderCard({ card, photoUrl, mutual = false }) {
  // Canvas takes no part in font loading: it draws with whatever is resident
  // when fillText runs, silently falling back to Georgia and Arial. On a cold
  // share that produced a card set in the wrong faces, which for a design this
  // dependent on its type is the whole thing going wrong quietly.
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready
  } catch {
    /* the fallbacks in the stacks below are deliberate and readable */
  }

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  night(ctx)

  let img = null
  if (photoUrl) {
    try {
      img = new Image()
      img.src = photoUrl
      await img.decode()
    } catch {
      img = null
    }
  }

  const hue = tintOf(TOKENS, card && card.tone)
  const cx = W / 2
  const cy = H * 0.44
  const r = W * 0.38
  const d = r * 2
  body(ctx, card, img, cx, cy, r, hue)

  // ── the poster, inside the disc ────────────────────────────────────────────
  // The same composition the app lays out, from the same functions, at the same
  // ratios of the diameter — because it is the same card. A Story render that
  // re-laid it out would be a second design of it.
  const words = (card && card.words) || ''
  const pos = clampPos((card && card.pos) || autoPos(words))
  const align = alignAt(pos)
  const width = measureAt(pos) * d
  const face = faceOf(card && card.face)
  const ms = metaSize(d)
  const wsize = d * fitRatio(words) * face.scale
  const lead = wsize * face.lead

  // where a block's text starts, given the alignment its position implies
  const edge = (p) => {
    const x = cx - r + p.x * d
    return align === 'left' ? x : align === 'right' ? x - width : x - width / 2
  }
  ctx.textBaseline = 'middle'
  ctx.textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center'
  const penX = (p) => (align === 'left' ? edge(p) : align === 'right' ? edge(p) + width : edge(p) + width / 2)

  // the ink comes off the ground, not off the brand: type set ivory on ivory is
  // the one thing this card may never do
  const ground = plateOf(card && card.bg)
  const onDark = !!img || ground.id === 'hide'
  ctx.font = `${face.style} ${face.weight} ${wsize}px ${face.family}`
  const rows = wrap(ctx, face.transform === 'lowercase' ? words.toLowerCase() : words, width)
  let y = cy - r + pos.y * d - ((rows.length - 1) * lead) / 2
  ctx.fillStyle = onDark ? TOKENS.cream : ground.ink
  for (const row of rows) {
    ctx.fillText(row, penX(pos), y)
    y += lead
  }

  const mp = metaPos(pos)
  tracked(
    ctx,
    [`@${(card && card.handle) || ''}`, stamp(card && card.placed)].join('  ·  '),
    penX(mp), cy - r + mp.y * d, ms, ms * 0.14,
    onDark ? rgba(TOKENS.cream, 0.62) : ground.quiet, ctx.textAlign, false,
  )

  // ── outside the disc ──────────────────────────────────────────────────────
  // The mark, and what it means, said once.
  ctx.textAlign = 'center'
  if (mutual) {
    glyph(ctx, cx, cy + r + 148, 30)
    tracked(ctx, 'it was mutual', cx, cy + r + 244, 25, 6, rgba(TOKENS.cream, 0.8))
  }
  tracked(ctx, 'celestual.us', cx, H - 118, 25, 6, rgba(TOKENS.cream, 0.5))

  return new Promise((res) => c.toBlob(res, 'image/png'))
}

// Hand it to the OS share sheet where there is one, and download it where there
// is not. Instagram blocks reliable third-party direct-to-Story posting, so the
// honest flow is the share sheet and a link sticker, which is also why the card
// has to be worth the extra step.
export async function shareCard(args) {
  const blob = await renderCard(args)
  if (!blob) return false
  const file = new File([blob], 'celestual.png', { type: 'image/png' })
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
      return true
    }
  } catch {
    // a cancelled share is not a failure and must not fall through to a
    // download the person did not ask for
    return false
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'celestual.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}

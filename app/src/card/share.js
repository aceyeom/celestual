// card/share.js — the shareable, and the thing it is careful not to carry.
//
// A screenshot of the fused spread would put another person's private words on
// a Story, and they wrote them to exactly one reader. So the share sheet does
// not photograph the screen: it RENDERS, from data, a card that contains your
// half and the mutual mark and nothing else (the plan, §4 — content & safety).
// There is no argument that gets their words into this file, which is the only
// way to be sure they never end up in the output.
//
// The frame is the product's own: the deep cosmic-violet void, and the card in
// the middle of it, drawn at exactly the ratios the app draws it at. One small
// ✦ underneath — the mark docs/DESIGN.md reserves for mutuality and nothing
// else.
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
  // two soft rises of the two stars, the same lighting the landing carries
  const a = ctx.createRadialGradient(W * 0.16, H * 0.96, 0, W * 0.16, H * 0.96, W * 1.1)
  a.addColorStop(0, rgba(TOKENS.you, 0.11))
  a.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = a
  ctx.fillRect(0, 0, W, H)
  const b = ctx.createRadialGradient(W * 0.9, H * 0.06, 0, W * 0.9, H * 0.06, W * 0.9)
  b.addColorStop(0, rgba(TOKENS.them, 0.09))
  b.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = b
  ctx.fillRect(0, 0, W, H)

  // a scatter of real starlight, so the card is not a flat panel
  let s = 0x9e3779b9
  const rnd = () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 0.6 + rnd() * 1.5
    ctx.globalAlpha = 0.1 + rnd() * 0.45
    ctx.fillStyle = rnd() > 0.82 ? TOKENS.you : '#EFEAF2'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── the body ─────────────────────────────────────────────────────────────────
// The same object the app draws, in canvas: a flat ground, one even scrim over
// a photograph, the shared grain, and the corona — no drawn edge. No
// gradients inside the disc, for the same reason there are none in Disc.jsx —
// a vignette on a circle reads as a lens artefact rather than as a print.
function body(ctx, card, img, cx, cy, r, hue) {
  // the corona, outside the limb
  const cor = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.1)
  cor.addColorStop(0, rgba(hue, 0.3))
  cor.addColorStop(0.4, rgba(hue, 0.09))
  cor.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cor
  ctx.beginPath()
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  // the ground: one flat plate, or a photograph under the scrim that holds
  // every card in the product at one contrast
  ctx.fillStyle = plateOf(card && card.bg).hex
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = rgba(TOKENS.ink, 0.32)
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

  // and nothing is drawn on the limb. Disc.jsx carries the reasoning: a stroked
  // circle is a badge, and what ends a real body is the light falling off it,
  // which the corona above already did. This render has to be the same object
  // the app draws or the share sheet is a different product.
}

// Tracked mono, the way canvas cannot do on its own.
function tracked(ctx, text, x0, y, size, track, color, align = 'center') {
  const s = String(text || '').toUpperCase()
  if (!s) return
  const prevAlign = ctx.textAlign
  ctx.font = `700 ${size}px Space Mono, ui-monospace, monospace`
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

// the four-point sparkle — reserved for mutuality, and used once
function glyph(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.42, '#FFE3C8')
  g.addColorStop(1, TOKENS.you)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.1, x + r, y)
  ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.1, x, y + r)
  ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.1, x - r, y)
  ctx.quadraticCurveTo(x - r * 0.1, y - r * 0.1, x, y - r)
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

  ctx.font = `${face.style} ${face.weight} ${wsize}px ${face.family}`
  const rows = wrap(ctx, face.transform === 'lowercase' ? words.toLowerCase() : words, width)
  let y = cy - r + pos.y * d - ((rows.length - 1) * lead) / 2
  ctx.fillStyle = TOKENS.cream
  for (const row of rows) {
    ctx.fillText(row, penX(pos), y)
    y += lead
  }

  const mp = metaPos(pos)
  tracked(
    ctx,
    [`@${(card && card.handle) || ''}`, stamp(card && card.placed)].join('  ·  '),
    penX(mp), cy - r + mp.y * d, ms, ms * 0.16, rgba(TOKENS.cream, 0.62), ctx.textAlign,
  )

  // ── outside the disc ──────────────────────────────────────────────────────
  // The mark, and what it means, said once.
  ctx.textAlign = 'center'
  if (mutual) {
    glyph(ctx, cx, cy + r + 150, 26)
    tracked(ctx, 'it was mutual', cx, cy + r + 232, 26, 5, rgba(TOKENS.muted, 0.95))
  }
  tracked(ctx, 'celestual.us', cx, H - 118, 26, 5, rgba(TOKENS.muted, 0.8))

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

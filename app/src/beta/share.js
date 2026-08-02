// beta/share.js — the shareable, and the thing it is careful not to carry.
//
// A screenshot of the fused spread would put another person's private words on
// a Story, and they wrote them to exactly one reader. So the share sheet does
// not photograph the screen: it RENDERS, from data, a card that contains your
// half and the mutual mark and nothing else (the plan, §4 — content & safety).
// There is no argument that gets their words into this file, which is the only
// way to be sure they never end up in the output.
//
// The frame is the product's own: the deep cosmic-violet void, the circular
// body with its limb darkening and its grain, the @ on the rim, the words in
// serif italic beneath, and one small ✦ — the mark docs/DESIGN.md reserves for
// mutuality and for nothing else.
import { TOKENS, rgba } from '../theme.js'
import { tintOf, stamp } from './model.js'

const W = 1080
const H = 1920

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

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
// The same object the app draws, in canvas: surface, granulation, limb
// darkening per channel, corona, hairline limb.
function body(ctx, img, cx, cy, r, hue) {
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

  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
  } else {
    // the photosphere: what the disc shows when there is nothing on it, which
    // is not nothing — it is a star
    const g = ctx.createRadialGradient(cx - r * 0.16, cy - r * 0.2, 0, cx, cy, r)
    g.addColorStop(0, rgba(hue, 0.55))
    g.addColorStop(0.36, rgba(hue, 0.3))
    g.addColorStop(0.76, rgba(TOKENS.ink3, 0.92))
    g.addColorStop(1, TOKENS.ink)
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }

  // granulation
  let s = 0x1f83d9ab
  const rnd = () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))
  ctx.globalAlpha = img ? 0.05 : 0.1
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * r
    const cr = 3 + rnd() * 9
    ctx.fillStyle = rnd() > 0.5 ? '#FFFFFF' : '#000000'
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // limb darkening, and the warmth put back at the very edge
  const dark = ctx.createRadialGradient(cx, cy, r * 0.46, cx, cy, r)
  dark.addColorStop(0, 'rgba(0,0,0,0)')
  dark.addColorStop(0.76, rgba(TOKENS.ink, 0.36))
  dark.addColorStop(0.94, rgba(TOKENS.ink, 0.76))
  dark.addColorStop(1, rgba(TOKENS.ink, 0.93))
  ctx.fillStyle = dark
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)

  ctx.globalCompositeOperation = 'screen'
  const warm = ctx.createRadialGradient(cx, cy, r * 0.58, cx, cy, r)
  warm.addColorStop(0, 'rgba(0,0,0,0)')
  warm.addColorStop(1, rgba(hue, 0.22))
  ctx.fillStyle = warm
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()

  // the limb itself
  ctx.strokeStyle = rgba(TOKENS.cream, 0.18)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  // the chromosphere, catching on one arc
  ctx.strokeStyle = rgba(hue, 0.75)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI * 1.12, Math.PI * 1.42)
  ctx.stroke()
}

// the @ set on the arc, centered at the top, reading left to right
function rim(ctx, text, cx, cy, r, hue) {
  const s = String(text || '').toUpperCase()
  if (!s) return
  ctx.save()
  ctx.fillStyle = rgba(hue, 0.85)
  ctx.font = `700 26px ${'Space Mono, ui-monospace, monospace'}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const track = 5
  // total sweep, so the string can be centered on twelve o'clock
  let total = 0
  for (const ch of s) total += ctx.measureText(ch).width + track
  let ang = -Math.PI / 2 - total / (2 * r)
  for (const ch of s) {
    const w = ctx.measureText(ch).width + track
    ang += w / (2 * r)
    ctx.save()
    ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
    ctx.rotate(ang + Math.PI / 2)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    ang += w / (2 * r)
  }
  ctx.restore()
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
  const cy = H * 0.42
  const r = W * 0.33
  body(ctx, img, cx, cy, r, hue)
  rim(ctx, `@${(card && card.handle) || ''}`, cx, cy, r * 0.87, hue)

  // the words
  ctx.fillStyle = TOKENS.cream
  ctx.font = `italic 400 54px ${'Instrument Serif, Georgia, serif'}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const rows = wrap(ctx, card && card.words, W * 0.74)
  let y = cy + r + 150
  for (const row of rows) {
    ctx.fillText(row, cx, y)
    y += 72
  }

  // the mark, and what it means, said once
  if (mutual) {
    glyph(ctx, cx, y + 78, 26)
    ctx.fillStyle = rgba(TOKENS.muted, 0.95)
    ctx.font = `700 24px ${'Space Mono, ui-monospace, monospace'}`
    ctx.fillText('IT WAS MUTUAL', cx, y + 168)
  }

  // the foot
  ctx.fillStyle = rgba(TOKENS.muted, 0.8)
  ctx.font = `700 26px ${'Space Mono, ui-monospace, monospace'}`
  ctx.fillText('CELESTUAL.US', cx, H - 118)
  ctx.fillStyle = rgba(TOKENS.muted, 0.55)
  ctx.font = `400 24px ${'Space Grotesk, system-ui, sans-serif'}`
  ctx.fillText(stamp(card && card.placed), cx, H - 72)

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

export { clamp }

// card.js — the open-door Story card (framework §2.2, Screen 5).
//
// Renders the 1080×1920 card to a canvas and hands back a PNG: the deep cosmic
// night, a warm star riding an amber→rose orbit over a soft nebula, the
// receiver-voice line in serif italic, a "door" pill that invites the tap, and
// the handle + link small at the bottom. Instagram doesn't allow reliable
// third-party direct-to-Story posting, so the honest flow is download + link
// sticker — which means the card has to be gorgeous enough to be worth two
// steps, and legible enough at thumbnail size to earn one. Everything here
// derives from theme.js tokens; the card IS the brand.
import { TOKENS, rgba } from './theme.js'

const W = 1080
const H = 1920

function seededRand(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const probe = line ? line + ' ' + w : w
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = probe
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// The concave four-point brand glyph — a small crisp sparkle, used top and bottom.
function drawGlyph(ctx, x, y, r, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y)
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r)
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y)
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r)
  ctx.closePath()
  const g = ctx.createRadialGradient(x, y - r * 0.1, 0, x, y, r)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.45, '#FFE3C8')
  g.addColorStop(1, TOKENS.star)
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
}

// The hero: a nebula glow, an amber→rose orbit arc, and the warm star riding it —
// the same visual grammar as the app's progress ring, scaled up as an object.
function drawHero(ctx, cx, cy, R) {
  // the nebula — a wide, soft amber→rose bloom behind everything
  const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3.1)
  neb.addColorStop(0, rgba(TOKENS.star, 0.34))
  neb.addColorStop(0.32, rgba(TOKENS.star, 0.12))
  neb.addColorStop(0.62, rgba(TOKENS.them, 0.08))
  neb.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = neb
  ctx.fillRect(cx - R * 3.2, cy - R * 3.2, R * 6.4, R * 6.4)

  // the orbit track — a faint full ring
  ctx.lineWidth = 6
  ctx.strokeStyle = rgba(TOKENS.cream, 0.1)
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()

  // the lit arc — amber sweeping to rose, ~300°, a star riding its leading edge
  const start = -Math.PI / 2
  const end = start + Math.PI * 2 * 0.82
  const grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
  grad.addColorStop(0, TOKENS.star)
  grad.addColorStop(0.62, TOKENS.star)
  grad.addColorStop(1, TOKENS.them)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = 9
  ctx.strokeStyle = grad
  ctx.shadowColor = rgba(TOKENS.star, 0.55)
  ctx.shadowBlur = 26
  ctx.beginPath()
  ctx.arc(cx, cy, R, start, end)
  ctx.stroke()
  ctx.restore()

  // the star riding the arc's leading edge
  const ex = cx + Math.cos(end) * R
  const ey = cy + Math.sin(end) * R
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 34)
  eg.addColorStop(0, '#FFFFFF')
  eg.addColorStop(0.4, rgba(TOKENS.star, 0.7))
  eg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = eg
  ctx.beginPath()
  ctx.arc(ex, ey, 34, 0, Math.PI * 2)
  ctx.fill()

  // the core star, centered — white heart in a warm halo
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.92)
  halo.addColorStop(0, rgba(TOKENS.star, 0.5))
  halo.addColorStop(0.5, rgba(TOKENS.star, 0.12))
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2)
  ctx.fill()
  drawGlyph(ctx, cx, cy, R * 0.42)
}

// Render the card. `line` is the receiver-voice sentence; `handle` the poster.
// Returns a PNG data URL. Waits for the web fonts so the serif is the serif.
export async function renderDoorCard({ handle, line, site = 'celestual.us' }) {
  try {
    await document.fonts.ready
    await Promise.all([
      document.fonts.load('italic 400 84px "Instrument Serif"'),
      document.fonts.load('700 28px "Space Mono"'),
      document.fonts.load('500 30px "Space Grotesk"'),
    ])
  } catch {
    /* fonts degrade to system serif/mono — still a coherent card */
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // the night — a vertical wash from violet-navy into near-black
  const base = ctx.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#0E0A1A')
  base.addColorStop(0.5, TOKENS.ink)
  base.addColorStop(1, '#050308')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // the sparse field — same seeded sky as the app, a few stars carrying warmth
  const rand = seededRand(20260703)
  for (let i = 0; i < 220; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 0.8 + rand() * 2.4
    const a = 0.05 + rand() * 0.32
    const warm = rand() < 0.08
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = warm ? rgba(TOKENS.star, a * 0.85) : `rgba(226,232,244,${a})`
    ctx.fill()
  }

  // ── top brandmark row ──
  const topY = 210
  drawGlyph(ctx, W / 2 - 132, topY - 9, 17)
  ctx.textAlign = 'left'
  ctx.fillStyle = rgba(TOKENS.cream, 0.9)
  ctx.font = '700 34px "Space Mono", monospace'
  // letterspacing by hand (canvas has no tracking): draw spaced glyphs
  const brand = 'C E L E S T U A L'
  ctx.fillText(brand, W / 2 - 100, topY)

  // ── the hero ──
  drawHero(ctx, W / 2, H * 0.31, 190)

  // ── the line — serif italic, the emotional register ──
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  ctx.font = 'italic 400 84px "Instrument Serif", Georgia, serif'
  const lines = wrapLines(ctx, line, W * 0.78)
  const lineH = 108
  const startY = H * 0.5
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH))
  const afterLine = startY + (lines.length - 1) * lineH

  // ── the mechanic whisper — small quiet sans under the line ──
  ctx.fillStyle = rgba(TOKENS.muted, 0.95)
  ctx.font = '500 33px "Space Grotesk", Arial, sans-serif'
  ctx.fillText('i only find out if it’s mutual.', W / 2, afterLine + 92)

  // ── the door pill — invites the tap, sits where a link sticker lands ──
  const pillW = 470
  const pillH = 108
  const pillX = (W - pillW) / 2
  const pillY = H * 0.75
  // a soft glow beneath it
  const pg = ctx.createRadialGradient(W / 2, pillY + pillH / 2, 0, W / 2, pillY + pillH / 2, pillW * 0.7)
  pg.addColorStop(0, rgba(TOKENS.star, 0.22))
  pg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = pg
  ctx.fillRect(pillX - 120, pillY - 60, pillW + 240, pillH + 120)
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fillStyle = rgba(TOKENS.star, 0.14)
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = rgba(TOKENS.star, 0.75)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  ctx.font = '600 40px "Space Grotesk", Arial, sans-serif'
  ctx.fillText('open my door', W / 2 - 22, pillY + pillH / 2 + 14)
  // the arrow
  ctx.strokeStyle = TOKENS.star
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const ax = W / 2 + 150
  const ay = pillY + pillH / 2
  ctx.beginPath()
  ctx.moveTo(ax - 15, ay)
  ctx.lineTo(ax + 15, ay)
  ctx.moveTo(ax + 4, ay - 11)
  ctx.lineTo(ax + 15, ay)
  ctx.lineTo(ax + 4, ay + 11)
  ctx.stroke()

  // the tap hint under the pill
  ctx.fillStyle = rgba(TOKENS.star, 0.9)
  ctx.font = '700 26px "Space Mono", monospace'
  ctx.fillText('T A P   T H E   L I N K', W / 2, pillY + pillH + 62)

  // ── the footer — handle + link, the metadata register ──
  ctx.fillStyle = TOKENS.cream
  ctx.font = '700 40px "Space Mono", monospace'
  ctx.fillText(`@${handle}`, W / 2, H - 168)
  ctx.fillStyle = rgba(TOKENS.cream, 0.5)
  ctx.font = '400 30px "Space Mono", monospace'
  ctx.fillText(`${site}/@${handle}`, W / 2, H - 112)

  return canvas.toDataURL('image/png')
}

// Trigger a download of the rendered card.
export async function downloadDoorCard({ handle, line }) {
  const url = await renderDoorCard({ handle, line })
  const a = document.createElement('a')
  a.href = url
  a.download = `celestual-door-${handle}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return url
}

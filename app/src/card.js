// card.js — the open-door Story card (framework §2.2, Screen 5).
//
// Renders the 1080×1920 card to a canvas and hands back a PNG: deep navy, the
// sparse night, the single warm star, the receiver-voice line in serif italic,
// the handle and link small at the bottom. Instagram doesn't allow reliable
// third-party direct-to-Story posting, so the honest flow is download + link
// sticker — which means the card has to be gorgeous enough to be worth two
// steps. Everything here derives from theme.js tokens; the card IS the brand.
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

// Draw the four-point concave star (the brand glyph) centered at (x, y).
function drawStar(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  g.addColorStop(0, rgba(TOKENS.star, 0.5))
  g.addColorStop(0.5, rgba(TOKENS.star, 0.12))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6)

  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.1, x + r, y)
  ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.1, x, y + r)
  ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.1, x - r, y)
  ctx.quadraticCurveTo(x - r * 0.1, y - r * 0.1, x, y - r)
  ctx.closePath()
  const sg = ctx.createRadialGradient(x, y - r * 0.1, 0, x, y, r)
  sg.addColorStop(0, '#FFFFFF')
  sg.addColorStop(0.45, '#FFE3C8')
  sg.addColorStop(1, TOKENS.star)
  ctx.fillStyle = sg
  ctx.fill()
}

// Render the card. `line` is the receiver-voice sentence; `handle` the poster.
// Returns a PNG data URL. Waits for the web fonts so the serif is the serif.
export async function renderDoorCard({ handle, line, site = 'celestual.us' }) {
  try {
    await document.fonts.ready
    await Promise.all([
      document.fonts.load('italic 400 64px "Instrument Serif"'),
      document.fonts.load('400 28px "Space Mono"'),
    ])
  } catch {
    /* fonts degrade to system serif/mono — still a coherent card */
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // the night
  ctx.fillStyle = TOKENS.ink
  ctx.fillRect(0, 0, W, H)
  const falloff = ctx.createLinearGradient(0, 0, 0, H)
  falloff.addColorStop(0, 'rgba(20,29,49,0.4)')
  falloff.addColorStop(0.5, 'rgba(20,29,49,0)')
  falloff.addColorStop(1, 'rgba(3,5,10,0.55)')
  ctx.fillStyle = falloff
  ctx.fillRect(0, 0, W, H)

  // the sparse field — same seeded sky as the app
  const rand = seededRand(20260703)
  for (let i = 0; i < 210; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 0.8 + rand() * 2.2
    const a = 0.05 + rand() * 0.3
    const warm = rand() < 0.07
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = warm ? `rgba(255,162,92,${a * 0.8})` : `rgba(226,232,244,${a})`
    ctx.fill()
  }

  // the star, high-center
  drawStar(ctx, W / 2, H * 0.3, 46)

  // the line — serif italic, the emotional register
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  ctx.font = 'italic 400 76px "Instrument Serif", Georgia, serif'
  const lines = wrapLines(ctx, line, W * 0.72)
  const lineH = 100
  const startY = H * 0.47 - ((lines.length - 1) * lineH) / 2
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH))

  // the mechanics whisper — small quiet sans under the line
  ctx.fillStyle = 'rgba(139,148,168,0.95)'
  ctx.font = '400 30px "Space Grotesk", Arial, sans-serif'
  ctx.fillText('i’ll never know unless it’s mutual.', W / 2, startY + lines.length * lineH + 40)

  // the footer — handle + link, the metadata register
  ctx.fillStyle = 'rgba(242,238,229,0.55)'
  ctx.font = '400 30px "Space Mono", monospace'
  ctx.fillText(`${site}/@${handle}`, W / 2, H - 150)
  ctx.fillStyle = rgba(TOKENS.star, 0.9)
  ctx.font = '400 34px "Space Mono", monospace'
  ctx.fillText('✦', W / 2, H - 214)

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

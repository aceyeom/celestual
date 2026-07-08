// card.js — the open-sky share card (framework §2.2, Screen 5).
//
// The shareable is about the PLACE, not the person. It renders a 1080×1920 Story
// card that says a community's sky is open (or gathering): a real, tilted galaxy
// disk — one point of light per ping, density scaled to the community's size, with
// rose match-constellations threaded through an open one — under a serif lockup
// and a live stat line, over the deep cosmic night. It names no one. Instagram
// blocks reliable third-party direct-to-Story posting, so the honest flow is
// download + link sticker — which means the card has to be gorgeous enough to be
// worth two steps and legible at thumbnail size. Everything derives from theme.js
// tokens; the card IS the brand.
import { TOKENS, rgba } from './theme.js'

const W = 1080
const H = 1920
const TWO = Math.PI * 2
const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // golden angle — even, galaxy-like fill
const DISK_TILT = 0.5 // vertical squash → the disk reads as a tilted ellipse
const DISK_CAP = 1200 // ping count that maps the disk to (nearly) full-frame

function seededRand(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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

// The concave four-point brand glyph — a small crisp sparkle, warm-hearted.
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

// The community seal — a cosmos ring around the school's serif monogram, tinted to
// the two stars so no third hue enters. Echoes SchoolMark in the app.
function drawSeal(ctx, cx, cy, r, mono) {
  ctx.save()
  // outer ring
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  ring.addColorStop(0, rgba(TOKENS.star, 0.9))
  ring.addColorStop(1, rgba(TOKENS.them, 0.75))
  ctx.lineWidth = 3
  ctx.strokeStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TWO)
  ctx.stroke()
  // inner fill
  const fill = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r)
  fill.addColorStop(0, rgba(TOKENS.star, 0.16))
  fill.addColorStop(1, rgba(TOKENS.ink, 0.5))
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(cx, cy, r - 2, 0, TWO)
  ctx.fill()
  // monogram
  ctx.fillStyle = TOKENS.cream
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `italic 400 ${Math.round(r * 0.82)}px "Instrument Serif", Georgia, serif`
  ctx.fillText(mono || '✦', cx, cy + r * 0.06)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

// The hero: a living galaxy disk. One star per ping (density scaled to `count`), a
// warm core, and — on an open sky — a few rose match-constellations threaded in.
function drawGalaxyDisk(ctx, cx, cy, R, count, constellations) {
  const you = TOKENS.star
  const them = TOKENS.them

  // wide nebula bloom behind the disk
  const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8)
  neb.addColorStop(0, rgba(you, 0.22))
  neb.addColorStop(0.38, rgba(you, 0.09))
  neb.addColorStop(0.7, rgba(them, 0.06))
  neb.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = neb
  ctx.fillRect(cx - R * 1.9, cy - R * 1.9, R * 3.8, R * 3.8)

  // the luminous core, squashed to the disk plane
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, DISK_TILT)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95)
  core.addColorStop(0, 'rgba(255,240,216,0.55)')
  core.addColorStop(0.28, rgba(you, 0.18))
  core.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.95, 0, TWO)
  ctx.fill()
  ctx.restore()

  // the stars — a phyllotaxis spiral with a gentle two-arm bias, tilted
  const n = Math.max(80, Math.min(DISK_CAP, Math.round(count || 140)))
  const rand = seededRand(20260708)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const rr = Math.sqrt((i + 0.5) / DISK_CAP)
    const arm = (i % 2) * Math.PI
    const ang = i * GOLDEN + Math.sin(rr * 3.1 + arm) * 0.28
    const dz = Math.sin(ang) * rr
    const x = cx + Math.cos(ang) * rr * R
    const y = cy + dz * R * DISK_TILT
    const depth = dz // ~[-1,1], front = +
    const hr = rand()
    const col =
      hr < 0.55 ? '#EFE9F4' : hr < 0.78 ? you : hr < 0.92 ? '#F4C9A1' : hr < 0.98 ? '#BFD3FA' : them
    const a = (0.4 + 0.5 * rand()) * (0.6 + 0.4 * ((depth + 1) / 2))
    const sz = 2.0 + rand() * 3.0 + (depth > 0.2 ? 1.4 : 0)
    ctx.globalAlpha = Math.min(1, a)
    const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 3)
    g.addColorStop(0, '#FFFFFF')
    g.addColorStop(0.4, rgba(col, 0.85))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, sz * 3, 0, TWO)
    ctx.fill()
  }

  // rose match-constellations — small asterisms threaded through an open sky
  const cn = Math.max(0, Math.min(6, constellations || 0))
  const crand = seededRand(4242)
  for (let k = 0; k < cn; k++) {
    const a0 = k * GOLDEN * 1.4
    const rad = 0.42 + crand() * 0.36
    const bx = cx + Math.cos(a0) * rad * R
    const by = cy + Math.sin(a0) * rad * R * DISK_TILT
    const nn = 3 + Math.floor(crand() * 2)
    const nodes = []
    for (let j = 0; j < nn; j++) nodes.push([bx + (crand() - 0.5) * R * 0.16, by + (crand() - 0.5) * R * 0.16 * DISK_TILT])
    nodes.sort((p, q) => Math.atan2(p[1] - by, p[0] - bx) - Math.atan2(q[1] - by, q[0] - bx))
    ctx.lineWidth = 2
    for (let j = 0; j < nodes.length - 1; j++) {
      const grd = ctx.createLinearGradient(nodes[j][0], nodes[j][1], nodes[j + 1][0], nodes[j + 1][1])
      grd.addColorStop(0, rgba(them, 0))
      grd.addColorStop(0.5, 'rgba(245,236,246,0.4)')
      grd.addColorStop(1, rgba(you, 0.3))
      ctx.strokeStyle = grd
      ctx.beginPath()
      ctx.moveTo(nodes[j][0], nodes[j][1])
      ctx.lineTo(nodes[j + 1][0], nodes[j + 1][1])
      ctx.stroke()
    }
    for (const nd of nodes) {
      ctx.globalAlpha = 0.9
      const g = ctx.createRadialGradient(nd[0], nd[1], 0, nd[0], nd[1], 9)
      g.addColorStop(0, '#FFFFFF')
      g.addColorStop(0.4, rgba(them, 0.8))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(nd[0], nd[1], 9, 0, TWO)
      ctx.fill()
    }
  }
  ctx.restore()
}

// A single stat pill — a big serif number over a small mono label, in a soft
// bordered lozenge. The row of these is the card's live proof-of-life.
function drawStatPill(ctx, cx, cy, w, h, value, label) {
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.28)
  ctx.fillStyle = rgba(TOKENS.cream, 0.04)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = rgba(TOKENS.star, 0.28)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.star
  ctx.font = 'italic 400 62px "Instrument Serif", Georgia, serif'
  ctx.fillText(value, cx, cy + 6)
  ctx.fillStyle = rgba(TOKENS.cream, 0.7)
  ctx.font = '700 20px "Space Mono", monospace'
  ctx.fillText(label, cx, cy + 44)
}

// Draw a mono string with hand-rolled letterspacing (canvas has no tracking).
function drawTracked(ctx, text, x, y, size, tracking, color, weight = 700) {
  ctx.save()
  ctx.font = `${weight} ${size}px "Space Mono", monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  let total = 0
  const widths = []
  for (const ch of text) {
    const w = ctx.measureText(ch).width
    widths.push(w)
    total += w + tracking
  }
  total -= tracking
  let cx = x - total / 2
  let i = 0
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += widths[i++] + tracking
  }
  ctx.restore()
}

// Render the card. `community` is the curated record (name/short/mono/slug),
// `open` whether its sky is live, and `stats` its live numbers. Returns a PNG data
// URL. Waits for the web fonts so the serif is the serif.
export async function renderSkyCard({ community, open = false, stats = {}, site = 'celestual.us' }) {
  try {
    await document.fonts.ready
    await Promise.all([
      document.fonts.load('italic 400 96px "Instrument Serif"'),
      document.fonts.load('700 28px "Space Mono"'),
      document.fonts.load('500 30px "Space Grotesk"'),
    ])
  } catch {
    /* fonts degrade to system serif/mono — still a coherent card */
  }

  const short = (community && (community.short || community.name)) || 'your community'
  const mono = (community && community.mono) || '✦'
  const slug = (community && community.slug) || ''
  const members = Number(stats.members || 0)
  const matches = stats.matches != null ? Number(stats.matches) : null
  const pings = stats.pings != null ? Number(stats.pings) : null

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

  // the sparse deep field — a few stars carrying warmth
  const rand = seededRand(20260703)
  for (let i = 0; i < 240; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 0.8 + rand() * 2.2
    const a = 0.05 + rand() * 0.3
    const warm = rand() < 0.08
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TWO)
    ctx.fillStyle = warm ? rgba(TOKENS.star, a * 0.85) : `rgba(226,232,244,${a})`
    ctx.fill()
  }

  // ── top brandmark row ──
  const topY = 200
  drawGlyph(ctx, W / 2 - 140, topY - 9, 17)
  drawTracked(ctx, 'CELESTUAL', W / 2 + 26, topY, 34, 10, rgba(TOKENS.cream, 0.9))

  // ── the hero galaxy disk ──
  const diskCount = pings != null ? pings : Math.max(120, members * 1.6)
  drawGalaxyDisk(ctx, W / 2, H * 0.34, 320, diskCount, open ? Math.min(6, Math.max(0, matches || 0)) : 0)

  // the seal riding the top of the disk
  drawSeal(ctx, W / 2, H * 0.18, 58, mono)

  // ── the headline — serif italic, the emotional register ──
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  const line1 = `${short}’s sky`
  const line2 = open ? 'is open.' : 'is gathering.'
  ctx.font = 'italic 400 94px "Instrument Serif", Georgia, serif'
  const hY = H * 0.565
  ctx.fillText(line1, W / 2, hY)
  ctx.fillStyle = open ? TOKENS.star : rgba(TOKENS.cream, 0.92)
  ctx.fillText(line2, W / 2, hY + 96)

  // the mechanic whisper under the headline
  ctx.fillStyle = rgba(TOKENS.muted, 0.95)
  ctx.font = '500 32px "Space Grotesk", Arial, sans-serif'
  ctx.fillText(
    open ? 'a match here lights the whole sky.' : 'it opens the moment enough of us are in.',
    W / 2,
    hY + 168,
  )

  // ── the live stat row ──
  const pills = []
  pills.push([members.toLocaleString(), 'INSIDE'])
  if (open && matches != null && matches >= 10) pills.push([matches.toLocaleString(), 'MATCHED'])
  if (open && pings != null) pills.push([pings.toLocaleString(), 'PINGS'])
  const pillW = 250
  const pillH = 128
  const gap = 26
  const rowW = pills.length * pillW + (pills.length - 1) * gap
  const rowY = H * 0.72
  pills.forEach((p, i) => {
    const px = W / 2 - rowW / 2 + pillW / 2 + i * (pillW + gap)
    drawStatPill(ctx, px, rowY, pillW, pillH, p[0], p[1])
  })

  // ── the invite pill — where the link sticker lands ──
  const bpW = 500
  const bpH = 108
  const bpX = (W - bpW) / 2
  const bpY = H * 0.82
  const pg = ctx.createRadialGradient(W / 2, bpY + bpH / 2, 0, W / 2, bpY + bpH / 2, bpW * 0.7)
  pg.addColorStop(0, rgba(TOKENS.star, 0.22))
  pg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = pg
  ctx.fillRect(bpX - 120, bpY - 60, bpW + 240, bpH + 120)
  roundRect(ctx, bpX, bpY, bpW, bpH, bpH / 2)
  ctx.fillStyle = rgba(TOKENS.star, 0.14)
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = rgba(TOKENS.star, 0.75)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  ctx.font = '600 40px "Space Grotesk", Arial, sans-serif'
  ctx.fillText('join the sky', W / 2 - 22, bpY + bpH / 2 + 14)
  // the arrow
  ctx.strokeStyle = TOKENS.star
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const ax = W / 2 + 150
  const ay = bpY + bpH / 2
  ctx.beginPath()
  ctx.moveTo(ax - 15, ay)
  ctx.lineTo(ax + 15, ay)
  ctx.moveTo(ax + 4, ay - 11)
  ctx.lineTo(ax + 15, ay)
  ctx.lineTo(ax + 4, ay + 11)
  ctx.stroke()

  // the tap hint under the pill
  drawTracked(ctx, 'T A P   T H E   L I N K', W / 2, bpY + bpH + 60, 26, 2, rgba(TOKENS.star, 0.9))

  // ── the footer — the invite link, the metadata register ──
  ctx.textAlign = 'center'
  ctx.fillStyle = rgba(TOKENS.cream, 0.6)
  ctx.font = '400 30px "Space Mono", monospace'
  ctx.fillText(`${site}/c/${slug}`, W / 2, H - 120)

  return canvas.toDataURL('image/png')
}

// Trigger a download of the rendered card.
export async function downloadSkyCard({ community, open, stats }) {
  const url = await renderSkyCard({ community, open, stats })
  const slug = (community && community.slug) || 'sky'
  const a = document.createElement('a')
  a.href = url
  a.download = `celestual-${slug}-sky.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return url
}

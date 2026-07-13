// card.js — the open-sky share card (framework §2.2, Screen 5).
//
// The shareable is about the PLACE, not the person. It renders a 1080×1920
// Story card whose hero is a REAL galaxy — the same visual instrument as the
// live skies (starSprites' Airy points, the two-arm spiral seated on the same
// lens as galaxy.js / communityGalaxy.js, straight-line match figures), drawn
// once, static — under a serif lockup, one deadpan line, and a live stat
// strip, over the deep cosmic night. It names no one, and it SAYS so — the
// card's whole social contract is that posting it costs nothing.
//
// The copy register is deadpan on purpose. The riskiest unknown of the loop is
// whether anyone actually posts the card to their Story; an earnest "my door
// is open" asks the poster to be vulnerable, while a dry observatory bulletin
// ("every star is someone here who won't say it in person") is funny enough to
// post AS A JOKE and still carries the numbers, the school seal, and the link.
// Instagram blocks reliable third-party direct-to-Story posting, so the honest
// flow is share-sheet + link sticker — which means the card has to be gorgeous
// enough to be worth the step and legible at thumbnail size. Everything
// derives from theme.js tokens; the card IS the brand.
import { TOKENS, rgba } from './theme.js'
import { makeGlow, makeStarSprite, makeSpikeSprite } from './starSprites.js'

const W = 1080
const H = 1920
const TWO = Math.PI * 2
const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // golden angle — even, galaxy-like fill

// the shared lens (galaxy.js / communityGalaxy.js, verbatim constants) — the
// card's galaxy is the app's galaxy, one frame of it
const CAM = 2.7
const FOCAL = 2.35
const TILT = 1.04
const YAW = 0.52 // a fixed, flattering viewing angle for the still
const RMAX = 1.05
const PITCH = 3.3
const DISK_CAP = 1200 // ping count that maps the disk to (nearly) full size
const armAngle = (arm, r) => arm * Math.PI + (r / RMAX) * PITCH
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Stellar palette — identical to the live engines.
const PAL = {
  gold: '#F6DCA9',
  cream: '#EFEAF2',
  warm: '#F4C9A1',
  blue: '#BFD3FA',
  ice: '#A7C2FF',
  red: '#F3A98A',
}

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
  // a soft ink clearing so the seal rests IN the galaxy's light, not on it
  const clearing = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.1)
  clearing.addColorStop(0, rgba(TOKENS.ink, 0.55))
  clearing.addColorStop(0.6, rgba(TOKENS.ink, 0.25))
  clearing.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = clearing
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4)
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

// ── the hero: one still frame of the REAL galaxy ─────────────────────────────
// The same populations as the live community sky — a golden bulge, two
// feathered logarithmic arms with an inter-arm field, unresolved arm dust,
// arm-seated nebula gas, a deep shell of far suns — projected through the same
// perspective lens and drawn with the same star sprites. The disk spills past
// the card's edges on purpose: space keeps going past the glass.
function drawRealGalaxy(ctx, cx, cy, unit, count, matches) {
  const you = TOKENS.star
  const them = TOKENS.them
  const rand = seededRand(20260708)
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5

  // sprites — baked once per render; the card is drawn once, so no caching
  const dots = {}
  const dotFor = (hex) => dots[hex] || (dots[hex] = makeStarSprite(hex, 128))
  const glows = {}
  const glowFor = (hex) => glows[hex] || (glows[hex] = makeGlow(hex, 64))
  const spikeFor = (hex) => makeSpikeSprite(hex, 128)
  const spikeWhite = spikeFor('#FFFFFF')

  const project = (px, py, pz) => {
    const cosY = Math.cos(YAW),
      sinY = Math.sin(YAW)
    const x = px * cosY + pz * sinY
    const z = -px * sinY + pz * cosY
    const cosT = Math.cos(TILT),
      sinT = Math.sin(TILT)
    const y2 = py * cosT - z * sinT
    const z2 = py * sinT + z * cosT
    const zc = CAM + z2
    if (zc <= 0.05) return null
    const persp = FOCAL / zc
    return {
      sx: cx + x * unit * persp,
      sy: cy + y2 * unit * persp,
      persp,
      shade: clamp((CAM + 1.1 - zc) / 2.0 + 0.45, 0.35, 1.25),
    }
  }

  const n = Math.max(140, Math.min(DISK_CAP, Math.round(count || 200)))
  const fillR = Math.max(Math.sqrt(Math.max(n, 60) / DISK_CAP) * RMAX, 0.42)
  const fillFrac = clamp(n / DISK_CAP, 0, 1)
  // poster framing: unlike the live sky (where a community's size is FELT),
  // the card is a poster — normalize the lens so the lit disk always fills
  // the frame beautifully, small community or huge
  unit = unit / Math.max(fillR, 0.42)

  // the deep shell — far suns all around the disk (drawn first, faint)
  ctx.save()
  for (let i = 0; i < 260; i++) {
    const rr = 2.4 + Math.pow(rand(), 1.5) * 7
    const v = rand() * 2 - 1
    const u = rand() * TWO
    const ring = Math.sqrt(1 - v * v)
    const pr = project(rr * ring * Math.cos(u), rr * v * 0.85, rr * ring * Math.sin(u))
    if (!pr || pr.sx < -20 || pr.sx > W + 20 || pr.sy < -20 || pr.sy > H + 20) continue
    const hue = rand() < 0.16 ? PAL.blue : rand() < 0.22 ? PAL.warm : '#FFFFFF'
    ctx.globalAlpha = Math.min(0.7, (0.14 + rand() * 0.5) * 0.8)
    const D = clamp((0.5 + rand() * 0.9) * pr.persp * 4, 1.6, 6)
    ctx.drawImage(dotFor(hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
  }

  // arm-seated nebula gas — cool star-forming knots along the lanes, a warm
  // pair in the bulge (additive, behind the stars)
  ctx.globalCompositeOperation = 'lighter'
  const NCOL = [PAL.blue, '#7E6BA8', '#C77E8A', '#5E7BB0']
  for (let i = 0; i < 10; i++) {
    const inCore = i < 2
    const r = inCore ? 0.08 + rand() * 0.14 : 0.28 + rand() * 0.62
    if (!inCore && r > fillR + 0.18) continue
    const ang = inCore ? rand() * TWO : armAngle(i % 2, r) + gauss() * 0.16
    const pr = project(Math.cos(ang) * r, gauss() * 0.06, Math.sin(ang) * r)
    if (!pr) continue
    const rr = (0.22 + rand() * 0.4) * unit * pr.persp
    const col = inCore ? PAL.warm : NCOL[i % NCOL.length]
    const g = ctx.createRadialGradient(pr.sx, pr.sy, 0, pr.sx, pr.sy, rr)
    const [cr, cg, cb] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)]
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.05 + rand() * 0.045).toFixed(3)})`)
    g.addColorStop(0.5, `rgba(${cr},${cg},${cb},${(0.02 + rand() * 0.02).toFixed(3)})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(pr.sx, pr.sy, rr, 0, TWO)
    ctx.fill()
  }

  // the luminous heart + the milky disk haze, mapped onto the projected ellipse
  const o = project(0, 0, 0) || { sx: cx, sy: cy, persp: 1 }
  const core = ctx.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, unit * (0.3 + 0.28 * fillFrac) * o.persp)
  core.addColorStop(0, 'rgba(255,236,206,0.3)')
  core.addColorStop(0.15, 'rgba(255,214,176,0.16)')
  core.addColorStop(0.42, 'rgba(214,150,120,0.055)')
  core.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, W, H)
  const ax = project(1, 0, 0)
  const az = project(0, 0, 1)
  if (ax && az) {
    const spread = 0.32 + 0.72 * Math.sqrt(fillFrac)
    ctx.save()
    ctx.transform((ax.sx - o.sx) * spread, (ax.sy - o.sy) * spread, (az.sx - o.sx) * spread, (az.sy - o.sy) * spread, o.sx, o.sy)
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    haze.addColorStop(0, 'rgba(255,226,196,0.05)')
    haze.addColorStop(0.45, 'rgba(206,170,210,0.034)')
    haze.addColorStop(0.8, 'rgba(150,150,200,0.012)')
    haze.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = haze
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TWO)
    ctx.fill()
    ctx.restore()
  }

  // unresolved arm dust — the lanes' connective glow, gated to the lit disk
  for (let i = 0; i < 520; i++) {
    const isCore = rand() < 0.34
    const r = isCore ? 0.03 + Math.pow(rand(), 1.4) * 0.24 : 0.1 + Math.pow(rand(), 0.7) * (RMAX - 0.08)
    if (!isCore && r > fillR + 0.12) continue
    const ang = isCore ? rand() * TWO : armAngle(i % 2, r) + gauss() * (0.12 + 0.12 * (r / RMAX))
    const y = gauss() * (isCore ? 0.05 : 0.012 + 0.04 * Math.exp(-r * 2.6))
    const pr = project(Math.cos(ang) * r, y, Math.sin(ang) * r)
    if (!pr) continue
    const hue = r > 0.55 ? (rand() < 0.5 ? PAL.blue : PAL.cream) : rand() < 0.5 ? PAL.gold : PAL.warm
    ctx.globalAlpha = Math.min(0.4, (0.08 + rand() * 0.2) * clamp(pr.shade, 0.35, 1.2))
    const D = clamp((0.5 + rand() * 0.9) * 2.2 * Math.pow(pr.persp / (FOCAL / CAM), 0.55) * 1.8, 1.8, 8)
    ctx.drawImage(dotFor(hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
  }

  // the resolved stars — one per ping, seated exactly like the live sky's
  // slots: bulge / two feathered arms / thin inter-arm field, gold heart →
  // cream body → young blue rim
  ctx.globalCompositeOperation = 'source-over'
  const glowQ = []
  for (let i = 0; i < n; i++) {
    let r = Math.sqrt((i + 0.5) / DISK_CAP) * RMAX
    const kind = rand()
    let ang, y
    let arm = false
    if (r < 0.15 || kind < 0.16) {
      ang = rand() * TWO
      r *= 0.5 + rand() * 0.55
      y = gauss() * (0.045 + 0.035 * Math.exp(-r * 4))
    } else if (kind < 0.84) {
      arm = true
      r = clamp(r + gauss() * 0.04, 0.1, RMAX)
      ang = armAngle(i % 2, r) + gauss() * (0.11 + 0.13 * (r / RMAX))
      y = gauss() * (0.014 + 0.045 * Math.exp(-r * 2.6))
    } else {
      ang = rand() * TWO
      y = gauss() * (0.018 + 0.04 * Math.exp(-r * 2.2))
    }
    const cr = rand()
    let hue
    if (r < 0.28) hue = cr < 0.55 ? PAL.gold : cr < 0.85 ? PAL.warm : PAL.cream
    else if (r < 0.66) hue = cr < 0.14 ? PAL.warm : cr < 0.72 ? PAL.cream : PAL.blue
    else hue = cr < 0.5 ? PAL.blue : cr < 0.64 ? PAL.ice : PAL.cream
    if (cr > 0.985) hue = PAL.red
    else if (cr > 0.958) hue = you
    else if (cr > 0.944) hue = them
    const pr = project(Math.cos(ang) * r, y, Math.sin(ang) * r)
    if (!pr) continue
    const rad = 0.75 + rand() * 1.05
    const base = (0.54 + rand() * 0.44) * (1 - r * 0.14) * (arm || r < 0.3 ? 1 : 0.8)
    const a = base * (0.75 + 0.25 * rand()) * pr.shade
    ctx.globalAlpha = Math.min(0.96, a * 1.4)
    const D = Math.min(rad * 5.2 * Math.pow(pr.persp / (FOCAL / CAM), 0.5), 20)
    ctx.drawImage(dotFor(hue), pr.sx - D / 2, pr.sy - D / 2, D, D)
    if (rand() < 0.08) glowQ.push([pr, hue, a, D])
  }
  // the brightest few wear tinted blooms + hairline diffraction, so the still
  // reads photographed, not plotted
  ctx.globalCompositeOperation = 'lighter'
  for (const [pr, hue, a, D] of glowQ) {
    const gs = D * 2.6
    ctx.globalAlpha = Math.min(0.5, a * 0.6)
    ctx.drawImage(glowFor(hue), pr.sx - gs / 2, pr.sy - gs / 2, gs, gs)
    if (a > 0.55) {
      const ss = D * 3.4
      ctx.globalAlpha = Math.min(0.5, a * 0.5)
      ctx.drawImage(spikeWhite, pr.sx - ss / 2, pr.sy - ss / 2, ss, ss)
    }
  }

  // the match figures — the SAME star-chart constellations as the live sky:
  // straight cream hairlines joining a rose hub to its amber partners, mostly
  // pairs, an occasional small fan. Capped for legibility at card size.
  const figures = Math.max(0, Math.min(5, matches || 0))
  const crand = seededRand(4242)
  for (let k = 0; k < figures; k++) {
    const idx = k + 1
    const angC = idx * GOLDEN * 2.2
    const rC = (0.24 + crand() * 0.5) * fillR
    const hub = { px: Math.cos(angC) * rC, pz: Math.sin(angC) * rC, y: 0.03 + crand() * 0.04 }
    const ph = project(hub.px, hub.y, hub.pz)
    if (!ph) continue
    const dir = crand() * TWO
    const spokes = 1 + (crand() < 0.3 ? 1 + Math.floor(crand() * 2) : 0)
    for (let s = 0; s < spokes; s++) {
      const ang = dir + s * 2.39996323 + (crand() - 0.5) * 0.7
      const span = 0.06 + crand() * 0.07
      const ps = project(hub.px + Math.cos(ang) * span, 0.028 + crand() * 0.042, hub.pz + Math.sin(ang) * span)
      if (!ps) continue
      const la = clamp((ph.shade + ps.shade) / 2, 0.4, 1.1)
      ctx.globalAlpha = la
      ctx.strokeStyle = rgba(them, 0.07)
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ps.sx, ps.sy)
      ctx.lineTo(ph.sx, ph.sy)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(245,236,246,0.22)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(ps.sx, ps.sy)
      ctx.lineTo(ph.sx, ph.sy)
      ctx.stroke()
      // the amber partner star
      const gs = 10
      ctx.globalAlpha = Math.min(1, 0.45 * la + 0.08)
      ctx.drawImage(glowFor(you), ps.sx - gs, ps.sy - gs, gs * 2, gs * 2)
      const ss = 20
      ctx.globalAlpha = Math.min(1, 0.55 * la + 0.12)
      ctx.drawImage(spikeFor(you), ps.sx - ss / 2, ps.sy - ss / 2, ss, ss)
      ctx.globalAlpha = Math.min(1, 0.9 * la)
      ctx.drawImage(dotFor('#FFFFFF'), ps.sx - 3.4, ps.sy - 3.4, 6.8, 6.8)
    }
    // the rose hub, a touch larger
    const gs = 12.5
    ctx.globalAlpha = Math.min(1, 0.5 * clamp(ph.shade, 0.4, 1.1) + 0.08)
    ctx.drawImage(glowFor(them), ph.sx - gs, ph.sy - gs, gs * 2, gs * 2)
    const ss = 26
    ctx.globalAlpha = Math.min(1, 0.6 * clamp(ph.shade, 0.4, 1.1) + 0.12)
    ctx.drawImage(spikeFor(them), ph.sx - ss / 2, ph.sy - ss / 2, ss, ss)
    ctx.globalAlpha = 0.95
    ctx.drawImage(dotFor('#FFFFFF'), ph.sx - 4, ph.sy - 4, 8, 8)
  }
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
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

// ── the deadpan line bank ─────────────────────────────────────────────────────
// One dry line per card, deterministic per community (a school always posts
// the same joke — it reads curated, not random). Formats that were considered
// and rejected: the sincere open-door ("my door is open") asks the poster to
// be vulnerable on main; a stat dashboard reads as an ad. The observatory
// deadpan is the one register that is funny enough to post AS A JOKE and
// still carries the proof, the seal, and the link.
const n = (v) => Number(v || 0).toLocaleString()
const OPEN_LINES = [
  (s) => `every star up there is someone at ${s.short} who won’t say it in person.`,
  (s) => `${n(s.pings)} unspoken crushes, mapped for scientific purposes.`,
  (s) => `someone you know is up there. we are not allowed to tell you who.`,
]
const GATHERING_LINES = [
  (s) => `what happens at ${s.short} is nobody’s business. yet.`,
  (s) => `${n(s.left)} more people and everyone finds out what’s been going on here.`,
  (s) => `the sky over ${s.short} is filling up. draw your own conclusions.`,
]
const pickLine = (slug, open, data) => {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  const bank = open ? OPEN_LINES : GATHERING_LINES
  return bank[h % bank.length](data)
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

  // the sparse deep field — minute stars over the whole card, a few warm
  const rand = seededRand(20260703)
  for (let i = 0; i < 300; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 0.7 + rand() * 1.9
    const a = 0.05 + rand() * 0.28
    const warm = rand() < 0.08
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TWO)
    ctx.fillStyle = warm ? rgba(TOKENS.star, a * 0.85) : `rgba(226,232,244,${a})`
    ctx.fill()
  }

  // ── top brandmark row ──
  const topY = 170
  drawGlyph(ctx, W / 2 - 140, topY - 9, 17)
  drawTracked(ctx, 'CELESTUAL', W / 2 + 26, topY, 34, 10, rgba(TOKENS.cream, 0.9))

  // ── the hero — one still frame of the real galaxy, spilling off-frame ──
  const diskCount = open && pings != null ? pings : Math.max(150, members * 1.6)
  const diskCy = H * 0.365
  drawRealGalaxy(ctx, W / 2, diskCy, 520, diskCount, open ? matches || 0 : 0)

  // the seal resting at the galaxy's heart, in the core's own light
  drawSeal(ctx, W / 2, diskCy, 62, mono)

  // a soft scrim seats the text block on quiet space without walling off the sky
  const scrim = ctx.createLinearGradient(0, H * 0.52, 0, H)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(0.35, rgba(TOKENS.ink, 0.55))
  scrim.addColorStop(1, rgba('#050308', 0.9))
  ctx.fillStyle = scrim
  ctx.fillRect(0, H * 0.52, W, H * 0.48)

  // ── the headline — serif italic, the emotional register ──
  ctx.textAlign = 'center'
  ctx.fillStyle = TOKENS.cream
  const line1 = `${short}’s sky`
  const line2 = open ? 'is open.' : 'is gathering.'
  ctx.font = 'italic 400 100px "Instrument Serif", Georgia, serif'
  const hY = H * 0.638
  ctx.fillText(line1, W / 2, hY)
  ctx.fillStyle = open ? TOKENS.star : rgba(TOKENS.cream, 0.92)
  ctx.fillText(line2, W / 2, hY + 102)

  // the deadpan line — the reason this gets posted
  const left = Math.max(0, 100 - members)
  const deadpan = pickLine(slug || short, open, { short, pings, members, left })
  ctx.fillStyle = rgba(TOKENS.cream, 0.85)
  ctx.font = 'italic 400 40px "Instrument Serif", Georgia, serif'
  // naive two-line wrap so a long line never runs off the card
  const words = deadpan.split(' ')
  let l1 = ''
  let l2 = ''
  for (const wd of words) {
    if (!l2 && ctx.measureText(l1 + ' ' + wd).width < W - 220) l1 = (l1 + ' ' + wd).trim()
    else l2 = (l2 + ' ' + wd).trim()
  }
  ctx.fillText(l1, W / 2, hY + 190)
  if (l2) ctx.fillText(l2, W / 2, hY + 244)

  // ── the stat strip — one quiet mono line of proof, shrunk to fit ──
  const bits = []
  bits.push(`${n(members)} souls inside`)
  if (open && pings != null) bits.push(`${n(pings)} secrets in orbit`)
  if (open && matches != null && matches > 0) bits.push(`${n(matches)} found each other`)
  if (!open) bits.push(`${n(left)} to open`)
  const strip = bits.join(' · ')
  let stripSize = 26
  ctx.font = `700 ${stripSize}px "Space Mono", monospace`
  while (stripSize > 18 && ctx.measureText(strip).width + strip.length * 1.5 > W - 140) {
    stripSize -= 1
    ctx.font = `700 ${stripSize}px "Space Mono", monospace`
  }
  drawTracked(ctx, strip, W / 2, 1522, stripSize, 1.5, rgba(TOKENS.star, 0.92))

  // the social contract, spelled out — posting this exposes no one
  ctx.fillStyle = rgba(TOKENS.muted, 0.9)
  ctx.font = '500 27px "Space Grotesk", Arial, sans-serif'
  ctx.fillText('no names. no lists. nothing shows unless it’s mutual.', W / 2, 1578)

  // ── the invite pill — where the link sticker lands ──
  const bpW = 500
  const bpH = 108
  const bpX = (W - bpW) / 2
  const bpY = 1648
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

  // ── the footer — the invite link, the metadata register ──
  ctx.textAlign = 'center'
  ctx.fillStyle = rgba(TOKENS.cream, 0.6)
  ctx.font = '400 30px "Space Mono", monospace'
  ctx.fillText(`${site}/c/${slug}`, W / 2, H - 90)

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

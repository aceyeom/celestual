// beta/samples.js — three frames, so the sky is not empty on arrival.
//
// The plan's §2 makes a claim the design lives or dies on: that what people
// actually put in the photo slot is a ceiling, a dashboard, a window at night,
// a stairwell — and that those images composite into ONE work rather than a
// collage of strangers' vacations. You cannot evaluate that claim against an
// empty sky, and you cannot evaluate it against one card either. It needs three
// at once, taken by three different people, in three different rooms.
//
// So these are drawn rather than shipped: abstract low-light frames in the
// shape of the real thing (a lamp on a ceiling, a streetlight through a window,
// a dashboard at 3am), pushed through the SAME treatment in photo.js that a
// real photograph gets. They are honest about being generated — nobody is being
// shown a stock photo and told it came from a user — and they exist for exactly
// one reason: to let you look at four of these discs together and decide
// whether the thesis holds.
import { measureTone } from './photo.js'

const S = 1024

const rnd = (seed) => {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// grain, so a generated frame has the noise floor a real low-light photo has
function noise(ctx, amount, seed) {
  const r = rnd(seed)
  const img = ctx.getImageData(0, 0, S, S)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

const FRAMES = [
  // a ceiling, with the lamp off to one side
  (ctx) => {
    ctx.fillStyle = '#12101A'
    ctx.fillRect(0, 0, S, S)
    const g = ctx.createRadialGradient(S * 0.66, S * 0.3, 0, S * 0.66, S * 0.3, S * 0.72)
    g.addColorStop(0, 'rgba(255,214,168,0.85)')
    g.addColorStop(0.18, 'rgba(214,166,124,0.34)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    // the shallow diagonal where two planes of the ceiling meet
    ctx.strokeStyle = 'rgba(255,236,214,0.09)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, S * 0.72)
    ctx.lineTo(S, S * 0.44)
    ctx.stroke()
  },
  // a window, streetlight through it, the frame in silhouette
  (ctx) => {
    ctx.fillStyle = '#0C0B14'
    ctx.fillRect(0, 0, S, S)
    const g = ctx.createRadialGradient(S * 0.38, S * 0.56, 0, S * 0.38, S * 0.56, S * 0.5)
    g.addColorStop(0, 'rgba(196,214,255,0.6)')
    g.addColorStop(0.3, 'rgba(140,158,206,0.22)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = 'rgba(6,5,12,0.86)'
    ctx.fillRect(S * 0.46, 0, S * 0.05, S)
    ctx.fillRect(0, S * 0.2, S, S * 0.045)
  },
  // a dashboard, the road ahead
  (ctx) => {
    ctx.fillStyle = '#0A0910'
    ctx.fillRect(0, 0, S, S)
    const sky = ctx.createLinearGradient(0, 0, 0, S * 0.6)
    sky.addColorStop(0, 'rgba(58,44,78,0.9)')
    sky.addColorStop(1, 'rgba(14,12,22,1)')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, S, S * 0.6)
    // the dash, and the instruments on it
    ctx.fillStyle = '#08070D'
    ctx.beginPath()
    ctx.moveTo(0, S)
    ctx.lineTo(0, S * 0.66)
    ctx.quadraticCurveTo(S * 0.5, S * 0.56, S, S * 0.66)
    ctx.lineTo(S, S)
    ctx.fill()
    for (let i = 0; i < 3; i++) {
      const g = ctx.createRadialGradient(S * (0.3 + i * 0.2), S * 0.78, 0, S * (0.3 + i * 0.2), S * 0.78, S * 0.09)
      g.addColorStop(0, 'rgba(255,168,110,0.7)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    }
    // oncoming headlights, far off
    const h = ctx.createRadialGradient(S * 0.72, S * 0.52, 0, S * 0.72, S * 0.52, S * 0.2)
    h.addColorStop(0, 'rgba(255,244,226,0.8)')
    h.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = h
    ctx.fillRect(0, 0, S, S)
  },
]

// The same treatment photo.js gives a real photograph, so a generated frame and
// a taken one sit in the sky as the same kind of object.
function treat(ctx) {
  ctx.filter = 'saturate(0.84) contrast(1.05) brightness(0.9)'
  ctx.drawImage(ctx.canvas, 0, 0)
  ctx.filter = 'none'
  ctx.globalCompositeOperation = 'multiply'
  const warm = ctx.createLinearGradient(0, 0, 0, S)
  warm.addColorStop(0, 'rgba(255,214,186,1)')
  warm.addColorStop(1, 'rgba(196,178,214,1)')
  ctx.fillStyle = warm
  ctx.globalAlpha = 0.16
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = 'rgba(38,26,54,1)'
  ctx.globalAlpha = 0.2
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

export async function sampleFrame(i) {
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')
  FRAMES[i % FRAMES.length](ctx)
  noise(ctx, 20, 1337 + i * 977)
  treat(ctx)
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.86))
  // measured, not declared, and by the same function a real photograph goes
  // through — a generated frame that got to hand-pick its own colour would be
  // proving nothing
  return { blob, tone: measureTone(ctx) }
}

// Three cards, in the register the composer's seeds teach.
export const SAMPLES = [
  { handle: 'wrenmiles', words: 'you always took the window seat' },
  { handle: 'juno.k', words: 'you hated that song and sang it anyway' },
  { handle: 'theo_park', words: 'we said we would be roommates' },
]

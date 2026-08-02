// beta/photo.js — a photograph becomes a surface.
//
// Two jobs, and the second one is the design.
//
// 1 · STRIP IT. A photo carries GPS, a capture timestamp, a device serial and
//     an orientation flag, and a reveal that leaked any of those would be a
//     location leak at the most open moment a person has on this product. Every
//     image is decoded and RE-ENCODED through a canvas here, which drops every
//     EXIF block for free — there is no path in this file by which the original
//     bytes survive. It happens before anything is stored, and in this prototype
//     nothing is uploaded at all: the blob never leaves the browser.
//
// 2 · MAKE IT ONE WORK. Cards are a fixed layout — same type, same margins,
//     same grain, every card (the plan, §3.4). The user chooses the content and
//     never the design. So the surface treatment is applied HERE, once, to
//     everything: square-cropped from the center, resampled to one size,
//     stopped down and desaturated a little, and warmed toward the night the
//     rest of the product is lit by. A dorm ceiling and a windshield at 3am
//     should look like two exposures from one instrument, because that is what
//     the sky is made of.
//
// The camera is opened with `capture` on a file input rather than getUserMedia,
// deliberately: the site's Permissions-Policy disables the camera API outright,
// and the native capture sheet is both unaffected by that header and the better
// interaction on a phone — no permission dialog, no live preview to hold steady.

// One size for every surface. Large enough that the disc is sharp on a 3x
// phone at full resolve, small enough that a handful of them sit in IndexedDB
// without thought.
const SIZE = 1024

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Decode a File into something drawable, honoring the orientation EXIF says the
// sensor was at. createImageBitmap does this natively and off the main thread;
// the <img> path is the fallback, where the browser has already applied
// orientation by the time it paints.
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to the img decoder */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    // the bitmap is already resident; the handle is not needed past here
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

// ── the surface treatment ────────────────────────────────────────────────────
// Restrained on purpose. This is not a filter in the Instagram sense — the
// point is not to make a photo prettier, it is to make forty photos taken by
// forty strangers read as one field. So: a small stop down, a small pull of
// saturation, and a warm low-light cast at an alpha you would struggle to name
// if you saw one card alone and could not miss if you saw the sky.
function treat(ctx, w, h) {
  // the stop down and the desaturation, done on the pixels rather than as a CSS
  // filter, so the stored blob IS the treated surface and every consumer of it
  // (the disc, the story render, a future server) gets the same image
  ctx.filter = 'saturate(0.84) contrast(1.05) brightness(0.9)'
  ctx.drawImage(ctx.canvas, 0, 0)
  ctx.filter = 'none'

  // the night the product is lit by, laid over the top
  ctx.globalCompositeOperation = 'multiply'
  const warm = ctx.createLinearGradient(0, 0, 0, h)
  warm.addColorStop(0, 'rgba(255,214,186,1)')
  warm.addColorStop(1, 'rgba(196,178,214,1)')
  ctx.fillStyle = warm
  ctx.globalAlpha = 0.16
  ctx.fillRect(0, 0, w, h)

  // lift the shadows back out of black so the disc never has a dead hole in it
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = 'rgba(38,26,54,1)'
  ctx.globalAlpha = 0.2
  ctx.fillRect(0, 0, w, h)

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

// File → { blob, width, height }. Square, centered, treated, stripped.
export async function prepare(file) {
  if (!file) return null
  const src = await decode(file)
  const sw = src.width || src.naturalWidth
  const sh = src.height || src.naturalHeight
  if (!sw || !sh) return null

  // The card is a circle, so the crop is a square taken from the center. A
  // center crop is the only honest default here: the composer has no cropping
  // UI, because a cropping UI is a design decision handed to the user, and the
  // user never chooses the design.
  const side = Math.min(sw, sh)
  const sx = (sw - side) / 2
  const sy = (sh - side) / 2

  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, sx, sy, side, side, 0, 0, SIZE, SIZE)
  treat(ctx, SIZE, SIZE)
  if (src.close) src.close()

  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.86))
  if (!blob) return null
  return { blob, width: SIZE, height: SIZE, tone: measureTone(ctx) }
}

// The one number the disc needs back from the image: how warm it is, 0..1,
// which is the only thing that decides what light a card burns with. The
// product has exactly two accents and this walks between them, so a warm frame
// (a lamp, a dashboard) lands near amber and a cool one (a window, a screen, a
// streetlight) near rose. Nobody is asked, and no third hue can enter.
//
// It is measured on the LIT part of the frame, weighted by luminance, and that
// detail is the whole difference between this working and not. A flat average
// over a night photograph is an average of mostly darkness: a dorm ceiling with
// a warm lamp in the corner and a window with a cold streetlight through it
// both come back at almost exactly neutral, every card lands on the same dusty
// midpoint, and the idea quietly stops meaning anything. What a person reads as
// the colour of a room is the colour of whatever is lighting it, so the
// brightest pixels are the ones that get to vote.
export function measureTone(ctx) {
  try {
    const d = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data
    let num = 0
    let den = 0
    // every 97th pixel: a prime stride, so a repeating pattern in the image
    // cannot alias into the average
    for (let i = 0; i < d.length; i += 4 * 97) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      // squared luminance: the light source dominates, the shadows barely count
      const w = ((r * 0.3 + g * 0.59 + b * 0.11) / 255) ** 2
      num += w * (r - b)
      den += w
    }
    if (den < 1e-6) return 0.75
    return clamp(num / den / 26 + 0.6, 0, 1)
  } catch {
    return 0.75
  }
}

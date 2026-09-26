// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN: a letter, as a phone left on in a dark room                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every letter on the wall is drawn by this file, at three sizes:
//
//   Screen   the letter, read. The status across the top (the aerial, the
//            day it went up by the battery, or on a draft the characters
//            left, then the pen, "dear" and the name, and the handle), the
//            words, and the three soft keys at the foot. Opened, it is the
//            only lit thing in the room
//   Tile     the same screen, small, standing for a name on the wall: the
//            status row, the name's monogram or their picture, and the
//            keys' two dashes
//   Mini     the panel's thumbnail of a colour
//
// and `PixelPic`, the picture of a person the way those screens drew one:
// cut to a few dozen pixels a side and dithered into the screen's own ink,
// or, on the wall's small screens, drawn in the screen's two tones with some
// of the photograph's own colour left in. There is no round face anywhere on
// the wall; a person is a picture on a screen.
//
// Every size inside a screen is in `cqw` of its own width, so one layout
// draws at 470 pixels and at 60 without a second one. What the colour does
// is looks.js `skinOf`; what makes this screen this one and no other is
// looks.js `quirks`, off the letter's id.

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { colourOf, skinVars, skinOf, quirks, printFilter, glyphPath, hexRgb, rgbTile, onRgbTile, RGB_CELLS, PRESS } from './looks.js'
import { Caret } from './caret.jsx'
import { Sticker } from './Sticker.jsx'
import { langOf } from './type.js'
import './screen.css'

// ── the glyphs ──────────────────────────────────────────────────────────────
// On the letter each is an SVG on the screen's own pixel grid, sized in the
// screen's `cqw`, so a glyph is always a whole number of the screen's pixels
// and never a blurred icon.
export function Pix({ name, h = 7, className = '', style }) {
  const g = useMemo(() => glyphPath(name), [name])
  return (
    <svg
      className={`wl-px ${className}`} viewBox={`0 0 ${g.w} ${g.h}`} shapeRendering="crispEdges"
      style={{ height: `${h}cqw`, width: `${((h * g.w) / g.h).toFixed(2)}cqw`, ...style }}
      aria-hidden="true" focusable="false"
    >
      <path d={g.d} />
    </svg>
  )
}

// ── the same glyphs, as the chrome's ──
// The wall's own controls are drawn on the phone's grid too (DESIGN.md 2.6),
// so the glyphs above stand in the page's pixels as well as in a screen's:
// sized in px rather than `cqw`, struck in `currentColor`, and `scale` of
// the page's pixels to each of the glyph's, so a glyph is always a whole
// number of them and never a blurred icon. `Wait` is the hourglass the
// phone turned while it was busy, blinking on the screen's own beat.
export function PixIcon({ name, scale = 2, className = '', style }) {
  const g = useMemo(() => glyphPath(name), [name])
  return (
    <svg
      className={`wl-pxi ${className}`} viewBox={`0 0 ${g.w} ${g.h}`} width={g.w * scale} height={g.h * scale}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false" style={style}
    >
      <path d={g.d} />
    </svg>
  )
}
export function Wait({ scale = 2, className = '' }) {
  return <PixIcon name="wait" scale={scale} className={`wl-wait ${className}`} />
}

// The tiles' glyphs are images, struck once for the page in each colour a
// small screen is lit in: a wall of two hundred small screens is two hundred
// references to a few dozen images, not two hundred inline drawings. They
// were masks over the screen's own colour, and every mask is a layer of its
// own in the compositor's bookkeeping, redone on every frame the wall moves:
// four to a screen, on a field of a hundred moving screens, was a fifth of
// every frame. The screen's lit colours are all plain hexes (looks.js
// `skinOf`), so the colour goes into the image.
const GLYPHS = new Set()
let glyphSheet = null
function glyph(k, fill) {
  const c = String(fill || '#000')
  const cls = `wl-g-${k}-${c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`
  if (GLYPHS.has(cls) || typeof document === 'undefined') return cls
  GLYPHS.add(cls)
  if (!glyphSheet) {
    const el = document.createElement('style')
    el.dataset.glyphs = ''
    document.head.appendChild(el)
    glyphSheet = el.sheet
  }
  const g = glyphPath(k)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" shape-rendering="crispEdges"><path fill="${c}" d="${g.d}"/></svg>`
  glyphSheet.insertRule(`.${cls}{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}");aspect-ratio:${g.w}/${g.h}}`, glyphSheet.cssRules.length)
  return cls
}

// ── the picture ─────────────────────────────────────────────────────────────
// A profile picture, as a screen of that era would have shown it: cut
// square round the face, brought down to a few dozen pixels, pulled to its
// own contrast and sharpened, and dithered in four tones of the screen's ink
// with Atkinson's error diffusion, which is the dither the first bitmap
// screens were drawn with. On a screen the tones are alpha over the panel,
// so the same picture is green on a green screen. On a print they are the
// print's own inks, opaque, so the press strikes each tone as one ink, and
// a copy has two, since the copier has only toner or none.
//
// Read with CORS, which the avatar bucket serves. If a picture will not
// come with CORS it still comes: drawn into the same few pixels without
// reading them back, and pulled grey by the stylesheet instead of by the
// dither. Either way a failure is the monogram under it, which was always
// the designed state.
const DITHERED = new Map() // `${src}|${cells}|${inv}|${levels}` -> Uint8ClampedArray of tones, or 'taint'
const IMAGES = new Map()   // src -> Promise<{ img, cors }>
const LOADED = new Map()   // src -> the image, once it has come

// How many steps of ink a lit screen's picture is struck in: seven tones,
// so a face reads as a face and not as a scatter of dots. A print keeps its
// own inks (looks.js `pic`), and a copy the toner's four greys.
export const PIC_LEVELS = 6

export function loadImage(src) {
  if (IMAGES.has(src)) return IMAGES.get(src)
  const p = new Promise((done) => {
    const withCors = new Image()
    withCors.crossOrigin = 'anonymous'
    withCors.decoding = 'async'
    withCors.onload = () => { LOADED.set(src, withCors); done({ img: withCors, cors: true }) }
    withCors.onerror = () => {
      const plain = new Image()
      plain.decoding = 'async'
      plain.onload = () => { LOADED.set(src, plain); done({ img: plain, cors: false }) }
      plain.onerror = () => done(null)
      plain.src = src
    }
    withCors.src = src
  })
  IMAGES.set(src, p)
  return p
}

// the crop: square, a little in from the edges and a touch above centre,
// where the face in a profile picture is. A profile picture is shown as a
// circle where it was taken, so its corners were never meant to be looked
// at; losing them buys the face a fifth more of the screen's pixels.
const CROP_ZOOM = 1.2
const CROP_Y = 0.4

// The picture cut square and brought down to `cells` a side by halving, so
// every screen pixel is the average of the photo under it rather than one
// sample of it, in every browser. A canvas, so a picture that will not come
// with CORS can still be drawn from it (only reading it back is refused).
function shrink(img, cells) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return null
  const side = Math.min(iw, ih) / CROP_ZOOM
  const sx = Math.min(iw - side, Math.max(0, iw / 2 - side / 2))
  const sy = Math.min(ih - side, Math.max(0, ih * CROP_Y - side / 2))
  let s = cells
  while (s * 2 <= side && s < cells * 8) s *= 2
  let from = null
  for (; ; s /= 2) {
    const cv = document.createElement('canvas')
    cv.width = s
    cv.height = s
    const g = cv.getContext('2d', { willReadFrequently: true })
    if (!g) return null
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    if (from) {
      g.drawImage(from, 0, 0, s, s)
    } else {
      // a transparent picture is on white, so what it leaves out is unlit
      g.fillStyle = '#fff'
      g.fillRect(0, 0, s, s)
      g.drawImage(img, sx, sy, side, side, 0, 0, s, s)
    }
    if (s <= cells) return cv
    from = cv
  }
}

// the fallback's drawing: the same crop and the same pixels, unread
function drawCover(g, img, w, h) {
  const cv = shrink(img, w)
  if (cv) g.drawImage(cv, 0, 0, w, h)
}

// a box blur of radius r, across then down, clamped at the edges
function blurBox(src, n, r) {
  const a = new Float32Array(src.length)
  const b = new Float32Array(src.length)
  const k = 1 / (2 * r + 1)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let t = 0
      for (let d = -r; d <= r; d++) t += src[y * n + Math.min(n - 1, Math.max(0, x + d))]
      a[y * n + x] = t * k
    }
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let t = 0
      for (let d = -r; d <= r; d++) t += a[Math.min(n - 1, Math.max(0, y + d)) * n + x]
      b[y * n + x] = t * k
    }
  }
  return b
}

const ATKINSON = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]

// The picture's own light, cell by cell, in 0..1: the crop brought down to
// `cells` a side, stretched to its own levels, pulled off its background and
// sharpened. The dither and the tint (below) both start from it; `raw` is
// the light before any of that, and `data` the crop's colour, for the tint.
function toneOf(img, cells) {
  const cv = shrink(img, cells)
  if (!cv) return null
  // throws on a picture that came without CORS, which is the fallback
  const { data } = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cells, cells)
  const n = cells * cells
  const raw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    raw[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255
  }
  let lum = Float32Array.from(raw)
  // its own levels: the darkest and lightest two percent set the ends, so a
  // grey picture uses the whole ramp
  const sorted = Float32Array.from(lum).sort()
  const lo = sorted[Math.floor(n * 0.02)]
  const hi = sorted[Math.min(n - 1, Math.floor(n * 0.98))]
  const span = Math.max(0.08, hi - lo)
  for (let i = 0; i < n; i++) lum[i] = Math.min(1, Math.max(0, (lum[i] - lo) / span))
  // a face against a wall of about its own grey is pulled off it: each
  // pixel pushed from the average of the eighth of the picture round it,
  // then from its eight neighbours, which is what keeps an eye an eye at
  // a few pixels a side
  const wide = blurBox(blurBox(lum, cells, Math.max(1, Math.round(cells / 8))), cells, Math.max(1, Math.round(cells / 8)))
  for (let i = 0; i < n; i++) lum[i] += 0.35 * (lum[i] - wide[i])
  const near = blurBox(lum, cells, 1)
  const sharp = new Float32Array(n)
  for (let i = 0; i < n; i++) sharp[i] = Math.min(1, Math.max(0, lum[i] + 0.5 * (lum[i] - near[i])))
  lum = sharp
  return { lum, raw, data }
}

export function dither(img, cells, inv, levels = PIC_LEVELS) {
  const t = toneOf(img, cells)
  if (!t) return null
  const { lum } = t
  const n = cells * cells
  // ink is shadow: how much of the screen's ink each cell wants, in 0..1
  const want = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = lum[i] ** 0.92
    want[i] = inv ? v : 1 - v
  }
  const LEVELS = levels // levels + 1 tones: seven on a lit screen, four on a print, two on a copy
  const out = new Uint8ClampedArray(n)
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const i = y * cells + x
      const v = Math.min(1, Math.max(0, want[i]))
      // paper stays paper: no ink and no carried error, so a bright sky
      // does not grow a row of stray dots
      if (v < 0.1) { out[i] = 0; continue }
      const q = Math.round(v * LEVELS) / LEVELS
      out[i] = Math.round(q * 255)
      const e = (v - q) / 8
      for (const [dx, dy] of ATKINSON) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < cells && yy < cells) want[yy * cells + xx] += e
      }
    }
  }
  return out
}

// ── and in colour ──
// A lit screen's small picture on the wall keeps some of the photograph's
// own colour, so a face reads from across the field and not only as a shape
// in the screen's one ink. Each cell is the screen's own drawing of it (the
// panel where the picture is light, the ink where it is dark, by the light
// the dither reads) with `amount` of the photograph's colour mixed back over
// it, moved to that same light. Every cell whole, in RGBA.
export function tint(img, cells, { inv = false, ink = '#131313', panel = '#FFFFFF', amount = 0.5 } = {}) {
  const t = toneOf(img, cells)
  if (!t) return null
  const { lum, raw, data } = t
  const I = hexRgb(ink)
  const P = hexRgb(panel)
  const n = cells * cells
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const v = lum[i] ** 0.92
    const w = inv ? v : 1 - v
    const d = (lum[i] - raw[i]) * 255
    for (let c = 0; c < 3; c++) {
      const screen = P[c] + (I[c] - P[c]) * w
      out[i * 4 + c] = screen + (data[i * 4 + c] + d - screen) * amount
    }
    out[i * 4 + 3] = 255
  }
  return out
}

// `amount` over nothing is the dither; over something, the tint, with the
// screen's `ink` and `panel` under it
function usePicture(src, cells, inv, levels = PIC_LEVELS, amount = 0, ink = '', panel = '') {
  const key = `${src}|${cells}|${inv ? 1 : 0}|${levels}${amount ? `|${amount}|${ink}|${panel}` : ''}`
  const [got, setGot] = useState(() => (src && DITHERED.has(key) ? DITHERED.get(key) : null))
  const [img, setImg] = useState(() => (src && LOADED.get(src)) || null)
  useEffect(() => {
    if (!src || typeof document === 'undefined') { setGot(null); setImg(null); return undefined }
    if (DITHERED.has(key)) { setGot(DITHERED.get(key)); setImg(LOADED.get(src) || null); return undefined }
    let live = true
    loadImage(src).then((r) => {
      if (!live) return
      if (!r) { setGot(null); return }
      let out = 'taint'
      if (r.cors) {
        try {
          out = (amount ? tint(r.img, cells, { inv, ink, panel, amount }) : dither(r.img, cells, inv, levels)) || 'taint'
        } catch { out = 'taint' }
      }
      DITHERED.set(key, out)
      setImg(r.img)
      setGot(out)
    })
    return () => { live = false }
  }, [src, key, cells, inv, levels, amount, ink, panel])
  return { got, img }
}

// The tones struck into a canvas: a print's in its own inks, opaque, so the
// press prints each tone as one ink, a screen's as alpha in its ink over the
// panel, and a tint as it is. A picture that came without CORS is drawn as
// it is too.
function strike(g, got, img, cells, ink, tones) {
  g.clearRect(0, 0, cells, cells)
  if (got === 'taint') {
    if (img) drawCover(g, img, cells, cells)
  } else if (got.length === cells * cells * 4) {
    g.putImageData(new ImageData(got, cells, cells), 0, 0)
  } else if (tones) {
    const rgb = tones.map(hexRgb)
    const top = tones.length - 1
    const px = g.createImageData(cells, cells)
    for (let i = 0; i < got.length; i++) {
      const t = rgb[Math.round((got[i] / 255) * top)]
      px.data[i * 4] = t[0]
      px.data[i * 4 + 1] = t[1]
      px.data[i * 4 + 2] = t[2]
      px.data[i * 4 + 3] = 255
    }
    g.putImageData(px, 0, 0)
  } else {
    const [r, gg, b] = hexRgb(ink)
    const px = g.createImageData(cells, cells)
    for (let i = 0; i < got.length; i++) {
      px.data[i * 4] = r
      px.data[i * 4 + 1] = gg
      px.data[i * 4 + 2] = b
      px.data[i * 4 + 3] = got[i]
    }
    g.putImageData(px, 0, 0)
  }
}

// ── the picture, still ──
// The small screens on the wall draw the same picture as an image and not
// as a canvas. A canvas is a compositor layer of its own, and every small
// screen with a face on it was cut round that layer into three, on a field
// of a hundred moving screens; an image is painted into the screen's own
// layer. One PNG per picture, colour and size, struck once for the page,
// so the same face on forty screens is forty references to one file. A
// picture that came without CORS cannot be read back into a file and stays
// a canvas.
const STILLS = new Map()   // `${picture}|${ink}|${tones}` -> a PNG data URL, or ''
const DECODED = new Set()  // the ones this page has decoded once

function stillOf(id, got, cells, ink, tones) {
  const k = `${id}|${ink}|${tones ? tones.join(',') : ''}`
  if (STILLS.has(k)) return STILLS.get(k)
  let url = ''
  const cv = document.createElement('canvas')
  cv.width = cells
  cv.height = cells
  const g = cv.getContext('2d')
  if (g) {
    strike(g, got, null, cells, ink, tones)
    try { url = cv.toDataURL('image/png') } catch { url = '' }
  }
  STILLS.set(k, url)
  return url
}

// `ink` is the colour the dither is struck in, a hex; the stylesheet puts the
// panel under it. `tones`, on a print, is its inks from paper to darkest, one
// per tone, and `levels` is one less than how many tones there are. `colour`,
// on a lit screen, is how much of the photograph's own colour is left in it
// (`tint`), drawn whole over `panel`, the screen's lit colour. `onReady`
// tells a caller the picture has landed, so a monogram under it can step
// aside. `still` draws it as an image (above), and only once it is decoded,
// so the monogram steps aside for a picture that is there.
export function PixelPic({ src, cells = 28, ink = '#131313', inv = false, levels = PIC_LEVELS, tones = null, colour = 0, panel = '', still = false, className = '', onReady }) {
  // a print is struck in its own inks, and never tinted
  const amount = tones ? 0 : colour
  const { got, img } = usePicture(src, cells, inv, levels, amount, ink, panel)
  const ref = useRef(null)
  const ready = useRef(onReady)
  ready.current = onReady
  const url = useMemo(() => (
    still && got && got !== 'taint' && typeof document !== 'undefined'
      ? stillOf(`${src}|${cells}|${inv ? 1 : 0}|${levels}|${amount}|${panel}`, got, cells, ink, tones)
      : ''
  ), [still, got, src, cells, inv, levels, amount, panel, ink, tones])
  const [seen, setSeen] = useState('')
  const decoded = !!url && (seen === url || DECODED.has(url))
  useEffect(() => {
    if (!url || DECODED.has(url)) return undefined
    let live = true
    const im = new Image()
    im.src = url
    const done = () => { DECODED.add(url); if (live) setSeen(url) }
    if (im.decode) im.decode().then(done, done)
    else im.onload = done
    return () => { live = false }
  }, [url])
  useLayoutEffect(() => {
    if (url) {
      if (decoded && ready.current) ready.current(true)
      return
    }
    const cv = ref.current
    if (!cv || !got) return
    const g = cv.getContext('2d')
    if (!g) return
    strike(g, got, img, cells, ink, tones)
    if (ready.current) ready.current(true)
  }, [url, decoded, got, img, ink, cells, tones])
  if (!src || !got) return null
  if (url) {
    return decoded ? (
      <img
        src={url} width={cells} height={cells} alt="" aria-hidden="true" draggable={false}
        className={`wl-pic ${className}`}
      />
    ) : null
  }
  return (
    <canvas
      ref={ref} width={cells} height={cells} aria-hidden="true"
      className={`wl-pic${got === 'taint' ? ' is-plain' : ''} ${className}`}
    />
  )
}

// ── the press ───────────────────────────────────────────────────────────────
// The filter a print is pulled through, one per screen, since the grain and
// the drum's slip are the letter's own.
function Press({ id, colour, q }) {
  const markup = useMemo(() => printFilter(colour, q), [colour, q])
  if (!markup) return null
  return (
    <svg className="wl-press" width="0" height="0" aria-hidden="true" focusable="false">
      <filter
        id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </svg>
  )
}

// ── the screen ──────────────────────────────────────────────────────────────
// `top` is what the status rows say: the aerial across the first, a `date`
// beside it where one is given, and by the `bat` either a draft's `counter`,
// the characters it has left, or a letter's `stamp`, the day it went up. The
// counter is the phone's own arithmetic and a screen reader is spared it; the
// stamp is a fact about the letter, and is read. Under them the `name` and
// the `handle`, with
// the pen before the name (`icon: 'pen'`), or the lock on a sealed letter
// (`icon: 'lock'`). `dear` opens the name as a letter opens, "dear Sofia",
// for the screens that are a letter to somebody and not a menu. `pos`
// stands where the handle does, a menu's '1/3', hidden from a screen
// reader, which hears the chosen row itself.
// `keys` is the three soft keys, `l`, `c` and `r`, each
// `{ label, onClick, aria }` or nothing; `keepFocus` leaves the focus where
// it was when the key is pressed with a pointer. The body is the children.
//
// `salutation` is the whole of that line when the writer set one of their
// own ("to the girl on the 51B"), and with none it is "dear" and the name
// as before. `greet` is the same line on the composer, where it is the
// writer's to edit: `{ value, onChange, max, label, inputRef, onFocus }`,
// set in the line's own face, size and colour. `tag` stands where the
// handle does, for a name note carrying a school.
//
// `sticker` is a school (schools.js `schoolOf`), for a letter posted from a
// verified school address: its sticker is stuck on the phone's corner
// (Sticker.jsx), and nothing is drawn there without one.
//
// `live` off draws the keys without letting them be pressed or tabbed to:
// the neighbours on the letter's strip are pictures of the next letter, not
// a second set of controls. `nameId` lands on the name in the top row, so a
// sheet can be labelled by who the letter is for.
export function Screen({
  look, seed = '', top = {}, keys = {}, live = true, state = '', className = '', style, children,
  nameId, sticker = null,
}) {
  const colour = colourOf(look, seed)
  const q = quirks(seed)
  const s = skinOf(colour)
  const raw = useId()
  const fid = `wl-press-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
  // a print is pulled through the press where it runs, and painted in its
  // inks where it does not (looks.js `PRESS`)
  const press = !!s.print && PRESS
  const inked = !!s.print && !PRESS
  const vars = { ...skinVars(colour, inked), ...q.vars }
  // this phone's own pixels, up close (looks.js `rgbTile`), when they are
  // made; a print and the square are paper, and have none
  const rgb = useRgbTile(s.paper ? '' : seed)
  const { name = '', dear = false, date = '', counter = '', stamp = '', icon = '', handle = '', pos = '', bat = 4, salutation = '', greet = null, tag = '' } = top
  const said = salutation || (dear && name ? `dear ${name}` : name)
  // a line the writer set is set smaller when it is long (`lineSize`); the
  // name the screen makes itself keeps its size and its cut, as it always did
  const nmStyle = greet ? lineSize(greet.value || greet.placeholder || '') : salutation ? lineSize(salutation) : undefined
  const key = (k, cls) => {
    const d = keys[k]
    if (!d || (!d.label && !d.glyph)) return <span className={`wl-sk ${cls} is-empty`} aria-hidden="true" />
    return (
      <button
        type="button" className={`wl-sk ${cls}${d.on ? ' is-on' : ''}`}
        onClick={live ? d.onClick : undefined} disabled={live ? d.disabled : undefined}
        onMouseDown={live && d.keepFocus ? (e) => e.preventDefault() : undefined}
        aria-label={d.aria || undefined} aria-pressed={d.pressed}
        tabIndex={live ? undefined : -1}
      >
        {d.glyph ? <Pix name={d.glyph} h={6.8} className="wl-lit-g" /> : null}
        {d.label ? <span className="wl-lit">{d.label}</span> : null}
      </button>
    )
  }
  return (
    <div
      className={`wl-scene ${className}`} data-kind={s.kind} data-colour={colour.slug}
      style={{ ...vars, ...style }}
    >
      <span className="wl-scene-halo" aria-hidden="true" />
      <span className="wl-scene-halo-2" aria-hidden="true" />
      {press ? <Press id={fid} colour={colour} q={q} /> : null}
      {/* the press is on this wrapper, which has no transform (screen.css
          `.wl-scr-press`), and a print is uncovered here. Always drawn, so a
          screen turned from lit to print keeps the field in it */}
      <div
        className={`wl-scr-press${s.paper && state ? ` is-${state}` : ''}`}
        style={press ? { filter: `url(#${fid})` } : undefined}
      >
        <div
          className={`wl-scr${state ? ` is-${state}` : ''}`} data-kind={s.kind}
          data-lid={s.kind === 'xerox' ? q.lid : undefined} data-light={s.light || undefined}
          data-inked={inked ? '' : undefined}
          role="group" aria-labelledby={nameId}
        >
          <div className="wl-scr-bg" aria-hidden="true" />
          <div className="wl-scr-top">
            <div className="wl-scr-r1">
              <span className="wl-scr-ant wl-lit-g" aria-hidden="true">
                <Pix name="ant" h={9} />
              </span>
              {date ? <span className="wl-scr-dt wl-lit">{date}</span> : null}
              {stamp
                ? <span className="wl-scr-cnt wl-scr-stamp wl-lit">{stamp}</span>
                : counter ? <span className="wl-scr-cnt wl-lit" aria-hidden="true">{counter}</span> : null}
              <span className={`wl-scr-bat wl-lit-g${bat ? '' : ' is-low'}`} aria-hidden="true">
                <Pix name={`bata${bat}`} h={8} />
              </span>
            </div>
            {/* the line's language, for its face (type.js `langOf`): the
                greeting its writer chose where there is one, else the name */}
            <div className="wl-scr-r2" lang={langOf(greet ? `${greet.value || ''}${name}` : said) || undefined}>
              {icon ? <Pix name={icon} h={icon === 'pen' ? 8.6 : 7} className="wl-lit-g" /> : null}
              {greet ? <Greet {...greet} id={nameId} style={nmStyle} /> : <span className="wl-scr-nm wl-lit" id={nameId} style={nmStyle}>{said}</span>}
              <span className="wl-scr-hd wl-lit" aria-hidden={pos ? 'true' : undefined}>{pos || handle || tag}</span>
            </div>
          </div>
          <div className="wl-scr-body">{children}</div>
          <div className="wl-scr-bot">
            {key('l', 'is-l')}
            {key('c', 'is-c')}
            {key('r', 'is-r')}
          </div>
          <span className="wl-scr-fx is-light" aria-hidden="true" />
          <span className="wl-scr-fx is-grid" aria-hidden="true" />
          {rgb.url ? <RgbLayer url={rgb.url} late={rgb.late} /> : null}
          <span className="wl-scr-fx is-moire" aria-hidden="true" />
          <span className="wl-scr-fx is-streak" aria-hidden="true" />
          <span className="wl-scr-fx is-glass" aria-hidden="true" />
          <span className="wl-scr-fx is-glare" aria-hidden="true" />
          <span className="wl-scr-fx is-shine" aria-hidden="true" />
        </div>
      </div>
      {sticker ? <Sticker school={sticker} seed={seed} className="wl-scr-sticker" /> : null}
    </div>
  )
}

// ── a long line, set smaller ────────────────────────────────────────────────
// A greeting the writer set can run to forty characters, and the line holds
// seventy per cent of the row (screen.css), about seventeen characters of the
// face at its own size, a third of an em and a little more each. So a longer
// line is set smaller, down to half the row's size, before anything is cut;
// the shared picture does the same with the canvas's own measure (share.js).
function lineSize(text) {
  const n = [...String(text || '')].length
  const fits = 64 / (0.36 * Math.max(1, n))
  return fits < 11 ? { fontSize: `${Math.max(5.6, fits).toFixed(2)}cqw` } : undefined
}

// ── the greeting, being written ─────────────────────────────────────────────
// The composer's "dear Sofia", as a field in the line's own place: the same
// face, size, colour and bloom, sized to what is in it (the value is mirrored
// into the box it stands in, post.css `.wl-scr-greet`), so the handle beside
// it stays where it was. The screen's own caret, in the line's colour, while
// it is being typed in.
function Greet({ value, onChange, max = 40, label = 'the greeting', placeholder = '', inputRef = null, onFocus = null, onBlur = null, id, style }) {
  const ref = useRef(null)
  return (
    <span className="wl-scr-nm wl-scr-greet wl-lit" data-value={value || placeholder || ' '} style={style}>
      <input
        ref={(n) => { ref.current = n; if (inputRef) inputRef.current = n }}
        id={id} type="text" value={value} maxLength={max} aria-label={label} placeholder={placeholder}
        /* its own width is the mirror's, so it asks for none of its own */
        size={1}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        onFocus={onFocus || undefined} onBlur={onBlur || undefined}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
        autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="done"
      />
      <Caret of={ref} screen />
    </span>
  )
}

// ── the pixels, when they come ──
// A lit screen's texture up close (looks.js `rgbTile`) is made while the page
// is idle, so a screen can mount before its own is ready: it draws without
// it and lays it on when it is told, `late`, which brings it up under the
// grain in a few steps rather than in one frame (`RgbLayer`). A tile already
// made is there from the first frame and is not faded.
function useRgbTile(seed) {
  const [got, setGot] = useState(() => ({ seed, url: seed ? rgbTile(seed) : '', late: false }))
  useEffect(() => {
    if (!seed) return undefined
    const now = rgbTile(seed)
    if (now) {
      setGot((g) => (g.seed === seed && g.url === now ? g : { seed, url: now, late: false }))
      return undefined
    }
    return onRgbTile(seed, (url) => setGot({ seed, url, late: true }))
  }, [seed])
  if (!seed) return { url: '', late: false }
  return got.seed === seed ? got : { url: rgbTile(seed), late: false }
}

// The texture's layer. One that comes late is brought up in three steps a
// sixth of a second apart, written straight onto the layer: a CSS animation
// there gave the layer a compositor surface of its own for its length, and
// inside the screen's blur that repainted the whole screen on every frame of
// it, three dozen of them on a slow phone. Three steps are three paints, and
// at this strength a step is not seen as one
function RgbLayer({ url, late }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !late) return undefined
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) return undefined
    const steps = [0.2, 0.4, 0.6]
    el.style.opacity = '0'
    const ids = steps.map((o, i) => setTimeout(() => { el.style.opacity = String(o) }, 150 * (i + 1)))
    return () => ids.forEach(clearTimeout)
  }, [late])
  return (
    <span
      ref={ref} className="wl-scr-fx is-rgb" aria-hidden="true"
      style={{ backgroundImage: `url(${url})`, backgroundSize: `calc(var(--q-pitch, 3px) * ${RGB_CELLS})` }}
    />
  )
}

// ── the light in the room ───────────────────────────────────────────────────
// The one light in the dark is the screen's, and it falls on the room in the
// screen's colour: a wide soft pool behind the letter or the draft, which
// crossfades when the screen is lit in another colour (keyed by the colour
// where it is drawn). It is the room's and not the screen's (screen.css
// `.wl-room-light`), because a glow cut by a clip is a lit rectangle.
export function RoomLight({ look, seed = '' }) {
  const v = skinVars(colourOf(look, seed))
  return <span className="wl-room-light" style={{ '--s-halo': v['--s-halo'] }} aria-hidden="true" />
}

// ── the words ───────────────────────────────────────────────────────────────
// Set as large as the screen will hold them, stepping down a ladder of sizes
// the way the phone's own large, medium and small fonts did. A letter that is
// read (`fill`) is then set as large as it will go between the step that fits
// and the one above, so the panel is never a quarter empty; a draft stays on
// the steps, so typing reflows only at a threshold. Past the smallest size
// the message scrolls, with the phone's own bar down the right to say so, and
// is cut to a whole number of lines, so its foot is never a sliced one.
//
// ── and what that costs ──
// Every step tried is the words laid out again, and a letter used to be
// fitted in about a dozen of them, each forced in the middle of the frame,
// a tenth of a second on a slow phone for every screen a run of swipes
// brought on. So: the fit is made when the ResizeObserver first reports the
// body, which is after the browser has laid the page out and before it
// paints, so reading the body's size costs nothing; a fit is remembered
// (`FITS`) by the body's size and the words, so a screen seen again, or the
// same letter drawn a moment ago as a neighbour, is set in none; and the
// search between two steps halves to a fifth of a unit and then once more,
// a tenth of a unit short of the finest at most, which no line break has
// ever turned on. A face that finishes loading starts the memory over
// (`faceEpoch`), since the words came out another size in it.
const SIZES = [15.4, 13.8, 12.4, 11.2, 10, 9.2, 8.4, 7.6]
const FITS = new Map()
const FIT_KEEP = 96
let faceEpoch = 0
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => { faceEpoch++ })
}
export function useFit(ref, deps, fill = false) {
  const [over, setOver] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    // the box the last fit was made in, so a report of the box as it already
    // is does not fit it again
    const was = { w: -1, h: -1, sh: -1 }
    const put = (f) => {
      el.style.setProperty('--fs', `${f.fs}cqw`)
      el.style.maxHeight = f.mh
      el.style.overflowY = f.o ? 'auto' : 'hidden'
      was.sh = f.sh
      setOver(f.o)
    }
    const fit = () => {
      // the room is the body's, measured without its padding: the message
      // itself may be clamped from the last fit, and is not unclamped mid-fit
      const box = el.parentElement
      if (!box) return
      was.w = box.clientWidth
      was.h = box.clientHeight
      const bs = getComputedStyle(box)
      const room = box.clientHeight - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom)
      const wide = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)
      const words = el.tagName === 'TEXTAREA' ? el.value : el.textContent
      const key = `${fill ? 1 : 0}|${faceEpoch}|${box.clientWidth}|${wide}|${room}|${el.lang}|${words}`
      const hit = FITS.get(key)
      if (hit) {
        FITS.delete(key)
        FITS.set(key, hit)
        put(hit)
        return
      }
      el.style.overflowY = 'hidden'
      let at = 0
      let tall = 0
      const fits = (sz) => { at = sz; el.style.setProperty('--fs', `${sz}cqw`); tall = el.scrollHeight; return tall <= room + 1 }
      // the largest step that fits. Not walked down from the top: the words
      // at the top step say how far over they run, and their height goes
      // about with the square of their size (as many more lines, each one
      // taller), so the walk starts at the step that guess lands on and goes
      // up or down from there, a step or two
      let i = 0
      if (!fits(SIZES[0])) {
        const guess = SIZES[0] * Math.sqrt((room + 1) / Math.max(1, tall)) * 1.04
        i = Math.max(1, SIZES.findIndex((z) => z <= guess))
        if (SIZES[i] > guess) i = SIZES.length - 1
        if (fits(SIZES[i])) {
          while (i > 1 && fits(SIZES[i - 1])) i--
        } else {
          i++
          while (i < SIZES.length && !fits(SIZES[i])) i++
        }
      }
      let fs = SIZES[Math.min(i, SIZES.length - 1)]
      if (fill && i > 0 && i < SIZES.length) {
        let lo = SIZES[i]
        let hi = SIZES[i - 1]
        while (hi - lo > 0.2) {
          const m = (lo + hi) / 2
          if (fits(m)) lo = m
          else hi = m
        }
        // and one step finer, into what is left
        const m = (lo + hi) / 2
        if (fits(m)) lo = m
        fs = lo
      }
      if (at !== fs) fits(fs)
      const sh = el.scrollHeight
      const o = sh > room + 1
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      const f = { fs, o, sh, mh: o && lh > 0 ? `${Math.floor(room / lh + 0.02) * lh}px` : '' }
      FITS.set(key, f)
      if (FITS.size > FIT_KEEP) FITS.delete(FITS.keys().next().value)
      put(f)
    }
    const refit = () => {
      const box = el.parentElement
      if (box && box.clientWidth === was.w && box.clientHeight === was.h) return
      fit()
    }
    let off = false
    // and again once the face has loaded, if the words came out another
    // height in it; only when a face is on its way, since asking the page
    // the words' height when none is would lay it out for nothing
    const after = () => {
      if (!document.fonts || document.fonts.status !== 'loading') return
      document.fonts.ready.then(() => { if (!off && el.scrollHeight !== was.sh) fit() })
    }
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { const first = was.w < 0; refit(); if (first) after() })
      : null
    // the body: once clamped, the message alone would never see it grow. Its
    // first report comes after the page is laid out and before it is painted
    if (ro) ro.observe(el.parentElement || el)
    else { fit(); after() }
    return () => { off = true; if (ro) ro.disconnect() }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return over
}

// the bar is placed on the next frame, so a screen that mounts overflowing
// does not ask for its scroll height in the middle of mounting
function Bar({ of, over }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const el = of.current
    if (!el || !over) return undefined
    const on = () => setT(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight))
    const id = requestAnimationFrame(on)
    el.addEventListener('scroll', on, { passive: true })
    return () => { cancelAnimationFrame(id); el.removeEventListener('scroll', on) }
  }, [of, over])
  if (!over) return null
  return <span className="wl-scr-sb" aria-hidden="true"><i style={{ top: `${(t * 78).toFixed(1)}%` }} /></span>
}

// The message, as the phone showed it: the words, and the cursor after the
// last of them only for a screen still being written (`cursor`).
// `sealed` draws each run of stars as the phone's full pixel star, one per
// hidden letter, on the line (screen.css `.wl-scr-stars`).
export function ScreenText({ text, cursor = false, sealed = false, className = '' }) {
  const ref = useRef(null)
  const over = useFit(ref, [text, sealed], true)
  return (
    <>
      <div className={`wl-scr-msg ${className}`} ref={ref} tabIndex={over ? 0 : -1} lang={sealed ? undefined : langOf(text) || undefined}>
        {sealed
          ? String(text).split(/(\*+)/).map((p, i) => (/^\*+$/.test(p) ? <span key={i} className="wl-scr-stars">{p}</span> : p))
          : text}
        {cursor ? <span className="wl-scr-cur" aria-hidden="true" /> : null}
      </div>
      <Bar of={ref} over={over} />
    </>
  )
}

// The draft, being written: the same words in the same place, in a
// textarea, with the phone's own caret, drawn by caret.jsx in the words'
// ink and two of the face's pixels wide. It autofocuses only where there is
// a fine pointer, because on a phone the keyboard coming up unasked covers
// the screen the person has not looked at yet. `inputRef` is handed the
// textarea too, for a key that edits at the caret.
export function ScreenDraft({ value, onChange, max = 280, placeholder = '', autoFocus = false, label = 'your letter', inputRef = null }) {
  const ref = useRef(null)
  const over = useFit(ref, [value])
  useEffect(() => {
    const el = ref.current
    if (!autoFocus || !el) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine) return
    el.focus({ preventScroll: true })
    const n = el.value.length
    try { el.setSelectionRange(n, n) } catch { /* not a text field */ }
  }, [autoFocus])
  return (
    <>
      <textarea
        ref={(n) => { ref.current = n; if (inputRef) inputRef.current = n }}
        className="wl-scr-msg wl-scr-draft" value={value} placeholder={placeholder}
        maxLength={max} rows={1} spellCheck="true" aria-label={label} lang={langOf(value) || undefined}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
      />
      <Caret of={ref} screen />
      <Bar of={ref} over={over} />
    </>
  )
}

// A menu, drawn the way the phone drew one: a list with the chosen row
// inverted. Up and down move, enter picks, and a tap picks the row it lands
// on. The caller puts `select` and `back` on the keys.
export function ScreenMenu({ items, at, onAt, onPick, onBack, label }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onAt((at + 1) % items.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onAt((at + items.length - 1) % items.length) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPick(at) }
    else if (e.key === 'Escape' && onBack) { e.preventDefault(); e.stopPropagation(); onBack() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation()
  }
  return (
    <ol
      className="wl-scr-menu" role="listbox" aria-label={label} tabIndex={0} ref={ref}
      aria-activedescendant={`wl-mi-${at}`} onKeyDown={onKey}
    >
      {items.map((t, j) => (
        // by place, not by words: a row whose words change (`share…` to
        // `share`) stays the same row, so a press on it is not lost
        <li
          key={j} id={`wl-mi-${j}`} role="option" aria-selected={j === at}
          className={j === at ? 'is-on' : undefined}
          onClick={() => { onAt(j); onPick(j) }}
        >
          {t}
        </li>
      ))}
    </ol>
  )
}

// A note: a glyph, a line in the large face and one under it, the way the
// phone said "message sent".
export function ScreenNote({ glyph = '', title, children }) {
  return (
    <div className="wl-scr-note" role="status">
      {glyph ? <Pix name={glyph} h={9} /> : null}
      {title ? <b>{title}</b> : null}
      {children ? <span>{children}</span> : null}
    </div>
  )
}

// ── the small screen ────────────────────────────────────────────────────────
// How much of the photograph's own colour a lit small screen's picture keeps
// (`tint`): enough that a face reads from across the wall, not so much that
// it stops being a picture on that screen.
const TILE_COLOUR = 0.5

// A name on the wall: its newest letter's screen, in that letter's colour,
// small. The aerial across the top, the battery how long since the last
// letter, and an envelope blinks on a name that heard from
// somebody today. The middle is the name's picture, in the screen's own
// tones with some of the photograph's colour left in, or its monogram.
export function Tile({ look, seed = '', mono = '', src = '', at = 0, className = '' }) {
  const colour = colourOf(look, seed)
  const s = skinOf(colour)
  const q = quirks(seed)
  // the picture is shown only for the src it landed for, so a tile whose
  // name has no picture any more gets its monogram back
  const [shownFor, setShownFor] = useState('')
  const shown = !!src && shownFor === src
  const hrs = at ? (Date.now() - at) / 3600000 : 99
  const bat = hrs < 20 ? 4 : hrs < 60 ? 3 : hrs < 132 ? 2 : hrs < 240 ? 1 : 0
  const fresh = hrs < 24
  // a print's light is its colour's (`--t-spot`, looks.js), laid where this
  // phone's backlight is brightest, as it is on the letter
  const vars = {
    ...skinVars(colour),
    '--q-rz': q.vars['--q-rz'], '--q-hx': q.vars['--q-hx'], '--q-hy': q.vars['--q-hy'],
    '--q-blink': q.vars['--q-blink'], '--q-ar': q.vars['--q-ar'],
    '--q-pitch': q.vars['--q-pitch'],
  }
  const len = [...String(mono || '')].length
  // `wl-tile-glow` and `wl-tile-f` are the wall's focus (Hive.jsx `FOCUS`):
  // the round light a far screen throws, and the one box the blur and the
  // dimming are written on, so a screen going out of focus restyles those
  // two and nothing inside the screen
  return (
    <span className={`wl-tile ${className}`} data-kind={s.kind} data-light={s.light || undefined} style={vars} aria-hidden="true">
      <i className="wl-tile-glow" />
      <span className="wl-tile-f">
        <span className="wl-tile-in">
          <span className="wl-tile-top">
            <i className={`wl-g ${glyph('ant', s.flat.lit)}`} />
            {fresh ? <i className={`wl-g wl-g-env ${glyph('env', s.flat.lit)} is-blink`} /> : null}
            <i className={`wl-g ${glyph(`bata${bat}`, s.flat.lit)} is-bat${bat ? '' : ' is-blink'}`} />
          </span>
          <span className={`wl-tile-mid${shown ? ' is-pic' : ''}`}>
            {src ? (
              <PixelPic
                key={src} src={src} cells={64} ink={s.flat.ink} inv={s.kind === 'neg'} tones={s.flat.pic || null}
                /* a print in its own inks, a copy in the toner's four greys
                   (looks.js `skinOf`), and a lit screen in its own two tones
                   with some of the photograph's colour left in */
                levels={s.flat.pic ? s.flat.pic.length - 1 : s.kind === 'xerox' ? 3 : PIC_LEVELS}
                colour={s.print ? 0 : TILE_COLOUR} panel={s.mid}
                still className="wl-tile-pic" onReady={() => setShownFor(src)}
              />
            ) : null}
            {shown ? null : (
              <span className="wl-tile-mono" style={{ '--len': Math.max(2, len) }}>
                {mono}
              </span>
            )}
          </span>
          <span className="wl-tile-bot"><i /><i /></span>
        </span>
      </span>
    </span>
  )
}

// ── the thumbnail ───────────────────────────────────────────────────────────
// A colour in the panel: the small screen with three lines of words on it,
// and a print's own light where the letter's would be.
export function Mini({ colour, seed = 'mini' }) {
  const s = skinOf(colour)
  const vars = { ...skinVars(colour), '--q-hx': '78%', '--q-hy': '64%' }
  void seed
  return (
    <span className="wl-mini" data-kind={s.kind} data-light={s.light || undefined} style={vars} aria-hidden="true">
      <span className="wl-mini-top" />
      <span className="wl-mini-body"><i /><i /><i /></span>
      <span className="wl-mini-bot" />
    </span>
  )
}

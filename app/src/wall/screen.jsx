// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN: a letter, as a phone left on in a dark room                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every letter on the wall is drawn by this file, at three sizes:
//
//   Screen   the letter, read. The status across the top (the aerial and the
//            bars, the name, how many characters were left, the battery),
//            the words with the cursor still after the last one, and the
//            three soft keys at the foot. Opened, it is the only lit thing
//            in the room
//   Tile     the same screen, small, standing for a name on the wall: the
//            status row, the name's monogram or their picture, and the
//            keys' two dashes
//   Mini     the panel's thumbnail of a colour
//
// and `PixelPic`, the picture of a person the way those screens drew one:
// cut to a few dozen pixels a side and dithered into the screen's own ink.
// There is no round face anywhere on the wall; a person is a picture on a
// screen.
//
// Every size inside a screen is in `cqw` of its own width, so one layout
// draws at 470 pixels and at 60 without a second one. What the colour does
// is looks.js `skinOf`; what makes this screen this one and no other is
// looks.js `quirks`, off the letter's id.

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { colourOf, skinVars, skinOf, quirks, printFilter, glyphPath, PIX, hexRgb } from './looks.js'
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

// The tiles' glyphs are masks, made once for the page: a wall of two hundred
// small screens is two hundred references to one image each, not two hundred
// inline drawings.
let glyphSheet = false
function ensureGlyphs() {
  if (glyphSheet || typeof document === 'undefined') return
  glyphSheet = true
  const names = Object.keys(PIX).filter((k) => /^(anty|antt|env|sig\d|bat[abc]\d)$/.test(k))
  const css = names.map((k) => {
    const g = glyphPath(k)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" shape-rendering="crispEdges"><path d="${g.d}"/></svg>`
    return `.wl-g-${k}{--m:url("data:image/svg+xml,${encodeURIComponent(svg)}");aspect-ratio:${g.w}/${g.h}}`
  }).join('\n')
  const el = document.createElement('style')
  el.dataset.glyphs = ''
  el.textContent = css
  document.head.appendChild(el)
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

export const PIC_CELLS = 40 // the picture at the head of a message, on the page and in the Send picture

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

export function dither(img, cells, inv, levels = 3) {
  const cv = shrink(img, cells)
  if (!cv) return null
  // throws on a picture that came without CORS, which is the fallback
  const { data } = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cells, cells)
  const n = cells * cells
  let lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255
  }
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
  // ink is shadow: how much of the screen's ink each cell wants, in 0..1
  const want = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = lum[i] ** 0.92
    want[i] = inv ? v : 1 - v
  }
  const LEVELS = levels // levels + 1 tones: four on a screen (none, a third, two thirds, all), two on a copy
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

function usePicture(src, cells, inv, levels = 3) {
  const key = `${src}|${cells}|${inv ? 1 : 0}|${levels}`
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
        try { out = dither(r.img, cells, inv, levels) || 'taint' } catch { out = 'taint' }
      }
      DITHERED.set(key, out)
      setImg(r.img)
      setGot(out)
    })
    return () => { live = false }
  }, [src, key, cells, inv, levels])
  return { got, img }
}

// `ink` is the colour the dither is struck in, a hex; the stylesheet puts the
// panel under it. `tones`, on a print, is its inks from paper to darkest, one
// per tone, and `levels` is one less than how many tones there are. `onReady`
// tells a caller the picture has landed, so a monogram under it can step
// aside.
export function PixelPic({ src, cells = 28, ink = '#131313', inv = false, levels = 3, tones = null, className = '', onReady }) {
  const { got, img } = usePicture(src, cells, inv, levels)
  const ref = useRef(null)
  const ready = useRef(onReady)
  ready.current = onReady
  useLayoutEffect(() => {
    const cv = ref.current
    if (!cv || !got) return
    const g = cv.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, cells, cells)
    if (got === 'taint') {
      if (img) drawCover(g, img, cells, cells)
    } else if (tones) {
      // a print's picture is struck in the print's own inks, opaque, so the
      // press prints each tone as one ink
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
    if (ready.current) ready.current(true)
  }, [got, img, ink, cells, tones])
  if (!src || !got) return null
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
// `top` is what the status rows say: `name`, `counter`, `mode` ('abc',
// 'Abc', 'locked'), `icon` ('pen', 'lock' or none), `handle`, and the
// letter's `sig` and `bat`. `pos` stands where the handle does, a menu's
// '1/3', hidden from a screen reader, which hears the chosen row itself.
// `keys` is the three soft keys, `l`, `c` and `r`, each
// `{ label, onClick, aria }` or nothing; `keepFocus` leaves the focus where
// it was when the key is pressed with a pointer. The body is the children.
//
// `live` off draws the keys without letting them be pressed or tabbed to:
// the neighbours on the letter's strip are pictures of the next letter, not
// a second set of controls. `nameId` lands on the name in the top row, so a
// sheet can be labelled by who the letter is for.
export function Screen({
  look, seed = '', top = {}, keys = {}, live = true, state = '', className = '', style, children,
  nameId,
}) {
  const colour = colourOf(look, seed)
  const q = quirks(seed)
  const s = skinOf(colour)
  const raw = useId()
  const fid = `wl-press-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const vars = { ...skinVars(colour), ...q.vars }
  const { name = '', counter = '', mode = 'abc', icon = 'pen', handle = '', pos = '', sig = 4, bat = 4 } = top
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
        {d.glyph ? <Pix name={d.glyph} h={5.6} className="wl-lit-g" /> : null}
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
      {s.print ? <Press id={fid} colour={colour} q={q} /> : null}
      {/* the press is on this wrapper, which has no transform (screen.css
          `.wl-scr-press`), and a print is uncovered here. Always drawn, so a
          screen turned from lit to print keeps the field in it */}
      <div
        className={`wl-scr-press${s.print && state ? ` is-${state}` : ''}`}
        style={s.print ? { filter: `url(#${fid})` } : undefined}
      >
        <div
          className={`wl-scr${state ? ` is-${state}` : ''}`} data-kind={s.kind}
          data-lid={s.kind === 'xerox' ? q.lid : undefined}
          role="group" aria-labelledby={nameId}
        >
          <div className="wl-scr-bg" aria-hidden="true" />
          <div className="wl-scr-top" data-name={q.nameAt}>
            <div className="wl-scr-r1">
              <span className="wl-scr-ant wl-lit-g" aria-hidden="true">
                <Pix name={q.ant === 't' ? 'antt' : 'anty'} h={7.4} />
                <Pix name={`sig${sig}`} h={7.4} />
              </span>
              <span className="wl-scr-nm wl-lit" id={nameId}>{name}</span>
              {counter ? <span className="wl-scr-cnt wl-lit" aria-hidden="true">{counter}</span> : null}
              <span className={`wl-scr-bat wl-lit-g${bat ? '' : ' is-low'}`} aria-hidden="true">
                <Pix name={`bat${q.bat}${bat}`} h={5.4} />
              </span>
            </div>
            <div className="wl-scr-r2">
              {icon ? (
                <>
                  <Pix name={icon} h={7} className="wl-lit-g" />
                  <span className="wl-scr-mode wl-lit" aria-hidden="true">{mode}</span>
                </>
              ) : null}
              <span className="wl-scr-hd wl-lit" aria-hidden={pos ? 'true' : undefined}>{pos || handle}</span>
            </div>
          </div>
          <div className="wl-scr-body">{children}</div>
          <div className="wl-scr-bot">
            {key('l', 'is-l')}
            {key('c', 'is-c')}
            {key('r', 'is-r')}
          </div>
          <span className="wl-scr-fx is-grid" aria-hidden="true" />
          <span className="wl-scr-fx is-moire" aria-hidden="true" />
          <span className="wl-scr-fx is-streak" aria-hidden="true" />
          <span className="wl-scr-fx is-glass" aria-hidden="true" />
          <span className="wl-scr-fx is-glare" aria-hidden="true" />
          <span className="wl-scr-fx is-shine" aria-hidden="true" />
        </div>
      </div>
    </div>
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
const SIZES = [15.4, 13.8, 12.4, 11.2, 10, 9.2, 8.4, 7.6]
export function useFit(ref, deps, fill = false) {
  const [over, setOver] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fit = () => {
      // the room is the body's, measured without its padding: the message
      // itself may be clamped from the last fit, and is not unclamped mid-fit
      const box = el.parentElement
      if (!box) return
      const bs = getComputedStyle(box)
      const room = box.clientHeight - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom)
      el.style.overflowY = 'hidden'
      const fits = (s) => { el.style.setProperty('--fs', `${s}cqw`); return el.scrollHeight <= room + 1 }
      let i = 0
      while (i < SIZES.length && !fits(SIZES[i])) i++
      if (fill && i > 0 && i < SIZES.length) {
        let lo = SIZES[i]
        let hi = SIZES[i - 1]
        while (hi - lo > 0.05) {
          const m = (lo + hi) / 2
          if (fits(m)) lo = m
          else hi = m
        }
        fits(lo)
      }
      const o = el.scrollHeight > room + 1
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      el.style.maxHeight = o && lh > 0 ? `${Math.floor(room / lh + 0.02) * lh}px` : ''
      el.style.overflowY = o ? 'auto' : 'hidden'
      setOver(o)
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    // the body: once clamped, the message alone would never see it grow
    if (ro) ro.observe(el.parentElement || el)
    let off = false
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!off) fit() })
    return () => { off = true; if (ro) ro.disconnect() }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return over
}

function Bar({ of, over }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const el = of.current
    if (!el || !over) return undefined
    const on = () => setT(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight))
    on()
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [of, over])
  if (!over) return null
  return <span className="wl-scr-sb" aria-hidden="true"><i style={{ top: `${(t * 78).toFixed(1)}%` }} /></span>
}

// The message, as the phone showed a draft: the words, the cursor after the
// last of them. `pic` stands a picture at the head of it, the way a picture
// message carried one: whatever node the caller hands, which draws its own
// `.wl-scr-mms` float when it has a picture and nothing when it has none.
// `sealed` draws each run of stars as the phone's full pixel star, one per
// hidden letter, on the line (screen.css `.wl-scr-stars`).
export function ScreenText({ text, pic = null, cursor = true, sealed = false, className = '' }) {
  const ref = useRef(null)
  // the picture's key, since its float can arrive after the first fit
  const over = useFit(ref, [text, pic ? pic.key : '', sealed], true)
  return (
    <>
      <div className={`wl-scr-msg ${className}`} ref={ref} tabIndex={over ? 0 : -1}>
        {pic}
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
// textarea, with the phone's own caret. It autofocuses only where there is a
// fine pointer, because on a phone the keyboard coming up unasked covers the
// screen the person has not looked at yet. `inputRef` is handed the
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
        maxLength={max} rows={1} spellCheck="true" aria-label={label}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
      />
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
// A name on the wall: its newest letter's screen, in that letter's colour,
// small. The bars are how many letters the name has, the battery how long
// since the last one, and an envelope blinks on a name that heard from
// somebody today. The middle is the name's picture, dithered into the
// screen, or its monogram with the cursor after it.
export function Tile({ look, seed = '', mono = '', src = '', count = 1, at = 0, className = '' }) {
  ensureGlyphs()
  const colour = colourOf(look, seed)
  const s = skinOf(colour)
  const q = quirks(seed)
  // the picture is shown only for the src it landed for, so a tile whose
  // name has no picture any more gets its monogram back
  const [shownFor, setShownFor] = useState('')
  const shown = !!src && shownFor === src
  const sig = Math.min(4, Math.max(1, count))
  const hrs = at ? (Date.now() - at) / 3600000 : 99
  const bat = hrs < 20 ? 4 : hrs < 60 ? 3 : hrs < 132 ? 2 : hrs < 240 ? 1 : 0
  const fresh = hrs < 24
  const vars = {
    ...skinVars(colour),
    '--q-rz': q.vars['--q-rz'], '--q-hx': q.vars['--q-hx'], '--q-hy': q.vars['--q-hy'],
    '--q-blink': q.vars['--q-blink'], '--q-ar': q.vars['--q-ar'], '--q-spot': q.vars['--q-spot'],
    '--q-pitch': q.vars['--q-pitch'],
  }
  const len = [...String(mono || '')].length
  return (
    <span className={`wl-tile ${className}`} data-kind={s.kind} style={vars} aria-hidden="true">
      <span className="wl-tile-in">
        <span className="wl-tile-top">
          <i className={`wl-g wl-g-${q.ant === 't' ? 'antt' : 'anty'}`} />
          <i className={`wl-g wl-g-sig${sig}`} />
          {fresh ? <i className="wl-g wl-g-env is-blink" /> : null}
          <i className={`wl-g wl-g-bat${q.bat}${bat} is-bat${bat ? '' : ' is-blink'}`} />
        </span>
        <span className={`wl-tile-mid${shown ? ' is-pic' : ''}`}>
          {src ? (
            <PixelPic
              key={src} src={src} cells={32} ink={s.flat.ink} inv={s.kind === 'neg'} tones={s.flat.pic || null}
              className="wl-tile-pic" onReady={() => setShownFor(src)}
            />
          ) : null}
          {shown ? null : (
            <span className="wl-tile-mono" style={{ '--len': Math.max(2, len) }}>
              {mono}<i className="wl-tile-cur" />
            </span>
          )}
        </span>
        <span className="wl-tile-bot"><i /><i /></span>
      </span>
    </span>
  )
}

// ── the thumbnail ───────────────────────────────────────────────────────────
// A colour in the panel: the small screen with three lines of words on it.
export function Mini({ colour, seed = 'mini' }) {
  const s = skinOf(colour)
  const vars = { ...skinVars(colour), '--q-hx': '78%', '--q-hy': '64%', '--q-spot': 'none' }
  void seed
  return (
    <span className="wl-mini" data-kind={s.kind} style={vars} aria-hidden="true">
      <span className="wl-mini-top" />
      <span className="wl-mini-body"><i /><i /><i /></span>
      <span className="wl-mini-bot" />
    </span>
  )
}

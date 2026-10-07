// ── the studio's parts ──────────────────────────────────────────────────────
//
// Everything a poster or the film is made of, and none of it a copy: the
// screen is the wall's `Screen` (screen.jsx) with its colours and quirks
// (looks.js), the stories are `PixelStory` told on the product's own clocks
// (pixmark.js), the mark and the word are brand.js's cells, and the faces
// are app/public/fonts. A poster is these laid out on a board of a fixed
// size; scripts/studio.mjs photographs the board.
//
// Development only (studio.html), as proto/looks.jsx is.

import { useEffect, useMemo, useState } from 'react'
import { Screen, ScreenText } from '../wall/screen.jsx'
import PixelStory, { SQUARE } from '../wall/PixelStory.jsx'
import { introStory, revealStory, markCells, MARK_CUT, I_QUICK, filmStory, keepStory } from '../wall/pixmark.js'
import { skinOf, skinVars, mix, hexRgb } from '../wall/looks.js'
import { lockupSVG, markSVG, LOCKUP, MARK } from '../wall/brand.js'
import { typeCells, readyType } from '../wall/pixtype.js'
import { turnStyle } from '../wall/turn.js'
import '../wall/mutual.css'

export { Screen, ScreenText, PixelStory, SQUARE, skinOf, skinVars, mix, hexRgb, LOCKUP, MARK }

// ── the board ───────────────────────────────────────────────────────────────
// One picture, `w` by `h` CSS pixels, photographed at the scale the export
// asks for. The black room by default, with the sensor's grain over all of
// it (the shared picture's), so the black is a room and not a screen that
// is off. `.wl-root.is-room` gives everything inside the wall's tokens.
export function Board({ w, h, bg = '#000', grain = 0.07, vignette = 0, children, className = '', style }) {
  return (
    <div className={`st-board wl-root is-room ${className}`} style={{ width: `${w}px`, height: `${h}px`, background: bg, ...style }}>
      {children}
      {vignette ? <span className="st-vignette" style={{ opacity: vignette }} aria-hidden="true" /> : null}
      {grain ? <Grain opacity={grain} /> : null}
    </div>
  )
}

// The sensor's grain: feTurbulence, generated, never a bitmap (DESIGN.md
// rule 3). `seed` moves it, which the film does on every frame.
export function Grain({ opacity = 0.07, seed = 2, freq = 0.85, blend = 'screen', className = '' }) {
  const id = useMemo(() => `st-g-${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <svg className={`st-grain ${className}`} style={{ opacity, mixBlendMode: blend }} width="100%" height="100%" aria-hidden="true">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  )
}

// ── the light ───────────────────────────────────────────────────────────────
// The light a lit screen throws on the black, in its own colour
// (screen.css `.wl-room-light`), centred at `x`, `y`, `size` across.
export function Light({ x, y, size, tint = 'night', strength = 1, colour = '' }) {
  const halo = colour || skinVars(tint)['--s-halo']
  return (
    <span
      className="st-light" aria-hidden="true"
      style={{ left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`, opacity: strength, '--halo': halo }}
    />
  )
}

// ── the phone ───────────────────────────────────────────────────────────────
// A letter's screen, `w` wide, centred at `x`, `y` (or placed by `style`
// when neither is given). Three ways of being on:
//
//   draft    the street posters' screen: the composer, mid letter. The
//            name in the status row, the characters left by the battery,
//            the pen and `abc`, the words with the cursor after them, and
//            `options`, the heart at nought and `send` on the keys
//   letter   a letter as it stands on the wall: `dear` and the name, the
//            day it went up, `options` on the left and the heart and the
//            replies' bubble on the right
//   bare     the glass alone, for a story (`children`)
//
// `square` holds it to the camera, as a story's screen is held; otherwise
// it keeps the tilt its seed gives it (looks.js `quirks`), or `tilt`'s
// [x, y, z] degrees. `quiet` leaves off the pixels up close, which are a
// haze at a poster's size. `screenStyle` goes on the screen itself, where
// its colours live: the film turns night to rose with `turnStyle` there.
// `sticker` is a school (schools.js `schoolOf`): the phone on its network.
export function Phone({
  w, x, y, tint = 'night', seed = 'studio', mode = 'draft', text = '', name = '', counter = '', stamp = '',
  hearts = 0, replies = null, bat = 4, cursor = true, square = false, mail = false, tilt = null,
  quiet = true, children, className = '', style, screenStyle = null, top: topOver = null, keys: keysOver = null, sticker = null,
}) {
  const look = { tint, bat }
  let top
  let keys
  if (mode === 'draft') {
    top = { date: name, counter: counter || `${Math.max(0, 260 - [...text].length)}/1`, icon: 'pen', name: 'abc', bat }
    keys = { l: { label: 'options' }, c: { glyph: 'heartO', label: String(hearts) }, r: { label: 'send' } }
  } else if (mode === 'letter') {
    top = { name, dear: true, icon: 'pen', stamp, bat, mail }
    const right = [{ glyph: 'heartO', label: String(hearts), cls: 'is-heart' }]
    if (replies != null) right.push({ glyph: 'bubbleO', label: String(replies), cls: 'is-thread' })
    keys = { l: { label: 'options' }, r: right }
  } else {
    top = { bat }
    keys = {}
  }
  if (topOver) top = { ...top, ...topOver }
  if (keysOver) keys = keysOver
  const tiltStyle = square ? SQUARE : tilt ? { '--q-rx': `${tilt[0]}deg`, '--q-ry': `${tilt[1]}deg`, '--q-rz': `${tilt[2]}deg` } : null
  const place = x != null && y != null ? { position: 'absolute', left: `${x - w / 2}px`, top: `${y}px`, transform: 'translateY(-50%)' } : null
  return (
    <div className={`st-phone${quiet ? ' is-quiet' : ''}${mode === 'bare' ? ' is-bare' : ''} ${className}`} style={{ width: `${w}px`, ...place, ...style }}>
      <Screen look={look} seed={seed} top={top} keys={keys} live={false} sticker={sticker} style={tiltStyle || screenStyle ? { ...tiltStyle, ...screenStyle } : undefined}>
        {mode === 'bare' ? children : <ScreenText text={text} cursor={cursor} />}
      </Screen>
    </div>
  )
}

// ── the stories ─────────────────────────────────────────────────────────────
// The product's own animations, told on the glass of a square phone, at `t`
// on their clocks (ms, or null for the last frame), exactly as darkroom.mjs
// tells them for the mails and the posts:
//
//   intro      the two of them run in, are held, and glide into the mark,
//              the phone turning `tint` (Intro.jsx, at its quick pace)
//   reveal     the mutual's: the notes, the mark, the rose (Reveal.jsx)
//   film       the full screen telling of a mutual (Film.jsx)
//   gathered   the mark standing at the top of the glass, for a line under it
//   mark       the mark alone in the middle, on the phone's coarser grid
const NIGHT = () => skinOf('night')
const panelOf = (s) => [s.hi, s.mid, s.lo]
const STORIES = new Map()
export function storyOf(name, tint = 'rose') {
  const k = `${name}|${tint}`
  if (STORIES.has(k)) return STORIES.get(k)
  const to = skinOf(tint)
  let s
  if (name === 'reveal') {
    s = revealStory({ panel: panelOf(to), ink: [NIGHT().ink, to.ink] })
  } else if (name === 'intro') {
    s = introStory(0, {
      pace: I_QUICK, panel: panelOf(to), ink: [NIGHT().ink, to.ink],
      front: hexRgb(mix(to.mid, '#FFFFFF', 0.6)).join(', '),
    })
  } else if (name === 'film') {
    s = filmStory({ panel: panelOf(to), ink: [NIGHT().ink, to.ink] })
  } else if (name === 'keep') {
    s = keepStory({ ink: [NIGHT().ink, to.ink] })
  } else if (name === 'gathered') {
    const n = 51
    const { list } = markCells(n, { ...MARK_CUT, ss: 6 })
    const ox = (95 - n) >> 1
    const cells = list.map((c) => [c.x + ox, c.y + 2, 1])
    const f = { key: name, cells }
    s = { cols: 95, rows: 75, end: 0, fine: true, frame: () => f }
  } else {
    const { list, n } = markCells(47, MARK_CUT)
    const cols = 57
    const rows = 45
    const ox = (cols - n) >> 1
    const oy = (rows - n) >> 1
    const cells = list.map((c) => [c.x + ox, c.y + oy, 1])
    const f = { key: 'mark', cells }
    s = { cols, rows, end: 0, frame: () => f }
  }
  STORIES.set(k, s)
  return s
}

// The mutual's film (Film.jsx `filmFor`): the two names credited on the
// glass before the two of them run in, and `it's mutual.` typed under the
// mark, both cut into the phone's own cells (pixtype.js). The face has to be
// on the page before the words are cut, so a film asks `readyFilm` first.
export const SAY = 'it’s mutual.'
const FILMS = new Map()
export async function readyFilm(a, b) {
  await Promise.all([readyType(a, 6000), readyType(b, 6000), readyType(SAY, 6000)])
}
export function filmOf(a = 'Jules', b = 'Ace', tint = 'rose') {
  const k = `${a}\n${b}\n${tint}`
  if (FILMS.has(k)) return FILMS.get(k)
  const to = skinOf(tint)
  const s = filmStory({ credit: { a: typeCells(a), b: typeCells(b) }, say: typeCells(SAY), panel: panelOf(to), ink: [NIGHT().ink, to.ink] })
  FILMS.set(k, s)
  return s
}
// the keepsake's mark, alive, with `it's mutual.` in its cells
export function keepOf(tint = 'rose') {
  const k = `keep\n${tint}`
  if (FILMS.has(k)) return FILMS.get(k)
  const to = skinOf(tint)
  const s = keepStory({ ink: [NIGHT().ink, to.ink], say: typeCells(SAY) })
  FILMS.set(k, s)
  return s
}
export { turnStyle }

// A moment on a story's clock: ms, a named moment of the story's own and
// ms from it ('live+1600'), or its end
export function clockOf(story, t) {
  if (t == null) return story.end
  if (typeof t === 'number') return t
  const m = /^([a-z]+)([+-]\d+)?$/.exec(t)
  const at = m && story.times ? story.times[m[1]] : null
  if (at == null) throw new Error(`studio: no moment ${t}`)
  return at + Number(m[2] || 0)
}

// The glass of a story, `say` typed under it as the mutual types its line
// (mutual.css `.wl-mutual-say`), with the cursor after it when `cursor`
export function StoryGlass({ story = 'intro', tint = 'rose', t = null, say = '', cursor = true }) {
  const s = storyOf(story, tint)
  return (
    <>
      <PixelStory story={s} at={clockOf(s, t)} />
      {say ? <p className="wl-mutual-say">{say}{cursor ? <span className="wl-scr-cur" /> : null}</p> : null}
    </>
  )
}

// A phone with a story on its glass: no keys and no second row, held
// square, as every story's screen is (PixelStory.jsx `SQUARE`)
export function StoryPhone({ w, x, y, tint = 'rose', seed = 'intro', story = 'intro', t = null, say = '', cursor = true, className = '', style }) {
  return (
    <Phone w={w} x={x} y={y} tint={tint} seed={seed} mode="bare" square className={`is-story ${className}`} style={style}>
      <StoryGlass story={story} tint={tint} t={t} say={say} cursor={cursor} />
    </Phone>
  )
}

// ── the brand ───────────────────────────────────────────────────────────────
// The lockup and the mark, drawn on their grid at a whole number of pixels
// a cell (DESIGN.md 3.3), in chalk with the close bloom a lit thing has, or
// in ink with none. Never scaled by a fraction.
export function Lockup({ cell = 2, color = '#F4F1EA', bloom = true, className = '', style }) {
  const svg = useMemo(() => lockupSVG('currentColor', { scale: cell }), [cell])
  return <span className={`st-brand${bloom ? ' is-bloom' : ''} ${className}`} style={{ color, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />
}
export function Mark({ cell = 2, color = '#F4F1EA', bloom = true, className = '', style }) {
  const svg = useMemo(() => markSVG('currentColor', { scale: cell }), [cell])
  return <span className={`st-brand${bloom ? ' is-bloom' : ''} ${className}`} style={{ color, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />
}
export const lockupSize = (cell) => ({ w: LOCKUP.w * cell, h: LOCKUP.h * cell })
export const markSize = (cell) => ({ w: LOCKUP.mark.w * cell, h: LOCKUP.mark.h * cell })

// ── the tape ────────────────────────────────────────────────────────────────
// The street posters went up with plasters, not tape: a strip of flesh
// coloured fabric with a pad in the middle and its two ends rounded. Drawn,
// with its weave from feTurbulence, `len` long, at `x`, `y`, turned `rot`.
export function Plaster({ x, y, len = 120, rot = 0, tone = '#E8B994', className = '', style }) {
  const id = useMemo(() => `st-p-${Math.random().toString(36).slice(2, 8)}`, [])
  const h = Math.round(len * 0.28)
  return (
    <svg
      className={`st-plaster ${className}`} width={len} height={h} viewBox={`0 0 ${len} ${h}`} aria-hidden="true"
      style={{ left: `${x - len / 2}px`, top: `${y - h / 2}px`, transform: `rotate(${rot}deg)`, ...style }}
    >
      <defs>
        <filter id={`${id}-w`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 0.62" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width={len - 1} height={h - 1} rx={h / 2.2} fill={tone} opacity="0.93" />
      <rect x={len * 0.36} y={h * 0.16} width={len * 0.28} height={h * 0.68} rx={h * 0.12} fill={mix(tone, '#FFFFFF', 0.28)} opacity="0.95" />
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx={len * (0.1 + (i % 3) * 0.075) + (i > 2 ? len * 0.6 : 0)} cy={h * (i % 2 ? 0.62 : 0.38)} r={h * 0.045} fill="#000" opacity="0.18" />
      ))}
      <rect x="0.5" y="0.5" width={len - 1} height={h - 1} rx={h / 2.2} fill={tone} filter={`url(#${id}-w)`} />
      <rect x="0.5" y="0.5" width={len - 1} height={h - 1} rx={h / 2.2} fill={`url(#${id}-l)`} />
    </svg>
  )
}

// ── a photograph ────────────────────────────────────────────────────────────
// One of the campaign's own stills (assets/photos), cut to a box: `focus`
// is where in it to keep, as object-position
const PHOTOS = import.meta.glob('./assets/photos/*.jpg', { eager: true, import: 'default' })
export const photo = (name) => PHOTOS[`./assets/photos/${name}.jpg`]
export function Photo({ name, focus = '50% 50%', className = '', style, filter = '' }) {
  return <img className={`st-photo ${className}`} src={photo(name)} alt="" style={{ objectPosition: focus, filter: filter || undefined, ...style }} />
}

// ── waiting for a board to be whole ─────────────────────────────────────────
// A poster with something that lands late (a shader's first frame, a
// picture) says so with `useHold`, and the page is not called ready until
// every hold is let go.
const HOLDS = new Set()
export function useHold(done) {
  const [token] = useState(() => ({}))
  useEffect(() => {
    if (done) { HOLDS.delete(token); return undefined }
    HOLDS.add(token)
    return () => { HOLDS.delete(token) }
  }, [done, token])
}
export const holding = () => HOLDS.size > 0

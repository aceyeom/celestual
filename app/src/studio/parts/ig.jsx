// ── the feed's four ─────────────────────────────────────────────────────────
//
// What the four instagram posts share (posters/ig-*.jsx): the board at 4:5,
// the margins, the slate across the top and the signature across the foot,
// so the four read as one series on a grid while each lays its own picture
// between them. And the few things a picture here needs that the kit does
// not draw: a focus that falls off, the dust on a glass seen up close, and a
// wall that catches the light of the screens pasted on it.
//
// The grid is the board's width over 15, 72 pixels: the margins are one
// unit, the slate stands one unit in from the top, and the signature's foot
// one unit in from the bottom.

import { useMemo } from 'react'
import { Board, Lockup, Plaster, lockupSize } from '../kit.jsx'
import './ig.css'

export const W = 1080
export const H = 1350
export const U = 72
export const SIGN_CELL = 2
export const SIGN = lockupSize(SIGN_CELL)
// the top of the signature's row, and the room above it a picture can use
export const SIGN_TOP = H - U - SIGN.h
// the series' baseline: the last line of words in every one of the four
// stands on it, a unit and a little over above the signature
export const BASE = 1128

// The night the last two tell (ig-mutual, ig-not-this-time): a saturday,
// the reveal's, and the one phone both are told on, at one size and in one
// place, so side by side on the grid they read as the same night told the
// two ways it can go
export const NIGHT = '10/03/26'
export const PAIR = { w: 616, y: 92 }

// the board, the slate and the signature
export function IgBoard({ slate = null, sign = true, grain = 0.075, vignette = 0, children, className = '' }) {
  return (
    <Board w={W} h={H} grain={grain} vignette={vignette} className={`ig ${className}`}>
      {children}
      {slate ? <Slate {...slate} /> : null}
      {sign ? <Sign /> : null}
    </Board>
  )
}

// A headline a person means, in the display cut, its last line standing on
// the series' baseline. Newsreader's descent is 0.265 of its em, and a line
// of 1.02 adds a hundredth above and below, so the box's foot is 0.275 of
// the size under the baseline.
export function Headline({ size = 90, base = BASE, children, style }) {
  return (
    <h2 className="ig-line" style={{ left: U, right: U, bottom: H - (base + 0.275 * size), fontSize: size, ...style }}>
      {children}
    </h2>
  )
}

// two identifiers across the top, at the margins: what is lit, and when
export function Slate({ l = '', r = '' }) {
  return (
    <div className="ig-slate" style={{ left: U, right: U, top: U }}>
      <span>{l}</span>
      <span>{r}</span>
    </div>
  )
}

// the lockup at the left margin, the address at the right, on one line
export function Sign() {
  return (
    <div className="ig-sign" style={{ left: U, right: U, top: SIGN_TOP, height: SIGN.h }}>
      <Lockup cell={SIGN_CELL} />
      <span className="ig-url">celestual.us</span>
    </div>
  )
}

// ── a focus that falls off ──────────────────────────────────────────────────
// A lens close to a thing holds a band of it sharp and lets the rest go
// soft. The picture is drawn twice, the soft one under, and the sharp one
// over it cut to the band by `mask` (a CSS mask image). `soft` is the
// blur, in pixels.
export function Focus({ mask, soft = 8, children, className = '', style }) {
  return (
    <div className={`ig-focus ${className}`} style={style}>
      <div className="ig-focus-soft" style={{ filter: `blur(${soft}px)` }} aria-hidden="true">{children}</div>
      <div className="ig-focus-sharp" style={{ WebkitMaskImage: mask, maskImage: mask }}>{children}</div>
    </div>
  )
}

// ── a seeded hand ───────────────────────────────────────────────────────────
// So a picture is the same picture every time it is photographed
export function rng(seed) {
  let h = 2166136261
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h += 0x6D2B79F5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── dust on the glass ───────────────────────────────────────────────────────
// Seen up close, a screen's glass carries what the air left on it: specks,
// a hair or two of lint, a smear where a thumb was. Drawn as paths off a
// seed, lit from the screen under them, `w` by `h`.
export function Dust({ w, h, seed = 'dust', specks = 70, hairs = 2, lint = null, tone = '#FFF4E4', opacity = 0.5, className = '', style }) {
  const parts = useMemo(() => {
    const r = rng(seed)
    const dots = Array.from({ length: specks }, () => {
      const big = r() < 0.12
      return { x: r() * w, y: r() * h, r: big ? 1.4 + r() * 2.4 : 0.5 + r() * 1.1, a: 0.25 + r() * 0.75, rx: 0.6 + r() * 0.8 }
    })
    // `lint` is the box the hairs start in, [x, y, w, h], when not the whole
    const [lx, ly, lw, lh] = lint || [0, 0, w, h]
    const hair = Array.from({ length: hairs }, () => {
      let x = lx + r() * lw
      let y = ly + r() * lh
      let a = r() * Math.PI * 2
      const pts = [[x, y]]
      const n = 10 + Math.floor(r() * 8)
      for (let i = 0; i < n; i++) {
        a += (r() - 0.5) * 0.9
        x += Math.cos(a) * (6 + r() * 7)
        y += Math.sin(a) * (6 + r() * 7)
        pts.push([x, y])
      }
      return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')
    })
    return { dots, hair }
  }, [w, h, seed, specks, hairs, lint])
  return (
    <svg className={`ig-dust ${className}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ opacity, ...style }} aria-hidden="true">
      {parts.dots.map((d, i) => (
        <ellipse key={i} cx={d.x} cy={d.y} rx={d.r * d.rx} ry={d.r} fill={tone} opacity={d.a} />
      ))}
      {parts.hair.map((p, i) => (
        <path key={i} d={p} fill="none" stroke={tone} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
      ))}
    </svg>
  )
}

// ── a plaster in the room's light ───────────────────────────────────────────
// The kit's plaster, with the light it would have where it is stuck: the
// end over a lit screen catches it, the end on the wall is in the dark.
// `dark` is how far the far end falls, and `from` is the angle the light
// comes from, in degrees round the strip's own length.
export function LitPlaster({ x, y, len = 120, rot = 0, dark = 0.6, from = 180, soft = 0, tone, style }) {
  const h = Math.round(len * 0.28)
  return (
    <div
      className="ig-plaster" aria-hidden="true"
      style={{ left: x - len / 2, top: y - h / 2, width: len, height: h, transform: `rotate(${rot}deg)`, filter: soft ? `blur(${soft}px) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.55))` : undefined, ...style }}
    >
      <Plaster x={len / 2} y={h / 2} len={len} rot={0} tone={tone} />
      <span style={{ borderRadius: h / 2.2, background: `linear-gradient(${from}deg, rgba(20, 10, 4, 0) 0%, rgba(20, 10, 4, ${dark}) 100%)` }} />
    </div>
  )
}

// ── a wall in the dark ──────────────────────────────────────────────────────
// What the letters are pasted on, `w` by `h`: a roller shutter, as the
// street posters' were, its ribs running across and the grime of the street
// on them, seen only where a screen's light falls (`pool`, a CSS mask image
// the shape of that light). The ribs are drawn, each with its lit lip and
// its groove, and the grime is feTurbulence lit by a lamp at a low angle,
// so it stands out of the metal. `tone` is the light's colour.
export function WallSurface({ w, h, tone = '#F4F1EA', pool, rib = 30, seed = 3, className = '', style }) {
  const id = useMemo(() => `ig-w-${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <div className={`ig-wall-surface ${className}`} aria-hidden="true" style={{ width: w, height: h, WebkitMaskImage: pool, maskImage: pool, '--rib': `${rib}px`, '--tone': tone, ...style }}>
      <span className="ig-wall-ribs" />
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.03" numOctaves="4" seed={seed} result="big" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed={seed + 7} result="grit" />
          <feComposite in="big" in2="grit" operator="arithmetic" k1="0" k2="0.75" k3="0.4" k4="0" result="relief" />
          <feDiffuseLighting in="relief" surfaceScale="2.4" diffuseConstant="1" lightingColor="#FFFFFF" result="lit">
            <feDistantLight azimuth="250" elevation="44" />
          </feDiffuseLighting>
        </filter>
        <rect width={w} height={h} filter={`url(#${id})`} />
      </svg>
    </div>
  )
}

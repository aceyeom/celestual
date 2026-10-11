import { Img, staticFile } from 'remotion'
import { noise2D } from '@remotion/noise'
import { TONES, type Tone } from '../theme'

// ── the tones ───────────────────────────────────────────────────────────────
// SVG filters, once on the page: a photograph to its light, then the light
// mapped from one colour to another, as a duotone print is made
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
export const ToneDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      {(Object.keys(TONES) as Tone[]).map((k) => {
        const [a, b] = TONES[k].map(hex)
        return (
          <filter key={k} id={`tone-${k}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={`${a[0]} ${b[0]}`} />
              <feFuncG type="table" tableValues={`${a[1]} ${b[1]}`} />
              <feFuncB type="table" tableValues={`${a[2]} ${b[2]}`} />
            </feComponentTransfer>
          </filter>
        )
      })}
    </defs>
  </svg>
)

export type Rect = { x: number; y: number; w: number; h: number }
export type Photo = { src: string; w: number; h: number }
export const PHOTOS = {
  roses: { src: 'photos/roses.jpg', w: 1052, h: 957 },
  dance: { src: 'photos/dance.jpg', w: 1124, h: 1500 },
  sea: { src: 'photos/sea.jpg', w: 1206, h: 1363 },
} satisfies Record<string, Photo>

// One half's look: its tone (or none, the photograph's own colour), and how
// much of that tone over the photograph's own; how lit; how present
export type Look = { tone?: Tone; toneTo?: Tone; mix?: number; bright?: number; opacity?: number; blur?: number }

// A photograph cut to `rect`, as `object-fit: cover` would, `zoom` times
// that and drifting a little (noise), so it is never quite still
function Picture({ photo, rect, zoom, focus, frame, seed, look }: { photo: Photo; rect: Rect; zoom: number; focus: [number, number]; frame: number; seed: string; look: Look }) {
  const s = Math.max(rect.w / photo.w, rect.h / photo.h) * zoom
  const w = photo.w * s
  const h = photo.h * s
  const dx = noise2D(`${seed}x`, frame / 140, 0) * 6
  const dy = noise2D(`${seed}y`, 0, frame / 140) * 6
  const x = Math.min(0, Math.max(rect.w - w, rect.w / 2 - focus[0] * w)) + dx
  const y = Math.min(0, Math.max(rect.h - h, rect.h / 2 - focus[1] * h)) + dy
  const img = (filter?: string, opacity = 1) => (
    <Img src={staticFile(photo.src)} style={{ position: 'absolute', left: x, top: y, width: w, height: h, filter, opacity }} />
  )
  const f = [look.bright != null && look.bright !== 1 ? `brightness(${look.bright})` : '', look.blur ? `blur(${look.blur}px)` : ''].join(' ').trim()
  return (
    <div style={{ position: 'absolute', inset: 0, filter: f || undefined, opacity: look.opacity ?? 1 }}>
      {img(look.tone ? `url(#tone-${look.tone})` : undefined)}
      {look.toneTo && (look.mix ?? 0) > 0 ? img(`url(#tone-${look.toneTo})`, look.mix) : null}
    </div>
  )
}

// ── a print, cut in two ─────────────────────────────────────────────────────
// The photograph laid on the paper as a print, cut along the line between
// the two people in it (`seam`: where the cut meets the top and the foot,
// as fractions of its width), the two halves pushed `gap` apart, each
// turned a little away from the other. At no gap it is one print again
export function SplitPrint({
  photo, rect, seam, gap, frame, zoom = 1, focus = [0.5, 0.5], left = {}, right = {}, tilt = 0, shadow = true,
}: { photo: Photo; rect: Rect; seam: [number, number]; gap: number; frame: number; zoom?: number; focus?: [number, number]; left?: Look; right?: Look; tilt?: number; shadow?: boolean }) {
  const [t, b] = seam
  const L = `polygon(0 0, ${t * 100}% 0, ${b * 100}% 100%, 0 100%)`
  const R = `polygon(${t * 100}% 0, 100% 0, 100% 100%, ${b * 100}% 100%)`
  const half = (clip: string, side: -1 | 1, look: Look, seed: string) => (
    <div
      style={{
        position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h,
        transform: `translateX(${(side * gap) / 2}px) rotate(${side * tilt}deg)`,
        transformOrigin: `${((t + b) / 2) * 100}% 50%`,
        filter: shadow && gap >= 0.5 ? 'drop-shadow(0 18px 30px rgba(23,21,15,0.28)) drop-shadow(0 2px 4px rgba(23,21,15,0.25))' : undefined,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, clipPath: clip, overflow: 'hidden' }}>
        <Picture photo={photo} rect={rect} zoom={zoom} focus={focus} frame={frame} seed={seed} look={look} />
      </div>
    </div>
  )
  // closed, it is one print: one shadow and no line where it was cut
  if (gap < 0.5 && Math.abs(tilt) < 0.01) {
    return (
      <>
        <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: '0 18px 40px rgba(23,21,15,0.3), 0 2px 4px rgba(23,21,15,0.25)' }} />
        {half(L, -1, left, 'l')}
        {half(R, 1, right, 'l')}
      </>
    )
  }
  return (
    <>
      {half(L, -1, left, 'l')}
      {half(R, 1, right, 'l')}
    </>
  )
}

// a photograph over the whole frame
export function FullPhoto({ photo, rect, zoom = 1, focus = [0.5, 0.5], frame, look = {} }: { photo: Photo; rect: Rect; zoom?: number; focus?: [number, number]; frame: number; look?: Look }) {
  return (
    <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, overflow: 'hidden' }}>
      <Picture photo={photo} rect={rect} zoom={zoom} focus={focus} frame={frame} seed="full" look={look} />
    </div>
  )
}

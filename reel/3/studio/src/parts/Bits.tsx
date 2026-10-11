import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion'
import { evolvePath } from '@remotion/paths'
import { ASH, INK, PAPER, SANS, SERIF } from '../theme'

// ── the paper ───────────────────────────────────────────────────────────────
// chalk paper with its tooth, and a grain new every frame over all of it
export const Paper = ({ color = PAPER }: { color?: string }) => <AbsoluteFill style={{ background: color }} />
export function Grain({ opacity = 0.16, blend = 'multiply' as const }) {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ zIndex: 90, pointerEvents: 'none', mixBlendMode: blend, opacity }}>
      <svg width="100%" height="100%">
        <filter id={`g${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(random(`grain${frame}`) * 1000)} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame})`} />
      </svg>
    </AbsoluteFill>
  )
}
// the frame's edge a little darker, as a print's is under a lamp
export const Vignette = ({ opacity = 0.35 }) => (
  <AbsoluteFill style={{ zIndex: 89, pointerEvents: 'none', opacity, background: 'radial-gradient(120% 85% at 50% 45%, transparent 55%, rgba(23,21,15,0.55) 100%)' }} />
)

// ── the composer ────────────────────────────────────────────────────────────
// A note being written, on a card of its own over one of the two: who it is
// to, the words with the cursor after them, and the key that sends it.
// `press` takes the key down; `label` is what the key says
export function Card({ x, y, w = 380, to, text, cursor, label, press = 0, scale = 1, opacity = 1, rot = 0 }: { x: number; y: number; w?: number; to: string; text: string; cursor: boolean; label: string; press?: number; scale?: number; opacity?: number; rot?: number }) {
  if (opacity <= 0.002 || scale <= 0.01) return null
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y, width: w, zIndex: 30, opacity, transform: `scale(${scale}) rotate(${rot}deg)`, transformOrigin: '50% 50%' }}>
      <div style={{ background: 'rgba(250,248,243,0.94)', borderRadius: 26, padding: '22px 26px 20px', boxShadow: '0 22px 50px rgba(23,21,15,0.28), 0 2px 6px rgba(23,21,15,0.18), inset 0 0 0 1px rgba(255,255,255,0.7)' }}>
        <div style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, letterSpacing: '0.02em', color: ASH }}>dear {to}</div>
        <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 400, color: INK, minHeight: 58, marginTop: 6, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {text}
          <span style={{ display: 'inline-block', width: 3, height: 40, marginLeft: 3, verticalAlign: '-6px', background: INK, opacity: cursor ? 1 : 0 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, color: PAPER, background: INK, borderRadius: 999, padding: '9px 18px', transform: `scale(${1 - 0.08 * press})`, display: 'inline-block' }}>{label}</span>
        </div>
      </div>
    </div>
  )
}
// how much of `text` is typed at `frame`: a letter every `per` frames from
// `from`, held, then taken back a letter at a time from `del`
export function typed(text: string, frame: number, from: number, per: number, del = Infinity, delPer = 2) {
  let n = Math.max(0, Math.min(text.length, Math.floor((frame - from) / per) + 1))
  if (frame < from) n = 0
  if (frame >= del) n = Math.max(0, text.length - Math.floor((frame - del) / delPer) - 1)
  return text.slice(0, n)
}
export const blink = (frame: number) => Math.floor(frame / 15) % 2 === 0

// ── the note, sealed ────────────────────────────────────────────────────────
// an envelope drawn as a line is drawn (`draw`, 0 to 1), then filled
const ENV = 'M 4 4 L 116 4 L 116 80 L 4 80 Z M 4 4 L 60 50 L 116 4'
export function Envelope({ x, y, size = 96, draw = 1, fill = 0, color = INK, opacity = 1, glow = 0 }: { x: number; y: number; size?: number; draw?: number; fill?: number; color?: string; opacity?: number; glow?: number }) {
  if (opacity <= 0.002) return null
  const e = evolvePath(draw, ENV)
  const k = size / 120
  return (
    <svg width={size} height={84 * k} viewBox="0 0 120 84" style={{ position: 'absolute', left: x - size / 2, top: y - (84 * k) / 2, opacity, zIndex: 35, overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${18 * glow}px rgba(255,244,228,${0.9 * glow}))` : 'drop-shadow(0 6px 10px rgba(23,21,15,0.25))' }}>
      <rect x="4" y="4" width="112" height="76" fill={PAPER} opacity={fill} />
      <path d={ENV} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
    </svg>
  )
}

// a ring going out from a point, drawn and fading
export function Ring({ x, y, k, r = 260, color = PAPER }: { x: number; y: number; k: number; r?: number; color?: string }) {
  if (k <= 0 || k >= 1) return null
  const rr = interpolate(k, [0, 1], [20, r])
  return (
    <svg width={rr * 2 + 20} height={rr * 2 + 20} style={{ position: 'absolute', left: x - rr - 10, top: y - rr - 10, zIndex: 36 }}>
      <circle cx={rr + 10} cy={rr + 10} r={rr} fill="none" stroke={color} strokeWidth={interpolate(k, [0, 1], [6, 1])} opacity={1 - k} />
    </svg>
  )
}

// ── small labels ────────────────────────────────────────────────────────────
export const Label = ({ x, y, text, color = PAPER, opacity = 1, align = 'left' as 'left' | 'center' | 'right' }) => (
  <div style={{ position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1080 - x : undefined, top: y, zIndex: 32, opacity, fontFamily: SANS, fontSize: 24, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color }}>{text}</div>
)
// the reveal's moment, as a chip: the day and the hour
export const Chip = ({ x, y, text, k }: { x: number; y: number; text: string; k: number }) => (k <= 0 ? null : (
  <div style={{ position: 'absolute', left: x, top: y, zIndex: 34, transform: `translate(-50%, 0) scale(${0.8 + 0.2 * k})`, opacity: Math.min(1, k * 1.4), fontFamily: SANS, fontSize: 28, fontWeight: 600, letterSpacing: '0.04em', color: INK, background: PAPER, padding: '12px 24px', borderRadius: 999, boxShadow: '0 12px 30px rgba(23,21,15,0.25)', whiteSpace: 'nowrap' }}>{text}</div>
))

// ── the name ────────────────────────────────────────────────────────────────
// the drawn lockup, at a whole number of pixels a cell (112 by 33 cells)
export const Lockup = ({ x, y, cell = 6, ink = true, opacity = 1 }: { x: number; y: number; cell?: number; ink?: boolean; opacity?: number }) => (
  <Img src={staticFile(ink ? 'lockup-ink.svg' : 'lockup-chalk.svg')} style={{ position: 'absolute', left: x - (112 * cell) / 2, top: y, width: 112 * cell, height: 33 * cell, opacity, zIndex: 40, imageRendering: 'pixelated' }} />
)

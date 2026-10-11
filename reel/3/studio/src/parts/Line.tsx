import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { INK, SERIF } from '../theme'

// ── a line of type, word by word ────────────────────────────────────────────
// Each word rises into its own mask on a spring, a little after the one
// before it, and leaves upward the same way at `out`. Words in *stars* are
// set in italic. `lines` are stacked, the whole block placed at `x`, `y`
// (its top) and aligned `align`.
type Props = {
  lines: string[]
  from: number
  out?: number
  x?: number
  y: number
  size?: number
  align?: 'left' | 'center' | 'right'
  color?: string
  weight?: number
  stagger?: number
  leading?: number
  width?: number
}
export function Line({ lines, from, out = Infinity, x = 72, y, size = 92, align = 'left', color = INK, weight = 380, stagger = 2.4, leading = 1.02, width = 936 }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (frame < from - 2 || frame > out + 30) return null
  let n = 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, textAlign: align, fontFamily: SERIF, fontSize: size, fontWeight: weight, lineHeight: leading, letterSpacing: '-0.025em', color, zIndex: 40 }}>
      {lines.map((ln, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap' }}>
          {ln.split(' ').map((w, j) => {
            const k = n++
            const it = /^\*.*\*[.,?]?$/.test(w)
            const word = w.replace(/\*/g, '')
            const inn = spring({ frame: frame - from - k * stagger, fps, config: { damping: 18, stiffness: 140, mass: 0.7 } })
            const go = out === Infinity ? 0 : spring({ frame: frame - out - k * 1.2, fps, config: { damping: 22, stiffness: 160 } })
            const yy = interpolate(inn, [0, 1], [105, 0]) - go * 105
            return (
              <span key={j} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.12em', marginBottom: '-0.12em', marginRight: '0.24em' }}>
                <span style={{ display: 'inline-block', transform: `translateY(${yy}%)`, fontStyle: it ? 'italic' : 'normal', fontWeight: it ? weight - 40 : weight }}>{word}</span>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

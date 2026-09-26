// ── the sticker ─────────────────────────────────────────────────────────────
//
// A letter written to an @ goes up from a verified school address, and it
// says so the way a phone in a student's hand would: a die-cut sticker of the
// school, slapped on the corner of the phone. It is drawn from the pixels in
// schools.js (`stickerGrid`), the same pixels the shared picture draws
// (share.js), so the sticker on the glass and the sticker in the picture are
// one drawing: the short name in a pixel face of our own on the school's
// colour, a white die-cut border, a small star in the corner, and the bottom
// corner lifting off the glass.
//
// Each letter's sticker is stuck on at its own angle (`stickerTilt`, off the
// letter's id), so a deck of letters from one school does not read as one
// stamp repeated. It is sized by its container: the width of the element
// it is put in, in whatever unit that element is sized in.
//
// It is a picture with a sentence, for a screen reader: who wrote it, by the
// school's address ("written by a verified berkeley.edu student").
//
// What a letter carries (its salutation, its sticker, a name note's school)
// is schools.js `letterMarks`, which is what a screen that draws a letter
// hands to `Screen`.

import { useId, useMemo } from 'react'
import { schoolOf, stickerGrid, stickerInks, stickerRuns, stickerLabel, stickerTilt } from './schools.js'
import './post.css'

export function Sticker({ school, seed = '', tilt = null, className = '', style, label = '' }) {
  const s = school && typeof school === 'object' && school.short ? school : schoolOf(school)
  const grid = useMemo(() => (s ? stickerGrid(s.short) : null), [s && s.short]) // eslint-disable-line react-hooks/exhaustive-deps
  const raw = useId()
  const gid = `wl-st-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const paths = useMemo(() => {
    if (!grid) return null
    const by = new Map()
    let all = ''
    for (const [v, x, y, w] of stickerRuns(grid)) {
      const d = `M${x} ${y}h${w}v1h${-w}z`
      by.set(v, (by.get(v) || '') + d)
      if (v !== 6 && v !== 7 && v !== 16 && v !== 17) all += d
    }
    return { by, all }
  }, [grid])
  if (!s || !grid) return null
  const ink = stickerInks(s)
  const deg = tilt === null ? stickerTilt(seed || s.slug) : tilt
  return (
    <span
      className={`wl-sticker ${className}`} role="img" aria-label={label || stickerLabel(s)}
      style={{ '--st-tilt': `${deg.toFixed(2)}deg`, '--st-ar': `${grid.w} / ${grid.h}`, ...style }}
    >
      <svg viewBox={`0 0 ${grid.w} ${grid.h}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <defs>
          {/* the vinyl's sheen: a band of light across it, faint */}
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="0.38" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {[...paths.by.keys()].sort((a, b) => a - b).map((v) => <path key={v} d={paths.by.get(v)} fill={ink[v]} />)}
        <path d={paths.all} fill={`url(#${gid})`} />
      </svg>
    </span>
  )
}

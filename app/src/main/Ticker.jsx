// ── the ticker wall ─────────────────────────────────────────────────────────
//
// docs/rebuild-spec.md section 8, and it is new: nothing in the repository
// implemented one. The spec is unusually specific about what may be on it, and
// the specificity is the design:
//
//   "Display `display_name`, `handle`, and verification badge only. Do not put
//    avatars or counts in the ticker."
//
// So three things per row and no fourth. No faces, because forty faces moving
// across a page is a feed and this product does not have one. No counts,
// because a number beside a name on a wall of names is a ranking, and the one
// thing this product will not do is tell anybody how they compare.
//
// ── where the names come from ───────────────────────────────────────────────
// The wall's public index, which is the only thing on the wall a browser reads
// without answering anything, plus the resolver for the display name and the
// badge. Both are already cached: the index by data.js and the profiles by
// api/handles.js, so a ticker on the front page costs one request that the hero
// was making anyway and a handful that are free after the first visit.
//
// A name with no resolved profile still shows, as its handle. The resolver is
// off by default and can be rate limited, and a ticker that went blank for
// either would be a ticker that reports our own configuration as somebody's
// absence.
//
// ── the motion ──────────────────────────────────────────────────────────────
// Two rails, opposite directions, different durations, and the list rendered
// twice on each so the loop has no seam. Paused on hover, because a name
// somebody is trying to read should stop moving, and static entirely under
// `prefers-reduced-motion`, where it becomes a scrollable strip instead.
import { useEffect, useState } from 'react'
import { Sparkle } from '../wall/art.jsx'
import { wallIndex } from '../wall/api.js'
import { resolveHandle, resolveEnabled } from '../api/handles.js'

// Enough to fill two rails on a wide screen without asking the resolver about
// half a campus. The wall's own index is the pool.
const WANT = 18

function One({ row }) {
  return (
    <span className="mn-tick-one">
      <span className="mn-tick-name">{row.name || `@${row.handle}`}</span>
      {row.name ? <span className="mn-tick-at">@{row.handle}</span> : null}
      {row.verified ? <Sparkle size={9} /> : null}
    </span>
  )
}

function Rail({ rows, dur, back = false }) {
  if (!rows.length) return null
  return (
    <div className="mn-ticker" aria-hidden="true">
      <div className={`mn-ticker-rail${back ? ' is-back' : ''}`} style={{ '--dur': dur }}>
        {/* Twice. The seam lands exactly where the copy begins, so the loop has
            nothing to hide. */}
        {rows.concat(rows).map((r, i) => <One key={`${r.handle}-${i}`} row={r} />)}
      </div>
    </div>
  )
}

export default function Ticker() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = await wallIndex()
      if (!alive || !out.ok || !out.tiles.length) return

      const handles = out.tiles.slice(0, WANT).map((t) => t.handle)
      // Handles first, so the strip appears immediately and the names fill in.
      // A ticker that waits for eighteen lookups before drawing anything is a
      // blank band on the front page for as long as the slowest one takes.
      setRows(handles.map((h) => ({ handle: h, name: '', verified: false })))
      if (!resolveEnabled) return

      const resolved = await Promise.all(handles.map(async (h) => {
        const r = await resolveHandle(h)
        return r.state === 'found'
          ? { handle: r.handle, name: r.name, verified: r.verified }
          : { handle: h, name: '', verified: false }
      }))
      if (alive) setRows(resolved)
    })()
    return () => { alive = false }
  }, [])

  if (rows.length < 4) return null

  const half = Math.ceil(rows.length / 2)
  return (
    <div className="mn-ticker-wrap">
      <Rail rows={rows.slice(0, half)} dur="64s" />
      <Rail rows={rows.slice(half)} dur="88s" back />
      {/* The names are decorative here: they are already readable on the wall
          itself, and a screen reader walking a looping marquee twice is a
          screen reader walking a looping marquee twice. The link says where
          they are. */}
      <p className="wl-sr">
        <a href="/berkeley">the names written to on the wall at berkeley</a>
      </p>
    </div>
  )
}

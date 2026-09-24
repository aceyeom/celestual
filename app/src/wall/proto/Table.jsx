// ── 4. THE TABLE: the screens lying loose in the dark ───────────────────────
// The crowd the hive was after, without the watch's lens: every name's small
// screen at one size, lying on a dark table the way phones are put down, a
// little turned, each its own way, and a little over its neighbour, the
// newest nearest the middle. Nothing swells and nothing is bent; the table
// is pulled about with a finger or a wheel, and a pointer resting on a
// screen says whose it is.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { hash } from '../data.js'
import { NameScreen, useWho } from './common.jsx'
import './proto.css'

function Phone({ t, x, y, r, size, onOpen, onPeek }) {
  const who = useWho(t)
  return (
    <button
      type="button" className="px-ph" style={{ left: x, top: y, width: size, height: size, '--r': `${r}deg` }}
      onClick={() => onOpen(t.handle)} onPointerDown={() => onPeek && onPeek(t.handle)}
      aria-label={who.name}
    >
      <span className="px-ph-scr" aria-hidden="true"><NameScreen t={t} /></span>
      <span className="px-ph-tag" aria-hidden="true">{who.name}</span>
    </button>
  )
}

export default function Table({ tiles = [], onOpen, onPeek, veiled = false, none = '' }) {
  const box = useRef(null)
  const [vw, setVw] = useState(390)
  const [off, setOff] = useState(null)
  const drag = useRef(null)
  useLayoutEffect(() => {
    const el = box.current
    if (el) setVw(el.clientWidth)
  }, [])
  const size = vw >= 900 ? 128 : 92
  // a jittered grid, the newest in the middle: the cells sorted by their
  // distance from the table's centre, and the names laid into them in the
  // index's own order
  const board = useMemo(() => {
    const n = tiles.length
    const cols = Math.max(3, Math.round(Math.sqrt(n * 1.5)))
    const rows = Math.ceil(n / cols)
    const pitchX = size * 1.02
    const pitchY = size * 0.96
    const cx = ((cols - 1) * pitchX) / 2
    const cy = ((rows - 1) * pitchY) / 2
    const cells = []
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ i, j, d: Math.hypot(i * pitchX - cx, j * pitchY - cy) })
    cells.sort((a, b) => a.d - b.d)
    const placed = tiles.map((t, k) => {
      const c = cells[k]
      const h = hash(t.handle)
      const jx = (((h % 1000) / 1000) - 0.5) * size * 0.3
      const jy = ((((h >> 10) % 1000) / 1000) - 0.5) * size * 0.26
      const r = ((((h >> 20) % 1000) / 1000) - 0.5) * 14
      return { t, x: c.i * pitchX + jx, y: c.j * pitchY + jy, r }
    })
    return { placed, w: (cols - 1) * pitchX + size, h: (rows - 1) * pitchY + size }
  }, [tiles, size])
  if (!tiles.length) return <div className="px-stage px-none">{none}</div>
  // the table starts with its middle in the middle of the glass
  const at = off || { x: (vw - board.w) / 2, y: -board.h / 2 }
  const move = (dx, dy) => setOff({ x: at.x + dx, y: at.y + dy })
  return (
    <div
      ref={box}
      className={`px-stage px-table${veiled ? ' is-veiled' : ''}`}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, at } }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        setOff({ x: d.at.x + e.clientX - d.x, y: d.at.y + e.clientY - d.y })
      }}
      onPointerUp={() => { drag.current = null }}
      onPointerLeave={() => { drag.current = null }}
      onWheel={(e) => move(-e.deltaX, -e.deltaY)}
    >
      <div className="px-table-in" style={{ transform: `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0)`, width: board.w, height: board.h }}>
        {board.placed.map((p) => (
          <Phone key={p.t.handle} t={p.t} x={p.x} y={p.y} r={p.r} size={size} onOpen={onOpen} onPeek={onPeek} />
        ))}
      </div>
    </div>
  )
}

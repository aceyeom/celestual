// ── 2. THE WALL OF SCREENS ──────────────────────────────────────────────────
// The names as a wall of small screens in a strict grid, bezel to bezel, the
// way a shop's window stood its phones in rows: newest first, one size, the
// name on a plate under each and the count and the age beside it. Nothing
// is bent, nothing drifts, nothing needs pulling; the wall scrolls as a page
// does. The envelope still blinks on a name written to today.

import { NameScreen, useWho, ago } from './common.jsx'
import './proto.css'

function Cell({ t, onOpen, onPeek }) {
  const who = useWho(t)
  return (
    <li>
      <button
        type="button" className="px-cell" onClick={() => onOpen(t.handle)}
        onPointerDown={() => onPeek && onPeek(t.handle)}
        aria-label={`${who.name}, ${t.count === 1 ? 'one letter' : `${t.count} letters`}`}
      >
        <span className="px-cell-scr" aria-hidden="true"><NameScreen t={t} /></span>
        <span className="px-cell-plate" aria-hidden="true">
          <span className="px-cell-name">{who.name}</span>
          <span className="px-cell-meta">{t.count} · {ago(t.at)}</span>
        </span>
      </button>
    </li>
  )
}

export default function Screens({ tiles = [], onOpen, onPeek, veiled = false, none = '' }) {
  if (!tiles.length) return <div className="px-stage px-none">{none}</div>
  return (
    <div className={`px-stage px-screens${veiled ? ' is-veiled' : ''}`}>
      <ul className="px-grid" aria-label="names on the wall">
        {tiles.map((t) => <Cell key={t.handle} t={t} onOpen={onOpen} onPeek={onPeek} />)}
      </ul>
    </div>
  )
}

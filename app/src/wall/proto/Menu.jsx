// ── 3. THE MENU: the wall as one phone in the hand ──────────────────────────
// One large screen in the middle of the room, lit night, holding the names
// the way a Series 40 phone held its main menu: a grid of nine, each a
// picture dithered into the screen's ink or a monogram, the chosen one
// framed and named across the top row, the page it is on where a handle
// stands (`1/6`), and the soft keys under it, `open` and `find`. The arrows
// walk it, a swipe turns the page, a press opens the name.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Screen, PixelPic } from '../screen.jsx'
import { colourOf, skinOf } from '../looks.js'
import { useWho } from './common.jsx'
import './proto.css'

const PER = 9
const LOOK = { tint: 'night' }
const SEED = 'the wall, as a menu'

function Icon({ t, on, ink, onOpen, onPoint }) {
  const who = useWho(t)
  const mono = String(who.name).replace(/^@/, '').split(/[\s._]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <button
      type="button" className={`px-mi${on ? ' is-on' : ''}`}
      onClick={() => onOpen(t.handle)} onPointerEnter={onPoint} onFocus={onPoint}
      aria-label={who.name}
    >
      <span className="px-mi-in" aria-hidden="true">
        {who.avatar
          ? <PixelPic src={who.avatar} cells={24} ink={ink} className="px-mi-pic" />
          : <span className="px-mi-mono">{mono}</span>}
      </span>
    </button>
  )
}

export default function Menu({ tiles = [], onOpen, veiled = false, none = '' }) {
  const s = useMemo(() => skinOf(colourOf(LOOK, SEED)), [])
  const [page, setPage] = useState(0)
  const [at, setAt] = useState(4)
  const pages = Math.max(1, Math.ceil(tiles.length / PER))
  const shown = tiles.slice(page * PER, page * PER + PER)
  const chosen = shown[Math.min(at, shown.length - 1)] || null
  const who = useWho(chosen || { handle: '' })
  const drag = useRef(null)

  // the arrows walk the grid and run on to the next page at its edge
  useEffect(() => {
    if (veiled) return undefined
    const onKey = (e) => {
      if (e.target && e.target.closest && e.target.closest('input, textarea')) return
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key]
      if (!step) return
      e.preventDefault()
      const i = page * PER + at + step
      if (i < 0 || i >= tiles.length) return
      setPage(Math.floor(i / PER))
      setAt(i % PER)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page, at, tiles.length, veiled])

  if (!tiles.length) return <div className="px-stage px-none">{none}</div>
  const turn = (d) => { const p = Math.max(0, Math.min(pages - 1, page + d)); setPage(p); setAt(0) }
  return (
    <div
      className={`px-stage px-menu${veiled ? ' is-veiled' : ''}`}
      onPointerDown={(e) => { drag.current = { x: e.clientX } }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d && Math.abs(e.clientX - d.x) > 48) turn(e.clientX < d.x ? 1 : -1)
      }}
    >
      <div className="px-menu-in">
        <Screen
          look={LOOK} seed={SEED} live
          top={{ name: chosen ? String(who.name).replace(/^@/, '').split(/\s+/)[0] : '', pos: `${page + 1}/${pages}`, icon: '', sig: 4, bat: 4 }}
          keys={{
            l: { label: 'open', onClick: () => chosen && onOpen(chosen.handle), aria: chosen ? `open ${who.name}` : 'open' },
            r: { label: 'find', onClick: () => document.querySelector('.wl-seek input')?.focus(), aria: 'look for a name' },
          }}
        >
          <div className="px-mgrid">
            {shown.map((t, i) => (
              <Icon key={t.handle} t={t} on={i === at} ink={s.ink} onOpen={onOpen} onPoint={() => setAt(i)} />
            ))}
          </div>
        </Screen>
        <div className="px-menu-pages" aria-hidden="true">
          {Array.from({ length: pages }, (_, i) => <i key={i} className={i === page ? 'is-on' : ''} />)}
        </div>
      </div>
    </div>
  )
}

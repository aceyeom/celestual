// ── 1. DRAFTS: the wall as the phone's drafts folder ────────────────────────
// Every letter is an unsent draft (DESIGN.md 2.5), so the wall is the folder
// they are kept in: one list on the unlit panel, a row per name, newest
// first, the way the phone listed its messages. The row carries the name's
// small screen, the name, the handle under it, the envelope and the count,
// and how long since. The chosen row is inverted, and on a spread the chosen
// name's newest letter stands beside the list as its own screen, the way a
// Communicator showed a message beside its folder.

import { useEffect, useState } from 'react'
import { Screen, ScreenText, PixIcon } from '../screen.jsx'
import { lettersFor, loadHandle, atHandle, isNameKey } from '../data.js'
import { signalOf, chargeOf } from '../looks.js'
import { starred } from '../share.js'
import { NameScreen, useWho, ago, fresh } from './common.jsx'
import './proto.css'

function Row({ t, on, onOpen, onPeek, onPoint }) {
  const who = useWho(t)
  return (
    <li>
      <button
        type="button" className={`px-row${on ? ' is-on' : ''}`}
        onClick={() => onOpen(t.handle)} onPointerDown={() => onPeek && onPeek(t.handle)}
        onPointerEnter={onPoint} onFocus={onPoint}
        aria-label={`${who.name}, ${t.count === 1 ? 'one letter' : `${t.count} letters`}`}
      >
        <span className="px-row-scr" aria-hidden="true"><NameScreen t={t} /></span>
        <span className="px-row-id">
          <span className="px-row-name">{who.name}</span>
          {who.under ? <span className="px-row-at">{who.under}</span> : null}
        </span>
        <span className="px-row-meta" aria-hidden="true">
          <span className={`px-row-n${fresh(t.at) ? ' is-new' : ''}`}><PixIcon name="env" scale={1} />{t.count}</span>
          <span className="px-row-ago">{ago(t.at)}</span>
        </span>
      </button>
    </li>
  )
}

// the chosen name's newest letter, as its screen, on a spread
function Preview({ t, onOpen }) {
  const who = useWho(t)
  useEffect(() => { loadHandle(t.handle) }, [t.handle])
  const l = lettersFor(t.handle)[0] || null
  const open = !!l && l.body !== null && l.body !== undefined
  const text = l ? (open ? l.body : starred(l.words, l.chars, l.id)) : ''
  const first = String(who.name).replace(/^@/, '').split(/\s+/)[0]
  return (
    <div className="px-preview-in">
      <Screen
        look={l ? l.look : t.look} seed={l ? l.id : t.handle} live
        top={{
          name: first, handle: isNameKey(t.handle) ? '' : atHandle(t.handle),
          counter: l ? `${280 - (open ? l.body.length : l.chars || 0)}/1` : '',
          mode: open ? 'abc' : 'locked', icon: open ? 'pen' : 'lock',
          sig: signalOf(l ? l.hearts : 0), bat: chargeOf(l ? l.at : 0),
        }}
        keys={{
          l: { label: 'read', onClick: () => onOpen(t.handle), aria: `read ${who.name}'s letters` },
          c: { glyph: 'heartO', label: l && l.hearts ? String(l.hearts) : '' },
        }}
      >
        <ScreenText text={text} sealed={!open} />
      </Screen>
    </div>
  )
}

export default function Drafts({ tiles = [], onOpen, onPeek, veiled = false, none = '' }) {
  const [at, setAt] = useState(0)
  const chosen = tiles[Math.min(at, tiles.length - 1)] || null
  if (!tiles.length) return <div className="px-stage px-none">{none}</div>
  return (
    <div className={`px-stage px-drafts${veiled ? ' is-veiled' : ''}`}>
      <div className="px-drafts-in">
        <section className="px-list" aria-label="names on the wall">
          <header className="px-list-h" aria-hidden="true">
            <span className="px-list-t"><PixIcon name="env" scale={2} />drafts</span>
            <span className="px-list-pos">{Math.min(at, tiles.length - 1) + 1}/{tiles.length}</span>
          </header>
          <ol className="px-rows">
            {tiles.map((t, i) => (
              <Row key={t.handle} t={t} on={i === at} onOpen={onOpen} onPeek={onPeek} onPoint={() => setAt(i)} />
            ))}
          </ol>
        </section>
        {chosen ? <aside className="px-preview"><Preview t={chosen} onOpen={onOpen} /></aside> : null}
      </div>
    </div>
  )
}

// ── what the four layouts share ─────────────────────────────────────────────
// Development only (vite.config.js `wall-protos`). Each layout is a drop-in
// for the hive (screens/Wall.jsx `?layout=`): the same props, the same way
// into a letter (`onOpen`), and the same small screen for a name (screen.jsx
// `Tile`), drawn the way the hive draws it.

import { memo } from 'react'
import { Tile } from '../screen.jsx'
import { useProfile } from '../parts.jsx'
import { labelFor, isNameKey, atHandle } from '../data.js'
import { monogram } from '../../api/handles.js'

// The name's small screen: its newest letter's colour, its picture when the
// resolver has one, else its monogram (Hive.jsx `NameTile`).
export const NameScreen = memo(function NameScreen({ t }) {
  const named = isNameKey(t.handle)
  const p = useProfile(named ? '' : t.handle)
  const said = named ? (t.name || labelFor(t.handle)) : ''
  const mono = named
    ? ([...said].length <= 5 ? said : monogram({ name: said }))
    : p ? monogram(p) : String(t.handle || '').replace(/^@+/, '').slice(0, 2).toUpperCase()
  return <Tile look={t.look || null} seed={t.handle} mono={mono} src={p?.avatar || ''} count={t.count} at={t.at} />
})

// What a row prints for a name: the resolver's name when it has one, the
// name as written for a first name, and the handle under it when both exist.
export function useWho(t) {
  const named = isNameKey(t.handle)
  const p = useProfile(named ? '' : t.handle)
  const name = named ? (t.name || labelFor(t.handle)) : (p?.name || atHandle(t.handle))
  const under = !named && p?.name ? atHandle(t.handle) : ''
  return { name, under, avatar: p?.avatar || '', verified: !!p?.verified }
}

// How long since the last letter, the way a phone's list said it
export function ago(at) {
  if (!at) return ''
  const h = (Date.now() - at) / 3600000
  if (h < 1) return 'now'
  if (h < 24) return `${Math.floor(h)}h`
  return `${Math.floor(h / 24)}d`
}
export const fresh = (at) => !!at && Date.now() - at < 86400000

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CELESTUAL · THE WALL — THE SHELL                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A visual prototype of the event surface, and of the product it hands off
// into. It reaches no server, stores nothing outside this tab, and is loaded
// only when the path starts with /beta — production never imports anything
// under src/wall, and nothing under src/wall is in the bundle somebody on the
// hero page downloads.
//
// This file owns the four things that are true on every screen:
//
//   · the faces      injected here and removed on unmount, so four extra font
//                    files are never fetched on a production route
//   · the field      ONE instance, mounted here, persisting across every route
//                    change. That is what makes it connective tissue instead
//                    of a background image that eight screens each own a copy
//                    of — and it is why it can decelerate to a stop between
//                    two screens rather than restarting on each one.
//   · the cut        160ms down, 380ms up, no slide and no crossfade
//   · the scan       ?s= is read once, attached to the session, and scrubbed
//                    out of the URL
//
// ── the surface, and the sheets on it ───────────────────────────────────────
// Three routes are not screens: /beta/letter, /beta/find and /beta/write are
// sheets that rise over a wall which stays mounted, scrolled where it was, and
// visible behind them. That is the whole reason the composer reads as part of
// the wall rather than as a form the wall sent you away to fill in, and it is
// the reason those three take no cut — a surface that blacks out to raise a
// sheet is a surface that just navigated.

import { useCallback, useEffect, useRef, useState } from 'react'
import './wall.css'
import { parse, href, isWallPath, SHEETS, BASE } from './router.js'
import { Field } from './art.jsx'
import { prefersReducedMotion } from './parts.jsx'
import { getState, patch } from './store.js'
import { normSource } from './seed.js'
import { liveCount } from './data.js'

import Wall from './screens/Wall.jsx'
import Letter from './screens/Letter.jsx'
import Find from './screens/Find.jsx'
import None from './screens/None.jsx'
import Write from './screens/Write.jsx'
import Sealed from './screens/Sealed.jsx'
import Blind from './screens/Blind.jsx'
import Core from './screens/Core.jsx'

const FONTS = 'https://fonts.googleapis.com/css2'
  + '?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400'
  + '&family=EB+Garamond:ital,wght@0,400;0,500;1,400'
  + '&family=Geist+Mono:wght@400;500'
  + '&family=Inter+Tight:wght@400;500;600'
  + '&display=swap'

// What the field is doing under each screen. A screen may override its own
// transiently; the override is cleared by the next route change rather than by
// an effect, so a child's request can never be stamped on by its parent's.
const FIELD = {
  wall:   'drift',
  letter: 'slow',
  find:   'slow',
  none:   'still',   // the room holding its breath — screens/None.jsx
  write:  'drift',
  sealed: 'drift',
  blind:  'slow',
  orbit:  'drift',
}

export default function WallApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname))
  const [override, setOverride] = useState(null)
  const [veil, setVeil] = useState(false)
  const [lit, setLit] = useState(false)
  const cut = useRef(0)
  const reduce = useRef(prefersReducedMotion()).current

  // ── the faces ──
  // app/index.html fetches the three production faces on every route, and this
  // build needs four different ones. Adding them to the shared document would
  // put four extra font files in front of every visitor to the hero page to
  // serve an address reached by scanning a piece of paper.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS
    link.dataset.wall = 'faces'
    document.head.appendChild(link)
    const title = document.title
    document.title = 'celestual — someone here wrote something they never sent'
    return () => { link.remove(); document.title = title }
  }, [])

  // ── the scan ──
  // /beta?s=flyer-a is how the flyer, the card, the chalk and the table become
  // measurable against each other. Read once, attached to anything this
  // session creates, then scrubbed out of the URL — a source code riding along
  // into a link somebody pastes to a friend would attribute their scan to a
  // flyer they never saw.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search || '')
    const s = q.get('s')
    patch({ source: normSource(s || getState().source) })
    if (s) {
      q.delete('s')
      const rest = q.toString()
      window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : ''))
    }
  }, [])

  // The field lights once, under the wall's opening cascade.
  useEffect(() => {
    const t = setTimeout(() => setLit(true), reduce ? 0 : 60)
    return () => clearTimeout(t)
  }, [reduce])

  // ── the cut ──
  // Down to the void in 160ms, swap underneath, back up in 380ms. No sliding,
  // no shared element, no crossfade — and none of it at all for a sheet, which
  // rises over a wall that never went anywhere.
  const go = useCallback((name, id) => {
    const to = href(name, id)
    if (to === window.location.pathname) return
    const from = parse(window.location.pathname)
    const target = parse(to)
    // A sheet opening or closing over the same underlying surface, or a pager
    // step inside one sheet, is not a navigation.
    const sheetMove = SHEETS.has(target.name) || (SHEETS.has(from.name) && target.name === 'wall')

    const swap = () => {
      window.history.pushState({ wall: name }, '', to)
      setOverride(null)
      setRoute(target)
      if (!sheetMove) window.scrollTo(0, 0)
      setVeil(false)
    }

    if (sheetMove || reduce) { swap(); return }
    setVeil(true)
    window.clearTimeout(cut.current)
    cut.current = window.setTimeout(swap, 160)
  }, [reduce])

  useEffect(() => () => window.clearTimeout(cut.current), [])

  // Back and forward. Backing out past the entry point is a real navigation:
  // this tree replaced the production app at mount, so there is nothing here
  // to render a production route with.
  useEffect(() => {
    const onPop = () => {
      if (!isWallPath(window.location.pathname)) { window.location.reload(); return }
      setOverride(null)
      setRoute(parse(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setField = useCallback((m) => setOverride(m), [])
  const back = useCallback(() => go('wall'), [go])

  const mode = override || FIELD[route.name] || 'drift'
  const shared = { go, back, setField, reduce }
  const onSheet = SHEETS.has(route.name)

  let sheet = null
  if (route.name === 'letter') sheet = <Letter id={route.id} {...shared} />
  if (route.name === 'find') sheet = <Find {...shared} />
  if (route.name === 'write') sheet = <Write to={route.id} {...shared} />

  let base = null
  switch (route.name) {
    case 'none':   base = <None {...shared} />; break
    case 'sealed': base = <Sealed {...shared} />; break
    case 'blind':  base = <Blind {...shared} />; break
    case 'orbit':  base = <Core id={route.id} {...shared} />; break
    default:       base = <Wall {...shared} />   // and everything a sheet sits on
  }

  return (
    <div className="wl-root" data-route={route.name}>
      <div className="wl-ground" aria-hidden="true">
        <div className="wl-halo" />
        <Field count={Math.min(120, liveCount() + 24)} mode={mode} hidden={!lit} />
        <div className="wl-grain" />
      </div>

      <main className={`wl-main${onSheet ? ' is-under' : ''}`} aria-hidden={onSheet || undefined}>
        {base}
      </main>

      {sheet}

      <div className={`wl-cut${veil ? ' is-down' : ''}`} aria-hidden="true" />
    </div>
  )
}

export { BASE }

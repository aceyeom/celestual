// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CELESTUAL · THE WALL — THE SHELL                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The event surface, and the product it hands off into. As of Phase 6b it
// reaches a server for everything it holds: the letters, the campus gate, the
// handle proof, the reports and the takedowns are all in the schema. What is
// still local is what should be, and only that: the draft in the composer, the
// names this browser has written to, and which letters it has opened.
//
// It is loaded only when the path starts with /berkeley. Production never
// imports anything under src/wall, and nothing under src/wall is in the bundle
// somebody on the hero page downloads.
//
// This file owns the four things that are true on every screen:
//
//   · the faces      injected here and removed on unmount, so four extra font
//                    files are never fetched on a production route
//   · the ground     ONE instance, mounted here, persisting across every route
//                    change (ground.jsx: the plasma, the halo, the field, the
//                    grain). That is what makes it connective tissue instead
//                    of a background image that eight screens each own a copy
//                    of, and it is why the field can decelerate to a stop
//                    between two screens rather than restarting on each one.
//                    It is the same component Main mounts, so the wall and the
//                    front door are one room.
//   · the cut        160ms down, 380ms up, no slide and no crossfade
//   · the scan       ?s= is read once, attached to the session, and scrubbed
//                    out of the URL
//
// ── the surface, and the sheets on it ───────────────────────────────────────
// Six routes are not screens: /berkeley/letter, /berkeley/find, /berkeley/write,
// /berkeley/gate, /berkeley/report and /berkeley/remove are sheets that rise over a wall
// which stays mounted, scrolled where it was, and visible behind them. That is the whole reason the composer reads as part of
// the wall rather than as a form the wall sent you away to fill in, and it is
// the reason those three take no cut — a surface that blacks out to raise a
// sheet is a surface that just navigated.

import { useCallback, useEffect, useRef, useState } from 'react'
import './wall.css'
import { parse, href, isWallPath, SHEETS, BASE } from './router.js'
import { eclipticSVG, INK, CHALK } from './art.jsx'
import { prefersReducedMotion } from './parts.jsx'
import Ground from './ground.jsx'
import { getState, patch } from './store.js'
import { normSource } from './seed.js'
import { revision, subscribe, loadWall } from './data.js'
import { logScan } from './api.js'
import { refresh as refreshMember } from './auth.js'

import Wall from './screens/Wall.jsx'
import Letter from './screens/Letter.jsx'
import Find from './screens/Find.jsx'
import Write from './screens/Write.jsx'
import Posted from './screens/Posted.jsx'
import Join from './screens/Join.jsx'
import Gate from './screens/Gate.jsx'
import Remove from './screens/Remove.jsx'
import Report from './screens/Report.jsx'
import Intro from './Intro.jsx'

// The four faces, from this origin. They were fetched from Google until Phase
// 6b, which meant the wall's type depended on a third party being reachable and
// was the only cross-origin request the surface made. scripts/fetch-faces.mjs
// wrote them into app/public/fonts in Phase 2 and spec 7.2 wanted them self
// hosted anyway.
const FONTS = '/fonts/faces.css'

// What the field is doing under each screen. A screen may override its own
// transiently; the override is cleared by the next route change rather than by
// an effect, so a child's request can never be stamped on by its parent's.
const FIELD = {
  wall:   'drift',
  letter: 'slow',
  find:   'slow',
  write:  'drift',
  posted: 'drift',
  join:   'slow',
  gate:   'slow',
  remove: 'still',   // the room stops moving where the act cannot be undone
  report: 'still',   // and where something is coming down
}

// The intro plays once per tab and never again. It is held here rather than
// in the store because it is about THIS load: a person who refreshes has
// decided to start over and should get the whole thing, and a person walking
// back from a letter should not sit through a logo to do it.
let BOOTED = false

export default function WallApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname))
  // 0 the intro has the screen · 1 the wall is mounted and cascading under
  // a black that is on its way out · 2 the intro is gone
  const [boot, setBoot] = useState(() => (BOOTED ? 2 : 0))
  const [override, setOverride] = useState(null)
  const [veil, setVeil] = useState(false)
  const [lit, setLit] = useState(false)
  const cut = useRef(0)
  const reduce = useRef(prefersReducedMotion()).current

  // ── the corpus ──
  // One subscription for the whole surface. data.js is a cache now: the getters
  // answer instantly out of what has been fetched and this is what turns a
  // fetch landing into a re-render. Ten screens read the wall during render and
  // none of them has to know a network exists.
  const [, setRev] = useState(0)
  useEffect(() => subscribe(setRev), [])
  useEffect(() => { loadWall() }, [])

  // ── who this browser is ──
  // Asked once, on mount. Somebody who verified their campus address on their
  // phone last week comes back to the wall already through the gate, because
  // the session is a row rather than a flag in this tab.
  // The store is not something React watches, so the answer has to be turned
  // into a render or the gate keeps drawing the sign in form over a returning
  // member until the next route change. Its OWN state, not `rev`: `rev` is
  // set to the cache's revision number, and a counter bumped from two places
  // lands on the same number twice, which React reads as nothing changed.
  const [, setMemberRev] = useState(0)
  useEffect(() => { refreshMember().then(() => setMemberRev((n) => n + 1)) }, [])

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

    // ── the icon ──
    // The mark, in the tab, drawn from the same constants the mark on the
    // screen is drawn from. A second hand-drawn favicon would be a copy of a
    // shape that is still being tuned, and it would be the copy that shipped
    // wrong. Production's own icon is put back on the way out.
    //
    // INK, not chalk. Every desktop browser paints its tab strip near-white by
    // default, and the mark was being drawn in the one colour that is invisible
    // there: the tab showed an empty square. Drawn in ink it reads on that
    // strip, and the CHALK passed beside it is picked up by the icon's own
    // `prefers-color-scheme` rule on a dark strip (art.jsx eclipticSVG), so one
    // file covers both.
    const was = [...document.querySelectorAll('link[rel~="icon"]')]
    const icon = document.createElement('link')
    icon.rel = 'icon'
    icon.type = 'image/svg+xml'
    icon.href = `data:image/svg+xml,${encodeURIComponent(eclipticSVG(INK, CHALK))}`
    icon.dataset.wall = 'icon'
    was.forEach((el) => el.remove())
    document.head.appendChild(icon)

    const title = document.title
    document.title = 'celestual · berkeley · someone here wrote something they never sent'
    return () => {
      link.remove()
      icon.remove()
      was.forEach((el) => document.head.appendChild(el))
      document.title = title
    }
  }, [])

  // ── the scan ──
  // /berkeley?s=flyer-a is how the flyer, the card, the chalk and the table become
  // measurable against each other. Read once, attached to anything this
  // session creates, then scrubbed out of the URL — a source code riding along
  // into a link somebody pastes to a friend would attribute their scan to a
  // flyer they never saw.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search || '')
    const s = q.get('s')
    const source = normSource(s || getState().source)
    patch({ source })
    if (s) {
      // Logged once, at the moment of the scan, and only when the code actually
      // arrived in this URL. Logging it on every render of a session that
      // already carried one would make one flyer read as a hundred.
      if (source) logScan(source)
      q.delete('s')
      const rest = q.toString()
      window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : ''))
    }
  }, [])

  // The field lights once, under the wall's opening cascade, and it starts
  // while the intro still has the screen, behind an opaque black, so its
  // 1600ms fade is finished by the time that black lifts off it. A sky that
  // fades up AFTER the reveal is a second animation competing with the reveal
  // for the same frames.
  useEffect(() => {
    const t = setTimeout(() => setLit(true), reduce ? 0 : 60)
    return () => clearTimeout(t)
  }, [reduce])

  // ── the cut ──
  // Down to the void in 160ms, swap underneath, back up in 380ms. No sliding,
  // no shared element, no crossfade — and none of it at all for a sheet, which
  // rises over a wall that never went anywhere.
  // ── the history ──
  // Opening a sheet pushes an entry, and closing it used to push another, so
  // every sheet cost two entries and the browser's back button, pressed on the
  // bare wall, re-raised the sheet somebody had just closed. A sheet the shell
  // opened is closed by walking back over what it pushed: each sheet entry
  // carries its depth, and closing goes that many steps back to the wall entry
  // underneath, which onPop then renders. A sheet arrived at by deep link has
  // no depth and closes the old way.
  const leaving = useRef(false)
  const go = useCallback((name, id) => {
    if (leaving.current) return
    const to = href(name, id)
    if (to === window.location.pathname) return
    const from = parse(window.location.pathname)
    const target = parse(to)
    // A sheet opening or closing over the same underlying surface, or a pager
    // step inside one sheet, is not a navigation.
    const sheetMove = SHEETS.has(target.name) || (SHEETS.has(from.name) && target.name === 'wall')
    const depth = Number(window.history.state?.wallDepth) || 0

    if (SHEETS.has(from.name) && target.name === 'wall' && depth > 0) {
      leaving.current = true
      setOverride(null)
      window.history.go(-depth)
      return
    }

    const swap = () => {
      const nextDepth = SHEETS.has(target.name) ? (SHEETS.has(from.name) ? depth + 1 : 1) : 0
      window.history.pushState({ wall: name, wallDepth: nextDepth }, '', to)
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
      leaving.current = false
      if (!isWallPath(window.location.pathname)) { window.location.reload(); return }
      setOverride(null)
      setRoute(parse(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setField = useCallback((m) => setOverride(m), [])
  const back = useCallback(() => go('wall'), [go])
  const handOff = useCallback(() => setBoot(1), [])
  const settle = useCallback(() => { BOOTED = true; setBoot(2) }, [])

  const mode = override || FIELD[route.name] || 'drift'
  // Read on every render, which for this component means on every route
  // change — the only moment a screen under a sheet can come back into view.
  // It is what makes a name taken down on a sheet actually be gone from the
  // wall that sheet was raised over.
  const shared = { go, back, setField, reduce, rev: revision() }
  const onSheet = SHEETS.has(route.name)

  let sheet = null
  if (route.name === 'letter') sheet = <Letter id={route.id} {...shared} />
  if (route.name === 'find') sheet = <Find {...shared} />
  if (route.name === 'write') sheet = <Write to={route.id} {...shared} />
  if (route.name === 'gate') sheet = <Gate {...shared} />
  if (route.name === 'remove') sheet = <Remove handle={route.id} {...shared} />
  if (route.name === 'report') sheet = <Report id={route.id} {...shared} />

  let base
  switch (route.name) {
    case 'posted': base = <Posted {...shared} />; break
    case 'join':   base = <Join {...shared} />; break
    default:       base = <Wall {...shared} />   // and everything a sheet sits on
  }

  return (
    <div className="wl-root" data-route={route.name}>
      <Ground pace={mode} lit={lit} still={reduce} />

      {/* Nothing is mounted under the intro until it starts to lift, and
          then everything is: the wall's own cascade runs while the black is
          still on its way out, so the two read as one movement rather than as
          a logo followed by a page. */}
      {boot > 0 && (
        <>
          <main className={`wl-main${onSheet ? ' is-under' : ''}`} aria-hidden={onSheet || undefined}>
            {base}
          </main>
          {sheet}
        </>
      )}

      {boot < 2 && <Intro reduce={reduce} onReveal={handOff} onDone={settle} />}

      <div className={`wl-cut${veil ? ' is-down' : ''}`} aria-hidden="true" />
    </div>
  )
}

export { BASE }

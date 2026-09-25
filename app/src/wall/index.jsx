// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CELESTUAL · THE WALL — THE SHELL                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The event surface, and the product it hands off into. As of Phase 6b it
// reaches a server for everything it holds: the letters, the two gates, the
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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './wall.css'
// the wall is the phone (DESIGN.md 2.6): the layer over wall.css that draws
// every shared part in the phone's language, scoped to this shell's root
import './phone.css'
import { parse, href, isWallPath, SHEETS } from './router.js'
import { campus } from './campus.js'
import { eclipticSVG, INK, CHALK } from './art.jsx'
import { prefersReducedMotion, PhoneChrome } from './parts.jsx'
import Ground from './ground.jsx'
import { getState, patch, setCold, isCold } from './store.js'
import { normSource } from './seed.js'
import { revision, subscribe, warmWall, watchWall } from './data.js'
import { ensureFaces, warmType } from './type.js'
import { logScan } from './api.js'
import { refresh as refreshMember } from './auth.js'

import Wall from './screens/Wall.jsx'
import Letter from './screens/Letter.jsx'
import Find from './screens/Find.jsx'
import Write from './screens/Write.jsx'
import Join from './screens/Join.jsx'
import Gate from './screens/Gate.jsx'
import Remove from './screens/Remove.jsx'
import Report from './screens/Report.jsx'
import Ping from './screens/Ping.jsx'
import You from './screens/You.jsx'
import Reveal from './screens/Reveal.jsx'
import Intro from './Intro.jsx'

// What the field is doing under each screen. A screen may override its own
// transiently; the override is cleared by the next route change rather than by
// an effect, so a child's request can never be stamped on by its parent's.
const FIELD = {
  wall:   'drift',
  letter: 'slow',
  find:   'slow',
  write:  'drift',
  join:   'slow',
  gate:   'slow',
  remove: 'still',   // the room stops moving where the act cannot be undone
  report: 'still',   // and where something is coming down
  ping:   'slow',
  you:    'slow',
  reveal: 'still',   // and where two people have just found out
}

// The intro plays once per tab and never again. It is held here rather than
// in the store because it is about THIS load: a person who refreshes has
// decided to start over and should get the whole thing, and a person walking
// back from a letter should not sit through a logo to do it.
let BOOTED = false

// The longest the intro is held for the index and the first faces, measured
// from the shell mounting. The intro's own lift is at 2870ms, so on any
// ordinary connection this never applies; on a bad one the wall arrives with
// its monograms, which is a designed state, and the pictures fill in.
const READY_CEILING_MS = 4200

export default function WallApp() {
  const [route, setRoute] = useState(() => {
    const r = parse(window.location.pathname)
    // A tab that opens straight onto a letter's address, a link somebody
    // was sent, is COLD until it reaches the wall: that letter is the first
    // of the product the person sees, so it carries the name and a way in
    // (screens/Letter.jsx `LetterBrand`, store.js `isCold`). A letter this
    // shell pushed has the wall behind it and is not.
    if (r.name === 'letter' && !window.history.state?.wallPushed) setCold(true)
    return r
  })
  // 0 the intro has the screen · 1 the wall is mounted and cascading under
  // a black that is on its way out · 2 the intro is gone
  // A tab that opens on a mutual does not play the intro: the mutual tells
  // the same story on its own screen, and the second telling would be the
  // one that was waited through.
  const [boot, setBoot] = useState(() => (BOOTED || route.name === 'reveal' ? 2 : 0))
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
  // ── and the wall, live ──
  // The index is read again while the tab is on the screen, on a clock and
  // on a nudge from the campus's channel (data.js watchWall), so a letter
  // that goes up on another phone rises on this one.
  useEffect(() => watchWall(), [])

  // ── the wall, ready ──
  // The index, and then the pictures of the names that will be in the light
  // on the first screen, fetched and decoded while the intro still has the
  // screen (data.js warmWall). The intro holds its lift on this: the mark is
  // the one thing in the product built to be looked at while something else
  // finishes, and the wall is not drawn until its faces are there to draw.
  // With a ceiling, because a wall of monograms after four seconds is a wall
  // and a logo after four seconds is a stall. A tab that has already booted
  // is ready by definition.
  // And the faces (type.js): the wall's first frame is set in its own type
  // or not drawn yet, so nothing on it reflows when the faces land.
  const [ready, setReady] = useState(() => BOOTED)
  useEffect(() => {
    let alive = true
    let t = 0
    const up = () => { clearTimeout(t); if (alive) setReady(true) }
    Promise.all([warmWall(), warmType()]).then(up, up)
    t = setTimeout(up, READY_CEILING_MS)
    return () => { alive = false; clearTimeout(t) }
  }, [])

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
  // The four faces, from this origin, through the one module both shells
  // share (type.js). They were fetched from Google until Phase 6b, which
  // meant the wall's type depended on a third party being reachable and was
  // the only cross-origin request the surface made. Not in the shared
  // document: the desk sets its own type and should not pay for these.
  useEffect(() => {
    ensureFaces()

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
    document.title = campus().docTitle
    return () => {
      icon.remove()
      was.forEach((el) => document.head.appendChild(el))
      document.title = title
    }
  }, [])

  // ── the browser's bar ──
  // The wall is a black room and the bar above it takes the same black,
  // before the first paint. The front door's colour goes back on the way out.
  useLayoutEffect(() => {
    const tc = document.querySelector('meta[name="theme-color"]')
    const was = tc && tc.content
    if (tc) tc.content = '#000000'
    return () => { if (tc && was) tc.content = was }
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
  // A step back whose popstate never comes (a browser that drops it, or a
  // go() that lands while another is pending) must not leave the sheet up
  // with every way out ignored, so after a beat the wall is put back by hand.
  const stepTimer = useRef(0)
  const stepBack = useCallback((n) => {
    const at = window.location.pathname
    window.clearTimeout(stepTimer.current)
    stepTimer.current = window.setTimeout(() => {
      if (!leaving.current || window.location.pathname !== at) return
      leaving.current = false
      const to = href('wall')
      window.history.pushState({ wall: 'wall', wallDepth: 0, wallPushed: true }, '', to)
      setOverride(null)
      setRoute(parse(to))
    }, 700)
    window.history.go(n)
  }, [])
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
    // Whether the sheets stacked here stand on a sheet the browser opened on
    // directly (a mail's /sky, a shared reveal) rather than on the wall. The
    // bottom of such a stack is that sheet, depth zero, and it is carried up
    // the stack as `wallCold` on every entry pushed over it.
    const onCold = SHEETS.has(from.name) && (depth === 0 || !!window.history.state?.wallCold)

    if (SHEETS.has(from.name) && target.name === 'wall' && depth > 0) {
      // Stepping back all the way would land on that first sheet and not
      // on the wall: "back to the wall" on a ping placed from the account a
      // mail opened came back to the account. So the wall is pushed instead,
      // as `pushWall` does for a letter reached from a link.
      if (onCold) {
        const home = href('wall')
        window.history.pushState({ wall: 'wall', wallDepth: 0, wallPushed: true }, '', home)
        setOverride(null)
        setRoute(parse(home))
        return
      }
      leaving.current = true
      setOverride(null)
      stepBack(-depth)
      return
    }

    // Turning to the next letter takes the place of the one on the glass
    // rather than stacking on it, so closing goes straight back to what the
    // first letter was opened from instead of back through every letter read.
    if (from.name === 'letter' && target.name === 'letter') {
      window.history.replaceState({ ...window.history.state, wall: name }, '', to)
      setOverride(null)
      setRoute(target)
      return
    }

    const swap = () => {
      const nextDepth = SHEETS.has(target.name) ? (SHEETS.has(from.name) ? depth + 1 : 1) : 0
      // `wallPushed` marks an entry THIS shell put on the stack, which is the
      // one fact `up` needs and the one `wallDepth` cannot carry: a sheet the
      // browser opened on directly is depth zero AND has nothing behind it,
      // while a sheet at depth one that the shell pushed has the wall behind
      // it. Reading depth alone confuses the two in both directions.
      const cold = SHEETS.has(target.name) && onCold ? { wallCold: true } : null
      window.history.pushState({ wall: name, wallDepth: nextDepth, wallPushed: true, ...cold }, '', to)
      setOverride(null)
      setRoute(target)
      if (!sheetMove) window.scrollTo(0, 0)
      setVeil(false)
    }

    if (sheetMove || reduce) { swap(); return }
    setVeil(true)
    window.clearTimeout(cut.current)
    cut.current = window.setTimeout(swap, 160)
  }, [reduce, stepBack])

  useEffect(() => () => { window.clearTimeout(cut.current); window.clearTimeout(stepTimer.current) }, [])

  // Back and forward. Backing out past the entry point is a real navigation:
  // this tree replaced the production app at mount, so there is nothing here
  // to render a production route with.
  useEffect(() => {
    const onPop = () => {
      leaving.current = false
      window.clearTimeout(stepTimer.current)
      if (!isWallPath(window.location.pathname)) { window.location.reload(); return }
      setOverride(null)
      setRoute(parse(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setField = useCallback((m) => setOverride(m), [])
  // all the way out: to the wall, whatever is stacked over it. The one
  // screen that wants this is the composer once its letter is up, because
  // the letter is ON the wall and the wall is what there is to see.
  const back = useCallback(() => go('wall'), [go])
  // ── one step up ──
  // A sheet closes onto whatever it was opened FROM, not onto the wall: the
  // report opened on a letter comes back to that letter, the gate opened
  // part way through the composer comes back to the composer, and a sheet
  // opened from the wall comes back to the wall.
  //
  // The question is only ever "did this shell push the entry I am standing
  // on", and `wallPushed` answers it. If it did, the entry underneath is one
  // the shell wrote and one step back renders it, whatever it is. If it did
  // not — the browser opened directly on this address — then there is
  // nothing behind it at all and stepping back would leave the product, so
  // the way out is to push the wall.
  //
  // Depth is the wrong question here and reading it got this wrong twice
  // over. A deep-linked sheet is depth zero with nothing behind it; a report
  // opened on a deep-linked letter is depth one WITH something behind it;
  // and a letter opened from the wall is also depth one. No threshold on
  // depth separates those three, which is why this asks about the push.
  const up = useCallback(() => {
    if (leaving.current) return
    if (window.history.state?.wallPushed) {
      leaving.current = true; setOverride(null); stepBack(-1); return
    }
    go('wall')
  }, [go, stepBack])
  // ── and what is under this sheet, so the close mark can say so ──
  // Read at render, which for this component is every route change, so a
  // sheet knows on its first frame where its way out actually goes. A mark
  // labelled "back to the wall" that lands on the composer is a mark that
  // lied, and a screen reader hears the lie.
  // A sheet over a sheet a link opened is nested too: one step up is that
  // sheet, not the wall.
  const st = window.history.state
  const nested = !!(st?.wallPushed && (Number(st.wallDepth) > 1 || st.wallCold))
  const upLabel = nested ? 'back' : 'back to the wall'
  // ── the way to the wall, from a letter reached from a link ──
  // `toWall` is pressed while the letter is still on the glass: the wall
  // under it drops its veil there and then (screens/Wall.jsx `open`), so the
  // closing letter reveals the names rather than the poster and a second
  // `view the wall`. `pushWall` is where the sheet lands once it has gone:
  // a NEW wall entry, because `go('wall')` from a letter pushed on top of the
  // link (after a sign in, say) steps back through history to the link's
  // letter, which is the one screen the person just asked to leave.
  const [opened, setOpened] = useState(0)
  const toWall = useCallback(() => { setCold(false); setOpened((n) => n + 1) }, [])
  const pushWall = useCallback(() => {
    if (leaving.current) return
    const to = href('wall')
    window.history.pushState({ wall: 'wall', wallDepth: 0, wallPushed: true }, '', to)
    setOverride(null)
    setRoute(parse(to))
  }, [])
  const cold = route.name === 'letter' && isCold()
  const handOff = useCallback(() => setBoot(1), [])
  const settle = useCallback(() => { BOOTED = true; setBoot(2) }, [])

  const mode = override || FIELD[route.name] || 'drift'
  // Read on every render, which for this component means on every route
  // change — the only moment a screen under a sheet can come back into view.
  // It is what makes a name taken down on a sheet actually be gone from the
  // wall that sheet was raised over.
  const onSheet = SHEETS.has(route.name)
  // `under` is whether a sheet is up over the wall: the hive stops moving and
  // stops writing to the DOM while it is dimmed and blurred behind one.
  const shared = { go, back, up, nested, upLabel, setField, reduce, rev: revision(), under: onSheet, cold, toWall, pushWall }

  let sheet = null
  if (route.name === 'letter') sheet = <Letter id={route.id} {...shared} />
  if (route.name === 'find') sheet = <Find {...shared} />
  if (route.name === 'write') sheet = <Write to={route.id} {...shared} />
  if (route.name === 'gate') sheet = <Gate {...shared} />
  if (route.name === 'remove') sheet = <Remove handle={route.id} {...shared} />
  if (route.name === 'report') sheet = <Report id={route.id} {...shared} />
  if (route.name === 'ping') sheet = <Ping to={route.id} {...shared} />
  if (route.name === 'you') sheet = <You {...shared} />
  if (route.name === 'reveal') sheet = <Reveal id={route.id} {...shared} />

  let base
  switch (route.name) {
    case 'join':   base = <Join {...shared} />; break
    default:       base = <Wall {...shared} open={opened} />   // and everything a sheet sits on
  }

  return (
    <PhoneChrome.Provider value>
    <div className="wl-root is-room" data-route={route.name}>
      <Ground pace={mode} lit={lit} still={reduce} room />

      {/* Nothing is mounted under the intro until it starts to lift, and
          then everything is: the wall's own cascade runs while the black is
          still on its way out, so the two read as one movement rather than as
          a logo followed by a page. */}
      {boot > 0 && (
        <>
          {/* hidden under a sheet, and out of the tab order, so the tab key
              stays on the sheet and never walks into the wall behind it. Not
              by `inert` here: inert on the wall's root restyled every element
              of a hundred small screens on the frame a letter opened and
              again on the frame it closed. The wall makes the rest of itself
              inert and takes its screens out of the tab order (`under`,
              screens/Wall.jsx and Hive.jsx) */}
          <main className={`wl-main${onSheet ? ' is-under' : ''}`} aria-hidden={onSheet || undefined}>
            {base}
          </main>
          {sheet}
        </>
      )}

      {boot < 2 && <Intro reduce={reduce} ready={ready} onReveal={handOff} onDone={settle} />}

      <div className={`wl-cut${veil ? ' is-down' : ''}`} aria-hidden="true" />
    </div>
    </PhoneChrome.Provider>
  )
}


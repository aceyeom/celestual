// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MAIN, THE SHELL                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Phase 6b. The Phase 3 signature surfaces were built at `/signature` and
// `/signature/reveal`, which was always a preview address: docs/launchsteps.md
// section 0c records that the hero becomes `/` and the reveal folds into the
// core service once there is something behind them. There was, and this
// shell drew all of it: the front door, the flow, the list and the mutual.
//
// ── and then the ping came home ─────────────────────────────────────────────
// The wall is where people are when a ping occurs to them, so placing one is
// a sheet on the wall now, and so is the list of what they have out and the
// mutual itself (wall/screens/Ping.jsx, You.jsx). Their old addresses are
// rewritten onto the wall before a shell is chosen (main.jsx). What is left
// here is the three addresses that arrive from outside the product: the opt
// out, and the two links out of a mail. They keep the design they were drawn
// in, and every way out of them leads back to the wall.
//
// It owns two things, as it always did:
//
//   the faces     injected here from this origin, four files, and removed on
//                 unmount so they are never fetched on a route that has no use
//                 for them
//   the ground    wall/ground.jsx: the plasma, the halo, ONE field, and the
//                 grain, mounted once and living across every route change
//                 rather than restarting on each. The same component the wall
//                 mounts, so the two surfaces are one room
//
// The intro is not one of them any more. It opened the front door, and the
// front door is the wall's.
//
// The system is app/src/wall/wall.css. Nothing here invents a token, a radius,
// a face or a duration.
import { useCallback, useEffect, useRef, useState } from 'react'
import '../wall/wall.css'
import '../signature/signature.css'
import './main.css'
import Ground from '../wall/ground.jsx'
import { HOME_BASE } from '../wall/router.js'
import { parse, href } from './router.js'
import Optout from './Optout.jsx'
import Copy from './Copy.jsx'
import Signin from './Signin.jsx'
import NotFound from './NotFound.jsx'
import { me as whoAmI } from './data.js'
import { ANON } from '../api/identity.js'
import { ensureFaces } from '../wall/type.js'

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// ── the names that moved ────────────────────────────────────────────────────
// Every screen here still says where it is going by name: the brand goes to
// 'hero', the chip to 'sky', a mailed sign in to 'place'. Those are the
// wall's now, and a push inside this shell never passes the fork in main.jsx
// that would have sent them there. So they leave by a real navigation, to the
// wall that is home, and the shell's own history is not asked to draw a
// screen it no longer has.
const MOVED = {
  hero:   () => HOME_BASE || '/',
  place:  (id) => `${HOME_BASE}/ping${id ? `/${encodeURIComponent(id)}` : ''}`,
  sky:    () => `${HOME_BASE}/you`,
  reveal: (id) => `${HOME_BASE}/reveal/${encodeURIComponent(id || '')}`,
}

export default function MainApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname) || { name: 'missing' })
  const [who, setWho] = useState(ANON)
  // Whether whoami has answered at all. Until it has, `who` is the null
  // identity by construction and not by fact, and a screen waits rather than
  // drawing the signed out state over somebody who is signed in.
  const [known, setKnown] = useState(false)
  const still = useRef(prefersReducedMotion()).current

  // ── the faces ──
  // Local, fetched by main.jsx beside this chunk, and linked here through the
  // one module both shells share (type.js).
  useEffect(() => { ensureFaces() }, [])

  // ── who this is ──
  // Asked once. Somebody who proved their handle on the wall, or their campus
  // address there, arrives here already known: one row, one session, both
  // surfaces (spec section 3).
  useEffect(() => {
    let alive = true
    whoAmI().then((u) => { if (alive) { setWho(u); setKnown(true) } })
    return () => { alive = false }
  }, [])

  const refreshWho = useCallback(async () => {
    const u = await whoAmI()
    setWho(u)
    setKnown(true)
    return u
  }, [])

  // ── the address ──
  const go = useCallback((name, id) => {
    if (MOVED[name]) { window.location.assign(MOVED[name](id)); return }
    const to = href(name, id)
    if (to === window.location.pathname) return
    window.history.pushState({ main: name }, '', to)
    setRoute(parse(to) || { name: 'missing' })
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname) || { name: 'missing' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const shared = { go, who, known, refreshWho, still }

  return (
    <div className="wl-root sg-root mn-root">
      <Ground still={still} />
      {route.name === 'optout' ? <Optout {...shared} />
        : route.name === 'copy' ? <Copy {...shared} />
        : route.name === 'signin' ? <Signin {...shared} />
        : <NotFound {...shared} />}
    </div>
  )
}

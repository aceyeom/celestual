// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MAIN, THE SHELL                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Phase 6b. The Phase 3 signature surfaces were built at `/signature` and
// `/signature/reveal`, which was always a preview address: docs/launchsteps.md
// section 0c records that the hero becomes `/` and the reveal folds into the
// core service once there is something behind them. There is now.
//
// So this shell is the Phase 3 shell, promoted. It owns the same three things
// that file owned, for the same reasons:
//
//   the faces     injected here from this origin, four files, and removed on
//                 unmount so they are never fetched on a route that has no use
//                 for them
//   the ground    wall/ground.jsx: the plasma, the halo, ONE field, and the
//                 grain, mounted once and living across every route change
//                 rather than restarting on each. The same component the wall
//                 mounts, so the two surfaces are one room
//   the intro     wall/Intro.jsx, once per tab, over the front door only. The
//                 same two seconds the wall opens on
//
// The system is app/src/wall/wall.css. Nothing here invents a token, a radius,
// a face or a duration.
//
// ── what is different from the preview ──────────────────────────────────────
// The hero's numbers come off wall_index, the reveal is driven by a mutual that
// actually happened, and there is a flow between them. The field, the mark's
// two orbits and the type are unchanged: they were approved as they stand.
import { useCallback, useEffect, useRef, useState } from 'react'
import '../wall/wall.css'
import '../signature/signature.css'
import './main.css'
import Ground from '../wall/ground.jsx'
import Intro from '../wall/Intro.jsx'
import { parse, href } from './router.js'
import Hero from './Hero.jsx'
import Place from './Place.jsx'
import Sky from './Sky.jsx'
import Reveal from './Reveal.jsx'
import Optout from './Optout.jsx'
import Copy from './Copy.jsx'
import Signin from './Signin.jsx'
import NotFound from './NotFound.jsx'
import { me as whoAmI } from './data.js'
import { ANON } from '../api/identity.js'

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// The intro plays once per tab and never again, and only over the front door.
// Held here rather than in storage because it is about THIS load: a refresh
// starts over and gets the whole thing, and a person walking back to `/` from
// their sky should not sit through a logo to do it.
let BOOTED = false

// `/?nointro=1`, in development only, for the screenshot loop: the page without
// the two seconds in front of it. Nothing in production reads the query string.
function skipIntro() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('nointro')
}

export default function MainApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname) || { name: 'missing' })
  // 0 the intro has the screen · 1 the page is mounted and rising under a black
  // that is on its way out · 2 the intro is gone
  const [boot, setBoot] = useState(() => (BOOTED || route.name !== 'hero' || skipIntro() ? 2 : 0))
  const handOff = useCallback(() => setBoot(1), [])
  const settle = useCallback(() => { BOOTED = true; setBoot(2) }, [])
  const [who, setWho] = useState(ANON)
  const still = useRef(prefersReducedMotion()).current

  // ── the faces ──
  // Local, and the display face preloaded rather than merely linked: a serif
  // arriving two hundred milliseconds after the layout is a page that visibly
  // changes its mind, and this is the first thing a person sees of the product.
  useEffect(() => {
    const added = []
    const pre = document.createElement('link')
    pre.rel = 'preload'
    pre.as = 'font'
    pre.type = 'font/woff2'
    pre.crossOrigin = 'anonymous'
    pre.href = '/fonts/newsreader-normal-200-800-latin.woff2'
    document.head.appendChild(pre)
    added.push(pre)

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = '/fonts/faces.css'
    css.dataset.main = 'faces'
    document.head.appendChild(css)
    added.push(css)

    // The liquid mark's texture, for the intro, which has the mark on screen
    // at 180ms. A hundred and forty kilobytes fetched with the face rather than
    // after the shader mounts.
    if (route.name === 'hero') {
      const tex = document.createElement('link')
      tex.rel = 'preload'
      tex.as = 'image'
      tex.href = '/liquid-mark.png'
      document.head.appendChild(tex)
      added.push(tex)
    }

    return () => { for (const el of added) el.remove() }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── who this is ──
  // Asked once. Somebody who proved their handle on the wall, or their campus
  // address there, arrives here already known: one row, one session, both
  // surfaces (spec section 3).
  useEffect(() => {
    let alive = true
    whoAmI().then((u) => { if (alive) setWho(u) })
    return () => { alive = false }
  }, [])

  const refreshWho = useCallback(async () => {
    const u = await whoAmI()
    setWho(u)
    return u
  }, [])

  // ── the address ──
  const go = useCallback((name, id) => {
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

  const shared = { go, who, refreshWho, still }

  return (
    <div className="wl-root sg-root mn-root">
      <Ground still={still} />

      {/* Nothing is mounted under the intro until it starts to lift, and then
          the hero is: its own entrance runs while the black is still leaving,
          so the two read as one movement rather than a logo then a page. */}
      {boot > 0 && (
        route.name === 'place' ? <Place {...shared} to={route.to} />
          : route.name === 'sky' ? <Sky {...shared} />
          : route.name === 'reveal' ? <Reveal {...shared} id={route.id} />
          : route.name === 'optout' ? <Optout {...shared} />
          : route.name === 'copy' ? <Copy {...shared} />
          : route.name === 'signin' ? <Signin {...shared} />
          : route.name === 'missing' ? <NotFound {...shared} />
          : <Hero {...shared} />
      )}

      {boot < 2 && <Intro reduce={still} onReveal={handOff} onDone={settle} />}
    </div>
  )
}

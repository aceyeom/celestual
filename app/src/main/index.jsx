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
//   the ground    the halo, ONE field, and the grain, mounted once and living
//                 across every route change rather than restarting on each
//   the hand      one pointer listener. It feeds the field's parallax and
//                 writes --px and --py on the root for anything leaning on the
//                 hand in CSS
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
import { mountField } from '../signature/field.js'
import { parse, href } from './router.js'
import Hero from './Hero.jsx'
import Place from './Place.jsx'
import Sky from './Sky.jsx'
import Reveal from './Reveal.jsx'
import { me as whoAmI } from './data.js'
import { ANON } from '../api/identity.js'

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export default function MainApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname) || { name: 'hero' })
  const [who, setWho] = useState(ANON)
  const root = useRef(null)
  const canvas = useRef(null)
  const still = useRef(prefersReducedMotion()).current

  // ── the faces ──
  // Local, and the display face preloaded rather than merely linked: a Didone
  // arriving two hundred milliseconds after the layout is a page that visibly
  // changes its mind, and this is the first thing a person sees of the product.
  useEffect(() => {
    const added = []
    const pre = document.createElement('link')
    pre.rel = 'preload'
    pre.as = 'font'
    pre.type = 'font/woff2'
    pre.crossOrigin = 'anonymous'
    pre.href = '/fonts/bodoni-moda-normal-400-latin.woff2'
    document.head.appendChild(pre)
    added.push(pre)

    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = '/fonts/faces.css'
    css.dataset.main = 'faces'
    document.head.appendChild(css)
    added.push(css)

    return () => { for (const el of added) el.remove() }
  }, [])

  // ── the field ──
  // One instance, mounted here, persisting across every route change. That is
  // what makes it the room these screens are in rather than a background each
  // of them owns a copy of.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const field = mountField(cv)

    function onMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      field.point && field.point(x, y)
      const el = root.current
      if (el && !still) {
        el.style.setProperty('--px', x.toFixed(3))
        el.style.setProperty('--py', y.toFixed(3))
      }
    }
    if (!still) window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      field.stop && field.stop()
    }
  }, [still])

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
    setRoute(parse(to) || { name: 'hero' })
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname) || { name: 'hero' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const shared = { go, who, refreshWho, still }

  return (
    <div className="wl-root sg-root mn-root" ref={root}>
      <div className="wl-ground">
        <div className="wl-halo" />
        <canvas ref={canvas} className="wl-starfield sg-field" aria-hidden="true" />
        <div className="wl-grain" />
      </div>

      {route.name === 'place' ? <Place {...shared} to={route.to} />
        : route.name === 'sky' ? <Sky {...shared} />
        : route.name === 'reveal' ? <Reveal {...shared} id={route.id} />
        : <Hero {...shared} />}
    </div>
  )
}

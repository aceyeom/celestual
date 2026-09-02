// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SIGNATURE SURFACES, THE SHELL                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// docs/rebuild-spec.md Phase 3. Two surfaces and nothing else: the Main hero,
// and the mutual reveal. Static, with the data shapes the schema will carry, and
// no backend behind either of them.
//
// They live at /signature and /signature/reveal for now. That is a preview
// address, not the shipping one: the hero becomes `/` and the reveal becomes a
// state of the core service in Phase 6b, when there is something to wire them
// to. Mounting them there today would mean doing Phase 6b's routing inside
// Phase 3 and taking the production landing down to do it.
//
// This file owns the three things both surfaces share:
//
//   the faces     injected here from this origin, and removed on unmount, so
//                 four font files are never fetched on a production route
//   the ground    the halo, ONE field, and the grain, mounted once and living
//                 across the route change rather than restarting on it
//   the hand      one pointer listener. It feeds the field's parallax and
//                 writes --px and --py on the root for anything that wants to
//                 lean on the hand in CSS
//
// The system is app/src/wall/wall.css. Nothing here invents a token, a radius,
// a face or a duration; signature.css only says how these two surfaces are laid
// out with them.

import { useEffect, useRef, useState } from 'react'
import '../wall/wall.css'
import './signature.css'
import { mountField } from './field.js'
import Hero from './Hero.jsx'
import Reveal from './Reveal.jsx'

export const BASE = '/signature'

export function isSignaturePath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '')
  return p === BASE || p.startsWith(BASE + '/')
}

function parse(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '')
  return p === BASE + '/reveal' ? 'reveal' : 'hero'
}

export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export default function SignatureApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname))
  const root = useRef(null)
  const canvas = useRef(null)
  const still = useRef(prefersReducedMotion()).current

  // ── the faces ──
  // Local, and preloaded rather than merely linked: the display face is the
  // first thing a person sees on this surface, and a Didone arriving two
  // hundred milliseconds after the layout is a page that visibly changes its
  // mind. app/index.html fetches production's three faces on every route, so
  // these are added here and taken away again on the way out.
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
    css.dataset.signature = 'faces'
    document.head.appendChild(css)
    added.push(css)

    return () => { for (const el of added) el.remove() }
  }, [])

  // ── the field ──
  // One instance, mounted here, persisting across the route change. That is
  // what makes it the room these two surfaces are both in rather than a
  // background image each of them owns a copy of.
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const field = mountField(cv)

    // One listener for the whole shell. It moves the field and it writes the
    // hand onto the root, where the type reads it. Two consumers, one event,
    // and no component anywhere else has to know a pointer exists.
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

  // ── the address ──
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="wl-root sg-root" ref={root}>
      <div className="wl-ground">
        <div className="wl-halo" />
        <canvas ref={canvas} className="wl-starfield sg-field" aria-hidden="true" />
        <div className="wl-grain" />
      </div>

      {/* Two addresses, and deliberately no link between them. The reveal is
          not somewhere a person goes from the front door: it is what happens
          when somebody they never named turns out to have named them. A button
          on the hero that jumps to it would be the one lie this surface could
          tell about the mechanic. */}
      {route === 'reveal' ? <Reveal /> : <Hero still={still} />}
    </div>
  )
}

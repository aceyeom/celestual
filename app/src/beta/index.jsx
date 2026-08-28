// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CELESTUAL · /beta — THE LAYOUT                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The whole beta hangs off this one component, and main.jsx lazy-loads it only
// when the path starts with /beta. That is the entire integration: production
// never imports anything under src/beta, and nothing under src/beta is in the
// bundle a person on the hero page downloads.
//
// This file owns the four things that are true across every screen:
//   · the faces        — injected here, removed on unmount, so the four beta
//                        faces are never fetched on a production route
//   · the cut          — 180ms down, 420ms up, no slide
//   · the sky          — one instance, persisting across route changes, which
//                        is what makes it connective tissue rather than a
//                        background image ten screens each have a copy of
//   · the scan         — ?s= is read once, logged, and scrubbed from the URL

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './beta.css'
import Sky, { focusCandidates, prefersReducedMotion } from './Sky.jsx'
import { parse, href, isBetaPath, BASE } from './router.js'
import { repo } from './data/index.js'
import { getState, patch } from './store.js'
import { normSource } from './data/seed.js'

import Threshold from './screens/Threshold.jsx'
import Look from './screens/Look.jsx'
import LetterFound from './screens/LetterFound.jsx'
import Nothing from './screens/Nothing.jsx'
import Write from './screens/Write.jsx'
import Sealing from './screens/Sealing.jsx'
import Claim from './screens/Claim.jsx'
import Ask from './screens/Ask.jsx'
import SkyScreen from './screens/SkyScreen.jsx'
import CoreApp from './screens/CoreApp.jsx'

const FONTS = 'https://fonts.googleapis.com/css2'
  + '?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400'
  + '&family=EB+Garamond:wght@400;500'
  + '&family=Geist+Mono:wght@400'
  + '&family=Inter+Tight:wght@400;500'
  + '&display=swap'

// What the field is doing on each screen, and why, is documented in Sky.jsx.
// A screen may override its own mode transiently (the search slowing to a
// stop); the override is cleared by the next route change rather than by an
// effect, so a child's mode can never be stamped on by its parent's.
const SKY = {
  threshold: 'ambient',
  look: 'ambient',
  letter: 'dim',
  nothing: 'still',
  write: 'ambient',
  sealing: 'ambient',
  claim: 'dim',
  ask: 'dim',
  sky: 'forward',
  app: 'ambient',
}

// Which point in the field is yours. Derived from the letter id (or, before
// there is one, from the handle typed) so it is the same point on the letter
// screen, on the ask, and afterwards in the field it went back into.
function pointIndex(key, count) {
  if (!key || !count) return null
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0
  // Hashed into the band Sky.jsx reserves for it, not into the whole field —
  // see focusCandidates() for why your point is never at the edge.
  const band = focusCandidates(count)
  return band[h % band.length]
}

export default function BetaApp() {
  const [route, setRoute] = useState(() => parse(window.location.pathname))
  const [override, setOverride] = useState(null)
  const [count, setCount] = useState(0)
  const [veil, setVeil] = useState(false)
  const [lit, setLit] = useState(false)
  const cut = useRef(0)

  // ── the faces ──
  // Injected on mount and removed on unmount. app/index.html fetches the three
  // production faces for every route and this build needs four different ones;
  // adding them to the shared document would put four extra font files in front
  // of every visitor to the hero page to serve a route reached only by QR code.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS
    link.dataset.beta = 'faces'
    document.head.appendChild(link)
    const title = document.title
    document.title = 'celestual — someone here wrote something they never sent'
    return () => {
      link.remove()
      document.title = title
    }
  }, [])

  // ── the scan ──
  // /beta?s=flyer-a is how the flyer, the card, the chalk and the booth become
  // measurable against each other. Read once, logged, attached to anything this
  // session creates, then scrubbed out of the URL — a source code that rides
  // along into a link somebody pastes to a friend attributes their scan to a
  // flyer they never saw.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search || '')
    const s = q.get('s')
    const code = normSource(s || getState().source)
    patch({ source: code })
    repo.logScan(code)
    if (s) {
      q.delete('s')
      const rest = q.toString()
      window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : ''))
    }
  }, [])

  // The field's density is the wall's real size. A sparse sky is honest.
  useEffect(() => {
    let alive = true
    repo.liveCount().then((n) => { if (alive) setCount(n) })
    return () => { alive = false }
  }, [route.name])

  // The sky fades in over 1400ms, once, under the Threshold's load sequence.
  useEffect(() => {
    if (lit || !count) return
    const t = setTimeout(() => setLit(true), prefersReducedMotion() ? 0 : 40)
    return () => clearTimeout(t)
  }, [count, lit])

  // ── the cut ──
  // Down to --void in 180ms, swap underneath, back up in 420ms. No sliding, no
  // shared element, no crossfade. This is a film company and the transition
  // language is a cut.
  const go = useCallback((name, id) => {
    const to = href(name, id)
    if (to === window.location.pathname) return
    const quick = prefersReducedMotion()
    setVeil(true)
    window.clearTimeout(cut.current)
    cut.current = window.setTimeout(() => {
      window.history.pushState({ beta: name }, '', to)
      setOverride(null)
      setRoute(parse(to))
      window.scrollTo(0, 0)
      setVeil(false)
    }, quick ? 60 : 180)
  }, [])

  useEffect(() => () => window.clearTimeout(cut.current), [])

  // Back and forward. Back out of the beta entirely — past the entry point —
  // is a real navigation: this tree replaced the production app at mount, so
  // there is nothing here to render a production route with.
  useEffect(() => {
    const onPop = () => {
      if (!isBetaPath(window.location.pathname)) { window.location.reload(); return }
      setOverride(null)
      setRoute(parse(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setSkyMode = useCallback((m) => setOverride(m), [])
  const restart = useCallback(() => { window.location.assign(BASE) }, [])

  const mode = override || SKY[route.name] || 'ambient'
  // The fallback matters: /beta/sky opened directly, with no session behind it,
  // still has to have a centre for the orbit rings — a dissolve screen whose one
  // ornament silently does not render is worse than one that picks a point.
  const yours = useMemo(
    () => pointIndex(route.id || getState().query || getState().handle || 'celestual', count),
    [route.id, route.name, count],
  )

  // `yours` only lights up once a letter has actually been found — before that
  // there is no "your point", and a field with one point already brighter than
  // the rest is a field that has answered the question before it was asked.
  const litPoint = ['letter', 'claim', 'ask', 'sky', 'app'].includes(route.name) ? yours : null

  const shared = { go, setSkyMode, count, yours, restart }

  let screen = null
  switch (route.name) {
    case 'look':    screen = <Look {...shared} />; break
    case 'letter':  screen = <LetterFound id={route.id} {...shared} />; break
    case 'nothing': screen = <Nothing {...shared} />; break
    case 'write':   screen = <Write {...shared} />; break
    case 'sealing': screen = <Sealing {...shared} />; break
    case 'claim':   screen = <Claim id={route.id} {...shared} />; break
    case 'ask':     screen = <Ask id={route.id} {...shared} />; break
    case 'sky':     screen = <SkyScreen {...shared} />; break
    case 'app':     screen = <CoreApp {...shared} />; break
    default:        screen = <Threshold {...shared} />
  }

  return (
    <div className="beta-root">
      <Sky count={count} mode={mode} yours={litPoint} parallax={route.name === 'sky'} hidden={!lit} />
      <main key={`${route.name}:${route.id || ''}`}>{screen}</main>
      <div className={`beta-veil${veil ? ' is-down' : ''}`} />
    </div>
  )
}

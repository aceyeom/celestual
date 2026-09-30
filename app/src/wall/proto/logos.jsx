// ── the mark, told other ways ───────────────────────────────────────────────
//
// The intro, the door and the mutual all tell the mark the same way (the
// run, the catch, the glide). These are the other tellings (scenes/), each
// on the intro's own phone and glass, side by side, for choosing which
// screen tells which. Development only: served by the dev server at
// /logos.html, which the build never takes (app/logos.html).
//
//   /logos.html               all of them, each playing once
//   /logos.html?only=bench    one of them, larger
//   /logos.html?t=4200        every one held at 4200ms (for pictures), and
//   /logos.html?t=900,2400    each held at each of those, side by side
//   /logos.html?loop=1        each told again after it lands, for good
//
// A tap on a phone, or its replay, tells it again from the empty glass.

import { StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import '../wall.css'
import '../phone.css'
import './logos.css'
import { Screen } from '../screen.jsx'
import { PhoneChrome } from '../parts.jsx'
import PixelStory, { SQUARE } from '../PixelStory.jsx'
import { ensureFaces } from '../type.js'
import { SCENES } from '../scenes/index.js'

const ask = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const ONLY = ask.get('only') || ''
const HELDS = ask.get('t') === null ? [null] : ask.get('t').split(',').map((v) => Math.max(0, Number(v) || 0))
const LOOK = { tint: 'night' }
const NO_KEYS = {}
// how long a landed mark stands before a looping telling starts again
const REST = 1800

function Card({ scene, run, loop, held: HELD = null }) {
  const story = useMemo(() => scene.make(), [scene])
  const [from, setFrom] = useState(null)
  const [n, setN] = useState(0)
  const timer = useRef(0)
  const again = () => {
    story.prime(40)
    setFrom(performance.now() + 30)
    setN((k) => k + 1)
  }
  // told on mount, when everything is told again, and again after it lands
  // while looping
  useEffect(() => { if (HELD === null) again() }, [run]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    clearTimeout(timer.current)
    if (!loop || from === null) return undefined
    timer.current = setTimeout(again, Math.max(0, from - performance.now()) + scene.ms + REST)
    return () => clearTimeout(timer.current)
  }, [loop, from]) // eslint-disable-line react-hooks/exhaustive-deps
  const at = HELD !== null ? HELD : from === null ? 0 : null
  return (
    <article className="lg-card" data-scene={scene.id}>
      <div
        className="lg-phone" role="button" tabIndex={0} aria-label={`replay ${scene.name}`}
        onClick={again} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); again() } }}
      >
        <Screen look={LOOK} seed={`logo-${scene.id}`} keys={NO_KEYS} live={false} style={SQUARE}>
          <PixelStory story={story} at={at} from={from} />
        </Screen>
      </div>
      <div className="lg-bar" aria-hidden="true">
        {HELD === null ? <i key={n} style={{ animation: `lg-run ${scene.ms}ms linear forwards` }} /> : null}
      </div>
      <p className="lg-name"><b>{scene.name}{HELD !== null ? ` @${HELD}` : ''}</b><span>{(scene.ms / 1000).toFixed(1)}s · for {scene.for}</span></p>
      <p className="lg-line">{scene.line}</p>
      <div className="lg-row">
        <button type="button" className="lg-btn is-main" onClick={again}>replay</button>
        {ONLY ? <a href="/logos.html">all of them</a> : <a href={`/logos.html?only=${scene.id}`}>larger</a>}
      </div>
    </article>
  )
}

function Logos() {
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('wl-bleed', 'wl-dark')
    return () => html.classList.remove('wl-bleed', 'wl-dark')
  }, [])
  const [run, setRun] = useState(0)
  const [loop, setLoop] = useState(ask.get('loop') === '1')
  const shown = SCENES.filter((s) => !ONLY || s.id === ONLY)
  return (
    <PhoneChrome.Provider value>
      <style>{'@keyframes lg-run { from { transform: scaleX(0); } to { transform: scaleX(1); } }'}</style>
      <div className={`wl-root is-room lg-root${ONLY && HELDS.length === 1 ? ' is-one' : ''}`}>
        <header className="lg-head">
          <h1>the mark, told other ways</h1>
          <div className="lg-row">
            <button type="button" className="lg-btn is-main" onClick={() => setRun((k) => k + 1)}>play all</button>
            <button type="button" className="lg-btn" aria-pressed={loop} onClick={() => setLoop((v) => !v)}>loop</button>
          </div>
          <p>tap a phone to tell it again. each ends on the mark; the one on the site today is the run and the catch.</p>
        </header>
        <main className="lg-grid">
          {shown.flatMap((s) => HELDS.map((h) => <Card key={`${s.id}${h}`} scene={s} run={run} loop={loop} held={h} />))}
        </main>
      </div>
    </PhoneChrome.Provider>
  )
}

if (import.meta.env.DEV) {
  ensureFaces()
  createRoot(document.getElementById('root')).render(<StrictMode><Logos /></StrictMode>)
}

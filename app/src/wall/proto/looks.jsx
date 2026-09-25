// ── the colours, side by side ───────────────────────────────────────────────
//
// Every colour a letter can be lit in, for choosing between: each drawn in
// the four places a colour is drawn (the letter, `Screen`; the panel's
// thumbnail, `Mini`; the name's small screen on the wall, `Tile`; and the
// picture `share` makes, share.js), from the same table, so a print's light
// can be seen to be the same light in all four. Development only: served by
// the dev server at /looks.html, which the build never takes (app/looks.html),
// and it draws nothing outside development either way.
//
//   /looks.html                 the pool as it is
//   /looks.html?light=dots      every print in one light, to compare lights
//   /looks.html?seed=2          five other phones (the quirks off the ids)
//   /looks.html?only=teal       one colour
//   /looks.html?pictures=0      without the shared pictures, which are slow
//
// `light` is drawn by giving every print that light before anything is
// painted: the catalogue's rows are read once, when a colour is first drawn
// (looks.js `skinOf`), so this page is the only one that sees it.

import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles.css'
import '../wall.css'
import '../phone.css'
import './looks.css'
import { COLOURS, RETIRED, skinOf } from '../looks.js'
import { Screen, ScreenText, Tile, Mini } from '../screen.jsx'
import { PhoneChrome } from '../parts.jsx'
import { letterFace, renderLetter } from '../share.js'
import { ensureFaces, warmType } from '../type.js'

const LIGHTS = ['corner', 'keyline', 'sky', 'dots', 'bands']
const ask = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const FORCE = LIGHTS.includes(ask.get('light')) ? ask.get('light') : ''
const SEED = Math.max(0, Number(ask.get('seed')) || 0)
const ONLY = ask.get('only') || ''
const PICTURES = ask.get('pictures') !== '0'
if (FORCE) for (const c of COLOURS) if (c.kind === 'poster' || c.kind === 'riso') c.light = FORCE

const BODY = 'you gave me your umbrella outside wheeler and walked home in it. i still have it, and i think about the walk.'
const idOf = (c, k) => `${(k * 0x2f1b3 + c.slug.length * 7919 + SEED * 104729).toString(16).padStart(8, '0').slice(-8)}-2222-4333-8444-5555${String(k).padStart(8, '0')}`

function letterOf(c, i) {
  const id = idOf(c, i)
  const l = { id, to: 'sofia.reyes', look: { tint: c.slug }, body: BODY, words: 22, chars: BODY.length, hearts: 3, hearted: false, at: Date.now() - 86400000 }
  return { l, face: letterFace(l, { name: 'Sofia', handle: '@sofia.reyes' }) }
}

function Picture({ face, go }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!go) return undefined
    let live = true
    let made = ''
    renderLetter(face).then((b) => {
      if (!live || !b) return
      made = URL.createObjectURL(b)
      setUrl(made)
    })
    return () => { live = false; if (made) URL.revokeObjectURL(made) }
  }, [face, go])
  return <span className="lk-pic">{url ? <img src={url} alt="" /> : null}</span>
}

function Card({ c, i, go }) {
  const { l, face } = letterOf(c, i)
  const s = skinOf(c)
  const top = { name: face.name, handle: face.handle, dear: face.dear, icon: face.icon, date: face.date, counter: face.counter, bat: face.bat }
  return (
    <article className="lk-card" data-colour={c.slug}>
      <Screen
        look={l.look} seed={l.id} top={top} live={false}
        keys={{ l: { label: face.left }, c: { glyph: 'heartO', label: String(face.hearts) }, r: { label: face.right } }}
      >
        <ScreenText text={face.text} />
      </Screen>
      <div className="lk-small">
        <span className="lk-mini"><Mini colour={c} /></span>
        <span className="lk-mini is-2"><Mini colour={c} /></span>
        <span className="lk-tile"><Tile look={l.look} seed={l.id} mono="SR" at={Date.now() - 3600000} /></span>
        {PICTURES ? <Picture face={face} go={go} /> : null}
      </div>
      <p className="lk-name">
        <b>{c.name}</b>
        <span>{s.kind === 'neg' ? 'negative' : s.kind}{s.light ? `, ${s.light}` : ''}</span>
      </p>
    </article>
  )
}

function Looks() {
  // the pictures one colour at a time, after the page is up: each is a press
  // pulled by hand over a whole screen
  const [upTo, setUpTo] = useState(-1)
  useEffect(() => {
    let live = true
    warmType().then(() => { if (live) setUpTo(0) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    if (upTo < 0 || upTo >= COLOURS.length) return undefined
    const t = setTimeout(() => setUpTo((n) => n + 1), 450)
    return () => clearTimeout(t)
  }, [upTo])
  const shown = COLOURS.filter((c) => !ONLY || c.slug === ONLY)
  const link = (q) => {
    const p = new URLSearchParams(ask)
    for (const [k, v] of Object.entries(q)) { if (v === '') p.delete(k); else p.set(k, v) }
    const s = p.toString()
    return `/looks.html${s ? `?${s}` : ''}`
  }
  return (
    <PhoneChrome.Provider value>
      <div className="wl-root is-room lk-root">
        <header className="lk-head">
          <h1>the colours</h1>
          <nav aria-label="lights">
            <a href={link({ light: '' })} aria-current={FORCE ? undefined : 'page'}>as chosen</a>
            {LIGHTS.map((x) => (
              <a key={x} href={link({ light: x })} aria-current={FORCE === x ? 'page' : undefined}>{x}</a>
            ))}
          </nav>
          <nav aria-label="phones">
            {[0, 1, 2, 3].map((n) => (
              <a key={n} href={link({ seed: n ? String(n) : '' })} aria-current={SEED === n ? 'page' : undefined}>phones {n + 1}</a>
            ))}
          </nav>
        </header>
        <main className="lk-grid">
          {shown.map((c) => <Card key={c.slug} c={c} i={SEED} go={PICTURES && upTo >= COLOURS.indexOf(c)} />)}
        </main>
        <p className="lk-foot">
          gone from the pool, and drawn as: {[...RETIRED].map(([a, b]) => `${a} as ${b}`).join(', ')}
        </p>
      </div>
    </PhoneChrome.Provider>
  )
}

if (import.meta.env.DEV) {
  ensureFaces()
  createRoot(document.getElementById('root')).render(<StrictMode><Looks /></StrictMode>)
}

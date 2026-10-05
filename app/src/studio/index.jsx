// ── the studio ──────────────────────────────────────────────────────────────
//
// The campaign, drawn with the product's own parts (kit.jsx). Development
// only: served by the dev server at /studio.html, which the build never
// takes, as /looks.html is never taken.
//
//   /studio.html                 every poster, small, on one sheet
//   /studio.html?p=<id>          one poster at its own size, for the camera
//   /studio.html?film=<id>       a film, held at its nought; window.__seek(ms)
//                                draws any moment of it
//
// A poster is a module in posters/ whose default export is
// `{ id, w, h, title, format, Poster }`; a film is one in films/ whose
// default is `{ id, w, h, ms, fps, Film }`, its `Film` drawn from its `t`
// prop and nothing else. Neither is listed anywhere: a file in the folder is
// on the sheet. scripts/studio.mjs and scripts/studio-film.mjs photograph
// them.

import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { useEffect, useState } from 'react'
import '../styles.css'
import '../wall/wall.css'
import '../wall/phone.css'
import './studio.css'
import { ensureFaces, warmType } from '../wall/type.js'
import { holding } from './kit.jsx'

const POSTERS = Object.values(import.meta.glob('./posters/*.jsx', { eager: true, import: 'default' }))
  .filter(Boolean).sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || a.id.localeCompare(b.id))
const FILMS = Object.values(import.meta.glob('./films/*.jsx', { eager: true, import: 'default' })).filter(Boolean)

const ask = new URLSearchParams(window.location.search)
const twice = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

// Whole: the faces, every picture decoded, every hold let go, and the
// pixels up close on any screen that keeps them
async function whole() {
  await warmType(6000)
  await document.fonts.ready
  await twice()
  const t0 = performance.now()
  while (holding() && performance.now() - t0 < 15000) await twice()
  await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))))
  const keeps = document.querySelectorAll('.st-phone:not(.is-quiet) .wl-scr')
  if (keeps.length) {
    const t1 = performance.now()
    while (document.querySelectorAll('.st-phone:not(.is-quiet) .wl-scr-fx.is-rgb').length < keeps.length && performance.now() - t1 < 5000) await twice()
    await new Promise((r) => setTimeout(r, 650))
  }
  await twice()
  await twice()
}

function Sheet() {
  return (
    <div className="st-sheet">
      <h1>celestual, the studio</h1>
      <div className="st-sheet-grid">
        {POSTERS.map((p) => {
          const k = 360 / p.w
          return (
            <a key={p.id} className="st-sheet-card" href={`?p=${p.id}`}>
              <span className="st-sheet-frame" style={{ width: `${p.w * k}px`, height: `${p.h * k}px` }}>
                <span style={{ transform: `scale(${k})`, transformOrigin: '0 0', display: 'block', width: `${p.w}px`, height: `${p.h}px` }}>
                  <p.Poster />
                </span>
              </span>
              <span className="st-sheet-name">{p.id} · {p.format} · {p.w}×{p.h}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function One({ p }) {
  return <div className="st-one"><p.Poster /></div>
}

let seekTo = null
function FilmAt({ f }) {
  const [t, setT] = useState(0)
  useEffect(() => { seekTo = setT; return () => { seekTo = null } }, [])
  return <div className="st-one"><f.Film t={t} /></div>
}

window.__studio = {
  list: () => POSTERS.map(({ id, w, h, title, format, scale, kind }) => ({ id, w, h, title, format, scale: scale || 1, kind: kind || 'png' })),
  films: () => FILMS.map(({ id, w, h, ms, fps }) => ({ id, w, h, ms, fps })),
}

const root = createRoot(document.getElementById('root'))
document.documentElement.classList.add('wl-bleed', 'wl-dark')
ensureFaces()
const pid = ask.get('p')
const fid = ask.get('film')
if (pid) {
  const p = POSTERS.find((x) => x.id === pid)
  root.render(p ? <One p={p} /> : <p style={{ color: '#fff' }}>no poster {pid}</p>)
} else if (fid) {
  const f = FILMS.find((x) => x.id === fid)
  root.render(f ? <FilmAt f={f} /> : <p style={{ color: '#fff' }}>no film {fid}</p>)
  // a frame is what it is told: the clock, then everything on it settled
  window.__seek = async (ms) => {
    flushSync(() => seekTo(ms))
    if (f.settle) await f.settle(ms)
    await twice()
  }
} else {
  root.render(<Sheet />)
}
whole().then(() => { window.__ready = true })

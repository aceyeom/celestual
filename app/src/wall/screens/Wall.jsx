// ── /beta — THE WALL ────────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL IS THE LANDING. IT IS NOT BEHIND A SEARCH BOX.                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// This is the single change the whole rewrite turns on, so it is worth saying
// plainly. The previous build opened on a title card and sent you to a field
// where you typed your own handle and found out — nineteen times in twenty —
// that nothing was there. That flow asks somebody who has just picked a card
// up off a table to make a bet before they have seen the table.
//
// A person scanning a code off a flyer has given you about four seconds. In
// those four seconds they have to see that OTHER PEOPLE ALREADY DID THIS.
// So the code lands on the thing itself: sixty-six names, already written to,
// already up, readable immediately, tappable immediately. The search is a
// button in the corner for the one person in twenty who came looking for
// themselves. Everybody else browses, reads two letters, and is met by the
// composer rising off the bottom edge.
//
// The wall is set as ONE INSCRIPTION rather than a grid of cards or a cloud of
// tags. Names in a monospace, at three sizes, running on and wrapping, with a
// star between them. A grid of cards would read as a directory and a tag cloud
// would read as analytics; a run of names at uneven weights reads as something
// accumulated, which is what it is.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, IconButton, ArrowLink } from '../parts.jsx'
import { Sparkle, Halftone } from '../art.jsx'
import { wall, liveCount, handleCount, lettersFor, atHandle } from '../data.js'
import { getState, patch } from '../store.js'

// The opening plays once per session and never again. Somebody coming back to
// the wall from a letter should land on the wall, not sit through a title.
let OPENED = false

export default function Wall({ go, reduce }) {
  const tiles = useMemo(() => wall(), [])
  const letters = liveCount()
  const names = handleCount()

  const [playing] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)
  // One name on the wall lights up every few seconds and fades back. The wall
  // is a live object and a completely static one reads as a screenshot.
  const [ember, setEmber] = useState(-1)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (armed) return
    const t = setTimeout(() => { OPENED = true; patch({ seen: true }); setArmed(true) }, 2200)
    return () => clearTimeout(t)
  }, [armed])

  useEffect(() => {
    if (!armed || reduce || !tiles.length) return
    let alive = true
    const tick = () => {
      if (!alive) return
      const i = Math.floor(Math.random() * tiles.length)
      setEmber(i)
      timers.current.push(setTimeout(() => alive && setEmber(-1), 2600))
      timers.current.push(setTimeout(tick, 3400 + Math.random() * 4200))
    }
    timers.current.push(setTimeout(tick, 2600))
    return () => { alive = false }
  }, [armed, reduce, tiles.length])

  const open = (handle) => {
    const found = lettersFor(handle)
    if (found.length) go('letter', found[0].id)
  }

  return (
    <div className={`wl-page wl-wallpage${playing ? ' is-opening' : ''}`}>
      <header className="wl-top">
        <div className="wl-top-mark">
          <Sparkle size={15} twinkle={!reduce} />
          <Label>Berkeley · 2026</Label>
        </div>
        <div className="wl-top-acts">
          <IconButton name="find" label="find a handle" onClick={() => go('find')} />
          <IconButton name="write" label="write a letter" onClick={() => go('write')} />
        </div>
      </header>

      {/* ── the masthead ──
          The poster's title block, verbatim in structure: the Didone with its
          terminal period, a letterspaced monospace line under it, one sparkle
          off the top-right shoulder and the dotted sphere sunk into the
          bottom-right corner where the poster puts it. */}
      <div className="wl-mast">
        <Sparkle size={26} className="wl-mast-spark" twinkle={!reduce} delay={900} />
        <Halftone size={92} grid={20} className="wl-mast-ball" />
        <Display size="xl" className="wl-mast-title">
          Someone here wrote<br />something they<br />never sent.
        </Display>
        <Label tone="dim" className="wl-mast-meta">
          {letters} letters · {names} names
        </Label>
      </div>

      {/* ── the inscription ──
          Every name is a button. Weight comes off how many letters that name
          carries, so a name written to three times is set larger than one
          written to once and the wall has a real topography instead of a
          decorative one. */}
      <nav className="wl-wall" aria-label="the wall">
        {tiles.map((t, i) => (
          <span key={t.handle} className="wl-slot">
            <button
              type="button"
              className={`wl-name is-w${t.weight}${ember === i ? ' is-ember' : ''}`}
              style={playing ? { '--in': `${900 + Math.min(i, 40) * 26}ms` } : undefined}
              onClick={() => open(t.handle)}
            >
              {atHandle(t.handle)}
              {t.count > 1 && <sup className="wl-name-n" aria-label={`${t.count} letters`}>{t.count}</sup>}
            </button>
            {i < tiles.length - 1 && (
              <Sparkle size={t.weight === 2 ? 9 : 7} className="wl-sep" />
            )}
          </span>
        ))}
      </nav>

      {/* ── the dock ──
          The gradient that rises off the bottom edge on every screen of this
          build, and the reason the composer never has to be advertised: it is
          already half on the screen, under everything, at all times. Scroll to
          the end of the wall and the offer is the last thing there. */}
      <div className="wl-dock">
        <div className="wl-dock-veil" aria-hidden="true" />
        <div className="wl-dock-in">
          <ArrowLink tone="quiet" size="s" onClick={() => go('find')}>find your name</ArrowLink>
          <Pill tone="light" onClick={() => go('write')}>write one</Pill>
        </div>
      </div>
    </div>
  )
}

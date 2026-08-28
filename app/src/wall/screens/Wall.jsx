// ── /beta — THE WALL ────────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL IS THE LANDING, AND IT ASKS NOBODY WHO THEY ARE.               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A person scanning a code off a card has given you about four seconds, and in
// those four seconds they have to see that OTHER PEOPLE ALREADY DID THIS. So
// the code lands on the thing itself: sixty-six names, already written to,
// readable and tappable immediately, with no sign-in, no handle to prove and
// nothing to answer first.
//
// ── what is deliberately not here ───────────────────────────────────────────
// No account. No verification. No "is there one for me". No notification to
// wait for, and no mutual arriving. The wall does not know who is reading it
// and has nothing to attach a reader to — which is what makes it safe to hand
// out on paper, and what makes reading it cost nothing.
//
// The core service is the opposite of all of that, and it is somewhere else.
// The ONE door to it is the tab at the bottom of this screen, and that tab
// does not exist until you have put a letter up yourself.
//
// ── the inscription ─────────────────────────────────────────────────────────
// One run of names at three weights, wrapping, with a star between them. Not a
// grid of cards, which reads as a directory, and not a tag cloud, which reads
// as analytics. A run of names at uneven weights reads as something
// accumulated, which is what it is.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, TopBar, Icon } from '../parts.jsx'
import { Sparkle, Halftone } from '../art.jsx'
import { wall, liveCount, lettersFor, atHandle } from '../data.js'
import { getState, patch } from '../store.js'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

export default function Wall({ go, reduce }) {
  const tiles = useMemo(() => wall(), [])
  const letters = liveCount()
  const written = getState().written

  const [playing] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)
  // One name lights up every few seconds and fades back. The wall is a live
  // object and a completely static one reads as a screenshot.
  const [ember, setEmber] = useState(-1)
  // The tab is not on the screen the instant you land back from posting — it
  // rises a beat later, once the wall has settled. A panel that is already
  // there when the screen arrives is a banner.
  const [tab, setTab] = useState(() => written.length > 0 && reduce)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (armed) return
    const t = setTimeout(() => { OPENED = true; patch({ seen: true }); setArmed(true) }, 2000)
    return () => clearTimeout(t)
  }, [armed])

  useEffect(() => {
    if (!written.length || tab) return
    const t = setTimeout(() => setTab(true), reduce ? 0 : 900)
    return () => clearTimeout(t)
  }, [written.length, tab, reduce])

  useEffect(() => {
    if (!armed || reduce || !tiles.length) return
    let alive = true
    const tick = () => {
      if (!alive) return
      setEmber(Math.floor(Math.random() * tiles.length))
      timers.current.push(setTimeout(() => alive && setEmber(-1), 2600))
      timers.current.push(setTimeout(tick, 3400 + Math.random() * 4200))
    }
    timers.current.push(setTimeout(tick, 2400))
    return () => { alive = false }
  }, [armed, reduce, tiles.length])

  const open = (handle) => {
    const found = lettersFor(handle)
    if (found.length) go('letter', found[0].id)
  }

  return (
    <div className={`wl-page wl-wallpage${playing ? ' is-opening' : ''}${tab ? ' has-tab' : ''}`}>
      <TopBar go={go} at="wall" onMark={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })} />

      {/* ── the masthead ──
          The poster's title block: the Didone with its terminal period, one
          sparkle off the top-right shoulder, the dotted sphere sunk into the
          corner. Two words under it and no more. A count is the only fact
          about this wall worth printing — because a thin wall should look
          thin — and everything else that used to sit here was decoration
          wearing an information costume. */}
      <div className="wl-mast">
        <Sparkle size={26} className="wl-mast-spark" twinkle={!reduce} delay={900} />
        <Halftone size={92} grid={20} className="wl-mast-ball" />
        <Display size="xl" className="wl-mast-title">
          Someone here wrote<br />something they<br />never sent.
        </Display>
        <Label tone="dim" className="wl-mast-meta">{letters} letters</Label>
      </div>

      {/* ── the names ──
          Weight comes off how many letters a name carries, so a name written
          to three times is set larger than one written to once and the wall
          has a real topography rather than a decorative one. */}
      <nav className="wl-wall" aria-label="the names on the wall">
        {tiles.map((t, i) => (
          <span key={t.handle} className="wl-slot">
            <button
              type="button"
              className={`wl-name is-w${t.weight}${ember === i ? ' is-ember' : ''}${t.mine ? ' is-mine' : ''}`}
              style={playing ? { '--in': `${820 + Math.min(i, 40) * 24}ms` } : undefined}
              onClick={() => open(t.handle)}
            >
              {atHandle(t.handle)}
              {t.count > 1 && <sup className="wl-name-n" aria-label={`${t.count} letters`}>{t.count}</sup>}
            </button>
            {i < tiles.length - 1 && <Sparkle size={t.weight === 2 ? 9 : 7} className="wl-sep" />}
          </span>
        ))}
      </nav>

      {/* ── the dock ──
          The gradient that rises off the bottom edge. It is the reason the
          composer never has to be advertised: it is already half on screen,
          under everything, the whole time. */}
      <div className="wl-dock">
        <div className="wl-dock-veil" aria-hidden="true" />

        {/* ── the tab ──
            THE ONLY DOOR OUT OF THE WALL, and it is not here until somebody
            has put a letter up. Offering an account to a person who has not
            written anything is asking them to register for a result they have
            not earned and cannot receive; offering it thirty seconds after
            they have named somebody is asking the one question they are now
            actually carrying. So it waits, and then it rises. */}
        {tab && (
          <button type="button" className="wl-tab" onClick={() => go('join')}>
            <span className="wl-tab-grip" aria-hidden="true" />
            <span className="wl-tab-body">
              <Sparkle size={13} className="wl-tab-spark" />
              <span className="wl-tab-text">
                Register to find out<br />if they put you down too.
              </span>
              <span className="wl-tab-go" aria-hidden="true"><Icon name="join" size={19} /></span>
            </span>
          </button>
        )}

        <div className="wl-dock-in">
          <Pill tone="light" wide icon={<Icon name="write" size={17} />} onClick={() => go('write')}>
            write one
          </Pill>
        </div>
      </div>
    </div>
  )
}

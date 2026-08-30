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
// No account to browse. No "is there one for me" before you have seen what this
// is. No notification to wait for, and no mutual arriving. The INDEX is public
// and it asks nothing; the letters under it are not, and the door on them is
// somewhere else (auth.js).
//
// The core service is the opposite of all of that, and it is somewhere else
// again. The ONE door to it is the tab at the bottom of this screen, and that
// tab does not exist until you have put a letter up yourself.
//
// ── the inscription, and why it moves now ───────────────────────────────────
// It was one run of names at three weights, wrapping, with a star between them:
// not a grid of cards (a directory) and not a tag cloud (analytics), but
// something ACCUMULATED, which is what it is.
//
// It still is all of that. What changed is that it drifts. A static block of
// sixty-six names is a screenshot — it reads as a list that was printed once,
// and the one thing this surface has to say in its first second is that people
// are still doing this. So the run is broken into lanes and each lane travels,
// slowly, alternating direction, at about the speed of a departures board:
//
//   · slow enough to READ. A banner nobody can finish a name on is decoration,
//     and every name here is a target.
//   · the lane under the pointer stops, and so does the lane holding keyboard
//     focus. Motion that will not hold still for the person trying to use it
//     is motion that has forgotten what it is on top of.
//   · the ends are masked rather than cut, so a name leaves the screen by
//     dissolving off the edge instead of being sliced by a box.
//   · alternating direction is what makes it a WALL rather than a ticker. Every
//     lane going the same way is a stock crawl; lanes going opposite ways read
//     as a field with weather in it.
//
// Under `prefers-reduced-motion` none of that happens and the original wrapping
// inscription is rendered instead — not a frozen banner, which would strand the
// names in eight ragged rows, but the composition this was before it moved.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, TopBar, Icon } from '../parts.jsx'
import { Sparkle, Halftone } from '../art.jsx'
import { wall, liveCount, lettersFor, atHandle, hash } from '../data.js'
import { getState, patch } from '../store.js'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

// ── the lanes ───────────────────────────────────────────────────────────────
// Round-robin rather than sliced in blocks, so the heavy names — the ones
// carrying three letters, set biggest — end up spread one per lane instead of
// stacked in the first two. A banner with all of its weight in the top corner
// is a banner that is bottom-empty for the whole of its cycle.
//
// Eight or so names per lane is the number that matters: fewer and the loop is
// short enough that a person watching one lane sees the same name come round
// twice; more and the lane is a minute long and the tail is never seen at all.
const PER_LANE = 8

function laneUp(tiles) {
  const n = Math.max(3, Math.min(8, Math.ceil(tiles.length / PER_LANE)))
  const lanes = Array.from({ length: n }, () => [])
  tiles.forEach((t, i) => lanes[i % n].push(t))
  return lanes.filter((l) => l.length)
}

// One name. Rendered twice per lane — the second copy is the loop's tail and is
// hidden from the accessibility tree and from the tab order, because a wall of
// sixty-six names that a screen reader announces a hundred and thirty-two times
// is a wall that has been made worse by an animation nobody can see.
function Name({ tile, ember, ghost, onOpen }) {
  return (
    <span className="wl-slot">
      <button
        type="button"
        className={`wl-name is-w${tile.weight}${ember ? ' is-ember' : ''}${tile.mine ? ' is-mine' : ''}`}
        onClick={() => onOpen(tile.handle)}
        tabIndex={ghost ? -1 : undefined}
        aria-hidden={ghost || undefined}
      >
        {atHandle(tile.handle)}
        {tile.count > 1 && <sup className="wl-name-n" aria-label={`${tile.count} letters`}>{tile.count}</sup>}
      </button>
      <Sparkle size={tile.weight === 2 ? 9 : 7} className="wl-sep" />
    </span>
  )
}

export default function Wall({ go, reduce, rev }) {
  const tiles = useMemo(() => wall(), [rev])
  const lanes = useMemo(() => laneUp(tiles), [tiles])
  const letters = liveCount()
  const written = getState().written

  const [playing] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)
  // One name lights up every few seconds and fades back. The wall is a live
  // object; the drift says that at the level of the whole field, and this says
  // it about one name at a time. Held as a HANDLE rather than an index, because
  // every name is on the screen twice and the two copies have to light
  // together — one lit and one not is two different names to the eye.
  const [ember, setEmber] = useState('')
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

  // Slower than it was. The drift is already carrying the "this is alive"
  // claim, and two independent things pulsing at once on the same field is
  // noise rather than life.
  useEffect(() => {
    if (!armed || reduce || !tiles.length) return
    let alive = true
    const tick = () => {
      if (!alive) return
      setEmber(tiles[Math.floor(Math.random() * tiles.length)].handle)
      timers.current.push(setTimeout(() => alive && setEmber(''), 2800))
      timers.current.push(setTimeout(tick, 5200 + Math.random() * 5200))
    }
    timers.current.push(setTimeout(tick, 3200))
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
          has a real topography rather than a decorative one. That survives the
          move into lanes: the three sizes are still there, now spread across
          the lanes instead of down a paragraph. */}
      {reduce ? (
        <nav className="wl-wall is-still" aria-label="the names on the wall">
          {tiles.map((t) => (
            <Name key={t.handle} tile={t} ember={false} ghost={false} onOpen={open} />
          ))}
        </nav>
      ) : (
        <nav className="wl-wall is-drifting" aria-label="the names on the wall">
          {lanes.map((lane, li) => (
            <div
              key={li}
              className={`wl-lane${li % 2 ? ' is-back' : ''}`}
              style={{
                // One constant seconds-per-name, so every lane travels at the
                // same speed whatever it is carrying — lanes at visibly
                // different speeds read as a bug, not as parallax.
                '--dur': `${(lane.length * 5.6 * (0.9 + (hash(`lane${li}`) % 20) / 100)).toFixed(1)}s`,
                '--in': `${900 + li * 110}ms`,
              }}
            >
              <div className="wl-lane-run">
                {/* the run, and the same run again: the loop is a translate of
                    exactly half the track, so the tail is already on screen
                    when the head leaves and there is no seam to catch */}
                {lane.map((t) => (
                  <Name key={t.handle} tile={t} ember={ember === t.handle} ghost={false} onOpen={open} />
                ))}
                {lane.map((t) => (
                  <Name key={`${t.handle}~`} tile={t} ember={ember === t.handle} ghost onOpen={open} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      )}

      {/* ── the way off ──
          A public list of handles says, in public, that these people are being
          written about, and not one of them asked to be. So the way back off
          sits on the wall itself, in plain sight under the names.

          It is set quiet rather than hidden. Quiet is right, because it is not
          what the wall is for; hidden would be the tell that the wall would
          rather not be asked. */}
      <div className="wl-wall-foot">
        <button type="button" className="wl-mine is-wide" onClick={() => go('remove')}>
          your handle here? take it off the wall
        </button>
      </div>

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
            actually carrying. So it waits, and then it rises.

            It says the same sentence the screen it opens says, word for word.
            A door and the room behind it that describe themselves differently
            is a door somebody has to decide about twice. */}
        {tab && (
          <button type="button" className="wl-tab" onClick={() => go('join')}>
            <span className="wl-tab-grip" aria-hidden="true" />
            <span className="wl-tab-body">
              <Sparkle size={13} className="wl-tab-spark" />
              <span className="wl-tab-text">
                Get notified if they<br />put you down too.
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

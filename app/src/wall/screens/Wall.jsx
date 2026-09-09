// ── /berkeley — THE WALL ────────────────────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL IS THE LANDING, AND IT ASKS NOBODY WHO THEY ARE.               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A person scanning a code off a card has given you about four seconds, and in
// those four seconds they have to see that OTHER PEOPLE ALREADY DID THIS. So
// the code lands on the thing itself: the names, already written to, readable
// and tappable immediately, with no sign-in, no handle to prove and nothing to
// answer first.
//
// ── what is deliberately not here ───────────────────────────────────────────
// No account to browse. No "is there one for me" before you have seen what this
// is. No notification to wait for, and no mutual arriving. The INDEX is public
// and it asks nothing; the letters under it are not, and the door on them is
// somewhere else (auth.js).
//
// The core service is the opposite of all of that, and it is somewhere else
// again. The one OFFER of it is the tab at the bottom of this screen, and that
// tab does not exist until you have put a letter up yourself. Nothing else on
// the wall points at the product: the brand in the bar goes to the front, and
// that is the whole of it. There was a quiet line under the composer's pill
// once, "the rest of celestual", and it went: a sign on the road is still a
// sign, and the wall is not a road.
//
// Nor is the way off on the wall itself any more. "take your name off the
// wall" stood as a capsule under the names on every visit; it stands in the
// search now, and under the flag on every letter, which is where a person who
// has found their name is standing when they want it gone. On the wall it
// was a control about a consequence nobody had met yet.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE, AND THE VEIL OVER IT                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The names are a field of faces seen through a lens (Hive.jsx): packed on a
// hexagonal lattice, full size and nearly touching at the middle of the
// screen, shrinking to points at the rim. One name is written on it, the
// handle of the person in the lens, on a small tag; everything else about a
// person is behind the tap. The field drifts by itself and it can be pulled
// in any direction. It replaced three lanes of handles crawling left and
// right, which said the wall was alive and nothing else about anybody on it.
//
// The masthead is over it, not above it. On a fresh load the whole screen
// under the bar is the field, greyed, with the title, the one line and the
// way in laid over it: THE VEIL. "view the wall" lifts it, the field comes up
// to full light, the lens blooms, and the field has the screen. One line
// stays where it was through the lift, THE EAR: the campus and the count, set
// the way the front door sets its own ear above its headline, so the veil and
// the field share one masthead element and nothing at the top changes shape
// when the type goes. The veil is up once per tab: coming back from a letter
// lands on the field.
//
// The tower came off, and so did the count on flaps. The Campanile stood in
// the masthead's corner and then on the count as its plinth, and it never
// stopped reading as a thing put there; the flaps under it were a board, and
// a board is furniture. The wall's one fact is a line of type now, and the
// wall's own light is in its field, on the person in the lens.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Display, Label, Pill, TopBar, Icon, SiteFoot, ArrowLink } from '../parts.jsx'
import { Sparkle } from '../art.jsx'
import { wall, liveCount, wallError, wallLoaded, loadWall } from '../data.js'
import { getState, patch } from '../store.js'
import Hive from '../Hive.jsx'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

// ── the ear ─────────────────────────────────────────────────────────────────
// The campus and the count, on one line in the identifier face at the size
// and the tracking every dateline in the product is set at: the same line
// the front door runs above its headline to point here (Notice.jsx), so the
// line on the door and the line on the wall are one line. The count is the
// one fact about this wall worth printing. While the index is still loading
// there is no count, because a wall that has not loaded has no number; when
// it did not load the line says so, in the count's place.
function Ear({ letters }) {
  const err = wallError()
  const loaded = wallLoaded()
  let meta = null
  if (err) {
    meta = (
      <>
        <span className="wl-ear-meta">{err === 'offline' ? 'not connected here' : 'did not load'}</span>
        {err === 'offline' ? null : (
          <button type="button" className="wl-quiet wl-ear-again" onClick={() => loadWall(true)}>read it again</button>
        )}
      </>
    )
  } else if (letters > 0) {
    meta = <span className="wl-ear-meta">{letters === 1 ? 'one letter' : `${letters} letters`}</span>
  } else if (loaded) {
    meta = <span className="wl-ear-meta">open now</span>
  }
  return (
    <Label as="div" className="wl-ear" aria-live="polite">
      <Sparkle size={9} className="wl-ear-spark" />
      <span className="wl-ear-name">berkeley</span>
      {meta ? <span className="wl-ear-dot" aria-hidden="true">&middot;</span> : null}
      {meta}
    </Label>
  )
}

export default function Wall({ go, reduce, rev, under = false }) {
  // `rev` is the corpus's revision, and the wall is read fresh when it moves.
  const tiles = useMemoTiles(rev)
  const letters = liveCount()
  const state = getState()
  const written = state.written
  const wroteTo = state.wroteTo

  const [playing] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)
  // ── the veil ──
  // Up on a fresh load, once per tab. `lifting` is the beat it takes to go,
  // so the type can rise off the field rather than vanish from it.
  const [veil, setVeil] = useState(() => (OPENED ? 'down' : 'up'))
  const veiled = veil !== 'down'
  const lifting = useRef(0)
  const lift = useCallback(() => {
    if (veil !== 'up') return
    OPENED = true
    if (reduce) { setVeil('down'); return }
    setVeil('lifting')
    lifting.current = window.setTimeout(() => setVeil('down'), 560)
  }, [veil, reduce])
  useEffect(() => () => window.clearTimeout(lifting.current), [])

  // The tab is not on the screen the instant you land back from posting: it
  // rises a beat later, once the wall has settled. A panel that is already
  // there when the screen arrives is a banner.
  const [tab, setTab] = useState(() => written.length > 0 && reduce)

  useEffect(() => {
    if (armed) return undefined
    const t = setTimeout(() => { OPENED = true; patch({ seen: true }); setArmed(true) }, 2000)
    return () => clearTimeout(t)
  }, [armed])

  useEffect(() => {
    if (!written.length || tab) return undefined
    const t = setTimeout(() => setTab(true), reduce ? 0 : 900)
    return () => clearTimeout(t)
  }, [written.length, tab, reduce])

  // The name, not a letter id. A tile is a person written to, the letter
  // screen resolves a handle to the letters under it, and going by name means
  // the tap does not wait on a request that has not happened yet.
  const open = useCallback((handle) => go('letter', handle), [go])

  return (
    <>
    <div className={`wl-page wl-wallpage${playing ? ' is-opening' : ''}${tab ? ' has-tab' : ''}${veil === 'up' ? ' is-veiled' : ' is-lifted'}`}>
      <TopBar go={go} at="wall" />

      {/* ── the room ──
          Everything under the bar and over the dock: the ear, the stage the
          hive fills, and while it is up the veil over both. The veil covers
          the ear's row as well as the stage, so its scrim runs from the bar
          down; the ear stands above the scrim and does not move. */}
      <div className="wl-room">
        <Ear letters={letters} />

        {/* ── the stage ──
            The field, and the veil laid over it. The stage is the whole of
            the screen the bar, the ear and the dock leave, and it bleeds to
            the edges of the viewport, because a field of faces with a margin
            either side is a widget on a page. */}
        <div className="wl-stage">
          <Hive
            tiles={tiles} reduce={reduce} veiled={veiled} paused={under}
            opening={playing} mine={wroteTo} onOpen={open}
            none={wallLoaded() && !wallError() ? 'nobody has been written to yet' : ''}
          />
        </div>

        {veil !== 'down' && (
          <div className={`wl-veil${veil === 'lifting' ? ' is-lifting' : ''}`}>
            {/* the grey over the field is itself the way in: a tap anywhere on
                it lifts it, and the arrow link below says so in words */}
            <button type="button" className="wl-veil-scrim" onClick={lift} aria-label="view the wall" tabIndex={-1} />
            <div className="wl-veil-in">
              <div className="wl-mast">
                <Display size="xl" as="h1" className="wl-mast-title">
                  A wall of<br />unforgettable<br />berkeley bears.
                </Display>
                {/* ── what it is, in one line ──
                    The title names the wall and this says what is on it, in
                    the reading face, the way the front door runs one line of
                    the mechanic under its own headline (hero.css .hm-read). */}
                <p className="wl-mast-sub">anonymous letters to the one you never told.</p>
                <ArrowLink className="wl-mast-go" onClick={lift}>view the wall</ArrowLink>
              </div>
            </div>
          </div>
        )}
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

        {/* ── the way in ──
            The composer's pill, and nothing under it. */}
        <div className="wl-dock-in">
          <Pill tone="light" wide onClick={() => go('write')}>
            write
          </Pill>
        </div>
      </div>
    </div>

    {/* ── the foot of the site ──
        Under the wall, in its own column, so the wall keeps the whole first
        screen and the dock keeps the bottom of it. The same block the front
        door ends on, with the company on it. */}
    <div className="wl-page is-foot">
      <SiteFoot />
    </div>
    </>
  )
}

// The tiles, read once per revision of the corpus. `wall()` builds a new
// array on every call and the hive keys its layout off the array's identity,
// so it is read when the corpus moves and not on every render.
function useMemoTiles(rev) {
  const held = useRef({ rev: -1, tiles: [] })
  if (held.current.rev !== rev) held.current = { rev, tiles: wall() }
  return held.current.tiles
}

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
// tab does not exist until you have put a letter up yourself. Before that
// there is a signpost and nothing more: one quiet line under the composer's
// pill, "the rest of celestual", which says there is more and asks nothing.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE, AND THE VEIL OVER IT                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The names are a field of faces seen through a lens (Hive.jsx): the person
// nearest the middle is drawn largest and carries the name, the handle, the
// count and how long since the last letter; the ring round them carries the
// handle; the rest shrink toward the edges until they are points. The field
// walks by itself, one person into the lens at a time, and it can be pulled
// in any direction. It replaced three lanes of handles crawling left and
// right, which said the wall was alive and nothing else about anybody on it.
//
// The masthead is over it, not above it. On a fresh load the whole screen
// under the bar is the field, greyed, with the title, the one line, the count
// and the way in laid over it: THE VEIL. "view the wall" lifts it, the field
// comes up to full light, the lens blooms and the walk begins, and the title
// and the count settle into one row under the bar, THE BAND, so the wall
// keeps its name and its one fact while the names take the screen. The veil
// is up once per tab: coming back from a letter lands on the field.
//
// The tower came off. The Campanile stood in the masthead's corner and then
// on the count as its plinth, and it never stopped reading as a thing put
// there: a drawing beside a headline that had already said which campus this
// was. The wall's own light is in its field now, on the person in the lens.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Display, Label, Pill, TopBar, Icon, SiteFoot, ArrowLink } from '../parts.jsx'
import { Sparkle, Flap } from '../art.jsx'
import { wall, liveCount, wallError, wallLoaded, loadWall } from '../data.js'
import { getState, patch } from '../store.js'
import Hive from '../Hive.jsx'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

// The count, wherever it stands: the flaps and the word while there are
// letters, the open line while there are none, the plain fact when the index
// did not load, and nothing at all while it is still loading, because a wall
// that has not loaded has no number and is not open with nothing on it.
function Count({ letters, roll = false, delay = 0 }) {
  const err = wallError()
  if (!err && !letters && !wallLoaded()) return null
  if (err) {
    return (
      <Label tone="dim" className="wl-count-meta" aria-live="polite">
        {err === 'offline' ? 'the wall is not connected here' : 'the wall did not load. '}
        {err === 'offline' ? null : (
          <button type="button" className="wl-quiet" onClick={() => loadWall(true)}>read it again</button>
        )}
      </Label>
    )
  }
  if (letters > 0) {
    return (
      <span className="wl-board">
        <Flap value={letters} roll={roll} delay={delay} />
        <span className="wl-board-say">{letters === 1 ? 'letter' : 'letters'}</span>
      </span>
    )
  }
  return <Label className="wl-board-say is-open">open now</Label>
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
          Everything under the bar and over the way off: the band, the stage
          the hive fills, and while it is up the veil over both. The veil
          covers the band as well as the stage so its scrim runs from the
          bar down and the type stands where the masthead stood. */}
      <div className="wl-room">
      {/* ── the band ──
          The masthead once the veil has gone: the title on one row with the
          count at its end, small, so the wall keeps its name over the field
          and the one fact worth printing stays in view. It holds its room
          while the veil is up so the field under it does not change size when
          the veil lifts. */}
      <div className="wl-band" aria-hidden={veiled || undefined}>
        <Display size="s" as="h1" className="wl-band-title">
          A wall of unforgettable berkeley bears.
        </Display>
        <div className="wl-band-count">
          <Count letters={letters} />
        </div>
      </div>

      {/* ── the stage ──
          The field, and the veil laid over it. The stage is the whole of the
          screen the bar, the strip, the way off and the dock leave, and it
          bleeds to the edges of the viewport, because a field of faces with a
          margin either side is a widget on a page. */}
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
                <Display size="xl" as="p" className="wl-mast-title">
                  A wall of<br />unforgettable<br />berkeley bears.
                </Display>
                {/* ── what it is, in one line ──
                    The title names the wall and this says what is on it, in
                    the reading face, the way the front door runs one line of
                    the mechanic under its own headline (hero.css .hm-read). */}
                <p className="wl-mast-sub">anonymous letters to the one you never told.</p>
                {/* ── the count ──
                    The one fact about this wall worth printing, on split flaps
                    (art.jsx Flap). On the opening the digits roll into place;
                    after that a flap moves only when a letter goes up. */}
                <div className="wl-mast-count">
                  <Count letters={letters} roll={playing} delay={1100} />
                </div>
                <ArrowLink className="wl-mast-go" onClick={lift}>view the wall</ArrowLink>
              </div>
            </div>
          </div>
      )}
      </div>

      {/* ── the way off ──
          A public list of handles says, in public, that these people are being
          written about, and not one of them asked to be. So the way back off
          sits on the wall itself, in plain sight under the names.

          It is set quiet rather than hidden. Quiet is right, because it is not
          what the wall is for; hidden would be the tell that the wall would
          rather not be asked. */}
      <div className="wl-wall-foot">
        <button type="button" className="wl-mine is-wide" onClick={() => go('remove')}>
          take your name off the wall
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

        {/* ── the way in, and the signpost ──
            The composer's pill, and under it one quiet line. The line used
            to be an arrow link beside the pill reading "place a ping", set
            in the display face at the pill's own height: two acts on one
            row, in two vocabularies, and the second one a word nobody who
            scanned a flyer has met. A person standing on the wall read it
            as a choice they could not make.

            So it is the quiet control now, the sentence the sheets put under
            a primary and nothing else, and it names the product rather than
            an act: there is more of celestual than this wall, and the front
            door says what. It does not pitch, it does not say "ping", and
            it is the size of a caption, because the tab above is the offer
            and this is only the sign on the road to it. It goes while the
            tab is up, since the tab is that road. A real anchor: the wall's
            shell cannot draw Main, so the walk over is a navigation. */}
        <div className="wl-dock-in">
          <Pill tone="light" wide onClick={() => go('write')}>
            write
          </Pill>
          {!tab && (
            <a className="wl-quiet wl-dock-rest" href="/" title="the front">
              <span>the rest of celestual</span>
              <span className="wl-dock-rest-go" aria-hidden="true">&#8594;</span>
            </a>
          )}
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

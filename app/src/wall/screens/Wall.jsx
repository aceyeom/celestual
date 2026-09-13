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
// that is the whole of it.
//
// Nor is the composer's capsule at the foot any more. "write anonymously"
// stood docked over the bottom of the field on every visit, a wide chalk plate
// on the faces it was about, while a bare nib in the bar pointed at the same
// door and read as a glyph. The act is one control now, in the bar, as a word:
// a small capsule reading "write" between the glass and the person
// (parts.jsx TopBar). The field keeps its bottom edge, and the dock at the
// foot carries only what is ABOUT this person: the tab, and the notice when a
// letter of theirs has come down.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE, AND THE VEIL OVER IT                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The names are a crowd of faces bent by a lens (Hive.jsx): laid on a
// hexagonal lattice that never ends and then, by one continuous function of
// how far a face is from the light, made large and nearly touching at the
// middle and small, far apart and scattered toward the rim. One name is
// written on it, the handle of whoever the lens is reading, on one glass
// plate, and never two; everything else about a person is behind the tap.
// The field drifts, every disc in it breathes on its own clock, it can be
// pulled in any direction, and under a mouse it swells where the pointer is.
//
// ── the field is the screen, and the screen has no margins ──────────────────
// It is not a panel between the bar and the foot. It runs corner to corner,
// behind the bar, behind the ear, out past the column's own gutters to the
// edges of the glass, and it dissolves at every edge rather than stopping at
// one. What keeps the type over it legible is not a box around the field but
// two gradients over it, THE SHADES, which pour the void back in at the top
// and the bottom and are gone by the middle.
//
// ── the veil, and what is under it ──────────────────────────────────────────
// On a fresh load the whole screen is the field, greyed, with the title, the
// one line and the way in laid over it: THE VEIL. The type stands in the
// middle of the glass, centred, the way a poster's title block stands in the
// middle of a poster; it used to hang off the top left under the ear, and on
// a phone that put the wall's one headline in the corner of the one screen
// built to be looked at. Under it there is no dock, no foot and no glyphs in
// the bar: a poster with one door on it, over a field that is plainly alive,
// and the brand in the corner as the way home.
//
// The door is the capsule under the line, "view the wall", with the running
// light riding inside it and nothing drawn round it. A control that says
// what it does before it is pressed needs no sentence beside it. It replaced
// an arrow link, which is the poster's nav voice and reads as a link to
// elsewhere rather than as the way into the thing under it; and for a while
// two hairline rings left it in turn and opened out into the field, which
// was a line drawn over the crowd every second and a half on a screen whose
// whole job is to be calm.
//
// ── and it opens where it was touched ───────────────────────────────────────
// A tap anywhere on the veil lifts it, and it lifts FROM THE TAP, as a pulse
// sent through the crowd. The veil, grey and type together, opens as a circle
// growing out from under the finger, and the same front runs through the
// field under it: every disc it reaches swells, is pushed out ahead of it,
// drawn back a hair behind it and settles, and the lens arrives with the
// light, so the faces are seen to come up as the wave crosses them (Hive.jsx,
// the pulse). The title is not faded on a clock of its own: the circle takes
// it as it reaches it. It is slow, on purpose, the better part of two seconds
// to cross a phone, and when the circle has cleared the screen the rest of
// the wall arrives, the bar's glyphs and then the dock, a beat apart. One
// line stays exactly where it was through all of it, THE EAR: the campus and
// the count, under the bar.
//
// The veil is up once per tab: coming back from a letter lands on the field.
// Under reduced motion it goes without travelling.
//
// ── and a name opens into the letter it carries ─────────────────────────────
// Pressing a disc sends the same pulse out from that person and brings them
// into the light, and then the letter's own card opens out of their disc,
// its words on it from the first frame (Hive.jsx, morph.js,
// screens/Letter.jsx). One object, one movement, and nowhere in it the moment
// where the wall was replaced by a screen. The card closes back into the same
// disc on the way out.
//
// ── and it receives the letter ──────────────────────────────────────────────
// The composer is a sheet over this screen, and when its letter is up the
// sheet goes and the wall is what is left: the name it was written to sends
// one pulse out through the crowd and comes into the light, and its disc
// rises among the others (Hive.jsx `pulse`, and `fresh`). There is no page
// between the sending and the seeing. The reading happens after: the
// classifier reads the letter once it is up (celestual-wall-moderate), and
// this screen asks after this person's own letters a few times over the next
// half minute, so a letter the reading took down is said here, within the
// minute, in the notice below, rather than on the next visit.
//
// ── the foot of the wall is about the person looking ────────────────────────
// Two things can stand in the dock, and never both: the notice, when a letter
// this person put up has since been taken down, saying so in one sentence and
// handing them their own words back to change; and the tab, the one door out
// of the wall, which asks the one question a person who has just named
// somebody is carrying. The tab can be put away, and it comes back: after a
// few days, and at once after another letter goes up, because that is the
// moment its question is fresh again. A door that cannot be closed is a
// banner, and a door that never reopens is a door somebody missed once.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Display, TopBar, Icon, SiteFoot, Face, Light, Pill, Roll } from '../parts.jsx'
import { Sparkle } from '../art.jsx'
import { wall, liveCount, wallError, wallLoaded, loadWall, loadHandle, mine, loadMine, atHandle, warmRest, term } from '../data.js'
import { getState, patch } from '../store.js'
import { isMember } from '../auth.js'
import { whyDown } from '../moderate.js'
import Hive from '../Hive.jsx'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

// ── the wave's clock ──
// How long the front takes to reach the far corner of the glass from the tap
// is a function of how far that is: a floor and a ceiling, and between them
// about half a millisecond a pixel, so a phone is crossed in a little under
// two seconds and a wide screen in a little over. One number for both would
// be a flash on the spread or a crawl on the phone. The pulse in the field
// runs the same clock as the hole in the veil (Hive.jsx reads `wave`), so
// the light and the crowd moving under it cannot drift apart.
//
// The curve is a shallow ease out: a wave travels nearly straight and slows
// a little as it goes. On an ease-out cubic the front had three quarters of
// its reach by a third of its time, which read as a pop. And a wave has a
// tail: past the far corner the crest is still on the discs there, so the
// amplitude is let go over the last stretch rather than cut, and the field
// is told the wave is over only when nothing is left of it.
const RIPPLE_MIN = 1600
const RIPPLE_MAX = 2300
const RIPPLE_PER_PX = 0.55
const RIPPLE_BASE = 1250
const RIPPLE_POW = 1.45
// where the amplitude starts to go, and where it is gone, as fractions of
// the front's own clock; and how long the crest takes to come up under the
// finger at the start, so the disc under the tap swells rather than pops
const TAIL_FROM = 0.88
const TAIL_TO = 1.36
const RISE = 0.1
const ARRIVE_MS = 1400
// The veil's scrim reaches this far up over the bar, so a circle has to
// travel that much further to clear the top of the glass (wall.css --ramp).
const RAMP = 110

// ── the tab's clock ──
// How long the tab stays away once it has been put away. It rises again on a
// visit after this, and at once after another letter goes up, whatever the
// clock says: a person who has just named somebody else is carrying the
// question again.
const TAB_AGAIN_MS = 3 * 86400000
// how long the tab takes to go when it is put away (wall.css wl-tab-drop)
const TAB_OUT_MS = 320
// how long it waits to rise after a letter has just gone up: past the pulse
// the wall sends out from the new name, so the offer follows the arrival
// rather than competing with it
const TAB_AFTER_LETTER_MS = 3200

// ── the arrival's clock ──
// How long after the composer's glass has gone the wall sends its pulse out
// from the new name: a beat, so the sheet's last frame and the travel's
// first are not the same frame. And when this person's letters are asked
// about again after one goes up, since the reading lands on a letter a few
// seconds after it is written and a takedown is owed to its writer at once.
const ARRIVE_AFTER_MS = 160
const READ_AGAIN_MS = [3000, 8000, 16000, 32000]

function rippleMs(r) {
  return Math.round(Math.max(RIPPLE_MIN, Math.min(RIPPLE_MAX, RIPPLE_BASE + r * RIPPLE_PER_PX)))
}

// A frame to hold the ripple on, for the screenshot loop only: `/berkeley?rp=0.4`
// opens the veil from wherever it is tapped and leaves the circle, and the
// crest under it, at four tenths of its reach, the way `/?beat=3` holds the
// intro. Nothing in production reads the query string.
function heldRipple() {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('rp')
  return v === null ? null : Math.max(0, Math.min(1, Number(v) || 0))
}

// Whether the tab is due: this device has put a letter up, and the tab has
// not been put away, or was put away long enough ago, or another letter has
// gone up since.
function tabDue(state) {
  const n = (state.written || []).length
  if (!n) return false
  if (!state.tabHid) return true
  if (n > (state.tabHidFor || 0)) return true
  return Date.now() - state.tabHid > TAB_AGAIN_MS
}

// ── the ear ─────────────────────────────────────────────────────────────────
// The campus, the count and the term, on one line under the bar: a dateline,
// the way the paper carries one across its own top rule. Two faces and no
// punctuation: the campus in the display face, small, the way the brand sets
// its own word; the count beside it in the identifier face, the figure a
// step larger and in chalk, the word after it at the label's size in ash;
// and the term at the end of the line, dimmer still, because a wall is a
// thing that happens in a term and that is the one honest date it has. The
// two faces and the three weights are the hierarchy, so the line needs no
// sparkle in front of it and no dot between its parts; it used to carry
// both, and eleven pixels of uppercase mono with two ornaments in it was the
// busiest object on a screen whose whole job is to be calm.
//
// The figure turns (parts.jsx `Roll`): a letter arriving, from this phone or
// any other, turns the last digit up one where it stands, and nothing else
// on the line moves. It is the one fact about this wall worth printing, and
// now it is seen to be kept. While the index is still loading there is no
// count, because a wall that has not loaded has no number; when it did not
// load the line says so, in the count's place.
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
    meta = (
      <span className="wl-ear-meta">
        <Roll value={letters} className="wl-ear-n" /> {letters === 1 ? 'letter' : 'letters'}
      </span>
    )
  } else if (loaded) {
    meta = <span className="wl-ear-meta">open now</span>
  }
  return (
    <div className="wl-ear" aria-live="polite">
      <span className="wl-ear-name">berkeley</span>
      {meta}
      {loaded && !err ? <span className="wl-ear-term">{term()}</span> : null}
    </div>
  )
}

// ── the tab ─────────────────────────────────────────────────────────────────
// THE ONLY DOOR OUT OF THE WALL, and it is not here until somebody has put a
// letter up. Offering an account to a person who has not written anything is
// asking them to register for a result they have not earned and cannot
// receive; offering it thirty seconds after they have named somebody is
// asking the one question they are now actually carrying. So it waits, and
// then it rises.
//
// It is a card now, and it says who "they" are: the faces of the names this
// device wrote to stand at the head of the sentence, so the offer is about
// the people this person actually named and not about a pronoun. It says the
// same sentence the screen it opens says, word for word. A door and the room
// behind it that describe themselves differently is a door somebody has to
// decide about twice. Under it, one quiet line puts it away.
function Tab({ faces, onGo, onHide, going }) {
  return (
    <div className={`wl-tab${going ? ' is-going' : ''}`}>
      <button type="button" className="wl-tab-main" onClick={onGo}>
        <span className="wl-tab-faces" aria-hidden="true">
          {faces.length
            ? faces.map((h) => <Face key={h} handle={h} size={28} className="wl-tab-face" />)
            : <Sparkle size={12} />}
        </span>
        <span className="wl-tab-text">
          Get notified if they<br />put you up too.
        </span>
        <span className="wl-tab-go" aria-hidden="true"><Icon name="join" size={19} /></span>
      </button>
      <button type="button" className="wl-quiet wl-tab-hide" onClick={onHide}>not now</button>
    </div>
  )
}

// ── the notice ──────────────────────────────────────────────────────────────
// A letter this person put up has been taken down since: the reading took it
// down after it went up, or a person at a desk did, or the name it was
// written to came off the wall. One card, at the foot of the wall, saying
// which letter, that it went against the terms (moderate.js `whyDown`: the
// fact and the way back, never a machine explaining itself), and offering the
// one thing worth doing about it: their own words back, on the composer, to
// change. Nothing about a report is said here: a letter a reader took down is
// a matter between the reader and a desk, and telling the writer would be
// pointing them at the person who is likeliest to have done it.
//
// It stands until it is answered, once, and then it is remembered as read.
function Down({ letter: l, onChange, onLeave }) {
  const again = l.downBy !== 'shut'
  return (
    <div className="wl-down" role="status">
      <div className="wl-down-in">
        <Face handle={l.to} size={36} className="wl-down-face" />
        <div className="wl-down-text">
          <p className="wl-down-h">Your letter to <span className="wl-h">{atHandle(l.to)}</span> was taken down.</p>
          <p className="wl-down-why">{whyDown(l.downBy)}</p>
        </div>
      </div>
      <div className="wl-down-acts">
        {again ? <Pill tone="light" onClick={onChange}>change it</Pill> : null}
        <button type="button" className="wl-quiet" onClick={onLeave}>{again ? 'leave it' : 'ok'}</button>
      </div>
    </div>
  )
}

export default function Wall({ go, reduce, rev, under = false }) {
  // The index, shaped (data.js `wall`). The same array until the index is
  // read again, whatever else the corpus does, so the hive under it, which
  // keys its layout off the array's identity, is laid out once per reading
  // of the index and not once per revision of the corpus.
  const tiles = wall()
  const letters = liveCount()
  const state = getState()
  const written = state.written
  const wroteTo = state.wroteTo || []

  // The opening cascade. It is a state rather than a constant because the
  // class that carries it has to come back off: while `is-opening` is on the
  // page every disc in the field is under a `both`-filled arrival animation,
  // and an arrival animation on an element is an animation a later one, a
  // name that has just been written to, say, has to out-specify to be seen
  // at all. It plays, and then it is over.
  const [playing, setPlaying] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)

  // ── the veil ──
  // Up on a fresh load, once per tab. `lifting` is the wave's own length:
  // the circle is opening from the tap and nothing under the veil exists yet.
  // `down` is the wall. `tap` is where the veil was touched, in its own
  // frame, and how far a circle from there has to grow to clear the glass;
  // the stylesheet reads all three and the loop below drives the growth.
  const [veil, setVeil] = useState(() => (OPENED ? 'down' : 'up'))
  const [tap, setTap] = useState(null)
  // The beat after the veil has gone, while the glyphs and the dock arrive.
  // A class on the page for that long, and then nothing: the arrival is an
  // entrance, not a state.
  const [arriving, setArriving] = useState(false)
  const veilEl = useRef(null)
  const timers = useRef([])
  // ── the wave ──
  // One object, owned here and read by the field on every frame (Hive.jsx
  // readWave): where the glass was touched, in the window's own coordinates,
  // how far the front has travelled, how much of the wave is left, and how
  // far it has to go. It is a ref and not state because it changes sixty
  // times a second and nothing about the tree does; the loop below writes
  // it and the field's own loop reads it.
  const wave = useRef(null)
  const raf = useRef(0)
  const lift = useCallback((e) => {
    if (veil !== 'up') return
    OPENED = true
    if (reduce) { setVeil('down'); return }
    const box = veilEl.current ? veilEl.current.getBoundingClientRect() : null
    let x = box ? box.width / 2 : 0
    let y = box ? box.height / 2 : 0
    if (box && e) {
      // A key press has no point on the glass, so it opens from the middle
      // of the thing that was pressed; a finger or a pointer opens from
      // exactly where it landed.
      const byKey = e.detail === 0 || (!e.clientX && !e.clientY)
      const own = byKey && e.currentTarget && e.currentTarget.getBoundingClientRect
        ? e.currentTarget.getBoundingClientRect() : null
      x = own ? own.left + own.width / 2 - box.left : e.clientX - box.left
      y = own ? own.top + own.height / 2 - box.top : e.clientY - box.top
    }
    // the farthest corner of the glass from the tap, and the ramp over the
    // bar above it, is how far the circle has to reach
    const r = box
      ? Math.hypot(Math.max(x, box.width - x), Math.max(y + RAMP, box.height - y))
      : 1400
    const ms = rippleMs(r)
    setTap({ x, y, r })
    setVeil('lifting')
    const w = {
      id: performance.now(),
      cx: box ? box.left + x : x, cy: box ? box.top + y : y,
      r: 0, amp: 0, rmax: r,
    }
    wave.current = w

    // ── the front ──
    // One number, from nought to one, written to the veil as `--rp` and to
    // the wave as its radius on every frame, so the hole in the grey and the
    // crest in the crowd are one front. Held, for the screenshot loop.
    const held = heldRipple()
    if (held !== null) {
      if (veilEl.current) veilEl.current.style.setProperty('--rp', held.toFixed(4))
      w.r = r * held; w.amp = 1
      return
    }
    const t0 = performance.now()
    const step = (now) => {
      const p = (now - t0) / ms
      const front = 1 - Math.pow(1 - Math.min(1, p), RIPPLE_POW)
      w.r = r * front
      // up under the finger, whole across the glass, and let go past the
      // far corner
      w.amp = p < RISE ? p / RISE : p < TAIL_FROM ? 1 : Math.max(0, 1 - (p - TAIL_FROM) / (TAIL_TO - TAIL_FROM))
      if (veilEl.current) veilEl.current.style.setProperty('--rp', front.toFixed(4))
      if (p < TAIL_TO) raf.current = requestAnimationFrame(step)
      else { wave.current = null; raf.current = 0 }
    }
    raf.current = requestAnimationFrame(step)
    timers.current.push(window.setTimeout(() => { setVeil('down'); setArriving(true) }, ms))
    timers.current.push(window.setTimeout(() => setArriving(false), ms + ARRIVE_MS))
  }, [veil, reduce])
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    cancelAnimationFrame(raf.current)
    wave.current = null
  }, [])

  useEffect(() => {
    if (armed) return undefined
    const t = setTimeout(() => { OPENED = true; patch({ seen: true }); setArmed(true) }, 2000)
    return () => clearTimeout(t)
  }, [armed])

  // the cascade's own length: the last thing in it starts at 1900ms and the
  // field's outermost discs land a little after that
  useEffect(() => {
    if (!playing) return undefined
    const t = setTimeout(() => setPlaying(false), 3400)
    return () => clearTimeout(t)
  }, [playing])

  // ── the tab ──
  // Not on the screen the instant a letter is up: it rises once the wall has
  // received the name and the pulse has gone through the crowd, and on a
  // later visit a beat after the wall has settled. A panel that is already
  // there when the screen arrives is a banner. `going` is the beat it takes
  // to leave when it is put away, so it is seen to go rather than to vanish.
  const [tab, setTab] = useState(() => tabDue(getState()) && reduce)
  const [going, setGoing] = useState(false)
  useEffect(() => {
    if (tab || !tabDue(getState())) return undefined
    const wait = reduce ? 0 : getState().justPosted ? TAB_AFTER_LETTER_MS : 900
    const t = setTimeout(() => setTab(true), wait)
    return () => clearTimeout(t)
  }, [written.length, tab, reduce])
  const hideTab = useCallback(() => {
    patch({ tabHid: Date.now(), tabHidFor: (getState().written || []).length })
    if (reduce) { setTab(false); return }
    setGoing(true)
    timers.current.push(window.setTimeout(() => { setGoing(false); setTab(false) }, TAB_OUT_MS))
  }, [reduce])

  // ── the notice ──
  // This person's own letters are asked about on every landing by a device
  // that can write, since a person at a desk can take one down at any hour.
  // The first that has come down and has not been answered is the notice.
  const member = isMember()
  useEffect(() => { if (member) loadMine() }, [member, rev])
  const noticed = state.noticed || {}
  const down = (mine() || []).find((l) =>
    (l.downBy === 'screen' || l.downBy === 'desk' || l.downBy === 'shut') && !noticed[l.id]) || null
  const answer = useCallback((l) => {
    patch({ noticed: { ...(getState().noticed || {}), [l.id]: true } })
  }, [])
  const changeDown = useCallback((l) => {
    answer(l)
    patch({ draft: { to: l.to, body: l.body } })
    go('write', l.to)
  }, [answer, go])

  // The name, not a letter id. A tile is a person written to, the letter
  // screen resolves a handle to the letters under it, and going by name means
  // the tap does not wait on a request that has not happened yet. The words
  // are asked for the moment a finger lands on a disc, so the card that opens
  // out of it has them a beat sooner.
  const open = useCallback((handle) => go('letter', handle), [go])
  const peek = useCallback((handle) => { loadHandle(handle) }, [])

  // Under the veil nothing is being read and nothing can be pulled; the
  // moment the circle starts to open the field is the field, so it comes up
  // to full light inside the circle as it grows rather than after it.
  const veiled = veil === 'up'
  const lifted = veil === 'down'

  // the rest of the faces, once the field is up and again when the index
  // moves, in idle time (data.js warmRest)
  useEffect(() => { if (lifted) warmRest() }, [lifted, rev])

  // ── the arrival, rippled ──
  // The composer goes the moment its letter is up, and the wall under it
  // receives the name: one pulse out through the crowd from that person's
  // disc, the disc brought into the light, and the disc itself rising among
  // the others (Hive.jsx `pulse`, and `fresh`), so the wall is seen to
  // receive the letter rather than merely to carry it. It waits for the glass
  // to have gone and the veil to be down, since a pulse sent under either is
  // a pulse nobody sees, and a beat more. Once: the name is taken out of the
  // store the moment it is read.
  const hive = useRef(null)
  const [sentAt, setSentAt] = useState(0)
  useEffect(() => {
    if (under || !lifted) return undefined
    const h = getState().justPosted
    if (!h) return undefined
    patch({ justPosted: '' })
    setSentAt(Date.now())
    if (reduce) return undefined
    const t = setTimeout(() => { if (hive.current) hive.current.pulse(h) }, ARRIVE_AFTER_MS)
    return () => clearTimeout(t)
    // and on `rev`: a letter that went up after its sheet was closed over it
    // is written to the store when the index has moved, which is this
  }, [under, lifted, reduce, rev])

  // ── the reading, after ──
  // The letter is read once it is up, and the verdict lands on it a few
  // seconds later. So this device's letters are asked about again, a few
  // times over the half minute after one goes up: a letter the reading took
  // down raises the notice below within the minute, and the index is read
  // again with it, so the name comes off the field if that was its only
  // letter.
  useEffect(() => {
    if (!sentAt) return undefined
    const ts = READ_AGAIN_MS.map((ms) => window.setTimeout(async () => {
      await loadMine(true)
      const read = getState().noticed || {}
      if ((mine() || []).some((l) => l.downBy === 'screen' && !read[l.id])) loadWall(true)
    }, ms))
    return () => ts.forEach(clearTimeout)
  }, [sentAt])
  const veilStyle = tap
    ? { '--rx': `${tap.x.toFixed(1)}px`, '--ry': `${tap.y.toFixed(1)}px`, '--rmax': `${tap.r.toFixed(1)}px` }
    : undefined
  const docked = lifted && (!!down || tab)

  return (
    <>
    <div className={`wl-page wl-wallpage is-${veil}${playing ? ' is-opening' : ''}${docked ? ' has-tab' : ''}${arriving ? ' is-arriving' : ''}`}>
      {/* ── the stage ──
          The field, and it is the whole screen: corner to corner, behind the
          bar, behind the ear, out past the column's own gutters to the edges
          of the glass. A field of faces inside a margin is a widget on a
          page, and this is not a widget: it is the room the page is standing
          in. What keeps the type on top of it legible is not a box around the
          field but two gradients over it, below. */}
      <div className="wl-stage">
        <Hive
          ref={hive}
          tiles={tiles} reduce={reduce} veiled={veiled} paused={under}
          opening={playing} mine={wroteTo} wave={wave} onOpen={open} onPeek={peek}
          none={wallLoaded() && !wallError() ? 'nobody has been written to yet' : ''}
        />
      </div>

      {/* ── the two shades ──
          The bar has to be readable over whatever face happens to be under it
          and so does the dock, and the answer is not a plate behind either of
          them: a plate is a bar sitting ON a picture, and these have to be IN
          it. So the void is poured back over the field at the top and the
          bottom, deepest at the two edges and gone by the time it reaches the
          middle of the screen. Neither takes a pointer: the faces under them
          are still names you can press. */}
      <div className="wl-shade is-top" aria-hidden="true" />
      <div className="wl-shade is-bottom" aria-hidden="true" />

      {/* the bar keeps its brand throughout and gains its controls when the
          veil has gone: under the veil the poster has one door and the way
          home, and nothing else to press */}
      <TopBar go={go} at="wall" acts={lifted} />

      {/* ── the room ──
          The ear, and while it is up the veil. Both stand over the field
          rather than beside it: the veil's scrim runs from the bar down, and
          the ear stands above the scrim and does not move when it goes. */}
      <div className="wl-room">
        <Ear letters={letters} />

        {!lifted && (
          <div
            className={`wl-veil${veil === 'lifting' ? ' is-lifting' : ''}`}
            ref={veilEl} style={veilStyle}
          >
            {/* everything the circle takes: the grey and the type, in one
                masked layer, so one edge cuts through both */}
            <div className="wl-veil-mask">
              {/* the grey over the field is itself the way in: a tap anywhere
                  on it opens it from there, and the capsule below says so
                  in words */}
              <button type="button" className="wl-veil-scrim" onClick={lift} aria-label="view the wall" tabIndex={-1} />
              <div className="wl-veil-in">
                <div className="wl-mast">
                  <Display size="xl" as="h1" className="wl-mast-title">
                    A wall of<br />unforgettable<br />berkeley bears.
                  </Display>
                  {/* ── what it is, in one line ──
                      The title names the wall and this says what is on it,
                      in the reading face, the way the front door runs one
                      line of the mechanic under its own headline (hero.css
                      .hm-read). */}
                  <p className="wl-mast-sub">anonymous letters to the one you never told.</p>
                  {/* ── the way in ──
                      The product's own capsule, with the light running inside
                      it, and nothing round it. Two hairline rings used to
                      leave it in turn and open out into the field; a ring is
                      a line drawn over the crowd, and the pulse the tap sends
                      is the crowd itself moving, so the capsule stands still
                      and the light inside it is the whole of the invitation. */}
                  <button type="button" className="wl-mast-go" onClick={lift}>
                    <span className="wl-mast-go-pill">
                      <Light plate="chalk" />
                      <span className="wl-mast-go-t">view the wall</span>
                      <span className="wl-mast-go-g" aria-hidden="true">&#8594;</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── the dock ──
          What stands at the foot of the wall is about the person looking, and
          it is one thing at a time: the notice when a letter of theirs has
          come down, else the tab. Nothing at all under the veil, and nothing
          at all for a person who has not put anything up: the field runs to
          the bottom edge and the shade is the whole of the foot. */}
      {docked && (
      <div className="wl-dock">
        <div className="wl-dock-veil" aria-hidden="true" />
        {down ? (
          <Down letter={down} onChange={() => changeDown(down)} onLeave={() => answer(down)} />
        ) : (
          <Tab faces={wroteTo.slice(0, 3)} onGo={() => go('join')} onHide={hideTab} going={going} />
        )}
      </div>
      )}
    </div>

    {/* ── the foot of the site ──
        Under the wall, in its own column, so the wall keeps the whole first
        screen and the dock keeps the bottom of it. The same block the front
        door ends on, with the company on it. Not under the veil: the veil is
        one screen exactly, and there is nothing to scroll to until it has
        gone. */}
    {lifted && (
    <div className="wl-page is-foot">
      <SiteFoot />
    </div>
    )}
    </>
  )
}

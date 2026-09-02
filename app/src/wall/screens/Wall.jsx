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
// again. The ONE door to it is the tab at the bottom of this screen, and that
// tab does not exist until you have put a letter up yourself.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE INSCRIPTION — it drifts, and now it is also a thing you can pull    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// It was one run of names at three weights, wrapping, with a star between them:
// not a grid of cards (a directory) and not a tag cloud (analytics), but
// something ACCUMULATED, which is what it is. Then it started drifting, in
// lanes, alternating direction, because a static block of names reads as a list
// that was printed once and the one thing this surface has to say in its first
// second is that people are still doing this.
//
// Both of those are still true. What is new is that the drift is no longer the
// only way through it: THE WALL CAN BE PULLED. Swipe it, throw it, spin a
// trackpad across it, and the names run under your finger and coast to a stop;
// let go of it and the ambient drift takes back over exactly where you left it.
//
// That is not a scroll bar wearing a costume, and the difference matters:
//
//   · IT NEVER ENDS AND IT NEVER STARTS. Each lane is a loop, wrapped by the
//     modulo of its own measured width, so there is no first name and no last
//     one and no edge to hit. Pull it far enough in either direction and you
//     come back round to where you began, which is the honest shape of a wall
//     that keeps accumulating.
//   · THE WHOLE FIELD MOVES WITH THE FINGER. Every lane takes the same delta
//     while a drag is live, so the wall reads as one surface being pushed
//     rather than as eight independent tickers that happen to be stacked. The
//     alternating drift comes back the moment the drag ends, and it is what
//     makes this a wall with weather in it rather than a stock crawl.
//   · A PULL IS NOT A TAP. Every name is a target, so a drag past a few pixels
//     swallows the click it would otherwise end in. Nothing is more annoying
//     than a surface that opens a letter because you tried to look past it.
//
// ── it has to work at five names and at five hundred ────────────────────────
// The corpus is a live thing: on the first morning of a campaign this wall
// might carry five handles, and by the end of a week it carries hundreds. Both
// have to look deliberate, and neither can be the case the layout was tuned
// for.
//
//   THE LANE COUNT is a ladder off the handle count (`laneCount`). Five names
//   across seven lanes is six nearly-empty rows and one that reads as a mistake;
//   five names in two lanes is a wall that is simply young. Sixty names in two
//   lanes is a pair of hour-long tracks nobody ever sees the end of.
//   THE RUN REPEATS ITSELF until it is wider than the lane it is in
//   (`passesFor`), in WHOLE passes through that lane's names, so a short wall
//   tiles evenly instead of leaving a hole travelling across the screen. This
//   is the part that makes five names work at all: the lane is full, it is
//   simply full of the same five names, which is the truth.
//   THE CYCLE IS MEASURED, never estimated. The estimate decides how many
//   copies to render; a layout pass reads the real width back and that is what
//   the wrap uses, so a font swapping in mid-cascade cannot leave a seam.
//
// ── and sideways ────────────────────────────────────────────────────────────
// A phone on its side has about 350px of height, which is four lanes and no
// more. The ladder is capped there rather than the lanes being squeezed, since
// a lane too short to set a 21px name in is not a lane.
//
// Under `prefers-reduced-motion` none of this happens and the original wrapping
// inscription is rendered instead — not a frozen banner, which would strand the
// names in ragged rows, but the composition this was before it moved.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, TopBar, Icon } from '../parts.jsx'
import { Sparkle, Halftone } from '../art.jsx'
import { wall, liveCount, atHandle, rand } from '../data.js'
import { getState, patch } from '../store.js'

// The opening plays once per session and never again. Coming back to the wall
// from a letter should land on the wall, not on a title.
let OPENED = false

// ── the physics ─────────────────────────────────────────────────────────────
// One linear speed for every lane, in pixels per second, so lanes carrying
// different names still travel together. Lanes at visibly different speeds read
// as a bug rather than as parallax; a few percent of jitter reads as air.
const DRIFT = 19
const JITTER = 0.12
// Below this a throw has stopped, and holding a fractional velocity alive
// forever costs a frame every 16ms to move nothing.
const STOP = 14
// How much of its speed a throw keeps each 60Hz frame. 0.94 coasts about a
// second and a half, which is long enough to feel like weight and short enough
// that the ambient drift is visibly back in charge before anybody wonders.
const FRICTION = 0.94
// A press that travels further than this was a pull, and the name under it does
// not open. Under it, the finger never really moved and the tap stands.
const SLOP = 6

// ── the ladder ──────────────────────────────────────────────────────────────
// How many lanes a given number of handles is worth. It is a ladder rather than
// a division because the failure is not linear: too few lanes for a big wall is
// merely slow, and too many lanes for a small one is visibly broken.
function laneCount(n, cap) {
  const rungs = n <= 4 ? 1
    : n <= 10 ? 2
    : n <= 18 ? 3
    : n <= 30 ? 4
    : n <= 44 ? 5
    : n <= 60 ? 6
    : 7
  return Math.max(1, Math.min(rungs, cap))
}

// Round-robin rather than sliced in blocks, so the heavy names — the ones
// carrying three letters, set biggest — end up spread one per lane instead of
// stacked in the first two. A banner with all of its weight in the top corner
// is a banner that is bottom-empty for the whole of its cycle.
function laneUp(tiles, n) {
  const lanes = Array.from({ length: n }, () => [])
  tiles.forEach((t, i) => lanes[i % n].push(t))
  return lanes.filter((l) => l.length)
}

// ── how wide a name is, before it exists ────────────────────────────────────
// The three sizes are the ones in wall.css (.wl-name.is-w0/1/2), and the face
// is monospace, so one advance is about 0.6em and a handle's width is
// arithmetic rather than a guess. This only ever decides HOW MANY copies to
// render; the wrap itself runs off the measured width, so being a little wrong
// here costs a few nodes and nothing else.
const SIZE = [13, 16.5, 21]
function tileWidth(t) {
  const chars = t.handle.length + 1 + (t.count > 1 ? 1 : 0)
  return chars * SIZE[t.weight] * 0.6 + 24
}

// Whole passes through the lane's own names, until the run clears the width it
// has to cover. Whole ones, so the sequence reads the same on every pass rather
// than restarting halfway through the list.
function passesFor(lane, target) {
  const one = lane.reduce((w, t) => w + tileWidth(t), 0) || 1
  const want = Math.ceil(target / one)
  // A ceiling on the node count, not on the width. Past this the lane is long
  // enough that nobody will ever reach the end of it anyway, and the measured
  // wrap below covers the gap if the estimate was short.
  const most = Math.max(1, Math.floor(72 / lane.length))
  return Math.max(1, Math.min(want, most))
}

const wrap = (v, m) => (m > 0 ? ((v % m) + m) % m : 0)

// One name. Rendered once per copy of the run — every copy after the first is
// hidden from the accessibility tree and from the tab order, because a wall of
// sixty names that a screen reader announces four hundred times is a wall that
// has been made worse by an animation nobody can see.
function Name({ tile, ember, ghost, onOpen }) {
  return (
    <span className="wl-slot">
      <button
        type="button"
        className={`wl-name is-w${tile.weight}${ember ? ' is-ember' : ''}${tile.mine ? ' is-mine' : ''}`}
        onClick={() => onOpen(tile.handle)}
        tabIndex={ghost ? -1 : undefined}
        aria-hidden={ghost || undefined}
        draggable={false}
      >
        {atHandle(tile.handle)}
        {tile.count > 1 && <sup className="wl-name-n" aria-label={`${tile.count} letters`}>{tile.count}</sup>}
      </button>
      <Sparkle size={tile.weight === 2 ? 9 : 7} className="wl-sep" />
    </span>
  )
}

// ── the viewport ────────────────────────────────────────────────────────────
// Read rather than assumed, because both things the layout turns on — how many
// lanes fit and how wide a run has to be — are viewport facts. A phone rotated
// mid-session is the case this exists for.
function useViewport() {
  const [vp, setVp] = useState(() => ({
    w: typeof window === 'undefined' ? 900 : window.innerWidth,
    h: typeof window === 'undefined' ? 800 : window.innerHeight,
  }))
  useEffect(() => {
    let frame = 0
    const on = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVp({ w: window.innerWidth, h: window.innerHeight }))
    }
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return vp
}

export default function Wall({ go, reduce, rev }) {
  const tiles = useMemo(() => wall(), [rev])
  const letters = liveCount()
  const written = getState().written
  const vp = useViewport()

  // ── how many lanes the SCREEN is worth ──
  // The ladder above answers how many lanes the corpus is worth. This answers
  // how many the room is: a lane is 40px and the masthead, the takedown and the
  // dock take about 430 of them, so a short phone gets four lanes and a tall one
  // gets seven. Without this the wall either overflows a small screen and gets
  // its top and bottom rows clipped, or floats seven rows in the middle of a
  // desktop column with nothing under them.
  //
  // A phone on its side is its own case, and it is not a short portrait screen:
  // the masthead has moved into the left column, so the names have the whole
  // height of the right one. Four is what 350px of it holds.
  const sideways = vp.w >= 640 && vp.h < 560
  const cap = sideways ? 4 : Math.max(2, Math.min(7, Math.floor((vp.h - 430) / 42)))
  const lanes = useMemo(() => laneUp(tiles, laneCount(tiles.length, cap)), [tiles, cap])

  // How wide one pass has to be before the lane is full. The wall is full
  // bleed on a phone and a column on a spread, so the viewport is an over
  // estimate on the spread — which costs a few nodes and never a gap.
  const target = Math.max(560, vp.w + 220)
  const runs = useMemo(
    () => lanes.map((lane) => {
      const passes = passesFor(lane, target)
      const out = []
      for (let p = 0; p < passes; p++) out.push(...lane)
      return out
    }),
    [lanes, target],
  )

  // Two copies is enough whenever the run clears the lane's width, which the
  // estimate above aims for. The layout pass below raises it if the estimate
  // came up short — a real face is not the face the arithmetic assumed.
  const [copies, setCopies] = useState(2)

  const [playing] = useState(() => !OPENED && !getState().seen && !reduce)
  const [armed, setArmed] = useState(() => OPENED || getState().seen || reduce)
  // One name lights up every few seconds and fades back. The wall is a live
  // object; the drift says that at the level of the whole field, and this says
  // it about one name at a time. Held as a HANDLE rather than an index, because
  // every name is on the screen several times and the copies have to light
  // together — one lit and the rest not is two different names to the eye.
  const [ember, setEmber] = useState('')
  // The tab is not on the screen the instant you land back from posting — it
  // rises a beat later, once the wall has settled. A panel that is already
  // there when the screen arrives is a banner.
  const [tab, setTab] = useState(() => written.length > 0 && reduce)
  const timers = useRef([])

  // ── the moving parts ──
  // Held in refs and written straight to the DOM. The wall runs at 60Hz and a
  // component that re-rendered eight lanes on every frame would spend the whole
  // budget reconciling text that never changes.
  const trackEls = useRef([])
  const copyEls = useRef([])
  const laneEls = useRef([])
  const wallEl = useRef(null)
  const motion = useRef({
    pos: [], cycle: [], dir: [], speed: [],
    fling: 0,          // what a throw left behind, px/s, shared by every lane
    drag: null,        // { x, t, v } while a finger is down
    moved: 0,          // how far this press has travelled
    hover: -1,         // the lane under the pointer, which holds still
    focus: false,      // a keyboard is in the names, so nothing moves
  })

  // ── the lanes' own state, rebuilt whenever the lanes are ──
  // Direction alternates, speed jitters a few percent off one constant, and the
  // starting offset is a fraction of the lane's own cycle. That last one is
  // what stops every lane's separators from lining up into a column down the
  // screen on the first frame.
  useEffect(() => {
    const m = motion.current
    m.pos = lanes.map((_, i) => (m.pos[i] != null ? m.pos[i] : 0))
    m.dir = lanes.map((_, i) => (i % 2 ? -1 : 1))
    m.speed = lanes.map((_, i) => DRIFT * (1 - JITTER / 2 + rand(`lane${i}`, 3) * JITTER))
    m.cycle = lanes.map((_, i) => m.cycle[i] || 0)
  }, [lanes])

  // ── the measurement ──
  // The wrap runs off the real width of one copy, read back after layout, so a
  // Didone or a mono arriving late cannot leave a seam travelling across the
  // screen. It re-reads on resize and once the faces have landed.
  useLayoutEffect(() => {
    if (reduce) return undefined
    let raised = false
    const measure = () => {
      const m = motion.current
      let short = 0
      lanes.forEach((_, i) => {
        const copy = copyEls.current[i]
        const lane = laneEls.current[i]
        if (!copy || !lane) return
        const c = copy.getBoundingClientRect().width
        if (c > 0) {
          // A lane whose position was measured against a different cycle keeps
          // its place in the loop rather than jumping: the fraction through the
          // cycle is what the eye is holding on to, not the pixel.
          const was = m.cycle[i]
          if (was > 0 && Math.abs(was - c) > 0.5) m.pos[i] = (m.pos[i] / was) * c
          m.cycle[i] = c
          // Every copy after the first exists to cover the lane while the first
          // one is walking off it. If one copy does not clear the lane, two of
          // them cannot hide the join.
          const need = Math.ceil((lane.clientWidth + 24) / c) + 1
          if (need > short) short = need
        }
      })
      if (!raised && short > copies) { raised = true; setCopies(Math.min(6, short)) }
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null
    if (ro && wallEl.current) ro.observe(wallEl.current)
    return () => { if (ro) ro.disconnect() }
  }, [lanes, runs, copies, reduce])

  // ── the loop ──
  // One rAF for the whole wall. Ambient drift, plus whatever a throw left
  // behind, decaying. A lane under the pointer and every lane while a keyboard
  // is in the names hold still, because motion that will not stop for the
  // person trying to use it has forgotten what it is on top of.
  useEffect(() => {
    if (reduce) return undefined
    let raf = 0
    let last = 0
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const m = motion.current
      const dt = last ? Math.min(64, now - last) : 16
      last = now

      if (!m.drag && Math.abs(m.fling) > STOP) {
        m.fling *= Math.pow(FRICTION, dt / 16.667)
      } else if (!m.drag) {
        m.fling = 0
      }

      for (let i = 0; i < m.pos.length; i++) {
        const c = m.cycle[i]
        if (!c) continue
        // A lane under the pointer holds still, and so does every lane while a
        // keyboard is in the names. That covers the throw as well as the drift:
        // a lane that keeps coasting out from under the cursor is a lane whose
        // names cannot be pressed, and every name here is a target.
        if (!m.drag && !(m.focus || m.hover === i)) {
          m.pos[i] += (m.dir[i] * m.speed[i]) * (dt / 1000)
          m.pos[i] += m.fling * (dt / 1000)
        }
        const el = trackEls.current[i]
        if (el) el.style.transform = `translate3d(${-wrap(m.pos[i], c).toFixed(2)}px, 0, 0)`
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduce, lanes])

  // ── the pull ──
  // Listeners go on the window rather than through pointer capture. Capture
  // would redirect the click to the element that captured it, and every name in
  // here is a button whose whole job is to be tapped.
  const onDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const m = motion.current
    m.drag = { x: e.clientX, t: e.timeStamp || performance.now(), v: 0 }
    m.moved = 0
    m.fling = 0
    if (wallEl.current) wallEl.current.classList.add('is-held')

    const move = (ev) => {
      const d = m.drag
      if (!d) return
      const dx = ev.clientX - d.x
      const t = ev.timeStamp || performance.now()
      const dt = Math.max(1, t - d.t)
      m.moved += Math.abs(dx)
      // The finger pushes the names the way it is going, so the transform has
      // to move against the position.
      for (let i = 0; i < m.pos.length; i++) m.pos[i] -= dx
      for (let i = 0; i < m.pos.length; i++) {
        const c = m.cycle[i]
        const el = trackEls.current[i]
        if (c && el) el.style.transform = `translate3d(${-wrap(m.pos[i], c).toFixed(2)}px, 0, 0)`
      }
      // A smoothed velocity, so the throw is the shape of the whole gesture
      // rather than of its last four milliseconds.
      d.v = d.v * 0.7 + (-dx / dt) * 1000 * 0.3
      d.x = ev.clientX
      d.t = t
    }
    const up = () => {
      const d = m.drag
      m.drag = null
      if (wallEl.current) wallEl.current.classList.remove('is-held')
      // A throw the ambient drift could have produced on its own is not a
      // throw. Anything faster coasts.
      if (d && Math.abs(d.v) > STOP * 2) m.fling = Math.max(-2600, Math.min(2600, d.v))
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])

  // A trackpad swiped sideways is the same gesture as a finger, and a mouse
  // wheel over the wall is not: only the horizontal component is taken, and
  // only when it is the larger one, so the page still scrolls under a wheel.
  useEffect(() => {
    if (reduce) return undefined
    const el = wallEl.current
    if (!el) return undefined
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const m = motion.current
      m.fling = 0
      for (let i = 0; i < m.pos.length; i++) m.pos[i] += e.deltaX
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [reduce])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

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

  // Slower than it was. The drift is already carrying the "this is alive"
  // claim, and two independent things pulsing at once on the same field is
  // noise rather than life.
  useEffect(() => {
    if (!armed || reduce || !tiles.length) return undefined
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
    // A pull is not a tap. The press that just ended travelled, so the name
    // under it is not being asked for.
    if (motion.current.moved > SLOP) return
    // The name, not a letter id. A tile is a person written to, the letter
    // screen resolves a handle to the letters under it, and going by name means
    // the tap does not wait on a request that has not happened yet.
    go('letter', handle)
  }

  return (
    <div className={`wl-page wl-wallpage${playing ? ' is-opening' : ''}${tab ? ' has-tab' : ''}`}>
      <TopBar go={go} at="wall" onMark={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })} />

      {/* ── the masthead ──
          The poster's title block: the Didone with its terminal period, one
          sparkle off the top-right shoulder, the dotted sphere sunk into the
          corner. A count is the only fact about this wall worth printing —
          because a thin wall should look thin — and everything else that used
          to sit here was decoration wearing an information costume. */}
      <div className="wl-mast">
        <Sparkle size={26} className="wl-mast-spark" twinkle={!reduce} delay={900} />
        <Halftone size={92} grid={20} className="wl-mast-ball" />
        <Display size="xl" className="wl-mast-title">
          A wall of Berkeley<br />Students that are<br />Unforgettable.
        </Display>
        <Label tone="dim" className="wl-mast-meta">{letters} letters</Label>
      </div>

      {/* ── the names ──
          Weight comes off how many letters a name carries, so a name written
          to three times is set larger than one written to once and the wall
          has a real topography rather than a decorative one. */}
      {reduce ? (
        <nav className="wl-wall is-still" aria-label="the names on the wall">
          {tiles.map((t) => (
            <Name key={t.handle} tile={t} ember={false} ghost={false} onOpen={open} />
          ))}
        </nav>
      ) : (
        <nav
          className="wl-wall is-drifting"
          aria-label="the names on the wall, drag to move through them"
          ref={wallEl}
          onPointerDown={onDown}
          onFocusCapture={() => { motion.current.focus = true }}
          onBlurCapture={() => { motion.current.focus = false }}
        >
          {runs.map((run, li) => (
            <div
              key={li}
              className={`wl-lane${li % 2 ? ' is-back' : ''}`}
              style={{ '--in': `${900 + li * 110}ms` }}
              ref={(el) => { laneEls.current[li] = el }}
              onPointerEnter={() => { motion.current.hover = li }}
              onPointerLeave={() => { if (motion.current.hover === li) motion.current.hover = -1 }}
            >
              <div className="wl-lane-run" ref={(el) => { trackEls.current[li] = el }}>
                {/* the run, and the same run again as many times as it takes to
                    cover the lane. The wrap is a modulo of ONE copy's measured
                    width, so the tail is always already on screen when the head
                    leaves and there is no seam to catch. */}
                {Array.from({ length: copies }, (_, c) => (
                  <span
                    className="wl-lane-copy" key={c}
                    ref={c === 0 ? (el) => { copyEls.current[li] = el } : undefined}
                  >
                    {run.map((t, i) => (
                      <Name
                        key={`${c}-${i}-${t.handle}`}
                        tile={t}
                        ember={ember === t.handle}
                        ghost={c > 0}
                        onOpen={open}
                      />
                    ))}
                  </span>
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

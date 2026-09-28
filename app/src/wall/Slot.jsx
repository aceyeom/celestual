// ── a mutual, in the private notes: THE SLOT ────────────────────────────────
//
// A mutual on the account sheet (screens/You.jsx, under `mutual · yours to
// keep`) is a small phone: the night screen its telling opens on, laid along
// the row. Its status band carries the aerial, the @ and the night it was
// told; its panel carries their face at the left and, across the rest of the
// glass, two sealed notes, the stories' own (pixmark.js `NOTE`), stepping
// toward each other a cell at a time. They never meet. They stop two cells
// apart and hold there, go out the way a pixel goes out, in three steps, and
// set off again from the edges. The meeting is the film's
// (screens/Reveal.jsx), and the slot is the moment before it, kept.
//
// It was a row like the others, the face, the @ and `it's mutual`, set apart
// by a rose bezel and a lit aerial, opening the reveal the way every row
// opens its screen. The owner asked for the mutual's slot to be more
// beautiful, with pixels moving across it, and for its motion to feel
// interactive and suspenseful (28 September). So it is the thing it opens,
// small, and a press on it is the first frame of the film: the takeover grows
// out of this glass (revealfrom.js `openReveal` hands the reveal its rect).
//
// ── before it is opened, and after ──
// Until its telling has been watched once on this device (pings.js
// `wasOpened`), the slot is the night glass with its backlight asleep (the
// veil, black at .38 over the panel), the rose letter's edge light round it
// as the one trace of what it is, the aerial searching, and the two notes on
// their way. After, it is the rose letter the film ends on, backlit, one
// note in the middle of the glass: the two became one there, and a keepsake
// does not keep asking to be opened. So it does not travel; it blinks, the
// way an LCD keeps something it holds, out and back in three steps 110ms
// apart (.45, .15, .45) every four seconds, each slot at its own place in
// that too. It was still, and dimmer under the veil than the plain rows
// round it, until the review of 28 September.
//
// ── the two notes ──
// On the phone's pitch, four of the page's pixels a cell with the gap an LCD
// has, over the lane's unlit cells. Each hops one cell every 110ms (a WAAPI
// transform on `steps(n)`, so it is the compositor's, and nothing is drawn
// per frame), trailing three ghosts of what it has just left, one, two and
// three cells behind at .30, .15 and .07, the way a slow LCD leaves a moving
// thing on the glass for a beat. They arrive two cells apart, the ghosts
// catch up farthest first, one every 110ms, the notes hold 700ms, go out in
// three steps 110ms apart (.45, .15, nothing), and the glass stays dark
// 550ms before they set out again. One loop is n·110 + 1470ms, n being how
// far each travels (19 cells, 3.56s, on a phone), and each slot starts at
// its own place in it (its key's hash), so two mutuals never pulse together.
//
// Under the pointer the backlight wakes (the veil goes, 120ms in two steps)
// and the notes lean in, twice as fast, from wherever they are: the rate is
// changed, never the clock. Focus wakes the backlight too, at once, since a
// key's doing is never animated, and without the lean. A press is the
// phone's inversion, the panel in its ink and the notes in its light, the
// backlight on and the notes held still where the press caught them; let go
// anywhere else, or scrolled away under a finger, they go on.
//
// ── what it costs ──
// No canvas, and nothing restyled per frame: two transforms and eight
// opacities, all the compositor's. Only the three newest mutuals not yet
// opened move, and the three newest opened blink (`movingOf`); the rest
// stand on the frame the loop holds, two notes two cells apart or the one
// note lit. A slot scrolled out of the sheet, or on a hidden
// tab, is paused, and `will-change` is only asked for while it plays. Nothing
// is ever raised over this sheet (the router draws one sheet at a time), so a
// sheet over the private notes is the notes gone, and the slot with them.
// Under reduced motion every slot is that held frame, and the backlight and
// the press still answer.
//
// ── the night ──
// A slot lands on the night the way the rows round it do (You.jsx `useSeen`,
// `--land`): before it is in sight its glass is dark and its band says
// `searching…`; then the backlight comes up the way a screen wakes, a
// flicker (1, .62, .85, .45, then .38) over 500ms, the night takes the
// band's words on one frame, and the notes set out 500ms after. It replaces
// the rose blink a mutual's row landed with.
//
// ── its edit ──
// Beside the glass, the key every note in the private notes has (the owner
// asked for one, to change a note or let it go): a mutual's opens the
// keepsake landed with its options up, since writing them a new note and
// taking it off one's own list are the keepsake's own menu and drawn there
// once (revealfrom.js `menu`). Its spoken name is that menu's, in the
// keepsake's words: `your new note to …` while one to them is running
// (You.jsx hands it `writing`), since that is what the menu offers then.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Face, prefersReducedMotion } from './parts.jsx'
import { atHandle } from './data.js'
import { skinVars } from './looks.js'
import { NOTE } from './pixmark.js'
import { stateWords, mutualWhen, wasOpened } from './pings.js'
import { openReveal } from './revealfrom.js'
import { primeFilm } from './Film.jsx'
import { Aerial } from './aerial.jsx'

// the note, sealed, as the stories draw it (pixmark.js `NOTE`, one string
// per row with `X` lit), each lit cell a dot with the gap round it
const PITCH = 4
const DOT = 3
const NOTE_W = NOTE[0].length
const noteD = (keep = () => true) => NOTE.flatMap((row, y) => [...row].map((c, x) => (
  c === 'X' && keep(x) ? `M${x * PITCH} ${y * PITCH}h${DOT}v${DOT}h-${DOT}z` : ''
))).join('')
const NOTE_D = noteD()
// A ghost is only what the note has left behind: of the note as it stood k
// steps ago, the k columns the note has since moved off, on the side it came
// from. Whole, the three showed through the note's own unlit cells and
// clouded the envelope into a smudge; this way they are a tail.
const TRAIL = {
  l: [1, 2, 3].map((k) => noteD((x) => x < k)),
  r: [1, 2, 3].map((k) => noteD((x) => x >= NOTE_W - k)),
}
function Note({ className, style, k, d = NOTE_D }) {
  return (
    <svg
      className={className} style={style} data-k={k}
      viewBox={`0 0 ${NOTE_W * PITCH} ${NOTE.length * PITCH}`} width={NOTE_W * PITCH} height={NOTE.length * PITCH}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"
    >
      <path d={d} />
    </svg>
  )
}

// ── the loop ──
// a cell a step; the hold two cells apart; the three steps out, a step
// apart from the hold's end, the last of them to nothing; and the dark from
// there to the loop's end
const STEP = 110
const HOLD = 700
const OUT = [0.45, 0.15, 0]
const DARK = 550
const TAIL = HOLD + (OUT.length - 1) * STEP + DARK
// the ghosts, one, two and three cells behind
const GHOSTS = [0.3, 0.15, 0.07]
// how long after its `--land` a slot on the night sets out: the flicker's length
const WOKEN = 500
// an opened slot's blink: a loop, and the steps it goes out and back in at
// its end, a step apart
const BLINK = 4000
const BLINKS = [0.45, 0.15, 0.45]

// The glass in the colour of what it is: the night screen until it has been
// opened here, the rose letter after. Only the screen's own properties, the
// ones the band and the panel read. The night wears the rose letter's edge
// light, the trace of it round the glass: asleep at .38 the night alone read
// as a key greyed out, and nothing on it said mutual until it was watched.
const skin = (c) => Object.fromEntries(Object.entries(skinVars(c)).filter(([k]) => k.startsWith('--s-')))
const ROSE = skin('rose')
const NIGHT = { ...skin('night'), '--s-edge': ROSE['--s-edge'] }

// where in its loop a slot starts, off its key: FNV-1a, as a fraction
function phaseOf(key) {
  let h = 0x811c9dc5
  for (const ch of String(key || '')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193)
  return (h >>> 0) / 4294967296
}

const fine = () => !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)

// `?slot=1500` on the dev server holds every slot that moves on that moment
// of its loop, for the screenshot loop (scripts/preview.mjs `you-slot`), the
// way `?beat=` and `?film=` hold the stories. Read once, as the page loads,
// since the address it came in on does not outlive the router.
const HELD_AT = (() => {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null
  const m = /[?&]slot=(\d+)/.exec(location.search)
  return m ? Number(m[1]) : null
})()

// ── which of them move ──
// The three newest a person has not opened here yet, and the three newest
// opened, which only blink; the rest hold still. Handed the mutuals newest
// first, as the list draws them.
const MOVING = 3
export function movingOf(me, mutuals) {
  const not = mutuals.filter((p) => !wasOpened(me, p)).slice(0, MOVING)
  const kept = mutuals.filter((p) => wasOpened(me, p)).slice(0, MOVING)
  return new Set([...not, ...kept].map((p) => p.key))
}

// What is playing, and whether it may: in sight, on a tab that is showing,
// and not held under a press. The class asks for the layers only while it
// plays (profile.css `.is-playing`).
function settle(s) {
  const run = s.shown && s.awake && !s.pressed && HELD_AT == null
  for (const a of s.anims) {
    if (run) a.play()
    else a.pause()
  }
  if (s.lane) s.lane.classList.toggle('is-playing', run && s.anims.length > 0)
}

// ── the key beside a note ───────────────────────────────────────────────────
// `edit`, on the phone's quiet key (the settings key's plate, and its
// inversion under the press), as tall as the row it stands in so a thumb
// finds it, the plate itself 44 by 32. A sibling of the row's own press and
// never inside it, so a press on it is only ever its own.
export function EditKey({ onClick, label }) {
  return (
    <button type="button" className="wl-vault-edit" onClick={onClick} aria-label={label}>
      <span aria-hidden="true">edit</span>
    </button>
  )
}

export function MutualSlot({ p, me, go, still = false, landing = false, land = null, writing = false }) {
  const opened = wasOpened(me, p)
  const glass = useRef(null)
  const lane = useRef(null)
  const live = useRef({ anims: [], lane: null, shown: true, awake: true, pressed: false, off: null })
  const [cells, setCells] = useState(0)
  const [reduce] = useState(prefersReducedMotion)

  // how many cells the lane holds, from the glass it has: 54 on a phone
  useLayoutEffect(() => {
    const el = lane.current
    live.current.lane = el
    if (!el) return undefined
    const fit = () => setCells(Math.floor(el.clientWidth / PITCH))
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // how far each note travels, keeping two cells between them at the end
  const n = cells > NOTE_W * 2 + 2 ? (cells - NOTE_W * 2 - 2) >> 1 : 0
  const seen = landing && land != null
  const moving = !opened && !still && !reduce && n > 0 && (!landing || seen)
  const blinking = opened && !still && !reduce && cells > 0 && (!landing || seen)

  // ── the loop, set going ──
  useEffect(() => {
    const box = lane.current
    if (!moving || !box) return undefined
    const A = n * STEP
    const L = A + TAIL
    const at = (ms) => ms / L
    const timing = { duration: L, iterations: Infinity, delay: seen ? land + WOKEN : 0, fill: 'backwards' }
    const made = []
    for (const note of box.querySelectorAll('.wl-slot-note')) {
      const dx = (note.classList.contains('is-r') ? -1 : 1) * n * PITCH
      made.push(note.animate([
        { transform: 'translate3d(0, 0, 0)', easing: `steps(${n}, end)` },
        { transform: `translate3d(${dx}px, 0, 0)`, offset: at(A) },
        { transform: `translate3d(${dx}px, 0, 0)` },
      ], timing))
      // a `steps(1, end)` segment holds its first value to its end, so each
      // step out is the keyframe it lands on: 1 to the hold's end, then .45,
      // .15 and nothing, 110ms apart
      made.push(note.querySelector('.wl-slot-ink').animate([
        { opacity: 1, easing: 'steps(1, end)' },
        ...OUT.map((o, i) => ({ opacity: o, offset: at(A + HOLD + i * STEP), easing: 'steps(1, end)' })),
        { opacity: 0 },
      ], timing))
      for (const g of note.querySelectorAll('.wl-slot-ghost')) {
        const k = Number(g.dataset.k)
        made.push(g.animate([
          { opacity: GHOSTS[k - 1], easing: 'steps(1, end)' },
          { opacity: 0, offset: at(A + (GHOSTS.length - k) * STEP) },
          { opacity: 0 },
        ], timing))
      }
    }
    // its own place in the loop; one landing on the night sets out from
    // the edges, since that is the first time it is seen
    if (!seen || HELD_AT != null) {
      const t = HELD_AT != null ? timing.delay + (HELD_AT % L) : phaseOf(p.key) * L
      for (const a of made) a.currentTime = t
    }
    const s = live.current
    s.anims = made
    settle(s)
    return () => {
      for (const a of made) a.cancel()
      s.anims = []
      settle(s)
    }
  }, [moving, n, seen, land, p.key])

  // ── the one note, blinking ──
  // A `steps(1, end)` keyframe holds its value to the next, as the loop's
  // step out does: lit to the loop's last 440ms, then .45, .15 and .45 a
  // step apart and lit again. Set going on the night 500ms after the flicker,
  // as the two notes are, and held and paused the way they are (`settle`).
  useEffect(() => {
    const one = lane.current?.querySelector('.wl-slot-one')
    if (!blinking || !one) return undefined
    const from = BLINK - (BLINKS.length + 1) * STEP
    const delay = seen ? land + WOKEN : 0
    const a = one.animate([
      { opacity: 1, easing: 'steps(1, end)' },
      ...BLINKS.map((o, i) => ({ opacity: o, offset: (from + i * STEP) / BLINK, easing: 'steps(1, end)' })),
      { opacity: 1, offset: (from + BLINKS.length * STEP) / BLINK },
      { opacity: 1 },
    ], { duration: BLINK, iterations: Infinity, delay })
    if (!seen || HELD_AT != null) a.currentTime = HELD_AT != null ? delay + (HELD_AT % BLINK) : phaseOf(p.key) * BLINK
    const s = live.current
    s.anims = [a]
    settle(s)
    return () => {
      a.cancel()
      s.anims = []
      settle(s)
    }
  }, [blinking, seen, land, p.key])

  // ── and held when nobody can see it ──
  useEffect(() => {
    const el = glass.current
    const s = live.current
    if (!el) return undefined
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => {
      s.shown = e.isIntersecting
      settle(s)
    }, { root: el.closest('.wl-sheet-in'), threshold: 0.1 })
    if (io) io.observe(el)
    const vis = () => { s.awake = document.visibilityState !== 'hidden'; settle(s) }
    vis()
    document.addEventListener('visibilitychange', vis)
    return () => {
      if (io) io.disconnect()
      document.removeEventListener('visibilitychange', vis)
      if (s.off) s.off()
    }
  }, [])

  // leaning in under the pointer: the rate, from where they are
  const lean = (rate) => (e) => {
    if (e.pointerType !== 'mouse' || !fine()) return
    for (const a of live.current.anims) a.updatePlaybackRate(rate)
  }

  // The press: inverted and held from the moment it goes down. Let go on the
  // glass is a click, which leaves for the reveal, so the press stands until
  // then; let go anywhere else, or taken by a scroll, and it is undone. A
  // finger only passing over on its way to scroll the sheet is not a press,
  // so on touch it waits the moment a scroll takes to claim it (80ms), and a
  // tap quicker than that is pressed as it lifts.
  const press = (e) => {
    if (e.button !== 0) return
    // what the film needs before its first frame (the names, their faces,
    // the words cut into cells, the story's heavy start), begun as the finger
    // comes down, so the push-in pays for none of it (Film.jsx `primeFilm`).
    // Once a mutual has been watched there is no film to prime
    if (!opened) primeFilm(me, p.to)
    const s = live.current
    const el = glass.current
    if (s.off) s.off()
    let t = 0
    const hold = () => {
      s.pressed = true
      el.classList.add('is-pressed')
      settle(s)
    }
    const undo = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', undo)
      clearTimeout(t)
      s.off = null
      s.pressed = false
      el.classList.remove('is-pressed')
      settle(s)
    }
    function up(ev) {
      if (!el.contains(ev.target)) { undo(); return }
      clearTimeout(t)
      if (!s.pressed) hold()
      // and a click that did not leave (a route already on its way) is let go
      t = setTimeout(undo, 600)
    }
    if (e.pointerType === 'touch') t = setTimeout(hold, 80)
    else hold()
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', undo)
    s.off = undo
  }

  const at = atHandle(p.to)
  const when = mutualWhen(p)
  // the held frame, two cells apart, under the loop when it plays
  const far = n * PITCH
  // farthest first, so the nearest is drawn over it
  const ghosts = (side) => GHOSTS.map((_, i) => GHOSTS.length - i).map((k) => (
    <Note key={k} k={k} d={TRAIL[side > 0 ? 'r' : 'l'][k - 1]} className="wl-slot-ghost" style={{ left: side * k * PITCH }} />
  ))
  return (
    <div
      data-key={p.key}
      className={`wl-vault-row wl-slot is-mutual${opened ? ' is-opened' : ''}${landing ? ' is-landing' : ''}${seen ? ' is-seen' : ''}`}
      style={seen ? { '--land': `${land}ms` } : undefined}
    >
      <button
        type="button" ref={glass} className="wl-slot-open" data-to={p.to} style={opened ? ROSE : NIGHT}
        onClick={() => openReveal(go, p.to, glass.current)}
        onPointerDown={press} onPointerEnter={lean(2)} onPointerLeave={lean(1)}
        aria-label={`${at}, ${stateWords(p)}.${opened ? '' : ' not opened yet.'} open it`}
      >
        <span className="wl-slot-band" aria-hidden="true">
          <Aerial state={opened ? 'full' : 'seek'} land={landing && opened} scale={1} />
          <span className="wl-slot-at">{at}</span>
          <span className="wl-slot-when">
            {landing ? <span className="wl-slot-seek">searching…</span> : null}
            {when ? <span className="wl-slot-said">{when}</span> : null}
          </span>
        </span>
        <span className="wl-slot-panel" aria-hidden="true">
          <Face handle={p.to} size={28} />
          <span className="wl-slot-lane" ref={lane}>
            {!cells ? null : opened ? (
              <Note className="wl-slot-one" style={{ left: Math.floor((cells - NOTE_W) / 2) * PITCH }} />
            ) : (
              <>
                <span className="wl-slot-note is-l" style={{ left: 0, transform: `translate3d(${far}px, 0, 0)` }}>
                  {ghosts(-1)}
                  <Note className="wl-slot-ink" />
                </span>
                <span className="wl-slot-note is-r" style={{ left: (cells - NOTE_W) * PITCH, transform: `translate3d(${-far}px, 0, 0)` }}>
                  {ghosts(1)}
                  <Note className="wl-slot-ink" />
                </span>
              </>
            )}
          </span>
          <span className="wl-slot-veil" />
        </span>
      </button>
      <EditKey
        onClick={() => openReveal(go, p.to, glass.current, { menu: 'options' })}
        label={`edit: ${writing ? `your new note to ${at}` : `send ${at} a new note`}, or take it off your list`}
      />
    </div>
  )
}

// ── /berkeley/reveal/:handle — IT'S MUTUAL ──────────────────────────────────
//
// The screen the whole product exists to reach. Two people each sent the
// other a note without knowing the other had, and this is where each of them
// is told, on the same phone the letters are written on, that the other did,
// and reads what the other wrote.
//
// It was Main's (/reveal), in the room's language: a liquid metal seal, the
// sentence in the serif, two chalk cards. It is a sheet on the wall now, and
// the wall is the phone (DESIGN.md 2.6), so it is told the way the intro and
// the door tell the mechanic: on a letter's screen, the night one, in the black
// room a letter is read in.
//
// ── the order is the meaning ────────────────────────────────────────────────
//
//   1  the phone         a boy and a girl run in from either edge of the
//                        glass, the intro's two (folk.js), and her run
//                        carries her on into his arms and half behind him;
//                        the backlight turns pink and the phone becomes a
//                        letter lit in rose, and they glide together into
//                        the mark (pixmark.js `revealStory`).
//                        The mark gathers up into the top of the glass, and
//                        under it, IN the phone, in its own face and with its
//                        own cursor, "it's mutual." is typed a character at a
//                        time. Exactly those words: no congratulations, no
//                        match (VOICE.md 2). And the phone never stops: its
//                        backlight breathes, a light goes round the ring,
//                        the star twinkles, the phone itself rises and
//                        settles in its own light, the way a thing that is
//                        on and alive does, and that light drifts, slowly,
//                        from the rose through the pinks and the oranges
//                        (`drift`). Then the screen goes to sleep and wakes
//                        on the two of them running in again, and tells it
//                        again, words and all (`STORY.loop`), for as long as
//                        the sheet is open; the sheet under it stays as it
//                        is. There is no heart in it: the backlight used to
//                        beat, lub and dub, and a heart floated up off the
//                        star now and then, and the owner took them out.
//   2  the two of them   the pair, face and handle, one beside the other and
//                        never one before the other: a stagger would say one
//                        of them mattered more, and the whole premise is that
//                        neither did. Then one plain line of what happened.
//   3  their note        what they wrote to you, set like a letter: the one
//                        thing on the sheet that is theirs, so it is the
//                        largest thing under the phone. Yours is behind a
//                        quiet key, because you know what you wrote.
//   4  the way on        the lit key, to their account, and a quiet way back
//                        to the wall that says nothing to anybody.
//
// It used to set the two handles in the phone's status row, type the sentence
// under the phone in the display face, stack two panels of the two notes at
// one weight, and close with a line about the product's part being done, the
// key, and "keep this to yourself": six things at one volume, and the
// sentence the page is for standing outside the phone it was told on.
//
// A tap anywhere that is not a control lands the whole thing, and under
// reduced motion it is drawn landed and still. The screen reader hears the
// same facts in order, from a heading nobody sees and the page itself.
//
// ── where the facts come from ───────────────────────────────────────────────
// Who this is, off the server's row (main/data.js `me`), and the handle the
// ping sheet and the account sheet place and read under (pings.js
// `myHandle`) where the row has none, so the three sheets agree about whose
// mutual this is. Then the pings this person has standing and which of them
// came back (`celestual_my_pings`, checked on the server against the proof
// this browser holds), and a copy of that answer held for a couple of
// minutes, so a tap on a mutual lands on a drawn screen and not a bare one
// while the server is asked again. A read that fails does not unsay a mutual
// already in hand.
//
// ── and when there is nothing to show ───────────────────────────────────────
// "nothing here." is said the same way whatever the reason, and its one key
// is the account sheet (screens/You.jsx), which is where each reason has its
// own words and its own way on: a proof this browser does not hold, one the
// server no longer takes, or no @ at all.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sheet, SheetHead, SheetFoot, Display, Pill, CloseQuiet, Face, useProfile } from '../parts.jsx'
import { Screen, Wait } from '../screen.jsx'
import { skinOf, skinVars } from '../looks.js'
import { TURNS, turnStyle } from '../turn.js'
import PixelStory, { SQUARE, underPink, useStoryClock, heldAt } from '../PixelStory.jsx'
import { revealStory } from '../pixmark.js'
import { normHandle, atHandle } from '../data.js'
import { heldProof } from '../auth.js'
import { href } from '../router.js'
import { getSession } from '../../api/auth.js'
import { me } from '../../main/data.js'
import { myHandle, myPings, heldPings, sinceAgo } from '../pings.js'
import '../mutual.css'

// The mutual this address names, out of an answer already in hand. Null when
// there is none to read, which is not the same as "not a mutual".
function fromHeld(handle, them) {
  if (!handle || !them) return null
  const held = heldPings(handle)
  if (!held) return null
  return held.mutuals.find((m) => normHandle(m.to) === them) || null
}

// Who this browser is before the server has said: the handle its own proof
// is for, which is enough to read a held copy on the first frame.
function guessHandle() {
  const s = getSession()
  return s && s.handle ? normHandle(s.handle) : ''
}

const SAY = 'it’s mutual.'
const NIGHT = skinOf('night')
const ROSE = skinOf('rose')
const STORY = revealStory(200, { panel: [ROSE.hi, ROSE.mid, ROSE.lo], ink: [NIGHT.ink, ROSE.ink] })
const T = STORY.times
// The sentence, typed on the glass as the mark gathers up to make room for
// it, a character every 70ms, which is how fast the phone put a message on
// its screen.
const SAY_AT = T.gather + 160
const TYPE_MS = 70
// and the rest of the sheet once it is said: the pair and the line, their
// note, then the keys, each a beat after the last (mutual.css `is-said`)
const SAID_AT = SAY_AT + SAY.length * TYPE_MS + 180
// The moments a telling passes, in order: the pink leaving the two of them,
// each character of the sentence, the sentence said, the screen going to
// sleep, and dark enough that the phone's light goes back to the night's
// unseen (`wl-sleep` is 560ms).
const MARKS = [
  T.glow,
  ...Array.from(SAY, (c, i) => SAY_AT + (i + 1) * TYPE_MS),
  SAID_AT, T.rest, T.rest + 600,
]
const SAID = 1 + SAY.length + 1
const ASLEEP = SAID + 1
const DARK = ASLEEP + 1

const LOOK = { tint: 'night' }
const NO_KEYS = {}
const NO_TOP = {}

// ── the phone's light ──
// It starts as the night's, and as the pink spreads on the glass the whole
// phone becomes a letter lit in rose, as the intro's does (turn.js), the
// panel under the pink once the pink has covered it; and the rose it turns
// to is the one the drift below moves on from. The moments are the
// story's.
const PHONE = underPink(turnStyle('night', 'rose', SQUARE))
const TURN = { '--mu-turn-at': `${T.top - T.glow}ms`, '--mu-pan-at': `${T.covered - T.glow}ms` }

// ── the screenshot loop's hold ──
// Development only, as the intro's `?t=` is: `?story=5200` holds the glass,
// the words and the phone's light on 5200ms into a telling.
function devHold() {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('story')
  return v === null ? null : Math.max(0, Number(v) || 0) % STORY.loop
}

// ── the drift ──
// Once the mark is alive the light does not stay rose. It drifts, a shade at
// a time, through the pinks into the oranges and the greens, and back the
// way it came, once every 24 seconds, as a letter lit in each of those
// colours would be (looks.js `skinOf`, the lit arithmetic), so the words on
// it are always the dark of the light they are on. A function of the glass's
// own clock, set ten times a second, still with the tab, and never under
// reduced motion, which keeps the rose. Each telling is alive for a little
// under six seconds of it, so it goes from the rose into the peach, and the
// next telling turns the phone to the rose again and starts it over.
const DRIFT_MS = 24000
const DRIFT = [
  [0, '#DF93AF'], [0.13, '#E88DAE'], [0.27, '#EE9A82'], [0.4, '#E0A95A'],
  [0.55, '#A3BB6B'], [0.68, '#86C29B'], [0.8, '#A3BB6B'], [0.9, '#E6A267'], [1, '#DF93AF'],
]
const DRIFT_STEPS = 480
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mixHex = (a, b, k) => `#${hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
function drift(u) {
  const q = Math.floor(((((u % DRIFT_MS) + DRIFT_MS) % DRIFT_MS) / DRIFT_MS) * DRIFT_STEPS)
  const k = q / DRIFT_STEPS
  let j = 0
  while (j < DRIFT.length - 2 && DRIFT[j + 1][0] <= k) j++
  const [a, ha] = DRIFT[j]
  const [b, hb] = DRIFT[j + 1]
  const e = Math.min(1, Math.max(0, (k - a) / (b - a)))
  const hue = mixHex(ha, hb, e * e * (3 - 2 * e))
  // a letter in this light, made once for each of the steps and kept
  const v = skinVars({ slug: `mutual-drift-${q}`, kind: 'lit', hue })
  return { v, glow: hexRgb(mixHex(hue, '#FFFFFF', 0.25)).join(', ') }
}

// One of the two: the face and the handle, with the name under it when the
// resolver has one.
function One({ handle, fallback }) {
  const p = useProfile(handle)
  return (
    <span className="wl-mutual-one">
      <Face handle={handle || fallback} size={34} resolve={!!handle} />
      <span className="wl-mutual-id">
        <span className="wl-mutual-at">{handle ? atHandle(handle) : fallback}</span>
        {p?.name ? <span className="wl-mutual-name">{p.name}</span> : null}
      </span>
    </span>
  )
}

function Mutual({ mine, them, mutual, reduce }) {
  const hold = useRef(devHold()).current
  const still = !!reduce || hold !== null
  const [mineOpen, setMineOpen] = useState(false)
  // when the glass's clock started: from the mount, or, once landed, from
  // far enough back that the sentence is said
  const [from, setFrom] = useState(() => performance.now())
  const [landed, setLanded] = useState(false)
  const theirs = useProfile(them)
  const clock = useStoryClock(STORY, from, MARKS, still)
  const now = reduce ? heldAt(MARKS, SAID_AT) : hold !== null ? heldAt(MARKS, hold) : clock
  // the sentence as far as this telling has typed it, gone with the screen
  // when it sleeps; the sheet under the phone, once it has been said, stays
  const typed = Math.max(0, Math.min(SAY.length, now.i - 1))
  const said = !!reduce || now.n > 0 || landed || now.i >= SAID
  const asleep = !reduce && now.i >= ASLEEP
  const glow = now.i >= 1 && now.i < DARK
  // a landing is for the telling it lands, and the next one is told whole
  const skip = landed && now.n === 0

  const land = useCallback(() => {
    setLanded(true)
    setFrom(performance.now() - SAID_AT)
  }, [])

  // a tap on the room, or a key, lands it; a press on a control is that
  // control's, and Escape is the sheet's way out. Once the telling is said
  // there is nothing to land.
  const told = now.i >= SAID && !asleep
  useEffect(() => {
    if (still || told) return undefined
    const onKey = (e) => { if (e.key !== 'Escape') land() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [still, told, land])
  const onPress = (e) => { if (!still && !told && !e.target.closest('a, button')) land() }

  // The phone's own float and light stop with the tab, as its glass does
  // (PixelStory.jsx), rather than running on unseen.
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // The light, drifting, once the mark is alive (see `drift`), from the rose
  // on each telling; and taken off again as the screen goes dark, so the
  // next telling turns the phone to the rose the pink on its glass is.
  const fig = useRef(null)
  useEffect(() => {
    const el = fig.current
    if (!el || still || hidden) return undefined
    let on = false
    const off = () => {
      if (!on) return
      for (const k of TURNS) el.style.removeProperty(`--mu${k}`)
      el.style.removeProperty('--story-glow-rgb')
      on = false
    }
    const step = () => {
      const t = performance.now() - from
      const u = (((t % STORY.loop) + STORY.loop) % STORY.loop) - T.live
      if (u < 0 || u >= T.rest + 520 - T.live) { off(); return }
      const { v, glow: rgb } = drift(u)
      for (const k of TURNS) el.style.setProperty(`--mu${k}`, v[k])
      el.style.setProperty('--story-glow-rgb', rgb)
      on = true
    }
    step()
    const id = setInterval(step, 100)
    return () => clearInterval(id)
  }, [still, hidden, from])

  const ago = sinceAgo(mutual.at)
  const theirName = theirs?.name ? `${theirs.name}, ${atHandle(them)}` : atHandle(them)
  const note = mutual.theirLine
  const yours = mutual.line
  // a held frame holds the phone's light where it is at that moment too
  const figStyle = hold === null ? TURN : {
    ...TURN,
    '--held-turn': glow ? Math.max(0, Math.min(1, (hold - T.top) / 460)) : 0,
    '--held-pan': glow && hold >= T.covered ? 1 : 0,
  }
  // `is-landed` is for the sheet under the phone, which does not rise again
  // once a tap has put it there; `is-skip` for the phone, which is lit at
  // once on the telling the tap landed and turns as it always does after
  const cls = [
    'wl-mutual', said && 'is-said', glow && 'is-glow', (landed || reduce) && 'is-landed', skip && 'is-skip',
    asleep && 'is-asleep', reduce && 'is-still', hidden && 'is-hidden',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} onPointerDown={onPress}>
      {/* what the page is, for a reader that never sees the phone */}
      <h2 id="wl-reveal-h" className="wl-sr">it&#8217;s mutual with {theirName}</h2>
      <p className="wl-sr">
        you both sent a note, and nobody else was told.
        {theirs?.verified ? ` ${atHandle(them)} is verified on Instagram.` : ''}
        {ago ? ` you sent yours ${ago}.` : ''}
      </p>

      <div className={`wl-mutual-fig${hold !== null ? ' is-held' : ''}`} style={figStyle} aria-hidden="true" ref={fig}>
        <span className="wl-mutual-halo" />
        <div className="wl-mutual-float">
          {/* asleep between two tellings, and waking on the next (mutual.css) */}
          <Screen
            look={LOOK} seed={`mutual:${mine}:${them}`} top={NO_TOP}
            keys={NO_KEYS} live={false} state={reduce ? '' : asleep ? 'asleep' : 'waking'}
            className="wl-mutual-scr" style={PHONE}
          >
            <PixelStory story={STORY} at={reduce ? STORY.still : hold} from={from} />
            {/* The sentence, on the glass, in the phone's face and its ink,
                laid out whole from the first frame so it never moves as it
                fills, with the phone's cursor after the last character in. */}
            <p className="wl-mutual-say">
              {SAY.slice(0, typed)}
              {typed > 0 ? <span className="wl-scr-cur" /> : null}
              <span className="wl-mutual-rest">{SAY.slice(typed)}</span>
            </p>
          </Screen>
        </div>
      </div>

      <div className="wl-mutual-text">
        {/* the two of them, at one size, in one row */}
        <div className="wl-mutual-pair">
          <One handle={mine} fallback="you" />
          <span className="wl-mutual-and" aria-hidden="true">+</span>
          <One handle={them} fallback={atHandle(them)} />
        </div>
        <p className="wl-mutual-plain">you both said yes. nobody else was told.</p>

        {note ? (
          <figure className="wl-mutual-note">
            <figcaption className="wl-mutual-kick">their note to you</figcaption>
            <blockquote className="wl-mutual-words">{note}</blockquote>
            <p className="wl-mutual-sign" aria-hidden="true">{atHandle(them)}</p>
          </figure>
        ) : null}

        {yours ? (
          <div className={`wl-mutual-yours${mineOpen ? ' is-open' : ''}`}>
            <button
              type="button" className="wl-quiet wl-mutual-toggle"
              aria-expanded={mineOpen} aria-controls="wl-mutual-mine"
              onClick={() => setMineOpen((o) => !o)}
            >
              {mineOpen ? 'hide your note' : 'your note'}
            </button>
            <p id="wl-mutual-mine" className="wl-mutual-mine" hidden={!mineOpen}>{yours}</p>
          </div>
        ) : null}

        <SheetFoot className="wl-mutual-foot">
          <Pill tone="light" wide href={`https://instagram.com/${them}`} rel="noreferrer noopener" target="_blank">
            message {atHandle(them)} on instagram
          </Pill>
          {/* The quiet way out closes onto the wall and says nothing to
              anybody (`onClosing` in Reveal below). */}
          <CloseQuiet>back to the wall</CloseQuiet>
        </SheetFoot>
      </div>
    </div>
  )
}

export default function Reveal({ id, go, up, back, upLabel = 'back to the wall', reduce, toWall = null }) {
  const them = normHandle(id)
  // who this is: null until the server has said, then the row (main/data.js)
  const [who, setWho] = useState(null)
  const [mutual, setMutual] = useState(() => fromHeld(guessHandle(), them) || undefined)

  useEffect(() => {
    let alive = true
    me().then((u) => { if (alive) setWho(u) })
    return () => { alive = false }
  }, [])

  const handle = !who ? ''
    : who.handleVerified && who.handle ? normHandle(who.handle)
    : myHandle()
  // The mutual itself, off the same RPC the list of pings reads. Asked here
  // as well so a shared or reloaded address lands on the screen, and so a
  // copy held from a moment ago is checked against the row. Nothing is said
  // until whoami has answered.
  useEffect(() => {
    if (!who) return undefined
    if (!handle || !them) { setMutual(null); return undefined }
    let alive = true
    const held = fromHeld(handle, them)
    setMutual(held || undefined)
    myPings({ handle, proof: heldProof(handle) }).then((out) => {
      if (!alive) return
      if (!out.ok && held) return
      setMutual(out.mutuals.find((m) => normHandle(m.to) === them) || null)
    })
    return () => { alive = false }
  }, [who, handle, them])

  // The quiet way out closes onto the wall, whatever the sheet was opened
  // from, and onto its names: a link that brought somebody here before the
  // wall was ever opened has its poster still up under the sheet, and it is
  // dropped as the sheet starts to go (index.jsx `toWall`), as the ping's
  // own way back does. The close mark, the scrim and Escape go back one
  // step, as every sheet's do.
  const way = useRef('')
  const onClosing = useCallback((by) => {
    way.current = by
    if (by === 'quiet' && toWall) toWall()
  }, [toWall])
  const onClose = useCallback(() => (way.current === 'quiet' ? back() : up()), [back, up])
  // Nothing to show, and the account sheet is where the reason is. A reveal
  // the browser opened on directly has nothing behind it, so its entry is
  // given to the wall first, as the door gives its own (Join.jsx `place`),
  // and the account sheet closes onto the names and not back onto this.
  const toYou = useCallback(() => {
    if (!window.history.state?.wallPushed) {
      window.history.replaceState({ ...window.history.state, wall: 'wall', wallDepth: 0 }, '', href('wall'))
    }
    go('you')
  }, [go])
  const mine = handle || guessHandle()

  return (
    <Sheet onClose={onClose} onClosing={onClosing} labelledBy="wl-reveal-h" className="is-reveal">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={up} label={upLabel} />
        {mutual === undefined ? (
          // asked, and not answered yet: the phone's hourglass, and nothing
          // said about it
          <div className="wl-reveal-wait">
            <h2 id="wl-reveal-h" className="wl-sr">it&#8217;s mutual</h2>
            <Wait scale={3} />
          </div>
        ) : mutual === null ? (
          // Not a mutual, or not this person's to see. Said flatly and
          // without a reason, because every reason this screen could give is
          // a fact about somebody else. The one key is this person's own
          // pings, where whatever is theirs to know is said.
          <div className="wl-reveal-none">
            <Display size="l" as="h2" id="wl-reveal-h">nothing here.</Display>
            <div className="wl-push" />
            <SheetFoot>
              <Pill tone="light" wide onClick={toYou}>your private notes</Pill>
            </SheetFoot>
          </div>
        ) : (
          <Mutual mine={mine} them={them} mutual={mutual} reduce={reduce} />
        )}
      </div>
    </Sheet>
  )
}

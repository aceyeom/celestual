// ── /berkeley/join — THE ONE DOOR ───────────────────────────────────────────
//
// How the core of the product works, drawn, reached from one place: the tab
// at the bottom of the wall, which does not exist until somebody has put a
// letter up, the first time this device presses it. After that the tab goes
// straight on.
//
// That gating is the whole point. The wall asks nothing of anybody until they
// try to read or write, and the moment it starts offering an ACCOUNT it stops
// being a thing you can hand out on paper. But a person who has just named
// somebody is, right then, carrying exactly one question: did they do the same.
// This screen is that question and nothing else.
//
// ── what it says, and how ───────────────────────────────────────────────────
// It is said the way a friend would say it to somebody new, without the
// product's own word for anything. A person arriving here does not know what
// a ping is, and a screen that explains a thing by its name has explained
// nothing. So: you send them a note, privately, and they are never told; they
// send you one too, not knowing you did; and only then do you both find out,
// at once, and read each other's. That is all of it, and it is said in that
// order, in one read, top to bottom:
//
//   how it works                 a kicker, small and dim, so the headline
//                                is not the thing that has to say what this is
//   find out if it's mutual.     the headline: what pressing the key gets you
//   the phone                    the three steps, drawn
//   1  2  3                      the three steps, said: each one strong line,
//                                and one quieter line under it that answers
//                                the question the first one raises. The step
//                                the phone is on is lit, the ones it has told
//                                stay lit, and the one it has not reached
//                                waits, dim
//   write one                    the one key
//
// It was a headline that said "ping" twice, a picture, and three lines in the
// poster's display type at one weight, each the same size as the headline's
// second line, with an arrow before each: a page of four things at one
// volume, and a new person asked to learn a word before being told what it
// meant.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FIGURE: the mechanic, on a phone                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A letter's screen, the night one, with the intro's two on it, a boy and a
// girl, one at either side of the glass from the first frame, and the story
// is the mechanic in the order it happens (pixmark.js `joinStory`):
//
//   1  900ms   he holds a note up and lets it go. It goes over to the middle
//              of the glass, above and ahead of him and never across him,
//              and stops there, sealed and dimmed. She does not look up.
//   2  2300ms  she lets one go, not having seen his, and it stops and seals
//              beside it.
//   3  3600ms  only now do the two notes wake and slide into each other, and
//              on the frame they meet they are one note, lit: both of them
//              find out at once. It goes out a pixel at a time as the two of
//              them set off to each other on the same beat; her run carries
//              her on into his arms and half behind him, the phone's
//              backlight turns pink a few cells at a time and the phone
//              becomes a letter lit in rose (turn.js), and they glide
//              together into the mark.
//
// The mark stands, the screen goes to sleep, and it wakes on the two of them
// apart again and tells it all again (`STORY.loop`), for as long as the page
// is open. The steps under it follow the phone each time round; the key,
// once it has come up, stays.
//
// There was a heart: the notes became one and it rose off the top of the
// glass over them as they ran. It is gone, and so is the way the notes used
// to seal on his head and cross his face on their way to it.
//
// Nobody is named on the phone. It used to carry @you over the one on the
// left and @them over the one on the right, and with a boy and a girl on the
// glass that is telling the person holding the phone which of the two they
// are. The steps under it say "you" and "they", and either of the two can be
// either.
//
// ── on buying this instead ──────────────────────────────────────────────────
// A Lottie file or a stock illustration was the obvious way to make this screen
// look expensive, and it is the one thing that would have made it look cheaper.
// Every ornament in this build is derived from something true: the field's
// density is the letter count, a constellation is a handle's hash, the mark is
// nine constants, and the two who run into it are drawn a pixel at a time on
// the screen every letter is written on. A bought animation is the only object
// that could sit here knowing nothing about what it is next to.

import { useEffect, useRef, useState } from 'react'
import { Display, Pill, Close } from '../parts.jsx'
import { Screen } from '../screen.jsx'
import { skinOf } from '../looks.js'
import { turnStyle } from '../turn.js'
import PixelStory, { SQUARE, underPink, useStoryClock, heldAt } from '../PixelStory.jsx'
import { joinStory } from '../pixmark.js'
import { cardStep } from '../seed.js'
import { patch } from '../store.js'
import { href } from '../router.js'
import '../mutual.css'

const STEPS = [
  { line: 'you send them a note, privately.', sub: 'they’re never told.' },
  { line: 'they send you one too.', sub: 'on their own, not knowing you did.' },
  { line: 'you both find out, at once, and read each other’s note.', sub: 'if it never happens, nobody ever knows.' },
]

// The story's beats are the steps': each is lit as its part of the story
// starts, the first once the screen has come on (mutual.css `.wl-join-scr`,
// 180ms and 900 of flicker), so the note is seen to leave and not found
// already in the air. The key comes up once both have found out, while the
// two of them are still running to each other.
const NIGHT = skinOf('night')
const ROSE = skinOf('rose')
const STORY = joinStory({ you: 900, them: 2300, both: 3600, panel: [ROSE.hi, ROSE.mid, ROSE.lo], ink: [NIGHT.ink, ROSE.ink] })
const T = STORY.times
// The moments a telling passes, in order: the three steps and the key
// (`LAST` of them), the pink leaving the two of them, the screen going to
// sleep, and dark enough that the phone's light can go back to the night's
// unseen (mutual.css, `wl-sleep` is 560ms).
//              1       2        3        4                5       6       7
const MARKS = [T.you, T.them, T.both, T.found + 400, T.glow, T.rest, T.rest + 600]
const LAST = 4
const GLOW = 5
const ASLEEP = 6
const DARK = 7

// the night screen, with nobody named on it, and no keys, turning into the
// rose letter as the pink spreads over it, the panel under the pink once it
// is all pink; and how long after the pink leaves them the bands and the
// light turn (as it reaches the top of the glass), and the panel
const LOOK = { tint: 'night' }
const PHONE = underPink(turnStyle('night', 'rose', SQUARE))
const TURN = { '--mu-turn-at': `${T.top - T.glow}ms`, '--mu-pan-at': `${T.covered - T.glow}ms` }
const NO_KEYS = {}
const NO_TOP = {}

// ── the screenshot loop's hold ──
// Development only, as the intro's `?t=` is: `?story=5200` holds the glass,
// the steps and the phone's light on 5200ms into a telling.
function devHold() {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('story')
  return v === null ? null : Math.max(0, Number(v) || 0) % STORY.loop
}

export default function Join({ go, up, upLabel = 'back to the wall', setField, reduce }) {
  const hold = useRef(devHold()).current
  // A tap lands the telling on its mark, from which it goes on round; the
  // clock is moved, not stopped. Reduced motion holds the mark still.
  const [from, setFrom] = useState(() => performance.now())
  const [landed, setLanded] = useState(false)
  const still = reduce || hold !== null
  const clock = useStoryClock(STORY, from, MARKS, still)
  const now = reduce ? heldAt(MARKS, T.done) : hold !== null ? heldAt(MARKS, hold) : clock
  const at = Math.min(LAST, now.i)
  // the key, and the steps told, stay once a telling has reached them
  const told = reduce || now.n > 0 ? LAST : at
  // the pink has left the two of them on the glass, and the room takes it
  // up; asleep between two tellings, and then dark
  const lit = now.i >= GLOW && now.i < DARK
  const asleep = !reduce && now.i >= ASLEEP
  // a landing is for the telling it lands, and the next one is told whole
  const skip = landed && now.n === 0
  // a held frame holds the phone's light where it is at that moment too
  const fig = hold === null ? TURN : {
    ...TURN,
    '--held-turn': lit ? Math.max(0, Math.min(1, (hold - T.top) / 460)) : 0,
    '--held-pan': lit && hold >= T.covered ? 1 : 0,
  }
  useEffect(() => { setField('slow') }, [setField])
  // Shown once: the tab goes straight on from here (Wall.jsx `Tab`).
  useEffect(() => { patch({ joined: true }) }, [])

  // The last step a card can be credited with, and the furthest one: from the
  // wall into the rest of the product (migration 0047). The sheet it opens
  // writes it down too, once per device, whichever door it was opened from.
  //
  // ── and it opens on the people ──
  // It used to leave the wall for Main's /place, a page in another design
  // with the last handle written to already in its field. It is a sheet on
  // the wall now (screens/Ping.jsx), and it opens on everybody this person
  // has written to, one press each, with the field under them for anybody
  // else. This page is a door and not a place to come back to, so it gives
  // its entry in the history to the wall first: the sheet closes onto the
  // names, and the back button does not walk through the drawing again.
  const place = () => {
    cardStep('handoff')
    window.history.replaceState({ ...window.history.state, wall: 'wall', wallDepth: 0 }, '', href('wall'))
    go('ping')
  }

  // The same escape the intro has, for the same reason: a telling runs
  // seven seconds and the second person at a demo table has already seen
  // it. A tap anywhere lands it on the mark, the steps told and the key up,
  // and from there it goes on round.
  useEffect(() => {
    if (still) return undefined
    const land = () => {
      setFrom(performance.now() - T.done)
      setLanded(true)
    }
    window.addEventListener('pointerdown', land)
    window.addEventListener('keydown', land)
    return () => {
      window.removeEventListener('pointerdown', land)
      window.removeEventListener('keydown', land)
    }
  }, [still])

  // the step the phone is on; none once it has told them all
  const on = at >= LAST ? -1 : at - 1

  return (
    <div className={`wl-page wl-join is-at${at}${told >= LAST ? ' is-told' : ''}${skip ? ' is-landed' : ''}${reduce ? ' is-still' : ''}`}>
      <header className="wl-top">
        {/* The corner mark is GONE from this screen, and only from this one.
            Everywhere else it is the thing that says which product you are in;
            here it stood a hundred and eighty pixels above the same mark drawn
            seventeen times larger, assembling itself, as the whole subject of
            the page, so it was not identification, it was the logo twice. The
            X keeps the right-hand slot it holds on every screen. */}
        <span aria-hidden="true" />
        <Close onClick={up} label={upLabel} />
      </header>

      <div className="wl-join-in">
        <div className="wl-join-head">
          <p className="wl-join-kick">how it works</p>
          {/* The offer, said as the offer: what pressing the key gets you, in
              the words a person would use for it. */}
          <Display size="l" className="wl-join-h">find out if it&#8217;s mutual.</Display>
        </div>

        {/* The figure is a picture of the three steps beside it, and the steps
            are what a screen reader hears. The screen is the one lit thing on
            this page until the key comes up under it. */}
        <div
          className={`wl-join-fig${lit ? ' is-lit' : ''}${asleep ? ' is-asleep' : ''}${hold !== null ? ' is-held' : ''}`}
          style={fig} aria-hidden="true"
        >
          {/* the light off the glass, into the room (mutual.css) */}
          <span className="wl-join-light" />
          {/* asleep between two tellings, and waking on the next (mutual.css) */}
          <Screen
            look={LOOK} seed="join" top={NO_TOP} keys={NO_KEYS} live={false} state={asleep ? 'asleep' : 'waking'}
            className="wl-join-scr" style={PHONE}
          >
            <PixelStory story={STORY} at={reduce ? T.done : hold} from={from} />
          </Screen>
        </div>

        <ol className="wl-join-steps">
          {STEPS.map((s, i) => (
            <li
              key={s.line}
              className={`wl-join-step${i === on ? ' is-on' : ''}${told > i ? ' is-told' : ''}`}
              aria-current={i === on ? 'step' : undefined}
            >
              <span className="wl-join-n" aria-hidden="true">{i + 1}</span>
              <span className="wl-join-say">
                <span className="wl-join-line">{s.line}</span>
                <span className="wl-join-sub">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className={`wl-join-foot${told >= LAST ? ' is-in' : ''}`}>
          {/* ── the hand-off ──
              This used to open /berkeley/orbit, a drawn stand-in for the core
              service, and then Main's /place by a real navigation out of this
              tree. It is the wall's own sheet now, so the key raises it over
              the wall in place (`place` above). */}
          <Pill tone="light" wide onClick={place}>
            write one
          </Pill>
        </div>
      </div>
    </div>
  )
}

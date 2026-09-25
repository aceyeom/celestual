// ── /berkeley/join — THE ONE DOOR ───────────────────────────────────────────
//
// The only route from the wall into the core service, reached from one place:
// the tab at the bottom of the wall, which does not exist until somebody has
// put a letter up.
//
// That gating is the whole point. The wall asks nothing of anybody until they
// try to read or write, and the moment it starts offering an ACCOUNT it stops
// being a thing you can hand out on paper. But a person who has just named
// somebody is, right then, carrying exactly one question: did they do the same.
// This screen is that question and nothing else.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE FIGURE: the mechanic, on a phone                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// It was the mark taken apart into its own parts and assembled again, the
// band leaving @you over the top and @them under it and the star igniting
// when the circuit closed: a vector drawing of the logo, in chalk, with a
// bloom behind it, on a wall where everything else had become the phone. It
// is a letter's screen now, the night one, with the story from the intro on
// it (pixmark.js `joinStory`), and the story is the mechanic, in the order
// it happens:
//
//   1  you put their name up     @you runs in from the left and stops, and
//                                stands there. Nothing comes back. That is
//                                what a ping is.
//   2  they put yours up         @them runs in from the right and stands
//                                there too, the width of the screen away.
//                                Neither can see the other has.
//   3  you both find out.        and only then do both set off, on the same
//      at once.                  frame, and meet in the middle. The panel
//                                flashes as they touch, they hold on, and
//                                what they stood on and what they are
//                                becomes the mark.
//
// The two people are named in the status row, @you over the one on the left
// and @them over the one on the right, the way a letter's screen names who it
// is for. @them is dim until they have come in.
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
import { PixIcon, Screen } from '../screen.jsx'
import PixelStory, { SQUARE } from '../PixelStory.jsx'
import { joinStory } from '../pixmark.js'
import { cardStep } from '../seed.js'
import { href } from '../router.js'

const LINES = [
  'you put their name up.',
  'they put yours up.',
  'you both find out. at once.',
]

// The story's beats are the lines': each line is said as its part of the
// story starts, and the key arrives as they touch. The first is after the
// screen has come on (wall.css `.wl-join-scr`, 180ms and 900 of flicker),
// so @you is seen to arrive and not found already standing there.
const STORY = joinStory({ you: 800, them: 1700, both: 2600 })
//              1     2     3     4
const BEATS = [800, 1700, 2600, STORY.times.touch + 240]
const LAST = 4

// the night screen, and the two of them named on it
const LOOK = { tint: 'night' }
const NO_KEYS = {}
const TOP = { name: '@you', handle: '@them' }

export default function Join({ go, up, upLabel = 'back to the wall', setField, reduce }) {
  const [at, setAt] = useState(reduce ? LAST : 0)
  // a tap lands the whole thing, the glass on its last frame with it
  const [landed, setLanded] = useState(false)
  const t0 = useRef(performance.now()).current
  const timers = useRef([])
  useEffect(() => { setField('slow') }, [setField])

  useEffect(() => {
    if (reduce) return
    BEATS.forEach((ms, i) => timers.current.push(setTimeout(() => setAt(i + 1), ms)))
    return () => timers.current.forEach(clearTimeout)
  }, [reduce])

  // The last step a card can be credited with, and the furthest one: from the
  // wall into the rest of the product (migration 0047). The ping sheet writes
  // it down too, once per device, whichever door it was opened from.
  //
  // ── and it opens on the people ──
  // It used to leave the wall for Main's /place, a page in another design
  // with the last handle written to already in its field. The ping is a sheet
  // on the wall now (screens/Ping.jsx), and it opens on everybody this person
  // has written to, one press each, with the field under them for anybody
  // else. This page is a door and not a place to come back to, so it gives
  // its entry in the history to the wall first: the sheet closes onto the
  // names, and the back button does not walk through the drawing again.
  const place = () => {
    cardStep('handoff')
    window.history.replaceState({ ...window.history.state, wall: 'wall', wallDepth: 0 }, '', href('wall'))
    go('ping')
  }

  // The same escape the intro has, for the same reason: this runs three and
  // a half seconds and the second person at a demo table has already seen it.
  // A tap anywhere lands the whole thing.
  useEffect(() => {
    if (reduce) return
    const skip = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      setAt(LAST)
      setLanded(true)
    }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [reduce])

  return (
    <div className={`wl-page wl-join is-at${at}`}>
      <header className="wl-top">
        {/* The corner mark is GONE from this screen, and only from this one.
            Everywhere else it is the thing that says which product you are in;
            here it stood a hundred and eighty pixels above the same mark drawn
            seventeen times larger, assembling itself, as the whole subject of
            the page — so it was not identification, it was the logo twice. The
            X keeps the right-hand slot it holds on every screen. */}
        <span aria-hidden="true" />
        <Close onClick={up} label={upLabel} />
      </header>

      <div className="wl-join-air" />

      {/* The offer, said as the offer. It was a question — "Did they put you
          down too?" — which is the thing a person arriving here is already
          asking themselves; a screen that asks it back has spent its headline
          restating the visitor's own state of mind. This is the one sentence
          that says what pressing the button GETS them, and it is the same
          sentence, word for word, as the tab they pressed to get here. */}
      <Display size="l" className="wl-join-h">
        get notified if they<br />put you up too.
      </Display>

      {/* The figure is a picture of the three lines under it, and the lines
          are what a screen reader hears. The screen is the one lit thing on
          this page until the key comes up under it. */}
      <div className="wl-join-fig" aria-hidden="true">
        <Screen
          look={LOOK} seed="join" top={TOP} keys={NO_KEYS} live={false} state="waking"
          className={`wl-join-scr is-pair is-at${at}`} style={SQUARE}
        >
          <PixelStory story={STORY} at={reduce || landed ? STORY.end : null} from={t0} />
        </Screen>
      </div>

      <ol className="wl-rule-list">
        {LINES.map((l, i) => (
          <li key={l} className={`wl-rule-line${at > i ? ' is-in' : ''}`}>
            {/* the phone's arrow: its face has none of its own */}
            <span className="wl-arrow-g" aria-hidden="true"><PixIcon name="arrow" scale={2} /></span>
            <span>{l}</span>
          </li>
        ))}
      </ol>

      <div className="wl-push" />

      <div className={`wl-join-foot${at >= LAST ? ' is-in' : ''}`}>
        {/* ── the hand-off ──
            This used to open /berkeley/orbit, a drawn stand-in for the core
            service, and then Main's /place by a real navigation out of this
            tree. The ping is the wall's own sheet now, so the button raises
            it over the wall in place (`place` above). */}
        <Pill tone="light" wide onClick={place}>
          place a ping
        </Pill>
      </div>
    </div>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE EARLY NOTE                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// One card, on Main's front door and on the screen a ping lands on, saying
// the one thing about this product that is true right now and will not be
// true for long: there are not many of us yet.
//
// ── why it is said at all ───────────────────────────────────────────────────
// Everything else in the build is written for a product that already works.
// This one does not, yet, and not because anything is broken: a double blind
// mutual is arithmetic, and the arithmetic needs two people. Somebody who
// places three pings into a service nobody they know is on gets silence, and
// silence is what this product looks like when it is WORKING, so they cannot
// tell the two apart. That is the one place a person can be honestly told
// something useful, and it is worth a card.
//
// ── and why it is not a growth banner ───────────────────────────────────────
// It asks for one thing, once, and it can be closed. No count of users, no
// badge, no number that goes up, nothing that claims more activity than
// there is (design/VOICE.md, the third frame): the only fact on it is that
// we are early, and the only act on it is handing the link to one person.
// "One person" is meant literally. A card that asks somebody to broadcast is
// a card that gets ignored by people who would have told a friend.
//
// ── and why it takes itself down ────────────────────────────────────────────
// "you are one of the first here" is a claim, and a claim has to stay true.
// Nothing in this browser can count the people on celestual, and nothing
// should be able to, so the note carries a date instead: past it, it does
// not draw, the way the wall's ear comes down on its own when the campus
// shuts (Notice.jsx). Move the date when it is still true. Do not leave it
// standing on the strength of nobody having checked.
//
// ── the object ──────────────────────────────────────────────────────────────
// It is the wall's tab (wall/screens/Wall.jsx `Tab`, wall.css `THE TAB`),
// down to the class names: the same pane, the same sentence in the display
// face, the same disc with the way through in it, the same quiet line under
// it that puts it away. Main draws on the wall's stylesheet already
// (main/index.jsx), and an offer that appears on two surfaces should be one
// object on both, not two cards that were drawn from the same description.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import { getState, patch } from '../wall/store.js'
import { href } from './router.js'

// Past this, the note does not draw. See above: it is a claim with a date on
// it rather than a claim somebody has to remember to check.
const UNTIL = Date.UTC(2026, 11, 31)

// How long it stays away once it has been put away, and how long it takes to
// go (wall.css `wl-tab-drop`). A week, not the wall tab's three days: that
// one comes back because the question it asks is fresh again after another
// letter: this one asks the same thing every time, and asking it again on
// Thursday is how a note becomes a banner.
const AGAIN_MS = 7 * 86400000
const OUT_MS = 320

// Whether the note is due: it is still early, and it was not put away, or it
// was put away long enough ago.
function due(state) {
  if (Date.now() > UNTIL) return false
  const hid = Number(state.earlyHid) || 0
  return !hid || Date.now() - hid > AGAIN_MS
}

// What it says, by where it is standing. The head is the same sentence on
// both because it is the same fact; the line under it is the one that knows
// which screen it is on. On the door it is the reason; after a ping has gone
// out it is also the answer to the question that arrives with the silence.
const WORDS = {
  door: {
    head: 'you are one of the first here.',
    say: 'we are small, and it only works with more of us. pass it to one person you would want on it.',
  },
  placed: {
    head: 'you are one of the first here.',
    say: 'it takes two, so pass it to one person you would want on it. nothing about your ping rides on the link.',
  },
}

export default function Early({ where = 'door', className = '', style }) {
  const [up, setUp] = useState(() => due(getState()))
  const [going, setGoing] = useState(false)
  // '' · copied · link, where `link` is a browser that would not take the
  // clipboard and is handed the address to take itself.
  const [said, setSaid] = useState('')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!up) return null

  const words = WORDS[where] || WORDS.door
  const link = window.location.origin + href('hero')

  // The share sheet where there is one, the clipboard where there is not.
  // A share sheet somebody dismissed is an answer, not a failure, so nothing
  // happens after it: copying a link somebody has just decided not to send
  // is the product insisting.
  const pass = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'celestual', text: 'place a ping. they are never told.', url: link })
        return
      } catch (e) {
        if (e && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setSaid('copied')
    } catch {
      setSaid('link')
    }
  }

  const hide = () => {
    setGoing(true)
    patch({ earlyHid: Date.now() })
    timer.current = window.setTimeout(() => setUp(false), OUT_MS)
  }

  const line = said === 'copied' ? 'the link is on your clipboard. send it to one person.' : words.say

  return (
    <div className={`wl-tab mn-early${going ? ' is-going' : ''} ${className}`} style={style}>
      <button type="button" className="wl-tab-main mn-early-main" onClick={pass}>
        <span className="wl-tab-faces" aria-hidden="true"><Sparkle size={13} /></span>
        <span className="mn-early-text">
          <span className="wl-tab-text">{words.head}</span>
          <span className="mn-early-say" aria-live="polite">{line}</span>
        </span>
        <span className="wl-tab-go" aria-hidden="true"><Icon name="join" size={19} /></span>
      </button>
      {/* A browser that refused the clipboard: the address itself, selectable
          whole on one press, the way the code in the mail is (main/Copy.jsx).
          Outside the card because a card IS a button and text inside one
          cannot be selected. */}
      {said === 'link' ? (
        <p className="mn-early-link"><span className="mn-early-url">{link}</span></p>
      ) : null}
      <button type="button" className="wl-quiet wl-tab-hide" onClick={hide}>not now</button>
    </div>
  )
}

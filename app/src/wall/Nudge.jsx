// ── the nudge ───────────────────────────────────────────────────────────────
//
// "Never hide or limit how many letters a user can view. Only nudge them."
// (the owner, 26 September; migration 0066). Every letter is whole to
// anybody, as many as they read, and this is all that is left of the door
// that used to stand on the ninth: a small note under the letter, on the
// phone's own unlit panel, saying the one thing signing in gets a reader who
// has been reading, with two soft keys, `not now` and `sign in`.
//
// ── what it replaced ────────────────────────────────────────────────────────
// Eight whole letters, counted by the database, and then a letter that
// arrived with every word struck out and one lit key under it reading `read
// it` (migrations 0045 and 0049, screens/Letter.jsx `sealSay`). That was a
// paywall with no price on it, and a person who had just read eight letters
// about people they knew was asked to answer for themselves before they could
// read a ninth sentence. The words are never the price of anything now.
//
// ── when ────────────────────────────────────────────────────────────────────
// Counted here, in this browser, by the letters it has opened (store.js
// `opened`), because it gates nothing: a count a reader can clear is fine for
// a note they can dismiss. First on the eighth letter, where the door used to
// be; then, if it was let be, once more every twelve letters after that; and
// a `not now` is remembered for three days AND twelve letters, whichever is
// later, so a person who said no is not asked again in the same sitting. It
// is never shown to somebody already signed in, never over a letter (it
// stands under the card, in the sheet's foot, where the seal's line stood),
// and never as a count: it does not say how many letters, how many are left,
// or that anything will run out, because nothing will.
//
// ── what it says ────────────────────────────────────────────────────────────
// The one thing signing in gets that reading does not: being told when a
// letter is written to your own @ (docs/ONE-WALL.md, the claim and the alert,
// by Instagram), and the heart, which is counted per person. Said as a
// condition and never as an event, since "someone wrote about you" is the
// line VOICE.md bans: `if one is ever written to you`, not `one was`.
import { useCallback, useEffect, useState } from 'react'
import { PixIcon } from './screen.jsx'
import { getState, patch } from './store.js'
import './nudge.css'

// the eighth letter, where the door stood; every twelve after it; and a
// `not now` held for three days
const FIRST = 8
const EVERY = 12
const REST_MS = 3 * 86400000

// How many letters this browser has opened, off the list the wall already
// keeps to dim what has been read (store.js `opened`), and the one about to
// be, when it is not on the list yet.
function readCount(about = '') {
  const o = getState().opened
  const n = o && typeof o === 'object' ? Object.keys(o).length : 0
  return about && !(o && o[about]) ? n + 1 : n
}

// Whether this is a moment to ask: `{ at, hid }` under `nudge` in the store
// is the count it was last shown at and when it was last put away.
export function nudgeDue(about = '', now = Date.now()) {
  const n = readCount(about)
  if (n < FIRST) return false
  const s = getState().nudge || {}
  const at = Number(s.at) || 0
  const hid = Number(s.hid) || 0
  if (at && n < at + EVERY) return false
  if (hid && now - hid < REST_MS) return false
  return true
}

// ── on the letter ───────────────────────────────────────────────────────────
// Decided once, as the sheet opens, and never while it is up: `ready` is
// whether this person is not signed in, and `about` is the letter (or the
// name) the sheet opened on. Deciding it as the sheet comes up means the
// note's room under the card is there from the first frame, so the card is
// never moved by it arriving: a note that turned up on the eighth letter of
// a deck being turned would lift the card under the eyes of somebody reading
// it. A deck that runs past the mark while it is turned is asked the next
// time a letter is opened, which is the same moment for anybody who reads a
// letter at a time.
//
// It stands while the deck is turned, until it is answered or the sheet
// goes: one ask per sitting, in one place. `open` is false once it has been
// put away, and the note folds shut where it stood rather than leaving, so
// the card settles back down on a curve (nudge.css).
export function useNudge(ready, about) {
  const [on] = useState(() => !!ready && !!about && nudgeDue(about))
  const [open, setOpen] = useState(true)
  // written the moment it is shown, so it is shown once per moment
  useEffect(() => {
    if (on) patch({ nudge: { ...(getState().nudge || {}), at: readCount(about) } })
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps
  const dismiss = useCallback(() => {
    patch({ nudge: { ...(getState().nudge || {}), hid: Date.now() } })
    setOpen(false)
  }, [])
  // signed in while it stood (another tab, the gate and back): it folds too
  const shown = on && open && !!ready
  return { on, open: shown, dismiss }
}

// ── the note ────────────────────────────────────────────────────────────────
// The phone's own note (DESIGN.md 2.6, and the notice at the foot of the wall,
// screens/Wall.jsx `Down`): an unlit panel under its pixel grid with a one
// pixel bezel, the envelope and the line in chalk, the reason under it in
// ash, and under a dotted seam the two soft keys a phone put under a note it
// wanted answered. `sign in` is the lit one; `not now` puts it away. Inside
// a fold (`.wl-signnote-fold`), which holds its room under the card and
// closes it when the note is put away; shut, it is out of the tab order and
// out of the tree a screen reader reads.
export function Nudge({ nudge, onSignIn }) {
  if (!nudge.on) return null
  const shut = !nudge.open
  return (
    <div className={`wl-signnote-fold${shut ? ' is-shut' : ''}`} inert={shut || undefined} aria-hidden={shut || undefined}>
      <div className="wl-signnote-clip">
        <aside className="wl-signnote" aria-labelledby="wl-signnote-h">
          <div className="wl-signnote-in">
            <PixIcon name="env" scale={2} className="wl-signnote-env" />
            <div className="wl-signnote-text">
              <p className="wl-signnote-h" id="wl-signnote-h">hear if one is ever written to you.</p>
              <p className="wl-signnote-why">sign in once, and you can heart the ones you like too. nobody sees who you are.</p>
            </div>
          </div>
          <div className="wl-signnote-keys">
            <button type="button" className="wl-signnote-no" onClick={nudge.dismiss}>not now</button>
            <button type="button" className="wl-signnote-go" onClick={onSignIn}>sign in</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

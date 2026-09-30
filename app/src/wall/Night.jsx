// ── a night that was not mutual ─────────────────────────────────────────────
//
// What the wall says when a private note was not mutual on its night, and on
// the note itself afterwards. The owner asked on 29 September what is shown
// when it is not mutual, what if the other person is not here at all,
// whether the ping could come back, and whether the person could be asked to
// share celestual; and on 30 September, looking at the first answer, that it
// was too wordy, hard to understand and not clean: "make it more direct and
// obvious". So it says three things and no more, each in one short line:
//
//   not this time.                the title, the words the product has
//                                 always used
//   they didn't send you one.     what happened, true whatever the reason:
//                                 they sent nothing, or let one go, or are
//                                 not reachable here yet, and the server
//                                 tells those apart for nobody (0075), so
//                                 the line claims none of them
//   they'll never know you did.   the one fear, answered
//
// and then, where something came back, what came back, as a small lit tag
// that reads at a glance: `+1 free ping this week` for the free one, back as
// the coming week's extra, or `your ping is back` for a bought one, which
// never lapses (0075). A second free one the same night brings nothing back
// and says so in one line (`one ping comes back a week.`); a note from before
// pings, which cost none, says nothing about pings at all. Every word is true
// of this person only, off their own ledger (the note's `cost` and
// `returned`), and the same whoever the other person is. The long sentence
// about "or they aren't reachable here yet, and celestual never says which"
// is gone from the glass: the line above is already the whole truth, and the
// possibility it named is what `share celestual` is for.
//
// ── where it is ─────────────────────────────────────────────────────────────
//   the night    `NightCard`, at the head of the private notes (You.jsx),
//                once a reveal on this device (`nightWaiting`): a notice
//                in the wall's own notice material (the card the wall
//                raises after a post, wall.css `.wl-down`), the face of the
//                person it was about, the three lines and the tag, and the
//                keys that act: `send again` and `share celestual`, or for
//                a night of several notes `share celestual` alone, each
//                note's own `send again` being on its row
//   a note       its own screen opens on the same three lines, set in the
//                middle of the glass as a phone set a message it had
//                finished with (You.jsx `NoteScreen`, 'told'), under the
//                phone's own two envelopes, one sent and one that never
//                came, with the note's options under `options`
//   its reveal   /reveal/<handle> of a note that was not this time shows
//                that screen (screens/Reveal.jsx)
//
// ── the share ───────────────────────────────────────────────────────────────
// Generic, and the receiver's face only (design/VOICE.md 4): the wall's door
// to how it works (/join) with the line that page opens on, `find out if
// it's mutual.`, never a name, never a word about who sent what. Asked for
// inside the tap, the phone's own share sheet where there is one and the
// link copied where there is not.
import { useState } from 'react'
import { Pix, PixIcon } from './screen.jsx'
import { Face } from './parts.jsx'
import { atHandle } from './data.js'
import { canShare } from './share.js'
import { copyText } from './handoff.js'
import { href } from './router.js'
import './night.css'

// ── the words ───────────────────────────────────────────────────────────────
// Who did not send one: `they` on a note's own screen, whose @ is across its
// top already; on the night's notice the @, or two, or the first and how
// many more.
export function whoWords(notes) {
  const hs = (notes || []).map((p) => atHandle(p.to))
  if (hs.length === 1) return hs[0]
  if (hs.length === 2) return `${hs[0]} and ${hs[1]}`
  return `${hs[0]} and ${hs.length - 1} others`
}

// What came back for one note, as the tag says it, or '' for nothing.
export function backTag(p) {
  if (!p) return ''
  if (p.returned === 'extra') return '+1 free ping this week'
  if (p.returned === 'kept') return 'your ping is back'
  return ''
}

// The one line said where nothing came back and there is a reason worth a
// line: the second free one of a night. A note from before pings cost none
// and says nothing.
export function backNote(p) {
  return p && !p.returned && p.cost === 'free' ? 'one ping comes back a week.' : ''
}

// And for a night of several, what came back in all.
export function backTotalTag(night) {
  const n = (night.extra || 0) + (night.kept || 0)
  if (!n) return ''
  if (!night.kept) return '+1 free ping this week'
  if (!night.extra) return night.kept === 1 ? 'your ping is back' : `${night.kept} pings are back`
  return `${n} pings are back`
}
export function backTotalNote(night) {
  if ((night.extra || 0) + (night.kept || 0)) return ''
  return night.notes.some((p) => p.cost === 'free') ? 'one ping comes back a week.' : ''
}

// The few words a note's row carries after `not this time` (You.jsx): the
// same fact, as short as it goes.
export function backMark(p) {
  return p && p.returned === 'extra' ? '+1 free ping' : p && p.returned === 'kept' ? 'ping back' : ''
}

// ── the tag ─────────────────────────────────────────────────────────────────
// What came back, lit: the phone's small check and the words, on a plate of
// whatever ink it stands in (night.css `.wl-night-tag`).
// On the glass the check is the screen's own pixels (`Pix`, in `cqw`); on
// the notice, which is the wall's chrome, it is the chrome's whole-pixel
// glyph (`PixIcon`), so it is as crisp as the words beside it.
function Tag({ children, chrome = false }) {
  return (
    <span className="wl-night-tag">
      {chrome
        ? <PixIcon name="check" scale={2} className="wl-night-tag-g" />
        : <Pix name="check" h={4.6} className="wl-night-tag-g" />}
      <span>{children}</span>
    </span>
  )
}

// ── the report, on a note's own glass ───────────────────────────────────────
// Set in the middle of the glass, as the phone set a message it had finished
// with: its two envelopes, the one that went and the place where the one
// back would have been, the title, the two lines, and what came back.
export function NightReport({ p, titleId }) {
  const tag = backTag(p)
  const note = backNote(p)
  return (
    <div className="wl-night-rep" role="status">
      <span className="wl-night-pic" aria-hidden="true">
        <Pix name="env" h={5.4} />
        <span className="wl-night-dots" />
        <Pix name="env" h={5.4} className="is-none" />
      </span>
      <b id={titleId}>not this time.</b>
      <span className="wl-night-lines">
        <span>they didn&rsquo;t send you one.</span>
        <span>they&rsquo;ll never know you did.</span>
      </span>
      {tag ? <Tag>{tag}</Tag> : note ? <span className="wl-night-note">{note}</span> : null}
    </div>
  )
}

// ── the share ───────────────────────────────────────────────────────────────
// Called inside the tap. Answers 'shared', 'copied', 'left' (the sheet was
// closed without sharing) or 'failed'.
const SHARE_TEXT = 'find out if it’s mutual.'
export function shareCelestual() {
  const url = new URL(href('join'), window.location.origin).href
  const copy = () => copyText(url).then((ok) => (ok ? 'copied' : 'failed'))
  const data = { title: 'celestual', text: SHARE_TEXT, url }
  if (canShare() && (!navigator.canShare || navigator.canShare(data))) {
    return navigator.share(data).then(() => 'shared', (e) => (e && e.name === 'AbortError' ? 'left' : copy()))
  }
  return copy()
}
// what the phone says after it, where it has something to say
export const SHARED_SAYS = {
  copied: 'link copied.',
  failed: 'the link did not copy. try again.',
}

// ── the night's notice ──────────────────────────────────────────────────────
// At the head of the private notes, once a reveal. The face of the person
// it was about (the first, for a night of several), the title, the two
// lines, what came back, and the keys under a dotted seam as the wall's
// other notices have them: `send again` on the left and `share celestual`
// on the right for a night of one note, `share celestual` alone for a night
// of several. After a key it says what happened in the lines' place (`sent
// again. it runs to saturday.`, `link copied.`), and `ok` puts it away.
//
// `onAgain(p)` sends the note again and answers `{ ends }` when it went,
// `{ said }` when it did not, or nothing when it went somewhere else (the
// paywall); `onOk` puts the notice away.
// What the notice said after a key, kept by the night it is about: sending
// again reads the list again, and the frame draws the notice afresh when it
// comes, so the answer is kept here and not only in the notice's own state.
const SAID = new Map()
export function NightCard({ night, onOk, onAgain, endsOf }) {
  const [said, setHeld] = useState(() => SAID.get(night.at) || null)
  const setSaid = (v) => { if (v) SAID.set(night.at, v); else SAID.delete(night.at); setHeld(v) }
  const [busy, setBusy] = useState(false)
  const one = night.notes.length === 1
  const only = one ? night.notes[0] : null
  const lapsed = !!only && only.state === 'lapsed'
  const tag = one ? backTag(only) : backTotalTag(night)
  const note = one ? backNote(only) : backTotalNote(night)
  const share = () => {
    shareCelestual().then((r) => { if (SHARED_SAYS[r]) setSaid({ h: SHARED_SAYS[r], line: '' }) })
  }
  const again = async () => {
    setBusy(true)
    const out = await onAgain(only)
    setBusy(false)
    if (!out) return
    if (out.said) { setSaid({ h: 'not sent.', line: out.said }); return }
    setSaid({ h: 'sent again.', line: endsOf ? `it runs to ${endsOf(out.ends)}.` : '', done: true })
  }
  // the face of the one it was about; on a night of several, the first,
  // since the line under the title names them all
  const face = night.notes[0].to
  return (
    <div className={`wl-down wl-night${said ? ' is-said' : ''}`} role="status" aria-labelledby="wl-night-h">
      <div className="wl-down-in">
        <Face handle={face} size={36} className="wl-down-face" />
        <div className="wl-down-text">
          <p className="wl-down-h" id="wl-night-h">{said ? said.h : 'not this time.'}</p>
          {said ? (
            said.line ? <p className="wl-down-why">{said.line}</p> : null
          ) : (
            <>
              <p className="wl-down-why wl-night-say">
                <span>{whoWords(night.notes)} didn&rsquo;t send you one.</span>
                <span>they&rsquo;ll never know you did.</span>
              </p>
              {tag ? <Tag chrome>{tag}</Tag> : note ? <p className="wl-down-why">{note}</p> : null}
            </>
          )}
        </div>
      </div>
      <div className={`wl-down-keys${said || (one && lapsed) ? ' is-two' : ''}`}>
        {said ? (
          <>
            <span />
            <button type="button" className="wl-down-ok" onClick={() => { const done = said.done; setSaid(null); if (done) onOk() }} aria-label="ok">ok</button>
          </>
        ) : (
          <>
            {one && lapsed ? (
              <button
                type="button" className="wl-down-ok is-l" disabled={busy} onClick={again}
                aria-label={`send your note to ${atHandle(only.to)} again, for next saturday`}
              >send again</button>
            ) : null}
            <button
              type="button" className="wl-down-ok" disabled={busy} onClick={share}
              aria-label="share celestual. the link says nothing about you or your notes"
            >share celestual</button>
          </>
        )}
      </div>
    </div>
  )
}
export const NIGHT = { tint: 'night' }

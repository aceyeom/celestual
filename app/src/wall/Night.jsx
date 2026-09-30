// ── a night that was not mutual: THE REPORT ─────────────────────────────────
//
// What the wall says on the night a private note was not mutual, and on the
// note itself afterwards. Until 29 September it said two words, `not this
// time`, on a strip and under a dimmed screen, and nothing about what had
// happened to anybody, or to the ping the note had spent (which was used,
// then: 0071). The owner asked what is shown when it is not mutual, what if
// the other person is not here at all, whether the ping could come back and
// whether the person could be asked to share celestual, and asked for the
// way it is told to be honest, direct and beautiful. So a night that was not
// mutual gives every ping it held back (migration 0075), and the phone says
// so, exactly, the way a phone of the era said anything: a message on its
// glass, in its own face, with its keys under it.
//
// ── what it says, in this order ─────────────────────────────────────────────
//   not this time.   the title, the words the product has always used
//   nobody was told  you sent it, and nobody ever will: the one fear, answered
//                    first
//   why              they didn't send you one by 9pm, or they aren't
//                    reachable here yet, and celestual never says which, on
//                    purpose. Both are possible and nothing on the server
//                    tells them apart for anybody (0075's header), so the
//                    line says both, and that the silence is deliberate
//   what came back   per note on the note's own screen, and in total on the
//                    night's: the free ping as an extra this week, the bought
//                    one back to keep, or nothing, with the reason (one extra
//                    a week is the most; a note from before pings cost none)
//
// Every line is true of this person only, off their own ledger (pings.js
// `nightOf`, the note's `cost` and `returned`), and the same whoever the other
// person is. There is no line about them, no urgency, and nothing to chase:
// the keys are what can be done: send it again, share celestual, let it go.
//
// ── where it is ─────────────────────────────────────────────────────────────
//   the night       `NightCard`, in the private notes' frame under the strip
//                   (screens/You.jsx), once a reveal on this device
//                   (`nightWaiting`): a message from celestual, stamped with
//                   the night, telling every note that was not mutual on it
//                   at once, `options` and `ok` on its keys, the options
//                   the next steps: send it again, share celestual, let it go
//   a note          its own screen opens on its report (You.jsx `NoteScreen`,
//                   'told'), the note's own line across the top, with the
//                   note's options under `options`: send it again, with new
//                   words, share celestual, read your note, let it go
//   its reveal      /reveal/<handle> of a note that was not this time shows
//                   the same screen (screens/Reveal.jsx), where it used to
//                   say `nothing here.`; a handle with no note of this
//                   person's still says that, and nothing else
//
// ── the share ───────────────────────────────────────────────────────────────
// Generic, and the receiver's face only (design/VOICE.md 4): the wall's door
// to how it works (/join) with the line that page opens on, `find out if
// it's mutual.`, never a name, never a word about who sent what. Asked for
// inside the tap, as the letter's share is (share.js), the phone's own share
// sheet where there is one and the link copied where there is not.
//
// ── how it looks ────────────────────────────────────────────────────────────
// The night's colour (looks.js `night`), the lit grey phone the reveal's own
// story starts on, never the rose, which is the mutual's alone. The title in
// the screen's large face and the three lines under it a step down (night.css,
// `6.4cqw`), left set as a message is, the line about what came back led by
// the phone's small check when something did. Under reduced motion it is
// simply there.
import { useState } from 'react'
import { Screen, ScreenMenu, ScreenNote, Pix } from './screen.jsx'
import { atHandle } from './data.js'
import { canShare } from './share.js'
import { copyText } from './handoff.js'
import { href } from './router.js'
import { revealStamp } from './pings.js'
import './night.css'

// ── the words ───────────────────────────────────────────────────────────────
// What came back for one note, exactly: the free ping as this week's extra,
// the bought one on hand for good, or nothing, and why nothing.
export function backLine(p) {
  if (!p) return ''
  if (p.returned === 'extra') return 'your free ping came back as an extra for this week.'
  if (p.returned === 'kept') return 'your bought ping came back to you. it never lapses.'
  if (p.cost === 'free') return 'one extra a week is the most, so nothing comes back for this one.'
  if (p.cost === 'paid') return 'nothing comes back for this one.'
  return 'it cost no ping, so none comes back.'
}

// And for a night of several: what came back in all, which is what the week
// under it holds. Each note says its own on its screen.
export function backTotal(night) {
  const parts = []
  if (night.extra) parts.push('1 extra ping this week')
  if (night.kept) parts.push(`${night.kept} bought ${night.kept === 1 ? 'ping' : 'pings'}`)
  if (parts.length) return `back to you: ${parts.join(' and ')}.`
  if (night.notes.every((p) => !p.cost)) return 'they cost no pings, so none come back.'
  return 'one extra a week is the most, so nothing comes back this time.'
}

// The few words a note's row carries after `not this time` (You.jsx): the
// same fact, as short as it goes.
export function backMark(p) {
  return p && p.returned === 'extra' ? 'free one back' : p && p.returned === 'kept' ? 'bought one back' : ''
}

// ── the report, on the glass ────────────────────────────────────────────────
// `notes` is how many it is about; `back` the line about what came back, and
// `came` whether anything did, which puts the phone's check before it.
export function NightReport({ notes = 1, back, came = false, titleId }) {
  const one = notes <= 1
  return (
    <div className="wl-night-rep" role="status">
      <b id={titleId}>not this time.</b>
      <p>nobody was told you sent {one ? 'it' : 'them'}, and nobody ever will.</p>
      <p className="is-why">they didn&rsquo;t send you one by saturday 9pm, or they aren&rsquo;t reachable here yet. celestual never says which, on purpose.</p>
      <p className={`is-back${came ? ' is-came' : ''}`}>
        {came ? <Pix name="check" h={4.6} className="wl-night-g" /> : null}
        <span>{back}</span>
      </p>
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

// ── the night's own screen ──────────────────────────────────────────────────
// A message from celestual, come in on the night: the envelope and the name
// across its top, the night's date where a letter carries its day, and the
// report. Its keys are the phone's: `options` and `ok`, `ok` putting it away.
// The options are the next steps, in the order the owner named them: for a
// night of one note, `send it again` (for next saturday), `share celestual`,
// `let it go`; for a night of several, `share celestual` and then each note
// by its @, which opens that note on its own report, where its own `send it
// again` and `let it go` are. The menu, as every menu on the wall, turns the
// keys to `select` and `back`. What a press says after (sent again, the link
// copied) stands on the glass until `ok`.
//
// `onAgain(p)` sends the note again and answers `{ ends }` when it went, `{
// said }` when it did not, or nothing when it went somewhere else (the
// paywall); `onLetGo(p)` lets it go and answers `{ said }` only when it did
// not; `onOpen(p)` opens a note on its own screen.
export function NightCard({ night, onOk, onAgain, onLetGo, onOpen, endsOf }) {
  const [mode, setMode] = useState('face')
  const [at, setAt] = useState(0)
  const [said, setSaid] = useState(null)
  const [busy, setBusy] = useState(false)
  const one = night.notes.length === 1
  const only = one ? night.notes[0] : null
  const back = one ? backLine(only) : backTotal(night)
  const came = night.extra + night.kept > 0
  const tell = (glyph, title, line = '') => { setSaid({ glyph, title, line }); setMode('said') }
  const share = () => {
    setMode('face')
    shareCelestual().then((r) => { if (SHARED_SAYS[r]) tell('link', SHARED_SAYS[r]) })
  }
  const again = async () => {
    setBusy(true)
    const out = await onAgain(only)
    setBusy(false)
    if (!out) return
    if (out.said) { tell('', out.said); return }
    tell('check', 'sent again.', endsOf ? `it runs to ${endsOf(out.ends)}.` : '')
  }
  const drop = async () => {
    setBusy(true)
    const out = await onLetGo(only)
    setBusy(false)
    if (out && out.said) tell('', out.said)
  }
  const lapsed = !!only && only.state === 'lapsed'
  const items = one ? [
    ...(lapsed ? [{ t: 'send it again', run: again }] : []),
    { t: 'share celestual', run: share },
    ...(lapsed ? [{ t: 'let it go', run: () => setMode('ask') }] : []),
  ] : [
    { t: 'share celestual', run: share },
    ...night.notes.map((p) => ({ t: atHandle(p.to), run: () => onOpen(p) })),
  ]
  const sel = Math.min(at, items.length - 1)
  const pick = (j) => { const it = items[j]; if (it && !busy) it.run() }
  const toFace = () => setMode('face')

  let body
  let keys
  let name = 'celestual'
  if (mode === 'menu') {
    name = 'options'
    body = <ScreenMenu items={items.map((x) => x.t)} at={sel} onAt={setAt} onPick={pick} label="options" onBack={toFace} />
    keys = {
      l: { label: 'select', onClick: () => pick(sel), disabled: busy, aria: `select ${items[sel]?.t || ''}` },
      r: { label: 'back', onClick: toFace, aria: 'back to the report' },
    }
  } else if (mode === 'ask') {
    body = <ScreenNote title="let it go?">they never find out you sent it.</ScreenNote>
    keys = {
      l: { label: 'let it go', onClick: drop, disabled: busy, aria: 'let it go' },
      r: { label: 'keep it', onClick: toFace, aria: 'keep it' },
    }
  } else if (mode === 'said' && said) {
    body = <ScreenNote glyph={said.glyph} title={said.title}>{said.line}</ScreenNote>
    keys = { l: { label: 'ok', onClick: () => { setSaid(null); toFace() }, aria: 'back to the report' } }
  } else {
    body = <NightReport notes={night.notes.length} back={back} came={came} titleId="wl-night-h" />
    keys = {
      l: {
        label: 'options', onClick: () => { setAt(0); setMode('menu') }, disabled: busy,
        aria: `options: ${items.map((x) => x.t).join(', ')}`,
      },
      r: { label: 'ok', onClick: onOk, aria: 'put the report away' },
    }
  }
  return (
    <div className="wl-night">
      <Screen
        look={NIGHT} seed={`night:${night.at}`} live
        top={{ icon: mode === 'menu' ? '' : 'env', name, stamp: revealStamp(night.at), bat: null, ...(mode === 'menu' ? { pos: `${sel + 1}/${items.length}` } : {}) }}
        keys={keys}
      >
        {body}
      </Screen>
    </div>
  )
}
export const NIGHT = { tint: 'night' }

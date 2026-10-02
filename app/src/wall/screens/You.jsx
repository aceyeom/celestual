// ── /berkeley/you, and /you: THE PERSON ─────────────────────────────────────
//
// What this person has out, what they have not finished, and what they have
// written, raised over the wall from the person in its bar. It is the account
// the gate used to draw once somebody was through it, grown by the one thing
// an account on this product is for: the pings. They used to live on Main at
// /sky, a page in another design reached by leaving the wall, and a person
// who wanted to know whether a ping of theirs was still standing had to walk
// out of the phone to ask.
//
// ── three places, not one card ──────────────────────────────────────────────
// It was one card that stacked everything: the person, their @ and its two
// switches and its address and the way off the wall, the private notes, the
// drafts, the letters, the week, and a foot with two keys. The owner called
// it messy, with a lot crammed in, and asked for the sections to be distinct,
// the private notes set apart in a frame of their own, and the pings and the
// public letters subdivided. So the sheet is three places now:
//
//   the person   who is signed in, their face and their name, and one quiet
//                key to the settings. Always at the top.
//   two tabs     `private notes` and `letters`, a two way switch in the
//                phone's keys under the person, remembered for the tab
//                (sessionStorage). Each carries its own draft: the ping one
//                DM from out stands with the notes, the letter the composer
//                is holding stands with the letters. And each has its own key
//                at the foot: send a private note, or write a letter.
//   settings     the @ and what owning it is for (the two email switches, the
//                address, taking the name off the wall) and the way out of
//                this device, on a page of their own behind the person's key.
//                They are asked about once, and were in the way every time.
//
// Tabs rather than two stacked sections, because the two lists are two
// different kinds of thing (one sealed and only ever this person's, one up on
// the wall for anybody), a person comes to the sheet for one of them, and on
// a phone a stack put the second a scroll under the first every time.
//
// ── the notes are sealed, and look it ───────────────────────────────────────
// The private notes stand in a frame nothing else on the wall wears: a panel
// with the phone's double rule round it, a title strip with the sealed
// envelope and the slots as pixel cells, the way a phone's own inbox of
// messages you kept was a box inside the box. Each note's row ends in the
// aerial from the phone's status row, and only the aerial (the owner asked
// for the Y alone, aerial.jsx), in one of three states: searching while its
// week runs (the waves going out from it), the same with the waves held once
// it is kept for the week after, and dark with the phone's small cross on one
// that was not this time. A press on the row opens the note's own screen,
// with what can be done to it on the screen's own menu, and beside the press
// stands its `edit` key, to the note's sheet with its words on it, to change
// them or let it go (screens/Ping.jsx `editNote`): the owner asked for a key
// on the list itself that takes a note back to its settings (28 September).
//
// A mutual is not a row. It is its slot (Slot.jsx): a small phone, the night
// screen with two sealed notes stepping toward each other across it and
// never meeting until it is opened, and the rose letter with the one note on
// it after, on this device (pings.js `wasOpened`). A press on its glass opens
// the reveal out of that glass (revealfrom.js `openReveal`), and its `edit`
// opens the keepsake with its options up, since writing them a new note and
// taking it off one's own list are the keepsake's own menu. It used to be a
// row with a rose bezel and the aerial lit, and the owner asked for the slot
// to be more beautiful, moving, suspenseful (28 September).
//
// Since 0072 a handle can be on the list twice, a mutual and a new note to
// the same person beside it, so everything here that picks a ping picks it by
// what it is asking: the note a row opens is that row's own, by its `key`,
// and never the handle's first (two linked @s can each have a note on the
// same person, one running and one not this time), each person's mutual is
// shown once (pings.js `mutualsOf`), and the rows, the landing and the
// counts go by the ping's own `key` too.
//
// ── and they run for a week ─────────────────────────────────────────────────
// A note ends at Saturday's reveal, nine at night in California, and that
// night everybody finds out, together (migration 0069). So the tab opens on
// the reveal itself: a small screen lit in rose, the one lit thing on the
// sheet, counting down to the night with the week draining out of its
// battery, the day of it stamped where a letter's day is, and one soft key,
// `info`, to the drawing of how it works (screens/Join.jsx). After a reveal
// this person had a note in, and until they have seen it, the key in the bar
// carries a light (parts.jsx `TopBar`), and this screen wakes on "the reveal
// is in" with what it said, while the rows under it search once more and
// land on what they are. A note that was not this time stays a week, to be
// sent again; one that is still running can be kept for the week after, so
// a person who will not look on Saturday says so on Wednesday.
//
// A night that was not mutual is told, not just shown (the owner, 29
// September, and made short and plain on the 30th): a notice stands in the
// frame once a reveal (Night.jsx `NightCard`) saying `not this time.`, who
// did not send one, that they will never know you did, and what came back:
// every ping a night that was not mutual held comes back (migration 0075), a
// free one as one extra this week, a bought one on hand. Each note that was
// not this time opens on the same few lines of its own (`NoteScreen`), and
// its row says what came back of it.

// ── and only ever their own ─────────────────────────────────────────────────
// Nothing here is about anybody else. A standing ping says who and how long
// it has left, and nothing about whether they have seen it, whether they are
// reachable here, or whether anybody else has placed one on them, because
// none of that is knowable without telling somebody something they did not
// agree to being told. A note that was not this time says `they didn't send
// you one.`, which is true whichever it was and claims neither, since the
// server answers it the same either way (0075). And nothing here is ever on
// the wall: a ping is sealed until both sides exist, and showing one anywhere
// a second person can look would be the double blind broken by the product
// itself.
//
// ── the three ways the list can not be there ────────────────────────────────
// "nothing out yet." used to be drawn for three different facts: no @ proved
// on this device, a proof the server no longer honours (thirty idle days, or
// a verification made on another phone), and a read that failed. The second
// is the expensive one: a person with a mutual on their row was told they had
// nothing out, and had no control on the screen to prove the handle again.
// So each has its own words and its own way on, inside the frame.
//
// And the second is nearly gone (migration 0065). A person who claimed their
// @ once, on any device, and is signed in here by any proof (the DM, google,
// a mailed link, a campus address) gets the @'s proof back from the server
// as the list is read (pings.js `myPings`, auth.js `restoreProof`), so their
// private notes are simply there. It was the owner's own complaint: signed in
// by email, and asked to confirm their Instagram every single time. What is
// left of 'unverified' is a device that holds a DM proof its person's row
// does not: the DM is the one way to claim an @, and that is when it is owed.
//
// ── nobody known here ───────────────────────────────────────────────────────
// Signed out, this sheet is the gate's door, all three ways in with Instagram
// first (screens/Gate.jsx, landing back here). It was the Instagram DM alone,
// with "or send a private note first", and it is reached from the places a
// returning person comes back by: a mail's link to /sky, the stop page's
// "turn them back on", the reveal's "your private notes". Somebody who
// signed in by email or Google before, whose account holds their @ and their
// notes, was sent into a second DM for what one mailed link would have
// brought back.
//
// One arrival is the DM on purpose: the nudge under a letter
// (`openForAlerts`), which promises an email when a letter is written to
// you. Only the @ can be written to, and only the DM proves the @, so that
// door is the DM, and once it lands the person is asked the one question the
// nudge was about (screens/Claim.jsx, "want an email when someone writes to
// you?").
import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Label, Pill, Face, Icon, Allowance, Heart, DoorFoot, Switch, useProfile, prefersReducedMotion,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, Wait, PixIcon, useWake, POWER_MS } from '../screen.jsx'
import { Provider } from '../art.jsx'
import {
  labelFor, allowance, loadQuota, mine, loadMine, sinceline, atHandle, normHandle, nameKey, cleanName, DAY, unwithdraw,
} from '../data.js'
import { stampOf } from '../looks.js'
import { getState, patch } from '../store.js'
import { member, memberLabel, isReader, signOut, refresh, toWrite, heldProof } from '../auth.js'
import { loadPending } from '../handoff.js'
import {
  myHandle, myPings, heldPings, forgetPings, renew, release, sendAgain, stateWords,
  nextReveal, lastReveal, revealStamp, countdown, endsWords, endedWords, keptAhead, revealWaiting, sawReveal,
  heldAllowance, waitForPings, forgetWeek, liveOf, mutualsOf, freeWords, nightOf, nightWaiting, sawNight, wasOpened,
} from '../pings.js'
import {
  NightCard, NightReport, NIGHT, backMark, shareCelestual, SHARED_SAYS, Tag, whoWords, backTag, backNote, backTotalTag, backTotalNote,
} from '../Night.jsx'
import { takeReturn, openReveal } from '../revealfrom.js'
import { Aerial } from '../aerial.jsx'
import { MutualSlot, EditKey, movingOf } from '../Slot.jsx'
import { useProve, ProveDoor, editNote, takeNoteBack } from './Ping.jsx'
import { useAlertLink, AlertEmail } from './Alerts.jsx'
import Gate from './Gate.jsx'
import { alertsGet, alertsSet } from '../../api/alerts.js'
import { skinVars } from '../looks.js'
import { LOOK, LOOK_CLASS } from '../look.js'
import '../profile.css'
import '../profile-v1.css'
import '../profile-v2.css'

// ── which look ──────────────────────────────────────────────────────────────
// Two other ways this card could look, drawn beside the one it has for the
// owner to choose between (1 October: the card felt like parts that did not
// belong together, its colours, its balance and its motion, and the news on
// it was easy to read past). Both keep the phone and change how it is
// arranged and lit (look.js reads which, from `?profile=`):
//
//   1   the quiet one. Nothing lit but the key at the foot. The frame round
//       the notes is gone; the reveal is a panel of its own over them, its
//       count in large figures with the one line of what happens on the
//       night; the lists stand on the sheet under labels, hairlines between
//       their rows; the tabs' plate slides; what comes in rises a beat apart.
//   2   the lit one. The card has a screen of its own at its head, the night
//       glass the letters and the slots are lit in, and it says what the tab
//       under it is about: the count to the night over the notes, how many
//       letters are up over the letters. The tabs are the soft keys under
//       that glass, and the lists stand in one panel, each part under a
//       strip of its own. It comes on the way a screen does, and its lines
//       are drawn on.
//   0   this card as it was.
//
// Both say each note's state in words beside its aerial, stand the week's
// pings in the foot over the key that spends them, and open a reveal with a
// press (`Reveal` below).

// ── the nudge's way in ──────────────────────────────────────────────────────
// The account, opened on the Instagram DM rather than on the three ways in,
// and handed on to the question about the email once the DM lands (the head
// of this file says why). Held here for the one mount it is for, and carried
// in the DM's pending record across the walk to Instagram and back.
let FOR_ALERTS = false
export function openForAlerts(go) {
  FOR_ALERTS = true
  go('you')
}

// ── which tab was open ──────────────────────────────────────────────────────
// Remembered for as long as the browser's tab is, so a person who went to
// the letters, opened one and came back finds the letters again. Storage can
// be switched off or full, and then the notes open every time, which is the
// right first answer anyway.
const TAB_KEY = 'celestual.you.tab'
function readTab() {
  try { return window.sessionStorage.getItem(TAB_KEY) === 'letters' ? 'letters' : 'notes' } catch { return 'notes' }
}
function keepTab(t) {
  try { window.sessionStorage.setItem(TAB_KEY, t) } catch { /* the notes open next time, as above */ }
}

// ── drawn here ──────────────────────────────────────────────────────────────
// The frame's own glyph, on the phone's grid like every glyph on the wall
// (looks.js `PIX`), and drawn only here: the envelope, its flap closing on a
// seal. One string per row, `X` lit.
const SEAL = [
  'XXXXXXXXXXXXXXX',
  'XX...........XX',
  'X.XX.......XX.X',
  'X...XX...XX...X',
  'X....XXXXX....X',
  'X....XXXXX....X',
  'X.....XXX.....X',
  'X.............X',
  'XXXXXXXXXXXXXXX',
]
const SEAL_D = SEAL.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : ''))).join('')
function Seal({ scale = 2 }) {
  return (
    <svg
      className="wl-pxi wl-vault-seal" viewBox={`0 0 ${SEAL[0].length} ${SEAL.length}`}
      width={SEAL[0].length * scale} height={SEAL.length * scale}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"
    >
      <path d={SEAL_D} />
    </svg>
  )
}

// ── the aerial ──────────────────────────────────────────────────────────────
// The Y at the end of a row (aerial.jsx, where the mutual's slot draws it
// too), in the state its note is in: `seek` while its week runs, `kept` once
// it is kept for the week after, `none` when it was not this time.
const aerialOf = (p) => (p.state === 'lapsed' ? 'none' : keptAhead(p) ? 'kept' : 'seek')

// A row lands where it is seen. One under the sheet's sticky foot, or past
// the end of a short window, landed where nobody was looking, so each starts
// its landing as it comes into sight above the foot, a beat after the ones
// that came with it, and searches until then (profile.css `.is-seen`). The
// answer is when each row's landing starts, by its ping's key: by its handle
// it was, until one handle could be a mutual and a new note, two rows landing
// on one clock.
function useSeen(on, scroller, rows) {
  const [seen, setSeen] = useState(() => new Map())
  useEffect(() => {
    if (!on || !scroller) return undefined
    const all = [...scroller.querySelectorAll('.wl-vault-row.is-landing:not(.is-seen)')]
    const mark = (els) => setSeen((m) => {
      const next = new Map(m)
      let i = 0
      for (const el of els) if (!next.has(el.dataset.key)) next.set(el.dataset.key, (m.size ? 260 : 700) + (i++) * 260)
      return next
    })
    if (typeof IntersectionObserver === 'undefined') { mark(all); return undefined }
    const foot = scroller.querySelector(':scope > .wl-foot')
    const io = new IntersectionObserver((entries) => {
      const came = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      came.forEach((e) => io.unobserve(e.target))
      if (came.length) mark(came.map((e) => e.target))
    }, { root: scroller, rootMargin: `0px 0px -${foot ? foot.offsetHeight : 0}px 0px`, threshold: 0.6 })
    all.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [on, scroller, rows])
  return seen
}


// ── the night ───────────────────────────────────────────────────────────────
// The list is read again once the night it was counting to has come (the
// server opens the pairs on the first read after it), a beat after its
// moment, for a sheet that is up across it. The moment is held apart from the
// count on the glass: the count rolls over to next week on the tick after the
// reveal, and a timer keyed on it was put out by that tick every time. Asked
// each second, so a tab that slept through the night hears it as it wakes.
function useNight(onNight) {
  const night = useRef(onNight)
  night.current = onNight
  useEffect(() => {
    let due = nextReveal()
    const t = setInterval(() => {
      const at = Date.now()
      if (at < due + 2500) return
      due = nextReveal(at)
      if (night.current) night.current()
    }, 1000)
    return () => clearInterval(t)
  }, [])
}

// ── the reveal, in one line ─────────────────────────────────────────────────
// The frame's title strip is the countdown now: the sealed envelope, how long
// until the night, and when the night is, on the one line the strip already
// had. It was a band of its own under the strip, with the time in large
// figures and the week as seven cells, Sunday to Saturday, and the owner read
// the cells as a second thing to understand and the band as room the notes
// needed. There is one thing to know about the week, which is when it ends,
// and a line says it: `reveals in 3d 14h`, and on the last day the phone's
// clock with its seconds, `reveals in 05:12:09`, so the night is felt coming
// without being chased.
//
// After a reveal this person had a note in, and until they have seen it
// (`fresh`), the strip tells the night instead, lit rose: the reveal is in,
// and what it said.
const DAY_MS = 86400000
const WEEK = 7 * DAY
// how close to a reveal a note's end or a mutual's telling is counted as that reveal's
const NEAR_MS = 2 * 3600000
const two = (n) => String(n).padStart(2, '0')
// The clock the strip and both looks' headers read: the night it counts to,
// and how far off it is, ticking each second only on the last day, since
// the seconds are only on the glass then and a minute is as fine as the
// line reads before that.
function useRevealClock() {
  const [now, setNow] = useState(() => Date.now())
  const next = nextReveal(now)
  const soon = next - now < DAY_MS
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), soon ? 1000 : 30000)
    return () => clearInterval(t)
  }, [soon])
  const c = countdown(next, now)
  const words = c.d ? `${c.d} ${c.d === 1 ? 'day' : 'days'} and ${c.h} ${c.h === 1 ? 'hour' : 'hours'}` : `${c.h} hours and ${c.m} minutes`
  return { now, soon, c, words }
}
const saidOf = (told) => (told.mutual ? (told.mutual === 1 ? 'it’s mutual' : `${told.mutual} are mutual`) : 'not this time')

function RevealStrip({ fresh, told, onInfo }) {
  const { now, soon, c, words } = useRevealClock()
  const tell = fresh && told.total > 0
  const left = c.d ? `${c.d}d ${c.h}h` : `${two(c.h)}:${two(c.m)}:${two(c.s)}`
  const said = saidOf(told)
  return (
    <div className={`wl-vault-bar${tell ? ' is-told' : ''}${tell && !told.mutual ? ' is-none' : ''}${soon && !tell ? ' is-soon' : ''}`}>
      <span className="wl-vault-title" id="wl-vault-h" tabIndex={-1}>
        <Seal />
        {tell ? (
          <span className="wl-vault-now"><span className="wl-sr">the reveal is in: </span><b>{said}</b></span>
        ) : (
          <span className="wl-vault-now">
            <span aria-hidden="true">reveals in <b>{left}</b></span>
            <span className="wl-sr">your private notes. the reveal is saturday at 9pm pacific, in {words}.</span>
          </span>
        )}
      </span>
      <span className="wl-vault-when" aria-hidden="true">{tell ? `sat ${revealStamp(lastReveal(now))}` : 'sat · 9pm pt'}</span>
      <button type="button" className="wl-vault-info" onClick={onInfo} aria-label="how the weekly reveal works">
        <span aria-hidden="true">i</span>
      </button>
    </div>
  )
}

// ── the count, in large figures ─────────────────────────────────────────────
// Both looks set it as the thing on the card, the figures large and the
// units a step down beside them, `2d 14h 06m`, so it reads as a length of
// time and never as a time of day; on the last day the phone's clock with
// its seconds, `05:12:09`.
function Figures({ c }) {
  if (!c.d) return <>{two(c.h)}:{two(c.m)}:{two(c.s)}</>
  return <>{c.d}<small>d</small> {c.h}<small>h</small> {two(c.m)}<small>m</small></>
}
// what happens on the night, once, where the count is: the mechanic said
// flat (VOICE.md 2, say what it does), and the one thing a person new to
// the card needs to read it by
const HOW = 'sealed until then. if they send you one too, you both find out.'

// ── the reveal, opened by a press ───────────────────────────────────────────
// In both looks the night is the person's to open (the owner, 2 October: a
// press to reveal, and one reveal however many notes were in it). The panel
// the count stands in has three faces:
//
//   count     all week: when the night is, in large figures, and the one
//             line of what it does
//   waiting   from the night until a press: `the reveal is in`, how many of
//             this person's notes were in it, and a sealed envelope, and
//             nothing on the card that says what it said. The panel is the
//             press, and so is the foot's lit key, which says `open the
//             reveal` until it has been
//   told      after it: what the night said, in one place, where the strip,
//             the notice and the slot each told a part of it. `it's mutual.`
//             in rose, or `not this time.` with who did not send one, that
//             they will never know, and what came back; `open the next` when
//             a second mutual is still to be watched, `send again` and
//             `share celestual` when none was mutual. The count to the next
//             night under it, small
//
// The press opens the envelope (its flap up, 240ms) and then the night: a
// mutual's telling straight from the panel, the film as it is (Film.jsx),
// with nothing to press a second time; and a night with none in it is told
// where it stands, the panel turning to it and the rows under it landing a
// beat apart, as they did on the night (`useSeen`).
const OPENED = [
  '.......X.......',
  '.....XX.XX.....',
  '...XX.....XX...',
  '.XX.........XX.',
  'XXXXXXXXXXXXXXX',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'X.............X',
  'XXXXXXXXXXXXXXX',
]
const cellsD = (rows, dy = 0) => rows.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y + dy}h1v1h-1z` : ''))).join('')
const SEALED_D = cellsD(SEAL, OPENED.length - SEAL.length)
const OPENED_D = cellsD(OPENED)
function Envelope({ open = false, scale = 4, className = '' }) {
  return (
    <svg
      className={`wl-pxi wl-env${open ? ' is-open' : ''} ${className}`} viewBox={`0 0 15 ${OPENED.length}`}
      width={15 * scale} height={OPENED.length * scale}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"
    >
      <path d={open ? OPENED_D : SEALED_D} />
    </svg>
  )
}

// what the night said, for either look's panel to set in its own type
// (`cls`, its big words and its lines): the title, who and what came back,
// and the keys that act on it. After a key it says what happened in the
// lines' place, the way the notice did (Night.jsx `NightCard`)
function Told({ cls, told, night, more, onNext, onAgain }) {
  const [said, setSaid] = useState(null)
  const [busy, setBusy] = useState(false)
  const one = night.notes.length === 1 ? night.notes[0] : null
  const tag = one ? backTag(one) : backTotalTag(night)
  const note = one ? backNote(one) : backTotalNote(night)
  const lines = told.mutual
    ? (night.notes.length ? [`not this time for ${whoWords(night.notes)}.`] : [])
    : [`${whoWords(night.notes)} didn’t send you one.`, 'they’ll never know you did.']
  const again = async () => {
    setBusy(true)
    const out = await onAgain(one)
    setBusy(false)
    if (!out) return
    setSaid(out.said ? ['not sent.', out.said] : ['sent again.', `it runs to ${endsWords(out.ends)}.`])
  }
  const share = () => shareCelestual().then((r) => { if (SHARED_SAYS[r]) setSaid([SHARED_SAYS[r], '']) })
  return (
    <>
      <p className={`${cls}-big wl-told-big`}>{said ? said[0] : told.mutual ? `${saidOf(told)}.` : 'not this time.'}</p>
      {said ? (said[1] ? <p className={`${cls}-line`}>{said[1]}</p> : null) : (
        <>
          {lines.map((l) => <p key={l} className={`${cls}-line`}>{l}</p>)}
          {tag ? <Tag chrome>{tag}</Tag> : note ? <p className={`${cls}-line`}>{note}</p> : null}
        </>
      )}
      {said ? null : (
        <div className="wl-told-keys">
          {more ? <button type="button" className="wl-told-key is-lit" onClick={onNext}>open the next</button> : null}
          {!told.mutual && one && one.state === 'lapsed' ? (
            <button type="button" className="wl-told-key" disabled={busy} onClick={again} aria-label={`send your note to ${atHandle(one.to)} again, for next saturday`}>send again</button>
          ) : null}
          {!told.mutual ? (
            <button type="button" className="wl-told-key" disabled={busy} onClick={share} aria-label="share celestual. the link says nothing about you or your notes">share celestual</button>
          ) : null}
        </div>
      )}
    </>
  )
}
const nextWords = (c) => `next reveal in ${c.d ? `${c.d}d ${c.h}h` : `${two(c.h)}:${two(c.m)}:${two(c.s)}`}`
// the press, as a key is pressed: Enter or the space bar on the panel
const pressKeys = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }

// ── the quiet look's (?profile=1) ──
// An unlit panel of its own over the notes, where the strip was the head of
// their frame: what it is (`next reveal`, with the sealed envelope) and when
// on one line with the `i` at its end, the count under it in large figures,
// and what the night does. Waiting, the panel's bezel is lit and the
// envelope stands large at its right; told, the night's words in the
// figures' place, rose for a mutual.
function RevealPanel({ phase, n, told, night, more, opening, panelRef, onReveal, onNext, onAgain, onInfo }) {
  const { now, soon, c, words } = useRevealClock()
  if (phase === 'waiting') {
    return (
      <div
        className={`wl-rv is-waiting${opening ? ' is-opening' : ''}`} ref={panelRef} role="button" tabIndex={0}
        onClick={onReveal} onKeyDown={pressKeys(onReveal)}
        aria-label={`the reveal is in. ${n === 1 ? 'one of your notes was' : `${n} of your notes were`} in it. open the reveal`}
      >
        <div className="wl-rv-top">
          <span className="wl-rv-label" id="wl-vault-h" tabIndex={-1}><Seal scale={1} /><span>the reveal is in</span></span>
          <span className="wl-rv-when" aria-hidden="true">sat {revealStamp(lastReveal(now))}</span>
        </div>
        <p className="wl-rv-big" aria-hidden="true">{n}<small>{n === 1 ? ' note' : ' notes'}</small></p>
        <p className="wl-rv-line" aria-hidden="true">sealed until you open {n === 1 ? 'it' : 'them'}.</p>
        <Envelope open={opening} className="wl-rv-env" />
      </div>
    )
  }
  const tell = phase === 'told'
  return (
    <div className={`wl-rv${tell ? ' is-told' : ''}${tell && !told.mutual ? ' is-none' : ''}${soon && !tell ? ' is-soon' : ''}`} ref={panelRef}>
      <div className="wl-rv-top">
        <span className="wl-rv-label" id="wl-vault-h" tabIndex={-1}>
          <Seal scale={1} />
          <span aria-hidden="true">{tell ? 'the reveal' : 'next reveal'}</span>
          <span className="wl-sr">{tell ? `your private notes. the reveal: ${saidOf(told)}` : `your private notes. the reveal is saturday at 9pm pacific, in ${words}.`}</span>
        </span>
        <span className="wl-rv-when" aria-hidden="true">{tell ? `sat ${revealStamp(lastReveal(now))}` : 'sat · 9pm pt'}</span>
        <button type="button" className="wl-vault-info" onClick={onInfo} aria-label="how the weekly reveal works">
          <span aria-hidden="true">i</span>
        </button>
      </div>
      {tell ? (
        <div className="wl-rv-told" aria-live="polite">
          <Told cls="wl-rv" told={told} night={night} more={more} onNext={onNext} onAgain={onAgain} />
          <p className="wl-rv-next">{nextWords(c)}</p>
        </div>
      ) : (
        <>
          <p className="wl-rv-big" aria-hidden="true"><Figures c={c} /></p>
          <p className="wl-rv-line">{HOW}</p>
        </>
      )}
    </div>
  )
}

// ── the handset, the lit look's (?profile=2) ──
// A screen at the head of the card, drawn as the slots are (Slot.jsx): the
// band over the panel in the screen's own properties (looks.js `skinVars`),
// the night glass, or the rose letter once a reveal with a mutual in it is
// told. It is about whatever the soft keys under it have chosen: over the
// notes the count to the night, as the phone's clock; over the letters how
// many of this person's are up. It comes on where it stands the way the
// letter's phone does (DESIGN.md 6.3, the power on), once, as the card
// opens; a press on a soft key changes what is on the glass, in the two
// steps an LCD takes to draw, and not the glass. Waiting, it is a phone with
// a message on it: the envelope by the aerial on its band, the sealed one
// large on its glass, and the glass itself the press, `open` on its key.
const glassOf = (c) => Object.fromEntries(Object.entries(skinVars(c)).filter(([k]) => k.startsWith('--s-')))
const NIGHT_GLASS = glassOf('night')
const ROSE_GLASS = glassOf('rose')
function Handset({ tab, turned, phase, n, told, night, more, opening, panelRef, up, hearts, onReveal, onNext, onAgain, onInfo }) {
  const { now, soon, c, words } = useRevealClock()
  const notes = tab === 'notes'
  const waiting = notes && phase === 'waiting'
  const tell = notes && phase === 'told'
  const rose = tell && told.mutual > 0
  const press = waiting ? { role: 'button', tabIndex: 0, onClick: onReveal, onKeyDown: pressKeys(onReveal), 'aria-label': `the reveal is in. ${n === 1 ? 'one of your notes was' : `${n} of your notes were`} in it. open the reveal` } : {}
  return (
    <div
      className={`wl-hand${rose ? ' is-rose' : ''}${waiting ? ' is-waiting' : ''}${opening ? ' is-opening' : ''}${soon && phase === 'count' && notes ? ' is-soon' : ''}`}
      style={rose ? ROSE_GLASS : NIGHT_GLASS} ref={notes ? panelRef : undefined} {...press}
    >
      <div className="wl-hand-band" aria-hidden="true">
        <Aerial state={tell ? (rose ? 'full' : 'none') : notes ? 'seek' : 'kept'} scale={1} />
        {waiting ? <PixIcon name="env" scale={1} className="wl-hand-mail" /> : null}
        <span className="wl-hand-at">{notes ? 'private notes' : 'letters'}</span>
        <span className="wl-hand-when">
          {notes ? (phase === 'count' ? 'sat · 9pm pt' : `sat ${revealStamp(lastReveal(now))}`) : hearts ? <><Heart size={11} on /> {hearts}</> : null}
        </span>
      </div>
      <div className={`wl-hand-panel${turned ? ' is-turned' : ''}`} key={`${tab}:${phase}`}>
        {waiting ? (
          <>
            <span className="wl-hand-label" id="wl-vault-h" tabIndex={-1}>the reveal is in</span>
            <span className="wl-hand-big" aria-hidden="true">{n}<small>{n === 1 ? ' note' : ' notes'}</small></span>
            <span className="wl-hand-line" aria-hidden="true">sealed until you open {n === 1 ? 'it' : 'them'}.</span>
            <Envelope open={opening} className="wl-hand-env" />
            <span className="wl-hand-key" aria-hidden="true">open</span>
          </>
        ) : tell ? (
          <>
            <span className="wl-hand-label" id="wl-vault-h" tabIndex={-1}>
              <span aria-hidden="true">the reveal</span>
              <span className="wl-sr">your private notes. the reveal: {saidOf(told)}</span>
            </span>
            <div className="wl-hand-told" aria-live="polite">
              <Told cls="wl-hand" told={told} night={night} more={more} onNext={onNext} onAgain={onAgain} />
            </div>
            <span className="wl-hand-next">{nextWords(c)}</span>
            <button type="button" className="wl-hand-info" onClick={onInfo} aria-label="how the weekly reveal works">
              <span aria-hidden="true">i</span>
            </button>
          </>
        ) : notes ? (
          <>
            <span className="wl-hand-label" id="wl-vault-h" tabIndex={-1}>
              <span aria-hidden="true">reveals in</span>
              <span className="wl-sr">your private notes. the reveal is saturday at 9pm pacific, in {words}.</span>
            </span>
            <span className="wl-hand-big" aria-hidden="true"><Figures c={c} /></span>
            <span className="wl-hand-line">{HOW}</span>
            <button type="button" className="wl-hand-info" onClick={onInfo} aria-label="how the weekly reveal works">
              <span aria-hidden="true">i</span>
            </button>
          </>
        ) : (
          <>
            <span className="wl-hand-label">on the wall</span>
            <span className="wl-hand-big">{up}<small>{up === 1 ? ' letter' : ' letters'}</small></span>
            <span className="wl-hand-line">anonymous. nothing on a letter points back to you.</span>
          </>
        )}
        <span className="wl-hand-dots" aria-hidden="true" />
      </div>
      <span className="wl-hand-veil" aria-hidden="true" />
    </div>
  )
}

// ── the week's pings ────────────────────────────────────────────────────────
// At the frame's foot, under the notes they are for, where the slots stood:
// one cell for the week's free ping, lit while it is still to spend, one
// beside it in a week a night that was not mutual gave its free ping back
// (the extra, 0075), and one for each ping bought, lit, since a bought one
// waits until it is used (docs/PINGS-BY-THE-WEEK.md). The words say the same
// for a person who does not read cells (pings.js `freeWords`: `free ping and
// 1 extra this week`), and `add more pings` is the way to the paywall when
// it is wanted rather than when a note meets it.
//
// It is there only once the week has none left to spend (pings.js
// `shapeAllowance`, `left`), the same test on which the composer raises the
// paywall in place of its send, and never while the week is not known. It
// used to stand at the foot whatever the week held, a key to buy more beside
// a free ping still unspent, and the owner asked that it wait until the
// week's pings are spent.
const SHOW_BOUGHT = 9
function Week({ a, onMore }) {
  const bought = a ? a.credits : 0
  // the free one, and the extra beside it; lit while still to spend
  const frees = 1 + (a && a.extra ? 1 : 0)
  const lit = a ? Math.min(a.freeLeft, frees) : 1
  const spent = !!a && a.left <= 0
  return (
    <div className="wl-vault-week">
      <span className="wl-vault-pings">
        <span className="wl-slots-cells" aria-hidden="true">
          {Array.from({ length: frees }, (_, i) => <i key={`f${i}`} className={i < lit ? 'is-lit' : ''} />)}
          {Array.from({ length: Math.min(bought, SHOW_BOUGHT) }, (_, i) => <i key={i} className="is-lit is-bought" />)}
        </span>
        <span className="wl-vault-pings-say">
          <span>{freeWords(a)}</span>
          {bought ? <span className="is-dim">{bought === 1 ? '1 bought, waiting' : `${bought} bought, waiting`}</span> : null}
        </span>
      </span>
      {spent ? <button type="button" className="wl-vault-more" onClick={onMore}>add more pings</button> : null}
    </div>
  )
}

// ── the letters this person put up ──────────────────────────────────────────
// A list, one row per letter: the face and the name it was written to, how
// long ago, and how many hearted it, and the row opens the letter. It used
// to be a row of chips, one per name, which was a record that opened
// nothing and said nothing about how any of it was received. Four rows,
// and past four the list fades under a line that opens the rest.
//
// The rows are the server's (wall_mine): this identity's letters of the last
// thirty days, with the heart count on each (0056). When the server has not
// answered, or answers nothing, the names this browser remembers writing to
// stand in, without counts, since those are the only fact left. The tab's
// count reads the same rows as the list, so the two never disagree.
const SHOWN = 4

// A letter that came down is listed until it has been seen once, here or
// in the notice at the foot of the wall, and then it is gone from both
// (store.js `noticed`): the owner asked for it, and a list that carries a
// takedown for thirty days is a list that keeps saying so.
//
// A letter its writer took back themselves (`down_by` 'writer', 0074, the
// owner's ruling of 29 September) is not "taken down", which is somebody
// else's hand: it says `you took it back`, greyed as a letter off the wall
// is, and goes from the list the same way once it has been seen. A letter
// that is up opens on its own glass, where `take it back` is the second
// row of its options, so the list carries no key of its own for it.
//
// But one taken back is not on any glass any more, and the server keeps
// the way back open for a day after (0074 `undo_until`, api.js `mine`).
// The sheet it was taken back on and the wall's card after a post both
// offer `undo`, and both are gone the moment they are left; this list is
// the one place that outlasts them, and Letter.jsx and Wall.jsx both say
// so. So while that day runs the row carries `undo` beside it, a sibling
// of the row as a note's `edit` is (Slot.jsx `EditKey`), and it stays on
// the list for the whole of the day however often it has been seen: a
// row that went after one look would take the only way back with it.
// Once the day is over it is a row that has been seen like any other.
const isDown = (l) => !!l.downBy && l.downBy !== 'held'
const undoOpen = (l) => l.downBy === 'writer' && (l.undoUntil || 0) > Date.now()
function wroteRows() {
  const own = mine()
  const read = getState().noticed || {}
  return own && own.length
    ? own.filter((l) => undoOpen(l) || !(isDown(l) && read[l.id])).map((l) => ({
      id: l.id, to: l.to, at: l.at, hearts: l.hearts || 0,
      held: l.downBy === 'held', down: !!l.downBy && l.downBy !== 'held', live: !l.downBy,
      took: l.downBy === 'writer', undo: undoOpen(l),
    }))
    : (getState().wroteTo || []).map((h) => ({ id: '', to: h, at: 0, hearts: null, held: false, down: false, live: true, took: false, undo: false }))
}

// A letter held to be read before it goes up (wall_mine's `down_by: 'held'`,
// a pending row) is not down, and was drawn greyed as "taken down" while it
// was still being read. It is "being read" now, in the wall's own words for
// it, and not opened, since it is not on the wall yet to open.
function Wrote({ go, rows }) {
  const [more, setMore] = useState(false)
  const cut = !more && rows.length > SHOWN
  const shown = cut ? rows.slice(0, SHOWN) : rows
  // the ones that came down and were drawn on the list while it was open
  // are read once it is left: the tab changed, or the sheet shut. One still
  // behind "see more" was not seen, and stays until it is
  const shownDown = useRef(new Set())
  useEffect(() => { shown.forEach((r) => { if (r.down && r.id) shownDown.current.add(r.id) }) })
  useEffect(() => () => {
    if (!shownDown.current.size) return
    patch({ noticed: { ...(getState().noticed || {}), ...Object.fromEntries([...shownDown.current].map((id) => [id, true])) } })
  }, [])
  // what an `undo` pressed on this list is doing, by the letter's id: out
  // (`busy`), refused (`said`, in the row's own small words), or refused
  // for good (`done`, the day is over), when the key goes. A letter that
  // came back is read again by `unwithdraw` (data.js), and the list is
  // drawn from that read, as a row that is up or being read
  const [back, setBack] = useState({})
  if (!rows.length) return <p className="wl-profile-none">no letters yet</p>
  const open = (r) => {
    if (!r.live) return
    go('letter', r.id || r.to)
  }
  const undo = async (r) => {
    if (back[r.id]?.busy) return
    setBack((m) => ({ ...m, [r.id]: { busy: true } }))
    const out = await unwithdraw(r.id, r.to)
    if (out?.ok) { setBack((m) => { const n = { ...m }; delete n[r.id]; return n }); return }
    const over = out?.error === 'expired' || out?.error === 'gone'
    setBack((m) => ({ ...m, [r.id]: { said: over ? 'the day to put it back is over' : 'it did not come back. try again', done: over } }))
  }
  const said = (r) => {
    const b = r.undo ? back[r.id] : null
    if (b?.busy) return 'putting it back'
    if (b?.said) return b.said
    return r.held ? 'being read' : r.took ? 'you took it back' : r.down ? 'taken down' : r.at ? sinceline(r.at).lead : 'on the wall'
  }
  const line = (r, i) => (
    <button
      type="button" key={r.undo ? undefined : r.id || `${r.to}-${i}`}
      className={`wl-wrote-row${r.down ? ' is-down' : ''}`}
      onClick={() => open(r)} disabled={!r.live}
      aria-label={`your letter to ${labelFor(r.to)}${r.hearts ? `, ${r.hearts === 1 ? 'one heart' : `${r.hearts} hearts`}` : ''}${r.held ? ', being read' : r.took ? ', you took it back' : r.down ? ', taken down' : ''}`}
    >
      <Face handle={r.to} size={30} />
      <span className="wl-wrote-who">
        <span className="wl-wrote-name">{labelFor(r.to)}</span>
        <span className="wl-wrote-meta" aria-live={r.undo ? 'polite' : undefined}>{said(r)}</span>
      </span>
      {r.hearts !== null && r.live ? (
        <span className="wl-wrote-n" aria-hidden="true">
          <Heart size={13} on={r.hearts > 0} />
          <span>{r.hearts || ''}</span>
        </span>
      ) : null}
    </button>
  )
  return (
    <>
      <div className={`wl-wrote${cut ? ' is-cut' : ''}`}>
        {shown.map((r, i) => (r.undo ? (
          <div key={r.id} className="wl-wrote-line">
            {line(r, i)}
            {back[r.id]?.done || back[r.id]?.busy ? null : (
              <button
                type="button" className="wl-vault-edit wl-wrote-undo" onClick={() => undo(r)}
                aria-label={`undo: put your letter to ${labelFor(r.to)} back where it was`}
              >
                <span aria-hidden="true">undo</span>
              </button>
            )}
          </div>
        ) : line(r, i)))}
      </div>
      {cut ? (
        <button type="button" className="wl-quiet wl-wrote-more" onClick={() => setMore(true)}>
          see more
        </button>
      ) : null}
    </>
  )
}

// ── a note's own screen ─────────────────────────────────────────────────────
// A note, opened: the screen it was placed on, lit in the colour its name
// picks, with the line on it, the day it was placed by the battery as a
// letter that is up carries its day (screen.jsx `stamp`), and the face its
// writer left it on (0073): the line across its top, and the battery where
// they set it. A note from before has neither, and says `dear` and the name
// over a battery running down with its week, the way the phone's did. Its
// left key is the phone's own options, and what can be done to a note is the
// menu's rows:
//
//   running      keep it for next week, change the words, let it go
//   not this     send it again, send it with new words, share celestual,
//   time         read your note, let it go
//
// Keeping it spends next week's ping (0071) and undoes nothing; it runs a
// week further, once ahead, and a mutual is still told on the night it is
// found, the kept ping coming back. Changing the words opens the note's
// sheet on them (screens/Ping.jsx `editNote`), and they change until the
// reveal. Sending it again spends a ping, like any note going out, with the
// words it had or new ones. Letting it go asks once, on the screen, in the
// words the product always asks it in, and gives back what the note still
// holds for a night to come.
//
// ── and one that was not this time ──────────────────────────────────────────
// It opens on what its night said (Night.jsx `NightReport`, the owner's
// request of 29 September, made short and plain on the 30th): `not this
// time.`, that they didn't send you one and will never know you did, and
// what came back of the ping it spent (0075), the note's own line across
// the top and the night's date by the battery. The
// phone is in the night's colour, lit, so it reads; `read your note` on its
// menu turns it to the words, dimmed as a phone dims a message that is done,
// with `back` to the report. The same screen answers /reveal/<handle> for a
// note that was not this time (screens/Reveal.jsx), which is why it is
// exported, as `NoteScreen`.
//
// The screen can be up across a reveal, and is read again at its moment as
// the card is (`useNight`): a note that was not this time turns into one on
// the glass, and one that went mutual leaves for the card, where the night
// is told. A key pressed on the stale screen is answered the same way.
function batOf(expires) {
  return Math.max(0, Math.min(4, Math.ceil((expires - Date.now()) / (WEEK / 4))))
}

const AGAIN_SAYS = {
  week_full: 'ten notes in one week is the most. the next week starts after saturday’s reveal.',
  rate_limited: 'that is a lot of notes for now. try again later.',
  suppressed: 'this @ has asked not to be sent notes.',
}
// what a keep or a send again that could not be paid for answers with: the
// paywall, the note waiting behind it (pings.js `waitForPings`)
const NO_PINGS = new Set(['no_pings', 'no_slots', 'cap'])

export function NoteScreen({ p, me, go, onBack, onChange }) {
  // face · menu · ask · kept · sent · shared, where the face is the note's
  // words (`line`) or, for one that was not this time, its night (`told`)
  const [mode, setMode] = useState('face')
  const [face, setFace] = useState(p.state === 'lapsed' ? 'told' : 'line')
  const [at, setAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [shared, setShared] = useState('')
  const [expires, setExpires] = useState(p.expires)
  const [gone, setGone] = useState(p.state === 'lapsed')
  // a note opened out of the list powers on like the letter and the
  // composer do (screen.jsx `useWake`), and under reduced motion lands lit
  const power = useWake(prefersReducedMotion(), POWER_MS)
  // the night came while the screen was up: it turns to what the night said
  useEffect(() => { if (p.state === 'lapsed') { setGone(true); setFace('told') } }, [p.state])
  useNight(onChange)
  const prof = useProfile(p.to)
  const first = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  const ahead = !gone && keptAhead({ ...p, state: 'standing', expires })

  const keep = async () => {
    setBusy(true)
    const out = await renew({ me, them: p.to })
    setBusy(false)
    setMode('face')
    if (!out.ok) {
      // its reveal came while the screen was up: not this time, or mutual
      // (or let go elsewhere), which the list read again says
      if (out.error === 'lapsed') { setGone(true); setFace('told'); onChange(); return }
      if (out.error === 'none') { onChange(); onBack(); return }
      // next week's ping is spent, and none are bought: the paywall
      if (NO_PINGS.has(out.error)) { waitForPings({ kind: 'keep', to: p.to }); go('pings'); return }
      if (AGAIN_SAYS[out.error]) { setSaid(AGAIN_SAYS[out.error]); return }
      setSaid('it did not go through. try again.')
      return
    }
    setExpires(out.expires || nextReveal(nextReveal()))
    setMode('kept')
    onChange()
  }
  const again = async () => {
    setBusy(true)
    const out = await sendAgain({ me, them: p.to })
    setBusy(false)
    if (!out.ok && NO_PINGS.has(out.error)) { waitForPings({ kind: 'again', to: p.to }); go('pings'); return }
    if (!out.ok) { setSaid(AGAIN_SAYS[out.error] || 'it did not go through. try again.'); setMode('face'); return }
    setExpires(Date.parse(out.expires_at || 0) || nextReveal())
    setGone(false)
    setFace('line')
    setMode('sent')
    onChange()
  }
  const drop = async () => {
    setBusy(true)
    const out = await release({ me, them: p.to })
    setBusy(false)
    // one that went mutual as it was let go is not let go (0069): the card
    // tells it
    if (!out.ok && out.error !== 'mutual') { setSaid('it did not go through. try again.'); setMode('face'); return }
    onChange()
    onBack()
  }
  // Celestual, passed on: the link to how it works, nobody named (Night.jsx).
  // Asked for inside the press, so the phone's share sheet can open; what it
  // says after, if anything, stands on the glass until `ok`
  const share = () => {
    setMode('face')
    shareCelestual().then((r) => {
      if (!SHARED_SAYS[r]) return
      setShared(SHARED_SAYS[r])
      setMode('shared')
    })
  }

  const items = gone ? [
    { t: 'send it again', run: again },
    { t: 'send it with new words', run: () => editNote(go, p.to, p.line, p) },
    { t: 'share celestual', run: share },
    ...(face === 'told' ? [{ t: 'read your note', run: () => { setFace('line'); setMode('face') } }] : []),
    { t: 'let it go', run: () => setMode('ask') },
  ] : [
    ...(ahead ? [] : [{ t: 'keep it for next week', run: keep }]),
    { t: 'change the words', run: () => editNote(go, p.to, p.line, p) },
    { t: 'let it go', run: () => setMode('ask') },
  ]
  const sel = Math.min(at, items.length - 1)
  const pick = (j) => { const it = items[j]; if (it) { setSaid(''); it.run() } }
  const toFace = () => setMode('face')

  // the day it was placed by the battery, as a letter that is up carries
  // its own, and the same row under the menu so nothing moves when it opens.
  // The battery is the one its writer left it on (0073), which is the one
  // the other person reads if it is ever mutual; a note from before, which
  // has none, runs down with its week as it always did. And the line across
  // the top is the note's own where its writer set one, whole, with the
  // handle giving the row up to it as on the sheet that set it
  // (screens/Ping.jsx); the menu keeps its own name, `options`. On its
  // night's report the day is the night's, since that is what it tells
  const told = gone && face === 'told'
  const dated = {
    stamp: told ? revealStamp(expires) : stampOf(p.at),
    bat: Number.isInteger(p.bat) ? p.bat : gone ? 0 : batOf(expires),
  }
  let top = {
    ...dated, icon: 'pen',
    ...(p.greet ? { salutation: p.greet } : { name: first || atHandle(p.to), handle: first ? atHandle(p.to) : '', dear: true }),
  }
  let body
  let keys
  if (mode === 'menu') {
    top = { ...dated, name: 'options', pos: `${sel + 1}/${items.length}`, icon: '' }
    body = (
      <ScreenMenu
        items={items.map((x) => x.t)} at={sel} onAt={setAt} onPick={pick} label="options"
        onBack={toFace}
      />
    )
    keys = {
      l: { label: 'select', onClick: () => pick(sel), aria: `select ${items[sel]?.t || ''}` },
      r: { label: 'back', onClick: toFace, aria: 'back to the note' },
    }
  } else if (mode === 'ask') {
    // one that was not this time gave back what it spent at its night
    // (0075), so only a running one has a ping still to give back (the
    // note's settings ask the same)
    body = <ScreenNote title="let it go?">{gone ? '' : 'this gives its ping back. '}they never find out you sent it.</ScreenNote>
    keys = {
      l: { label: 'let it go', onClick: drop, disabled: busy, aria: 'let it go' },
      r: { label: 'keep it', onClick: toFace, aria: 'keep it' },
    }
  } else if (mode === 'kept') {
    body = <ScreenNote glyph="check" title="kept for next week">it runs to {endsWords(expires)}, on next week&rsquo;s ping. if it&rsquo;s mutual sooner, you find out sooner, and that ping comes back.</ScreenNote>
    keys = { l: { label: 'ok', onClick: toFace, aria: 'back to the note' } }
  } else if (mode === 'sent') {
    body = <ScreenNote glyph="check" title="sent again">it runs to {endsWords(expires)}.</ScreenNote>
    keys = { l: { label: 'ok', onClick: toFace, aria: 'back to the note' } }
  } else if (mode === 'shared') {
    body = <ScreenNote glyph="link" title={shared} />
    keys = { l: { label: 'ok', onClick: toFace, aria: 'back to the note' } }
  } else if (told) {
    body = <NightReport p={p} />
    keys = {
      l: {
        label: 'options', onClick: () => { setAt(0); setMode('menu') }, disabled: busy,
        aria: `options: ${items.map((x) => x.t).join(', ')}`,
      },
      r: { label: 'back', onClick: onBack, aria: 'back to your private notes' },
    }
  } else {
    body = p.line
      ? <ScreenText text={p.line} />
      : <ScreenNote>sent without a note.</ScreenNote>
    keys = {
      l: {
        label: 'options', onClick: () => { setAt(0); setMode('menu') }, disabled: busy,
        aria: `options: ${items.map((x) => x.t).join(', ')}`,
      },
      // a note that was not this time goes back to what its night said
      r: gone
        ? { label: 'back', onClick: () => setFace('told'), aria: 'back to what the night said' }
        : { label: 'back', onClick: onBack, aria: 'back to your private notes' },
    }
  }

  // a note that was not this time is on the night's own phone, lit for its
  // report and dimmed for its words, as a phone dims a message that is done
  const dim = gone && face === 'line' && mode === 'face'
  return (
    <div className="wl-you-ping">
      <Screen look={gone ? NIGHT : null} seed={`ping:${p.to}`} top={top} keys={keys} live nameId="wl-you-h" state={dim ? 'dim' : power}>
        {body}
      </Screen>
      <p className="wl-you-floor" aria-live="polite">
        {said || (gone
          ? `not this time · ${endedWords(expires)}`
          : ahead ? `sealed · kept to ${endsWords(expires)}` : `sealed · reveals ${endsWords(expires)}`)}
      </p>
    </div>
  )
}

// ── your @ ───────────────────────────────────────────────────────────────────
// The @ this person has claimed (docs/ONE-WALL.md: Instagram verification is
// ownership), and what owning it is for: an email when somebody writes to
// them, an email when a private note turns out mutual, the address those go
// to, and the way to take the name off the wall for good. Or, with no @
// claimed, the one line on what claiming it gets them and the key to it.
//
// Drawn on the settings page, not the card, as two groups: the @ itself, and
// the email alerts on it, each a panel under its own label, with the way off
// the wall under both as a quiet line, since it is the one act here that
// cannot be taken back and should never be the nearest thing to a thumb.
//
// The switches are the server's (`celestual_alerts_get` / `_set`). A database
// that does not have them yet answers `missing`, and the page then shows the
// @ alone, with nothing to switch: no control on this sheet may promise an
// email that nothing will send.
function YourAt({ handle, rev, go, onProve }) {
  // null while it is asked · the answer · { ok: false, error }
  const [alerts, setAlerts] = useState(null)
  const [saving, setSaving] = useState('')
  const [said, setSaid] = useState('')
  const [mail, setMail] = useState(false)
  const [ask, setAsk] = useState(0)
  // a switch turned on before there was an address to send to, kept until
  // the address is confirmed and then turned on for real
  const waiting = useRef(null)

  useEffect(() => {
    let on = true
    alertsGet().then((a) => { if (on) setAlerts(a || { ok: false, error: 'network' }) })
    return () => { on = false }
  }, [rev, ask])

  const link = useAlertLink({
    onConfirmed: async () => {
      const want = waiting.current
      waiting.current = null
      if (want) await alertsSet(want.wrote, want.mutual)
      const a = await alertsGet()
      setAlerts(a || { ok: false, error: 'network' })
      setMail(false)
      setSaid('')
      link.reset()
    },
  })

  const ok = !!alerts?.ok
  const claimed = ok ? (alerts.claimed ? normHandle(alerts.handle || handle) : '') : handle
  const hasMail = ok && !!alerts.email_verified

  const flip = async (key, value) => {
    if (!ok || saving) return
    const next = { wrote: !!alerts.wrote, mutual: !!alerts.mutual, [key]: value }
    setSaid('')
    if (value && !hasMail) {
      waiting.current = next
      setMail(true)
      setSaid('add an email first. it turns on once the address is confirmed.')
      return
    }
    const was = alerts
    setAlerts({ ...alerts, [key]: value })
    setSaving(key)
    const out = await alertsSet(next.wrote, next.mutual)
    setSaving('')
    if (out?.ok) return
    setAlerts(was)
    if (out?.error === 'email') { waiting.current = next; setMail(true); setSaid('add an email first. it turns on once the address is confirmed.'); return }
    if (out?.error === 'claim') { setSaid('confirm your Instagram again to turn this on.'); return }
    setSaid('that did not save. try again.')
  }

  if (!claimed) {
    return (
      <section className="wl-set-group" aria-labelledby="wl-set-at">
        <Label tone="dim" className="wl-set-h"><span id="wl-set-at">your @</span></Label>
        <div className="wl-set-panel">
          <div className="wl-you-ask">
            <p className="wl-you-say">
              confirm your Instagram to get an email when someone writes to you, and to remove letters about you in one tap.
            </p>
            <Pill tone="ghost" icon={<Provider size={15} />} onClick={onProve}>confirm your Instagram</Pill>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="wl-set-group" aria-labelledby="wl-set-at">
        <Label tone="dim" className="wl-set-h"><span id="wl-set-at">your @</span></Label>
        <div className="wl-set-panel wl-owner-me">
          <Face handle={claimed} size={30} />
          <span className="wl-wrote-who">
            <span className="wl-wrote-name">{atHandle(claimed)}</span>
            <span className="wl-wrote-meta">confirmed with Instagram</span>
          </span>
        </div>
      </section>

      {alerts === null || ok || alerts.error !== 'missing' ? (
        <section className="wl-set-group" aria-labelledby="wl-set-mail">
          <Label tone="dim" className="wl-set-h"><span id="wl-set-mail">email alerts</span></Label>
          <div className="wl-set-panel">
            {alerts === null ? (
              <p className="wl-profile-none wl-you-wait" aria-label="reading your alerts"><Wait /></p>
            ) : ok ? (
              <div className="wl-owner-alerts">
                <Switch on={!!alerts.wrote} busy={saving === 'wrote'} onChange={(v) => flip('wrote', v)}>
                  email me when someone writes to me
                </Switch>
                <Switch on={!!alerts.mutual} busy={saving === 'mutual'} onChange={(v) => flip('mutual', v)}>
                  email me when it&rsquo;s mutual
                </Switch>
                <p className="wl-owner-to">
                  {hasMail
                    ? <>emails go to <span className="wl-h">{alerts.email}</span></>
                    : 'no email address yet'}
                  {!mail ? (
                    <button type="button" className="wl-quiet" onClick={() => { setMail(true); setSaid('') }}>
                      {hasMail ? 'change' : 'add one'}
                    </button>
                  ) : null}
                </p>
                {said ? <p className="wl-owner-said" aria-live="polite">{said}</p> : null}
                {mail ? (
                  <div className="wl-owner-change">
                    <AlertEmail link={link} compact autoFocus />
                    {!link.sent ? (
                      <button type="button" className="wl-quiet" onClick={() => { setMail(false); waiting.current = null; setSaid('') }}>cancel</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="wl-you-ask">
                <p className="wl-you-say">your email alerts did not load.</p>
                <button type="button" className="wl-quiet" onClick={() => { setAlerts(null); setAsk((n) => n + 1) }}>try again</button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <button type="button" className="wl-quiet wl-owner-off" onClick={() => go('remove', claimed)}>
        take my name off the wall for good
      </button>
    </>
  )
}

// What a draft of the composer's is addressed to, as a key: the handle, or
// the tilde key of the name as written, or nothing yet.
function draftKey(d) {
  if (d.kind === 'name') { const n = cleanName(d.name); return n ? nameKey(n) : '' }
  return normHandle(d.to)
}

// ── a reveal opened, in the looks ───────────────────────────────────────────
// Once the reveal has been opened by a press (`Reveal`), the night it was
// and whether its rows have landed yet. Held here rather than on the card,
// since a press with a mutual in it leaves for that mutual's telling, and
// the card it closes back onto is a new one, which tells the night in the
// panel where the waiting stood and lands the rest. Put down when the card
// is shut any other way, so the next visit opens on the count.
let TOLD = null

export default function You({ go, up, upLabel = 'back to the wall', onOut = null }) {
  const who = member()
  const reads = isReader()
  const handle = myHandle()
  const known = !!(who || reads || handle)
  const [held] = useState(() => { const r = loadPending(); return r && r.use === 'you' ? r : null })
  // come from the nudge: the DM first, and the email asked about after it
  // (`openForAlerts`). Read without spending it, since a development mount
  // runs this twice, and spent once the sheet is up.
  const [want] = useState(() => !!(held && held.alerts) || FOR_ALERTS)
  useEffect(() => { FOR_ALERTS = false }, [])
  // null · 'prove' · 'settings' · the key of the note whose screen is up
  const [view, setView] = useState(() => (held || want ? 'prove' : null))
  // 'notes' · 'letters', the two tabs under the person. A reveal waiting to
  // be seen opens the notes, whichever was open last. It is asked again as
  // each read of the list lands, since the read is what learns of a note sent
  // on another device, or a reveal that came while the sheet was up
  const [fresh, setFresh] = useState(() => revealWaiting())
  const [tab, setTab] = useState(() => (fresh ? 'notes' : readTab()))
  // the night's own screen, for notes that were not mutual on it (Night.jsx):
  // owed once a reveal on this device, and up for the rest of the visit it
  // was first drawn on, unless it is put away (`ok`)
  const [nightOn, setNightOn] = useState(() => nightWaiting())
  // the rows land once a visit: back from a note, or from the letters, they
  // are simply what they are
  const [landed, setLanded] = useState(false)
  // whether a tab has been pressed this visit. In the looks (`LOOK`) the
  // card's parts come in a beat apart as it opens, and a panel drawn by a
  // press is the panel alone, coming in from its tab's side. Held as the
  // panel is drawn, since a class that changed on a panel already standing
  // would start its movement again
  const [turned, setTurned] = useState(false)
  // in the looks, the reveal opened by a press on this card or the one
  // before it, the envelope opening under the press, and the panel the
  // telling grows out of
  const [revealed, setRevealed] = useState(() => !!LOOK && !!TOLD && TOLD.at === lastReveal())
  const [opening, setOpening] = useState(false)
  const panel = useRef(null)
  useEffect(() => {
    if (TOLD) TOLD.film = false
    return () => { if (TOLD && !TOLD.film) TOLD = null }
  }, [])
  const [scroller, setScroller] = useState(null)
  const tabs = useRef(null)
  const [rev, setRev] = useState(0)
  // loading · pings · error, where error is 'none' (no @ proved here),
  // 'unverified' (one is, and the proof that spends it is not on this
  // device, or the server no longer takes it), 'network', or null
  const [list, setList] = useState(() => {
    const got = handle ? heldPings(handle) : null
    return got ? { loading: false, pings: got.pings, error: null } : { loading: !!handle, pings: [], error: null }
  })

  // The letters, and the week's allowance, which is a question about the
  // account and this is the account.
  useEffect(() => { loadMine(); if (member()) loadQuota() }, [])

  // Read with the proof held here, or, with none, with the one the server
  // gives back to the person this device is signed in as (pings.js `myPings`).
  // Read again when the @ changes under the card: the shell asks the server
  // who this is as it mounts (auth.js `refresh`), and a card opened cold is
  // drawn before the answer is in.
  useEffect(() => {
    const me = myHandle()
    if (!me) { setList({ loading: false, pings: [], error: 'none' }); return undefined }
    let on = true
    setList((s) => ({ ...s, loading: true }))
    myPings({ handle: me, proof: heldProof(me) }).then((out) => {
      if (!on) return
      setList({ loading: false, pings: out.pings, allowance: out.allowance || null, error: out.ok ? null : out.error })
      if (out.ok && revealWaiting()) setFresh(true)
      if (out.ok && nightWaiting()) setNightOn(true)
    })
    return () => { on = false }
  }, [rev, handle])
  // the night, heard by the whole sheet, whichever tab or page is up: the
  // list is read again a beat after it, and that read tells it (`fresh`)
  useNight(() => { forgetPings(); setRev((x) => x + 1) })

  // The night is seen once the notes have been read with it on the glass;
  // the bar's light goes with it, and the screen tells it until the sheet
  // shuts (`fresh` is this visit's). On the card, that is: a note's own
  // screen up across the night has told one note, not the night
  const read = !list.loading && !list.error && tab === 'notes' && !!scroller
  // (in the looks it is seen when it is opened, by a press: `reveal` below)
  useEffect(() => { if (fresh && read && !LOOK) sawReveal() }, [fresh, read])
  // and the night's screen is told once it is drawn over the notes it tells
  // (the looks tell it in the panel instead, once opened)
  const night = nightOf(list.pings)
  const showNight = !LOOK && read && !view && nightOn && night.notes.length > 0
  useEffect(() => { if (showNight) sawNight() }, [showNight])
  // What the last night held of this person's: the mutuals told on it and
  // the notes it was not mutual for. A light with nothing under it (a note
  // let go before its night, on another device) is put out without a press
  const nightMutuals = mutualsOf(list.pings).filter((p) => NEAR_MS >= Math.abs((p.revealedAt || 0) - lastReveal()))
  const nightTotal = nightMutuals.length + night.notes.length
  const settledList = !list.loading && !list.error
  useEffect(() => { if (LOOK && fresh && settledList && !nightTotal) sawReveal() }, [fresh, settledList, nightTotal])
  const landing = LOOK ? revealed && !landed && !(TOLD && TOLD.landed) : fresh && !landed
  const seen = useSeen(landing && tab === 'notes', scroller, list.pings)

  // ── back from a mutual, or from a note's settings ──
  // A reveal closed onto this sheet names the slot it was opened from
  // (revealfrom.js `returnTo`), and the focus goes back to that slot's glass
  // once the notes are drawn, or to the frame's title when it has gone (taken
  // off the list on the keepsake), so a person on a keyboard is where they
  // were. A note's settings closed onto it name the row whose `edit` opened
  // them (Ping.jsx `takeNoteBack`), and the focus goes back to that key, or
  // to the title when the note was let go. Taken in an effect, and held
  // here, since a development mount runs the first effect twice and the
  // second would find it spent.
  const back = useRef(null)
  useEffect(() => {
    const h = takeReturn()
    const k = takeNoteBack()
    if (h) back.current = { to: normHandle(h) }
    else if (k) back.current = { key: k }
  }, [])
  const drawn = tab === 'notes' && !view && !!scroller && !(list.loading && !list.pings.length)
  useEffect(() => {
    if (!drawn || !back.current) return
    const { to: h, key } = back.current
    back.current = null
    const slot = h ? [...scroller.querySelectorAll('.wl-slot-open')].find((el) => el.dataset.to === h)
      : [...scroller.querySelectorAll('.wl-vault-row')].find((el) => el.dataset.key === key)?.querySelector('.wl-vault-edit')
    const el = slot || document.getElementById('wl-vault-h')
    if (!el) return
    el.focus({ preventScroll: true })
    if (slot) slot.scrollIntoView({ block: 'nearest' })
  }, [drawn, scroller])

  // ── proving the @ ──
  // The same door the ping asks at, filed under its own use. Whoever DMs is
  // the identity (0012), so there is nothing to ask afterwards: the card
  // comes back, and reads the list with the proof it now holds. From the
  // nudge, the one thing asked afterwards is the email, on the claim's own
  // sheet for the @ just proved ("it's yours. want an email when someone
  // writes to you?"), which closes back onto this card.
  const proof = useProve({
    use: 'you', held, stash: want ? { alerts: true } : null,
    onLanded: async (got) => {
      await refresh()
      forgetPings()
      setView(null)
      setRev((n) => n + 1)
      if (want && got) go('claim', got)
    },
  })

  // The way out of this device. Both halves of the one session (auth.js
  // `signOut`) and the list held for the reveal, which is this person's and
  // should not outlive them on a shared laptop.
  const out = () => {
    signOut()
    forgetPings()
    forgetWeek()
    if (onOut) onOut()
    else up()
  }

  // ── the door ──
  // The Instagram DM, asked for: from the notes' "confirm your Instagram"
  // (somebody known by an address and not by an @, whose pings are behind
  // the @), from the settings' own, from a DM this sheet was waiting on, and
  // from the nudge.
  if (view === 'prove') {
    const lapsed = !!handle
    return (
      <Sheet onClose={up} tall labelledBy="wl-you-h">
        <div className="wl-sheet-in wl-gate is-door wl-you">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          <ProveDoor
            p={proof} headId="wl-you-h" onAsk={() => proof.ask()}
            title={lapsed ? <>confirm your<br />Instagram again.</> : <>confirm this is<br />your Instagram.</>}
            say={want
              ? 'then we can email you if a letter is ever written to you, and only you.'
              : 'to see the notes you sent privately, get email alerts, and remove letters about you.'}
          />
          <div className="wl-push" />
          <SheetFoot>
            {proof.dm ? (
              <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
            ) : known ? (
              <button type="button" className="wl-quiet" onClick={() => { proof.setSaid(''); setView(null) }}>not now</button>
            ) : (
              <button type="button" className="wl-quiet" onClick={up}>not now</button>
            )}
          </SheetFoot>
          <DoorFoot />
        </div>
      </Sheet>
    )
  }

  // Nobody known here: the gate's three ways in, Instagram first, and this
  // card once one of them lands (the head of this file says why).
  if (!known) return <Gate go={go} up={up} upLabel={upLabel} after={{ name: 'you' }} />

  // ── settings ──
  // The @, its alerts, the way off the wall, and the way out of this device,
  // on a page of their own. The sheet's head carries the one way back to the
  // card, in the phone's back key, and the foot carries the way out.
  if (view === 'settings') {
    return (
      <Sheet onClose={up} labelledBy="wl-you-h" className={`is-you${LOOK_CLASS}`}>
        <div className={`wl-sheet-in wl-you is-card is-settings${LOOK_CLASS}`}>
          <SheetHead
            onClose={up} label={upLabel}
            lead={(
              <button type="button" className="wl-you-back" onClick={() => setView(null)} aria-label="back to your notes and letters">
                <PixIcon name="back" scale={2} />
                <span>back</span>
              </button>
            )}
          />
          <h2 className="wl-you-title" id="wl-you-h">settings</h2>
          <YourAt handle={handle} rev={rev} go={go} onProve={() => setView('prove')} />
          <div className="wl-push" />
          <SheetFoot>
            <Pill tone="ghost" className="wl-profile-out" icon={<Icon name="signout" size={15} />} onClick={out}>
              sign out
            </Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  // The row's own note, by its key, and never a mutual, which is the
  // reveal's: a handle can carry two notes (a running one and one that was
  // not this time, from two linked @s), and the one pressed is the one meant.
  // A key outlives the reads (sent again and kept, a note is the same row),
  // so one gone from the list is a note gone, let go elsewhere or told on
  // the night, and the card is back.
  const opened = view ? list.pings.find((x) => x.key === view && x.state !== 'mutual') : null
  if (opened) {
    return (
      <Sheet onClose={up} labelledBy="wl-you-h" className={`is-you${LOOK_CLASS}`}>
        <div className={`wl-sheet-in wl-you is-screen${LOOK_CLASS}`}>
          <SheetHead onClose={up} label={upLabel} />
          <NoteScreen
            key={opened.to} p={opened} me={handle} go={go}
            onBack={() => setView(null)}
            onChange={() => { forgetPings(); setRev((n) => n + 1) }}
          />
        </div>
      </Sheet>
    )
  }

  // ── the card ──
  // each person's mutual once (two @s of this person's, linked, can each
  // carry theirs), newest first; the three newest not yet opened move
  const mutuals = mutualsOf(list.pings)
    .sort((x, y) => (y.revealedAt || 0) - (x.revealedAt || 0))
  const moving = movingOf(handle, mutuals)
  // this week's pings, off the list's own answer, or what this device was
  // last told while the list is on its way
  const week = list.allowance || heldAllowance(handle)
  const standing = list.pings.filter((p) => p.state === 'standing')
  const lapsed = list.pings.filter((p) => p.state === 'lapsed')
  const settled = !list.loading && !list.error
  // what the last reveal said, for the screen over the frame to tell: the
  // mutuals told that night and the notes that were not mutual on it, the
  // ones that ended there and the ones that ran on through it holding its
  // ping (pings.js `nightOf`)
  const last = lastReveal()
  const near = (t) => NEAR_MS >= Math.abs(t - last)
  const told = {
    mutual: mutuals.filter((p) => near(p.revealedAt)).length,
    missed: night.notes.length,
  }
  told.total = told.mutual + told.missed
  // In the looks the night is the person's to open (`Reveal`, above): until
  // it is, the panel waits, and nothing the night said is on the card, the
  // mutuals told on it and the notes it was not mutual for kept off the
  // lists (their count is on the panel); once it is, the panel tells it and
  // the rows land
  const toOpen = !!LOOK && fresh && !revealed && settled && told.total > 0
  const phase = toOpen ? 'waiting' : revealed && told.total > 0 ? 'told' : 'count'
  const nightKeys = new Set([...nightMutuals, ...night.notes].map((p) => p.key))
  const shown = (p) => !toOpen || !nightKeys.has(p.key)
  const shownMutuals = mutuals.filter(shown)
  const shownStanding = standing.filter(shown)
  const shownLapsed = lapsed.filter(shown)
  // a second mutual told the same night, not watched yet: the panel's
  // `open the next`, since each is told on its own
  const nextMutual = revealed ? nightMutuals.find((p) => !wasOpened(handle, p)) : null
  const toFilm = (p) => {
    if (TOLD) TOLD.film = true
    openReveal(go, p.to, panel.current)
  }
  // The press. The envelope opens, the night is seen (the bar's light goes
  // with it), and then a mutual told on it is told, straight from the panel,
  // or, with none, the panel turns to the night where it stands
  const reveal = () => {
    if (opening || !toOpen) return
    const open = () => {
      sawReveal()
      sawNight()
      TOLD = { at: lastReveal(), landed: false, film: false }
      setRevealed(true)
      setOpening(false)
      const first = nightMutuals.find((p) => !wasOpened(handle, p))
      if (first) { toFilm(first); return }
      window.requestAnimationFrame(() => document.getElementById('wl-vault-h')?.focus({ preventScroll: true }))
    }
    if (prefersReducedMotion()) { open(); return }
    setOpening(true)
    window.setTimeout(open, 260)
  }
  const d = getState().draft
  const letter = d && String(d.body || '').trim() ? { key: draftKey(d), name: d.kind === 'name' ? cleanName(d.name) : '' } : null
  const waiting = (() => { const r = loadPending(); return r && r.use === 'ping' && r.to ? normHandle(r.to) : '' })()
  const rows = wroteRows()

  const left = allowance()
  const spent = !!who && !!left && left.left <= 0
  // The @ is the name on the wall, so it is the heading when there is one,
  // and the address this device signed in by stands under it.
  const title = handle ? atHandle(handle) : who ? memberLabel(who) : 'signed in'
  const also = handle && who ? memberLabel(who) : ''

  // leaving the notes, once they have landed
  const leave = () => {
    if (LOOK ? !(revealed && tab === 'notes') : !(fresh && tab === 'notes')) return
    setLanded(true)
    if (TOLD) TOLD.landed = true
  }
  const pick = (t) => { if (t !== tab) { leave(); setTurned(true) } setTab(t); keepTab(t) }
  // the night's notice's one act on a night of one note (Night.jsx
  // `NightCard`), the same as that note's own menu takes: sent again, or the
  // paywall where no ping is left; the list read again after
  const reread = () => { forgetPings(); setRev((n) => n + 1) }
  const nightAgain = async (p) => {
    const out = await sendAgain({ me: handle, them: p.to })
    if (!out.ok && NO_PINGS.has(out.error)) { waitForPings({ kind: 'again', to: p.to }); go('pings'); return null }
    if (!out.ok) return { said: AGAIN_SAYS[out.error] || 'it did not go through. try again.' }
    reread()
    return { ends: Date.parse(out.expires_at || 0) || nextReveal() }
  }
  // the arrow keys move between the two tabs, as a tab list's do
  const keys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tab === 'notes' ? 'letters' : 'notes'
    pick(next)
    tabs.current?.querySelector(`[data-tab="${next}"]`)?.focus()
  }
  const count = (n) => (n > 0 ? <span className="wl-you-tab-n">{n}</span> : null)

  const ask = (words) => (
    <div className="wl-you-ask">
      <p className="wl-you-say">{words}</p>
      <Pill tone="ghost" icon={<Provider size={15} />} onClick={() => setView('prove')}>confirm your Instagram</Pill>
    </div>
  )

  // ── the notes' frame ──
  // The reveal over it, then the frame: the title strip, then whatever is
  // true: the reason there is no list and the one thing to do about it, the
  // wait, nothing yet, or the list: the mutuals first under their own seam,
  // each its slot (Slot.jsx), then what is running, then what was not this
  // time, under a seam of its own. The ping still one DM from out stands at
  // the end, drawn as not sent. On the night itself (`fresh`) each row lands
  // a beat after the one above, the first time the rows are shown, as it
  // comes into sight (`useSeen`). A note's row is its press and its `edit`,
  // two keys side by side, and the key's name starts with the word on it, so
  // a voice asking for `edit` finds every one, then says what it is for in
  // the words the note's own menu uses. A row that was not this time says,
  // after it, what came back of its ping (Night.jsx `backMark`: `+1 free
  // ping`, `ping back`), the note's own share of what the night's notice
  // says in all.
  //
  // And after a reveal that had notes in it that were not mutual, the
  // night's notice (Night.jsx `NightCard`) stands at the head of what was
  // not, under the mutuals, so a night with a mutual in it tells that first:
  // once a reveal on this device, with the acts on its keys (`send again`
  // for a night of one note, and `share celestual`). After an act its `ok`
  // puts it away for the visit, and the focus goes back to the frame's
  // title.
  // In the two looks (`LOOK`) the aerial stands at the head of the words
  // under the name, small, so the glyph and what it means are read as one
  // thing; at the row's end, alone, it was a mark nobody had been told.
  const row = (p, cls, onClick, aria) => {
    const seek = landing ? <span className="wl-vault-seek" aria-hidden="true">searching…</span> : null
    const said = (
      <span className="wl-vault-said">
        {stateWords(p)}{p.state === 'lapsed' && backMark(p) ? ` · ${backMark(p)}` : ''}
      </span>
    )
    return (
      <div
        key={p.key} data-key={p.key}
        className={`wl-vault-row ${cls}${landing ? ' is-landing' : ''}${landing && seen.has(p.key) ? ' is-seen' : ''}`}
        style={landing && seen.has(p.key) ? { '--land': `${seen.get(p.key)}ms` } : undefined}
      >
        <button type="button" className="wl-vault-open" onClick={onClick} aria-label={aria}>
          <Face handle={p.to} size={LOOK ? 34 : 30} />
          <span className="wl-wrote-who">
            <span className="wl-wrote-name">{atHandle(p.to)}</span>
            {LOOK ? (
              <span className="wl-wrote-meta wl-vault-state">
                <Aerial state={aerialOf(p)} land={landing} scale={1} />
                <span className="wl-vault-words">{seek}{said}</span>
              </span>
            ) : (
              <span className="wl-wrote-meta">{seek}{said}</span>
            )}
          </span>
          {LOOK ? null : <Aerial state={aerialOf(p)} land={landing} />}
        </button>
        <EditKey
          onClick={() => editNote(go, p.to, p.line, p)}
          label={`edit your note to ${atHandle(p.to)}: ${p.state === 'lapsed' ? 'send it with new words' : 'change the words'} or let it go`}
        />
      </div>
    )
  }
  const notes = (
    <>
      {LOOK === 1 ? (
        <RevealPanel
          phase={phase} n={told.total} told={told} night={night} more={!!nextMutual} opening={opening} panelRef={panel}
          onReveal={reveal} onNext={() => nextMutual && toFilm(nextMutual)} onAgain={nightAgain} onInfo={() => go('join')}
        />
      ) : null}
      <div className="wl-vault" aria-labelledby="wl-vault-h">
        {LOOK ? null : <RevealStrip fresh={fresh && !list.error} told={told} onInfo={() => go('join')} />}
        <div className="wl-vault-body">
          {list.error === 'none' ? ask('confirm your Instagram to see the notes you sent privately.')
            : list.error === 'unverified' ? ask('confirm your Instagram again to see them.')
              : list.error ? (
                <div className="wl-you-ask">
                  <p className="wl-you-say">your private notes did not load. nothing about them changed.</p>
                  <button type="button" className="wl-quiet" onClick={() => setRev((x) => x + 1)}>try again</button>
                </div>
              ) : list.loading && !list.pings.length ? (
                <p className="wl-profile-none wl-you-wait" aria-label="reading your private notes"><Wait /></p>
              ) : !list.pings.length && !waiting ? (
                <p className="wl-profile-none wl-vault-none">none sent yet. the next reveal is saturday at 9pm pacific.</p>
              ) : null}
          {shownMutuals.length ? (
            <div className="wl-vault-news">
              <span className="wl-vault-past-h is-rose">mutual · yours to keep</span>
              {shownMutuals.map((p) => (
                <MutualSlot
                  key={p.key} p={p} me={handle} go={go} still={!moving.has(p.key)}
                  writing={liveOf(list.pings, p.to)?.state === 'standing'}
                  landing={landing} land={landing && seen.has(p.key) ? seen.get(p.key) : null}
                />
              ))}
            </div>
          ) : null}
          {showNight ? (
            <NightCard
              night={night} endsOf={endsWords}
              onAgain={nightAgain}
              onOk={() => {
                setNightOn(false)
                document.getElementById('wl-vault-h')?.focus({ preventScroll: true })
              }}
            />
          ) : null}
          {shownStanding.length || waiting ? (
            <div className="wl-vault-list">
              {LOOK ? <span className="wl-vault-past-h is-sealed">sealed</span> : null}
              {shownStanding.map((p) => row(p, 'is-standing', () => { leave(); setView(p.key) },
                `your private note to ${atHandle(p.to)}, sealed, ${stateWords(p)}`))}
              {waiting ? (
                <div className="wl-vault-row is-draft">
                  <button type="button" className="wl-vault-open" onClick={() => go('ping', waiting)}>
                    <Face handle={waiting} size={LOOK ? 34 : 30} />
                    <span className="wl-wrote-who">
                      <span className="wl-wrote-name">{atHandle(waiting)}</span>
                      <span className="wl-wrote-meta">not sent · waiting on one DM</span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {shownLapsed.length ? (
            <div className="wl-vault-past">
              <span className="wl-vault-past-h">{endedWords(Math.max(...shownLapsed.map((p) => p.expires)))}</span>
              {shownLapsed.map((p) => row(p, 'is-lapsed', () => { leave(); setView(p.key) },
                `your private note to ${atHandle(p.to)}, not this time${backMark(p) ? `, ${backMark(p)}` : ''}. open it for what came back, or to send it again`))}
            </div>
          ) : null}
        </div>
        {settled && !LOOK ? (
          <div className="wl-vault-foot">
            <Week a={week} onMore={() => { leave(); go('pings') }} />
          </div>
        ) : null}
      </div>
    </>
  )

  // ── the letters ──
  // Unlit rows, as the wall's own are: the letter the composer is holding
  // first, then what is up, then the week when it is spent. The letters are
  // anonymous and stay anonymous: nothing on a letter points back here. The
  // server answers a writer about their OWN letters and nobody else's
  // (wall_mine, 0050).
  const letters = (
    <div className="wl-you-letters">
      {letter ? (
        <button type="button" className="wl-wrote-row is-draft" onClick={() => toWrite(go, letter.key)}>
          <Face handle={letter.key} name={letter.name} size={LOOK ? 34 : 30} resolve={!!letter.key} />
          <span className="wl-wrote-who">
            <span className="wl-wrote-name">{letter.name || (letter.key ? labelFor(letter.key) : 'no name yet')}</span>
            <span className="wl-wrote-meta">a letter, not sent</span>
          </span>
        </button>
      ) : null}
      <Wrote go={go} rows={rows} />
      {spent ? (
        <Allowance left={left.left} limit={left.limit} resets={left.resets} className="wl-profile-cap" />
      ) : null}
    </div>
  )

  // the person: their face, the @ or the address, and the key to the
  // settings. The lit look stands it in the sheet's own head, beside the
  // close, so the glass under it is the first thing on the card
  const person = (
    <header className="wl-you-id">
      <Face handle={handle || who} size={LOOK === 2 ? 36 : LOOK ? 46 : 52} resolve={!!handle || String(who).startsWith('@')} className="wl-profile-face" />
      <div className="wl-you-who">
        <p className="wl-profile-addr" id="wl-you-h">{title}</p>
        {also ? <p className="wl-you-also">{also}</p> : null}
      </div>
      <button type="button" className="wl-you-set" onClick={() => { leave(); setView('settings') }} aria-label="settings: your @, email alerts and sign out">
        settings
      </button>
    </header>
  )
  // what each tab holds, said over it: the notes standing and done, and the
  // letters up and the hearts on them, as the server counted them
  const upCount = rows.filter((r) => r.live).length
  const hearts = rows.reduce((n, r) => n + (r.live && r.hearts ? r.hearts : 0), 0)

  return (
    <Sheet onClose={up} labelledBy="wl-you-h" className={`is-you${LOOK_CLASS}`}>
      <div className={`wl-sheet-in wl-you is-card${LOOK_CLASS}`} ref={setScroller}>
        <SheetHead onClose={up} label={upLabel} lead={LOOK === 2 ? person : null} />

        {/* ── the person ── */}
        {LOOK === 2 ? null : person}

        {LOOK === 2 ? (
          <Handset
            tab={tab} turned={turned} phase={phase} n={told.total} told={told} night={night} more={!!nextMutual}
            opening={opening} panelRef={panel} up={upCount} hearts={hearts}
            onReveal={reveal} onNext={() => nextMutual && toFilm(nextMutual)} onAgain={nightAgain} onInfo={() => go('join')}
          />
        ) : null}

        {/* ── the two tabs ── */}
        <div
          className="wl-you-tabs" role="tablist" aria-label="what you sent" ref={tabs} onKeyDown={keys}
          style={LOOK === 1 ? { '--at': tab === 'notes' ? 0 : 1 } : undefined}
        >
          {LOOK === 1 ? <span className="wl-you-tabs-plate" aria-hidden="true" /> : null}
          <button
            type="button" role="tab" id="wl-you-tab-notes" data-tab="notes"
            aria-selected={tab === 'notes'} aria-controls="wl-you-panel" tabIndex={tab === 'notes' ? 0 : -1}
            className="wl-you-tab" onClick={() => pick('notes')}
          >
            <span>private notes</span>
            {settled ? count(mutuals.length + standing.length + lapsed.length + (waiting ? 1 : 0)) : null}
            {tab !== 'notes' && (mutuals.length || fresh) ? (
              <><i className="wl-you-tab-pip" aria-hidden="true" /><span className="wl-sr">{fresh ? ', the reveal is in' : ', it’s mutual'}</span></>
            ) : null}
          </button>
          <button
            type="button" role="tab" id="wl-you-tab-letters" data-tab="letters"
            aria-selected={tab === 'letters'} aria-controls="wl-you-panel" tabIndex={tab === 'letters' ? 0 : -1}
            className="wl-you-tab" onClick={() => pick('letters')}
          >
            <span>letters</span>
            {count(rows.length)}
          </button>
        </div>

        <div className={`wl-you-panel${turned ? ' is-turned' : ''}`} role="tabpanel" id="wl-you-panel" aria-labelledby={`wl-you-tab-${tab}`} key={tab}>
          {tab === 'notes' ? notes : letters}
        </div>

        <div className="wl-push" />

        <SheetFoot>
          {/* the week's pings over the key that spends them, in both looks */}
          {LOOK && tab === 'notes' && settled && !toOpen ? (
            <div className="wl-you-week"><Week a={week} onMore={() => { leave(); go('pings') }} /></div>
          ) : null}
          {/* while a reveal waits to be opened, the foot's lit key is the
              press that opens it, where a thumb is */}
          {tab !== 'notes'
            ? <Pill tone="light" wide onClick={() => toWrite(go)}>write a letter</Pill>
            : toOpen
              ? <Pill tone="light" wide onClick={reveal} disabled={opening}>open the reveal</Pill>
              : <Pill tone="light" wide onClick={() => go('ping')}>send a private note</Pill>}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

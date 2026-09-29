// ── the replies, a sheet raised from under the letter ───────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  A LETTER GETS A THREAD, AND THE PERSON IT IS TO GETS THE LAST WORD      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Migration 0068 and supabase/functions/celestual-wall-reply are the rules;
// this is how they are drawn. In one breath:
//
//   anybody      reads the thread and likes a reply, as anybody hearts a
//                letter
//   a school     replies, anonymous to everybody reading and not to us, and
//                agrees to the terms for replying once before the first
//   the one it   replies with no school, and every reply of theirs is lit in
//   is to        the letter's own colour with `recipient` on it. They shut
//                the replies (no new ones, the ones there stay) or put them
//                away (nobody else sees them), and open them again
//   anybody      reports a reply in one tap, with an undo. Three devices and
//                it is out of sight until a person at the desk decides
//   nobody       is named or tagged in a reply: the line under the field says
//                what was caught while it is typed (replies-check.js)
//
// ── where it lives, and why there ───────────────────────────────────────────
// Over the letter, the way every comment thread on a phone is read now: the
// letter's right soft key, a speech bubble and its count (`threadKey`),
// raises a sheet from the foot of the glass (`ThreadSheet`), and the
// letter's phone rises and steps back to stand whole in the room left above
// it, still lit, still the letter, as a reel does over its comments. A
// press anywhere off the sheet, the grip, a pull down, the key again or
// Escape lays it back down. In a wide room, where a sheet dragged up from
// the foot of a desk is a phone gesture on furniture, the letter slides to
// the left and the replies stand beside it as a panel of the same height.
// Screens/Letter.jsx moves it, the letter and the sheet on one clock (the
// sheet, there); this file draws it and holds the thread's state.
//
// ── and what it is made of ──────────────────────────────────────────────────
// It was the phone's own lower half twice. First an unlit panel under the
// lit one, a dark strip with thumb ridges fixed to the screen's foot (the
// chin) and a dark thread in the chrome's greys under it, which the owner
// read as a different design attached to the letter. Then the same glass as
// the letter, lit in its colours and slid out from under its key band,
// which the owner read as a letter and its replies that did not blend: two
// halves of one phone arguing about which was the screen. A sheet is not
// part of the phone. It is laid over the room, so it is made of what every
// other sheet on the wall is made of (DESIGN.md 2.6): the phone's glass with
// its light off, its own pixel grid, one pixel of bezel, four pixel corners
// at the top and the three dash grip, chalk words in the one face. The one
// colour on it is the letter's own light, where the lit screen above falls
// on it: a hairline along its top edge and a glow rising off it, and the
// badge on the recipient's reply, lit in the letter's colour (the sheet
// carries the letter's `skinVars`, Letter.jsx). A writer's creature is a
// sprite in the chalk, the way the phone drew a contact it had no picture
// for. A thread folded into the letter's own screen was weighed too, and it
// is a letter that scrolls, with the words somebody wrote pushed off their
// own screen by the answers.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Face, EmailField, Pill, usePhone } from './parts.jsx'
import { PixIcon, Wait } from './screen.jsx'
import { Caret } from './caret.jsx'
import { stampOf, countSaid } from './looks.js'
import { creatureOf, namesFor } from './avatars.js'
import { replyFault, whyRefused } from './replies-check.js'
import {
  readThread, likeReply, reportReply, setThread, sendReply,
  sendSchoolLink, schoolLinkStatus, freshNonce,
} from './replies-api.js'
import { refresh as refreshMe, eduDomain } from './auth.js'
import { isNameKey } from './data.js'
import { getState, patch } from './store.js'
import { ResendLink } from './linkdoor.jsx'
import './replies.css'

const MAX = 280

// ── what is kept while the tab is open ──
// A reply being written, by letter, so a turn of the deck or a sheet laid down
// never loses words; and the last thread read, by letter, so a card turned
// back to has its count on its key at once, and asks again behind it.
const DRAFTS = new Map()
const KEPT = new Map()
// the answers that mean there is no thread to draw: a deploy without the
// replies, no connection to one, or a letter that is not up. The key is
// then `share`, as every letter's was, and there is no sheet behind it
const NONE = new Set(['missing', 'offline', 'gone', 'empty'])

// ── when ────────────────────────────────────────────────────────────────────
// The phone's short clock for a message in a thread: now, minutes, hours,
// days, and past a week the day it was stamped, as a letter's status row
// stamps it (looks.js `stampOf`).
function when(at) {
  const t = typeof at === 'number' ? at : Date.parse(at)
  if (!Number.isFinite(t)) return ''
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return stampOf(t)
}

// ── a creature, on its small screen ─────────────────────────────────────────
// Thirteen cells a side: the eleven by ten drawing and a cell of panel round
// it, drawn a whole number of the page's pixels to each cell, so every cell
// is square and every edge is sharp. `mono` draws it as a sprite instead:
// the drawing in the chalk and its half tones at half of it, on a small
// screen with its light off (replies.css `.is-mono`). `box` is the square
// it stands in, when that is not a whole number of cells: the drawing keeps
// its whole cells and stands in the middle of it.
export function Creature({ who, size = 39, box = 0, className = '', mono = false }) {
  const c = creatureOf(who)
  const px = Math.max(1, Math.floor(size / 13))
  const s = px * 13
  const out = Math.max(s, box || 0)
  const { ink, mid } = useMemo(() => {
    const y0 = Math.ceil((13 - c.grid.length) / 2)
    let i = ''
    let h = ''
    c.grid.forEach((row, y) => row.forEach((ch, x) => {
      const cell = `M${x + 1} ${y + y0}h1v1h-1z`
      if (ch === 'X') i += cell
      else if (ch === 'h') h += cell
    }))
    return { ink: i, mid: h }
  }, [c])
  return (
    <span
      className={`wl-rp-av${mono ? ' is-mono' : ''} ${className}`}
      style={mono ? { '--s': `${out}px` } : { '--s': `${out}px`, '--av-panel': c.inks.panel, '--av-hi': c.inks.hi }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 13 13" width={s} height={s} shapeRendering="crispEdges" focusable="false">
        {mid ? <path d={mid} fill={mono ? 'currentColor' : c.inks.mid} opacity={mono ? 0.42 : undefined} /> : null}
        <path d={ink} fill={mono ? 'currentColor' : c.inks.ink} />
      </svg>
    </span>
  )
}

// ── a reply of theirs that came down, said once ─────────────────────────────
// A writer sees their own reply that was taken down, struck through, with
// why. Once they have seen it and shut the sheet it is not drawn again
// (`ThreadSheet` remembers it on the way out, store.js `goneSeen`): a notice that
// stands in the thread every time it is opened is a telling off, not a note.
function goneSeen(r) {
  return !!(r.mine && r.status === 'removed' && (getState().goneSeen || {})[r.id])
}
function markGone(ids) {
  if (!ids.length) return
  const had = getState().goneSeen || {}
  patch({ goneSeen: { ...had, ...Object.fromEntries(ids.map((id) => [id, 1])) } })
}

// ── the thread ──────────────────────────────────────────────────────────────
// Everything the thread holds, for the letter on the glass: the read, and
// again when the tab comes back to the front; a like drawn at once and
// corrected by the answer; a report in one tap with its undo; the
// recipient's say; and the line about what just happened, which goes after
// a few seconds. Asked for once, by the sheet the card is on (Letter.jsx),
// for the card and never for a neighbour; `letter` is null while there is
// no card, which asks for nothing. Keyed by the letter inside, so the card
// a turn lands on starts from what was last read of it (`KEPT`).
export function useThread(letter) {
  const id = letter ? letter.id : ''
  const [was, setWas] = useState(id)
  const [t, setT] = useState(() => (id ? KEPT.get(id) || null : null))
  const [likes, setLikes] = useState({})       // id -> { liked, likes }, drawn at once
  const [liking, setLiking] = useState({})
  const [reports, setReports] = useState({})   // id -> 'on' | 'busy'
  const [setting, setSetting] = useState(false)
  const [note, setNote] = useState('')
  if (was !== id) {
    setWas(id)
    setT(id ? KEPT.get(id) || null : null)
    setLikes({}); setLiking({}); setReports({}); setNote(''); setSetting(false)
  }
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const at = useRef(id)
  at.current = id

  // One hook reads every letter the card turns to (Letter.jsx), so what a
  // press started on one letter and answered after a turn is that letter's,
  // and says nothing on the next one's sheet: every line said after an
  // answer names the letter it was for (`say`)
  const say = (text, forId) => { if (forId === at.current) setNote(text) }

  const load = useCallback(async () => {
    if (!id) return null
    const out = await readThread(id)
    if (!alive.current || at.current !== id) return out
    if (out && out.ok) KEPT.set(id, out)
    setT(out)
    if (out && out.ok) setLikes({})
    return out
  }, [id])
  useEffect(() => { if (id) load() }, [id, load])
  // and again when the tab comes back to the front, so a thread left open
  // in the background is not a thread from an hour ago
  useEffect(() => {
    if (!id) return undefined
    const back = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [id, load])
  useEffect(() => {
    if (!note) return undefined
    const k = setTimeout(() => setNote(''), 4200)
    return () => clearTimeout(k)
  }, [note])

  // ── a like, drawn at once and corrected by the answer ──
  const like = async (r) => {
    if (liking[r.id]) return
    const on = !r.liked
    setLikes((m) => ({ ...m, [r.id]: { liked: on, likes: Math.max(0, (r.likes || 0) + (on ? 1 : -1)) } }))
    setLiking((m) => ({ ...m, [r.id]: true }))
    const out = await likeReply(r.id, on)
    if (!alive.current) return
    setLiking((m) => ({ ...m, [r.id]: false }))
    if (out && out.ok) setLikes((m) => ({ ...m, [r.id]: { liked: !!out.liked, likes: Number(out.likes) || 0 } }))
    else {
      setLikes((m) => { const n = { ...m }; delete n[r.id]; return n })
      if (out?.error === 'gone' || out?.error === 'closed') load()
    }
  }

  // ── a report, one tap, with the way back ──
  const report = async (r) => {
    setReports((m) => ({ ...m, [r.id]: 'busy' }))
    const was = id
    const out = await reportReply(r.id, true)
    if (!alive.current || at.current !== was) return
    if (out && out.ok) setReports((m) => ({ ...m, [r.id]: 'on' }))
    else {
      setReports((m) => { const n = { ...m }; delete n[r.id]; return n })
      say('the report did not go through. try again', was)
    }
  }
  const undo = async (r) => {
    setReports((m) => ({ ...m, [r.id]: 'busy' }))
    const out = await reportReply(r.id, false)
    if (!alive.current) return
    if (out && out.ok) {
      setReports((m) => { const n = { ...m }; delete n[r.id]; return n })
      await load()
    } else setReports((m) => ({ ...m, [r.id]: 'on' }))
  }

  // ── the recipient's say ──
  const set = async (state) => {
    if (setting) return
    const before = t?.state
    const was = id
    setSetting(true)
    const out = await setThread(id, state)
    // turned to another letter meanwhile: that one's keys were never busy
    if (!alive.current || at.current !== was) return
    setSetting(false)
    if (out && out.ok) {
      say(state === 'locked' ? 'nobody else can reply now. the ones here stay.'
        : state === 'closed' ? 'nobody else can see the replies now.'
          : before === 'closed' ? 'everybody can see the replies again.' : 'people can reply again.', was)
      await load()
    } else say('that did not go through. try again', was)
  }

  const retry = () => { setT(null); load() }

  // what the key, the status row and the sheet read off it
  const on = !!id && !(t && !t.ok && NONE.has(t.error))
  const ok = !!(t && t.ok)
  const me = (ok && t.me) || {}
  const state = (ok && t.state) || 'open'
  const away = state === 'closed'
  const shut = state === 'locked'
  const rows = ok ? (t.replies || []).filter((r) => !goneSeen(r)).map((r) => (likes[r.id] ? { ...r, ...likes[r.id] } : r)) : []
  const names = namesFor([...rows.filter((r) => !r.recipient).map((r) => r.who), me.who].filter(Boolean))
  const hiddenFromMe = away && !me.recipient
  return {
    id, t, on, ok, load, retry, me, state, away, shut, rows, names, hiddenFromMe,
    count: (ok && t.count) || 0,
    answered: !!(ok && t.recipient_replied && !hiddenFromMe),
    canWrite: !!me.can,
    toAt: !!letter && !isNameKey(letter.to),
    like, report, undo, reports, liking, set, setting, note, setNote, say,
  }
}

// ── the key ─────────────────────────────────────────────────────────────────
// The thread is opened by the letter's own right soft key, where `share`
// stood; sharing is the first row of the letter's options now. The key is
// drawn exactly as the heart beside it is: a glyph on the heart's six rows
// (looks.js `bubbleO`, a speech bubble) and the count after it in the key's
// own ink, and nothing else. No count is no number, the bubble alone, as
// the heart with none says nothing. The heart and the bubble count the one
// way (looks.js `countSaid`): whole thousands past a thousand, so never
// more than three characters, and three are set a step smaller
// (`is-long`), which keeps the heart in the middle of the band.
//
// It was the word `replies` with the count at its shoulder on a lit plate,
// and the message light, a lit square, stacked under the plate once the
// person the letter is to had answered. The owner read the plate and the
// square under it as something stuck onto the key, and they were: the one
// badge on a band of plain words. That light is the phone's own now, the
// envelope in the status row by the aerial, steady (screen.jsx `mail`, put
// there by Letter.jsx), which is where a phone told you something had come
// in. The words stay for a screen reader (`threadName`).
//
// While the sheet is up the key stays struck out of its band, as the phone
// lit the tab it was on, and a second press lays the sheet down. Every
// screen on the strip draws the key, the neighbours asleep with no count
// and no envelope, so a turn onto a letter changes nothing but the number.
// A letter with no thread behind it (a deploy without the replies, or no
// connection) has `share` there instead, as it always did.
function shown(th) {
  return th.t && th.t.ok && !th.hiddenFromMe ? th.count : 0
}
// what the thread is called, by the key and by the sheet it opens: the
// count and who has answered, and whether it is shut or put away
export function threadName(th) {
  const n = shown(th)
  return `${n ? `${n} ${n === 1 ? 'reply' : 'replies'}` : 'replies'}${th.answered ? ', the recipient replied' : ''}${th.shut ? ', shut' : ''}${th.hiddenFromMe ? ', put away' : ''}`
}
export function threadKey(th, { open = false, onToggle, id, letter } = {}) {
  if (th && letter && !th.on) return null
  const n = th ? shown(th) : 0
  const said = n ? countSaid(n) : ''
  const aria = th ? threadName(th) : 'replies'
  return {
    glyph: 'bubbleO', label: said, cls: `is-thread${said.length > 2 ? ' is-long' : ''}`, open,
    onClick: onToggle, id, expanded: th ? open : undefined,
    controls: letter ? `wl-low-${letter.id}` : undefined,
    aria: open ? `${aria}. shut them` : aria,
  }
}

// ── one reply ───────────────────────────────────────────────────────────────
// The row every comment thread has taught a thumb: the picture on the left;
// beside it who and when on one line, with the flag after the time, small
// and dim, and under that the words; and on the right the heart with its
// count under it, one column down the whole thread, so a like is always in
// the same place. A reply of your own has no flag. The recipient's reply
// has their face and, where a writer's name would be, `recipient` on a
// badge lit in the letter's colour, the one lit thing on the sheet that is
// not its edge. `fresh` is a reply that came while the sheet was up
// (`ThreadSheet`), which arrives on its own rather than in the opening's
// stagger.
const PIC = 32
function Reply({ r, i = 0, letter, name, onLike, onReport, onUndo, reported, liking, fresh = false }) {
  const rec = r.recipient
  const live = r.status === 'live'
  const down = reported && live
  if (down) {
    // reported by this device: folded away, in the letter report's words,
    // with the way back
    return (
      <li className="wl-rp-item is-folded" style={{ '--i': Math.min(i, 5) }}>
        <PixIcon name="flag" scale={2} className="wl-rp-fold-g" />
        <span className="wl-rp-fold-say">reported. a person will review it.</span>
        <button type="button" className="wl-rp-undo" onClick={() => onUndo(r)} disabled={reported === 'busy'}>undo</button>
      </li>
    )
  }
  const likes = r.likes || 0
  return (
    <li
      className={`wl-rp-item${rec ? ' is-recipient' : ''}${r.mine ? ' is-mine' : ''}${live ? '' : ` is-${r.status}`}${fresh ? ' is-new' : ''}`}
      style={{ '--i': Math.min(i, 5) }} data-id={r.id}
    >
      <span className="wl-rp-pic">
        {rec ? <Face handle={letter.to} size={PIC} /> : <Creature who={r.who} size={PIC} box={PIC} mono />}
      </span>
      <div className="wl-rp-main">
        <div className="wl-rp-meta">
          {rec ? <span className="wl-rp-badge">recipient</span> : <span className="wl-rp-name">{name}</span>}
          {r.mine ? <span className="wl-rp-you">you</span> : null}
          <span className="wl-rp-when">{when(r.at)}</span>
          {live && !r.mine ? (
            <button type="button" className="wl-rp-flag" onClick={() => onReport(r)} aria-label="report this reply">
              <PixIcon name="flag" scale={2} />
            </button>
          ) : null}
        </div>
        <p className="wl-rp-words">{r.body}</p>
        {r.status === 'held' ? (
          <p className="wl-rp-state"><Wait scale={2} /> being read. only you can see it until it passes.</p>
        ) : r.status === 'hidden' ? (
          <p className="wl-rp-state">out of sight while a person reviews it. only you can see it.</p>
        ) : r.status === 'removed' ? (
          <p className="wl-rp-state">taken down. it went against the terms for replying.</p>
        ) : null}
      </div>
      {live ? (
        <button
          type="button" className={`wl-rp-like${r.liked ? ' is-on' : ''}`}
          onClick={() => onLike(r)} aria-pressed={!!r.liked} disabled={liking}
          aria-label={`${r.liked ? 'take your like off this reply' : 'like this reply'}${likes ? `, ${likes === 1 ? 'one like' : `${likes} likes`}` : ''}`}
        >
          <PixIcon name={r.liked ? 'heart' : 'heartO'} scale={2} />
          <span className="wl-rp-n">{likes ? countSaid(likes) : ''}</span>
        </button>
      ) : <span className="wl-rp-like is-void" aria-hidden="true" />}
    </li>
  )
}

// ── the terms, before the first reply ───────────────────────────────────────
// Read on the replies' own sheet, in place of the thread, and not on a
// second sheet over it: what anonymous means here, the three things a reply
// may not do, and what abuse costs, with the whole terms a link away. Its
// keys are the tray's, `not now`, which goes back to the words, and `agree
// and send`, lit, which sends the reply it was raised for. Accepted once, on
// the server, with that reply.
//
// The person the letter is to reads words of their own at the same moment.
// Their reply is not anonymous (it is lit and marked as theirs), it comes
// from no school, and the school's line would be a threat about an
// institution they never gave us, raised at the very moment the thread asks
// them to answer. So for them the head says what their reply is, and what
// abuse costs is what it can cost them: the reply, and replying.
function TermsBody({ recipient = false, headRef }) {
  return (
    <div className="wl-rp-terms wl-low-row">
      <p className="wl-rp-terms-kicker">before your first reply</p>
      {recipient ? (
        <>
          <h2 className="wl-rp-terms-h" tabIndex={-1} ref={headRef}>your reply is marked<br />as the recipient&rsquo;s.</h2>
          <p className="wl-rp-terms-say">
            everybody reading sees it came from the person this letter is to, and nothing more. celestual acts on abuse.
          </p>
        </>
      ) : (
        <>
          <h2 className="wl-rp-terms-h" tabIndex={-1} ref={headRef}>anonymous to others.<br />not to us.</h2>
          <p className="wl-rp-terms-say">
            nobody reading sees who wrote a reply. celestual can see who wrote what, and acts on abuse.
          </p>
        </>
      )}
      <ul className="wl-rp-terms-list">
        <li>no naming or tagging anybody else. no @, no full names.</li>
        <li>nothing hateful or sexual about a person.</li>
        <li>no contact details, and nothing that says where somebody will be.</li>
      </ul>
      {recipient ? (
        <p className="wl-rp-terms-cost">abuse has consequences: the reply comes down and you can lose replying.</p>
      ) : (
        <p className="wl-rp-terms-cost">
          abuse has consequences: the reply comes down, you can lose replying and the wall, and where
          the law or your school&rsquo;s rules require it, we tell the school.
        </p>
      )}
      <a className="wl-rp-terms-link" href="/terms#replies" target="_blank" rel="noopener noreferrer">
        the terms for replying
        <PixIcon name="arrow" scale={2} />
      </a>
    </div>
  )
}

// ── a school address, for somebody who has none on this device ──────────────
// The composer's magic link (docs/ONE-WALL.md), on the replies' sheet in place
// of the thread, worded for a proof with nothing waiting on it, and in the
// composer's words for the same act (screens/Write.jsx, the Berkeley door):
// `send me the link`, `waiting for the link`, `send it again`, `use a
// different address`. The link is tapped wherever the mail is opened, and
// this device is asked every few seconds whether it has been, and again
// when it comes back to the front.
//
// ── opened somewhere else ───────────────────────────────────────────────────
// A link confirms the browser that opens it and no other (migration 0070),
// so a link somebody is sent without asking for it confirms nobody here.
// Opened in another browser (the mail read in Safari, the wall open in
// Instagram's), that browser can reply and this one cannot, and the form
// says so, with a new link to open here. The link carries the letter, so the
// page it opens there leads back to it (screens/Verify.jsx). It used to show
// a number here, to be typed there (0065).
//
// ── asked, and asked again ──────────────────────────────────────────────────
// A second link is a second request with a number of its own, and this form
// watches the newest. The first is still good for its half hour, and it is
// usually the one that is tapped (it came late, which is why a second was
// asked for). So each time the newest has not been tapped, this device's own
// answer is asked for too (auth.js `refresh`): a school address on it now,
// from any of the links this form sent, opens replying the same.
//
// A link that has run out is said so, with the way to another.
const RAN_OUT = new Set(['expired', 'used', 'burned', 'invalid'])
const LINK_MS = 30 * 60000
function ranOut(got, at) {
  if (at && Date.now() - at > LINK_MS) return true
  if (!got) return false
  if (got.ok) return !!(got.expired || got.burned)
  return RAN_OUT.has(got.error)
}
const SCHOOL_FAULT = {
  domain: 'that address is not a school’s. replies take an address that ends in .edu.',
  email: 'that does not look like an email address.',
  rate: 'that is a lot of links for one hour. try again later.',
  taken: 'that address belongs to another account.',
  offline: 'there is no connection. try again in a moment.',
}

function School({ letter, onVerified, onTheirs }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('ask')     // ask · sent
  const [busy, setBusy] = useState(false)
  const [fault, setFault] = useState('')
  const [sent, setSent] = useState(null)      // { request, email, at, again }
  const [out, setOut] = useState(false)       // the newest link ran out, or was spent
  const [away, setAway] = useState(false)     // or was opened in another browser

  // one link to one address; the fault said here when none went out
  const mail = async (e) => {
    const got = await sendSchoolLink(e, letter)
    if (got && got.ok) return got
    setFault(SCHOOL_FAULT[got?.error] || 'the email did not send. try again in a moment.')
    return null
  }

  const send = async () => {
    const e = email.trim().toLowerCase()
    if (busy) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { setFault('that does not look like an email address.'); return }
    setBusy(true)
    setFault('')
    const got = await mail(e)
    setBusy(false)
    if (!got) return
    setSent({ request: got.request, email: e, at: Date.now(), again: false })
    setOut(false)
    setAway(false)
    setStep('sent')
  }

  // the same address again (linkdoor.jsx `ResendLink` asks, and waits before
  // it offers); false when nothing went out, so its clock does not start
  const again = async () => {
    if (!sent) return false
    setFault('')
    const got = await mail(sent.email)
    if (!got) return false
    setSent({ request: got.request, email: sent.email, at: Date.now(), again: true })
    setOut(false)
    setAway(false)
    return true
  }

  useEffect(() => {
    if (step !== 'sent' || !sent?.request || out || away) return undefined
    let alive = true
    let asking = false
    // what this device already said about a school before the wait began:
    // only a change counts, so an answer that was already there (and that
    // the thread did not agree with) never ends a wait on its own
    const had = !!eduDomain()
    const ask = async () => {
      if (!alive || asking) return
      asking = true
      const got = await schoolLinkStatus(sent.request)
      let yes = !!(got && got.ok && got.verified)
      // any link this form sent, tapped: this device is at a school now
      if (!yes && !had && alive) {
        await refreshMe()
        yes = !!eduDomain()
      }
      asking = false
      if (!alive) return
      if (yes) { alive = false; onVerified(); return }
      // confirmed in another browser and not this one (0070); the function
      // calls that `expired` as well, for a form from before
      if (got && got.ok && got.elsewhere) { alive = false; setAway(true); return }
      if (ranOut(got, sent.at)) { alive = false; setOut(true) }
    }
    const tick = setInterval(ask, 4000)
    const back = () => { if (document.visibilityState === 'visible') ask() }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => {
      alive = false
      clearInterval(tick)
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('focus', back)
    }
  }, [step, sent, out, away, onVerified])

  if (step === 'sent' && sent) {
    return (
      <div className="wl-rp-school wl-low-row is-sent">
        {away ? (
          <p className="wl-rp-school-say" role="status">
            you opened the link somewhere else, so you can reply there. to reply here, send a new link and open it here.
          </p>
        ) : out ? (
          <p className="wl-rp-school-say" role="status">that link has run out. send another.</p>
        ) : (
          <>
            <p className="wl-rp-school-say">
              a link is on its way to <span className="wl-h">{sent.email}</span>.{' '}
              tap the link in the mail.
            </p>
            <p className="wl-rp-wait" role="status"><Wait scale={2} /> waiting for the link</p>
          </>
        )}
        {fault ? <p className="wl-rp-fault" role="alert">{fault}</p> : null}
        {/* at once when the link has run out or went elsewhere: there is
            nothing to wait for */}
        <ResendLink key={out || away ? 'out' : 'wait'} onSend={again} wait={out || away ? 0 : 30} />
        <button
          type="button" className="wl-quiet wl-rp-again"
          onClick={() => { setStep('ask'); setSent(null); setOut(false); setAway(false); setFault('') }}
        >
          use a different address
        </button>
      </div>
    )
  }
  return (
    <div className="wl-rp-school wl-low-row">
      <p className="wl-rp-school-say">
        replies come from school addresses, and stay anonymous. confirm yours to reply.
      </p>
      <EmailField
        value={email} onChange={(v) => { setEmail(v); if (fault) setFault('') }} onSubmit={send}
        label="your school address" placeholder="you@school.edu"
      />
      {fault ? <p className="wl-rp-fault" role="alert">{fault}</p> : null}
      <Pill tone="light" wide onClick={send} disabled={busy || !email.trim()} aria-busy={busy || undefined}>
        {busy ? 'sending' : 'send me the link'}
      </Pill>
      {/* The one person who replies with no school: the person the letter is
          to, once their Instagram is confirmed (terms.html#replies). Nothing
          else in the thread says so, and without it a recipient with no .edu
          reads that they cannot answer their own letter. */}
      {onTheirs ? (
        <button type="button" className="wl-quiet wl-rp-theirs" onClick={onTheirs}>
          is this letter to you? confirm your Instagram to answer as the recipient.
        </button>
      ) : null}
    </div>
  )
}

// ── the recipient's own row ─────────────────────────────────────────────────
// The feature this is for. The person the letter is to is told so, asked to
// answer, and given the two say-sos over the thread, each one tap and each
// undone by the same key. The first row of the sheet, over the replies.
//
// Each key says what it does, not what the state is called: `shut` and `put
// away` were near synonyms on two keys that looked alike, and what set them
// apart (no new replies, against nobody else seeing any) was only said after
// one was pressed. While the replies are out of sight there are no replies to
// stop, so the first key is not drawn at all rather than drawn dead.
//
// Answering is the tray's, at the foot of the sheet, like every reply: the
// row only says what an answer here is, and holds the two say-sos.
function Owner({ state, onSet, busy }) {
  const shut = state === 'locked'
  const away = state === 'closed'
  return (
    <div className="wl-rp-owner wl-low-row">
      <p className="wl-rp-owner-say">
        <span className="wl-rp-owner-h">this letter is to you.</span>{' '}
        {away
          ? 'only you can see the replies now.'
          : shut
            ? 'only you can reply now, and the ones here stay.'
            : 'answer it below, and your reply is marked as the recipient’s. nobody sees more than that.'}
      </p>
      <div className="wl-rp-owner-keys">
        {away ? null : (
          <button type="button" className="wl-rp-key" disabled={busy} onClick={() => onSet(shut ? 'open' : 'locked')}>
            <PixIcon name="lock" scale={2} />
            <span>{shut ? 'let people reply again' : 'stop new replies'}</span>
          </button>
        )}
        <button type="button" className="wl-rp-key" disabled={busy} onClick={() => onSet(away ? 'open' : 'closed')}>
          <PixIcon name={away ? 'down' : 'close'} scale={2} />
          <span>{away ? 'show the replies' : 'hide all replies'}</span>
        </button>
      </div>
    </div>
  )
}

// ── a key of the tray ───────────────────────────────────────────────────────
// The chrome's own two keys: the bezel key, the panel with its light off
// and one pixel round it, or, for the one act the tray is for at that
// moment, the lit key, a chalk plate with the word struck out of it in
// black (phone.css). `back` marks the key that steps back inside the sheet,
// which Escape presses (Letter.jsx `onEscape`).
function TrayKey({ lit = false, back = false, busy = false, disabled = false, onClick, aria, glyph = '', children }) {
  return (
    <button
      type="button" className={`wl-tray-key${lit ? ' is-lit' : ''}`} onClick={onClick}
      disabled={disabled || busy} aria-label={aria || undefined} aria-busy={busy || undefined}
      data-low-back={back ? '' : undefined}
    >
      {busy ? <Wait scale={2} /> : (
        <>
          {glyph ? <PixIcon name={glyph} scale={2} /> : null}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}

// ── the sheet ───────────────────────────────────────────────────────────────
// What the key raises: a head that stays where it is (the grip, `replies`
// and its count, and a line when the thread is shut or put away), under it
// the list, the one thing on the sheet that scrolls, and at its foot the
// tray, the field you reply in with who you reply as and `send`, which
// rides up over a phone's keyboard. The grip is a key as well as the handle
// a thumb pulls the sheet down by: pressed, or reached from the keyboard, it
// lays the sheet down. In a wide room the grip is a close key at the head's
// end instead, since nothing there is pulled.
//
// ── why its foot is a tray and not a band of keys ──
// The lower half it was once ended in a band of soft keys, the screen's
// own, `reply` and `back`, and with the screen's band above it the open
// phone read as two phones stacked. The thread's foot is its composer, as
// every comment thread's is: the one you reply as, the field, and `send`
// beside it, lit only when there is something to send.
//
// It is in one of four modes, and the tray is what changes:
//
//   reading   the field, waiting    the thread, the recipient's row first
//   writing   who you are, what is  the field has the focus, or words in it
//             left, the field, send
//   terms     not now · agree       the terms in place of the thread
//   school    back to the replies   the school's link in place of the thread
//
// With no field to give (the replies shut, a school address wanted, a read
// that failed) the tray says so in one line, with the way on where there is
// one. Letter.jsx owns up and down (`onClose`), where the sheet stands, and
// every movement of it; every time it is raised it opens on the thread.
// While it is down it is `inert`, and while it is up the keyboard's Tab goes
// round inside it and never out onto the letter under it.
export function ThreadSheet({ letter, th, open = false, resting = true, reduce = false, go = null, onClose, style, kind, ref = null }) {
  const phone = usePhone()
  const [mode, setMode] = useState('read')
  const [wasOpen, setWasOpen] = useState(open)
  // the replies the sheet opened on, which come up in the opening's stagger;
  // one that comes after them while it is up arrives on its own (`fresh`)
  const [first, setFirst] = useState(null)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setMode('read')
    else setFirst(null)
  }
  if (open && first === null && th.ok) setFirst(new Set(th.rows.map((r) => r.id)))
  const low = useRef(null)
  const list = useRef(null)
  const field = useRef(null)
  const head = useRef(null)
  // the root, for Letter.jsx as well, which moves it
  const setRoot = useCallback((el) => {
    low.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }, [ref])

  // the removed replies of theirs that were on the sheet while it was up,
  // remembered as read once it goes down (`goneSeen`, above). On the sheet
  // means in the list's view, most of the row or as much of the list as it
  // fills: the thread opens at its top, oldest first, and a reply taken down
  // is usually further down than a glance goes
  const gone = useRef(new Set())
  const goneIds = th.rows.filter((r) => r.mine && r.status === 'removed').map((r) => r.id).join(' ')
  useEffect(() => {
    const el = list.current
    if (!open || !goneIds || (mode !== 'read' && mode !== 'write') || !el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const need = Math.min(e.boundingClientRect.height, e.rootBounds ? e.rootBounds.height : Infinity) * 0.6
      if (e.isIntersecting && e.intersectionRect.height >= need) gone.current.add(e.target.dataset.id)
    }), { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] })
    el.querySelectorAll('.wl-rp-item.is-mine.is-removed[data-id]').forEach((row) => io.observe(row))
    return () => io.disconnect()
  }, [open, mode, goneIds])
  useEffect(() => {
    if (!open) return undefined
    const seen = gone.current
    return () => { markGone([...seen]); seen.clear() }
  }, [open])

  // ── the words ──
  // A refusal (the reading's, or the list's on the server) is about these
  // words, so `send` waits for them to change: pressed again on the same
  // words it would only be refused again, and a refusal counts against the
  // throttle. The first edit clears the line, and the key with it. A send
  // that did not go through is not a refusal, and says to send it again.
  //
  // The terms are agreed once, and this remembers it. The server keeps the
  // agreement with the first reply it stores, a refused one included, and
  // with the first reply the list catches (celestual-wall-reply), but the
  // thread's `me.terms` is only read again when a reply goes up. So a first
  // reply that was refused, edited and sent again carries the agreement with
  // it rather than raising the terms a second time.
  const [body, setBodyNow] = useState(() => DRAFTS.get(letter.id) || '')
  const setBody = (v) => {
    setBodyNow(v)
    if (v) DRAFTS.set(letter.id, v)
    else DRAFTS.delete(letter.id)
  }
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState(null)   // { tone: 'ok'|'hold'|'no', text, refused? }
  const nonce = useRef(freshNonce())
  const agreed = useRef(false)
  const fault = replyFault(body)
  const left = MAX - body.length
  const empty = !body.trim()
  const me = th.me
  const t = th.t

  const toEnd = (smooth = true) => {
    const el = list.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' })
  }
  // A step back inside the sheet takes away what had the focus when it was
  // taken by a key on the keyboard (Escape in the field, or out of the
  // terms), and the focus would fall to the page, off the sheet and out of
  // the letter. So it is kept on the sheet: on the field when the step is to
  // the words, and on the list when it is to the thread, where a second
  // Escape lays the sheet down and hands the focus to its key.
  const hadFocus = useRef(false)
  const keepFocus = () => { hadFocus.current = !!(low.current && low.current.contains(document.activeElement)) }
  useEffect(() => {
    if (mode === 'terms' && head.current) head.current.focus({ preventScroll: true })
    if (mode === 'terms' || mode === 'school') { if (list.current) list.current.scrollTop = 0 }
    if (hadFocus.current) {
      hadFocus.current = false
      const a = document.activeElement
      const to = mode === 'write' ? field.current : list.current
      if ((!a || a === document.body) && to) to.focus({ preventScroll: true })
    }
  }, [mode])

  const send = async (accept = false) => {
    if (busy || empty || fault || said?.refused) return
    if (accept) agreed.current = true
    const yes = accept || agreed.current
    if (!me.terms && !yes) { setMode('terms'); return }
    setBusy(true)
    setSaid(null)
    const out = await sendReply({ letter: letter.id, body, nonce: nonce.current, accept: yes })
    setBusy(false)
    if (out && out.ok) {
      // a fresh draft either way; a refused one keeps its words to be changed
      nonce.current = freshNonce()
      if (out.status === 'rejected') {
        setMode('write')
        setSaid({ tone: 'no', refused: true, text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
        return
      }
      setBody('')
      setMode('read')
      // the keys go down, so the reply that just went up is seen landing
      if (field.current) field.current.blur()
      th.say(out.status === 'live' ? 'it’s up.' : (out.say || 'it’s being read. others see it once it passes.'), letter.id)
      await th.load()
      requestAnimationFrame(() => toEnd())
      return
    }
    const e = out?.error
    if (e === 'terms') { setMode('terms'); return }
    setMode('write')
    if (e === 'caught') {
      nonce.current = freshNonce()
      setSaid({ tone: 'no', refused: true, text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
      return
    }
    if (e === 'throttle') { setSaid({ tone: 'no', text: 'that is a lot of replies. give it a few minutes.' }); return }
    if (e === 'locked' || e === 'closed' || e === 'edu' || e === 'gone') { setMode('read'); th.load(); return }
    setSaid({ tone: 'no', text: 'it did not go through. give it a moment, then send it again.' })
  }

  const verified = useCallback(async () => {
    await refreshMe()
    await th.load()
    setMode('write')
    // the keyboard only on a fine pointer: this is not inside a press
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) setTimeout(() => field.current && field.current.focus({ preventScroll: true }), 60)
  }, [th])

  // ── what the list holds ──
  const rows = th.rows
  const canWrite = th.canWrite
  let inside
  if (mode === 'terms') {
    inside = <TermsBody recipient={!!me.recipient} headRef={head} />
  } else if (mode === 'school') {
    inside = (
      <School
        letter={letter.id}
        onVerified={verified}
        onTheirs={th.toAt && !me.recipient && go ? () => go('claim', letter.to) : null}
      />
    )
  } else if (!t) {
    inside = <div className="wl-low-still wl-low-row"><Wait scale={3} /></div>
  } else if (!t.ok) {
    inside = <div className="wl-low-still wl-low-row"><span>the replies did not load.</span></div>
  } else {
    inside = (
      <>
        {me.recipient && th.toAt ? (
          <Owner state={th.state} onSet={th.set} busy={th.setting} />
        ) : null}
        {th.hiddenFromMe ? (
          <div className="wl-rp-empty wl-low-row is-away">
            <PixIcon name="lock" scale={3} className="wl-rp-empty-g" />
            <span className="wl-rp-empty-say">the person this letter is to put the replies away.</span>
          </div>
        ) : rows.length ? (
          <ol className="wl-rp-list">
            {rows.map((r, i) => (
              <Reply
                key={r.id} r={r} i={i} letter={letter} name={th.names.get(r.who) || ''}
                onLike={th.like} onReport={th.report} onUndo={th.undo}
                reported={th.reports[r.id] || (r.reported ? 'on' : '')} liking={!!th.liking[r.id]}
                fresh={!!first && !first.has(r.id)}
              />
            ))}
          </ol>
        ) : (
          <div className="wl-rp-empty wl-low-row">
            <PixIcon name="env" scale={3} className="wl-rp-empty-g" />
            <span className="wl-rp-empty-h">no replies yet.</span>
            <span className="wl-rp-empty-say">{canWrite ? 'be the first to reply.' : 'the first one will be here.'}</span>
          </div>
        )}
      </>
    )
  }

  // ── the tray, by mode ──
  const shutIt = () => onClose && onClose()
  const toRead = () => { keepFocus(); setMode('read'); if (said && said.tone !== 'no') setSaid(null) }
  const writing = mode === 'write'
  const name = th.names.get(me.who) || (me.who ? creatureOf(me.who).name : '')

  // what stands under the field: what was caught while it is typed, or what
  // the last send said
  const line = fault
    ? <p className="wl-rp-line is-no" role="alert">{fault}</p>
    : said ? <p className={`wl-rp-line is-${said.tone}`} role={said.tone === 'no' ? 'alert' : 'status'}>{said.text}</p> : null

  let tray = null
  if (mode === 'terms') {
    tray = (
      <div className="wl-tray-keys">
        <TrayKey back onClick={() => { keepFocus(); setMode('write') }} aria="not now, back to the words">not now</TrayKey>
        <TrayKey lit busy={busy} onClick={() => send(true)} aria="agree to the terms for replying, and send">agree and send</TrayKey>
      </div>
    )
  } else if (mode === 'school') {
    tray = (
      <div className="wl-tray-keys">
        <TrayKey back glyph="back" onClick={toRead} aria="back to the replies">back to the replies</TrayKey>
      </div>
    )
  } else if (t && !t.ok) {
    tray = (
      <div className="wl-tray-note">
        <span>the replies did not load.</span>
        <TrayKey onClick={th.retry} aria="load the replies again">try again</TrayKey>
      </div>
    )
  } else if (t && !th.hiddenFromMe && canWrite) {
    // the field is always the field: a finger on it is the focus a phone
    // raises its keys for, and focus is what turns reading into writing
    tray = (
      <div className="wl-tray-write">
        {writing ? (
          <div className="wl-low-as">
            {me.recipient ? (
              <span>as <span className="wl-rp-as-badge">the recipient</span></span>
            ) : name ? (
              <span>as <span className="wl-h">{name}</span></span>
            ) : <span />}
            <span className={`wl-low-left${left < 30 ? ' is-low' : ''}`} aria-hidden="true">{left}</span>
          </div>
        ) : null}
        <div className="wl-tray-row">
          <span className="wl-tray-me" aria-hidden="true">
            {me.recipient ? <Face handle={letter.to} size={PIC} /> : me.who ? <Creature who={me.who} size={PIC} box={PIC} mono /> : null}
          </span>
          <div className={`wl-rp-field${fault ? ' is-caught' : ''}`}>
            <textarea
              ref={field} value={body} maxLength={MAX} rows={1}
              placeholder={me.recipient ? 'say it back' : 'reply to the letter'}
              aria-label={me.recipient ? 'your reply, as the recipient' : 'your reply'}
              spellCheck="true" enterKeyHint="send"
              onFocus={() => { if (mode === 'read') { setMode('write'); toEnd() } }}
              onBlur={() => { if (!body.trim() && !said) setMode('read') }}
              onChange={(e) => {
                setBody(e.target.value)
                if (mode !== 'write') setMode('write')
                if (said && said.tone !== 'hold') setSaid(null)
              }}
              onKeyDown={(e) => {
                // the letter's arrows turn the deck (Letter.jsx); in here
                // they move the caret
                if (e.key.startsWith('Arrow')) e.stopPropagation()
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
                // Escape leaves the words, kept, and not the sheet
                if (e.key === 'Escape') {
                  e.preventDefault(); e.stopPropagation()
                  setMode('read')
                  if (list.current) list.current.focus({ preventScroll: true })
                }
              }}
            />
            {phone ? <Caret of={field} /> : null}
          </div>
          <button
            type="button" className="wl-tray-send" onClick={() => send()}
            disabled={busy || empty || !!fault || !!said?.refused} aria-busy={busy || undefined}
            aria-label={me.recipient ? 'send your reply, as the recipient' : 'send your reply'}
          >
            {busy ? <Wait scale={2} /> : <PixIcon name="send" scale={2} />}
          </button>
        </div>
        {line}
      </div>
    )
  } else if (t && !th.hiddenFromMe && me.why === 'edu') {
    tray = (
      <div className="wl-tray-note">
        <PixIcon name="key" scale={2} />
        <span>replies come from school emails, and stay anonymous.</span>
        <TrayKey lit onClick={() => setMode('school')} aria="reply: confirm a school address first">reply</TrayKey>
      </div>
    )
  } else if (t && !th.hiddenFromMe && me.why === 'locked') {
    tray = (
      <div className="wl-tray-note">
        <PixIcon name="lock" scale={2} />
        <span>the person this letter is to shut the replies. the ones here stay.</span>
      </div>
    )
  }

  // ── the head ──
  // `replies` and how many, the count in the chrome's second grey, and the
  // thread's state in one line under it when it is not simply open
  const n = th.ok && !th.hiddenFromMe ? th.count : 0
  const state = th.ok ? (th.away ? 'put away' : th.shut ? 'shut to new replies' : '') : ''
  const titleId = `wl-th-h-${letter.id}`

  // ── the keyboard's Tab, round the sheet ──
  // The letter under an open sheet is still on the page, and a Tab off the
  // sheet's last key went on into it, to keys covered by the sheet or dimmed
  // behind it. So Tab goes round: past the last key to the first, and back
  // from the first to the last. The page itself is not made `inert`, which
  // restyled every element on it (index.jsx says so).
  const onKey = (e) => {
    if (e.key !== 'Tab' || !open) return
    const el = low.current
    if (!el) return
    const keys = [...el.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
      .filter((k) => !k.disabled && k.getClientRects().length)
    if (!keys.length) return
    const a = document.activeElement
    const firstKey = keys[0]
    const lastKey = keys[keys.length - 1]
    // the focus can stand on the sheet somewhere that is not a stop of its
    // own (the list, which a press puts it on), and from there Tab went on
    // out onto the letter under it: past the last stop forward, or before
    // the first backward, is the end of the ring too
    const past = !keys.includes(a) && el.contains(a) && !!(lastKey.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)
    const before = !keys.includes(a) && el.contains(a) && !!(firstKey.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING)
    if (e.shiftKey ? (a === firstKey || before || !el.contains(a)) : (a === lastKey || past || !el.contains(a))) {
      e.preventDefault()
      ;(e.shiftKey ? lastKey : firstKey).focus({ preventScroll: true })
    }
  }

  return (
    <div
      ref={setRoot}
      className={`wl-th is-${mode}${open ? ' is-open' : ''}`} id={`wl-low-${letter.id}`}
      data-kind={kind} style={style}
      role="dialog" aria-modal={open ? 'true' : undefined} aria-labelledby={titleId}
      inert={open || !resting ? undefined : true} aria-hidden={open ? undefined : 'true'}
      onKeyDown={onKey}
    >
      <div className="wl-th-head">
        <button type="button" className="wl-th-grip" onClick={shutIt} aria-label="shut the replies">
          <span aria-hidden="true" />
        </button>
        <div className="wl-th-top">
          <h2 className="wl-th-title" id={titleId}>
            replies{n ? <span className="wl-th-n">{` ${n}`}</span> : null}
          </h2>
          <button type="button" className="wl-th-x" onClick={shutIt} aria-label="shut the replies">
            <PixIcon name="close" scale={2} />
          </button>
        </div>
        {state ? <p className="wl-th-state">{state}</p> : null}
      </div>
      {/* named for what it holds, and not by the key that opens it: the
          key's name ends in what pressing it does, and while the options
          are up the key is `back` and not there to name anything */}
      <div
        className="wl-low-list" ref={list} tabIndex={-1} role="region"
        aria-label={mode === 'terms' ? 'the terms for replying' : mode === 'school' ? 'your school' : threadName(th)}
      >
        {inside}
      </div>
      {th.note ? <p className="wl-low-said" role="status">{th.note}</p> : null}
      {tray ? <div className={`wl-tray is-${mode}`}>{tray}</div> : null}
    </div>
  )
}

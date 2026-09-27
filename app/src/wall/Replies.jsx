// ── the replies, the phone's lower half ─────────────────────────────────────
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
// In the phone. Every letter on the sheet is a slider phone: the screen, and
// fixed to its foot an unlit chin with the thumb ridges on it (`Chin`), which
// carries what the thread's head used to (the count, who answered, and a
// light in the letter's own colour when the person it is to has). The thread
// is the phone's lower half (`Slide`). It sits behind the screen, and a press
// on the chin, or the screen pushed up, slides it out from under the chin:
// the same glass, the same width, in the same plane, ending in a band of its
// own soft keys, `reply` on the left and `back` on the right. Closed, the
// phone is the letter with a lip; open, it is one tall handset, and nothing
// else stands under it. Screens/Letter.jsx moves it (the handset, and what a
// turn of the deck does to an open one); this file draws it and holds the
// thread's state.
//
// It was a separate unlit panel eighteen pixels under the letter, a web page
// under a photographed phone, and the whole sheet scrolled to reach it: the
// deck turned sideways with a vertical tail hanging off it, and the owner
// read that as geometrically messy and unsmooth. A thread folded into the
// letter's own glass was weighed too, and it is a letter that scrolls, with
// the words somebody wrote pushed off their own screen by the answers.
//
// Only three things in it are lit: the letter's screen above it, a writer's
// creature (avatars.js), which is a small screen as a face is, and the
// recipient's reply, lit in the letter's own colour, because it is the letter
// answering. The chin's light is that reply's light, seen shut.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Face, EmailField, Pill, usePhone } from './parts.jsx'
import { PixIcon, Wait } from './screen.jsx'
import { Caret } from './caret.jsx'
import { colourOf, stampOf } from './looks.js'
import { creatureOf, namesFor, inksOf } from './avatars.js'
import { replyFault, whyRefused } from './replies-check.js'
import {
  readThread, likeReply, reportReply, setThread, sendReply,
  sendSchoolLink, schoolLinkStatus, freshNonce,
} from './replies-api.js'
import { refresh as refreshMe, eduDomain } from './auth.js'
import { isNameKey } from './data.js'
import { ResendLink } from './linkdoor.jsx'
import './replies.css'

const MAX = 280

// ── what is kept while the tab is open ──
// A reply being written, by letter, so a turn of the deck or a shut phone
// never loses words; and the last thread read, by letter, so a card turned
// back to has its count on its chin at once, and asks again behind it.
const DRAFTS = new Map()
const KEPT = new Map()
// the answers that mean there is no thread to draw: a deploy without the
// replies, no connection to one, or a letter that is not up. The chin is
// then only its ridges, which every phone has, so nothing changes height
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
// is square and every edge is sharp.
export function Creature({ who, size = 39, className = '' }) {
  const c = creatureOf(who)
  const px = Math.max(1, Math.round(size / 13))
  const s = px * 13
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
      className={`wl-rp-av ${className}`}
      style={{ '--s': `${s}px`, '--av-panel': c.inks.panel, '--av-hi': c.inks.hi }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 13 13" width={s} height={s} shapeRendering="crispEdges" focusable="false">
        {mid ? <path d={mid} fill={c.inks.mid} /> : null}
        <path d={ink} fill={c.inks.ink} />
      </svg>
    </span>
  )
}

// The letter's own inks, for what is lit in its colour: the recipient's
// reply, their row, and the light on the chin that says they answered.
function litVars(letter) {
  const k = inksOf(colourOf(letter.look, letter.id))
  return {
    '--rp-panel': k.panel, '--rp-hi': k.hi, '--rp-ink': k.ink, '--rp-mid': k.mid,
    // a dark panel (the negative) is edged and lit by its words' light
    ...(k.dark ? { '--rp-edge': 'rgba(237, 237, 237, 0.34)', '--rp-glow': k.glow } : null),
  }
}

// ── the thread ──────────────────────────────────────────────────────────────
// Everything the thread holds, for the letter on the glass: the read, and
// again when the tab comes back to the front; a like drawn at once and
// corrected by the answer; a report in one tap with its undo; the
// recipient's say; and the line about what just happened, which goes after
// a few seconds. `letter` is null for a screen that is not the card, which
// asks for nothing. Keyed by the letter inside, so the card a turn lands on
// starts from what was last read of it (`KEPT`).
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
    setLikes({}); setLiking({}); setReports({}); setNote('')
  }
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const at = useRef(id)
  at.current = id

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
    const out = await reportReply(r.id, true)
    if (!alive.current) return
    if (out && out.ok) setReports((m) => ({ ...m, [r.id]: 'on' }))
    else {
      setReports((m) => { const n = { ...m }; delete n[r.id]; return n })
      setNote('the report did not go through. try again')
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
    setSetting(true)
    const out = await setThread(id, state)
    if (!alive.current) return
    setSetting(false)
    if (out && out.ok) {
      setNote(state === 'locked' ? 'nobody else can reply now. the ones here stay.'
        : state === 'closed' ? 'nobody else can see the replies now.'
          : before === 'closed' ? 'everybody can see the replies again.' : 'people can reply again.')
      await load()
    } else setNote('that did not go through. try again')
  }

  const retry = () => { setT(null); load() }

  // what the chin and the lower half read off it
  const on = !!id && !(t && !t.ok && NONE.has(t.error))
  const ok = !!(t && t.ok)
  const me = (ok && t.me) || {}
  const state = (ok && t.state) || 'open'
  const away = state === 'closed'
  const shut = state === 'locked'
  const rows = ok ? (t.replies || []).map((r) => (likes[r.id] ? { ...r, ...likes[r.id] } : r)) : []
  const names = namesFor([...rows.filter((r) => !r.recipient).map((r) => r.who), me.who].filter(Boolean))
  const hiddenFromMe = away && !me.recipient
  // who answered, for the chin: the recipient first when they have, then the
  // newest of the rest, three in all
  const stack = []
  const theirs = rows.find((r) => r.recipient && r.status === 'live')
  if (theirs) stack.push({ k: '@', r: theirs })
  for (const r of [...rows].reverse()) {
    if (stack.length === 3) break
    if (r.status !== 'live' || r.recipient || stack.some((s) => s.k === r.who)) continue
    stack.push({ k: r.who, r })
  }
  return {
    id, t, on, ok, load, retry, me, state, away, shut, rows, names, hiddenFromMe, stack,
    count: (ok && t.count) || 0,
    answered: !!(ok && t.recipient_replied && !hiddenFromMe),
    canWrite: !!me.can,
    toAt: !!letter && !isNameKey(letter.to),
    like, report, undo, reports, liking, set, setting, note, setNote,
  }
}

// ── the chin ────────────────────────────────────────────────────────────────
// The unlit strip fixed to the screen's foot, where a thumb pushes a slider
// phone open: three ridges in the middle, the count on the left, and on the
// right who answered, the recipient's face first, with the phone's message
// light beside them, lit steady in the letter's colour once the person it is
// to has answered. It does not blink: a blink would be urgency.
//
// Every screen on the strip has one, the neighbours asleep with only their
// ridges, and a letter with no thread behind it (a deploy without the
// replies, or no connection) has only the ridges too, so the phone is one
// height whatever the thread answers. It is the thread's one count: the
// lower half has no head, because the chin is its head.
export function Chin({ letter, th = null, open = false, onToggle, id }) {
  const grip = <span className="wl-chin-grip" aria-hidden="true"><i /><i /><i /></span>
  if (!letter || !th || !th.on) return <div className="wl-chin is-bare" aria-hidden="true">{grip}</div>
  const t = th.t
  let say
  let aria
  if (!t) {
    say = <Wait scale={2} className="wl-chin-wait" />
    aria = 'replies'
  } else if (!t.ok) {
    say = 'replies'
    aria = 'replies'
  } else if (th.hiddenFromMe) {
    say = <><PixIcon name="lock" scale={2} className="wl-chin-lock" />replies</>
    aria = 'replies, put away'
  } else {
    const n = th.count
    say = n ? `${n} ${n === 1 ? 'reply' : 'replies'}` : th.canWrite ? 'reply' : 'replies'
    aria = `${n ? `${n} ${n === 1 ? 'reply' : 'replies'}` : 'replies'}${th.answered ? ', the recipient replied' : ''}${th.shut ? ', shut' : ''}`
  }
  const lit = th.answered
  return (
    <button
      type="button" className={`wl-chin${open ? ' is-open' : ''}${lit ? ' is-lit' : ''}`}
      id={id} aria-expanded={open} aria-controls={`wl-low-${letter.id}`} aria-label={aria}
      onClick={onToggle} style={lit ? litVars(letter) : undefined}
    >
      <span className="wl-chin-n" aria-hidden="true">{say}</span>
      {grip}
      <span className="wl-chin-end" aria-hidden="true">
        {t && t.ok && !th.hiddenFromMe && th.stack.length ? (
          <span className="wl-rp-stack">
            {th.stack.map((s) => (s.r.recipient
              ? <Face key="@" handle={letter.to} size={26} className="wl-rp-stack-face" />
              : <Creature key={s.k} who={s.r.who} size={26} />))}
          </span>
        ) : null}
        {th.shut && !th.hiddenFromMe ? <PixIcon name="lock" scale={2} className="wl-chin-lock" /> : null}
        {lit ? <span className="wl-chin-led" /> : null}
      </span>
    </button>
  )
}

// ── one reply ───────────────────────────────────────────────────────────────
// Its picture, and beside it one meta row (the name, `you`, when, and at the
// row's end its like and its flag), then the words. The acts ride the meta
// row so a reply is two lines and not three, and two and a half of them
// stand in the lower half of a phone at once.
function Reply({ r, letter, name, onLike, onReport, onUndo, reported, liking }) {
  const rec = r.recipient
  const live = r.status === 'live'
  const down = reported && live
  if (down) {
    // reported by this device: folded away, in the letter report's words,
    // with the way back
    return (
      <li className="wl-rp-item is-folded">
        <PixIcon name="flag" scale={2} className="wl-rp-fold-g" />
        <span className="wl-rp-fold-say">reported. a person will review it.</span>
        <button type="button" className="wl-rp-undo" onClick={() => onUndo(r)} disabled={reported === 'busy'}>undo</button>
      </li>
    )
  }
  const likes = r.likes || 0
  return (
    <li
      className={`wl-rp-item${rec ? ' is-recipient' : ''}${r.mine ? ' is-mine' : ''}${live ? '' : ` is-${r.status}`}`}
      style={rec ? litVars(letter) : undefined}
    >
      <span className="wl-rp-pic">
        {rec ? <Face handle={letter.to} size={39} /> : <Creature who={r.who} size={39} />}
      </span>
      <div className="wl-rp-main">
        <div className="wl-rp-meta">
          {rec ? <span className="wl-rp-badge">recipient</span> : <span className="wl-rp-name">{name}</span>}
          {r.mine ? <span className="wl-rp-you">you</span> : null}
          <span className="wl-rp-when">{when(r.at)}</span>
          {live ? (
            <span className="wl-rp-acts">
              <button
                type="button" className={`wl-rp-like${r.liked ? ' is-on' : ''}`}
                onClick={() => onLike(r)} aria-pressed={!!r.liked} disabled={liking}
                aria-label={`${r.liked ? 'take your like off this reply' : 'like this reply'}${likes ? `, ${likes === 1 ? 'one like' : `${likes} likes`}` : ''}`}
              >
                <PixIcon name={r.liked ? 'heart' : 'heartO'} scale={2} />
                <span className="wl-rp-n">{likes ? likes : ''}</span>
              </button>
              {r.mine ? null : (
                <button type="button" className="wl-rp-flag" onClick={() => onReport(r)} aria-label="report this reply">
                  <PixIcon name="flag" scale={2} />
                </button>
              )}
            </span>
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
    </li>
  )
}

// ── the terms, before the first reply ───────────────────────────────────────
// Read in the lower half itself, in place of the thread, and not on a sheet
// over the letter: what anonymous means here, the three things a reply may
// not do, and what abuse costs, with the whole terms a link away. Its keys
// are the phone's, `agree` on the left, which sends the reply it was raised
// for, and `not now` on the right, which goes back to the words. Accepted
// once, on the server, with that reply.
//
// The person the letter is to reads words of their own at the same moment.
// Their reply is not anonymous (it is lit and marked as theirs), it comes
// from no school, and the school's line would be a threat about an
// institution they never gave us, raised at the very moment the thread asks
// them to answer. So for them the head says what their reply is, and what
// abuse costs is what it can cost them: the reply, and replying.
function TermsBody({ recipient = false, headRef }) {
  return (
    <div className="wl-rp-terms">
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
// The composer's magic link (docs/ONE-WALL.md), in the lower half in place of
// the thread, worded for a proof with nothing waiting on it, and in the
// composer's words for the same act (screens/Write.jsx, the Berkeley door):
// `send me the link`, the number, `waiting for the link`, `send it again`,
// `use a different address`. The link is tapped wherever the mail is opened,
// and this device is asked every few seconds whether it has been, and again
// when it comes back to the front.
//
// ── the number ──────────────────────────────────────────────────────────────
// Shown here and nowhere else. The mail does not print it: a link opened on
// a device that is not this one asks for it (screens/Verify.jsx), so a link
// somebody is sent without asking for it signs nobody in. So the number is
// labelled as theirs, and the line says when they will need it.
//
// ── asked, and asked again ──────────────────────────────────────────────────
// A second link is a second request with a number of its own, and this form
// watches the newest. The first is still good for its half hour, and it is
// usually the one that is tapped (it came late, which is why a second was
// asked for). So each time the newest has not been tapped, this device's own
// answer is asked for too (auth.js `refresh`): a school address on it now,
// from any of the links this form sent, opens replying the same.
//
// A link that has run out, or that a wrong number spent on another device,
// is said so, with the way to another.
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

function School({ onVerified, onTheirs }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('ask')     // ask · sent
  const [busy, setBusy] = useState(false)
  const [fault, setFault] = useState('')
  const [sent, setSent] = useState(null)      // { request, match, email, at, again }
  const [out, setOut] = useState(false)       // the newest link ran out, or was spent

  // one link to one address; the fault said here when none went out
  const mail = async (e) => {
    const got = await sendSchoolLink(e)
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
    setSent({ request: got.request, match: got.match, email: e, at: Date.now(), again: false })
    setOut(false)
    setStep('sent')
  }

  // the same address again (linkdoor.jsx `ResendLink` asks, and waits before
  // it offers); false when nothing went out, so its clock does not start
  const again = async () => {
    if (!sent) return false
    setFault('')
    const got = await mail(sent.email)
    if (!got) return false
    setSent({ request: got.request, match: got.match, email: sent.email, at: Date.now(), again: true })
    setOut(false)
    return true
  }

  useEffect(() => {
    if (step !== 'sent' || !sent?.request || out) return undefined
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
  }, [step, sent, out, onVerified])

  if (step === 'sent' && sent) {
    const n = sent.match
    return (
      <div className="wl-rp-school is-sent">
        {out ? (
          <p className="wl-rp-school-say" role="status">that link has run out. send another.</p>
        ) : (
          <>
            <p className="wl-rp-school-say">
              a link is on its way to <span className="wl-h">{sent.email}</span>.{' '}
              tap the link in the mail.
              {n != null ? ' on another phone or computer, it asks for this number.' : ''}
            </p>
            {n != null ? (
              <div className="wl-edu-match" role="group" aria-label={`your number is ${n}`}>
                <span className="wl-edu-match-lab" aria-hidden="true">your number</span>
                <span className="wl-edu-match-n" aria-hidden="true">{n}</span>
              </div>
            ) : null}
            <p className="wl-rp-wait" role="status"><Wait scale={2} /> waiting for the link</p>
          </>
        )}
        {fault ? <p className="wl-rp-fault" role="alert">{fault}</p> : null}
        {/* at once when the link has run out: there is nothing to wait for */}
        <ResendLink key={out ? 'out' : 'wait'} onSend={again} wait={out ? 0 : 30} />
        <button
          type="button" className="wl-quiet wl-rp-again"
          onClick={() => { setStep('ask'); setSent(null); setOut(false); setFault('') }}
        >
          use a different address
        </button>
      </div>
    )
  }
  return (
    <div className="wl-rp-school">
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
// undone by the same key. The first row of the lower half, over the replies.
//
// Each key says what it does, not what the state is called: `shut` and `put
// away` were near synonyms on two keys that looked alike, and what set them
// apart (no new replies, against nobody else seeing any) was only said after
// one was pressed. While the replies are out of sight there are no replies to
// stop, so the first key is not drawn at all rather than drawn dead.
function Owner({ state, onReply, onSet, busy, letter }) {
  const shut = state === 'locked'
  const away = state === 'closed'
  return (
    <div className="wl-rp-owner" style={litVars(letter)}>
      <p className="wl-rp-owner-say">
        <span className="wl-rp-owner-h">this letter is to you.</span>{' '}
        {away
          ? 'only you can see the replies now.'
          : shut
            ? 'only you can reply now, and the ones here stay.'
            : 'answer it here, and your reply is marked as the recipient’s. nobody sees more than that.'}
      </p>
      <div className="wl-rp-owner-keys">
        {away ? null : (
          <Pill tone="light" onClick={onReply} className="wl-rp-owner-go">reply as the recipient</Pill>
        )}
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

// ── a soft key of the lower half ──
// The phone's own, on its unlit band: the word in the one face, lit behind
// under a mouse and dimmed under a finger as the screen's keys are, with the
// hourglass in the word's place while what it asked for is out.
function Key({ side, k }) {
  if (!k) return <span className={`wl-low-sk is-${side} is-empty`} aria-hidden="true" />
  return (
    <button
      type="button" className={`wl-low-sk is-${side}`} onClick={k.onClick}
      disabled={k.disabled || k.busy} aria-label={k.aria || undefined} aria-busy={k.busy || undefined}
    >
      {k.busy ? <Wait scale={2} /> : k.label}
    </button>
  )
}

// ── the lower half ──────────────────────────────────────────────────────────
// What slides out from under the chin: the thread, a scroller that is the
// phone's list, and under it the band of soft keys. It is in one of four
// modes, each with its keys, the act on the left and the way back on the
// right, as the screen's own menus have them:
//
//   reading   reply · back          the thread, the recipient's row first
//   writing   send · back           the field rises from behind the keys
//   terms     agree · not now       the terms in place of the thread
//   school    · back                the school's link in place of the thread
//
// `back` while reading shuts the phone; anywhere else it goes back to
// reading, the words kept. Letter.jsx owns open and shut (`onClose`), and
// every time the phone is opened it opens on the thread.
export function Slide({ letter, th, open = false, reduce = false, go = null, onClose, labelId }) {
  const phone = usePhone()
  const [mode, setMode] = useState('read')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setMode('read')
  }
  const list = useRef(null)
  const field = useRef(null)
  const head = useRef(null)

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
  // Writing, from `reply`: the field is drawn and focused inside the same
  // press, since a phone raises its keyboard only for a focus the press
  // itself made
  const write = () => {
    flushSync(() => setMode('write'))
    if (field.current) field.current.focus({ preventScroll: true })
    toEnd()
  }
  useEffect(() => {
    if (mode === 'terms' && head.current) head.current.focus({ preventScroll: true })
    if (mode === 'terms' || mode === 'school') { if (list.current) list.current.scrollTop = 0 }
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
      th.setNote(out.status === 'live' ? 'it’s up.' : (out.say || 'it’s being read. others see it once it passes.'))
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
        onVerified={verified}
        onTheirs={th.toAt && !me.recipient && go ? () => go('claim', letter.to) : null}
      />
    )
  } else if (!t) {
    inside = <div className="wl-low-still"><Wait scale={2} /></div>
  } else if (!t.ok) {
    inside = <div className="wl-low-still"><span>the replies did not load.</span></div>
  } else {
    inside = (
      <>
        {me.recipient && th.toAt ? (
          <Owner state={th.state} onReply={write} onSet={th.set} busy={th.setting} letter={letter} />
        ) : null}
        {th.hiddenFromMe ? (
          <div className="wl-rp-note is-away">
            <PixIcon name="lock" scale={2} />
            <span>the person this letter is to put the replies away.</span>
          </div>
        ) : rows.length ? (
          <ol className="wl-rp-list">
            {rows.map((r) => (
              <Reply
                key={r.id} r={r} letter={letter} name={th.names.get(r.who) || ''}
                onLike={th.like} onReport={th.report} onUndo={th.undo}
                reported={th.reports[r.id] || (r.reported ? 'on' : '')} liking={!!th.liking[r.id]}
              />
            ))}
          </ol>
        ) : (
          <div className="wl-rp-empty">
            <span className="wl-rp-empty-h">no replies yet.</span>
            <span className="wl-rp-empty-say">{canWrite ? 'be the first to reply.' : 'the first one will be here.'}</span>
          </div>
        )}
        {!th.hiddenFromMe && me.why === 'locked' ? (
          <div className="wl-rp-note">
            <PixIcon name="lock" scale={2} />
            <span>the person this letter is to shut the replies. the ones here stay.</span>
          </div>
        ) : null}
      </>
    )
  }

  // ── the keys, by mode ──
  const shutIt = () => onClose && onClose()
  const toRead = () => { setMode('read'); if (said && said.tone !== 'no') setSaid(null) }
  let keys
  if (mode === 'write') {
    keys = {
      l: { label: 'send', onClick: () => send(), busy, disabled: empty || !!fault || !!said?.refused, aria: me.recipient ? 'send your reply, as the recipient' : 'send your reply' },
      r: { label: 'back', onClick: toRead, aria: 'back to the replies, the words kept' },
    }
  } else if (mode === 'terms') {
    keys = {
      l: { label: 'agree', onClick: () => send(true), busy, aria: 'agree to the terms for replying, and send' },
      r: { label: 'not now', onClick: () => setMode('write'), aria: 'not now, back to the words' },
    }
  } else if (mode === 'school') {
    keys = { r: { label: 'back', onClick: toRead, aria: 'back to the replies' } }
  } else {
    const reply = t && t.ok && !th.hiddenFromMe
      ? (canWrite ? { label: 'reply', onClick: write, aria: me.recipient ? 'reply as the recipient' : 'reply to the letter' }
        : me.why === 'edu' ? { label: 'reply', onClick: () => setMode('school'), aria: 'reply: confirm a school address first' } : null)
      : t && !t.ok ? { label: 'try again', onClick: th.retry, aria: 'load the replies again' } : null
    keys = { l: reply, r: { label: 'back', onClick: shutIt, aria: 'shut the replies' } }
  }

  // what stands under the field: what was caught while it is typed, or what
  // the last send said
  const line = fault
    ? <p className="wl-rp-line is-no" role="alert">{fault}</p>
    : said ? <p className={`wl-rp-line is-${said.tone}`} role={said.tone === 'no' ? 'alert' : 'status'}>{said.text}</p> : null
  const name = th.names.get(me.who) || (me.who ? creatureOf(me.who).name : '')

  return (
    <div
      className={`wl-low is-${mode}`} id={`wl-low-${letter.id}`}
      inert={open ? undefined : true} aria-hidden={open ? undefined : 'true'}
    >
      <div className="wl-low-in">
        <div
          className="wl-low-list" ref={list} tabIndex={-1} role="region"
          aria-labelledby={mode === 'read' ? labelId : undefined}
          aria-label={mode === 'terms' ? 'the terms for replying' : mode === 'school' ? 'your school' : undefined}
        >
          {inside}
        </div>
        {th.note ? <p className="wl-low-said" role="status">{th.note}</p> : null}
        {mode === 'write' ? (
          <div className="wl-low-write">
            <div className="wl-low-as">
              {me.recipient ? (
                <>
                  <Face handle={letter.to} size={26} />
                  <span>as <span className="wl-rp-as-badge" style={litVars(letter)}>the recipient</span></span>
                </>
              ) : me.who ? (
                <>
                  <Creature who={me.who} size={26} />
                  <span>as <span className="wl-h">{name}</span></span>
                </>
              ) : <span />}
              <span className={`wl-low-left${left < 30 ? ' is-low' : ''}`} aria-hidden="true">{left}</span>
            </div>
            <div className={`wl-rp-field${fault ? ' is-caught' : ''}`}>
              <textarea
                ref={field} value={body} maxLength={MAX} rows={1}
                placeholder={me.recipient ? 'say it back' : 'reply to the letter'}
                aria-label={me.recipient ? 'your reply, as the recipient' : 'your reply'}
                spellCheck="true" enterKeyHint="send"
                onChange={(e) => { setBody(e.target.value); if (said && said.tone !== 'hold') setSaid(null) }}
                onKeyDown={(e) => {
                  // the letter's arrows turn the deck (Letter.jsx); in here
                  // they move the caret
                  if (e.key.startsWith('Arrow')) e.stopPropagation()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
                  // Escape leaves the words and not the phone
                  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); toRead() }
                }}
              />
              {phone ? <Caret of={field} /> : null}
            </div>
            {line}
          </div>
        ) : null}
        <div className="wl-low-foot">
          <Key side="l" k={keys.l} />
          <Key side="r" k={keys.r} />
        </div>
      </div>
    </div>
  )
}

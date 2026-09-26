// ── the replies, under a letter ─────────────────────────────────────────────
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
// Under the phone, in the phone's own language, and not on its screen. The
// screen is the letter: its status rows, its words and three soft keys, and
// a thread folded into it would be a letter that scrolls, with the words
// somebody wrote pushed off its own glass by the answers to them. A separate
// clean panel of the kind every other app draws under a post would be the
// one thing in the black room that is not the phone (DESIGN.md 2.6). So the
// thread is what an old phone drew under a message it had kept: an unlit
// panel of the same glass, with the pixel grid and the one pixel bezel, its
// head a status row (`replies`, the count, who answered), and each reply a
// message in Jersey with its sender's picture on a small screen beside it.
// Only two things in it are lit: a writer's creature (avatars.js), which is
// a small screen as a face is, and the recipient's reply, which is lit in
// the letter's own colour, because it is the letter answering.
//
// The letter stays where it always stood. The sheet scrolls once there is a
// thread under it (replies.css), with the phone and the thread's head
// centred together in the first screenful, so the count and who answered are
// in sight without a scroll and the replies are one thumb away.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pill, Face, EmailField, usePhone } from './parts.jsx'
import { PixIcon, Wait } from './screen.jsx'
import { Caret } from './caret.jsx'
import { colourOf, stampOf } from './looks.js'
import { creatureOf, namesFor, inksOf } from './avatars.js'
import { replyFault, whyRefused } from './replies-check.js'
import {
  readThread, likeReply, reportReply, setThread, sendReply,
  sendSchoolLink, schoolLinkStatus, freshNonce,
} from './replies-api.js'
import { refresh as refreshMe } from './auth.js'
import { isNameKey } from './data.js'
import './replies.css'

const MAX = 280

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
// reply and the line on the head that says they answered.
function litVars(letter) {
  const k = inksOf(colourOf(letter.look, letter.id))
  return {
    '--rp-panel': k.panel, '--rp-hi': k.hi, '--rp-ink': k.ink, '--rp-mid': k.mid,
    // a dark panel (the negative) is edged and lit by its words' light
    ...(k.dark ? { '--rp-edge': 'rgba(237, 237, 237, 0.34)', '--rp-glow': k.glow } : null),
  }
}

// ── one reply ───────────────────────────────────────────────────────────────
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
        </div>
        <p className="wl-rp-words">{r.body}</p>
        {r.status === 'held' ? (
          <p className="wl-rp-state"><Wait scale={2} /> being read. only you can see it until it passes.</p>
        ) : r.status === 'hidden' ? (
          <p className="wl-rp-state">out of sight while a person reviews it. only you can see it.</p>
        ) : r.status === 'removed' ? (
          <p className="wl-rp-state">taken down. it went against the terms for replying.</p>
        ) : null}
        {live ? (
          <div className="wl-rp-acts">
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
          </div>
        ) : null}
      </div>
    </li>
  )
}

// ── the terms, before the first reply ───────────────────────────────────────
// A sheet over the letter, in the phone's glass: what anonymous means here,
// the three things a reply may not do, and what abuse costs. Accepted once,
// on the server, with the reply it was raised for. Its own sheet rather than
// the letter's (parts.jsx `Sheet`), so the way out of it is not the way out
// of the letter: Escape and the black round it take this down and nothing
// under it.
function Terms({ onAgree, onClose, busy, host }) {
  const agree = useRef(null)
  useEffect(() => {
    const was = document.activeElement
    if (agree.current) agree.current.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (was && typeof was.focus === 'function') was.focus({ preventScroll: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const sheet = (
    <div className="wl-rp-terms" role="dialog" aria-modal="true" aria-labelledby="wl-rp-terms-h">
      <button type="button" className="wl-rp-terms-scrim" tabIndex={-1} aria-label="not now" onClick={onClose} />
      <div className="wl-rp-terms-sheet">
        <div className="wl-rp-terms-grip" aria-hidden="true"><span /></div>
        <p className="wl-rp-terms-kicker">before your first reply</p>
        <h2 className="wl-rp-terms-h" id="wl-rp-terms-h">anonymous to others.<br />not to us.</h2>
        <p className="wl-rp-terms-say">
          nobody reading sees who wrote a reply. celestual can see who wrote what, and acts on abuse.
        </p>
        <ul className="wl-rp-terms-list">
          <li>no naming or tagging anybody else. no @, no full names.</li>
          <li>nothing hateful or sexual about a person.</li>
          <li>no contact details, and nothing that says where somebody will be.</li>
        </ul>
        <p className="wl-rp-terms-cost">
          abuse has consequences: the reply comes down, you can lose replying and the wall, and where
          the law or your school&rsquo;s rules require it, we tell the school.
        </p>
        <a className="wl-rp-terms-link" href="/terms#replies" target="_blank" rel="noopener noreferrer">
          the terms for replying
          <PixIcon name="arrow" scale={2} />
        </a>
        <div className="wl-rp-terms-keys">
          <Pill tone="light" wide onClick={onAgree} disabled={busy} aria-busy={busy || undefined} ref={agree}>
            {busy ? 'sending' : 'agree and reply'}
          </Pill>
          <button type="button" className="wl-quiet wl-rp-terms-no" onClick={onClose}>not now</button>
        </div>
      </div>
    </div>
  )
  return host ? createPortal(sheet, host) : sheet
}

// ── a school address, for somebody who has none on this device ──────────────
// The composer's magic link (docs/ONE-WALL.md), inline, worded for a proof
// with nothing waiting on it. The link is tapped wherever the mail is opened,
// and this device is asked every few seconds whether it has been, and again
// when it comes back to the front.
function School({ onVerified }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('ask')     // ask · sent
  const [busy, setBusy] = useState(false)
  const [fault, setFault] = useState('')
  const [sent, setSent] = useState(null)      // { request, match, email }

  const send = async () => {
    const e = email.trim().toLowerCase()
    if (busy) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { setFault('that does not look like an email address.'); return }
    setBusy(true)
    setFault('')
    const out = await sendSchoolLink(e)
    setBusy(false)
    if (out && out.ok) { setSent({ request: out.request, match: out.match, email: e }); setStep('sent'); return }
    setFault({
      domain: 'that address is not a school’s. replies take an address that ends in .edu.',
      email: 'that does not look like an email address.',
      rate: 'that is a lot of links for one hour. try again later.',
      taken: 'that address belongs to another account.',
      offline: 'there is no connection. try again in a moment.',
    }[out?.error] || 'the email did not send. try again in a moment.')
  }

  useEffect(() => {
    if (step !== 'sent' || !sent?.request) return undefined
    let alive = true
    const ask = async () => {
      const out = await schoolLinkStatus(sent.request)
      if (alive && out && out.ok && out.verified) { alive = false; onVerified() }
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
  }, [step, sent, onVerified])

  if (step === 'sent' && sent) {
    return (
      <div className="wl-rp-school is-sent">
        <p className="wl-rp-school-say">
          a link is on its way to <span className="wl-h">{sent.email}</span>.
          {sent.match ? <> the mail says <span className="wl-h">{sent.match}</span>.</> : null}
          {' '}tap it on any device, and replying opens here.
        </p>
        <p className="wl-rp-wait"><Wait scale={2} /> waiting for the link</p>
        <button type="button" className="wl-quiet wl-rp-again" onClick={() => { setStep('ask'); setSent(null) }}>
          use another address
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
        {busy ? 'sending' : 'send the link'}
      </Pill>
    </div>
  )
}

// ── the field a reply is written in ─────────────────────────────────────────
function Compose({ me, letter, name, onSent, onTerms, inputRef }) {
  const phone = usePhone()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState(null)   // { tone: 'ok'|'hold'|'no', text }
  const nonce = useRef(freshNonce())
  const fault = replyFault(body)
  const left = MAX - body.length
  const empty = !body.trim()

  const send = async (accept = false) => {
    if (busy || empty) return
    if (fault) return
    if (!me.terms && !accept) { onTerms(() => send(true)); return }
    setBusy(true)
    setSaid(null)
    const out = await sendReply({ letter: letter.id, body, nonce: nonce.current, accept })
    setBusy(false)
    if (out && out.ok) {
      // a fresh draft either way; a refused one keeps its words to be changed
      nonce.current = freshNonce()
      if (out.status === 'rejected') {
        setSaid({ tone: 'no', text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
        return out
      }
      setBody('')
      setSaid(out.status === 'live'
        ? { tone: 'ok', text: 'it’s up.' }
        : { tone: 'hold', text: out.say || 'it’s being read. it shows here once it passes.' })
      onSent(out)
      return out
    }
    const e = out?.error
    if (e === 'terms') { onTerms(() => send(true)); return out }
    if (e === 'caught') {
      nonce.current = freshNonce()
      setSaid({ tone: 'no', text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
      return out
    }
    if (e === 'throttle') { setSaid({ tone: 'no', text: 'that is a lot of replies. give it a few minutes.' }); return out }
    if (e === 'locked' || e === 'closed' || e === 'edu' || e === 'gone') { onSent(out); return out }
    setSaid({ tone: 'no', text: 'it did not go through. give it a moment, then send it again.' })
    return out
  }

  // what stands under the field: what was caught while it is typed, what the
  // last send said, or how much is left
  const line = fault
    ? <span className="wl-rp-line is-no" role="alert">{fault}</span>
    : said
      ? <span className={`wl-rp-line is-${said.tone}`} role="status">{said.text}</span>
      : <span className={`wl-rp-line is-count${left < 30 ? ' is-low' : ''}`}>{left}</span>

  return (
    <div className="wl-rp-compose">
      <div className="wl-rp-as">
        {me.recipient ? (
          <>
            <Face handle={letter.to} size={26} />
            <span>you reply as <span className="wl-rp-as-badge" style={litVars(letter)}>recipient</span></span>
          </>
        ) : me.who ? (
          <>
            <Creature who={me.who} size={26} />
            <span>you reply as <span className="wl-h">{name}</span></span>
          </>
        ) : null}
      </div>
      <div className={`wl-rp-field${fault ? ' is-caught' : ''}`}>
        <textarea
          ref={inputRef} value={body} maxLength={MAX} rows={2}
          placeholder={me.recipient ? 'say it back' : 'reply to the letter'}
          aria-label={me.recipient ? 'your reply, as the recipient' : 'your reply'}
          spellCheck="true" enterKeyHint="send"
          onChange={(e) => { setBody(e.target.value); if (said && said.tone !== 'hold') setSaid(null) }}
          onKeyDown={(e) => {
            // the letter's arrows turn the deck (Letter.jsx); in here they
            // move the caret
            if (e.key.startsWith('Arrow')) e.stopPropagation()
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
          }}
        />
        {phone ? <Caret of={inputRef} /> : null}
      </div>
      <div className="wl-rp-send">
        {line}
        <Pill
          tone="light" onClick={() => send()} disabled={busy || empty || !!fault}
          aria-busy={busy || undefined} className="wl-rp-go"
        >
          {busy ? 'sending' : 'reply'}
        </Pill>
      </div>
    </div>
  )
}

// ── the recipient's own row ─────────────────────────────────────────────────
// The feature this is for. The person the letter is to is told so, asked to
// answer, and given the two say-sos over the thread, each one tap and each
// undone by the same key.
function Owner({ state, onReply, onSet, busy, letter }) {
  const shut = state === 'locked'
  const away = state === 'closed'
  return (
    <div className="wl-rp-owner" style={litVars(letter)}>
      <p className="wl-rp-owner-say">
        <span className="wl-rp-owner-h">this letter is to you.</span>{' '}
        {away
          ? 'the replies are put away. nobody else can see them.'
          : shut
            ? 'the replies are shut. only you can add one, and the ones here stay.'
            : 'answer it here, and your reply is marked as the recipient’s. nobody sees more than that.'}
      </p>
      <div className="wl-rp-owner-keys">
        {away ? null : (
          <Pill tone="light" onClick={onReply} className="wl-rp-owner-go">reply as the recipient</Pill>
        )}
        <button type="button" className="wl-rp-key" disabled={busy || away} onClick={() => onSet(shut ? 'open' : 'locked')}>
          <PixIcon name="lock" scale={2} />
          <span>{shut ? 'open the replies' : 'shut the replies'}</span>
        </button>
        <button type="button" className="wl-rp-key" disabled={busy} onClick={() => onSet(away ? 'open' : 'closed')}>
          <PixIcon name={away ? 'down' : 'close'} scale={2} />
          <span>{away ? 'bring them back' : 'put them away'}</span>
        </button>
      </div>
    </div>
  )
}

// ── the thread ──────────────────────────────────────────────────────────────
export default function Replies({ letter, reduce = false }) {
  const id = letter.id
  const [t, setT] = useState(null)
  const [likes, setLikes] = useState({})       // id -> { liked, likes }, drawn at once
  const [liking, setLiking] = useState({})
  const [reports, setReports] = useState({})   // id -> 'on' | 'busy'
  const [terms, setTerms] = useState(null)     // the send waiting on the terms
  const [termsBusy, setTermsBusy] = useState(false)
  const [setting, setSetting] = useState(false)
  const [note, setNote] = useState('')
  const panel = useRef(null)
  const input = useRef(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(async () => {
    const out = await readThread(id)
    if (!alive.current) return out
    setT(out)
    if (out && out.ok) setLikes({})
    return out
  }, [id])
  useEffect(() => { load() }, [load])
  // and again when the tab comes back to the front, so a thread left open
  // in the background is not a thread from an hour ago
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [load])
  // a line about what just happened goes after a few seconds
  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(() => setNote(''), 4200)
    return () => clearTimeout(t)
  }, [note])

  const reveal = useCallback((focus = false) => {
    const el = focus && input.current ? input.current : panel.current
    if (!el) return
    el.scrollIntoView({ block: focus ? 'center' : 'start', behavior: reduce ? 'auto' : 'smooth' })
    if (focus && input.current) setTimeout(() => input.current && input.current.focus({ preventScroll: true }), reduce ? 0 : 380)
  }, [reduce])

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
    setSetting(true)
    const out = await setThread(id, state)
    if (!alive.current) return
    setSetting(false)
    if (out && out.ok) {
      setNote(state === 'locked' ? 'shut. nobody else can reply now.'
        : state === 'closed' ? 'put away. nobody else can see the replies.'
          : 'open again.')
      await load()
    } else setNote('that did not go through. try again')
  }

  // ── the terms, then the send they were raised for ──
  const askTerms = (then) => setTerms(() => then)
  const agree = async () => {
    const then = terms
    if (!then || termsBusy) return
    setTermsBusy(true)
    await then()
    if (!alive.current) return
    setTermsBusy(false)
    setTerms(null)
  }

  const sent = async () => { await load() }
  const verified = useCallback(async () => {
    await refreshMe()
    await load()
    setTimeout(() => reveal(true), 60)
  }, [load, reveal])

  // Nothing to draw for a deploy without the replies, or a letter that is
  // not up: the letter stands alone as it did before them.
  if (t && !t.ok && ['missing', 'offline', 'gone', 'empty'].includes(t.error)) return null

  const host = panel.current ? panel.current.closest('.wl-root') : null

  if (!t) {
    return (
      <section className="wl-rp is-loading" ref={panel} aria-label="replies" aria-busy="true">
        <div className="wl-rp-head is-still">
          <span className="wl-rp-title">replies</span>
          <Wait scale={2} className="wl-rp-head-wait" />
        </div>
      </section>
    )
  }
  if (!t.ok) {
    return (
      <section className="wl-rp" ref={panel} aria-label="replies">
        <div className="wl-rp-head is-still"><span className="wl-rp-title">replies</span></div>
        <div className="wl-rp-note">
          <span>the replies did not load.</span>
          <button type="button" className="wl-quiet" onClick={() => { setT(null); load() }}>try again</button>
        </div>
      </section>
    )
  }

  const me = t.me || {}
  const state = t.state || 'open'
  const away = state === 'closed'
  const shut = state === 'locked'
  const rows = (t.replies || []).map((r) => (likes[r.id] ? { ...r, ...likes[r.id] } : r))
  const names = namesFor([...rows.filter((r) => !r.recipient).map((r) => r.who), me.who].filter(Boolean))
  const count = t.count || 0
  const hiddenFromMe = away && !me.recipient
  // who answered, for the head: the recipient first when they have, then
  // the newest of the rest, three in all
  const stack = []
  const theirs = rows.find((r) => r.recipient && r.status === 'live')
  if (theirs) stack.push({ k: '@', r: theirs })
  for (const r of [...rows].reverse()) {
    if (stack.length === 3) break
    if (r.status !== 'live' || r.recipient || stack.some((s) => s.k === r.who)) continue
    stack.push({ k: r.who, r })
  }
  const toAt = !isNameKey(letter.to)
  const canWrite = !!me.can
  const long = rows.length >= 3

  return (
    <section
      className={`wl-rp${away ? ' is-away' : ''}${shut ? ' is-shut' : ''}${me.recipient ? ' is-theirs' : ''}`}
      ref={panel} aria-labelledby={`wl-rp-h-${id}`}
    >
      {/* ── the head: a status row ── */}
      <div className="wl-rp-head">
        <button type="button" className="wl-rp-head-go" onClick={() => reveal(false)}>
          {stack.length ? (
            <span className="wl-rp-stack" aria-hidden="true">
              {stack.map((s) => (s.r.recipient
                ? <Face key="@" handle={letter.to} size={26} className="wl-rp-stack-face" />
                : <Creature key={s.k} who={s.r.who} size={26} />))}
            </span>
          ) : null}
          <span className="wl-rp-head-words">
            <span className="wl-rp-title" id={`wl-rp-h-${id}`}>
              {hiddenFromMe ? 'replies' : count ? `${count} ${count === 1 ? 'reply' : 'replies'}` : 'replies'}
            </span>
            {t.recipient_replied && !hiddenFromMe ? (
              <span className="wl-rp-lit" style={litVars(letter)}>the recipient replied</span>
            ) : null}
          </span>
        </button>
        <span className="wl-rp-head-end">
          {shut || away ? <PixIcon name="lock" scale={2} className="wl-rp-head-lock" /> : null}
          {canWrite && long ? (
            <button type="button" className="wl-rp-key is-small" onClick={() => reveal(true)}>reply</button>
          ) : null}
        </span>
      </div>

      {me.recipient && toAt ? (
        <Owner state={state} onReply={() => reveal(true)} onSet={set} busy={setting} letter={letter} />
      ) : null}

      {note ? <p className="wl-rp-said" role="status">{note}</p> : null}

      {/* ── the replies ── */}
      {hiddenFromMe ? (
        <div className="wl-rp-note is-away">
          <PixIcon name="lock" scale={2} />
          <span>the person this letter is to put the replies away.</span>
        </div>
      ) : rows.length ? (
        <ol className="wl-rp-list">
          {rows.map((r) => (
            <Reply
              key={r.id} r={r} letter={letter} name={names.get(r.who) || ''}
              onLike={like} onReport={report} onUndo={undo}
              reported={reports[r.id] || (r.reported ? 'on' : '')} liking={!!liking[r.id]}
            />
          ))}
        </ol>
      ) : (
        <div className="wl-rp-empty">
          <span className="wl-rp-empty-h">no replies yet.</span>
          <span className="wl-rp-empty-say">{canWrite ? 'be the first to reply.' : 'the first one will be here.'}</span>
        </div>
      )}

      {/* ── the foot: the field, the school's door, or why not ── */}
      {hiddenFromMe ? null : canWrite ? (
        <Compose
          me={me} letter={letter} name={names.get(me.who) || (me.who ? creatureOf(me.who).name : '')}
          onSent={sent} onTerms={askTerms} inputRef={input}
        />
      ) : me.why === 'edu' ? (
        <School onVerified={verified} />
      ) : me.why === 'locked' ? (
        <div className="wl-rp-note">
          <PixIcon name="lock" scale={2} />
          <span>the person this letter is to shut the replies. the ones here stay.</span>
        </div>
      ) : null}

      {terms ? <Terms onAgree={agree} onClose={() => setTerms(null)} busy={termsBusy} host={host} /> : null}
    </section>
  )
}

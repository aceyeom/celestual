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
import { refresh as refreshMe, eduDomain } from './auth.js'
import { isNameKey } from './data.js'
import { ResendLink } from './linkdoor.jsx'
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
//
// The person the letter is to reads a sheet of their own words at the same
// moment. Their reply is not anonymous (it is lit and marked as theirs), it
// comes from no school, and the school's line would be a threat about an
// institution they never gave us, raised at the very moment the thread asks
// them to answer. So for them the head says what their reply is, and what
// abuse costs is what it can cost them: the reply, and replying.
function Terms({ onAgree, onClose, busy, host, recipient = false }) {
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
        {recipient ? (
          <>
            <h2 className="wl-rp-terms-h" id="wl-rp-terms-h">your reply is marked<br />as the recipient&rsquo;s.</h2>
            <p className="wl-rp-terms-say">
              everybody reading sees it came from the person this letter is to, and nothing more. celestual acts on abuse.
            </p>
          </>
        ) : (
          <>
            <h2 className="wl-rp-terms-h" id="wl-rp-terms-h">anonymous to others.<br />not to us.</h2>
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
// with nothing waiting on it, and in the composer's words for the same act
// (screens/Write.jsx, the Berkeley door): `send me the link`, the number,
// `waiting for the link`, `send it again`, `use a different address`. The
// link is tapped wherever the mail is opened, and this device is asked every
// few seconds whether it has been, and again when it comes back to the front.
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

// ── the field a reply is written in ─────────────────────────────────────────
// A refusal (the reading's, or the list's on the server) is about these
// words, so the key waits for them to change: pressed again on the same
// words it would only be refused again, and a refusal counts against the
// throttle. The first edit clears the line, and the key with it. A send that
// did not go through is not a refusal, and says to send it again.
//
// The terms are agreed once, in the sheet, and this field remembers it. The
// server keeps the agreement with the first reply it stores, a refused one
// included, and with the first reply the list catches (celestual-wall-reply),
// but the thread's `me.terms` is only read again when a reply goes up. So a
// first reply that was refused, edited and sent again carries the agreement
// with it rather than raising the same sheet a second time.
function Compose({ me, letter, name, onSent, onTerms, inputRef }) {
  const phone = usePhone()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState(null)   // { tone: 'ok'|'hold'|'no', text, refused? }
  const nonce = useRef(freshNonce())
  const agreed = useRef(false)
  const fault = replyFault(body)
  const left = MAX - body.length
  const empty = !body.trim()

  const send = async (accept = false) => {
    if (busy || empty) return
    if (fault || said?.refused) return
    if (accept) agreed.current = true
    const yes = accept || agreed.current
    if (!me.terms && !yes) { onTerms(() => send(true)); return }
    setBusy(true)
    setSaid(null)
    const out = await sendReply({ letter: letter.id, body, nonce: nonce.current, accept: yes })
    setBusy(false)
    if (out && out.ok) {
      // a fresh draft either way; a refused one keeps its words to be changed
      nonce.current = freshNonce()
      if (out.status === 'rejected') {
        setSaid({ tone: 'no', refused: true, text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
        return out
      }
      setBody('')
      setSaid(out.status === 'live'
        ? { tone: 'ok', text: 'it’s up.' }
        : { tone: 'hold', text: out.say || 'it’s being read. others see it once it passes.' })
      onSent(out)
      return out
    }
    const e = out?.error
    if (e === 'terms') { onTerms(() => send(true)); return out }
    if (e === 'caught') {
      nonce.current = freshNonce()
      setSaid({ tone: 'no', refused: true, text: `it can’t go up as it’s written. ${whyRefused(out.reasons)}` })
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
          tone="light" onClick={() => send()} disabled={busy || empty || !!fault || !!said?.refused}
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

// ── the thread ──────────────────────────────────────────────────────────────
export default function Replies({ letter, reduce = false, go = null }) {
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
    const was = t?.state
    setSetting(true)
    const out = await setThread(id, state)
    if (!alive.current) return
    setSetting(false)
    if (out && out.ok) {
      setNote(state === 'locked' ? 'nobody else can reply now. the ones here stay.'
        : state === 'closed' ? 'nobody else can see the replies now.'
          : was === 'closed' ? 'everybody can see the replies again.' : 'people can reply again.')
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
        <School
          onVerified={verified}
          onTheirs={toAt && !me.recipient && go ? () => go('claim', letter.to) : null}
        />
      ) : me.why === 'locked' ? (
        <div className="wl-rp-note">
          <PixIcon name="lock" scale={2} />
          <span>the person this letter is to shut the replies. the ones here stay.</span>
        </div>
      ) : null}

      {terms ? (
        <Terms onAgree={agree} onClose={() => setTerms(null)} busy={termsBusy} host={host} recipient={!!me.recipient} />
      ) : null}
    </section>
  )
}

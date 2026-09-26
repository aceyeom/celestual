// ── /alerts#off=: STOP THESE EMAILS ─────────────────────────────────────────
//
// The stop link at the foot of every alert (docs/ONE-WALL.md, "Email links").
// One tap in an inbox and the emails stop: the token is spent on load, the
// sheet says so in one line, and the one way back is the switch in the
// person's own account. Nothing is asked first. An email that makes somebody
// confirm they want it to stop is an email that has not stopped.
//
// The account is called "your account" here, as everywhere a person reads
// about it. It was "your page", a name shown nowhere else: the bar opens it
// from a face.
//
// This file also keeps the two pieces the other owner's screens share: the
// token read off the address (`takeHash`), and the address an alert goes to,
// confirmed by a magic link (`useAlertLink`, `AlertEmail`), which the claim
// (Claim.jsx) and the account (You.jsx) both ask for.
import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, CloseQuiet, Prose, EmailField,
} from '../parts.jsx'
import { Wait } from '../screen.jsx'
import { LinkMatch } from '../linkdoor.jsx'
import { alertsOffByToken, sendAlertLink, linkStatus, linkFault, looksLikeEmail } from '../../api/alerts.js'

// ── the token, off the address ──────────────────────────────────────────────
// It rides in the hash so it never reaches a server log or a Referer, and it
// is taken off the address the moment it is read, so a link copied out of the
// bar afterwards carries nothing. Read once per page: React mounts a screen
// twice in development, and the second read would find the hash already gone.
const TAKEN = new Map()
export function takeHash(name) {
  if (TAKEN.has(name)) return TAKEN.get(name)
  let t = ''
  try {
    const q = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
    t = q.get(name) || ''
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    }
  } catch { /* nothing to read */ }
  TAKEN.set(name, t)
  return t
}

// ── the address an alert goes to ────────────────────────────────────────────
// Typed, sent a link (celestual-edu-verify `link`, purpose 'alerts'), and
// watched until the link is opened, on this phone or any other: `/verify`
// confirms it, and `status` tells the session that asked. `onConfirmed` is
// told once, with the address that was confirmed.
export function useAlertLink({ onConfirmed }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)      // { request, match, email }
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const done = useRef(onConfirmed)
  done.current = onConfirmed

  const send = async () => {
    if (busy) return
    if (!looksLikeEmail(email)) { setSaid(linkFault('email')); return }
    setBusy(true)
    setSaid('')
    const out = await sendAlertLink(email)
    if (!alive.current) return
    setBusy(false)
    if (!out?.ok) { setSaid(linkFault(out?.error)); return }
    setSent({ request: out.request, match: out.match, email: String(email).trim().toLowerCase() })
  }

  useEffect(() => {
    if (!sent) return undefined
    let stop = false
    let polling = false
    let timer = 0
    const tick = async () => {
      if (stop || polling) return
      polling = true
      clearTimeout(timer)
      const out = await linkStatus(sent.request)
      polling = false
      if (stop || !alive.current) return
      if (out?.ok && out.verified) {
        stop = true
        if (done.current) done.current(sent.email)
        return
      }
      // run out: thirty minutes, or a wrong number typed where the link was
      // opened (0065), which the status answers as `expired` on an answer
      // that is otherwise ok, and this used to wait through for ever
      if ((out?.ok && out.expired) || out?.error === 'expired' || out?.error === 'invalid') {
        setSent(null)
        setSaid('that link has lapsed. send a new one.')
        return
      }
      timer = setTimeout(tick, 3000)
    }
    timer = setTimeout(tick, 3000)
    // back from the inbox: ask at once rather than up to a beat late
    const onReturn = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [sent])

  const reset = () => { setSent(null); setSaid('') }
  return { email, setEmail, sent, busy, said, send, reset }
}

// The form for it, in two states: the field and its key, then the inbox it
// went to, your number, and the wait. `compact` is the account, where it
// stands inside a section rather than filling a door.
//
// The number is this screen's and not the mail's (migration 0065 section 3):
// the link tapped on this phone confirms at once, and tapped on another phone
// or computer it asks for the number here first. It said "it shows the
// number 47", about a mail that no longer shows it.
export function AlertEmail({ link, compact = false, autoFocus = false }) {
  if (link.sent) {
    return (
      <div className={`wl-owner-sent${compact ? ' is-compact' : ''}`} aria-live="polite">
        <p className="wl-owner-say">
          we sent a link to <span className="wl-h">{link.sent.email}</span>. tap the link in the mail.
          {link.sent.match ? ' on another phone or computer, it asks for this number.' : null}
        </p>
        <LinkMatch n={link.sent.match} />
        <p className="wl-owner-wait"><Wait /><span>waiting for you to open it</span></p>
        <button type="button" className="wl-quiet" onClick={link.reset}>use another address</button>
      </div>
    )
  }
  return (
    <div className={`wl-owner-mail${compact ? ' is-compact' : ''}`}>
      <EmailField value={link.email} onChange={(v) => link.setEmail(v)} onSubmit={link.send} autoFocus={autoFocus} />
      <Pill tone="light" wide={!compact} onClick={link.send} disabled={link.busy || !link.email.trim()} aria-busy={link.busy || undefined}>
        {link.busy ? 'sending' : 'send me a link'}
      </Pill>
      <div className="wl-gate-fault" aria-live="polite">{link.said}</div>
    </div>
  )
}

// ── the stop link ───────────────────────────────────────────────────────────
export default function Alerts({ go, up, upLabel = 'back to the wall' }) {
  const [token] = useState(() => takeHash('off'))
  // taking · off · error, with error one of 'invalid' | 'missing' | 'network'
  const [state, setState] = useState(() => (token ? { phase: 'taking' } : { phase: 'none' }))

  useEffect(() => {
    if (!token) return undefined
    let on = true
    alertsOffByToken(token).then((out) => {
      if (!on) return
      if (out?.ok) setState({ phase: 'off' })
      else setState({ phase: 'error', error: out?.error || 'network' })
    })
    return () => { on = false }
  }, [token])

  const head = <SheetHead onClose={up} label={upLabel} />
  const toYou = () => go('you')

  let title
  let body
  let foot
  if (state.phase === 'taking') {
    title = <>turning them off.</>
    body = <p className="wl-owner-wait"><Wait /><span>one moment</span></p>
    foot = null
  } else if (state.phase === 'off') {
    title = <>you won&rsquo;t get these<br />emails any more.</>
    body = <Prose className="wl-gate-copy">to turn them back on, open your account and switch them on there.</Prose>
    foot = (
      <>
        <Pill tone="light" wide onClick={toYou}>turn them back on</Pill>
        <CloseQuiet onClose={up}>back to the wall</CloseQuiet>
      </>
    )
  } else if (state.phase === 'none') {
    title = <>your email alerts.</>
    body = <Prose className="wl-gate-copy">they are in your account, with a switch for each.</Prose>
    foot = <Pill tone="light" wide onClick={toYou}>open your account</Pill>
  } else {
    const missing = state.error === 'missing' || state.error === 'network' || state.error === 'offline'
    title = missing ? <>that did not<br />go through.</> : <>this link<br />does not work.</>
    body = (
      <Prose className="wl-gate-copy">
        {missing
          ? 'nothing changed yet. try the link again in a moment, or turn the emails off from your account.'
          : 'it may have been copied wrong. you can turn the emails off from your account.'}
      </Prose>
    )
    foot = (
      <>
        <Pill tone="light" wide onClick={toYou}>open your account</Pill>
        <CloseQuiet onClose={up}>back to the wall</CloseQuiet>
      </>
    )
  }

  return (
    <Sheet onClose={up} labelledBy="wl-alerts-h">
      <div className="wl-sheet-in wl-report wl-owner">
        {head}
        <Label tone="dim" className="wl-owner-kicker">email alerts</Label>
        <Display size="s" as="h2" id="wl-alerts-h">{title}</Display>
        {body}
        <div className="wl-push" />
        {foot ? <SheetFoot>{foot}</SheetFoot> : null}
      </div>
    </Sheet>
  )
}

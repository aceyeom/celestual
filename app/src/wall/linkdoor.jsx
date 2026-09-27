// ── THE LINK, WAITED ON ─────────────────────────────────────────────────────
//
// Every proof of an address in the product is a magic link now (migrations
// 0064 and 0065): a campus address for a post (screens/Write.jsx), where the
// alerts go (screens/Alerts.jsx), and, since 26 September, signing in by
// email at the door (screens/Gate.jsx). The link is mailed, tapped on
// whichever browser the mail is read in, and confirmed there (/verify#t=), and
// the screen that asked for it is left waiting for a tap it cannot see.
//
// This is that wait, once, for the door: the line that says it is waiting,
// and the way to ask again. The pieces carry the composer's own classes
// (post.css `.wl-edu-wait`), so the wait on the door and the wait on the
// composer are one object, drawn in two places.
//
// ── opened somewhere else ───────────────────────────────────────────────────
// Since migration 0070 a link signs in the browser that opened it, and only
// that one: a stranger who typed somebody's address is never signed in by
// their tap. So a link opened in another browser (the mail read in Safari,
// the wall open in Instagram's) signs THAT one in, and the wait here is told
// so (`onElsewhere`) rather than waiting for ever. It used to ask for the two
// digits this screen showed, typed there (0065), and nearly everybody was
// asked, since nearly everybody arrives from Instagram.
//
// ── asked, not pushed ───────────────────────────────────────────────────────
// Nothing tells this page the link was tapped: it asks
// (celestual-edu-verify `status`, answered to the session that asked and to
// nobody else) every two and a half seconds, and at once when the tab comes
// back to the screen, which is the moment somebody who tapped the link in
// their mail app returns to it. Both drive one question at a time.
import { useEffect, useRef, useState } from 'react'
import { Wait } from './screen.jsx'
import { linkStatus } from '../api/eduverify.js'
import { sessionToken } from '../api/identity.js'
import './post.css'

// Watch `request` until its link is tapped here (`onConfirmed`, with the
// status's answer), is opened in another browser (`onElsewhere`), or has run
// out (`onLapsed`, which stands in for the second when there is none). A
// request of '' watches nothing.
export function useLinkWait({ request, onConfirmed, onElsewhere, onLapsed, every = 2500 }) {
  const done = useRef(onConfirmed)
  done.current = onConfirmed
  const away = useRef(onElsewhere)
  away.current = onElsewhere
  const lapsed = useRef(onLapsed)
  lapsed.current = onLapsed

  useEffect(() => {
    if (!request) return undefined
    let stop = false
    let polling = false
    let timer = 0
    const tick = async () => {
      if (stop || polling) return
      polling = true
      clearTimeout(timer)
      const out = await linkStatus({ request, session: sessionToken() })
      polling = false
      if (stop) return
      if (out.ok && out.verified) {
        stop = true
        if (done.current) done.current(out)
        return
      }
      if (out.ok && out.elsewhere) {
        stop = true
        if (away.current) away.current(out)
        else if (lapsed.current) lapsed.current()
        return
      }
      if ((out.ok && out.expired) || out.error === 'invalid') {
        stop = true
        if (lapsed.current) lapsed.current()
        return
      }
      timer = setTimeout(tick, every)
    }
    timer = setTimeout(tick, every)
    const onBack = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onBack)
      window.removeEventListener('focus', onBack)
    }
  }, [request, every])
}

// The line that waits, or says what is happening now the tap has landed.
export function LinkWaiting({ children = 'waiting for the link' }) {
  return <p className="wl-edu-wait" role="status"><Wait />{children}</p>
}

// ── asking for the link again ───────────────────────────────────────────────
// It waits before it offers, as the code's does (parts.jsx `Resend`): a
// button pressed three times in eight seconds mails three links and walks
// somebody into the five an hour on the address. `onSend` answers false when
// nothing went out, and the clock is not started again over a mail that is
// not coming.
export function ResendLink({ onSend, wait = 30 }) {
  const [left, setLeft] = useState(wait)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const go = async () => {
    if (left > 0 || busy) return
    setBusy(true)
    const ok = await onSend()
    if (!alive.current) return
    setBusy(false)
    if (ok === false) return
    setSent(true)
    setLeft(wait)
  }

  if (busy) return <p className="wl-resend">sending</p>
  if (left > 0) {
    return (
      <p className="wl-resend" role="status" aria-live="polite">
        {sent ? 'a new link is on its way' : 'no email yet?'} <span className="wl-resend-clock">{left}s</span>
      </p>
    )
  }
  return (
    <button type="button" className="wl-quiet wl-resend-go" onClick={go}>
      send it again
    </button>
  )
}

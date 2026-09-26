// ── /verify#t= — THE LINK FROM THE MAIL ─────────────────────────────────────
//
// A post to an @ asks for a Berkeley address when it is sent, and the address
// is confirmed by a link mailed to it (docs/ONE-WALL.md). This is where the
// link lands: `/verify#t=<token>`, the token in the hash so it never reaches
// a server's logs, read once and taken out of the address bar at once.
//
// What happens next depends on which device tapped it:
//
//   the one that wrote the letter
//       The draft is on this device, waiting on the link (store.js `draft`,
//       with `held`). It goes up here, and the letter opens: "verified. your
//       letter is up." The composer in the other tab, polling the same
//       request, posts the same draft with the same nonce, and the function
//       answers it with this letter rather than writing a second one.
//   another one (the mail opened on a laptop, the letter written on a phone)
//       "verified. go back to where you wrote it, it's going up there." The
//       composer on the phone sees the request confirmed and posts.
//   for the alerts
//       The alert address is confirmed: "your alerts are on."
//
// A link works once and lasts thirty minutes, and one that has been used or
// has run out says so, with the next step: ask for a new one where the
// letter was written.
//
// Raised over the wall like the gate and the report (router.js `SHEETS`), in
// the door's shape (parts.jsx `DoorHead`), since it is the end of a door.

import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetHead, Pill, DoorHead, Display } from '../parts.jsx'
import { Wait } from '../screen.jsx'
import { confirmLink } from '../../api/eduverify.js'
import { sessionToken } from '../../api/identity.js'
import { refresh } from '../auth.js'
import { getState } from '../store.js'
import { postDraft } from '../data.js'
import { schoolOf } from '../schools.js'
import { Sticker } from '../Sticker.jsx'
import '../post.css'

// The token, off the hash, once. Taken out of the address as soon as it is
// read, so a reload, a share or a screenshot of the bar does not carry it.
function readToken() {
  try {
    const m = String(window.location.hash || '').match(/[#&]t=([^&]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  } catch {
    return ''
  }
}

// One confirmation per token for the life of the page: the shell's
// development mode mounts every screen twice, and a link spent by the first
// mount would answer `used` to the second.
const SPENT = new Map()
function spend(token) {
  if (!SPENT.has(token)) SPENT.set(token, confirmLink({ token, session: sessionToken() }))
  return SPENT.get(token)
}

// The draft this device is holding for the link, if it is one.
function heldDraft() {
  const d = getState().draft
  return d && d.held && String(d.body || '').trim() ? d : null
}

export default function Verify({ go, up, upLabel = 'back to the wall', toWall = null }) {
  const [token] = useState(readToken)
  // checking · posting · up · elsewhere · alerts · failed · bad
  const [state, setState] = useState(token ? 'checking' : 'bad')
  const [why, setWhy] = useState(token ? '' : 'invalid')
  const [id, setId] = useState('')
  const [school, setSchool] = useState(() => schoolOf('berkeley'))
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // the hash comes off the address, whatever happens next
  useEffect(() => {
    if (!window.location.hash) return
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search) } catch { /* a sandbox */ }
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let on = true
    ;(async () => {
      const out = await spend(token)
      if (!on || !alive.current) return
      if (!out.ok) { setWhy(out.error); setState('bad'); return }
      if (out.campus) setSchool(schoolOf(out.campus, { name: out.school || '' }) || schoolOf('berkeley'))
      await refresh()
      if (!on || !alive.current) return
      if (out.purpose === 'alerts') { setState('alerts'); return }
      const d = heldDraft()
      if (!d) { setState('elsewhere'); return }
      setState('posting')
      const posted = await postDraft(d)
      if (!on || !alive.current) return
      if (posted && posted.ok && (posted.status === 'live' || posted.status === 'pending')) {
        setId(posted.id || '')
        setState(posted.status === 'live' ? 'up' : 'review')
        return
      }
      setWhy(posted && posted.error ? String(posted.error) : 'network')
      setState('failed')
    })()
    return () => { on = false }
  }, [token])

  // the letter, opened, a beat after it is said to be up
  useEffect(() => {
    if (state !== 'up' || !id) return undefined
    const t = setTimeout(() => { if (toWall) toWall(); go('letter', id) }, 1800)
    return () => clearTimeout(t)
  }, [state, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const wall = () => { if (toWall) toWall(); go('wall') }
  const toLetter = () => { if (toWall) toWall(); go('write') }

  let title
  let say
  let act = null
  let quiet = null
  if (state === 'checking' || state === 'posting') {
    title = <>one moment.</>
    say = <span className="wl-verify-wait"><Wait />{state === 'checking' ? 'checking the link' : 'putting your letter up'}</span>
  } else if (state === 'up') {
    title = <>verified. your<br />letter is up.</>
    say = 'it’s on the wall with your school’s sticker, and nobody sees who wrote it.'
    act = <Pill tone="light" wide onClick={() => { if (toWall) toWall(); go('letter', id) }}>read it</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button>
  } else if (state === 'review') {
    title = <>verified. it&rsquo;s<br />being checked.</>
    say = 'it goes up once it’s reviewed.'
    act = <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
  } else if (state === 'elsewhere') {
    title = <>verified.</>
    say = 'go back to where you wrote it. it’s going up there.'
    act = <Pill tone="light" wide onClick={wall}>go to the wall</Pill>
  } else if (state === 'alerts') {
    title = <>your alerts<br />are on.</>
    say = 'we’ll email you when it matters, and every email has a one tap way to stop.'
    act = <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
  } else if (state === 'failed') {
    title = <>verified, but it<br />didn&rsquo;t go up.</>
    say = why === 'campus' ? 'that address is at another school, and only Berkeley posts to an @. your letter is still in the composer.'
      : why === 'throttle' ? 'too many from this device today. your letter is still in the composer.'
      : 'your letter is still in the composer. open it and send it again.'
    act = <Pill tone="light" wide onClick={toLetter}>open your letter</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button>
  } else {
    title = why === 'used' ? <>that link has<br />been used.</>
      : why === 'expired' ? <>that link has<br />run out.</>
      : why === 'offline' ? <>we couldn&rsquo;t<br />check it.</>
      : why === 'taken' ? <>that address is<br />already in use.</>
      : <>that link<br />doesn&rsquo;t work.</>
    say = why === 'offline' ? 'we could not reach the server. try the link again in a moment.'
      : why === 'taken' ? 'that school email is already confirmed on another account. sign in there, or use a different address.'
      : 'a link works once, for thirty minutes. ask for a new one where you wrote your letter.'
    act = heldDraft()
      ? <Pill tone="light" wide onClick={toLetter}>back to your letter</Pill>
      : <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
    quiet = heldDraft() ? <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button> : null
  }

  const won = state === 'up' || state === 'review' || state === 'elsewhere'
  return (
    <Sheet onClose={up} tall labelledBy="wl-verify-h">
      <div className="wl-sheet-in wl-gate is-door wl-verify">
        <SheetHead onClose={up} label={upLabel} />
        <div className="wl-push" />
        <div className="wl-door">
          {won && school ? (
            <div className="wl-door-head wl-edu-head">
              <Sticker school={school} tilt={-6} className="wl-edu-sticker" />
              <Display size="s" as="h2" id="wl-verify-h" className="wl-door-title">{title}</Display>
              <p className="wl-door-say">{say}</p>
            </div>
          ) : (
            <DoorHead id="wl-verify-h" title={title} say={say} />
          )}
          <div className="wl-door-ways">
            {act}
            {quiet}
          </div>
        </div>
        <div className="wl-push" />
      </div>
    </Sheet>
  )
}

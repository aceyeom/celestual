// ── /verify#t= — THE LINK FROM THE MAIL ─────────────────────────────────────
//
// A post to an @ asks for a Berkeley address when it is sent, and the address
// is confirmed by a link mailed to it (docs/ONE-WALL.md). This is where the
// link lands: `/verify#t=<token>`, the token in the hash so it never reaches
// a server's logs, read once and taken out of the address bar at once.
//
// Nothing is typed here. Since migration 0070 a link confirms for the browser
// that opened it, at once, and what happens next depends on which browser
// that is:
//
//   the one that wrote the letter
//       The draft is in this browser, waiting on the link (store.js `draft`,
//       with `held`). It goes up here, and the letter opens: "confirmed.
//       your letter is up." The composer in the other tab, polling the same
//       request, posts the same draft with the same nonce, and the function
//       answers it with this letter rather than writing a second one.
//   another one (the mail read in Safari, the letter written in Instagram's
//       browser, which is nearly everybody)
//       This browser is the one confirmed, and not the one that asked. The
//       letter came with the link (Write.jsx sends it as `carry`), and it is
//       shown here on the screen it will go up on, with one key: "post it".
//       Shown first, because whoever opens a link is not always who asked for
//       it, and a stranger's letter must never go up under the address of
//       somebody who only tapped. It posts with the draft's own nonce, so it
//       is one letter wherever it goes up from. A link asked for under a
//       letter's replies (Replies.jsx) carries that letter instead: "you can
//       reply from here", and the way back to it. The screen that asked is
//       told the link was opened somewhere else, and says so.
//   for the alerts
//       The alert address is confirmed for the account that asked, from any
//       browser: "your alerts are on."
//   for signing in (migration 0065, the door's "continue with email")
//       This browser is signed in as whoever holds the address: "you're in."
//       The door that asked is signed in only if it is this browser; if not,
//       it says the link was opened somewhere else. The pings come back with
//       the person (auth.js `restoreProof`), so the one quiet line under the
//       key opens them.
//
// ── the number, gone ────────────────────────────────────────────────────────
// 0065 made a link opened in another browser wait here for two digits typed
// off the asking screen, since a link used to sign in the browser that ASKED,
// and a stranger who typed somebody's address was one tap from their private
// notes. 0070 signs in this browser instead, the one in the hands of whoever
// reads the inbox, and the number went. A function from before 0070 still
// answers `match` for a link opened elsewhere, and nothing shows a number
// now, so the page says to open the link where it was asked for.
//
// A link works once and lasts thirty minutes, and one that has been used or
// has run out says so, with the next step: back to the letter this browser is
// holding, to the account for an alerts link, or the door again for a
// sign in.
//
// Raised over the wall like the gate and the report (router.js `SHEETS`), in
// the door's shape (parts.jsx `DoorHead`), since it is the end of a door.

import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetHead, Pill, DoorHead, Display, useProfile } from '../parts.jsx'
import { Wait, Screen, ScreenText } from '../screen.jsx'
import { confirmLink } from '../../api/eduverify.js'
import { sessionToken } from '../../api/identity.js'
import { refresh, isReader } from '../auth.js'
import { getState, patch, setAfterGate } from '../store.js'
import { postDraft, draftPost, atHandle } from '../data.js'
import { normaliseLook } from '../looks.js'
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
// mount would answer `used` to the second. The letter it carried comes back
// with the first answer only, so it is kept with it.
const SPENT = new Map()
function spend(token) {
  if (!SPENT.has(token)) SPENT.set(token, confirmLink({ token, session: sessionToken() }))
  return SPENT.get(token)
}

// The draft this browser is holding for the link, if it is one.
function heldDraft() {
  const d = getState().draft
  return d && d.held && String(d.body || '').trim() ? d : null
}

// A letter the link carried here, as a draft this browser can post, or null.
// It waits on nothing here: `held` is this browser's own and it has none.
function carriedDraft(carry) {
  const d = carry && carry.letter
  if (!d || !draftPost(d)) return null
  return { ...d, held: null }
}

// The letter as it will go up, on the screen the wall draws it on, still: the
// line across its top the writer set, or "dear" and the name for the @, and
// never the @ itself (Write.jsx says why).
function Carried({ d }) {
  const p = draftPost(d)
  const prof = useProfile(p && p.kind === 'handle' ? p.handle : '')
  if (!p) return null
  const first = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  const greeting = p.salutation || `dear ${p.kind === 'name' ? p.name : first || 'you'}`
  return (
    <div className="wl-verify-letter">
      <Screen look={normaliseLook(p.look)} seed={`draft:${p.key}`} live={false} top={{ salutation: greeting, icon: 'pen' }}>
        <ScreenText text={p.body} />
      </Screen>
    </div>
  )
}

export default function Verify({ go, up, upLabel = 'back to the wall', toWall = null }) {
  const [token] = useState(readToken)
  // checking · posting · up · review · onward · carried · reply · here ·
  // alerts · in · failed · bad
  const [state, setState] = useState(token ? 'checking' : 'bad')
  const [why, setWhy] = useState(token ? '' : 'invalid')
  // what the link was for, when the server said: where to ask again
  const [purpose, setPurpose] = useState('')
  const [id, setId] = useState('')
  const [school, setSchool] = useState(() => schoolOf('berkeley'))
  // a login: whether the browser that asked for the link is this one
  const [same, setSame] = useState(true)
  // what the link carried here from the browser that asked: a letter's
  // draft, or the letter a reply was going to be written under
  const [carried, setCarried] = useState(null)
  const [replyTo, setReplyTo] = useState('')
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

  // A draft, posted: the one this browser held, or the one the link carried.
  // A carried one is not this browser's own draft, so whatever this browser
  // was keeping in the composer is put back once it has gone (data.js
  // `landLetter` empties the slot); if it did not go, it waits in the
  // composer for another try, unless the composer is holding other words.
  const post = async (d, carriedHere) => {
    const mine = getState().draft
    setState('posting')
    const posted = await postDraft(d)
    const went = posted && posted.ok && (posted.status === 'live' || posted.status === 'pending')
    if (carriedHere) {
      const own = mine && String(mine.body || '').trim() && mine.nonce !== d.nonce
      if (own) patch({ draft: mine })
      else if (!went) patch({ draft: d })
    }
    if (!alive.current) return
    if (went) {
      setId(posted.id || '')
      setState(posted.status === 'live' ? 'up' : 'review')
      return
    }
    setWhy(posted && posted.error ? String(posted.error) : 'network')
    setState('failed')
  }

  // What the server answered: the page it lands on, and for a letter this
  // browser is holding, the letter put up.
  const settle = async (out) => {
    if (!alive.current) return
    if (!out.ok) {
      setPurpose(out.purpose || '')
      setWhy(out.error)
      setState('bad')
      return
    }
    setPurpose(out.purpose)
    if (out.campus) setSchool(schoolOf(out.campus, { name: out.school || '' }) || schoolOf('berkeley'))
    await refresh()
    if (!alive.current) return
    if (out.purpose === 'alerts') { setState('alerts'); return }
    if (out.purpose === 'login') { setSame(out.sameDevice); setState('in'); return }
    if (!out.sameDevice) {
      const d = carriedDraft(out.carry)
      if (d) { setCarried(d); setState('carried'); return }
      if (out.carry && out.carry.reply) { setReplyTo(out.carry.reply.letter); setState('reply'); return }
      setState('here')
      return
    }
    const d = heldDraft()
    if (!d) { setState('onward'); return }
    post(d, false)
  }

  // once per token: the answer is spent (`spend`), and `settle` is this
  // render's, which is the one that asked
  useEffect(() => {
    if (!token) return undefined
    let on = true
    spend(token).then((out) => { if (on) settle(out) })
    return () => { on = false }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // the letter, opened, a beat after it is said to be up
  useEffect(() => {
    if (state !== 'up' || !id) return undefined
    const t = setTimeout(() => { if (toWall) toWall(); go('letter', id) }, 1800)
    return () => clearTimeout(t)
  }, [state, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const wall = () => { if (toWall) toWall(); go('wall') }
  const toLetter = () => { if (toWall) toWall(); go('write') }
  // The carried letter, into this browser's composer to be changed before
  // it goes, on the person it is to.
  const change = () => {
    const p = draftPost(carried)
    patch({ draft: carried })
    if (toWall) toWall()
    go('write', p ? p.key : undefined)
  }
  // A sign in link that did not work, and the door again, which lands on
  // the wall once it opens rather than back on this page.
  const again = () => { setAfterGate({ name: 'wall' }); go('gate') }

  let title
  let say
  let act = null
  let quiet = null
  let ways = null
  if (state === 'checking' || state === 'posting') {
    title = <>one moment.</>
    say = <span className="wl-verify-wait"><Wait />{state === 'checking' ? 'checking the link' : 'putting your letter up'}</span>
  } else if (state === 'up') {
    title = <>confirmed. your<br />letter is up.</>
    say = 'it’s on the wall marked from Berkeley, and nobody sees who wrote it.'
    act = <Pill tone="light" wide onClick={() => { if (toWall) toWall(); go('letter', id) }}>read it</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button>
  } else if (state === 'review') {
    title = <>confirmed. it&rsquo;s<br />being read.</>
    say = 'it goes up once it passes.'
    act = <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
  } else if (state === 'carried') {
    const p = draftPost(carried)
    title = <>confirmed. here&rsquo;s<br />your letter.</>
    say = `${p && p.kind === 'handle' ? `to ${atHandle(p.handle)}. ` : ''}it goes up ${p && p.proof === 'edu' ? 'marked from Berkeley' : 'on the wall'}, and nobody sees who wrote it.`
    ways = <Carried d={carried} />
    act = <Pill tone="light" wide onClick={() => post(carried, true)}>post it</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={change}>change it first</button>
  } else if (state === 'reply') {
    title = <>confirmed. you can<br />reply from here.</>
    say = 'your school address is confirmed on this phone or computer.'
    act = <Pill tone="light" wide onClick={() => { if (toWall) toWall(); go('letter', replyTo) }}>open the letter</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button>
  } else if (state === 'here') {
    title = <>confirmed here.</>
    say = 'you’re confirmed on this phone or computer, not on the one where you asked for the link.'
    act = <Pill tone="light" wide onClick={wall}>go to the wall</Pill>
  } else if (state === 'onward') {
    title = <>confirmed.</>
    say = 'go back to where you asked for the link. it carries on there.'
    act = <Pill tone="light" wide onClick={wall}>go to the wall</Pill>
  } else if (state === 'in') {
    title = <>you&rsquo;re in.</>
    say = same ? 'you’re signed in on this device.' : 'you’re signed in here, on this phone or computer.'
    act = <Pill tone="light" wide onClick={wall}>go to the wall</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={() => { if (toWall) toWall(); go('you') }}>your private notes</button>
  } else if (state === 'alerts') {
    title = <>your alerts<br />are on.</>
    say = 'we’ll email you when it matters, and every email has a one tap way to stop.'
    act = <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
  } else if (state === 'failed') {
    title = <>confirmed, but it<br />didn&rsquo;t go up.</>
    say = why === 'campus' ? 'that address is at another school, so it can’t post marked from Berkeley. your letter is still in the composer, and it can go up read first.'
      : why === 'throttle' ? 'too many from this device today. your letter is still in the composer.'
      : 'your letter is still in the composer. open it and send it again.'
    act = <Pill tone="light" wide onClick={toLetter}>open your letter</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button>
  } else {
    const held = heldDraft()
    title = why === 'used' ? <>that link has<br />been used.</>
      : why === 'expired' ? <>that link has<br />run out.</>
      : why === 'match' ? <>open it where<br />you asked.</>
      : why === 'offline' ? <>we couldn&rsquo;t<br />check it.</>
      : why === 'taken' ? <>that address is<br />already in use.</>
      : <>that link<br />doesn&rsquo;t work.</>
    const next = held ? 'ask for a new one where you wrote your letter.'
      : purpose === 'alerts' ? 'ask for a new one from your account.'
      : 'ask for a new one where you asked for this one.'
    // 'match' is a function from before 0070, which confirms a link opened
    // in another browser only with a number nothing shows any more
    say = why === 'offline' ? 'we could not reach the server. try the link again in a moment.'
      : why === 'taken' ? 'that school email is already confirmed on another account. sign in there, or use a different address.'
      : why === 'match' ? 'this link works in the browser where you asked for it. open the mail there, or ask for a new link here.'
      : `a link works once, for thirty minutes. ${next}`
    // The one next step, lit: the letter this browser is holding; the
    // account, for an alerts link; the door again, for a sign in (or a
    // link the server could not name), unless this browser is already in.
    // The wall stays under it, quiet.
    if (held) {
      act = <Pill tone="light" wide onClick={toLetter}>back to your letter</Pill>
    } else if (why !== 'offline' && purpose === 'alerts') {
      act = <Pill tone="light" wide onClick={() => { if (toWall) toWall(); go('you') }}>open your account</Pill>
    } else if (why !== 'offline' && purpose !== 'edu' && !isReader()) {
      act = <Pill tone="light" wide onClick={again}>sign in again</Pill>
    }
    quiet = act ? <button type="button" className="wl-quiet" onClick={wall}>back to the wall</button> : null
    if (!act) act = <Pill tone="light" wide onClick={wall}>back to the wall</Pill>
  }

  const won = state === 'up' || state === 'review' || state === 'onward' || state === 'reply' || state === 'here'
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
            {ways}
            {act}
            {quiet}
          </div>
        </div>
        <div className="wl-push" />
      </div>
    </Sheet>
  )
}

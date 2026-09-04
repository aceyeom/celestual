// ── /signin, the link from the mail ─────────────────────────────────────────
//
// Phase 8. A one time token in the FRAGMENT, redeemed once, for a device that
// no longer holds a proof. `celestual_redeem_login` is the shipped RPC
// (migration 0029); `celestual-relogin` was the other half of a feature that
// never deployed and Q4 deleted it in Phase 4a.
//
// ── WHAT THIS SCREEN IS NOT ─────────────────────────────────────────────────
// It is not a sign in form. There is nothing to type here and nothing to
// decide: a person got here by pressing a button in their own inbox, and the
// only four things that can happen are that it works, that it has lapsed, that
// the address they opened is missing its token, or that nothing answered.
//
// So it says which of the four, and offers exactly one way forward.
//
// ── the two flags ───────────────────────────────────────────────────────────
// `started` keeps the single use token from being spent twice, and `alive`
// says whether the screen is still mounted. They used to be one closure
// variable, and React's development StrictMode, which mounts, unmounts and
// remounts every component, set it false on the first pass and skipped the
// second, so the answer landed on a screen that had decided it was dead and
// the person sat on "signing you back in" for ever. Same trap Posted.jsx and
// Remove.jsx document on the wall.
import { useEffect, useRef, useState } from 'react'
import { Display, Label, Pill, Prose, Waiting } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import { redeemSignInLink } from '../api/relogin.js'
import { markVerified } from '../api/auth.js'
import TopBar from './TopBar.jsx'

function fromHash() {
  const m = (window.location.hash || '').match(/t=([0-9a-fA-F]{16,128})/)
  return m ? m[1] : ''
}

export default function Signin({ go, who, refreshWho }) {
  const [token] = useState(fromHash)
  const [phase, setPhase] = useState(token ? 'working' : 'missing') // working | done | lapsed | offline | missing
  const [handle, setHandle] = useState('')
  const started = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    redeemSignInLink(token)
      .then(async (r) => {
        if (!alive.current) return
        if (r && r.ok && r.handle && r.proof) {
          markVerified(r.handle, r.proof)
          setHandle(r.handle)
          // The token is spent and it is in the address bar. Take it out before
          // anything else: a link that survives in history is a link somebody
          // else can press.
          window.history.replaceState(window.history.state, '', window.location.pathname)
          await refreshWho()
          if (!alive.current) return
          setPhase('done')
          return
        }
        setPhase(r?.error === 'network' ? 'offline' : 'lapsed')
      })
      .catch(() => { if (alive.current) setPhase('offline') })
  }, [token, refreshWho])

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid">
        {phase === 'working' ? (
          <>
            <Label><Sparkle size={11} />signing you back in</Label>
            <Waiting label="signing you back in" />
          </>
        ) : phase === 'done' ? (
          <>
            <Label><Sparkle size={11} />done</Label>
            <Display size="m" as="h1">You are back,<br />@{handle}.</Display>
            <Prose className="mn-copy">everything you have out is where you left it.</Prose>
          </>
        ) : phase === 'lapsed' ? (
          <>
            <Display size="m" as="h1">That link<br />has lapsed.</Display>
            <Prose className="mn-copy">it lasts twenty minutes and works once.</Prose>
          </>
        ) : phase === 'offline' ? (
          <>
            <Display size="m" as="h1">Nothing<br />answered.</Display>
            <Prose className="mn-copy">check the connection, then press the button in the mail again.</Prose>
          </>
        ) : (
          <>
            <Display size="m" as="h1">This link is<br />missing its token.</Display>
            <Prose className="mn-copy">open the email again and press the button there.</Prose>
          </>
        )}
      </div>
      {phase !== 'working' && phase !== 'offline' ? (
        <div className="mn-foot">
          <Pill tone="light" wide onClick={() => go(phase === 'done' ? 'sky' : 'place')}>
            {phase === 'done' ? 'see your sky' : 'prove it again'}
          </Pill>
        </div>
      ) : null}
    </main>
  )
}

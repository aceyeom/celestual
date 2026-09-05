// ── /signin, the link ───────────────────────────────────────────────────────
//
// Phase 8. A one time token in the FRAGMENT, redeemed once, for a device that
// does not hold a proof. Two things mint one: nothing yet in a mail (0029's
// door, still to be wired, docs/launchsteps.md section 9), and the desk
// (migration 0039), which hands the team a link that signs a browser in as a
// handle, a campus address, or both, with no DM and no code.
//
// ── WHAT THIS SCREEN IS NOT ─────────────────────────────────────────────────
// It is not a sign in form. There is nothing to type here and nothing to
// decide: a person got here by pressing a link, and the only four things that
// can happen are that it works, that it has lapsed, that the address they
// opened is missing its token, or that nothing answered.
//
// So it says which of the four, and offers exactly one way forward.
//
// ── the three halves of a link ──────────────────────────────────────────────
//   t   the login token. Redeemed for a thirty day proof on the handle, the
//       same secret the DM flow leaves behind, and kept here like it.
//   s   a session token, when the desk bound one to a campus row. Adopted
//       BEFORE the redeem, so the bind below lands the handle on that row and
//       the browser is one person on both surfaces.
//   the bind   after the redeem, the proof goes through celestual_user_bind_handle,
//       the one writer of handle_verified_at. The mailed link used to stop
//       at the proof and leave the identity row unbound; a signed in person
//       has a row now, whichever door they came in by.
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
import { adoptSession, bindHandle } from '../api/identity.js'
import { useSkyAvoid } from '../wall/ground.jsx'
import TopBar from './TopBar.jsx'

function fromHash() {
  const h = window.location.hash || ''
  const t = h.match(/(?:^#|[#&])t=([0-9a-fA-F]{16,128})/)
  const s = h.match(/(?:^#|[#&])s=([0-9a-fA-F]{16,256})/)
  return { token: t ? t[1] : '', session: s ? s[1] : '' }
}

export default function Signin({ go, who, refreshWho }) {
  const [{ token, session }] = useState(fromHash)
  // working | done | lapsed | offline | missing
  const [phase, setPhase] = useState(token || session ? 'working' : 'missing')
  const [handle, setHandle] = useState('')
  const started = useRef(false)
  const alive = useRef(true)
  const avoid = useSkyAvoid()

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if ((!token && !session) || started.current) return
    started.current = true
    ;(async () => {
      try {
        // The campus half, if the link carries one. Adopted first, so the
        // handle below binds onto the same row.
        if (session) adoptSession(session)

        // The token is in the address bar and it is spent the moment it is
        // used. Take it out before anything else: a link that survives in
        // history is a link somebody else can press.
        window.history.replaceState(window.history.state, '', window.location.pathname)

        if (!token) {
          // A campus only link. Nothing to redeem; the row is already bound.
          const u = await refreshWho()
          if (!alive.current) return
          setPhase(u?.signedIn ? 'done' : 'lapsed')
          return
        }

        const r = await redeemSignInLink(token)
        if (!alive.current) return
        if (!(r && r.ok && r.handle && r.proof)) {
          setPhase(r?.error === 'network' ? 'offline' : 'lapsed')
          return
        }
        markVerified(r.handle, r.proof)
        setHandle(r.handle)
        // The identity row. A failure here is not a failure of the sign in:
        // the proof is real and every read that matters checks the proof.
        try { await bindHandle({ handle: r.handle, proof: r.proof }) } catch { /* the row catches up next time */ }
        await refreshWho()
        if (!alive.current) return
        setPhase('done')
      } catch {
        if (alive.current) setPhase('offline')
      }
    })()
  }, [token, session, refreshWho])

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid">
        {phase === 'working' ? (
          <>
            <Label><Sparkle size={11} />signing you in</Label>
            <Waiting label="signing you in" />
          </>
        ) : phase === 'done' ? (
          <>
            <Label><Sparkle size={11} />done</Label>
            <Display size="m" as="h1" ref={avoid}>
              {handle ? <>You are in,<br />@{handle}.</> : <>You are in.</>}
            </Display>
            <Prose className="mn-copy">
              {handle ? 'everything you have out is where you left it.' : 'the wall is open to you.'}
            </Prose>
          </>
        ) : phase === 'lapsed' ? (
          <>
            <Display size="m" as="h1" ref={avoid}>That link<br />has lapsed.</Display>
            <Prose className="mn-copy">it works once, and not for long. ask for another.</Prose>
          </>
        ) : phase === 'offline' ? (
          <>
            <Display size="m" as="h1" ref={avoid}>Nothing<br />answered.</Display>
            <Prose className="mn-copy">check the connection, then press the link again.</Prose>
          </>
        ) : (
          <>
            <Display size="m" as="h1" ref={avoid}>This link is<br />missing its token.</Display>
            <Prose className="mn-copy">open the message again and press the link there.</Prose>
          </>
        )}
      </div>
      {phase !== 'working' && phase !== 'offline' ? (
        <div className="mn-foot">
          <Pill tone="light" wide onClick={() => go(phase === 'done' ? (handle ? 'sky' : 'hero') : 'place')}>
            {phase === 'done' ? (handle ? 'see your sky' : 'the front') : 'prove it again'}
          </Pill>
        </div>
      ) : null}
    </main>
  )
}

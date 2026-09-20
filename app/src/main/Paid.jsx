// ── /paid, back from Stripe ─────────────────────────────────────────────────
//
// Where Stripe's page sends a person home, paid or not (migration 0021, woken
// by 0053; api/billing.js). Two addresses, both minted by celestual-stripe:
//
//   /paid?s=cs_…   the Checkout Session that was paid. The screen asks the
//                  function to confirm it, which applies the same idempotent
//                  grant the webhook applies, so the meter is right the moment
//                  the person is back rather than a second or two later.
//   /paid?c=1      the person backed out of Stripe's page. Nothing was
//                  charged, and the screen says so.
//
// ── WHAT THIS SCREEN IS NOT ─────────────────────────────────────────────────
// It is not a receipt and it is not a shop. Stripe sent the receipt. The one
// thing this screen owes the person is the thing they were doing before they
// left: the letter. Place.jsx stashes it under `use: 'paid'` before the
// browser goes to Stripe, and "place it" here opens the letter again with the
// name, the words and the signature where they were.
//
// ── the two flags ───────────────────────────────────────────────────────────
// `started` keeps the confirm from being sent twice under React's development
// StrictMode, and `alive` says whether the screen is still mounted. The same
// two Signin.jsx carries, for the same reason.
import { useEffect, useRef, useState } from 'react'
import { Display, Label, Pill, Prose, Waiting } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import { confirmCheckout } from '../api/billing.js'
import { loadPending } from '../wall/handoff.js'
import { useSkyAvoid } from '../wall/ground.jsx'
import TopBar from './TopBar.jsx'

function fromQuery() {
  try {
    const q = new URLSearchParams(window.location.search || '')
    const s = q.get('s') || ''
    return { session: /^cs_[A-Za-z0-9_]+$/.test(s) ? s : '', cancelled: q.get('c') === '1' }
  } catch {
    return { session: '', cancelled: false }
  }
}

// The letter that was on the glass when the person left for Stripe, if it is
// still there. Null when there is none, which is the sky's own quiet line.
function stashedLetter() {
  const p = loadPending()
  return p && p.use === 'paid' && p.to ? p : null
}

export default function Paid({ go, who }) {
  const [{ session, cancelled }] = useState(fromQuery)
  // confirming | held | landing | cancelled | missing
  const [phase, setPhase] = useState(cancelled ? 'cancelled' : session ? 'confirming' : 'missing')
  const [kind, setKind] = useState('slot')
  const [tries, setTries] = useState(0)
  const started = useRef(false)
  const alive = useRef(true)
  const avoid = useSkyAvoid()
  const letter = stashedLetter()

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (!session || started.current) return
    started.current = true
    ;(async () => {
      // The session id is in the address bar. Take it out before anything
      // else: a reload, or a shared link, must not confirm it again.
      window.history.replaceState(window.history.state, '', '/paid')

      let r = await confirmCheckout(session)
      if (!alive.current) return
      // Paid, but not yet applied on our side: the webhook is a beat away.
      // One more ask, then the honest screen.
      if (r?.ok && !r.paid) {
        await new Promise((res) => setTimeout(res, 2500))
        if (!alive.current) return
        r = await confirmCheckout(session)
        if (!alive.current) return
      }
      if (r?.ok && r.paid) {
        setKind(r.kind === 'steady' ? 'steady' : 'slot')
        setPhase('held')
        return
      }
      setPhase('landing')
    })()
  }, [session, tries])

  const again = () => { started.current = false; setPhase('confirming'); setTries((n) => n + 1) }
  const toLetter = () => go('place', letter ? letter.to : undefined)

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid">
        {phase === 'confirming' ? (
          <>
            <Label><Sparkle size={11} />one moment</Label>
            <Waiting label="confirming" />
          </>
        ) : phase === 'held' ? (
          <>
            <Label><Sparkle size={11} />held</Label>
            <Display size="m" as="h1" ref={avoid}>
              {kind === 'steady' ? <>Unlimited,<br />held.</> : <>One more,<br />held.</>}
            </Display>
            <Prose className="mn-copy">
              {kind === 'steady'
                ? 'as many out at once as you like, each standing six months.'
                : 'the slot is yours, for good.'}
            </Prose>
          </>
        ) : phase === 'cancelled' ? (
          <>
            <Display size="m" as="h1" ref={avoid}>Nothing was<br />charged.</Display>
            <Prose className="mn-copy">you can let one go instead. free, always.</Prose>
          </>
        ) : phase === 'landing' ? (
          <>
            <Display size="m" as="h1" ref={avoid}>It&rsquo;s still<br />landing.</Display>
            <Prose className="mn-copy">
              if the payment went through, the slot arrives on its own. nothing to do.
            </Prose>
          </>
        ) : (
          <>
            <Display size="m" as="h1" ref={avoid}>Nothing to<br />confirm here.</Display>
            <Prose className="mn-copy">your sky has what you hold.</Prose>
          </>
        )}
      </div>

      {phase !== 'confirming' ? (
        <div className="mn-foot">
          {phase === 'held' ? (
            <>
              <Pill tone="light" wide onClick={toLetter}>{letter ? 'place it' : 'place a ping'}</Pill>
              <button type="button" className="wl-quiet" onClick={() => go('sky')}>your sky</button>
            </>
          ) : phase === 'cancelled' ? (
            letter ? (
              <>
                <Pill tone="light" wide onClick={toLetter}>back to the letter</Pill>
                <button type="button" className="wl-quiet" onClick={() => go('sky')}>your sky</button>
              </>
            ) : (
              <Pill tone="light" wide onClick={() => go('sky')}>your sky</Pill>
            )
          ) : phase === 'landing' ? (
            <>
              <Pill tone="light" wide onClick={again}>try again</Pill>
              <button type="button" className="wl-quiet" onClick={() => go('sky')}>your sky</button>
            </>
          ) : (
            <Pill tone="light" wide onClick={() => go('sky')}>your sky</Pill>
          )}
        </div>
      ) : null}
    </main>
  )
}

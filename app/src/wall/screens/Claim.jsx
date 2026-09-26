// ── /claim/:handle: THIS IS ABOUT ME ────────────────────────────────────────
//
// Raised from a letter's menu by the person the letter is written to. It asks
// the one thing that makes them its owner, the Instagram DM (docs/ONE-WALL.md:
// "Instagram verification is ownership only"), and then the one thing worth
// offering an owner: an email when somebody writes to them.
//
//   prove    the letter's @ in the field, and the DM. The proof is the one
//            every other screen runs (Ping.jsx `useProve`, `ProveDoor`), filed
//            under its own use so a reload on the way back from Instagram
//            resumes this sheet and nobody else's.
//   yours    it is theirs. The letter's menu now has remove on it, with an
//            undo, and the sheet asks: "want an email when someone writes to
//            you?"
//   email    no confirmed address yet: one is typed and sent a link, and the
//            alert goes on once the link is opened (Alerts.jsx `useAlertLink`).
//   on       done, and where to turn it off.
//
// Whoever DMs the code is who is proved (0012). When that is somebody other
// than the letter's @, the sheet says so plainly and changes nothing about
// the letter: the proof is theirs, the letter is not.
import { useLayoutEffect, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Pill, ClosePill, CloseQuiet, DoorHead, DoorFoot,
} from '../parts.jsx'
import { atHandle, normHandle, validHandle, loadHandle, loadWall } from '../data.js'
import { isVerified, refresh } from '../auth.js'
import { loadPending } from '../handoff.js'
import { forgetPings } from '../pings.js'
import { alertsGet, alertsSet } from '../../api/alerts.js'
import { useProve, ProveDoor } from './Ping.jsx'
import { useAlertLink, AlertEmail } from './Alerts.jsx'

export default function Claim({ handle: raw = '', go, up, upLabel = 'back' }) {
  const h = normHandle(raw)
  const [held] = useState(() => { const r = loadPending(); return r && r.use === 'claim' ? r : null })
  // prove · yours · asking · email · on · later · other
  const [step, setStep] = useState(() => (!held && validHandle(h) && isVerified(h) ? 'yours' : 'prove'))
  const [other, setOther] = useState('')
  const [masked, setMasked] = useState('')
  const [said, setSaid] = useState('')

  // ── the proof ──
  const proof = useProve({
    use: 'claim', held, stash: { claim: h },
    onLanded: async (got) => {
      await refresh()
      forgetPings()
      // the letters under the @ are read again, so the menu on the one
      // underneath says remove the moment this sheet goes
      loadHandle(h, true)
      if (got && got !== h) { loadHandle(got, true); setOther(got); setStep('other'); return }
      loadWall(true)
      setStep('yours')
    },
  })
  // The field opens on the letter's @, not on whichever @ this device last
  // proved: this sheet is about the letter. Before paint, so it never shows
  // the other one.
  useLayoutEffect(() => {
    if (!held && validHandle(h)) proof.setMine(h)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── the alert ──
  const turnOn = async () => {
    const s = await alertsSet(true, true)
    if (s?.ok) {
      const a = await alertsGet()
      setMasked(a?.ok ? String(a.email || '') : '')
      setStep('on')
      return true
    }
    if (s?.error === 'missing') { setStep('later'); return true }
    return s
  }
  const link = useAlertLink({
    onConfirmed: async () => {
      const s = await turnOn()
      if (s !== true) { setSaid('the address is confirmed, but the alert did not turn on. try again from your page.'); setStep('yours') }
    },
  })
  const want = async () => {
    setSaid('')
    setStep('asking')
    const a = await alertsGet()
    if (!a?.ok) {
      if (a?.error === 'missing') { setStep('later'); return }
      setSaid('that did not go through. try again.')
      setStep('yours')
      return
    }
    if (a.email_verified) {
      const s = await turnOn()
      if (s === true) return
      setSaid(s?.error === 'claim' ? 'this @ is not confirmed on this device any more. confirm it again.' : 'that did not go through. try again.')
      if (s?.error === 'claim') { setStep('prove'); return }
      setStep('yours')
      return
    }
    setStep('email')
  }

  const at = atHandle(h)
  let door
  let ways = null
  let quiet = null
  let legal = false

  if (step === 'prove') {
    legal = true
    door = (
      <ProveDoor
        p={proof} headId="wl-claim-h" onAsk={() => proof.ask()}
        title={<>is this letter<br />about you?</>}
        say="confirm this is your Instagram. then you can remove letters about you in one tap."
      />
    )
    quiet = proof.dm
      ? <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
      : <CloseQuiet onClose={up}>not now</CloseQuiet>
  } else if (step === 'other') {
    door = (
      <DoorHead
        id="wl-claim-h" title={<>that was<br />{atHandle(other)}.</>}
        say={`the code came from ${atHandle(other)}, so that is the @ you confirmed. this letter is to ${at}, so nothing about it changes.`}
      />
    )
    ways = <ClosePill tone="light" wide onClose={up}>done</ClosePill>
    quiet = (
      <button type="button" className="wl-quiet" onClick={() => { proof.setMine(h); setStep('prove') }}>
        confirm {at} instead
      </button>
    )
  } else if (step === 'yours' || step === 'asking') {
    const asking = step === 'asking'
    door = (
      <DoorHead
        id="wl-claim-h" title={<>it&rsquo;s yours.</>}
        say={`you can now remove letters to ${at} from their menu. want an email when someone writes to you?`}
      />
    )
    ways = (
      <>
        <Pill tone="light" wide onClick={want} disabled={asking} aria-busy={asking || undefined}>
          {asking ? 'one moment' : 'yes, email me'}
        </Pill>
        <div className="wl-gate-fault" aria-live="polite">{said}</div>
      </>
    )
    quiet = <CloseQuiet onClose={up}>not now</CloseQuiet>
  } else if (step === 'email') {
    door = (
      <DoorHead
        id="wl-claim-h" title={link.sent ? <>check your inbox.</> : <>where should<br />we email you?</>}
        say={link.sent ? null : 'we send a link to confirm the address. every alert has a link to stop them.'}
      />
    )
    ways = <AlertEmail link={link} autoFocus />
    quiet = <CloseQuiet onClose={up}>not now</CloseQuiet>
  } else if (step === 'on') {
    door = (
      <DoorHead
        id="wl-claim-h" title={<>you&rsquo;re set.</>}
        say={`we will email ${masked || 'you'} when someone writes to you, and when it’s mutual. you can turn this off on your page.`}
      />
    )
    ways = <ClosePill tone="light" wide onClose={up}>done</ClosePill>
    quiet = <button type="button" className="wl-quiet" onClick={() => go('you')}>open your page</button>
  } else {
    door = (
      <DoorHead
        id="wl-claim-h" title={<>it&rsquo;s yours.</>}
        say={`you can now remove letters to ${at} from their menu. email alerts are not ready yet. they will be on your page when they are.`}
      />
    )
    ways = <ClosePill tone="light" wide onClose={up}>done</ClosePill>
  }

  return (
    <Sheet onClose={up} tall labelledBy="wl-claim-h">
      <div className="wl-sheet-in wl-gate is-door wl-claim">
        <SheetHead onClose={up} label={upLabel} />
        <div className="wl-push" />
        {step === 'prove' ? door : (
          <div className="wl-door">
            {door}
            {ways ? <div className="wl-door-ways">{ways}</div> : null}
          </div>
        )}
        <div className="wl-push" />
        {quiet ? <SheetFoot>{quiet}</SheetFoot> : null}
        {legal ? <DoorFoot /> : null}
      </div>
    </Sheet>
  )
}

// /beta/claim/:id — VERIFY
//
// A wall of letters addressed to named people is only safe if the person who
// answers one is the person it was addressed to. Everything downstream — the
// ask, the seal, the takedown — rests on this screen being real.
//
// In the beta the code is accepted after 1200ms if it is six digits. The
// INTERFACE is shaped for the production path (an Instagram DM delivered by
// ManyChat, the same relay app/src/api/igverify.js already uses in production),
// so the mock swaps out for the real adapter without a line changing here.

import { useEffect, useRef, useState } from 'react'
import { ArrowLink, Display, HandleField, Help } from '../parts.jsx'
import { atHandle, normHandle } from '../handles.js'
import { repo } from '../data/index.js'
import { getState, patch } from '../store.js'

export default function Claim({ id, go, setSkyMode }) {
  const [phase, setPhase] = useState('handle')   // handle | code | ok
  const [handle, setHandle] = useState(() => getState().query || getState().handle || '')
  const [challenge, setChallenge] = useState('')
  const [cells, setCells] = useState(['', '', '', '', '', ''])
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const inputs = useRef([])

  useEffect(() => { setSkyMode('dim') }, [setSkyMode])

  const ok = normHandle(handle).length >= 3
  const code = cells.join('')

  async function sendCode() {
    if (!ok || busy) return
    setBusy(true)
    const res = await repo.startVerification(normHandle(handle))
    setChallenge(res.challengeId)
    setBusy(false)
    setPhase('code')
    setTimeout(() => inputs.current[0] && inputs.current[0].focus(), 60)
  }

  // Paste-aware: a six-digit code arriving from a DM is pasted, not typed, and
  // a field that takes only the first character of a paste is a field somebody
  // fights six times.
  function setCell(i, raw) {
    const digits = String(raw || '').replace(/\D/g, '')
    if (!digits) { setCells((c) => c.map((v, k) => (k === i ? '' : v))); return }
    setCells((c) => {
      const next = [...c]
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k]
      return next
    })
    const land = Math.min(5, i + digits.length)
    const el = inputs.current[land]
    if (el) el.focus()
  }

  function onKey(i, e) {
    if (e.key === 'Backspace' && !cells[i] && i > 0) {
      e.preventDefault()
      setCells((c) => c.map((v, k) => (k === i - 1 ? '' : v)))
      const el = inputs.current[i - 1]
      if (el) el.focus()
    }
  }

  async function confirm() {
    if (busy) return
    if (!/^\d{6}$/.test(code)) { setProblem("That's not six digits."); return }
    setProblem('')
    setBusy(true)
    const res = await repo.confirmVerification(challenge, code)
    setBusy(false)
    if (!res.ok) { setProblem("That's not six digits."); return }
    await repo.claimLetter(id, normHandle(handle))
    patch({ handle: normHandle(handle) })
    setPhase('ok')
    // the hairlines brighten in sequence at a 60ms stagger — the interface
    // counting them for you — and then it cuts
    setTimeout(() => go('ask', id), 900)
  }

  if (phase === 'handle') {
    return (
      <div className="beta-col">
        <div className="beta-lede-s" />
        <Display size={38}>This is you?</Display>
        <Help style={{ marginTop: 18 }}>
          We&rsquo;ll send a code to your Instagram DMs. It&rsquo;s how we know a handle belongs to
          the person holding it.
        </Help>
        <div style={{ marginTop: 36 }}>
          <HandleField value={handle} onChange={setHandle} onSubmit={sendCode} />
        </div>
        <div className="beta-push" />
        <ArrowLink onClick={sendCode} disabled={!ok || busy}>send the code</ArrowLink>
      </div>
    )
  }

  return (
    <div className="beta-col">
      <div className="beta-lede-s" />
      <Display size={34}>Six digits.</Display>
      <Help style={{ marginTop: 18 }} small>
        Sent to {atHandle(handle)} on Instagram.
      </Help>

      <div className={`beta-code${phase === 'ok' ? ' is-ok' : ''}`} style={{ marginTop: 34 }}>
        {cells.map((v, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            value={v}
            onChange={(e) => setCell(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label={`Digit ${i + 1}`}
            style={{ '--stagger': `${i * 60}ms` }}
          />
        ))}
      </div>

      {problem && <Help style={{ marginTop: 20 }} small>{problem}</Help>}

      <div className="beta-push" />
      {phase !== 'ok' && <ArrowLink onClick={confirm} disabled={busy}>confirm</ArrowLink>}
    </div>
  )
}

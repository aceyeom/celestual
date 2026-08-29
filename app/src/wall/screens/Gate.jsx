// ── /beta/gate — THE DOOR ON THE LETTERS ────────────────────────────────────
//
// The index is public and the letters are not, and this is the whole of the
// difference between those two facts.
//
// ── why the gate is here and not one screen earlier ─────────────────────────
// A person who has just scanned a code off a card has given the wall about
// four seconds, and a sign-in is not something anybody spends four seconds on
// for a thing they have not seen yet. So the wall itself asks nothing: the
// names, the counts, the search and the composer are all open, and the first
// time anybody is asked for anything is the moment they try to read what
// somebody actually wrote. By then the wall has already made its case.
//
// ── two words for one thing ─────────────────────────────────────────────────
// Registering and signing in are the same two steps and the same two fields,
// because in a build with no server they genuinely are. Rather than mime two
// different flows, this screen names the one it is on and changes nothing else
// — one heading, one line of copy, and the same address and code beneath.
//
// ── what a signed-in address buys, and what it does not ─────────────────────
// It opens the letters. That is the entire list. It is never attached to
// anything anybody writes, the composer never reads it, and no letter gains an
// author because somebody is signed in — the wall is anonymous by shape, not
// by policy, and there is no field in a letter for this to leak into.

import { useState } from 'react'
import { Sheet, Display, Label, Pill, Close, Prose } from '../parts.jsx'
import { Ecliptic } from '../art.jsx'
import { DOMAIN, emailFault, member, normEmail, signIn, signOut, validCode, validEmail } from '../auth.js'

// The composer's own field, reused: a bare baseline with the constant part of
// the string painted beside it rather than typed into it. The '@berkeley.edu'
// is not in the value, cannot be backspaced away, and cannot be got wrong.
function AddressField({ value, onChange, onSubmit }) {
  return (
    <div className="wl-addr">
      <input
        className="wl-addr-in" value={value} onChange={(e) => onChange(e.target.value)}
        /* Sized to what is in it, so the painted half sits flush against the
           typed half and the two read as one address rather than as a box with
           a domain parked to the right of it. */
        style={{ width: `${Math.max(3, value.length) + 0.4}ch` }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
        aria-label="your berkeley address" placeholder="you"
        type="text" inputMode="email" autoComplete="username"
        autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="next"
      />
      <span className="wl-addr-fix" aria-hidden="true">@{DOMAIN}</span>
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

function CodeField({ value, onChange, onSubmit }) {
  return (
    <div className="wl-code">
      <input
        className="wl-code-in" value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
        aria-label="the six digit code" placeholder="000000"
        type="text" inputMode="numeric" autoComplete="one-time-code"
        autoCorrect="off" spellCheck="false" enterKeyHint="go"
      />
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

export default function Gate({ back }) {
  // Held in state rather than read on every render: signing out has to repaint
  // this sheet, and the store is not something React is watching.
  const [who, setWho] = useState(() => member())
  const [mode, setMode] = useState('register')   // register · signin
  const [step, setStep] = useState(0)            // 0 the address · 1 the code
  const [local, setLocal] = useState('')
  const [code, setCode] = useState('')

  const email = normEmail(`${local}@${DOMAIN}`)
  const fault = local.includes('@') ? emailFault(local) : ''
  const ok = validEmail(email)

  const finish = () => {
    if (!validCode(code)) return
    signIn(email)
    back()
  }

  // ── signed in ──
  // Not a dashboard. It says which address is open, offers the one thing
  // somebody comes back here for, and gets out of the way.
  if (who) {
    return (
      <Sheet onClose={back} labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate">
          <div className="wl-gate-top">
            <Ecliptic size={22} className="wl-gate-mark" />
            <Close onClick={back} />
          </div>
          <Display size="s" as="h2" id="wl-gate-h">The letters are open.</Display>
          <Label tone="dim" className="wl-gate-who"><span className="wl-h">{who}</span></Label>
          <Prose className="wl-gate-copy">
            Nothing you write is signed with it. The composer has never asked who is
            writing and it does not start now.
          </Prose>
          <div className="wl-push" />
          <div className="wl-gate-foot">
            <Pill tone="light" wide onClick={back}>read the wall</Pill>
            <button
              type="button" className="wl-quiet"
              onClick={() => { signOut(); setWho(null); setMode('signin'); setStep(0) }}
            >
              sign out on this device
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  const registering = mode === 'register'

  return (
    <Sheet onClose={back} tall labelledBy="wl-gate-h">
      <div className="wl-sheet-in wl-gate">
        <div className="wl-gate-top">
          <Ecliptic size={22} className="wl-gate-mark" />
          <Close onClick={back} />
        </div>

        <Display size="s" as="h2" id="wl-gate-h">
          {step === 0
            ? (registering ? <>Letters are for<br />Berkeley.</> : <>Come back in.</>)
            : <>Six digits, and<br />you&rsquo;re in.</>}
        </Display>

        {step === 0 ? (
          <div className="wl-gate-step">
            <Label tone="dim" className="wl-gate-note">
              the names are public. what was written is not
            </Label>
            <AddressField value={local} onChange={setLocal} onSubmit={() => ok && setStep(1)} />
            <div className="wl-gate-fault" aria-live="polite">{fault}</div>
          </div>
        ) : (
          <div className="wl-gate-step">
            {/* Not "sent to". Nothing has been sent, and a screen that says
                it has, three lines above a note explaining that it has not, is
                the kind of small lie that makes everything near it suspect. */}
            <Label tone="dim" className="wl-gate-note">
              for <span className="wl-h">{email}</span>
            </Label>
            <CodeField value={code} onChange={setCode} onSubmit={finish} />
            {/* Said plainly, on the screen, where somebody about to type
                something into it will read it. A beta that quietly accepts
                anything and does not say so is teaching the wrong thing about
                what this build does with what it is given. */}
            <p className="wl-gate-beta">
              This is the beta. No mail is sent yet, and any six digits will let you in.
            </p>
          </div>
        )}

        <div className="wl-push" />

        <div className="wl-gate-foot">
          {step === 0 ? (
            <>
              <Pill tone="light" wide disabled={!ok} onClick={() => setStep(1)}>
                {registering ? 'register' : 'send me a code'}
              </Pill>
              <button
                type="button" className="wl-quiet"
                onClick={() => setMode(registering ? 'signin' : 'register')}
              >
                {registering ? 'already registered? sign in' : 'new here? register'}
              </button>
            </>
          ) : (
            <>
              <Pill tone="light" wide disabled={!validCode(code)} onClick={finish}>
                {registering ? 'finish' : 'sign in'}
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => { setCode(''); setStep(0) }}>
                use a different address
              </button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}

// ── /berkeley/gate — THE DOOR ON THE LETTERS ────────────────────────────────
//
// The index is public and the letters are not, and this is the whole of the
// difference between those two facts.
//
// ── why the gate is here and not one screen earlier ─────────────────────────
// A person who has just scanned a code off a card has given the wall about
// four seconds, and a sign-in is not something anybody spends four seconds on
// for a thing they have not seen yet. So the INDEX asks nothing: the names,
// the counts and the search are open to everybody and always will be, and the
// first time anybody is asked for anything is the moment they reach for one of
// the three things that touch what is on the wall — reading a letter, writing
// one, taking one down. By then the wall has already made its case.
//
// ── two words for one thing ─────────────────────────────────────────────────
// Registering and signing in are the same two steps and the same two fields,
// because in a build with no server they genuinely are. Rather than mime two
// different flows, this screen names the one it is on and changes nothing else
// — one heading, one line of copy, and the same address and code beneath.
//
// ── what a signed-in address buys, and what it does not ─────────────────────
// Three things and no fourth: READING a letter, WRITING one, and REPORTING one.
// They are the three acts that touch what is on the wall, and the index — the
// names, the counts, the search — stays open to everybody, forever, because a
// person who has just scanned a code off a card has to be able to see what this
// is before answering anything.
//
// It is never attached to anything anybody writes. The composer never reads it,
// no letter gains an author because somebody is signed in, and there is no
// field in a letter for this to leak into — the wall is anonymous by SHAPE, not
// by policy. Being let in and being known are two different things, and only
// the first one happens here.

import { useState } from 'react'
import { Sheet, SheetHead, SheetFoot, Display, Label, Pill, Rule, Icon } from '../parts.jsx'
import { Mark } from '../art.jsx'
import { atHandle } from '../data.js'
import { getState } from '../store.js'
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

export default function Gate({ go, back }) {
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
  //
  // Not a dashboard, and no longer a status message either. It used to open on
  // "The wall is open." over the address set small underneath, which is a
  // sentence about the software's state where the person tapping wants a
  // sentence about themselves: they came here to check WHICH ADDRESS is signed
  // in on this phone, and that fact was the smallest thing on the sheet.
  //
  // So the address is the heading now, set in the identifier face the way every
  // other identifier in the build is, with the constellation of it beside it.
  // Under it, the one thing this device actually knows about them: the names
  // they have written to. Then the way on, and the way out.
  if (who) {
    const wrote = getState().wroteTo || []
    return (
      <Sheet onClose={back} labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate wl-acct">
          <SheetHead onClose={back} label="back to the wall" />

          <div className="wl-acct-id">
            <Mark handle={who} size={44} lit />
            <div className="wl-acct-name">
              <p className="wl-acct-addr" id="wl-gate-h">{who}</p>
              <Label tone="dim">signed in on this device</Label>
            </div>
          </div>

          <Rule className="wl-acct-rule" />

          {/* ── who this device has written to ──
              The letters are anonymous and stay anonymous: nothing on a letter
              points back here, and this list is read out of this browser rather
              than out of the wall. It is the one thing an account can honestly
              show somebody without breaking the thing the account is for. */}
          <div className="wl-acct-sect">
            <Label tone="dim">you have written to</Label>
            {wrote.length ? (
              <div className="wl-acct-wrote">
                {wrote.map((h) => (
                  <span className="wl-acct-chip" key={h}>
                    <Mark handle={h} size={20} />
                    <span>{atHandle(h)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="wl-acct-none">nobody yet</p>
            )}
          </div>

          <div className="wl-push" />

          <SheetFoot>
            <Pill tone="light" wide icon={<Icon name="join" size={17} />} onClick={() => go('join')}>
              try mutual matching
            </Pill>
            <button
              type="button" className="wl-quiet"
              onClick={() => { signOut(); setWho(null); setMode('signin'); setStep(0) }}
            >
              sign out
            </button>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const registering = mode === 'register'

  return (
    <Sheet onClose={back} tall labelledBy="wl-gate-h">
      <div className="wl-sheet-in wl-gate">
        <SheetHead onClose={back} label="back to the wall" />

        <Display size="s" as="h2" id="wl-gate-h">
          {step === 0
            ? (registering ? <>The wall is<br />for Berkeley.</> : <>Come back in.</>)
            : <>Six digits, and<br />you&rsquo;re in.</>}
        </Display>

        {step === 0 ? (
          <div className="wl-gate-step">
            {/* The rule, in one line, said where somebody is deciding whether
                to answer for it.

                It used to read "the names are public. reading, writing and
                reporting are not", which is precise and is the wrong sentence.
                It asks the reader to hold four nouns and one negation to work
                out what it means for them, and what it means for them is one
                short fact they are already worried about. So it says that. */}
            <Label tone="dim" className="wl-gate-note">
              your information will stay anonymous
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
                something into it will read it. A door that quietly accepts
                anything and does not say so is teaching the wrong thing about
                what this build does with what it is given. It comes off the
                screen the day the code is mailed, and not one day before. */}
            <p className="wl-gate-beta">
              No mail yet. Any six digits will let you in.
            </p>
          </div>
        )}

        <div className="wl-push" />

        <SheetFoot>
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
        </SheetFoot>
      </div>
    </Sheet>
  )
}

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
// because until Phase 6b they genuinely were. Rather than mime two
// different flows, this screen names the one it is on and changes nothing else
// — one heading, one line of copy, and the same address and code beneath.
//
// ── what a signed-in address buys, and what it does not ─────────────────────
// Since migration 0044 this door is not the only way to READ. Either proof this
// product takes opens the letters, the heart and the report: a campus address,
// or a handle proved by the DM code on Main. What this address and only this
// address buys is WRITING, three letters in any seven days.
//
// The index stays open to everybody, forever, because a person who has just
// scanned a code off a card has to be able to see what this is before answering
// anything.
//
// It is never attached to anything anybody writes. The composer never reads it,
// no letter gains an author because somebody is signed in, and there is no
// field in a letter for this to leak into — the wall is anonymous by SHAPE, not
// by policy. Being let in and being known are two different things, and only
// the first one happens here.

import { useEffect, useState } from 'react'
import { Sheet, SheetHead, SheetFoot, Display, Label, Pill, Face, Icon, Allowance } from '../parts.jsx'
import { atHandle, allowance, loadQuota } from '../data.js'
import { getState, takeAfterGate } from '../store.js'
import { DOMAIN, anyEmail, isReader, member, memberLabel, normEmail, signOut, validCode, validEmail } from '../auth.js'
import { sendCampusCode, checkCampusCode } from '../handoff.js'
import { cardStep } from '../seed.js'

// The composer's own field, reused: a bare baseline with the constant part of
// the string painted beside it rather than typed into it. The '@berkeley.edu'
// is not in the value, cannot be backspaced away, and cannot be got wrong.
//
// Typed with its own @, the address stands whole and the painted half comes
// off. That is how an address the desk put on the pass list (migration 0043)
// gets in: it is not at the campus, the server knows whether it passes, and
// the field does not argue.
function AddressField({ value, onChange, onSubmit }) {
  const whole = value.includes('@')
  return (
    <div className={`wl-addr${whole ? ' is-whole' : ''}`}>
      <input
        className="wl-addr-in" value={value} onChange={(e) => onChange(e.target.value)}
        /* Sized to what is in it, so the painted half sits flush against the
           typed half and the two read as one address rather than as a box with
           a domain parked to the right of it. Capped, so a long local part
           scrolls inside the field rather than pushing the domain off the
           screen. */
        style={whole ? undefined : { width: `${Math.min(22, Math.max(3, value.length)) + 0.4}ch` }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
        aria-label={whole ? 'your address' : 'your berkeley address'} placeholder="you"
        type="text" inputMode="email" autoComplete="username"
        autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="next"
      />
      {whole ? null : <span className="wl-addr-fix" aria-hidden="true">@{DOMAIN}</span>}
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
        aria-label="the code from the mail" placeholder="000000"
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
  const [token, setToken] = useState(null)   // the correlation id for the code out
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')       // what went wrong, in words

  // Somebody may already be able to READ without holding an address here: a
  // handle proved on Main opens the letters (migration 0044). This sheet then
  // asks for the one thing they still do not have, and says so, rather than
  // telling a person who is reading the wall that the wall is not for them.
  const reads = isReader()

  // The allowance, for the account sheet. Asked on mount rather than on the
  // composer alone, because "how many letters do I have left" is a question
  // about the account and this is the account screen.
  useEffect(() => { if (who) loadQuota() }, [who])
  const left = allowance()

  // A local part at the campus, or a whole address typed with its @. The
  // server is the gate either way (the campus, or the desk's pass list).
  const whole = local.includes('@')
  const email = whole ? normEmail(local) : normEmail(`${local}@${DOMAIN}`)
  const ok = whole ? anyEmail(email) : validEmail(email)

  // ── the code goes out ──
  // celestual-edu-verify checks the address is at this campus's domain, mints a
  // six digit code, stores only its hash, and mails it. The code rides the
  // subject line too, so the notification alone is enough to read it.
  const send = async () => {
    if (!ok || busy) return
    setBusy(true)
    setSaid('')
    const out = await sendCampusCode(email)
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'rate' ? 'too many codes for that address. try again in an hour'
          : out.error === 'domain' || out.error === 'email' ? `that is not a ${DOMAIN} address`
          : 'the mail did not go out. try again',
      )
      return
    }
    setToken(out.token)
    setStep(1)
    // The step before the proof: somebody gave an address and asked for a code.
    // Logged here rather than when this sheet opens, because the sheet is also
    // the account screen and a person reading their own address on it has not
    // done anything. It says which card produced intent, and the 'joined' step
    // in auth.js says which produced a proof. The gap between the two is the
    // mail arriving, and it is worth being able to see.
    cardStep('gate')
  }

  // ── and comes back ──
  // On a match the address is bound to this browser's identity row, which is
  // what makes the campus outlast the tab and carry across to Main. The address
  // signed in with is the one the SERVER verified.
  const finish = async () => {
    if (!validCode(code) || busy || !token) return
    setBusy(true)
    setSaid('')
    const out = await checkCampusCode(token, code)
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'expired' ? 'that code has lapsed. ask for another'
          : out.error === 'other_campus' ? 'this device is already at another campus'
          : out.error === 'identity' ? 'the address checked out, but this device could not be signed in. try once more'
          : 'that code is not right',
      )
      return
    }
    setWho(out.email)
    // Back to whatever sent somebody here: the letter they pressed "read it"
    // on, the composer, the report. The wall, when nothing did.
    const after = takeAfterGate()
    if (after) go(after.name, after.id)
    else back()
  }

  // ── signed in ──
  //
  // Not a dashboard, and no longer a status message either. It used to open on
  // "The wall is open." over the address set small underneath, which is a
  // sentence about the software's state where the person tapping wants a
  // sentence about themselves: they came here to check WHICH ADDRESS is signed
  // in on this phone, and that fact was the smallest thing on the sheet.
  //
  // So it is a card now (wall.css `.wl-profile`): one object on the sheet
  // that is the person, the way the paper is the letter. The disc, wearing
  // the address's initial because an address is not a handle and has no face
  // to resolve; the address beside it, in the identifier face like every
  // other identifier in the build; and nothing under it. It used to say
  // "verified address" there with a point of the accent beside it, which is
  // a status badge, and a status badge is the one object every account
  // screen on the web carries: an address that is on this card is on it
  // because it was verified, and the card does not need to say so twice.
  // Then the one thing this device honestly knows about them, the names they
  // have written to. The week's allowance is not drawn on it: nobody opens
  // their own account to be shown a meter, and the card says one line, once,
  // when the week is spent.
  //
  // The way out stands in the foot as a capsule carrying its own glyph, the
  // door and the arrow out of it, rather than as a grey sentence: it is a
  // real act with a real consequence and it should look like one, quietly.
  if (who) {
    const wrote = getState().wroteTo || []
    const spent = !!left && left.left <= 0
    const out = () => { signOut(); setWho(null); setMode('signin'); setStep(0) }
    return (
      <Sheet onClose={back} labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate">
          <SheetHead onClose={back} label="back to the wall" />

          <section className="wl-profile" aria-labelledby="wl-gate-h">
            <div className="wl-profile-id">
              <Face handle={who} size={52} resolve={false} className="wl-profile-face" />
              <div className="wl-profile-who">
                <p className="wl-profile-addr" id="wl-gate-h">{memberLabel(who)}</p>
              </div>
            </div>

            {/* ── who this device has written to ──
                The letters are anonymous and stay anonymous: nothing on a
                letter points back here, and this list is read out of this
                browser rather than out of the wall. It is the one thing an
                account can honestly show somebody without breaking the thing
                the account is for. */}
            <div className="wl-profile-sect">
              <Label tone="dim">written to</Label>
              {wrote.length ? (
                <div className="wl-profile-wrote">
                  {wrote.map((h) => (
                    <span className="wl-profile-chip" key={h}>
                      <Face handle={h} size={22} />
                      <span>{atHandle(h)}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="wl-profile-none">nobody yet</p>
              )}
            </div>

            {spent ? (
              <Allowance left={left.left} limit={left.limit} className="wl-profile-cap" />
            ) : null}
          </section>

          <div className="wl-push" />

          <SheetFoot>
            <Pill tone="light" wide onClick={() => go('join')}>
              try mutual matching
            </Pill>
            <Pill tone="ghost" className="wl-profile-out" icon={<Icon name="signout" size={15} />} onClick={out}>
              sign out
            </Pill>
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

        {/* ── the heading names the act, not the wall ──
            It used to open on "The wall is for Berkeley", which is a statement
            about the room and leaves the person in front of it to work out what
            is being asked of them. What is being asked of them is one thing, so
            it says that thing. The other branch — for somebody who can already
            read here and is only missing the address that lets them write —
            said "Letters are written by Berkeley", a sentence long enough to
            need parsing for a fact that fits in two words. */}
        <Display size="s" as="h2" id="wl-gate-h">
          {step === 0
            ? (!registering ? <>Come back in.</>
              : reads ? <>Berkeley only.</>
              : <>Verify you&rsquo;re<br />at Berkeley.</>)
            : <>The code from<br />the mail, and you&rsquo;re in.</>}
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
            <AddressField value={local} onChange={setLocal} onSubmit={send} />
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
        ) : (
          <div className="wl-gate-step">
            {/* "Sent to" is true now. It was "for" while nothing was mailed,
                because a screen that says it has sent something, three lines
                above a note explaining that it has not, is the kind of small
                lie that makes everything near it suspect. */}
            <Label tone="dim" className="wl-gate-note">
              sent to <span className="wl-h">{email}</span>
            </Label>
            <CodeField value={code} onChange={setCode} onSubmit={finish} />
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
        )}

        <div className="wl-push" />

        <SheetFoot>
          {step === 0 ? (
            <>
              <Pill tone="light" wide disabled={!ok || busy} onClick={send}>
                {busy ? 'sending…' : registering ? 'register' : 'send me a code'}
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
              <Pill tone="light" wide disabled={!validCode(code) || busy} onClick={finish}>
                {busy ? 'checking…' : registering ? 'finish' : 'sign in'}
              </Pill>
              <button type="button" className="wl-quiet"
                onClick={() => { setCode(''); setToken(null); setSaid(''); setStep(0) }}>
                use a different address
              </button>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

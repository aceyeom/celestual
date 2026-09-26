// ── /gate: THE DOOR ON THE LETTERS ──────────────────────────────────────────
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
// ── one wall, one door (docs/ONE-WALL.md) ───────────────────────────────────
// There was a campus wall at /berkeley that asked for a berkeley.edu address
// and a code at this door, since that was what wrote there. There is one wall
// now, and writing is not behind this door at all: a letter is written first,
// and a post to an @ asks for a Berkeley address when it is sent, by a link
// (screens/Write.jsx). So this door asks for a person, by any of the three
// proofs the product takes: an instagram handle through the DM code, a google
// account, or an address a link is mailed to. Instagram is put first and
// recommended, and the reason is said on the row: it is the only one of the
// three that lets the product tell somebody when a ping of theirs is mutual,
// because that is where the ping lives.
//
// ── the address door is a link, not a code (migration 0065) ─────────────────
// It was a six digit code, mailed by Supabase Auth. The live project mailed
// Supabase's own undesigned template, with EIGHT digits, into a box that holds
// six, so the door could not be walked through at all. It is the product's own
// link now, the one the campus proof already used: mailed in the black room
// from hello@celestual.us, with two digits this screen shows large and the
// mail prints, tapped on whichever device the mail is read on. This sheet
// waits for the tap (wall/linkdoor.jsx) and moves on the moment it lands; a
// tap on this same phone opens /verify, which says so and signs it in there.
// Whoever already holds the address is who this device becomes, with their
// @ and their private notes (auth.js `restoreProof`).
//
// ── the door names the act that knocked on it ───────────────────────────────
// Three acts come here and only one of them is writing, so a door that asks
// the writer's question every time is wrong for two of the three. The
// commonest arrival is the one it fitted worst: somebody who has read the
// free letters (migration 0045, 0049), pressed "read it" under a shut one,
// and met "verify you're at Berkeley", a sentence about a room, in answer
// to a question about a letter. The screen that sent them already leaves a
// return address behind (store.js `setAfterGate`), so the heading reads it
// and says what they are here to get back to: the whole wall. A person who
// pressed a sign in chip on the bar left no return address and gets the
// heading the door always had.
//
// ── what a signed-in person buys, and what they do not ──────────────────────
// Reading, the heart and the report, by any proof. It is never attached to
// anything anybody writes. The composer never reads it, no letter gains an
// author because somebody is signed in, and there is no field in a letter
// for this to leak into — the wall is anonymous by SHAPE, not by policy.
// Being let in and being known are two different things, and only the first
// one happens here.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Pill,
  HandleField, DmCode, VerifyHead, DoorHead, DoorFoot, Or,
} from '../parts.jsx'
import { Ecliptic, Envelope, Google, Provider } from '../art.jsx'
import { normHandle, validHandle, heart } from '../data.js'
import { takeAfterGate, peekAfterGate, setAfterGate } from '../store.js'
import {
  anyEmail, isReader, isMember, member, normEmail, signedIn,
} from '../auth.js'
import {
  startHandoff, pollHandoff,
  savePending, loadPending, clearPending, igVerifyEnabled,
} from '../handoff.js'
import { loginEnabled, startGoogle, sendEmailLink, finishLogin } from '../../api/login.js'
import { useLinkWait, LinkMatch, LinkWaiting, ResendLink } from '../linkdoor.jsx'
import { href } from '../router.js'
import { cardStep } from '../seed.js'
import { Caret } from '../caret.jsx'
import { usePhone } from '../parts.jsx'
import You from './You.jsx'

// The composer's own field, reused: a bare baseline with the constant part of
// the string painted beside it rather than typed into it. The '@berkeley.edu'
// is not in the value, cannot be backspaced away, and cannot be got wrong.
//
// Typed with its own @, the address stands whole and the painted half comes
// off. That is how a department's address (`eecs.berkeley.edu`) and an
// address the desk put on the pass list (migration 0043) get in: the server
// knows whether it passes, and the field does not argue. Here, on the door,
// there is no painted half: any address is whole. The composer paints
// Berkeley's (screens/Write.jsx).
export function AddressField({ value, onChange, onSubmit, domain = '', autoFocus = false, label = '' }) {
  const whole = !domain || value.includes('@')
  const ref = useRef(null)
  const phone = usePhone()
  useEffect(() => {
    if (!autoFocus || !ref.current) return
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) ref.current.focus()
  }, [autoFocus])
  return (
    <div className={`wl-addr${whole ? ' is-whole' : ''}`}>
      <input
        ref={ref} className="wl-addr-in" value={value} onChange={(e) => onChange(e.target.value)}
        /* Sized to what is in it, so the painted half sits flush against the
           typed half and the two read as one address rather than as a box with
           a domain parked to the right of it. Capped, so a long local part
           scrolls inside the field rather than pushing the domain off the
           screen. */
        style={whole ? undefined : { width: `${Math.min(22, Math.max(3, value.length)) + 0.4}ch` }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
        aria-label={label || (domain && !whole ? `your ${domain.split('.')[0]} address` : 'your address')}
        placeholder={domain ? 'you' : 'you@anywhere.com'}
        type="text" inputMode="email" autoComplete="username"
        autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="next"
      />
      {/* the phone's caret, on the wall (caret.jsx) */}
      {phone ? <Caret of={ref} /> : null}
      {whole ? null : <span className="wl-addr-fix" aria-hidden="true">@{domain}</span>}
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

// The return address across a redirect. The gate remembers where to land
// once it opens (store.js `setAfterGate`), in memory; a login that leaves
// for Google and comes back is a fresh tab, so the address is put away in
// the session's storage for the walk and taken back on the return.
const STASH = 'celestual.gate.after'
function stashAfter() {
  try { sessionStorage.setItem(STASH, JSON.stringify(peekAfterGate() || null)) } catch { /* private mode */ }
}
function unstashAfter() {
  try {
    const raw = sessionStorage.getItem(STASH)
    sessionStorage.removeItem(STASH)
    const a = raw ? JSON.parse(raw) : null
    if (a && a.name) setAfterGate(a)
  } catch { /* nothing stashed */ }
}
// The same address, looked at without spending it. A browser coming back
// from Google is a fresh tab with nothing in memory, and the return address
// is not put back until the login has landed — which is after the sheet has
// drawn its heading. This is what lets the heading be right on that first
// frame (`why`, below) instead of on the second.
function peekStash() {
  try {
    const raw = sessionStorage.getItem(STASH)
    const a = raw ? JSON.parse(raw) : null
    return a && a.name ? a : null
  } catch { return null }
}

// The instagram proof's pending record, filed under its own use so the gate
// never resumes a code Main minted for a ping, or the other way round.
const IG_USE = 'wall-gate'
function resumeIg() {
  const p = loadPending()
  return p && p.use === IG_USE ? p : null
}

export default function Gate({ go, up, upLabel = 'back to the wall' }) {
  // Held in state rather than read on every render: signing out has to repaint
  // this sheet, and the store is not something React is watching.
  const [who, setWho] = useState(() => member())
  // Which door is open on the sheet: the three ways, and one is chosen.
  const [way, setWay] = useState(() => (resumeIg() ? 'instagram' : ''))
  const [local, setLocal] = useState('')
  // the link that went out: { request, match, email }, or null while the
  // address is still being typed
  const [sent, setSent] = useState(null)
  const [landing, setLanding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')       // what went wrong, in words
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // Whether the act that knocked was READING: the return address left by the
  // screen that sent somebody here is a letter or a report (the head of this
  // file says why the heading turns on it). A sign in chip on the bar leaves
  // no address at all.
  //
  // Taken once, on mount, rather than read on every render: `finish` spends
  // the address on the way out (`takeAfterGate`), and a heading that changes
  // its mind on the last render before the sheet closes is a heading
  // somebody sees flicker.
  const [forReading] = useState(() => {
    const after = peekAfterGate() || peekStash()
    return !!after && (after.name === 'letter' || after.name === 'report')
  })

  // Back to whatever sent somebody here: the letter they pressed "read it"
  // on, the composer, the report. The wall, when nothing did. A heart
  // pressed from outside the gate rides the same address (Letter.jsx
  // `pressHeart`) and is pressed here, on the way back in, so the letter
  // opens with it already on; the cache it lands in was emptied by the
  // sign in, and data.js `heart` holds the press until the letter is read.
  const finish = () => {
    const after = takeAfterGate()
    if (after && after.name === 'letter' && after.heart && after.id && isReader()) heart(after.id, true)
    if (after) go(after.name, after.id)
    else up()
  }

  // ── a login that has just come back ──
  // A google account: the Supabase session is spent against this browser's
  // row (api/login.js), the row is read again, and the sheet lands where it
  // was going.
  const landedLogin = async (out) => {
    if (!out) return
    if (!out.ok) {
      setSaid(out.error === 'no_identity_layer' ? 'the sign in is not wired on this project yet'
        : out.error === 'conflict' ? 'that account is already on another person here'
        : 'that did not go through. try once more')
      return
    }
    await signedIn()
    if (!alive.current) return
    unstashAfter()
    if (isMember()) setWho(member())
    finish()
  }
  useEffect(() => {
    if (!loginEnabled()) return undefined
    let on = true
    finishLogin().then((out) => { if (on && out) landedLogin(out) })
    return () => { on = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── google ──
  // Leaves the page and comes back to this sheet with the answer in the
  // address. The return address is stashed for the walk.
  const google = async () => {
    if (busy) return
    setSaid('')
    setBusy(true)
    stashAfter()
    const out = await startGoogle(href('gate'))
    if (!alive.current) return
    if (!out.ok) { setBusy(false); setSaid(out.error === 'offline' ? 'not connected here' : 'google did not answer. try again') }
  }

  // ── any address, and a link mailed to it ──
  // celestual-edu-verify mails the link (api/login.js `sendEmailLink`), and
  // this sheet waits for it to be tapped, here or anywhere (linkdoor.jsx).
  // Whatever tapped it, the server has signed this device in by then, so the
  // row is read again and the sheet lands where it was going.
  const anyOk = anyEmail(normEmail(local))
  // Returns whether a link actually went out. `ResendLink` reads it: a send
  // that failed says so through the fault line, and the line that offers
  // another must not start its clock again over a mail that is not coming.
  const sendAny = async () => {
    if (!anyOk || busy) return false
    const again = !!sent
    setBusy(true)
    setSaid('')
    const out = await sendEmailLink(normEmail(local))
    if (!alive.current) return false
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'rate' ? 'that is a lot of links for one address. give it an hour'
          : out.error === 'email' ? 'that does not look like an address'
          : out.error === 'offline' ? 'not connected here'
          : 'the mail did not go out. try again',
      )
      return false
    }
    // The link before is dead to this screen the moment a new one is asked
    // for: it is the new one's number the mail and the glass must agree on.
    setSent({ request: out.request, match: out.match, email: out.email })
    // The step before the proof: somebody gave an address and asked for a
    // link. Once per address, not once per link: asking again because the
    // first one went to spam is not a second intent.
    if (!again) cardStep('gate')
    return true
  }
  useLinkWait({
    request: sent && !landing ? sent.request : '',
    onConfirmed: async () => {
      setLanding(true)
      await signedIn()
      if (!alive.current) return
      setLanding(false)
      if (isMember()) setWho(member())
      finish()
    },
    onLapsed: () => { setSent(null); setSaid('that link has run out. send a new one') },
  })

  // ── instagram (the wall at the root) ──
  // The DM code flow, as Main runs it: the code is minted against the handle
  // typed, the person DMs it, and whoever DMs it is the identity (0012). The
  // record is stashed for the walk to Instagram and back.
  const [mine, setMine] = useState(() => resumeIg()?.mine || '')
  const [dm, setDm] = useState(() => resumeIg())
  const [note, setNote] = useState('')
  const me = normHandle(mine)
  const dropIg = () => { clearPending(); setDm(null); setNote('') }
  const landedIg = async () => {
    await signedIn()
    if (!alive.current) return
    setDm(null)
    setWho(member())
    finish()
  }
  const askIg = async () => {
    if (dm || busy) return
    setSaid('')
    setNote('')
    if (!validHandle(me)) { setSaid('that handle does not look right'); return }
    setBusy(true)
    const out = await startHandoff(me)
    if (!alive.current) return
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'off' ? 'that door is not open yet'
          : out.error === 'banned' ? 'that name has asked to be left alone'
          : out.error === 'rate_limited' ? 'too many tries on that @. give it an hour'
          : 'it did not go through',
      )
      return
    }
    if (out.passed) { landedIg(); return }
    const rec = { ...out, use: IG_USE, mine: me }
    savePending(rec)
    setDm(rec)
  }
  useEffect(() => {
    if (!dm) return undefined
    let stop = false
    let polling = false
    let timer = 0
    const tick = async () => {
      if (stop || polling) return
      polling = true
      const out = await pollHandoff(dm)
      polling = false
      if (stop || !alive.current) return
      if (out.ok) { stop = true; clearTimeout(timer); clearPending(); landedIg(); return }
      if (out.error === 'expired') { dropIg(); setSaid('that code has lapsed'); return }
      if (out.error) { dropIg(); setSaid('that did not go through'); return }
      if (out.note) setNote(out.note)
      timer = setTimeout(tick, 2500)
    }
    timer = setTimeout(tick, 2500)
    const onReturn = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [dm])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── signed in ──
  //
  // The person, not the door: the account sheet (screens/You.jsx), with their
  // pings, what they have not finished and the letters they put up. It used
  // to be drawn here as its own card, and it is the same card now wherever
  // the person is opened from. Signing out on it brings the door back.
  if (who) {
    const out = () => { setWho(null); setSent(null); setWay('') }
    return <You go={go} up={up} upLabel={upLabel} onOut={out} />
  }

  const canLogin = loginEnabled()

  // ── THE DOOR ────────────────────────────────────────────────────────────
  //
  // Four screens below and one shape across all of them (parts.jsx `DoorHead`,
  // wall.css `THE DOOR`): the mark, the line that says what is being asked,
  // one sentence, the ways through, and the legal line at the foot. They used
  // to be four arrangements of the same parts — a heading here, a dim label
  // there, a capsule docked at the bottom of a sheet nine hundred pixels tall
  // on one and standing in the middle of the content on the next — and a
  // person who tries google, comes back and tries the address walked through
  // two different products to do it.
  //
  // ── the primary stands IN the door, not in the sheet's foot ─────────────
  // Everywhere else in the build the primary is docked (parts.jsx `SheetFoot`:
  // a control that moves between screens is a control somebody has to find
  // twice). A door is the exception and the exception is the point: the ways
  // in ARE the content here, there is nothing else on the sheet for them to be
  // docked away from, and a default parked at the bottom edge with two feet of
  // void between it and the capsules it is an alternative TO reads as a
  // different question. So the ways stand together, in the order they are
  // meant to be weighed, and the foot carries the one thing that is genuinely
  // not a step: the terms.
  //
  // ── one shape for every way in ──────────────────────────────────────────
  // The ways used to be a capsule with a PANE of rows under it: a glyph in a
  // circle, a label, a line of reason and a chevron, on a tinted plate. Two
  // component languages stacked on one screen, and the rows lost every
  // comparison — a person weighing three doors was reading one button and two
  // list items. They are three capsules now, one per door, the same height and
  // the same shape, and the only difference between them is the one that
  // matters: the default is the metal, the other two are hairline.
  //
  // ── instagram is the default on the wall at the root ────────────────────
  // It is the only proof that lets the product tell somebody a ping of theirs
  // is mutual, because that is where the ping lives, and it is the one thing
  // about these three doors that is not interchangeable. Google and the
  // mailed link stand under the rule as what they are: two ways in that cost
  // less and buy less.

  // ── the ways in ──
  if (!way) {
    return (
      <Sheet onClose={up} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          <div className="wl-door">
            <DoorHead
              id="wl-gate-h"
              /* What this person came for, said back to them. Reading is
                 not behind this door any more (migration 0066: every letter
                 is whole to anybody), so neither heading says read: from a
                 letter, what a proof gets a reader is the report (the heart
                 is anybody's since 0068); from anywhere else, the ping. Writing is not behind
                 this door either (the head of this file says why). */
              title={forReading ? <>sign in to<br />report it.</>
                : <>sign in to ping<br />and be told.</>}
              say="your information will stay anonymous."
            />
            <div className="wl-door-ways" role="group" aria-label="how to sign in">
              <Pill
                tone="light" wide icon={<Provider size={17} />} data-way="instagram"
                onClick={() => setWay('instagram')} disabled={!igVerifyEnabled()}
              >
                continue with Instagram
              </Pill>
              {/* the one line that says why this one is the default, under the
                  control it is about rather than inside it */}
              <p className="wl-door-why">so we can tell you if it&rsquo;s mutual, and you can remove letters about you.</p>
              <Or />
              <Pill
                tone="ghost" wide icon={<Google size={16} />} data-way="google"
                onClick={google} disabled={!canLogin || busy}
              >
                {busy ? 'one moment' : 'continue with Google'}
              </Pill>
              <Pill
                tone="ghost" wide icon={<Envelope size={16} />} data-way="email"
                onClick={() => setWay('email')} disabled={!canLogin}
              >
                continue with email
              </Pill>
            </div>
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
          <div className="wl-push" />
          <DoorFoot />
        </div>
      </Sheet>
    )
  }

  // ── instagram, by one DM ──
  if (way === 'instagram') {
    return (
      <Sheet onClose={up} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          {dm ? (
            <>
              <div className="wl-door">
                {/* the signature over the heading, as on every other state of
                    this sheet. The heading itself is `VerifyHead`, which is the
                    ONE wording of this step wherever it is drawn — Main's proof,
                    the sky's sign in, the opt out, the takedown — so it is
                    reused rather than restated inside a `DoorHead`. */}
                <div className="wl-door-head">
                  <Ecliptic size={38} className="wl-door-mark" />
                  <VerifyHead size="s" as="h2" id="wl-gate-h" className="wl-door-title" />
                </div>
                <div className="wl-door-ways">
                  <DmCode
                    code={dm.code}
                    status={note === 'wrong_code' ? 'that code didn’t match. send this one.'
                      : note === 'expired_code' ? 'that code had lapsed. send this one.'
                      : ''}
                  />
                </div>
              </div>
              <div className="wl-push" />
              <SheetFoot>
                <button type="button" className="wl-quiet" onClick={dropIg}>start over</button>
              </SheetFoot>
              <DoorFoot />
            </>
          ) : (
            <>
              <div className="wl-door">
                <DoorHead
                  id="wl-gate-h"
                  title={<>confirm this is<br />your Instagram.</>}
                  say="so we can tell you if it’s mutual, and you can remove letters about you."
                />
                <div className="wl-door-ways">
                  <HandleField
                    value={mine} onChange={(v) => { setMine(v); setSaid('') }} onSubmit={askIg}
                    autoFocus centred size="lg" placeholder="yourhandle" label="your instagram handle" busy={busy}
                  />
                  <Pill tone="light" wide onClick={askIg} disabled={busy || !validHandle(me)} icon={<Provider size={17} />}>
                    {busy ? 'one moment' : 'confirm with one DM'}
                  </Pill>
                </div>
                <div className="wl-gate-fault" aria-live="polite">{said}</div>
              </div>
              <div className="wl-push" />
              <SheetFoot>
                <button type="button" className="wl-quiet" onClick={() => { setWay(''); setSaid('') }}>another way in</button>
              </SheetFoot>
              <DoorFoot />
            </>
          )}
        </div>
      </Sheet>
    )
  }

  // ── any address, and a link (the wall at the root) ──
  // Two states on the door's one shape: the address and its key, then the
  // inbox it went to, the two digits the mail prints and the wait.
  if (way === 'email') {
    return (
      <Sheet onClose={up} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          <div className="wl-door">
            <DoorHead
              id="wl-gate-h" className={sent ? 'wl-edu-head' : ''}
              title={sent ? <>check your inbox.</> : <>an address, and<br />a link mailed to it.</>}
              say={sent
                ? <>we sent a link to <span className="wl-h">{sent.email}</span>. tap it on any device and you&rsquo;re in here.</>
                : 'your information will stay anonymous.'}
            />
            {sent ? (
              <div className="wl-door-ways">
                <LinkMatch n={sent.match} />
                <LinkWaiting>{landing ? 'signing you in' : 'waiting for the link'}</LinkWaiting>
                {landing ? null : <ResendLink key={sent.request} onSend={sendAny} />}
              </div>
            ) : (
              <div className="wl-door-ways">
                <AddressField value={local} onChange={(v) => { setLocal(v); setSaid('') }} onSubmit={sendAny} autoFocus />
                <Pill tone="light" wide disabled={!anyOk || busy} onClick={sendAny} aria-busy={busy || undefined}>
                  {busy ? 'sending' : 'send me a link'}
                </Pill>
              </div>
            )}
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
          <div className="wl-push" />
          <SheetFoot>
            {sent ? (
              <button type="button" className="wl-quiet" onClick={() => { setSent(null); setSaid('') }}>
                use a different address
              </button>
            ) : (
              <button type="button" className="wl-quiet" onClick={() => { setWay(''); setSaid('') }}>another way in</button>
            )}
          </SheetFoot>
          <DoorFoot />
        </div>
      </Sheet>
    )
  }

  return null
}

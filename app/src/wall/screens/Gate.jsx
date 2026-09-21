// ── /berkeley/gate, and /gate — THE DOOR ON THE LETTERS ─────────────────────
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
// ── two walls, two doors (migration 0057) ───────────────────────────────────
// THE CAMPUS WALL asks for the campus: an address at berkeley.edu and the six
// digits mailed to it, which is the only thing that opens the composer there.
// A person can also sign in with the google account the campus gave them,
// which is the same proof by a shorter road: the address Google vouches for
// is at the campus domain, so it opens writing; one at any other domain
// opens reading and says so.
//
// THE WALL AT THE ROOT has no campus, so it asks for a person, by any of the
// three proofs the product takes: an instagram handle through the DM code,
// a google account, or an address a code is mailed to. Instagram is put
// first and recommended, and the reason is said on the row: it is the only
// one of the three that lets the product tell somebody when a ping of theirs
// is mutual, because that is where the ping lives.
//
// ── what a signed-in person buys, and what they do not ──────────────────────
// Reading, the heart and the report, on every wall, by any proof; writing,
// by the proof the wall in question asks for. It is never attached to
// anything anybody writes. The composer never reads it, no letter gains an
// author because somebody is signed in, and there is no field in a letter
// for this to leak into — the wall is anonymous by SHAPE, not by policy.
// Being let in and being known are two different things, and only the first
// one happens here.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Label, Pill, Face, Icon, Allowance, Heart,
  HandleField, DmCode, VerifyHead, DoorHead, DoorFoot, Or, CodeBox, Resend,
} from '../parts.jsx'
import { Ecliptic, Envelope, Google, Provider } from '../art.jsx'
import { labelFor, allowance, loadQuota, mine, loadMine, sinceline, normHandle, validHandle } from '../data.js'
import { getState, takeAfterGate, peekAfterGate, setAfterGate } from '../store.js'
import {
  DOMAIN, anyEmail, isReader, isMember, member, memberLabel, normEmail, signOut, signedIn,
  validCode, validEmail,
} from '../auth.js'
import {
  sendCampusCode, checkCampusCode, startHandoff, pollHandoff,
  savePending, loadPending, clearPending, igVerifyEnabled,
} from '../handoff.js'
import { campus, needsCampus } from '../campus.js'
import { loginEnabled, startGoogle, sendEmailCode, checkEmailCode, finishLogin } from '../../api/login.js'
import { href } from '../router.js'
import { cardStep } from '../seed.js'

// The composer's own field, reused: a bare baseline with the constant part of
// the string painted beside it rather than typed into it. The '@berkeley.edu'
// is not in the value, cannot be backspaced away, and cannot be got wrong.
//
// Typed with its own @, the address stands whole and the painted half comes
// off. That is how an address the desk put on the pass list (migration 0043)
// gets in: it is not at the campus, the server knows whether it passes, and
// the field does not argue. On the wall at the root there is no painted
// half: any address is whole.
function AddressField({ value, onChange, onSubmit, domain = '' }) {
  const whole = !domain || value.includes('@')
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
        aria-label={domain && !whole ? `your ${domain.split('.')[0]} address` : 'your address'}
        placeholder={domain ? 'you' : 'you@anywhere.com'}
        type="text" inputMode="email" autoComplete="username"
        autoCapitalize="none" autoCorrect="off" spellCheck="false" enterKeyHint="next"
      />
      {whole ? null : <span className="wl-addr-fix" aria-hidden="true">@{domain}</span>}
      <span className="wl-field-line" aria-hidden="true" />
    </div>
  )
}

// ── the letters this device put up ──────────────────────────────────────────
// A list, one row per letter: the face and the name it was written to, how
// long ago, and how many hearted it, and the row opens the letter. It used
// to be a row of chips, one per name, which was a record that opened
// nothing and said nothing about how any of it was received. Four rows,
// and past four the list fades under a line that opens the rest.
//
// The rows are the server's (wall_mine): this device's letters of the last
// thirty days, with the heart count on each (0056). When the server has not
// answered, or answers nothing, the names this browser remembers writing to
// stand in, without counts, since those are the only fact left.
const SHOWN = 4

function Wrote({ go }) {
  const [more, setMore] = useState(false)
  useEffect(() => { loadMine() }, [])
  const own = mine()
  const rows = own && own.length
    ? own.map((l) => ({ id: l.id, to: l.to, at: l.at, hearts: l.hearts || 0, down: !!l.downBy, live: !l.downBy }))
    : (getState().wroteTo || []).map((h) => ({ id: '', to: h, at: 0, hearts: null, down: false, live: true }))
  if (!rows.length) return <p className="wl-profile-none">nobody yet</p>
  const cut = !more && rows.length > SHOWN
  const shown = cut ? rows.slice(0, SHOWN) : rows
  const open = (r) => {
    if (!r.live) return
    go('letter', r.id || r.to)
  }
  return (
    <>
      <div className={`wl-wrote${cut ? ' is-cut' : ''}`}>
        {shown.map((r, i) => (
          <button
            type="button" key={r.id || `${r.to}-${i}`}
            className={`wl-wrote-row${r.live ? '' : ' is-down'}`}
            onClick={() => open(r)} disabled={!r.live}
            aria-label={`your letter to ${labelFor(r.to)}${r.hearts ? `, ${r.hearts === 1 ? 'one heart' : `${r.hearts} hearts`}` : ''}${r.down ? ', taken down' : ''}`}
          >
            <Face handle={r.to} size={30} />
            <span className="wl-wrote-who">
              <span className="wl-wrote-name">{labelFor(r.to)}</span>
              <span className="wl-wrote-meta">{r.down ? 'taken down' : r.at ? sinceline(r.at).lead : 'on the wall'}</span>
            </span>
            {r.hearts !== null && r.live ? (
              <span className="wl-wrote-n" aria-hidden="true">
                <Heart size={13} on={r.hearts > 0} />
                <span>{r.hearts || ''}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {cut ? (
        <button type="button" className="wl-quiet wl-wrote-more" onClick={() => setMore(true)}>
          see more
        </button>
      ) : null}
    </>
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

// The instagram proof's pending record, filed under its own use so the gate
// never resumes a code Main minted for a ping, or the other way round.
const IG_USE = 'wall-gate'
function resumeIg() {
  const p = loadPending()
  return p && p.use === IG_USE ? p : null
}

export default function Gate({ go, back }) {
  // Held in state rather than read on every render: signing out has to repaint
  // this sheet, and the store is not something React is watching.
  const [who, setWho] = useState(() => member())
  const c = campus()
  const campusWall = needsCampus()
  // Which door is open on the sheet. The campus wall opens on its address;
  // the wall at the root opens on the three ways and one is chosen.
  const [way, setWay] = useState(() => (campusWall ? 'campus' : (resumeIg() ? 'instagram' : '')))
  const [mode, setMode] = useState('register')   // register · signin (the campus door's two words)
  const [step, setStep] = useState(0)            // 0 the address · 1 the code
  const [local, setLocal] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState(null)   // the correlation id for the campus code out
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')       // what went wrong, in words
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // Somebody may already be able to READ without holding what writes here: a
  // handle proved on Main opens the letters (migration 0044). This sheet then
  // asks for the one thing they still do not have, and says so, rather than
  // telling a person who is reading the wall that the wall is not for them.
  const reads = isReader()

  // The allowance, for the account sheet. Asked on mount rather than on the
  // composer alone, because "how many letters do I have left" is a question
  // about the account and this is the account screen.
  useEffect(() => { if (who) loadQuota() }, [who])
  const left = allowance()

  // Back to whatever sent somebody here: the letter they pressed "read it"
  // on, the composer, the report. The wall, when nothing did.
  const finish = () => {
    const after = takeAfterGate()
    if (after) go(after.name, after.id)
    else back()
  }

  // ── a login that has just come back ──
  // A google account, or the code checked a moment ago: the Supabase session
  // is spent against this browser's row (api/login.js), the row is read
  // again, and the sheet lands where it was going. On the campus wall a
  // google address away from the campus opens reading and not writing, and
  // the sheet says so over the address it still needs.
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
    if (isMember()) { setWho(member()); finish(); return }
    // signed in, and reading, and not at this campus
    setWay('campus')
    setSaid(out.email ? `signed in as ${out.email}. a ${c.domain} address is what writes here` : `a ${c.domain} address is what writes here`)
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

  // ── the campus address, and the code ──
  // A local part at the campus, or a whole address typed with its @. The
  // server is the gate either way (the campus, or the desk's pass list).
  const whole = local.includes('@')
  const email = whole ? normEmail(local) : normEmail(`${local}@${c.domain || DOMAIN}`)
  const ok = whole ? anyEmail(email) : validEmail(email)

  // celestual-edu-verify checks the address is at this campus's domain, mints a
  // six digit code, stores only its hash, and mails it. The code rides the
  // subject line too, so the notification alone is enough to read it.
  const sendCampus = async () => {
    if (!ok || busy) return false
    const again = step === 1
    setBusy(true)
    setSaid('')
    const out = await sendCampusCode(email)
    if (!alive.current) return false
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'rate' ? 'too many codes for that address. try again in an hour'
          : out.error === 'domain' || out.error === 'email' ? `that is not a ${c.domain} address`
          : 'the mail did not go out. try again',
      )
      return false
    }
    // The correlation id the new code was minted against, and an empty field:
    // whatever was typed was for the code this one just replaced.
    setToken(out.token)
    setCode('')
    setStep(1)
    // The step before the proof: somebody gave an address and asked for a code.
    // Logged here rather than when this sheet opens, because the sheet is also
    // the account screen and a person reading their own address on it has not
    // done anything. It says which card produced intent, and the 'joined' step
    // in auth.js says which produced a proof. Once per address: a resend
    // because the first one went to spam is not a second intent.
    if (!again) cardStep('gate')
    return true
  }

  // On a match the address is bound to this browser's identity row, which is
  // what makes the campus outlast the tab and carry across to Main. The address
  // signed in with is the one the SERVER verified.
  const finishCampus = async () => {
    if (!validCode(code) || busy || !token) return
    setBusy(true)
    setSaid('')
    const out = await checkCampusCode(token, code)
    if (!alive.current) return
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
    finish()
  }

  // ── any address, and the code (the wall at the root) ──
  // Supabase Auth mails the code and checks it; the session it hands back is
  // spent against this browser's row (api/login.js).
  const anyOk = anyEmail(normEmail(local))
  // Returns whether a code actually went out. `Resend` reads it: a send that
  // failed says so through the fault line under the box, and the line that
  // offers another one must not start its clock again and tell somebody a
  // code is coming when none is.
  const sendAny = async () => {
    if (!anyOk || busy) return false
    const again = step === 1
    setBusy(true)
    setSaid('')
    const out = await sendEmailCode(normEmail(local))
    if (!alive.current) return false
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'rate' ? 'too many codes for that address. give it a minute'
          : out.error === 'email' ? 'that does not look like an address'
          : out.error === 'offline' ? 'not connected here'
          : 'the mail did not go out. try again',
      )
      return false
    }
    // The old code is dead the moment a new one is minted, so what is in the
    // field is wrong whatever it is.
    setCode('')
    setStep(1)
    // The step before the proof: somebody gave an address and asked for a
    // code. Once per address, not once per code — asking again because the
    // first one went to spam is not a second intent.
    if (!again) cardStep('gate')
    return true
  }
  const finishAny = async () => {
    if (code.length < 6 || busy) return
    setBusy(true)
    setSaid('')
    const out = await checkEmailCode(normEmail(local), code)
    if (!alive.current) return
    setBusy(false)
    if (!out.ok) {
      setSaid(out.error === 'expired' ? 'that code has lapsed. ask for another' : 'that code is not right')
      return
    }
    landedLogin(out)
  }

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
  // Not a dashboard, and not a status message either. It is a card (wall.css
  // `.wl-profile`): one object on the sheet that is the person, the way the
  // paper is the letter. The disc, wearing the address's initial because an
  // address is not a handle and has no face to resolve; the address, or the
  // handle, beside it; and under it the letters this device put up, as a
  // list, with the hearts on each. The way out stands in the foot.
  if (who) {
    const spent = !!left && left.left <= 0
    const out = () => { signOut(); setWho(null); setMode('signin'); setStep(0); setWay(campusWall ? 'campus' : '') }
    return (
      <Sheet onClose={back} labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate">
          <SheetHead onClose={back} label="back to the wall" />

          <section className="wl-profile" aria-labelledby="wl-gate-h">
            <div className="wl-profile-id">
              <Face handle={who} size={52} resolve={who.startsWith('@')} className="wl-profile-face" />
              <div className="wl-profile-who">
                <p className="wl-profile-addr" id="wl-gate-h">{memberLabel(who)}</p>
              </div>
            </div>

            {/* ── what this device has written ──
                The letters are anonymous and stay anonymous: nothing on a
                letter points back here. The server answers a writer about
                their OWN letters and nobody else's (wall_mine, 0050), and
                that is the one thing an account can honestly show somebody
                without breaking the thing the account is for. */}
            <div className="wl-profile-sect">
              <Label tone="dim">written to</Label>
              <Wrote go={go} />
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
  // mailed code stand under the rule as what they are: two ways in that cost
  // less and buy less.

  // ── the wall at the root: the ways in ──
  if (!campusWall && !way) {
    return (
      <Sheet onClose={back} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={back} label="back to the wall" />
          <div className="wl-push" />
          <div className="wl-door">
            <DoorHead
              id="wl-gate-h"
              title={reads ? <>Sign in to write.</> : <>Sign in to read<br />and write.</>}
              say="your information will stay anonymous."
            />
            <div className="wl-door-ways" role="group" aria-label="how to sign in">
              <Pill
                tone="light" wide icon={<Provider size={17} />} data-way="instagram"
                onClick={() => setWay('instagram')} disabled={!igVerifyEnabled()}
              >
                continue with instagram
              </Pill>
              {/* the one line that says why this one is the default, under the
                  control it is about rather than inside it */}
              <p className="wl-door-why">it is how we can tell you when a ping is mutual.</p>
              <Or />
              <Pill
                tone="ghost" wide icon={<Google size={16} />} data-way="google"
                onClick={google} disabled={!canLogin || busy}
              >
                {busy ? 'one moment' : 'continue with google'}
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
      <Sheet onClose={back} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={back} label="back to the wall" />
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
                  title={<>Your instagram,<br />proved by one DM.</>}
                  say="your information will stay anonymous."
                />
                <div className="wl-door-ways">
                  <HandleField
                    value={mine} onChange={(v) => { setMine(v); setSaid('') }} onSubmit={askIg}
                    autoFocus centred size="lg" placeholder="yourhandle" label="your instagram handle" busy={busy}
                  />
                  <Pill tone="light" wide onClick={askIg} disabled={busy || !validHandle(me)} icon={<Provider size={17} />}>
                    {busy ? 'one moment' : 'prove it with one DM'}
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

  // ── any address, and a code (the wall at the root) ──
  if (way === 'email') {
    return (
      <Sheet onClose={back} tall labelledBy="wl-gate-h">
        <div className="wl-sheet-in wl-gate is-door">
          <SheetHead onClose={back} label="back to the wall" />
          <div className="wl-push" />
          <div className="wl-door">
            <DoorHead
              id="wl-gate-h"
              title={step === 0 ? <>An address, and<br />a code mailed to it.</> : <>The code from<br />the mail.</>}
              say={step === 0 ? 'your information will stay anonymous.' : null}
            />
            {step === 0 ? (
              <div className="wl-door-ways">
                <AddressField value={local} onChange={setLocal} onSubmit={sendAny} />
                <Pill tone="light" wide disabled={!anyOk || busy} onClick={sendAny}>
                  {busy ? 'sending' : 'send me a code'}
                </Pill>
              </div>
            ) : (
              <div className="wl-door-ways">
                <Label tone="dim" className="wl-door-sentto">
                  sent to <span className="wl-h">{normEmail(local)}</span>
                </Label>
                <CodeBox value={code} onChange={setCode} onSubmit={finishAny} autoFocus />
                <Pill tone="light" wide disabled={code.length < 6 || busy} onClick={finishAny}>
                  {busy ? 'checking' : 'sign in'}
                </Pill>
                <Resend onSend={sendAny} />
              </div>
            )}
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
          <div className="wl-push" />
          <SheetFoot>
            {step === 0 ? (
              <button type="button" className="wl-quiet" onClick={() => { setWay(''); setSaid('') }}>another way in</button>
            ) : (
              <button type="button" className="wl-quiet"
                onClick={() => { setCode(''); setSaid(''); setStep(0) }}>
                use a different address
              </button>
            )}
          </SheetFoot>
          <DoorFoot />
        </div>
      </Sheet>
    )
  }

  // ── the campus wall: the address, the code, or the campus google ──
  return (
    <Sheet onClose={back} tall labelledBy="wl-gate-h">
      <div className="wl-sheet-in wl-gate is-door">
        <SheetHead onClose={back} label="back to the wall" />
        <div className="wl-push" />

        <div className="wl-door">
          {/* ── the heading names the act, not the wall ──
              It used to open on "The wall is for Berkeley", which is a statement
              about the room and leaves the person in front of it to work out what
              is being asked of them. What is being asked of them is one thing, so
              it says that thing. */}
          <DoorHead
            id="wl-gate-h"
            title={step === 0
              ? (!registering ? <>Come back in.</>
                : reads ? <>{c.place} only.</>
                : <>Verify you&rsquo;re<br />at {c.place}.</>)
              : <>The code from<br />the mail.</>}
            /* The rule, in one line, said where somebody is deciding whether
               to answer for it. */
            say={step === 0 ? 'your information will stay anonymous.' : null}
          />

          {step === 0 ? (
            <div className="wl-door-ways">
              <AddressField value={local} onChange={setLocal} onSubmit={sendCampus} domain={c.domain || DOMAIN} />
              <Pill tone="light" wide disabled={!ok || busy} onClick={sendCampus}>
                {busy ? 'sending' : registering ? 'register' : 'send me a code'}
              </Pill>
              {/* ── or the campus's own google ──
                  The same proof by a shorter road: the address Google
                  vouches for is at the campus, so it opens writing the way
                  the mailed code does, with no code to type. */}
              {canLogin ? (
                <>
                  <Or />
                  <Pill tone="ghost" wide icon={<Google size={16} />} onClick={google} disabled={busy}>
                    sign in with google
                  </Pill>
                </>
              ) : null}
            </div>
          ) : (
            <div className="wl-door-ways">
              <Label tone="dim" className="wl-door-sentto">
                sent to <span className="wl-h">{email}</span>
              </Label>
              <CodeBox value={code} onChange={setCode} onSubmit={finishCampus} autoFocus />
              <Pill tone="light" wide disabled={!validCode(code) || busy} onClick={finishCampus}>
                {busy ? 'checking' : registering ? 'finish' : 'sign in'}
              </Pill>
              <Resend onSend={sendCampus} />
            </div>
          )}

          <div className="wl-gate-fault" aria-live="polite">{said}</div>
        </div>

        <div className="wl-push" />

        <SheetFoot>
          {step === 0 ? (
            <button
              type="button" className="wl-quiet"
              onClick={() => setMode(registering ? 'signin' : 'register')}
            >
              {registering ? 'already registered? sign in' : 'new here? register'}
            </button>
          ) : (
            <button type="button" className="wl-quiet"
              onClick={() => { setCode(''); setToken(null); setSaid(''); setStep(0) }}>
              use a different address
            </button>
          )}
        </SheetFoot>
        <DoorFoot />
      </div>
    </Sheet>
  )
}

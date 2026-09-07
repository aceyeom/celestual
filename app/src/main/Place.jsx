// ── /place, and /@handle ────────────────────────────────────────────────────
//
// docs/rebuild-spec.md section 6. Both routes into Main end here: from the
// wall, and straight in from the front door.
//
// "Who's on your mind." Three steps, in the order the spec puts them: a name,
// a line, and their own handle proved through the DM code flow.
//
// ── three screens, one thing each ───────────────────────────────────────────
// It used to be one object shaped like a piece of mail, with every part of it
// on the glass from the first step to the last: the envelope's two lines, the
// folded paper, a bar of segments, a chip row, a note, and a sentence under
// all of it that changed with the step. It showed everything so that nothing
// would be lost, and what it cost was that nothing on it was the thing to do.
//
// It is three screens now, and each one holds the one thing that step asks:
//
//   to          the name, and the card that says who that is
//   the letter  the paper, and nothing beside it. The name stands in one
//               small line above, as the address stands on an envelope
//   from        the name and the line in two small lines above, and the
//               question about you under them. The code replaces the
//               question while it is out, and nothing else stays
//
// Every step is marked: three dots and the step's word, at the head of the
// screen. A dot already passed is the way back to that step, and so is each
// of the small lines above the paper and the field. Nothing a person has
// done is more than one press away, and nothing is lost by going back.
//
// ── why the proof is last ───────────────────────────────────────────────────
// It is the only expensive step, and asking for it first means asking somebody
// to open Instagram before they know what for. The name and the line cost
// nothing and they are what the person actually came to do; the proof is what
// the product needs, and it is asked once, at the end, about the one thing it
// is needed for.
//
// The ping is not placed until the proof comes back. Nothing partial is
// written, so backing out at the last step leaves no half a ping anywhere.
//
// ── the third step asks whose handle it is ──────────────────────────────────
// The proof is started against the SENDER's handle, asked in one field on the
// third step, prefilled when the browser already knows. What is proved is
// still whatever account actually sends the DM: the code is a correlation id
// and Meta's webhook is the authority (migration 0012). When those differ,
// the screen says so and asks, rather than quietly placing a ping under a
// name the person did not type. A handle on the desk's pass list (0043) is
// proved on the spot and the code is never drawn.
//
// ── what this screen never does ─────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have pinged anybody. It does not say whether anybody has pinged them.
// The entire product is that nobody learns anything until both sides have
// spoken, and a screen that leaked reachability here would be leaking it about
// somebody who never came to this site.
import { useEffect, useRef, useState } from 'react'
import {
  Display, Pill, Prose, HandleField, LetterField, HandleCard, Paper, DmCode, VerifyHead, Face,
  useResolver, useLookingWords, confirmWord,
} from '../wall/parts.jsx'
import { Provider, Dots } from '../wall/art.jsx'
import { normHandle, validHandle, atHandle, dateline } from '../wall/data.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../wall/handoff.js'
import { heldProof } from '../wall/auth.js'
import { getState, patch } from '../wall/store.js'
import { signOut as dropProof } from '../api/auth.js'
import { place } from './data.js'
import { useSkyAvoid } from '../wall/ground.jsx'
import TopBar from './TopBar.jsx'

const MAX_WORDS = 20
const MIN_CHARS = 12
const STEPS = ['to', 'the letter', 'from']

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean)
}

// ── what is resumed, and why anything is ────────────────────────────────────
// Opening Instagram leaves this page, and on a phone that often reloads or
// evicts it. The code, the proof, the name and the line all live in React
// memory, so without this the person comes back to an empty /place while the
// DM they just sent is sitting against a verification nothing is watching any
// more. The record self-expires with the code (thirty minutes, 0018) and is
// cleared the moment it verifies, lapses or is abandoned.
// A live code is resumed only for the ping it was minted for: somebody who
// follows a fresh /@handle link while an old code is still out is starting a
// different ping, and the address they arrived at wins.
function resume(prefill) {
  const p = loadPending()
  if (!p || p.use !== 'place' || !p.to) return null
  if (prefill && normHandle(p.to) !== normHandle(prefill)) return null
  return p
}

// The one line under the paper, and only when there is one: the thing that
// stops the letter going up. Nothing when it would go.
function floorFor(line) {
  const w = words(line)
  const n = line.trim().length
  if (w.length > MAX_WORDS) return `twenty words, and that is ${w.length}`
  if (n && n < MIN_CHARS) return MIN_CHARS - n === 1 ? 'one more character' : `${MIN_CHARS - n} more characters`
  return ''
}

// One of the small lines above the paper and the field: a label, what stands
// there, and, when it is a way back, the word for that at its end.
function Row({ label, children, onClick, note = 'change', ariaLabel, className = '' }) {
  const body = <><span className="mn-row-lab">{label}</span>{children}</>
  if (onClick) {
    return (
      <button type="button" className={`mn-row is-back ${className}`} onClick={onClick} aria-label={ariaLabel}>
        {body}
        <span className="mn-row-note">{note}</span>
      </button>
    )
  }
  return <div className={`mn-row ${className}`}>{body}</div>
}

export default function Place({ go, who, refreshWho, to: prefill }) {
  const wrote = getState().wroteTo || []
  const [held] = useState(() => resume(prefill))
  const [to, setTo] = useState(() => prefill || held?.to || '')
  const [line, setLine] = useState(() => held?.line || '')
  // The sender's own @, the third question. Prefilled from the identity row
  // when the browser already has one.
  const [mine, setMine] = useState(() => held?.mine || who.handle || '')
  const [step, setStep] = useState(() => (held ? 2 : prefill ? 1 : 0))
  const [dm, setDm] = useState(() => held)
  // Set when the DM came from an account other than the one typed. The
  // webhook's answer is the identity (0012), so the choice is not whether to
  // believe it: it is whether to place THIS ping under a name the person did
  // not type, and that is theirs to answer.
  const [adopted, setAdopted] = useState(null)
  // Set when the DM verified the typed handle while the person was on another
  // step. The proof is held here until they come back and press place.
  const [proved, setProved] = useState(null)
  // What the last DM to arrive said, when it was not the code (0041).
  const [note, setNote] = useState('')
  const [said, setSaid] = useState('')
  const [placing, setPlacing] = useState(false)
  // A code is being minted. Without this, Enter held down or a double tap
  // started two verifications and spent two of the handle's eight starts an
  // hour (0018).
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  // The date on the letter. Struck once, when the screen opens.
  const [dated] = useState(() => dateline(Date.now()))
  const alive = useRef(true)
  const stepNow = useRef(step)
  stepNow.current = step
  const avoid = useSkyAvoid()

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // whoami lands after the first paint, so the field fills in when it does,
  // and never over something already typed.
  useEffect(() => {
    if (who.handle) setMine((m) => m || who.handle)
  }, [who.handle])

  const h = normHandle(to)
  const named = validHandle(h)
  const me = normHandle(mine)
  const mineOk = validHandle(me) && me !== h
  const w = words(line)
  const lineOk = line.trim().length >= MIN_CHARS && w.length <= MAX_WORDS

  // Which steps can be gone to: the first always; the letter once there is a
  // name; you once there is a line that would go up.
  const can = [true, named, named && lineOk]
  const goStep = (i) => {
    if (i === step || !can[i]) return
    setSaid('')
    setStep(i)
  }

  // A live code is stashed with the name and the line it was minted for, and
  // both can be changed while it is out. Keep the stash current, so a reload
  // on the way back from Instagram resumes what is on the glass now.
  useEffect(() => {
    if (dm) savePending({ ...dm, to: h, line: line.trim() })
  }, [dm, h, line])

  // ── the last step, once the handle is proved ──
  // The proof is the DM flow's secret and celestual_submit consumes it
  // (celestual_consume_ig_proof, 0023): without it the RPC answers 'unverified'
  // and nothing is placed.
  const send = async (from, proof) => {
    const mineNow = normHandle(from)
    setPlacing(true)
    const out = await place({
      me: mineNow, them: h, proof: proof || heldProof(mineNow), words: line.trim(),
    })
    if (!alive.current) return
    setPlacing(false)
    if (!out.ok) {
      // A lapsed proof is dropped on the spot, so `readyToPlace` turns false
      // and this step asks for the DM again rather than saying "prove it
      // again" over a screen with no way to.
      if (out.error === 'unverified') { dropProof(); setProved(null) }
      setSaid(
        out.error === 'no_slots' || out.error === 'cap' ? 'you have as many out as you can hold'
          : out.error === 'self' ? 'you cannot place one on yourself'
          : out.error === 'suppressed' ? 'that name has asked to be left alone'
          : out.error === 'unverified' ? 'that proof has lapsed. one more DM proves it again'
          : out.error === 'rate_limited' ? 'that is a lot of pings for one month. give it time'
          : 'it did not go through',
      )
      return
    }
    patch({ wroteTo: [h, ...wrote.filter((x) => x !== h)].slice(0, 12) })
    clearPending()
    setDone({ to: h, mutual: !!out.mutual })
  }

  // The proof landed, from the poll or on the spot for a passed handle. The
  // DM came from another account: say so and ask. The person went to another
  // step while the code was out: hold the proof until they are back here.
  const landed = async (got, asked, proof) => {
    const u = await refreshWho()
    if (!alive.current) return
    setDm(null)
    setNote('')
    if (got && got !== asked) { setAdopted({ handle: got, proof }); return }
    const from = got || u?.handle || asked
    if (stepNow.current !== 2) { setProved({ handle: from, proof }); return }
    send(from, proof)
  }

  // ── the handoff ──
  // Started against the SENDER's handle. It is the hint the code is filed
  // under, it is what the per-handle limit counts, and it is what the screen
  // has just been told.
  const ask = async () => {
    if (dm || busy) return
    setSaid('')
    setNote('')
    if (!mineOk) {
      setSaid(me && me === h ? 'that is the name you are placing it on' : 'that handle does not look right')
      return
    }
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
    if (out.passed) { landed(normHandle(out.handle), me, out.proof); return }
    const rec = { ...out, use: 'place', to: h, line: line.trim(), mine: me }
    savePending(rec)
    setDm(rec)
  }

  const drop = () => { clearPending(); setDm(null); setAdopted(null); setNote('') }

  useEffect(() => {
    if (!dm) return undefined
    let stop = false
    let polling = false
    let timer = 0
    // `polling` because two things drive this: the beat, and coming back to
    // the tab. Both firing at once asks the same question twice and can spend
    // the same verification twice.
    const tick = async () => {
      if (stop || polling) return
      polling = true
      const out = await pollHandoff(dm)
      polling = false
      if (stop || !alive.current) return
      if (out.ok) {
        // ── DO NOT setDm(null) AND THEN AWAIT ──
        // Clearing `dm` re-renders, the re-render tears this effect down, and
        // the teardown sets `stop`, all of it during the await, because an
        // await yields to React. So a guard on the far side of the await was
        // always true and the ping was never placed. Stop the polling with the
        // local flag, do the awaiting, and let `alive`, which means THE SCREEN
        // IS GONE, be the only thing that can call it off.
        stop = true
        clearTimeout(timer)
        clearPending()
        landed(normHandle(out.handle), normHandle(dm.mine), dm.proof)
        return
      }
      if (out.error === 'expired') { drop(); setSaid('that code has lapsed'); return }
      if (out.error) { drop(); setSaid('that did not go through'); return }
      // Still waiting, and the relay may have something to say about the
      // last DM that arrived under this handle (0041).
      if (out.note) setNote(out.note)
      timer = setTimeout(tick, 2500)
    }
    timer = setTimeout(tick, 2500)
    // Coming back from Instagram checks at once rather than up to a beat late,
    // and a background-throttled interval cannot strand the wait.
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

  // Proved on this device AND still holding the proof that says so. The second
  // half matters: `handleVerified` is the server's memory of a verification,
  // and the secret that spends it lives in this browser.
  const readyToPlace = !!proved || (who.handleVerified && !!heldProof(who.handle))
  // Whose name the ping goes out under, once that is settled.
  const you = adopted ? adopted.handle : proved ? proved.handle : readyToPlace ? who.handle : ''

  // The card under the handle field: peeks while typing, asks on the press.
  // The first press on a handle nobody has looked up draws the card looking;
  // the next, on the card or the pill, is the one that moves on, and it is
  // against what the card says.
  const them = useResolver(to)
  const looking = useLookingWords(them.at)
  const field = useRef(null)
  const fix = () => { const el = field.current; if (el) { el.focus(); el.select() } }
  const cardUp = step === 0 && ['found', 'missing', 'unknown'].includes(them.at.state)
  const next = async () => {
    setSaid('')
    if (step === 0) {
      if (!named || them.looking) return
      if (!them.settled) { await them.ask(); return }
      setStep(1)
      return
    }
    if (step === 1) { if (lineOk) setStep(2); return }
    if (proved) { send(proved.handle, proved.proof); return }
    if (readyToPlace) { send(who.handle); return }
    ask()
  }

  // ── it is out ──
  // The one thing the screen may say is that it is standing. Whether it is
  // mutual is not announced here even when it is: the reveal is its own
  // surface, and landing on it through a line of text on a confirmation screen
  // would be the one lie this product could tell about its own mechanic.
  if (done) {
    return (
      <main className="mn-page mn-placed">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Display size="m" as="h1" ref={avoid}>It&rsquo;s out.</Display>
          <Prose className="mn-copy">
            sixty days on <span className="sg-h">{atHandle(done.to)}</span>. if they place
            one back, you both find out.
          </Prose>
          <div className="mn-placed-mark"><Face handle={done.to} size={64} /></div>
        </div>
        <div className="mn-foot">
          <Pill tone="light" wide onClick={() => go('sky')}>your sky</Pill>
          <button type="button" className="wl-quiet" onClick={() => {
            // The address still carried the last person. A refresh here used
            // to reopen them at step 1 under "place another".
            window.history.replaceState(window.history.state, '', '/place')
            setDone(null); setTo(''); setLine(''); setStep(0); setProved(null); setAdopted(null)
          }}>
            place another
          </button>
        </div>
      </main>
    )
  }

  // What the last DM said, put into words beside the code it should have been.
  const noteText = note === 'wrong_code' ? 'that code didn’t match. send this one.'
    : note === 'expired_code' ? 'that code had lapsed. send this one.'
    : ''

  // The small line for the name, above the paper and above the field.
  const toRow = (
    <Row label="to" onClick={() => goStep(0)} ariaLabel={`to ${atHandle(h)}. change the name`}>
      <Face handle={h} size={26} />
      <span className="mn-row-h">{atHandle(h)}</span>
    </Row>
  )

  // Whether the code has the third screen. While it is out nothing else is on
  // it: the heading, where the code goes, the code, the act.
  const codeUp = step === 2 && !!dm

  return (
    <main className="mn-page mn-place">
      <TopBar go={go} who={who} />

      <div className="mn-mid">
        {/* ── the step, marked ──
            Three dots and the step's word. A dot already passed goes back. */}
        <div className="mn-mark">
          <Dots n={3} at={step} onGo={goStep} />
          <span className="wl-label mn-mark-word">{STEPS[step]}</span>
        </div>

        {step === 0 ? (
          /* ── to ── the name, and who that is */
          <>
            <Display size="m" as="h1" className="mn-h" ref={avoid}>Who&rsquo;s on<br />your mind.</Display>
            <div className="mn-step">
              <HandleField
                value={to} onChange={setTo} onSubmit={next}
                autoFocus={!prefill} size="lg" placeholder="theirhandle" label="their instagram handle"
                busy={them.looking} inputRef={field}
              />
              {/* Spec section 5: a face, a name and the badge, so somebody
                  confirms against a person rather than against their own
                  spelling. */}
              <HandleCard at={them.at} onSelect={next} className="mn-card" />
            </div>
            <p className="mn-said" role="status" aria-live="polite">{said || looking}</p>
          </>
        ) : step === 1 ? (
          /* ── the letter ── the name in one small line, and the paper */
          <>
            <div className="mn-rows">{toRow}</div>
            <Paper className="mn-letter" dateline={dated}>
              <LetterField
                value={line} onChange={setLine} max={140} autoFocus rows={5}
                placeholder="I have wanted to say this since the second week of term."
              />
            </Paper>
            <p className="mn-said" role="status" aria-live="polite">{said || floorFor(line)}</p>
          </>
        ) : codeUp ? (
          /* ── the code ── nothing else on the screen while it is out */
          <>
            <VerifyHead ref={avoid} />
            <div className="mn-step mn-prove">
              <DmCode code={dm.code} status={noteText} />
            </div>
          </>
        ) : (
          /* ── from ── the name and the line in two small lines, then you */
          <>
            <div className="mn-rows">
              {toRow}
              <Row label="letter" onClick={() => goStep(1)} ariaLabel="the letter. change it" className="is-line">
                <span className="mn-row-line">{line.trim()}</span>
              </Row>
              {you ? (
                <Row label="from" className="is-you">
                  <Face handle={you} size={26} />
                  <span className="mn-row-h">{atHandle(you)}</span>
                </Row>
              ) : (
                /* THE QUESTION: whose handle is placing this. Asked in the
                   envelope's own second line, never seeded off the recipient. */
                <Row label="from" className="is-ask">
                  <HandleField
                    value={mine} onChange={(v) => { setMine(v); setSaid('') }} onSubmit={next} busy={busy}
                    autoFocus placeholder="yourhandle" label="your instagram handle"
                  />
                </Row>
              )}
            </div>
            <p className="mn-said" role="status" aria-live="polite">
              {said || (adopted ? `the code came from ${atHandle(adopted.handle)}. place it under that name?` : '')}
            </p>
          </>
        )}
      </div>

      <div className="mn-foot">
        {step === 2 && adopted ? (
          <>
            <Pill tone="light" wide disabled={placing}
              onClick={() => send(adopted.handle, adopted.proof)}>
              {placing ? 'placing…' : `place it as ${atHandle(adopted.handle)}`}
            </Pill>
            <button type="button" className="wl-quiet" onClick={() => setAdopted(null)}>
              not that account
            </button>
          </>
        ) : codeUp ? (
          /* The code is the act while it is out. The one way out of it clears
             the stashed record too, so a code abandoned here is not resumed
             on the next visit. */
          <button type="button" className="wl-quiet" onClick={drop}>start this again</button>
        ) : (
          <>
            <Pill
              tone="light" wide
              disabled={placing || busy || them.looking
                || (step === 0 ? !named : step === 1 ? !lineOk : !readyToPlace && !mineOk)}
              onClick={next}
              icon={step === 2 && !readyToPlace ? <Provider size={17} /> : null}
            >
              {placing ? 'placing…'
                : busy ? 'one moment'
                : step === 0 ? confirmWord(them.at, 'next')
                : step === 1 ? 'next'
                : readyToPlace ? 'place it' : 'prove it'}
            </Pill>
            {cardUp ? (
              <button type="button" className="wl-quiet" onClick={fix}>not them? change it</button>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

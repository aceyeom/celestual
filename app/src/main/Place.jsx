// ── /place, and /@handle ────────────────────────────────────────────────────
//
// docs/rebuild-spec.md section 6. Both routes into Main end here: from the
// wall, and straight in from the front door.
//
// "Who's on your mind." A name, a letter, and their own handle proved through
// the DM code flow.
//
// ── the letter is the object ────────────────────────────────────────────────
// Two screens, and the second one is a letter. Not a form shaped like one:
// the paper, the only bright surface in the product and the place anything a
// person writes actually lives, carrying what a letter carries. Who it is to,
// at its head, with their face beside the name. The words. And who it is
// from, at its foot, signed in the same ink. Nothing stands beside the paper
// and nothing is stacked over it; the one control it carries is a pen at the
// end of the address, which is the way back to the name.
//
// It used to be three rows under each other, the name, the letter cut to one
// line, and a field, each on its own hairline, with a word at the end of each
// row for going back. Three rows on three lines is a form, whatever it holds.
// A letter addressed at the top and signed at the bottom is a letter.
//
// The first screen is still the name on its own, because a person arriving
// from the front door has one thing in mind and the field is that, and the
// card under it is the one place they confirm against a face rather than
// against their own spelling.
//
// Each of the two is marked: two dots and the step's word, at the head of
// the screen. The dot already passed is the way back, and so is the pen.
//
// ── the proof is its own page ───────────────────────────────────────────────
// It is the only expensive step, and asking for it first means asking
// somebody to open Instagram before they know what for. So it is asked last,
// once, and on a page of its own that is nothing but the proof: the heading,
// where the code goes, the code, and the act. The letter is not on it. The
// step marker is not on it. It is not a step of the letter; it is the door
// the letter goes through, and it shuts again the moment the proof lands.
//
// The ping is not placed until the proof comes back. Nothing partial is
// written, so backing out at the door leaves no half a ping anywhere.
//
// ── the signature asks whose handle it is ───────────────────────────────────
// The proof is started against the SENDER's handle, the one signed at the
// foot of the letter, prefilled when the browser already knows it. What is
// proved is still whatever account actually sends the DM: the code is a
// correlation id and Meta's webhook is the authority (migration 0012). When
// those differ, the screen says so and asks, rather than quietly placing a
// ping under a name the person did not sign. A handle on the desk's pass
// list (0043) is proved on the spot and the door is never drawn.
//
// ── what this screen never does ─────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have pinged anybody. It does not say whether anybody has pinged them.
// The entire product is that nobody learns anything until both sides have
// spoken, and a screen that leaked reachability here would be leaking it about
// somebody who never came to this site.
import { useEffect, useRef, useState } from 'react'
import {
  Display, Pill, Prose, HandleField, LetterField, HandleCard, Paper, Pen, DmCode, VerifyHead, Face,
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
const STEPS = ['to', 'the letter']

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
// stops the letter going. Nothing when it would go.
function floorFor(line) {
  const w = words(line)
  const n = line.trim().length
  if (w.length > MAX_WORDS) return `twenty words, and that is ${w.length}`
  if (n && n < MIN_CHARS) return MIN_CHARS - n === 1 ? 'one more character' : `${MIN_CHARS - n} more characters`
  return ''
}

export default function Place({ go, who, refreshWho, to: prefill }) {
  const wrote = getState().wroteTo || []
  const [held] = useState(() => resume(prefill))
  const [to, setTo] = useState(() => prefill || held?.to || '')
  const [line, setLine] = useState(() => held?.line || '')
  // The signature. Prefilled from the identity row when the browser already
  // has one, and never seeded off the recipient.
  const [mine, setMine] = useState(() => held?.mine || who.handle || '')
  const [step, setStep] = useState(() => (held || prefill ? 1 : 0))
  const [dm, setDm] = useState(() => held)
  // Set when the DM came from an account other than the one signed. The
  // webhook's answer is the identity (0012), so the choice is not whether to
  // believe it: it is whether to place THIS ping under a name the person did
  // not sign, and that is theirs to answer.
  const [adopted, setAdopted] = useState(null)
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
  const avoid = useSkyAvoid()

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // whoami lands after the first paint, so the signature fills in when it
  // does, and never over something already typed.
  useEffect(() => {
    if (who.handle) setMine((m) => m || who.handle)
  }, [who.handle])

  const h = normHandle(to)
  const named = validHandle(h)
  const me = normHandle(mine)
  const mineOk = validHandle(me) && me !== h
  const w = words(line)
  const lineOk = line.trim().length >= MIN_CHARS && w.length <= MAX_WORDS

  const goStep = (i) => {
    if (i === step || (i === 1 && !named)) return
    setSaid('')
    setStep(i)
  }

  // A live code is stashed with the name and the line it was minted for.
  // Keep the stash current, so a reload on the way back from Instagram
  // resumes what is on the glass now.
  useEffect(() => {
    if (dm) savePending({ ...dm, to: h, line: line.trim() })
  }, [dm, h, line])

  // ── placing it, once the handle is proved ──
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
      // and the letter asks for the DM again rather than saying "prove it
      // again" over a screen with no way to.
      if (out.error === 'unverified') dropProof()
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
  // door shuts, and the ping goes. The DM came from another account: say so
  // on the letter and ask, rather than placing it under a name nobody signed.
  const landed = async (got, asked, proof) => {
    const u = await refreshWho()
    if (!alive.current) return
    setDm(null)
    setNote('')
    if (got && got !== asked) { setAdopted({ handle: got, proof }); return }
    send(got || u?.handle || asked, proof)
  }

  // ── the door ──
  // Started against the SENDER's handle. It is the hint the code is filed
  // under, it is what the per-handle limit counts, and it is what the letter
  // is signed with.
  const ask = async () => {
    if (dm || busy) return
    setSaid('')
    setNote('')
    if (!mineOk) {
      setSaid(me && me === h ? 'that is the name you are placing it on' : 'sign it with your @')
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
  const readyToPlace = who.handleVerified && !!heldProof(who.handle)
  // Whose name the letter is signed with, once that is settled.
  const you = adopted ? adopted.handle : readyToPlace ? who.handle : ''

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
    if (!lineOk) return
    if (adopted) { send(adopted.handle, adopted.proof); return }
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
            // to reopen them at the letter under "place another".
            window.history.replaceState(window.history.state, '', '/place')
            setDone(null); setTo(''); setLine(''); setStep(0); setAdopted(null)
          }}>
            place another
          </button>
        </div>
      </main>
    )
  }

  // ── the door ──
  // The proof, on a page of its own. Nothing of the letter is on it.
  if (dm) {
    return (
      <main className="mn-page mn-place">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <VerifyHead ref={avoid} />
          <div className="mn-step mn-prove">
            <DmCode
              code={dm.code}
              status={note === 'wrong_code' ? 'that code didn’t match. send this one.'
                : note === 'expired_code' ? 'that code had lapsed. send this one.'
                : ''}
            />
          </div>
        </div>
        <div className="mn-foot">
          {/* The one way out. It clears the stashed record too, so a code
              abandoned here is not resumed on the next visit. */}
          <button type="button" className="wl-quiet" onClick={drop}>back to the letter</button>
        </div>
      </main>
    )
  }

  return (
    <main className="mn-page mn-place">
      <TopBar go={go} who={who} />

      <div className="mn-mid">
        {/* ── the step, marked ──
            Two dots and the step's word. The dot already passed goes back. */}
        <div className="mn-mark">
          <Dots n={2} at={step} onGo={goStep} />
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
        ) : (
          /* ── the letter ──
             One sheet. Addressed at the head, with the face beside the name
             and the pen at the end of the line; written in the middle; signed
             at the foot, in the same ink, by the handle that will prove it. */
          <>
            <Paper
              className="mn-letter"
              dateline={dated}
              crest={<><span className="mn-lab">to</span><Face handle={h} size={28} /></>}
              title={<span className="wl-letter-to">{atHandle(h)}</span>}
              aside={<Pen onClick={() => goStep(0)} label="change the name" />}
              foot={(
                <div className={`mn-sign${you ? '' : ' is-ask'}`}>
                  <span className="mn-lab">from</span>
                  {you ? (
                    <>
                      <Face handle={you} size={24} />
                      <span className="mn-sign-h">{atHandle(you)}</span>
                    </>
                  ) : (
                    <HandleField
                      value={mine} onChange={(v) => { setMine(v); setSaid('') }} onSubmit={next}
                      placeholder="yourhandle" label="your instagram handle" busy={busy}
                    />
                  )}
                </div>
              )}
            >
              <LetterField
                value={line} onChange={setLine} max={140} autoFocus rows={5}
                placeholder="I have wanted to say this since the second week of term."
              />
            </Paper>
            <p className="mn-said" role="status" aria-live="polite">
              {said || floorFor(line)
                || (adopted ? `the code came from ${atHandle(adopted.handle)}. place it under that name?` : '')}
            </p>
          </>
        )}
      </div>

      <div className="mn-foot">
        <Pill
          tone="light" wide
          disabled={placing || busy || them.looking
            || (step === 0 ? !named : !lineOk || (!readyToPlace && !adopted && !mineOk))}
          onClick={next}
          icon={step === 1 && !readyToPlace && !adopted ? <Provider size={17} /> : null}
        >
          {placing ? 'placing…'
            : busy ? 'one moment'
            : step === 0 ? confirmWord(them.at, 'next')
            : adopted ? `place it as ${atHandle(adopted.handle)}`
            : readyToPlace ? 'place it' : 'prove it'}
        </Pill>
        {cardUp ? (
          <button type="button" className="wl-quiet" onClick={fix}>not them? change it</button>
        ) : adopted ? (
          <button type="button" className="wl-quiet" onClick={() => setAdopted(null)}>not that account</button>
        ) : null}
      </div>
    </main>
  )
}

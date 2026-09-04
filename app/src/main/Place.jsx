// ── /place, and /@handle ────────────────────────────────────────────────────
//
// docs/rebuild-spec.md section 6. Both routes into Main end here:
//
//   from the wall   ".edu verified, user stays signed in." A letter already
//                   sent means a stack of the handles they wrote to, plus the
//                   option to enter a new @. No letter sent means the same
//                   screen with nothing in the stack.
//   straight in     the hero, then this.
//
// "Who's on your mind." Three steps, in the order the spec puts them: a name, a
// line, and their own handle proved through the DM code flow.
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
// ── THE THIRD STEP ASKS WHOSE HANDLE IT IS. It did not, and that was the bug ─
// The flow read: type THEIR @, write the line, and then — with no third
// question asked — a code appeared to be DM'd to us. Nobody had said whose
// handle was being proved, because the screen never asked: it sent
// `who.handle || h` to the handoff, and for the person this flow exists for,
// the one who has never proved anything and so has no `who.handle`, that `h`
// is THE RECIPIENT. So the proof was started against the handle of the person
// being pinged.
//
// Three things came out of that, and only the first is cosmetic:
//
//   1  a person was asked to prove a handle they were never asked to name, on
//      a screen showing somebody else's @ under "the handle has to be yours"
//   2  the per-handle start limit (8/hour, 0018) and the suppression check ran
//      against the RECIPIENT, so pinging an @ that had opted out answered "that
//      door is not open yet" — which is that person's opt-out, told to a
//      stranger who typed their name
//   3  eight attempts at one popular @ locked everybody else out of pinging it
//
// So the third step asks, in one field, the same question it has always been
// answering: which @ is yours. It is prefilled when the browser already knows,
// and what is proved is still whatever account actually sends the DM — the
// code is a correlation id and Meta's webhook is the authority (migration
// 0012). When those differ, the screen says so and asks, rather than quietly
// placing a ping under a name the person did not type.
//
// ── what this screen never does ─────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have pinged anybody. It does not say whether anybody has pinged them.
// The entire product is that nobody learns anything until both sides have
// spoken, and a screen that leaked reachability here would be leaking it about
// somebody who never came to this site.
import { useEffect, useRef, useState } from 'react'
import {
  Display, Label, Pill, Prose, HandleField, LetterField, HandleCard, Paper, DmCode, Face, useResolver,
} from '../wall/parts.jsx'
import { Provider, Sparkle } from '../wall/art.jsx'
import { normHandle, validHandle, atHandle, dateline } from '../wall/data.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../wall/handoff.js'
import { heldProof } from '../wall/auth.js'
import { getState, patch } from '../wall/store.js'
import { place } from './data.js'
import TopBar from './TopBar.jsx'

const MAX_WORDS = 20
const MIN_CHARS = 12

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
  if (prefill && normHandle(prefill) !== normHandle(p.to)) return null
  return p
}

export default function Place({ go, who, refreshWho, to: prefill }) {
  const wrote = getState().wroteTo || []
  const held = useRef(resume(prefill)).current
  const [to, setTo] = useState(() => prefill || held?.to || '')
  const [line, setLine] = useState(() => held?.line || '')
  // The sender's own @ — the third question, and the one this screen never
  // asked. Prefilled from the identity row when the browser already has one.
  const [mine, setMine] = useState(() => held?.mine || who.handle || '')
  const [step, setStep] = useState(() => (held ? 2 : prefill ? 1 : 0))
  const [dm, setDm] = useState(() => held)
  // Set when the DM came from an account other than the one typed above. The
  // webhook's answer is the identity (0012), so the choice is not whether to
  // believe it — it is whether to place THIS ping under a name the person did
  // not type, and that is theirs to answer.
  const [adopted, setAdopted] = useState(null)
  const [said, setSaid] = useState('')
  const [placing, setPlacing] = useState(false)
  const [done, setDone] = useState(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // whoami lands after the first paint, so the field fills in when it does —
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

  // ── the last step, once the handle is proved ──
  // The proof is the DM flow's secret and celestual_submit consumes it
  // (celestual_consume_ig_proof, 0023): without it the RPC answers 'unverified'
  // and nothing is placed. It comes off the handoff that just finished, or off
  // the one this device already holds.
  const send = async (from, proof) => {
    const mineNow = normHandle(from)
    setPlacing(true)
    const out = await place({
      me: mineNow, them: h, proof: proof || heldProof(mineNow), words: line.trim(),
    })
    if (!alive.current) return
    setPlacing(false)
    if (!out.ok) {
      setSaid(
        out.error === 'cap' ? 'you have as many out as you can hold'
          : out.error === 'self' ? 'you cannot place one on yourself'
          : out.error === 'suppressed' ? 'that name has asked to be left alone'
          : out.error === 'unverified' ? 'that proof has lapsed. prove the handle again'
          : out.error === 'rate_limited' ? 'that is a lot of pings in one hour'
          : 'it did not go through',
      )
      return
    }
    patch({ wroteTo: [h, ...wrote.filter((x) => x !== h)].slice(0, 12) })
    clearPending()
    setDone({ to: h, mutual: !!out.mutual })
  }

  // ── the handoff ──
  // Started against the SENDER's handle. It is the hint the code is filed
  // under, it is what the per-handle limit counts, and it is what the screen
  // has just been told — where it used to be whoever was being pinged.
  const ask = async () => {
    if (dm) return
    setSaid('')
    if (!mineOk) {
      setSaid(me && me === h ? 'that is the name you are placing it on' : 'that handle does not look right')
      return
    }
    const out = await startHandoff(me)
    if (!alive.current) return
    if (!out.ok) {
      setSaid(
        out.error === 'off' ? 'that door is not open yet'
          : out.error === 'banned' ? 'that name has asked to be left alone'
          : out.error === 'rate_limited' ? 'too many tries on that @. give it an hour'
          : 'it did not go through',
      )
      return
    }
    const rec = { ...out, use: 'place', to: h, line: line.trim(), mine: me }
    savePending(rec)
    setDm(rec)
  }

  const drop = () => { clearPending(); setDm(null); setAdopted(null) }

  useEffect(() => {
    if (!dm) return
    let stop = false
    let busy = false
    let timer = 0
    // `busy` because two things drive this: the beat, and coming back to the
    // tab. Both firing at once asks the same question twice and can spend the
    // same verification twice.
    const tick = async () => {
      if (stop || busy) return
      busy = true
      const out = await pollHandoff(dm)
      busy = false
      if (stop || !alive.current) return
      if (out.ok) {
        // ── DO NOT setDm(null) AND THEN AWAIT ──
        // This is what actually swallowed the ping, and it swallowed it at the
        // last possible instant: the code was DM'd, the webhook answered, the
        // handle bound — and then nothing was placed and the screen fell back
        // to the field as though the person had never started.
        //
        // The old shape was `setDm(null); await refreshWho(); if (!stop) send()`.
        // Clearing `dm` re-renders, the re-render tears this effect down, and
        // the teardown sets `stop` — all of it during the await, because an
        // await yields to React. So the guard on the far side of the await was
        // always true and `send` was never reached. The one line that placed
        // the ping was unreachable by construction, and everything before it
        // worked, which is why it read as "verification does nothing".
        //
        // So: stop the polling with the local flag, do the awaiting, and let
        // `alive` — which means THE SCREEN IS GONE, not "this effect was
        // re-run" — be the only thing that can call it off.
        stop = true
        clearTimeout(timer)
        clearPending()
        const got = normHandle(out.handle)
        const asked = normHandle(dm.mine)
        const u = await refreshWho()
        if (!alive.current) return
        setDm(null)
        // The DM came from another account. Say so and ask, rather than
        // placing a ping signed by a name nobody on this screen typed.
        if (got && got !== asked) { setAdopted({ handle: got, proof: dm.proof }); return }
        send(got || u?.handle || asked, dm.proof)
        return
      }
      if (out.error === 'expired') { drop(); setSaid('that code has lapsed'); return }
      if (out.error) { drop(); setSaid('that did not go through'); return }
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
  // and the secret that spends it lives in this browser. A tab that has one
  // without the other has to ask again, and asking is cheaper than a ping that
  // comes back 'unverified' after the letter is written.
  const readyToPlace = who.handleVerified && !!heldProof(who.handle)

  // The card under the handle field: peeks while typing, asks on the press.
  // The first press on a handle nobody has looked up draws the card looking;
  // the next, on the card or the pill, moves on.
  const them = useResolver(to)
  const next = () => {
    setSaid('')
    if (step === 0) {
      if (!named) return
      if (!them.settled) { them.ask(); return }
      setStep(1)
      return
    }
    if (step === 1) { if (lineOk) setStep(2); return }
    if (readyToPlace) { send(who.handle); return }
    ask()
  }

  // ── it is out ──
  // The one thing the screen may say is that it is standing. Whether it is
  // mutual is not announced here even when it is: the reveal is its own
  // surface, it is one of the two the spec gives artistry to, and landing on it
  // through a line of text on a confirmation screen would be the one lie this
  // product could tell about its own mechanic.
  if (done) {
    return (
      <main className="mn-page mn-placed">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Display size="m" as="h1">It&rsquo;s out.</Display>
          <Prose className="mn-copy">
            sixty days on <span className="sg-h">{atHandle(done.to)}</span>. if they place
            one back, you both find out.
          </Prose>
          <div className="mn-placed-mark"><Face handle={done.to} size={64} /></div>
        </div>
        <div className="mn-foot">
          <Pill tone="light" wide onClick={() => go('sky')}>your sky</Pill>
          <button type="button" className="wl-quiet" onClick={() => {
            setDone(null); setTo(''); setLine(''); setStep(0)
          }}>
            place another
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mn-page mn-place">
      <TopBar go={go} who={who} />

      <div className="mn-mid">
        <Display size="m" as="h1" className="mn-h">
          {step === 0 ? <>Who&rsquo;s on<br />your mind.</>
            : step === 1 ? <>And what<br />you never said.</>
            : <>One question,<br />asked once.</>}
        </Display>

        {step === 0 ? (
          <div className="mn-step">
            <HandleField
              value={to} onChange={setTo} onSubmit={next}
              autoFocus={!prefill} size="lg" placeholder="theirhandle"
            />
            {/* The card. Spec section 5: a face, a name and the badge, so
                somebody confirms against a person rather than against their own
                spelling. A ping placed at a typo stands for sixty days against
                nobody and nothing in the product can ever say so. */}
            <HandleCard at={them.at} onSelect={next} className="mn-card" />

            {/* ── the stack ──
                Spec section 6: somebody who came from the wall having already
                written gets the handles they wrote to, and the option to type a
                new one. This is that, and it is read out of this browser rather
                than out of the wall, because the wall has no author field for
                it to come from. */}
            {!prefill && wrote.length ? (
              <div className="mn-stack">
                <Label tone="dim">you wrote to</Label>
                <div className="mn-stack-row">
                  {wrote.slice(0, 6).map((x) => (
                    <button key={x} type="button" className="mn-chip"
                      onClick={() => { setTo(x); setStep(1) }}>
                      <Face handle={x} size={20} />
                      <span>{atHandle(x)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Label tone="dim" className="mn-note">
                <Sparkle size={9} /> never told unless it&rsquo;s mutual
              </Label>
            )}
          </div>
        ) : step === 1 ? (
          <div className="mn-step">
            <Paper
              dateline={dateline(Date.now())}
              title={<span className="wl-letter-to">{atHandle(h)}</span>}
              tone={line.trim() ? '' : 'empty'}
            >
              <LetterField
                value={line} onChange={setLine} max={140} autoFocus
                placeholder="I have wanted to say this since the second week of term."
              />
            </Paper>
            <div className="mn-floor" aria-live="polite">
              {w.length > MAX_WORDS ? (
                <Label>twenty words, and that is {w.length}</Label>
              ) : line.trim().length && line.trim().length < MIN_CHARS ? (
                <Label tone="dim">
                  {MIN_CHARS - line.trim().length === 1
                    ? 'one more character'
                    : `${MIN_CHARS - line.trim().length} more characters`}
                </Label>
              ) : (
                <Label tone="dim">read only if it&rsquo;s mutual</Label>
              )}
            </div>
          </div>
        ) : (
          <div className="mn-step mn-prove">
            {/* The proof, and it is about ONE thing: that the handle placing
                this ping is the handle it says. Nothing about the account is
                read and nothing is kept beside the handle. */}
            {adopted ? (
              /* ── it came from another account ──
                 The webhook says who actually sent the code, and that account
                 is now this browser's identity whatever was typed. The ping is
                 the part that still has a choice in it. */
              <>
                <Prose className="mn-copy">
                  the code came from <span className="sg-h">{atHandle(adopted.handle)}</span>. place
                  it under that name?
                </Prose>
                <div className="mn-prove-what">
                  <Face handle={adopted.handle} size={40} />
                  <Label tone="dim">{atHandle(adopted.handle)} → {atHandle(h)}</Label>
                </div>
              </>
            ) : dm ? (
              <>
                <DmCode
                  code={dm.code}
                  note={(
                    <Label tone="dim" className="mn-prove-for">
                      proving <span className="sg-h">{atHandle(dm.mine)}</span>
                    </Label>
                  )}
                />
              </>
            ) : readyToPlace ? (
              /* Already proved on this device and still holding the proof, so
                 there is nothing to ask. The screen says whose name it is
                 going out under rather than asking a question it knows the
                 answer to. */
              <>
                <Prose className="mn-copy">
                  goes out under your @. sixty days.
                </Prose>
                <div className="mn-prove-what">
                  <Face handle={who.handle} size={40} />
                  <Label tone="dim">{atHandle(who.handle)} → {atHandle(h)} · sixty days</Label>
                </div>
              </>
            ) : (
              <>
                <Prose className="mn-copy">
                  which @ is yours? one DM from it proves it.
                </Prose>
                {/* THE QUESTION THAT WAS MISSING. Everything above this step is
                    about somebody else; this is the only field on the screen
                    that is about the person filling it in. */}
                <HandleField
                  value={mine} onChange={setMine} onSubmit={next}
                  autoFocus size="lg" placeholder="yourhandle" label="your Instagram handle"
                />
                <div className="mn-prove-what">
                  {/* The constellation is drawn off whatever is in the field,
                      and only once something is. Seeded on `h` while the field
                      is empty it drew THE RECIPIENT'S mark under the words
                      "your @, not theirs", which is the same confusion this
                      step exists to undo. */}
                  {me ? <Face handle={me} size={40} /> : null}
                  <Label tone="dim">
                    {mineOk
                      ? <>{atHandle(me)} → {atHandle(h)} · sixty days</>
                      : me === h && me
                        ? 'that is the name you are placing it on'
                        : 'your @, not theirs'}
                  </Label>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mn-said" aria-live="polite">{said}</div>
      </div>

      <div className="mn-foot">
        {adopted ? (
          <>
            <Pill tone="light" wide disabled={placing}
              onClick={() => send(adopted.handle, adopted.proof)}>
              {placing ? 'placing…' : `place it as ${atHandle(adopted.handle)}`}
            </Pill>
            <button type="button" className="wl-quiet" onClick={() => setAdopted(null)}>
              not that account
            </button>
          </>
        ) : dm ? (
          /* The one way out while a code is live. It clears the stashed record
             too, so a code abandoned here is not resumed on the next visit. */
          <button type="button" className="wl-quiet" onClick={drop}>
            start this again
          </button>
        ) : (
          <>
            {step > 0 ? (
              <button type="button" className="wl-quiet" onClick={() => setStep(step - 1)}>
                {step === 1 ? 'a different name' : 'change what it says'}
              </button>
            ) : null}
            <Pill
              tone="light" wide
              disabled={placing || (step === 0 ? !named : step === 1 ? !lineOk : !readyToPlace && !mineOk)}
              onClick={next}
              icon={step === 2 && !readyToPlace ? <Provider size={17} /> : null}
            >
              {placing ? 'placing…'
                : step === 0 ? 'next'
                : step === 1 ? 'next'
                : readyToPlace ? 'place it' : 'prove it'}
            </Pill>
          </>
        )}
      </div>
    </main>
  )
}

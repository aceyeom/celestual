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
// ── one object, three steps ─────────────────────────────────────────────────
// The three steps used to be three screens: a field, then a card, then a box
// with two rows in it and a code under that. Each one replaced the last, so
// what a person had already answered was gone from the glass, and the only
// way back was a small link at the foot whose wording changed per screen.
//
// It is one object now, and it is shaped like the thing it is: a piece of
// mail. TO at the top, FROM under it, the letter under both, the way an email
// composes. The first step is still the name on its own, because a person
// arriving from the front door has one thing in mind and the field is that.
// From the second step on, the mail is on the glass and it stays there: the
// letter is written on it, and then the FROM row opens above the letter and
// the letter moves down to make room. The heading and the foot are what
// change between steps; the object does not.
//
// Everything on it is a way back. The TO row reopens the name, the letter
// reopens itself, and the bar of three segments over the heading goes to
// any step that has been answered. Nothing a person has done is ever more
// than one press away, and nothing is lost by going back to it.
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
// The flow read: type THEIR @, write the line, and then, with no third
// question asked, a code appeared to be DM'd to us. Nobody had said whose
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
//      door is not open yet", which is that person's opt-out, told to a
//      stranger who typed their name
//   3  eight attempts at one popular @ locked everybody else out of pinging it
//
// So the FROM row asks, in one field, the same question it has always been
// answering: which @ is yours. It is prefilled when the browser already knows,
// and what is proved is still whatever account actually sends the DM: the
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
  Display, Label, Pill, Prose, HandleField, LetterField, HandleCard, Paper, DmCode, Face,
  useResolver, useLookingWords, confirmWord,
} from '../wall/parts.jsx'
import { Provider, Sparkle } from '../wall/art.jsx'
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

// What the line under the mail says while the letter is being written: the
// one thing that stops it going up, or the one fact about where it goes.
function floorFor(line) {
  const w = words(line)
  const n = line.trim().length
  if (w.length > MAX_WORDS) return `twenty words, and that is ${w.length}`
  if (n && n < MIN_CHARS) return MIN_CHARS - n === 1 ? 'one more character' : `${MIN_CHARS - n} more characters`
  return 'read only if it’s mutual'
}

export default function Place({ go, who, refreshWho, to: prefill }) {
  const wrote = getState().wroteTo || []
  // Lazy: `useRef(resume(prefill))` evaluated the storage read and the JSON
  // parse on every render and threw the result away on all but the first.
  const [held] = useState(() => resume(prefill))
  const [to, setTo] = useState(() => prefill || held?.to || '')
  const [line, setLine] = useState(() => held?.line || '')
  // The sender's own @, the third question, and the one this screen never
  // asked. Prefilled from the identity row when the browser already has one.
  const [mine, setMine] = useState(() => held?.mine || who.handle || '')
  const [step, setStep] = useState(() => (held ? 2 : prefill ? 1 : 0))
  const [dm, setDm] = useState(() => held)
  // Set when the DM came from an account other than the one typed above. The
  // webhook's answer is the identity (0012), so the choice is not whether to
  // believe it: it is whether to place THIS ping under a name the person did
  // not type, and that is theirs to answer.
  const [adopted, setAdopted] = useState(null)
  // Set when the DM verified the typed handle while the person was on another
  // step. The proof is held here until they come back and press place, rather
  // than spent on a ping whose line they might be halfway through changing.
  const [proved, setProved] = useState(null)
  // What the last DM to arrive said, when it was not the code (0041): the
  // digits did not match, or they had lapsed. Drawn under the code, once, so
  // a person who mistyped it is told so here and not only on Instagram.
  const [note, setNote] = useState('')
  const [said, setSaid] = useState('')
  const [placing, setPlacing] = useState(false)
  // A code is being minted. Without this, Enter held down or a double tap
  // started two verifications, orphaned the first code, and spent two of the
  // eight starts an hour the handle gets (0018).
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  // The date on the letter. Struck once, when the screen opens, so the card
  // does not change its mind about the day between one step and the next.
  const [dated] = useState(() => dateline(Date.now()))
  const alive = useRef(true)
  // The step, readable from inside the watch below without re-running it.
  const stepNow = useRef(step)
  stepNow.current = step
  // The question is what the sky parts round on this screen.
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
  // The disc beside the field for you draws off the handle a beat after it
  // is typed, so a name typed in one go asks the cache once and not once per
  // keystroke.
  const [meSlow, setMeSlow] = useState(me)
  useEffect(() => {
    const t = setTimeout(() => setMeSlow(me), 400)
    return () => clearTimeout(t)
  }, [me])
  const w = words(line)
  const lineOk = line.trim().length >= MIN_CHARS && w.length <= MAX_WORDS

  // Which steps can be gone to. The first always; the line once there is a
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
      // The server's word for a full sky is 'no_slots' (celestual_submit);
      // 'cap' was never answered by anything. A lapsed proof is dropped on the
      // spot, so `readyToPlace` below turns false and this step asks for the
      // DM again rather than saying "prove it again" over a screen with no
      // way to.
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

  // ── the handoff ──
  // Started against the SENDER's handle. It is the hint the code is filed
  // under, it is what the per-handle limit counts, and it is what the screen
  // has just been told, where it used to be whoever was being pinged.
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
    const rec = { ...out, use: 'place', to: h, line: line.trim(), mine: me }
    savePending(rec)
    setDm(rec)
  }

  const drop = () => { clearPending(); setDm(null); setAdopted(null); setNote('') }

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
        // handle bound, and then nothing was placed and the screen fell back
        // to the field as though the person had never started.
        //
        // The old shape was `setDm(null); await refreshWho(); if (!stop) send()`.
        // Clearing `dm` re-renders, the re-render tears this effect down, and
        // the teardown sets `stop`, all of it during the await, because an
        // await yields to React. So the guard on the far side of the await was
        // always true and `send` was never reached. The one line that placed
        // the ping was unreachable by construction, and everything before it
        // worked, which is why it read as "verification does nothing".
        //
        // So: stop the polling with the local flag, do the awaiting, and let
        // `alive`, which means THE SCREEN IS GONE, not "this effect was
        // re-run", be the only thing that can call it off.
        stop = true
        clearTimeout(timer)
        clearPending()
        const got = normHandle(out.handle)
        const asked = normHandle(dm.mine)
        const u = await refreshWho()
        if (!alive.current) return
        setDm(null)
        setNote('')
        // The DM came from another account. Say so and ask, rather than
        // placing a ping signed by a name nobody on this screen typed.
        if (got && got !== asked) { setAdopted({ handle: got, proof: dm.proof }); return }
        const from = got || u?.handle || asked
        // The person went back to the name or the line while the code was
        // out. The proof is real; hold it until they are back on this step
        // and press place, rather than spending it on a line mid-edit.
        if (stepNow.current !== 2) { setProved({ handle: from, proof: dm.proof }); return }
        send(from, dm.proof)
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
  // and the secret that spends it lives in this browser. A tab that has one
  // without the other has to ask again, and asking is cheaper than a ping that
  // comes back 'unverified' after the letter is written.
  const readyToPlace = !!proved || (who.handleVerified && !!heldProof(who.handle))
  // Whose name the ping goes out under, once that is settled.
  const you = adopted ? adopted.handle : proved ? proved.handle : readyToPlace ? who.handle : ''

  // The card under the handle field: peeks while typing, asks on the press.
  // The first press on a handle nobody has looked up draws the card looking,
  // with a line under it saying so; the next, on the card or the pill, is the
  // one that moves on, and it is against what the card says. A lookup that
  // could not answer draws that as a card too, and still waits for the
  // second press: it used to let the same press through, which read as the
  // flow skipping the person.
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
  // surface, it is one of the two the spec gives artistry to, and landing on it
  // through a line of text on a confirmation screen would be the one lie this
  // product could tell about its own mechanic.
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

  // ── the three parts, and which is open ──
  // `to` and `from` are the envelope's two lines; `line` is the letter under
  // them. One of the three is open at a time and it is the step; the other
  // two are shut, and a shut part that has been answered is the way back to
  // it. A part that cannot be reached yet (the letter before there is a name,
  // you before there is a line) is drawn later: dim, and not a control.
  const lineWritten = !!line.trim()
  const toOpen = step === 0
  const fromOpen = step === 2
  const lineOpen = step === 1
  const partClass = (open, reach, extra = '') =>
    `mn-part${open ? ' is-open' : ' is-shut'}${reach ? '' : ' is-later'} ${extra}`

  // The line under the head of the FROM part: whose handle stands there, or
  // the question, while the step is open.
  const fromHead = fromOpen
    ? you ? (
      <div className="mn-part-cell" key="you">
        <Face handle={you} size={30} />
        <span className="mn-part-h">{atHandle(you)}</span>
        <span className="mn-part-note">{adopted || proved ? 'proved' : 'you'}</span>
      </div>
    ) : dm ? (
      <div className="mn-part-cell" key="proving">
        <Face handle={dm.mine} size={30} />
        <span className="mn-part-h">{atHandle(dm.mine)}</span>
        <span className="mn-part-note">proving</span>
      </div>
    ) : (
      /* THE QUESTION THAT WAS MISSING, asked as who you are and not as
         another name: the disc is empty until something is typed, and is
         never seeded off the recipient. */
      <div className="mn-part-cell is-asking" key="asking">
        <Face handle={meSlow} size={30} resolve={validHandle(meSlow)} />
        <div className="mn-part-field">
          <HandleField
            value={mine} onChange={setMine} onSubmit={next} busy={busy}
            autoFocus placeholder="yourhandle" label="your Instagram handle"
          />
        </div>
      </div>
    )
    : can[2] ? (
      <button
        type="button" className="mn-part-cell is-row" key="shut"
        onClick={() => goStep(2)}
        aria-label={you ? `from ${atHandle(you)}. go to this step` : 'from you. go to this step'}
      >
        {you || mineOk ? <Face handle={you || meSlow} size={30} resolve={!!you || validHandle(meSlow)} /> : null}
        <span className={`mn-part-h${you || mineOk ? '' : ' is-dim'}`}>{you ? atHandle(you) : mineOk ? atHandle(me) : 'you'}</span>
        <span className="mn-part-note">{you ? 'you' : 'next'}</span>
      </button>
    ) : (
      <div className="mn-part-cell is-row" key="later" aria-hidden="true">
        <span className="mn-part-h is-dim">you</span>
      </div>
    )

  return (
    <main className="mn-page mn-place">
      <TopBar go={go} who={who} />

      <div className="mn-mid">
        {/* The question, and it changes with the step: keyed so the old one
            leaves and the new one arrives rather than the words swapping in
            place. */}
        <Display size="m" as="h1" className="mn-h mn-h-step" ref={avoid} key={step}>
          {step === 0 ? <>Who&rsquo;s on<br />your mind.</>
            : step === 1 ? <>And what<br />you never said.</>
            : <>Now you.</>}
        </Display>

        {/* ── the mail ──
            One object, on the glass from the first step to the last, shaped
            like the thing it is: TO, FROM, and the letter under both. The
            open part is the step. Every shut part that has been answered is
            a way back to it, and a part that cannot be reached yet is drawn
            later. Going between steps shuts one part and opens another, and
            the paper folds and unfolds under them. */}
        <div className={`mn-mail is-at${step}`}>
          {/* ── to ── */}
          <section className={partClass(toOpen, true, 'is-to')} aria-current={toOpen ? 'step' : undefined}>
            <div className="mn-part-head">
              <span className="mn-part-lab">to</span>
              {toOpen ? (
                <div className="mn-part-cell" key="open">
                  <div className="mn-part-field">
                    <HandleField
                      value={to} onChange={setTo} onSubmit={next}
                      autoFocus={!prefill} placeholder="theirhandle" label="their instagram handle"
                      busy={them.looking} inputRef={field}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button" className="mn-part-cell is-row" key="shut"
                  onClick={() => goStep(0)} aria-label={`to ${atHandle(h)}. change the name`}
                >
                  <Face handle={h} size={30} />
                  <span className="mn-part-h">{atHandle(h)}</span>
                  <span className="mn-part-note">change</span>
                </button>
              )}
            </div>
            <div className="mn-part-body">
              <div className="mn-part-in">
                {toOpen && (
                  <div className="mn-part-under">
                    {/* The card. Spec section 5: a face, a name and the badge,
                        so somebody confirms against a person rather than
                        against their own spelling. A ping placed at a typo
                        stands for sixty days against nobody and nothing in
                        the product can ever say so. */}
                    <HandleCard at={them.at} onSelect={next} className="mn-card" />

                    {/* ── the stack ──
                        Spec section 6: somebody who came from the wall having
                        already written gets the handles they wrote to, and the
                        option to type a new one. Read out of this browser
                        rather than out of the wall, because the wall has no
                        author field for it to come from. */}
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
                )}
              </div>
            </div>
          </section>

          {/* ── from ──
              The question about you, asked inside the envelope's own second
              line, in the identity idiom rather than the name field's: a
              disc that fills in as you type and the handle beside it, so the
              two handles on this screen can never be two identical fields two
              screens apart. The proof is about ONE thing: that the handle
              placing this ping is the handle it says. Nothing about the
              account is read and nothing is kept beside the handle. While a
              code is out it stands under this line, because the proof is
              this part's business and nowhere else's. */}
          <section className={partClass(fromOpen, can[2], 'is-from')} aria-current={fromOpen ? 'step' : undefined}>
            <div className="mn-part-head">
              <span className="mn-part-lab">from</span>
              {fromHead}
            </div>
            <div className="mn-part-body">
              <div className="mn-part-in">
                {fromOpen && dm ? (
                  <div className="mn-part-under">
                    <DmCode code={dm.code} status={noteText} />
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* ── the line ──
              The same paper on every step: folded to its dateline until
              there is something on it, written on when its step is open,
              and read, as it will go, on the last. Pressing it read or
              folded reopens it. */}
          <section className={partClass(lineOpen, can[1], `is-line${lineOpen ? '' : lineWritten ? ' is-read' : ' is-folded'}`)} aria-current={lineOpen ? 'step' : undefined}>
            <Paper
              className="mn-mail-paper"
              dateline={lineOpen ? dated : { lead: dated.lead, stamp: lineWritten ? 'change' : 'the line' }}
              tone={lineOpen || lineWritten ? '' : 'empty'}
              {...(!lineOpen && can[1] ? {
                role: 'button', tabIndex: 0,
                'aria-label': lineWritten ? 'the line. change it' : 'the line. write it',
                onClick: () => goStep(1),
                onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goStep(1) } },
              } : {})}
            >
              <div className="mn-part-body">
                <div className="mn-part-in">
                  {lineOpen ? (
                    <div className="mn-part-under">
                      <LetterField
                        value={line} onChange={setLine} max={140} autoFocus rows={3}
                        placeholder="I have wanted to say this since the second week of term."
                      />
                    </div>
                  ) : lineWritten ? (
                    <div className="mn-part-under">
                      <Prose className="mn-mail-line">{line.trim()}</Prose>
                    </div>
                  ) : null}
                </div>
              </div>
            </Paper>
          </section>
        </div>

        <div className="mn-said" role="status" aria-live="polite">
          {said || (step === 0 ? looking : step === 1 ? floorFor(line)
            : adopted ? `the code came from ${atHandle(adopted.handle)}. place it under that name?`
            : dm ? ''
            : readyToPlace ? 'sixty days, under your @.'
            : mineOk ? 'one DM from that account proves it’s yours.'
            : me && me === h ? 'that is the name you are placing it on.'
            : 'your @, not theirs.')}
        </div>
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
        ) : step === 2 && dm ? (
          /* The code is the act on this step while it is out, and it stands
             in the envelope's FROM line above. The one way out of it clears
             the stashed record too, so a code abandoned here is not resumed
             on the next visit. */
          <button type="button" className="wl-quiet" onClick={drop}>
            start this again
          </button>
        ) : (
          <>
            {cardUp ? (
              <button type="button" className="wl-quiet" onClick={fix}>not them? change it</button>
            ) : null}
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
          </>
        )}
      </div>
    </main>
  )
}

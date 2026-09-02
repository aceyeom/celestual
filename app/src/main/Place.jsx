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
// ── what this screen never does ─────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have pinged anybody. It does not say whether anybody has pinged them.
// The entire product is that nobody learns anything until both sides have
// spoken, and a screen that leaked reachability here would be leaking it about
// somebody who never came to this site.
import { useEffect, useRef, useState } from 'react'
import {
  Display, Label, Pill, Prose, HandleField, LetterField, HandleCard, Paper, Waiting,
} from '../wall/parts.jsx'
import { Provider, Sparkle, Mark } from '../wall/art.jsx'
import { normHandle, validHandle, atHandle, dateline } from '../wall/data.js'
import { startHandoff, pollHandoff, igDeepLink, igWebLink } from '../wall/handoff.js'
import { getState, patch } from '../wall/store.js'
import { place } from './data.js'
import TopBar from './TopBar.jsx'

const MAX_WORDS = 20
const MIN_CHARS = 12

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean)
}

export default function Place({ go, who, refreshWho, to: prefill }) {
  const wrote = getState().wroteTo || []
  const [to, setTo] = useState(() => prefill || '')
  const [line, setLine] = useState('')
  const [step, setStep] = useState(() => (prefill ? 1 : 0))
  const [dm, setDm] = useState(null)
  const [said, setSaid] = useState('')
  const [placing, setPlacing] = useState(false)
  const [done, setDone] = useState(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const h = normHandle(to)
  const named = validHandle(h)
  const w = words(line)
  const lineOk = line.trim().length >= MIN_CHARS && w.length <= MAX_WORDS

  // ── the last step, once the handle is proved ──
  const send = async (mine) => {
    setPlacing(true)
    const proof = getState().proof || null
    const out = await place({ me: mine, them: h, proof, words: line.trim() })
    if (!alive.current) return
    setPlacing(false)
    if (!out.ok) {
      setSaid(
        out.error === 'cap' ? 'you have as many out as you can hold'
          : out.error === 'self' ? 'you cannot place one on yourself'
          : out.error === 'suppressed' ? 'that name has asked to be left alone'
          : 'it did not go through',
      )
      return
    }
    patch({ wroteTo: [h, ...wrote.filter((x) => x !== h)].slice(0, 12) })
    setDone({ to: h, mutual: !!out.mutual })
  }

  // ── the handoff ──
  const ask = async () => {
    if (dm) return
    setSaid('')
    const out = await startHandoff(who.handle || h)
    if (!alive.current) return
    if (!out.ok) { setSaid('that door is not open yet'); return }
    setDm(out)
  }

  useEffect(() => {
    if (!dm) return
    let stop = false
    let timer = 0
    const tick = async () => {
      const out = await pollHandoff(dm)
      if (stop || !alive.current) return
      if (out.ok) {
        setDm(null)
        const u = await refreshWho()
        if (!stop && alive.current) send(u.handle || out.handle)
        return
      }
      if (out.error === 'expired') { setDm(null); setSaid('that code has lapsed'); return }
      if (out.error) { setDm(null); setSaid('that did not go through'); return }
      timer = setTimeout(tick, 2500)
    }
    timer = setTimeout(tick, 2500)
    return () => { stop = true; clearTimeout(timer) }
  }, [dm])   // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    setSaid('')
    if (step === 0) { if (named) setStep(1); return }
    if (step === 1) { if (lineOk) setStep(2); return }
    // Already proved on this device, so there is nothing to ask.
    if (who.handleVerified) { send(who.handle); return }
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
        <TopBar go={go} />
        <div className="mn-mid">
          <Display size="m" as="h1">It&rsquo;s out.</Display>
          <Prose className="mn-copy">
            it stands for sixty days on <span className="sg-h">{atHandle(done.to)}</span>. if
            they place one back, you are both told at once. if they do not, nobody is.
          </Prose>
          <div className="mn-placed-mark"><Mark handle={done.to} size={64} lit /></div>
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
      <TopBar go={go} />

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
            <HandleCard handle={to} className="mn-card" />

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
                      <Mark handle={x} size={20} />
                      <span>{atHandle(x)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Label tone="dim" className="mn-note">
                <Sparkle size={9} /> they are never told unless you match
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
                <Label tone="dim">they read it only if you match</Label>
              )}
            </div>
          </div>
        ) : (
          <div className="mn-step mn-prove">
            {/* The proof, and it is about ONE thing: that the handle placing
                this ping is the handle it says. Nothing about the account is
                read and nothing is kept beside the handle. */}
            {dm ? (
              <>
                <div className="mn-code">
                  <Display size="s" as="p">{dm.code}</Display>
                  <Label tone="dim">DM this to us on instagram</Label>
                </div>
                <Pill tone="light" wide href={igDeepLink()} target="_blank" rel="noreferrer">
                  open instagram
                </Pill>
                <div className="mn-wait">
                  <Waiting label="watching for it" />
                  <Label tone="dim">
                    <a className="wl-a" href={igWebLink()} target="_blank" rel="noreferrer">
                      or open it on the web
                    </a>
                  </Label>
                </div>
              </>
            ) : (
              <>
                <Prose className="mn-copy">
                  a ping is placed by a handle, so the handle has to be yours. one question,
                  asked of instagram, answered once.
                </Prose>
                <div className="mn-prove-what">
                  <Mark handle={h} size={40} lit />
                  <Label tone="dim">{atHandle(h)} · sixty days</Label>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mn-said" aria-live="polite">{said}</div>
      </div>

      <div className="mn-foot">
        {step > 0 && !dm ? (
          <button type="button" className="wl-quiet" onClick={() => setStep(step - 1)}>
            {step === 1 ? 'a different name' : 'change what it says'}
          </button>
        ) : null}
        {!dm ? (
          <Pill
            tone="light" wide
            disabled={placing || (step === 0 ? !named : step === 1 ? !lineOk : false)}
            onClick={next}
            icon={step === 2 && !who.handleVerified ? <Provider size={17} /> : null}
          >
            {placing ? 'placing…'
              : step === 0 ? 'next'
              : step === 1 ? 'next'
              : who.handleVerified ? 'place it' : 'prove it is yours'}
          </Pill>
        ) : null}
      </div>
    </main>
  )
}

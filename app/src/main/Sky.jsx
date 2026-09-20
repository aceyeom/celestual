// ── /sky, what you have out ─────────────────────────────────────────────────
//
// Everything this person has placed, and nothing about anybody else. Two kinds
// of row and the difference between them is the whole product:
//
//   standing  a ping nobody has answered. It says who, and how long it has
//             left. It does NOT say whether they have seen it, whether they are
//             on celestual, or whether anybody else has placed one on them,
//             because none of that is knowable without telling somebody
//             something they did not consent to being told.
//   mutual    both of you placed one. It wears the seal, and it opens onto
//             the reveal, which is its own surface.
//
// ── a person, not a hash ────────────────────────────────────────────────────
// A row used to carry the constellation, a star figure seeded from the handle,
// where a photograph would be. The resolver gives every row the account's own
// face and name now, the same way the card under the field does the moment
// somebody types, so the person you placed a ping on looks here like the
// person you confirmed against.
//
// ── the meter, and the night ────────────────────────────────────────────────
// Two lines under the heading, in the identifier face. What this person holds
// against their cap ("2 of 2 standing"; "3 standing · unlimited" on the pass),
// and when the next reveal night is (migration 0054), shown in California's
// clock and, when the viewer's differs, in theirs. The second line is the
// same for everybody who is signed in whether or not anything is waiting for
// them, which is the only way it can be drawn: a line that appeared when a
// match was held would be the reveal, early. If the night arrives while the
// tab is open the sky reads itself again and the mutual rows appear.
//
// ── the paid door, quietly ──────────────────────────────────────────────────
// One quiet line under the list, only for a person holding their cap and only
// while the desk's switch is on (migration 0053): an extra slot, $2.99, once.
// The pill stays "place a ping". The letter is where the two doors are drawn
// in full; this is the same door, seen from what they already hold.
//
// ── the card can be opened ──────────────────────────────────────────────────
// Tapping a standing row raises the card: the line you wrote, on the paper it
// was written on, with the two things you can do to it. Sixty more days, which
// is free and reversible, and letting it go, which is neither and asks once.
//
// ── the empty state is the product ──────────────────────────────────────────
// Most people arriving here have nothing out yet, and the screen they meet is
// not an error and not an onboarding checklist. It is one sentence and one
// door, because the thing to do is the thing to do.
//
// ── and it is only said when it is true ─────────────────────────────────────
// "Nothing out yet." used to be drawn for three different facts: an empty sky,
// a proof this browser holds that the server no longer honours (thirty idle
// days; the row still says verified, so nothing else ever asked again), and a
// read that failed. The second is the expensive one: a person with a mutual on
// their row was told they had nothing out, and had no control on the screen
// to prove the handle again. The three are three screens now.
import { useEffect, useState } from 'react'
import {
  Display, Label, Pill, Prose, PersonRow, Who, Face, Sheet, SheetHead, SheetFoot, Paper, Light,
} from '../wall/parts.jsx'
import { atHandle, dateline } from '../wall/data.js'
import { heldProof, signOut as leaveWall } from '../wall/auth.js'
import { signOut as dropProof } from '../api/auth.js'
import { clearPending } from '../wall/handoff.js'
import {
  myPings, forgetPings, renew, release, daysLeft, daysLeftWords,
  revealNight, forgetRevealNight, revealNightWords,
} from './data.js'
import { fetchBilling, startCheckout, SLOT_PRICE } from '../api/billing.js'
import LiquidMark, { warmLiquidMark } from '../wall/LiquidMark.jsx'
import { useSkyAvoid } from '../wall/ground.jsx'
import TopBar from './TopBar.jsx'
import Prove from './Prove.jsx'

export default function Sky({ go, who, known = true, refreshWho, still = false }) {
  // loading · pings · error, where error is 'unverified' (prove it again) or
  // 'network' (could not read it) or null.
  const [state, setState] = useState({ loading: true, pings: [], error: null })
  // The row whose card is up, by the ping's id, so a reload underneath it
  // keeps the same card open with the new number on it.
  const [open, setOpen] = useState(null)
  const [rev, setRev] = useState(0)
  // What this person holds against their cap, and whether the door is on.
  const [billing, setBilling] = useState(null)
  // When the next reveal night is. The same answer for everyone.
  const [night, setNight] = useState(null)
  const [buying, setBuying] = useState(false)
  const [said, setSaid] = useState('')
  const avoid = useSkyAvoid()

  useEffect(() => {
    let alive = true
    if (!known) return undefined
    if (!who.handleVerified) { setState({ loading: false, pings: [], error: null }); return undefined }
    setState((s) => ({ ...s, loading: true }))
    myPings({ handle: who.handle, proof: heldProof(who.handle) }).then((out) => {
      if (!alive) return
      setState({ loading: false, pings: out.pings, error: out.ok ? null : out.error })
      // A mutual on the sky means the reveal is one tap away, and its seal is
      // the mark poured: have the texture decoded before the tap.
      if (out.pings.some((p) => p.state === 'mutual')) warmLiquidMark()
      // The meter, off the same proof. Re-read with the list, so a return
      // through /paid lands on the new cap.
      if (out.ok) fetchBilling({ handle: who.handle, proof: heldProof(who.handle) }).then((b) => { if (alive) setBilling(b) })
    })
    return () => { alive = false }
  }, [who.handle, who.handleVerified, known, rev])

  // The night. Asked once per tab, and if it comes while the tab is open the
  // sky reads itself again a beat after, so the rows change without a reload.
  useEffect(() => {
    let alive = true
    let timer = 0
    revealNight().then((n) => {
      if (!alive) return
      setNight(n)
      if (n?.enabled && n.next > Date.now()) {
        timer = setTimeout(() => {
          if (!alive) return
          forgetRevealNight()
          setRev((k) => k + 1)
        }, Math.min(n.next - Date.now() + 1500, 2147483647))
      }
    })
    return () => { alive = false; clearTimeout(timer) }
  }, [rev])

  // The quiet door. The letter is stashed nowhere from here: there is no
  // letter, and /paid will offer the sky.
  const buySlot = async () => {
    if (buying) return
    setBuying(true)
    setSaid('')
    clearPending()
    const r = await startCheckout({ handle: who.handle, proof: heldProof(who.handle), kind: 'slot' })
    if (r.ok) return   // the page is leaving for Stripe
    setBuying(false)
    if (r.error === 'unverified') dropProof()
    setSaid(
      r.error === 'off' ? 'that door is not open'
        : r.error === 'unverified' ? 'that proof has lapsed. one more DM proves it again'
        : r.error === 'at_cap' ? 'you are holding all ten already'
        : r.error === 'has_plan' ? 'unlimited already covers this'
        : 'that did not open. nothing was charged.',
    )
  }

  // The way out of this device. Both halves of the one session: the identity
  // token and the wall's copy of it, and the DM proof, which is a bearer
  // secret and was staying in localStorage on a library computer with no
  // control anywhere in Main to remove it.
  const leave = async () => {
    dropProof()
    clearPending()
    forgetPings()
    leaveWall()
    await refreshWho()
    go('hero')
  }

  // ── whoami has not answered ──
  // Nothing said yet. Drawing the sign in over somebody who is signed in, for
  // the half second before the row arrives, is a screen changing its mind.
  if (!known) {
    return (
      <main className="mn-page mn-sky">
        <TopBar go={go} who={who} />
      </main>
    )
  }

  // ── not proved on this device, or the proof has lapsed ──
  // Said instead of the list rather than over a greyed-out one, and it asks
  // the question right here. This is where the front door's "sign in" lands,
  // and where a lapsed proof lands too: same block, one different heading.
  // The heading and the pill are the whole of it; the pill says what proves
  // it, so no sentence between them has to.
  if (!who.handleVerified || state.error === 'unverified') {
    const lapsed = state.error === 'unverified'
    return (
      <main className="mn-page mn-sky">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Prove
            who={who} refreshWho={refreshWho} onProved={() => setRev((n) => n + 1)} headRef={avoid}
            title={lapsed ? <>One message,<br />and it is back.</> : <>Your sky is<br />behind your @.</>}
          />
        </div>
        <div className="mn-foot">
          <button type="button" className="wl-quiet" onClick={() => go('place')}>
            or place one first
          </button>
        </div>
      </main>
    )
  }

  // ── it could not be read ──
  if (state.error) {
    return (
      <main className="mn-page mn-sky">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Display size="m" as="h1" ref={avoid}>Your sky did<br />not load.</Display>
          <Prose className="mn-copy">nothing about it has changed. check the connection and try again.</Prose>
        </div>
        <div className="mn-foot">
          <Pill tone="light" wide onClick={() => setRev((n) => n + 1)}>try again</Pill>
        </div>
      </main>
    )
  }

  const mutuals = state.pings.filter((p) => p.state === 'mutual')
  const standing = state.pings.filter((p) => p.state !== 'mutual')
  const current = open ? state.pings.find((p) => p.id === open) : null

  return (
    <>
      <main className={`mn-page mn-sky${current ? ' wl-main is-under' : ''}`} aria-hidden={current ? true : undefined}>
        <TopBar go={go} who={who} />

        <div className="mn-mid">
          <Display size="m" as="h1" className="mn-h" ref={avoid}>
            {state.loading ? <>&nbsp;</>
              : mutuals.length ? <>It&rsquo;s mutual.</>
              : standing.length ? <>Standing.</>
              : <>Nothing out<br />yet.</>}
          </Display>

          {/* ── the meter, and the night ── */}
          {(billing?.ok || night?.enabled) && !state.loading ? (
            <div className="mn-meters">
              {billing?.ok ? (
                <Label tone="dim">
                  {billing.cap == null
                    ? `${billing.standing} standing · unlimited`
                    : `${billing.standing} of ${billing.cap} standing`}
                </Label>
              ) : null}
              {night?.enabled ? <Label tone="dim">reveal night · {revealNightWords(night)}</Label> : null}
            </div>
          ) : null}

          {/* ── the mutuals ──
              First, and set apart, because it is the only thing on this
              screen that is news: it wears the running light, the one the
              result card waits with, on the plate with the star shaped holes.
              The seal at the end is the mark poured, the same object the
              front door lights when its two cards open. */}
          {mutuals.map((p) => (
            <button key={p.id} type="button" className="mn-mutual" onClick={() => go('reveal', p.to)}>
              <Light on={!still} />
              <Who handle={p.to} size={40} meta="both of you" />
              <span className="mn-mutual-seal" aria-hidden="true">
                <LiquidMark size="100%" speed={0.5} still={still} quality="row" />
              </span>
            </button>
          ))}

          {/* ── the standing ──
              A person and a number of days. Nothing about the other person,
              because there is nothing about the other person that can be
              said. */}
          {standing.length ? (
            <div className="mn-list">
              {mutuals.length ? <Label tone="dim">still out</Label> : null}
              {standing.map((p) => (
                <PersonRow
                  key={p.id}
                  handle={p.to}
                  meta={daysLeftWords(p.expires)}
                  action={<span className="sg-gate-g" aria-hidden="true">&#8594;</span>}
                  onClick={() => setOpen(p.id)}
                />
              ))}
            </div>
          ) : !state.loading && !mutuals.length ? (
            <Prose className="mn-copy">
              place one on somebody. if they place one back, you both find out.
            </Prose>
          ) : null}

          {/* ── the quiet door ──
              Only at the cap, only with a cap to raise, only with the desk's
              switch on. Never on the pass: there is nothing to sell. */}
          {!state.loading && billing?.enabled && billing.cap != null
            && billing.standing >= billing.cap && billing.cap < 10 ? (
              <div className="mn-slotline">
                <button type="button" className="wl-quiet" disabled={buying} onClick={buySlot}>
                  {buying ? 'one moment' : `extra slot · ${SLOT_PRICE}, once`}
                </button>
                {said ? <p className="mn-said" role="status" aria-live="polite">{said}</p> : null}
              </div>
            ) : null}
        </div>

        <div className="mn-foot">
          <Pill tone="light" wide lit onClick={() => go('place')}>place a ping</Pill>
          <button type="button" className="wl-quiet" onClick={leave}>
            not you? sign out of this device
          </button>
        </div>
      </main>

      {current && (
        <CardSheet
          ping={current} who={who}
          onClose={() => setOpen(null)}
          onChange={() => setRev((n) => n + 1)}
        />
      )}
    </>
  )
}

// ── the card ────────────────────────────────────────────────────────────────
// The line, on the paper it was written on, dated the day it was placed and
// stamped with what is left of the sixty. Renewing is free and reversible, so
// it is the pill, and the pill says so: nothing is spent by it, no slot and no
// money, and a button that did not say that would leave somebody wondering
// what it cost. Letting go is the only irreversible act on this screen, so it
// is the quiet control and it asks once. The confirmation swaps the foot
// and nothing else: the words are the whole content of the decision.
function CardSheet({ ping: p, who, onClose, onChange }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [renewed, setRenewed] = useState(false)
  const [said, setSaid] = useState('')
  const n = daysLeft(p.expires)

  const keep = async () => {
    if (busy || renewed) return
    setBusy(true)
    const ok = await renew({ me: who.handle, them: p.to })
    setBusy(false)
    if (!ok) { setSaid('it did not go through'); return }
    setRenewed(true)
    onChange()
  }
  const drop = async () => {
    if (busy) return
    setBusy(true)
    const ok = await release({ me: who.handle, them: p.to })
    setBusy(false)
    if (!ok) { setSaid('it did not go through'); return }
    onChange()
    onClose()
  }

  return (
    <Sheet onClose={onClose} labelledBy="mn-card-h">
      <div className="wl-sheet-in mn-cardsheet">
        <SheetHead onClose={onClose} />
        <Paper
          dateline={{ lead: dateline(p.at).lead, stamp: renewed ? 'sixty days' : daysLeftWords(p.expires) }}
          crest={<Face handle={p.to} size={30} />}
          title={<span id="mn-card-h" className="wl-letter-to">{atHandle(p.to)}</span>}
          tone={p.line ? '' : 'empty'}
        >
          <Prose>{p.line || 'placed without a line.'}</Prose>
        </Paper>

        {/* One sentence, and only when there is a decision to make: what
            letting go does. Nothing under the card otherwise. */}
        {said || asking ? (
          <p className="wl-say is-lead mn-card-say">
            {said || 'this frees the slot. nothing was ever revealed.'}
          </p>
        ) : null}

        <SheetFoot>
          {asking ? (
            <>
              <Pill tone="light" wide disabled={busy} onClick={drop}>let it go</Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(false)}>keep it</button>
            </>
          ) : (
            <>
              <Pill tone="light" wide disabled={busy || renewed} onClick={keep}>
                {renewed ? 'renewed' : n >= 60 ? 'standing' : 'sixty more days · free'}
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(true)}>let it go</button>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

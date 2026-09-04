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
import { myPings, renew, release, daysLeft, daysLeftWords } from './data.js'
import LiquidMark from '../wall/LiquidMark.jsx'
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

  useEffect(() => {
    let alive = true
    if (!known) return undefined
    if (!who.handleVerified) { setState({ loading: false, pings: [], error: null }); return undefined }
    setState((s) => ({ ...s, loading: true }))
    myPings({ handle: who.handle, proof: heldProof(who.handle) }).then((out) => {
      if (alive) setState({ loading: false, pings: out.pings, error: out.ok ? null : out.error })
    })
    return () => { alive = false }
  }, [who.handle, who.handleVerified, known, rev])

  // The way out of this device. Both halves of the one session: the identity
  // token and the wall's copy of it, and the DM proof, which is a bearer
  // secret and was staying in localStorage on a library computer with no
  // control anywhere in Main to remove it.
  const leave = async () => {
    dropProof()
    clearPending()
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
  // and where a lapsed proof lands too: same block, one different sentence.
  if (!who.handleVerified || state.error === 'unverified') {
    const lapsed = state.error === 'unverified'
    return (
      <main className="mn-page mn-sky">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Display size="m" as="h1">
            {lapsed ? <>One message,<br />and it is back.</> : <>Your sky is<br />behind your @.</>}
          </Display>
          <Prose className="mn-copy">
            {lapsed
              ? 'the proof this device held has lapsed. one instagram message proves it again, and everything you have out is still there.'
              : 'one instagram message proves it.'}
          </Prose>
          <Prove who={who} refreshWho={refreshWho} onProved={() => setRev((n) => n + 1)} />
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
          <Display size="m" as="h1">Your sky did<br />not load.</Display>
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
          <Display size="m" as="h1" className="mn-h">
            {state.loading ? <>&nbsp;</>
              : mutuals.length ? <>It&rsquo;s mutual.</>
              : standing.length ? <>Standing.</>
              : <>Nothing out<br />yet.</>}
          </Display>

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
                <LiquidMark size="100%" speed={0.5} still={still} />
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
// it is the pill; letting go is the only irreversible act on this screen, so
// it is the quiet control and it asks once. The confirmation swaps the foot
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

        <p className="wl-say is-lead mn-card-say">
          {said || (asking
            ? 'this frees the slot. nothing was ever revealed.'
            : 'they have not been told.')}
        </p>

        <SheetFoot>
          {asking ? (
            <>
              <Pill tone="light" wide disabled={busy} onClick={drop}>let it go</Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(false)}>keep it</button>
            </>
          ) : (
            <>
              <Pill tone="light" wide disabled={busy || renewed} onClick={keep}>
                {renewed ? 'renewed' : n >= 60 ? 'standing' : 'sixty more days'}
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(true)}>let it go</button>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

// ── /optout, the way out ────────────────────────────────────────────────────
//
// Phase 8. The public opt-out, rebuilt in the system the rest of the product is
// in. It was the old design's PrivacyScreen, which carried the whole privacy
// essay above the one control anybody arrives here to use.
//
// ── WHO ARRIVES HERE, AND WHAT THEY WANT ────────────────────────────────────
// Somebody who has been told a stranger can type their @ into a website. They
// are not here to read. They are here to make it stop, and the page has to let
// them do that above the fold, on a phone, without an account.
//
// So the act is first and the reasoning is under it. The reasoning still has to
// be there, because "we deleted everything, trust us" is not an answer, but it
// is where somebody reads it AFTER they have pressed the thing.
//
// ── IT ASKS WHOSE @ IT IS ───────────────────────────────────────────────────
// It used to take a handle and nothing else, on the argument that requiring
// somebody to verify before they could refuse the product would mean requiring
// them to use it first. What that also meant was that anybody could type any
// handle in here and make it un-pingable for good, erasing every ping its
// owner had placed on the way. One Instagram DM proves a handle to anybody
// who holds the account, user or not, and it is the same proof placing a ping
// asks for, so the opt out asks for it too (migration 0039). The server
// refuses without it, and the refusal says nothing about whether the name was
// ever on the books.
//
// Two shapes, then: a person already proved on this device sees their own @
// and one control; anybody else proves the @ first, in the same block the sky
// uses, and the control appears the moment the DM lands.
//
// ── what it actually does ───────────────────────────────────────────────────
// celestual_suppress: it bars the @ from ever being entered again, and erases
// every row referencing it on either side, the proof it was just given
// included. It cannot be undone from here, and it says so.
import { useState } from 'react'
import { Display, Label, Pill, Prose, Rule, Face, COMPANY } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import { suppressHandle } from '../api/celestual.js'
import { atHandle } from '../wall/data.js'
import { heldProof, signOut as leaveWall } from '../wall/auth.js'
import { signOut as dropProof } from '../api/auth.js'
import { clearPending } from '../wall/handoff.js'
import { useSkyAvoid } from '../wall/ground.jsx'
import TopBar from './TopBar.jsx'
import Prove from './Prove.jsx'

export default function Optout({ go, who, refreshWho }) {
  // The handle that has been proved on this device, once one has. Either it
  // was already there when the screen opened, or the block below just landed
  // it; both arrive here as the same fact.
  const [proved, setProved] = useState(() => (who.handleVerified && heldProof(who.handle) ? who.handle : ''))
  const [phase, setPhase] = useState('idle') // idle | asking | working | done | failed | rate | lapsed
  const [done, setDone] = useState('')
  const avoid = useSkyAvoid()

  // whoami lands after the first paint. A person who arrives signed in sees
  // their own @ the moment the row answers, and never a field.
  const held = proved || (who.handleVerified && heldProof(who.handle) ? who.handle : '')

  async function submit() {
    if (!held || phase === 'working') return
    setPhase('working')
    try {
      const r = await suppressHandle(held, heldProof(held))
      // celestual_suppress answers { suppressed:null, error:'rate_limited' }
      // past ten an hour from one address, and 'unverified' when the proof
      // this device holds has lapsed. Reading `suppressed || clean` told the
      // eleventh person in a dorm their handle was off when it was not.
      if (!r?.suppressed) {
        if (r?.error === 'unverified') {
          // The proof is dead. Drop it, and the block below asks again.
          dropProof()
          setProved('')
          setPhase('lapsed')
          return
        }
        setPhase(r?.error === 'rate_limited' ? 'rate' : 'failed')
        return
      }
      // The handle is gone from the server, this device's copy of it goes too:
      // the proof, the identity token, the wall's memory of a member.
      dropProof()
      clearPending()
      leaveWall()
      await refreshWho()
      setDone(r.suppressed)
      setPhase('done')
    } catch {
      setPhase('failed')
    }
  }

  if (phase === 'done') {
    return (
      <main className="mn-page">
        <TopBar go={go} who={who} />
        <div className="mn-mid">
          <Label><Sparkle size={11} />done</Label>
          <Display size="m" as="h1" ref={avoid}>{atHandle(done)} is out.</Display>
          <Prose className="mn-copy">
            nobody can enter it again, and nothing that pointed at it is left. to undo
            this, write to {COMPANY.email}.
          </Prose>
        </div>
        <div className="mn-foot">
          <Pill tone="ghost" wide onClick={() => go('hero')}>close</Pill>
        </div>
      </main>
    )
  }

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid">
        <Display size="m" as="h1" ref={avoid}>Take your @<br />off celestual.</Display>
        <Prose className="mn-copy">
          {held
            ? 'it can never be entered again. anything pointing at it is erased, both ways.'
            : 'it can never be entered again. one instagram message proves the @ is yours first, so nobody can take off a name that is not theirs.'}
        </Prose>

        {held ? (
          /* ── proved: the one control, and it asks once ── */
          <div className="mn-step">
            <div className="mn-prove-what">
              <Face handle={held} size={40} />
              <Label tone="dim">{atHandle(held)} · proved on this device</Label>
            </div>
            {phase === 'asking' ? (
              <Prose className="mn-copy">
                this cannot be undone from here. every ping placed on it, and every ping it
                placed, goes with it.
              </Prose>
            ) : null}
          </div>
        ) : (
          /* ── not proved: the same block the sky asks with ── */
          <Prove
            who={who}
            refreshWho={refreshWho}
            onProved={(h) => { setProved(h); setPhase('idle') }}
          />
        )}

        {phase === 'failed' ? (
          <Prose className="mn-copy mn-fault">that did not go through. try once more.</Prose>
        ) : phase === 'rate' ? (
          <Prose className="mn-copy mn-fault">too many from this connection in one hour. try again later, or write to {COMPANY.email}.</Prose>
        ) : phase === 'lapsed' ? (
          <Prose className="mn-copy mn-fault">the proof this device held has lapsed. one more message proves it again.</Prose>
        ) : null}
      </div>
      <div className="mn-foot">
        {held ? (
          phase === 'asking' ? (
            <>
              <Pill tone="light" wide disabled={phase === 'working'} onClick={submit}>
                yes, take {atHandle(held)} off
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => setPhase('idle')}>keep it</button>
            </>
          ) : (
            <Pill tone="light" wide disabled={phase === 'working'} onClick={() => setPhase('asking')}>
              {phase === 'working' ? 'taking it off' : 'take it off'}
            </Pill>
          )
        ) : null}

        {/* The reasoning, under the act, and at the same measure. */}
        <div className="mn-read">
        <Rule tone="soft" />
        <Label>what this product does</Label>
        <Prose className="mn-copy">
          the person a ping is on is never told. the only thing that ever surfaces is
          a pair who both placed one, shown to those two at once. a handle is kept as
          a salted one way hash, and a ping lapses after sixty days.
        </Prose>
        <Prose className="mn-copy mn-links">
          <a className="wl-quiet" href="/privacy">privacy</a>
          {' · '}
          <a className="wl-quiet" href="/terms">terms</a>
          {' · '}
          <a className="wl-quiet" href="/data-deletion">deleting your data</a>
        </Prose>
        </div>
      </div>
    </main>
  )
}

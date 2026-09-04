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
// ── what it actually does ───────────────────────────────────────────────────
// celestual_suppress: it bars the @ from ever being entered again, and erases
// every row referencing it on either side. It needs no proof, and that is
// deliberate. Requiring somebody to verify a handle before they can refuse the
// product would mean requiring them to use it first.
import { useState } from 'react'
import { Display, Label, Pill, Prose, Rule, HandleField, COMPANY } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import { suppressHandle } from '../api/celestual.js'
// The same normaliser every other field in the product uses: it strips a
// pasted instagram.com/ prefix and refuses a one character handle, where the
// old API module's did neither and took a whole profile URL off the wall as
// "httpsinstagram.comfoo".
import { normHandle, validHandle } from '../wall/data.js'
import TopBar from './TopBar.jsx'

export default function Optout({ go, who }) {
  const [handle, setHandle] = useState('')
  const [phase, setPhase] = useState('idle') // idle | working | done | failed | rate
  const [done, setDone] = useState('')

  const clean = normHandle(handle)
  const ready = validHandle(clean)

  async function submit() {
    if (!ready || phase === 'working') return
    setPhase('working')
    try {
      const r = await suppressHandle(clean)
      // celestual_suppress answers { suppressed:null, error:'rate_limited' }
      // past ten an hour from one address. Reading `suppressed || clean` told
      // the eleventh person in a dorm their handle was off when it was not.
      if (!r?.suppressed) {
        setPhase(r?.error === 'rate_limited' ? 'rate' : 'failed')
        return
      }
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
          <Display size="m" as="h1">@{done} is out.</Display>
          <Prose className="mn-copy">
            nobody can enter it again. to undo this, write to {COMPANY.email}.
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
        <Display size="m" as="h1">Take your @<br />off celestual.</Display>
        <Prose className="mn-copy">
          it can never be entered again. anything pointing at it is erased.
        </Prose>
        <HandleField
          value={handle}
          onChange={setHandle}
          onSubmit={submit}
          placeholder="yourhandle"
        />
        {phase === 'failed' ? (
          <Prose className="mn-copy mn-fault">that did not go through. try once more.</Prose>
        ) : phase === 'rate' ? (
          <Prose className="mn-copy mn-fault">too many from this connection in one hour. try again later, or write to {COMPANY.email}.</Prose>
        ) : null}
      </div>
      <div className="mn-foot">
        <Pill tone="light" wide disabled={!ready || phase === 'working'} onClick={submit}>
          {phase === 'working' ? 'taking it off' : 'take it off'}
        </Pill>

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

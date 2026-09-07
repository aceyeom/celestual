// ── proving a handle, on its own ────────────────────────────────────────────
//
// The DM code flow, as one block that any screen can stand where it needs a
// person to prove their @. It is the same question the third step of /place
// asks, lifted out so the sky and the opt out can ask it too.
//
// Two stages, and the block owns the heading of both, so the three screens
// that ask cannot word the code stage three ways:
//
//   the ask    the caller's own heading (`title`), the field, the pill
//   the code   "Verify the account belongs to you." over the DM block, and
//              one way out of it
//
// Nothing here is new mechanics. `startHandoff` mints the code (or, for a
// handle on the desk's pass list, answers proved on the spot), `pollHandoff`
// watches for Instagram's answer and binds the handle, and the pending record
// is the same one /place stashes, filed under its own `use` so the two screens
// never resume each other's code.
//
// What it does NOT do is decide what happens next. It reports the handle that
// was proved and the caller draws its own next screen, because the sky and the
// opt out want different things once the proof lands.
import { useEffect, useRef, useState } from 'react'
import { Display, Prose, Pill, HandleField, DmCode, VerifyHead } from '../wall/parts.jsx'
import { Provider } from '../wall/art.jsx'
import { normHandle, validHandle } from '../wall/data.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../wall/handoff.js'

const USE = 'prove'

function resume() {
  const p = loadPending()
  return p && p.use === USE ? p : null
}

export default function Prove({ who, refreshWho, onProved, title, copy = null, headRef = null }) {
  const held = useRef(resume()).current
  const [mine, setMine] = useState(() => held?.mine || who.handle || '')
  const [dm, setDm] = useState(() => held)
  const [said, setSaid] = useState('')
  // What the last DM to arrive said, when it was not the code (0041).
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const me = normHandle(mine)

  const drop = () => { clearPending(); setDm(null); setNote('') }

  // The proof landed: the handle is bound, the row is read again, and the
  // caller is told. From the poll after a DM, or at once for a passed handle.
  const landed = async (handle) => {
    const u = await refreshWho()
    if (!alive.current) return
    setDm(null)
    if (onProved) onProved(normHandle(handle), u)
  }

  const ask = async () => {
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
    if (out.passed) { landed(out.handle); return }
    const rec = { ...out, use: USE, mine: me }
    savePending(rec)
    setDm(rec)
  }

  // The watch. The same shape as /place, for the same reasons that file gives
  // at length: the local `stop` ends the polling, `alive` is the only thing
  // that can call off the work after the await, and coming back to the tab
  // checks at once rather than up to a beat late.
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
      if (out.ok) {
        stop = true
        clearTimeout(timer)
        clearPending()
        landed(out.handle)
        return
      }
      if (out.error === 'expired') { drop(); setSaid('that code has lapsed'); return }
      if (out.error) { drop(); setSaid('that did not go through'); return }
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

  if (dm) {
    return (
      <>
        <VerifyHead ref={headRef} />
        <div className="mn-step mn-prove">
          <DmCode
            code={dm.code}
            status={note === 'wrong_code' ? 'that code didn’t match. send this one.'
              : note === 'expired_code' ? 'that code had lapsed. send this one.'
              : ''}
          />
          <button type="button" className="wl-quiet" onClick={drop}>start over</button>
        </div>
      </>
    )
  }

  return (
    <>
      {title ? <Display size="m" as="h1" ref={headRef}>{title}</Display> : null}
      {copy ? <Prose className="mn-copy">{copy}</Prose> : null}
      <div className="mn-step">
        <HandleField
          value={mine} onChange={(v) => { setMine(v); setSaid('') }} onSubmit={ask}
          size="lg" placeholder="yourhandle" label="your instagram handle" busy={busy}
        />
        <Pill tone="light" wide onClick={ask} disabled={busy} icon={<Provider size={17} />}>
          {busy ? 'one moment' : 'prove it with one DM'}
        </Pill>
        <p className="mn-said" role="status" aria-live="polite">{said}</p>
      </div>
    </>
  )
}
